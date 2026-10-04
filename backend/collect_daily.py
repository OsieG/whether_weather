import json
from datetime import date
from pathlib import Path

from main import (
    FIXED_LOCATIONS,
    fetch_current_weather,
    get_tomorrow_forecast,
    get_air_quality,
    build_recommendation,
    build_llm_recommendation,
)

DATA_FILE = Path(__file__).parent / "data" / "history.json"


def collect_for_location(location_key, coords):
    lat, lon = coords["latitude"], coords["longitude"]
    weather = fetch_current_weather(lat, lon)
    forecast = get_tomorrow_forecast(lat, lon)
    air_quality = get_air_quality(lat, lon)

    return {
        "location": location_key,
        "date": str(date.today()),
        "weather": weather,
        "forecast": forecast,
        "air_quality": air_quality,
        "recommendation_rule": build_recommendation(weather, forecast, air_quality),
        "recommendation_llm": build_llm_recommendation(weather, forecast, air_quality),
    }


def main():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    if DATA_FILE.exists():
        history = json.loads(DATA_FILE.read_text())
    else:
        history = []

    for location_key, coords in FIXED_LOCATIONS.items():
        entry = collect_for_location(location_key, coords)
        history.append(entry)
        print(f"Collected: {location_key}")

    DATA_FILE.write_text(json.dumps(history, indent=2))
    print(f"Saved {len(history)} total entries to {DATA_FILE}")


if __name__ == "__main__":
    main()