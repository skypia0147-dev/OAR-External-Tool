// Submod list (left column) + submod editor (OAR order: settings → animation files → conditions → functions).
import { esc, ic, plural, idOf } from '../core.js';
import { state, currentMod, currentSubmod, canEdit } from '../state.js';
import { renderList } from './tree.js';
import { FUNCTION_SETS, targetOf, isVariant } from '../model/workspace.js';
import { stringify } from '../model/json.js';
import { nameOf } from '../model/schema.js';

export function submodList(mod) {
  const q = state.smFilter.trim().toLowerCase();
  const subs = mod.sortedSubmods().filter((s) => !q || s.name.toLowerCase().includes(q) || String(s.priority).includes(q));
  const rows = subs.map((s) => {
    const sel = s.id === state.submodId && state.view === 'submod';
    const n = s.doc.conditions?.length ?? 0;
    const anims = s.animationTargets().length;
    return `<div class="sm-row ${s.disabled ? 'disabled' : ''}" data-act="openSubmod" data-id="${s.id}" ${sel ? 'aria-selected="true"' : ''}>
      <span class="cb" role="checkbox" aria-checked="${!s.disabled}" ${canEdit('settings') ? `data-act="toggleSubmodDisabled" data-id="${s.id}"` : ''} title="Enable / disable this submod"></span>
      <span class="sm-text">
        <span class="sm-name"><span class="ell">${esc(s.name)}</span>${s.dirty ? '<span class="mk-dirty">*</span>' : ''}${s.userDoc ? '<span class="mk-user">(User)</span>' : ''}${s.unreadable ? '<span class="mk-invalid">!</span>' : ''}</span>
        <span class="sm-meta"><span class="sm-pri">${s.priority}</span>· ${n} cond · ${anims} anim</span>
      </span>
    </div>`;
  }).join('');
  return `<div class="sm-list">
    <div class="sm-head"><b>Submods</b><span>${mod.submods.length}</span><span class="grow"></span>
      ${canEdit('settings') ? `<button class="nav-btn" data-act="newSubmod" title="New submod">${ic('plus', 15)}</button>` : ''}</div>
    <div class="sm-rows">${rows || '<div class="state-empty">No submods.</div>'}</div>
  </div>`;
}

export function setupCard(mod) {
  if (state.setupModId !== mod.id) return '';
  const subs = mod.submods;
  const steps = [
    ['Create mod', true],
    ['Add submod', subs.length > 0],
    ['Add animations', subs.some((s) => s.files.length || s.pendingFiles.length)],
    ['Add conditions', subs.some((s) => (s.doc.conditions?.length ?? 0) > 0)],
    ['Save to disk', subs.length > 0 && !mod.dirty && subs.some((s) => s.files.length)],
  ];
  const active = steps.findIndex(([, done]) => !done);
  const html = steps.map(([label, done], i) => {
    const st = done ? 'done' : i === active ? 'now' : '';
    return `<div class="stp ${st}"><span class="stp-dot">${done ? ic('check', 12, 2.4) : i + 1}</span><span>${label}</span></div>${i < steps.length - 1 ? '<span class="stp-line"></span>' : ''}`;
  }).join('');
  return `<div class="setup"><div class="setup-head"><b>New mod setup</b><span class="set-desc">${active < 0 ? 'All done — the mod is ready.' : 'This card goes away after the first save.'}</span><span class="grow"></span><button class="link-quiet" data-act="hideSetup">Hide</button></div><div class="stps">${html}</div></div>`;
}

