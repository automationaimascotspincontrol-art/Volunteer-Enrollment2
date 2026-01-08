from enum import Enum

class UserRole(str, Enum):
    FIELD = "field"
    RECRUITER = "recruiter"
    MANAGEMENT = "management"
    GAME_MASTER = "game_master"
    PRM = "prm"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    KIDS_7_11 = "kids_7_11"
    FEMALE_MINOR = "female_minor"
    MALE_MINOR = "male_minor"

class StudyStatus(str, Enum):
    ONGOING = "ONGOING"
    UPCOMING = "UPCOMING"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class VisitStatus(str, Enum):
    UPCOMING = "UPCOMING"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"

class FitnessStatus(str, Enum):
    PENDING = "pending"
    FIT = "fit"
    UNFIT = "unfit"
    WITHDREW = "withdrew"
    COMPLETED = "completed"
    ASSIGNED = "assigned"  # Also adding this for consistency

class IdProofType(str, Enum):
    AADHAR = "aadhar"
    PAN = "pan"
    COLLEGE_ID = "college_id"
    VOTER_ID = "voter_id"
    DRIVING_LICENSE = "driving_license"
    OTHER = "other"
