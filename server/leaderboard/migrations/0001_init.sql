CREATE TABLE leaderboard_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  nickname_key TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 1000000000),
  achieved_at TEXT NOT NULL,
  UNIQUE(game_id, nickname_key)
);

CREATE INDEX leaderboard_rank_idx
  ON leaderboard_scores(game_id, score DESC, achieved_at ASC, id ASC);

CREATE TABLE submission_windows (
  source_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  submission_count INTEGER NOT NULL CHECK(submission_count >= 1)
);

CREATE INDEX submission_window_expiry_idx
  ON submission_windows(window_started_at);