function head(sub) {
  const chips = [];
  if (state.editMode === 'author') chips.push('<span class="tag">Author mode · config.json</span>');
  else if (sub.userDoc) chips.push('<span class="tag user">User config · user.json</span>');
  else chips.push('<span class="tag">config.json</span>');
  if (state.editMode === 'author' && sub.userDoc) chips.push('<span class="tag dirty" title="OAR loads user.json instead of config.json for this submod">user.json overrides this in game</span>');
  if (sub.dirty) chips.push(`<span class="tag dirty">Unsaved${sub.pendingFiles.length ? `: ${plural(sub.pendingFiles.length, 'file')}` : ''}</span>`);
  const plugins = new Set();
  const walk = (list) => (list ?? []).forEach((o) => {
    if (o?.requiredPlugin) plugins.add(o.requiredPlugin);
    for (const v of Object.values(o ?? {})) if (Array.isArray(v)) walk(v.filter((x) => x && typeof x === 'object'));
  });
  walk(sub.doc.conditions);
  for (const p of plugins) chips.push(`<span class="tag custom">Needs: ${esc(p)}</span>`);
  const rel = sub.path.slice(sub.path.toLowerCase().indexOf('\\openanimationreplacer\\') + 1);
  return `<div class="ed-head">
    <div class="ed-head-text">
      <div class="ed-title"><span class="ell">${esc(sub.name)}</span>${sub.dirty ? '<span class="mk-dirty">*</span>' : ''}</div>
      <button class="ed-path" data-act="reveal" data-path="${esc(sub.path)}" title="Show in Explorer">${esc(rel)}</button>
      <div class="ed-chips">${chips.join('')}</div>
    </div>
    <div class="ed-head-actions">
      <div class="seg seg-sm"><button class="seg-btn" data-act="setEdView" data-v="editor" aria-pressed="${state.edView === 'editor'}">Editor</button><button class="seg-btn" data-act="setEdView" data-v="json" aria-pressed="${state.edView === 'json'}">JSON</button></div>
      <span class="en-label">Enabled <span class="toggle" role="switch" aria-checked="${!sub.disabled}" ${canEdit('settings') ? `data-act="toggleSubmodDisabled" data-id="${sub.id}"` : ''}></span></span>
      <button class="icon-btn" data-act="copySubmodJson" title="Copy submod config to clipboard">${ic('copy')}</button>
    </div>
  </div>`;
}

function sec(key, title, count, summary, body, extraHead = '') {
  const open = state.sec[key];
  return `<section class="sec ${open ? 'open' : ''}">
    <div class="sec-head" data-act="toggleSec" data-sec="${key}"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">${title}</span>${count !== null ? `<span class="sec-count">${count}</span>` : ''}<span class="sec-summary">${summary}</span>${extraHead}</div>
    <div class="sec-body">${open ? body : ''}</div>
  </section>`;
}

// ───────── settings ─────────

const SETTING_HELP = {
  overrideAnimationsFolder: 'If set, this submod will load animations from the given folder (in the parent directory) instead of its own folder.',
  requiredBehaviorProjectName: 'If set, this submod will only load for the specified project name. Leave empty to load for all projects.',
  ignoreDontConvertAnnotationsToTriggersFlag: 'Annotations inside the replacer animation file run even on clips that have the vanilla "Don\'t convert annotations to triggers" flag.',
  triggersFromAnnotationsOnly: 'Triggers baked into the behavior clips are ignored; only annotations inside the animation file run.',
  interruptible: 'Conditions are checked every frame and the clip is switched if needed. Mostly useful for looping animations.',
  replaceOnLoop: 'Conditions are re-evaluated on animation loop. Enabled by default.',
  replaceOnEcho: 'Conditions are re-evaluated on animation echo. Disabled by default — enable only on animations that need it.',
  runFunctionsOnLoop: 'OnDeactivate/OnActivate functions run when the clip loops. Enabled by default.',
  runFunctionsOnEcho: 'OnDeactivate/OnActivate functions run on clip echo. Enabled by default.',
};

