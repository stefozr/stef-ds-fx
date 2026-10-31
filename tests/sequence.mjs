// buildSequence against a recording fake of Sequencer (plain Node): order of steps, tier scaling, crit flourish,
// meleeRanged choice, area placements, missing files skipped.
import assert from "node:assert/strict";

const SETTINGS = { volume: 0.6, tierScale: "0.7, 1, 1.3", areaEffects: true, debug: false, hitFlash: true, screenShake: true };
globalThis.game = { settings: { get: (_m, k) => SETTINGS[k] } };
globalThis.canvas = { grid: { size: 100 } };

const DB = new Set(["fx.cast", "fx.bolt", "fx.swing", "fx.arrow", "fx.impact", "fx.crit", "fx.burst", "fx.line", "snd.cast", "snd.hit"]);
globalThis.Sequencer = { Database: { flattenedEntries: [...DB] } };

class FakeSection {
  constructor(seq, kind) { this.seq = seq; this.kind = kind; this.calls = []; }
}
const METHODS = ["file", "atLocation", "stretchTo", "scaleToObject", "waitUntilFinished", "delay", "size", "belowTokens", "volume", "locally",
  "copySprite", "attachTo", "filter", "fadeIn", "fadeOut", "duration", "opacity", "shake"];
for (const m of METHODS) FakeSection.prototype[m] = function (...args) { this.calls.push([m, ...args]); return this; };
globalThis.Sequence = class {
  constructor(opts) { this.opts = opts; this.sections = []; }
  effect() { const s = new FakeSection(this, "effect"); this.sections.push(s); return s; }
  sound() { const s = new FakeSection(this, "sound"); this.sections.push(s); return s; }
  canvasPan() { const s = new FakeSection(this, "pan"); this.sections.push(s); return s; }
};

const { buildSequence } = await import("../scripts/play/sequence.mjs");
const { variantOf } = await import("../scripts/play/assets.mjs");

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; } catch (err) { console.log(`FAIL ${name}\n${err.stack}`); process.exitCode = 1; }
};
const token = (name, x, y, size = 1) => ({ name, center: { x, y }, w: size * 100, h: size * 100, document: { width: size } });
const arg = (section, method) => section.calls.find(c => c[0] === method)?.slice(1);
const files = seq => seq.sections.filter(s => s.kind !== "pan" && !arg(s, "copySprite")).map(s => `${s.kind}:${arg(s, "file")[0]}`);

const caster = token("caster", 50, 50);
const near = token("near", 150, 50);
const far = token("far", 850, 50);

const bolt = {
  mode: "auto", delivery: "bolt",
  cast: { files: ["fx.cast"], sound: ["snd.cast"] },
  travel: { kind: "projectile", files: ["missing.bolt", "fx.bolt"], sound: [] },
  rangedTravel: null,
  impact: { files: ["fx.impact"], sound: ["snd.hit"], crit: ["fx.crit"] },
  area: null,
};

test("bolt: cast sound, cast, travel per target, impact sound, impacts scaled by tier, crit flourish", () => {
  const seq = buildSequence({ source: caster, targets: [{ token: near, tier: 1, crit: false }, { token: far, tier: 3, crit: true }] }, bolt);
  assert.deepEqual(files(seq), [
    "sound:snd.cast", "effect:fx.cast", "effect:fx.bolt", "effect:fx.bolt", "sound:snd.hit",
    "effect:fx.impact", "effect:fx.impact", "effect:fx.crit",
  ]);
  const [, cast, , lastTravel, , imp1, imp3] = seq.sections;
  assert.ok(arg(cast, "waitUntilFinished"), "cast waits");
  assert.ok(arg(lastTravel, "waitUntilFinished"), "last travel waits");
  assert.ok(Math.abs(arg(imp1, "scaleToObject")[0] - 1.5 * 0.7) < 1e-9);
  assert.ok(Math.abs(arg(imp3, "scaleToObject")[0] - 1.5 * 1.3) < 1e-9);
  assert.equal(seq.sections[1].calls.some(c => c[0] === "locally"), false);
});

