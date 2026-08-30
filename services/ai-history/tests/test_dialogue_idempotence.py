import pytest
from app.pipelines.dialogue import DialogueManager
from app.models.schemas import DialogueStateRequest, HistorySectionType

@pytest.mark.asyncio
async def test_dialogue_idempotent():
    dm = DialogueManager()
    req = DialogueStateRequest(
        session_id='123',
        section_type=HistorySectionType.HPI,
        language='en',
        chief_complaint='mild joint pain',
        answered_question_ids=[],
        collected_answers=[]
    )
    
    res1 = await dm.get_next_question(req)
    res2 = await dm.get_next_question(req)
    
    assert res1.question.id == res2.question.id
    
    # After answering
    req.answered_question_ids.append(res1.question.id)
    res3 = await dm.get_next_question(req)
    res4 = await dm.get_next_question(req)
    
    assert res3.question.id == res4.question.id
    assert res3.question.id != res1.question.id
