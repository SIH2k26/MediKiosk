import pytest
from app.rules.red_flags import RedFlagEngine

def test_red_flags_no_duplication():
    engine = RedFlagEngine()
    flags = engine.evaluate(
        answers=["chest pain and sweating", "more chest pain and sweating"],
        section_type="HPI"
    )
    
    # Even if triggers appear multiple times, rule should trigger once
    acs_flags = [f for f in flags if f.type == "POTENTIAL_ACS"]
    assert len(acs_flags) == 1