test("local preview marks every section", () => {
  const seq = buildSequence({ source: caster, targets: [{ token: near, tier: 2, crit: false }] }, bolt, { local: true });
  assert.ok(seq.sections.every(s => s.calls.some(c => c[0] === "locally")));
});

test("meleeRanged: swing at adjacent, shot at far", () => {
  const recipe = { ...bolt, cast: null, travel: { kind: "melee", files: ["fx.swing"], sound: [] }, rangedTravel: { kind: "projectile", files: ["fx.arrow"], sound: [] } };
  const seq = buildSequence({ source: caster, targets: [{ token: near, tier: 2 }, { token: far, tier: 2 }] }, recipe);
  assert.deepEqual(files(seq).filter(f => !f.includes("impact") && !f.includes("snd")), ["effect:fx.swing", "effect:fx.arrow"]);
});

test("burst around the caster sized by radius; no targets: no impact", () => {
  const recipe = { ...bolt, delivery: "burst", travel: null, area: { kind: "burst", files: ["fx.burst"], sound: [] } };
  const seq = buildSequence({ source: caster, targets: [], item: { system: { distance: { primary: 2 } } } }, recipe);
  assert.deepEqual(files(seq), ["sound:snd.cast", "effect:fx.cast", "effect:fx.burst"]);
  assert.deepEqual(arg(seq.sections[2], "size")[0], { width: 500, height: 500 });
});

test("line from cached shapes; missing area shapes skip the area", () => {
  const recipe = { ...bolt, cast: null, travel: null, area: { kind: "line", files: ["fx.line"], sound: [] } };
  const seq = buildSequence({ source: caster, targets: [], shapes: [{ type: "line", x: 0, y: 0, length: 300, rotation: 0, width: 100 }] }, recipe);
  assert.deepEqual(files(seq), ["effect:fx.line"]);
  assert.deepEqual(arg(seq.sections[0], "stretchTo")[0], { x: 300, y: 0 });
  assert.equal(buildSequence({ source: caster, targets: [], shapes: null }, recipe), null);
});

test("self without targets lands on the caster", () => {
  const recipe = { ...bolt, delivery: "self", cast: null, travel: null };
  const seq = buildSequence({ source: caster, targets: [] }, recipe);
  assert.deepEqual(files(seq), ["sound:snd.hit", "effect:fx.impact"]);
  assert.equal(arg(seq.sections[1], "atLocation")[0], caster);
});

test("nothing available: null; mode none: null; volume 0: no sounds", () => {
  const empty = { ...bolt, cast: { files: ["nope"], sound: [] }, travel: null, impact: { files: ["nope"], sound: [], crit: [] } };
  assert.equal(buildSequence({ source: caster, targets: [{ token: near, tier: 2 }] }, empty), null);
  assert.equal(buildSequence({ source: caster, targets: [] }, { mode: "none" }), null);
  SETTINGS.volume = 0;
  const seq = buildSequence({ source: caster, targets: [{ token: near, tier: 2 }] }, bolt);
  assert.ok(seq.sections.every(s => s.kind === "effect"));
  SETTINGS.volume = 0.6;
});

test("tier feel: tier 1 fainter, tier 3 flashes the target and shakes the screen once; settings turn them off", () => {
  const seq = buildSequence({ source: caster, targets: [{ token: near, tier: 1 }, { token: far, tier: 3 }, { token: caster, tier: 3 }] }, bolt);
  const impacts = seq.sections.filter(s => arg(s, "file")?.[0] === "fx.impact");
  assert.deepEqual(arg(impacts[0], "opacity"), [0.75]);
  assert.equal(arg(impacts[1], "opacity"), undefined);
  const flashes = seq.sections.filter(s => arg(s, "copySprite"));
  assert.equal(flashes.length, 1, "one flash: the far tier 3 target, not the caster");
  assert.equal(arg(flashes[0], "copySprite")[0], far);
  assert.equal(arg(flashes[0], "filter")[0], "ColorMatrix");
  const pans = seq.sections.filter(s => s.kind === "pan");
  assert.equal(pans.length, 1);
  assert.equal(arg(pans[0], "shake")[0].rotation, false);
  SETTINGS.hitFlash = false;
  SETTINGS.screenShake = false;
  const quiet = buildSequence({ source: caster, targets: [{ token: far, tier: 3 }] }, bolt);
  assert.ok(!quiet.sections.some(s => s.kind === "pan" || arg(s, "copySprite")));
  SETTINGS.hitFlash = true;
  SETTINGS.screenShake = true;
});

