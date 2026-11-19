import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import { Classroom, type ClassroomProps } from "../scenes/Classroom";
import { usePrefs } from "../ui/prefs";

/**
 * 場景切換器：預設使用 3D 教室；省電模式、使用者選擇平面模式、
 * 裝置不支援 WebGL 或 3D 載入失敗時，自動改用 2.5D SVG 教室（功能相同）。
 */
const Classroom3D = lazy(() => import("./Classroom3D"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MeetingScene(props: ClassroomProps) {
  const { prefs } = usePrefs();
  const [webgl] = useState(hasWebGL);
  const flat = <Classroom {...props} />;
  if (prefs.lowPower || prefs.view === "2d" || !webgl) return flat;
  return (
    <Fallback fallback={flat}>
      <Suspense fallback={<div className="scene-loading">教室準備中…</div>}>
        <Classroom3D {...props} />
      </Suspense>
    </Fallback>
  );
}
