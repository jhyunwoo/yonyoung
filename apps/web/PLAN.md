# yonyoung-web 코드 품질 및 유지보수성 리팩터링

`yonyoung-web` 저장소를 전체적으로 분석하고, 기존 기능과 사용자 경험을 변경하지 않는 범위에서 코드 품질, 가독성, 타입 안정성, 테스트 가능성, 유지보수성을 크게 향상시키는 리팩터링을 수행하라.

단순히 계획만 작성하지 말고 실제 코드를 수정하고 검증까지 완료하라.

## 최우선 목표

이번 작업의 목표 우선순위는 다음과 같다.

1. 기존 동작의 완전한 보존
2. 코드 책임 분리와 가독성 개선
3. Server/Client Component 경계 개선
4. 도메인별 모듈 경계 명확화
5. 중복 제거
6. TypeScript type safety 강화
7. React Rules 위반 제거
8. 테스트 가능성 향상
9. CI 품질 gate 강화
10. 신규 개발자가 코드를 쉽게 탐색할 수 있는 구조 확립

성능 최적화가 구조 개선 과정에서 자연스럽게 발생하는 것은 좋지만, 이번 작업의 주목적은 유지보수성과 코드 품질이다.

---

## 0. 작업 전 필수 사항

코드를 수정하기 전에 반드시 다음 파일을 읽고 기존 프로젝트 규칙과 아키텍처를 파악하라.

* `CLAUDE.md`
* `README.md`
* `package.json`
* `tsconfig.json`
* `tsconfig.typecheck.json`
* `eslint.config.mjs`
* `next.config.ts`
* `vitest.config.ts`
* `playwright.config.ts`
* `.github/workflows/ci.yml`

그리고 다음 디렉터리를 전체적으로 조사하라.

* `app/`
* `features/`
* `server/`
* `shared/`
* `components/`
* `tests/`

`CLAUDE.md`의 프로젝트 고유 규칙은 일반적인 코딩 스타일보다 우선한다.

특히 다음 기존 동작을 절대 임의로 변경하지 마라.

* API proxy 구조
* Better Auth 인증 흐름
* 권한 검사
* Server Action access scope
* `cacheComponents`
* `use cache`
* `cacheTag`
* `updateTag`
* admin/public cache invalidation 관계
* Cloudflare 이미지 loader
* 이미지 transformation 정책
* CSP/security headers
* presigned upload
* 이미지 dimension 저장
* gallery layout
* attachment 기능
* API request/response contract
* 공개 URL
* dashboard URL
* 테스트에서 사용하는 `data-testid`

주석은 기존 프로젝트 규칙대로 한국어를 사용하라.

불필요한 새 dependency는 추가하지 마라.

React Hook Form, TanStack Query, Zustand 등 새로운 상태/폼 라이브러리는 이번 리팩터링을 위해 도입하지 마라.

현재 React, Next.js, Zod, TypeScript 기반에서 먼저 해결하라.

---

# 1. Baseline 확보

코드 수정 전에 현재 상태를 검증하라.

다음을 실행한다.

```bash
pnpm fonts:check
pnpm lint
pnpm typecheck
pnpm test:unit:coverage
pnpm test:e2e:full
```

baseline에서 실패가 존재한다면 리팩터링으로 인해 발생한 실패와 기존 실패를 구분하여 기록하라.

기존 실패를 리팩터링과 무관하게 임의로 고치지 마라.

추가로 production source의 다음 항목을 조사하라.

* 500줄 이상 파일
* 지나치게 큰 Client Component
* 지나치게 큰 custom hook
* `eslint-disable`
* `as any`
* `as unknown as`
* `@ts-ignore`
* `@ts-expect-error`
* TODO/FIXME
* 반복되는 validation
* 반복되는 error handling
* 반복되는 API orchestration
* mount 시 데이터를 가져오는 `useEffect`
* props/state를 다시 state로 복제하는 Effect
* 지나치게 넓은 barrel export
* 이름과 실제 behavior가 다른 함수
* `utils.ts`, `helpers.ts`, `shared.ts`에 과도하게 모인 로직

이 결과를 바탕으로 실제 수정 우선순위를 결정하되 아래에 명시된 핵심 hotspot은 반드시 조사한다.

---

# 2. Architecture 원칙

현재 저장소에는 이미 다음 구조가 존재한다.

```text
app/
features/
server/
shared/
components/
tests/
```

