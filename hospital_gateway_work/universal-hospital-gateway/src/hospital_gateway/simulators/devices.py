"""Loopback demo devices. SYNTHETIC DATA ONLY — these emulate behaviour, not any real product."""
import json, random, socket, socketserver, struct, threading, time
from datetime import datetime, timedelta, timezone

class _Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True; daemon_threads = True
    def start(self):
        threading.Thread(target=self.serve_forever, daemon=True).start(); return self.server_address[1]
    def stop(self): self.shutdown(); self.server_close()

# ---------- Modbus TCP vitals sensor ----------
# Holding registers: 0 temp_c*10, 1 spo2_pct, 2 heart_rate_bpm, 3 battery_pct
class ModbusSensorSim:
    def __init__(self, host="127.0.0.1", port=0, seed=1):
        rnd = random.Random(seed); self.regs = [rnd.randint(362, 372), rnd.randint(95, 99), rnd.randint(62, 88), 87]
        sim = self
        class H(socketserver.BaseRequestHandler):
            def handle(self):
                try:
                    while True:
                        hdr = self.request.recv(7)
                        if len(hdr) < 7: return
                        tid, _, length, unit = struct.unpack(">HHHB", hdr)
                        body = self.request.recv(length - 1)
                        func = body[0]
                        if func != 3: self.request.sendall(struct.pack(">HHHBBB", tid, 0, 3, unit, func | 0x80, 1)); continue
                        start, qty = struct.unpack(">HH", body[1:5])
                        if start + qty > len(sim.regs): self.request.sendall(struct.pack(">HHHBBB", tid, 0, 3, unit, 0x83, 2)); continue
                        data = struct.pack(f">{qty}H", *sim.regs[start:start + qty])
                        self.request.sendall(struct.pack(">HHHBBB", tid, 0, 3 + len(data), unit, 3, len(data)) + data)
                except OSError: return
        self.server = _Server((host, port), H)
    def start(self): return self.server.start()
    def stop(self): self.server.stop()

SENSOR_MAP = [
    {"name": "body_temperature", "address": 0, "scale": 0.1, "unit": "Cel"},
    {"name": "spo2", "address": 1, "scale": 1, "unit": "%"},
    {"name": "heart_rate", "address": 2, "scale": 1, "unit": "/min"},
    {"name": "battery", "address": 3, "scale": 1, "unit": "%"},
]

# ---------- Fingerprint attendance terminal (SIM-ATT/1) ----------
class AttendanceTerminalSim:
    EMPLOYEES = ["EMP-001", "EMP-002", "EMP-003", "EMP-004"]  # synthetic IDs
    def __init__(self, host="127.0.0.1", port=0, punches=12, seed=7, corrupt_one=False):
        rnd = random.Random(seed); t = datetime(2026, 1, 5, 7, 0, tzinfo=timezone.utc); self.logs = []
        for i in range(1, punches + 1):
            t += timedelta(minutes=rnd.randint(3, 40))
            self.logs.append({"id": i, "user_id": rnd.choice(self.EMPLOYEES), "timestamp": t.isoformat(),
                              "verify": rnd.choice(["fingerprint", "fingerprint", "card"]), "status": "check_in" if i % 2 else "check_out"})
        if corrupt_one: self.logs.append({"id": punches + 1, "user_id": "EMP-001"})  # missing fields
        sim = self
        class H(socketserver.StreamRequestHandler):
            def handle(self):
                try: req = json.loads(self.rfile.readline(65536))
                except ValueError: return self._send({"ok": False, "error": "bad json"})
                if req.get("cmd") == "info": self._send({"ok": True, "model": "SIM-FP-100 (simulated)", "serial": "SIM0001"})
                elif req.get("cmd") == "get_logs":
                    since = int(req.get("since_id", 0)); self._send({"ok": True, "logs": [l for l in sim.logs if l.get("id", 0) > since]})
                else: self._send({"ok": False, "error": "unknown command"})
            def _send(self, obj): self.wfile.write((json.dumps(obj) + "\n").encode())
        self.server = _Server((host, port), H)
    def punch(self, user="EMP-002"):
        n = len(self.logs) + 1
        self.logs.append({"id": n, "user_id": user, "timestamp": datetime.now(timezone.utc).isoformat(), "verify": "fingerprint", "status": "check_in"})
    def start(self): return self.server.start()
    def stop(self): self.server.stop()
