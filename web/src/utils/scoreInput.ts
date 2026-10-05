/**
 * The score being typed in on the keypad is kept as a string so that partial input
 * like "-", "-0" or "5." can be shown as it is typed.
 */

/** Apply a single key press to the score being typed. Unknown keys leave it unchanged. */
export function applyKey(input: string, key: string): string {
  let result = input;

  if (key.length === 1 && key >= "0" && key <= "9") {
    result += key;
    // Drop the placeholder zero, but keep a zero before a decimal point
    if (result.startsWith("0") && !result.startsWith("0.")) result = result.slice(1);
    if (result.startsWith("-0") && !result.startsWith("-0.")) result = "-" + result.slice(2);
  } else if (key === ".") {
    if (!result.includes(".")) result += ".";
  } else if (key === "+/-") {
    result = result.startsWith("-") ? result.slice(1) : "-" + result;
  } else if (key === "+") {
    result = result.replace(/^-/, "");
  } else if (key === "-") {
    if (!result.startsWith("-")) result = "-" + result;
  } else if (key === "Backspace" || key === "Delete") {
    result = result === "-0" ? "0" : result.slice(0, -1);
  } else if (key === "Escape" || key === "c") {
    result = "0";
  }

  if (result === "") return "0";
  if (result === "-") return "-0";
  return result;
}

/** The typed score as a number, or null if it isn't a complete number (e.g. ".") */
export function parseScore(input: string): number | null {
  const score = Number(input);
  if (input.trim() === "" || !Number.isFinite(score)) return null;
  return score === 0 ? 0 : score; // Normalizes -0 to 0
}
