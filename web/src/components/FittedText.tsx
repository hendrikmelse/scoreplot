import { useLayoutEffect, useRef } from "react";

/** The smallest the text is made, below which a long name is cut off with "…" instead */
const MIN_FONT_SIZE_PX = 13;

/**
 * Text that gets smaller when it would otherwise be too big for the box it is in, rather than being
 * cut off. It is as big as the stylesheet makes it unless that doesn't fit.
 *
 * The box is the text's own element, which the stylesheet has to give a size to fit (by letting it
 * shrink, and hiding what overflows) rather than one that grows to suit the text.
 */
export function FittedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const el: HTMLSpanElement = element;

    // A couple of pixels of leeway on the height, as the lines of text are rounded and the descenders
    // of the last one can hang a little past the box. A whole extra line is a lot more than that.
    const overflows = () =>
      el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 3;

    function fit() {
      el.style.fontSize = ""; // Back to the size that the stylesheet gives it, to start from
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (size > MIN_FONT_SIZE_PX && overflows()) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    }

    fit();
    // The size of the text depends on the font, which may not have loaded yet
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    // The space changes with the window, and when the layout changes. Its parent is watched, as
    // the text itself is not what decides how big the space is.
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
