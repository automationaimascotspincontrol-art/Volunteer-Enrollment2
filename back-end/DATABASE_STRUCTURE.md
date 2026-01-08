# Backend Database Structure & Indexes - Complete Documentation

## Database Name: `live_enrollment_db`

This document provides a comprehensive overview of all MongoDB collections, their structure, indexes, and query patterns.

---

## Collections Overview

| Collection | Purpose | Primary Key | Document Count |
|-----------|---------|-------------|-----------------|
| `volunteers_master` | Authoritative volunteer records | `volunteer_id` (unique) | Dynamic |
| `field_visits` | Field visit drafts submitted by agents | `contact` (unique) | Dynamic |
| `prescreening_forms` | Pre-screening form responses | `volunteer_id` (unique) | Dynamic |
| `registration_forms` | Registration form responses | `volunteer_id` (unique) | Dynamic |
| `clinical_participation` | Study assignments and participation status | Composite: `(study_code, volunteer_id)` | Dynamic |
| `clinical_studies` | Available clinical studies | `study_code` (unique) | ~10-50 |
| `users` | System users (field agents, recruiters, doctors, admins) | `username` (unique) | ~20-50 |
| `audit_logs` | Immutable audit trail of all data mutations | Auto-generated `_id` | Growing |
| `counters` | Atomic counters for ID generation | `_id: "volunteer_id"` | 1 |

---

## Detailed Collection Schemas & Indexes

### 1. `volunteers_master` - Core Volunteer Records

**Purpose:** Authoritative master record for each enrolled volunteer. Single source of truth.

**Document Structure:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  volunteer_id: "MUV0001",          // ✅ UNIQUE, immutable, primary identifier
  legacy_id: "OLD_ID_123" | null,   // Optional: for legacy data migration
  basic_info: {
    name: "John Doe",
    age: 28,
    gender: "Male",
    field_area: "Area-A"
  },
  contact: "98765432100",           // Phone or contact identifier
  field_area: "Area-A",             // Geographic location
  current_stage: "field_visit" | "pre_screening" | "registration" | "clinical_assignment" | "completed",
  current_status: "draft" | "submitted" | "approved" | "rejected" | "withdrawn",
  audit: {
    created_at: ISODate("2025-01-15T10:30:00Z"),
    created_by: "user_id_123",
    updated_at: ISODate("2025-01-16T14:45:00Z") | null,
    updated_by: "user_id_456" | null
  }
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on volunteer_id
db.volunteers_master.createIndex({"volunteer_id": 1}, {unique: true})
// Query optimization: Fast lookup by volunteer_id
// Expected QPS: Very High
// Index Size: Small (indexed field is short string)

// Index 2: Query by legacy_id (for data migration/matching)
db.volunteers_master.createIndex({"legacy_id": 1})
// Query optimization: Historical data lookups, reconciliation
// Expected QPS: Low-Medium
// Index Size: Small

// Index 3: Query by current stage (workflow filtering)
db.volunteers_master.createIndex({"current_stage": 1})
// Query optimization: "Get all volunteers in PRE_SCREENING stage"
// Expected QPS: High (dashboards, analytics)
// Index Size: Very Small (enum field)

// Index 4: Query by current status (workflow filtering)
db.volunteers_master.createIndex({"current_status": 1})
// Query optimization: "Get all PENDING approvals"
// Expected QPS: High (dashboards)
// Index Size: Very Small

// Index 5: Compound index for dashboard queries
db.volunteers_master.createIndex({"current_stage": 1, "current_status": 1})
// Query optimization: "Get volunteers in FIELD_VISIT stage with SUBMITTED status"
// Expected QPS: Very High
// Index Size: Small

// Index 6: Audit timestamp sorting
db.volunteers_master.createIndex({"audit.created_at": 1})
// Query optimization: "Get recently created volunteers"
// Expected QPS: Medium
// Index Size: Small
```

**Query Patterns:**
```javascript
// Pattern 1: Find by volunteer_id (MOST COMMON)
db.volunteers_master.findOne({"volunteer_id": "MUV0001"})
// Used by: All service operations
// Index: Index 1

// Pattern 2: Find by stage + status
db.volunteers_master.find({"current_stage": "pre_screening", "current_status": "submitted"})
// Used by: Dashboard, workflow routing
// Index: Could use composite index

// Pattern 3: Count by stage
db.volunteers_master.countDocuments({"current_stage": "field_visit"})
// Used by: Analytics, reporting
// Index: Index 3

