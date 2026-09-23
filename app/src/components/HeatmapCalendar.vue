<script setup>
// 月度热力图：日历式网格（周一起始），色深 = 当日番茄数相对每日目标的档位；
// 中断只进某日详情、不进色阶；未来日禁用——"还没发生"不是"那天没学"。
import { computed, ref } from 'vue';
import { useStore } from '../composables/useStore';
import { useNow } from '../composables/useNow';
import { computeMonthGrid, tierRanges } from '../lib/core';

const { state } = useStore();
const now = useNow();

const curY = computed(() => new Date(now.value).getFullYear());
const curM = computed(() => new Date(now.value).getMonth());
/* view 为 null 时跟随当月；跨天时 curY/curM 随共享时钟更新，› 的禁用态跟着走 */
const view = ref(null);
const y = computed(() => (view.value ? view.value.y : curY.value));
const m = computed(() => (view.value ? view.value.m : curM.value));
const isCurrent = computed(() => y.value === curY.value && m.value === curM.value);

const grid = computed(() => computeMonthGrid(state.records, y.value, m.value, state.settings.dailyGoal, now.value));
const weeks = computed(() => {
  const rows = [];
  for (let i = 0; i < grid.value.cells.length; i += 7) rows.push(grid.value.cells.slice(i, i + 7));
  return rows;
});
const title = computed(() => y.value + '年' + (m.value + 1) + '月');

/* 详情行选中日：存日期数字、明细实时从当前网格取——选中期间又确认了番茄也不会显示旧账；null = 默认（当月显示今日，历史月显示提示） */
const selected = ref(null);
function go(delta){
  const d = new Date(y.value, m.value + delta, 1);
  view.value = { y: d.getFullYear(), m: d.getMonth() };
  selected.value = null;
}
function backToCurrent(){ view.value = null; selected.value = null; }
function pick(cell){ if (cell && !cell.future) selected.value = cell.date; }

const detail = computed(() => {
  if (selected.value !== null) return grid.value.cells.find((c) => c && c.date === selected.value);
  return isCurrent.value ? grid.value.cells.find((c) => c && c.today) : null;
});

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
/* 图例区间直接取 core 的 tierRanges：档位改只改 core，图例不会与色阶漂移；塌缩空档（如 goal=1 无 ½ 档）不显示 */
const legend = computed(() => {
  const fmt = ({ lo, hi }) => (hi === null ? lo + '+' : lo === hi ? String(lo) : lo + '–' + hi);
  return tierRanges(state.settings.dailyGoal)
    .filter(({ tier, lo, hi }) => tier === 0 || (lo >= 1 && (hi === null || lo <= hi)))
    .map(({ tier, lo, hi }) => ({ tier, label: (tier === 3 ? '达标 ' : '') + fmt({ lo, hi }) }));
});
</script>

<template>
  <div class="heatmap">
    <div class="hm-head">
      <div class="hm-nav">
        <button class="ghost hm-btn" aria-label="上一月" @click="go(-1)">‹</button>
        <span class="hm-title">{{ title }}</span>
        <button class="ghost hm-btn" aria-label="下一月" :disabled="isCurrent" @click="go(1)">›</button>
      </div>
      <span class="hm-sum">{{ grid.total }} 番茄 · 达标 {{ grid.goalDays }} 天</span>
      <button v-if="!isCurrent" class="ghost hm-back" @click="backToCurrent">回到本月</button>
    </div>

    <div class="hm-grid" role="grid">
      <span v-for="w in weekdays" :key="w" class="hm-wd">{{ w }}</span>
      <template v-for="(row, ri) in weeks" :key="ri">
        <template v-for="(c, ci) in row" :key="ri + '-' + ci">
          <span v-if="!c" class="hm-cell blank" aria-hidden="true"></span>
          <button v-else class="hm-cell" :class="['t' + c.tier, { today: c.today, future: c.future, sel: selected === c.date }]"
            type="button" :disabled="c.future" :aria-label="`${m + 1}月${c.date}日`"
            @mouseenter="pick(c)" @click="pick(c)">
            {{ c.date }}
          </button>
        </template>
      </template>
    </div>

    <p class="hm-detail">
      <template v-if="detail">{{ m + 1 }}月{{ detail.date }}日 · {{ detail.count }} 番茄 · {{ detail.min }} 分钟 · 中断 {{ detail.cuts }} 次</template>
      <template v-else>点按格子查看某日明细</template>
    </p>

    <div class="hm-legend">
      <span v-for="item in legend" :key="item.tier" class="hm-item">
        <span class="hm-key" :class="'t' + item.tier"></span>{{ item.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.hm-head{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.hm-nav{ display:flex; align-items:center; gap:2px; }
.hm-btn{ padding:2px 10px; font-size:16px; line-height:1.3; border-color:transparent; }
.hm-title{ font-weight:600; min-width:86px; text-align:center; font-size:14px; }
.hm-sum{ color:var(--muted); font-size:12px; }
.hm-back{ padding:2px 10px; font-size:12px; border-color:var(--line); }
.hm-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-top:10px; }
.hm-wd{ text-align:center; font-size:11px; color:var(--muted); padding:2px 0; }
.hm-cell{
  aspect-ratio:1; display:flex; align-items:center; justify-content:center;
  font-size:12px; border-radius:6px; background:var(--bg);
  border:none; padding:0; cursor:pointer; font-family:inherit; color:var(--text);
  user-select:none;
}
.hm-cell.blank{ background:transparent; }
.hm-cell.t1{ background:color-mix(in srgb, var(--accent) 22%, var(--bg)); }
.hm-cell.t2{ background:color-mix(in srgb, var(--accent) 45%, var(--bg)); }
.hm-cell.t3{ background:color-mix(in srgb, var(--accent) 72%, var(--bg)); }
.hm-cell.t4{ background:var(--accent); color:#fff; font-weight:600; }
.hm-cell.today{ outline:2px solid var(--green); outline-offset:-2px; }
.hm-cell.sel{ box-shadow:inset 0 0 0 2px var(--text); }
.hm-cell.future{ background:transparent; color:var(--muted); opacity:.45; cursor:default; }
.hm-detail{ margin:8px 0 0; font-size:12px; color:var(--muted); min-height:20px; }
.hm-legend{ display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; font-size:11px; color:var(--muted); }
.hm-item{ display:inline-flex; align-items:center; gap:3px; }
.hm-key{ display:inline-block; width:11px; height:11px; border-radius:3px; background:var(--bg); border:1px solid var(--line); }
.hm-key.t1{ background:color-mix(in srgb, var(--accent) 22%, var(--bg)); }
.hm-key.t2{ background:color-mix(in srgb, var(--accent) 45%, var(--bg)); }
.hm-key.t3{ background:color-mix(in srgb, var(--accent) 72%, var(--bg)); }
.hm-key.t4{ background:var(--accent); }
</style>