function settingsSection(sub) {
  const d = sub.doc;
  const ed = canEdit('settings');
  const row = (label, help, ctl, dim) => `<div class="set-row ${dim ? 'dim' : ''}"><div class="set-row-text"><span>${label}</span>${help ? `<span class="set-desc">${help}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  const text = (key, w, ph, field = key, mono = false) => {
    const editable = canEdit(field);
    return `<label class="set-input ${w} ${mono ? 'mono' : ''} ${editable ? '' : 'readonly'}"><input data-sub="${key}" data-focus="sub:${key}" value="${esc(d[key] ?? '')}" placeholder="${ph}" ${editable ? '' : 'readonly'}>${editable ? '' : ic('lock', 13)}</label>`;
  };
  const bool = (key, def) => `<span class="toggle" role="switch" aria-checked="${d[key] ?? def}" ${ed ? `data-act="toggleSetting" data-key="${key}" data-default="${def}"` : ''}></span>`;
  const blend = (flag, key, parentOn) => `${bool(flag, false)}<label class="set-input w-sm ${d[flag] && parentOn ? '' : 'faded'}"><input type="number" step="0.01" min="0" max="1" data-sub="${key}" data-num="1" data-focus="sub:${key}" value="${d[key] ?? 0}" ${ed && d[flag] ? '' : 'disabled'}><span class="unit">s</span></label>`;
  const on = (key, def) => d[key] ?? def;
  const summary = `<span class="tag mono">Priority ${sub.priority}</span><span class="tag">Interruptible · ${on('interruptible', false) ? 'on' : 'off'}</span><span class="tag">Replace on loop · ${on('replaceOnLoop', true) ? 'on' : 'off'}</span><span class="tag">Replace on echo · ${on('replaceOnEcho', false) ? 'on' : 'off'}</span>`;
  const body = `
    ${row('Submod name', state.editMode === 'author' ? '' : 'Author mode only', text('name', 'w-lg', '', 'name'))}
    ${row('Description', state.editMode === 'author' ? '' : 'Author mode only', text('description', 'w-lg', 'No description', 'description'))}
    ${row('Priority', 'Higher is checked first — across all mods.', `<label class="set-input w-md mono"><input type="number" step="1" data-sub="priority" data-num="int" data-focus="sub:priority" value="${sub.priority}" ${ed ? '' : 'readonly'}></label>`)}
    ${row('Override animations folder', SETTING_HELP.overrideAnimationsFolder, text('overrideAnimationsFolder', 'w-md', 'Not set'))}
    ${row('Required project name', SETTING_HELP.requiredBehaviorProjectName, text('requiredBehaviorProjectName', 'w-md', 'All projects'))}
    ${row('Ignore “Don’t Convert Annotations To Triggers” flag', SETTING_HELP.ignoreDontConvertAnnotationsToTriggersFlag, bool('ignoreDontConvertAnnotationsToTriggersFlag', false))}
    ${row('Only use triggers from annotations', SETTING_HELP.triggersFromAnnotationsOnly, bool('triggersFromAnnotationsOnly', false))}
    ${row('Interruptible', SETTING_HELP.interruptible, bool('interruptible', false))}
    ${row('Custom blend time on interrupt', '', blend('hasCustomBlendTimeOnInterrupt', 'blendTimeOnInterrupt', on('interruptible', false)), !on('interruptible', false))}
    ${row('Replace on loop', SETTING_HELP.replaceOnLoop, bool('replaceOnLoop', true))}
    ${row('Custom blend time on loop', '', blend('hasCustomBlendTimeOnLoop', 'blendTimeOnLoop', on('replaceOnLoop', true)), !on('replaceOnLoop', true))}
    ${row('Replace on echo', SETTING_HELP.replaceOnEcho, bool('replaceOnEcho', false))}
    ${row('Custom blend time on echo', '', blend('hasCustomBlendTimeOnEcho', 'blendTimeOnEcho', on('replaceOnEcho', false)), !on('replaceOnEcho', false))}
    ${row('Run functions on loop', SETTING_HELP.runFunctionsOnLoop, bool('runFunctionsOnLoop', true))}
    ${row('Run functions on echo', SETTING_HELP.runFunctionsOnEcho, bool('runFunctionsOnEcho', true))}`;
  return sec('settings', 'Submod settings', null, summary, body);
}

// ───────── animation files ─────────

