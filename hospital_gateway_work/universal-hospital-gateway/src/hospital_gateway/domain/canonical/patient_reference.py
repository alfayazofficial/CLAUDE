from dataclasses import dataclass
@dataclass
class PatientReference:
    system: str
    value: str  # Scoped opaque identifier; never infer identity from a name.
