"""python -m hospital_gateway.demo — start simulated devices on loopback and pull data from them."""
import json, tempfile
from pathlib import Path
from hospital_gateway.application.collection_service import CollectionService
from hospital_gateway.simulators.devices import AttendanceTerminalSim, ModbusSensorSim, SENSOR_MAP
from hospital_gateway.storage.database import Database
from hospital_gateway.storage.repositories import Repository

def main():
    att, sen = AttendanceTerminalSim(), ModbusSensorSim()
    ap, sp = att.start(), sen.start()
    db = Database(Path(tempfile.mkdtemp()) / "demo.sqlite3"); svc = CollectionService(db, Repository(db))
    acfg, scfg = {"host": "127.0.0.1", "port": ap}, {"host": "127.0.0.1", "port": sp, "register_map": SENSOR_MAP}
    print("SIMULATED DEVICES — synthetic data only")
    print("Sensor :", json.dumps(svc.poll_sensor("ward-sensor-1", scfg)["observations"]))
    print("Attend.: first poll ->", svc.poll_attendance("door-terminal-1", acfg))
    print("Attend.: repeat poll ->", svc.poll_attendance("door-terminal-1", acfg))
    att.punch(); print("Attend.: after 1 new punch ->", svc.poll_attendance("door-terminal-1", acfg))
    with db.connect() as c: print("Stored rows:", c.execute("SELECT format,count(*) FROM inbound_messages GROUP BY format").fetchall())
    att.stop(); sen.stop()

if __name__ == "__main__": main()
