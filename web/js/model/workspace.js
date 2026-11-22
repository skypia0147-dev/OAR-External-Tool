// What the editor holds in memory: replacer mods and submods from one opened folder.
// Each config keeps its original text (to detect changes and keep the file's style) and a working copy
// that the UI edits in place. Keys the editor doesn't know are left untouched.
import { parse, stringify, stringifyLike, clone } from './json.js';
import { Schema, nameOf, kindOf } from './schema.js';

export const SUBMOD_SETTING_KEYS = [
  'name', 'description', 'priority', 'disabled', 'overrideAnimationsFolder', 'requiredBehaviorProjectName',
  'ignoreDontConvertAnnotationsToTriggersFlag', 'triggersFromAnnotationsOnly', 'interruptible', 'hasCustomBlendTimeOnInterrupt',
  'blendTimeOnInterrupt', 'replaceOnLoop', 'hasCustomBlendTimeOnLoop', 'blendTimeOnLoop', 'replaceOnEcho', 'hasCustomBlendTimeOnEcho',
  'blendTimeOnEcho', 'runFunctionsOnLoop', 'runFunctionsOnEcho',
];
export const FUNCTION_SETS = [
  ['functionsOnActivate', 'On Activate'],
  ['functionsOnDeactivate', 'On Deactivate'],
  ['functionsOnTrigger', 'On Trigger'],
];

function readDoc(text, where, problems) {
  if (text == null) return null;
  const info = { duplicates: [] };
  try {
    const doc = parse(text, info);
    if (info.duplicates.length)
      problems.push({ level: 'warn', kind: 'duplicate', where, text: `Repeated keys (OAR uses the first): ${info.duplicates.join(', ')}` });
    return doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : null;
  } catch (e) {
    problems.push({ level: 'error', kind: 'unreadable', where, text: `Not valid JSON — OAR can't read it either. ${e.message}` });
    return null;
  }
}

let nextId = 1;

export class Submod {
  constructor(mod, dto) {
    this.id = `s${nextId++}`;
    this.mod = mod;
    this.path = dto.path;
    this.folder = dto.folder;
    this.files = dto.files ?? [];
    this.problems = [];
    this.configText = dto.config ?? null;
    this.userText = dto.user ?? null;
    this.configDoc = readDoc(this.configText, `${this.path}\\config.json`, this.problems);
    this.userDoc = readDoc(this.userText, `${this.path}\\user.json`, this.problems);
    this.isNew = !!dto.isNew;
    this.pendingFiles = []; // [{ src, rel }] copied into the submod on save
    this.reset();
  }

  /** The config OAR would load: user.json replaces config.json, name/description always come from config.json. */
  effective() {
    const base = this.userDoc ?? this.configDoc ?? { name: this.folder, priority: 0, conditions: [] };
    const doc = clone(base);
    if (this.userDoc && this.configDoc) {
      const named = {};
      if (this.configDoc.name !== undefined) named.name = this.configDoc.name;
      if (this.configDoc.description !== undefined) named.description = this.configDoc.description;
      return { ...named, ...Object.fromEntries(Object.entries(doc).filter(([k]) => k !== 'name' && k !== 'description')) };
    }
    return doc;
  }

  reset() {
    this.doc = this.effective();
    if (!Array.isArray(this.doc.conditions)) this.doc.conditions = [];
    this.baseline = stringify(this.doc);
    this.pendingFiles = [];
  }

  get name() { return this.doc.name ?? this.configDoc?.name ?? this.folder; }
  get priority() { return typeof this.doc.priority === 'number' ? this.doc.priority : 0; }
  get disabled() { return !!this.doc.disabled; }
  get source() { return this.userDoc ? 'user' : 'config'; }
  get dirty() { return this.pendingFiles.length > 0 || stringify(this.doc) !== this.baseline; }
  get unreadable() { return this.problems.some((p) => p.kind === 'unreadable'); }

  /** Replacement paths as written inside this submod (variants folded), e.g. "male\mt_idle.hkx". */
  animationTargets() {
    const out = new Set();
    for (const f of [...this.files, ...this.pendingFiles.map((p) => p.rel)]) out.add(targetOf(f));
    return [...out];
  }

  /** The originals this submod replaces, as { project, anim } (anim relative to actors\{project}\animations\). */
  originals() {
    return this.animationTargets().map((t) => originalOf(this.mod, t)).filter(Boolean);
  }

