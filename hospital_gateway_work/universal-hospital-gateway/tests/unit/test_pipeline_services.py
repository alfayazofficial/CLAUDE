import json, pytest
from hospital_gateway.application.validation_service import ValidationService
from hospital_gateway.application.ingestion_service import IngestionService
from hospital_gateway.application.connector_service import validate_connector
from hospital_gateway.application.routing_service import RoutingService
from hospital_gateway.application.delivery_service import DeliveryService
from hospital_gateway.domain.errors import ValidationError
from hospital_gateway.pipeline.receiver import FileReceiver
from hospital_gateway.pipeline.queue import DurableQueue
from hospital_gateway.pipeline.parser import FileParser
from hospital_gateway.security.redaction import redact
from hospital_gateway.security.access_control import in_allowlist
from hospital_gateway.infrastructure.retry import retry_delay
from hospital_gateway.infrastructure.shutdown import safe_close
from hospital_gateway.storage.config_store import ConfigStore
from hospital_gateway.storage.database import Database
from hospital_gateway.storage.repositories import Repository
from hospital_gateway.connectors.health_check import TcpHealthCheck
from hospital_gateway.connectors.fhir.client import check_metadata
from hospital_gateway.connectors.registry import status_catalog

def test_validation_service_on_fixtures(fixtures):
    for name, fmt in (("demo.json", "JSON"), ("demo.csv", "CSV"), ("demo.xml", "XML")):
        rec = ValidationService().process(fixtures / name)
        assert rec["format"] == fmt and rec["status"] == "SYNTAX_VALIDATED"
        assert len(rec["payload_hash"]) == 64 and rec["normalized"]["validation_status"] == "syntax_only"

def test_same_content_same_hash(tmp_path):
    a = tmp_path / "a.json"; b = tmp_path / "b.json"
    a.write_text('{"x":1}'); b.write_text('{"x":1}')
    assert ValidationService().process(a)["payload_hash"] == ValidationService().process(b)["payload_hash"]

def test_ingestion_quarantines_bad_file(tmp_path):
    bad = tmp_path / "bad.json"; bad.write_text("{nope")
    res = IngestionService(tmp_path).process(bad)
    assert not res["ok"] and "Invalid JSON" in res["error"]
    assert (tmp_path / "quarantine").is_dir() and len(list((tmp_path / "quarantine").iterdir())) == 1

def test_ingestion_missing_file_does_not_crash(tmp_path):
    res = IngestionService(tmp_path).process(tmp_path / "ghost.json")
    assert not res["ok"] and res["quarantine"] is None

def test_unsupported_suffix(tmp_path):
    p = tmp_path / "a.exe"; p.write_text("x")
    with pytest.raises(ValueError): FileParser().parse(p)

def test_receiver_lists_only_supported(tmp_path):
    for n in ("a.json", "b.CSV", "c.txt", "d.xml"): (tmp_path / n).write_text("x")
    assert [p.name for p in FileReceiver(tmp_path).list_files()] == ["a.json", "b.CSV", "d.xml"]

def test_queue_persists_job(tmp_path):
    db = Database(tmp_path / "g.db"); q = DurableQueue(Repository(db))
    jid = q.enqueue("rec1")
    with db.connect() as c:
        assert c.execute("select record_id,status,destination from delivery_jobs where id=?", (jid,)).fetchone() == ("rec1", "QUEUED", "local-review")

def test_audit_truncates_and_persists(tmp_path):
    db = Database(tmp_path / "g.db"); Repository(db).audit("scan", "OK", "x" * 1000)
    with db.connect() as c: assert len(c.execute("select detail from audit_events").fetchone()[0]) == 400

def test_connection_is_closed_after_with(tmp_path):
    import sqlite3
    db = Database(tmp_path / "g.db")
    with db.connect() as c: pass
    with pytest.raises(sqlite3.ProgrammingError): c.execute("select 1")

def test_connection_rolls_back_on_error(tmp_path):
    db = Database(tmp_path / "g.db")
    with pytest.raises(RuntimeError):
        with db.connect() as c:
            c.execute("insert into audit_events(timestamp,action,result) values('t','a','r')"); raise RuntimeError
    with db.connect() as c: assert c.execute("select count(*) from audit_events").fetchone()[0] == 0

