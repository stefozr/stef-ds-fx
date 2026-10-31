/**
 * The play pipeline (card → context → recipe → Sequence), previews, and the public API
 * (`game.modules.get("stef-ds-fx").api`).
 */
import { BRIDGE_ID, HOOKS, MODULE_ID, debug, setting } from "./constants.mjs";
import { abilityUse } from "./trigger/chat-adapter.mjs";
import { buildContext, sourceToken } from "./trigger/context.mjs";
import { areaShapes } from "./trigger/area-cache.mjs";
import { abilityFacts, pick, resolveRecipe } from "./recipes/resolve.mjs";
import { FILE_SLOTS, SOUND_SLOTS, tableRows } from "./recipes/presets.mjs";
import { buildSequence } from "./play/sequence.mjs";
import { firstAvailable, missingAssets, variantOf } from "./play/assets.mjs";
import { animatorFor, bridgeActive, claimCard, releaseCaster } from "./compat/aa-bridge.mjs";
import { currentRules, currentSignatures } from "./settings.mjs";

const played = new Set();

function sequencerReady() {
  return !!(game.modules.get("sequencer")?.active && globalThis.Sequence && globalThis.Sequencer?.Database);
}

/** The recipe of an ability item (no card: the damage type comes from the item's own effects). */
export function resolve(item, { damageType = null, heal = false } = {}) {
  return resolveRecipe(abilityFacts(item), { rules: currentRules(), signatures: currentSignatures(), damageType, heal });
}

async function playResolved(ctx, recipe, { local = false } = {}) {
  if (Hooks.call(HOOKS.prePlay, ctx, recipe) === false) return false;
  const seq = buildSequence(ctx, recipe, { local });
  if (!seq) {
    debug("nothing to play", ctx.item?.name, recipe.trace);
    return false;
  }
  debug("play", ctx.item?.name, recipe.trace, ctx.targets.map(t => `${t.token.name}:T${t.tier}${t.crit ? "!" : ""}`));
  await seq.play();
  Hooks.callAll(HOOKS.played, ctx, recipe);
  return true;
}

/** Animate a card now (no animator check, no dice wait). Returns whether anything played. */
export async function play(message) {
  if (!sequencerReady()) return false;
  const ctx = buildContext(message);
  if (!ctx) return false;
  const recipe = resolve(ctx.item, { damageType: ctx.damageType, heal: ctx.heal });
  if (recipe.mode === "none") return false;
  return playResolved(ctx, recipe);
}

async function playCard(message) {
  try {
    if (setting("waitForDice") && game.dice3d?.waitFor3DAnimationByMessageID) {
      await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    }
    await play(message);
  } catch (err) {
    console.error(`${MODULE_ID} | play`, err);
  }
}

/**
 * createChatMessage, author's client only (Sequencer broadcasts to everyone). The animator decision and the bridge
 * claim run synchronously, before ds-aa-bridge's async handler reaches Automated Animations.
 */
export function onCreateChatMessage(message, _options, userId) {
  try {
    if (userId !== game.user.id || !setting("enabled") || !sequencerReady()) return;
    if (played.has(message.id)) return;
    const use = abilityUse(message);
    if (!use) return;
    let item = null;
    try { item = fromUuidSync(use.abilityUuid); } catch (_err) { return; }
    if (!item || item.type !== "ability") return;
    const facts = abilityFacts(item);
    const recipe = resolveRecipe(facts, { rules: currentRules(), signatures: currentSignatures() });
    const source = sourceToken(message, item);
    const who = animatorFor(recipe, facts);
    debug("card", item.name, "animator", who);
    if (who === "bridge") { releaseCaster(source?.id); return; }
    claimCard(message, source?.id, { area: !!recipe.area });
    if (who === "none") return;
    played.add(message.id);
    if (played.size > 200) played.delete(played.values().next().value);
    playCard(message);
  } catch (err) {
    console.error(`${MODULE_ID} | createChatMessage`, err);
  }
}

/**
 * Play an ability's recipe on this client only (sheet Preview button).
 * @param {Item} item
 * @param {{source?: Token, targets?: Token[], tier?: number, crit?: boolean}} [options]
 */
export async function preview(item, { source, targets, tier = 2, crit = false } = {}) {
  if (!sequencerReady()) {
    ui.notifications.warn("DSAUTOFX.Preview.NoSequencer", { localize: true });
    return false;
  }
  const actor = item?.actor;
  source ??= canvas.tokens.controlled.find(t => !actor || t.actor === actor)
    ?? actor?.getActiveTokens?.(true, false)?.find(t => t.document.parent?.id === canvas.scene?.id)
    ?? canvas.tokens.controlled[0];
  if (!source) {
    ui.notifications.warn("DSAUTOFX.Preview.NoToken", { localize: true });
    return false;
  }
  targets ??= [...game.user.targets].filter(t => t !== source);
  const ctx = {
    message: null,
    item,
    source,
    targets: targets.map(token => ({ token, tier, crit })),
    damageType: null,
    shapes: areaShapes(item.uuid, canvas.scene?.id),
  };
  const recipe = resolve(item);
  if (recipe.mode === "none") return false;
  return playResolved(ctx, recipe, { local: true });
}

