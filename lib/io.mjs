/** Tiny filesystem and argv helpers shared by every script. */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = process.env.SEO_KIT_DATA ?? join(ROOT, 'data');

export const dataPath = (...parts) => join(DATA, ...parts);

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
  return path;
}

/** `--flag value` and bare `--flag` (true). Positionals come back separately. */
export function argv(list = process.argv.slice(2)) {
  const flags = {}, positional = [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i].startsWith('--')) { positional.push(list[i]); continue; }
    const name = list[i].slice(2);
    const next = list[i + 1];
    if (next === undefined || next.startsWith('--')) flags[name] = true;
    else { flags[name] = next; i++; }
  }
  return { flags, positional };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function die(message) {
  console.error(`x ${message}`);
  process.exit(1);
}