  /** Text to write for a save in the given mode, and where. */
  saveTarget(mode) {
    if (mode === 'author') {
      return { file: `${this.path}\\config.json`, text: stringifyLike(this.doc, this.configText ?? this.userText) };
    }
    const doc = Object.fromEntries(Object.entries(this.doc).filter(([k]) => k !== 'name' && k !== 'description'));
    return { file: `${this.path}\\user.json`, text: stringifyLike(doc, this.userText ?? this.configText) };
  }

  markSaved(mode, text) {
    if (mode === 'author') {
      this.configText = text;
      this.configDoc = parse(text);
    } else {
      this.userText = text;
      this.userDoc = parse(text);
    }
    this.isNew = false;
    // Keep the same working objects (open/selected entries in the UI stay as they are).
    this.baseline = stringify(this.doc);
  }

  markUserDeleted() {
    this.userText = null;
    this.userDoc = null;
    this.reset();
  }
}

/** "_variants_mt_idle\a.hkx" → "mt_idle.hkx"; "male\_variants_x\y.hkx" → "male\x.hkx" (OAR ConvertVariantsPath). */
export function targetOf(rel) {
  const parts = rel.split('\\');
  const vi = parts.findIndex((p) => p.toLowerCase().startsWith('_variants_'));
  if (vi < 0) return rel;
  return [...parts.slice(0, vi), `${parts[vi].slice('_variants_'.length)}.hkx`].join('\\');
}

/**
 * Which original a submod file replaces. OAR strips "OpenAnimationReplacer\{mod}\{submod}\" from the path,
 * so the original is "{mod.prefix}\{file}" relative to meshes\ — e.g. prefix "actors\character\animations" +
 * "mt_idle.hkx", or prefix "" + "Actors\Character\animations\mt_idle.hkx" (both the same original).
 */
export function originalOf(mod, target) {
  const full = mod.prefix ? `${mod.prefix}\\${target}` : target;
  // project may be nested: actors\character\_1stperson\animations\…
  const m = /^actors\\(.+?)\\animations\\(.+)$/i.exec(full);
  return m ? { project: m[1].toLowerCase(), anim: m[2] } : null;
}

/** Path to write inside a submod so it replaces actors\{project}\animations\{anim} (inverse of originalOf). */
export function targetFor(mod, project, anim) {
  const std = `actors\\${project}\\animations`;
  if (mod.prefix.toLowerCase() === std.toLowerCase()) return anim;
  if (!mod.prefix) return `${std}\\${anim}`;
  return anim; // unusual layout: keep the name, OAR resolves it relative to the mod's folder
}

/** Behavior project used to list originals for a mod (its own, or character for meshes\OpenAnimationReplacer). */
export function projectFor(mod) {
  return mod.project || 'character';
}

export function isVariant(rel) {
  return rel.split('\\').some((p) => p.toLowerCase().startsWith('_variants_'));
}

export class ReplacerMod {
  constructor(ws, dto) {
    this.id = `m${nextId++}`;
    this.ws = ws;
    this.path = dto.path;
    this.folder = dto.folder;
    this.managerMod = dto.managerMod ?? null;
    // folder names are case-insensitive on Windows ("Character" and "character" are the same project)
    this.project = (dto.project ?? 'character').toLowerCase();
    // folder between meshes\ and OpenAnimationReplacer\ ("" when the OAR folder sits right under meshes)
    this.prefix = dto.prefix ?? `actors\\${this.project}\\animations`;
    this.problems = [];
    this.configText = dto.config ?? null;
    this.userText = dto.user ?? null;
    this.configDoc = readDoc(this.configText, `${this.path}\\config.json`, this.problems);
    this.userDoc = readDoc(this.userText, `${this.path}\\user.json`, this.problems);
    this.isNew = !!dto.isNew;
    this.submods = (dto.submods ?? []).map((s) => new Submod(this, s));
    this.reset();
  }

  reset() {
    this.doc = clone(this.userDoc ?? this.configDoc ?? { name: this.folder, author: '', description: '' });
    this.baseline = stringify(this.doc);
  }

  get name() { return this.doc.name || this.folder; }
  get author() { return this.doc.author ?? ''; }
  get ownDirty() { return stringify(this.doc) !== this.baseline; }
  get dirty() { return this.ownDirty || this.submods.some((s) => s.dirty); }
  get legacy() { return false; }

