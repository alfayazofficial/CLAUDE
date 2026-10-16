import csv
from pathlib import Path
from hospital_gateway.domain.policies import MAX_FILE_BYTES
from hospital_gateway.domain.errors import ValidationError
class CsvReader:
 def parse_file(self,path):
  p=Path(path)
  if p.stat().st_size>MAX_FILE_BYTES: raise ValidationError("File exceeds 10 MB limit.")
  try:
   with p.open(encoding="utf-8-sig",newline="") as f: return list(csv.DictReader(f))
  except (csv.Error,UnicodeDecodeError) as e: raise ValidationError("Invalid CSV syntax.") from e
