// 纯逻辑核心测试：直接 import app/src/lib/core.js（迁移后不再从 HTML 提取）。
// core.js 必须保持无 DOM、无副作用——它同时被浏览器与 Node 消费。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pad2, dateKey, weekdayZh, computeStats, computeMonthGrid, monthTier, resolvePending, breakKindAfter } from '../app/src/lib/core.js';
import { normalize } from '../app/src/composables/useStore.js';

const DAY = 86400000;
// 固定"今天"为 2026-09-07（周一）14:00 本地时间
const NOW = new Date(2026, 8, 7, 14, 0, 0).getTime();
const yesterday = (n) => new Date(NOW - n * DAY).getTime();

const settings = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyGoal: 8 };
const focus = (at, min = 25, name = '高数') => ({ t: 'focus', at, min, task: { id: 't1', name } });
const cut = (at) => ({ t: 'cut', at });

test('pad2 补零', () => {
  assert.equal(pad2(5), '05');
  assert.equal(pad2(12), '12');
});

test('dateKey 用本地时区生成 YYYY-MM-DD', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 0, 30).getTime()), '2026-01-05');
});

test('weekdayZh 返回中文单字星期', () => {
  assert.equal(weekdayZh(new Date(2026, 8, 7).getDay()), '一'); // 2026-09-07 周一
  assert.equal(weekdayZh(0), '日');
});

test('computeStats：今日计数/时长、总时长按 focus 记录累计，cut 不计入番茄但计入今日中断', () => {
  const rs = [
    focus(new Date(2026, 8, 5, 10, 0).getTime()),       // 前天
    focus(NOW - 3600_000, 50, '英语'),                   // 今天，50 分钟
    focus(NOW - 1800_000, 25),                           // 今天
    cut(NOW - 600_000),                                  // 今天的中断
    { t: 'focus', at: NOW, min: 25, task: null },        // 今天，无任务 → 未分类
  ];
  const s = computeStats(rs, NOW);
  assert.equal(s.todayCount, 3);
  assert.equal(s.todayMin, 100);
  assert.equal(s.totalMin, 125);
  assert.equal(s.todayCuts, 1);
  assert.equal(s.byTask.map((x) => x.name).join(','), '高数,英语,未分类');
});

test('computeStats：7 天趋势以今天结尾、顺序正确', () => {
  const rs = [focus(NOW), focus(yesterday(1)), focus(yesterday(1)), focus(yesterday(6))];
  const s = computeStats(rs, NOW);
  assert.equal(s.trend.length, 7);
  assert.equal(s.trend[6].count, 1);
  assert.equal(s.trend[5].count, 2);
  assert.equal(s.trend[0].count, 1); // 恰好 7 天前的那天
  assert.equal(s.trend[6].label, '今'); // 今天那列标签显示「今」而非星期
});

test('computeStats：连续打卡——今天有番茄则含今天；今天还没有则从昨天起算且不清零', () => {
  const withToday = computeStats([focus(NOW), focus(yesterday(1)), focus(yesterday(2))], NOW);
  assert.equal(withToday.streak, 3);

  const awaitingToday = computeStats([focus(yesterday(1)), focus(yesterday(2)), focus(yesterday(3))], NOW);
  assert.equal(awaitingToday.streak, 3); // 今天还没学，streak 仍显示 3，等待今天续命

  const broken = computeStats([focus(yesterday(1)), focus(yesterday(3))], NOW);
  assert.equal(broken.streak, 1);

  assert.equal(computeStats([], NOW).streak, 0);
});

test('resolvePending：未确认的专注一律回填为中断，其余忽略（ADR-0003 严格规则）', () => {
  assert.equal(resolvePending(null), 'none');
  assert.equal(resolvePending({ phase: 'focus', start: NOW - 600_000, end: NOW + 900_000 }), 'interrupt');
  // 即使计时早已走完、只差一步确认，也同样是中断：未经确认的专注不是番茄（CONTEXT.md）
  assert.equal(resolvePending({ phase: 'focus', start: NOW - 3000_000, end: NOW - 600_000 }), 'interrupt');
});

test('breakKindAfter：每 longEvery 个番茄进入长休', () => {
  assert.equal(breakKindAfter(1, settings), 'short');
  assert.equal(breakKindAfter(3, settings), 'short');
  assert.equal(breakKindAfter(4, settings), 'long');
  assert.equal(breakKindAfter(8, settings), 'long');
  assert.equal(breakKindAfter(2, { ...settings, longEvery: 2 }), 'long');
});

