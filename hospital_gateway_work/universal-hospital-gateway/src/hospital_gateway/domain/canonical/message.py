from dataclasses import dataclass
@dataclass
class CanonicalMessage:
    schema_version: str; record_id: str; source_id: str; received_at: str; payload: dict; validation_status: str = "not_validated"
