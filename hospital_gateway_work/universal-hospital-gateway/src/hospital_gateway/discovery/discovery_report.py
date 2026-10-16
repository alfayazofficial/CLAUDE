def summarize(rows):
    opened=[r for r in rows if r["is_open"]]
    return {"observations":len(rows),"open_ports":len(opened),"hosts":len({r["ip"] for r in opened}),"warning":"Port hints do not establish device identity or protocol compatibility."}
