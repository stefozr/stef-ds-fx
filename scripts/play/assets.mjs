/**
 * Candidate lists → the first file that exists on this client. A candidate is a Sequencer database key
 * (`jb2a.fire_bolt.orange`) or a file path (contains "/" or ends in a media extension).
 */
import { debug } from "../constants.mjs";

const PATH_RE = /[\\/]|\.(webm|webp|png|jpg|jpeg|gif|mp4|ogg|mp3|wav|flac)$/i;
const missing = new Set();

export function isPath(candidate) {
  return PATH_RE.test(candidate);
}

/** Whole-segment database lookup (Sequencer's own entryExists also matches partial segments and warns). */
export function dbHas(key) {
  const db = globalThis.Sequencer?.Database;
  if (!db) return false;
  const entries = db.flattenedEntries;
  if (Array.isArray(entries)) return entries.some(e => e === key || e.startsWith(`${key}.`));
  try { return !!db.entryExists(key); } catch (_err) { return false; }
}

/** The first usable candidate, or null. Database keys must exist; file paths are trusted. */
export function firstAvailable(candidates) {
  for (const c of candidates ?? []) {
    if (!c) continue;
    if (isPath(c) || dbHas(c)) return c;
    if (!missing.has(c)) {
      missing.add(c);
      debug("missing asset", c);
    }
  }
  return null;
}

const DISTANCE_SUFFIX = /\.\d+ft$/;
const NUMBERED = /^\d+$/;

/**
 * A group key → one of its own entries, picked at random. Sequencer matches a group by text prefix, so the group
 * `blfx.sound.spell.cast.fire` would also play `…cast.fireball.*` and `…cast.fire_bolt.*`. Numbered variants
 * (`.1`, `.2`) are preferred over sub-families (`misc.impact.1` over `misc.impact.summon1.*`). Distance groups
 * (`.30ft`) stay whole: Sequencer resolves them as one range-find entry and picks the length itself.
 */
export function variantOf(key) {
  const entries = globalThis.Sequencer?.Database?.flattenedEntries;
  if (!key || isPath(key) || !Array.isArray(entries) || entries.includes(key)) return key;
  const roots = [...new Set(entries.filter(e => e.startsWith(`${key}.`)).map(e => e.replace(DISTANCE_SUFFIX, "")))];
  if (!roots.length || (roots.length === 1 && roots[0] === key)) return key;
  const numbered = roots.filter(e => NUMBERED.test(e.slice(key.length + 1)));
  const pool = numbered.length ? numbered : roots;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Database keys looked up and still not found on this client (for selfCheck; early lookups can predate the packs). */
export function missingAssets() {
  return [...missing].filter(key => !dbHas(key));
}
