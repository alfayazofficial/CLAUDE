import json, os, queue, socket, sys, threading, time, tkinter as tk
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tkinter import ttk, messagebox

from hospital_gateway.discovery.scope_validator import validate_cidr
from hospital_gateway.domain.errors import GatewayError
from hospital_gateway.pipeline.parser import FileParser
from hospital_gateway.connectors.fhir.client import check_metadata

APP_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parents[3]
DATA_DIR = APP_DIR / "data"
INCOMING_DIR = APP_DIR / "incoming"
CONFIG_FILE = DATA_DIR / "config.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)
INCOMING_DIR.mkdir(parents=True, exist_ok=True)

PORT_HINTS = {
    80: ("HTTP / Web API", "Web endpoint; verify the actual API"),
    443: ("HTTPS / Web API", "Secure web endpoint; may be vendor API or FHIR"),
    104: ("DICOM", "Possible DICOM service; verify with imaging team"),
    2575: ("HL7 v2 MLLP", "Common MLLP port; deployments vary"),
    502: ("Modbus TCP", "Possible automation interface; verify vendor docs"),
    11112: ("DICOM", "Common alternate DICOM port"),
    4840: ("OPC UA", "Possible OPC UA endpoint"),
    8000: ("HTTP / API", "Possible web API"),
    8080: ("HTTP / API", "Possible web API"),
    8443: ("HTTPS / API", "Possible secure API"),
    22: ("SSH", "Management port, not a clinical feed"),
    21: ("FTP", "Legacy file transfer; use only if approved"),
    23: ("Telnet", "Insecure management service; do not use"),
}
PORTS = list(PORT_HINTS)

def load_config():
    default = {"connectors": [], "last_discovery": None}
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict): return data
    except FileNotFoundError:
        return default
    except (OSError, ValueError):
        pass
    # Unreadable config: keep a copy so the next save cannot silently destroy the user's connectors.
    try: CONFIG_FILE.replace(CONFIG_FILE.with_name(f"config.corrupt-{int(time.time())}.json"))
    except OSError: pass
    return default

def save_config(cfg):
    tmp = CONFIG_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    tmp.replace(CONFIG_FILE)

def probe(ip, port, timeout=0.20):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            return sock.connect_ex((ip, port)) == 0
    except OSError:
        return False

def scan_host(ip):
    opened = [p for p in PORTS if probe(ip, p)]
    if not opened: return None
    try: hostname = socket.gethostbyaddr(ip)[0]
    except Exception: hostname = ""
    suggestions, seen = [], set()
    for p in opened:
        name, hint = PORT_HINTS[p]
        if name not in seen:
            suggestions.append({"protocol": name, "hint": hint, "port": p})
            seen.add(name)
    return {"ip": ip, "hostname": hostname, "open_ports": opened, "suggestions": suggestions}

def scan_subnet(cidr):
    try: net = validate_cidr(cidr, confirmed=True)
    except GatewayError as e: return None, str(e)
    hosts = list(net.hosts())
    found = []
    with ThreadPoolExecutor(max_workers=20) as pool:
        for result in pool.map(scan_host, map(str, hosts)):
            if result: found.append(result)
    return {"subnet": str(net), "scanned_hosts": len(hosts), "devices": found,
            "time": time.strftime("%Y-%m-%d %H:%M:%S")}, None

PARSER = FileParser()

