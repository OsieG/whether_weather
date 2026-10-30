"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clamp, moonPos, skyAt, sunPos, type Mood } from "@/lib/sky";
import MoonDisc from "./MoonDisc";

type Props = {
  hour: number;
  mood: Mood;
  /** 0 to 100, from the moon endpoint */
  illumination?: number;
  waning?: boolean;
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(7);
const STARS = Array.from({ length: 110 }, () => ({
  x: rand() * 100,
  y: rand() * 62,
  s: 1 + rand() * 1.8,
  d: rand() * 6,
  t: 3 + rand() * 4,
}));
const CLOUDS = Array.from({ length: 8 }, (_, i) => ({
  top: 4 + ((i * 11) % 46) + rand() * 6,
  w: 38 + rand() * 34,
  h: 9 + rand() * 6,
  dur: 140 + rand() * 120,
  delay: -rand() * 240,
  alpha: 0.55 + rand() * 0.4,
}));

export default function SkyBackground({ hour, mood, illumination, waning }: Props) {
  const reduced = useReducedMotion();
  const sky = skyAt(hour, mood);
  const sun = sunPos(hour);
  const moon = moonPos(hour);
  const isDay = sky.light >= 0.5;
  const clouds = useMemo(() => CLOUDS.slice(0, Math.round(2 + mood.cloud * 6)), [mood.cloud]);
  const stars = clamp(1 - sky.light * 1.6) * (1 - mood.cloud * 0.85);

  useEffect(() => {
    document.documentElement.dataset.mode = isDay ? "day" : "night";
  }, [isDay]);

  const style = {
    "--sky-top": sky.top,
    "--sky-mid": sky.mid,
    "--sky-bottom": sky.bottom,
    "--cloud": sky.cloud,
  } as CSSProperties;

  const rise = { duration: reduced ? 0 : 2.8, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div aria-hidden className="sky" style={style}>
      <div className="absolute inset-0 transition-opacity duration-[2500ms]" style={{ opacity: stars }}>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              animationDelay: `${s.d}s`,
              animationDuration: `${s.t}s`,
            }}
          />
        ))}
      </div>

      {sun && (
        <motion.div
          className="sun"
          initial={{ left: "6%", top: "80%", opacity: 0 }}
          animate={{ left: `${sun.x}%`, top: `${sun.y}%`, opacity: sun.opacity * (1 - mood.rain * 0.75) }}
          transition={rise}
        />
      )}

      {moon && (
        <motion.div
          className="moon"
          initial={{ left: "6%", top: "80%", opacity: 0 }}
          animate={{ left: `${moon.x}%`, top: `${moon.y}%`, opacity: moon.opacity * (1 - mood.cloud * 0.7) }}
          transition={rise}
        >
          <MoonDisc fraction={illumination !== undefined ? illumination / 100 : 0.85} waning={waning} size={64} />
        </motion.div>
      )}

      {clouds.map((c, i) => (
        <span
          key={i}
          className="cloud"
          style={{
            top: `${c.top}%`,
            width: `${c.w}vw`,
            height: `${c.h}vw`,
            opacity: c.alpha * (0.45 + mood.cloud * 0.55),
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <Rain intensity={mood.rain} />
      {mood.storm && !reduced && <Lightning />}
    </div>
  );
}

function Rain({ intensity }: { intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || intensity <= 0 || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Drop = { x: number; y: number; len: number; v: number; a: number };
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let drops: Drop[] = [];
    const slant = 0.22;

    const seed = () => {
      const scale = clamp(w / 1280, 0.5, 1.3);
      const n = Math.round((50 + intensity * 230) * scale);
      drops = Array.from({ length: n }, () => ({
        x: Math.random() * (w + 200),
        y: Math.random() * h,
        len: 10 + Math.random() * 16,
        v: 700 + Math.random() * 500,
        a: 0.18 + Math.random() * 0.3,
      }));
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.1;
      ctx.lineCap = "round";
      for (const d of drops) {
        d.y += d.v * dt;
        d.x -= d.v * dt * slant;
        if (d.y > h + 20) {
          d.y = -20;
          d.x = Math.random() * (w + 200);
        }
        ctx.strokeStyle = `rgba(214,228,255,${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * slant, d.y - d.len);
        ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [intensity, reduced]);

  if (intensity <= 0) return null;
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function Lightning() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setN((x) => x + 1);
        next();
      }, 5000 + Math.random() * 9000);
    };
    next();
    return () => clearTimeout(t);
  }, []);
  if (n === 0) return null;
  return (
    <motion.div
      key={n}
      className="absolute inset-0 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.5, 0.05, 0.3, 0] }}
      transition={{ duration: 0.6 }}
    />
  );
}
