import pytest
from hospital_gateway.connectors.files.json_reader import JsonReader
from hospital_gateway.connectors.files.csv_reader import CsvReader
from hospital_gateway.connectors.files.xml_reader import XmlReader
from hospital_gateway.domain.errors import ValidationError
def test_json(tmp_path):
 p=tmp_path/"a.json"; p.write_text('{"ok":true}',encoding="utf-8"); assert JsonReader().parse_file(p)["ok"]
def test_csv(tmp_path):
 p=tmp_path/"a.csv"; p.write_text("id,value\n1,test\n",encoding="utf-8"); assert CsvReader().parse_file(p)[0]["id"]=="1"
def test_xml(tmp_path):
 p=tmp_path/"a.xml"; p.write_text("<root><child>ok</child></root>",encoding="utf-8"); assert XmlReader().parse_file(p)["root"]=="root"
def test_xml_dtd_blocked(tmp_path):
 p=tmp_path/"a.xml"; p.write_text('<!DOCTYPE root [<!ENTITY x "bad">]><root>&x;</root>',encoding="utf-8")
 with pytest.raises(ValidationError): XmlReader().parse_file(p)
