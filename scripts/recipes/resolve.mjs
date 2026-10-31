/**
 * Recipe resolution: pure functions over plain ability facts (no Foundry globals), so tests run under plain Node.
 *
 * Order (modelled on Draw Steel Codex's chain, plus signatures): the item's own recipe → the built-in signature
 * recipe of the ability (`_dsid`) → automatic: intent (attack, heal, buff, zone), delivery from distance type and
 * keywords, weapon style from the hero's kit, element from the damage type, then keyword subtypes → built-in default
 * rows (`*`).
 */
import { MODULE_ID } from "../constants.mjs";
import { BUILTIN_RULES, DELIVERIES, ELEMENTS } from "./presets.mjs";

const DAMAGE_ELEMENTS = new Set(["acid", "cold", "corruption", "fire", "holy", "lightning", "poison", "psychic", "sonic"]);
const OVERRIDE_SLOTS = ["cast", "travel", "impact", "crit", "area", "castSound", "travelSound", "impactSound", "areaSound"];
/** Kit weapon types → swing style, strongest first (a Dual Wielder's light + medium swings medium). */
const STYLE_ORDER = [["heavy", "heavy"], ["polearm", "polearm"], ["medium", "medium"], ["light", "light"],
  ["whip", "whip"], ["ensnaring", "whip"], ["unarmed", "unarmed"], ["none", "unarmed"]];
