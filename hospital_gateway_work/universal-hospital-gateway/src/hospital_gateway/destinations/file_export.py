from pathlib import Path
import json
class FileExport:
 def __init__(self,folder): self.folder=Path(folder); self.folder.mkdir(parents=True,exist_ok=True)
 def export_json(self,record_id,payload):
  p=self.folder/(record_id+".json"); p.write_text(json.dumps(payload,indent=2),encoding="utf-8"); return p
