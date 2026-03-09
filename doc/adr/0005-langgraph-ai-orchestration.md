# 5. LangGraph for AI Orchestration

## Status

Accepted

## Context

Enki's three agent classes (`OutlineDeepAgent`, `OutlineReactAgent`, `OutlineWorkflowAgent`) need AI orchestration to generate outlines from user-provided sources. Each agent follows a different strategy:

- **Deep**: Linear pipeline (research → analyze → synthesize → format)
- **React**: ReAct loop with iterative reasoning and a finalization step
- **Workflow**: Multi-step pipeline (plan → research → aggregate → critique → revise → format)

Requirements:
- Structured graph execution with well-defined stages
- Checkpoint persistence for resuming across pauses (DO restarts)
- Streaming output compatible with the existing SSE protocol (OpenAI Responses API format)
- LLM provider flexibility via OpenRouter

## Decision

- Use **LangGraph** (`@langchain/langgraph`) for graph-based AI orchestration within each agent class.
- Use **`@langchain/openai`** with `ChatOpenAI` pointed at **OpenRouter's** OpenAI-compatible API (`https://openrouter.ai/api/v1`) for LLM access.
- Implement a **custom `AgentSqlCheckpointSaver`** that extends LangGraph's `BaseCheckpointSaver` and bridges to the Agent SDK's `this.sql` (DO-backed SQLite) for checkpoint persistence.
- Each graph topology is defined in its own module (`graphs/outline-{deep,react,workflow}.ts`) using `OutlineAnnotation` shared state.
- Graph stream output is transformed to SSE via a `stream-adapter` module that maps LangGraph message chunks to the 8-event OpenAI Responses API protocol.

## Consequences

- LangGraph provides structured, debuggable graph execution with built-in state management.
- The custom checkpoint saver stores LangGraph state in DO SQLite, enabling agents to resume from checkpoints after pauses or restarts.
- `@langchain/openai` + OpenRouter decouples the system from any single LLM provider; model selection is a configuration change.
- Bundle size must be monitored — LangGraph and LangChain add significant dependencies. The `nodejs_compat` flag is required.
- Agents gracefully fall back to mock responses when `OPENROUTER_API_KEY` is not configured.
