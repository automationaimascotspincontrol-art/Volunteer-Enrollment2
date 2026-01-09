
import requests
import sys
from datetime import datetime

# URL of the backend
BASE_URL = "http://localhost:8000/api/v1"

def main():
    # Login
    print("Logging in...")
    try:
        resp = requests.post("http://localhost:8000/api/v1/auth/login", json={"username": "prm_user", "password": "password"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return
        token_data = resp.json()
        token = token_data["access_token"]
        print("Login successful.")
    except Exception as e:
        print(f"Login connection failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # Payload mimicking frontend
    payload = {
        "studyInstance": {
            "studyID": "DEBUG-STUDY-001",
            "studyName": "Debug Study",
            "enteredStudyCode": "DBG-001",
            "studyInstanceCode": "DBG-001",
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "volunteersPlanned": 12,
            "genderRatio": {"female": 50, "male": 50, "minor": 0},
            "ageRange": {"from": 18, "to": 65},
            "remarks": "Test from debug script"
        },
        "visits": [
            {
                "visitLabel": "SCREENING",
                "plannedDate": datetime.now().isoformat(),
                "visitType": "SCREENING",
                "status": "UPCOMING"
            }
        ]
    }
    
    print("\nSending POST /study-instance...")
    try:
        resp = requests.post(f"{BASE_URL}/study-instance", json=payload, headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    main()
