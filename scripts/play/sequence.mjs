/**
 * Recipe + play context → one Sequencer `Sequence`: cast on the caster → area → travel to each target → impact per
 * target (scaled by its tier, a flourish on a critical tier 3) → sounds. Missing files skip their step.
 */
import { MODULE_ID, setting } from "../constants.mjs";
import { firstAvailable, variantOf } from "./assets.mjs";
import { burstPlacement, shapePlacements } from "./geometry.mjs";

const STAGGER_MS = 120;

/** Tier → impact scale, from the `tierScale` setting ("0.7, 1, 1.3"). */
export function tierScales(text) {
  const parts = String(text ?? "").split(",").map(s => Number(s.trim()));
  const ok = parts.length === 3 && parts.every(n => Number.isFinite(n) && n > 0);
  return ok ? parts : [0.7, 1, 1.3];
}

/** Squares between two tokens' edges (0 = adjacent). */
function gapSquares(a, b) {
  const g = canvas.grid.size;
  const dx = Math.abs(a.center.x - b.center.x) - (a.w + b.w) / 2;
  const dy = Math.abs(a.center.y - b.center.y) - (a.h + b.h) / 2;
  return Math.max(dx, dy, 0) / g;
}

/**
 * @param {object} ctx      {source, targets: [{token, tier, crit}], item, shapes}
 * @param {object} recipe   resolveRecipe() result
 * @param {{local?: boolean}} [options]  local: play on this client only (previews)
 * @returns {Sequence|null}  null when nothing would play
 */
export function buildSequence(ctx, recipe, { local = false } = {}) {
  if (!globalThis.Sequence || recipe.mode === "none") return null;
  const seq = new Sequence({ moduleName: MODULE_ID, softFail: true, quietError: true });
  const volume = Number(setting("volume")) || 0;
  const scales = tierScales(setting("tierScale"));
  const { source } = ctx;
  let steps = 0;

  /** An effect section; `sprite` copies a token's image instead of playing a file (the hit flash). */
  const effect = (file, { sprite = null } = {}) => {
    const e = sprite ? seq.effect().copySprite(sprite) : seq.effect().file(variantOf(file));
    if (local) e.locally();
    steps++;
    return e;
  };
  const sound = (candidates, delay = 0) => {
    if (!volume) return;
    const file = firstAvailable(candidates);
    if (!file) return;
    const s = seq.sound().file(variantOf(file)).volume(volume);
    if (delay) s.delay(delay);
    if (local) s.locally();
  };

  // 1. Cast burst on the caster.
  const castFile = recipe.cast && firstAvailable(recipe.cast.files);
  if (castFile) {
    sound(recipe.cast.sound);
    effect(castFile).atLocation(source).scaleToObject(1.75).waitUntilFinished(-700);
  }

  // 2. Area: burst around the caster, or the shapes the ability was aimed with.
  if (recipe.area && setting("areaEffects")) {
    const areaFile = firstAvailable(recipe.area.files);
    let placements = [];
    if (recipe.area.kind === "burst") {
      const radius = Number(ctx.item?.system?.distance?.primary) || 1;
      const p = burstPlacement({ center: source.center, tokenSquares: source.document.width, radius, gridSize: canvas.grid.size });
      if (p) placements = [p];
    } else {
      placements = shapePlacements(ctx.shapes);
    }
    if (areaFile && placements.length) {
      sound(recipe.area.sound);
      const maxMs = Number(recipe.area.maxMs) || 0;
      placements.forEach((p, i) => {
        const e = effect(areaFile);
        if (p.type === "line") e.atLocation(p.from).stretchTo(p.to);
        else if (p.type === "rect") e.atLocation({ x: p.x, y: p.y }).size({ width: p.width, height: p.height });
        else e.atLocation({ x: p.x, y: p.y }).size({ width: p.size, height: p.size });
        e.belowTokens(p.type !== "line");
        // Aura and zone files are long loops: cut them short with a fade.
        if (maxMs) e.duration(maxMs).fadeIn(200).fadeOut(600);
        if (i === placements.length - 1) e.waitUntilFinished(maxMs ? -(maxMs - 600) : -900);
      });
    }
  }

  const targets = ctx.targets ?? [];
  // 3. Travel to each target (melee swing or projectile); meleeRanged swings at adjacent targets, shoots at the rest.
  const travels = [];
  for (const [i, t] of targets.entries()) {
    if (t.token === source) continue;
    let travel = recipe.travel;
    if (recipe.rangedTravel && gapSquares(source, t.token) >= 0.5) travel = recipe.rangedTravel;
    const file = travel && firstAvailable(travel.files);
    if (!file) continue;
    travels.push({ i, travel, file, token: t.token });
  }
  if (travels.length) {
    sound(travels[0].travel.sound);
    travels.forEach(({ i, file, token }, n) => {
      const e = effect(file).atLocation(source).stretchTo(token).delay(i * STAGGER_MS);
      if (n === travels.length - 1) e.waitUntilFinished(-500);
    });
  }

  // 4. Impact per target. Attacks scale by tier: a tier 1 hit is fainter, a tier 3 hit flashes the target and shakes
  //    the screen, a critical tier 3 adds a flourish. Heals and buffs play at one size. Self abilities and heals
  //    without targets land on the caster.
  const onCaster = recipe.delivery === "self" || recipe.impact?.onCaster;
  const impactTargets = targets.length ? targets : onCaster ? [{ token: source, tier: 2, crit: false }] : [];
  const impactFile = recipe.impact && firstAvailable(recipe.impact.files);
  if (impactFile && impactTargets.length) {
    sound(recipe.impact.sound);
    const byTier = recipe.impact.byTier !== false;
    const critFile = byTier && firstAvailable(recipe.impact.crit);
    let bigHit = false;
    for (const [i, t] of impactTargets.entries()) {
      const tier = byTier ? Math.min(3, Math.max(1, Number(t.tier) || 2)) : 2;
      const delay = i * STAGGER_MS;
      const e = effect(impactFile).atLocation(t.token).scaleToObject(byTier ? 1.5 * scales[tier - 1] : 1.4).delay(delay);
      if (tier === 1 && byTier) e.opacity(0.75);
      if (tier === 3 && byTier) {
        bigHit = true;
        if (setting("hitFlash") && t.token !== source) {
          effect(null, { sprite: t.token }).attachTo(t.token).filter("ColorMatrix", { brightness: 2.5 })
            .fadeIn(60).fadeOut(260).duration(420).delay(delay + 80);
        }
      }
      if (critFile && tier === 3 && t.crit) effect(critFile).atLocation(t.token).scaleToObject(2).delay(delay + 150);
    }
    if (bigHit && setting("screenShake")) {
      const pan = seq.canvasPan().shake({ duration: 300, strength: 6, frequency: 25, fadeOutDuration: 150, rotation: false }).delay(150);
      if (local) pan.locally();
    }
  }

  return steps ? seq : null;
}
