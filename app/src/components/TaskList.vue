<script setup>
// 任务清单：轻量增删；每个任务的番茄数由 records 按 id 派生，删除任务不丢历史统计（名字快照）
import { computed, ref } from 'vue';
import { useStore } from '../composables/useStore';
import { toast } from '../composables/useToast';
import { useToast } from '../composables/useToast';

const { state, addTask, deleteTask } = useStore();
const name = ref('');

const counts = computed(() => {
  const m = new Map();
  for (const r of state.records){
    if (r.t === 'focus' && r.task && r.task.id) m.set(r.task.id, (m.get(r.task.id) || 0) + 1);
  }
  return m;
});

function submit(){
  const trimmed = name.value.trim();
  if (!trimmed) return;
  if (!addTask(trimmed)) toast('这个任务已经有了');
  name.value = '';
}
</script>

<template>
  <section class="card">
    <h2>📚 任务</h2>
    <form @submit.prevent="submit">
      <div class="row">
        <input v-model="name" type="text" maxlength="30" placeholder="添加任务，如：高数 / 英语单词">
        <button type="submit">添加</button>
      </div>
    </form>
    <ul v-if="state.tasks.length">
      <li v-for="t in state.tasks" :key="t.id">
        <span class="tname">{{ t.name }}</span>
        <span class="tcount">🍅 ×{{ counts.get(t.id) || 0 }}</span>
        <button class="ghost" title="删除任务（历史统计保留名字快照）" @click="deleteTask(t.id)">✕</button>
      </li>
    </ul>
    <p v-else class="empty">还没有任务。加一个，看看时间都花哪儿了。</p>
  </section>
</template>

<style scoped>
.row{ display:flex; gap:8px; margin-bottom:10px; }
.row input{ flex:1; min-width:0; }
ul{ list-style:none; margin:0; padding:0; }
li{ display:flex; align-items:center; gap:8px; padding:7px 2px; border-bottom:1px dashed var(--line); }
li:last-child{ border-bottom:none; }
.tname{ flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tcount{ color:var(--muted); font-size:13px; }
</style>
