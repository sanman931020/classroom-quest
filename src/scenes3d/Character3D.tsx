import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Outlines } from "@react-three/drei";
import * as THREE from "three";
import { paletteOf, type Look, type Marker, type Mood, type Pose } from "../art/Character";
import { flat, toon } from "./materials";
import { Icon } from "../components/icons";

/**
 * 3D 角色（以基本幾何體組成的低多邊形繪本角色）。
 * 與 2D 版共用配色與 mood／pose 定義：待機、開心、疑惑、擔心、思考、說話、舉手、揮手、閱讀、坐下。
 * 眨眼、呼吸、說話嘴型、揮手、移動補間在 useFrame 中執行；低動態時停用循環動畫。
 */
const OUT = "#4a3a30";
function markIcon(marker: Marker, mood: Mood) {
  if (marker === "check") return <Icon name="check" size={18} />;
  if (marker === "hand") return <Icon name="hand" size={18} />;
  if (marker === "idea") return <Icon name="bulb" size={18} />;
  if (marker === "talk") return <span className="dots">…</span>;
  if (marker === "new") return <b>!</b>;
  if (mood === "confused") return <b>?</b>;
  if (mood === "worried") return <Icon name="faceSad" size={18} />;
  return <span className="dots">…</span>;
}

export interface Character3DProps {
  look: Look;
  x: number;
  z: number;
  facing: number;
  mood?: Mood;
  pose?: Pose;
  marker?: Marker;
  label?: string;
  sash?: string;
  selected?: boolean;
  dim?: boolean;
  nameTag?: string;
  /** 坐在座位上（可同時舉手） */
  seated?: boolean;
  reduced: boolean;
  outline: boolean;
  onActivate?: () => void;
}

