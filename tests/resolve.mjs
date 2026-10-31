// Recipe resolution over fixture abilities (plain Node, no Foundry).
import assert from "node:assert/strict";
import { abilityFacts, resolveRecipe, pickDelivery, pickElement, ownRecipe } from "../scripts/recipes/resolve.mjs";
import { BUILTIN_RULES, mergeRules } from "../scripts/recipes/presets.mjs";
import { SIGNATURES } from "../scripts/recipes/signatures.mjs";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; } catch (err) { console.log(`FAIL ${name}\n${err.stack}`); process.exitCode = 1; }
};

/** A plain ability shaped like a prepared Draw Steel item (Sets like the system's fields). */
function ability({ name = "Test", keywords = [], distance = "melee", primary = 1, damage = [], flags = {}, dsid = "", text = "", kit = null } = {}) {
  const effects = damage.map((types, i) => ({
    type: "damage", sort: i, damage: { tier1: { types: new Set(types) }, tier2: { types: new Set(types) }, tier3: { types: new Set(types) } },
  }));
  return {
    name,
    system: {
      keywords: new Set(keywords),
      distance: { type: distance, primary, secondary: 0, tertiary: 0 },
      target: { type: "creature", value: 1 },
      power: { effects: { documentsByType: { damage: effects } } },
      effects: text ? { before0000000000: { description: text } } : {},
      _dsid: dsid,
    },
    flags,
    actor: kit ? { items: [{ type: "kit", system: { equipment: { weapon: new Set(kit) } } }] } : null,
  };
}
const resolve = (item, opts) => resolveRecipe(abilityFacts(item), opts);

test("melee weapon strike: swing, no cast, physical impact", () => {
  const r = resolve(ability({ keywords: ["melee", "strike", "weapon"] }));
  assert.equal(r.delivery, "melee");
  assert.equal(r.element, "none");
  assert.equal(r.cast, null);
  assert.equal(r.travel.kind, "melee");
  assert.deepEqual(r.travel.files, BUILTIN_RULES.files.melee["*"]);
  assert.deepEqual(r.impact.files, BUILTIN_RULES.files.impact["*"]);
  assert.equal(r.area, null);
  assert.equal(r.owned, false);
});

test("ranged weapon: arrow", () => {
  const r = resolve(ability({ keywords: ["ranged", "strike", "weapon"], distance: "ranged", primary: 10 }));
  assert.equal(r.delivery, "arrow");
  assert.equal(r.cast, null);
  assert.equal(r.travel.kind, "projectile");
});

test("ranged magic fire: cast + fire bolt + fire impact", () => {
  const r = resolve(ability({ keywords: ["magic", "ranged", "strike"], distance: "ranged", damage: [["fire"]] }));
  assert.equal(r.delivery, "bolt");
  assert.equal(r.element, "fire");
  assert.ok(r.cast);
  assert.deepEqual(r.travel.files, BUILTIN_RULES.files.bolt.fire);
  assert.deepEqual(r.impact.files, BUILTIN_RULES.files.impact.fire);
  assert.deepEqual(r.impact.crit, BUILTIN_RULES.files.crit.fire);
});

test("the rolled damage type wins over the item's", () => {
  const r = resolve(ability({ keywords: ["magic", "ranged"], distance: "ranged", damage: [["fire"]] }), { damageType: "cold" });
  assert.equal(r.element, "cold");
});

test("3 burst psionic: area burst, cast, psionic element", () => {
  const r = resolve(ability({ keywords: ["area", "psionic"], distance: "burst", primary: 3, damage: [[]] }));
  assert.equal(r.delivery, "burst");
  assert.equal(r.element, "psionic");
  assert.ok(r.cast);
  assert.equal(r.travel, null);
  assert.equal(r.area.kind, "burst");
  assert.deepEqual(r.area.files, BUILTIN_RULES.files.burst.psionic);
});

