export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): Rgb {
  const digits = hex.replace(/^#/, "");
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

/** h in degrees, s and l between 0 and 1 */
function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return { r: channel(0), g: channel(8), b: channel(4) };
}

/** An endless supply of distinct, evenly spread colors: the hue steps by the golden angle */
export function generatedColor(index: number): string {
  return rgbToHex(hslToRgb((index * 137.508) % 360, 0.7, 0.55));
}
