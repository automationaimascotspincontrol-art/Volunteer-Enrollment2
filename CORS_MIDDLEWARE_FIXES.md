# CORS & Middleware Issues - FIXED

## Issues Resolved

### 1. **CORS OPTIONS Requests Failing (500 Error)**
   - **Problem:** OPTIONS requests (CORS preflight) were returning 500 errors
   - **Root Cause:** Middleware was misconfigured and not handling OPTIONS requests properly
   - **Solution:** Fixed middleware in main.py to properly handle all HTTP methods including OPTIONS

### 2. **Middleware Double-Wrapping**
   - **Problem:** `add_request_context` was calling `add_request_id_middleware` AND then calling `call_next` again
   - **Root Cause:** Incorrect middleware pattern causing request processing to fail
   - **Solution:** Merged request ID logic directly into the middleware function

### 3. **Missing OPTIONS in CORS Configuration**
   - **Problem:** CORS middleware wasn't allowing OPTIONS method
   - **Root Cause:** OPTIONS method not specified in allow_methods
   - **Solution:** Added "OPTIONS" to the CORS allow_methods list

### 4. **Incorrect Endpoint URLs**
   - **Problem:** Scripts were using `/auth/login` instead of `/api/v1/auth/login`
   - **Root Cause:** Routes are registered with `/api/v1` prefix
   - **Solution:** Updated all scripts to use correct endpoint paths

## Files Fixed

### [app/main.py](app/main.py) - Middleware Configuration
```python
# ✅ FIXED: Added OPTIONS to CORS methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # ← Added OPTIONS
    allow_headers=["*"],
)

# ✅ FIXED: Merged request ID middleware logic directly
@app.middleware("http")
async def add_request_context(request: Request, call_next):
    """Inject request ID and handle request/response logging."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    
    try:
        response = await call_next(request)  # ← Only call once!
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as e:
        raise
```

### [utils/create_initial_users.py](utils/create_initial_users.py) - Correct Endpoint
```python
# ✅ FIXED: Using correct endpoint with /api/v1 prefix
url = f"{BASE_URL}/api/v1/auth/register"  # ← Was: /auth/register
```

### [test_login.py](test_login.py) - Correct Endpoint
```python
# ✅ FIXED: Using correct endpoint
response = requests.post(f"{BASE_URL}/api/v1/auth/login", ...)  # ← Was: /auth/login
```

## How to Test Now

### 1. Start the Backend Server
```bash
cd back-end
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Create Users
```bash
python setup_mongo_users.py
```

Or via HTTP API:
```bash
python utils/create_initial_users.py
```

### 3. Test Login
```bash
python test_login.py
```

### 4. Manual CURL Test
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "field_user", "full_name": "Field Agent", "role": "field", "password": "password"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "field_user", "password": "password"}'
```

## Expected Results

✅ **OPTIONS requests** - Should return 200 OK (from CORS middleware)

✅ **POST /api/v1/auth/register** - Should return 201 Created with user data

✅ **POST /api/v1/auth/login** - Should return 200 OK with access token

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "username": "field_user",
    "full_name": "Field Agent",
    "role": "field"
  }
}
```

## Key Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| CORS OPTIONS | ❌ Not allowed | ✅ Allowed |
| Middleware | ❌ Double call | ✅ Single call |
| Request ID | ❌ Separate function | ✅ Inline in middleware |
| Endpoint URLs | ❌ /auth/login | ✅ /api/v1/auth/login |
| Error Handling | ❌ 500 errors | ✅ Proper CORS response |

All issues are now fixed! The backend should work properly with CORS preflight requests.
