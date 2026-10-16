"""Drives the real Tk app under a virtual display. Skipped when Tk or a display is unavailable."""
import json, time, pytest
tk = pytest.importorskip("tkinter")
from hospital_gateway.desktop import app as A

DEVICES = [
    {"ip": "192.168.1.5", "hostname": "a", "open_ports": [2575], "suggestions": [{"protocol": "HL7 v2 MLLP", "hint": "h", "port": 2575}]},
    {"ip": "192.168.1.6", "hostname": "", "open_ports": [443], "suggestions": [{"protocol": "HTTPS / Web API", "hint": "h", "port": 443}]},
]

@pytest.fixture
def gui(tmp_path, monkeypatch):
    monkeypatch.setattr(A, "DATA_DIR", tmp_path / "data"); (tmp_path / "data").mkdir()
    monkeypatch.setattr(A, "CONFIG_FILE", tmp_path / "data" / "config.json")
    monkeypatch.setattr(A, "INCOMING_DIR", tmp_path / "incoming"); (tmp_path / "incoming").mkdir()
    monkeypatch.setattr(A.messagebox, "showinfo", lambda *a, **k: None)
    monkeypatch.setattr(A.messagebox, "showwarning", lambda *a, **k: None)
    monkeypatch.setattr(A.messagebox, "showerror", lambda *a, **k: None)
    try: app = A.App()
    except tk.TclError as e: pytest.skip(f"no display: {e}")
    app.update()
    yield app
    app.destroy()

def test_starts_with_six_tabs(gui):
    assert [gui.tabs.tab(t, "text") for t in gui.tabs.tabs()] == ["Overview", "Network discovery", "Connectors", "Protocol catalog", "Incoming files", "Live devices"]

def test_scan_requires_authorization(gui, monkeypatch):
    called = []; monkeypatch.setattr(A.messagebox, "showwarning", lambda *a, **k: called.append(a))
    gui.start_scan(); assert called and str(gui.scan_button.cget("state")) == "normal"

def test_scan_rejects_public_range_and_reenables_button(gui, monkeypatch):
    errs = []; monkeypatch.setattr(A.messagebox, "showerror", lambda *a, **k: errs.append(a))
    gui.authorized_var.set(True); gui.subnet_var.set("8.8.8.0/29"); gui.start_scan()
    for _ in range(50):
        gui._run_ui_calls(); gui.update(); time.sleep(.02)
        if errs: break
    assert errs and "private" in errs[0][1].lower() and str(gui.scan_button.cget("state")) == "normal"

def test_scan_worker_crash_reenables_button(gui, monkeypatch):
    monkeypatch.setattr(A, "scan_subnet", lambda c: (_ for _ in ()).throw(RuntimeError("boom")))
    gui.authorized_var.set(True); gui.start_scan()
    for _ in range(50):
        gui._run_ui_calls(); gui.update(); time.sleep(.02)
        if str(gui.scan_button.cget("state")) == "normal": break
    assert str(gui.scan_button.cget("state")) == "normal" and "failed" in gui.scan_status.get().lower()

def test_real_loopback_scan_end_to_end(gui):
    import socket
    s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(5); port = s.getsockname()[1]
    A.PORTS.append(port); A.PORT_HINTS[port] = ("HTTP / API", "t")
    try:
        res, err = A.scan_subnet("127.0.0.1/32")
    finally:
        s.close(); A.PORTS.remove(port); del A.PORT_HINTS[port]
    assert err is None and res["scanned_hosts"] == 1 and res["devices"][0]["open_ports"] == [port]
    gui.finish_scan(res, None); gui.update()
    assert gui.stat_devices.get() == "1" and len(gui.device_tree.get_children()) == 1

def test_selection_survives_auto_refresh(gui):
    A.save_config({"connectors": [], "last_discovery": {"subnet": "x", "scanned_hosts": 2, "time": "t", "devices": DEVICES}})
    gui.refresh_all(); gui.device_tree.selection_set("1"); gui.update()
    gui.refresh_all(); gui.update()
    assert gui.device_tree.selection() == ("1",)

