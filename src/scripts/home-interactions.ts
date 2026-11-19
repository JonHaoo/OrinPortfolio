/**
 * 首页「关于我」以下的四套交互。
 *
 * 设计前提（2026-11-19 第五轮）：每个区块用不同的布局与交互语言，
 * 但都作用在真实内容上，不做演示性组件（用户第一轮就否掉了「交互实验室」）。
 *
 * 1) 精选作品 —— 主从切换：左侧索引点选，右侧档案面板切换
 * 2) 能力与方法 —— 横向卡带：按钮翻页 + 指针拖动 + 进度条
 * 3) 阅读账本 —— 图表联动：悬停/聚焦分类条，其余淡出并读占比
 * 4) 我的方法论 —— 双折页：点击/回车翻开，露出四条原则
 *
 * 全部按需初始化（元素不存在直接 return），并挂在 astro:page-load 上，
 * 保证 ClientRouter 软导航回首页时重新绑定。
 */

function initWorksSwitch(): void {
  const root = document.querySelector<HTMLElement>('[data-works]');
  // 初始加载会走两次（astro:page-load + 模块直调），加标记避免重复绑定
  if (!root || root.dataset.wkInit) return;
  root.dataset.wkInit = '1';

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-wk-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-wk-panel]'));
  if (!tabs.length || tabs.length !== panels.length) return;

  const select = (index: number) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      const on = i === index;
      panel.hidden = !on;
      // 重新触发入场动画：先摘掉再强制回流再加回去
      panel.classList.remove('is-in');
      if (on) {
        void panel.offsetWidth;
        panel.classList.add('is-in');
      }
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const key = e.key;
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
      e.preventDefault();
      let next = i;
      if (key === 'ArrowDown') next = (i + 1) % tabs.length;
      if (key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      if (key === 'Home') next = 0;
      if (key === 'End') next = tabs.length - 1;
      select(next);
      tabs[next].focus();
    });
  });

  select(Math.max(0, tabs.findIndex((t) => t.classList.contains('is-on'))));
}

let capSync: (() => void) | null = null;

function initCapStrip(): void {
  const track = document.querySelector<HTMLElement>('[data-strip-track]');
  if (!track || track.dataset.capInit) return;
  track.dataset.capInit = '1';

  const prev = document.querySelector<HTMLButtonElement>('[data-strip-prev]');
  const next = document.querySelector<HTMLButtonElement>('[data-strip-next]');
  const bar = document.querySelector<HTMLElement>('[data-strip-bar]');
  const count = document.querySelector<HTMLElement>('[data-strip-count]');
  const cards = Array.from(track.children) as HTMLElement[];
  if (!cards.length) return;

  const step = () => {
    // 必须用 offsetWidth：scrollLeft / scrollWidth / clientWidth 都是未缩放的布局坐标，
    // 而 getBoundingClientRect().width 会被 .page 的 transform: scale() 缩过（1440 画布下 ×0.933），
    // 两者混用会让每点一次「下一张」少走约 28px，卡片逐次错位（当前只有 4 张卡、一次就滚到底，症状被掩盖）
    const card = cards[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    return card + gap;
  };

  const go = (dir: number) => {
    track.scrollBy({ left: step() * dir, behavior: 'smooth' });
  };

  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));

  const pad = (n: number) => String(n).padStart(2, '0');

  const sync = () => {
    const max = track.scrollWidth - track.clientWidth;
    const ratio = max > 0 ? track.scrollLeft / max : 0;
    if (bar) bar.style.transform = `scaleX(${Math.max(0.06, ratio)})`;

    // 计数器显示「当前视野里是第几张到第几张」而不是单个序号，
    // 否则滚到末尾时左边缘是第 2 张，序号永远显示不到 04
    if (count) {
      const s = step();
      const visible = Math.max(1, Math.round((track.clientWidth + (s - cards[0].offsetWidth)) / s));
      const start = Math.round(track.scrollLeft / s);
      const end = Math.min(start + visible, cards.length);
      count.textContent =
        visible <= 1
          ? `${pad(end)} / ${pad(cards.length)}`
          : `${pad(start + 1)}–${pad(end)} / ${pad(cards.length)}`;
    }

    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft > max - 4;
  };

  track.addEventListener('scroll', sync, { passive: true });
  // resize 只能挂在 window 上，跨软导航不会随节点自动解绑：
  // 先摘掉上一轮的回调，否则每往返一次首页就多一个指向死节点的监听
  if (capSync) window.removeEventListener('resize', capSync);
  capSync = sync;
  window.addEventListener('resize', capSync);
  sync();

  // 指针拖动：鼠标用户没有横向滚轮，靠拖拽翻页
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  let moved = 0;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // 触屏交给原生滚动
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.classList.add('is-drag');
  });

  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    if (moved > 3) track.setPointerCapture?.(e.pointerId);
    track.scrollLeft = startLeft - dx;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-drag');
    if (moved > 24) {
      // 拖过半张卡就吸附到最近一张
      const target = Math.round(track.scrollLeft / step()) * step();
      track.scrollTo({ left: target, behavior: 'smooth' });
    }
  };

  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  track.addEventListener('pointerleave', end);
}

