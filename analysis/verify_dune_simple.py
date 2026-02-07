from dune_client.client import DuneClient
import os
from dotenv import load_dotenv

load_dotenv()

def run():
    api_key = os.getenv("DUNE_API_KEY")
    query_id = 9318883
    
    print(f"Testing Standard Dune Client with ID: {query_id}")
    
    dune = DuneClient(api_key)
    try:
        # This is the exact method the user pointed out
        query_result = dune.get_latest_result(query_id)
        print("SUCCESS! Data received:")
        print(query_result.result.rows[0] if query_result.result.rows else "No rows returned")
    except Exception as e:
        print("FAILED with error:")
        print(e)

if __name__ == "__main__":
    run()
