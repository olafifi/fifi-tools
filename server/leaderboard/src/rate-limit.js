import { HttpError } from './errors.js';

const encoder = new TextEncoder();

export async function hashSource(source, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(source));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function enforceSubmitLimit({
  db,
  sourceKey,
  nowMs,
  limit = 10,
  windowMs = 300_000
}) {
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const row = await db.prepare(`
    INSERT INTO submission_windows(source_key, window_started_at, submission_count)
    VALUES (?, ?, 1)
    ON CONFLICT(source_key) DO UPDATE SET
      window_started_at = CASE
        WHEN excluded.window_started_at > submission_windows.window_started_at
          THEN excluded.window_started_at
        ELSE submission_windows.window_started_at
      END,
      submission_count = CASE
        WHEN excluded.window_started_at > submission_windows.window_started_at THEN 1
        ELSE submission_windows.submission_count + 1
      END
    WHERE excluded.window_started_at > submission_windows.window_started_at
      OR (
        excluded.window_started_at = submission_windows.window_started_at
        AND submission_windows.submission_count < ?
      )
    RETURNING submission_count
  `).bind(sourceKey, windowStart, limit).first();

  if (!row) {
    throw new HttpError(429, '提交得太快了，请稍后再试。');
  }
  if (Number(row.submission_count) === 1) {
    await db.prepare('DELETE FROM submission_windows WHERE window_started_at < ?')
      .bind(windowStart - 86_400_000)
      .run();
  }
}
