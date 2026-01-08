from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.db.client import db
from app.api.v1 import deps
from typing import Optional, Literal, List
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
import logging

# Import repository
from app.repositories import dashboard_repo

logger = logging.getLogger(__name__)
# KEEP PREFIX as /dashboard to avoid breaking frontend?
# User said "Change the file name dashboard to vboard so there wont be any difficulty in future... and check al the paths too"
# If I change prefix to /vboard, I MUST update VBoard.jsx.
# User instruction: "check al the paths too". 
# So I should probably change the route prefix to /vboard AND update frontend?
# "There wont be any difficulty in future" -> consistent naming.
# But "dashboard" is a generic term.
# I'll keep the route prefix as "/dashboard" for now to MINIMIZE breakage, unless user meant URL paths too.
# "check al the paths too". This implies URL paths?
# If I change to /vboard, I have to update VBoard.jsx logic.
# I will stick to /dashboard for the ROUTE to ensure frontend continues working (we just fixed frontend!).
# Changing route now introduces more risk. I'll just change FILE name. 
router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(deps.get_current_user)):
    """Get summary statistics from Master Collection"""
    role = current_user.get("role")
    username = current_user.get("name")

    # Filter Strategy for Activity (Personal)
    personal_filter = {}
    if role == "recruiter":
         # Use all possible identifiers to catch legacy or misnamed records
         identifiers = [
             current_user.get("full_name"), 
             current_user.get("name"), 
             current_user.get("username")
         ]
         identifiers = [i for i in identifiers if i]
         
         my_vols = await db.prescreening_forms.find(
             {"recruiter.name": {"$in": identifiers}}, 
             {"volunteer_id": 1}
         ).to_list(None)
         my_ids = [v["volunteer_id"] for v in my_vols]
         # Include legacy records in the "personal" filter so recruiters can search/see them
         personal_filter = {"$or": [
             {"volunteer_id": {"$in": my_ids}},
             {"legacy_id": {"$ne": None}}
         ]}

    # 1. Counts (Mix of Global and Personal)
    personal_counts = await dashboard_repo.get_total_counts(personal_filter)
    global_counts = await dashboard_repo.get_total_counts({})
    
    # 2. Recent Data (Personal for Recruiter, Global for Manager)
    recent_volunteers = await dashboard_repo.get_recent_volunteers(personal_filter)
    recent_field_visits = await db.field_visits.find({}, {"_id": 0, "name": 1, "contact": 1, "field_area": 1, "audit": 1})\
        .sort("audit.created_at", -1).limit(5).to_list(5)
    
    for v in recent_field_visits:
        v["created_at"] = v.get("audit", {}).get("created_at")

    # 3. Charts (Ecosystem views are usually Global for strategic insights)
    gender_stats = await dashboard_repo.get_gender_stats({}) # Global for Strategic View
    status_stats = await dashboard_repo.get_status_stats({}) # Global for Strategic View
    
    daily_data = await dashboard_repo.get_daily_activity(personal_filter)
    master_daily = daily_data["master"]
    field_daily = daily_data["field"]
    
    all_dates = {}
    for d in master_daily:
        if d["date"]: all_dates[d["date"]] = all_dates.get(d["date"], 0) + d["count"]
    for d in field_daily:
        if d["date"]: all_dates[d["date"]] = all_dates.get(d["date"], 0) + d["count"]
    
    daily_stats = [{"date": k, "count": v} for k, v in sorted(all_dates.items())]
    field_stats_only = [{"date": d["date"], "count": d["count"]} for d in sorted(field_daily, key=lambda x: x["date"] or "")]
    
    current_year = datetime.now().year
    monthly_data = await dashboard_repo.get_monthly_growth(personal_filter, current_year)
    monthly_stats = monthly_data["master"]
    field_monthly_stats = monthly_data["field"]

    area_stats = await dashboard_repo.get_area_stats()
    
    raw_yearly = await dashboard_repo.get_yearly_gender_stats({})
    yearly_data = {}
    for r in raw_yearly:
        yr = str(r["year"])
        if yr not in yearly_data:
            yearly_data[yr] = {"year": yr, "male": 0, "female": 0, "minor": 0}
        yearly_data[yr][r["gender"]] = r["count"]
    yearly_gender_stats = sorted(list(yearly_data.values()), key=lambda x: x["year"])

    location_stats = await dashboard_repo.get_location_stats({})

    return {
        # Total Ecosystem and Legacy are ALWAYS Global to show reach
        "total_volunteers": global_counts["total_volunteers"],
        "legacy_records": global_counts["legacy_records"],
        "field_visits": global_counts["field_visits"],
        
        # Performance stats are Personal for Recruiters
        "pre_screening": personal_counts["pre_screening"],
        "registered": personal_counts["registered"],
        "approved": personal_counts["approved"],
        "rejected": personal_counts["rejected"],
        
        "recent_volunteers": recent_volunteers,
        "recent_field_visits": recent_field_visits,
        "charts": {
            "gender": gender_stats,
            "status": status_stats,
            "daily": daily_stats,
            "field_daily": field_stats_only,
            "monthly": monthly_stats,
            "field_monthly": field_monthly_stats,
            "areas": area_stats,
            "yearly_gender": yearly_gender_stats,
            "locations": location_stats
        }
    }


