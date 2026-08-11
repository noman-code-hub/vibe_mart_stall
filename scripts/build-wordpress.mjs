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

function zipFolder(sourceDir, zipPath) {
  // Prefer PowerShell Compress-Archive on Windows; fall back to tar.
  if (process.platform === 'win32') {
    const ps = `Compress-Archive -Path '${sourceDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
    if (result.status !== 0) fail(`Failed to zip ${path.basename(sourceDir)}`);
    return;
  }

  const result = spawnSync('tar', ['-a', '-cf', zipPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) fail(`Failed to zip ${path.basename(sourceDir)}`);
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