def file_preview():
    out = []
    for p in sorted(INCOMING_DIR.iterdir()):
        if not p.is_file() or p.suffix.lower() not in {".json", ".csv", ".xml"}: continue
        try:
            payload = PARSER.parse(p)  # size-limited; XML DTD/entities rejected
            out.append((p.name, p.suffix[1:].upper(), str(payload)[:600]))
        except Exception as e:
            out.append((p.name, "ERROR", str(e) if isinstance(e, GatewayError) else type(e).__name__))
    return out

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Universal Hospital Integration Gateway | Local Desktop")
        self.geometry("1120x760")
        self.minsize(900, 620)
        self.configure(bg="#f3f6fb")
        self.cfg = load_config()
        self._ui_calls = queue.Queue()  # worker threads hand results to the Tk thread through this
        self.devices = (self.cfg.get("last_discovery") or {}).get("devices", [])
        self._style()
        self._build()
        self.refresh_all()
        # Live local refresh: keeps file previews and connector/device counters current.
        self.after(5000, self._auto_refresh)
        self.after(50, self._drain_ui_calls)

    def _style(self):
        s = ttk.Style(self)
        try: s.theme_use("clam")
        except tk.TclError: pass
        s.configure("TFrame", background="#f3f6fb")
        s.configure("Panel.TFrame", background="#ffffff")
        s.configure("TLabel", background="#f3f6fb", foreground="#1c2b42", font=("Segoe UI", 10))
        s.configure("Title.TLabel", font=("Segoe UI", 22, "bold"), foreground="#182740")
        s.configure("Sub.TLabel", foreground="#78869a", font=("Segoe UI", 9))
        s.configure("PanelTitle.TLabel", background="#ffffff", font=("Segoe UI", 12, "bold"))
        s.configure("TButton", font=("Segoe UI", 9), padding=7)
        s.configure("Accent.TButton", background="#3267df", foreground="#ffffff", font=("Segoe UI", 9, "bold"))
        s.map("Accent.TButton", background=[("active", "#2455c4")])
        s.configure("Treeview", rowheight=28, font=("Segoe UI", 9))
        s.configure("Treeview.Heading", font=("Segoe UI", 9, "bold"))
        s.configure("TNotebook", background="#f3f6fb", borderwidth=0)
        s.configure("TNotebook.Tab", padding=(16, 10), font=("Segoe UI", 9, "bold"))

    def _build(self):
        top = ttk.Frame(self, padding=(22, 18, 22, 10)); top.pack(fill="x")
        title_box = ttk.Frame(top); title_box.pack(side="left", fill="x", expand=True)
        ttk.Label(title_box, text="UNIVERSAL HOSPITAL INTEGRATION GATEWAY", style="Sub.TLabel").pack(anchor="w")
        ttk.Label(title_box, text="Desktop control center", style="Title.TLabel").pack(anchor="w", pady=(3,0))
        self.mode_label = ttk.Label(top, text="● DEMO-SAFE MODE", foreground="#13866e")
        self.mode_label.pack(side="right", anchor="n", pady=9)
        notice = tk.Frame(self, bg="#fff6df", padx=14, pady=10)
        notice.pack(fill="x", padx=22, pady=(0, 12))
        tk.Label(notice, text="SAFETY NOTICE", bg="#fff6df", fg="#75591f", font=("Segoe UI", 9, "bold")).pack(side="left")
        tk.Label(notice, text="Only scan networks you are authorized to administer. Port matches are hints, not device identification.", bg="#fff6df", fg="#8a7547", font=("Segoe UI", 9)).pack(side="left", padx=12)
        self.tabs = ttk.Notebook(self); self.tabs.pack(fill="both", expand=True, padx=22, pady=(0, 18))
        self.overview_tab = ttk.Frame(self.tabs, padding=15)
        self.discovery_tab = ttk.Frame(self.tabs, padding=15)
        self.connectors_tab = ttk.Frame(self.tabs, padding=15)
        self.protocol_tab = ttk.Frame(self.tabs, padding=15)
        self.files_tab = ttk.Frame(self.tabs, padding=15)
        self.tabs.add(self.overview_tab, text="Overview")
        self.tabs.add(self.discovery_tab, text="Network discovery")
        self.tabs.add(self.connectors_tab, text="Connectors")
        self.tabs.add(self.protocol_tab, text="Protocol catalog")
        self.tabs.add(self.files_tab, text="Incoming files")
        self._build_overview(); self._build_discovery(); self._build_connectors(); self._build_protocols(); self._build_files()

    def panel(self, parent, title, subtitle=None):
        frame = ttk.Frame(parent, style="Panel.TFrame", padding=14)
        ttk.Label(frame, text=title, style="PanelTitle.TLabel").pack(anchor="w")
        if subtitle: ttk.Label(frame, text=subtitle, style="Sub.TLabel", wraplength=850).pack(anchor="w", pady=(4,10))
        return frame

    def _build_overview(self):
        row = ttk.Frame(self.overview_tab); row.pack(fill="x")
        self.stat_connectors = tk.StringVar(value="0")
        self.stat_devices = tk.StringVar(value="—")
        self.stat_files = tk.StringVar(value="0")
        for title, var in [("Saved connectors", self.stat_connectors), ("Discovered endpoints", self.stat_devices), ("Incoming files", self.stat_files)]:
            p = self.panel(row, title)
            tk.Label(p, textvariable=var, bg="#ffffff", fg="#3267df", font=("Segoe UI", 24, "bold")).pack(anchor="w", pady=10)
            p.pack(side="left", fill="both", expand=True, padx=(0,10))
        demo = self.panel(self.overview_tab, "Sample data", "All values below are fictional demo records. No medical device is connected.")
        demo.pack(fill="both", expand=True, pady=(15,0))
        self.demo_tree = ttk.Treeview(demo, columns=("source","type","state","value"), show="headings")
        for col, label, width in [("source","Source",250),("type","Device type",170),("state","State",130),("value","Sample",260)]:
            self.demo_tree.heading(col,text=label); self.demo_tree.column(col,width=width)
        self.demo_tree.pack(fill="both",expand=True,pady=(10,0))
        for x in [("Bedside Monitor — DEMO","Patient monitor","SIMULATED","SpO₂ 98%"),("ECG Gateway — DEMO","ECG","SIMULATED","Heart rate 76 bpm"),("Laboratory Feed — DEMO","Lab analyzer","SIMULATED","No real patient data")]:
            self.demo_tree.insert("","end",values=x)
        self.quick_note = ttk.Label(self.overview_tab, text="Next: open Network discovery, enter an approved subnet, then choose Configure on a result.", style="Sub.TLabel")
        self.quick_note.pack(anchor="w", pady=(14,0))

    def _build_discovery(self):
        p = self.panel(self.discovery_tab, "Network auto-discovery", "Scans a specific IPv4 subnet for a short list of common TCP ports. Maximum 256 addresses per scan.")
        p.pack(fill="x")
        line = ttk.Frame(p, style="Panel.TFrame"); line.pack(fill="x", pady=(10,4))
        ttk.Label(line, text="Subnet / CIDR:").pack(side="left")
        self.subnet_var = tk.StringVar(value="192.168.1.0/24")
        ttk.Entry(line, textvariable=self.subnet_var, width=28).pack(side="left", padx=10)
        self.authorized_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(p, text="I am authorized to scan this network and have approval for these connection checks.", variable=self.authorized_var).pack(anchor="w", pady=7)
        self.scan_button = ttk.Button(p, text="Scan authorized subnet", style="Accent.TButton", command=self.start_scan)
        self.scan_button.pack(anchor="w", pady=(5,0))
        self.scan_status = tk.StringVar(value="No scan run yet.")
        ttk.Label(p, textvariable=self.scan_status, style="Sub.TLabel", wraplength=950).pack(anchor="w", pady=8)
        results = self.panel(self.discovery_tab, "Discovered endpoints", "Select a row and click Configure to pre-fill the connector form.")
        results.pack(fill="both", expand=True, pady=(14,0))
        cols=("hostname","ip","ports","hints")
        self.device_tree=ttk.Treeview(results,columns=cols,show="headings",selectmode="browse")
        for c,l,w in [("hostname","Hostname",220),("ip","IP address",140),("ports","Open ports",180),("hints","Protocol suggestions",380)]:
            self.device_tree.heading(c,text=l);self.device_tree.column(c,width=w)
        self.device_tree.pack(fill="both",expand=True,pady=(8,8))
        ttk.Button(results,text="Configure selected device →",command=self.configure_selected).pack(anchor="e")

    def _build_connectors(self):
        left = self.panel(self.connectors_tab, "Connector setup", "Select a discovered endpoint to auto-fill host, port, and protocol hints. Confirm all fields against vendor documentation.")
        left.pack(fill="x")
        self.fields = {}
        def field(label, key, kind="entry", values=None):
            r=ttk.Frame(left,style="Panel.TFrame");r.pack(fill="x",pady=4)
            ttk.Label(r,text=label,width=24).pack(side="left",anchor="nw",pady=6)
            if kind=="combo":
                w=ttk.Combobox(r,values=values,state="readonly",width=50)
                w.set(values[0])
            else:
                w=ttk.Entry(r,width=54)
            w.pack(side="left",fill="x",expand=True);self.fields[key]=w
        field("Connector name","name")
        field("Protocol / interface","kind","combo",["FHIR REST","HL7 v2 MLLP","DICOM","JSON file drop","CSV file drop","XML file drop","Modbus TCP","OPC UA","Vendor TCP","Custom / vendor SDK"])
        field("Host / IP","host")
        field("Port","port")
        field("Base URL (FHIR/API)","base_url")
        field("Vendor / model / notes","notes")
        self.enabled_var=tk.BooleanVar(value=False)
        ttk.Checkbutton(left,text="Mark connector enabled (configuration only; does not guarantee a live connection)",variable=self.enabled_var).pack(anchor="w",pady=8)
        btns=ttk.Frame(left,style="Panel.TFrame");btns.pack(anchor="w",pady=(5,0))
        ttk.Button(btns,text="Save connector",style="Accent.TButton",command=self.save_connector).pack(side="left")
        ttk.Button(btns,text="Test FHIR /metadata (read-only)",command=self.test_fhir).pack(side="left",padx=8)
        listing=self.panel(self.connectors_tab,"Saved connectors","Configurations are stored locally in data/config.json.")
        listing.pack(fill="both",expand=True,pady=(14,0))
        self.connector_tree=ttk.Treeview(listing,columns=("name","kind","endpoint","status"),show="headings")
        for c,l,w in [("name","Name",220),("kind","Protocol",200),("endpoint","Endpoint",300),("status","Flag",150)]:
            self.connector_tree.heading(c,text=l);self.connector_tree.column(c,width=w)
        self.connector_tree.pack(fill="both",expand=True,pady=(8,8))
        ttk.Button(listing,text="Remove selected",command=self.remove_connector).pack(anchor="e")

    def _build_protocols(self):
        p=self.panel(self.protocol_tab,"Protocol catalog","Options are listed to make the interface extensible. A listed protocol is not necessarily implemented for live data.")
        p.pack(fill="both",expand=True)
        rows=[
          ("FHIR REST","HTTPS / API endpoint","Read-only /metadata test is available in this starter."),
          ("HL7 v2 MLLP","Common port 2575; ports vary","Adapter extension and message validation required."),
          ("DICOM","Common ports 104 / 11112","Adapter extension required; verify AE titles and network policy."),
          ("JSON / CSV / XML","Files placed in incoming/","Basic local file preview is supported."),
          ("Modbus TCP","Common port 502","Port hint only; use approved vendor documentation."),
          ("OPC UA","Common port 4840","Port hint only; certificate/security configuration required."),
          ("Vendor TCP / proprietary SDK","Device-specific","Vendor protocol docs, SDK, license, and tests required."),
          ("USB / serial","Local PC interfaces","Not universally discoverable; requires device-specific drivers."),
        ]
        for name,detect,status in rows:
            f=ttk.Frame(p,style="Panel.TFrame");f.pack(fill="x",pady=5)
            ttk.Label(f,text=name,width=27,font=("Segoe UI",10,"bold"),background="#ffffff").pack(side="left",anchor="n")
            inner=ttk.Frame(f,style="Panel.TFrame");inner.pack(side="left",fill="x",expand=True)
            ttk.Label(inner,text=detect,style="Sub.TLabel",background="#ffffff").pack(anchor="w")
            ttk.Label(inner,text=status,background="#ffffff",wraplength=650).pack(anchor="w",pady=(3,0))
            ttk.Separator(p,orient="horizontal").pack(fill="x",pady=5)

    def _build_files(self):
        p=self.panel(self.files_tab,"Incoming file preview","Place authorized JSON, CSV, or XML exports in the incoming folder inside the extracted app directory.")
        p.pack(fill="both",expand=True)
        bar=ttk.Frame(p,style="Panel.TFrame");bar.pack(fill="x",pady=(8,8))
        ttk.Button(bar,text="Open incoming folder",command=self.open_incoming).pack(side="left")
        ttk.Button(bar,text="Refresh preview",command=self.refresh_files).pack(side="left",padx=8)
        self.file_tree=ttk.Treeview(p,columns=("file","format","preview"),show="headings")
        for c,l,w in [("file","File",220),("format","Format",100),("preview","Preview (truncated)",650)]:
            self.file_tree.heading(c,text=l);self.file_tree.column(c,width=w)
        self.file_tree.pack(fill="both",expand=True)

    def start_scan(self):
        if not self.authorized_var.get():
            messagebox.showwarning("Authorization required","Confirm that you are authorized to scan this network.");return
        subnet=self.subnet_var.get().strip()
        self.scan_button.configure(state="disabled")
        self.scan_status.set("Scanning common TCP ports. Please wait…")
        def worker():
            try: result, err=scan_subnet(subnet)
            except Exception as e: result, err=None, f"Scan failed: {type(e).__name__}"
            self._ui_calls.put(lambda:self.finish_scan(result,err))
        threading.Thread(target=worker,daemon=True).start()

    def finish_scan(self,result,err):
        self.scan_button.configure(state="normal")
        if err:
            self.scan_status.set(err);messagebox.showerror("Discovery",err);return
        self.devices=result["devices"]
        self.cfg["last_discovery"]=result;save_config(self.cfg)
        self.scan_status.set(f"Checked {result['scanned_hosts']} addresses in {result['subnet']} at {result['time']}. Found {len(self.devices)} endpoints. Port matches are hints only.")
        self.populate_devices();self.refresh_all()

    @staticmethod
    def _fill(tree,rows):
        """Rebuild a tree only when its rows changed, so the 5s auto-refresh never drops the user's selection."""
        if getattr(tree,"_rows",None)==rows:return
        sel=tree.selection()
        for i in tree.get_children():tree.delete(i)
        for i,values in enumerate(rows):tree.insert("","end",iid=str(i),values=values)
        tree._rows=rows
        keep=[s for s in sel if tree.exists(s)]
        if keep:tree.selection_set(keep)

    def populate_devices(self):
        self._fill(self.device_tree,[(d.get("hostname") or "—",d["ip"],", ".join(map(str,d["open_ports"])),", ".join(s["protocol"] for s in d["suggestions"])) for d in self.devices])

    def configure_selected(self):
        sel=self.device_tree.selection()
        if not sel: messagebox.showinfo("Select a device","Select a discovered endpoint first.");return
        d=self.devices[int(sel[0])]
        self.fields["host"].delete(0,"end");self.fields["host"].insert(0,d["ip"])
        self.fields["name"].delete(0,"end");self.fields["name"].insert(0,(d.get("hostname") or d["ip"])+" connector")
        s=d["suggestions"][0]; protocol=s["protocol"]
        mapping={"HL7 v2 MLLP":"HL7 v2 MLLP","DICOM":"DICOM","Modbus TCP":"Modbus TCP","OPC UA":"OPC UA"}
        kind=mapping.get(protocol,"Vendor TCP")
        if protocol.startswith("HTTP") or protocol.startswith("HTTPS"):kind="FHIR REST"
        self.fields["kind"].set(kind)
        self.fields["port"].delete(0,"end");self.fields["port"].insert(0,str(s["port"]))
        self.fields["notes"].delete(0,"end");self.fields["notes"].insert(0,f"Discovered hostname: {d.get('hostname') or 'not resolved'}; open ports: {d['open_ports']}. Confirm actual device model and protocol.")
        if kind=="FHIR REST" and s["port"] in (80,443,8000,8080,8443):
            scheme="https" if s["port"] in (443,8443) else "http"
            self.fields["base_url"].delete(0,"end");self.fields["base_url"].insert(0,f"{scheme}://{d['ip']}:{s['port']}/fhir")
        self.tabs.select(self.connectors_tab)

    def save_connector(self):
        get=lambda k:self.fields[k].get().strip()
        if not get("name"):
            messagebox.showwarning("Missing name","Enter a connector name.");return
        port=None
        if get("port"):
            try: port=int(get("port"))
            except ValueError: messagebox.showwarning("Invalid port","Port must be a number.");return
            if not 1<=port<=65535: messagebox.showwarning("Invalid port","Port must be between 1 and 65535.");return
        item={"id":str(int(time.time()*1000)),"name":get("name"),"kind":get("kind"),"host":get("host"),"port":port,"base_url":get("base_url"),"notes":get("notes"),"enabled":self.enabled_var.get()}
        self.cfg.setdefault("connectors",[]).append(item);save_config(self.cfg)
        self.refresh_connectors();self.refresh_all()
        messagebox.showinfo("Saved","Connector configuration saved locally. This does not establish a live data connection.")
        for k,w in self.fields.items():
            if isinstance(w,ttk.Combobox):w.set("FHIR REST")
            else:w.delete(0,"end")
        self.enabled_var.set(False)

    def test_fhir(self):
        url=self.fields["base_url"].get().strip()
        if not url:messagebox.showinfo("FHIR test","Enter an HTTPS Base URL first.");return
        def worker():
            res=check_metadata(url)
            msg=(f"Reachable. resourceType={res.get('resourceType')}, fhirVersion={res.get('fhirVersion')}. This does not validate clinical mapping." if res["ok"] else f"Check failed: {res['detail']}")
            self._ui_calls.put(lambda:messagebox.showinfo("FHIR /metadata",msg))
        threading.Thread(target=worker,daemon=True).start()

    def remove_connector(self):
        sel=self.connector_tree.selection()
        if not sel:messagebox.showinfo("Select a connector","Select a connector to remove.");return
        idx=int(sel[0]);items=self.cfg.get("connectors",[])
        if 0<=idx<len(items) and messagebox.askyesno("Remove connector","Remove this saved configuration?"):
            items.pop(idx);save_config(self.cfg);self.refresh_connectors();self.refresh_all()

    def refresh_connectors(self):
        rows=[]
        for c in self.cfg.get("connectors",[]):
            endpoint=c.get("host") or c.get("base_url") or "—"
            if c.get("port"):endpoint+=f":{c['port']}"
            rows.append((c.get("name"),c.get("kind"),endpoint,"Enabled flag" if c.get("enabled") else "Saved / disabled"))
        self._fill(self.connector_tree,rows)

    def refresh_files(self):
        rows=file_preview()
        self._fill(self.file_tree,rows)
        self.stat_files.set(str(len(rows)))

    def open_incoming(self):
        try:
            if os.name=="nt":os.startfile(str(INCOMING_DIR))
            elif sys.platform=="darwin":os.system(f'open "{INCOMING_DIR}"')
            else:os.system(f'xdg-open "{INCOMING_DIR}"')
        except Exception as e:messagebox.showerror("Open folder",str(e))

    def _run_ui_calls(self):
        try:
            while True: self._ui_calls.get_nowait()()
        except queue.Empty: pass

    def _drain_ui_calls(self):
        try: self._run_ui_calls()
        finally:
            if self.winfo_exists(): self.after(50, self._drain_ui_calls)

    def _auto_refresh(self):
        try:
            if not self.winfo_exists(): return
            self.refresh_all()
        finally:
            if self.winfo_exists(): self.after(5000, self._auto_refresh)

    def refresh_all(self):
        self.cfg=load_config()
        self.stat_connectors.set(str(len(self.cfg.get("connectors",[]))))
        last=self.cfg.get("last_discovery") or {}
        if last.get("devices") is not None:
            self.devices=last.get("devices",[]);self.stat_devices.set(str(len(self.devices)));self.populate_devices()
        self.refresh_connectors();self.refresh_files()

if __name__ == "__main__":
    App().mainloop()
