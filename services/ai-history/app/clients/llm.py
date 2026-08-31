"""LLM client — Groq strict JSON primary, Gemini fallback (Section J).

Contract: ``complete_json`` either returns JSON that satisfies ``validator``, or
raises. Callers never receive unvalidated model output, because a schema-shaped
response can still be clinically nonsensical (wrong enum member, confidence of
7.0) and silently corrupt the record downstream.

Order of attempts, per Section J:
    Groq (schema-strict)  -> retry once
    Gemini (schema-guided) -> retry once, second attempt without the schema
Each attempt that fails validation feeds the error back into the next prompt.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable, Optional

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None
    genai_types = None

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from app.config import settings

logger = logging.getLogger(__name__)

# One attempt plus one retry per provider (Section J).
_ATTEMPTS_PER_PROVIDER = 2

_groq_client: Optional[AsyncOpenAI] = None
_gemini_client: Optional[genai.Client] = None


class LLMError(RuntimeError):
    """Base class for LLM failures."""


class LLMNotConfiguredError(LLMError):
    """No provider has an API key — a deployment problem, not a runtime one."""


class LLMUnavailableError(LLMError):
    """Every configured provider failed or returned unusable output."""


def _get_groq() -> AsyncOpenAI:
    """Reuse one client so the HTTP connection pool survives across requests."""
    global _groq_client
    if _groq_client is None:
        _groq_client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url=settings.groq_base_url,
            timeout=60.0,
            max_retries=0,  # retries are orchestrated here so we can re-prompt
        )
    return _groq_client


def _get_gemini() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=settings.google_gemini_api_key)
    return _gemini_client


async def aclose() -> None:
    """Release pooled connections (called from the FastAPI shutdown hook)."""
    global _groq_client, _gemini_client
    if _groq_client is not None:
        await _groq_client.close()
        _groq_client = None
    _gemini_client = None


def _parse_and_validate(
    raw: str | None, validator: Optional[Callable[[dict], Any]]
) -> dict:
    """Parse JSON text and run the caller's validator. Raises ``ValueError``."""
    if not raw or not raw.strip():
        raise ValueError("model returned an empty response")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"response was not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
    if validator is not None:
        try:
            validator(parsed)
        except Exception as exc:  # pydantic ValidationError and friends
            raise ValueError(f"response failed schema validation: {exc}") from exc
    return parsed


def _repair_hint(error: str) -> str:
    return (
        "\n\nYour previous response was rejected. Error:\n"
        f"{error[:600]}\n"
        "Return ONLY a corrected JSON object matching the schema exactly. "
        "Do not include explanations, markdown fences, or extra keys."
    )


async def _call_groq(system: str, user: str, schema: dict, schema_name: str) -> str | None:
    completion = await _get_groq().chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": schema, "strict": True},
        },
        temperature=0.0,
    )
    if not completion.choices:
        raise ValueError("Groq returned no choices")
    return completion.choices[0].message.content


async def _call_gemini(system: str, user: str, schema: dict | None) -> str | None:
    config_kwargs: dict[str, Any] = {
        "response_mime_type": "application/json",
        "temperature": 0.0,
        "system_instruction": system,
    }
    if schema is not None:
        config_kwargs["response_json_schema"] = schema

    response = await _get_gemini().aio.models.generate_content(
        model=settings.gemini_fallback_model,
        contents=user,
        config=genai_types.GenerateContentConfig(**config_kwargs),
    )
    # `response.text` is None when the candidate was blocked or produced no
    # parts. The old code called json.loads on it and raised TypeError, which
    # surfaced as an opaque 500.
    text = response.text
    if not text:
        reason = getattr(response, "prompt_feedback", None)
        raise ValueError(f"Gemini returned no text (prompt_feedback={reason})")
    return text


class LLMClient:
    @staticmethod
    async def complete_json(
        system: str,
        user: str,
        schema: dict,
        schema_name: str,
        validator: Optional[Callable[[dict], Any]] = None,
    ) -> tuple[dict, str]:
        """Return ``(validated_json, model_used)`` or raise.

        ``validator`` should raise on invalid input (a Pydantic
        ``Model.model_validate`` is the intended argument). Validation failures
        are treated exactly like transport failures: retry, then fall back.
        """
        groq_enabled = bool(settings.groq_api_key) and settings.llm_primary == "groq"
        gemini_enabled = (
            bool(settings.google_gemini_api_key) and settings.llm_fallback == "gemini"
        )
        if not groq_enabled and not gemini_enabled:
            raise LLMNotConfiguredError(
                "No LLM API keys configured (set GROQ_API_KEY or GOOGLE_GEMINI_API_KEY)"
            )

        errors: list[str] = []

        if groq_enabled:
            prompt = user
            for attempt in range(1, _ATTEMPTS_PER_PROVIDER + 1):
                try:
                    raw = await _call_groq(system, prompt, schema, schema_name)
                    return _parse_and_validate(raw, validator), settings.groq_model
                except Exception as exc:
                    detail = f"groq attempt {attempt}: {exc}"
                    errors.append(detail)
                    logger.warning("LLM %s", detail)
                    if attempt < _ATTEMPTS_PER_PROVIDER:
                        prompt = user + _repair_hint(str(exc))

        if gemini_enabled:
            if errors:
                logger.warning("LLM falling back to Gemini after %d failure(s)", len(errors))
            prompt = user
            for attempt in range(1, _ATTEMPTS_PER_PROVIDER + 1):
                # Second attempt drops the schema: some schema constructs (union
                # types, additionalProperties) are rejected outright by Gemini,
                # and a free-form JSON response still has to pass `validator`.
                use_schema = schema if attempt == 1 else None
                try:
                    raw = await _call_gemini(system, prompt, use_schema)
                    return (
                        _parse_and_validate(raw, validator),
                        settings.gemini_fallback_model,
                    )
                except Exception as exc:
                    detail = f"gemini attempt {attempt}: {exc}"
                    errors.append(detail)
                    logger.warning("LLM %s", detail)
                    if attempt < _ATTEMPTS_PER_PROVIDER:
                        prompt = user + _repair_hint(str(exc))

        # Name every provider that was actually tried, so the log says whether
        # this was a Groq-only failure or a genuine both-providers outage.
        tried = [n for n, on in (("groq", groq_enabled), ("gemini", gemini_enabled)) if on]
        raise LLMUnavailableError(
            f"All LLM providers failed ({', '.join(tried)}): " + " | ".join(errors)
        )