test("heal: one size, no crit, no shake; lands on the caster without targets", () => {
  const heal = { ...bolt, intent: "heal", delivery: "bolt", travel: null, impact: { files: ["fx.impact"], sound: [], crit: ["fx.crit"], byTier: false, onCaster: true } };
  const seq = buildSequence({ source: caster, targets: [] }, heal);
  const imp = seq.sections.find(s => arg(s, "file")?.[0] === "fx.impact");
  assert.equal(arg(imp, "atLocation")[0], caster);
  assert.deepEqual(arg(imp, "scaleToObject"), [1.4]);
  const tier3 = buildSequence({ source: caster, targets: [{ token: far, tier: 3, crit: true }] }, heal);
  assert.ok(!tier3.sections.some(s => s.kind === "pan" || arg(s, "copySprite") || arg(s, "file")?.[0] === "fx.crit"));
});

test("aura and zone areas are cut short with a fade", () => {
  const aura = { ...bolt, cast: null, travel: null, impact: null, area: { kind: "burst", files: ["fx.burst"], sound: [], maxMs: 3000 } };
  const seq = buildSequence({ source: caster, targets: [], item: { system: { distance: { primary: 2 } } } }, aura);
  const area = seq.sections.find(s => arg(s, "file")?.[0] === "fx.burst");
  assert.deepEqual(arg(area, "duration"), [3000]);
  assert.ok(arg(area, "fadeOut"));
  assert.deepEqual(arg(area, "waitUntilFinished"), [-2400]);
});

test("group keys play one of their own variants, never a prefix sibling", () => {
  const db = globalThis.Sequencer.Database;
  const saved = db.flattenedEntries;
  db.flattenedEntries = [
    ...saved,
    "snd.fire.1", "snd.fireball.1", "snd.fireball.2", "snd.fire_bolt.1",
    "snd.impact.1", "snd.impact.2", "snd.impact.summon1.1",
    "fx.ray.blue.15ft", "fx.ray.blue.30ft", "fx.ray.blueyellow.30ft",
    "fx.dagger.attack1.30ft", "fx.dagger.attack2.30ft",
  ];
  try {
    for (let i = 0; i < 20; i++) {
      assert.equal(variantOf("snd.fire"), "snd.fire.1", "not fireball or fire_bolt");
      assert.match(variantOf("snd.impact"), /^snd\.impact\.[12]$/, "numbered variants before sub-families");
      assert.match(variantOf("fx.dagger"), /^fx\.dagger\.attack[12]$/, "a sub-family as a whole distance group");
    }
    assert.equal(variantOf("fx.ray.blue"), "fx.ray.blue", "a distance group stays whole");
    assert.equal(variantOf("snd.cast"), "snd.cast", "an exact entry is unchanged");
    assert.equal(variantOf("modules/x/fx.webm"), "modules/x/fx.webm", "a file path is unchanged");
    assert.equal(variantOf("nope.missing"), "nope.missing");
    const fire = { ...bolt, travel: null, impact: null, cast: { files: ["fx.cast"], sound: ["snd.fire"] } };
    const seq = buildSequence({ source: caster, targets: [] }, fire);
    assert.deepEqual(arg(seq.sections.find(s => s.kind === "sound"), "file"), ["snd.fire.1"]);
  } finally {
    db.flattenedEntries = saved;
  }
});

console.log(`sequence: ${passed} passed${process.exitCode ? ", FAILURES above" : ""}`);
