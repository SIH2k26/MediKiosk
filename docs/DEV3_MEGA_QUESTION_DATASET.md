# DEV3 MEGA QUESTION DATASET AUDIT

**Total question definitions found:** 49
**Unique questions:** 49
**Runtime-reachable questions:** 49
**Unreachable/dead questions:** 0
**Duplicate questions:** 0

## Section Breakdown
| Section | Unique Questions | Runtime Reachable |
|---------|-----------------:|------------------:|
| CHIEF_COMPLAINT | 1 | 1 |
| HPI | 36 | 36 |
| PAST_MEDICAL_HISTORY | 2 | 2 |
| MEDICATIONS | 2 | 2 |
| ALLERGIES | 2 | 2 |
| FAMILY_HISTORY | 1 | 1 |
| PERSONAL_HISTORY | 3 | 3 |
| REVIEW_OF_SYSTEMS | 2 | 2 |
| **TOTAL** | **49** | **49** |

## HPI Complaint Module Breakdown
| Module | Unique Questions | Runtime Reachable |
|--------|-----------------:|------------------:|
| chest_pain | 7 | 7 |
| headache | 6 | 6 |
| abdominal_pain | 6 | 6 |
| breathlessness | 6 | 6 |
| fever | 6 | 6 |
| general | 5 | 5 |

## Identifed Gaps

### A. Questions defined but never reachable

### B. Questions reachable but not present in the canonical ontology
None. All reachable questions are sourced from `clinical_ontology.json`.

### C. Duplicate questions
None found.

### D. Questions with missing fields (e.g. hindi_text)

### E. Hardcoded/out-of-ontology questions
None found. `dialogue.py` strictly uses ontology questions.

## Raw Data
See `DEV3_MEGA_QUESTION_DATASET.json` for full structured data.
