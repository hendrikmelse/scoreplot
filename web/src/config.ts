import paypalQrCode from "@/assets/paypal-qr.svg";
import venmoQrCode from "@/assets/venmo-qr.svg";

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
  /** A picture of a QR code for the link, for someone on a computer to scan with their phone */
  qrCode?: string;
}

/**
 * The ways to support the app, listed in the window that opens from the title page. With none, there
 * is no link to that window at all.
 */
export const supportOptions: SupportOption[] = [
  {
    name: "PayPal",
    description: "Send any amount",
    url: "https://paypal.me/HendrikMelse",
    qrCode: paypalQrCode,
  },
  {
    name: "Venmo",
    description: "Send a tip (US only)",
    url: "https://venmo.com/u/HendrikMelse",
    qrCode: venmoQrCode,
  },
];
