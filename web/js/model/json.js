// JSON text <-> objects, written the way Open Animation Replacer writes its configs
// (rapidjson PrettyWriter: 4-space indent, "key": value, floats always with a fraction, CRLF on Windows,
// no trailing newline). Unchanged files are never rewritten, so this only matters for files we save.

// Keys whose numbers OAR stores as float (written as 1.0, not 1).
const FLOAT_KEYS = new Set(['value', 'weight', 'min', 'max', 'blendTimeOnInterrupt', 'blendTimeOnLoop', 'blendTimeOnEcho']);
// Arrays of floats (NiPoint3 components) are detected by shape: exactly three numbers.

/**
 * Strict JSON parse with one OAR-specific rule: when an object repeats a key, the FIRST value wins
 * (rapidjson FindMember returns the first match; JSON.parse would keep the last).
 * Repeated keys are reported through `info.duplicates` so the UI can warn about them.
 * @param {string} text
 * @param {{ duplicates?: string[] }} [info]
 */
export function parse(text, info) {
  if (text == null) return null;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const s = text;
  const fail = (msg) => {
    const before = s.slice(0, i);
    const line = before.split('\n').length;
    const col = i - before.lastIndexOf('\n');
    throw new SyntaxError(`${msg} at line ${line}, column ${col}`);
  };
  const ws = () => { while (i < s.length && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++; };
  const str = () => {
    const start = i;
    i++;
    while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; i++; }
    if (i >= s.length) fail('Unterminated string');
    i++;
    return JSON.parse(s.slice(start, i));
  };
  const value = (path) => {
    ws();
    const c = s[i];
    if (c === '{') {
      i++;
      const obj = {};
      ws();
      if (s[i] === '}') { i++; return obj; }
      for (;;) {
        ws();
        if (s[i] !== '"') fail('Expected a key');
        const key = str();
        ws();
        if (s[i] !== ':') fail('Expected ":"');
        i++;
        const v = value(`${path}.${key}`);
        if (Object.prototype.hasOwnProperty.call(obj, key)) info?.duplicates?.push(`${path}.${key}`.slice(1));
        else obj[key] = v;
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return obj; }
        fail('Expected "," or "}"');
      }
    }
    if (c === '[') {
      i++;
      const arr = [];
      ws();
      if (s[i] === ']') { i++; return arr; }
      for (;;) {
        arr.push(value(`${path}[${arr.length}]`));
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return arr; }
        fail('Expected "," or "]"');
      }
    }
    if (c === '"') return str();
    const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(s.slice(i, i + 40));
    if (!m) fail('Unexpected character');
    i += m[0].length;
    return m[0] === 'true' ? true : m[0] === 'false' ? false : m[0] === 'null' ? null : Number(m[0]);
  };
  const result = value('');
  ws();
  if (i < s.length) fail('Unexpected text after the end');
  return result;
}

/** Line ending used by an existing file (default CRLF like OAR on Windows). */
export function newlineOf(text) {
  if (!text) return '\r\n';
  const i = text.indexOf('\n');
  return i > 0 && text[i - 1] === '\r' ? '\r\n' : i >= 0 ? '\n' : '\r\n';
}

/** Indent used by an existing file (default 4 spaces). */
export function indentOf(text) {
  const m = text && /^﻿?[{[]\r?\n([ \t]+)\S/.exec(text);
  return m ? m[1] : '    ';
}

function num(n, asFloat) {
  if (!Number.isFinite(n)) return '0.0';
  if (asFloat && Number.isInteger(n)) return n.toFixed(1);
  return String(n);
}

/**
 * @param {any} value
 * @param {{ newline?: string, indent?: string, finalNewline?: boolean }} [style]
 */
export function stringify(value, style = {}) {
  const nl = style.newline ?? '\r\n';
  const unit = style.indent ?? '    ';
  const out = [];
  const write = (v, depth, key, inPoint) => {
    if (v === null || v === undefined) { out.push('null'); return; }
    switch (typeof v) {
      case 'number': out.push(num(v, inPoint || FLOAT_KEYS.has(key))); return;
      case 'boolean': out.push(v ? 'true' : 'false'); return;
      case 'string': out.push(JSON.stringify(v)); return;
      default: break;
    }
    const pad = unit.repeat(depth + 1);
    const end = unit.repeat(depth);
    if (Array.isArray(v)) {
      if (v.length === 0) { out.push('[]'); return; }
      const point = v.length === 3 && v.every((x) => typeof x === 'number');
      out.push('[', nl);
      v.forEach((item, i) => {
        out.push(pad);
        write(item, depth + 1, key, point);
        out.push(i < v.length - 1 ? ',' : '', nl);
      });
      out.push(end, ']');
      return;
    }
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (keys.length === 0) { out.push('{}'); return; }
    out.push('{', nl);
    keys.forEach((k, i) => {
      out.push(pad, JSON.stringify(k), ': ');
      write(v[k], depth + 1, k, false);
      out.push(i < keys.length - 1 ? ',' : '', nl);
    });
    out.push(end, '}');
  };
  write(value, 0, '', false);
  if (style.finalNewline) out.push(nl);
  return out.join('');
}

/** Stringify keeping an existing file's newline/indent/final-newline style. */
export function stringifyLike(value, originalText) {
  return stringify(value, {
    newline: newlineOf(originalText),
    indent: indentOf(originalText),
    finalNewline: !!originalText && /\r?\n$/.test(originalText),
  });
}

export function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}
