import requests

url = "http://127.0.0.1:8000/api/auth/login/"

data = {
    "email": "md@example.com",
    "password": "123"
}

response = requests.post(url, json=data)

print("Status:", response.status_code)
print("Response:", response.text)
