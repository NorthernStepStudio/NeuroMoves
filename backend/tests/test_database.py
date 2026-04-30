"""
Tests for the database module (auth, child profiles, progress, companion data).
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import database


# ========== Parent Accounts ==========

class TestParentAccounts:
    def test_create_parent_account(self):
        parent = database.create_parent_account("alice@example.com", "secret123", "Alice")
        assert parent["email"] == "alice@example.com"
        assert parent["display_name"] == "Alice"
        assert "password_hash" not in parent

    def test_duplicate_email_raises(self):
        database.create_parent_account("dup@example.com", "password1")
        import sqlite3
        with pytest.raises(sqlite3.IntegrityError):
            database.create_parent_account("dup@example.com", "password2")

    def test_verify_credentials_success(self):
        database.create_parent_account("bob@example.com", "mypass123", "Bob")
        result = database.verify_parent_credentials("bob@example.com", "mypass123")
        assert result is not None
        assert result["email"] == "bob@example.com"

    def test_verify_credentials_wrong_password(self):
        database.create_parent_account("carol@example.com", "correct")
        result = database.verify_parent_credentials("carol@example.com", "wrong")
        assert result is None

    def test_verify_credentials_unknown_email(self):
        result = database.verify_parent_credentials("nobody@example.com", "any")
        assert result is None


# ========== Sessions ==========

class TestSessions:
    def test_create_and_retrieve_session(self):
        parent = database.create_parent_account("sess@example.com", "password1")
        token = database.create_session(parent["id"])
        assert token
        found = database.get_parent_from_session(token)
        assert found is not None
        assert found["id"] == parent["id"]

    def test_revoke_session(self):
        parent = database.create_parent_account("rev@example.com", "password1")
        token = database.create_session(parent["id"])
        database.revoke_session(token)
        assert database.get_parent_from_session(token) is None

    def test_invalid_token_returns_none(self):
        assert database.get_parent_from_session("bogus-token") is None


# ========== Child Profiles ==========

class TestChildProfiles:
    def _parent(self, email="cp@example.com"):
        return database.create_parent_account(email, "password1")

    def test_create_and_list(self):
        parent = self._parent()
        database.create_child_profile(parent["id"], "Kiddo", "en", 30)
        children = database.list_child_profiles(parent["id"])
        assert len(children) == 1
        assert children[0]["name"] == "Kiddo"
        assert children[0]["age_months"] == 30

    def test_update_child(self):
        parent = self._parent("upd@example.com")
        child = database.create_child_profile(parent["id"], "OldName")
        updated = database.update_child_profile(child["id"], parent["id"], name="NewName")
        assert updated["name"] == "NewName"

    def test_archive_child(self):
        parent = self._parent("arch@example.com")
        child = database.create_child_profile(parent["id"], "ToArchive")
        assert database.archive_child_profile(child["id"], parent["id"]) is True
        assert database.list_child_profiles(parent["id"]) == []

    def test_belongs_to_parent(self):
        p1 = self._parent("p1@example.com")
        p2 = self._parent("p2@example.com")
        child = database.create_child_profile(p1["id"], "Mine")
        assert database.child_belongs_to_parent(child["id"], p1["id"]) is True
        assert database.child_belongs_to_parent(child["id"], p2["id"]) is False


# ========== Progress ==========

class TestProgress:
    def _setup(self):
        parent = database.create_parent_account("prog@example.com", "pw")
        child = database.create_child_profile(parent["id"], "Kid")
        return child["id"]

    def test_save_and_get_progress(self):
        uid = self._setup()
        database.save_progress(uid, "A", level=3, attempts=10, successes=8)
        p = database.get_progress(uid, "A")
        assert p["level"] == 3
        assert p["attempts"] == 10
        assert p["successes"] == 8

    def test_get_default_progress(self):
        uid = self._setup()
        p = database.get_progress(uid, "Z")
        assert p["level"] == 1
        assert p["attempts"] == 0

    def test_batch_sync(self):
        uid = self._setup()
        count = database.batch_sync_progress(uid, [
            {"module": "A", "level": 2, "attempts": 5, "successes": 3},
            {"module": "B", "level": 1, "attempts": 2, "successes": 1},
        ])
        assert count == 2
        all_prog = database.get_all_progress(uid)
        assert len(all_prog) == 2


# ========== Password Reset ==========

class TestPasswordReset:
    def test_reset_flow(self):
        database.create_parent_account("reset@example.com", "oldpass")
        code = database.create_password_reset_code_for_email("reset@example.com")
        assert code is not None
        ok = database.reset_password_with_code("reset@example.com", code, "newpass123")
        assert ok is True
        # Old password no longer works
        assert database.verify_parent_credentials("reset@example.com", "oldpass") is None
        # New password works
        assert database.verify_parent_credentials("reset@example.com", "newpass123") is not None

    def test_reset_bad_code(self):
        database.create_parent_account("bad@example.com", "pass")
        database.create_password_reset_code_for_email("bad@example.com")
        ok = database.reset_password_with_code("bad@example.com", "000000", "newpass")
        assert ok is False

    def test_reset_unknown_email(self):
        code = database.create_password_reset_code_for_email("ghost@example.com")
        assert code is None
