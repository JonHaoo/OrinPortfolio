/**
 * reading-motion.ts — /reading/ 档案页动效与交互岛（渐进增强）
 *
 * 职责：
 * 1. Lenis 平滑滚动（仅桌面滚轮；触摸走原生，不影响移动端手势）
 * 2. GSAP + ScrollTrigger：首屏入场编排、关键数字计数、章节渐入、图表逐步绘制图表
 * 3. 章节联动：子导航 spy 高亮 + 顶部阅读进度条 + 回到顶部
 * 4. 全局 tooltip（data-tip 委托）、Escape 收起手风琴、锚点平滑定位
 *
 * 原则：
 * - prefers-reduced-motion 下跳过全部动画与 Lenis；交互（tooltip/details）保持可用
 * - HTML 内是完整内容（终值/全图表），无 JS 亦完整可读（SEO 安全）
 * - ClientRouter 软导航：astro:page-load 重挂，离开本页时销毁 Lenis 与 ScrollTrigger
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const PAGE_MARKER = '[data-reading-page]';

let lenis: Lenis | null = null;
let ctxs: gsap.Context[] = [];
/** window/document 级监听清理：ClientRouter 软导航反复进出本页时防累积 */
let cleanups: Array<() => void> = [];
let rafFn: ((time: number) => void) | null = null;
let mounted = false;

const reduced = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 安全 from：目标缺失/为空时跳过，避免 GSAP 空目标告警（如无 blk-title 的区块） */
function fromSafe(target: Element | Element[] | NodeList | null, vars: gsap.TweenVars): void {
  if (!target) return;
  if (typeof (target as NodeList).length === 'number' && (target as NodeList).length === 0) return;
  gsap.from(target as Element, vars);
}

/* ---------- Lenis 平滑滚动（桌面滚轮） ---------- */
function initLenis(): void {
  if (lenis || reduced()) return;
  lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    // 触摸默认原生滚动（smoothTouch: false），移动端体验不受影响
  });
  // Lenis × ScrollTrigger 标准同步
  lenis.on('scroll', ScrollTrigger.update);
  rafFn = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(rafFn);
  gsap.ticker.lagSmoothing(0);
}

function destroyLenis(): void {
  if (rafFn) {
    gsap.ticker.remove(rafFn);
    rafFn = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}

/* ---------- 关键数字计数动画（终值已在 DOM，动画仅为增强） ---------- */
function runCount(el: HTMLElement): void {
  const target = Number(el.dataset.count || '0');
  const decimals = Number(el.dataset.decimal || '0');
  const proxy = { v: 0 };
  gsap.to(proxy, {
    v: target,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = proxy.v.toFixed(decimals);
    },
  });
}

function initCounts(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    runCount(el);
  });
}

/* ---------- 首屏入场编排（一次性） ---------- */
function initEntrance(scope: HTMLElement): void {
  const c = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.mast-meta', { y: -14, opacity: 0, duration: 0.4 })
      .from('.t-zh', { y: 46, opacity: 0, duration: 0.7 }, '-=0.15')
      .from('.t-lat', { opacity: 0, duration: 0.4 }, '-=0.3')
      .from('.mast-lede', { y: 24, opacity: 0, duration: 0.5 }, '-=0.2')
      .from(
        '.nw-hero, .nw-finish, .nw-lead-item',
        { y: 34, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' },
        '-=0.2',
      )
      .from('.nw-strip', { opacity: 0, duration: 0.4 }, '-=0.3')
      .from('.rdx-y26', { y: 30, opacity: 0, duration: 0.55 }, '-=0.2')
      .from('.mast-note', { opacity: 0, duration: 0.3 }, '-=0.25');

    // 数字计数与数字墙弹出同步启动
    gsap.delayedCall(0.35, () => initCounts(scope));
  }, scope);
  ctxs.push(c);
}

