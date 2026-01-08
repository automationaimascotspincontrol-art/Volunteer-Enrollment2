# Backend Architecture Documentation

## Overview

This is a clean, layered backend architecture for the Volunteer Enrollment System. It enforces separation of concerns and prevents business logic from leaking into non-business layers.

## Architecture Layers

### 1. **Entry Point** (`app/main.py`)
- **Responsibility**: Wire middleware, routers, and startup checks
- **No business logic allowed here**
- Initializes database and validates environment on startup
- Registers all middleware and routes

### 2. **API Layer** (`app/api/v1/routes/`)
- **Responsibility**: HTTP request/response handling only
- Routes map 1:1 to user workflows
- Routes are **thin** - validation only, no business logic
- All business logic delegated to services

**Route files:**
- `auth.py` - Login and token generation
- `field.py` - Field visit draft creation (field agents)
- `enrollment.py` - Draft → Master conversion (recruiters)
- `clinical.py` - Study assignment (clinical staff)
- `admin.py` - User management and audit logs (admins)

**Dependency Injection** (`deps.py`):
- `get_current_user()` - Validates token and returns user
- `require_permission()` - RBAC enforcement

### 3. **Core Layer** (`app/core/`)
Non-business concerns that support the entire system:

| File | Purpose |
|------|---------|
| `config.py` | Environment configuration, validation |
| `security.py` | Password hashing, JWT creation/validation |
| `middleware.py` | Request ID injection, global error handling |
| `permissions.py` | Central RBAC policy (roles → permissions) |
| `invariants.py` | System rules (immutable fields, state transitions) |
| `domain_errors.py` | Business-level error types |
| `logging.py` | Structured logging and audit helpers |

### 4. **Database Layer** (`app/db/`)
MongoDB integration:

| File | Purpose |
|------|---------|
| `client.py` | Motor async client lifecycle |
| `session.py` | MongoDB transaction helpers |
| `__init__.py` | Database initialization and indexes |
| `models/` | Internal DB document representations (not exposed to API) |

### 5. **Schemas** (`app/schemas/`)
Pydantic models for API contracts:
- **Request validation**: What frontend sends
- **Response shaping**: What frontend receives
- **Hidden fields**: Internal DB fields never exposed

### 6. **Repositories** (`app/repositories/`)
Data access layer - one repo per collection:

| File | Collection | Purpose |
|------|-----------|---------|
| `volunteer_repo.py` | `volunteers_master` | Volunteer records |
| `field_visit_repo.py` | `field_visits` | Field visit drafts |
| `clinical_repo.py` | `clinical_participation` | Study assignments |
| `counter_repo.py` | `counters` | Atomic ID generation |
| `audit_repo.py` | `audit_logs` | Immutable audit trail |

**Philosophy**: Repos are simple CRUD + specialized queries. No business logic.

### 7. **Services** (`app/services/`)
Business logic layer - implements actual workflows:

| File | Responsibility |
|------|-----------------|
| `auth_service.py` | Authenticate users, validate tokens |
| `enrollment_service.py` | **Core workflow**: Draft → Master conversion |
| `clinical_service.py` | Study assignment, status updates |
| `user_service.py` | User lifecycle (create, enable, disable) |
| `audit_service.py` | Write immutable audit logs |

**Key principle**: Services enforce invariants, audit every change, manage state transitions.

### 8. **Workers** (`app/workers/`)
Background async tasks (non-blocking):

| File | Purpose |
|------|---------|
| `report_worker.py` | Generate Excel reports |
| `email_worker.py` | Send email notifications |

### 9. **Tests** (`tests/`)
Unit tests for services and repositories.

### 10. **Scripts** (`scripts/`)
One-time operational tasks:
- Seed Game Master user
- Import legacy Excel data

## Data Flow

```
Frontend Request
    ↓
[API Route] - Validate input, enforce permission
    ↓
[Service] - Execute business logic, enforce invariants
    ↓
[Repository] - Access database
    ↓
[MongoDB] - Persist data
    ↓
[Audit Service] - Log the change
    ↓
Frontend Response
```

## Key Design Principles

### 1. **Immutability**
Certain fields can never be modified after creation:
- `volunteer_id` - Primary identifier
- `created_at` - Audit timestamp
- `created_by` - Original creator

This is enforced in `core/invariants.py` and checked by services.

### 2. **State Transitions**
Volunteers progress through defined stages:
```
FIELD_VISIT → PRE_SCREENING → REGISTRATION → CLINICAL_ASSIGNMENT → COMPLETED
```

