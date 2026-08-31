"""Medical data normalization — medication names, investigation names, units."""
import difflib
from typing import Optional

# Small starter reference lists — expand these over time, or later swap for
# RxNorm / LOINC API lookups without changing the calling code.
KNOWN_MEDICATIONS = {
    "paracetamol": "Paracetamol",
    "crocin": "Paracetamol",
    "dolo": "Paracetamol",
    "azithromycin": "Azithromycin",
    "azithral": "Azithromycin",
    "zithromax": "Azithromycin",
    "ibuprofen": "Ibuprofen",
    "brufen": "Ibuprofen",
    "amoxicillin": "Amoxicillin",
    "amoxyclav": "Amoxicillin-Clavulanate",
    "vomilast": "Vomilast (Levocetirizine + Montelukast)",
    "zoclar": "Zoclar (Clarithromycin)",
    "clarithromycin": "Clarithromycin",
    "gestakind": "Gestakind (Progesterone)",
    "metformin": "Metformin",
    "glycomet": "Metformin",
    "atorvastatin": "Atorvastatin",
    "lipitor": "Atorvastatin",
    "omeprazole": "Omeprazole",
    "pantoprazole": "Pantoprazole",
    "pantocid": "Pantoprazole",
}

KNOWN_INVESTIGATIONS = {
    "hb": "Hemoglobin",
    "hemoglobin": "Hemoglobin",
    "haemoglobin": "Hemoglobin",
    "cbc": "Complete Blood Count",
    "wbc": "White Blood Cell Count",
    "rbc": "Red Blood Cell Count",
    "platelet count": "Platelet Count",
    "esr": "Erythrocyte Sedimentation Rate",
    "crp": "C-Reactive Protein",
    "fbs": "Fasting Blood Sugar",
    "ppbs": "Postprandial Blood Sugar",
    "hba1c": "HbA1c",
    "creatinine": "Serum Creatinine",
    "urea": "Blood Urea",
    "sgot": "SGOT (AST)",
    "sgpt": "SGPT (ALT)",
    "bilirubin": "Total Bilirubin",
    "tsh": "Thyroid Stimulating Hormone",
    "malaria antigen": "Malaria Antigen Test",
    "widal": "Widal Test",
    "dengue ns1": "Dengue NS1 Antigen",
}

UNIT_ALIASES = {
    "mg/dl": "mg/dL",
    "mg/dl.": "mg/dL",
    "gm/dl": "g/dL",
    "g/dl": "g/dL",
    "mmol/l": "mmol/L",
    "u/l": "U/L",
    "iu/l": "IU/L",
    "cells/cumm": "cells/mm3",
    "/cumm": "/mm3",
    "%": "%",
}

FUZZY_MATCH_THRESHOLD = 0.75


def normalize_medication_name(raw_name: str) -> tuple[str, Optional[str], float]:
    """
    Attempt to normalize a (possibly OCR-garbled) medication name against
    known medications.

    Returns (original_name, normalized_name_or_None, match_confidence).
    match_confidence is 0.0 if no reasonable match was found.
    """
    if not raw_name:
        return raw_name, None, 0.0

    cleaned = raw_name.strip().lower()

    # Exact match first
    if cleaned in KNOWN_MEDICATIONS:
        return raw_name, KNOWN_MEDICATIONS[cleaned], 1.0

    # Fuzzy match against known keys
    matches = difflib.get_close_matches(cleaned, KNOWN_MEDICATIONS.keys(), n=1, cutoff=FUZZY_MATCH_THRESHOLD)
    if matches:
        best = matches[0]
        score = difflib.SequenceMatcher(None, cleaned, best).ratio()
        return raw_name, KNOWN_MEDICATIONS[best], round(score, 3)

    # No match — return as-is, flagged with 0 confidence so caller knows
    # this name wasn't recognized against the reference list.
    return raw_name, None, 0.0


def normalize_investigation_name(raw_name: str) -> tuple[str, Optional[str], float]:
    """Same idea as normalize_medication_name, but for lab/investigation names."""
    if not raw_name:
        return raw_name, None, 0.0

    cleaned = raw_name.strip().lower()

    if cleaned in KNOWN_INVESTIGATIONS:
        return raw_name, KNOWN_INVESTIGATIONS[cleaned], 1.0

    matches = difflib.get_close_matches(cleaned, KNOWN_INVESTIGATIONS.keys(), n=1, cutoff=FUZZY_MATCH_THRESHOLD)
    if matches:
        best = matches[0]
        score = difflib.SequenceMatcher(None, cleaned, best).ratio()
        return raw_name, KNOWN_INVESTIGATIONS[best], round(score, 3)

    return raw_name, None, 0.0


def normalize_unit(raw_unit: Optional[str]) -> Optional[str]:
    """Standardize unit strings to a consistent form."""
    if not raw_unit:
        return raw_unit
    cleaned = raw_unit.strip().lower()
    return UNIT_ALIASES.get(cleaned, raw_unit.strip())