/**
 * 2.5D 等角投影工具。
 * 世界座標 (gx, gy, h)：gx 往右下、gy 往左下，h 為離地高度（螢幕單位）。
 * 邏輯格座標（Progress.positions，x0–7、y0–3）只在 cornerToWorld / worldToCorner 轉換，
 * 不把像素寫入遊戲狀態。
 */
export const TW = 100;
export const TH = 50;

export type P3 = [number, number, number?];

export function iso(gx: number, gy: number, h = 0) {
  return { x: ((gx - gy) * TW) / 2, y: ((gx + gy) * TH) / 2 - h };
}

export function pts(list: P3[]) {
  return list
    .map(([gx, gy, h]) => {
      const p = iso(gx, gy, h ?? 0);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

/** 螢幕(世界SVG)座標 → 地面格座標（h=0） */
export function unIso(x: number, y: number) {
  const a = x / (TW / 2);
  const b = y / (TH / 2);
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

/** 閱讀角在教室中的區域：gx 4–12、gy 0–4，對應邏輯 8×4 格 */
export const CORNER = { gx0: 4, gy0: 0, cols: 8, rows: 4 };

export function cornerCenter(x: number, y: number) {
  return { gx: CORNER.gx0 + x + 0.5, gy: CORNER.gy0 + y + 0.5 };
}

/** 世界地面座標 → 邏輯格（含小數，交給 engine.place 四捨五入吸附） */
export function worldToCorner(gx: number, gy: number) {
  return { x: gx - CORNER.gx0 - 0.5, y: gy - CORNER.gy0 - 0.5 };
}

/** 將 client 座標轉為 SVG 使用者座標 */
export function clientToSvg(el: SVGGraphicsElement, cx: number, cy: number) {
  const svg = el.ownerSVGElement ?? (el as unknown as SVGSVGElement);
  const m = el.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = svg.createSVGPoint();
  p.x = cx;
  p.y = cy;
  const r = p.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}

/** 等角盒子三個可見面的多邊形字串 */
export function boxFaces(
  gx: number,
  gy: number,
  w: number,
  d: number,
  h: number,
  z = 0,
) {
  const x1 = gx + w;
  const y1 = gy + d;
  return {
    top: pts([
      [gx, gy, z + h],
      [x1, gy, z + h],
      [x1, y1, z + h],
      [gx, y1, z + h],
    ]),
    left: pts([
      [gx, y1, z],
      [x1, y1, z],
      [x1, y1, z + h],
      [gx, y1, z + h],
    ]),
    right: pts([
      [x1, gy, z],
      [x1, y1, z],
      [x1, y1, z + h],
      [x1, gy, z + h],
    ]),
  };
}

/** 左牆（gx=0）平面上的文字變換：沿牆面方向傾斜 */
export function leftWallMatrix(gy: number, h: number) {
  const p = iso(0, gy, h);
  return `matrix(0.894,-0.447,0,1,${p.x.toFixed(1)},${p.y.toFixed(1)})`;
}
/** 右牆（gy=0）平面上的文字變換 */
export function rightWallMatrix(gx: number, h: number) {
  const p = iso(gx, 0, h);
  return `matrix(0.894,0.447,0,1,${p.x.toFixed(1)},${p.y.toFixed(1)})`;
}

export type ViewBox = { x: number; y: number; w: number; h: number };
export const vb = (v: ViewBox) => `${v.x} ${v.y} ${v.w} ${v.h}`;
