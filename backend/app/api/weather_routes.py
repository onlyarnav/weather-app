from fastapi import APIRouter
from app.services.weather_service import *

router = APIRouter()

@router.get("/current/{city}")
def current_weather(city: str):
    return get_weather(city)


@router.get("/forecast/{city}")
def forecast(city: str):
    return get_forecast(city)


@router.get("/search/{query}")
def search(query: str):
    return search_city(query)