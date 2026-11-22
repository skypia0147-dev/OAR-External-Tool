// OAR External Tool 2.0 mockup. Static screens selected by URL hash; data taken from a real
// OAR mod (RaySense - Cover Animation / Hide_Front_R_Exit) so the layout is checked with real content.
'use strict';

const P = {
  menu: 'M4.5 6h15M4.5 12h15M4.5 18h7.5',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2',
  plus: 'M12 5v14M5 12h14',
  minimize: 'M5 12h14', maximize: 'M5.5 5.5h13v13h-13z', close: 'M6 6l12 12M18 6L6 18', x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  chevronRight: 'M9.5 6l6 6-6 6', chevronDown: 'M6 9.5l6 6 6-6',
  folder: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  panel: 'M4 5h16v14H4zM14.5 5v14',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  copy: 'M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9', paste: 'M8 5h8v3H8zM6 6.5H4.5V20h15V6.5H18',
  pencil: 'M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4', trash: 'M5 7h14M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6', refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  log: 'M6 3.5h8l4 4V20.5H6zM9 11h6M9 14.5h6M9 18h4', file: 'M6 3.5h8l4 4V20.5H6zM14 3.5v4h4',
  check: 'M5 12.5l4.5 4.5L19 7.5', lock: 'M6.5 11V8a5.5 5.5 0 0 1 11 0v3M5 11h14v9H5z', sort: 'M4 7h11M4 12h7M4 17h4M18 6v13M15 16l3 3 3-3',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01', upload: 'M12 20V9M7 13.5l5-5 5 5M5 4h14',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z', film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4',
  library: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  external: 'M13.5 4.5H19.5V10.5M19.5 4.5l-8 8M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10',
};
const ic = (n, s = 16, sw) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"${sw ? ` style="stroke-width:${sw}"` : ''}><path d="${P[n]}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ───────── data (real) ─────────
const MODS = [
  ['Beam Walking Assist', 8], ['BFCO', 12], ['Draw Fix', 2], ['Dynamic Block Hit', 8], ['Dynamic Bow Animation', 11],
  ['Dynamic Sprint', 85], ['EVG Animated Traversal', 22], ['For Honor Real Time Waiting', 17], ['Grapple', 23],
  ['MaxsuBlockDefault', 5], ['RaySense - Cover Animation', 38, 'cur'], ['RaySense - Edge Lookdown', 3],
  ['RaySense - Jumping over obstacles', 7], ['Smooth Moveset - 1hm', 12], ['Smooth Moveset - Dual Wield', 42],
  ['Smooth Moveset - Katana', 11], ['StrongSwimAnim', 3], ['XPMSE', 31, 'legacy'],
];
const SUBS = [
  ['Sneak_mt_Loop', 2110000000, 2], ['Sneak_mt_Enter', 2110000001, 2], ['Sneak_mt_Exit', 2110000002, 2],
  ['Sneak_Weapon_Loop', 2110000004, 9], ['Sneak_Weapon_Enter', 2110000005, 2], ['Sneak_Weapon_Exit', 2110000006, 3],
  ['Hide_Front_R_Loop', 2110000010, 9], ['Hide_Front_R_Enter', 2110000011, 2], ['Hide_Front_R_Exit', 2110000012, 3, 'sel'],
  ['Hide_Front_L_Loop', 2110000013, 9], ['Hide_Front_L_Enter', 2110000014, 2], ['Hide_Front_L_Exit', 2110000015, 3],
  ['Hide_Left_Loop', 2110000020, 9], ['Hide_Left_Enter', 2110000021, 2], ['Hide_Left_Exit', 2110000022, 3],
  ['Hide_Right_Loop', 2110000030, 9], ['Hide_Right_Enter', 2110000031, 2], ['Hide_Right_Exit', 2110000032, 3],
  ['Hide_Shield_Front_R_Loop', 2110000110, 1, 'off'], ['Hide_Shield_Front_R_Enter', 2110000111, 1], ['Hide_Shield_Front_R_Exit', 2110000112, 1],
  ['Hide_Shield_Front_L_Loop', 2110000113, 1], ['Hide_Shield_Front_L_Enter', 2110000114, 1], ['Hide_Shield_Front_L_Exit', 2110000115, 1],
  ['Hide_Shield_Left_Loop', 2110000120, 1], ['Hide_Shield_Left_Enter', 2110000121, 1], ['Hide_Shield_Left_Exit', 2110000122, 1],
  ['Hide_Shield_Right_Loop', 2110000130, 1], ['Hide_Shield_Right_Enter', 2110000131, 1], ['Hide_Shield_Right_Exit', 2110000132, 1],
  ['Hide_Bow_Front_R_Loop', 2110000210, 2], ['Hide_Bow_Front_R_Enter', 2110000211, 1], ['Hide_Bow_Front_L_Loop', 2110000213, 2],
  ['Hide_Bow_Front_L_Enter', 2110000214, 1], ['Hide_Bow_Left_Loop', 2110000220, 2], ['Hide_Bow_Left_Enter', 2110000221, 1],
  ['Hide_Bow_Right_Loop', 2110000230, 2], ['Hide_Bow_Right_Enter', 2110000231, 1],
];
const COND_COUNT = { Sneak_mt_Loop: 3, Hide_Front_R_Exit: 8 };

const cv = (id, not = true) => ({ n: 'CompareValues', not, arg: `1.000 == <span class="mono">Cover Animation.esp|0x${id}</span>` });
const eq = (type, left, not = true) => ({ n: 'IsEquippedType', not, arg: `${type} in ${left ? 'left' : 'right'} hand` });
const TREE = [
  { n: 'IsSneaking' },
  { n: 'RaySense_Wall', custom: true, arg: 'Sensor 0 &nbsp;&lt;=&nbsp; 60.000', sel: true, open: true, body: 'wall' },
  { n: 'RaySense_Obstacle', custom: true, arg: 'Sensor 0 &nbsp;!=&nbsp; 43.000' },
  { n: 'AND', multi: true, open: true, cmt: 'Not already exiting cover', kids: [cv('801'), cv('806'), cv('800')] },
  { n: 'OR', multi: true, kidsN: 8, arg: '8 conditions' },
  { n: 'OR', multi: true, open: true, kids: [eq('Bows', true), { n: 'IsWeaponDrawn', not: true }] },
  { n: 'AND', multi: true, kidsN: 6, arg: '6 conditions', off: true },
  { n: 'AND', multi: true, kidsN: 8, arg: '8 conditions' },
];

