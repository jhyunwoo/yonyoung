---
version: alpha
name: 연영회 공개 사이트 (YonYoung Public)
description: 연세대학교 중앙사진동아리 연영회 공개 사이트의 디자인 시스템. 사진이 유일한 색이 되도록 UI 전체를 무채색 잉크와 1px 헤어라인으로 눌러 둔 "갤러리 도록" 언어 — 각진 모서리(반경 0), 채도 없는 남색 잉크, 그림자 대신 테두리, 크게 쓰되 굵지 않은 제목, 그리고 대문자 라틴 eyebrow.

colors:
  # ── 배경 ──
  bg-primary: "#ffffff" # 페이지 바탕
  bg-secondary: "#f7f9fc" # 한 단계 눌린 넓은 영역
  # ── 표면 ──
  surface-elevated: "#ffffff" # 카드 / 패널 / 헤더
  surface-muted: "#f2f5fb" # 카드 안의 눌린 블록, hover 바탕, 스켈레톤
  # ── 선 ──
  surface-border: "#bfbfbf" # 장식용 1px 헤어라인 (비강조)
  surface-strong-border: "#333333" # 구조용 1px 테두리 (강조 · 기본 카드)
  # ── 잉크 ──
  text-primary: "#2c3357" # 제목 · 본문 강조 (채도 낮은 남색)
  text-secondary: "#4e556e" # 리치 텍스트 본문
  text-muted: "#666666" # 설명 · 메타 · eyebrow
  # ── 액션 ──
  accent: "#2c3357" # 유일한 채움 액션 (= text-primary 와 동일 색)
  accent-foreground: "#ffffff"
  # ── 푸터 (라이트/다크 무관하게 항상 어두움) ──
  footer-bg: "#1a1a1a"
  footer-text: "#ffffff"
  footer-muted: "#999999"
  # ── 그림자 색 ──
  shadow-strong: "rgba(44, 51, 87, 0.1)"

typography:
  display:
    fontFamily: Pretendard Variable
    fontSize: 3.75rem # md: 6rem
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: -0.02em
  headline:
    fontFamily: Pretendard Variable
    fontSize: 2.2rem # md: 2.5rem
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.02em
  page-title:
    fontFamily: Pretendard Variable
    fontSize: 2rem # md: 3rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Pretendard Variable
    fontSize: 1.7rem
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: -0.02em
  title-md:
    fontFamily: Pretendard Variable
    fontSize: 1.3rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.02em
  title-sm:
    fontFamily: Pretendard Variable
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: Pretendard Variable
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body:
    fontFamily: Pretendard Variable
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: Pretendard Variable
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  label:
    fontFamily: Pretendard Variable
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0.08em
  eyebrow:
    fontFamily: Pretendard Variable
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0.12em
  caption:
    fontFamily: Pretendard Variable
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  none: 0px # 기본값 — 카드 · 버튼 · 이미지 · 패널 전부
  full: 9999px # 아이콘 버튼 · 상태 칩 · 카운터 배지 전용

spacing:
  xxs: 4px # gap-1
  xs: 8px # gap-2
  sm: 12px # gap-3
  md: 16px # p-4 · gap-4 · px-4 (모바일 거터)
  lg: 20px # p-5 (미디어 카드 메타)
  xl: 24px # p-6 · gap-6
  xxl: 32px # gap-8 · px-8 (데스크톱 거터)
  section-y: 48px # py-12 (섹션 세로 여백, 모바일)
  section-y-md: 64px # md:py-16 (섹션 세로 여백, 데스크톱)

components:
  site-header:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: 72px # md: 80px
  nav-link:
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    underlineColor: "{colors.text-primary}"
    underlineHeight: 2px
  nav-dropdown:
    backgroundColor: "{colors.surface-elevated}"
    borderTopColor: "{colors.surface-strong-border}"
    borderTopWidth: 2px
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
  theme-toggle:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.surface-border}"
    activeBackgroundColor: "{colors.accent}"
    activeTextColor: "{colors.accent-foreground}"
    rounded: "{rounded.full}"
    size: 36px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    borderColor: "{colors.surface-strong-border}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 12px 24px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    borderColor: "{colors.surface-strong-border}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 12px 24px
    hoverBackgroundColor: "{colors.text-primary}"
    hoverTextColor: "{colors.accent-foreground}"
  card-media:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.surface-strong-border}"
    textColor: "{colors.text-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
    mediaAspectRatio: "4 / 3"
  card-quicklink:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.surface-border}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
    hoverBorderColor: "{colors.surface-strong-border}"
    hoverBackgroundColor: "{colors.surface-muted}"
  card-panel:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.surface-border}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
  card-poster:
    backgroundColor: "#000000"
    textColor: "#ffffff"
    typography: "{typography.title-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
    mediaAspectRatio: "2 / 3"
    overlayGradient: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6), transparent)"
  card-tile:
    backgroundColor: "{colors.surface-border}"
    textColor: "#ffffff"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
    mediaAspectRatio: "4 / 3"
    overlayGradient: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)"
  eyebrow-label:
    textColor: "{colors.text-muted}"
    typography: "{typography.eyebrow}"
    textTransform: uppercase
  section-shell:
    maxWidth: 1200px
    padding: "48px 16px" # md: 64px 32px
    headingTypography: "{typography.headline}"
    descriptionTypography: "{typography.body-sm}"
    descriptionColor: "{colors.text-muted}"
  page-title-hero:
    borderBottomColor: "{colors.surface-border}"
    headingTypography: "{typography.page-title}"
    descriptionTypography: "{typography.body-lg}"
    descriptionColor: "{colors.text-muted}"
    padding: "32px 0" # md: 64px 0
  site-footer:
    backgroundColor: "{colors.footer-bg}"
    textColor: "{colors.footer-text}"
    mutedColor: "{colors.footer-muted}"
    dividerColor: "{colors.surface-strong-border}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "48px 16px" # md: 64px 32px
  photo-gallery-item:
    backgroundColor: "{colors.surface-muted}"
    borderColor: "{colors.surface-border}"
    rounded: "{rounded.none}"
  photo-lightbox:
    backgroundColor: "rgba(0, 0, 0, 0.9)"
    controlBackgroundColor: "rgba(255, 255, 255, 0.1)"
    controlTextColor: "#ffffff"
    controlRounded: "{rounded.full}"
    controlSize: 44px
  badge-status:
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  attachment-row:
    backgroundColor: "{colors.surface-muted}"
    borderColor: "{colors.surface-border}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
---

