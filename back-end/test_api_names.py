"""
Test the assigned-studies API endpoint directly to see what data is being returned
"""
import requests

def test_assigned_studies():
    token = input("Enter your auth token: ").strip()
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        "http://localhost:8000/api/v1/assigned-studies",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {len(data.get('data', []))} assignments\n")
        
        for item in data.get('data', [])[:5]:  # Show first 5
            print(f"Volunteer Name: '{item.get('volunteer_name')}'")
            print(f"Study Code: {item.get('study_code')}")
            print(f"Visit ID: {item.get('visit_id')}")
            print()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_assigned_studies()
