PORT_HINTS = {80:"HTTP hint",443:"HTTPS hint",104:"Possible DICOM",502:"Possible Modbus TCP",2575:"Possible HL7 MLLP",8080:"HTTP alternate hint",8443:"HTTPS alternate hint",11112:"Possible DICOM",4840:"Possible OPC UA"}
def hint_for_port(port): return PORT_HINTS.get(port, "Unknown TCP service; identity unverified")
