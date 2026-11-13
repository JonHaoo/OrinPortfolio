/**
 * 微信读书数据快照 — 首页阅读区块与 /reading/ 报告页的唯一数据源。
 *
 * 数据来源：微信读书 Agent API（/shelf/sync + /readdata/detail）。
 * 统计截至 2026-11-13；之后每天仍在阅读，数字会持续变化。
 * 更新数据时只改本文件，两处视图自动同步，避免两份硬编码走偏。
 */

export const AS_OF = '2026-11-13';
export const AS_OF_SHORT = '2026.11.13';

export const READING_FACTS = {
  totalHours: 1266,
  booksRead: 573,
  booksFinished: 121,
  notes: 4370,
  readDays: 1491,
  shelfItems: 1053,
  finishedRate: '21%',
  growthShare: '62%',
  year2026: { hours: 195.4, booksRead: 180, booksFinished: 30, readDays: 250, notes: 412 },
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
  /** 条形宽度：相对最大分类（个人成长 332.6h） */
  width: string;
  /** 品牌色 CSS 变量 */
  color: string;
}

/** 类型分布：width 为相对最大分类的宽度，pct 为占总时长比例 */
export const CATEGORY_DISTRIBUTION: CategoryDatum[] = [
  { name: '个人成长', hours: '332.6h', books: '146 本', pct: '26%', width: '100%', color: 'var(--yellow)' },
  { name: '心理', hours: '253.5h', books: '80 本', pct: '20%', width: '76%', color: 'var(--pink)' },
  { name: '经济理财', hours: '197.4h', books: '91 本', pct: '16%', width: '59%', color: 'var(--blue)' },
  { name: '文学', hours: '123.1h', books: '91 本', pct: '10%', width: '37%', color: 'var(--green)' },
  { name: '社会文化', hours: '55.2h', books: '25 本', pct: '4%', width: '17%', color: 'var(--yellow)' },
  { name: '人物传记', hours: '51.1h', books: '17 本', pct: '4%', width: '15%', color: 'var(--pink)' },
  { name: '历史', hours: '47.4h', books: '10 本', pct: '4%', width: '14%', color: 'var(--blue)' },
  { name: '计算机', hours: '38.0h', books: '34 本', pct: '3%', width: '11%', color: 'var(--green)' },
];
