<script setup>
// 数据卡：导出/导入备份。导入是唯一整体覆盖通道，必须显式确认（ADR-0002）
import { ref } from 'vue';
import { useStore } from '../composables/useStore';
import { useToast } from '../composables/useToast';
import { dateKey } from '../lib/core';

const { state, replaceAll } = useStore();
const fileInput = ref(null);

function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '专注备份-' + dateKey(Date.now()) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
async function onImport(e){
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let raw;
  try { raw = JSON.parse(await file.text()); }
  catch { toast('文件不是合法的 JSON'); return; }
  if (!raw || raw.version !== 1 || !Array.isArray(raw.records)){ toast('这不是本应用的备份文件'); return; }
  if (!confirm('导入将整体替换当前全部数据（历史只读，这是唯一覆盖通道，建议先导出现有数据）。确定继续？')) return;
  replaceAll(raw);
  location.reload();
}
</script>

<template>
  <section class="card">
    <h2>💾 数据</h2>
    <div class="row">
      <button @click="exportData">导出备份 (JSON)</button>
      <button @click="fileInput.click()">导入备份</button>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onImport">
    </div>
    <p class="hint">记录只存在浏览器里，清除浏览器数据会连记录一起清掉——建议定期导出备份。</p>
  </section>
</template>

<style scoped>
.row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
</style>
