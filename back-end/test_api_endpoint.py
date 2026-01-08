import asyncio
import requests
import json

# Test the API endpoint directly
def test_assigned_studies_endpoint():
    # You'll need to get a valid token first
    # For now, let's just test if the endpoint responds
    
    url = "http://localhost:8000/assigned-studies"
    
    try:
        # Try without auth first to see the error
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}")  # First 500 chars
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nSuccess! Found {len(data.get('data', []))} assignments")
            if data.get('data'):
                print(f"First assignment: {json.dumps(data['data'][0], indent=2)}")
        else:
            print(f"\nError: {response.status_code}")
            print(f"Likely needs authentication token")
            
    except Exception as e:
        print(f"Error calling API: {str(e)}")

if __name__ == "__main__":
    test_assigned_studies_endpoint()
