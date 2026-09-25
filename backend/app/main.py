from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import assistant, auth, civic, command_center, osm, weather
from app.core.database import init_models
from app.core.logging_config import configure_logging, logger
from app.scripts.seed_admin import seed_admin_if_needed
from app.utils.tracing import configure_langsmith

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MEDIA_DIR.mkdir(exist_ok=True)

configure_logging()
configure_langsmith()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CivicAI backend...")
    try:
        await init_models()
        logger.info("Database models initialized")
        await seed_admin_if_needed()
    except Exception as exc:  # noqa: BLE001
        logger.error(f"DB init failed (will retry on first request): {exc}")
    yield
    logger.info("Shutting down CivicAI backend...")


app = FastAPI(
    title="CivicAI API",
    description="Multi-agent AI platform for Pakistani citizen government services",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again later."},
    )


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "civicai-backend"}


app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")
# Also served under /api/media: the Android client builds image URLs as
# BuildConfig.CIVICAI_BASE_URL (which ends in /api) + the stored image_url
# (which starts with /media/...), so requests actually land on /api/media/...
app.mount("/api/media", StaticFiles(directory=str(MEDIA_DIR)), name="media_api")

app.include_router(auth.router, prefix="/api")
app.include_router(civic.router, prefix="/api")
app.include_router(command_center.router, prefix="/api")
app.include_router(osm.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
