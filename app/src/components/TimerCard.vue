<script setup>
// 计时卡：阶段标签、大倒计时、任务选择（仅 idle）、按阶段渲染的控制按钮
import { computed, ref } from 'vue';
import { useStore } from '../composables/useStore';
import { usePomodoro, fmt, startFocus, abandonFocus, confirmAlert, skipBreak, stopBell } from '../composables/usePomodoro';

const { state } = useStore();
const { ui, remaining } = usePomodoro();

const selectedTaskId = ref('');
const label = computed(() => {
  if (ui.phase === 'idle') return '准备开始';
  if (ui.phase === 'focus') return '专注中 · 这个番茄属于「' + ((state.pending && state.pending.task && state.pending.task.name) || '未分类') + '」';
  if (ui.phase === 'break') return ui.breakKind === 'long' ? '长休中' : '短休中';
  return ui.alertKind === 'focus' ? '⏰ 专注完成！' : '⏰ 休息结束';
});
const countdown = computed(() => {
  if (ui.phase === 'focus' || ui.phase === 'break') return fmt(remaining.value);
  if (ui.phase === 'alert' && ui.alertKind === 'focus') return '00:00';
  return fmt(state.settings.focusMin * 60000);
});

function onStart(){
  const task = state.tasks.find(t => t.id === selectedTaskId.value) || null;
  startFocus(task);
}
</script>

<template>
  <main class="card timer-card" :data-phase="ui.phase">
    <div class="phase-label">{{ label }}</div>
    <div class="countdown">{{ countdown }}</div>
    <div v-if="ui.phase === 'idle'" class="task-pick">
      <label for="taskSelect">这个番茄学什么？（可不选）</label>
      <select id="taskSelect" v-model="selectedTaskId">
        <option value="">未分类</option>
        <option v-for="t in state.tasks" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>
    <div class="controls">
      <template v-if="ui.phase === 'idle'">
        <button class="primary" @click="onStart">▶ 开始专注</button>
      </template>
      <template v-else-if="ui.phase === 'focus'">
        <button class="danger" @click="abandonFocus">✖ 放弃此番茄</button>
      </template>
      <template v-else-if="ui.phase === 'break'">
        <button @click="skipBreak">⏭ 跳过休息</button>
      </template>
      <template v-else>
        <button @click="stopBell">🔕 停止响铃</button>
        <button class="primary" @click="confirmAlert">{{ ui.alertKind === 'focus' ? '✔ 确认这个番茄' : '✔ 知道了' }}</button>
      </template>
    </div>
  </main>
</template>

<style scoped>
.timer-card{ text-align:center; padding:28px 16px 22px; transition:background .3s; }
.timer-card[data-phase="focus"]{ background:var(--focus-bg); }
.timer-card[data-phase="break"]{ background:var(--break-bg); }
.phase-label{ font-size:13px; color:var(--muted); letter-spacing:.2em; }
.countdown{
  font-size:72px; font-weight:700; line-height:1.15; margin:6px 0 4px;
  font-variant-numeric:tabular-nums; letter-spacing:.02em;
}
.timer-card[data-phase="alert"] .countdown{ color:var(--accent); }
.task-pick{ margin:6px 0 14px; }
.task-pick label{ display:block; font-size:12px; color:var(--muted); margin-bottom:4px; }
select{ min-width:200px; }
.controls{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; min-height:44px; align-items:center; }
@media (max-width:520px){ .countdown{ font-size:56px; } }
</style>
