from pathlib import Path
from hospital_gateway.connectors.files.json_reader import JsonReader
from hospital_gateway.connectors.files.csv_reader import CsvReader
from hospital_gateway.connectors.files.xml_reader import XmlReader
class FileParser:
 def __init__(self): self.readers={".json":JsonReader(),".csv":CsvReader(),".xml":XmlReader()}
 def parse(self,path):
  p=Path(path)
  if p.suffix.lower() not in self.readers: raise ValueError("Only JSON, CSV, XML are supported.")
  return self.readers[p.suffix.lower()].parse_file(p)