// ───────── shell ─────────
function titlebar(mode = 'user') {
  const b = (k, label, cls = '') => `<button class="seg-btn ${cls}" aria-pressed="${mode === k}">${label}</button>`;
  return `<header class="titlebar">
    <div class="tb-left"><button class="icon-btn" title="Toggle sidebar (Ctrl B)">${ic('menu')}</button><span class="tb-name">OAR External Tool</span></div>
    <div class="tb-center"><button class="tb-search">${ic('search', 15)}<span class="grow ell">Search mods, submods, conditions or commands</span><span class="kbd">Ctrl K</span></button></div>
    <div class="tb-right"><div class="tb-mode">Edit mode<div class="seg seg-filled seg-sm">${b('inspect', 'Inspect')}${b('user', 'User')}${b('author', 'Author', 'author')}</div></div></div>
    <div class="win-ctrls"><button class="win-btn">${ic('minimize')}</button><button class="win-btn">${ic('maximize')}</button><button class="win-btn close">${ic('close')}</button></div>
  </header>`;
}

function sidebar(screen) {
  const nav = (icon, label, cur, extra = '') => `<a class="sb-nav-item" ${cur ? 'aria-current="page"' : ''}>${ic(icon)}<span class="grow nw">${label}</span>${extra}</a>`;
  const empty = screen === 'start' || screen === 'c-mod';
  const creating = screen.startsWith('c-');
  const list = creating
    ? [['Smooth Sneak Idle', screen === 'c-submod' ? 0 : 1, 'new'], ...MODS.map(([n, k, f]) => [n, k, f === 'cur' ? '' : f])]
    : MODS;
  const mods = empty ? '<div class="state-empty">No folder open yet.</div>' : list.map(([name, n, f]) => `
      <a class="sb-row ${f === 'legacy' ? 'legacy' : ''}" ${f === 'cur' || f === 'new' ? 'aria-current="true"' : ''}>
        <span class="ell">${esc(name)}</span>${f === 'cur' || f === 'new' ? '<span class="mk-dirty">*</span>' : ''}${f === 'new' ? '<span class="sb-new-tag">new</span>' : ''}${f === 'legacy' ? '<span class="sb-count">legacy</span>' : `<span class="sb-count">${n}</span>`}
      </a>`).join('');
  return `<aside class="sidebar">
    <button class="sb-new" title="New">${ic('plus', 18)}</button>
    <nav class="sb-nav">
      ${nav('library', 'Replacer Mods', screen !== 'settings-app')}
      ${nav('info', 'Problems', false, empty ? '' : '<span class="sb-badge">2</span>')}
      ${nav('settings', 'Settings', false)}
    </nav>
    <div class="sb-sections">
      <div class="sb-section">
        <div class="sb-section-head"><span class="grow">Mods${empty ? '' : creating ? ' · 19' : ' · 18'}</span>${empty ? '' : '<button class="sb-section-action">Sort</button>'}</div>
        ${mods}
      </div>
    </div>
    <div class="sb-foot">
      ${empty ? '<div class="sb-status"><span class="dot dot-info"></span>No folder</div>'
        : '<div class="sb-status" title="H:\\Game\\Fablerim\\mods"><span class="dot dot-success"></span><span class="ell mono">H:\\Game\\Fablerim\\mods</span></div>'}
    </div>
  </aside>`;
}

function toolbar(crumbs, findPh) {
  const parts = crumbs.map((c, i) => `${i ? `<span class="addr-sep">${ic('chevronRight', 14)}</span>` : ''}<button class="addr-part ${i === crumbs.length - 1 ? 'current' : ''}">${esc(c)}</button>`).join('');
  return `<div class="oar-toolbar">
    <div class="addr">${ic('folder', 15)}${parts}</div>
    <div class="find-box">${ic('search', 14)}<input placeholder="${findPh}"></div>
    <button class="nav-btn" title="Info panel" aria-pressed="true">${ic('panel')}</button>
  </div>`;
}

// ───────── submod list ─────────
function subList() {
  const rows = SUBS.map(([name, pri, anims, f]) => `
    <div class="sm-row ${f === 'off' ? 'disabled' : ''}" ${f === 'sel' ? 'aria-selected="true"' : ''}>
      <span class="cb" aria-checked="${f !== 'off'}"></span>
      <span class="sm-text">
        <span class="sm-name"><span class="ell">${name}</span>${f === 'sel' ? '<span class="mk-dirty">*</span><span class="mk-user">(User)</span>' : ''}</span>
        <span class="sm-meta"><span class="sm-pri">${pri}</span>· ${COND_COUNT[name] ?? 4} cond · ${anims} anim</span>
      </span>
    </div>`).join('');
  return `<div class="sm-list">
    <div class="sm-head"><b>Submods</b><span>38</span><span class="grow"></span><button class="nav-btn" title="Sort">${ic('sort', 15)}</button><button class="nav-btn" title="New submod">${ic('plus', 15)}</button></div>
    <div class="sm-rows">${rows}</div>
  </div>`;
}

