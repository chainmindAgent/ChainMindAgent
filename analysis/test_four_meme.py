import requests
import json

def test_fetch():
    url = "https://four.meme/meme-api/v1/private/token/list"
    params = {
        "page": 1,
        "pageSize": 10,
        "sortField": "marketCap",
        "sortOrder": "desc"
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://four.meme/ranking"
    }
    
    try:
        print(f"Fetching from {url}...")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Successfully fetched data!")
            # Save to file for inspection
            with open("four_meme_test_output.json", "w") as f:
                json.dump(data, f, indent=2)
            print("Data saved to four_meme_test_output.json")
        else:
            print(f"Failed to fetch: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_fetch()
