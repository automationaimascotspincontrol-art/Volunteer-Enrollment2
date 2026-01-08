"""
Cross-cutting request handling.
Handles request ID injection, rate limiting, global error catching.
"""
import uuid
import time
from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


async def add_request_id_middleware(request: Request, call_next):
    """Inject a unique request ID for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    # Log request duration
    duration = time.time() - start_time
    logger.info(f"[{request_id}] {request.method} {request.url.path} completed in {duration:.2f}s")
    
    return response


async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return structured error response."""
    import traceback
    
    request_id = getattr(request.state, "request_id", "unknown")
    error_trace = traceback.format_exc()
    
    logger.error(f"[{request_id}] UNHANDLED EXCEPTION: {str(exc)}\n{error_trace}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "request_id": request_id,
            # SECURITY: Never leak exception details or traceback to client
        }
    )


async def add_request_context(request: Request, call_next):
    """Inject request ID and handle request/response logging."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        # Log request duration
        duration = time.time() - start_time
        logger.info(f"[{request_id}] {request.method} {request.url.path} completed in {duration:.2f}s")
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"[{request_id}] {request.method} {request.url.path} failed in {duration:.2f}s: {str(e)}")
        raise


async def add_security_headers(request: Request, call_next):
    """Add comprehensive security headers to all responses."""
    response = await call_next(request)
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # XSS Protection (legacy but still useful)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Force HTTPS (only applies if site is served over HTTPS)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Content Security Policy - restrict resource loading
    # Adjusted for API - frontend should set its own CSP
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "frame-ancestors 'none'"
    )
    
    # Referrer policy - don't leak referrer information
    response.headers["Referrer-Policy"] = "no-referrer"
    
    # Permissions policy - disable unnecessary browser features
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response