새로운 architecture paradigm을 도입하지 말고 이 구조를 일관되게 완성하라.

기본 dependency 방향은 다음을 목표로 한다.

```text
app
 ↓
features
 ↓
shared

server
 ↓
shared
```

가능하면 다음 dependency를 제거한다.

```text
shared -> features
shared -> app
features -> app
server -> app
```

`app/`은 주로 다음 책임을 갖게 한다.

* routing
* layout
* metadata
* Server Component composition
* route-specific thin presentation

business/domain logic은 가능한 경우 `features/`로 이동한다.

단, 단일 route에서만 사용되는 작고 순수한 presentation component를 무조건 `features`로 이동시키지 마라.

추상화보다 cohesion을 우선한다.

---

# 3. Server/Client Component 원칙

Next.js App Router의 Server Component 기본 모델을 최대한 활용한다.

다음에만 Client Component를 사용한다.

* state
* user event
* browser API
* React client hook
* animation/interaction

초기 데이터를 가져오기 위해 다음과 같은 패턴을 사용하는 Client Component를 조사한다.

```ts
useEffect(() => {
  loadData();
}, []);
```

Server Component에서 안전하게 가져올 수 있다면 다음 형태로 변경한다.

```text
Server page
  -> fetch/authorize/validate
  -> serializable initial data
  -> Client interactive component
```

특히 다음 영역을 조사하라.

* Activity edit
* Exhibition edit
* Members settings
* Generation settings
* Linktree editor/detail
* 기타 dashboard editor

단, browser-only API가 필요한 로직을 억지로 Server Component로 이동하지 마라.

---

# 4. Admin Write Action 구조 개선

현재 다음 파일을 최우선으로 조사한다.

```text
features/dashboard/actions/admin-write-actions.ts
```

현재 여러 domain write action이 한 파일에 모여 있고 별도 domain action 파일들이 이를 re-export하는 구조라면 이를 수정한다.

최종 목표는 각 domain action 파일이 실제 implementation을 소유하는 것이다.

예:

```text
features/dashboard/actions/
├── admin-write-core.ts
├── activities.ts
├── exhibitions.ts
├── generations.ts
├── attachments.ts
├── linktree.ts
├── recruiting.ts
├── site-settings.ts
└── users.ts
```

`admin-write-core.ts`에는 다음과 같은 truly shared infrastructure만 남긴다.

* writeRequest
* common result type
* shared response handling
* shared access handling

각 domain 파일은 직접 다음을 선언하도록 한다.

```text
create...
update...
delete...
```

각 mutation의 다음 semantics를 반드시 보존한다.

* path
* method
* request schema
* response schema
* accessScope
* cache tags

특히 cache invalidation tag를 하나라도 누락시키지 마라.

필요하면 domain별 cache tag constant를 추출할 수 있지만 지나치게 generic한 CRUD factory를 만들지 마라.

모든 consumer import를 새 domain module로 변경한 뒤 기존 `admin-write-actions.ts`가 필요 없다면 제거한다.

---

# 5. Admin API 구조 개선

다음 파일도 조사한다.

```text
features/dashboard/api/admin-api/resources.ts
```

모든 resource를 하나의 거대한 object에서 관리하는 구조를 domain 단위로 분리할 수 있는지 검토한다.

예:

```text
features/dashboard/api/
├── core/
│   ├── http.ts
│   └── action-results.ts
├── activities.ts
├── exhibitions.ts
├── generations.ts
├── attachments.ts
├── linktree.ts
├── users.ts
├── recruiting.ts
└── site-settings.ts
```

다음처럼 domain context가 드러나는 API를 선호한다.

```ts
activityAdminApi.getById(...)
activityAdminApi.list(...)
activityAdminApi.create(...)
```

단순히 파일 수만 늘어나는 구조라면 분리하지 마라.

각 module은 하나의 cohesive bounded context를 가져야 한다.

---

# 6. Server-side Admin Read Layer 정리

다음 파일을 조사한다.

```text
features/dashboard/cache/admin-dashboard-cache.ts
```

실제 request가 `cache: "no-store"`인데 파일이나 함수 이름이 `Cached`를 포함한다면 이름을 실제 behavior에 맞게 변경한다.

예:

```text
admin-read-service.ts

listAdminActivities
listAdminExhibitions
getAdminDashboardStats
```

오류 발생 시 collection reader가 단순히 `[]`를 반환하여

