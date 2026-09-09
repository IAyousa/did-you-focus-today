import { createApp } from 'vue';
import App from './App.vue';
import './styles/global.css';
/* 启动序列：import 即初始化状态机（时钟/标题/关页监听），随后处置遗留的未确认专注（ADR-0003） */
import './composables/usePomodoro';
import { useStore } from './composables/useStore';
import { toast } from './composables/useToast';
import { resolvePending } from './lib/core';

const { state, recordCut } = useStore();
if (resolvePending(state.pending) === 'interrupt'){
  /* 归属到专注可能还在跑的最后时刻：隔天重开不会把中断错记进今天 */
  recordCut(Math.min(state.pending.end, Date.now()));
  setTimeout(() => toast('检测到上次有专注未经确认，已按规则回填为一条中断。'), 400);
}

createApp(App).mount('#app');
