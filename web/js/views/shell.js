// Window frame: title bar, sidebar, breadcrumb toolbar, save bar, toasts.
import { esc, ic, plural } from '../core.js';
import { state, currentMod, currentSubmod } from '../state.js';

export function titlebar() {
  const b = (k, label, cls = '') =>
    `<button class="seg-btn ${cls}" data-act="setEditMode" data-mode="${k}" aria-pressed="${state.editMode === k}" title="${modeHelp(k)}">${label}</button>`;
  return `<header class="titlebar">
    <div class="tb-left"><button class="icon-btn" data-act="toggleSidebar" title="Toggle sidebar">${ic('menu')}</button><span class="tb-name">OAR External Tool</span></div>
    <div class="tb-center"><button class="tb-search" data-act="openPalette">${ic('search', 15)}<span class="grow ell">Search mods, submods or conditions</span><span class="kbd">Ctrl K</span></button></div>
    <div class="tb-right"><div class="tb-mode">Edit mode<div class="seg seg-filled seg-sm">${b('inspect', 'Inspect')}${b('user', 'User')}${b('author', 'Author', 'author')}</div></div></div>
    <div class="win-ctrls">
      <button class="win-btn" data-act="window" data-action="minimize" title="Minimize">${ic('minimize')}</button>
      <button class="win-btn" data-act="window" data-action="toggleMaximize" title="Maximize">${ic('maximize')}</button>
      <button class="win-btn close" data-act="window" data-action="close" title="Close">${ic('close')}</button>
    </div>
  </header>`;
}

export function modeHelp(k) {
  return {
    inspect: 'Read only',
    user: 'Saves your changes to user.json next to the original. The original config.json is not touched.',
    author: 'Edits the original config.json files (for your own mods).',
  }[k];
}

export function sidebar() {
  const ws = state.ws;
  const nav = (view, icon, label, extra = '') =>
    `<a class="sb-nav-item" data-act="nav" data-view="${view}" ${navCurrent(view) ? 'aria-current="page"' : ''}>${ic(icon)}<span class="grow nw">${label}</span>${extra}</a>`;
  const problems = ws ? ws.problems().filter((p) => p.level !== 'info').length : 0;
  let mods = '<div class="state-empty">No folder open yet.</div>';
  const usesMo2 = !!ws?.mo2Usable;
  const onlyOn = usesMo2 && !!ws.mo2Profile && state.mo2Filter === 'on';
  if (ws) {
    const shown = ws.mods.filter((m) => !onlyOn || m.loaded || m.id === state.modId || m.isNew || m.id === state.setupModId);
    const legacyOn = (l) => !onlyOn || !l.managerMod || ws.mo2Order?.get(l.managerMod.toLowerCase())?.on;
    mods = ws.mods.length
      ? shown.map((m) => {
        const cur = m.id === state.modId && (state.view === 'mod' || state.view === 'submod');
        const mo2 = m.mo2;
        const off = mo2 && mo2 !== 'on';
        const tip = m.managerMod ? `${m.managerMod} › ${m.name}` : m.name;
        return `<a class="sb-row ${off ? 'mo2-off' : ''}" data-act="openMod" data-id="${m.id}" ${cur ? 'aria-current="true"' : ''} title="${esc(off ? `${tip}\n${mo2Reason(m)}` : tip)}">
          <span class="ell">${esc(m.name)}</span>${m.dirty ? '<span class="mk-dirty">*</span>' : ''}${m.isNew || m.id === state.setupModId ? '<span class="sb-new-tag">new</span>' : ''}${off ? `<span class="mo2-tag">${mo2 === 'hidden' ? 'hidden' : 'off'}</span>` : ''}<span class="sb-count">${m.submods.length}</span></a>`;
      }).join('') + ws.legacy.filter(legacyOn).map((l) => `<a class="sb-row legacy" title="DAR (legacy) — not editable here"><span class="ell">${esc(l.managerMod ?? 'DAR mod')}</span><span class="sb-count">legacy</span></a>`).join('')
      : '<div class="state-empty">No OAR mods in this folder.</div>';
  }
  const head = usesMo2 && ws.mo2Profile
    ? `<div class="sb-section-head"><span class="grow">Mods</span><div class="seg seg-sm mo2-seg"><button class="seg-btn" data-act="setMo2Filter" data-v="on" aria-pressed="${onlyOn}" title="Only mods ticked in MO2">On</button><button class="seg-btn" data-act="setMo2Filter" data-v="all" aria-pressed="${!onlyOn}">All</button></div></div>`
    : `<div class="sb-section-head"><span class="grow">Mods${ws ? ` · ${ws.mods.length}` : ''}</span>${ws ? '<button class="sb-section-action" data-act="openFolder">Open…</button>' : ''}</div>`;
  return `<aside class="sidebar">
    <button class="sb-new" data-act="newMenu" title="New mod / open folder">${ic('plus', 18)}</button>
    <nav class="sb-nav">
      ${nav('mods', 'library', 'Replacer Mods')}
      ${nav('problems', 'info', 'Problems', problems ? `<span class="sb-badge">${problems}</span>` : '')}
      ${nav('settings', 'settings', 'Settings')}
    </nav>
    ${usesMo2 ? `<div class="mo2-wrap"><div class="mo2-box">
        <button class="mo2-profile" data-act="mo2Menu" title="MO2 profile used to tell which mods are on (read only — this tool never changes modlist.txt)"><span class="mo2-logo">MO2</span><span class="grow ell">${esc(ws.mo2Profile ?? 'Not used')}</span>${ic('chevronDown', 15)}</button>
        <div class="mo2-sub">${ws.mo2Profile ? `${ws.mods.filter((m) => m.loaded).length} of ${ws.mods.length} OAR mods on` : 'Every mod counts as on'}</div>
      </div>${ws.mo2Profile ? head : ''}</div>` : ''}
    <div class="sb-sections ${usesMo2 ? 'with-mo2' : ''}">
      <div class="sb-section">
        ${usesMo2 && ws.mo2Profile ? '' : head}
        ${mods}
      </div>
    </div>
    <div class="sb-foot">
      ${ws ? `<button class="sb-status" data-act="reveal" data-path="${esc(ws.root)}" title="${esc(ws.root)}"><span class="dot dot-success"></span><span class="ell mono">${esc(ws.root)}</span></button>`
        : '<div class="sb-status"><span class="dot dot-info"></span>No folder</div>'}
      ${usesMo2 && ws.mo2Profile ? `<button class="sb-status" data-act="reveal" data-path="${esc(`${ws.mo2.profilesDir}\\${ws.mo2Profile}\\modlist.txt`)}" title="Read from ${esc(`${ws.mo2.profilesDir}\\${ws.mo2Profile}\\modlist.txt`)}"><span class="mo2-logo sm">MO2</span><span class="ell">${esc(ws.mo2Profile)} · read modlist.txt</span></button>` : ''}
    </div>
  </aside>`;
}

