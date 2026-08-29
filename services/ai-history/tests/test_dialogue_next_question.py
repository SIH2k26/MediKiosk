import pytest
from app.pipelines.dialogue import DialogueManager
from app.models.schemas import DialogueStateRequest, HistorySectionType
from app.ontology.clinical_ontology import question_ids

@pytest.mark.asyncio
async def test_dialogue_flow():
    dm = DialogueManager()
    
    # Test entire flow
    req = DialogueStateRequest(
        session_id='123',
        section_type=HistorySectionType.CHIEF_COMPLAINT,
        language='en',
        chief_complaint=None,
        answered_question_ids=[],
        collected_answers=[]
    )
    
    # CHIEF COMPLAINT
    expected_cc = question_ids("CHIEF_COMPLAINT")
    for qid in expected_cc:
        res = await dm.get_next_question(req)
        assert not res.section_complete
        assert res.question.id == qid
        req.answered_question_ids.append(qid)
        
    res = await dm.get_next_question(req)
    assert res.section_complete
    assert res.next_section == 'HPI'
    
    # Transition to HPI
    req.section_type = HistorySectionType.HPI
    req.chief_complaint = 'chest pain'
    req.answered_question_ids = []
    
    expected_hpi = question_ids("HPI", "chest_pain")
    for qid in expected_hpi:
        res = await dm.get_next_question(req)
        assert not res.section_complete
        assert res.question.id == qid
        req.answered_question_ids.append(qid)
        
    res = await dm.get_next_question(req)
    assert res.section_complete
    assert res.next_section == 'PAST_MEDICAL_HISTORY'
    
    # Transition to PAST_MEDICAL_HISTORY
    req.section_type = HistorySectionType.PAST_MEDICAL_HISTORY
    req.answered_question_ids = []
    expected_pmh = question_ids("PAST_MEDICAL_HISTORY")
    for qid in expected_pmh:
        res = await dm.get_next_question(req)
        assert not res.section_complete
        req.answered_question_ids.append(qid)
        
    res = await dm.get_next_question(req)
    assert res.section_complete
    assert res.next_section == 'MEDICATIONS'

    # And so on... just check that we can transition.
    
@pytest.mark.asyncio
async def test_dialogue_unknown_complaint_fallback():
    dm = DialogueManager()
    req = DialogueStateRequest(
        session_id='123',
        section_type=HistorySectionType.HPI,
        language='en',
        chief_complaint='some random unknown complaint',
        answered_question_ids=[],
        collected_answers=[]
    )
    
    # It should fallback to general
    expected_gen = question_ids("HPI", "general")
    res = await dm.get_next_question(req)
    assert not res.section_complete
    assert res.question.id == expected_gen[0]
