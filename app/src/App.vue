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

const { mode, cycle } = useTheme();
const themeIcon = { auto: '💻', light: '☀️', dark: '🌙' };

const notifSupported = typeof Notification !== 'undefined';
const notifDefault = ref(notifSupported && Notification.permission === 'default');
async function enableNotif(){
  await Notification.requestPermission();
  notifDefault.value = Notification.permission === 'default';
}

const t = useToast();
</script>

<template>
  <div class="app">
    <header>
      <h1>🍅 今天你专注了吗？</h1>
      <div class="header-actions">
        <button v-if="notifDefault" class="ghost" @click="enableNotif">🔔 桌面通知</button>
        <button class="ghost" title="切换主题" @click="cycle()">{{ themeIcon[mode] }}</button>
      </div>
    </header>

    <TodayProgress />
    <TimerCard />
    <TaskList />
    <StatsPanel />
    <DataPanel />
    <SettingsPanel />

    <footer>
      专注没有暂停，只有「放弃」 · 未经确认的专注不是番茄 · 中途关掉页面会回填为一条中断 · 历史只读不可改
    </footer>

    <div class="toast" :class="{ show: t.show }">{{ t.msg }}</div>
  </div>
</template>

<style scoped>
header{
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; margin-bottom:14px;
}
h1{ font-size:20px; margin:0; }
.header-actions{ display:flex; gap:6px; }
</style>