/** Problems a GM should know about (console-friendly). */
export function selfCheck() {
  const problems = [];
  const info = {
    version: game.modules.get(MODULE_ID)?.version,
    enabled: setting("enabled"),
    animator: setting("animator"),
    bridgeActive: bridgeActive(),
    bridgeInstalled: !!game.modules.get(BRIDGE_ID),
    automatedAnimations: !!game.modules.get("autoanimations")?.active,
  };
  if (!sequencerReady()) problems.push({ id: "noSequencer", text: "Sequencer is not active: nothing will play." });
  const packs = ["jb2a_patreon", "JB2A_DnD5e", "eskie-effects", "blfx-assets-pack01"].filter(id => game.modules.get(id)?.active);
  info.packs = packs;
  if (!packs.length) problems.push({ id: "noPacks", text: "No effect pack (JB2A, Eskie, BLFX) is active: only file paths will play." });
  if (!game.modules.get("psfx-patreon")?.active && !game.modules.get("blfx-assets-pack01")?.active) {
    problems.push({ id: "noSounds", text: "No sound pack (PSFX, BLFX) is active: abilities play without sound." });
  }
  if (sequencerReady()) {
    const rules = currentRules();
    const unresolved = [];
    for (const [kind, slots] of [["files", FILE_SLOTS], ["sounds", SOUND_SLOTS]]) {
      for (const slot of slots) {
        for (const row of tableRows(slot)) {
          const list = pick(rules[kind][slot], row);
          if (list.length && !firstAvailable(list)) unresolved.push(`${kind}.${slot}.${row}`);
        }
      }
    }
    if (unresolved.length) problems.push({ id: "unresolved", text: `No available file for: ${unresolved.join(", ")}`, rows: unresolved });
    const effectLevel = game.settings.get("sequencer", "permissions-effect-create");
    const soundLevel = game.settings.get("sequencer", "permissions-sound-create");
    if (effectLevel > 0 || soundLevel > 0) {
      problems.push({ id: "sequencerPermissions", text: "Sequencer's effect/sound permissions are above Player: players' abilities won't animate." });
    }
  }
  info.missingAssets = missingAssets();
  return { ok: !problems.length, problems, info };
}

/** Slots that travel from the caster to the target, slots that sit on the caster, and slots over an area. */
const TRAVEL_SLOTS = new Set(["melee", "arrow", "thrown", "bolt", "line"]);
const CASTER_SLOTS = new Set(["cast", "buff"]);
const AREA_SLOTS = new Set(["burst", "area", "aura", "zone"]);

/**
 * Play every candidate of one rules row, one after another, on this client only: the selected token is the caster,
 * the first target (else the caster) the target. For the rules menu's ▶ buttons and for curating the tables.
 * @param {{kind?: "files"|"sounds", slot: string, row?: string, candidates?: string[]|null, source?: Token,
 *   target?: Token, onStep?: (key: string, n: number, total: number) => void}} options
 * @returns {Promise<{played: string[], missing: string[]}|null>}
 */
export async function audition({ kind = "files", slot, row = "*", candidates = null, source, target, onStep } = {}) {
  if (!sequencerReady()) {
    ui.notifications.warn("DSAUTOFX.Preview.NoSequencer", { localize: true });
    return null;
  }
  source ??= canvas.tokens.controlled[0];
  if (!source) {
    ui.notifications.warn("DSAUTOFX.Rules.AuditionNoToken", { localize: true });
    return null;
  }
  target ??= [...game.user.targets].find(t => t !== source) ?? source;
  const list = candidates ?? pick(currentRules()[kind]?.[slot], row);
  const played = [];
  const missing = [];
  const seq = new Sequence({ moduleName: MODULE_ID, softFail: true, quietError: true });
  const volume = Number(setting("volume")) || 0.6;
  const grid = canvas.grid.size;
  list.forEach(key => {
    if (!firstAvailable([key])) { missing.push(key); return; }
    played.push(key);
    const n = played.length;
    seq.thenDo(() => onStep?.(key, n, list.length - missing.length));
    if (kind === "sounds") {
      seq.sound().file(variantOf(key)).volume(volume).locally().waitUntilFinished(300);
      return;
    }
    const e = seq.effect().file(variantOf(key)).locally();
    if (TRAVEL_SLOTS.has(slot) && target !== source) e.atLocation(source).stretchTo(target);
    else if (CASTER_SLOTS.has(slot)) e.atLocation(source).scaleToObject(1.75);
    else if (AREA_SLOTS.has(slot)) {
      e.atLocation(source).size({ width: grid * 5, height: grid * 5 }).belowTokens();
      if (slot === "aura" || slot === "zone") e.duration(3000).fadeIn(200).fadeOut(600);
    } else e.atLocation(target).scaleToObject(1.5);
    e.waitUntilFinished(300);
  });
  if (missing.length) debug("audition: not available", missing);
  if (played.length) await seq.play();
  return { played, missing };
}

export function buildApi() {
  return { resolve, play, preview, audition, selfCheck };
}
