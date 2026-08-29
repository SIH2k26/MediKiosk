"""
Red-Flag Detection Engine — Deterministic Rule-Based System.
============================================================
IMPORTANT: Red-flag detection for clinical safety MUST use deterministic rules,
NOT rely exclusively on LLMs. LLM output can vary; red-flag detection must not.

This engine evaluates symptom combinations against known clinical red-flag patterns.
It does NOT make diagnoses. It flags patterns that require clinical review.
Language displayed in the UI must use:
  "Potential red flag detected — [category]"
NOT diagnostic language like "Patient has sepsis / ACS / stroke".
"""
from typing import List, Optional
from dataclasses import dataclass, field
import re


@dataclass
class RedFlagResult:
    type: str
    description: str
    severity: str       # NORMAL | WARNING | HIGH_PRIORITY | EMERGENCY
    category: str       # CARDIAC | NEUROLOGICAL | ABDOMINAL | PSYCHIATRIC | RESPIRATORY | SEPSIS | OBSTETRIC | PEDIATRIC
    triggered_by: List[str] = field(default_factory=list)
    requires_immediate_attention: bool = False


# ---------------------------------------------------------------------------
# Severity → priority_score mapping (for Express API / Supabase sort)
# ---------------------------------------------------------------------------
SEVERITY_PRIORITY_SCORE: dict[str, int] = {
    "EMERGENCY":     100,
    "HIGH_PRIORITY": 75,
    "WARNING":       50,
    "NORMAL":        0,
}

# ---------------------------------------------------------------------------
# Red-Flag Rule Definitions
# ---------------------------------------------------------------------------

