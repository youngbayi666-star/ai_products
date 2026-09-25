"""Run the local festival prototype and generate QR images without a cloud service."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import json
import os
import socket
import ipaddress
import threading
import time

import qrcode


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8765"))


class EchoStore:
    """Keep only anonymous visual parameters for the live wall."""

    PERSONAS = {"pulse", "glow", "roam", "wild"}
    STYLES = {"neon", "sunset", "silver"}

    def __init__(self):
        self._lock = threading.Lock()
        self._echoes = []
        self._count = 0
        self._totals = {persona: 0 for persona in self.PERSONAS}

    def add(self, payload):
        if not isinstance(payload, dict):
            raise ValueError("Invalid contribution")
        persona, style, seed = payload.get("persona"), payload.get("style"), payload.get("seed")
        if persona not in self.PERSONAS or style not in self.STYLES or type(seed) is not int or not 0 <= seed <= 0xFFFFFFFF:
            raise ValueError("Invalid contribution")
        with self._lock:
            self._count += 1
            self._totals[persona] += 1
            echo = {"id": self._count, "persona": persona, "style": style, "seed": seed, "createdAt": int(time.time())}
            self._echoes.append(echo)
            self._echoes = self._echoes[-80:]
            return dict(echo)

    def snapshot(self):
        with self._lock:
            return {"count": self._count, "totals": dict(self._totals), "echoes": [dict(echo) for echo in self._echoes]}


ECHO_STORE = EchoStore()


def lan_ip():
    try:
        addresses = socket.gethostbyname_ex(socket.gethostname())[2]
        local_ranges = [ipaddress.ip_network('192.168.0.0/16'), ipaddress.ip_network('10.0.0.0/8'), ipaddress.ip_network('172.16.0.0/12')]
        for address in addresses:
            if any(ipaddress.ip_address(address) in network for network in local_ranges):
                return address
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            payload = json.dumps({"lanHost": lan_ip()}).encode("utf-8")
            self.respond(payload, "application/json; charset=utf-8")
            return
        if parsed.path == "/api/echoes":
            self.respond(json.dumps(ECHO_STORE.snapshot()).encode("utf-8"), "application/json; charset=utf-8")
            return
        if parsed.path == "/api/qr":
            text = parse_qs(parsed.query).get("text", [""])[0]
            if len(text) > 2048 or urlparse(text).scheme not in ("http", "https"):
                self.send_error(400, "Invalid share URL")
                return
            qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=5, border=2)
            qr.add_data(text)
            qr.make(fit=True)
            image = qr.make_image(fill_color="#15182e", back_color="white")
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            self.respond(buffer.getvalue(), "image/png")
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/echoes":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 1024:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(size))
            echo = ECHO_STORE.add(payload)
        except (ValueError, json.JSONDecodeError):
            self.send_error(400, "Invalid contribution")
            return
        self.respond(json.dumps({"echo": echo, "count": ECHO_STORE.snapshot()["count"]}).encode("utf-8"), "application/json; charset=utf-8", status=201)

    def respond(self, data, content_type, status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"ECHO WAVE running at http://localhost:{PORT}")
    print(f"Phone on same Wi-Fi: http://{lan_ip()}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
