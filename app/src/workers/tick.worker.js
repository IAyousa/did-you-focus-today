// 后台心跳（ADR-0005）：Worker 内的定时器不受页面可见性节流约束，
// 其 postMessage 能唤醒被节流的主线程——切到别的标签页学习，到点也能准时触发提醒。
setInterval(() => {
  self.postMessage({ t: Date.now() });
}, 250);
