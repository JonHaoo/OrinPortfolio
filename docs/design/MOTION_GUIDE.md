# MOTION_GUIDE · Orin.DEV 作品集动效设计规范

> 状态：**P0 / P1 / P2-a / P2-b / P2-c 已实现并验收（2026-11-13 R2 轮）；仅 P3 待逐项决定**
> 依据：`AI_Vibe_Coding_UI_UX_Design_SOP_v3.md`（§03 风格库 / §04 体验模式 / §05 动效系统）+ 2026-11-13 全站代码审查与 1440×900 实跑截图审查
> 范围：首页（index）+ 工作流规范页（workflow）的全局动效规则

---

## 0. 体验模式与主动效语言声明

### 0.1 体验模式（SOP v3 §04 新增维度）

**主模式 MODE A（Standard Product Experience）+ 辅助 MODE B（Motion-led）轻度组合。**

依据（v3 §4.1 五问逐条回答）：
1. 主要任务是快速完成还是探索内容？→ 招聘方/合作方快速浏览作品与联系方式，核心任务是"快速了解 + 触达"，非探索体验
2. 内容性质？→ 阅读为主（个人介绍 + 三张案例卡 + 方法论长文档），无产品模型可探索
3. 是否真的需要滚动编排/3D/空间探索？→ 否。无 Pin/Scrub/3D 场景；scroll-driven 仅用于轻量 reveal（对应 v3 §4.2 组合表"Standard Product + Motion-led"行）
4. 设备与网络承受？→ 可承受，且无必要引入 Lenis/GSAP（v3 §9.2：原生滚动已满足需求时不必引入）
5. 沉浸式后能否快速导航？→ 当前导航 active 都不随滚动更新——先修反馈完整性，再谈沉浸

**强度分布（v3 §4.3 要求显式声明）**：Hero = 中（一次性入场编排）；Content 区 = 低（轻量 reveal）；Navigation = 低（hover 高亮 + scroll-spy，不做收缩）；Utility 组件 = 中（按压/抬升/箭头微移）；Storytelling 区 = 无（本站无叙事区段）；3D Scene = 关闭。

### 0.2 主动效语言：Playful & Elastic（弹性质感）

依据：SOP v3 §03 对 Neubrutalism 的动效签名为「按压反馈、弹性卡片、颜色变化、形状变化、动态字体」。本站的核心隐喻是"贴纸拍在纸上"——贴纸的运动是**离散的、有重量的、落定后安静**的，不是连续漂浮的。

**限定引入**：Cinematic & Dramatic 的分层节奏**只允许且仅允许用于一次性 Hero 入场编排（§2.1）。**主动效语言仍是 Playful & Elastic。**

### 运动词汇表（全站仅此三种动词）

| 动词 | 表现 | 用途 |
|---|---|---|
| **拍上去**（stamp in） | scale 从小到大 + 过冲回落；硬阴影从 0 生长/塌缩 | 入场、reveal |
| **拎起来**（lift up） | translateY(-4~6px) + rotate 微调 + 阴影增大 | hover 抬升 |
| **按下去**（press down） | 位移量 = 阴影偏移量，阴影归零 | active 按压 |

**禁止的动词**：漂浮 float、呼吸 bob、透视倾斜 tilt、连续摆动 swing、无限脉冲（唯一豁免见 §2.5 trust-dot）。

---

## 1. Motion Tokens

对齐 SOP v3 §5.3 Motion Tokens 区间。实现位置：`src/styles/global.css` 的 `:root` 块。

```css
/* Duration（SOP v3 §5.3：Fast 120–180 / Normal 180–300 / Slow 350–600）*/
--dur-fast: 120ms;   /* 微交互：箭头微移、hover 阴影、焦点环 */
--dur-base: 200ms;   /* 组件过渡：卡片 hover、导航高亮、reveal */
--dur-slow: 400ms;   /* 重点转场：主题扩散、跨页 morph */
--stagger: 50ms;     /* SOP v3 §5.3 Stagger 40–100ms：卡片序列依次拍上去 */

/* Easing（SOP v3 §5.3：进入用 Ease Out / 弹性用 Spring / 状态切换用 Ease In Out）*/
--ease-pop:    cubic-bezier(0.34, 1.56, 0.64, 1);  /* Spring 过冲：拍上去、按压回弹、贴纸 pop */
--ease-lift:   cubic-bezier(0.22, 1.2, 0.36, 1);   /* Ease Out：抬升、区块进入 */
--ease-slide:  cubic-bezier(0.65, 0, 0.35, 1);     /* Ease In Out：高亮块迁移、主题扩散 */

/* 既有值收敛映射（消除 0.15s/0.2s/0.25s 三个随机值）*/
0.15s ease → var(--dur-fast) + var(--ease-pop)
0.2s  ease → var(--dur-base) + var(--ease-pop)
0.25s ease（主题色迁移）→ var(--dur-base) + var(--ease-slide)
```

