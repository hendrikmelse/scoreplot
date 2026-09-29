import "./ColorSelectComponent.scss";
import { Scorecard } from "Game";
import { BaseSyntheticEvent } from "react";

export function ColorSelectComponent({ scorecard, onDoneEditing }: {
  scorecard: Scorecard,
  onDoneEditing: () => void,
}) {
  const colors = [
    "#eb0c0c",
    "#fd790d",
    "#fccf08",
    "#1bc60c",
    "#0edef1",
    "#2542ff",
    "#b336fc",
    "#e90cc8"
  ]

  function backgroundClicked(event: BaseSyntheticEvent) {
    console.log(event.target);
  }

  return (
    <div className="modal-background" onClick={backgroundClicked}>
      <div className="main-card edit-players-card">
        <div className="player-name-section">
          {scorecard.playerName}
        </div>
        <div className="colors-section">
          {colors.map(color => <div className="color-box" style={{"backgroundColor": color}}></div>)}
        </div>
        <div className="buttons-section">
          <button onClick={onDoneEditing}>Done</button>
          <button>Delete</button>
        </div>
      </div>
    </div>
  );
}