from app.normalization.normalizer import (
    normalize_medication_name,
    normalize_investigation_name,
    normalize_unit,
)


def test_normalize_medication_name():
    orig, norm, conf = normalize_medication_name("dolo")
    assert norm == "Paracetamol"
    assert conf == 1.0

    orig, norm, conf = normalize_medication_name("crocin")
    assert norm == "Paracetamol"

    orig, norm, conf = normalize_medication_name("glycomet")
    assert norm == "Metformin"


def test_normalize_investigation_name():
    orig, norm, conf = normalize_investigation_name("hb")
    assert norm == "Hemoglobin"
    assert conf == 1.0

    orig, norm, conf = normalize_investigation_name("fbs")
    assert norm == "Fasting Blood Sugar"

    orig, norm, conf = normalize_investigation_name("creatinine")
    assert norm == "Serum Creatinine"


def test_normalize_unit():
    assert normalize_unit("mg/dl") == "mg/dL"
    assert normalize_unit("gm/dl") == "g/dL"
    assert normalize_unit("iu/l") == "IU/L"
