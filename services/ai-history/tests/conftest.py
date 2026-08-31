"""Shared pytest fixtures for the AI history service."""
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.clients import llm


@pytest.fixture(autouse=True)
def _reset_llm_clients():
    """Drop the cached provider clients around every test."""
    llm._groq_client = None
    llm._gemini_client = None
    yield
    llm._groq_client = None
    llm._gemini_client = None


@pytest.fixture
def mocker():
    """Lightweight mocker fixture compatible with unittest.mock."""
    active_patches = []

    class Mocker:
        def patch(self, target, new=None, **kwargs):
            if new is not None:
                p = patch(target, new, **kwargs)
            else:
                p = patch(target, **kwargs)
            active_patches.append(p)
            return p.start()

        def patch_object(self, target, attribute, new=None, **kwargs):
            if new is not None:
                p = patch.object(target, attribute, new, **kwargs)
            else:
                p = patch.object(target, attribute, **kwargs)
            active_patches.append(p)
            return p.start()

        def AsyncMock(self, *args, **kwargs):
            return AsyncMock(*args, **kwargs)

        def MagicMock(self, *args, **kwargs):
            return MagicMock(*args, **kwargs)

    yield Mocker()
    for p in reversed(active_patches):
        try:
            p.stop()
        except RuntimeError:
            pass
