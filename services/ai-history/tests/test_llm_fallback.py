import pytest

from app.clients.llm import (
    LLMClient,
    LLMNotConfiguredError,
    LLMUnavailableError,
)
from app.config import settings

SCHEMA = {"type": "object", "properties": {"status": {"type": "string"}}}


def _gemini_returning(text):
    async def _generate(*args, **kwargs):
        class MockResponse:
            pass

        response = MockResponse()
        response.text = text
        return response

    return _generate


@pytest.fixture
def mock_llm_providers(mocker):
    groq_mock = mocker.patch('app.clients.llm.AsyncOpenAI')
    gemini_mock = mocker.patch('app.clients.llm.genai.Client')
    mocker.patch('app.clients.llm.settings.groq_api_key', 'test_key')
    mocker.patch('app.clients.llm.settings.google_gemini_api_key', 'test_key')
    return groq_mock, gemini_mock


def _groq_returning(groq_mock, content):
    """Wire the mocked Groq client to return ``content`` as the message body."""
    instance = groq_mock.return_value

    async def _create(*args, **kwargs):
        class Wrapper:
            pass

        message, choice, completion = Wrapper(), Wrapper(), Wrapper()
        message.content = content
        choice.message = message
        completion.choices = [choice]
        return completion

    instance.chat.completions.create = _create
    return instance


@pytest.mark.asyncio
async def test_llm_fallback_to_gemini(mock_llm_providers):
    groq_mock, gemini_mock = mock_llm_providers

    # Setup Groq to fail
    groq_instance = groq_mock.return_value
    groq_instance.chat.completions.create.side_effect = Exception("Groq is down")

    # Setup Gemini to succeed
    gemini_mock.return_value.aio.models.generate_content = _gemini_returning('{"status": "ok"}')

    result, model = await LLMClient.complete_json(
        system="System", user="User", schema=SCHEMA, schema_name="Test"
    )

    assert result == {"status": "ok"}
    assert model == settings.gemini_fallback_model
    # Section J: one attempt plus one retry before the provider is abandoned.
    assert groq_instance.chat.completions.create.call_count == 2


@pytest.mark.asyncio
async def test_groq_retries_then_succeeds(mock_llm_providers):
    """A transient Groq failure must not reach Gemini at all."""
    groq_mock, gemini_mock = mock_llm_providers
    groq_instance = groq_mock.return_value

    calls = {"n": 0}

    async def _create(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise Exception("rate limited")

        class Wrapper:
            pass

        message, choice, completion = Wrapper(), Wrapper(), Wrapper()
        message.content = '{"status": "recovered"}'
        choice.message = message
        completion.choices = [choice]
        return completion

    groq_instance.chat.completions.create = _create

    result, model = await LLMClient.complete_json(
        system="System", user="User", schema=SCHEMA, schema_name="Test"
    )

    assert result == {"status": "recovered"}
    assert model == settings.groq_model
    assert calls["n"] == 2
    gemini_mock.return_value.aio.models.generate_content.assert_not_called()


@pytest.mark.asyncio
async def test_validation_failure_triggers_fallback(mock_llm_providers):
    """Schema-shaped but semantically invalid output must not be returned.

    This is the guardrail from Section J.3: validation failure is treated like a
    transport failure, so Groq retries and then Gemini takes over.
    """
    groq_mock, gemini_mock = mock_llm_providers
    _groq_returning(groq_mock, '{"status": "not-a-number"}')
    gemini_mock.return_value.aio.models.generate_content = _gemini_returning('{"status": "7"}')

    def validator(payload):
        int(payload["status"])  # raises ValueError on "not-a-number"

    result, model = await LLMClient.complete_json(
        system="System", user="User", schema=SCHEMA, schema_name="Test",
        validator=validator,
    )

    assert result == {"status": "7"}
    assert model == settings.gemini_fallback_model


@pytest.mark.asyncio
async def test_gemini_empty_text_does_not_crash(mock_llm_providers):
    """A blocked Gemini candidate yields text=None; that must raise, not TypeError."""
    groq_mock, gemini_mock = mock_llm_providers
    groq_mock.return_value.chat.completions.create.side_effect = Exception("Groq is down")
    gemini_mock.return_value.aio.models.generate_content = _gemini_returning(None)

    with pytest.raises(LLMUnavailableError) as excinfo:
        await LLMClient.complete_json(
            system="System", user="User", schema=SCHEMA, schema_name="Test"
        )

    message = str(excinfo.value)
    assert "groq" in message and "gemini" in message


@pytest.mark.asyncio
async def test_no_keys_raises_not_configured(mocker):
    """Missing keys is a config error, distinct from a provider outage."""
    mocker.patch('app.clients.llm.settings.groq_api_key', '')
    mocker.patch('app.clients.llm.settings.google_gemini_api_key', '')

    with pytest.raises(LLMNotConfiguredError):
        await LLMClient.complete_json(
            system="System", user="User", schema=SCHEMA, schema_name="Test"
        )
