# DEV 3 — Voice + Conversational AI (Features 10–15) — Architecture Handoff for Antigravity

> **Role split.** This document is authored by Claude acting as **senior software architect for DEV 3**. It is the specification. **Antigravity performs all coding, dependency installation, testing, and implementation.** Nothing here has been written to the repo except this plan file. Where a decision depends on a fast-moving API detail, the doc says exactly what to re-verify before coding.
>
> **Verification stamp.** All provider API facts below were fetched from official docs on **2026-08-27**. Model catalogs move; Section C lists what Antigravity must re-confirm against the live `/models` endpoints on the day it codes.

---

## A. Current repository assessment

**Monorepo:** pnpm@11.23.0 + Turborepo, Node ≥20. Frontend = Next.js **16.3.2** (App Router) + React 19.2.8, **plain global CSS** (no Tailwind). Backend orchestrator = Express + TS + Zod + OpenAPI (DEV 1). AI services = Python 3 + FastAPI + Pydantic v2 + pydantic-settings. Data = Supabase (system of record).

**Ports:** kiosk 3000, doctor 3001, admin 3002, api 4000, **ai-history 8001** (Express expects 8001; uvicorn defaults to 8000 → must fix), ai-documents 8002.

### What already exists in DEV 3's territory

| Area | File | State | Verdict |
|---|---|---|---|
| Red-flag engine | `services/ai-history/app/rules/red_flags.py` | **Fully real** — `RedFlagEngine.evaluate(answers: List[str], section_type: str) -> List[RedFlagResult]`; 6 rules (ACS, stroke, severe abdominal, suicidal ideation, severe pain, respiratory distress) via case-insensitive substring `trigger_sets` (OR logic) | **♻ Reuse unchanged.** Deterministic; must NOT be replaced by LLM. |
| Dialogue manager | `services/ai-history/app/pipelines/dialogue.py` | Real but **unexposed & non-adaptive** — `DialogueManager` + hardcoded `QUESTION_BANK` (CHIEF_COMPLAINT×2, HPI×2, MEDS×1, ALLERGIES×1), sequential `get_next_question` | **✎ Extend** into ontology-driven adaptive engine; keep the dataclass shapes. |
| Pydantic schemas | `services/ai-history/app/models/schemas.py` | Real — `ProcessHistoryRequest/Response`, `HistoryAnswerInput`, `ExtractedMedication/Allergy`, `RedFlag`, `RiskLevel`, `ASRTranscribeRequest/Response`. **No TTS / next-question / structured-symptom / HPI models.** | **✎ Add** the missing models. |
| Config | `services/ai-history/app/config.py` | `Settings` singleton with `gemini_model="gemini-2.0-flash"`, `bhashini_*`, `langfuse_*`, `api_base_url`. **No Sarvam/Groq keys.** | **✎ Extend** (Sarvam + Groq; Gemini → fallback-only). |
| ASR router | `services/ai-history/app/routers/asr.py` | **Mock** — returns placeholder if no Bhashini key, else HTTP 501. `import httpx` unused. | **✎ Replace** body with Sarvam→Whisper. |
| History router | `services/ai-history/app/routers/history.py` | Runs the **real** red-flag engine on raw answers; returns `narrative=None`, `model_used=None`, `confidence=0.0`, empty extracted lists. Instantiates `dialogue_manager` but never uses it. | **✎ Extend** (add LLM extraction after red flags). |
| App wiring | `services/ai-history/app/main.py` | Mounts `history`@`/history`, `asr`@`/asr`. CORS locked to `settings.api_base_url` only. Logs "Bhashini". No TTS/dialogue routers. No `__main__` port. | **✎ Extend** (mount `tts`+`dialogue`, dev CORS toggle, port 8001). |
| Deps | `services/ai-history/requirements.txt` | fastapi 0.111.0, uvicorn[standard] 0.30.0, pydantic 2.7.0, pydantic-settings 2.3.0, httpx 0.27.0, google-generativeai 0.7.2, langfuse 2.38.0, requests, numpy, soundfile, python-multipart. **No openai/groq/sarvam/pytest.** | **✎ Add** deps (Section D). |
| Kiosk `/history` | `apps/kiosk/app/history/page.tsx` | **Stub** ("coming in Phase 3"). | **✎ Replace** with interview loop. |
| Kiosk deps | `apps/kiosk/package.json` | Only `next`, `react`, `react-dom`. **No `@medikiosk/shared-types` or `@medikiosk/clinical-schema`.** | **✎ Add** workspace deps + env. |
| Kiosk entry | `apps/kiosk/app/page.tsx` | Language select → `sessionStorage.setItem('mk_lang', selected)` → `router.push('/identify')`. 6 langs (hi,en,ta,te,bn,mr). | Reuse `mk_lang` pattern + existing CSS classes. |

### Reusable assets (do NOT reinvent)
- **`RedFlagEngine`** — call as-is: `evaluate(answers=[...strings...], section_type=<enum .value>)`.
- **`packages/shared-types/src/index.ts`** — canonical TS shapes: `ClinicalQuestion` (`id, text, hindiText?, sectionType, inputType:'VOICE_OR_TOUCH'|'VOICE_ONLY'|'TOUCH_ONLY'|'TEXT', options?, isRequired, followUpCondition?, redFlagTriggers?`), `QuestionOption`, `HistoryAnswer`, `HPI`, `RedFlag`, `HistorySection`, `AYUSHAssessment`. **No ConversationTurn/ASR/TTS types** → DEV 3 adds them.
- **`packages/clinical-schema/src/index.ts`** — canonical Zod wire contract (camelCase): `ProcessHistoryPayloadSchema`, `CreateHistoryAnswerSchema`, `RedFlagSchema`, `HPISchema`, `MedicationSchema`, `AllergySchema`. **No ASR/TTS/next-question schemas** → DEV 3 adds them (and flags for upstreaming to DEV 1).
- Existing kiosk CSS (`globals.css`): `.kiosk-screen`, `.kiosk-container`, `.mic-button`(+`.recording`, `@keyframes mic-pulse`), `.btn`, `.lang-card`, `.step-indicator`, `.skeleton`, `.text-heading/-body/-muted`, `.fade-in-up`. Reuse; do not add a CSS framework.

