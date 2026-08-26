"""Abnormal investigation detection — compares lab values against reference ranges."""
import re
from typing import Optional

# Standard adult reference ranges, used as fallback when the document itself
# doesn't print a reference range. Keys should match normalized investigation
# names from app.normalization.normalizer.KNOWN_INVESTIGATIONS values.
STANDARD_RANGES = {
    "Hemoglobin": (13.0, 17.0, "g/dL"),  # adult male; simplistic for MVP
    "White Blood Cell Count": (4000, 11000, "cells/mm3"),
    "Red Blood Cell Count": (4.5, 5.9, "million/mm3"),
    "Platelet Count": (150000, 450000, "cells/mm3"),
    "Erythrocyte Sedimentation Rate": (0, 20, "mm/hr"),
    "C-Reactive Protein": (0, 10, "mg/L"),
    "Fasting Blood Sugar": (70, 100, "mg/dL"),
    "Postprandial Blood Sugar": (70, 140, "mg/dL"),
    "HbA1c": (4.0, 5.6, "%"),
    "Serum Creatinine": (0.6, 1.3, "mg/dL"),
    "Blood Urea": (7, 20, "mg/dL"),
    "SGOT (AST)": (5, 40, "U/L"),
    "SGPT (ALT)": (7, 56, "U/L"),
    "Total Bilirubin": (0.1, 1.2, "mg/dL"),
    "Thyroid Stimulating Hormone": (0.4, 4.0, "mIU/L"),
}

# A value this many times above the high end (or below the low end, inverted)
# gets flagged CRITICAL instead of just HIGH/LOW.
CRITICAL_MULTIPLIER = 1.5


def parse_numeric_value(raw_value: Optional[str]) -> Optional[float]:
    """Extract a float from a messy value string like '12.5', '< 5', '1,20,000', '110 mg/dL'."""
    if not raw_value:
        return None
    cleaned = raw_value.replace(",", "").strip()
    match = re.search(r"-?\d+\.?\d*", cleaned)
    if not match:
        return None
    try:
        return float(match.group())
    except ValueError:
        return None


def parse_reference_range(raw_range: Optional[str]) -> Optional[tuple[float, float]]:
    """
    Parse a reference range string into (low, high).
    Handles formats like '70-100', '4.5 - 11.0', 'up to 20', '< 5'.
    """
    if not raw_range:
        return None
    cleaned = raw_range.strip()

    # "70-100" or "4.5 - 11.0"
    range_match = re.search(r"(\d+\.?\d*)\s*-\s*(\d+\.?\d*)", cleaned)
    if range_match:
        low, high = float(range_match.group(1)), float(range_match.group(2))
        return (low, high)

    # "up to 20" / "< 20"
    upper_match = re.search(r"(?:up to|<)\s*(\d+\.?\d*)", cleaned, re.IGNORECASE)
    if upper_match:
        return (0.0, float(upper_match.group(1)))

    return None


def classify_investigation(
    normalized_name: Optional[str],
    raw_value: Optional[str],
    unit: Optional[str] = None,
    document_reference_range: Optional[str] = None,
) -> tuple[Optional[str], Optional[bool], float]:
    """
    Classify a lab value as LOW / NORMAL / HIGH / CRITICAL / UNKNOWN.

    Returns (status, is_abnormal, confidence).
    Prefers the document's own printed reference range (more specific to that
    lab/patient) over the standard table; falls back to the standard table
    when the document didn't include one.
    """
    value = parse_numeric_value(raw_value)
    if value is None:
        return "UNKNOWN", None, 0.0

    range_source = "document"
    low_high = parse_reference_range(document_reference_range)

    if low_high is None and normalized_name in STANDARD_RANGES:
        low, high, _ = STANDARD_RANGES[normalized_name]
        low_high = (low, high)
        range_source = "standard_table"

    if low_high is None:
        # No range available from either source — can't classify
        return "UNKNOWN", None, 0.0

    low, high = low_high
    confidence = 0.9 if range_source == "document" else 0.7

    if value < low:
        is_critical = value < low / CRITICAL_MULTIPLIER
        status = "CRITICAL" if is_critical else "LOW"
        return status, True, confidence

    if value > high:
        is_critical = value > high * CRITICAL_MULTIPLIER
        status = "CRITICAL" if is_critical else "HIGH"
        return status, True, confidence

    return "NORMAL", False, confidence