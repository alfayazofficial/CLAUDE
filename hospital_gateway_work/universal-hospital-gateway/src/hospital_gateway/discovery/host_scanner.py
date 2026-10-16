from hospital_gateway.discovery.scope_validator import validate_cidr
from hospital_gateway.discovery.port_scanner import scan_network
class HostScanner:
    def scan(self,cidr,confirmed=False,cancel_event=None,progress=None):
        return scan_network(validate_cidr(cidr,confirmed),cancel_event,progress)
