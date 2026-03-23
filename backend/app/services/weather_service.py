import requests
from app.core.config import API_KEY, BASE_URL

def get_weather(city):
    url = f"{BASE_URL}/current.json"

    params = {
        "key": API_KEY,
        "q": city
    }

    response = requests.get(url, params=params)

    return response.json()

def get_forecast(city, days=3):

    url = f"{BASE_URL}/forecast.json"

    params = {
        "key": API_KEY,
        "q": city,
        "days": days
    }

    response = requests.get(url, params=params)

    return response.json()

def search_city(query):

    url = f"{BASE_URL}/search.json"

    params = {
        "key": API_KEY,
        "q": query
    }

    response = requests.get(url, params=params)

    return response.json()