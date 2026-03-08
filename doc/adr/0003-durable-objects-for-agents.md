# 3. Durable Objects for Agents

## Status

Accepted

## Context

Enki has three planned AI agents (outline-deep, outline-react, outline-workflow) that need stateful execution on Cloudflare. Each agent maintains conversation history, graph state, and tool execution results across requests. The [cloudflare-langgraph](https://github.com/threepointone/cloudflare-langgraph) pattern demonstrates how to run LangGraph-style agents as Durable Objects.

## Decision

- **Single `enki-agents` Worker** exporting three DO classes: `OutlineDeepAgent`, `OutlineReactAgent`, `OutlineWorkflowAgent`.
- **SQLite storage** for each DO instance with a shared schema: `messages` (conversation history), `state` (key-value graph state), `tool_results` (tool execution tracking).
- **`getByName(sessionId)`** for deterministic routing to resumable sessions.
- **Alarms** for session timeout and cleanup.
- **DO bindings and migrations** are managed in `agents/wrangler.jsonc` (Wrangler's domain), not Terraform. Terraform only provisions the Worker script resource.

## Consequences

- All agents share one deployment pipeline — a single `wrangler deploy` in `agents/`.
- Cross-DO communication is free within the same Worker (no network hop).
- Adding a new agent means adding a DO class export and a wrangler migration entry, not a new Worker.
- SQLite storage is co-located with the DO instance, providing low-latency reads/writes but no cross-region replication.