// Pattern 4: Audit trail by creation date
db.volunteers_master.find({"audit.created_at": {$gt: ISODate("2025-01-01")}})
// Used by: Activity tracking
// Index: Index 6
```

**Read/Write Patterns:**
- **Reads:** Very High (every service operation)
- **Writes:** Medium (state transitions, updates)
- **Update Strategy:** Replace entire document OR use $set for specific fields
- **TTL:** None (permanent record)

---

### 2. `field_visits` - Field Visit Drafts

**Purpose:** Temporary storage of field visit form submissions before conversion to master.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  contact: "98765432100",              // ✅ UNIQUE per draft
  field_area: "Area-A",
  basic_info: {
    name: "Jane Doe",
    age: 32,
    gender: "Female"
  },
  additional_notes: "...",
  audit: {
    created_at: ISODate("2025-01-15T10:30:00Z"),
    created_by: "field_agent_user_id"
  }
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on contact
db.field_visits.createIndex({"contact": 1}, {unique: true})
// Query optimization: Prevent duplicate submissions for same contact
// Expected QPS: Very High (validation on form submit)
// Index Size: Small

// Index 2: Query by field_area
db.field_visits.createIndex({"field_area": 1})
// Query optimization: "Show all field visits in this area"
// Expected QPS: Medium
// Index Size: Very Small

// Index 3: Audit creation tracking
db.field_visits.createIndex({"audit.created_by": 1})
// Query optimization: "Get all field visits created by agent X"
// Expected QPS: Low-Medium
// Index Size: Small
```

**Query Patterns:**
```javascript
// Pattern 1: Check for duplicate contact
db.field_visits.findOne({"contact": "98765432100"})
// Used by: Form submission validation
// Index: Index 1

// Pattern 2: List by field area
db.field_visits.find({"field_area": "Area-A"})
// Used by: Area-based listing
// Index: Index 2

// Pattern 3: Get submissions by agent
db.field_visits.find({"audit.created_by": "agent_id_123"})
// Used by: Agent performance tracking
// Index: Index 3
```

**Read/Write Patterns:**
- **Reads:** Medium (validation, listing)
- **Writes:** Medium (new submissions)
- **Delete Pattern:** After conversion to master or cleanup
- **TTL:** Consider setting TTL for old drafts (e.g., 30 days)

---

### 3. `prescreening_forms` - Pre-screening Form Responses

**Purpose:** Stores pre-screening questionnaire responses for volunteers.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  volunteer_id: "MUV0001",              // ✅ UNIQUE reference to master
  medical_history: {...},
  health_conditions: [...],
  medications: [...],
  allergies: [...],
  field_area: "Area-A",
  audit: {
    created_at: ISODate("2025-01-15T10:30:00Z"),
    created_by: "doctor_user_id"
  }
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on volunteer_id
db.prescreening_forms.createIndex({"volunteer_id": 1}, {unique: true})
// Query optimization: One-to-one relationship with master
// Expected QPS: High
// Index Size: Small

// Index 2: Query by field_area
db.prescreening_forms.createIndex({"field_area": 1})
// Query optimization: "Get prescreening forms for Area-A"
// Expected QPS: Medium
// Index Size: Very Small
```

**Query Patterns:**
```javascript
// Pattern 1: Get prescreening form for volunteer
db.prescreening_forms.findOne({"volunteer_id": "MUV0001"})
// Used by: Clinical workflow, form updates
// Index: Index 1

// Pattern 2: Query by area for batch processing
db.prescreening_forms.find({"field_area": "Area-A"})
// Used by: Area-based analytics
// Index: Index 2
```

**Read/Write Patterns:**
- **Reads:** Medium (clinical workflow)
- **Writes:** Medium (form submission, updates)
- **Update Strategy:** Replace entire form or upsert
- **Relationship:** One-to-one with volunteers_master

---

### 4. `registration_forms` - Registration Form Responses

**Purpose:** Stores final registration details and consent forms.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  volunteer_id: "MUV0001",              // ✅ UNIQUE reference to master
  consent: {
    given_consent: true,
    signed_at: ISODate("2025-01-15T10:30:00Z")
  },
  emergency_contact: {...},
  insurance_info: {...},
  study_assigned: ["STUDY001", "STUDY002"],
  fit_status: "yes" | "no",
  audit: {
    created_at: ISODate("2025-01-15T10:30:00Z"),
    created_by: "recruiter_user_id"
  }
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on volunteer_id
db.registration_forms.createIndex({"volunteer_id": 1}, {unique: true})
// Query optimization: One-to-one relationship
// Expected QPS: High
// Index Size: Small
```