**规则**：
- 新动效一律引用 token，禁止出现第五个时长或第四条曲线 = 回归 review。
- 主题切换的 `background-color` 过渡属于状态迁移，用 `--ease-slide`（SOP v3 §5.3："Ease In Out 用于状态切换"）。
- Stagger 只用于 Works 三卡 reveal 与 Hero 编排内元素序列；其余场景同帧出现。

---

## 2. 页面与组件动效方案

### 2.1 Hero 首屏入场编排（一次性，总时长 ≤ 900ms，Cinematic 分层节奏的唯一使用点）

**触发**：页面 load，纯 CSS animation，动画结束后元素完全静态。

**编舞（顺序即时间轴，间隔≈stagger 档）**：

| 序 | 元素 | 动词与参数 | 时长 |
|---|---|---|---|
| 1 | 贴纸徽章（.hero-badge） | 拍上去：scale 0.6→1 + rotate -8°→-2°，`--ease-pop` | 320ms |
| 2 | 大标题两行 | 抬升进入：translateY 24px→0 + fade，逐行，`--ease-lift` | 240ms ×2，间隔 80ms |
| 3 | 荧光块（.hero-title-marker） | 文字落定后单独 pop：scale 0.92→1.02→1，`--ease-pop` | 200ms |
| 4 | 副文案 + 双 CTA | 依次淡入抬升 translateY 12px，`--ease-lift` | 200ms ×2，间隔 60ms |
| 5 | 插画卡（.hero-image-card） | 拍上去：rotate 0°→2° + 阴影 0→10px 生长，`--ease-pop` | 360ms |
| 6 | 圆徽章（.hero-status-badge） | 拍上去：scale 0→1.1→1，最后一个落定 | 280ms |

**设计目的**：第一屏是招聘方对"工程品味"的 3 秒判断窗口；入场编排让静态贴纸视觉"演出来"——证明它是被设计过的，而非模板。

**降级**：`prefers-reduced-motion: reduce` 下全部瞬时呈现（扩展现有 media query 块）。

### 2.2 区块 reveal（滚动进入，差异化——SOP v3 §5.5 红线的直接响应）

**触发**：`animation-timeline: view()`（scroll-driven CSS），`view-timeline-inset: 0 0 -10%`，包在 `@supports (animation-timeline: view())` 内。

**按内容类型差异化（禁止统一淡入上移）**：

| 区块 | 动效 | 理由 |
|---|---|---|
| **Works（三卡）** | 逐卡"拍上去"：阴影 0→8px 生长 + scale 0→1，**无位移**，stagger 50ms | 保持"一排三张"构图秩序；SOP v3 §5.5 允许 stagger，禁的是同一种淡入上移 |
| **About / Stats** | 区块整体 `--ease-lift` 抬升（24px）+ section-tag 单独 pop 一次 | 两种类型区分于 Works 的拍上去 |
| **WorkflowTeaser 黑色横幅** | 色块覆盖式进入：从底边铺开（新色块自下而上覆盖），呼应 §2.4 主题扩散语言 | 与主题切换共用"色块覆盖"心智 |

**设计目的**：7 屏长页面获得滚动呼吸节奏；差异化确保不触犯 v3 §5.5 红线"不要把所有进入动画都写成相同的淡入上移"。

**降级**：`@supports` 不满足时直接静态呈现，无 JS fallback——无动画≠坏体验，这正是选 scroll-driven CSS 而非 JS 库的原因（v3 §9.1：基础动画 CSS 优先）。

### 2.3 导航：hover 反馈 + scroll-spy（P1，先于一切动效增强实现）

**触发 A**：悬停单个链接 → 黄底描边高亮块从左向右展开（120ms，`--ease-pop`）。
**触发 B**：滚动经过对应区块 → IntersectionObserver 更新 active 项。

**✅ 实现注记（2026-11-13）**：高亮块为每链接独立的 `::after`（黄底 + var(--card-line) 描边，7px 总高，scaleX 0→1 从左展开）；active 迁移时旧块收缩 + 新块展开，统一 fast/pop 曲线。Hero 先于 sections 注册观察：页面回顶部时高亮首区块「作品」，避免残留最后区块高亮（验收中发现的边界修正）。跨页链接「工作流」用 `data-spy` 显式声明目标区块。

**设计目的**：`hero-title-marker` 荧光块已是本站核心图形符号；导航复用它做状态指示 = 系统一致性；scroll-spy 为 7 屏长页提供"我在哪"的持续反馈。