### Known conflicts to resolve (documented, some owned by others)
1. **Port mismatch** — Express `AI_HISTORY_URL=http://localhost:8001` vs uvicorn default 8000.
2. **CORS** — FastAPI allows only `api_base_url`; blocks direct kiosk calls needed for the independent demo (Section N fixes this dev-only).
3. **Stale Gemini config** — `gemini-2.0-flash`/`gemini-1.5-pro` in scaffold are shut down by 2026-08 (Section C).
4. **`RedFlagResult` (dataclass) vs `RedFlag` (Pydantic)** — engine returns dataclasses; `ProcessHistoryResponse.red_flags: List[RedFlag]`. Works today by coincidental field/enum-value overlap; make the mapping **explicit** when extending (Section S).
5. **Express is all 501 stubs** with no HTTP client (DEV 1 territory) — DEV 3 must not depend on it for the demo.

### Ownership boundary (do NOT build)
DEV 3 owns **only F10–F15**. Do not implement the Express proxy/persistence (DEV 1), the questionnaire registry/consent page (DEV 2), or summary generation & red-flag *rule authorship* (DEV 4). DEV 3 ships just enough **dev-only glue** (Section N) to be demonstrable alone.

---

## B. Target architecture

**Independent, demonstrable flow (no other dev required):**

```
Patient → /history (kiosk, mk_lang from sessionStorage)
  │
  ├─(1) getNextQuestion(state) ──► ai-history POST /dialogue/next-question
  │        └─ ontology walk + LLM follow-up selection ► ClinicalQuestion | {sectionComplete}
  │
  ├─(2) speak(question) ──► ai-history POST /tts/synthesize (Sarvam Bulbul v3)
  │        └─ base64 WAV ► <audio>;  on failure ► browser speechSynthesis
  │
  ├─(3a) VOICE: MediaRecorder(WebM/Opus) ─base64─► POST /asr/transcribe
  │        └─ Sarvam Saaras → (on fail/empty) Groq Whisper ► transcript
  │        └─ patient reviews / edits / confirms transcript
  │   (3b) TOUCH: pick option(s) — no ASR
  │
  ├─(4) append HistoryAnswer to local state (+ sessionStorage); loop to (1)
  │
  └─(5) section complete ──► POST /history/process
           └─ RedFlagEngine (deterministic) + LLM extraction (Groq→Gemini)
           ► { extracted entities, red_flags, risk_level, narrative } ► RedFlagBanner
```

**Guardrail invariants (WHY: AI is a physician-reviewable draft, never source of truth):**
- The LLM **selects among ontology-defined questions**; it never invents interview structure.
- **Red flags stay deterministic Python** (`red_flags.py`); the LLM never decides urgency.
- Every LLM output is **schema-validated** (Groq strict `json_schema`; Pydantic on the Gemini path) **before** it is used or returned. Invalid on both providers → raise, never persist.
- The kiosk stores the **verbatim** spoken transcript as `raw_answer`; extraction is additive, never destructive.

**Service surface (ai-history) after this work:** `GET /health`, `POST /asr/transcribe`, `POST /tts/synthesize`, `POST /dialogue/next-question`, `POST /history/process`.

---

## C. Provider / API verification requirements

### C.1 VERIFIED on 2026-08-27 (encode these; they correct the earlier plan)

**Sarvam — Speech-to-Text (ASR primary)**
- `POST https://api.sarvam.ai/speech-to-text` · **`multipart/form-data`** · auth header **`api-subscription-key: <key>`**.
- Fields: `file` (required), `model`, `mode` (saaras:v3 only: `transcribe`|`translate`|`verbatim`|`translit`|`codemix`), `language_code` (BCP-47 e.g. `hi-IN`, or `unknown` = auto-detect), `with_timestamps`, `input_audio_codec` (required only for PCM).
- Models: **`saaras:v3`** (default; supports `mode`), **`saaras:v4`** (latest; Global+Indian English + 22 Indic langs). **There is NO "saarika" model and NO separate translate endpoint** — use `saaras:v3` + `mode`.
- **Audio formats accepted natively incl. `WebM`, `OPUS`, WAV, MP3, OGG, FLAC, MP4/M4A, AAC, AMR, WMA, PCM.** Best at **16 kHz**.
- **Limit: synchronous REST is for clips < 30 s**; longer needs the Batch API.
- 24 languages incl. hi/en/ta/te/bn/mr/gu/kn/ml/pa (all 10 in our enum).

**Sarvam — Text-to-Speech (TTS primary)**
- `POST https://api.sarvam.ai/text-to-speech` · auth **`api-subscription-key`**.
- Body (JSON): **`text`** (string — NOT `inputs[]`), **`language_code`** (required BCP-47 — NOT `target_language_code`), `speaker` (v3 default **`shubh`**; v2 default `anushka`), `pace` (v3 `0.5–2.0`), `speech_sample_rate` (8000–48000), `model` (`bulbul:v3`|`bulbul:v2`), `output_audio_codec` (`wav`|`mp3`|`linear16`|`opus`|`flac`), `temperature` (v3, default 0.6). `pitch/loudness/enable_preprocessing` are **v2-only**.
- Output: **base64 audio in an `audios` list; default WAV.** Max text: **`bulbul:v3` = 2500 chars**, v2 = 1500.

**Groq — LLM (reasoning/extraction primary)**
- OpenAI-compatible: `https://api.groq.com/openai/v1` · `Authorization: Bearer $GROQ_API_KEY`. Live list: `GET /openai/v1/models`.
- **`openai/gpt-oss-20b`** (context 131,072) confirmed; `openai/gpt-oss-120b` also available.
- **Structured Outputs:** `response_format` supports **strict `json_schema`** (constrained decoding — *guarantees* schema conformance) **and** `json_object`. Strict mode is supported by `openai/gpt-oss-20b` and `-120b`. **Strict-mode schema rules: every property must be listed in `required` and `additionalProperties:false`** (optional fields must instead be **nullable**, not omitted). **Streaming and tool use are NOT available together with Structured Outputs** (fine — we need JSON, not tools).

