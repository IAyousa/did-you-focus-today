// 共享时钟：优先由 Worker 心跳驱动（ADR-0005，后台不被节流），
// Worker 起不来时降级为主线程 interval（后台会被浏览器节流，提醒可能延迟到回前台）。
import { ref } from 'vue';

const now = ref(Date.now());

let source = 'interval'; // 供冒烟测试确认实际走的是哪条心跳路径

function fallback(){
  if (source === 'interval') return;
  source = 'interval';
  if (import.meta.env.DEV) window.__nowSource = 'interval';
  setInterval(() => { now.value = Date.now(); }, 250);
}

if (import.meta.env.DEV) window.__nowSource = 'starting';

try {
  const worker = new Worker(new URL('../workers/tick.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    if (source !== 'worker'){
      source = 'worker';
      if (import.meta.env.DEV) window.__nowSource = 'worker';
    }
    now.value = e.data.t;
  };
  worker.onerror = fallback;
  /* 兜底：3 秒内没收到首个 tick（极端环境静默失败），退回主线程心跳 */
  setTimeout(fallback, 3000);
} catch {
  fallback();
}

export function useNow(){
  return now;
}
