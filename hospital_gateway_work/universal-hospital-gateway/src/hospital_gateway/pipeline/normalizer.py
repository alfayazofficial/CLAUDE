import hashlib,json
from datetime import datetime,timezone
def wrap_payload(payload,source_id):
 raw=json.dumps(payload,sort_keys=True,ensure_ascii=False,default=str).encode("utf-8")
 return {"schema_version":"1.0","source_id":source_id,"received_at":datetime.now(timezone.utc).isoformat(),"payload":payload,"payload_sha256":hashlib.sha256(raw).hexdigest(),"validation_status":"syntax_only","mapping_version":"none"}
