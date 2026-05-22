const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...jsonHeaders, ...(init.headers || {}) }
  });
}

function text(message, status = 400) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function normalizeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

function normalizeRole(value) {
  return ['A', 'B', 'C'].includes(value) ? value : null;
}

async function ensureTable(env) {
  if (!env.DB) {
    throw new Error('缺少 D1 绑定：请在 Cloudflare Pages 的 Settings → Bindings 中添加 D1 database，变量名设为 DB。');
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('A', 'B', 'C')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_comments_day_id ON comments(day, id DESC)').run();
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureTable(env);
    const url = new URL(request.url);
    const date = normalizeDate(url.searchParams.get('date'));
    if (!date) return text('date 必须是 YYYY-MM-DD 格式', 400);

    const result = await env.DB.prepare(`
      SELECT id, day AS date, role, content, created_at
      FROM comments
      WHERE day = ?
      ORDER BY id DESC
      LIMIT 200
    `).bind(date).all();

    return json(result.results || []);
  } catch (error) {
    return text(error.message || '读取评论失败', 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureTable(env);

    const body = await request.json().catch(() => null);
    if (!body) return text('请求体必须是 JSON', 400);

    const date = normalizeDate(body.date);
    const role = normalizeRole(body.role);
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!date) return text('date 必须是 YYYY-MM-DD 格式', 400);
    if (!role) return text('role 只能是 A、B 或 C', 400);
    if (!content) return text('评论不能为空', 400);
    if (content.length > 300) return text('评论最多 300 字', 400);

    const result = await env.DB.prepare(`
      INSERT INTO comments(day, role, content)
      VALUES (?, ?, ?)
      RETURNING id, day AS date, role, content, created_at
    `).bind(date, role, content).first();

    return json(result, { status: 201 });
  } catch (error) {
    return text(error.message || '发布评论失败', 500);
  }
}
