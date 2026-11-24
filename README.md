# OrinPortfolio

个人作品集网站（AI 解决方案工程师 / FDE 方向），新粗野主义（Neubrutalism）风格。

## 技术栈

- [Astro](https://astro.build/) — 静态站点框架
- 原生 CSS（自定义属性实现明暗双主题）+ 原生 TS
- [three.js](https://threejs.org/) — Hero Q 版 3D 形象（按需加载，WebGL 不可用时自动回退平面图）
- [GSAP](https://gsap.com/) + ScrollTrigger、[Lenis](https://lenis.darkroom.engineering/) — `/reading/` 阅读档案页专属（滚动叙事 + 平滑滚动；触摸与 prefers-reduced-motion 走原生路径）
- 字体自托管：ZCOOL QingKe HuangYou / Archivo Black / Noto Sans SC / Space Grotesk（@fontsource）

## 功能

- 首页：Hero / 作品 / 关于我 / 底气 / 阅读账本 / 方法论 / 页脚
- 独立页面：`/reading/` 阅读档案（编辑式数据叙事：四叙事阶段 / 逐日热力图 / 双口径分类对比 / 交互式图表）、`/workflow/` 研发工作流规范、`/design-sop/` 设计 SOP、`/prompts/` 提示词库（个人常用 Prompt 六类整理，一键复制 + 分类筛选）
- 阅读数据管线：`weread-data/export_site_data.py` 把微信读书 Agent API 原始快照加工为 `src/data/weread.json`（站点唯一数据源，更新数据只需重跑脚本）
- 明暗主题切换（右上角开关，localStorage 持久化）
- 访问统计（自有轻量埋点：PV / 停留 / 点击 / 滚动 → EdgeOne 边缘函数 + KV，见 `docs/analytics/`）
- 1440px 设计稿等比缩放渲染；≤1023px 切流式布局
- 微交互：按钮按压回弹、卡片悬浮、跑马灯无缝滚动（支持 prefers-reduced-motion）

## 目录结构

```
├── public/            # 静态资源（Hero 形象图、3D 模型、favicon）
├── docs/analytics/    # 访问监控：部署指南 + 本地看板 dashboard.html
├── docs/design/       # 设计配置 / 动效规范 / 视觉验收基准
├── edge-functions/api/ # EdgeOne 边缘函数（collect.js 接收埋点 / stats.js 鉴权查询）
├── src/
│   ├── components/    # 页面区块组件（reading/ 子目录 = 阅读档案页组件）
│   ├── data/          # 站点数据源（weread.json 唯一数据快照 + reading.ts 视图层 + prompts.ts 提示词库）
│   ├── layouts/       # 布局（字体加载、主题初始化、缩放脚本、埋点注入）
│   ├── pages/         # 页面入口
│   ├── scripts/       # 浏览器端 TS（3D 形象 / 阅读档案页动效岛 / 提示词库页交互 / 访问埋点）
│   └── styles/        # 全局样式与主题变量
└── astro.config.mjs
```

## 快速开始

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:4321
npm run build    # 构建到 dist/
npm run preview  # 本地预览构建产物
```

## 部署

- **EdgeOne Makers（主要渠道，大陆访问稳定）**：同一仓库 Git 导入，构建命令 `npm run build`、输出 `dist`、base 保持 `/`；`edge-functions/` 提供 `/api/collect`、`/api/stats` 两个边缘函数，配套 KV 存储即为访问监控后端。部署步骤见 [docs/analytics/DEPLOY.md](docs/analytics/DEPLOY.md)，监控看板双击打开 `docs/analytics/dashboard.html`。
- **GitHub Pages**：push 到 `main` 自动构建发布（`.github/workflows/deploy.yml`），地址 https://jonhaoo.github.io/OrinPortfolio/ 。子路径 base 由工作流注入 `ASTRO_BASE=/OrinPortfolio`。
- **WorkBuddy 应用托管**：构建 `npm run build` 后发布 `dist/` 目录（默认 base 为根路径 `/`）。

## 文档索引

- `docs/analytics/DEPLOY.md` — 访问监控：EdgeOne 部署 / KV 绑定 / 看板使用- `docs/design/DESIGN_CONFIG.md` — 视觉风格、体验模式、动效强度、响应式策略
- `docs/design/MOTION_GUIDE.md` — 动效规范
- `docs/design/VISUAL_BENCHMARK.md` — 视觉验收基准

## 说明

- 页面内容基于真实经历整理，项目与数据均为可核实信息；文案在 `src/components/` 与 `src/pages/` 中调整。
- 阅读数据为快照：原始 JSON 由微信读书 Agent API 抓取（`weread-data/`），`export_site_data.py` 加工为 `src/data/weread.json`，`src/data/reading.ts` 只做视图层派生——更新时重跑脚本，首页与档案页自动同步。

> AI生成
