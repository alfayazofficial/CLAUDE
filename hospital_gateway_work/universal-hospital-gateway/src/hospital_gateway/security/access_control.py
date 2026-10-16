from ipaddress import ip_address,ip_network
def in_allowlist(host,networks):
 try: ip=ip_address(host)
 except ValueError: return False
 return any(ip in ip_network(n,strict=False) for n in networks)
