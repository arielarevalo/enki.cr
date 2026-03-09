"""Outline agent evaluation tests.

Loads JSON fixtures from evals/fixtures/, calls the agent, and evaluates
output quality using RAGAS metrics + programmatic traceability.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from ragas import EvaluationDataset, SingleTurnSample, evaluate
from ragas.llms import llm_factory
from ragas.metrics.collections import ContextPrecisionWithoutReference, Faithfulness

from evals.client import Source, call_agent
from evals.metrics.custom import (
    coherence_metric,
    format_adherence_metric,
    redundancy_metric,
)
from evals.metrics.traceability import evaluate_traceability

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "evals" / "fixtures"

# Minimum acceptable scores per metric
THRESHOLDS = {
    "faithfulness": 0.7,
    "context_precision": 0.7,
    "coherence": 0.6,
    "redundancy": 0.6,
    "format_adherence": 0.6,
    "traceability": 0.8,
}


def load_fixtures() -> list[dict]:
    """Load all JSON fixture files from the fixtures directory."""
    fixtures = []
    for path in sorted(FIXTURES_DIR.glob("*.json")):
        with open(path) as f:
            fixtures.append(json.load(f))
    return fixtures


fixtures = load_fixtures()


@pytest.mark.eval
@pytest.mark.skipif(not fixtures, reason="No fixture files in evals/fixtures/")
@pytest.mark.parametrize("fixture", fixtures, ids=[f.get("name", str(i)) for i, f in enumerate(fixtures)])
async def test_outline_quality(fixture, eval_config, judge_llm, langsmith_client):
    """Evaluate a single fixture against all metrics."""
    sources = [
        Source(id=s["id"], text=s["text"], label=s.get("label", ""))
        for s in fixture["sources"]
    ]

    output = await call_agent(
        agent=fixture["agent"],
        sources=sources,
        base_url=eval_config.agent_base_url,
        format_instructions=fixture.get("format_instructions", ""),
    )

    assert output.outline_text, "Agent returned empty outline"

    # Build RAGAS sample
    sample = SingleTurnSample(
        user_input=fixture.get("format_instructions", "Generate an outline"),
        response=output.outline_text,
        retrieved_contexts=[s.text for s in sources],
    )
    if fixture.get("reference_outline"):
        sample.reference = fixture["reference_outline"]

    dataset = EvaluationDataset(samples=[sample])

    # Select RAGAS metrics
    ragas_metrics = [
        Faithfulness(),
        ContextPrecisionWithoutReference(),
        coherence_metric,
        redundancy_metric,
        format_adherence_metric,
    ]

    # Run RAGAS evaluation
    eval_kwargs = {
        "dataset": dataset,
        "metrics": ragas_metrics,
        "llm": llm_factory(
            model=eval_config.judge_model,
            client=judge_llm,
        ),
    }

    result = evaluate(**eval_kwargs)
    scores = result.to_pandas().iloc[0].to_dict()

    # Programmatic traceability
    traceability_score = evaluate_traceability(output, sources)
    scores["traceability"] = traceability_score

    # Log scores to LangSmith if configured
    if langsmith_client is not None:
        run_name = f"eval-{fixture.get('name', 'unknown')}"
        for metric_name, score in scores.items():
            if isinstance(score, (int, float)):
                langsmith_client.create_feedback(
                    run_id=None,
                    key=metric_name,
                    score=score,
                    comment=run_name,
                    source_info={"fixture": fixture.get("name", "unknown")},
                )

    # Assert thresholds
    failures = []
    for metric_name, threshold in THRESHOLDS.items():
        score = scores.get(metric_name)
        if score is not None and score < threshold:
            failures.append(
                f"{metric_name}: {score:.2f} < {threshold:.2f}"
            )

    assert not failures, f"Metrics below threshold:\n" + "\n".join(failures)
