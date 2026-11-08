from __future__ import annotations

import re
from dataclasses import dataclass
from .models import ClearanceLevel, PIIRedactionEvent, RoleType


@dataclass(frozen=True)
class RoleProfile:
    role: RoleType
    label: str
    department: str
    allowed_clearances: tuple[ClearanceLevel, ...]
    allowed_tables: tuple[str, ...]
    can_create_tickets: bool
    badge_color: str


ROLE_PROFILES: dict[RoleType, RoleProfile] = {
    "junior_analyst": RoleProfile(
        role="junior_analyst",
        label="Junior Data Analyst",
        department="BI & Reporting Operations",
        allowed_clearances=("PUBLIC_INTERNAL",),
        allowed_tables=("cluster_telemetry", "incident_tickets"),
        can_create_tickets=False,
        badge_color="amber",
    ),
    "data_engineer": RoleProfile(
        role="data_engineer",
        label="Data & AI Engineer",
        department="Lakehouse & Streaming Platform (DE/AN)",
        allowed_clearances=("PUBLIC_INTERNAL", "ENGINEERING"),
        allowed_tables=("cluster_telemetry", "telecom_cdr_metrics", "incident_tickets"),
        can_create_tickets=True,
        badge_color="cyan",
    ),
    "compliance_officer": RoleProfile(
        role="compliance_officer",
        label="Risk & Compliance Officer",
        department="Data Governance, OJK & UU PDP Office",
        allowed_clearances=("PUBLIC_INTERNAL", "COMPLIANCE"),
        allowed_tables=("banking_risk_alerts", "incident_tickets", "audit_logs"),
        can_create_tickets=True,
        badge_color="emerald",
    ),
    "executive": RoleProfile(
        role="executive",
        label="VP / C-Suite Executive",
        department="Executive Board & Enterprise Delivery",
        allowed_clearances=("PUBLIC_INTERNAL", "ENGINEERING", "COMPLIANCE", "EXECUTIVE"),
        allowed_tables=(
            "cluster_telemetry",
            "telecom_cdr_metrics",
            "banking_risk_alerts",
            "executive_contracts",
            "incident_tickets",
            "audit_logs",
        ),
        can_create_tickets=True,
        badge_color="violet",
    ),
}


# Pre-compiled Indonesian & Enterprise PII Patterns (UU PDP No. 27 Tahun 2022)
_NPWP_PATTERN = re.compile(r"\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b")
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_ID_PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+62|62|0)8[1-9][0-9]{1,2}[\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,5}(?!\d)"
)
# Valid Indonesian province prefix codes (11..96) for 16-digit NIK KTP
_NIK_PATTERN = re.compile(
    r"(?<!\d)(?:1[1-9]|21|3[1-6]|5[1-3]|6[1-5]|7[1-6]|8[1-2]|9[1-6])\d{2}[\s-]?\d{6}[\s-]?\d{6}(?!\d)"
)
# Payment card numbers (13-19 digits with optional spaces/hyphens, after NIK check)
_CARD_PATTERN = re.compile(r"(?<!\d)(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}(?!\d)")


def get_role_profile(role: RoleType) -> RoleProfile:
    return ROLE_PROFILES[role]


def can_access_clearance(role: RoleType, clearance: ClearanceLevel) -> bool:
    return clearance in ROLE_PROFILES[role].allowed_clearances


def can_access_table(role: RoleType, table_name: str) -> bool:
    return table_name.lower() in ROLE_PROFILES[role].allowed_tables


def redact_pii(text: str) -> tuple[str, list[PIIRedactionEvent]]:
    """
    Scans and masks sensitive Indonesian & financial PII before prompt context
    reaches any LLM or audit log, enforcing UU No. 27 Tahun 2022 (UU PDP).
    """
    events: list[PIIRedactionEvent] = []
    sanitized = text

    replacements = [
        ("NPWP Tax ID", _NPWP_PATTERN, "[REDACTED-NPWP]"),
        ("Indonesian NIK (KTP)", _NIK_PATTERN, "[REDACTED-NIK]"),
        ("Payment Card Number", _CARD_PATTERN, "[REDACTED-CARD]"),
        ("Indonesian Mobile Number", _ID_PHONE_PATTERN, "[REDACTED-PHONE]"),
        ("Personal Email Address", _EMAIL_PATTERN, "[REDACTED-EMAIL]"),
    ]

    for label, pattern, token in replacements:
        sanitized, count = pattern.subn(token, sanitized)
        if count > 0:
            events.append(PIIRedactionEvent(pii_type=label, count=count))

    return sanitized, events