**Query Patterns:**
```javascript
// Pattern 1: Get registration form
db.registration_forms.findOne({"volunteer_id": "MUV0001"})
// Used by: Registration workflow, eligibility checks
// Index: Index 1
```

**Read/Write Patterns:**
- **Reads:** Medium
- **Writes:** Medium (form submission, updates)
- **Relationship:** One-to-one with volunteers_master

---

### 5. `clinical_participation` - Study Assignments

**Purpose:** Records volunteer participation in clinical studies.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  volunteer_id: "MUV0001",
  study: {
    study_code: "STUDY001",            // Study identifier
    study_name: "Cancer Prevention Trial"
  },
  volunteer_ref: {                      // Denormalized volunteer info
    name: "John Doe",
    contact: "98765432100",
    age: 28
  },
  status: "assigned" | "enrolled" | "active" | "completed" | "withdrawn",
  assigned_at: ISODate("2025-01-15T10:30:00Z"),
  assigned_by: "doctor_user_id",
  notes: "Patient showed good health metrics...",
  audit: {
    created_at: ISODate("2025-01-15T10:30:00Z"),
    created_by: "doctor_user_id"
  }
}
```

**Indexes:**
```javascript
// Index 1: Composite unique index (volunteer, study)
db.clinical_participation.createIndex(
  {"study.study_code": 1, "volunteer_id": 1},
  {unique: true}
)
// Query optimization: Prevent duplicate study assignments
// Expected QPS: Very High (assignment validation)
// Index Size: Small

// Index 2: Query volunteers in a study
db.clinical_participation.createIndex({"study.study_code": 1})
// Query optimization: "Get all volunteers enrolled in STUDY001"
// Expected QPS: High (study dashboards)
// Index Size: Small

// Index 3: Query by volunteer
db.clinical_participation.createIndex({"volunteer_id": 1})
// Query optimization: "Get all studies for volunteer X"
// Expected QPS: High
// Index Size: Small

// Index 4: Denormalized contact lookups
db.clinical_participation.createIndex({"volunteer_ref.contact": 1})
// Query optimization: "Find by contact number" (alternative lookup)
// Expected QPS: Low-Medium
// Index Size: Small

// Index 5: Query by status
db.clinical_participation.createIndex({"status": 1})
// Query optimization: "Get all ACTIVE participations"
// Expected QPS: Medium
// Index Size: Very Small
```

**Query Patterns:**
```javascript
// Pattern 1: Check if volunteer already assigned to study
db.clinical_participation.findOne({
  "volunteer_id": "MUV0001",
  "study.study_code": "STUDY001"
})
// Used by: Assignment validation
// Index: Index 1

// Pattern 2: Get all volunteers in a study
db.clinical_participation.find({"study.study_code": "STUDY001"})
// Used by: Study dashboards
// Index: Index 2

// Pattern 3: Get all studies for a volunteer
db.clinical_participation.find({"volunteer_id": "MUV0001"})
// Used by: Volunteer clinical profile
// Index: Index 3

// Pattern 4: Get active participations
db.clinical_participation.find({"status": "active"})
// Used by: Active study tracking
// Index: Index 5
```

**Read/Write Patterns:**
- **Reads:** Very High (dashboards, checks)
- **Writes:** Medium (assignments, status updates)
- **Denormalization:** Volunteer data copied for reporting
- **Relationship:** Many-to-many (volunteer has many studies)

---

### 6. `clinical_studies` - Study Master Data

**Purpose:** Registry of available clinical studies.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  study_code: "STUDY001",              // ✅ UNIQUE identifier
  study_name: "Cancer Prevention Trial 2025",
  description: "A 2-year study...",
  status: "active" | "closed" | "recruitment_closed",
  created_at: ISODate("2025-01-01T00:00:00Z"),
  updated_at: ISODate("2025-01-15T10:30:00Z")
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on study_code
db.clinical_studies.createIndex({"study_code": 1}, {unique: true})
// Query optimization: Study lookups
// Expected QPS: High (assignment validation)
// Index Size: Small

// Index 2: Query by status
db.clinical_studies.createIndex({"status": 1})
// Query optimization: "Get all active studies"
// Expected QPS: Low-Medium
// Index Size: Very Small
```

