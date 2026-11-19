/**
 * 阅读数据视图层 — 首页阅读区块与 /reading/ 档案页的共享出口。
 *
 * 唯一数据源：src/data/weread.json（由 weread-data/export_site_data.py
 * 从微信读书 Agent API 原始快照加工生成，统计截至 2026-11-13）。
 * 更新数据：重新抓取 → 运行导出脚本 → 本文件与两处视图自动同步。
 *
 * 这里只做「原始数据 → 展示口径」的派生计算，不引入手工数字。
 */
import raw from './weread.json';

export const AS_OF = raw.asOf;
export const AS_OF_SHORT = raw.asOf.replace(/-/g, '.');

const growthSharePct = Math.round(
  (raw.cats
    .filter((c) => ['个人成长', '心理', '经济理财'].includes(c.name))
    .reduce((s, c) => s + c.hours, 0) /
    raw.totals.hours) *
    100,
);

/** 首页阅读账本 + 旧报告页使用的展示事实 */
export const READING_FACTS = {
  totalHours: raw.totals.hours,
  booksRead: raw.totals.booksRead,
  booksFinished: raw.totals.booksFinished,
  notes: raw.totals.notes,
  readDays: raw.totals.readDays,
  shelfItems: raw.totals.shelfItems,
  finishedRate: `${raw.totals.finishedRatePct}%`,
  growthShare: `${growthSharePct}%`,
  year2026: {
    hours: raw.y2026.hours,
    booksRead: raw.y2026.booksRead,
    booksFinished: raw.y2026.booksFinished,
    readDays: raw.y2026.readDays,
    notes: raw.y2026.notes,
  },
} as const;

export interface CategoryDatum {
  /** 分类名 */
  name: string;
  /** 阅读时长（小时，展示文案） */
  hours: string;
  /** 该分类阅读本数（展示文案） */
  books: string;
  /** 占总时长比例（展示文案） */
  pct: string;
  /** 条形宽度：相对最大分类（个人成长） */
  width: string;
  /** 品牌色 CSS 变量 */
  color: string;
}

/** 首页横条图：按总体时长排序的分类分布 */
export const CATEGORY_DISTRIBUTION: CategoryDatum[] = raw.cats.map((c, i, arr) => ({
  name: c.name,
  hours: `${c.hours}h`,
  books: `${c.books} 本`,
  pct: `${Math.round((c.hours / raw.totals.hours) * 100)}%`,
  width: `${Math.round((c.hours / arr[0].hours) * 100)}%`,
  color: ['var(--yellow)', 'var(--pink)', 'var(--blue)', 'var(--green)'][i % 4],
}));

/** 阅读档案页完整数据（/reading/ 专用） */
export const WEREAD = raw;
export type WereadSnapshot = typeof raw;
