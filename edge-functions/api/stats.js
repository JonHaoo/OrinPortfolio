// ============================================================
// /api/stats — 埋点数据查询（EdgeOne Edge Function，仅站长使用）
// 职责：校验 token 后，读取近 N 天的 KV 天级桶，返回原始事件
//       （聚合展示由前端看板 dashboard.html 完成）
// 鉴权：环境变量 ANALYTICS_TOKEN（控制台 → 项目 → 环境变量配置）；
//       未配置环境变量时回退到下方 CODE_TOKEN——上线前必须改掉默认值。
// 用法：GET /api/stats?token=xxx&days=7        （近 7 天，最多 90）
//       GET /api/stats?token=xxx&from=20261101&to=20261123（指定区间）
// ============================================================

const CODE_TOKEN = 'CHANGE_ME_BEFORE_DEPLOY'; // 兜底 token：部署前请修改或用环境变量覆盖
const MAX_DAYS = 90;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', ...CORS_HEADERS },
  });
}

/** 北京时间（UTC+8）的 yyyyMMdd 与 Date 互转 */
function bjToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(dayStr, delta) {
  const y = Number(dayStr.slice(0, 4));
  const m = Number(dayStr.slice(4, 6)) - 1;
  const d = Number(dayStr.slice(6, 8));
  const t = new Date(Date.UTC(y, m, d) + delta * 86400000);
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`;
}

function validDay(s) {
  return typeof s === 'string' && /^\d{8}$/.test(s) && s >= '20240101' && s <= bjToday();
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const expect = (env && env.ANALYTICS_TOKEN) || CODE_TOKEN;
  if (expect === 'CHANGE_ME_BEFORE_DEPLOY') {
    return json({ ok: false, error: 'token_not_configured', hint: '请为项目配置环境变量 ANALYTICS_TOKEN 或修改 edge-functions/api/stats.js 中的 CODE_TOKEN' }, 500);
  }
  if (!token || token !== expect) return json({ ok: false, error: 'unauthorized' }, 401);

  // ---- 解析日期区间 ----
  let from = url.searchParams.get('from');
  let to = url.searchParams.get('to');
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 7, 1), MAX_DAYS);
  if (validDay(from) && validDay(to) && from <= to) {
    if (addDays(from, MAX_DAYS) <= to) to = addDays(from, MAX_DAYS - 1); // 区间钳制 90 天
  } else {
    from = undefined;
    to = undefined;
  }
  if (!from) {
    to = bjToday();
    from = addDays(to, -(days - 1));
  }

  // ---- 枚举天级桶并读取 ----
  try {
    if (typeof ANALYTICS_KV === 'undefined') {
      return json({ ok: false, error: 'kv_not_bound', hint: '请在控制台为项目绑定 KV 命名空间，变量名 ANALYTICS_KV' }, 500);
    }
    const keys = [];
    for (let d = from; d <= to; d = addDays(d, 1)) keys.push(`evt_${d}`);

    // 并发读取，缺失的桶跳过
    const values = await Promise.all(
      keys.map(async (k) => {
        try {
          const raw = await ANALYTICS_KV.get(k, { type: 'text' });
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })
    );

    const events = [];
    let truncated = 0;
    for (const arr of values) {
      if (!Array.isArray(arr)) continue;
      if (events.length + arr.length > 50000) {
        truncated += arr.length;
        continue;
      }
      events.push(...arr);
    }
    events.sort((a, b) => (a.ts || 0) - (b.ts || 0));

    return json({
      ok: true,
      from,
      to,
      count: events.length,
      truncated,
      events,
    });
  } catch (err) {
    return json({ ok: false, error: (err && err.message) || 'kv_read_failed' }, 500);
  }
}
