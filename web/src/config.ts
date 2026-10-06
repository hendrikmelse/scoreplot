export const defaultColors = [
  "#e6194b",
  "#f58231",
  "#ffe119",
  "#3cb44b",
  "#42d4f4",
  "#4363d8",
  "#911eb4",
  "#f052e6",
];

export interface SupportOption {
  name: string;
  /** One line about it, under the name */
  description: string;
  url: string;
}

/**
 * The ways to support the app, listed in the window that opens from the title page. With none, there
 * is no link to that window at all.
 */
export const supportOptions: SupportOption[] = [
  {
    name: "GitHub Sponsors",
    description: "Monthly or one-time, through GitHub",
    url: "https://github.com/sponsors/hendrikmelse",
  },
  {
    name: "Ko-fi",
    description: "A one-off tip",
    url: "https://ko-fi.com/hendrikmelse",
  },
  {
    name: "Buy Me a Coffee",
    description: "A coffee's worth",
    url: "https://buymeacoffee.com/hendrikmelse",
  },
  {
    name: "PayPal",
    description: "Send any amount",
    url: "https://paypal.me/HendrikMelse",
  },
];
