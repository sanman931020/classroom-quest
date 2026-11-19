import type { CharacterId, Progress } from "../game/types";
import { characters } from "../data/content";
export type ActivityProps = {
  s: Progress;
  update: (fn: (draft: Progress) => void) => void;
  notify: (message: string) => void;
};
export function Avatar({
  id,
  small = false,
}: {
  id: CharacterId;
  small?: boolean;
}) {
  const c = characters.find((c) => c.id === id)!;
  return (
    <span
      className={`avatar ${small ? "small" : ""} ${id}`}
      style={{ "--shirt": c.color } as React.CSSProperties}
      aria-hidden="true"
    >
      <i className="hair" />
      <i className="face">
        <b className="eyes">{id === "zhe" ? "◎ ◎" : "• •"}</b>
        <b className="smile">⌣</b>
      </i>
      <i className="body" />
      {id === "anan" && <i className="clip" />}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      {label}
      <textarea
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