**Groq — Whisper (ASR fallback)**
- `POST https://api.groq.com/openai/v1/audio/transcriptions` · `multipart/form-data` · Bearer auth.
- Models: **`whisper-large-v3`** (multilingual; transcribe+translate), `whisper-large-v3-turbo` (transcribe only, cheaper).
- **Formats incl. `webm`**, wav, mp3, m4a, ogg, flac, mp4. Max 25 MB (free) / 100 MB (dev).
- Params: `file`, `model`, `language` (ISO-639-1 e.g. `hi`,`en`), `response_format` (`json`|`verbose_json`|`text`), `temperature`. **`verbose_json` returns `avg_logprob` + `no_speech_prob`** → use to derive a confidence proxy.

**Gemini — LLM (fallback)**
- **Stale IDs to drop:** `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-2.0-flash-lite` are **shut down**; **`gemini-flash-lite-latest` does not exist.** ← the earlier plan's default was wrong.
- **Current stable flash-lite:** `gemini-2.5-flash-lite` (conservative default), `gemini-3.5-flash-lite` / `gemini-3.1-flash-lite` (newer). Recommend defaulting to **`gemini-2.5-flash-lite`** and confirming via the live models list.
- Structured JSON via response schema / JSON mime type is supported.

### C.2 MUST re-verify before coding (fast-moving; do these first)
1. **Live model IDs** — `GET https://api.groq.com/openai/v1/models` (confirm `openai/gpt-oss-20b`, `whisper-large-v3`) and the Gemini models list (confirm `gemini-2.5-flash-lite`). If a chosen ID 404s, pick the nearest current equivalent and record it in `.env`.
2. **Gemini SDK/method — the one real ambiguity.** Scaffold pins `google-generativeai==0.7.2` (classic `GenerativeModel(...).generate_content(..., generation_config={response_mime_type, response_schema})`). Current Google guidance is the **`google-genai`** SDK (`from google import genai`; `client.models.generate_content(model, contents, config=...)`), and newer docs mention an "Interactions API." **Decision for Antigravity:** since Gemini is only the fallback, pick the SDK/method that the available key actually authenticates against, keep the call behind the `LLMClient` interface (Section J) so the rest of the code is SDK-agnostic, and pin the exact version in `requirements.txt`. Prefer `google-genai` if it works cleanly; otherwise stay on `google-generativeai`. Record the choice in a code comment + `.env` note.
3. **Sarvam STT response confidence** — the STT response may not include a numeric confidence. Confirm the field name; if absent, apply the confidence policy in Section H.
4. **Sarvam v3 speaker list** — confirm `shubh` (or chosen speaker) is valid for `bulbul:v3`; keep it in `.env` so a rename is one-line.

---

## D. Local development prerequisites

**WHY each dependency exists — and the FFmpeg correction.**

1. **FFmpeg — NOT required for the core pipeline.** *WHY:* verified that **both** Sarvam STT and Groq Whisper ingest **WebM/Opus** directly, and browser `MediaRecorder` emits exactly that. So audio flows browser → base64 → ai-history → provider with **no decode/transcode step**. Do **not** add `pydub`/system ffmpeg for the MVP. FFmpeg/PyAV would only be needed later to (a) normalize to 16 kHz mono server-side, (b) segment clips > 30 s for Sarvam's sync limit, or (c) accept exotic formats — all out of MVP scope. If (b) becomes necessary, prefer **PyAV** (wheels bundle ffmpeg; no system install) over system ffmpeg on Windows.
2. **Python deps to ADD** (append to `requirements.txt`; keep existing pins compatible with pydantic 2.7 / httpx 0.27):
   - `openai>=1.40,<2` — used for **both** Groq chat completions (`base_url=groq_base_url`) and Groq Whisper (`audio.transcriptions`). *WHY:* one OpenAI-compatible client covers two Groq surfaces; no bespoke HTTP.
   - Sarvam access: either the official **`sarvamai`** SDK **or** direct **`httpx`** (already pinned). *WHY:* Sarvam STT is multipart and TTS is JSON — both trivial over httpx, which avoids an extra dependency; SDK is acceptable if it eases auth. Antigravity picks one and stays consistent.
   - Gemini SDK per C.2 decision (`google-genai` **or** keep `google-generativeai==0.7.2`).
   - `pytest`, `pytest-asyncio`, `respx` (mock httpx), `pytest-mock` — test tooling. *WHY:* deterministic provider-mocked tests without burning API quota.
   - Keep `numpy`/`soundfile` only if a confidence/energy heuristic uses them; otherwise they're harmless.
3. **Node/pnpm** — already present (pnpm@11.23.0, Node ≥20). Build the two shared packages so their `dist/` exists before the kiosk imports them: `pnpm --filter @medikiosk/shared-types build` and `pnpm --filter @medikiosk/clinical-schema build`.
4. **API keys required to demo:** `SARVAM_API_KEY`, `GROQ_API_KEY`, and (optional, fallback only) `GOOGLE_GEMINI_API_KEY`. Browser TTS fallback and the ontology walk need no keys — so the flow **degrades gracefully** if only some keys are present (Section H/I/J policies).
5. **Browser:** Chromium-based for the demo (MediaRecorder WebM/Opus). *Note:* Safari/iOS emits MP4/M4A instead of WebM — both providers accept it, so cross-browser still works; just don't hard-code the WebM MIME on the client (Section M).

---

## E. Environment variables

**WHY:** one source of truth; secrets never committed. Add real values only to gitignored `.env` (service) / `.env.local` (kiosk). Update `.env.example` with **placeholder** keys and **remove** `BHASHINI_*`.

**`services/ai-history/.env` (new keys):**
```
# --- ASR ---
SARVAM_API_KEY=sk_...                         # secret
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_STT_MODEL=saaras:v3
SARVAM_STT_MODE=transcribe                     # transcribe|codemix|translate (see H)
# --- TTS ---
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_TTS_SPEAKER=shubh                       # verify valid v3 speaker
SARVAM_TTS_SAMPLE_RATE=22050
SARVAM_TTS_CODEC=wav
# --- LLM primary (Groq) ---
GROQ_API_KEY=gsk_...                           # secret
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-20b
WHISPER_MODEL=whisper-large-v3                 # ASR fallback (Groq-hosted)
# --- LLM fallback (Gemini) ---
GOOGLE_GEMINI_API_KEY=...                      # secret; optional
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite    # verify live; NOT flash-lite-latest
# --- provider routing ---
ASR_PRIMARY=sarvam
ASR_FALLBACK=whisper
LLM_PRIMARY=groq
LLM_FALLBACK=gemini
# --- dev-only glue (NEVER true in prod) ---
DEV_ALLOW_KIOSK_CORS=false
KIOSK_URL=http://localhost:3000
# --- existing, keep ---
API_BASE_URL=http://localhost:4000
ENVIRONMENT=development
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
```

