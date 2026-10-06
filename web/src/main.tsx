import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

/** The longest to hold off showing the app for its fonts, on a connection too slow to wait for */
const FONT_WAIT_MS = 1500;

/**
 * The fonts are part of the app, but the browser still has to read them in before it can use them,
 * and only starts to once something on the page needs them. Showing the page before they are ready
 * shows it in another font for a moment, which then changes (and moves) as they arrive. So the
 * page waits for them, which is not long, as they are the app's own files.
 */
async function fontsLoaded(): Promise<void> {
  const loading = Promise.all([
    document.fonts.load('400 1em "Inter Variable"'),
    document.fonts.load('700 1em "Inter Variable"'),
    document.fonts.load('1em "Material Symbols Outlined"'),
  ]).catch(() => {}); // Without them, the page still works, in other fonts
  await Promise.race([loading, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
}

void fontsLoaded().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
