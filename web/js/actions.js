// Everything the UI can do. Each action takes the clicked element (with data-* attributes).
import { call } from './bridge.js';
import { state, registry, schedule, toast, currentMod, currentSubmod, canEdit } from './state.js';
import { idOf, basename, dirname, safeName, plural } from './core.js';
import { Workspace, ReplacerMod, Submod, targetOf, FUNCTION_SETS } from './model/workspace.js';
import { parse, stringify, clone } from './model/json.js';
import { nameOf, migrateLegacy } from './model/schema.js';

// ───────── folders ─────────

export async function openPath(path) {
  state.busy = true;
  schedule();
  try {
    const { scan, mo2 } = await call('oar.scan', { root: path });
    state.ws = new Workspace(scan, mo2, state.schema);
    state.view = 'start';
    state.modId = null;
    state.submodId = null;
    state.selId = null;
    state.open.clear();
    state.setupModId = null;
    const first = state.ws.mods[0];
    if (first) { state.modId = first.id; state.view = 'mod'; }
    refreshRecent();
    loadVanilla('character');
    const bad = state.ws.problems().filter((p) => p.level === 'error').length;
    toast(`Opened ${plural(state.ws.mods.length, 'OAR mod')}`, bad ? `${plural(bad, 'problem')} — see Problems` : scan.root, bad ? 'warn' : 'ok');
  } catch (e) {
    toast('Could not open the folder', e.message, 'error');
  } finally {
    state.busy = false;
    schedule();
  }
}

export async function refreshRecent() {
  try { state.recent = await call('settings.recent'); } catch { state.recent = []; }
  schedule();
}

export async function loadVanilla(project) {
  const data = state.ws?.mo2?.dataDir;
  if (!data || state.vanilla.has(project)) return;
  try {
    const { files } = await call('game.animations', { dataDir: data, project });
    state.vanilla.set(project, files);
    schedule();
  } catch (e) {
    state.vanilla.set(project, []);
    console.warn('BSA list failed', e);
  }
}

async function confirmDiscardIfDirty(text) {
  if (!state.ws?.dirty) return true;
  return new Promise((resolve) => {
    state.dialog = { type: 'confirm', title: 'Discard unsaved changes?', desc: text, ok: 'Discard', danger: true, onOk: () => resolve(true), onCancel: () => resolve(false) };
    schedule();
  });
}

