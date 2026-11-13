# VISUAL_BENCHMARK · Orin.DEV 作品集验收基准

> 依据 `AI_Vibe_Coding_UI_UX_Design_SOP_v3.md` §10.5（九维评分）+ §10.6（真实验收）。
> 基线：**动效实现之前**——本文件记录当前状态作为对照基线，每轮 P0–P3 修复后重新截图复查并追加记录。
> 评分说明：0 不符合 / 1 部分符合 / 2 符合。总分用于定位问题，不代表客观审美真理。

---

## 1. 验收基线记录（2026-11-13）

### 评分表（v3 §10.5 九维）

| 维度 | 得分 | 证据 |
|---|---|---|
| 风格一致性 | 2/2 | 硬阴影/粗描边/贴纸旋转/撞色全站统一，含 light/dark 双主题变量体系（`global.css` :root 变量绑定 Theme） |
| 信息层级 | 2/2 | 88px Hero 标题 → 64px 区块标题 → section-tag 徽标 → chips，阅读顺序在截图中与设计意图一致 |
| 布局与节奏 | 2/2 | 1440 画布内 96px 区块 padding 节奏、卡片 32px 间距是刻意的；跑马灯作为分隔带有效 |
| 组件一致性 | 1/2 | 五种按钮（btn-cta/btn-primary/btn-secondary/footer-mail-btn/wf-link-btn）各自声明阴影与 transition，存在 0.15/0.2/0.25s 三个随机值；chips 有四套近似实现（chip/skill-chip/wf-chip/doc-prin） |
| 内容质量 | 2/2 | 全部为真实具体内容（项目描述、交付笔记、方法论），无空洞占位文案——但死链接本身是"虚假 affordance"，见交互完整性 |
| 交互完整性 | 1/2 | 正常工作：页内锚点、mailto、主题开关（含 knob 过冲曲线）、跑马灯悬停暂停。**失效**：作品卡主 CTA「查看项目」×3 死链（`href="#"`）、页脚「现居广州」死链、主导航 5 个链接声明了 `transition: color` 却无任何 `:hover` 规则（颜色从不变）、active 硬编码在「作品」不随滚动更新、全站无 `:focus-visible` |
| 动效质量 | 1/2 | 已有动效均有目的且克制（按钮按压、卡片 hover 抬起、marquee 暂停、reduced-motion 处理）——值得肯定；但无入场编排、无滚动反馈、easing 不成体系、`box-shadow` 直接动画触发重绘（代码级推断，未跑 profile） |
| 沉浸体验 | 1/2 | v3 新增维度。本站无 Pin/Scrub/3D 场景编排，维度部分适用：**用户控制保留完好**（无滚动锁定、无强制叙事、原生滚动未受阻）；扣分项为"操作可理解"受死链拖累——4 个虚假可点击元素让操作结果不可预期 |
| 响应式表现 | 0/2 | 首页无任何媒体查询；`viewport-scaler` 数学为代码级事实：390px 视口缩放系数 ≈0.27，16px 正文视觉 ≈4.3px、44px 触控目标 ≈12px。若移动端在目标场景内（招聘方手机快速浏览），此为 P0 阻断（v3 §10.5：主要文字不可读 = 阻断，不能用其他维度高分抵消） |

**总分 12/18。** 短板集中在交互完整性、组件一致性、响应式三格——与"反馈链路有断点"的代码审查结论互相印证。

### 已验证 / 未验证声明（v3 §10.6 要求）

**已验证（事实）**：
- Astro dev server 实际运行（端口 4321），页面正常渲染
- 1440×900 视口全页截图，逐区块核对（导航 / Hero / 跑马灯 / 作品三卡 / 关于我 / 底气 / 方法论 / 页脚）
- 全量组件源码与 `global.css`（1328 行）代码级审查，含主题脚本与 viewport-scaler 脚本逻辑

**未验证（明确标注，不声称已完成）**：
- 1280×800 / 390×844 实际渲染截图（响应式 0 分为代码级推断，待实测确认或推翻）
- 深色模式视觉实测（仅读了 CSS 变量定义）
- `prefers-reduced-motion` 运行时行为
- 性能 profile：box-shadow 重绘、帧率（未跑 DevTools）
- **真实动画行为**：截图为静态，动效结论全部来自 CSS/JS 代码读取（遵守 v3 §10.2"静态截图不能据此断言真实动画行为"）

---

## 2. 问题清单（P0–P3）