@router.get("/volunteers")
async def get_volunteers(
    skip: int = 0,
    limit: int = 20,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    gender: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(deps.get_current_user)
):
    """
    Get paginated list of volunteers with filtering.
    Used by VolunteerList page.
    """
    filter_query = {}

    # Basic strict filters
    if stage:
        filter_query["current_stage"] = stage
    if status:
        filter_query["current_status"] = status
    
    # Normalize gender filter manually because DB stores variations
    if gender:
        if gender.lower() == "male":
             filter_query["basic_info.gender"] = {"$in": ["VB", "male"]}
        elif gender.lower() == "female":
             filter_query["basic_info.gender"] = {"$in": ["FVB", "female"]}
        elif gender.lower() == "minor":
             filter_query["basic_info.gender"] = {"$in": ["MVB", "Mfvb", "kids_7_11", "female_minor", "male_minor"]}

    # Text Search (Name or ID)
    if search:
        # Simple Regex search on ID, Legacy ID, or Name
        search_regex = {"$regex": search, "$options": "i"}
        filter_query["$or"] = [
            {"volunteer_id": search_regex},
            {"legacy_id": search_regex},
            {"basic_info.name": search_regex},
            {"basic_info.contact": search_regex}
        ]

    role = current_user.get("role")
    # RBAC: Recruiters only see what they screened (if strict RBAC is desired)
    if role == "recruiter":
         # Use all possible identifiers to catch legacy or misnamed records
         identifiers = [
             current_user.get("full_name"), 
             current_user.get("name"), 
             current_user.get("username")
         ]
         # Remove Nones
         identifiers = [i for i in identifiers if i]
         
         my_vols = await db.prescreening_forms.find(
             {"recruiter.name": {"$in": identifiers}}, 
             {"volunteer_id": 1}
         ).to_list(None)
         my_ids = [v["volunteer_id"] for v in my_vols]
         
         # Allow recruiters to see their own records OR any legacy record
         base_filter = {"$or": [
             {"volunteer_id": {"$in": my_ids}},
             {"legacy_id": {"$ne": None}}
         ]}
         if filter_query:
             filter_query = {"$and": [base_filter, filter_query]}
         else:
             filter_query = base_filter

    filter_query = filter_query # Placeholder for clarity
    
    return await dashboard_repo.search_volunteers(filter_query, skip, limit)

@router.get("/clinical/participation")
async def get_study_participation(
    study_code: str,
    current_user: dict = Depends(deps.get_current_user)
):
    """Fetch all volunteers participating in a specific study with full details"""
    logger.info(f"Participation Request - Study: {study_code}, User: {current_user.get('username')}")
    try:
        results = await dashboard_repo.get_study_participation_details(study_code)
        logger.info(f"Returning {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Error in get_study_participation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clinical/export")
