/**
 * PHP syntax gate for marketplace plugin + theme.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

function checkPhp(source, file) {
  const errors = [];
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  const bump = (ch) => {
    if (ch === '{') braces += 1;
    if (ch === '}') braces -= 1;
    if (ch === '(') parens += 1;
    if (ch === ')') parens -= 1;
    if (ch === '[') brackets += 1;
    if (ch === ']') brackets -= 1;
    if (braces < 0 || parens < 0 || brackets < 0) errors.push(`${file}: unmatched closer`);
  };

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (ch === '#') {
        inLineComment = true;
        i += 1;
        continue;
      }
    }
    if (!inDouble && ch === "'" && source[i - 1] !== '\\') {
      inSingle = !inSingle;
      i += 1;
      continue;
    }
    if (!inSingle && ch === '"' && source[i - 1] !== '\\') {
      inDouble = !inDouble;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble) bump(ch);
    i += 1;
  }

  if (inSingle || inDouble) errors.push(`${file}: unclosed string`);
  if (inBlockComment) errors.push(`${file}: unclosed comment`);
  if (braces !== 0) errors.push(`${file}: unbalanced braces (${braces})`);
  if (parens !== 0) errors.push(`${file}: unbalanced parens (${parens})`);
  if (brackets !== 0) errors.push(`${file}: unbalanced brackets (${brackets})`);
  if (!source.includes('<?php') && !source.includes('<?=')) errors.push(`${file}: missing php open tag`);
  return errors;
}

const files = targets.flatMap((dir) => (statSync(dir).isDirectory() ? walk(dir) : []));
const allErrors = files.flatMap((file) => checkPhp(readFileSync(file, 'utf8'), path.relative(root, file)));
if (allErrors.length) {
  console.error(allErrors.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`PHP syntax gate passed (${files.length} files).`);
