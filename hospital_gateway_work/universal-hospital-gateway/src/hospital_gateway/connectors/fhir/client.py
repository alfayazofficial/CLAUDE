import http.client, json, urllib.request, urllib.error
from urllib.parse import urlparse
import ssl

class _HttpsOnlyRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlparse(newurl).scheme != "https":
            raise urllib.error.URLError("Redirect to non-HTTPS URL refused.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def check_metadata(base_url,timeout=5):
    url=base_url.strip().rstrip("/")+"/metadata"
    parsed=urlparse(url)
    if parsed.scheme!="https" or not parsed.hostname: return {"ok":False,"detail":"FHIR metadata check requires a valid HTTPS base URL."}
    req=urllib.request.Request(url,headers={"Accept":"application/fhir+json, application/json"})
    opener=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context()),_HttpsOnlyRedirect)
    try:
        with opener.open(req,timeout=timeout) as r:
            data=json.loads(r.read(2_000_000).decode("utf-8"))
            if not isinstance(data,dict): return {"ok":False,"detail":"Response is not a FHIR resource object."}
            return {"ok":True,"http_status":r.status,"resourceType":data.get("resourceType"),"fhirVersion":data.get("fhirVersion")}
    except (OSError,http.client.HTTPException,ValueError) as e: return {"ok":False,"detail":type(e).__name__}
def capability_summary(data):
    return {"resourceType":data.get("resourceType"),"fhirVersion":data.get("fhirVersion"),"software":data.get("software",{}).get("name")}
