import pytest
from fastapi.testclient import TestClient

from app.clients.llm import LLMUnavailableError
from app.main import app
from app.models.schemas import ExtractionResult

client = TestClient(app)

EXTRACTION = ExtractionResult.model_validate(
    {
        "medications": [],
        "allergies": [],
        "symptoms": [
            {
                "name": "chest pain",
                "present": True,
                "onset": "today",
                "duration": "1 hour",
                "severity": "10/10",
                "confidence": 0.9,
            }
        ],
        "hpi": {
            "onset": "today",
            "duration": "1 hour",
            "character": "tight",
            "location": "chest",
            "radiation": "arm",
            "severity": "10",
            "aggravating": [],
            "relieving": [],
            "associated_symptoms": ["sweating"],
        },
        "narrative": "Patient presents with severe chest pain.",
    }
)


def _post(raw_answer="I have severe chest pain and sweating.", confidence=None):
    answer = {
        "question_id": "q1",
        "question_text": "What is wrong?",
        "answer_type": "TEXT",
        "raw_answer": raw_answer,
    }
    if confidence is not None:
        answer["confidence"] = confidence
    return client.post(
        "/history/process",
        json={
            "session_id": "test_1",
            "patient_id": "p_1",
            "language": "en",
            "section_type": "HPI",
            "answers": [answer],
        },
    )


def test_process_history_with_red_flags(mocker):
    mock_llm = mocker.patch('app.routers.history.ExtractionPipeline.extract_entities')
    mock_llm.return_value = (EXTRACTION, "mock_model")

    response = _post()

    assert response.status_code == 200
    data = response.json()
    assert len(data["red_flags"]) > 0
    assert data["risk_level"] == "EMERGENCY"
    assert data["red_flags"][0]["type"] == "POTENTIAL_ACS"
    assert data["model_used"] == "mock_model"
    assert data["narrative"] == "Patient presents with severe chest pain."
    # Confidence now reflects the extracted entities instead of a hardcoded 0.9.
    assert data["confidence"] == pytest.approx(0.9)


def test_red_flags_are_not_duplicated(mocker):
    """Each rule fires at most once even though structured phrases repeat it."""
    mock_llm = mocker.patch('app.routers.history.ExtractionPipeline.extract_entities')
    mock_llm.return_value = (EXTRACTION, "mock_model")

    data = _post().json()

    types = [flag["type"] for flag in data["red_flags"]]
    assert len(types) == len(set(types))


def test_structured_symptoms_reach_the_engine(mocker):
    """A transcript with no trigger words still flags when extraction supplies them.

    This is the Section L hand-off: the patient never says "chest pain", but the
    structured HPI does, and urgency stays deterministic.
    """
    mock_llm = mocker.patch('app.routers.history.ExtractionPipeline.extract_entities')
    mock_llm.return_value = (EXTRACTION, "mock_model")

    data = _post(raw_answer="something feels really wrong in there").json()

    assert data["risk_level"] == "EMERGENCY"
    assert data["red_flags"][0]["type"] == "POTENTIAL_ACS"


def test_denied_symptoms_do_not_trigger_flags(mocker):
    """A symptom recorded as absent must not be fed to the matcher."""
    mock_llm = mocker.patch('app.routers.history.ExtractionPipeline.extract_entities')
    mock_llm.return_value = (
        ExtractionResult.model_validate(
            {
                "medications": [],
                "allergies": [],
                "symptoms": [
                    {
                        "name": "shortness of breath",
                        "present": False,
                        "onset": None,
                        "duration": None,
                        "severity": None,
                        "confidence": 0.9,
                    }
                ],
                "hpi": None,
                "narrative": "No respiratory symptoms.",
            }
        ),
        "mock_model",
    )

    data = _post(raw_answer="I feel fine, no breathing trouble at all").json()

    assert data["red_flags"] == []
    assert data["risk_level"] == "NORMAL"


def test_extraction_failure_still_returns_red_flags(mocker):
    """Section J.3: never lose deterministic safety output to an LLM outage."""
    mock_llm = mocker.patch('app.routers.history.ExtractionPipeline.extract_entities')
    mock_llm.side_effect = LLMUnavailableError("both providers down")

    response = _post(confidence=0.72)

    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "EMERGENCY"
    assert data["red_flags"][0]["type"] == "POTENTIAL_ACS"
    assert data["model_used"] is None
    assert data["narrative"] is None
    assert data["extracted_symptoms"] == []
    # No extraction means no entity confidence to report.
    assert data["confidence"] == 0.0
