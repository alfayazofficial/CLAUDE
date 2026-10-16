import socket, threading
from ipaddress import ip_network
from hospital_gateway.discovery.port_scanner import scan_network
from hospital_gateway.discovery.discovery_report import summarize
from hospital_gateway.discovery.host_scanner import HostScanner
from hospital_gateway.domain.errors import AuthorizationError

def _listener():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(5); return s

def test_scan_finds_open_and_closed_ports():
    s = _listener(); open_port = s.getsockname()[1]
    closed = socket.socket(); closed.bind(("127.0.0.1", 0)); closed_port = closed.getsockname()[1]; closed.close()
    try:
        rows = scan_network(ip_network("127.0.0.1/32"), ports=(open_port, closed_port))
    finally: s.close()
    by_port = {r["port"]: r["is_open"] for r in rows}
    assert by_port == {open_port: True, closed_port: False}
    rep = summarize(rows)
    assert (rep["open_ports"], rep["hosts"], rep["observations"]) == (1, 1, 2)

def test_scan_honours_cancel():
    ev = threading.Event(); ev.set()
    rows = scan_network(ip_network("127.0.0.0/28"), ev, ports=(1,))
    assert rows == []

def test_scan_reports_progress():
    seen = []
    scan_network(ip_network("127.0.0.1/32"), progress=lambda n, t: seen.append((n, t)), ports=(1, 2))
    assert seen[-1] == (2, 2)

def test_hostscanner_requires_confirmation():
    import pytest
    with pytest.raises(AuthorizationError): HostScanner().scan("127.0.0.1/32")
