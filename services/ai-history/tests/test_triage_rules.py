"""
Unit tests for TriageClassifier.

Tests verify:
  - Correct protocol_action per severity level
  - Correct time_to_intervention_minutes per severity
  - Correct escalation_target per clinical category
  - Correct priority_score mapping
  - None returned for NORMAL + no flags
  - Multi-category deduplication
"""
import pytest
from app.rules.red_flags import RedFlagResult
from app.rules.triage_rules import TriageClassifier, TriageClassification


def make_flag(
    type_: str,
    category: str,
    severity: str,
    requires_immediate: bool = True,
) -> RedFlagResult:
    return RedFlagResult(
        type=type_,
        description=f"Potential red flag detected — {category}: test flag",
        severity=severity,
        category=category,
        triggered_by=["test_trigger"],
        requires_immediate_attention=requires_immediate,
    )


class TestTriageClassifierNormal:
    def test_no_flags_normal_returns_none(self):
        c = TriageClassifier()
        result = c.classify(flags=[], overall_severity="NORMAL")
        assert result is None

    def test_flags_but_normal_still_produces_classification(self):
        # Edge case: flags list non-empty but severity somehow NORMAL
        # (shouldn't happen in production but must not crash)
        c = TriageClassifier()
        flags = [make_flag("SEVERE_PAIN", "GENERAL", "NORMAL", requires_immediate=False)]
        result = c.classify(flags=flags, overall_severity="NORMAL")
        # Returns a classification (not None) because flags are non-empty
        assert result is not None
        assert result.priority_score == 0


