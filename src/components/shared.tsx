import { useId } from "react";
import { MicButton } from "./VoiceInput";
import type { CharacterId, Progress } from "../game/types";
import { Portrait, type Mood } from "../art/Character";
export type ActivityProps = {
  s: Progress;
  update: (fn: (draft: Progress) => void) => void;
  notify: (message: string) => void;
};
/**
 * 角色頭像（第二階段改為分層 SVG 角色）。保留 {id, small} 介面，
 * 新增可選 mood；正式點陣素材可在 art/Character.tsx 統一替換。
 */
export function Avatar({
  id,
  small = false,
  mood = "idle",
}: {
  id: CharacterId;
  small?: boolean;
  mood?: Mood;
}) {
  return (
    <span className={`avatar ${small ? "small" : ""} ${id}`} aria-hidden="true">
      <Portrait look={id} mood={mood} size={small ? 40 : 56} />
    </span>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 2,
  voice = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  voice?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <div className="field-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {voice && <MicButton label={label} onText={(t) => onChange(value ? `${value}${t}` : t)} />}
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        className={value ? "" : "is-empty"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
