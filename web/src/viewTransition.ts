import { useLayoutEffect } from "react";
import { flushSync } from "react-dom";

/** Which way a change of page goes, which the stylesheet can animate differently */
export type TransitionDirection = "to-game" | "to-title";

/** How long to wait for the new page to appear before showing it anyway */
const PAGE_TIMEOUT_MS = 1000;

/** Called by whichever page appears, while a transition is waiting for it to */
let pageAppeared: (() => void) | null = null;

/**
 * For a page to call as it appears, so that a transition knows when the new screen is there to be
 * animated to. The router puts the new page up in its own time (not within the call that asks for
 * it), so there is no other way of knowing that it has.
 */
export function usePageAppeared(): void {
  useLayoutEffect(() => {
    pageAppeared?.();
  }, []);
}

/**
 * Makes a change to what the app shows, animated as a view transition where the browser can do
 * that. The change is made by `update`, which must do all of it at once (a navigation and the state
 * it goes with, say), as the old and new screens are what is seen before and after it. The new page
 * has to call `usePageAppeared`.
 *
 * While it is animating, the page's `data-transition` says which way it is going.
 */
export function runWithTransition(update: () => void, direction: TransitionDirection): void {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reducedMotion) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.transition = direction;
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, PAGE_TIMEOUT_MS);
        pageAppeared = () => {
          clearTimeout(timer);
          pageAppeared = null;
          resolve();
        };
        flushSync(update);
      }),
  );
  void transition.finished.finally(() => {
    pageAppeared = null;
    delete root.dataset.transition;
  });
}
