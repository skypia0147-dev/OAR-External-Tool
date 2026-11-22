// Mod page, start page, Problems and Settings.
import { esc, ic, plural, ago } from '../core.js';
import { state, canEdit } from '../state.js';
import { renderList } from './tree.js';
import { setupCard } from './submod.js';

export function modPage(mod) {
  const ed = canEdit('modInfo');
  const row = (label, desc, ctl) => `<div class="set-row"><div class="set-row-text"><span>${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  const input = (key, w, ph) => `<label class="set-input ${w} ${ed ? '' : 'readonly'}"><input data-mod="${key}" data-focus="mod:${key}" value="${esc(mod.doc[key] ?? '')}" placeholder="${ph}" ${ed ? '' : 'readonly'}>${ed ? '' : ic('lock', 13)}</label>`;
  const presets = mod.doc.conditionPresets ?? [];
  const ctx = { editable: canEdit('conditions'), presets: presets.map((p) => p.name), owner: mod };
  const presetRows = presets.map((p, i) => `<div class="preset">
      <div class="preset-head"><span class="nm preset-name">${esc(p.name)}</span><span class="set-desc grow ell">${esc(p.description ?? '')}</span>
      ${ctx.editable ? `<button class="icon-btn" data-act="deletePreset" data-index="${i}" title="Delete preset">${ic('trash', 14)}</button>` : ''}</div>
      <div class="tree">${renderList(p.conditions, 'condition', { ...ctx, label: p.name }, 0, () => (Array.isArray(p.conditions) ? p.conditions : (p.conditions = [])))}</div></div>`).join('');
  const subs = mod.sortedSubmods().map((s) => `
    <div class="tbl-row ${s.disabled ? 'disabled' : ''}" data-act="openSubmod" data-id="${s.id}">
      <span class="cb" role="checkbox" aria-checked="${!s.disabled}" ${canEdit('settings') ? `data-act="toggleSubmodDisabled" data-id="${s.id}"` : ''}></span>
      <span class="nm ell">${esc(s.name)}${s.dirty ? ' <span class="mk-dirty">*</span>' : ''}${s.userDoc ? ' <span class="mk-user">(User)</span>' : ''}</span>
      <span class="mono">${s.priority}</span><span class="r mono">${s.doc.conditions?.length ?? 0}</span><span class="r mono">${s.animationTargets().length}</span>
      <span class="r" style="color:var(--text-5)">${s.userDoc ? 'user.json' : 'config.json'}</span></div>`).join('');
  const rel = mod.path.slice(Math.max(0, mod.path.toLowerCase().indexOf('\\meshes\\') + 1));
  return `<div class="mod-page"><div class="ed-col" style="max-width:1000px">
    ${setupCard(mod)}
    <div class="ed-head"><div class="ed-head-text">
      <div class="ed-title">${esc(mod.name)}${mod.dirty ? ' <span class="mk-dirty">*</span>' : ''}</div>
      <button class="ed-path" data-act="reveal" data-path="${esc(mod.path)}" title="Show in Explorer">${esc(mod.managerMod ? `${mod.managerMod}\\${rel}` : rel)}</button>
      <div class="ed-chips">${mod.author ? `<span class="tag">by ${esc(mod.author)}</span>` : ''}<span class="tag">${plural(mod.submods.length, 'submod')}</span>${mod.project !== 'character' ? `<span class="tag mono">${esc(mod.project)}</span>` : ''}${mod.userDoc ? '<span class="tag user">user.json</span>' : ''}</div>
    </div><div class="ed-head-actions">${canEdit('settings') ? `<button class="btn ${mod.submods.length ? 'btn-secondary' : 'btn-primary'}" data-act="newSubmod">${ic('plus', 14)}New submod</button>` : ''}</div></div>
    <section class="sec ${state.sec.info ? 'open' : ''}"><div class="sec-head" data-act="toggleSec" data-sec="info"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Mod info</span><span class="sec-summary"></span></div><div class="sec-body">
      ${row('Mod name', ed ? '' : 'Author mode only', input('name', 'w-lg', ''))}
      ${row('Author', ed ? '' : 'Author mode only', input('author', 'w-md', ''))}
      ${row('Description', ed ? '' : 'Author mode only', input('description', 'w-lg', 'No description'))}
    </div></section>
    <section class="sec ${state.sec.presets ? 'open' : ''}"><div class="sec-head" data-act="toggleSec" data-sec="presets"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Condition presets</span><span class="sec-count">${presets.length}</span><span class="sec-summary"></span></div><div class="sec-body">
      ${presetRows}
      <div class="empty-line">${presets.length ? '' : 'No condition presets. Presets are named condition groups that every submod of this mod can reuse with the PRESET condition.'}<span class="grow"></span>
      ${ctx.editable ? `<button class="btn btn-secondary btn-sm" data-act="newPreset">${ic('plus', 14)}Add new condition preset</button>` : ''}</div>
    </div></section>
    <section class="sec ${state.sec.submods ? 'open' : ''}"><div class="sec-head" data-act="toggleSec" data-sec="submods"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Submods</span><span class="sec-count">${mod.submods.length}</span><span class="sec-summary"></span></div><div class="sec-body">
      ${mod.submods.length ? `<div class="tbl"><div class="tbl-row head"><span></span><span>Name</span><span>Priority</span><span class="r">Conditions</span><span class="r">Animations</span><span class="r">Source</span></div>${subs}</div>`
        : `<div class="empty-line">No submods yet.<span class="grow"></span>${canEdit('settings') ? `<button class="btn btn-secondary btn-sm" data-act="newSubmod">${ic('plus', 14)}New submod</button>` : ''}</div>`}
    </div></section>
  </div></div>`;
}

export function startPage() {
  const rec = state.recent.map((r) => `<div class="recent-row" data-act="openRecent" data-path="${esc(r.path)}">${ic('folder', 16)}
      <div class="grow" style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="mono ell">${esc(r.path)}</span><small>${plural(r.modCount, 'OAR mod')} · opened ${ago(r.openedAt)}</small></div>
      <button class="icon-btn" data-act="removeRecent" data-path="${esc(r.path)}" title="Remove from list">${ic('x', 14)}</button></div>`).join('');
  return `<div class="start"><div class="start-col">
    <div><div class="start-title">Open a mods folder</div><div class="start-sub">Pick a mod manager’s <span class="mono">mods</span> folder, a single mod, or an <span class="mono">OpenAnimationReplacer</span> folder. Every <span class="mono">config.json</span> and <span class="mono">user.json</span> inside is listed on the left, just like the in-game Replacer Mods tab.</div></div>
    <div class="drop" data-drop="folder">${ic('folder', 26)}<span>Drop a folder here</span></div>
    <div class="start-actions"><button class="btn btn-primary btn-lg" data-act="openFolder">${ic('folder', 15)}Open folder…</button><button class="btn btn-secondary btn-lg" data-act="newMod">${ic('plus', 15)}Create new mod</button></div>
    ${rec ? `<div><div class="sb-section-head" style="padding-left:2px">Recent folders</div><div class="recent">${rec}</div></div>` : ''}
  </div></div>`;
}

export function problemsPage() {
  const ws = state.ws;
  if (!ws) return `<div class="start"><div class="start-col"><div class="start-title">Problems</div><div class="start-sub">Open a folder first.</div></div></div>`;
  const list = ws.problems();
  const order = { error: 0, warn: 1, info: 2 };
  list.sort((a, b) => order[a.level] - order[b.level]);
  const rows = list.map((p) => `<div class="pb-row ${p.level}" ${p.submod ? `data-act="openSubmod" data-id="${p.submod.id}"` : p.mod ? `data-act="openMod" data-id="${p.mod.id}"` : ''}>
      <span class="pb-ic">${p.level === 'error' ? '!' : p.level === 'warn' ? '!' : 'i'}</span>
      <div class="grow" style="min-width:0"><div class="ell">${esc(p.mod ? `${p.mod.name}${p.submod ? ` › ${p.submod.name}` : ''}` : 'Folder')}</div><div class="set-desc">${esc(p.text)}</div></div>
      ${p.submod || p.mod ? ic('chevronRight', 15) : ''}</div>`).join('');
  const counts = ['error', 'warn', 'info'].map((l) => list.filter((p) => p.level === l).length);
  return `<div class="page-scroll"><div class="ed-col" style="max-width:900px">
    <div class="ed-head"><div class="ed-head-text"><div class="ed-title">Problems</div>
      <div class="ed-chips"><span class="tag ${counts[0] ? 'dirty' : ''}">${plural(counts[0], 'error')}</span><span class="tag">${plural(counts[1], 'warning')}</span><span class="tag">${counts[2]} info</span></div></div></div>
    ${list.length ? `<div class="pb-list">${rows}</div>` : '<div class="empty-line">Nothing to report.</div>'}
  </div></div>`;
}

export function settingsPage() {
  const row = (label, desc, ctl) => `<div class="set-row"><div class="set-row-text"><span>${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  const modeSeg = ['inspect', 'user', 'author'].map((m) => `<button class="seg-btn" data-act="setEditMode" data-mode="${m}" aria-pressed="${state.editMode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('');
  return `<div class="page-scroll"><div class="ed-col" style="max-width:760px">
    <div class="ed-head"><div class="ed-head-text"><div class="ed-title">Settings</div><div class="set-desc">Changes apply right away.</div></div></div>
    <section class="sec open"><div class="sec-head"><span class="sec-title">Editing</span></div><div class="sec-body">
      ${row('Edit mode', 'User saves your changes to user.json and leaves the mod’s config.json alone. Author edits config.json (use it for your own mods). New mods open in Author mode.', `<div class="seg seg-sm">${modeSeg}</div>`)}
    </div></section>
    <section class="sec open"><div class="sec-head"><span class="sec-title">Folders</span></div><div class="sec-body">
      ${row('Recent folders', `${plural(state.recent.length, 'folder')} remembered`, state.recent.length ? '<button class="btn btn-quiet btn-sm" data-act="clearRecent">Clear list</button>' : '')}
      ${row('App data', 'Settings, log and the browser profile used by this window.', `<button class="btn btn-quiet btn-sm mono" data-act="reveal" data-path="${esc(state.info.dataDir ?? '')}">${esc(state.info.dataDir ?? '')}</button>`)}
    </div></section>
    <section class="sec open"><div class="sec-head"><span class="sec-title">About</span></div><div class="sec-body">
      ${row('OAR External Tool', `Version ${esc(state.info.version ?? '')} · by Smooth`, '')}
      ${row('Open Animation Replacer', 'Condition names, descriptions and fields come from OAR’s source by Ersh. All credit for OAR goes to them.', '')}
    </div></section>
  </div></div>`;
}