/* ---------- 滚动叙事：章节头 / 图表绘制 / 装饰视差 ---------- */
function initScrollFX(scope: HTMLElement): void {
  const c = gsap.context(() => {
    // 章节头：横线生长 + 标题上移
    scope.querySelectorAll<HTMLElement>('.rdx-stage-head').forEach((head) => {
      fromSafe(head.querySelectorAll('.idx-sq, .lat'), {
        x: -18,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        scrollTrigger: { trigger: head, start: 'top 78%' },
      });
      fromSafe(head.querySelector('.line'), {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 0.7,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: head, start: 'top 78%' },
      });
      fromSafe(head.querySelector('.rdx-stage-title'), {
        y: 34,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: head, start: 'top 78%' },
      });
      fromSafe(head.querySelector('.rdx-stage-kicker'), {
        y: 16,
        opacity: 0,
        duration: 0.5,
        scrollTrigger: { trigger: head, start: 'top 70%' },
      });
    });

    // 巨型背景章节数字：轻微视差（reduced-motion 不会走到这里）
    scope.querySelectorAll<HTMLElement>('.rdx-stage-ghost').forEach((ghost) => {
      gsap.to(ghost, {
        yPercent: 26,
        ease: 'none',
        scrollTrigger: { trigger: ghost.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // 区块标题与内容：轻量渐入（不上纲上线，避免重复淡入堆砌）
    scope.querySelectorAll<HTMLElement>('.rdx-block').forEach((block) => {
      fromSafe(block.querySelectorAll('.blk-title'), {
        y: 18,
        opacity: 0,
        duration: 0.45,
        scrollTrigger: { trigger: block, start: 'top 82%' },
      });
    });

    // 年度柱：自底部长出
    gsap.from('.ycol .ybar', {
      scaleY: 0,
      transformOrigin: 'bottom',
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.07,
      scrollTrigger: { trigger: '.rdx-yearchart', start: 'top 80%' },
    });

    // 月度柱
    gsap.from('.mcol .mbar', {
      scaleY: 0,
      transformOrigin: 'bottom',
      duration: 0.5,
      stagger: 0.045,
      scrollTrigger: { trigger: '.rdx-monthstrip', start: 'top 85%' },
    });

    // 24 小时柱
    gsap.from('.hcol .hbar', {
      scaleY: 0,
      transformOrigin: 'bottom',
      duration: 0.5,
      stagger: 0.02,
      scrollTrigger: { trigger: '.rdx-hourchart', start: 'top 85%' },
    });

    // 热力图格子：按时间顺序（DOM 序 = 日序）铺开
    gsap.from('.hm-grid .cell:not(.ph)', {
      opacity: 0,
      duration: 0.25,
      stagger: 0.0016,
      ease: 'none',
      scrollTrigger: { trigger: '.rdx-heatmap', start: 'top 82%' },
    });

    // 分类双条
    gsap.from('.bar-track .bar', {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.6,
      stagger: 0.05,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.rdx-catbars', start: 'top 82%' },
    });

    // 作者条 + 出版社条
    gsap.from('.ab-row .ab-bar', {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.55,
      stagger: 0.05,
      scrollTrigger: { trigger: '.rdx-authorbars', start: 'top 84%' },
    });
    gsap.from('.pb-row .pb-bar', {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.45,
      stagger: 0.04,
      scrollTrigger: { trigger: '.rdx-pubbars', start: 'top 86%' },
    });

    // 榜单时长条
    gsap.from('.rk-book .rk-bar', {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.55,
      stagger: 0.07,
      scrollTrigger: { trigger: '.rdx-ranklist', start: 'top 82%' },
    });

    // 书脊：自书架长出（有节制的招牌动效）——两个书架各自触发、只播一次
    scope.querySelectorAll<HTMLElement>('.sh-row').forEach((row) => {
      const spines = row.querySelectorAll<HTMLElement>('.spine');
      if (!spines.length) return;
      gsap.from(spines, {
        scaleY: 0,
        transformOrigin: 'bottom',
        duration: 0.5,
        ease: 'back.out(1.6)',
        stagger: 0.035,
        scrollTrigger: { trigger: row, start: 'top 88%', once: true },
      });
    });

    // 观察三层卡
    gsap.from('.obs-layer', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      scrollTrigger: { trigger: '.rdx-obs', start: 'top 82%' },
    });

    // 读书之最
    gsap.from('.bs-item', {
      y: 22,
      opacity: 0,
      duration: 0.45,
      stagger: 0.035,
      scrollTrigger: { trigger: '.rdx-bests', start: 'top 85%' },
    });

    // 勋章墙
    gsap.from('.md-hero', {
      y: 26,
      opacity: 0,
      duration: 0.6,
      scrollTrigger: { trigger: '.rdx-medals', start: 'top 82%' },
    });
    gsap.from('.md-item', {
      y: 20,
      opacity: 0,
      duration: 0.45,
      stagger: 0.04,
      scrollTrigger: { trigger: '.md-grid', start: 'top 86%' },
    });

    // 尾声
    gsap.from('.cl-list > div', {
      x: -16,
      opacity: 0,
      duration: 0.45,
      stagger: 0.06,
      scrollTrigger: { trigger: '.rdx-colophon', start: 'top 82%' },
    });
  }, scope);
  ctxs.push(c);
}

/* ---------- 章节联动：spy 高亮 ---------- */
function initSpy(): void {
  const chips = document.querySelectorAll<HTMLAnchorElement>('.rdx-chips .rdx-chip');
  if (!chips.length) return;
  const map = new Map<string, HTMLAnchorElement>();
  chips.forEach((c) => {
    const id = c.dataset.spy || c.getAttribute('href')?.slice(1) || '';
    if (id) map.set(id, c);
  });
  const ids = ['s01', 's02', 's03', 's04', 'colophon'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    const chip = map.get(id);
    if (!el || !chip) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive) {
          chips.forEach((c) => c.classList.remove('is-active'));
          chip.classList.add('is-active');
        }
      },
    });
  });
  // 初始：第一项
  map.get('s01')?.classList.add('is-active');
}

