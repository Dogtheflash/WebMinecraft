/* Failsafe: nếu script.js bị lỗi hoặc không tải được, sau 12s vẫn phải vào trang */
setTimeout(function () {
  if (window.__clDone) return;
  window.__clDone = true;
  var l = document.getElementById('cyber-loader');
  if (l && l.parentNode) l.parentNode.removeChild(l);
  var t = document.getElementById('terminal-screen');
  if (t) {
    t.style.visibility = 'visible';
    t.style.opacity = '1';
    t.classList.add('active');
  }
  try { if (typeof window.initCmd === 'function') window.initCmd(); } catch (e) {}
}, 12000);
