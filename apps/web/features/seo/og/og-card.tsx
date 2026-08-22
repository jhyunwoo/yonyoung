/* eslint-disable @next/next/no-img-element -- next/og(satori)는 raw <img>만 그릴 수 있다. next/image는 이 렌더러에서 동작하지 않는다. */
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Open Graph 권장 크기. 각 opengraph-image 라우트가 `size`로 그대로 내보낸다. */
export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const OG_CONTENT_TYPE = "image/png";

const SITE_NAME = "연영회";
const SITE_TAGLINE = "연세대학교 중앙사진동아리";

const MAX_TITLE_LENGTH = 42;
const MAX_DESCRIPTION_LENGTH = 96;
const MAX_META_LENGTH = 64;

const FONT_REGULAR_URL =
  "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf";
const FONT_BOLD_URL = "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf";

export const truncateOgText = (value: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
};

/**
 * 로컬 자산은 요청과 무관하므로 모듈 스코프에서 한 번만 읽어 data URI로 인라인한다.
 * 예전 구현은 `headers()`로 요청 origin을 만들어 로고를 HTTP로 가져왔는데, 그 때문에
 * OG 라우트가 요청 시점 렌더링으로 고정돼 크롤러가 올 때마다 오리진에서 PNG를 구웠다.
 */
const readLogoDataUrl = async (fileName: string): Promise<string> => {
  const bytes = await readFile(join(process.cwd(), "public", fileName), "base64");
  return `data:image/png;base64,${bytes}`;
};

const blackLogoPromise = readLogoDataUrl("yonyoung-logo-black.png");
const whiteLogoPromise = readLogoDataUrl("yonyong-logo-white.png");

const loadFont = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
    });

    if (!response.ok) {
      return null;
    }

    return await response.arrayBuffer();
  } catch {
    return null;
  }
};

const regularFontPromise = loadFont(FONT_REGULAR_URL);
const boldFontPromise = loadFont(FONT_BOLD_URL);

const getKoreanFonts = async () => {
  const [regularFont, boldFont] = await Promise.all([
    regularFontPromise,
    boldFontPromise,
  ]);
  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 700;
  }> = [];

  if (regularFont) {
    fonts.push({
      name: "Noto Sans KR",
      data: regularFont,
      style: "normal",
      weight: 400,
    });
  }

  if (boldFont) {
    fonts.push({
      name: "Noto Sans KR",
      data: boldFont,
      style: "normal",
      weight: 700,
    });
  }

  return fonts;
};

type OgCardInput = {
  title: string;
  description: string;
  /** 사진 카드 하단에 붙는 한 줄 (예: `2026.07.20 ~ 07.26 · 백양누리`) */
  meta?: string;
  /**
   * 대표 이미지 data URI. 주어지면 사진 전면 카드로, 없으면 텍스트 카드로 그린다.
   * 이미지 로딩 실패 시 `null`을 넘겨 폴백하는 것이 정상 동작이다.
   */
  coverImageDataUrl?: string | null;
};

/** `surface`는 로고가 놓이는 바닥 톤이다 — 밝은 바닥엔 검정 로고, 어두운 바닥엔 흰 로고. */
const LogoMark = ({
  logoSrc,
  surface,
}: {
  logoSrc: string;
  surface: "light" | "dark";
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "18px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "90px",
        height: "90px",
        borderRadius: "20px",
        border:
          surface === "light" ? "1px solid #c9d5f6" : "1px solid rgba(255,255,255,0.35)",
        background: surface === "light" ? "#ffffff" : "rgba(12,16,28,0.55)",
      }}
    >
      {/*
        width/height는 반드시 숫자여야 한다. satori는 문자열을 받으면
        `Invalid value "60" for "width"`를 경고하고 이미지를 통째로 건너뛴다
        (이전 OG 카드의 로고가 빈 상자로만 나오던 원인이다).
      */}
      <img
        src={logoSrc}
        alt="연영회 로고"
        width={60}
        height={60}
        style={{
          objectFit: "contain",
        }}
      />
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontSize: "42px",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          color: surface === "light" ? "#26356a" : "#ffffff",
        }}
      >
        {SITE_NAME}
      </span>
      <span
        style={{
          fontSize: "22px",
          color: surface === "light" ? "#445893" : "rgba(255,255,255,0.82)",
        }}
      >
        {SITE_TAGLINE}
      </span>
    </div>
  </div>
);

