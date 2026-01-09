"""
Test login via API endpoint
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(username, password):
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful for '{username}'")
            print(f"   Token received: {data['access_token'][:50]}...")
            print(f"   User role: {data['user']['role']}")
            return True
        else:
            print(f"❌ Login failed for '{username}': {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing login for '{username}': {e}")
        return False

if __name__ == "__main__":
    print("Testing login for all users:\n")
    
    test_users = [
        ("field_user", "Field123"),
        ("recruiter_user", "Recruiter123"),
        ("manager_user", "Manager123"),
        ("game_master", "GameMaster123"),
        ("prm_user", "PrmAdmin123"),
    ]
    
    success_count = 0
    for username, password in test_users:
        if test_login(username, password):
            success_count += 1
        print()
    
    print(f"✅ {success_count}/{len(test_users)} login tests passed!")
