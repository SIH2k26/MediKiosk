"""Medical timeline builder — converts extracted entities to chronological timeline."""
from datetime import datetime
from typing import List, Optional

from app.models.schemas import (
    TimelineEvent,
    ExtractedEntity,
    ExtractedMedication,
    ExtractedInvestigation,
    ExtractedAllergy,
    EntityType,
)


class TimelineBuilder:
    """
    Builds a chronological medical timeline from extracted entities.

    Strategy: find DATE entities extracted from the document to anchor events.
    Since a single document usually covers one visit/encounter, we use the
    earliest confident date found as the event date for everything extracted
    from that document (diagnoses, medications, investigations, allergies).
    If no date is found, events are still returned but with event_date=None
    so the caller can fall back to document upload date or ask for manual entry.
    """

    def build(self, extraction_result: dict) -> List[TimelineEvent]:
        """
        Build a timeline from an EntityExtractor.extract() result dict:
        {entities, medications, investigations, allergies}
        """
        entities = extraction_result.get("entities", [])
        medications = extraction_result.get("medications", [])
        investigations = extraction_result.get("investigations", [])
        allergies = extraction_result.get("allergies", [])

        anchor_date, date_confidence = self._find_anchor_date(entities)

        events: List[TimelineEvent] = []

        for e in entities:
            if e.entity_type == EntityType.DIAGNOSIS:
                events.append(self._make_event(
                    date=anchor_date,
                    date_conf=date_confidence,
                    event_type="diagnosis",
                    title=e.normalized_value or e.value,
                    description=None,
                    confidence=e.confidence,
                ))
            elif e.entity_type == EntityType.SURGERY:
                events.append(self._make_event(
                    date=anchor_date,
                    date_conf=date_confidence,
                    event_type="surgery",
                    title=e.normalized_value or e.value,
                    description=None,
                    confidence=e.confidence,
                ))

        for m in medications:
            events.append(self._make_event(
                date=anchor_date,
                date_conf=date_confidence,
                event_type="medication_started",
                title=m.name,
                description=self._med_description(m),
                confidence=m.confidence,
            ))

        for inv in investigations:
            test_date = self._parse_date(inv.test_date) if inv.test_date else anchor_date
            events.append(self._make_event(
                date=test_date,
                date_conf=date_confidence,
                event_type="investigation",
                title=inv.name,
                description=self._investigation_description(inv),
                confidence=inv.confidence,
            ))

        for a in allergies:
            events.append(self._make_event(
                date=anchor_date,
                date_conf=date_confidence,
                event_type="allergy",
                title=a.substance,
                description=a.reaction,
                confidence=a.confidence,
            ))

        # Sort chronologically; events without a date sink to the end
        events.sort(key=lambda ev: (ev.event_date is None, ev.event_date or ""))

        return events

    def _find_anchor_date(self, entities: List[ExtractedEntity]) -> tuple[Optional[str], float]:
        """Pick the earliest confidently-parsed date entity as the document's anchor date."""
        dates = []
        for e in entities:
            if e.entity_type == EntityType.DATE:
                parsed = self._parse_date(e.normalized_value or e.value)
                if parsed:
                    dates.append((parsed, e.confidence))

        if not dates:
            return None, 0.0

        dates.sort(key=lambda d: d[0])
        return dates[0]

    def _parse_date(self, value: str) -> Optional[str]:
        """Normalize various date formats to YYYY-MM-DD, or None if unparseable."""
        if not value:
            return None

        # already normalized
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            pass

        formats = ["%d-%b-%Y", "%d-%m-%Y", "%d/%m/%Y", "%d-%B-%Y", "%B %d, %Y", "%d %B %Y"]
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    def _make_event(
        self, date: Optional[str], date_conf: float, event_type: str,
        title: str, description: Optional[str], confidence: float,
    ) -> TimelineEvent:
        year = int(date[:4]) if date else None
        # Overall confidence is dampened if we had to fall back to a weak/no date
        combined_confidence = round(min(confidence, confidence * max(date_conf, 0.5) + 0.3 if date else confidence * 0.6), 3)
        return TimelineEvent(
            event_year=year,
            event_date=date,
            event_type=event_type,
            title=title,
            description=description,
            confidence=combined_confidence,
        )

    def _med_description(self, m: ExtractedMedication) -> str:
        parts = []
        if m.dose:
            parts.append(m.dose)
        if m.frequency:
            parts.append(m.frequency)
        if m.route:
            parts.append(m.route)
        return ", ".join(parts) if parts else None

    def _investigation_description(self, inv: ExtractedInvestigation) -> str:
        parts = []
        if inv.value:
            val = inv.value
            if inv.unit:
                val += f" {inv.unit}"
            parts.append(val)
        if inv.status:
            parts.append(f"({inv.status})")
        return " ".join(parts) if parts else None