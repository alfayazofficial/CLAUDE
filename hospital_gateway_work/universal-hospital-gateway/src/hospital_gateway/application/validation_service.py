from pathlib import Path
import uuid
from hospital_gateway.pipeline.validator import validate_path
from hospital_gateway.pipeline.parser import FileParser
from hospital_gateway.pipeline.deduplicator import hash_bytes
from hospital_gateway.pipeline.normalizer import wrap_payload
class ValidationService:
 def __init__(self): self.parser=FileParser()
 def process(self,path):
  p=validate_path(path); raw=p.read_bytes(); payload=self.parser.parse(p)
  return {"id":uuid.uuid4().hex,"source_name":p.name,"format":p.suffix[1:].upper(),"payload_hash":hash_bytes(raw),"status":"SYNTAX_VALIDATED","normalized":wrap_payload(payload,p.name),"detail":"Syntax parsed. Clinical semantics and mapping are not validated."}
