-- RealLife Steps Database Schema
-- Database Admin: db_admin_Loky
-- This file mirrors the tables created by backend/database.py init_database().
-- ========== Parent Accounts ==========
CREATE TABLE IF NOT EXISTS parent_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    google_sub TEXT UNIQUE,
    auth_provider TEXT NOT NULL DEFAULT 'local',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- ========== Auth Sessions ==========
CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES parent_accounts (id)
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_parent ON auth_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
-- ========== Password Reset Tokens ==========
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    code_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES parent_accounts (id)
);
CREATE INDEX IF NOT EXISTS idx_password_reset_parent ON password_reset_tokens(parent_id, used_at, expires_at);
-- ========== Child Profiles (legacy "users" table) ==========
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'db_admin_Loky',
    parent_id INTEGER,
    age_months INTEGER DEFAULT 24,
    archived INTEGER DEFAULT 0
);
-- ========== User Progress ==========
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
);
-- ========== Activity Attempts ==========
CREATE TABLE IF NOT EXISTS activity_attempts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_id TEXT NOT NULL,
    date_iso TEXT NOT NULL,
    result TEXT NOT NULL,
    audio_uri TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS idx_activity_attempts_user ON activity_attempts(user_id);
-- ========== Daily Journal Entries ==========
CREATE TABLE IF NOT EXISTS child_journal_entries (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    photo_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS idx_child_journal_user ON child_journal_entries(user_id, created_at DESC);
-- ========== Avatar Profiles ==========
CREATE TABLE IF NOT EXISTS child_avatar_profiles (
    user_id INTEGER PRIMARY KEY,
    body_color TEXT NOT NULL,
    face TEXT NOT NULL,
    hat TEXT NOT NULL,
    accessory TEXT NOT NULL,
    background TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
-- ========== Achievement Unlocks ==========
CREATE TABLE IF NOT EXISTS child_achievement_unlocks (
    user_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TEXT NOT NULL,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user ON child_achievement_unlocks(user_id);
-- ========== Standard Indexes ==========
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module ON user_progress(module);