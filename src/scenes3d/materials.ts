import * as THREE from "three";

/**
 * 3D 繪本風格材質：三階卡通光影（MeshToonMaterial + 漸層貼圖），
 * 以顏色快取共用，降低平板記憶體與 draw call 設定成本。
 */
let grad: THREE.DataTexture | null = null;
export function gradientMap() {
  if (!grad) {
    const d = new Uint8Array([110, 190, 255]);
    grad = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    grad.minFilter = THREE.NearestFilter;
    grad.magFilter = THREE.NearestFilter;
    grad.generateMipmaps = false;
    grad.needsUpdate = true;
  }
  return grad;
}

const cache = new Map<string, THREE.Material>();
export function toon(color: string, opts: { transparent?: boolean; opacity?: number; emissive?: string } = {}) {
  const key = `${color}|${opts.opacity ?? 1}|${opts.emissive ?? ""}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: gradientMap(),
      transparent: !!opts.transparent || (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
      emissiveIntensity: opts.emissive ? 0.35 : 0,
    });
    cache.set(key, m);
  }
  return m;
}

const basic = new Map<string, THREE.Material>();
export function flat(color: string, opacity = 1) {
  const key = `${color}|${opacity}`;
  let m = basic.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    basic.set(key, m);
  }
  return m;
}

/** 以 2D Canvas 繪製文字貼圖（黑板、布告欄、表決板）：文字由程式渲染，可修改。 */
export const CANVAS_FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
