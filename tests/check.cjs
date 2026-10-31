// Static checks for stef-ds-fx: syntax, JSON, manifest paths, import graph, i18n keys.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
const fail = msg => { failures++; console.log("FAIL", msg); };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const mjs = files.filter(f => f.endsWith(".mjs"));

// 1. Syntax
for (const f of mjs) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { fail(`syntax ${path.relative(ROOT, f)}\n${e.stderr}`); }
}
console.log(`syntax: ${mjs.length} files checked`);

// 2. JSON + manifest paths
const json = {};
for (const f of ["module.json", "lang/en.json"]) {
  try { json[f] = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")); }
  catch (e) { fail(`json ${f}: ${e.message}`); }
}
const manifest = json["module.json"] ?? {};
for (const p of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(l => l.path),
  manifest.readme, manifest.changelog, manifest.license].filter(Boolean)) {
  if (!fs.existsSync(path.join(ROOT, p))) fail(`manifest path missing: ${p}`);
}

// 3. Import graph: every relative import resolves and every imported name is exported.
const exportsOf = new Map();
for (const f of mjs) {
  const src = fs.readFileSync(f, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(",")) names.add(n.trim().split(/\s+as\s+/).pop());
  exportsOf.set(path.resolve(f), names);
}
for (const f of mjs) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(f), m[2]);
    if (!exportsOf.has(target)) { fail(`${path.relative(ROOT, f)}: import target missing ${m[2]}`); continue; }
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (name && !exportsOf.get(target).has(name)) fail(`${path.relative(ROOT, f)}: "${name}" not exported by ${m[2]}`);
    }
  }
}

// 4. i18n: every literal DSAUTOFX.* key in scripts and templates exists; dynamic key families are checked against
//    the values they are built from.
const flat = {};
(function flatten(o, pre) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const key = pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key); else flat[key] = v;
  }
})(json["lang/en.json"], "");
const sources = files.filter(f => /\.(mjs|hbs)$/.test(f) && !f.includes(`${path.sep}tests${path.sep}`) && !f.includes(`${path.sep}tools${path.sep}`));
let literal = 0;
for (const f of sources) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`](DSAUTOFX\.[A-Za-z0-9_.-]+[A-Za-z0-9_-])["'`]/g)) {
    literal++;
    if (!(m[1] in flat)) fail(`i18n missing ${m[1]} (${path.relative(ROOT, f)})`);
  }
}
const families = {
  "DSAUTOFX.Settings.%.Name": ["enabled", "animator", "waitForDice", "volume", "tierScale", "areaEffects", "signatures", "screenShake", "hitFlash", "rules", "debug"],
  "DSAUTOFX.Settings.%.Hint": ["enabled", "animator", "waitForDice", "volume", "tierScale", "areaEffects", "signatures", "screenShake", "hitFlash", "rules", "debug"],
  "DSAUTOFX.Settings.animator.Choices.%": ["auto", "stef-ds-fx"],
  "DSAUTOFX.Item.Mode.%": ["auto", "custom", "none"],
  "DSAUTOFX.Item.Animator.%": ["stef-ds-fx", "bridge", "none"],
  "DSAUTOFX.Item.Slot.%": ["cast", "travel", "impact", "crit", "area", "castSound", "travelSound", "impactSound", "areaSound"],
  "DSAUTOFX.Rules.Kind.%": ["files", "sounds"],
};
(async () => {
  const presets = await import(path.join(ROOT, "scripts/recipes/presets.mjs").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "file:///$1:"));
  families["DSAUTOFX.Delivery.%"] = Object.keys(presets.DELIVERIES);
  families["DSAUTOFX.Element.%"] = [...presets.ELEMENTS];
  families["DSAUTOFX.Rules.Slot.%"] = [...new Set([...presets.FILE_SLOTS, ...presets.SOUND_SLOTS])];
  families["DSAUTOFX.Style.%"] = [...presets.STYLES];
  families["DSAUTOFX.Physical.%"] = [...presets.PHYSICAL];
  let dyn = 0;
  for (const [pattern, values] of Object.entries(families)) {
    for (const v of values) {
      dyn++;
      const key = pattern.replace("%", v);
      if (!(key in flat)) fail(`i18n missing ${key}`);
    }
  }
  console.log(`i18n: ${literal} literal keys, ${dyn} dynamic keys checked`);
  console.log(failures ? `check: ${failures} failure(s)` : "check: all green");
  process.exit(failures ? 1 : 0);
})();
