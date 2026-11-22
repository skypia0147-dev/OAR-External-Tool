// Condition / function tree — OAR's DrawCondition layout: toggle, NOT, name, comment, argument column;
// clicking a row expands it to Negate, type, Essential, delete and the component editors.
import { esc, ic, idOf } from '../core.js';
import { state, registry } from '../state.js';
import {
  argumentText, nameOf, kindOf, COMPARISONS, ACTOR_VALUE_TYPES, GRAPH_VARIABLE_TYPES, unknownKeys, viewValue, legacyOf, defaultFor, scopesOf,
} from '../model/schema.js';

/**
 * @param {any[]} list    array in the edited document
 * @param {'condition'|'function'} kind
 * @param {{ editable: boolean, presets: string[], owner: any, label?: string }} ctx
 */
export function renderList(list, kind, ctx, depth = 0, ensure = null) {
  // A missing array is drawn as empty and only attached to the document when something is added,
  // so opening an entry never changes the file.
  const real = Array.isArray(list) ? list : null;
  const shown = real ?? [];
  const rows = shown.map((obj, index) => renderEntry(obj, shown, index, kind, ctx, depth)).join('');
  const listId = real ? idOf(real) : `pending:${ensure ? idOf(ensure) : Math.random()}`;
  registry.set(listId, { list: real, ensure, kind, owner: ctx.owner, isList: true });
  const add = ctx.editable
    ? `<button class="add-in" data-act="openPicker" data-list="${listId}" data-kind="${kind}" ${depth ? '' : 'style="margin-left:6px"'}>${ic('plus', 13)}Add ${kind}${ctx.label ? ` to ${esc(ctx.label)}` : ''}</button>`
    : '';
  return `<div class="tree-list" data-drop-list="${listId}">${rows}${add}</div>`;
}

