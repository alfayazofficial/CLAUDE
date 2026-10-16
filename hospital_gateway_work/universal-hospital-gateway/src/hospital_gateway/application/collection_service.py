"""Poll devices, normalize, de-duplicate by content hash, persist and audit. Local storage only; nothing is forwarded."""
import hashlib, json, uuid
from datetime import datetime, timezone
from hospital_gateway.connectors.attendance.adapter import AttendanceAdapter
from hospital_gateway.connectors.modbus.adapter import ModbusAdapter
from hospital_gateway.security.redaction import redact

class CollectionService:
    def __init__(self, db, repository):
        self.db, self.repo = db, repository
        with db.connect() as c:
            c.execute("CREATE TABLE IF NOT EXISTS poll_cursors(source TEXT PRIMARY KEY, last_id INTEGER NOT NULL)")

    def _store(self, source, fmt, payload):
        raw = json.dumps(payload, sort_keys=True).encode(); h = hashlib.sha256(raw).hexdigest()
        with self.db.connect() as c:
            if c.execute("SELECT 1 FROM inbound_messages WHERE source_name=? AND payload_hash=?", (source, h)).fetchone(): return False
            c.execute("INSERT INTO inbound_messages(id,source_name,format,payload_hash,status,received_at,detail) VALUES(?,?,?,?,?,?,?)",
                      (uuid.uuid4().hex, source, fmt, h, "SYNTAX_VALIDATED", datetime.now(timezone.utc).isoformat(), json.dumps(payload)))
        return True

    def poll_attendance(self, name, config):
        with self.db.connect() as c:
            row = c.execute("SELECT last_id FROM poll_cursors WHERE source=?", (name,)).fetchone()
        since = row[0] if row else 0
        try: res = AttendanceAdapter().receive(config, since)
        except Exception as e:
            self.repo.audit("poll_attendance", "ERROR", f"{name}: {type(e).__name__}"); return {"ok": False, "error": str(e)}
        new = sum(self._store(name, "ATTENDANCE", r) for r in res["logs"])
        with self.db.connect() as c: c.execute("INSERT OR REPLACE INTO poll_cursors VALUES(?,?)", (name, res["last_id"]))
        self.repo.audit("poll_attendance", "OK", f"{name}: new={new} rejected={res['rejected']}")
        return {"ok": True, "new": new, "rejected": res["rejected"], "last_id": res["last_id"]}

    def poll_sensor(self, name, config):
        try: obs = ModbusAdapter().receive(config)
        except Exception as e:
            self.repo.audit("poll_sensor", "ERROR", f"{name}: {type(e).__name__}"); return {"ok": False, "error": str(e)}
        payload = {"observations": obs, "polled_at": datetime.now(timezone.utc).isoformat()}
        self._store(name, "SENSOR", payload)  # timestamp makes every poll distinct: this is a time series
        self.repo.audit("poll_sensor", "OK", f"{name}: {len(obs)} observations")
        return {"ok": True, "observations": obs}
