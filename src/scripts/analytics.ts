// ============================================================
// 站点访问埋点（自有轻量方案，数据接入 EdgeOne 边缘函数 + KV）
// 采集：PV / 页面停留时长 / 点击操作 / 滚动深度 / 设备与来源
// 上报：POST {endpoint}，批量缓冲 + 退场 sendBeacon，静默失败不干扰页面
// 隐私：尊重 doNotTrack；本地开发环境（localhost/127.0.0.1）不上报
// ============================================================

type EventTy = 'pv' | 'stay' | 'click' | 'scroll';

interface TrkEvent {
  ty: EventTy;
  p: string; // 页面路径
  t: number; // 客户端时间戳（服务端另记接收时间）
  d?: Record<string, unknown>;
}

/** 提交的批次结构：会话级字段平铺，事件只带页面相关数据 */
interface Batch {
  vid: string;
  sid: string;
  ref?: string;
  lang?: string;
  sc?: string;
  tz?: string;
  events: TrkEvent[];
}

/** 上报端点：默认同源（EdgeOne 部署时与站点同域）；
 *  站点部署在 GitHub Pages 等跨域托管时，通过
 *  window.__ANALYTICS_ENDPOINT__ = 'https://your-project.edgeone.app/api/collect'
 *  或构建变量 PUBLIC_ANALYTICS_ENDPOINT 覆盖。 */
const ENDPOINT: string =
  (typeof window !== 'undefined'
    ? (window as unknown as Record<string, string | undefined>)['__ANALYTICS_ENDPOINT__']
    : undefined) ||
  import.meta.env.PUBLIC_ANALYTICS_ENDPOINT ||
  '/api/collect';

const QUEUE_FLUSH_MS = 3000; // 批量缓冲窗口
const QUEUE_MAX = 16; // 队列上限，先到先发
const CLICK_MIN_INTERVAL_MS = 800; // 同页点击节流
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟无事件视为新会话
const SCROLL_MARKS = [25, 50, 75, 100];

// ---------------- 开关 ----------------

const enabled: boolean = (() => {
  if (typeof window === 'undefined' || !ENDPOINT) return false;
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  // 尊重浏览器的「禁止跟踪」设置
  const dnt =
    navigator.doNotTrack ||
    (window as unknown as Record<string, string | undefined>)['doNotTrack'];
  return dnt !== '1' && dnt !== 'yes';
})();

// ---------------- 访客 / 会话标识 ----------------

function uid(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + '_' + rnd;
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem('trk_vid');
    if (!v) {
      v = uid('v');
      localStorage.setItem('trk_vid', v);
    }
    return v;
  } catch {
    return 'v_anon_' + Date.now().toString(36);
  }
}

/** 会话：sessionStorage 存 id，localStorage 存最后活跃时间，超时轮换新会话 */
function getSession(): { sid: string; isNew: boolean } {
  try {
    const now = Date.now();
    let sid = sessionStorage.getItem('trk_sid');
    const last = Number(localStorage.getItem('trk_last') || 0);
    let isNew = false;
    if (!sid || now - last > SESSION_TIMEOUT_MS) {
      sid = uid('s');
      sessionStorage.setItem('trk_sid', sid);
      isNew = true;
    }
    localStorage.setItem('trk_last', String(now));
    return { sid, isNew };
  } catch {
    return { sid: uid('s'), isNew: true };
  }
}

function touchActive(): void {
  try {
    localStorage.setItem('trk_last', String(Date.now()));
  } catch {
    /* ignore */
  }
}

const vid = getVisitorId();
/** 会话快照（每批上报平铺携带，跨批不重建） */
let snap: Batch = { vid, sid: '', events: [] };

// ---------------- 队列与上报 ----------------

const queue: TrkEvent[] = [];
let flushTimer: number | undefined;

function sendNow(beacon: boolean): void {
  if (!queue.length) return;
  const payload: Batch = { ...snap, events: queue.slice() };
  queue.length = 0;
  const body = JSON.stringify(payload);
  try {
    if (beacon && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
    }).catch(() => {});
  } catch {
    /* 静默：统计失败绝不影响页面 */
  }
}