// ───────── condition tree ─────────
function condRow(c) {
  const hasKids = c.kids || c.kidsN || c.body;
  const cls = c.multi ? 'multi' : c.custom ? 'custom' : c.preset ? 'preset' : '';
  const arg = c.arg ?? (c.multi ? `${c.kids?.length ?? c.kidsN} conditions` : '');
  return `<div class="cond-row">
    <span class="chev ${hasKids || c.n ? '' : 'leaf'}">${ic('chevronRight', 14)}</span>
    <span class="grip">${ic('grip', 14)}</span>
    <span class="cb" aria-checked="${!c.off}"></span>
    <span class="cname">${c.not ? '<span class="not">NOT</span>' : ''}<span class="nm ${cls}">${c.n}</span>${c.cmt ? `<span class="cmt">// ${esc(c.cmt)}</span>` : ''}</span>
    <span class="carg ${c.multi ? 'muted' : ''}">${arg}</span>
  </div>`;
}

function wallBody() {
  const ops = ['==', '!=', '>', '>=', '<', '<='].map((o) => `<button class="seg-btn" aria-pressed="${o === '<='}">${esc(o)}</button>`).join('');
  return `<div class="cbody">
    <div class="cbody-top">
      <span class="chk"><span class="cb" aria-checked="false"></span>Negate</span>
      <button class="combo"><span class="grow">RaySense_Wall</span>${ic('chevronDown', 14)}</button>
      <button class="mini-select" title="What happens for users without the plugin">Essential ${ic('chevronDown', 13)}</button>
      <span class="grow"></span>
      <button class="btn btn-danger" style="height:30px;font-size:12px">${ic('trash', 14)}Delete condition</button>
    </div>
    <div class="comp">
      <span class="comp-label">Sensor (0:F, 1:FL, 2:FR, 3:L, 4:R)</span>
      <span class="comp-ctl"><button class="mini-select">Static value ${ic('chevronDown', 13)}</button><span class="num">0.000</span></span>
      <span class="comp-label">Comparison</span>
      <span class="comp-ctl"><span class="seg seg-sm">${ops}</span></span>
      <span class="comp-label">Distance</span>
      <span class="comp-ctl"><button class="mini-select">Static value ${ic('chevronDown', 13)}</button><span class="num focus">60.000</span></span>
    </div>
  </div>`;
}

function condNode(c) {
  const open = c.open ? 'open' : '';
  let inner = '';
  if (c.open && c.body === 'wall') inner = wallBody();
  if (c.open && c.kids) inner = `<div class="kids">${c.kids.map(condNode).join('')}<button class="add-in">${ic('plus', 13)}Add condition to ${c.n}</button></div>`;
  return `<div class="cond ${open} ${c.sel ? 'sel' : ''} ${c.off ? 'off' : ''}">${condRow(c)}${inner}</div>`;
}

function conditionsSection(withPicker) {
  return `<section class="sec open" style="position:relative">
    <div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Conditions</span><span class="sec-count">8</span><span class="sec-summary"></span></div>
    <div class="sec-body">
      <div class="cond-bar">
        <button class="btn btn-secondary" ${withPicker ? 'style="border-color:var(--accent)"' : ''}>${ic('plus', 14)}Add condition</button>
        <button class="btn btn-quiet">Condition set ${ic('chevronDown', 13)}</button>
        <span class="grow"></span>
        <button class="btn btn-quiet">${ic('chevronDown', 13)}Expand all</button>
      </div>
      <div class="cond-cols"><span>Condition</span><span>Argument</span></div>
      <div class="tree">${TREE.map(condNode).join('')}<button class="add-in" style="margin-left:6px">${ic('plus', 13)}Add condition</button></div>
      ${withPicker ? picker() : ''}
    </div>
  </section>`;
}

function picker() {
  const cats = [['Recent', 4], ['Core', 7], ['Actor Status', 37], ['Items & Combat', 20], ['Environment', 14], ['Actor Data', 21], ['Comparison', 8], ['Quest & Scene', 11], ['Misc', 3], ['RaySense', 6, 'cur']];
  // Names registered by the RaySense plugin (F:\Anti\RaySense\src\OARConditions.h)
  const items = [
    ['RaySense_Ledge', 'custom'], ['RaySense_Obstacle', 'custom'], ['RaySense_Slope', 'custom'],
    ['RaySense_Verticality', 'custom'], ['RaySense_Wall', 'custom', 'sel'], ['RaySense_WaterDepth', 'custom'],
  ];
  return `<div class="popover picker" style="left:14px; top:50px">
    <div class="picker-search"><label class="field">${ic('search', 15)}<input value="ray" placeholder="Search conditions"></label></div>
    <div class="picker-main">
      <div class="pk-cats">${cats.map(([n, k, f]) => `<a class="pk-cat" ${f ? 'aria-current="true"' : ''}>${n}<span class="sb-count">${k}</span></a>`).join('')}</div>
      <div class="pk-list">${items.map(([n, c, f]) => `<div class="pk-item" ${f ? 'aria-selected="true"' : ''}><span class="${c}"><mark>Ray</mark>${n.slice(3)}</span><span class="hint">RaySense</span></div>`).join('')}</div>
      <div class="pk-desc"><b>RaySense_Wall</b><span>Check wall dist (0:F, 1:FL, 2:FR, 3:L, 4:R).</span><span class="tag custom">Open Animation Replacer - RaySense</span><span class="tag mono">requires 1.0.0.0</span></div>
    </div>
    <div class="picker-foot"><span><span class="kbd">↑↓</span> move</span><span><span class="kbd">Enter</span> add below selection</span><span><span class="kbd">Esc</span> close</span><span class="grow"></span><span>Conditions from <b style="color:var(--text-3);font-weight:500">OAR 3.0.1</b> + installed plugins</span></div>
  </div>`;
}

function settingsSection(open) {
  const row = (label, desc, ctl, dim) => `<div class="set-row ${dim ? 'dim' : ''}"><div class="set-row-text"><span>${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  const tg = (on) => `<span class="toggle" role="switch" aria-checked="${on}"></span>`;
  const inp = (v, w, ph = '', mono) => `<label class="set-input ${w} ${mono ? 'mono' : ''}"><input value="${esc(v)}" placeholder="${ph}"></label>`;
  const ro = (v, w, ph = '') => `<label class="set-input readonly ${w}"><input value="${esc(v)}" placeholder="${ph}" readonly>${ic('lock', 13)}</label>`;
  const blend = (on) => `${tg(on)}<label class="set-input w-sm ${on ? '' : ''}" style="${on ? '' : 'opacity:.45'}"><input value="0.20"><span class="unit">s</span></label>`;
  return `<section class="sec ${open ? 'open' : ''}">
    <div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Submod settings</span>
      <span class="sec-summary"><span class="tag mono">Priority 2110000012</span><span class="tag">Interruptible · off</span><span class="tag">Replace on loop · on</span><span class="tag">Replace on echo · off</span></span></div>
    <div class="sec-body">
      ${row('Submod name', 'Author mode only', ro('Hide_Front_R_Exit', 'w-lg'))}
      ${row('Description', 'Author mode only', ro('', 'w-lg', 'No description'))}
      ${row('Priority', '', inp('2110000012', 'w-md', '', true))}
      ${row('Override animations folder', 'If set, this submod will load animations from the given folder (in the parent directory) instead of its own folder.', inp('', 'w-md', 'Not set'))}
      ${row('Required project name', 'If set, this submod will only load for the specified project name. Leave empty to load for all projects.', inp('', 'w-md', 'All projects'))}
      ${row('Ignore “Don’t Convert Annotations To Triggers” flag', 'Annotations inside the replacer animation file will run even on clips that have this vanilla flag.', tg(false))}
      ${row('Only use triggers from annotations', 'Triggers baked into the behavior clips are ignored; only annotations inside the animation file run.', tg(false))}
      ${row('Interruptible', 'Conditions are checked every frame and the clip is switched if needed. Mostly useful for looping animations.', tg(false))}
      ${row('Custom blend time on interrupt', '', blend(false), true)}
      ${row('Replace on loop', 'Conditions are re-evaluated on animation loop. Enabled by default.', tg(true))}
      ${row('Custom blend time on loop', '', blend(false))}
      ${row('Replace on echo', 'Conditions are re-evaluated on animation echo. Disabled by default — enable only on animations that need it.', tg(false))}
      ${row('Custom blend time on echo', '', blend(false), true)}
      ${row('Run functions on loop', 'OnDeactivate/OnActivate functions run when the clip loops. Enabled by default.', tg(true))}
      ${row('Run functions on echo', 'OnDeactivate/OnActivate functions run on clip echo. Enabled by default.', tg(true))}
    </div>
  </section>`;
}

function collapsed(title, count, summary) {
  return `<section class="sec"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">${title}</span><span class="sec-count">${count}</span><span class="sec-summary">${summary}</span></div><div class="sec-body"></div></section>`;
}

function edHead(view = 'editor') {
  return `<div class="ed-head">
    <div class="ed-head-text">
      <div class="ed-title"><span class="ell">Hide_Front_R_Exit</span><span class="mk-dirty">*</span></div>
      <div class="ed-path">OpenAnimationReplacer\\RaySense - Cover Animation\\2110000012_Hide_Front_R_Exit</div>
      <div class="ed-chips"><span class="tag user">User config · user.json</span><span class="tag dirty">2 unsaved changes</span><span class="tag custom">Needs: Open Animation Replacer - RaySense</span></div>
    </div>
    <div class="ed-head-actions">
      <div class="seg seg-sm"><button class="seg-btn" aria-pressed="${view === 'editor'}">Editor</button><button class="seg-btn" aria-pressed="${view === 'json'}">JSON</button></div>
      <span class="en-label">Enabled <span class="toggle" role="switch" aria-checked="true"></span></span>
      <button class="icon-btn" title="More">${ic('more')}</button>
    </div>
  </div>`;
}

function editor({ picker: withPicker = false, settingsOpen = false } = {}) {
  return `<div class="ed"><div class="ed-col">
    ${edHead()}
    ${settingsSection(settingsOpen)}
    ${collapsed('Animation files', 3, '<span class="tag mono">1hm_idle.hkx</span><span class="tag mono">Male\\</span><span class="tag mono">Female\\</span>')}
    ${settingsOpen ? collapsed('Conditions', 8, '<span class="tag">IsSneaking</span><span class="tag custom">RaySense_Wall</span><span class="tag">+6</span>') : conditionsSection(withPicker)}
    ${collapsed('Functions', 0, '<span class="tag">On Activate · 0</span><span class="tag">On Deactivate · 0</span><span class="tag">On Trigger · 0</span>')}
  </div></div>`;
}

const JSON_TEXT = `{
  "name": "Hide_Front_R_Exit",
  "priority": 2110000012,
  "conditions": [
    {
      "condition": "IsSneaking",
      "requiredVersion": "1.0.0.0"
    },
    {
      "condition": "RaySense_Wall",
      "requiredPlugin": "Open Animation Replacer - RaySense",
      "requiredVersion": "1.0.0.0",
      "Sensor(0:F, 1:FL, 2:FR, 3:L, 4:R)": {
        "value": 0.0
      },
      "Comparison": "<=",
      "Distance": {
        "value": 60.0
      }
    },
    {
      "condition": "RaySense_Obstacle",
      "requiredPlugin": "Open Animation Replacer - RaySense",
      "requiredVersion": "1.0.0.0",
      "Sensor(0:Fnd, 1:Lnd, 2:Rnd, 3:VaultDist)": {
        "value": 0.0
      },
      "Comparison": "!=",
      "Value": {
        "value": 43.0
      }
    },
    {
      "condition": "AND",
      "comment": "Not already exiting cover",
      "requiredVersion": "1.0.0.0",
      "Conditions": [
        {
          "condition": "CompareValues",
          "negated": true,`;

function hl(text, numbers = true) {
  return esc(text).split('\n').map((line, i) => (numbers ? `<span class="ln">${i + 1}</span>` : '') + line
    .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
    .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="s">$1</span>')
    .replace(/:\s*(-?\d+(\.\d+)?)/g, ': <span class="n">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="b">$1</span>')).join('\n');
}

function jsonView() {
  return `<div class="ed"><div class="ed-col">
    ${edHead('json')}
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">user.json</span><span class="sec-count">198 lines</span><span class="grow"></span><button class="btn btn-quiet" style="height:28px;font-size:12px">${ic('copy', 13)}Copy</button><button class="btn btn-secondary" style="height:28px;font-size:12px">Apply</button></div>
      <div class="sec-body json-wrap"><pre class="code">${hl(JSON_TEXT)}</pre></div></section>
  </div></div>`;
}

// ───────── right panel ─────────
function rpanel(kind) {
  if (kind === 'json') {
    return `<aside class="rpanel"><div class="rp-head"><span class="grow">Check</span><button class="icon-btn">${ic('x')}</button></div>
      <div class="rp-body">
        <div class="set-info ok" style="display:flex"><i></i>Valid JSON · matches OAR 3.0.1 schema</div>
        <dl class="rp-grid"><dt>Conditions</dt><dd>8 top-level · 35 in total</dd><dt>Plugins</dt><dd>Open Animation Replacer - RaySense</dd><dt>Forms</dt><dd>Cover Animation.esp × 10</dd></dl>
        <div class="rp-desc">Edits here apply to the editor when you press Apply. Errors are shown on the line, and nothing is applied until the JSON is valid.</div>
      </div></aside>`;
  }
  return `<aside class="rpanel">
    <div class="rp-head"><span class="grow">Condition</span><button class="icon-btn" title="Close">${ic('x')}</button></div>
    <div class="rp-body">
      <div><div class="rp-name">RaySense_Wall</div><div class="rp-desc" style="margin-top:6px">Check wall dist (0:F, 1:FL, 2:FR, 3:L, 4:R).</div></div>
      <dl class="rp-grid">
        <dt>Plugin</dt><dd>Open Animation Replacer - RaySense</dd>
        <dt>Version</dt><dd class="mono">1.0.0.0</dd>
        <dt>Essential</dt><dd>Essential — users without the plugin get an error</dd>
        <dt>Path</dt><dd>Conditions › 2</dd>
      </dl>
      <div class="rp-actions">
        <button class="btn btn-secondary">${ic('copy', 14)}Copy</button>
        <button class="btn btn-secondary" disabled>${ic('paste', 14)}Paste below</button>
        <button class="btn btn-secondary">${ic('pencil', 14)}Comment</button>
        <button class="btn btn-danger">${ic('trash', 14)}Delete</button>
      </div>
      <div class="rp-label">JSON</div>
      <pre class="code">${hl(`{
  "condition": "RaySense_Wall",
  "requiredPlugin": "Open Animation Replacer - RaySense",
  "requiredVersion": "1.0.0.0",
  "Sensor(0:F, 1:FL, 2:FR, 3:L, 4:R)": {
    "value": 0.0
  },
  "Comparison": "<=",
  "Distance": {
    "value": 60.0
  }
}`, false)}</pre>
    </div>
  </aside>`;
}

function savebar() {
  return `<div class="savebar">
    <span class="state"><span class="dot"></span>2 unsaved changes <small>· RaySense_Wall distance, AND comment</small></span>
    <span class="grow"></span>
    <button class="btn btn-quiet">${ic('refresh', 14)}Reload from disk</button>
    <button class="btn btn-quiet">Delete user config</button>
    <button class="btn btn-primary">${ic('save', 14)}Save user config<span class="kbd">Ctrl S</span></button>
  </div>`;
}

// ───────── mod page ─────────
function modPage() {
  const rows = SUBS.slice(0, 14).map(([name, pri, anims, f]) => `
    <div class="tbl-row ${f === 'off' ? 'disabled' : ''}"><span class="cb" aria-checked="${f !== 'off'}"></span>
      <span class="nm ell">${name}${f === 'sel' ? ' <span class="mk-dirty">*</span> <span class="mk-user">(User)</span>' : ''}</span>
      <span class="mono">${pri}</span><span class="r mono">${COND_COUNT[name] ?? 4}</span><span class="r mono">${anims}</span><span class="r" style="color:var(--text-5)">${f === 'sel' ? 'user.json' : 'config.json'}</span></div>`).join('');
  const row = (label, desc, ctl) => `<div class="set-row"><div class="set-row-text"><span>${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  return `<div class="mod-page"><div class="ed-col" style="max-width:1000px">
    <div class="ed-head"><div class="ed-head-text">
      <div class="ed-title">RaySense - Cover Animation <span class="mk-dirty">*</span></div>
      <div class="ed-path">mods\\RaySense - Cover Animation\\meshes\\actors\\character\\animations\\OpenAnimationReplacer\\RaySense - Cover Animation</div>
      <div class="ed-chips"><span class="tag">by Smooth</span><span class="tag">38 submods</span><span class="tag custom">Needs: Open Animation Replacer - RaySense</span></div>
    </div><div class="ed-head-actions"><button class="btn btn-secondary">${ic('plus', 14)}New submod</button><button class="icon-btn">${ic('more')}</button></div></div>
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Mod info</span><span class="sec-summary"></span></div><div class="sec-body">
      ${row('Mod name', 'Author mode only', `<label class="set-input readonly w-lg"><input value="RaySense - Cover Animation" readonly>${ic('lock', 13)}</label>`)}
      ${row('Author', 'Author mode only', `<label class="set-input readonly w-md"><input value="Smooth" readonly>${ic('lock', 13)}</label>`)}
      ${row('Description', 'Author mode only', `<label class="set-input readonly w-lg"><input value="RaySense - Cover Animation" readonly>${ic('lock', 13)}</label>`)}
    </div></section>
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Condition presets</span><span class="sec-count">0</span><span class="sec-summary"></span></div><div class="sec-body">
      <div class="empty-line">No condition presets. Presets are named condition groups that every submod of this mod can reuse.<span class="grow"></span><button class="btn btn-secondary" style="height:30px;font-size:12.5px">${ic('plus', 14)}Add new condition preset</button></div>
    </div></section>
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Submods</span><span class="sec-count">38</span><span class="sec-summary"></span></div><div class="sec-body">
      <div class="tbl"><div class="tbl-row head"><span></span><span>Name</span><span>Priority</span><span class="r">Conditions</span><span class="r">Animations</span><span class="r">Source</span></div>${rows}
      <div class="empty-line" style="justify-content:center">24 more…</div></div>
    </div></section>
  </div></div>`;
}

function startPage() {
  const rec = [['H:\\Game\\Fablerim\\mods', '18 OAR mods · opened 2 hours ago'], ['H:\\Game\\Lorerim\\mods', '41 OAR mods · opened 3 days ago'], ['F:\\Anti\\BeamWalking2\\package', '1 OAR mod · opened last week']];
  return `<div class="start"><div class="start-col">
    <div><div class="start-title">Open a mods folder</div><div class="start-sub">Pick a mod manager’s <span class="mono">mods</span> folder, a single mod, or an <span class="mono">OpenAnimationReplacer</span> folder. Every <span class="mono">config.json</span> and <span class="mono">user.json</span> inside is listed on the left, just like the in-game Replacer Mods tab.</div></div>
    <div class="drop">${ic('folder', 26)}<span>Drop a folder here</span></div>
    <div class="start-actions"><button class="btn btn-primary btn-lg">${ic('folder', 15)}Open folder…</button><button class="btn btn-secondary btn-lg">${ic('plus', 15)}Create new mod</button></div>
    <div><div class="sb-section-head" style="padding-left:2px">Recent folders</div>
      <div class="recent">${rec.map(([p, s]) => `<div class="recent-row">${ic('folder', 16)}<div class="grow" style="display:flex;flex-direction:column;gap:2px"><span class="mono">${esc(p)}</span><small>${s}</small></div>${ic('chevronRight', 15)}</div>`).join('')}</div></div>
  </div></div>`;
}

// ───────── create-from-scratch flow ─────────
const NEW_STEPS = ['Create mod', 'Add submod', 'Add animations', 'Add conditions', 'Save to disk'];
function setupCard(active) {
  const steps = NEW_STEPS.map((s, i) => {
    const st = i < active ? 'done' : i === active ? 'now' : '';
    return `<div class="stp ${st}"><span class="stp-dot">${i < active ? ic('check', 12, 2.4) : i + 1}</span><span>${s}</span></div>${i < NEW_STEPS.length - 1 ? '<span class="stp-line"></span>' : ''}`;
  }).join('');
  return `<div class="setup"><div class="setup-head"><b>New mod setup</b><span class="set-desc">This card goes away after the first save.</span><span class="grow"></span><button class="link-quiet">Hide</button></div><div class="stps">${steps}</div></div>`;
}

function dialog(title, desc, body, actions, width = 620) {
  return `<div class="dialog-backdrop"><div class="dialog" style="width:${width}px">
    <div class="dialog-head"><div class="dialog-title">${title}</div>${desc ? `<div class="dialog-desc">${desc}</div>` : ''}</div>
    ${body}
    <div class="dialog-actions">${actions}</div>
  </div></div>`;
}
const fld = (label, value, ph = '', hint = '', mono) => `<label class="dlg-field"><span class="dlg-label">${label}</span><span class="set-input ${mono ? 'mono' : ''}"><input value="${esc(value)}" placeholder="${ph}"></span>${hint ? `<span class="set-desc">${hint}</span>` : ''}</label>`;
const opt = (on, title, sub) => `<div class="opt" aria-checked="${on}"><span class="radio"></span><span class="opt-text"><span>${title}</span><span class="set-desc mono">${sub}</span></span></div>`;

function newModDialog() {
  const body = `<div class="dlg-grid">
      ${fld('Mod name', 'Smooth Sneak Idle', '', 'Also used as the folder name.')}
      ${fld('Author', 'Smooth')}
    </div>
    ${fld('Description', '', 'Optional')}
    <div class="dlg-field"><span class="dlg-label">Create in</span>
      ${opt(true, 'Mod Organizer 2 mods folder', 'H:\\Game\\Fablerim\\mods  ·  found from ModOrganizer.ini')}
      ${opt(false, 'Another folder…', 'Vortex staging, a Data folder, or a work folder you zip later')}
    </div>
    <div class="dlg-field"><span class="dlg-label">Behavior project</span>
      <div style="display:flex;align-items:center;gap:10px"><div class="seg seg-sm"><button class="seg-btn" aria-pressed="true">Character (humanoid)</button><button class="seg-btn">Creature…</button></div><span class="set-desc">Decides <span class="mono">meshes\\actors\\<b>character</b>\\animations</span></span></div>
    </div>
    <div class="dlg-field"><span class="dlg-label">Will be created</span>
<pre class="code tree-prev">H:\\Game\\Fablerim\\mods\\
└─ <b>Smooth Sneak Idle</b>\\
   └─ meshes\\actors\\character\\animations\\OpenAnimationReplacer\\
      └─ <b>Smooth Sneak Idle</b>\\
         └─ <span class="s">config.json</span>   <span class="cm">{ "name", "author", "description" }</span></pre></div>`;
  return dialog('Create new mod', 'Makes the OAR folder structure and the mod’s <span class="mono">config.json</span>. Submods and animations come next.', body,
    `<button class="btn btn-quiet">Cancel</button><button class="btn btn-primary">${ic('plus', 14)}Create mod</button>`, 640);
}

function newSubmodDialog() {
  const body = `<div class="dlg-grid">
      ${fld('Submod name', 'Sneak_Idle')}
      ${fld('Priority', '1000', '', 'Higher is checked first — across <b>all</b> mods.', true)}
    </div>
    <div class="dlg-field"><span class="dlg-label">Start from</span>
      ${opt(true, 'Empty', 'No conditions, no animations')}
      ${opt(false, 'Copy a submod…', 'Conditions and settings from any loaded submod (e.g. RaySense - Cover Animation › Sneak_mt_Loop)')}
      ${opt(false, 'Template…', 'Sneaking · Weapon type · Female only · RaySense wall · …')}
    </div>
    <div class="dlg-field"><span class="dlg-label">Will be created</span>
<pre class="code tree-prev">…\\OpenAnimationReplacer\\Smooth Sneak Idle\\
└─ <b>1000_Sneak_Idle</b>\\
   └─ <span class="s">config.json</span>   <span class="cm">{ "name": "Sneak_Idle", "priority": 1000, "conditions": [] }</span></pre></div>`;
  return dialog('New submod', 'A submod is one set of replacement animations with its own priority and conditions.', body,
    `<button class="btn btn-quiet">Cancel</button><button class="btn btn-primary">${ic('plus', 14)}Create submod</button>`, 640);
}

function newModPage() {
  const row = (label, desc, ctl) => `<div class="set-row"><div class="set-row-text"><span>${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}</div><div class="set-control">${ctl}</div></div>`;
  return `<div class="mod-page"><div class="ed-col" style="max-width:1000px">
    ${setupCard(1)}
    <div class="ed-head"><div class="ed-head-text">
      <div class="ed-title">Smooth Sneak Idle</div>
      <div class="ed-path">mods\\Smooth Sneak Idle\\meshes\\actors\\character\\animations\\OpenAnimationReplacer\\Smooth Sneak Idle</div>
      <div class="ed-chips"><span class="tag">by Smooth</span><span class="tag">0 submods</span><span class="tag ok">config.json written</span></div>
    </div><div class="ed-head-actions"><button class="btn btn-primary">${ic('plus', 14)}New submod</button></div></div>
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Mod info</span><span class="sec-summary"></span></div><div class="sec-body">
      ${row('Mod name', '', '<label class="set-input w-lg"><input value="Smooth Sneak Idle"></label>')}
      ${row('Author', '', '<label class="set-input w-md"><input value="Smooth"></label>')}
      ${row('Description', '', '<label class="set-input w-lg"><input placeholder="No description"></label>')}
    </div></section>
    <section class="sec open"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Submods</span><span class="sec-count">0</span><span class="sec-summary"></span></div><div class="sec-body">
      <div class="empty-line">No submods yet.<span class="grow"></span><button class="btn btn-secondary" style="height:30px;font-size:12.5px">${ic('plus', 14)}New submod</button></div>
    </div></section>
  </div></div>`;
}

function newSubList() {
  return `<div class="sm-list">
    <div class="sm-head"><b>Submods</b><span>1</span><span class="grow"></span><button class="nav-btn">${ic('sort', 15)}</button><button class="nav-btn">${ic('plus', 15)}</button></div>
    <div class="sm-rows"><div class="sm-row" aria-selected="true"><span class="cb" aria-checked="true"></span>
      <span class="sm-text"><span class="sm-name"><span class="ell">Sneak_Idle</span><span class="mk-dirty">*</span></span><span class="sm-meta"><span class="sm-pri">1000</span>· 0 cond · 3 anim</span></span></div></div>
  </div>`;
}

function newHead(chips) {
  return `<div class="ed-head"><div class="ed-head-text">
      <div class="ed-title"><span class="ell">Sneak_Idle</span><span class="mk-dirty">*</span></div>
      <div class="ed-path">OpenAnimationReplacer\\Smooth Sneak Idle\\1000_Sneak_Idle</div>
      <div class="ed-chips">${chips}</div>
    </div><div class="ed-head-actions"><div class="seg seg-sm"><button class="seg-btn" aria-pressed="true">Editor</button><button class="seg-btn">JSON</button></div><span class="en-label">Enabled <span class="toggle" role="switch" aria-checked="true"></span></span></div></div>`;
}

const ANIMS = [
  ['sneak_idle_a.hkx', 'F:\\Work\\SneakIdle\\export', 'sneakmtidle.hkx', 'variant 1', '_variants_sneakmtidle\\sneak_idle_a.hkx', 'sel'],
  ['sneak_idle_b.hkx', 'F:\\Work\\SneakIdle\\export', 'sneakmtidle.hkx', 'variant 2', '_variants_sneakmtidle\\sneak_idle_b.hkx'],
  ['sneak_idle_1hm.hkx', 'F:\\Work\\SneakIdle\\export', 'sneak1hm_idle.hkx', '', 'sneak1hm_idle.hkx'],
];
function animSection(open, withPicker) {
  const rows = ANIMS.map(([src, dir, rep, v, out, f]) => `
    <div class="am-row" ${f ? 'aria-selected="true"' : ''}>
      <span class="am-src"><span class="ell">${src}</span><span class="set-desc mono ell">${esc(dir)}</span></span>
      <span class="am-arrow">${ic('chevronRight', 14)}</span>
      <span class="am-rep"><button class="mini-select ${f && withPicker ? 'focus' : ''}"><span class="mono">${rep}</span>${ic('chevronDown', 13)}</button>${v ? `<span class="tag">${v}</span>` : ''}</span>
      <span class="am-out mono ell">${esc(out)}</span>
      <button class="icon-btn" style="width:26px;height:26px">${ic('x', 14)}</button>
    </div>`).join('');
  const pick = withPicker ? `<div class="popover am-pick">
      <div class="picker-search"><label class="field">${ic('search', 15)}<input value="sneak"></label></div>
      <div class="pk-list">${[
        ['sneakmtidle.hkx', 'vanilla', 26, 'sel'], ['sneak1hm_idle.hkx', 'vanilla', 21], ['sneakh2h_idle.hkx', 'vanilla', 4], ['sneakrun_forward.hkx', 'vanilla', 4],
        ['sneakrun_backward.hkx', 'vanilla', 4], ['sneakwalk_forward.hkx', 'vanilla', 3], ['sneakbow_drawlight.hkx', 'vanilla', 3], ['sneakbow_idledrawn.hkx', 'vanilla', 2],
      ].map(([n, k, c, s]) => `<div class="pk-item" ${s ? 'aria-selected="true"' : ''}><span class="mono"><mark>sneak</mark>${n.slice(5)}</span><span class="hint">${c} submods use it</span></div>`).join('')}</div>
      <div class="picker-foot"><span>From <span class="mono">Skyrim - Animations.bsa</span> + loose files in this folder</span><span class="grow"></span><span><span class="kbd">Enter</span> pick</span></div>
    </div>` : '';
  return `<section class="sec ${open ? 'open' : ''}" style="position:relative">
    <div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Animation files</span><span class="sec-count">3</span>
      <span class="sec-summary"><span class="tag mono">sneakmtidle.hkx × 2 variants</span><span class="tag mono">sneak1hm_idle.hkx</span></span></div>
    <div class="sec-body">
      <div class="am-drop">${ic('upload', 16)}<span>Drop <span class="mono">.hkx</span> files or a folder here</span><span class="grow"></span><button class="btn btn-secondary" style="height:30px;font-size:12.5px">Browse…</button></div>
      <div class="am-head"><span>Your file</span><span></span><span>Replaces (original animation)</span><span>Saved in the submod as</span><span></span></div>
      ${rows}
      <div class="am-note">${ic('info', 14)}<span>Two files picked for the same animation become <b>variants</b> automatically — OAR picks one at random. Files are copied into the submod folder when you save.</span></div>
      ${pick}
    </div>
  </section>`;
}

function animPanel() {
  const rows = [
    ['RaySense - Cover Animation', 'Hide_Bow_Right_Enter', '2110000231'], ['RaySense - Cover Animation', 'Hide_Bow_Right_Loop', '2110000230'],
    ['RaySense - Cover Animation', '… 18 more', ''], ['Beam Walking Assist', 'Fence_Sneak_Enter', '2110000083'], ['Beam Walking Assist', 'Fence', '2110000080'],
    ['Smooth Moveset - bow', 'Sneak Idle', '83037007'], ['Smooth Moveset - bow', 'Sneak Base', '83037006'],
    ['Dynamic Bow Animation', 'Sneak Idle', '9900709'], ['Dynamic Bow Animation', 'Sneak Base', '9900708'],
  ];
  return `<aside class="rpanel"><div class="rp-head"><span class="grow">Animation</span><button class="icon-btn">${ic('x')}</button></div>
    <div class="rp-body">
      <div><div class="rp-name mono" style="color:var(--text);font-size:14px">sneakmtidle.hkx</div><div class="rp-desc" style="margin-top:6px">Vanilla animation</div></div>
      <dl class="rp-grid"><dt>Original</dt><dd class="mono" style="font-size:11.5px">meshes\\actors\\character\\animations\\sneakmtidle.hkx</dd><dt>Your files</dt><dd>2 (variants)</dd></dl>
      <div class="warn-box">${ic('info', 15)}<span><b>26 other submods</b> in 4 mods replace this animation, all with higher priority. Yours (1000) plays only when none of their conditions match.</span></div>
      <div class="rp-label">Also replaced by</div>
      <div class="cf-list">${rows.map(([m, s, p]) => `<div class="cf-row"><span class="ell"><span style="color:var(--text-5)">${esc(m)} ›</span> ${esc(s)}</span><span class="mono">${p}</span></div>`).join('')}
        <div class="cf-row you"><span class="ell"><span style="color:var(--text-5)">Smooth Sneak Idle ›</span> Sneak_Idle</span><span class="mono">1000</span></div></div>
      <button class="btn btn-secondary">Set priority above all (2110000232)</button>
    </div></aside>`;
}

function newConditions() {
  const tpl = [['IsSneaking', ''], ['IsWeaponDrawn', ''], ['IsEquippedType', 'Bows in left hand'], ['IsFemale', ''], ['IsInCombat', ''], ['RaySense_Wall', 'custom']];
  return `<section class="sec open">
    <div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Conditions</span><span class="sec-count">0</span><span class="sec-summary"></span></div>
    <div class="sec-body">
      <div class="cond-bar"><button class="btn btn-secondary">${ic('plus', 14)}Add condition</button><button class="btn btn-quiet">Condition set ${ic('chevronDown', 13)}</button></div>
      <div class="cond-empty">
        <div class="cond-empty-title">No conditions yet</div>
        <div class="set-desc" style="font-size:12.5px">Without conditions this submod always replaces its animations — unless a higher-priority submod matches first.</div>
        <div class="set-desc" style="margin-top:12px">Quick start</div>
        <div class="qs">${tpl.map(([n, c]) => `<button class="qs-btn">${ic('plus', 13)}<span class="${c === 'custom' ? 'custom' : ''}">${n}</span></button>`).join('')}</div>
        <div class="set-desc" style="margin-top:4px">Or copy conditions from another submod: open it, <span class="kbd">Condition set</span> › Copy, then Paste here.</div>
      </div>
    </div>
  </section>`;
}

function newSettingsCollapsed() {
  return `<section class="sec"><div class="sec-head"><span class="chev">${ic('chevronRight', 15)}</span><span class="sec-title">Submod settings</span><span class="sec-summary"><span class="tag mono">Priority 1000</span><span class="tag">Interruptible · off</span><span class="tag">Replace on loop · on</span><span class="tag">Replace on echo · off</span></span></div><div class="sec-body"></div></section>`;
}

function newEditor(step) {
  const chips = `<span class="tag">Author mode · config.json</span><span class="tag dirty">Unsaved: ${step === 'save' ? '3 files, 2 conditions' : '3 files'}</span>`;
  let mid;
  if (step === 'anims' || step === 'anims-pick') mid = newSettingsCollapsed() + animSection(true, step === 'anims-pick') + collapsed('Conditions', 0, '<span class="tag">none yet</span>');
  else if (step === 'conds') mid = newSettingsCollapsed() + animSection(false) + newConditions();
  else mid = newSettingsCollapsed() + animSection(false) + collapsed('Conditions', 2, '<span class="tag">IsSneaking</span><span class="tag">NOT IsWeaponDrawn</span>');
  const active = step === 'conds' ? 3 : step === 'save' ? 4 : 2;
  return `<div class="ed"><div class="ed-col">${setupCard(active)}${newHead(chips)}${mid}${collapsed('Functions', 0, '')}</div></div>`;
}

function newSavebar(text) {
  return `<div class="savebar"><span class="state"><span class="dot"></span>${text}</span><span class="grow"></span>
    <button class="btn btn-quiet">Discard</button><button class="btn btn-primary">${ic('save', 14)}Save config<span class="kbd">Ctrl S</span></button></div>`;
}

function saveDialog() {
  const li = (st, a, b) => `<div class="sv-row ${st}"><span class="sv-ic">${st === 'done' ? ic('check', 13, 2.2) : st === 'warn' ? '!' : '+'}</span><span class="grow">${a}</span><span class="set-desc mono">${b}</span></div>`;
  const body = `<div class="sv-list">
      <div class="sv-group">Already on disk</div>
      ${li('done', 'Mod folder and <span class="mono">config.json</span>', 'Smooth Sneak Idle\\')}
      ${li('done', 'Submod folder and <span class="mono">config.json</span>', '1000_Sneak_Idle\\')}
      <div class="sv-group">Will be written</div>
      ${li('', 'Update <span class="mono">config.json</span> — 2 conditions', '1000_Sneak_Idle\\config.json')}
      ${li('', 'Copy <span class="mono">sneak_idle_a.hkx</span>', '_variants_sneakmtidle\\sneak_idle_a.hkx')}
      ${li('', 'Copy <span class="mono">sneak_idle_b.hkx</span>', '_variants_sneakmtidle\\sneak_idle_b.hkx')}
      ${li('', 'Copy <span class="mono">sneak_idle_1hm.hkx</span>', 'sneak1hm_idle.hkx')}
      <div class="sv-group">Checks</div>
      ${li('done', 'JSON is valid and uses only built-in OAR conditions', 'no extra plugins needed')}
      ${li('warn', '26 submods replace <span class="mono">sneakmtidle.hkx</span> with higher priority', 'yours: 1000')}
    </div>
    <div class="next-box"><b>After saving</b><span>Mod Organizer 2: press <span class="kbd">F5</span> to refresh, then tick <b>Smooth Sneak Idle</b> in the left pane.</span><span>In game: open the OAR menu › Replacer Mods to check it loaded.</span></div>`;
  return dialog('Save to disk', 'Review what will be written. Nothing outside <span class="mono">mods\\Smooth Sneak Idle\\</span> is touched.', body,
    `<button class="btn btn-quiet">Cancel</button><button class="btn btn-primary">${ic('save', 14)}Write 4 files</button>`, 680);
}

// ───────── screens ─────────
const SCREENS = {
  editor: { label: 'Submod · conditions', main: () => toolbar(['Fablerim mods', 'RaySense - Cover Animation', 'Hide_Front_R_Exit'], 'Filter submods') + `<div class="oar-body">${subList()}${editor()}${rpanel('cond')}</div>` + savebar() },
  picker: { label: 'Add condition', main: () => toolbar(['Fablerim mods', 'RaySense - Cover Animation', 'Hide_Front_R_Exit'], 'Filter submods') + `<div class="oar-body">${subList()}${editor({ picker: true })}${rpanel('cond')}</div>` + savebar() },
  settings: { label: 'Submod settings', main: () => toolbar(['Fablerim mods', 'RaySense - Cover Animation', 'Hide_Front_R_Exit'], 'Filter submods') + `<div class="oar-body">${subList()}${editor({ settingsOpen: true })}</div>` + savebar() },
  json: { label: 'JSON', main: () => toolbar(['Fablerim mods', 'RaySense - Cover Animation', 'Hide_Front_R_Exit'], 'Filter submods') + `<div class="oar-body">${subList()}${jsonView()}${rpanel('json')}</div>` + savebar() },
  mod: { label: 'Mod', main: () => toolbar(['Fablerim mods', 'RaySense - Cover Animation'], 'Filter submods') + `<div class="oar-body">${modPage()}</div>` + savebar() },
  start: { label: 'Start', main: () => `<div class="oar-body">${startPage()}</div>` },
  // create from scratch
  'c-mod': { label: '1 New mod', mode: 'author', main: () => `<div class="oar-body">${startPage()}</div>`, overlay: newModDialog },
  'c-submod': { label: '2 New submod', mode: 'author', main: () => toolbar(['Fablerim mods', 'Smooth Sneak Idle'], 'Filter submods') + `<div class="oar-body">${newModPage()}</div>`, overlay: newSubmodDialog },
  'c-anims': { label: '3 Animations', mode: 'author', main: () => toolbar(['Fablerim mods', 'Smooth Sneak Idle', 'Sneak_Idle'], 'Filter submods') + `<div class="oar-body">${newSubList()}${newEditor('anims')}${animPanel()}</div>` + newSavebar('3 files to copy <small>· not written yet</small>') },
  'c-pick': { label: '3b Pick original', mode: 'author', main: () => toolbar(['Fablerim mods', 'Smooth Sneak Idle', 'Sneak_Idle'], 'Filter submods') + `<div class="oar-body">${newSubList()}${newEditor('anims-pick')}${animPanel()}</div>` + newSavebar('3 files to copy <small>· not written yet</small>') },
  'c-conds': { label: '4 Conditions', mode: 'author', main: () => toolbar(['Fablerim mods', 'Smooth Sneak Idle', 'Sneak_Idle'], 'Filter submods') + `<div class="oar-body">${newSubList()}${newEditor('conds')}</div>` + newSavebar('3 files to copy <small>· not written yet</small>') },
  'c-save': { label: '5 Save', mode: 'author', main: () => toolbar(['Fablerim mods', 'Smooth Sneak Idle', 'Sneak_Idle'], 'Filter submods') + `<div class="oar-body">${newSubList()}${newEditor('save')}</div>` + newSavebar('3 files to copy, 2 conditions <small>· not written yet</small>'), overlay: saveDialog },
};

function render() {
  const key = (location.hash.slice(1).split('?')[0]) || 'editor';
  const s = SCREENS[key] ?? SCREENS.editor;
  document.body.classList.toggle('shot', new URLSearchParams(location.search).has('shot'));
  const sw = Object.entries(SCREENS).map(([k, v]) => `${k === 'c-mod' ? '<span>Create</span>' : ''}<a href="#${k}" aria-current="${k === key}">${v.label}</a>`).join('');
  document.getElementById('app').innerHTML = `<div class="app">${titlebar(s.mode)}
    <div class="shell-body">${sidebar(key)}<main class="main">${s.main()}</main></div></div>
    ${s.overlay ? s.overlay() : ''}
    <nav class="mock-switch"><span>Edit</span>${sw}</nav>`;
  document.title = `${s.label} · OAR External Tool 2.0 mockup`;
}

document.addEventListener('click', (e) => {
  const head = e.target.closest('.sec-head');
  if (head && !e.target.closest('button')) head.parentElement.classList.toggle('open');
  const row = e.target.closest('.cond-row');
  if (row) row.parentElement.classList.toggle('open');
  const sw = e.target.closest('[role="switch"]');
  if (sw) sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
  const cb = e.target.closest('.cb');
  if (cb) cb.setAttribute('aria-checked', String(cb.getAttribute('aria-checked') !== 'true'));
});
window.addEventListener('hashchange', render);
render();
