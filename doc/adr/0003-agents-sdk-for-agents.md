# 3. Cloudflare Agents SDK for AI Agents

## Status

Accepted (supersedes original Durable Objects approach)

## Context

Enki has three planned AI agents (outline-deep, outline-react, outline-workflow) that need stateful execution on Cloudflare. Each agent maintains conversation history, graph state, and tool execution results across requests. The **Cloudflare Agents SDK** (`agents` package) provides a higher-level framework on top of Durable Objects with built-in state management, routing, and scheduling. Internally, each agent wraps a **LangGraph** workflow for AI orchestration logic.

Agents are consumed over **standard HTTP** with **SSE** for streaming responses. This avoids coupling inter-component communication to Cloudflare-specific primitives (RPC bindings, `@callable()`, WebSockets), keeping the architecture portable.

## Decision

- **Single `enki-agents` Worker** exporting three Agent classes: `OutlineDeepAgent`, `OutlineReactAgent`, `OutlineWorkflowAgent`.
- Each class **extends `Agent<Env, State>`** from the `agents` package and wraps a LangGraph workflow internally.
- **State management** via `this.setState()`/`this.state` for reactive state and `this.sql` for structured storage.
- **Routing** via `routeAgentRequest()` for deterministic, session-based dispatch.
- **HTTP + SSE** for all inter-component communication — no Cloudflare-specific RPC or WebSocket protocols.
- **Agent bindings and migrations** are managed in `agents/wrangler.jsonc` (Wrangler's domain), not Terraform. Terraform only provisions the Worker script resource.

## Consequences

- The Agents SDK abstracts Durable Object lifecycle, state management, and streaming.
- LangGraph handles AI orchestration (graph state, tool execution, conversation flow).
- HTTP + SSE keeps communication portable — the backend and any future consumers talk to agents via plain HTTP.
- All agents share one deployment pipeline — a single `wrangler deploy` in `agents/`.
- Adding a new agent means adding an Agent class export, a binding, and a migration entry in `agents/wrangler.jsonc`.
