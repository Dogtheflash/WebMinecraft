/* Failsafe: nếu Sakura loader gặp lỗi, sau 15s vẫn mở được trang. */
setTimeout(function () {
  if (window.__sakuraLoaderDone) return;
  window.__sakuraLoaderDone = true;
  var l = document.getElementById('sakura-loader');
  if (l && l.parentNode) l.parentNode.removeChild(l);
  var t = document.getElementById('terminal-screen');
  if (t) {
    t.style.visibility = 'visible';
    t.style.opacity = '1';
    t.classList.add('active');
  }
  try { if (typeof window.initCmd === 'function') window.initCmd(); } catch (e) {}
}, 15000);
