"""Custom RAGAS AspectCritic metrics for outline evaluation."""

from ragas.metrics._aspect_critic import AspectCritic

coherence_metric = AspectCritic(
    name="coherence",
    definition=(
        "Does the outline have a logical structure? Sections should flow "
        "naturally, with related topics grouped together and a clear "
        "progression from introduction to conclusion."
    ),
)

redundancy_metric = AspectCritic(
    name="redundancy",
    definition=(
        "Does the outline avoid repeating the same concepts under different "
        "headings? A high score means no redundancy — each section covers "
        "distinct content without overlap."
    ),
)

format_adherence_metric = AspectCritic(
    name="format_adherence",
    definition=(
        "Does the outline follow the structural formatting instructions "
        "provided (e.g., Roman numerals for top-level headings, specific "
        "bullet counts, nesting depth)? A high score means the output "
        "matches the requested format precisely."
    ),
)
