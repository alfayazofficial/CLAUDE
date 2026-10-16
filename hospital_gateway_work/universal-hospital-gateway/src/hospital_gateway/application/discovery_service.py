from hospital_gateway.discovery.host_scanner import HostScanner
class DiscoveryService:
 def __init__(self): self.scanner=HostScanner()
 def scan(self,cidr,confirmed=False,cancel_event=None,progress=None): return self.scanner.scan(cidr,confirmed,cancel_event,progress)
