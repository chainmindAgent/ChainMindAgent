import os
import time
from dune_client.client import DuneClient
from dotenv import load_dotenv

load_dotenv()

QUERY_ID = 9318883

def test_query():
    api_key = os.getenv("DUNE_API_KEY")
    if not api_key:
        print("Error: DUNE_API_KEY not found in environment.")
        return

    client = DuneClient(api_key)
    print(f"Fetching result for Query ID {QUERY_ID}...")
    
    try:
        res = client.get_latest_result(QUERY_ID)
        if not res.result.rows:
            print("Query returned no rows.")
            return

        print(f"Successfully fetched {len(res.result.rows)} rows.")
        print("Columns found:")
        print(res.result.rows[0].keys())
        
        print("\nSample Row 1:")
        print(res.result.rows[0])
        
        if len(res.result.rows) > 1:
            print("\nSample Row 2:")
            print(res.result.rows[1])

    except Exception as e:
        print(f"Error fetching query: {e}")

if __name__ == "__main__":
    test_query()
