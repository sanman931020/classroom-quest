/** 場景共用 SVG 定義：水彩邊緣、紙雕陰影、光線漸層、紙紋。 */
export function SvgDefs() {
  return (
    <defs>
      {/* 水彩手繪邊緣：輕微位移讓直線不死板 */}
      <filter id="wc-edge" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* 卡紙層次陰影 */}
      <filter id="paper-lift" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#5a4630" floodOpacity="0.24" />
      </filter>
      <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="g-wall-left" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6eedd" />
        <stop offset="1" stopColor="#ece0c6" />
      </linearGradient>
      <linearGradient id="g-wall-right" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf4e5" />
        <stop offset="1" stopColor="#f1e6cf" />
      </linearGradient>
      <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a9d8ec" />
        <stop offset="0.7" stopColor="#d7eef3" />
        <stop offset="1" stopColor="#eef6e4" />
      </linearGradient>
      <linearGradient id="g-ray" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff3c4" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="g-wash-warm" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#f2d9a8" stopOpacity="0.45" />
        <stop offset="1" stopColor="#f2d9a8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="g-wash-teal" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#9fd0c6" stopOpacity="0.35" />
        <stop offset="1" stopColor="#9fd0c6" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="g-board" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4f7a63" />
        <stop offset="1" stopColor="#3c624f" />
      </linearGradient>
      <linearGradient id="g-grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bcd99a" />
        <stop offset="1" stopColor="#a8cc86" />
      </linearGradient>
      <pattern id="p-cork" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#d9b886" />
        <circle cx="2" cy="3" r="0.9" fill="#c49c66" />
        <circle cx="7" cy="7" r="0.8" fill="#c49c66" />
      </pattern>
    </defs>
  );
}
