/**
 * PHP syntax gate for marketplace plugin + theme.
 *
 * Uses the real PHP parser (`php -l`). Brace counting cannot be trusted here
 * because theme templates mix PHP with HTML, inline CSS and apostrophes.
 * When no PHP binary is installed the gate warns instead of failing, so the
 * asset build still works on machines without PHP.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'wordpress-plugin', 'vibe-mart'),
  path.join(root, 'wordpress-theme', 'vibe-mart'),
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.php')) out.push(full);
  }
  return out;
}

function resolvePhpBinary() {
  for (const candidate of [process.env.PHP_BINARY, 'php'].filter(Boolean)) {
    const probe = spawnSync(candidate, ['-v'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

const php = resolvePhpBinary();
const files = targets.flatMap((dir) => (statSync(dir).isDirectory() ? walk(dir) : []));

if (!php) {
  console.warn(
    `PHP syntax gate skipped (${files.length} files): no PHP binary found. Set PHP_BINARY to enable it.`
  );
  process.exit(0);
}

const failures = [];
for (const file of files) {
  const result = spawnSync(php, ['-l', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = `${result.stdout || ''}${result.stderr || ''}`.trim();
    failures.push(` - ${path.relative(root, file)}: ${detail}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`PHP syntax gate passed (${files.length} files).`);
