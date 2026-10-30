"use client";

import { useCallback, useEffect, useState } from "react";
import { API, LOCATIONS } from "./config";
import { normalizeAdvice, normalizeCurrent, normalizeForecast, normalizeMoon } from "./normalize";
import type { LocState } from "./types";

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(`${API}${path}`, { signal });
  if (!res.ok) throw new Error(`${res.status} from ${path.split("?")[0]}`);
  return res.json();
}

const initial = (): Record<string, LocState> =>
  Object.fromEntries(LOCATIONS.map((l) => [l.key, { status: "loading", advice: [] } as LocState]));

export function useWeather() {
  const [data, setData] = useState<Record<string, LocState>>(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    // Render's free tier can take about a minute to wake up
    const timeout = setTimeout(() => ctrl.abort(), 90_000);

    LOCATIONS.forEach(async (loc) => {
      const q = `location_key=${encodeURIComponent(loc.key)}`;
      const [cur, fc, moon, rec] = await Promise.allSettled([
        getJson(`/weather/current?${q}`, ctrl.signal),
        getJson(`/weather/forecast?${q}`, ctrl.signal),
        getJson(`/weather/moon?${q}`, ctrl.signal),
        getJson(`/weather/recommendations?${q}&mode=rule`, ctrl.signal),
      ]);
      if (cancelled) return;

      const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
      const current = cur.status === "fulfilled" ? normalizeCurrent(cur.value) : undefined;
      const forecast = fc.status === "fulfilled" ? normalizeForecast(fc.value) : undefined;

      setData((prev) => {
        if (!current && !forecast) {
          const reason = cur.status === "rejected" ? String(cur.reason?.message ?? cur.reason) : "no data";
          // keep older data on screen if a refresh fails
          return prev[loc.key].current
            ? prev
            : { ...prev, [loc.key]: { status: "error", advice: [], error: reason } };
        }
        return {
          ...prev,
          [loc.key]: {
            status: "ready",
            current,
            forecast,
            moon: normalizeMoon(ok(moon)),
            advice: normalizeAdvice(ok(rec)),
          },
        };
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, refresh };
}