export const actions = {
  noop() {},
  window: (el) => call('window', { action: el.dataset.action }),
  toggleSidebar() { document.querySelector('.app')?.classList.toggle('sidebar-hidden'); },

  async openFolder() {
    if (!(await confirmDiscardIfDirty('Opening another folder closes the current one.'))) return;
    const r = await call('dialog.pickFolder', { title: 'Open a mods folder', initial: state.ws?.root ?? state.recent[0]?.path });
    if (r?.path) await openPath(r.path);
  },
  async openRecent(el) {
    if (!(await confirmDiscardIfDirty('Opening another folder closes the current one.'))) return;
    await openPath(el.dataset.path);
  },
  async removeRecent(el, ev) {
    ev.stopPropagation();
    await call('settings.removeRecent', { path: el.dataset.path });
    refreshRecent();
  },
  async clearRecent() {
    for (const r of state.recent) await call('settings.removeRecent', { path: r.path });
    refreshRecent();
  },
  reveal: (el, ev) => { ev?.stopPropagation(); if (el.dataset.path) call('shell.reveal', { path: el.dataset.path }); },

  nav(el) {
    const v = el.dataset.view;
    if (v === 'mods') state.view = state.ws ? (state.modId ? 'mod' : 'start') : 'start';
    else state.view = v;
    state.palette = null;
  },
  newMenu(el) {
    const rect = el.getBoundingClientRect();
    state.popover = {
      type: 'menu', rect, width: 240, items: [
        { act: 'newMod', label: 'Create new mod', icon: 'plus' },
        { act: 'newSubmod', label: 'New submod', icon: 'plus', disabled: !currentMod() || !canEdit('settings') },
        '-',
        { act: 'openFolder', label: 'Open folder…', icon: 'folder' },
      ],
    };
  },
  closePopover() { state.popover = null; },

  openMod(el) {
    state.modId = el.dataset.id;
    state.submodId = null;
    state.view = 'mod';
    state.selId = null;
    state.palette = null;
    state.popover = null;
  },
  openSubmod(el, ev) {
    if (ev?.target.closest('[data-act="toggleSubmodDisabled"]')) return;
    const sub = state.ws.findSubmod(el.dataset.id);
    if (!sub) return;
    if (state.submodId !== sub.id) { state.selId = null; state.jsonDraft = null; }
    const changed = state.submodId !== sub.id;
    state.modId = sub.mod.id;
    state.submodId = sub.id;
    state.view = 'submod';
    state.palette = null;
    loadVanilla(sub.mod.project);
    // opened from elsewhere (mod page, search, problems): bring its row into view in the list
    if (changed && !el.closest('.sm-rows')) {
      setTimeout(() => document.querySelector('.sm-row[aria-selected="true"]')?.scrollIntoView({ block: 'center' }), 50);
    }
  },

  setEditMode(el) {
    const mode = el.dataset.mode;
    if (mode === state.editMode) return;
    state.editMode = mode;
    call('app.setEditMode', { mode });
    toast(`${mode[0].toUpperCase() + mode.slice(1)} mode`, { inspect: 'Read only.', user: 'Saves to user.json — the original config.json stays as it is.', author: 'Saves to config.json — for your own mods.' }[mode]);
  },
  togglePanel() { state.panel = !state.panel; },
  clearSelection() { state.selId = null; },
  toggleSec(el) { const k = el.dataset.sec; state.sec[k] = !state.sec[k]; },
  hideSetup() { state.setupModId = null; },
  setEdView(el) { state.edView = el.dataset.v; state.jsonDraft = null; },

  // ───────── tree ─────────
  selectEntry(el, ev) {
    if (ev.target.closest('[data-act="toggleDisabled"]')) return;
    const id = el.dataset.id;
    if (ev.target.closest('.chev')) return;
    if (state.selId === id) toggleOpen(id);
    else { state.selId = id; if (!state.open.has(id)) state.open.add(id); }
  },
  toggleEntry(el, ev) { ev.stopPropagation(); toggleOpen(el.dataset.id); },
  toggleDisabled(el, ev) {
    ev.stopPropagation();
    const e = registry.get(el.dataset.id);
    if (!e) return;
    setFlag(e.obj, 'disabled', !e.obj.disabled);
  },
  toggleNegate(el) {
    const e = registry.get(el.dataset.id);
    if (e) setFlag(e.obj, 'negated', !e.obj.negated);
  },
  deleteEntry(el) {
    const e = registry.get(el.dataset.id);
    if (!e || !canEdit('conditions')) return;
    const i = e.list.indexOf(e.obj);
    if (i >= 0) e.list.splice(i, 1);
    if (state.selId === el.dataset.id) state.selId = null;
    toast(`Deleted ${nameOf(e.obj)}`, 'Discard reverts it until you save.');
  },
  copyEntry(el) {
    const e = registry.get(el.dataset.id);
    if (!e) return;
    state.clipboard = clone(e.obj);
    navigator.clipboard?.writeText(JSON.stringify(e.obj, null, 4)).catch(() => {});
    toast(`Copied ${nameOf(e.obj)}`);
  },
  pasteEntry(el) {
    const e = registry.get(el.dataset.id);
    if (!e || !state.clipboard || !canEdit('conditions')) return;
    const copy = clone(state.clipboard);
    e.list.splice(e.list.indexOf(e.obj) + 1, 0, copy);
    state.selId = idOf(copy);
  },
  editComment(el) {
    const e = registry.get(el.dataset.id);
    if (!e) return;
    state.dialog = {
      type: 'prompt', title: 'Comment', desc: 'Shown next to the name (OAR 2.3+). Leave empty to remove it.', label: 'Comment', value: e.obj.comment ?? '', ok: 'Save comment',
      onOk: (v) => { if (v.trim()) e.obj.comment = v.trim(); else delete e.obj.comment; },
    };
  },
  expandAll() {
    const sub = currentSubmod();
    if (!sub) return;
    const visit = (list) => (list ?? []).forEach((o) => { if (o && typeof o === 'object') { state.open.add(idOf(o)); Object.values(o).forEach((v) => Array.isArray(v) && visit(v)); } });
    visit(sub.doc.conditions);
  },
  collapseAll() { state.open.clear(); },
  quickAdd(el) {
    const sub = currentSubmod();
    if (!sub || !canEdit('conditions')) return;
    const obj = state.schema.create(el.dataset.name);
    sub.doc.conditions.push(obj);
    state.selId = idOf(obj);
    state.open.add(idOf(obj));
  },
  conditionSetMenu(el) {
    const sub = currentSubmod();
    state.popover = {
      type: 'menu', rect: el.getBoundingClientRect(), width: 250, items: [
        { act: 'copyConditionSet', label: 'Copy condition set', icon: 'copy', disabled: !sub?.doc.conditions.length },
        { act: 'pasteConditionSet', label: 'Paste condition set', icon: 'paste', hint: 'adds to the end', disabled: !state.setClipboard || !canEdit('conditions') },
        '-',
        { act: 'clearConditions', label: 'Remove all conditions', icon: 'trash', danger: true, disabled: !sub?.doc.conditions.length || !canEdit('conditions') },
      ],
    };
  },
  copyConditionSet() {
    const sub = currentSubmod();
    state.setClipboard = clone(sub.doc.conditions);
    state.popover = null;
    navigator.clipboard?.writeText(JSON.stringify(sub.doc.conditions, null, 4)).catch(() => {});
    toast(`Copied ${plural(sub.doc.conditions.length, 'condition')}`);
  },
  pasteConditionSet() {
    const sub = currentSubmod();
    sub.doc.conditions.push(...clone(state.setClipboard));
    state.popover = null;
  },
  clearConditions() {
    const sub = currentSubmod();
    state.popover = null;
    state.dialog = { type: 'confirm', title: 'Remove all conditions?', desc: `${plural(sub.doc.conditions.length, 'condition')} will be removed from ${sub.name}. Discard brings them back until you save.`, ok: 'Remove', danger: true, onOk: () => { sub.doc.conditions.length = 0; state.selId = null; } };
  },

  // component values
  toggleComp(el) {
    const e = registry.get(el.dataset.id);
    if (!e) return;
    migrateLegacy(e.obj);
    e.obj[el.dataset.comp] = !e.obj[el.dataset.comp];
  },
  setComp(el) {
    const e = registry.get(el.dataset.id);
    if (!e) return;
    migrateLegacy(e.obj);
    e.obj[el.dataset.comp] = el.dataset.value;
  },
  toggleStateReset(el) {
    const e = registry.get(el.dataset.id);
    if (!e) return;
    migrateLegacy(e.obj);
    const key = el.dataset.comp;
    const v = e.obj[key] && typeof e.obj[key] === 'object' ? e.obj[key] : (e.obj[key] = { scope: 'Local', shouldResetOnLoopOrEcho: nameOf(e.obj) === 'Random' });
    v.shouldResetOnLoopOrEcho = !v.shouldResetOnLoopOrEcho;
  },

  // picker
  openPicker(el) {
    const rect = el.getBoundingClientRect();
    state.popover = { type: 'picker', rect, kind: el.dataset.kind ?? 'condition', listId: el.dataset.list ?? null, replace: el.dataset.replace ?? null, query: '', cat: null, hi: 0 };
  },
  pickerCat(el) { Object.assign(state.popover, { cat: el.dataset.cat, query: '', hi: 0 }); },
  pickerChoose(el) { choosePicked(el.dataset.name); },

  // submod settings
  toggleSubmodDisabled(el, ev) {
    ev?.stopPropagation();
    const sub = state.ws.findSubmod(el.dataset.id);
    if (!sub || !canEdit('settings')) return;
    if (sub.doc.disabled) delete sub.doc.disabled; else sub.doc.disabled = true;
  },
  toggleSetting(el) {
    const sub = currentSubmod();
    if (!sub) return;
    const key = el.dataset.key;
    const def = el.dataset.default === 'true';
    const next = !(sub.doc[key] ?? def);
    // OAR omits keys that equal their default
    if (next === def) delete sub.doc[key]; else sub.doc[key] = next;
    if (key.startsWith('hasCustomBlendTime') && next) {
      const blendKey = key.replace('hasCustomBlendTime', 'blendTime');
      if (typeof sub.doc[blendKey] !== 'number') sub.doc[blendKey] = 0.2;
    }
  },
  priorityAbove(el) {
    const sub = currentSubmod();
    if (sub) sub.doc.priority = Number(el.dataset.value);
  },
  copySubmodJson() {
    const sub = currentSubmod();
    navigator.clipboard?.writeText(stringify(sub.doc, { newline: '\n' })).then(() => toast('Copied submod config')).catch(() => {});
  },
  copyJson() {
    const sub = currentSubmod();
    navigator.clipboard?.writeText(state.jsonDraft ?? stringify(sub.doc, { newline: '\n' })).then(() => toast('Copied')).catch(() => {});
  },
  applyJson() {
    const sub = currentSubmod();
    try {
      const doc = parse(state.jsonDraft);
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('The top level must be an object { … }.');
      if (!Array.isArray(doc.conditions)) doc.conditions = [];
      for (const k of Object.keys(sub.doc)) delete sub.doc[k];
      Object.assign(sub.doc, doc);
      state.jsonDraft = null;
      state.selId = null;
      toast('JSON applied');
    } catch (e) {
      toast('JSON not applied', e.message, 'error');
    }
  },

  // mod page
  newPreset() {
    const mod = currentMod();
    state.dialog = {
      type: 'prompt', title: 'New condition preset', desc: 'Use it in any submod of this mod with the PRESET condition.', label: 'Name', value: '', ok: 'Add preset',
      onOk: (v) => {
        const name = v.trim();
        if (name.length < 3) return 'Use at least 3 characters.';
        if ((mod.doc.conditionPresets ?? []).some((p) => p.name === name)) return 'That name is taken.';
        (mod.doc.conditionPresets ??= []).push({ name, conditions: [] });
        state.sec.presets = true;
        return null;
      },
    };
  },
  deletePreset(el) {
    const mod = currentMod();
    const p = mod.doc.conditionPresets[Number(el.dataset.index)];
    state.dialog = {
      type: 'confirm', title: `Delete preset ${p.name}?`, desc: 'PRESET conditions that use it will stop working.', ok: 'Delete', danger: true,
      onOk: () => { mod.doc.conditionPresets.splice(Number(el.dataset.index), 1); if (!mod.doc.conditionPresets.length) delete mod.doc.conditionPresets; },
    };
  },

  // ───────── new mod / submod ─────────
  async newMod() {
    state.popover = null;
    state.palette = null;
    let modsDir = state.ws?.mo2?.modsDir ?? null;
    let mo2Source = modsDir ? 'from ModOrganizer.ini' : '';
    if (!modsDir) {
      for (const r of state.recent) {
        try {
          const m = await call('mo2.detect', { path: r.path });
          if (m?.modsDir) { modsDir = m.modsDir; mo2Source = 'found from a recent folder'; break; }
        } catch { /* ignore */ }
      }
    }
    state.dialog = { type: 'newMod', name: '', author: '', description: '', where: modsDir ? 'mo2' : 'other', modsDir, mo2Source, otherDir: null, project: 'character' };
    schedule();
  },
  async dlgWhere(el) {
    const d = state.dialog;
    if (el.dataset.where === 'other') {
      const r = await call('dialog.pickFolder', { title: 'Create the mod in…', purpose: 'write', initial: d.otherDir ?? d.modsDir ?? undefined });
      if (!r?.path) return;
      d.otherDir = r.path;
      d.where = 'other';
    } else d.where = 'mo2';
    schedule();
  },
  dlgProject(el) { state.dialog.project = el.dataset.project; },
  async createMod() {
    const d = state.dialog;
    const name = safeName(d.name);
    if (!name) { d.error = 'Enter a mod name.'; return; }
    const project = d.project === 'character' ? 'character' : safeName(d.project).toLowerCase();
    if (!project || project === 'custom') { d.error = 'Enter the creature project folder name (e.g. wolf).'; return; }
    const parent = d.where === 'other' ? d.otherDir : d.modsDir;
    if (!parent) { d.error = 'Choose where to create the mod.'; return; }
    // The parent must be open (writes are limited to opened folders).
    if (!state.ws || state.ws.root.toLowerCase() !== parent.toLowerCase()) {
      if (state.ws?.dirty) { d.error = 'Save or discard the open changes first.'; return; }
      await openPath(parent);
      if (!state.ws) return;
    }
    const modDir = `${parent}\\${name}\\meshes\\actors\\${project}\\animations\\OpenAnimationReplacer\\${name}`;
    if (state.ws.mods.some((m) => m.path.toLowerCase() === modDir.toLowerCase())) { d.error = 'A mod with this name already exists there.'; return; }
    try {
      const doc = { name: d.name.trim(), author: d.author.trim(), description: d.description.trim() };
      await call('fs.mkdir', { path: modDir });
      await call('fs.writeText', { path: `${modDir}\\config.json`, text: stringify(doc) });
      const mod = new ReplacerMod(state.ws, { path: modDir, folder: name, managerMod: name, project, config: stringify(doc), user: null, submods: [] });
      state.ws.mods.unshift(mod);
      state.modId = mod.id;
      state.submodId = null;
      state.view = 'mod';
      state.setupModId = mod.id;
      state.dialog = null;
      if (state.editMode !== 'author') { state.editMode = 'author'; call('app.setEditMode', { mode: 'author' }); }
      toast(`Created ${doc.name}`, 'New mods open in Author mode (they have no original config to protect).');
      loadVanilla(project);
    } catch (e) {
      d.error = e.message;
    }
    schedule();
  },
  newSubmod() {
    const mod = currentMod();
    if (!mod) return;
    state.popover = null;
    const max = mod.submods.reduce((m, s) => Math.max(m, s.priority), -Infinity);
    state.dialog = { type: 'newSubmod', name: '', priority: String(Number.isFinite(max) ? max + 1 : 1000), from: 'empty', copyId: currentSubmod()?.id ?? state.ws.allSubmods()[0]?.id, templates: [] };
  },
  dlgFrom(el) { state.dialog.from = el.dataset.from; },
  dlgTemplate(el) {
    const t = state.dialog.templates ?? (state.dialog.templates = []);
    const i = t.indexOf(el.dataset.name);
    if (i >= 0) t.splice(i, 1); else t.push(el.dataset.name);
  },
  async createSubmod() {
    const d = state.dialog;
    const mod = currentMod();
    const name = d.name.trim();
    const priority = parseInt(d.priority, 10);
    const folder = safeName(`${priority}_${name}`);
    if (mod.submods.some((s) => s.folder.toLowerCase() === folder.toLowerCase())) { d.error = `A folder named ${folder} already exists.`; return; }
    const doc = { name, priority, conditions: [] };
    if (d.from === 'copy') {
      const src = state.ws.findSubmod(d.copyId);
      if (src) {
        for (const [k, v] of Object.entries(src.doc)) {
          if (['name', 'description', 'priority', 'replacementAnimDatas', 'overrideAnimationsFolder'].includes(k)) continue;
          doc[k] = clone(v);
        }
      }
    } else if (d.from === 'template') {
      doc.conditions = (d.templates ?? []).map((t) => state.schema.create(t));
    }
    const path = `${mod.path}\\${folder}`;
    try {
      const text = stringify(doc);
      await call('fs.mkdir', { path });
      await call('fs.writeText', { path: `${path}\\config.json`, text });
      const sub = new Submod(mod, { path, folder, config: text, user: null, files: [] });
      mod.submods.push(sub);
      state.submodId = sub.id;
      state.view = 'submod';
      state.sec.files = true;
      state.dialog = null;
      toast(`Created ${name}`, `${folder}\\config.json`);
    } catch (e) {
      d.error = e.message;
    }
    schedule();
  },

  // ───────── animation files ─────────
  async browseFiles() {
    const r = await call('dialog.pickFiles', { title: 'Choose .hkx animations' });
    if (r?.paths?.length) addFiles(currentSubmod(), r.paths);
  },
  pickOriginal(el, ev) {
    ev.stopPropagation();
    const sub = currentSubmod();
    loadVanilla(sub.mod.project);
    const p = sub.pendingFiles.find((x) => x.src === el.dataset.src);
    state.popover = { type: 'original', rect: el.getBoundingClientRect(), src: el.dataset.src, project: sub.mod.project, query: p?.target ? basename(p.target).replace(/\.hkx$/i, '') : basename(el.dataset.src).replace(/\.hkx$/i, '').replace(/[_-]?(var\d*|[a-z]|\d+)$/i, ''), hi: 0 };
  },
  chooseOriginal(el) {
    const sub = currentSubmod();
    const p = sub.pendingFiles.find((x) => x.src === state.popover.src);
    if (p) p.target = el.dataset.path;
    recomputeRels(sub);
    state.selId = `anim:${p.target}`;
    state.popover = null;
  },
  removePending(el, ev) {
    ev.stopPropagation();
    const sub = currentSubmod();
    sub.pendingFiles = sub.pendingFiles.filter((p) => p.src !== el.dataset.src);
    recomputeRels(sub);
  },
  selectAnim(el, ev) {
    if (ev.target.closest('button')) return;
    state.selId = `anim:${el.dataset.target}`;
    state.panel = true;
  },

  // ───────── save ─────────
  save() { beginSave(); },
  confirmSave() { performSave(state.dialog.ops); },
  discardAll() {
    state.dialog = {
      type: 'confirm', title: 'Discard all unsaved changes?', desc: 'Everything goes back to what is on disk.', ok: 'Discard', danger: true,
      onOk: () => { for (const m of state.ws.mods) { m.reset(); m.submods.forEach((s) => s.reset()); } state.selId = null; state.jsonDraft = null; },
    };
  },
  async reloadSubmod() {
    const sub = currentSubmod();
    const run = async () => {
      try {
        const { scan } = await call('oar.scan', { root: sub.mod.path });
        const dto = scan.mods[0]?.submods.find((s) => s.path.toLowerCase() === sub.path.toLowerCase());
        if (!dto) throw new Error('The submod folder is gone.');
        const fresh = new Submod(sub.mod, dto);
        Object.assign(sub, { configText: fresh.configText, userText: fresh.userText, configDoc: fresh.configDoc, userDoc: fresh.userDoc, files: fresh.files, problems: fresh.problems });
        sub.reset();
        state.selId = null;
        toast('Reloaded from disk');
      } catch (e) { toast('Reload failed', e.message, 'error'); }
      schedule();
    };
    if (sub.dirty) state.dialog = { type: 'confirm', title: 'Reload and lose changes?', desc: `Unsaved changes in ${sub.name} will be lost.`, ok: 'Reload', danger: true, onOk: run };
    else await run();
  },
  deleteUserConfig() {
    const sub = currentSubmod();
    state.dialog = {
      type: 'confirm', title: 'Delete user config?', desc: `user.json of ${sub.name} goes to the Recycle Bin. OAR will use the mod's own config.json again.`, ok: 'Delete', danger: true,
      onOk: async () => {
        try {
          await call('fs.recycle', { path: `${sub.path}\\user.json` });
          sub.markUserDeleted();
          toast('user.json moved to the Recycle Bin');
        } catch (e) { toast('Could not delete user.json', e.message, 'error'); }
        schedule();
      },
    };
  },

  // dialogs
  closeDialog() { const d = state.dialog; state.dialog = null; d?.onCancel?.(); },
  dialogBackdrop(el, ev) { if (ev.target === el) actions.closeDialog(); },
  async dialogOk() {
    const d = state.dialog;
    if (!d) return;
    const res = await d.onOk?.(d.value ?? '');
    if (typeof res === 'string') { d.error = res; schedule(); return; }
    if (state.dialog === d) state.dialog = null;
    schedule();
  },
  async dialogAlt() { const d = state.dialog; state.dialog = null; await d.onAlt?.(); schedule(); },

  openPalette() { state.palette = { query: '', hi: 0 }; },
  closePalette(el, ev) { if (!ev || ev.target === el) state.palette = null; },
};

