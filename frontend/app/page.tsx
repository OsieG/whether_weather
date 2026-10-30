"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { LOCATIONS } from "@/lib/config";
import { useWeather } from "@/lib/useWeather";
import { deriveMood, manilaNow, type Mood } from "@/lib/sky";
import SkyBackground from "@/components/SkyBackground";
import LocationCard from "@/components/LocationCard";
import ChatWidget from "@/components/ChatWidget";
import DevPanel, { type Override, type SkyPreset } from "@/components/DevPanel";

const PRESETS: Record<SkyPreset, Mood> = {
  clear: { cloud: 0.12, rain: 0, storm: false, label: "Clear" },
  cloudy: { cloud: 0.85, rain: 0, storm: false, label: "Cloudy" },
  rain: { cloud: 0.95, rain: 0.8, storm: false, label: "Rain" },
  storm: { cloud: 1, rain: 1, storm: true, label: "Thunderstorm" },
};

export default function Home() {
  const { data, refresh } = useWeather();
  const [now, setNow] = useState<ReturnType<typeof manilaNow> | null>(null);
  const [activeKey, setActiveKey] = useState(LOCATIONS[0].key);
  const [override, setOverride] = useState<Override>({});
  const [slow, setSlow] = useState(false);

  // Manila time, refreshed twice a minute so the sky drifts through the day.
  useEffect(() => {
    const tick = () => setNow(manilaNow());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Preview links, e.g. /?hour=19.5&sky=rain&loc=baguio
  useEffect(() => {
    const readPreviewLink = () => {
      const p = new URLSearchParams(window.location.search);
      const hour = p.get("hour") === null ? NaN : Number(p.get("hour"));
      const sky = p.get("sky") as SkyPreset | null;
      const loc = p.get("loc");
      setOverride({
        hour: Number.isFinite(hour) ? hour : undefined,
        sky: sky && sky in PRESETS ? sky : undefined,
      });
      if (loc && LOCATIONS.some((l) => l.key === loc)) setActiveKey(loc);
    };
    readPreviewLink();
  }, []);

  const loadingAny = LOCATIONS.some((l) => data[l.key].status === "loading");
  useEffect(() => {
    if (!loadingAny) return;
    const id = setTimeout(() => setSlow(true), 5000);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [loadingAny]);

  const active = data[activeKey];
  const activeLoc = LOCATIONS.find((l) => l.key === activeKey) ?? LOCATIONS[0];
  const mood = override.sky ? PRESETS[override.sky] : deriveMood(active.current);
  const hour = override.hour ?? now?.hour ?? null;
  const moon = active.moon;

  return (
    <>
      {hour !== null && (
        <SkyBackground
          hour={hour}
          mood={mood}
          illumination={moon?.viewable ? moon.illumination : undefined}
          waning={/waning/i.test(moon?.phase ?? "")}
        />
      )}

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-44 pt-8 sm:px-8 sm:pt-12">
        <header className="sky-text flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display text-[clamp(2.6rem,8vw,4.6rem)] font-bold leading-[0.88] tracking-[-0.045em]">
              whether weather
            </h1>
            <p className="mt-3 text-base font-medium sm:text-lg">
              {now ? `${now.greeting}! ${now.label} in Manila.` : " "}
            </p>
            <p className="mt-0.5 text-sm opacity-85">
              The sky is showing {activeLoc.name}: {mood.label.toLowerCase()}. Tap a card to change it.
            </p>
          </div>
          <button className="btn-ghost" onClick={refresh}>
            <RotateCw size={15} aria-hidden />
            Refresh
          </button>
        </header>

        {slow && (
          <p className="banner" role="status">
            Waking the server. Free hosting sleeps when idle, so the first load can take up to a minute.
          </p>
        )}

        <div className="grid-cards mt-8 sm:mt-12">
          {LOCATIONS.map((loc) => (
            <LocationCard
              key={loc.key}
              loc={loc}
              state={data[loc.key]}
              active={loc.key === activeKey}
              onSelect={() => setActiveKey(loc.key)}
              onRetry={refresh}
            />
          ))}
        </div>

        <footer className="sky-text mt-10 text-sm opacity-80">
          Weather data from{" "}
          <a className="underline underline-offset-2" href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">
            WeatherAPI.com
          </a>
          .
        </footer>
      </main>

      <ChatWidget locationKey={activeKey} onLocationChange={setActiveKey} greeting={now?.greeting ?? "Hello"} />
      <DevPanel value={override} onChange={setOverride} realHour={now?.hour ?? null} />
    </>
  );
}
