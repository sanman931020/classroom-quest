import { boxFaces, iso, pts } from "./iso";

/**
 * 等角家具與道具。全部以世界座標繪製、可獨立替換。
 * 顏色採水彩粉彩調：亮面、暗面、輪廓三色一組。
 */
const OUT = "#5b4636";

type BoxProps = {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  top: string;
  left: string;
  right: string;
  stroke?: string;
  sw?: number;
};
export function IsoBox({ gx, gy, w, d, h, z = 0, top, left, right, stroke = OUT, sw = 1.4 }: BoxProps) {
  const f = boxFaces(gx, gy, w, d, h, z);
  return (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <polygon points={f.left} fill={left} />
      <polygon points={f.right} fill={right} />
      <polygon points={f.top} fill={top} />
    </g>
  );
}

const BOOK_COLORS = ["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6", "#c9a6d6", "#f2b880", "#7fb88f"];

/** 書櫃（邏輯家具 shelf） */
export function Shelf({ cx, cy, messy = false }: { cx: number; cy: number; messy?: boolean }) {
  const x0 = cx - 0.42;
  const y0 = cy - 0.26;
  const w = 0.84;
  const d = 0.52;
  const H = 96;
  const yf = y0 + d;
  const books: React.ReactNode[] = [];
  [8, 38, 68].forEach((lv, li) => {
    let u = x0 + 0.05;
    let i = 0;
    while (u < x0 + w - 0.12) {
      const bw = 0.06 + ((i * 7 + li * 3) % 4) * 0.012;
      const bh = 20 + ((i * 5 + li) % 3) * 3;
      // 凌亂狀態：中層留空缺口，象徵書沒有歸位
      const gap = messy && li === 1 && i >= 3 && i <= 5;
      if (!gap)
        books.push(
          <polygon
            key={`${li}-${i}`}
            points={pts([
              [u, yf, lv],
              [u + bw, yf, lv],
              [u + bw, yf, lv + bh],
              [u, yf, lv + bh],
            ])}
            fill={BOOK_COLORS[(i + li * 2) % BOOK_COLORS.length]}
            stroke={OUT}
            strokeWidth={0.8}
          />,
        );
      u += bw + 0.008;
      i++;
    }
  });
  const c = iso(cx + 0.55, cy + 0.55);
  return (
    <g className="prop prop-shelf">
      <IsoBox gx={x0} gy={y0} w={w} d={d} h={H} top="#e7c79f" left="#c99a6b" right="#b6875a" />
      {/* 隔板 */}
      {[6, 36, 66].map((lv) => (
        <polygon
          key={lv}
          points={pts([
            [x0 + 0.03, yf, lv],
            [x0 + w - 0.03, yf, lv],
            [x0 + w - 0.03, yf, lv + 2.4],
            [x0 + 0.03, yf, lv + 2.4],
          ])}
          fill="#9c7048"
        />
      ))}
      {books}
      {messy && (
        <g transform={`translate(${c.x} ${c.y})`}>
          <path d="M -14 -2 L 4 -10 L 16 -4 L -2 4 Z" fill="#e98a7c" stroke={OUT} strokeWidth={1} />
          <path d="M -12 -3 L 4 -9 L 14 -4.5 L -2 2 Z" fill="#fffaf0" stroke={OUT} strokeWidth={0.6} />
          <path d="M -4 -3 q 2 -2 4 0" stroke="#a0886e" strokeWidth={1.4} fill="none" />
        </g>
      )}
    </g>
  );
}

/** 閱讀地墊（邏輯家具 mat） */
export function Mat({ cx, cy }: { cx: number; cy: number }) {
  const s = 0.46;
  const c = iso(cx, cy);
  return (
    <g className="prop prop-mat">
      <polygon
        points={pts([
          [cx - s, cy - s, 1],
          [cx + s, cy - s, 1],
          [cx + s, cy + s, 1],
          [cx - s, cy + s, 1],
        ])}
        fill="#9fd0c6"
        stroke={OUT}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <polygon
        points={pts([
          [cx - s + 0.08, cy - s + 0.08, 1],
          [cx + s - 0.08, cy - s + 0.08, 1],
          [cx + s - 0.08, cy + s - 0.08, 1],
          [cx - s + 0.08, cy + s - 0.08, 1],
        ])}
        fill="none"
        stroke="#fffaf0"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      {/* 抱枕 */}
      <g transform={`translate(${c.x - 22} ${c.y - 8})`}>
        <ellipse rx={13} ry={8} fill="#e98a7c" stroke={OUT} strokeWidth={1.2} />
        <path d="M -8 -1 Q 0 -5 8 -1" stroke="#f6b8ad" strokeWidth={1.6} fill="none" />
      </g>
      <g transform={`translate(${c.x + 20} ${c.y - 2})`}>
        <ellipse rx={12} ry={7.5} fill="#d6b563" stroke={OUT} strokeWidth={1.2} />
        <path d="M -7 -1 Q 0 -4.5 7 -1" stroke="#f0d78e" strokeWidth={1.6} fill="none" />
      </g>
    </g>
  );
}

