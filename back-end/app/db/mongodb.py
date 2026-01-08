"""
Legacy DB module. 
Consolidated to use app/db/client.py to ensure single connection pool.
"""
from app.db.client import db, client, get_db

# Reuse the init_db from __init__.py if people import it from here
from app.db import init_db
from app.core.config import settings
