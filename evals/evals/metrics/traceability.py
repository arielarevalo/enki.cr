"""Programmatic traceability metric — no LLM needed."""

from __future__ import annotations

from evals.client import AgentOutput, Source


def evaluate_traceability(
    output: AgentOutput, sources: list[Source]
) -> float:
    """Check that every citation references a valid source and quoted text.

    For each citation in the output:
    1. The citation's source_id must match an existing source.
    2. The citation's quoted text must appear in that source's text.

    Returns:
        Score between 0.0 and 1.0 (valid citations / total citations).
        Returns 1.0 if there are no citations (nothing to verify).
    """
    if not output.citations:
        return 1.0

    source_map = {s.id: s.text for s in sources}
    valid = 0

    for citation in output.citations:
        source_id = citation.get("source_id", "")
        quoted_text = citation.get("text", "")

        if source_id not in source_map:
            continue

        if quoted_text and quoted_text in source_map[source_id]:
            valid += 1

    return valid / len(output.citations)
