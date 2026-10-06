from fastapi import FastAPI
from groq import Groq
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import requests, os
import math
import ephem


class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []
    location_key: str = None
    city: str = None
    country_code: str = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FIXED_LOCATIONS = {
    "makati" : {"latitude": 14.5547, "longitude": 121.0244},
    "baguio" : {"latitude": 16.4023, "longitude": 120.5960},
    "uplb" : {"latitude": 14.1700, "longitude": 121.2430},
}

WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")
client = Groq(api_key=os.environ.get("GROQ_API_KEY", "placeholder"))

@app.get("/health")
def healthcheck():
    return {"status": "ok"}

def resolve_location_query(location_key: str = None, city: str = None, country_code: str = None):
    if location_key:
        if location_key not in FIXED_LOCATIONS:
            return None, {"error": f"Unknown location key: {location_key}"}
        loc = FIXED_LOCATIONS[location_key]
        return f"{loc['latitude']},{loc['longitude']}", None
    elif city:
        query = city if not country_code else f"{city},{country_code}"
        return query, None
    else:
        return None, {"error": "Please provide either a location_key or a city name."}

def fetch_current_weather(query: str):
    weather_url = "https://api.weatherapi.com/v1/current.json"
    params = {
        "key": WEATHER_API_KEY,
        "q": query,
        "aqi": "yes"
    }
    response = requests.get(weather_url, params=params, timeout=10)
    if response.status_code == 200:
        data = response.json()
        current = data["current"]
        return {
            "temperature": current["temp_c"],
            "apparent_temperature": current["feelslike_c"],
            "humidity": current["humidity"],
            "precipitation": current["precip_mm"],
            "condition": current["condition"]["text"],
            "wind_speed": current["wind_kph"],
            "uv_index": current["uv"],
            "us_aqi_category": current["air_quality"]["us-epa-index"],
            "pm10": current["air_quality"]["pm10"],
            "pm2_5": current["air_quality"]["pm2_5"],

        }
    else:
        return {"error": "Failed to fetch weather data"}

@app.get("/weather/current")
def get_current_weather(location_key: str = None, city: str = None, country_code: str = None):
    query, error = resolve_location_query(location_key, city, country_code)
    if error:
        return error
    return fetch_current_weather(query)

def get_tomorrow_forecast(query: str):
    forecast_url = "https://api.weatherapi.com/v1/forecast.json"
    params = {
        "key": WEATHER_API_KEY,
        "q": query,
        "days": 2,
        "aqi": "no",
        "alerts": "no"
    }
    response = requests.get(forecast_url, params=params, timeout=10)
    if response.status_code == 200:
        data = response.json()
        tomorrow = data["forecast"]["forecastday"][1]
        day = tomorrow["day"]

        return {
            "date": tomorrow["date"],
            "temperature_max": day["maxtemp_c"],
            "temperature_min": day["mintemp_c"],
            "precipitation_probability_max": day["daily_chance_of_rain"],
            "condition": day["condition"]["text"],
            "uv_index_max": day["uv"]
        }
    else:
        return {"error": f"Failed to fetch forecast data: {response.status_code} - {response.text}"}


@app.get("/weather/forecast")
def get_forecast(location_key: str = None, city: str = None, country_code: str = None):
    query, error = resolve_location_query(location_key, city, country_code)
    if error:
        return error
    return get_tomorrow_forecast(query)

def get_air_quality_data(query: str):
    weather = fetch_current_weather(query)
    if "error" in weather:
        return weather
    return {
        "pm10": weather["pm10"],
        "pm2_5": weather["pm2_5"],
        "us_aqi_category": weather["us_aqi_category"],
    }

@app.get("/weather/air_quality")
def get_air_quality_endpoint(location_key: str = None, city: str = None, country_code: str = None):
    query, error = resolve_location_query(location_key, city, country_code)
    if error:
        return error
    return get_air_quality_data(query)


def clothing_recommendation(apparent_temp: float):
    match apparent_temp:
        case temp if temp < 10:
            return "Wear a heavy coat, scarf, and gloves."
        case temp if 10 <= temp < 20:
            return "Wear a light jacket or sweater."
        case temp if 20 <= temp < 26:
            return "Wear comfortable clothing, like a t-shirt and jeans."
        case temp if 26 <= temp < 32:
            return "Wear light clothing, like shorts and a t-shirt."
        case temp if temp >= 32:
            return "Avoid the heat, wear breathable clothing and stay hydrated."

