// 纯逻辑核心：无 DOM、无副作用，浏览器与 Node（tests/core.test.mjs）共用。
// 语义由 tests/core.test.mjs 锁定，改动必须先改测试（ADR-0002/0003 的领域规则在此实现）。

export function pad2(n){ return String(n).padStart(2,'0'); }

/* 本地时区的 YYYY-MM-DD，作为"一天"的键 */
export function dateKey(ts){
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}

export function weekdayZh(day){ return '日一二三四五六'[day]; }

/*
 * records: {t:'focus',at,min,task:{id,name}|null} | {t:'cut',at}
 * 派生全部报表：今日计数/时长/中断、累计、任务分布、7 天趋势、连续打卡。
 */
export function computeStats(records, now){
  const today = dateKey(now);
  let todayCount = 0, todayMin = 0, totalMin = 0, todayCuts = 0;
  const byTaskMap = new Map();
  const dayCount = new Map();
  for (const r of records){
    if (r.t === 'focus'){
      totalMin += r.min;
      const k = dateKey(r.at);
      dayCount.set(k, (dayCount.get(k) || 0) + 1);
      if (k === today){ todayCount++; todayMin += r.min; }
      const name = (r.task && r.task.name) || '未分类';
      byTaskMap.set(name, (byTaskMap.get(name) || 0) + 1);
    } else if (dateKey(r.at) === today){
      todayCuts++;
    }
  }
  const trend = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = dateKey(d.getTime());
    trend.push({ k, label: i === 0 ? '今' : weekdayZh(d.getDay()), count: dayCount.get(k) || 0 });
  }
  /* 连续打卡：今天还没学不打断 streak（它还活着，等你今天续上），从今天或昨天往回数 */
  let streak = 0;
  const cursor = new Date(now);
  if (!dayCount.get(dateKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (dayCount.get(dateKey(cursor.getTime()))){ streak++; cursor.setDate(cursor.getDate() - 1); }
  const byTask = [...byTaskMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return { todayCount, todayMin, totalMin, todayCuts, streak, byTask, trend };
}

/*
 * 打开页面时如何处置遗留的 pending。
 * 严格规则（ADR-0003）：任何未经确认的专注——无论是中途关页还是只差一步确认
 * ——都回填为中断。未经确认的专注不是番茄。
 */
export function resolvePending(pending){
  if (!pending || pending.phase !== 'focus') return 'none';
  return 'interrupt';
}

/* 本轮第 cycleCompleted 个番茄确认后，该进哪种休息 */
export function breakKindAfter(cycleCompleted, settings){
  return cycleCompleted % settings.longEvery === 0 ? 'long' : 'short';
}

/*
 * 各档位区间（含端点，hi=null 表示无上限），monthTier 与热力图图例共用：
 * 改档位只改这里，图例区间不会与色阶漂移。tier>0 的区间从 1 起（0 只属于 tier 0）。
 */
export function tierRanges(goal){
  const h = Math.floor(goal / 2);
  return [
    { tier: 0, lo: 0, hi: 0 },
    { tier: 1, lo: 1, hi: h - 1 },
    { tier: 2, lo: h, hi: goal - 1 },
    { tier: 3, lo: goal, hi: goal * 2 - 1 },
    { tier: 4, lo: goal * 2, hi: null },
  ];
}

/*
 * 月度热力图档位：色深锚定当前每日目标（达标日定义见 CONTEXT.md）。
 * 0 / 1–<½目标 / ½目标–<目标 / 达标–<2×目标 / ≥2×目标。
 * 标尺是现在时的目标：改目标会重刷历史颜色，有意为之，records 不存目标快照。
 */
export function monthTier(count, goal){
  return tierRanges(goal).find(
    ({ lo, hi }) => count >= lo && (hi === null || count <= hi),
  ).tier;
}

/*
 * 月视图网格（month 为 JS 惯例的 0 起）：周一起始，非本月格为 null。
 * 每格含当日聚合（番茄数/分钟/中断——cut 不算番茄）、今日标记、未来禁用与档位；
 * total/goalDays 为该月番茄总数与达标天数，跨月记录不计入。
 */
export function computeMonthGrid(records, year, month, goal, now){
  const prefix = year + '-' + pad2(month + 1) + '-';
  const byDay = new Map();
  for (const r of records){
    const k = dateKey(r.at);
    if (!k.startsWith(prefix)) continue;
    const d = +k.slice(8);
    const agg = byDay.get(d) || { count: 0, min: 0, cuts: 0 };
    if (r.t === 'focus'){ agg.count++; agg.min += r.min; }
    else agg.cuts++;
    byDay.set(d, agg);
  }
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // 周一挪到列首
  const last = new Date(year, month + 1, 0).getDate();
  const todayK = dateKey(now);
  const cells = [];
  let total = 0, goalDays = 0;
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= last; d++){
    const k = prefix + pad2(d);
    const agg = byDay.get(d) || { count: 0, min: 0, cuts: 0 };
    total += agg.count;
    if (agg.count >= goal) goalDays++;
    cells.push({ date: d, ...agg, tier: monthTier(agg.count, goal), today: k === todayK, future: k > todayK });
  }
  while (cells.length % 7) cells.push(null);
  return { cells, total, goalDays };
}
