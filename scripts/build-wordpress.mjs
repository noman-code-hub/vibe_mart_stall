/**
 * Builds the React SPA and copies production assets into the WordPress theme.
 * Then packages vibe-mart-theme.zip and vibe-mart-plugin.zip.
 *
 * Usage: npm run build:wp
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const themeAssetsDir = path.join(projectRoot, 'wordpress-theme', 'vibe-mart', 'assets', 'app');
const themeDir = path.join(projectRoot, 'wordpress-theme', 'vibe-mart');
const pluginDir = path.join(projectRoot, 'wordpress-plugin', 'vibe-mart');
const outDir = path.join(projectRoot, 'dist-packages');

function fail(message) {
  console.error(`\n[build:wp] ${message}\n`);
  process.exit(1);
}

function readEntry(manifest) {
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry?.file) fail('Could not find an entry chunk in dist/manifest.json.');
  return {
    js: entry.file,
    css: Array.isArray(entry.css) ? entry.css : [],
  };
}

async function copyThemeAssets() {
  if (!existsSync(distDir)) fail('dist/ not found. Run vite build first.');
  const manifestPath = path.join(distDir, 'manifest.json');
  if (!existsSync(manifestPath)) fail('dist/manifest.json missing.');

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = readEntry(manifest);

  await rm(themeAssetsDir, { recursive: true, force: true });
  await mkdir(themeAssetsDir, { recursive: true });
  await cp(distDir, themeAssetsDir, {
    recursive: true,
    filter: (source) => path.basename(source) !== 'index.html',
  });

  await writeFile(
    path.join(themeAssetsDir, 'asset-manifest.json'),
    `${JSON.stringify({ generated: new Date().toISOString(), js: entry.js, css: entry.css }, null, 2)}\n`
  );

  console.log('[build:wp] Theme assets → wordpress-theme/vibe-mart/assets/app');
  console.log(`[build:wp] entry JS : ${entry.js}`);
  console.log(`[build:wp] entry CSS: ${entry.css.join(', ') || '(none)'}`);
}

/**
 * Zip a folder so WordPress can install it.
 *
 * Always uses bsdtar, never PowerShell Compress-Archive: on Windows PowerShell
 * that writes entry names with backslashes, which the ZIP format does not allow.
 * PHP then sees one long filename instead of a folder tree, installs the plugin
 * to the wrong path, and activation fails with "Plugin file does not exist."
 */
function zipFolder(sourceDir, zipPath) {
  const folder = path.basename(sourceDir);
  const parent = path.dirname(sourceDir);

  const zipped = spawnSync('tar', ['-a', '-cf', zipPath, '-C', parent, folder], { stdio: 'inherit' });
  if (zipped.error) {
    fail(
      `Could not run "tar", which is needed to build ${folder}.zip. ` +
        'It ships with Windows 10 and later, macOS and Linux.'
    );
  }
  if (zipped.status !== 0) fail(`Failed to zip ${folder}`);

  verifyZipPaths(zipPath, folder);
}

/**
 * Guard against a zip whose entries are not laid out as WordPress expects:
 * a single top-level folder, using forward slashes.
 */
function verifyZipPaths(zipPath, folder) {
  const listed = spawnSync('tar', ['-tf', zipPath], { encoding: 'utf8' });
  if (listed.status !== 0) return;

  const entries = String(listed.stdout || '')
    .split(/\r?\n/)
    .filter(Boolean);

  const backslashed = entries.find((entry) => entry.includes('\\'));
  if (backslashed) {
    fail(`${path.basename(zipPath)} contains a backslash path (${backslashed}). WordPress cannot install it.`);
  }

  const stray = entries.find((entry) => !entry.startsWith(`${folder}/`) && entry !== `${folder}/`);
  if (stray) {
    fail(`${path.basename(zipPath)} should contain only ${folder}/ at the top level, found "${stray}".`);
  }
}

async function packageZips() {
  await mkdir(outDir, { recursive: true });
  const themeZip = path.join(outDir, 'vibe-mart-theme.zip');
  const pluginZip = path.join(outDir, 'vibe-mart-plugin.zip');
  await rm(themeZip, { force: true });
  await rm(pluginZip, { force: true });
  zipFolder(themeDir, themeZip);
  zipFolder(pluginDir, pluginZip);
  console.log(`[build:wp] Created ${themeZip}`);
  console.log(`[build:wp] Created ${pluginZip}`);
}

async function main() {
  await copyThemeAssets();
  await packageZips();
}

main().catch((error) => fail(error?.message || String(error)));