| 级别 | 问题 | 位置 | 判定依据 |
|---|---|---|---|
| **P0** | 「查看项目」死链接 ×3 | `Works.astro` L61 `href="#"` | v3 §10.5 P0 定义：关键交互失效。作品卡主 CTA 是全站转化路径核心 |
| **P0** | 「现居广州」死链接 | `Footer.astro` L32 `href="#"` | 同上 |
| **P0\*** | 移动端缩放后文字不可读（视觉字号 ≈4.3px） | `Layout.astro` viewport-scaler | v3 §10.5：主要文字不可读 = 阻断。*前提：移动端在目标场景内；由用户确认后定级 |
| **P1** | 主导航 hover 零反馈 + active 不随滚动 | `global.css` `.site-nav a`（声明了 transition 却无 hover 规则） | v3 §7.2 组件状态：核心交互状态必须被覆盖 |
| **P1** | 全站无 `:focus-visible` 键盘焦点样式 | `global.css` 全局 | v3 §9.5：保留键盘可访问性、明显的焦点状态 |
| **P1** | index ↔ workflow 跨页硬重载，共用 header 无连续性 | `Layout.astro` | v3 §5.2 Shared Element Transition：导航切换；两页共用 logo/主题开关/CTA 却无 morph |
| **P2** | 锚点跳转无平滑滚动 | `global.css` | v3 §5.3：过渡节奏细节 |
| **P2** | 动效 token 缺失，easing 三随机值 | `global.css` | v3 §5.3 Motion Tokens / §8.1 |
| **P2** | 无首屏入场编排、无区块 reveal | 首页 | v3 §5.4 映射：Hero 分层进入、内容区块轻量揭示 |
| **P2** | 无滚动进度反馈（7 屏长页 + 18 章阅读页） | 全站 | v3 §5.4 |
| **P3** | trust-dot 无状态语义脉冲 | `Hero.astro` | 语义元素（"开放合作"）应有生命体征，但非任务必需 |
| **P3** | 箭头图标无方向性微动、Hero 无鼠标视差 | Works/Hero/WorkflowTeaser | v3 §5.2 Cursor-reactive：可选增强 |

---

## 3. 回归验收视口（v3 §10.6）

每轮修复后按以下固定视口重新截图，与基线对比：

- ✅ 桌面 1440 × 900（基线轮完成）
- ✅ 小屏笔记本 1280 × 800（R3 轮：缩放模式零回归）
- ✅ 移动端 390 × 844（R3 轮：流体模式全页验收）
- ✅ 另选窄屏 320 × 568 检查溢出（R3 轮：邮箱按钮修复后零溢出）

检查路径：初始加载 → 首屏 → 导航滚动状态 → 三张作品卡 hover → 主题切换 → 页脚 mailto → workflow 页往返。

---

## 4. 验收记录（修复后追加）

