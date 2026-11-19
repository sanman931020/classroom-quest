import type { CharacterId } from "../game/types";

/**
 * 五位固定角色（與玩家／路人同學）的分層 SVG 角色。
 * 原點為腳底中央；學生約 1:3 頭身（高 112），林老師約 1:4（高 152）。
 * 分層：影子 → 後髮 → 腿 → 身體 → 手臂 → 頭 → 表情 → 前髮 → 配件 → 狀態標記。
 * 表情（mood）與姿勢（pose）由 props 切換，眨眼／呼吸／說話／揮手為 CSS 動畫，
 * 可被低動態設定停用。
 */
export type Mood =
  | "idle"
  | "happy"
  | "confused"
  | "worried"
  | "thinking"
  | "talking";
export type Pose = "stand" | "raise" | "wave" | "read" | "point" | "sit";
export type Look = CharacterId | "player" | `npc${number}`;
export type Marker = "new" | "check" | "talk" | "hand" | "idea" | null;

type Palette = {
  shirt: string;
  shirtShade: string;
  accent: string;
  hair: string;
  hairShade: string;
  skin: string;
  bottom: string;
  girl: boolean;
  tall?: boolean;
};

const SKIN = "#f7d6bd";
const BLUE = "#a9d3e6";
const BLUE_SH = "#86b9d1";
const YEL = "#f3d57e";
const YEL_SH = "#dcb75a";

export const PALETTES: Record<CharacterId | "player", Palette> = {
  anan: {
    shirt: BLUE,
    shirtShade: BLUE_SH,
    accent: "#e98a7c",
    hair: "#3d2b22",
    hairShade: "#2a1d17",
    skin: SKIN,
    bottom: "#3f5d7c",
    girl: true,
  },
  zhe: {
    shirt: YEL,
    shirtShade: YEL_SH,
    accent: "#65afa5",
    hair: "#2f2520",
    hairShade: "#1f1814",
    skin: "#f3cfb3",
    bottom: "#3f5d7c",
    girl: false,
  },
  mi: {
    shirt: BLUE,
    shirtShade: BLUE_SH,
    accent: "#d6b563",
    hair: "#4a3226",
    hairShade: "#33221a",
    skin: SKIN,
    bottom: "#3f5d7c",
    girl: true,
  },
  hao: {
    shirt: YEL,
    shirtShade: YEL_SH,
    accent: "#5d8fc7",
    hair: "#2a211d",
    hairShade: "#17110e",
    skin: "#efc7a6",
    bottom: "#3f5d7c",
    girl: false,
  },
  teacher: {
    shirt: "#fbf6ec",
    shirtShade: "#e6dccb",
    accent: "#65afa5",
    hair: "#4b3428",
    hairShade: "#33231b",
    skin: SKIN,
    bottom: "#7d8ea0",
    girl: true,
    tall: true,
  },
  player: {
    shirt: BLUE,
    shirtShade: BLUE_SH,
    accent: "#405d4a",
    hair: "#3a2a20",
    hairShade: "#271b14",
    skin: "#f4d2b6",
    bottom: "#3f5d7c",
    girl: false,
  },
};

function npcPalette(n: number): Palette {
  const hairs = ["#2e221c", "#4a3226", "#3b2d25", "#24201d"];
  const skins = ["#f7d6bd", "#efc7a6", "#f3cfb3"];
  const accents = ["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6"];
  return {
    shirt: n % 2 ? YEL : BLUE,
    shirtShade: n % 2 ? YEL_SH : BLUE_SH,
    accent: accents[n % 4],
    hair: hairs[n % 4],
    hairShade: "#1d1612",
    skin: skins[n % 3],
    bottom: "#3f5d7c",
    // 小宇（npc0）為男生、小芸（npc9）為女生
    girl: n === 9 || n % 3 === 1,
  };
}

export function paletteOf(look: Look): Palette {
  if (look.startsWith("npc")) return npcPalette(Number(look.slice(3)) || 0);
  return PALETTES[look as CharacterId | "player"];
}

const OUT = "#4a3a30"; // 柔和線條色（非純黑）

