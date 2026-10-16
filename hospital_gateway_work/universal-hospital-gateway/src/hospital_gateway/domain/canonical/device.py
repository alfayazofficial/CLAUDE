from dataclasses import dataclass
@dataclass
class CanonicalDevice:
    source_id: str; display_name: str; endpoint: str; protocol_hint: str; confidence: str = "unverified"
