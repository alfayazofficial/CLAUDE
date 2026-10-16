from pathlib import Path
import shutil,uuid
def quarantine_file(path,folder):
 folder=Path(folder); folder.mkdir(parents=True,exist_ok=True); dst=folder/(uuid.uuid4().hex+"_"+Path(path).name); shutil.copy2(path,dst); return dst
