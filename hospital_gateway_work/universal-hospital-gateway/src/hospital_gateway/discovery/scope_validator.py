from ipaddress import ip_network, IPv4Network
from hospital_gateway.domain.errors import ValidationError, AuthorizationError
from hospital_gateway.domain.policies import MAX_SCAN_HOSTS

def validate_cidr(cidr, confirmed=False, max_hosts=MAX_SCAN_HOSTS):
    if not confirmed: raise AuthorizationError("Confirm authorization before scanning.")
    try: net = ip_network(cidr.strip(), strict=False)
    except ValueError as e: raise ValidationError("Enter a valid IPv4 CIDR range.") from e
    if not isinstance(net, IPv4Network): raise ValidationError("Only IPv4 ranges are supported.")
    if net.num_addresses > max_hosts: raise ValidationError(f"Range exceeds {max_hosts} addresses.")
    if not (net.is_private or net.is_loopback or net.is_link_local): raise ValidationError("Only private, loopback, or link-local ranges are permitted.")
    if net.is_multicast or net.is_unspecified or net.network_address in ip_network("0.0.0.0/8"): raise ValidationError("This range is not permitted.")
    return net
