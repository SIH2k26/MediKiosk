"""Shared pytest fixtures for the AI history service."""
import pytest

from app.clients import llm


@pytest.fixture(autouse=True)
def _reset_llm_clients():
    """Drop the cached provider clients around every test.

    ``llm`` memoises its ``AsyncOpenAI`` / ``genai.Client`` instances so the
    connection pool is reused in production. Tests patch those constructors and
    patch ``settings``, so a client cached by an earlier test would otherwise be
    handed back and silently ignore the mock.
    """
    llm._groq_client = None
    llm._gemini_client = None
    yield
    llm._groq_client = None
    llm._gemini_client = None
