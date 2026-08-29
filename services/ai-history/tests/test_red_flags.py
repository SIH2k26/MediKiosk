import pytest
from app.rules.red_flags import RedFlagEngine

def test_positive_respiratory_distress():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am struggling to breathe."], "HPI")
    assert any(f.type == "RESPIRATORY_DISTRESS" for f in flags)

def test_negated_respiratory_distress():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I've never had swelling or difficulty breathing."], "HPI")
    assert not any(f.type == "RESPIRATORY_DISTRESS" for f in flags)

def test_no_shortness_of_breath():
    engine = RedFlagEngine()
    flags = engine.evaluate(["No shortness of breath."], "HPI")
    assert not any(f.type == "RESPIRATORY_DISTRESS" for f in flags)

def test_positive_and_negative_respiratory():
    engine = RedFlagEngine()
    # Mixed sentence
    flags = engine.evaluate(["I don't have difficulty breathing, but I do have chest pain."], "HPI")
    assert not any(f.type == "RESPIRATORY_DISTRESS" for f in flags)
    assert any(f.type == "POTENTIAL_ACS" for f in flags)

def test_positive_acs():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I have severe chest pain."], "HPI")
    assert any(f.type == "POTENTIAL_ACS" for f in flags)

def test_negated_acs():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have chest pain."], "HPI")
    assert not any(f.type == "POTENTIAL_ACS" for f in flags)

def test_positive_stroke():
    engine = RedFlagEngine()
    flags = engine.evaluate(["My right arm suddenly became weak.", "I have facial drooping and slurred speech."], "HPI")
    assert any(f.type == "POTENTIAL_STROKE" for f in flags)

def test_negated_stroke():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have facial drooping."], "HPI")
    assert not any(f.type == "POTENTIAL_STROKE" for f in flags)

def test_positive_abdominal():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am vomiting blood."], "HPI")
    assert any(f.type == "SEVERE_ABDOMINAL" for f in flags)

def test_negated_abdominal():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am not vomiting blood.", "I have no blood in my stool."], "HPI")
    assert not any(f.type == "SEVERE_ABDOMINAL" for f in flags)

def test_positive_suicidal_ideation():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I just want to die."], "HPI")
    assert any(f.type == "SUICIDAL_IDEATION" for f in flags)

def test_negated_suicidal_ideation():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't want to die."], "HPI")
    assert not any(f.type == "SUICIDAL_IDEATION" for f in flags)

def test_positive_severe_pain():
    engine = RedFlagEngine()
    flags = engine.evaluate(["This is the worst pain I've ever felt, it's unbearable pain."], "HPI")
    assert any(f.type == "SEVERE_PAIN" for f in flags)

def test_negated_severe_pain():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I haven't experienced severe pain."], "HPI")
    assert not any(f.type == "SEVERE_PAIN" for f in flags)

def test_contextual_negation():
    engine = RedFlagEngine()
    # "I've had a cough for three days. I don't have shortness of breath. I don't have chest pain either."
    flags = engine.evaluate(["I've had a cough for three days. I don't have shortness of breath. I don't have chest pain either."], "HPI")
    assert not any(f.type == "RESPIRATORY_DISTRESS" for f in flags)
    assert not any(f.type == "POTENTIAL_ACS" for f in flags)

    # "I've had chest pain since this morning. I don't have shortness of breath, but the pain spreads to my left arm."
    flags = engine.evaluate(["I've had chest pain since this morning. I don't have shortness of breath, but the pain spreads to my left arm."], "HPI")
    assert any(f.type == "POTENTIAL_ACS" for f in flags)
    assert not any(f.type == "RESPIRATORY_DISTRESS" for f in flags)

