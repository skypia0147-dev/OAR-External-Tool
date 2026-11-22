// Popovers, dialogs and the Ctrl K palette.
import { esc, ic, plural, basename } from '../core.js';
import { state, currentMod } from '../state.js';

export function overlays() {
  return `${popover()}${dialog()}${palette()}`;
}

// ───────── popovers ─────────

function place(rect, w, h) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = Math.min(rect.left, vw - w - 12);
  let top = rect.bottom + 6;
  if (top + h > vh - 12) top = Math.max(12, rect.top - h - 6);
  left = Math.max(12, left);
  return `left:${left}px;top:${top}px;width:${w}px;max-height:${Math.min(h, vh - 24)}px`;
}

function popover() {
  const p = state.popover;
  if (!p) return '';
  if (p.type === 'picker') return conditionPicker(p);
  if (p.type === 'original') return originalPicker(p);
  if (p.type === 'menu') {
    return `<div class="popover-backdrop" data-act="closePopover"></div><div class="popover popover-menu" style="${place(p.rect, p.width ?? 260, 400)}"><div class="menu">
      ${p.items.map((it) => it === '-' ? '<div class="menu-sep"></div>'
        : `<button class="menu-item ${it.danger ? 'danger' : ''}" data-act="${it.act}" ${Object.entries(it.data ?? {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} ${it.disabled ? 'disabled' : ''}>${it.icon ? ic(it.icon, 15) : ''}<span class="grow">${esc(it.label)}</span>${it.hint ? `<span class="menu-hint">${esc(it.hint)}</span>` : ''}</button>`).join('')}
    </div></div>`;
  }
  return '';
}

/** OAR's ComboFilter: categories, search, description of the highlighted entry. */
function conditionPicker(p) {
  const kind = p.kind;
  const cats = state.schema.categories(kind);
  const q = p.query.trim().toLowerCase();
  let items;
  let catName = p.cat;
  if (q) {
    items = cats.flatMap((c) => c.items).filter((d) => d.name.toLowerCase().includes(q) || (d.desc ?? '').toLowerCase().includes(q));
    items.sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || a.name.localeCompare(b.name));
    catName = null;
  } else {
    const cat = cats.find((c) => c.name === p.cat) ?? cats[0];
    catName = cat.name;
    items = cat.items;
  }
  const hi = Math.min(p.hi ?? 0, Math.max(0, items.length - 1));
  const cur = items[hi];
  const mark = (name) => {
    if (!q) return esc(name);
    const i = name.toLowerCase().indexOf(q);
    return i < 0 ? esc(name) : `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + q.length))}</mark>${esc(name.slice(i + q.length))}`;
  };
  return `<div class="popover-backdrop" data-act="closePopover"></div>
  <div class="popover picker" style="${place(p.rect, 680, 460)};height:460px">
    <div class="picker-search"><label class="field">${ic('search', 15)}<input data-picker-query="1" data-focus="pickerQuery" value="${esc(p.query)}" placeholder="Search ${kind}s" autocomplete="off"></label></div>
    <div class="picker-main">
      <div class="pk-cats">${cats.map((c) => `<a class="pk-cat" data-act="pickerCat" data-cat="${esc(c.name)}" ${c.name === catName ? 'aria-current="true"' : ''}><span class="ell">${esc(c.name)}</span><span class="sb-count">${c.items.length}</span></a>`).join('')}</div>
      <div class="pk-list">${items.length ? items.map((d, i) => `<div class="pk-item" data-act="pickerChoose" data-name="${esc(d.name)}" data-hi="${i}" ${i === hi ? 'aria-selected="true"' : ''}><span class="${d.plugin ? 'custom' : ''}">${mark(d.name)}</span>${d.plugin ? `<span class="hint">${esc(d.plugin.replace(/^Open Animation Replacer - /, ''))}</span>` : ''}</div>`).join('')
        : '<div class="state-empty">No match.</div>'}</div>
      <div class="pk-desc">${cur ? `<b>${esc(cur.name)}</b><span>${esc(cur.desc || 'No description.')}</span>${cur.plugin ? `<span class="tag custom">${esc(cur.plugin)}</span>` : ''}<span class="tag mono">requires ${esc(cur.version)}</span>
        ${cur.components.length ? `<span class="set-desc">${cur.components.map((c) => esc(c.key)).join(' · ')}</span>` : ''}` : ''}</div>
    </div>
    <div class="picker-foot"><span><span class="kbd">↑↓</span> move</span><span><span class="kbd">Enter</span> ${p.replace ? 'replace' : 'add'}</span><span><span class="kbd">Esc</span> close</span><span class="grow"></span><span>Definitions from OAR source + RaySense</span></div>
  </div>`;
}

/** Pick which original animation a dropped file replaces. */
function originalPicker(p) {
  const q = p.query.trim().toLowerCase();
  const counts = state.ws?.replacementCounts(p.project) ?? new Map();
  const vanilla = state.vanilla.get(p.project) ?? [];
  const pool = new Map();
  for (const v of vanilla) pool.set(v.toLowerCase(), { path: v, vanilla: true });
  for (const [k] of counts) if (!pool.has(k)) pool.set(k, { path: k, vanilla: false });
  let list = [...pool.values()];
  if (q) list = list.filter((x) => x.path.toLowerCase().includes(q));
  list.sort((a, b) => (counts.get(b.path.toLowerCase()) ?? 0) - (counts.get(a.path.toLowerCase()) ?? 0) || a.path.localeCompare(b.path));
  const shown = list.slice(0, 200);
  const hi = Math.min(p.hi ?? 0, Math.max(0, shown.length - 1));
  const custom = q && !pool.has(q) && /\.hkx$/i.test(q);
  return `<div class="popover-backdrop" data-act="closePopover"></div>
  <div class="popover am-pick" style="${place(p.rect, 460, 400)}">
    <div class="picker-search"><label class="field">${ic('search', 15)}<input data-original-query="1" data-focus="originalQuery" value="${esc(p.query)}" placeholder="Original animation, e.g. mt_idle" autocomplete="off"></label></div>
    <div class="pk-list">${custom ? `<div class="pk-item" data-act="chooseOriginal" data-path="${esc(p.query.trim())}"><span class="mono">${esc(p.query.trim())}</span><span class="hint">use this path</span></div>` : ''}
      ${shown.map((x, i) => `<div class="pk-item" data-act="chooseOriginal" data-path="${esc(x.path)}" ${i === hi && !custom ? 'aria-selected="true"' : ''}><span class="mono ell">${esc(x.path)}</span><span class="hint">${counts.get(x.path.toLowerCase()) ? `${counts.get(x.path.toLowerCase())} submods use it` : x.vanilla ? 'vanilla' : ''}</span></div>`).join('') || (custom ? '' : '<div class="state-empty">No match. Type a full path ending in .hkx to use it anyway.</div>')}
      ${list.length > shown.length ? `<div class="state-empty">${list.length - shown.length} more — keep typing</div>` : ''}</div>
    <div class="picker-foot"><span>${vanilla.length ? `${plural(vanilla.length, 'vanilla animation')} from <span class="mono">Skyrim - Animations.bsa</span>` : 'Game BSA not found — showing names used by loaded mods'}</span><span class="grow"></span><span><span class="kbd">Enter</span> pick</span></div>
  </div>`;
}

// ───────── dialogs ─────────

function frame(title, desc, body, actions, width = 620) {
  return `<div class="dialog-backdrop" data-act="dialogBackdrop"><div class="dialog" style="width:${width}px" data-stop="1">
    <div class="dialog-head"><div class="dialog-title">${title}</div>${desc ? `<div class="dialog-desc">${desc}</div>` : ''}</div>
    ${body}
    ${state.dialog?.error ? `<div class="dialog-error">${esc(state.dialog.error)}</div>` : ''}
    <div class="dialog-actions">${actions}</div>
  </div></div>`;
}

const field = (label, key, value, ph = '', hint = '', mono = false) =>
  `<label class="dlg-field"><span class="dlg-label">${label}</span><span class="set-input ${mono ? 'mono' : ''}"><input data-dlg="${key}" data-focus="dlg:${key}" value="${esc(value ?? '')}" placeholder="${esc(ph)}"></span>${hint ? `<span class="set-desc">${hint}</span>` : ''}</label>`;
const opt = (on, act, data, title, sub) => `<div class="opt" data-act="${act}" ${data} aria-checked="${on}"><span class="radio"></span><span class="opt-text"><span>${title}</span><span class="set-desc mono">${sub}</span></span></div>`;

function dialog() {
  const d = state.dialog;
  if (!d) return '';
  switch (d.type) {
    case 'newMod': return newModDialog(d);
    case 'newSubmod': return newSubmodDialog(d);
    case 'save': return saveDialog(d);
    case 'confirm': return frame(esc(d.title), d.desc ?? '', '', `${d.alt ? `<button class="btn btn-quiet" data-act="dialogAlt">${esc(d.alt)}</button>` : ''}<button class="btn btn-quiet" data-act="closeDialog">Cancel</button><button class="btn ${d.danger ? 'btn-danger' : 'btn-primary'}" data-act="dialogOk">${esc(d.ok ?? 'OK')}</button>`, 480);
    case 'prompt': return frame(esc(d.title), d.desc ?? '', field(d.label ?? '', 'value', d.value, d.placeholder ?? ''), `<button class="btn btn-quiet" data-act="closeDialog">Cancel</button><button class="btn btn-primary" data-act="dialogOk">${esc(d.ok ?? 'OK')}</button>`, 480);
    default: return '';
  }
}

function newModDialog(d) {
  const target = d.where === 'other' ? d.otherDir : d.modsDir;
  const name = d.name?.trim() || 'New Mod';
  const proj = d.project || 'character';
  const tree = target ? `${esc(target)}\\
└─ <b>${esc(name)}</b>\\
   └─ meshes\\actors\\${esc(proj)}\\animations\\OpenAnimationReplacer\\
      └─ <b>${esc(name)}</b>\\
         └─ <span class="s">config.json</span>   <span class="cm">{ "name", "author", "description" }</span>` : '<span class="cm">Choose where to create the mod.</span>';
  const body = `<div class="dlg-grid">${field('Mod name', 'name', d.name, 'My Animation Mod', 'Also used as the folder name.')}${field('Author', 'author', d.author)}</div>
    ${field('Description', 'description', d.description, 'Optional')}
    <div class="dlg-field"><span class="dlg-label">Create in</span>
      ${d.modsDir ? opt(d.where !== 'other', 'dlgWhere', 'data-where="mo2"', 'Mod Organizer 2 mods folder', `${esc(d.modsDir)}${d.mo2Source ? `  ·  ${esc(d.mo2Source)}` : ''}`) : ''}
      ${opt(d.where === 'other' || !d.modsDir, 'dlgWhere', 'data-where="other"', d.otherDir ? 'Another folder' : 'Another folder…', d.otherDir ? esc(d.otherDir) : 'Vortex staging, a Data folder, or a work folder you zip later')}
    </div>
    <div class="dlg-field"><span class="dlg-label">Behavior project</span>
      <div style="display:flex;align-items:center;gap:10px"><div class="seg seg-sm"><button class="seg-btn" data-act="dlgProject" data-project="character" aria-pressed="${proj === 'character'}">Character (humanoid)</button><button class="seg-btn" data-act="dlgProject" data-project="custom" aria-pressed="${proj !== 'character'}">Creature…</button></div>
      ${proj !== 'character' ? `<span class="set-input w-sm mono"><input data-dlg="project" data-focus="dlg:project" value="${esc(proj === 'custom' ? '' : proj)}" placeholder="e.g. wolf"></span>` : ''}
      <span class="set-desc">Decides <span class="mono">meshes\\actors\\<b>${esc(proj === 'custom' ? '…' : proj)}</b>\\animations</span></span></div>
    </div>
    <div class="dlg-field"><span class="dlg-label">Will be created</span><pre class="code tree-prev">${tree}</pre></div>`;
  return frame('Create new mod', 'Makes the OAR folder structure and the mod’s <span class="mono">config.json</span>. Submods and animations come next.', body,
    `<button class="btn btn-quiet" data-act="closeDialog">Cancel</button><button class="btn btn-primary" data-act="createMod" ${target && d.name?.trim() ? '' : 'disabled'}>${ic('plus', 14)}Create mod</button>`, 660);
}

function newSubmodDialog(d) {
  const mod = currentMod();
  const folder = `${d.priority}_${d.name?.trim() || 'Submod'}`;
  const templates = ['IsSneaking', 'IsWeaponDrawn', 'IsFemale', 'IsInCombat', 'IsRunning', 'IsSprinting'];
  const subs = state.ws?.allSubmods() ?? [];
  const body = `<div class="dlg-grid">${field('Submod name', 'name', d.name, 'Sneak_Idle')}${field('Priority', 'priority', d.priority, '', 'Higher is checked first — across <b>all</b> mods.', true)}</div>
    <div class="dlg-field"><span class="dlg-label">Start from</span>
      ${opt(d.from === 'empty', 'dlgFrom', 'data-from="empty"', 'Empty', 'No conditions, no animations')}
      ${opt(d.from === 'copy', 'dlgFrom', 'data-from="copy"', 'Copy a submod…', 'Conditions and settings from any loaded submod')}
      ${d.from === 'copy' ? `<select class="mini-select" data-dlg="copyId" style="height:34px">${subs.map((s) => `<option value="${s.id}" ${s.id === d.copyId ? 'selected' : ''}>${esc(s.mod.name)} › ${esc(s.name)} (${s.priority})</option>`).join('')}</select>` : ''}
      ${opt(d.from === 'template', 'dlgFrom', 'data-from="template"', 'Template…', templates.join(' · '))}
      ${d.from === 'template' ? `<div class="qs">${templates.map((t) => `<button class="qs-btn" data-act="dlgTemplate" data-name="${t}" aria-pressed="${(d.templates ?? []).includes(t)}">${(d.templates ?? []).includes(t) ? ic('check', 13) : ic('plus', 13)}<span>${t}</span></button>`).join('')}</div>` : ''}
    </div>
    <div class="dlg-field"><span class="dlg-label">Will be created</span>
<pre class="code tree-prev">…\\OpenAnimationReplacer\\${esc(mod?.folder ?? '')}\\
└─ <b>${esc(folder)}</b>\\
   └─ <span class="s">config.json</span>   <span class="cm">{ "name": ${esc(JSON.stringify(d.name?.trim() || 'Submod'))}, "priority": ${esc(d.priority)}, "conditions": [] }</span></pre></div>`;
  return frame('New submod', 'A submod is one set of replacement animations with its own priority and conditions.', body,
    `<button class="btn btn-quiet" data-act="closeDialog">Cancel</button><button class="btn btn-primary" data-act="createSubmod" ${d.name?.trim() && /^-?\d+$/.test(String(d.priority).trim()) ? '' : 'disabled'}>${ic('plus', 14)}Create submod</button>`, 660);
}

function saveDialog(d) {
  const li = (st, a, b) => `<div class="sv-row ${st}"><span class="sv-ic">${st === 'done' ? ic('check', 13, 2.2) : st === 'warn' ? '!' : '+'}</span><span class="grow">${a}</span><span class="set-desc mono ell" style="max-width:50%">${esc(b)}</span></div>`;
  const writes = d.ops.map((o) => o.type === 'copy'
    ? li('', `Copy <span class="mono">${esc(basename(o.src))}</span>`, o.rel)
    : li('', `${o.exists ? 'Update' : 'Create'} <span class="mono">${esc(basename(o.file))}</span>${o.label ? ` — ${esc(o.label)}` : ''}`, o.short)).join('');
  const checks = d.checks.map((c) => li(c.level === 'ok' ? 'done' : 'warn', esc(c.text), c.sub ?? '')).join('');
  const body = `<div class="sv-list">
      <div class="sv-group">Will be written</div>${writes}
      ${checks ? `<div class="sv-group">Checks</div>${checks}` : ''}
    </div>
    ${d.after ? `<div class="next-box"><b>After saving</b>${d.after.map((a) => `<span>${a}</span>`).join('')}</div>` : ''}`;
  const n = d.ops.length;
  return frame('Save to disk', `Review what will be written (${state.editMode === 'author' ? 'Author mode — config.json' : 'User mode — user.json'}).`, body,
    `<button class="btn btn-quiet" data-act="closeDialog">Cancel</button><button class="btn btn-primary" data-act="confirmSave" ${d.blocked ? 'disabled' : ''}>${ic('save', 14)}Write ${plural(n, 'file')}</button>`, 700);
}

// ───────── Ctrl K ─────────

function palette() {
  const p = state.palette;
  if (!p) return '';
  const q = p.query.trim().toLowerCase();
  const results = [];
  if (state.ws) {
    for (const m of state.ws.mods) {
      if (!q || m.name.toLowerCase().includes(q)) results.push({ act: 'openMod', id: m.id, label: m.name, hint: `${m.submods.length} submods` });
      for (const s of m.submods) if (q && (s.name.toLowerCase().includes(q) || String(s.priority) === q)) results.push({ act: 'openSubmod', id: s.id, label: s.name, hint: `${m.name} · ${s.priority}` });
    }
  }
  const cmds = [
    { act: 'openFolder', label: 'Open folder…', hint: 'command' },
    { act: 'newMod', label: 'Create new mod', hint: 'command' },
    { act: 'nav', view: 'problems', label: 'Problems', hint: 'command' },
    { act: 'nav', view: 'settings', label: 'Settings', hint: 'command' },
  ].filter((c) => !q || c.label.toLowerCase().includes(q));
  const all = [...results.slice(0, 60), ...cmds];
  const hi = Math.min(p.hi ?? 0, Math.max(0, all.length - 1));
  return `<div class="dialog-backdrop" data-act="closePalette" style="padding-top:10vh"><div class="palette popover" data-stop="1">
    <div class="picker-search"><label class="field">${ic('search', 15)}<input data-palette="1" data-focus="palette" value="${esc(p.query)}" placeholder="Search mods, submods or commands" autocomplete="off"></label></div>
    <div class="pk-list" style="max-height:420px">${all.map((r, i) => `<div class="pk-item" data-act="${r.act}" ${r.id ? `data-id="${r.id}"` : ''} ${r.view ? `data-view="${r.view}"` : ''} data-palette-item="1" ${i === hi ? 'aria-selected="true"' : ''}><span class="ell">${esc(r.label)}</span><span class="hint">${esc(r.hint)}</span></div>`).join('') || '<div class="state-empty">No match.</div>'}</div>
  </div></div>`;
}
