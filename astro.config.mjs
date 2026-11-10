import { defineConfig } from 'astro/config';

// https://astro.build/config
// 基础路径：GitHub Pages 部署时由工作流注入 ASTRO_BASE=/OrinPortfolio；
// 本地开发与 WorkBuddy 托管保持根路径 '/'
export default defineConfig({
  base: process.env.ASTRO_BASE || '/',
});