test("weapon burst: no cast", () => {
  const r = resolve(ability({ keywords: ["area", "melee", "weapon"], distance: "burst", primary: 1 }));
  assert.equal(r.delivery, "burst");
  assert.equal(r.cast, null);
});

test("5x1 line cold", () => {
  const r = resolve(ability({ keywords: ["area", "magic"], distance: "line", primary: 5, damage: [["cold"]] }));
  assert.equal(r.delivery, "line");
  assert.equal(r.area.kind, "line");
  assert.deepEqual(r.area.files, BUILTIN_RULES.files.line.cold);
});

test("cube and wall use the area table", () => {
  assert.equal(resolve(ability({ keywords: ["area", "magic"], distance: "cube", primary: 3 })).area.kind, "area");
  assert.equal(resolve(ability({ keywords: ["area", "magic"], distance: "wall", primary: 5 })).area.kind, "area");
});

test("utility abilities play nothing; weapon contact and custom recipes still play", () => {
  for (const [keywords, distance] of [[[], "self"], [[], "melee"], [["ranged"], "ranged"]]) {
    const r = resolve(ability({ keywords, distance }));
    assert.equal(r.delivery, null);
    assert.ok(!r.cast && !r.travel && !r.impact && !r.area);
    assert.match(r.trace[0], /utility/);
  }
  assert.equal(resolve(ability({ keywords: ["melee", "weapon"] })).delivery, "melee");
  assert.equal(resolve(ability({ keywords: [], distance: "melee", damage: [[]] })).delivery, "melee");
  const custom = resolve(ability({ keywords: [], distance: "self", flags: { "stef-ds-fx": { recipe: { mode: "custom", element: "holy" } } } }));
  assert.equal(custom.delivery, "self");
  assert.ok(custom.cast);
});

test("self: magic casts, no impact on the caster unless the item lists one", () => {
  const r = resolve(ability({ keywords: ["magic"], distance: "self" }));
  assert.equal(r.delivery, "self");
  assert.ok(r.cast);
  assert.equal(r.travel, null);
  assert.equal(r.impact, null);
  const own = resolve(ability({ keywords: ["magic"], distance: "self", flags: { "stef-ds-fx": { recipe: { mode: "custom", impact: "fx.heal" } } } }));
  assert.deepEqual(own.impact.files, ["fx.heal"]);
});

test("ability with no power roll still resolves", () => {
  const item = ability({ keywords: ["magic"], distance: "ranged" });
  delete item.system.power;
  const r = resolve(item);
  assert.equal(r.delivery, "bolt");
  assert.equal(r.element, "magic");
});

test("keyword subtype sets the element without typed damage", () => {
  const trace = [];
  assert.equal(pickElement(abilityFacts(ability({ keywords: ["cryokinesis", "psionic"] })), {}, trace), "cold");
  assert.match(trace[0], /cryokinesis/);
});

test("meleeRanged: swing plus a ranged fallback", () => {
  const r = resolve(ability({ keywords: ["melee", "ranged", "weapon", "strike"], distance: "meleeRanged" }));
  assert.equal(r.delivery, "meleeRanged");
  assert.equal(r.travel.kind, "melee");
  assert.equal(r.rangedTravel.kind, "projectile");
  assert.deepEqual(r.rangedTravel.files, BUILTIN_RULES.files.arrow["*"]);
});

test("unknown distance falls back on keywords", () => {
  assert.equal(pickDelivery(abilityFacts(ability({ keywords: ["ranged", "magic"], distance: "special" }))), "bolt");
  assert.equal(pickDelivery(abilityFacts(ability({ keywords: ["melee"], distance: "special" }))), "melee");
  assert.equal(pickDelivery(abilityFacts(ability({ keywords: [], distance: "special" }))), "self");
});

test("mode none: owned, nothing plays", () => {
  const r = resolve(ability({ flags: { "stef-ds-fx": { recipe: { mode: "none" } } } }));
  assert.equal(r.mode, "none");
  assert.equal(r.owned, true);
  assert.equal(r.impact, null);
});

