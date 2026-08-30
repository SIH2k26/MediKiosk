"""Dialogue Manager ?" Adaptive clinical questioning engine."""
import logging
import json
from typing import List, Optional
from pydantic import BaseModel
from app.models.schemas import DialogueStateRequest, NextQuestionResponse, ClinicalQuestion, ProgressEstimate, HistorySectionType
from app.ontology import clinical_ontology
from app.clients.llm import LLMClient, LLMUnavailableError

from app.rules.red_flags import RedFlagEngine

logger = logging.getLogger(__name__)

class NextQuestionPick(BaseModel):
    next_question_id: Optional[str]

class DialogueManager:
    def __init__(self):
        self.red_flag_engine = RedFlagEngine()

    async def get_next_question(self, request: DialogueStateRequest) -> NextQuestionResponse:
        section = request.section_type.value
        
        if not clinical_ontology.is_known_section(section):
            return self._complete_section(section)

        # 0. Emergency Red-Flag Halt Guard
        # If answers collected in this section (or chief complaint for CHIEF_COMPLAINT/HPI) trigger
        # an EMERGENCY or HIGH_PRIORITY red flag, halt questioning immediately.
        answers_to_eval = [str(a.get("raw_answer", "")) for a in request.collected_answers if a.get("raw_answer")]
        if section in ("CHIEF_COMPLAINT", "HPI") and request.chief_complaint:
            answers_to_eval.append(request.chief_complaint)

        if answers_to_eval:
            flags = self.red_flag_engine.evaluate(answers_to_eval, section)
            emergency_flags = [f for f in flags if f.severity in ("EMERGENCY", "HIGH_PRIORITY")]
            if emergency_flags:
                logger.warning(
                    f"🚨 Emergency red flag(s) detected during dialogue: {[f.type for f in emergency_flags]}. "
                    f"Halting questions for section {section}."
                )
                return self._complete_section(section)

        answered = set(request.answered_question_ids)
        
        module = None
        if section == "HPI":
            module = clinical_ontology.match_module(request.chief_complaint)
            module = clinical_ontology.resolve_module(section, module)

        questions = clinical_ontology.raw_questions(section, module)
        unanswered_qs = [q for q in questions if q["id"] not in answered]
        
        if not unanswered_qs:
            return self._complete_section(section)
            
        # 1. Deterministic Required Slots
        for q in unanswered_qs:
            if q.get("is_required", True):
                return self._build_response(q, request, len(answered), len(questions))
                
        # 2. Deterministic Priority Follow-ups
        # If any priority_when token is found in the collected answers, ask that question immediately.
        all_text = " ".join([str(a.get("raw_answer", "")).lower() for a in request.collected_answers])
        for q in unanswered_qs:
            tokens = q.get("priority_when", [])
            if any(t.lower() in all_text for t in tokens if t.strip()):
                logger.info(f"Priority follow-up triggered for question: {q['id']}")
                return self._build_response(q, request, len(answered), len(questions))

        # 3. LLM Adaptive Selection
        # Ask the LLM to pick one of the remaining optional questions or None.
        system_prompt = (
            "You are an expert clinical AI assistant conducting a medical interview. "
            "Your task is to decide which optional follow-up question is most medically relevant to ask next, "
            "given the patient's chief complaint and their answers so far.\n\n"
            "If none of the remaining optional questions are medically relevant or necessary (e.g. they denied related symptoms), "
            "you must return null for next_question_id to gracefully end this section of the interview."
        )
        
        user_prompt = f"Chief Complaint Module: {module or section}\n\nPatient's answers so far:\n"
        for ans in request.collected_answers:
            user_prompt += f"Q: {ans.get('question_text')}\nA: {ans.get('raw_answer')}\n\n"
            
        user_prompt += "Remaining optional questions you can choose from:\n"
        for q in unanswered_qs:
            user_prompt += f"- ID: {q['id']} | Text: {q['text']}\n"
            
        valid_ids = [q['id'] for q in unanswered_qs]
        schema = {
            "type": "object",
            "properties": {
                "next_question_id": {
                    "type": ["string", "null"],
                    "enum": valid_ids + [None]
                }
            },
            "required": ["next_question_id"],
            "additionalProperties": False
        }
        
        try:
            result_dict, model_used = await LLMClient.complete_json(
                system=system_prompt,
                user=user_prompt,
                schema=schema,
                schema_name="NextQuestionPick",
                validator=NextQuestionPick.model_validate
            )
            picked_id = result_dict.get("next_question_id")
            if picked_id:
                # Find the matched question
                for q in unanswered_qs:
                    if q["id"] == picked_id:
                        logger.info(f"LLM selectively chose optional question: {picked_id}")
                        return self._build_response(q, request, len(answered), len(questions))
        except Exception as e:
            logger.warning(f"LLM adaptive questioning failed, falling back to sequential order: {e}")
            # Offline/failure fallback: just ask the next optional question sequentially.
            return self._build_response(unanswered_qs[0], request, len(answered), len(questions))

        # If LLM returned null or we exhausted everything
        return self._complete_section(section)

    def _build_response(self, q: dict, request: DialogueStateRequest, answered_count: int, total_count: int) -> NextQuestionResponse:
        clinical_q = clinical_ontology.to_clinical_question(q, request.language)
        return NextQuestionResponse(
            section_complete=False,
            question=clinical_q,
            progress=ProgressEstimate(answered=answered_count, section_total_estimate=total_count)
        )

    def _complete_section(self, current_section: str) -> NextQuestionResponse:
        next_sec = clinical_ontology.next_section(current_section)
        return NextQuestionResponse(
            section_complete=True,
            question=None,
            progress=None,
            next_section=next_sec
        )