RED_FLAG_RULES = [
    # ── CARDIAC ──────────────────────────────────────────────────────────────
    # EMERGENCY — potential acute coronary event
    {
        "type": "POTENTIAL_ACS",
        "category": "CARDIAC",
        "requires_all": False,  # ANY of the trigger sets below
        "trigger_sets": [
            ["chest pain", "sweating", "shortness of breath"],
            ["chest pain", "left arm", "jaw"],
            ["chest tightness", "sweating"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Cardiac: combination of symptoms may indicate "
            "an acute cardiac event. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
    # EMERGENCY — potential aortic dissection
    {
        "type": "AORTIC_DISSECTION",
        "category": "CARDIAC",
        "requires_all": False,
        "trigger_sets": [
            ["tearing chest pain", "sudden back pain"],
            ["tearing pain", "radiating to back"],
            ["ripping pain", "chest"],
            ["sudden severe chest", "back pain"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Cardiac: sudden tearing or ripping chest/back pain "
            "may indicate a vascular emergency. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── NEUROLOGICAL ─────────────────────────────────────────────────────────
    # EMERGENCY — potential stroke
    {
        "type": "POTENTIAL_STROKE",
        "category": "NEUROLOGICAL",
        "requires_all": False,
        "trigger_sets": [
            ["sudden weakness", "face drooping", "facial drooping"],
            ["sudden speech", "slurred speech", "arm weakness", "arm suddenly became weak"],
            ["sudden confusion", "severe headache"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Neurological: sudden neurological symptoms "
            "may indicate a cerebrovascular event. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
    # HIGH_PRIORITY — potential meningitis
    {
        "type": "MENINGITIS",
        "category": "NEUROLOGICAL",
        "requires_all": False,
        "trigger_sets": [
            ["stiff neck", "severe headache", "sensitivity to light"],
            ["neck stiffness", "fever", "headache", "photophobia"],
            ["stiff neck", "fever", "rash"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": (
            "Potential red flag detected — Neurological: combination of stiff neck, "
            "severe headache and fever may indicate a serious neurological condition. "
            "Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── ABDOMINAL ────────────────────────────────────────────────────────────
    # HIGH PRIORITY — severe abdominal
    {
        "type": "SEVERE_ABDOMINAL",
        "category": "ABDOMINAL",
        "requires_all": False,
        "trigger_sets": [
            ["severe abdominal pain", "vomiting blood"],
            ["black stool", "blood in stool", "vomiting blood"],
            ["sudden severe abdominal"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": (
            "Potential red flag detected — Abdominal: severe abdominal symptoms "
            "require urgent clinical assessment."
        ),
        "requires_immediate_attention": True,
    },

    # ── PSYCHIATRIC ──────────────────────────────────────────────────────────
    # HIGH PRIORITY — suicidal ideation
    {
        "type": "SUICIDAL_IDEATION",
        "category": "PSYCHIATRIC",
        "requires_all": False,
        "trigger_sets": [
            ["suicidal", "want to die", "end my life", "kill myself", "harming myself"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": (
            "Potential red flag detected — Psychiatric: patient has expressed thoughts "
            "of self-harm. Immediate psychiatric and medical support required."
        ),
        "requires_immediate_attention": True,
    },

    # ── RESPIRATORY ──────────────────────────────────────────────────────────
    # WARNING — respiratory distress
    {
        "type": "RESPIRATORY_DISTRESS",
        "category": "RESPIRATORY",
        "requires_all": False,
        "trigger_sets": [
            [
                "cannot breathe", "can't breathe", "difficulty breathing",
                "breathlessness", "struggling to breathe",
                "shortness of breath", "breathing problems",
            ],
        ],
        "severity": "WARNING",
        "description": (
            "Potential red flag detected — Respiratory: significant breathing difficulty reported. "
            "Clinical assessment recommended."
        ),
        "requires_immediate_attention": False,
    },
    # WARNING — severe pain
    {
        "type": "SEVERE_PAIN",
        "category": "GENERAL",
        "requires_all": False,
        "trigger_sets": [
            ["pain 9", "pain 10", "worst pain", "unbearable pain", "severe pain"],
        ],
        "severity": "WARNING",
        "description": (
            "Potential red flag detected — Severe pain score reported. "
            "Prompt clinical assessment recommended."
        ),
        "requires_immediate_attention": False,
    },

    # ── SEPSIS ───────────────────────────────────────────────────────────────
    # EMERGENCY — potential sepsis
    {
        "type": "SEPSIS_RISK",
        "category": "SEPSIS",
        "requires_all": False,
        "trigger_sets": [
            ["high fever", "rapid breathing", "confusion"],
            ["fever", "chills", "rapid heart rate", "confusion"],
            ["fever", "very low blood pressure"],
            ["suspected infection", "altered consciousness"],
            ["high temperature", "shaking", "not responding normally"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Sepsis: combination of fever, altered mental status "
            "and systemic signs may indicate a serious systemic condition. "
            "Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── OBSTETRIC ────────────────────────────────────────────────────────────
    # EMERGENCY — potential eclampsia / obstetric emergency
    {
        "type": "ECLAMPSIA_RISK",
        "category": "OBSTETRIC",
        "requires_all": True,
        "trigger_sets": [
            ["severe headache", "pregnancy"],
            ["severe headache", "pregnant"],
            ["blurred vision", "pregnant"],
            ["blurred vision", "pregnancy"],
            ["visual disturbance", "pregnant"],
            ["visual disturbance", "pregnancy"],
            ["convulsion", "pregnancy"],
            ["convulsion", "pregnant"],
            ["seizure", "pregnant"],
            ["seizure", "pregnancy"],
            ["swollen face", "pregnancy"],
            ["swollen face", "pregnant"],
            ["eclampsia"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Obstetric: severe headache, visual disturbance "
            "or seizure in a pregnant patient may indicate an obstetric emergency. "
            "Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── ALLERGIC / ANAPHYLAXIS ───────────────────────────────────────────────
    # EMERGENCY — potential anaphylaxis
    {
        "type": "ANAPHYLAXIS",
        "category": "ALLERGIC",
        "requires_all": False,
        "trigger_sets": [
            ["throat swelling", "difficulty breathing", "allergic reaction"],
            ["throat closing", "can't breathe", "allergy"],
            ["severe allergic", "swelling", "breathless"],
            ["anaphylaxis"],
            ["throat tightening", "rash", "difficulty breathing"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Allergic: throat swelling and breathing difficulty "
            "following an exposure may indicate a severe allergic reaction. "
            "Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── PEDIATRIC ────────────────────────────────────────────────────────────
    # EMERGENCY — pediatric emergency
    {
        "type": "PEDIATRIC_EMERGENCY",
        "category": "PEDIATRIC",
        "requires_all": True,
        "trigger_sets": [
            ["seizure", "child"],
            ["convulsion", "child"],
            ["not responding", "child"],
            ["loss of consciousness", "child"],
            ["febrile convulsion"],
            ["not breathing", "infant"],
            ["not breathing", "baby"],
        ],
        "severity": "EMERGENCY",
        "description": (
            "Potential red flag detected — Pediatric: seizure, loss of consciousness, "
            "or unresponsiveness in a child requires immediate clinical assessment."
        ),
        "requires_immediate_attention": True,
    },
]

# Comprehensive clinical negation tokens
NEGATION_TERMS = {
    "no", "not", "none", "never", "nothing",
    "don't", "dont", "do not", "didn't", "didnt", "did not",
    "doesn't", "doesnt", "does not",
    "haven't", "havent", "have not",
    "hasn't", "hasnt", "has not",
    "hadn't", "hadnt", "had not",
    "can't", "cant", "cannot", "couldn't", "couldnt", "could not",
    "without", "denies", "denied", "deny",
    "free", "negative"
}

# Hard sentence boundaries that fully reset clause context
_SENTENCE_SPLIT = re.compile(r'(?<=[.!?])\s+')

# Contrastive conjunctions that start an independent new clause
# (negation from a prior sub-clause does NOT carry forward through these)
_CONTRAST_SPLIT = re.compile(
    r'\s*,?\s*\b(but|however|although|though|except|yet|while|whereas|actually|now)\b\s*',
    re.IGNORECASE,
)

# Words that introduce negation; matched as standalone tokens
_NEGATION_TOKENS = re.compile(
    r'\b(no|not|never|none|nothing|cannot|can\'t|cant|don\'t|dont|do\s+not|'
    r'didn\'t|didnt|did\s+not|doesn\'t|doesnt|does\s+not|'
    r'haven\'t|havent|have\s+not|hasn\'t|hasnt|has\s+not|'
    r'hadn\'t|hadnt|had\s+not|couldn\'t|couldnt|could\s+not|'
    r'won\'t|wont|will\s+not|'
    r'without|denies|denied|deny|free|negative)\b',
    re.IGNORECASE,
)


def _is_negated_in_clause(clause: str, keyword: str) -> bool:
    """
    Return True if *keyword* appears in *clause* AND is preceded by a negation
    token within the same clause.

    Strategy:
      Find the character-position of the keyword. Scan the text before it
      (within the clause) for a negation token. If found, the keyword is negated.
    """
    kw_lower = keyword.lower()
    clause_lower = clause.lower()
    pos = clause_lower.find(kw_lower)
    if pos == -1:
        return False   # keyword not in this clause
    text_before = clause_lower[:pos]
    return bool(_NEGATION_TOKENS.search(text_before))


def _get_positive_triggers(text: str, keywords: List[str]) -> List[str]:
    """
    Returns keywords that appear in *text* and are NOT negated.

    Algorithm (two-stage clause splitting):
      1. Split on sentence boundaries (`.`, `!`, `?`) to get independent sentences.
         Negation cannot bleed across sentence boundaries.
      2. Within each sentence, split on contrastive conjunctions
         (but, however, although, …) to get independent sub-clauses.
         Negation within one sub-clause does NOT affect another.
      3. For each sub-clause containing the keyword, check for negation
         tokens that appear *before* the keyword in that sub-clause.
         If the sub-clause contains the keyword and no preceding negation,
         the keyword is a positive match.

    This handles:
      - "I don't have chest pain, but I suddenly developed severe chest pain."
        → chest pain is NEGATED in clause 1, POSITIVE in clause 2 → POSITIVE
      - "I don't have a seizure" → NEGATED → False
      - "My child does not have a seizure" → NEGATED → False
      - "I am pregnant and don't have a severe headache" → headache NEGATED → False
    """
    text_lower = text.lower()
    positive_matches = []

    for kw in keywords:
        kw_lower = kw.lower()
        # Fast pre-check: if keyword not present at all, skip
        if kw_lower not in text_lower:
            continue

        found_positive = False

        # Stage 1: split on sentence boundaries
        sentences = _SENTENCE_SPLIT.split(text)
        for sentence in sentences:
            if kw_lower not in sentence.lower():
                continue

            # Stage 2: split on contrastive conjunctions
            sub_clauses = _CONTRAST_SPLIT.split(sentence)

            for sub_clause in sub_clauses:
                if not sub_clause or kw_lower not in sub_clause.lower():
                    continue
                # The keyword is in this sub-clause.
                # Positive if NOT preceded by a negation token in the same sub-clause.
                if not _is_negated_in_clause(sub_clause, kw_lower):
                    found_positive = True
                    break

            if found_positive:
                break

        if found_positive:
            positive_matches.append(kw)

    return positive_matches




class RedFlagEngine:
    """
    Deterministic red-flag evaluation engine.

    Evaluates free-text answers against predefined clinical rule sets,
    incorporating deterministic clause-based negation parsing.
    Does NOT use LLMs for this safety-critical check.

    IMPORTANT: Results indicate patterns that require clinical review.
    They are NOT diagnoses. UI must display "Potential red flag detected"
    and never assert a specific condition.
    """

    def evaluate(self, answers: List[str], section_type: str) -> List[RedFlagResult]:
        """
        Evaluate a list of patient answers for red-flag patterns.

        Args:
            answers: List of raw answer strings from the patient
            section_type: The history section being evaluated

        Returns:
            List of triggered red flags (empty if none detected)
        """
        combined_text = " ".join(answers)
        triggered_flags: List[RedFlagResult] = []

        for rule in RED_FLAG_RULES:
            for trigger_set in rule["trigger_sets"]:
                matched = _get_positive_triggers(combined_text, trigger_set)

                if rule.get("requires_all", False):
                    # Strict AND logic within the trigger set
                    if len(matched) == len(trigger_set):
                        triggered_flags.append(
                            RedFlagResult(
                                type=rule["type"],
                                description=rule["description"],
                                severity=rule["severity"],
                                category=rule["category"],
                                triggered_by=matched,
                                requires_immediate_attention=rule["requires_immediate_attention"],
                            )
                        )
                        break  # Only trigger each rule once
                else:
                    # OR logic (any positive keyword in the set is sufficient)
                    if matched:
                        triggered_flags.append(
                            RedFlagResult(
                                type=rule["type"],
                                description=rule["description"],
                                severity=rule["severity"],
                                category=rule["category"],
                                triggered_by=matched,
                                requires_immediate_attention=rule["requires_immediate_attention"],
                            )
                        )
                        break  # Only trigger each rule once

        return triggered_flags