```text
실제 empty data
```

와

```text
API failure
```

를 구분할 수 없게 만들고 있다면 명시적인 error model로 개선한다.

프로젝트의 기존 `AdminApiError` 또는 discriminated result를 재사용할 수 있는지 먼저 검토한다.

API response는 가능한 경우 기존 Zod schema를 통해 runtime validation하라.

타입 assertion만으로 외부 API 응답을 신뢰하지 마라.

---

# 7. API Contract 구조 개선

다음 파일을 조사한다.

```text
shared/contracts/api-contracts.ts
shared/contracts/api-schemas.ts
```

여러 bounded context가 하나의 거대한 파일에 있다면 domain별로 분리한다.

예:

```text
shared/contracts/api/
├── common.ts
├── audit.ts
├── generations.ts
├── activities.ts
├── exhibitions.ts
├── attachments.ts
├── linktree.ts
├── recruiting.ts
├── site-settings.ts
└── users.ts
```

Zod schema도 동일한 domain 기준으로 분리한다.

현재 API contract와 Zod schema가 동일한 shape를 수동으로 중복 정의하고 있다면, 안전한 domain부터 다음 방식 사용을 검토한다.

```ts
export const apiActivitySchema = z.object({
  ...
});

export type ApiActivity =
  z.infer<typeof apiActivitySchema>;
```

단, TypeScript type과 runtime schema가 의도적으로 다른 경우에는 억지로 통합하지 마라.

contract migration은 domain 하나씩 수행하고 각 단계마다 typecheck와 tests를 실행한다.

API wire format 자체는 절대 변경하지 마라.

---

# 8. Activity / Exhibition Form 리팩터링

다음 파일들을 핵심 hotspot으로 조사한다.

```text
activity-create-form.tsx
activity-edit-form.tsx
exhibition-create-form.tsx
exhibition-edit-form.tsx
```

각 component가 현재 다음 책임을 동시에 가지고 있는지 확인한다.

* field state
* validation
* rich text
* date conversion
* cover image
* detail images
* object URL lifecycle
* image sorting
* file upload
* upload progress
* image dimensions
* API orchestration
* partial failure recovery
* routing
* error UI
* form UI

책임을 적절히 분리하라.

예시 구조:

```text
features/dashboard/activities/
├── model/
│   ├── activity-form.ts
│   └── activity-form.test.ts
├── hooks/
│   ├── use-activity-form.ts
│   └── use-activity-media.ts
├── services/
│   └── save-activity-media.ts
└── ui/
    ├── activity-form-fields.tsx
    ├── activity-media-fields.tsx
    ├── activity-create-form.tsx
    └── activity-edit-form.tsx
```

다음 로직은 가능한 경우 pure function으로 추출하고 unit test를 작성한다.

* validation
* date transformation
* API payload construction
* image order mapping
* uploaded image mapping
* weighted upload progress calculation

기존 `useImageUploadState` 등 이미 존재하는 abstraction을 먼저 재사용하라.

새 duplicate abstraction을 만들지 마라.

Activity와 Exhibition이 동일한 media workflow를 가지고 있다면 truly common한 media primitive만 공유하라.

Activity와 Exhibition 전체 form을 하나의 GenericCMSForm 같은 abstraction으로 합치지 마라.

Create와 Edit orchestration도 의미가 다르므로 억지로 하나의 함수로 합치지 않는다.

---

# 9. Profile Form 리팩터링

다음을 조사한다.

```text
app/(dashboard)/auth/profile/profile-form.tsx
```

수많은 independent `useState`와 다음 책임이 한 component에 몰려 있다면 분리한다.

* form state
* validation
* image selection
* object URL
* upload
* payload mapping
* API request
* redirect
* success/error state
* UI

다음과 같은 구조를 검토한다.

```text
features/auth/profile/
├── model/
│   ├── profile-form.ts
│   └── profile-form.test.ts
├── hooks/
│   └── use-profile-form.ts
└── ui/
    ├── profile-image-field.tsx
    ├── profile-fields.tsx
    └── profile-form.tsx
```

단순한 primitive 계산에 사용되는 불필요한 `useMemo`를 제거한다.

예:

```ts
const canEdit = someBooleanExpression;
```

으로 충분한 경우 `useMemo`를 쓰지 않는다.

