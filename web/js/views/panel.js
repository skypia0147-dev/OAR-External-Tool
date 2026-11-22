// Right panel: details of the selected condition/function, or of a replaced animation.
import { esc, ic, plural } from '../core.js';
import { state, registry, currentSubmod, canEdit } from '../state.js';
import { nameOf } from '../model/schema.js';
import { stringify } from '../model/json.js';
import { originalOf } from '../model/workspace.js';
import { mo2Reason } from './shell.js';

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
  const orig = originalOf(sub.mod, target);
  // every replacer is listed; only the ones MO2 loads count for the priority verdict
  const all = orig ? ws.replacersOf(orig.anim, orig.project, { all: true }).filter((s) => s !== sub) : [];
  const others = all.filter((s) => s.mod.loaded);
  const unloaded = all.filter((s) => !s.mod.loaded);
  const mine = [...sub.files.filter((f) => targetLower(f) === target.toLowerCase()), ...sub.pendingFiles.filter((p) => targetLower(p.rel) === target.toLowerCase()).map((p) => p.rel)];
  const higher = others.filter((s) => s.priority > sub.priority);
  const higherUnloaded = unloaded.filter((s) => s.priority > sub.priority);
  const top = others[0];
  const rows = all.slice(0, 12).map((s) => {
    const off = !s.mod.loaded;
    return `<div class="cf-row ${off ? 'mo2-off' : ''}" data-act="openSubmod" data-id="${s.id}" ${off ? `title="${esc(mo2Reason(s.mod))}"` : ''}><span class="ell"><span style="color:var(--text-5)">${esc(s.mod.name)} ›</span> ${esc(s.name)}</span>${off ? `<span class="mo2-tag">${s.mod.mo2 === 'hidden' ? 'hidden' : 'off'}</span>` : ''}<span class="mono">${s.priority}</span></div>`;
  }).join('');
  const me = `<div class="cf-row you"><span class="ell"><span style="color:var(--text-5)">${esc(sub.mod.name)} ›</span> ${esc(sub.name)}</span><span class="mono">${sub.priority}</span></div>`;
  const listHtml = `${rows}${all.length > 12 ? `<div class="cf-row"><span class="set-desc">… ${all.length - 12} more</span></div>` : ''}${me}`;
  const originalPath = orig ? `meshes\\actors\\${orig.project}\\animations\\${orig.anim}` : `meshes\\${sub.mod.prefix ? `${sub.mod.prefix}\\` : ''}${target}`;
  const profile = esc(ws.mo2Profile ?? '');
  const okText = unloaded.length
    ? `Yours has the highest priority of the mods that are on in MO2${others.length ? ` (${plural(others.length + 1, 'submod')})` : ''}.`
    : `Yours has the highest priority of ${plural(others.length + 1, 'submod')}.`;
  const offNames = [...new Set(higherUnloaded.map((s) => s.mod.managerMod ?? s.mod.name))];
  const note = higherUnloaded.length
    ? `<div class="mo2-note">${ic('info', 15)}<span>${plural(higherUnloaded.length, 'submod')} with higher priority ${higherUnloaded.length === 1 ? 'is' : 'are'} in ${offNames.slice(0, 2).map((n) => `<b>${esc(n)}</b>`).join(' and ')}${offNames.length > 2 ? ` and ${offNames.length - 2} more` : ''}, which MO2 doesn't load with the ${profile} profile — not counted. Switch the MO2 profile to see another setup.</span></div>`
    : '';
  const warn = higher.length
    ? `<div class="warn-box">${ic('info', 15)}<span><b>${plural(higher.length, 'other submod')}</b> replace this animation with higher priority. Yours (${sub.priority}) plays only when none of their conditions match.</span></div>${note}`
    : others.length || unloaded.length ? `<div class="ok-line"><span class="dot dot-success"></span><span>${okText}</span></div>${note}` : '';
  return `<aside class="rpanel"><div class="rp-head"><span class="grow">Animation</span><button class="icon-btn" data-act="clearSelection">${ic('x')}</button></div>
    <div class="rp-body">
      <div><div class="rp-name mono" style="color:var(--text);font-size:14px">${esc(target.split('\\').pop())}</div><div class="rp-desc" style="margin-top:6px">${orig && isVanilla(orig.anim, orig.project) ? 'Vanilla animation' : state.vanilla.get(orig?.project ?? 'character')?.length ? 'Not found in the game’s Animations BSA — added by another mod, or a custom name.' : ''}</div></div>
      <dl class="rp-grid"><dt>Original</dt><dd class="mono" style="font-size:11.5px">${esc(originalPath)}</dd><dt>Your files</dt><dd>${mine.length}${mine.length > 1 ? ' (variants)' : ''}</dd></dl>
      ${warn}
      ${all.length ? `<div class="rp-label">Also replaced by</div><div class="cf-list">${listHtml}</div>` : '<div class="rp-desc">No other loaded submod replaces this animation.</div>'}
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
