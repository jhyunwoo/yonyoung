# Project: Yonyoung Web

A comprehensive management system and public-facing portal for the "Yonyoung" organization, built with a modern Next.js stack.

## Architecture Overview

The project follows a feature-based architecture combined with Next.js App Router conventions.

### Core Directories

- `app/`: Routing, layouts, and page definitions.
  - `(home)/`: Public-facing site.
  - `(dashboard)/`: Management portal (requires authentication).
  - `api/`: Backend API proxy and internal endpoints.
- `features/`: Domain-specific logic, components, and hooks, grouped by feature (e.g., `auth`, `dashboard`, `media`).
- `server/`: Server-only utilities and services.
  - `http/`: API client (`hono-client.ts`) and proxy logic.
  - `observability/`: Structured logging and telemetry.
  - `security/`: Request guards, CSRF protection, and proxy configuration.
- `shared/`: Shared types, contracts, and utilities.
  - `contracts/`: Zod schemas and TypeScript types for API communication.
- `components/ui/`: Base UI components (mostly Shadcn UI based).
- `tests/`: Comprehensive test suite.
  - `unit/`: Unit and component tests using Vitest and React Testing Library.
  - `e2e/`: End-to-end tests using Playwright.

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State & Validation**: Zod (Runtime validation), React Hooks
- **Authentication**: Better-Auth
- **API Communication**: same-origin proxying to an upstream API (`API_BASE_URL`) via `/api/[...path]`
- **Rich Text**: Tiptap
- **Media**: Uppy (Uploader), AWS S3/R2 (Storage)
- **Testing**: Vitest, Playwright
- **Observability**: Structured JSON logging

## Key Conventions & Workflows

### 1. API Contracts First

All API communication is governed by contracts in `shared/contracts/`.

- Use `api-contracts.ts` for TypeScript types.
- Use `api-schemas.ts` for Zod validation schemas.
- Use `honoRequest` from `server/http/hono-client.ts` for server-side API calls.

### 2. API Proxying

All client-side requests to the upstream API must go through the `/api/*` proxy route. This ensures same-origin security, CSRF protection, and allows for centralized request/response manipulation.

### 3. Observability

Use the centralized `logger` from `@/server/observability/logger` for server-side logging. Logs are output as structured JSON.

- `logger.info({ event: "user.login", userId: "..." })`
- `logger.error({ event: "api.failure", error: ... })`

### 4. Testing

- **Unit Tests**: Run with `pnpm test:unit`. Focus on pure logic and individual components.
- **E2E Tests**: Run with `pnpm test:e2e`. Focus on critical user flows and integration.
- **CI**: `pnpm test:ci` runs linting, type-checking, and all tests.

### 5. Development Workflow

- Create a `.env` file based on `README.md`.
- Run `pnpm dev` for local development.
- Adhere to Prettier and ESLint rules (`pnpm format`, `pnpm lint`).

## Building and Running

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Testing

```bash
pnpm test:unit       # Unit tests
pnpm test:e2e        # E2E tests
pnpm test:ci         # Full CI suite
```

### Quality Tools

```bash
pnpm lint            # ESLint
pnpm typecheck       # TypeScript
pnpm format:check    # Prettier check
```
