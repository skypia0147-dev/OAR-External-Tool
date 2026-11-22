// Checks the editor model against real OAR configs on this PC (read-only).
//  1. parse → stringify reproduces each file byte for byte (when it was written by OAR's own writer)
//  2. every condition/function name is known to the generated definitions
//  3. every stored key is a known component (unknown keys are preserved, but should be rare)
// Usage: node tests/roundtrip.mjs [modsDir ...]
import fs from 'node:fs';
import path from 'node:path';
import { parse, stringifyLike } from '../web/js/model/json.js';
import { Schema, COMMON_KEYS, nameOf, kindOf } from '../web/js/model/schema.js';

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push('H:\\Game\\Fablerim\\mods', 'H:\\Game\\Lorerim\\mods');
const schema = new Schema(JSON.parse(fs.readFileSync(new URL('../web/data/conditions.json', import.meta.url), 'utf8')));

const files = [];
function walk(dir, depth, inOar) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const oar = inOar || e.name.toLowerCase() === 'openanimationreplacer';
      // only descend along meshes\actors\*\animations\OpenAnimationReplacer
      if (oar || depth < 5) walk(p, depth + 1, oar);
    } else if (inOar && (e.name === 'config.json' || e.name === 'user.json')) files.push(p);
  }
}
for (const r of roots) if (fs.existsSync(r)) walk(r, 0, false);

let same = 0;
let differ = 0;
let broken = 0;
const diffSamples = [];
const diffKinds = new Map();
let dupFiles = 0;
let parseMismatch = 0;
const unknownNames = new Map();
const unknownKeys = new Map();
let entries = 0;

function visit(list, file) {
  if (!Array.isArray(list)) return;
  for (const obj of list) {
    if (!obj || typeof obj !== 'object') continue;
    entries++;
    const kind = kindOf(obj);
    const name = nameOf(obj);
    const def = schema.def(name, kind);
    if (!def) {
      const k = `${kind}:${name} (${obj.requiredPlugin ?? 'OAR'})`;
      unknownNames.set(k, (unknownNames.get(k) ?? 0) + 1);
    } else {
      const known = new Set([...COMMON_KEYS, ...def.components.map((c) => c.key)]);
      for (const key of Object.keys(obj)) {
        if (!known.has(key)) {
          const k = `${name}.${key}`;
          if (!unknownKeys.has(k)) unknownKeys.set(k, { n: 0, file });
          unknownKeys.get(k).n++;
        }
      }
      for (const c of def.components) {
        const v = obj[c.key];
        if (c.type === 'conditions' || c.type === 'functions') visit(v, file);
        if (c.type === 'conditionFunctions' && v) { visit(v.conditions, file); visit(v.functions, file); }
      }
    }
  }
}

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  let doc;
  const info = { duplicates: [] };
  try { doc = parse(text, info); } catch (e) { broken++; console.log(` unreadable ${f}: ${e.message}`); continue; }
  if (info.duplicates.length) { dupFiles++; if (dupFiles <= 3) console.log(` duplicate keys ${info.duplicates.join(', ')} in ${f}`); continue; }
  const std = JSON.parse(text);
  if (JSON.stringify(std) !== JSON.stringify(doc)) { parseMismatch++; console.log(` parser differs from JSON.parse: ${f}`); }
  const out = stringifyLike(doc, text);
  if (out === text) same++;
  else {
    differ++;
    const kind = /^\{\r?\n {2}"/.test(text) ? '2-space' : text.includes('\t') ? 'tabs' : !text.includes('\r\n') ? 'LF' : 'other';
    diffKinds.set(kind, (diffKinds.get(kind) ?? 0) + 1);
    if (kind === 'other' && diffSamples.length < 8) {
      let i = 0;
      while (i < out.length && out[i] === text[i]) i++;
      diffSamples.push(`${f}\n   at ${i}: file ${JSON.stringify(text.slice(Math.max(0, i - 30), i + 40))}\n         out  ${JSON.stringify(out.slice(Math.max(0, i - 30), i + 40))}`);
    }
  }
  visit(doc.conditions, f);
  visit(doc.pairedConditions, f);
  for (const k of ['functionsOnActivate', 'functionsOnDeactivate', 'functionsOnTrigger']) visit(doc[k], f);
  for (const p of doc.conditionPresets ?? []) visit(p.conditions, f);
}

console.log(`files ${files.length}: identical ${same}, different ${differ}, unreadable ${broken}, duplicate keys ${dupFiles}, parser mismatch ${parseMismatch}`);
console.log(' different by style:', Object.fromEntries(diffKinds));
for (const s of diffSamples) console.log(' diff', s);
console.log(`entries ${entries}; unknown names ${unknownNames.size}`);
for (const [k, n] of [...unknownNames].sort((a, b) => b[1] - a[1])) console.log(`  ${n}× ${k}`);
console.log(`unknown keys ${unknownKeys.size}`);
for (const [k, v] of [...unknownKeys].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) console.log(`  ${v.n}× ${k}   e.g. ${v.file}`);
// Broken files in someone's mod list are data, not a test failure; a parser disagreement is.
process.exitCode = parseMismatch ? 1 : 0;