`as unknown as ...` 같은 타입 우회가 helper function의 부정확한 type signature 때문에 발생한다면 helper type을 수정한다.

cast를 다른 곳으로 이동시키는 방식으로 숨기지 마라.

---

# 10. Members Grid 리팩터링

다음을 조사한다.

```text
app/(dashboard)/dashboard/settings/members/members-grid.tsx
```

초기 users/generations fetch가 client mount effect에 있다면 Server Component에서 전달하는 구조로 변경할 수 있는지 검토한다.

Client Component에는 다음 interactive state만 남기는 것을 목표로 한다.

* search
* filters
* selection
* bulk role update
* confirmation state

UI는 필요에 따라 다음과 같이 분리한다.

```text
MembersGrid
├── MemberFilters
├── MemberBulkToolbar
├── MemberList
└── MemberCard
```

기존 `useDeferredValue`처럼 실제 사용자 입력 responsiveness를 위해 의미 있는 React API는 유지한다.

selection과 filtering logic은 pure function 또는 dedicated hook으로 추출하여 테스트 가능하게 만든다.

---

# 11. Generation Management 리팩터링

다음을 조사한다.

```text
use-generation-management.ts
```

shared source of truth를 유지해야 한다는 기존 설계 의도를 존중하라.

단순히 여러 independent hook으로 분해하여 state를 중복시키지 마라.

대신 필요하면 다음과 같이 state/logic/commands를 분리한다.

```text
generation-management-reducer.ts
generation-management-selectors.ts
use-generation-commands.ts
use-generation-assignment.ts
```

특히 다음 패턴을 조사한다.

```ts
useEffect(() => {
  setSomething(derivedValue);
}, [derivedValue]);
```

props/state에서 직접 계산할 수 있는 derived state라면 Effect를 제거한다.

form draft처럼 진짜 독립적인 편집 상태가 필요한 경우에는 의도적으로 state를 유지한다.

---

# 12. Site Header 리팩터링

다음을 조사한다.

```text
app/(home)/_components/site-header.tsx
```

다음 concern을 분리할 수 있는지 검토한다.

* scroll state
* body scroll lock
* mobile navigation
* theme mode
* system theme subscription
* localStorage
* DOM dataset synchronization
* theme switch UI
* animation

필요하다면 다음 정도의 hook/component를 만들 수 있다.

```text
use-header-scroll-state
use-body-scroll-lock
use-theme-mode

site-header
site-header-mobile-nav
site-header-theme-switcher
```

browser API subscription의 source of truth 모델이 더 단순해지는 경우 React `useSyncExternalStore`를 검토할 수 있지만, 단순히 최신 API라는 이유만으로 도입하지 마라.

기존 hydration/theme-init 동작과 flash prevention을 반드시 보존한다.

---

# 13. React ESLint 규칙 복구

현재 ESLint에서 전역적으로 꺼 둔 다음 규칙을 조사한다.

```text
react-hooks/set-state-in-effect
react-hooks/purity
react-hooks/refs
```

최종 목표는 global `off` 제거다.

처음에는 필요하면 `warn`으로 변경한다.

각 violation을 직접 조사하고 다음 유형으로 분류한다.

* unnecessary derived state
* valid external synchronization
* browser subscription
* DOM measurement
* invalid ref access
* impure render
* lifecycle workaround

derived state는 render 단계로 옮긴다.

interaction 때문에 실행되는 side effect는 가능하면 event handler에서 수행한다.

external system과 실제 synchronization하는 Effect는 유지한다.

정말 불가피한 경우에만 한 줄 또는 좁은 범위의 ESLint disable을 허용하고, 그 이유를 한국어 주석으로 명시한다.

프로젝트 전체 rule disable은 최종적으로 제거한다.

lint error를 없애기 위해 동작을 바꾸거나 dependency array를 임의로 수정하지 마라.

---

# 14. TypeScript strictness 강화

현재 `strict: true`를 유지한다.

다음 option을 각각 독립적인 단계로 적용할 수 있는지 검토한다.

```json
{
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true
}
```

각 option을 하나씩 켜고 발생한 error를 실제 runtime semantics에 맞게 수정한다.

다음 방식은 금지한다.

```ts
value!
value as Something
value as unknown as Something
```

를 단순히 type checker를 통과시키기 위한 용도로 추가하는 것.

API contract 정리 후에는 다음도 평가한다.

```json
{
  "exactOptionalPropertyTypes": true
}
```

