def validate_startup(root):
 for name in ("data","incoming","exports","quarantine","logs"): (root/name).mkdir(parents=True,exist_ok=True)
 return True
