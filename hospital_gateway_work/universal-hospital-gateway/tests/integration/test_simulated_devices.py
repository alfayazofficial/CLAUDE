import socket, threading, pytest
from hospital_gateway.application.collection_service import CollectionService
from hospital_gateway.connectors.attendance.adapter import AttendanceAdapter
from hospital_gateway.connectors.modbus.adapter import ModbusAdapter
from hospital_gateway.domain.errors import ConnectorError, ValidationError
from hospital_gateway.simulators.devices import AttendanceTerminalSim, ModbusSensorSim, SENSOR_MAP
from hospital_gateway.storage.database import Database
from hospital_gateway.storage.repositories import Repository

@pytest.fixture
def sensor():
    s = ModbusSensorSim(); port = s.start(); yield s, {"host": "127.0.0.1", "port": port, "register_map": SENSOR_MAP}; s.stop()

@pytest.fixture
def terminal():
    t = AttendanceTerminalSim(); port = t.start(); yield t, {"host": "127.0.0.1", "port": port}; t.stop()

@pytest.fixture
def svc(tmp_path):
    db = Database(tmp_path / "g.db"); return CollectionService(db, Repository(db)), db

def dead_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

# ---- Modbus sensor
def test_modbus_decodes_registers(sensor):
    sim, cfg = sensor; sim.regs[:] = [371, 97, 72, 55]
    obs = {o["code"]: o["value"] for o in ModbusAdapter().receive(cfg)}
    assert obs == {"body_temperature": 37.1, "spo2": 97, "heart_rate": 72, "battery": 55}

def test_modbus_signed_register(sensor):
    sim, cfg = sensor; sim.regs[0] = 0xFFF6  # -10
    cfg = {**cfg, "register_map": [{"name": "t", "address": 0, "scale": 0.1, "signed": True}]}
    assert ModbusAdapter().receive(cfg)[0]["value"] == -1.0

def test_modbus_exception_for_bad_address(sensor):
    _, cfg = sensor
    with pytest.raises(ConnectorError, match="illegal data address"): ModbusAdapter().read_registers(cfg["host"], cfg["port"], 1, 2, 50)

def test_modbus_count_limit():
    with pytest.raises(ValidationError): ModbusAdapter().read_registers("127.0.0.1", 1, 1, 0, 126)

def test_modbus_test_connection(sensor):
    assert ModbusAdapter().test_connection(sensor[1])["ok"]
    assert not ModbusAdapter().test_connection({"host": "127.0.0.1", "port": dead_port()})["ok"]

def test_modbus_validate_config():
    with pytest.raises(ValidationError): ModbusAdapter().validate_config({})
    with pytest.raises(ValidationError): ModbusAdapter().validate_config({"host": "h", "register_map": [{"name": "x"}]})

def _rogue_server(reply):
    s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(1)
    def run():
        c, _ = s.accept(); c.recv(64); c.sendall(reply); c.close(); s.close()
    threading.Thread(target=run, daemon=True).start(); return s.getsockname()[1]

@pytest.mark.parametrize("reply", [b"", b"\x00\x01", b"\xff" * 20, b"\x00\x01\x00\x01\x00\x03\x01\x03\x00"])
def test_modbus_garbage_reply_raises_cleanly(reply):
    with pytest.raises((ConnectorError, OSError)): ModbusAdapter().read_registers("127.0.0.1", _rogue_server(reply), 1, 0, 1)

# ---- Attendance terminal
def test_attendance_full_then_incremental(terminal):
    sim, cfg = terminal; a = AttendanceAdapter()
    first = a.receive(cfg); assert len(first["logs"]) == 12 and first["last_id"] == 12
    assert a.receive(cfg, first["last_id"])["logs"] == []
    sim.punch("EMP-003"); nxt = a.receive(cfg, 12)
    assert [l["user_id"] for l in nxt["logs"]] == ["EMP-003"] and nxt["last_id"] == 13

def test_attendance_rejects_malformed_rows():
    t = AttendanceTerminalSim(corrupt_one=True); port = t.start()
    try: res = AttendanceAdapter().receive({"host": "127.0.0.1", "port": port})
    finally: t.stop()
    assert len(res["logs"]) == 12 and res["rejected"] == 1

def test_attendance_connection_info(terminal):
    assert "SIM-FP-100" in AttendanceAdapter().test_connection(terminal[1])["detail"]
    assert not AttendanceAdapter().test_connection({"host": "127.0.0.1", "port": dead_port()})["ok"]

@pytest.mark.parametrize("reply", [b"not json\n", b"[1]\n", b'{"ok": false, "error": "denied"}\n', b'{"ok": true}\n'])
def test_attendance_bad_replies(reply):
    with pytest.raises(ConnectorError): AttendanceAdapter().receive({"host": "127.0.0.1", "port": _rogue_server(reply)})

# ---- Collection service
def test_service_attendance_is_incremental_and_deduplicated(terminal, svc):
    sim, cfg = terminal; service, db = svc
    assert service.poll_attendance("t1", cfg)["new"] == 12
    assert service.poll_attendance("t1", cfg)["new"] == 0
    sim.punch(); assert service.poll_attendance("t1", cfg)["new"] == 1
    with db.connect() as c: assert c.execute("select count(*) from inbound_messages where format='ATTENDANCE'").fetchone()[0] == 13

def test_service_cursor_is_per_device(terminal, svc):
    _, cfg = terminal; service, _ = svc
    assert service.poll_attendance("a", cfg)["new"] == 12 and service.poll_attendance("b", cfg)["new"] == 12

def test_service_sensor_stores_time_series(sensor, svc):
    _, cfg = sensor; service, db = svc
    assert service.poll_sensor("s1", cfg)["ok"]; assert service.poll_sensor("s1", cfg)["ok"]
    with db.connect() as c: assert c.execute("select count(*) from inbound_messages where format='SENSOR'").fetchone()[0] == 2

def test_service_offline_device_is_audited_not_raised(svc):
    service, db = svc
    res = service.poll_attendance("gone", {"host": "127.0.0.1", "port": dead_port()}); assert res["ok"] is False
    assert service.poll_sensor("gone", {"host": "127.0.0.1", "port": dead_port(), "register_map": SENSOR_MAP})["ok"] is False
    with db.connect() as c: assert c.execute("select count(*) from audit_events where result='ERROR'").fetchone()[0] == 2

def test_offline_poll_does_not_advance_cursor(terminal, svc):
    sim, cfg = terminal; service, _ = svc
    service.poll_attendance("t", cfg); sim.punch()
    bad = {"host": "127.0.0.1", "port": dead_port()}; service.poll_attendance("t", bad)
    assert service.poll_attendance("t", cfg)["new"] == 1  # nothing lost