| 轮次 | 日期 | 修复内容 | 复查结果 | 备注 |
|---|---|---|---|---|
| — | 2026-11-13 | 基线建立，未修复任何代码 | 12/18（见评分表） | 动效方案已定稿于 `MOTION_GUIDE.md`，待逐项实现 |
| R1 | 2026-11-13 | **P0**：「查看项目」×3 →「聊聊这个项目」（href="#contact"）；「现居广州」→ 纯文本 span。**P1**：导航 hover 高亮块（::after scaleX）+ scroll-spy（IntersectionObserver，含 Hero 顶部边界修正）+ :focus-visible + 平滑滚动。**P2-a**：Motion tokens 落入 :root，全站 0.15/0.2/0.25s 收敛为 token（grep 验证零残留） | **通过**：交互完整性 1→2（无死链、导航全状态覆盖）；组件一致性 1→2（easing 统一）；沉浸体验 1→2（用户控制完整）。dev server 实测：hover scaleX(0→1)、滚动 active 迁移（works→about→workflow→回顶恢复 works）、Tab 焦点环（浅色黑/深色奶油自动切换）、主题切换正常、workflow 页 scroll-spy 静默无报错、控制台零错误、astro build 两页通过、1440×900 截图无视觉回归 | 剩余 P1：跨页 View Transitions（归入 P2-c）；P0*：移动端缩放不可读待用户确认场景优先级；P2-b/P2-c/P3 未动。评分预计 12→15/18（响应式 0/2 未变） |
| R2 | 2026-11-13 | **P2-b**：Hero 入场编排（6 幕：徽章拍上→标题抬升→荧光块 pop→文案/CTA→插画卡拍上→圆徽章弹入，≤900ms，纯 CSS，prefers-reduced-motion 关闭）；区块 reveal 差异化（Works 三卡 scale 拍上去 stagger 50ms 无位移、About/Stats 抬升 + section-tag pop、WorkflowTeaser clip-path 幕帘覆盖，全部 @supports + view() timeline 渐进增强，不支持则静态）；Hero hover 与 animation both 冲突用 hover 态覆盖规则解决。**P2-c**：Astro `<ClientRouter />` 跨页 View Transitions（logo/toggle/CTA 挂 view-transition-name：site-logo/site-toggle/site-cta；viewport-scaler 量高脚本改由 astro:page-load 驱动防第二页高度塌陷）；主题切换圆形扩散（startViewTransition 包裹换肤，clip-path circle 自开关实际坐标 Web Animations API 驱动 500ms ease-slide；双降级：不支持 startViewTransition 或 prefers-reduced-motion 时直接换肤） | **通过**：入场动画 8 元素终态 opacity=1（截图复核完整呈现、无半透明/位移残留）；hero-badge hover 在动画后正常恢复（transform/shadow 生效，animation 被 hover 规则覆盖为 none）；主题扩散执行（dark 生效、扩散原点 --vt-x/--vt-y 写入开关坐标 1209px/46.5px、可逆切回）；跨页 morph：index→workflow logo 位置连续（top 26.5→27、left 64→64、宽 160.9→161）、主题保持 light、返回首页后 scaler 4620px 正常重跑、reveal 挂载 view() timeline、控制台零错误、astro build 两页通过 | R2 轮动效质量 1→2（入场编排+差异化 reveal+跨页连续性+旗舰主题扩散均落地）。总分预计 15→16/18（响应式 0/2 仍未动，待用户决策移动端优先级）。P3 装饰清单待逐项决定 |
| R2-fix | 2026-11-13 | **用户实测反馈修复：跨页后主题按钮失灵。** 根因①：`is:inline` 脚本被 ClientRouter 软导航去重不重跑，主题监听器挂旧按钮节点，换页随节点丢弃（scroll-spy 的 IO 同理观察死节点）→ 重构 Layout body 脚本为幂等 `initPageScripts()`（scaler/theme-toggle/scroll-spy 三初始化统一由 document 级 `astro:page-load` 驱动 + 直接调用兜底；按钮 dataset 标记防重复挂载、observer disconnect 重建）。根因②（连带发现）：换页后 `<html data-theme="light">` 静态默认值重置用户已选深色主题，且 head 主题初始化脚本同为 inline 不重跑 → 给该脚本加 `data-astro-rerun`（Astro 官方软导航重跑机制，换页从 localStorage 恢复主题） | **通过（Playwright 完整复现用户路径验证）**：修复前复现 `before=light/after=light/broken=true`；修复后 5 步端到端全过——①软导航往返后 toggle light↔dark 均生效（listenerReattached=true）②storage=dark 时软导航回 index 自动恢复 dark（bodyBg 43,43,43）③toggle→light→软导航 workflow→light→回 index→light→toggle→dark→软导航 workflow→dark 全链主题一致 ④scroll-spy 软导航后正常（about 滚入真实检测带 [302,345]@862px 视口后 active 迁移「关于我」；早前误判为失效系测试按 900px 视口算错带位）⑤astro build 两页通过 | 附带沉淀：软导航页面的功能脚本一律走 `astro:page-load` 或 `data-astro-rerun`，不得依赖元素级监听器存活——已写入 MOTION_GUIDE §4 工程约束 |
| R2-fix3 | 2026-11-13 | **用户实测反馈确认：主题切换"回闪"为 bug（非故意效果）。** 根因：WAAPI 驱动 `::view-transition-new(root)` 的 clip-path 扩散动画默认 `fill: none`——动画 finished 瞬间 clip 回落 CSS 静态值 `circle(0px)`，新主题快照层瞬间不可见、露出底下旧主题快照层（`animation: none` 使旧层无退出动画、常驻底层）→ 出现"扩散完成后闪回旧主题一帧"再落定真实 DOM。修复：动画参数加 `fill: 'forwards'`，终值冻结至 View Transition 销毁快照层 | **通过（rAF 逐帧采样验证）**：130 帧时间线显示半径 0→1→…→2321px（扩散正常），峰值后 **2 帧保持 2321 满屏**（fill forwards 的终值保持效果），随后 pseudo 销毁直接落定真实 DOM；主题时间线全程 dark 无 light 回现（修复前该间隙露出的是旧主题快照）。astro build 两页通过 | 工程教训沉淀至 MOTION_GUIDE §4：View Transition 手写 clip-path 动画必须 `fill: 'forwards'`，否则终态回落静态值导致快照层回闪 |
| R2-fix4 | 2026-11-13 | **用户实测反馈：主题切换"中间卡一下"。** 量化定位（三组测量交叉验证）：①纯 rAF 计时 204 帧最大间隙 19ms 零卡顿——动画本身流畅；②逐帧读 pseudo 样式的采样在起步帧（radius≈29）出现 54ms 间隙——部分是采样开销（探针放大）；③PerformanceObserver longtask 全程空数组——无主线程阻塞。真实主因判定：click 瞬间 View Transition 快照捕获 + 全站 20+ 处 background-color transition 同帧样式重算，集中在扩散起步的第一帧（冷启动合成层），量级为单帧 ~45ms。修复（预防性优化）：`html.vt-freeze`——startViewTransition 时冻结全站 transition/animation（快照捕获期禁过渡，VT 标准做法），finished 后解冻；附带消除快照烙印半过渡色的隐患 | **通过**：3 轮连续切换 freeze/unfreeze 生命周期正确；解冻后 hover/卡片动画正常；longtask 空数组确认无阻塞；astro build 通过。**结论：起步帧开销源已移除；残余感知属合成层冷启动正常现象** | 工程教训：pseudo 样式逐帧采样（getComputedStyle on ::view-transition-*）会强制样式重算，测出的"卡顿"部分是探针制造；性能结论必须用 longtask/纯 rAF 等非侵入指标交叉验证 |
| R3 | 2026-11-13 | **移动端断点重排（P0\* 解除）：≤1023px 流式布局，≥1024px 保留 1440 缩放画布。** 断点依据：≥1024 时缩放系数 ≥0.71（正文 ≥11px 可读），≤1023 缩放后不可读 → 切流式。实现：①fit() 加 matchMedia('(max-width: 1023px)') 分支——移动端清除内联缩放（transform/left/height），断点值与 CSS 严格同源；②CSS 1023px 块：`.page` 转 static/100%、header 两行（logo+开关 / 导航铺开+触控加高 42px、CTA 隐藏因导航页脚已有联系入口）、Hero 纵排（插画卡转流式宽、圆徽章/星芒改挂角贴纸）、三卡/关于我/底气/页脚全部纵排、字号降档（标题 88→44px、区块标题 64→36px、正文 18→15px）；③≤359px 超窄屏邮箱按钮再降档（18→13px）修 320px 横向溢出 | **通过（四视口实测）**：390×844——流体模式激活（transform 清空/static/宽 390）、零横向溢出（scrollWidth=clientWidth）、正文 15px/标题 44px/触控 42px、全页截图逐区块复核（导航/Hero/跑马灯/三卡/关于我/底气/横幅/页脚）无重叠无裁切、主题扩散原点按移动端开关坐标（341,36）、scroll-spy 滚动迁移正常、跨页至 workflow 无溢出且监听器重挂（R2-fix 纪律生效）；320×568——溢出（邮箱按钮 315px>280px 可用宽）定位并修复后 scrollWidth=clientWidth=320；1280×800——缩放模式零回归（scale 0.889/hero 横排/CTA 可见/无溢出）；1440×900 前轮已验。astro build 两页通过 | **响应式表现 0→2**，总分预计 16→18/18（九维全满，P3 装饰项仍为可选增强）。附带沉淀：断点 JS/CSS 必须同源（matchMedia 直读同一查询串）；移动端只改布局尺寸不动颜色/阴影/描边——贴纸语言全分辨率一致 |
| R4 | 2026-11-13 | **内容增强：SOP v3 方法论提炼上站。** ①新页 `/design-sop/`（AI 辅助 UI/UX 设计 SOP·提炼版，复用 doc 页模式）：§1 三维度决策框架（8 视觉风格/5 体验模式/6 动效语言三张参考表 + Token 四档起点）、§2 五级冲突裁决链、§3 体验强度分区配置（含本站实际配置对照）、§4 九维验收基准 + 阻断条款 + P0–P3 分级、§5 十四条执行准则、§6 AI 协作指令纪律（分阶段/先方案后代码/禁抽象词当结论/区分事实与推测）、§7 本站即实证（R1→R3 真实评分轨迹 + docs/design/ 沉淀说明）；②首页方法论区改双卡（黑卡研发工作流 v1.0 + 白卡设计 SOP v3.0，区标题改「我的方法论」，白卡变体 `.workflow-banner-alt` 含深色模式 #333 适配）；③两页文档页导航互链（返回作品集/研发工作流/设计 SOP）+ 页脚导航补「AI 设计 SOP」链接 | **通过**：首页双卡实测（黑 rgb(20,20,20) + 白 rgb(255,255,255) 黑描边黑字、4 chips、链接正确、截图复核风格一致无重叠）；design-sop 页 7 章 6 表 38 行完整渲染、经 ClientRouter 软导航进入且主题按钮正确重挂（R2-fix 纪律）、toggle light↔dark 正常（深色表格 #333）、控制台零错误；390×844 零溢出、表格自适应换行可读（fullPage 截图复核）；workflow 页互链（研发工作流 active + 设计 SOP 可达）；astro build 3 页通过 | 内容质量维度保持 2/2 且信息密度增强——方法论双卡强化「可复用流程而非一次性运气」的 FDE/训练师定位。范围说明：未上全文（991 行），仅提炼对招聘方/合作方有决策价值的框架与纪律；PHASE 九阶段与指令库全文留在仓库文档 |

> AI生成