@pytest.mark.parametrize("args", [("", "h", 1, "FHIR REST"), ("n", "", 1, "FHIR REST"), ("n", "h", 0, "FHIR REST"),
                                  ("n", "h", 70000, "FHIR REST"), ("n", "h", "abc", "FHIR REST"), ("n", "h", 1, "Nope")])
def test_connector_validation_rejects(args):
    with pytest.raises(ValidationError): validate_connector(*args)

def test_connector_validation_ok():
    assert validate_connector(" n ", " h ", "2575", "HL7 v2 / MLLP") == {"name": "n", "host": "h", "port": 2575, "protocol": "HL7 v2 / MLLP"}

def test_every_protocol_has_status():
    from hospital_gateway.application.connector_service import PROTOCOLS
    assert set(PROTOCOLS) == set(status_catalog())

def test_external_delivery_disabled():
    with pytest.raises(NotImplementedError): DeliveryService().deliver({})
    with pytest.raises(PermissionError): RoutingService().route({}, None)
    with pytest.raises(PermissionError): RoutingService().route({}, {"enabled": False})
    with pytest.raises(NotImplementedError): RoutingService().route({}, {"enabled": True})

def test_redaction_nested():
    out = redact({"Password": "x", "a": [{"mrn": "1", "ok": 2}], "n": {"token": "t"}})
    assert out == {"Password": "[REDACTED]", "a": [{"mrn": "[REDACTED]", "ok": 2}], "n": {"token": "[REDACTED]"}}

def test_allowlist():
    assert in_allowlist("10.0.0.5", ["10.0.0.0/24"]) and not in_allowlist("10.0.1.5", ["10.0.0.0/24"]) and not in_allowlist("host", ["10.0.0.0/24"])

def test_retry_backoff_capped():
    assert retry_delay(1) < 1.3 and retry_delay(100) <= 72
    class Bad:
        def close(self): raise RuntimeError
    safe_close([Bad(), Bad()])

def test_config_store_roundtrip_and_default(tmp_path):
    cs = ConfigStore(tmp_path / "sub" / "c.json")
    assert cs.load() == {} and cs.load({"a": 1}) == {"a": 1}
    cs.save({"x": [1]}); assert cs.load() == {"x": [1]}
    (tmp_path / "sub" / "c.json").write_text("[1]")
    with pytest.raises(ValueError): cs.load()

def test_tcp_health_check():
    import socket
    s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(1)
    try: assert TcpHealthCheck().test("127.0.0.1", s.getsockname()[1])["ok"]
    finally: s.close()
    assert not TcpHealthCheck().test("127.0.0.1", "notaport")["ok"]
    assert not TcpHealthCheck().test("127.0.0.1", 1, timeout=.2)["ok"]

class _Resp:
    status = 200
    def __init__(self, body): self.body = body
    def read(self, n): return self.body
    def __enter__(self): return self
    def __exit__(self, *a): pass

def _patch_opener(monkeypatch, body=None, exc=None):
    import urllib.request
    class O:
        def open(self, req, timeout=None):
            if exc: raise exc
            return _Resp(body)
    monkeypatch.setattr(urllib.request, "build_opener", lambda *a, **k: O())

def test_fhir_rejects_non_https():
    assert not check_metadata("http://x/fhir")["ok"] and not check_metadata("")["ok"]

def test_fhir_ok(monkeypatch):
    _patch_opener(monkeypatch, json.dumps({"resourceType": "CapabilityStatement", "fhirVersion": "4.0.1"}).encode())
    assert check_metadata("https://h/fhir/") == {"ok": True, "http_status": 200, "resourceType": "CapabilityStatement", "fhirVersion": "4.0.1"}

@pytest.mark.parametrize("body,exc", [(b"[1,2]", None), (b"not json", None), (b"\xff\xfe", None),
                                      (None, ConnectionResetError()), (None, TimeoutError()),
                                      (None, __import__("http.client").client.IncompleteRead(b""))])
def test_fhir_failures_never_raise(monkeypatch, body, exc):
    _patch_opener(monkeypatch, body, exc)
    assert check_metadata("https://h/fhir")["ok"] is False