**降级**：无 JS 时保留 hover 反馈，active 停留初始值。

**显式豁免（判断，非套模板）**：SOP v3 §5.4 映射建议"导航栏滚动时背景变化、轻微收缩"——**不采用**。改 sticky/收缩会改变布局契约，违反 v3 §7.1"不得为视觉效果牺牲导航清晰度"；方向反馈由 scroll-spy 承担。

### 2.4 View Transitions 双件套（P2）

**A. 跨页连续性**：Astro `<ClientRouter />`（View Transitions）
- 触发：index ↔ workflow 任意导航
- 表现：header 的 logo / 主题开关 / CTA 设 `view-transition-name`，跨页 morph 为同一实体；主体内容 crossfade
- 目的：两个页面从"两个网站"变"一个应用"；workflow 页是站内最重内容资产，入口却是白屏硬重载
- 实现注意：`viewport-scaler` 的量高脚本是 IIFE 立即执行，跨页 swap 后必须监听 `astro:page-load` 重跑，否则第二页高度塌陷
- 降级：Firefox 旧版自动退回普通加载，零损失

**B. 主题切换圆形扩散（旗舰效果）**
- 触发：点击主题开关
- 表现：`document.startViewTransition()` 包主题切换，`::view-transition-new(root)` 用 `clip-path: circle()` 自开关实际坐标向外扩散（半径 = 对角线长度，500ms，`--ease-slide`），新主题像一张纸从开关位置铺开盖住旧主题
- 目的：不透明色块覆盖正是新粗野主义本体语言；对以"工程品味"为卖点的作品集，这是辨识度最高的一次性投入（Chrome DevTools、Linear 同款语言）
- 降级：特性检测 `document.startViewTransition`，不支持时退回现有 0.25s 全局变色（Firefox 用户无感）。

### 2.5 P3 装饰性微动（克制清单）

| 项 | 触发/表现 | 判定依据 |
|---|---|---|
| trust-dot 呼吸脉冲 | opacity 1→0.6→1，2.4s 循环 | 全站**唯一**建议新增的 ambient 循环，因表达"开放合作·可联系"状态语义（v3 §5.5 禁的是无意义循环，非状态语义） |
| 箭头方向性微移 | hover 时 translateX 4px 过冲回定（120ms，`--ease-pop`） | 箭头表"前往"，悬停先走一步是最便宜的语义化微交互 |
| Hero 鼠标视差 | 鼠标进入 Hero 时 sparkle/徽章/插画卡 6~10px 反向位移（rAF 节流，transform only） | 表达"贴纸层"分离感；明确不做 3D tilt |
| 跑马灯速度联动 | 滚动越快跑得越快（需小段 JS 算速度改 `animation-duration`） | 性价比最低，仅在其他全部完成后有余力才做 |

### 2.6 滚动进度条（P2）

- 触发：任意滚动，`animation-timeline: scroll(root)`
- 表现：3px 黄色条沿页面最顶边 0%→100% 填充，衬在现有黑色结构线上
- ⚠️ 实现注意（项目特有坑）：`.page` 挂有 `transform: scale()`，transform 创建 containing block，`position: fixed` 子元素会相对 `.page` 定位且随页面滚走 → 进度条必须挂在 `.viewport-scaler` 之外的 `body` 下，宽度逻辑与 scaler 脚本对齐
- workflow 页（18 章长文档）同款必加；移动端以 Tap 替代 Hover 的回归验证按 v3 §7.5 执行

### 2.7 其他规则

- **数字滚动 count-up**：不做。「0→1/全链路/控幻觉」是文字不是数字，硬做假计数是自欺
- **卡片持续悬浮/呼吸**：不做。软运动与"拍上去"语言相反
- **可逆性检查（v3 §5.5 新增条款的对照）**：本方案所有动画均可自然结束或逆向——View Transitions 双向对称；主题扩散反向即回原主题；跑马灯 hover 暂停/恢复已有；reveal 随滚动退出视口自然反向；无任何"用户陷入无法恢复状态"的动画

---

## 3. 无障碍与降级（SOP v3 §5.5 / §9.5）

| 机制 | 规则 |
|---|---|
| `prefers-reduced-motion` | 现有 media query 块直接扩展：新增动画逐项挂入；marquee 停止逻辑已有，保留 |
| View Transitions | 特性检测，Firefox 旧版退回普通跳转 |
| `@supports (animation-timeline: view())` | scroll-driven reveal 的唯一包裹条件；不满足 = 静态呈现 |
| 键盘焦点 | 全站 `:focus-visible`：3px 黑描边 + 3px 黄 outline-offset（与卡片描边同语言） |
| 平滑滚动 | `scroll-behavior: smooth` 包在 `@media (prefers-reduced-motion: no-preference)` 内 |

