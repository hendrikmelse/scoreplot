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

/** h in degrees, s and l in percent */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hslToHex({ h, s, l }: Hsl): string {
  return rgbToHex(hslToRgb(h, s / 100, l / 100));
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const [rf, gf, bf] = [r / 255, g / 255, b / 255];
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (delta > 0) {
    if (max === rf) h = ((gf - bf) / delta + 6) % 6;
    else if (max === gf) h = (bf - rf) / delta + 2;
    else h = (rf - gf) / delta + 4;
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** An endless supply of distinct, evenly spread colors: the hue steps by the golden angle */
export function generatedColor(index: number): string {
  return rgbToHex(hslToRgb((index * 137.508) % 360, 0.7, 0.55));
}
