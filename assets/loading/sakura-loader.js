(function () {
  'use strict';

  var loader = document.getElementById('sakura-loader');
  var frame = document.getElementById('sakura-loader-frame');
  if (!loader || !frame) return;

  var entered = false;

  function enterWorld() {
    if (entered) return;
    entered = true;
    window.__sakuraLoaderDone = true;
    loader.classList.add('sakura-loader-done');

    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);

      var terminal = document.getElementById('terminal-screen');
      if (!terminal) return;
      terminal.style.visibility = 'visible';
      terminal.style.opacity = '1';
      terminal.classList.add('active');

      window.requestAnimationFrame(function () {
        try {
          if (typeof window.initCmd === 'function') window.initCmd();
        } catch (error) {
          console.error('[sakura-loader] Không thể mở màn CMD:', error);
        }
      });
    }, 700);
  }

  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'sakura-loader-complete') return;
    enterWorld();
  });
})();
