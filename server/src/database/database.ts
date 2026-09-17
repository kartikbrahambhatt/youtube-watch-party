import Database from "better-sqlite3";
import path from "path";

const databasePath = path.join(
  process.cwd(),
  "watch-party.db"
);

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

console.log(
  `SQLite database connected: ${databasePath}`
);

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    video_id TEXT,
    play_state TEXT NOT NULL DEFAULT 'paused',
    current_time REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    message_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id
  ON chat_messages(room_id);

  DROP TABLE IF EXISTS room_participants;
`);