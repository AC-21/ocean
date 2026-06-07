from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class HarborlineHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/*") or self.path.startswith("/*?"):
            self.path = "/index.html"
        super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4173), HarborlineHandler)
    print("Serving Harborline at http://127.0.0.1:4173/")
    server.serve_forever()
