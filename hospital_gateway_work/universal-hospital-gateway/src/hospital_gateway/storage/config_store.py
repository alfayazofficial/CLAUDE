import json
from pathlib import Path
class ConfigStore:
 def __init__(self,path): self.path=Path(path)
 def load(self,default=None):
  if not self.path.exists(): return {} if default is None else default
  data=json.loads(self.path.read_text(encoding="utf-8"))
  if not isinstance(data,dict): raise ValueError("Config must be a JSON object.")
  return data
 def save(self,data):
  self.path.parent.mkdir(parents=True,exist_ok=True); tmp=self.path.with_suffix(".tmp"); tmp.write_text(json.dumps(data,indent=2),encoding="utf-8"); tmp.replace(self.path)
