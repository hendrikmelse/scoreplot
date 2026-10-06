import "./EnterScoresComponent.scss";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyKey, parseScore } from "@/utils/scoreInput";

// Laid out by the "key-*" classes in the stylesheet
const keys = [
  { key: "7", label: "7", className: "key-7" },
  { key: "8", label: "8", className: "key-8" },
  { key: "9", label: "9", className: "key-9" },
  { key: "4", label: "4", className: "key-4" },
  { key: "5", label: "5", className: "key-5" },
  { key: "6", label: "6", className: "key-6" },
  { key: "1", label: "1", className: "key-1" },
  { key: "2", label: "2", className: "key-2" },
  { key: "3", label: "3", className: "key-3" },
  { key: "+/-", label: "+/-", className: "key-negate" },
  { key: "0", label: "0", className: "key-0" },
  { key: ".", label: ".", className: "key-point" },
  {
    key: "Backspace",
    icon: "backspace",
    label: "Backspace",
    className: "key-backspace large-icon",
  },
  {
    key: "Enter",
    icon: "keyboard_return",
    label: "Submit score",
    className: "key-enter large-icon",
  },
];

/** How long a key stays pressed in at least, as a quick tap is over before it could be seen */
const MIN_PRESS_MS = 140;

export function EnterScoresComponent({
  caption,
  editing,
  onSubmit,
  onNextPlayer,
  onPrevPlayer,
  onNextRound,
  onPrevRound,
}: {
  /** Who the score is for, and in which round, shown next to the number being typed */
  caption: string;
  editing: boolean;
  onSubmit: (score: number) => void;
  onNextPlayer: () => void;
  onPrevPlayer: () => void;
  onNextRound: () => void;
  onPrevRound: () => void;
}) {
  const [inputScore, setInputScore] = useState("0");
  // The key a finger (or the mouse) is currently pressing. The `:active` style isn't dependable on
  // touchscreens: it's delayed, and iOS only applies it if the page listens for touches.
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  // The key a mouse is over. Not from `:hover`, which a touchscreen on a computer that also has a
  // mouse leaves stuck on the key that was tapped.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  // Whether the latest press was a finger's (or a pen's), and so has been counted already
  const countedOnTouch = useRef(false);
  const pressedAt = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pressDown = (key: string) => {
    clearTimeout(releaseTimer.current);
    pressedAt.current = performance.now();
    setPressedKey(key);
  };

  // Lets go, but not before the press has been there long enough to be seen
  const release = () => {
    clearTimeout(releaseTimer.current);
    const remaining = MIN_PRESS_MS - (performance.now() - pressedAt.current);
    if (remaining <= 0) setPressedKey(null);
    else releaseTimer.current = setTimeout(() => setPressedKey(null), remaining);
  };

  useEffect(() => () => clearTimeout(releaseTimer.current), []);

  const pressKey = useCallback(
    (key: string) => {
      switch (key) {
        case "Enter": {
          const score = parseScore(inputScore);
          if (score === null) return; // Not a complete number yet, e.g. "."
          onSubmit(score);
          setInputScore("0");
          return;
        }
        case "ArrowUp":
          return onPrevPlayer();
        case "ArrowDown":
          return onNextPlayer();
        case "ArrowLeft":
          return onPrevRound();
        case "ArrowRight":
          return onNextRound();
        default:
          setInputScore(applyKey(inputScore, key));
      }
    },
    [inputScore, onSubmit, onPrevPlayer, onNextPlayer, onPrevRound, onNextRound],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // Leave browser shortcuts alone

      // Don't steal keys from text fields (e.g. while renaming a player)
      const target = e.target;
      if (target instanceof HTMLInputElement && !target.readOnly) return;
      if (target instanceof HTMLTextAreaElement) return;

      // A button that the keyboard has been moved to is for pressing, not for entering a score. (A
      // mouse click does not leave a button focused, so this is only ever somebody using Tab.)
      const focused = document.activeElement;
      if ((e.key === "Enter" || e.key === " ") && focused instanceof HTMLButtonElement) return;

      // While the players are being edited, Enter finishes that, rather than entering a score
      if (editing && e.key === "Enter") return;

      if (!editing) (focused as HTMLElement | null)?.blur();
      pressKey(e.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pressKey, editing]);

  return (
    <div className="keypad">
      {/* Not an <input>, so that tapping it on a touchscreen can't bring up the on-screen keyboard */}
      <div className="score-display" role="status">
        <span className="score-caption">{caption}</span>
        <span className="score-value">{inputScore}</span>
      </div>
      {keys.map(({ key, label, icon, className }) => (
        <button
          key={key}
          className={clsx("key", className, {
            pressed: pressedKey === key,
            hovered: hoveredKey === key,
          })}
          aria-label={icon ? label : undefined}
          onClick={(e) => {
            // A touch counted when the finger went down, so that the key that lit up is the key that
            // was pressed even if the finger drifts off before lifting. (A click from the keyboard has
            // no position, and is always counted.)
            if (e.detail > 0 && countedOnTouch.current) return;
            pressKey(key);
          }}
          onPointerDown={(e) => {
            pressDown(key);
            countedOnTouch.current = e.pointerType !== "mouse";
            if (countedOnTouch.current) pressKey(key);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerEnter={(e) => e.pointerType === "mouse" && setHoveredKey(key)}
          onPointerLeave={(e) => {
            release();
            if (e.pointerType === "mouse") setHoveredKey(null);
          }}
        >
          {icon ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              {icon}
            </span>
          ) : (
            label
          )}
        </button>
      ))}
    </div>
  );
}
