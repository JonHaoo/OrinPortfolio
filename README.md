# OrinPortfolio

个人作品集网站（AI 解决方案工程师 / FDE 方向），新粗野主义（Neubrutalism）风格。

## 技术栈

- [Astro](https://astro.build/) — 静态站点框架
- 原生 CSS（自定义属性实现明暗双主题）+ 原生 TS
- [three.js](https://threejs.org/) — Hero Q 版 3D 形象（按需加载，WebGL 不可用时自动回退平面图）
- 字体自托管：ZCOOL QingKe HuangYou / Archivo Black / Noto Sans SC（@fontsource）

## 功能

- 首页：Hero / 作品 / 关于我 / 底气 / 阅读账本 / 方法论 / 页脚
- 独立页面：`/reading/` 阅读报告、`/workflow/` 研发工作流规范、`/design-sop/` 设计 SOP
- 明暗主题切换（右上角开关，localStorage 持久化）
- 1440px 设计稿等比缩放渲染；≤1023px 切流式布局
- 微交互：按钮按压回弹、卡片悬浮、跑马灯无缝滚动（支持 prefers-reduced-motion）

## 目录结构

```
├── public/            # 静态资源（Hero 形象图、3D 模型、favicon）
├── docs/design/       # 设计配置 / 动效规范 / 视觉验收基准
├── src/
│   ├── components/    # 页面区块组件
│   ├── data/          # 站点数据源（阅读数据快照）
│   ├── layouts/       # 布局（字体加载、主题初始化、缩放脚本）
│   ├── pages/         # 页面入口
│   ├── scripts/       # 浏览器端 TS（3D 形象）
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

- **GitHub Pages**：push 到 `main` 自动构建发布（`.github/workflows/deploy.yml`），地址 https://jonhaoo.github.io/OrinPortfolio/ 。子路径 base 由工作流注入 `ASTRO_BASE=/OrinPortfolio`。
- **WorkBuddy 应用托管**：构建 `npm run build` 后发布 `dist/` 目录（默认 base 为根路径 `/`）。

## 文档索引

- `docs/design/DESIGN_CONFIG.md` — 视觉风格、体验模式、动效强度、响应式策略
- `docs/design/MOTION_GUIDE.md` — 动效规范
- `docs/design/VISUAL_BENCHMARK.md` — 视觉验收基准

## 说明

- 页面内容基于真实经历整理，项目与数据均为可核实信息；文案在 `src/components/` 与 `src/pages/` 中调整。
- 阅读数据为快照，核心数字与类型分布集中在 `src/data/reading.ts`，更新时只改该文件，首页与报告页同步生效。
