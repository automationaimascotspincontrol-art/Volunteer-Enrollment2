"""
PRM Module - Timeline Engine
Handles timeline calculation, preview, and date generation from templates.
Ported from srcb/services/timelineEngine.js
"""
from datetime import datetime, timedelta
import re
from typing import Dict, Any
from fastapi import APIRouter, Body, Depends

from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user

router = APIRouter()

# Timeline color constants
TIMELINE_COLORS = {
    "T0": "#10b981",      # Green
    "T1": "#fbbf24",      # Yellow  
    "T2": "#3b82f6",      # Blue
    "T3": "#a855f7",      # Purple
    "SCREENING": "#6b7280", # Grey
    "DEFAULT": "#a855f7"  # Purple
}

def extract_number(text: str) -> int:
    """Extract first number from text string."""
    match = re.search(r'\d+', text)
    return int(match.group()) if match else 0

def get_color_for_visit(label: str) -> str:
    """Determine color code based on visit label."""
    upper = label.upper().strip()
    if upper in ["T0", "BASELINE"]:
        return TIMELINE_COLORS["T0"]
    if upper == "T1":
        return TIMELINE_COLORS["T1"]
    if upper == "T2":
        return TIMELINE_COLORS["T2"]
    if "SCREENING" in upper:
        return TIMELINE_COLORS["SCREENING"]
    # T3+ check
    if re.match(r"^T\d+$", upper):
        num = extract_number(upper)
        if num >= 3:
            return TIMELINE_COLORS["T3"]
    return TIMELINE_COLORS["DEFAULT"]

def parse_timeline_step(step: str) -> Dict[str, Any]:
    """
    Parse a timeline step string into offset components.
    Examples: "SCREENING", "T0", "T1", "T+7 Days", "T+2 Hours"
    """
    trimmed = step.strip()
    upper = trimmed.upper()
    
    # Defaults
    result = {
        "label": trimmed,
        "offsetDays": 0,
        "offsetHours": 0,
        "offsetMinutes": 0,
        "isScreening": False
    }

    # Screening
    if "SCREENING" in upper:
        result["offsetDays"] = -7
        result["isScreening"] = True
        return result
        
    # T0 / Baseline
    if upper in ["T0", "BASELINE"]:
        return result
        
    # T1, T2...
    if re.match(r"^T\d+$", upper):
        result["offsetDays"] = extract_number(upper)
        return result
        
    # T+X Days
    if re.search(r"T\+\d+\s*DAYS?", upper):
        result["offsetDays"] = extract_number(upper)
        return result
        
    # T+X Hours
    if re.search(r"T\+\d+\s*(HRS?|HOURS?)", upper):
        result["offsetHours"] = extract_number(upper)
        return result
        
    # T+X Mins
    if re.search(r"T\+\d+\s*(MINS?|MINUTES?)", upper):
        result["offsetMinutes"] = extract_number(upper)
        return result

    return result

@router.post("/timeline-preview")
async def timeline_preview(
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Preview timeline dates based on start date and template.
    Returns calculated visit dates with types and colors.
    """
    start_date_str = payload.get("startDate")
    template_str = payload.get("timelineTemplate")
    
    if not start_date_str or not template_str:
        return []
        
    try:
        base_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except ValueError:
        return []  # Invalid date format

    steps = [s.strip() for s in template_str.split(",") if s.strip()]
    preview_visits = []
    
    for i, step in enumerate(steps):
        offset = parse_timeline_step(step)
        
        # Calculate Date
        visit_date = base_date + timedelta(
            days=offset["offsetDays"], 
            hours=offset["offsetHours"], 
            minutes=offset["offsetMinutes"]
        )
        
        # Determine Type
        visit_type = "FOLLOW_UP"
        if offset["isScreening"]:
            visit_type = "SCREENING"
        elif i == 0 or (offset["offsetDays"] == 0 and offset["offsetHours"] == 0):
            visit_type = "BASELINE"
            
        color = get_color_for_visit(offset["label"])
        
        preview_visits.append({
            "visitLabel": offset["label"],
            "visitType": visit_type,
            "plannedDate": visit_date.strftime("%Y-%m-%d"),
            "status": "UPCOMING",
            "color": color
        })
            
    return preview_visits
