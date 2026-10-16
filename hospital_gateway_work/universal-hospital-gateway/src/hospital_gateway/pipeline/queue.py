class DurableQueue:
 """Queue facade; external clinical delivery is intentionally disabled by default."""
 def __init__(self,repository): self.repository=repository
 def enqueue(self,record_id): return self.repository.add_job(record_id,"local-review","QUEUED")