> **적용 범위 — 반드시 먼저 읽을 것**
>
> 이 문서는 **`app/(home)` 공개 사이트에만** 적용된다.
> 저장소 루트의 `DESIGN.md`(Notion Analysis)는 **`app/(dashboard)` 관리자 화면**의 근거 문서다.
> 두 문서는 의도적으로 다른 디자인 언어를 기술하며, **서로 섞어 쓰면 안 된다.**
>
> | | `MAINDESIGN.md` (공개 사이트) | `DESIGN.md` (대시보드) |
> |---|---|---|
> | 모서리 | **0px** (각짐) | 8~16px (둥금) |
> | 구조 표현 | **1px 테두리** | 그림자 + 헤어라인 |
> | 액센트 | 없음 — 잉크 남색 `#2c3357` 하나 | Notion 블루 `#0075de` |
> | 바탕 | 순백 `#ffffff` | 웜 페이퍼 `#f6f5f4` |
> | 제목 굵기 | 큰 글자일수록 **얇게(400)** | 항상 700 |
> | 토큰 접두 | `--bg-*` `--surface-*` `--text-*` | `--canvas` `--surface` `--ink-*` |
>
> 토큰 실체는 `app/(home)/globals.css`의 `:root` / `.dark` 블록이다. 이 문서와 그 파일이 어긋나면 **CSS가 사실이고 이 문서가 갱신 대상**이다.
>
> 문서 마지막의 `Motion`, `Accessibility`, `Imagery`, `현재 코드와의 차이` 섹션은 DESIGN.md 표준 스펙에는 없는 **프로젝트 확장 섹션**이다.

## Overview

연영회 공개 사이트는 **사진을 거는 벽**이다. UI가 색을 가지면 사진이 진다는 전제 하나로 전체 시각 언어가 결정되어 있다.

