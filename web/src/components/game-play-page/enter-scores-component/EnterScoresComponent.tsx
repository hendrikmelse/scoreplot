import "./EnterScoresComponent.scss";
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
  { key: "Backspace", icon: "backspace", className: "key-backspace large-icon" },
  { key: "Enter", icon: "keyboard_return", className: "key-enter large-icon" },
];

export function EnterScoresComponent({
  editing,
  onSubmit,
  onNextPlayer,
  onPrevPlayer,
  onNextRound,
  onPrevRound,
}: {
  editing: boolean;
  onSubmit: (score: number) => void;
  onNextPlayer: () => void;
  onPrevPlayer: () => void;
  onNextRound: () => void;
  onPrevRound: () => void;
}) {
  const [inputScore, setInputScore] = useState("0");

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
      <input className="score-input" type="text" value={inputScore} readOnly />
      {keys.map(({ key, label, icon, className }) => (
        <button key={key} className={`key ${className}`} onClick={() => pressKey(key)}>
          {icon ? <span className="material-symbols-outlined">{icon}</span> : label}
        </button>
      ))}
    </div>
  );
}
