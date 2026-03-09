"""HTTP client for calling outline agents and parsing SSE responses."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import AsyncIterator

import httpx


@dataclass
class Source:
    id: str
    text: str
    label: str = ""


@dataclass
class AgentOutput:
    outline_text: str
    citations: list[dict]
    raw_events: list[dict] = field(default_factory=list)


async def parse_sse_stream(response: httpx.Response) -> AsyncIterator[dict]:
    """Async generator yielding parsed SSE events from an httpx response."""
    buffer = ""
    async for chunk in response.aiter_text():
        buffer += chunk
        while "\n\n" in buffer:
            event_str, buffer = buffer.split("\n\n", 1)
            data_lines = []
            for line in event_str.strip().splitlines():
                if line.startswith("data: "):
                    data_lines.append(line[6:])
            if data_lines:
                raw = "\n".join(data_lines)
                try:
                    yield json.loads(raw)
                except json.JSONDecodeError:
                    yield {"raw": raw}


async def call_agent(
    agent: str,
    sources: list[Source],
    base_url: str,
    *,
    format_instructions: str = "",
    timeout: float = 120.0,
) -> AgentOutput:
    """POST to an outline agent and collect the SSE response.

    Args:
        agent: Agent type — "deep", "react", or "workflow".
        sources: Source documents to include in the request.
        base_url: Agent worker base URL.
        format_instructions: Optional formatting instructions for the outline.
        timeout: Request timeout in seconds.

    Returns:
        Parsed AgentOutput with outline text, citations, and raw events.
    """
    session_id = f"session-{uuid.uuid4()}"
    url = f"{base_url}/agents/{agent}/{session_id}"

    payload = {
        "sources": [
            {"id": s.id, "text": s.text, "label": s.label} for s in sources
        ],
    }
    if format_instructions:
        payload["format_instructions"] = format_instructions

    events: list[dict] = []
    outline_text = ""
    citations: list[dict] = []

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream"},
        ) as response:
            response.raise_for_status()
            async for event in parse_sse_stream(response):
                events.append(event)

                # Extract outline from response.output_text.done event
                if event.get("type") == "response.output_text.done":
                    outline_text = event.get("text", "")

                # Collect citations if present
                if event.get("type") == "citations":
                    citations = event.get("citations", [])

    return AgentOutput(
        outline_text=outline_text,
        citations=citations,
        raw_events=events,
    )