바탕은 순백이고, 잉크는 채도를 거의 뺀 남색(`{colors.text-primary}` #2c3357) 한 종류다. 이 남색은 제목 색이자 유일한 액션 채움 색(`{colors.accent}`)이기도 하다 — **같은 값을 두 이름으로 부르는 것이 의도**이며, 그래서 이 사이트에는 "브랜드 컬러 버튼"이라는 개념이 존재하지 않는다. 강조는 색이 아니라 **테두리와 여백**이 만든다.

모서리는 전부 각져 있다(`{rounded.none}`). 카드도, 버튼도, 이미지 프레임도 반경이 0이다. 사진의 직사각형 프레임과 UI의 프레임이 같은 기하를 공유해서, 화면 전체가 인화지를 붙인 도록처럼 읽힌다. 둥근 모서리는 아이콘 버튼·상태 칩처럼 **원래 원형인 것**에만 허용된다(`{rounded.full}`).

깊이는 그림자가 아니라 **1px 선**으로 만든다. 두 단계뿐이다 — 구조를 만드는 진한 테두리(`{colors.surface-strong-border}`)와, 존재만 알리는 흐린 헤어라인(`{colors.surface-border}`). 그림자는 "떠 있는 것"(스크롤된 헤더, 드롭다운)에만 쓴다.

타이포그래피의 서명은 **크기와 굵기의 반비례**다. 홈 히어로의 "연영회"는 96px인데 굵기가 400이다. 섹션 제목도 400이다. 큰 글자는 얇고 자간이 좁게(-0.02em) 눌려 편집 디자인처럼 읽히고, 굵기(600/700)는 12~18px의 작은 라벨에만 남겨 둔다. 한글은 글자당 획이 많아 큰 크기에서 굵게 쓰면 덩어리로 뭉치는데, 이 규칙이 그것을 막는다.

리듬을 만드는 마지막 장치는 **대문자 라틴 eyebrow**다. `Latest Activities`, `Quick Access`, `Since` 처럼 각 블록 위에 12px 대문자 라벨이 자간 0.12em으로 얹히고, 그 아래 한글 제목이 온다. 라틴은 라벨, 한글은 내용 — 이 이중 언어 대비가 사이트의 목소리다.

**핵심 특징**

- 반경 0의 각진 기하 — 사진 프레임과 UI 프레임이 동일
- 무채색 남색 잉크 하나. 별도 브랜드 액센트 없음
- 그림자 대신 **2단계 1px 테두리**로 위계 표현
- 큰 제목일수록 얇게(400) + 자간 -0.02em
- 12px 대문자 라틴 eyebrow가 모든 블록의 머리
- 라이트/다크와 무관하게 **항상 어두운 푸터 밴드**
- 모션은 전부 `useReducedMotion` 게이트 — 예외 없음

## Colors

색은 **CSS 변수로만** 참조한다. 위 프런트매터의 hex는 **라이트 모드 값**이며, 다크 값은 `.dark` 클래스가 같은 변수명으로 자동 교체한다. 따라서 컴포넌트 코드에는 **hex를 절대 직접 쓰지 않는다** — `text-(--text-primary)` 처럼 변수를 참조하면 다크 대응이 공짜로 따라온다.

### 전체 토큰 표

| 토큰 | 라이트 | 다크 | Tailwind 사용법 | 용도 |
| --- | --- | --- | --- | --- |
| `{colors.bg-primary}` | `#ffffff` | `#0d0f12` | `bg-(--bg-primary)` | 페이지 최상위 바탕 |
| `{colors.bg-secondary}` | `#f7f9fc` | `#12151a` | `bg-(--bg-secondary)` | 넓은 영역을 한 단계 누를 때 |
| `{colors.surface-elevated}` | `#ffffff` | `#171b21` | `bg-(--surface-elevated)` | 카드 · 패널 · 헤더 · 드롭다운 |
| `{colors.surface-muted}` | `#f2f5fb` | `#1d232b` | `bg-(--surface-muted)` | 카드 내부 눌린 블록 · hover 바탕 · 스켈레톤 |
| `{colors.surface-border}` | `#bfbfbf` | `#303845` | `border-(--surface-border)` | 흐린 헤어라인 (비강조 카드 · 구분선) |
| `{colors.surface-strong-border}` | `#333333` | `#465162` | `border-(--surface-strong-border)` | 구조 테두리 (기본 카드 · 버튼) |
| `{colors.text-primary}` | `#2c3357` | `#f3f4f6` | `text-(--text-primary)` | 제목 · 강조 본문 · 링크 |
| `{colors.text-secondary}` | `#4e556e` | `#d2d7df` | `text-(--text-secondary)` | 리치 텍스트 본문 (전시/활동 설명) |
| `{colors.text-muted}` | `#666666` | `#a4acb8` | `text-(--text-muted)` | 설명문 · 메타 · eyebrow |
| `{colors.accent}` | `#2c3357` | `#cfd6e2` | `bg-(--accent)` | 유일한 채움 액션 |
| `{colors.accent-foreground}` | `#ffffff` | `#11151b` | `text-(--accent-foreground)` | `accent` 위의 글자 |
| `{colors.footer-bg}` | `#1a1a1a` | `#0b0d11` | `bg-(--footer-bg)` | 푸터 밴드 (양 테마 모두 어두움) |
| `{colors.footer-text}` | `#ffffff` | `#f3f4f6` | `text-(--footer-text)` | 푸터 강조 글자 |
| `{colors.footer-muted}` | `#999999` | `#97a0ad` | `text-(--footer-muted)` | 푸터 본문 · 링크 |
| `{colors.shadow-strong}` | `rgba(44,51,87,.1)` | `rgba(0,0,0,.48)` | `shadow-[0_2px_10px_var(--shadow-strong)]` | 그림자 색 |

### 액센트에 대한 규칙

`{colors.accent}`와 `{colors.text-primary}`는 **라이트 모드에서 완전히 같은 값**(#2c3357)이다. 우연이 아니라 설계다.

- 이 사이트에는 "눈에 띄는 브랜드 색"이 없다. 강조는 **채움 여부**로만 표현된다.
- 다크 모드에서는 극성이 뒤집힌다 — `accent`가 밝은 회백(`#cfd6e2`), 그 위 글자가 어두워진다. 그래서 **`bg-(--accent)` 위 글자는 반드시 `text-(--accent-foreground)`**를 써야 한다. `text-white`를 하드코딩하면 다크 모드에서 흰 바탕에 흰 글자가 된다.

### 테두리 2단계 규칙

이 시스템은 그림자를 거의 쓰지 않으므로 **테두리가 위계 그 자체**다. 둘 중 하나를 고르는 기준:

- **`{colors.surface-strong-border}` (진한 선)** — 그 자체로 독립된 개체. 클릭 가능한 미디어 카드, 버튼, CTA 박스, 드롭다운 상단 액센트.
- **`{colors.surface-border}` (흐린 선)** — 목록의 일부이거나 보조적인 것. 퀵링크 카드, 소개 페이지 카드, 구분선, 갤러리 타일, 푸터 내부 구분선.

hover 시 **흐린 선 → 진한 선**으로 승격하는 것이 이 사이트의 표준 hover 표현이다(`hover:border-(--surface-strong-border)`).

### 대비 (실측)

WCAG 기준 실측값이다. 모든 텍스트 조합은 AA(4.5:1)를 통과한다.

| 조합 | 라이트 | 다크 | 판정 |
| --- | --- | --- | --- |
| `text-primary` on `bg-primary` | 12.22 | 17.44 | AA ✅ |
| `text-primary` on `surface-muted` | 11.19 | 14.37 | AA ✅ |
| `text-secondary` on `surface-elevated` | 7.37 | 11.95 | AA ✅ |
| `text-muted` on `bg-primary` | 5.74 | 8.38 | AA ✅ |
| `text-muted` on `surface-muted` | 5.26 | 6.91 | AA ✅ |
| `accent-foreground` on `accent` | 12.22 | 12.53 | AA ✅ |
| `footer-muted` on `footer-bg` | 6.11 | 7.36 | AA ✅ |
| `surface-strong-border` on `bg-primary` | 12.63 | **2.39** | 다크 ⚠️ |
| `surface-border` on `bg-primary` | 1.84 | 1.62 | 장식 전용 ⚠️ |

**여기서 나오는 강제 규칙 두 가지:**

1. `{colors.surface-border}`는 라이트에서도 1.84:1이라 **비텍스트 3:1 요건을 만족하지 못한다.** 순수 장식용이다. **이 선 하나에만 의존해 인터랙티브 요소의 경계를 알리면 안 된다** — 폼 입력 테두리나 버튼의 유일한 시각 경계로 쓰지 말 것.
2. `{colors.surface-strong-border}`는 **다크 모드에서 2.39:1**로 3:1에 미달한다. 다크에서 이 선이 버튼의 유일한 경계인 경우(예: `button-secondary`) 경계가 실질적으로 보이지 않는다. 새 인터랙티브 컴포넌트는 **테두리 외에 배경 대비나 텍스트 대비를 함께** 갖게 설계하고, 토큰 자체는 `#5b6779` 이상으로 올리는 것을 권장한다(→ `현재 코드와의 차이` 참조).

### 상태 색 (미정의 — 신규 정의 필요)

현재 시스템에는 semantic 상태 색 토큰이 **없다**. 리크루팅 페이지만 Tailwind 원시 팔레트(`bg-blue-50` / `bg-emerald-50` / `bg-slate-100`)를 직접 쓰고 있고 `dark:` 변형이 없어 다크 모드에서 깨진다.

상태 표시가 필요하면 **원시 팔레트를 쓰지 말고** 아래 토큰을 `globals.css`에 추가한 뒤 참조한다.

```css
:root {
  --status-info-bg: #eef2ff;
  --status-info-text: #3730a3;
  --status-success-bg: #ecfdf5;
  --status-success-text: #065f46;
  --status-neutral-bg: #f1f5f9;
  --status-neutral-text: #334155;
}
.dark {
  --status-info-bg: #1e1b4b;
  --status-info-text: #c7d2fe;
  --status-success-bg: #052e2b;
  --status-success-text: #6ee7b7;
  --status-neutral-bg: #1e293b;
  --status-neutral-text: #cbd5e1;
}
```

## Typography

### 폰트

```
"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo",
"Malgun Gothic", "Noto Sans KR", sans-serif
```

Pretendard 단일 패밀리로 한글·라틴·숫자를 모두 처리한다. 세리프도, 디스플레이 전용 서체도 없다. 예외는 계좌번호 등 **자릿수 정렬이 의미를 갖는 숫자**뿐이며 그때만 `font-mono`를 쓴다.

> ⚠️ **현재 `(home)` 그룹은 Pretendard `@font-face`를 로드하지 않는다.** `app/(dashboard)/globals.css`만 `pretendard-font.css`를 import 하므로, 공개 사이트는 사용자 로컬에 Pretendard가 설치된 경우에만 이 서체로 보이고 아니면 `Apple SD Gothic Neo` / `Malgun Gothic`으로 폴백한다. 자간·굵기 규칙이 설계대로 재현되려면 이 import가 필요하다(→ `현재 코드와의 차이`).

### 굵기 규칙 — **크기와 굵기는 반비례한다**

이 시스템에서 가장 중요한 타이포 규칙이다. 위반하면 즉시 다른 사이트처럼 보인다.

| 글자 크기 | 굵기 | 근거 |
| --- | --- | --- |
| **≥ 1.7rem** | **400** (`font-normal`, 클래스 생략) | 큰 한글을 굵게 쓰면 획이 뭉쳐 덩어리가 된다. 얇게 + 좁은 자간이 편집 디자인의 목소리를 만든다 |
| 1.1 ~ 1.3rem | 400 또는 600 | 카드 제목은 400, 소제목(h3)은 600 |
| ≤ 1rem | 600 / 700 | 작은 글자는 굵어야 라벨로 읽힌다 |

Tailwind preflight가 `h1`~`h6`의 `font-weight`를 `inherit`으로 초기화하므로, **굵기 클래스를 생략하면 자동으로 400**이 된다. 큰 제목에는 굵기 클래스를 **쓰지 않는 것이 정답**이다.

### 스케일

| 토큰 | 크기 (모바일 → md) | 굵기 | 행간 | 자간 | Tailwind | 용도 |
| --- | --- | --- | --- | --- | --- | --- |
| `{typography.display}` | 3.75rem → 6rem | 400 | 0.96 | −0.02em | `text-6xl md:text-8xl leading-[0.96] tracking-[-0.02em]` | 홈 히어로 h1 — **홈에서 단 1회** |
| `{typography.headline}` | 2.2rem → 2.5rem | 400 | 1.15 | −0.02em | `text-[2.2rem] md:text-[2.5rem] leading-tight tracking-[-0.02em]` | `SectionShell` 섹션 제목 (h2) |
| `{typography.page-title}` | 2rem → 3rem | 400 | 1.2 | −0.02em | `text-[2rem] md:text-[3rem] leading-[1.2] tracking-[-0.02em]` | `PageTitleHero` 페이지 제목 (h1) |
| `{typography.title-lg}` | 1.7rem | 400 | 1.25 | −0.02em | `text-[1.7rem] tracking-[-0.02em]` | 히어로 전시 카드 제목 |
| `{typography.title-md}` | 1.3rem | 400 | 1.2 | −0.02em | `text-[1.3rem] leading-tight tracking-[-0.02em]` | 미디어 카드 제목 (h3) |
| `{typography.title-sm}` | 1.125rem | 600 | 1.4 | 0 | `text-lg font-semibold` | 소개 카드 소제목 |
| `{typography.body-lg}` | 1.125rem | 400 | 1.6 | 0 | `text-lg` | 페이지 제목 밑 설명문 |
| `{typography.body}` | 1rem | 400 | 1.6 (본문 1.8) | 0 | `text-base leading-relaxed` | 일반 본문 |
| `{typography.body-sm}` | 0.875rem | 400 | 1.6 | 0 | `text-sm leading-relaxed` | 카드 설명 · 메타 · 푸터 (**가장 많이 쓰임**) |
| `{typography.label}` | 0.875rem | 600 | 1.5 | +0.08em | `text-sm font-semibold uppercase tracking-[0.08em]` | 버튼 라벨 · 데스크톱 내비 |
| `{typography.eyebrow}` | 0.75rem | 600 | 1.35 | +0.12em | `text-xs font-semibold uppercase tracking-[0.12em]` | 섹션 eyebrow · 카드 메타 라벨 |
| `{typography.caption}` | 0.75rem | 400 | 1.5 | 0 | `text-xs` | 저작권 · 보조 설명 |

`SectionShell`의 eyebrow만 자간이 한 단계 넓다(`tracking-[0.16em]`) — 섹션 최상위 라벨이라 의도적으로 더 벌린 것이며 그대로 유지한다.

### 자간 원칙

- **큰 글자는 좁힌다**: 1.3rem 이상은 전부 `tracking-[-0.02em]`. 예외 없음.
- **작은 대문자는 벌린다**: 대문자 라틴 라벨은 `+0.08em`(버튼) / `+0.12em`(eyebrow) / `+0.16em`(섹션 eyebrow).
- **본문은 건드리지 않는다**: 1rem 이하 한글 본문에 자간을 주지 않는다.
- 헤더 로고의 `tracking-[-0.05em]`은 좁은 폭에 긴 기관명을 넣기 위한 국소 예외다. 다른 곳에 복제하지 말 것.

### 대문자 사용 규칙

`uppercase`는 **라틴 문자에만** 적용한다. 한글에는 `uppercase`가 아무 효과가 없어 무해해 보이지만, 라틴이 섞인 문자열에서 의도치 않은 결과를 낳는다.

- ✅ eyebrow (`Latest Activities`, `Quick Access`, `Since`), 버튼 라벨(`ABOUT`, `ARCHIVE`), 내비 항목
- ❌ 한글 제목, 한글 본문, 사용자 입력 데이터(전시명·활동명)

### 은퇴시킬 임의 크기

아래 값들은 스케일 밖의 잔여물이다. 새 코드에서 쓰지 말고, 기존 코드를 만지면 오른쪽 값으로 정리한다.

| 사용 중 | → 대체 |
| --- | --- |
| `text-[2.8rem]` (에러/404 페이지) | `text-[2.5rem]` = `headline` |
| `text-[1.75rem]`, `text-[1.8rem]` | `text-[1.7rem]` = `title-lg` |
| `text-[1.2rem]`, `text-[1.15rem]` | `text-[1.3rem]` = `title-md` |
| `text-[0.95rem]`, `text-[0.9rem]`, `text-[0.85rem]` | `text-sm` = `body-sm` |
| `text-[0.8rem]` | `text-xs` = `caption` |

## Layout

### 컨테이너

| 이름 | 폭 | Tailwind | 용도 |
| --- | --- | --- | --- |
| **기본** | 1200px | `max-w-[1200px]` | 헤더 · 푸터 · 모든 섹션 · 일반 페이지 |
| **와이드** | 1400px | `max-w-[1400px]` | 활동 기록 그리드처럼 이미지가 주인공인 격자 |
| **읽기** | 800px | `max-w-200` | 후원 안내처럼 글이 주인공인 페이지 |
| **문단** | 768px | `max-w-3xl` | 섹션 설명문 (`SectionShell` description) |

> `max-w-300`과 `max-w-[1200px]`는 **완전히 같은 값**이다(Tailwind v4에서 `300 × 0.25rem = 75rem = 1200px`). 두 표기가 코드에 섞여 있는데, 신규 코드는 **`max-w-[1200px]`로 통일**한다. 값이 다르다고 오해해 "고치는" 일을 막기 위한 규칙이다.

### 거터와 섹션 리듬

```
페이지 좌우 거터 : px-4 md:px-8          (16px → 32px)
섹션 상하 여백   : py-12 md:py-16         (48px → 64px)
섹션 헤더 하단   : mb-10 md:mb-12         (40px → 48px)
```

`SectionShell` 컴포넌트가 이 리듬을 캡슐화한다. **공개 사이트의 새 섹션은 반드시 `SectionShell`로 감싼다** — 여백을 직접 쓰기 시작하면 리듬이 즉시 무너진다.

### 간격 스케일

4px 배수만 쓴다. 홀수 값이나 임의 px 여백은 금지.

| 토큰 | 값 | Tailwind | 쓰는 곳 |
| --- | --- | --- | --- |
| `{spacing.xxs}` | 4px | `gap-1` | 아이콘과 글자 사이 |
| `{spacing.xs}` | 8px | `gap-2` | 메타 정보 묶음 |
| `{spacing.sm}` | 12px | `gap-3` | 버튼 그룹 · 조밀한 그리드 |
| `{spacing.md}` | 16px | `p-4` `gap-4` | 소형 카드 패딩 · 모바일 거터 |
| `{spacing.lg}` | 20px | `p-5` | **미디어 카드 메타 영역 패딩** |
| `{spacing.xl}` | 24px | `p-6` `gap-6` | 패널 패딩 · 표준 그리드 간격 |
| `{spacing.xxl}` | 32px | `gap-8` `px-8` | 미디어 그리드 간격 · 데스크톱 거터 |
| `{spacing.section-y}` | 48px | `py-12` | 섹션 세로 (모바일) |
| `{spacing.section-y-md}` | 64px | `md:py-16` | 섹션 세로 (데스크톱) |

**카드 패딩 결정 규칙**: 이미지 밑 메타 영역 = `p-5` / 텍스트만 있는 소형 카드 = `p-4` / 독립 패널·CTA 박스 = `p-6`.

### 브레이크포인트

| 이름 | 폭 | 주요 변화 |
| --- | --- | --- |
| 기본 | ~639px | 1열. 헤더 72px + 햄버거 메뉴. 갤러리 1열 고정 |
| `sm` | 640px | 카드 그리드 2열. 갤러리 justified rows 수학 시작 |
| `md` | 768px | **데스크톱 내비 전환점.** 헤더 80px, 거터 32px, 히어로 2열 |
| `lg` | 1024px | 카드 그리드 3열. 갤러리 기준 3열 |

`md`(768px)가 이 사이트의 실질적 전환점이다. 헤더 높이·내비 형태·거터·히어로 레이아웃이 모두 여기서 바뀐다.

> 아카이브/링크트리 페이지는 `max-[1024px]` `max-[900px]` `max-[768px]` 같은 **max-width 질의**를 쓴다. 나머지 사이트는 모바일 우선(min-width)이다. 신규 코드는 **모바일 우선으로 작성**하고, 기존 max-width 질의는 손댈 때 뒤집는다.

### 그리드 패턴

| 대상 | 클래스 | 간격 |
| --- | --- | --- |
| 미디어 카드 (활동/전시) | `grid gap-8 sm:grid-cols-2 lg:grid-cols-3` | 32px |
| 텍스트 카드 (퀵링크/소개) | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` | 16px |
| 히어로 | `grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end` | 40px |
| 포스터 (전시 목록) | 3열 → 1열, `aspect-[2/3]` | 40px |

**이미지가 있는 그리드는 간격을 넓게(gap-8), 텍스트만 있는 그리드는 좁게(gap-4)** — 사진끼리 붙으면 서로 간섭하기 때문이다.

### 헤더 오프셋

헤더가 `position: fixed`이므로 본문은 반드시 `PublicHeaderSafeArea`로 감싼다. 높이는 변수로만 참조한다.

```
--public-header-height-mobile : 72px
--public-header-height-desktop: 80px
```

`pt-[72px]` 같은 하드코딩 금지. `pt-[var(--public-header-height-mobile)] md:pt-[var(--public-header-height-desktop)]`.

## Elevation & Depth

깊이의 **1차 언어는 그림자가 아니라 테두리**다. 그림자는 "실제로 다른 레이어에 떠 있는 것"에만 허용된다.

| 레벨 | 처리 | 사용처 |
| --- | --- | --- |
| **0 — 평면 (기본)** | 그림자 없음. `border` 1px만 | 모든 카드 · 버튼 · 패널 · 이미지 프레임 |
| **1 — 부착** | `shadow-[0_2px_10px_var(--shadow-strong)]` | 스크롤된 헤더 (`scrollY > 50`) |
| **2 — 떠 있음** | `shadow-[0_4px_15px_var(--shadow-strong)]` | 내비 드롭다운 · 링크트리 카드 |
| **3 — 오버레이** | `bg-black/90` 전면 + 컨트롤 `backdrop-blur-sm` | 라이트박스 · 모바일 메뉴 백드롭(`bg-black/25`) |

### 그림자 규칙

1. **그림자 색은 반드시 `var(--shadow-strong)`**를 쓴다. `rgba(0,0,0,0.1)` 하드코딩은 다크 모드에서 보이지 않는다(다크의 `--shadow-strong`은 알파 0.48로 훨씬 진하다).
2. **카드에 기본 그림자를 주지 않는다.** 부양감이 필요하면 그림자 대신 `hover:border-(--surface-strong-border)`로 테두리를 승격시킨다.
3. hover에서 그림자를 키우지 않는다. 이 사이트의 hover는 **테두리 · 바탕 · 위치**로 표현한다.

### 반투명 표면

어두운 오버레이 위 컨트롤만 반투명을 쓴다: `bg-white/10` + `backdrop-blur-sm`, hover 시 `bg-white/20`. 밝은 배경 위에는 반투명 표면을 쓰지 않는다.

## Shapes

### 반경 — 값이 두 개뿐인 시스템

| 토큰 | 값 | 허용 대상 |
| --- | --- | --- |
| `{rounded.none}` | **0px** | 카드, 버튼, 패널, 이미지 프레임, 입력, 드롭다운 — **기본값** |
| `{rounded.full}` | 9999px | 아이콘 버튼(테마 토글 36px, 라이트박스 44px), 상태 칩, 카운터 배지 |

**중간값은 존재하지 않는다.** `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-[5px]`는 전부 이 시스템 밖이다. 각진 모서리가 사진 프레임과 UI를 같은 기하로 묶는 장치이므로, 한 군데만 둥글어져도 그 요소가 다른 시스템에서 온 것처럼 보인다.

판단 기준 한 줄: **원형이어야 할 것만 원형, 나머지는 전부 각짐.**

### 선 두께

| 두께 | 용도 |
| --- | --- |
| 1px | 기본 테두리 전부 (`border`) |
| 2px | 강조 하단선 (`border-b-2` — 링크트리/후원 제목), 내비 밑줄, 드롭다운 상단선, 햄버거 바 |
| 4px | 좌측 강조 바 (`border-l-4` — 항목 리스트) |

### 이미지 프레임

| 비율 | Tailwind | 용도 |
| --- | --- | --- |
| **4 / 3** | `aspect-4/3` | 활동 카드, 히어로 전시 카드, 아카이브 타일 — **기본 비율** |
| **2 / 3** | `aspect-[2/3]` | 전시 포스터 (세로형) |
| **1 / 1** | `aspect-square` | 프로필 아바타 |
| 원본 비율 | `--photo-aspect` | 사진 갤러리 (justified rows — 크롭 없음) |

프레임은 언제나 각지고(`{rounded.none}`), 이미지는 `object-cover`로 채운다. 단 **사진 갤러리와 라이트박스는 크롭하지 않는다** — 프레임 자체를 사진 비율에 맞춘다(계산은 `app/(home)/globals.css`의 `.photo-gallery` 참조).

### 오버레이 그라디언트

이미지 위 텍스트에는 반드시 그라디언트를 깐다.

- 타일(4/3): `bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent`
- 포스터(2/3): `bg-gradient-to-t from-[rgba(0,0,0,0.9)] via-[rgba(0,0,0,0.6)] to-transparent`, 최소 높이 `min-h-1/2`
- 포스터 텍스트에는 `[text-shadow:0_2px_4px_rgba(0,0,0,0.5)]`를 추가한다 (밝은 사진 대비)

**모바일에서는 오버레이를 항상 보이게 한다**(`max-[768px]:opacity-100`). hover가 없는 기기에서 정보가 사라지기 때문이다.

## Components

### `site-header` — 고정 헤더

- `fixed inset-x-0 top-0 z-[1000]`, 높이 `72px` → `md:80px`, 바탕 `{colors.surface-elevated}`
- 기본은 `border-transparent`. **스크롤 50px 초과** 시 `border-b-(--surface-border)` + 레벨 1 그림자. 전환 `duration-300`
- 내부 컨테이너 `max-w-[1200px] px-4 md:px-8`
- 좌측 로고(`min-h-11` 확보) · 우측 내비 + 테마 토글 · `md` 미만에서는 햄버거

### `nav-link` — 데스크톱 내비 링크

- `{typography.label}` 대문자, `py-6`
- **밑줄 성장 애니메이션**: `::after` 2px 바가 `w-0` → `hover:w-full`, `duration-300`
- 활성 경로는 `after:w-full` 고정 (모바일은 `after:w-12`)
- 활성 상태를 **색으로 표시하지 않는다** — 밑줄만으로 표현

### `nav-dropdown` — 내비 하위 메뉴

- `border-t-2 border-(--surface-strong-border)`(상단 강조선) + `{colors.surface-elevated}` 바탕 + 레벨 2 그림자
- `min-w-[150px]`, 중앙 정렬(`left-1/2 -translate-x-1/2`), 반경 0
- `invisible opacity-0` → 열림 상태에서 `visible opacity-100`, 항목 hover는 `bg-(--surface-muted)`
- **부모 항목은 이동하지 않는다.** hover(마우스)·focus(키보드)로 펼쳐지고, 클릭/탭은 열기·닫기 토글이다. 실제 이동은 하위 항목 선택으로만 일어난다
- 열림 여부의 근거는 하이드레이션 이후 `data-open` 하나뿐이다. CSS 로만 여는 경로(`parent-hovered:` / `group-focus-within:`)는 하이드레이션 전 폴백으로만 붙는다 — 남겨 두면 `:hover` 가 "클릭으로 닫기"를 무시해 화면과 `aria-expanded` 가 어긋난다

### `theme-toggle` — 라이트/다크/시스템 3분할

- `rounded-full` 컨테이너 + `border-(--surface-border)` + `p-1`
- 버튼 3개 각 `h-9 w-9 rounded-full`, 아이콘 `h-4 w-4` (lucide `Sun` / `Moon` / `Monitor`)
- 활성: `bg-(--accent) text-(--accent-foreground)` / 비활성: `text-(--text-primary) hover:bg-(--surface-muted)`
- `role="group"` + `aria-label` + 각 버튼 `aria-pressed` 필수

### `button-primary` — 주 CTA

```
inline-flex border border-(--surface-strong-border) bg-(--accent)
px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]
text-(--accent-foreground) transition hover:opacity-90
```

한 화면에 **하나만** 둔다. 채움이 곧 우선순위 신호다.

### `button-secondary` — 보조 CTA

```
inline-flex border border-(--surface-strong-border)
px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]
text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white
```

hover 시 **명암 반전**이 이 사이트의 서명 인터랙션이다.
⚠️ `hover:text-white`는 다크 모드에서 밝은 바탕 위 흰 글자가 된다 — 신규 코드는 `hover:text-(--bg-primary)`를 쓴다.

### `card-media` — 이미지 카드 (활동/전시)

```
group flex flex-col h-full overflow-hidden
border border-(--surface-strong-border) bg-(--surface-elevated)
transition-transform duration-300 hover:scale-[1.03]
```

- 이미지 영역: `relative shrink-0 aspect-4/3 overflow-hidden` + `next/image fill object-cover`
- 메타 영역: `space-y-2 p-5`
- 순서 고정: **eyebrow(날짜, `{typography.eyebrow}`) → 제목(`{typography.title-md}`) → 설명(`text-sm line-clamp-2 text-(--text-muted)`)**
- `aria-label="{제목} 상세 보기"` 필수

### `card-quicklink` — 텍스트 링크 카드

```
group flex flex-col h-full min-w-0
border border-(--surface-border) bg-(--surface-elevated) p-4
transition hover:border-(--surface-strong-border) hover:bg-(--surface-muted)
```

- 순서: 그룹명(eyebrow) → 이름(`text-base font-semibold`) → URL(`truncate text-xs`)
- 외부 링크는 `target="_blank" rel="noopener noreferrer"`
- **공백 없는 긴 URL 대응**: 이름에 `wrap-anywhere`, URL에 `truncate`, 컨테이너에 `min-w-0`

### `card-panel` — 안내/CTA 박스

```
border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-center
```

빈 상태 안내와 섹션 하단 CTA에 공용. 빈 상태 문구는 `text-sm text-(--text-muted)`.

### `card-poster` — 전시 포스터 카드

- `aspect-[2/3] bg-black overflow-hidden`, hover `-translate-y-[5px]`
- 하단 그라디언트 + 흰 글자 + `text-shadow`
- 우상단에 조회수 배지(`rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm`)

### `card-tile` — 아카이브 타일

- `aspect-[4/3]`, 바탕 `bg-(--surface-border)`(로딩 중 플레이스홀더), hover `scale-[1.02]`
- 오버레이는 데스크톱 hover 시에만, **모바일은 항상 표시**

### `eyebrow-label` — 대문자 라벨

```
text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)
```

모든 블록의 머리. 라틴 대문자만. 섹션 최상위는 `tracking-[0.16em]`.

### `section-shell` — 섹션 래퍼

`SectionShell` 컴포넌트를 그대로 쓴다. 구조는 **eyebrow → 제목(h2) → 설명** 중앙 정렬 고정이며, 설명은 `mx-auto max-w-3xl`.

### `page-title-hero` — 하위 페이지 제목

`PageTitleHero` 컴포넌트. `border-b border-(--surface-border)` + `py-8 md:py-16` + 중앙 정렬. 하위 페이지는 예외 없이 이것으로 시작한다.

### `site-footer` — 푸터

- **라이트/다크 무관하게 항상 어두운 밴드**(`{colors.footer-bg}`)
- 구조: 로고 블록 → `border-b` → 5열 정보 그리드(`lg:grid-cols-5`) → `border-t` → 저작권
- 라벨 `text-[0.85rem] font-bold uppercase text-(--footer-muted)`, 내용 `text-[0.9rem] text-(--footer-muted)`
- 링크는 `min-h-11 w-full`로 터치 타깃 확보, hover 시 `text-(--footer-text)`로 밝아짐
- 긴 이메일/URL에 `break-all`

### `photo-gallery-item` — 갤러리 타일

`border-(--surface-border) bg-(--surface-muted)` + 반경 0. 레이아웃 수학은 전부 `globals.css`에 있고 `--photo-aspect`(**순수 숫자만**)로 제어한다. 상세 규칙과 함정 3가지는 `CLAUDE.md` 참조.

### `photo-lightbox` — 확대 보기

- `fixed inset-0 z-[1200] bg-black/90`, **portal 필수**(`.photo-gallery`의 `container-type`이 `fixed`를 가둠)
- 컨트롤: `h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm`, hover `bg-white/20`
- 프레임: `width: min(90vw, calc(82svh * var(--photo-aspect)))` — 레터박스 없음
- 접근성: `role="dialog"` `aria-modal="true"`, Esc·←·→ 지원, 배경 스크롤 잠금, 닫을 때 원래 버튼으로 포커스 복귀

### `badge-status` — 상태 칩

```
inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold
```

색은 반드시 `--status-*` 토큰(위 Colors 참조)을 쓴다. **Tailwind 원시 팔레트 금지.**

### `attachment-row` — 첨부파일 행

`border border-(--surface-border) bg-(--surface-muted) px-4 py-3`, 반경 **0**(현재 `rounded-lg` → 수정 대상), 아이콘과 라벨 `gap-3`.

## Do's and Don'ts

### Do

- 색은 **CSS 변수로만** 참조한다 — `text-(--text-primary)`, `bg-(--surface-elevated)`. 다크 대응이 자동으로 따라온다.
- 카드·버튼·이미지 프레임은 **반경 0**으로 만든다. 각진 기하가 이 사이트의 정체성이다.
- **큰 제목일수록 얇게** 쓴다. 1.7rem 이상은 굵기 클래스를 생략(=400)하고 `tracking-[-0.02em]`을 준다.
- 위계는 **테두리 2단계**로 표현한다 — 독립 개체는 `surface-strong-border`, 목록 구성원은 `surface-border`.
- hover는 **테두리 승격 · 바탕 변화 · 미세 이동**으로 표현한다(`hover:border-(--surface-strong-border)`, `hover:bg-(--surface-muted)`, `hover:scale-[1.03]`).
- 새 섹션은 **`SectionShell`**, 하위 페이지 머리는 **`PageTitleHero`**로 시작한다.
- 모든 블록은 **대문자 라틴 eyebrow → 한글 제목** 순서로 쌓는다.
- 그림자 색은 **`var(--shadow-strong)`**만 쓴다.
- `bg-(--accent)` 위 글자는 반드시 **`text-(--accent-foreground)`**를 쓴다.
- 이미지는 `next/image`에 **`sizes`를 반드시 명시**하고 비율은 4/3(가로) 또는 2/3(포스터)를 쓴다.
- 모든 애니메이션을 **`useReducedMotion`으로 게이트**한다.
- 버튼류 요소에 **kebab-case `data-testid`**를 붙인다(계약 테스트가 강제).
- 터치 타깃은 **최소 44px**(`min-h-11` / `h-11 w-11`)을 확보한다.

### Don't

- **둥근 모서리를 새로 만들지 않는다.** `rounded-sm/md/lg/xl/2xl/[5px]` 전부 금지. 원형이어야 할 것만 `rounded-full`.
- **hex를 하드코딩하지 않는다.** `#2c3357`, `rgba(0,0,0,0.1)` 직접 사용 금지 — 다크 모드가 깨진다.
- **Tailwind 원시 팔레트(`blue-500`, `slate-100`, `emerald-50` …)를 쓰지 않는다.** 사이트에 무채색 외의 색은 사진뿐이다.
- **큰 제목에 `font-bold`를 주지 않는다.** 한글이 뭉쳐 덩어리가 된다.
- **카드에 기본 그림자를 주지 않는다.** 깊이는 테두리로 만든다.
- **`hover:text-white`를 쓰지 않는다.** `hover:text-(--bg-primary)`를 쓴다.
- **`surface-border` 하나로 인터랙티브 요소의 경계를 알리지 않는다**(대비 1.84:1 — 장식 전용).
- **헤더 높이를 하드코딩하지 않는다.** `var(--public-header-height-*)`를 참조한다.
- **스케일 밖 임의 크기를 새로 만들지 않는다**(`text-[2.8rem]`, `text-[0.95rem]` 등).
- **모바일에서 hover에만 의존해 정보를 노출하지 않는다.** 오버레이는 `max-[768px]:opacity-100`으로 항상 보이게.
- **`(dashboard)` 토큰(`--canvas`, `--ink`, `--hairline` 등)을 공개 사이트로 가져오지 않는다.** 두 그룹은 별도 layout·별도 CSS다.
- **`SectionShell` 없이 섹션 여백을 직접 쓰지 않는다.** 수직 리듬이 무너진다.

