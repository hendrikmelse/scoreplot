import "./EnterScoresComponent.scss";
import { useCallback, useEffect, useState } from "react";

export function EnterScoresComponent({ editing, onSubmit, onNextPlayer, onPrevPlayer, onNextRound, onPrevRound }: {
  editing: boolean,
  onSubmit: (score: number) => void,
  onNextPlayer: () => void,
  onPrevPlayer: () => void,
  onNextRound: () => void,
  onPrevRound: () => void,
}) {
  const [inputScore, setInputScore] = useState("0");

  const handleKeypadButtonPress = useCallback((button: string) => {
    let newScore = inputScore;
    if ("0123456789".includes(button)) {
      newScore += button;
      if (newScore.startsWith("0") && !newScore.startsWith("0.")) {
        newScore = newScore.slice(1);
      }
      if (newScore.startsWith("-0") && !newScore.startsWith("-0.")) {
        newScore = "-" + newScore.slice(2);
      }
    }
    else if (button === "." && !newScore.includes(".")) {
      newScore += ".";
    }
    else if (button === "+/-") {
      if (newScore.startsWith("-")) {
        newScore = newScore.slice(1);
      }
      else {
        newScore = "-" + newScore;
      }
    }
    else if (button === "+") {
      if (newScore.startsWith("-")) {
        newScore = newScore.slice(1);
      }
    }
    else if (button === "-") {
      newScore = "-" + newScore;
    }
    else if (button === "Backspace" || button === "Delete") {
      if (newScore === "-0") {
        newScore = "0";
      }
      else {
        newScore = newScore.slice(0, newScore.length - 1);
      }
    }
    else if (button === "Escape" || button === "c") {
      newScore = "0";
    }
    else if (button === "Enter") {
      const score = Number(inputScore);
      if (Number.isNaN(score)) {
        throw new Error("Failed to parse score into number!");
      }
      onSubmit(score);
      newScore = "0";
    }
    else if (button === "ArrowUp") {
      onPrevPlayer();
    }
    else if (button === "ArrowDown") {
      onNextPlayer();
    }
    else if (button === "ArrowLeft") {
      onPrevRound();
    }
    else if (button === "ArrowRight") {
      onNextRound();
    }

    if (newScore.length === 0) {
      newScore = "0";
    }
    if (newScore === "-") {
      newScore = "-0";
    }
    setInputScore(newScore);
  }, [inputScore, onSubmit, onPrevPlayer, onNextPlayer, onPrevRound, onNextRound]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!editing) (document.activeElement as HTMLElement | null)?.blur();
      handleKeypadButtonPress(e.key);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => { window.removeEventListener("keydown", handleKeyDown) };
  }, [handleKeypadButtonPress, editing]);

  return (
    <div className="keypad">
      <input
        className="score-input"
        type="text"
        value={inputScore}
        onChange={(e) => { setInputScore(e.target.value) }}
      ></input>
      <button className="key key-7" onClick={() => handleKeypadButtonPress("7")}>7</button>
      <button className="key key-8" onClick={() => handleKeypadButtonPress("8")}>8</button>
      <button className="key key-9" onClick={() => handleKeypadButtonPress("9")}>9</button>
      <button className="key key-4" onClick={() => handleKeypadButtonPress("4")}>4</button>
      <button className="key key-5" onClick={() => handleKeypadButtonPress("5")}>5</button>
      <button className="key key-6" onClick={() => handleKeypadButtonPress("6")}>6</button>
      <button className="key key-1" onClick={() => handleKeypadButtonPress("1")}>1</button>
      <button className="key key-2" onClick={() => handleKeypadButtonPress("2")}>2</button>
      <button className="key key-3" onClick={() => handleKeypadButtonPress("3")}>3</button>
      <button className="key key-negate" onClick={() => handleKeypadButtonPress("+/-")}>+/-</button>
      <button className="key key-0" onClick={() => handleKeypadButtonPress("0")}>0</button>
      <button className="key key-point" onClick={() => handleKeypadButtonPress(".")}>.</button>
      <button className="key key-backspace large-icon" onClick={() => handleKeypadButtonPress("Backspace")}><span className="material-symbols-outlined">backspace</span></button>
      <button className="key key-enter large-icon" onClick={() => handleKeypadButtonPress("Enter")}><span className="material-symbols-outlined">keyboard_return</span></button>
    </div>
  );
}