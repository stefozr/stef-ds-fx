// Read-only loader for the Sequencer databases of the installed effect packs (JB2A Patreon / free, Eskie, PSFX,
// BLFX, Animated Spell Effects Cartoon). Imports each pack's own database builder from its folder and flattens it
// to the dot paths Sequencer would know (`jb2a.fire_bolt.orange.30ft`). Nothing is written.
//
// Usage: node tools/asset-db.mjs [prefix]   prints the matching paths (all when no prefix)
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const MODULES = process.env.DS_MODULES_DIR || path.resolve(import.meta.dirname, "..", "..");
/** The Foundry Data folder (database file paths are relative to it). */
export const DATA_DIR = path.resolve(MODULES, "..");

const PACKS = [
  { ns: "jb2a", module: "jb2a_patreon", file: "scripts/jb2a_sequencer.js", build: "jb2aPatreonDatabase", db: "patreonDatabase", arg: "modules" },
  { ns: "jb2a", module: "JB2A_DnD5e", file: "scripts/jb2a_sequencer.js", build: "jb2aFreeDatabase", db: "freeDatabase", arg: "modules/JB2A_DnD5e" },
  { ns: "eskie", module: "eskie-effects", file: "scripts/sequencer-database.js", build: "createDatabase", db: "database", arg: "modules" },
  { ns: "psfx", module: "psfx-patreon", file: "scripts/psfx_sequencer.js", build: "registerPSFXDatabase", db: "psfxDatabase", arg: "modules/psfx-patreon" },
  { ns: "blfx", module: "blfx-assets-pack01", file: "scripts/resources.js", build: "createDatabase", db: "database", arg: "modules" },
];

/** The first media file of a database leaf (a path, a list of paths, or `{file}`). */
function leafFile(leaf) {
  if (typeof leaf === "string") return leaf;
  if (Array.isArray(leaf)) return leafFile(leaf[0]);
  if (leaf && typeof leaf === "object" && "file" in leaf) return leafFile(leaf.file);
  return null;
}

/**
 * Flatten like Sequencer's `_flatten` (keys with a `.file` leaf collapse onto their parent).
 * `files` (optional) collects key -> first media file, relative to the Data folder.
 */
function flatten(obj, prefix, out, files) {
  if (typeof obj === "string" || Array.isArray(obj)) {
    out.add(prefix);
    files?.set(prefix, leafFile(obj));
    return;
  }
  if (!obj || typeof obj !== "object") return;
  if ("file" in obj && (typeof obj.file === "string" || Array.isArray(obj.file) || typeof obj.file === "object")) {
    out.add(prefix);
    files?.set(prefix, leafFile(obj.file));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_") || k === "file") continue;
    flatten(v, `${prefix}.${k}`, out, files);
  }
}

/**
 * @returns {Promise<{paths: Set<string>, files: Map<string, string>, packs: Record<string, string>}>}
 *   files: key -> first media file (relative to the Data folder); packs: module id -> "ok" | reason
 */
export async function loadAssetDb() {
  const paths = new Set();
  const files = new Map();
  const packs = {};
  for (const p of PACKS) {
    const file = path.join(MODULES, p.module, p.file);
    if (!existsSync(file)) { packs[p.module] = "not installed"; continue; }
    try {
      const mod = await import(pathToFileURL(file).href);
      const build = mod[p.build];
      const db = mod[p.db];
      if (typeof build !== "function" || !db) { packs[p.module] = `no ${p.build}/${p.db} export`; continue; }
      await build(p.arg);
      flatten(db, p.ns, paths, files);
      packs[p.module] = "ok";
    } catch (err) {
      packs[p.module] = `failed: ${err.message}`;
    }
  }
  return { paths, files, packs };
}

/** Sequencer's entryExists, restricted to whole dot segments (no partial-segment matches). */
export function hasEntry(paths, key) {
  if (paths.has(key)) return true;
  const pre = `${key}.`;
  for (const p of paths) if (p.startsWith(pre)) return true;
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { paths, packs } = await loadAssetDb();
  console.error(JSON.stringify(packs));
  const prefix = process.argv[2] ?? "";
  for (const p of [...paths].sort()) if (p.startsWith(prefix)) console.log(p);
}
