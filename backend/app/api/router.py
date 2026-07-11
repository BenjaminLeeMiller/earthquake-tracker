from fastapi import APIRouter

from app.api.globe import router as globe_router
from app.api.cells import router as cells_router
from app.api.earthquakes import router as earthquakes_router

api_router = APIRouter(prefix="/api")
api_router.include_router(globe_router)
api_router.include_router(cells_router)
api_router.include_router(earthquakes_router)
