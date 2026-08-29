from app.ontology.clinical_ontology import match_module, resolve_module

def test_headache_routing():
    assert match_module("severe headache since this morning") == "headache"
    assert match_module("terrible headache with right arm weakness") == "headache"
    assert match_module("my head hurts badly") == "headache"

def test_chest_pain_routing():
    assert match_module("chest pain since morning") == "chest_pain"
    assert match_module("pressure in my chest") == "chest_pain"

def test_abdominal_routing():
    assert match_module("stomach pain and vomiting") == "abdominal_pain"

def test_respiratory_routing():
    assert match_module("I am struggling to breathe") == "breathlessness"

def test_fever_routing():
    assert match_module("I have had fever for three days") == "fever"

def test_general_routing():
    # Unmatched module
    assert resolve_module("HPI", match_module("some vague problem")) == "general"
    assert resolve_module("HPI", match_module("ghghghg")) == "general"

def test_negation_routing():
    # Mixed symptom resolution
    assert match_module("I have a headache but no chest pain") == "headache"
    assert match_module("I have chest pain but no headache") == "chest_pain"

def test_exact_failure_case_routing():
    text = "I have had a severe headache since this morning. It started suddenly about two hours ago. It's mostly on the right side and feels like a throbbing pressure. I'd rate it 8 out of 10. My right arm feels weak and my speech feels a little strange. I don't have chest pain or difficulty breathing, and I haven't fainted."
    assert match_module(text) == "headache"