export function Character3D({
  look,
  x,
  z,
  facing,
  mood = "idle",
  pose = "stand",
  marker = null,
  label,
  sash,
  selected,
  nameTag,
  seated,
  reduced,
  outline,
  onActivate,
}: Character3DProps) {
  const pal = paletteOf(look);
  const tall = !!pal.tall;
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const seed = useMemo(() => (look.charCodeAt(0) * 13 + look.length * 7) % 10, [look]);
  const sit = pose === "sit" || !!seated;

  // 尺寸（學生約 1:3、老師約 1:4 頭身）
  const legH = tall ? 0.66 : 0.4;
  const bodyH = tall ? 0.46 : 0.34;
  const headR = 0.19;
  const shoulderY = legH + bodyH - 0.04;
  const headY = legH + bodyH + headR - 0.02;
  const armLen = tall ? 0.44 : 0.32;

  const target = useMemo(() => new THREE.Vector3(x, 0, z), [x, z]);
  const armTarget: [number, number, number, number] = useMemo(() => {
    // [左臂 z 旋轉, 右臂 z 旋轉, 左臂 x 旋轉, 右臂 x 旋轉]
    switch (pose) {
      case "raise":
        return [-0.15, 2.85, 0, 0];
      case "wave":
        return [-0.15, 2.4, 0, 0];
      case "read":
        return [0.35, -0.35, -1.0, -1.0];
      case "point":
        return [-0.15, 0.2, 0, -1.45];
      case "sit":
        return [0.25, -0.25, -0.9, -0.9];
      default:
        return [-0.12, 0.12, 0, 0];
    }
  }, [pose]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed;
    const g = root.current;
    if (!g) return;
    // 位置補間（進出場、起立發言）
    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt);
    g.position.lerp(target, k);
    let dy = g.rotation.y;
    const diff = Math.atan2(Math.sin(facing - dy), Math.cos(facing - dy));
    dy += diff * k;
    g.rotation.y = dy;
    if (body.current) {
      const breathe = reduced ? 0 : Math.sin(t * 1.8) * 0.006;
      const hop = !reduced && mood === "happy" ? Math.max(0, Math.sin(t * 4)) * 0.05 : 0;
      body.current.position.y = (sit ? -0.03 : 0) + breathe + hop;
    }
    if (head.current) {
      head.current.rotation.z = mood === "thinking" ? 0.18 : mood === "confused" ? -0.16 : !reduced && mood === "talking" ? Math.sin(t * 6) * 0.05 : 0;
      head.current.rotation.x = mood === "worried" ? 0.12 : 0;
    }
    if (eyes.current && !reduced) {
      const b = (t % 4.3) > 4.15 ? 0.15 : 1;
      eyes.current.scale.y = b;
    }
    if (mouth.current) {
      const s = mood === "talking" && !reduced ? 0.45 + Math.abs(Math.sin(t * 11)) * 0.7 : 1;
      mouth.current.scale.y = s;
    }
    const wave = pose === "wave" && !reduced ? Math.sin(t * 7) * 0.35 : 0;
    if (armL.current) {
      armL.current.rotation.z += (armTarget[0] - armL.current.rotation.z) * Math.min(1, dt * 10);
      armL.current.rotation.x += (armTarget[2] - armL.current.rotation.x) * Math.min(1, dt * 10);
      if (mood === "thinking" && pose === "stand") armL.current.rotation.x += (-2.3 - armL.current.rotation.x) * Math.min(1, dt * 8);
    }
    if (armR.current) {
      armR.current.rotation.z += (armTarget[1] + wave - armR.current.rotation.z) * Math.min(1, dt * 10);
      armR.current.rotation.x += (armTarget[3] - armR.current.rotation.x) * Math.min(1, dt * 10);
    }
  });

  const skin = toon(pal.skin);
  const shirt = toon(pal.shirt);
  const hair = toon(pal.hair);
  const bottom = toon(pal.bottom);
  const dark = flat("#2f2622");
  const ol = (th = 0.012) => (outline ? <Outlines thickness={th} color={OUT} /> : null);

  const hairNode = (() => {
    const cap = (
      <mesh material={hair} position={[0, 0.02, -0.01]} rotation={[-0.45, 0, 0]}>
        <sphereGeometry args={[headR * 1.08, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
        {ol()}
      </mesh>
    );
    switch (look) {
      case "anan":
        return (
          <>
            <mesh material={hair} position={[0, -0.01, -0.02]} rotation={[-0.75, 0, 0]}>
              <sphereGeometry args={[headR * 1.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
              {ol()}
            </mesh>
            {/* 髮夾 */}
            <mesh material={toon(pal.accent)} position={[0.12, 0.12, 0.11]} rotation={[0, 0, 0.6]}>
              <boxGeometry args={[0.09, 0.035, 0.03]} />
            </mesh>
            <mesh material={toon("#f6c3b9")} position={[0.085, 0.1, 0.125]}>
              <sphereGeometry args={[0.025, 10, 8]} />
            </mesh>
          </>
        );
      case "mi":
        return (
          <>
            {cap}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.17, -0.06, -0.04]}>
                {[0, 1, 2, 3].map((i) => (
                  <mesh key={i} material={hair} position={[s * 0.01 * i, -i * 0.065, 0]}>
                    <sphereGeometry args={[0.045 - i * 0.004, 10, 8]} />
                  </mesh>
                ))}
                <mesh material={toon(pal.accent)} position={[s * 0.03, -0.27, 0]}>
                  <sphereGeometry args={[0.026, 10, 8]} />
                </mesh>
              </group>
            ))}
          </>
        );
      case "hao":
        return (
          <>
            {cap}
            {[
              [0, 0.21, 0, 0],
              [0.09, 0.19, 0.03, -0.5],
              [-0.09, 0.19, 0.03, 0.5],
              [0.05, 0.19, -0.09, -0.3],
              [-0.06, 0.19, -0.08, 0.35],
              [0.0, 0.17, 0.1, 0],
            ].map(([px, py, pz, rz], i) => (
              <mesh key={i} material={hair} position={[px, py, pz]} rotation={[pz * 3, 0, rz]}>
                <coneGeometry args={[0.05, 0.12, 6]} />
              </mesh>
            ))}
          </>
        );
      case "teacher":
        return (
          <>
            <mesh material={hair} position={[0, 0, -0.02]} rotation={[-0.7, 0, 0]}>
              <sphereGeometry args={[headR * 1.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              {ol()}
            </mesh>
            <mesh material={hair} position={[0, -0.14, -0.08]}>
              <boxGeometry args={[0.38, 0.26, 0.16]} />
            </mesh>
          </>
        );
      default:
        return cap;
    }
  })();

  const eyeY = 0.01;
  const ez = headR * 0.93;
  const face = (
    <group>
      {mood === "happy" ? (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} material={dark} position={[s * 0.07, eyeY, ez]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.025, 0.008, 6, 12, Math.PI]} />
            </mesh>
          ))}
        </>
      ) : (
        <group ref={eyes} position={[0, eyeY, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={dark} position={[s * 0.07 + (mood === "thinking" ? 0.012 : 0), mood === "thinking" ? 0.012 : 0, ez]} scale={[1, 1.3, 0.5]}>
              <sphereGeometry args={[0.024, 10, 8]} />
            </mesh>
          ))}
        </group>
      )}
      {/* 眉毛 */}
      {[-1, 1].map((s) => {
        const tilt = mood === "worried" ? s * -0.35 : mood === "confused" ? (s > 0 ? 0.35 : 0) : mood === "happy" ? s * 0.1 : 0;
        const lift = mood === "confused" && s > 0 ? 0.015 : 0;
        return (
          <mesh key={s} material={toon(pal.hairShade)} position={[s * 0.07, 0.075 + lift, ez - 0.01]} rotation={[0, 0, tilt]}>
            <boxGeometry args={[0.06, 0.012, 0.01]} />
          </mesh>
        );
      })}
      {/* 嘴 */}
      {mood === "talking" ? (
        <mesh ref={mouth} material={flat("#c4574d")} position={[0, -0.075, ez]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[0.03, 12, 8]} />
        </mesh>
      ) : mood === "happy" ? (
        <mesh material={flat("#c4574d")} position={[0, -0.06, ez]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.04, 16, 0, Math.PI]} />
        </mesh>
      ) : mood === "worried" ? (
        <mesh material={dark} position={[0, -0.09, ez]}>
          <torusGeometry args={[0.03, 0.007, 6, 12, Math.PI]} />
        </mesh>
      ) : mood === "thinking" || mood === "confused" ? (
        <mesh material={dark} position={[0.02, -0.075, ez]} rotation={[0, 0, mood === "confused" ? 0.3 : 0]}>
          <boxGeometry args={[0.05, 0.01, 0.01]} />
        </mesh>
      ) : (
        <mesh material={dark} position={[0, -0.06, ez]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.03, 0.007, 6, 12, Math.PI]} />
        </mesh>
      )}
      {/* 腮紅 */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={flat("#f2a493", 0.6)} position={[s * 0.115, -0.04, ez - 0.03]} scale={[1, 0.6, 0.3]}>
          <sphereGeometry args={[0.03, 10, 8]} />
        </mesh>
      ))}
      {look === "zhe" && (
        <group position={[0, eyeY, ez + 0.01]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={flat("#3a3330")} position={[s * 0.07, 0, 0]}>
              <torusGeometry args={[0.045, 0.008, 8, 20]} />
            </mesh>
          ))}
          <mesh material={flat("#3a3330")}>
            <boxGeometry args={[0.05, 0.008, 0.008]} />
          </mesh>
        </group>
      )}
    </group>
  );

  const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[side * 0.16, shoulderY, 0]}>
      <mesh material={shirt} position={[0, -0.06, 0]}>
        <capsuleGeometry args={[0.05, 0.06, 4, 8]} />
      </mesh>
      <mesh material={skin} position={[0, -armLen * 0.6, 0]}>
        <capsuleGeometry args={[0.038, armLen * 0.55, 4, 8]} />
      </mesh>
      <mesh material={skin} position={[0, -armLen, 0]}>
        <sphereGeometry args={[0.048, 10, 8]} />
      </mesh>
    </group>
  );

  const markerY = (sit ? -0.03 : 0) + headY + 0.36;
  return (
    <group ref={root} position={[x, 0, z]} rotation={[0, facing, 0]}>
      {/* 影子 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={flat("#3b2c1c", 0.16)}>
        <circleGeometry args={[0.26, 20]} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} material={flat("#f0c95b", 0.85)}>
          <ringGeometry args={[0.3, 0.37, 28]} />
        </mesh>
      )}
      <group
        ref={body}
        onClick={
          onActivate
            ? (e) => {
                e.stopPropagation();
                // 拖曳轉頭時不觸發點擊
                if (e.delta > 8) return;
                onActivate();
              }
            : undefined
        }
        onPointerOver={onActivate ? () => (document.body.style.cursor = "pointer") : undefined}
        onPointerOut={onActivate ? () => (document.body.style.cursor = "") : undefined}
      >
        {/* 腿 */}
        <group rotation={[sit ? -Math.PI / 2 : 0, 0, 0]} position={[0, sit ? legH - 0.02 : 0, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.075, sit ? -legH + 0.02 : 0, 0]}>
              <mesh material={skin} position={[0, legH * 0.55, 0]}>
                <capsuleGeometry args={[0.045, legH * 0.6, 4, 8]} />
              </mesh>
              <mesh material={toon("#fbfaf6")} position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.048, 0.048, 0.1, 10]} />
              </mesh>
              <mesh material={toon("#5a4a42")} position={[0, 0.035, 0.03]} scale={[1, 0.7, 1.4]}>
                <sphereGeometry args={[0.06, 10, 8]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* 下身 */}
        {pal.girl ? (
          <mesh material={bottom} position={[0, legH + 0.02, 0]}>
            <cylinderGeometry args={[0.14, tall ? 0.2 : 0.19, tall ? 0.36 : 0.18, 16]} />
            {ol(0.01)}
          </mesh>
        ) : (
          <mesh material={bottom} position={[0, legH + 0.02, 0]}>
            <cylinderGeometry args={[0.15, 0.16, 0.16, 16]} />
          </mesh>
        )}
        {/* 上衣 */}
        <mesh material={shirt} position={[0, legH + bodyH / 2 + 0.03, 0]}>
          <capsuleGeometry args={[0.145, bodyH - 0.12, 4, 16]} />
          {ol()}
        </mesh>
        {look === "teacher" ? (
          [-1, 1].map((s) => (
            <mesh key={s} material={toon(pal.accent)} position={[s * 0.1, legH + bodyH / 2 + 0.03, 0.05]} rotation={[0, s * 0.4, 0]}>
              <boxGeometry args={[0.07, bodyH, 0.18]} />
            </mesh>
          ))
        ) : (
          <>
            <mesh material={toon(pal.accent)} position={[0, shoulderY - 0.04, 0.13]} rotation={[0.2, 0, Math.PI]}>
              <coneGeometry args={[0.05, 0.09, 3]} />
            </mesh>
            <mesh material={toon("#fffdf6")} position={[0.07, shoulderY - 0.1, 0.14]}>
              <boxGeometry args={[0.07, 0.04, 0.01]} />
            </mesh>
          </>
        )}
        {sash && (
          <mesh material={toon(sash)} position={[0, legH + bodyH / 2 + 0.04, 0]} rotation={[0, 0, -0.75]}>
            <torusGeometry args={[0.16, 0.025, 6, 20]} />
          </mesh>
        )}
        {arm(-1, armL)}
        {arm(1, armR)}
        {pose === "read" && (
          <group position={[0, shoulderY - 0.2, 0.2]} rotation={[-0.6, 0, 0]}>
            <mesh material={toon("#e98a7c")}>
              <boxGeometry args={[0.22, 0.15, 0.02]} />
            </mesh>
            <mesh material={toon("#fffaf0")} position={[0, 0, 0.013]}>
              <boxGeometry args={[0.2, 0.13, 0.01]} />
            </mesh>
          </group>
        )}
        {/* 頭 */}
        <group ref={head} position={[0, headY, 0]}>
          <mesh material={skin}>
            <sphereGeometry args={[headR, 24, 18]} />
            {ol()}
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={skin} position={[s * headR, -0.01, 0]}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
          ))}
          {face}
          {hairNode}
        </group>
      </group>
      {(marker || nameTag || onActivate || mood === "confused" || mood === "worried" || mood === "thinking") && (
        <Html position={[0, markerY, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: onActivate ? "auto" : "none" }}>
          <div className="tag3d">
            {(marker || mood === "confused" || mood === "worried" || mood === "thinking") &&
              (onActivate ? (
                <button className={`marker3d m-${marker ?? mood}`} aria-label={label} onClick={onActivate}>
                  {markIcon(marker, mood)}
                </button>
              ) : (
                <span className={`marker3d m-${marker ?? mood}`} aria-hidden="true">
                  {markIcon(marker, mood)}
                </span>
              ))}
            {!marker && onActivate && mood !== "confused" && mood !== "worried" && mood !== "thinking" && (
              <button className="marker3d m-ghost" aria-label={label} onClick={onActivate}>
                <Icon name="tap" size={18} />
              </button>
            )}
            {nameTag && <span className={`name3d ${look === "player" ? "is-me" : ""}`}>{nameTag}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