---

> 아래 세 섹션은 DESIGN.md 표준 스펙에 없는 **프로젝트 확장**이다.

## Motion (확장)

모션은 **콘텐츠의 등장을 돕는 역할**만 한다. 주의를 끌기 위한 모션은 없다.

### 표준 값

| 상황 | 값 |
| --- | --- |
| 스크롤 등장 (`MotionReveal`) | `opacity 0→1`, `y 18→0`, `duration 0.6`, `ease [0.22, 1, 0.36, 1]` |
| 등장 뷰포트 | `{ once: true, margin: "-10% 0px" }` — **한 번만 재생** |
| 목록 스태거 | `delay = index * 0.04` |
| CSS 전환 (기본) | `transition duration-300` |
| CSS 전환 (색상) | `transition-colors duration-200` |
| 카드 hover 스프링 | `{ type: "spring", damping: 20, stiffness: 260 }` |
| 모바일 메뉴 스프링 | `{ type: "spring", stiffness: 360, damping: 30, mass: 0.62 }` |
| 라이트박스 페이드 | `duration 0.2`, `ease [0.22, 1, 0.36, 1]` |
| 히어로 패럴랙스 | 텍스트 `y 0→-80`, 이미지 `y 0→110` (스크롤 진행률 연동) |

### 규칙

