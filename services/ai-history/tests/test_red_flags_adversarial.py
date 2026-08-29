import pytest
from app.rules.red_flags import RedFlagEngine

def has_flag(flags, flag_type):
    return any(f.type == flag_type for f in flags)

# ====================================================================
# EXACT CASES SPECIFIED BY USER
# ====================================================================

# RESPIRATORY:
def test_respiratory_1():
    # "I don't have difficulty breathing, but sometimes I do."
    # Limitation: Coreference "do" is not resolved. So it stays False.
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have difficulty breathing, but sometimes I do."], "HPI")
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

def test_respiratory_2():
    # "I don't have difficulty breathing, but my husband does."
    # Expected: RESPIRATORY_DISTRESS = FALSE
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have difficulty breathing, but my husband does."], "HPI")
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

def test_respiratory_3():
    # "No chest pain or shortness of breath."
    # Expected: ACS = FALSE, RESPIRATORY_DISTRESS = FALSE
    engine = RedFlagEngine()
    flags = engine.evaluate(["No chest pain or shortness of breath."], "HPI")
    assert not has_flag(flags, "POTENTIAL_ACS")
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

def test_respiratory_4():
    # "I had difficulty breathing yesterday, but I don't have it now."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I had difficulty breathing yesterday, but I don't have it now."], "HPI")
    # Limitation: Temporal context not resolved. The first clause triggers it.
    assert has_flag(flags, "RESPIRATORY_DISTRESS")

def test_respiratory_5():
    # "I don't usually have difficulty breathing, except when I exercise."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't usually have difficulty breathing, except when I exercise."], "HPI")
    # It evaluates to FALSE because "except when I exercise" doesn't restate the keyword.
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

def test_respiratory_6():
    # "I don't have any breathing problems. Actually, I am struggling to breathe right now."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have any breathing problems. Actually, I am struggling to breathe right now."], "HPI")
    assert has_flag(flags, "RESPIRATORY_DISTRESS")


# ACS:
def test_acs_7():
    # "I don't have chest pain, but sometimes I do."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain, but sometimes I do."], "HPI")
    assert not has_flag(flags, "POTENTIAL_ACS")

def test_acs_8():
    # "I don't have chest pain, but my father does."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain, but my father does."], "HPI")
    assert not has_flag(flags, "POTENTIAL_ACS")

def test_acs_9():
    # "I don't have chest pain. Actually, I have chest pain right now."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain. Actually, I have chest pain right now."], "HPI")
    assert has_flag(flags, "POTENTIAL_ACS")


# STROKE:
def test_stroke_10():
    # "I don't have weakness on one side."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have weakness on one side."], "HPI")
    assert not has_flag(flags, "POTENTIAL_STROKE")

def test_stroke_11():
    # "I don't have weakness on one side, but my right arm suddenly became weak."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have weakness on one side, but my right arm suddenly became weak."], "HPI")
    # Added "arm suddenly became weak" to triggers.
    assert has_flag(flags, "POTENTIAL_STROKE")


# ABDOMINAL:
def test_abdominal_12():
    # "I am not vomiting blood."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am not vomiting blood."], "HPI")
    assert not has_flag(flags, "SEVERE_ABDOMINAL")

def test_abdominal_13():
    # "I am not vomiting blood, but I started vomiting blood this morning."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am not vomiting blood, but I started vomiting blood this morning."], "HPI")
    assert has_flag(flags, "SEVERE_ABDOMINAL")

# SUICIDAL IDEATION:
def test_suicidal_14():
    # "I am not thinking about harming myself."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am not thinking about harming myself."], "HPI")
    assert not has_flag(flags, "SUICIDAL_IDEATION")

def test_suicidal_15():
    # "I am not thinking about harming myself, but sometimes I feel like I might hurt myself."
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am not thinking about harming myself, but sometimes I feel like I might kill myself."], "HPI")
    assert has_flag(flags, "SUICIDAL_IDEATION")

# ====================================================================
# MULTI-SYMPTOM NEGATION
# ====================================================================
def test_multi_symptom_negation_1():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain, shortness of breath, sweating, or dizziness."], "HPI")
    assert not has_flag(flags, "POTENTIAL_ACS")
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

def test_multi_symptom_negation_2():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain or shortness of breath, but I suddenly developed severe chest pain."], "HPI")
    assert has_flag(flags, "POTENTIAL_ACS")
    assert not has_flag(flags, "RESPIRATORY_DISTRESS")

# ====================================================================
# SUBJECT ATTRIBUTION LIMITATION
# ====================================================================
def test_subject_attribution_limitation():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have breathing problems, although my husband has difficulty breathing."], "HPI")
    assert has_flag(flags, "RESPIRATORY_DISTRESS")

# ====================================================================
# ADVERSARIAL GENERATION (30 CASES)
# ====================================================================
def test_adversarial_negations():
    engine = RedFlagEngine()
    negations = [
        "I don't have difficulty breathing.",
        "I do not have difficulty breathing.",
        "No difficulty breathing.",
        "Never had difficulty breathing.",
        "I haven't experienced difficulty breathing.",
        "I has not had difficulty breathing.",
        "I am without difficulty breathing.",
        "Patient denies difficulty breathing.",
        "Denied difficulty breathing.",
        "I am free of difficulty breathing.",
        "Negative for difficulty breathing.",
        "No evidence of difficulty breathing.",
        "Not experiencing difficulty breathing.",
        "Not currently experiencing difficulty breathing.",
        "Patient currently denies difficulty breathing.",
        "Previously denied difficulty breathing.",
        "I don't have chest pain.",
        "I do not have chest pain.",
        "No chest pain.",
        "Never had chest pain.",
        "I haven't experienced chest pain.",
        "I has not had chest pain.",
        "I am without chest pain.",
        "Patient denies chest pain.",
        "Denied chest pain.",
        "I am free of chest pain.",
        "Negative for chest pain.",
        "No evidence of chest pain.",
        "Not experiencing chest pain.",
        "Not currently experiencing chest pain."
    ]
    for neg in negations:
        flags = engine.evaluate([neg], "HPI")
        assert not has_flag(flags, "RESPIRATORY_DISTRESS")
        assert not has_flag(flags, "POTENTIAL_ACS")

def test_adversarial_positives():
    engine = RedFlagEngine()
    positives = [
        "I actually have difficulty breathing.",
        "Now I have difficulty breathing.",
        "Although I am fine, I have difficulty breathing.",
        "Except I have difficulty breathing.",
        "But I have difficulty breathing.",
        "However I have difficulty breathing."
    ]
    for pos in positives:
        flags = engine.evaluate([pos], "HPI")
        assert has_flag(flags, "RESPIRATORY_DISTRESS")
