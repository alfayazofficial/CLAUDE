class RoutingService:
 def route(self,record,destination):
  if not destination or not destination.get("enabled"): raise PermissionError("Destination is not enabled and authorized.")
  raise NotImplementedError("Destination adapters require separate validation; external delivery disabled by default.")
