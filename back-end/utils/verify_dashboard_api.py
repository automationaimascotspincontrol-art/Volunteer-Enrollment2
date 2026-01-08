import requests
import json

BASE_URL = "http://localhost:8000"

def login():
    # Try prm user
    try:
        resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
             "username": "prm_tester", "full_name": "PRM Tester", "role": "prm", "password": "password"
        })
    except:
        pass

    try:
        resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "prm_user",
            "password": "password"
        })
        if resp.status_code == 200:
            return resp.json()["access_token"]
    except:
        pass
    
    # Try admin
    resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "username": "admin",
        "password": "password"
    })
    if resp.status_code != 200:
        print("Login failed, trying to register temp user...")
        resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
             "username": "prm_tester_2", "full_name": "PRM Tester", "role": "prm", "password": "password"
        })
        resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "prm_tester_2",
            "password": "password"
        })
        if resp.status_code != 200:
             print("Still failed.")
             return None
    return resp.json()["access_token"]

def verify_dashboard(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- Verifying /dashboard ---")
    resp = requests.get(f"{BASE_URL}/api/v1/dashboard", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print(json.dumps(resp.json(), indent=2))
    else:
        print(resp.text)

    print("\n--- Verifying /dashboard/analytics ---")
    resp = requests.get(f"{BASE_URL}/api/v1/dashboard/analytics", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        # Truncate output
        data = resp.json()
        print("Studies By Month:", len(data.get("data", {}).get("studiesByMonth", [])))
        print("Visits By Status:", data.get("data", {}).get("visitsByStatus", {}))
    else:
        print(resp.text)

    print("\n--- Verifying /dashboard/timeline-workload ---")
    resp = requests.get(f"{BASE_URL}/api/v1/dashboard/timeline-workload", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print("Workload Keys:", list(data.get("data", {}).keys())[:5])
    else:
        print(resp.text)

if __name__ == "__main__":
    token = login()
    if token:
        verify_dashboard(token)
