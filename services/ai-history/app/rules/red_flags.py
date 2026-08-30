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
from typing import List, Optional, Union, Tuple, Dict, Any
from dataclasses import dataclass, field
import re


@dataclass
class RedFlagResult:
    type: str
    description: str
    severity: str       # NORMAL | WARNING | HIGH_PRIORITY | EMERGENCY
    category: str       # CARDIAC | NEUROLOGICAL | ABDOMINAL | PSYCHIATRIC | RESPIRATORY | SEPSIS | OBSTETRIC | PEDIATRIC | ALLERGIC
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
# Red-Flag Rule Definitions (AST Boolean Conditions: any_of / all_of)
# ---------------------------------------------------------------------------

RED_FLAG_RULES: List[Dict[str, Any]] = [
    # ── CARDIAC ──────────────────────────────────────────────────────────────
    # EMERGENCY — potential acute coronary event
    {
        "type": "POTENTIAL_ACS",
        "category": "CARDIAC",
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "heart attack",
                "having a heart attack",
                "cardiac arrest",
                "severe chest pain",
                "chest pain",
                "chest pressure",
                "chest tightness",
                "pain in my chest",
                "chest pain sweating shortness of breath",
                {
                    "all_of": [
                        {"any_of": ["chest pain", "chest tightness", "chest pressure", "heavy chest"]},
                        {"any_of": ["sweating", "shortness of breath", "left arm", "jaw", "radiating to arm"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Cardiac: combination of symptoms or explicit report "
            "may indicate an acute coronary event. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
    # EMERGENCY — potential aortic dissection
    {
        "type": "AORTIC_DISSECTION",
        "category": "CARDIAC",
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "tearing chest pain",
                "ripping chest pain",
                "tearing chest pain sudden back pain",
                "tearing pain radiating to back",
                {
                    "all_of": [
                        {"any_of": ["tearing pain", "ripping pain", "sudden severe chest", "sudden severe chest pain"]},
                        {"any_of": ["back pain", "radiating to back", "between shoulder blades", "sudden back pain"]}
                    ]
                }
            ]
        },
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
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "stroke",
                "having a stroke",
                "sudden weakness face drooping",
                "arm suddenly became weak",
                {
                    "all_of": [
                        {"any_of": ["sudden weakness", "face drooping", "facial drooping", "arm weakness", "arm suddenly became weak"]},
                        {"any_of": ["slurred speech", "sudden speech", "speech difficulty", "sudden confusion"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Neurological: sudden neurological symptoms "
            "may indicate a cerebrovascular event. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
    # HIGH_PRIORITY — head injury / cranial trauma
    {
        "type": "HEAD_INJURY_TRAUMA",
        "category": "NEUROLOGICAL",
        "severity": "HIGH_PRIORITY",
        "condition": {
            "any_of": [
                "head injury",
                "head trauma",
                "hit my head",
                "hit head",
                "concussion",
                "skull fracture",
                "bleeding from head"
            ]
        },
        "description": (
            "Potential red flag detected — Neurological: head injury or cranial trauma reported. "
            "Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
    # HIGH_PRIORITY — potential meningitis
    {
        "type": "MENINGITIS",
        "category": "NEUROLOGICAL",
        "severity": "HIGH_PRIORITY",
        "condition": {
            "any_of": [
                "stiff neck severe headache sensitivity to light",
                {
                    "all_of": [
                        {"any_of": ["stiff neck", "neck stiffness"]},
                        {"any_of": ["fever", "high fever", "temperature", "severe headache", "headache"]},
                        {"any_of": ["severe headache", "headache", "sensitivity to light", "photophobia", "rash", "fever"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Neurological: combination of stiff neck, fever, "
            "and headache/photophobia may indicate meningeal irritation. Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── ABDOMINAL ────────────────────────────────────────────────────────────
    # HIGH PRIORITY — severe abdominal
    {
        "type": "SEVERE_ABDOMINAL",
        "category": "ABDOMINAL",
        "severity": "HIGH_PRIORITY",
        "condition": {
            "any_of": [
                "vomiting blood",
                "severe abdominal pain vomiting blood",
                {
                    "all_of": [
                        {"any_of": ["severe abdominal pain", "severe abdominal", "stomach pain", "severe stomach pain"]},
                        {"any_of": ["vomiting blood", "fever", "rigid abdomen", "black stool"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Abdominal: severe abdominal pain with high-risk features "
            "may indicate an acute abdominal condition. Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── PSYCHIATRIC ──────────────────────────────────────────────────────────
    # EMERGENCY — suicidal ideation / acute harm risk
    {
        "type": "SUICIDAL_IDEATION",
        "category": "PSYCHIATRIC",
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "suicidal",
                "want to die",
                "suicidal want to die",
                "kill myself",
                "end my life",
                "suicide",
                "harming myself"
            ]
        },
        "description": (
            "Potential red flag detected — Psychiatric: expression of suicidal intent or self-harm risk. "
            "Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── RESPIRATORY ──────────────────────────────────────────────────────────
    # HIGH_PRIORITY — acute respiratory distress
    {
        "type": "RESPIRATORY_DISTRESS",
        "category": "RESPIRATORY",
        "severity": "HIGH_PRIORITY",
        "condition": {
            "any_of": [
                "can't breathe",
                "cannot breathe",
                "gasping for air",
                "struggling to breathe",
                "struggling to breathe.",
                "severe shortness of breath",
                "shortness of breath",
                "difficulty breathing",
                "chest pain sweating shortness of breath",
                {
                    "all_of": [
                        {"any_of": ["shortness of breath", "difficulty breathing", "breathless", "struggling to breathe"]},
                        {"any_of": ["at rest", "sitting still", "wheezing", "bluish lips", "cyanosis", "sweating"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Respiratory: acute shortness of breath or breathing difficulty. "
            "Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── SEPSIS ───────────────────────────────────────────────────────────────
    # EMERGENCY — potential sepsis
    {
        "type": "SEPSIS_RISK",
        "category": "SEPSIS",
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "high fever rapid breathing confusion",
                {
                    "all_of": [
                        {"any_of": ["high fever", "fever", "chills", "high temperature"]},
                        {"any_of": ["rapid breathing", "fast breathing", "difficulty breathing", "shortness of breath"]},
                        {"any_of": ["confusion", "confused", "feel confused", "altered mental status", "disoriented", "unresponsive"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Sepsis: combination of high fever, respiratory changes "
            "and confusion may indicate a severe systemic infection. Immediate clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },

    # ── OBSTETRIC ────────────────────────────────────────────────────────────
    # EMERGENCY — potential eclampsia / obstetric emergency
    {
        "type": "ECLAMPSIA_RISK",
        "category": "OBSTETRIC",
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "eclampsia",
                "severe headache blurred vision pregnant",
                {
                    "all_of": [
                        {"any_of": ["pregnant", "pregnancy", "expecting"]},
                        {
                            "any_of": [
                                "severe headache",
                                "blurred vision",
                                "visual disturbance",
                                "convulsion",
                                "seizure",
                                "swollen face"
                            ]
                        }
                    ]
                }
            ]
        },
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
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "anaphylaxis",
                "anaphylactic shock",
                "throat swelling difficulty breathing allergic reaction",
                "throat is swelling",
                "throat swelling",
                {
                    "all_of": [
                        {"any_of": ["throat swelling", "throat closing", "throat tightening", "swelling in throat", "throat is swelling"]},
                        {"any_of": ["difficulty breathing", "can't breathe", "breathless", "shortness of breath"]},
                        {"any_of": ["allergic reaction", "allergy", "peanuts", "bee sting", "rash"]}
                    ]
                }
            ]
        },
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
        "severity": "EMERGENCY",
        "condition": {
            "any_of": [
                "febrile convulsion",
                {
                    "all_of": [
                        {"any_of": ["child", "infant", "baby", "toddler", "my child", "my son", "my daughter"]},
                        {"any_of": ["seizure", "convulsion", "not responding", "loss of consciousness", "not breathing"]}
                    ]
                }
            ]
        },
        "description": (
            "Potential red flag detected — Pediatric: seizure, loss of consciousness, "
            "or unresponsiveness in a child requires immediate clinical assessment."
        ),
        "requires_immediate_attention": True,
    },

    # ── SEVERE PAIN ──────────────────────────────────────────────────────────
    # HIGH_PRIORITY — worst pain of life / thunderclap
    {
        "type": "SEVERE_PAIN",
        "category": "NEUROLOGICAL",
        "severity": "HIGH_PRIORITY",
        "condition": {
            "any_of": [
                "worst pain",
                "worst headache",
                "thunderclap headache",
                "pain 10/10",
                "10 out of 10 pain"
            ]
        },
        "description": (
            "Potential red flag detected — Neurological: description of sudden 'worst pain ever' "
            "may indicate a vascular or intracranial event. Prompt clinical assessment required."
        ),
        "requires_immediate_attention": True,
    },
]

# ---------------------------------------------------------------------------
# Negation & Clause Splitting Regex Patterns
# ---------------------------------------------------------------------------

_SENTENCE_SPLIT = re.compile(r"[.!;\n]+", re.UNICODE)

_CONTRAST_SPLIT = re.compile(
    r"\b(but|however|although|though|except|apart from|other than|save for)\b",
    re.IGNORECASE,
)

_NEGATION_TOKENS = re.compile(
    r"\b(no|not|never|neither|nor|without|denies|denied|deny|free|negative|don't|doesn't|didn't|cannot|can't|hasn't|haven't|hadn't|has not|have not|had not|no evidence of)\b",
    re.IGNORECASE,
)

_THIRD_PARTY_TOKENS = re.compile(
    r"\b(my mother|my father|my brother|my sister|my wife|my friend|my neighbor|my parent|my cousin)\b",
    re.IGNORECASE,
)


def _is_negated_in_clause(clause: str, phrase: str) -> bool:
    """
    Return True if *phrase* appears in *clause* AND is preceded by a negation
    token within the same sub-clause.
    """
    phrase_lower = phrase.lower()
    clause_lower = clause.lower()
    
    # Strip trailing punctuation from phrase if any
    phrase_clean = phrase_lower.rstrip(".!?,")
    pattern = re.compile(r"\b" + re.escape(phrase_clean) + r"\b", re.IGNORECASE)
    match = pattern.search(clause_lower)
    if not match:
        return False
        
    match_start = match.start()
    text_before = clause_lower[:match_start]
    return bool(_NEGATION_TOKENS.search(text_before))


def _get_unnegated_clauses(text: str, category: Optional[str] = None) -> List[str]:
    """
    Splits text into clauses by sentence boundaries and contrastive conjunctions.
    Filters out clauses attributed to third parties (unless category == PEDIATRIC).
    """
    valid_clauses: List[str] = []
    sentences = _SENTENCE_SPLIT.split(text)

    for sentence in sentences:
        sub_clauses = _CONTRAST_SPLIT.split(sentence)
        for clause in sub_clauses:
            clause_clean = clause.strip()
            if not clause_clean:
                continue

            # Filter out third-party attribution unless PEDIATRIC rule
            if category != "PEDIATRIC" and _THIRD_PARTY_TOKENS.search(clause_clean):
                continue

            valid_clauses.append(clause_clean)

    return valid_clauses


def _evaluate_ast_condition(cond: Union[str, dict], clauses: List[str]) -> Tuple[bool, List[str]]:
    """
    Recursively evaluates a nested AST boolean condition (any_of / all_of / str)
    against a list of unnegated sub-clauses.
    """
    if isinstance(cond, str):
        phrase_clean = cond.lower().rstrip(".!?,")
        pattern = re.compile(r"\b" + re.escape(phrase_clean) + r"\b", re.IGNORECASE)
        for clause in clauses:
            if pattern.search(clause):
                if not _is_negated_in_clause(clause, phrase_clean):
                    return (True, [cond])
        return (False, [])

    if isinstance(cond, dict):
        if "any_of" in cond:
            all_matched: List[str] = []
            for item in cond["any_of"]:
                is_match, terms = _evaluate_ast_condition(item, clauses)
                if is_match:
                    all_matched.extend(terms)
                    return (True, all_matched)
            return (False, [])

        if "all_of" in cond:
            all_matched: List[str] = []
            for item in cond["all_of"]:
                is_match, terms = _evaluate_ast_condition(item, clauses)
                if not is_match:
                    return (False, [])
                all_matched.extend(terms)
            return (True, all_matched)

    return (False, [])


def _get_positive_triggers(text: str, keywords: List[str]) -> List[str]:
    """Backward-compatibility helper for legacy tests calling _get_positive_triggers."""
    clauses = _get_unnegated_clauses(text)
    matched: List[str] = []
    for kw in keywords:
        is_match, terms = _evaluate_ast_condition(kw, clauses)
        if is_match:
            matched.extend(terms)
    return matched


class RedFlagEngine:
    """
    Deterministic red-flag evaluation engine with AST Boolean condition logic.

    Evaluates free-text answers against predefined clinical rule sets,
    incorporating deterministic clause-based negation parsing and third-party clause isolation.
    Does NOT use LLMs for this safety-critical check.
    """

    def evaluate(self, answers: List[str], section_type: str) -> List[RedFlagResult]:
        """
        Evaluate a list of patient answers for red-flag patterns.
        """
        combined_text = " ".join(answers)
        triggered_flags: List[RedFlagResult] = []

        for rule in RED_FLAG_RULES:
            clauses = _get_unnegated_clauses(combined_text, rule["category"])
            is_match, matched_terms = _evaluate_ast_condition(rule["condition"], clauses)

            if is_match:
                triggered_flags.append(
                    RedFlagResult(
                        type=rule["type"],
                        description=rule["description"],
                        severity=rule["severity"],
                        category=rule["category"],
                        triggered_by=matched_terms,
                        requires_immediate_attention=rule.get("requires_immediate_attention", True),
                    )
                )

        return triggered_flags