**Query Patterns:**
```javascript
// Pattern 1: Validate study exists
db.clinical_studies.findOne({"study_code": "STUDY001"})
// Used by: Assignment validation
// Index: Index 1

// Pattern 2: List active studies
db.clinical_studies.find({"status": "active"})
// Used by: Study selection in UI
// Index: Index 2
```

**Read/Write Patterns:**
- **Reads:** Medium (study lookups, listings)
- **Writes:** Low (study master data - rarely changes)
- **Size:** ~10-50 documents (static reference data)

---

### 7. `users` - System Users

**Purpose:** Authentication and authorization records for system users.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  username: "john.doe@hospital.com",   // ✅ UNIQUE login identifier
  hashed_password: "$2b$12$...",       // bcrypt hash
  full_name: "Dr. John Doe",
  role: "field" | "recruiter" | "clinical" | "admin" | "game_master",
  is_active: true,
  created_at: ISODate("2025-01-01T00:00:00Z"),
  created_by: "admin_user_id",
  disabled_at: ISODate("2025-01-16T00:00:00Z") | null,
  disabled_by: "admin_user_id" | null
}
```

**Indexes:**
```javascript
// Index 1: Unique constraint on username
db.users.createIndex({"username": 1}, {unique: true})
// Query optimization: Login lookups
// Expected QPS: Very High (every authentication)
// Index Size: Small

// Index 2: Query by role (optional)
db.users.createIndex({"role": 1})
// Query optimization: "Get all clinical staff"
// Expected QPS: Low-Medium
// Index Size: Very Small
```

**Query Patterns:**
```javascript
// Pattern 1: Authenticate user
db.users.findOne({"username": "john.doe@hospital.com"})
// Used by: Login endpoint
// Index: Index 1

// Pattern 2: Get users by role
db.users.find({"role": "clinical"})
// Used by: User management, role-based queries
// Index: Index 2
```

**Read/Write Patterns:**
- **Reads:** Very High (authentication on every request)
- **Writes:** Low (user management)
- **Size:** ~20-50 documents (team members)
- **Security:** Never expose hashed_password to frontend

---

### 8. `audit_logs` - Immutable Audit Trail

**Purpose:** Permanent, immutable record of all system changes for compliance and debugging.

**Document Structure:**
```javascript
{
  _id: ObjectId,
  action: "create" | "update" | "delete" | "state_transition" | "login" | "permission_check",
  entity_type: "volunteer_master" | "user" | "clinical_participation" | "permission",
  entity_id: "MUV0001" | "user_id_123",
  user_id: "user_id_456",              // Who made the change
  timestamp: ISODate("2025-01-15T10:30:00Z"),  // When it happened
  changes: {                            // What changed
    "current_stage": "pre_screening",
    "current_status": "submitted"
  },
  metadata: {                           // Why it happened (optional)
    "reason": "Medical evaluation complete",
    "source": "clinical_workflow"
  }
}
```

**Indexes:**
```javascript
// Index 1: Query audit logs by timestamp (sorting)
db.audit_logs.createIndex({"timestamp": 1})
// Query optimization: "Get recent changes"
// Expected QPS: High (audit trail viewing)
// Index Size: Small
// Note: This should be in DESCENDING order for efficient sorting

db.audit_logs.createIndex({"timestamp": -1})
// Better for: Recent logs first

// Index 2: Query by entity_id (audit trail for one entity)
db.audit_logs.createIndex({"entity_id": 1})
// Query optimization: "Get all changes to volunteer MUV0001"
// Expected QPS: High (audit viewing)
// Index Size: Small

// Index 3: Composite index for entity audit trail
db.audit_logs.createIndex({"entity_type": 1, "timestamp": -1})
// Query optimization: "Get recent updates to all volunteers"
// Expected QPS: High
// Index Size: Small

// Index 4: Query by user (user activity tracking)
db.audit_logs.createIndex({"user_id": 1})
// Query optimization: "What did user X do?"
// Expected QPS: Medium
// Index Size: Small

// Index 5: Query by action type
db.audit_logs.createIndex({"action": 1})
// Query optimization: "Show all state transitions"
// Expected QPS: Low
// Index Size: Very Small
```

**Query Patterns:**
```javascript
// Pattern 1: Get audit trail for entity
db.audit_logs.find({"entity_id": "MUV0001"}).sort({"timestamp": -1})
// Used by: Compliance, debugging
// Index: Index 2 (with sort using Index 3)

