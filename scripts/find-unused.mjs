import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|mjs|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), spec);
  for (const ext of ['', '.js', '.jsx', '.css', '/index.js', '/index.jsx']) {
    const candidate = abs + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const files = walk('src');
const entry = path.resolve('src/main.jsx');
const reachable = new Set([entry]);
const queue = [entry];
const importRe = /from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

while (queue.length) {
  const current = queue.pop();
  const text = fs.readFileSync(current, 'utf8');
  importRe.lastIndex = 0;
  let match;
  while ((match = importRe.exec(text))) {
    const resolved = resolveImport(current, match[1] || match[2]);
    if (!resolved || reachable.has(resolved)) continue;
    reachable.add(resolved);
    if (/\.(jsx?)$/.test(resolved)) queue.push(resolved);
  }
}

const unused = files
  .filter((file) => /\.(jsx?)$/.test(file) && !reachable.has(path.resolve(file)))
  .map((file) => path.relative('.', file));

console.log('Reachable JS modules:', [...reachable].filter((f) => /\.(jsx?)$/.test(f)).length);
console.log('Unused JS files:');
unused.forEach((file) => console.log(' -', file));
