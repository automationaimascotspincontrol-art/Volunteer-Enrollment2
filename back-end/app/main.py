"""
Application entry point.
- Creates FastAPI app
- Registers middleware
- Registers API routers
- Runs startup validation (env, DB, indexes)
"""
import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.middleware import (
    global_exception_handler,
    add_request_context,
    add_security_headers
)
from app.db import init_db
from app.db.client import close_db
from app.api.v1.routes import (
    auth, field, enrollment, clinical, admin, vboard, 
    search, registration, prescreening, users, prm, attendance, volunteers
)


# ============ Lifespan Management ============
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Validate environment and initialize database
    try:
        settings.validate()
        await init_db()
        print("✅ Database initialized and indexes created")
        
        # Debug: Print all routes
        print("\n--- Registered Routes ---")
        for route in app.routes:
            if hasattr(route, "path"):
                print(f"Route: {route.path} [{','.join(route.methods)}]")
        print("-------------------------\n")
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown: Clean up resources
    await close_db()
    print("✅ Database connection closed")


# ============ App Creation ============
app = FastAPI(
    title="Volunteer Enrollment System",
    description="MUVPL Clinical Trial Enrollment Management",
    version="1.0.0",
    lifespan=lifespan,
)


# ============ Middleware Registration ============
# CORS must be registered first (FastAPI processes in reverse order)
# Wildcard * with allow_credentials=True is invalid.
# Default to common frontend ports if not specified.
defaults = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
cors_origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else defaults
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID", "Accept"],  # Specific headers only
)

from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limiter import limiter
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Custom Middleware
app.middleware("http")(add_request_context)
app.middleware("http")(add_security_headers)


# ============ Global Exception Handler ============
@app.exception_handler(Exception)
async def handle_exception(request: Request, exc: Exception):
    return await global_exception_handler(request, exc)


# ============ API Router Registration ============
# API v1 routes - no business logic, just routing
app.include_router(auth.router, prefix="/api/v1")
app.include_router(field.router, prefix="/api/v1")
app.include_router(enrollment.router, prefix="/api/v1")
app.include_router(clinical.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(vboard.router, prefix="/api/v1")
app.include_router(registration.router, prefix="/api/v1/registration")
app.include_router(search.router, prefix="/api/v1/volunteers")
app.include_router(prescreening.router, prefix="/api/v1/prescreening")
app.include_router(users.router, prefix="/api/v1/users")
app.include_router(prm.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1/prm/attendance", tags=["Attendance"])
app.include_router(volunteers.router, prefix="/api/v1")


# ============ Health Check ============
@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "enrollment-backend"}


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "message": "Volunteer Enrollment API",
        "version": "1.0.0",
        "docs": "/docs"
    }
