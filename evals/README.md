# Enki Evaluation Bench

Evaluation framework for Enki outline agents using [RAGAS](https://docs.ragas.io/) (LLM-as-judge metrics) and [LangSmith](https://smith.langchain.com/) (observability/tracing).

## Setup

```bash
cd evals
uv sync
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EVAL_AGENT_URL` | No | `http://localhost:8787` | Agent worker base URL |
| `OPENROUTER_API_KEY` | Yes (for evals) | — | OpenRouter API key for LLM judge |
| `EVAL_JUDGE_MODEL` | No | `openai/gpt-4.1-mini` | Model for LLM-as-judge metrics |
| `LANGSMITH_API_KEY` | No | — | LangSmith API key (enables tracing) |
| `LANGSMITH_PROJECT` | No | `enki-evals` | LangSmith project name |

Tracing is automatic when `LANGSMITH_API_KEY` is set — RAGAS uses LangChain internally, and setting `LANGCHAIN_TRACING_V2=true` (done automatically by the test fixtures) captures all LLM judge calls.

## Running Evals

```bash
# Run all eval tests (requires fixtures in evals/fixtures/)
uv run pytest tests/ -v -m eval

# Run all tests including non-eval
uv run pytest tests/ -v
```

## Metrics

### RAGAS Built-in
- **Faithfulness** — Every claim grounded in sources, no hallucinations
- **Context Precision** — Referenced sources relevant to claims made

### Custom RAGAS (AspectCritic)
- **Coherence** — Logically structured outline
- **Redundancy** — No repeated concepts under different headings
- **Format Adherence** — Follows structural instructions

### Programmatic
- **Traceability** — Citations match 1:1 with source text

## Adding Fixtures

Create JSON files in `evals/fixtures/`:

```json
{
  "name": "basic-two-sources",
  "agent": "deep",
  "sources": [
    { "id": "src-1", "text": "...", "label": "PDF extract" },
    { "id": "src-2", "text": "...", "label": "Video transcript" }
  ],
  "format_instructions": "Use Roman numerals for top-level headings",
  "reference_outline": "Optional reference for recall checking"
}
```

Fields:
- `name` — Unique identifier for the test case
- `agent` — Agent type: `deep`, `react`, or `workflow`
- `sources` — List of source documents with `id`, `text`, and optional `label`
- `format_instructions` — Optional formatting instructions
- `reference_outline` — Optional reference for context recall metric
