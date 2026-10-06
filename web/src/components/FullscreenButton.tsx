import { useFullscreen } from "@/useFullscreen";

/** Switches fullscreen on and off. It is not there at all where the browser cannot do fullscreen. */
export function FullscreenButton({ className }: { className: string }) {
  const { supported, active, toggle } = useFullscreen();
  if (!supported) return null;

  const label = active ? "Exit fullscreen" : "Enter fullscreen";
  return (
    <button className={className} aria-label={label} title={label} onClick={toggle}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {active ? "fullscreen_exit" : "fullscreen"}
      </span>
    </button>
  );
}