def sun_protection_recommendation(uv_index: float):
    match uv_index:
        case index if index < 2:
            return "Low UV index. Minimal sun protection required."
        case index if 2 <= index < 5:
            return "Moderate UV index. Wear sunglasses and apply sunscreen."
        case index if 5 <= index < 8:
            return "High UV index. Wear protective clothing, hat, sunglasses, and sunscreen."
        case index if 8 <= index < 10:
            return "Very high UV index. Minimize sun exposure and seek shade."
        case index if index >= 10:
            return "Extreme UV index. Avoid sun exposure and take all precautions."

def rain_recommendation(precipitation_chance: float):
    match precipitation_chance:
        case chance if chance == 0:
            return "No rain expected. No rain gear needed."
        case chance if 0 < chance <= 30:
            return "Light chance of rain. Consider bringing an umbrella."
        case chance if 30 < chance <= 60:
            return "Moderate chance of rain. Bring an umbrella and waterproof clothing."
        case chance if chance > 60:
            return "High chance of rain. Wear waterproof clothing and bring an umbrella."

def air_quality_recommendation(us_aqi_category: int):
    match us_aqi_category:
        case 1:
            return "Air quality is good. No precautions needed."
        case 2:
            return "Air quality is moderate. Unusually sensitive individuals should consider limiting prolonged outdoor exertion."
        case 3:
            return "Air quality is unhealthy for sensitive groups. Limit prolonged outdoor exertion."
        case 4:
            return "Air quality is unhealthy. Everyone should limit prolonged outdoor exertion, consider a mask outdoors."
        case 5:
            return "Air quality is very unhealthy. Avoid outdoor activity; wear a mask if you must go out."
        case 6:
            return "Air quality is hazardous. Stay indoors and avoid outdoor exposure entirely."
        case _:
            return "Air quality data unavailable."


def build_recommendation(weather_data: dict, forecast_data: dict, air_quality_data: dict):
    return{
        "clothing": clothing_recommendation(weather_data["apparent_temperature"]),
        "sun_protection": sun_protection_recommendation(weather_data["uv_index"]),
        "rain_gear": rain_recommendation(forecast_data["precipitation_probability_max"]),
        "air_quality": air_quality_recommendation(air_quality_data["us_aqi_category"])
    }

def build_llm_recommendation(weather_data: dict, forecast_data: dict, air_quality_data: dict):
    prompt = f"""You are a helpful weather assistant. Based on the following data, write a short, friendly recommendation (2-3 sentences) covering what to wear, whether to bring an umbrella or sunscreen, and any air quality concerns.
    
            Current conditions:
            - Temperature: {weather_data['temperature']}°C (feels like {weather_data['apparent_temperature']}°C)
            - Humidity: {weather_data['humidity']}%
            - UV index: {weather_data['uv_index']}

            Tomorrow's forecast:
            - High: {forecast_data['temperature_max']}°C, Low: {forecast_data['temperature_min']}°C
            - Chance of rain: {forecast_data['precipitation_probability_max']}%

            Air quality:
            - US EPA air quality category (1=Good, 6=Hazardous): {air_quality_data['us_aqi_category']}
        """
    
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        reasoning_effort="low"
    )
    
    return response.choices[0].message.content

@app.get("/weather/recommendations")
def get_recommendations(location_key: str = None, city: str = None, country_code: str = None, mode: str = "rule"):
    query, error = resolve_location_query(location_key, city, country_code)
    if error:
        return error

    weather_data = fetch_current_weather(query)
    forecast_data = get_tomorrow_forecast(query)
    air_quality_data = get_air_quality_data(query)

    result = {"weather": weather_data, "forecast": forecast_data, "air_quality": air_quality_data}

    if mode == "llm":
        result["recommendation"] = build_llm_recommendation(weather_data, forecast_data, air_quality_data)
    else:
        result["recommendation"] = build_recommendation(weather_data, forecast_data, air_quality_data)

    return result

@app.post("/weather/chat")
def weather_chat(request: ChatRequest):
    query, error = resolve_location_query(request.location_key, request.city, request.country_code)
    if error:
        return error

    weather_data = fetch_current_weather(query)
    forecast_data = get_tomorrow_forecast(query)
    air_quality_data = get_air_quality_data(query)

    system_context = f"""You are a helpful weather assistant for {request.location_key or request.city}. Keep your answers brief and direct, 1-3 sentences, no unnecessary padding or repeating the weather data back to the user.
        Current conditions: {weather_data['temperature']}°C, feels like {weather_data['apparent_temperature']}°C, humidity {weather_data['humidity']}%, UV index {weather_data['uv_index']}.
        Tomorrow: high {forecast_data['temperature_max']}°C, {forecast_data['precipitation_probability_max']}% chance of rain.
        Air quality (US EPA category 1-6, 1=Good): {air_quality_data['us_aqi_category']}."""

    messages = [{"role": "system", "content": system_context}]
    messages.extend(request.conversation_history)
    messages.append({"role": "user", "content": request.message})

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        max_tokens=300,
        reasoning_effort="low"
    )

    assistant_message = response.choices[0].message.content
    return {"reply": assistant_message}

