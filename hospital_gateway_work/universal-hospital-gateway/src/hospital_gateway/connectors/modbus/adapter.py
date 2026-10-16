"""Modbus TCP client (function 0x03, read holding registers) plus a register-map decoder.

Real Modbus TCP framing. The register map is device-specific: always take it from the vendor's documentation.
"""
import socket, struct
from hospital_gateway.connectors.base import ConnectorAdapter
from hospital_gateway.domain.errors import ConnectorError, ValidationError

EXCEPTIONS = {1: "illegal function", 2: "illegal data address", 3: "illegal data value", 4: "device failure"}

class ModbusAdapter(ConnectorAdapter):
    protocol_id = "modbus_tcp"; implementation_status = "PARTIAL — read holding registers only"

    def __init__(self): self._tid = 0

    def validate_config(self, config):
        host, port = config.get("host"), config.get("port", 502)
        if not host: raise ValidationError("Host is required.")
        if not 1 <= int(port) <= 65535: raise ValidationError("Port must be 1-65535.")
        for r in config.get("register_map", []):
            if not {"name", "address", "scale"} <= set(r): raise ValidationError("Register map rows need name, address, scale.")
        return True

    def test_connection(self, config):
        try: self.read_registers(config["host"], config.get("port", 502), config.get("unit", 1), 0, 1); return {"ok": True, "detail": "Modbus read succeeded."}
        except (ConnectorError, OSError) as e: return {"ok": False, "detail": str(e) or type(e).__name__}

    def read_registers(self, host, port, unit, start, count, timeout=2.0):
        if not 1 <= count <= 125: raise ValidationError("Modbus allows reading 1-125 registers at once.")
        self._tid = (self._tid + 1) & 0xFFFF
        req = struct.pack(">HHHBBHH", self._tid, 0, 6, unit, 3, start, count)
        with socket.create_connection((host, int(port)), timeout=timeout) as s:
            s.sendall(req)
            hdr = self._recv(s, 7)
            tid, proto, length, _unit = struct.unpack(">HHHB", hdr)
            if proto != 0 or tid != self._tid or not 2 <= length <= 254: raise ConnectorError("Invalid Modbus response header.")
            body = self._recv(s, length - 1)
        func = body[0]
        if func == 0x83: raise ConnectorError(f"Modbus exception: {EXCEPTIONS.get(body[1], body[1])}")
        if func != 3 or body[1] != count * 2 or len(body) != 2 + count * 2: raise ConnectorError("Malformed Modbus response.")
        return list(struct.unpack(f">{count}H", body[2:]))

    @staticmethod
    def _recv(s, n):
        buf = b""
        while len(buf) < n:
            chunk = s.recv(n - len(buf))
            if not chunk: raise ConnectorError("Connection closed mid-response.")
            buf += chunk
        return buf

    def receive(self, config):
        """Return one observation per mapped register: value = raw (signed if requested) * scale."""
        rmap = config["register_map"]
        lo, hi = min(r["address"] for r in rmap), max(r["address"] for r in rmap)
        regs = self.read_registers(config["host"], config.get("port", 502), config.get("unit", 1), lo, hi - lo + 1)
        out = []
        for r in rmap:
            raw = regs[r["address"] - lo]
            if r.get("signed") and raw >= 0x8000: raw -= 0x10000
            out.append({"code": r["name"], "value": round(raw * r["scale"], 3), "unit": r.get("unit")})
        return out
