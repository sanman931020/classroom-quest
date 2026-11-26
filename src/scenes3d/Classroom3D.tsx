import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { FurnitureId, Progress } from "../game/types";
import { SEATS, type ClassroomProps } from "../scenes/Classroom";
import { Character3D } from "./Character3D";
import { CANVAS_FONT, canvasTexture, flat, toon } from "./materials";
import { usePrefs } from "../ui/prefs";

/**
 * 3D 教室（React Three Fiber）。世界座標沿用 2.5D 版：x＝gx、z＝gy、y 為高度（公尺級）。
 * 黑板、布告欄、表決板的文字以 Canvas 貼圖由程式繪製；角色名牌與互動按鈕為 DOM（可讀、可觸控、可鍵盤操作）。
 * 鏡頭有預設視角與有限度的旋轉縮放，避免學生迷失方向。
 */
type V3 = [number, number, number];
/** zoom：視角縮放（負數＝拉近） */
const PRESETS: Record<string, { pos: V3; target: V3; zoom?: number }> = {
  // 站在黑板旁邊（老師的位置）看向全班：坐著的同學面向黑板，所以看得到大家的臉
  // 主席、司儀、記錄：站在黑板旁，正面往教室後方看（看得到全班的臉）
  front: { pos: [2.7, 1.6, 7.8], target: [12.5, 0.8, 7.1] },
  full: { pos: [2.7, 1.6, 7.8], target: [12.5, 0.8, 7.1] },
  // 學生：坐在第三排靠走廊牆的座位，往前看得到黑板
  seat: { pos: [9.05, 1.22, 9.05], target: [0, 1.5, 5.4], zoom: -19 },
  // 主選單：靠近後牆的班級公約，老師和同學聚在公約前（公約落在畫面右半，左半是選單卡片）
  menu: { pos: [6.5, 1.95, 5.8], target: [10.7, 0.85, 0.1] },
  corner: { pos: [4.4, 1.9, 6.6], target: [8.4, 1.0, 1.6] },
};
const DESKS: [number, number][] = [];
for (const gy of [5.4, 7.1, 8.8]) for (const gx of [4.3, 6.3, 8.3, 10.3]) DESKS.push([gx, gy]);
// 3D 座位：學生坐在課桌後方、面向黑板（黑板在 x=0 的前牆，面向 -x）
const CAM_DIR = [-1, 0] as const;
const DESK_ROT = Math.atan2(CAM_DIR[0], CAM_DIR[1]);
const deskCenter = (gx: number, gy: number) => [gx + 0.3, gy + 0.23] as const;
const seat3d = (gx: number, gy: number) => {
  const [cx, cz] = deskCenter(gx, gy);
  return [cx - CAM_DIR[0] * 0.42, cz - CAM_DIR[1] * 0.42] as const;
};
/** 將 2.5D 的座位座標換成 3D 座位座標 */
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
function remapSeat(x: number, z: number, pose?: string): [number, number, boolean] {
  const seatedPose = pose === "sit" || pose === "raise";
  // 主席：站在講桌旁（不被講桌擋住），學生從座位看得到
  if (near(x, 0.85) && near(z, 5.05)) return [1.25, 4.1, false];
  // 司儀：站在黑板另一側，避免太靠近鏡頭
  if (near(x, 1.4) && near(z, 7.3)) return [1.5, 2.9, false];
  // 記錄桌
  if (near(x, 1.72) && near(z, 2.2)) {
    const [sx, sz] = seat3d(1.0, 1.95);
    return seatedPose ? [sx, sz, true] : [x, z, false];
  }
  const exact = SEATS.findIndex((st) => near(st.gy, z) && near(st.gx, x));
  if (exact >= 0 && seatedPose) {
    const [sx, sz] = seat3d(DESKS[exact][0], DESKS[exact][1]);
    return [sx, sz, true];
  }
  const i = exact >= 0 ? exact : SEATS.findIndex((st) => near(st.gy, z) && near(st.gx - 0.6, x));
  if (i < 0) return [x, z, false];
  const [sx, sz] = seat3d(DESKS[i][0], DESKS[i][1]);
  // 起立發言：站到課桌旁邊
  return [sx - CAM_DIR[1] * 0.55, sz + CAM_DIR[0] * 0.55, false];
}

function useFontsVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setV((x) => x + 1));
    return () => {
      alive = false;
    };
  }, []);
  return v;
}

function useTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  // 依 key（內容字串）重繪貼圖
  const tex = useMemo(() => canvasTexture(w, h, draw), [key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- 黑板 ---------------- */
function Blackboard({ board, fv }: { board: ClassroomProps["board"]; fv: number }) {
  const key = JSON.stringify(board) + fv;
  const tex = useTexture(key, 1024, 236, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 1024, 236);
    g.addColorStop(0, "#4f7a63");
    g.addColorStop(1, "#3c624f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 236);
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(Math.random() * 1024, Math.random() * 236, 60, 2);
    }
    ctx.globalAlpha = 1;
    if (!board) return;
    ctx.fillStyle = "#fdfbf2";
    ctx.font = `700 40px ${CANVAS_FONT}`;
    ctx.fillText(board.title, 34, 52);
    if (board.note) {
      ctx.font = `500 26px ${CANVAS_FONT}`;
      ctx.fillStyle = "#cfe3d6";
      ctx.textAlign = "right";
      ctx.fillText(board.note, 990, 50);
      ctx.textAlign = "left";
    }
    const cols = board.lines.length > 4 ? 2 : 1;
    const per = Math.ceil(board.lines.length / cols);
    board.lines.forEach((l, i) => {
      const col = Math.floor(i / per);
      const row = i % per;
      const x = 44 + col * 480;
      const y = 104 + row * 42;
      const cur = board.current === i;
      ctx.font = `${cur ? 700 : 500} 30px ${CANVAS_FONT}`;
      ctx.fillStyle = cur ? "#ffe39a" : "#e9efe6";
      ctx.fillText(`${cur ? "▸ " : ""}${l}`, x, y);
    });
  });
  return (
    <group position={[0.02, 1.45, 5]} rotation={[0, Math.PI / 2, 0]}>
      <mesh material={toon("#a9825a")} position={[0, 0, -0.02]}>
        <boxGeometry args={[5.0, 1.3, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[4.8, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh material={toon("#c99a6b")} position={[0, -0.6, 0.06]}>
        <boxGeometry args={[4.8, 0.04, 0.12]} />
      </mesh>
    </group>
  );
}

/* ---------------- 布告欄（班級公約＋提案卡） ---------------- */
function RulesBoard({ classLabel, proposal, fv }: { classLabel: string; proposal: ClassroomProps["proposalCard"]; fv: number }) {
  const key = classLabel + JSON.stringify(proposal) + fv;
  const tex = useTexture(key, 600, 280, (ctx) => {
    ctx.fillStyle = "#d9b886";
    ctx.fillRect(0, 0, 600, 280);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = i % 2 ? "#c49c66" : "#e2c596";
      ctx.fillRect((i * 37) % 600, (i * 53) % 280, 3, 3);
    }
    ctx.fillStyle = "#fffaf0";
    roundRect(ctx, 16, 16, 300, 248, 8);
    ctx.fill();
    ctx.fillStyle = "#c9665a";
    ctx.font = `800 28px ${CANVAS_FONT}`;
    ctx.fillText(`${classLabel} 班級公約`, 30, 56);
    ctx.fillStyle = "#2f3f35";
    ctx.font = `500 22px ${CANVAS_FONT}`;
    ["準時到校學習", "配合班級活動", "按時繳交作業", "遵守班級秩序", "維護環境清潔"].forEach((t, i) => ctx.fillText(`${i + 1}. ${t}`, 34, 98 + i * 34));
    ctx.fillStyle = proposal ? "#f7edcf" : "#dff0ec";
    roundRect(ctx, 340, 30, 240, 200, 8);
    ctx.fill();
    ctx.fillStyle = "#a8873a";
    ctx.font = `800 24px ${CANVAS_FONT}`;
    ctx.fillText(proposal ? "提案" : "班級公告", 356, 66);
    ctx.fillStyle = "#2f3f35";
    ctx.font = `500 21px ${CANVAS_FONT}`;
    const text = proposal ? proposal.plan || "（待填寫）" : "下週一班會";
    for (let i = 0; i < 5; i++) {
      const line = text.slice(i * 9, i * 9 + 9);
      if (line) ctx.fillText(line, 356, 104 + i * 30);
    }
    ["#e98a7c", "#65afa5", "#d6b563"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(60 + i * 220, 22, 8, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  return (
    <group position={[12.98, 1.55, 4.0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh material={toon("#a9825a")} position={[0, 0, -0.01]}>
        <boxGeometry args={[3.1, 1.45, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[2.95, 1.32]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------- 表決板 ---------------- */
function VoteBoard3D({ vote, fv }: { vote: NonNullable<ClassroomProps["voteBoard"]>; fv: number }) {
  const key = JSON.stringify(vote) + fv;
  const tex = useTexture(key, 512, 360, (ctx) => {
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = "#405d4a";
    ctx.font = `800 34px ${CANVAS_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(vote.title, 256, 52);
    ctx.textAlign = "left";
    const max = Math.max(28, ...vote.rows.map((r) => r.value ?? 0));
    vote.rows.forEach((r, i) => {
      const y = 100 + i * 78;
      ctx.fillStyle = "#2f3f35";
      ctx.font = `700 30px ${CANVAS_FONT}`;
      ctx.fillText(r.label, 24, y + 30);
      ctx.fillStyle = "#efe6d4";
      roundRect(ctx, 190, y, 230, 40, 10);
      ctx.fill();
      if (r.value != null) {
        ctx.fillStyle = vote.highlight === i ? "#e98a7c" : "#65afa5";
        roundRect(ctx, 190, y, Math.max(12, (r.value / max) * 230), 40, 10);
        ctx.fill();
        ctx.fillStyle = "#2f3f35";
        ctx.font = `800 32px ${CANVAS_FONT}`;
        ctx.fillText(String(r.value), 436, y + 32);
      }
    });
  });
  return (
    <group position={[11.7, 0, 8.7]} rotation={[0, -1.45, 0]}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} material={toon("#8b6a4a")} position={[x, 0.75, -0.05]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.05, 1.5, 0.05]} />
        </mesh>
      ))}
      <mesh material={toon("#5b4636")} position={[0, 1.25, -0.01]}>
        <boxGeometry args={[1.12, 0.8, 0.04]} />
      </mesh>
      <mesh position={[0, 1.25, 0.012]}>
        <planeGeometry args={[1.06, 0.74]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------- 家具 ---------------- */
function Desk({ gx, gy }: { gx: number; gy: number }) {
  const wood = toon("#ecd2ac");
  const metal = toon("#8b8b8b");
  const [cx, cz] = deskCenter(gx, gy);
  return (
    <group position={[cx, 0, cz]} rotation={[0, DESK_ROT, 0]}>
      {/* 課桌：靠鏡頭一側 */}
      <mesh material={wood} position={[0, 0.68, 0]}>
        <boxGeometry args={[0.62, 0.05, 0.42]} />
      </mesh>
      <mesh material={toon("#d9bb91")} position={[0, 0.5, 0.19]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
      </mesh>
      {[
        [-0.27, -0.17],
        [0.27, -0.17],
        [-0.27, 0.17],
        [0.27, 0.17],
      ].map(([x, z], i) => (
        <mesh key={i} material={metal} position={[x, 0.33, z]}>
          <boxGeometry args={[0.03, 0.66, 0.03]} />
        </mesh>
      ))}
      {/* 椅子：在課桌後方（遠離鏡頭） */}
      <mesh material={toon("#8fb3a6")} position={[0, 0.4, -0.42]}>
        <boxGeometry args={[0.36, 0.04, 0.34]} />
      </mesh>
      <mesh material={toon("#6f978a")} position={[0, 0.66, -0.6]}>
        <boxGeometry args={[0.36, 0.42, 0.04]} />
      </mesh>
      {[
        [-0.15, -0.28],
        [0.15, -0.28],
        [-0.15, -0.56],
        [0.15, -0.56],
      ].map(([x, z], i) => (
        <mesh key={`c${i}`} material={metal} position={[x, 0.2, z]}>
          <boxGeometry args={[0.025, 0.4, 0.025]} />
        </mesh>
      ))}
    </group>
  );
}

const BOOKS = ["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6", "#c9a6d6", "#f2b880", "#7fb88f"];
function Shelf({ cx, cz, messy }: { cx: number; cz: number; messy?: boolean }) {
  return (
    <group position={[cx, 0, cz]}>
      <mesh material={toon("#c99a6b")} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.84, 1.0, 0.5]} />
      </mesh>
      {[0.08, 0.4, 0.72].map((y, li) => (
        <group key={y}>
          <mesh material={toon("#9c7048")} position={[0, y - 0.02, 0.255]}>
            <boxGeometry args={[0.78, 0.03, 0.02]} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            if (messy && li === 1 && i > 2 && i < 6) return null;
            const h = 0.2 + ((i * 5 + li) % 3) * 0.03;
            return (
              <mesh key={i} material={toon(BOOKS[(i + li * 2) % BOOKS.length])} position={[-0.34 + i * 0.085, y + h / 2, 0.2]}>
                <boxGeometry args={[0.07, h, 0.14]} />
              </mesh>
            );
          })}
        </group>
      ))}
      {messy && (
        <mesh material={toon("#e98a7c")} position={[0.2, 0.03, 0.55]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[0.24, 0.04, 0.17]} />
        </mesh>
      )}
    </group>
  );
}
function Mat({ cx, cz }: { cx: number; cz: number }) {
  return (
    <group position={[cx, 0.05, cz]}>
      <mesh material={toon("#9fd0c6")}>
        <boxGeometry args={[0.92, 0.03, 0.92]} />
      </mesh>
      <mesh material={toon("#e98a7c")} position={[-0.2, 0.07, -0.18]} scale={[1, 0.55, 0.75]}>
        <sphereGeometry args={[0.16, 14, 10]} />
      </mesh>
      <mesh material={toon("#d6b563")} position={[0.22, 0.07, 0.12]} scale={[1, 0.55, 0.75]}>
        <sphereGeometry args={[0.15, 14, 10]} />
      </mesh>
    </group>
  );
}
function Table({ cx, cz }: { cx: number; cz: number }) {
  return (
    <group position={[cx, 0, cz]}>
      <mesh material={toon("#e7c79f")} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 24]} />
      </mesh>
      <mesh material={toon("#b6875a")} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.5, 10]} />
      </mesh>
      {[
        [-0.45, 0, "#65afa5"],
        [0.1, -0.45, "#e98a7c"],
        [0.4, 0.35, "#d6b563"],
      ].map(([x, z, c], i) => (
        <mesh key={i} material={toon(c as string)} position={[x as number, 0.2, z as number]}>
          <cylinderGeometry args={[0.15, 0.13, 0.4, 14]} />
        </mesh>
      ))}
      <mesh material={toon("#8fa8d6")} position={[-0.08, 0.535, 0.05]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.13]} />
      </mesh>
    </group>
  );
}
function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh material={toon("#e98a7c")} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.15, 0.11, 0.32, 14]} />
      </mesh>
      {[
        [-0.08, 0.5, 0, 0.13],
        [0.09, 0.55, 0.02, 0.14],
        [0, 0.68, -0.02, 0.15],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} material={toon(i === 2 ? "#8fc79c" : "#7fb88f")} position={[px, py, pz]} scale={[1, 1.5, 1]}>
          <sphereGeometry args={[r, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- 窗戶牆（z=0）＋窗外校園 ---------------- */
const WINDOWS: [number, number][] = [
  [0.8, 3.2],
  [3.8, 6.2],
  [6.8, 9.2],
  [9.8, 12.2],
];
const WALL_H = 3.0;
const WIN_LO = 0.95;
const WIN_HI = 2.35;

function WindowWall({ reduced }: { reduced: boolean }) {
  const wall = toon("#f6eedd");
  const curtains = useRef<THREE.Group[]>([]);
  const rays = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    curtains.current.forEach((g, i) => g && (g.rotation.x = Math.sin(t * 1.1 + i) * 0.07));
    rays.current.forEach((m, i) => m && (m.opacity = 0.05 + Math.sin(t * 0.8 + i) * 0.02));
  });
  // 牆面：下段、上段與窗間柱
  const piers: [number, number][] = [[0, WINDOWS[0][0]]];
  for (let i = 0; i < WINDOWS.length - 1; i++) piers.push([WINDOWS[i][1], WINDOWS[i + 1][0]]);
  piers.push([WINDOWS[WINDOWS.length - 1][1], 13]);
  return (
    <group>
      <mesh material={wall} position={[6.5, WIN_LO / 2, -0.08]}>
        <boxGeometry args={[13, WIN_LO, 0.16]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[6.5, 0.35, 0.005]}>
        <boxGeometry args={[13, 0.7, 0.01]} />
      </mesh>
      <mesh material={wall} position={[6.5, (WIN_HI + WALL_H) / 2, -0.08]}>
        <boxGeometry args={[13, WALL_H - WIN_HI, 0.16]} />
      </mesh>
      {piers.map(([a, b], i) => (
        <mesh key={i} material={wall} position={[(a + b) / 2, (WIN_LO + WIN_HI) / 2, -0.08]}>
          <boxGeometry args={[b - a, WIN_HI - WIN_LO, 0.16]} />
        </mesh>
      ))}
      {WINDOWS.map(([a, b], i) => {
        const w = b - a;
        const cx = (a + b) / 2;
        const cy = (WIN_LO + WIN_HI) / 2;
        return (
          <group key={i}>
            {/* 窗框與玻璃 */}
            {[
              [cx, WIN_HI, w + 0.1, 0.07],
              [cx, WIN_LO, w + 0.1, 0.07],
              [cx, cy, 0.05, WIN_HI - WIN_LO],
              [a, cy, 0.06, WIN_HI - WIN_LO],
              [b, cy, 0.06, WIN_HI - WIN_LO],
            ].map(([x, y, fw, fh], k) => (
              <mesh key={k} material={toon("#fffaf0")} position={[x, y, -0.02]}>
                <boxGeometry args={[fw, fh, 0.08]} />
              </mesh>
            ))}
            <mesh material={flat("#dff2f7", 0.18)} position={[cx, cy, -0.04]}>
              <planeGeometry args={[w, WIN_HI - WIN_LO]} />
            </mesh>
            {/* 窗台 */}
            <mesh material={toon("#e7dcc6")} position={[cx, WIN_LO - 0.02, 0.08]}>
              <boxGeometry args={[w + 0.2, 0.04, 0.18]} />
            </mesh>
            {/* 窗簾（輕微擺動） */}
            {[a + 0.16, b - 0.16].map((x, k) => (
              <group key={k} position={[x, WIN_HI + 0.12, 0.14]} ref={(g) => void (g && (curtains.current[i * 2 + k] = g))}>
                <mesh material={toon("#f6c3b9")} position={[0, -0.75, 0]}>
                  <boxGeometry args={[0.34, 1.5, 0.03]} />
                </mesh>
              </group>
            ))}
            {/* 陽光 */}
            <mesh position={[cx + 0.5, 1.05, 1.2]} rotation={[-0.95, 0, 0]}>
              <planeGeometry args={[w, 2.6]} />
              <meshBasicMaterial
                ref={(m) => void (m && (rays.current[i] = m))}
                color="#fff3c4"
                transparent
                opacity={0.05}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh material={flat("#fff6d2", 0.3)} rotation={[-Math.PI / 2, 0, 0]} position={[cx + 0.6, 0.012, 2.3]}>
              <planeGeometry args={[w, 1.7]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** 窗外：天空、草地、樹與對面校舍 */
function Outside() {
  const sky = useTexture("sky-big", 4, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#8fcbe6");
    g.addColorStop(0.65, "#cfeaf2");
    g.addColorStop(1, "#eef6e4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  });
  return (
    <group>
      <mesh position={[6.5, 5, -14]}>
        <planeGeometry args={[80, 30]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      <mesh material={toon("#b7d79a")} rotation={[-Math.PI / 2, 0, 0]} position={[6.5, -0.6, -7]}>
        <planeGeometry args={[80, 14]} />
      </mesh>
      {/* 對面校舍 */}
      <mesh material={toon("#f3e3cc")} position={[6.5, 2.4, -10]}>
        <boxGeometry args={[30, 6, 2]} />
      </mesh>
      {[-6, -2, 2, 6, 10, 14, 18].map((x) =>
        [1.0, 3.0].map((y) => (
          <mesh key={`${x}-${y}`} material={flat("#bfdde8")} position={[x, y, -8.98]}>
            <planeGeometry args={[1.6, 0.9]} />
          </mesh>
        )),
      )}
      <mesh material={toon("#e98a7c")} position={[6.5, 5.5, -10]}>
        <boxGeometry args={[30.4, 0.3, 2.3]} />
      </mesh>
      {/* 樹 */}
      {[
        [0.5, -3.2, 1.3],
        [4.5, -4.2, 1.1],
        [8.8, -3.4, 1.4],
        [12.6, -4.4, 1.2],
        [-3, -4.6, 1.1],
        [16, -3.6, 1.3],
      ].map(([x, z, s], i) => (
        <group key={i} position={[x, -0.6, z]} scale={s}>
          <mesh material={toon("#a07a55")} position={[0, 1, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 2, 8]} />
          </mesh>
          <mesh material={toon(i % 2 ? "#8fc27f" : "#7fb88f")} position={[0, 2.4, 0]}>
            <sphereGeometry args={[1.0, 14, 10]} />
          </mesh>
          <mesh material={toon("#9ccd85")} position={[0.5, 2.1, 0.2]}>
            <sphereGeometry args={[0.7, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------------- 走廊牆（z=10）：前門、後門、高窗 ---------------- */
function CorridorWall() {
  const wall = toon("#f1e7d4");
  const doors: [number, number][] = [
    [0.4, 1.5],
    [11.4, 12.5],
  ];
  const DOOR_H = 2.1;
  const HI_LO = 1.65;
  const HI_HI = 2.45;
  return (
    <group>
      {/* 下段牆（門與門之間） */}
      <mesh material={wall} position={[(1.5 + 11.4) / 2, HI_LO / 2, 10.08]}>
        <boxGeometry args={[11.4 - 1.5, HI_LO, 0.16]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[(1.5 + 11.4) / 2, 0.35, 9.995]}>
        <boxGeometry args={[11.4 - 1.5, 0.7, 0.01]} />
      </mesh>
      {/* 門兩側 */}
      <mesh material={wall} position={[0.2, WALL_H / 2, 10.08]}>
        <boxGeometry args={[0.4, WALL_H, 0.16]} />
      </mesh>
      <mesh material={wall} position={[12.75, WALL_H / 2, 10.08]}>
        <boxGeometry args={[0.5, WALL_H, 0.16]} />
      </mesh>
      {/* 門上方 */}
      {doors.map(([a, b], i) => (
        <group key={i}>
          <mesh material={wall} position={[(a + b) / 2, (DOOR_H + WALL_H) / 2, 10.08]}>
            <boxGeometry args={[b - a, WALL_H - DOOR_H, 0.16]} />
          </mesh>
          {/* 拉門（半開） */}
          <mesh material={toon("#c99a6b")} position={[(a + b) / 2 + 0.3, DOOR_H / 2, 10.2]}>
            <boxGeometry args={[b - a, DOOR_H, 0.05]} />
          </mesh>
          <mesh material={flat("#e9f2f4")} position={[(a + b) / 2 + 0.3, 1.55, 10.17]}>
            <planeGeometry args={[(b - a) * 0.6, 0.6]} />
          </mesh>
        </group>
      ))}
      {/* 高窗之間與上方 */}
      <mesh material={wall} position={[(1.5 + 11.4) / 2, (HI_HI + WALL_H) / 2, 10.08]}>
        <boxGeometry args={[11.4 - 1.5, WALL_H - HI_HI, 0.16]} />
      </mesh>
      {[1.5, 4.0, 6.5, 9.0, 11.4].map((x, i) =>
        i < 4 ? (
          <mesh key={i} material={toon("#fffaf0")} position={[x + 1.25, (HI_LO + HI_HI) / 2, 10.04]}>
            <boxGeometry args={[0.06, HI_HI - HI_LO, 0.1]} />
          </mesh>
        ) : null,
      )}
      {/* 走廊（從高窗與門看出去） */}
      <mesh material={toon("#efe6d2")} position={[6.5, 1.5, 12.2]}>
        <boxGeometry args={[30, 3.2, 0.2]} />
      </mesh>
      <mesh material={toon("#d8cdb6")} rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.002, 11.1]}>
        <planeGeometry args={[30, 2.2]} />
      </mesh>
    </group>
  );
}

/* ---------------- 天花板：日光燈、吊扇 ---------------- */
function Ceiling({ reduced }: { reduced: boolean }) {
  const fans = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    if (reduced) return;
    fans.current.forEach((g) => g && (g.rotation.y += dt * 2.4));
  });
  return (
    <group>
      <mesh material={toon("#f7f3ea")} position={[6.5, WALL_H + 0.05, 5]}>
        <boxGeometry args={[13.2, 0.1, 10.2]} />
      </mesh>
      {[2.2, 5.2, 8.2, 11.2].map((x) =>
        [2.5, 5, 7.5].map((z) => (
          <group key={`${x}-${z}`} position={[x, WALL_H - 0.04, z]}>
            <mesh material={toon("#e8e4da")}>
              <boxGeometry args={[1.25, 0.05, 0.22]} />
            </mesh>
            <mesh material={flat("#fffdf3")} position={[0, -0.035, 0]}>
              <boxGeometry args={[1.18, 0.03, 0.08]} />
            </mesh>
          </group>
        )),
      )}
      {[
        [4.4, 5.0],
        [9.0, 5.0],
      ].map(([x, z], i) => (
        <group key={i} position={[x, WALL_H, z]}>
          <mesh material={toon("#d9d2c2")} position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
          </mesh>
          <group position={[0, -0.52, 0]} ref={(g) => void (g && (fans.current[i] = g))}>
            <mesh material={toon("#efe9dc")}>
              <cylinderGeometry args={[0.12, 0.1, 0.1, 14]} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} material={toon("#f3eee4")} rotation={[0, (k * Math.PI * 2) / 3, 0.06]} position={[Math.cos((k * Math.PI * 2) / 3) * 0.45, 0, -Math.sin((k * Math.PI * 2) / 3) * 0.45]}>
                <boxGeometry args={[0.75, 0.015, 0.14]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/* ---------------- 後牆（x=13）：置物櫃 ---------------- */
function Cubbies() {
  const colors = ["#9fd0c6", "#f6c3b9", "#f7edcf", "#c8d6ee"];
  return (
    <group position={[12.78, 0, 6.3]}>
      <mesh material={toon("#c99a6b")} position={[0, 0.48, 0]}>
        <boxGeometry args={[0.42, 0.96, 6.6]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) =>
        [0.25, 0.7].map((y, r) => (
          <mesh key={`${i}-${r}`} material={toon(colors[(i + r) % 4])} position={[-0.215, y, -3 + i * 0.6]}>
            <boxGeometry args={[0.02, 0.36, 0.5]} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** 下課時間的小道具：書包、球、紙飛機、地上的畫 */
function RecessDecor({ reduced }: { reduced: boolean }) {
  const ball = useRef<THREE.Mesh>(null);
  const plane = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    if (ball.current) {
      ball.current.position.y = 0.14 + Math.abs(Math.sin(t * 3)) * 0.35;
      ball.current.position.x = 9.9 + Math.sin(t * 0.7) * 0.6;
    }
    if (plane.current) {
      const k = (t * 0.25) % 1;
      plane.current.position.set(6 + k * 5, 2.0 - Math.sin(k * Math.PI) * 0.6, 3.6 - k * 1.5);
      plane.current.rotation.set(0, -0.5, Math.sin(t * 2) * 0.2);
    }
  });
  const bags: [number, number, string][] = [
    [12.78, 3.6, "#e98a7c"],
    [12.78, 4.3, "#65afa5"],
    [12.78, 5.0, "#d6b563"],
    [12.78, 5.7, "#8fa8d6"],
  ];
  return (
    <group>
      {bags.map(([x, z, c], i) => (
        <group key={i} position={[x, 1.13, z]}>
          <mesh material={toon(c)}>
            <boxGeometry args={[0.22, 0.34, 0.3]} />
          </mesh>
          <mesh material={toon("#fffaf0")} position={[-0.115, -0.05, 0]}>
            <boxGeometry args={[0.02, 0.14, 0.2]} />
          </mesh>
        </group>
      ))}
      <mesh ref={ball} material={toon("#fffdf6")} position={[9.9, 0.14, 4.0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
      </mesh>
      <group ref={plane}>
        <mesh material={toon("#fffaf0")} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.32, 3]} />
        </mesh>
      </group>
      <mesh material={toon("#f7edcf")} rotation={[-Math.PI / 2, 0, 0.3]} position={[8.2, 0.008, 4.6]}>
        <planeGeometry args={[0.5, 0.36]} />
      </mesh>
      <mesh material={toon("#c8d6ee")} rotation={[-Math.PI / 2, 0, -0.4]} position={[8.7, 0.009, 4.9]}>
        <planeGeometry args={[0.4, 0.3]} />
      </mesh>
    </group>
  );
}

function Room({ positions, messy, mode, classLabel, board, proposalCard, voteBoard, reduced }: {
  positions: Progress["positions"];
  messy?: boolean;
  mode: ClassroomProps["mode"];
  classLabel: string;
  board: ClassroomProps["board"];
  proposalCard: ClassroomProps["proposalCard"];
  voteBoard: ClassroomProps["voteBoard"];
  reduced: boolean;
}) {
  const fv = useFontsVersion();
  const grid = useTexture("floor", 64, 64, (ctx) => {
    ctx.fillStyle = "#ece4d3";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = ["#dcd2bd", "#f4ecdc", "#d9cdb5"][i % 3];
      ctx.fillRect((i * 23) % 64, (i * 41) % 64, 2, 2);
    }
    ctx.strokeStyle = "#d6cab3";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);
  });
  useMemo(() => {
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(13, 10);
    grid.magFilter = THREE.NearestFilter;
  }, [grid]);
  const center = (id: FurnitureId) => ({ x: 4 + positions[id].x + 0.5, z: positions[id].y + 0.5 });
  const sh = center("shelf");
  const mt = center("mat");
  const tb = center("table");
  const clockHand = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (clockHand.current && !reduced) clockHand.current.rotation.x = -st.clock.elapsedTime * 0.1;
  });
  return (
    <group>
      <Outside />
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.001, 5]}>
        <planeGeometry args={[13, 10]} />
        <meshToonMaterial map={grid} />
      </mesh>
      <mesh material={toon("#ead2ad")} position={[8, 0.02, 1.5]}>
        <boxGeometry args={[8, 0.04, 3]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} material={flat("#d6b563", 0.8)} rotation={[-Math.PI / 2, 0, 0]} position={[4.4 + i * 0.8, 0.006, 3.5]}>
          <planeGeometry args={[0.45, 0.05]} />
        </mesh>
      ))}
      {/* 前牆（黑板牆，x=0） */}
      <mesh material={toon("#f1e7d4")} position={[-0.08, WALL_H / 2, 5]}>
        <boxGeometry args={[0.16, WALL_H, 10.32]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[0.005, 0.35, 5]}>
        <boxGeometry args={[0.01, 0.7, 10]} />
      </mesh>
      {/* 後牆（x=13） */}
      <mesh material={toon("#f6eedd")} position={[13.08, WALL_H / 2, 5]}>
        <boxGeometry args={[0.16, WALL_H, 10.32]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[12.995, 0.35, 5]}>
        <boxGeometry args={[0.01, 0.7, 10]} />
      </mesh>
      <WindowWall reduced={reduced} />
      <CorridorWall />
      <Ceiling reduced={reduced} />
      <Cubbies />
      <Blackboard board={board} fv={fv} />
      <RulesBoard classLabel={classLabel} proposal={proposalCard} fv={fv} />
      {/* 作品展示（後牆） */}
      <group position={[12.98, 2.05, 8.3]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={toon("#fffaf0")}>
          <boxGeometry args={[2.3, 0.9, 0.03]} />
        </mesh>
        {[
          [-0.55, 0.2, "#9fd0c6"],
          [0.55, 0.2, "#f6c3b9"],
          [-0.55, -0.22, "#f7edcf"],
          [0.55, -0.22, "#c8d6ee"],
        ].map(([x, y, c], i) => (
          <mesh key={i} material={toon(c as string)} position={[x as number, y as number, 0.02]}>
            <boxGeometry args={[0.95, 0.36, 0.01]} />
          </mesh>
        ))}
      </group>
      {/* 三角旗（窗戶上方） */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} material={toon(["#e98a7c", "#65afa5", "#d6b563"][i % 3])} position={[1 + i * 0.75, 2.62 - Math.sin((i / 15) * Math.PI) * 0.1, 0.06]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.11, 0.22, 3]} />
        </mesh>
      ))}
      {/* 幹部工作區（前牆） */}
      <group position={[0.02, 1.45, 1.25]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={toon("#fffaf0")}>
          <boxGeometry args={[1.6, 0.8, 0.03]} />
        </mesh>
        {["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6", "#7fb88f"].map((c, i) => (
          <mesh key={c} material={toon(c)} position={[-0.6, 0.28 - i * 0.14, 0.02]}>
            <boxGeometry args={[0.2, 0.09, 0.01]} />
          </mesh>
        ))}
      </group>
      <mesh material={toon("#bfd8c6")} position={[0.22, 0.24, 1.3]}>
        <boxGeometry args={[0.42, 0.48, 1.6]} />
      </mesh>
      {/* 時鐘、國旗位置的班級標語板 */}
      <group position={[0.03, 2.5, 5]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={toon("#fffaf0")}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
        </mesh>
        <mesh ref={clockHand} material={flat("#e98a7c")} position={[0, 0.03, 0]}>
          <boxGeometry args={[0.02, 0.01, 0.26]} />
        </mesh>
      </group>
      {/* 課桌椅、講桌 */}
      {DESKS.map(([gx, gy], i) => (
        <Desk key={i} gx={gx} gy={gy} />
      ))}
      <group position={[1.58, 0, 5.05]}>
        {/* 講桌比小朋友矮，主席站在旁邊看得清楚 */}
        <mesh material={toon("#c99a6b")} position={[0, 0.4, 0]}>
          <boxGeometry args={[0.55, 0.8, 0.9]} />
        </mesh>
        <mesh material={toon("#d6b563")} position={[0.28, 0.42, 0]}>
          <boxGeometry args={[0.01, 0.4, 0.5]} />
        </mesh>
      </group>
      {mode === "meeting" && <Desk gx={1.0} gy={1.95} />}
      {voteBoard && <VoteBoard3D vote={voteBoard} fv={fv} />}
      {/* 閱讀角 */}
      <Shelf cx={sh.x} cz={sh.z} messy={messy} />
      <Mat cx={mt.x} cz={mt.z} />
      <Table cx={tb.x} cz={tb.z} />
      {mode === "menu" && <RecessDecor reduced={reduced} />}
      <Plant x={12.4} z={0.45} />
      <Plant x={0.45} z={9.5} s={0.9} />
      <mesh material={toon("#d6b563")} position={[12.2, 0.22, 2.4]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.36, 18, 12]} />
      </mesh>
    </group>
  );
}

/**
 * 環顧鏡頭：學生站在教室裡的固定位置，拖曳畫面＝轉頭看四周（左右可轉一圈、上下有限），
 * 雙指／滾輪只改變視角大小。鏡頭永遠在教室內，不會看到教室外殼。
 */
function CameraRig({ preset }: { preset: string }) {
  const { camera, size, gl } = useThree();
  const { reduced } = usePrefs();
  const p = PRESETS[preset] ?? PRESETS.front;
  const goalPos = useMemo(() => new THREE.Vector3(...p.pos), [p]);
  const baseDir = useMemo(() => new THREE.Vector3(...p.target).sub(new THREE.Vector3(...p.pos)).normalize(), [p]);
  const baseYaw = Math.atan2(baseDir.x, baseDir.z);
  const basePitch = Math.asin(baseDir.y);
  const look = useRef({ yaw: baseYaw, pitch: basePitch, offYaw: 0, offPitch: 0, zoom: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef(0);
  const aspect = size.width / Math.max(1, size.height);
  const baseFov = useMemo(() => {
    const hfov = (76 * Math.PI) / 180;
    const vfov = (2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180) / Math.PI;
    return Math.min(74, Math.max(44, vfov));
  }, [aspect]);

  // 換場景（主選單／班會）時，視線回到預設方向
  useEffect(() => {
    look.current.offYaw = 0;
    look.current.offPitch = 0;
    look.current.zoom = 0;
  }, [preset]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.size === 1) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      else drag.current = null;
    };
    const move = (e: PointerEvent) => {
      if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.size === 2) {
        const [a, b] = [...pinch.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist.current) look.current.zoom = Math.max(-16, Math.min(8, look.current.zoom - (d - pinchDist.current) * 0.05));
        pinchDist.current = d;
        return;
      }
      const g = drag.current;
      if (!g || g.id !== e.pointerId) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      g.x = e.clientX;
      g.y = e.clientY;
      look.current.offYaw -= dx * 0.0055;
      look.current.offPitch = Math.max(-0.55, Math.min(0.75, look.current.offPitch - dy * 0.0045));
    };
    const up = (e: PointerEvent) => {
      pinch.current.delete(e.pointerId);
      if (pinch.current.size < 2) pinchDist.current = 0;
      if (drag.current?.id === e.pointerId) drag.current = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      look.current.zoom = Math.max(-16, Math.min(8, look.current.zoom + e.deltaY * 0.02));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  const dir = useMemo(() => new THREE.Vector3(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const k = reduced ? 1 : 1 - Math.pow(0.015, dt);
    cam.position.lerp(goalPos, k);
    const L = look.current;
    const ty = baseYaw + L.offYaw;
    const tp = Math.max(-1.25, Math.min(0.5, basePitch + L.offPitch));
    // 角度以最短路徑補間
    L.yaw += Math.atan2(Math.sin(ty - L.yaw), Math.cos(ty - L.yaw)) * k;
    L.pitch += (tp - L.pitch) * k;
    dir.set(Math.sin(L.yaw) * Math.cos(L.pitch), Math.sin(L.pitch), Math.cos(L.yaw) * Math.cos(L.pitch));
    at.copy(cam.position).add(dir);
    cam.lookAt(at);
    const fov = baseFov + (p.zoom ?? 0) + L.zoom;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export default function Classroom3D(props: ClassroomProps) {
  const { prefs, reduced } = usePrefs();
  const preset = typeof props.camera === "string" ? props.camera : "front";
  const camPos = (PRESETS[preset] ?? PRESETS.front).pos;
  const classLabel = props.classLabel ?? "我們班";
  return (
    <div className="scene3d" role="group" aria-label={props.ariaLabel}>
      <Canvas
        dpr={prefs.lowPower ? 1 : [1, 1.75]}
        camera={{ fov: 60, position: camPos, near: 0.05, far: 120 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="always"
      >
        <color attach="background" args={["#cfeaf2"]} />
        <hemisphereLight args={["#fff8ea", "#c9b48f", 1.25]} />
        <directionalLight position={[6, 9, -8]} intensity={0.9} color="#fff2d8" />
        <directionalLight position={[2, 6, 12]} intensity={0.45} color="#fff8ee" />
        <ambientLight intensity={0.25} />
        <Room
          positions={props.positions}
          messy={props.messy}
          mode={props.mode}
          classLabel={classLabel}
          board={props.board}
          proposalCard={props.proposalCard}
          voteBoard={props.voteBoard}
          reduced={reduced}
        />
        {props.cast.map((c) => {
          // 第一人稱視角：不畫玩家自己（鏡頭就是玩家的眼睛）
          if (c.look === "player" && (preset === "front" || preset === "seat")) return null;
          const [x, z, seated] = remapSeat(c.gx, c.gy, c.pose);
          const facing = seated ? DESK_ROT : Math.atan2(camPos[0] - x, camPos[2] - z);
          return (
            <Character3D
              key={c.key}
              look={c.look}
              x={x}
              z={z}
              facing={facing}
              seated={seated}
              mood={c.mood}
              pose={c.pose}
              marker={c.marker}
              label={c.label}
              sash={c.sash}
              selected={c.selected}
              nameTag={c.nameTag}
              reduced={reduced}
              outline={!prefs.lowPower}
              onActivate={c.onActivate}
            />
          );
        })}
        <CameraRig preset={preset} />
      </Canvas>
    </div>
  );
}

export { SEATS };
