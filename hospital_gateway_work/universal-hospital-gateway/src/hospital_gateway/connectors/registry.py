PROTOCOL_STATUS = {
 "JSON/CSV/XML": "IMPLEMENTED — local file parsing",
 "TCP health check": "IMPLEMENTED — reachability only",
 "FHIR REST": "PARTIAL — read-only metadata check only",
 "HL7 v2 / MLLP": "SCAFFOLD — profile/transport implementation required",
 "DICOM": "SCAFFOLD — validated DICOM services required",
 "Modbus TCP": "PARTIAL — real Modbus TCP read (function 3); vendor register map required",
 "Attendance terminal": "DEMO — simulator protocol only; real terminals need vendor SDK/protocol",
 "OPC UA": "SCAFFOLD — certificates/node policy required",
 "Vendor SDK": "SCAFFOLD — vendor SDK and documentation required",
}
def status_catalog(): return dict(PROTOCOL_STATUS)
