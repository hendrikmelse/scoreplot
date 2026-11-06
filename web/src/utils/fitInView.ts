/**
 * How far a box that is `shift` down from where it would otherwise sit (negative is up) needs to be
 * moved to be seen between the top and the bottom of what is visible, with `margin` to spare. The
 * `top` and `height` are those of the box without the shift. A box that is in view already is left
 * where it is, rather than brought back to the middle, so this is only ever what is needed.
 */
export function fitShift(
  shift: number,
  top: number,
  height: number,
  visibleTop: number,
  visibleBottom: number,
  margin: number,
): number {
  const furthestUp = visibleTop + margin - top;
  const furthestDown = visibleBottom - margin - (top + height);
  // If it is too tall to fit, the top of it is what is kept in view
  return Math.max(furthestUp, Math.min(furthestDown, shift));
}
