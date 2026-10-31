import { ANIMATORS, MODULE_ID } from "./constants.mjs";
import { mergeRules } from "./recipes/presets.mjs";
import { SIGNATURES } from "./recipes/signatures.mjs";
import { RulesMenu } from "./ui/rules-menu.mjs";

let rulesCache = null;

/** The effective rules: built-in presets with the world's `rules` override merged over them. */
export function currentRules() {
  rulesCache ??= mergeRules(game.settings.get(MODULE_ID, "rules"));
  return rulesCache;
}

/** The signature table, or null when the `signatures` setting is off. */
export function currentSignatures() {
  return game.settings.get(MODULE_ID, "signatures") ? SIGNATURES : null;
}

export function registerSettings() {
  const reg = (key, data) => game.settings.register(MODULE_ID, key, {
    name: `DSAUTOFX.Settings.${key}.Name`,
    hint: `DSAUTOFX.Settings.${key}.Hint`,
    scope: "world",
    config: true,
    ...data,
  });

  reg("enabled", { type: Boolean, default: true });
  reg("animator", {
    type: String,
    default: "auto",
    choices: Object.fromEntries(ANIMATORS.map(a => [a, `DSAUTOFX.Settings.animator.Choices.${a}`])),
  });
  reg("waitForDice", { type: Boolean, default: true });
  reg("volume", { type: Number, default: 0.6, range: { min: 0, max: 1, step: 0.05 } });
  reg("tierScale", { type: String, default: "0.7, 1, 1.3" });
  reg("areaEffects", { type: Boolean, default: true });
  reg("signatures", { type: Boolean, default: true });
  reg("screenShake", { type: Boolean, default: true });
  reg("hitFlash", { type: Boolean, default: true });
  reg("rules", {
    type: Object,
    default: {},
    config: false,
    onChange: () => { rulesCache = null; },
  });
  reg("debug", { type: Boolean, default: false, scope: "client" });

  game.settings.registerMenu(MODULE_ID, "rulesMenu", {
    name: "DSAUTOFX.Rules.MenuName",
    label: "DSAUTOFX.Rules.MenuLabel",
    hint: "DSAUTOFX.Rules.MenuHint",
    icon: "fa-solid fa-wand-sparkles",
    type: RulesMenu,
    restricted: true,
  });
}
