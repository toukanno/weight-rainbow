import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const webDir = resolve(root, "web");

async function main() {
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });

  // Bundle src/app.js with all bare imports resolved
  await build({
    entryPoints: [resolve(root, "src/app.js")],
    bundle: true,
    format: "esm",
    outfile: resolve(webDir, "app.bundle.js"),
    // Capacitor core is injected by the native bridge at runtime.
    // Mark it (and its plugins) as external so we provide a thin shim instead.
    external: [],
    target: ["safari16", "chrome110"],
    minify: false,
    sourcemap: false,
  });

  // Copy static assets
  const statics = ["manifest.webmanifest", "assets"];
  await Promise.all(
    statics.map((entry) =>
      cp(resolve(root, entry), resolve(webDir, entry), { recursive: true }),
    ),
  );

  // Read original index.html and rewrite the script tag to point at the bundle
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const patched = html.replace(
    '<script type="module" src="./src/app.js"></script>',
    '<script type="module" src="./app.bundle.js"></script>',
  );
  await writeFile(resolve(webDir, "index.html"), patched, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
