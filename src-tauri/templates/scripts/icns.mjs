// Generates macOS icns from src-tauri/icons/icon.png using ImageMagick if available,
// otherwise copies icon.png as a placeholder so builds still proceed.
import { execSync, execFileSync } from "node:child_process";
import { copyFile, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const iconsDir = resolve(process.cwd(), "src-tauri", "icons");
const src = join(iconsDir, "icon.png");
const out = join(iconsDir, "icon.icns");

if (!existsSync(src)) {
  throw new Error(`Missing icon source: ${src}`);
}

if (existsSync(out)) {
  console.log(`Existing icns found, skipping: ${out}`);
  process.exit(0);
}

try {
  const cmd = [
    "magick",
    src,
    "-define",
    "icon:auto-resize=512,256,128,32,16",
    out,
  ].join(" ");
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`Generated icns: ${out}`);
  } catch {
    console.warn("ImageMagick not available; skipping icns generation");
  }
} catch {
  console.warn("Icon generation failed; skipping icns");
}

if (!existsSync(out)) {
  copyFile(src, out);
  console.log(`Fallback copied icon.png -> icon.icns`);
}
