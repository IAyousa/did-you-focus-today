<script setup>
// 今日进度条：番茄目标 / 连续打卡 / 今日中断——记录一变自动重算，无需手动刷新
import { computed } from 'vue';
import { useStore } from '../composables/useStore';
import { useStats } from '../composables/useStats';

const { state } = useStore();
const stats = useStats();

const goal = computed(() => state.settings.dailyGoal);
const done = computed(() => stats.value.todayCount >= goal.value);
const fill = computed(() => Math.min(100, stats.value.todayCount / goal.value * 100) + '%');
</script>

<template>
  <section class="today-row">
    <div class="goal">
      <div class="goal-text">
        今日 <b>{{ stats.todayCount }}</b> / {{ goal }} 🍅
        <span v-if="done" class="badge">🎉 达标</span>
      </div>
      <div class="bar"><div :class="{ done }" :style="{ width: fill }"></div></div>
    </div>
    <div class="streak">🔥 连续打卡 <b>{{ stats.streak }}</b> 天</div>
    <div class="cuts">✂️ 今日中断 <b>{{ stats.todayCuts }}</b></div>
  </section>
</template>

<style scoped>
.today-row{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:14px; }
.goal{ flex:1; min-width:220px; }
.goal-text{ font-size:14px; margin-bottom:6px; }
.goal-text b{ font-size:20px; }
.badge{ color:var(--green); font-weight:600; }
.bar{ height:8px; background:var(--line); border-radius:4px; overflow:hidden; }
.bar > div{ height:100%; width:0; background:var(--accent); border-radius:4px; transition:width .4s; }
.bar > div.done{ background:var(--green); }
.streak, .cuts{ font-size:13px; color:var(--muted); white-space:nowrap; }
.streak b, .cuts b{ color:var(--text); font-size:16px; }
.cuts b{ color:var(--danger); }
</style>
