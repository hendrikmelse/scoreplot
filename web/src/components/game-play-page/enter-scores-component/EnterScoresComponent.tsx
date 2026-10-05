import "./EnterScoresComponent.scss";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
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

      // Otherwise a focused button would also be "clicked" by Enter
      if (!editing) (document.activeElement as HTMLElement | null)?.blur();
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
          className={clsx("key", className, { pressed: pressedKey === key })}
          aria-label={icon ? label : undefined}
          onClick={() => pressKey(key)}
          onPointerDown={() => setPressedKey(key)}
          onPointerUp={() => setPressedKey(null)}
          onPointerCancel={() => setPressedKey(null)}
          onPointerLeave={() => setPressedKey(null)}
        >
          {icon ? <span className="material-symbols-outlined">{icon}</span> : label}
        </button>
      ))}
    </div>
  );
}
