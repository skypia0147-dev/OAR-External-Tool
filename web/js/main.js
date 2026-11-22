// Entry point: load definitions, draw the app, route events.
import { call, on, inHost } from './bridge.js';
import { state, registry, setRenderer, render, schedule, toast, currentMod, currentSubmod, canEdit } from './state.js';
import { Schema, migrateLegacy } from './model/schema.js';
import { titlebar, sidebar, toolbar, savebar, toasts } from './views/shell.js';
import { submodList, submodEditor } from './views/submod.js';
import { modPage, startPage, problemsPage, settingsPage } from './views/pages.js';
import { rightPanel } from './views/panel.js';
import { overlays } from './views/overlays.js';
import { actions, openPath, refreshRecent, addFiles, choosePicked, beginSave, closeRequested } from './actions.js';
import { idOf } from './core.js';

function mainArea() {
  const ws = state.ws;
  if (state.view === 'problems') return `<div class="oar-body">${problemsPage()}</div>`;
  if (state.view === 'settings') return `<div class="oar-body">${settingsPage()}</div>`;
  if (!ws || state.view === 'start') return `<div class="oar-body">${startPage()}</div>`;
  const mod = currentMod();
  if (!mod) return `<div class="oar-body">${startPage()}</div>`;
  if (state.view === 'mod') return toolbar() + `<div class="oar-body">${modPage(mod)}</div>` + savebar();
  const sub = currentSubmod();
  if (!sub) return toolbar() + `<div class="oar-body">${modPage(mod)}</div>` + savebar();
  return toolbar() + `<div class="oar-body">${submodList(mod)}${submodEditor(sub)}${rightPanel()}</div>` + savebar();
}

let lastDirty = null;
setRenderer(() => {
  const hidden = document.querySelector('.app')?.classList.contains('sidebar-hidden');
  document.getElementById('app').innerHTML = `<div class="app ${hidden ? 'sidebar-hidden' : ''} ${state.busy ? 'busy' : ''}">${titlebar()}
    <div class="shell-body">${sidebar()}<main class="main">${mainArea()}</main></div></div>${overlays()}${toasts()}`;
  const dirty = !!state.ws?.dirty;
  if (dirty !== lastDirty && inHost) { lastDirty = dirty; call('app.setDirty', { dirty }).catch(() => {}); }
  document.title = `${dirty ? '* ' : ''}OAR External Tool`;
});

// ───────── clicks ─────────

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  try {
    await fn(el, ev);
  } catch (e) {
    console.error(e);
    toast('Something went wrong', e.message, 'error');
  }
  schedule();
});

// ───────── typing ─────────

