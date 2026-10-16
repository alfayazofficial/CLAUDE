import xml.etree.ElementTree as ET
from xml.parsers import expat
from pathlib import Path
from hospital_gateway.domain.policies import MAX_FILE_BYTES
from hospital_gateway.domain.errors import ValidationError

def _forbid(*_args):
    raise ValidationError("DTD/entity declarations are not allowed.")

def safe_fromstring(raw):
    """Parse XML bytes, rejecting any DTD/entity declaration in every encoding (UTF-8, UTF-16, ...).

    A byte search for b"<!DOCTYPE" misses UTF-16 input, so declarations are detected by an expat pre-scan.
    """
    scan = expat.ParserCreate()
    scan.StartDoctypeDeclHandler = _forbid
    scan.EntityDeclHandler = _forbid
    try:
        scan.Parse(raw, True)
        return ET.fromstring(raw)
    except (expat.ExpatError, ET.ParseError) as e:
        raise ValidationError("Invalid XML syntax.") from e

class XmlReader:
 def parse_file(self,path):
  p=Path(path)
  if p.stat().st_size>MAX_FILE_BYTES: raise ValidationError("File exceeds 10 MB limit.")
  root=safe_fromstring(p.read_bytes())
  return {"root":root.tag,"children":[{"tag":c.tag,"text":c.text} for c in list(root)]}