/** Swing style → the physical damage kind of its impact. */
const STYLE_IMPACT = { unarmed: "bludgeoning", heavy: "bludgeoning", light: "piercing", polearm: "piercing", medium: "slashing", whip: "slashing" };
/** Effect text that heals: a [[/heal]] enricher, spending a Recovery, or regaining Stamina. */
const HEAL_TEXT = /\[\[\/heal\b|spends? (?:a|an additional) Recovery|regains? [^.]*Stamina/i;

const toList = v => (v == null ? [] : v instanceof Set ? [...v] : Array.isArray(v) ? v : [v]);
const values = v => (v == null ? [] : v instanceof Map ? [...v.values()] : Array.isArray(v) ? v
  : typeof v.values === "function" && !(v instanceof Set) && typeof v !== "string" ? [...v.values()]
  : typeof v === "object" ? Object.values(v) : []);

/**
 * Plain facts about an ability item (works on a prepared Draw Steel item or a plain fixture object).
 * `weapons` are the weapon types of the owning actor's kits (`system.equipment.weapon`); empty for monsters.
 * @returns {{name: string, dsid: string, keywords: string[], distanceType: string, distance: {primary: number,
 *   secondary: number, tertiary: number}, targetType: string, hasDamage: boolean, damageTypes: string[],
 *   healText: boolean, weapons: string[], recipe: object|null, bridgeAnimation: string|null}}
 */
export function abilityFacts(item) {
  const sys = item?.system ?? {};
  const effects = sys.power?.effects;
  let damage = effects?.documentsByType?.damage;
  if (!damage) damage = toList(effects?.contents ?? effects).filter(e => e?.type === "damage");
  damage = [...damage];
  const damageTypes = [];
  for (const effect of damage.sort((a, b) => (a?.sort ?? 0) - (b?.sort ?? 0))) {
    for (const tier of ["tier1", "tier2", "tier3"]) {
      for (const type of toList(effect?.damage?.[tier]?.types)) {
        if (type && !damageTypes.includes(type)) damageTypes.push(type);
      }
    }
  }
  const texts = values(sys.effects).map(e => String(e?.description ?? e?.text ?? ""));
  const weapons = [];
  for (const kit of values(item?.actor?.items).filter(i => i?.type === "kit")) {
    for (const w of toList(kit.system?.equipment?.weapon)) if (w && !weapons.includes(w)) weapons.push(String(w));
  }
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    name: String(item?.name ?? ""),
    dsid: String(sys._dsid ?? ""),
    keywords: toList(sys.keywords).map(String),
    distanceType: String(sys.distance?.type ?? ""),
    distance: { primary: num(sys.distance?.primary), secondary: num(sys.distance?.secondary), tertiary: num(sys.distance?.tertiary) },
    targetType: String(sys.target?.type ?? ""),
    hasDamage: damage.length > 0,
    damageTypes,
    healText: texts.some(t => HEAL_TEXT.test(t)),
    weapons,
    recipe: item?.flags?.[MODULE_ID]?.recipe ?? null,
    bridgeAnimation: item?.flags?.["ds-aa-bridge"]?.animation || null,
  };
}

/** The item's own recipe, cleaned: `{mode, delivery, element, <slot>: string[] | "off"}`. */
export function ownRecipe(raw) {
  const mode = ["auto", "custom", "none"].includes(raw?.mode) ? raw.mode : "auto";
  const out = { mode, delivery: null, element: null };
  if (mode !== "custom") return out;
  if (raw.delivery && DELIVERIES[raw.delivery]) out.delivery = raw.delivery;
  if (raw.element && ELEMENTS.includes(raw.element)) out.element = raw.element;
  for (const slot of OVERRIDE_SLOTS) {
    const value = raw[slot];
    const text = Array.isArray(value) ? value.join(",") : typeof value === "string" ? value.trim() : "";
    if (!text) continue;
    out[slot] = text === "-" ? "off" : text.split(",").map(s => s.trim()).filter(Boolean);
  }
  return out;
}

/** Does this item carry its own recipe (custom or none), which claims the card from ds-aa-bridge? */
export function hasOwnRecipe(facts) {
  return ownRecipe(facts.recipe).mode !== "auto";
}

/**
 * A utility ability (Search, Hide, Aid Attack, a Tactician's Mark): no damage effect and none of the Strike,
 * Weapon, Magic or Psionic keywords. The automatic recipe plays nothing for it (heals are handled first).
 */
export function isUtility(facts) {
  const kw = new Set(facts.keywords);
  return !facts.hasDamage && !["strike", "weapon", "magic", "psionic"].some(k => kw.has(k));
}

/**
 * What the ability does, for the look of its animation: `heal` (heals and deals no typed damage), `buff` (an aura or
 * burst without damage), `zone` (a cube or wall without damage), else `attack`.
 */
export function pickIntent(facts, { heal = false } = {}, trace = []) {
  let intent = "attack";
  if ((heal || facts.healText) && !facts.damageTypes.length) intent = "heal";
  else if (!facts.hasDamage && ["aura", "burst"].includes(facts.distanceType)) intent = "buff";
  else if (!facts.hasDamage && ["cube", "wall"].includes(facts.distanceType)) intent = "zone";
  if (intent !== "attack") trace.push(`intent ${intent}${intent === "heal" ? (heal ? " (heal roll)" : " (effect text)") : " (no damage)"}`);
  return intent;
}

/** The swing style from the kit's weapon types (`*` without a kit, e.g. monsters). */
export function pickStyle(facts, trace = []) {
  const weapons = new Set(facts.weapons ?? []);
  const hit = STYLE_ORDER.find(([type]) => weapons.has(type));
  const style = hit ? hit[1] : "*";
  if (hit) trace.push(`style ${style} (kit ${[...weapons].sort().join(", ")})`);
  return style;
}

export function pickDelivery(facts, trace = []) {
  const kw = new Set(facts.keywords);
  const spell = kw.has("magic") || kw.has("psionic");
  const ranged = () => (kw.has("weapon") && !spell ? "arrow" : "bolt");
  let delivery;
  switch (facts.distanceType) {
    case "self": delivery = "self"; break;
    case "aura":
    case "burst": delivery = "burst"; break;
    case "cube":
    case "wall": delivery = "area"; break;
    case "line": delivery = "line"; break;
    case "melee": delivery = "melee"; break;
    case "ranged": delivery = ranged(); break;
    case "meleeRanged": delivery = "meleeRanged"; break;
    default:
      delivery = kw.has("ranged") ? ranged() : kw.has("melee") ? "melee" : "self";
  }
  trace.push(`delivery ${delivery} (distance ${facts.distanceType || "?"}${kw.size ? `; ${[...kw].sort().join(", ")}` : ""})`);
  return delivery;
}

export function pickElement(facts, { damageType = null, rules = BUILTIN_RULES } = {}, trace = []) {
  if (damageType && DAMAGE_ELEMENTS.has(damageType)) {
    trace.push(`element ${damageType} (damage roll)`);
    return damageType;
  }
  const typed = facts.damageTypes.find(t => DAMAGE_ELEMENTS.has(t));
  if (typed) {
    trace.push(`element ${typed} (damage effect)`);
    return typed;
  }
  for (const kw of facts.keywords) {
    const el = rules.keywordElements?.[kw];
    if (el) {
      trace.push(`element ${el} (keyword ${kw})`);
      return el;
    }
  }
  const kw = new Set(facts.keywords);
  const el = kw.has("psionic") ? "psionic" : kw.has("magic") ? "magic" : "none";
  trace.push(`element ${el}${el === "none" ? "" : ` (keyword ${el})`}`);
  return el;
}

/** The candidate list of a table for a row (its own row, else `*`). */
export function pick(table, row) {
  const own = table?.[row];
  if (Array.isArray(own) && own.length) return [...own];
  return Array.isArray(table?.["*"]) ? [...table["*"]] : [];
}

const nothing = (mode, owned, trace) => ({
  mode, owned, intent: null, delivery: null, element: null, style: null,
  cast: null, travel: null, rangedTravel: null, impact: null, area: null, trace,
});

/**
 * Resolve the recipe of an ability.
 * @param {ReturnType<typeof abilityFacts>} facts
 * @param {{rules?: object, damageType?: string|null, heal?: boolean, signatures?: Record<string, object>|null}} [options]
 *   damageType: the type actually rolled on the card; heal: the card rolled healing; signatures: the built-in
 *   signature table (null when the `signatures` setting is off)
 * @returns {{mode: string, owned: boolean, intent: string|null, delivery: string|null, element: string|null,
 *   style: string|null, cast: {files: string[], sound: string[]}|null,
 *   travel: {kind: string, files: string[], sound: string[]}|null,
 *   rangedTravel: {kind: string, files: string[], sound: string[]}|null,
 *   impact: {files: string[], sound: string[], crit: string[], byTier: boolean, onCaster: boolean}|null,
 *   area: {kind: string, files: string[], sound: string[], maxMs: number|null}|null,
 *   trace: string[]}}
 */
export function resolveRecipe(facts, { rules = BUILTIN_RULES, damageType = null, heal = false, signatures = null } = {}) {
  let own = ownRecipe(facts.recipe);
  const trace = [];
  const owned = own.mode !== "auto";
  if (own.mode === "none") return nothing("none", owned, ["mode none (no animation)"]);
  if (own.mode === "custom") trace.push("mode custom");
  else if (facts.dsid && signatures?.[facts.dsid]) {
    own = ownRecipe({ ...signatures[facts.dsid], mode: "custom" });
    trace.push(`signature ${facts.dsid}`);
  }
  const custom = own.mode === "custom";
  const from = owned ? "item" : "signature";

  const intent = pickIntent(facts, { heal }, trace);
  if (!custom && intent !== "heal" && isUtility(facts)) {
    return nothing(own.mode, owned, ["utility ability (no damage, Strike, Weapon, Magic or Psionic): nothing plays"]);
  }

  let delivery = own.delivery;
  if (delivery) trace.push(`delivery ${delivery} (${from})`);
  else delivery = pickDelivery(facts, trace);
  let element = own.element;
  if (element) trace.push(`element ${element} (${from})`);
  else element = pickElement(facts, { damageType, rules }, trace);

  const def = DELIVERIES[delivery] ?? DELIVERIES.self;
  const kw = new Set(facts.keywords);
  const spell = kw.has("magic") || kw.has("psionic");
  const files = (slot, row = element) => pick(rules.files?.[slot], row);
  const sounds = (slot, row = element) => pick(rules.sounds?.[slot], row);
  /** Apply a custom slot override: a list replaces the candidates, "off" removes the slot. */
  const over = (slot, list) => (own[slot] === "off" ? null : Array.isArray(own[slot]) ? own[slot] : list);

  // Weapon contact: the swing follows the kit; physical hits use the matching damage kind.
  const melee = def.travel === "melee";
  const style = melee || delivery === "arrow" ? pickStyle(facts, trace) : null;
  // Ranged weapon strikes: arrows for bows (and monsters), thrown weapons for kits without a bow.
  const weapons = new Set(facts.weapons ?? []);
  const rangedWeaponSlot = weapons.size && !weapons.has("bow") ? "thrown" : "arrow";
  const physicalRow = element !== "none" ? element
    : melee && style !== "*" ? STYLE_IMPACT[style] ?? "*"
      : ["arrow", "meleeRanged"].includes(delivery) || kw.has("ranged") ? "piercing" : "*";

  // Weapon abilities don't cast (a weapon burst is a sweep, not a spell); magic and psionic ones always do. A self
  // ability casts only when it is magic or psionic, or the item picks an element.
  const castOn = spell || (def.cast && !kw.has("weapon")) || (delivery === "self" && !!own.element);
  let cast = castOn ? { files: files("cast"), sound: sounds("cast") } : null;
  if (Array.isArray(own.cast)) cast = { files: own.cast, sound: cast?.sound ?? sounds("cast") };
  else if (own.cast === "off") cast = null;
  if (cast) cast.sound = over("castSound", cast.sound) ?? [];

  // Heals land directly on their targets; buffs and zones don't travel either.
  let travel = null;
  if (intent === "attack" && def.travel !== "none" && def.travelSlot) {
    const slot = def.travelSlot === "arrow" ? rangedWeaponSlot : def.travelSlot;
    const row = slot === "melee" ? style : element;
    travel = { kind: def.travel, files: files(slot, row), sound: sounds(slot, row) };
  }
  let rangedTravel = null;
  if (intent === "attack" && delivery === "meleeRanged") {
    const slot = kw.has("weapon") && !spell ? rangedWeaponSlot : "bolt";
    rangedTravel = { kind: "projectile", files: files(slot), sound: sounds(slot) };
  }
  if (Array.isArray(own.travel)) travel = { kind: travel?.kind ?? "projectile", files: own.travel, sound: travel?.sound ?? [] };
  else if (own.travel === "off") { travel = null; rangedTravel = null; }
  if (travel) travel.sound = over("travelSound", travel.sound) ?? [];

  let impact = null;
  if (intent === "heal") {
    impact = { files: files("heal"), sound: sounds("heal"), crit: [], byTier: false, onCaster: true };
  } else if (intent === "buff") {
    impact = { files: files("buff"), sound: [], crit: [], byTier: false, onCaster: false };
  } else if (intent === "attack" && delivery !== "self") {
    // A self ability never lands a damage impact on its own caster.
    impact = { files: files("impact", physicalRow), sound: sounds("impact", physicalRow), crit: files("crit"), byTier: true, onCaster: false };
  }
  if (own.impact === "off") impact = null;
  else if (Array.isArray(own.impact)) {
    impact ??= { files: [], sound: sounds("impact", physicalRow), crit: [], byTier: intent === "attack", onCaster: delivery === "self" };
    impact.files = own.impact;
  }
  if (impact) {
    impact.sound = over("impactSound", impact.sound) ?? [];
    impact.crit = over("crit", impact.crit) ?? [];
  }

  // Areas: damage plays the burst/area/line table; buffs and heals glow (aura); zones mark the ground. Long looping
  // aura and zone files are cut short.
  let area = null;
  if (def.area) {
    const quiet = intent === "buff" || intent === "heal" || (intent === "zone" && def.area !== "line");
    const slot = intent === "zone" && def.area !== "line" ? "zone" : quiet ? "aura" : def.area;
    area = { kind: def.area, files: files(slot), sound: sounds(quiet && slot === "aura" ? "aura" : "area"), maxMs: quiet ? 3000 : null };
  }
  if (own.area === "off") area = null;
  else if (Array.isArray(own.area)) area = { kind: area?.kind ?? "burst", files: own.area, sound: area?.sound ?? sounds("area"), maxMs: area?.maxMs ?? null };
  if (area) area.sound = over("areaSound", area.sound) ?? [];

  return { mode: own.mode, owned, intent, delivery, element, style, cast, travel, rangedTravel, impact, area, trace };
}
