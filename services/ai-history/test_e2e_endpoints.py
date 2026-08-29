import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_process(answer_text):
    return client.post('/history/process', json={
        'session_id': 'sess1',
        'patient_id': 'p1',
        'section_type': 'HPI',
        'language': 'en',
        'answers': [
            {
                'question_id': 'q1',
                'question_text': 'Do you have difficulty breathing?',
                'raw_answer': answer_text,
                'answer_type': 'VOICE'
            }
        ]
    })

# E2E Test: Respiratory Negative
res_neg = run_process("I've never had swelling or difficulty breathing.")
data_neg = res_neg.json()
flags_neg = [f['type'] for f in data_neg.get('red_flags', [])]
print('RESPIRATORY NEGATIVE FLAGS:', flags_neg)
assert 'RESPIRATORY_DISTRESS' not in flags_neg

# E2E Test: Respiratory Positive
res_pos = run_process("I am struggling to breathe.")
data_pos = res_pos.json()
flags_pos = [f['type'] for f in data_pos.get('red_flags', [])]
print('RESPIRATORY POSITIVE FLAGS:', flags_pos)
assert 'RESPIRATORY_DISTRESS' in flags_pos

print('E2E Backend Verification Passed.')
