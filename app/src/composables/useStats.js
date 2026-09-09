// 报表单例：由 records + 共享时钟派生，records 或跨天时自动重算（替代单文件版的人肉 renderStats）
import { computed } from 'vue';
import { useStore } from './useStore';
import { useNow } from './useNow';
import { computeStats } from '../lib/core';

const { state } = useStore();
const now = useNow();
const stats = computed(() => computeStats(state.records, now.value));

export function useStats(){
  return stats;
}
