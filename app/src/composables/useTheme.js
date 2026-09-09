// 主题单例：auto / light / dark 三态，独立于备份数据存储（ADR-0004：跟随系统 + 手动切换）
import { ref, watchEffect } from 'vue';

const THEME_KEY = 'did-you-focus-theme';
const mode = ref(localStorage.getItem(THEME_KEY) || 'auto');

watchEffect(() => {
  document.documentElement.dataset.theme = mode.value;
  localStorage.setItem(THEME_KEY, mode.value);
});

export function useTheme(){
  function cycle(){
    mode.value = mode.value === 'auto' ? 'light' : mode.value === 'light' ? 'dark' : 'auto';
  }
  return { mode, cycle };
}
