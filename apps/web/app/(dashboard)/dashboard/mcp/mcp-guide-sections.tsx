import type { ApiMcpOverview } from "@yonyoung/contracts/mcp";
import { Badge, Card, CardBody, CardHeader } from "@/app/(dashboard)/_components/ui";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";
import CopyUrlButton from "@/app/(dashboard)/dashboard/mcp/copy-url-button";

/** 외부 제품 화면 이름은 바뀔 수 있다. 바꿀 때 공식 도움말을 다시 확인하고 날짜를 고친다. */
export const GUIDE_VERIFIED_ON = "2026-10-08";

const API_HOST_FOR_SANDBOX = "api.yonyoung.moveto.kr";

const Steps = ({ steps }: { steps: string[] }) => (
  <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-sm text-ink">
    {steps.map((step) => (
      <li key={step}>{step}</li>
    ))}
  </ol>
);

export const ConnectorUrlSection = ({ serverUrl }: { serverUrl: string }) => (
  <Card>
    <CardHeader
      title="커넥터 주소"
      description="Claude나 ChatGPT에 이 주소를 붙여 넣으면 연결됩니다. 로그인은 연영 계정(Google)으로 합니다."
    />
    <CardBody>
      <CopyUrlButton url={serverUrl} />
    </CardBody>
  </Card>
);

export const ClaudeSection = ({ serverUrl }: { serverUrl: string }) => (
  <Card>
    <CardHeader
      title="Claude에 연결하기"
      description="claude.ai, Claude 데스크톱 앱, 모바일 앱에서 같은 연결을 씁니다."
    />
    <CardBody>
      <Steps
        steps={[
          "claude.ai(또는 데스크톱 앱)에서 설정 → 커넥터로 갑니다.",
          "'사용자 지정 커넥터 추가'를 누르고 이름에 '연영', 주소에 위 커넥터 주소를 넣습니다.",
          "추가된 '연영'의 '연결'을 누르면 연영 로그인 화면이 열립니다. Google로 로그인합니다.",
          "연결 허용 화면에서 내 역할과 쓸 수 있는 작업을 확인하고 '허용'을 누릅니다.",
          "대화 입력창의 도구 메뉴에서 '연영'이 켜져 있는지 확인합니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        Team·Enterprise 요금제는 조직 관리자가 먼저 커넥터를 추가해야 할 수 있습니다.
        요금제에 따라 사용자 지정 커넥터를 추가할 수 없으면 Claude 도움말의
        &lsquo;커넥터&rsquo; 항목을 확인해 주세요. 주소:{" "}
        <span className="break-all">{serverUrl}</span>
      </p>
    </CardBody>
  </Card>
);

export const ClaudeFileSection = () => (
  <Card>
    <CardHeader
      title="Claude에서 파일 올리기 설정"
      description="채팅에 첨부한 사진·문서를 그대로 연영에 올리려면 Claude가 파일을 보낼 수 있어야 합니다."
    />
    <CardBody>
      <Steps
        steps={[
          "설정 → 기능(Capabilities)에서 '코드 실행 및 파일 생성'을 켭니다.",
          `같은 화면의 네트워크 접근 설정에서 허용 도메인에 ${API_HOST_FOR_SANDBOX}를 추가합니다.`,
          "이제 '이 사진들을 25기 봄 출사에 올려줘'처럼 요청하면 Claude가 직접 올립니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        이 설정을 못 하는 경우(조직 정책 등) Claude가 10분짜리 업로드 링크를 줍니다.
        링크를 열어 같은 파일을 끌어다 놓으면 됩니다. MCP로는 파일당 100MB까지 올릴 수
        있습니다.
      </p>
    </CardBody>
  </Card>
);

export const ChatGptSection = () => (
  <Card>
    <CardHeader
      title="ChatGPT에 연결하기"
      description="ChatGPT 웹에서 앱(커넥터)으로 추가합니다."
    />
    <CardBody>
      <Steps
        steps={[
          "ChatGPT 설정 → 앱(Apps & Connectors) → 고급 설정에서 개발자 모드를 켭니다.",
          "'만들기'를 누르고 이름에 '연영', MCP 서버 URL에 위 커넥터 주소, 인증에 OAuth를 고릅니다.",
          "연영 로그인 화면에서 Google로 로그인하고 '허용'을 누릅니다.",
          "새 대화에서 + 메뉴의 개발자 모드 도구 중 '연영'을 고릅니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        ChatGPT에서는 채팅에 올린 파일이 자동으로 연영 도구에 전달되므로 따로 설정할 것이
        없습니다. 개발자 모드를 쓸 수 있는 요금제는 OpenAI 도움말에서 확인해 주세요.
      </p>
    </CardBody>
  </Card>
);

export const ToolListSection = ({ overview }: { overview: ApiMcpOverview }) => (
  <Card>
    <CardHeader
      title={`내 역할로 쓸 수 있는 작업 ${overview.tools.length}개`}
      description="역할이 바뀌면 다음 대화부터 목록이 바뀝니다. 오른쪽 문장처럼 말하면 됩니다."
    />
    <CardBody>
      <div className="flex flex-col gap-5">
        {groupToolsByCategory(overview.tools).map((group) => (
          <section key={group.category} aria-labelledby={`mcp-group-${group.category}`}>
            <h3
              id={`mcp-group-${group.category}`}
              className="text-body-sm font-semibold text-ink"
            >
              {group.label}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {group.tools.map((tool) => (
                <li
                  key={tool.name}
                  className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3"
                >
                  <span className="flex items-center gap-2 text-body-sm text-ink md:w-56">
                    {tool.title}
                    {tool.destructive ? <Badge tone="danger">확인 후 실행</Badge> : null}
                  </span>
                  <span className="text-caption text-ink-muted">
                    &ldquo;{tool.examplePrompt}&rdquo;
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </CardBody>
  </Card>
);

export const TroubleshootingSection = () => (
  <Card>
    <CardHeader title="문제 해결" />
    <CardBody>
      <dl className="flex flex-col gap-3 text-body-sm">
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;관리자 승인 후 사용할 수 있습니다&rsquo;가 나와요
          </dt>
          <dd className="text-ink-muted">
            가입 승인이 끝나야 연결할 수 있습니다. 운영진에게 승인을 요청해 주세요.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;현재 역할로는 할 수 없는 작업&rsquo;이라고 해요
          </dt>
          <dd className="text-ink-muted">
            대시보드에서도 할 수 없는 작업입니다. 위 목록에서 내 역할로 가능한 작업을
            확인해 주세요.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">파일 올리기가 실패해요</dt>
          <dd className="text-ink-muted">
            Claude는 위 &lsquo;파일 올리기 설정&rsquo;을 확인하고, 안 되면 Claude가 준
            업로드 링크로 올려 주세요. 100MB가 넘는 파일은 대시보드에서 올려야 합니다.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;연결이 만료되었습니다&rsquo;가 나와요
          </dt>
          <dd className="text-ink-muted">
            30일 동안 쓰지 않았거나 연결을 해제한 경우입니다. Claude·ChatGPT의 커넥터
            설정에서 다시 연결해 주세요.
          </dd>
        </div>
      </dl>
    </CardBody>
  </Card>
);
