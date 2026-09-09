// 数据层单例：localStorage 持久化 + 数据模型（schema 与单文件版完全一致，ADR-0004：零迁移）。
// 所有变更走这里的动作函数，改完即 save；records 只增不改（ADR-0002）。
import { reactive } from 'vue';

export const LS_KEY = 'did-you-focus-v1';

export const SETTING_BOUNDS = {
  focusMin: [1, 180], shortMin: [1, 60], longMin: [1, 90], longEvery: [2, 8], dailyGoal: [1, 20],
};

export function clampSetting(key, v){
  const [lo, hi] = SETTING_BOUNDS[key];
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
}

function defaults(){
  return {
    version: 1,
    settings: { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyGoal: 8 },
    tasks: [],      /* {id, name}；历史记录里存名字快照，删除任务不丢统计 */
    records: [],    /* {t:'focus'|'cut', ...}，只增不改（ADR-0002） */
    cycle: 0,       /* 本轮已确认的番茄数，长休开始时清零 */
    pending: null,  /* 进行中的专注 {phase,start,end,min,task}，确认/放弃/中断时清除 */
  };
}

export function normalize(raw){
  const d = defaults();
  const s = { ...d.settings };
  if (raw && typeof raw.settings === 'object'){
    for (const k of Object.keys(SETTING_BOUNDS)){
      const v = clampSetting(k, raw.settings[k]);
      if (v !== null) s[k] = v;
    }
  }
  const tasks = Array.isArray(raw && raw.tasks)
    ? raw.tasks.filter(t => t && t.id && typeof t.name === 'string' && t.name.trim()).slice(0, 50)
    : [];
  const records = Array.isArray(raw && raw.records)
    ? raw.records.filter(r => r && (r.t === 'focus' || r.t === 'cut')).slice(-5000)
    : [];
  return { ...d, settings: s, tasks, records };
}

function loadState(){
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return defaults(); }
}

const state = reactive(loadState());

function save(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function useStore(){
  return {
    state,
    save,
    addTask(name){
      if (!name || state.tasks.some(t => t.name === name)) return false;
      state.tasks.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name });
      save();
      return true;
    },
    deleteTask(id){
      state.tasks = state.tasks.filter(t => t.id !== id);
      save();
    },
    pushRecord(r){
      state.records.push(r);
      save();
    },
    /* 三处落中断的唯一出口：主动放弃（此刻）、关页（关页时刻）、重开回填（专注可能仍在跑的最后时刻） */
    recordCut(at){
      state.records.push({ t: 'cut', at });
      state.pending = null;
      save();
    },
    /* 导入是唯一整体覆盖通道，且必须经用户显式确认（ADR-0002） */
    replaceAll(raw){
      Object.assign(state, normalize(raw));
      save();
    },
  };
}
