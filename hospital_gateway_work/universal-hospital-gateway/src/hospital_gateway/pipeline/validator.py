from pathlib import Path
from hospital_gateway.domain.policies import ALLOWED_IMPORT_SUFFIXES,MAX_FILE_BYTES
def validate_path(path):
 p=Path(path)
 if p.suffix.lower() not in ALLOWED_IMPORT_SUFFIXES: raise ValueError("Unsupported format; use JSON, CSV, or XML.")
 if not p.is_file(): raise ValueError("File does not exist.")
 if p.stat().st_size>MAX_FILE_BYTES: raise ValueError("File exceeds 10 MB limit.")
 return p
