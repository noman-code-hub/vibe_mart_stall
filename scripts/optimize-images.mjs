/**
 * Converts referenced raster artwork to WebP and rewrites every reference to it.
 *
 * The pop-art panels shipped as multi-megabyte PNGs, so first load pulled tens
 * of megabytes before anything was usable. WebP at quality 90 keeps the bold
 * lettering and halftone dots crisp while cutting each file by roughly 6-20x.
 * Transparency is preserved. Nothing is resized, so nothing gets softer.
 *
 * Originals are deleted after conversion; they remain in git history.
 *
 * Usage:
 *   node scripts/optimize-images.mjs           convert
 *   node scripts/optimize-images.mjs --dry     report only, change nothing
 */
import sharp from 'sharp';
import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcAssetsDir = path.join(root, 'frontend', 'src', 'assets');
const publicDir = path.join(root, 'frontend', 'public');
const dryRun = process.argv.includes('--dry');

const QUALITY = 90;
const RASTER = /\.(png|jpe?g)$/i;

/** Files that may reference artwork, relative to the repo root. */
const SOURCE_GLOB_DIRS = [path.join(root, 'frontend', 'src')];
const SOURCE_EXTRA_FILES = [
  path.join(root, 'frontend', 'index.html'),
  path.join(root, 'wordpress-theme', 'vibe-mart', 'index.php'),
];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.css', '.html', '.php']);

/** Public files are referenced by absolute URL, not by an assets/ path. */
const PUBLIC_ASSETS = ['loading-logo.jpeg'];

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function collectSourceFiles() {
  const files = [];
  for (const dir of SOURCE_GLOB_DIRS) {
    for (const file of await walk(dir)) {
      if (SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase())) files.push(file);
    }
  }
  for (const file of SOURCE_EXTRA_FILES) {
    try {
      await stat(file);
      files.push(file);
    } catch {
      // Optional file, skip.
    }
  }
  return files;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const toWebp = (relPath) => relPath.replace(RASTER, '.webp');

/**
 * Convert one file and return the size delta.
 */
async function convert(absPath) {
  const before = (await stat(absPath)).size;
  const target = absPath.replace(RASTER, '.webp');

  if (dryRun) return { before, after: before, target };

  const buffer = await sharp(absPath)
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toBuffer();

  await writeFile(target, buffer);
  await unlink(absPath);
  return { before, after: buffer.length, target };
}

async function main() {
  const sourceFiles = await collectSourceFiles();
  const sourceText = new Map();
  for (const file of sourceFiles) sourceText.set(file, await readFile(file, 'utf8'));

  /** @type {Array<{ token: string, replacement: string, abs: string }>} */
  const jobs = [];

  // Bundled assets: matched by their literal "assets/<path>" reference so that
  // filenames containing spaces are handled without regex escaping.
  for (const abs of await walk(srcAssetsDir)) {
    if (!RASTER.test(abs)) continue;
    const rel = path.relative(srcAssetsDir, abs).split(path.sep).join('/');
    const token = `assets/${rel}`;
    const referenced = [...sourceText.values()].some((text) => text.includes(token));
    if (referenced) jobs.push({ token, replacement: `assets/${toWebp(rel)}`, abs });
  }

  // Public assets referenced by absolute URL, plus the theme's build-output copy.
  for (const name of PUBLIC_ASSETS) {
    const abs = path.join(publicDir, name);
    try {
      await stat(abs);
    } catch {
      continue;
    }
    jobs.push({ token: name, replacement: toWebp(name), abs });
  }

  if (!jobs.length) {
    console.log('[images] Nothing to convert — no referenced raster artwork found.');
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;

  for (const job of jobs) {
    const { before, after } = await convert(job.abs);
    totalBefore += before;
    totalAfter += after;
    const ratio = after > 0 ? (before / after).toFixed(1) : '—';
    console.log(
      `  ${path.basename(job.abs).padEnd(40)} ${kb(before).padStart(9)} -> ${kb(after).padStart(8)}  (${ratio}x)`
    );
  }

  if (!dryRun) {
    let rewritten = 0;
    for (const [file, original] of sourceText) {
      let text = original;
      for (const job of jobs) text = text.split(job.token).join(job.replacement);
      if (text !== original) {
        await writeFile(file, text);
        rewritten += 1;
      }
    }
    console.log(`\n[images] Rewrote references in ${rewritten} source file(s).`);
  }

  const saved = totalBefore - totalAfter;
  console.log(
    `[images] ${jobs.length} files: ${kb(totalBefore)} -> ${kb(totalAfter)} ` +
      `(saved ${kb(saved)}, ${(totalBefore / Math.max(totalAfter, 1)).toFixed(1)}x smaller)` +
      `${dryRun ? '  [DRY RUN — nothing written]' : ''}`
  );
}

main().catch((error) => {
  console.error(`[images] ${error?.message || error}`);
  process.exit(1);
});
