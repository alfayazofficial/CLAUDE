from dataclasses import dataclass
from datetime import datetime, timezone

def utc_now(): return datetime.now(timezone.utc).isoformat()
@dataclass
class Connector:
    id: int | None; name: str; protocol: str; host: str; port: int; enabled: bool = False
@dataclass
class DiscoveryObservation:
    ip: str; port: int; is_open: bool; protocol_hint: str; observed_at: str
@dataclass
class InboundMessage:
    id: str; source_name: str; format: str; payload_hash: str; status: str; received_at: str
@dataclass
class DeliveryJob:
    id: int | None; record_id: str; destination: str; status: str; attempts: int = 0
