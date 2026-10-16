class GatewayError(Exception): pass
class ValidationError(GatewayError): pass
class AuthorizationError(GatewayError): pass
class ConnectorError(GatewayError): pass
