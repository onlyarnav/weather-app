from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.weather_routes import router

app = FastAPI()

app.include_router(router)

# serve frontend files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
def home():
    return FileResponse("../frontend/index.html")