Each stage has valid status values (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`).

Only certain transitions are allowed. Enforced in `core/invariants.py`.

### 3. **Audit Trail**
Every data mutation writes an immutable audit log:
- WHO made the change (user_id)
- WHAT changed (changes dict)
- WHEN it happened (timestamp)
- WHY (metadata)

This is centralized in `audit_service.py` and called on every change.

### 4. **RBAC (Role-Based Access Control)**
Central policy in `core/permissions.py`:
```python
Permission.CREATE_FIELD_DRAFT → [Role.FIELD_AGENT, Role.GAME_MASTER]
Permission.CONVERT_DRAFT_TO_MASTER → [Role.RECRUITER, Role.GAME_MASTER]
Permission.ASSIGN_STUDY → [Role.CLINICAL, Role.GAME_MASTER]
Permission.MANAGE_USERS → [Role.ADMIN, Role.GAME_MASTER]
```

Routes enforce permissions via `require_permission()` dependency.

### 5. **Domain Errors vs HTTP Errors**
Services raise domain errors (`core/domain_errors.py`):
- `VolunteerNotFound`
- `InvalidVolunteerState`
- `ImmutableFieldModified`

Routes catch these and convert to HTTP responses (400, 401, 403, 404, etc).

## File Import Patterns

### ✅ Correct
```python
# Routes import services (thin wrapper)
from app.services import enrollment_service

# Services import repositories (data access)
from app.repositories import volunteer_repo

# Repositories import db client
from app.db.client import db

# Services enforce invariants
from app.core.invariants import is_valid_transition
```

### ❌ Wrong
```python
# Routes should NOT import repositories (bypass service layer)
from app.repositories import volunteer_repo

# Repositories should NOT have business logic
# Services should NOT import routes

# Multiple services importing each other circularly
```

## Adding a New Feature

### Step 1: Define the schema
Create a request/response model in `app/schemas/`.

### Step 2: Create the route
Add endpoint in `app/api/v1/routes/`. Keep it thin - just validate input and permissions.

### Step 3: Create the service method
Implement business logic in the appropriate service file.

### Step 4: Create/update repositories
If you need to access a new collection, create a repo in `app/repositories/`.

### Step 5: Add the repo call
Service calls repo to fetch/update data.

### Step 6: Write audit log
Service calls `audit_service.write_audit_log()` on mutations.

### Example: "Approve a volunteer"
```python
# 1. Schema (app/schemas/volunteer.py)
class ApprovalRequest(BaseModel):
    volunteer_id: str

# 2. Route (app/api/v1/routes/enrollment.py)
@router.post("/approve")
async def approve_volunteer(
    request: ApprovalRequest,
    current_user: dict = Depends(get_current_user),
):
    check_permission(current_user["role"], Permission.APPROVE_VOLUNTEER)
    success = await enrollment_service.approve_volunteer(
        volunteer_id=request.volunteer_id,
        user_id=current_user["id"],
    )
    return {"success": success}

# 3. Service (app/services/enrollment_service.py)
async def approve_volunteer(volunteer_id: str, user_id: str) -> bool:
    # Check invariants
    volunteer = await volunteer_repo.find_by_volunteer_id(volunteer_id)
    if not volunteer:
        raise VolunteerNotFound()
    
    # Update state
    success = await volunteer_repo.update(volunteer_id, {
        "current_status": "approved",
    })
    
    # Audit
    await audit_service.write_audit_log(
        action=AuditAction.UPDATE,
        entity_type="volunteer_master",
        entity_id=volunteer_id,
        user_id=user_id,
        changes={"status": "approved"},
    )
    
    return success
```

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env with required variables
echo "MONGODB_URL=mongodb://localhost:27017" > .env
echo "SECRET_KEY=your-secret-key" >> .env

# Run (with uvicorn)
uvicorn app.main:app --reload

# Or with Python
python -m uvicorn app.main:app --reload
```

## API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/login` - Get access token

### Field Visits (Field Agents)
- `POST /api/v1/field/drafts` - Create draft
- `GET /api/v1/field/drafts` - List drafts

### Enrollment (Recruiters)
- `POST /api/v1/enrollment/draft-to-master` - Convert draft
- `GET /api/v1/enrollment/volunteers` - List volunteers

### Clinical (Doctors)
- `POST /api/v1/clinical/assign-study` - Assign to study
- `PATCH /api/v1/clinical/study-status` - Update status

### Admin (Game Master)
- `POST /api/v1/admin/users` - Create user
- `GET /api/v1/admin/audit-logs` - View audit trail
- `GET /api/v1/admin/analytics` - System analytics

## Environment Configuration

Required `.env` variables:
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=live_enrollment_db
SECRET_KEY=your-very-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Future Considerations

This architecture is **complete for the current scope**. It needs no additional folders or layers. Future work should only:
- Optimize queries (add indexes)
- Tune database performance
- Improve error messages
- Add more sophisticated validation
- Extend workers for async features

**Do not add**:
- Handler classes (unnecessary abstraction)
- CQRS separation (premature complexity)
- Generic base classes (tight coupling)
- Schema builders (adds friction)
