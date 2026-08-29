"""Clinical ontology loader + query helpers.

The ontology itself now lives in ``clinical_ontology.json`` (Section E of the DEV 3
plan prefers data over hard-coded Python, so the question bank can be edited
without touching code). This module loads it, validates it at import time, and
exposes small pure helpers that ``pipelines/dialogue.py`` builds the interview on.

WHY validate at import: a required_slot with no question that fills it, or a
question whose ``section_type`` doesn't match its section, produces an interview
that dead-ends mid-flow with no error anywhere. Failing at startup instead turns
a silent demo failure into an obvious one.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from app.models.schemas import (
    AnswerType,
    ClinicalQuestion,
    HistorySectionType,
    QuestionOption,
)

_ONTOLOGY_PATH = Path(__file__).with_name("clinical_ontology.json")

with _ONTOLOGY_PATH.open("r", encoding="utf-8") as handle:
    ONTOLOGY: Dict[str, Any] = json.load(handle)

SECTION_ORDER: List[str] = list(ONTOLOGY["section_order"])
_SECTIONS: Dict[str, Any] = ONTOLOGY["sections"]

#: Module used when the chief complaint matches nothing known. Its questions are
#: complaint-agnostic, so an unmatched complaint still gets a coherent HPI
#: instead of being handed chest-pain questions.
DEFAULT_MODULE = "general"

_HPI_MODULES: Dict[str, Any] = _SECTIONS.get("HPI", {}).get("complaint_modules", {})

#: Selectable complaint modules, excluding the generic fallback. This is the enum
#: the LLM complaint classifier is constrained to.
COMPLAINT_MODULE_KEYS: List[str] = [k for k in _HPI_MODULES if k != DEFAULT_MODULE]

# Keys understood by ClinicalQuestion; everything else in a question dict
# (``slot``, ``priority_when``) is ontology-internal wiring.
_QUESTION_FIELDS = {
    "id",
    "text",
    "hindi_text",
    "section_type",
    "input_type",
    "options",
    "is_required",
    "follow_up_condition",
    "red_flag_triggers",
}


def _validate() -> None:
    seen_ids: set[str] = set()

    for section in SECTION_ORDER:
        if section not in _SECTIONS:
            raise ValueError(f"ontology: section_order lists unknown section {section!r}")
        # Must be a real HistorySectionType or /dialogue/next cannot serialise it.
        HistorySectionType(section)

        body = _SECTIONS[section]
        modules = body.get("complaint_modules")
        buckets: List[tuple[str, List[dict]]] = (
            [(key, mod.get("questions", [])) for key, mod in modules.items()]
            if modules
            else [("", body.get("questions", []))]
        )
        if not buckets or not any(questions for _, questions in buckets):
            raise ValueError(f"ontology: section {section!r} has no questions")

        for module_key, questions in buckets:
            where = f"{section}/{module_key}" if module_key else section
            filled = {q.get("slot") for q in questions if q.get("slot")}
            missing = [s for s in body.get("required_slots", []) if s not in filled]
            if missing:
                raise ValueError(
                    f"ontology: {where} requires slots {missing} that no question fills"
                )
            for question in questions:
                qid = question["id"]
                if qid in seen_ids:
                    raise ValueError(f"ontology: duplicate question id {qid!r}")
                seen_ids.add(qid)
                if question.get("section_type") != section:
                    raise ValueError(
                        f"ontology: question {qid!r} declares section_type "
                        f"{question.get('section_type')!r} but sits under {section!r}"
                    )

    if DEFAULT_MODULE not in _HPI_MODULES:
        raise ValueError(f"ontology: HPI is missing the {DEFAULT_MODULE!r} fallback module")


_validate()


def is_known_section(section: str) -> bool:
    return section in _SECTIONS


def next_section(current: str) -> Optional[str]:
    """Section that follows ``current``, or None when the interview is over."""
    try:
        index = SECTION_ORDER.index(current)
    except ValueError:
        return None
    return SECTION_ORDER[index + 1] if index + 1 < len(SECTION_ORDER) else None


def first_section() -> str:
    return SECTION_ORDER[0]


def required_slots(section: str) -> List[str]:
    return list(_SECTIONS.get(section, {}).get("required_slots", []))


def resolve_module(section: str, module: Optional[str]) -> Optional[str]:
    """Normalise a module key for ``section``.

    Returns None for sections that have no modules, and falls back to
    :data:`DEFAULT_MODULE` for an unknown key so a stale/garbled module name from
    the client can never empty out the question list.
    """
    if section != "HPI":
        return None
    if module in _HPI_MODULES:
        return module
    return DEFAULT_MODULE


def raw_questions(section: str, module: Optional[str] = None) -> List[dict]:
    """Ontology-order question dicts for a section (raw, with internal keys)."""
    body = _SECTIONS.get(section)
    if not body:
        return []
    if body.get("complaint_modules"):
        key = resolve_module(section, module) or DEFAULT_MODULE
        return list(body["complaint_modules"].get(key, {}).get("questions", []))
    return list(body.get("questions", []))


def question_ids(section: str, module: Optional[str] = None) -> List[str]:
    return [q["id"] for q in raw_questions(section, module)]


def red_flag_tokens(section: str, module: Optional[str] = None) -> List[str]:
    """Tokens whose appearance in an earlier answer escalates a follow-up."""
    body = _SECTIONS.get(section, {})
    if body.get("complaint_modules"):
        key = resolve_module(section, module) or DEFAULT_MODULE
        return list(body["complaint_modules"].get(key, {}).get("red_flag_tokens", []))
    return []


def match_module(complaint_text: str) -> Optional[str]:
    """Keyword match of a chief complaint to a module, or None.

    Uses deterministic negation-aware extraction and prefers the module whose 
    keyword appears earliest in the text (first mention wins) to correctly route 
    multi-symptom complaints (e.g., 'headache with chest pain' -> headache),
    and correctly ignores negated symptoms (e.g., 'headache but no chest pain').
    """
    from app.rules.red_flags import _get_positive_triggers

    text = (complaint_text or "").lower()
    if not text.strip():
        return None

    best: Optional[str] = None
    best_index = float('inf')
    
    for key, module in _HPI_MODULES.items():
        if key == DEFAULT_MODULE:
            continue
            
        keywords = module.get("match", [])
        if not keywords:
            continue
            
        positive_matches = _get_positive_triggers(text, keywords)
        
        for match in positive_matches:
            idx = text.find(match.lower())
            if idx != -1 and idx < best_index:
                best_index = idx
                best = key
                
    return best


def to_clinical_question(raw: dict, language: str) -> ClinicalQuestion:
    """Build the API-facing question, localising text for Hindi.

    WHY the allowlist: passing ``slot``/``priority_when`` straight into the model
    would leak interview wiring into the kiosk contract.
    """
    payload = {k: v for k, v in raw.items() if k in _QUESTION_FIELDS}

    if language == "hi" and payload.get("hindi_text"):
        payload["text"] = payload["hindi_text"]

    options = payload.get("options")
    if options:
        payload["options"] = [
            QuestionOption(
                id=option["id"],
                label=(
                    option.get("hindi_label") or option["label"]
                    if language == "hi"
                    else option["label"]
                ),
                hindi_label=option.get("hindi_label"),
                value=option["value"],
            )
            for option in options
        ]

    payload.setdefault("input_type", "VOICE_OR_TOUCH")
    return ClinicalQuestion(**payload)


def slots_filled(section: str, module: Optional[str], answered_ids: Iterable[str]) -> set[str]:
    """Which required slots the answered question ids have satisfied."""
    answered = set(answered_ids)
    return {
        q["slot"]
        for q in raw_questions(section, module)
        if q.get("slot") and q["id"] in answered
    }
