// Small shared helpers: escaping, icons, ids for live objects, path access.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 24×24 line icons (same set as MediaTagExplorer)
const P = {
  menu: 'M4.5 6h15M4.5 12h15M4.5 18h7.5',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2',
  plus: 'M12 5v14M5 12h14',
  minimize: 'M5 12h14', maximize: 'M5.5 5.5h13v13h-13z', restore: 'M8 8V5h11v11h-3M5 8h11v11H5z',
  close: 'M6 6l12 12M18 6L6 18', x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  chevronRight: 'M9.5 6l6 6-6 6', chevronDown: 'M6 9.5l6 6 6-6', chevronUp: 'M6 14.5l6-6 6 6',
  folder: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  panel: 'M4 5h16v14H4zM14.5 5v14',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  copy: 'M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9', paste: 'M8 5h8v3H8zM6 6.5H4.5V20h15V6.5H18',
  pencil: 'M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4', trash: 'M5 7h14M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6', refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  check: 'M5 12.5l4.5 4.5L19 7.5', sort: 'M4 7h11M4 12h7M4 17h4M18 6v13M15 16l3 3 3-3',
  upload: 'M12 20V9M7 13.5l5-5 5 5M5 4h14', lock: 'M6.5 11V8a5.5 5.5 0 0 1 11 0v3M5 11h14v9H5z',
  library: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  reveal: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5zM13 13.5h5M15.5 11l2.5 2.5-2.5 2.5',
  file: 'M6 3.5h8l4 4V20.5H6zM14 3.5v4h4', warn: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01',
};
export const ic = (name, size = 16, sw) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"${sw ? ` style="stroke-width:${sw}"` : ''}><path d="${P[name] ?? ''}"/></svg>`;

// Stable ids for objects in the edited documents (conditions move around, paths don't stay valid).
const ids = new WeakMap();
let nextId = 1;
export function idOf(obj) {
  let id = ids.get(obj);
  if (!id) { id = `e${nextId++}`; ids.set(obj, id); }
  return id;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Compact relative time: "2 hours ago". */
export function ago(date) {
  const d = new Date(date);
  const s = (Date.now() - d.getTime()) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 60) return 'just now';
  const units = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week']];
  for (let i = units.length - 1; i >= 0; i--) {
    const [sec, name] = units[i];
    if (s >= sec) return `${plural(Math.floor(s / sec), name)} ago`;
  }
  return '';
}

export function basename(p) {
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function dirname(p) {
  const i = String(p).replace(/[\\/]+$/, '').lastIndexOf('\\');
  return i > 0 ? p.slice(0, i) : p;
}

/** Folder-safe name (Windows). */
export function safeName(s) {
  return String(s ?? '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/[. ]+$/, '').trim();
}
