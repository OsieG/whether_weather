"use client";

import type { ReactNode } from "react";
import { Droplets, Leaf, Umbrella, Wind } from "lucide-react";
import type { LocationConfig } from "@/lib/config";
import type { LocState } from "@/lib/types";
import { clamp, compassDeg, fmtClock } from "@/lib/sky";
import MoonDisc from "./MoonDisc";
import Scene from "./Scene";

type Props = {
  loc: LocationConfig;
  state: LocState;
  active: boolean;
  onSelect: () => void;
  onRetry: () => void;
};

const AQI = ["Good", "Moderate", "Unhealthy for some", "Unhealthy", "Very unhealthy", "Hazardous"];
const AQI_COLORS = ["#3fbf7f", "#e6c229", "#f29a3a", "#e8584a", "#a4479f", "#7a2a4d"];

function uvLabel(uv: number) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

const n0 = (n?: number) => (n === undefined ? "–" : String(Math.round(n)));

// cool to hot, used for tomorrow's temperature range
function tempColor(t: number) {
  const stops: [number, [number, number, number]][] = [
    [12, [111, 183, 255]],
    [22, [96, 205, 190]],
    [29, [255, 190, 80]],
    [36, [255, 99, 72]],
  ];
  if (t <= stops[0][0]) return `rgb(${stops[0][1].join(" ")})`;
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(" ")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(" ")})`;
}

const MIN_T = 10;
const MAX_T = 38;
const at = (t: number) => `${clamp((t - MIN_T) / (MAX_T - MIN_T)) * 100}%`;

function Vital({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="vital-icon">{icon}</span>
      <div className="leading-tight">
        <p className="text-[0.95rem] font-medium">{value}</p>
        <p className="text-xs text-soft">{label}</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 space-y-5" aria-busy>
      <div className="shimmer h-20 w-40 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-9 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-3 rounded-full" />
      <div className="shimmer h-14 rounded-2xl" />
    </div>
  );
}

export default function LocationCard({ loc, state, active, onSelect, onRetry }: Props) {
  const { current: c, forecast: f, moon: m } = state;

  return (
    <section
      className="card"
      data-active={active}
      tabIndex={0}
      aria-label={`${loc.name} weather. ${active ? "The sky follows this card." : "Press Enter to make the sky follow this card."}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="card-body">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.75rem] font-semibold leading-none tracking-tight">{loc.name}</h2>
            <p className="mt-1.5 text-sm text-soft">{loc.tagline}</p>
          </div>
          {active && (
            <span className="chip" title="The sky behind the page follows this card">
              <span className="dot" />
              Sky
            </span>
          )}
        </header>

        {state.status === "loading" && <Skeleton />}

        {state.status === "error" && (
          <div className="mt-6 rounded-2xl p-4" style={{ background: "var(--chip)" }}>
            <p className="font-medium">Couldn&apos;t load {loc.name}</p>
            <p className="mt-1 text-sm text-soft">
              {state.error}. If the server was asleep, give it a minute and try again.
            </p>
            <button
              className="btn mt-3"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" && c && (
          <>
            <div className="mt-6 flex items-end gap-4">
              <p className="font-display text-[5.6rem] font-light leading-[0.82] tracking-[-0.05em]">
                {n0(c.temp)}
                <span className="align-top text-[2.4rem] font-normal tracking-normal text-soft">°</span>
              </p>
              <div className="pb-1.5 leading-tight">
                <p className="text-lg font-medium">{c.condition ?? "Current weather"}</p>
                <p className="text-sm text-soft">Feels like {n0(c.feels)}°</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
              <Vital icon={<Droplets size={18} />} label="Humidity" value={c.humidity === undefined ? "–" : `${n0(c.humidity)}%`} />
              <Vital icon={<Wind size={18} />} label="Wind" value={c.wind === undefined ? "–" : `${n0(c.wind)} km/h`} />
              <Vital
                icon={<Umbrella size={18} />}
                label="Rain tomorrow"
                value={f?.rainChance === undefined ? "–" : `${n0(f.rainChance)}%`}
              />
              <Vital
                icon={<Leaf size={18} />}
                label="Air quality"
                value={c.aqi === undefined ? "–" : AQI[clamp(Math.round(c.aqi), 1, 6) - 1]}
              />
            </div>

            {c.uv !== undefined && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">UV {n0(c.uv)}</span>
                  <span className="text-soft">{uvLabel(c.uv)}</span>
                </div>
                <div className="uv-track mt-1.5">
                  <span className="uv-mark" style={{ left: `${clamp(c.uv / 12) * 100}%` }} />
                </div>
              </div>
            )}

            {c.aqi !== undefined && (
              <div className="mt-4 flex gap-1.5" aria-hidden>
                {AQI_COLORS.map((col, i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: i < Math.round(c.aqi!) ? col : "var(--chip)" }}
                  />
                ))}
              </div>
            )}

            {f && f.min !== undefined && f.max !== undefined && (
              <div className="divide mt-5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">Tomorrow</span>
                  <span className="text-soft">
                    {n0(f.min)}° to {n0(f.max)}°
                  </span>
                </div>
                <div className="range-track mt-2">
                  <span
                    className="range-fill"
                    style={{
                      left: at(f.min),
                      right: `calc(100% - ${at(f.max)})`,
                      background: `linear-gradient(90deg, ${tempColor(f.min)}, ${tempColor(f.max)})`,
                    }}
                  />
                  {c.temp !== undefined && <span className="range-now" style={{ left: at(c.temp) }} title="Now" />}
                </div>
                <p className="mt-1.5 text-xs text-soft">The dot is now. Every card uses the same 10° to 38° scale.</p>
              </div>
            )}

            {m && (
              <div className="divide mt-5 flex items-center gap-3">
                <MoonDisc
                  fraction={m.illumination !== undefined ? m.illumination / 100 : 0.5}
                  waning={/waning/i.test(m.phase ?? "")}
                  size={44}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  {m.viewable ? (
                    <>
                      <p className="font-medium">
                        {m.phase}, {n0(m.illumination)}% lit
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-soft">
                        Best at {fmtClock(m.bestHour)}, look {m.direction}
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          aria-hidden
                          style={{ transform: `rotate(${compassDeg(m.direction)}deg)` }}
                          fill="currentColor"
                        >
                          <path d="M12 2.5 18.5 20 12 16.2 5.5 20Z" />
                        </svg>
                        {m.altitude !== undefined && <span>{n0(m.altitude)}° up</span>}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-soft">The moon stays below the horizon after dark tonight.</p>
                  )}
                </div>
                {m.viewable && m.nightLabel && (
                  <span className={`chip grade-${m.nightLabel.toLowerCase()}`}>{m.nightLabel}</span>
                )}
              </div>
            )}

            {state.advice.length > 0 && (
              <ul className="divide mt-5 space-y-2 text-sm leading-snug">
                {state.advice.slice(0, 3).map((a, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="bullet" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="scene">
        <Scene kind={loc.scene} />
      </div>
    </section>
  );
}