function num(v, int) {
  const n = int ? parseInt(v, 10) : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function setDeep(obj, dotted, value) {
  const parts = dotted.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = value;
}

function onComponentInput(el) {
  const e = registry.get(el.dataset.id);
  if (!e || !canEdit('conditions')) return;
  const obj = e.obj;
  migrateLegacy(obj); // an edited entry is written in the current OAR layout
  const key = el.dataset.comp;
  const f = el.dataset.field;
  const cur = obj[key];
  switch (f) {
    case 'value': obj[key] = { value: num(el.value) }; break;
    case 'enum': obj[key] = { value: num(el.value, true) }; break;
    case 'numMode': {
      const m = el.value;
      obj[key] = m === 'value' ? { value: 0 } : m === 'global' ? { form: { pluginName: '', formID: '' } }
        : m === 'av' ? { actorValue: 24, actorValueType: 'Value' } : { graphVariable: '', graphVariableType: 'Float' };
      break;
    }
    case 'numForm.pluginName': case 'numForm.formID':
      obj[key] = { form: { ...(cur?.form ?? { pluginName: '', formID: '' }), [f.split('.')[1]]: el.value.trim() } }; break;
    case 'actorValue': obj[key] = { ...cur, actorValue: num(el.value, true) }; break;
    case 'actorValueType': obj[key] = { ...cur, actorValueType: el.value }; break;
    case 'graphVariable': obj[key] = { ...cur, graphVariable: el.value.trim() }; break;
    case 'graphVariableType': obj[key] = { ...cur, graphVariableType: el.value }; break;
    case 'form.pluginName': case 'form.formID':
      obj[key] = { ...(cur && typeof cur === 'object' ? cur : {}), [f.split('.')[1]]: el.value.trim() }; break;
    case 'kwMode': obj[key] = el.value === 'form' ? { form: { pluginName: '', formID: '' } } : { editorID: '' }; break;
    case 'editorID': obj[key] = { editorID: el.value.trim() }; break;
    case 'kwForm.pluginName': case 'kwForm.formID':
      obj[key] = { form: { ...(cur?.form ?? { pluginName: '', formID: '' }), [f.split('.')[1]]: el.value.trim() } }; break;
    case 'text': case 'preset': obj[key] = el.value; break;
    case 'p0': case 'p1': case 'p2': {
      const arr = Array.isArray(cur) ? [...cur] : [0, 0, 0];
      arr[Number(f[1])] = num(el.value);
      obj[key] = arr;
      break;
    }
    case 'scope': obj[key] = { ...(cur ?? {}), scope: el.value }; break;
    default: break;
  }
}

function onInput(ev) {
  const el = ev.target;
  const ds = el.dataset;
  const structural = ev.type === 'change';
  if (ds.bindUi === 'smFilter') { state.smFilter = el.value; schedule(); return; }
  if (ds.pickerQuery) { Object.assign(state.popover, { query: el.value, hi: 0 }); schedule(); return; }
  if (ds.originalQuery) { Object.assign(state.popover, { query: el.value, hi: 0 }); schedule(); return; }
  if (ds.palette) { Object.assign(state.palette, { query: el.value, hi: 0 }); schedule(); return; }
  if (ds.dlg) {
    const d = state.dialog;
    if (d) { d[ds.dlg] = el.value; if (d.type === 'prompt') d.value = el.value; d.error = null; }
    schedule();
    return;
  }
  if (ds.jsonDraft) { state.jsonDraft = el.value; if (structural) schedule(); else updateApply(); return; }
  if (ds.sub) {
    const sub = currentSubmod();
    if (!sub || !canEdit(ds.sub === 'name' || ds.sub === 'description' ? ds.sub : 'settings')) return;
    const key = ds.sub;
    if (ds.num) sub.doc[key] = num(el.value, ds.num === 'int');
    else if (el.value === '' && key !== 'name') delete sub.doc[key];
    else sub.doc[key] = el.value;
    schedule();
    return;
  }
  if (ds.mod) {
    const mod = currentMod();
    if (!mod || !canEdit('modInfo')) return;
    mod.doc[ds.mod] = el.value;
    schedule();
    return;
  }
  if (ds.entryField === 'essential') {
    const e = registry.get(ds.id);
    if (e) { const v = Number(el.value); if (v) e.obj.essential = v; else delete e.obj.essential; }
    schedule();
    return;
  }
  if (ds.raw) {
    // raw JSON for unknown fields: apply only when it parses
    const e = registry.get(ds.raw);
    if (!e) return;
    try {
      const v = JSON.parse(el.value);
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
      const keys = ds.rawKeys ? ds.rawKeys.split('\u0001') : Object.keys(e.obj);
      for (const k of keys) delete e.obj[k];
      Object.assign(e.obj, v);
      el.classList.remove('bad');
      if (structural) schedule();
    } catch {
      el.classList.add('bad');
    }
    return;
  }
  if (ds.comp) {
    onComponentInput(el);
    // keep typing smooth: selects/modes re-render right away, text waits for a pause
    if (structural || el.tagName === 'SELECT') schedule(); else debounceRender();
  }
}

let timer = null;
function debounceRender() {
  clearTimeout(timer);
  timer = setTimeout(schedule, 250);
}

function updateApply() {
  const b = document.querySelector('[data-act="applyJson"]');
  if (b) b.disabled = state.jsonDraft == null;
}

document.addEventListener('input', onInput);
document.addEventListener('change', onInput);

// ───────── keyboard ─────────

function typing(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function listNav(ev, holder, count, onEnter) {
  if (ev.key === 'ArrowDown') { holder.hi = Math.min(count - 1, (holder.hi ?? 0) + 1); ev.preventDefault(); schedule(); scrollHi(); return true; }
  if (ev.key === 'ArrowUp') { holder.hi = Math.max(0, (holder.hi ?? 0) - 1); ev.preventDefault(); schedule(); scrollHi(); return true; }
  if (ev.key === 'Enter') { ev.preventDefault(); onEnter(); return true; }
  return false;
}

function scrollHi() {
  requestAnimationFrame(() => document.querySelector('.popover [aria-selected="true"], .palette [aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
}

document.addEventListener('keydown', async (ev) => {
  const ctrl = ev.ctrlKey || ev.metaKey;
  if (ctrl && ev.key.toLowerCase() === 's') { ev.preventDefault(); beginSave(); schedule(); return; }
  if (ctrl && ev.key.toLowerCase() === 'k') { ev.preventDefault(); actions.openPalette(); schedule(); return; }
  if (ev.key === 'Escape') {
    if (state.popover) state.popover = null;
    else if (state.palette) state.palette = null;
    else if (state.dialog) actions.closeDialog();
    else if (state.selId) state.selId = null;
    schedule();
    return;
  }
  if (state.palette) {
    const items = [...document.querySelectorAll('[data-palette-item]')];
    listNav(ev, state.palette, items.length, () => items[state.palette.hi ?? 0]?.click());
    return;
  }
  if (state.popover?.type === 'picker') {
    const items = [...document.querySelectorAll('.picker .pk-item')];
    listNav(ev, state.popover, items.length, () => { const it = items[state.popover.hi ?? 0]; if (it) { choosePicked(it.dataset.name); schedule(); } });
    return;
  }
  if (state.popover?.type === 'original') {
    const items = [...document.querySelectorAll('.am-pick .pk-item')];
    listNav(ev, state.popover, items.length, () => items[state.popover.hi ?? 0]?.click());
    return;
  }
  if (state.dialog && ev.key === 'Enter' && ev.target.tagName === 'INPUT') {
    const ok = document.querySelector('.dialog .dialog-actions .btn-primary, .dialog .dialog-actions .btn-danger');
    if (ok && !ok.disabled) ok.click();
    return;
  }
  if (typing(ev.target) || state.dialog) return;
  const sel = state.selId && !state.selId.startsWith('anim:') ? state.selId : null;
  if (!sel) return;
  const fake = { dataset: { id: sel } };
  if (ev.key === 'Delete') { actions.deleteEntry(fake); schedule(); }
  else if (ctrl && ev.key.toLowerCase() === 'c') { actions.copyEntry(fake); schedule(); }
  else if (ctrl && ev.key.toLowerCase() === 'v') { actions.pasteEntry(fake); schedule(); }
});

// ───────── drag: reorder conditions ─────────

let dragId = null;
document.addEventListener('dragstart', (ev) => {
  const row = ev.target.closest?.('[data-drag]');
  if (!row || !canEdit('conditions')) return;
  dragId = row.dataset.drag;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/x-oar-entry', dragId);
});

function dropSpot(ev) {
  const row = ev.target.closest?.('.cond-row');
  if (!row || !dragId) return null;
  const r = row.getBoundingClientRect();
  return { row, after: ev.clientY > r.top + r.height / 2 };
}

document.addEventListener('dragover', (ev) => {
  if (ev.dataTransfer?.types?.includes('Files')) {
    const target = ev.target.closest?.('[data-drop]') ?? (currentSubmod() && state.view === 'submod' ? document.body : null) ?? (!state.ws ? document.body : null);
    if (target) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; document.querySelectorAll('.drop-hover').forEach((x) => x.classList.remove('drop-hover')); ev.target.closest?.('[data-drop]')?.classList.add('drop-hover'); }
    return;
  }
  const spot = dropSpot(ev);
  document.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  if (!spot) return;
  ev.preventDefault();
  spot.row.classList.add(spot.after ? 'drop-after' : 'drop-before');
});

document.addEventListener('dragend', () => {
  dragId = null;
  document.querySelectorAll('.drop-before,.drop-after,.drop-hover').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-hover'));
});

document.addEventListener('drop', async (ev) => {
  document.querySelectorAll('.drop-before,.drop-after,.drop-hover').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-hover'));
  if (ev.dataTransfer?.files?.length) {
    ev.preventDefault();
    const files = [...ev.dataTransfer.files];
    try {
      const { paths, raw } = await call('drop.paths', {}, files);
      const sub = state.view === 'submod' ? currentSubmod() : null;
      if (sub && paths.length) addFiles(sub, paths);
      else if (raw?.length === 1 && !/\.\w+$/.test(raw[0])) {
        if (!state.ws?.dirty) await openPath(raw[0]);
        else toast('Save or discard your changes before opening another folder', '', 'warn');
      } else if (!sub && paths.length) toast('Open a submod first', 'Animation files go into the submod you are editing.', 'warn');
    } catch (e) { toast('Drop failed', e.message, 'error'); }
    schedule();
    return;
  }
  const spot = dropSpot(ev);
  if (!spot || !dragId) return;
  ev.preventDefault();
  const src = registry.get(dragId);
  const dst = registry.get(spot.row.dataset.id);
  dragId = null;
  if (!src || !dst || src === dst) return;
  // don't drop a group into itself
  if (contains(src.obj, dst.obj)) { toast("Can't move a group into itself", '', 'warn'); return; }
  const from = src.list.indexOf(src.obj);
  src.list.splice(from, 1);
  let to = dst.list.indexOf(dst.obj) + (spot.after ? 1 : 0);
  dst.list.splice(to, 0, src.obj);
  state.selId = idOf(src.obj);
  schedule();
});

function contains(outer, inner) {
  if (outer === inner) return true;
  for (const v of Object.values(outer)) {
    if (Array.isArray(v)) { if (v.some((x) => x && typeof x === 'object' && contains(x, inner))) return true; }
    else if (v && typeof v === 'object' && contains(v, inner)) return true;
  }
  return false;
}

// ───────── start ─────────

on('closeRequested', () => closeRequested());

async function start() {
  try {
    const data = await (await fetch('data/conditions.json')).json();
    state.schema = new Schema(data);
  } catch (e) {
    document.getElementById('app').textContent = `Could not load condition definitions: ${e.message}`;
    return;
  }
  if (inHost) {
    try {
      state.info = await call('app.info');
      state.editMode = state.info.editMode ?? 'user';
    } catch { /* keep defaults */ }
    await refreshRecent();
  }
  render();
}

start();
