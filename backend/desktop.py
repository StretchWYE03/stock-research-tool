"""Ticker desktop launcher.

Starts the FastAPI server in a background thread and opens a native window
(pywebview on Edge WebView2) pointed at it. Closing the window shuts the
server down.

  python desktop.py                 opens the app window
  python desktop.py --no-window     server only, prints the URL (for tests)
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
import threading
import time
import traceback
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from uvicorn import Config, Server  # noqa: E402

from app.main import app  # noqa: E402

DEFAULT_PORT = 8765
PORT_SCAN_TRIES = 20
BOOT_TIMEOUT_S = 45


def _ensure_stdio() -> None:
    """Windowed PyInstaller builds launch with no console, so sys.stdout and
    sys.stderr are None. uvicorn's logging setup calls sys.stdout.isatty()
    while building its Config and crashes on None; point the missing streams
    at devnull so the server can boot.
    """
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")


def _write_crash_log() -> None:
    """Windowed apps have no console, so a failed boot would be silent. When
    frozen, append the traceback to a log file next to the executable.
    """
    if not getattr(sys, "frozen", False):
        return
    try:
        log_path = Path(sys.executable).resolve().parent / "ticker-error.log"
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}]\n{traceback.format_exc()}\n")
    except Exception:
        pass


def free_port(start: int = DEFAULT_PORT) -> int:
    """Return the first free port at or above start, on 127.0.0.1."""
    for port in range(start, start + PORT_SCAN_TRIES):
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(
        f"no free port found from {start} to {start + PORT_SCAN_TRIES - 1}"
    )


def wait_until_up(url: str, timeout_s: float = BOOT_TIMEOUT_S) -> None:
    """Block until the server answers, so the window never opens on an error."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError(f"server did not come up at {url}")


def main() -> None:
    _ensure_stdio()

    parser = argparse.ArgumentParser(description="Ticker desktop app")
    parser.add_argument(
        "--no-window", action="store_true", help="server only, no window"
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT, help="first port to try"
    )
    args = parser.parse_args()

    port = free_port(args.port)
    url = f"http://127.0.0.1:{port}"

    try:
        server = Server(Config(app, host="127.0.0.1", port=port, log_level="warning"))
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()
        wait_until_up(url)
    except Exception:
        _write_crash_log()
        raise

    if args.no_window:
        # Note: when frozen with --windowed there is no console, so Ctrl+C
        # never arrives; kill the process externally instead.
        print(f"Ticker server running at {url}. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            server.should_exit = True
            thread.join(timeout=5)
        return

    import webview

    webview.create_window(
        "Ticker", url, width=1440, height=900, min_size=(1024, 680)
    )
    webview.start()
    server.should_exit = True
    thread.join(timeout=5)


if __name__ == "__main__":
    main()
