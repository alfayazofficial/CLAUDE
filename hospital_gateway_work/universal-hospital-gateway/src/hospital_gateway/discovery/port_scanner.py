import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hospital_gateway.domain.policies import DEFAULT_PORTS
from hospital_gateway.discovery.protocol_hints import hint_for_port

def scan_network(network, cancel_event=None, progress=None, ports=DEFAULT_PORTS, timeout=.35):
    targets=[(str(ip),p) for ip in network.hosts() for p in ports]
    results=[]
    def probe(ip,port):
        if cancel_event and cancel_event.is_set(): return None
        try:
            with socket.create_connection((ip,port),timeout=timeout): opened=True
        except OSError: opened=False
        return {"ip":ip,"port":port,"is_open":opened,"protocol_hint":hint_for_port(port),"observed_at":datetime.now(timezone.utc).isoformat()}
    with ThreadPoolExecutor(max_workers=24) as pool:
        futures=[pool.submit(probe,ip,p) for ip,p in targets]
        for n,f in enumerate(as_completed(futures),1):
            if cancel_event and cancel_event.is_set():
                for x in futures: x.cancel()
                break
            row=f.result()
            if row: results.append(row)
            if progress: progress(n,len(futures))
    return results
