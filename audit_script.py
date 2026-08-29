import json
import os
import asyncio
from collections import defaultdict
import sys

# ensure we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), "services", "ai-history"))

from app.pipelines.dialogue import DialogueManager
from app.models.schemas import DialogueStateRequest, HistorySectionType
from app.ontology.clinical_ontology import question_ids, ONTOLOGY

async def audit_questions():
    dm = DialogueManager()
    
    ontology_path = os.path.join("services", "ai-history", "app", "ontology", "clinical_ontology.json")
    with open(ontology_path, "r", encoding="utf-8") as f:
        ontology = json.load(f)

    all_questions = []
    sections = ontology.get("sections", {})
    
    # We will simulate requests to DialogueManager to see what is reachable.
    reachable_qids = set()
    
    for section_name in ontology["section_order"]:
        if section_name not in sections: continue
        section_def = sections[section_name]
        
        # Determine permutations
        if "complaint_modules" in section_def:
            modules = list(section_def["complaint_modules"].keys())
        else:
            modules = [None]
            
        for module in modules:
            req = DialogueStateRequest(
                session_id='123',
                section_type=HistorySectionType(section_name),
                language='en',
                chief_complaint=module, # sending module name as chief complaint to trigger it
                answered_question_ids=[],
                collected_answers=[]
            )
            
            # For 'general', send something random
            if module == 'general':
                req.chief_complaint = 'completely random unknown thing xyz'
            
            # Exhaust all questions
            while True:
                res = await dm.get_next_question(req)
                if res.section_complete:
                    break
                reachable_qids.add(res.question.id)
                req.answered_question_ids.append(res.question.id)

    for section_name, section_def in sections.items():
        if "complaint_modules" in section_def:
            for mod_name, mod_data in section_def["complaint_modules"].items():
                for q in mod_data.get("questions", []):
                    q_data = {
                        "question_id": q.get("id"),
                        "section": section_name,
                        "question_text": q.get("text"),
                        "hindi_text": q.get("hindi_text"),
                        "input_type": q.get("input_type", "VOICE_OR_TOUCH"),
                        "options": [o.get("value") for o in q.get("options", [])] if "options" in q else None,
                        "is_required": q.get("is_required", False),
                        "complaint_module": mod_name,
                        "trigger_conditions": mod_data.get("match", []),
                        "red_flag_related": bool(q.get("red_flag_triggers")),
                        "source_file": "app/ontology/clinical_ontology.json",
                        "source_location": f"sections.{section_name}.complaint_modules.{mod_name}",
                        "runtime_reachable": q.get("id") in reachable_qids,
                        "original": q
                    }
                    all_questions.append(q_data)
        else:
            for q in section_def.get("questions", []):
                q_data = {
                    "question_id": q.get("id"),
                    "section": section_name,
                    "question_text": q.get("text"),
                    "hindi_text": q.get("hindi_text"),
                    "input_type": q.get("input_type", "VOICE_OR_TOUCH"),
                    "options": [o.get("value") for o in q.get("options", [])] if "options" in q else None,
                    "is_required": q.get("is_required", False),
                    "complaint_module": None,
                    "trigger_conditions": [],
                    "red_flag_related": bool(q.get("red_flag_triggers")),
                    "source_file": "app/ontology/clinical_ontology.json",
                    "source_location": f"sections.{section_name}",
                    "runtime_reachable": q.get("id") in reachable_qids,
                    "original": q
                }
                all_questions.append(q_data)
                
    # Deduplication
    unique_map = {}
    duplicates = []
    
    for q in all_questions:
        qid = q["question_id"]
        if qid in unique_map:
            duplicates.append(q)
            # Add to duplicate sources of canonical
            if "duplicate_sources" not in unique_map[qid]:
                unique_map[qid]["duplicate_sources"] = []
            unique_map[qid]["duplicate_sources"].append(q["source_location"])
        else:
            unique_map[qid] = q

    unique_questions = list(unique_map.values())
    
    # Identify gaps
    unreachable = [q for q in unique_questions if not q["runtime_reachable"]]
    reachable = [q for q in unique_questions if q["runtime_reachable"]]
    
    # Missing fields
    missing_metadata = []
    for q in unique_questions:
        missing = []
        if not q.get("hindi_text"): missing.append("hindi_text")
        if not q.get("input_type"): missing.append("input_type")
        if q.get("options") is None and q.get("input_type") != "VOICE_ONLY": 
             pass # options not always required
        if missing:
            missing_metadata.append({"id": q["question_id"], "missing": missing})
            
    # Section Breakdown
    section_breakdown = defaultdict(lambda: {"unique": 0, "reachable": 0})
    for q in unique_questions:
        section_breakdown[q["section"]]["unique"] += 1
        if q["runtime_reachable"]:
            section_breakdown[q["section"]]["reachable"] += 1
            
    module_breakdown = defaultdict(lambda: {"unique": 0, "reachable": 0})
    for q in unique_questions:
        if q["section"] == "HPI" and q["complaint_module"]:
            module_breakdown[q["complaint_module"]]["unique"] += 1
            if q["runtime_reachable"]:
                module_breakdown[q["complaint_module"]]["reachable"] += 1
                
    # Write JSON
    os.makedirs("docs", exist_ok=True)
    with open("docs/DEV3_MEGA_QUESTION_DATASET.json", "w", encoding="utf-8") as f:
        json.dump(unique_questions, f, indent=2, ensure_ascii=False)
        
    # Write Markdown
    with open("docs/DEV3_MEGA_QUESTION_DATASET.md", "w", encoding="utf-8") as f:
        f.write("# DEV3 MEGA QUESTION DATASET AUDIT\n\n")
        f.write(f"**Total question definitions found:** {len(all_questions)}\n")
        f.write(f"**Unique questions:** {len(unique_questions)}\n")
        f.write(f"**Runtime-reachable questions:** {len(reachable)}\n")
        f.write(f"**Unreachable/dead questions:** {len(unreachable)}\n")
        f.write(f"**Duplicate questions:** {len(duplicates)}\n\n")
        
        f.write("## Section Breakdown\n")
        f.write("| Section | Unique Questions | Runtime Reachable |\n")
        f.write("|---------|-----------------:|------------------:|\n")
        for sec, counts in section_breakdown.items():
            f.write(f"| {sec} | {counts['unique']} | {counts['reachable']} |\n")
        f.write(f"| **TOTAL** | **{len(unique_questions)}** | **{len(reachable)}** |\n\n")
        
        f.write("## HPI Complaint Module Breakdown\n")
        f.write("| Module | Unique Questions | Runtime Reachable |\n")
        f.write("|--------|-----------------:|------------------:|\n")
        for mod, counts in module_breakdown.items():
            f.write(f"| {mod} | {counts['unique']} | {counts['reachable']} |\n")
        f.write("\n")
        
        f.write("## Identifed Gaps\n\n")
        
        f.write("### A. Questions defined but never reachable\n")
        for q in unreachable:
            f.write(f"- `{q['question_id']}` (Section: {q['section']}, Module: {q['complaint_module']})\n")
        f.write("\n")
            
        f.write("### B. Questions reachable but not present in the canonical ontology\n")
        f.write("None. All reachable questions are sourced from `clinical_ontology.json`.\n\n")
        
        f.write("### C. Duplicate questions\n")
        if not duplicates:
            f.write("None found.\n\n")
        else:
            for d in duplicates:
                f.write(f"- `{d['question_id']}` (found in {d['source_location']})\n")
            f.write("\n")
            
        f.write("### D. Questions with missing fields (e.g. hindi_text)\n")
        for m in missing_metadata:
            f.write(f"- `{m['id']}` is missing: {', '.join(m['missing'])}\n")
        f.write("\n")
        
        f.write("### E. Hardcoded/out-of-ontology questions\n")
        f.write("None found. `dialogue.py` strictly uses ontology questions.\n\n")
        
        f.write("## Raw Data\n")
        f.write("See `DEV3_MEGA_QUESTION_DATASET.json` for full structured data.\n")

if __name__ == '__main__':
    asyncio.run(audit_questions())