/** 討論桌椅（邏輯家具 table） */
export function DiscussTable({ cx, cy, comics = true }: { cx: number; cy: number; comics?: boolean }) {
  const c = iso(cx, cy);
  const stool = (dx: number, dy: number, color: string, key: string) => {
    const p = iso(cx + dx, cy + dy);
    return (
      <g key={key} transform={`translate(${p.x} ${p.y})`}>
        <path d="M -11 -18 L -11 0 Q 0 6 11 0 L 11 -18 Z" fill="#b6875a" stroke={OUT} strokeWidth={1.1} />
        <ellipse cy={-18} rx={13} ry={6.5} fill={color} stroke={OUT} strokeWidth={1.2} />
      </g>
    );
  };
  return (
    <g className="prop prop-table">
      {stool(-0.36, -0.1, "#65afa5", "s1")}
      {stool(0.05, -0.38, "#e98a7c", "s2")}
      <g transform={`translate(${c.x} ${c.y})`}>
        <ellipse cy={0} rx={20} ry={8} fill="#000" opacity={0.08} />
        <rect x={-5} y={-34} width={10} height={34} fill="#b6875a" stroke={OUT} strokeWidth={1.1} />
        <path d="M -38 -36 L -38 -31 Q 0 -10 38 -31 L 38 -36 Z" fill="#c99a6b" stroke={OUT} strokeWidth={1.2} />
        <ellipse cy={-36} rx={38} ry={19} fill="#e7c79f" stroke={OUT} strokeWidth={1.3} />
        {comics && (
          <g>
            <path d="M -18 -40 L -4 -46 L 6 -41 L -8 -35 Z" fill="#8fa8d6" stroke={OUT} strokeWidth={0.9} />
            <path d="M 2 -34 L 16 -40 L 24 -35 L 10 -29 Z" fill="#f2b880" stroke={OUT} strokeWidth={0.9} />
          </g>
        )}
      </g>
      {stool(0.4, 0.12, "#d6b563", "s3")}
    </g>
  );
}

/** 學生課桌椅（朝向黑板 -gx 方向） */
export function Desk({ gx, gy }: { gx: number; gy: number }) {
  return (
    <g className="prop prop-desk">
      {/* 椅子在 +gx 側 */}
      <IsoBox gx={gx + 0.55} gy={gy + 0.08} w={0.32} d={0.32} h={3} z={18} top="#8fb3a6" left="#6f978a" right="#5f8679" />
      <IsoBox gx={gx + 0.85} gy={gy + 0.08} w={0.05} d={0.32} h={24} z={20} top="#8fb3a6" left="#6f978a" right="#5f8679" />
      {[
        [gx + 0.04, gy + 0.42],
        [gx + 0.56, gy + 0.42],
      ].map(([a, b], i) => {
        const p1 = iso(a, b, 0);
        const p2 = iso(a, b, 30);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8b8b8b" strokeWidth={2.2} />;
      })}
      <IsoBox gx={gx} gy={gy} w={0.6} d={0.46} h={5} z={30} top="#ecd2ac" left="#c99a6b" right="#b6875a" />
    </g>
  );
}

export function Lectern({ gx, gy }: { gx: number; gy: number }) {
  return (
    <g className="prop prop-lectern">
      <IsoBox gx={gx} gy={gy} w={0.55} d={0.9} h={56} top="#e7c79f" left="#c99a6b" right="#a87a4d" />
      <polygon
        points={pts([
          [gx + 0.55, gy + 0.2, 14],
          [gx + 0.55, gy + 0.7, 14],
          [gx + 0.55, gy + 0.7, 44],
          [gx + 0.55, gy + 0.2, 44],
        ])}
        fill="#d6b563"
        opacity={0.55}
      />
    </g>
  );
}

