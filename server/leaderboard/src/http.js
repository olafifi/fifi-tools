import { HttpError } from './errors.js';

export function assertAllowedOrigin(origin, allowedOrigin) {
  if (origin && origin !== allowedOrigin) {
    throw new HttpError(403, 'Origin not allowed');
  }
}

export function responseHeaders(origin, allowedOrigin) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  });
  if (origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
  }
  return headers;
}

export function jsonResponse(body, {
  status = 200,
  origin = '',
  allowedOrigin = '',
  headers: extraHeaders = {}
} = {}) {
  const headers = responseHeaders(origin, allowedOrigin);
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(JSON.stringify(body), { status, headers });
}

export function preflightResponse(origin, allowedOrigin) {
  const headers = responseHeaders(origin, allowedOrigin);
  headers.delete('Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(null, { status: 204, headers });
}

export async function readJson(request, maxBytes = 1024) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, '请使用 JSON 提交成绩。');
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, '提交内容太大。');
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new HttpError(400, '提交内容不是有效的 JSON。');
  }
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, '提交内容太大。');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, '提交内容不是有效的 JSON。');
  }
}

export function errorResponse(error, context) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) {
    console.error('Leaderboard request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message.slice(0, 200) : 'Unknown error',
      requestId: context.requestId || 'unavailable'
    });
  }
  return jsonResponse(
    { error: status === 500 ? '服务器暂时忙不过来。' : error.message },
    { ...context, status }
  );
}