  saveTarget(mode) {
    const file = `${this.path}\\${mode === 'author' ? 'config' : 'user'}.json`;
    const like = mode === 'author' ? this.configText ?? this.userText : this.userText ?? this.configText;
    return { file, text: stringifyLike(this.doc, like) };
  }

  markSaved(mode, text) {
    if (mode === 'author') { this.configText = text; this.configDoc = parse(text); } else { this.userText = text; this.userDoc = parse(text); }
    this.isNew = false;
    this.baseline = stringify(this.doc);
  }

  sortedSubmods() {
    return [...this.submods].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  }
}

export class Workspace {
  /** @param {any} scan host scan result  @param {Schema} schema */
  constructor(scan, mo2, schema) {
    this.root = scan.root;
    this.mo2 = mo2 ?? null;
    this.schema = schema;
    this.errors = scan.errors ?? [];
    this.legacy = scan.legacy ?? [];
    this.mods = scan.mods.map((m) => new ReplacerMod(this, m));
  }

  get dirty() { return this.mods.some((m) => m.dirty); }

  allSubmods() { return this.mods.flatMap((m) => m.submods); }

  findSubmod(id) { return this.allSubmods().find((s) => s.id === id) ?? null; }

  findMod(id) { return this.mods.find((m) => m.id === id) ?? null; }

  /** Submods (any mod, any folder layout) that replace this original, highest priority first. */
  replacersOf(anim, project = 'character') {
    const t = anim.toLowerCase();
    const p = project.toLowerCase();
    return this.allSubmods()
      .filter((s) => s.originals().some((o) => o.project === p && o.anim.toLowerCase() === t))
      .sort((a, b) => b.priority - a.priority);
  }

  /** How many loaded submods replace each original (for the "pick original" list). */
  replacementCounts(project = 'character') {
    const counts = new Map();
    const p = project.toLowerCase();
    for (const s of this.allSubmods()) {
      for (const o of new Set(s.originals().filter((x) => x.project === p).map((x) => x.anim.toLowerCase()))) counts.set(o, (counts.get(o) ?? 0) + 1);
    }
    return counts;
  }

  problems() {
    const list = [];
    for (const m of this.mods) {
      for (const p of m.problems) list.push({ ...p, mod: m });
      for (const s of m.submods) {
        for (const p of s.problems) list.push({ ...p, mod: m, submod: s });
        const unknown = new Set();
        walkEntries(s.doc, (obj) => {
          if (!this.schema.def(nameOf(obj), kindOf(obj))) unknown.add(`${nameOf(obj)}${obj.requiredPlugin ? ` (${obj.requiredPlugin})` : ''}`);
        });
        if (unknown.size)
          list.push({ level: 'info', kind: 'unknown', mod: m, submod: s, text: `Conditions this tool has no editor for (kept as-is, editable as JSON): ${[...unknown].join(', ')}` });
      }
    }
    // Same priority within one replacer mod: OAR's "conflicting submods".
    for (const m of this.mods) {
      const byPriority = new Map();
      for (const s of m.submods) {
        if (!byPriority.has(s.priority)) byPriority.set(s.priority, []);
        byPriority.get(s.priority).push(s);
      }
      for (const [pri, subs] of byPriority) {
        if (subs.length < 2) continue;
        const shared = subs[0].animationTargets().filter((t) => subs.slice(1).some((o) => o.animationTargets().includes(t)));
        if (shared.length)
          list.push({ level: 'warn', kind: 'conflict', mod: m, submod: subs[0], text: `${subs.length} submods share priority ${pri} and replace the same animations: ${subs.map((x) => x.name).join(', ')}` });
      }
    }
    for (const e of this.errors) list.push({ level: 'error', kind: 'io', text: e });
    return list;
  }
}

/** Visit every condition/function object in a submod or preset document. */
export function walkEntries(doc, fn) {
  const visit = (list) => {
    if (!Array.isArray(list)) return;
    for (const obj of list) {
      if (!obj || typeof obj !== 'object') continue;
      fn(obj);
      for (const v of Object.values(obj)) {
        if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] && ('condition' in v[0] || 'function' in v[0])) visit(v);
        else if (v && typeof v === 'object' && !Array.isArray(v) && (Array.isArray(v.conditions) || Array.isArray(v.functions))) { visit(v.conditions); visit(v.functions); }
      }
    }
  };
  visit(doc?.conditions);
  visit(doc?.pairedConditions);
  for (const [k] of FUNCTION_SETS) visit(doc?.[k]);
}
