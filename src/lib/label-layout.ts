/**
 * Places direct labels next to the ends of lines without overlapping.
 *
 * Labels that would sit closer than `gap` pixels are merged into a group, and
 * each group is centred on the average of its members' ideal positions. This
 * repeats until no two groups overlap. The result keeps every label as close
 * as possible to its line and preserves the top-to-bottom order.
 */
export function spreadLabels(
  items: { key: string; y: number }[],
  gap: number,
  bounds?: { min: number; max: number },
): Record<string, number> {
  type Group = { keys: string[]; ideal: number[]; top: number };
  const sorted = [...items].sort((a, b) => a.y - b.y);
  let groups: Group[] = sorted.map((i) => ({ keys: [i.key], ideal: [i.y], top: i.y }));

  const place = (g: Group) => {
    const mean = g.ideal.reduce((s, y) => s + y, 0) / g.ideal.length;
    g.top = mean - ((g.keys.length - 1) * gap) / 2;
    if (bounds) {
      const height = (g.keys.length - 1) * gap;
      g.top = Math.min(Math.max(g.top, bounds.min), bounds.max - height);
    }
  };
  groups.forEach(place);

  let merged = true;
  while (merged) {
    merged = false;
    const next: Group[] = [];
    for (const g of groups) {
      const prev = next[next.length - 1];
      if (prev && prev.top + prev.keys.length * gap > g.top) {
        prev.keys.push(...g.keys);
        prev.ideal.push(...g.ideal);
        place(prev);
        merged = true;
      } else {
        next.push(g);
      }
    }
    groups = next;
  }

  const result: Record<string, number> = {};
  for (const g of groups) g.keys.forEach((key, i) => (result[key] = g.top + i * gap));
  return result;
}
