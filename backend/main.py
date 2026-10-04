from fastapi import FastAPI
import requests
from groq import Groq
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []
    location_key: str = None
    city: str = None
    country_code: str = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FIXED_LOCATIONS = {
    "makati" : {"latitude": 14.5547, "longitude": 121.0244},
    "baguio" : {"latitude": 16.4023, "longitude": 120.5960},
    "uplb" : {"latitude": 14.1700, "longitude": 121.2430},
}

client = Groq(api_key=os.environ["GROQ_API_KEY"])

@app.get("/health")
def healthcheck():
    return {"status": "ok"}

def get_coordinates(city: str, count: int = 1, country_code: str = None):
    coord_url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": city,
        "count": count
    }
    if country_code:
        params["country_code"] = country_code
    response = requests.get(coord_url, params=params)
    if response.status_code == 200:
        data = response.json()
        if "results" not in data or not data['results']:
            return None
        result = data['results'][0]
        return {
            "latitude": result["latitude"],
            "longitude": result["longitude"]
        }
    else:
        return {"error": "Failed to fetch data from the geocoding API"}

def resolve_location(location_key: str = None, city: str = None, country_code: str = None):
    if location_key:
        if location_key not in FIXED_LOCATIONS:
            return None, {"error": f"Unknown location key: {location_key}"}
        loc = FIXED_LOCATIONS[location_key]
        return (loc["latitude"], loc["longitude"]), None
    elif city:
        coords = get_coordinates(city, country_code=country_code)
        if coords is None:
            return None, {"error": f"Could not find location: {city}"}
        return (coords["latitude"], coords["longitude"]), None
    else:
        return None, {"error": "Please provide either a location_key or a city name."}

def fetch_current_weather(lat: float, lon: float):
    weather_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index"
    }
    response = requests.get(weather_url, params=params)
    if response.status_code == 200:
        data = response.json()
        current = data["current"]
        return {
            "temperature": current["temperature_2m"],
            "humidity": current["relative_humidity_2m"],
            "apparent_temperature": current["apparent_temperature"],
            "precipitation": current["precipitation"],
            "weather_code": current["weather_code"],
            "wind_speed": current["wind_speed_10m"],
            "uv_index": current["uv_index"]
        }
    else:
        return {"error": "Failed to fetch weather data"}

@app.get("/weather/current")
def get_current_weather(location_key: str = None, city: str = None, country_code: str = None):
    coords, error = resolve_location(location_key, city, country_code)
    if error:
        return error
    lat, lon = coords

    return fetch_current_weather(lat, lon)

def get_tomorrow_forecast(lat: float, lon: float):
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,uv_index_max",
        "timezone": "auto",
        "forecast_days": 2
    }
    response = requests.get(forecast_url, params=params)
    if response.status_code == 200:
        data = response.json()
        daily = data["daily"]

        return {
            "date": daily["time"][1],
            "temperature_max": daily["temperature_2m_max"][1],
            "temperature_min": daily["temperature_2m_min"][1],
            "precipitation_probability_max": daily["precipitation_probability_max"][1],
            "weathercode": daily["weathercode"][1],
            "uv_index_max": daily["uv_index_max"][1]
        }
    else:
        return {"error": "Failed to fetch forecast data"}


@app.get("/weather/forecast")
def get_forecast(location_key: str = None, city: str = None, country_code: str = None):
    coords, error = resolve_location(location_key, city, country_code)
    if error:
        return error
    lat, lon = coords

    return get_tomorrow_forecast(lat, lon)

def get_air_quality(lat: float, lon: float):
    air_quality_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "pm10,pm2_5,us_aqi"
    }
    response = requests.get(air_quality_url, params=params)
    if response.status_code == 200:
        data = response.json()
        current = data["current"]
        return {
            "pm10": current["pm10"],
            "pm2_5": current["pm2_5"],
            "us_aqi": current["us_aqi"]
        }
    else:
        return {"error": "Failed to fetch air quality data"}

