"""
Test what the /assigned-studies API actually returns RIGHT NOW
"""
import requests
import json

# You'll need to get a valid token first by logging in
print("First, login to get a token...")
print("Username: recruiter_user")
print("Password: Recruiter123")
print()

login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"username": "recruiter_user", "password": "Recruiter123"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print("✅ Login successful!\n")
    
    # Now test the assigned-studies endpoint
    print("=" * 60)
    print("TESTING /assigned-studies API")
    print("=" * 60)
    
    response = requests.get(
        "http://localhost:8000/api/v1/assigned-studies",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ API Success! Found {len(data.get('data', []))} assignments\n")
        
        for i, item in enumerate(data.get('data', [])[:10], 1):
            print(f"\n--- Assignment #{i} ---")
            print(f"Visit ID: {item.get('visit_id')}")
            print(f"Study Code: {item.get('study_code')}")
            print(f"Volunteer Name (from API): '{item.get('volunteer_name')}'")
            print(f"  First 3 chars: '{item.get('volunteer_name', '')[:3]}'")
            
            name = item.get('volunteer_name', '')
            if len(name) >= 2 and name[0] == name[1]:
                print(f"  ⚠️  HAS DUPLICATE PREFIX!")
            else:
                print(f"  ✅ No duplicate prefix")
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
