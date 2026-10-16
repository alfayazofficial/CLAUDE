SENSITIVE_KEYS={"password","token","secret","authorization","api_key","patient_name","dob","mrn"}
def redact(value):
 if isinstance(value,dict): return {k:("[REDACTED]" if k.lower() in SENSITIVE_KEYS else redact(v)) for k,v in value.items()}
 if isinstance(value,list): return [redact(x) for x in value]
 return value
