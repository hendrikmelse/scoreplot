import "./SelectColorComponent.scss";
import { defaultColors } from "config";
import { useContext, useEffect, useState } from "react"
import { GameContext } from "App";

interface Color {
  r: number,
  g: number,
  b: number,
}

export function SelectColorComponent({ currentColor, position, playerId, onClose }: {
  currentColor: string,
  position: DOMRect,
  playerId: string,
  onClose: () => void,
}) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(defaultColors.indexOf(currentColor))
  const [customColor, setCustomColor] = useState(colorFromHex(currentColor))
  const { updateGame } = useContext(GameContext)!;

  useEffect(() => {
    const handler = setTimeout(() => {
      updateGame({
        type: "change_player_color",
        playerId: playerId,
        newColor: colorToHex(customColor),
      });
    }, 50);
    
    return () => clearTimeout(handler);
  }, [customColor, playerId, updateGame]);
  
  function updatePlayerColor(playerId: string, color: string)
  {
    updateGame({
      type: "change_player_color",
      playerId: playerId,
      newColor: color,
    });
  }
  
  function colorToHex(color: Color) {
    return "#" + [color.r, color.g, color.b]
      .map(x => x.toString(16).padStart(2, "0"))
      .join("");
  }

  function colorFromHex(hex: string): Color {
    if (hex.startsWith("#")) hex = hex.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  return (
    <div className="color-select-background" onClick={onClose}>
      <div
        className="color-select-content-nub"
        style={{
          position: "absolute",
          left: position.x + 40,
          top: position.y + 8,
        }}
      />
      <div
        className="color-select-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: position.x + 48,
          top: position.y - 35,
        }}
      >
        <div className="default-colors-section">
          {defaultColors.map((color, index) =>
            <div
              className={"color-card" + (selectedColorIndex === index ? " selected" : "")}
              key={color}
              style={{ backgroundColor: color }}
              onClick={() => { updatePlayerColor(playerId, color); setSelectedColorIndex(index); }}
            />
          )}
        </div>
        <div className="color-section-divider" />
        <div className="custom-color-section">
          <div
            className={"color-card" + (selectedColorIndex === -1 ? " selected" : "")}
            style={{backgroundColor: colorToHex(customColor)}}
            onClick={() => { updatePlayerColor(playerId, colorToHex(customColor)); setSelectedColorIndex(-1) }}
          />
          <div className="color-sliders">
            <input className="color-slider" type="range" id="custom-color-r" min="0" max="255" value={customColor.r} onChange={(e) => setCustomColor({...customColor, "r": Number(e.target.value)})}></input>
            <input className="color-slider" type="range" id="custom-color-g" min="0" max="255" value={customColor.g} onChange={(e) => setCustomColor({...customColor, "g": Number(e.target.value)})}></input>
            <input className="color-slider" type="range" id="custom-color-b" min="0" max="255" value={customColor.b} onChange={(e) => setCustomColor({...customColor, "b": Number(e.target.value)})}></input>
          </div>
        </div>
      </div>
    </div>
  )
}