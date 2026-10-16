class AuditService:
 def __init__(self,repository): self.repository=repository
 def record(self,action,result="OK",detail=""): self.repository.audit(action,result,detail)
