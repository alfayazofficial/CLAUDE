from pathlib import Path
class FileReceiver:
 def __init__(self,folder): self.folder=Path(folder); self.folder.mkdir(parents=True,exist_ok=True)
 def list_files(self): return sorted(p for p in self.folder.iterdir() if p.is_file() and p.suffix.lower() in {".json",".csv",".xml"})
