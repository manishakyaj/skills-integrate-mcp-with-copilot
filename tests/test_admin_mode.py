from fastapi.testclient import TestClient
from src.app import app, sessions

client = TestClient(app)

def test_login_and_protected_endpoints():
    # Login with known teacher
    resp = client.post("/login", json={"username": "teacher", "password": "password123"})
    assert resp.status_code == 200
    token = resp.json().get("token")
    assert token

    # Try to signup without token -> should be 403
    resp2 = client.post("/activities/Chess Club/signup?email=test@student.edu")
    assert resp2.status_code == 403

    # Sign up with token
    headers = {"Authorization": f"Bearer {token}"}
    resp3 = client.post("/activities/Chess Club/signup?email=test@student.edu", headers=headers)
    assert resp3.status_code == 200
    assert "Signed up test@student.edu" in resp3.json().get("message", "")

    # Unregister with token
    resp4 = client.delete("/activities/Chess Club/unregister?email=test@student.edu", headers=headers)
    assert resp4.status_code == 200
    assert "Unregistered test@student.edu" in resp4.json().get("message", "")

    # Logout and ensure token invalidated
    client.post("/logout", headers=headers)
    assert token not in sessions
