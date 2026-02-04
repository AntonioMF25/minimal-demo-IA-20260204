import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)

# Keep an original snapshot and restore before each test
original_activities = copy.deepcopy(activities)

@pytest.fixture(autouse=True)
def reset_activities():
    # Reset activities dict in-place (so app keeps the same object)
    activities.clear()
    activities.update(copy.deepcopy(original_activities))
    yield


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data


def test_signup_success():
    activity = "Chess Club"
    email = "test_user@example.com"
    resp = client.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200
    assert resp.json()["message"] == f"Signed up {email} for {activity}"
    assert email in activities[activity]["participants"]


def test_signup_duplicate():
    activity = "Chess Club"
    email = "dup_user@example.com"

    resp = client.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200

    # Try again
    resp2 = client.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert resp2.status_code == 400
    assert "Student already signed up" in resp2.json()["detail"]


def test_signup_full():
    activity = "Small Test"
    # Create a tiny activity to trigger full condition
    activities[activity] = {
        "description": "Tiny",
        "schedule": "Now",
        "max_participants": 1,
        "participants": []
    }
    email1 = "a@example.com"
    email2 = "b@example.com"

    r1 = client.post(f"/activities/{quote(activity)}/signup", params={"email": email1})
    assert r1.status_code == 200

    r2 = client.post(f"/activities/{quote(activity)}/signup", params={"email": email2})
    assert r2.status_code == 400
    assert "Activity is full" in r2.json()["detail"]


def test_remove_participant():
    activity = "Chess Club"
    email = "to_remove@example.com"

    # Add then remove
    r1 = client.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert r1.status_code == 200
    assert email in activities[activity]["participants"]

    r2 = client.delete(f"/activities/{quote(activity)}/participants", params={"email": email})
    assert r2.status_code == 200
    assert email not in activities[activity]["participants"]

    # Removing again yields 404
    r3 = client.delete(f"/activities/{quote(activity)}/participants", params={"email": email})
    assert r3.status_code == 404
    assert "Student not found in activity" in r3.json()["detail"]
