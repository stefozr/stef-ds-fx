/**
 * "Animation" fieldset in the ability sheet's Details tab (renderDrawSteelItemSheet). The inputs carry no `name`, so
 * the system sheet's own form submit ignores them; changes are written with setFlag here.
 */
import { FLAG_RECIPE, MODES, MODULE_ID } from "../constants.mjs";
import { DELIVERIES, ELEMENTS } from "../recipes/presets.mjs";
import { abilityFacts, ownRecipe, resolveRecipe } from "../recipes/resolve.mjs";
import { animatorFor } from "../compat/aa-bridge.mjs";
import { currentRules, currentSignatures } from "../settings.mjs";
import { preview } from "../api.mjs";

const TEMPLATE = `modules/${MODULE_ID}/templates/item-section.hbs`;
const SLOTS = ["cast", "travel", "impact", "crit", "area"];
const SOUND_SLOTS = ["castSound", "travelSound", "impactSound", "areaSound"];

/** The first candidate of each auto slot (placeholders). */
function autoPlaceholders(recipe) {
  const first = list => (Array.isArray(list) && list.length ? list[0] : "");
  return {
    cast: first(recipe.cast?.files),
    travel: first(recipe.travel?.files ?? recipe.rangedTravel?.files),
    impact: first(recipe.impact?.files),
    crit: first(recipe.impact?.crit),
    area: first(recipe.area?.files),
    castSound: first(recipe.cast?.sound),
    travelSound: first(recipe.travel?.sound),
    impactSound: first(recipe.impact?.sound),
    areaSound: first(recipe.area?.sound),
  };
}

async function sectionHtml(item, editable) {
  const rules = currentRules();
  const facts = abilityFacts(item);
  const raw = facts.recipe ?? {};
  const own = ownRecipe(raw);
  const recipe = resolveRecipe(facts, { rules, signatures: currentSignatures() });
  const auto = resolveRecipe({ ...facts, recipe: { mode: "custom", delivery: own.delivery, element: own.element } }, { rules });
  const placeholders = autoPlaceholders(auto);
  const loc = key => game.i18n.localize(key);
  const context = {
    editable,
    mode: own.mode,
    custom: own.mode === "custom",
    modes: MODES.map(m => ({ value: m, label: loc(`DSAUTOFX.Item.Mode.${m}`), selected: m === own.mode })),
    deliveries: [{ value: "", label: loc("DSAUTOFX.Item.Auto") }, ...Object.keys(DELIVERIES).map(d => ({
      value: d, label: loc(`DSAUTOFX.Delivery.${d}`), selected: d === own.delivery,
    }))],
    elements: [{ value: "", label: loc("DSAUTOFX.Item.Auto") }, ...ELEMENTS.map(e => ({
      value: e, label: loc(`DSAUTOFX.Element.${e}`), selected: e === own.element,
    }))],
    slots: SLOTS.map(s => ({ key: s, label: loc(`DSAUTOFX.Item.Slot.${s}`), value: raw[s] ?? "", placeholder: placeholders[s] })),
    sounds: SOUND_SLOTS.map(s => ({ key: s, label: loc(`DSAUTOFX.Item.Slot.${s}`), value: raw[s] ?? "", placeholder: placeholders[s] })),
    trace: recipe.trace.join(" · "),
    animator: loc(`DSAUTOFX.Item.Animator.${animatorFor(recipe, facts)}`),
    bridgeAnimation: facts.bridgeAnimation,
  };
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, context);
}

function readFields(fieldset) {
  const data = {};
  for (const input of fieldset.querySelectorAll("[data-fx-field]")) data[input.dataset.fxField] = input.value.trim();
  return data;
}

async function save(item, fieldset) {
  const data = readFields(fieldset);
  if (data.mode === "auto") return item.unsetFlag(MODULE_ID, FLAG_RECIPE);
  // Write every field so cleared inputs overwrite older values.
  const full = { mode: data.mode, delivery: data.delivery ?? "", element: data.element ?? "" };
  for (const s of [...SLOTS, ...SOUND_SLOTS]) full[s] = data[s] ?? item.getFlag(MODULE_ID, FLAG_RECIPE)?.[s] ?? "";
  return item.setFlag(MODULE_ID, FLAG_RECIPE, full);
}

async function inject(app, element) {
  const item = app.document;
  if (item?.type !== "ability") return;
  const details = element.querySelector('section[data-tab="details"]');
  if (!details) return;
  details.querySelectorAll("fieldset.stef-ds-fx").forEach(el => el.remove());
  const html = await sectionHtml(item, app.isEditable && item.isOwner);
  if (!details.isConnected) return;
  details.querySelectorAll("fieldset.stef-ds-fx").forEach(el => el.remove());
  details.insertAdjacentHTML("beforeend", html);
  const fieldset = details.querySelector("fieldset.stef-ds-fx");
  if (!fieldset) return;

  fieldset.addEventListener("change", event => {
    event.stopPropagation();
    if (!event.target.closest("[data-fx-field]")) return;
    save(item, fieldset).catch(err => console.error(`${MODULE_ID} | save`, err));
  });
  fieldset.querySelector('[data-fx-action="preview"]')?.addEventListener("click", event => {
    event.preventDefault();
    preview(item);
  });
}

export function registerItemSection() {
  Hooks.on("renderDrawSteelItemSheet", (app, element) => {
    inject(app, element).catch(err => console.error(`${MODULE_ID} | item section`, err));
  });
}
