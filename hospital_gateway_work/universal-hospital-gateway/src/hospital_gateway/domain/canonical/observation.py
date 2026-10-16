from dataclasses import dataclass
from typing import Any
@dataclass
class CanonicalObservation:
    code: str; value: Any; unit: str | None; effective_time: str | None; source_id: str; mapping_version: str = "unmapped"
