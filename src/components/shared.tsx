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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
