"""Start the app:  python run.py      (then open http://localhost:8000)

Options:
  python run.py --lan     listen on your Wi-Fi so a phone can open it
  python run.py --reset   delete the local database and reload demo data
  python run.py --dev     auto-restart when you edit code
"""
import shutil
import sys
from pathlib import Path

import uvicorn

BASE = Path(__file__).resolve().parent

if __name__ == "__main__":
    if "--reset" in sys.argv:
        for f in (BASE / "instance").glob("paramount.db*"):
            f.unlink()
        shutil.rmtree(BASE / "uploads", ignore_errors=True)
        print("Local database and uploads deleted. Demo data will be recreated.")

    host = "0.0.0.0" if "--lan" in sys.argv else "127.0.0.1"
    print("\n  Paramount Academy Lite v2  ->  http://localhost:8000\n")
    uvicorn.run("app.main:app", host=host, port=8000, reload="--dev" in sys.argv)