1. **`useReducedMotion` 게이트는 의무다.** 예외 없음. `MotionReveal`은 아예 일반 `<div>`로 폴백하고, 패럴랙스는 `style={undefined}`로 끈다.
2. 스크롤 등장은 **`once: true`** — 스크롤을 되돌릴 때 다시 재생하지 않는다.
3. hover 이동량은 작게: `scale-[1.03]` 또는 `-translate-y-[2px]`~`[5px]`.
4. **`scroll-behavior: smooth`**가 `html`에 전역 적용되어 있다.

> ⚠️ hover 효과가 현재 페이지마다 다르다(`scale-[1.03]` / `scale-[1.02]` / `-translate-y-[5px]` / `-translate-y-[2px]`). 신규 코드는 **미디어 카드 = `hover:scale-[1.03]`**, **목록 행 = `hover:-translate-y-[2px]`** 두 가지만 쓴다.

## Accessibility (확장)

- **포커스 링**: `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--text-primary)`.
  `overflow-hidden` 컨테이너 안에서는 링이 잘리므로 `focus-visible:-outline-offset-2`로 안쪽에 그린다(갤러리 타일 참고).
  어두운 오버레이 위에서는 `outline-white`.
- **터치 타깃 44px**: `min-h-11`(로고·푸터 링크), `h-11 w-11`(햄버거·라이트박스 컨트롤).
- **이미지 `alt`**: 장식 이미지는 `alt=""` + `aria-hidden`, 콘텐츠 이미지는 제목을 그대로.
- **링크 `aria-label`**: 카드 전체가 링크면 `aria-label="{제목} 상세 보기"`.
- **토글 상태**: `aria-pressed`(테마), `aria-expanded`(모바일 메뉴).
- **모달**: `role="dialog"` + `aria-modal="true"` + 포커스 이동/복귀 + 배경 스크롤 잠금 + Esc.
- **라이브 영역**: 라이트박스 카운터는 `aria-live="polite"`.
- **색만으로 정보를 전달하지 않는다** — 내비 활성 상태도 색이 아닌 밑줄로 표시한다.