**`apps/kiosk/.env.local` (new):**
```
NEXT_PUBLIC_API_URL=http://localhost:4000              # Express proxy (prod path)
NEXT_PUBLIC_AI_HISTORY_DIRECT_URL=http://localhost:8001 # dev-only shim (see N)
```

**Root `.env.example` edits:** add all `SARVAM_*`, `GROQ_*`, `WHISPER_MODEL`, `GEMINI_FALLBACK_MODEL`, `ASR_*`/`LLM_*`, `DEV_ALLOW_KIOSK_CORS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_HISTORY_DIRECT_URL` as **placeholders**; delete `BHASHINI_*`; correct the stale `LLM_MODEL`/`LLM_FALLBACK_MODEL` comments.

**Secret management (requirement #4):** `.env`/`.env.local` must be gitignored (confirm before first commit). The Supabase keys shared earlier and all provider keys live only there. Never echo secrets into logs, tests, fixtures, or this doc. If any key was ever pasted into a tracked file, rotate it.

---

## F. File-by-file implementation plan (new = ✚, modify = ✎, reuse = ♻)

**Service — `services/ai-history/`**
| Path | | Responsibility |
|---|---|---|
| `app/config.py` | ✎ | Add Sarvam/Groq/Gemini-fallback/routing/dev settings (Section E). Keep `Settings` singleton + `env_file=".env"`. |
| `app/main.py` | ✎ | Mount `tts`@`/tts`, `dialogue`@`/dialogue`; CORS appends `kiosk_url` **iff** `dev_allow_kiosk_cors`; update lifespan log; add `__main__` uvicorn on **8001**. |
| `app/models/schemas.py` | ✎ | Add `TTSRequest/Response`, `DialogueStateRequest`, `NextQuestionResponse`, `ExtractedSymptom`, `HPIStructured`; add `provider_used` to `ASRTranscribeResponse`. |
| `app/clients/__init__.py` | ✚ | Package marker. |
| `app/clients/sarvam.py` | ✚ | `SarvamASRClient.transcribe(...)` + `SarvamTTSClient.synthesize(...)` (interfaces in G/H/I). |
| `app/clients/whisper.py` | ✚ | `WhisperASRClient.transcribe(...)` via OpenAI SDK against Groq base URL. |
| `app/clients/llm.py` | ✚ | `LLMClient.complete_json(...)` — Groq strict `json_schema` → Gemini fallback (Section J). |
| `app/pipelines/extraction.py` | ✚ | Prompt + parse → `ExtractedMedication/Allergy/Symptom`, `HPIStructured`, narrative. |
| `app/pipelines/dialogue.py` | ✎ | Extend `DialogueManager` to consume the ontology + adaptive follow-up selection (Section K). |
| `app/ontology/clinical_ontology.(json\|py)` | ✚ | Section order + slots + complaint SOCRATES modules + red-flag trigger tokens (Section K). |
| `app/routers/asr.py` | ✎ | Replace mock with Sarvam→Whisper fallback. |
| `app/routers/tts.py` | ✚ | `POST /tts/synthesize` (Sarvam Bulbul; chunk > 2500). |
| `app/routers/dialogue.py` | ✚ | `POST /dialogue/next-question`. |
| `app/routers/history.py` | ✎ | Keep red-flag call; add extraction + narrative + `model_used`/`confidence`; **explicit** `RedFlagResult→RedFlag` mapping. |
| `app/rules/red_flags.py` | ♻ | Unchanged. |
| `requirements.txt` | ✎ | Section D deps. |
| `tests/…`, `tests/eval/…`, `scripts/smoke/…` | ✚ | Sections O. |
| `README.md` (service) | ✚/✎ | Run/test/smoke instructions (Section P). |

**Kiosk — `apps/kiosk/`**
| Path | | Responsibility |
|---|---|---|
| `package.json` | ✎ | Add `@medikiosk/shared-types`, `@medikiosk/clinical-schema` workspace deps. |
| `lib/contracts.ts` | ✚ | TS mirrors of ASR/TTS/next-question/process wire types (flag for upstream to `packages/*`). |
| `lib/api.ts` | ✚ | Typed client; prod → `NEXT_PUBLIC_API_URL`; dev shim → `NEXT_PUBLIC_AI_HISTORY_DIRECT_URL` with camel↔snake adapter (Section N). |
| `hooks/useAudioRecorder.ts` | ✚ | getUserMedia → MediaRecorder → base64; RMS level; silence auto-stop (F10). |
| `hooks/useTTS.ts` | ✚ | Play backend base64; fall back to `speechSynthesis` (F12). |
| `components/MicButton.tsx`,`Waveform.tsx`,`QuestionCard.tsx`,`AnswerReview.tsx`,`ProgressBar.tsx`,`RedFlagBanner.tsx` | ✚ | Reuse existing CSS classes. |
| `app/history/page.tsx` | ✎ | Replace stub with the interview loop (Section M). |
| `.env.local`(+`.env.example`) | ✚/✎ | Section E. |

---

## G. API / request-response contracts (ai-history, snake_case)

> These are the wire contracts DEV 3 codes against. The kiosk dev-shim speaks snake_case directly (Section N); the future Express proxy (DEV 1) will expose camelCase and map. **All examples are contracts, not code.**

**`POST /asr/transcribe`**
```jsonc
// request  (ASRTranscribeRequest — exists; add provider_used to response)
{ "audio_base64": "<base64>", "language": "hi", "format": "webm", "sample_rate": 16000 }
// response (ASRTranscribeResponse)
{ "transcript": "सीने में दर्द है", "language": "hi", "confidence": 0.86,
  "duration_seconds": 3.2, "processing_duration_ms": 740, "provider_used": "sarvam" }
```

**`POST /tts/synthesize`**
```jsonc
// request (TTSRequest — new)
{ "text": "आपको क्या तकलीफ़ है?", "language": "hi", "speaker": "shubh", "pace": 1.0 }
// response (TTSResponse — new)
{ "audio_base64": "<base64 wav>", "format": "wav", "sample_rate": 22050, "provider_used": "sarvam" }
// on Sarvam failure: HTTP 502 {"detail":"tts_unavailable"} → client falls back to speechSynthesis
```

**`POST /dialogue/next-question`**
```jsonc
// request (DialogueStateRequest — new)
{ "session_id": "uuid|dev-local", "section_type": "CHIEF_COMPLAINT", "language": "hi",
  "chief_complaint": null, "answered_question_ids": [],
  "collected_answers": [ { "question_id": "cc_main", "raw_answer": "सीने में दर्द" } ] }
// response (NextQuestionResponse — new)
{ "section_complete": false,
  "question": { "id": "cp_radiation", "text": "Does the pain spread to your arm, jaw or back?",
                "hindi_text": "क्या दर्द बाँह, जबड़े या पीठ तक जाता है?",
                "section_type": "HPI", "input_type": "VOICE_OR_TOUCH",
                "options": [ {"id":"o_yes","label":"Yes","hindi_label":"हाँ","value":"yes"},
                             {"id":"o_no","label":"No","hindi_label":"नहीं","value":"no"} ],
                "is_required": true, "red_flag_triggers": ["radiation to arm","jaw pain"] },
  "progress": { "answered": 2, "section_total_estimate": 6 } }
// when done: { "section_complete": true, "question": null, "next_section": "MEDICATIONS" }
```
*WHY the `question` object mirrors TS `ClinicalQuestion`:* the kiosk renders it directly and it upstreams cleanly to `shared-types`.

**`POST /history/process`** — request is the existing `ProcessHistoryRequest`; response is the existing `ProcessHistoryResponse` now populated:
```jsonc
{ "session_id":"…","section_type":"HPI","processed_answers":[…],
  "extracted_medications":[…], "extracted_allergies":[…],
  "red_flags":[ {"type":"POTENTIAL_ACS","description":"…","severity":"EMERGENCY",
                 "triggered_by":["chest pain","radiation to arm"],"requires_immediate_attention":true} ],
  "risk_level":"EMERGENCY", "narrative":"<LLM prose>", "processing_duration_ms":1230,
  "model_used":"openai/gpt-oss-20b", "confidence":0.83 }
```

**camelCase↔snake_case map (for DEV 1's future proxy; and the kiosk dev-shim adapter):** `sessionId↔session_id`, `patientId↔patient_id`, `sectionType↔section_type`, `questionId↔question_id`, `questionText↔question_text`, `answerType↔answer_type`, `rawAnswer↔raw_answer`, `audioUrl↔audio_url`, `requiresImmediateAttention↔requires_immediate_attention`, `triggeredBy↔triggered_by`. Note `clinical-schema`'s `CreateHistoryAnswer.sectionId` has no Python counterpart in `HistoryAnswerInput` — drop it at the boundary.

---

## H. ASR architecture + fallback (F10/F11)

**Chain:** decode base64 → **Sarvam Saaras** (`saaras:v3`) → on exception/empty/low-confidence → **Groq Whisper** (`whisper-large-v3`) → map to `ASRTranscribeResponse{…, provider_used}`.

**Client interfaces (signatures only — Antigravity writes bodies):**
```
SarvamASRClient.transcribe(audio: bytes, mime: str, language_code: str | "unknown", mode: str) -> AsrResult
WhisperASRClient.transcribe(audio: bytes, mime: str, language: str | None) -> AsrResult
# AsrResult = { transcript: str, language: str, confidence: float | None, raw: dict }
```

**Key decisions + WHY:**
- **No transcode.** Send the browser's WebM/Opus straight through (verified support on both providers). Simpler, faster, fewer deps.
- **`mode=transcribe` (default), consider `codemix`.** *WHY:* the clinical record must keep the patient's **actual words** (`raw_answer`), so do **not** use `translate` (it discards source-language fidelity). `codemix` is worth A/B-ing for Hindi-English speech. Make `SARVAM_STT_MODE` configurable. — This is the correct resolution of the old "Saaras vs Saarika" note: it's a **mode**, not a different model.
- **Language mapping** (enum → Sarvam BCP-47 / Whisper ISO-639-1): `hi→hi-IN/hi`, `en→en-IN/en`, `ta→ta-IN/ta`, `te→te-IN/te`, `bn→bn-IN/bn`, `mr→mr-IN/mr`, `gu→gu-IN/gu`, `kn→kn-IN/kn`, `ml→ml-IN/ml`, `pa→pa-IN/pa`. For an uncertain chief complaint, allow Sarvam `language_code="unknown"` (auto-detect) and store the returned language.
- **Confidence policy** (`ASRTranscribeResponse.confidence` is required 0–1): if Sarvam returns no score, use a configurable default (e.g. `0.85`) on non-empty success; on the Whisper path, request `verbose_json` and derive `confidence ≈ clamp(exp(avg_logprob), 0, 1)` or `1 - no_speech_prob`. Set `provider_used` accordingly. *WHY:* the kiosk's review step can flag low-confidence transcripts for edit.
- **> 30 s clips:** for MVP, the kiosk caps recording (~20–25 s) and shows a hint; the service returns a clear 4xx if exceeded. *WHY:* stays within Sarvam's sync REST limit without a batch pipeline.
- **Degradation:** no `SARVAM_API_KEY` → skip to Whisper; neither key → 503 with an actionable message (touch input still works).

---

## I. TTS architecture + fallback (F12)

**Chain:** `POST /tts/synthesize` → **Sarvam Bulbul** (`bulbul:v3`) → base64 WAV in response; **client** falls back to browser `speechSynthesis` if the server errors or returns no audio.

**Interface:** `SarvamTTSClient.synthesize(text: str, language_code: str, speaker: str, pace: float) -> bytes` (decodes the `audios[0]` base64).

**Decisions + WHY:**
- **Body fields are `text` + `language_code`** (verified) — not `inputs[]`/`target_language_code`. Encode the corrected contract.
- **Chunk text > 2500 chars** (bulbul:v3 limit) on sentence boundaries; concatenate audio or return an ordered list the client plays sequentially. *WHY:* questions are short, but narrative read-back can exceed the cap.
- **Fallback is client-side** (`speechSynthesis`) *WHY:* it needs zero keys/network and guarantees the demo always speaks. The server signals failure with a non-2xx the client catches; `useTTS` then calls `speechSynthesis` with a locale matching `mk_lang`.
- Speaker/sample-rate/codec come from `.env` so a provider rename is one line.

---

## J. LLM architecture + fallback (F13/F14/F15)

**Single interface used by extraction *and* dialogue follow-up selection:**
```
LLMClient.complete_json(system: str, user: str, schema: dict, schema_name: str) -> (data: dict, model_used: str)
```
**Chain + WHY:**
1. **Groq `openai/gpt-oss-20b` with strict `json_schema`.** *WHY:* verified constrained decoding **guarantees** the JSON matches the schema — the strongest possible guardrail for clinical extraction. Remember strict-mode rules: all properties in `required`, `additionalProperties:false`, optional fields modeled as **nullable** (`["string","null"]`) rather than omitted.
2. On exception / validation failure / empty → **Gemini `gemini-2.5-flash-lite`** (JSON mime + response schema), then **Pydantic-validate** the result (Gemini's JSON is not constrained-decoded, so validation is mandatory).
3. One retry per provider (temperature 0). If **both** fail validation → **raise**; caller returns red-flags-only result and never persists invalid extraction. *WHY:* AI is a draft; a malformed extraction must never masquerade as clinical data.
4. Wrap calls in a **Langfuse** trace (keys already in config) for observability. Non-fatal if Langfuse is absent.

*Streaming/tools note:* Structured Outputs disallow streaming/tools — we use neither, so no conflict.

---

## K. Dialogue manager + ontology design (F13 + F15)

**Ontology (`app/ontology/clinical_ontology.json` preferred over hard-coded).** Structure:
```jsonc
{
  "section_order": ["CHIEF_COMPLAINT","HPI","PAST_MEDICAL","MEDICATIONS","ALLERGIES",
                    "FAMILY_HISTORY","PERSONAL_SOCIAL","REVIEW_OF_SYSTEMS"],
  "sections": {
    "CHIEF_COMPLAINT": { "required_slots": ["cc_main"], "questions": [ /* ClinicalQuestion-shaped */ ] },
    "HPI": { "required_slots": ["onset","duration","character","severity"],
             "complaint_modules": {
               "chest_pain":   { "match": ["chest pain","सीने में दर्द","seene"],
                                 "questions": [ /* SOCRATES: site, radiation, sweating, breathlessness … */ ],
                                 "red_flag_tokens": ["radiation to arm","jaw pain","sweating","shortness of breath"] },
               "headache":     { "match": ["headache","सिरदर्द"], "red_flag_tokens": ["facial droop","slurred speech","weakness one side"] },
               "abdominal_pain":{ "match": ["stomach","pet","पेट","abdominal"], "red_flag_tokens": ["rigid abdomen","blood in stool","vomiting blood"] },
               "breathlessness":{ "match": ["breath","साँस","cough","खांसी"], "red_flag_tokens": ["cannot speak full sentences","blue lips"] },
               "fever":        { "match": ["fever","बुखार"], "red_flag_tokens": [] }
             } }
    /* … remaining sections with fixed questions … */
  }
}
```
*WHY complaint set = chest pain / headache / abdominal / breathlessness / fever:* each maps onto an existing `red_flags.py` rule (ACS, stroke, severe abdominal, respiratory distress, + general), so the adaptive branch demonstrably drives the deterministic engine. `red_flag_tokens` reuse the vocabulary of `RED_FLAG_RULES.trigger_sets`.

**`DialogueManager` extension (stateless — WHY: matches Express/Supabase statelessness and makes `/dialogue/next-question` idempotent):**
```
select_complaint_module(chief_complaint_text: str) -> module_key   # via LLMClient, constrained to known keys
get_next_question(state: DialogueStateRequest) -> NextQuestionResponse
is_section_complete(state) -> bool
```
- (a) Walk **required slots deterministically** in ontology order (LLM never invents structure).
- (b) Once required slots are filled, ask the LLM (with `complete_json`, schema = `{ "next_question_id": enum(remaining ids)|null }`) to **pick or skip** follow-ups **from the module's list only**. *WHY:* keeps adaptivity while the ontology bounds every possible question.
- (c) If a prior answer contains a `red_flag_token`, **inject the linked priority follow-up** ahead of optional ones.
- (d) Return `section_complete:true` + `next_section` when required slots are satisfied and no priority follow-ups remain.
- Fully offline-capable if no LLM key: fall back to deterministic slot order (demo still runs).

---

## L. Clinical entity extraction schemas (F14)

**New Pydantic models (`schemas.py`) — field lists, not code:**
- `ExtractedSymptom { name: str; present: bool; onset?: str; duration?: str; severity?: str; confidence: float }`
- `HPIStructured { onset?: str; duration?: str; character?: str; location?: str; radiation?: str; severity?: str; aggravating?: [str]; relieving?: [str]; associated_symptoms?: [str] }` — mirrors TS `HPI` in `shared-types`.
- Reuse existing `ExtractedMedication { name; dose?; frequency?; is_currently_taking; confidence }`, `ExtractedAllergy { substance; reaction?; severity?; confidence }`.

**Strict JSON schema (for Groq `json_schema`):** one object `{ medications:[…], allergies:[…], symptoms:[…], hpi:{…}, narrative:string }`; **every** property in `required`; optionals declared **nullable**; `additionalProperties:false` at every level. *WHY:* satisfies Groq strict-mode rules so extraction is guaranteed-parseable.

**Mapping to canonical types:** snake_case Pydantic → camelCase `shared-types` (`MedicationSchema`/`AllergySchema`/`HPISchema` in `clinical-schema`) at the (future) Express boundary. Flag any field the Zod schemas lack for DEV 1 to add.

**Red-flag integration:** after extraction, pass **structured symptom strings** (e.g. `"chest pain radiating to arm"`) plus the raw answers into `RedFlagEngine.evaluate(...)`. *WHY:* richer text → better substring recall than raw transcripts alone, while urgency stays 100% deterministic.

---

## M. Voice kiosk architecture (F10, front-end of F11/F12)

> **Next 16 prerequisite (per `apps/kiosk/AGENTS.md`):** read `apps/kiosk/node_modules/next/dist/docs/` before writing — App Router + React 19 have breaking changes vs training data. All mic/audio code is `'use client'`.

- **`hooks/useAudioRecorder.ts`** — `getUserMedia({audio:{channelCount:1,sampleRate:16000,echoCancellation:true,noiseSuppression:true}})` → `MediaRecorder`. **Feature-detect the MIME:** prefer `audio/webm;codecs=opus`, fall back to `audio/webm`, then `audio/mp4` (Safari/iOS). Report the chosen `format` to `/asr/transcribe`. `AnalyserNode` RMS drives the waveform + **silence auto-stop**; expose permission/error/retry states. Cap duration (~20–25 s) for the 30 s Sarvam limit.
- **`hooks/useTTS.ts`** — play backend base64 via `Audio`; on error/timeout call `speechSynthesis` with a voice matching `mk_lang`.
- **Components** (reuse CSS): `MicButton` (`.mic-button`/`.recording`/`mic-pulse`), `Waveform`, `QuestionCard` (renders `ClinicalQuestion`: spoken prompt + Speak button + touch `options[]` + input widget keyed by `inputType`), `AnswerReview` (transcript + edit/re-record/confirm — **confirmation is mandatory** so the record reflects patient intent), `ProgressBar`, `RedFlagBanner`. Loading uses `.skeleton`.
- **`app/history/page.tsx` loop:** read `mk_lang` (default `hi` and/or redirect to `/` if absent, since the independent demo may deep-link) → `getNextQuestion` → `useTTS.speak` → **voice** (record → `transcribe` → review → confirm) **or touch** (select) → append a `HistoryAnswer`-shaped answer to React state **and** `sessionStorage` → repeat until `section_complete` → `processHistory` → `RedFlagBanner`. Session state is local (no DB) for the demo.

---

## N. Dev-only stubs / glue (requirement #11 — independent demo)

**Goal:** kiosk voice flow runs end-to-end with only ai-history + kiosk, no Express/Supabase. All of this is **clearly marked dev-only and defaults OFF.**

1. **Dev CORS toggle** — `main.py` appends `settings.kiosk_url` to `allow_origins` **only if `DEV_ALLOW_KIOSK_CORS=true`**. *WHY:* prod keeps CORS locked to Express; dev lets the browser call 8001 directly.
2. **Direct URL shim** — `lib/api.ts`: if `NEXT_PUBLIC_AI_HISTORY_DIRECT_URL` is set, call ai-history directly and run a tiny **camel→snake adapter** (Section G map); else call `NEXT_PUBLIC_API_URL` (Express, prod path). *WHY:* one client, two modes; deleting the env var flips to prod with no code change.
3. **Local session state** — `startSession`/`submitAnswer` resolve against in-memory + `sessionStorage` (no DB). *WHY:* persistence is DEV 1's; the demo doesn't need it.
4. **Do NOT build:** Express routes/HTTP client, Supabase tables/RLS, questionnaire registry, consent page, summary generation. Document the **Express proxy contract** (`POST /api/history/{transcribe,tts,next-question,sessions/:id/process}` → forward to `AI_HISTORY_URL` with camel↔snake mapping) and **missing DB objects** (conversation-turns table, extracted-entities table, `history_*` RLS) as notes for DEV 1/DEV 2 — nothing more.

---

## O. Testing strategy (requirements #12, #13)

**Unit / integration (`tests/`, pytest + pytest-asyncio + respx) — no live keys, no quota burn:**
- `test_red_flags.py` — exercise `RedFlagEngine` (ACS, stroke, respiratory) to lock reused behavior.
- `test_dialogue_next_question.py` — ontology walk: required-slot order, complaint-module selection (LLM mocked), red-flag-token injection, `section_complete`.
- `test_extraction.py` — mock `LLMClient.complete_json`; assert Pydantic models + red-flag hand-off.
- `test_asr_fallback.py` — respx: Sarvam 5xx/empty → Whisper used; assert `provider_used` + confidence policy.
- `test_tts.py` — Sarvam mocked; assert base64 out + >2500-char chunking; error path returns catchable non-2xx.
- `test_llm_fallback.py` — Groq invalid JSON → Gemini path → validated; both-fail → raises.

**Provider smoke tests (`scripts/smoke/`, hit REAL APIs; run manually first to confirm keys/models). Each prints PASS/FAIL + latency:**
| Script | Checks | Success criterion |
|---|---|---|
| `smoke_sarvam_stt.py` | tiny WebM clip → `/speech-to-text` | non-empty transcript, HTTP 200 |
| `smoke_sarvam_tts.py` | short hi text → `/text-to-speech` | non-empty base64 audio, decodes to WAV |
| `smoke_groq_llm.py` | clinical prompt + strict `json_schema` → chat | valid JSON matching schema |
| `smoke_groq_whisper.py` | same WebM clip → `/audio/transcriptions` | non-empty transcript |
| `smoke_gemini.py` | clinical prompt → JSON | Pydantic-valid JSON (confirms fallback + model id) |
| Browser fallback | force TTS 502 in dev | `useTTS` speaks via `speechSynthesis` |

**Frontend:** manual demo (Section P) + optional component tests for `useAudioRecorder` MIME detection and `AnswerReview` confirm-gating. (Extended WER/precision-recall eval harnesses are a nice-to-have, not required for the independent demo.)

---

## P. End-to-end demo procedure (requirement #14)

**1. Service** (venv, keys in `services/ai-history/.env`, dev CORS on):
```bash
cd "services/ai-history" && python -m venv .venv && source .venv/Scripts/activate && pip install -r requirements.txt
```
```bash
DEV_ALLOW_KIOSK_CORS=true uvicorn app.main:app --reload --port 8001 --app-dir "services/ai-history"
```
**2. Confirm providers** (once): run each `scripts/smoke/*.py`; all PASS.

**3. Smoke the HTTP surface** (Swagger at http://localhost:8001/docs):
```bash
curl -s http://localhost:8001/health
```
```bash
curl -s -X POST http://localhost:8001/dialogue/next-question -H "Content-Type: application/json" -d '{"section_type":"CHIEF_COMPLAINT","language":"hi","answered_question_ids":[],"collected_answers":[]}'
```
```bash
curl -s -X POST http://localhost:8001/tts/synthesize -H "Content-Type: application/json" -d '{"text":"आपको क्या तकलीफ़ है?","language":"hi"}'
```
**4. Kiosk** (shared packages built, `.env.local` set):
```bash
pnpm --filter @medikiosk/shared-types build && pnpm --filter @medikiosk/clinical-schema build
```
```bash
pnpm --filter @medikiosk/kiosk dev
```
**5. Walk the flow** at http://localhost:3000 → pick language → `/history`: hear each question (TTS), answer a **chest-pain** narrative by **voice** (record → transcript shown → edit/confirm) and some by **touch**, advance through adaptive follow-ups, finish the section, and confirm the **RedFlagBanner fires `POTENTIAL_ACS / EMERGENCY`** with extracted medications/symptoms in the process response. Kill Sarvam TTS (or the key) once to confirm the browser `speechSynthesis` fallback speaks.

---

## Q. Acceptance criteria

- [ ] **F10** — kiosk records mic audio (WebM/Opus, feature-detected), shows live level + silence auto-stop, returns base64.
- [ ] **F11** — `/asr/transcribe` returns real transcripts via Sarvam; Whisper fallback proven (kill Sarvam) with correct `provider_used` + confidence.
- [ ] **F12** — `/tts/synthesize` returns Sarvam Bulbul audio; browser `speechSynthesis` fallback proven.
- [ ] **F13** — `/dialogue/next-question` drives an adaptive interview from the ontology; LLM never emits an out-of-ontology question.
- [ ] **F14** — `/history/process` returns schema-valid medications/allergies/symptoms + narrative + `model_used`; invalid LLM JSON never persists.
- [ ] **F15** — complaint-specific follow-ups branch correctly; red-flag tokens inject priority questions.
- [ ] **Independent demo** — full flow runs with only ai-history + kiosk (dev shim), no Express/Supabase.
- [ ] **Smoke tests** — all `scripts/smoke/*` PASS against live keys.
- [ ] **Guardrails** — red flags deterministic; every LLM output validated; verbatim transcript preserved as `raw_answer`.
- [ ] **Secrets** — no keys committed; `.env`/`.env.local` gitignored; `.env.example` placeholder-only, `BHASHINI_*` removed.
- [ ] **Port** — service serves on 8001.

---

## R. Build order / dependency graph

1. **Foundation** — `config.py` (Section E), `requirements.txt` (Section D), `main.py` (port 8001 + dev CORS + router mounts), `schemas.py` additions. *(unblocks everything)*
2. **Smoke scripts** (`scripts/smoke/*`) + run them → confirm keys/model IDs **before** building on providers (resolves Section C.2 unknowns early).
3. **Provider clients** — `clients/sarvam.py`, `clients/whisper.py`, `clients/llm.py`.
4. **ASR** — `routers/asr.py` (Sarvam→Whisper) + `test_asr_fallback`.
5. **TTS** — `routers/tts.py` + `test_tts`.
6. **LLM extraction** — `pipelines/extraction.py` + `routers/history.py` extension (+ explicit RedFlag mapping) + `test_extraction`/`test_llm_fallback`.
7. **Ontology + adaptive dialogue** — `ontology/…`, `pipelines/dialogue.py`, `routers/dialogue.py` + `test_dialogue_next_question`.
8. **Kiosk wiring** — build shared packages, `package.json`, `.env.local`, `lib/contracts.ts`, `lib/api.ts` (+ dev shim).
9. **Kiosk hooks/components** — `useAudioRecorder`, `useTTS`, components.
10. **Kiosk `/history` loop** → full manual demo (Section P).
11. **Service README** + final acceptance pass (Section Q).

*Frontend (8–10) depends only on the HTTP contracts (Section G), so it can proceed in parallel with 4–7 using the dev shim.*

---

## S. Risks, ambiguities & decisions Antigravity must verify before coding

1. **Gemini SDK/method + model id** *(highest)* — resolve `google-genai` vs `google-generativeai==0.7.2`; confirm `gemini-2.5-flash-lite` is live. Keep behind `LLMClient`; pin the version. *(Section C.2 #2)*
2. **Live model IDs** — hit `GET /openai/v1/models` (Groq) and the Gemini list; if `openai/gpt-oss-20b` / `whisper-large-v3` / the Gemini id differ, update `.env` and note it.
3. **Sarvam STT confidence field** — confirm presence; if absent, apply the Section H confidence policy (don't leave it 0.0).
4. **Sarvam `mode`** — default `transcribe`; validate `codemix` on real Hindi-English clinical speech and pick the better one (config-driven).
5. **Sarvam v3 speaker** — confirm `shubh` (or chosen) exists for `bulbul:v3`; keep in `.env`.
6. **30 s STT limit** — enforce the kiosk recording cap; decide 4xx vs silent truncation server-side (recommend explicit 4xx).
7. **Strict-schema shaping** — Groq strict mode needs all-required + nullable-optionals + `additionalProperties:false`; shape the extraction schema accordingly or extraction calls will error.
8. **`RedFlagResult`→`RedFlag` mapping** — make explicit when extending `history.py`; don't rely on the current coincidental dataclass/enum coercion.
9. **Cross-browser audio MIME** — feature-detect (WebM/Opus → mp4/m4a on Safari); never hard-code WebM.
10. **Shared-package build** — kiosk imports fail until `@medikiosk/shared-types` & `@medikiosk/clinical-schema` are built (`dist/` present).
11. **Next 16 breaking changes** — read `apps/kiosk/node_modules/next/dist/docs/` before kiosk code (per `AGENTS.md`).
12. **New wire types not yet in `packages/*`** — ASR/TTS/next-question/process live in `apps/kiosk/lib/contracts.ts` for now; flag for DEV 1 to upstream to `shared-types`/`clinical-schema` at integration.
13. **Secret hygiene** — verify `.gitignore` covers `.env`/`.env.local`; rotate any key ever committed.
