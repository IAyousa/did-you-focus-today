<script setup>
// 设置：改完即钳制并保存；时长改动从下一个时段开始生效，不打断正在进行的计时
import { useStore, clampSetting, SETTING_BOUNDS } from '../composables/useStore';

const { state, save } = useStore();

const fields = [
  { key: 'focusMin', label: '专注时长（分钟）', id: 'setFocus' },
  { key: 'shortMin', label: '短休时长（分钟）', id: 'setShort' },
  { key: 'longMin', label: '长休时长（分钟）', id: 'setLong' },
  { key: 'longEvery', label: '每几个番茄一长休', id: 'setEvery' },
  { key: 'dailyGoal', label: '每日目标（番茄数）', id: 'setGoal' },
];
function onChange(f){
  const v = clampSetting(f.key, state.settings[f.key]);
  if (v !== null) state.settings[f.key] = v;
  save();
}
</script>

<template>
  <details class="card settings">
    <summary>⚙️ 设置</summary>
    <div class="grid">
      <div v-for="f in fields" :key="f.key">
        <label :for="f.id">{{ f.label }}</label>
        <input
          :id="f.id" v-model.number="state.settings[f.key]" type="number"
          :min="SETTING_BOUNDS[f.key][0]" :max="SETTING_BOUNDS[f.key][1]"
          @change="onChange(f)"
        >
      </div>
    </div>
    <p class="hint">时长改动从下一个时段开始生效，不打断正在进行的计时。</p>
  </details>
</template>

<style scoped>
summary{ cursor:pointer; font-size:15px; font-weight:600; }
.grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:12px; }
label{ font-size:13px; color:var(--muted); display:block; }
input{ width:100%; }
</style>
