def capability_summary(data):
    return {"resourceType":data.get("resourceType"),"fhirVersion":data.get("fhirVersion"),"software":data.get("software",{}).get("name")}