function initReadingBars(): void {
  const wrap = document.querySelector<HTMLElement>('[data-bars]');
  if (!wrap || wrap.dataset.barsInit) return;
  wrap.dataset.barsInit = '1';

  const rows = Array.from(wrap.querySelectorAll<HTMLElement>('[data-bar]'));
  const read = document.querySelector<HTMLElement>('[data-chart-read]');
  const idle = read?.dataset.idle || '';
  if (!rows.length) return;

  const clear = () => {
    wrap.classList.remove('has-on');
    rows.forEach((row) => row.classList.remove('is-on'));
    if (read) read.textContent = idle;
  };

  rows.forEach((row) => {
    const on = () => {
      wrap.classList.add('has-on');
      rows.forEach((r) => r.classList.toggle('is-on', r === row));
      if (read) {
        const name = row.dataset.name || '';
        const hours = row.dataset.hours || '';
        const pct = row.dataset.pct || '';
        read.textContent = `${name} · ${hours} · 占总时长 ${pct}`;
      }
    };
    row.addEventListener('pointerenter', on);
    row.addEventListener('focus', on);
    row.addEventListener('pointerleave', () => {
      if (!wrap.contains(document.activeElement)) clear();
    });
    row.addEventListener('blur', clear);
  });

  wrap.addEventListener('pointerleave', () => {
    if (!wrap.contains(document.activeElement)) clear();
  });
}

function initFlipCards(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-flip]'));
  if (!cards.length) return;

  cards.forEach((card) => {
    if (card.dataset.flipInit) return;
    card.dataset.flipInit = '1';
    const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-flip-btn]'));
    const front = card.querySelector<HTMLElement>('.wf-front');
    const back = card.querySelector<HTMLElement>('.wf-back');
    if (!front || !back) return;

    // backface-visibility 只影响可见性，不影响可访问性树与 Tab 顺序：
    // 用 inert 把背对的那一面整体摘出去，避免读到两面、或 Tab 到看不见的按钮
    // moveFocus：键盘触发时把焦点交给新露出的那一面；鼠标点击不抢焦点，
    // 否则会凭空出现一圈 focus-visible 虚线框
    const setOpen = (open: boolean, moveFocus = true) => {
      card.classList.toggle('is-open', open);
      buttons.forEach((b) => b.setAttribute('aria-expanded', open ? 'true' : 'false'));
      front.inert = open;
      back.inert = !open;
      if (moveFocus) {
        (open ? back : front)
          .querySelector<HTMLButtonElement>('[data-flip-btn]')
          ?.focus({ preventScroll: true });
      }
    };

    front.inert = false;
    back.inert = true;

    buttons.forEach((btn) => {
      // MouseEvent.detail === 0 表示这次点击由键盘（Enter / 空格）产生
      btn.addEventListener('click', (e) => {
        setOpen(!card.classList.contains('is-open'), (e as MouseEvent).detail === 0);
      });
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card.classList.contains('is-open')) {
        setOpen(false);
        card.querySelector<HTMLButtonElement>('[data-flip-front]')?.focus({ preventScroll: true });
      }
    });
  });
}

/* 书脊导航的阅读进度：右缘那条 2px 线随滚动增长。
   软导航会把 .site-rail 换成新节点，所以监听只挂一次、每次现查节点。 */
let railBound = false;
let railFrame = 0;
function initRailProgress(): void {
  const paint = () => {
    const rail = document.querySelector<HTMLElement>('.site-rail');
    if (!rail) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    rail.style.setProperty('--rail-p', p.toFixed(4));
  };

  // scrollHeight 会强制同步布局，而写 --rail-p 又让样式失效：
  // 直接在 scroll 回调里一读一写等于每帧抖动布局，用 rAF 合并到每帧最多一次
  const schedule = () => {
    if (railFrame) return;
    railFrame = requestAnimationFrame(() => {
      railFrame = 0;
      paint();
    });
  };

  if (!railBound) {
    railBound = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  paint();
}

export function initHomeInteractions(): void {
  initWorksSwitch();
  initCapStrip();
  initReadingBars();
  initFlipCards();
  initRailProgress();
}
