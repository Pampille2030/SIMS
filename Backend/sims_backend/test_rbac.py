import requests
import json

BASE_URL = "http://127.0.0.1:8000"

LOGIN_URL = f"{BASE_URL}/api/auth/login/"

# 🔁 Replace this with an actual Purchase Order ID in your DB
PURCHASE_ORDER_ID = 1

# MD endpoints/actions to test
MD_ACTIONS = [
    "approve_supplier",     # POST
    "final_approve_order",  # POST
    "reject_order",         # POST
    "approval_status"       # GET
]

# 🔁 Replace with your real Store Manager credentials
LOGIN_DATA = {
    "email": "stores@example.com",
    "password": "123"
}



def login():
    """Logs in as Store Manager and returns JWT token."""
    print("🔐 Logging in as Store Manager...")
    response = requests.post(LOGIN_URL, json=LOGIN_DATA)
    print("Login Status:", response.status_code)

    if response.status_code != 200:
        print("❌ Login failed")
        print(response.text)
        return None

    token = response.json().get("access")
    print("✅ Login successful\n")
    return token


def test_md_endpoints(token):
    """Tests all MD endpoints for RBAC protection."""
    headers_get = {"Authorization": f"Bearer {token}"}
    headers_post = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for action in MD_ACTIONS:
        url = f"{BASE_URL}/api/purchase-orders/{PURCHASE_ORDER_ID}/{action}/"
        print(f"🧪 Testing {action} endpoint -> {url}")

        if action == "approval_status":
            # GET request
            response = requests.get(url, headers=headers_get)
        else:
            # POST request with dummy data
            dummy_data = {"test": "rbac_check"}
            response = requests.post(url, headers=headers_post, json=dummy_data)

        status = response.status_code

        if status in [403, 401]:
            print(f"✅ RBAC working ({status} blocked)\n")
        elif status in [200, 201]:
            print(f"🚨 RBAC FAILURE! Store Manager can access {action} ({status})\n")
        else:
            print(f"⚠️ Unexpected response ({status}): {response.text}\n")


if __name__ == "__main__":
    token = login()
    if token:
        test_md_endpoints(token)
