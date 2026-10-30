export type Current = {
  temp?: number;
  feels?: number;
  humidity?: number;
  wind?: number;
  uv?: number;
  precip?: number;
  cloud?: number;
  condition?: string;
  /** WeatherAPI us-epa-index, 1 (good) to 6 (hazardous) */
  aqi?: number;
};

export type Forecast = {
  min?: number;
  max?: number;
  rainChance?: number;
  uv?: number;
  condition?: string;
};

export type Moon = {
  viewable: boolean;
  phase?: string;
  illumination?: number;
  nightScore?: number;
  nightLabel?: string;
  bestHour?: string;
  direction?: string;
  altitude?: number;
  reason?: string;
};

export type LocState = {
  status: "loading" | "ready" | "error";
  current?: Current;
  forecast?: Forecast;
  moon?: Moon;
  advice: string[];
  error?: string;
};
