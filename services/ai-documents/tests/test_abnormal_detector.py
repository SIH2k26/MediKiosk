from app.analysis.abnormal_detector import (
    parse_numeric_value,
    parse_reference_range,
    classify_investigation,
)


def test_parse_numeric_value():
    assert parse_numeric_value("12.5") == 12.5
    assert parse_numeric_value("1,20,000") == 120000.0
    assert parse_numeric_value("< 5") == 5.0
    assert parse_numeric_value(None) is None


def test_parse_reference_range():
    assert parse_reference_range("70-100") == (70.0, 100.0)
    assert parse_reference_range("4.5 - 11.0") == (4.5, 11.0)
    assert parse_reference_range("up to 20") == (0.0, 20.0)


def test_classify_investigation():
    # Normal blood sugar
    status, is_abnormal, confidence = classify_investigation("Fasting Blood Sugar", "85", "mg/dL", "70-100")
    assert status == "NORMAL"
    assert is_abnormal is False

    # High blood sugar
    status, is_abnormal, confidence = classify_investigation("Fasting Blood Sugar", "130", "mg/dL", "70-100")
    assert status == "HIGH"
    assert is_abnormal is True

    # Critical blood sugar (> 1.5 * 100)
    status, is_abnormal, confidence = classify_investigation("Fasting Blood Sugar", "280", "mg/dL", "70-100")
    assert status == "CRITICAL"
    assert is_abnormal is True
