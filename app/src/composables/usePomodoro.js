// 阶段状态机单例：idle → focus → alert(确认) → break → alert(知道了) → idle。
// 诚实性规则由 ADR-0003 锁定：无暂停、只有放弃；未确认的专注不是番茄。
import { reactive, computed, watchEffect, watch } from 'vue';
import { useStore } from './useStore';
import { useNow } from './useNow';
import { toast } from './useToast';
import { breakKindAfter, pad2 } from '../lib/core';

const { state, save, pushRecord, recordCut } = useStore();
const now = useNow();

/* ui.phase: idle | focus | break | alert；alert 时 alertKind: 'focus' | 'break' */
const ui = reactive({ phase: 'idle', endsAt: 0, alertKind: null, breakKind: null });
/* 调试把手：仅开发构建暴露，用于冒烟测试拨快 endsAt 验证提醒流转 */
if (import.meta.env.DEV) window.__pty = { ui };

export function fmt(ms){
  const total = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(total / 60) + ':' + pad2(total % 60);
}

/* ---------- 音频与通知 ---------- */
let audioCtx = null;
let bellTimer = null;
let bellStopAt = 0;

function ensureAudio(){
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) audioCtx = new AC();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function chime(){
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [[880, 0], [660, 0.22]].forEach(([f, off]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + off);
    g.gain.exponentialRampToValueAtTime(0.4, t + off + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t + off); o.stop(t + off + 0.22);
  });
}
function startBell(){
  stopBell();
  chime();
  bellStopAt = Date.now() + 30000; /* 响铃最长 30 秒自动停 */
  bellTimer = setInterval(() => {
    if (Date.now() >= bellStopAt || ui.phase !== 'alert'){ stopBell(); return; }
    chime();
  }, 1600);
}
export function stopBell(){
  if (bellTimer){ clearInterval(bellTimer); bellTimer = null; }
}
function notify(title, body){
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag: 'pomodoro' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* 某些环境通知失败不该影响主流程 */ }
}

/* ---------- 阶段流转 ---------- */
export function startFocus(task){
  ensureAudio();
  const t = Date.now();
  const min = state.settings.focusMin;
  state.pending = {
    phase: 'focus', start: t, end: t + min * 60000, min,
    task: task ? { id: task.id, name: task.name } : null,
  };
  save();
  ui.phase = 'focus';
  ui.endsAt = state.pending.end;
}
function toAlert(kind){
  ui.phase = 'alert';
  ui.alertKind = kind;
  startBell();
  if (kind === 'focus') notify('🍅 番茄熟了！', '回来点「确认」，这个番茄才算数。');
  else notify('☕ 休息结束', '回来开下一个番茄吧。');
}
export function confirmAlert(){
  stopBell();
  if (ui.alertKind === 'focus'){
    const p = state.pending;
    /* 归属到专注结束的时刻：23:5x 结束、跨零点才点确认，番茄仍算昨天（CONTEXT.md「完整完成的时段」） */
    pushRecord({ t: 'focus', at: p.end, min: p.min, task: p.task });
    state.cycle += 1;
    const kind = breakKindAfter(state.cycle, state.settings);
    if (kind === 'long') state.cycle = 0; /* 长休从现在开始，跳过它也算休过 */
    state.pending = null;
    save();
    startBreak(kind); /* 确认专注后自动进入休息，休息完才需要手动开下一个 */
    toast(kind === 'long' ? '干得漂亮！进入长休 ☕' : '短休开始，站起来走走 ☕');
  } else {
    ui.phase = 'idle';
  }
}
function startBreak(kind){
  ui.phase = 'break';
  ui.breakKind = kind;
  const min = kind === 'long' ? state.settings.longMin : state.settings.shortMin;
  ui.endsAt = Date.now() + min * 60000;
}
export function skipBreak(){
  stopBell();
  ui.phase = 'idle';
}
export function abandonFocus(){
  stopBell();
  recordCut(Date.now());
  ui.phase = 'idle';
  toast('已放弃，记一条中断。休息一下，再来一个。');
}

/* ---------- 派生状态 ---------- */
const remaining = computed(() => Math.max(0, ui.endsAt - now.value));
const blink = computed(() => Math.floor(now.value / 500) % 2 === 0);

/* 到点流转：由共享时钟驱动——时钟来自 Worker 心跳，后台标签页不被节流（ADR-0005） */
watch(now, () => {
  if ((ui.phase === 'focus' || ui.phase === 'break') && ui.endsAt - now.value <= 0){
    toAlert(ui.phase === 'focus' ? 'focus' : 'break');
  }
});

watchEffect(() => {
  if (ui.phase === 'focus' || ui.phase === 'break'){
    document.title = (ui.phase === 'focus' ? '🍅 ' : '☕ ') + fmt(remaining.value) + ' · 今天你专注了吗？';
  } else if (ui.phase === 'alert'){
    document.title = blink.value ? '⏰ 待确认！' : '⏰ 回来点确认';
  } else {
    document.title = '今天你专注了吗？';
  }
});

/* 中途关页/刷新：立刻落一条中断（重开页面时的回填是崩溃场景的兜底） */
window.addEventListener('pagehide', () => {
  if (state.pending && state.pending.phase === 'focus'){
    try { recordCut(Date.now()); } catch { /* 存不进去就算了，下次打开由回填兜底 */ }
  }
});
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

export function usePomodoro(){
  return { ui, remaining, blink };
}