function filesSection(sub) {
  const ed = canEdit('files');
  const existing = sub.files.map((f) => ({ rel: f, src: null }));
  const pending = sub.pendingFiles.map((p) => ({ rel: p.rel, src: p.src, pending: p }));
  const all = [...existing, ...pending];
  const targets = new Map();
  for (const f of all) {
    const t = targetOf(f.rel);
    if (!targets.has(t)) targets.set(t, []);
    targets.get(t).push(f);
  }
  const summary = [...targets.entries()].slice(0, 4).map(([t, fs]) => `<span class="tag mono">${esc(t)}${fs.length > 1 ? ` × ${fs.length} variants` : ''}</span>`).join('') + (targets.size > 4 ? `<span class="tag">+${targets.size - 4}</span>` : '');
  const rows = all.map((f) => {
    const t = targetOf(f.rel);
    const sel = state.selId === `anim:${t}`;
    const variant = isVariant(f.rel);
    if (f.pending) {
      const p = f.pending;
      return `<div class="am-row pending" data-act="selectAnim" data-target="${esc(t)}" ${sel ? 'aria-selected="true"' : ''}>
        <span class="am-src"><span class="ell">${esc(p.src.split('\\').pop())}</span><span class="set-desc mono ell">${esc(p.src.slice(0, p.src.lastIndexOf('\\')))}</span></span>
        <span class="am-arrow">${ic('chevronRight', 14)}</span>
        <span class="am-rep"><button class="mini-select ${p.target ? '' : 'needs'}" data-act="pickOriginal" data-src="${esc(p.src)}"><span class="mono">${esc(p.target || 'Choose original…')}</span>${ic('chevronDown', 13)}</button>${variant ? '<span class="tag">variant</span>' : ''}</span>
        <span class="am-out mono ell" title="${esc(p.rel)}">${p.target ? esc(p.rel) : '—'}</span>
        <button class="icon-btn" style="width:26px;height:26px" data-act="removePending" data-src="${esc(p.src)}" title="Remove">${ic('x', 14)}</button>
      </div>`;
    }
    return `<div class="am-row" data-act="selectAnim" data-target="${esc(t)}" ${sel ? 'aria-selected="true"' : ''}>
      <span class="am-src"><span class="ell mono">${esc(f.rel.split('\\').pop())}</span><span class="set-desc">in submod</span></span>
      <span class="am-arrow">${ic('chevronRight', 14)}</span>
      <span class="am-rep"><span class="mono am-target">${esc(t)}</span>${variant ? '<span class="tag">variant</span>' : ''}</span>
      <span class="am-out mono ell" title="${esc(f.rel)}">${esc(f.rel)}</span>
      <span></span>
    </div>`;
  }).join('');
  const body = `
    ${ed ? `<div class="am-drop" data-drop="files">${ic('upload', 16)}<span>Drop <span class="mono">.hkx</span> files or a folder here</span><span class="grow"></span><button class="btn btn-secondary btn-sm" data-act="browseFiles">Browse…</button></div>` : ''}
    ${all.length ? `<div class="am-head"><span>${pending.length ? 'Your file' : 'File'}</span><span></span><span>Replaces (original animation)</span><span>Saved in the submod as</span><span></span></div>${rows}` : '<div class="empty-line">No animation files in this submod yet.</div>'}
    ${pending.length ? `<div class="am-note">${ic('info', 14)}<span>Two files picked for the same animation become <b>variants</b> automatically — OAR picks one at random. Files are copied into the submod folder when you save.</span></div>` : ''}`;
  return sec('files', 'Animation files', targets.size, summary, body);
}

// ───────── conditions / functions ─────────

function treeCtx(sub) {
  return { editable: canEdit('conditions'), presets: (sub.mod.doc.conditionPresets ?? []).map((p) => p.name), owner: sub };
}

function conditionsSection(sub) {
  const list = sub.doc.conditions;
  const ctx = treeCtx(sub);
  const summary = list.slice(0, 3).map((c) => `<span class="tag ${c.requiredPlugin ? 'custom' : ''}">${c.negated ? 'NOT ' : ''}${esc(nameOf(c))}</span>`).join('') + (list.length > 3 ? `<span class="tag">+${list.length - 3}</span>` : '');
  const empty = list.length === 0 ? emptyConditions(sub, ctx) : '';
  const body = `<div class="cond-bar">
      ${ctx.editable ? `<button class="btn btn-secondary btn-sm" data-act="openPicker" data-list="${listIdFor(list)}" data-kind="condition">${ic('plus', 14)}Add condition</button>` : ''}
      <button class="btn btn-quiet btn-sm" data-act="conditionSetMenu">Condition set ${ic('chevronDown', 13)}</button>
      <span class="grow"></span>
      ${list.length ? `<button class="btn btn-quiet btn-sm" data-act="expandAll">${ic('chevronDown', 13)}Expand all</button><button class="btn btn-quiet btn-sm" data-act="collapseAll">${ic('chevronUp', 13)}Collapse all</button>` : ''}
    </div>
    ${empty || `<div class="cond-cols"><span>Condition</span><span>Argument</span></div><div class="tree">${renderList(list, 'condition', ctx)}</div>`}`;
  return sec('conditions', 'Conditions', list.length, summary, body);
}

