/* CYBER CITY LOADER - inline de chay ngay lap tuc, khong cho script.js (790KB) parse xong */
/* ============================================================
   CYBER CITY LOADER — boot thay cho iOS 26
   Load ~5s → tự vào màn CMD (gọi lại window.initCmd)
   ============================================================ */
(function () {
  'use strict';

  var loader = document.getElementById('cyber-loader');
  if (!loader) return;

  var reduced = (window.__LOW_PERF === true) ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var entered = false;
  var progDone = false;
  var shownAt = Date.now();

  function enterWorld() {
    if (entered) return;
    entered = true;
    window.__clDone = true;
    loader.classList.add('cl-done');
    loader.style.opacity = '0';

    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);

      var terminal = document.getElementById('terminal-screen');
      if (!terminal) return;
      terminal.style.visibility = 'visible';
      terminal.style.opacity = '1';
      terminal.classList.add('active');
      requestAnimationFrame(function () {
        try {
          if (typeof window.initCmd === 'function') window.initCmd();
        } catch (e) { console.error('[cyber-loader] initCmd lỗi:', e); }
      });
    }, 620);
  }

  /* bấm bất kỳ để bỏ qua loading */
  loader.addEventListener('click', function () { if (progDone) enterWorld(); });

  /* ---------- CANVAS FX: sao băng thật + mưa neon ---------- */
  if (!reduced) {
    (function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var skyCv = document.getElementById('cl-fx-sky');
      var rainCv = document.getElementById('cl-fx-rain');
      if (!skyCv || !rainCv) return;
      var sky = skyCv.getContext('2d');
      var rain = rainCv.getContext('2d');
      var W, H;

      function resize() {
        W = window.innerWidth; H = window.innerHeight;
        [skyCv, rainCv].forEach(function (c) {
          c.width = W * dpr; c.height = H * dpr;
          c.style.width = W + 'px'; c.style.height = H + 'px';
        });
        sky.setTransform(dpr, 0, 0, dpr, 0, 0);
        rain.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      /* sao băng: đầu sáng + đuôi thon + tia lửa */
      var meteors = [], sparks = [];

      function spawnMeteor() {
        var fromLeft = Math.random() < 0.22;
        var ang = (fromLeft ? 38 : 142) * Math.PI / 180;
        var speed = 620 + Math.random() * 480;
        meteors.push({
          x: W * (fromLeft ? -0.05 + Math.random() * 0.3 : 0.55 + Math.random() * 0.5),
          y: H * (Math.random() * 0.28),
          vx: Math.cos(ang) * speed,
          vy: Math.abs(Math.sin(ang)) * speed,
          life: 0, maxLife: 0.7 + Math.random() * 0.55,
          trail: [],
          r: 1.6 + Math.random() * 1.6,
          hue: Math.random() < 0.3 ? '255,150,225' : '150,230,255'
        });
      }

      function emitSparks(m) {
        var n = 2 + (Math.random() * 3 | 0);
        for (var i = 0; i < n; i++) {
          sparks.push({
            x: m.x, y: m.y,
            vx: -m.vx * 0.06 + (Math.random() - 0.5) * 60,
            vy: -m.vy * 0.06 + (Math.random() - 0.5) * 60,
            life: 0, maxLife: 0.3 + Math.random() * 0.25,
            hue: m.hue
          });
        }
      }

      function drawMeteors(dt) {
        sky.clearRect(0, 0, W, H);

        for (var i = meteors.length - 1; i >= 0; i--) {
          var m = meteors[i];
          m.life += dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.trail.push({ x: m.x, y: m.y });
          if (m.trail.length > 16) m.trail.shift();

          var t = m.life / m.maxLife;
          var fade = t < 0.12 ? t / 0.12 : (1 - (t - 0.12) / 0.88);

          for (var s = 1; s < m.trail.length; s++) {
            var p0 = m.trail[s - 1], p1 = m.trail[s];
            var k = s / m.trail.length;
            sky.strokeStyle = 'rgba(' + m.hue + ',' + (0.75 * k * fade).toFixed(3) + ')';
            sky.lineWidth = (0.6 + 2.4 * k) * m.r * 0.8;
            sky.lineCap = 'round';
            sky.beginPath();
            sky.moveTo(p0.x, p0.y);
            sky.lineTo(p1.x, p1.y);
            sky.stroke();
          }

          var g = sky.createRadialGradient(m.x, m.y, 0, m.x, m.y, 14 * m.r);
          g.addColorStop(0, 'rgba(' + m.hue + ',' + (0.85 * fade).toFixed(3) + ')');
          g.addColorStop(0.35, 'rgba(' + m.hue + ',' + (0.3 * fade).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + m.hue + ',0)');
          sky.fillStyle = g;
          sky.beginPath();
          sky.arc(m.x, m.y, 14 * m.r, 0, Math.PI * 2);
          sky.fill();

          sky.fillStyle = 'rgba(255,255,255,' + (0.95 * fade).toFixed(3) + ')';
          sky.beginPath();
          sky.arc(m.x, m.y, m.r * 0.85, 0, Math.PI * 2);
          sky.fill();

          if (Math.random() < 0.5) emitSparks(m);
          if (m.life >= m.maxLife || m.y > H + 60 || m.x < -80 || m.x > W + 80) meteors.splice(i, 1);
        }

        for (var j = sparks.length - 1; j >= 0; j--) {
          var sp = sparks[j];
          sp.life += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          var k2 = 1 - sp.life / sp.maxLife;
          if (k2 <= 0) { sparks.splice(j, 1); continue; }
          sky.fillStyle = 'rgba(' + sp.hue + ',' + (0.7 * k2).toFixed(3) + ')';
          sky.fillRect(sp.x, sp.y, 1.6, 1.6);
        }
      }

      var nextSpawn = 0.8;
      function meteorScheduler(dt) {
        nextSpawn -= dt;
        if (nextSpawn <= 0) {
          spawnMeteor();
          if (Math.random() < 0.28) setTimeout(spawnMeteor, 260 + Math.random() * 350);
          nextSpawn = 1.9 + Math.random() * 2.8;
        }
      }

      /* mưa neon + bắn tóe */
      var drops = [], splashes = [];
      function spawnDrop(d, first) {
        d.x = Math.random() * (W + 160) - 80;
        d.y = first ? Math.random() * H : -24;
        d.len = 9 + Math.random() * 15;
        d.v = 950 + Math.random() * 550;
        d.wind = 60 + Math.random() * 50;
        d.a = 0.08 + Math.random() * 0.13;
        d.pink = Math.random() < 0.28;
      }
      var dropCount = Math.min(110, Math.floor(window.innerWidth / 13));
      for (var di = 0; di < dropCount; di++) { var dd = {}; spawnDrop(dd, true); drops.push(dd); }

      function drawRain(dt) {
        rain.clearRect(0, 0, W, H);
        for (var i = 0; i < drops.length; i++) {
          var d = drops[i];
          d.x += d.wind * dt;
          d.y += d.v * dt;
          if (d.y - d.len > H) {
            if (Math.random() < 0.22) {
              splashes.push({ x: d.x, y: H - 2, life: 0, max: 0.22, pink: d.pink });
            }
            spawnDrop(d, false);
          }
          var nx = d.wind / d.v * d.len;
          var col = d.pink ? '255,170,230' : '170,215,255';
          var grad = rain.createLinearGradient(d.x - nx, d.y - d.len, d.x, d.y);
          grad.addColorStop(0, 'rgba(' + col + ',0)');
          grad.addColorStop(0.7, 'rgba(' + col + ',' + d.a + ')');
          grad.addColorStop(1, 'rgba(' + col + ',0)');
          rain.strokeStyle = grad;
          rain.lineWidth = 1;
          rain.beginPath();
          rain.moveTo(d.x - nx, d.y - d.len);
          rain.lineTo(d.x, d.y);
          rain.stroke();
        }
        for (var s2 = splashes.length - 1; s2 >= 0; s2--) {
          var sp2 = splashes[s2];
          sp2.life += dt;
          var k3 = sp2.life / sp2.max;
          if (k3 >= 1) { splashes.splice(s2, 1); continue; }
          var col2 = sp2.pink ? '255,170,230' : '170,215,255';
          rain.strokeStyle = 'rgba(' + col2 + ',' + (0.35 * (1 - k3)).toFixed(3) + ')';
          rain.lineWidth = 1;
          rain.beginPath();
          rain.ellipse(sp2.x, sp2.y, 2 + 9 * k3, 0.8 + 2.6 * k3, 0, 0, Math.PI * 2);
          rain.stroke();
        }
      }

      var last = performance.now();
      function loop(now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        meteorScheduler(dt);
        drawMeteors(dt);
        drawRain(dt);
        if (!entered && document.getElementById('cyber-loader')) {
          requestAnimationFrame(loop);
        }
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- TÊN + TIẾN TRÌNH ~5 GIÂY ---------- */
  var NAME = 'Chinatsu Kamado';
  var nameEl = document.getElementById('cl-name');

  function buildName() {
    if (!nameEl) return;
    nameEl.innerHTML = '';
    var chars = NAME.split('');
    chars.forEach(function (c, i) {
      var s = document.createElement('span');
      s.className = 'cl-ch' + (c === ' ' ? ' space' : '');
      if (c !== ' ') s.textContent = c;
      s.style.animationDelay = (0.25 + i * 0.04) + 's';
      nameEl.appendChild(s);
    });
  }

  var LINES = [
    'bật lưới điện thành phố…',
    'thắp sáng dãy neon…',
    'kết nối mạng ngầm…',
    'điều phối giao thông trên cao…',
    'hoàn tất'
  ];
  var fill = document.getElementById('cl-fill');
  var pctEl = document.getElementById('cl-pct');
  var lineEl = document.getElementById('cl-line');
  var hintEl = document.getElementById('cl-hint');
  var timer = null;

  function run() {
    if (hintEl) hintEl.classList.remove('show');
    buildName();
    var prog = 0;
    /* Luôn chạy đủ ~5s — reduced-motion chỉ tắt hiệu ứng, không rút ngắn loading */
    var tickMin = 60;
    var tickVar = 30;
    var incBase = 1.25;
    var incVar = 0.5;

    (function step() {
      if (entered) return;
      prog += incBase + Math.random() * incVar;
      if (prog > 100) prog = 100;
      if (fill) fill.style.width = prog + '%';
      if (pctEl) pctEl.textContent = Math.floor(prog) + '%';
      if (lineEl) {
        var idx = Math.min(LINES.length - 1, Math.floor(prog / (100 / LINES.length)));
        lineEl.textContent = LINES[idx];
      }
      if (prog < 100) {
        timer = setTimeout(step, tickMin + Math.random() * tickVar);
      } else {
        progDone = true;
        if (hintEl) setTimeout(function () { hintEl.classList.add('show'); }, 300);
        setTimeout(enterWorld, 1100);
      }
    })();
  }

  /* an toàn: tối đa 20s thì bắt buộc phải vào trang */
  setTimeout(enterWorld, 20000);

  run();
})();
