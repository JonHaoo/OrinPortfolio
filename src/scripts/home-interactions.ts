/**
 * 首页五套交互。
 *
 * 设计前提（2026-11-19 第五轮 / 2026-11-20 第七轮）：每个区块用不同的布局与交互语言，
 * 但都作用在真实内容上，不做演示性组件（用户第一轮就否掉了「交互实验室」）。
 *
 * 0) 关于我 —— 旅程地图：滚动驱动进度线生长 + 站点逐个点亮
 * 1) 精选作品 —— 主从切换：左侧索引点选，右侧档案面板切换
 * 2) 能力与方法 —— 巨型标号带：点选/方向键切换 + 整块海报换色 + 证据错峰滑入
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

function initCapBelt(): void {
  const belt = document.querySelector<HTMLElement>('[data-cap-belt]');
  if (!belt || belt.dataset.beltInit) return;
  belt.dataset.beltInit = '1';

  const tabs = Array.from(belt.querySelectorAll<HTMLButtonElement>('[data-bl-tab]'));
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-bl-panel]'));
  if (!tabs.length || tabs.length !== panels.length) return;

  let current = 0;

  const select = (index: number, moveFocus = false) => {
    if (index === current && !panels[index].hidden) return;
    current = index;

    // tablist 语义：aria-selected + roving tabindex，键盘焦点只在当前项
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle('on', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });

    panels.forEach((panel, i) => {
      const on = i === index;
      panel.hidden = !on;
      panel.classList.remove('is-current');
      if (on) {
        // 重播证据错峰入场：摘掉 → 强制回流 → 加回
        void panel.offsetWidth;
        panel.classList.add('is-current');
      }
    });

    if (moveFocus) tabs[index].focus();
  };

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));

  // 键盘：← → 顺序切换，Home / End 跳首尾
  belt.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    e.preventDefault();
    let to = current;
    if (key === 'ArrowRight') to = (current + 1) % tabs.length;
    if (key === 'ArrowLeft') to = (current - 1 + tabs.length) % tabs.length;
    if (key === 'Home') to = 0;
    if (key === 'End') to = tabs.length - 1;
    select(to, true);
  });

  select(Math.max(0, tabs.findIndex((t) => t.classList.contains('on'))));
}

function initReadingBars(): void {
  const wrap = document.querySelector<HTMLElement>('[data-bars]');
  if (!wrap || wrap.dataset.barsInit) return;
  wrap.dataset.barsInit = '1';

  const rows = Array.from(wrap.querySelectorAll<HTMLElement>('[data-bar]'));
  // 读数行 .rd-chart-read 是 .rd-bars 的兄弟（同属 .rd-chart），不是后代：
  // 联动态要同步挂到 .rd-chart 上，CSS 才能选中它换成强调色。
  const chart = wrap.closest<HTMLElement>('.rd-chart');
  const read = document.querySelector<HTMLElement>('[data-chart-read]');
  const idle = read?.dataset.idle || '';
  if (!rows.length) return;

  const clear = () => {
    wrap.classList.remove('has-on');
    chart?.classList.remove('has-on');
    rows.forEach((row) => row.classList.remove('is-on'));
    if (read) read.textContent = idle;
  };

  rows.forEach((row) => {
    const on = () => {
      wrap.classList.add('has-on');
      chart?.classList.add('has-on');
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
      // inert 只管可聚焦性，屏幕阅读器读的是 aria-hidden：两者必须同步，
      // 否则翻开后背面仍被当作隐藏内容。模板默认 true，保证无 JS 时不会 Tab 到背面。
      front.setAttribute('aria-hidden', open ? 'true' : 'false');
      back.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (moveFocus) {
        (open ? back : front)
          .querySelector<HTMLButtonElement>('[data-flip-btn]')
          ?.focus({ preventScroll: true });
      }
    };

    front.inert = false;
    back.inert = true;
    front.setAttribute('aria-hidden', 'false');
    back.setAttribute('aria-hidden', 'true');

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

/* ---- 关于我 · 旅程地图：滚动驱动进度线（2026-11-20 第七轮） ----
   [data-journey] 上写 --jp（0→1），CSS 据此 scaleX 生长进度线；
   4 个站点按阈值逐个点亮（.is-lit），回滚会熄灭，可来回擦洗。
   reduced-motion：直接给终态（线全亮、站点全亮），不挂监听。
   监听全局只挂一次、每次现查节点，兼容 ClientRouter 软导航。 */
let journeyBound = false;
let journeyFrame = 0;

function initAboutJourney(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const paint = () => {
    const root = document.querySelector<HTMLElement>('[data-journey]');
    if (!root) return;

    if (reduce) {
      root.style.setProperty('--jp', '1');
      root.querySelectorAll('.ab-stop').forEach((s) => s.classList.add('is-lit'));
      return;
    }

    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // 进入视口 82% 高度开始生长，走到 24% 高度处完成（约 0.58 屏的滚动行程）
    const p = (vh * 0.82 - rect.top) / (vh * 0.58);
    const jp = Math.min(1, Math.max(0, p));
    root.style.setProperty('--jp', jp.toFixed(4));
    root.querySelectorAll('.ab-stop').forEach((s, i) => {
      s.classList.toggle('is-lit', jp >= (i + 0.7) / 4);
    });
  };

  if (reduce) {
    paint();
    return;
  }

  const schedule = () => {
    if (journeyFrame) return;
    journeyFrame = requestAnimationFrame(() => {
      journeyFrame = 0;
      paint();
    });
  };

  if (!journeyBound) {
    journeyBound = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // 打印/长截图不会滚动：给终态，避免进度线停在空白轨道上（与 reveal 兜底同一动机）
    window.addEventListener('beforeprint', () => {
      const root = document.querySelector<HTMLElement>('[data-journey]');
      if (!root) return;
      root.style.setProperty('--jp', '1');
      root.querySelectorAll('.ab-stop').forEach((s) => s.classList.add('is-lit'));
    });
  }
  paint();
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
  initAboutJourney();
  initWorksSwitch();
  initCapBelt();
  initReadingBars();
  initFlipCards();
  initRailProgress();
}