/** Why OAR won't load this mod with the selected MO2 profile (one line, English UI). */
export function mo2Reason(m) {
  const p = m.ws.mo2Profile;
  if (m.mo2 === 'off') return `Off in MO2 — unticked in the ${p} profile, so OAR doesn't load it in game.`;
  if (m.mo2 === 'missing') return `Not in the ${p} profile yet — refresh MO2 (F5) and tick it.`;
  if (m.mo2 === 'hidden') return `Hidden in MO2 — ${m.mo2HiddenBy?.managerMod ?? 'another mod'} has the same OAR folder and a higher MO2 priority, so the game sees that copy.`;
  return '';
}

/** Band at the top of a mod/submod page when MO2 doesn't load the mod. Editing stays possible. */
export function mo2Banner(mod) {
  const s = mod.mo2;
  if (!s || s === 'on') return '';
  const title = { off: 'Off in MO2', missing: 'Not in MO2 yet', hidden: 'Hidden in MO2' }[s];
  const p = esc(mod.ws.mo2Profile);
  const why = {
    off: `<span class="mono">${esc(mod.managerMod)}</span> is unticked in the ${p} profile, so OAR doesn't load it in game.`,
    missing: `<span class="mono">${esc(mod.managerMod)}</span> isn't in the ${p} profile's mod list yet. Press F5 in MO2, then tick it.`,
    hidden: `<span class="mono">${esc(mod.mo2HiddenBy?.managerMod ?? '')}</span> has the same OAR folder and a higher MO2 priority, so the game sees that copy instead of this one.`,
  }[s];
  return `<div class="mo2-banner">${ic('info', 15)}<div class="grow"><b>${title}</b> — ${why}
    <div class="set-desc">You can still edit and save it. Its submods are left out of priority conflicts and Problems.</div></div></div>`;
}

