from pathlib import Path
from hospital_gateway.application.validation_service import ValidationService
from hospital_gateway.pipeline.quarantine import quarantine_file
class IngestionService:
 def __init__(self,root): self.root=Path(root); self.validator=ValidationService()
 def process(self,path):
  try: return {"ok":True,"record":self.validator.process(path)}
  except Exception as e:
   target=quarantine_file(path,self.root/"quarantine") if Path(path).is_file() else None
   return {"ok":False,"error":str(e),"quarantine":str(target) if target else None}
