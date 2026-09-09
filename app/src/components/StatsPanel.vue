<script setup>
// 报表：四格指标 + 任务分布（累计）+ 最近 7 天趋势，全部由 useStats 派生
import { computed } from 'vue';
import { useStats } from '../composables/useStats';

const stats = useStats();

function fmtMin(m){
  const h = Math.floor(m / 60);
  return h ? h + ' 小时 ' + (m % 60) + ' 分' : m + ' 分';
}
const maxDist = computed(() => stats.value.byTask.length ? stats.value.byTask[0].count : 1);
const maxTrend = computed(() => Math.max(1, ...stats.value.trend.map(t => t.count)));
function trendHeight(c){
  return c ? Math.max(8, c / maxTrend.value * 100) + '%' : '2%';
}
</script>

<template>
  <section class="card">
    <h2>📊 统计</h2>
    <div class="stat-grid">
      <div class="cell"><b>{{ stats.todayCount }}</b><span>今日番茄</span></div>
      <div class="cell"><b>{{ fmtMin(stats.todayMin) }}</b><span>今日专注</span></div>
      <div class="cell"><b>{{ fmtMin(stats.totalMin) }}</b><span>累计专注</span></div>
      <div class="cell"><b>{{ stats.streak }} 天</b><span>连续打卡</span></div>
    </div>

    <h3>任务分布（累计）</h3>
    <template v-if="stats.byTask.length">
      <div v-for="t in stats.byTask" :key="t.name" class="dist-row">
        <span class="dname">{{ t.name }}</span>
        <div class="dbar"><div :style="{ width: t.count / maxDist * 100 + '%' }"></div></div>
        <span class="dnum">{{ t.count }} 🍅</span>
      </div>
    </template>
    <p v-else class="empty">完成第一个番茄后，这里会告诉你时间去哪了。</p>

    <h3>最近 7 天</h3>
    <div class="trend">
      <div v-for="(t, i) in stats.trend" :key="t.k" class="tcol" :class="{ today: i === 6 }">
        <span class="tnum">{{ t.count || '' }}</span>
        <div class="tbar" :style="{ height: trendHeight(t.count) }"></div>
        <span class="tlabel">{{ t.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.cell b{ display:block; font-size:18px; }
.cell span{ font-size:12px; color:var(--muted); }
.dist-row{ display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; }
.dname{ width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right; }
.dbar{ flex:1; height:14px; background:var(--line); border-radius:3px; overflow:hidden; }
.dbar > div{ height:100%; background:var(--accent); }
.dnum{ width:52px; color:var(--muted); }
.trend{ display:flex; gap:6px; align-items:flex-end; height:110px; padding-top:8px; }
.tcol{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
.tnum{ font-size:11px; color:var(--muted); margin-bottom:2px; }
.tbar{ width:70%; max-width:34px; background:var(--accent); border-radius:4px 4px 0 0; min-height:0; transition:height .3s; }
.tcol.today .tbar{ background:var(--green); }
.tlabel{ font-size:11px; color:var(--muted); margin-top:4px; }
@media (max-width:520px){ .stat-grid{ grid-template-columns:repeat(2,1fr); } .dname{ width:80px; } }
</style>
