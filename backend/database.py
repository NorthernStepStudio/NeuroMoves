"""
RealLife Steps - Database Module
Handles SQLite connection, authentication, child profiles, and progress operations.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from typing import Any

from config import (
    AUTH_SESSION_TTL_DAYS,
    DATABASE_PATH,
    DATABASE_URL,
    DB_USER,
    PASSWORD_RESET_TTL_MINUTES,
)


class PostgresCursorAdapter:
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query: str, params: tuple[Any, ...] | list[Any] | None = None):
        self._cursor.execute(_adapt_query(query), params or ())
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def __iter__(self):
        return iter(self._cursor)

    def __getattr__(self, name: str):
        return getattr(self._cursor, name)


class PostgresConnectionAdapter:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self, *args, **kwargs):
        kwargs.setdefault("cursor_factory", psycopg2.extras.RealDictCursor)
        return PostgresCursorAdapter(self._conn.cursor(*args, **kwargs))

    def execute(self, query: str, params: tuple[Any, ...] | list[Any] | None = None):
        cursor = self.cursor()
        cursor.execute(query, params)
        return cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    def __getattr__(self, name: str):
        return getattr(self._conn, name)

def _get_placeholder():
    return "%s" if DATABASE_URL else "?"

def _adapt_query(query: str) -> str:
    if DATABASE_URL:
        # Simple replacement of ? with %s for Postgres
        return query.replace("?", "%s")
    return query


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 180000)
    return f"{salt_bytes.hex()}${digest.hex()}"


def _verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
        expected = _hash_password(password, bytes.fromhex(salt_hex)).split("$", 1)[1]
        return hmac.compare_digest(expected, digest_hex)
    except Exception:
        return False


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_connection():
    """Create database connection (Postgres if DATABASE_URL else SQLite)."""
    if DATABASE_URL:
        return PostgresConnectionAdapter(psycopg2.connect(DATABASE_URL))

    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_cursor(conn):
    return conn.cursor()


def _adapt_schema(query: str) -> str:
    if DATABASE_URL:
        # SQLite types to Postgres
        q = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        q = q.replace("CURRENT_TIMESTAMP", "NOW()")
        return q
    return query

def _ensure_users_columns(cursor):
    """Apply additive migrations for legacy databases."""
    if DATABASE_URL:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
        existing = {row["column_name"] for row in cursor.fetchall()}
    else:
        rows = cursor.execute("PRAGMA table_info(users)").fetchall()
        existing = {row["name"] for row in rows}

    if "parent_id" not in existing:
        cursor.execute("ALTER TABLE users ADD COLUMN parent_id INTEGER")
    if "age_months" not in existing:
        cursor.execute("ALTER TABLE users ADD COLUMN age_months INTEGER DEFAULT 24")
    if "archived" not in existing:
        cursor.execute("ALTER TABLE users ADD COLUMN archived INTEGER DEFAULT 0")


def init_database():
    """Initialize database tables."""
    conn = get_connection()
    cursor = get_cursor(conn)

    # Parent accounts (authentication owner)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS parent_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            display_name TEXT,
            google_sub TEXT UNIQUE,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """)
    )

    # Session tokens (server-side session store)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            revoked_at TEXT,
            FOREIGN KEY (parent_id) REFERENCES parent_accounts (id)
        )
        """)
    )
    cursor.execute(
        _adapt_query("CREATE INDEX IF NOT EXISTS idx_auth_sessions_parent ON auth_sessions(parent_id)")
    )
    cursor.execute(
        _adapt_query("CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at)")
    )

    # Password reset codes
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER NOT NULL,
            code_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            FOREIGN KEY (parent_id) REFERENCES parent_accounts (id)
        )
        """)
    )
    cursor.execute(
        _adapt_query("""
        CREATE INDEX IF NOT EXISTS idx_password_reset_parent
        ON password_reset_tokens(parent_id, used_at, expires_at)
        """)
    )

    # Child profiles (legacy users table kept for compatibility)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'db_admin_Loky'
        )
        """)
    )
    _ensure_users_columns(cursor)

    # User Progress table
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            module TEXT NOT NULL,
            level INTEGER DEFAULT 1,
            attempts INTEGER DEFAULT 0,
            successes INTEGER DEFAULT 0,
            last_played TEXT,
            updated_by TEXT DEFAULT 'db_admin_Loky',
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, module)
        )
        """)
    )

    # Activity Attempts table (granular history)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS activity_attempts (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            activity_id TEXT NOT NULL,
            date_iso TEXT NOT NULL,
            result TEXT NOT NULL,
            audio_uri TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
    )
    cursor.execute(
        _adapt_query("CREATE INDEX IF NOT EXISTS idx_activity_attempts_user ON activity_attempts(user_id)")
    )

    # Daily Journal entries (parent notes + optional photo URIs)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS child_journal_entries (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            photo_uri TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
    )
    cursor.execute(
        _adapt_query("CREATE INDEX IF NOT EXISTS idx_child_journal_user ON child_journal_entries(user_id, created_at DESC)")
    )

    # Avatar customization profile (one profile per child)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS child_avatar_profiles (
            user_id INTEGER PRIMARY KEY,
            body_color TEXT NOT NULL,
            face TEXT NOT NULL,
            hat TEXT NOT NULL,
            accessory TEXT NOT NULL,
            background TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
    )

    # Achievement unlock persistence (roaming across devices)
    cursor.execute(
        _adapt_schema("""
        CREATE TABLE IF NOT EXISTS child_achievement_unlocks (
            user_id INTEGER NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            PRIMARY KEY (user_id, achievement_id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
    )
    cursor.execute(
        _adapt_query("CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user ON child_achievement_unlocks(user_id)")
    )

    conn.commit()
    conn.close()
    print(f"[{DB_USER}] Database initialized at {DATABASE_PATH}")


# ========== Parent Account Operations ==========

def _parent_public(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if not row:
        return None
    data = dict(row)
    data.pop("password_hash", None)
    return data


def get_parent_by_id(parent_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(_adapt_query("SELECT * FROM parent_accounts WHERE id = ?"), (parent_id,))
    row = cursor.fetchone()
    conn.close()
    return _parent_public(row)


def get_parent_by_email(email: str) -> dict[str, Any] | None:
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("SELECT * FROM parent_accounts WHERE lower(email) = lower(?)"),
        (email.strip(),),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_parent_by_google_sub(google_sub: str) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM parent_accounts WHERE google_sub = ?",
        (google_sub,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def create_parent_account(email: str, password: str, display_name: str = "") -> dict[str, Any]:
    conn = get_connection()
    cursor = get_cursor(conn)
    safe_name = display_name.strip() or email.split("@")[0]
    cursor.execute(
        _adapt_query("""
        INSERT INTO parent_accounts (email, password_hash, display_name, auth_provider, created_at, updated_at)
        VALUES (?, ?, ?, 'local', ?, ?)
        """),
        (email.strip().lower(), _hash_password(password), safe_name, _now_iso(), _now_iso()),
    )
    if DATABASE_URL:
        cursor.execute("SELECT lastval()")
        parent_id = cursor.fetchone()['lastval']
    else:
        parent_id = cursor.lastrowid
    conn.commit()
    cursor.execute(_adapt_query("SELECT * FROM parent_accounts WHERE id = ?"), (parent_id,))
    row = cursor.fetchone()
    conn.close()
    return _parent_public(row)  # type: ignore[return-value]


def create_or_update_google_parent(email: str, google_sub: str, display_name: str = "") -> dict[str, Any]:
    conn = get_connection()
    cursor = get_cursor(conn)

    existing_by_sub = cursor.execute(
        "SELECT * FROM parent_accounts WHERE google_sub = ?",
        (google_sub,),
    ).fetchone()
    safe_email = email.strip().lower()
    safe_name = display_name.strip() or safe_email.split("@")[0]
    now = _now_iso()

    if existing_by_sub:
        cursor.execute(
            """
            UPDATE parent_accounts
            SET email = ?, display_name = ?, auth_provider = 'google', updated_at = ?
            WHERE id = ?
            """,
            (safe_email, safe_name, now, existing_by_sub["id"]),
        )
        parent_id = existing_by_sub["id"]
    else:
        existing_by_email = cursor.execute(
            "SELECT * FROM parent_accounts WHERE lower(email) = lower(?)",
            (safe_email,),
        ).fetchone()
        if existing_by_email:
            cursor.execute(
                """
                UPDATE parent_accounts
                SET google_sub = ?, display_name = ?, auth_provider = 'google', updated_at = ?
                WHERE id = ?
                """,
                (google_sub, safe_name, now, existing_by_email["id"]),
            )
            parent_id = existing_by_email["id"]
        else:
            cursor.execute(
                """
                INSERT INTO parent_accounts (email, password_hash, display_name, google_sub, auth_provider, created_at, updated_at)
                VALUES (?, NULL, ?, ?, 'google', ?, ?)
                """,
                (safe_email, safe_name, google_sub, now, now),
            )
            if DATABASE_URL:
                cursor.execute("SELECT lastval() AS id")
                parent_id = cursor.fetchone()["id"]
            else:
                parent_id = cursor.lastrowid

    conn.commit()
    row = cursor.execute("SELECT * FROM parent_accounts WHERE id = ?", (parent_id,)).fetchone()
    conn.close()
    return _parent_public(row)  # type: ignore[return-value]


def verify_parent_credentials(email: str, password: str) -> dict[str, Any] | None:
    parent = get_parent_by_email(email)
    if not parent:
        return None
    if not _verify_password(password, parent.get("password_hash")):
        return None
    parent.pop("password_hash", None)
    return parent


def update_parent_password(parent_id: int, new_password: str):
    conn = get_connection()
    conn.execute(
        """
        UPDATE parent_accounts
        SET password_hash = ?, auth_provider = CASE WHEN google_sub IS NOT NULL THEN auth_provider ELSE 'local' END, updated_at = ?
        WHERE id = ?
        """,
        (_hash_password(new_password), _now_iso(), parent_id),
    )
    conn.commit()
    conn.close()


# ========== Session Operations ==========

def create_session(parent_id: int, ttl_days: int = AUTH_SESSION_TTL_DAYS) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = (datetime.utcnow() + timedelta(days=ttl_days)).replace(microsecond=0).isoformat()
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("""
        INSERT INTO auth_sessions (parent_id, token_hash, created_at, expires_at, revoked_at)
        VALUES (?, ?, ?, ?, NULL)
        """),
        (parent_id, _sha256(token), _now_iso(), expires_at),
    )
    conn.commit()
    conn.close()
    return token


def get_parent_from_session(token: str) -> dict[str, Any] | None:
    token_hash = _sha256(token)
    now = _now_iso()
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("""
        SELECT p.*
        FROM auth_sessions s
        JOIN parent_accounts p ON p.id = s.parent_id
        WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
        """),
        (token_hash, now),
    )
    row = cursor.fetchone()
    conn.close()
    return _parent_public(row)


def revoke_session(token: str):
    conn = get_connection()
    conn.execute(
        "UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
        (_now_iso(), _sha256(token)),
    )
    conn.commit()
    conn.close()


def revoke_all_sessions_for_parent(parent_id: int):
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("UPDATE auth_sessions SET revoked_at = ? WHERE parent_id = ? AND revoked_at IS NULL"),
        (_now_iso(), parent_id),
    )
    conn.commit()
    conn.close()


# ========== Password Reset ==========

def create_password_reset_code_for_email(email: str, ttl_minutes: int = PASSWORD_RESET_TTL_MINUTES) -> str | None:
    parent = get_parent_by_email(email)
    if not parent:
        return None

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.utcnow() + timedelta(minutes=ttl_minutes)).replace(microsecond=0).isoformat()
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO password_reset_tokens (parent_id, code_hash, created_at, expires_at, used_at)
        VALUES (?, ?, ?, ?, NULL)
        """,
        (parent["id"], _sha256(code), _now_iso(), expires_at),
    )
    conn.commit()
    conn.close()
    return code


def reset_password_with_code(email: str, code: str, new_password: str) -> bool:
    parent = get_parent_by_email(email)
    if not parent:
        return False

    conn = get_connection()
    now = _now_iso()
    row = conn.execute(
        """
        SELECT * FROM password_reset_tokens
        WHERE parent_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (parent["id"], _sha256(code.strip()), now),
    ).fetchone()
    if not row:
        conn.close()
        return False

    conn.execute(
        "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
        (now, row["id"]),
    )
    conn.execute(
        "UPDATE parent_accounts SET password_hash = ?, updated_at = ? WHERE id = ?",
        (_hash_password(new_password), now, parent["id"]),
    )
    conn.commit()
    conn.close()
    return True


# ========== Child Profile Operations ==========

def create_child_profile(parent_id: int, name: str, language: str = "en", age_months: int = 24) -> dict[str, Any]:
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("""
        INSERT INTO users (name, language, parent_id, age_months, archived, created_by)
        VALUES (?, ?, ?, ?, 0, ?)
        """),
        (name.strip() or "Child", language, parent_id, max(0, age_months), DB_USER),
    )
    if DATABASE_URL:
        cursor.execute("SELECT lastval()")
        child_id = cursor.fetchone()['lastval']
    else:
        child_id = cursor.lastrowid
    conn.commit()
    cursor.execute(_adapt_query("SELECT * FROM users WHERE id = ?"), (child_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def list_child_profiles(parent_id: int) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT * FROM users
        WHERE parent_id = ? AND COALESCE(archived, 0) = 0
        ORDER BY created_at ASC, id ASC
        """,
        (parent_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def child_belongs_to_parent(child_id: int, parent_id: int) -> bool:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id FROM users
        WHERE id = ? AND parent_id = ? AND COALESCE(archived, 0) = 0
        """,
        (child_id, parent_id),
    ).fetchone()
    conn.close()
    return row is not None


def get_child_profile(child_id: int, parent_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM users
        WHERE id = ? AND parent_id = ? AND COALESCE(archived, 0) = 0
        """,
        (child_id, parent_id),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_child_profile(
    child_id: int,
    parent_id: int,
    *,
    name: str | None = None,
    language: str | None = None,
    age_months: int | None = None,
) -> dict[str, Any] | None:
    updates = []
    values: list[Any] = []
    if name is not None:
        updates.append("name = ?")
        values.append(name.strip() or "Child")
    if language is not None:
        updates.append("language = ?")
        values.append(language)
    if age_months is not None:
        updates.append("age_months = ?")
        values.append(max(0, age_months))

    if not updates:
        return get_child_profile(child_id, parent_id)

    values.extend([child_id, parent_id])
    conn = get_connection()
    cursor = get_cursor(conn)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ? AND parent_id = ? AND COALESCE(archived, 0) = 0"
    cursor.execute(_adapt_query(query), tuple(values))
    conn.commit()
    cursor.execute(
        _adapt_query("SELECT * FROM users WHERE id = ? AND parent_id = ? AND COALESCE(archived, 0) = 0"),
        (child_id, parent_id),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def archive_child_profile(child_id: int, parent_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "UPDATE users SET archived = 1 WHERE id = ? AND parent_id = ? AND COALESCE(archived, 0) = 0",
        (child_id, parent_id),
    )
    conn.commit()
    changed = cursor.rowcount > 0
    conn.close()
    return changed


# ========== Legacy User Operations ==========

def create_user(name: str, language: str = "en", parent_id: int | None = None, age_months: int = 24) -> int:
    """Create child profile (legacy alias kept for compatibility)."""
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        """
        INSERT INTO users (name, language, parent_id, age_months, archived, created_by)
        VALUES (?, ?, ?, ?, 0, ?)
        """,
        (name, language, parent_id, max(0, age_months), DB_USER),
    )
    if DATABASE_URL:
        cursor.execute("SELECT lastval() AS id")
        user_id = cursor.fetchone()["id"]
    else:
        user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user(user_id: int) -> dict[str, Any] | None:
    """Get child profile by ID."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE id = ? AND COALESCE(archived, 0) = 0",
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_user_language(user_id: int, language: str):
    """Update child's preferred language."""
    conn = get_connection()
    conn.execute("UPDATE users SET language = ? WHERE id = ?", (language, user_id))
    conn.commit()
    conn.close()


# ========== Progress Operations ==========

def get_progress(user_id: int, module: str) -> dict[str, Any]:
    """Get child's progress for a specific module."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM user_progress WHERE user_id = ? AND module = ?",
        (user_id, module),
    ).fetchone()
    conn.close()

    if row:
        return dict(row)
    return {
        "user_id": user_id,
        "module": module,
        "level": 1,
        "attempts": 0,
        "successes": 0,
        "last_played": None,
    }


def save_progress(
    user_id: int,
    module: str,
    level: int,
    attempts: int = 0,
    successes: int = 0,
    last_played: str | None = None,
):
    """Save or update child progress."""
    conn = get_connection()
    cursor = get_cursor(conn)
    lp_time = last_played or _now_iso()
    
    if DATABASE_URL:
        # Postgres ON CONFLICT syntax is slightly different for WHERE clause
        query = """
            INSERT INTO user_progress (user_id, module, level, attempts, successes, last_played, updated_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT(user_id, module) DO UPDATE SET
                level = GREATEST(user_progress.level, excluded.level),
                attempts = user_progress.attempts + excluded.attempts,
                successes = user_progress.successes + excluded.successes,
                last_played = excluded.last_played,
                updated_by = excluded.updated_by
            WHERE user_progress.last_played IS NULL OR excluded.last_played > user_progress.last_played
        """
        cursor.execute(query, (user_id, module, level, attempts, successes, lp_time, DB_USER))
    else:
        query = """
            INSERT INTO user_progress (user_id, module, level, attempts, successes, last_played, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, module) DO UPDATE SET
                level = MAX(level, excluded.level),
                attempts = attempts + excluded.attempts,
                successes = successes + excluded.successes,
                last_played = excluded.last_played,
                updated_by = excluded.updated_by
            WHERE user_progress.last_played IS NULL OR excluded.last_played > user_progress.last_played
        """
        cursor.execute(query, (user_id, module, level, attempts, successes, lp_time, DB_USER))
        
    conn.commit()
    conn.close()


def batch_sync_progress(user_id: int, sync_data: list[dict[str, Any]]) -> int:
    """Sync multiple progress updates at once."""
    conn = get_connection()
    cursor = get_cursor(conn)
    count = 0
    for item in sync_data:
        module = item.get("module")
        if not module:
            continue
        level = int(item.get("level", 1))
        attempts = int(item.get("attempts", 0))
        successes = int(item.get("successes", 0))
        last_played = item.get("last_played", _now_iso())

        cursor.execute(
            """
            INSERT INTO user_progress (user_id, module, level, attempts, successes, last_played, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, module) DO UPDATE SET
                level = GREATEST(user_progress.level, excluded.level),
                attempts = user_progress.attempts + excluded.attempts,
                successes = user_progress.successes + excluded.successes,
                last_played = excluded.last_played,
                updated_by = excluded.updated_by
            WHERE user_progress.last_played IS NULL OR excluded.last_played > user_progress.last_played
            """
            if DATABASE_URL
            else
            """
            INSERT INTO user_progress (user_id, module, level, attempts, successes, last_played, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, module) DO UPDATE SET
                level = MAX(level, excluded.level),
                attempts = attempts + excluded.attempts,
                successes = successes + excluded.successes,
                last_played = excluded.last_played,
                updated_by = excluded.updated_by
            WHERE user_progress.last_played IS NULL OR excluded.last_played > user_progress.last_played
            """,
            (user_id, module, level, attempts, successes, last_played, DB_USER),
        )
        count += 1

    conn.commit()
    conn.close()
    return count


def batch_sync_attempts(user_id: int, attempts_data: list[dict[str, Any]]) -> int:
    """Sync multiple activity attempts at once."""
    conn = get_connection()
    cursor = get_cursor(conn)
    count = 0
    for item in attempts_data:
        attempt_id = item.get("id")
        activity_id = item.get("activityId")
        date_iso = item.get("dateISO")
        result = item.get("result")
        audio_uri = item.get("audioUri")

        if not attempt_id or not activity_id or not date_iso or not result:
            continue

        cursor.execute(
            """
            INSERT INTO activity_attempts (id, user_id, activity_id, date_iso, result, audio_uri)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            (attempt_id, user_id, activity_id, date_iso, result, audio_uri),
        )
        count += 1

    conn.commit()
    conn.close()
    return count


def get_all_progress(user_id: int) -> list[dict[str, Any]]:
    """Get child's progress for all modules."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM user_progress WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ========== Companion Data Operations (Journal / Avatar / Achievements) ==========

def get_journal_entries(user_id: int) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, user_id, text, photo_uri, created_at, updated_at
        FROM child_journal_entries
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def upsert_journal_entry(
    user_id: int,
    entry_id: str,
    text: str,
    photo_uri: str | None,
    created_at: str | None = None,
) -> dict[str, Any]:
    created_value = created_at or _now_iso()
    conn = get_connection()
    cursor = get_cursor(conn)
    cursor.execute(
        _adapt_query("""
        INSERT INTO child_journal_entries (id, user_id, text, photo_uri, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            text = excluded.text,
            photo_uri = excluded.photo_uri,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        WHERE child_journal_entries.user_id = excluded.user_id
        """),
        (entry_id, user_id, text, photo_uri, created_value, _now_iso()),
    )
    cursor.execute(
        _adapt_query("""
        SELECT id, user_id, text, photo_uri, created_at, updated_at
        FROM child_journal_entries
        WHERE id = ? AND user_id = ?
        """),
        (entry_id, user_id),
    )
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return dict(row) if row else {}


def delete_journal_entry(user_id: int, entry_id: str) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "DELETE FROM child_journal_entries WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def sync_journal_entries(user_id: int, entries: list[dict[str, Any]]) -> int:
    count = 0
    for entry in entries:
        entry_id = str(entry.get("id") or "").strip()
        text = str(entry.get("text") or "").strip()
        if not entry_id or not text:
            continue
        photo_uri = entry.get("photo_uri")
        if photo_uri is not None:
            photo_uri = str(photo_uri)
        created_at = entry.get("created_at")
        if created_at is not None:
            created_at = str(created_at)
        upsert_journal_entry(user_id, entry_id, text, photo_uri, created_at)
        count += 1
    return count


def get_avatar_profile(user_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT user_id, body_color, face, hat, accessory, background, updated_at
        FROM child_avatar_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def save_avatar_profile(user_id: int, profile: dict[str, Any]) -> dict[str, Any]:
    body_color = str(profile.get("body_color") or "#fb923c")
    face = str(profile.get("face") or "🙂")
    hat = str(profile.get("hat") or "")
    accessory = str(profile.get("accessory") or "")
    background = str(profile.get("background") or "#fff7ed")
    now = _now_iso()

    conn = get_connection()
    conn.execute(
        """
        INSERT INTO child_avatar_profiles (user_id, body_color, face, hat, accessory, background, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            body_color = excluded.body_color,
            face = excluded.face,
            hat = excluded.hat,
            accessory = excluded.accessory,
            background = excluded.background,
            updated_at = excluded.updated_at
        """,
        (user_id, body_color, face, hat, accessory, background, now),
    )
    row = conn.execute(
        """
        SELECT user_id, body_color, face, hat, accessory, background, updated_at
        FROM child_avatar_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    conn.commit()
    conn.close()
    return dict(row) if row else {}


def get_achievement_unlocks(user_id: int) -> dict[str, str]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT achievement_id, unlocked_at
        FROM child_achievement_unlocks
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return {str(row["achievement_id"]): str(row["unlocked_at"]) for row in rows}


def upsert_achievement_unlock(user_id: int, achievement_id: str, unlocked_at: str | None = None):
    timestamp = unlocked_at or _now_iso()
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO child_achievement_unlocks (user_id, achievement_id, unlocked_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, achievement_id) DO UPDATE SET
            unlocked_at = CASE
                WHEN child_achievement_unlocks.unlocked_at <= excluded.unlocked_at THEN child_achievement_unlocks.unlocked_at
                ELSE excluded.unlocked_at
            END
        """,
        (user_id, achievement_id, timestamp),
    )
    conn.commit()
    conn.close()


def sync_achievement_unlocks(user_id: int, unlocks: dict[str, Any]) -> int:
    count = 0
    for achievement_id, unlocked_at in unlocks.items():
        safe_id = str(achievement_id).strip()
        if not safe_id:
            continue
        safe_time = str(unlocked_at) if unlocked_at else _now_iso()
        upsert_achievement_unlock(user_id, safe_id, safe_time)
        count += 1
    return count


# ========== Data Export / Account Deletion (COPPA/GDPR) ==========

def export_parent_data(parent_id: int) -> dict[str, Any]:
    """Return all data owned by a parent account for COPPA / GDPR export."""
    conn = get_connection()

    parent_row = conn.execute(
        "SELECT id, email, display_name, auth_provider, created_at, updated_at FROM parent_accounts WHERE id = ?",
        (parent_id,),
    ).fetchone()
    parent_data = dict(parent_row) if parent_row else {}

    children_rows = conn.execute(
        "SELECT * FROM users WHERE parent_id = ?",
        (parent_id,),
    ).fetchall()
    children_data = []
    for child_row in children_rows:
        child = dict(child_row)
        child_id = child["id"]

        progress_rows = conn.execute("SELECT * FROM user_progress WHERE user_id = ?", (child_id,)).fetchall()
        child["progress"] = [dict(r) for r in progress_rows]

        attempt_rows = conn.execute("SELECT * FROM activity_attempts WHERE user_id = ?", (child_id,)).fetchall()
        child["activity_attempts"] = [dict(r) for r in attempt_rows]

        journal_rows = conn.execute("SELECT * FROM child_journal_entries WHERE user_id = ?", (child_id,)).fetchall()
        child["journal_entries"] = [dict(r) for r in journal_rows]

        avatar_row = conn.execute("SELECT * FROM child_avatar_profiles WHERE user_id = ?", (child_id,)).fetchone()
        child["avatar_profile"] = dict(avatar_row) if avatar_row else None

        unlock_rows = conn.execute("SELECT * FROM child_achievement_unlocks WHERE user_id = ?", (child_id,)).fetchall()
        child["achievement_unlocks"] = [dict(r) for r in unlock_rows]

        children_data.append(child)

    conn.close()
    return {"parent": parent_data, "children": children_data}


def delete_parent_account(parent_id: int) -> bool:
    """Permanently delete a parent account and ALL associated child data."""
    conn = get_connection()
    cursor = get_cursor(conn)

    child_ids = [
        row["id"]
        for row in cursor.execute("SELECT id FROM users WHERE parent_id = ?", (parent_id,)).fetchall()
    ]

    for cid in child_ids:
        cursor.execute("DELETE FROM child_achievement_unlocks WHERE user_id = ?", (cid,))
        cursor.execute("DELETE FROM child_avatar_profiles WHERE user_id = ?", (cid,))
        cursor.execute("DELETE FROM child_journal_entries WHERE user_id = ?", (cid,))
        cursor.execute("DELETE FROM activity_attempts WHERE user_id = ?", (cid,))
        cursor.execute("DELETE FROM user_progress WHERE user_id = ?", (cid,))

    cursor.execute("DELETE FROM users WHERE parent_id = ?", (parent_id,))
    cursor.execute("DELETE FROM password_reset_tokens WHERE parent_id = ?", (parent_id,))
    cursor.execute("DELETE FROM auth_sessions WHERE parent_id = ?", (parent_id,))
    result = cursor.execute("DELETE FROM parent_accounts WHERE id = ?", (parent_id,))
    deleted = result.rowcount > 0

    conn.commit()
    conn.close()
    return deleted


if __name__ == "__main__":
    init_database()
    print("Database setup complete!")
