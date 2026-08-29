"""
Triage Classifier — Deterministic clinical action mapping.
===========================================================
Maps a list of RedFlagResults + overall RiskLevel to a structured
TriageClassification containing:
  - protocol_action  : what the system recommends (protocol-neutral, not diagnostic)
  - escalation_target: which team to notify
  - time_to_intervention_minutes: urgency window

IMPORTANT:
  - Language must be protocol-neutral: "Activate hospital emergency protocol"
    NOT "Call code blue" (hospital-specific terminology).
  - These are guidance signals for trained clinical staff, NOT automated orders.
  - "potential red flag detected" framing must be preserved in all descriptions.
"""
from dataclasses import dataclass, field
from typing import List, Optional

from app.rules.red_flags import RedFlagResult, SEVERITY_PRIORITY_SCORE


# ---------------------------------------------------------------------------
# Category → escalation target mapping
# Override per hospital via config in production; these are sensible defaults.
# ---------------------------------------------------------------------------
_CATEGORY_ESCALATION: dict[str, str] = {
    "CARDIAC":        "On-call cardiology / resuscitation team",
    "NEUROLOGICAL":   "On-call neurology / resuscitation team",
    "ABDOMINAL":      "On-call surgery / emergency team",
    "PSYCHIATRIC":    "On-call psychiatry / mental health team",
    "RESPIRATORY":    "On-call respiratory / emergency team",
    "SEPSIS":         "On-call emergency / infectious disease team",
    "OBSTETRIC":      "On-call obstetrics team",
    "ALLERGIC":       "Emergency / resuscitation team",
    "PEDIATRIC":      "On-call pediatric / emergency team",
    "GENERAL":        "Attending triage staff",
}

# Severity → action message mapping.
# Deliberately generic — hospitals configure their own workflows.
_SEVERITY_ACTION: dict[str, str] = {
    "EMERGENCY":     (
        "Activate hospital emergency protocol. Immediate clinical assessment required. "
        "Alert the appropriate on-call team without delay."
    ),
    "HIGH_PRIORITY": (
        "Alert triage staff immediately. Patient requires urgent clinical review "
        "before next scheduled assessment."
    ),
    "WARNING":       (
        "Flag for prompt clinical review. Escalate if condition changes or staff "
        "assess higher urgency on direct examination."
    ),
    "NORMAL":        (
        "No immediate action required. Continue standard triage protocol."
    ),
}

# Severity → recommended time-to-intervention (minutes)
_SEVERITY_TTI: dict[str, int] = {
    "EMERGENCY":     5,
    "HIGH_PRIORITY": 15,
    "WARNING":       30,
    "NORMAL":        120,
}


@dataclass
class TriageClassification:
    """
    Output of the TriageClassifier.
    All language is protocol-neutral and safe for multi-hospital deployment.
    """
    overall_severity: str                       # highest severity across all flags
    priority_score: int                         # 0–100 for DB sort ordering
    protocol_action: str                        # what to do — generic, not hospital-specific
    escalation_targets: List[str]               # which teams to contact
    time_to_intervention_minutes: int           # urgency window
    clinical_categories: List[str]              # distinct categories from triggered flags
    flag_count: int                             # how many distinct red flags fired
    requires_immediate_attention: bool


class TriageClassifier:
    """
    Maps a list of RedFlagResults to a structured TriageClassification.

    Designed to be injected into the history processing pipeline after the
    deterministic RedFlagEngine runs.  Does NOT call any LLM.
    """

    def classify(
        self,
        flags: List[RedFlagResult],
        overall_severity: str,
    ) -> Optional[TriageClassification]:
        """
        Produce a TriageClassification from evaluated red flags.

        Args:
            flags: output of RedFlagEngine.evaluate()
            overall_severity: highest RiskLevel across all flags

        Returns:
            TriageClassification, or None if overall_severity is NORMAL and no flags fired.
        """
        if not flags and overall_severity == "NORMAL":
            return None

        priority_score = SEVERITY_PRIORITY_SCORE.get(overall_severity, 0)

        # Collect distinct escalation targets and categories (order-preserving dedup)
        seen_targets: set[str] = set()
        seen_categories: set[str] = set()
        escalation_targets: List[str] = []
        clinical_categories: List[str] = []

        for flag in flags:
            cat = flag.category
            target = _CATEGORY_ESCALATION.get(cat, "Attending triage staff")
            if cat not in seen_categories:
                seen_categories.add(cat)
                clinical_categories.append(cat)
            if target not in seen_targets:
                seen_targets.add(target)
                escalation_targets.append(target)

        requires_immediate = any(f.requires_immediate_attention for f in flags)

        return TriageClassification(
            overall_severity=overall_severity,
            priority_score=priority_score,
            protocol_action=_SEVERITY_ACTION.get(
                overall_severity, _SEVERITY_ACTION["NORMAL"]
            ),
            escalation_targets=escalation_targets,
            time_to_intervention_minutes=_SEVERITY_TTI.get(overall_severity, 120),
            clinical_categories=clinical_categories,
            flag_count=len(flags),
            requires_immediate_attention=requires_immediate,
        )
