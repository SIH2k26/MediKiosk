"""Dialogue router for adaptive questioning."""
from fastapi import APIRouter
from app.models.schemas import DialogueStateRequest, NextQuestionResponse
from app.pipelines.dialogue import DialogueManager

router = APIRouter()
dialogue_manager = DialogueManager()

@router.post("/next-question", response_model=NextQuestionResponse)
async def next_question(request: DialogueStateRequest) -> NextQuestionResponse:
    """
    Given the current dialogue state, returns the next adaptive question,
    or signals that the section is complete.
    """
    return await dialogue_manager.get_next_question(request)