function toggleOpen(id) {
  if (state.open.has(id)) state.open.delete(id); else state.open.add(id);
}

function setFlag(obj, key, value) {
  if (!canEdit('conditions')) return;
  if (value) obj[key] = true; else delete obj[key];
}

export function choosePicked(name) {
  const p = state.popover;
  if (!p) return;
  const created = state.schema.create(name, p.kind);
  if (p.replace) {
    const e = registry.get(p.replace);
    if (e) {
      // keep what the user set on the old entry that still applies
      for (const k of ['disabled', 'negated', 'comment']) if (k in e.obj) created[k] = e.obj[k];
      const i = e.list.indexOf(e.obj);
      e.list.splice(i, 1, created);
      state.open.add(idOf(created));
      state.selId = idOf(created);
    }
  } else {
    const entry = registry.get(p.listId);
    const list = entry?.list ?? entry?.ensure?.();
    if (!list) return;
    // add below the selected entry when it's in this list, else at the end
    const sel = state.selId ? registry.get(state.selId) : null;
    const at = sel && sel.list === list ? list.indexOf(sel.obj) + 1 : list.length;
    list.splice(at, 0, created);
    state.selId = idOf(created);
    if (state.schema.def(name, p.kind)?.components.length) state.open.add(idOf(created));
  }
  state.popover = null;
}

