import pytest
from hospital_gateway.connectors.files.xml_reader import XmlReader
from hospital_gateway.discovery.scope_validator import validate_cidr
from hospital_gateway.domain.errors import ValidationError

@pytest.mark.parametrize("enc", ["utf-8", "utf-16", "utf-16-le"])
def test_xml_dtd_blocked_in_every_encoding(tmp_path, enc):
    p = tmp_path / "a.xml"
    body = f'<?xml version="1.0" encoding="{enc.split("-le")[0]}"?><!DOCTYPE r [<!ENTITY x "bad">]><r>&x;</r>'
    p.write_bytes(body.encode(enc))
    with pytest.raises(ValidationError):
        XmlReader().parse_file(p)

def test_xml_lowercase_doctype_blocked(tmp_path):
    p = tmp_path / "a.xml"; p.write_text('<!doctype r [<!entity x "y">]><r/>')
    with pytest.raises(ValidationError): XmlReader().parse_file(p)

def test_xml_children(tmp_path):
    p = tmp_path / "a.xml"; p.write_text("<r><a>1</a><b/></r>")
    assert XmlReader().parse_file(p) == {"root": "r", "children": [{"tag": "a", "text": "1"}, {"tag": "b", "text": None}]}

def test_oversize_file_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr("hospital_gateway.connectors.files.xml_reader.MAX_FILE_BYTES", 5)
    p = tmp_path / "a.xml"; p.write_text("<r>1234567</r>")
    with pytest.raises(ValidationError): XmlReader().parse_file(p)

@pytest.mark.parametrize("cidr", ["0.0.0.0/29", "224.0.0.0/30", "::1/128", "not-a-cidr", "10.0.0.0/8"])
def test_scope_rejects(cidr):
    with pytest.raises(ValidationError): validate_cidr(cidr, True)

@pytest.mark.parametrize("cidr", ["10.1.2.0/24", "127.0.0.1/32", "172.16.0.0/28", "169.254.1.0/29"])
def test_scope_accepts(cidr):
    assert validate_cidr(cidr, True)
