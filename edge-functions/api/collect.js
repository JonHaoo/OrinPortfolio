// ============================================================
// /api/collect — 访问埋点接收（EdgeOne Edge Function）
// 职责：接收站点 analytics.ts 的批量事件，注入 IP / 地理位置 / UA 等
//       服务端信息，按北京日期追加写入 KV 天级桶 evt_YYYYMMDD。
// 部署依赖：项目绑定 KV 命名空间，变量名必须为 ANALYTICS_KV
// （控制台 → Pages → 项目 → KV 存储 → 绑定命名空间）
// ============================================================

const MAX_EVENTS_PER_BATCH = 50; // 单批事件上限
const MAX_DAYS_EVENTS = 8000; // 单日桶事件上限（防异常刷量撑爆 value）
const VALID_TYPES = new Set(['pv', 'stay', 'click', 'scroll', 'unload']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** 北京时间（UTC+8）日期字符串：20261123 */
function bjDayKey(ts = Date.now()) {
  const d = new Date(ts + 8 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `evt_${y}${m}${day}`;
}

function clip(v, max) {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', ...CORS_HEADERS, ...extra },
  });
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  if (!payload || !Array.isArray(payload.events) || payload.events.length === 0) {
    return json({ ok: false, error: 'no_events' }, 400);
  }

  // ---- 服务端注入的请求上下文（浏览器 JS 拿不到的信息都在这） ----
  const eo = (request && request.eo) || {};
  const geo = eo.geo || {};
  const ctxEnv = {
    ip: clip(eo.clientIp, 64),
    g: {
      cc: clip(geo.countryCodeAlpha2, 2), // 国家/地区代码 CN
      co: clip(geo.countryName, 32), // 国家/地区名
      rg: clip(geo.regionName, 32), // 省 / 区域
      city: clip(geo.cityName, 32), // 城市
      asn: typeof geo.asn === 'number' ? geo.asn : undefined, // 运营商 AS 号
    },
    ua: clip(request.headers.get('user-agent'), 300),
  };

  const ts = Date.now();
  const events = [];
  const source = payload.events.slice(0, MAX_EVENTS_PER_BATCH);

  for (let i = 0; i < source.length; i++) {
    const ev = source[i] || {};
    const ty = VALID_TYPES.has(ev.ty) ? ev.ty : 'unknown';
    const cleaned = {
      ts,
      ty,
      p: clip(ev.p, 200) || '/',
      sid: clip(payload.sid, 64) || 'unknown',
      vid: clip(payload.vid, 64) || 'unknown',
    };
    // 批次级会话上下文：入口来源 / 语言 / 分辨率 / 时区（本批第一条带全批共享）
    if (i === 0) {
      cleaned.ref = clip(payload.ref, 300);
      cleaned.lang = clip(payload.lang, 16);
      cleaned.sc = clip(payload.sc, 16);
      cleaned.tz = clip(payload.tz, 48);
    }
    // 事件数据：只保留白名单字段并截断，防脏数据
    if (ev.d && typeof ev.d === 'object') {
      const d = {};
      if (typeof ev.d.ms === 'number') d.ms = Math.min(Math.max(0, Math.round(ev.d.ms)), 86400000);
      if (typeof ev.d.pct === 'number') d.pct = ev.d.pct;
      if (typeof ev.d.l === 'string') d.l = ev.d.l.slice(0, 80);
      if (typeof ev.d.tg === 'string') d.tg = ev.d.tg.slice(0, 16);
      if (typeof ev.d.h === 'string') d.h = ev.d.h.slice(0, 200);
      if (Object.keys(d).length) cleaned.d = d;
    }
    events.push({ ...cleaned, ...ctxEnv });
  }

  // ---- 写入 KV 天级桶（读-改-写；个人站流量下并发冲突窗口可忽略） ----
  try {
    if (typeof ANALYTICS_KV === 'undefined') {
      return json(
        {
          ok: false,
          error: 'kv_not_bound',
          hint: '请在控制台为项目绑定 KV 命名空间，变量名 ANALYTICS_KV',
        },
        500
      );
    }
    const key = bjDayKey(ts);
    let bucket = [];
    try {
      const raw = await ANALYTICS_KV.get(key, { type: 'text' });
      if (raw) bucket = JSON.parse(raw);
      if (!Array.isArray(bucket)) bucket = [];
    } catch {
      bucket = [];
    }
    if (bucket.length >= MAX_DAYS_EVENTS) {
      return json({ ok: false, error: 'daily_limit' }, 429);
    }
    bucket.push(...events);
    await ANALYTICS_KV.put(key, JSON.stringify(bucket));
    return json({ ok: true, stored: events.length, day: key.slice(4) });
  } catch (err) {
    return json({ ok: false, error: (err && err.message) || 'kv_write_failed' }, 500);
  }
}
