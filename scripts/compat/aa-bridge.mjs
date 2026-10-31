/**
 * Coexistence with DS AA Bridge (ds-aa-bridge) and Automated Animations, without touching either module.
 *
 * - While the bridge is active it stays the default animator: stef-ds-fx plays only abilities with their own recipe
 *   (mode custom / none), unless the world setting `animator` is "stef-ds-fx".
 * - When stef-ds-fx takes a card, the bridge's own AA request for it is stopped through AA's documented
 *   `AutomatedAnimations-WorkflowStart` hook (`data.stopWorkflow`; autoanimations.js `make`). The bridge marks its
 *   requests with `dsAaBridge: true` (ds-aa-bridge/src/apis/aa-api-bridge.js:183-191). Requests are matched by the
 *   caster token through a short-lived claim recorded synchronously in createChatMessage, before the bridge's async
 *   handler reaches AA. Side effect: the bridge logs "Automated Animations did not play" once per label (and its GM
 *   gets one notification per session).
 * - Without the bridge, AA's generic chat handler would name-match every Draw Steel card; stop it on cards
 *   stef-ds-fx animates (the same guard as ds-aa-bridge/src/main.js:190-196).
 * - The bridge's per-item `flags["ds-aa-bridge"].animation` plays through Sequencer directly and cannot be stopped:
 *   such items stay with the bridge.
 */
import { BRIDGE_ID, MODULE_ID, debug, setting } from "../constants.mjs";

const CLAIM_MS = 15_000;
/** tokenId → {expires, uses} */
const claims = new Map();
/** message ids stef-ds-fx animates (AA generic guard). */
const ownCards = new Set();

export function bridgeActive() {
  if (!game.modules.get(BRIDGE_ID)?.active) return false;
  try {
    return game.settings.get(BRIDGE_ID, "enabled") !== false;
  } catch (_err) {
    return true;
  }
}

/**
 * Who animates a card: "stef-ds-fx", "bridge" or "none".
 * @param {{owned: boolean, mode: string}} recipe
 * @param {{bridgeAnimation: string|null}} facts
 */
export function animatorFor(recipe, facts) {
  if (!bridgeActive()) return recipe.mode === "none" ? "none" : MODULE_ID;
  if (facts.bridgeAnimation) return "bridge";
  if (recipe.owned || setting("animator") === MODULE_ID) return recipe.mode === "none" ? "none" : MODULE_ID;
  return "bridge";
}

/**
 * Take a card from the bridge: its next AA request for this caster is stopped; for an area ability also the second
 * one the bridge sends after Target Damage writes the area's targets. Call synchronously from createChatMessage.
 */
export function claimCard(message, sourceTokenId, { area = false } = {}) {
  if (message?.id) {
    ownCards.add(message.id);
    if (ownCards.size > 200) ownCards.delete(ownCards.values().next().value);
  }
  if (sourceTokenId && bridgeActive()) claims.set(sourceTokenId, { expires: Date.now() + CLAIM_MS, uses: area ? 2 : 1 });
}

/** A new card from this caster that the bridge animates: drop any unused claim so it can't swallow that one. */
export function releaseCaster(sourceTokenId) {
  if (sourceTokenId) claims.delete(sourceTokenId);
}

function tokenIdOf(token) {
  return token?.document?.id ?? token?.id ?? null;
}

export function registerAaGuard() {
  if (!game.modules.get("autoanimations")?.active) return;
  Hooks.on("AutomatedAnimations-WorkflowStart", data => {
    try {
      if (data?.dsAaBridge) {
        const id = tokenIdOf(data.token);
        const claim = id ? claims.get(id) : null;
        if (!claim) return;
        if (claim.expires < Date.now()) { claims.delete(id); return; }
        data.stopWorkflow = true;
        if (--claim.uses <= 0) claims.delete(id);
        debug("stopped ds-aa-bridge request", data.item?.name);
        return;
      }
      const msg = data?.workflow;
      if (msg instanceof ChatMessage && ownCards.has(msg.id)) {
        data.stopWorkflow = true;
        debug("stopped AA generic workflow", msg.id);
      }
    } catch (err) {
      console.error(`${MODULE_ID} | AA guard`, err);
    }
  });
}
