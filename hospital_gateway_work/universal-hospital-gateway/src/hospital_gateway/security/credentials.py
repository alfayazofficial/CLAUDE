class CredentialStore:
 """Use Windows Credential Manager or a managed vault for real secrets."""
 def get(self,key): raise NotImplementedError("Configure a secure credential provider first.")
 def set(self,key,value): raise NotImplementedError("Never save secrets in config files or logs.")
