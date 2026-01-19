"""
Washout period calculations for multi-study volunteer management.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional


def calculate_washout_date(study_end_date, washout_days: int) -> Optional[datetime]:
    """
    Calculate when volunteer is available after washout period.
    
    Args:
        study_end_date: Study end date or DRT washout date (datetime or ISO string)
        washout_days: Number of washout days required
        
    Returns:
        datetime when washout is complete, or None if dates unavailable
    """
    if not study_end_date:
        return None
    
    # Convert to datetime if string
    if isinstance(study_end_date, str):
        try:
            end_date = datetime.fromisoformat(study_end_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None
    else:
        end_date = study_end_date
    
    # Ensure timezone-aware
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    
    washout_complete = end_date + timedelta(days=washout_days)
    return washout_complete


def check_washout_conflict(washout_complete_date, new_study_start: datetime) -> Optional[bool]:
    """
    Check if washout period conflicts with new study start date.
    
    Args:
        washout_complete_date: When washout period ends
        new_study_start: When new study begins
        
    Returns:
        True if conflict (new study starts before washout complete),
        False if OK,
        None if can't determine
    """
    if not washout_complete_date or not new_study_start:
        return None  # Can't determine
    
    # Ensure timezone-aware comparison
    if isinstance(new_study_start, str):
        try:
            new_study_start = datetime.fromisoformat(new_study_start.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None
    
    if new_study_start.tzinfo is None:
        new_study_start = new_study_start.replace(tzinfo=timezone.utc)
    
    return new_study_start < washout_complete_date  # True = conflict


def format_washout_status(washout_complete_date, new_study_start: datetime) -> str:
    """
    Get human-readable washout status.
    
    Returns:
        "OK" if no conflict
        "CONFLICT" if study starts before washout complete
        "UNKNOWN" if can't determine
    """
    conflict = check_washout_conflict(washout_complete_date, new_study_start)
    
    if conflict is None:
        return "UNKNOWN"
    elif conflict:
        return "CONFLICT"
    else:
        return "OK"