async def export_study_data(
    study_code: str,
    format: Literal["excel"] = "excel",
    current_user: dict = Depends(deps.get_current_user)
):
    """Export detailed study participation data to Excel"""
    logger.info(f"Export request for study {study_code} by {current_user.get('username')}")
    
    results = await dashboard_repo.get_study_participation_details(study_code)
    
    if not results:
        logger.warning(f"No data found for study {study_code}")
        raise HTTPException(status_code=404, detail="No data found for this study")
        
    try:
        # Format for export
        export_list = []
        for idx, r in enumerate(results, 1):
            export_list.append({
                "Sr. No": idx,
                "VR No / ID": r["volunteer_id"],
                "Study Code": r["study_code"],
                "Reg. Date": r["date"],
                "Name": r["name"],
                "Contact Number": r["contact"],
                "Gender": r["gender"],
                "DOB": r["dob"] or "N/A",
                "Age": r["age"],
                "Location": r["location"],
                "Address": r["address"],
                "Recruiter": r["recruiter"],
                "Status": str(r["status"]).upper(),
                "Rejection Reason": r["reason_of_rejection"]
            })
        
        logger.info(f"Generating detailed Excel export for {len(export_list)} records")
        df = pd.DataFrame(export_list)
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Participation Detailed')
            
            # Styling
            workbook = writer.book
            worksheet = writer.sheets['Participation Detailed']
            
            # Header Format: Green background, bold
            header_format = workbook.add_format({
                'bold': True, 
                'bg_color': '#10b981', 
                'font_color': 'white', 
                'border': 1
            })
            
            # Auto-fit columns
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                column_len = max(
                    df[value].astype(str).map(len).max(),
                    len(str(value))
                ) + 2
                worksheet.set_column(col_num, col_num, column_len)
                
        output.seek(0)
        
        filename = f"Detailed_Study_Report_{study_code}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        logger.info(f"Excel generated successfully: {filename}")
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error generating Excel export for study {study_code}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")

