from typing import Optional

def match_module_mock(complaint_text: str) -> Optional[str]:
    from app.rules.red_flags import _get_positive_triggers
    
    _HPI_MODULES = {
        "chest_pain": {"match": ["chest pain", "chest", "chest tightness"]},
        "headache": {"match": ["headache", "head ache", "head pain"]},
        "abdominal_pain": {"match": ["stomach", "abdominal", "abdomen"]},
        "breathlessness": {"match": ["breath", "breathless", "shortness of breath"]},
        "fever": {"match": ["fever", "temperature"]},
        "general": {"match": []}
    }
    
    text = (complaint_text or "").lower()
    if not text.strip():
        return None

    best: Optional[str] = None
    best_index = float('inf')
    
    for key, module in _HPI_MODULES.items():
        if key == "general":
            continue
            
        keywords = module.get("match", [])
        if not keywords:
            continue
            
        positive_matches = _get_positive_triggers(text, keywords)
        
        for match in positive_matches:
            idx = text.find(match.lower())
            if idx != -1 and idx < best_index:
                best_index = idx
                best = key
                
    return best

tests = [
    "I have had a severe headache since this morning. My right arm feels weak... I don't have chest pain...",
    "severe headache",
    "terrible headache with right arm weakness",
    "chest pain since morning",
    "pressure in my chest",
    "stomach pain and vomiting",
    "I am struggling to breathe", # Wait, "struggling to breathe" isn't in match list above!
    "I have a headache but no chest pain",
    "I have chest pain but no headache",
]

for t in tests:
    print(f"[{match_module_mock(t)}] <- {t}")
