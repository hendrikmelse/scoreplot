const EPSILON = 1e-9;

/** The "nice" step size (1, 2 or 5 times a power of ten) closest to giving `targetCount` steps over `range` */
function niceStep(range: number, targetCount: number): number {
  const raw = range / Math.max(1, targetCount);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  // The thresholds are the geometric means between neighbouring nice numbers (1, 2, 5, 10)
  const nice =
    fraction >= Math.sqrt(50) ? 10 : fraction >= Math.sqrt(10) ? 5 : fraction >= Math.SQRT2 ? 2 : 1;
  return nice * magnitude;
}

/** Round-number tick values within [min, max] for an axis, about `targetCount` of them */
export function valueTicks(min: number, max: number, targetCount: number): number[] {
  if (!(max > min)) return [];

  const step = niceStep(max - min, targetCount);
  const ticks = [];
  for (let i = Math.ceil(min / step - EPSILON); i <= Math.floor(max / step + EPSILON); i++) {
    ticks.push(Number((i * step).toFixed(10)) + 0); // toFixed hides float noise, + 0 turns -0 into 0
  }
  return ticks;
}

/** The rounds (0 to maxRound) that get a label on the x axis, never more than `maxLabels` of them */
export function roundTicks(maxRound: number, maxLabels: number): number[] {
  if (maxRound < 0) return [];

  // The smallest nice whole-number step (1, 2, 5, 10, 20, 50, ...) that doesn't need too many labels
  let step = 1;
  for (let magnitude = 1; Math.floor(maxRound / step) + 1 > maxLabels; magnitude *= 10) {
    for (const nice of [1, 2, 5]) {
      step = nice * magnitude;
      if (Math.floor(maxRound / step) + 1 <= maxLabels) break;
    }
  }

  const ticks = [];
  for (let round = 0; round <= maxRound; round += step) ticks.push(round);
  return ticks;
}
