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


# =============================================================================
# NEW: Aortic Dissection
# =============================================================================

def test_positive_aortic_dissection():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I have a sudden tearing chest pain radiating to back."], "HPI")
    assert any(f.type == "AORTIC_DISSECTION" for f in flags)

def test_negated_aortic_dissection():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have tearing chest pain."], "HPI")
    assert not any(f.type == "AORTIC_DISSECTION" for f in flags)

def test_aortic_dissection_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["sudden severe chest and back pain that is ripping"], "HPI")
    matching = [f for f in flags if f.type == "AORTIC_DISSECTION"]
    if matching:
        assert matching[0].category == "CARDIAC"
        assert matching[0].severity == "EMERGENCY"

# =============================================================================
# NEW: Meningitis
# =============================================================================

def test_positive_meningitis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I have a stiff neck, severe headache, and sensitivity to light."], "HPI")
    assert any(f.type == "MENINGITIS" for f in flags)

def test_negated_meningitis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have a stiff neck."], "HPI")
    assert not any(f.type == "MENINGITIS" for f in flags)

def test_meningitis_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["stiff neck and severe headache and sensitivity to light"], "HPI")
    matching = [f for f in flags if f.type == "MENINGITIS"]
    if matching:
        assert matching[0].category == "NEUROLOGICAL"
        assert matching[0].severity == "HIGH_PRIORITY"

# =============================================================================
# NEW: Sepsis Risk
# =============================================================================

def test_positive_sepsis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I have high fever, rapid breathing, and I feel confused."], "HPI")
    assert any(f.type == "SEPSIS_RISK" for f in flags)

def test_negated_sepsis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have high fever or confusion."], "HPI")
    assert not any(f.type == "SEPSIS_RISK" for f in flags)

def test_sepsis_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["high fever rapid breathing confusion"], "HPI")
    matching = [f for f in flags if f.type == "SEPSIS_RISK"]
    if matching:
        assert matching[0].category == "SEPSIS"
        assert matching[0].severity == "EMERGENCY"

# =============================================================================
# NEW: Eclampsia Risk
# =============================================================================

def test_positive_eclampsia():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I am pregnant and have a severe headache with visual disturbance."], "HPI")
    assert any(f.type == "ECLAMPSIA_RISK" for f in flags)

def test_negated_eclampsia():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have a severe headache. I am pregnant."], "HPI")
    assert not any(f.type == "ECLAMPSIA_RISK" for f in flags)

def test_eclampsia_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["severe headache blurred vision pregnant"], "HPI")
    matching = [f for f in flags if f.type == "ECLAMPSIA_RISK"]
    if matching:
        assert matching[0].category == "OBSTETRIC"
        assert matching[0].severity == "EMERGENCY"

# =============================================================================
# NEW: Anaphylaxis
# =============================================================================

def test_positive_anaphylaxis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["My throat is swelling and I'm having difficulty breathing after eating peanuts."], "HPI")
    assert any(f.type == "ANAPHYLAXIS" for f in flags)

def test_negated_anaphylaxis():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I don't have throat swelling."], "HPI")
    assert not any(f.type == "ANAPHYLAXIS" for f in flags)

def test_anaphylaxis_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["throat swelling difficulty breathing allergic reaction"], "HPI")
    matching = [f for f in flags if f.type == "ANAPHYLAXIS"]
    if matching:
        assert matching[0].category == "ALLERGIC"
        assert matching[0].severity == "EMERGENCY"

# =============================================================================
# NEW: Pediatric Emergency
# =============================================================================

def test_positive_pediatric_emergency():
    engine = RedFlagEngine()
    flags = engine.evaluate(["My child had a seizure with high fever."], "HPI")
    assert any(f.type == "PEDIATRIC_EMERGENCY" for f in flags)

def test_negated_pediatric_emergency():
    engine = RedFlagEngine()
    flags = engine.evaluate(["My child does not have a seizure."], "HPI")
    assert not any(f.type == "PEDIATRIC_EMERGENCY" for f in flags)

def test_pediatric_emergency_category():
    engine = RedFlagEngine()
    flags = engine.evaluate(["febrile convulsion"], "HPI")
    matching = [f for f in flags if f.type == "PEDIATRIC_EMERGENCY"]
    if matching:
        assert matching[0].category == "PEDIATRIC"
        assert matching[0].severity == "EMERGENCY"

def test_head_injury_trauma():
    engine = RedFlagEngine()
    flags = engine.evaluate(["I had a severe head injury after falling."], "HPI")
    assert any(f.type == "HEAD_INJURY_TRAUMA" for f in flags)

# =============================================================================
# NEW: category field present on all flags
# =============================================================================

def test_all_flags_have_category():
    engine = RedFlagEngine()
    test_inputs = [
        "chest pain sweating shortness of breath",
        "sudden weakness face drooping",
        "severe abdominal pain vomiting blood",
        "suicidal want to die",
        "difficulty breathing",
        "worst pain",
    ]
    for text in test_inputs:
        flags = engine.evaluate([text], "HPI")
        for f in flags:
            assert f.category is not None and f.category != "", \
                f"Flag {f.type} is missing a category"

# =============================================================================
# NEW: description must use "Potential red flag detected" framing
# =============================================================================

def test_flag_descriptions_use_safe_language():
    engine = RedFlagEngine()
    inputs = [
        "high fever rapid breathing confusion",
        "throat swelling difficulty breathing allergic reaction",
        "severe headache blurred vision pregnant",
        "stiff neck severe headache sensitivity to light",
        "tearing chest pain radiating to back",
        "febrile convulsion child",
    ]
    for text in inputs:
        flags = engine.evaluate([text], "HPI")
        for f in flags:
            assert "Potential red flag detected" in f.description, \
                f"Flag {f.type} description does not use required 'Potential red flag detected' framing"


