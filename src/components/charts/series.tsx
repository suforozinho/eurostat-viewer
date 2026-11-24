/**
 * Series identity = color + marker shape + name. Color alone is never the
 * only cue: each slot also has its own marker, used on the lines, in the
 * legend and in tooltips.
 */

export const SERIES_COUNT = 5;

const SHAPES = ["circle", "square", "triangle", "diamond", "cross"] as const;
type Shape = (typeof SHAPES)[number];

export function seriesColor(slot: number): string {
  return `var(--series-${(slot % SERIES_COUNT) + 1})`;
}

export function seriesShape(slot: number): Shape {
  return SHAPES[slot % SHAPES.length];
}

/** A marker centred on (x, y), about 8px across. */
export function ShapeMark({
  slot,
  x,
  y,
  size = 8,
  ring = true,
}: {
  slot: number;
  x: number;
  y: number;
  size?: number;
  ring?: boolean;
}) {
  const r = size / 2;
  const fill = seriesColor(slot);
  // A thin surface-colored ring separates markers that overlap.
  const stroke = ring ? "var(--surface)" : "none";
  const common = { fill, stroke, strokeWidth: ring ? 1.5 : 0 };
  switch (seriesShape(slot)) {
    case "circle":
      return <circle cx={x} cy={y} r={r} {...common} />;
    case "square":
      return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} {...common} />;
    case "triangle":
      return (
        <polygon
          points={`${x},${y - r * 1.15} ${x + r * 1.1},${y + r * 0.8} ${x - r * 1.1},${y + r * 0.8}`}
          {...common}
        />
      );
    case "diamond":
      return (
        <polygon
          points={`${x},${y - r * 1.25} ${x + r * 1.1},${y} ${x},${y + r * 1.25} ${x - r * 1.1},${y}`}
          {...common}
        />
      );
    case "cross": {
      const a = r * 1.2;
      const b = r * 0.42;
      return (
        <polygon
          points={[
            [x - b, y - a],
            [x + b, y - a],
            [x + b, y - b],
            [x + a, y - b],
            [x + a, y + b],
            [x + b, y + b],
            [x + b, y + a],
            [x - b, y + a],
            [x - b, y + b],
            [x - a, y + b],
            [x - a, y - b],
            [x - b, y - b],
          ]
            .map((p) => p.join(","))
            .join(" ")}
          {...common}
        />
      );
    }
  }
}

/** Small inline marker for legends, tooltips, chips and table headers. */
export function SeriesSwatch({ slot }: { slot: number }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="series-swatch shrink-0"
    >
      <line x1="0" y1="8" x2="16" y2="8" stroke={seriesColor(slot)} strokeWidth="2" />
      <ShapeMark slot={slot} x={8} y={8} size={9} />
    </svg>
  );
}
