# 4. React Frontend with Vite

Date: 2026-03-08

## Status

Accepted

## Context

The enki.cr landing page was a single static HTML file with inline CSS and JavaScript. We needed an interactive multi-state modal in the hero section for API key validation, source collection, processing visualization, SSE event streaming, and Markdown result display using assistant-ui React primitives.

Static HTML cannot support the component composition, state management, and runtime integration required by assistant-ui (`ThreadPrimitive`, `MessagePrimitive`, `AssistantRuntimeProvider`).

## Decision

Migrate the frontend from static HTML to Vite + React while preserving the existing design, deploy model, and visual identity:

- **Vite** as the build tool — minimal config, outputs static `index.html` + `assets/` to `dist/`
- **React 19** with assistant-ui headless primitives — no Tailwind, no shadcn; custom CSS matching the existing dark theme
- **CSS transitions** for modal state morphing — no animation libraries
- **Single modal shell** (`EnkiModal`) with `useReducer` managing 5 states: apiKey, sources, processing, streaming, result
- **Mock adapter pattern** — `ChatModelAdapter` backed by fake data, swappable with real backend later
- **Two-column hero layout** — flex row with text (~60%) left and modal (~40%) right

### Infrastructure Impact

- **Terraform** (`infra/frontend.tf`): No changes. The `cloudflare_pages_project` already ignores `deployment_configs`.
- **GitHub Actions** (`deploy-frontend.yml`): Added Node.js setup and `npm ci && npm run build` step. Deploy path changed from `frontend/` to `frontend/dist/`.
- **Cloudflare Pages**: No config changes. Vite output is standard static files.

No new cloud resources (Workers, KV, D1, R2) are required.

## Consequences

- Frontend now requires a build step (`npm run build`) before deployment
- Developers need Node.js 22+ installed for local development
- The `frontend/dist/` directory is the deploy artifact (not `frontend/` directly)
- SVG background generators are extracted to TypeScript but run as vanilla DOM manipulation (not React-rendered) to preserve deterministic seeded output
- The mock adapter can be replaced with a real `ChatModelAdapter` pointing to the `enki-api` Worker without changing any UI components
