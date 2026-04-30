"""
Tests for the Flask API routes.
Uses the Flask test client from conftest.py.
"""

import json


# ========== Health Check ==========

def test_health_check(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "healthy"


def test_security_headers(client):
    resp = client.get("/api/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"


# ========== Auth: Signup ==========

class TestSignup:
    def test_signup_success(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "new@example.com",
            "password": "password123",
            "name": "New User",
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert "token" in data
        assert data["parent"]["email"] == "new@example.com"

    def test_signup_short_password(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "short@example.com",
            "password": "abc",
        })
        assert resp.status_code == 400

    def test_signup_invalid_email(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "notanemail",
            "password": "password123",
        })
        assert resp.status_code == 400

    def test_signup_duplicate(self, client):
        payload = {"email": "dup@example.com", "password": "password123"}
        client.post("/api/auth/signup", json=payload)
        resp = client.post("/api/auth/signup", json=payload)
        assert resp.status_code == 409


# ========== Auth: Login ==========

class TestLogin:
    def test_login_success(self, client):
        client.post("/api/auth/signup", json={
            "email": "login@example.com",
            "password": "password123",
        })
        resp = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_login_wrong_password(self, client):
        client.post("/api/auth/signup", json={
            "email": "wrong@example.com",
            "password": "password123",
        })
        resp = client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "badpassword",
        })
        assert resp.status_code == 401


# ========== Auth: Me & Logout ==========

class TestMeAndLogout:
    def test_me_authenticated(self, client, auth_header):
        resp = client.get("/api/auth/me", headers=auth_header)
        assert resp.status_code == 200
        assert resp.get_json()["parent"]["email"] == "test@example.com"

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_logout(self, client, auth_header):
        resp = client.post("/api/auth/logout", headers=auth_header)
        assert resp.status_code == 200
        # Token should be invalid now
        resp2 = client.get("/api/auth/me", headers=auth_header)
        assert resp2.status_code == 401


# ========== Child Profiles ==========

class TestChildrenAPI:
    def test_create_child(self, client, auth_header):
        resp = client.post("/api/children", json={"name": "Kiddo"}, headers=auth_header)
        assert resp.status_code == 201
        assert resp.get_json()["child"]["name"] == "Kiddo"

    def test_list_children(self, client, auth_header, child_id):
        resp = client.get("/api/children", headers=auth_header)
        assert resp.status_code == 200
        children = resp.get_json()["children"]
        assert len(children) >= 1

    def test_update_child(self, client, auth_header, child_id):
        resp = client.put(f"/api/children/{child_id}", json={"name": "Updated"}, headers=auth_header)
        assert resp.status_code == 200
        assert resp.get_json()["child"]["name"] == "Updated"

    def test_delete_child(self, client, auth_header, child_id):
        resp = client.delete(f"/api/children/{child_id}", headers=auth_header)
        assert resp.status_code == 200


# ========== Progress ==========

class TestProgressAPI:
    def test_get_all_progress(self, client, auth_header, child_id):
        resp = client.get(f"/api/users/{child_id}/progress", headers=auth_header)
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["progress"], list)

    def test_sync_progress(self, client, auth_header, child_id):
        resp = client.post(f"/api/users/{child_id}/sync", json={
            "progress": [
                {"module": "A", "level": 2, "attempts": 5, "successes": 3},
            ],
        }, headers=auth_header)
        assert resp.status_code == 200
        assert resp.get_json()["counts"]["progress"] == 1


# ========== Modules ==========

def test_get_modules(client):
    resp = client.get("/api/modules")
    assert resp.status_code == 200
    assert "modules" in resp.get_json()
