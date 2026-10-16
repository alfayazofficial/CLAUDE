import json
from pathlib import Path
from hospital_gateway.domain.policies import MAX_FILE_BYTES
from hospital_gateway.domain.errors import ValidationError
class JsonReader:
 def parse_file(self,path):
  p=Path(path)
  if p.stat().st_size>MAX_FILE_BYTES: raise ValidationError("File exceeds 10 MB limit.")
  try: return json.loads(p.read_text(encoding="utf-8-sig"))
  except (json.JSONDecodeError,UnicodeDecodeError) as e: raise ValidationError("Invalid JSON syntax.") from e
