from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


class Preview(SimpleHTTPRequestHandler):
    def list_directory(self, path):
        self.send_error(403)
        return None


if __name__ == "__main__":
    assets = Path(__file__).resolve().parent / "docs"
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(Preview, directory=str(assets))) as server:
        address = f"http://127.0.0.1:{server.server_port}/"
        print("Framecut Studio", address, flush=True)
        threading.Timer(0.3, webbrowser.open, args=(address,)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