test("custom: delivery/element override and slot lists, '-' turns a step off", () => {
  const r = resolve(ability({
    keywords: ["melee", "weapon"],
    flags: { "stef-ds-fx": { recipe: { mode: "custom", delivery: "bolt", element: "holy", impact: "a.b, c/d.webm", castSound: "-", crit: "" } } },
  }));
  assert.equal(r.owned, true);
  assert.equal(r.delivery, "bolt");
  assert.equal(r.element, "holy");
  assert.deepEqual(r.travel.files, BUILTIN_RULES.files.bolt.holy);
  assert.deepEqual(r.impact.files, ["a.b", "c/d.webm"]);
  // weapon keyword + bolt delivery: no cast (not magic/psionic)
  assert.equal(r.cast, null);
  assert.deepEqual(r.impact.crit, BUILTIN_RULES.files.crit.holy);
});

test("custom cast sound off keeps the cast effect", () => {
  const r = resolve(ability({ keywords: ["magic", "ranged"], distance: "ranged", flags: { "stef-ds-fx": { recipe: { mode: "custom", castSound: "-" } } } }));
  assert.ok(r.cast.files.length);
  assert.deepEqual(r.cast.sound, []);
});

test("custom: travel off", () => {
  const r = resolve(ability({ keywords: ["magic", "ranged"], distance: "ranged", flags: { "stef-ds-fx": { recipe: { mode: "custom", travel: "-" } } } }));
  assert.equal(r.travel, null);
  assert.ok(r.impact);
});

test("ownRecipe ignores unknown values", () => {
  const own = ownRecipe({ mode: "custom", delivery: "teleport", element: "plasma" });
  assert.equal(own.delivery, null);
  assert.equal(own.element, null);
  assert.equal(ownRecipe({ mode: "weird" }).mode, "auto");
});

test("bridge flag is read", () => {
  const facts = abilityFacts(ability({ flags: { "ds-aa-bridge": { animation: "jb2a.x" } } }));
  assert.equal(facts.bridgeAnimation, "jb2a.x");
});

test("mergeRules: override replaces, empty list drops to *, keyword off removes", () => {
  const rules = mergeRules({ files: { bolt: { fire: ["my.fire"], cold: [] } }, keywordElements: { fire: "off", green: "poison" } });
  assert.deepEqual(rules.files.bolt.fire, ["my.fire"]);
  assert.equal(rules.files.bolt.cold, undefined);
  assert.equal(rules.keywordElements.fire, undefined);
  assert.equal(rules.keywordElements.green, "poison");
  assert.deepEqual(BUILTIN_RULES.files.bolt.cold.length > 0, true, "built-ins untouched");
  const r = resolveRecipe(abilityFacts(ability({ keywords: ["magic"], distance: "ranged", damage: [["cold"]] })), { rules });
  assert.deepEqual(r.travel.files, BUILTIN_RULES.files.bolt["*"]);
});

test("swing style follows the kit; physical impact follows the style", () => {
  const strike = kit => resolve(ability({ keywords: ["melee", "strike", "weapon"], damage: [[]], kit }));
  const heavy = strike(["heavy"]);
  assert.equal(heavy.style, "heavy");
  assert.deepEqual(heavy.travel.files, BUILTIN_RULES.files.melee.heavy);
  assert.deepEqual(heavy.travel.sound, BUILTIN_RULES.sounds.melee.heavy);
  assert.deepEqual(heavy.impact.files, BUILTIN_RULES.files.impact.bludgeoning);
  const dual = strike(["light", "medium"]);
  assert.equal(dual.style, "medium");
  assert.deepEqual(dual.impact.files, BUILTIN_RULES.files.impact.slashing);
  assert.equal(strike(["light"]).style, "light");
  assert.deepEqual(strike(["light"]).impact.files, BUILTIN_RULES.files.impact.piercing);
  assert.equal(strike(["unarmed"]).style, "unarmed");
  assert.equal(strike(["ensnaring"]).style, "whip");
  const monster = strike(null);
  assert.equal(monster.style, "*");
  assert.deepEqual(monster.travel.files, BUILTIN_RULES.files.melee["*"]);
  // An elemental weapon strike keeps the plain swing and gets the element's impact.
  const fire = resolve(ability({ keywords: ["melee", "strike", "weapon"], damage: [["fire"]], kit: ["heavy"] }));
  assert.deepEqual(fire.travel.files, BUILTIN_RULES.files.melee.heavy);
  assert.deepEqual(fire.impact.files, BUILTIN_RULES.files.impact.fire);
});

