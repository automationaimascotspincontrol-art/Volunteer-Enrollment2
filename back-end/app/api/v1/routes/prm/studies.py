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
    """Delete a study instance and all its associated visits."""
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
         pass

    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        
        res_inst = await db.study_instances.delete_one({"_id": oid})
        
        if res_inst.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Study instance not found")
            
        res_visits = await db.study_visits.delete_many({"studyInstanceId": instance_id})
        
        return {
            "success": True, 
            "deletedInstance": True, 
            "deletedVisits": res_visits.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