## Imagery (확장)

- **`next/image`만 사용한다.** raw `<img>` 금지.
- **전역 커스텀 로더**(`features/media/images/cloudflare-image-loader.ts`)가 R2 URL을 Cloudflare Image Transformations로 보낸다. `images.loader: "custom"`이라 `/_next/image` 엔드포인트는 **존재하지 않는다**.
- **`sizes` 필수.** 표준값:
  - 3열 카드: `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`
  - 히어로: `(min-width: 768px) 40vw, 100vw`
  - 갤러리 타일: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw`
- **`priority`는 히어로 이미지와 로고에만.** 나머지는 지연 로드.
- 변환 대상이 아닌 자산(로컬 `/public`, 구글 프로필)은 `shouldUseUnoptimizedImage()`로 판정해 `unoptimized`를 넘긴다.
- `images.deviceSizes` / `imageSizes`는 **Cloudflare 무료 한도(월 5,000 변환)를 위해 축소**해 둔 값이다. 늘리지 말 것.
- 로딩 중 자리는 `bg-(--surface-muted)` + `animate-pulse` 스켈레톤으로 채우되, **`useReducedMotion`일 때 `animate-pulse`를 끈다**.

## 현재 코드와의 차이 (확장)

이 문서는 홈페이지를 기준으로 한 **정답**을 기술한다. 아래는 현재 코드가 그 기준에서 벗어난 지점이며, 해당 파일을 만질 때 함께 정리한다. (지금 당장 일괄 수정하라는 뜻은 아니다.)

| # | 위치 | 현재 | 기준 | 영향 |
| --- | --- | --- | --- | --- |
| 1 | `app/(home)/layout.tsx` | Pretendard를 지정하지만 `@font-face`를 로드하지 않음 (`(dashboard)`만 import) | 공개 사이트도 서브셋 폰트를 로드 | **높음** — 자간·굵기 규칙이 설계대로 재현되지 않음 |
| 2 | `globals.css` `.dark` | `--surface-strong-border: #465162` (2.39:1) | 3:1 이상 (`#5b6779` 이상) | **높음** — 다크에서 버튼 경계가 안 보임 |
| 3 | `about/recruiting/page.tsx` | `bg-blue-50` / `emerald-50` / `slate-100`, `dark:` 없음 | `--status-*` 토큰 | **높음** — 다크 모드에서 칩이 깨짐 |
| 4 | `donate/page.tsx` | `rounded-lg` / `rounded-xl` / `rounded-[5px]` | `{rounded.none}` | 중간 — 사이트에서 유일하게 둥근 페이지 |
| 5 | `_components/attachment-list.tsx` | `rounded-lg` | `{rounded.none}` | 중간 |
| 6 | `about/photographers/generation-members-grid.tsx` | `rounded-2xl`, `rounded-lg` | `{rounded.none}` / `{rounded.full}` | 중간 |
| 7 | `archive/exhibitions/page.tsx` | `shadow-[0_4px_15px_rgba(0,0,0,0.1)]` 하드코딩 | `var(--shadow-strong)` | 중간 — 다크에서 그림자 소실 |
| 8 | `PageTitleHero`, `linktree`, `donate` 제목 | `font-bold` / `font-semibold` | 400 (굵기 클래스 생략) | 중간 — 홈과 하위 페이지의 목소리 불일치 |
| 9 | 히어로·홈 CTA | `hover:text-white` | `hover:text-(--bg-primary)` | 낮음 — 다크에서 대비 저하 |
| 10 | 여러 파일 | `text-[2.8rem]` `[1.75rem]` `[0.95rem]` `[0.9rem]` `[0.85rem]` `[0.8rem]` | 스케일 토큰 | 낮음 |
| 11 | `archive/*`, `linktree` | `max-[1024px]` 등 max-width 질의 | 모바일 우선(min-width) | 낮음 |
| 12 | 여러 파일 | `max-w-300`과 `max-w-[1200px]` 혼용 (같은 값) | `max-w-[1200px]`로 통일 | 낮음 |
