import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_section_isolation():
    # Simulate cc_main answering chest pain
    res = client.post(
        "/dialogue/next-question",
        json={
            "session_id": "test_1",
            "section_type": "HPI",
            "language": "en",
            "chief_complaint": "chest pain",
            "answered_question_ids": ["cc_main"],
            "collected_answers": [
                {
                    "question_id": "cc_main",
                    "answer_type": "TEXT",
                    "raw_answer": "chest pain"
                }
            ]
        }
    )
    
    assert res.status_code == 200
    # HPI routes to chest_pain module.
    
    # Now simulate a PAST_MEDICAL_HISTORY request that happens later.
    # The frontend is now fixed to ONLY send PMH answers.
    res2 = client.post(
        "/dialogue/next-question",
        json={
            "session_id": "test_1",
            "section_type": "PAST_MEDICAL_HISTORY",
            "language": "en",
            "chief_complaint": "chest pain",
            "answered_question_ids": ["pmh_1"],
            "collected_answers": [
                {
                    "question_id": "pmh_1",
                    "answer_type": "TEXT",
                    "raw_answer": "I have asthma."
                }
            ]
        }
    )
    
    assert res2.status_code == 200
    data = res2.json()
    assert not data["section_complete"]
    # The next question should be pmh_conditions, not an HPI question!
    assert data["question"]["id"] == "pmh_conditions"

def test_process_history_isolation(mocker):
    # Mock LLM to avoid real API calls
    mocker.patch(
        "app.pipelines.extraction.ExtractionPipeline.extract_entities",
        return_value=(None, "mock")
    )
    
    # Process PMH section with ONLY PMH answers (as sent by fixed frontend)
    res = client.post(
        "/history/process",
        json={
            "session_id": "test_1",
            "patient_id": "p_1",
            "language": "en",
            "section_type": "PAST_MEDICAL_HISTORY",
            "answers": [
                {
                    "question_id": "pmh_1",
                    "question_text": "Do you have any past medical conditions?",
                    "answer_type": "TEXT",
                    "raw_answer": "I have asthma.",
                    "section_type": "PAST_MEDICAL_HISTORY"
                }
            ]
        }
    )
    
    assert res.status_code == 200
    data = res.json()
    # It should not trigger ACS red flag because "chest pain" from CC is NOT in the PMH payload!
    flags = [f["type"] for f in data["red_flags"]]
    assert "POTENTIAL_ACS" not in flags
