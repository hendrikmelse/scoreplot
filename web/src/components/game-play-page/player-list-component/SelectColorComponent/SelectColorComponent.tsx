import "./SelectColorComponent.scss";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { defaultColors } from "@/config";
import { useGame } from "@/GameContext";
import { hexToHsl, hslToHex, type Hsl } from "@/utils/color";

const channels: { channel: keyof Hsl; min: number; max: number }[] = [
  { channel: "h", min: 0, max: 360 },
  { channel: "s", min: 20, max: 100 },
  { channel: "l", min: 20, max: 80 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Colors outside what the sliders can reach would leave the thumbs pinned at the end, off the color
function reachable(color: Hsl): Hsl {
  return { h: color.h, s: clamp(color.s, 20, 100), l: clamp(color.l, 20, 80) };
}

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
  const [customColor, setCustomColor] = useState(() => reachable(hexToHsl(currentColor)));
  const [closing, setClosing] = useState(false);
  const [ring, setRing] = useState<{ left: number; top: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const customHex = hslToHex(customColor);
  const isCustom = !defaultColors.includes(currentColor);

  // Park the selection ring on the selected color, which makes it slide when that changes
  useLayoutEffect(() => {
    const selected = contentRef.current?.querySelector<HTMLElement>(".color-card.selected");
    const content = contentRef.current;
    if (!selected || !content) return;
    // Measured, not offsetLeft, which rounds; the content's border is outside what the ring is placed in
    const from = content.getBoundingClientRect();
    const to = selected.getBoundingClientRect();
    setRing({
      left: to.left - from.left - content.clientLeft,
      top: to.top - from.top - content.clientTop,
    });
  }, [currentColor]);

  function setPlayerColor(color: string) {
    updateGame({ type: "change_player_color", playerId, newColor: color });
  }

  function onSliderChange(channel: keyof Hsl, value: number) {
    const color = { ...customColor, [channel]: value };
    setCustomColor(color);
    setPlayerColor(hslToHex(color));
  }

  // In the body, as a transformed or clipped ancestor would otherwise hold it inside the player list
  return createPortal(
    <div
      className={clsx("color-select-background", { closing })}
      onClick={() => setClosing(true)}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="color-select-content-nub"
        style={{
          position: "absolute",
          left: position.x + 40,
          top: position.y + 8,
        }}
      />
      <div
        ref={contentRef}
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
        {ring && (
          <div
            className="selection-ring"
            style={{ transform: `translate(${ring.left}px, ${ring.top}px)` }}
          />
        )}
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
            style={{ backgroundColor: customHex }}
            onClick={() => setPlayerColor(customHex)}
          />
          <div
            className="color-sliders"
            style={
              {
                "--hue": customColor.h,
                "--saturation": `${customColor.s}%`,
                "--lightness": `${customColor.l}%`,
              } as React.CSSProperties
            }
          >
            {channels.map(({ channel, min, max }) => (
              <input
                key={channel}
                className="color-slider"
                type="range"
                id={`custom-color-${channel}`}
                min={min}
                max={max}
                value={customColor[channel]}
                onChange={(e) => onSliderChange(channel, Number(e.target.value))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
