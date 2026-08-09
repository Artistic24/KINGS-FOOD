// Builds a complete, deployable snapshot of the KINGS FOOD codebase into
// public/kingsfood-source.zip so admins can download the full project at any time.
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "kingsfood-source.zip");
const MANIFEST = path.join(OUT_DIR, "source-manifest.json");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "dist-ssr",
  ".output",
  ".nitro",
  ".vinxi",
  ".tanstack",
  ".wrangler",
  ".cache",
  ".turbo",
  "logs",
]);
const SKIP_FILES = new Set(["kingsfood-source.zip", "source-manifest.json", ".DS_Store"]);

function walk(dir, zip, rel = "") {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      count += walk(path.join(dir, entry.name), zip, path.join(rel, entry.name));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      zip.file(path.join(rel, entry.name).split(path.sep).join("/"), fs.readFileSync(abs));
      count++;
    }
  }
  return count;
}

export async function buildSourceZip() {
  const zip = new JSZip();
  const files = walk(ROOT, zip);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify({ generatedAt: new Date().toISOString(), files, bytes: buf.length }, null, 2),
  );
  return { files, bytes: buf.length };
}

/** Vite plugin: regenerate the snapshot on every build and on dev-server start. */
export function sourceZipPlugin() {
  let done = false;
  const run = async () => {
    if (done) return;
    done = true;
    try {
      const r = await buildSourceZip();
      console.log(`[source-zip] ${r.files} files, ${(r.bytes / 1024 / 1024).toFixed(2)} MB`);
    } catch (e) {
      console.warn("[source-zip] failed:", e?.message ?? e);
    }
  };
  return {
    name: "kingsfood-source-zip",
    apply: () => true,
    buildStart: run,
    configureServer: run,
  };
}

if (process.argv[1] && process.argv[1].endsWith("make-source-zip.mjs")) {
  buildSourceZip().then((r) => console.log(`source zip: ${r.files} files, ${r.bytes} bytes`));
}
