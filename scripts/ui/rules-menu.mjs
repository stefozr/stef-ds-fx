/**
 * World rules editor (settings menu): candidate lists per slot and row (element, weapon style or physical damage
 * kind), and the keyword → element map. Stored as an override of the built-in presets in the `rules` setting; an
 * empty field keeps the built-in row, "-" removes it (the slot falls back to its `*` row). Each row has a ▶ button
 * that auditions its candidates on this client (`api.audition`).
 */
import { MODULE_ID } from "../constants.mjs";
import { BUILTIN_RULES, ELEMENTS, PHYSICAL, STYLES, tableRows } from "../recipes/presets.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The label of a table row. */
function rowLabel(row) {
  const loc = key => game.i18n.localize(key);
  if (row === "*") return loc("DSAUTOFX.Rules.Fallback");
  if (STYLES.includes(row)) return loc(`DSAUTOFX.Style.${row}`);
  if (PHYSICAL.includes(row)) return loc(`DSAUTOFX.Physical.${row}`);
  return loc(`DSAUTOFX.Element.${row}`);
}

export class RulesMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "stef-ds-fx-rules",
    tag: "form",
    classes: ["stef-ds-fx-rules"],
    window: { title: "DSAUTOFX.Rules.Title", icon: "fa-solid fa-wand-sparkles", resizable: true, contentClasses: ["standard-form"] },
    position: { width: 760, height: 600 },
    form: { handler: RulesMenu.#onSubmit, closeOnSubmit: true },
    actions: { reset: RulesMenu.#onReset, audition: RulesMenu.#onAudition },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/rules-menu.hbs`, scrollable: [""] },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  async _prepareContext() {
    const override = game.settings.get(MODULE_ID, "rules") ?? {};
    const loc = key => game.i18n.localize(key);
    const groups = [];
    for (const kind of ["files", "sounds"]) {
      for (const [slot, table] of Object.entries(BUILTIN_RULES[kind])) {
        groups.push({
          title: `${loc(`DSAUTOFX.Rules.Kind.${kind}`)}: ${loc(`DSAUTOFX.Rules.Slot.${slot}`)}`,
          rows: tableRows(slot).map(row => {
            const own = override[kind]?.[slot]?.[row];
            return {
              name: `${kind}|${slot}|${row}`,
              kind,
              slot,
              row,
              label: rowLabel(row),
              value: Array.isArray(own) ? (own.length ? own.join(", ") : "-") : "",
              placeholder: table[row]?.length ? table[row].join(", ") : loc("DSAUTOFX.Rules.UsesFallback"),
            };
          }),
        });
      }
    }
    const keywords = Object.keys(globalThis.ds?.CONFIG?.abilities?.keywords ?? BUILTIN_RULES.keywordElements).sort();
    const keywordRows = keywords.map(kw => {
      const own = override.keywordElements?.[kw] ?? "";
      const builtin = BUILTIN_RULES.keywordElements[kw] ?? "";
      return {
        name: `kw|${kw}`,
        label: kw,
        options: [
          { value: "", label: builtin ? `${loc("DSAUTOFX.Rules.Builtin")} (${loc(`DSAUTOFX.Element.${builtin}`)})` : loc("DSAUTOFX.Rules.Builtin"), selected: !own },
          ...ELEMENTS.map(e => ({ value: e, label: loc(`DSAUTOFX.Element.${e}`), selected: own === e })),
          { value: "off", label: loc("DSAUTOFX.Rules.NoElement"), selected: own === "off" },
        ],
      };
    });
    return {
      groups,
      keywordRows,
      buttons: [
        { type: "button", action: "reset", icon: "fa-solid fa-arrow-rotate-left", label: "DSAUTOFX.Rules.Reset" },
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: "DSAUTOFX.Rules.Save" },
      ],
    };
  }

  static async #onSubmit(_event, _form, formData) {
    const out = { version: 1, files: {}, sounds: {}, keywordElements: {} };
    for (const [name, raw] of Object.entries(formData.object)) {
      const value = String(raw ?? "").trim();
      const [kind, a, b] = name.split("|");
      if (kind === "kw") {
        if (value) out.keywordElements[a] = value;
        continue;
      }
      if (!value || !out[kind]) continue;
      (out[kind][a] ??= {})[b] = value === "-" ? [] : value.split(",").map(s => s.trim()).filter(Boolean);
    }
    await game.settings.set(MODULE_ID, "rules", out);
  }

  /** ▶ on a row: play the row's candidates (the typed list, else the built-in one) for this client only. */
  static async #onAudition(event, target) {
    const { kind, slot, row } = target.dataset;
    const input = this.element.querySelector(`input[name="${kind}|${slot}|${row}"]`);
    const text = String(input?.value ?? "").trim();
    const candidates = text && text !== "-" ? text.split(",").map(s => s.trim()).filter(Boolean) : null;
    const status = this.element.querySelector(".stef-ds-fx-audition-status");
    const show = msg => { if (status) status.textContent = msg; };
    const api = game.modules.get(MODULE_ID).api;
    const result = await api.audition({
      kind, slot, row, candidates,
      onStep: (key, n, total) => show(game.i18n.format("DSAUTOFX.Rules.Auditioning", { n, total, key })),
    });
    if (result) show(game.i18n.format("DSAUTOFX.Rules.AuditionDone", { total: result.played.length }));
  }

  static async #onReset() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "DSAUTOFX.Rules.Reset" },
      content: `<p>${game.i18n.localize("DSAUTOFX.Rules.ResetConfirm")}</p>`,
    });
    if (!ok) return;
    await game.settings.set(MODULE_ID, "rules", {});
    this.render();
  }
}