test("ranged weapon strikes: arrows for bows and monsters, thrown weapons otherwise", () => {
  const shot = kit => resolve(ability({ keywords: ["ranged", "strike", "weapon"], distance: "ranged", damage: [[]], kit }));
  assert.deepEqual(shot(["bow"]).travel.files, BUILTIN_RULES.files.arrow["*"]);
  assert.deepEqual(shot(null).travel.files, BUILTIN_RULES.files.arrow["*"]);
  assert.deepEqual(shot(["light"]).travel.files, BUILTIN_RULES.files.thrown["*"]);
  assert.deepEqual(shot(["light"]).impact.files, BUILTIN_RULES.files.impact.piercing);
  const mr = resolve(ability({ keywords: ["melee", "ranged", "strike", "weapon"], distance: "meleeRanged", damage: [[]], kit: ["light"] }));
  assert.deepEqual(mr.rangedTravel.files, BUILTIN_RULES.files.thrown["*"]);
});

test("heal intent: from effect text or a heal roll; no travel; lands on the caster without targets", () => {
  const limerick = resolve(ability({ keywords: ["area", "magic", "performance"], distance: "aura", primary: 5, text: "Each chosen target can spend a Recovery." }));
  assert.equal(limerick.intent, "heal");
  assert.equal(limerick.element, "music");
  assert.deepEqual(limerick.impact.files, BUILTIN_RULES.files.heal.music);
  assert.equal(limerick.impact.byTier, false);
  assert.equal(limerick.impact.onCaster, true);
  assert.deepEqual(limerick.area.files, BUILTIN_RULES.files.aura.music);
  assert.equal(limerick.area.maxMs, 3000);
  const heal = resolve(ability({ keywords: [], distance: "melee", text: "The target can spend a Recovery to regain Stamina." }));
  assert.equal(heal.intent, "heal");
  assert.equal(heal.travel, null);
  assert.deepEqual(heal.impact.files, BUILTIN_RULES.files.heal["*"]);
  const catchBreath = resolve(ability({ keywords: [], distance: "self", text: "regains [[/heal @recoveries.recoveryValue]]" }));
  assert.equal(catchBreath.intent, "heal");
  assert.ok(catchBreath.impact.onCaster);
  const ranged = resolve(ability({ keywords: ["magic", "ranged"], distance: "ranged" }), { heal: true });
  assert.equal(ranged.intent, "heal");
  assert.equal(ranged.travel, null);
  // A damaging ability that also heals stays an attack.
  assert.equal(resolve(ability({ keywords: ["magic"], distance: "ranged", damage: [["holy"]], text: "You regain 5 Stamina." })).intent, "attack");
});

