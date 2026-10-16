from pathlib import Path
import logging, sys

def main():
    # Same root the desktop app uses, so data/logs never depend on the launch directory.
    root = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parents[2]
    for name in ("data", "incoming", "exports", "quarantine", "logs"):
        (root / name).mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=root / "logs" / "gateway.log", level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s", encoding="utf-8")
    from hospital_gateway.desktop.app import App
    App().mainloop()

if __name__ == "__main__":
    main()