function pushEvent(ev: TrkEvent): void {
  queue.push(ev);
  touchActive();
  if (queue.length >= QUEUE_MAX) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = undefined;
    }
    sendNow(false);
  } else if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      flushTimer = undefined;
      sendNow(false);
    }, QUEUE_FLUSH_MS);
  }
}

// ---------------- 页面停留时长（只累计前台可见时间） ----------------

let pageEnterAt = Date.now(); // 本次进入/回到前台时刻
let pageActiveMs = 0; // 当前页累计前台活跃时长
let currentPage = '';
let staySent = false;

function reportStay(): void {
  if (!enabled || !currentPage || staySent) return;
  const active = pageActiveMs + (Date.now() - pageEnterAt);
  if (active < 800) return; // 极短停留忽略
  staySent = true;
  pushEvent({ ty: 'stay', p: currentPage, t: Date.now(), d: { ms: Math.round(active) } });
}

function enterPage(path: string): void {
  currentPage = path;
  pageActiveMs = 0;
  pageEnterAt = Date.now();
  staySent = false;
  scrollMarksFired.clear();
  pushEvent({ ty: 'pv', p: path, t: Date.now() });
}

// ClientRouter 软导航：换页前补报旧页停留（旧 DOM 即将丢弃，pagehide 不会触发）
document.addEventListener('astro:before-swap', reportStay);
// 真实关闭 / 刷新 / 跳离
window.addEventListener('pagehide', () => {
  reportStay();
  sendNow(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pageActiveMs += Date.now() - pageEnterAt;
    reportStay();
    sendNow(true);
  } else {
    pageEnterAt = Date.now();
  }
});

// ---------------- 点击操作 ----------------

const CLICK_TARGETS = 'a, button, [role="button"], input, textarea, select, summary, [data-track]';
let lastClickAt = 0;

document.addEventListener(
  'click',
  (e: MouseEvent) => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastClickAt < CLICK_MIN_INTERVAL_MS) return;
    const target = e.target as Element | null;
    const el =
      target && typeof target.closest === 'function'
        ? (target.closest(CLICK_TARGETS) as HTMLElement | null)
        : null;
    if (!el) return;
    lastClickAt = now;

    // 元素标识优先级：data-track 点名 > aria-label > 可见文案 > 标签+id
    let label = el.getAttribute('data-track') || el.getAttribute('aria-label');
    if (!label) {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      label = text.slice(0, 40);
    }
    if (!label) {
      const id = el.id ? '#' + el.id : '';
      label = el.tagName.toLowerCase() + id;
    }
    const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') : undefined;
    pushEvent({
      ty: 'click',
      p: currentPage,
      t: Date.now(),
      d: { l: label, tg: el.tagName.toLowerCase(), h: href && href.length <= 200 ? href : undefined },
    });
  },
  { capture: true }
);

// ---------------- 滚动深度 ----------------

const scrollMarksFired = new Set<number>();
let scrollPending = false;

function onScroll(): void {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => {
    scrollPending = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const pct = (window.scrollY / max) * 100;
    for (const m of SCROLL_MARKS) {
      if (pct >= m && !scrollMarksFired.has(m)) {
        scrollMarksFired.add(m);
        pushEvent({ ty: 'scroll', p: currentPage, t: Date.now(), d: { pct: m } });
      }
    }
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

// ---------------- 页面生命周期入口（首载与软导航均触发） ----------------

function onPageLoad(): void {
  if (!enabled) return;
  const { sid, isNew } = getSession();
  if (isNew || snap.sid !== sid) {
    // 新会话：记入口 referrer 与设备信息
    snap = {
      vid,
      sid,
      ref: document.referrer || undefined,
      lang: navigator.language,
      sc: window.screen ? `${window.screen.width}x${window.screen.height}` : undefined,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      events: [], // 仅占位，发送时由 sendNow 覆盖
    };
  }
  enterPage(pagePath());
}

if (enabled) {
  document.addEventListener('astro:page-load', onPageLoad);
  onPageLoad();
}