// Pattern 2: Get user actions
db.audit_logs.find({"user_id": "user_id_456"}).sort({"timestamp": -1})
// Used by: User accountability
// Index: Index 4

// Pattern 3: Recent logs
db.audit_logs.find({}).sort({"timestamp": -1}).limit(100)
// Used by: Activity feed
// Index: Index 1

// Pattern 4: Get recent state transitions
db.audit_logs.find({"action": "state_transition"}).sort({"timestamp": -1})
// Used by: Workflow tracking
// Index: Index 5 or Index 1
```

**Read/Write Patterns:**
- **Reads:** Medium-High (compliance, auditing)
- **Writes:** Very High (written on every mutation)
- **Insert Only:** No updates or deletes (immutable)
- **Growth:** ~1000+ documents per month (depending on activity)
- **Retention:** Consider archival strategy for old logs

**TTL Policy (Optional):**
```javascript
// Uncomment to auto-delete logs older than 2 years
db.audit_logs.createIndex({"timestamp": 1}, {expireAfterSeconds: 63072000})
```

---

### 9. `counters` - Atomic ID Generation

**Purpose:** Maintains sequence counters for generating unique volunteer IDs.

**Document Structure:**
```javascript
{
  _id: "volunteer_id",                // Counter identifier
  seq: 12345                          // Current sequence number
}
```

**Indexes:**
```javascript
// No indexes needed - documents accessed by exact _id match
```

**Query Pattern:**
```javascript
// Atomic increment and fetch
db.counters.findOneAndUpdate(
  {"_id": "volunteer_id"},
  {"$inc": {"seq": 1}},
  {returnDocument: "after"}
)
// Returns: {_id: "volunteer_id", seq: 12346}
// Format: "MUV" + seq.toString().padStart(4, "0") = "MUV12346"
```

**Read/Write Patterns:**
- **Reads:** Very High (every new volunteer)
- **Writes:** Very High (atomic increment)
- **Concurrency:** MongoDB handles atomic operations safely
- **Single Document:** Only 1 document ever in this collection

---

## Index Summary Table

| Collection | Index Field(s) | Type | Unique | Use Case |
|-----------|----------------|------|--------|----------|
| volunteers_master | volunteer_id | Single | ✅ | Primary lookup |
| volunteers_master | current_stage | Single | ❌ | Dashboard filtering |
| volunteers_master | current_status | Single | ❌ | Status tracking |
| volunteers_master | legacy_id | Single | ❌ | Migration lookups |
| volunteers_master | audit.created_at | Single | ❌ | Timeline queries |
| field_visits | contact | Single | ✅ | Duplicate prevention |
| field_visits | field_area | Single | ❌ | Area-based listing |
| field_visits | audit.created_by | Single | ❌ | Agent tracking |
| prescreening_forms | volunteer_id | Single | ✅ | One-to-one lookup |
| prescreening_forms | field_area | Single | ❌ | Area queries |
| registration_forms | volunteer_id | Single | ✅ | One-to-one lookup |
| clinical_participation | (study.study_code, volunteer_id) | Compound | ✅ | Assignment validation |
| clinical_participation | study.study_code | Single | ❌ | Study lookups |
| clinical_participation | volunteer_id | Single | ❌ | Volunteer queries |
| clinical_participation | volunteer_ref.contact | Single | ❌ | Contact lookup |
| clinical_participation | status | Single | ❌ | Status filtering |
| clinical_studies | study_code | Single | ✅ | Study lookup |
| clinical_studies | status | Single | ❌ | Active studies |
| users | username | Single | ✅ | Authentication |
| users | role | Single | ❌ | User management |
| audit_logs | timestamp | Single | ❌ | Recent activity |
| audit_logs | entity_id | Single | ❌ | Entity history |
| audit_logs | (entity_type, timestamp) | Compound | ❌ | Audit trails |
| audit_logs | user_id | Single | ❌ | User actions |
| audit_logs | action | Single | ❌ | Action type filtering |

---

## Index Creation Command

```javascript
// Run this once on database setup to create all indexes

