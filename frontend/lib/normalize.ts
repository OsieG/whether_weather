/**
 * The ONE place that knows what your backend's JSON looks like.
 *
 * Each field lists several possible key names, because I haven't seen the exact
 * responses. Open /weather/current, /weather/forecast, /weather/moon and
 * /weather/recommendations in your browser, then add or reorder the key names
 * below so every field resolves. Nothing else in the frontend needs to change.
 */
import type { Current, Forecast, Moon } from "./types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function pick(o: Obj | undefined, keys: string[]): unknown {
  if (!o) return undefined;
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k];
  }
  return undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (isObj(v) && typeof v.text === "string") return v.text; // WeatherAPI: condition.text
  return undefined;
}

function unwrap(raw: unknown, ...wrappers: string[]): Obj {
  if (!isObj(raw)) return {};
  for (const w of wrappers) {
    if (isObj(raw[w])) return raw[w] as Obj;
  }
  return raw;
}

export function normalizeCurrent(raw: unknown): Current {
  const o = unwrap(raw, "current", "weather");
  const aq = isObj(o.air_quality) ? o.air_quality : isObj(isObj(raw) ? raw.air_quality : undefined) ? (raw as Obj).air_quality as Obj : undefined;
  return {
    temp: num(pick(o, ["temperature", "temp_c", "temperature_2m", "temp"])),
    feels: num(pick(o, ["apparent_temperature", "feelslike_c", "feels_like"])),
    humidity: num(pick(o, ["humidity", "relative_humidity_2m"])),
    wind: num(pick(o, ["wind_speed", "wind_kph", "wind_speed_10m"])),
    uv: num(pick(o, ["uv_index", "uv"])),
    precip: num(pick(o, ["precipitation", "precip_mm"])),
    cloud: num(pick(o, ["cloud", "cloud_cover", "cloudcover"])),
    condition: str(pick(o, ["condition", "condition_text", "weather_description", "description", "text"])),
    aqi: num(pick(aq, ["us-epa-index", "us_epa_index", "epa_index"]) ?? pick(o, ["aqi", "air_quality_index"])),
  };
}

export function normalizeForecast(raw: unknown): Forecast {
  const o = unwrap(raw, "forecast", "tomorrow");
  return {
    min: num(pick(o, ["temp_min", "min_temp", "mintemp_c", "temperature_min", "temperature_2m_min", "min"])),
    max: num(pick(o, ["temp_max", "max_temp", "maxtemp_c", "temperature_max", "temperature_2m_max", "max"])),
    rainChance: num(pick(o, ["precipitation_probability", "precipitation_probability_max", "daily_chance_of_rain", "rain_chance", "chance_of_rain"])),
    uv: num(pick(o, ["uv_index_max", "uv_index", "uv"])),
    condition: str(pick(o, ["condition", "condition_text", "weather_description", "text"])),
  };
}

export function normalizeMoon(raw: unknown): Moon | undefined {
  if (!isObj(raw) || typeof raw.error === "string") return undefined;
  if (raw.viewable !== true) {
    return { viewable: false, reason: str(raw.reason) };
  }
  return {
    viewable: true,
    phase: str(raw.phase),
    illumination: num(raw.illumination),
    nightScore: num(raw.night_score),
    nightLabel: str(raw.night_label),
    bestHour: str(raw.best_hour),
    direction: str(raw.best_direction),
    altitude: num(raw.best_altitude),
  };
}

/** Collects short readable strings from whatever shape /weather/recommendations returns. */
export function normalizeAdvice(raw: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (out.length >= 4 || depth > 3) return;
    if (typeof v === "string") {
      const s = v.trim();
      if (s.length > 12 && s.length < 260) out.push(s);
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
    } else if (isObj(v)) {
      Object.entries(v).forEach(([k, x]) => {
        if (/^(location|date|mode|source)$/i.test(k)) return;
        walk(x, depth + 1);
      });
    }
  };
  walk(isObj(raw) && isObj(raw.recommendations) ? raw.recommendations : raw, 0);
  return out;
}
