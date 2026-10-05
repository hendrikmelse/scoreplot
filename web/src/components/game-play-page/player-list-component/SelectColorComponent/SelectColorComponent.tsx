import "./SelectColorComponent.scss";
import { useState } from "react";
import clsx from "clsx";
import { defaultColors } from "@/config";
import { useGame } from "@/GameContext";
import { hexToRgb, rgbToHex, type Rgb } from "@/utils/color";

const channels: (keyof Rgb)[] = ["r", "g", "b"];

// The picker's height, which it has to leave room for below itself, and how far to stay from the edge
const pickerHeight = 102;
const screenMargin = 12;

export function SelectColorComponent({
  currentColor,
  position,
  playerId,
  onClose,
}: {
  currentColor: string;
  position: DOMRect;
  playerId: string;
  onClose: () => void;
}) {
  const { updateGame } = useGame();
  const [customColor, setCustomColor] = useState(() => hexToRgb(currentColor));
  const isCustom = !defaultColors.includes(currentColor);

  function setPlayerColor(color: string) {
    updateGame({ type: "change_player_color", playerId, newColor: color });
  }

  function onSliderChange(channel: keyof Rgb, value: number) {
    const color = { ...customColor, [channel]: value };
    setCustomColor(color);
    setPlayerColor(rgbToHex(color));
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
          // Next to the color, but not so low that the bottom of the picker is off the screen
          top: Math.max(
            screenMargin,
            Math.min(position.y - 35, window.innerHeight - pickerHeight - screenMargin),
          ),
        }}
      >
        <div className="default-colors-section">
          {defaultColors.map((color) => (
            <div
              className={clsx("color-card", { selected: currentColor === color })}
              key={color}
              style={{ backgroundColor: color }}
              onClick={() => setPlayerColor(color)}
            />
          ))}
        </div>
        <div className="color-section-divider" />
        <div className="custom-color-section">
          <div
            className={clsx("color-card", { selected: isCustom })}
            style={{ backgroundColor: rgbToHex(customColor) }}
            onClick={() => setPlayerColor(rgbToHex(customColor))}
          />
          <div className="color-sliders">
            {channels.map((channel) => (
              <input
                key={channel}
                className="color-slider"
                type="range"
                id={`custom-color-${channel}`}
                min="0"
                max="255"
                value={customColor[channel]}
                onChange={(e) => onSliderChange(channel, Number(e.target.value))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
