import { useEffect } from "react";

/**
 * Stops a button that was clicked with the mouse (or tapped) from keeping the keyboard focus.
 *
 * It is harmless at first, as a click does not show a focus ring. But as soon as a key is pressed,
 * even one like Shift for scrolling sideways, the browser decides that the keyboard is being used
 * and draws its focus ring around the button that is still focused. Letting go of the button
 * avoids that. Buttons used with the keyboard keep their focus, and so their ring.
 */
export function useBlurAfterPointerClick(): void {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      // A click made with the keyboard (or by code) has no click count, unlike a real press
      if (event.detail === 0) return;

      const button = event.target instanceof Element ? event.target.closest("button") : null;
      // Only if it still has the focus: a click can send it somewhere else, like to a name box
      if (button && document.activeElement === button) button.blur();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
