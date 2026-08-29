import pytest
from fastapi.testclient import TestClient
import base64
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_asr_providers(mocker):
    sarvam_mock = mocker.patch('app.routers.asr.SarvamASRClient.transcribe')
    whisper_mock = mocker.patch('app.routers.asr.WhisperASRClient.transcribe')
    # Configure config settings
    mocker.patch('app.routers.asr.settings.sarvam_api_key', 'test_key')
    mocker.patch('app.routers.asr.settings.groq_api_key', 'test_key')
    return sarvam_mock, whisper_mock

def test_asr_transcribe_primary_success(mock_asr_providers):
    sarvam_mock, whisper_mock = mock_asr_providers
    sarvam_mock.return_value = {"transcript": "Test audio", "language": "en", "confidence": 0.95}

    response = client.post(
        "/asr/transcribe",
        json={"audio_base64": base64.b64encode(b"dummy").decode(), "language": "en", "format": "webm"}
    )
    
    assert response.status_code == 200
    assert response.json()["transcript"] == "Test audio"
    assert response.json()["provider_used"] == "sarvam"
    whisper_mock.assert_not_called()

def test_asr_transcribe_fallback(mock_asr_providers):
    sarvam_mock, whisper_mock = mock_asr_providers
    sarvam_mock.side_effect = Exception("Sarvam down")
    whisper_mock.return_value = {"transcript": "Whisper audio", "language": "en", "confidence": 0.85}

    response = client.post(
        "/asr/transcribe",
        json={"audio_base64": base64.b64encode(b"dummy").decode(), "language": "en"}
    )
    
    assert response.status_code == 200
    assert response.json()["transcript"] == "Whisper audio"
    assert response.json()["provider_used"] == "whisper"
    sarvam_mock.assert_called_once()
    whisper_mock.assert_called_once()
