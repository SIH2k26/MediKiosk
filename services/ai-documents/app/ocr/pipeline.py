"""
OCR Pipeline — Image preprocessing + text extraction.
Phase 4: Full implementation with Tesseract + Gemini Vision.
"""
import io
from dataclasses import dataclass

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

# Map our language codes to tesseract language codes
TESS_LANG_MAP = {
    "en": "eng",
    "hi": "hin",
    "ta": "tam",
    "te": "tel",
    "bn": "ben",
    "mr": "mar",
    "gu": "guj",
    "kn": "kan",
    "ml": "mal",
    "pa": "pan",
}


@dataclass
class OCRResult:
    text: str
    confidence: float
    page_count: int


class OCRPipeline:
    """
    Document OCR pipeline.

    Processing steps:
    1. Deskew
    2. Denoise
    3. Contrast enhancement
    4. Layout detection (skipped for now — simple full-page OCR)
    5. OCR (Tesseract for printed, Gemini Vision fallback for handwritten — added later)

    Supports: English, Hindi, and other Indian languages.
    """

    def process(self, image_bytes: bytes, mime_type: str, language: str = "hi") -> OCRResult:
        pages = self._bytes_to_images(image_bytes, mime_type)

        tess_lang = TESS_LANG_MAP.get(language, "eng")
        all_text = []
        all_confidences = []

        for page_img in pages:
            processed = self._preprocess(page_img)
            text, conf = self._run_tesseract(processed, tess_lang)
            all_text.append(text)
            all_confidences.append(conf)

        combined_text = "\n\n".join(all_text)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        return OCRResult(
            text=combined_text,
            confidence=round(avg_confidence, 3),
            page_count=len(pages),
        )

    def _bytes_to_images(self, image_bytes: bytes, mime_type: str) -> list[np.ndarray]:
        """Convert input bytes (PDF or image) into a list of OpenCV BGR images, one per page."""
        if mime_type == "application/pdf":
            pil_pages = convert_from_bytes(image_bytes, dpi=300)
            return [cv2.cvtColor(np.array(p), cv2.COLOR_RGB2BGR) for p in pil_pages]
        else:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return [cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)]

    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """Deskew, denoise, enhance contrast, threshold."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)

        # Deskew
        deskewed = self._deskew(enhanced)

        # Adaptive threshold for clean binarized text
        thresholded = cv2.adaptiveThreshold(
            deskewed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
        )
        return thresholded

    def _deskew(self, gray: np.ndarray) -> np.ndarray:
        """Estimate skew angle via minAreaRect on thresholded text pixels, then rotate to correct."""
        inverted = cv2.bitwise_not(gray)
        thresh = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        coords = cv2.findNonZero(thresh)

        if coords is None:
            return gray

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        (h, w) = gray.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
        return rotated

    def _run_tesseract(self, img: np.ndarray, lang: str) -> tuple[str, float]:
        """Run tesseract, returning text and an averaged word-level confidence (0-1)."""
        data = pytesseract.image_to_data(
            img, lang=lang, output_type=pytesseract.Output.DICT
        )

        words = []
        confidences = []
        for i, word in enumerate(data["text"]):
            if word.strip():
                words.append(word)
                conf = float(data["conf"][i])
                if conf >= 0:  # -1 means no confidence available
                    confidences.append(conf)

        text = " ".join(words)
        avg_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
        return text, avg_conf
