class Destination:
 def validate_config(self,config): raise NotImplementedError
 def send(self,message,idempotency_key=None): raise NotImplementedError
