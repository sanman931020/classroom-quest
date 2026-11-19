import { useEffect, useRef, useState } from "react";
import type { FurnitureId, Point, Progress } from "../game/types";
import { Character, MarkerBadge, type Look, type Marker, type Mood, type Pose } from "../art/Character";
import { SvgDefs } from "../art/SvgDefs";
import { Beanbag, Desk, DiscussTable, FloorTile, Lectern, Mat, Plant, Shelf, VoteBoard } from "../art/props";
import {
  CORNER,
  clientToSvg,
  cornerCenter,
  iso,
  leftWallMatrix,
  pts,
  rightWallMatrix,
  unIso,
  worldToCorner,
  type ViewBox,
} from "../art/iso";
import { useCamera } from "./useCamera";
import { usePrefs } from "../ui/prefs";

/**
 * 三年二班教室：同一個 2.5D 場景支援主選單、探索、空間配置、模擬與班會佈置。
 * 背景（牆、窗、黑板、地板）→ 放置格 → 依深度排序的家具／角色 → 特效 → 熱區。
 * 家具拖曳時，以螢幕座標逆投影為邏輯格，再交由 engine.place 判斷，不存像素。
 */
export type ClassMode = "menu" | "explore" | "layout" | "simulate" | "meeting";
export const CAMERAS: Record<string, ViewBox> = {
  full: { x: -560, y: -270, w: 1250, h: 900 },
  corner: { x: -90, y: -170, w: 800, h: 620 },
  menu: { x: -360, y: -250, w: 1040, h: 740 },
  front: { x: -560, y: -250, w: 1080, h: 860 },
};

export type CastMember = {
  key: string;
  look: Look;
  gx: number;
  gy: number;
  mood?: Mood;
  pose?: Pose;
  marker?: Marker;
  selected?: boolean;
  label?: string;
  sash?: string;
  book?: boolean;
  dim?: boolean;
  className?: string;
  /** 角色名牌（3D 場景顯示） */
  nameTag?: string;
  onActivate?: () => void;
};

export const FURNITURE_NAMES: Record<FurnitureId, string> = {
  shelf: "書櫃",
  mat: "閱讀地墊",
  table: "討論桌椅",
};

const WH = 220; // 牆高
const DESKS: [number, number][] = [];
for (const gy of [5.4, 7.1, 8.8]) for (const gx of [4.3, 6.3, 8.3, 10.3]) DESKS.push([gx, gy]);
/** 班會時學生座位（椅子位置） */
export const SEATS = DESKS.map(([gx, gy]) => ({ gx: gx + 0.74, gy: gy + 0.26 }));

export interface ClassroomProps {
  mode: ClassMode;
  camera: keyof typeof CAMERAS | ViewBox;
  positions: Progress["positions"];
  cast: CastMember[];
  messy?: boolean;
  ariaLabel: string;
  slice?: boolean;
  /** 學生輸入的班級名稱（布告欄等處顯示） */
  classLabel?: string;
  /** 探索模式：點家具或布告欄 */
  onObject?: (id: FurnitureId | "board" | "blackboard") => void;
  objectMarkers?: Partial<Record<FurnitureId | "board", Marker>>;
  selectedObject?: FurnitureId | "board" | null;
  /** 配置模式 */
  selectedFurniture?: FurnitureId | null;
  onFurnitureSelect?: (id: FurnitureId) => void;
  onFurnitureMove?: (id: FurnitureId, p: Point) => void;
  onTile?: (x: number, y: number) => void;
  canPlace?: (id: FurnitureId, p: Point) => boolean;
  invalidFlash?: FurnitureId | null;
  /** 黑板內容 */
  board?: { title: string; lines: string[]; current?: number; note?: string };
  /** 布告欄提案卡（班會） */
  proposalCard?: { problem: string; plan: string } | null;
  voteBoard?: { title: string; rows: { label: string; value: number | null }[]; highlight?: number } | null;
  effects?: { noise?: boolean; tidy?: boolean; calm?: boolean };
}

type Drag = {
  id: FurnitureId;
  pid: number;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  wx: number;
  wy: number;
  moved: boolean;
};

export function furnitureCenter(positions: Progress["positions"], id: FurnitureId) {
  const p = positions[id];
  return cornerCenter(p.x, p.y);
}