/** 角色在各姿勢下的手臂角度（度）：[左臂, 右臂]（以畫面左右而言） */
const ARM: Record<Pose, [number, number]> = {
  stand: [9, -9],
  raise: [9, -166],
  wave: [9, -140],
  read: [-34, 34],
  point: [9, -100],
  sit: [-20, 20],
};

function Eyes({ mood, look, hy }: { mood: Mood; look: Look; hy: number }) {
  const ey = hy + 2;
  if (mood === "happy")
    return (
      <g stroke={OUT} strokeWidth={2.2} fill="none" strokeLinecap="round">
        <path d={`M -10 ${ey + 1} Q -7 ${ey - 3.5} -4 ${ey + 1}`} />
        <path d={`M 4 ${ey + 1} Q 7 ${ey - 3.5} 10 ${ey + 1}`} />
      </g>
    );
  const dx = mood === "thinking" ? 1.6 : 0;
  const dy = mood === "thinking" ? -1.6 : 0;
  const ry = mood === "worried" ? 3.4 : 3.1;
  return (
    <g className="eyes" style={{ animationDelay: `${(look.length * 0.73) % 3}s` }}>
      <ellipse cx={-7 + dx} cy={ey + dy} rx={2.5} ry={ry} fill="#2f2622" />
      <ellipse cx={7 + dx} cy={ey + dy} rx={2.5} ry={ry} fill="#2f2622" />
      <circle cx={-6.2 + dx} cy={ey - 1.1 + dy} r={0.9} fill="#fff" />
      <circle cx={7.8 + dx} cy={ey - 1.1 + dy} r={0.9} fill="#fff" />
    </g>
  );
}

function Brows({ mood, hy, color }: { mood: Mood; hy: number; color: string }) {
  const by = hy - 6;
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  switch (mood) {
    case "worried":
      return (
        <g {...common}>
          <path d={`M -11 ${by + 1} L -4 ${by - 2}`} />
          <path d={`M 11 ${by + 1} L 4 ${by - 2}`} />
        </g>
      );
    case "confused":
      return (
        <g {...common}>
          <path d={`M -11 ${by} L -4 ${by}`} />
          <path d={`M 4 ${by - 1} Q 7.5 ${by - 4.5} 11 ${by - 2}`} />
        </g>
      );
    case "thinking":
      return (
        <g {...common}>
          <path d={`M -11 ${by - 1} L -4 ${by - 1.5}`} />
          <path d={`M 4 ${by - 2.5} L 11 ${by - 1}`} />
        </g>
      );
    case "happy":
      return (
        <g {...common}>
          <path d={`M -11 ${by - 1} Q -7.5 ${by - 4} -4 ${by - 1}`} />
          <path d={`M 4 ${by - 1} Q 7.5 ${by - 4} 11 ${by - 1}`} />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d={`M -11 ${by} Q -7.5 ${by - 2} -4 ${by}`} />
          <path d={`M 4 ${by} Q 7.5 ${by - 2} 11 ${by}`} />
        </g>
      );
  }
}

