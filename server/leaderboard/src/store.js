function publicEntry(row) {
  return {
    nickname: row.nickname,
    score: Number(row.score),
    achievedAt: row.achievedAt
  };
}

export async function submitScore(db, entry) {
  await db.prepare(`
    INSERT INTO leaderboard_scores(game_id, nickname, nickname_key, score, achieved_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(game_id, nickname_key) DO UPDATE SET
      nickname = CASE WHEN excluded.score > score THEN excluded.nickname ELSE nickname END,
      score = MAX(score, excluded.score),
      achieved_at = CASE WHEN excluded.score > score THEN excluded.achieved_at ELSE achieved_at END
  `).bind(
    entry.gameId,
    entry.nickname,
    entry.nicknameKey,
    entry.score,
    entry.achievedAt
  ).run();

  const row = await db.prepare(`
    SELECT nickname, score, achieved_at AS achievedAt
    FROM leaderboard_scores
    WHERE game_id = ? AND nickname_key = ?
  `).bind(entry.gameId, entry.nicknameKey).first();
  return publicEntry(row);
}

export async function topScores(db, { gameId, limit }) {
  const result = await db.prepare(`
    SELECT nickname, score, achieved_at AS achievedAt
    FROM leaderboard_scores
    WHERE game_id = ?
    ORDER BY score DESC, achieved_at ASC, id ASC
    LIMIT ?
  `).bind(gameId, limit).all();
  return result.results.map((row, index) => ({ rank: index + 1, ...publicEntry(row) }));
}

export async function scoreRank(db, { gameId, nicknameKey }) {
  const row = await db.prepare(`
    SELECT 1 + COUNT(*) AS rank
    FROM leaderboard_scores leader
    JOIN leaderboard_scores player
      ON player.game_id = leader.game_id AND player.nickname_key = ?
    WHERE leader.game_id = ? AND (
      leader.score > player.score OR
      (leader.score = player.score AND (
        leader.achieved_at < player.achieved_at OR
        (leader.achieved_at = player.achieved_at AND leader.id < player.id)
      ))
    )
  `).bind(nicknameKey, gameId).first();
  return row ? Number(row.rank) : null;
}