export function Classroom(props: ClassroomProps) {
  const {
    mode,
    positions,
    cast,
    messy,
    ariaLabel,
    onObject,
    objectMarkers = {},
    selectedObject,
    selectedFurniture,
    onFurnitureSelect,
    onFurnitureMove,
    onTile,
    canPlace,
    invalidFlash,
    board,
    proposalCard,
    voteBoard,
    effects = {},
    classLabel = "我們班",
  } = props;
  const { prefs } = usePrefs();
  const target = typeof props.camera === "string" ? CAMERAS[props.camera] : props.camera;
  const { view, moving } = useCamera(target);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rid = useRef(0);
  const layout = mode === "layout";

  useEffect(() => {
    if (!drag) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [drag]);

  function worldPoint(e: React.PointerEvent | PointerEvent) {
    return clientToSvg(worldRef.current!, e.clientX, e.clientY);
  }

  function ripple(e: React.PointerEvent) {
    if (prefs.lowPower) return;
    const p = worldPoint(e);
    const id = ++rid.current;
    setRipples((r) => [...r.slice(-4), { id, x: p.x, y: p.y }]);
    window.setTimeout(() => setRipples((r) => r.filter((q) => q.id !== id)), 650);
  }

  function startDrag(e: React.PointerEvent, id: FurnitureId) {
    if (!layout) return;
    e.preventDefault();
    const p = worldPoint(e);
    const c = furnitureCenter(positions, id);
    const cs = iso(c.gx, c.gy);
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* 某些瀏覽器不支援 capture 時仍可拖曳 */
    }
    setDrag({ id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x - cs.x, oy: p.y - cs.y, wx: cs.x, wy: cs.y, moved: false });
  }

  function onMove(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pid) return;
    const p = worldPoint(e);
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6;
    setDrag({ ...drag, wx: p.x - drag.ox, wy: p.y - drag.oy, moved });
  }

  function onUp(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    setDrag(null);
    if (d.moved) {
      const g = unIso(d.wx, d.wy);
      onFurnitureMove?.(d.id, worldToCorner(g.gx, g.gy));
    } else onFurnitureSelect?.(d.id);
  }

  // 拖曳預覽：吸附目標格與合法性
  let preview: { x: number; y: number; ok: boolean } | null = null;
  if (drag && drag.moved) {
    const g = unIso(drag.wx, drag.wy);
    const lp = worldToCorner(g.gx, g.gy);
    const x = Math.round(lp.x);
    const y = Math.round(lp.y);
    preview = { x, y, ok: canPlace ? canPlace(drag.id, lp) : true };
  }

  /* ---------- 依深度排序的動態物件 ---------- */
  type Item = { depth: number; key: string; node: React.ReactNode };
  const items: Item[] = [];
  DESKS.forEach(([gx, gy], i) =>
    items.push({ depth: gx + gy + 0.5, key: `desk${i}`, node: <Desk gx={gx} gy={gy} /> }),
  );
  items.push({ depth: 1.3 + 5.4, key: "lectern", node: <Lectern gx={1.3} gy={4.6} /> });
  items.push({ depth: 12.6 + 0.5, key: "plant1", node: <Plant gx={12.55} gy={0.45} /> });
  items.push({ depth: 0.5 + 9.9, key: "plant2", node: <Plant gx={0.45} gy={9.9} size={0.9} /> });
  items.push({ depth: 12.5 + 2.4, key: "bean", node: <Beanbag gx={12.5} gy={2.4} /> });
  if (mode === "meeting") {
    items.push({ depth: 1.3 + 2.4, key: "recdesk", node: <Desk gx={1.0} gy={1.9} /> });
    if (voteBoard)
      items.push({
        depth: 2.8 + 9.2,
        key: "vote",
        node: <VoteBoard gx={2.6} gy={9.1} rows={voteBoard.rows} title={voteBoard.title} highlight={voteBoard.highlight} />,
      });
  }

  (["mat", "shelf", "table"] as FurnitureId[]).forEach((id) => {
    const c = furnitureCenter(positions, id);
    const dragging = drag?.id === id && drag.moved;
    const sel = layout ? selectedFurniture === id : selectedObject === id;
    const art =
      id === "shelf" ? (
        <Shelf cx={c.gx} cy={c.gy} messy={messy} />
      ) : id === "mat" ? (
        <Mat cx={c.gx} cy={c.gy} />
      ) : (
        <DiscussTable cx={c.gx} cy={c.gy} />
      );
    const sc = iso(c.gx, c.gy);
    const interactive = layout || (mode === "explore" && !!onObject);
    const label = layout ? `選取${FURNITURE_NAMES[id]}` : `查看${FURNITURE_NAMES[id]}`;
    const node = (
      <g
        className={`furniture f-${id} ${sel ? "is-selected" : ""} ${dragging ? "is-origin" : ""} ${invalidFlash === id ? "is-invalid" : ""} ${interactive ? "hotspot" : ""}`}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? label : undefined}
        aria-pressed={layout ? sel : undefined}
        data-x={positions[id].x}
        data-y={positions[id].y}
        onPointerDown={layout ? (e) => startDrag(e, id) : undefined}
        onClick={
          !layout && onObject
            ? (e) => {
                e.stopPropagation();
                onObject(id);
              }
            : undefined
        }
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (layout) onFurnitureSelect?.(id);
            else onObject?.(id);
          }
          if (layout) {
            const dir: Record<string, [number, number]> = {
              ArrowRight: [1, 0],
              ArrowLeft: [-1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            const v = dir[e.key];
            if (v) {
              e.preventDefault();
              onFurnitureMove?.(id, { x: positions[id].x + v[0], y: positions[id].y + v[1] });
            }
          }
        }}
      >
        {sel && (
          <polygon
            className="select-floor"
            points={pts([
              [c.gx - 0.5, c.gy - 0.5],
              [c.gx + 0.5, c.gy - 0.5],
              [c.gx + 0.5, c.gy + 0.5],
              [c.gx - 0.5, c.gy + 0.5],
            ])}
          />
        )}
        <g className="furniture-art">{art}</g>
        {/* 擴大觸控熱區 */}
        <rect className="hit" x={sc.x - 50} y={sc.y - (id === "shelf" ? 130 : id === "table" ? 75 : 40)} width={100} height={id === "shelf" ? 150 : id === "table" ? 100 : 66} fill="transparent" />
        {!layout && objectMarkers[id] && <MarkerBadge kind={objectMarkers[id]!} y={sc.y - (id === "shelf" ? 150 : id === "table" ? 92 : 50)} />}
      </g>
    );
    items.push({ depth: id === "mat" ? c.gx + c.gy - 1.2 : c.gx + c.gy, key: `f-${id}`, node });
  });

  cast.forEach((m) => {
    const p = iso(m.gx, m.gy);
    items.push({
      depth: m.gx + m.gy + 0.05,
      key: `c-${m.key}`,
      node: (
        <Character
          look={m.look}
          mood={m.mood}
          pose={m.pose}
          x={p.x}
          y={p.y}
          marker={m.marker}
          selected={m.selected}
          label={m.label}
          sash={m.sash}
          book={m.book}
          dim={m.dim}
          className={m.className}
          onActivate={m.onActivate}
        />
      ),
    });
  });
  items.sort((a, b) => a.depth - b.depth);

  /* ---------- 背景 ---------- */
  const bg = (
    <g className={`static-layer ${moving || prefs.lowPower ? "" : "wc"}`}>
      {/* 地板厚度（紙雕底座） */}
      <polygon points={pts([[0, 10, 0], [13, 10, 0], [13, 10, -22], [0, 10, -22]])} fill="#c9b48f" stroke="#8a7354" strokeWidth={1.5} />
      <polygon points={pts([[13, 0, 0], [13, 10, 0], [13, 10, -22], [13, 0, -22]])} fill="#b49d78" stroke="#8a7354" strokeWidth={1.5} />
      {/* 磨石子地板 */}
      <polygon points={pts([[0, 0], [13, 0], [13, 10], [0, 10]])} fill="#ece4d3" stroke="#8a7354" strokeWidth={1.6} />
      <g stroke="#ddd2bd" strokeWidth={1}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`gx${i}`} {...line(i + 1, 0, i + 1, 10)} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`gy${i}`} {...line(0, i + 1, 13, i + 1)} />
        ))}
      </g>
      {/* 閱讀角木地板平台 */}
      <polygon points={pts([[CORNER.gx0, 0, 2], [CORNER.gx0 + 8, 0, 2], [CORNER.gx0 + 8, 3, 2], [CORNER.gx0, 3, 2]])} fill="#ead2ad" stroke="#a9825a" strokeWidth={1.4} />
      <g stroke="#d9bb91" strokeWidth={1}>
        {[0.5, 1, 1.5, 2, 2.5].map((v) => (
          <line key={v} {...line(CORNER.gx0, v, CORNER.gx0 + 8, v, 2)} />
        ))}
      </g>
      {/* 通道標線 */}
      <g stroke="#d6b563" strokeWidth={2} strokeDasharray="10 8" opacity={0.8}>
        <line {...line(CORNER.gx0, 3.5, CORNER.gx0 + 8, 3.5)} />
      </g>
      {/* 水彩暈染 */}
      <ellipse cx={iso(8, 2).x} cy={iso(8, 2).y} rx={260} ry={120} fill="url(#g-wash-warm)" />
      <ellipse cx={iso(6, 7).x} cy={iso(6, 7).y} rx={300} ry={140} fill="url(#g-wash-teal)" />

      {/* 左牆 */}
      <polygon points={pts([[0, 0, 0], [0, 10, 0], [0, 10, WH], [0, 0, WH]])} fill="url(#g-wall-left)" stroke="#8a7354" strokeWidth={1.6} />
      <polygon points={pts([[0, 0, 0], [0, 10, 0], [0, 10, 58], [0, 0, 58]])} fill="#cfe2d4" />
      <line {...line(0, 0, 0, 10, 58)} stroke="#a9c7b2" strokeWidth={3} />
      {/* 右牆 */}
      <polygon points={pts([[0, 0, 0], [13, 0, 0], [13, 0, WH], [0, 0, WH]])} fill="url(#g-wall-right)" stroke="#8a7354" strokeWidth={1.6} />
      <polygon points={pts([[0, 0, 0], [13, 0, 0], [13, 0, 58], [0, 0, 58]])} fill="#d7e8dc" />
      <line {...line(0, 0, 13, 0, 58)} stroke="#a9c7b2" strokeWidth={3} />
      {/* 牆頂厚度 */}
      <polygon points={pts([[0, 0, WH], [13, 0, WH], [13, -0.25, WH], [-0.25, -0.25, WH], [-0.25, 10, WH], [0, 10, WH]])} fill="#f9f3e6" stroke="#8a7354" strokeWidth={1.4} />

      {/* 窗戶 ×2（右牆） */}
      {[
        [0.6, 2.9],
        [3.3, 5.6],
      ].map(([a, b], i) => (
        <Window key={i} a={a} b={b} idx={i} />
      ))}

      {/* 黑板（左牆） */}
      <g className="blackboard">
        <polygon points={pts([[0, 2.5, 66], [0, 7.5, 66], [0, 7.5, 176], [0, 2.5, 176]])} fill="#a9825a" stroke="#6b5038" strokeWidth={1.6} />
        <polygon points={pts([[0, 2.62, 72], [0, 7.38, 72], [0, 7.38, 170], [0, 2.62, 170]])} fill="url(#g-board)" />
        <polygon points={pts([[0, 2.6, 64], [0, 7.4, 64], [0.18, 7.4, 64], [0.18, 2.6, 64]])} fill="#c99a6b" stroke="#6b5038" strokeWidth={1} />
        {board && (
          <g transform={leftWallMatrix(7.25, 164)} className="board-text">
            <text x={14} y={20} fontSize={17} fill="#fdfbf2" fontWeight={700}>
              {board.title}
            </text>
            {board.lines.map((l, i) => (
              <text
                key={i}
                x={18}
                y={42 + i * 15}
                fontSize={12.5}
                fill={board.current === i ? "#ffe39a" : "#e9efe6"}
                fontWeight={board.current === i ? 700 : 400}
              >
                {board.current === i ? "▸ " : ""}
                {l}
              </text>
            ))}
            {board.note && (
              <text x={170} y={20} fontSize={11} fill="#cfe3d6">
                {board.note}
              </text>
            )}
          </g>
        )}
        {/* 粉筆擦與粉筆 */}
        <polygon points={pts([[0.04, 6.6, 66], [0.04, 7.0, 66], [0.16, 7.0, 66], [0.16, 6.6, 66]])} fill="#e98a7c" />
      </g>

      {/* 幹部工作區（左牆） */}
      <g className="officer-area">
        <polygon points={pts([[0, 0.4, 84], [0, 2.1, 84], [0, 2.1, 160], [0, 0.4, 160]])} fill="#fffaf0" stroke="#8a7354" strokeWidth={1.4} />
        {["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6", "#7fb88f"].map((c, i) => (
          <polygon key={c} points={pts([[0, 0.55, 145 - i * 12], [0, 0.75, 145 - i * 12], [0, 0.75, 137 - i * 12], [0, 0.55, 137 - i * 12]])} fill={c} />
        ))}
        <g transform={leftWallMatrix(2.0, 157)}>
          <text x={4} y={12} fontSize={10} fill="#405d4a" fontWeight={700}>
            幹部工作
          </text>
          {["班長", "風紀", "衛生", "學藝", "體育"].map((t, i) => (
            <text key={t} x={22} y={23 + i * 12} fontSize={9} fill="#2f3f35">
              {t}
            </text>
          ))}
        </g>
        <IsoCab />
      </g>

      {/* 時鐘、廣播喇叭 */}
      <Clock />
      <g>
        <polygon points={pts([[0, 8.3, 186], [0, 8.9, 186], [0, 8.9, 206], [0, 8.3, 206]])} fill="#f3ead8" stroke="#8a7354" strokeWidth={1.2} />
        {[0, 1, 2].map((i) => (
          <line key={i} {...line(0, 8.4, 0, 8.8, 191 + i * 5)} stroke="#a89a82" strokeWidth={1.2} />
        ))}
      </g>

      {/* 門（左牆） */}
      <g className="door">
        <polygon points={pts([[0, 8.5, 0], [0, 9.75, 0], [0, 9.75, 146], [0, 8.5, 146]])} fill="#c99a6b" stroke="#6b5038" strokeWidth={1.6} />
        <polygon points={pts([[0, 8.7, 90], [0, 9.55, 90], [0, 9.55, 134], [0, 8.7, 134]])} fill="url(#g-sky)" stroke="#6b5038" strokeWidth={1} />
        <circle cx={iso(0, 8.7, 70).x} cy={iso(0, 8.7, 70).y} r={3.4} fill="#d6b563" stroke="#6b5038" />
      </g>

      {/* 班級公約布告欄（右牆） */}
      <g className="rules-board">
        <polygon points={pts([[6.5, 0, 66], [9.5, 0, 66], [9.5, 0, 178], [6.5, 0, 178]])} fill="#a9825a" stroke="#6b5038" strokeWidth={1.5} />
        <polygon points={pts([[6.6, 0, 72], [9.4, 0, 72], [9.4, 0, 172], [6.6, 0, 172]])} fill="url(#p-cork)" />
        <polygon points={pts([[6.8, 0, 80], [8.3, 0, 80], [8.3, 0, 166], [6.8, 0, 166]])} fill="#fffaf0" stroke="#c9b48f" strokeWidth={1} />
        <g transform={rightWallMatrix(6.85, 163)}>
          <text x={6} y={13} fontSize={11.5} fill="#c9665a" fontWeight={800}>
            {classLabel} 班級公約
          </text>
          {["準時到校學習", "配合班級活動", "按時繳交作業", "遵守班級秩序", "維護環境清潔"].map((t, i) => (
            <text key={t} x={8} y={28 + i * 11.5} fontSize={8.6} fill="#2f3f35">
              {i + 1}. {t}
            </text>
          ))}
        </g>
        {proposalCard ? (
          <g>
            <polygon points={pts([[8.45, 0, 92], [9.3, 0, 92], [9.3, 0, 160], [8.45, 0, 160]])} fill="#f7edcf" stroke="#a8873a" strokeWidth={1} />
            <g transform={rightWallMatrix(8.5, 157)}>
              <text x={3} y={10} fontSize={8.5} fill="#a8873a" fontWeight={800}>
                提案
              </text>
              {wrap(proposalCard.plan || "（待填寫）", 5, 4).map((t, i) => (
                <text key={i} x={3} y={22 + i * 10} fontSize={8} fill="#2f3f35">
                  {t}
                </text>
              ))}
            </g>
          </g>
        ) : (
          <g>
            <polygon points={pts([[8.5, 0, 112], [9.25, 0, 112], [9.25, 0, 158], [8.5, 0, 158]])} fill="#dff0ec" stroke="#8fbfb5" strokeWidth={1} />
            <polygon points={pts([[8.6, 0, 84], [9.3, 0, 84], [9.3, 0, 106], [8.6, 0, 106]])} fill="#fbe4df" stroke="#e0a89d" strokeWidth={1} />
          </g>
        )}
        {[7.0, 8.1, 8.8].map((g) => (
          <circle key={g} cx={iso(g, 0, 168).x} cy={iso(g, 0, 168).y} r={2.6} fill="#e98a7c" stroke="#8a5040" strokeWidth={0.8} />
        ))}
      </g>
      {/* 閱讀角三角旗 */}
      <g className="bunting">
        <path d={`M ${iso(4.2, 0, 196).x} ${iso(4.2, 0, 196).y} Q ${iso(6.6, 0, 180).x} ${iso(6.6, 0, 180).y} ${iso(12.4, 0, 196).x} ${iso(12.4, 0, 196).y}`} stroke="#8a7354" strokeWidth={1.2} fill="none" />
        {Array.from({ length: 11 }, (_, i) => {
          const g = 4.6 + i * 0.72;
          const t = (g - 4.2) / 8.2;
          const sag = 196 - Math.sin(t * Math.PI) * 11;
          const a = iso(g - 0.2, 0, sag);
          const b = iso(g + 0.2, 0, sag);
          const c = iso(g, 0, sag - 18);
          return <polygon key={i} points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`} fill={["#e98a7c", "#65afa5", "#d6b563"][i % 3]} />;
        })}
      </g>
      {/* 作品展示 */}
      <g>
        <polygon points={pts([[10.1, 0, 80], [12.5, 0, 80], [12.5, 0, 168], [10.1, 0, 168]])} fill="#fffaf0" stroke="#8a7354" strokeWidth={1.3} />
        {[
          [10.3, 120, "#9fd0c6"],
          [11.35, 124, "#f6c3b9"],
          [10.4, 88, "#f7edcf"],
          [11.4, 90, "#c8d6ee"],
        ].map(([g, h, c], i) => (
          <polygon key={i} points={pts([[g as number, 0, h as number], [(g as number) + 0.85, 0, h as number], [(g as number) + 0.85, 0, (h as number) + 36], [g as number, 0, (h as number) + 36]])} fill={c as string} stroke="#c9b48f" strokeWidth={0.8} />
        ))}
        <circle cx={iso(10.75, 0, 140).x} cy={iso(10.75, 0, 140).y} r={8} fill="#f0c95b" />
        <path d={`M ${iso(11.5, 0, 128).x} ${iso(11.5, 0, 128).y} l 12 -10 l 10 8`} stroke="#7fb88f" strokeWidth={3} fill="none" />
      </g>
    </g>
  );

  return (
    <svg
      ref={svgRef}
      className={`scene-svg classroom mode-${mode} ${moving ? "cam-moving" : ""} ${drag ? "is-dragging" : ""}`}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio={props.slice ? "xMidYMid slice" : "xMidYMid meet"}
      role="group"
      aria-label={ariaLabel}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
      onPointerDown={(e) => {
        if ((e.target as Element).closest(".hotspot")) ripple(e);
      }}
    >
      <SvgDefs />
      <g ref={worldRef}>
        {bg}
        {/* 陽光 */}
        <SunRays />
        {/* 放置格 */}
        {(layout || drag) && (
          <g className="tiles">
            {Array.from({ length: 32 }, (_, i) => {
              const x = i % 8;
              const y = Math.floor(i / 8);
              const aisle = y === 3;
              const isPreview = preview && preview.x === x && preview.y === y;
              const state = isPreview ? (preview!.ok ? "ok" : "bad") : aisle ? "aisle" : "idle";
              return (
                <g
                  key={i}
                  className="tile"
                  role="button"
                  tabIndex={0}
                  aria-label={`放置家具於第${x + 1}欄第${y + 1}排`}
                  onClick={() => onTile?.(x, y)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onTile?.(x, y);
                    }
                  }}
                >
                  <FloorTile gx={CORNER.gx0 + x} gy={CORNER.gy0 + y} state={state} />
                </g>
              );
            })}
          </g>
        )}
        <g className="objects">
          {items.map((it) => (
            <g key={it.key}>{it.node}</g>
          ))}
        </g>
        {/* 特效：聲音干擾、整齊、安靜 */}
        {effects.noise && <NoiseWaves from={furnitureCenter(positions, "table")} to={furnitureCenter(positions, "mat")} />}
        {effects.tidy && <Sparkles at={furnitureCenter(positions, "shelf")} />}
        {/* 拖曳中的幽靈預覽 */}
        {drag && drag.moved && (
          <g className={`drag-ghost ${preview?.ok ? "ok" : "bad"}`} pointerEvents="none">
            {(() => {
              const g = preview ? cornerCenter(preview.x, preview.y) : unIso(drag.wx, drag.wy);
              return drag.id === "shelf" ? <Shelf cx={g.gx} cy={g.gy} /> : drag.id === "mat" ? <Mat cx={g.gx} cy={g.gy} /> : <DiscussTable cx={g.gx} cy={g.gy} />;
            })()}
            <circle cx={drag.wx} cy={drag.wy} r={9} className="drag-finger" />
          </g>
        )}
        {ripples.map((r) => (
          <circle key={r.id} className="ripple" cx={r.x} cy={r.y} r={10} />
        ))}
      </g>
    </svg>
  );
}

function line(gx1: number, gy1: number, gx2: number, gy2: number, h = 0) {
  const a = iso(gx1, gy1, h);
  const b = iso(gx2, gy2, h);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function wrap(t: string, n: number, max: number) {
  const out: string[] = [];
  for (let i = 0; i < t.length && out.length < max; i += n) out.push(t.slice(i, i + n));
  return out;
}

function Window({ a, b, idx }: { a: number; b: number; idx: number }) {
  const lo = 78;
  const hi = 188;
  const m = (a + b) / 2;
  return (
    <g className="window">
      <polygon points={pts([[a - 0.08, 0, lo - 6], [b + 0.08, 0, lo - 6], [b + 0.08, 0, hi + 6], [a - 0.08, 0, hi + 6]])} fill="#fffaf0" stroke="#8a7354" strokeWidth={1.5} />
      <polygon points={pts([[a, 0, lo], [b, 0, lo], [b, 0, hi], [a, 0, hi]])} fill="url(#g-sky)" />
      {/* 窗外的樹與雲 */}
      <ellipse cx={iso(a + 0.6, 0, lo + 30).x} cy={iso(a + 0.6, 0, lo + 30).y} rx={34} ry={26} fill="#a9cf95" opacity={0.85} />
      <ellipse cx={iso(b - 0.4, 0, lo + 22).x} cy={iso(b - 0.4, 0, lo + 22).y} rx={26} ry={20} fill="#93c182" opacity={0.85} />
      <ellipse className="cloud" cx={iso(m, 0, hi - 26).x} cy={iso(m, 0, hi - 26).y} rx={22} ry={8} fill="#fff" opacity={0.85} style={{ animationDelay: `${idx * -6}s` }} />
      <line {...line(m, 0, m, 0, lo)} y2={iso(m, 0, hi).y} x2={iso(m, 0, hi).x} stroke="#8a7354" strokeWidth={3} />
      <line {...line(a, 0, b, 0, (lo + hi) / 2)} stroke="#8a7354" strokeWidth={2.4} />
      {/* 窗簾（輕微擺動） */}
      <g className="curtain" style={{ animationDelay: `${idx * -1.7}s` }}>
        <polygon points={pts([[a - 0.12, 0, hi + 8], [a + 0.45, 0, hi + 8], [a + 0.3, 0, lo - 2], [a - 0.12, 0, lo - 8]])} fill="#f6c3b9" stroke="#c9665a" strokeWidth={1} opacity={0.95} />
      </g>
      <g className="curtain r" style={{ animationDelay: `${idx * -2.3 - 1}s` }}>
        <polygon points={pts([[b - 0.45, 0, hi + 8], [b + 0.12, 0, hi + 8], [b + 0.12, 0, lo - 8], [b - 0.3, 0, lo - 2]])} fill="#f6c3b9" stroke="#c9665a" strokeWidth={1} opacity={0.95} />
      </g>
      <polygon points={pts([[a - 0.14, 0, lo - 6], [b + 0.14, 0, lo - 6], [b + 0.14, 0.18, lo - 6], [a - 0.14, 0.18, lo - 6]])} fill="#e7dcc6" stroke="#8a7354" strokeWidth={1} />
    </g>
  );
}

function SunRays() {
  return (
    <g className="sunrays" pointerEvents="none">
      {[
        [0.6, 2.9],
        [3.3, 5.6],
      ].map(([a, b], i) => (
        <g key={i}>
          <polygon
            className="ray"
            style={{ animationDelay: `${i * -2}s` }}
            points={pts([[a, 0, 188], [b, 0, 188], [b + 1.6, 3.2, 0], [a + 1.6, 3.2, 0]])}
            fill="url(#g-ray)"
          />
          <polygon className="sunpatch" points={pts([[a + 0.5, 1.1], [b + 0.5, 1.1], [b + 1.6, 3.2], [a + 1.6, 3.2]])} fill="#fff6d2" opacity={0.45} />
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((i) => {
        const p = iso(2 + i * 0.9, 1.4 + (i % 2) * 0.6, 60 + i * 18);
        return <circle key={i} className="mote" cx={p.x} cy={p.y} r={1.8} fill="#fffbe8" style={{ animationDelay: `${i * -1.3}s` }} />;
      })}
    </g>
  );
}

function Clock() {
  const c = iso(0, 1.25, 190);
  return (
    <g className="clock" transform={`translate(${c.x} ${c.y}) matrix(0.894,-0.447,0,1,0,0)`}>
      <circle r={13} fill="#fffaf0" stroke="#6b5038" strokeWidth={2.4} />
      <line x1={0} y1={0} x2={0} y2={-8} stroke="#2f3f35" strokeWidth={2} strokeLinecap="round" />
      <line className="clock-hand" x1={0} y1={0} x2={6} y2={0} stroke="#e98a7c" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function IsoCab() {
  const f = (gx: number, gy: number, w: number, d: number, h: number) => ({ gx, gy, w, d, h });
  const b = f(0.02, 0.45, 0.42, 1.6, 44);
  return (
    <g>
      <polygon points={pts([[b.gx, b.gy + b.d, 0], [b.gx + b.w, b.gy + b.d, 0], [b.gx + b.w, b.gy + b.d, b.h], [b.gx, b.gy + b.d, b.h]])} fill="#a9c7b2" stroke="#5b4636" strokeWidth={1.2} />
      <polygon points={pts([[b.gx + b.w, b.gy, 0], [b.gx + b.w, b.gy + b.d, 0], [b.gx + b.w, b.gy + b.d, b.h], [b.gx + b.w, b.gy, b.h]])} fill="#bfd8c6" stroke="#5b4636" strokeWidth={1.2} />
      <polygon points={pts([[b.gx, b.gy, b.h], [b.gx + b.w, b.gy, b.h], [b.gx + b.w, b.gy + b.d, b.h], [b.gx, b.gy + b.d, b.h]])} fill="#dcebe0" stroke="#5b4636" strokeWidth={1.2} />
      {[0.15, 0.6, 1.05].map((o, i) => (
        <polygon key={i} points={pts([[b.gx + b.w, b.gy + o + 0.05, 10], [b.gx + b.w, b.gy + o + 0.4, 10], [b.gx + b.w, b.gy + o + 0.4, 34], [b.gx + b.w, b.gy + o + 0.05, 34]])} fill={["#e98a7c", "#65afa5", "#d6b563"][i]} opacity={0.8} />
      ))}
    </g>
  );
}

function NoiseWaves({ from, to }: { from: { gx: number; gy: number }; to: { gx: number; gy: number } }) {
  const a = iso(from.gx, from.gy, 50);
  const b = iso(to.gx, to.gy, 40);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g className="noise" transform={`translate(${mx} ${my}) rotate(${ang})`} pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <path key={i} className="wave" style={{ animationDelay: `${i * 0.35}s` }} d="M -10 -16 Q 0 0 -10 16" stroke="#e98a7c" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      ))}
      <g transform={`rotate(${-ang})`}>
        <circle cx={0} cy={-34} r={14} fill="#fbe4df" stroke="#c9665a" strokeWidth={1.5} />
        <path d="M -6 -38 L -2 -38 L 3 -43 L 3 -25 L -2 -30 L -6 -30 Z" fill="#c9665a" />
      </g>
    </g>
  );
}

function Sparkles({ at }: { at: { gx: number; gy: number } }) {
  const p = iso(at.gx, at.gy, 110);
  return (
    <g className="sparkles" transform={`translate(${p.x} ${p.y})`} pointerEvents="none">
      {[
        [-26, 0],
        [24, -12],
        [4, -30],
      ].map(([x, y], i) => (
        <path key={i} className="twinkle" style={{ animationDelay: `${i * 0.4}s` }} transform={`translate(${x} ${y})`} d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z" fill="#f0c95b" stroke="#a8873a" strokeWidth={0.8} />
      ))}
    </g>
  );
}

export { iso };
