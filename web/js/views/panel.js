// Right panel: details of the selected condition/function, or of a replaced animation.
import { esc, ic, plural } from '../core.js';
import { state, registry, currentSubmod, canEdit } from '../state.js';
import { nameOf } from '../model/schema.js';
import { stringify } from '../model/json.js';

export function rightPanel() {
  if (!state.panel) return '';
  const sub = currentSubmod();
  if (state.selId?.startsWith('anim:') && sub) return animPanel(sub, state.selId.slice(5));
  const entry = state.selId ? registry.get(state.selId) : null;
  if (!entry || entry.isList) return emptyPanel(sub);
  const { obj, kind } = entry;
  const def = state.schema.def(nameOf(obj), kind);
  const ed = canEdit('conditions');
  const essential = ['Essential — users without the plugin get an error', 'Non-essential — counts as true without the plugin', 'Non-essential — counts as false without the plugin'][obj.essential ?? 0];
  return `<aside class="rpanel">
    <div class="rp-head"><span class="grow">${kind === 'function' ? 'Function' : 'Condition'}</span><button class="icon-btn" data-act="clearSelection" title="Close">${ic('x')}</button></div>
    <div class="rp-body">
      <div><div class="rp-name ${def?.plugin ? '' : 'plain'}">${esc(nameOf(obj))}</div><div class="rp-desc" style="margin-top:6px">${esc(def?.desc ?? 'Unknown to this tool — probably from a plugin it has no definitions for. Its fields are kept exactly as they are.')}</div></div>
      <dl class="rp-grid">
        <dt>Plugin</dt><dd>${esc(obj.requiredPlugin ?? def?.plugin ?? 'Open Animation Replacer')}</dd>
        <dt>Version</dt><dd class="mono">${esc(obj.requiredVersion ?? def?.version ?? '')}</dd>
        ${obj.requiredPlugin ? `<dt>Essential</dt><dd>${essential}</dd>` : ''}
        ${def?.components.length ? `<dt>Fields</dt><dd>${def.components.map((c) => esc(c.key)).join(', ')}</dd>` : ''}
      </dl>
      <div class="rp-actions">
        <button class="btn btn-secondary" data-act="copyEntry" data-id="${state.selId}">${ic('copy', 14)}Copy</button>
        <button class="btn btn-secondary" data-act="pasteEntry" data-id="${state.selId}" ${ed && state.clipboard ? '' : 'disabled'} title="${state.clipboard ? `Paste ${esc(nameOf(state.clipboard))} below` : 'Copy a condition first'}">${ic('paste', 14)}Paste below</button>
        <button class="btn btn-secondary" data-act="editComment" data-id="${state.selId}" ${ed ? '' : 'disabled'}>${ic('pencil', 14)}Comment</button>
        <button class="btn btn-danger" data-act="deleteEntry" data-id="${state.selId}" ${ed ? '' : 'disabled'}>${ic('trash', 14)}Delete</button>
      </div>
      <div class="rp-label">JSON</div>
      <pre class="code">${esc(stringify(obj, { newline: '\n', indent: '  ' }))}</pre>
    </div>
  </aside>`;
}

function emptyPanel(sub) {
  return `<aside class="rpanel"><div class="rp-head"><span class="grow">Details</span><button class="icon-btn" data-act="togglePanel" title="Hide panel">${ic('x')}</button></div>
    <div class="rp-body"><div class="rp-desc">${sub ? 'Select a condition, function or animation file to see its details here.' : 'Select a submod to see its details here.'}</div>
    <div class="rp-desc"><span class="kbd">Ctrl C</span> / <span class="kbd">Ctrl V</span> copy and paste the selected condition. <span class="kbd">Delete</span> removes it.</div></div></aside>`;
}

function animPanel(sub, target) {
  const ws = state.ws;
  const others = ws.replacersOf(target, sub.mod.project).filter((s) => s !== sub);
  const mine = [...sub.files.filter((f) => targetLower(f) === target.toLowerCase()), ...sub.pendingFiles.filter((p) => targetLower(p.rel) === target.toLowerCase()).map((p) => p.rel)];
  const higher = others.filter((s) => s.priority > sub.priority);
  const top = others[0];
  const rows = others.slice(0, 12).map((s) => `<div class="cf-row" data-act="openSubmod" data-id="${s.id}"><span class="ell"><span style="color:var(--text-5)">${esc(s.mod.name)} ›</span> ${esc(s.name)}</span><span class="mono">${s.priority}</span></div>`).join('');
  const me = `<div class="cf-row you"><span class="ell"><span style="color:var(--text-5)">${esc(sub.mod.name)} ›</span> ${esc(sub.name)}</span><span class="mono">${sub.priority}</span></div>`;
  const listHtml = [...others.filter((s) => s.priority >= sub.priority).slice(0, 12)].length || others.length
    ? `${rows}${others.length > 12 ? `<div class="cf-row"><span class="set-desc">… ${others.length - 12} more</span></div>` : ''}${me}` : me;
  const warn = higher.length
    ? `<div class="warn-box">${ic('info', 15)}<span><b>${plural(higher.length, 'other submod')}</b> replace this animation with higher priority. Yours (${sub.priority}) plays only when none of their conditions match.</span></div>`
    : others.length ? `<div class="set-info ok" style="display:flex"><i></i>Yours has the highest priority of ${plural(others.length + 1, 'submod')}.</div>` : '';
  return `<aside class="rpanel"><div class="rp-head"><span class="grow">Animation</span><button class="icon-btn" data-act="clearSelection">${ic('x')}</button></div>
    <div class="rp-body">
      <div><div class="rp-name mono" style="color:var(--text);font-size:14px">${esc(target.split('\\').pop())}</div><div class="rp-desc" style="margin-top:6px">${isVanilla(target, sub.mod.project) ? 'Vanilla animation' : 'Not found in the game’s Animations BSA — added by another mod, or a custom name.'}</div></div>
      <dl class="rp-grid"><dt>Original</dt><dd class="mono" style="font-size:11.5px">meshes\\actors\\${esc(sub.mod.project)}\\animations\\${esc(target)}</dd><dt>Your files</dt><dd>${mine.length}${mine.length > 1 ? ' (variants)' : ''}</dd></dl>
      ${warn}
      ${others.length ? `<div class="rp-label">Also replaced by</div><div class="cf-list">${listHtml}</div>` : '<div class="rp-desc">No other loaded submod replaces this animation.</div>'}
      ${higher.length && canEdit('settings') ? `<button class="btn btn-secondary" data-act="priorityAbove" data-value="${top.priority + 1}">Set priority above all (${top.priority + 1})</button>` : ''}
    </div></aside>`;
}

function targetLower(rel) {
  const parts = rel.split('\\');
  const vi = parts.findIndex((p) => p.toLowerCase().startsWith('_variants_'));
  return (vi < 0 ? rel : [...parts.slice(0, vi), `${parts[vi].slice(10)}.hkx`].join('\\')).toLowerCase();
}

function isVanilla(target, project) {
  const list = state.vanilla.get(project);
  return !!list && list.some((p) => p.toLowerCase() === target.toLowerCase());
}
