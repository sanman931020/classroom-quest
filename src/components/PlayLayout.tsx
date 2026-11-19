/** 活動畫面的共用版型：左側 2.5D 場景、右側任務面板（分頁＋內容＋固定操作列）。 */
export function PlayLayout({
  scene,
  sceneOverlay,
  tabs,
  children,
  footer,
  label,
}: {
  scene: React.ReactNode;
  sceneOverlay?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="play">
      <div className="scene-wrap">
        {scene}
        <div className="scene-paper" aria-hidden="true" />
        {sceneOverlay}
      </div>
      <aside className="mission" aria-label={label}>
        {tabs}
        <div className="mission-body">{children}</div>
        {footer && <div className="mission-foot">{footer}</div>}
      </aside>
    </div>
  );
}
