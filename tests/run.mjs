// Model unit tests (no files needed). node tests/run.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse, stringify, stringifyLike } from '../web/js/model/json.js';
import { Schema, argumentText, viewValue, migrateLegacy, LEGACY } from '../web/js/model/schema.js';
import { Workspace, targetOf, isVariant } from '../web/js/model/workspace.js';

const schema = new Schema(JSON.parse(fs.readFileSync(new URL('../web/data/conditions.json', import.meta.url), 'utf8')));
let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok ${n} ${name}`); };

test('first of repeated keys wins (rapidjson FindMember)', () => {
  const info = { duplicates: [] };
  const doc = parse('{ "a": 1, "b": 2, "a": 3 }', info);
  assert.equal(doc.a, 1);
  assert.deepEqual(info.duplicates, ['a']);
});

test('invalid JSON reports line and column', () => {
  assert.throws(() => parse('{\n  "a": [1, 2\n}'), /line 3, column 1/);
});

test('writer matches OAR float/int layout', () => {
  const text = stringify({ priority: 5, conditions: [{ condition: 'X', 'Value A': { value: 1 }, P: [0, 1.5, 2] }], blendTimeOnLoop: 0.2 });
  assert.match(text, /"priority": 5,/);
  assert.match(text, /"value": 1\.0/);
  assert.match(text, /\[\r\n {16}0\.0,\r\n {16}1\.5,\r\n {16}2\.0\r\n/);
  assert.match(text, /"blendTimeOnLoop": 0\.2/);
  assert.ok(!text.endsWith('\n'));
});

test('stringifyLike keeps LF, tabs and a final newline', () => {
  const src = '{\n\t"a": 1\n}\n';
  assert.equal(stringifyLike(parse(src), src), src);
});

test('variants paths map to the animation they replace', () => {
  assert.equal(targetOf('_variants_mt_idle\\a.hkx'), 'mt_idle.hkx');
  assert.equal(targetOf('male\\_variants_mt_idle\\b.hkx'), 'male\\mt_idle.hkx');
  assert.equal(targetOf('1hm_idle.hkx'), '1hm_idle.hkx');
  assert.ok(isVariant('_variants_x\\y.hkx') && !isVariant('x.hkx'));
});

test('user.json data over config.json info, as OAR loads it', () => {
  const ws = new Workspace({
    root: 'R', mods: [{
      path: 'R\\M', folder: 'M', project: 'Character', config: '{"name":"Mod"}', submods: [{
        path: 'R\\M\\S', folder: 'S', files: ['a.hkx'],
        config: '{"name":"Original","description":"d","priority":1,"conditions":[]}',
        user: '{"priority":9,"conditions":[{"condition":"IsSneaking","requiredVersion":"1.0.0.0"}]}',
      }],
    }],
  }, null, schema);
  const s = ws.mods[0].submods[0];
  assert.equal(ws.mods[0].project, 'character');
  assert.equal(s.name, 'Original');
  assert.equal(s.priority, 9);
  assert.equal(s.doc.conditions.length, 1);
  assert.equal(s.dirty, false);
  const user = s.saveTarget('user');
  assert.ok(!user.text.includes('"name"') && user.file.endsWith('user.json'));
  const author = s.saveTarget('author');
  assert.ok(author.text.includes('"name": "Original"') && author.file.endsWith('config.json'));
});

test('legacy Random value is read like OAR and rewritten on edit', () => {
  const obj = { condition: 'Random', requiredVersion: '1.0.0.0', 'Random value': { min: 0.25, max: 0.75 }, Comparison: '<', 'Numeric value': { value: 0.5 } };
  const def = schema.def('Random');
  assert.deepEqual(viewValue(obj, def.components[1]), { value: 0.25 });
  assert.equal(argumentText(obj, schema), 'random(0.25–0.75) < 0.5');
  assert.ok(migrateLegacy(obj));
  assert.ok(!(LEGACY.Random.key in obj));
  assert.deepEqual(obj['Maximum random value'], { value: 0.75 });
});

test('argument text for common shapes', () => {
  assert.equal(argumentText({ condition: 'IsEquippedType', Type: { value: 7 }, 'Left hand': true }, schema), 'Bow in left hand');
  assert.equal(argumentText({ condition: 'CompareValues', 'Value A': { value: 1 }, Comparison: '==', 'Value B': { form: { pluginName: 'A.esp', formID: '801' } } }, schema), '1 == A.esp|0x801');
  assert.equal(argumentText({ condition: 'OR', Conditions: [{}, {}] }, schema), '2 conditions');
});

test('new entries carry plugin and defaults', () => {
  const w = schema.create('RaySense_Wall');
  assert.equal(w.requiredPlugin, 'Open Animation Replacer - RaySense');
  assert.equal(w.Comparison, '==');
  assert.deepEqual(w.Distance, { value: 0 });
});

console.log(`${n} tests passed`);
