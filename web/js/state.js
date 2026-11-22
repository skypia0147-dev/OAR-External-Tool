// Single app state + full re-render with focus and scroll kept across renders.

export const state = {
  info: { version: '', editMode: 'user' },
  schema: null,
  ws: null,
  view: 'start', // start | mod | submod | problems | settings
  modId: null,
  submodId: null,
  editMode: 'user', // inspect | user | author
  selId: null, // selected condition/function (object id) or 'anim:<target>'
  open: new Set(), // expanded entry ids
  sec: { settings: false, files: false, conditions: true, paired: true, functions: false, presets: true, info: true, submods: true },
  edView: 'editor', // editor | json
  jsonDraft: null,
  panel: true,
  smFilter: '',
  popover: null,
  dialog: null,
  palette: null,
  toasts: [],
  recent: [],
  vanilla: new Map(), // project -> [paths]
  setupModId: null,
  clipboard: null, // copied condition/function
  busy: false,
};

// id → { obj, list, index, kind, owner } for the entries drawn in the last render
export const registry = new Map();

let renderFn = () => {};
let scheduled = false;

export function setRenderer(fn) { renderFn = fn; }

const SCROLLERS = ['.ed', '.sm-rows', '.sb-sections', '.rp-body', '.mod-page', '.start', '.pk-list', '.pk-cats', '.page-scroll'];

export function render() {
  scheduled = false;
  const scroll = {};
  for (const sel of SCROLLERS) {
    const el = document.querySelector(sel);
    if (el) scroll[sel] = [el.scrollTop, el.scrollLeft];
  }
  const active = document.activeElement;
  const focusKey = active?.dataset?.focus ?? null;
  const caret = focusKey && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;

  registry.clear();
  renderFn();

  for (const [sel, [top, left]] of Object.entries(scroll)) {
    const el = document.querySelector(sel);
    if (el) { el.scrollTop = top; el.scrollLeft = left; }
  }
  if (focusKey) {
    const el = document.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      if (caret && 'setSelectionRange' in el) {
        try { el.setSelectionRange(caret[0], caret[1]); } catch { /* number inputs */ }
      }
    }
  }
}

export function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

export function toast(text, sub = '', level = 'ok') {
  const t = { id: Math.random().toString(36).slice(2), text, sub, level };
  state.toasts.push(t);
  if (state.toasts.length > 3) state.toasts.splice(0, state.toasts.length - 3);
  schedule();
  setTimeout(() => {
    state.toasts = state.toasts.filter((x) => x !== t);
    schedule();
  }, level === 'error' ? 7000 : 3500);
}

export const currentMod = () => state.ws?.findMod(state.modId) ?? null;
export const currentSubmod = () => state.ws?.findSubmod(state.submodId) ?? null;

/** Fields the current edit mode may change. */
export function canEdit(field) {
  if (state.editMode === 'inspect') return false;
  if (state.editMode === 'user' && (field === 'name' || field === 'description' || field === 'author' || field === 'modInfo')) return false;
  return true;
}
