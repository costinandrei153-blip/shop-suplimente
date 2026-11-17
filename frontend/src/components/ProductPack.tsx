import { useId } from "react";

/**
 * TRENIX — vector packshot used when a product has no photo.
 * Matte tub / jar with gold-foil wordmark, per-category finish.
 */
interface ProductPackProps {
  name: string;
  category?: string;
  className?: string;
}

type Finish = {
  shape: "tub" | "jar";
  body: [string, string, string]; // edge, mid, highlight
  cap: [string, string];
  ink: string;
  foil: [string, string, string];
};

const FINISHES: Record<string, Finish> = {
  protein: { shape: "tub", body: ["#050505", "#171615", "#34322e"], cap: ["#0d0d0c", "#2b2926"], ink: "#f1ebe0", foil: ["#8a6a32", "#f5e3b5", "#8a6a32"] },
  creatine: { shape: "tub", body: ["#a79f8d", "#e6dfcf", "#fbf7ec"], cap: ["#1a1712", "#3b362c"], ink: "#17130d", foil: ["#4e3813", "#8f6e2e", "#4e3813"] },
  energy: { shape: "tub", body: ["#0a0504", "#1d0f0b", "#3d2219"], cap: ["#120806", "#33201a"], ink: "#f6e4cf", foil: ["#8a4a24", "#f0b47c", "#8a4a24"] },
  wellness: { shape: "jar", body: ["#0a0a0a", "#1c1b19", "#3a3833"], cap: ["#b79657", "#f3e1b0"], ink: "#f1ebe0", foil: ["#8a6a32", "#f5e3b5", "#8a6a32"] },
  recovery: { shape: "jar", body: ["#8c836f", "#cfc6b1", "#f2ecdc"], cap: ["#14110c", "#37322a"], ink: "#16120c", foil: ["#4e3813", "#8f6e2e", "#4e3813"] },
  performance: { shape: "tub", body: ["#060606", "#191918", "#383631"], cap: ["#0d0d0c", "#2b2926"], ink: "#f1ebe0", foil: ["#8a6a32", "#f5e3b5", "#8a6a32"] },
};

function kindOf(name: string): keyof typeof FINISHES {
  const n = name.toLowerCase();
  if (n.includes("whey") || n.includes("protein") || n.includes("gainer") || n.includes("casein")) return "protein";
  if (n.includes("creatin")) return "creatine";
  if (n.includes("pre-workout") || n.includes("pre workout") || n.includes("energy")) return "energy";
  if (n.includes("vitamin") || n.includes("omega") || n.includes("multi")) return "wellness";
  if (n.includes("collagen") || n.includes("bcaa") || n.includes("amino")) return "recovery";
  return "performance";
}

