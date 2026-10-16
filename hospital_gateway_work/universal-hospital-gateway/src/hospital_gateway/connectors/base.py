from abc import ABC, abstractmethod
class ConnectorAdapter(ABC):
    protocol_id = "base"; implementation_status = "SCAFFOLD"
    @abstractmethod
    def validate_config(self, config): ...
    @abstractmethod
    def test_connection(self, config): ...
    def receive(self, config): raise NotImplementedError("Receive is not implemented for this adapter.")
    def close(self): pass
