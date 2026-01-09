"""
PRM Module Router Aggregation
Combines all PRM sub-routers into a single router for main.py
"""
from fastapi import APIRouter

# Import all sub-module routers
from . import studies, timeline, calendar, assignments, analytics

# Create main PRM router
router = APIRouter(tags=["PRM"])

# Include all sub-routers
router.include_router(studies.router, prefix="")
router.include_router(timeline.router, prefix="")
router.include_router(calendar.router, prefix="")
router.include_router(assignments.router, prefix="")
router.include_router(analytics.router, prefix="")
