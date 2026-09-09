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
