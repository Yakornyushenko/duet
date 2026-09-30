// Coordinates are normalized to the SVG's 300 × 300 view box.
// Slightly wider touch bounds include the selected segment's outward offset.
export function getRingSegment(x: number, y: number, size: number, counts: number[]): number | null {
  if (size <= 0) return null;
  const dx = x / size * 300 - 150;
  const dy = y / size * 300 - 150;
  const radius = Math.hypot(dx, dy);
  if (radius < 84 || radius > 140) return null;
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return null;
  const angle = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  const position = angle / (Math.PI * 2) * total;
  let end = 0;
  for (let index = 0; index < counts.length; index++) {
    end += counts[index];
    if (counts[index] > 0 && position < end) return index;
  }
  return null;
}
