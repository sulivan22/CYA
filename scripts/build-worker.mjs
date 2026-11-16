import { readdir, readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const templatePath = path.join(root, "worker/index.js");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function collect(directory, prefix = "") {
  const assets = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".openai" || entry.name === "server" || entry.name === ".DS_Store") continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      Object.assign(assets, await collect(absolute, relative));
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      const body = await readFile(absolute);
      assets[`/${relative}`] = {
        type: mimeTypes[extension] || "application/octet-stream",
        body: body.toString("base64"),
      };
    }
  }
  return assets;
}

const assets = await collect(dist);
if (!assets["/index.html"] || !assets["/confirmacion.html"]) {
  throw new Error("No se encontraron las páginas requeridas dentro de dist/.");
}
const template = await readFile(templatePath, "utf8");
if (!template.includes("__ASSET_MAP__")) throw new Error("No se encontró el marcador de recursos del Worker.");

const serverDir = path.join(dist, "server");
const openaiDir = path.join(dist, ".openai");
await mkdir(serverDir, { recursive: true });
await mkdir(openaiDir, { recursive: true });
await writeFile(path.join(serverDir, "index.js"), template.replace("__ASSET_MAP__", JSON.stringify(assets)));
await copyFile(path.join(root, ".openai/hosting.json"), path.join(openaiDir, "hosting.json"));
console.log("Prepared the wedding site Worker and bundled static pages.");
