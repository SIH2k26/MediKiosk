import asyncio
import httpx
import uuid
import sys

async def simulate_interview():
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    patient_id = "p_123"
    lang = "en"
    
    base_url = "http://localhost:8001"
    
    print("\n--- STARTING SIMULATED INTERVIEW ---")
    
    current_section = "CHIEF_COMPLAINT"
    answers = []
    
    # Track metrics
    dialogue_calls = 0
    tts_calls = 0
    process_calls = 0
    asr_calls = 0
    
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        while True:
            if current_section not in ["CHIEF_COMPLAINT", "HPI"]:
                break
            
            # 1. Frontend calls /dialogue/next-question
            dialogue_calls += 1
            print(f"\n[NETWORK] POST /dialogue/next-question (Section: {current_section})")
            
            cc_main_ans = next((a for a in answers if a["question_id"] == "cc_main"), None)
            chief_complaint = cc_main_ans["raw_answer"] if cc_main_ans else ""
            
            payload = {
                "session_id": session_id,
                "section_type": current_section,
                "language": lang,
                "chief_complaint": chief_complaint,
                "answered_question_ids": [a["question_id"] for a in answers],
                "collected_answers": answers
            }
            
            resp = await client.post("/dialogue/next-question", json=payload)
            data = resp.json()
            
            if data.get("section_complete"):
                print(f"  -> SECTION_DONE ({current_section})")
                
                # Frontend processes section
                process_calls += 1
                print(f"[NETWORK] POST /history/process (Section: {current_section})")
                proc_payload = {
                    "session_id": session_id,
                    "patient_id": patient_id,
                    "language": lang,
                    "section_type": current_section,
                    "answers": answers
                }
                proc_resp = await client.post("/history/process", json=proc_payload)
                proc_data = proc_resp.json()
                
                if proc_data.get("red_flags"):
                    for flag in proc_data["red_flags"]:
                        print(f"  -> RED FLAG DETECTED: {flag['type']} ({flag['description']})")
                
                if data.get("next_section"):
                    current_section = data["next_section"]
                    print(f"  -> Transitioning to new section: {current_section}")
                else:
                    print("  -> Interview Complete.")
                    break
            else:
                q = data["question"]
                print(f"  -> Returned Question: {q['id']} - '{q['text']}'")
                
                # 2. Frontend calls /tts/synthesize
                tts_calls += 1
                print(f"[NETWORK] POST /tts/synthesize for question {q['id']}")
                tts_payload = {"text": q["text"], "language": lang}
                await client.post("/tts/synthesize", json=tts_payload)
                print(f"  -> TTS Completed.")
                
                # 3. Simulate patient answer
                print(f"  [USER SPEAKS]")
                if q["id"] == "cc_main":
                    raw_answer = "I have chest pain radiating to my arm"
                elif q["id"] == "cp_onset":
                    raw_answer = "It started 2 hours ago"
                elif q["id"] == "cp_radiation":
                    raw_answer = "Yes, it goes to my left arm and jaw"
                elif q["id"] == "cp_sweating":
                    raw_answer = "Yes, I am sweating a lot"
                else:
                    raw_answer = "I don't know"
                    
                # 4. ASR Mock (we know Kiosk calls ASR here)
                asr_calls += 1
                print(f"[NETWORK] POST /asr/transcribe")
                print(f"  -> ASR returned: '{raw_answer}'")
                
                # 5. User confirms
                print(f"  [USER CONFIRMS]")
                answers.append({
                    "question_id": q["id"],
                    "question_text": q["text"],
                    "answer_type": "VOICE",
                    "raw_answer": raw_answer
                })

    print("\n--- EXACT CHRONOLOGICAL REQUEST SEQUENCE ---")
    print(f"Dialogue calls: {dialogue_calls}")
    print(f"TTS calls: {tts_calls}")
    print(f"ASR calls: {asr_calls}")
    print(f"Process calls: {process_calls}")
    print("--------------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(simulate_interview())