/**
 * 사진 전면 카드 — 링크 미리보기가 작게 줄어도 어떤 이벤트인지 사진으로 먼저 읽힌다.
 * 하단 그라데이션 스크림은 밝은 사진 위에서도 흰 글씨 대비를 확보하기 위한 것이다.
 */
const PhotoCard = ({
  title,
  meta,
  coverImageDataUrl,
  logoSrc,
}: {
  title: string;
  meta?: string;
  coverImageDataUrl: string;
  logoSrc: string;
}) => (
  <div
    style={{
      height: "100%",
      width: "100%",
      display: "flex",
      position: "relative",
      background: "#0c1018",
      fontFamily: "Noto Sans KR",
    }}
  >
    <img
      src={coverImageDataUrl}
      alt=""
      width={OG_IMAGE_SIZE.width}
      height={OG_IMAGE_SIZE.height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />

    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        // 위쪽은 흰 로고·워드마크가, 아래쪽은 제목·메타가 어떤 사진 위에서도 읽히도록
        // 두 군데를 눌러 준다. 가운데는 사진이 그대로 보이게 거의 투명하게 둔다.
        background:
          "linear-gradient(180deg, rgba(6,9,16,0.62) 0%, rgba(6,9,16,0.10) 24%, rgba(6,9,16,0.18) 44%, rgba(6,9,16,0.66) 68%, rgba(6,9,16,0.96) 100%)",
      }}
    />

    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "48px 64px 54px",
      }}
    >
      <LogoMark logoSrc={logoSrc} surface="dark" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          maxWidth: "100%",
        }}
      >
        <span
          style={{
            fontSize: "62px",
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: "-0.025em",
            color: "#ffffff",
            textShadow: "0 2px 12px rgba(6,9,16,0.65)",
            maxWidth: "95%",
          }}
        >
          {title}
        </span>
        {meta ? (
          <span
            style={{
              fontSize: "30px",
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.92)",
              textShadow: "0 1px 8px rgba(6,9,16,0.6)",
              maxWidth: "96%",
            }}
          >
            {meta}
          </span>
        ) : null}
      </div>
    </div>
  </div>
);

/** 대표 이미지가 없는 페이지(소개·목록 등)와 사진 로딩 실패 시의 카드. */
const TextCard = ({
  title,
  description,
  logoSrc,
}: {
  title: string;
  description: string;
  logoSrc: string;
}) => (
  <div
    style={{
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "54px 64px",
      background: "linear-gradient(135deg, #f3f6ff 0%, #ffffff 45%, #eaf0ff 100%)",
      color: "#26356a",
      fontFamily: "Noto Sans KR",
    }}
  >
    <LogoMark logoSrc={logoSrc} surface="light" />

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          fontSize: "62px",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "-0.025em",
          maxWidth: "95%",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: "30px",
          lineHeight: 1.45,
          color: "#3b4d84",
          maxWidth: "96%",
        }}
      >
        {description}
      </span>
    </div>
  </div>
);

/**
 * renderOgCard 페이지별 Open Graph 카드 PNG를 만듭니다.
 * @param input 카드에 그릴 제목·설명·메타 줄과 선택적 대표 이미지 data URI입니다.
 * @returns `opengraph-image` 라우트가 그대로 반환할 수 있는 ImageResponse를 반환합니다.
 * @remarks 요청 시점 API를 쓰지 않으므로 이 라우트들은 빌드 시점에 PNG로 구워집니다.
 */
export const renderOgCard = async (input: OgCardInput): Promise<ImageResponse> => {
  const [fonts, blackLogo, whiteLogo] = await Promise.all([
    getKoreanFonts(),
    blackLogoPromise,
    whiteLogoPromise,
  ]);

  const title = truncateOgText(input.title, MAX_TITLE_LENGTH);
  const description = truncateOgText(input.description, MAX_DESCRIPTION_LENGTH);
  const meta = input.meta ? truncateOgText(input.meta, MAX_META_LENGTH) : undefined;

  return new ImageResponse(
    input.coverImageDataUrl ? (
      <PhotoCard
        title={title}
        meta={meta}
        coverImageDataUrl={input.coverImageDataUrl}
        logoSrc={whiteLogo}
      />
    ) : (
      <TextCard title={title} description={description} logoSrc={blackLogo} />
    ),
    {
      ...OG_IMAGE_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  );
};