async function createAllIndexes(db) {
  // volunteers_master
  await db.volunteers_master.createIndex({volunteer_id: 1}, {unique: true});
  await db.volunteers_master.createIndex({legacy_id: 1});
  await db.volunteers_master.createIndex({current_stage: 1});
  await db.volunteers_master.createIndex({current_status: 1});
  await db.volunteers_master.createIndex({"audit.created_at": 1});

  // field_visits
  await db.field_visits.createIndex({contact: 1}, {unique: true});
  await db.field_visits.createIndex({field_area: 1});
  await db.field_visits.createIndex({"audit.created_by": 1});

  // prescreening_forms
  await db.prescreening_forms.createIndex({volunteer_id: 1}, {unique: true});
  await db.prescreening_forms.createIndex({field_area: 1});

  // registration_forms
  await db.registration_forms.createIndex({volunteer_id: 1}, {unique: true});

  // clinical_participation
  await db.clinical_participation.createIndex({
    "study.study_code": 1,
    volunteer_id: 1
  }, {unique: true});
  await db.clinical_participation.createIndex({"study.study_code": 1});
  await db.clinical_participation.createIndex({volunteer_id: 1});
  await db.clinical_participation.createIndex({"volunteer_ref.contact": 1});
  await db.clinical_participation.createIndex({status: 1});

  // clinical_studies
  await db.clinical_studies.createIndex({study_code: 1}, {unique: true});
  await db.clinical_studies.createIndex({status: 1});

  // users
  await db.users.createIndex({username: 1}, {unique: true});
  await db.users.createIndex({role: 1});

  // audit_logs
  await db.audit_logs.createIndex({timestamp: -1});
  await db.audit_logs.createIndex({entity_id: 1});
  await db.audit_logs.createIndex({
    entity_type: 1,
    timestamp: -1
  });
  await db.audit_logs.createIndex({user_id: 1});
  await db.audit_logs.createIndex({action: 1});
}
```

---

## Database Performance Considerations

### Write Operations
- **Atomic Counters:** `counters` collection uses atomic `$inc` for safe ID generation
- **Audit Logging:** Every mutation writes to `audit_logs` (adds ~5-10ms per operation)
- **Duplicate Prevention:** Unique indexes prevent duplicates but add write validation

### Read Operations
- **High-Volume Queries:** Dashboard queries use stage/status indexes for efficiency
- **Composite Queries:** Consider compound indexes for frequently combined fields
- **Pagination:** Always use `.limit()` and `.skip()` for large result sets

### Data Growth
- **volunteers_master:** ~1-10 new documents per day
- **audit_logs:** ~100-1000 documents per day (grows rapidly)
- **Users:** ~20-50 total (static)
- **Clinical Studies:** ~10-50 total (static)

### Index Maintenance
```javascript
// Check index usage
db.volunteers_master.aggregate([{"$indexStats": {}}])

// Rebuild indexes if needed
db.volunteers_master.reIndex()

// Check index sizes
db.volunteers_master.aggregate([
  {"$collStats": {"histograms": true}}
])
```

---

## Backup & Disaster Recovery

Recommend:
1. **Daily backups** of entire database
2. **Real-time replication** to secondary MongoDB instance
3. **Monthly archives** of audit_logs
4. **Point-in-time recovery** capability (30-day window minimum)

---

## Security Considerations

1. **No sensitive data in audit logs** (passwords, SSN, etc.)
2. **Encrypt at rest** (enable MongoDB encryption)
3. **Role-based access control** (RBAC) at application level
4. **Index on username** but never on passwords
5. **Audit logs are immutable** - no deletes, only inserts

---

## Query Performance Baseline

Expected latencies (with proper indexes):

| Query | Latency | Limitation |
|-------|---------|-----------|
| Find volunteer by ID | < 1ms | Network latency only |
| List volunteers by stage | 10-50ms | Result set size |
| Check duplicate contact | < 1ms | Index scan |
| Assign study (validation) | 5-10ms | 2 lookups required |
| Get audit trail | 20-100ms | Document count in trail |
| Authenticate user | < 1ms | Index scan |
| Generate volunteer ID | < 1ms | Atomic counter |

---

## Monitoring Recommendations

1. **Monitor collection growth:**
   - `volunteers_master`: Should grow linearly
   - `audit_logs`: Should grow steadily
   - Alert if `volunteers_master` grows abnormally

2. **Monitor index performance:**
   - Track index hit ratios
   - Alert on index misses

3. **Monitor slow queries:**
   - Enable MongoDB profiling
   - Log queries > 100ms

4. **Monitor locks:**
   - Database should rarely need locks (document-level locking)
   - Write concern: "majority" for consistency

---

**Last Updated:** December 26, 2025
**Database Version:** MongoDB 4.4+
**Driver:** Motor (async Python driver)
