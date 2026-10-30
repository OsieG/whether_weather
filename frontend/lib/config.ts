export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type SceneKind = "skyline" | "pines" | "ridge";

export type LocationConfig = {
  /** Must match the keys in FIXED_LOCATIONS in main.py */
  key: string;
  name: string;
  tagline: string;
  scene: SceneKind;
};

export const LOCATIONS: LocationConfig[] = [
  { key: "makati", name: "Makati", tagline: "Business district at sea level", scene: "skyline" },
  { key: "baguio", name: "Baguio", tagline: "Pine city, 1,500 m up", scene: "pines" },
  { key: "uplb", name: "UPLB", tagline: "Los Baños, under Mt. Makiling", scene: "ridge" },
];
