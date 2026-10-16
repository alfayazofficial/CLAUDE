"""Pull adapter for fingerprint/attendance terminals speaking the SIM-ATT/1 line protocol (JSON per line).

SIM-ATT/1 exists to demo and test the pipeline. Real terminals (e.g. ZKTeco, Suprema, Hikvision) use their own
protocols or SDKs: implement a sibling adapter from the vendor's documentation and keep this interface.
Incremental pull: the adapter returns the highest log id seen so the next poll only fetches new punches.
"""
import json, socket
from hospital_gateway.connectors.base import ConnectorAdapter
from hospital_gateway.domain.errors import ConnectorError, ValidationError

REQUIRED = {"id", "user_id", "timestamp", "verify", "status"}

class AttendanceAdapter(ConnectorAdapter):
    protocol_id = "sim_att_1"; implementation_status = "DEMO — simulator protocol only"

    def validate_config(self, config):
        if not config.get("host"): raise ValidationError("Host is required.")
        if not 1 <= int(config.get("port", 0)) <= 65535: raise ValidationError("Port must be 1-65535.")
        return True

    def _ask(self, config, request, timeout=3.0):
        with socket.create_connection((config["host"], int(config["port"])), timeout=timeout) as s:
            s.sendall((json.dumps(request) + "\n").encode())
            data = b""
            while not data.endswith(b"\n"):
                chunk = s.recv(65536)
                if not chunk: break
                data += chunk
                if len(data) > 10_000_000: raise ConnectorError("Response too large.")
        try: resp = json.loads(data.decode("utf-8"))
        except ValueError as e: raise ConnectorError("Device sent invalid JSON.") from e
        if not isinstance(resp, dict) or not resp.get("ok"): raise ConnectorError(f"Device error: {resp.get('error') if isinstance(resp, dict) else 'bad reply'}")
        return resp

    def test_connection(self, config):
        try: info = self._ask(config, {"cmd": "info"}); return {"ok": True, "detail": f"{info.get('model')} serial {info.get('serial')}"}
        except (ConnectorError, OSError) as e: return {"ok": False, "detail": str(e) or type(e).__name__}

    def receive(self, config, since_id=0):
        resp = self._ask(config, {"cmd": "get_logs", "since_id": int(since_id)})
        logs = resp.get("logs")
        if not isinstance(logs, list): raise ConnectorError("Device reply has no log list.")
        good, bad = [], 0
        for row in logs:
            if isinstance(row, dict) and REQUIRED <= set(row) and isinstance(row["id"], int) and row["id"] > since_id: good.append(row)
            else: bad += 1
        return {"logs": good, "rejected": bad, "last_id": max([since_id] + [r["id"] for r in good])}