def test_configure_selected_prefills_form(gui):
    A.save_config({"connectors": [], "last_discovery": {"subnet": "x", "scanned_hosts": 2, "time": "t", "devices": DEVICES}})
    gui.refresh_all()
    gui.device_tree.selection_set("0"); gui.configure_selected()
    assert (gui.fields["kind"].get(), gui.fields["port"].get(), gui.fields["host"].get()) == ("HL7 v2 MLLP", "2575", "192.168.1.5")
    gui.device_tree.selection_set("1"); gui.configure_selected()
    assert gui.fields["kind"].get() == "FHIR REST" and gui.fields["base_url"].get() == "https://192.168.1.6:443/fhir"

def test_save_and_remove_connector(gui, monkeypatch):
    gui.fields["name"].insert(0, "Lab"); gui.fields["host"].insert(0, "10.0.0.2"); gui.fields["port"].insert(0, "2575")
    gui.save_connector()
    assert gui.stat_connectors.get() == "1" and json.loads(A.CONFIG_FILE.read_text())["connectors"][0]["name"] == "Lab"
    assert gui.fields["name"].get() == ""
    gui.connector_tree.selection_set("0"); monkeypatch.setattr(A.messagebox, "askyesno", lambda *a, **k: True)
    gui.remove_connector(); assert gui.stat_connectors.get() == "0"

@pytest.mark.parametrize("port", ["abc", "0", "70000"])
def test_invalid_port_not_saved(gui, port):
    gui.fields["name"].insert(0, "X"); gui.fields["port"].insert(0, port); gui.save_connector()
    assert gui.stat_connectors.get() == "0"

def test_missing_name_not_saved(gui):
    gui.save_connector(); assert gui.stat_connectors.get() == "0"

def test_incoming_preview_and_errors(gui, fixtures):
    inc = A.INCOMING_DIR
    for n in ("demo.json", "demo.csv", "demo.xml"): (inc / n).write_bytes((fixtures / n).read_bytes())
    (inc / "bad.json").write_text("{nope"); (inc / "evil.xml").write_text('<!DOCTYPE r [<!ENTITY x "y">]><r>&x;</r>'); (inc / "ignore.txt").write_text("x")
    gui.refresh_files(); gui.update()
    rows = {gui.file_tree.item(i, "values")[0]: gui.file_tree.item(i, "values") for i in gui.file_tree.get_children()}
    assert set(rows) == {"demo.json", "demo.csv", "demo.xml", "bad.json", "evil.xml"}
    assert rows["bad.json"][1] == "ERROR" and rows["evil.xml"][1] == "ERROR" and "DTD" in rows["evil.xml"][2]
    assert gui.stat_files.get() == "5"

def test_corrupt_config_is_preserved_not_destroyed(gui):
    A.CONFIG_FILE.write_text('{"connectors": [{"name": "precious"}')  # truncated
    cfg = A.load_config()
    assert cfg == {"connectors": [], "last_discovery": None}
    kept = list(A.DATA_DIR.glob("config.corrupt-*.json"))
    assert len(kept) == 1 and "precious" in kept[0].read_text()

def test_save_config_is_atomic(gui):
    A.save_config({"connectors": [1]}); assert not A.CONFIG_FILE.with_suffix(".tmp").exists()
    assert A.load_config() == {"connectors": [1]}

def test_fhir_button_handles_empty_url(gui, monkeypatch):
    msgs = []; monkeypatch.setattr(A.messagebox, "showinfo", lambda *a, **k: msgs.append(a))
    gui.test_fhir(); assert msgs and "Base URL" in msgs[0][1]


# ---------------- Live devices tab (real simulators over real sockets) ----------------
def _wait_poll(gui):
    for _ in range(200):
        gui._run_ui_calls(); gui.update()
        if not gui._polling: return
        time.sleep(.02)
    raise AssertionError("poll did not finish")

def test_live_tab_exists(gui):
    assert "Live devices" in [gui.tabs.tab(t, "text") for t in gui.tabs.tabs()]

