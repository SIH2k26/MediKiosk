"""
Red-Flag Detection Engine ? Deterministic Rule-Based System.
============================================================
IMPORTANT: Red-flag detection for clinical safety MUST use deterministic rules,
NOT rely exclusively on LLMs. LLM output can vary; red-flag detection must not.

This engine evaluates symptom combinations against known clinical red-flag patterns.
It does NOT make diagnoses. It flags patterns that require clinical review.
"""
from typing import List
from dataclasses import dataclass, field
import re


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

RED_FLAG_RULES = [
    # EMERGENCY ? potential acute coronary event
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
    # EMERGENCY ? potential stroke
    {
        "type": "POTENTIAL_STROKE",
        "requires_all": False,
        "trigger_sets": [
            ["sudden weakness", "face drooping", "facial drooping"],
            ["sudden speech", "slurred speech", "arm weakness", "arm suddenly became weak"],
            ["sudden confusion", "severe headache"],
        ],
        "severity": "EMERGENCY",
        "description": "Sudden neurological symptoms may indicate stroke. Immediate assessment required.",
        "requires_immediate_attention": True,
    },
    # HIGH PRIORITY ? severe abdominal
    {
        "type": "SEVERE_ABDOMINAL",
        "requires_all": False,
        "trigger_sets": [
            ["severe abdominal pain", "vomiting blood"],
            ["black stool", "blood in stool", "vomiting blood"],
            ["sudden severe abdominal"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": "Severe abdominal symptoms requiring urgent assessment.",
        "requires_immediate_attention": True,
    },
    # HIGH PRIORITY ? suicidal ideation
    {
        "type": "SUICIDAL_IDEATION",
        "requires_all": False,
        "trigger_sets": [
            ["suicidal", "want to die", "end my life", "kill myself", "harming myself"],
        ],
        "severity": "HIGH_PRIORITY",
        "description": "Patient has expressed thoughts of self-harm. Immediate psychiatric/medical support required.",
        "requires_immediate_attention": True,
    },
    # WARNING ? severe pain
    {
        "type": "SEVERE_PAIN",
        "requires_all": False,
        "trigger_sets": [
            ["pain 9", "pain 10", "worst pain", "unbearable pain", "severe pain"],
        ],
        "severity": "WARNING",
        "description": "Reported severe pain score requiring prompt assessment.",
        "requires_immediate_attention": False,
    },
    # WARNING ? respiratory distress
    {
        "type": "RESPIRATORY_DISTRESS",
        "requires_all": False,
        "trigger_sets": [
            ["cannot breathe", "can't breathe", "difficulty breathing", "breathlessness", "struggling to breathe", "shortness of breath", "breathing problems"],
        ],
        "severity": "WARNING",
        "description": "Significant breathing difficulty reported.",
        "requires_immediate_attention": False,
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

# Clause boundaries: punctuation or coordinating conjunctions that indicate a shift in context
CLAUSE_DELIMITERS = re.compile(r'([.,;?!])|\b(but|and|although|however|except|yet|though|while|or|nor)\b', re.IGNORECASE)

def _get_positive_triggers(text: str, keywords: List[str]) -> List[str]:
    """
    Returns keywords from the list that appear in the text AND are not negated.
    This is a deterministic, regex-based negation parser.
    """
    text_lower = text.lower()
    positive_matches = []
    
    # Split text into independent clauses to avoid cross-clause negation
    # Note: capturing groups in re.split mean the delimiters are included in the output list
    parts = CLAUSE_DELIMITERS.split(text_lower)
    
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower not in text_lower:
            continue
            
        is_positive = False
        
        # State to track if the current sentence context is actively negated.
        # This propagates across 'and' / 'or' but is reset by hard punctuation or 'but/although'
        is_currently_negated = False
        
        for i, part in enumerate(parts):
            if part is None or not part.strip():
                continue
                
            # If the part is one of our delimiters
            if re.match(r'^[.;?!]+$', part.strip()) or part in ('but', 'although', 'however', 'except', 'yet', 'though', 'while'):
                is_currently_negated = False # Reset negation on new full clause/sentence boundary
                continue
            
            if re.match(r'^,+$', part.strip()) or part in ('and', 'or', 'nor'):
                # Commas, 'and'/'or' can carry negation forward in a list (e.g., "no X, Y, or Z")
                continue
                
            # Check for negation tokens explicitly in this part before the keyword (or anywhere if the keyword is not in this part yet)
            words_in_part = re.findall(r"\b[\w']+\b", part)
            if kw_lower in part:
                idx = part.find(kw_lower)
                words_before = re.findall(r"\b[\w']+\b", part[:idx])
                if any(w in NEGATION_TERMS for w in words_before):
                    is_currently_negated = True
                    
                # Evaluate if it's negated
                if not is_currently_negated:
                    is_positive = True
                    break # Found a positive instance, no need to keep checking this keyword
            else:
                # If keyword is not in this part, check if this part introduces a negation that propagates forward
                if any(w in NEGATION_TERMS for w in words_in_part):
                    is_currently_negated = True
                    
        if is_positive:
            positive_matches.append(kw)
            
    return positive_matches


class RedFlagEngine:
    """
    Deterministic red-flag evaluation engine.
    
    Evaluates free-text answers against predefined clinical rule sets,
    incorporating deterministic clause-based negation parsing.
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
                matched = _get_positive_triggers(combined_text, trigger_set)
                
                if rule.get("requires_all", False):
                    # Strict AND logic within the trigger set
                    if len(matched) == len(trigger_set):
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
                else:
                    # OR logic (any positive keyword in the set is sufficient)
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
