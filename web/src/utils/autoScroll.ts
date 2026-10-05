/** How close to the top or bottom of a list the pointer has to be before the list starts scrolling */
const EDGE_SIZE = 56;
/** How fast the list scrolls, in pixels per second, with the pointer at the edge or beyond it */
const MAX_SPEED = 900;

/**
 * How fast to scroll a list that spans from `top` to `bottom` while something is being dragged
 * with the pointer at `y`, in pixels per second. Negative scrolls up. It's zero in the middle of
 * the list, and speeds up the nearer the pointer is to an edge, and the further past it.
 */
export function autoScrollSpeed(y: number, top: number, bottom: number): number {
  // Short lists get smaller edges, so that they still have a middle
  const edge = Math.min(EDGE_SIZE, (bottom - top) / 4);
  if (edge <= 0) return 0;

  if (y < top + edge) return -Math.min(1, (top + edge - y) / edge) * MAX_SPEED;
  if (y > bottom - edge) return Math.min(1, (y - (bottom - edge)) / edge) * MAX_SPEED;
  return 0;
}
