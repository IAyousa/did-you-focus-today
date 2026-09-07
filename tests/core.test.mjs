// 纯逻辑核心测试：从 index.html 提取 /* ===== CORE ===== */ 段，在 Node 中运行。
// 交付物保持零依赖单文件（ADR-0001），此测试仅是开发侧防线。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const htmlPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const m = html.match(/\/\* ===== CORE \(pure, tested in tests\/core\.test\.mjs\) ===== \*\/([\s\S]*?)\/\* ===== APP \(DOM\) ===== \*\//);
assert.ok(m, 'index.html 必须包含 CORE 标记段（供本测试提取）');
const sandbox = {};
sandbox.__export = (o) => Object.assign(sandbox, o);
vm.runInNewContext(m[1] + '\n__export({ pad2, dateKey, weekdayZh, computeStats, resolvePending, breakKindAfter });', sandbox);
const { dateKey, weekdayZh, computeStats, resolvePending, breakKindAfter } = sandbox;

const DAY = 86400000;
// 固定"今天"为 2026-09-07（周一）14:00 本地时间
const NOW = new Date(2026, 8, 7, 14, 0, 0).getTime();
const yesterday = (n) => new Date(NOW - n * DAY).getTime();

const settings = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyGoal: 8 };
const focus = (at, min = 25, name = '高数') => ({ t: 'focus', at, min, task: { id: 't1', name } });
const cut = (at) => ({ t: 'cut', at });

test('dateKey 用本地时区生成 YYYY-MM-DD', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 0, 30).getTime()), '2026-01-05');
});

test('weekdayZh 返回中文单字星期', () => {
  assert.equal(weekdayZh(new Date(2026, 8, 7).getDay()), '一'); // 2026-09-07 周一
  assert.equal(weekdayZh(0), '日');
});

test('computeStats：今日计数/时长、总时长按 focus 记录累计，cut 不计入', () => {
  const rs = [
    focus(new Date(2026, 8, 5, 10, 0).getTime()),       // 前天
    focus(NOW - 3600_000, 50, '英语'),                   // 今天，50 分钟
    focus(NOW - 1800_000, 25),                           // 今天
    cut(NOW - 600_000),                                  // 今天的中断，不计数
    { t: 'focus', at: NOW, min: 25, task: null },        // 今天，无任务 → 未分类
  ];
  const s = computeStats(rs, NOW, settings);
  assert.equal(s.todayCount, 3);
  assert.equal(s.todayMin, 100);
  assert.equal(s.totalMin, 125);
  // vm 跨 realm 数组无法用 deepEqual 比引用结构，比较拼接结果
  assert.equal(s.byTask.map((x) => x.name).join(','), '高数,英语,未分类');
});

test('computeStats：7 天趋势以今天结尾、顺序正确', () => {
  const rs = [focus(NOW), focus(yesterday(1)), focus(yesterday(1)), focus(yesterday(6))];
  const s = computeStats(rs, NOW, settings);
  assert.equal(s.trend.length, 7);
  assert.equal(s.trend[6].count, 1);
  assert.equal(s.trend[5].count, 2);
  assert.equal(s.trend[0].count, 1); // 恰好 7 天前的那天
  assert.equal(s.trend[6].label, '今'); // 今天那列标签显示「今」而非星期
});

test('computeStats：连续打卡——今天有番茄则含今天；今天还没有则从昨天起算且不清零', () => {
  const withToday = computeStats([focus(NOW), focus(yesterday(1)), focus(yesterday(2))], NOW, settings);
  assert.equal(withToday.streak, 3);

  const awaitingToday = computeStats([focus(yesterday(1)), focus(yesterday(2)), focus(yesterday(3))], NOW, settings);
  assert.equal(awaitingToday.streak, 3); // 今天还没学，streak 仍显示 3，等待今天续命

  const broken = computeStats([focus(yesterday(1)), focus(yesterday(3))], NOW, settings);
  assert.equal(broken.streak, 1);

  assert.equal(computeStats([], NOW, settings).streak, 0);
});

test('resolvePending：未确认的专注一律回填为中断，其余忽略（ADR-0003 严格规则）', () => {
  assert.equal(resolvePending(null, NOW), 'none');
  assert.equal(resolvePending({ phase: 'focus', start: NOW - 600_000, end: NOW + 900_000 }, NOW), 'interrupt');
  // 即使计时早已走完、只差确认，也同样是中断：未经确认的专注不是番茄（CONTEXT.md）
  assert.equal(resolvePending({ phase: 'focus', start: NOW - 3000_000, end: NOW - 600_000 }, NOW), 'interrupt');
});

test('breakKindAfter：每 longEvery 个番茄进入长休', () => {
  assert.equal(breakKindAfter(1, settings), 'short');
  assert.equal(breakKindAfter(3, settings), 'short');
  assert.equal(breakKindAfter(4, settings), 'long');
  assert.equal(breakKindAfter(8, settings), 'long');
  assert.equal(breakKindAfter(2, { ...settings, longEvery: 2 }), 'long');
});
