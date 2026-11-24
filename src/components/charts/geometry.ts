/**
 * Pure helpers for the hand-built SVG charts. Kept free of React so they can
 * be unit tested on their own.
 */

/**
 * SVG path for one line. A `null` point ends the current segment, so a
 * missing year shows as a gap instead of a straight line drawn across it.
 */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = "";
  let penDown = false;
  for (const p of points) {
    if (!p) {
      penDown = false;
      continue;
    }
    d += `${penDown ? "L" : "M"}${round(p.x)},${round(p.y)}`;
    penDown = true;
  }
  return d;
}

/** Year ticks that fit the width: every year, or every 2nd, 5th… always ending on the last year. */
export function yearTicks(from: number, to: number, width: number, minGap = 44): number[] {
  const count = to - from + 1;
  const fit = Math.max(1, Math.floor(width / minGap));
  const step = [1, 2, 5, 10, 20].find((s) => Math.ceil(count / s) <= fit) ?? 25;
  const ticks: number[] = [];
  for (let year = to; year >= from; year -= step) ticks.unshift(year);
  return ticks;
}

/**
 * Horizontal bar from `x0` (the baseline) to `x1`, with only the data end
 * rounded. Works for negative values, where the data end is on the left.
 */
export function barPath(x0: number, x1: number, y: number, height: number, radius = 4): string {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const r = Math.min(radius, (right - left) / 2, height / 2);
  const bottom = y + height;
  if (x1 >= x0) {
    return `M${round(left)},${round(y)}H${round(right - r)}Q${round(right)},${round(y)} ${round(right)},${round(y + r)}V${round(bottom - r)}Q${round(right)},${round(bottom)} ${round(right - r)},${round(bottom)}H${round(left)}Z`;
  }
  return `M${round(right)},${round(y)}H${round(left + r)}Q${round(left)},${round(y)} ${round(left)},${round(y + r)}V${round(bottom - r)}Q${round(left)},${round(bottom)} ${round(left + r)},${round(bottom)}H${round(right)}Z`;
}

/** Index of the item whose position is closest to `x`. */
export function nearestIndex(positions: number[], x: number): number {
  let best = 0;
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i] - x) < Math.abs(positions[best] - x)) best = i;
  }
  return best;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
