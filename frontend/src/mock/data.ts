export const mockEvents = [
  "Initializing analysis pipeline...",
  "Fetching source content from provided URLs...",
  "Source 1: Retrieved 2,847 tokens from document",
  "Source 2: Retrieved 5,123 tokens from API documentation",
  "Source 3: Retrieved 1,456 tokens from repository README",
  "Running semantic chunking (512-token windows, 64-token overlap)...",
  "Generated 18 chunks across 3 sources",
  "Building vector embeddings for chunk retrieval...",
  "Embeddings complete — 18 vectors indexed",
  "Constructing analysis prompt with retrieved context...",
  "Sending to model: claude-sonnet-4-6 (8,192 max output tokens)...",
  "Streaming response from model...",
];

export const mockFinalMarkdown = `# Analysis Report

## Summary

Based on the provided sources, here is a comprehensive analysis of the architecture and key findings.

### Key Findings

1. **Modular Architecture** — The system uses a clean separation between infrastructure provisioning (Terraform) and application deployment (Wrangler), following infrastructure-as-code best practices.

2. **Durable Objects Pattern** — Stateful agents are implemented as Cloudflare Durable Objects, providing:
   - Per-instance SQLite storage
   - Deterministic session routing via \`getByName()\`
   - Automatic hibernation and wake-up

3. **Event-Driven Processing** — The pipeline processes sources through a multi-stage workflow:
   \`\`\`
   Ingest → Chunk → Embed → Retrieve → Generate
   \`\`\`

### Recommendations

- Consider adding **retry logic** with exponential backoff for source fetching
- Implement **streaming progress** indicators for long-running analysis tasks
- Add **caching layer** (Cloudflare KV) for frequently accessed source content

### Metrics

| Metric | Value |
|--------|-------|
| Sources processed | 3 |
| Total tokens | 9,426 |
| Chunks generated | 18 |
| Processing time | 4.2s |
| Model latency | 2.8s |

## Next Steps

The analysis pipeline is ready for production deployment. See the architectural decision records for detailed rationale behind each design choice.
`;
