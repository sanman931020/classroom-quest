import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
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
const PRESETS: Record<string, { pos: V3; target: V3 }> = {
  front: { pos: [13.6, 8.4, 14.6], target: [5.0, 0.7, 5.0] },
  full: { pos: [14.5, 10, 16], target: [6, 0.5, 5] },
  menu: { pos: [11.2, 4.4, 9.6], target: [6.2, 1.0, 2.6] },
  corner: { pos: [12.8, 5.4, 11.6], target: [7.0, 0.9, 2.8] },
};
const DESKS: [number, number][] = [];
for (const gy of [5.4, 7.1, 8.8]) for (const gx of [4.3, 6.3, 8.3, 10.3]) DESKS.push([gx, gy]);
// 3D 座位：學生坐在課桌後方、面向鏡頭（讓表情與舉手清楚可見）
const CAM_DIR = (() => {
  const p = PRESETS.front;
  const dx = p.pos[0] - p.target[0];
  const dz = p.pos[2] - p.target[2];
  const l = Math.hypot(dx, dz);
  return [dx / l, dz / l] as const;
})();
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
    <group position={[8.0, 1.42, 0.02]}>
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
    <group position={[2.7, 0, 9.2]} rotation={[0, 0.75, 0]}>
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

/* ---------------- 窗戶與陽光 ---------------- */
function Windows({ reduced }: { reduced: boolean }) {
  const sky = useTexture("sky", 4, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "#a9d8ec");
    g.addColorStop(0.7, "#d7eef3");
    g.addColorStop(1, "#eef6e4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 64);
  });
  const curtains = useRef<THREE.Group[]>([]);
  const rays = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    curtains.current.forEach((g, i) => g && (g.rotation.x = Math.sin(t * 1.1 + i) * 0.06));
    rays.current.forEach((m, i) => m && (m.opacity = 0.055 + Math.sin(t * 0.8 + i) * 0.02));
  });
  return (
    <>
      {[
        [0.6, 2.9],
        [3.3, 5.6],
      ].map(([a, b], i) => {
        const w = b - a;
        const cx = (a + b) / 2;
        return (
          <group key={i}>
            <mesh material={toon("#fffaf0")} position={[cx, 1.6, 0.02]}>
              <boxGeometry args={[w + 0.16, 1.32, 0.05]} />
            </mesh>
            <mesh position={[cx, 1.6, 0.05]}>
              <planeGeometry args={[w, 1.18]} />
              <meshBasicMaterial map={sky} toneMapped={false} />
            </mesh>
            {[cx - w * 0.28, cx + w * 0.3].map((x, k) => (
              <mesh key={k} material={flat(k ? "#93c182" : "#a9cf95")} position={[x, 1.25 + k * 0.05, 0.055]}>
                <circleGeometry args={[0.32 - k * 0.06, 20]} />
              </mesh>
            ))}
            <mesh material={toon("#8a7354")} position={[cx, 1.6, 0.07]}>
              <boxGeometry args={[0.04, 1.18, 0.02]} />
            </mesh>
            <mesh material={toon("#8a7354")} position={[cx, 1.6, 0.07]}>
              <boxGeometry args={[w, 0.035, 0.02]} />
            </mesh>
            <mesh material={toon("#e7dcc6")} position={[cx, 0.97, 0.1]}>
              <boxGeometry args={[w + 0.2, 0.04, 0.16]} />
            </mesh>
            {[a + 0.12, b - 0.12].map((x, k) => (
              <group key={k} position={[x, 2.28, 0.12]} ref={(g) => void (g && (curtains.current[i * 2 + k] = g))}>
                <mesh material={toon("#f6c3b9")} position={[0, -0.62, 0]}>
                  <boxGeometry args={[0.32, 1.26, 0.03]} />
                </mesh>
              </group>
            ))}
            <mesh position={[cx + 0.4, 0.95, 1.1]} rotation={[-0.95, 0, 0]}>
              <planeGeometry args={[w, 2.3]} />
              <meshBasicMaterial
                ref={(m) => void (m && (rays.current[i] = m))}
                color="#fff3c4"
                transparent
                opacity={0.06}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh material={flat("#fff6d2", 0.35)} rotation={[-Math.PI / 2, 0, 0]} position={[cx + 0.6, 0.012, 2.2]}>
              <planeGeometry args={[w, 1.6]} />
            </mesh>
          </group>
        );
      })}
    </>
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
      {/* 底座與地板 */}
      <mesh material={toon("#c9b48f")} position={[6.5, -0.2, 5]}>
        <boxGeometry args={[13.1, 0.4, 10.1]} />
      </mesh>
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
      {/* 牆 */}
      <mesh material={toon("#f6eedd")} position={[6.5, 1.3, -0.08]}>
        <boxGeometry args={[13.16, 2.6, 0.16]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[6.5, 0.35, 0.005]}>
        <boxGeometry args={[13, 0.7, 0.01]} />
      </mesh>
      <mesh material={toon("#f1e7d4")} position={[-0.08, 1.3, 5]}>
        <boxGeometry args={[0.16, 2.6, 10]} />
      </mesh>
      <mesh material={toon("#cfe2d4")} position={[0.005, 0.35, 5]}>
        <boxGeometry args={[0.01, 0.7, 10]} />
      </mesh>
      <mesh material={toon("#fbf6ea")} position={[6.5, 2.62, -0.08]}>
        <boxGeometry args={[13.2, 0.05, 0.2]} />
      </mesh>
      <mesh material={toon("#fbf6ea")} position={[-0.08, 2.62, 5]}>
        <boxGeometry args={[0.2, 0.05, 10]} />
      </mesh>
      <Windows reduced={reduced} />
      <Blackboard board={board} fv={fv} />
      <RulesBoard classLabel={classLabel} proposal={proposalCard} fv={fv} />
      {/* 作品展示 */}
      <group position={[11.3, 1.45, 0.02]}>
        <mesh material={toon("#fffaf0")}>
          <boxGeometry args={[2.3, 1.15, 0.03]} />
        </mesh>
        {[
          [-0.55, 0.25, "#9fd0c6"],
          [0.55, 0.25, "#f6c3b9"],
          [-0.55, -0.27, "#f7edcf"],
          [0.55, -0.27, "#c8d6ee"],
        ].map(([x, y, c], i) => (
          <mesh key={i} material={toon(c as string)} position={[x as number, y as number, 0.02]}>
            <boxGeometry args={[0.95, 0.44, 0.01]} />
          </mesh>
        ))}
      </group>
      {/* 三角旗 */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={toon(["#e98a7c", "#65afa5", "#d6b563"][i % 3])} position={[4.5 + i * 0.68, 2.36 - Math.sin((i / 11) * Math.PI) * 0.1, 0.04]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.12, 0.24, 3]} />
        </mesh>
      ))}
      {/* 幹部工作區 */}
      <group position={[0.02, 1.35, 1.25]} rotation={[0, Math.PI / 2, 0]}>
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
      {/* 時鐘 */}
      <group position={[0.03, 2.25, 4.9]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={toon("#fffaf0")}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
        </mesh>
        <mesh ref={clockHand} material={flat("#e98a7c")} position={[0, 0.03, 0]}>
          <boxGeometry args={[0.02, 0.01, 0.24]} />
        </mesh>
      </group>
      {/* 門 */}
      <mesh material={toon("#c99a6b")} position={[0.03, 0.78, 9.1]}>
        <boxGeometry args={[0.05, 1.56, 1.2]} />
      </mesh>
      <mesh material={flat("#bfe1ef")} position={[0.06, 1.2, 9.1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.45]} />
      </mesh>
      {/* 課桌椅、講桌 */}
      {DESKS.map(([gx, gy], i) => (
        <Desk key={i} gx={gx} gy={gy} />
      ))}
      <group position={[1.58, 0, 5.05]}>
        <mesh material={toon("#c99a6b")} position={[0, 0.48, 0]}>
          <boxGeometry args={[0.55, 0.96, 0.9]} />
        </mesh>
        <mesh material={toon("#d6b563")} position={[0.28, 0.5, 0]}>
          <boxGeometry args={[0.01, 0.4, 0.5]} />
        </mesh>
      </group>
      {mode === "meeting" && <Desk gx={1.0} gy={1.95} />}
      {voteBoard && <VoteBoard3D vote={voteBoard} fv={fv} />}
      {/* 閱讀角 */}
      <Shelf cx={sh.x} cz={sh.z} messy={messy} />
      <Mat cx={mt.x} cz={mt.z} />
      <Table cx={tb.x} cz={tb.z} />
      <Plant x={12.55} z={0.45} />
      <Plant x={0.45} z={9.85} s={0.9} />
      <mesh material={toon("#d6b563")} position={[12.5, 0.22, 2.4]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.36, 18, 12]} />
      </mesh>
    </group>
  );
}

