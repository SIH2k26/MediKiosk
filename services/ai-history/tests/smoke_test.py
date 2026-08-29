import asyncio
import base64
import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.clients.sarvam import SarvamASRClient, SarvamTTSClient
from app.clients.whisper import WhisperASRClient
from app.clients.llm import LLMClient

load_dotenv()

async def run_smoke_tests():
    print("======================================")
    print(" DEV 3 - Provider Smoke Tests")
    print("======================================\n")

    # 1. Groq LLM
    print("1. Testing Groq LLM...")
    try:
        res, model = await LLMClient.complete_json(
            system="Output a JSON with a single key 'status' and value 'ok'.",
            user="Test message.",
            schema={"type": "object", "properties": {"status": {"type": "string"}}, "additionalProperties": False, "required": ["status"]},
            schema_name="Test"
        )
        print(f"[SUCCESS] Groq success! Model: {model} | Output: {res}\n")
    except Exception as e:
        print(f"[FAIL] Groq failed: {e}\n")

    # 2. Gemini LLM (simulate fallback by passing invalid Groq key or relying on config)
    # Testing Gemini directly
    print("2. Testing Gemini LLM...")
    try:
        from google import genai
        from google.genai import types as genai_types
        gemini_client = genai.Client(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0
        )
        response = await gemini_client.aio.models.generate_content(
            model=os.environ.get("GEMINI_FALLBACK_MODEL"),
            contents="Output a valid JSON: {\"status\": \"ok\"}",
            config=config
        )
        print(f"[SUCCESS] Gemini authenticated successfully. Response: {response.text}\n")
    except Exception as e:
        print(f"[FAIL] Gemini setup failed: {e}\n")

    # 3. Sarvam TTS
    print("3. Testing Sarvam TTS...")
    try:
        audio = await SarvamTTSClient.synthesize("Hello, testing Sarvam", "en-IN", "shubh", 1.0)
        print(f"[SUCCESS] Sarvam TTS success! Received {len(audio)} bytes of audio.\n")
    except Exception as e:
        print(f"[FAIL] Sarvam TTS failed: {e}\n")

    # 4. Whisper ASR
    print("4. Testing Whisper ASR (Groq)...")
    try:
        # Create a tiny dummy wav file to test whisper
        import wave
        import io
        dummy_wav = io.BytesIO()
        with wave.open(dummy_wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(16000)
            w.writeframes(b'\x00' * 16000)
        dummy_audio = dummy_wav.getvalue()
        
        res = await WhisperASRClient.transcribe(dummy_audio, "wav", "en")
        print(f"[SUCCESS] Whisper success! Response: {res}\n")
    except Exception as e:
        print(f"[FAIL] Whisper failed: {e}\n")

    print("======================================")
    print(" Smoke tests completed.")
    print("======================================")

if __name__ == "__main__":
    asyncio.run(run_smoke_tests())
