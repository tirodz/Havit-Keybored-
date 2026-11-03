import type { CSSProperties } from "react";
import type { Profile } from "../domain/profiles";
import { keyboardLayout } from "../domain/keyboard";

type Props = {
  profile: Profile;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  compact?: boolean;
};

function keyTint(profile: Profile, key: number): string {
  const { effect, color } = profile.lighting;
  if (effect === "Static") return color;
  const hueShift = effect === "Wave" ? (key * 7) % 100 : effect === "Reactive" ? (key % 4) * 24 : (key % 2) * 18;
  return `color-mix(in srgb, ${color} ${Math.max(28, 75 - hueShift / 2)}%, #b4d6ff)`;
}

export function KeyboardPreview({ profile, selectedKey, onSelectKey, compact = false }: Props) {
  return (
    <div className={`keyboard-wrap${compact ? " keyboard-wrap--compact" : ""}`}>
      <div className="keyboard-device">
        <div className="keyboard-device-id"><span className="device-brand-mark">H</span><span>HAVIT KB874L</span><i />67 KEY · ANSI PREVIEW</div>
        <div className="keyboard-layout" role="group" aria-label="67-key HAVIT KB874L layout preview">
          {keyboardLayout.map((key) => {
            const selected = selectedKey === key.code;
            const mapped = profile.keyMap[key.code];
            const style = {
              "--key-left": `${key.x / 8}%`,
              "--key-top": `${key.y / 3}%`,
              "--key-width": `${key.width / 8}%`,
              "--key-height": `${key.height / 3}%`,
              "--key-color": keyTint(profile, key.keyIndex),
              "--key-brightness": profile.lighting.brightness / 100,
            } as CSSProperties;
            return (
              <button
                className={`keycap${selected ? " keycap--selected" : ""}${mapped ? " keycap--mapped" : ""}`}
                style={style}
                key={key.code}
                onClick={() => onSelectKey(key.code)}
                aria-pressed={selected}
                aria-label={`${key.label || "Space"}${mapped ? `, mapped to ${mapped}` : ""}`}
                title={mapped ? `${key.label || "Space"} → ${mapped} · simulated` : `${key.label || "Space"} · simulated`}
              >
                {key.secondary && <span className="keycap-secondary">{key.secondary}</span>}
                <span className="keycap-label">{mapped ?? key.label}</span>
              </button>
            );
          })}
        </div>
        <div className="keyboard-housing-detail"><span />COMMUNITY PREVIEW<span /></div>
      </div>
    </div>
  );
}
