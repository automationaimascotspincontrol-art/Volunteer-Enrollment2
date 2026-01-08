"""
Create initial test users by calling the /auth/register endpoint.
Run this after starting the backend server.
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def register_user(username, full_name, role, password):
    url = f"{BASE_URL}/api/v1/auth/register"
    payload = {
        "username": username,
        "full_name": full_name,
        "role": role,
        "password": password
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 201:
            print(f"✓ User '{username}' ({role}) created successfully.")
            return True
        else:
            print(f"✗ Failed to create user '{username}': {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Error: Cannot connect to {BASE_URL}")
        print("   Make sure the backend server is running on port 8000")
        return False
    except Exception as e:
        print(f"✗ Error creating user '{username}': {e}")
        return False

if __name__ == "__main__":
    print("Creating initial test users...\n")
    
    try:
        users = [
            ("field_user", "Field Agent", "field", "Field123"),
            ("recruiter_user", "Recruiter Agent", "recruiter", "Recruiter123"),
            ("manager_user", "Manager Admin", "management", "Manager123"),
            ("game_master", "The Game Master", "game_master", "GameMaster123"),
            ("prm_user", "PRM Admin", "prm", "PrmAdmin123"),
        ]
        
        success_count = 0
        for username, full_name, role, password in users:
            if register_user(username, full_name, role, password):
                success_count += 1
        
        print(f"\n✅ Created {success_count}/{len(users)} users successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
