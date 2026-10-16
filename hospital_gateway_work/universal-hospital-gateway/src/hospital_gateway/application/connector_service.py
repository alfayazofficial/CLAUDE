from hospital_gateway.domain.errors import ValidationError
PROTOCOLS=("JSON/CSV/XML","TCP health check","FHIR REST","HL7 v2 / MLLP","DICOM","Modbus TCP","OPC UA","Vendor SDK","Attendance terminal")
def validate_connector(name,host,port,protocol):
 try: port=int(port)
 except (TypeError,ValueError): raise ValidationError("Port must be a number.")
 if not name.strip() or not host.strip(): raise ValidationError("Name and host are required.")
 if not 1<=port<=65535: raise ValidationError("Port must be 1-65535.")
 if protocol not in PROTOCOLS: raise ValidationError("Unsupported protocol.")
 return {"name":name.strip(),"host":host.strip(),"port":port,"protocol":protocol}
