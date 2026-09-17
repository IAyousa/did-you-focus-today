<script setup>
// 常驻使用说明：默认收起，点开展开（首次访问的引导弹层在 App.vue，两者共用 HelpContent）
import { ref } from 'vue';
import HelpContent from './HelpContent.vue';

const open = ref(false);
</script>

<template>
  <details class="card help-card" :open="open" @toggle="open = $event.target.open">
    <summary>📖 使用说明</summary>
    <HelpContent v-if="open" />
  </details>
</template>

<style scoped>
summary{ cursor:pointer; font-size:15px; font-weight:600; }
</style>
