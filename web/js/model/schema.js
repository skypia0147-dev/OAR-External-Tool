// Condition and function definitions (generated from OAR + RaySense source by tools/gen_conditions.py),
// plus helpers to create new entries and to describe existing ones the way OAR's UI does.

// Common fields every condition/function may carry besides its components.
export const COMMON_KEYS = ['condition', 'function', 'requiredPlugin', 'requiredVersion', 'disabled', 'negated', 'essential', 'comment'];

export const COMPARISONS = ['==', '!=', '>', '>=', '<', '<='];
export const ACTOR_VALUE_TYPES = ['Value', 'Base', 'Max', 'Percentage'];
export const GRAPH_VARIABLE_TYPES = ['Float', 'Int', 'Bool'];
export const STATE_SCOPES = ['Local', 'Submod', 'Replacer mod', 'Reference'];

// Browsing groups for the "Add condition" picker. Anything not listed lands in "Other".
const CATEGORY_ORDER = [
  ['Core', ['AND', 'OR', 'XOR', 'TARGET', 'PLAYER', 'MOUNT', 'PRESET']],
  ['Actor Status', ['IsFemale', 'IsChild', 'IsPlayerTeammate', 'IsUnique', 'IsGuard', 'IsSummoned', 'IsTalking', 'IsGreetingPlayer',
    'IsDoingFavor', 'IsInScene', 'IsInCombat', 'IsCombatSearching', 'IsCrimeSearching', 'IsTrespassing', 'IsOnMount', 'IsBeingRidden',
    'IsOnStairs', 'IsOverEncumbered', 'IsAttacking', 'IsBlocking', 'IsRunning', 'IsSneaking', 'IsSprinting', 'IsInAir', 'IsWeaponDrawn',
    'IsSwimming', 'IsGhost', 'IsAboveWater', 'IsStaggered', 'IsMovementDirection', 'Level', 'Scale', 'Height', 'Weight', 'LifeState',
    'SitSleepState', 'MovementSpeed', 'IdleTime']],
  ['Items & Combat', ['IsEquipped', 'IsEquippedType', 'IsEquippedHasKeyword', 'IsEquippedPower', 'IsEquippedShout', 'IsEquippedHasEnchantment',
    'IsEquippedHasEnchantmentWithKeyword', 'IsWorn', 'IsWornHasKeyword', 'IsWornInSlot', 'IsWornInSlotHasKeyword', 'InventoryCount',
    'InventoryCountHasKeyword', 'InventoryWeight', 'EquippedObjectWeight', 'CurrentCastingType', 'CurrentDeliveryType', 'CastingSpell',
    'AttackState', 'IsAttackTypeKeyword', 'IsAttackTypeFlag']],
  ['Environment', ['IsInInterior', 'IsInLocation', 'IsParentCell', 'IsWorldSpace', 'LocationCleared', 'LocationHasKeyword', 'HasRefType',
    'CurrentWeather', 'CurrentWeatherHasFlag', 'CurrentGameTime', 'LightLevel', 'SurfaceMaterial', 'WindSpeed', 'WindAngleDifference']],
  ['Actor Data', ['IsForm', 'IsActorBase', 'IsRace', 'IsClass', 'IsCombatStyle', 'IsVoiceType', 'HasKeyword', 'HasPerk', 'HasSpell',
    'HasMagicEffect', 'HasMagicEffectWithKeyword', 'MagicEffectElapsedTime', 'HasGraphVariable', 'IsInFaction', 'FactionRank', 'CrimeGold',
    'IsRiding', 'IsRidingHasKeyword', 'IsBeingRiddenBy', 'CurrentFurniture', 'CurrentFurnitureHasKeyword']],
  ['Comparison', ['CompareValues', 'Random', 'CurrentMovementSpeed', 'CurrentRotationSpeed', 'MovementSurfaceAngle', 'SubmergeLevel',
    'FallDistance', 'FallDamage']],
  ['Quest & Scene', ['IsQuestStageDone', 'IsInSpecifiedScene', 'IsScenePlaying', 'IsCurrentPackage', 'CurrentPackageType', 'IsCombatState',
    'HasTarget', 'CurrentTargetDistance', 'CurrentTargetRelationship', 'CurrentTargetRelativeAngle', 'CurrentTargetLineOfSight']],
  ['Misc', ['IsMenuOpen', 'IsReplacerEnabled']],
];

