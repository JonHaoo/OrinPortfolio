/**
 * prompts-page.ts — /prompts/ 提示词库交互（渐进增强）
 *
 * 职责：
 * 1. 复制全文：clipboard API + execCommand 兜底；按钮即时反馈 + aria-live 播报
 * 2. 分类筛选：按 data-cat 匹配切换卡片显隐，分类按钮颜色跟随激活态
 *
 * 原则：
 * - 无 JS 时页面完整可用（details 原生展开 / 收起，全文可读，SEO 安全）
 * - ClientRouter 软导航：以 astro:page-load 重挂，dataset 幂等防重复绑定；
 *   监听全部委托在页面根节点上，随 DOM 替换自动释放，无 window/document 泄漏
 */
const PAGE_MARKER = '[data-prompts-page]';
const FEEDBACK_MS = 1800;

/** execCommand 兜底：非安全上下文（http 预览等）下 clipboard API 不可用时走 textarea */
function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

/** 复制按钮反馈：标签与配色切换 + 视觉隐藏 live region 播报 */
function feedback(btn: HTMLElement, ok: boolean): void {
  const label = btn.querySelector('.pk-copy-label');
  if (!ok) return;
  btn.classList.add('pk-copied');
  if (label) label.textContent = '已复制';
  window.setTimeout(() => {
    btn.classList.remove('pk-copied');
    if (label) label.textContent = '复制全文';
  }, FEEDBACK_MS);
}

function announce(message: string): void {
  const live = document.getElementById('pk-live');
  if (!live) return;
  live.textContent = '';
  // 先清空再赋值，确保连续复制同一条时也触发播报
  window.setTimeout(() => {
    live.textContent = message;
  }, 30);
}

function initCopy(scope: HTMLElement): void {
  scope.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]');
    if (!btn || btn.classList.contains('pk-copied')) return;
    const card = btn.closest('.pk-card');
    const pre = card?.querySelector('.pk-pre');
    if (!pre) return;
    const text = (pre.textContent ?? '').trim();
    copyText(text).then((ok) => {
      feedback(btn, ok);
      announce(ok ? `已复制：${btn.dataset.title ?? '提示词'}` : '复制失败，请手动选择文本复制');
    });
  });
}

function initFilter(scope: HTMLElement): void {
  const btns = Array.from(scope.querySelectorAll<HTMLButtonElement>('.pk-filter-btn'));
  const cards = Array.from(scope.querySelectorAll<HTMLElement>('.pk-card'));
  if (!btns.length || !cards.length) return;

  function apply(cat: string): void {
    btns.forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    cards.forEach((c) => {
      c.hidden = cat !== 'all' && c.dataset.cat !== cat;
    });
  }

  scope.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.pk-filter-btn');
    if (!btn || !btn.dataset.cat) return;
    apply(btn.dataset.cat);
  });
}

function initPromptsPage(): void {
  const scope = document.querySelector<HTMLElement>(PAGE_MARKER);
  if (!scope || scope.dataset.pkInit) return;
  scope.dataset.pkInit = '1';
  initCopy(scope);
  initFilter(scope);
}

document.addEventListener('astro:page-load', initPromptsPage);
initPromptsPage();
