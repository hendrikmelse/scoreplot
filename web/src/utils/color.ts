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
