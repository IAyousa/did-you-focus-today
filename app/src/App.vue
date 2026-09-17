<script setup>
import { ref } from 'vue';
import { useTheme } from './composables/useTheme';
import { useToast } from './composables/useToast';
import TodayProgress from './components/TodayProgress.vue';
import TimerCard from './components/TimerCard.vue';
import TaskList from './components/TaskList.vue';
import StatsPanel from './components/StatsPanel.vue';
import DataPanel from './components/DataPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import HelpCard from './components/HelpCard.vue';
import HelpContent from './components/HelpContent.vue';

const { mode, cycle } = useTheme();
const themeIcon = { auto: '💻', light: '☀️', dark: '🌙' };

const t = useToast();

/* 首次访问引导：看过就记下（独立于数据键，清掉浏览器数据会重新弹一次，属预期） */
const GUIDE_KEY = 'did-you-focus-guide-v1';
const showGuide = ref(!localStorage.getItem(GUIDE_KEY));
function dismissGuide(){
  showGuide.value = false;
  localStorage.setItem(GUIDE_KEY, '1');
}
</script>

<template>
  <div class="app">
    <header>
      <h1>🍅 今天你专注了吗？</h1>
      <div class="header-actions">
        <button class="ghost" title="切换主题" @click="cycle()">{{ themeIcon[mode] }}</button>
      </div>
    </header>

    <TodayProgress />
    <TimerCard />
    <TaskList />
    <StatsPanel />
    <DataPanel />
    <HelpCard />
    <SettingsPanel />

    <footer>
      专注没有暂停，只有「放弃」 · 未经确认的专注不是番茄 · 中途关掉页面会回填为一条中断 · 历史只读不可改
    </footer>

    <div class="toast" :class="{ show: t.show }">{{ t.msg }}</div>

    <div v-if="showGuide" class="guide-overlay" @click.self="dismissGuide">
      <div class="guide-card card">
        <h2>🍅 欢迎，先花一分钟了解规则</h2>
        <HelpContent />
        <button class="primary guide-btn" @click="dismissGuide">知道了，开始专注</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
header{
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; margin-bottom:14px;
}
h1{ font-size:20px; margin:0; }
.header-actions{ display:flex; gap:6px; }
.guide-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,.55);
  display:flex; align-items:center; justify-content:center;
  padding:16px; z-index:20;
}
.guide-card{ max-width:560px; width:100%; max-height:85vh; overflow-y:auto; }
.guide-btn{ width:100%; margin-top:12px; }
</style>

