import sqlite3
from contextlib import contextmanager
from pathlib import Path
SCHEMA="""
CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY, timestamp TEXT NOT NULL, action TEXT NOT NULL, result TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS inbound_messages(id TEXT PRIMARY KEY, source_name TEXT NOT NULL, format TEXT NOT NULL, payload_hash TEXT NOT NULL, status TEXT NOT NULL, received_at TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS delivery_jobs(id INTEGER PRIMARY KEY, record_id TEXT NOT NULL, destination TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
"""
class Database:
 def __init__(self,path):
  self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True)
  with self.connect() as c: c.executescript(SCHEMA)
 @contextmanager
 def connect(self):
  """Commit on success, roll back on error, and always close (sqlite3's own `with` never closes)."""
  conn=sqlite3.connect(self.path,timeout=10)
  try:
   with conn: yield conn
  finally: conn.close()
