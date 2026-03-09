"""Shared pytest fixtures for eval runs."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import pytest
from openai import AsyncOpenAI


@dataclass
class EvalConfig:
    agent_base_url: str = "http://localhost:8787"
    openrouter_api_key: str = ""
    judge_model: str = "openai/gpt-4.1-mini"
    langsmith_api_key: str = ""
    langsmith_project: str = "enki-evals"

    @property
    def langsmith_enabled(self) -> bool:
        return bool(self.langsmith_api_key)


@pytest.fixture(scope="session")
def eval_config() -> EvalConfig:
    return EvalConfig(
        agent_base_url=os.environ.get("EVAL_AGENT_URL", "http://localhost:8787"),
        openrouter_api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        judge_model=os.environ.get("EVAL_JUDGE_MODEL", "openai/gpt-4.1-mini"),
        langsmith_api_key=os.environ.get("LANGSMITH_API_KEY", ""),
        langsmith_project=os.environ.get("LANGSMITH_PROJECT", "enki-evals"),
    )


@pytest.fixture(scope="session")
def judge_llm(eval_config: EvalConfig) -> AsyncOpenAI:
    """AsyncOpenAI client pointing at OpenRouter for LLM-as-judge calls."""
    return AsyncOpenAI(
        api_key=eval_config.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )


@pytest.fixture(scope="session")
def langsmith_client(eval_config: EvalConfig):
    """Optional LangSmith client. Returns None if API key is missing.

    Also sets env vars so RAGAS LangChain calls are automatically traced.
    """
    if not eval_config.langsmith_enabled:
        return None

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = eval_config.langsmith_project

    from langsmith import Client

    return Client(api_key=eval_config.langsmith_api_key)