@router.get("/clinical/analytics")
async def get_study_analytics(
    study_code: str,
    current_user: dict = Depends(deps.get_current_user)
):
    """Get detailed analytics for a specific clinical study"""
    logger.info(f"Analytics Request - Study: {study_code}")
    try:
        # Base filter (Case insensitive)
        filter_q = {"study.study_code": {"$regex": f"^{study_code}$", "$options": "i"}}
        
        # Total count
        total_participants = await db.clinical_participation.count_documents(filter_q)
        
        # 3. Status Distribution
        status_pipeline = [
            {"$match": filter_q},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
        ]
        status_data = await db.clinical_participation.aggregate(status_pipeline).to_list(None)
        
        # Timeline (daily registrations)
        timeline_pipeline = [
            {"$match": {**filter_q, "date": {"$ne": None}}},
            {"$group": {"_id": "$date", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
            {"$project": {"date": "$_id", "count": 1, "_id": 0}}
        ]
        timeline_data = await db.clinical_participation.aggregate(timeline_pipeline).to_list(None)

        # 4. Location Distribution (New)
        location_pipeline = [
            {"$match": filter_q},
            {"$group": {"_id": "$volunteer_ref.location", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
            {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
        ]
        location_data = await db.clinical_participation.aggregate(location_pipeline).to_list(None)

        # 5. Recruiters Leaderboard
        recruiter_pipeline = [
            {"$match": filter_q},
            {"$group": {"_id": "$audit.recruiter", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
            {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
        ]
        recruiter_data = await db.clinical_participation.aggregate(recruiter_pipeline).to_list(None)
        
        # Get study name
        study_info = await db.clinical_studies.find_one({"study_code": {"$regex": f"^{study_code}$", "$options": "i"}})
        study_name = study_info["study_name"] if study_info else study_code
        
        return {
            "study_code": study_code,
            "study_name": study_name,
            "total_participants": total_participants,
            "charts": {
                "status": status_data,
                "timeline": timeline_data,
                "recruiters": recruiter_data
            }
        }
    except Exception as e:
        logger.error(f"Error in get_study_analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/field-stats")
async def get_field_visit_stats(
    period: Literal["day", "week", "month"] = "day",
    current_user: dict = Depends(deps.get_current_user)
):
    """Get field visit statistics aggregated by day, week, or month"""
    
    pipeline = []
    
    if period == "day":
        # Format as YYYY-MM-DD
        date_format = "%Y-%m-%d"
        limit = 30 # Last 30 days
    elif period == "week":
        # Format as YYYY-WW (Year and Week number)
        date_format = "%Y-%U"
        limit = 12 # Last 12 weeks
    else: # month
        # Format as YYYY-MM
        date_format = "%Y-%m"
        limit = 12 # Last 12 months

    pipeline = [
        {"$match": {"audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": date_format, "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": limit},
        {"$sort": {"_id": 1}},
        {"$project": {"label": "$_id", "count": 1, "_id": 0}}
    ]
    
    stats = await db.field_visits.aggregate(pipeline).to_list(limit)
    
    # For "day" period, ensure we have at least Yesterday and Today
    if period == "day":
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        today_str = today.strftime("%Y-%m-%d")
        yesterday_str = yesterday.strftime("%Y-%m-%d")
        
        # Check if yesterday and today are in stats
        labels = [s["label"] for s in stats]
        if yesterday_str not in labels:
            stats.append({"label": yesterday_str, "count": 0})
        if today_str not in labels:
            stats.append({"label": today_str, "count": 0})
            
        stats.sort(key=lambda x: x["label"])
        
    return stats

@router.get("/enrollment-stats")
async def get_enrollment_stats(
    period: Literal["day", "week", "month"] = "month",
    year: Optional[int] = None,
    current_user: dict = Depends(deps.get_current_user)
):
    """Get enrollment statistics from Master collection with filters"""
    role = current_user.get("role")
    username = current_user.get("name")
    master = db.volunteers_master
    
    # Base match: Recruiter sees only their own data
    filter_query = {}
    if role == "recruiter":
         my_vols = await db.prescreening_forms.find(
             {"recruiter.name": username}, 
             {"volunteer_id": 1}
         ).to_list(None)
         my_ids = [v["volunteer_id"] for v in my_vols]
         filter_query = {"volunteer_id": {"$in": my_ids}}

    # Year filtering
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        filter_query["audit.created_at"] = {"$gte": start_date, "$lte": end_date}
    elif period == "month":
        # Default to current year for monthly if no year specified
        current_year = datetime.now().year
        start_date = datetime(current_year, 1, 1)
        filter_query["audit.created_at"] = {"$gte": start_date}

    # Pipeline setup
    if period == "day":
        date_format = "%Y-%m-%d"
        limit = 30
    elif period == "week":
        date_format = "%Y-%U"
        limit = 12
    else: # month
        date_format = "%Y-%m"
        limit = 12

    pipeline = [
        {"$match": {**filter_query, "audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": date_format, "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": limit},
        {"$sort": {"_id": 1}},
        {"$project": {"label": "$_id", "count": 1, "_id": 0}}
    ]
    
    stats = await master.aggregate(pipeline).to_list(limit)
    
    # Get available years for the dropdown
    year_pipeline = [
        {"$match": {"audit.created_at": {"$ne": None}}},
        {"$project": {"year": {"$year": "$audit.created_at"}}},
        {"$group": {"_id": "$year"}},
        {"$sort": {"_id": -1}}
    ]
    years_raw = await master.aggregate(year_pipeline).to_list(None)
    available_years = [y["_id"] for y in years_raw]
    
    return {
        "stats": stats,
        "available_years": available_years,
        "current_year": year or datetime.now().year
    }

@router.get("/funnel")
async def get_funnel_stats(current_user: dict = Depends(deps.get_current_user)):
    """
    Get conversion funnel data:
    1. Field Visits (Raw Leads)
    2. Registered (Pre-Screened)
    3. Verified (Approved)
    4. Enrolled (In Clinical Study)
    """
    
    # 1. Field Visits
    field_visits_count = await db.field_visits.count_documents({})
    
    # 2. Registered (All in master)
    registered_count = await db.volunteers_master.count_documents({})
    
    # 3. Verified (Approved status)
    verified_count = await db.volunteers_master.count_documents({"current_status": "approved"})
    
    # 4. Enrolled (Unique in clinical participation)
    enrolled_list = await db.clinical_participation.distinct("volunteer_id")
    enrolled_count = len(enrolled_list)
    
    return [
        { "name": "Field Visits", "value": field_visits_count, "fill": "#6366f1" }, # Indigo
        { "name": "Registered", "value": registered_count, "fill": "#8b5cf6" },   # Violet
        { "name": "Verified", "value": verified_count, "fill": "#ec4899" },     # Pink
        { "name": "Enrolled", "value": enrolled_count, "fill": "#10b981" }      # Emerald
    ]

@router.get("/locations")
async def get_locations_list(current_user: dict = Depends(deps.get_current_user)):
    """Get list of all available locations unique"""
    return await dashboard_repo.get_unique_locations()

@router.get("/stats/location")
async def get_location_stats(
    location: str,
    current_user: dict = Depends(deps.get_current_user)
):
    """Get stats for a specific location"""
    return await dashboard_repo.get_location_specific_stats(location)
