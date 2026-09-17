<script setup>
// 设置：改完即钳制并保存；时长改动从下一个时段开始生效，不打断正在进行的计时。
// 桌面通知状态行：四种状态都有如实反馈，被拦截时给出解锁指引（Android 页面上下文不支持，留待 PWA）
import { computed, ref } from 'vue';
import { useStore, clampSetting, SETTING_BOUNDS } from '../composables/useStore';
import { toast } from '../composables/useToast';

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

/* ---------- 桌面通知状态 ---------- */
const isAndroid = /Android/i.test(navigator.userAgent);
const permission = ref('Notification' in window ? Notification.permission : 'n/a');
const requesting = ref(false);

const notif = computed(() => {
  if (!('Notification' in window)){
    return { canAct: false, text: '此浏览器不支持网页通知' };
  }
  if (isAndroid){
    return { canAct: false, text: '此浏览器暂不支持网页通知（将来装成应用后可用）' };
  }
  if (permission.value === 'granted'){
    return { canAct: false, text: '已开启：切到别的标签页，到点也会弹通知提醒你' };
  }
  if (permission.value === 'denied'){
    return { canAct: false, text: '已被浏览器拦截：地址栏左侧 🔒 → 网站设置 → 通知 → 允许' };
  }
  return { canAct: true, text: '未开启：开启后切到别的标签页，到点也会弹通知提醒你' };
});

async function requestNotif(){
  if (requesting.value) return;
  requesting.value = true;
  try {
    const result = await Notification.requestPermission();
    permission.value = result;
    if (result === 'granted') toast('桌面通知已开启 ✓');
    else if (result === 'denied') toast('通知被浏览器拦截了：地址栏 🔒 → 网站设置 → 通知 → 允许');
    else toast('未完成授权，可稍后再试（弹窗需要页面在前台时才会出现）');
  } finally {
    requesting.value = false;
  }
}
</script>

<template>
  <details class="card settings">
    <summary>⚙️ 设置</summary>
    <div class="notif-row">
      <span class="notif-label">🔔 桌面通知</span>
      <span class="notif-state">{{ notif.text }}</span>
      <button v-if="notif.canAct" :disabled="requesting" @click="requestNotif">
        {{ requesting ? '请求中…' : '开启' }}
      </button>
    </div>
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
.notif-row{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:10px 0; border-bottom:1px dashed var(--line); margin-bottom:12px;
}
.notif-label{ font-size:14px; font-weight:600; }
.notif-state{ flex:1; min-width:200px; font-size:13px; color:var(--muted); }
.grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:12px; }
label{ font-size:13px; color:var(--muted); display:block; }
input{ width:100%; }
</style>