@app.get("/weather/air_quality")
def get_air_quality_endpoint(location_key: str = None, city: str = None, country_code: str = None):
    coords, error = resolve_location(location_key, city, country_code)
    if error:
        return error
    lat, lon = coords

    return get_air_quality(lat, lon)


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

def rain_recommendation(precipitation: float):
    match precipitation:
        case amount if amount == 0:
            return "No rain expected. No rain gear needed."
        case amount if 0 < amount <= 30:
            return "Light rain expected. Consider bringing an umbrella."
        case amount if 30 < amount <= 60:
            return "Moderate rain expected. Bring an umbrella and waterproof clothing."
        case amount if amount > 60:
            return "Heavy rain expected. Wear waterproof clothing and bring an umbrella."

def air_quality_recommendation(us_aqi: float):
    match us_aqi:
        case aqi if aqi <=50:
            return "Air quality is good. No precautions needed."
        case aqi if 51 <= aqi <= 100:
            return "Air quality is moderate. Sensitive individuals should consider limiting outdoor activities."
        case aqi if 101 <= aqi <= 150:
            return "Air quality is unhealthy for sensitive groups. Limit prolonged outdoor exertion."
        case aqi if aqi > 150:
            return "Air quality is unhealthy. Everyone should limit outdoor activities."

def build_recommendation(weather_data: dict, forecast_data: dict, air_quality_data: dict):
    return{
        "clothing": clothing_recommendation(weather_data["apparent_temperature"]),
        "sun_protection": sun_protection_recommendation(weather_data["uv_index"]),
        "rain_gear": rain_recommendation(forecast_data["precipitation_probability_max"]),
        "air_quality": air_quality_recommendation(air_quality_data["us_aqi"])
    }

# @app.get("/weather/recommendations")
# def get_recommendations(location_key: str = None, city: str = None, country_code: str = None):
#     coords, error = resolve_location(location_key, city, country_code)
#     if error:
#         return error
#     lat, lon = coords
# 
#     weather_data = fetch_current_weather(lat, lon)
#     forecast_data = get_tomorrow_forecast(lat, lon)
#     air_quality_data = get_air_quality(lat, lon)
# 
#     return {"weather": weather_data, "forecast": forecast_data, "air_quality": air_quality_data, "recommendation": build_recommendation(weather_data, forecast_data, air_quality_data)}

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
            - US AQI: {air_quality_data['us_aqi']}
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
    coords, error = resolve_location(location_key, city, country_code)
    if error:
        return error
    lat, lon = coords

    weather_data = fetch_current_weather(lat, lon)
    forecast_data = get_tomorrow_forecast(lat, lon)
    air_quality_data = get_air_quality(lat, lon)

    result = {"weather": weather_data, "forecast": forecast_data, "air_quality": air_quality_data}

    if mode == "llm":
        result["recommendation"] = build_llm_recommendation(weather_data, forecast_data, air_quality_data)
    else:
        result["recommendation"] = build_recommendation(weather_data, forecast_data, air_quality_data)

    return result

@app.post("/weather/chat")
def weather_chat(request: ChatRequest):
    coords, error = resolve_location(request.location_key, request.city, request.country_code)
    if error:
        return error
    lat, lon = coords

    weather_data = fetch_current_weather(lat, lon)
    forecast_data = get_tomorrow_forecast(lat, lon)
    air_quality_data = get_air_quality(lat, lon)

    system_context = f"""You are a helpful weather assistant for {request.location_key or request.city}. Keep your answers brief and direct, 1-3 sentences, no unnecessary padding or repeating the weather data back to the user.
        Current conditions: {weather_data['temperature']}°C, feels like {weather_data['apparent_temperature']}°C, 
        humidity {weather_data['humidity']}%, UV index {weather_data['uv_index']}.
        Tomorrow: high {forecast_data['temperature_max']}°C, {forecast_data['precipitation_probability_max']}% chance of rain.
        Air quality (US AQI): {air_quality_data['us_aqi']}."""

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


# uvicorn main:app --reload --port 8000
# set GROQ_API_KEY=create_new_key_each time
# until i set a permanent solution with an .env file
