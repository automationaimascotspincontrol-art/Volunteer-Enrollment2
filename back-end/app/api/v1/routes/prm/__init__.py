"""
PRM Module Router Aggregation
Combines all PRM sub-routers into a single router for main.py
"""
from fastapi import APIRouter

# Import sub-module routers
from . import studies, timeline

# Create main PRM router
router = APIRouter(tags=["PRM"])

# Include all sub-routers
router.include_router(studies.router, prefix="")
router.include_router(timeline.router, prefix="")

# NOTE: The original prm.py file (1159 lines) is being split into modules.
# Remaining endpoints (calendar, assignments, analytics) are still in the 
# original prm.py file. To complete the refactoring, create additional modules:
# - calendar.py: Calendar events, metrics, studies by status
# - assignments.py: Assigned studies CRUD and export
# - analytics.py: Dashboard metrics and analytics

# For now, to maintain backward compatibility, we need to import the
# remaining routes from the original prm.py file. This is a transitional state.

# Import remaining endpoints from original prm.py (temporarily)
import sys
import os
# Add parent directory to path to import old prm module
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
    
# Import only the endpoints not yet modularized
try:
    from .. import prm as legacy_prm
    
    # Calendar endpoints
    router.add_api_route("/calendar-events", legacy_prm.get_calendar_events, methods=["GET"])
    router.add_api_route("/calendar/metrics", legacy_prm.get_calendar_metrics, methods=["GET"])
    router.add_api_route("/studies-by-status", legacy_prm.get_studies_by_status, methods=["GET"])
    
    # Assignment endpoints
    router.add_api_route("/assigned-studies", legacy_prm.get_assigned_studies, methods=["GET"])
    router.add_api_route("/assigned-studies/export", legacy_prm.export_assigned_studies, methods=["GET"])
    router.add_api_route("/assigned-studies/{assignment_id}", legacy_prm.update_assigned_study_status, methods=["PATCH"])
    
    # Dashboard/Analytics endpoints
    router.add_api_route("/prm-dashboard", legacy_prm.get_dashboard_metrics, methods=["GET"])
    router.add_api_route("/prm-dashboard/search", legacy_prm.search_dashboard, methods=["GET"])
    router.add_api_route("/prm-dashboard/analytics", legacy_prm.get_analytics, methods=["GET"])
    router.add_api_route("/dashboard/timeline-workload", legacy_prm.get_timeline_workload, methods=["GET"])
    
except ImportError as e:
    # If we can't import legacy routes, log warning but continue
    import logging
    logging.warning(f"Could not import legacy PRM routes: {e}")
    logging.warning("Some PRM endpoints may not be available until full refactoring is complete")
