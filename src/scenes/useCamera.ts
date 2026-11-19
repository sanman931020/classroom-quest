import { useEffect, useRef, useState } from "react";
import type { ViewBox } from "../art/iso";
import { usePrefs } from "../ui/prefs";

/** 以 viewBox 補間實作場景鏡頭縮放／平移；低動態時直接切換。 */
export function useCamera(target: ViewBox) {
  const { reduced } = usePrefs();
  const [view, setView] = useState(target);
  const [moving, setMoving] = useState(false);
  const cur = useRef(target);
  const key = `${target.x},${target.y},${target.w},${target.h}`;
  useEffect(() => {
    const from = cur.current;
    const to = target;
    if (reduced || (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h)) {
      cur.current = to;
      setView(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 650;
    setMoving(true);
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const k = ease(t);
      const v = {
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
        w: from.w + (to.w - from.w) * k,
        h: from.h + (to.h - from.h) * k,
      };
      cur.current = v;
      setView(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else setMoving(false);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setMoving(false);
    };
    // 依 key（數值內容）而非物件參考觸發補間
  }, [key, reduced]);
  return { view, moving };
}
