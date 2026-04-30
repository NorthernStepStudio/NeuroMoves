"""
Shared pytest fixtures for RealLife Steps backend tests.
"""

import os
import sys

import pytest

# Ensure the backend package is importable from tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(autouse=True)
def _temp_database(monkeypatch, tmp_path):
    """Redirect the database to a temp file for each test."""
    db_path = str(tmp_path / "test.db")

    # Patch DATABASE_PATH in BOTH modules, since database.py imported it
    # as a local name from config at import time.
    monkeypatch.setattr("database.DATABASE_PATH", db_path)
    monkeypatch.setattr("config.DATABASE_PATH", db_path)

    import database
    database.init_database()
    yield db_path


@pytest.fixture()
def client(_temp_database):
    """Flask test client with a fresh database."""
    import importlib
    import app as app_module

    # Reload so the app picks up the patched DB path
    importlib.reload(app_module)
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


@pytest.fixture()
def auth_header(client):
    """Sign up a test user and return an Authorization header dict."""
    resp = client.post("/api/auth/signup", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test Parent",
    })
    data = resp.get_json()
    assert data.get("success"), f"Signup failed: {data}"
    token = data["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def child_id(client, auth_header):
    """Create a child profile and return its id."""
    resp = client.post("/api/children", json={"name": "Kiddo", "language": "en", "age_months": 36}, headers=auth_header)
    data = resp.get_json()
    assert data.get("child"), f"Child creation failed: {data}"
    return data["child"]["id"]
