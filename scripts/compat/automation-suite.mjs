/**
 * Optional: Stef's Automation Suite for Draw Steel seeds its record on the card in preCreateChatMessage
 * (`flags["stef-ds-automation"].resolution`, stef-ds-automation/scripts/engine/seed.mjs), with the author's targets as
 * token uuids. Tiers are filled later by the Director, so they are taken from the card's rolls, not from the record.
 */
import { CORE_ID } from "../constants.mjs";

/** The token uuids and actor uuids of the record's targets, or null when core did not seed this card. */
export function coreTargets(message) {
  if (!game.modules.get(CORE_ID)?.active) return null;
  const targets = message?.flags?.[CORE_ID]?.resolution?.targets;
  if (!targets || typeof targets !== "object") return null;
  const out = [];
  for (const t of Object.values(targets)) {
    if (t?.tokenUuid) out.push({ tokenUuid: t.tokenUuid, actorUuid: t.actorUuid ?? null, tier: Number(t.tier) || null });
  }
  return out.length ? out : null;
}
