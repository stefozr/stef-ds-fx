/**
 * Remembers the area an ability was aimed with. The system's use dialog deletes its region when the dialog is
 * submitted (draw-steel.mjs:4567), before the card exists, so the shapes are captured while the region lives:
 * every region the system or Combat Tools places for an ability carries `flags["draw-steel"].abilitySource` =
 * the ability's uuid (draw-steel.mjs:6650; Combat Tools area-picker.mjs).
 * Combat Tools 1.2.7 creates its held region without the flag and adds it in a later update
 * (area-picker.mjs `createHeldRegion`), so flag updates are read too.
 */
const TTL_MS = 60_000;
const cache = new Map();

function remember(region) {
  const itemUuid = region?.flags?.["draw-steel"]?.abilitySource;
  if (!itemUuid) return;
  const shapes = foundry.utils.deepClone(region._source?.shapes ?? []);
  if (!shapes.length) return;
  cache.set(itemUuid, { shapes, sceneId: region.parent?.id ?? null, at: Date.now() });
}

/** The latest shapes for an ability on a scene (within 60 s), or null. */
export function areaShapes(itemUuid, sceneId) {
  const now = Date.now();
  for (const [key, entry] of cache) if (now - entry.at > TTL_MS) cache.delete(key);
  const entry = cache.get(itemUuid);
  if (!entry || (sceneId && entry.sceneId && entry.sceneId !== sceneId)) return null;
  return entry.shapes;
}

export function registerAreaCache() {
  Hooks.on("createRegion", region => remember(region));
  Hooks.on("updateRegion", (region, changes) => {
    if ("shapes" in (changes ?? {}) || "flags" in (changes ?? {})) remember(region);
  });
}
