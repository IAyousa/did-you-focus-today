// 共享时钟：250ms 跳动的响应式 now，驱动倒计时、统计跨天刷新、标题闪烁。
// 计时一律用墙钟时间差，后台标签限流也不丢时长精度（提醒可能延迟到回前台）。
import { ref } from 'vue';

const now = ref(Date.now());
setInterval(() => { now.value = Date.now(); }, 250);

export function useNow(){
  return now;
}