def test_poll_with_no_devices_explains(gui):
    gui.poll_all(); assert "No pollable devices" in gui.live_status.get()

def test_demo_end_to_end(gui):
    gui.toggle_demo(); gui.update()
    assert gui.demo_btn.cget("text") == "Stop demo simulators" and gui.stat_connectors.get() == "2"
    gui.poll_all(); _wait_poll(gui)
    assert "2 OK, 0 failed" in gui.live_status.get()
    rows = [gui.rec_tree.item(i, "values") for i in gui.rec_tree.get_children()]
    assert sum(1 for r in rows if r[2] == "ATTENDANCE") == 12 and sum(1 for r in rows if r[2] == "SENSOR") == 1
    assert any("body_temperature=" in r[3] and "spo2=" in r[3] for r in rows)
    assert any(r[3].startswith("EMP-") and "fingerprint" in r[3] or "card" in r[3] for r in rows)
    # second poll: no duplicate punches, new punch picked up
    gui.poll_all(); _wait_poll(gui)
    assert sum(1 for i in gui.rec_tree.get_children() if gui.rec_tree.item(i, "values")[2] == "ATTENDANCE") == 12
    gui.simulate_punch(); gui.poll_all(); _wait_poll(gui)
    assert sum(1 for i in gui.rec_tree.get_children() if gui.rec_tree.item(i, "values")[2] == "ATTENDANCE") == 13
    # export
    path = gui.export_records()
    import csv
    with open(path, encoding="utf-8") as f: data = list(csv.reader(f))
    assert data[0][0] == "received_at_utc"
    assert len(data) == 1 + 13 + 3  # 13 punches + 3 sensor polls
    # stop demo removes demo connectors, devices then show as failed not crash
    gui.toggle_demo(); assert gui.stat_connectors.get() == "0" and gui.demo_sims == []

def test_offline_device_shows_failure(gui):
    A.save_config({"connectors": [{"name": "Gone", "kind": "Attendance terminal", "host": "127.0.0.1", "port": 9, "enabled": True}], "last_discovery": None})
    gui.refresh_all(); gui.poll_all(); _wait_poll(gui)
    assert "1 failed" in gui.live_status.get()
    assert "FAILED" in gui.live_tree.item("0", "values")[3]

def test_modbus_without_register_map_is_reported(gui):
    A.save_config({"connectors": [{"name": "S", "kind": "Modbus TCP", "host": "127.0.0.1", "port": 502}], "last_discovery": None})
    gui.refresh_all(); gui.poll_all(); _wait_poll(gui)
    assert "register map" in gui.live_tree.item("0", "values")[3].lower()

def test_bad_register_map_json_rejected(gui):
    gui.fields["name"].insert(0, "S"); gui.fields["register_map"].insert(0, "[{oops")
    gui.save_connector(); assert gui.stat_connectors.get() == "0"

def test_custom_register_map_saved_and_used(gui):
    from hospital_gateway.simulators.devices import ModbusSensorSim
    sim = ModbusSensorSim(); port = sim.start(); sim.regs[:] = [380, 95, 70, 50]
    try:
        gui.fields["name"].insert(0, "Custom"); gui.fields["kind"].set("Modbus TCP")
        gui.fields["host"].insert(0, "127.0.0.1"); gui.fields["port"].insert(0, str(port))
        gui.fields["register_map"].insert(0, '[{"name":"temp","address":0,"scale":0.1,"unit":"Cel"}]')
        gui.save_connector(); gui.poll_all(); _wait_poll(gui)
    finally: sim.stop()
    assert any("temp=38.0Cel" in gui.rec_tree.item(i, "values")[3] for i in gui.rec_tree.get_children())

def test_close_with_demo_running_stops_simulators(tmp_path, gui):
    gui.toggle_demo(); sims = list(gui.demo_sims); gui.destroy()
    import socket
    for s in sims:
        with pytest.raises(OSError): socket.create_connection(s.server.server_address, timeout=.3)
    gui.destroy = lambda: None  # fixture teardown no-op