import math
import ephem
from datetime import timezone
from zoneinfo import ZoneInfo

COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
           "S","SSW","SW","WSW","W","WNW","NW","NNW"]

def _compass(az_deg):
    return COMPASS[round(az_deg / 22.5) % 16]

def moon_position(lat, lon, local_dt, tz_id):
    obs = ephem.Observer()
    obs.lat, obs.lon = str(lat), str(lon)
    # ephem works in UTC, so convert the location's local time first
    utc = local_dt.replace(tzinfo=ZoneInfo(tz_id)).astimezone(timezone.utc)
    obs.date = utc.strftime("%Y/%m/%d %H:%M:%S")
    moon = ephem.Moon(obs)
    az = math.degrees(moon.az)
    return {
        "altitude": round(math.degrees(moon.alt), 1),
        "azimuth": round(az),
        "direction": _compass(az),
    }

def _parse_t(date_str, t_str):
    try:
        return datetime.strptime(f"{date_str} {t_str}", "%Y-%m-%d %I:%M %p")
    except ValueError:
        return None  # "No moonrise" etc.

def score_hour(h):
    cloud = h["cloud"]
    vis = h["vis_km"]
    pm25 = h.get("air_quality", {}).get("pm2_5", 0)
    hum = h["humidity"]

    cloud_s = 100 - cloud
    vis_s = min(vis / 10, 1) * 100
    pm_s = max(0, 100 - (pm25 / 55) * 100)
    hum_s = max(0, 100 - max(hum - 60, 0) * 2.5)

    total = 0.5 * cloud_s + 0.2 * vis_s + 0.2 * pm_s + 0.1 * hum_s
    if cloud >= 85:
        total = min(total, 35)
    return round(total)

def label(score):
    if score >= 80: return "Excellent"
    if score >= 60: return "Good"
    if score >= 40: return "Fair"
    return "Poor"

def moon_report(query: str):
    forecast_url = "https://api.weatherapi.com/v1/forecast.json"
    params = {
        "key": WEATHER_API_KEY,
        "q": query,
        "days": 2,
        "aqi": "yes",
        "alerts": "no",
    }
    response = requests.get(forecast_url, params=params, timeout=10)
    if response.status_code != 200:
        return {"error": f"Failed to fetch moon data: {response.status_code} - {response.text}"}

    response.raise_for_status()
    data = response.json()
    days = data["forecast"]["forecastday"]
    now = datetime.strptime(data["location"]["localtime"], "%Y-%m-%d %H:%M")

    sunset = _parse_t(days[0]["date"], days[0]["astro"]["sunset"])
    sunrise = _parse_t(days[1]["date"], days[1]["astro"]["sunrise"])

    loc = data["location"]
    lat, lon, tz_id = loc["lat"], loc["lon"], loc["tz_id"]
    rows = []
    for d in days:
        for h in d["hour"]:
            t = datetime.strptime(h["time"], "%Y-%m-%d %H:%M")
            if not (sunset <= t <= sunrise and t >= now.replace(minute=0)):
                continue
            pos = moon_position(lat, lon, t, tz_id)
            if pos["altitude"] <= 0:
                continue
            rows.append({
                "time": h["time"], "score": score_hour(h),
                "cloud": h["cloud"], "vis_km": h["vis_km"],
                **pos,
            })

    if not rows:
        return {"viewable": False, "reason": "Moon not up during dark hours"}

    best = max(rows, key=lambda x: x["score"])
    avg = round(sum(r["score"] for r in rows) / len(rows))

    first_time = rows[0]["time"]
    last_time = rows[-1]["time"]

    # use the astro block of the day the first visible hour falls on
    astro = next(d["astro"] for d in days if d["date"] == first_time[:10])
    return {
        "viewable": True,
        "phase": astro["moon_phase"],
        "illumination": astro["moon_illumination"],
        "moonrise": astro["moonrise"], 
        "moonset": astro["moonset"],
        "night_score": avg, 
        "night_label": label(avg),
        "best_hour": best["time"], 
        "best_score": best["score"],
        "best_label": label(best["score"]),
        "hours": rows,
        "best_direction": best["direction"],
        "best_altitude": best["altitude"]
    }

@app.get("/weather/moon")
def get_moongazing_data(location_key: str = None, city: str = None, country_code: str = None):
    query, error = resolve_location_query(location_key, city, country_code)
    if error:
        return error
    
    return moon_report(query)

# uvicorn main:app --reload --port 8000
# set GROQ_API_KEY=create_new_key_each time
# until i set a permanent solution with an .env file