/** OAR saved in-game settings into MO2's overwrite folder for this mod/submod; in game they win. */
export function overwriteNotice(ow, what) {
  if (!ow) return '';
  return `<div class="warn-box">${ic('info', 15)}<span class="grow"><b>In-game settings in MO2 overwrite</b> — OAR saved this ${what}'s settings to
    <span class="mono" title="${esc(ow.path)}">${esc(ow.shown)}</span>. In game that file wins over what this tool edits here. Delete or move it in MO2's Overwrite to use these settings.</span>
    <button class="btn btn-quiet btn-sm" data-act="reveal" data-path="${esc(ow.path)}">${ic('reveal', 14)}Show</button></div>`;
}

function navCurrent(view) {
  if (view === 'mods') return ['start', 'mod', 'submod'].includes(state.view);
  return state.view === view;
}

export function toolbar(findPh = 'Filter submods') {
  const ws = state.ws;
  const mod = currentMod();
  const sub = state.view === 'submod' ? currentSubmod() : null;
  const crumbs = [[esc(ws ? shortRoot(ws.root) : ''), 'nav', 'data-view="mods"']];
  if (mod) crumbs.push([esc(mod.name), 'openMod', `data-id="${mod.id}"`]);
  if (sub) crumbs.push([esc(sub.name), 'noop', '']);
  const parts = crumbs.map(([label, act, attrs], i) =>
    `${i ? `<span class="addr-sep">${ic('chevronRight', 14)}</span>` : ''}<button class="addr-part ${i === crumbs.length - 1 ? 'current' : ''}" data-act="${act}" ${attrs}>${label}</button>`).join('');
  return `<div class="oar-toolbar">
    <div class="addr">${ic('folder', 15)}${parts}</div>
    <label class="find-box">${ic('search', 14)}<input data-bind-ui="smFilter" data-focus="smFilter" placeholder="${findPh}" value="${esc(state.smFilter)}"></label>
    <button class="nav-btn" data-act="togglePanel" title="Info panel" aria-pressed="${state.panel}">${ic('panel')}</button>
  </div>`;
}

function shortRoot(root) {
  const parts = root.split('\\').filter(Boolean);
  return parts.length > 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : root;
}

export function savebar() {
  const ws = state.ws;
  if (!ws) return '';
  const dirtySubs = ws.allSubmods().filter((s) => s.dirty);
  const dirtyMods = ws.mods.filter((m) => m.ownDirty);
  const files = dirtySubs.reduce((n, s) => n + s.pendingFiles.length, 0);
  const n = dirtySubs.length + dirtyMods.length;
  const sub = currentSubmod();
  const canSave = n > 0 && state.editMode !== 'inspect';
  const where = state.editMode === 'author' ? 'config.json' : 'user.json';
  const summary = n === 0 ? 'All changes saved'
    : `${plural(n, 'unsaved config')}${files ? `, ${plural(files, 'file')} to copy` : ''}`;
  const names = [...dirtyMods.map((m) => m.name), ...dirtySubs.map((s) => s.name)].slice(0, 3).join(', ');
  return `<div class="savebar">
    <span class="state">${n ? '<span class="dot"></span>' : '<span class="dot dot-success"></span>'}${summary}${n ? ` <small>· ${esc(names)}${dirtySubs.length + dirtyMods.length > 3 ? '…' : ''}</small>` : ''}</span>
    <span class="grow"></span>
    ${state.editMode === 'inspect' && n ? '<span class="set-desc">Switch to User or Author mode to save.</span>' : ''}
    ${n ? '<button class="btn btn-quiet" data-act="discardAll">Discard</button>' : ''}
    ${sub && state.view === 'submod' ? `<button class="btn btn-quiet" data-act="reloadSubmod" title="Read this submod again from disk">${ic('refresh', 14)}Reload from disk</button>` : ''}
    ${sub && state.view === 'submod' && sub.userDoc ? '<button class="btn btn-quiet" data-act="deleteUserConfig" title="Move user.json to the Recycle Bin">Delete user config</button>' : ''}
    <button class="btn btn-primary" data-act="save" ${canSave ? '' : 'disabled'} title="Writes ${where}">${ic('save', 14)}${state.editMode === 'author' ? 'Save config' : 'Save user config'}<span class="kbd">Ctrl S</span></button>
  </div>`;
}

export function toasts() {
  if (!state.toasts.length) return '';
  return `<div class="toast-stack">${state.toasts.map((t) => `<div class="toast ${t.level === 'error' ? 'error' : ''}">
    <span class="dot ${t.level === 'error' ? 'dot-error' : t.level === 'warn' ? 'dot-warn' : 'dot-success'}"></span>
    <div class="toast-body grow"><span>${esc(t.text)}</span>${t.sub ? `<span class="toast-sub">${esc(t.sub)}</span>` : ''}</div></div>`).join('')}</div>`;
}