/* ---------- 进度条 / 回到顶部 ---------- */
function initProgressAndTop(): void {
  const bar = document.getElementById('rdx-progress');
  const top = document.getElementById('rdx-totop');
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (top) top.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.9);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));
  onScroll();

  top?.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 0.9 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- 锚点：Lenis 下接管子导航定位 ---------- */
function initAnchorLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('.rdx-chips a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = (a.getAttribute('href') || '').slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -64, duration: 0.9 });
      else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    });
  });
}

/* ---------- 全局 tooltip（委托，支持触屏点击） ---------- */
function initTooltip(scope: HTMLElement): void {
  const tip = document.getElementById('rdx-tip');
  if (!tip) return;

  const show = (target: HTMLElement) => {
    const html = target.dataset.tip;
    if (!html) return;
    tip.innerHTML = html;
    tip.classList.add('is-on');
    tip.setAttribute('aria-hidden', 'false');
  };
  const move = (x: number, y: number) => {
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const px = Math.min(x + 16, window.innerWidth - w - 12);
    const py = Math.min(y + 18, window.innerHeight - h - 12);
    tip.style.left = `${Math.max(px, 12)}px`;
    tip.style.top = `${Math.max(py, 12)}px`;
  };
  const hide = () => {
    tip.classList.remove('is-on');
    tip.setAttribute('aria-hidden', 'true');
  };

  scope.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (t) show(t);
  });
  scope.addEventListener('pointermove', (e) => {
    if (tip.classList.contains('is-on')) move(e.clientX, e.clientY);
  });
  scope.addEventListener('pointerout', (e) => {
    const t = (e.target as HTMLElement).closest('[data-tip]');
    if (t && !(e as PointerEvent).relatedTarget?.closest?.('[data-tip]')) hide();
  });
  // 触屏：点按显示/再点隐藏；滚动时收起，避免漂移
  scope.addEventListener('pointerdown', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (t) {
      show(t);
      move(e.clientX, e.clientY);
    } else {
      hide();
    }
  });
  window.addEventListener('scroll', hide, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', hide));
}

/* ---------- Escape 收起全部手风琴 ---------- */
function initEscape(): void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('details.cb-row[open], details.rk-row[open]').forEach((d) => {
      (d as HTMLDetailsElement).removeAttribute('open');
    });
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));
}

/* ---------- 挂载 / 卸载 ---------- */
function mount(): void {
  const scope = document.querySelector<HTMLElement>(PAGE_MARKER);
  if (!scope || mounted) return;
  mounted = true;

  initLenis();
  if (!reduced()) {
    initEntrance(scope);
    initScrollFX(scope);
  }
  initSpy();
  initProgressAndTop();
  initAnchorLinks();
  initTooltip(scope);
  initEscape();
}

function unmount(): void {
  ctxs.forEach((c) => c.revert());
  ctxs = [];
  cleanups.forEach((fn) => fn());
  cleanups = [];
  destroyLenis();
  ScrollTrigger.getAll().forEach((t) => t.kill());
  mounted = false;
}

// ClientRouter 软导航生命周期：
// - astro:after-swap 时 DOM 已替换：若新页面无本页标记则立即销毁（Lenis 会劫持整站滚动）
// - astro:page-load 时按标记决定是否挂载（首次直进 / 从其他页返回本页）
document.addEventListener('astro:after-swap', () => {
  if (!document.querySelector(PAGE_MARKER)) unmount();
});
document.addEventListener('astro:page-load', () => {
  if (document.querySelector(PAGE_MARKER)) mount();
  else unmount();
});
if (document.querySelector(PAGE_MARKER)) mount();
