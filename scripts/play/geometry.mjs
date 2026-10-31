/**
 * Area geometry (pure): where an area animation plays, in canvas pixels.
 * Placements: `{type: "circle", x, y, size}` (size = diameter), `{type: "rect", x, y, width, height}` (x, y = centre),
 * `{type: "line", from: {x, y}, to: {x, y}, width}`.
 */

/** A burst or aura around the caster: the token plus `radius` squares on every side. */
export function burstPlacement({ center, tokenSquares = 1, radius = 0, gridSize = 100 }) {
  if (!center) return null;
  const size = (Math.max(1, tokenSquares) + 2 * Math.max(0, radius)) * gridSize;
  return { type: "circle", x: center.x, y: center.y, size };
}

/** Placements of the region shapes the use dialog drew (v14 shape data: rectangle, line, circle). */
export function shapePlacements(shapes) {
  const out = [];
  for (const s of shapes ?? []) {
    const n = k => Number(s?.[k]) || 0;
    switch (s?.type) {
      case "rectangle": {
        const width = n("width");
        const height = n("height");
        if (!width || !height) break;
        const ax = s.anchorX ?? 0;
        const ay = s.anchorY ?? 0;
        out.push({ type: "rect", x: n("x") + width * (0.5 - ax), y: n("y") + height * (0.5 - ay), width, height });
        break;
      }
      case "line": {
        const length = n("length");
        if (!length) break;
        const rad = (n("rotation") * Math.PI) / 180;
        const from = { x: n("x"), y: n("y") };
        out.push({ type: "line", from, to: { x: from.x + length * Math.cos(rad), y: from.y + length * Math.sin(rad) }, width: n("width") });
        break;
      }
      case "circle": {
        const radius = n("radius");
        if (radius) out.push({ type: "circle", x: n("x"), y: n("y"), size: radius * 2 });
        break;
      }
      default: break;
    }
  }
  return out;
}
