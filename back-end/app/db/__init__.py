"""
Database initialization and index creation.
Called on app startup to ensure MongoDB is ready.
"""
from app.db.client import db
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

from app.db.odm.study_master import StudyMaster
from app.db.odm.study_instance import StudyInstance
from app.db.odm.study_visit import StudyVisit
from app.db.odm.assigned_study import AssignedStudy
from app.db.odm.volunteer_attendance import VolunteerAttendance
from app.db.odm.audit_log import AuditLog
from app.db.odm.dashboard_analytics import DashboardAnalytics
# Add new User/Auth models later if moving fully to Beanie

async def init_db():
    """
    Initialize MongoDB indexes and Beanie ODM.
    Called once on app startup.
    """
    # Initialize Beanie
    # We need the client, not the database object for init_beanie sometimes depending on version,
    # but usually it takes 'database'.
    # Let's re-create client just to be safe or reuse from global if accessible.
    # existing 'db' is client[DATABASE_NAME]
    
    await init_beanie(database=db, document_models=[
        StudyMaster,
        StudyInstance,
        StudyVisit,
        AssignedStudy,
        VolunteerAttendance,
        AuditLog,
        DashboardAnalytics
    ])

    # ============ Volunteer Master Collection ============
    # ============ Volunteer Master Collection ============
    master = db.volunteers_master
    await master.create_index("volunteer_id", unique=True)
    await master.create_index("legacy_id")
    await master.create_index("current_stage")
    await master.create_index("current_status")
    await master.create_index("audit.created_at")

    # ============ Field Visit Drafts ============
    field_visits = db.field_visits
    await field_visits.create_index("contact", unique=True)
    await field_visits.create_index("field_area")
    await field_visits.create_index("audit.created_by")

    # ============ Prescreening Forms ============
    prescreen = db.prescreening_forms
    await prescreen.create_index("volunteer_id", unique=True)
    await prescreen.create_index("field_area")

    # ============ Registration Forms ============
    registration = db.registration_forms
    await registration.create_index("volunteer_id", unique=True)

    # ============ Clinical Participation ============
    clinical_part = db.clinical_participation
    await clinical_part.create_index([("study.study_code", 1), ("volunteer_id", 1)])
    await clinical_part.create_index("volunteer_ref.contact")

    # ============ Clinical Studies ============
    studies = db.clinical_studies
    await studies.create_index("study_code", unique=True)

    # ============ Users ============
    users = db.users
    await users.create_index("username", unique=True)

    # ============ Audit Logs ============
    audit_logs = db.audit_logs
    await audit_logs.create_index("timestamp")
    await audit_logs.create_index("entity_id")
    await audit_logs.create_index([("entity_type", 1), ("timestamp", -1)])

    # ============ ID Counters ============
    counters = db.counters
    if not await counters.find_one({"_id": "volunteer_id"}):
        await counters.insert_one({"_id": "volunteer_id", "seq": 0})