---

## 4. 工程约束与性能（SOP v3 §09）

1. **零新增依赖**：全部 CSS + Astro 内置能力（`<ClientRouter />`、`startViewTransition`）；符合 v3 §9.4"简单动画不引入大型动画库"
2. **属性纪律**：新增动画仅 `transform` / `opacity` / `clip-path`；`box-shadow` 动画（现有 hover）触发重绘——本轮不动，将来优化用伪元素阴影（translate 一个 `::after` 色块）省掉重绘，新粗野硬阴影恰是最易做成合成层动画的形态
3. **监听清理**：scroll-spy 的 IntersectionObserver、鼠标视差的 rAF、跑马灯速度联动的 scroll listener，均须在页面卸载/路由切换时清理（SOP v3 §9.4 原文要求）
4. **软导航脚本存活纪律（R2-fix 实证教训）**：ClientRouter 软导航会替换 DOM 且 `is:inline` 脚本不重跑——任何挂在页面元素上的监听器/观察器都会随节点丢弃（曾致主题按钮跨页失灵）。规则：换页后需要存活的初始化逻辑一律收敛进幂等 init 函数，由 document 级 `astro:page-load` 驱动（dataset 标记 / disconnect 重建保证幂等）；head 中的状态恢复脚本（如主题初始化）加 `data-astro-rerun`
5. **View Transition 终态保持纪律（R2-fix3 实证教训）**：手写 clip-path 扩散动画（WAAPI pseudoElement 驱动）必须 `fill: 'forwards'`——否则动画 finished 瞬间 clip 回落 CSS 静态零半径、新快照层消失露出旧快照层，产生"扩散完成后回闪旧主题一帧"的 bug
6. **View Transition 快照期冻结纪律（R2-fix4）**：`startViewTransition` 时给 `<html>` 加 `vt-freeze` 类冻结全站 transition/animation（快照捕获期禁过渡是 VT 标准做法），`finished` 后解冻——消除 click 瞬间全站 20+ 处 background transition 的样式重算开销与快照烙印半过渡色的双重隐患
7. **性能测量纪律（R2-fix4 实证教训）**：对 `::view-transition-*` pseudo 逐帧 `getComputedStyle` 会强制样式重算，测出的"卡顿"部分是探针制造的。动效性能结论必须用非侵入指标（PerformanceObserver longtask / 纯 rAF 帧间隔）交叉验证
8. **动画引擎唯一性**：同一元素不得同时被 CSS animation 与 View Transition 捕获；Hero 入场动画期间如触发主题切换，以 View Transition 为准（入场 animation 结束态即最终态，无冲突）

---

## 5. 实现顺序（对齐 SOP v3 §11 PHASE 06–09）

1. **P0**：✅ 已完成——「聊聊这个项目」×3（href="#contact"）、「现居广州」降级纯文本 span
2. **P1**：✅ 已完成——导航 hover 高亮块 + scroll-spy（含 Hero 顶部边界）+ focus-visible + 平滑滚动
3. **P2-a**：✅ 已完成——Motion tokens 落入 `:root` + 全站 easing 收敛（grep 验证零残留）
4. **P2-b**：✅ 已完成——Hero 入场编排（6 幕拍上去，≤900ms，终态静态，hover 覆盖规则已处理 animation both 锁死问题）+ 区块 reveal 差异化（Works 拍上去 stagger / About·Stats 抬升 + tag pop / WorkflowTeaser clip-path 幕帘，`@supports(animation-timeline: view())` 渐进增强）
5. **P2-c**：✅ 已完成——View Transitions 双件套：`<ClientRouter />` + logo/toggle/CTA 三元素 `view-transition-name` 跨页 morph（scaler 由 `astro:page-load` 重跑）；主题切换 `startViewTransition` 圆形扩散（500ms，自开关坐标，特性检测 + reduced-motion 双重降级）
6. **P3**：装饰清单按值不值逐项决定

每步完成后按 SOP v3 §10.6 固定视口（1440×900 / 1280×800 / 390×844）截图回归，验收记录追加进 `VISUAL_BENCHMARK.md`。

---

## 6. AVOID 清单（终稿）

连续悬浮 float / 数字滚动 count-up / 渐变 shimmer / 自定义光标轨迹 / 3D tilt 卡片 / 每区块逐卡 stagger 飞入 / 无语义 ambient 循环 / 全站滚动视差 / Hero 视差 > 12px。

> 原则一句话：这个风格的动效只做三种事——**拍上去（入场）、拎起来（hover）、按下去（press）**。所有连续漂浮类运动一律拒绝。

> AI生成
