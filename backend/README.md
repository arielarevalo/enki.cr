# enki-api

Backend Worker for Enki, serving the management API and outline processing pipeline on Cloudflare Workers.

## Architecture

Four-layer vertical-slice architecture:

| Layer | Purpose |
|-------|---------|
| **Presentation** | HTTP handlers (`*.handler.ts`) parse requests, validate input, return responses |
| **Application** | Services (`*.service.ts`) orchestrate business logic and coordinate between layers |
| **Domain** | Types and interfaces (`*.types.ts`) define the core domain model |
| **Persistence** | Repositories (`d1-*.repository.ts`) handle D1 database access via Drizzle ORM |

Each feature (agents, keys, outline) is organized as a vertical slice containing its own handler, service, repository, and types.

## Prerequisites

- Node.js 22
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account with D1 database provisioned

## Setup

```bash
npm install
npm run types
```

## Development

```bash
npm run dev
```

Starts a local Wrangler dev server with bindings to a local D1 database.

## Testing

```bash
npm test                # all tests
npm run test:unit       # unit tests only
npm run test:integration # integration tests only
npm run test:e2e        # E2E tests (requires ADMIN_KEY env var)
```

E2E tests use a Postman/Newman collection against a live deployment. Set `ADMIN_KEY` to a valid admin API key before running.

## Deployment

Automatic via GitHub Actions on push to `main` (when `backend/**` files change). Three-stage pipeline:

1. **test** -- type-check and run unit/integration tests
2. **deploy** -- deploy to Cloudflare via Wrangler
3. **e2e** -- run Postman collection against the live deployment

Manual deployment: `npm run deploy`

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/admin/agents` | Admin | List available agents |
| GET | `/api/admin/agents/active` | Admin | Get the currently active agent |
| PUT | `/api/admin/agents/active` | Admin | Set the active agent |
| POST | `/api/admin/keys` | Admin | Create a new client API key |
| GET | `/api/admin/keys` | Admin | List all API keys |
| DELETE | `/api/admin/keys/:id` | Admin | Revoke an API key |
| POST | `/api/outline/process` | Client/Admin | Process sources into an outline (SSE stream) |

All authenticated endpoints expect a `Bearer` token in the `Authorization` header. Admin endpoints require an admin key; the outline endpoint accepts either client or admin keys.

## Project Structure

```
backend/
  src/
    index.ts                 # Worker entrypoint
    app.ts                   # Dependency wiring
    router.ts                # HTTP routing
    agents/                  # Agent management slice
      agent-provider.ts      # AgentProvider interface
      agent.types.ts         # AgentInfo, ProcessRequest types
      agents.handler.ts      # Admin agent endpoints
      cloudflare-agent-provider.ts
    infrastructure/          # Cross-cutting concerns
      auth.ts                # Bearer token authentication
      cors.ts                # CORS handling
      logger.ts              # Structured logging
      settings.repository.ts # Settings repository interface
      d1-settings.repository.ts
      sse-validation.ts      # SSE stream validation
    keys/                    # API key management slice
      key-repository.ts      # KeyRepository interface
      key.service.ts         # Key creation, listing, revocation
      key.types.ts           # Key domain types
      keys.handler.ts        # Admin key endpoints
      d1-key.repository.ts
    outline/                 # Outline processing slice
      outline.handler.ts     # POST /api/outline/process
      outline.service.ts     # Agent invocation orchestration
    persistence/
      schema.ts              # Drizzle ORM schema (api_keys, settings)
    shared/
      errors.ts              # Error response helpers
  tests/
    unit/                    # Unit tests (vitest)
    integration/             # Integration tests (vitest)
    e2e/                     # E2E tests (Postman/Newman)
  wrangler.jsonc             # Worker configuration
```