export function Plant({ gx, gy, size = 1 }: { gx: number; gy: number; size?: number }) {
  const p = iso(gx, gy);
  return (
    <g className="prop prop-plant" transform={`translate(${p.x} ${p.y}) scale(${size})`}>
      <path d="M -12 -22 L -9 0 Q 0 4 9 0 L 12 -22 Z" fill="#e98a7c" stroke={OUT} strokeWidth={1.2} />
      <ellipse cy={-22} rx={12} ry={4.5} fill="#c9665a" stroke={OUT} strokeWidth={1} />
      <g className="leaves" fill="#7fb88f" stroke="#3f6b4c" strokeWidth={1.1}>
        <ellipse cx={-8} cy={-38} rx={7} ry={15} transform="rotate(-25 -8 -38)" />
        <ellipse cx={8} cy={-40} rx={7} ry={16} transform="rotate(22 8 -40)" />
        <ellipse cx={0} cy={-46} rx={7} ry={18} fill="#8fc79c" />
      </g>
    </g>
  );
}

export function Beanbag({ gx, gy, color = "#d6b563" }: { gx: number; gy: number; color?: string }) {
  const p = iso(gx, gy);
  return (
    <g className="prop" transform={`translate(${p.x} ${p.y})`}>
      <ellipse cy={-2} rx={26} ry={11} fill="#000" opacity={0.1} />
      <path d="M -26 -6 Q -28 -30 -6 -34 Q 18 -38 26 -14 Q 28 2 0 4 Q -24 4 -26 -6 Z" fill={color} stroke={OUT} strokeWidth={1.3} />
      <path d="M -14 -20 Q 0 -28 14 -18" stroke="#fff6dc" strokeWidth={2} fill="none" opacity={0.7} />
    </g>
  );
}

/** 隔音分隔物（第二階段僅作為裝飾與未來擴充） */
export function Divider({ gx, gy }: { gx: number; gy: number }) {
  return (
    <g className="prop prop-divider">
      <IsoBox gx={gx} gy={gy} w={0.08} d={0.8} h={52} top="#d9e8e3" left="#a9cfc4" right="#bcdcd2" />
    </g>
  );
}

/** 表決顯示白板（班會模式） */
export function VoteBoard({
  gx,
  gy,
  rows,
  highlight,
  title,
}: {
  gx: number;
  gy: number;
  rows: { label: string; value: number | null }[];
  highlight?: number;
  title: string;
}) {
  const p = iso(gx, gy);
  const max = 28;
  return (
    <g className="prop prop-voteboard" transform={`translate(${p.x} ${p.y})`}>
      <line x1={-40} y1={0} x2={-30} y2={-70} stroke="#8b6a4a" strokeWidth={3} />
      <line x1={40} y1={0} x2={30} y2={-70} stroke="#8b6a4a" strokeWidth={3} />
      <rect x={-62} y={-150} width={124} height={92} rx={6} fill="#fffdf6" stroke={OUT} strokeWidth={1.6} />
      <text x={0} y={-134} textAnchor="middle" className="svg-label" fontSize={12} fill="#405d4a" fontWeight={700}>
        {title}
      </text>
      {rows.map((r, i) => {
        const y = -118 + i * 20;
        const wBar = r.value == null ? 0 : (r.value / max) * 54;
        return (
          <g key={i}>
            <text x={-56} y={y + 9} fontSize={10} fill="#2f3f35" className="svg-label">
              {r.label}
            </text>
            <rect x={-2} y={y} width={56} height={11} rx={3} fill="#efe6d4" />
            <rect
              className="vote-bar"
              x={-2}
              y={y}
              width={wBar}
              height={11}
              rx={3}
              fill={highlight === i ? "#e98a7c" : "#65afa5"}
            />
            {r.value != null && (
              <text x={58} y={y + 9.5} fontSize={10} fill="#2f3f35" fontWeight={700} textAnchor="end" className="svg-label">
                {r.value}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 地面上的放置格（含合法／非法預覽） */
export function FloorTile({
  gx,
  gy,
  state,
}: {
  gx: number;
  gy: number;
  state: "idle" | "aisle" | "ok" | "bad" | "target";
}) {
  const fill =
    state === "aisle"
      ? "rgba(214,181,99,0.18)"
      : state === "ok"
        ? "rgba(101,175,165,0.55)"
        : state === "bad"
          ? "rgba(233,138,124,0.55)"
          : state === "target"
            ? "rgba(240,201,91,0.5)"
            : "rgba(255,255,255,0.18)";
  return (
    <polygon
      points={pts([
        [gx + 0.04, gy + 0.04, 0],
        [gx + 0.96, gy + 0.04, 0],
        [gx + 0.96, gy + 0.96, 0],
        [gx + 0.04, gy + 0.96, 0],
      ])}
      fill={fill}
      stroke={state === "aisle" ? "#c9a85a" : "#fffaf0"}
      strokeWidth={1.4}
      strokeDasharray={state === "aisle" ? "6 5" : undefined}
    />
  );
}
