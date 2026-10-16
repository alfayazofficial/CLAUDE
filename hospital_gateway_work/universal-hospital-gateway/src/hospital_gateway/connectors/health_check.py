import socket
class TcpHealthCheck:
    def test(self,host,port,timeout=2):
        try:
            with socket.create_connection((host,int(port)),timeout=timeout): return {"ok":True,"detail":"TCP connection succeeded; protocol compatibility not verified."}
        except (OSError,ValueError) as e: return {"ok":False,"detail":type(e).__name__}