export class Schema {
  /** @param {{ items: any[] }} data */
  constructor(data) {
    this.items = data.items;
    this.conditions = new Map();
    this.functions = new Map();
    for (const it of data.items) (it.kind === 'function' ? this.functions : this.conditions).set(it.name, it);
  }

  def(name, kind = 'condition') {
    return (kind === 'function' ? this.functions : this.conditions).get(name) ?? null;
  }

  /** [{ name, items: [def] }] for the picker; plugin conditions grouped by plugin. */
  categories(kind = 'condition') {
    if (kind === 'function') return [{ name: 'Functions', items: [...this.functions.values()] }];
    const used = new Set();
    const groups = [];
    for (const [name, names] of CATEGORY_ORDER) {
      const items = names.map((n) => this.conditions.get(n)).filter(Boolean);
      items.forEach((i) => used.add(i.name));
      groups.push({ name, items });
    }
    const byPlugin = new Map();
    const other = [];
    for (const it of this.conditions.values()) {
      if (used.has(it.name)) continue;
      if (it.plugin) {
        const label = it.plugin.replace(/^Open Animation Replacer - /, '');
        if (!byPlugin.has(label)) byPlugin.set(label, []);
        byPlugin.get(label).push(it);
      } else other.push(it);
    }
    if (other.length) groups.push({ name: 'Other', items: other });
    for (const [name, items] of byPlugin) groups.push({ name, items, plugin: true });
    return groups;
  }

  /** A new condition/function object with default component values. */
  create(name, kind = 'condition') {
    const d = this.def(name, kind);
    const obj = { [kind === 'function' ? 'function' : 'condition']: name };
    if (d?.plugin) obj.requiredPlugin = d.plugin;
    obj.requiredVersion = d?.version ?? '1.0.0.0';
    for (const c of d?.components ?? []) obj[c.key] = defaultFor(c);
    return obj;
  }
}

export function defaultFor(component) {
  switch (component.type) {
    case 'numeric': return { value: component.enum ? component.enum[0][0] : 0 };
    case 'bool': return false;
    case 'comparison': return '==';
    case 'form': return { pluginName: '', formID: '' };
    case 'keyword': return { editorID: '' };
    case 'text': return '';
    case 'point3': return [0, 0, 0];
    case 'conditions': return [];
    case 'functions': return [];
    case 'conditionFunctions': return { conditions: [], functions: [] };
    case 'state': return { scope: 'Local', shouldResetOnLoopOrEcho: false };
    case 'preset': return '';
    default: return null;
  }
}

export function kindOf(obj) {
  return obj && typeof obj === 'object' && 'function' in obj && !('condition' in obj) ? 'function' : 'condition';
}

export function nameOf(obj) {
  return obj?.condition ?? obj?.function ?? '';
}

// ───────── argument text (second column, like OAR's GetArgument) ─────────

/** C++ std::format("{:.3}") — three significant digits, general format. */
export function fmt3(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  const s = Number(n.toPrecision(3));
  return Math.abs(s) >= 1e6 ? s.toExponential(2).replace('e+', 'e+0') : String(s);
}

export function formText(f) {
  if (!f || typeof f !== 'object') return '(none)';
  if (!f.pluginName && !f.formID) return '(none)';
  return `${f.pluginName || '?'}|0x${String(f.formID || '').toUpperCase()}`;
}

export function numericText(v, comp) {
  if (!v || typeof v !== 'object') return '(invalid)';
  if ('value' in v) {
    if (comp?.enum) {
      const hit = comp.enum.find(([k]) => k === Math.trunc(v.value));
      if (hit) return hit[1];
    }
    return fmt3(v.value);
  }
  if ('form' in v) return formText(v.form);
  if ('actorValue' in v) {
    const t = v.actorValueType ?? 'Value';
    const base = `AV ${v.actorValue}`;
    return t === 'Base' ? `Base ${base}` : t === 'Max' ? `Max ${base}` : t === 'Percentage' ? `${base}%` : base;
  }
  if ('graphVariable' in v) return String(v.graphVariable);
  return '(invalid)';
}

