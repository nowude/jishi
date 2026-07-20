-- JiShi D1 Database Schema
-- Run: npx wrangler d1 execute jishi-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  clock_in TEXT NOT NULL DEFAULT '',
  clock_out TEXT NOT NULL DEFAULT '',
  work_minutes INTEGER NOT NULL DEFAULT 0,
  is_manual INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal',
  hours REAL NOT NULL DEFAULT 8,
  is_full_day INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- 初始化默认配置
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('standardClockIn', '09:00'),
  ('standardClockOut', '18:00'),
  ('workdays', '1,2,3,4,5'),
  ('dailyStandardHours', '8'),
  ('avgRequiredHours', '11.5');

-- API 鉴权 Token（用户自定义）
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('apiToken', 'jishi-change-me-to-a-secret');
