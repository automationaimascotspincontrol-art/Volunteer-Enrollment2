"""
PRM Module - Study Management
Handles study master retrieval and study instance CRUD operations.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
import logging
from bson import ObjectId
from beanie import PydanticObjectId

from app.db.odm.study_master import StudyMaster
from app.db import db
from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user
from .timeline import parse_timeline_step, get_color_for_visit

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/study-masters")
async def get_study_masters(
    user: UserBase = Depends(get_current_user)
):
    """List all study master names/types for dropdown."""
    try:
        studies = await StudyMaster.find(StudyMaster.is_active == True).to_list(1000)
        
        results = []
        for s in studies:
            dump = s.model_dump(by_alias=True)
            if hasattr(s, "id"):
                dump["_id"] = str(s.id)
            elif "_id" in dump:
                dump["_id"] = str(dump["_id"])
            
            if "studyID" in dump:
                dump["studyCode"] = dump["studyID"]
                
            results.append(dump)
            
        return results
    except Exception as e:
        logger.error(f"Error fetching study masters: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching study masters")

@router.post("/study-instance")
async def create_study_instance(
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """Create a new study instance and its visits."""
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    instance_data = payload.get("studyInstance")
    visits_data = payload.get("visits") or payload.get("customVisits")

    if not instance_data:
        raise HTTPException(status_code=400, detail="Missing studyInstance data")

    # ====== COMPREHENSIVE BACKEND VALIDATION ======
    validation_errors = []

    # 1. Study Code Validation & Uniqueness Check
    study_code = instance_data.get("enteredStudyCode") or instance_data.get("studyInstanceCode")
    if not study_code or len(study_code.strip()) < 3:
        validation_errors.append("Study code must be at least 3 characters")
    else:
        # Check uniqueness
        existing = await db.study_instances.find_one({
            "$or": [
                {"enteredStudyCode": study_code},
                {"studyInstanceCode": study_code}
            ]
        })
        if existing:
            validation_errors.append(f"Study code '{study_code}' already exists. Please use a unique code.")

    # 2. Volunteer Count Validation
    volunteers_planned = instance_data.get("volunteersPlanned")
    if not volunteers_planned or volunteers_planned <= 0:
        validation_errors.append("Volunteers planned must be greater than 0")
    elif volunteers_planned > 1000:
        validation_errors.append("Volunteers planned exceeds maximum (1000)")

    # 3. Gender Ratio Validation
    gender_ratio = instance_data.get("genderRatio", {})
    if gender_ratio:
        total = gender_ratio.get("female", 0) + gender_ratio.get("male", 0) + gender_ratio.get("minor", 0)
        if total != 100:
            validation_errors.append(f"Gender ratio must total 100% (currently {total}%)")
    
    # 4. Age Range Validation
    age_range = instance_data.get("ageRange", {})
    if age_range:
        age_from = age_range.get("from")
        age_to = age_range.get("to")
        if age_from is None or age_to is None:
            validation_errors.append("Age range must be specified")
        elif age_from < 0 or age_to < 0:
            validation_errors.append("Age range cannot be negative")
        elif age_from >= age_to:
            validation_errors.append(f"Age 'from' ({age_from}) must be less than 'to' ({age_to})")

    # 5. Date Validation
    start_date_str = instance_data.get("startDate")
    if start_date_str:
        try:
            start_date_obj = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            
            # Check DRT date logic
            drt_date_str = instance_data.get("drtWashoutDate")
            if drt_date_str:
                try:
                    drt_date_obj = datetime.strptime(drt_date_str, "%Y-%m-%d").date()
                    if drt_date_obj < start_date_obj:
                        validation_errors.append("DRT washout date cannot be before study start date")
                except:
                    validation_errors.append("Invalid DRT washout date format")
                    
        except ValueError:
            validation_errors.append("Invalid start date format")

    # 6. Conflict Detection - Check for overlapping studies
    if start_date_str and visits_data:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            # Get last visit date
            last_visit_date = start_date
            for visit in visits_data:
                visit_date_str = visit.get("plannedDate")
                if visit_date_str:
                    try:
                        if isinstance(visit_date_str, str):
                            visit_date = datetime.fromisoformat(visit_date_str.replace("Z", ""))
                        else:
                            visit_date = visit_date_str
                        if visit_date > last_visit_date:
                            last_visit_date = visit_date
                    except:
                        pass
            
            # Check for overlapping studies (same dates, same volunteers requirement)
            overlapping = await db.study_instances.find({
                "startDate": {"$lte": last_visit_date.strftime("%Y-%m-%d")},
                "$or": [
                    {"status": {"$in": ["UPCOMING", "ONGOING", "upcoming", "ongoing"]}},
                    {"status": {"$exists": False}}
                ]
            }).to_list(100)
            
            if len(overlapping) > 5:  # Soft warning threshold
                logger.warning(f"High number of overlapping studies: {len(overlapping)}")
                
        except Exception as e:
            logger.warning(f"Conflict check error: {str(e)}")

    # Return validation errors if any
    if validation_errors:
        raise HTTPException(
            status_code=400, 
            detail=" • ".join(validation_errors)
        )

    # ====== PROCEED WITH CREATION ======
    # Add metadata
    user_id = str(user.get("id") or user.get("_id") or "system")
    instance_data["createdBy"] = user_id
    instance_data["createdAt"] = datetime.now(timezone.utc)
    
    # Determine status based on start date
    initial_status = "ONGOING"
    if "startDate" in instance_data and instance_data["startDate"]:
        try:
            start_date_str = instance_data["startDate"]
            start_date_obj = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            today = datetime.now(timezone.utc).date()
            if start_date_obj > today:
                initial_status = "UPCOMING"
            else:
                initial_status = "ONGOING"
        except Exception:
            initial_status = "ONGOING"

    instance_data["status"] = initial_status
    
    if "_id" in instance_data:
        del instance_data["_id"]

    # Insert Instance
    try:
        res = await db.study_instances.insert_one(instance_data)
        instance_id = str(res.inserted_id)
    except Exception as e:
        logger.error(f"Error inserting study instance: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error creating study instance")

    # Generate/Insert Visits
    visits_to_insert = []
    
    if visits_data and isinstance(visits_data, list) and len(visits_data) > 0:
        for v in visits_data:
            visit_doc = v.copy()
            visit_doc["studyInstanceId"] = instance_id
            if "status" not in visit_doc: visit_doc["status"] = "UPCOMING"
            
            if "plannedDate" in visit_doc and isinstance(visit_doc["plannedDate"], str):
                try:
                    pd = visit_doc["plannedDate"]
                    if pd.endswith("Z"):
                        pd = pd[:-1]
                    if "T" in pd:
                         visit_doc["plannedDate"] = datetime.fromisoformat(pd)
                    else:
                         visit_doc["plannedDate"] = datetime.strptime(pd, "%Y-%m-%d")
                except Exception as e:
                    logger.warning(f"Date conversion error for {visit_doc.get('plannedDate')}: {str(e)}")
                    pass

            if "color" not in visit_doc:
                visit_doc["color"] = get_color_for_visit(visit_doc.get("visitLabel", ""))
            
            if "_id" in visit_doc:
                del visit_doc["_id"]
                
            visits_to_insert.append(visit_doc)
            
    else:
        # Fallback: Generate from Template
        study_master_id = instance_data.get("studyMasterId") or instance_data.get("studyID")
        template_str = None
        
        if study_master_id:
             try:
                 if ObjectId.is_valid(study_master_id):
                     master = await StudyMaster.find_one(StudyMaster.id == PydanticObjectId(study_master_id))
                 else:
                     master = await StudyMaster.find_one(StudyMaster.study_id == str(study_master_id))
                 
                 if master:
                     template_str = master.timeline_template
             except:
                 pass

        start_date_str = instance_data.get("startDate")
        
        if start_date_str and template_str:
            try:
                base_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                steps = [s.strip() for s in template_str.split(",") if s.strip()]
                
                for i, step in enumerate(steps):
                    offset = parse_timeline_step(step)
                    visit_date = base_date + timedelta(
                        days=offset["offsetDays"], 
                        hours=offset["offsetHours"], 
                        minutes=offset["offsetMinutes"]
                    )
                    
                    visit_type = "FOLLOW_UP"
                    if offset["isScreening"]: visit_type = "SCREENING"
                    elif i == 0: visit_type = "BASELINE"
                    
                    visits_to_insert.append({
                        "studyInstanceId": instance_id,
                        "visitLabel": offset["label"],
                        "visitType": visit_type,
                        "plannedDate": visit_date,
                        "status": "UPCOMING",
                        "color": get_color_for_visit(offset["label"])
                    })
            except Exception as e:
                 logger.error(f"Fallback visit generation error: {str(e)}")

    # Bulk Insert Visits
    if visits_to_insert:
        try:
            await db.study_visits.insert_many(visits_to_insert)
        except Exception as e:
            logger.error(f"Error inserting visits for instance {instance_id}: {str(e)}")
            return {"success": True, "instanceId": instance_id, "warning": "Visits creation failed"}

    return {"success": True, "instanceId": instance_id}

@router.get("/study-instances")
async def get_study_instances(
    skip: int = 0, 
    limit: int = 100,
    user: UserBase = Depends(get_current_user)
):
    """List scheduled study instances."""
    instances = await db.study_instances.find().skip(skip).limit(limit).to_list(limit)
    results = []
    for i in instances:
        if "_id" in i:
            i["_id"] = str(i["_id"])
        results.append(i)
            
    return results

@router.get("/study-instance/{instance_id}")
async def get_study_instance_detail(
    instance_id: str,
    user: UserBase = Depends(get_current_user)
):
    """Get full details of a specific study instance."""
    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        instance = await db.study_instances.find_one({"_id": oid})

        if not instance:
            raise HTTPException(status_code=404, detail="Study instance not found")
            
        instance["_id"] = str(instance["_id"])
        
        visits = await db.study_visits.find({"studyInstanceId": str(instance["_id"])}).to_list(1000)
        for v in visits:
            v["_id"] = str(v["_id"])
        
        instance["visits"] = visits
        
        return instance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/study-instance/{instance_id}")
async def delete_study_instance(
    instance_id: str,
    user: UserBase = Depends(get_current_user)
):
    """Delete a study instance and CASCADE delete all associated data (visits, assignments, attendance)."""
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete studies")

    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        
        # Get study details BEFORE deletion for cascade cleanup
        instance = await db.study_instances.find_one({"_id": oid})
        
        if not instance:
            raise HTTPException(status_code=404, detail="Study instance not found")
        
        # Extract study code for cascade operations
        study_code = instance.get("enteredStudyCode") or instance.get("studyInstanceCode")
        
        # ====== CASCADE DELETE ======
        # 1. Delete study instance
        res_inst = await db.study_instances.delete_one({"_id": oid})
        
        # 2. Delete all visits associated with this study
        res_visits = await db.study_visits.delete_many({"studyInstanceId": instance_id})
        
        # 3. Delete all volunteer assignments for this study
        res_assignments = 0
        if study_code:
            delete_result = await db.assigned_studies.delete_many({"study_code": study_code})
            res_assignments = delete_result.deleted_count
        
        # 4. Delete all attendance records for this study (if attendance collection exists)
        res_attendance = 0
        if study_code:
            try:
                # Check if attendance collection exists and has records
                delete_result = await db.attendance.delete_many({"study_code": study_code})
                res_attendance = delete_result.deleted_count
            except Exception as attendance_err:
                # Attendance collection might not exist or have different structure
                logger.warning(f"Could not delete attendance for study {study_code}: {str(attendance_err)}")
        
        logger.info(f"CASCADE DELETE completed for study '{study_code}' (ID: {instance_id}): "
                   f"instance=1, visits={res_visits.deleted_count}, "
                   f"assignments={res_assignments}, attendance={res_attendance}")
        
        return {
            "success": True, 
            "deletedInstance": True, 
            "deletedVisits": res_visits.deleted_count,
            "deletedAssignments": res_assignments,
            "deletedAttendance": res_attendance,
            "message": f"Study '{study_code}' and all related data deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing cascade delete for study {instance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete study: {str(e)}")

@router.put("/study-instance/{instance_id}")
async def update_study_instance(
    instance_id: str,
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """Update an existing study instance and replace its visits."""
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
         pass 

    instance_data = payload.get("studyInstance")
    visits_data = payload.get("visits")

    if not instance_data:
        raise HTTPException(status_code=400, detail="Missing studyInstance data")

    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        
        if "_id" in instance_data: del instance_data["_id"]
        instance_data["updatedAt"] = datetime.now(timezone.utc)
        instance_data["updatedBy"] = str(user.get("id") or user.get("_id"))
        
        res = await db.study_instances.update_one(
            {"_id": oid}, 
            {"$set": instance_data}
        )
        
        if visits_data is not None: 
             await db.study_visits.delete_many({"studyInstanceId": instance_id})
             
             if len(visits_data) > 0:
                 visits_to_insert = []
                 for v in visits_data:
                     visit_doc = v.copy()
                     visit_doc["studyInstanceId"] = instance_id
                     if "_id" in visit_doc: del visit_doc["_id"]
                     if "plannedDate" in visit_doc and isinstance(visit_doc["plannedDate"], str):
                        try:
                             visit_doc["plannedDate"] = datetime.fromisoformat(visit_doc["plannedDate"].replace("Z", ""))
                        except:
                             pass
                     visits_to_insert.append(visit_doc)
                 
                 await db.study_visits.insert_many(visits_to_insert)

        return {"success": True, "instanceId": instance_id}
        
    except Exception as e:
        logger.error(f"Error updating study instance {instance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating study instance")