function listIdFor(list) { return idOf(list); }

function emptyConditions(sub, ctx) {
  // keep the list registered so "Add condition" works
  renderList(sub.doc.conditions, 'condition', ctx);
  const quick = ['IsSneaking', 'IsWeaponDrawn', 'IsEquippedType', 'IsFemale', 'IsInCombat'];
  return `<div class="cond-empty">
    <div class="cond-empty-title">No conditions yet</div>
    <div class="set-desc" style="font-size:12.5px">Without conditions this submod always replaces its animations — unless a higher-priority submod matches first.</div>
    ${ctx.editable ? `<div class="set-desc" style="margin-top:12px">Quick start</div>
    <div class="qs">${quick.map((n) => `<button class="qs-btn" data-act="quickAdd" data-name="${n}">${ic('plus', 13)}<span>${n}</span></button>`).join('')}</div>
    <div class="set-desc" style="margin-top:4px">Or copy conditions from another submod: open it, <span class="kbd">Condition set</span> › Copy, then Paste here.</div>` : ''}
  </div>`;
}

function pairedSection(sub) {
  if (!Array.isArray(sub.doc.pairedConditions)) return '';
  const ctx = treeCtx(sub);
  return sec('paired', 'Paired conditions', sub.doc.pairedConditions.length, '', `<div class="set-desc" style="padding:10px 16px 0">Evaluated on the other actor of a paired animation.</div><div class="tree">${renderList(sub.doc.pairedConditions, 'condition', ctx)}</div>`);
}

function functionsSection(sub) {
  const ctx = treeCtx(sub);
  const total = FUNCTION_SETS.reduce((n, [k]) => n + (sub.doc[k]?.length ?? 0), 0);
  const summary = FUNCTION_SETS.map(([k, label]) => `<span class="tag">${label} · ${sub.doc[k]?.length ?? 0}</span>`).join('');
  const body = FUNCTION_SETS.map(([k, label]) => {
    const ensure = () => { if (!Array.isArray(sub.doc[k])) sub.doc[k] = []; return sub.doc[k]; };
    return `<div class="fn-set"><div class="kids-label" style="margin:10px 14px 0">${label}</div><div class="tree">${renderList(sub.doc[k], 'function', ctx, 0, ensure)}</div></div>`;
  }).join('');
  return sec('functions', 'Functions', total, summary, body);
}

// ───────── JSON view ─────────

function jsonView(sub) {
  const text = state.jsonDraft ?? stringify(sub.doc, { newline: '\n', indent: '    ' });
  const ed = canEdit('conditions');
  return `<section class="sec open"><div class="sec-head"><span class="sec-title">${state.editMode === 'author' || !sub.userDoc ? 'config.json' : 'user.json'}</span><span class="sec-count">${text.split('\n').length} lines</span><span class="grow"></span>
      <button class="btn btn-quiet btn-sm" data-act="copyJson">${ic('copy', 13)}Copy</button>
      ${ed ? `<button class="btn btn-secondary btn-sm" data-act="applyJson" ${state.jsonDraft == null ? 'disabled' : ''}>Apply</button>` : ''}</div>
    <div class="sec-body json-wrap" style="display:block"><textarea class="json-edit" spellcheck="false" data-json-draft="1" data-focus="jsonDraft" ${ed ? '' : 'readonly'}>${esc(text)}</textarea></div></section>`;
}

export function submodEditor(sub) {
  if (sub.unreadable) {
    const p = sub.problems.find((x) => x.kind === 'unreadable');
    return `<div class="ed"><div class="ed-col">${head(sub)}<div class="warn-box">${ic('warn', 15)}<span><b>This config can't be read.</b> ${esc(p.text)}<br>Fix it in a text editor (it's shown below), then use Reload from disk.</span></div>
      <pre class="code">${esc(sub.userText ?? sub.configText ?? '')}</pre></div></div>`;
  }
  const body = state.edView === 'json'
    ? jsonView(sub)
    : `${settingsSection(sub)}${filesSection(sub)}${conditionsSection(sub)}${pairedSection(sub)}${functionsSection(sub)}`;
  return `<div class="ed"><div class="ed-col">${setupCard(sub.mod)}${head(sub)}${body}</div></div>`;
}
