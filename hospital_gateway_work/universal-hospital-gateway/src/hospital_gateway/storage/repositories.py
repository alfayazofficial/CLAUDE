from datetime import datetime,timezone
class Repository:
 def __init__(self,db): self.db=db
 def audit(self,action,result="OK",detail=""):
  with self.db.connect() as c: c.execute("INSERT INTO audit_events(timestamp,action,result,detail) VALUES(?,?,?,?)",(datetime.now(timezone.utc).isoformat(),action,result,str(detail)[:400]))
 def add_job(self,record_id,destination="local-review",status="QUEUED"):
  with self.db.connect() as c:
   cur=c.execute("INSERT INTO delivery_jobs(record_id,destination,status) VALUES(?,?,?)",(record_id,destination,status)); return cur.lastrowid
