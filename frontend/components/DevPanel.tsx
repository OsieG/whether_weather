"use client";

export type SkyPreset = "clear" | "cloudy" | "rain" | "storm";
export type Override = { hour?: number; sky?: SkyPreset };

/** Development-only controls for previewing every time of day and weather without waiting for them. */
export default function DevPanel({
  value,
  onChange,
  realHour,
}: {
  value: Override;
  onChange: (v: Override) => void;
  realHour: number | null;
}) {
  if (process.env.NODE_ENV !== "development") return null;
  const hour = value.hour ?? realHour ?? 12;
  const hh = Math.floor(hour);
  const mm = String(Math.round((hour - hh) * 60)).padStart(2, "0");

  return (
    <div className="dev-panel">
      <p className="font-medium">Sky preview (dev only)</p>
      <label className="mt-2 block">
        Time {hh}:{mm}
        <input
          type="range"
          min={0}
          max={23.75}
          step={0.25}
          value={hour}
          onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
          className="mt-1 block w-full"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["auto", "clear", "cloudy", "rain", "storm"] as const).map((s) => (
          <button
            key={s}
            className="pill"
            data-on={(value.sky ?? "auto") === s}
            onClick={() => onChange({ ...value, sky: s === "auto" ? undefined : s })}
          >
            {s}
          </button>
        ))}
        <button className="pill" onClick={() => onChange({})}>
          reset
        </button>
      </div>
    </div>
  );
}