function CameraRig({ preset }: { preset: string }) {
  const { camera, size } = useThree();
  const ctrl = useRef<OrbitImpl | null>(null);
  const { reduced } = usePrefs();
  const p = PRESETS[preset] ?? PRESETS.front;
  const anim = useRef(true);
  // 依畫面比例調整距離：場景區越窄（如 4:3 平板加上右側面板），鏡頭越後退，確保整間教室入鏡
  const aspect = size.width / Math.max(1, size.height);
  const factor = Math.min(1.9, Math.max(1, 1.5 / aspect));
  const goalPos = useMemo(() => {
    const t = new THREE.Vector3(...p.target);
    return new THREE.Vector3(...p.pos).sub(t).multiplyScalar(factor).add(t);
  }, [p, factor]);
  const goalTarget = useMemo(() => new THREE.Vector3(...p.target), [p]);
  const az = Math.atan2(p.pos[0] - p.target[0], p.pos[2] - p.target[2]);
  useEffect(() => {
    anim.current = true;
  }, [preset, factor]);
  useFrame((_, dt) => {
    const c = ctrl.current;
    if (!c || !anim.current) return;
    const k = reduced ? 1 : 1 - Math.pow(0.02, dt);
    camera.position.lerp(goalPos, k);
    c.target.lerp(goalTarget, k);
    c.update();
    if (camera.position.distanceTo(goalPos) < 0.02) anim.current = false;
  });
  return (
    <OrbitControls
      ref={ctrl as never}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={7}
      maxDistance={36}
      minPolarAngle={0.45}
      maxPolarAngle={1.2}
      minAzimuthAngle={az - 0.55}
      maxAzimuthAngle={az + 0.55}
      onStart={() => (anim.current = false)}
    />
  );
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
        camera={{ fov: 32, position: camPos, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="always"
      >
        <color attach="background" args={["#f3ead8"]} />
        <fog attach="fog" args={["#f3ead8", 28, 55]} />
        <hemisphereLight args={["#fff8ea", "#c9b48f", 1.15]} />
        <directionalLight position={[8, 12, 9]} intensity={1.25} color="#fff2d8" />
        <directionalLight position={[3, 6, -6]} intensity={0.35} color="#d8ecff" />
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
