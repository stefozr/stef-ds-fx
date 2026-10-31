/**
 * The ONLY reader of the Draw Steel ability card format (system.parts). The system fires no "ability used" hook
 * (draw-steel.mjs:6334 TODO), so the card is the signal. Keep every format assumption here so a system change is
 * fixed in one place.
 *
 * Draw Steel 1.1.2 (AbilityModel#use, draw-steel.mjs:6380-6470):
 * - `abilityUse000000` part: `{type: "abilityUse", abilityUuid}`, always present.
 * - `tier{N}Result00000` parts: `{type: "abilityResult", tier, rolls}`, one per tier GROUP; rolls = one PowerRoll per
 *   target (`options.target` = target ACTOR uuid; `product` = tier; `isCritical`, `isNat20`) followed by one
 *   DamageRoll per damage effect (`options.type`, `isHeal`). No targets = one part with an untargeted PowerRoll.
 * Draw Steel 1.2 (forward-compatible): `targetResult` parts, one per target, with `tier`, `targetUuid` (actor),
 * `tokenUuid` and `rolls: [powerRoll, ...damageRolls]`.
 */

/** Parts of a live card (Collection) or of source data (object map). */
export function cardParts(message) {
  const parts = message?.system?.parts;
  if (!parts) return [];
  if (Array.isArray(parts.contents)) return parts.contents;
  if (parts instanceof Map) return [...parts.values()];
  return Object.values(parts);
}

/** The ability use on a card: `{abilityUuid}` or null when the card is not an ability use. */
export function abilityUse(message) {
  const use = cardParts(message).find(p => p?.type === "abilityUse");
  return use?.abilityUuid ? { abilityUuid: use.abilityUuid } : null;
}

/** Default roll classifiers: the system's classes when loaded, else duck typing (tests). */
function classifiers(classes) {
  const PowerRoll = classes?.PowerRoll ?? globalThis.ds?.rolls?.PowerRoll;
  const DamageRoll = classes?.DamageRoll ?? globalThis.ds?.rolls?.DamageRoll;
  return {
    isPower: r => (PowerRoll ? r instanceof PowerRoll : r?.kind === "power"),
    isDamage: r => (DamageRoll ? r instanceof DamageRoll : r?.kind === "damage"),
  };
}

const critOf = r => !!(r?.isCritical || r?.isNat20);

/**
 * Read the outcome of a card.
 * @returns {{byActor: Map<string, {tier: number, crit: boolean}>, byToken: Map<string, {tier: number, crit: boolean}>,
 *   untargeted: {tier: number, crit: boolean}|null, damageType: string|null, heal: boolean}}
 *   byActor: target actor uuid → outcome (the last one wins when one actor rolled twice); byToken (1.2 only).
 */
export function readOutcome(message, classes) {
  const { isPower, isDamage } = classifiers(classes);
  const byActor = new Map();
  const byToken = new Map();
  let untargeted = null;
  let damageType = null;
  let heal = false;
  const noteDamage = roll => {
    if (roll?.isHeal || roll?.options?.isHeal) { heal = true; return; }
    const type = roll?.options?.type;
    if (!damageType && type) damageType = String(type);
  };

  for (const part of cardParts(message)) {
    if (part?.type === "abilityResult") {
      const tier = Number(part.tier) || null;
      for (const roll of part.rolls ?? []) {
        if (isDamage(roll)) { noteDamage(roll); continue; }
        if (!isPower(roll)) continue;
        const outcome = { tier: Number(roll.product) || tier, crit: critOf(roll) };
        const target = roll.options?.target;
        if (target) byActor.set(target, outcome);
        else untargeted = outcome;
      }
    } else if (part?.type === "targetResult") {
      const rolls = part.rolls ?? [];
      const power = rolls.find(isPower);
      const outcome = { tier: Number(part.tier) || Number(power?.product) || null, crit: critOf(power) };
      if (part.tokenUuid) byToken.set(part.tokenUuid, outcome);
      if (part.targetUuid) byActor.set(part.targetUuid, outcome);
      for (const roll of rolls) if (isDamage(roll)) noteDamage(roll);
    }
  }
  return { byActor, byToken, untargeted, damageType, heal };
}
