// 轻提示单例：一条消息，6 秒自动消失
import { reactive } from 'vue';

const toastState = reactive({ msg: '', show: false });
let timer = null;

export function toast(msg){
  toastState.msg = msg;
  toastState.show = true;
  clearTimeout(timer);
  timer = setTimeout(() => { toastState.show = false; }, 6000);
}

export function useToast(){
  return toastState;
}
