import { useEffect } from "react";

/** The room to leave between the box and the keyboard, enough to see the rows around it too */
const KEYBOARD_MARGIN = 40;

/** The room to leave above the box, at the top of the screen */
const TOP_MARGIN = 12;

/** The CSS variable that the page is moved up by (see GamePlayPage.scss) */
const SHIFT_VAR = "--keyboard-shift";

/**
 * How far up the page has to go for a box to be seen above the keyboard, or 0 if it already is.
 * `top` and `bottom` are where the box is without any shift, and `visibleBottom` is the bottom of
 * what the keyboard leaves. The shift never goes so far that the box itself is lost off the top.
 */
export function keyboardShift(top: number, bottom: number, visibleBottom: number): number {
  const hidden = bottom + KEYBOARD_MARGIN - visibleBottom;
  return Math.max(0, Math.min(hidden, top - TOP_MARGIN));
}

/** Whether this is a box that brings up the phone's keyboard */
function isTextBox(element: Element | null): element is HTMLElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/**
 * While a text box has the focus, moves the page up when the phone's keyboard would cover it. The
 * page can't scroll (it is fixed to the screen), and in Chrome the keyboard covers it rather than
 * shrinking it, so it is moved by hand. Wherever the box is: the table, the player list, the name.
 */
export function useKeepAboveKeyboard() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    const update = () => {
      const box = document.activeElement;
      const page = isTextBox(box) ? box.closest<HTMLElement>(".background") : null;
      if (!isTextBox(box) || !page) {
        root.style.removeProperty(SHIFT_VAR);
        return;
      }
      // Where the box is without the shift: the page's own top is the shift, upside down
      const shifted = page.getBoundingClientRect().top;
      const rect = box.getBoundingClientRect();
      const shift = keyboardShift(
        rect.top - shifted,
        rect.bottom - shifted,
        viewport.offsetTop + viewport.height,
      );
      root.style.setProperty(SHIFT_VAR, `${shift}px`);
    };
    // Focus has not moved yet when it is being left, so look once it has (it may be on another box)
    const afterFocusMoves = () => setTimeout(update, 0);

    document.addEventListener("focusin", update);
    document.addEventListener("focusout", afterFocusMoves);
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", afterFocusMoves);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty(SHIFT_VAR);
    };
  }, []);
}
