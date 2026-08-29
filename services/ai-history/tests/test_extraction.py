import pytest

from app.models.schemas import AnswerType, HistoryAnswerInput
from app.pipelines.extraction import ExtractionPipeline

RAW_EXTRACTION = {
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


@pytest.fixture
def mock_llm_client(mocker):
    return mocker.patch('app.pipelines.extraction.LLMClient.complete_json')


def _answers():
    return [
        HistoryAnswerInput(
            question_id="q1",
            question_text="What is wrong?",
            answer_type=AnswerType.TEXT,
            raw_answer="I have severe chest pain and sweating.",
        )
    ]


@pytest.mark.asyncio
async def test_extraction_pipeline(mock_llm_client):
    mock_llm_client.return_value = (RAW_EXTRACTION, "openai/gpt-oss-20b")

    extracted, model = await ExtractionPipeline.extract_entities(_answers(), "HPI")

    assert model == "openai/gpt-oss-20b"
    # The pipeline now returns a validated model, not a raw dict.
    assert extracted.symptoms[0].name == "chest pain"
    assert extracted.hpi.radiation == "arm"
    assert extracted.narrative.startswith("Patient presents")
    mock_llm_client.assert_called_once()


@pytest.mark.asyncio
async def test_extraction_passes_a_validator(mock_llm_client):
    """The LLM call must carry a validator, or invalid output could slip through."""
    mock_llm_client.return_value = (RAW_EXTRACTION, "openai/gpt-oss-20b")

    await ExtractionPipeline.extract_entities(_answers(), "HPI")

    validator = mock_llm_client.call_args.kwargs["validator"]
    assert validator is not None
    with pytest.raises(Exception):
        validator({"symptoms": [{"name": "x"}]})  # missing required fields


@pytest.mark.asyncio
async def test_percentage_confidence_is_rescaled(mock_llm_client):
    """LLMs report confidence as 0-100 often enough that it must not 422."""
    payload = {
        **RAW_EXTRACTION,
        "symptoms": [{**RAW_EXTRACTION["symptoms"][0], "confidence": 95}],
    }
    mock_llm_client.return_value = (payload, "openai/gpt-oss-20b")

    extracted, _ = await ExtractionPipeline.extract_entities(_answers(), "HPI")

    assert extracted.symptoms[0].confidence == pytest.approx(0.95)
