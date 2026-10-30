import type { Current } from "./types";

/* ---------- weather mood ---------- */

export type Mood = { cloud: number; rain: number; storm: boolean; label: string };

export const CLEAR: Mood = { cloud: 0.15, rain: 0, storm: false, label: "Clear" };

export const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export function deriveMood(c?: Current): Mood {
  if (!c) return CLEAR;
  const text = (c.condition ?? "").toLowerCase();
  const storm = /thunder|storm/.test(text);
  const wet = /rain|drizzle|shower|thunder|storm/.test(text);
  const p = c.precip ?? 0;

  let rain = 0;
  if (storm || p >= 7) rain = 1;
  else if (p >= 2.5) rain = 0.7;
  else if (p > 0.1 || wet) rain = 0.4;

  let cloud =
    c.cloud !== undefined
      ? c.cloud / 100
      : /overcast/.test(text)
        ? 0.95
        : /partly/.test(text)
          ? 0.45
          : /cloud/.test(text)
            ? 0.7
            : /mist|fog|haze/.test(text)
              ? 0.6
              : 0.2;
  if (rain > 0) cloud = Math.max(cloud, 0.8 + rain * 0.15);

  const label =
    c.condition ??
    (storm ? "Thunderstorm" : rain > 0 ? "Rain" : cloud > 0.7 ? "Cloudy" : cloud > 0.35 ? "Partly cloudy" : "Clear");
  return { cloud: clamp(cloud), rain, storm, label };
}

/* ---------- sky colour over the day ---------- */

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;

type Stop = { h: number; top: string; mid: string; bottom: string; light: number };

// Philippine daylight barely moves through the year (sunrise ~5:30-6:15, sunset ~17:30-18:20),
// so fixed hour keyframes look right all year. Swap for the astro block from the API later if you like.
const NIGHT: Omit<Stop, "h"> = { top: "#060a1c", mid: "#0d1536", bottom: "#1a2350", light: 0 };
const STOPS: Stop[] = [
  { h: 0, ...NIGHT },
  { h: 4.75, top: "#0a1030", mid: "#1c2552", bottom: "#3b3568", light: 0.05 },
  { h: 5.6, top: "#2a3a78", mid: "#8b5f8f", bottom: "#f4a272", light: 0.35 },
  { h: 6.6, top: "#4a86d0", mid: "#9cc4e8", bottom: "#fbd9a6", light: 0.75 },
  { h: 9, top: "#3f8fe3", mid: "#78b9ee", bottom: "#c4e4f8", light: 1 },
  { h: 13, top: "#2f82e0", mid: "#6fb4ee", bottom: "#b9e0f8", light: 1 },
  { h: 16.5, top: "#4a8fdc", mid: "#92c3ea", bottom: "#e8dcc0", light: 0.9 },
  { h: 17.6, top: "#47579f", mid: "#d9876a", bottom: "#ffbf70", light: 0.55 },
  { h: 18.3, top: "#1f2858", mid: "#6a4a88", bottom: "#e5716a", light: 0.25 },
  { h: 19.2, top: "#0b1233", mid: "#1b2552", bottom: "#3a3566", light: 0.05 },
  { h: 24, ...NIGHT },
];

export type Sky = { top: string; mid: string; bottom: string; cloud: string; light: number };

export function skyAt(hour: number, mood: Mood): Sky {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < STOPS.length - 2 && h >= STOPS[i + 1].h) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp((h - a.h) / (b.h - a.h));
  const light = a.light + (b.light - a.light) * t;

  // Weather pulls the whole sky toward grey. At night the grey itself is dark.
  const grey = mix(hex("#1b222d"), hex("#7e8b99"), light);
  const g = Math.max(mood.cloud * 0.35, mood.rain * 0.68);
  const grade = (from: string, to: string): string => {
    const c = mix(hex(from), hex(to), t);
    return css(mix(c, grey, g));
  };

  const cloudBase = mix(hex("#7f8db8"), hex("#ffffff"), light);
  const cloud = css(mix(cloudBase, mix(hex("#4a5563"), hex("#9aa6b2"), light), mood.rain));

  return {
    top: grade(a.top, b.top),
    mid: grade(a.mid, b.mid),
    bottom: grade(a.bottom, b.bottom),
    cloud,
    light,
  };
}

/* ---------- sun and moon arcs ---------- */

const RISE = 5.75;
const SET = 17.9;

export type Body = { x: number; y: number; opacity: number };

function arc(p: number): Body | null {
  if (p < 0 || p > 1) return null;
  const edge = clamp(Math.min(p, 1 - p) / 0.07);
  return { x: 6 + 88 * p, y: 74 - Math.sin(Math.PI * p) * 58, opacity: edge };
}

export const sunPos = (hour: number) => arc((hour - RISE) / (SET - RISE));

export function moonPos(hour: number) {
  const span = 24 - SET + RISE;
  const since = hour >= SET ? hour - SET : hour + 24 - SET;
  return arc(since / span);
}

/** Lit part of the moon on a 100x100 disc, lit on the right. f is 0 (new) to 1 (full). */
export function moonLitPath(f: number): string {
  const r = 50;
  const rx = Math.abs(1 - 2 * f) * r;
  const sweep = f > 0.5 ? 1 : 0;
  return `M50 0 A${r} ${r} 0 0 1 50 100 A${rx} ${r} 0 0 ${sweep} 50 0 Z`;
}

/* ---------- Manila clock and small formatters ---------- */

export function manilaNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "long",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = (Number(get("hour")) % 24) + Number(get("minute")) / 60;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  const greeting =
    hour < 12 ? "Magandang umaga" : hour < 13.5 ? "Magandang tanghali" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  return { hour, label: `${get("weekday")}, ${time}`, greeting };
}

export function fmtClock(s?: string): string {
  const m = s?.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "–";
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassDeg = (dir?: string) => {
  const i = dir ? COMPASS.indexOf(dir.toUpperCase()) : -1;
  return i < 0 ? 0 : i * 22.5;
};
