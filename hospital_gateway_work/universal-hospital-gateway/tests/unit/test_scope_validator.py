import pytest
from hospital_gateway.discovery.scope_validator import validate_cidr
from hospital_gateway.domain.errors import AuthorizationError, ValidationError
def test_requires_confirmation():
 with pytest.raises(AuthorizationError): validate_cidr("192.168.56.0/29")
def test_rejects_large_range():
 with pytest.raises(ValidationError): validate_cidr("192.168.0.0/16",True)
def test_accepts_small_private_range(): assert validate_cidr("192.168.56.0/29",True).num_addresses==8
def test_rejects_public_range():
 with pytest.raises(ValidationError): validate_cidr("8.8.8.0/29",True)
