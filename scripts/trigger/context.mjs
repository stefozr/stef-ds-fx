/**
 * Build the play context of a card on the author's client: caster token, targets with their tier, damage type and
 * the area the ability was aimed with.
 */
import { abilityUse, readOutcome } from "./chat-adapter.mjs";
import { areaShapes } from "./area-cache.mjs";
import { coreTargets } from "../compat/automation-suite.mjs";

/** The token placeable of a token uuid / document on the viewed scene. */
function tokenOnCanvas(docOrUuid) {
  let doc = docOrUuid;
  if (typeof doc === "string") {
    try { doc = fromUuidSync(doc); } catch (_err) { return null; }
  }
  if (!doc || doc.parent?.id !== canvas.scene?.id) return null;
  return doc.object ?? null;
}

/** A token of an actor (by uuid) on the viewed scene: the synthetic actor's own token, else the first active one. */
function tokenForActorUuid(actorUuid) {
  let actor = null;
  try { actor = fromUuidSync(actorUuid); } catch (_err) { return null; }
  if (!actor) return null;
  if (actor.isToken) return tokenOnCanvas(actor.token);
  return actor.getActiveTokens?.(true, false)?.find(t => t.document.parent?.id === canvas.scene?.id) ?? null;
}

/** The caster: the speaker token when it belongs to the ability's actor, else the actor's token on this scene. */
export function sourceToken(message, item) {
  const { scene, token } = message.speaker ?? {};
  const actor = item?.actor;
  if (scene && token && scene === canvas.scene?.id) {
    const t = canvas.tokens.get(token);
    if (t && (!actor || t.actor === actor || t.actor?.id === actor.id)) return t;
  }
  if (!actor) return null;
  if (actor.isToken) return tokenOnCanvas(actor.token);
  return actor.getActiveTokens?.(true, false)?.find(t => t.document.parent?.id === canvas.scene?.id) ?? null;
}

/**
 * @returns {{message: ChatMessage|null, item: Item, source: Token, targets: {token: Token, tier: number, crit: boolean}[],
 *   damageType: string|null, heal: boolean, shapes: object[]|null}|null}
 */
export function buildContext(message) {
  const use = abilityUse(message);
  if (!use) return null;
  let item = null;
  try { item = fromUuidSync(use.abilityUuid); } catch (_err) { /* deleted or compendium */ }
  if (!item || item.type !== "ability") return null;
  const source = sourceToken(message, item);
  if (!source) return null;

  const outcome = readOutcome(message);
  const fallback = outcome.untargeted ?? { tier: 2, crit: false };
  const outcomeOf = (token, actorUuid) =>
    outcome.byToken.get(token.document.uuid) ?? outcome.byActor.get(actorUuid ?? token.actor?.uuid) ?? fallback;

  const seen = new Set();
  const targets = [];
  const add = (token, actorUuid = null) => {
    if (!token || seen.has(token.id)) return;
    seen.add(token.id);
    targets.push({ token, ...outcomeOf(token, actorUuid) });
  };

  const fromCore = coreTargets(message);
  if (fromCore) for (const t of fromCore) add(tokenOnCanvas(t.tokenUuid), t.actorUuid);
  else for (const token of game.user.targets) if (token.document.parent?.id === canvas.scene?.id) add(token);
  // Rolled targets the author no longer targets (targets changed while the dialog was open).
  const rolledActors = new Set(targets.map(t => t.token.actor?.uuid));
  for (const actorUuid of outcome.byActor.keys()) if (!rolledActors.has(actorUuid)) add(tokenForActorUuid(actorUuid), actorUuid);
  for (const tokenUuid of outcome.byToken.keys()) add(tokenOnCanvas(tokenUuid));

  return {
    message,
    item,
    source,
    targets,
    damageType: outcome.damageType,
    heal: outcome.heal,
    shapes: areaShapes(item.uuid, canvas.scene?.id),
  };
}