export function componentText(value, comp) {
  switch (comp.type) {
    case 'numeric': return numericText(value, comp);
    case 'bool': return value ? 'true' : 'false';
    case 'comparison': return String(value ?? '');
    case 'form': return formText(value);
    case 'keyword': return value?.editorID ? value.editorID : value?.form ? formText(value.form) : '(none)';
    case 'text': return String(value ?? '');
    case 'point3': return Array.isArray(value) ? `(${value.join(', ')})` : '';
    case 'preset': return String(value ?? '');
    case 'conditions': return countText(value?.length ?? 0, 'condition');
    case 'functions': return countText(value?.length ?? 0, 'function');
    case 'conditionFunctions': return `${countText(value?.conditions?.length ?? 0, 'condition')}, ${countText(value?.functions?.length ?? 0, 'function')}`;
    case 'state': return value?.scope ?? '';
    default: return '';
  }
}

export function countText(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** One-line summary of an entry's arguments, OAR style for the common shapes. */
export function argumentText(obj, schema) {
  const kind = kindOf(obj);
  const name = nameOf(obj);
  const d = schema.def(name, kind);
  if (!d) {
    const extra = Object.keys(obj).filter((k) => !COMMON_KEYS.includes(k));
    return extra.length ? `${extra.length} field${extra.length === 1 ? '' : 's'}` : '';
  }
  const comps = d.components;
  if (comps.length === 0) return '';
  const val = (c) => viewValue(obj, c);
  const byType = (t) => comps.filter((c) => c.type === t);
  // multi-condition entries (AND/OR/XOR/TARGET/PLAYER/MOUNT)
  if (comps.length === 1 && comps[0].type === 'conditions') return countText(obj[comps[0].key]?.length ?? 0, 'condition');
  const cmp = byType('comparison')[0];
  const nums = byType('numeric');
  if (name === 'IsEquippedType' || name === 'IsEquippedHasKeyword') {
    const first = comps[0];
    return `${componentText(val(first), first)} in ${obj['Left hand'] ? 'left' : 'right'} hand`;
  }
  if (name === 'Random') {
    const [mn, mx, , n] = [comps[1], comps[2], comps[3], comps[4]];
    return `random(${componentText(val(mn), mn)}–${componentText(val(mx), mx)}) ${obj[cmp.key] ?? '<'} ${componentText(val(n), n)}`;
  }
  if (cmp && nums.length >= 2) {
    const a = nums[nums.length - 2];
    const b = nums[nums.length - 1];
    return `${componentText(val(a), a)} ${obj[cmp.key] ?? '=='} ${componentText(val(b), b)}`;
  }
  if (cmp && nums.length === 1) return `${obj[cmp.key] ?? '=='} ${componentText(val(nums[0]), nums[0])}`;
  return comps.filter((c) => c.type !== 'state').map((c) => componentText(val(c), c)).filter(Boolean).join(', ');
}

// Older field layouts OAR still reads. OAR loads them into the current components (the old value wins)
// and writes only the current keys when it saves; the editor shows them the same way and converts an
// entry only when the user edits it.
export const LEGACY = {
  // before OAR 2.3.0: "Random value": { "min": 0.0, "max": 1.0 }
  Random: {
    key: 'Random value',
    since: '2.3.0',
    map: {
      'Minimum random value': (v) => ({ value: typeof v?.min === 'number' ? v.min : 0 }),
      'Maximum random value': (v) => ({ value: typeof v?.max === 'number' ? v.max : 1 }),
    },
  },
};

/** Value of a component as OAR would load it (current key, or the legacy field it replaces). */
export function viewValue(obj, comp) {
  const legacy = LEGACY[nameOf(obj)];
  if (legacy && obj[legacy.key] !== undefined && legacy.map[comp.key]) return legacy.map[comp.key](obj[legacy.key]);
  return obj[comp.key];
}

export function legacyOf(obj) {
  const legacy = LEGACY[nameOf(obj)];
  return legacy && obj[legacy.key] !== undefined ? legacy : null;
}

/** Rewrite a legacy entry in the current layout (what OAR does when it saves). */
export function migrateLegacy(obj) {
  const legacy = legacyOf(obj);
  if (!legacy) return false;
  const old = obj[legacy.key];
  for (const [k, f] of Object.entries(legacy.map)) obj[k] = f(old);
  delete obj[legacy.key];
  return true;
}

/** Components a stored entry has that its definition doesn't know (kept as-is on save). */
export function unknownKeys(obj, def) {
  const known = new Set([...COMMON_KEYS, ...(def?.components ?? []).map((c) => c.key)]);
  const legacy = LEGACY[nameOf(obj)];
  if (legacy) known.add(legacy.key);
  return Object.keys(obj).filter((k) => !known.has(k));
}