test("buff and zone intents: glow and ground instead of explosions", () => {
  const choreo = resolve(ability({ keywords: ["area", "magic", "performance"], distance: "aura", primary: 5 }));
  assert.equal(choreo.intent, "buff");
  assert.deepEqual(choreo.area.files, BUILTIN_RULES.files.aura.music);
  assert.deepEqual(choreo.area.sound, BUILTIN_RULES.sounds.aura.music);
  assert.deepEqual(choreo.impact.files, BUILTIN_RULES.files.buff.music);
  assert.equal(choreo.impact.crit.length, 0);
  const zone = resolve(ability({ keywords: ["area", "magic", "ranged", "green"], distance: "cube", primary: 3 }));
  assert.equal(zone.intent, "zone");
  assert.equal(zone.element, "nature");
  assert.deepEqual(zone.area.files, BUILTIN_RULES.files.zone.nature);
  assert.equal(zone.impact, null);
  assert.equal(zone.area.maxMs, 3000);
  const blast = resolve(ability({ keywords: ["area", "magic"], distance: "burst", damage: [["fire"]] }));
  assert.equal(blast.intent, "attack");
  assert.deepEqual(blast.area.files, BUILTIN_RULES.files.burst.fire);
  assert.equal(blast.area.maxMs, null);
});

test("flavour keywords: earth, green, telekinesis, performance, resopathy", () => {
  const el = keywords => resolve(ability({ keywords, distance: "ranged", damage: [[]] })).element;
  assert.equal(el(["area", "magic", "ranged", "earth"]), "earth");
  assert.equal(el(["magic", "ranged", "strike", "green"]), "nature");
  assert.equal(el(["psionic", "ranged", "telekinesis"]), "force");
  assert.equal(el(["magic", "ranged", "strike", "performance"]), "music");
  assert.equal(el(["psionic", "ranged", "resopathy"]), "sonic");
});

test("signatures: after the item's own recipe, before automatic; off without a table", () => {
  const signatures = { "power-chord": { delivery: "burst", element: "music", area: ["fx.chord"], impact: "-" } };
  const chord = ability({ keywords: ["area", "magic"], distance: "burst", dsid: "power-chord", damage: [[]] });
  const r = resolve(chord, { signatures });
  assert.equal(r.owned, false, "a signature does not claim the card from ds-aa-bridge");
  assert.equal(r.mode, "custom");
  assert.match(r.trace[0], /signature power-chord/);
  assert.equal(r.element, "music");
  assert.deepEqual(r.area.files, ["fx.chord"]);
  assert.equal(r.impact, null);
  assert.equal(resolve(chord).element, "magic", "no table: automatic");
  const mine = ability({ keywords: ["area", "magic"], distance: "burst", dsid: "power-chord", damage: [[]], flags: { "stef-ds-fx": { recipe: { mode: "custom", element: "fire" } } } });
  assert.equal(resolve(mine, { signatures }).element, "fire", "the item's own recipe wins");
});

test("built-in signatures look different from the automatic choice", () => {
  // The first file each step would play; a signature that only changes backups or sounds looks automatic.
  const look = r => ["cast", "travel", "impact", "area"].map(s => r[s]?.files?.[0] ?? null);
  const fixtures = {
    "choreography": ability({ keywords: ["area", "magic", "performance"], distance: "aura", primary: 5 }),
    "revitalizing-limerick": ability({ keywords: ["area", "magic", "performance"], distance: "aura", primary: 5, text: "Each target can spend a Recovery." }),
    "incinerate": ability({ keywords: ["area", "fire", "psionic", "pyrokinesis", "ranged"], distance: "cube", primary: 3, damage: [["fire"]] }),
    "mind-spike": ability({ keywords: ["psionic", "ranged", "strike", "telepathy"], distance: "ranged", primary: 10, damage: [["psychic"]] }),
    "unquiet-ground": ability({ keywords: ["area", "magic", "ranged", "earth"], distance: "cube", primary: 2, damage: [[]] }),
  };
  for (const [dsid, item] of Object.entries(fixtures)) {
    item.system._dsid = dsid;
    assert.ok(SIGNATURES[dsid], `${dsid} is a built-in signature`);
    const auto = look(resolve(item));
    const sig = look(resolve(item, { signatures: SIGNATURES }));
    assert.notDeepEqual(sig, auto, `${dsid}: the signature changes at least one step's look`);
  }
});

console.log(`resolve: ${passed} passed${process.exitCode ? ", FAILURES above" : ""}`);
