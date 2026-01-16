"""
Reports API routes for AI-generated summaries and insights
Accessible to management, game_master, and prm roles
"""

import logging
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timedelta
from enum import Enum

from app.api.v1 import deps
from app.services.ai_service import get_ai_service
from app.services.data_aggregator import get_data_aggregator
from app.core.rate_limiter import limiter
from app.db.mongodb import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])

class ReportType(str, Enum):
    OVERALL = "overall_summary"
    VOLUNTEERS = "volunteer_insights"
    STUDIES = "study_performance"
    CUSTOM = "custom"

class DateRangeRequest(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None

class ReportRequest(BaseModel):
    report_type: ReportType
    date_range: Optional[DateRangeRequest] = None
    custom_prompt: Optional[str] = Field(None, max_length=500, description="Custom question for AI (max 500 chars)")

class ReportResponse(BaseModel):
    report_type: str
    generated_at: datetime
    summary: str
    raw_data: Dict
    date_range: Optional[Dict] = None

def require_report_access(current_user: dict = Depends(deps.get_current_user)):
    """Ensure user has management, game_master, or prm role"""
    allowed_roles = ["management", "game_master", "prm"]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reports are only accessible to management, game_master, and prm users"
        )
    return current_user

@router.post("/generate", response_model=ReportResponse)
@limiter.limit("100/hour")  # Increased for testing - was 10/hour
async def generate_report(
    request: Request,
    body: ReportRequest,
    current_user: dict = Depends(require_report_access)
):
    """
    Generate AI-powered report based on requested type
    Rate limited to 100 requests per hour per user
    """
    try:
        logger.info(f"Starting report generation for user: {current_user.get('username')}, type: {body.report_type}")
        
        # Initialize services
        try:
            ai_service = get_ai_service()
            logger.info("AI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI API configuration error: {str(e)}"
            )
        
        try:
            aggregator = get_data_aggregator(db)
            logger.info("Data aggregator initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize data aggregator: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection error: {str(e)}"
            )
        
        # Parse date range if provided
        date_range_dict = None
        if body.date_range:
            date_range_dict = {
                "start": body.date_range.start,
                "end": body.date_range.end
            }
        
        # Aggregate data based on report type
        try:
            if body.report_type == ReportType.OVERALL:
                logger.info("Aggregating data for overall summary")
                raw_data = await aggregator.aggregate_all_data(date_range_dict)
                logger.info(f"Data aggregated successfully: {len(str(raw_data))} bytes")
                
                logger.info("Calling AI API for overall summary")
                summary = await ai_service.generate_overall_summary(raw_data)
                logger.info("AI API call successful")
            
            elif body.report_type == ReportType.VOLUNTEERS:
                logger.info("Aggregating volunteer data")
                volunteer_data = await aggregator.get_volunteer_statistics(date_range_dict)
                raw_data = {
                    "volunteers": volunteer_data,
                    "generated_at": datetime.now().isoformat()
                }
                logger.info("Calling AI API for volunteer insights")
                summary = await ai_service.generate_volunteer_insights(raw_data)
            
            elif body.report_type == ReportType.STUDIES:
                logger.info("Aggregating study data")
                study_data = await aggregator.get_study_metrics(date_range_dict)
                calendar_data = await aggregator.get_calendar_summary()
                raw_data = {
                    "studies": study_data,
                    "calendar": calendar_data,
                    "generated_at": datetime.now().isoformat()
                }
                logger.info("Calling AI API for study performance")
                summary = await ai_service.generate_study_performance(raw_data)
            
            elif body.report_type == ReportType.CUSTOM:
                if not body.custom_prompt:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="custom_prompt is required for custom reports"
                    )
                
                logger.info(f"Aggregating data for custom query: {body.custom_prompt[:50]}...")
                raw_data = await aggregator.aggregate_all_data(date_range_dict)
                logger.info("Calling AI API for custom report")
                summary = await ai_service.generate_custom_report(body.custom_prompt, raw_data)
            
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid report type: {body.report_type}"
                )
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during data aggregation or AI generation: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report generation failed: {str(e)}"
            )
        
        # Log the report generation
        logger.info(f"Report generated successfully: type={body.report_type}, user={current_user.get('username')}")
        
        return ReportResponse(
            report_type=body.report_type.value,
            generated_at=datetime.now(),
            summary=summary,
            raw_data=raw_data,
            date_range=date_range_dict
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report. Please try again."
        )

@router.get("/metrics")
async def get_raw_metrics(
    current_user: dict = Depends(require_report_access)
):
    """
    Get raw metrics data without AI analysis
    Useful for quick dashboard views
    """
    try:
        aggregator = get_data_aggregator(db)
        data = await aggregator.aggregate_all_data()
        
        logger.info(f"Metrics retrieved by user={current_user.get('username')}")
        
        return data
    
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch metrics"
        )

@router.get("/health")
async def check_api_health(current_user: dict = Depends(require_report_access)):
    """Check if AI API is properly configured"""
    try:
        ai_service = get_ai_service()
        return {
            "status": "healthy",
            "ai_configured": True,
            "model": ai_service.model
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "ai_configured": False,
            "error": str(e)
        }

