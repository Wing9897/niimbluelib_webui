import { defineConfig } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.join(root, "lib");

function serveLib(req, res, next) {
  const raw = (req.url || "").split("?")[0];
  if (!raw.startsWith("/lib/")) return next();
  let name = "";
  try { name = decodeURIComponent(raw.slice("/lib/".length)); }
  catch { return next(); }
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return next();
  const file = path.join(libDir, name);
  if (!file.startsWith(libDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(file).pipe(res);
}

export default defineConfig({
  plugins: [
    {
      name: "local-lib",
      configureServer(server) {
        server.middlewares.use(serveLib);
      },
      configurePreviewServer(server) {
        server.middlewares.use(serveLib);
      },
      closeBundle() {
        fs.cpSync(libDir, path.join(root, "dist", "lib"), { recursive: true });
      },
    },
  ],
});
