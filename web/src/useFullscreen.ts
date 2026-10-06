import { useCallback, useEffect, useState } from "react";

export interface Fullscreen {
  /** Whether this browser can do fullscreen at all (iPhone Safari, for one, cannot) */
  supported: boolean;
  active: boolean;
  toggle: () => void;
}

/** Whether the page is fullscreen, and a way to switch it, using the browser's Fullscreen API */
export function useFullscreen(): Fullscreen {
  const supported = document.fullscreenEnabled === true;
  const [active, setActive] = useState(() => document.fullscreenElement != null);

  // Also changes when the user leaves with the Escape key or a swipe, not only with the button
  useEffect(() => {
    const update = () => setActive(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggle = useCallback(() => {
    // Refused when it is not allowed (no user gesture, say), which leaves things as they were
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    request.catch(() => {});
  }, []);

  return { supported, active, toggle };
}