// ---- 月度热力图（computeMonthGrid / monthTier）----

test('monthTier：5 档锚定每日目标（goal=8：0 / 1–3 / 4–7 / 8–15 / 16+）', () => {
  assert.equal(monthTier(0, 8), 0);
  assert.equal(monthTier(1, 8), 1);
  assert.equal(monthTier(3, 8), 1);
  assert.equal(monthTier(4, 8), 2);
  assert.equal(monthTier(7, 8), 2);
  assert.equal(monthTier(8, 8), 3);
  assert.equal(monthTier(15, 8), 3);
  assert.equal(monthTier(16, 8), 4);
});

test('monthTier：奇数目标 ½ 边界向下取整（goal=7：1–2 / 3–6 / 7 达标）', () => {
  assert.equal(monthTier(2, 7), 1);
  assert.equal(monthTier(3, 7), 2);
  assert.equal(monthTier(7, 7), 3);
  assert.equal(monthTier(14, 7), 4);
});

test('computeMonthGrid：周一起始网格，非本月格为 null（2026-09 周二开月=1 空位，5 周）', () => {
  const g = computeMonthGrid([], 2026, 8, 8, NOW);
  assert.equal(g.cells.length, 35);
  assert.equal(g.cells[0], null);          // 周一空
  assert.equal(g.cells[1].date, 1);        // 9月1日（周二）
  assert.equal(g.cells[30].date, 30);      // 1 空位 + 30 天
  assert.equal(g.cells[31], null);         // 尾部补齐
});

test('computeMonthGrid：周日起始的月份偏移 6（2026-11-01 周日，6 周）', () => {
  assert.equal(computeMonthGrid([], 2026, 10, 8, NOW).cells.length, 42);
});

test('computeMonthGrid：按日聚合 count/min/cuts，cut 不算番茄，跨月记录不计入', () => {
  const rs = [
    focus(new Date(2026, 8, 7, 9, 0).getTime()),
    focus(new Date(2026, 8, 7, 11, 0).getTime(), 50, '英语'),
    cut(new Date(2026, 8, 7, 12, 0).getTime()),
    focus(new Date(2026, 8, 6, 9, 0).getTime()),
    focus(new Date(2026, 7, 31, 9, 0).getTime()),  // 8月31日
    focus(new Date(2026, 9, 1, 9, 0).getTime()),   // 10月1日
  ];
  const g = computeMonthGrid(rs, 2026, 8, 8, NOW);
  const day7 = g.cells[7]; // 日期 d 落在格 offset+d-1 = 7
  assert.equal(day7.count, 2);
  assert.equal(day7.min, 75);
  assert.equal(day7.cuts, 1);
  assert.equal(g.cells[6].count, 1);
  assert.equal(g.total, 3);      // 只有本月 3 个番茄
  assert.equal(g.goalDays, 0);
});

test('computeMonthGrid：达标天数=当日番茄数≥目标的天数', () => {
  const many = (d, n) => Array.from({ length: n }, (_, i) => focus(new Date(2026, 8, d, 8, i).getTime()));
  const g = computeMonthGrid([...many(1, 8), ...many(2, 9), ...many(3, 2)], 2026, 8, 8, NOW);
  assert.equal(g.total, 19);
  assert.equal(g.goalDays, 2);
  assert.equal(g.cells[1].tier, 3);  // 1 日 8 个：达标
  assert.equal(g.cells[2].tier, 3);  // 2 日 9 个：达标
  assert.equal(g.cells[3].tier, 1);  // 3 日 2 个：最浅
});

test('computeMonthGrid：今日标记与未来禁用；历史月两者皆无', () => {
  const g = computeMonthGrid([], 2026, 8, 8, NOW); // NOW = 2026-09-07 14:00
  assert.equal(g.cells[7].today, true);
  assert.equal(g.cells[7].future, false);
  assert.equal(g.cells[8].future, true);   // 9月8日尚未到来
  assert.equal(g.cells[6].future, false);
  const aug = computeMonthGrid([], 2026, 7, 8, NOW);
  assert.ok(aug.cells.every((c) => !c || (!c.today && !c.future)));
});

test('normalize：records 上限 10000，超出丢最旧', () => {
  const rs = Array.from({ length: 10050 }, (_, i) => ({ t: 'focus', at: i + 1, min: 25, task: null }));
  const out = normalize({ records: rs });
  assert.equal(out.records.length, 10000);
  assert.equal(out.records[0].at, 51); // 最旧的 50 条被丢弃
});
