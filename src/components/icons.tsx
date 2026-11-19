/** 介面圖示（SVG，不依賴 emoji）。 */
export type IconName =
  | "home"
  | "pause"
  | "gear"
  | "sound"
  | "mute"
  | "help"
  | "sheet"
  | "check"
  | "next"
  | "back"
  | "close"
  | "reset"
  | "play"
  | "hand"
  | "star"
  | "starOutline"
  | "teacher"
  | "map"
  | "drag"
  | "tap"
  | "save"
  | "download"
  | "bulb"
  | "ear"
  | "pin"
  | "flag"
  | "clue"
  | "faceHappy"
  | "faceOk"
  | "faceSad"
  | "lock"
  | "radar"
  | "detective"
  | "note";

const P: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11 12 4l9 7M6 9.5V20h4.5v-5h3v5H18V9.5" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
      <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8" />
      <circle cx="12" cy="17" r=".6" />
    </>
  ),
  sheet: (
    <>
      <path d="M6 3.5h9l3.5 3.5v13.5H6z" />
      <path d="M9 10h6.5M9 13.5h6.5M9 17h4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  next: <path d="M9 5.5 15.5 12 9 18.5" />,
  back: <path d="M15 5.5 8.5 12l6.5 6.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  hand: <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11V4.5a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 6.5-6 6.5-2.6 0-4-1.2-5.3-3.3L4 13.4a1.4 1.4 0 0 1 2.2-1.7z" />,
  star: <path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z" />,
  starOutline: <path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z" />,
  teacher: (
    <>
      <circle cx="9" cy="7.5" r="3" />
      <path d="M3.5 20c.5-4 2.7-6 5.5-6s5 2 5.5 6M14 4.5h7v7h-5" />
    </>
  ),
  map: <path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5zM9 4v13.5M15 6.5V20" />,
  drag: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </>
  ),
  tap: (
    <>
      <circle cx="11" cy="7" r="3.5" />
      <path d="M11 7v9l-2-1.6a1.4 1.4 0 0 0-2 1.9l3.5 4.2h7l1-6-5-1.2" />
    </>
  ),
  save: <path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />,
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />,
  bulb: (
    <>
      <path d="M9 17.5h6M10 20.5h4" />
      <path d="M12 3.5a6 6 0 0 0-3.5 10.9V16h7v-1.6A6 6 0 0 0 12 3.5z" />
    </>
  ),
  ear: <path d="M7 9a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6M10 9.5a2 2 0 1 1 3.5 1.3" />,
  pin: (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  flag: <path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6" />,
  clue: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </>
  ),
  faceHappy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 13.5a4.5 4.5 0 0 0 8 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  faceOk: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15h7" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  faceSad: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 16a4.5 4.5 0 0 1 8 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12 18 6" />
    </>
  ),
  detective: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5 5" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h14v10l-5 5H5z" />
      <path d="M14 19.5v-5h5" />
    </>
  ),
};

export function Icon({
  name,
  size = 22,
  className = "",
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const filled = name === "star" || name === "play" || name === "pause";
  return (
    <svg
      className={`icon icon-${name} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
