import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base 用相对路径，部署到 GitHub Pages 子路径也能直接工作
export default defineConfig({
  plugins: [vue()],
  base: './',
});
