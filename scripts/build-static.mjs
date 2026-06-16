// Produces the static, server-free build the GitHub Pages deploy ships: a bundled
// app.js (the domain core + the in-browser VM_API adapter from src/web-app.ts) plus
// a verbatim copy of index.html. The bundle overwrites the dev HTTP adapter of the
// same name, so the page runs with no /api server behind it.
//
// This is the project's only build step; `npm start` still runs the TypeScript
// directly with no build.
import * as esbuild from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

await mkdir(dist, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src/web-app.ts")],
  bundle: true,
  format: "iife", // a classic script: runs synchronously, sets window.VM_API before index.html's inline script
  target: ["es2020"],
  outfile: join(dist, "app.js"),
  logLevel: "info",
});

await copyFile(join(root, "public/index.html"), join(dist, "index.html"));

console.log("static build -> dist/ (index.html + app.js)");
