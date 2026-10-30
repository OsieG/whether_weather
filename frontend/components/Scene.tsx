import type { SceneKind } from "@/lib/config";

/** Landscape silhouettes that sit at the foot of each card. Colours come from CSS variables so they follow day and night. */

const BACK: [number, number, number][] = [
  [0, 26, 40], [22, 22, 58], [48, 30, 46], [84, 20, 66], [110, 34, 50], [150, 24, 72], [180, 28, 44],
  [214, 22, 60], [240, 36, 52], [282, 24, 76], [310, 30, 48], [346, 26, 62], [376, 24, 42],
];
const FRONT: [number, number, number][] = [
  [8, 30, 30], [40, 24, 44], [70, 34, 36], [110, 22, 52], [138, 40, 34], [184, 26, 58],
  [214, 30, 38], [250, 28, 50], [284, 34, 30], [324, 24, 46], [352, 40, 34],
];

function Skyline() {
  const windows: { x: number; y: number }[] = [];
  FRONT.forEach(([x, w, h]) => {
    for (let y = 96 - h + 5; y < 91; y += 7) {
      for (let cx = x + 4; cx < x + w - 5; cx += 6) {
        if (Math.floor(cx * 7 + y * 13) % 5 < 3) windows.push({ x: cx, y });
      }
    }
  });
  return (
    <>
      <g fill="var(--scene-1)">
        {BACK.map(([x, w, h], i) => (
          <rect key={i} x={x} y={96 - h} width={w} height={h} />
        ))}
        <rect x="161" y="12" width="2" height="12" />
      </g>
      <g fill="var(--scene-3)">
        {FRONT.map(([x, w, h], i) => (
          <rect key={i} x={x} y={96 - h} width={w} height={h} />
        ))}
      </g>
      <g fill="var(--window)" opacity="var(--window-op)">
        {windows.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width="2.4" height="3" rx="0.5" />
        ))}
      </g>
    </>
  );
}

function pine(x: number, h: number): string {
  const w = h * 0.5;
  let d = "";
  for (let k = 0; k < 3; k++) {
    const yb = 96 - h * 0.15 - k * h * 0.22;
    const ya = yb - h * 0.38;
    const hw = (w / 2) * (1 - k * 0.25);
    d += `M${x - hw} ${yb} L${x} ${ya} L${x + hw} ${yb} Z `;
  }
  d += `M${x - 1.5} ${96 - h * 0.15} h3 v${h * 0.15} h-3 Z`;
  return d;
}

function Pines() {
  const back = Array.from({ length: 19 }, (_, i) => ({ x: 8 + i * 21, h: 40 + ((i * 17) % 22) }));
  const front = Array.from({ length: 12 }, (_, i) => ({ x: 14 + i * 34 + ((i * 7) % 9), h: 54 + ((i * 23) % 26) }));
  return (
    <>
      <path d="M0 70 Q100 54 200 66 T400 60 L400 96 L0 96 Z" fill="var(--scene-1)" />
      <g fill="var(--scene-2)">
        {back.map((p, i) => (
          <path key={i} d={pine(p.x, p.h)} />
        ))}
      </g>
      <ellipse cx="110" cy="78" rx="110" ry="7" fill="var(--mist)" />
      <ellipse cx="300" cy="84" rx="120" ry="6" fill="var(--mist)" />
      <g fill="var(--scene-3)">
        {front.map((p, i) => (
          <path key={i} d={pine(p.x, p.h)} />
        ))}
      </g>
    </>
  );
}

function Palm({ x }: { x: number }) {
  const top = { x: x + 1, y: 62 };
  const fronds = [
    [-20, 8], [-14, -4], [0, -10], [14, -4], [20, 8], [-8, 12], [9, 12],
  ];
  return (
    <g stroke="var(--scene-3)" strokeLinecap="round" fill="none">
      <path d={`M${x} 96 Q${x + 4} 80 ${top.x} ${top.y}`} strokeWidth="2.6" />
      {fronds.map(([dx, dy], i) => (
        <path key={i} d={`M${top.x} ${top.y} q${dx * 0.55} ${dy - 10} ${dx} ${dy}`} strokeWidth="2.2" />
      ))}
    </g>
  );
}

function Ridge() {
  return (
    <>
      <path
        d="M0 74 C30 66 52 52 84 44 C100 40 108 30 126 28 C146 26 156 38 176 46 C200 56 214 40 238 38 C262 36 276 52 300 58 C330 66 360 62 400 72 L400 96 L0 96 Z"
        fill="var(--scene-1)"
      />
      <path d="M0 84 C70 68 150 82 230 76 C300 71 350 80 400 74 L400 96 L0 96 Z" fill="var(--scene-2)" />
      <ellipse cx="150" cy="60" rx="120" ry="6" fill="var(--mist)" />
      <path d="M0 90 C90 80 170 90 250 86 C320 82 360 90 400 86 L400 96 L0 96 Z" fill="var(--scene-3)" />
      <Palm x={318} />
      <Palm x={350} />
      <Palm x={376} />
    </>
  );
}

export default function Scene({ kind }: { kind: SceneKind }) {
  return (
    <svg viewBox="0 0 400 96" preserveAspectRatio="xMidYMax slice" className="block h-24 w-full" aria-hidden>
      {kind === "skyline" && <Skyline />}
      {kind === "pines" && <Pines />}
      {kind === "ridge" && <Ridge />}
    </svg>
  );
}
