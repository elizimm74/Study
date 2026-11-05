// Tiny web server used by the benches: serves one folder of public/demo as a
// whole website. "/pricing" also finds "pricing.html".
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "public", "demo");

function serve(dir) {
  return new Promise((resolve) => {
    const base = path.join(ROOT, dir);
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      let file = path.join(base, p);
      if (!file.startsWith(base)) return res.writeHead(403).end();
      if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/html" });
        return res.end("<title>404 Not Found</title><h1>Page not found</h1>");
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

module.exports = { serve };
