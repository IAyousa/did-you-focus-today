// 共享时钟：优先由 Worker 心跳驱动（ADR-0005，后台不被节流），
// Worker 起不来时降级为主线程 interval（后台会被浏览器节流，提醒可能延迟到回前台）。
import { ref } from 'vue';

const now = ref(Date.now());

/* 'starting' = Worker 成败未知；降级守卫以此为前提，别改成 'interval' 当初值 */
let source = 'starting';
let workerRef = null;

function adopt(next){
  source = next;
  if (import.meta.env.DEV) window.__nowSource = next;
}

/* 降级兜底：Worker 构造失败 / 加载出错 / 3 秒无首个 tick 时启用主线程心跳 */
function fallback(){
  if (source !== 'starting') return;
  if (workerRef){ try { workerRef.terminate(); } catch { /* 已死就算了 */ } workerRef = null; }
  adopt('interval');
  setInterval(() => { now.value = Date.now(); }, 250);
}

try {
  workerRef = new Worker(new URL('../workers/tick.worker.js', import.meta.url), { type: 'module' });
  workerRef.onmessage = (e) => {
    if (source !== 'worker') adopt('worker');
    now.value = e.data.t;
  };
  workerRef.onerror = fallback;
  setTimeout(fallback, 3000);
} catch {
  fallback();
}

export function useNow(){
  return now;
}
