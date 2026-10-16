from datetime import datetime,timezone
def local_health(): return {"status":"online","time":datetime.now(timezone.utc).astimezone().isoformat()}
