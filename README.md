# neubrutalism-portfolio

个人作品集网站（独立开发 & AI 企业服务方向），新粗野主义（Neubrutalism）风格。

## 技术栈

- [Astro](https://astro.build/) — 静态站点框架
- 原生 CSS（自定义属性实现明暗双主题）+ 原生 JS
- 字体自托管：ZCOOL QingKe HuangYou / Archivo Black / Noto Sans SC（@fontsource）

## 功能

- 明暗主题切换（右上角开关，localStorage 持久化）
- 1440px 设计稿等比缩放渲染
- 微交互：按钮按压回弹、卡片悬浮、跑马灯无缝滚动（支持 prefers-reduced-motion）

## 目录结构

```
├── public/            # 静态资源（插画、favicon）
├── src/
│   ├── components/    # 页面区块组件（Header / Hero / Works / About / Stats / Footer）
│   ├── layouts/       # 布局（字体加载、主题初始化、缩放脚本）
│   ├── pages/         # 页面入口
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

## 说明

页面内容当前为占位文案（姓名、项目、数据均为示例），可直接编辑 `src/components/` 下对应组件替换。
