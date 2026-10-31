// Contact sheet of Sequencer database entries: a PNG with a few frames of each effect, one row per key, so the
// built-in candidate lists can be judged by eye instead of by name. Read-only: frames are rendered with ffmpeg and
// composed by tools/contact_sheet.py (Python + Pillow) into the output file.
//
// Usage: node tools/contact-sheet.mjs --out <file.png> [--frames 4] <key | prefix*> ...
//   key      an exact database key, or a key whose entries share a prefix (the first entry is shown)
//   prefix*  every entry under the prefix, one row per variant (distance variants collapse to one row)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { DATA_DIR, loadAssetDb } from "./asset-db.mjs";

const DISTANCE = /\.(\d+ft)$/;
const PREFERRED = ["30ft", "15ft", "60ft", "05ft", "90ft"];

/** One entry per variant: distance variants (`.05ft` … `.90ft`) collapse onto their parent, 30 ft preferred. */
function collapse(keys) {
  const groups = new Map();
  for (const k of keys) {
    const base = k.replace(DISTANCE, "");
    const list = groups.get(base) ?? [];
    list.push(k);
    groups.set(base, list);
  }
  return [...groups.values()].map(list => {
    for (const d of PREFERRED) {
      const hit = list.find(k => k.endsWith(`.${d}`));
      if (hit) return hit;
    }
    return list.sort()[0];
  });
}

const args = process.argv.slice(2);
let out = null;
let frames = 4;
const wanted = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else if (args[i] === "--frames") frames = Number(args[++i]) || 4;
  else wanted.push(args[i]);
}
if (!out || !wanted.length) {
  console.error("usage: node tools/contact-sheet.mjs --out <file.png> [--frames 4] <key | prefix*> ...");
  process.exit(2);
}

const { files } = await loadAssetDb();
const keys = [...files.keys()].filter(k => files.get(k)).sort();
const rows = [];
for (const w of wanted) {
  if (w.endsWith("*")) {
    const pre = w.slice(0, -1);
    for (const k of collapse(keys.filter(k => k.startsWith(pre)))) rows.push(k);
  } else {
    const hit = keys.filter(k => k === w || k.startsWith(`${w}.`));
    if (!hit.length) { rows.push(w); continue; }
    rows.push(collapse(hit)[0]);
  }
}
const items = rows.map(k => ({ label: k, file: files.get(k) ? path.join(DATA_DIR, files.get(k)) : null }));
const py = spawnSync("python", [path.join(import.meta.dirname, "contact_sheet.py"), out, String(frames)], {
  input: JSON.stringify(items), encoding: "utf-8", maxBuffer: 1 << 26,
});
process.stdout.write(py.stdout ?? "");
process.stderr.write(py.stderr ?? "");
process.exit(py.status ?? 1);