function wrap(text: string, max: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export default function ProductPack({ name, category, className }: ProductPackProps) {
  const uid = useId().replace(/:/g, "");
  const f = FINISHES[kindOf(name)];
  const tub = f.shape === "tub";

  // geometry
  const x = tub ? 46 : 78, w = tub ? 208 : 144;
  const capTop = tub ? 34 : 118, capH = tub ? 62 : 46;
  const top = capTop + capH - 4, bottom = 372;
  const r = 20;
  const cx = x + w / 2;
  const lines = wrap(name, tub ? 14 : 11);
  const nameSize = lines.length > 2 ? (tub ? 15 : 12) : tub ? 18 : 14;
  const labelTop = top + (tub ? 46 : 36);
  const g = (s: string) => `${s}-${uid}`;

  return (
    <svg className={className} viewBox="0 0 300 410" role="img" aria-label={`TRENIX ${name}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g("body")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={f.body[0]} />
          <stop offset="0.16" stopColor={f.body[1]} />
          <stop offset="0.34" stopColor={f.body[2]} />
          <stop offset="0.52" stopColor={f.body[1]} />
          <stop offset="0.86" stopColor={f.body[0]} />
          <stop offset="1" stopColor={f.body[0]} />
        </linearGradient>
        <linearGradient id={g("shade")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0" />
          <stop offset="0.34" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={g("cap")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={f.cap[0]} />
          <stop offset="0.3" stopColor={f.cap[1]} />
          <stop offset="0.55" stopColor={f.cap[0]} />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id={g("foil")} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={f.foil[0]} />
          <stop offset="0.45" stopColor={f.foil[1]} />
          <stop offset="1" stopColor={f.foil[2]} />
        </linearGradient>
        <linearGradient id={g("fade")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <pattern id={g("ridge")} width="7" height="10" patternUnits="userSpaceOnUse">
          <rect width="2.4" height="10" fill="#fff" opacity="0.07" />
        </pattern>
        <clipPath id={g("clip")}>
          <path d={`M${x} ${top} L${x + w} ${top} L${x + w} ${bottom - r} Q${x + w} ${bottom} ${x + w - r} ${bottom} L${x + r} ${bottom} Q${x} ${bottom} ${x} ${bottom - r} Z`} />
        </clipPath>
        <filter id={g("blur")} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id={g("soft")}><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx={cx} cy={bottom + 4} rx={w * 0.62} ry="12" fill="#000" opacity="0.65" filter={`url(#${g("blur")})`} />

      {/* body */}
      <g clipPath={`url(#${g("clip")})`}>
        <rect x={x} y={top} width={w} height={bottom - top} fill={`url(#${g("body")})`} />
        {/* foil bands */}
        <rect x={x} y={top + 14} width={w} height="3" fill={`url(#${g("foil")})`} />
        <rect x={x} y={bottom - 22} width={w} height="3" fill={`url(#${g("foil")})`} />

        {/* label content */}
        <text x={cx} y={labelTop + 14} textAnchor="middle" fill={`url(#${g("foil")})`}
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: tub ? 34 : 24, letterSpacing: tub ? 9 : 6 }}>TRENIX</text>
        <rect x={cx - 20} y={labelTop + 28} width="40" height="1.2" fill={`url(#${g("foil")})`} />
        {lines.map((l, i) => (
          <text key={i} x={cx} y={labelTop + 58 + i * (nameSize + 6)} textAnchor="middle" fill={f.ink}
            style={{ fontFamily: '"DM Sans", Arial, sans-serif', fontWeight: 500, fontSize: nameSize, letterSpacing: 3 }}>{l}</text>
        ))}
        <text x={cx} y={bottom - 40} textAnchor="middle" fill={f.ink} opacity="0.7"
          style={{ fontFamily: '"DM Sans", Arial, sans-serif', fontSize: 7.5, letterSpacing: 3.4 }}>
          {(category ?? "PERFORMANCE").toUpperCase()}
        </text>
        <text x={cx} y={bottom - 30} textAnchor="middle" fill={f.ink} opacity="0.45"
          style={{ fontFamily: '"DM Sans", Arial, sans-serif', fontSize: 6, letterSpacing: 3 }}>PERFORMANCE SERIES</text>

        {/* cylinder shading + sheen over everything */}
        <rect x={x} y={top} width={w} height={bottom - top} fill={`url(#${g("shade")})`} />
        <rect x={x} y={top} width={w} height={bottom - top} fill={`url(#${g("fade")})`} />
        <rect x={x + w * 0.27} y={top + 6} width="7" height={bottom - top - 18} rx="3.5" fill="#fff" opacity="0.13" filter={`url(#${g("soft")})`} />
      </g>

      {/* cap */}
      <path d={`M${x + 6} ${capTop + 10} Q${x + 6} ${capTop} ${x + 16} ${capTop} L${x + w - 16} ${capTop} Q${x + w - 6} ${capTop} ${x + w - 6} ${capTop + 10} L${x + w - 4} ${capTop + capH} L${x + 4} ${capTop + capH} Z`}
        fill={`url(#${g("cap")})`} />
      <path d={`M${x + 6} ${capTop + 10} Q${x + 6} ${capTop} ${x + 16} ${capTop} L${x + w - 16} ${capTop} Q${x + w - 6} ${capTop} ${x + w - 6} ${capTop + 10} L${x + w - 4} ${capTop + capH} L${x + 4} ${capTop + capH} Z`}
        fill={`url(#${g("ridge")})`} />
      <rect x={x + 4} y={capTop + capH - 4} width={w - 8} height="4" fill="#000" opacity="0.55" />
      <rect x={x + w * 0.24} y={capTop + 3} width="6" height={capH - 8} rx="3" fill="#fff" opacity="0.16" filter={`url(#${g("soft")})`} />
    </svg>
  );
}
