// Check every built-in preset key against the installed effect packs (read-only).
// A key whose pack is installed but which is not in that pack's database FAILS; a key whose pack is not installed is
// reported as skipped (the candidate list falls through to the next pack at runtime).
//
// Usage: node tools/verify-presets.mjs
import { loadAssetDb, hasEntry } from "./asset-db.mjs";
import { BUILTIN_RULES } from "../scripts/recipes/presets.mjs";
import { SIGNATURES } from "../scripts/recipes/signatures.mjs";

const NS_PACKS = { jb2a: ["jb2a_patreon", "JB2A_DnD5e"], eskie: ["eskie-effects"], psfx: ["psfx-patreon"], blfx: ["blfx-assets-pack01"] };

const { paths, packs } = await loadAssetDb();
console.log("packs:", JSON.stringify(packs));

let failures = 0;
let skipped = 0;
let checked = 0;
const seen = new Set();
for (const kind of ["files", "sounds"]) {
  for (const [slot, table] of Object.entries(BUILTIN_RULES[kind])) {
    for (const [el, list] of Object.entries(table)) {
      for (const key of list) {
        if (seen.has(key)) continue;
        seen.add(key);
        const ns = key.split(".")[0];
        const loaded = (NS_PACKS[ns] ?? []).some(m => packs[m] === "ok");
        if (!loaded) { skipped++; console.log(`skip  ${kind}.${slot}.${el}: ${key} (pack not installed)`); continue; }
        checked++;
        if (!hasEntry(paths, key)) { failures++; console.log(`FAIL  ${kind}.${slot}.${el}: ${key}`); }
      }
    }
  }
  // Every table needs a fallback row.
  for (const [slot, table] of Object.entries(BUILTIN_RULES[kind])) {
    if (!table["*"]?.length) { failures++; console.log(`FAIL  ${kind}.${slot}: no "*" row`); }
  }
}
// Signature recipes: every listed key must exist too.
for (const [dsid, recipe] of Object.entries(SIGNATURES)) {
  for (const [slot, value] of Object.entries(recipe)) {
    if (!Array.isArray(value)) continue;
    for (const key of value) {
      const ns = key.split(".")[0];
      const loaded = (NS_PACKS[ns] ?? []).some(m => packs[m] === "ok");
      if (!loaded) { skipped++; console.log(`skip  signature ${dsid}.${slot}: ${key} (pack not installed)`); continue; }
      checked++;
      if (!hasEntry(paths, key)) { failures++; console.log(`FAIL  signature ${dsid}.${slot}: ${key}`); }
    }
  }
}
console.log(`verify-presets: ${checked} keys checked, ${skipped} skipped, ${failures} failures`);
process.exit(failures ? 1 : 0);
