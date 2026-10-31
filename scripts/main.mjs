import { MODULE_ID } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerAreaCache } from "./trigger/area-cache.mjs";
import { registerAaGuard } from "./compat/aa-bridge.mjs";
import { registerItemSection } from "./ui/item-section.mjs";
import { buildApi, onCreateChatMessage, selfCheck } from "./api.mjs";
import { registerLegacyMigration } from "./legacy-migration.mjs";

/** The id this module had before 1.0 ("Draw Steel: Ability Animations"). */
const LEGACY_ID = "ds-auto-fx";

/** A stored world setting's value (serialized as JSON in the Setting document), or undefined. */
function storedValue(key) {
  const raw = game.settings.storage.get("world").getSetting(key)?._source.value;
  try { return raw == null ? undefined : JSON.parse(raw); } catch (_err) { return undefined; }
}

const legacy = registerLegacyMigration({
  moduleId: MODULE_ID, legacyIds: [LEGACY_ID], version: "1.0.0",
  // Settings are copied verbatim before this runs. The `animator` choice value is the module id itself, and a rules
  // override could name a file under the old module folder.
  extra: async ({ dryRun, report }) => {
    const animator = storedValue(`${MODULE_ID}.animator`) ?? storedValue(`${LEGACY_ID}.animator`);
    if (animator === LEGACY_ID) {
      report.extra.push(`animator: "${LEGACY_ID}" -> "${MODULE_ID}"`);
      if (!dryRun) await game.settings.set(MODULE_ID, "animator", MODULE_ID);
    }
    const rules = storedValue(`${MODULE_ID}.rules`) ?? storedValue(`${LEGACY_ID}.rules`);
    const text = rules ? JSON.stringify(rules) : "";
    if (text.includes(`modules/${LEGACY_ID}/`)) {
      report.extra.push(`rules: file paths under modules/${LEGACY_ID}/ -> modules/${MODULE_ID}/`);
      if (!dryRun) {
        await game.settings.set(MODULE_ID, "rules", JSON.parse(text.replaceAll(`modules/${LEGACY_ID}/`, `modules/${MODULE_ID}/`)));
      }
    }
  },
});

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MODULE_ID).api = { ...buildApi(), migrateLegacy: legacy.migrate };
  // Effect packs register their databases in their own sequencerReady listeners: check after all of them ran.
  Hooks.once("sequencerReady", () => setTimeout(() => {
    if (game.system.id !== "draw-steel" || !game.user.isGM) return;
    const check = selfCheck();
    if (!check.ok) console.warn(`${MODULE_ID} | selfCheck`, check.problems.map(p => p.text));
  }, 0));
});

Hooks.once("ready", () => {
  if (game.system.id !== "draw-steel") return;
  registerAreaCache();
  registerAaGuard();
  registerItemSection();
  Hooks.on("createChatMessage", onCreateChatMessage);
});
