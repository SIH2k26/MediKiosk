"""
Red-Flag Detection Engine — Deterministic Rule-Based System.
============================================================
IMPORTANT: Red-flag detection for clinical safety MUST use deterministic rules,
NOT rely exclusively on LLMs. LLM output can vary; red-flag detection must not.

This engine evaluates symptom combinations against known clinical red-flag patterns.
It does NOT make diagnoses. It flags patterns that require clinical review.
"""
from typing import List
from dataclasses import dataclass, field


@dataclass
class RedFlagResult:
    type: str
    description: str
    severity: str  # NORMAL | WARNING | HIGH_PRIORITY | EMERGENCY
    triggered_by: List[str] = field(default_factory=list)
    requires_immediate_attention: bool = False


# ---------------------------------------------------------------------------
# Red-Flag Rule Definitions
# ---------------------------------------------------------------------------
# Each rule defines:
#   - keywords: symptom terms that trigger this flag (case-insensitive)
#   - combinations: list of keyword groups that must ALL be present (AND logic)
#   - severity: risk level if triggered
#   - description: what the rule flags (not a diagnosis)
# ---------------------------------------------------------------------------

RED_FLAG_RULES = [
    # EMERGENCY — potential acute coronary event
    {
        "type": "POTENTIAL_ACS",
        "requires_all": False,  # ANY of the trigger sets below
        "trigger_sets": [
            ["chest pain", "sweating", "shortness of breath"],
            ["chest pain", "left arm", "jaw"],
            ["chest tightness", "sweating"],
        ],
        "severity": "EMERGENCY",
        "description": "Combination of symptoms may indicate acute cardiac event. Immediate clinical assessment required.",
        "requires_immediate_attention": True,
    },
    # EMERGENCY — potential stroke
    {
        "type": "POTENTIAL_STROKE",
        "requires_all": False,
        "trigger_sets": [
            ["sudden weakness", "face drooping"],
            ["sudden speech", "arm weakness"],
            ["sudden confusion", "severe headache"],
        ],
        "severity": "EMERGENCY",
        "description": "Sudden neurological symptoms may indicate stroke. Immediate assessment required.",
        "requires_immediate_attention": True,
    },
    # HIGH PRIORITY — severe abdominal
    {
        "type": "SEVERE_ABDOMINAL",
        "requires_all": False,
        "trigger_sets": [
            ["severe abdominal pain", "vomiting blood"],
            ["black stool", "vomiting blood"],
            ["sudden severe abdominal"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": "Severe abdominal symptoms requiring urgent assessment.",
        "requires_immediate_attention": True,
    },
    # HIGH PRIORITY — suicidal ideation
    {
        "type": "SUICIDAL_IDEATION",
        "requires_all": False,
        "trigger_sets": [
            ["suicidal", "want to die", "end my life", "kill myself"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": "Patient has expressed thoughts of self-harm. Immediate psychiatric/medical support required.",
        "requires_immediate_attention": True,
    },
    # WARNING — severe pain
    {
        "type": "SEVERE_PAIN",
        "requires_all": False,
        "trigger_sets": [
            ["pain 9", "pain 10", "worst pain", "unbearable pain"],
        ],
        "severity": "WARNING",
        "description": "Reported severe pain score requiring prompt assessment.",
        "requires_immediate_attention": False,
    },
    # WARNING — respiratory distress
    {
        "type": "RESPIRATORY_DISTRESS",
        "requires_all": False,
        "trigger_sets": [
            ["cannot breathe", "can't breathe", "difficulty breathing", "breathlessness"],
        ],
        "severity": "WARNING",
        "description": "Significant breathing difficulty reported.",
        "requires_immediate_attention": False,
    },
]


def _text_contains_any(text: str, keywords: List[str]) -> List[str]:
    """Return which keywords from the list appear in the text."""
    text_lower = text.lower()
    return [kw for kw in keywords if kw.lower() in text_lower]


class RedFlagEngine:
    """
    Deterministic red-flag evaluation engine.
    
    Evaluates free-text answers against predefined clinical rule sets.
    Does NOT use LLMs for this safety-critical check.
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
                matched = _text_contains_any(combined_text, trigger_set)
                if matched:
                    triggered_flags.append(
                        RedFlagResult(
                            type=rule["type"],
                            description=rule["description"],
                            severity=rule["severity"],
                            triggered_by=matched,
                            requires_immediate_attention=rule["requires_immediate_attention"],
                        )
                    )
                    break  # Only trigger each rule once

        return triggered_flags
