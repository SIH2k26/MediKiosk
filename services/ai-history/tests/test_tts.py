import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_tts_synthesize_success(mocker):
    mocker.patch('app.routers.tts.settings.sarvam_api_key', 'test_key')
    mock_synth = mocker.patch('app.routers.tts.SarvamTTSClient.synthesize')
    mock_synth.return_value = b"dummy_audio"

    response = client.post(
        "/tts/synthesize",
        json={"text": "Hello world", "language": "en"}
    )
    
    assert response.status_code == 200
    assert "audio_base64" in response.json()
    assert response.json()["provider_used"] == "sarvam"

def test_tts_synthesize_failure(mocker):
    mocker.patch('app.routers.tts.settings.sarvam_api_key', 'test_key')
    mock_synth = mocker.patch('app.routers.tts.SarvamTTSClient.synthesize')
    mock_synth.side_effect = Exception("API Error")

    response = client.post(
        "/tts/synthesize",
        json={"text": "Hello world", "language": "en"}
    )
    
    assert response.status_code == 502
    assert response.json()["detail"] == "tts_unavailable"