다만 optional API payload에 광범위한 영향이 있다면 별도 단계로 남기고 무리하게 이번 변경에 포함하지 않아도 된다.

`allowJs`가 실제 compilation에 필요한지도 조사하되 config cleanup을 위한 config cleanup은 하지 마라.

---

# 15. Typed ESLint 도입

현재 설치된 `typescript-eslint`를 활용한다.

처음부터 모든 strict config를 켜지 마라.

다음 단계로 도입한다.

```text
1. recommendedTypeChecked
2. violations 수정
3. stylisticTypeChecked 검토
4. 유용한 strict rule 개별 추가
```

특히 다음 종류의 오류를 잡을 수 있도록 한다.

* floating Promise
* Promise misuse
* unnecessary conditions
* unsafe member access
* unsafe assignment
* exhaustive discriminated union handling
* inconsistent type imports

lint performance가 크게 악화되는 경우 원인을 측정한 뒤 설정한다.

---

# 16. Import Boundary 자동화

코드 이동이 끝난 이후 ESLint의 `no-restricted-imports` 등을 이용해 architecture boundary를 자동화할 수 있는지 검토한다.

최소한 다음 잘못된 dependency는 가능한 한 CI에서 잡히게 한다.

```text
shared -> app
shared -> features
features -> app
server -> app
```

단 기존 코드를 먼저 올바른 위치로 이동한 후 rule을 활성화한다.

rule을 먼저 켜고 수백 개의 exception을 만드는 방식은 사용하지 마라.

server-only module에는 기존 `server-only` boundary를 적극 활용한다.

---

# 17. Naming과 Error Model

이름은 실제 behavior를 표현해야 한다.

예:

```text
Cached라는 이름인데 no-store
```

처럼 오해를 만드는 이름은 수정한다.

다음 네이밍을 피한다.

```text
utils.ts
helpers.ts
shared.ts
common.ts
manager.ts
service.ts
```

단, 실제로 해당 의미가 명확한 경우는 예외다.

함수 이름만 보고 side effect와 역할을 이해할 수 있게 한다.

에러를 빈 배열이나 null로 변환하여

```text
empty
```

와

```text
failure
```

를 구분할 수 없게 만드는 패턴을 제거한다.

---

# 18. Test 전략

리팩터링으로 component에서 추출되는 business logic에는 unit test를 추가한다.

우선 다음을 테스트한다.

* form validation
* DTO mapping
* date conversion
* upload progress
* image ordering
* profile payload
* member filtering
* member selection
* generation reducer
* generation selectors
* API parser
* error/result transformation

Vitest coverage scope에 새로 추출된 중요한 pure modules를 추가한다.

기존 threshold를 낮추지 마라.

테스트를 통과시키기 위해 테스트를 삭제하거나 assertion을 약하게 만들지 마라.

Playwright에서는 기존 사용자가 보는 behavior를 유지한다.

프로젝트 규칙상 필요한 `data-testid`를 제거하지 마라.

기존 E2E mock API의 `server.ts`에 새 domain handler를 계속 누적시키지 말고 기존 프로젝트 규칙에 맞춰 domain handler module로 분리한다.

---

# 19. 과도한 추상화 금지

다음 리팩터링은 하지 마라.

* 모든 CRUD를 generic factory 하나로 만들기
* 모든 form을 GenericForm 하나로 만들기
* 모든 state를 Context로 옮기기
* 모든 fetch를 custom hook으로 추상화하기
* 단순 JSX를 의미 없이 수십 개 파일로 나누기
* 단순 boolean 계산에 useMemo 추가하기
* useCallback을 습관적으로 추가하기
* 새로운 state management library 추가
* 새로운 form library 추가
* 새로운 fetching library 추가
* line count만 맞추기 위한 분할

중복 제거보다 명확한 domain semantics를 우선한다.

"두 군데가 비슷하다"는 이유만으로 abstraction을 만들지 말고, 동일한 변경 이유를 가진 코드만 공유한다.

---

# 20. 파일 크기 정책

프로젝트의 기존 목표인 파일당 500줄 이하를 존중한다.

그러나 500줄을 hard rule로 맞추기 위해 의미 없는 분할을 하지 마라.

다음 우선순위로 분리한다.

1. 서로 다른 책임
2. 독립적으로 테스트 가능한 로직
3. 독립적으로 변경될 가능성이 높은 로직
4. Server/Client boundary
5. 재사용되는 presentation
6. 마지막으로 line count