class TestTriageClassifierSeverity:
    def test_emergency_priority_score(self):
        c = TriageClassifier()
        flags = [make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY")]
        result = c.classify(flags, "EMERGENCY")
        assert isinstance(result, TriageClassification)
        assert result.priority_score == 100

    def test_high_priority_score(self):
        c = TriageClassifier()
        flags = [make_flag("MENINGITIS", "NEUROLOGICAL", "HIGH_PRIORITY")]
        result = c.classify(flags, "HIGH_PRIORITY")
        assert result.priority_score == 75

    def test_warning_priority_score(self):
        c = TriageClassifier()
        flags = [make_flag("RESPIRATORY_DISTRESS", "RESPIRATORY", "WARNING", requires_immediate=False)]
        result = c.classify(flags, "WARNING")
        assert result.priority_score == 50


class TestTriageClassifierTimings:
    def test_emergency_tti(self):
        c = TriageClassifier()
        result = c.classify([make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY")], "EMERGENCY")
        assert result.time_to_intervention_minutes == 5

    def test_high_priority_tti(self):
        c = TriageClassifier()
        result = c.classify([make_flag("MENINGITIS", "NEUROLOGICAL", "HIGH_PRIORITY")], "HIGH_PRIORITY")
        assert result.time_to_intervention_minutes == 15

    def test_warning_tti(self):
        c = TriageClassifier()
        result = c.classify([make_flag("SEVERE_PAIN", "GENERAL", "WARNING", False)], "WARNING")
        assert result.time_to_intervention_minutes == 30


class TestTriageClassifierProtocolLanguage:
    """Verifies protocol-neutral language — no hospital-specific codes."""

    def test_emergency_action_is_generic(self):
        c = TriageClassifier()
        result = c.classify([make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY")], "EMERGENCY")
        action = result.protocol_action.lower()
        # Must NOT contain hospital-specific codes
        assert "code blue" not in action
        assert "code red" not in action
        # Must contain protocol-neutral instruction
        assert "emergency protocol" in action or "immediate" in action

    def test_high_priority_action_generic(self):
        c = TriageClassifier()
        result = c.classify([make_flag("SUICIDAL_IDEATION", "PSYCHIATRIC", "HIGH_PRIORITY")], "HIGH_PRIORITY")
        action = result.protocol_action.lower()
        assert "code" not in action  # no color codes
        assert "alert" in action or "urgent" in action

    def test_warning_action_generic(self):
        c = TriageClassifier()
        result = c.classify([make_flag("SEVERE_PAIN", "GENERAL", "WARNING", False)], "WARNING")
        action = result.protocol_action.lower()
        assert "review" in action or "flag" in action or "escalate" in action


class TestTriageClassifierEscalationTargets:
    def test_cardiac_target(self):
        c = TriageClassifier()
        result = c.classify([make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY")], "EMERGENCY")
        targets_lower = [t.lower() for t in result.escalation_targets]
        assert any("cardio" in t or "resus" in t for t in targets_lower)

    def test_neurological_target(self):
        c = TriageClassifier()
        result = c.classify([make_flag("POTENTIAL_STROKE", "NEUROLOGICAL", "EMERGENCY")], "EMERGENCY")
        targets_lower = [t.lower() for t in result.escalation_targets]
        assert any("neuro" in t or "resus" in t for t in targets_lower)

    def test_obstetric_target(self):
        c = TriageClassifier()
        result = c.classify([make_flag("ECLAMPSIA_RISK", "OBSTETRIC", "EMERGENCY")], "EMERGENCY")
        targets_lower = [t.lower() for t in result.escalation_targets]
        assert any("obstet" in t for t in targets_lower)

    def test_psychiatric_target(self):
        c = TriageClassifier()
        result = c.classify([make_flag("SUICIDAL_IDEATION", "PSYCHIATRIC", "HIGH_PRIORITY")], "HIGH_PRIORITY")
        targets_lower = [t.lower() for t in result.escalation_targets]
        assert any("psych" in t or "mental" in t for t in targets_lower)

    def test_pediatric_target(self):
        c = TriageClassifier()
        result = c.classify([make_flag("PEDIATRIC_EMERGENCY", "PEDIATRIC", "EMERGENCY")], "EMERGENCY")
        targets_lower = [t.lower() for t in result.escalation_targets]
        assert any("pediatric" in t or "paediatric" in t or "child" in t for t in targets_lower)


class TestTriageClassifierMultiCategory:
    def test_deduplicates_same_category(self):
        c = TriageClassifier()
        flags = [
            make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY"),
            make_flag("AORTIC_DISSECTION", "CARDIAC", "EMERGENCY"),
        ]
        result = c.classify(flags, "EMERGENCY")
        assert result.clinical_categories.count("CARDIAC") == 1, \
            "Duplicate category should be deduplicated"

    def test_multiple_categories_all_present(self):
        c = TriageClassifier()
        flags = [
            make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY"),
            make_flag("POTENTIAL_STROKE", "NEUROLOGICAL", "EMERGENCY"),
        ]
        result = c.classify(flags, "EMERGENCY")
        assert "CARDIAC" in result.clinical_categories
        assert "NEUROLOGICAL" in result.clinical_categories
        assert len(result.escalation_targets) == 2

    def test_flag_count(self):
        c = TriageClassifier()
        flags = [
            make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY"),
            make_flag("SEPSIS_RISK", "SEPSIS", "EMERGENCY"),
            make_flag("MENINGITIS", "NEUROLOGICAL", "HIGH_PRIORITY"),
        ]
        result = c.classify(flags, "EMERGENCY")
        assert result.flag_count == 3


class TestTriageClassifierRequiresImmediate:
    def test_immediate_attention_propagated(self):
        c = TriageClassifier()
        flags = [make_flag("POTENTIAL_ACS", "CARDIAC", "EMERGENCY", requires_immediate=True)]
        result = c.classify(flags, "EMERGENCY")
        assert result.requires_immediate_attention is True

    def test_no_immediate_when_all_false(self):
        c = TriageClassifier()
        flags = [make_flag("SEVERE_PAIN", "GENERAL", "WARNING", requires_immediate=False)]
        result = c.classify(flags, "WARNING")
        assert result.requires_immediate_attention is False