// ───────── animation files ─────────

export function addFiles(sub, paths) {
  if (!sub || !canEdit('files')) return;
  const vanilla = state.vanilla.get(sub.mod.project) ?? [];
  const counts = state.ws.replacementCounts(sub.mod.project);
  let added = 0;
  for (const src of paths) {
    if (!/\.hkx$/i.test(src) || sub.pendingFiles.some((p) => p.src.toLowerCase() === src.toLowerCase())) continue;
    const file = basename(src).toLowerCase();
    // same file name as an original → that original (prefer the shortest path, e.g. "mt_idle.hkx" over "male\mt_idle.hkx")
    const guess = vanilla.filter((v) => basename(v).toLowerCase() === file).sort((a, b) => a.length - b.length)[0]
      ?? [...counts.keys()].find((k) => basename(k) === file) ?? '';
    sub.pendingFiles.push({ src, target: guess, rel: '' });
    added++;
  }
  recomputeRels(sub);
  state.sec.files = true;
  if (added) toast(`Added ${plural(added, 'file')}`, sub.pendingFiles.some((p) => !p.target) ? 'Choose which original animation each one replaces.' : 'Copied into the submod when you save.');
  schedule();
}

/** Where each pending file goes: one file per original → its name; several → _variants_<name>\ (OAR rule). */
export function recomputeRels(sub) {
  const groups = new Map();
  for (const p of sub.pendingFiles) {
    if (!p.target) { p.rel = ''; continue; }
    const k = p.target.toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  for (const [k, list] of groups) {
    const existing = sub.files.filter((f) => targetOf(f).toLowerCase() === k);
    const existingVariants = existing.some((f) => f !== targetOf(f));
    const target = list[0].target;
    if (list.length === 1 && existing.length === 0) { list[0].rel = target; continue; }
    const dir = target.includes('\\') ? `${dirname(target)}\\` : '';
    const stem = basename(target).replace(/\.hkx$/i, '');
    const vdir = `${dir}_variants_${stem}`;
    const used = new Set(existing.filter(() => existingVariants).map((f) => basename(f).toLowerCase()));
    for (const p of list) {
      let n = basename(p.src);
      let i = 2;
      while (used.has(n.toLowerCase())) n = `${basename(p.src).replace(/\.hkx$/i, '')}_${i++}.hkx`;
      used.add(n.toLowerCase());
      p.rel = `${vdir}\\${n}`;
    }
  }
}

// ───────── save ─────────

function shortPath(full) {
  const i = full.toLowerCase().indexOf('\\openanimationreplacer\\');
  return i >= 0 ? full.slice(i + 23) : full;
}

export function beginSave() {
  const ws = state.ws;
  if (!ws || state.editMode === 'inspect') return null;
  const mode = state.editMode;
  const ops = [];
  const checks = [];
  let blocked = false;
  let anyNew = false;
  for (const m of ws.mods) {
    if (m.ownDirty) {
      const t = m.saveTarget(mode);
      ops.push({ type: 'json', owner: m, file: t.file, text: t.text, short: shortPath(t.file), exists: mode === 'author' ? m.configText != null : m.userText != null, label: 'mod info' });
    }
    if (m.id === state.setupModId) anyNew = true;
    for (const s of m.submods) {
      if (!s.dirty) continue;
      const docChanged = stringify(s.doc) !== s.baseline;
      if (docChanged) {
        const t = s.saveTarget(mode);
        ops.push({ type: 'json', owner: s, file: t.file, text: t.text, short: shortPath(t.file), exists: mode === 'author' ? s.configText != null : s.userText != null, label: plural(s.doc.conditions.length, 'condition') });
      }
      for (const p of s.pendingFiles) {
        if (!p.target) { blocked = true; checks.push({ level: 'warn', text: `${basename(p.src)}: choose which original animation it replaces`, sub: s.name }); continue; }
        ops.push({ type: 'copy', owner: s, src: p.src, dst: `${s.path}\\${p.rel}`, rel: `${s.folder}\\${p.rel}` });
        const higher = ws.replacersOf(p.target, m.project).filter((o) => o !== s && o.priority > s.priority);
        if (higher.length && !checks.some((c) => c.target === p.target))
          checks.push({ level: 'warn', target: p.target, text: `${plural(higher.length, 'submod')} replace ${p.target} with higher priority`, sub: `yours: ${s.priority}` });
        const plain = s.files.find((f) => f.toLowerCase() === p.target.toLowerCase());
        if (plain && p.rel !== p.target) checks.push({ level: 'warn', text: `OAR ignores ${plain} once the _variants_ folder exists — move it into the folder or delete it`, sub: s.name });
      }
    }
  }
  if (!ops.length && !blocked) { toast('Nothing to save'); return null; }
  const plugins = new Set();
  for (const o of ops) if (o.type === 'json') for (const m of o.text.matchAll(/"requiredPlugin":\s*"([^"]+)"/g)) plugins.add(m[1]);
  checks.unshift(plugins.size
    ? { level: 'ok', text: `Uses conditions from ${[...plugins].join(', ')}`, sub: 'players need these plugins' }
    : { level: 'ok', text: 'Uses only built-in OAR conditions', sub: 'no extra plugins needed' });
  const copies = ops.some((o) => o.type === 'copy');
  if (copies || anyNew || blocked) {
    const after = [];
    if (anyNew && ws.mo2) after.push('Mod Organizer 2: press <span class="kbd">F5</span> to refresh, then tick the new mod in the left pane.');
    after.push('In game: open the OAR menu › Replacer Mods to check it loaded.');
    state.dialog = { type: 'save', ops, checks, blocked, after };
    schedule();
    return 'dialog';
  }
  return performSave(ops);
}

export async function performSave(ops) {
  const mode = state.editMode;
  const done = new Set();
  try {
    for (const o of ops) {
      if (o.type === 'json') {
        await call('fs.writeText', { path: o.file, text: o.text });
        o.owner.markSaved(mode, o.text);
        done.add(o.owner);
      } else {
        await call('fs.copyFile', { src: o.src, dst: o.dst });
      }
    }
    // files copied: move pending into the submod's file list
    for (const o of ops) {
      if (o.type !== 'copy') continue;
      const s = o.owner;
      const p = s.pendingFiles.find((x) => x.src === o.src);
      if (p && !s.files.includes(p.rel)) s.files.push(p.rel);
      s.pendingFiles = s.pendingFiles.filter((x) => x.src !== o.src);
    }
    state.dialog = null;
    if (state.setupModId) {
      const m = state.ws.findMod(state.setupModId);
      if (m && !m.dirty && m.submods.some((s) => s.files.length)) toast('New mod saved', 'Setup complete.');
    }
    toast(`Saved ${plural(ops.length, 'file')}`, mode === 'author' ? 'config.json' : 'user.json — originals untouched');
  } catch (e) {
    toast('Save stopped', e.message, 'error');
  }
  schedule();
}

export function closeRequested() {
  state.dialog = {
    type: 'confirm', title: 'Save changes before closing?', desc: 'There are unsaved changes.', ok: 'Save', alt: "Don't save",
    onOk: async () => {
      state.dialog = null;
      const r = beginSave();
      if (r === 'dialog' || !r) return null; // the save review stays open; closing again after it is quick
      await r;
      if (!state.ws?.dirty) call('app.confirmClose');
      return null;
    },
    onAlt: () => call('app.confirmClose'),
  };
  schedule();
}

export { FUNCTION_SETS, Submod };
