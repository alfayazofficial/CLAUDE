def safe_close(resources):
 for resource in resources:
  try: resource.close()
  except Exception: pass