특히 새로 수정하는 대형 Client Component는 가능한 경우 500줄 미만이 되도록 한다.

---

# 21. 단계별 검증

큰 변경을 한꺼번에 하지 마라.

각 논리적 phase가 끝날 때 최소한 다음을 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

Server/Client boundary, routing, API, upload, cache behavior에 영향을 주는 phase 뒤에는 관련 Playwright test도 실행한다.

전체 작업 마지막에는 반드시:

```bash
pnpm fonts:check
pnpm lint
pnpm typecheck
pnpm test:unit:coverage
pnpm test:e2e:full
```

을 실행한다.

가능하다면 production build도 별도로 확인한다.

---

# 22. 변경 안전성

리팩터링 중 다음 동작의 regression이 발생하지 않는지 특히 검증한다.

* 로그인
* profile setup
* profile edit
* dashboard authorization
* generation management
* member role update
* activity create/edit/delete
* activity image upload/order/delete
* exhibition create/edit/delete
* exhibition image upload/order/delete
* attachments
* linktree
* site settings
* recruiting settings
* public archive
* gallery
* lightbox
* theme switching
* desktop/mobile navigation
* image CDN
* public cache invalidation

API request shape나 URL을 바꾸지 않는다.

---

# 23. 문서 업데이트

실제 구조가 변경되면 `CLAUDE.md`를 반드시 업데이트한다.

특히 다음을 실제 코드와 일치시키라.

* action architecture
* API module architecture
* contract locations
* Server/Client data-fetching rule
* import dependency rule
* testing rule

필요하다면 별도의 `docs/architecture.md`를 만들 수 있다.

단순히 당연한 내용을 장황하게 적지 말고 신규 개발자가 다음 질문에 답할 수 있게 작성한다.

```text
새 dashboard domain은 어디에 만드는가?
읽기 API는 어디에 두는가?
쓰기 action은 어디에 두는가?
Zod contract는 어디에 두는가?
Server Component에서 데이터를 어떻게 읽는가?
Client Component에는 무엇을 남기는가?
cache tag는 어디에서 invalidation하는가?
```

---

# 24. 완료 조건

최종적으로 다음 조건을 만족하는지 확인하라.

* 기존 기능 regression 없음
* 기존 API contract 유지
* 기존 auth behavior 유지
* 기존 cache invalidation 유지
* 기존 CSP/image behavior 유지
* `admin-write-actions.ts` God Module 제거
* domain action이 실제 implementation 소유
* API/contract 모듈의 책임이 명확해짐
* 대형 Client Component 책임 분리
* Server Component에서 가능한 initial fetching은 server로 이동
* global React hooks lint disable 제거 또는 최대한 축소
* 새 `any` 없음
* 새 불필요한 `unknown as` cast 없음
* TypeScript strictness 개선
* business logic unit tests 증가
* 기존 coverage threshold 유지
* lint 통과
* typecheck 통과
* unit tests 통과
* E2E 통과
* 프로젝트 문서와 실제 architecture 일치

---

# 25. 최종 보고

작업이 끝난 뒤 다음 형식으로 결과를 보고하라.

## Architecture

변경 전 문제와 변경 후 구조를 설명한다.

## Major Refactors

가장 중요한 리팩터링과 그 이유를 파일 단위로 설명한다.

## Server/Client Boundary

Client에서 Server로 이동한 데이터 fetching과 남겨 둔 Client state를 설명한다.

## Type Safety

추가된 TypeScript/ESLint rule과 발견 및 제거한 unsafe pattern을 설명한다.

## Testing

추가/수정된 unit/component/E2E test를 설명한다.

## Metrics

가능하면 다음 before/after를 비교한다.

* 500줄 이상 production files
* global ESLint disables
* unsafe casts
* tested pure modules
* 주요 hotspot file line counts

## Validation

실행한 모든 검증 command와 결과를 명시한다.

## Remaining Technical Debt

이번 작업에서 의도적으로 남긴 문제와 이유를 명시한다.

중요: 계획만 작성한 뒤 멈추지 말고, baseline 분석 이후 실제 리팩터링과 테스트까지 수행하라. 다만 작업 중 기존 동작을 확신할 수 없는 부분에서는 임의로 behavior를 변경하지 말고 현재 behavior와 tests를 보존하는 쪽을 선택하라.
