"""
Dialogue Manager — Adaptive clinical questioning engine.
Phase 3 will implement full LLM-powered adaptive questioning.
This stub provides the interface and deterministic question selection.
"""
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class NextQuestion:
    question_id: str
    question_text: str
    hindi_text: Optional[str]
    section_type: str
    options: Optional[List[dict]]
    input_type: str  # 'VOICE_OR_TOUCH' | 'VOICE_ONLY' | 'TOUCH_ONLY'


# Structured clinical question ontology (subset for Chief Complaint + HPI)
# Phase 3: Load from database; support complaint-specific modules
QUESTION_BANK = {
    "CHIEF_COMPLAINT": [
        {
            "id": "cc_001",
            "text": "What is the main problem that brought you here today?",
            "hindi_text": "आज आप यहाँ किस मुख्य समस्या के लिए आए हैं?",
            "input_type": "VOICE_OR_TOUCH",
            "options": None,
        },
        {
            "id": "cc_002",
            "text": "How long have you had this problem?",
            "hindi_text": "यह समस्या आपको कितने समय से है?",
            "input_type": "VOICE_OR_TOUCH",
            "options": [
                {"id": "o1", "label": "Today", "hindi_label": "आज", "value": "today"},
                {"id": "o2", "label": "Few days", "hindi_label": "कुछ दिन", "value": "few_days"},
                {"id": "o3", "label": "Weeks", "hindi_label": "हफ्ते", "value": "weeks"},
                {"id": "o4", "label": "Months", "hindi_label": "महीने", "value": "months"},
                {"id": "o5", "label": "Years", "hindi_label": "सालों से", "value": "years"},
            ],
        },
    ],
    "HPI": [
        {
            "id": "hpi_001",
            "text": "How severe is the pain or discomfort on a scale of 1 to 10?",
            "hindi_text": "1 से 10 के पैमाने पर दर्द या तकलीफ कितनी है?",
            "input_type": "VOICE_OR_TOUCH",
            "options": [
                {"id": f"s{i}", "label": str(i), "value": str(i)} for i in range(1, 11)
            ],
        },
        {
            "id": "hpi_002",
            "text": "Does the pain go anywhere else?",
            "hindi_text": "क्या दर्द कहीं और भी जाता है?",
            "input_type": "VOICE_OR_TOUCH",
            "options": [
                {"id": "r1", "label": "Yes", "hindi_label": "हाँ", "value": "yes"},
                {"id": "r2", "label": "No", "hindi_label": "नहीं", "value": "no"},
            ],
        },
    ],
    "MEDICATIONS": [
        {
            "id": "med_001",
            "text": "Are you currently taking any medicines?",
            "hindi_text": "क्या आप अभी कोई दवाई ले रहे हैं?",
            "input_type": "VOICE_OR_TOUCH",
            "options": [
                {"id": "m1", "label": "Yes", "hindi_label": "हाँ", "value": "yes"},
                {"id": "m2", "label": "No", "hindi_label": "नहीं", "value": "no"},
            ],
        },
    ],
    "ALLERGIES": [
        {
            "id": "allergy_001",
            "text": "Do you have any known allergies to medicines or food?",
            "hindi_text": "क्या आपको किसी दवाई या खाने से एलर्जी है?",
            "input_type": "VOICE_OR_TOUCH",
            "options": [
                {"id": "a1", "label": "Yes", "hindi_label": "हाँ", "value": "yes"},
                {"id": "a2", "label": "No", "hindi_label": "नहीं", "value": "no"},
                {"id": "a3", "label": "Not sure", "hindi_label": "पक्का नहीं", "value": "unsure"},
            ],
        },
    ],
}


class DialogueManager:
    """
    Manages the adaptive clinical interview flow.
    
    Phase 3 implementation will:
    - Use Gemini to analyze collected answers
    - Determine next question based on clinical template + conditional branches
    - Detect when a section is complete
    - Trigger red-flag follow-ups
    """

    def get_questions_for_section(self, section_type: str) -> List[dict]:
        """Return all questions for a given section."""
        return QUESTION_BANK.get(section_type, [])

    def get_next_question(
        self,
        section_type: str,
        answered_question_ids: List[str],
        collected_data: dict,
    ) -> Optional[NextQuestion]:
        """
        Determine the next question to ask.
        
        Currently uses simple sequential ordering.
        Phase 3: Replace with LLM-powered adaptive selection.
        """
        questions = QUESTION_BANK.get(section_type, [])
        for q in questions:
            if q["id"] not in answered_question_ids:
                return NextQuestion(
                    question_id=q["id"],
                    question_text=q["text"],
                    hindi_text=q.get("hindi_text"),
                    section_type=section_type,
                    options=q.get("options"),
                    input_type=q.get("input_type", "VOICE_OR_TOUCH"),
                )
        return None  # Section complete

    def is_section_complete(
        self,
        section_type: str,
        answered_question_ids: List[str],
    ) -> bool:
        """Check if all required questions in a section have been answered."""
        questions = QUESTION_BANK.get(section_type, [])
        answered_set = set(answered_question_ids)
        return all(q["id"] in answered_set for q in questions)