function renderEntry(obj, list, index, kind, ctx, depth) {
  if (!obj || typeof obj !== 'object') return '';
  const id = idOf(obj);
  const entryKind = kindOf(obj) === 'function' ? 'function' : kind;
  registry.set(id, { obj, list, index, kind: entryKind, owner: ctx.owner });
  const name = nameOf(obj);
  const def = state.schema.def(name, entryKind);
  const open = state.open.has(id);
  const sel = state.selId === id;
  const nested = def?.components.filter((c) => c.type === 'conditions' || c.type === 'functions' || c.type === 'conditionFunctions') ?? [];
  const multi = nested.length > 0 && def.components.length === nested.length;
  const cls = !def ? 'invalid' : multi ? 'multi' : def.plugin ? 'custom' : name === 'PRESET' ? 'preset' : '';
  const arg = argumentText(obj, state.schema);
  const row = `<div class="cond-row" data-act="selectEntry" data-id="${id}" ${ctx.editable ? 'draggable="true"' : ''} data-drag="${id}">
    <span class="chev" data-act="toggleEntry" data-id="${id}">${ic('chevronRight', 14)}</span>
    <span class="grip">${ctx.editable ? ic('grip', 14) : ''}</span>
    <span class="cb" role="checkbox" aria-checked="${!obj.disabled}" ${ctx.editable ? `data-act="toggleDisabled" data-id="${id}"` : 'aria-disabled="true"'} title="Toggles the ${entryKind} on/off"></span>
    <span class="cname">${obj.negated ? '<span class="not">NOT</span>' : ''}<span class="nm ${cls}">${esc(name || '(no name)')}</span>${obj.comment ? `<span class="cmt">// ${esc(obj.comment)}</span>` : ''}${!def ? '<span class="tag warn-tag">no editor · JSON</span>' : ''}</span>
    <span class="carg ${multi ? 'muted' : ''}">${esc(arg)}</span>
  </div>`;
  let inner = '';
  if (open) {
    inner += renderBody(obj, entryKind, def, ctx);
    for (const c of nested) {
      if (c.type === 'conditionFunctions') {
        const v = obj[c.key];
        const holder = () => {
          if (!obj[c.key] || typeof obj[c.key] !== 'object') obj[c.key] = { conditions: [], functions: [] };
          return obj[c.key];
        };
        const ensureC = () => { const h = holder(); if (!Array.isArray(h.conditions)) h.conditions = []; return h.conditions; };
        const ensureF = () => { const h = holder(); if (!Array.isArray(h.functions)) h.functions = []; return h.functions; };
        inner += `<div class="kids"><div class="kids-label">${esc(c.key)} · conditions</div>${renderList(v?.conditions, 'condition', { ...ctx, label: name }, depth + 1, ensureC)}
          <div class="kids-label">${esc(c.key)} · functions</div>${renderList(v?.functions, 'function', { ...ctx, label: name }, depth + 1, ensureF)}</div>`;
      } else {
        const ensure = () => { if (!Array.isArray(obj[c.key])) obj[c.key] = []; return obj[c.key]; };
        inner += `<div class="kids">${nested.length > 1 ? `<div class="kids-label">${esc(c.key)}</div>` : ''}${renderList(obj[c.key], c.type === 'functions' ? 'function' : 'condition', { ...ctx, label: name }, depth + 1, ensure)}</div>`;
      }
    }
  }
  return `<div class="cond ${open ? 'open' : ''} ${sel ? 'sel' : ''} ${obj.disabled ? 'off' : ''}" data-entry="${id}">${row}${inner}</div>`;
}

function renderBody(obj, kind, def, ctx) {
  const id = idOf(obj);
  const dis = ctx.editable ? '' : 'disabled';
  const top = `<div class="cbody-top">
    ${kind === 'condition' ? `<label class="chk"><span class="cb" role="checkbox" aria-checked="${!!obj.negated}" ${ctx.editable ? `data-act="toggleNegate" data-id="${id}"` : ''}></span>Negate</label>` : ''}
    <button class="combo" data-act="openPicker" data-replace="${id}" data-kind="${kind}" ${dis}><span class="grow ${def?.plugin ? 'custom' : ''}">${esc(nameOf(obj))}</span>${ic('chevronDown', 14)}</button>
    ${def?.plugin && kind === 'condition' ? essentialSelect(obj, ctx) : ''}
    <span class="grow"></span>
    ${ctx.editable ? `<button class="btn btn-danger btn-sm" data-act="deleteEntry" data-id="${id}" title="Delete ${kind}">${ic('trash', 14)}Delete</button>` : ''}
  </div>`;
  if (!def) {
    return `<div class="cbody">${top}<div class="set-desc">This tool has no editor for <b>${esc(nameOf(obj))}</b>${obj.requiredPlugin ? ` (from ${esc(obj.requiredPlugin)})` : ''}. Edit its fields as JSON — they are saved exactly as written.</div>
      ${rawEditor(obj, null, ctx)}</div>`;
  }
  const comps = def.components.filter((c) => !['conditions', 'functions', 'conditionFunctions'].includes(c.type));
  const fields = comps.map((c) => `<span class="comp-label" title="${esc(c.desc ?? '')}">${esc(c.key)}</span><span class="comp-ctl">${componentEditor(obj, c, ctx)}</span>`).join('');
  const extra = unknownKeys(obj, def);
  const legacy = legacyOf(obj);
  const legacyNote = legacy ? `<div class="set-desc legacy-note">${ic('info', 13)}<span>Saved in the format from before OAR ${legacy.since} (<span class="mono">${esc(legacy.key)}</span>). OAR reads it the same way; editing this ${kind} rewrites it in the current format.</span></div>` : '';
  return `<div class="cbody">${top}${legacyNote}${fields ? `<div class="comp">${fields}</div>` : comps.length === 0 && def.components.length === 0 ? '<div class="set-desc">No settings — this condition is either true or false.</div>' : ''}
    ${extra.length ? `<div class="set-desc">Fields from another version of this ${kind} (kept as-is): ${extra.map(esc).join(', ')}</div>${rawEditor(obj, extra, ctx)}` : ''}</div>`;
}

function essentialSelect(obj, ctx) {
  const v = obj.essential ?? 0;
  const opts = [[0, 'Essential'], [1, 'Non-essential · true'], [2, 'Non-essential · false']];
  return `<select class="mini-select" data-entry-field="essential" data-id="${idOf(obj)}" ${ctx.editable ? '' : 'disabled'} title="Users missing the plugin that adds this condition get an error (Essential), or the condition counts as true/false.">
    ${opts.map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
}

function rawEditor(obj, keys, ctx) {
  const id = idOf(obj);
  const view = keys ? Object.fromEntries(keys.map((k) => [k, obj[k]])) : obj;
  return `<textarea class="raw-json" spellcheck="false" data-raw="${id}" data-raw-keys="${esc(keys ? keys.join('\u0001') : '')}" data-focus="raw:${id}" ${ctx.editable ? '' : 'readonly'}>${esc(JSON.stringify(view, null, 2))}</textarea>`;
}

// ───────── component editors ─────────

function attrs(obj, c, field, extra = '') {
  return `data-comp="${esc(c.key)}" data-id="${idOf(obj)}" data-field="${field}" data-focus="${idOf(obj)}:${esc(c.key)}:${field}" ${extra}`;
}

function componentEditor(obj, c, ctx) {
  const raw = viewValue(obj, c);
  // a missing key is what OAR loads as the constructor default
  const v = raw === undefined ? defaultFor(c) : raw;
  const dis = ctx.editable ? '' : 'disabled';
  switch (c.type) {
    case 'bool':
      return `<span class="toggle" role="switch" aria-checked="${!!v}" ${ctx.editable ? `data-act="toggleComp" data-id="${idOf(obj)}" data-comp="${esc(c.key)}"` : ''}></span>`;
    case 'comparison':
      return `<span class="seg seg-sm">${COMPARISONS.map((o) => `<button class="seg-btn" ${dis} data-act="setComp" data-id="${idOf(obj)}" data-comp="${esc(c.key)}" data-value="${esc(o)}" aria-pressed="${(v ?? '==') === o}">${esc(o)}</button>`).join('')}</span>`;
    case 'numeric': return numericEditor(obj, c, v, ctx);
    case 'form': return formEditor(obj, c, v ?? {}, 'form', ctx);
    case 'keyword': {
      const mode = v && 'form' in v ? 'form' : 'editorID';
      return `<select class="mini-select" ${attrs(obj, c, 'kwMode')} ${dis}><option value="editorID" ${mode === 'editorID' ? 'selected' : ''}>Editor ID</option><option value="form" ${mode === 'form' ? 'selected' : ''}>Form</option></select>
        ${mode === 'form' ? formEditor(obj, c, v.form ?? {}, 'kwForm', ctx) : `<input class="txt" ${attrs(obj, c, 'editorID')} value="${esc(v?.editorID ?? '')}" placeholder="Keyword editor ID" ${dis}>`}`;
    }
    case 'text':
      return `<input class="txt wide" ${attrs(obj, c, 'text')} value="${esc(v ?? '')}" ${dis}>`;
    case 'point3':
      return [0, 1, 2].map((i) => `<input class="num-in" type="number" step="any" ${attrs(obj, c, `p${i}`)} value="${Array.isArray(v) ? v[i] ?? 0 : 0}" ${dis}>`).join('');
    case 'state': {
      // missing key = OAR's constructor default for this condition
      const s = v && typeof v === 'object' ? v : defaultFor(c);
      const scopes = scopesOf(c);
      const scopeCtl = scopes.length > 1
        ? `<select class="mini-select" ${attrs(obj, c, 'scope')} ${dis}>${scopes.map((o) => `<option ${(s.scope ?? scopes[0]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`
        : `<span class="tag">${esc(scopes[0])} scope</span>`;
      return `${scopeCtl}
        <label class="chk"><span class="cb" role="checkbox" aria-checked="${!!s.shouldResetOnLoopOrEcho}" ${ctx.editable ? `data-act="toggleStateReset" data-id="${idOf(obj)}" data-comp="${esc(c.key)}"` : ''}></span>Reset on loop or echo</label>`;
    }
    case 'preset': {
      const names = ctx.presets ?? [];
      return names.length
        ? `<select class="mini-select" ${attrs(obj, c, 'preset')} ${dis}><option value=""></option>${names.map((n) => `<option ${n === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`
        : `<input class="txt" ${attrs(obj, c, 'text')} value="${esc(v ?? '')}" placeholder="Preset name (define presets on the mod page)" ${dis}>`;
    }
    default:
      return `<span class="set-desc">Not editable here</span>`;
  }
}

function numericEditor(obj, c, v, ctx) {
  const dis = ctx.editable ? '' : 'disabled';
  v = v && typeof v === 'object' ? v : { value: 0 };
  const mode = 'value' in v ? 'value' : 'form' in v ? 'global' : 'actorValue' in v ? 'av' : 'graphVariable' in v ? 'graph' : 'value';
  const modeSel = `<select class="mini-select" ${attrs(obj, c, 'numMode')} ${dis}>
    <option value="value" ${mode === 'value' ? 'selected' : ''}>Static value</option>
    <option value="global" ${mode === 'global' ? 'selected' : ''}>Global variable</option>
    <option value="av" ${mode === 'av' ? 'selected' : ''}>Actor value</option>
    <option value="graph" ${mode === 'graph' ? 'selected' : ''}>Graph variable</option></select>`;
  if (mode === 'value') {
    if (c.enum) {
      const cur = Math.trunc(v.value ?? 0);
      const known = c.enum.some(([k]) => k === cur);
      return `${modeSel}<select class="mini-select enum" ${attrs(obj, c, 'enum')} ${dis}>
        ${known ? '' : `<option value="${cur}" selected>Unknown (${cur})</option>`}
        ${c.enum.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)} (${k})</option>`).join('')}</select>`;
    }
    return `${modeSel}<input class="num-in" type="number" step="any" ${attrs(obj, c, 'value')} value="${v.value ?? 0}" ${dis}>`;
  }
  if (mode === 'global') return `${modeSel}${formEditor(obj, c, v.form ?? {}, 'numForm', ctx)}`;
  if (mode === 'av') {
    return `${modeSel}<input class="num-in" type="number" step="1" ${attrs(obj, c, 'actorValue')} value="${v.actorValue ?? 0}" title="Actor value index (e.g. 24 = Health)" ${dis}>
      <select class="mini-select" ${attrs(obj, c, 'actorValueType')} ${dis}>${ACTOR_VALUE_TYPES.map((t) => `<option ${v.actorValueType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  }
  return `${modeSel}<input class="txt" ${attrs(obj, c, 'graphVariable')} value="${esc(v.graphVariable ?? '')}" placeholder="Variable name" ${dis}>
    <select class="mini-select" ${attrs(obj, c, 'graphVariableType')} ${dis}>${GRAPH_VARIABLE_TYPES.map((t) => `<option ${v.graphVariableType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
}

function formEditor(obj, c, f, prefix, ctx) {
  const dis = ctx.editable ? '' : 'disabled';
  return `<input class="txt plugin" ${attrs(obj, c, `${prefix}.pluginName`)} value="${esc(f.pluginName ?? '')}" placeholder="Plugin.esp" ${dis}>
    <input class="txt formid mono" ${attrs(obj, c, `${prefix}.formID`)} value="${esc(f.formID ?? '')}" placeholder="FormID (hex)" ${dis}>`;
}
