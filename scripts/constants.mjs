export const MODULE_ID = "stef-ds-fx";
export const FLAG_RECIPE = "recipe";

export const BRIDGE_ID = "ds-aa-bridge";
export const CORE_ID = "stef-ds-automation";

export const HOOKS = Object.freeze({
  prePlay: "dsAutoFx.prePlay",
  played: "dsAutoFx.played",
});

/** Recipe modes stored on an item: `auto` follows the rules, `custom` overrides slots, `none` plays nothing. */
export const MODES = Object.freeze(["auto", "custom", "none"]);

/** Animator setting: who animates abilities without their own recipe while ds-aa-bridge is active. */
export const ANIMATORS = Object.freeze(["auto", MODULE_ID]);

export function setting(key) {
  return game.settings.get(MODULE_ID, key);
}

export function debug(...args) {
  try {
    if (setting("debug")) console.debug(`${MODULE_ID} |`, ...args);
  } catch (_err) { /* settings not registered yet */ }
}

export function warn(...args) {
  console.warn(`${MODULE_ID} |`, ...args);
}
