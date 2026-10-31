// Card reader (chat-adapter) and area geometry over fixture data (plain Node, no Foundry).
import assert from "node:assert/strict";
import { abilityUse, cardParts, readOutcome } from "../scripts/trigger/chat-adapter.mjs";
import { burstPlacement, shapePlacements } from "../scripts/play/geometry.mjs";
import { tierScales as tierScalesForTest } from "../scripts/play/sequence.mjs";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; } catch (err) { console.log(`FAIL ${name}\n${err.stack}`); process.exitCode = 1; }
};

// Duck-typed rolls: the adapter falls back to `kind` when the system classes are not loaded.
const power = (product, target, { crit = false, nat20 = false } = {}) => ({ kind: "power", product, isCritical: crit, isNat20: nat20, options: target ? { target } : {} });
const damage = (type, { heal = false } = {}) => ({ kind: "damage", isHeal: heal, options: { type } });

/** A 1.1.2 card: Collection-like parts (contents array). */
const card112 = parts => ({ system: { parts: { contents: parts } } });

test("abilityUse finds the use part in live and source shapes", () => {
  const use = { type: "abilityUse", abilityUuid: "Actor.a.Item.b" };
  assert.deepEqual(abilityUse(card112([use])), { abilityUuid: "Actor.a.Item.b" });
  assert.deepEqual(abilityUse({ system: { parts: { abilityUse000000: use } } }), { abilityUuid: "Actor.a.Item.b" });
  assert.deepEqual(abilityUse({ system: { parts: new Map([["x", use]]) } }), { abilityUuid: "Actor.a.Item.b" });
  assert.equal(abilityUse(card112([{ type: "abilityResult" }])), null);
  assert.equal(abilityUse({}), null);
  assert.deepEqual(cardParts({}), []);
});

test("1.1.2 tier parts: per-target tiers, crit, damage type", () => {
  const msg = card112([
    { type: "abilityUse", abilityUuid: "x" },
    { type: "abilityResult", tier: 1, rolls: [power(1, "Actor.goblin"), damage("fire")] },
    { type: "abilityResult", tier: 3, rolls: [power(3, "Actor.orc", { nat20: true }), power(3, "Actor.troll"), damage("fire")] },
  ]);
  const o = readOutcome(msg);
  assert.deepEqual(o.byActor.get("Actor.goblin"), { tier: 1, crit: false });
  assert.deepEqual(o.byActor.get("Actor.orc"), { tier: 3, crit: true });
  assert.deepEqual(o.byActor.get("Actor.troll"), { tier: 3, crit: false });
  assert.equal(o.untargeted, null);
  assert.equal(o.damageType, "fire");
  assert.equal(o.byToken.size, 0);
});

test("untargeted roll and heal-only damage", () => {
  const o = readOutcome(card112([
    { type: "abilityUse", abilityUuid: "x" },
    { type: "abilityResult", tier: 2, rolls: [power(2, null), damage("", { heal: true })] },
  ]));
  assert.deepEqual(o.untargeted, { tier: 2, crit: false });
  assert.equal(o.damageType, null);
  assert.equal(o.heal, true);
});

test("no power roll: nothing read", () => {
  const o = readOutcome(card112([{ type: "abilityUse", abilityUuid: "x" }]));
  assert.equal(o.byActor.size, 0);
  assert.equal(o.untargeted, null);
});

test("1.2 targetResult parts: by token and by actor", () => {
  const o = readOutcome(card112([
    { type: "abilityUse", abilityUuid: "x" },
    { type: "targetResult", tier: 2, targetUuid: "Actor.a", tokenUuid: "Scene.s.Token.t1", rolls: [power(2), damage("cold")] },
    { type: "targetResult", tier: 3, targetUuid: "Actor.b", tokenUuid: "Scene.s.Token.t2", rolls: [power(3, null, { crit: true }), damage("cold")] },
  ]));
  assert.deepEqual(o.byToken.get("Scene.s.Token.t1"), { tier: 2, crit: false });
  assert.deepEqual(o.byToken.get("Scene.s.Token.t2"), { tier: 3, crit: true });
  assert.deepEqual(o.byActor.get("Actor.b"), { tier: 3, crit: true });
  assert.equal(o.damageType, "cold");
});

test("explicit classes are used when given", () => {
  class P { constructor(product, target) { this.product = product; this.options = { target }; } }
  class D { constructor(type) { this.options = { type }; } }
  const o = readOutcome(card112([{ type: "abilityResult", tier: 2, rolls: [new P(2, "Actor.z"), new D("sonic")] }]), { PowerRoll: P, DamageRoll: D });
  assert.deepEqual(o.byActor.get("Actor.z"), { tier: 2, crit: false });
  assert.equal(o.damageType, "sonic");
});

test("burst placement: token plus radius on each side", () => {
  assert.deepEqual(burstPlacement({ center: { x: 50, y: 50 }, tokenSquares: 1, radius: 3, gridSize: 100 }), { type: "circle", x: 50, y: 50, size: 700 });
  assert.equal(burstPlacement({ center: null }), null);
});

test("shape placements: centred rectangle, line end point, circle", () => {
  const [rect, line, circle] = shapePlacements([
    { type: "rectangle", x: 300, y: 300, width: 300, height: 300, anchorX: 0.5, anchorY: 0.5 },
    { type: "line", x: 0, y: 0, length: 500, width: 100, rotation: 90 },
    { type: "circle", x: 10, y: 20, radius: 150 },
    { type: "emanation" },
  ]);
  assert.deepEqual(rect, { type: "rect", x: 300, y: 300, width: 300, height: 300 });
  assert.equal(line.type, "line");
  assert.ok(Math.abs(line.to.x) < 1e-9 && Math.abs(line.to.y - 500) < 1e-9);
  assert.deepEqual(circle, { type: "circle", x: 10, y: 20, size: 300 });
  const [corner] = shapePlacements([{ type: "rectangle", x: 0, y: 0, width: 100, height: 200 }]);
  assert.deepEqual(corner, { type: "rect", x: 50, y: 100, width: 100, height: 200 });
});

test("tier scale setting parsing", () => {
  assert.deepEqual(tierScalesForTest("0.5, 1, 2"), [0.5, 1, 2]);
  assert.deepEqual(tierScalesForTest("bad"), [0.7, 1, 1.3]);
  assert.deepEqual(tierScalesForTest("1,2"), [0.7, 1, 1.3]);
});

console.log(`adapter: ${passed} passed${process.exitCode ? ", FAILURES above" : ""}`);
