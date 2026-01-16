"""
Data Aggregation Service for Report Generation
Collects and aggregates data from MongoDB for AI analysis
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

class DataAggregator:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_volunteer_statistics(self, date_range: Optional[Dict] = None) -> Dict:
        """Aggregate volunteer statistics"""
        try:
            # Try volunteers_master first (actual collection name), fall back to volunteers
            try:
                volunteer_collection = self.db["volunteers_master"]
                test_count = await volunteer_collection.count_documents({})
                if test_count == 0:
                    # Try alternative name
                    volunteer_collection = self.db["volunteers"]
            except:
                volunteer_collection = self.db["volunteers"]
            
            pre_screening = self.db["pre_screenings"]
            
            # Build date filter if provided
            date_filter = {}
            if date_range:
                start_date = date_range.get("start")
                end_date = date_range.get("end")
                if start_date and end_date:
                    date_filter["created_at"] = {"$gte": start_date, "$lte": end_date}
            
            # Get all volunteers
            all_volunteers = await volunteer_collection.count_documents({})
            
            # Get pre-screening volunteers
            pre_screening_count = await pre_screening.count_documents({})
            
            # Get approved volunteers (those in main volunteers collection)
            approved_count = all_volunteers
            
            # Get volunteers by gender - try multiple field names
            male_count = await volunteer_collection.count_documents({"$or": [
                {"gender": "Male"},
                {"pre_screening.gender": "Male"},
                {"basic_info.gender": "Male"}
            ]})
            female_count = await volunteer_collection.count_documents({"$or": [
                {"gender": "Female"},
                {"pre_screening.gender": "Female"},
                {"basic_info.gender": "Female"}
            ]})
            
            # Get recent enrollments (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_enrollments = await volunteer_collection.count_documents({
                "$or": [
                    {"createdAt": {"$gte": thirty_days_ago}},
                    {"created_at": {"$gte": thirty_days_ago}}
                ]
            })
            
            # Get volunteers by age groups
            age_distribution = []
            try:
                age_pipeline = [
                    {
                        "$bucket": {
                            "groupBy": "$age",
                            "boundaries": [18, 25, 35, 45, 55, 100],
                            "default": "Unknown",
                            "output": {"count": {"$sum": 1}}
                        }
                    }
                ]
                age_distribution = await volunteer_collection.aggregate(age_pipeline).to_list(None)
            except:
                pass
            
            # Calculate conversion rate
            total_applicants = pre_screening_count + approved_count
            conversion_rate = (approved_count / total_applicants * 100) if total_applicants > 0 else 0
            
            return {
                "total_volunteers": all_volunteers,
                "pre_screening": pre_screening_count,
                "approved": approved_count,
                "male_count": male_count,
                "female_count": female_count,
                "recent_enrollments_30days": recent_enrollments,
                "conversion_rate_percentage": round(conversion_rate, 2),
                "age_distribution": age_distribution,
                "total_applicants": total_applicants
            }
        except Exception as e:
            # Return empty stats if database access fails
            print(f"Error fetching volunteer statistics: {str(e)}")
            return {
                "total_volunteers": 0,
                "pre_screening": 0,
                "approved": 0,
                "male_count": 0,
                "female_count": 0,
                "recent_enrollments_30days": 0,
                "conversion_rate_percentage": 0,
                "age_distribution": [],
                "total_applicants": 0,
                "error": "Unable to fetch volunteer data"
            }
    
    async def get_study_metrics(self, date_range: Optional[Dict] = None) -> Dict:
        """Aggregate study/calendar metrics"""
        try:
            calendar_collection = self.db["calendar_events"]
            
            # Get all studies
            all_studies = await calendar_collection.count_documents({})
            
            # Get studies by status
            now = datetime.now()
            
            # Upcoming studies (start date in future)
            upcoming_pipeline = [
                {"$match": {"start": {"$gt": now}}},
                {"$count": "count"}
            ]
            
            # Ongoing studies (start date passed but end date not reached)
            ongoing_pipeline = [
                {"$match": {
                    "start": {"$lte": now},
                    "end": {"$gte": now}
                }},
                {"$count": "count"}
            ]
            
            # Completed studies (end date passed)
            completed_pipeline = [
                {"$match": {"end": {"$lt": now}}},
                {"$count": "count"}
            ]
            
            upcoming_result = await calendar_collection.aggregate(upcoming_pipeline).to_list(None)
            ongoing_result = await calendar_collection.aggregate(ongoing_pipeline).to_list(None)
            completed_result = await calendar_collection.aggregate(completed_pipeline).to_list(None)
            
            upcoming_count = upcoming_result[0]["count"] if upcoming_result else 0
            ongoing_count = ongoing_result[0]["count"] if ongoing_result else 0
            completed_count = completed_result[0]["count"] if completed_result else 0
            
            # Get total volunteers assigned across all studies
            total_assigned_pipeline = [
                {"$group": {
                    "_id": None,
                    "total_male": {"$sum": "$male_count"},
                    "total_female": {"$sum": "$female_count"},
                    "total_volunteers": {"$sum": {"$add": ["$male_count", "$female_count"]}}
                }}
            ]
            
            assigned_result = await calendar_collection.aggregate(total_assigned_pipeline).to_list(None)
            
            total_assigned = 0
            total_male_assigned = 0
            total_female_assigned = 0
            if assigned_result:
                total_assigned = assigned_result[0].get("total_volunteers", 0)
                total_male_assigned = assigned_result[0].get("total_male", 0)
                total_female_assigned = assigned_result[0].get("total_female", 0)
            
            # Get studies this month
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
            
            studies_this_month = await calendar_collection.count_documents({
                "start": {"$gte": month_start, "$lte": month_end}
            })
            
            return {
                "total_studies": all_studies,
                "upcoming_studies": upcoming_count,
                "ongoing_studies": ongoing_count,
                "completed_studies": completed_count,
                "studies_this_month": studies_this_month,
                "total_volunteers_assigned": total_assigned,
                "male_assigned": total_male_assigned,
                "female_assigned": total_female_assigned,
                "completion_rate_percentage": round((completed_count / all_studies * 100), 2) if all_studies > 0 else 0
            }
        except Exception as e:
            # Return empty metrics if database access fails
            print(f"Error fetching study metrics: {str(e)}")
            return {
                "total_studies": 0,
                "upcoming_studies": 0,
                "ongoing_studies": 0,
                "completed_studies": 0,
                "studies_this_month": 0,
                "total_volunteers_assigned": 0,
                "male_assigned": 0,
                "female_assigned": 0,
                "completion_rate_percentage": 0,
                "error": "Unable to fetch study data"
            }
    
    async def get_calendar_summary(self, days_ahead: int = 30) -> Dict:
        """Get calendar summary for upcoming period"""
        try:
            calendar_collection = self.db["calendar_events"]
            
            now = datetime.now()
            future_date = now + timedelta(days=days_ahead)
            
            # Get upcoming events
            upcoming_events = await calendar_collection.find({
                "start": {"$gte": now, "$lte": future_date}
            }).sort("start", 1).limit(10).to_list(None)
            
            # Format events for AI
            formatted_events = []
            for event in upcoming_events:
                formatted_events.append({
                    "title": event.get("title", "Untitled"),
                    "start": event.get("start").isoformat() if event.get("start") else None,
                    "end": event.get("end").isoformat() if event.get("end") else None,
                    "volunteers_needed": event.get("male_count", 0) + event.get("female_count", 0),
                    "remarks": event.get("remarks", "")
                })
            
            return {
                "upcoming_events_count": len(upcoming_events),
                "next_events": formatted_events,
                "days_ahead": days_ahead
            }
        except Exception as e:
            # Return empty calendar if database access fails
            print(f"Error fetching calendar summary: {str(e)}")
            return {
                "upcoming_events_count": 0,
                "next_events": [],
                "days_ahead": days_ahead,
                "error": "Unable to fetch calendar data"
            }
    
    async def aggregate_all_data(self, date_range: Optional[Dict] = None) -> Dict:
        """Aggregate all data for comprehensive report"""
        volunteer_stats = await self.get_volunteer_statistics(date_range)
        study_metrics = await self.get_study_metrics(date_range)
        calendar_summary = await self.get_calendar_summary()
        
        return {
            "generated_at": datetime.now().isoformat(),
            "date_range": date_range,
            "volunteers": volunteer_stats,
            "studies": study_metrics,
            "calendar": calendar_summary
        }

def get_data_aggregator(db: AsyncIOMotorDatabase) -> DataAggregator:
    """Create data aggregator instance"""
    return DataAggregator(db)
