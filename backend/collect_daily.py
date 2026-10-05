import json
from datetime import date
from pathlib import Path

from main import (
    FIXED_LOCATIONS,
    fetch_current_weather,
    get_tomorrow_forecast,
    get_air_quality_data,
    build_recommendation,
    build_llm_recommendation,
    resolve_location_query
)

DATA_FILE = Path(__file__).parent / "data" / "history.json"


def collect_for_location(location_key):
    query, error = resolve_location_query(location_key, None, None)
    if error:
        return error

    weather = fetch_current_weather(query)
    forecast = get_tomorrow_forecast(query)
    air_quality = get_air_quality_data(query)

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

    for location_key, _ in FIXED_LOCATIONS.items():
        entry = collect_for_location(location_key)
        if entry:
            history.append(entry)
            print(f"Collected: {location_key}")

    DATA_FILE.write_text(json.dumps(history, indent=2))
    print(f"Saved {len(history)} total entries to {DATA_FILE}")


if __name__ == "__main__":
    main()
