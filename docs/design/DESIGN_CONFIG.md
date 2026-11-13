# DESIGN_CONFIG · Orin.DEV 作品集项目配置

> 依据 `AI_Vibe_Coding_UI_UX_Design_SOP_v3.md` §13 模板生成，记录本项目的正式设计选择。
> 状态：**已确认待实现**。对应细节见 `MOTION_GUIDE.md`（动效规范）与 `VISUAL_BENCHMARK.md`（验收基准）。

```yaml
project_design:
  # ---- 视觉风格（SOP v3 §03）----
  visual_style:
    primary: "Neubrutalism（新粗野主义）"
    secondary: null          # 不设辅助风格——硬阴影/粗描边/贴纸旋转/撞色已全站统一

  # ---- 体验模式（SOP v3 §04）----
  experience_mode:
    primary: "Standard Product Experience（MODE A）"
    secondary: "Motion-led Interactive Experience（MODE B）——轻度：仅微交互与状态转场，不引入 Pin/Scrub/平滑滚动"
  mode_rationale: |
    v3 §4.1 五问：核心任务是招聘方/合作方快速浏览与触达（非探索）；
    内容为阅读型卡片与长文档，无可探索产品模型；
    无滚动叙事与 3D 的内容理由。对应 v3 §4.2 组合表
    "Standard Product + Motion-led" 行。

  # ---- 动效语言（SOP v3 §05）----
  motion_language: "Playful & Elastic（Cinematic & Dramatic 仅限一次性 Hero 入场编排）"

  # ---- 交互画像 ----
  interaction_profile:
    scroll: "native（不引入 Lenis；锚点用 scroll-behavior: smooth）"
    cursor: "standard + Hero 有限视差 ≤10px（可选，P3）"
    touch: "native-and-adaptive（Tap 替代 Hover，待实现）"
    3d: "off"
    transitions: "playful-stamp（拍上去/拎起来/按下去三动词体系）"
    storytelling: "off"

  # ---- 体验强度分布（SOP v3 §4.3 要求显式声明）----
  motion_intensity:
    hero: "medium"                 # 一次性入场编排，总时长 ≤900ms，落定后完全静态
    storytelling_sections: "none"  # 本站无叙事区段
    content_sections: "low"         # About/Stats/WorkflowTeaser 轻量差异化 reveal
    navigation: "low"               # hover 高亮块 + scroll-spy；不做 sticky 收缩
    utility_components: "medium"   # 按压/抬升/箭头微移；高频操作优先反馈快速
    marquee: "ambient"              # 跑马灯为既有 ambient 循环，悬停暂停
    3d_scene: "off"

  # ---- 技术选型（SOP v3 §09）----
  technology:
    animation: "CSS first（transition/animation + animation-timeline 渐进增强）"
    view_transitions: "Astro <ClientRouter /> + document.startViewTransition（特性检测降级）"
    scroll_controller: "off（不用 ScrollTrigger；reveal 用 CSS animation-timeline: view()）"
    smooth_scroll: "off（原生滚动 + scroll-behavior: smooth，包在 prefers-reduced-motion: no-preference 内）"
    3d_engine: "off"
    new_dependencies: "zero"

  # ---- 响应式策略（SOP v3 §7.5）----
  responsive_strategy:
    desktop: "scaled-canvas（≥1024px：1440 设计稿等比缩放，系数 ≥0.71，正文 ≥11px）"
    tablet: "fluid-reflow（≤1023px 断点重排：导航两行、Hero/卡片纵排、字号降档）"
    mobile: |
      fluid-reflow（同 tablet，≤1023px 生效；超窄屏 ≤359px 邮箱按钮再降档）。
      2026-11-13 R3 轮已实现并验收：390×844 / 320×568 全页无横向溢出、
      正文 15px / 标题 44px / 导航触控高 42px、主题扩散与 scroll-spy 正常、
      ≥1024px 缩放模式零回归（1280×800 / 1440×900 复测通过）。

  # ---- 质量要求（SOP v3 §9.5）----
  quality:
    performance: "transform/opacity/clip-path 优先；现有 box-shadow 动画重绘问题记录在案、暂不动"
    reduced_motion: "supported（现有 media query 块扩展覆盖所有新增动画）"
    native_navigation: "preserved（无滚动锁定、无强制叙事）"
    keyboard_accessibility: "待补（:focus-visible 全站样式，P1）"
    webgl_fallback: "n/a（无 3D）"
```

## 变更记录

| 日期 | 变更 | 依据 |
|---|---|---|
| 2026-11-13 | 初版：确认风格/模式/语言/强度分布；响应式标记移动端 P0 阻断 | SOP v2 → v3 重审 + 1440×900 实跑截图审查 |

> AI生成