function Mouth({ mood, hy }: { mood: Mood; hy: number }) {
  const my = hy + 10;
  switch (mood) {
    case "happy":
      return (
        <path
          d={`M -5 ${my - 1} Q 0 ${my + 6} 5 ${my - 1} Z`}
          fill="#c4574d"
          stroke={OUT}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      );
    case "talking":
      return (
        <ellipse
          className="mouth-talk"
          cx={0}
          cy={my + 1}
          rx={3.2}
          ry={2.8}
          fill="#c4574d"
          stroke={OUT}
          strokeWidth={1.1}
        />
      );
    case "worried":
      return (
        <path
          d={`M -4 ${my + 2} Q 0 ${my - 1.5} 4 ${my + 2}`}
          stroke={OUT}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "confused":
      return (
        <path
          d={`M -4.5 ${my + 1} q 2.2 -2 4.5 0 t 4.5 0`}
          stroke={OUT}
          strokeWidth={1.7}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "thinking":
      return (
        <path
          d={`M 0 ${my + 1} L 5 ${my}`}
          stroke={OUT}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      );
    default:
      return (
        <path
          d={`M -4 ${my} Q 0 ${my + 3.5} 4 ${my}`}
          stroke={OUT}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}

function HairBack({ look, pal, hy }: { look: Look; pal: Palette; hy: number }) {
  const c = pal.hair;
  if (look === "teacher")
    return (
      <path
        d={`M -22 ${hy - 2} Q -24 ${hy - 26} 0 ${hy - 25} Q 24 ${hy - 26} 22 ${hy - 2} L 23 ${hy + 26} Q 12 ${hy + 31} 0 ${hy + 24} Q -12 ${hy + 31} -23 ${hy + 26} Z`}
        fill={c}
        stroke={OUT}
        strokeWidth={1.4}
      />
    );
  if (look === "anan")
    return (
      <path
        d={`M -22 ${hy + 2} Q -24 ${hy - 25} 0 ${hy - 24} Q 24 ${hy - 25} 22 ${hy + 2} L 21 ${hy + 13} Q 0 ${hy + 17} -21 ${hy + 13} Z`}
        fill={c}
        stroke={OUT}
        strokeWidth={1.4}
      />
    );
  if (look === "mi")
    return (
      <g fill={c} stroke={OUT} strokeWidth={1.3}>
        <path
          d={`M -21 ${hy + 3} Q -23 ${hy - 24} 0 ${hy - 23} Q 23 ${hy - 24} 21 ${hy + 3} Z`}
        />
        {[-1, 1].map((s) => (
          <g key={s}>
            {[0, 1, 2, 3].map((i) => (
              <ellipse
                key={i}
                cx={s * (17 + i * 0.6)}
                cy={hy + 9 + i * 8}
                rx={4.6 - i * 0.4}
                ry={5}
              />
            ))}
            <circle
              cx={s * 19}
              cy={hy + 39}
              r={2.6}
              fill={pal.accent}
              stroke={OUT}
            />
            <path
              d={`M ${s * 19} ${hy + 41} l ${s * -1.5} 5 M ${s * 19} ${hy + 41} l ${s * 1.8} 5`}
              stroke={c}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    );
  return (
    <path
      d={`M -21 ${hy} Q -22 ${hy - 24} 0 ${hy - 23} Q 22 ${hy - 24} 21 ${hy} Z`}
      fill={c}
      stroke={OUT}
      strokeWidth={1.4}
    />
  );
}

function HairFront({
  look,
  pal,
  hy,
}: {
  look: Look;
  pal: Palette;
  hy: number;
}) {
  const c = pal.hair;
  const sh = pal.hairShade;
  switch (look) {
    case "anan":
      return (
        <g>
          <path
            d={`M -20 ${hy - 2} Q -18 ${hy - 22} 2 ${hy - 21} Q 20 ${hy - 20} 20 ${hy - 2} Q 12 ${hy - 10} 4 ${hy - 9} Q -4 ${hy - 13} -10 ${hy - 7} Q -15 ${hy - 4} -20 ${hy - 2} Z`}
            fill={c}
            stroke={OUT}
            strokeWidth={1.3}
          />
          <path
            d={`M -6 ${hy - 17} Q 2 ${hy - 20} 10 ${hy - 16}`}
            stroke="#6b5040"
            strokeWidth={1.6}
            fill="none"
            opacity={0.7}
          />
          {/* 髮夾 */}
          <g transform={`translate(12 ${hy - 13}) rotate(-28)`}>
            <rect x={-5} y={-2.4} width={11} height={4.8} rx={2.4} fill={pal.accent} stroke={OUT} strokeWidth={1.1} />
            <circle cx={-5} cy={0} r={3.4} fill="#f6c3b9" stroke={OUT} strokeWidth={1.1} />
          </g>
        </g>
      );
    case "zhe":
      return (
        <path
          d={`M -20 ${hy - 3} Q -19 ${hy - 22} 0 ${hy - 22} Q 19 ${hy - 22} 20 ${hy - 4} Q 14 ${hy - 13} 4 ${hy - 14} Q 6 ${hy - 10} 2 ${hy - 8} Q -6 ${hy - 13} -12 ${hy - 9} Q -16 ${hy - 7} -20 ${hy - 3} Z`}
          fill={c}
          stroke={OUT}
          strokeWidth={1.3}
        />
      );
    case "mi":
      return (
        <g>
          <path
            d={`M -20 ${hy - 1} Q -19 ${hy - 22} 0 ${hy - 21} Q 19 ${hy - 22} 20 ${hy - 1} Q 14 ${hy - 9} 6 ${hy - 10} L 0 ${hy - 16} L -6 ${hy - 10} Q -14 ${hy - 9} -20 ${hy - 1} Z`}
            fill={c}
            stroke={OUT}
            strokeWidth={1.3}
          />
          <path d={`M 0 ${hy - 21} L 0 ${hy - 15}`} stroke={sh} strokeWidth={1.4} />
        </g>
      );
    case "hao":
      return (
        <path
          d={`M -21 ${hy - 4} L -24 ${hy - 14} L -16 ${hy - 15} L -18 ${hy - 25} L -8 ${hy - 20} L -6 ${hy - 31} L 2 ${hy - 22} L 8 ${hy - 31} L 10 ${hy - 20} L 19 ${hy - 26} L 17 ${hy - 15} L 25 ${hy - 13} L 21 ${hy - 4} Q 12 ${hy - 11} 0 ${hy - 10} Q -12 ${hy - 11} -21 ${hy - 4} Z`}
          fill={c}
          stroke={OUT}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      );
    case "teacher":
      return (
        <path
          d={`M -21 ${hy + 4} Q -21 ${hy - 23} 2 ${hy - 22} Q 21 ${hy - 21} 21 ${hy + 2} Q 18 ${hy - 10} 8 ${hy - 13} Q -4 ${hy - 16} -12 ${hy - 6} Q -17 ${hy} -21 ${hy + 4} Z`}
          fill={c}
          stroke={OUT}
          strokeWidth={1.3}
        />
      );
    default: {
      const n = Number(look.replace(/\D/g, "")) || 0;
      if (paletteOf(look).girl)
        return (
          <path
            d={`M -20 ${hy} Q -19 ${hy - 22} 0 ${hy - 21} Q 19 ${hy - 22} 20 ${hy} Q 10 ${hy - 11} 0 ${hy - 10} Q -10 ${hy - 11} -20 ${hy} Z`}
            fill={c}
            stroke={OUT}
            strokeWidth={1.3}
          />
        );
      return (
        <path
          d={`M -20 ${hy - 4} Q -19 ${hy - 22} 0 ${hy - 22} Q 19 ${hy - 22} 20 ${hy - 4} Q ${8 + (n % 3)} ${hy - 13} 0 ${hy - 12} Q -10 ${hy - 13} -20 ${hy - 4} Z`}
          fill={c}
          stroke={OUT}
          strokeWidth={1.3}
        />
      );
    }
  }
}

function Arm({
  x,
  y,
  angle,
  pal,
  len,
  className,
}: {
  x: number;
  y: number;
  angle: number;
  pal: Palette;
  len: number;
  className?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className={`arm ${className ?? ""}`}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <rect
          x={-4.6}
          y={-3}
          width={9.2}
          height={13}
          rx={4.6}
          fill={pal.shirt}
          stroke={OUT}
          strokeWidth={1.2}
        />
        <rect
          x={-3.4}
          y={8}
          width={6.8}
          height={len - 8}
          rx={3.4}
          fill={pal.skin}
          stroke={OUT}
          strokeWidth={1.1}
        />
        <circle cx={0} cy={len} r={4.4} fill={pal.skin} stroke={OUT} strokeWidth={1.1} />
      </g>
    </g>
  );
}

export interface CharacterProps {
  look: Look;
  mood?: Mood;
  pose?: Pose;
  x?: number;
  y?: number;
  scale?: number;
  label?: string;
  marker?: Marker;
  selected?: boolean;
  dim?: boolean;
  sash?: string;
  book?: boolean;
  onActivate?: () => void;
  className?: string;
}

export function Character({
  look,
  mood = "idle",
  pose = "stand",
  x = 0,
  y = 0,
  scale = 1,
  label,
  marker = null,
  selected = false,
  dim = false,
  sash,
  book,
  onActivate,
  className = "",
}: CharacterProps) {
  const pal = paletteOf(look);
  const tall = !!pal.tall;
  const H = tall ? 152 : 112;
  const hy = tall ? -130 : -90; // 頭中心
  const shoulderY = tall ? -104 : -68;
  const hipY = tall ? -58 : -36;
  const armLen = tall ? 36 : 28;
  const sit = pose === "sit";
  const [la, ra] = ARM[pose];
  const interactive = !!onActivate;
  const showBook = book ?? pose === "read";
  const body = (
    <g className="char-body">
      {/* 腿與鞋 */}
      {!sit && (
        <g stroke={OUT} strokeWidth={1.1}>
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect
                x={s < 0 ? -9 : 2}
                y={hipY}
                width={7}
                height={-hipY - 6}
                rx={3}
                fill={pal.skin}
              />
              <rect
                x={s < 0 ? -9 : 2}
                y={-15}
                width={7}
                height={9}
                fill="#fbfaf6"
                strokeWidth={0.8}
              />
              <ellipse cx={s * 6} cy={-3.5} rx={6} ry={3.8} fill="#5a4a42" />
            </g>
          ))}
        </g>
      )}
      {/* 下身：裙或褲 */}
      {pal.girl ? (
        <path
          d={`M -15 ${hipY - 4} L 15 ${hipY - 4} L 19 ${hipY + (tall ? 30 : 12)} Q 0 ${hipY + (tall ? 34 : 16)} -19 ${hipY + (tall ? 30 : 12)} Z`}
          fill={pal.bottom}
          stroke={OUT}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      ) : (
        <path
          d={`M -15 ${hipY - 4} L 15 ${hipY - 4} L 16 ${hipY + 13} L 2 ${hipY + 13} L 0 ${hipY + 4} L -2 ${hipY + 13} L -16 ${hipY + 13} Z`}
          fill={pal.bottom}
          stroke={OUT}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}
      {/* 上衣 */}
      <path
        d={`M -14 ${shoulderY} Q -18 ${shoulderY + 3} -16 ${hipY} L 16 ${hipY} Q 18 ${shoulderY + 3} 14 ${shoulderY} Q 0 ${shoulderY - 5} -14 ${shoulderY} Z`}
        fill={pal.shirt}
        stroke={OUT}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d={`M 6 ${shoulderY + 2} Q 15 ${shoulderY + 10} 15 ${hipY}`}
        stroke={pal.shirtShade}
        strokeWidth={4}
        fill="none"
        opacity={0.6}
      />
      {/* 領口 */}
      <path
        d={`M -7 ${shoulderY - 2} L 0 ${shoulderY + 7} L 7 ${shoulderY - 2}`}
        fill="#fffdf6"
        stroke={OUT}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {look === "teacher" ? (
        <>
          {/* 淺色襯衫外的青綠開襟背心 */}
          <path
            d={`M -14 ${shoulderY + 1} L -6 ${shoulderY + 6} L -7 ${hipY} L -16 ${hipY} Q -18 ${shoulderY + 3} -14 ${shoulderY + 1} Z`}
            fill={pal.accent}
            stroke={OUT}
            strokeWidth={1}
          />
          <path
            d={`M 14 ${shoulderY + 1} L 6 ${shoulderY + 6} L 7 ${hipY} L 16 ${hipY} Q 18 ${shoulderY + 3} 14 ${shoulderY + 1} Z`}
            fill={pal.accent}
            stroke={OUT}
            strokeWidth={1}
          />
        </>
      ) : (
        <>
          {/* 胸前名牌（臺灣國小制服） */}
          <rect
            x={3}
            y={shoulderY + 9}
            width={9}
            height={5}
            rx={1}
            fill="#fffdf6"
            stroke={OUT}
            strokeWidth={0.8}
          />
          <path
            d={`M -4 ${shoulderY + 6} L 0 ${shoulderY + 12} L 4 ${shoulderY + 6} Z`}
            fill={pal.accent}
            stroke={OUT}
            strokeWidth={0.9}
          />
        </>
      )}
      {sash && (
        <path
          d={`M -14 ${shoulderY + 1} L 16 ${hipY - 2} L 16 ${hipY + 5} L -15 ${shoulderY + 9} Z`}
          fill={sash}
          stroke={OUT}
          strokeWidth={1}
          opacity={0.95}
        />
      )}
      {/* 手臂 */}
      <Arm x={-15} y={shoulderY + 3} angle={la} pal={pal} len={armLen} />
      <Arm
        x={15}
        y={shoulderY + 3}
        angle={ra}
        pal={pal}
        len={armLen}
        className={pose === "wave" ? "arm-wave" : pose === "raise" ? "arm-raise" : ""}
      />
      {showBook && (
        <g transform={`translate(0 ${shoulderY + 30})`} className="book">
          <path d="M -13 -8 L 0 -5 L 13 -8 L 13 6 L 0 9 L -13 6 Z" fill="#e98a7c" stroke={OUT} strokeWidth={1.1} />
          <path d="M -11 -6 L 0 -3 L 11 -6 L 11 4 L 0 7 L -11 4 Z" fill="#fffaf0" stroke={OUT} strokeWidth={0.6} />
          <path className="book-page" d="M 0 -3 L 10 -6 L 10 4 L 0 7 Z" fill="#fff" stroke={OUT} strokeWidth={0.6} />
        </g>
      )}
      {/* 頭部 */}
      <g className="char-head">
        <HairBack look={look} pal={pal} hy={hy} />
        <rect x={-4} y={hy + 16} width={8} height={7} fill={pal.skin} stroke={OUT} strokeWidth={1} />
        <circle cx={-19} cy={hy + 3} r={4} fill={pal.skin} stroke={OUT} strokeWidth={1.1} />
        <circle cx={19} cy={hy + 3} r={4} fill={pal.skin} stroke={OUT} strokeWidth={1.1} />
        <ellipse cx={0} cy={hy} rx={19} ry={19.5} fill={pal.skin} stroke={OUT} strokeWidth={1.4} />
        <ellipse cx={-11.5} cy={hy + 8} rx={3.6} ry={2.2} fill="#f2a493" opacity={0.55} />
        <ellipse cx={11.5} cy={hy + 8} rx={3.6} ry={2.2} fill="#f2a493" opacity={0.55} />
        <Eyes mood={mood} look={look} hy={hy} />
        <Brows mood={mood} hy={hy} color={pal.hairShade} />
        <Mouth mood={mood} hy={hy} />
        <HairFront look={look} pal={pal} hy={hy} />
        {look === "zhe" && (
          <g fill="rgba(255,255,255,0.25)" stroke="#3a3330" strokeWidth={1.6}>
            <circle cx={-7} cy={hy + 2} r={5.6} />
            <circle cx={7} cy={hy + 2} r={5.6} />
            <path d={`M -1.4 ${hy + 1} Q 0 ${hy - 0.5} 1.4 ${hy + 1}`} fill="none" />
          </g>
        )}
      </g>
    </g>
  );

  const markerY = hy - 38;
  return (
    <g
      className={`character mood-${mood} pose-${pose} ${selected ? "is-selected" : ""} ${dim ? "is-dim" : ""} ${interactive ? "hotspot" : ""} ${className}`}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onActivate!();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate!();
              }
            }
          : undefined
      }
    >
      <ellipse cx={0} cy={0} rx={22} ry={7} fill="#3b2c1c" opacity={0.18} />
      {selected && (
        <ellipse className="select-ring" cx={0} cy={0} rx={30} ry={11} fill="none" stroke="#f0c95b" strokeWidth={4} />
      )}
      <g className="char-sway" transform={sit ? "translate(0 22)" : undefined}>
        {body}
      </g>
      {mood === "confused" && (
        <g transform={`translate(24 ${hy - 20})`} className="emote">
          <circle r={9} fill="#fffdf6" stroke={OUT} strokeWidth={1.2} />
          <path d="M -3 -3 Q -3 -6.5 0 -6.5 Q 3.4 -6.5 3.4 -3.4 Q 3.4 -1 0.6 0 L 0.6 2" stroke={OUT} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <circle cx={0.6} cy={5} r={1.2} fill={OUT} />
        </g>
      )}
      {mood === "worried" && (
        <path className="emote" transform={`translate(22 ${hy - 14})`} d="M 0 -6 Q 4 0 0 4 Q -4 0 0 -6 Z" fill="#9fd0e6" stroke={OUT} strokeWidth={1} />
      )}
      {mood === "thinking" && (
        <g className="emote" transform={`translate(22 ${hy - 22})`} fill="#fffdf6" stroke={OUT} strokeWidth={1}>
          <circle cx={-4} cy={10} r={2} />
          <circle cx={0} cy={4} r={3} />
          <ellipse cx={7} cy={-5} rx={9} ry={6.5} />
          <circle cx={3} cy={-5} r={1.1} fill={OUT} />
          <circle cx={7} cy={-5} r={1.1} fill={OUT} />
          <circle cx={11} cy={-5} r={1.1} fill={OUT} />
        </g>
      )}
      {mood === "happy" && (
        <g className="emote sparkle" transform={`translate(-24 ${hy - 16})`} fill="#f0c95b" stroke={OUT} strokeWidth={0.8}>
          <path d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z" />
        </g>
      )}
      {marker && <MarkerBadge kind={marker} y={markerY} />}
      {interactive && (
        <rect
          className="hit"
          x={-34}
          y={-(H + 16) + (sit ? 22 : 0)}
          width={68}
          height={H + 24}
          rx={16}
          fill="transparent"
        />
      )}
    </g>
  );
}

export function MarkerBadge({ kind, y }: { kind: Exclude<Marker, null>; y: number }) {
  const fill =
    kind === "check"
      ? "#4f9a6e"
      : kind === "hand"
        ? "#d6b563"
        : kind === "talk"
          ? "#65afa5"
          : kind === "idea"
            ? "#e98a7c"
            : "#e98a7c";
  return (
    <g className={`marker marker-${kind}`} transform={`translate(0 ${y})`}>
      <path d="M -13 -13 H 13 V 7 H 5 L 0 14 L -5 7 H -13 Z" fill={fill} stroke="#fffdf6" strokeWidth={2.4} strokeLinejoin="round" />
      {kind === "check" && (
        <path d="M -6 -3 L -1.5 2 L 7 -7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === "new" && (
        <g fill="#fff">
          <rect x={-1.8} y={-9} width={3.6} height={10} rx={1.6} />
          <circle cx={0} cy={4} r={2} />
        </g>
      )}
      {kind === "talk" && (
        <g fill="#fff">
          <circle cx={-5.5} cy={-3} r={2} />
          <circle cx={0} cy={-3} r={2} />
          <circle cx={5.5} cy={-3} r={2} />
        </g>
      )}
      {kind === "hand" && (
        <path d="M -4 4 L -4 -6 Q -4 -8 -2.4 -8 Q -0.8 -8 -0.8 -6 L -0.8 -9 Q -0.8 -11 0.8 -11 Q 2.4 -11 2.4 -9 L 2.4 -7 Q 2.4 -9 4 -9 Q 5.6 -9 5.6 -7 L 5.6 1 Q 5.6 5 1 5 L -1 5 Q -3 5 -4 4 Z" fill="#fff" />
      )}
      {kind === "idea" && (
        <g fill="#fff">
          <circle cx={0} cy={-4} r={5} />
          <rect x={-2.6} y={1} width={5.2} height={3.4} rx={1} />
        </g>
      )}
    </g>
  );
}

/** 對話框與 UI 用的頭像（裁切頭部） */
export function Portrait({
  look,
  mood = "idle",
  size = 64,
  className = "",
}: {
  look: Look;
  mood?: Mood;
  size?: number;
  className?: string;
}) {
  const tall = !!paletteOf(look).tall;
  const top = tall ? -166 : -126;
  return (
    <svg
      className={`portrait ${className}`}
      width={size}
      height={size}
      viewBox={`-32 ${top} 64 64`}
      aria-hidden="true"
    >
      <Character look={look} mood={mood} />
    </svg>
  );
}
