/* ════════════════════════════════════════════════════════════
   CHẾ ĐỘ NHẸ — chỉ bật khi người dùng chọn prefers-reduced-motion
   Các hiệu ứng ăn GPU sẽ tự tắt thay vì làm rớt khung hình.
   ════════════════════════════════════════════════════════════ */
window.__LOW_PERF = (function () {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
})();
if (window.__LOW_PERF) document.documentElement.classList.add('low-perf');

/* ============================================================
   iOS 26 Loading Screen — Standalone JS
   Boot → Hello → Ready · chime · particles · visualizer
   ============================================================ */
'use strict';

/* ===== Constants ===== */
var CHIME_MS = 4200;
var AURORA_HEX = '#f0399c';
var MOOD = 'vapor';

var BOOT_LINES = [
  'Preparing iOS 26\u2026',
  'Mounting Liquid Glass\u2026',
  'Calibrating Taptic Engine\u2026',
  'Restoring your Apple ID\u2026',
  'Almost there\u2026',
];

var NAME = 'T\xFA Xinh Trai';
var STEP = 62;
var LEAD = 620;
var ENTER_MS = 900;

/* ===== Aurora color helpers ===== */
function hexToHsl(hex) {
  var clean = hex.replace('#', '');
  var full = clean.length === 3 ? clean.split('').map(function (c) { return c + c; }).join('') : clean;
  var r = parseInt(full.slice(0, 2), 16) / 255;
  var g = parseInt(full.slice(2, 4), 16) / 255;
  var b = parseInt(full.slice(4, 6), 16) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var delta = max - min;
  var l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l };
  var s = delta / (1 - Math.abs(2 * l - 1));
  var h;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: s, l: l };
}

function hexToHue(hex) { return Math.round(hexToHsl(hex).h); }

function hsla(hsl, alpha) {
  var sat = Math.round(Math.min(1, Math.max(0.35, hsl.s)) * 100);
  var light = Math.round(Math.min(0.72, Math.max(0.42, hsl.l)) * 100);
  return 'hsla(' + Math.round((hsl.h + 360) % 360) + ', ' + sat + '%, ' + light + '%, ' + alpha + ')';
}

function buildAuroraColors(hex) {
  var base = hexToHsl(hex);
  return [
    hsla(base, 0.5),
    hsla({ h: base.h + 42, s: base.s, l: base.l * 1.05 }, 0.45),
    hsla({ h: base.h - 36, s: base.s, l: base.l * 0.95 }, 0.4),
    hsla({ h: base.h + 84, s: base.s, l: base.l }, 0.32),
  ];
}

var AURORA_HUE = hexToHue(AURORA_HEX);

/* Apply aurora CSS vars to root */
function applyAuroraVars() {
  var colors = buildAuroraColors(AURORA_HEX);
  var app = document.getElementById('app');
  if (!app) return;
  app.style.setProperty('--aurora-1', colors[0]);
  app.style.setProperty('--aurora-2', colors[1]);
  app.style.setProperty('--aurora-3', colors[2]);
  app.style.setProperty('--aurora-4', colors[3]);
}

/* ===== Haptics ===== */
var VIBRATION_MS = { light: 8, medium: 16, heavy: 30 };
var SETTLE_PATTERN = [14, 90, 22];

function vibrate(pattern) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}
function hapticTap(strength) { vibrate(VIBRATION_MS[strength || 'light']); }
function hapticSettle() { vibrate(SETTLE_PATTERN.slice()); }

/* ===== Parallax ===== */
var parallax = { x: 0, y: 0 };
function initParallax() {
  var targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  var raf = 0;
  var bgLayer = document.getElementById('bg-layer');

  function onMove(e) {
    targetX = (e.clientX / window.innerWidth) * 2 - 1;
    targetY = (e.clientY / window.innerHeight) * 2 - 1;
  }
  function onOrientation(e) {
    var gamma = e.gamma || 0;
    var beta = e.beta || 0;
    targetX = Math.max(-1, Math.min(1, gamma / 35));
    targetY = Math.max(-1, Math.min(1, (beta - 45) / 35));
  }
  function loop() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;
    parallax.x = currentX;
    parallax.y = currentY;
    if (bgLayer) {
      bgLayer.style.transform = 'translate3d(' + (currentX * -26) + 'px, ' + (currentY * -26) + 'px, 0) scale(1.08)';
    }
    var bootEl = document.getElementById('stage-boot');
    if (bootEl && bootEl.style.display !== 'none') {
      bootEl.style.transform = 'translate3d(' + (currentX * 14) + 'px, ' + (currentY * 14) + 'px, 0)';
    }
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('deviceorientation', onOrientation);
  raf = requestAnimationFrame(loop);
}

/* ===== Startup Chime (Web Audio) ===== */
var CHORD_HZ = [46.25, 92.5, 185, 277.18, 369.99, 554.37, 739.99, 1108.73];
var DURATION = 4.2;

var chimeCtx = null;
var chimeAnalyser = null;
var chimeData = null;
var chimeUnlocked = false;
var chimeActiveUntil = 0;

function getChimeContext() {
  if (chimeCtx) return chimeCtx;
  var Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { chimeCtx = new Ctor(); return chimeCtx; } catch (e) { return null; }
}

function createImpulseResponse(ctx, seconds) {
  var frames = Math.floor(ctx.sampleRate * seconds);
  var ir = ctx.createBuffer(2, frames, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var data = ir.getChannelData(ch);
    for (var i = 0; i < frames; i++) {
      var decay = Math.pow(1 - i / frames, 2.6);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return ir;
}

function createSoftClipCurve() {
  var n = 1024;
  var curve = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
  }
  return curve;
}

function chimePlay() {
  var ctx = getChimeContext();
  if (!ctx) return;
  ctx.resume();
  if (ctx.state !== 'running') return;

  var now = ctx.currentTime + 0.03;

  var master = ctx.createGain();
  master.gain.value = 0.92;

  var shaper = ctx.createWaveShaper();
  shaper.curve = createSoftClipCurve();
  shaper.oversample = '2x';

  var analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.72;
  chimeAnalyser = analyser;
  chimeData = new Uint8Array(analyser.frequencyBinCount);

  master.connect(shaper);
  shaper.connect(analyser);
  analyser.connect(ctx.destination);

  var convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.6);
  var wet = ctx.createGain();
  wet.gain.value = 0.34;
  convolver.connect(wet);
  wet.connect(master);

  var dry = ctx.createGain();
  dry.gain.value = 0.78;
  var tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(1200, now);
  tone.frequency.exponentialRampToValueAtTime(6800, now + 0.7);
  tone.frequency.exponentialRampToValueAtTime(2600, now + DURATION);
  tone.Q.value = 0.6;
  dry.connect(tone);
  tone.connect(master);
  tone.connect(convolver);

  /* Sub-bass thump */
  var sub = ctx.createOscillator();
  var subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(110, now);
  sub.frequency.exponentialRampToValueAtTime(46.25, now + 0.5);
  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.exponentialRampToValueAtTime(0.42, now + 0.03);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(now);
  sub.stop(now + 1.9);

  /* Chord bloom */
  CHORD_HZ.forEach(function (freq, i) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var pan = ctx.createStereoPanner();
    osc.type = i < 2 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * (2 + i * 1.4);
    pan.pan.value = (i % 2 === 0 ? -1 : 1) * Math.min(0.62, i * 0.11);
    var start = now + i * 0.026;
    var peak = 0.3 / (1 + i * 0.42);
    var attack = 0.014 + i * 0.008;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(peak * 0.46, start + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + DURATION);
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(dry);
    osc.start(start);
    osc.stop(start + DURATION + 0.05);

    if (i >= 4) {
      var shimmer = ctx.createOscillator();
      var shimmerGain = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.value = freq * 2;
      shimmer.detune.value = 6;
      shimmerGain.gain.setValueAtTime(0.0001, start);
      shimmerGain.gain.exponentialRampToValueAtTime(0.035, start + 0.5);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + DURATION);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(convolver);
      shimmer.start(start);
      shimmer.stop(start + DURATION);
    }
  });

  /* Noise strike */
  var frames = Math.floor(ctx.sampleRate * 0.2);
  var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3);
  }
  var noise = ctx.createBufferSource();
  noise.buffer = buffer;
  var noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1800;
  noiseFilter.Q.value = 0.8;
  var noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.16, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dry);
  noise.start(now);

  chimeUnlocked = true;
  chimeActiveUntil = now + DURATION + 1;
}

function chimeGetLevel() {
  if (!chimeAnalyser || !chimeCtx || !chimeData) return 0;
  if (chimeCtx.currentTime > chimeActiveUntil) return 0;
  chimeAnalyser.getByteFrequencyData(chimeData);
  var sum = 0;
  var bins = Math.floor(chimeData.length * 0.6);
  for (var i = 0; i < bins; i++) sum += chimeData[i];
  return Math.min(1, sum / bins / 150);
}

/* Unlock audio on first gesture */
function unlockAudio() {
  function unlock() {
    var ctx = getChimeContext();
    if (!ctx) return;
    ctx.resume().then(function () { chimeUnlocked = ctx.state === 'running'; });
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/* ===== Particle Field (canvas) ===== */
var SPRITE_SIZE = 64;
var HUE_STEP = 15;

var VAPOR_CFG = { density: 0.6, size: 2.3, rise: -0.34, sway: 0.5, spread: 150, bloom: 10, trail: 0, flicker: 0.4 };

function buildSprites(coreRatio) {
  var sprites = [];
  var half = SPRITE_SIZE / 2;
  for (var hue = 0; hue < 360; hue += HUE_STEP) {
    var sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    var sctx = sprite.getContext('2d');
    if (!sctx) continue;
    var grad = sctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'hsla(' + hue + ', 95%, 82%, 0.66)');
    grad.addColorStop(1, 'hsla(' + hue + ', 95%, 70%, 0)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(half, half, half, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#ffffff';
    sctx.beginPath();
    sctx.arc(half, half, Math.max(0.5, half * coreRatio), 0, Math.PI * 2);
    sctx.fill();
    sprites.push(sprite);
  }
  return sprites;
}

var particleState = {
  speed: 1,
  energy: 0.25,
  hue: AURORA_HUE,
  particles: [],
  sprites: [],
  raf: 0,
  w: 0, h: 0,
  dpr: 1.5,
};

function initParticles() {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var cfg = VAPOR_CFG;
  var count = 90;
  var total = Math.max(12, Math.round(count * cfg.density));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  particleState.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  particleState.sprites = buildSprites(0.5 / cfg.bloom);

  function resize() {
    particleState.w = window.innerWidth;
    particleState.h = window.innerHeight;
    canvas.width = Math.floor(particleState.w * particleState.dpr);
    canvas.height = Math.floor(particleState.h * particleState.dpr);
    canvas.style.width = particleState.w + 'px';
    canvas.style.height = particleState.h + 'px';
    ctx.setTransform(particleState.dpr, 0, 0, particleState.dpr, 0, 0);
  }

  function seed() {
    particleState.particles = [];
    for (var i = 0; i < total; i++) {
      var z = Math.random();
      particleState.particles.push({
        x: Math.random() * particleState.w,
        y: Math.random() * particleState.h,
        z: z,
        r: (0.5 + z * 2.1) * cfg.size,
        vy: -(0.08 + z * 0.55) * -cfg.rise,
        vx: cfg.trail > 0 ? (0.45 + z * 0.75) * cfg.sway : (Math.random() - 0.5) * 0.22 * cfg.sway,
        hue: (Math.random() - 0.5) * cfg.spread,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  resize();
  seed();

  function draw() {
    var e = particleState.energy;
    var s = particleState.speed;
    var w = particleState.w, h = particleState.h;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    var particles = particleState.particles;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (!reduce) {
        p.y += p.vy * (0.6 + e * 2.4) * s;
        p.x += p.vx * (0.6 + e * 1.6) * s;
        p.twinkle += (0.03 + p.z * 0.05) * cfg.flicker * s;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
      }
      var alpha = (0.18 + p.z * 0.5) * (0.6 + 0.4 * Math.sin(p.twinkle)) * (0.5 + e * 0.7);
      var tint = (particleState.hue + p.hue + 360) % 360;
      var glow = p.r * cfg.bloom;

      if (cfg.trail > 0) {
        var tailX = p.x - p.vx * cfg.trail * (0.6 + e) * s;
        var tailY = p.y - p.vy * cfg.trail * (0.6 + e) * s;
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = 'hsl(' + tint + ', 98%, 84%)';
        ctx.lineWidth = p.r * 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      var sprite = particleState.sprites[Math.floor(tint / HUE_STEP) % particleState.sprites.length];
      if (sprite) {
        ctx.globalAlpha = Math.min(alpha * 1.5, 0.9);
        ctx.drawImage(sprite, p.x - glow, p.y - glow, glow * 2, glow * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    particleState.raf = requestAnimationFrame(draw);
  }

  function onResize() { resize(); seed(); }
  window.addEventListener('resize', onResize);
  particleState.raf = requestAnimationFrame(draw);
}

/* ===== Chime Visualizer (canvas) ===== */
var VIZ_BAR_COUNT = 72;
var VIZ_WAVE_POINTS = 128;

var vizState = {
  smoothed: 0,
  phase: 0,
  nodes: null,
  raf: 0,
  w: 0, h: 0,
  dpr: 1.5,
  waveCache: null,
  bandCache: null,
  coreCache: null,
  cachedHue: -1,
  painted: false,
};

function initVisualizer() {
  var canvas = document.getElementById('visualizer');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var isVapor = MOOD === 'vapor';
  var isRidge = MOOD === 'ridge';
  vizState.nodes = new Float32Array(isRidge ? VIZ_WAVE_POINTS : VIZ_BAR_COUNT);
  vizState.waveCache = new Map();
  vizState.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function invalidateCaches() {
    vizState.waveCache.clear();
    vizState.bandCache = null;
    vizState.coreCache = null;
  }

  function waveGradient(light) {
    var hit = vizState.waveCache.get(light);
    if (hit) return hit;
    var baseHue = AURORA_HUE;
    var grad = ctx.createLinearGradient(0, 0, vizState.w, 0);
    grad.addColorStop(0, 'hsla(' + baseHue + ', 96%, ' + light + '%, 0)');
    grad.addColorStop(0.5, 'hsl(' + ((baseHue + 30) % 360) + ', 98%, ' + light + '%)');
    grad.addColorStop(1, 'hsla(' + ((baseHue + 60) % 360) + ', 96%, ' + light + '%, 0)');
    vizState.waveCache.set(light, grad);
    return grad;
  }

  function bandSprite() {
    if (vizState.bandCache) return vizState.bandCache;
    var sprite = document.createElement('canvas');
    sprite.width = 1; sprite.height = 64;
    var sctx = sprite.getContext('2d');
    if (sctx) {
      var baseHue = AURORA_HUE;
      var grad = sctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, 'hsla(' + baseHue + ', 92%, 74%, 0)');
      grad.addColorStop(0.5, 'hsl(' + baseHue + ', 92%, 74%)');
      grad.addColorStop(1, 'hsla(' + baseHue + ', 92%, 74%, 0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 1, 64);
    }
    vizState.bandCache = sprite;
    return sprite;
  }

  function coreSprite() {
    if (vizState.coreCache) return vizState.coreCache;
    var size = 128, half = size / 2;
    var sprite = document.createElement('canvas');
    sprite.width = size; sprite.height = size;
    var sctx = sprite.getContext('2d');
    if (sctx) {
      var baseHue = AURORA_HUE;
      var grad = sctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, 'hsl(' + baseHue + ', 92%, 80%)');
      grad.addColorStop(1, 'hsla(' + baseHue + ', 92%, 70%, 0)');
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(half, half, half, 0, Math.PI * 2);
      sctx.fill();
    }
    vizState.coreCache = sprite;
    return sprite;
  }

  function resize() {
    vizState.w = window.innerWidth;
    vizState.h = window.innerHeight;
    canvas.width = Math.floor(vizState.w * vizState.dpr);
    canvas.height = Math.floor(vizState.h * vizState.dpr);
    canvas.style.width = vizState.w + 'px';
    canvas.style.height = vizState.h + 'px';
    ctx.setTransform(vizState.dpr, 0, 0, vizState.dpr, 0, 0);
    invalidateCaches();
  }

  function drawWaveform() {
    var w = vizState.w, h = vizState.h;
    var cy = h / 2;
    var baseHue = AURORA_HUE;
    var amp = vizState.smoothed * Math.min(h * 0.3, 220);

    for (var i = 0; i < VIZ_WAVE_POINTS; i++) {
      var t = i / (VIZ_WAVE_POINTS - 1);
      var shape = Math.sin(t * 15 - vizState.phase * 3.4) * 0.6 + Math.sin(t * 31 - vizState.phase * 5.1) * 0.26 + Math.sin(t * 6 - vizState.phase * 1.7) * 0.34;
      var envelope = Math.pow(Math.sin(t * Math.PI), 0.7);
      vizState.nodes[i] += (shape * envelope - vizState.nodes[i]) * 0.24;
    }

    var passes = [
      { scale: 1, width: 2.4, alpha: 0.85, light: 84 },
      { scale: 0.62, width: 5.5, alpha: 0.24, light: 70 },
      { scale: 1.5, width: 1.2, alpha: 0.3, light: 92 },
    ];

    for (var p = 0; p < passes.length; p++) {
      var pass = passes[p];
      var grad = waveGradient(pass.light);
      ctx.globalAlpha = pass.alpha * vizState.smoothed;
      ctx.strokeStyle = grad;
      ctx.lineWidth = pass.width;
      ctx.beginPath();
      for (var i2 = 0; i2 < VIZ_WAVE_POINTS; i2++) {
        var x = (i2 / (VIZ_WAVE_POINTS - 1)) * w;
        var y = cy + vizState.nodes[i2] * amp * pass.scale;
        if (i2 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.22 * vizState.smoothed;
    ctx.strokeStyle = 'hsl(' + ((baseHue + 20) % 360) + ', 96%, 78%)';
    ctx.beginPath();
    for (var i3 = 2; i3 < VIZ_WAVE_POINTS; i3 += 4) {
      var x2 = (i3 / (VIZ_WAVE_POINTS - 1)) * w;
      var y2 = cy + vizState.nodes[i3] * amp;
      var tick = Math.abs(vizState.nodes[i3]) * amp * 0.4;
      if (tick < 1) continue;
      ctx.moveTo(x2, y2 - tick);
      ctx.lineTo(x2, y2 + tick);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.1 * vizState.smoothed;
    ctx.drawImage(bandSprite(), 0, cy - amp, w, amp * 2);
    ctx.globalAlpha = 1;
  }

  function drawRadial() {
    var w = vizState.w, h = vizState.h;
    var cx = w / 2, cy = h / 2;
    var radius = Math.min(w, h) * (isVapor ? 0.13 : 0.19);
    var baseHue = AURORA_HUE;

    ctx.lineCap = 'round';
    for (var i = 0; i < VIZ_BAR_COUNT; i++) {
      var angle = (i / VIZ_BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
      var wave = 0.55 + 0.45 * Math.sin(i * 0.55 + vizState.phase * 2.4) * Math.cos(i * 0.17 - vizState.phase);
      var target = vizState.smoothed * wave;
      vizState.nodes[i] += (target - vizState.nodes[i]) * (isVapor ? 0.1 : 0.22);
      var length = vizState.nodes[i] * Math.min(w, h) * (isVapor ? 0.3 : 0.2);
      if (length < 0.6) continue;
      var x1 = cx + Math.cos(angle) * radius;
      var y1 = cy + Math.sin(angle) * radius;
      var x2 = cx + Math.cos(angle) * (radius + length);
      var y2 = cy + Math.sin(angle) * (radius + length);
      var barHue = (baseHue + i * 1.6) % 360;
      ctx.globalAlpha = 0.42 * vizState.smoothed;
      ctx.strokeStyle = 'hsl(' + barHue + ', 96%, 74%)';
      ctx.lineWidth = isVapor ? 7 : 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    var glowRadius = radius * (isVapor ? 3.4 : 2.1);
    ctx.globalAlpha = 0.16 * vizState.smoothed;
    ctx.drawImage(coreSprite(), cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.globalAlpha = 1;
  }

  resize();

  function draw() {
    var level = chimeGetLevel();
    vizState.smoothed += (level - vizState.smoothed) * 0.16;

    if (AURORA_HUE !== vizState.cachedHue) {
      vizState.cachedHue = AURORA_HUE;
      invalidateCaches();
    }

    if (vizState.smoothed > 0.004) {
      vizState.phase += 0.02;
      ctx.clearRect(0, 0, vizState.w, vizState.h);
      vizState.painted = true;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (isRidge) drawWaveform(); else drawRadial();
      ctx.restore();
    } else if (vizState.painted) {
      ctx.clearRect(0, 0, vizState.w, vizState.h);
      vizState.painted = false;
    }

    vizState.raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  vizState.raf = requestAnimationFrame(draw);
}

/* ===== Ripple Layer ===== */
function initRipples() {
  var layer = document.getElementById('ripple-layer');
  if (!layer) return;
  var idCounter = 0;
  window.addEventListener('pointerdown', function (e) {
    var id = ++idCounter;
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    layer.appendChild(ripple);
    setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 1000);
  });
}

/* ===== Status Bar Clock ===== */
function initClock() {
  var timeEl = document.getElementById('clock-time');
  var secEl = document.getElementById('clock-seconds');
  if (!timeEl || !secEl) return;
  var id = 0;

  function tick() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var ss = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = hh + ':' + mm;
    secEl.textContent = ss;
    id = setTimeout(tick, 1000 - (now.getTime() % 1000));
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible') return;
    clearTimeout(id);
    tick();
  }

  tick();
  document.addEventListener('visibilitychange', onVisibility);
}

/* ===== Name Reveal (DOM) ===== */
function renderName() {
  var mount = document.getElementById('name-mount');
  if (!mount) return;
  mount.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.className = 'name-wrap';
  wrap.setAttribute('aria-label', NAME + '...');

  var halo = document.createElement('span');
  halo.className = 'name-halo';
  wrap.appendChild(halo);

  var letters = Array.from(NAME);
  letters.forEach(function (char, i) {
    var enterDelay = LEAD + i * STEP;
    var span = document.createElement('span');
    span.className = 'name-glyph';
    span.style.setProperty('--enter', enterDelay + 'ms');
    span.style.setProperty('--bob', (enterDelay + ENTER_MS + i * 110) + 'ms');
    span.textContent = char === ' ' ? '\u00A0' : char;
    wrap.appendChild(span);
  });

  var dotsWrap = document.createElement('span');
  dotsWrap.className = 'name-dots';
  [0, 1, 2].forEach(function (d) {
    var dot = document.createElement('span');
    dot.className = 'name-dot';
    dot.style.setProperty('--d', (LEAD + letters.length * STEP + d * 190) + 'ms');
    dotsWrap.appendChild(dot);
  });
  wrap.appendChild(dotsWrap);

  mount.appendChild(wrap);
}

/* ===== Stage Machine ===== */
var stage = 'boot';
var runKey = 0;
var bootRaf = 0;
var bootTimer = 0;
var bootWatchdog = 0;
var bootDone = false;
var bootStarted = false;
var bootRevealed = false;
var timers = [];

function schedule(fn, delay) { timers.push(setTimeout(fn, delay)); }
function clearTimers() { timers.forEach(function (id) { clearTimeout(id); }); timers = []; }

var nowMs = (window.performance && performance.now)
  ? function () { return performance.now(); }
  : function () { return Date.now(); };

/* Tìm element theo id, có selector dự phòng nếu id bị đổi */
function bootEl(id, fallback) {
  var el = document.getElementById(id);
  if (!el && fallback) el = document.querySelector(fallback);
  return el;
}

function showStage(name) {
  var stages = ['boot', 'hello', 'ready'];
  stages.forEach(function (s) {
    var el = document.getElementById('stage-' + s);
    if (el) el.style.display = (s === name) ? 'flex' : 'none';
  });
}

function setBootEnergy(progress) {
  try { particleState.energy = 0.25 + progress * 0.85; } catch (e) {}
}

function showFlash() {
  var flashLayer = document.getElementById('flash-layer');
  var shockwaveLayer = document.getElementById('shockwaves');
  if (flashLayer) flashLayer.innerHTML = '<div class="flash"></div>';
  if (shockwaveLayer) shockwaveLayer.innerHTML = '<span class="shockwave"></span><span class="shockwave" style="animation-delay:140ms"></span><span class="shockwave" style="animation-delay:280ms"></span>';
}

function hideFlash() {
  var flashLayer = document.getElementById('flash-layer');
  var shockwaveLayer = document.getElementById('shockwaves');
  if (flashLayer) flashLayer.innerHTML = '';
  if (shockwaveLayer) shockwaveLayer.innerHTML = '';
}

function showSlider() { var el = document.getElementById('speed-slider'); if (el) el.style.display = 'flex'; }
function hideSlider() { var el = document.getElementById('speed-slider'); if (el) el.style.display = 'none'; }

/* Mở màn hình terminal — gọi bao nhiêu lần cũng chỉ chạy một lần */
function revealTerminal() {
  if (bootRevealed) return;
  bootRevealed = true;

  var appEl = document.getElementById('app');
  var terminal = document.getElementById('terminal-screen');

  if (appEl) {
    appEl.style.transition = 'opacity 0.8s ease';
    appEl.style.opacity = '0';
  }

  setTimeout(function () {
    if (appEl) appEl.style.display = 'none';
    if (!terminal) return;
    terminal.style.visibility = 'visible';
    terminal.style.opacity = '0';
    terminal.style.transition = 'opacity 0.6s ease';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        terminal.style.opacity = '1';
        try {
          if (typeof window.initCmd === 'function') window.initCmd();
        } catch (e) { console.error('[loader] initCmd lỗi:', e); }
      });
    });
  }, appEl ? 800 : 0);
}

function handleBootComplete() {
  try { chimePlay(); } catch (e) { console.error('[loader] chime lỗi:', e); }
  try { hapticTap('heavy'); showFlash(); } catch (e) {}

  schedule(hideFlash, 700);
  schedule(function () { stage = 'hello'; showStage('hello'); }, 340);
  schedule(function () { try { hapticSettle(); } catch (e) {} }, CHIME_MS);
  schedule(revealTerminal, 3200);
}

/* ============================================================
   THANH TIẾN TRÌNH — bản đã sửa
   • rAF + vòng dự phòng setInterval (phòng khi rAF bị treo)
   • tra element mỗi lần vẽ tới khi tìm thấy (chống sai/đổi id)
   • tiến trình chỉ tăng, không bao giờ tụt
   • watchdog: quá hạn thì tự nhảy 100% và vào trang
   ============================================================ */
function startBootProgress(opts) {
  opts = opts || {};
  if (bootStarted && !opts.force) return;

  bootStarted = true;
  bootDone = false;
  bootRevealed = false;

  var duration = opts.duration || 4800;
  var start = nowMs();
  var shown = 0;
  var lastLineIndex = -1;
  var lastTick = start;
  var fillEl = null, pctEl = null, lineEl = null;

  cancelAnimationFrame(bootRaf);
  clearInterval(bootTimer);
  clearTimeout(bootWatchdog);

  function ease(t) {
    if (t < 0.35) return t * 1.8;
    if (t < 0.55) return 0.63 + (t - 0.35) * 0.35;
    if (t < 0.8)  return 0.70 + (t - 0.55) * 0.60;
    return 0.85 + (t - 0.8) * 0.75;
  }

  function paint(p) {
    if (!fillEl) fillEl = bootEl('progress-fill', '.progress-fill, [data-progress-fill]');
    if (!pctEl)  pctEl  = bootEl('boot-percent', '.boot-percent, [data-boot-percent]');
    if (!lineEl) lineEl = bootEl('boot-line', '.boot-line');

    if (fillEl) {
      fillEl.style.width = (p * 100).toFixed(2) + '%';
      fillEl.style.setProperty('--p', p);      // cho CSS dùng scaleX nếu có
    }
    if (pctEl) pctEl.textContent = Math.round(p * 100) + '%';
    setBootEnergy(p);

    var lineIndex = Math.min(BOOT_LINES.length - 1, Math.floor(p * BOOT_LINES.length));
    if (lineIndex !== lastLineIndex && lineEl) {
      lastLineIndex = lineIndex;
      lineEl.textContent = BOOT_LINES[lineIndex];
      lineEl.classList.remove('line-swap');
      void lineEl.offsetWidth;
      lineEl.classList.add('line-swap');
    }
  }

  function finish() {
    if (bootDone) return;
    bootDone = true;
    cancelAnimationFrame(bootRaf);
    clearInterval(bootTimer);
    clearTimeout(bootWatchdog);
    paint(1);
    try {
      handleBootComplete();
    } catch (e) {
      console.error('[loader] handleBootComplete lỗi:', e);
      revealTerminal();
    }
  }

  function step(ts) {
    lastTick = nowMs();
    var t = Math.min(((typeof ts === 'number' ? ts : lastTick) - start) / duration, 1);
    var p = Math.max(shown, Math.min(ease(t), 1));
    shown = p;
    paint(p);

    if (t < 1) {
      cancelAnimationFrame(bootRaf);
      bootRaf = requestAnimationFrame(step);
    } else {
      finish();
    }
  }

  paint(0);
  bootRaf = requestAnimationFrame(step);

  // Nếu rAF không chạy (tab ẩn, driver lỗi, throttle) thì tự kéo tay
  bootTimer = setInterval(function () {
    if (bootDone) { clearInterval(bootTimer); return; }
    if (nowMs() - lastTick > 400) step();
  }, 200);

  // Chốt chặn cuối: quá hạn 4s vẫn chưa xong thì cho vào luôn
  bootWatchdog = setTimeout(function () {
    if (!bootDone) {
      console.warn('[loader] watchdog kích hoạt — ép hoàn tất boot');
      finish();
    }
  }, duration + 4000);

  window.__skipBoot = finish;
}

/* Cho phép bỏ qua: bấm Esc / Enter / click nút Bỏ qua */
function initBootSkip() {
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Enter') && !bootDone && typeof window.__skipBoot === 'function') {
      window.__skipBoot();
    }
  });

  var host = document.getElementById('stage-boot') || document.getElementById('app');
  if (!host || document.getElementById('boot-skip-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'boot-skip-btn';
  btn.type = 'button';
  btn.textContent = 'Bỏ qua';
  btn.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;padding:8px 16px;' +
    'border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.10);' +
    'backdrop-filter:blur(8px);color:#fff;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.75';
  btn.addEventListener('click', function () {
    if (typeof window.__skipBoot === 'function') window.__skipBoot();
    btn.remove();
  });
  host.appendChild(btn);
}

function replay() {
  try { hapticTap('medium'); } catch (e) {}
  clearTimers();
  hideFlash();
  hideSlider();
  cancelAnimationFrame(bootRaf);
  clearInterval(bootTimer);
  clearTimeout(bootWatchdog);

  var appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.display = 'block';
    appEl.style.opacity = '1';
  }

  stage = 'boot';
  runKey++;
  showStage('boot');
  try { renderName(); } catch (e) {}

  var bootEls = document.getElementById('stage-boot');
  if (bootEls) {
    bootEls.style.animation = 'none';
    void bootEls.offsetWidth;
    bootEls.style.animation = '';
  }
  startBootProgress({ force: true });
}

/* ===== Speed Slider ===== */
function initSlider() {
  var range = document.getElementById('speed-range');
  var readout = document.getElementById('speed-readout');
  if (!range || !readout) return;
  var SPEED_MIN = 0.5, SPEED_MAX = 2;

  function update() {
    var val = parseFloat(range.value);
    particleState.speed = val;
    var fill = ((val - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
    range.style.setProperty('--fill', fill + '%');
    readout.textContent = val.toFixed(2) + 'x';
    if (Math.abs(val - 1) < 0.03) hapticTap('light');
  }

  range.addEventListener('input', update);
  update();
}

/* ===== Init iOS 26 Loading Screen ===== */
(function runIOS26Loading() {
  function safe(label, fn) {
    try { fn(); } catch (e) { console.error('[loader] ' + label + ' lỗi:', e); }
  }

  function init() {
    safe('showStage', function () { showStage('boot'); });

    // Chạy thanh tiến trình TRƯỚC mọi thứ khác.
    // Từ giờ một hàm init nào đó lỗi cũng không làm kẹt 0% nữa.
    safe('startBootProgress', startBootProgress);
    safe('bootSkip', initBootSkip);

    safe('applyAuroraVars', applyAuroraVars);
    safe('unlockAudio', unlockAudio);
    safe('initParallax', initParallax);
    safe('renderName', renderName);
    safe('initParticles', initParticles);
    safe('initVisualizer', initVisualizer);
    safe('initRipples', initRipples);
    safe('initClock', initClock);
    safe('initSlider', initSlider);

    var logoBtn = document.getElementById('logo-btn');
    if (logoBtn) logoBtn.addEventListener('click', function () { hapticTap('light'); });

    var replayBtn = document.getElementById('replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('pointerdown', function () { hapticTap('light'); });
      replayBtn.addEventListener('click', replay);
    }

    var chimeBtn = document.getElementById('chime-btn');
    if (chimeBtn) {
      chimeBtn.addEventListener('click', function () {
        chimePlay();
        hapticTap('heavy');
        var textEl = document.getElementById('chime-btn-text');
        if (textEl) textEl.textContent = 'Play startup chime';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // lưới an toàn cuối cùng nếu DOMContentLoaded bị lỡ
  window.addEventListener('load', function () { if (!bootStarted) init(); });
})();

/* Gõ __bootDebug() trong Console để xem loader đang kẹt ở đâu */
window.__bootDebug = function () {
  console.table({
    bootStarted: bootStarted,
    bootDone: bootDone,
    revealed: bootRevealed,
    'có #progress-fill': !!document.getElementById('progress-fill'),
    'có #boot-percent': !!document.getElementById('boot-percent'),
    'có #boot-line': !!document.getElementById('boot-line'),
    'có #terminal-screen': !!document.getElementById('terminal-screen'),
    'có window.initCmd': typeof window.initCmd
  });
};
/* ============================================================
   END SAKURA LOADING SCREEN
   ============================================================ */

/* ============================================================
   UI SOUND EFFECTS (Web Audio API)
   ============================================================ */
const uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playUISound(type) {
  try {
    if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
    
    const osc = uiAudioCtx.createOscillator();
    const gainNode = uiAudioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(uiAudioCtx.destination);
    
    if (type === 'theme') {
      // Light click/blip for theme change
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, uiAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, uiAudioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, uiAudioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, uiAudioCtx.currentTime + 0.1);
      osc.start(uiAudioCtx.currentTime);
      osc.stop(uiAudioCtx.currentTime + 0.1);
    } else if (type === 'page') {
      // Futuristic swoosh/bloop for page transition
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, uiAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, uiAudioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.12, uiAudioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, uiAudioCtx.currentTime + 0.3);
      osc.start(uiAudioCtx.currentTime);
      osc.stop(uiAudioCtx.currentTime + 0.3);
    }
  } catch(e) {
    console.error("Audio playback failed", e);
  }
}

const DISCORD_USER_ID = '917263515209859102';
const DECORATIONS = [
  'anime-dang-yeu.png',
  'anime-do-mo-hoi.png',
  'anime-gian-du.png',
  'anime-hon-lia-kho-xac.png',
  'anime-mat-long-lanh.png',
  'anime-nani.png',
  'anime-toa-nang-luong.png',
  'fantasy-hoa-kiem.png',
  'fantasy-ma-thuat.png',
  'fantasy-tinh-linh.png',
  'buom-dem.png',
];

const terminalScreen = document.getElementById('terminal-screen');
const profileScreen = document.getElementById('profile-screen');
const enterButton = document.getElementById('enter-console-btn');
const playToggle = document.getElementById('play-toggle');
const player = document.getElementById('music-player');
const audio = document.getElementById('audio-player');
const cmdTabs = document.getElementById('cmd-tabs');
const cmdNewTab = document.getElementById('cmd-new-tab');
const cmdLog = document.getElementById('cmd-log');
const cmdForm = document.getElementById('cmd-form');
const cmdInput = document.getElementById('cmd-input');
const progressBar = document.getElementById('progress-bar');
const volumeControl = document.getElementById('volume-control');
const volumeToggle = document.getElementById('volume-toggle');
const volumeSlider = document.getElementById('volume-slider');
const presenceEls = {
  avatar: document.getElementById('avatar-image'),
  decoration: document.getElementById('avatar-decoration'),
  displayName: document.getElementById('display-name'),
  username: document.getElementById('username'),
  orb: document.getElementById('status-orb'),
  statusText: document.getElementById('status-text'),
  customStatusLine: document.getElementById('custom-status-line'),

  activityCard: document.getElementById('activity-card'),
  activityIcon: document.getElementById('activity-icon'),
  activityName: document.getElementById('activity-name'),
  activityDetail: document.getElementById('activity-detail'),
  activityTime: document.getElementById('activity-time'),
  spotifyStatus: document.getElementById('spotify-status'),
  publicFlags: document.getElementById('public-flags'),
  typingName: document.getElementById('profile-typing-name'),
};

const statusLabels = {
  online: 'Đang online',
  idle: 'Đang rảnh',
  dnd: 'Đừng làm phiền',
  offline: 'Đang offline',
};

const profileTypingWords = ['Chinatsu Kamado', 'Đẹp Trai', 'Hikikomori', 'Chơi Game Hay', 'Fan Anime', 'Minecraft'];

const activityTypes = {
  0: { label: 'Đang chơi', icon: '🎮' },
  1: { label: 'Đang stream', icon: '📡' },
  2: { label: 'Đang nghe', icon: '♪' },
  3: { label: 'Đang xem', icon: '▶' },
  5: { label: 'Đang thi đấu', icon: '⚔' },
};

const discordBadges = [
  { bit: 1 << 0, icon: '🛡️', label: 'Discord Staff' },
  { bit: 1 << 1, icon: '🤝', label: 'Partnered Server Owner' },
  { bit: 1 << 2, icon: '🎤', label: 'HypeSquad Events' },
  { bit: 1 << 3, icon: '🐞', label: 'Bug Hunter Level 1' },
  { bit: 1 << 6, icon: '🦁', label: 'HypeSquad Bravery' },
  { bit: 1 << 7, icon: '💡', label: 'HypeSquad Brilliance' },
  { bit: 1 << 8, icon: '⚖️', label: 'HypeSquad Balance' },
  { bit: 1 << 9, icon: '✨', label: 'Early Supporter' },
  { bit: 1 << 14, icon: '🐞', label: 'Bug Hunter Level 2' },
  { bit: 1 << 16, icon: '🤖', label: 'Verified Bot' },
  { bit: 1 << 17, icon: '👨‍💻', label: 'Early Verified Bot Developer' },
  { bit: 1 << 18, icon: '🛡', label: 'Discord Certified Moderator' },
  { bit: 1 << 22, icon: '🌱', label: 'Active Developer' },
];

const introLines = [
  'C:\\Users\\Chinatsu Kamado> WaiFu',
  'Chinatsu Kamado.dev',
  '',
  'C:\\Users\\Chinatsu Kamado> profile --boot',
  '[OK] Đang tải giao diện cá nhân...',
  '[OK] Đang kết nối trạng thái Discord...',
  '[OK] Đang chuẩn bị trang trí ảnh đại diện...',
  '[OK] Đang chuẩn bị trang trí ảnh đại diện...',
  '',
  'Alias        : Chinatsu Kamado',
  'Style        : Discord-inspired anime profile',
  'Location     : Vietnam',
  'Passion      : Anime, gaming, Minecraft',
  'Current Mode : Quiet but online',
  '',
  'Press Enter to continue.',
];

let activeTabId = 'boot';
let tabCount = 1;
let introTimer;
const cmdTabsState = [
  {
    id: 'boot',
    title: 'cmd',
    log: 'Microsoft Windows [Version 11.0.22631.0000]\n(c) Microsoft Corporation. All rights reserved.\n\n',
    input: '',
    boot: true,
    interactive: false,
    typing: true,
  },
];

function activeCmdTab() {
  return cmdTabsState.find((tab) => tab.id === activeTabId) || cmdTabsState[0];
}

function renderCmdTabs() {
  cmdTabs.innerHTML = cmdTabsState.map((tab) => `
    <button class="cmd-tab ${tab.id === activeTabId ? 'active-tab' : ''}" type="button" data-tab-id="${tab.id}" role="tab" aria-selected="${tab.id === activeTabId}">
      <span class="cmd-tab-title">${tab.title}</span>
      ${cmdTabsState.length > 1 && !tab.boot ? '<span class="cmd-tab-close" data-close-tab>×</span>' : ''}
    </button>
  `).join('');
}

function renderCmdBody() {
  const tab = activeCmdTab();
  cmdLog.textContent = tab.log;
  cmdLog.classList.toggle('typing', Boolean(tab.typing));
  cmdForm.classList.toggle('hidden', !tab.interactive);
  cmdInput.value = tab.input || '';
}

function renderCmd() {
  renderCmdTabs();
  renderCmdBody();
}

function switchCmdTab(tabId) {
  if (activeTabId === tabId) return;
  activeTabId = tabId;
  const cmdBody = document.querySelector('.cmd-body');
  if (cmdBody) {
    cmdBody.classList.remove('tab-switching');
    void cmdBody.offsetWidth;
    cmdBody.classList.add('tab-switching');
  }
  renderCmd();
  if (cmdInput) cmdInput.focus();
}

function typeIntro() {
  const tab = activeCmdTab();
  const prefix = tab.log;
  const text = introLines.join('\n');
  let index = 0;
  introTimer = setInterval(() => {
    tab.log = prefix + text.slice(0, index);
    if (tab.id === activeTabId) renderCmdBody();
    index += 1;
    if (index > text.length) {
      tab.typing = false;
      clearInterval(introTimer);
      if (tab.id === activeTabId) renderCmdBody();
    }
  }, 18);
}

function initCmdWindowControls() {
  const controls = document.querySelectorAll('.cmd-controls span');
  const cmdWindow = document.querySelector('.cmd-window');
  if (!controls || controls.length < 3 || !cmdWindow) return;

  /* Red dot: Do nothing */
  controls[0].removeAttribute('title');
  controls[0].onclick = function (e) {
    if (e) e.preventDefault();
  };

  /* Yellow dot: Do nothing */
  controls[1].removeAttribute('title');
  controls[1].onclick = function (e) {
    if (e) e.preventDefault();
  };

  /* Green dot: Maximize / Restore window */
  controls[2].setAttribute('title', 'Phóng to / Khôi phục cửa sổ CMD');
  controls[2].onclick = function () {
    cmdWindow.classList.toggle('maximized');
  };
}

window.initCmd = function () {
  renderCmd();
  typeIntro();
  initCmdWindowControls();
};

function showScreen(screen) {
  [terminalScreen, profileScreen].forEach((item) => item.classList.remove('active'));
  screen.classList.add('active');
  document.body.classList.toggle('terminal-active', screen === terminalScreen);
  player.classList.toggle('hidden', screen !== profileScreen);
}

function typeTextForTab(tab, text, speed = 14, onDone = () => {}) {
  let index = 0;
  const prefix = tab.log;
  tab.typing = true;
  const timer = setInterval(() => {
    tab.log = prefix + text.slice(0, index);
    if (tab.id === activeTabId) renderCmdBody();
    index += 1;
    if (index > text.length) {
      tab.typing = false;
      clearInterval(timer);
      onDone();
      if (tab.id === activeTabId) renderCmdBody();
    }
  }, speed);
}

enterButton.addEventListener('click', enterConsole);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && terminalScreen.classList.contains('active') && document.activeElement !== cmdInput) enterConsole();
});

function openCmdTab() {
  const existingInteractiveTab = cmdTabsState.find((tab) => tab.interactive || tab.id === 'cmd-input-tab');
  if (existingInteractiveTab) {
    switchCmdTab(existingInteractiveTab.id);
    return;
  }

  tabCount += 1;
  const id = 'cmd-input-tab';
  const staticHeader = [
    'Microsoft Windows [Version 11.0.22631.0000]',
    '(c) Microsoft Corporation. All rights reserved.',
    '',
  ].join('\n');
  const tips = [
    '\nGợi ý: nhập website như youtube.com rồi nhấn Enter để mở tab mới.',
    'Gợi ý: thử nhập các lệnh help, status, ping, dir, profile, clear.',
    '',
  ].join('\n');
  const tab = {
    id,
    title: 'cmd 2',
    log: staticHeader,
    input: '',
    boot: false,
    interactive: false,
    typing: true,
  };
  cmdTabsState.push(tab);
  switchCmdTab(id);
  typeTextForTab(tab, tips, 12, () => {
    tab.interactive = true;
  });
}

function closeCmdTab(tabId) {
  if (cmdTabsState.length === 1) return;
  const index = cmdTabsState.findIndex((tab) => tab.id === tabId);
  if (index === -1 || cmdTabsState[index].boot) return;
  cmdTabsState.splice(index, 1);
  if (activeTabId === tabId) activeTabId = cmdTabsState[Math.max(0, index - 1)].id;
  renderCmd();
}

function normalizeUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
  return '';
}

function fakeCommand(command) {
  const lower = command.toLowerCase();
  if (['help', '?'].includes(lower)) return 'Available: help, clear, profile, status, ping, dir, snake, game, scan, run <anything>, or paste a URL.';
  if (['snake', 'game', 'serpentine', 'arcade'].includes(lower)) {
    if (typeof window.openSnakeGame === 'function') window.openSnakeGame();
    return 'Launching SERPENTINE Arcade Snake Game... [OK] Ready!';
  }
  if (lower === 'profile') return 'Opening Chinatsu Kamado profile interface... done. Press Enter outside this input to continue.';
  if (lower === 'status') return 'Discord presence daemon: ONLINE\nAnime energy: 98%\nCute cursor: armed.';
  if (lower === 'ping') return 'Pinging moonlight.anime [127.0.0.1]... Reply: time=7ms TTL=uwu';
  if (lower === 'dir') return ' Directory of C:\\Users\\Chinatsu Kamado\n\n<DIR> anime\n<DIR> lofi\n<DIR> minecraft\n<DIR> secrets\nprofile.exe\nsnake.exe';
  if (lower.startsWith('run ') || lower.startsWith('npm ') || lower.startsWith('python ') || lower.startsWith('git ')) {
    return `Executing "${command}"...\n[OK] Pretending very professionally. No errors found.`;
  }
  return `"${command}" is not recognized... but it looks cool, so I will allow it. ✦`;
}

cmdTabs.addEventListener('click', (event) => {
  const tabButton = event.target.closest('.cmd-tab');
  if (!tabButton) return;
  const tabId = tabButton.dataset.tabId;
  if (event.target.closest('[data-close-tab]')) closeCmdTab(tabId);
  else switchCmdTab(tabId);
});
cmdNewTab.addEventListener('click', openCmdTab);
cmdInput.addEventListener('input', () => {
  activeCmdTab().input = cmdInput.value;
});
cmdForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const tab = activeCmdTab();
  const command = cmdInput.value.trim();
  if (!command) return;
  if (['cls', 'clear'].includes(command.toLowerCase())) {
    tab.log = '';
    tab.input = '';
    renderCmdBody();
    return;
  }
  tab.log += `${tab.log.endsWith('\n') ? '' : '\n'}C:\\Users\\Chinatsu Kamado> ${command}\n`;
  const url = normalizeUrl(command);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    tab.log += `Opening ${url} in a new tab...\n`;
  } else {
    tab.log += `${fakeCommand(command)}\n`;
  }
  tab.input = '';
  renderCmdBody();
});

function setStatusClass(status) {
  const normalized = ['online', 'idle', 'dnd', 'offline'].includes(status) ? status : 'offline';
  presenceEls.orb.className = `status-orb ${normalized}`;
  const dot = presenceEls.statusText.querySelector('.inline-dot');
  if (dot) dot.className = `inline-dot ${normalized}`;
  return normalized;
}

function getAvatarUrl(user) {
  if (!user?.avatar) return '';
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

function getDiscordDecorationUrls(user) {
  const asset = user?.avatar_decoration_data?.asset;
  if (!asset) return [];
  const normalized = asset.replace(/^avatar-decoration-presets\//, '');
  const ext = normalized.startsWith('a_') ? 'gif' : 'png';
  return [
    `https://cdn.discordapp.com/avatar-decoration-presets/${normalized}.${ext}?size=240&passthrough=true`,
    `https://cdn.discordapp.com/avatar-decoration-presets/${normalized}.png?size=240&passthrough=true`,
  ];
}

function getEmojiText(emoji) {
  if (!emoji) return '';
  if (emoji.id) return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
  return emoji.name || '';
}

function getElapsedText(timestamps) {
  if (!timestamps?.start) return '';
  const elapsed = Math.max(0, Date.now() - timestamps.start);
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours) return `Đã chạy ${hours}h ${minutes % 60}m`;
  return `Đã chạy ${minutes}m`;
}

function findCustomStatus(activities = []) {
  return activities.find((activity) => activity.type === 4);
}

function findPrimaryActivity(activities = []) {
  return activities.find((activity) => activity.type !== 4);
}

function describeActivity(activity, spotify) {
  if (spotify) {
    return {
      visible: true,
      icon: '♪',
      name: `Spotify · ${spotify.song || 'Đang nghe nhạc'}`,
      detail: [spotify.artist, spotify.album].filter(Boolean).join(' · ') || 'Đang phát qua Spotify.',
    };
  }

  if (!activity) return { visible: false, icon: '✦', name: '', detail: '', time: '' };
  const meta = activityTypes[activity.type] || { label: 'Hoạt động', icon: '✦' };
  return {
    visible: true,
    icon: meta.icon,
    name: `${meta.label} ${activity.name || ''}`.trim(),
    detail: [activity.details, activity.state].filter(Boolean).join(' · ') || 'Hoạt động đang chạy.',
    time: getElapsedText(activity.timestamps),
  };
}

function getClientText(data) {
  return [
    data.active_on_discord_desktop && 'Desktop',
    data.active_on_discord_mobile && 'Mobile',
    data.active_on_discord_web && 'Web',
  ].filter(Boolean).join(' · ');
}

function getCustomStatusText(activity) {
  if (!activity) return '';
  return [getEmojiText(activity.emoji), activity.state].filter(Boolean).join(' ').trim();
}

function updateActivityCard(activity) {
  presenceEls.activityCard.classList.toggle('hidden', !activity.visible);
  if (!activity.visible) return;
  presenceEls.activityIcon.textContent = activity.icon;
  presenceEls.activityName.textContent = activity.name;
  presenceEls.activityDetail.textContent = activity.detail;
  presenceEls.activityTime.textContent = activity.time;
}

const staticDiscordBadges = [
  { name: 'Orbs Lính Mới', icon: './data/badges/Orbs-linh-moi.png' },
  { name: 'HypeSquad Quả Cảm', icon: './data/badges/hypesquad-bravery.svg' },
  { name: 'Nhà Phát Triển Tích Cực', icon: './data/badges/active-developer.svg' },
  { name: 'Đăng ký từ 6 thg 12, 2021', icon: './data/badges/nitro-new.svg', nitro: true },
  { name: 'Nitro Boost', icon: './data/badges/boost-6-month.svg', nitro: true },
  { name: 'nakarotad#2413', icon: './data/badges/legacy-username.svg' },
];

function renderDiscordBadges() {
  presenceEls.publicFlags.innerHTML = staticDiscordBadges.map((badge) => `
    <span class="discord-badge ${badge.nitro ? 'nitro' : ''}" data-tooltip="${badge.name}" aria-label="${badge.name}">
      <img src="${badge.icon}" alt="${badge.name}">
    </span>
  `).join('');
}

function updateMetaFields(data) {
  presenceEls.spotifyStatus.textContent = data.listening_to_spotify && data.spotify
    ? `${data.spotify.song || 'Spotify'} · ${data.spotify.artist || 'Unknown'}`
    : 'Chưa phát hiện';
  renderDiscordBadges();
}

function setLocalDecoration() {
  const randomImage = DECORATIONS[Math.floor(Math.random() * DECORATIONS.length)];
  presenceEls.decoration.src = `./data/decoration/${randomImage}`;
  presenceEls.decoration.dataset.source = 'local';
}

function setDiscordDecoration(urls) {
  if (!urls.length) {
    if (presenceEls.decoration.dataset.source !== 'local') setLocalDecoration();
    return;
  }

  let index = 0;
  presenceEls.decoration.dataset.source = 'discord';
  presenceEls.decoration.onerror = () => {
    index += 1;
    if (urls[index]) {
      presenceEls.decoration.src = urls[index];
    } else {
      presenceEls.decoration.onerror = null;
      setLocalDecoration();
    }
  };
  presenceEls.decoration.src = urls[index];
}



function startProfileNameTyping() {
  const target = presenceEls.typingName;
  if (!target) return;

  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const word = profileTypingWords[wordIndex];
    target.textContent = word.slice(0, charIndex);

    if (!deleting && charIndex < word.length) {
      charIndex += 1;
      setTimeout(tick, 100);
      return;
    }

    if (!deleting) {
      deleting = true;
      setTimeout(tick, wordIndex === 0 ? 3000 : 1150);
      return;
    }

    if (charIndex > 0) {
      charIndex -= 1;
      setTimeout(tick, 60);
      return;
    }

    deleting = false;
    wordIndex = (wordIndex + 1) % profileTypingWords.length;
    setTimeout(tick, 260);
  };

  tick();
}

startProfileNameTyping();

let lanyardCache = null;

async function fetchDiscordPresence() {
  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!payload.success) throw new Error('Lanyard returned unsuccessful response');

    const data = payload.data;
    lanyardCache = data;

    const user = data.discord_user;
    const status = setStatusClass(data.discord_status);
    const statusLabel = statusLabels[status] || 'Đang offline';
    const clientText = getClientText(data);
    const customStatusText = getCustomStatusText(findCustomStatus(data.activities));
    const primaryActivity = describeActivity(findPrimaryActivity(data.activities), data.listening_to_spotify ? data.spotify : null);
    const avatarUrl = getAvatarUrl(user);
    const discordDecorationUrls = getDiscordDecorationUrls(user);

    profileTypingWords[0] = 'Chinatsu Kamado';
    presenceEls.username.textContent = 'Chinatsu Kamado';
    presenceEls.username.setAttribute('data-text', 'Chinatsu Kamado');
    presenceEls.customStatusLine.textContent = customStatusText || '...';
    presenceEls.statusText.innerHTML = `<span class="inline-dot ${status}"></span>${statusLabel}${clientText ? ` - ${clientText}` : ''}`;
    if (avatarUrl) presenceEls.avatar.src = avatarUrl;

    setDiscordDecoration(discordDecorationUrls);

    updateActivityCard(primaryActivity);
    updateMetaFields(data, user);

    if (steamPage.page && !steamPage.page.classList.contains('hidden')) {
      applySteamLanyardFallback(data);
    }
  } catch (error) {
    console.warn('Unable to retrieve Discord presence:', error);
    const status = setStatusClass('offline');
    presenceEls.statusText.innerHTML = `<span class="inline-dot ${status}"></span>Chưa thể đồng bộ Discord`;
    presenceEls.customStatusLine.textContent = 'Không rõ';
    presenceEls.spotifyStatus.textContent = 'Không rõ';
    presenceEls.publicFlags.innerHTML = '<span class="discord-badge empty">Không rõ</span>';
  }
}
fetchDiscordPresence();
setInterval(fetchDiscordPresence, 6000);

function rotateDecoration() {
  if (presenceEls.decoration.dataset.source === 'discord') return;
  setLocalDecoration();
}
setInterval(rotateDecoration, 5000);

function enterConsole() {
  if (typeof playUISound === 'function') {
    playUISound('page');
  }
  showScreen(profileScreen);
  startMusic();
}

const trackTitle = document.getElementById('track-title');
const nextTrackButton = document.getElementById('next-track');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

const tracks = [
  { title: 'Nightcore - Rise Up', src: './Audio/Nightcore-Rise-Up.mp3' },
  { title: 'Esoa (Ballad Version)', src: './Audio/Esoa-Ballad-version.mp3' },
  { title: 'My Music', src: './Audio/Music.mp3' }
];
let currentTrackIndex = 0;
let playing = false;

audio.volume = Number(volumeSlider.value) / 100;
playToggle.textContent = '▶';
player.classList.add('paused');

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function renderTrackMeta() {
  const track = tracks[currentTrackIndex];
  trackTitle.textContent = track.title;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationTimeEl.textContent = formatTime(audio.duration);
}

function loadTrack(index) {
  currentTrackIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentTrackIndex];
  audio.src = track.src;
  progressBar.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  durationTimeEl.textContent = '0:00';
  renderTrackMeta();
}

async function playCurrentTrack() {
  await audio.play();
  playing = true;
  playToggle.textContent = '❚❚';
  player.classList.remove('paused');
  renderTrackMeta();
}

async function startMusic() {
  try {
    audio.volume = 0.15;
    volumeSlider.value = 15;
    await playCurrentTrack();
  } catch (error) {
    console.warn('Autoplay blocked:', error);
  }
}

function pauseMusic() {
  audio.pause();
  playing = false;
  playToggle.textContent = '▶';
  player.classList.add('paused');
  renderTrackMeta();
}

playToggle.addEventListener('click', async () => {
  try {
    if (playing) {
      pauseMusic();
    } else {
      await playCurrentTrack();
    }
  } catch (error) {
    console.warn('Audio playback blocked or file missing:', error);
    trackTitle.textContent = 'Không mở được file nhạc';
  }
});

nextTrackButton.addEventListener('click', async () => {
  const shouldResume = playing;
  loadTrack(currentTrackIndex + 1);
  if (!shouldResume) return;
  try {
    await playCurrentTrack();
  } catch (error) {
    console.warn('Unable to switch track:', error);
    trackTitle.textContent = 'Không mở được file nhạc';
  }
});

audio.addEventListener('loadedmetadata', renderTrackMeta);
audio.addEventListener('error', () => {
  trackTitle.textContent = 'Không tìm thấy file nhạc';
});
audio.addEventListener('ended', () => {
  if (currentTrackIndex === 0) {
    audio.currentTime = 0;
  } else {
    loadTrack(0);
  }
  playCurrentTrack().catch((error) => console.warn('Unable to autoplay next track:', error));
});
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  renderTrackMeta();
});

let volumeAutoCloseTimer;

function scheduleVolumeAutoClose() {
  clearTimeout(volumeAutoCloseTimer);
  if (!volumeControl.classList.contains('open')) return;
  volumeAutoCloseTimer = setTimeout(() => {
    volumeControl.classList.remove('open');
  }, 2000);
}

volumeToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  volumeControl.classList.toggle('open');
  if (volumeControl.classList.contains('open')) {
    volumeSlider.focus();
    scheduleVolumeAutoClose();
  } else {
    clearTimeout(volumeAutoCloseTimer);
  }
});

volumeControl.addEventListener('pointermove', scheduleVolumeAutoClose);
volumeControl.addEventListener('pointerdown', scheduleVolumeAutoClose);

volumeSlider.addEventListener('input', () => {
  const volume = Number(volumeSlider.value) / 100;
  audio.volume = volume;
  const icon = volume === 0 ? '🔇' : volume < 0.45 ? '🔉' : '🔊';
  volumeToggle.textContent = icon;
  scheduleVolumeAutoClose();
});

const colorTool = {
  page: document.getElementById('color-page'),
  profile: document.querySelector('.profile-console'),
  open: document.getElementById('mal-link'),
  back: document.getElementById('color-back'),
  text: document.getElementById('tc-input-text'),
  effect: document.getElementById('tc-effect'),
  font: document.getElementById('tc-font'),
  size: document.getElementById('tc-size'),
  c1: document.getElementById('tc-color-1'),
  c2: document.getElementById('tc-color-2'),
  c3: document.getElementById('tc-color-3'),
  bold: document.getElementById('tc-bold'),
  italic: document.getElementById('tc-italic'),
  word: document.getElementById('tc-word'),
  colorLabels: [...document.querySelectorAll('.color-picks label')],
  preview: document.getElementById('tc-preview'),
  output: document.getElementById('tc-output'),
  copy: document.getElementById('tc-copy'),
};

renderTrackMeta();

colorTool.open.addEventListener('click', (e) => { e.preventDefault(); showColorPage(); });
colorTool.back.addEventListener('click', hideColorPage);

colorTool.text.addEventListener('input', buildUnityRichText);
colorTool.effect.addEventListener('change', buildUnityRichText);
colorTool.font.addEventListener('change', buildUnityRichText);
colorTool.size.addEventListener('change', buildUnityRichText);
colorTool.c1.addEventListener('input', buildUnityRichText);
colorTool.c2.addEventListener('input', buildUnityRichText);
colorTool.c3.addEventListener('input', buildUnityRichText);
colorTool.bold.addEventListener('change', buildUnityRichText);
colorTool.italic.addEventListener('change', buildUnityRichText);
colorTool.word.addEventListener('change', buildUnityRichText);

colorTool.copy.addEventListener('click', () => {
  colorTool.output.select();
  navigator.clipboard.writeText(colorTool.output.value).then(() => {
    const original = colorTool.copy.textContent;
    colorTool.copy.textContent = 'Đã copy!';
    setTimeout(() => { colorTool.copy.textContent = original; }, 1500);
  });
});

let activeInnerPage = null;

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function rgbToHex([r, g, b]) {
  return [r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function lerpColor(start, end, step, total) {
  const ratio = total <= 1 ? 0 : step / (total - 1);
  return start.map((value, index) => value + (end[index] - value) * ratio);
}

function colorAt(index, total, effect) {
  const first = hexToRgb(colorTool.c1.value);
  const mid = hexToRgb(colorTool.c2.value);
  const last = hexToRgb(colorTool.c3.value);
  if (effect === 'solid') return rgbToHex(first);
  if (effect === 'rainbow') {
    const hue = Math.round((index / Math.max(1, total)) * 300);
    const tmp = document.createElement('span');
    tmp.style.color = `hsl(${hue}, 100%, 62%)`;
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color.match(/\d+/g).slice(0, 3).map(Number);
    tmp.remove();
    return rgbToHex(rgb);
  }
  if (effect === 'three') {
    const half = Math.max(1, Math.floor((total - 1) / 2));
    return index <= half ? rgbToHex(lerpColor(first, mid, index, half + 1)) : rgbToHex(lerpColor(mid, last, index - half, total - half));
  }
  if (effect === 'mirror') {
    const half = Math.max(1, Math.floor((total - 1) / 2));
    return index <= half ? rgbToHex(lerpColor(first, mid, index, half + 1)) : rgbToHex(lerpColor(mid, first, index - half, total - half));
  }
  return rgbToHex(lerpColor(first, last, index, total));
}

function updateColorPickState() {
  const effect = colorTool.effect.value;
  const enabledMap = {
    two: [true, false, true],
    mirror: [true, true, false],
    three: [true, true, true],
    solid: [true, false, false],
    random: [false, false, false],
    rainbow: [false, false, false],
  };
  const enabled = enabledMap[effect] || [true, true, true];
  colorTool.colorLabels.forEach((label, index) => {
    label.classList.toggle('disabled', !enabled[index]);
    const input = label.querySelector('input');
    if (input) input.disabled = !enabled[index];
  });
  colorTool.word.closest('label')?.classList.toggle('disabled', effect !== 'random');
  colorTool.word.disabled = effect !== 'random';
}

function buildUnityRichText() {
  updateColorPickState();
  const raw = colorTool.text.value || '';
  const effect = colorTool.effect.value;
  const tokens = effect === 'random' && colorTool.word.checked ? raw.split(/(\s+)/) : [...raw];
  const visibleTokens = tokens.filter((token) => token.trim()).length || raw.length || 1;
  let visibleIndex = 0;
  let html = '';
  let rich = '';

  tokens.forEach((token, index) => {
    if (!token.trim()) {
      html += token;
      rich += token;
      return;
    }
    const color = effect === 'random'
      ? rgbToHex([Math.random() * 255, Math.random() * 255, Math.random() * 255])
      : colorAt(visibleIndex, visibleTokens, effect);
    html += `<span style="color:#${color}">${token}</span>`;
    rich += `<color=#${color}>${token}</color>`;
    visibleIndex += 1;
  });

  if (colorTool.font.value) {
    html = `<span style="font-family:${colorTool.font.value}">${html}</span>`;
  }
  if (colorTool.size.value !== '0') {
    html = `<span style="font-size:${colorTool.size.value}px">${html}</span>`;
    rich = `<size=${colorTool.size.value}>${rich}</size>`;
  }
  if (colorTool.italic.checked) {
    html = `<i>${html}</i>`;
    rich = `<i>${rich}</i>`;
  }
  if (colorTool.bold.checked) {
    html = `<b>${html}</b>`;
    rich = `<b>${rich}</b>`;
  }

  colorTool.preview.innerHTML = html || 'Preview sẽ hiện ở đây';
  colorTool.output.value = rich;
}

function showInnerPage(page, afterShow, wide = false) {
  if (!page) return;
  resetCardPointer();
  activeInnerPage?.classList.add('hidden');
  activeInnerPage?.classList.remove('leaving');
  activeInnerPage = page;
  page.style.setProperty('--tilt-x', '0deg');
  page.style.setProperty('--tilt-y', '0deg');
  document.body.classList.add('color-page-active');
  if (wide) document.body.classList.add('wide-page-active');
  else document.body.classList.remove('wide-page-active');
  colorTool.profile.classList.remove('slide-to-home');
  colorTool.profile.classList.add('slide-to-color', 'page-mode');
  page.classList.remove('hidden', 'leaving');
  player.classList.add('hidden');
  afterShow?.();
  setTimeout(() => {
    colorTool.profile.classList.remove('slide-to-color');
    resetCardPointer();
  }, 440);
}

function hideInnerPage(page) {
  if (!page) return;
  resetCardPointer();
  page.classList.add('leaving');
  colorTool.profile.classList.remove('slide-to-color');
  colorTool.profile.classList.add('slide-to-home');
  setTimeout(() => {
    document.body.classList.remove('color-page-active');
    document.body.classList.remove('wide-page-active');
    colorTool.profile.classList.remove('page-mode', 'slide-to-home');
    page.classList.add('hidden');
    page.classList.remove('leaving');
    if (activeInnerPage === page) activeInnerPage = null;
    player.classList.remove('hidden');
    resetCardPointer();
  }, 300);
}

function showColorPage() {
  showInnerPage(colorTool.page, buildUnityRichText);
}

function hideColorPage() {
  hideInnerPage(colorTool.page);
}

/* ============================================================
   MINECRAFT SERVER PAGE
   ============================================================ */
const minecraftPage = {
  page: document.getElementById('minecraft-page'),
  back: document.getElementById('minecraft-back'),
  open: document.getElementById('page-one-link'),
  ping: document.getElementById('mc-ping'),
  version: document.getElementById('mc-version'),
  online: document.getElementById('mc-online'),
  max: document.getElementById('mc-max'),
  ip: document.getElementById('mc-ip'),
  statusText: document.getElementById('mc-status-text'),
  updated: document.getElementById('mc-updated'),
  joinBtn: document.getElementById('mc-join-btn'),
};

// ⚙️ CẤU HÌNH SERVER — chỉnh sửa tại đây
const MC_CONFIG = {
  ip: 'Sv.Minevui.Net',        // ← ĐÃ SỬA: địa chỉ server mới
  port: 25565,
  discordInvite: 'https://discord.gg/',
  botName: 'Minecraft Skyblock',  // ← ĐÃ SỬA: tên server mới
  botDesc: '🌿 Server Minecraft sinh tồn · Vanilla SMP',
  version: '1.21.x',
};

function formatMcTime() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `Cập nhật ${get('hour')}:${get('minute')}:${get('second')}`;
}

async function fetchMinecraftStatus() {
  if (!minecraftPage.page) return;
  const ip = MC_CONFIG.ip;
  const port = MC_CONFIG.port;
  const apiUrl = `https://api.mcsrvstat.us/3/${ip}${port !== 25565 ? ':' + port : ''}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data.online) {
      // Nếu API trả về online, dùng data thật nhưng ưu tiên cấu hình tĩnh
      if (minecraftPage.ping) minecraftPage.ping.textContent = '20ms';       // ← ĐÃ SỬA: cố định 20ms
      if (minecraftPage.online) minecraftPage.online.textContent = '0 người'; // ← ĐÃ SỬA: cố định 0
      if (minecraftPage.max) minecraftPage.max.textContent = '1000 người';    // ← ĐÃ SỬA: cố định 1000
      if (minecraftPage.version) minecraftPage.version.textContent = data.version || MC_CONFIG.version;
      if (minecraftPage.statusText) {
        minecraftPage.statusText.textContent = '🟢 Online — Đang hoạt động';
        minecraftPage.statusText.style.color = 'var(--green)';
      }
    } else {
      if (minecraftPage.ping) minecraftPage.ping.textContent = '20ms';        // ← ĐÃ SỬA
      if (minecraftPage.online) minecraftPage.online.textContent = '0 người'; // ← ĐÃ SỬA
      if (minecraftPage.max) minecraftPage.max.textContent = '1000 người';    // ← ĐÃ SỬA
      if (minecraftPage.version) minecraftPage.version.textContent = MC_CONFIG.version;
      if (minecraftPage.statusText) {
        minecraftPage.statusText.textContent = '🔴 Offline — Server đang tắt';
        minecraftPage.statusText.style.color = 'var(--red)';
      }
    }
  } catch {
    if (minecraftPage.ping) minecraftPage.ping.textContent = '20ms';          // ← ĐÃ SỬA
    if (minecraftPage.online) minecraftPage.online.textContent = '0 người';   // ← ĐÃ SỬA
    if (minecraftPage.max) minecraftPage.max.textContent = '1000 người';      // ← ĐÃ SỬA
    if (minecraftPage.statusText) {
      minecraftPage.statusText.textContent = '⚠️ Không thể kiểm tra';
      minecraftPage.statusText.style.color = 'var(--yellow)';
    }
  }

  if (minecraftPage.ip) minecraftPage.ip.textContent = ip;
  if (minecraftPage.updated) minecraftPage.updated.textContent = formatMcTime();
  if (minecraftPage.joinBtn) minecraftPage.joinBtn.href = MC_CONFIG.discordInvite;

  // Gán tên bot card từ config
  const botNameEl = document.getElementById('mc-bot-name');
  if (botNameEl) botNameEl.textContent = MC_CONFIG.botName;
  const botDescEl = document.getElementById('mc-bot-desc');
  if (botDescEl) botDescEl.textContent = MC_CONFIG.botDesc;

  // ← Gắn nút copy IP + rainbow text (chỉ gắn 1 lần)
  const ipCard = minecraftPage.ip?.closest('.mc-stat-card');
  if (ipCard && !ipCard.querySelector('.mc-copy-ip-btn')) {
    // Layout: label trên, hàng dưới gồm [IP rainbow + nút copy]
    ipCard.style.display = 'flex';
    ipCard.style.flexDirection = 'column';
    ipCard.style.gap = '6px';

    // Thêm class rainbow cho chữ IP
    if (minecraftPage.ip) {
      minecraftPage.ip.classList.add('mc-ip-rainbow');
    }

    // Hàng dưới chứa IP + nút copy
    const bottomRow = document.createElement('div');
    bottomRow.className = 'mc-ip-bottom-row';

    // Di chuyển phần tử IP vào bottomRow
    if (minecraftPage.ip) {
      bottomRow.appendChild(minecraftPage.ip);
    }

    // Nút copy
    const copyBtn = document.createElement('button');
    copyBtn.className = 'mc-copy-ip-btn';
    copyBtn.title = 'Copy địa chỉ server';
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(MC_CONFIG.ip).then(() => {
        copyBtn.innerHTML = `✓`;
        copyBtn.style.color = 'var(--green)';
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
          copyBtn.style.color = '';
        }, 1500);
      });
    });

    bottomRow.appendChild(copyBtn);
    ipCard.appendChild(bottomRow);
  }
}

function showMinecraftPage() {
  showInnerPage(minecraftPage.page, () => {
    fetchMinecraftStatus();
  }, false);
}

function hideMinecraftPage() {
  hideInnerPage(minecraftPage.page);
}

if (minecraftPage.open) {
  minecraftPage.open.addEventListener('click', (e) => { e.preventDefault(); showMinecraftPage(); });
}
if (minecraftPage.back) {
  minecraftPage.back.addEventListener('click', hideMinecraftPage);
}

setInterval(() => {
  if (minecraftPage.page && !minecraftPage.page.classList.contains('hidden')) {
    fetchMinecraftStatus();
  }
}, 30000);

/* ============================================================
   STEAM PROFILE PAGE — Real Steam API via Cloudflare Worker
   ============================================================ */
const STEAM_WORKER_URL = 'https://steam-proxy.bbtu223344.workers.dev/';

const steamPage = {
  page:        document.getElementById('steam-page'),
  back:        document.getElementById('steam-back'),
  open:        document.getElementById('page-two-link'),
  avatar:      document.getElementById('steam-avatar'),
  statusDot:   document.getElementById('steam-status-dot'),
  statusLabel: document.getElementById('steam-status-label'),
  displayName: document.getElementById('steam-display-name'),
  realName:    document.getElementById('steam-real-name'),
  hours:       document.getElementById('steam-hours'),
  games:       document.getElementById('steam-games'),
  level:       document.getElementById('steam-level'),
  friends:     document.getElementById('steam-friends'),
  playing:     document.getElementById('steam-playing'),
  updated:     document.getElementById('steam-updated'),
  gameThumb:   document.getElementById('steam-game-thumb'),
};

const STEAM_STATIC = {
  realName: '🎮 Chinatsu Kamado',
  level:    '--',
  friends:  '-- người',
};

function formatSteamTime() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `Cập nhật ${get('hour')}:${get('minute')}:${get('second')}`;
}

async function fetchSteamData() {
  const res  = await fetch(STEAM_WORKER_URL, { cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function applySteamData(data) {
  if (steamPage.avatar && data.avatar)
    steamPage.avatar.src = data.avatar;

  if (steamPage.displayName)
    steamPage.displayName.textContent = data.displayName || 'nakarotad';

  if (steamPage.realName)  steamPage.realName.textContent  = STEAM_STATIC.realName;

  if (steamPage.level)
    steamPage.level.textContent = (data.level ?? null) !== null ? `${data.level}` : STEAM_STATIC.level;

  if (steamPage.friends)
    steamPage.friends.textContent = (data.friendsCount ?? null) !== null ? `${data.friendsCount} người` : STEAM_STATIC.friends;

  if (steamPage.games)
    steamPage.games.textContent = `${data.totalGames} game`;
  if (steamPage.hours)
    steamPage.hours.textContent = `${data.totalHours.toLocaleString()} giờ`;

  const isIngame = Boolean(data.currentGame);
  const isOnline = data.statusCode > 0;
  let dotClass   = 'offline';
  let statusText = 'Offline';
  if (isIngame)      { dotClass = 'ingame'; statusText = 'In-Game'; }
  else if (isOnline) { dotClass = 'online'; statusText = data.status || 'Online'; }

  if (steamPage.statusDot)   steamPage.statusDot.className    = `steam-status-dot ${dotClass}`;
  if (steamPage.statusLabel) steamPage.statusLabel.textContent = statusText;

  if (steamPage.playing) {
    if (isIngame) {
      steamPage.playing.innerHTML =
        `🎮 <strong style="color:#fff">${data.currentGame}</strong>`;
    } else {
      steamPage.playing.textContent = 'Không có game đang chạy';
    }
  }

  if (steamPage.gameThumb) {
    if (isIngame && data.currentGameThumb) {
      steamPage.gameThumb.src = data.currentGameThumb;
      steamPage.gameThumb.style.display = 'block';
    } else {
      steamPage.gameThumb.style.display = 'none';
    }
  }

  if (data.topGames?.length) {
    data.topGames.forEach((game, i) => {
      const card = document.getElementById(`steam-game-${i + 1}`);
      if (!card) return;
      const title = card.querySelector('.mc-feature-title');
      const desc  = card.querySelector('.mc-feature-desc');
      if (title) title.textContent = game.name;
      if (desc)  desc.textContent  = `${game.hours.toLocaleString()} giờ chơi`;
    });
  }

  if (steamPage.updated) steamPage.updated.textContent = formatSteamTime();
}

function applySteamLanyardFallback(data) {
  if (!steamPage.page) return;
  const activities = data.activities || [];
  const steamActivity = activities.find(a =>
    a.type === 0 && a.id !== 'spotify:1' && a.application_id
  );
  if (!steamActivity) return;

  const gameName   = steamActivity.name || 'Unknown Game';
  const gameDetail = steamActivity.details || '';
  const gameState  = steamActivity.state   || '';
  const elapsed    = getElapsedText(steamActivity.timestamps);

  if (steamPage.statusDot)   steamPage.statusDot.className    = 'steam-status-dot ingame';
  if (steamPage.statusLabel) steamPage.statusLabel.textContent = 'In-Game';

  if (steamPage.playing) {
    steamPage.playing.innerHTML =
      `🎮 <strong style="color:#fff">${gameName}</strong>` +
      (gameDetail ? `<br><span style="font-size:11px;color:var(--muted)">${gameDetail}${gameState ? ' · ' + gameState : ''}</span>` : '') +
      (elapsed    ? `<br><span style="font-size:11px;color:var(--cyan)">${elapsed}</span>` : '');
  }

  if (steamActivity?.assets?.large_image && steamPage.gameThumb) {
    const appId = steamActivity.application_id;
    steamPage.gameThumb.src = `https://cdn.discordapp.com/app-assets/${appId}/${steamActivity.assets.large_image}.png`;
    steamPage.gameThumb.style.display = 'block';
  }

  if (steamPage.updated) steamPage.updated.textContent = formatSteamTime();
}

async function initSteamPage() {
  if (!steamPage.page) return;

  if (steamPage.statusLabel) steamPage.statusLabel.textContent = 'Đang tải...';
  if (steamPage.playing)     steamPage.playing.textContent     = 'Đang kết nối Steam...';
  if (steamPage.realName)    steamPage.realName.textContent    = STEAM_STATIC.realName;
  if (steamPage.level)       steamPage.level.textContent       = STEAM_STATIC.level;
  if (steamPage.friends)     steamPage.friends.textContent     = STEAM_STATIC.friends;

  try {
    const data = await fetchSteamData();
    applySteamData(data);

    if (lanyardCache) applySteamLanyardFallback(lanyardCache);
  } catch (err) {
    console.warn('Steam Worker fetch error:', err);

    if (steamPage.statusLabel) steamPage.statusLabel.textContent = 'Lỗi kết nối Steam API';
    if (steamPage.playing)     steamPage.playing.textContent     = 'Đang dùng dữ liệu Discord...';
    if (steamPage.updated)     steamPage.updated.textContent     = formatSteamTime();

    if (lanyardCache) applySteamLanyardFallback(lanyardCache);
  }
}

function showSteamPage() {
  showInnerPage(steamPage.page, () => { initSteamPage(); }, true);
}

function hideSteamPage() {
  hideInnerPage(steamPage.page);
}

if (steamPage.open) {
  steamPage.open.addEventListener('click', (e) => { e.preventDefault(); showSteamPage(); });
}
if (steamPage.back) {
  steamPage.back.addEventListener('click', hideSteamPage);
}

setInterval(() => {
  if (steamPage.page && !steamPage.page.classList.contains('hidden')) {
    fetchSteamData().then(data => {
      applySteamData(data);
      if (lanyardCache) applySteamLanyardFallback(lanyardCache);
    }).catch(() => {
      if (lanyardCache) applySteamLanyardFallback(lanyardCache);
    });
  }
}, 30000);

/* ============================================================
   END STEAM PROFILE PAGE
   ============================================================ */

function setText(element, value) {
  if (element) element.textContent = value;
}

const interactiveCard = document.querySelector('.profile-console');
const pointerGlow = document.getElementById('pointer-glow');
let activeTiltTarget = null;
let rippleCooldown = 0;
let pageRippleCooldown = 0;

const CARD_RIPPLE_INTERVAL = 920;
const PAGE_RIPPLE_INTERVAL = 1250;

function updateGlobalPointer(event) {
  if (window.__LOW_PERF) return;
  document.body.style.setProperty('--pointer-x', `${event.clientX}px`);
  document.body.style.setProperty('--pointer-y', `${event.clientY}px`);
  document.body.classList.add('pointer-active');
}

function spawnPageRipple(event) {
  if (window.__LOW_PERF) return;
  if (document.body.classList.contains('terminal-active')) return;
  const now = Date.now();
  if (event.type === 'pointermove' && now - pageRippleCooldown < PAGE_RIPPLE_INTERVAL) return;
  pageRippleCooldown = now;
  const ripple = document.createElement('span');
  ripple.className = 'page-ripple';
  ripple.style.setProperty('--ripple-x', `${event.clientX}px`);
  ripple.style.setProperty('--ripple-y', `${event.clientY}px`);
  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function getTiltTarget() {
  if (!interactiveCard) return null;
  if (activeInnerPage && !activeInnerPage.classList.contains('hidden')) return activeInnerPage;
  return interactiveCard;
}

function updateCardPointer(event) {
  const target = getTiltTarget();
  if (!target) return;
  activeTiltTarget = target;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const px = Math.max(0, Math.min(1, x / rect.width));
  const py = Math.max(0, Math.min(1, y / rect.height));
  
  // 3D Tilt calculation (max 14 degrees for sleek glass 3D depth)
  const tiltY = (px - 0.5) * 14;
  const tiltX = (0.5 - py) * 14;
  
  // Specular glare spotlight position
  const glareX = Math.round(px * 100);
  const glareY = Math.round(py * 100);
  
  target.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
  target.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
  target.style.setProperty('--card-scale', '1.015');
  target.style.setProperty('--glare-x', `${glareX}%`);
  target.style.setProperty('--glare-y', `${glareY}%`);
  target.style.setProperty('--glare-opacity', '0.75');
  target.classList.add('interactive-hover');
}

function resetCardPointer() {
  const target = activeTiltTarget || interactiveCard;
  if (!target) return;
  target.classList.remove('interactive-hover');
  target.style.setProperty('--tilt-x', '0deg');
  target.style.setProperty('--tilt-y', '0deg');
  target.style.setProperty('--card-scale', '1');
  target.style.setProperty('--glare-opacity', '0');
  activeTiltTarget = null;
}

// Mobile Gyroscope 3D Tilt
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (e) => {
    if (!interactiveCard) return;
    if (e.gamma === null || e.beta === null) return;
    const gamma = Math.max(-35, Math.min(35, e.gamma));
    const beta = Math.max(15, Math.min(75, e.beta)) - 45;
    const tiltY = (gamma / 35) * 12;
    const tiltX = -(beta / 30) * 12;
    const px = (gamma + 35) / 70;
    const py = (beta + 30) / 60;
    
    interactiveCard.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    interactiveCard.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    interactiveCard.style.setProperty('--card-scale', '1.01');
    interactiveCard.style.setProperty('--glare-x', `${Math.round(px * 100)}%`);
    interactiveCard.style.setProperty('--glare-y', `${Math.round(py * 100)}%`);
    interactiveCard.style.setProperty('--glare-opacity', '0.65');
    interactiveCard.classList.add('interactive-hover');
  });
}

function spawnCardRipple(event) {
  const target = getTiltTarget();
  if (!target) return;
  const now = Date.now();
  if (event.type === 'pointermove' && now - rippleCooldown < CARD_RIPPLE_INTERVAL) return;
  rippleCooldown = now;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'hover-ripple';
  ripple.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
  ripple.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
  target.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

if (pointerGlow) {
  document.addEventListener('pointermove', (event) => {
    updateGlobalPointer(event);
    spawnPageRipple(event);
  });
  document.addEventListener('pointerdown', (event) => {
    updateGlobalPointer(event);
    spawnPageRipple(event);
  });
  document.addEventListener('pointerleave', () => document.body.classList.remove('pointer-active'));
}

if (interactiveCard) {
  interactiveCard.addEventListener('pointermove', updateCardPointer);
  interactiveCard.addEventListener('pointerleave', resetCardPointer);
  interactiveCard.addEventListener('pointerdown', (event) => {
    updateCardPointer(event);
    spawnCardRipple(event);
  });

  document.addEventListener('pointermove', (event) => {
    const target = getTiltTarget();
    if (!target) return;
    if (target.contains(event.target)) {
      updateCardPointer(event);
      spawnCardRipple(event);
    } else if (activeTiltTarget) {
      resetCardPointer();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    const target = getTiltTarget();
    if (!target || !target.contains(event.target)) return;
    spawnCardRipple(event);
  });
}

/* ============================================================
   CSS NÚT COPY IP + RAINBOW IP — inject vào <style> khi trang load
   ============================================================ */
(function injectCopyBtnStyle() {
  const style = document.createElement('style');
  style.textContent = `
    /* Hàng dưới trong ô địa chỉ: IP bên trái, nút copy bên phải */
    .mc-ip-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
    }

    /* Rainbow animation cho chữ IP */
    .mc-ip-rainbow {
      background: linear-gradient(
        90deg,
        #ff4fd8, #ff6b6b, #ffd93d,
        #6bcb77, #35e8ff, #5865f2,
        #ff4fd8
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent !important;
      animation: rainbowShift 3s linear infinite;
      font-weight: 800 !important;
      letter-spacing: .04em;
    }
    @keyframes rainbowShift {
      0%   { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    /* Nút copy */
    .mc-copy-ip-btn {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid rgba(53,232,255,.28);
      border-radius: 8px;
      background: rgba(53,232,255,.09);
      color: var(--cyan);
      cursor: pointer;
      transition: .2s ease;
      font-size: 13px;
      font-weight: 700;
    }
    .mc-copy-ip-btn:hover {
      background: rgba(53,232,255,.22);
      border-color: rgba(53,232,255,.55);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(53,232,255,.22);
    }
  `;
  document.head.appendChild(style);
})();
    /* ============================================================
       ANIME CLOCK INLINE — thay thế sync-pill
       ============================================================ */
    (function () {
      var VN_DAYS = ['CN','T2','T3','T4','T5','T6','T7'];
      var VN_PHASES = [
        { s:5,  e:11, l:'🌅 Buổi sáng'  },
        { s:11, e:13, l:'☀️ Giờ trưa'   },
        { s:13, e:18, l:'🌤 Buổi chiều'  },
        { s:18, e:22, l:'🌆 Buổi tối'   },
        { s:22, e:24, l:'🌙 Đêm khuya'  },
        { s:0,  e:5,  l:'🌃 Nửa đêm'   },
      ];
      function getVN() {
        return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      }
      function pad(n) { return String(n).padStart(2, '0'); }
      function getPhase(h) {
        for (var i = 0; i < VN_PHASES.length; i++) {
          var p = VN_PHASES[i];
          if (h >= p.s && h < p.e) return p.l;
        }
        return '🌙 GMT+7';
      }
      function tickClock() {
        var d = getVN();
        var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
        var hEl    = document.getElementById('ci-h');
        var mEl    = document.getElementById('ci-m');
        var sEl    = document.getElementById('ci-s');
        var dateEl = document.getElementById('ci-date');
        var phEl   = document.getElementById('ci-phase');
        if (!hEl) return;
        hEl.textContent    = pad(h);
        mEl.textContent    = pad(m);
        sEl.textContent    = pad(s);
        dateEl.textContent = VN_DAYS[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
        phEl.textContent   = getPhase(h);
      }
      tickClock();
      setInterval(tickClock, 1000);
    })();
    /* ============================================================
       END ANIME CLOCK INLINE
       ============================================================ */

/* ============================================================
   THEME SWITCHER
   ============================================================ */
(function () {
  var THEMES = ['cyber', 'sakura', 'ocean', 'fire'];
  var THEME_ICONS = { cyber: '🌙', sakura: '🌸', ocean: '🌊', fire: '🔥' };
  
  // URL âm thanh nền cho từng theme
  var AMBIENT_SOUNDS = {
    cyber: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_a0f2834b92.mp3?filename=cyberpunk-street-114300.mp3', // Tiếng đường phố sci-fi
    sakura: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_1f298711de.mp3?filename=nature-sounds-birds-singing-106560.mp3', // Tiếng chim hót
    ocean: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_27ed90023a.mp3?filename=ocean-waves-112906.mp3', // Tiếng sóng biển
    fire: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_3d1a3f69fc.mp3?filename=crackling-fire-14498.mp3' // Tiếng lửa lách tách
  };

  var STORAGE_KEY = 'profile-theme';

  var toggleBtn = document.getElementById('theme-toggle');
  var menu = document.getElementById('theme-menu');
  var options = document.querySelectorAll('.theme-option');

  // Khởi tạo Trình phát âm thanh nền
  var ambientPlayer = new Audio();
  ambientPlayer.loop = true;
  ambientPlayer.volume = 0.2; // Volume nhỏ để làm nền

  if (!toggleBtn || !menu) return;

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'cyber';
    document.documentElement.setAttribute('data-theme', theme);
    toggleBtn.textContent = THEME_ICONS[theme] || '🌙';
    options.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}

    // Xử lý đổi âm thanh nền
    if (AMBIENT_SOUNDS[theme]) {
      // Chỉ đổi src nếu theme thực sự khác
      if (ambientPlayer.src !== AMBIENT_SOUNDS[theme]) {
        ambientPlayer.src = AMBIENT_SOUNDS[theme];
      }
      
      // Thử phát nhạc (browser có thể chặn autoplay)
      var playPromise = ambientPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(function(error) {
          // Nếu bị chặn, chờ người dùng click bất kỳ đâu để phát lại
          var resumeAmbient = function() {
            ambientPlayer.play().catch(function(){});
            document.removeEventListener('click', resumeAmbient);
          };
          document.addEventListener('click', resumeAmbient);
        });
      }
    } else {
      ambientPlayer.pause();
    }
  }

  // Load saved theme on page load
  var saved = '';
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  applyTheme(saved || 'cyber');

  // Toggle menu open/close
  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
    var wMenu = document.getElementById('weather-menu');
    if (wMenu) wMenu.classList.add('hidden');
  });

  // Select theme
  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      applyTheme(opt.dataset.theme);
      setTimeout(function () {
        menu.classList.add('hidden');
      }, 150);
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && e.target !== toggleBtn) {
      menu.classList.add('hidden');
    }
  });
})();
/* ============================================================
   END THEME SWITCHER
   ============================================================ */

/* ============================================================
   WEATHER PARTICLES ENGINE (Sakura, Snow, Cyber Rain, Stardust)
   ============================================================ */
(function initWeatherParticles() {
  var canvas = document.getElementById('weather-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var weatherToggle = document.getElementById('weather-toggle');
  var weatherMenu = document.getElementById('weather-menu');
  var weatherOptions = document.querySelectorAll('.weather-option');

  var WEATHER_ICONS = {
    sakura: '🌸',
    snow: '❄️',
    rain: '🌧️',
    stars: '✨',
    off: '🚫'
  };

  var WEATHER_TITLES = {
    sakura: 'Thời tiết nền: Hoa Anh Đào',
    snow: 'Thời tiết nền: Tuyết Rơi',
    rain: 'Thời tiết nền: Mưa Cyber',
    stars: 'Thời tiết nền: Bụi Sao Lấp Lánh',
    off: 'Thời tiết nền: Đang Tắt'
  };

  var STORAGE_KEY = 'profile-weather';
  var currentWeather = 'sakura';
  var particles = [];
  var animId = null;
  var width = 0;
  var height = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }
  window.addEventListener('resize', resize);

  // Particle Generators
  function createSakura() {
    return {
      x: Math.random() * width,
      y: Math.random() * -height - 20,
      size: 9 + Math.random() * 9,
      speedY: 1.2 + Math.random() * 1.8,
      speedX: -0.6 + Math.random() * 1.4,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.035,
      flip: Math.random() * Math.PI,
      flipSpeed: 0.02 + Math.random() * 0.03,
      opacity: 0.6 + Math.random() * 0.35,
      color: ['#ffb7d5', '#ffa0c8', '#ffc5e0', '#ffe4f0'][Math.floor(Math.random() * 4)]
    };
  }

  function createSnow() {
    var depth = 0.3 + Math.random() * 0.7;
    return {
      x: Math.random() * width,
      y: Math.random() * -height,
      radius: (1.5 + Math.random() * 3.5) * depth,
      speedY: (0.8 + Math.random() * 1.8) * depth,
      speedX: (Math.random() - 0.5) * 0.8 * depth,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.02 + Math.random() * 0.02,
      opacity: 0.4 + depth * 0.55
    };
  }

  function createRain() {
    return {
      x: Math.random() * (width + 200),
      y: Math.random() * -height,
      len: 18 + Math.random() * 24,
      speedY: 14 + Math.random() * 10,
      speedX: -3.5 - Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
      color: Math.random() > 0.3 ? '#00f3ff' : '#ff7adf'
    };
  }

  function createStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 3,
      speedY: -0.3 - Math.random() * 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.03 + Math.random() * 0.05,
      opacity: 0.2 + Math.random() * 0.8,
      isSparkle: Math.random() > 0.65,
      color: ['#ffffff', '#a5f3fc', '#fbcfe8', '#fef08a'][Math.floor(Math.random() * 4)]
    };
  }

  function initParticles() {
    particles = [];
    if (currentWeather === 'off') return;

    var count = 36;
    if (currentWeather === 'sakura') count = window.innerWidth < 768 ? 30 : 48;
    else if (currentWeather === 'snow') count = window.innerWidth < 768 ? 50 : 85;
    else if (currentWeather === 'rain') count = window.innerWidth < 768 ? 65 : 110;
    else if (currentWeather === 'stars') count = window.innerWidth < 768 ? 40 : 70;

    for (var i = 0; i < count; i++) {
      if (currentWeather === 'sakura') {
        var p = createSakura();
        p.y = Math.random() * height;
        particles.push(p);
      } else if (currentWeather === 'snow') {
        var p2 = createSnow();
        p2.y = Math.random() * height;
        particles.push(p2);
      } else if (currentWeather === 'rain') {
        var p3 = createRain();
        p3.y = Math.random() * height;
        particles.push(p3);
      } else if (currentWeather === 'stars') {
        particles.push(createStar());
      }
    }
  }

  function drawSakuraPetal(ctx, x, y, size, angle, flip, color, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(Math.cos(flip), 1);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size / 2, -size / 2, -size / 2, size / 3, 0, size);
    ctx.bezierCurveTo(size / 2, size / 3, size / 2, -size / 2, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, size, color, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(0, -size * 2);
    ctx.quadraticCurveTo(0, 0, size * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, size * 2);
    ctx.quadraticCurveTo(0, 0, -size * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size * 2);
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    if (currentWeather === 'off' || window.__LOW_PERF) {
      ctx.clearRect(0, 0, width, height);
      animId = null;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (currentWeather === 'sakura') {
      particles.forEach(function (p) {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.flip) * 0.8;
        p.angle += p.angularSpeed;
        p.flip += p.flipSpeed;

        if (p.y > height + 20 || p.x < -40 || p.x > width + 40) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        drawSakuraPetal(ctx, p.x, p.y, p.size, p.angle, p.flip, p.color, p.opacity);
      });
    } else if (currentWeather === 'snow') {
      particles.forEach(function (p) {
        p.y += p.speedY;
        p.sway += p.swaySpeed;
        p.x += p.speedX + Math.sin(p.sway) * 0.6;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.fill();
        ctx.restore();
      });
    } else if (currentWeather === 'rain') {
      particles.forEach(function (p) {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y > height + p.len) {
          p.y = -p.len;
          p.x = Math.random() * (width + 200);
        }

        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.speedX * 1.5, p.y + p.len);
        ctx.stroke();
        ctx.restore();
      });
    } else if (currentWeather === 'stars') {
      particles.forEach(function (p) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulse += p.pulseSpeed;
        var currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        if (p.isSparkle) {
          drawSparkle(ctx, p.x, p.y, p.size, p.color, currentOpacity);
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = currentOpacity;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.restore();
        }
      });
    }

    animId = requestAnimationFrame(loop);
  }

  function setWeather(mode) {
    if (!WEATHER_ICONS[mode]) mode = 'sakura';
    currentWeather = mode;
    if (weatherToggle) {
      weatherToggle.textContent = WEATHER_ICONS[mode] || '🌸';
      weatherToggle.title = WEATHER_TITLES[mode] || 'Thời tiết nền';
    }
    weatherOptions.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.weather === mode);
    });
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) {}
    
    initParticles();
    if (currentWeather !== 'off' && !animId) {
      animId = requestAnimationFrame(loop);
    }
  }

  // Toggle dropdown
  if (weatherToggle && weatherMenu) {
    weatherToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      weatherMenu.classList.toggle('hidden');
      var themeMenu = document.getElementById('theme-menu');
      if (themeMenu) themeMenu.classList.add('hidden');
    });

    weatherOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        setWeather(opt.dataset.weather);
        setTimeout(function () {
          weatherMenu.classList.add('hidden');
        }, 150);
      });
    });

    document.addEventListener('click', function (e) {
      if (!weatherMenu.contains(e.target) && e.target !== weatherToggle) {
        weatherMenu.classList.add('hidden');
      }
    });
  }

  // Pause loop when tab is hidden for battery efficiency
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      if (currentWeather !== 'off' && !animId) animId = requestAnimationFrame(loop);
    }
  });

  // Init
  resize();
  var savedWeather = 'sakura';
  try { savedWeather = localStorage.getItem(STORAGE_KEY) || 'sakura'; } catch (e) {}
  setWeather(savedWeather);
})();

/* ============================================================
   PARALLAX BANNER — Mouse-driven layer movement
   ============================================================ */
(function () {
  if (window.__LOW_PERF) return;
  var card = document.querySelector('.profile-console');
  var layers = document.querySelectorAll('.plx-layer');
  if (!card || !layers.length) return;

  var MX = 200;   // max horizontal shift (px per depth unit)
  var MY = 120;   // max vertical shift
  var ticking = false;

  function onMove(e) {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 → 0.5
      var py = (e.clientY - rect.top) / rect.height - 0.5;

      for (var i = 0; i < layers.length; i++) {
        var depth = parseFloat(layers[i].dataset.depth) || 0;
        var dx = (px * depth * MX).toFixed(2);
        var dy = (py * depth * MY).toFixed(2);
        layers[i].style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
      }
      ticking = false;
    });
  }

  function onLeave() {
    for (var i = 0; i < layers.length; i++) {
      layers[i].style.transform = 'translate3d(0,0,0)';
    }
  }

  card.addEventListener('pointermove', onMove, { passive: true });
  card.addEventListener('pointerleave', onLeave);
})();
/* ============================================================
   END PARALLAX BANNER
   ============================================================ */

/* ============================================================
   AUDIO VISUALIZER — Real Web Audio API
   Connects to #audio-player, draws frequency bars on canvas
   ============================================================ */
(function () {
  var canvas = document.getElementById('audio-visualizer');
  var audioEl = document.getElementById('audio-player');
  if (!canvas || !audioEl) return;

  var ctx = canvas.getContext('2d');
  var audioCtx = null;
  var analyser = null;
  var source = null;
  var dataArray = null;
  var bufferLength = 0;
  var rafId = null;
  var connected = false;
  var lastBassPush = 0;
  var lastBassValue = -1;

  /* Lazily create AudioContext on first user-triggered play
     (browsers block AudioContext creation before user gesture) */
  function ensureAudioContext() {
    if (connected) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      bufferLength = analyser.frequencyBinCount; // 128
      dataArray = new Uint8Array(bufferLength);

      source = audioCtx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      connected = true;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  /* Resize canvas to match CSS size (retina-aware) */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* Read CSS variable --cyan color or fallback */
  function getColors() {
    var style = getComputedStyle(document.documentElement);
    var cyan = style.getPropertyValue('--cyan').trim() || '#35e8ff';
    var pink = style.getPropertyValue('--pink').trim() || '#ff4fd8';
    return { cyan: cyan, pink: pink };
  }

  /* Main draw loop */
  function draw() {
    if (!analyser) return;
    rafId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    var silent = canvas.classList.contains('viz-silent');
    var W = 0, H = 0;
    if (!silent) {
      var rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      ctx.clearRect(0, 0, W, H);
    }

    // --- GLOBAL AUDIO REACTIVITY ---
    // Trung bình dải trầm (8 bin đầu). Ghi biến CSS vào body làm cả trang
    // phải tính lại style, nên chỉ cập nhật ~20 lần/giây và làm tròn 2 số
    // — mắt không phân biệt được, nhưng nhẹ hơn hẳn so với 60 lần/giây.
    var nowMs = performance.now();
    if (nowMs - lastBassPush > 50) {
      lastBassPush = nowMs;
      var bassSum = 0;
      for (var j = 0; j < 8; j++) bassSum += dataArray[j];
      var bass = Math.round((bassSum / 8 / 255) * 100) / 100;
      if (bass !== lastBassValue) {
        lastBassValue = bass;
        document.body.style.setProperty('--audio-bass', bass);
      }
    }
    // --------------------------------

    /* Sóng nhạc đã tắt: chỉ đo bass để vòng avatar đập theo nhạc,
       bỏ toàn bộ phần vẽ (đây là thứ tốn GPU nhất khi phát nhạc). */
    if (silent) return;

    var colors = getColors();

    /* Only draw the useful lower-mid frequencies (first 64 bins) */
    var useBins = Math.min(64, bufferLength);
    var barWidth = W / useBins;
    var centerY = H;

    for (var i = 0; i < useBins; i++) {
      var value = dataArray[i];
      var percent = value / 255;
      var barHeight = percent * H * 0.92;

      /* Gradient per bar: cyan at base → pink at top */
      var grad = ctx.createLinearGradient(0, centerY, 0, centerY - barHeight);
      grad.addColorStop(0, colors.cyan);
      grad.addColorStop(0.6, colors.pink);
      grad.addColorStop(1, 'rgba(255,255,255,0.9)');

      var x = i * barWidth;

      /* Glow effect */
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 8 + percent * 12;

      /* Main bar (rounded top) */
      ctx.fillStyle = grad;
      ctx.beginPath();
      var r = Math.min(barWidth * 0.3, 3);
      var bx = x + 1;
      var bw = barWidth - 2;
      var by = centerY - barHeight;
      if (bw > 0 && barHeight > 0) {
        ctx.moveTo(bx, centerY);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, centerY);
        ctx.fill();
      }

      /* Mirror reflection (faded, below) — subtle ghost */
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = colors.cyan;
      var mirrorH = barHeight * 0.3;
      ctx.fillRect(bx, centerY, bw, mirrorH);
      ctx.globalAlpha = 1;
    }
  }

  /* Start / stop visualizer based on audio state */
  function startVisualizer() {
    ensureAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    resize();
    canvas.classList.add('active');
    if (!rafId) draw();
  }

  function stopVisualizer() {
    canvas.classList.remove('active');
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* Hook into existing audio events */
  audioEl.addEventListener('play', startVisualizer);
  audioEl.addEventListener('pause', stopVisualizer);
  audioEl.addEventListener('ended', stopVisualizer);

  /* Resize on window resize */
  window.addEventListener('resize', function () {
    if (canvas.classList.contains('active')) resize();
  });

  /* If audio is already playing when this script runs */
  if (!audioEl.paused) startVisualizer();
})();
/* ============================================================
   END AUDIO VISUALIZER
   ============================================================ */

/* ============================================================
   INTERACTIVE COMPANION & MAGNETIC BUTTONS
   ============================================================ */
(function initPremiumUI() {
  /* 1. Interactive Companion Eye Tracking & Cat */
  const companion = document.getElementById('companion');
  const cat = document.querySelector('.css-cat');
  let catSleepTimer = null;

  if (companion) {
    const eyes = companion.querySelectorAll('.comp-eye');
    const catEyes = cat ? cat.querySelectorAll('.cat-eye') : [];
    
    document.addEventListener('mousemove', (e) => {
      const gameContainer = document.getElementById('runner-game-container');
      if (gameContainer && gameContainer.classList.contains('active')) return;

      // Chibi Eye Tracking
      const rect = companion.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 300; // max distance before eyes stop moving further
      const factor = Math.min(dist / maxDist, 1);
      
      // Eyes move max 4px
      const ex = dist > 0 ? (dx / dist) * factor * 4 : 0;
      const ey = dist > 0 ? (dy / dist) * factor * 4 : 0;
      
      eyes.forEach(eye => {
        eye.style.setProperty('--eye-x', `${ex}px`);
        eye.style.setProperty('--eye-y', `${ey}px`);
      });

      // Cat Eye Tracking
      if (cat && cat.classList.contains('awake')) {
        const cRect = cat.getBoundingClientRect();
        const ccx = cRect.left + cRect.width / 2;
        const ccy = cRect.top + cRect.height / 2;
        const cdx = e.clientX - ccx;
        const cdy = e.clientY - ccy;
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
        const cFactor = Math.min(cDist / 200, 1);
        const cex = cDist > 0 ? (cdx / cDist) * cFactor * 3 : 0;
        const cey = cDist > 0 ? (cdy / cDist) * cFactor * 3 : 0;
        
        catEyes.forEach(eye => {
          eye.style.setProperty('--cat-eye-x', `${cex}px`);
          eye.style.setProperty('--cat-eye-y', `${cey}px`);
        });
        
        if (cDist < 100) resetCatSleepTimer();
      }
    });

    if (cat) {
      cat.addEventListener('click', wakeUpCat);
    }
    
    const meowAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/86/86-preview.mp3');
    meowAudio.volume = 0.4;

    function wakeUpCat(e) {
      cat.classList.add('awake');
      resetCatSleepTimer();
      
      meowAudio.cloneNode().play().catch(e => console.log("Audio not allowed yet"));
      
      const heart = document.createElement('div');
      heart.textContent = '❤️';
      heart.style.position = 'fixed';
      heart.style.left = (e.clientX || cat.getBoundingClientRect().left + 15) + 'px';
      heart.style.top = (e.clientY || cat.getBoundingClientRect().top) + 'px';
      heart.style.fontSize = '20px';
      heart.style.pointerEvents = 'none';
      heart.style.zIndex = '9999';
      heart.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
      heart.style.transform = 'translate(-50%, -50%) scale(0.5)';
      heart.style.opacity = '1';
      document.body.appendChild(heart);
      
      requestAnimationFrame(() => {
        heart.style.transform = `translate(-50%, calc(-50% - 80px)) scale(1.5) rotate(${Math.random() * 40 - 20}deg)`;
        heart.style.opacity = '0';
      });
      
      setTimeout(() => heart.remove(), 1200);
    }
    
    function resetCatSleepTimer() {
      clearTimeout(catSleepTimer);
      catSleepTimer = setTimeout(() => {
        cat.classList.remove('awake');
      }, 5000); // Sleep after 5 seconds of no interaction
    }

    companion.addEventListener('click', () => {
      eyes.forEach(eye => {
        eye.style.background = 'var(--pink)';
        eye.style.boxShadow = '0 0 14px var(--pink)';
        setTimeout(() => {
          eye.style.background = 'var(--cyan)';
          eye.style.boxShadow = '0 0 8px var(--cyan)';
        }, 600);
      });
      showChat();
    });

    companion.addEventListener('dblclick', () => {
      const chibiParent = document.querySelector('.css-chibi');
      if (chibiParent && !chibiParent.classList.contains('backflip')) {
        chibiParent.classList.add('backflip');
        // Animation takes 1.8s
        setTimeout(() => {
          chibiParent.classList.remove('backflip');
        }, 1800);
      }
    });

    const chatBubble = document.getElementById('comp-chat');
    const quotes = [
      "Bấm vào mình đi!",
      "Hôm nay bạn thế nào?",
      "Chúc một ngày tốt lành! ✨",
      "Cố gắng lên nhé!",
      "Mình đang nhìn bạn đó 👀"
    ];
    let hideTimer = null;

    let typingTimer = null;

    function showChat() {
      if (!chatBubble) return;
      clearTimeout(hideTimer);
      clearTimeout(typingTimer);
      
      // Show "Typing..." animation
      chatBubble.innerHTML = '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
      chatBubble.classList.add('show');
      
      // After 1.5s, show actual quote
      typingTimer = setTimeout(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        chatBubble.textContent = randomQuote;
        
        // Hide after 3.5s
        hideTimer = setTimeout(() => {
          chatBubble.classList.remove('show');
        }, 3500);
      }, 1500);
    }

    setInterval(() => {
      showChat();
    }, 12000); // 12 seconds
    
    // --- Hat Swapping Logic ---
    const chibiParent = document.querySelector('.css-chibi');
    const chibiHat = document.querySelector('.chibi-hat');
    const hatTypes = ['hat-cap', 'hat-crown', 'hat-wizard', 'hat-catears', 'hat-visor'];
    let currentHatIndex = -1;

    if (chibiParent && chibiHat) {
      setInterval(() => {
        // Trigger arm animation
        chibiParent.classList.add('chibi-changing-hat');
        
        // Wait exactly 0.5s (when hand covers the head)
        setTimeout(() => {
          // Remove old hat class
          if (currentHatIndex >= 0) {
            chibiHat.classList.remove(hatTypes[currentHatIndex]);
          }
          
          // Pick a random new hat (different from current)
          let newHatIndex;
          do {
            newHatIndex = Math.floor(Math.random() * hatTypes.length);
          } while (newHatIndex === currentHatIndex && hatTypes.length > 1);
          
          currentHatIndex = newHatIndex;
          chibiHat.classList.add(hatTypes[currentHatIndex]);
        }, 500); // 500ms syncs with CSS 50% keyframe
        
        // Remove animation class after it finishes (1s)
        setTimeout(() => {
          chibiParent.classList.remove('chibi-changing-hat');
        }, 1000);
      }, 7000); // Change hat every 7 seconds
      
      // --- Petting Cat Logic ---
      setInterval(() => {
        // Prevent petting while changing hat or typing to avoid weird overlapping arms
        if (!chibiParent.classList.contains('chibi-changing-hat')) {
          chibiParent.classList.add('chibi-petting');
          
          setTimeout(() => {
            chibiParent.classList.remove('chibi-petting');
          }, 2000); // Animation takes 2s
        }
      }, 6000); // Pet cat every 6 seconds
    }
  }

  /* 2. Magnetic Buttons */
  document.querySelectorAll('.mini-btn, .copy-btn, .social-row a, .profile-footer a').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      // Set a quick linear transition for the magnetic pull
      btn.style.transition = 'transform 0.05s linear';
    });
    
    btn.addEventListener('mousemove', (e) => {
      const gameContainer = document.getElementById('runner-game-container');
      if (gameContainer && gameContainer.classList.contains('active')) return;

      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      
      // Pull strength (0.3 = 30% of the distance from center)
      const moveX = dx * 0.35;
      const moveY = dy * 0.35;
      
      btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      // Remove inline transition to let CSS handle the snap back
      btn.style.transition = '';
      btn.style.transform = '';
    });
  });
})();

/* ============================================================
   HOLOGRAPHIC 3D TILT CARDS
   ============================================================ */
(function initTiltCards() {
  if (window.__LOW_PERF) return;
  const tiltCards = document.querySelectorAll('.presence-card, .activity-card, .about-card');
  
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (card.classList.contains('game-active')) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation (-15 to 15 degrees for stronger effect)
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;
      
      // Calculate glare percentage
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      
      card.style.setProperty('--rotateX', `${rotateX}deg`);
      card.style.setProperty('--rotateY', `${rotateY}deg`);
      card.style.setProperty('--glare-x', `${glareX}%`);
      card.style.setProperty('--glare-y', `${glareY}%`);
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rotateX', '0deg');
      card.style.setProperty('--rotateY', '0deg');
      card.style.setProperty('--glare-x', '50%');
      card.style.setProperty('--glare-y', '50%');
    });
  });
})();

/* ============================================================
   INTERACTIVE CURSOR TRAILS
   ============================================================ */
(function initCursorTrails() {
  if (window.__LOW_PERF) return;
  return; // Disabled by user request
  let lastTime = 0;
  
  document.addEventListener('mousemove', (e) => {
    // Only show trail when profile screen is active
    if (!document.getElementById('profile-screen').classList.contains('active')) return;
    
    // Disable during minigame to save performance
    const gameContainer = document.getElementById('runner-game-container');
    if (gameContainer && gameContainer.classList.contains('active')) return;
    
    const now = Date.now();
    if (now - lastTime < 40) return; // limit spawn rate (approx 25fps) to save performance
    lastTime = now;
    
    // Get current theme
    const theme = document.body.getAttribute('data-theme') || 'default';
    
    const particle = document.createElement('div');
    particle.className = `cursor-trail-particle theme-${theme}`;
    
    // Set position to mouse
    particle.style.left = `${e.clientX}px`;
    particle.style.top = `${e.clientY}px`;
    
    // Randomize size slightly
    const size = Math.random() * 6 + 4; // 4px to 10px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    document.body.appendChild(particle);
    
    // Clean up after animation finishes (0.8s max)
    setTimeout(() => {
      particle.remove();
    }, 800);
  });
})();

/* ============================================================
   SHATTERED GLASS EASTER EGG
   ============================================================ */
(function initShatteredGlass() {
  if (window.__LOW_PERF) return;
  let avatarClickCount = 0;
  let avatarClickTimer = null;
  const avatarWrap = document.querySelector('.avatar-wrap');
  
  if (!avatarWrap) return;

  avatarWrap.addEventListener('click', (e) => {
    avatarClickCount++;
    clearTimeout(avatarClickTimer);
    
    if (avatarClickCount >= 5) {
      triggerShatterEffect(e.clientX, e.clientY);
      avatarClickCount = 0;
    } else {
      avatarClickTimer = setTimeout(() => {
        avatarClickCount = 0;
      }, 400); // Must click 5 times quickly
    }
  });

  function triggerShatterEffect(x, y) {
    if (document.getElementById('glass-shatter')) return;
    
    document.body.classList.add('shaking');
    const chibi = document.querySelector('.css-chibi');
    if (chibi) chibi.classList.add('chibi-scared');
    
    const canvas = document.createElement('canvas');
    canvas.id = 'glass-shatter';
    canvas.style.cssText = 'position:fixed; inset:0; z-index:9999; pointer-events:none; opacity:1; transition:opacity 0.5s;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Draw cracks
    const numCracks = 15 + Math.floor(Math.random() * 10);
    for(let i=0; i<numCracks; i++) {
      const angle = (Math.PI * 2 / numCracks) * i + (Math.random() * 0.4);
      let cx = x;
      let cy = y;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const length = Math.max(window.innerWidth, window.innerHeight);
      let dist = 0;
      
      while(dist < length) {
        const step = 30 + Math.random() * 60;
        dist += step;
        const angleJitter = angle + (Math.random() - 0.5) * 0.6;
        cx += Math.cos(angleJitter) * step;
        cy += Math.sin(angleJitter) * step;
        ctx.lineTo(cx, cy);
        
        if(Math.random() > 0.6) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const branchAngle = angleJitter + (Math.random() > 0.5 ? 0.6 : -0.6);
          ctx.lineTo(cx + Math.cos(branchAngle) * 120, cy + Math.sin(branchAngle) * 120);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + Math.random()*0.5})`;
          ctx.lineWidth = 1 + Math.random() * 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.random()*0.4})`;
      ctx.lineWidth = 1.5 + Math.random() * 2.5;
      ctx.stroke();
    }
    
    // Center impact
    ctx.beginPath();
    ctx.arc(x, y, 10 + Math.random()*15, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    
    // Auto-heal
    setTimeout(() => {
      canvas.style.opacity = '0';
      document.body.classList.remove('shaking');
      if (chibi) chibi.classList.remove('chibi-scared');
      setTimeout(() => canvas.remove(), 500);
    }, 2000);
  }
})();

/* ============================================================
   CHIBI RUNNER MINIGAME (EASTER EGG)
   ============================================================ */
(function initChibiRunner() {
  const aboutCard = document.querySelector('.about-card');
  if (!aboutCard) return;

  const gameContainer = document.createElement('div');
  gameContainer.id = 'runner-game-container';
  gameContainer.innerHTML = `
    <div class="runner-close" title="Đóng game">✖</div>
    <div class="runner-score">00000</div>
    <div class="runner-ground"></div>
    <div class="runner-chibi-wrap" id="runner-chibi"></div>
    <div class="runner-game-over" id="runner-game-over">
      GAME OVER
      <span>Bấm Phím Cách (Space) để chơi lại</span>
    </div>
  `;
  aboutCard.appendChild(gameContainer);

  const chibiWrap = document.getElementById('runner-chibi');
  const scoreEl = gameContainer.querySelector('.runner-score');
  const gameOverEl = document.getElementById('runner-game-over');
  const closeBtn = gameContainer.querySelector('.runner-close');

  const originalChibi = document.querySelector('.css-chibi');
  if (originalChibi) {
    const clone = originalChibi.cloneNode(true);
    const chat = clone.querySelector('.comp-chat');
    if (chat) chat.remove();
    clone.style.position = 'relative';
    clone.style.bottom = '0';
    clone.style.right = 'auto';
    clone.style.left = '0';
    clone.style.zIndex = '1';
    clone.style.transform = 'scale(0.6)';
    clone.style.transformOrigin = 'bottom left';
    chibiWrap.appendChild(clone);
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  
  function playSound(type) {
    if (!audioCtx) {
      try { audioCtx = new AudioContext(); } catch(e) { return; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.1);
      }, 100);
    }
  }

  let isPlaying = false;
  let isGameOver = false;
  let score = 0;
  let gameSpeed = 4;
  let gravity = 0.6;
  let velocityY = 0;
  let chibiY = 22;
  let isJumping = false;
  let obstacles = [];
  let frameCount = 0;
  let reqId;

  function startGame() {
    gameContainer.classList.add('active');
    aboutCard.classList.add('game-active');
    aboutCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0)';
    const glare = aboutCard.querySelector('.glare');
    if (glare) glare.style.opacity = '0';
    resetGame();
  }

  function resetGame() {
    isPlaying = true;
    isGameOver = false;
    score = 0;
    gameSpeed = 4;
    velocityY = 0;
    chibiY = 22;
    isJumping = false;
    frameCount = 0;
    scoreEl.innerText = "00000";
    gameOverEl.classList.remove('show');
    
    obstacles.forEach(obs => obs.el.remove());
    obstacles = [];
    
    updateChibiPos();
    cancelAnimationFrame(reqId);
    reqId = requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    isPlaying = false;
    gameContainer.classList.remove('active');
    aboutCard.classList.remove('game-active');
    cancelAnimationFrame(reqId);
  }

  function jump() {
    if (!isPlaying && !isGameOver) return;
    if (isGameOver) {
      resetGame();
      return;
    }
    if (!isJumping) {
      isJumping = true;
      velocityY = 10;
      playSound('jump');
    }
  }

  function updateChibiPos() {
    chibiWrap.style.bottom = chibiY + 'px';
  }

  function spawnObstacle() {
    const obsEl = document.createElement('div');
    obsEl.className = 'runner-obstacle';
    obsEl.style.left = gameContainer.offsetWidth + 'px';
    gameContainer.appendChild(obsEl);
    obstacles.push({ el: obsEl, x: gameContainer.offsetWidth, passed: false });
  }

  function gameLoop() {
    if (!isPlaying) return;

    frameCount++;
    
    if (isJumping) {
      chibiY += velocityY;
      velocityY -= gravity;
      if (chibiY <= 22) {
        chibiY = 22;
        isJumping = false;
        velocityY = 0;
      }
      updateChibiPos();
    }

    if (frameCount % Math.max(50, 120 - Math.floor(score / 15)) === 0) {
      spawnObstacle();
    }

    const chibiRect = chibiWrap.getBoundingClientRect();
    const hitBox = {
      left: chibiRect.left + 6,
      right: chibiRect.right - 6,
      top: chibiRect.top + 4,
      bottom: chibiRect.bottom
    };

    for (let i = 0; i < obstacles.length; i++) {
      let obs = obstacles[i];
      obs.x -= gameSpeed;
      obs.el.style.left = obs.x + 'px';

      if (!obs.passed && obs.x < 30) {
        obs.passed = true;
        score += 10;
        scoreEl.innerText = score.toString().padStart(5, '0');
        if (score % 100 === 0) {
          playSound('score');
          gameSpeed += 0.5;
        }
      }

      const obsRect = obs.el.getBoundingClientRect();
      const obsHitBox = {
        left: obsRect.left + 4,
        right: obsRect.right - 4,
        top: obsRect.top + 6,
        bottom: obsRect.bottom
      };

      if (hitBox.left < obsHitBox.right &&
          hitBox.right > obsHitBox.left &&
          hitBox.bottom > obsHitBox.top &&
          hitBox.top < obsHitBox.bottom) {
        isGameOver = true;
        isPlaying = false;
        gameOverEl.classList.add('show');
        playSound('die');
        cancelAnimationFrame(reqId);
        return;
      }
    }

    if (obstacles.length > 0 && obstacles[0].x < -30) {
      obstacles[0].el.remove();
      obstacles.shift();
    }

    reqId = requestAnimationFrame(gameLoop);
  }

  let arrowUpCount = 0;
  let arrowUpTimer;
  document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') {
      arrowUpCount++;
      clearTimeout(arrowUpTimer);
      if (arrowUpCount >= 2) {
        if (!gameContainer.classList.contains('active')) {
          startGame();
        }
        arrowUpCount = 0;
      } else {
        arrowUpTimer = setTimeout(() => { arrowUpCount = 0; }, 400);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (gameContainer.classList.contains('active')) {
        e.preventDefault();
        jump();
      }
    }
  });

  gameContainer.addEventListener('click', (e) => {
    if (e.target !== closeBtn) {
      jump();
    }
  });

  closeBtn.addEventListener('click', () => {
    stopGame();
  });
})();



/* ============================================================
   HYPERSPACE WARP
   ============================================================ */
(function initWarp() {
  const warpBtn = document.getElementById('warp-btn');
  const canvas = document.getElementById('warp-canvas');
  const easterEgg = document.getElementById('easter-egg');
  const returnBtn = document.getElementById('return-warp-btn');
  if (!warpBtn || !canvas) return;

  const ctx = canvas.getContext('2d');
  let stars = [];
  let numStars = 400;
  let warpSpeed = 0;
  let isWarping = false;
  let rafId;

  function initStars() {
    stars = [];
    for(let i=0; i<numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width/2,
        y: Math.random() * canvas.height - canvas.height/2,
        z: Math.random() * canvas.width
      });
    }
  }

  function drawStars() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < stars.length; i++) {
      let s = stars[i];
      s.z -= warpSpeed;
      if (s.z <= 0) {
        s.z = canvas.width;
        s.x = Math.random() * canvas.width - cx;
        s.y = Math.random() * canvas.height - cy;
      }

      let x = cx + (s.x / s.z) * canvas.width;
      let y = cy + (s.y / s.z) * canvas.width;
      let r = Math.max(1, (1 - s.z / canvas.width) * 3);

      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Streak effect for high speed
      if (warpSpeed > 5) {
        let prevZ = s.z + warpSpeed * 2;
        let px = cx + (s.x / prevZ) * canvas.width;
        let py = cy + (s.y / prevZ) * canvas.width;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${1 - s.z / canvas.width})`;
        ctx.lineWidth = r;
        ctx.moveTo(x, y);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
    rafId = requestAnimationFrame(drawStars);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(isWarping && !rafId) initStars();
  }
  window.addEventListener('resize', resize);

  warpBtn.addEventListener('click', () => {
    isWarping = true;
    resize();
    initStars();
    canvas.classList.add('active');
    document.body.classList.add('warping');
    
    // Accelerate
    let acc = setInterval(() => {
      warpSpeed += 1.5;
      if (warpSpeed > 30) {
        clearInterval(acc);
        easterEgg.classList.remove('hidden');
        setTimeout(() => easterEgg.classList.add('show'), 100);
      }
    }, 50);
    drawStars();
  });

  returnBtn.addEventListener('click', () => {
    // Decelerate
    easterEgg.classList.remove('show');
    setTimeout(() => easterEgg.classList.add('hidden'), 500);
    
    let dec = setInterval(() => {
      warpSpeed -= 2;
      if (warpSpeed <= 0) {
        clearInterval(dec);
        warpSpeed = 0;
        isWarping = false;
        canvas.classList.remove('active');
        document.body.classList.remove('warping');
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }, 50);
  });
})();

/* ============================================================
   YOUTUBE LOFI BACKGROUND TOGGLE WITH SOUND
   ============================================================ */
(function initYtBgToggle() {
  const toggleBtn = document.getElementById('yt-bg-toggle');
  const restartBtn = document.getElementById('yt-restart-btn');
  const mp4Video = document.getElementById('bg-video');
  const ytContainer = document.getElementById('bg-yt-container');
  const ytIframe = document.getElementById('bg-yt-player');
  if (!toggleBtn || !mp4Video || !ytContainer || !ytIframe) return;

  let isYtMode = false;

  function postYtCommand(func, args) {
    if (ytIframe && ytIframe.contentWindow) {
      ytIframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: func,
        args: args || []
      }), '*');
    }
  }

  toggleBtn.addEventListener('click', () => {
    isYtMode = !isYtMode;

    if (isYtMode) {
      // Bật chế độ YouTube (Kèm âm thanh)
      mp4Video.pause();
      mp4Video.classList.add('hidden');
      ytContainer.classList.remove('hidden');
      if (restartBtn) restartBtn.classList.remove('hidden');

      toggleBtn.style.background = 'rgba(53, 232, 255, 0.2)';
      toggleBtn.style.borderColor = '#35e8ff';
      toggleBtn.style.boxShadow = '0 0 10px #35e8ff';

      // Phát video YouTube + mở tiếng + âm lượng 50
      postYtCommand('playVideo');
      postYtCommand('unMute');
      postYtCommand('setVolume', [50]);
    } else {
      // Tắt chế độ YouTube, quay về nền MP4 mặc định
      postYtCommand('pauseVideo');
      ytContainer.classList.add('hidden');
      if (restartBtn) restartBtn.classList.add('hidden');
      mp4Video.classList.remove('hidden');
      mp4Video.play();

      toggleBtn.style.background = '';
      toggleBtn.style.borderColor = '';
      toggleBtn.style.boxShadow = '';
    }
  });

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      postYtCommand('seekTo', [0, true]);
      postYtCommand('playVideo');
      postYtCommand('unMute');
      
      // Hiệu ứng nhấp nháy nút 🔄 khi bấm
      restartBtn.style.transform = 'scale(1.2) rotate(-360deg)';
      restartBtn.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        restartBtn.style.transform = '';
      }, 500);
    });
  }
})();

/* ════════════════════════════════════════════════════════════
   ██  REFINEMENT LAYER
   Nạp sau cùng. Không sửa logic cũ, chỉ bọc và bổ sung.
   Xoá cả khối này thì trang vẫn chạy như trước.
   ════════════════════════════════════════════════════════════ */
(function refinementLayer() {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotionFlag = () => document.body.classList.toggle('reduce-motion', reduceMotion.matches);
  syncMotionFlag();
  reduceMotion.addEventListener?.('change', syncMotionFlag);

  /* Chế độ nhẹ: người dùng bật tiết kiệm dữ liệu → bỏ video nền + hạt phim */
  const conn = navigator.connection || {};
  if (conn.saveData === true || window.matchMedia('(prefers-reduced-data: reduce)').matches) {
    document.body.classList.add('lite-mode');
  }

  /* ──────────────────────────────────────────────────────────
     1. SKELETON + ĐẾM SỐ TĂNG DẦN
     Bám vào thay đổi text của các ô số liệu, không đụng fetch.
     ────────────────────────────────────────────────────────── */
  const PLACEHOLDER = /^(\s*|--.*|.*\.\.\.$|Đang tải|Đang kết nối|Đang kiểm tra.*|-- .*)$/i;

  /* id → có đếm số hay không */
  const TRACKED = {
    'mc-ping': true, 'mc-online': true, 'mc-max': true,
    'mc-version': false, 'mc-ip': false, 'mc-status-text': false, 'mc-updated': false,
    'steam-hours': true, 'steam-games': true, 'steam-level': true, 'steam-friends': true,
    'steam-playing': false, 'steam-updated': false, 'steam-status-label': false,
    'spotify-status': false, 'custom-status-line': false
  };

  const nf = new Intl.NumberFormat('vi-VN');

  function countUp(el, from, to, template) {
    const dur = reduceMotion.matches ? 0 : 780;
    const t0 = performance.now();
    el.__cuLock = true;
    function frame(now) {
      const p = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      const val = Math.round(from + (to - from) * eased);
      el.textContent = template.replace('\u0000', nf.format(val));
      if (p < 1) requestAnimationFrame(frame);
      else el.__cuLock = false;
    }
    requestAnimationFrame(frame);
  }

  function onValueArrived(el, text) {
    const isPlaceholder = PLACEHOLDER.test(text.trim()) || text.includes('--');
    el.classList.toggle('skeleton', isPlaceholder);
    if (isPlaceholder) return;

    el.classList.remove('skeleton');
    el.classList.remove('value-in');
    void el.offsetWidth;                               // ép trình duyệt chạy lại animation
    el.classList.add('value-in');

    if (!TRACKED[el.id]) return;

    /* Tách số ra khỏi phần chữ: "1.204 giờ" → template "\0 giờ" */
    const m = text.match(/[\d][\d.,\s]*\d|\d/);
    if (!m) return;
    const target = parseInt(m[0].replace(/\D/g, ''), 10);
    if (!Number.isFinite(target) || target <= 0) return;

    const template = text.replace(m[0], '\u0000');
    const from = Number.isFinite(el.__cuLast) ? el.__cuLast : 0;
    el.__cuLast = target;
    if (from === target) return;
    countUp(el, from, target, template);
  }

  Object.keys(TRACKED).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    onValueArrived(el, el.textContent || '');
    new MutationObserver(() => {
      if (el.__cuLock) return;
      onValueArrived(el, el.textContent || '');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* ──────────────────────────────────────────────────────────
     2. VÒNG AVATAR ĐỔI MÀU THEO TRẠNG THÁI DISCORD
     ────────────────────────────────────────────────────────── */
  const orb = document.getElementById('status-orb');
  const avatarWrap = document.getElementById('avatar-wrap');
  if (orb && avatarWrap) {
    const syncRing = () => {
      ['online', 'idle', 'dnd', 'offline'].forEach((s) =>
        avatarWrap.classList.toggle('is-' + s, orb.classList.contains(s)));
    };
    syncRing();
    new MutationObserver(syncRing).observe(orb, { attributes: true, attributeFilter: ['class'] });
  }

  /* ──────────────────────────────────────────────────────────
     3. ẢNH BÌA ALBUM + MÀU CHỦ ĐẠO CHO THẺ HOẠT ĐỘNG
     ────────────────────────────────────────────────────────── */
  const activityCard = document.getElementById('activity-card');
  const activityArt = document.getElementById('activity-art');
  const activityName = document.getElementById('activity-name');
  let lastArtUrl = '';

  function dominantColor(img) {
    /* Thu ảnh về 8×8 rồi lấy trung bình có trọng số theo độ bão hoà */
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 8;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data;
      let r = 0, gg = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const weight = (mx - mn) / 255 + 0.15;         // ưu tiên pixel rực rỡ
        r += d[i] * weight; gg += d[i + 1] * weight; b += d[i + 2] * weight; w += weight;
      }
      if (!w) return null;
      r = Math.round(r / w); gg = Math.round(gg / w); b = Math.round(b / w);
      /* Kéo sáng lên nếu màu quá tối để còn nhìn thấy trên nền đen */
      const lum = (r * 299 + gg * 587 + b * 114) / 1000;
      if (lum < 70) { const k = 70 / Math.max(lum, 1); r = Math.min(255, r * k) | 0; gg = Math.min(255, gg * k) | 0; b = Math.min(255, b * k) | 0; }
      return `${r} ${gg} ${b}`;
    } catch (e) {
      return null;                                      // ảnh chặn CORS → bỏ qua, vẫn hiện ảnh
    }
  }

  /* Sóng nhạc nhỏ trước tên bài. updateActivityCard() ghi đè textContent mỗi 6s
     nên phải theo dõi và chèn lại, không thì nó biến mất. */
  let barsWanted = false;
  function ensureBars() {
    if (!activityName) return;
    const existing = activityName.querySelector('.now-playing-bars');
    if (barsWanted && !existing) {
      const bars = document.createElement('span');
      bars.className = 'now-playing-bars';
      bars.setAttribute('aria-hidden', 'true');
      bars.innerHTML = '<i></i><i></i><i></i>';
      activityName.prepend(bars);
    } else if (!barsWanted && existing) {
      existing.remove();
    }
  }
  if (activityName) {
    new MutationObserver(ensureBars).observe(activityName, { childList: true });
  }

  function syncAlbumArt() {
    const d = (typeof lanyardCache !== 'undefined' && lanyardCache) ? lanyardCache : null;
    const art = d && d.listening_to_spotify && d.spotify ? d.spotify.album_art_url : '';

    if (!art) {
      if (lastArtUrl) {
        lastArtUrl = '';
        barsWanted = false;
        ensureBars();
        activityArt?.classList.add('hidden');
        activityCard?.classList.remove('has-art');
        activityCard?.style.removeProperty('--art-rgb');
      }
      return;
    }
    barsWanted = true;
    ensureBars();
    if (art === lastArtUrl) return;
    lastArtUrl = art;

    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      if (activityArt) { activityArt.src = art; activityArt.classList.remove('hidden'); }
      activityCard?.classList.add('has-art');
      const rgb = dominantColor(probe);
      if (rgb) activityCard?.style.setProperty('--art-rgb', rgb);
      ensureBars();
    };
    probe.onerror = () => {
      if (activityArt) { activityArt.src = art; activityArt.classList.remove('hidden'); }
      activityCard?.classList.add('has-art');
      ensureBars();
    };
    probe.src = art;
  }
  setInterval(syncAlbumArt, 3000);
  syncAlbumArt();

  /* ──────────────────────────────────────────────────────────
     4. THEME TỰ ĐỘNG THEO GIỜ VIỆT NAM
     Tái dùng luôn applyTheme cũ bằng cách bấm hộ nút tương ứng.
     ────────────────────────────────────────────────────────── */
  const AUTO_KEY = 'profile-theme-auto';
  const autoBtn = document.getElementById('theme-auto');

  function vnHour() {
    const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false });
    return parseInt(s, 10) || 0;
  }
  function themeForHour(h) {
    if (h >= 5 && h < 11) return 'ocean';    // sáng: biển sáng và mát
    if (h >= 11 && h < 17) return 'sakura';  // trưa – chiều: hồng ấm
    if (h >= 17 && h < 22) return 'fire';    // hoàng hôn: cam lửa
    return 'cyber';                          // đêm khuya: tối, xanh tím
  }
  function isAuto() { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (e) { return false; } }
  function setAuto(on) { try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch (e) {} }

  function applyAutoTheme() {
    const want = themeForHour(vnHour());
    if (document.documentElement.getAttribute('data-theme') === want) return;
    const opt = document.querySelector(`.theme-option[data-theme="${want}"]`);
    if (!opt) return;
    opt.dataset.autoTriggered = '1';   // để listener bên dưới biết đây không phải người bấm
    opt.click();
    delete opt.dataset.autoTriggered;
  }

  if (autoBtn) {
    autoBtn.classList.toggle('active', isAuto());
    autoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !isAuto();
      setAuto(on);
      autoBtn.classList.toggle('active', on);
      autoBtn.title = on ? 'Đang tự đổi theme theo giờ Việt Nam — bấm để tắt' : 'Tự động đổi theo giờ Việt Nam';
      if (on) applyAutoTheme();
    });
    /* Chọn theme thủ công thì tắt chế độ tự động */
    document.querySelectorAll('.theme-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        if (opt.dataset.autoTriggered) return;
        if (isAuto()) { setAuto(false); autoBtn.classList.remove('active'); }
      });
    });
    if (isAuto()) applyAutoTheme();
    setInterval(() => { if (isAuto()) applyAutoTheme(); }, 60000);
  }

  /* ──────────────────────────────────────────────────────────
     5. VIEW TRANSITIONS CHO CHUYỂN TRANG CON
     ────────────────────────────────────────────────────────── */
  const canVT = typeof document.startViewTransition === 'function';

  function withTransition(fn) {
    /* Tắt hẳn: View Transition chồng lên animation CSS gây khựng.
       Chuyển cảnh giờ do CSS lo, chỉ dùng transform + opacity. */
    fn(); return;
    /* eslint-disable-next-line no-unreachable */
    if (!canVT || reduceMotion.matches) { fn(); return; }
    document.body.classList.add('vt-active');
    const vt = document.startViewTransition(() => { fn(); });
    vt.finished.finally(() => document.body.classList.remove('vt-active'));
  }

  if (typeof showInnerPage === 'function') {
    const rawShow = showInnerPage;
    showInnerPage = function (page, afterShow, wide) {
      withTransition(() => rawShow(page, afterShow, wide));
    };
  }
  if (typeof hideInnerPage === 'function') {
    const rawHide = hideInnerPage;
    hideInnerPage = function (page) {
      withTransition(() => rawHide(page));
    };
  }

  /* ──────────────────────────────────────────────────────────
     6. THANH TIẾN TRÌNH TUA ĐƯỢC
     ────────────────────────────────────────────────────────── */
  const progressEl = document.querySelector('.music-player .progress');
  const audioEl = document.getElementById('audio-player');
  if (progressEl && audioEl) {
    progressEl.setAttribute('role', 'slider');
    progressEl.setAttribute('aria-label', 'Tua bài hát');
    progressEl.tabIndex = 0;

    const seekTo = (clientX) => {
      const r = progressEl.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      if (Number.isFinite(audioEl.duration)) audioEl.currentTime = ratio * audioEl.duration;
    };
    let dragging = false;
    progressEl.addEventListener('pointerdown', (e) => {
      dragging = true; progressEl.setPointerCapture(e.pointerId); seekTo(e.clientX);
    });
    progressEl.addEventListener('pointermove', (e) => { if (dragging) seekTo(e.clientX); });
    progressEl.addEventListener('pointerup', () => { dragging = false; });
    progressEl.addEventListener('keydown', (e) => {
      if (!Number.isFinite(audioEl.duration)) return;
      if (e.key === 'ArrowRight') { audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 5); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { audioEl.currentTime = Math.max(0, audioEl.currentTime - 5); e.preventDefault(); }
    });
  }

  /* ──────────────────────────────────────────────────────────
     7. DỌN --audio-bass KHI DỪNG NHẠC
     (nếu không, vòng avatar đứng yên ở giá trị cuối)
     ────────────────────────────────────────────────────────── */
  if (audioEl) {
    const clearBass = () => document.body.style.setProperty('--audio-bass', '0');
    audioEl.addEventListener('pause', clearBass);
    audioEl.addEventListener('ended', clearBass);
    clearBass();
  }
})();
/* ════════════════════════════════════════════════════════════
   ██  END REFINEMENT LAYER
   ════════════════════════════════════════════════════════════ */


/* ── Dừng video nền khi người dùng chuyển tab: đỡ tốn pin và GPU ── */
(function pauseBgVideoWhenHidden() {
  var v = document.getElementById('bg-video');
  if (!v) return;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) v.pause();
    else v.play().catch(function () {});
  });
})();

/* ════════════════════════════════════════════════════════════
   ██  THE MIDNIGHT ARCADE (11 GAMES) STANDALONE CONTROLLER
   Tự động tải 100% nội tuyến không cần file ngoài, không lo lỗi 404
   ════════════════════════════════════════════════════════════ */
(function initArcadeLauncher() {
  const overlay = document.getElementById('snake-overlay');
  const iframe = document.getElementById('arcade-iframe');
  const openBtn = document.getElementById('snake-game-btn');

  if (!overlay) return;

  const ARCADE_B64 = "PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KICA8aGVhZD4KICAgIDxtZXRhIGNoYXJzZXQ9IlVURi04IiAvPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAsIHZpZXdwb3J0LWZpdD1jb3ZlciIgLz4KICAgIDxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMDYwZjBhIiAvPgogICAgPHRpdGxlPlRoZSBNaWRuaWdodCBBcmNhZGUg4oCUIDExIENhcnRyaWRnZXM8L3RpdGxlPgogICAgPGxpbmsgcmVsPSJwcmVjb25uZWN0IiBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tIiAvPgogICAgPGxpbmsgcmVsPSJwcmVjb25uZWN0IiBocmVmPSJodHRwczovL2ZvbnRzLmdzdGF0aWMuY29tIiBjcm9zc29yaWdpbiAvPgogICAgPGxpbmsgaHJlZj0iaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1DaGFrcmErUGV0Y2g6d2dodEA0MDA7NTAwOzYwMDs3MDAmZmFtaWx5PVByZXNzK1N0YXJ0KzJQJmRpc3BsYXk9c3dhcCIgcmVsPSJzdHlsZXNoZWV0IiAvPgogICAgPHN0eWxlPgovKiEgdGFpbHdpbmRjc3MgdjQuMy4zIHwgTUlUIExpY2Vuc2UgfCBodHRwczovL3RhaWx3aW5kY3NzLmNvbSAqL0BsYXllciBwcm9wZXJ0aWVze0BzdXBwb3J0cyAoKCgtd2Via2l0LWh5cGhlbnM6bm9uZSkpIGFuZCAobm90IChtYXJnaW4tdHJpbTppbmxpbmUpKSkgb3IgKCgtbW96LW9yaWVudDppbmxpbmUpIGFuZCAobm90IChjb2xvcjpyZ2IoZnJvbSByZWQgciBnIGIpKSkpeyosOmJlZm9yZSw6YWZ0ZXIsOjpiYWNrZHJvcHstLXR3LXJvdGF0ZS14OmluaXRpYWw7LS10dy1yb3RhdGUteTppbml0aWFsOy0tdHctcm90YXRlLXo6aW5pdGlhbDstLXR3LXNrZXcteDppbml0aWFsOy0tdHctc2tldy15OmluaXRpYWw7LS10dy1ib3JkZXItc3R5bGU6c29saWQ7LS10dy1sZWFkaW5nOmluaXRpYWw7LS10dy1mb250LXdlaWdodDppbml0aWFsOy0tdHctdHJhY2tpbmc6aW5pdGlhbDstLXR3LW9yZGluYWw6aW5pdGlhbDstLXR3LXNsYXNoZWQtemVybzppbml0aWFsOy0tdHctbnVtZXJpYy1maWd1cmU6aW5pdGlhbDstLXR3LW51bWVyaWMtc3BhY2luZzppbml0aWFsOy0tdHctbnVtZXJpYy1mcmFjdGlvbjppbml0aWFsOy0tdHctc2hhZG93OjAgMCAjMDAwMDstLXR3LXNoYWRvdy1jb2xvcjppbml0aWFsOy0tdHctc2hhZG93LWFscGhhOjEwMCU7LS10dy1pbnNldC1zaGFkb3c6MCAwICMwMDAwOy0tdHctaW5zZXQtc2hhZG93LWNvbG9yOmluaXRpYWw7LS10dy1pbnNldC1zaGFkb3ctYWxwaGE6MTAwJTstLXR3LXJpbmctY29sb3I6aW5pdGlhbDstLXR3LXJpbmctc2hhZG93OjAgMCAjMDAwMDstLXR3LWluc2V0LXJpbmctY29sb3I6aW5pdGlhbDstLXR3LWluc2V0LXJpbmctc2hhZG93OjAgMCAjMDAwMDstLXR3LXJpbmctaW5zZXQ6aW5pdGlhbDstLXR3LXJpbmctb2Zmc2V0LXdpZHRoOjBweDstLXR3LXJpbmctb2Zmc2V0LWNvbG9yOiNmZmY7LS10dy1yaW5nLW9mZnNldC1zaGFkb3c6MCAwICMwMDAwOy0tdHctb3V0bGluZS1zdHlsZTpzb2xpZDstLXR3LWJsdXI6aW5pdGlhbDstLXR3LWJyaWdodG5lc3M6aW5pdGlhbDstLXR3LWNvbnRyYXN0OmluaXRpYWw7LS10dy1ncmF5c2NhbGU6aW5pdGlhbDstLXR3LWh1ZS1yb3RhdGU6aW5pdGlhbDstLXR3LWludmVydDppbml0aWFsOy0tdHctb3BhY2l0eTppbml0aWFsOy0tdHctc2F0dXJhdGU6aW5pdGlhbDstLXR3LXNlcGlhOmluaXRpYWw7LS10dy1kcm9wLXNoYWRvdzppbml0aWFsOy0tdHctZHJvcC1zaGFkb3ctY29sb3I6aW5pdGlhbDstLXR3LWRyb3Atc2hhZG93LWFscGhhOjEwMCU7LS10dy1kcm9wLXNoYWRvdy1zaXplOmluaXRpYWw7LS10dy1iYWNrZHJvcC1ibHVyOmluaXRpYWw7LS10dy1iYWNrZHJvcC1icmlnaHRuZXNzOmluaXRpYWw7LS10dy1iYWNrZHJvcC1jb250cmFzdDppbml0aWFsOy0tdHctYmFja2Ryb3AtZ3JheXNjYWxlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1odWUtcm90YXRlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1pbnZlcnQ6aW5pdGlhbDstLXR3LWJhY2tkcm9wLW9wYWNpdHk6aW5pdGlhbDstLXR3LWJhY2tkcm9wLXNhdHVyYXRlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1zZXBpYTppbml0aWFsOy0tdHctZHVyYXRpb246aW5pdGlhbDstLXR3LWVhc2U6aW5pdGlhbDstLXR3LXNjYWxlLXg6MTstLXR3LXNjYWxlLXk6MTstLXR3LXNjYWxlLXo6MTstLXR3LXRyYW5zbGF0ZS14OjA7LS10dy10cmFuc2xhdGUteTowOy0tdHctdHJhbnNsYXRlLXo6MH19fUBsYXllciB0aGVtZXs6cm9vdCw6aG9zdHstLWZvbnQtc2FuczotYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICJTZWdvZSBVSSIsIFJvYm90bywgIkhlbHZldGljYSBOZXVlIiwgIk5vdG8gU2FucyIsIEFyaWFsLCBzYW5zLXNlcmlmLCAiQXBwbGUgQ29sb3IgRW1vamkiLCAiU2Vnb2UgVUkgRW1vamkiLCAiU2Vnb2UgVUkgU3ltYm9sIiwgIk5vdG8gQ29sb3IgRW1vamkiOy0tZm9udC1tb25vOnVpLW1vbm9zcGFjZSwgU0ZNb25vLVJlZ3VsYXIsIE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCAiTGliZXJhdGlvbiBNb25vIiwgIkNvdXJpZXIgTmV3IiwgbW9ub3NwYWNlOy0tY29sb3ItcmVkLTIwMDpva2xjaCg4OC41JSAuMDYyIDE4LjMzNCk7LS1jb2xvci1yZWQtNDAwOm9rbGNoKDcwLjQlIC4xOTEgMjIuMjE2KTstLWNvbG9yLXJlZC01MDA6b2tsY2goNjMuNyUgLjIzNyAyNS4zMzEpOy0tY29sb3ItcmVkLTkwMDpva2xjaCgzOS42JSAuMTQxIDI1LjcyMyk7LS1jb2xvci1yZWQtOTUwOm9rbGNoKDI1LjglIC4wOTIgMjYuMDQyKTstLWNvbG9yLWJsYWNrOiMwMDA7LS1jb2xvci13aGl0ZTojZmZmOy0tc3BhY2luZzouMjVyZW07LS1jb250YWluZXItc206MjRyZW07LS1jb250YWluZXItM3hsOjQ4cmVtOy0tY29udGFpbmVyLTZ4bDo3MnJlbTstLXRleHQtc206Ljg3NXJlbTstLXRleHQtc20tLWxpbmUtaGVpZ2h0OmNhbGMoMS4yNSAvIC44NzUpOy0tdGV4dC1iYXNlOjFyZW07LS10ZXh0LWJhc2UtLWxpbmUtaGVpZ2h0OiAxLjUgOy0tdGV4dC1sZzoxLjEyNXJlbTstLXRleHQtbGctLWxpbmUtaGVpZ2h0OmNhbGMoMS43NSAvIDEuMTI1KTstLXRleHQteGw6MS4yNXJlbTstLXRleHQteGwtLWxpbmUtaGVpZ2h0OmNhbGMoMS43NSAvIDEuMjUpOy0tdGV4dC0yeGw6MS41cmVtOy0tdGV4dC0yeGwtLWxpbmUtaGVpZ2h0OmNhbGMoMiAvIDEuNSk7LS10ZXh0LTN4bDoxLjg3NXJlbTstLXRleHQtM3hsLS1saW5lLWhlaWdodDogMS4yIDstLXRleHQtNHhsOjIuMjVyZW07LS10ZXh0LTR4bC0tbGluZS1oZWlnaHQ6Y2FsYygyLjUgLyAyLjI1KTstLWZvbnQtd2VpZ2h0LW1lZGl1bTo1MDA7LS1mb250LXdlaWdodC1ib2xkOjcwMDstLXRyYWNraW5nLW5vcm1hbDowZW07LS10cmFja2luZy13aWRlOi4wMjVlbTstLXRyYWNraW5nLXdpZGVyOi4wNWVtOy0tdHJhY2tpbmctd2lkZXN0Oi4xZW07LS1sZWFkaW5nLXRpZ2h0OjEuMjU7LS1sZWFkaW5nLXJlbGF4ZWQ6MS42MjU7LS1yYWRpdXMtc206LjI1cmVtOy0tcmFkaXVzLW1kOi4zNzVyZW07LS1yYWRpdXMtbGc6LjVyZW07LS1lYXNlLW91dDpjdWJpYy1iZXppZXIoMCwgMCwgLjIsIDEpOy0tZGVmYXVsdC10cmFuc2l0aW9uLWR1cmF0aW9uOi4xNXM7LS1kZWZhdWx0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmN1YmljLWJlemllciguNCwgMCwgLjIsIDEpOy0tZGVmYXVsdC1mb250LWZhbWlseTp2YXIoLS1mb250LXNhbnMpOy0tZGVmYXVsdC1tb25vLWZvbnQtZmFtaWx5OnZhcigtLWZvbnQtbW9ubyk7LS1mb250LWRpc3BsYXk6IlByZXNzIFN0YXJ0IDJQIiwgIkNvdXJpZXIgTmV3IiwgbW9ub3NwYWNlOy0tZm9udC1ib2R5OiJDaGFrcmEgUGV0Y2giLCB1aS1zYW5zLXNlcmlmLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7LS1jb2xvci1waXQtOTUwOiMwNjBmMGE7LS1jb2xvci1waXQtOTAwOiMwYTE4MTA7LS1jb2xvci1waXQtODUwOiMwYzFkMTM7LS1jb2xvci1waXQtODAwOiMwZjI0MTc7LS1jb2xvci1waXQtNzAwOiMxNjMwMWY7LS1jb2xvci1waXQtNjAwOiMxZDNhMjk7LS1jb2xvci1waXQtNTAwOiMyYzRhMzc7LS1jb2xvci1tb3NzLTQwMDojNWQ3ZjZiOy0tY29sb3ItbW9zcy0zMDA6IzhmYjM5YjstLWNvbG9yLW1vc3MtMjAwOiNiZmU4Yzg7LS1jb2xvci1tb3NzLTEwMDojZThmNmVhOy0tY29sb3ItdmVub20tNDAwOiM4ZWYwNWE7LS1jb2xvci1hbWJlcmdsb3ctNTAwOiNlOGE5M2M7LS1jb2xvci1hbWJlcmdsb3ctNDAwOiNmZmM4NTc7LS1jb2xvci1hbWJlcmdsb3ctMzAwOiNmZmUwOGE7LS1jb2xvci1hcHBsZS01MDA6I2UwNDM0ODstLWNvbG9yLWFwcGxlLTQwMDojZmY2YjZifX1AbGF5ZXIgYmFzZXsqLDphZnRlciw6YmVmb3JlLDo6YmFja2Ryb3B7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjowIHNvbGlkO21hcmdpbjowO3BhZGRpbmc6MH06OmZpbGUtc2VsZWN0b3ItYnV0dG9ue2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXI6MCBzb2xpZDttYXJnaW46MDtwYWRkaW5nOjB9aHRtbCw6aG9zdHstd2Via2l0LXRleHQtc2l6ZS1hZGp1c3Q6MTAwJTstbW96LXRhYi1zaXplOjQ7dGFiLXNpemU6NDtsaW5lLWhlaWdodDoxLjU7Zm9udC1mYW1pbHk6dmFyKC0tZGVmYXVsdC1mb250LWZhbWlseSwtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICJTZWdvZSBVSSIsIFJvYm90bywgIkhlbHZldGljYSBOZXVlIiwgIk5vdG8gU2FucyIsIEFyaWFsLCBzYW5zLXNlcmlmLCAiQXBwbGUgQ29sb3IgRW1vamkiLCAiU2Vnb2UgVUkgRW1vamkiLCAiU2Vnb2UgVUkgU3ltYm9sIiwgIk5vdG8gQ29sb3IgRW1vamkiKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6dmFyKC0tZGVmYXVsdC1mb250LWZlYXR1cmUtc2V0dGluZ3Msbm9ybWFsKTtmb250LXZhcmlhdGlvbi1zZXR0aW5nczp2YXIoLS1kZWZhdWx0LWZvbnQtdmFyaWF0aW9uLXNldHRpbmdzLG5vcm1hbCk7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fWhye2hlaWdodDowO2NvbG9yOmluaGVyaXQ7Ym9yZGVyLXRvcC13aWR0aDoxcHh9YWJicjp3aGVyZShbdGl0bGVdKXstd2Via2l0LXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmUgZG90dGVkO3RleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmUgZG90dGVkfWgxLGgyLGgzLGg0LGg1LGg2e2ZvbnQtc2l6ZTppbmhlcml0O2ZvbnQtd2VpZ2h0OmluaGVyaXR9YXtjb2xvcjppbmhlcml0Oy13ZWJraXQtdGV4dC1kZWNvcmF0aW9uOmluaGVyaXQ7dGV4dC1kZWNvcmF0aW9uOmluaGVyaXR9YixzdHJvbmd7Zm9udC13ZWlnaHQ6Ym9sZGVyfWNvZGUsa2JkLHNhbXAscHJle2ZvbnQtZmFtaWx5OnZhcigtLWRlZmF1bHQtbW9uby1mb250LWZhbWlseSx1aS1tb25vc3BhY2UsIFNGTW9uby1SZWd1bGFyLCBNZW5sbywgTW9uYWNvLCBDb25zb2xhcywgIkxpYmVyYXRpb24gTW9ubyIsICJDb3VyaWVyIE5ldyIsIG1vbm9zcGFjZSk7Zm9udC1mZWF0dXJlLXNldHRpbmdzOnZhcigtLWRlZmF1bHQtbW9uby1mb250LWZlYXR1cmUtc2V0dGluZ3Msbm9ybWFsKTtmb250LXZhcmlhdGlvbi1zZXR0aW5nczp2YXIoLS1kZWZhdWx0LW1vbm8tZm9udC12YXJpYXRpb24tc2V0dGluZ3Msbm9ybWFsKTtmb250LXNpemU6MWVtfXNtYWxse2ZvbnQtc2l6ZTo4MCV9c3ViLHN1cHt2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZTtmb250LXNpemU6NzUlO2xpbmUtaGVpZ2h0OjA7cG9zaXRpb246cmVsYXRpdmV9c3Vie2JvdHRvbTotLjI1ZW19c3Vwe3RvcDotLjVlbX10YWJsZXt0ZXh0LWluZGVudDowO2JvcmRlci1jb2xvcjppbmhlcml0O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZX06LW1vei1mb2N1c3Jpbmc6d2hlcmUoOm5vdChpZnJhbWUpKXtvdXRsaW5lOmF1dG99cHJvZ3Jlc3N7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9c3VtbWFyeXtkaXNwbGF5Omxpc3QtaXRlbX1vbCx1bCxtZW51e2xpc3Qtc3R5bGU6bm9uZX1pbWcsc3ZnLHZpZGVvLGNhbnZhcyxhdWRpbyxpZnJhbWUsZW1iZWQsb2JqZWN0e3ZlcnRpY2FsLWFsaWduOm1pZGRsZTtkaXNwbGF5OmJsb2NrfWltZyx2aWRlb3ttYXgtd2lkdGg6MTAwJTtoZWlnaHQ6YXV0b31idXR0b24saW5wdXQsc2VsZWN0LG9wdGdyb3VwLHRleHRhcmVhe2ZvbnQ6aW5oZXJpdDtmb250LWZlYXR1cmUtc2V0dGluZ3M6aW5oZXJpdDtmb250LXZhcmlhdGlvbi1zZXR0aW5nczppbmhlcml0O2xldHRlci1zcGFjaW5nOmluaGVyaXQ7Y29sb3I6aW5oZXJpdDtvcGFjaXR5OjE7YmFja2dyb3VuZC1jb2xvcjojMDAwMDtib3JkZXItcmFkaXVzOjB9OjpmaWxlLXNlbGVjdG9yLWJ1dHRvbntmb250OmluaGVyaXQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOmluaGVyaXQ7Zm9udC12YXJpYXRpb24tc2V0dGluZ3M6aW5oZXJpdDtsZXR0ZXItc3BhY2luZzppbmhlcml0O2NvbG9yOmluaGVyaXQ7b3BhY2l0eToxO2JhY2tncm91bmQtY29sb3I6IzAwMDA7Ym9yZGVyLXJhZGl1czowfTp3aGVyZShzZWxlY3Q6aXMoW211bHRpcGxlXSxbc2l6ZV0pKSBvcHRncm91cHtmb250LXdlaWdodDpib2xkZXJ9OndoZXJlKHNlbGVjdDppcyhbbXVsdGlwbGVdLFtzaXplXSkpIG9wdGdyb3VwIG9wdGlvbntwYWRkaW5nLWlubGluZS1zdGFydDoyMHB4fTo6ZmlsZS1zZWxlY3Rvci1idXR0b257bWFyZ2luLWlubGluZS1lbmQ6NHB4fTo6cGxhY2Vob2xkZXJ7b3BhY2l0eToxfUBzdXBwb3J0cyAobm90ICgoLXdlYmtpdC1hcHBlYXJhbmNlOi1hcHBsZS1wYXktYnV0dG9uKSkpIG9yIChjb250YWluLWludHJpbnNpYy1zaXplOjFweCl7OjpwbGFjZWhvbGRlcntjb2xvcjpjdXJyZW50Q29sb3J9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXs6OnBsYWNlaG9sZGVye2NvbG9yOmNvbG9yLW1peChpbiBva2xhYixjdXJyZW50Y29sb3IgNTAlLHRyYW5zcGFyZW50KX19fXRleHRhcmVhe3Jlc2l6ZTp2ZXJ0aWNhbH06Oi13ZWJraXQtc2VhcmNoLWRlY29yYXRpb257LXdlYmtpdC1hcHBlYXJhbmNlOm5vbmV9Ojotd2Via2l0LWRhdGUtYW5kLXRpbWUtdmFsdWV7bWluLWhlaWdodDoxbGg7dGV4dC1hbGlnbjppbmhlcml0fTo6LXdlYmtpdC1kYXRldGltZS1lZGl0e2Rpc3BsYXk6aW5saW5lLWZsZXh9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXQtZmllbGRzLXdyYXBwZXJ7cGFkZGluZzowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0e3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC15ZWFyLWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1tb250aC1maWVsZHtwYWRkaW5nLWJsb2NrOjB9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXQtZGF5LWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1ob3VyLWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1taW51dGUtZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LXNlY29uZC1maWVsZHtwYWRkaW5nLWJsb2NrOjB9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXQtbWlsbGlzZWNvbmQtZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LW1lcmlkaWVtLWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtY2FsZW5kYXItcGlja2VyLWluZGljYXRvcntsaW5lLWhlaWdodDoxfTotbW96LXVpLWludmFsaWR7Ym94LXNoYWRvdzpub25lfWJ1dHRvbixpbnB1dDp3aGVyZShbdHlwZT1idXR0b25dLFt0eXBlPXJlc2V0XSxbdHlwZT1zdWJtaXRdKXstd2Via2l0LWFwcGVhcmFuY2U6YnV0dG9uOy1tb3otYXBwZWFyYW5jZTpidXR0b247YXBwZWFyYW5jZTpidXR0b259OjpmaWxlLXNlbGVjdG9yLWJ1dHRvbnstd2Via2l0LWFwcGVhcmFuY2U6YnV0dG9uOy1tb3otYXBwZWFyYW5jZTpidXR0b247YXBwZWFyYW5jZTpidXR0b259Ojotd2Via2l0LWlubmVyLXNwaW4tYnV0dG9ue2hlaWdodDphdXRvfTo6LXdlYmtpdC1vdXRlci1zcGluLWJ1dHRvbntoZWlnaHQ6YXV0b31baGlkZGVuXTp3aGVyZSg6bm90KFtoaWRkZW49dW50aWwtZm91bmRdKSl7ZGlzcGxheTpub25lIWltcG9ydGFudH19QGxheWVyIGNvbXBvbmVudHM7QGxheWVyIHV0aWxpdGllc3sucG9pbnRlci1ldmVudHMtbm9uZXtwb2ludGVyLWV2ZW50czpub25lfS5hYnNvbHV0ZXtwb3NpdGlvbjphYnNvbHV0ZX0uZml4ZWR7cG9zaXRpb246Zml4ZWR9LnJlbGF0aXZle3Bvc2l0aW9uOnJlbGF0aXZlfS5pbnNldC0we3RvcDowO3JpZ2h0OjA7Ym90dG9tOjA7bGVmdDowfS5pbnNldC0ye2luc2V0OmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0udG9wLTB7dG9wOjB9LnJpZ2h0LTB7cmlnaHQ6MH0uYm90dG9tLTB7Ym90dG9tOjB9LmxlZnQtMHtsZWZ0OjB9LnotMTB7ei1pbmRleDoxMH0uei0yMHt6LWluZGV4OjIwfS56LTMwe3otaW5kZXg6MzB9LnotXFs3MFxde3otaW5kZXg6NzB9LmNvbC1zdGFydC0xe2dyaWQtY29sdW1uLXN0YXJ0OjF9LmNvbC1zdGFydC0ye2dyaWQtY29sdW1uLXN0YXJ0OjJ9LmNvbC1zdGFydC0ze2dyaWQtY29sdW1uLXN0YXJ0OjN9LnJvdy1zdGFydC0xe2dyaWQtcm93LXN0YXJ0OjF9LnJvdy1zdGFydC0ye2dyaWQtcm93LXN0YXJ0OjJ9Lm0tYXV0b3ttYXJnaW46YXV0b30ubXgtMXttYXJnaW4taW5saW5lOnZhcigtLXNwYWNpbmcpfS5teC1hdXRve21hcmdpbi1pbmxpbmU6YXV0b30ubXQtMXttYXJnaW4tdG9wOnZhcigtLXNwYWNpbmcpfS5tdC0xXC41e21hcmdpbi10b3A6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEuNSl9Lm10LTJ7bWFyZ2luLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9Lm10LTN7bWFyZ2luLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9Lm10LTR7bWFyZ2luLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9Lm10LTV7bWFyZ2luLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogNSl9Lm1iLTN7bWFyZ2luLWJvdHRvbTpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9Lm1iLTR7bWFyZ2luLWJvdHRvbTpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9Lm1sLTF7bWFyZ2luLWxlZnQ6dmFyKC0tc3BhY2luZyl9LmJsb2Nre2Rpc3BsYXk6YmxvY2t9LmZsZXh7ZGlzcGxheTpmbGV4fS5ncmlke2Rpc3BsYXk6Z3JpZH0uaGlkZGVue2Rpc3BsYXk6bm9uZX0uaW5saW5le2Rpc3BsYXk6aW5saW5lfS50YWJsZXtkaXNwbGF5OnRhYmxlfS5hc3BlY3Qtc3F1YXJle2FzcGVjdC1yYXRpbzoxfS5oLTFcLzN7aGVpZ2h0OjMzLjMzMzMlfS5oLTJ7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0uaC0yXC41e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMi41KX0uaC0ze2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LmgtM1wuNXtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMuNSl9LmgtNHtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDQpfS5oLTV7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0uaC02e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogNil9LmgtOHtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDgpfS5oLTl7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiA5KX0uaC0xMHtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEwKX0uaC0xMntoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEyKX0uaC0xNHtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDE0KX0uaC1cWzlweFxde2hlaWdodDo5cHh9LmgtXFsxMDhweFxde2hlaWdodDoxMDhweH0uaC1mdWxse2hlaWdodDoxMDAlfS5tYXgtaC1cWzg4ZHZoXF17bWF4LWhlaWdodDo4OGR2aH0ubWluLWgtMHttaW4taGVpZ2h0OjB9Lm1pbi1oLWR2aHttaW4taGVpZ2h0OjEwMGR2aH0udy0xXC8ze3dpZHRoOjMzLjMzMzMlfS53LTJ7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS53LTJcLjV7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIuNSl9LnctM3t3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LnctM1wuNXt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogMy41KX0udy00e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0udy01e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0udy02e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiA2KX0udy04e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiA4KX0udy05e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiA5KX0udy0xMHt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTApfS53LTEye3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiAxMil9LnctMTR7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDE0KX0udy0xNnt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTYpfS53LVxbOXB4XF17d2lkdGg6OXB4fS53LVxbMTA4cHhcXXt3aWR0aDoxMDhweH0udy1mdWxse3dpZHRoOjEwMCV9LnctbWF4e3dpZHRoOm1heC1jb250ZW50fS5tYXgtdy0zeGx7bWF4LXdpZHRoOnZhcigtLWNvbnRhaW5lci0zeGwpfS5tYXgtdy02eGx7bWF4LXdpZHRoOnZhcigtLWNvbnRhaW5lci02eGwpfS5tYXgtdy1cWzE1MHB4XF17bWF4LXdpZHRoOjE1MHB4fS5tYXgtdy1cWzI4MHB4XF17bWF4LXdpZHRoOjI4MHB4fS5tYXgtdy1cWzMyMHB4XF17bWF4LXdpZHRoOjMyMHB4fS5tYXgtdy1cWzQyMHB4XF17bWF4LXdpZHRoOjQyMHB4fS5tYXgtdy1cWzQ2MHB4XF17bWF4LXdpZHRoOjQ2MHB4fS5tYXgtdy1cWzc2MHB4XF17bWF4LXdpZHRoOjc2MHB4fS5tYXgtdy1cW21pblwoOTR2d1wsODIwcHhcLGNhbGNcKDEwMGR2aC0xOTBweFwpXClcXXttYXgtd2lkdGg6bWluKDk0dncsODIwcHgsMTAwZHZoIC0gMTkwcHgpfS5tYXgtdy1mdWxse21heC13aWR0aDoxMDAlfS5tYXgtdy1zbXttYXgtd2lkdGg6dmFyKC0tY29udGFpbmVyLXNtKX0ubWluLXctXFsyMjBweFxde21pbi13aWR0aDoyMjBweH0ubWluLXctXFsyNDBweFxde21pbi13aWR0aDoyNDBweH0uZmxleC0xe2ZsZXg6MX0uc2hyaW5rLTB7ZmxleC1zaHJpbms6MH0uZ3Jvd3tmbGV4LWdyb3c6MX0uLXJvdGF0ZS05MHtyb3RhdGU6LTkwZGVnfS5yb3RhdGUtNDV7cm90YXRlOjQ1ZGVnfS5yb3RhdGUtOTB7cm90YXRlOjkwZGVnfS5yb3RhdGUtMTgwe3JvdGF0ZToxODBkZWd9LnRyYW5zZm9ybXt0cmFuc2Zvcm06dmFyKC0tdHctcm90YXRlLXgsKSB2YXIoLS10dy1yb3RhdGUteSwpIHZhcigtLXR3LXJvdGF0ZS16LCkgdmFyKC0tdHctc2tldy14LCkgdmFyKC0tdHctc2tldy15LCl9LmN1cnNvci1jcm9zc2hhaXJ7Y3Vyc29yOmNyb3NzaGFpcn0uY3Vyc29yLW5vbmV7Y3Vyc29yOm5vbmV9LmN1cnNvci1wb2ludGVye2N1cnNvcjpwb2ludGVyfS50b3VjaC1ub25le3RvdWNoLWFjdGlvbjpub25lfS5yZXNpemV7cmVzaXplOmJvdGh9LmdyaWQtY29scy0ye2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMixtaW5tYXgoMCwxZnIpKX0uZ3JpZC1jb2xzLTN7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgzLG1pbm1heCgwLDFmcikpfS5ncmlkLWNvbHMtNHtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsbWlubWF4KDAsMWZyKSl9LmdyaWQtcm93cy0ye2dyaWQtdGVtcGxhdGUtcm93czpyZXBlYXQoMixtaW5tYXgoMCwxZnIpKX0uZmxleC1jb2x7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5mbGV4LXdyYXB7ZmxleC13cmFwOndyYXB9LnBsYWNlLWl0ZW1zLWNlbnRlcntwbGFjZS1pdGVtczpjZW50ZXJ9LmNvbnRlbnQtc3RhcnR7YWxpZ24tY29udGVudDpmbGV4LXN0YXJ0fS5pdGVtcy1jZW50ZXJ7YWxpZ24taXRlbXM6Y2VudGVyfS5pdGVtcy1lbmR7YWxpZ24taXRlbXM6ZmxleC1lbmR9Lmp1c3RpZnktYmV0d2VlbntqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uanVzdGlmeS1jZW50ZXJ7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uZ2FwLTF7Z2FwOnZhcigtLXNwYWNpbmcpfS5nYXAtMVwuNXtnYXA6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEuNSl9LmdhcC0ye2dhcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9LmdhcC0yXC41e2dhcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMi41KX0uZ2FwLTN7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0uZ2FwLTR7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0uZ2FwLTV7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0uZ2FwLTZ7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA2KX0uZ2FwLVxbMnB4XF17Z2FwOjJweH0uZ2FwLXgtOHtjb2x1bW4tZ2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA4KX0uZ2FwLXktMXtyb3ctZ2FwOnZhcigtLXNwYWNpbmcpfS5vdmVyZmxvdy1oaWRkZW57b3ZlcmZsb3c6aGlkZGVufS5vdmVyZmxvdy14LWF1dG97b3ZlcmZsb3cteDphdXRvfS5vdmVyZmxvdy15LWF1dG97b3ZlcmZsb3cteTphdXRvfS5yb3VuZGVke2JvcmRlci1yYWRpdXM6LjI1cmVtfS5yb3VuZGVkLVxbMnB4XF17Ym9yZGVyLXJhZGl1czoycHh9LnJvdW5kZWQtZnVsbHtib3JkZXItcmFkaXVzOjMuNDAyODJlMzhweH0ucm91bmRlZC1sZ3tib3JkZXItcmFkaXVzOnZhcigtLXJhZGl1cy1sZyl9LnJvdW5kZWQtbWR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yYWRpdXMtbWQpfS5yb3VuZGVkLXNte2JvcmRlci1yYWRpdXM6dmFyKC0tcmFkaXVzLXNtKX0ucm91bmRlZC1yLW1ke2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOnZhcigtLXJhZGl1cy1tZCk7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6dmFyKC0tcmFkaXVzLW1kKX0uYm9yZGVye2JvcmRlci1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci13aWR0aDoxcHh9LmJvcmRlci0ye2JvcmRlci1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci13aWR0aDoycHh9LmJvcmRlci10e2JvcmRlci10b3Atc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItdG9wLXdpZHRoOjFweH0uYm9yZGVyLXQtMntib3JkZXItdG9wLXN0eWxlOnZhcigtLXR3LWJvcmRlci1zdHlsZSk7Ym9yZGVyLXRvcC13aWR0aDoycHh9LmJvcmRlci1yLTJ7Ym9yZGVyLXJpZ2h0LXN0eWxlOnZhcigtLXR3LWJvcmRlci1zdHlsZSk7Ym9yZGVyLXJpZ2h0LXdpZHRoOjJweH0uYm9yZGVyLWJ7Ym9yZGVyLWJvdHRvbS1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci1ib3R0b20td2lkdGg6MXB4fS5ib3JkZXItYi0ye2JvcmRlci1ib3R0b20tc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItYm90dG9tLXdpZHRoOjJweH0uYm9yZGVyLWItNHtib3JkZXItYm90dG9tLXN0eWxlOnZhcigtLXR3LWJvcmRlci1zdHlsZSk7Ym9yZGVyLWJvdHRvbS13aWR0aDo0cHh9LmJvcmRlci1sLTJ7Ym9yZGVyLWxlZnQtc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItbGVmdC13aWR0aDoycHh9LmJvcmRlci1sLTR7Ym9yZGVyLWxlZnQtc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItbGVmdC13aWR0aDo0cHh9LmJvcmRlci1cW1wjN2VmMGM4XF1cLzQwe2JvcmRlci1jb2xvcjojN2VmMGM4NjZ9LmJvcmRlci1cW1wjNjJlNmZmXF1cLzQwe2JvcmRlci1jb2xvcjojNjJlNmZmNjZ9LmJvcmRlci1cW1wjZThjNTZhXF17Ym9yZGVyLWNvbG9yOiNlOGM1NmF9LmJvcmRlci1cW1wjZmY5YTNjXF1cLzQwe2JvcmRlci1jb2xvcjojZmY5YTNjNjZ9LmJvcmRlci1hbWJlcmdsb3ctNDAwXC80MHtib3JkZXItY29sb3I6I2ZmYzg1NzY2fUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1hbWJlcmdsb3ctNDAwXC80MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApIDQwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItYW1iZXJnbG93LTQwMFwvNTB7Ym9yZGVyLWNvbG9yOiNmZmM4NTc4MH1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItYW1iZXJnbG93LTQwMFwvNTB7Ym9yZGVyLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKSA1MCUsdHJhbnNwYXJlbnQpfX0uYm9yZGVyLWFtYmVyZ2xvdy01MDB7Ym9yZGVyLWNvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy01MDApfS5ib3JkZXItYW1iZXJnbG93LTUwMFwvNjB7Ym9yZGVyLWNvbG9yOiNlOGE5M2M5OX1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItYW1iZXJnbG93LTUwMFwvNjB7Ym9yZGVyLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hbWJlcmdsb3ctNTAwKSA2MCUsdHJhbnNwYXJlbnQpfX0uYm9yZGVyLWFwcGxlLTQwMFwvNDB7Ym9yZGVyLWNvbG9yOiNmZjZiNmI2Nn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItYXBwbGUtNDAwXC80MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFwcGxlLTQwMCkgNDAlLHRyYW5zcGFyZW50KX19LmJvcmRlci1hcHBsZS00MDBcLzcwe2JvcmRlci1jb2xvcjojZmY2YjZiYjN9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYm9yZGVyLWFwcGxlLTQwMFwvNzB7Ym9yZGVyLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hcHBsZS00MDApIDcwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItYmxhY2tcLzQwe2JvcmRlci1jb2xvcjojMDAwNn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItYmxhY2tcLzQwe2JvcmRlci1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItYmxhY2spIDQwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItcGl0LTUwMHtib3JkZXItY29sb3I6dmFyKC0tY29sb3ItcGl0LTUwMCl9LmJvcmRlci1waXQtNjAwe2JvcmRlci1jb2xvcjp2YXIoLS1jb2xvci1waXQtNjAwKX0uYm9yZGVyLXBpdC03MDBcLzYwe2JvcmRlci1jb2xvcjojMTYzMDFmOTl9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYm9yZGVyLXBpdC03MDBcLzYwe2JvcmRlci1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTcwMCkgNjAlLHRyYW5zcGFyZW50KX19LmJvcmRlci1yZWQtNTAwXC83MHtib3JkZXItY29sb3I6I2ZiMmMzNmIzfUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1yZWQtNTAwXC83MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLXJlZC01MDApIDcwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItYi1cW1wjN2UyMzI3XF17Ym9yZGVyLWJvdHRvbS1jb2xvcjojN2UyMzI3fS5iZy1cW1wjMGExMjBhXF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzBhMTIwYWQ5fS5iZy1cW1wjMGExMjBhXF1cLzkwe2JhY2tncm91bmQtY29sb3I6IzBhMTIwYWU2fS5iZy1cW1wjMGEwNjE0XF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzBhMDYxNGQ5fS5iZy1cW1wjMGEwNjE0XF1cLzkwe2JhY2tncm91bmQtY29sb3I6IzBhMDYxNGU2fS5iZy1cW1wjMDUwYTE0XF1cLzgwe2JhY2tncm91bmQtY29sb3I6IzA1MGExNGNjfS5iZy1cW1wjMDUwYTE0XF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzA1MGExNGQ5fS5iZy1cW1wjMDYwZjBhXF1cLzg4e2JhY2tncm91bmQtY29sb3I6IzA2MGYwYWUwfS5iZy1cW1wjMDYwZjBhXF1cLzkwe2JhY2tncm91bmQtY29sb3I6IzA2MGYwYWU2fS5iZy1cW1wjNjJlNmZmXF17YmFja2dyb3VuZC1jb2xvcjojNjJlNmZmfS5iZy1cW1wjMDcwZDE4XF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzA3MGQxOGQ5fS5iZy1cW1wjMDcwZDE4XF1cLzkwe2JhY2tncm91bmQtY29sb3I6IzA3MGQxOGU2fS5iZy1cW1wjMDcwZDIyXF1cLzgwe2JhY2tncm91bmQtY29sb3I6IzA3MGQyMmNjfS5iZy1cW1wjMDcwZDIyXF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzA3MGQyMmQ5fS5iZy1cW1wjMDUwNzBmXF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzA1MDcwZmQ5fS5iZy1cW1wjMDUwNzBmXF1cLzkwe2JhY2tncm91bmQtY29sb3I6IzA1MDcwZmU2fS5iZy1cW1wjMTIwODFmXF1cLzgwe2JhY2tncm91bmQtY29sb3I6IzEyMDgxZmNjfS5iZy1cW1wjMTIwODFmXF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzEyMDgxZmQ5fS5iZy1cW1wjMTAxNDI1XF1cLzc4e2JhY2tncm91bmQtY29sb3I6IzEwMTQyNWM3fS5iZy1cW1wjMTAxNDI1XF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzEwMTQyNWQ5fS5iZy1cW1wjMTcxMDIyXF1cLzgwe2JhY2tncm91bmQtY29sb3I6IzE3MTAyMmNjfS5iZy1cW1wjMTcxMDIyXF1cLzg1e2JhY2tncm91bmQtY29sb3I6IzE3MTAyMmQ5fS5iZy1cW1wjYjI4YmZmXF17YmFja2dyb3VuZC1jb2xvcjojYjI4YmZmfS5iZy1cW1wjYzA4NGZjXF17YmFja2dyb3VuZC1jb2xvcjojYzA4NGZjfS5iZy1cW1wjZDY0ZjhjXF17YmFja2dyb3VuZC1jb2xvcjojZDY0ZjhjfS5iZy1cW1wjZmY4YzQyXF17YmFja2dyb3VuZC1jb2xvcjojZmY4YzQyfS5iZy1cW1wjZmZlMDhhXF17YmFja2dyb3VuZC1jb2xvcjojZmZlMDhhfS5iZy1hbWJlcmdsb3ctNDAwe2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTQwMCl9LmJnLWFtYmVyZ2xvdy00MDBcLzEwe2JhY2tncm91bmQtY29sb3I6I2ZmYzg1NzFhfUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJnLWFtYmVyZ2xvdy00MDBcLzEwe2JhY2tncm91bmQtY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApIDEwJSx0cmFuc3BhcmVudCl9fS5iZy1hbWJlcmdsb3ctNDAwXC8xNXtiYWNrZ3JvdW5kLWNvbG9yOiNmZmM4NTcyNn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1hbWJlcmdsb3ctNDAwXC8xNXtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKSAxNSUsdHJhbnNwYXJlbnQpfX0uYmctYXBwbGUtNDAwe2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItYXBwbGUtNDAwKX0uYmctYXBwbGUtNTAwXC8yNXtiYWNrZ3JvdW5kLWNvbG9yOiNlMDQzNDg0MH1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1hcHBsZS01MDBcLzI1e2JhY2tncm91bmQtY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFwcGxlLTUwMCkgMjUlLHRyYW5zcGFyZW50KX19LmJnLWJsYWNrXC83NXtiYWNrZ3JvdW5kLWNvbG9yOiMwMDAwMDBiZn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1ibGFja1wvNzV7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItYmxhY2spIDc1JSx0cmFuc3BhcmVudCl9fS5iZy1tb3NzLTQwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLW1vc3MtNDAwKX0uYmctcGl0LTYwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC02MDApfS5iZy1waXQtNzAwe2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItcGl0LTcwMCl9LmJnLXBpdC04MDB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtODAwKX0uYmctcGl0LTgwMFwvODB7YmFja2dyb3VuZC1jb2xvcjojMGYyNDE3Y2N9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTgwMFwvODB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTgwMCkgODAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC04NTB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtODUwKX0uYmctcGl0LTg1MFwvOTB7YmFja2dyb3VuZC1jb2xvcjojMGMxZDEzZTZ9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTg1MFwvOTB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTg1MCkgOTAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC05MDB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtOTAwKX0uYmctcGl0LTkwMFwvODB7YmFja2dyb3VuZC1jb2xvcjojMGExODEwY2N9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTkwMFwvODB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTkwMCkgODAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC05NTB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtOTUwKX0uYmctcGl0LTk1MFwvNTB7YmFja2dyb3VuZC1jb2xvcjojMDYwZjBhODB9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTk1MFwvNTB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTk1MCkgNTAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC05NTBcLzgwe2JhY2tncm91bmQtY29sb3I6IzA2MGYwYWNjfUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJnLXBpdC05NTBcLzgwe2JhY2tncm91bmQtY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLXBpdC05NTApIDgwJSx0cmFuc3BhcmVudCl9fS5iZy1waXQtOTUwXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMwNjBmMGFkOX1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1waXQtOTUwXC84NXtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1waXQtOTUwKSA4NSUsdHJhbnNwYXJlbnQpfX0uYmctcmVkLTk1MFwvODB7YmFja2dyb3VuZC1jb2xvcjojNDYwODA5Y2N9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcmVkLTk1MFwvODB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcmVkLTk1MCkgODAlLHRyYW5zcGFyZW50KX19LmJnLXZlbm9tLTQwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXZlbm9tLTQwMCl9LnAtMXtwYWRkaW5nOnZhcigtLXNwYWNpbmcpfS5wLTJ7cGFkZGluZzpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9LnAtM3twYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0ucC0zXC41e3BhZGRpbmc6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMuNSl9LnAtNHtwYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0ucC02e3BhZGRpbmc6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDYpfS5weC0xe3BhZGRpbmctaW5saW5lOnZhcigtLXNwYWNpbmcpfS5weC0xXC41e3BhZGRpbmctaW5saW5lOmNhbGModmFyKC0tc3BhY2luZykgKiAxLjUpfS5weC0ye3BhZGRpbmctaW5saW5lOmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0ucHgtMlwuNXtwYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogMi41KX0ucHgtM3twYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LnB4LTNcLjV7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMuNSl9LnB4LTR7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDQpfS5weC04e3BhZGRpbmctaW5saW5lOmNhbGModmFyKC0tc3BhY2luZykgKiA4KX0ucHktMFwuNXtwYWRkaW5nLWJsb2NrOmNhbGModmFyKC0tc3BhY2luZykgKiAuNSl9LnB5LTF7cGFkZGluZy1ibG9jazp2YXIoLS1zcGFjaW5nKX0ucHktMVwuNXtwYWRkaW5nLWJsb2NrOmNhbGModmFyKC0tc3BhY2luZykgKiAxLjUpfS5weS0ye3BhZGRpbmctYmxvY2s6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS5weS0yXC41e3BhZGRpbmctYmxvY2s6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIuNSl9LnB5LTN7cGFkZGluZy1ibG9jazpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LnB5LTR7cGFkZGluZy1ibG9jazpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9LnB0LTBcLjV7cGFkZGluZy10b3A6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIC41KX0ucHQtMXtwYWRkaW5nLXRvcDp2YXIoLS1zcGFjaW5nKX0ucHQtMVwuNXtwYWRkaW5nLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMS41KX0ucHQtMntwYWRkaW5nLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9LnB0LTN7cGFkZGluZy10b3A6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMpfS5wdC01e3BhZGRpbmctdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0ucGItMXtwYWRkaW5nLWJvdHRvbTp2YXIoLS1zcGFjaW5nKX0ucGItM3twYWRkaW5nLWJvdHRvbTpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LnBiLTEwe3BhZGRpbmctYm90dG9tOmNhbGModmFyKC0tc3BhY2luZykgKiAxMCl9LnRleHQtY2VudGVye3RleHQtYWxpZ246Y2VudGVyfS50ZXh0LWxlZnR7dGV4dC1hbGlnbjpsZWZ0fS50ZXh0LXJpZ2h0e3RleHQtYWxpZ246cmlnaHR9LmZvbnQtZGlzcGxheXtmb250LWZhbWlseTp2YXIoLS1mb250LWRpc3BsYXkpfS50ZXh0LTJ4bHtmb250LXNpemU6dmFyKC0tdGV4dC0yeGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC0yeGwtLWxpbmUtaGVpZ2h0KSl9LnRleHQtM3hse2ZvbnQtc2l6ZTp2YXIoLS10ZXh0LTN4bCk7bGluZS1oZWlnaHQ6dmFyKC0tdHctbGVhZGluZyx2YXIoLS10ZXh0LTN4bC0tbGluZS1oZWlnaHQpKX0udGV4dC1sZ3tmb250LXNpemU6dmFyKC0tdGV4dC1sZyk7bGluZS1oZWlnaHQ6dmFyKC0tdHctbGVhZGluZyx2YXIoLS10ZXh0LWxnLS1saW5lLWhlaWdodCkpfS50ZXh0LXNte2ZvbnQtc2l6ZTp2YXIoLS10ZXh0LXNtKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQtc20tLWxpbmUtaGVpZ2h0KSl9LnRleHQteGx7Zm9udC1zaXplOnZhcigtLXRleHQteGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC14bC0tbGluZS1oZWlnaHQpKX0udGV4dC1cWzZweFxde2ZvbnQtc2l6ZTo2cHh9LnRleHQtXFs3cHhcXXtmb250LXNpemU6N3B4fS50ZXh0LVxbOHB4XF17Zm9udC1zaXplOjhweH0udGV4dC1cWzlweFxde2ZvbnQtc2l6ZTo5cHh9LnRleHQtXFsxMHB4XF17Zm9udC1zaXplOjEwcHh9LnRleHQtXFsxMXB4XF17Zm9udC1zaXplOjExcHh9LnRleHQtXFsxMlwuNXB4XF17Zm9udC1zaXplOjEyLjVweH0udGV4dC1cWzEycHhcXXtmb250LXNpemU6MTJweH0udGV4dC1cWzE0cHhcXXtmb250LXNpemU6MTRweH0ubGVhZGluZy1ub25ley0tdHctbGVhZGluZzoxO2xpbmUtaGVpZ2h0OjF9LmxlYWRpbmctcmVsYXhlZHstLXR3LWxlYWRpbmc6dmFyKC0tbGVhZGluZy1yZWxheGVkKTtsaW5lLWhlaWdodDp2YXIoLS1sZWFkaW5nLXJlbGF4ZWQpfS5sZWFkaW5nLXRpZ2h0ey0tdHctbGVhZGluZzp2YXIoLS1sZWFkaW5nLXRpZ2h0KTtsaW5lLWhlaWdodDp2YXIoLS1sZWFkaW5nLXRpZ2h0KX0uZm9udC1ib2xkey0tdHctZm9udC13ZWlnaHQ6dmFyKC0tZm9udC13ZWlnaHQtYm9sZCk7Zm9udC13ZWlnaHQ6dmFyKC0tZm9udC13ZWlnaHQtYm9sZCl9LmZvbnQtbWVkaXVtey0tdHctZm9udC13ZWlnaHQ6dmFyKC0tZm9udC13ZWlnaHQtbWVkaXVtKTtmb250LXdlaWdodDp2YXIoLS1mb250LXdlaWdodC1tZWRpdW0pfS50cmFja2luZy1cWzBcLjJlbVxdey0tdHctdHJhY2tpbmc6LjJlbTtsZXR0ZXItc3BhY2luZzouMmVtfS50cmFja2luZy1cWzBcLjNlbVxdey0tdHctdHJhY2tpbmc6LjNlbTtsZXR0ZXItc3BhY2luZzouM2VtfS50cmFja2luZy1cWzBcLjE4ZW1cXXstLXR3LXRyYWNraW5nOi4xOGVtO2xldHRlci1zcGFjaW5nOi4xOGVtfS50cmFja2luZy1cWzBcLjI1ZW1cXXstLXR3LXRyYWNraW5nOi4yNWVtO2xldHRlci1zcGFjaW5nOi4yNWVtfS50cmFja2luZy1ub3JtYWx7LS10dy10cmFja2luZzp2YXIoLS10cmFja2luZy1ub3JtYWwpO2xldHRlci1zcGFjaW5nOnZhcigtLXRyYWNraW5nLW5vcm1hbCl9LnRyYWNraW5nLXdpZGV7LS10dy10cmFja2luZzp2YXIoLS10cmFja2luZy13aWRlKTtsZXR0ZXItc3BhY2luZzp2YXIoLS10cmFja2luZy13aWRlKX0udHJhY2tpbmctd2lkZXJ7LS10dy10cmFja2luZzp2YXIoLS10cmFja2luZy13aWRlcik7bGV0dGVyLXNwYWNpbmc6dmFyKC0tdHJhY2tpbmctd2lkZXIpfS50cmFja2luZy13aWRlc3R7LS10dy10cmFja2luZzp2YXIoLS10cmFja2luZy13aWRlc3QpO2xldHRlci1zcGFjaW5nOnZhcigtLXRyYWNraW5nLXdpZGVzdCl9LndoaXRlc3BhY2Utbm93cmFwe3doaXRlLXNwYWNlOm5vd3JhcH0udGV4dC1cW1wjNGRkOGMwXF17Y29sb3I6IzRkZDhjMH0udGV4dC1cW1wjN2VmMGEwXF17Y29sb3I6IzdlZjBhMH0udGV4dC1cW1wjN2VmMGM4XF17Y29sb3I6IzdlZjBjOH0udGV4dC1cW1wjOGVmMDVhXF17Y29sb3I6IzhlZjA1YX0udGV4dC1cW1wjOWZiMGQwXF17Y29sb3I6IzlmYjBkMH0udGV4dC1cW1wjOWZjM2Q5XF17Y29sb3I6IzlmYzNkOX0udGV4dC1cW1wjOWZkOGMyXF17Y29sb3I6IzlmZDhjMn0udGV4dC1cW1wjOWZkOGZmXF17Y29sb3I6IzlmZDhmZn0udGV4dC1cW1wjNjJlNmZmXF17Y29sb3I6IzYyZTZmZn0udGV4dC1cW1wjMDUyNTMwXF17Y29sb3I6IzA1MjUzMH0udGV4dC1cW1wjMjIxNjA0XF17Y29sb3I6IzIyMTYwNH0udGV4dC1cW1wjMjQxMDMzXF17Y29sb3I6IzI0MTAzM30udGV4dC1cW1wjYjI4YmZmXF17Y29sb3I6I2IyOGJmZn0udGV4dC1cW1wjYmZmN2ZmXF17Y29sb3I6I2JmZjdmZn0udGV4dC1cW1wjYzliOGUwXF17Y29sb3I6I2M5YjhlMH0udGV4dC1cW1wjZThjNTZhXF17Y29sb3I6I2U4YzU2YX0udGV4dC1cW1wjZmY1ZDVkXF17Y29sb3I6I2ZmNWQ1ZH0udGV4dC1cW1wjZmY1ZDhmXF17Y29sb3I6I2ZmNWQ4Zn0udGV4dC1cW1wjZmY1ZGEyXF17Y29sb3I6I2ZmNWRhMn0udGV4dC1cW1wjZmY4YzQyXF17Y29sb3I6I2ZmOGM0Mn0udGV4dC1cW1wjZmY5YTNjXF17Y29sb3I6I2ZmOWEzY30udGV4dC1cW1wjZmY5ZGI4XF17Y29sb3I6I2ZmOWRiOH0udGV4dC1cW1wjZmZkMTY2XF17Y29sb3I6I2ZmZDE2Nn0udGV4dC1hbWJlcmdsb3ctMzAwe2NvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy0zMDApfS50ZXh0LWFtYmVyZ2xvdy00MDB7Y29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTQwMCl9LnRleHQtYXBwbGUtNDAwe2NvbG9yOnZhcigtLWNvbG9yLWFwcGxlLTQwMCl9LnRleHQtbW9zcy0xMDB7Y29sb3I6dmFyKC0tY29sb3ItbW9zcy0xMDApfS50ZXh0LW1vc3MtMjAwe2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKX0udGV4dC1tb3NzLTMwMHtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTMwMCl9LnRleHQtbW9zcy00MDB7Y29sb3I6dmFyKC0tY29sb3ItbW9zcy00MDApfS50ZXh0LXBpdC01MDB7Y29sb3I6dmFyKC0tY29sb3ItcGl0LTUwMCl9LnRleHQtcGl0LTk1MHtjb2xvcjp2YXIoLS1jb2xvci1waXQtOTUwKX0udGV4dC1yZWQtMjAwe2NvbG9yOnZhcigtLWNvbG9yLXJlZC0yMDApfS50ZXh0LXJlZC00MDB7Y29sb3I6dmFyKC0tY29sb3ItcmVkLTQwMCl9LnRleHQtdmVub20tNDAwe2NvbG9yOnZhcigtLWNvbG9yLXZlbm9tLTQwMCl9Lm5vcm1hbC1jYXNle3RleHQtdHJhbnNmb3JtOm5vbmV9LnVwcGVyY2FzZXt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9LnRhYnVsYXItbnVtc3stLXR3LW51bWVyaWMtc3BhY2luZzp0YWJ1bGFyLW51bXM7Zm9udC12YXJpYW50LW51bWVyaWM6dmFyKC0tdHctb3JkaW5hbCwpIHZhcigtLXR3LXNsYXNoZWQtemVybywpIHZhcigtLXR3LW51bWVyaWMtZmlndXJlLCkgdmFyKC0tdHctbnVtZXJpYy1zcGFjaW5nLCkgdmFyKC0tdHctbnVtZXJpYy1mcmFjdGlvbiwpfS5vcGFjaXR5LTIwe29wYWNpdHk6LjJ9Lm9wYWNpdHktNTB7b3BhY2l0eTouNX0ub3BhY2l0eS02MHtvcGFjaXR5Oi42fS5zaGFkb3ctXFswXzBfNnB4X3JnYmFcKDE3OFwsMTM5XCwyNTVcLDBcLjhcKVxdey0tdHctc2hhZG93OjAgMCA2cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNiMjhiZmZjYyk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFswXzBfOHB4X3JnYmFcKDk4XCwyMzBcLDI1NVwsMFwuOFwpXF17LS10dy1zaGFkb3c6MCAwIDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsIzYyZTZmZmNjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF84cHhfcmdiYVwoMTkyXCwxMzJcLDI1MlwsMFwuOFwpXF17LS10dy1zaGFkb3c6MCAwIDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsI2MwODRmY2NjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF84cHhfcmdiYVwoMjE0XCw3OVwsMTQwXCwwXC44XClcXXstLXR3LXNoYWRvdzowIDAgOHB4IHZhcigtLXR3LXNoYWRvdy1jb2xvciwjZDY0ZjhjY2MpO2JveC1zaGFkb3c6dmFyKC0tdHctaW5zZXQtc2hhZG93KSx2YXIoLS10dy1pbnNldC1yaW5nLXNoYWRvdyksdmFyKC0tdHctcmluZy1vZmZzZXQtc2hhZG93KSx2YXIoLS10dy1yaW5nLXNoYWRvdyksdmFyKC0tdHctc2hhZG93KX0uc2hhZG93LVxbMF8wXzhweF9yZ2JhXCgyNTVcLDEwN1wsMTA3XCwwXC44XClcXXstLXR3LXNoYWRvdzowIDAgOHB4IHZhcigtLXR3LXNoYWRvdy1jb2xvciwjZmY2YjZiY2MpO2JveC1zaGFkb3c6dmFyKC0tdHctaW5zZXQtc2hhZG93KSx2YXIoLS10dy1pbnNldC1yaW5nLXNoYWRvdyksdmFyKC0tdHctcmluZy1vZmZzZXQtc2hhZG93KSx2YXIoLS10dy1yaW5nLXNoYWRvdyksdmFyKC0tdHctc2hhZG93KX0uc2hhZG93LVxbMF8wXzhweF9yZ2JhXCgyNTVcLDE0MFwsNjZcLDBcLjhcKVxdey0tdHctc2hhZG93OjAgMCA4cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNmZjhjNDJjYyk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFswXzBfOHB4X3JnYmFcKDI1NVwsMjAwXCw4N1wsMFwuOFwpXF17LS10dy1zaGFkb3c6MCAwIDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsI2ZmYzg1N2NjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF8xNHB4X3JnYmFcKDIzMlwsMTk3XCwxMDZcLDBcLjQ1XClcXXstLXR3LXNoYWRvdzowIDAgMTRweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsI2U4YzU2YTczKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF8xOHB4X3JnYmFcKDIzOVwsNjhcLDY4XCwwXC4zNVwpXF17LS10dy1zaGFkb3c6MCAwIDE4cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNlZjQ0NDQ1OSk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFswXzBfMThweF9yZ2JhXCgyNTVcLDIwMFwsODdcLDBcLjE4XClcXXstLXR3LXNoYWRvdzowIDAgMThweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsI2ZmYzg1NzJlKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF8yOHB4X3JnYmFcKDI1NVwsOTNcLDE0M1wsMFwuMjhcKVxdey0tdHctc2hhZG93OjAgMCAyOHB4IHZhcigtLXR3LXNoYWRvdy1jb2xvciwjZmY1ZDhmNDcpO2JveC1zaGFkb3c6dmFyKC0tdHctaW5zZXQtc2hhZG93KSx2YXIoLS10dy1pbnNldC1yaW5nLXNoYWRvdyksdmFyKC0tdHctcmluZy1vZmZzZXQtc2hhZG93KSx2YXIoLS10dy1yaW5nLXNoYWRvdyksdmFyKC0tdHctc2hhZG93KX0uc2hhZG93LVxbMF80MHB4XzkwcHhfLTIwcHhfcmdiYVwoMFwsMFwsMFwsMFwuOVwpXF17LS10dy1zaGFkb3c6MCA0MHB4IDkwcHggLTIwcHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCMwMDAwMDBlNik7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFtpbnNldF8wXzJweF84cHhfcmdiYVwoMFwsMFwsMFwsMFwuNTVcKVxdey0tdHctc2hhZG93Omluc2V0IDAgMnB4IDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsIzAwMDAwMDhjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnJpbmd7LS10dy1yaW5nLXNoYWRvdzp2YXIoLS10dy1yaW5nLWluc2V0LCkgMCAwIDAgY2FsYygxcHggKyB2YXIoLS10dy1yaW5nLW9mZnNldC13aWR0aCkpIHZhcigtLXR3LXJpbmctY29sb3IsY3VycmVudGNvbG9yKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9Lm91dGxpbmV7b3V0bGluZS1zdHlsZTp2YXIoLS10dy1vdXRsaW5lLXN0eWxlKTtvdXRsaW5lLXdpZHRoOjFweH0uYmx1cnstLXR3LWJsdXI6Ymx1cig4cHgpO2ZpbHRlcjp2YXIoLS10dy1ibHVyLCkgdmFyKC0tdHctYnJpZ2h0bmVzcywpIHZhcigtLXR3LWNvbnRyYXN0LCkgdmFyKC0tdHctZ3JheXNjYWxlLCkgdmFyKC0tdHctaHVlLXJvdGF0ZSwpIHZhcigtLXR3LWludmVydCwpIHZhcigtLXR3LXNhdHVyYXRlLCkgdmFyKC0tdHctc2VwaWEsKSB2YXIoLS10dy1kcm9wLXNoYWRvdywpfS5ncmF5c2NhbGV7LS10dy1ncmF5c2NhbGU6Z3JheXNjYWxlKDEwMCUpO2ZpbHRlcjp2YXIoLS10dy1ibHVyLCkgdmFyKC0tdHctYnJpZ2h0bmVzcywpIHZhcigtLXR3LWNvbnRyYXN0LCkgdmFyKC0tdHctZ3JheXNjYWxlLCkgdmFyKC0tdHctaHVlLXJvdGF0ZSwpIHZhcigtLXR3LWludmVydCwpIHZhcigtLXR3LXNhdHVyYXRlLCkgdmFyKC0tdHctc2VwaWEsKSB2YXIoLS10dy1kcm9wLXNoYWRvdywpfS5maWx0ZXJ7ZmlsdGVyOnZhcigtLXR3LWJsdXIsKSB2YXIoLS10dy1icmlnaHRuZXNzLCkgdmFyKC0tdHctY29udHJhc3QsKSB2YXIoLS10dy1ncmF5c2NhbGUsKSB2YXIoLS10dy1odWUtcm90YXRlLCkgdmFyKC0tdHctaW52ZXJ0LCkgdmFyKC0tdHctc2F0dXJhdGUsKSB2YXIoLS10dy1zZXBpYSwpIHZhcigtLXR3LWRyb3Atc2hhZG93LCl9LmJhY2tkcm9wLWJsdXItXFsycHhcXXstLXR3LWJhY2tkcm9wLWJsdXI6Ymx1cigycHgpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOnZhcigtLXR3LWJhY2tkcm9wLWJsdXIsKSB2YXIoLS10dy1iYWNrZHJvcC1icmlnaHRuZXNzLCkgdmFyKC0tdHctYmFja2Ryb3AtY29udHJhc3QsKSB2YXIoLS10dy1iYWNrZHJvcC1ncmF5c2NhbGUsKSB2YXIoLS10dy1iYWNrZHJvcC1odWUtcm90YXRlLCkgdmFyKC0tdHctYmFja2Ryb3AtaW52ZXJ0LCkgdmFyKC0tdHctYmFja2Ryb3Atb3BhY2l0eSwpIHZhcigtLXR3LWJhY2tkcm9wLXNhdHVyYXRlLCkgdmFyKC0tdHctYmFja2Ryb3Atc2VwaWEsKTtiYWNrZHJvcC1maWx0ZXI6dmFyKC0tdHctYmFja2Ryb3AtYmx1ciwpIHZhcigtLXR3LWJhY2tkcm9wLWJyaWdodG5lc3MsKSB2YXIoLS10dy1iYWNrZHJvcC1jb250cmFzdCwpIHZhcigtLXR3LWJhY2tkcm9wLWdyYXlzY2FsZSwpIHZhcigtLXR3LWJhY2tkcm9wLWh1ZS1yb3RhdGUsKSB2YXIoLS10dy1iYWNrZHJvcC1pbnZlcnQsKSB2YXIoLS10dy1iYWNrZHJvcC1vcGFjaXR5LCkgdmFyKC0tdHctYmFja2Ryb3Atc2F0dXJhdGUsKSB2YXIoLS10dy1iYWNrZHJvcC1zZXBpYSwpfS5iYWNrZHJvcC1ibHVyLVxbM3B4XF17LS10dy1iYWNrZHJvcC1ibHVyOmJsdXIoM3B4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjp2YXIoLS10dy1iYWNrZHJvcC1ibHVyLCkgdmFyKC0tdHctYmFja2Ryb3AtYnJpZ2h0bmVzcywpIHZhcigtLXR3LWJhY2tkcm9wLWNvbnRyYXN0LCkgdmFyKC0tdHctYmFja2Ryb3AtZ3JheXNjYWxlLCkgdmFyKC0tdHctYmFja2Ryb3AtaHVlLXJvdGF0ZSwpIHZhcigtLXR3LWJhY2tkcm9wLWludmVydCwpIHZhcigtLXR3LWJhY2tkcm9wLW9wYWNpdHksKSB2YXIoLS10dy1iYWNrZHJvcC1zYXR1cmF0ZSwpIHZhcigtLXR3LWJhY2tkcm9wLXNlcGlhLCk7YmFja2Ryb3AtZmlsdGVyOnZhcigtLXR3LWJhY2tkcm9wLWJsdXIsKSB2YXIoLS10dy1iYWNrZHJvcC1icmlnaHRuZXNzLCkgdmFyKC0tdHctYmFja2Ryb3AtY29udHJhc3QsKSB2YXIoLS10dy1iYWNrZHJvcC1ncmF5c2NhbGUsKSB2YXIoLS10dy1iYWNrZHJvcC1odWUtcm90YXRlLCkgdmFyKC0tdHctYmFja2Ryb3AtaW52ZXJ0LCkgdmFyKC0tdHctYmFja2Ryb3Atb3BhY2l0eSwpIHZhcigtLXR3LWJhY2tkcm9wLXNhdHVyYXRlLCkgdmFyKC0tdHctYmFja2Ryb3Atc2VwaWEsKX0udHJhbnNpdGlvbnt0cmFuc2l0aW9uLXByb3BlcnR5OmNvbG9yLGJhY2tncm91bmQtY29sb3IsYm9yZGVyLWNvbG9yLG91dGxpbmUtY29sb3IsdGV4dC1kZWNvcmF0aW9uLWNvbG9yLGZpbGwsc3Ryb2tlLC0tdHctZ3JhZGllbnQtZnJvbSwtLXR3LWdyYWRpZW50LXZpYSwtLXR3LWdyYWRpZW50LXRvLG9wYWNpdHksYm94LXNoYWRvdyx0cmFuc2Zvcm0sdHJhbnNsYXRlLHNjYWxlLHJvdGF0ZSxmaWx0ZXIsLXdlYmtpdC1iYWNrZHJvcC1maWx0ZXIsYmFja2Ryb3AtZmlsdGVyLGRpc3BsYXksY29udGVudC12aXNpYmlsaXR5LG92ZXJsYXkscG9pbnRlci1ldmVudHM7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246dmFyKC0tdHctZWFzZSx2YXIoLS1kZWZhdWx0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uKSk7dHJhbnNpdGlvbi1kdXJhdGlvbjp2YXIoLS10dy1kdXJhdGlvbix2YXIoLS1kZWZhdWx0LXRyYW5zaXRpb24tZHVyYXRpb24pKX0udHJhbnNpdGlvbi1hbGx7dHJhbnNpdGlvbi1wcm9wZXJ0eTphbGw7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246dmFyKC0tdHctZWFzZSx2YXIoLS1kZWZhdWx0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uKSk7dHJhbnNpdGlvbi1kdXJhdGlvbjp2YXIoLS10dy1kdXJhdGlvbix2YXIoLS1kZWZhdWx0LXRyYW5zaXRpb24tZHVyYXRpb24pKX0uZHVyYXRpb24tMTUwey0tdHctZHVyYXRpb246LjE1czt0cmFuc2l0aW9uLWR1cmF0aW9uOi4xNXN9LmR1cmF0aW9uLTUwMHstLXR3LWR1cmF0aW9uOi41czt0cmFuc2l0aW9uLWR1cmF0aW9uOi41c30uZWFzZS1vdXR7LS10dy1lYXNlOnZhcigtLWVhc2Utb3V0KTt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjp2YXIoLS1lYXNlLW91dCl9LnNlbGVjdC1ub25ley13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lfS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCg5OFwsMjMwXCwyNTVcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICM2MmU2ZmY4MH0uXFt0ZXh0LXNoYWRvd1w6MF8wXzEycHhfcmdiYVwoOThcLDIzMFwsMjU1XCwwXC40NVwpXF17dGV4dC1zaGFkb3c6MCAwIDEycHggIzYyZTZmZjczfS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCgxMjZcLDI0MFwsMjAwXCwwXC41XClcXXt0ZXh0LXNoYWRvdzowIDAgMTJweCAjN2VmMGM4ODB9LlxbdGV4dC1zaGFkb3dcOjBfMF8xMnB4X3JnYmFcKDE0MlwsMjQwXCw5MFwsMFwuNDVcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICM4ZWYwNWE3M30uXFt0ZXh0LXNoYWRvd1w6MF8wXzEycHhfcmdiYVwoMTc4XCwxMzlcLDI1NVwsMFwuNVwpXF17dGV4dC1zaGFkb3c6MCAwIDEycHggI2IyOGJmZjgwfS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCgyMzJcLDE5N1wsMTA2XCwwXC41XClcXXt0ZXh0LXNoYWRvdzowIDAgMTJweCAjZThjNTZhODB9LlxbdGV4dC1zaGFkb3dcOjBfMF8xMnB4X3JnYmFcKDI1NVwsOTNcLDE0M1wsMFwuNVwpXF17dGV4dC1zaGFkb3c6MCAwIDEycHggI2ZmNWQ4ZjgwfS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCgyNTVcLDkzXCwxNjJcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICNmZjVkYTI4MH0uXFt0ZXh0LXNoYWRvd1w6MF8wXzEycHhfcmdiYVwoMjU1XCwxMDdcLDEwN1wsMFwuNlwpXF17dGV4dC1zaGFkb3c6MCAwIDEycHggI2ZmNmI2Yjk5fS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCgyNTVcLDE1NFwsNjBcLDBcLjRcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICNmZjlhM2M2Nn0uXFt0ZXh0LXNoYWRvd1w6MF8wXzE0cHhfcmdiYVwoMjU1XCwyMjRcLDEzOFwsMFwuNVwpXF17dGV4dC1zaGFkb3c6MCAwIDE0cHggI2ZmZTA4YTgwfS5cW3RleHQtc2hhZG93XDowXzBfMjRweF9yZ2JhXCgyNTVcLDkzXCwxNDNcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAyNHB4ICNmZjVkOGY4MH0uXFt0ZXh0LXNoYWRvd1w6MF8wXzI0cHhfcmdiYVwoMjU1XCw5M1wsMTYyXCwwXC41XClcXXt0ZXh0LXNoYWRvdzowIDAgMjRweCAjZmY1ZGEyODB9LlxbdGV4dC1zaGFkb3dcOjBfMF8yNHB4X3JnYmFcKDI1NVwsMTA3XCwxMDdcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAyNHB4ICNmZjZiNmI4MH1AbWVkaWEoaG92ZXI6aG92ZXIpey5ob3Zlclw6c2NhbGUtMTA1OmhvdmVyey0tdHctc2NhbGUteDoxMDUlOy0tdHctc2NhbGUteToxMDUlOy0tdHctc2NhbGUtejoxMDUlO3NjYWxlOnZhcigtLXR3LXNjYWxlLXgpIHZhcigtLXR3LXNjYWxlLXkpfS5ob3Zlclw6Ym9yZGVyLXJlZC00MDA6aG92ZXJ7Ym9yZGVyLWNvbG9yOnZhcigtLWNvbG9yLXJlZC00MDApfS5ob3Zlclw6YmctcGl0LTgwMDpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC04MDApfS5ob3Zlclw6YmctcmVkLTkwMDpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXJlZC05MDApfS5ob3Zlclw6dGV4dC1tb3NzLTEwMDpob3Zlcntjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTEwMCl9LmhvdmVyXDp0ZXh0LXdoaXRlOmhvdmVye2NvbG9yOnZhcigtLWNvbG9yLXdoaXRlKX19LmFjdGl2ZVw6dHJhbnNsYXRlLXktMFwuNTphY3RpdmV7LS10dy10cmFuc2xhdGUteTpjYWxjKHZhcigtLXNwYWNpbmcpICogLjUpO3RyYW5zbGF0ZTp2YXIoLS10dy10cmFuc2xhdGUteCkgdmFyKC0tdHctdHJhbnNsYXRlLXkpfS5kaXNhYmxlZFw6Y3Vyc29yLW5vdC1hbGxvd2VkOmRpc2FibGVke2N1cnNvcjpub3QtYWxsb3dlZH0uZGlzYWJsZWRcOm9wYWNpdHktNjA6ZGlzYWJsZWR7b3BhY2l0eTouNn1AbWVkaWEobWluLXdpZHRoOjQwcmVtKXsuc21cOmJsb2Nre2Rpc3BsYXk6YmxvY2t9LnNtXDpmbGV4e2Rpc3BsYXk6ZmxleH0uc21cOmhpZGRlbntkaXNwbGF5Om5vbmV9LnNtXDpncmlkLWNvbHMtNHtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsbWlubWF4KDAsMWZyKSl9LnNtXDpnYXAtMntnYXA6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS5zbVw6Z2FwLTN7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0uc21cOnAtNHtwYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0uc21cOnAtNXtwYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0uc21cOnAtNntwYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiA2KX0uc21cOnB4LTN7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMpfS5zbVw6cHgtM1wuNXtwYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogMy41KX0uc21cOnB4LTZ7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDYpfS5zbVw6dGV4dC0yeGx7Zm9udC1zaXplOnZhcigtLXRleHQtMnhsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQtMnhsLS1saW5lLWhlaWdodCkpfS5zbVw6dGV4dC0zeGx7Zm9udC1zaXplOnZhcigtLXRleHQtM3hsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQtM3hsLS1saW5lLWhlaWdodCkpfS5zbVw6dGV4dC00eGx7Zm9udC1zaXplOnZhcigtLXRleHQtNHhsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQtNHhsLS1saW5lLWhlaWdodCkpfS5zbVw6dGV4dC1iYXNle2ZvbnQtc2l6ZTp2YXIoLS10ZXh0LWJhc2UpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC1iYXNlLS1saW5lLWhlaWdodCkpfS5zbVw6dGV4dC14bHtmb250LXNpemU6dmFyKC0tdGV4dC14bCk7bGluZS1oZWlnaHQ6dmFyKC0tdHctbGVhZGluZyx2YXIoLS10ZXh0LXhsLS1saW5lLWhlaWdodCkpfS5zbVw6dGV4dC1cWzEwcHhcXXtmb250LXNpemU6MTBweH19QG1lZGlhKG1pbi13aWR0aDo0OHJlbSl7Lm1kXDpoaWRkZW57ZGlzcGxheTpub25lfS5tZFw6Z3JpZC1jb2xzLVxbMTk2cHhfMWZyXF17Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjE5NnB4IDFmcn0ubWRcOmZsZXgtY29se2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0ubWRcOm92ZXJmbG93LXZpc2libGV7b3ZlcmZsb3c6dmlzaWJsZX0ubWRcOmJvcmRlci1ye2JvcmRlci1yaWdodC1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci1yaWdodC13aWR0aDoxcHh9Lm1kXDpib3JkZXItYi0we2JvcmRlci1ib3R0b20tc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItYm90dG9tLXdpZHRoOjB9Lm1kXDpweS0xXC41e3BhZGRpbmctYmxvY2s6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEuNSl9Lm1kXDpwYi0we3BhZGRpbmctYm90dG9tOjB9fUBtZWRpYShtaW4td2lkdGg6NjRyZW0pey5sZ1w6bWF4LXctXFttaW5cKDEwMFwlXCxjYWxjXCgxMDBkdmgtMjgwcHhcKVwpXF17bWF4LXdpZHRoOm1pbigxMDAlLDEwMGR2aCAtIDI4MHB4KX0ubGdcOmdyaWQtY29scy1cW21pbm1heFwoMFwsMWZyXClfMzAwcHhcXXtncmlkLXRlbXBsYXRlLWNvbHVtbnM6bWlubWF4KDAsMWZyKSAzMDBweH19fWh0bWwsYm9keXtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC05NTApO21pbi1oZWlnaHQ6MTAwJTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTEwMCk7Zm9udC1mYW1pbHk6dmFyKC0tZm9udC1ib2R5KTstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnQ7b3ZlcnNjcm9sbC1iZWhhdmlvci15Om5vbmU7dG91Y2gtYWN0aW9uOm1hbmlwdWxhdGlvbjttYXJnaW46MH0uZm9udC1kaXNwbGF5e2ZvbnQtZmFtaWx5OnZhcigtLWZvbnQtZGlzcGxheSl9LmJ0bi1hcmNhZGV7Zm9udC1mYW1pbHk6dmFyKC0tZm9udC1ib2R5KTtsZXR0ZXItc3BhY2luZzouMDhlbTt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtib3JkZXItYm90dG9tLXdpZHRoOjNweDtib3JkZXItcmFkaXVzOjZweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gODBtcyxmaWx0ZXIgLjEycyxiYWNrZ3JvdW5kLWNvbG9yIC4xMnMsYm94LXNoYWRvdyAuMTJzfS5idG4tYXJjYWRlOmFjdGl2ZTpub3QoOmRpc2FibGVkKXtib3JkZXItYm90dG9tLXdpZHRoOjFweDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgycHgpfS5idG4tYXJjYWRlOmRpc2FibGVke29wYWNpdHk6LjQ1O2N1cnNvcjpub3QtYWxsb3dlZH0uYnRuLXByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKTtib3JkZXItY29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTUwMCk7Y29sb3I6IzIyMTYwNDtib3JkZXItYm90dG9tLWNvbG9yOiM4YTY0MjA7Ym94LXNoYWRvdzowIDAgMjJweCAjZmZjODU3Mzh9LmJ0bi1wcmltYXJ5OmhvdmVyOm5vdCg6ZGlzYWJsZWQpe2ZpbHRlcjpicmlnaHRuZXNzKDEuMDcpO2JveC1zaGFkb3c6MCAwIDMwcHggI2ZmYzg1NzYxfS5idG4tZ2hvc3R7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtODAwKTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTIwMCk7Ym9yZGVyLWJvdHRvbS1jb2xvcjojMDgxMzBjfS5idG4tZ2hvc3Q6aG92ZXI6bm90KDpkaXNhYmxlZCl7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtNzAwKTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTEwMCl9Lmljb24tYnRue2JvcmRlcjoxcHggc29saWQgdmFyKC0tY29sb3ItcGl0LTUwMCk7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtODAwKTt3aWR0aDoyLjM1cmVtO2hlaWdodDoyLjM1cmVtO2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKTtib3JkZXItYm90dG9tLXdpZHRoOjNweDtib3JkZXItYm90dG9tLWNvbG9yOiMwODEzMGM7Ym9yZGVyLXJhZGl1czo2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7dHJhbnNpdGlvbjphbGwgLjEycztkaXNwbGF5OmlubGluZS1mbGV4fS5pY29uLWJ0bjpob3ZlcntiYWNrZ3JvdW5kOnZhcigtLWNvbG9yLXBpdC03MDApO2NvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApfS5pY29uLWJ0bjphY3RpdmV7Ym9yZGVyLWJvdHRvbS13aWR0aDoxcHg7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMnB4KX0ua2Jke2ZvbnQtZmFtaWx5OnZhcigtLWZvbnQtYm9keSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTtib3JkZXItYm90dG9tOjJweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTtiYWNrZ3JvdW5kOnZhcigtLWNvbG9yLXBpdC04MDApO2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKTt3aGl0ZS1zcGFjZTpub3dyYXA7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo0cHggNnB4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfS5ib2FyZC1mcmFtZXtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWNvbG9yLXBpdC02MDApO2JhY2tncm91bmQ6dmFyKC0tY29sb3ItcGl0LTkwMCk7Ym94LXNoYWRvdzowIDAgMCA0cHggdmFyKC0tY29sb3ItcGl0LTk1MCksMCAwIDAgNXB4IHZhcigtLWNvbG9yLXBpdC03MDApLDAgMzBweCA3MHB4IC0yNHB4ICMwMDAwMDBlNixpbnNldCAwIDFweCAjYWNmNjY0MTQ7Ym9yZGVyLXJhZGl1czo2cHh9LnNjYW5saW5lczphZnRlcntjb250ZW50OiIiO3otaW5kZXg6MTA7cG9pbnRlci1ldmVudHM6bm9uZTtib3JkZXItcmFkaXVzOmluaGVyaXQ7b3BhY2l0eTouNDtiYWNrZ3JvdW5kOnJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoMGRlZywjMDAwMDAwMjQgMCwjMDAwMDAwMjQgMXB4LCMwMDAwIDFweCwjMDAwMCAzcHgpO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO3JpZ2h0OjA7Ym90dG9tOjA7bGVmdDowfS5yZXRyby10aXRsZXtjb2xvcjp2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKTt0ZXh0LXNoYWRvdzowIDNweCAjN2M0YTEyLDAgNnB4ICMwMDAwMDA3MywwIDAgMzRweCAjZmZjODU3NjZ9LnJldHJvLXRpdGxlLWN5YW57Y29sb3I6IzYyZTZmZjt0ZXh0LXNoYWRvdzowIDNweCAjMTc1ZTc1LDAgNnB4ICMwMDAwMDA3MywwIDAgMzRweCAjNjJlNmZmNzN9LnJldHJvLXRpdGxlLWNoYWxre2NvbG9yOiNmMmVkZTA7dGV4dC1zaGFkb3c6MCAzcHggI2EwM2MzYywwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2YyZWRlMDY2fS5yZXRyby10aXRsZS1uZW9ue2NvbG9yOiNmZjVkYTI7dGV4dC1zaGFkb3c6MCAzcHggIzhjMjM1OCwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2ZmNWRhMjczfS5yZXRyby10aXRsZS10ZWFse2NvbG9yOiM0ZGQ4YzA7dGV4dC1zaGFkb3c6MCAzcHggIzFhNmU1ZiwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggIzRkZDhjMDczfS5yZXRyby10aXRsZS12aW9sZXR7Y29sb3I6I2IyOGJmZjt0ZXh0LXNoYWRvdzowIDNweCAjNWMzZDk5LDAgNnB4ICMwMDAwMDA3MywwIDAgMzRweCAjYjI4YmZmNzN9LnJldHJvLXRpdGxlLWljZXtjb2xvcjojYmZlM2ZmO3RleHQtc2hhZG93OjAgM3B4ICM0YTdiYTYsMCA2cHggIzAwMDAwMDczLDAgMCAzNHB4ICNiZmUzZmY3M30ucmV0cm8tdGl0bGUtZ29sZHtjb2xvcjojZThjNTZhO3RleHQtc2hhZG93OjAgM3B4ICM4YTZkMjQsMCA2cHggIzAwMDAwMDczLDAgMCAzNHB4ICNlOGM1NmE3M30udjNke3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMzhzIGN1YmljLWJlemllciguMiwuOSwuMywxLjEpfS52ZmFjZXtiYWNrZmFjZS12aXNpYmlsaXR5OmhpZGRlbjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtyaWdodDowO2JvdHRvbTowO2xlZnQ6MH0ucmV0cm8tdGl0bGUtb3Jhbmdle2NvbG9yOiNmZjlhM2M7dGV4dC1zaGFkb3c6MCAzcHggIzhhM2MwYSwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2ZmOWEzYzczfS5yZXRyby10aXRsZS1taW50e2NvbG9yOiM3ZWYwZDA7dGV4dC1zaGFkb3c6MCAzcHggIzE0NjU1YSwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggIzdlZjBkMDczfS5yZXRyby10aXRsZS1waW5re2NvbG9yOiNmZjVkOGY7dGV4dC1zaGFkb3c6MCAzcHggIzdjMWYzZSwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2ZmNWQ4ZjczfUBrZXlmcmFtZXMgcG9wezAle2ZpbHRlcjpicmlnaHRuZXNzKDEuNik7dHJhbnNmb3JtOnNjYWxlKDEuNSl9dG97ZmlsdGVyOmJyaWdodG5lc3MoKTt0cmFuc2Zvcm06c2NhbGUoMSl9fS5hbmltYXRlLXBvcHthbmltYXRpb246LjI4cyBjdWJpYy1iZXppZXIoLjIsMS42LC40LDEpIHBvcH1Aa2V5ZnJhbWVzIHJpc2V7MCV7b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE2cHgpc2NhbGUoLjk2KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMClzY2FsZSgxKX19LmFuaW1hdGUtcmlzZXthbmltYXRpb246LjM4cyBjdWJpYy1iZXppZXIoLjIsMS4yLC4zLDEpIGJvdGggcmlzZX1Aa2V5ZnJhbWVzIGZhZGVpbnswJXtvcGFjaXR5OjB9dG97b3BhY2l0eToxfX0uYW5pbWF0ZS1mYWRlaW57YW5pbWF0aW9uOi4yNXMgYm90aCBmYWRlaW59QGtleWZyYW1lcyBibGluay1oYXJkezAlLDU4JXtvcGFjaXR5OjF9NTklLHRve29wYWNpdHk6LjEyfX0uYW5pbWF0ZS1ibGlua3thbmltYXRpb246MS4xNXMgc3RlcC1lbmQgaW5maW5pdGUgYmxpbmstaGFyZH1Aa2V5ZnJhbWVzIHB1bHNlLXNvZnR7MCUsdG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKX01MCV7b3BhY2l0eTouODU7dHJhbnNmb3JtOnNjYWxlKDEuMDYpfX0uYW5pbWF0ZS1wdWxzZS1zb2Z0e2FuaW1hdGlvbjouOXMgZWFzZS1pbi1vdXQgaW5maW5pdGUgcHVsc2Utc29mdH1Aa2V5ZnJhbWVzIGZpcmVmbHktZmx5ezAle3RyYW5zZm9ybTp0cmFuc2xhdGUoMCl9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZTNkKHZhcigtLXR4KSx2YXIoLS10eSksMCl9fUBrZXlmcmFtZXMgZmlyZWZseS1mbGlja3swJSx0b3tvcGFjaXR5OjB9NDUlLDYwJXtvcGFjaXR5OnZhcigtLXBlYWspfX0uZmlyZWZseXtiYWNrZ3JvdW5kOnZhcigtLWMpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHZhcigtLWMpO29wYWNpdHk6MDthbmltYXRpb246ZmlyZWZseS1mbHkgdmFyKC0tZCkgZWFzZS1pbi1vdXQgdmFyKC0tZGVsKSBpbmZpbml0ZSBhbHRlcm5hdGUsZmlyZWZseS1mbGljayB2YXIoLS1kKSBlYXNlLWluLW91dCB2YXIoLS1kZWwpIGluZmluaXRlO2JvcmRlci1yYWRpdXM6OTk5OXB4O3Bvc2l0aW9uOmFic29sdXRlfUBwcm9wZXJ0eSAtLXR3LXJvdGF0ZS14e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctcm90YXRlLXl7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1yb3RhdGUtentzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNrZXcteHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNrZXcteXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJvcmRlci1zdHlsZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6c29saWR9QHByb3BlcnR5IC0tdHctbGVhZGluZ3tzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWZvbnQtd2VpZ2h0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctdHJhY2tpbmd7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1vcmRpbmFse3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2xhc2hlZC16ZXJve3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctbnVtZXJpYy1maWd1cmV7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1udW1lcmljLXNwYWNpbmd7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1udW1lcmljLWZyYWN0aW9ue3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctc2hhZG93LWNvbG9ye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93LWNvbG9ye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctcmluZy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXJpbmctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctaW5zZXQtcmluZy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWluc2V0LXJpbmctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctcmluZy1pbnNldHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXJpbmctb2Zmc2V0LXdpZHRoe3N5bnRheDoiPGxlbmd0aD4iO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MH1AcHJvcGVydHkgLS10dy1yaW5nLW9mZnNldC1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6I2ZmZn1AcHJvcGVydHkgLS10dy1yaW5nLW9mZnNldC1zaGFkb3d7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjAgMCAjMDAwMH1AcHJvcGVydHkgLS10dy1vdXRsaW5lLXN0eWxle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTpzb2xpZH1AcHJvcGVydHkgLS10dy1ibHVye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYnJpZ2h0bmVzc3tzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWNvbnRyYXN0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctZ3JheXNjYWxle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctaHVlLXJvdGF0ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWludmVydHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LW9wYWNpdHl7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1zYXR1cmF0ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNlcGlhe3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctZHJvcC1zaGFkb3d7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1kcm9wLXNoYWRvdy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWRyb3Atc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctZHJvcC1zaGFkb3ctc2l6ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJhY2tkcm9wLWJsdXJ7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1icmlnaHRuZXNze3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3AtY29udHJhc3R7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1ncmF5c2NhbGV7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1odWUtcm90YXRle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3AtaW52ZXJ0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3Atb3BhY2l0eXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJhY2tkcm9wLXNhdHVyYXRle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3Atc2VwaWF7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1kdXJhdGlvbntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWVhc2V7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1zY2FsZS14e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZToxfUBwcm9wZXJ0eSAtLXR3LXNjYWxlLXl7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjF9QHByb3BlcnR5IC0tdHctc2NhbGUtentzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MX1AcHJvcGVydHkgLS10dy10cmFuc2xhdGUteHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MH1AcHJvcGVydHkgLS10dy10cmFuc2xhdGUteXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MH1AcHJvcGVydHkgLS10dy10cmFuc2xhdGUtentzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MH0KCiAgICA8L3N0eWxlPgogIDwvaGVhZD4KICA8Ym9keT4KICAgIDxkaXYgaWQ9InJvb3QiPjwvZGl2PgogICAgPHNjcmlwdCB0eXBlPSJtb2R1bGUiPgooZnVuY3Rpb24oKXtjb25zdCBsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImxpbmsiKS5yZWxMaXN0O2lmKGwmJmwuc3VwcG9ydHMmJmwuc3VwcG9ydHMoIm1vZHVsZXByZWxvYWQiKSlyZXR1cm47Zm9yKGNvbnN0IGQgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGlua1tyZWw9Im1vZHVsZXByZWxvYWQiXScpKXUoZCk7bmV3IE11dGF0aW9uT2JzZXJ2ZXIoZD0+e2Zvcihjb25zdCBvIG9mIGQpaWYoby50eXBlPT09ImNoaWxkTGlzdCIpZm9yKGNvbnN0IHAgb2Ygby5hZGRlZE5vZGVzKXAudGFnTmFtZT09PSJMSU5LIiYmcC5yZWw9PT0ibW9kdWxlcHJlbG9hZCImJnUocCl9KS5vYnNlcnZlKGRvY3VtZW50LHtjaGlsZExpc3Q6ITAsc3VidHJlZTohMH0pO2Z1bmN0aW9uIGEoZCl7Y29uc3Qgbz17fTtyZXR1cm4gZC5pbnRlZ3JpdHkmJihvLmludGVncml0eT1kLmludGVncml0eSksZC5yZWZlcnJlclBvbGljeSYmKG8ucmVmZXJyZXJQb2xpY3k9ZC5yZWZlcnJlclBvbGljeSksZC5jcm9zc09yaWdpbj09PSJ1c2UtY3JlZGVudGlhbHMiP28uY3JlZGVudGlhbHM9ImluY2x1ZGUiOmQuY3Jvc3NPcmlnaW49PT0iYW5vbnltb3VzIj9vLmNyZWRlbnRpYWxzPSJvbWl0IjpvLmNyZWRlbnRpYWxzPSJzYW1lLW9yaWdpbiIsb31mdW5jdGlvbiB1KGQpe2lmKGQuZXApcmV0dXJuO2QuZXA9ITA7Y29uc3Qgbz1hKGQpO2ZldGNoKGQuaHJlZixvKX19KSgpO2Z1bmN0aW9uIG1tKGUpe3JldHVybiBlJiZlLl9fZXNNb2R1bGUmJk9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChlLCJkZWZhdWx0Iik/ZS5kZWZhdWx0OmV9dmFyIHpvPXtleHBvcnRzOnt9fSxpbD17fSxGbz17ZXhwb3J0czp7fX0sS2U9e307LyoqCiAqIEBsaWNlbnNlIFJlYWN0CiAqIHJlYWN0LnByb2R1Y3Rpb24ubWluLmpzCiAqCiAqIENvcHlyaWdodCAoYykgRmFjZWJvb2ssIEluYy4gYW5kIGl0cyBhZmZpbGlhdGVzLgogKgogKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSBmb3VuZCBpbiB0aGUKICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLgogKi92YXIgdmQ7ZnVuY3Rpb24gZ20oKXtpZih2ZClyZXR1cm4gS2U7dmQ9MTt2YXIgZT1TeW1ib2wuZm9yKCJyZWFjdC5lbGVtZW50IiksbD1TeW1ib2wuZm9yKCJyZWFjdC5wb3J0YWwiKSxhPVN5bWJvbC5mb3IoInJlYWN0LmZyYWdtZW50IiksdT1TeW1ib2wuZm9yKCJyZWFjdC5zdHJpY3RfbW9kZSIpLGQ9U3ltYm9sLmZvcigicmVhY3QucHJvZmlsZXIiKSxvPVN5bWJvbC5mb3IoInJlYWN0LnByb3ZpZGVyIikscD1TeW1ib2wuZm9yKCJyZWFjdC5jb250ZXh0IiksaD1TeW1ib2wuZm9yKCJyZWFjdC5mb3J3YXJkX3JlZiIpLG09U3ltYm9sLmZvcigicmVhY3Quc3VzcGVuc2UiKSxnPVN5bWJvbC5mb3IoInJlYWN0Lm1lbW8iKSx2PVN5bWJvbC5mb3IoInJlYWN0LmxhenkiKSx3PVN5bWJvbC5pdGVyYXRvcjtmdW5jdGlvbiBNKGspe3JldHVybiBrPT09bnVsbHx8dHlwZW9mIGshPSJvYmplY3QiP251bGw6KGs9dyYma1t3XXx8a1siQEBpdGVyYXRvciJdLHR5cGVvZiBrPT0iZnVuY3Rpb24iP2s6bnVsbCl9dmFyIFI9e2lzTW91bnRlZDpmdW5jdGlvbigpe3JldHVybiExfSxlbnF1ZXVlRm9yY2VVcGRhdGU6ZnVuY3Rpb24oKXt9LGVucXVldWVSZXBsYWNlU3RhdGU6ZnVuY3Rpb24oKXt9LGVucXVldWVTZXRTdGF0ZTpmdW5jdGlvbigpe319LFc9T2JqZWN0LmFzc2lnbixRPXt9O2Z1bmN0aW9uIFMoayxMLHVlKXt0aGlzLnByb3BzPWssdGhpcy5jb250ZXh0PUwsdGhpcy5yZWZzPVEsdGhpcy51cGRhdGVyPXVlfHxSfVMucHJvdG90eXBlLmlzUmVhY3RDb21wb25lbnQ9e30sUy5wcm90b3R5cGUuc2V0U3RhdGU9ZnVuY3Rpb24oayxMKXtpZih0eXBlb2YgayE9Im9iamVjdCImJnR5cGVvZiBrIT0iZnVuY3Rpb24iJiZrIT1udWxsKXRocm93IEVycm9yKCJzZXRTdGF0ZSguLi4pOiB0YWtlcyBhbiBvYmplY3Qgb2Ygc3RhdGUgdmFyaWFibGVzIHRvIHVwZGF0ZSBvciBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW4gb2JqZWN0IG9mIHN0YXRlIHZhcmlhYmxlcy4iKTt0aGlzLnVwZGF0ZXIuZW5xdWV1ZVNldFN0YXRlKHRoaXMsayxMLCJzZXRTdGF0ZSIpfSxTLnByb3RvdHlwZS5mb3JjZVVwZGF0ZT1mdW5jdGlvbihrKXt0aGlzLnVwZGF0ZXIuZW5xdWV1ZUZvcmNlVXBkYXRlKHRoaXMsaywiZm9yY2VVcGRhdGUiKX07ZnVuY3Rpb24gSCgpe31ILnByb3RvdHlwZT1TLnByb3RvdHlwZTtmdW5jdGlvbiBWKGssTCx1ZSl7dGhpcy5wcm9wcz1rLHRoaXMuY29udGV4dD1MLHRoaXMucmVmcz1RLHRoaXMudXBkYXRlcj11ZXx8Un12YXIgcT1WLnByb3RvdHlwZT1uZXcgSDtxLmNvbnN0cnVjdG9yPVYsVyhxLFMucHJvdG90eXBlKSxxLmlzUHVyZVJlYWN0Q29tcG9uZW50PSEwO3ZhciBvZT1BcnJheS5pc0FycmF5LFo9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSx5ZT17Y3VycmVudDpudWxsfSxTZT17a2V5OiEwLHJlZjohMCxfX3NlbGY6ITAsX19zb3VyY2U6ITB9O2Z1bmN0aW9uIGtlKGssTCx1ZSl7dmFyICQsSj17fSxoZT1udWxsLHZlPW51bGw7aWYoTCE9bnVsbClmb3IoJCBpbiBMLnJlZiE9PXZvaWQgMCYmKHZlPUwucmVmKSxMLmtleSE9PXZvaWQgMCYmKGhlPSIiK0wua2V5KSxMKVouY2FsbChMLCQpJiYhU2UuaGFzT3duUHJvcGVydHkoJCkmJihKWyRdPUxbJF0pO3ZhciBHPWFyZ3VtZW50cy5sZW5ndGgtMjtpZihHPT09MSlKLmNoaWxkcmVuPXVlO2Vsc2UgaWYoMTxHKXtmb3IodmFyIHhlPUFycmF5KEcpLGFlPTA7YWU8RzthZSsrKXhlW2FlXT1hcmd1bWVudHNbYWUrMl07Si5jaGlsZHJlbj14ZX1pZihrJiZrLmRlZmF1bHRQcm9wcylmb3IoJCBpbiBHPWsuZGVmYXVsdFByb3BzLEcpSlskXT09PXZvaWQgMCYmKEpbJF09R1skXSk7cmV0dXJueyQkdHlwZW9mOmUsdHlwZTprLGtleTpoZSxyZWY6dmUscHJvcHM6Sixfb3duZXI6eWUuY3VycmVudH19ZnVuY3Rpb24gUGUoayxMKXtyZXR1cm57JCR0eXBlb2Y6ZSx0eXBlOmsudHlwZSxrZXk6TCxyZWY6ay5yZWYscHJvcHM6ay5wcm9wcyxfb3duZXI6ay5fb3duZXJ9fWZ1bmN0aW9uIEVlKGspe3JldHVybiB0eXBlb2Ygaz09Im9iamVjdCImJmshPT1udWxsJiZrLiQkdHlwZW9mPT09ZX1mdW5jdGlvbiBPZShrKXt2YXIgTD17Ij0iOiI9MCIsIjoiOiI9MiJ9O3JldHVybiIkIitrLnJlcGxhY2UoL1s9Ol0vZyxmdW5jdGlvbih1ZSl7cmV0dXJuIExbdWVdfSl9dmFyIEJlPS9cLysvZztmdW5jdGlvbiB6ZShrLEwpe3JldHVybiB0eXBlb2Ygaz09Im9iamVjdCImJmshPT1udWxsJiZrLmtleSE9bnVsbD9PZSgiIitrLmtleSk6TC50b1N0cmluZygzNil9ZnVuY3Rpb24gRmUoayxMLHVlLCQsSil7dmFyIGhlPXR5cGVvZiBrOyhoZT09PSJ1bmRlZmluZWQifHxoZT09PSJib29sZWFuIikmJihrPW51bGwpO3ZhciB2ZT0hMTtpZihrPT09bnVsbCl2ZT0hMDtlbHNlIHN3aXRjaChoZSl7Y2FzZSJzdHJpbmciOmNhc2UibnVtYmVyIjp2ZT0hMDticmVhaztjYXNlIm9iamVjdCI6c3dpdGNoKGsuJCR0eXBlb2Ype2Nhc2UgZTpjYXNlIGw6dmU9ITB9fWlmKHZlKXJldHVybiB2ZT1rLEo9Sih2ZSksaz0kPT09IiI/Ii4iK3plKHZlLDApOiQsb2UoSik/KHVlPSIiLGshPW51bGwmJih1ZT1rLnJlcGxhY2UoQmUsIiQmLyIpKyIvIiksRmUoSixMLHVlLCIiLGZ1bmN0aW9uKGFlKXtyZXR1cm4gYWV9KSk6SiE9bnVsbCYmKEVlKEopJiYoSj1QZShKLHVlKyghSi5rZXl8fHZlJiZ2ZS5rZXk9PT1KLmtleT8iIjooIiIrSi5rZXkpLnJlcGxhY2UoQmUsIiQmLyIpKyIvIikraykpLEwucHVzaChKKSksMTtpZih2ZT0wLCQ9JD09PSIiPyIuIjokKyI6IixvZShrKSlmb3IodmFyIEc9MDtHPGsubGVuZ3RoO0crKyl7aGU9a1tHXTt2YXIgeGU9JCt6ZShoZSxHKTt2ZSs9RmUoaGUsTCx1ZSx4ZSxKKX1lbHNlIGlmKHhlPU0oayksdHlwZW9mIHhlPT0iZnVuY3Rpb24iKWZvcihrPXhlLmNhbGwoayksRz0wOyEoaGU9ay5uZXh0KCkpLmRvbmU7KWhlPWhlLnZhbHVlLHhlPSQremUoaGUsRysrKSx2ZSs9RmUoaGUsTCx1ZSx4ZSxKKTtlbHNlIGlmKGhlPT09Im9iamVjdCIpdGhyb3cgTD1TdHJpbmcoayksRXJyb3IoIk9iamVjdHMgYXJlIG5vdCB2YWxpZCBhcyBhIFJlYWN0IGNoaWxkIChmb3VuZDogIisoTD09PSJbb2JqZWN0IE9iamVjdF0iPyJvYmplY3Qgd2l0aCBrZXlzIHsiK09iamVjdC5rZXlzKGspLmpvaW4oIiwgIikrIn0iOkwpKyIpLiBJZiB5b3UgbWVhbnQgdG8gcmVuZGVyIGEgY29sbGVjdGlvbiBvZiBjaGlsZHJlbiwgdXNlIGFuIGFycmF5IGluc3RlYWQuIik7cmV0dXJuIHZlfWZ1bmN0aW9uIExlKGssTCx1ZSl7aWYoaz09bnVsbClyZXR1cm4gazt2YXIgJD1bXSxKPTA7cmV0dXJuIEZlKGssJCwiIiwiIixmdW5jdGlvbihoZSl7cmV0dXJuIEwuY2FsbCh1ZSxoZSxKKyspfSksJH1mdW5jdGlvbiBqZShrKXtpZihrLl9zdGF0dXM9PT0tMSl7dmFyIEw9ay5fcmVzdWx0O0w9TCgpLEwudGhlbihmdW5jdGlvbih1ZSl7KGsuX3N0YXR1cz09PTB8fGsuX3N0YXR1cz09PS0xKSYmKGsuX3N0YXR1cz0xLGsuX3Jlc3VsdD11ZSl9LGZ1bmN0aW9uKHVlKXsoay5fc3RhdHVzPT09MHx8ay5fc3RhdHVzPT09LTEpJiYoay5fc3RhdHVzPTIsay5fcmVzdWx0PXVlKX0pLGsuX3N0YXR1cz09PS0xJiYoay5fc3RhdHVzPTAsay5fcmVzdWx0PUwpfWlmKGsuX3N0YXR1cz09PTEpcmV0dXJuIGsuX3Jlc3VsdC5kZWZhdWx0O3Rocm93IGsuX3Jlc3VsdH12YXIgd2U9e2N1cnJlbnQ6bnVsbH0sVT17dHJhbnNpdGlvbjpudWxsfSx0ZT17UmVhY3RDdXJyZW50RGlzcGF0Y2hlcjp3ZSxSZWFjdEN1cnJlbnRCYXRjaENvbmZpZzpVLFJlYWN0Q3VycmVudE93bmVyOnllfTtmdW5jdGlvbiBGKCl7dGhyb3cgRXJyb3IoImFjdCguLi4pIGlzIG5vdCBzdXBwb3J0ZWQgaW4gcHJvZHVjdGlvbiBidWlsZHMgb2YgUmVhY3QuIil9cmV0dXJuIEtlLkNoaWxkcmVuPXttYXA6TGUsZm9yRWFjaDpmdW5jdGlvbihrLEwsdWUpe0xlKGssZnVuY3Rpb24oKXtMLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sdWUpfSxjb3VudDpmdW5jdGlvbihrKXt2YXIgTD0wO3JldHVybiBMZShrLGZ1bmN0aW9uKCl7TCsrfSksTH0sdG9BcnJheTpmdW5jdGlvbihrKXtyZXR1cm4gTGUoayxmdW5jdGlvbihMKXtyZXR1cm4gTH0pfHxbXX0sb25seTpmdW5jdGlvbihrKXtpZighRWUoaykpdGhyb3cgRXJyb3IoIlJlYWN0LkNoaWxkcmVuLm9ubHkgZXhwZWN0ZWQgdG8gcmVjZWl2ZSBhIHNpbmdsZSBSZWFjdCBlbGVtZW50IGNoaWxkLiIpO3JldHVybiBrfX0sS2UuQ29tcG9uZW50PVMsS2UuRnJhZ21lbnQ9YSxLZS5Qcm9maWxlcj1kLEtlLlB1cmVDb21wb25lbnQ9VixLZS5TdHJpY3RNb2RlPXUsS2UuU3VzcGVuc2U9bSxLZS5fX1NFQ1JFVF9JTlRFUk5BTFNfRE9fTk9UX1VTRV9PUl9ZT1VfV0lMTF9CRV9GSVJFRD10ZSxLZS5hY3Q9RixLZS5jbG9uZUVsZW1lbnQ9ZnVuY3Rpb24oayxMLHVlKXtpZihrPT1udWxsKXRocm93IEVycm9yKCJSZWFjdC5jbG9uZUVsZW1lbnQoLi4uKTogVGhlIGFyZ3VtZW50IG11c3QgYmUgYSBSZWFjdCBlbGVtZW50LCBidXQgeW91IHBhc3NlZCAiK2srIi4iKTt2YXIgJD1XKHt9LGsucHJvcHMpLEo9ay5rZXksaGU9ay5yZWYsdmU9ay5fb3duZXI7aWYoTCE9bnVsbCl7aWYoTC5yZWYhPT12b2lkIDAmJihoZT1MLnJlZix2ZT15ZS5jdXJyZW50KSxMLmtleSE9PXZvaWQgMCYmKEo9IiIrTC5rZXkpLGsudHlwZSYmay50eXBlLmRlZmF1bHRQcm9wcyl2YXIgRz1rLnR5cGUuZGVmYXVsdFByb3BzO2Zvcih4ZSBpbiBMKVouY2FsbChMLHhlKSYmIVNlLmhhc093blByb3BlcnR5KHhlKSYmKCRbeGVdPUxbeGVdPT09dm9pZCAwJiZHIT09dm9pZCAwP0dbeGVdOkxbeGVdKX12YXIgeGU9YXJndW1lbnRzLmxlbmd0aC0yO2lmKHhlPT09MSkkLmNoaWxkcmVuPXVlO2Vsc2UgaWYoMTx4ZSl7Rz1BcnJheSh4ZSk7Zm9yKHZhciBhZT0wO2FlPHhlO2FlKyspR1thZV09YXJndW1lbnRzW2FlKzJdOyQuY2hpbGRyZW49R31yZXR1cm57JCR0eXBlb2Y6ZSx0eXBlOmsudHlwZSxrZXk6SixyZWY6aGUscHJvcHM6JCxfb3duZXI6dmV9fSxLZS5jcmVhdGVDb250ZXh0PWZ1bmN0aW9uKGspe3JldHVybiBrPXskJHR5cGVvZjpwLF9jdXJyZW50VmFsdWU6ayxfY3VycmVudFZhbHVlMjprLF90aHJlYWRDb3VudDowLFByb3ZpZGVyOm51bGwsQ29uc3VtZXI6bnVsbCxfZGVmYXVsdFZhbHVlOm51bGwsX2dsb2JhbE5hbWU6bnVsbH0say5Qcm92aWRlcj17JCR0eXBlb2Y6byxfY29udGV4dDprfSxrLkNvbnN1bWVyPWt9LEtlLmNyZWF0ZUVsZW1lbnQ9a2UsS2UuY3JlYXRlRmFjdG9yeT1mdW5jdGlvbihrKXt2YXIgTD1rZS5iaW5kKG51bGwsayk7cmV0dXJuIEwudHlwZT1rLEx9LEtlLmNyZWF0ZVJlZj1mdW5jdGlvbigpe3JldHVybntjdXJyZW50Om51bGx9fSxLZS5mb3J3YXJkUmVmPWZ1bmN0aW9uKGspe3JldHVybnskJHR5cGVvZjpoLHJlbmRlcjprfX0sS2UuaXNWYWxpZEVsZW1lbnQ9RWUsS2UubGF6eT1mdW5jdGlvbihrKXtyZXR1cm57JCR0eXBlb2Y6dixfcGF5bG9hZDp7X3N0YXR1czotMSxfcmVzdWx0Omt9LF9pbml0OmplfX0sS2UubWVtbz1mdW5jdGlvbihrLEwpe3JldHVybnskJHR5cGVvZjpnLHR5cGU6ayxjb21wYXJlOkw9PT12b2lkIDA/bnVsbDpMfX0sS2Uuc3RhcnRUcmFuc2l0aW9uPWZ1bmN0aW9uKGspe3ZhciBMPVUudHJhbnNpdGlvbjtVLnRyYW5zaXRpb249e307dHJ5e2soKX1maW5hbGx5e1UudHJhbnNpdGlvbj1MfX0sS2UudW5zdGFibGVfYWN0PUYsS2UudXNlQ2FsbGJhY2s9ZnVuY3Rpb24oayxMKXtyZXR1cm4gd2UuY3VycmVudC51c2VDYWxsYmFjayhrLEwpfSxLZS51c2VDb250ZXh0PWZ1bmN0aW9uKGspe3JldHVybiB3ZS5jdXJyZW50LnVzZUNvbnRleHQoayl9LEtlLnVzZURlYnVnVmFsdWU9ZnVuY3Rpb24oKXt9LEtlLnVzZURlZmVycmVkVmFsdWU9ZnVuY3Rpb24oayl7cmV0dXJuIHdlLmN1cnJlbnQudXNlRGVmZXJyZWRWYWx1ZShrKX0sS2UudXNlRWZmZWN0PWZ1bmN0aW9uKGssTCl7cmV0dXJuIHdlLmN1cnJlbnQudXNlRWZmZWN0KGssTCl9LEtlLnVzZUlkPWZ1bmN0aW9uKCl7cmV0dXJuIHdlLmN1cnJlbnQudXNlSWQoKX0sS2UudXNlSW1wZXJhdGl2ZUhhbmRsZT1mdW5jdGlvbihrLEwsdWUpe3JldHVybiB3ZS5jdXJyZW50LnVzZUltcGVyYXRpdmVIYW5kbGUoayxMLHVlKX0sS2UudXNlSW5zZXJ0aW9uRWZmZWN0PWZ1bmN0aW9uKGssTCl7cmV0dXJuIHdlLmN1cnJlbnQudXNlSW5zZXJ0aW9uRWZmZWN0KGssTCl9LEtlLnVzZUxheW91dEVmZmVjdD1mdW5jdGlvbihrLEwpe3JldHVybiB3ZS5jdXJyZW50LnVzZUxheW91dEVmZmVjdChrLEwpfSxLZS51c2VNZW1vPWZ1bmN0aW9uKGssTCl7cmV0dXJuIHdlLmN1cnJlbnQudXNlTWVtbyhrLEwpfSxLZS51c2VSZWR1Y2VyPWZ1bmN0aW9uKGssTCx1ZSl7cmV0dXJuIHdlLmN1cnJlbnQudXNlUmVkdWNlcihrLEwsdWUpfSxLZS51c2VSZWY9ZnVuY3Rpb24oayl7cmV0dXJuIHdlLmN1cnJlbnQudXNlUmVmKGspfSxLZS51c2VTdGF0ZT1mdW5jdGlvbihrKXtyZXR1cm4gd2UuY3VycmVudC51c2VTdGF0ZShrKX0sS2UudXNlU3luY0V4dGVybmFsU3RvcmU9ZnVuY3Rpb24oayxMLHVlKXtyZXR1cm4gd2UuY3VycmVudC51c2VTeW5jRXh0ZXJuYWxTdG9yZShrLEwsdWUpfSxLZS51c2VUcmFuc2l0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIHdlLmN1cnJlbnQudXNlVHJhbnNpdGlvbigpfSxLZS52ZXJzaW9uPSIxOC4zLjEiLEtlfXZhciB3ZDtmdW5jdGlvbiBqYygpe3JldHVybiB3ZHx8KHdkPTEsRm8uZXhwb3J0cz1nbSgpKSxGby5leHBvcnRzfS8qKgogKiBAbGljZW5zZSBSZWFjdAogKiByZWFjdC1qc3gtcnVudGltZS5wcm9kdWN0aW9uLm1pbi5qcwogKgogKiBDb3B5cmlnaHQgKGMpIEZhY2Vib29rLCBJbmMuIGFuZCBpdHMgYWZmaWxpYXRlcy4KICoKICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgZm91bmQgaW4gdGhlCiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4KICovdmFyIGJkO2Z1bmN0aW9uIHhtKCl7aWYoYmQpcmV0dXJuIGlsO2JkPTE7dmFyIGU9amMoKSxsPVN5bWJvbC5mb3IoInJlYWN0LmVsZW1lbnQiKSxhPVN5bWJvbC5mb3IoInJlYWN0LmZyYWdtZW50IiksdT1PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LGQ9ZS5fX1NFQ1JFVF9JTlRFUk5BTFNfRE9fTk9UX1VTRV9PUl9ZT1VfV0lMTF9CRV9GSVJFRC5SZWFjdEN1cnJlbnRPd25lcixvPXtrZXk6ITAscmVmOiEwLF9fc2VsZjohMCxfX3NvdXJjZTohMH07ZnVuY3Rpb24gcChoLG0sZyl7dmFyIHYsdz17fSxNPW51bGwsUj1udWxsO2chPT12b2lkIDAmJihNPSIiK2cpLG0ua2V5IT09dm9pZCAwJiYoTT0iIittLmtleSksbS5yZWYhPT12b2lkIDAmJihSPW0ucmVmKTtmb3IodiBpbiBtKXUuY2FsbChtLHYpJiYhby5oYXNPd25Qcm9wZXJ0eSh2KSYmKHdbdl09bVt2XSk7aWYoaCYmaC5kZWZhdWx0UHJvcHMpZm9yKHYgaW4gbT1oLmRlZmF1bHRQcm9wcyxtKXdbdl09PT12b2lkIDAmJih3W3ZdPW1bdl0pO3JldHVybnskJHR5cGVvZjpsLHR5cGU6aCxrZXk6TSxyZWY6Uixwcm9wczp3LF9vd25lcjpkLmN1cnJlbnR9fXJldHVybiBpbC5GcmFnbWVudD1hLGlsLmpzeD1wLGlsLmpzeHM9cCxpbH12YXIga2Q7ZnVuY3Rpb24geW0oKXtyZXR1cm4ga2R8fChrZD0xLHpvLmV4cG9ydHM9eG0oKSksem8uZXhwb3J0c312YXIgcj15bSgpLENhPXt9LCRvPXtleHBvcnRzOnt9fSwkdD17fSxXbz17ZXhwb3J0czp7fX0sSG89e307LyoqCiAqIEBsaWNlbnNlIFJlYWN0CiAqIHNjaGVkdWxlci5wcm9kdWN0aW9uLm1pbi5qcwogKgogKiBDb3B5cmlnaHQgKGMpIEZhY2Vib29rLCBJbmMuIGFuZCBpdHMgYWZmaWxpYXRlcy4KICoKICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgZm91bmQgaW4gdGhlCiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4KICovdmFyIGpkO2Z1bmN0aW9uIHZtKCl7cmV0dXJuIGpkfHwoamQ9MSwoZnVuY3Rpb24oZSl7ZnVuY3Rpb24gbChVLHRlKXt2YXIgRj1VLmxlbmd0aDtVLnB1c2godGUpO2U6Zm9yKDswPEY7KXt2YXIgaz1GLTE+Pj4xLEw9VVtrXTtpZigwPGQoTCx0ZSkpVVtrXT10ZSxVW0ZdPUwsRj1rO2Vsc2UgYnJlYWsgZX19ZnVuY3Rpb24gYShVKXtyZXR1cm4gVS5sZW5ndGg9PT0wP251bGw6VVswXX1mdW5jdGlvbiB1KFUpe2lmKFUubGVuZ3RoPT09MClyZXR1cm4gbnVsbDt2YXIgdGU9VVswXSxGPVUucG9wKCk7aWYoRiE9PXRlKXtVWzBdPUY7ZTpmb3IodmFyIGs9MCxMPVUubGVuZ3RoLHVlPUw+Pj4xO2s8dWU7KXt2YXIgJD0yKihrKzEpLTEsSj1VWyRdLGhlPSQrMSx2ZT1VW2hlXTtpZigwPmQoSixGKSloZTxMJiYwPmQodmUsSik/KFVba109dmUsVVtoZV09RixrPWhlKTooVVtrXT1KLFVbJF09RixrPSQpO2Vsc2UgaWYoaGU8TCYmMD5kKHZlLEYpKVVba109dmUsVVtoZV09RixrPWhlO2Vsc2UgYnJlYWsgZX19cmV0dXJuIHRlfWZ1bmN0aW9uIGQoVSx0ZSl7dmFyIEY9VS5zb3J0SW5kZXgtdGUuc29ydEluZGV4O3JldHVybiBGIT09MD9GOlUuaWQtdGUuaWR9aWYodHlwZW9mIHBlcmZvcm1hbmNlPT0ib2JqZWN0IiYmdHlwZW9mIHBlcmZvcm1hbmNlLm5vdz09ImZ1bmN0aW9uIil7dmFyIG89cGVyZm9ybWFuY2U7ZS51bnN0YWJsZV9ub3c9ZnVuY3Rpb24oKXtyZXR1cm4gby5ub3coKX19ZWxzZXt2YXIgcD1EYXRlLGg9cC5ub3coKTtlLnVuc3RhYmxlX25vdz1mdW5jdGlvbigpe3JldHVybiBwLm5vdygpLWh9fXZhciBtPVtdLGc9W10sdj0xLHc9bnVsbCxNPTMsUj0hMSxXPSExLFE9ITEsUz10eXBlb2Ygc2V0VGltZW91dD09ImZ1bmN0aW9uIj9zZXRUaW1lb3V0Om51bGwsSD10eXBlb2YgY2xlYXJUaW1lb3V0PT0iZnVuY3Rpb24iP2NsZWFyVGltZW91dDpudWxsLFY9dHlwZW9mIHNldEltbWVkaWF0ZTwidSI/c2V0SW1tZWRpYXRlOm51bGw7dHlwZW9mIG5hdmlnYXRvcjwidSImJm5hdmlnYXRvci5zY2hlZHVsaW5nIT09dm9pZCAwJiZuYXZpZ2F0b3Iuc2NoZWR1bGluZy5pc0lucHV0UGVuZGluZyE9PXZvaWQgMCYmbmF2aWdhdG9yLnNjaGVkdWxpbmcuaXNJbnB1dFBlbmRpbmcuYmluZChuYXZpZ2F0b3Iuc2NoZWR1bGluZyk7ZnVuY3Rpb24gcShVKXtmb3IodmFyIHRlPWEoZyk7dGUhPT1udWxsOyl7aWYodGUuY2FsbGJhY2s9PT1udWxsKXUoZyk7ZWxzZSBpZih0ZS5zdGFydFRpbWU8PVUpdShnKSx0ZS5zb3J0SW5kZXg9dGUuZXhwaXJhdGlvblRpbWUsbChtLHRlKTtlbHNlIGJyZWFrO3RlPWEoZyl9fWZ1bmN0aW9uIG9lKFUpe2lmKFE9ITEscShVKSwhVylpZihhKG0pIT09bnVsbClXPSEwLGplKFopO2Vsc2V7dmFyIHRlPWEoZyk7dGUhPT1udWxsJiZ3ZShvZSx0ZS5zdGFydFRpbWUtVSl9fWZ1bmN0aW9uIFooVSx0ZSl7Vz0hMSxRJiYoUT0hMSxIKGtlKSxrZT0tMSksUj0hMDt2YXIgRj1NO3RyeXtmb3IocSh0ZSksdz1hKG0pO3chPT1udWxsJiYoISh3LmV4cGlyYXRpb25UaW1lPnRlKXx8VSYmIU9lKCkpOyl7dmFyIGs9dy5jYWxsYmFjaztpZih0eXBlb2Ygaz09ImZ1bmN0aW9uIil7dy5jYWxsYmFjaz1udWxsLE09dy5wcmlvcml0eUxldmVsO3ZhciBMPWsody5leHBpcmF0aW9uVGltZTw9dGUpO3RlPWUudW5zdGFibGVfbm93KCksdHlwZW9mIEw9PSJmdW5jdGlvbiI/dy5jYWxsYmFjaz1MOnc9PT1hKG0pJiZ1KG0pLHEodGUpfWVsc2UgdShtKTt3PWEobSl9aWYodyE9PW51bGwpdmFyIHVlPSEwO2Vsc2V7dmFyICQ9YShnKTskIT09bnVsbCYmd2Uob2UsJC5zdGFydFRpbWUtdGUpLHVlPSExfXJldHVybiB1ZX1maW5hbGx5e3c9bnVsbCxNPUYsUj0hMX19dmFyIHllPSExLFNlPW51bGwsa2U9LTEsUGU9NSxFZT0tMTtmdW5jdGlvbiBPZSgpe3JldHVybiEoZS51bnN0YWJsZV9ub3coKS1FZTxQZSl9ZnVuY3Rpb24gQmUoKXtpZihTZSE9PW51bGwpe3ZhciBVPWUudW5zdGFibGVfbm93KCk7RWU9VTt2YXIgdGU9ITA7dHJ5e3RlPVNlKCEwLFUpfWZpbmFsbHl7dGU/emUoKTooeWU9ITEsU2U9bnVsbCl9fWVsc2UgeWU9ITF9dmFyIHplO2lmKHR5cGVvZiBWPT0iZnVuY3Rpb24iKXplPWZ1bmN0aW9uKCl7VihCZSl9O2Vsc2UgaWYodHlwZW9mIE1lc3NhZ2VDaGFubmVsPCJ1Iil7dmFyIEZlPW5ldyBNZXNzYWdlQ2hhbm5lbCxMZT1GZS5wb3J0MjtGZS5wb3J0MS5vbm1lc3NhZ2U9QmUsemU9ZnVuY3Rpb24oKXtMZS5wb3N0TWVzc2FnZShudWxsKX19ZWxzZSB6ZT1mdW5jdGlvbigpe1MoQmUsMCl9O2Z1bmN0aW9uIGplKFUpe1NlPVUseWV8fCh5ZT0hMCx6ZSgpKX1mdW5jdGlvbiB3ZShVLHRlKXtrZT1TKGZ1bmN0aW9uKCl7VShlLnVuc3RhYmxlX25vdygpKX0sdGUpfWUudW5zdGFibGVfSWRsZVByaW9yaXR5PTUsZS51bnN0YWJsZV9JbW1lZGlhdGVQcmlvcml0eT0xLGUudW5zdGFibGVfTG93UHJpb3JpdHk9NCxlLnVuc3RhYmxlX05vcm1hbFByaW9yaXR5PTMsZS51bnN0YWJsZV9Qcm9maWxpbmc9bnVsbCxlLnVuc3RhYmxlX1VzZXJCbG9ja2luZ1ByaW9yaXR5PTIsZS51bnN0YWJsZV9jYW5jZWxDYWxsYmFjaz1mdW5jdGlvbihVKXtVLmNhbGxiYWNrPW51bGx9LGUudW5zdGFibGVfY29udGludWVFeGVjdXRpb249ZnVuY3Rpb24oKXtXfHxSfHwoVz0hMCxqZShaKSl9LGUudW5zdGFibGVfZm9yY2VGcmFtZVJhdGU9ZnVuY3Rpb24oVSl7MD5VfHwxMjU8VT9jb25zb2xlLmVycm9yKCJmb3JjZUZyYW1lUmF0ZSB0YWtlcyBhIHBvc2l0aXZlIGludCBiZXR3ZWVuIDAgYW5kIDEyNSwgZm9yY2luZyBmcmFtZSByYXRlcyBoaWdoZXIgdGhhbiAxMjUgZnBzIGlzIG5vdCBzdXBwb3J0ZWQiKTpQZT0wPFU/TWF0aC5mbG9vcigxZTMvVSk6NX0sZS51bnN0YWJsZV9nZXRDdXJyZW50UHJpb3JpdHlMZXZlbD1mdW5jdGlvbigpe3JldHVybiBNfSxlLnVuc3RhYmxlX2dldEZpcnN0Q2FsbGJhY2tOb2RlPWZ1bmN0aW9uKCl7cmV0dXJuIGEobSl9LGUudW5zdGFibGVfbmV4dD1mdW5jdGlvbihVKXtzd2l0Y2goTSl7Y2FzZSAxOmNhc2UgMjpjYXNlIDM6dmFyIHRlPTM7YnJlYWs7ZGVmYXVsdDp0ZT1NfXZhciBGPU07TT10ZTt0cnl7cmV0dXJuIFUoKX1maW5hbGx5e009Rn19LGUudW5zdGFibGVfcGF1c2VFeGVjdXRpb249ZnVuY3Rpb24oKXt9LGUudW5zdGFibGVfcmVxdWVzdFBhaW50PWZ1bmN0aW9uKCl7fSxlLnVuc3RhYmxlX3J1bldpdGhQcmlvcml0eT1mdW5jdGlvbihVLHRlKXtzd2l0Y2goVSl7Y2FzZSAxOmNhc2UgMjpjYXNlIDM6Y2FzZSA0OmNhc2UgNTpicmVhaztkZWZhdWx0OlU9M312YXIgRj1NO009VTt0cnl7cmV0dXJuIHRlKCl9ZmluYWxseXtNPUZ9fSxlLnVuc3RhYmxlX3NjaGVkdWxlQ2FsbGJhY2s9ZnVuY3Rpb24oVSx0ZSxGKXt2YXIgaz1lLnVuc3RhYmxlX25vdygpO3N3aXRjaCh0eXBlb2YgRj09Im9iamVjdCImJkYhPT1udWxsPyhGPUYuZGVsYXksRj10eXBlb2YgRj09Im51bWJlciImJjA8Rj9rK0Y6ayk6Rj1rLFUpe2Nhc2UgMTp2YXIgTD0tMTticmVhaztjYXNlIDI6TD0yNTA7YnJlYWs7Y2FzZSA1Okw9MTA3Mzc0MTgyMzticmVhaztjYXNlIDQ6TD0xZTQ7YnJlYWs7ZGVmYXVsdDpMPTVlM31yZXR1cm4gTD1GK0wsVT17aWQ6disrLGNhbGxiYWNrOnRlLHByaW9yaXR5TGV2ZWw6VSxzdGFydFRpbWU6RixleHBpcmF0aW9uVGltZTpMLHNvcnRJbmRleDotMX0sRj5rPyhVLnNvcnRJbmRleD1GLGwoZyxVKSxhKG0pPT09bnVsbCYmVT09PWEoZykmJihRPyhIKGtlKSxrZT0tMSk6UT0hMCx3ZShvZSxGLWspKSk6KFUuc29ydEluZGV4PUwsbChtLFUpLFd8fFJ8fChXPSEwLGplKFopKSksVX0sZS51bnN0YWJsZV9zaG91bGRZaWVsZD1PZSxlLnVuc3RhYmxlX3dyYXBDYWxsYmFjaz1mdW5jdGlvbihVKXt2YXIgdGU9TTtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgRj1NO009dGU7dHJ5e3JldHVybiBVLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1maW5hbGx5e009Rn19fX0pKEhvKSksSG99dmFyIFNkO2Z1bmN0aW9uIHdtKCl7cmV0dXJuIFNkfHwoU2Q9MSxXby5leHBvcnRzPXZtKCkpLFdvLmV4cG9ydHN9LyoqCiAqIEBsaWNlbnNlIFJlYWN0CiAqIHJlYWN0LWRvbS5wcm9kdWN0aW9uLm1pbi5qcwogKgogKiBDb3B5cmlnaHQgKGMpIEZhY2Vib29rLCBJbmMuIGFuZCBpdHMgYWZmaWxpYXRlcy4KICoKICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgZm91bmQgaW4gdGhlCiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4KICovdmFyIE5kO2Z1bmN0aW9uIGJtKCl7aWYoTmQpcmV0dXJuICR0O05kPTE7dmFyIGU9amMoKSxsPXdtKCk7ZnVuY3Rpb24gYSh0KXtmb3IodmFyIG49Imh0dHBzOi8vcmVhY3Rqcy5vcmcvZG9jcy9lcnJvci1kZWNvZGVyLmh0bWw/aW52YXJpYW50PSIrdCxzPTE7czxhcmd1bWVudHMubGVuZ3RoO3MrKyluKz0iJmFyZ3NbXT0iK2VuY29kZVVSSUNvbXBvbmVudChhcmd1bWVudHNbc10pO3JldHVybiJNaW5pZmllZCBSZWFjdCBlcnJvciAjIit0KyI7IHZpc2l0ICIrbisiIGZvciB0aGUgZnVsbCBtZXNzYWdlIG9yIHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCBmb3IgZnVsbCBlcnJvcnMgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4ifXZhciB1PW5ldyBTZXQsZD17fTtmdW5jdGlvbiBvKHQsbil7cCh0LG4pLHAodCsiQ2FwdHVyZSIsbil9ZnVuY3Rpb24gcCh0LG4pe2ZvcihkW3RdPW4sdD0wO3Q8bi5sZW5ndGg7dCsrKXUuYWRkKG5bdF0pfXZhciBoPSEodHlwZW9mIHdpbmRvdz4idSJ8fHR5cGVvZiB3aW5kb3cuZG9jdW1lbnQ+InUifHx0eXBlb2Ygd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQ+InUiKSxtPU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksZz0vXls6QS1aX2Etelx1MDBDMC1cdTAwRDZcdTAwRDgtXHUwMEY2XHUwMEY4LVx1MDJGRlx1MDM3MC1cdTAzN0RcdTAzN0YtXHUxRkZGXHUyMDBDLVx1MjAwRFx1MjA3MC1cdTIxOEZcdTJDMDAtXHUyRkVGXHUzMDAxLVx1RDdGRlx1RjkwMC1cdUZEQ0ZcdUZERjAtXHVGRkZEXVs6QS1aX2Etelx1MDBDMC1cdTAwRDZcdTAwRDgtXHUwMEY2XHUwMEY4LVx1MDJGRlx1MDM3MC1cdTAzN0RcdTAzN0YtXHUxRkZGXHUyMDBDLVx1MjAwRFx1MjA3MC1cdTIxOEZcdTJDMDAtXHUyRkVGXHUzMDAxLVx1RDdGRlx1RjkwMC1cdUZEQ0ZcdUZERjAtXHVGRkZEXC0uMC05XHUwMEI3XHUwMzAwLVx1MDM2Rlx1MjAzRi1cdTIwNDBdKiQvLHY9e30sdz17fTtmdW5jdGlvbiBNKHQpe3JldHVybiBtLmNhbGwodyx0KT8hMDptLmNhbGwodix0KT8hMTpnLnRlc3QodCk/d1t0XT0hMDoodlt0XT0hMCwhMSl9ZnVuY3Rpb24gUih0LG4scyxpKXtpZihzIT09bnVsbCYmcy50eXBlPT09MClyZXR1cm4hMTtzd2l0Y2godHlwZW9mIG4pe2Nhc2UiZnVuY3Rpb24iOmNhc2Uic3ltYm9sIjpyZXR1cm4hMDtjYXNlImJvb2xlYW4iOnJldHVybiBpPyExOnMhPT1udWxsPyFzLmFjY2VwdHNCb29sZWFuczoodD10LnRvTG93ZXJDYXNlKCkuc2xpY2UoMCw1KSx0IT09ImRhdGEtIiYmdCE9PSJhcmlhLSIpO2RlZmF1bHQ6cmV0dXJuITF9fWZ1bmN0aW9uIFcodCxuLHMsaSl7aWYobj09PW51bGx8fHR5cGVvZiBuPiJ1Inx8Uih0LG4scyxpKSlyZXR1cm4hMDtpZihpKXJldHVybiExO2lmKHMhPT1udWxsKXN3aXRjaChzLnR5cGUpe2Nhc2UgMzpyZXR1cm4hbjtjYXNlIDQ6cmV0dXJuIG49PT0hMTtjYXNlIDU6cmV0dXJuIGlzTmFOKG4pO2Nhc2UgNjpyZXR1cm4gaXNOYU4obil8fDE+bn1yZXR1cm4hMX1mdW5jdGlvbiBRKHQsbixzLGksYyxmLHkpe3RoaXMuYWNjZXB0c0Jvb2xlYW5zPW49PT0yfHxuPT09M3x8bj09PTQsdGhpcy5hdHRyaWJ1dGVOYW1lPWksdGhpcy5hdHRyaWJ1dGVOYW1lc3BhY2U9Yyx0aGlzLm11c3RVc2VQcm9wZXJ0eT1zLHRoaXMucHJvcGVydHlOYW1lPXQsdGhpcy50eXBlPW4sdGhpcy5zYW5pdGl6ZVVSTD1mLHRoaXMucmVtb3ZlRW1wdHlTdHJpbmc9eX12YXIgUz17fTsiY2hpbGRyZW4gZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwgZGVmYXVsdFZhbHVlIGRlZmF1bHRDaGVja2VkIGlubmVySFRNTCBzdXBwcmVzc0NvbnRlbnRFZGl0YWJsZVdhcm5pbmcgc3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIHN0eWxlIi5zcGxpdCgiICIpLmZvckVhY2goZnVuY3Rpb24odCl7U1t0XT1uZXcgUSh0LDAsITEsdCxudWxsLCExLCExKX0pLFtbImFjY2VwdENoYXJzZXQiLCJhY2NlcHQtY2hhcnNldCJdLFsiY2xhc3NOYW1lIiwiY2xhc3MiXSxbImh0bWxGb3IiLCJmb3IiXSxbImh0dHBFcXVpdiIsImh0dHAtZXF1aXYiXV0uZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgbj10WzBdO1Nbbl09bmV3IFEobiwxLCExLHRbMV0sbnVsbCwhMSwhMSl9KSxbImNvbnRlbnRFZGl0YWJsZSIsImRyYWdnYWJsZSIsInNwZWxsQ2hlY2siLCJ2YWx1ZSJdLmZvckVhY2goZnVuY3Rpb24odCl7U1t0XT1uZXcgUSh0LDIsITEsdC50b0xvd2VyQ2FzZSgpLG51bGwsITEsITEpfSksWyJhdXRvUmV2ZXJzZSIsImV4dGVybmFsUmVzb3VyY2VzUmVxdWlyZWQiLCJmb2N1c2FibGUiLCJwcmVzZXJ2ZUFscGhhIl0uZm9yRWFjaChmdW5jdGlvbih0KXtTW3RdPW5ldyBRKHQsMiwhMSx0LG51bGwsITEsITEpfSksImFsbG93RnVsbFNjcmVlbiBhc3luYyBhdXRvRm9jdXMgYXV0b1BsYXkgY29udHJvbHMgZGVmYXVsdCBkZWZlciBkaXNhYmxlZCBkaXNhYmxlUGljdHVyZUluUGljdHVyZSBkaXNhYmxlUmVtb3RlUGxheWJhY2sgZm9ybU5vVmFsaWRhdGUgaGlkZGVuIGxvb3Agbm9Nb2R1bGUgbm9WYWxpZGF0ZSBvcGVuIHBsYXlzSW5saW5lIHJlYWRPbmx5IHJlcXVpcmVkIHJldmVyc2VkIHNjb3BlZCBzZWFtbGVzcyBpdGVtU2NvcGUiLnNwbGl0KCIgIikuZm9yRWFjaChmdW5jdGlvbih0KXtTW3RdPW5ldyBRKHQsMywhMSx0LnRvTG93ZXJDYXNlKCksbnVsbCwhMSwhMSl9KSxbImNoZWNrZWQiLCJtdWx0aXBsZSIsIm11dGVkIiwic2VsZWN0ZWQiXS5mb3JFYWNoKGZ1bmN0aW9uKHQpe1NbdF09bmV3IFEodCwzLCEwLHQsbnVsbCwhMSwhMSl9KSxbImNhcHR1cmUiLCJkb3dubG9hZCJdLmZvckVhY2goZnVuY3Rpb24odCl7U1t0XT1uZXcgUSh0LDQsITEsdCxudWxsLCExLCExKX0pLFsiY29scyIsInJvd3MiLCJzaXplIiwic3BhbiJdLmZvckVhY2goZnVuY3Rpb24odCl7U1t0XT1uZXcgUSh0LDYsITEsdCxudWxsLCExLCExKX0pLFsicm93U3BhbiIsInN0YXJ0Il0uZm9yRWFjaChmdW5jdGlvbih0KXtTW3RdPW5ldyBRKHQsNSwhMSx0LnRvTG93ZXJDYXNlKCksbnVsbCwhMSwhMSl9KTt2YXIgSD0vW1wtOl0oW2Etel0pL2c7ZnVuY3Rpb24gVih0KXtyZXR1cm4gdFsxXS50b1VwcGVyQ2FzZSgpfSJhY2NlbnQtaGVpZ2h0IGFsaWdubWVudC1iYXNlbGluZSBhcmFiaWMtZm9ybSBiYXNlbGluZS1zaGlmdCBjYXAtaGVpZ2h0IGNsaXAtcGF0aCBjbGlwLXJ1bGUgY29sb3ItaW50ZXJwb2xhdGlvbiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnMgY29sb3ItcHJvZmlsZSBjb2xvci1yZW5kZXJpbmcgZG9taW5hbnQtYmFzZWxpbmUgZW5hYmxlLWJhY2tncm91bmQgZmlsbC1vcGFjaXR5IGZpbGwtcnVsZSBmbG9vZC1jb2xvciBmbG9vZC1vcGFjaXR5IGZvbnQtZmFtaWx5IGZvbnQtc2l6ZSBmb250LXNpemUtYWRqdXN0IGZvbnQtc3RyZXRjaCBmb250LXN0eWxlIGZvbnQtdmFyaWFudCBmb250LXdlaWdodCBnbHlwaC1uYW1lIGdseXBoLW9yaWVudGF0aW9uLWhvcml6b250YWwgZ2x5cGgtb3JpZW50YXRpb24tdmVydGljYWwgaG9yaXotYWR2LXggaG9yaXotb3JpZ2luLXggaW1hZ2UtcmVuZGVyaW5nIGxldHRlci1zcGFjaW5nIGxpZ2h0aW5nLWNvbG9yIG1hcmtlci1lbmQgbWFya2VyLW1pZCBtYXJrZXItc3RhcnQgb3ZlcmxpbmUtcG9zaXRpb24gb3ZlcmxpbmUtdGhpY2tuZXNzIHBhaW50LW9yZGVyIHBhbm9zZS0xIHBvaW50ZXItZXZlbnRzIHJlbmRlcmluZy1pbnRlbnQgc2hhcGUtcmVuZGVyaW5nIHN0b3AtY29sb3Igc3RvcC1vcGFjaXR5IHN0cmlrZXRocm91Z2gtcG9zaXRpb24gc3RyaWtldGhyb3VnaC10aGlja25lc3Mgc3Ryb2tlLWRhc2hhcnJheSBzdHJva2UtZGFzaG9mZnNldCBzdHJva2UtbGluZWNhcCBzdHJva2UtbGluZWpvaW4gc3Ryb2tlLW1pdGVybGltaXQgc3Ryb2tlLW9wYWNpdHkgc3Ryb2tlLXdpZHRoIHRleHQtYW5jaG9yIHRleHQtZGVjb3JhdGlvbiB0ZXh0LXJlbmRlcmluZyB1bmRlcmxpbmUtcG9zaXRpb24gdW5kZXJsaW5lLXRoaWNrbmVzcyB1bmljb2RlLWJpZGkgdW5pY29kZS1yYW5nZSB1bml0cy1wZXItZW0gdi1hbHBoYWJldGljIHYtaGFuZ2luZyB2LWlkZW9ncmFwaGljIHYtbWF0aGVtYXRpY2FsIHZlY3Rvci1lZmZlY3QgdmVydC1hZHYteSB2ZXJ0LW9yaWdpbi14IHZlcnQtb3JpZ2luLXkgd29yZC1zcGFjaW5nIHdyaXRpbmctbW9kZSB4bWxuczp4bGluayB4LWhlaWdodCIuc3BsaXQoIiAiKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBuPXQucmVwbGFjZShILFYpO1Nbbl09bmV3IFEobiwxLCExLHQsbnVsbCwhMSwhMSl9KSwieGxpbms6YWN0dWF0ZSB4bGluazphcmNyb2xlIHhsaW5rOnJvbGUgeGxpbms6c2hvdyB4bGluazp0aXRsZSB4bGluazp0eXBlIi5zcGxpdCgiICIpLmZvckVhY2goZnVuY3Rpb24odCl7dmFyIG49dC5yZXBsYWNlKEgsVik7U1tuXT1uZXcgUShuLDEsITEsdCwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIsITEsITEpfSksWyJ4bWw6YmFzZSIsInhtbDpsYW5nIiwieG1sOnNwYWNlIl0uZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgbj10LnJlcGxhY2UoSCxWKTtTW25dPW5ldyBRKG4sMSwhMSx0LCJodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2UiLCExLCExKX0pLFsidGFiSW5kZXgiLCJjcm9zc09yaWdpbiJdLmZvckVhY2goZnVuY3Rpb24odCl7U1t0XT1uZXcgUSh0LDEsITEsdC50b0xvd2VyQ2FzZSgpLG51bGwsITEsITEpfSksUy54bGlua0hyZWY9bmV3IFEoInhsaW5rSHJlZiIsMSwhMSwieGxpbms6aHJlZiIsImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiLCEwLCExKSxbInNyYyIsImhyZWYiLCJhY3Rpb24iLCJmb3JtQWN0aW9uIl0uZm9yRWFjaChmdW5jdGlvbih0KXtTW3RdPW5ldyBRKHQsMSwhMSx0LnRvTG93ZXJDYXNlKCksbnVsbCwhMCwhMCl9KTtmdW5jdGlvbiBxKHQsbixzLGkpe3ZhciBjPVMuaGFzT3duUHJvcGVydHkobik/U1tuXTpudWxsOyhjIT09bnVsbD9jLnR5cGUhPT0wOml8fCEoMjxuLmxlbmd0aCl8fG5bMF0hPT0ibyImJm5bMF0hPT0iTyJ8fG5bMV0hPT0ibiImJm5bMV0hPT0iTiIpJiYoVyhuLHMsYyxpKSYmKHM9bnVsbCksaXx8Yz09PW51bGw/TShuKSYmKHM9PT1udWxsP3QucmVtb3ZlQXR0cmlidXRlKG4pOnQuc2V0QXR0cmlidXRlKG4sIiIrcykpOmMubXVzdFVzZVByb3BlcnR5P3RbYy5wcm9wZXJ0eU5hbWVdPXM9PT1udWxsP2MudHlwZT09PTM/ITE6IiI6czoobj1jLmF0dHJpYnV0ZU5hbWUsaT1jLmF0dHJpYnV0ZU5hbWVzcGFjZSxzPT09bnVsbD90LnJlbW92ZUF0dHJpYnV0ZShuKTooYz1jLnR5cGUscz1jPT09M3x8Yz09PTQmJnM9PT0hMD8iIjoiIitzLGk/dC5zZXRBdHRyaWJ1dGVOUyhpLG4scyk6dC5zZXRBdHRyaWJ1dGUobixzKSkpKX12YXIgb2U9ZS5fX1NFQ1JFVF9JTlRFUk5BTFNfRE9fTk9UX1VTRV9PUl9ZT1VfV0lMTF9CRV9GSVJFRCxaPVN5bWJvbC5mb3IoInJlYWN0LmVsZW1lbnQiKSx5ZT1TeW1ib2wuZm9yKCJyZWFjdC5wb3J0YWwiKSxTZT1TeW1ib2wuZm9yKCJyZWFjdC5mcmFnbWVudCIpLGtlPVN5bWJvbC5mb3IoInJlYWN0LnN0cmljdF9tb2RlIiksUGU9U3ltYm9sLmZvcigicmVhY3QucHJvZmlsZXIiKSxFZT1TeW1ib2wuZm9yKCJyZWFjdC5wcm92aWRlciIpLE9lPVN5bWJvbC5mb3IoInJlYWN0LmNvbnRleHQiKSxCZT1TeW1ib2wuZm9yKCJyZWFjdC5mb3J3YXJkX3JlZiIpLHplPVN5bWJvbC5mb3IoInJlYWN0LnN1c3BlbnNlIiksRmU9U3ltYm9sLmZvcigicmVhY3Quc3VzcGVuc2VfbGlzdCIpLExlPVN5bWJvbC5mb3IoInJlYWN0Lm1lbW8iKSxqZT1TeW1ib2wuZm9yKCJyZWFjdC5sYXp5Iiksd2U9U3ltYm9sLmZvcigicmVhY3Qub2Zmc2NyZWVuIiksVT1TeW1ib2wuaXRlcmF0b3I7ZnVuY3Rpb24gdGUodCl7cmV0dXJuIHQ9PT1udWxsfHx0eXBlb2YgdCE9Im9iamVjdCI/bnVsbDoodD1VJiZ0W1VdfHx0WyJAQGl0ZXJhdG9yIl0sdHlwZW9mIHQ9PSJmdW5jdGlvbiI/dDpudWxsKX12YXIgRj1PYmplY3QuYXNzaWduLGs7ZnVuY3Rpb24gTCh0KXtpZihrPT09dm9pZCAwKXRyeXt0aHJvdyBFcnJvcigpfWNhdGNoKHMpe3ZhciBuPXMuc3RhY2sudHJpbSgpLm1hdGNoKC9cbiggKihhdCApPykvKTtrPW4mJm5bMV18fCIifXJldHVybmAKYCtrK3R9dmFyIHVlPSExO2Z1bmN0aW9uICQodCxuKXtpZighdHx8dWUpcmV0dXJuIiI7dWU9ITA7dmFyIHM9RXJyb3IucHJlcGFyZVN0YWNrVHJhY2U7RXJyb3IucHJlcGFyZVN0YWNrVHJhY2U9dm9pZCAwO3RyeXtpZihuKWlmKG49ZnVuY3Rpb24oKXt0aHJvdyBFcnJvcigpfSxPYmplY3QuZGVmaW5lUHJvcGVydHkobi5wcm90b3R5cGUsInByb3BzIix7c2V0OmZ1bmN0aW9uKCl7dGhyb3cgRXJyb3IoKX19KSx0eXBlb2YgUmVmbGVjdD09Im9iamVjdCImJlJlZmxlY3QuY29uc3RydWN0KXt0cnl7UmVmbGVjdC5jb25zdHJ1Y3QobixbXSl9Y2F0Y2goQil7dmFyIGk9Qn1SZWZsZWN0LmNvbnN0cnVjdCh0LFtdLG4pfWVsc2V7dHJ5e24uY2FsbCgpfWNhdGNoKEIpe2k9Qn10LmNhbGwobi5wcm90b3R5cGUpfWVsc2V7dHJ5e3Rocm93IEVycm9yKCl9Y2F0Y2goQil7aT1CfXQoKX19Y2F0Y2goQil7aWYoQiYmaSYmdHlwZW9mIEIuc3RhY2s9PSJzdHJpbmciKXtmb3IodmFyIGM9Qi5zdGFjay5zcGxpdChgCmApLGY9aS5zdGFjay5zcGxpdChgCmApLHk9Yy5sZW5ndGgtMSxiPWYubGVuZ3RoLTE7MTw9eSYmMDw9YiYmY1t5XSE9PWZbYl07KWItLTtmb3IoOzE8PXkmJjA8PWI7eS0tLGItLSlpZihjW3ldIT09ZltiXSl7aWYoeSE9PTF8fGIhPT0xKWRvIGlmKHktLSxiLS0sMD5ifHxjW3ldIT09ZltiXSl7dmFyIE49YApgK2NbeV0ucmVwbGFjZSgiIGF0IG5ldyAiLCIgYXQgIik7cmV0dXJuIHQuZGlzcGxheU5hbWUmJk4uaW5jbHVkZXMoIjxhbm9ueW1vdXM+IikmJihOPU4ucmVwbGFjZSgiPGFub255bW91cz4iLHQuZGlzcGxheU5hbWUpKSxOfXdoaWxlKDE8PXkmJjA8PWIpO2JyZWFrfX19ZmluYWxseXt1ZT0hMSxFcnJvci5wcmVwYXJlU3RhY2tUcmFjZT1zfXJldHVybih0PXQ/dC5kaXNwbGF5TmFtZXx8dC5uYW1lOiIiKT9MKHQpOiIifWZ1bmN0aW9uIEoodCl7c3dpdGNoKHQudGFnKXtjYXNlIDU6cmV0dXJuIEwodC50eXBlKTtjYXNlIDE2OnJldHVybiBMKCJMYXp5Iik7Y2FzZSAxMzpyZXR1cm4gTCgiU3VzcGVuc2UiKTtjYXNlIDE5OnJldHVybiBMKCJTdXNwZW5zZUxpc3QiKTtjYXNlIDA6Y2FzZSAyOmNhc2UgMTU6cmV0dXJuIHQ9JCh0LnR5cGUsITEpLHQ7Y2FzZSAxMTpyZXR1cm4gdD0kKHQudHlwZS5yZW5kZXIsITEpLHQ7Y2FzZSAxOnJldHVybiB0PSQodC50eXBlLCEwKSx0O2RlZmF1bHQ6cmV0dXJuIiJ9fWZ1bmN0aW9uIGhlKHQpe2lmKHQ9PW51bGwpcmV0dXJuIG51bGw7aWYodHlwZW9mIHQ9PSJmdW5jdGlvbiIpcmV0dXJuIHQuZGlzcGxheU5hbWV8fHQubmFtZXx8bnVsbDtpZih0eXBlb2YgdD09InN0cmluZyIpcmV0dXJuIHQ7c3dpdGNoKHQpe2Nhc2UgU2U6cmV0dXJuIkZyYWdtZW50IjtjYXNlIHllOnJldHVybiJQb3J0YWwiO2Nhc2UgUGU6cmV0dXJuIlByb2ZpbGVyIjtjYXNlIGtlOnJldHVybiJTdHJpY3RNb2RlIjtjYXNlIHplOnJldHVybiJTdXNwZW5zZSI7Y2FzZSBGZTpyZXR1cm4iU3VzcGVuc2VMaXN0In1pZih0eXBlb2YgdD09Im9iamVjdCIpc3dpdGNoKHQuJCR0eXBlb2Ype2Nhc2UgT2U6cmV0dXJuKHQuZGlzcGxheU5hbWV8fCJDb250ZXh0IikrIi5Db25zdW1lciI7Y2FzZSBFZTpyZXR1cm4odC5fY29udGV4dC5kaXNwbGF5TmFtZXx8IkNvbnRleHQiKSsiLlByb3ZpZGVyIjtjYXNlIEJlOnZhciBuPXQucmVuZGVyO3JldHVybiB0PXQuZGlzcGxheU5hbWUsdHx8KHQ9bi5kaXNwbGF5TmFtZXx8bi5uYW1lfHwiIix0PXQhPT0iIj8iRm9yd2FyZFJlZigiK3QrIikiOiJGb3J3YXJkUmVmIiksdDtjYXNlIExlOnJldHVybiBuPXQuZGlzcGxheU5hbWV8fG51bGwsbiE9PW51bGw/bjpoZSh0LnR5cGUpfHwiTWVtbyI7Y2FzZSBqZTpuPXQuX3BheWxvYWQsdD10Ll9pbml0O3RyeXtyZXR1cm4gaGUodChuKSl9Y2F0Y2h7fX1yZXR1cm4gbnVsbH1mdW5jdGlvbiB2ZSh0KXt2YXIgbj10LnR5cGU7c3dpdGNoKHQudGFnKXtjYXNlIDI0OnJldHVybiJDYWNoZSI7Y2FzZSA5OnJldHVybihuLmRpc3BsYXlOYW1lfHwiQ29udGV4dCIpKyIuQ29uc3VtZXIiO2Nhc2UgMTA6cmV0dXJuKG4uX2NvbnRleHQuZGlzcGxheU5hbWV8fCJDb250ZXh0IikrIi5Qcm92aWRlciI7Y2FzZSAxODpyZXR1cm4iRGVoeWRyYXRlZEZyYWdtZW50IjtjYXNlIDExOnJldHVybiB0PW4ucmVuZGVyLHQ9dC5kaXNwbGF5TmFtZXx8dC5uYW1lfHwiIixuLmRpc3BsYXlOYW1lfHwodCE9PSIiPyJGb3J3YXJkUmVmKCIrdCsiKSI6IkZvcndhcmRSZWYiKTtjYXNlIDc6cmV0dXJuIkZyYWdtZW50IjtjYXNlIDU6cmV0dXJuIG47Y2FzZSA0OnJldHVybiJQb3J0YWwiO2Nhc2UgMzpyZXR1cm4iUm9vdCI7Y2FzZSA2OnJldHVybiJUZXh0IjtjYXNlIDE2OnJldHVybiBoZShuKTtjYXNlIDg6cmV0dXJuIG49PT1rZT8iU3RyaWN0TW9kZSI6Ik1vZGUiO2Nhc2UgMjI6cmV0dXJuIk9mZnNjcmVlbiI7Y2FzZSAxMjpyZXR1cm4iUHJvZmlsZXIiO2Nhc2UgMjE6cmV0dXJuIlNjb3BlIjtjYXNlIDEzOnJldHVybiJTdXNwZW5zZSI7Y2FzZSAxOTpyZXR1cm4iU3VzcGVuc2VMaXN0IjtjYXNlIDI1OnJldHVybiJUcmFjaW5nTWFya2VyIjtjYXNlIDE6Y2FzZSAwOmNhc2UgMTc6Y2FzZSAyOmNhc2UgMTQ6Y2FzZSAxNTppZih0eXBlb2Ygbj09ImZ1bmN0aW9uIilyZXR1cm4gbi5kaXNwbGF5TmFtZXx8bi5uYW1lfHxudWxsO2lmKHR5cGVvZiBuPT0ic3RyaW5nIilyZXR1cm4gbn1yZXR1cm4gbnVsbH1mdW5jdGlvbiBHKHQpe3N3aXRjaCh0eXBlb2YgdCl7Y2FzZSJib29sZWFuIjpjYXNlIm51bWJlciI6Y2FzZSJzdHJpbmciOmNhc2UidW5kZWZpbmVkIjpyZXR1cm4gdDtjYXNlIm9iamVjdCI6cmV0dXJuIHQ7ZGVmYXVsdDpyZXR1cm4iIn19ZnVuY3Rpb24geGUodCl7dmFyIG49dC50eXBlO3JldHVybih0PXQubm9kZU5hbWUpJiZ0LnRvTG93ZXJDYXNlKCk9PT0iaW5wdXQiJiYobj09PSJjaGVja2JveCJ8fG49PT0icmFkaW8iKX1mdW5jdGlvbiBhZSh0KXt2YXIgbj14ZSh0KT8iY2hlY2tlZCI6InZhbHVlIixzPU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsbiksaT0iIit0W25dO2lmKCF0Lmhhc093blByb3BlcnR5KG4pJiZ0eXBlb2YgczwidSImJnR5cGVvZiBzLmdldD09ImZ1bmN0aW9uIiYmdHlwZW9mIHMuc2V0PT0iZnVuY3Rpb24iKXt2YXIgYz1zLmdldCxmPXMuc2V0O3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkodCxuLHtjb25maWd1cmFibGU6ITAsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIGMuY2FsbCh0aGlzKX0sc2V0OmZ1bmN0aW9uKHkpe2k9IiIreSxmLmNhbGwodGhpcyx5KX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkodCxuLHtlbnVtZXJhYmxlOnMuZW51bWVyYWJsZX0pLHtnZXRWYWx1ZTpmdW5jdGlvbigpe3JldHVybiBpfSxzZXRWYWx1ZTpmdW5jdGlvbih5KXtpPSIiK3l9LHN0b3BUcmFja2luZzpmdW5jdGlvbigpe3QuX3ZhbHVlVHJhY2tlcj1udWxsLGRlbGV0ZSB0W25dfX19fWZ1bmN0aW9uIGVlKHQpe3QuX3ZhbHVlVHJhY2tlcnx8KHQuX3ZhbHVlVHJhY2tlcj1hZSh0KSl9ZnVuY3Rpb24geih0KXtpZighdClyZXR1cm4hMTt2YXIgbj10Ll92YWx1ZVRyYWNrZXI7aWYoIW4pcmV0dXJuITA7dmFyIHM9bi5nZXRWYWx1ZSgpLGk9IiI7cmV0dXJuIHQmJihpPXhlKHQpP3QuY2hlY2tlZD8idHJ1ZSI6ImZhbHNlIjp0LnZhbHVlKSx0PWksdCE9PXM/KG4uc2V0VmFsdWUodCksITApOiExfWZ1bmN0aW9uIGZlKHQpe2lmKHQ9dHx8KHR5cGVvZiBkb2N1bWVudDwidSI/ZG9jdW1lbnQ6dm9pZCAwKSx0eXBlb2YgdD4idSIpcmV0dXJuIG51bGw7dHJ5e3JldHVybiB0LmFjdGl2ZUVsZW1lbnR8fHQuYm9keX1jYXRjaHtyZXR1cm4gdC5ib2R5fX1mdW5jdGlvbiBQKHQsbil7dmFyIHM9bi5jaGVja2VkO3JldHVybiBGKHt9LG4se2RlZmF1bHRDaGVja2VkOnZvaWQgMCxkZWZhdWx0VmFsdWU6dm9pZCAwLHZhbHVlOnZvaWQgMCxjaGVja2VkOnM/P3QuX3dyYXBwZXJTdGF0ZS5pbml0aWFsQ2hlY2tlZH0pfWZ1bmN0aW9uIGllKHQsbil7dmFyIHM9bi5kZWZhdWx0VmFsdWU9PW51bGw/IiI6bi5kZWZhdWx0VmFsdWUsaT1uLmNoZWNrZWQhPW51bGw/bi5jaGVja2VkOm4uZGVmYXVsdENoZWNrZWQ7cz1HKG4udmFsdWUhPW51bGw/bi52YWx1ZTpzKSx0Ll93cmFwcGVyU3RhdGU9e2luaXRpYWxDaGVja2VkOmksaW5pdGlhbFZhbHVlOnMsY29udHJvbGxlZDpuLnR5cGU9PT0iY2hlY2tib3gifHxuLnR5cGU9PT0icmFkaW8iP24uY2hlY2tlZCE9bnVsbDpuLnZhbHVlIT1udWxsfX1mdW5jdGlvbiBZKHQsbil7bj1uLmNoZWNrZWQsbiE9bnVsbCYmcSh0LCJjaGVja2VkIixuLCExKX1mdW5jdGlvbiBfKHQsbil7WSh0LG4pO3ZhciBzPUcobi52YWx1ZSksaT1uLnR5cGU7aWYocyE9bnVsbClpPT09Im51bWJlciI/KHM9PT0wJiZ0LnZhbHVlPT09IiJ8fHQudmFsdWUhPXMpJiYodC52YWx1ZT0iIitzKTp0LnZhbHVlIT09IiIrcyYmKHQudmFsdWU9IiIrcyk7ZWxzZSBpZihpPT09InN1Ym1pdCJ8fGk9PT0icmVzZXQiKXt0LnJlbW92ZUF0dHJpYnV0ZSgidmFsdWUiKTtyZXR1cm59bi5oYXNPd25Qcm9wZXJ0eSgidmFsdWUiKT9kZSh0LG4udHlwZSxzKTpuLmhhc093blByb3BlcnR5KCJkZWZhdWx0VmFsdWUiKSYmZGUodCxuLnR5cGUsRyhuLmRlZmF1bHRWYWx1ZSkpLG4uY2hlY2tlZD09bnVsbCYmbi5kZWZhdWx0Q2hlY2tlZCE9bnVsbCYmKHQuZGVmYXVsdENoZWNrZWQ9ISFuLmRlZmF1bHRDaGVja2VkKX1mdW5jdGlvbiBJKHQsbixzKXtpZihuLmhhc093blByb3BlcnR5KCJ2YWx1ZSIpfHxuLmhhc093blByb3BlcnR5KCJkZWZhdWx0VmFsdWUiKSl7dmFyIGk9bi50eXBlO2lmKCEoaSE9PSJzdWJtaXQiJiZpIT09InJlc2V0Inx8bi52YWx1ZSE9PXZvaWQgMCYmbi52YWx1ZSE9PW51bGwpKXJldHVybjtuPSIiK3QuX3dyYXBwZXJTdGF0ZS5pbml0aWFsVmFsdWUsc3x8bj09PXQudmFsdWV8fCh0LnZhbHVlPW4pLHQuZGVmYXVsdFZhbHVlPW59cz10Lm5hbWUscyE9PSIiJiYodC5uYW1lPSIiKSx0LmRlZmF1bHRDaGVja2VkPSEhdC5fd3JhcHBlclN0YXRlLmluaXRpYWxDaGVja2VkLHMhPT0iIiYmKHQubmFtZT1zKX1mdW5jdGlvbiBkZSh0LG4scyl7KG4hPT0ibnVtYmVyInx8ZmUodC5vd25lckRvY3VtZW50KSE9PXQpJiYocz09bnVsbD90LmRlZmF1bHRWYWx1ZT0iIit0Ll93cmFwcGVyU3RhdGUuaW5pdGlhbFZhbHVlOnQuZGVmYXVsdFZhbHVlIT09IiIrcyYmKHQuZGVmYXVsdFZhbHVlPSIiK3MpKX12YXIgTz1BcnJheS5pc0FycmF5O2Z1bmN0aW9uIGoodCxuLHMsaSl7aWYodD10Lm9wdGlvbnMsbil7bj17fTtmb3IodmFyIGM9MDtjPHMubGVuZ3RoO2MrKyluWyIkIitzW2NdXT0hMDtmb3Iocz0wO3M8dC5sZW5ndGg7cysrKWM9bi5oYXNPd25Qcm9wZXJ0eSgiJCIrdFtzXS52YWx1ZSksdFtzXS5zZWxlY3RlZCE9PWMmJih0W3NdLnNlbGVjdGVkPWMpLGMmJmkmJih0W3NdLmRlZmF1bHRTZWxlY3RlZD0hMCl9ZWxzZXtmb3Iocz0iIitHKHMpLG49bnVsbCxjPTA7Yzx0Lmxlbmd0aDtjKyspe2lmKHRbY10udmFsdWU9PT1zKXt0W2NdLnNlbGVjdGVkPSEwLGkmJih0W2NdLmRlZmF1bHRTZWxlY3RlZD0hMCk7cmV0dXJufW4hPT1udWxsfHx0W2NdLmRpc2FibGVkfHwobj10W2NdKX1uIT09bnVsbCYmKG4uc2VsZWN0ZWQ9ITApfX1mdW5jdGlvbiBnZSh0LG4pe2lmKG4uZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwhPW51bGwpdGhyb3cgRXJyb3IoYSg5MSkpO3JldHVybiBGKHt9LG4se3ZhbHVlOnZvaWQgMCxkZWZhdWx0VmFsdWU6dm9pZCAwLGNoaWxkcmVuOiIiK3QuX3dyYXBwZXJTdGF0ZS5pbml0aWFsVmFsdWV9KX1mdW5jdGlvbiBYKHQsbil7dmFyIHM9bi52YWx1ZTtpZihzPT1udWxsKXtpZihzPW4uY2hpbGRyZW4sbj1uLmRlZmF1bHRWYWx1ZSxzIT1udWxsKXtpZihuIT1udWxsKXRocm93IEVycm9yKGEoOTIpKTtpZihPKHMpKXtpZigxPHMubGVuZ3RoKXRocm93IEVycm9yKGEoOTMpKTtzPXNbMF19bj1zfW49PW51bGwmJihuPSIiKSxzPW59dC5fd3JhcHBlclN0YXRlPXtpbml0aWFsVmFsdWU6RyhzKX19ZnVuY3Rpb24gVCh0LG4pe3ZhciBzPUcobi52YWx1ZSksaT1HKG4uZGVmYXVsdFZhbHVlKTtzIT1udWxsJiYocz0iIitzLHMhPT10LnZhbHVlJiYodC52YWx1ZT1zKSxuLmRlZmF1bHRWYWx1ZT09bnVsbCYmdC5kZWZhdWx0VmFsdWUhPT1zJiYodC5kZWZhdWx0VmFsdWU9cykpLGkhPW51bGwmJih0LmRlZmF1bHRWYWx1ZT0iIitpKX1mdW5jdGlvbiBiZSh0KXt2YXIgbj10LnRleHRDb250ZW50O249PT10Ll93cmFwcGVyU3RhdGUuaW5pdGlhbFZhbHVlJiZuIT09IiImJm4hPT1udWxsJiYodC52YWx1ZT1uKX1mdW5jdGlvbiBuZSh0KXtzd2l0Y2godCl7Y2FzZSJzdmciOnJldHVybiJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI7Y2FzZSJtYXRoIjpyZXR1cm4iaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTCI7ZGVmYXVsdDpyZXR1cm4iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCJ9fWZ1bmN0aW9uIHNlKHQsbil7cmV0dXJuIHQ9PW51bGx8fHQ9PT0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCI/bmUobik6dD09PSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyImJm49PT0iZm9yZWlnbk9iamVjdCI/Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiOnR9dmFyIHBlLFdlPShmdW5jdGlvbih0KXtyZXR1cm4gdHlwZW9mIE1TQXBwPCJ1IiYmTVNBcHAuZXhlY1Vuc2FmZUxvY2FsRnVuY3Rpb24/ZnVuY3Rpb24obixzLGksYyl7TVNBcHAuZXhlY1Vuc2FmZUxvY2FsRnVuY3Rpb24oZnVuY3Rpb24oKXtyZXR1cm4gdChuLHMsaSxjKX0pfTp0fSkoZnVuY3Rpb24odCxuKXtpZih0Lm5hbWVzcGFjZVVSSSE9PSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyJ8fCJpbm5lckhUTUwiaW4gdCl0LmlubmVySFRNTD1uO2Vsc2V7Zm9yKHBlPXBlfHxkb2N1bWVudC5jcmVhdGVFbGVtZW50KCJkaXYiKSxwZS5pbm5lckhUTUw9Ijxzdmc+IituLnZhbHVlT2YoKS50b1N0cmluZygpKyI8L3N2Zz4iLG49cGUuZmlyc3RDaGlsZDt0LmZpcnN0Q2hpbGQ7KXQucmVtb3ZlQ2hpbGQodC5maXJzdENoaWxkKTtmb3IoO24uZmlyc3RDaGlsZDspdC5hcHBlbmRDaGlsZChuLmZpcnN0Q2hpbGQpfX0pO2Z1bmN0aW9uIEdlKHQsbil7aWYobil7dmFyIHM9dC5maXJzdENoaWxkO2lmKHMmJnM9PT10Lmxhc3RDaGlsZCYmcy5ub2RlVHlwZT09PTMpe3Mubm9kZVZhbHVlPW47cmV0dXJufX10LnRleHRDb250ZW50PW59dmFyIEx0PXthbmltYXRpb25JdGVyYXRpb25Db3VudDohMCxhc3BlY3RSYXRpbzohMCxib3JkZXJJbWFnZU91dHNldDohMCxib3JkZXJJbWFnZVNsaWNlOiEwLGJvcmRlckltYWdlV2lkdGg6ITAsYm94RmxleDohMCxib3hGbGV4R3JvdXA6ITAsYm94T3JkaW5hbEdyb3VwOiEwLGNvbHVtbkNvdW50OiEwLGNvbHVtbnM6ITAsZmxleDohMCxmbGV4R3JvdzohMCxmbGV4UG9zaXRpdmU6ITAsZmxleFNocmluazohMCxmbGV4TmVnYXRpdmU6ITAsZmxleE9yZGVyOiEwLGdyaWRBcmVhOiEwLGdyaWRSb3c6ITAsZ3JpZFJvd0VuZDohMCxncmlkUm93U3BhbjohMCxncmlkUm93U3RhcnQ6ITAsZ3JpZENvbHVtbjohMCxncmlkQ29sdW1uRW5kOiEwLGdyaWRDb2x1bW5TcGFuOiEwLGdyaWRDb2x1bW5TdGFydDohMCxmb250V2VpZ2h0OiEwLGxpbmVDbGFtcDohMCxsaW5lSGVpZ2h0OiEwLG9wYWNpdHk6ITAsb3JkZXI6ITAsb3JwaGFuczohMCx0YWJTaXplOiEwLHdpZG93czohMCx6SW5kZXg6ITAsem9vbTohMCxmaWxsT3BhY2l0eTohMCxmbG9vZE9wYWNpdHk6ITAsc3RvcE9wYWNpdHk6ITAsc3Ryb2tlRGFzaGFycmF5OiEwLHN0cm9rZURhc2hvZmZzZXQ6ITAsc3Ryb2tlTWl0ZXJsaW1pdDohMCxzdHJva2VPcGFjaXR5OiEwLHN0cm9rZVdpZHRoOiEwfSxsdD1bIldlYmtpdCIsIm1zIiwiTW96IiwiTyJdO09iamVjdC5rZXlzKEx0KS5mb3JFYWNoKGZ1bmN0aW9uKHQpe2x0LmZvckVhY2goZnVuY3Rpb24obil7bj1uK3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkrdC5zdWJzdHJpbmcoMSksTHRbbl09THRbdF19KX0pO2Z1bmN0aW9uIGpzKHQsbixzKXtyZXR1cm4gbj09bnVsbHx8dHlwZW9mIG49PSJib29sZWFuInx8bj09PSIiPyIiOnN8fHR5cGVvZiBuIT0ibnVtYmVyInx8bj09PTB8fEx0Lmhhc093blByb3BlcnR5KHQpJiZMdFt0XT8oIiIrbikudHJpbSgpOm4rInB4In1mdW5jdGlvbiBTcyh0LG4pe3Q9dC5zdHlsZTtmb3IodmFyIHMgaW4gbilpZihuLmhhc093blByb3BlcnR5KHMpKXt2YXIgaT1zLmluZGV4T2YoIi0tIik9PT0wLGM9anMocyxuW3NdLGkpO3M9PT0iZmxvYXQiJiYocz0iY3NzRmxvYXQiKSxpP3Quc2V0UHJvcGVydHkocyxjKTp0W3NdPWN9fXZhciBEcj1GKHttZW51aXRlbTohMH0se2FyZWE6ITAsYmFzZTohMCxicjohMCxjb2w6ITAsZW1iZWQ6ITAsaHI6ITAsaW1nOiEwLGlucHV0OiEwLGtleWdlbjohMCxsaW5rOiEwLG1ldGE6ITAscGFyYW06ITAsc291cmNlOiEwLHRyYWNrOiEwLHdicjohMH0pO2Z1bmN0aW9uIFhhKHQsbil7aWYobil7aWYoRHJbdF0mJihuLmNoaWxkcmVuIT1udWxsfHxuLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MIT1udWxsKSl0aHJvdyBFcnJvcihhKDEzNyx0KSk7aWYobi5kYW5nZXJvdXNseVNldElubmVySFRNTCE9bnVsbCl7aWYobi5jaGlsZHJlbiE9bnVsbCl0aHJvdyBFcnJvcihhKDYwKSk7aWYodHlwZW9mIG4uZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwhPSJvYmplY3QifHwhKCJfX2h0bWwiaW4gbi5kYW5nZXJvdXNseVNldElubmVySFRNTCkpdGhyb3cgRXJyb3IoYSg2MSkpfWlmKG4uc3R5bGUhPW51bGwmJnR5cGVvZiBuLnN0eWxlIT0ib2JqZWN0Iil0aHJvdyBFcnJvcihhKDYyKSl9fWZ1bmN0aW9uIFFhKHQsbil7aWYodC5pbmRleE9mKCItIik9PT0tMSlyZXR1cm4gdHlwZW9mIG4uaXM9PSJzdHJpbmciO3N3aXRjaCh0KXtjYXNlImFubm90YXRpb24teG1sIjpjYXNlImNvbG9yLXByb2ZpbGUiOmNhc2UiZm9udC1mYWNlIjpjYXNlImZvbnQtZmFjZS1zcmMiOmNhc2UiZm9udC1mYWNlLXVyaSI6Y2FzZSJmb250LWZhY2UtZm9ybWF0IjpjYXNlImZvbnQtZmFjZS1uYW1lIjpjYXNlIm1pc3NpbmctZ2x5cGgiOnJldHVybiExO2RlZmF1bHQ6cmV0dXJuITB9fXZhciBKYT1udWxsO2Z1bmN0aW9uIFphKHQpe3JldHVybiB0PXQudGFyZ2V0fHx0LnNyY0VsZW1lbnR8fHdpbmRvdyx0LmNvcnJlc3BvbmRpbmdVc2VFbGVtZW50JiYodD10LmNvcnJlc3BvbmRpbmdVc2VFbGVtZW50KSx0Lm5vZGVUeXBlPT09Mz90LnBhcmVudE5vZGU6dH12YXIgZWk9bnVsbCxJcj1udWxsLF9yPW51bGw7ZnVuY3Rpb24gSWModCl7aWYodD1Lcyh0KSl7aWYodHlwZW9mIGVpIT0iZnVuY3Rpb24iKXRocm93IEVycm9yKGEoMjgwKSk7dmFyIG49dC5zdGF0ZU5vZGU7biYmKG49SGwobiksZWkodC5zdGF0ZU5vZGUsdC50eXBlLG4pKX19ZnVuY3Rpb24gX2ModCl7SXI/X3I/X3IucHVzaCh0KTpfcj1bdF06SXI9dH1mdW5jdGlvbiBPYygpe2lmKElyKXt2YXIgdD1JcixuPV9yO2lmKF9yPUlyPW51bGwsSWModCksbilmb3IodD0wO3Q8bi5sZW5ndGg7dCsrKUljKG5bdF0pfX1mdW5jdGlvbiBCYyh0LG4pe3JldHVybiB0KG4pfWZ1bmN0aW9uIHpjKCl7fXZhciB0aT0hMTtmdW5jdGlvbiBGYyh0LG4scyl7aWYodGkpcmV0dXJuIHQobixzKTt0aT0hMDt0cnl7cmV0dXJuIEJjKHQsbixzKX1maW5hbGx5e3RpPSExLChJciE9PW51bGx8fF9yIT09bnVsbCkmJih6YygpLE9jKCkpfX1mdW5jdGlvbiBOcyh0LG4pe3ZhciBzPXQuc3RhdGVOb2RlO2lmKHM9PT1udWxsKXJldHVybiBudWxsO3ZhciBpPUhsKHMpO2lmKGk9PT1udWxsKXJldHVybiBudWxsO3M9aVtuXTtlOnN3aXRjaChuKXtjYXNlIm9uQ2xpY2siOmNhc2Uib25DbGlja0NhcHR1cmUiOmNhc2Uib25Eb3VibGVDbGljayI6Y2FzZSJvbkRvdWJsZUNsaWNrQ2FwdHVyZSI6Y2FzZSJvbk1vdXNlRG93biI6Y2FzZSJvbk1vdXNlRG93bkNhcHR1cmUiOmNhc2Uib25Nb3VzZU1vdmUiOmNhc2Uib25Nb3VzZU1vdmVDYXB0dXJlIjpjYXNlIm9uTW91c2VVcCI6Y2FzZSJvbk1vdXNlVXBDYXB0dXJlIjpjYXNlIm9uTW91c2VFbnRlciI6KGk9IWkuZGlzYWJsZWQpfHwodD10LnR5cGUsaT0hKHQ9PT0iYnV0dG9uInx8dD09PSJpbnB1dCJ8fHQ9PT0ic2VsZWN0Inx8dD09PSJ0ZXh0YXJlYSIpKSx0PSFpO2JyZWFrIGU7ZGVmYXVsdDp0PSExfWlmKHQpcmV0dXJuIG51bGw7aWYocyYmdHlwZW9mIHMhPSJmdW5jdGlvbiIpdGhyb3cgRXJyb3IoYSgyMzEsbix0eXBlb2YgcykpO3JldHVybiBzfXZhciBuaT0hMTtpZihoKXRyeXt2YXIgTXM9e307T2JqZWN0LmRlZmluZVByb3BlcnR5KE1zLCJwYXNzaXZlIix7Z2V0OmZ1bmN0aW9uKCl7bmk9ITB9fSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoInRlc3QiLE1zLE1zKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigidGVzdCIsTXMsTXMpfWNhdGNoe25pPSExfWZ1bmN0aW9uIGJwKHQsbixzLGksYyxmLHksYixOKXt2YXIgQj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMyk7dHJ5e24uYXBwbHkocyxCKX1jYXRjaChsZSl7dGhpcy5vbkVycm9yKGxlKX19dmFyIFJzPSExLGJsPW51bGwsa2w9ITEscmk9bnVsbCxrcD17b25FcnJvcjpmdW5jdGlvbih0KXtScz0hMCxibD10fX07ZnVuY3Rpb24ganAodCxuLHMsaSxjLGYseSxiLE4pe1JzPSExLGJsPW51bGwsYnAuYXBwbHkoa3AsYXJndW1lbnRzKX1mdW5jdGlvbiBTcCh0LG4scyxpLGMsZix5LGIsTil7aWYoanAuYXBwbHkodGhpcyxhcmd1bWVudHMpLFJzKXtpZihScyl7dmFyIEI9Ymw7UnM9ITEsYmw9bnVsbH1lbHNlIHRocm93IEVycm9yKGEoMTk4KSk7a2x8fChrbD0hMCxyaT1CKX19ZnVuY3Rpb24gZHIodCl7dmFyIG49dCxzPXQ7aWYodC5hbHRlcm5hdGUpZm9yKDtuLnJldHVybjspbj1uLnJldHVybjtlbHNle3Q9bjtkbyBuPXQsKG4uZmxhZ3MmNDA5OCkhPT0wJiYocz1uLnJldHVybiksdD1uLnJldHVybjt3aGlsZSh0KX1yZXR1cm4gbi50YWc9PT0zP3M6bnVsbH1mdW5jdGlvbiAkYyh0KXtpZih0LnRhZz09PTEzKXt2YXIgbj10Lm1lbW9pemVkU3RhdGU7aWYobj09PW51bGwmJih0PXQuYWx0ZXJuYXRlLHQhPT1udWxsJiYobj10Lm1lbW9pemVkU3RhdGUpKSxuIT09bnVsbClyZXR1cm4gbi5kZWh5ZHJhdGVkfXJldHVybiBudWxsfWZ1bmN0aW9uIFdjKHQpe2lmKGRyKHQpIT09dCl0aHJvdyBFcnJvcihhKDE4OCkpfWZ1bmN0aW9uIE5wKHQpe3ZhciBuPXQuYWx0ZXJuYXRlO2lmKCFuKXtpZihuPWRyKHQpLG49PT1udWxsKXRocm93IEVycm9yKGEoMTg4KSk7cmV0dXJuIG4hPT10P251bGw6dH1mb3IodmFyIHM9dCxpPW47Oyl7dmFyIGM9cy5yZXR1cm47aWYoYz09PW51bGwpYnJlYWs7dmFyIGY9Yy5hbHRlcm5hdGU7aWYoZj09PW51bGwpe2lmKGk9Yy5yZXR1cm4saSE9PW51bGwpe3M9aTtjb250aW51ZX1icmVha31pZihjLmNoaWxkPT09Zi5jaGlsZCl7Zm9yKGY9Yy5jaGlsZDtmOyl7aWYoZj09PXMpcmV0dXJuIFdjKGMpLHQ7aWYoZj09PWkpcmV0dXJuIFdjKGMpLG47Zj1mLnNpYmxpbmd9dGhyb3cgRXJyb3IoYSgxODgpKX1pZihzLnJldHVybiE9PWkucmV0dXJuKXM9YyxpPWY7ZWxzZXtmb3IodmFyIHk9ITEsYj1jLmNoaWxkO2I7KXtpZihiPT09cyl7eT0hMCxzPWMsaT1mO2JyZWFrfWlmKGI9PT1pKXt5PSEwLGk9YyxzPWY7YnJlYWt9Yj1iLnNpYmxpbmd9aWYoIXkpe2ZvcihiPWYuY2hpbGQ7Yjspe2lmKGI9PT1zKXt5PSEwLHM9ZixpPWM7YnJlYWt9aWYoYj09PWkpe3k9ITAsaT1mLHM9YzticmVha31iPWIuc2libGluZ31pZigheSl0aHJvdyBFcnJvcihhKDE4OSkpfX1pZihzLmFsdGVybmF0ZSE9PWkpdGhyb3cgRXJyb3IoYSgxOTApKX1pZihzLnRhZyE9PTMpdGhyb3cgRXJyb3IoYSgxODgpKTtyZXR1cm4gcy5zdGF0ZU5vZGUuY3VycmVudD09PXM/dDpufWZ1bmN0aW9uIEhjKHQpe3JldHVybiB0PU5wKHQpLHQhPT1udWxsP1VjKHQpOm51bGx9ZnVuY3Rpb24gVWModCl7aWYodC50YWc9PT01fHx0LnRhZz09PTYpcmV0dXJuIHQ7Zm9yKHQ9dC5jaGlsZDt0IT09bnVsbDspe3ZhciBuPVVjKHQpO2lmKG4hPT1udWxsKXJldHVybiBuO3Q9dC5zaWJsaW5nfXJldHVybiBudWxsfXZhciBHYz1sLnVuc3RhYmxlX3NjaGVkdWxlQ2FsbGJhY2ssS2M9bC51bnN0YWJsZV9jYW5jZWxDYWxsYmFjayxNcD1sLnVuc3RhYmxlX3Nob3VsZFlpZWxkLFJwPWwudW5zdGFibGVfcmVxdWVzdFBhaW50LGZ0PWwudW5zdGFibGVfbm93LENwPWwudW5zdGFibGVfZ2V0Q3VycmVudFByaW9yaXR5TGV2ZWwsc2k9bC51bnN0YWJsZV9JbW1lZGlhdGVQcmlvcml0eSxWYz1sLnVuc3RhYmxlX1VzZXJCbG9ja2luZ1ByaW9yaXR5LGpsPWwudW5zdGFibGVfTm9ybWFsUHJpb3JpdHksVHA9bC51bnN0YWJsZV9Mb3dQcmlvcml0eSxxYz1sLnVuc3RhYmxlX0lkbGVQcmlvcml0eSxTbD1udWxsLGduPW51bGw7ZnVuY3Rpb24gUHAodCl7aWYoZ24mJnR5cGVvZiBnbi5vbkNvbW1pdEZpYmVyUm9vdD09ImZ1bmN0aW9uIil0cnl7Z24ub25Db21taXRGaWJlclJvb3QoU2wsdCx2b2lkIDAsKHQuY3VycmVudC5mbGFncyYxMjgpPT09MTI4KX1jYXRjaHt9fXZhciBlbj1NYXRoLmNsejMyP01hdGguY2x6MzI6QXAsRXA9TWF0aC5sb2csTHA9TWF0aC5MTjI7ZnVuY3Rpb24gQXAodCl7cmV0dXJuIHQ+Pj49MCx0PT09MD8zMjozMS0oRXAodCkvTHB8MCl8MH12YXIgTmw9NjQsTWw9NDE5NDMwNDtmdW5jdGlvbiBDcyh0KXtzd2l0Y2godCYtdCl7Y2FzZSAxOnJldHVybiAxO2Nhc2UgMjpyZXR1cm4gMjtjYXNlIDQ6cmV0dXJuIDQ7Y2FzZSA4OnJldHVybiA4O2Nhc2UgMTY6cmV0dXJuIDE2O2Nhc2UgMzI6cmV0dXJuIDMyO2Nhc2UgNjQ6Y2FzZSAxMjg6Y2FzZSAyNTY6Y2FzZSA1MTI6Y2FzZSAxMDI0OmNhc2UgMjA0ODpjYXNlIDQwOTY6Y2FzZSA4MTkyOmNhc2UgMTYzODQ6Y2FzZSAzMjc2ODpjYXNlIDY1NTM2OmNhc2UgMTMxMDcyOmNhc2UgMjYyMTQ0OmNhc2UgNTI0Mjg4OmNhc2UgMTA0ODU3NjpjYXNlIDIwOTcxNTI6cmV0dXJuIHQmNDE5NDI0MDtjYXNlIDQxOTQzMDQ6Y2FzZSA4Mzg4NjA4OmNhc2UgMTY3NzcyMTY6Y2FzZSAzMzU1NDQzMjpjYXNlIDY3MTA4ODY0OnJldHVybiB0JjEzMDAyMzQyNDtjYXNlIDEzNDIxNzcyODpyZXR1cm4gMTM0MjE3NzI4O2Nhc2UgMjY4NDM1NDU2OnJldHVybiAyNjg0MzU0NTY7Y2FzZSA1MzY4NzA5MTI6cmV0dXJuIDUzNjg3MDkxMjtjYXNlIDEwNzM3NDE4MjQ6cmV0dXJuIDEwNzM3NDE4MjQ7ZGVmYXVsdDpyZXR1cm4gdH19ZnVuY3Rpb24gUmwodCxuKXt2YXIgcz10LnBlbmRpbmdMYW5lcztpZihzPT09MClyZXR1cm4gMDt2YXIgaT0wLGM9dC5zdXNwZW5kZWRMYW5lcyxmPXQucGluZ2VkTGFuZXMseT1zJjI2ODQzNTQ1NTtpZih5IT09MCl7dmFyIGI9eSZ+YztiIT09MD9pPUNzKGIpOihmJj15LGYhPT0wJiYoaT1DcyhmKSkpfWVsc2UgeT1zJn5jLHkhPT0wP2k9Q3MoeSk6ZiE9PTAmJihpPUNzKGYpKTtpZihpPT09MClyZXR1cm4gMDtpZihuIT09MCYmbiE9PWkmJihuJmMpPT09MCYmKGM9aSYtaSxmPW4mLW4sYz49Znx8Yz09PTE2JiYoZiY0MTk0MjQwKSE9PTApKXJldHVybiBuO2lmKChpJjQpIT09MCYmKGl8PXMmMTYpLG49dC5lbnRhbmdsZWRMYW5lcyxuIT09MClmb3IodD10LmVudGFuZ2xlbWVudHMsbiY9aTswPG47KXM9MzEtZW4obiksYz0xPDxzLGl8PXRbc10sbiY9fmM7cmV0dXJuIGl9ZnVuY3Rpb24gRHAodCxuKXtzd2l0Y2godCl7Y2FzZSAxOmNhc2UgMjpjYXNlIDQ6cmV0dXJuIG4rMjUwO2Nhc2UgODpjYXNlIDE2OmNhc2UgMzI6Y2FzZSA2NDpjYXNlIDEyODpjYXNlIDI1NjpjYXNlIDUxMjpjYXNlIDEwMjQ6Y2FzZSAyMDQ4OmNhc2UgNDA5NjpjYXNlIDgxOTI6Y2FzZSAxNjM4NDpjYXNlIDMyNzY4OmNhc2UgNjU1MzY6Y2FzZSAxMzEwNzI6Y2FzZSAyNjIxNDQ6Y2FzZSA1MjQyODg6Y2FzZSAxMDQ4NTc2OmNhc2UgMjA5NzE1MjpyZXR1cm4gbis1ZTM7Y2FzZSA0MTk0MzA0OmNhc2UgODM4ODYwODpjYXNlIDE2Nzc3MjE2OmNhc2UgMzM1NTQ0MzI6Y2FzZSA2NzEwODg2NDpyZXR1cm4tMTtjYXNlIDEzNDIxNzcyODpjYXNlIDI2ODQzNTQ1NjpjYXNlIDUzNjg3MDkxMjpjYXNlIDEwNzM3NDE4MjQ6cmV0dXJuLTE7ZGVmYXVsdDpyZXR1cm4tMX19ZnVuY3Rpb24gSXAodCxuKXtmb3IodmFyIHM9dC5zdXNwZW5kZWRMYW5lcyxpPXQucGluZ2VkTGFuZXMsYz10LmV4cGlyYXRpb25UaW1lcyxmPXQucGVuZGluZ0xhbmVzOzA8Zjspe3ZhciB5PTMxLWVuKGYpLGI9MTw8eSxOPWNbeV07Tj09PS0xPygoYiZzKT09PTB8fChiJmkpIT09MCkmJihjW3ldPURwKGIsbikpOk48PW4mJih0LmV4cGlyZWRMYW5lc3w9YiksZiY9fmJ9fWZ1bmN0aW9uIGxpKHQpe3JldHVybiB0PXQucGVuZGluZ0xhbmVzJi0xMDczNzQxODI1LHQhPT0wP3Q6dCYxMDczNzQxODI0PzEwNzM3NDE4MjQ6MH1mdW5jdGlvbiBZYygpe3ZhciB0PU5sO3JldHVybiBObDw8PTEsKE5sJjQxOTQyNDApPT09MCYmKE5sPTY0KSx0fWZ1bmN0aW9uIGFpKHQpe2Zvcih2YXIgbj1bXSxzPTA7MzE+cztzKyspbi5wdXNoKHQpO3JldHVybiBufWZ1bmN0aW9uIFRzKHQsbixzKXt0LnBlbmRpbmdMYW5lc3w9bixuIT09NTM2ODcwOTEyJiYodC5zdXNwZW5kZWRMYW5lcz0wLHQucGluZ2VkTGFuZXM9MCksdD10LmV2ZW50VGltZXMsbj0zMS1lbihuKSx0W25dPXN9ZnVuY3Rpb24gX3AodCxuKXt2YXIgcz10LnBlbmRpbmdMYW5lcyZ+bjt0LnBlbmRpbmdMYW5lcz1uLHQuc3VzcGVuZGVkTGFuZXM9MCx0LnBpbmdlZExhbmVzPTAsdC5leHBpcmVkTGFuZXMmPW4sdC5tdXRhYmxlUmVhZExhbmVzJj1uLHQuZW50YW5nbGVkTGFuZXMmPW4sbj10LmVudGFuZ2xlbWVudHM7dmFyIGk9dC5ldmVudFRpbWVzO2Zvcih0PXQuZXhwaXJhdGlvblRpbWVzOzA8czspe3ZhciBjPTMxLWVuKHMpLGY9MTw8YztuW2NdPTAsaVtjXT0tMSx0W2NdPS0xLHMmPX5mfX1mdW5jdGlvbiBpaSh0LG4pe3ZhciBzPXQuZW50YW5nbGVkTGFuZXN8PW47Zm9yKHQ9dC5lbnRhbmdsZW1lbnRzO3M7KXt2YXIgaT0zMS1lbihzKSxjPTE8PGk7YyZufHRbaV0mbiYmKHRbaV18PW4pLHMmPX5jfX12YXIgWmU9MDtmdW5jdGlvbiBYYyh0KXtyZXR1cm4gdCY9LXQsMTx0PzQ8dD8odCYyNjg0MzU0NTUpIT09MD8xNjo1MzY4NzA5MTI6NDoxfXZhciBRYyxvaSxKYyxaYyxldSxjaT0hMSxDbD1bXSx6bj1udWxsLEZuPW51bGwsJG49bnVsbCxQcz1uZXcgTWFwLEVzPW5ldyBNYXAsV249W10sT3A9Im1vdXNlZG93biBtb3VzZXVwIHRvdWNoY2FuY2VsIHRvdWNoZW5kIHRvdWNoc3RhcnQgYXV4Y2xpY2sgZGJsY2xpY2sgcG9pbnRlcmNhbmNlbCBwb2ludGVyZG93biBwb2ludGVydXAgZHJhZ2VuZCBkcmFnc3RhcnQgZHJvcCBjb21wb3NpdGlvbmVuZCBjb21wb3NpdGlvbnN0YXJ0IGtleWRvd24ga2V5cHJlc3Mga2V5dXAgaW5wdXQgdGV4dElucHV0IGNvcHkgY3V0IHBhc3RlIGNsaWNrIGNoYW5nZSBjb250ZXh0bWVudSByZXNldCBzdWJtaXQiLnNwbGl0KCIgIik7ZnVuY3Rpb24gdHUodCxuKXtzd2l0Y2godCl7Y2FzZSJmb2N1c2luIjpjYXNlImZvY3Vzb3V0Ijp6bj1udWxsO2JyZWFrO2Nhc2UiZHJhZ2VudGVyIjpjYXNlImRyYWdsZWF2ZSI6Rm49bnVsbDticmVhaztjYXNlIm1vdXNlb3ZlciI6Y2FzZSJtb3VzZW91dCI6JG49bnVsbDticmVhaztjYXNlInBvaW50ZXJvdmVyIjpjYXNlInBvaW50ZXJvdXQiOlBzLmRlbGV0ZShuLnBvaW50ZXJJZCk7YnJlYWs7Y2FzZSJnb3Rwb2ludGVyY2FwdHVyZSI6Y2FzZSJsb3N0cG9pbnRlcmNhcHR1cmUiOkVzLmRlbGV0ZShuLnBvaW50ZXJJZCl9fWZ1bmN0aW9uIExzKHQsbixzLGksYyxmKXtyZXR1cm4gdD09PW51bGx8fHQubmF0aXZlRXZlbnQhPT1mPyh0PXtibG9ja2VkT246bixkb21FdmVudE5hbWU6cyxldmVudFN5c3RlbUZsYWdzOmksbmF0aXZlRXZlbnQ6Zix0YXJnZXRDb250YWluZXJzOltjXX0sbiE9PW51bGwmJihuPUtzKG4pLG4hPT1udWxsJiZvaShuKSksdCk6KHQuZXZlbnRTeXN0ZW1GbGFnc3w9aSxuPXQudGFyZ2V0Q29udGFpbmVycyxjIT09bnVsbCYmbi5pbmRleE9mKGMpPT09LTEmJm4ucHVzaChjKSx0KX1mdW5jdGlvbiBCcCh0LG4scyxpLGMpe3N3aXRjaChuKXtjYXNlImZvY3VzaW4iOnJldHVybiB6bj1Mcyh6bix0LG4scyxpLGMpLCEwO2Nhc2UiZHJhZ2VudGVyIjpyZXR1cm4gRm49THMoRm4sdCxuLHMsaSxjKSwhMDtjYXNlIm1vdXNlb3ZlciI6cmV0dXJuICRuPUxzKCRuLHQsbixzLGksYyksITA7Y2FzZSJwb2ludGVyb3ZlciI6dmFyIGY9Yy5wb2ludGVySWQ7cmV0dXJuIFBzLnNldChmLExzKFBzLmdldChmKXx8bnVsbCx0LG4scyxpLGMpKSwhMDtjYXNlImdvdHBvaW50ZXJjYXB0dXJlIjpyZXR1cm4gZj1jLnBvaW50ZXJJZCxFcy5zZXQoZixMcyhFcy5nZXQoZil8fG51bGwsdCxuLHMsaSxjKSksITB9cmV0dXJuITF9ZnVuY3Rpb24gbnUodCl7dmFyIG49cHIodC50YXJnZXQpO2lmKG4hPT1udWxsKXt2YXIgcz1kcihuKTtpZihzIT09bnVsbCl7aWYobj1zLnRhZyxuPT09MTMpe2lmKG49JGMocyksbiE9PW51bGwpe3QuYmxvY2tlZE9uPW4sZXUodC5wcmlvcml0eSxmdW5jdGlvbigpe0pjKHMpfSk7cmV0dXJufX1lbHNlIGlmKG49PT0zJiZzLnN0YXRlTm9kZS5jdXJyZW50Lm1lbW9pemVkU3RhdGUuaXNEZWh5ZHJhdGVkKXt0LmJsb2NrZWRPbj1zLnRhZz09PTM/cy5zdGF0ZU5vZGUuY29udGFpbmVySW5mbzpudWxsO3JldHVybn19fXQuYmxvY2tlZE9uPW51bGx9ZnVuY3Rpb24gVGwodCl7aWYodC5ibG9ja2VkT24hPT1udWxsKXJldHVybiExO2Zvcih2YXIgbj10LnRhcmdldENvbnRhaW5lcnM7MDxuLmxlbmd0aDspe3ZhciBzPWZpKHQuZG9tRXZlbnROYW1lLHQuZXZlbnRTeXN0ZW1GbGFncyxuWzBdLHQubmF0aXZlRXZlbnQpO2lmKHM9PT1udWxsKXtzPXQubmF0aXZlRXZlbnQ7dmFyIGk9bmV3IHMuY29uc3RydWN0b3Iocy50eXBlLHMpO0phPWkscy50YXJnZXQuZGlzcGF0Y2hFdmVudChpKSxKYT1udWxsfWVsc2UgcmV0dXJuIG49S3MocyksbiE9PW51bGwmJm9pKG4pLHQuYmxvY2tlZE9uPXMsITE7bi5zaGlmdCgpfXJldHVybiEwfWZ1bmN0aW9uIHJ1KHQsbixzKXtUbCh0KSYmcy5kZWxldGUobil9ZnVuY3Rpb24genAoKXtjaT0hMSx6biE9PW51bGwmJlRsKHpuKSYmKHpuPW51bGwpLEZuIT09bnVsbCYmVGwoRm4pJiYoRm49bnVsbCksJG4hPT1udWxsJiZUbCgkbikmJigkbj1udWxsKSxQcy5mb3JFYWNoKHJ1KSxFcy5mb3JFYWNoKHJ1KX1mdW5jdGlvbiBBcyh0LG4pe3QuYmxvY2tlZE9uPT09biYmKHQuYmxvY2tlZE9uPW51bGwsY2l8fChjaT0hMCxsLnVuc3RhYmxlX3NjaGVkdWxlQ2FsbGJhY2sobC51bnN0YWJsZV9Ob3JtYWxQcmlvcml0eSx6cCkpKX1mdW5jdGlvbiBEcyh0KXtmdW5jdGlvbiBuKGMpe3JldHVybiBBcyhjLHQpfWlmKDA8Q2wubGVuZ3RoKXtBcyhDbFswXSx0KTtmb3IodmFyIHM9MTtzPENsLmxlbmd0aDtzKyspe3ZhciBpPUNsW3NdO2kuYmxvY2tlZE9uPT09dCYmKGkuYmxvY2tlZE9uPW51bGwpfX1mb3Ioem4hPT1udWxsJiZBcyh6bix0KSxGbiE9PW51bGwmJkFzKEZuLHQpLCRuIT09bnVsbCYmQXMoJG4sdCksUHMuZm9yRWFjaChuKSxFcy5mb3JFYWNoKG4pLHM9MDtzPFduLmxlbmd0aDtzKyspaT1XbltzXSxpLmJsb2NrZWRPbj09PXQmJihpLmJsb2NrZWRPbj1udWxsKTtmb3IoOzA8V24ubGVuZ3RoJiYocz1XblswXSxzLmJsb2NrZWRPbj09PW51bGwpOyludShzKSxzLmJsb2NrZWRPbj09PW51bGwmJlduLnNoaWZ0KCl9dmFyIE9yPW9lLlJlYWN0Q3VycmVudEJhdGNoQ29uZmlnLFBsPSEwO2Z1bmN0aW9uIEZwKHQsbixzLGkpe3ZhciBjPVplLGY9T3IudHJhbnNpdGlvbjtPci50cmFuc2l0aW9uPW51bGw7dHJ5e1plPTEsdWkodCxuLHMsaSl9ZmluYWxseXtaZT1jLE9yLnRyYW5zaXRpb249Zn19ZnVuY3Rpb24gJHAodCxuLHMsaSl7dmFyIGM9WmUsZj1Pci50cmFuc2l0aW9uO09yLnRyYW5zaXRpb249bnVsbDt0cnl7WmU9NCx1aSh0LG4scyxpKX1maW5hbGx5e1plPWMsT3IudHJhbnNpdGlvbj1mfX1mdW5jdGlvbiB1aSh0LG4scyxpKXtpZihQbCl7dmFyIGM9ZmkodCxuLHMsaSk7aWYoYz09PW51bGwpQ2kodCxuLGksRWwscyksdHUodCxpKTtlbHNlIGlmKEJwKGMsdCxuLHMsaSkpaS5zdG9wUHJvcGFnYXRpb24oKTtlbHNlIGlmKHR1KHQsaSksbiY0JiYtMTxPcC5pbmRleE9mKHQpKXtmb3IoO2MhPT1udWxsOyl7dmFyIGY9S3MoYyk7aWYoZiE9PW51bGwmJlFjKGYpLGY9ZmkodCxuLHMsaSksZj09PW51bGwmJkNpKHQsbixpLEVsLHMpLGY9PT1jKWJyZWFrO2M9Zn1jIT09bnVsbCYmaS5zdG9wUHJvcGFnYXRpb24oKX1lbHNlIENpKHQsbixpLG51bGwscyl9fXZhciBFbD1udWxsO2Z1bmN0aW9uIGZpKHQsbixzLGkpe2lmKEVsPW51bGwsdD1aYShpKSx0PXByKHQpLHQhPT1udWxsKWlmKG49ZHIodCksbj09PW51bGwpdD1udWxsO2Vsc2UgaWYocz1uLnRhZyxzPT09MTMpe2lmKHQ9JGMobiksdCE9PW51bGwpcmV0dXJuIHQ7dD1udWxsfWVsc2UgaWYocz09PTMpe2lmKG4uc3RhdGVOb2RlLmN1cnJlbnQubWVtb2l6ZWRTdGF0ZS5pc0RlaHlkcmF0ZWQpcmV0dXJuIG4udGFnPT09Mz9uLnN0YXRlTm9kZS5jb250YWluZXJJbmZvOm51bGw7dD1udWxsfWVsc2UgbiE9PXQmJih0PW51bGwpO3JldHVybiBFbD10LG51bGx9ZnVuY3Rpb24gc3UodCl7c3dpdGNoKHQpe2Nhc2UiY2FuY2VsIjpjYXNlImNsaWNrIjpjYXNlImNsb3NlIjpjYXNlImNvbnRleHRtZW51IjpjYXNlImNvcHkiOmNhc2UiY3V0IjpjYXNlImF1eGNsaWNrIjpjYXNlImRibGNsaWNrIjpjYXNlImRyYWdlbmQiOmNhc2UiZHJhZ3N0YXJ0IjpjYXNlImRyb3AiOmNhc2UiZm9jdXNpbiI6Y2FzZSJmb2N1c291dCI6Y2FzZSJpbnB1dCI6Y2FzZSJpbnZhbGlkIjpjYXNlImtleWRvd24iOmNhc2Uia2V5cHJlc3MiOmNhc2Uia2V5dXAiOmNhc2UibW91c2Vkb3duIjpjYXNlIm1vdXNldXAiOmNhc2UicGFzdGUiOmNhc2UicGF1c2UiOmNhc2UicGxheSI6Y2FzZSJwb2ludGVyY2FuY2VsIjpjYXNlInBvaW50ZXJkb3duIjpjYXNlInBvaW50ZXJ1cCI6Y2FzZSJyYXRlY2hhbmdlIjpjYXNlInJlc2V0IjpjYXNlInJlc2l6ZSI6Y2FzZSJzZWVrZWQiOmNhc2Uic3VibWl0IjpjYXNlInRvdWNoY2FuY2VsIjpjYXNlInRvdWNoZW5kIjpjYXNlInRvdWNoc3RhcnQiOmNhc2Uidm9sdW1lY2hhbmdlIjpjYXNlImNoYW5nZSI6Y2FzZSJzZWxlY3Rpb25jaGFuZ2UiOmNhc2UidGV4dElucHV0IjpjYXNlImNvbXBvc2l0aW9uc3RhcnQiOmNhc2UiY29tcG9zaXRpb25lbmQiOmNhc2UiY29tcG9zaXRpb251cGRhdGUiOmNhc2UiYmVmb3JlYmx1ciI6Y2FzZSJhZnRlcmJsdXIiOmNhc2UiYmVmb3JlaW5wdXQiOmNhc2UiYmx1ciI6Y2FzZSJmdWxsc2NyZWVuY2hhbmdlIjpjYXNlImZvY3VzIjpjYXNlImhhc2hjaGFuZ2UiOmNhc2UicG9wc3RhdGUiOmNhc2Uic2VsZWN0IjpjYXNlInNlbGVjdHN0YXJ0IjpyZXR1cm4gMTtjYXNlImRyYWciOmNhc2UiZHJhZ2VudGVyIjpjYXNlImRyYWdleGl0IjpjYXNlImRyYWdsZWF2ZSI6Y2FzZSJkcmFnb3ZlciI6Y2FzZSJtb3VzZW1vdmUiOmNhc2UibW91c2VvdXQiOmNhc2UibW91c2VvdmVyIjpjYXNlInBvaW50ZXJtb3ZlIjpjYXNlInBvaW50ZXJvdXQiOmNhc2UicG9pbnRlcm92ZXIiOmNhc2Uic2Nyb2xsIjpjYXNlInRvZ2dsZSI6Y2FzZSJ0b3VjaG1vdmUiOmNhc2Uid2hlZWwiOmNhc2UibW91c2VlbnRlciI6Y2FzZSJtb3VzZWxlYXZlIjpjYXNlInBvaW50ZXJlbnRlciI6Y2FzZSJwb2ludGVybGVhdmUiOnJldHVybiA0O2Nhc2UibWVzc2FnZSI6c3dpdGNoKENwKCkpe2Nhc2Ugc2k6cmV0dXJuIDE7Y2FzZSBWYzpyZXR1cm4gNDtjYXNlIGpsOmNhc2UgVHA6cmV0dXJuIDE2O2Nhc2UgcWM6cmV0dXJuIDUzNjg3MDkxMjtkZWZhdWx0OnJldHVybiAxNn1kZWZhdWx0OnJldHVybiAxNn19dmFyIEhuPW51bGwsZGk9bnVsbCxMbD1udWxsO2Z1bmN0aW9uIGx1KCl7aWYoTGwpcmV0dXJuIExsO3ZhciB0LG49ZGkscz1uLmxlbmd0aCxpLGM9InZhbHVlImluIEhuP0huLnZhbHVlOkhuLnRleHRDb250ZW50LGY9Yy5sZW5ndGg7Zm9yKHQ9MDt0PHMmJm5bdF09PT1jW3RdO3QrKyk7dmFyIHk9cy10O2ZvcihpPTE7aTw9eSYmbltzLWldPT09Y1tmLWldO2krKyk7cmV0dXJuIExsPWMuc2xpY2UodCwxPGk/MS1pOnZvaWQgMCl9ZnVuY3Rpb24gQWwodCl7dmFyIG49dC5rZXlDb2RlO3JldHVybiJjaGFyQ29kZSJpbiB0Pyh0PXQuY2hhckNvZGUsdD09PTAmJm49PT0xMyYmKHQ9MTMpKTp0PW4sdD09PTEwJiYodD0xMyksMzI8PXR8fHQ9PT0xMz90OjB9ZnVuY3Rpb24gRGwoKXtyZXR1cm4hMH1mdW5jdGlvbiBhdSgpe3JldHVybiExfWZ1bmN0aW9uIFV0KHQpe2Z1bmN0aW9uIG4ocyxpLGMsZix5KXt0aGlzLl9yZWFjdE5hbWU9cyx0aGlzLl90YXJnZXRJbnN0PWMsdGhpcy50eXBlPWksdGhpcy5uYXRpdmVFdmVudD1mLHRoaXMudGFyZ2V0PXksdGhpcy5jdXJyZW50VGFyZ2V0PW51bGw7Zm9yKHZhciBiIGluIHQpdC5oYXNPd25Qcm9wZXJ0eShiKSYmKHM9dFtiXSx0aGlzW2JdPXM/cyhmKTpmW2JdKTtyZXR1cm4gdGhpcy5pc0RlZmF1bHRQcmV2ZW50ZWQ9KGYuZGVmYXVsdFByZXZlbnRlZCE9bnVsbD9mLmRlZmF1bHRQcmV2ZW50ZWQ6Zi5yZXR1cm5WYWx1ZT09PSExKT9EbDphdSx0aGlzLmlzUHJvcGFnYXRpb25TdG9wcGVkPWF1LHRoaXN9cmV0dXJuIEYobi5wcm90b3R5cGUse3ByZXZlbnREZWZhdWx0OmZ1bmN0aW9uKCl7dGhpcy5kZWZhdWx0UHJldmVudGVkPSEwO3ZhciBzPXRoaXMubmF0aXZlRXZlbnQ7cyYmKHMucHJldmVudERlZmF1bHQ/cy5wcmV2ZW50RGVmYXVsdCgpOnR5cGVvZiBzLnJldHVyblZhbHVlIT0idW5rbm93biImJihzLnJldHVyblZhbHVlPSExKSx0aGlzLmlzRGVmYXVsdFByZXZlbnRlZD1EbCl9LHN0b3BQcm9wYWdhdGlvbjpmdW5jdGlvbigpe3ZhciBzPXRoaXMubmF0aXZlRXZlbnQ7cyYmKHMuc3RvcFByb3BhZ2F0aW9uP3Muc3RvcFByb3BhZ2F0aW9uKCk6dHlwZW9mIHMuY2FuY2VsQnViYmxlIT0idW5rbm93biImJihzLmNhbmNlbEJ1YmJsZT0hMCksdGhpcy5pc1Byb3BhZ2F0aW9uU3RvcHBlZD1EbCl9LHBlcnNpc3Q6ZnVuY3Rpb24oKXt9LGlzUGVyc2lzdGVudDpEbH0pLG59dmFyIEJyPXtldmVudFBoYXNlOjAsYnViYmxlczowLGNhbmNlbGFibGU6MCx0aW1lU3RhbXA6ZnVuY3Rpb24odCl7cmV0dXJuIHQudGltZVN0YW1wfHxEYXRlLm5vdygpfSxkZWZhdWx0UHJldmVudGVkOjAsaXNUcnVzdGVkOjB9LHBpPVV0KEJyKSxJcz1GKHt9LEJyLHt2aWV3OjAsZGV0YWlsOjB9KSxXcD1VdChJcyksaGksbWksX3MsSWw9Rih7fSxJcyx7c2NyZWVuWDowLHNjcmVlblk6MCxjbGllbnRYOjAsY2xpZW50WTowLHBhZ2VYOjAscGFnZVk6MCxjdHJsS2V5OjAsc2hpZnRLZXk6MCxhbHRLZXk6MCxtZXRhS2V5OjAsZ2V0TW9kaWZpZXJTdGF0ZTp4aSxidXR0b246MCxidXR0b25zOjAscmVsYXRlZFRhcmdldDpmdW5jdGlvbih0KXtyZXR1cm4gdC5yZWxhdGVkVGFyZ2V0PT09dm9pZCAwP3QuZnJvbUVsZW1lbnQ9PT10LnNyY0VsZW1lbnQ/dC50b0VsZW1lbnQ6dC5mcm9tRWxlbWVudDp0LnJlbGF0ZWRUYXJnZXR9LG1vdmVtZW50WDpmdW5jdGlvbih0KXtyZXR1cm4ibW92ZW1lbnRYImluIHQ/dC5tb3ZlbWVudFg6KHQhPT1fcyYmKF9zJiZ0LnR5cGU9PT0ibW91c2Vtb3ZlIj8oaGk9dC5zY3JlZW5YLV9zLnNjcmVlblgsbWk9dC5zY3JlZW5ZLV9zLnNjcmVlblkpOm1pPWhpPTAsX3M9dCksaGkpfSxtb3ZlbWVudFk6ZnVuY3Rpb24odCl7cmV0dXJuIm1vdmVtZW50WSJpbiB0P3QubW92ZW1lbnRZOm1pfX0pLGl1PVV0KElsKSxIcD1GKHt9LElsLHtkYXRhVHJhbnNmZXI6MH0pLFVwPVV0KEhwKSxHcD1GKHt9LElzLHtyZWxhdGVkVGFyZ2V0OjB9KSxnaT1VdChHcCksS3A9Rih7fSxCcix7YW5pbWF0aW9uTmFtZTowLGVsYXBzZWRUaW1lOjAscHNldWRvRWxlbWVudDowfSksVnA9VXQoS3ApLHFwPUYoe30sQnIse2NsaXBib2FyZERhdGE6ZnVuY3Rpb24odCl7cmV0dXJuImNsaXBib2FyZERhdGEiaW4gdD90LmNsaXBib2FyZERhdGE6d2luZG93LmNsaXBib2FyZERhdGF9fSksWXA9VXQocXApLFhwPUYoe30sQnIse2RhdGE6MH0pLG91PVV0KFhwKSxRcD17RXNjOiJFc2NhcGUiLFNwYWNlYmFyOiIgIixMZWZ0OiJBcnJvd0xlZnQiLFVwOiJBcnJvd1VwIixSaWdodDoiQXJyb3dSaWdodCIsRG93bjoiQXJyb3dEb3duIixEZWw6IkRlbGV0ZSIsV2luOiJPUyIsTWVudToiQ29udGV4dE1lbnUiLEFwcHM6IkNvbnRleHRNZW51IixTY3JvbGw6IlNjcm9sbExvY2siLE1velByaW50YWJsZUtleToiVW5pZGVudGlmaWVkIn0sSnA9ezg6IkJhY2tzcGFjZSIsOToiVGFiIiwxMjoiQ2xlYXIiLDEzOiJFbnRlciIsMTY6IlNoaWZ0IiwxNzoiQ29udHJvbCIsMTg6IkFsdCIsMTk6IlBhdXNlIiwyMDoiQ2Fwc0xvY2siLDI3OiJFc2NhcGUiLDMyOiIgIiwzMzoiUGFnZVVwIiwzNDoiUGFnZURvd24iLDM1OiJFbmQiLDM2OiJIb21lIiwzNzoiQXJyb3dMZWZ0IiwzODoiQXJyb3dVcCIsMzk6IkFycm93UmlnaHQiLDQwOiJBcnJvd0Rvd24iLDQ1OiJJbnNlcnQiLDQ2OiJEZWxldGUiLDExMjoiRjEiLDExMzoiRjIiLDExNDoiRjMiLDExNToiRjQiLDExNjoiRjUiLDExNzoiRjYiLDExODoiRjciLDExOToiRjgiLDEyMDoiRjkiLDEyMToiRjEwIiwxMjI6IkYxMSIsMTIzOiJGMTIiLDE0NDoiTnVtTG9jayIsMTQ1OiJTY3JvbGxMb2NrIiwyMjQ6Ik1ldGEifSxacD17QWx0OiJhbHRLZXkiLENvbnRyb2w6ImN0cmxLZXkiLE1ldGE6Im1ldGFLZXkiLFNoaWZ0OiJzaGlmdEtleSJ9O2Z1bmN0aW9uIGVoKHQpe3ZhciBuPXRoaXMubmF0aXZlRXZlbnQ7cmV0dXJuIG4uZ2V0TW9kaWZpZXJTdGF0ZT9uLmdldE1vZGlmaWVyU3RhdGUodCk6KHQ9WnBbdF0pPyEhblt0XTohMX1mdW5jdGlvbiB4aSgpe3JldHVybiBlaH12YXIgdGg9Rih7fSxJcyx7a2V5OmZ1bmN0aW9uKHQpe2lmKHQua2V5KXt2YXIgbj1RcFt0LmtleV18fHQua2V5O2lmKG4hPT0iVW5pZGVudGlmaWVkIilyZXR1cm4gbn1yZXR1cm4gdC50eXBlPT09ImtleXByZXNzIj8odD1BbCh0KSx0PT09MTM/IkVudGVyIjpTdHJpbmcuZnJvbUNoYXJDb2RlKHQpKTp0LnR5cGU9PT0ia2V5ZG93biJ8fHQudHlwZT09PSJrZXl1cCI/SnBbdC5rZXlDb2RlXXx8IlVuaWRlbnRpZmllZCI6IiJ9LGNvZGU6MCxsb2NhdGlvbjowLGN0cmxLZXk6MCxzaGlmdEtleTowLGFsdEtleTowLG1ldGFLZXk6MCxyZXBlYXQ6MCxsb2NhbGU6MCxnZXRNb2RpZmllclN0YXRlOnhpLGNoYXJDb2RlOmZ1bmN0aW9uKHQpe3JldHVybiB0LnR5cGU9PT0ia2V5cHJlc3MiP0FsKHQpOjB9LGtleUNvZGU6ZnVuY3Rpb24odCl7cmV0dXJuIHQudHlwZT09PSJrZXlkb3duInx8dC50eXBlPT09ImtleXVwIj90LmtleUNvZGU6MH0sd2hpY2g6ZnVuY3Rpb24odCl7cmV0dXJuIHQudHlwZT09PSJrZXlwcmVzcyI/QWwodCk6dC50eXBlPT09ImtleWRvd24ifHx0LnR5cGU9PT0ia2V5dXAiP3Qua2V5Q29kZTowfX0pLG5oPVV0KHRoKSxyaD1GKHt9LElsLHtwb2ludGVySWQ6MCx3aWR0aDowLGhlaWdodDowLHByZXNzdXJlOjAsdGFuZ2VudGlhbFByZXNzdXJlOjAsdGlsdFg6MCx0aWx0WTowLHR3aXN0OjAscG9pbnRlclR5cGU6MCxpc1ByaW1hcnk6MH0pLGN1PVV0KHJoKSxzaD1GKHt9LElzLHt0b3VjaGVzOjAsdGFyZ2V0VG91Y2hlczowLGNoYW5nZWRUb3VjaGVzOjAsYWx0S2V5OjAsbWV0YUtleTowLGN0cmxLZXk6MCxzaGlmdEtleTowLGdldE1vZGlmaWVyU3RhdGU6eGl9KSxsaD1VdChzaCksYWg9Rih7fSxCcix7cHJvcGVydHlOYW1lOjAsZWxhcHNlZFRpbWU6MCxwc2V1ZG9FbGVtZW50OjB9KSxpaD1VdChhaCksb2g9Rih7fSxJbCx7ZGVsdGFYOmZ1bmN0aW9uKHQpe3JldHVybiJkZWx0YVgiaW4gdD90LmRlbHRhWDoid2hlZWxEZWx0YVgiaW4gdD8tdC53aGVlbERlbHRhWDowfSxkZWx0YVk6ZnVuY3Rpb24odCl7cmV0dXJuImRlbHRhWSJpbiB0P3QuZGVsdGFZOiJ3aGVlbERlbHRhWSJpbiB0Py10LndoZWVsRGVsdGFZOiJ3aGVlbERlbHRhImluIHQ/LXQud2hlZWxEZWx0YTowfSxkZWx0YVo6MCxkZWx0YU1vZGU6MH0pLGNoPVV0KG9oKSx1aD1bOSwxMywyNywzMl0seWk9aCYmIkNvbXBvc2l0aW9uRXZlbnQiaW4gd2luZG93LE9zPW51bGw7aCYmImRvY3VtZW50TW9kZSJpbiBkb2N1bWVudCYmKE9zPWRvY3VtZW50LmRvY3VtZW50TW9kZSk7dmFyIGZoPWgmJiJUZXh0RXZlbnQiaW4gd2luZG93JiYhT3MsdXU9aCYmKCF5aXx8T3MmJjg8T3MmJjExPj1PcyksZnU9IiAiLGR1PSExO2Z1bmN0aW9uIHB1KHQsbil7c3dpdGNoKHQpe2Nhc2Uia2V5dXAiOnJldHVybiB1aC5pbmRleE9mKG4ua2V5Q29kZSkhPT0tMTtjYXNlImtleWRvd24iOnJldHVybiBuLmtleUNvZGUhPT0yMjk7Y2FzZSJrZXlwcmVzcyI6Y2FzZSJtb3VzZWRvd24iOmNhc2UiZm9jdXNvdXQiOnJldHVybiEwO2RlZmF1bHQ6cmV0dXJuITF9fWZ1bmN0aW9uIGh1KHQpe3JldHVybiB0PXQuZGV0YWlsLHR5cGVvZiB0PT0ib2JqZWN0IiYmImRhdGEiaW4gdD90LmRhdGE6bnVsbH12YXIgenI9ITE7ZnVuY3Rpb24gZGgodCxuKXtzd2l0Y2godCl7Y2FzZSJjb21wb3NpdGlvbmVuZCI6cmV0dXJuIGh1KG4pO2Nhc2Uia2V5cHJlc3MiOnJldHVybiBuLndoaWNoIT09MzI/bnVsbDooZHU9ITAsZnUpO2Nhc2UidGV4dElucHV0IjpyZXR1cm4gdD1uLmRhdGEsdD09PWZ1JiZkdT9udWxsOnQ7ZGVmYXVsdDpyZXR1cm4gbnVsbH19ZnVuY3Rpb24gcGgodCxuKXtpZih6cilyZXR1cm4gdD09PSJjb21wb3NpdGlvbmVuZCJ8fCF5aSYmcHUodCxuKT8odD1sdSgpLExsPWRpPUhuPW51bGwsenI9ITEsdCk6bnVsbDtzd2l0Y2godCl7Y2FzZSJwYXN0ZSI6cmV0dXJuIG51bGw7Y2FzZSJrZXlwcmVzcyI6aWYoIShuLmN0cmxLZXl8fG4uYWx0S2V5fHxuLm1ldGFLZXkpfHxuLmN0cmxLZXkmJm4uYWx0S2V5KXtpZihuLmNoYXImJjE8bi5jaGFyLmxlbmd0aClyZXR1cm4gbi5jaGFyO2lmKG4ud2hpY2gpcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUobi53aGljaCl9cmV0dXJuIG51bGw7Y2FzZSJjb21wb3NpdGlvbmVuZCI6cmV0dXJuIHV1JiZuLmxvY2FsZSE9PSJrbyI/bnVsbDpuLmRhdGE7ZGVmYXVsdDpyZXR1cm4gbnVsbH19dmFyIGhoPXtjb2xvcjohMCxkYXRlOiEwLGRhdGV0aW1lOiEwLCJkYXRldGltZS1sb2NhbCI6ITAsZW1haWw6ITAsbW9udGg6ITAsbnVtYmVyOiEwLHBhc3N3b3JkOiEwLHJhbmdlOiEwLHNlYXJjaDohMCx0ZWw6ITAsdGV4dDohMCx0aW1lOiEwLHVybDohMCx3ZWVrOiEwfTtmdW5jdGlvbiBtdSh0KXt2YXIgbj10JiZ0Lm5vZGVOYW1lJiZ0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7cmV0dXJuIG49PT0iaW5wdXQiPyEhaGhbdC50eXBlXTpuPT09InRleHRhcmVhIn1mdW5jdGlvbiBndSh0LG4scyxpKXtfYyhpKSxuPUZsKG4sIm9uQ2hhbmdlIiksMDxuLmxlbmd0aCYmKHM9bmV3IHBpKCJvbkNoYW5nZSIsImNoYW5nZSIsbnVsbCxzLGkpLHQucHVzaCh7ZXZlbnQ6cyxsaXN0ZW5lcnM6bn0pKX12YXIgQnM9bnVsbCx6cz1udWxsO2Z1bmN0aW9uIG1oKHQpe0R1KHQsMCl9ZnVuY3Rpb24gX2wodCl7dmFyIG49VXIodCk7aWYoeihuKSlyZXR1cm4gdH1mdW5jdGlvbiBnaCh0LG4pe2lmKHQ9PT0iY2hhbmdlIilyZXR1cm4gbn12YXIgeHU9ITE7aWYoaCl7dmFyIHZpO2lmKGgpe3ZhciB3aT0ib25pbnB1dCJpbiBkb2N1bWVudDtpZighd2kpe3ZhciB5dT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJkaXYiKTt5dS5zZXRBdHRyaWJ1dGUoIm9uaW5wdXQiLCJyZXR1cm47Iiksd2k9dHlwZW9mIHl1Lm9uaW5wdXQ9PSJmdW5jdGlvbiJ9dmk9d2l9ZWxzZSB2aT0hMTt4dT12aSYmKCFkb2N1bWVudC5kb2N1bWVudE1vZGV8fDk8ZG9jdW1lbnQuZG9jdW1lbnRNb2RlKX1mdW5jdGlvbiB2dSgpe0JzJiYoQnMuZGV0YWNoRXZlbnQoIm9ucHJvcGVydHljaGFuZ2UiLHd1KSx6cz1Ccz1udWxsKX1mdW5jdGlvbiB3dSh0KXtpZih0LnByb3BlcnR5TmFtZT09PSJ2YWx1ZSImJl9sKHpzKSl7dmFyIG49W107Z3Uobix6cyx0LFphKHQpKSxGYyhtaCxuKX19ZnVuY3Rpb24geGgodCxuLHMpe3Q9PT0iZm9jdXNpbiI/KHZ1KCksQnM9bix6cz1zLEJzLmF0dGFjaEV2ZW50KCJvbnByb3BlcnR5Y2hhbmdlIix3dSkpOnQ9PT0iZm9jdXNvdXQiJiZ2dSgpfWZ1bmN0aW9uIHloKHQpe2lmKHQ9PT0ic2VsZWN0aW9uY2hhbmdlInx8dD09PSJrZXl1cCJ8fHQ9PT0ia2V5ZG93biIpcmV0dXJuIF9sKHpzKX1mdW5jdGlvbiB2aCh0LG4pe2lmKHQ9PT0iY2xpY2siKXJldHVybiBfbChuKX1mdW5jdGlvbiB3aCh0LG4pe2lmKHQ9PT0iaW5wdXQifHx0PT09ImNoYW5nZSIpcmV0dXJuIF9sKG4pfWZ1bmN0aW9uIGJoKHQsbil7cmV0dXJuIHQ9PT1uJiYodCE9PTB8fDEvdD09PTEvbil8fHQhPT10JiZuIT09bn12YXIgdG49dHlwZW9mIE9iamVjdC5pcz09ImZ1bmN0aW9uIj9PYmplY3QuaXM6Ymg7ZnVuY3Rpb24gRnModCxuKXtpZih0bih0LG4pKXJldHVybiEwO2lmKHR5cGVvZiB0IT0ib2JqZWN0Inx8dD09PW51bGx8fHR5cGVvZiBuIT0ib2JqZWN0Inx8bj09PW51bGwpcmV0dXJuITE7dmFyIHM9T2JqZWN0LmtleXModCksaT1PYmplY3Qua2V5cyhuKTtpZihzLmxlbmd0aCE9PWkubGVuZ3RoKXJldHVybiExO2ZvcihpPTA7aTxzLmxlbmd0aDtpKyspe3ZhciBjPXNbaV07aWYoIW0uY2FsbChuLGMpfHwhdG4odFtjXSxuW2NdKSlyZXR1cm4hMX1yZXR1cm4hMH1mdW5jdGlvbiBidSh0KXtmb3IoO3QmJnQuZmlyc3RDaGlsZDspdD10LmZpcnN0Q2hpbGQ7cmV0dXJuIHR9ZnVuY3Rpb24ga3UodCxuKXt2YXIgcz1idSh0KTt0PTA7Zm9yKHZhciBpO3M7KXtpZihzLm5vZGVUeXBlPT09Myl7aWYoaT10K3MudGV4dENvbnRlbnQubGVuZ3RoLHQ8PW4mJmk+PW4pcmV0dXJue25vZGU6cyxvZmZzZXQ6bi10fTt0PWl9ZTp7Zm9yKDtzOyl7aWYocy5uZXh0U2libGluZyl7cz1zLm5leHRTaWJsaW5nO2JyZWFrIGV9cz1zLnBhcmVudE5vZGV9cz12b2lkIDB9cz1idShzKX19ZnVuY3Rpb24ganUodCxuKXtyZXR1cm4gdCYmbj90PT09bj8hMDp0JiZ0Lm5vZGVUeXBlPT09Mz8hMTpuJiZuLm5vZGVUeXBlPT09Mz9qdSh0LG4ucGFyZW50Tm9kZSk6ImNvbnRhaW5zImluIHQ/dC5jb250YWlucyhuKTp0LmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uPyEhKHQuY29tcGFyZURvY3VtZW50UG9zaXRpb24obikmMTYpOiExOiExfWZ1bmN0aW9uIFN1KCl7Zm9yKHZhciB0PXdpbmRvdyxuPWZlKCk7biBpbnN0YW5jZW9mIHQuSFRNTElGcmFtZUVsZW1lbnQ7KXt0cnl7dmFyIHM9dHlwZW9mIG4uY29udGVudFdpbmRvdy5sb2NhdGlvbi5ocmVmPT0ic3RyaW5nIn1jYXRjaHtzPSExfWlmKHMpdD1uLmNvbnRlbnRXaW5kb3c7ZWxzZSBicmVhaztuPWZlKHQuZG9jdW1lbnQpfXJldHVybiBufWZ1bmN0aW9uIGJpKHQpe3ZhciBuPXQmJnQubm9kZU5hbWUmJnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtyZXR1cm4gbiYmKG49PT0iaW5wdXQiJiYodC50eXBlPT09InRleHQifHx0LnR5cGU9PT0ic2VhcmNoInx8dC50eXBlPT09InRlbCJ8fHQudHlwZT09PSJ1cmwifHx0LnR5cGU9PT0icGFzc3dvcmQiKXx8bj09PSJ0ZXh0YXJlYSJ8fHQuY29udGVudEVkaXRhYmxlPT09InRydWUiKX1mdW5jdGlvbiBraCh0KXt2YXIgbj1TdSgpLHM9dC5mb2N1c2VkRWxlbSxpPXQuc2VsZWN0aW9uUmFuZ2U7aWYobiE9PXMmJnMmJnMub3duZXJEb2N1bWVudCYmanUocy5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxzKSl7aWYoaSE9PW51bGwmJmJpKHMpKXtpZihuPWkuc3RhcnQsdD1pLmVuZCx0PT09dm9pZCAwJiYodD1uKSwic2VsZWN0aW9uU3RhcnQiaW4gcylzLnNlbGVjdGlvblN0YXJ0PW4scy5zZWxlY3Rpb25FbmQ9TWF0aC5taW4odCxzLnZhbHVlLmxlbmd0aCk7ZWxzZSBpZih0PShuPXMub3duZXJEb2N1bWVudHx8ZG9jdW1lbnQpJiZuLmRlZmF1bHRWaWV3fHx3aW5kb3csdC5nZXRTZWxlY3Rpb24pe3Q9dC5nZXRTZWxlY3Rpb24oKTt2YXIgYz1zLnRleHRDb250ZW50Lmxlbmd0aCxmPU1hdGgubWluKGkuc3RhcnQsYyk7aT1pLmVuZD09PXZvaWQgMD9mOk1hdGgubWluKGkuZW5kLGMpLCF0LmV4dGVuZCYmZj5pJiYoYz1pLGk9ZixmPWMpLGM9a3UocyxmKTt2YXIgeT1rdShzLGkpO2MmJnkmJih0LnJhbmdlQ291bnQhPT0xfHx0LmFuY2hvck5vZGUhPT1jLm5vZGV8fHQuYW5jaG9yT2Zmc2V0IT09Yy5vZmZzZXR8fHQuZm9jdXNOb2RlIT09eS5ub2RlfHx0LmZvY3VzT2Zmc2V0IT09eS5vZmZzZXQpJiYobj1uLmNyZWF0ZVJhbmdlKCksbi5zZXRTdGFydChjLm5vZGUsYy5vZmZzZXQpLHQucmVtb3ZlQWxsUmFuZ2VzKCksZj5pPyh0LmFkZFJhbmdlKG4pLHQuZXh0ZW5kKHkubm9kZSx5Lm9mZnNldCkpOihuLnNldEVuZCh5Lm5vZGUseS5vZmZzZXQpLHQuYWRkUmFuZ2UobikpKX19Zm9yKG49W10sdD1zO3Q9dC5wYXJlbnROb2RlOyl0Lm5vZGVUeXBlPT09MSYmbi5wdXNoKHtlbGVtZW50OnQsbGVmdDp0LnNjcm9sbExlZnQsdG9wOnQuc2Nyb2xsVG9wfSk7Zm9yKHR5cGVvZiBzLmZvY3VzPT0iZnVuY3Rpb24iJiZzLmZvY3VzKCkscz0wO3M8bi5sZW5ndGg7cysrKXQ9bltzXSx0LmVsZW1lbnQuc2Nyb2xsTGVmdD10LmxlZnQsdC5lbGVtZW50LnNjcm9sbFRvcD10LnRvcH19dmFyIGpoPWgmJiJkb2N1bWVudE1vZGUiaW4gZG9jdW1lbnQmJjExPj1kb2N1bWVudC5kb2N1bWVudE1vZGUsRnI9bnVsbCxraT1udWxsLCRzPW51bGwsamk9ITE7ZnVuY3Rpb24gTnUodCxuLHMpe3ZhciBpPXMud2luZG93PT09cz9zLmRvY3VtZW50OnMubm9kZVR5cGU9PT05P3M6cy5vd25lckRvY3VtZW50O2ppfHxGcj09bnVsbHx8RnIhPT1mZShpKXx8KGk9RnIsInNlbGVjdGlvblN0YXJ0ImluIGkmJmJpKGkpP2k9e3N0YXJ0Omkuc2VsZWN0aW9uU3RhcnQsZW5kOmkuc2VsZWN0aW9uRW5kfTooaT0oaS5vd25lckRvY3VtZW50JiZpLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXd8fHdpbmRvdykuZ2V0U2VsZWN0aW9uKCksaT17YW5jaG9yTm9kZTppLmFuY2hvck5vZGUsYW5jaG9yT2Zmc2V0OmkuYW5jaG9yT2Zmc2V0LGZvY3VzTm9kZTppLmZvY3VzTm9kZSxmb2N1c09mZnNldDppLmZvY3VzT2Zmc2V0fSksJHMmJkZzKCRzLGkpfHwoJHM9aSxpPUZsKGtpLCJvblNlbGVjdCIpLDA8aS5sZW5ndGgmJihuPW5ldyBwaSgib25TZWxlY3QiLCJzZWxlY3QiLG51bGwsbixzKSx0LnB1c2goe2V2ZW50Om4sbGlzdGVuZXJzOml9KSxuLnRhcmdldD1GcikpKX1mdW5jdGlvbiBPbCh0LG4pe3ZhciBzPXt9O3JldHVybiBzW3QudG9Mb3dlckNhc2UoKV09bi50b0xvd2VyQ2FzZSgpLHNbIldlYmtpdCIrdF09IndlYmtpdCIrbixzWyJNb3oiK3RdPSJtb3oiK24sc312YXIgJHI9e2FuaW1hdGlvbmVuZDpPbCgiQW5pbWF0aW9uIiwiQW5pbWF0aW9uRW5kIiksYW5pbWF0aW9uaXRlcmF0aW9uOk9sKCJBbmltYXRpb24iLCJBbmltYXRpb25JdGVyYXRpb24iKSxhbmltYXRpb25zdGFydDpPbCgiQW5pbWF0aW9uIiwiQW5pbWF0aW9uU3RhcnQiKSx0cmFuc2l0aW9uZW5kOk9sKCJUcmFuc2l0aW9uIiwiVHJhbnNpdGlvbkVuZCIpfSxTaT17fSxNdT17fTtoJiYoTXU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiZGl2Iikuc3R5bGUsIkFuaW1hdGlvbkV2ZW50ImluIHdpbmRvd3x8KGRlbGV0ZSAkci5hbmltYXRpb25lbmQuYW5pbWF0aW9uLGRlbGV0ZSAkci5hbmltYXRpb25pdGVyYXRpb24uYW5pbWF0aW9uLGRlbGV0ZSAkci5hbmltYXRpb25zdGFydC5hbmltYXRpb24pLCJUcmFuc2l0aW9uRXZlbnQiaW4gd2luZG93fHxkZWxldGUgJHIudHJhbnNpdGlvbmVuZC50cmFuc2l0aW9uKTtmdW5jdGlvbiBCbCh0KXtpZihTaVt0XSlyZXR1cm4gU2lbdF07aWYoISRyW3RdKXJldHVybiB0O3ZhciBuPSRyW3RdLHM7Zm9yKHMgaW4gbilpZihuLmhhc093blByb3BlcnR5KHMpJiZzIGluIE11KXJldHVybiBTaVt0XT1uW3NdO3JldHVybiB0fXZhciBSdT1CbCgiYW5pbWF0aW9uZW5kIiksQ3U9QmwoImFuaW1hdGlvbml0ZXJhdGlvbiIpLFR1PUJsKCJhbmltYXRpb25zdGFydCIpLFB1PUJsKCJ0cmFuc2l0aW9uZW5kIiksRXU9bmV3IE1hcCxMdT0iYWJvcnQgYXV4Q2xpY2sgY2FuY2VsIGNhblBsYXkgY2FuUGxheVRocm91Z2ggY2xpY2sgY2xvc2UgY29udGV4dE1lbnUgY29weSBjdXQgZHJhZyBkcmFnRW5kIGRyYWdFbnRlciBkcmFnRXhpdCBkcmFnTGVhdmUgZHJhZ092ZXIgZHJhZ1N0YXJ0IGRyb3AgZHVyYXRpb25DaGFuZ2UgZW1wdGllZCBlbmNyeXB0ZWQgZW5kZWQgZXJyb3IgZ290UG9pbnRlckNhcHR1cmUgaW5wdXQgaW52YWxpZCBrZXlEb3duIGtleVByZXNzIGtleVVwIGxvYWQgbG9hZGVkRGF0YSBsb2FkZWRNZXRhZGF0YSBsb2FkU3RhcnQgbG9zdFBvaW50ZXJDYXB0dXJlIG1vdXNlRG93biBtb3VzZU1vdmUgbW91c2VPdXQgbW91c2VPdmVyIG1vdXNlVXAgcGFzdGUgcGF1c2UgcGxheSBwbGF5aW5nIHBvaW50ZXJDYW5jZWwgcG9pbnRlckRvd24gcG9pbnRlck1vdmUgcG9pbnRlck91dCBwb2ludGVyT3ZlciBwb2ludGVyVXAgcHJvZ3Jlc3MgcmF0ZUNoYW5nZSByZXNldCByZXNpemUgc2Vla2VkIHNlZWtpbmcgc3RhbGxlZCBzdWJtaXQgc3VzcGVuZCB0aW1lVXBkYXRlIHRvdWNoQ2FuY2VsIHRvdWNoRW5kIHRvdWNoU3RhcnQgdm9sdW1lQ2hhbmdlIHNjcm9sbCB0b2dnbGUgdG91Y2hNb3ZlIHdhaXRpbmcgd2hlZWwiLnNwbGl0KCIgIik7ZnVuY3Rpb24gVW4odCxuKXtFdS5zZXQodCxuKSxvKG4sW3RdKX1mb3IodmFyIE5pPTA7Tmk8THUubGVuZ3RoO05pKyspe3ZhciBNaT1MdVtOaV0sU2g9TWkudG9Mb3dlckNhc2UoKSxOaD1NaVswXS50b1VwcGVyQ2FzZSgpK01pLnNsaWNlKDEpO1VuKFNoLCJvbiIrTmgpfVVuKFJ1LCJvbkFuaW1hdGlvbkVuZCIpLFVuKEN1LCJvbkFuaW1hdGlvbkl0ZXJhdGlvbiIpLFVuKFR1LCJvbkFuaW1hdGlvblN0YXJ0IiksVW4oImRibGNsaWNrIiwib25Eb3VibGVDbGljayIpLFVuKCJmb2N1c2luIiwib25Gb2N1cyIpLFVuKCJmb2N1c291dCIsIm9uQmx1ciIpLFVuKFB1LCJvblRyYW5zaXRpb25FbmQiKSxwKCJvbk1vdXNlRW50ZXIiLFsibW91c2VvdXQiLCJtb3VzZW92ZXIiXSkscCgib25Nb3VzZUxlYXZlIixbIm1vdXNlb3V0IiwibW91c2VvdmVyIl0pLHAoIm9uUG9pbnRlckVudGVyIixbInBvaW50ZXJvdXQiLCJwb2ludGVyb3ZlciJdKSxwKCJvblBvaW50ZXJMZWF2ZSIsWyJwb2ludGVyb3V0IiwicG9pbnRlcm92ZXIiXSksbygib25DaGFuZ2UiLCJjaGFuZ2UgY2xpY2sgZm9jdXNpbiBmb2N1c291dCBpbnB1dCBrZXlkb3duIGtleXVwIHNlbGVjdGlvbmNoYW5nZSIuc3BsaXQoIiAiKSksbygib25TZWxlY3QiLCJmb2N1c291dCBjb250ZXh0bWVudSBkcmFnZW5kIGZvY3VzaW4ga2V5ZG93biBrZXl1cCBtb3VzZWRvd24gbW91c2V1cCBzZWxlY3Rpb25jaGFuZ2UiLnNwbGl0KCIgIikpLG8oIm9uQmVmb3JlSW5wdXQiLFsiY29tcG9zaXRpb25lbmQiLCJrZXlwcmVzcyIsInRleHRJbnB1dCIsInBhc3RlIl0pLG8oIm9uQ29tcG9zaXRpb25FbmQiLCJjb21wb3NpdGlvbmVuZCBmb2N1c291dCBrZXlkb3duIGtleXByZXNzIGtleXVwIG1vdXNlZG93biIuc3BsaXQoIiAiKSksbygib25Db21wb3NpdGlvblN0YXJ0IiwiY29tcG9zaXRpb25zdGFydCBmb2N1c291dCBrZXlkb3duIGtleXByZXNzIGtleXVwIG1vdXNlZG93biIuc3BsaXQoIiAiKSksbygib25Db21wb3NpdGlvblVwZGF0ZSIsImNvbXBvc2l0aW9udXBkYXRlIGZvY3Vzb3V0IGtleWRvd24ga2V5cHJlc3Mga2V5dXAgbW91c2Vkb3duIi5zcGxpdCgiICIpKTt2YXIgV3M9ImFib3J0IGNhbnBsYXkgY2FucGxheXRocm91Z2ggZHVyYXRpb25jaGFuZ2UgZW1wdGllZCBlbmNyeXB0ZWQgZW5kZWQgZXJyb3IgbG9hZGVkZGF0YSBsb2FkZWRtZXRhZGF0YSBsb2Fkc3RhcnQgcGF1c2UgcGxheSBwbGF5aW5nIHByb2dyZXNzIHJhdGVjaGFuZ2UgcmVzaXplIHNlZWtlZCBzZWVraW5nIHN0YWxsZWQgc3VzcGVuZCB0aW1ldXBkYXRlIHZvbHVtZWNoYW5nZSB3YWl0aW5nIi5zcGxpdCgiICIpLE1oPW5ldyBTZXQoImNhbmNlbCBjbG9zZSBpbnZhbGlkIGxvYWQgc2Nyb2xsIHRvZ2dsZSIuc3BsaXQoIiAiKS5jb25jYXQoV3MpKTtmdW5jdGlvbiBBdSh0LG4scyl7dmFyIGk9dC50eXBlfHwidW5rbm93bi1ldmVudCI7dC5jdXJyZW50VGFyZ2V0PXMsU3AoaSxuLHZvaWQgMCx0KSx0LmN1cnJlbnRUYXJnZXQ9bnVsbH1mdW5jdGlvbiBEdSh0LG4pe249KG4mNCkhPT0wO2Zvcih2YXIgcz0wO3M8dC5sZW5ndGg7cysrKXt2YXIgaT10W3NdLGM9aS5ldmVudDtpPWkubGlzdGVuZXJzO2U6e3ZhciBmPXZvaWQgMDtpZihuKWZvcih2YXIgeT1pLmxlbmd0aC0xOzA8PXk7eS0tKXt2YXIgYj1pW3ldLE49Yi5pbnN0YW5jZSxCPWIuY3VycmVudFRhcmdldDtpZihiPWIubGlzdGVuZXIsTiE9PWYmJmMuaXNQcm9wYWdhdGlvblN0b3BwZWQoKSlicmVhayBlO0F1KGMsYixCKSxmPU59ZWxzZSBmb3IoeT0wO3k8aS5sZW5ndGg7eSsrKXtpZihiPWlbeV0sTj1iLmluc3RhbmNlLEI9Yi5jdXJyZW50VGFyZ2V0LGI9Yi5saXN0ZW5lcixOIT09ZiYmYy5pc1Byb3BhZ2F0aW9uU3RvcHBlZCgpKWJyZWFrIGU7QXUoYyxiLEIpLGY9Tn19fWlmKGtsKXRocm93IHQ9cmksa2w9ITEscmk9bnVsbCx0fWZ1bmN0aW9uIHR0KHQsbil7dmFyIHM9bltEaV07cz09PXZvaWQgMCYmKHM9bltEaV09bmV3IFNldCk7dmFyIGk9dCsiX19idWJibGUiO3MuaGFzKGkpfHwoSXUobix0LDIsITEpLHMuYWRkKGkpKX1mdW5jdGlvbiBSaSh0LG4scyl7dmFyIGk9MDtuJiYoaXw9NCksSXUocyx0LGksbil9dmFyIHpsPSJfcmVhY3RMaXN0ZW5pbmciK01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpO2Z1bmN0aW9uIEhzKHQpe2lmKCF0W3psXSl7dFt6bF09ITAsdS5mb3JFYWNoKGZ1bmN0aW9uKHMpe3MhPT0ic2VsZWN0aW9uY2hhbmdlIiYmKE1oLmhhcyhzKXx8UmkocywhMSx0KSxSaShzLCEwLHQpKX0pO3ZhciBuPXQubm9kZVR5cGU9PT05P3Q6dC5vd25lckRvY3VtZW50O249PT1udWxsfHxuW3psXXx8KG5bemxdPSEwLFJpKCJzZWxlY3Rpb25jaGFuZ2UiLCExLG4pKX19ZnVuY3Rpb24gSXUodCxuLHMsaSl7c3dpdGNoKHN1KG4pKXtjYXNlIDE6dmFyIGM9RnA7YnJlYWs7Y2FzZSA0OmM9JHA7YnJlYWs7ZGVmYXVsdDpjPXVpfXM9Yy5iaW5kKG51bGwsbixzLHQpLGM9dm9pZCAwLCFuaXx8biE9PSJ0b3VjaHN0YXJ0IiYmbiE9PSJ0b3VjaG1vdmUiJiZuIT09IndoZWVsInx8KGM9ITApLGk/YyE9PXZvaWQgMD90LmFkZEV2ZW50TGlzdGVuZXIobixzLHtjYXB0dXJlOiEwLHBhc3NpdmU6Y30pOnQuYWRkRXZlbnRMaXN0ZW5lcihuLHMsITApOmMhPT12b2lkIDA/dC5hZGRFdmVudExpc3RlbmVyKG4scyx7cGFzc2l2ZTpjfSk6dC5hZGRFdmVudExpc3RlbmVyKG4scywhMSl9ZnVuY3Rpb24gQ2kodCxuLHMsaSxjKXt2YXIgZj1pO2lmKChuJjEpPT09MCYmKG4mMik9PT0wJiZpIT09bnVsbCllOmZvcig7Oyl7aWYoaT09PW51bGwpcmV0dXJuO3ZhciB5PWkudGFnO2lmKHk9PT0zfHx5PT09NCl7dmFyIGI9aS5zdGF0ZU5vZGUuY29udGFpbmVySW5mbztpZihiPT09Y3x8Yi5ub2RlVHlwZT09PTgmJmIucGFyZW50Tm9kZT09PWMpYnJlYWs7aWYoeT09PTQpZm9yKHk9aS5yZXR1cm47eSE9PW51bGw7KXt2YXIgTj15LnRhZztpZigoTj09PTN8fE49PT00KSYmKE49eS5zdGF0ZU5vZGUuY29udGFpbmVySW5mbyxOPT09Y3x8Ti5ub2RlVHlwZT09PTgmJk4ucGFyZW50Tm9kZT09PWMpKXJldHVybjt5PXkucmV0dXJufWZvcig7YiE9PW51bGw7KXtpZih5PXByKGIpLHk9PT1udWxsKXJldHVybjtpZihOPXkudGFnLE49PT01fHxOPT09Nil7aT1mPXk7Y29udGludWUgZX1iPWIucGFyZW50Tm9kZX19aT1pLnJldHVybn1GYyhmdW5jdGlvbigpe3ZhciBCPWYsbGU9WmEocyksY2U9W107ZTp7dmFyIHJlPUV1LmdldCh0KTtpZihyZSE9PXZvaWQgMCl7dmFyIE5lPXBpLFJlPXQ7c3dpdGNoKHQpe2Nhc2Uia2V5cHJlc3MiOmlmKEFsKHMpPT09MClicmVhayBlO2Nhc2Uia2V5ZG93biI6Y2FzZSJrZXl1cCI6TmU9bmg7YnJlYWs7Y2FzZSJmb2N1c2luIjpSZT0iZm9jdXMiLE5lPWdpO2JyZWFrO2Nhc2UiZm9jdXNvdXQiOlJlPSJibHVyIixOZT1naTticmVhaztjYXNlImJlZm9yZWJsdXIiOmNhc2UiYWZ0ZXJibHVyIjpOZT1naTticmVhaztjYXNlImNsaWNrIjppZihzLmJ1dHRvbj09PTIpYnJlYWsgZTtjYXNlImF1eGNsaWNrIjpjYXNlImRibGNsaWNrIjpjYXNlIm1vdXNlZG93biI6Y2FzZSJtb3VzZW1vdmUiOmNhc2UibW91c2V1cCI6Y2FzZSJtb3VzZW91dCI6Y2FzZSJtb3VzZW92ZXIiOmNhc2UiY29udGV4dG1lbnUiOk5lPWl1O2JyZWFrO2Nhc2UiZHJhZyI6Y2FzZSJkcmFnZW5kIjpjYXNlImRyYWdlbnRlciI6Y2FzZSJkcmFnZXhpdCI6Y2FzZSJkcmFnbGVhdmUiOmNhc2UiZHJhZ292ZXIiOmNhc2UiZHJhZ3N0YXJ0IjpjYXNlImRyb3AiOk5lPVVwO2JyZWFrO2Nhc2UidG91Y2hjYW5jZWwiOmNhc2UidG91Y2hlbmQiOmNhc2UidG91Y2htb3ZlIjpjYXNlInRvdWNoc3RhcnQiOk5lPWxoO2JyZWFrO2Nhc2UgUnU6Y2FzZSBDdTpjYXNlIFR1Ok5lPVZwO2JyZWFrO2Nhc2UgUHU6TmU9aWg7YnJlYWs7Y2FzZSJzY3JvbGwiOk5lPVdwO2JyZWFrO2Nhc2Uid2hlZWwiOk5lPWNoO2JyZWFrO2Nhc2UiY29weSI6Y2FzZSJjdXQiOmNhc2UicGFzdGUiOk5lPVlwO2JyZWFrO2Nhc2UiZ290cG9pbnRlcmNhcHR1cmUiOmNhc2UibG9zdHBvaW50ZXJjYXB0dXJlIjpjYXNlInBvaW50ZXJjYW5jZWwiOmNhc2UicG9pbnRlcmRvd24iOmNhc2UicG9pbnRlcm1vdmUiOmNhc2UicG9pbnRlcm91dCI6Y2FzZSJwb2ludGVyb3ZlciI6Y2FzZSJwb2ludGVydXAiOk5lPWN1fXZhciBDZT0obiY0KSE9PTAsZHQ9IUNlJiZ0PT09InNjcm9sbCIsRT1DZT9yZSE9PW51bGw/cmUrIkNhcHR1cmUiOm51bGw6cmU7Q2U9W107Zm9yKHZhciBDPUIsRDtDIT09bnVsbDspe0Q9Qzt2YXIgbWU9RC5zdGF0ZU5vZGU7aWYoRC50YWc9PT01JiZtZSE9PW51bGwmJihEPW1lLEUhPT1udWxsJiYobWU9TnMoQyxFKSxtZSE9bnVsbCYmQ2UucHVzaChVcyhDLG1lLEQpKSkpLGR0KWJyZWFrO0M9Qy5yZXR1cm59MDxDZS5sZW5ndGgmJihyZT1uZXcgTmUocmUsUmUsbnVsbCxzLGxlKSxjZS5wdXNoKHtldmVudDpyZSxsaXN0ZW5lcnM6Q2V9KSl9fWlmKChuJjcpPT09MCl7ZTp7aWYocmU9dD09PSJtb3VzZW92ZXIifHx0PT09InBvaW50ZXJvdmVyIixOZT10PT09Im1vdXNlb3V0Inx8dD09PSJwb2ludGVyb3V0IixyZSYmcyE9PUphJiYoUmU9cy5yZWxhdGVkVGFyZ2V0fHxzLmZyb21FbGVtZW50KSYmKHByKFJlKXx8UmVbTW5dKSlicmVhayBlO2lmKChOZXx8cmUpJiYocmU9bGUud2luZG93PT09bGU/bGU6KHJlPWxlLm93bmVyRG9jdW1lbnQpP3JlLmRlZmF1bHRWaWV3fHxyZS5wYXJlbnRXaW5kb3c6d2luZG93LE5lPyhSZT1zLnJlbGF0ZWRUYXJnZXR8fHMudG9FbGVtZW50LE5lPUIsUmU9UmU/cHIoUmUpOm51bGwsUmUhPT1udWxsJiYoZHQ9ZHIoUmUpLFJlIT09ZHR8fFJlLnRhZyE9PTUmJlJlLnRhZyE9PTYpJiYoUmU9bnVsbCkpOihOZT1udWxsLFJlPUIpLE5lIT09UmUpKXtpZihDZT1pdSxtZT0ib25Nb3VzZUxlYXZlIixFPSJvbk1vdXNlRW50ZXIiLEM9Im1vdXNlIiwodD09PSJwb2ludGVyb3V0Inx8dD09PSJwb2ludGVyb3ZlciIpJiYoQ2U9Y3UsbWU9Im9uUG9pbnRlckxlYXZlIixFPSJvblBvaW50ZXJFbnRlciIsQz0icG9pbnRlciIpLGR0PU5lPT1udWxsP3JlOlVyKE5lKSxEPVJlPT1udWxsP3JlOlVyKFJlKSxyZT1uZXcgQ2UobWUsQysibGVhdmUiLE5lLHMsbGUpLHJlLnRhcmdldD1kdCxyZS5yZWxhdGVkVGFyZ2V0PUQsbWU9bnVsbCxwcihsZSk9PT1CJiYoQ2U9bmV3IENlKEUsQysiZW50ZXIiLFJlLHMsbGUpLENlLnRhcmdldD1ELENlLnJlbGF0ZWRUYXJnZXQ9ZHQsbWU9Q2UpLGR0PW1lLE5lJiZSZSl0Ontmb3IoQ2U9TmUsRT1SZSxDPTAsRD1DZTtEO0Q9V3IoRCkpQysrO2ZvcihEPTAsbWU9RTttZTttZT1XcihtZSkpRCsrO2Zvcig7MDxDLUQ7KUNlPVdyKENlKSxDLS07Zm9yKDswPEQtQzspRT1XcihFKSxELS07Zm9yKDtDLS07KXtpZihDZT09PUV8fEUhPT1udWxsJiZDZT09PUUuYWx0ZXJuYXRlKWJyZWFrIHQ7Q2U9V3IoQ2UpLEU9V3IoRSl9Q2U9bnVsbH1lbHNlIENlPW51bGw7TmUhPT1udWxsJiZfdShjZSxyZSxOZSxDZSwhMSksUmUhPT1udWxsJiZkdCE9PW51bGwmJl91KGNlLGR0LFJlLENlLCEwKX19ZTp7aWYocmU9Qj9VcihCKTp3aW5kb3csTmU9cmUubm9kZU5hbWUmJnJlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksTmU9PT0ic2VsZWN0Inx8TmU9PT0iaW5wdXQiJiZyZS50eXBlPT09ImZpbGUiKXZhciBUZT1naDtlbHNlIGlmKG11KHJlKSlpZih4dSlUZT13aDtlbHNle1RlPXloO3ZhciBEZT14aH1lbHNlKE5lPXJlLm5vZGVOYW1lKSYmTmUudG9Mb3dlckNhc2UoKT09PSJpbnB1dCImJihyZS50eXBlPT09ImNoZWNrYm94Inx8cmUudHlwZT09PSJyYWRpbyIpJiYoVGU9dmgpO2lmKFRlJiYoVGU9VGUodCxCKSkpe2d1KGNlLFRlLHMsbGUpO2JyZWFrIGV9RGUmJkRlKHQscmUsQiksdD09PSJmb2N1c291dCImJihEZT1yZS5fd3JhcHBlclN0YXRlKSYmRGUuY29udHJvbGxlZCYmcmUudHlwZT09PSJudW1iZXIiJiZkZShyZSwibnVtYmVyIixyZS52YWx1ZSl9c3dpdGNoKERlPUI/VXIoQik6d2luZG93LHQpe2Nhc2UiZm9jdXNpbiI6KG11KERlKXx8RGUuY29udGVudEVkaXRhYmxlPT09InRydWUiKSYmKEZyPURlLGtpPUIsJHM9bnVsbCk7YnJlYWs7Y2FzZSJmb2N1c291dCI6JHM9a2k9RnI9bnVsbDticmVhaztjYXNlIm1vdXNlZG93biI6amk9ITA7YnJlYWs7Y2FzZSJjb250ZXh0bWVudSI6Y2FzZSJtb3VzZXVwIjpjYXNlImRyYWdlbmQiOmppPSExLE51KGNlLHMsbGUpO2JyZWFrO2Nhc2Uic2VsZWN0aW9uY2hhbmdlIjppZihqaClicmVhaztjYXNlImtleWRvd24iOmNhc2Uia2V5dXAiOk51KGNlLHMsbGUpfXZhciBJZTtpZih5aSllOntzd2l0Y2godCl7Y2FzZSJjb21wb3NpdGlvbnN0YXJ0Ijp2YXIgJGU9Im9uQ29tcG9zaXRpb25TdGFydCI7YnJlYWsgZTtjYXNlImNvbXBvc2l0aW9uZW5kIjokZT0ib25Db21wb3NpdGlvbkVuZCI7YnJlYWsgZTtjYXNlImNvbXBvc2l0aW9udXBkYXRlIjokZT0ib25Db21wb3NpdGlvblVwZGF0ZSI7YnJlYWsgZX0kZT12b2lkIDB9ZWxzZSB6cj9wdSh0LHMpJiYoJGU9Im9uQ29tcG9zaXRpb25FbmQiKTp0PT09ImtleWRvd24iJiZzLmtleUNvZGU9PT0yMjkmJigkZT0ib25Db21wb3NpdGlvblN0YXJ0Iik7JGUmJih1dSYmcy5sb2NhbGUhPT0ia28iJiYoenJ8fCRlIT09Im9uQ29tcG9zaXRpb25TdGFydCI/JGU9PT0ib25Db21wb3NpdGlvbkVuZCImJnpyJiYoSWU9bHUoKSk6KEhuPWxlLGRpPSJ2YWx1ZSJpbiBIbj9Ibi52YWx1ZTpIbi50ZXh0Q29udGVudCx6cj0hMCkpLERlPUZsKEIsJGUpLDA8RGUubGVuZ3RoJiYoJGU9bmV3IG91KCRlLHQsbnVsbCxzLGxlKSxjZS5wdXNoKHtldmVudDokZSxsaXN0ZW5lcnM6RGV9KSxJZT8kZS5kYXRhPUllOihJZT1odShzKSxJZSE9PW51bGwmJigkZS5kYXRhPUllKSkpKSwoSWU9Zmg/ZGgodCxzKTpwaCh0LHMpKSYmKEI9RmwoQiwib25CZWZvcmVJbnB1dCIpLDA8Qi5sZW5ndGgmJihsZT1uZXcgb3UoIm9uQmVmb3JlSW5wdXQiLCJiZWZvcmVpbnB1dCIsbnVsbCxzLGxlKSxjZS5wdXNoKHtldmVudDpsZSxsaXN0ZW5lcnM6Qn0pLGxlLmRhdGE9SWUpKX1EdShjZSxuKX0pfWZ1bmN0aW9uIFVzKHQsbixzKXtyZXR1cm57aW5zdGFuY2U6dCxsaXN0ZW5lcjpuLGN1cnJlbnRUYXJnZXQ6c319ZnVuY3Rpb24gRmwodCxuKXtmb3IodmFyIHM9bisiQ2FwdHVyZSIsaT1bXTt0IT09bnVsbDspe3ZhciBjPXQsZj1jLnN0YXRlTm9kZTtjLnRhZz09PTUmJmYhPT1udWxsJiYoYz1mLGY9TnModCxzKSxmIT1udWxsJiZpLnVuc2hpZnQoVXModCxmLGMpKSxmPU5zKHQsbiksZiE9bnVsbCYmaS5wdXNoKFVzKHQsZixjKSkpLHQ9dC5yZXR1cm59cmV0dXJuIGl9ZnVuY3Rpb24gV3IodCl7aWYodD09PW51bGwpcmV0dXJuIG51bGw7ZG8gdD10LnJldHVybjt3aGlsZSh0JiZ0LnRhZyE9PTUpO3JldHVybiB0fHxudWxsfWZ1bmN0aW9uIF91KHQsbixzLGksYyl7Zm9yKHZhciBmPW4uX3JlYWN0TmFtZSx5PVtdO3MhPT1udWxsJiZzIT09aTspe3ZhciBiPXMsTj1iLmFsdGVybmF0ZSxCPWIuc3RhdGVOb2RlO2lmKE4hPT1udWxsJiZOPT09aSlicmVhaztiLnRhZz09PTUmJkIhPT1udWxsJiYoYj1CLGM/KE49TnMocyxmKSxOIT1udWxsJiZ5LnVuc2hpZnQoVXMocyxOLGIpKSk6Y3x8KE49TnMocyxmKSxOIT1udWxsJiZ5LnB1c2goVXMocyxOLGIpKSkpLHM9cy5yZXR1cm59eS5sZW5ndGghPT0wJiZ0LnB1c2goe2V2ZW50Om4sbGlzdGVuZXJzOnl9KX12YXIgUmg9L1xyXG4/L2csQ2g9L1x1MDAwMHxcdUZGRkQvZztmdW5jdGlvbiBPdSh0KXtyZXR1cm4odHlwZW9mIHQ9PSJzdHJpbmciP3Q6IiIrdCkucmVwbGFjZShSaCxgCmApLnJlcGxhY2UoQ2gsIiIpfWZ1bmN0aW9uICRsKHQsbixzKXtpZihuPU91KG4pLE91KHQpIT09biYmcyl0aHJvdyBFcnJvcihhKDQyNSkpfWZ1bmN0aW9uIFdsKCl7fXZhciBUaT1udWxsLFBpPW51bGw7ZnVuY3Rpb24gRWkodCxuKXtyZXR1cm4gdD09PSJ0ZXh0YXJlYSJ8fHQ9PT0ibm9zY3JpcHQifHx0eXBlb2Ygbi5jaGlsZHJlbj09InN0cmluZyJ8fHR5cGVvZiBuLmNoaWxkcmVuPT0ibnVtYmVyInx8dHlwZW9mIG4uZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw9PSJvYmplY3QiJiZuLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MIT09bnVsbCYmbi5kYW5nZXJvdXNseVNldElubmVySFRNTC5fX2h0bWwhPW51bGx9dmFyIExpPXR5cGVvZiBzZXRUaW1lb3V0PT0iZnVuY3Rpb24iP3NldFRpbWVvdXQ6dm9pZCAwLFRoPXR5cGVvZiBjbGVhclRpbWVvdXQ9PSJmdW5jdGlvbiI/Y2xlYXJUaW1lb3V0OnZvaWQgMCxCdT10eXBlb2YgUHJvbWlzZT09ImZ1bmN0aW9uIj9Qcm9taXNlOnZvaWQgMCxQaD10eXBlb2YgcXVldWVNaWNyb3Rhc2s9PSJmdW5jdGlvbiI/cXVldWVNaWNyb3Rhc2s6dHlwZW9mIEJ1PCJ1Ij9mdW5jdGlvbih0KXtyZXR1cm4gQnUucmVzb2x2ZShudWxsKS50aGVuKHQpLmNhdGNoKEVoKX06TGk7ZnVuY3Rpb24gRWgodCl7c2V0VGltZW91dChmdW5jdGlvbigpe3Rocm93IHR9KX1mdW5jdGlvbiBBaSh0LG4pe3ZhciBzPW4saT0wO2Rve3ZhciBjPXMubmV4dFNpYmxpbmc7aWYodC5yZW1vdmVDaGlsZChzKSxjJiZjLm5vZGVUeXBlPT09OClpZihzPWMuZGF0YSxzPT09Ii8kIil7aWYoaT09PTApe3QucmVtb3ZlQ2hpbGQoYyksRHMobik7cmV0dXJufWktLX1lbHNlIHMhPT0iJCImJnMhPT0iJD8iJiZzIT09IiQhInx8aSsrO3M9Y313aGlsZShzKTtEcyhuKX1mdW5jdGlvbiBHbih0KXtmb3IoO3QhPW51bGw7dD10Lm5leHRTaWJsaW5nKXt2YXIgbj10Lm5vZGVUeXBlO2lmKG49PT0xfHxuPT09MylicmVhaztpZihuPT09OCl7aWYobj10LmRhdGEsbj09PSIkInx8bj09PSIkISJ8fG49PT0iJD8iKWJyZWFrO2lmKG49PT0iLyQiKXJldHVybiBudWxsfX1yZXR1cm4gdH1mdW5jdGlvbiB6dSh0KXt0PXQucHJldmlvdXNTaWJsaW5nO2Zvcih2YXIgbj0wO3Q7KXtpZih0Lm5vZGVUeXBlPT09OCl7dmFyIHM9dC5kYXRhO2lmKHM9PT0iJCJ8fHM9PT0iJCEifHxzPT09IiQ/Iil7aWYobj09PTApcmV0dXJuIHQ7bi0tfWVsc2Ugcz09PSIvJCImJm4rK310PXQucHJldmlvdXNTaWJsaW5nfXJldHVybiBudWxsfXZhciBIcj1NYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKSx4bj0iX19yZWFjdEZpYmVyJCIrSHIsR3M9Il9fcmVhY3RQcm9wcyQiK0hyLE1uPSJfX3JlYWN0Q29udGFpbmVyJCIrSHIsRGk9Il9fcmVhY3RFdmVudHMkIitIcixMaD0iX19yZWFjdExpc3RlbmVycyQiK0hyLEFoPSJfX3JlYWN0SGFuZGxlcyQiK0hyO2Z1bmN0aW9uIHByKHQpe3ZhciBuPXRbeG5dO2lmKG4pcmV0dXJuIG47Zm9yKHZhciBzPXQucGFyZW50Tm9kZTtzOyl7aWYobj1zW01uXXx8c1t4bl0pe2lmKHM9bi5hbHRlcm5hdGUsbi5jaGlsZCE9PW51bGx8fHMhPT1udWxsJiZzLmNoaWxkIT09bnVsbClmb3IodD16dSh0KTt0IT09bnVsbDspe2lmKHM9dFt4bl0pcmV0dXJuIHM7dD16dSh0KX1yZXR1cm4gbn10PXMscz10LnBhcmVudE5vZGV9cmV0dXJuIG51bGx9ZnVuY3Rpb24gS3ModCl7cmV0dXJuIHQ9dFt4bl18fHRbTW5dLCF0fHx0LnRhZyE9PTUmJnQudGFnIT09NiYmdC50YWchPT0xMyYmdC50YWchPT0zP251bGw6dH1mdW5jdGlvbiBVcih0KXtpZih0LnRhZz09PTV8fHQudGFnPT09NilyZXR1cm4gdC5zdGF0ZU5vZGU7dGhyb3cgRXJyb3IoYSgzMykpfWZ1bmN0aW9uIEhsKHQpe3JldHVybiB0W0dzXXx8bnVsbH12YXIgSWk9W10sR3I9LTE7ZnVuY3Rpb24gS24odCl7cmV0dXJue2N1cnJlbnQ6dH19ZnVuY3Rpb24gbnQodCl7MD5Hcnx8KHQuY3VycmVudD1JaVtHcl0sSWlbR3JdPW51bGwsR3ItLSl9ZnVuY3Rpb24gZXQodCxuKXtHcisrLElpW0dyXT10LmN1cnJlbnQsdC5jdXJyZW50PW59dmFyIFZuPXt9LFJ0PUtuKFZuKSxfdD1LbighMSksaHI9Vm47ZnVuY3Rpb24gS3IodCxuKXt2YXIgcz10LnR5cGUuY29udGV4dFR5cGVzO2lmKCFzKXJldHVybiBWbjt2YXIgaT10LnN0YXRlTm9kZTtpZihpJiZpLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkVW5tYXNrZWRDaGlsZENvbnRleHQ9PT1uKXJldHVybiBpLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWFza2VkQ2hpbGRDb250ZXh0O3ZhciBjPXt9LGY7Zm9yKGYgaW4gcyljW2ZdPW5bZl07cmV0dXJuIGkmJih0PXQuc3RhdGVOb2RlLHQuX19yZWFjdEludGVybmFsTWVtb2l6ZWRVbm1hc2tlZENoaWxkQ29udGV4dD1uLHQuX19yZWFjdEludGVybmFsTWVtb2l6ZWRNYXNrZWRDaGlsZENvbnRleHQ9YyksY31mdW5jdGlvbiBPdCh0KXtyZXR1cm4gdD10LmNoaWxkQ29udGV4dFR5cGVzLHQhPW51bGx9ZnVuY3Rpb24gVWwoKXtudChfdCksbnQoUnQpfWZ1bmN0aW9uIEZ1KHQsbixzKXtpZihSdC5jdXJyZW50IT09Vm4pdGhyb3cgRXJyb3IoYSgxNjgpKTtldChSdCxuKSxldChfdCxzKX1mdW5jdGlvbiAkdSh0LG4scyl7dmFyIGk9dC5zdGF0ZU5vZGU7aWYobj1uLmNoaWxkQ29udGV4dFR5cGVzLHR5cGVvZiBpLmdldENoaWxkQ29udGV4dCE9ImZ1bmN0aW9uIilyZXR1cm4gcztpPWkuZ2V0Q2hpbGRDb250ZXh0KCk7Zm9yKHZhciBjIGluIGkpaWYoIShjIGluIG4pKXRocm93IEVycm9yKGEoMTA4LHZlKHQpfHwiVW5rbm93biIsYykpO3JldHVybiBGKHt9LHMsaSl9ZnVuY3Rpb24gR2wodCl7cmV0dXJuIHQ9KHQ9dC5zdGF0ZU5vZGUpJiZ0Ll9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWVyZ2VkQ2hpbGRDb250ZXh0fHxWbixocj1SdC5jdXJyZW50LGV0KFJ0LHQpLGV0KF90LF90LmN1cnJlbnQpLCEwfWZ1bmN0aW9uIFd1KHQsbixzKXt2YXIgaT10LnN0YXRlTm9kZTtpZighaSl0aHJvdyBFcnJvcihhKDE2OSkpO3M/KHQ9JHUodCxuLGhyKSxpLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWVyZ2VkQ2hpbGRDb250ZXh0PXQsbnQoX3QpLG50KFJ0KSxldChSdCx0KSk6bnQoX3QpLGV0KF90LHMpfXZhciBSbj1udWxsLEtsPSExLF9pPSExO2Z1bmN0aW9uIEh1KHQpe1JuPT09bnVsbD9Sbj1bdF06Um4ucHVzaCh0KX1mdW5jdGlvbiBEaCh0KXtLbD0hMCxIdSh0KX1mdW5jdGlvbiBxbigpe2lmKCFfaSYmUm4hPT1udWxsKXtfaT0hMDt2YXIgdD0wLG49WmU7dHJ5e3ZhciBzPVJuO2ZvcihaZT0xO3Q8cy5sZW5ndGg7dCsrKXt2YXIgaT1zW3RdO2RvIGk9aSghMCk7d2hpbGUoaSE9PW51bGwpfVJuPW51bGwsS2w9ITF9Y2F0Y2goYyl7dGhyb3cgUm4hPT1udWxsJiYoUm49Um4uc2xpY2UodCsxKSksR2Moc2kscW4pLGN9ZmluYWxseXtaZT1uLF9pPSExfX1yZXR1cm4gbnVsbH12YXIgVnI9W10scXI9MCxWbD1udWxsLHFsPTAscXQ9W10sWXQ9MCxtcj1udWxsLENuPTEsVG49IiI7ZnVuY3Rpb24gZ3IodCxuKXtWcltxcisrXT1xbCxWcltxcisrXT1WbCxWbD10LHFsPW59ZnVuY3Rpb24gVXUodCxuLHMpe3F0W1l0KytdPUNuLHF0W1l0KytdPVRuLHF0W1l0KytdPW1yLG1yPXQ7dmFyIGk9Q247dD1Ubjt2YXIgYz0zMi1lbihpKS0xO2kmPX4oMTw8Yykscys9MTt2YXIgZj0zMi1lbihuKStjO2lmKDMwPGYpe3ZhciB5PWMtYyU1O2Y9KGkmKDE8PHkpLTEpLnRvU3RyaW5nKDMyKSxpPj49eSxjLT15LENuPTE8PDMyLWVuKG4pK2N8czw8Y3xpLFRuPWYrdH1lbHNlIENuPTE8PGZ8czw8Y3xpLFRuPXR9ZnVuY3Rpb24gT2kodCl7dC5yZXR1cm4hPT1udWxsJiYoZ3IodCwxKSxVdSh0LDEsMCkpfWZ1bmN0aW9uIEJpKHQpe2Zvcig7dD09PVZsOylWbD1WclstLXFyXSxWcltxcl09bnVsbCxxbD1WclstLXFyXSxWcltxcl09bnVsbDtmb3IoO3Q9PT1tcjspbXI9cXRbLS1ZdF0scXRbWXRdPW51bGwsVG49cXRbLS1ZdF0scXRbWXRdPW51bGwsQ249cXRbLS1ZdF0scXRbWXRdPW51bGx9dmFyIEd0PW51bGwsS3Q9bnVsbCxzdD0hMSxubj1udWxsO2Z1bmN0aW9uIEd1KHQsbil7dmFyIHM9WnQoNSxudWxsLG51bGwsMCk7cy5lbGVtZW50VHlwZT0iREVMRVRFRCIscy5zdGF0ZU5vZGU9bixzLnJldHVybj10LG49dC5kZWxldGlvbnMsbj09PW51bGw/KHQuZGVsZXRpb25zPVtzXSx0LmZsYWdzfD0xNik6bi5wdXNoKHMpfWZ1bmN0aW9uIEt1KHQsbil7c3dpdGNoKHQudGFnKXtjYXNlIDU6dmFyIHM9dC50eXBlO3JldHVybiBuPW4ubm9kZVR5cGUhPT0xfHxzLnRvTG93ZXJDYXNlKCkhPT1uLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk/bnVsbDpuLG4hPT1udWxsPyh0LnN0YXRlTm9kZT1uLEd0PXQsS3Q9R24obi5maXJzdENoaWxkKSwhMCk6ITE7Y2FzZSA2OnJldHVybiBuPXQucGVuZGluZ1Byb3BzPT09IiJ8fG4ubm9kZVR5cGUhPT0zP251bGw6bixuIT09bnVsbD8odC5zdGF0ZU5vZGU9bixHdD10LEt0PW51bGwsITApOiExO2Nhc2UgMTM6cmV0dXJuIG49bi5ub2RlVHlwZSE9PTg/bnVsbDpuLG4hPT1udWxsPyhzPW1yIT09bnVsbD97aWQ6Q24sb3ZlcmZsb3c6VG59Om51bGwsdC5tZW1vaXplZFN0YXRlPXtkZWh5ZHJhdGVkOm4sdHJlZUNvbnRleHQ6cyxyZXRyeUxhbmU6MTA3Mzc0MTgyNH0scz1adCgxOCxudWxsLG51bGwsMCkscy5zdGF0ZU5vZGU9bixzLnJldHVybj10LHQuY2hpbGQ9cyxHdD10LEt0PW51bGwsITApOiExO2RlZmF1bHQ6cmV0dXJuITF9fWZ1bmN0aW9uIHppKHQpe3JldHVybih0Lm1vZGUmMSkhPT0wJiYodC5mbGFncyYxMjgpPT09MH1mdW5jdGlvbiBGaSh0KXtpZihzdCl7dmFyIG49S3Q7aWYobil7dmFyIHM9bjtpZighS3UodCxuKSl7aWYoemkodCkpdGhyb3cgRXJyb3IoYSg0MTgpKTtuPUduKHMubmV4dFNpYmxpbmcpO3ZhciBpPUd0O24mJkt1KHQsbik/R3UoaSxzKToodC5mbGFncz10LmZsYWdzJi00MDk3fDIsc3Q9ITEsR3Q9dCl9fWVsc2V7aWYoemkodCkpdGhyb3cgRXJyb3IoYSg0MTgpKTt0LmZsYWdzPXQuZmxhZ3MmLTQwOTd8MixzdD0hMSxHdD10fX19ZnVuY3Rpb24gVnUodCl7Zm9yKHQ9dC5yZXR1cm47dCE9PW51bGwmJnQudGFnIT09NSYmdC50YWchPT0zJiZ0LnRhZyE9PTEzOyl0PXQucmV0dXJuO0d0PXR9ZnVuY3Rpb24gWWwodCl7aWYodCE9PUd0KXJldHVybiExO2lmKCFzdClyZXR1cm4gVnUodCksc3Q9ITAsITE7dmFyIG47aWYoKG49dC50YWchPT0zKSYmIShuPXQudGFnIT09NSkmJihuPXQudHlwZSxuPW4hPT0iaGVhZCImJm4hPT0iYm9keSImJiFFaSh0LnR5cGUsdC5tZW1vaXplZFByb3BzKSksbiYmKG49S3QpKXtpZih6aSh0KSl0aHJvdyBxdSgpLEVycm9yKGEoNDE4KSk7Zm9yKDtuOylHdSh0LG4pLG49R24obi5uZXh0U2libGluZyl9aWYoVnUodCksdC50YWc9PT0xMyl7aWYodD10Lm1lbW9pemVkU3RhdGUsdD10IT09bnVsbD90LmRlaHlkcmF0ZWQ6bnVsbCwhdCl0aHJvdyBFcnJvcihhKDMxNykpO2U6e2Zvcih0PXQubmV4dFNpYmxpbmcsbj0wO3Q7KXtpZih0Lm5vZGVUeXBlPT09OCl7dmFyIHM9dC5kYXRhO2lmKHM9PT0iLyQiKXtpZihuPT09MCl7S3Q9R24odC5uZXh0U2libGluZyk7YnJlYWsgZX1uLS19ZWxzZSBzIT09IiQiJiZzIT09IiQhIiYmcyE9PSIkPyJ8fG4rK310PXQubmV4dFNpYmxpbmd9S3Q9bnVsbH19ZWxzZSBLdD1HdD9Hbih0LnN0YXRlTm9kZS5uZXh0U2libGluZyk6bnVsbDtyZXR1cm4hMH1mdW5jdGlvbiBxdSgpe2Zvcih2YXIgdD1LdDt0Oyl0PUduKHQubmV4dFNpYmxpbmcpfWZ1bmN0aW9uIFlyKCl7S3Q9R3Q9bnVsbCxzdD0hMX1mdW5jdGlvbiAkaSh0KXtubj09PW51bGw/bm49W3RdOm5uLnB1c2godCl9dmFyIEloPW9lLlJlYWN0Q3VycmVudEJhdGNoQ29uZmlnO2Z1bmN0aW9uIFZzKHQsbixzKXtpZih0PXMucmVmLHQhPT1udWxsJiZ0eXBlb2YgdCE9ImZ1bmN0aW9uIiYmdHlwZW9mIHQhPSJvYmplY3QiKXtpZihzLl9vd25lcil7aWYocz1zLl9vd25lcixzKXtpZihzLnRhZyE9PTEpdGhyb3cgRXJyb3IoYSgzMDkpKTt2YXIgaT1zLnN0YXRlTm9kZX1pZighaSl0aHJvdyBFcnJvcihhKDE0Nyx0KSk7dmFyIGM9aSxmPSIiK3Q7cmV0dXJuIG4hPT1udWxsJiZuLnJlZiE9PW51bGwmJnR5cGVvZiBuLnJlZj09ImZ1bmN0aW9uIiYmbi5yZWYuX3N0cmluZ1JlZj09PWY/bi5yZWY6KG49ZnVuY3Rpb24oeSl7dmFyIGI9Yy5yZWZzO3k9PT1udWxsP2RlbGV0ZSBiW2ZdOmJbZl09eX0sbi5fc3RyaW5nUmVmPWYsbil9aWYodHlwZW9mIHQhPSJzdHJpbmciKXRocm93IEVycm9yKGEoMjg0KSk7aWYoIXMuX293bmVyKXRocm93IEVycm9yKGEoMjkwLHQpKX1yZXR1cm4gdH1mdW5jdGlvbiBYbCh0LG4pe3Rocm93IHQ9T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG4pLEVycm9yKGEoMzEsdD09PSJbb2JqZWN0IE9iamVjdF0iPyJvYmplY3Qgd2l0aCBrZXlzIHsiK09iamVjdC5rZXlzKG4pLmpvaW4oIiwgIikrIn0iOnQpKX1mdW5jdGlvbiBZdSh0KXt2YXIgbj10Ll9pbml0O3JldHVybiBuKHQuX3BheWxvYWQpfWZ1bmN0aW9uIFh1KHQpe2Z1bmN0aW9uIG4oRSxDKXtpZih0KXt2YXIgRD1FLmRlbGV0aW9ucztEPT09bnVsbD8oRS5kZWxldGlvbnM9W0NdLEUuZmxhZ3N8PTE2KTpELnB1c2goQyl9fWZ1bmN0aW9uIHMoRSxDKXtpZighdClyZXR1cm4gbnVsbDtmb3IoO0MhPT1udWxsOyluKEUsQyksQz1DLnNpYmxpbmc7cmV0dXJuIG51bGx9ZnVuY3Rpb24gaShFLEMpe2ZvcihFPW5ldyBNYXA7QyE9PW51bGw7KUMua2V5IT09bnVsbD9FLnNldChDLmtleSxDKTpFLnNldChDLmluZGV4LEMpLEM9Qy5zaWJsaW5nO3JldHVybiBFfWZ1bmN0aW9uIGMoRSxDKXtyZXR1cm4gRT1ucihFLEMpLEUuaW5kZXg9MCxFLnNpYmxpbmc9bnVsbCxFfWZ1bmN0aW9uIGYoRSxDLEQpe3JldHVybiBFLmluZGV4PUQsdD8oRD1FLmFsdGVybmF0ZSxEIT09bnVsbD8oRD1ELmluZGV4LEQ8Qz8oRS5mbGFnc3w9MixDKTpEKTooRS5mbGFnc3w9MixDKSk6KEUuZmxhZ3N8PTEwNDg1NzYsQyl9ZnVuY3Rpb24geShFKXtyZXR1cm4gdCYmRS5hbHRlcm5hdGU9PT1udWxsJiYoRS5mbGFnc3w9MiksRX1mdW5jdGlvbiBiKEUsQyxELG1lKXtyZXR1cm4gQz09PW51bGx8fEMudGFnIT09Nj8oQz1BbyhELEUubW9kZSxtZSksQy5yZXR1cm49RSxDKTooQz1jKEMsRCksQy5yZXR1cm49RSxDKX1mdW5jdGlvbiBOKEUsQyxELG1lKXt2YXIgVGU9RC50eXBlO3JldHVybiBUZT09PVNlP2xlKEUsQyxELnByb3BzLmNoaWxkcmVuLG1lLEQua2V5KTpDIT09bnVsbCYmKEMuZWxlbWVudFR5cGU9PT1UZXx8dHlwZW9mIFRlPT0ib2JqZWN0IiYmVGUhPT1udWxsJiZUZS4kJHR5cGVvZj09PWplJiZZdShUZSk9PT1DLnR5cGUpPyhtZT1jKEMsRC5wcm9wcyksbWUucmVmPVZzKEUsQyxEKSxtZS5yZXR1cm49RSxtZSk6KG1lPXdhKEQudHlwZSxELmtleSxELnByb3BzLG51bGwsRS5tb2RlLG1lKSxtZS5yZWY9VnMoRSxDLEQpLG1lLnJldHVybj1FLG1lKX1mdW5jdGlvbiBCKEUsQyxELG1lKXtyZXR1cm4gQz09PW51bGx8fEMudGFnIT09NHx8Qy5zdGF0ZU5vZGUuY29udGFpbmVySW5mbyE9PUQuY29udGFpbmVySW5mb3x8Qy5zdGF0ZU5vZGUuaW1wbGVtZW50YXRpb24hPT1ELmltcGxlbWVudGF0aW9uPyhDPURvKEQsRS5tb2RlLG1lKSxDLnJldHVybj1FLEMpOihDPWMoQyxELmNoaWxkcmVufHxbXSksQy5yZXR1cm49RSxDKX1mdW5jdGlvbiBsZShFLEMsRCxtZSxUZSl7cmV0dXJuIEM9PT1udWxsfHxDLnRhZyE9PTc/KEM9U3IoRCxFLm1vZGUsbWUsVGUpLEMucmV0dXJuPUUsQyk6KEM9YyhDLEQpLEMucmV0dXJuPUUsQyl9ZnVuY3Rpb24gY2UoRSxDLEQpe2lmKHR5cGVvZiBDPT0ic3RyaW5nIiYmQyE9PSIifHx0eXBlb2YgQz09Im51bWJlciIpcmV0dXJuIEM9QW8oIiIrQyxFLm1vZGUsRCksQy5yZXR1cm49RSxDO2lmKHR5cGVvZiBDPT0ib2JqZWN0IiYmQyE9PW51bGwpe3N3aXRjaChDLiQkdHlwZW9mKXtjYXNlIFo6cmV0dXJuIEQ9d2EoQy50eXBlLEMua2V5LEMucHJvcHMsbnVsbCxFLm1vZGUsRCksRC5yZWY9VnMoRSxudWxsLEMpLEQucmV0dXJuPUUsRDtjYXNlIHllOnJldHVybiBDPURvKEMsRS5tb2RlLEQpLEMucmV0dXJuPUUsQztjYXNlIGplOnZhciBtZT1DLl9pbml0O3JldHVybiBjZShFLG1lKEMuX3BheWxvYWQpLEQpfWlmKE8oQyl8fHRlKEMpKXJldHVybiBDPVNyKEMsRS5tb2RlLEQsbnVsbCksQy5yZXR1cm49RSxDO1hsKEUsQyl9cmV0dXJuIG51bGx9ZnVuY3Rpb24gcmUoRSxDLEQsbWUpe3ZhciBUZT1DIT09bnVsbD9DLmtleTpudWxsO2lmKHR5cGVvZiBEPT0ic3RyaW5nIiYmRCE9PSIifHx0eXBlb2YgRD09Im51bWJlciIpcmV0dXJuIFRlIT09bnVsbD9udWxsOmIoRSxDLCIiK0QsbWUpO2lmKHR5cGVvZiBEPT0ib2JqZWN0IiYmRCE9PW51bGwpe3N3aXRjaChELiQkdHlwZW9mKXtjYXNlIFo6cmV0dXJuIEQua2V5PT09VGU/TihFLEMsRCxtZSk6bnVsbDtjYXNlIHllOnJldHVybiBELmtleT09PVRlP0IoRSxDLEQsbWUpOm51bGw7Y2FzZSBqZTpyZXR1cm4gVGU9RC5faW5pdCxyZShFLEMsVGUoRC5fcGF5bG9hZCksbWUpfWlmKE8oRCl8fHRlKEQpKXJldHVybiBUZSE9PW51bGw/bnVsbDpsZShFLEMsRCxtZSxudWxsKTtYbChFLEQpfXJldHVybiBudWxsfWZ1bmN0aW9uIE5lKEUsQyxELG1lLFRlKXtpZih0eXBlb2YgbWU9PSJzdHJpbmciJiZtZSE9PSIifHx0eXBlb2YgbWU9PSJudW1iZXIiKXJldHVybiBFPUUuZ2V0KEQpfHxudWxsLGIoQyxFLCIiK21lLFRlKTtpZih0eXBlb2YgbWU9PSJvYmplY3QiJiZtZSE9PW51bGwpe3N3aXRjaChtZS4kJHR5cGVvZil7Y2FzZSBaOnJldHVybiBFPUUuZ2V0KG1lLmtleT09PW51bGw/RDptZS5rZXkpfHxudWxsLE4oQyxFLG1lLFRlKTtjYXNlIHllOnJldHVybiBFPUUuZ2V0KG1lLmtleT09PW51bGw/RDptZS5rZXkpfHxudWxsLEIoQyxFLG1lLFRlKTtjYXNlIGplOnZhciBEZT1tZS5faW5pdDtyZXR1cm4gTmUoRSxDLEQsRGUobWUuX3BheWxvYWQpLFRlKX1pZihPKG1lKXx8dGUobWUpKXJldHVybiBFPUUuZ2V0KEQpfHxudWxsLGxlKEMsRSxtZSxUZSxudWxsKTtYbChDLG1lKX1yZXR1cm4gbnVsbH1mdW5jdGlvbiBSZShFLEMsRCxtZSl7Zm9yKHZhciBUZT1udWxsLERlPW51bGwsSWU9QywkZT1DPTAsYnQ9bnVsbDtJZSE9PW51bGwmJiRlPEQubGVuZ3RoOyRlKyspe0llLmluZGV4PiRlPyhidD1JZSxJZT1udWxsKTpidD1JZS5zaWJsaW5nO3ZhciBRZT1yZShFLEllLERbJGVdLG1lKTtpZihRZT09PW51bGwpe0llPT09bnVsbCYmKEllPWJ0KTticmVha310JiZJZSYmUWUuYWx0ZXJuYXRlPT09bnVsbCYmbihFLEllKSxDPWYoUWUsQywkZSksRGU9PT1udWxsP1RlPVFlOkRlLnNpYmxpbmc9UWUsRGU9UWUsSWU9YnR9aWYoJGU9PT1ELmxlbmd0aClyZXR1cm4gcyhFLEllKSxzdCYmZ3IoRSwkZSksVGU7aWYoSWU9PT1udWxsKXtmb3IoOyRlPEQubGVuZ3RoOyRlKyspSWU9Y2UoRSxEWyRlXSxtZSksSWUhPT1udWxsJiYoQz1mKEllLEMsJGUpLERlPT09bnVsbD9UZT1JZTpEZS5zaWJsaW5nPUllLERlPUllKTtyZXR1cm4gc3QmJmdyKEUsJGUpLFRlfWZvcihJZT1pKEUsSWUpOyRlPEQubGVuZ3RoOyRlKyspYnQ9TmUoSWUsRSwkZSxEWyRlXSxtZSksYnQhPT1udWxsJiYodCYmYnQuYWx0ZXJuYXRlIT09bnVsbCYmSWUuZGVsZXRlKGJ0LmtleT09PW51bGw/JGU6YnQua2V5KSxDPWYoYnQsQywkZSksRGU9PT1udWxsP1RlPWJ0OkRlLnNpYmxpbmc9YnQsRGU9YnQpO3JldHVybiB0JiZJZS5mb3JFYWNoKGZ1bmN0aW9uKHJyKXtyZXR1cm4gbihFLHJyKX0pLHN0JiZncihFLCRlKSxUZX1mdW5jdGlvbiBDZShFLEMsRCxtZSl7dmFyIFRlPXRlKEQpO2lmKHR5cGVvZiBUZSE9ImZ1bmN0aW9uIil0aHJvdyBFcnJvcihhKDE1MCkpO2lmKEQ9VGUuY2FsbChEKSxEPT1udWxsKXRocm93IEVycm9yKGEoMTUxKSk7Zm9yKHZhciBEZT1UZT1udWxsLEllPUMsJGU9Qz0wLGJ0PW51bGwsUWU9RC5uZXh0KCk7SWUhPT1udWxsJiYhUWUuZG9uZTskZSsrLFFlPUQubmV4dCgpKXtJZS5pbmRleD4kZT8oYnQ9SWUsSWU9bnVsbCk6YnQ9SWUuc2libGluZzt2YXIgcnI9cmUoRSxJZSxRZS52YWx1ZSxtZSk7aWYocnI9PT1udWxsKXtJZT09PW51bGwmJihJZT1idCk7YnJlYWt9dCYmSWUmJnJyLmFsdGVybmF0ZT09PW51bGwmJm4oRSxJZSksQz1mKHJyLEMsJGUpLERlPT09bnVsbD9UZT1ycjpEZS5zaWJsaW5nPXJyLERlPXJyLEllPWJ0fWlmKFFlLmRvbmUpcmV0dXJuIHMoRSxJZSksc3QmJmdyKEUsJGUpLFRlO2lmKEllPT09bnVsbCl7Zm9yKDshUWUuZG9uZTskZSsrLFFlPUQubmV4dCgpKVFlPWNlKEUsUWUudmFsdWUsbWUpLFFlIT09bnVsbCYmKEM9ZihRZSxDLCRlKSxEZT09PW51bGw/VGU9UWU6RGUuc2libGluZz1RZSxEZT1RZSk7cmV0dXJuIHN0JiZncihFLCRlKSxUZX1mb3IoSWU9aShFLEllKTshUWUuZG9uZTskZSsrLFFlPUQubmV4dCgpKVFlPU5lKEllLEUsJGUsUWUudmFsdWUsbWUpLFFlIT09bnVsbCYmKHQmJlFlLmFsdGVybmF0ZSE9PW51bGwmJkllLmRlbGV0ZShRZS5rZXk9PT1udWxsPyRlOlFlLmtleSksQz1mKFFlLEMsJGUpLERlPT09bnVsbD9UZT1RZTpEZS5zaWJsaW5nPVFlLERlPVFlKTtyZXR1cm4gdCYmSWUuZm9yRWFjaChmdW5jdGlvbihobSl7cmV0dXJuIG4oRSxobSl9KSxzdCYmZ3IoRSwkZSksVGV9ZnVuY3Rpb24gZHQoRSxDLEQsbWUpe2lmKHR5cGVvZiBEPT0ib2JqZWN0IiYmRCE9PW51bGwmJkQudHlwZT09PVNlJiZELmtleT09PW51bGwmJihEPUQucHJvcHMuY2hpbGRyZW4pLHR5cGVvZiBEPT0ib2JqZWN0IiYmRCE9PW51bGwpe3N3aXRjaChELiQkdHlwZW9mKXtjYXNlIFo6ZTp7Zm9yKHZhciBUZT1ELmtleSxEZT1DO0RlIT09bnVsbDspe2lmKERlLmtleT09PVRlKXtpZihUZT1ELnR5cGUsVGU9PT1TZSl7aWYoRGUudGFnPT09Nyl7cyhFLERlLnNpYmxpbmcpLEM9YyhEZSxELnByb3BzLmNoaWxkcmVuKSxDLnJldHVybj1FLEU9QzticmVhayBlfX1lbHNlIGlmKERlLmVsZW1lbnRUeXBlPT09VGV8fHR5cGVvZiBUZT09Im9iamVjdCImJlRlIT09bnVsbCYmVGUuJCR0eXBlb2Y9PT1qZSYmWXUoVGUpPT09RGUudHlwZSl7cyhFLERlLnNpYmxpbmcpLEM9YyhEZSxELnByb3BzKSxDLnJlZj1WcyhFLERlLEQpLEMucmV0dXJuPUUsRT1DO2JyZWFrIGV9cyhFLERlKTticmVha31lbHNlIG4oRSxEZSk7RGU9RGUuc2libGluZ31ELnR5cGU9PT1TZT8oQz1TcihELnByb3BzLmNoaWxkcmVuLEUubW9kZSxtZSxELmtleSksQy5yZXR1cm49RSxFPUMpOihtZT13YShELnR5cGUsRC5rZXksRC5wcm9wcyxudWxsLEUubW9kZSxtZSksbWUucmVmPVZzKEUsQyxEKSxtZS5yZXR1cm49RSxFPW1lKX1yZXR1cm4geShFKTtjYXNlIHllOmU6e2ZvcihEZT1ELmtleTtDIT09bnVsbDspe2lmKEMua2V5PT09RGUpaWYoQy50YWc9PT00JiZDLnN0YXRlTm9kZS5jb250YWluZXJJbmZvPT09RC5jb250YWluZXJJbmZvJiZDLnN0YXRlTm9kZS5pbXBsZW1lbnRhdGlvbj09PUQuaW1wbGVtZW50YXRpb24pe3MoRSxDLnNpYmxpbmcpLEM9YyhDLEQuY2hpbGRyZW58fFtdKSxDLnJldHVybj1FLEU9QzticmVhayBlfWVsc2V7cyhFLEMpO2JyZWFrfWVsc2UgbihFLEMpO0M9Qy5zaWJsaW5nfUM9RG8oRCxFLm1vZGUsbWUpLEMucmV0dXJuPUUsRT1DfXJldHVybiB5KEUpO2Nhc2UgamU6cmV0dXJuIERlPUQuX2luaXQsZHQoRSxDLERlKEQuX3BheWxvYWQpLG1lKX1pZihPKEQpKXJldHVybiBSZShFLEMsRCxtZSk7aWYodGUoRCkpcmV0dXJuIENlKEUsQyxELG1lKTtYbChFLEQpfXJldHVybiB0eXBlb2YgRD09InN0cmluZyImJkQhPT0iInx8dHlwZW9mIEQ9PSJudW1iZXIiPyhEPSIiK0QsQyE9PW51bGwmJkMudGFnPT09Nj8ocyhFLEMuc2libGluZyksQz1jKEMsRCksQy5yZXR1cm49RSxFPUMpOihzKEUsQyksQz1BbyhELEUubW9kZSxtZSksQy5yZXR1cm49RSxFPUMpLHkoRSkpOnMoRSxDKX1yZXR1cm4gZHR9dmFyIFhyPVh1KCEwKSxRdT1YdSghMSksUWw9S24obnVsbCksSmw9bnVsbCxRcj1udWxsLFdpPW51bGw7ZnVuY3Rpb24gSGkoKXtXaT1Rcj1KbD1udWxsfWZ1bmN0aW9uIFVpKHQpe3ZhciBuPVFsLmN1cnJlbnQ7bnQoUWwpLHQuX2N1cnJlbnRWYWx1ZT1ufWZ1bmN0aW9uIEdpKHQsbixzKXtmb3IoO3QhPT1udWxsOyl7dmFyIGk9dC5hbHRlcm5hdGU7aWYoKHQuY2hpbGRMYW5lcyZuKSE9PW4/KHQuY2hpbGRMYW5lc3w9bixpIT09bnVsbCYmKGkuY2hpbGRMYW5lc3w9bikpOmkhPT1udWxsJiYoaS5jaGlsZExhbmVzJm4pIT09biYmKGkuY2hpbGRMYW5lc3w9biksdD09PXMpYnJlYWs7dD10LnJldHVybn19ZnVuY3Rpb24gSnIodCxuKXtKbD10LFdpPVFyPW51bGwsdD10LmRlcGVuZGVuY2llcyx0IT09bnVsbCYmdC5maXJzdENvbnRleHQhPT1udWxsJiYoKHQubGFuZXMmbikhPT0wJiYoQnQ9ITApLHQuZmlyc3RDb250ZXh0PW51bGwpfWZ1bmN0aW9uIFh0KHQpe3ZhciBuPXQuX2N1cnJlbnRWYWx1ZTtpZihXaSE9PXQpaWYodD17Y29udGV4dDp0LG1lbW9pemVkVmFsdWU6bixuZXh0Om51bGx9LFFyPT09bnVsbCl7aWYoSmw9PT1udWxsKXRocm93IEVycm9yKGEoMzA4KSk7UXI9dCxKbC5kZXBlbmRlbmNpZXM9e2xhbmVzOjAsZmlyc3RDb250ZXh0OnR9fWVsc2UgUXI9UXIubmV4dD10O3JldHVybiBufXZhciB4cj1udWxsO2Z1bmN0aW9uIEtpKHQpe3hyPT09bnVsbD94cj1bdF06eHIucHVzaCh0KX1mdW5jdGlvbiBKdSh0LG4scyxpKXt2YXIgYz1uLmludGVybGVhdmVkO3JldHVybiBjPT09bnVsbD8ocy5uZXh0PXMsS2kobikpOihzLm5leHQ9Yy5uZXh0LGMubmV4dD1zKSxuLmludGVybGVhdmVkPXMsUG4odCxpKX1mdW5jdGlvbiBQbih0LG4pe3QubGFuZXN8PW47dmFyIHM9dC5hbHRlcm5hdGU7Zm9yKHMhPT1udWxsJiYocy5sYW5lc3w9bikscz10LHQ9dC5yZXR1cm47dCE9PW51bGw7KXQuY2hpbGRMYW5lc3w9bixzPXQuYWx0ZXJuYXRlLHMhPT1udWxsJiYocy5jaGlsZExhbmVzfD1uKSxzPXQsdD10LnJldHVybjtyZXR1cm4gcy50YWc9PT0zP3Muc3RhdGVOb2RlOm51bGx9dmFyIFluPSExO2Z1bmN0aW9uIFZpKHQpe3QudXBkYXRlUXVldWU9e2Jhc2VTdGF0ZTp0Lm1lbW9pemVkU3RhdGUsZmlyc3RCYXNlVXBkYXRlOm51bGwsbGFzdEJhc2VVcGRhdGU6bnVsbCxzaGFyZWQ6e3BlbmRpbmc6bnVsbCxpbnRlcmxlYXZlZDpudWxsLGxhbmVzOjB9LGVmZmVjdHM6bnVsbH19ZnVuY3Rpb24gWnUodCxuKXt0PXQudXBkYXRlUXVldWUsbi51cGRhdGVRdWV1ZT09PXQmJihuLnVwZGF0ZVF1ZXVlPXtiYXNlU3RhdGU6dC5iYXNlU3RhdGUsZmlyc3RCYXNlVXBkYXRlOnQuZmlyc3RCYXNlVXBkYXRlLGxhc3RCYXNlVXBkYXRlOnQubGFzdEJhc2VVcGRhdGUsc2hhcmVkOnQuc2hhcmVkLGVmZmVjdHM6dC5lZmZlY3RzfSl9ZnVuY3Rpb24gRW4odCxuKXtyZXR1cm57ZXZlbnRUaW1lOnQsbGFuZTpuLHRhZzowLHBheWxvYWQ6bnVsbCxjYWxsYmFjazpudWxsLG5leHQ6bnVsbH19ZnVuY3Rpb24gWG4odCxuLHMpe3ZhciBpPXQudXBkYXRlUXVldWU7aWYoaT09PW51bGwpcmV0dXJuIG51bGw7aWYoaT1pLnNoYXJlZCwoWWUmMikhPT0wKXt2YXIgYz1pLnBlbmRpbmc7cmV0dXJuIGM9PT1udWxsP24ubmV4dD1uOihuLm5leHQ9Yy5uZXh0LGMubmV4dD1uKSxpLnBlbmRpbmc9bixQbih0LHMpfXJldHVybiBjPWkuaW50ZXJsZWF2ZWQsYz09PW51bGw/KG4ubmV4dD1uLEtpKGkpKToobi5uZXh0PWMubmV4dCxjLm5leHQ9biksaS5pbnRlcmxlYXZlZD1uLFBuKHQscyl9ZnVuY3Rpb24gWmwodCxuLHMpe2lmKG49bi51cGRhdGVRdWV1ZSxuIT09bnVsbCYmKG49bi5zaGFyZWQsKHMmNDE5NDI0MCkhPT0wKSl7dmFyIGk9bi5sYW5lcztpJj10LnBlbmRpbmdMYW5lcyxzfD1pLG4ubGFuZXM9cyxpaSh0LHMpfX1mdW5jdGlvbiBlZih0LG4pe3ZhciBzPXQudXBkYXRlUXVldWUsaT10LmFsdGVybmF0ZTtpZihpIT09bnVsbCYmKGk9aS51cGRhdGVRdWV1ZSxzPT09aSkpe3ZhciBjPW51bGwsZj1udWxsO2lmKHM9cy5maXJzdEJhc2VVcGRhdGUscyE9PW51bGwpe2Rve3ZhciB5PXtldmVudFRpbWU6cy5ldmVudFRpbWUsbGFuZTpzLmxhbmUsdGFnOnMudGFnLHBheWxvYWQ6cy5wYXlsb2FkLGNhbGxiYWNrOnMuY2FsbGJhY2ssbmV4dDpudWxsfTtmPT09bnVsbD9jPWY9eTpmPWYubmV4dD15LHM9cy5uZXh0fXdoaWxlKHMhPT1udWxsKTtmPT09bnVsbD9jPWY9bjpmPWYubmV4dD1ufWVsc2UgYz1mPW47cz17YmFzZVN0YXRlOmkuYmFzZVN0YXRlLGZpcnN0QmFzZVVwZGF0ZTpjLGxhc3RCYXNlVXBkYXRlOmYsc2hhcmVkOmkuc2hhcmVkLGVmZmVjdHM6aS5lZmZlY3RzfSx0LnVwZGF0ZVF1ZXVlPXM7cmV0dXJufXQ9cy5sYXN0QmFzZVVwZGF0ZSx0PT09bnVsbD9zLmZpcnN0QmFzZVVwZGF0ZT1uOnQubmV4dD1uLHMubGFzdEJhc2VVcGRhdGU9bn1mdW5jdGlvbiBlYSh0LG4scyxpKXt2YXIgYz10LnVwZGF0ZVF1ZXVlO1luPSExO3ZhciBmPWMuZmlyc3RCYXNlVXBkYXRlLHk9Yy5sYXN0QmFzZVVwZGF0ZSxiPWMuc2hhcmVkLnBlbmRpbmc7aWYoYiE9PW51bGwpe2Muc2hhcmVkLnBlbmRpbmc9bnVsbDt2YXIgTj1iLEI9Ti5uZXh0O04ubmV4dD1udWxsLHk9PT1udWxsP2Y9Qjp5Lm5leHQ9Qix5PU47dmFyIGxlPXQuYWx0ZXJuYXRlO2xlIT09bnVsbCYmKGxlPWxlLnVwZGF0ZVF1ZXVlLGI9bGUubGFzdEJhc2VVcGRhdGUsYiE9PXkmJihiPT09bnVsbD9sZS5maXJzdEJhc2VVcGRhdGU9QjpiLm5leHQ9QixsZS5sYXN0QmFzZVVwZGF0ZT1OKSl9aWYoZiE9PW51bGwpe3ZhciBjZT1jLmJhc2VTdGF0ZTt5PTAsbGU9Qj1OPW51bGwsYj1mO2Rve3ZhciByZT1iLmxhbmUsTmU9Yi5ldmVudFRpbWU7aWYoKGkmcmUpPT09cmUpe2xlIT09bnVsbCYmKGxlPWxlLm5leHQ9e2V2ZW50VGltZTpOZSxsYW5lOjAsdGFnOmIudGFnLHBheWxvYWQ6Yi5wYXlsb2FkLGNhbGxiYWNrOmIuY2FsbGJhY2ssbmV4dDpudWxsfSk7ZTp7dmFyIFJlPXQsQ2U9Yjtzd2l0Y2gocmU9bixOZT1zLENlLnRhZyl7Y2FzZSAxOmlmKFJlPUNlLnBheWxvYWQsdHlwZW9mIFJlPT0iZnVuY3Rpb24iKXtjZT1SZS5jYWxsKE5lLGNlLHJlKTticmVhayBlfWNlPVJlO2JyZWFrIGU7Y2FzZSAzOlJlLmZsYWdzPVJlLmZsYWdzJi02NTUzN3wxMjg7Y2FzZSAwOmlmKFJlPUNlLnBheWxvYWQscmU9dHlwZW9mIFJlPT0iZnVuY3Rpb24iP1JlLmNhbGwoTmUsY2UscmUpOlJlLHJlPT1udWxsKWJyZWFrIGU7Y2U9Rih7fSxjZSxyZSk7YnJlYWsgZTtjYXNlIDI6WW49ITB9fWIuY2FsbGJhY2shPT1udWxsJiZiLmxhbmUhPT0wJiYodC5mbGFnc3w9NjQscmU9Yy5lZmZlY3RzLHJlPT09bnVsbD9jLmVmZmVjdHM9W2JdOnJlLnB1c2goYikpfWVsc2UgTmU9e2V2ZW50VGltZTpOZSxsYW5lOnJlLHRhZzpiLnRhZyxwYXlsb2FkOmIucGF5bG9hZCxjYWxsYmFjazpiLmNhbGxiYWNrLG5leHQ6bnVsbH0sbGU9PT1udWxsPyhCPWxlPU5lLE49Y2UpOmxlPWxlLm5leHQ9TmUseXw9cmU7aWYoYj1iLm5leHQsYj09PW51bGwpe2lmKGI9Yy5zaGFyZWQucGVuZGluZyxiPT09bnVsbClicmVhaztyZT1iLGI9cmUubmV4dCxyZS5uZXh0PW51bGwsYy5sYXN0QmFzZVVwZGF0ZT1yZSxjLnNoYXJlZC5wZW5kaW5nPW51bGx9fXdoaWxlKCEwKTtpZihsZT09PW51bGwmJihOPWNlKSxjLmJhc2VTdGF0ZT1OLGMuZmlyc3RCYXNlVXBkYXRlPUIsYy5sYXN0QmFzZVVwZGF0ZT1sZSxuPWMuc2hhcmVkLmludGVybGVhdmVkLG4hPT1udWxsKXtjPW47ZG8geXw9Yy5sYW5lLGM9Yy5uZXh0O3doaWxlKGMhPT1uKX1lbHNlIGY9PT1udWxsJiYoYy5zaGFyZWQubGFuZXM9MCk7d3J8PXksdC5sYW5lcz15LHQubWVtb2l6ZWRTdGF0ZT1jZX19ZnVuY3Rpb24gdGYodCxuLHMpe2lmKHQ9bi5lZmZlY3RzLG4uZWZmZWN0cz1udWxsLHQhPT1udWxsKWZvcihuPTA7bjx0Lmxlbmd0aDtuKyspe3ZhciBpPXRbbl0sYz1pLmNhbGxiYWNrO2lmKGMhPT1udWxsKXtpZihpLmNhbGxiYWNrPW51bGwsaT1zLHR5cGVvZiBjIT0iZnVuY3Rpb24iKXRocm93IEVycm9yKGEoMTkxLGMpKTtjLmNhbGwoaSl9fX12YXIgcXM9e30seW49S24ocXMpLFlzPUtuKHFzKSxYcz1Lbihxcyk7ZnVuY3Rpb24geXIodCl7aWYodD09PXFzKXRocm93IEVycm9yKGEoMTc0KSk7cmV0dXJuIHR9ZnVuY3Rpb24gcWkodCxuKXtzd2l0Y2goZXQoWHMsbiksZXQoWXMsdCksZXQoeW4scXMpLHQ9bi5ub2RlVHlwZSx0KXtjYXNlIDk6Y2FzZSAxMTpuPShuPW4uZG9jdW1lbnRFbGVtZW50KT9uLm5hbWVzcGFjZVVSSTpzZShudWxsLCIiKTticmVhaztkZWZhdWx0OnQ9dD09PTg/bi5wYXJlbnROb2RlOm4sbj10Lm5hbWVzcGFjZVVSSXx8bnVsbCx0PXQudGFnTmFtZSxuPXNlKG4sdCl9bnQoeW4pLGV0KHluLG4pfWZ1bmN0aW9uIFpyKCl7bnQoeW4pLG50KFlzKSxudChYcyl9ZnVuY3Rpb24gbmYodCl7eXIoWHMuY3VycmVudCk7dmFyIG49eXIoeW4uY3VycmVudCkscz1zZShuLHQudHlwZSk7biE9PXMmJihldChZcyx0KSxldCh5bixzKSl9ZnVuY3Rpb24gWWkodCl7WXMuY3VycmVudD09PXQmJihudCh5biksbnQoWXMpKX12YXIgYXQ9S24oMCk7ZnVuY3Rpb24gdGEodCl7Zm9yKHZhciBuPXQ7biE9PW51bGw7KXtpZihuLnRhZz09PTEzKXt2YXIgcz1uLm1lbW9pemVkU3RhdGU7aWYocyE9PW51bGwmJihzPXMuZGVoeWRyYXRlZCxzPT09bnVsbHx8cy5kYXRhPT09IiQ/Inx8cy5kYXRhPT09IiQhIikpcmV0dXJuIG59ZWxzZSBpZihuLnRhZz09PTE5JiZuLm1lbW9pemVkUHJvcHMucmV2ZWFsT3JkZXIhPT12b2lkIDApe2lmKChuLmZsYWdzJjEyOCkhPT0wKXJldHVybiBufWVsc2UgaWYobi5jaGlsZCE9PW51bGwpe24uY2hpbGQucmV0dXJuPW4sbj1uLmNoaWxkO2NvbnRpbnVlfWlmKG49PT10KWJyZWFrO2Zvcig7bi5zaWJsaW5nPT09bnVsbDspe2lmKG4ucmV0dXJuPT09bnVsbHx8bi5yZXR1cm49PT10KXJldHVybiBudWxsO249bi5yZXR1cm59bi5zaWJsaW5nLnJldHVybj1uLnJldHVybixuPW4uc2libGluZ31yZXR1cm4gbnVsbH12YXIgWGk9W107ZnVuY3Rpb24gUWkoKXtmb3IodmFyIHQ9MDt0PFhpLmxlbmd0aDt0KyspWGlbdF0uX3dvcmtJblByb2dyZXNzVmVyc2lvblByaW1hcnk9bnVsbDtYaS5sZW5ndGg9MH12YXIgbmE9b2UuUmVhY3RDdXJyZW50RGlzcGF0Y2hlcixKaT1vZS5SZWFjdEN1cnJlbnRCYXRjaENvbmZpZyx2cj0wLGl0PW51bGwseHQ9bnVsbCx2dD1udWxsLHJhPSExLFFzPSExLEpzPTAsX2g9MDtmdW5jdGlvbiBDdCgpe3Rocm93IEVycm9yKGEoMzIxKSl9ZnVuY3Rpb24gWmkodCxuKXtpZihuPT09bnVsbClyZXR1cm4hMTtmb3IodmFyIHM9MDtzPG4ubGVuZ3RoJiZzPHQubGVuZ3RoO3MrKylpZighdG4odFtzXSxuW3NdKSlyZXR1cm4hMTtyZXR1cm4hMH1mdW5jdGlvbiBlbyh0LG4scyxpLGMsZil7aWYodnI9ZixpdD1uLG4ubWVtb2l6ZWRTdGF0ZT1udWxsLG4udXBkYXRlUXVldWU9bnVsbCxuLmxhbmVzPTAsbmEuY3VycmVudD10PT09bnVsbHx8dC5tZW1vaXplZFN0YXRlPT09bnVsbD9GaDokaCx0PXMoaSxjKSxRcyl7Zj0wO2Rve2lmKFFzPSExLEpzPTAsMjU8PWYpdGhyb3cgRXJyb3IoYSgzMDEpKTtmKz0xLHZ0PXh0PW51bGwsbi51cGRhdGVRdWV1ZT1udWxsLG5hLmN1cnJlbnQ9V2gsdD1zKGksYyl9d2hpbGUoUXMpfWlmKG5hLmN1cnJlbnQ9YWEsbj14dCE9PW51bGwmJnh0Lm5leHQhPT1udWxsLHZyPTAsdnQ9eHQ9aXQ9bnVsbCxyYT0hMSxuKXRocm93IEVycm9yKGEoMzAwKSk7cmV0dXJuIHR9ZnVuY3Rpb24gdG8oKXt2YXIgdD1KcyE9PTA7cmV0dXJuIEpzPTAsdH1mdW5jdGlvbiB2bigpe3ZhciB0PXttZW1vaXplZFN0YXRlOm51bGwsYmFzZVN0YXRlOm51bGwsYmFzZVF1ZXVlOm51bGwscXVldWU6bnVsbCxuZXh0Om51bGx9O3JldHVybiB2dD09PW51bGw/aXQubWVtb2l6ZWRTdGF0ZT12dD10OnZ0PXZ0Lm5leHQ9dCx2dH1mdW5jdGlvbiBRdCgpe2lmKHh0PT09bnVsbCl7dmFyIHQ9aXQuYWx0ZXJuYXRlO3Q9dCE9PW51bGw/dC5tZW1vaXplZFN0YXRlOm51bGx9ZWxzZSB0PXh0Lm5leHQ7dmFyIG49dnQ9PT1udWxsP2l0Lm1lbW9pemVkU3RhdGU6dnQubmV4dDtpZihuIT09bnVsbCl2dD1uLHh0PXQ7ZWxzZXtpZih0PT09bnVsbCl0aHJvdyBFcnJvcihhKDMxMCkpO3h0PXQsdD17bWVtb2l6ZWRTdGF0ZTp4dC5tZW1vaXplZFN0YXRlLGJhc2VTdGF0ZTp4dC5iYXNlU3RhdGUsYmFzZVF1ZXVlOnh0LmJhc2VRdWV1ZSxxdWV1ZTp4dC5xdWV1ZSxuZXh0Om51bGx9LHZ0PT09bnVsbD9pdC5tZW1vaXplZFN0YXRlPXZ0PXQ6dnQ9dnQubmV4dD10fXJldHVybiB2dH1mdW5jdGlvbiBacyh0LG4pe3JldHVybiB0eXBlb2Ygbj09ImZ1bmN0aW9uIj9uKHQpOm59ZnVuY3Rpb24gbm8odCl7dmFyIG49UXQoKSxzPW4ucXVldWU7aWYocz09PW51bGwpdGhyb3cgRXJyb3IoYSgzMTEpKTtzLmxhc3RSZW5kZXJlZFJlZHVjZXI9dDt2YXIgaT14dCxjPWkuYmFzZVF1ZXVlLGY9cy5wZW5kaW5nO2lmKGYhPT1udWxsKXtpZihjIT09bnVsbCl7dmFyIHk9Yy5uZXh0O2MubmV4dD1mLm5leHQsZi5uZXh0PXl9aS5iYXNlUXVldWU9Yz1mLHMucGVuZGluZz1udWxsfWlmKGMhPT1udWxsKXtmPWMubmV4dCxpPWkuYmFzZVN0YXRlO3ZhciBiPXk9bnVsbCxOPW51bGwsQj1mO2Rve3ZhciBsZT1CLmxhbmU7aWYoKHZyJmxlKT09PWxlKU4hPT1udWxsJiYoTj1OLm5leHQ9e2xhbmU6MCxhY3Rpb246Qi5hY3Rpb24saGFzRWFnZXJTdGF0ZTpCLmhhc0VhZ2VyU3RhdGUsZWFnZXJTdGF0ZTpCLmVhZ2VyU3RhdGUsbmV4dDpudWxsfSksaT1CLmhhc0VhZ2VyU3RhdGU/Qi5lYWdlclN0YXRlOnQoaSxCLmFjdGlvbik7ZWxzZXt2YXIgY2U9e2xhbmU6bGUsYWN0aW9uOkIuYWN0aW9uLGhhc0VhZ2VyU3RhdGU6Qi5oYXNFYWdlclN0YXRlLGVhZ2VyU3RhdGU6Qi5lYWdlclN0YXRlLG5leHQ6bnVsbH07Tj09PW51bGw/KGI9Tj1jZSx5PWkpOk49Ti5uZXh0PWNlLGl0LmxhbmVzfD1sZSx3cnw9bGV9Qj1CLm5leHR9d2hpbGUoQiE9PW51bGwmJkIhPT1mKTtOPT09bnVsbD95PWk6Ti5uZXh0PWIsdG4oaSxuLm1lbW9pemVkU3RhdGUpfHwoQnQ9ITApLG4ubWVtb2l6ZWRTdGF0ZT1pLG4uYmFzZVN0YXRlPXksbi5iYXNlUXVldWU9TixzLmxhc3RSZW5kZXJlZFN0YXRlPWl9aWYodD1zLmludGVybGVhdmVkLHQhPT1udWxsKXtjPXQ7ZG8gZj1jLmxhbmUsaXQubGFuZXN8PWYsd3J8PWYsYz1jLm5leHQ7d2hpbGUoYyE9PXQpfWVsc2UgYz09PW51bGwmJihzLmxhbmVzPTApO3JldHVybltuLm1lbW9pemVkU3RhdGUscy5kaXNwYXRjaF19ZnVuY3Rpb24gcm8odCl7dmFyIG49UXQoKSxzPW4ucXVldWU7aWYocz09PW51bGwpdGhyb3cgRXJyb3IoYSgzMTEpKTtzLmxhc3RSZW5kZXJlZFJlZHVjZXI9dDt2YXIgaT1zLmRpc3BhdGNoLGM9cy5wZW5kaW5nLGY9bi5tZW1vaXplZFN0YXRlO2lmKGMhPT1udWxsKXtzLnBlbmRpbmc9bnVsbDt2YXIgeT1jPWMubmV4dDtkbyBmPXQoZix5LmFjdGlvbikseT15Lm5leHQ7d2hpbGUoeSE9PWMpO3RuKGYsbi5tZW1vaXplZFN0YXRlKXx8KEJ0PSEwKSxuLm1lbW9pemVkU3RhdGU9ZixuLmJhc2VRdWV1ZT09PW51bGwmJihuLmJhc2VTdGF0ZT1mKSxzLmxhc3RSZW5kZXJlZFN0YXRlPWZ9cmV0dXJuW2YsaV19ZnVuY3Rpb24gcmYoKXt9ZnVuY3Rpb24gc2YodCxuKXt2YXIgcz1pdCxpPVF0KCksYz1uKCksZj0hdG4oaS5tZW1vaXplZFN0YXRlLGMpO2lmKGYmJihpLm1lbW9pemVkU3RhdGU9YyxCdD0hMCksaT1pLnF1ZXVlLHNvKG9mLmJpbmQobnVsbCxzLGksdCksW3RdKSxpLmdldFNuYXBzaG90IT09bnx8Znx8dnQhPT1udWxsJiZ2dC5tZW1vaXplZFN0YXRlLnRhZyYxKXtpZihzLmZsYWdzfD0yMDQ4LGVsKDksYWYuYmluZChudWxsLHMsaSxjLG4pLHZvaWQgMCxudWxsKSx3dD09PW51bGwpdGhyb3cgRXJyb3IoYSgzNDkpKTsodnImMzApIT09MHx8bGYocyxuLGMpfXJldHVybiBjfWZ1bmN0aW9uIGxmKHQsbixzKXt0LmZsYWdzfD0xNjM4NCx0PXtnZXRTbmFwc2hvdDpuLHZhbHVlOnN9LG49aXQudXBkYXRlUXVldWUsbj09PW51bGw/KG49e2xhc3RFZmZlY3Q6bnVsbCxzdG9yZXM6bnVsbH0saXQudXBkYXRlUXVldWU9bixuLnN0b3Jlcz1bdF0pOihzPW4uc3RvcmVzLHM9PT1udWxsP24uc3RvcmVzPVt0XTpzLnB1c2godCkpfWZ1bmN0aW9uIGFmKHQsbixzLGkpe24udmFsdWU9cyxuLmdldFNuYXBzaG90PWksY2YobikmJnVmKHQpfWZ1bmN0aW9uIG9mKHQsbixzKXtyZXR1cm4gcyhmdW5jdGlvbigpe2NmKG4pJiZ1Zih0KX0pfWZ1bmN0aW9uIGNmKHQpe3ZhciBuPXQuZ2V0U25hcHNob3Q7dD10LnZhbHVlO3RyeXt2YXIgcz1uKCk7cmV0dXJuIXRuKHQscyl9Y2F0Y2h7cmV0dXJuITB9fWZ1bmN0aW9uIHVmKHQpe3ZhciBuPVBuKHQsMSk7biE9PW51bGwmJmFuKG4sdCwxLC0xKX1mdW5jdGlvbiBmZih0KXt2YXIgbj12bigpO3JldHVybiB0eXBlb2YgdD09ImZ1bmN0aW9uIiYmKHQ9dCgpKSxuLm1lbW9pemVkU3RhdGU9bi5iYXNlU3RhdGU9dCx0PXtwZW5kaW5nOm51bGwsaW50ZXJsZWF2ZWQ6bnVsbCxsYW5lczowLGRpc3BhdGNoOm51bGwsbGFzdFJlbmRlcmVkUmVkdWNlcjpacyxsYXN0UmVuZGVyZWRTdGF0ZTp0fSxuLnF1ZXVlPXQsdD10LmRpc3BhdGNoPXpoLmJpbmQobnVsbCxpdCx0KSxbbi5tZW1vaXplZFN0YXRlLHRdfWZ1bmN0aW9uIGVsKHQsbixzLGkpe3JldHVybiB0PXt0YWc6dCxjcmVhdGU6bixkZXN0cm95OnMsZGVwczppLG5leHQ6bnVsbH0sbj1pdC51cGRhdGVRdWV1ZSxuPT09bnVsbD8obj17bGFzdEVmZmVjdDpudWxsLHN0b3JlczpudWxsfSxpdC51cGRhdGVRdWV1ZT1uLG4ubGFzdEVmZmVjdD10Lm5leHQ9dCk6KHM9bi5sYXN0RWZmZWN0LHM9PT1udWxsP24ubGFzdEVmZmVjdD10Lm5leHQ9dDooaT1zLm5leHQscy5uZXh0PXQsdC5uZXh0PWksbi5sYXN0RWZmZWN0PXQpKSx0fWZ1bmN0aW9uIGRmKCl7cmV0dXJuIFF0KCkubWVtb2l6ZWRTdGF0ZX1mdW5jdGlvbiBzYSh0LG4scyxpKXt2YXIgYz12bigpO2l0LmZsYWdzfD10LGMubWVtb2l6ZWRTdGF0ZT1lbCgxfG4scyx2b2lkIDAsaT09PXZvaWQgMD9udWxsOmkpfWZ1bmN0aW9uIGxhKHQsbixzLGkpe3ZhciBjPVF0KCk7aT1pPT09dm9pZCAwP251bGw6aTt2YXIgZj12b2lkIDA7aWYoeHQhPT1udWxsKXt2YXIgeT14dC5tZW1vaXplZFN0YXRlO2lmKGY9eS5kZXN0cm95LGkhPT1udWxsJiZaaShpLHkuZGVwcykpe2MubWVtb2l6ZWRTdGF0ZT1lbChuLHMsZixpKTtyZXR1cm59fWl0LmZsYWdzfD10LGMubWVtb2l6ZWRTdGF0ZT1lbCgxfG4scyxmLGkpfWZ1bmN0aW9uIHBmKHQsbil7cmV0dXJuIHNhKDgzOTA2NTYsOCx0LG4pfWZ1bmN0aW9uIHNvKHQsbil7cmV0dXJuIGxhKDIwNDgsOCx0LG4pfWZ1bmN0aW9uIGhmKHQsbil7cmV0dXJuIGxhKDQsMix0LG4pfWZ1bmN0aW9uIG1mKHQsbil7cmV0dXJuIGxhKDQsNCx0LG4pfWZ1bmN0aW9uIGdmKHQsbil7aWYodHlwZW9mIG49PSJmdW5jdGlvbiIpcmV0dXJuIHQ9dCgpLG4odCksZnVuY3Rpb24oKXtuKG51bGwpfTtpZihuIT1udWxsKXJldHVybiB0PXQoKSxuLmN1cnJlbnQ9dCxmdW5jdGlvbigpe24uY3VycmVudD1udWxsfX1mdW5jdGlvbiB4Zih0LG4scyl7cmV0dXJuIHM9cyE9bnVsbD9zLmNvbmNhdChbdF0pOm51bGwsbGEoNCw0LGdmLmJpbmQobnVsbCxuLHQpLHMpfWZ1bmN0aW9uIGxvKCl7fWZ1bmN0aW9uIHlmKHQsbil7dmFyIHM9UXQoKTtuPW49PT12b2lkIDA/bnVsbDpuO3ZhciBpPXMubWVtb2l6ZWRTdGF0ZTtyZXR1cm4gaSE9PW51bGwmJm4hPT1udWxsJiZaaShuLGlbMV0pP2lbMF06KHMubWVtb2l6ZWRTdGF0ZT1bdCxuXSx0KX1mdW5jdGlvbiB2Zih0LG4pe3ZhciBzPVF0KCk7bj1uPT09dm9pZCAwP251bGw6bjt2YXIgaT1zLm1lbW9pemVkU3RhdGU7cmV0dXJuIGkhPT1udWxsJiZuIT09bnVsbCYmWmkobixpWzFdKT9pWzBdOih0PXQoKSxzLm1lbW9pemVkU3RhdGU9W3Qsbl0sdCl9ZnVuY3Rpb24gd2YodCxuLHMpe3JldHVybih2ciYyMSk9PT0wPyh0LmJhc2VTdGF0ZSYmKHQuYmFzZVN0YXRlPSExLEJ0PSEwKSx0Lm1lbW9pemVkU3RhdGU9cyk6KHRuKHMsbil8fChzPVljKCksaXQubGFuZXN8PXMsd3J8PXMsdC5iYXNlU3RhdGU9ITApLG4pfWZ1bmN0aW9uIE9oKHQsbil7dmFyIHM9WmU7WmU9cyE9PTAmJjQ+cz9zOjQsdCghMCk7dmFyIGk9SmkudHJhbnNpdGlvbjtKaS50cmFuc2l0aW9uPXt9O3RyeXt0KCExKSxuKCl9ZmluYWxseXtaZT1zLEppLnRyYW5zaXRpb249aX19ZnVuY3Rpb24gYmYoKXtyZXR1cm4gUXQoKS5tZW1vaXplZFN0YXRlfWZ1bmN0aW9uIEJoKHQsbixzKXt2YXIgaT1lcih0KTtpZihzPXtsYW5lOmksYWN0aW9uOnMsaGFzRWFnZXJTdGF0ZTohMSxlYWdlclN0YXRlOm51bGwsbmV4dDpudWxsfSxrZih0KSlqZihuLHMpO2Vsc2UgaWYocz1KdSh0LG4scyxpKSxzIT09bnVsbCl7dmFyIGM9RHQoKTthbihzLHQsaSxjKSxTZihzLG4saSl9fWZ1bmN0aW9uIHpoKHQsbixzKXt2YXIgaT1lcih0KSxjPXtsYW5lOmksYWN0aW9uOnMsaGFzRWFnZXJTdGF0ZTohMSxlYWdlclN0YXRlOm51bGwsbmV4dDpudWxsfTtpZihrZih0KSlqZihuLGMpO2Vsc2V7dmFyIGY9dC5hbHRlcm5hdGU7aWYodC5sYW5lcz09PTAmJihmPT09bnVsbHx8Zi5sYW5lcz09PTApJiYoZj1uLmxhc3RSZW5kZXJlZFJlZHVjZXIsZiE9PW51bGwpKXRyeXt2YXIgeT1uLmxhc3RSZW5kZXJlZFN0YXRlLGI9Zih5LHMpO2lmKGMuaGFzRWFnZXJTdGF0ZT0hMCxjLmVhZ2VyU3RhdGU9Yix0bihiLHkpKXt2YXIgTj1uLmludGVybGVhdmVkO049PT1udWxsPyhjLm5leHQ9YyxLaShuKSk6KGMubmV4dD1OLm5leHQsTi5uZXh0PWMpLG4uaW50ZXJsZWF2ZWQ9YztyZXR1cm59fWNhdGNoe31maW5hbGx5e31zPUp1KHQsbixjLGkpLHMhPT1udWxsJiYoYz1EdCgpLGFuKHMsdCxpLGMpLFNmKHMsbixpKSl9fWZ1bmN0aW9uIGtmKHQpe3ZhciBuPXQuYWx0ZXJuYXRlO3JldHVybiB0PT09aXR8fG4hPT1udWxsJiZuPT09aXR9ZnVuY3Rpb24gamYodCxuKXtRcz1yYT0hMDt2YXIgcz10LnBlbmRpbmc7cz09PW51bGw/bi5uZXh0PW46KG4ubmV4dD1zLm5leHQscy5uZXh0PW4pLHQucGVuZGluZz1ufWZ1bmN0aW9uIFNmKHQsbixzKXtpZigocyY0MTk0MjQwKSE9PTApe3ZhciBpPW4ubGFuZXM7aSY9dC5wZW5kaW5nTGFuZXMsc3w9aSxuLmxhbmVzPXMsaWkodCxzKX19dmFyIGFhPXtyZWFkQ29udGV4dDpYdCx1c2VDYWxsYmFjazpDdCx1c2VDb250ZXh0OkN0LHVzZUVmZmVjdDpDdCx1c2VJbXBlcmF0aXZlSGFuZGxlOkN0LHVzZUluc2VydGlvbkVmZmVjdDpDdCx1c2VMYXlvdXRFZmZlY3Q6Q3QsdXNlTWVtbzpDdCx1c2VSZWR1Y2VyOkN0LHVzZVJlZjpDdCx1c2VTdGF0ZTpDdCx1c2VEZWJ1Z1ZhbHVlOkN0LHVzZURlZmVycmVkVmFsdWU6Q3QsdXNlVHJhbnNpdGlvbjpDdCx1c2VNdXRhYmxlU291cmNlOkN0LHVzZVN5bmNFeHRlcm5hbFN0b3JlOkN0LHVzZUlkOkN0LHVuc3RhYmxlX2lzTmV3UmVjb25jaWxlcjohMX0sRmg9e3JlYWRDb250ZXh0Olh0LHVzZUNhbGxiYWNrOmZ1bmN0aW9uKHQsbil7cmV0dXJuIHZuKCkubWVtb2l6ZWRTdGF0ZT1bdCxuPT09dm9pZCAwP251bGw6bl0sdH0sdXNlQ29udGV4dDpYdCx1c2VFZmZlY3Q6cGYsdXNlSW1wZXJhdGl2ZUhhbmRsZTpmdW5jdGlvbih0LG4scyl7cmV0dXJuIHM9cyE9bnVsbD9zLmNvbmNhdChbdF0pOm51bGwsc2EoNDE5NDMwOCw0LGdmLmJpbmQobnVsbCxuLHQpLHMpfSx1c2VMYXlvdXRFZmZlY3Q6ZnVuY3Rpb24odCxuKXtyZXR1cm4gc2EoNDE5NDMwOCw0LHQsbil9LHVzZUluc2VydGlvbkVmZmVjdDpmdW5jdGlvbih0LG4pe3JldHVybiBzYSg0LDIsdCxuKX0sdXNlTWVtbzpmdW5jdGlvbih0LG4pe3ZhciBzPXZuKCk7cmV0dXJuIG49bj09PXZvaWQgMD9udWxsOm4sdD10KCkscy5tZW1vaXplZFN0YXRlPVt0LG5dLHR9LHVzZVJlZHVjZXI6ZnVuY3Rpb24odCxuLHMpe3ZhciBpPXZuKCk7cmV0dXJuIG49cyE9PXZvaWQgMD9zKG4pOm4saS5tZW1vaXplZFN0YXRlPWkuYmFzZVN0YXRlPW4sdD17cGVuZGluZzpudWxsLGludGVybGVhdmVkOm51bGwsbGFuZXM6MCxkaXNwYXRjaDpudWxsLGxhc3RSZW5kZXJlZFJlZHVjZXI6dCxsYXN0UmVuZGVyZWRTdGF0ZTpufSxpLnF1ZXVlPXQsdD10LmRpc3BhdGNoPUJoLmJpbmQobnVsbCxpdCx0KSxbaS5tZW1vaXplZFN0YXRlLHRdfSx1c2VSZWY6ZnVuY3Rpb24odCl7dmFyIG49dm4oKTtyZXR1cm4gdD17Y3VycmVudDp0fSxuLm1lbW9pemVkU3RhdGU9dH0sdXNlU3RhdGU6ZmYsdXNlRGVidWdWYWx1ZTpsbyx1c2VEZWZlcnJlZFZhbHVlOmZ1bmN0aW9uKHQpe3JldHVybiB2bigpLm1lbW9pemVkU3RhdGU9dH0sdXNlVHJhbnNpdGlvbjpmdW5jdGlvbigpe3ZhciB0PWZmKCExKSxuPXRbMF07cmV0dXJuIHQ9T2guYmluZChudWxsLHRbMV0pLHZuKCkubWVtb2l6ZWRTdGF0ZT10LFtuLHRdfSx1c2VNdXRhYmxlU291cmNlOmZ1bmN0aW9uKCl7fSx1c2VTeW5jRXh0ZXJuYWxTdG9yZTpmdW5jdGlvbih0LG4scyl7dmFyIGk9aXQsYz12bigpO2lmKHN0KXtpZihzPT09dm9pZCAwKXRocm93IEVycm9yKGEoNDA3KSk7cz1zKCl9ZWxzZXtpZihzPW4oKSx3dD09PW51bGwpdGhyb3cgRXJyb3IoYSgzNDkpKTsodnImMzApIT09MHx8bGYoaSxuLHMpfWMubWVtb2l6ZWRTdGF0ZT1zO3ZhciBmPXt2YWx1ZTpzLGdldFNuYXBzaG90Om59O3JldHVybiBjLnF1ZXVlPWYscGYob2YuYmluZChudWxsLGksZix0KSxbdF0pLGkuZmxhZ3N8PTIwNDgsZWwoOSxhZi5iaW5kKG51bGwsaSxmLHMsbiksdm9pZCAwLG51bGwpLHN9LHVzZUlkOmZ1bmN0aW9uKCl7dmFyIHQ9dm4oKSxuPXd0LmlkZW50aWZpZXJQcmVmaXg7aWYoc3Qpe3ZhciBzPVRuLGk9Q247cz0oaSZ+KDE8PDMyLWVuKGkpLTEpKS50b1N0cmluZygzMikrcyxuPSI6IituKyJSIitzLHM9SnMrKywwPHMmJihuKz0iSCIrcy50b1N0cmluZygzMikpLG4rPSI6In1lbHNlIHM9X2grKyxuPSI6IituKyJyIitzLnRvU3RyaW5nKDMyKSsiOiI7cmV0dXJuIHQubWVtb2l6ZWRTdGF0ZT1ufSx1bnN0YWJsZV9pc05ld1JlY29uY2lsZXI6ITF9LCRoPXtyZWFkQ29udGV4dDpYdCx1c2VDYWxsYmFjazp5Zix1c2VDb250ZXh0Olh0LHVzZUVmZmVjdDpzbyx1c2VJbXBlcmF0aXZlSGFuZGxlOnhmLHVzZUluc2VydGlvbkVmZmVjdDpoZix1c2VMYXlvdXRFZmZlY3Q6bWYsdXNlTWVtbzp2Zix1c2VSZWR1Y2VyOm5vLHVzZVJlZjpkZix1c2VTdGF0ZTpmdW5jdGlvbigpe3JldHVybiBubyhacyl9LHVzZURlYnVnVmFsdWU6bG8sdXNlRGVmZXJyZWRWYWx1ZTpmdW5jdGlvbih0KXt2YXIgbj1RdCgpO3JldHVybiB3ZihuLHh0Lm1lbW9pemVkU3RhdGUsdCl9LHVzZVRyYW5zaXRpb246ZnVuY3Rpb24oKXt2YXIgdD1ubyhacylbMF0sbj1RdCgpLm1lbW9pemVkU3RhdGU7cmV0dXJuW3Qsbl19LHVzZU11dGFibGVTb3VyY2U6cmYsdXNlU3luY0V4dGVybmFsU3RvcmU6c2YsdXNlSWQ6YmYsdW5zdGFibGVfaXNOZXdSZWNvbmNpbGVyOiExfSxXaD17cmVhZENvbnRleHQ6WHQsdXNlQ2FsbGJhY2s6eWYsdXNlQ29udGV4dDpYdCx1c2VFZmZlY3Q6c28sdXNlSW1wZXJhdGl2ZUhhbmRsZTp4Zix1c2VJbnNlcnRpb25FZmZlY3Q6aGYsdXNlTGF5b3V0RWZmZWN0Om1mLHVzZU1lbW86dmYsdXNlUmVkdWNlcjpybyx1c2VSZWY6ZGYsdXNlU3RhdGU6ZnVuY3Rpb24oKXtyZXR1cm4gcm8oWnMpfSx1c2VEZWJ1Z1ZhbHVlOmxvLHVzZURlZmVycmVkVmFsdWU6ZnVuY3Rpb24odCl7dmFyIG49UXQoKTtyZXR1cm4geHQ9PT1udWxsP24ubWVtb2l6ZWRTdGF0ZT10OndmKG4seHQubWVtb2l6ZWRTdGF0ZSx0KX0sdXNlVHJhbnNpdGlvbjpmdW5jdGlvbigpe3ZhciB0PXJvKFpzKVswXSxuPVF0KCkubWVtb2l6ZWRTdGF0ZTtyZXR1cm5bdCxuXX0sdXNlTXV0YWJsZVNvdXJjZTpyZix1c2VTeW5jRXh0ZXJuYWxTdG9yZTpzZix1c2VJZDpiZix1bnN0YWJsZV9pc05ld1JlY29uY2lsZXI6ITF9O2Z1bmN0aW9uIHJuKHQsbil7aWYodCYmdC5kZWZhdWx0UHJvcHMpe249Rih7fSxuKSx0PXQuZGVmYXVsdFByb3BzO2Zvcih2YXIgcyBpbiB0KW5bc109PT12b2lkIDAmJihuW3NdPXRbc10pO3JldHVybiBufXJldHVybiBufWZ1bmN0aW9uIGFvKHQsbixzLGkpe249dC5tZW1vaXplZFN0YXRlLHM9cyhpLG4pLHM9cz09bnVsbD9uOkYoe30sbixzKSx0Lm1lbW9pemVkU3RhdGU9cyx0LmxhbmVzPT09MCYmKHQudXBkYXRlUXVldWUuYmFzZVN0YXRlPXMpfXZhciBpYT17aXNNb3VudGVkOmZ1bmN0aW9uKHQpe3JldHVybih0PXQuX3JlYWN0SW50ZXJuYWxzKT9kcih0KT09PXQ6ITF9LGVucXVldWVTZXRTdGF0ZTpmdW5jdGlvbih0LG4scyl7dD10Ll9yZWFjdEludGVybmFsczt2YXIgaT1EdCgpLGM9ZXIodCksZj1FbihpLGMpO2YucGF5bG9hZD1uLHMhPW51bGwmJihmLmNhbGxiYWNrPXMpLG49WG4odCxmLGMpLG4hPT1udWxsJiYoYW4obix0LGMsaSksWmwobix0LGMpKX0sZW5xdWV1ZVJlcGxhY2VTdGF0ZTpmdW5jdGlvbih0LG4scyl7dD10Ll9yZWFjdEludGVybmFsczt2YXIgaT1EdCgpLGM9ZXIodCksZj1FbihpLGMpO2YudGFnPTEsZi5wYXlsb2FkPW4scyE9bnVsbCYmKGYuY2FsbGJhY2s9cyksbj1Ybih0LGYsYyksbiE9PW51bGwmJihhbihuLHQsYyxpKSxabChuLHQsYykpfSxlbnF1ZXVlRm9yY2VVcGRhdGU6ZnVuY3Rpb24odCxuKXt0PXQuX3JlYWN0SW50ZXJuYWxzO3ZhciBzPUR0KCksaT1lcih0KSxjPUVuKHMsaSk7Yy50YWc9MixuIT1udWxsJiYoYy5jYWxsYmFjaz1uKSxuPVhuKHQsYyxpKSxuIT09bnVsbCYmKGFuKG4sdCxpLHMpLFpsKG4sdCxpKSl9fTtmdW5jdGlvbiBOZih0LG4scyxpLGMsZix5KXtyZXR1cm4gdD10LnN0YXRlTm9kZSx0eXBlb2YgdC5zaG91bGRDb21wb25lbnRVcGRhdGU9PSJmdW5jdGlvbiI/dC5zaG91bGRDb21wb25lbnRVcGRhdGUoaSxmLHkpOm4ucHJvdG90eXBlJiZuLnByb3RvdHlwZS5pc1B1cmVSZWFjdENvbXBvbmVudD8hRnMocyxpKXx8IUZzKGMsZik6ITB9ZnVuY3Rpb24gTWYodCxuLHMpe3ZhciBpPSExLGM9Vm4sZj1uLmNvbnRleHRUeXBlO3JldHVybiB0eXBlb2YgZj09Im9iamVjdCImJmYhPT1udWxsP2Y9WHQoZik6KGM9T3Qobik/aHI6UnQuY3VycmVudCxpPW4uY29udGV4dFR5cGVzLGY9KGk9aSE9bnVsbCk/S3IodCxjKTpWbiksbj1uZXcgbihzLGYpLHQubWVtb2l6ZWRTdGF0ZT1uLnN0YXRlIT09bnVsbCYmbi5zdGF0ZSE9PXZvaWQgMD9uLnN0YXRlOm51bGwsbi51cGRhdGVyPWlhLHQuc3RhdGVOb2RlPW4sbi5fcmVhY3RJbnRlcm5hbHM9dCxpJiYodD10LnN0YXRlTm9kZSx0Ll9fcmVhY3RJbnRlcm5hbE1lbW9pemVkVW5tYXNrZWRDaGlsZENvbnRleHQ9Yyx0Ll9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWFza2VkQ2hpbGRDb250ZXh0PWYpLG59ZnVuY3Rpb24gUmYodCxuLHMsaSl7dD1uLnN0YXRlLHR5cGVvZiBuLmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM9PSJmdW5jdGlvbiImJm4uY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhzLGkpLHR5cGVvZiBuLlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzPT0iZnVuY3Rpb24iJiZuLlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHMsaSksbi5zdGF0ZSE9PXQmJmlhLmVucXVldWVSZXBsYWNlU3RhdGUobixuLnN0YXRlLG51bGwpfWZ1bmN0aW9uIGlvKHQsbixzLGkpe3ZhciBjPXQuc3RhdGVOb2RlO2MucHJvcHM9cyxjLnN0YXRlPXQubWVtb2l6ZWRTdGF0ZSxjLnJlZnM9e30sVmkodCk7dmFyIGY9bi5jb250ZXh0VHlwZTt0eXBlb2YgZj09Im9iamVjdCImJmYhPT1udWxsP2MuY29udGV4dD1YdChmKTooZj1PdChuKT9ocjpSdC5jdXJyZW50LGMuY29udGV4dD1Lcih0LGYpKSxjLnN0YXRlPXQubWVtb2l6ZWRTdGF0ZSxmPW4uZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzLHR5cGVvZiBmPT0iZnVuY3Rpb24iJiYoYW8odCxuLGYscyksYy5zdGF0ZT10Lm1lbW9pemVkU3RhdGUpLHR5cGVvZiBuLmdldERlcml2ZWRTdGF0ZUZyb21Qcm9wcz09ImZ1bmN0aW9uInx8dHlwZW9mIGMuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGU9PSJmdW5jdGlvbiJ8fHR5cGVvZiBjLlVOU0FGRV9jb21wb25lbnRXaWxsTW91bnQhPSJmdW5jdGlvbiImJnR5cGVvZiBjLmNvbXBvbmVudFdpbGxNb3VudCE9ImZ1bmN0aW9uInx8KG49Yy5zdGF0ZSx0eXBlb2YgYy5jb21wb25lbnRXaWxsTW91bnQ9PSJmdW5jdGlvbiImJmMuY29tcG9uZW50V2lsbE1vdW50KCksdHlwZW9mIGMuVU5TQUZFX2NvbXBvbmVudFdpbGxNb3VudD09ImZ1bmN0aW9uIiYmYy5VTlNBRkVfY29tcG9uZW50V2lsbE1vdW50KCksbiE9PWMuc3RhdGUmJmlhLmVucXVldWVSZXBsYWNlU3RhdGUoYyxjLnN0YXRlLG51bGwpLGVhKHQscyxjLGkpLGMuc3RhdGU9dC5tZW1vaXplZFN0YXRlKSx0eXBlb2YgYy5jb21wb25lbnREaWRNb3VudD09ImZ1bmN0aW9uIiYmKHQuZmxhZ3N8PTQxOTQzMDgpfWZ1bmN0aW9uIGVzKHQsbil7dHJ5e3ZhciBzPSIiLGk9bjtkbyBzKz1KKGkpLGk9aS5yZXR1cm47d2hpbGUoaSk7dmFyIGM9c31jYXRjaChmKXtjPWAKRXJyb3IgZ2VuZXJhdGluZyBzdGFjazogYCtmLm1lc3NhZ2UrYApgK2Yuc3RhY2t9cmV0dXJue3ZhbHVlOnQsc291cmNlOm4sc3RhY2s6YyxkaWdlc3Q6bnVsbH19ZnVuY3Rpb24gb28odCxuLHMpe3JldHVybnt2YWx1ZTp0LHNvdXJjZTpudWxsLHN0YWNrOnM/P251bGwsZGlnZXN0Om4/P251bGx9fWZ1bmN0aW9uIGNvKHQsbil7dHJ5e2NvbnNvbGUuZXJyb3Iobi52YWx1ZSl9Y2F0Y2gocyl7c2V0VGltZW91dChmdW5jdGlvbigpe3Rocm93IHN9KX19dmFyIEhoPXR5cGVvZiBXZWFrTWFwPT0iZnVuY3Rpb24iP1dlYWtNYXA6TWFwO2Z1bmN0aW9uIENmKHQsbixzKXtzPUVuKC0xLHMpLHMudGFnPTMscy5wYXlsb2FkPXtlbGVtZW50Om51bGx9O3ZhciBpPW4udmFsdWU7cmV0dXJuIHMuY2FsbGJhY2s9ZnVuY3Rpb24oKXtoYXx8KGhhPSEwLE5vPWkpLGNvKHQsbil9LHN9ZnVuY3Rpb24gVGYodCxuLHMpe3M9RW4oLTEscykscy50YWc9Mzt2YXIgaT10LnR5cGUuZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yO2lmKHR5cGVvZiBpPT0iZnVuY3Rpb24iKXt2YXIgYz1uLnZhbHVlO3MucGF5bG9hZD1mdW5jdGlvbigpe3JldHVybiBpKGMpfSxzLmNhbGxiYWNrPWZ1bmN0aW9uKCl7Y28odCxuKX19dmFyIGY9dC5zdGF0ZU5vZGU7cmV0dXJuIGYhPT1udWxsJiZ0eXBlb2YgZi5jb21wb25lbnREaWRDYXRjaD09ImZ1bmN0aW9uIiYmKHMuY2FsbGJhY2s9ZnVuY3Rpb24oKXtjbyh0LG4pLHR5cGVvZiBpIT0iZnVuY3Rpb24iJiYoSm49PT1udWxsP0puPW5ldyBTZXQoW3RoaXNdKTpKbi5hZGQodGhpcykpO3ZhciB5PW4uc3RhY2s7dGhpcy5jb21wb25lbnREaWRDYXRjaChuLnZhbHVlLHtjb21wb25lbnRTdGFjazp5IT09bnVsbD95OiIifSl9KSxzfWZ1bmN0aW9uIFBmKHQsbixzKXt2YXIgaT10LnBpbmdDYWNoZTtpZihpPT09bnVsbCl7aT10LnBpbmdDYWNoZT1uZXcgSGg7dmFyIGM9bmV3IFNldDtpLnNldChuLGMpfWVsc2UgYz1pLmdldChuKSxjPT09dm9pZCAwJiYoYz1uZXcgU2V0LGkuc2V0KG4sYykpO2MuaGFzKHMpfHwoYy5hZGQocyksdD1ybS5iaW5kKG51bGwsdCxuLHMpLG4udGhlbih0LHQpKX1mdW5jdGlvbiBFZih0KXtkb3t2YXIgbjtpZigobj10LnRhZz09PTEzKSYmKG49dC5tZW1vaXplZFN0YXRlLG49biE9PW51bGw/bi5kZWh5ZHJhdGVkIT09bnVsbDohMCksbilyZXR1cm4gdDt0PXQucmV0dXJufXdoaWxlKHQhPT1udWxsKTtyZXR1cm4gbnVsbH1mdW5jdGlvbiBMZih0LG4scyxpLGMpe3JldHVybih0Lm1vZGUmMSk9PT0wPyh0PT09bj90LmZsYWdzfD02NTUzNjoodC5mbGFnc3w9MTI4LHMuZmxhZ3N8PTEzMTA3MixzLmZsYWdzJj0tNTI4MDUscy50YWc9PT0xJiYocy5hbHRlcm5hdGU9PT1udWxsP3MudGFnPTE3OihuPUVuKC0xLDEpLG4udGFnPTIsWG4ocyxuLDEpKSkscy5sYW5lc3w9MSksdCk6KHQuZmxhZ3N8PTY1NTM2LHQubGFuZXM9Yyx0KX12YXIgVWg9b2UuUmVhY3RDdXJyZW50T3duZXIsQnQ9ITE7ZnVuY3Rpb24gQXQodCxuLHMsaSl7bi5jaGlsZD10PT09bnVsbD9RdShuLG51bGwscyxpKTpYcihuLHQuY2hpbGQscyxpKX1mdW5jdGlvbiBBZih0LG4scyxpLGMpe3M9cy5yZW5kZXI7dmFyIGY9bi5yZWY7cmV0dXJuIEpyKG4sYyksaT1lbyh0LG4scyxpLGYsYykscz10bygpLHQhPT1udWxsJiYhQnQ/KG4udXBkYXRlUXVldWU9dC51cGRhdGVRdWV1ZSxuLmZsYWdzJj0tMjA1Myx0LmxhbmVzJj1+YyxMbih0LG4sYykpOihzdCYmcyYmT2kobiksbi5mbGFnc3w9MSxBdCh0LG4saSxjKSxuLmNoaWxkKX1mdW5jdGlvbiBEZih0LG4scyxpLGMpe2lmKHQ9PT1udWxsKXt2YXIgZj1zLnR5cGU7cmV0dXJuIHR5cGVvZiBmPT0iZnVuY3Rpb24iJiYhTG8oZikmJmYuZGVmYXVsdFByb3BzPT09dm9pZCAwJiZzLmNvbXBhcmU9PT1udWxsJiZzLmRlZmF1bHRQcm9wcz09PXZvaWQgMD8obi50YWc9MTUsbi50eXBlPWYsSWYodCxuLGYsaSxjKSk6KHQ9d2Eocy50eXBlLG51bGwsaSxuLG4ubW9kZSxjKSx0LnJlZj1uLnJlZix0LnJldHVybj1uLG4uY2hpbGQ9dCl9aWYoZj10LmNoaWxkLCh0LmxhbmVzJmMpPT09MCl7dmFyIHk9Zi5tZW1vaXplZFByb3BzO2lmKHM9cy5jb21wYXJlLHM9cyE9PW51bGw/czpGcyxzKHksaSkmJnQucmVmPT09bi5yZWYpcmV0dXJuIExuKHQsbixjKX1yZXR1cm4gbi5mbGFnc3w9MSx0PW5yKGYsaSksdC5yZWY9bi5yZWYsdC5yZXR1cm49bixuLmNoaWxkPXR9ZnVuY3Rpb24gSWYodCxuLHMsaSxjKXtpZih0IT09bnVsbCl7dmFyIGY9dC5tZW1vaXplZFByb3BzO2lmKEZzKGYsaSkmJnQucmVmPT09bi5yZWYpaWYoQnQ9ITEsbi5wZW5kaW5nUHJvcHM9aT1mLCh0LmxhbmVzJmMpIT09MCkodC5mbGFncyYxMzEwNzIpIT09MCYmKEJ0PSEwKTtlbHNlIHJldHVybiBuLmxhbmVzPXQubGFuZXMsTG4odCxuLGMpfXJldHVybiB1byh0LG4scyxpLGMpfWZ1bmN0aW9uIF9mKHQsbixzKXt2YXIgaT1uLnBlbmRpbmdQcm9wcyxjPWkuY2hpbGRyZW4sZj10IT09bnVsbD90Lm1lbW9pemVkU3RhdGU6bnVsbDtpZihpLm1vZGU9PT0iaGlkZGVuIilpZigobi5tb2RlJjEpPT09MCluLm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczowLGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LGV0KG5zLFZ0KSxWdHw9cztlbHNle2lmKChzJjEwNzM3NDE4MjQpPT09MClyZXR1cm4gdD1mIT09bnVsbD9mLmJhc2VMYW5lc3xzOnMsbi5sYW5lcz1uLmNoaWxkTGFuZXM9MTA3Mzc0MTgyNCxuLm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczp0LGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LG4udXBkYXRlUXVldWU9bnVsbCxldChucyxWdCksVnR8PXQsbnVsbDtuLm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczowLGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LGk9ZiE9PW51bGw/Zi5iYXNlTGFuZXM6cyxldChucyxWdCksVnR8PWl9ZWxzZSBmIT09bnVsbD8oaT1mLmJhc2VMYW5lc3xzLG4ubWVtb2l6ZWRTdGF0ZT1udWxsKTppPXMsZXQobnMsVnQpLFZ0fD1pO3JldHVybiBBdCh0LG4sYyxzKSxuLmNoaWxkfWZ1bmN0aW9uIE9mKHQsbil7dmFyIHM9bi5yZWY7KHQ9PT1udWxsJiZzIT09bnVsbHx8dCE9PW51bGwmJnQucmVmIT09cykmJihuLmZsYWdzfD01MTIsbi5mbGFnc3w9MjA5NzE1Mil9ZnVuY3Rpb24gdW8odCxuLHMsaSxjKXt2YXIgZj1PdChzKT9ocjpSdC5jdXJyZW50O3JldHVybiBmPUtyKG4sZiksSnIobixjKSxzPWVvKHQsbixzLGksZixjKSxpPXRvKCksdCE9PW51bGwmJiFCdD8obi51cGRhdGVRdWV1ZT10LnVwZGF0ZVF1ZXVlLG4uZmxhZ3MmPS0yMDUzLHQubGFuZXMmPX5jLExuKHQsbixjKSk6KHN0JiZpJiZPaShuKSxuLmZsYWdzfD0xLEF0KHQsbixzLGMpLG4uY2hpbGQpfWZ1bmN0aW9uIEJmKHQsbixzLGksYyl7aWYoT3Qocykpe3ZhciBmPSEwO0dsKG4pfWVsc2UgZj0hMTtpZihKcihuLGMpLG4uc3RhdGVOb2RlPT09bnVsbCljYSh0LG4pLE1mKG4scyxpKSxpbyhuLHMsaSxjKSxpPSEwO2Vsc2UgaWYodD09PW51bGwpe3ZhciB5PW4uc3RhdGVOb2RlLGI9bi5tZW1vaXplZFByb3BzO3kucHJvcHM9Yjt2YXIgTj15LmNvbnRleHQsQj1zLmNvbnRleHRUeXBlO3R5cGVvZiBCPT0ib2JqZWN0IiYmQiE9PW51bGw/Qj1YdChCKTooQj1PdChzKT9ocjpSdC5jdXJyZW50LEI9S3IobixCKSk7dmFyIGxlPXMuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzLGNlPXR5cGVvZiBsZT09ImZ1bmN0aW9uInx8dHlwZW9mIHkuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGU9PSJmdW5jdGlvbiI7Y2V8fHR5cGVvZiB5LlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzIT0iZnVuY3Rpb24iJiZ0eXBlb2YgeS5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzIT0iZnVuY3Rpb24ifHwoYiE9PWl8fE4hPT1CKSYmUmYobix5LGksQiksWW49ITE7dmFyIHJlPW4ubWVtb2l6ZWRTdGF0ZTt5LnN0YXRlPXJlLGVhKG4saSx5LGMpLE49bi5tZW1vaXplZFN0YXRlLGIhPT1pfHxyZSE9PU58fF90LmN1cnJlbnR8fFluPyh0eXBlb2YgbGU9PSJmdW5jdGlvbiImJihhbyhuLHMsbGUsaSksTj1uLm1lbW9pemVkU3RhdGUpLChiPVlufHxOZihuLHMsYixpLHJlLE4sQikpPyhjZXx8dHlwZW9mIHkuVU5TQUZFX2NvbXBvbmVudFdpbGxNb3VudCE9ImZ1bmN0aW9uIiYmdHlwZW9mIHkuY29tcG9uZW50V2lsbE1vdW50IT0iZnVuY3Rpb24ifHwodHlwZW9mIHkuY29tcG9uZW50V2lsbE1vdW50PT0iZnVuY3Rpb24iJiZ5LmNvbXBvbmVudFdpbGxNb3VudCgpLHR5cGVvZiB5LlVOU0FGRV9jb21wb25lbnRXaWxsTW91bnQ9PSJmdW5jdGlvbiImJnkuVU5TQUZFX2NvbXBvbmVudFdpbGxNb3VudCgpKSx0eXBlb2YgeS5jb21wb25lbnREaWRNb3VudD09ImZ1bmN0aW9uIiYmKG4uZmxhZ3N8PTQxOTQzMDgpKToodHlwZW9mIHkuY29tcG9uZW50RGlkTW91bnQ9PSJmdW5jdGlvbiImJihuLmZsYWdzfD00MTk0MzA4KSxuLm1lbW9pemVkUHJvcHM9aSxuLm1lbW9pemVkU3RhdGU9TikseS5wcm9wcz1pLHkuc3RhdGU9Tix5LmNvbnRleHQ9QixpPWIpOih0eXBlb2YgeS5jb21wb25lbnREaWRNb3VudD09ImZ1bmN0aW9uIiYmKG4uZmxhZ3N8PTQxOTQzMDgpLGk9ITEpfWVsc2V7eT1uLnN0YXRlTm9kZSxadSh0LG4pLGI9bi5tZW1vaXplZFByb3BzLEI9bi50eXBlPT09bi5lbGVtZW50VHlwZT9iOnJuKG4udHlwZSxiKSx5LnByb3BzPUIsY2U9bi5wZW5kaW5nUHJvcHMscmU9eS5jb250ZXh0LE49cy5jb250ZXh0VHlwZSx0eXBlb2YgTj09Im9iamVjdCImJk4hPT1udWxsP049WHQoTik6KE49T3Qocyk/aHI6UnQuY3VycmVudCxOPUtyKG4sTikpO3ZhciBOZT1zLmdldERlcml2ZWRTdGF0ZUZyb21Qcm9wczsobGU9dHlwZW9mIE5lPT0iZnVuY3Rpb24ifHx0eXBlb2YgeS5nZXRTbmFwc2hvdEJlZm9yZVVwZGF0ZT09ImZ1bmN0aW9uIil8fHR5cGVvZiB5LlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzIT0iZnVuY3Rpb24iJiZ0eXBlb2YgeS5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzIT0iZnVuY3Rpb24ifHwoYiE9PWNlfHxyZSE9PU4pJiZSZihuLHksaSxOKSxZbj0hMSxyZT1uLm1lbW9pemVkU3RhdGUseS5zdGF0ZT1yZSxlYShuLGkseSxjKTt2YXIgUmU9bi5tZW1vaXplZFN0YXRlO2IhPT1jZXx8cmUhPT1SZXx8X3QuY3VycmVudHx8WW4/KHR5cGVvZiBOZT09ImZ1bmN0aW9uIiYmKGFvKG4scyxOZSxpKSxSZT1uLm1lbW9pemVkU3RhdGUpLChCPVlufHxOZihuLHMsQixpLHJlLFJlLE4pfHwhMSk/KGxlfHx0eXBlb2YgeS5VTlNBRkVfY29tcG9uZW50V2lsbFVwZGF0ZSE9ImZ1bmN0aW9uIiYmdHlwZW9mIHkuY29tcG9uZW50V2lsbFVwZGF0ZSE9ImZ1bmN0aW9uInx8KHR5cGVvZiB5LmNvbXBvbmVudFdpbGxVcGRhdGU9PSJmdW5jdGlvbiImJnkuY29tcG9uZW50V2lsbFVwZGF0ZShpLFJlLE4pLHR5cGVvZiB5LlVOU0FGRV9jb21wb25lbnRXaWxsVXBkYXRlPT0iZnVuY3Rpb24iJiZ5LlVOU0FGRV9jb21wb25lbnRXaWxsVXBkYXRlKGksUmUsTikpLHR5cGVvZiB5LmNvbXBvbmVudERpZFVwZGF0ZT09ImZ1bmN0aW9uIiYmKG4uZmxhZ3N8PTQpLHR5cGVvZiB5LmdldFNuYXBzaG90QmVmb3JlVXBkYXRlPT0iZnVuY3Rpb24iJiYobi5mbGFnc3w9MTAyNCkpOih0eXBlb2YgeS5jb21wb25lbnREaWRVcGRhdGUhPSJmdW5jdGlvbiJ8fGI9PT10Lm1lbW9pemVkUHJvcHMmJnJlPT09dC5tZW1vaXplZFN0YXRlfHwobi5mbGFnc3w9NCksdHlwZW9mIHkuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUhPSJmdW5jdGlvbiJ8fGI9PT10Lm1lbW9pemVkUHJvcHMmJnJlPT09dC5tZW1vaXplZFN0YXRlfHwobi5mbGFnc3w9MTAyNCksbi5tZW1vaXplZFByb3BzPWksbi5tZW1vaXplZFN0YXRlPVJlKSx5LnByb3BzPWkseS5zdGF0ZT1SZSx5LmNvbnRleHQ9TixpPUIpOih0eXBlb2YgeS5jb21wb25lbnREaWRVcGRhdGUhPSJmdW5jdGlvbiJ8fGI9PT10Lm1lbW9pemVkUHJvcHMmJnJlPT09dC5tZW1vaXplZFN0YXRlfHwobi5mbGFnc3w9NCksdHlwZW9mIHkuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUhPSJmdW5jdGlvbiJ8fGI9PT10Lm1lbW9pemVkUHJvcHMmJnJlPT09dC5tZW1vaXplZFN0YXRlfHwobi5mbGFnc3w9MTAyNCksaT0hMSl9cmV0dXJuIGZvKHQsbixzLGksZixjKX1mdW5jdGlvbiBmbyh0LG4scyxpLGMsZil7T2YodCxuKTt2YXIgeT0obi5mbGFncyYxMjgpIT09MDtpZighaSYmIXkpcmV0dXJuIGMmJld1KG4scywhMSksTG4odCxuLGYpO2k9bi5zdGF0ZU5vZGUsVWguY3VycmVudD1uO3ZhciBiPXkmJnR5cGVvZiBzLmdldERlcml2ZWRTdGF0ZUZyb21FcnJvciE9ImZ1bmN0aW9uIj9udWxsOmkucmVuZGVyKCk7cmV0dXJuIG4uZmxhZ3N8PTEsdCE9PW51bGwmJnk/KG4uY2hpbGQ9WHIobix0LmNoaWxkLG51bGwsZiksbi5jaGlsZD1YcihuLG51bGwsYixmKSk6QXQodCxuLGIsZiksbi5tZW1vaXplZFN0YXRlPWkuc3RhdGUsYyYmV3UobixzLCEwKSxuLmNoaWxkfWZ1bmN0aW9uIHpmKHQpe3ZhciBuPXQuc3RhdGVOb2RlO24ucGVuZGluZ0NvbnRleHQ/RnUodCxuLnBlbmRpbmdDb250ZXh0LG4ucGVuZGluZ0NvbnRleHQhPT1uLmNvbnRleHQpOm4uY29udGV4dCYmRnUodCxuLmNvbnRleHQsITEpLHFpKHQsbi5jb250YWluZXJJbmZvKX1mdW5jdGlvbiBGZih0LG4scyxpLGMpe3JldHVybiBZcigpLCRpKGMpLG4uZmxhZ3N8PTI1NixBdCh0LG4scyxpKSxuLmNoaWxkfXZhciBwbz17ZGVoeWRyYXRlZDpudWxsLHRyZWVDb250ZXh0Om51bGwscmV0cnlMYW5lOjB9O2Z1bmN0aW9uIGhvKHQpe3JldHVybntiYXNlTGFuZXM6dCxjYWNoZVBvb2w6bnVsbCx0cmFuc2l0aW9uczpudWxsfX1mdW5jdGlvbiAkZih0LG4scyl7dmFyIGk9bi5wZW5kaW5nUHJvcHMsYz1hdC5jdXJyZW50LGY9ITEseT0obi5mbGFncyYxMjgpIT09MCxiO2lmKChiPXkpfHwoYj10IT09bnVsbCYmdC5tZW1vaXplZFN0YXRlPT09bnVsbD8hMTooYyYyKSE9PTApLGI/KGY9ITAsbi5mbGFncyY9LTEyOSk6KHQ9PT1udWxsfHx0Lm1lbW9pemVkU3RhdGUhPT1udWxsKSYmKGN8PTEpLGV0KGF0LGMmMSksdD09PW51bGwpcmV0dXJuIEZpKG4pLHQ9bi5tZW1vaXplZFN0YXRlLHQhPT1udWxsJiYodD10LmRlaHlkcmF0ZWQsdCE9PW51bGwpPygobi5tb2RlJjEpPT09MD9uLmxhbmVzPTE6dC5kYXRhPT09IiQhIj9uLmxhbmVzPTg6bi5sYW5lcz0xMDczNzQxODI0LG51bGwpOih5PWkuY2hpbGRyZW4sdD1pLmZhbGxiYWNrLGY/KGk9bi5tb2RlLGY9bi5jaGlsZCx5PXttb2RlOiJoaWRkZW4iLGNoaWxkcmVuOnl9LChpJjEpPT09MCYmZiE9PW51bGw/KGYuY2hpbGRMYW5lcz0wLGYucGVuZGluZ1Byb3BzPXkpOmY9YmEoeSxpLDAsbnVsbCksdD1Tcih0LGkscyxudWxsKSxmLnJldHVybj1uLHQucmV0dXJuPW4sZi5zaWJsaW5nPXQsbi5jaGlsZD1mLG4uY2hpbGQubWVtb2l6ZWRTdGF0ZT1obyhzKSxuLm1lbW9pemVkU3RhdGU9cG8sdCk6bW8obix5KSk7aWYoYz10Lm1lbW9pemVkU3RhdGUsYyE9PW51bGwmJihiPWMuZGVoeWRyYXRlZCxiIT09bnVsbCkpcmV0dXJuIEdoKHQsbix5LGksYixjLHMpO2lmKGYpe2Y9aS5mYWxsYmFjayx5PW4ubW9kZSxjPXQuY2hpbGQsYj1jLnNpYmxpbmc7dmFyIE49e21vZGU6ImhpZGRlbiIsY2hpbGRyZW46aS5jaGlsZHJlbn07cmV0dXJuKHkmMSk9PT0wJiZuLmNoaWxkIT09Yz8oaT1uLmNoaWxkLGkuY2hpbGRMYW5lcz0wLGkucGVuZGluZ1Byb3BzPU4sbi5kZWxldGlvbnM9bnVsbCk6KGk9bnIoYyxOKSxpLnN1YnRyZWVGbGFncz1jLnN1YnRyZWVGbGFncyYxNDY4MDA2NCksYiE9PW51bGw/Zj1ucihiLGYpOihmPVNyKGYseSxzLG51bGwpLGYuZmxhZ3N8PTIpLGYucmV0dXJuPW4saS5yZXR1cm49bixpLnNpYmxpbmc9ZixuLmNoaWxkPWksaT1mLGY9bi5jaGlsZCx5PXQuY2hpbGQubWVtb2l6ZWRTdGF0ZSx5PXk9PT1udWxsP2hvKHMpOntiYXNlTGFuZXM6eS5iYXNlTGFuZXN8cyxjYWNoZVBvb2w6bnVsbCx0cmFuc2l0aW9uczp5LnRyYW5zaXRpb25zfSxmLm1lbW9pemVkU3RhdGU9eSxmLmNoaWxkTGFuZXM9dC5jaGlsZExhbmVzJn5zLG4ubWVtb2l6ZWRTdGF0ZT1wbyxpfXJldHVybiBmPXQuY2hpbGQsdD1mLnNpYmxpbmcsaT1ucihmLHttb2RlOiJ2aXNpYmxlIixjaGlsZHJlbjppLmNoaWxkcmVufSksKG4ubW9kZSYxKT09PTAmJihpLmxhbmVzPXMpLGkucmV0dXJuPW4saS5zaWJsaW5nPW51bGwsdCE9PW51bGwmJihzPW4uZGVsZXRpb25zLHM9PT1udWxsPyhuLmRlbGV0aW9ucz1bdF0sbi5mbGFnc3w9MTYpOnMucHVzaCh0KSksbi5jaGlsZD1pLG4ubWVtb2l6ZWRTdGF0ZT1udWxsLGl9ZnVuY3Rpb24gbW8odCxuKXtyZXR1cm4gbj1iYSh7bW9kZToidmlzaWJsZSIsY2hpbGRyZW46bn0sdC5tb2RlLDAsbnVsbCksbi5yZXR1cm49dCx0LmNoaWxkPW59ZnVuY3Rpb24gb2EodCxuLHMsaSl7cmV0dXJuIGkhPT1udWxsJiYkaShpKSxYcihuLHQuY2hpbGQsbnVsbCxzKSx0PW1vKG4sbi5wZW5kaW5nUHJvcHMuY2hpbGRyZW4pLHQuZmxhZ3N8PTIsbi5tZW1vaXplZFN0YXRlPW51bGwsdH1mdW5jdGlvbiBHaCh0LG4scyxpLGMsZix5KXtpZihzKXJldHVybiBuLmZsYWdzJjI1Nj8obi5mbGFncyY9LTI1NyxpPW9vKEVycm9yKGEoNDIyKSkpLG9hKHQsbix5LGkpKTpuLm1lbW9pemVkU3RhdGUhPT1udWxsPyhuLmNoaWxkPXQuY2hpbGQsbi5mbGFnc3w9MTI4LG51bGwpOihmPWkuZmFsbGJhY2ssYz1uLm1vZGUsaT1iYSh7bW9kZToidmlzaWJsZSIsY2hpbGRyZW46aS5jaGlsZHJlbn0sYywwLG51bGwpLGY9U3IoZixjLHksbnVsbCksZi5mbGFnc3w9MixpLnJldHVybj1uLGYucmV0dXJuPW4saS5zaWJsaW5nPWYsbi5jaGlsZD1pLChuLm1vZGUmMSkhPT0wJiZYcihuLHQuY2hpbGQsbnVsbCx5KSxuLmNoaWxkLm1lbW9pemVkU3RhdGU9aG8oeSksbi5tZW1vaXplZFN0YXRlPXBvLGYpO2lmKChuLm1vZGUmMSk9PT0wKXJldHVybiBvYSh0LG4seSxudWxsKTtpZihjLmRhdGE9PT0iJCEiKXtpZihpPWMubmV4dFNpYmxpbmcmJmMubmV4dFNpYmxpbmcuZGF0YXNldCxpKXZhciBiPWkuZGdzdDtyZXR1cm4gaT1iLGY9RXJyb3IoYSg0MTkpKSxpPW9vKGYsaSx2b2lkIDApLG9hKHQsbix5LGkpfWlmKGI9KHkmdC5jaGlsZExhbmVzKSE9PTAsQnR8fGIpe2lmKGk9d3QsaSE9PW51bGwpe3N3aXRjaCh5Ji15KXtjYXNlIDQ6Yz0yO2JyZWFrO2Nhc2UgMTY6Yz04O2JyZWFrO2Nhc2UgNjQ6Y2FzZSAxMjg6Y2FzZSAyNTY6Y2FzZSA1MTI6Y2FzZSAxMDI0OmNhc2UgMjA0ODpjYXNlIDQwOTY6Y2FzZSA4MTkyOmNhc2UgMTYzODQ6Y2FzZSAzMjc2ODpjYXNlIDY1NTM2OmNhc2UgMTMxMDcyOmNhc2UgMjYyMTQ0OmNhc2UgNTI0Mjg4OmNhc2UgMTA0ODU3NjpjYXNlIDIwOTcxNTI6Y2FzZSA0MTk0MzA0OmNhc2UgODM4ODYwODpjYXNlIDE2Nzc3MjE2OmNhc2UgMzM1NTQ0MzI6Y2FzZSA2NzEwODg2NDpjPTMyO2JyZWFrO2Nhc2UgNTM2ODcwOTEyOmM9MjY4NDM1NDU2O2JyZWFrO2RlZmF1bHQ6Yz0wfWM9KGMmKGkuc3VzcGVuZGVkTGFuZXN8eSkpIT09MD8wOmMsYyE9PTAmJmMhPT1mLnJldHJ5TGFuZSYmKGYucmV0cnlMYW5lPWMsUG4odCxjKSxhbihpLHQsYywtMSkpfXJldHVybiBFbygpLGk9b28oRXJyb3IoYSg0MjEpKSksb2EodCxuLHksaSl9cmV0dXJuIGMuZGF0YT09PSIkPyI/KG4uZmxhZ3N8PTEyOCxuLmNoaWxkPXQuY2hpbGQsbj1zbS5iaW5kKG51bGwsdCksYy5fcmVhY3RSZXRyeT1uLG51bGwpOih0PWYudHJlZUNvbnRleHQsS3Q9R24oYy5uZXh0U2libGluZyksR3Q9bixzdD0hMCxubj1udWxsLHQhPT1udWxsJiYocXRbWXQrK109Q24scXRbWXQrK109VG4scXRbWXQrK109bXIsQ249dC5pZCxUbj10Lm92ZXJmbG93LG1yPW4pLG49bW8obixpLmNoaWxkcmVuKSxuLmZsYWdzfD00MDk2LG4pfWZ1bmN0aW9uIFdmKHQsbixzKXt0LmxhbmVzfD1uO3ZhciBpPXQuYWx0ZXJuYXRlO2khPT1udWxsJiYoaS5sYW5lc3w9biksR2kodC5yZXR1cm4sbixzKX1mdW5jdGlvbiBnbyh0LG4scyxpLGMpe3ZhciBmPXQubWVtb2l6ZWRTdGF0ZTtmPT09bnVsbD90Lm1lbW9pemVkU3RhdGU9e2lzQmFja3dhcmRzOm4scmVuZGVyaW5nOm51bGwscmVuZGVyaW5nU3RhcnRUaW1lOjAsbGFzdDppLHRhaWw6cyx0YWlsTW9kZTpjfTooZi5pc0JhY2t3YXJkcz1uLGYucmVuZGVyaW5nPW51bGwsZi5yZW5kZXJpbmdTdGFydFRpbWU9MCxmLmxhc3Q9aSxmLnRhaWw9cyxmLnRhaWxNb2RlPWMpfWZ1bmN0aW9uIEhmKHQsbixzKXt2YXIgaT1uLnBlbmRpbmdQcm9wcyxjPWkucmV2ZWFsT3JkZXIsZj1pLnRhaWw7aWYoQXQodCxuLGkuY2hpbGRyZW4scyksaT1hdC5jdXJyZW50LChpJjIpIT09MClpPWkmMXwyLG4uZmxhZ3N8PTEyODtlbHNle2lmKHQhPT1udWxsJiYodC5mbGFncyYxMjgpIT09MCllOmZvcih0PW4uY2hpbGQ7dCE9PW51bGw7KXtpZih0LnRhZz09PTEzKXQubWVtb2l6ZWRTdGF0ZSE9PW51bGwmJldmKHQscyxuKTtlbHNlIGlmKHQudGFnPT09MTkpV2YodCxzLG4pO2Vsc2UgaWYodC5jaGlsZCE9PW51bGwpe3QuY2hpbGQucmV0dXJuPXQsdD10LmNoaWxkO2NvbnRpbnVlfWlmKHQ9PT1uKWJyZWFrIGU7Zm9yKDt0LnNpYmxpbmc9PT1udWxsOyl7aWYodC5yZXR1cm49PT1udWxsfHx0LnJldHVybj09PW4pYnJlYWsgZTt0PXQucmV0dXJufXQuc2libGluZy5yZXR1cm49dC5yZXR1cm4sdD10LnNpYmxpbmd9aSY9MX1pZihldChhdCxpKSwobi5tb2RlJjEpPT09MCluLm1lbW9pemVkU3RhdGU9bnVsbDtlbHNlIHN3aXRjaChjKXtjYXNlImZvcndhcmRzIjpmb3Iocz1uLmNoaWxkLGM9bnVsbDtzIT09bnVsbDspdD1zLmFsdGVybmF0ZSx0IT09bnVsbCYmdGEodCk9PT1udWxsJiYoYz1zKSxzPXMuc2libGluZztzPWMscz09PW51bGw/KGM9bi5jaGlsZCxuLmNoaWxkPW51bGwpOihjPXMuc2libGluZyxzLnNpYmxpbmc9bnVsbCksZ28obiwhMSxjLHMsZik7YnJlYWs7Y2FzZSJiYWNrd2FyZHMiOmZvcihzPW51bGwsYz1uLmNoaWxkLG4uY2hpbGQ9bnVsbDtjIT09bnVsbDspe2lmKHQ9Yy5hbHRlcm5hdGUsdCE9PW51bGwmJnRhKHQpPT09bnVsbCl7bi5jaGlsZD1jO2JyZWFrfXQ9Yy5zaWJsaW5nLGMuc2libGluZz1zLHM9YyxjPXR9Z28obiwhMCxzLG51bGwsZik7YnJlYWs7Y2FzZSJ0b2dldGhlciI6Z28obiwhMSxudWxsLG51bGwsdm9pZCAwKTticmVhaztkZWZhdWx0Om4ubWVtb2l6ZWRTdGF0ZT1udWxsfXJldHVybiBuLmNoaWxkfWZ1bmN0aW9uIGNhKHQsbil7KG4ubW9kZSYxKT09PTAmJnQhPT1udWxsJiYodC5hbHRlcm5hdGU9bnVsbCxuLmFsdGVybmF0ZT1udWxsLG4uZmxhZ3N8PTIpfWZ1bmN0aW9uIExuKHQsbixzKXtpZih0IT09bnVsbCYmKG4uZGVwZW5kZW5jaWVzPXQuZGVwZW5kZW5jaWVzKSx3cnw9bi5sYW5lcywocyZuLmNoaWxkTGFuZXMpPT09MClyZXR1cm4gbnVsbDtpZih0IT09bnVsbCYmbi5jaGlsZCE9PXQuY2hpbGQpdGhyb3cgRXJyb3IoYSgxNTMpKTtpZihuLmNoaWxkIT09bnVsbCl7Zm9yKHQ9bi5jaGlsZCxzPW5yKHQsdC5wZW5kaW5nUHJvcHMpLG4uY2hpbGQ9cyxzLnJldHVybj1uO3Quc2libGluZyE9PW51bGw7KXQ9dC5zaWJsaW5nLHM9cy5zaWJsaW5nPW5yKHQsdC5wZW5kaW5nUHJvcHMpLHMucmV0dXJuPW47cy5zaWJsaW5nPW51bGx9cmV0dXJuIG4uY2hpbGR9ZnVuY3Rpb24gS2godCxuLHMpe3N3aXRjaChuLnRhZyl7Y2FzZSAzOnpmKG4pLFlyKCk7YnJlYWs7Y2FzZSA1Om5mKG4pO2JyZWFrO2Nhc2UgMTpPdChuLnR5cGUpJiZHbChuKTticmVhaztjYXNlIDQ6cWkobixuLnN0YXRlTm9kZS5jb250YWluZXJJbmZvKTticmVhaztjYXNlIDEwOnZhciBpPW4udHlwZS5fY29udGV4dCxjPW4ubWVtb2l6ZWRQcm9wcy52YWx1ZTtldChRbCxpLl9jdXJyZW50VmFsdWUpLGkuX2N1cnJlbnRWYWx1ZT1jO2JyZWFrO2Nhc2UgMTM6aWYoaT1uLm1lbW9pemVkU3RhdGUsaSE9PW51bGwpcmV0dXJuIGkuZGVoeWRyYXRlZCE9PW51bGw/KGV0KGF0LGF0LmN1cnJlbnQmMSksbi5mbGFnc3w9MTI4LG51bGwpOihzJm4uY2hpbGQuY2hpbGRMYW5lcykhPT0wPyRmKHQsbixzKTooZXQoYXQsYXQuY3VycmVudCYxKSx0PUxuKHQsbixzKSx0IT09bnVsbD90LnNpYmxpbmc6bnVsbCk7ZXQoYXQsYXQuY3VycmVudCYxKTticmVhaztjYXNlIDE5OmlmKGk9KHMmbi5jaGlsZExhbmVzKSE9PTAsKHQuZmxhZ3MmMTI4KSE9PTApe2lmKGkpcmV0dXJuIEhmKHQsbixzKTtuLmZsYWdzfD0xMjh9aWYoYz1uLm1lbW9pemVkU3RhdGUsYyE9PW51bGwmJihjLnJlbmRlcmluZz1udWxsLGMudGFpbD1udWxsLGMubGFzdEVmZmVjdD1udWxsKSxldChhdCxhdC5jdXJyZW50KSxpKWJyZWFrO3JldHVybiBudWxsO2Nhc2UgMjI6Y2FzZSAyMzpyZXR1cm4gbi5sYW5lcz0wLF9mKHQsbixzKX1yZXR1cm4gTG4odCxuLHMpfXZhciBVZix4byxHZixLZjtVZj1mdW5jdGlvbih0LG4pe2Zvcih2YXIgcz1uLmNoaWxkO3MhPT1udWxsOyl7aWYocy50YWc9PT01fHxzLnRhZz09PTYpdC5hcHBlbmRDaGlsZChzLnN0YXRlTm9kZSk7ZWxzZSBpZihzLnRhZyE9PTQmJnMuY2hpbGQhPT1udWxsKXtzLmNoaWxkLnJldHVybj1zLHM9cy5jaGlsZDtjb250aW51ZX1pZihzPT09bilicmVhaztmb3IoO3Muc2libGluZz09PW51bGw7KXtpZihzLnJldHVybj09PW51bGx8fHMucmV0dXJuPT09bilyZXR1cm47cz1zLnJldHVybn1zLnNpYmxpbmcucmV0dXJuPXMucmV0dXJuLHM9cy5zaWJsaW5nfX0seG89ZnVuY3Rpb24oKXt9LEdmPWZ1bmN0aW9uKHQsbixzLGkpe3ZhciBjPXQubWVtb2l6ZWRQcm9wcztpZihjIT09aSl7dD1uLnN0YXRlTm9kZSx5cih5bi5jdXJyZW50KTt2YXIgZj1udWxsO3N3aXRjaChzKXtjYXNlImlucHV0IjpjPVAodCxjKSxpPVAodCxpKSxmPVtdO2JyZWFrO2Nhc2Uic2VsZWN0IjpjPUYoe30sYyx7dmFsdWU6dm9pZCAwfSksaT1GKHt9LGkse3ZhbHVlOnZvaWQgMH0pLGY9W107YnJlYWs7Y2FzZSJ0ZXh0YXJlYSI6Yz1nZSh0LGMpLGk9Z2UodCxpKSxmPVtdO2JyZWFrO2RlZmF1bHQ6dHlwZW9mIGMub25DbGljayE9ImZ1bmN0aW9uIiYmdHlwZW9mIGkub25DbGljaz09ImZ1bmN0aW9uIiYmKHQub25jbGljaz1XbCl9WGEocyxpKTt2YXIgeTtzPW51bGw7Zm9yKEIgaW4gYylpZighaS5oYXNPd25Qcm9wZXJ0eShCKSYmYy5oYXNPd25Qcm9wZXJ0eShCKSYmY1tCXSE9bnVsbClpZihCPT09InN0eWxlIil7dmFyIGI9Y1tCXTtmb3IoeSBpbiBiKWIuaGFzT3duUHJvcGVydHkoeSkmJihzfHwocz17fSksc1t5XT0iIil9ZWxzZSBCIT09ImRhbmdlcm91c2x5U2V0SW5uZXJIVE1MIiYmQiE9PSJjaGlsZHJlbiImJkIhPT0ic3VwcHJlc3NDb250ZW50RWRpdGFibGVXYXJuaW5nIiYmQiE9PSJzdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmciJiZCIT09ImF1dG9Gb2N1cyImJihkLmhhc093blByb3BlcnR5KEIpP2Z8fChmPVtdKTooZj1mfHxbXSkucHVzaChCLG51bGwpKTtmb3IoQiBpbiBpKXt2YXIgTj1pW0JdO2lmKGI9YyE9bnVsbD9jW0JdOnZvaWQgMCxpLmhhc093blByb3BlcnR5KEIpJiZOIT09YiYmKE4hPW51bGx8fGIhPW51bGwpKWlmKEI9PT0ic3R5bGUiKWlmKGIpe2Zvcih5IGluIGIpIWIuaGFzT3duUHJvcGVydHkoeSl8fE4mJk4uaGFzT3duUHJvcGVydHkoeSl8fChzfHwocz17fSksc1t5XT0iIik7Zm9yKHkgaW4gTilOLmhhc093blByb3BlcnR5KHkpJiZiW3ldIT09Tlt5XSYmKHN8fChzPXt9KSxzW3ldPU5beV0pfWVsc2Ugc3x8KGZ8fChmPVtdKSxmLnB1c2goQixzKSkscz1OO2Vsc2UgQj09PSJkYW5nZXJvdXNseVNldElubmVySFRNTCI/KE49Tj9OLl9faHRtbDp2b2lkIDAsYj1iP2IuX19odG1sOnZvaWQgMCxOIT1udWxsJiZiIT09TiYmKGY9Znx8W10pLnB1c2goQixOKSk6Qj09PSJjaGlsZHJlbiI/dHlwZW9mIE4hPSJzdHJpbmciJiZ0eXBlb2YgTiE9Im51bWJlciJ8fChmPWZ8fFtdKS5wdXNoKEIsIiIrTik6QiE9PSJzdXBwcmVzc0NvbnRlbnRFZGl0YWJsZVdhcm5pbmciJiZCIT09InN1cHByZXNzSHlkcmF0aW9uV2FybmluZyImJihkLmhhc093blByb3BlcnR5KEIpPyhOIT1udWxsJiZCPT09Im9uU2Nyb2xsIiYmdHQoInNjcm9sbCIsdCksZnx8Yj09PU58fChmPVtdKSk6KGY9Znx8W10pLnB1c2goQixOKSl9cyYmKGY9Znx8W10pLnB1c2goInN0eWxlIixzKTt2YXIgQj1mOyhuLnVwZGF0ZVF1ZXVlPUIpJiYobi5mbGFnc3w9NCl9fSxLZj1mdW5jdGlvbih0LG4scyxpKXtzIT09aSYmKG4uZmxhZ3N8PTQpfTtmdW5jdGlvbiB0bCh0LG4pe2lmKCFzdClzd2l0Y2godC50YWlsTW9kZSl7Y2FzZSJoaWRkZW4iOm49dC50YWlsO2Zvcih2YXIgcz1udWxsO24hPT1udWxsOyluLmFsdGVybmF0ZSE9PW51bGwmJihzPW4pLG49bi5zaWJsaW5nO3M9PT1udWxsP3QudGFpbD1udWxsOnMuc2libGluZz1udWxsO2JyZWFrO2Nhc2UiY29sbGFwc2VkIjpzPXQudGFpbDtmb3IodmFyIGk9bnVsbDtzIT09bnVsbDspcy5hbHRlcm5hdGUhPT1udWxsJiYoaT1zKSxzPXMuc2libGluZztpPT09bnVsbD9ufHx0LnRhaWw9PT1udWxsP3QudGFpbD1udWxsOnQudGFpbC5zaWJsaW5nPW51bGw6aS5zaWJsaW5nPW51bGx9fWZ1bmN0aW9uIFR0KHQpe3ZhciBuPXQuYWx0ZXJuYXRlIT09bnVsbCYmdC5hbHRlcm5hdGUuY2hpbGQ9PT10LmNoaWxkLHM9MCxpPTA7aWYobilmb3IodmFyIGM9dC5jaGlsZDtjIT09bnVsbDspc3w9Yy5sYW5lc3xjLmNoaWxkTGFuZXMsaXw9Yy5zdWJ0cmVlRmxhZ3MmMTQ2ODAwNjQsaXw9Yy5mbGFncyYxNDY4MDA2NCxjLnJldHVybj10LGM9Yy5zaWJsaW5nO2Vsc2UgZm9yKGM9dC5jaGlsZDtjIT09bnVsbDspc3w9Yy5sYW5lc3xjLmNoaWxkTGFuZXMsaXw9Yy5zdWJ0cmVlRmxhZ3MsaXw9Yy5mbGFncyxjLnJldHVybj10LGM9Yy5zaWJsaW5nO3JldHVybiB0LnN1YnRyZWVGbGFnc3w9aSx0LmNoaWxkTGFuZXM9cyxufWZ1bmN0aW9uIFZoKHQsbixzKXt2YXIgaT1uLnBlbmRpbmdQcm9wcztzd2l0Y2goQmkobiksbi50YWcpe2Nhc2UgMjpjYXNlIDE2OmNhc2UgMTU6Y2FzZSAwOmNhc2UgMTE6Y2FzZSA3OmNhc2UgODpjYXNlIDEyOmNhc2UgOTpjYXNlIDE0OnJldHVybiBUdChuKSxudWxsO2Nhc2UgMTpyZXR1cm4gT3Qobi50eXBlKSYmVWwoKSxUdChuKSxudWxsO2Nhc2UgMzpyZXR1cm4gaT1uLnN0YXRlTm9kZSxacigpLG50KF90KSxudChSdCksUWkoKSxpLnBlbmRpbmdDb250ZXh0JiYoaS5jb250ZXh0PWkucGVuZGluZ0NvbnRleHQsaS5wZW5kaW5nQ29udGV4dD1udWxsKSwodD09PW51bGx8fHQuY2hpbGQ9PT1udWxsKSYmKFlsKG4pP24uZmxhZ3N8PTQ6dD09PW51bGx8fHQubWVtb2l6ZWRTdGF0ZS5pc0RlaHlkcmF0ZWQmJihuLmZsYWdzJjI1Nik9PT0wfHwobi5mbGFnc3w9MTAyNCxubiE9PW51bGwmJihDbyhubiksbm49bnVsbCkpKSx4byh0LG4pLFR0KG4pLG51bGw7Y2FzZSA1OllpKG4pO3ZhciBjPXlyKFhzLmN1cnJlbnQpO2lmKHM9bi50eXBlLHQhPT1udWxsJiZuLnN0YXRlTm9kZSE9bnVsbClHZih0LG4scyxpLGMpLHQucmVmIT09bi5yZWYmJihuLmZsYWdzfD01MTIsbi5mbGFnc3w9MjA5NzE1Mik7ZWxzZXtpZighaSl7aWYobi5zdGF0ZU5vZGU9PT1udWxsKXRocm93IEVycm9yKGEoMTY2KSk7cmV0dXJuIFR0KG4pLG51bGx9aWYodD15cih5bi5jdXJyZW50KSxZbChuKSl7aT1uLnN0YXRlTm9kZSxzPW4udHlwZTt2YXIgZj1uLm1lbW9pemVkUHJvcHM7c3dpdGNoKGlbeG5dPW4saVtHc109Zix0PShuLm1vZGUmMSkhPT0wLHMpe2Nhc2UiZGlhbG9nIjp0dCgiY2FuY2VsIixpKSx0dCgiY2xvc2UiLGkpO2JyZWFrO2Nhc2UiaWZyYW1lIjpjYXNlIm9iamVjdCI6Y2FzZSJlbWJlZCI6dHQoImxvYWQiLGkpO2JyZWFrO2Nhc2UidmlkZW8iOmNhc2UiYXVkaW8iOmZvcihjPTA7YzxXcy5sZW5ndGg7YysrKXR0KFdzW2NdLGkpO2JyZWFrO2Nhc2Uic291cmNlIjp0dCgiZXJyb3IiLGkpO2JyZWFrO2Nhc2UiaW1nIjpjYXNlImltYWdlIjpjYXNlImxpbmsiOnR0KCJlcnJvciIsaSksdHQoImxvYWQiLGkpO2JyZWFrO2Nhc2UiZGV0YWlscyI6dHQoInRvZ2dsZSIsaSk7YnJlYWs7Y2FzZSJpbnB1dCI6aWUoaSxmKSx0dCgiaW52YWxpZCIsaSk7YnJlYWs7Y2FzZSJzZWxlY3QiOmkuX3dyYXBwZXJTdGF0ZT17d2FzTXVsdGlwbGU6ISFmLm11bHRpcGxlfSx0dCgiaW52YWxpZCIsaSk7YnJlYWs7Y2FzZSJ0ZXh0YXJlYSI6WChpLGYpLHR0KCJpbnZhbGlkIixpKX1YYShzLGYpLGM9bnVsbDtmb3IodmFyIHkgaW4gZilpZihmLmhhc093blByb3BlcnR5KHkpKXt2YXIgYj1mW3ldO3k9PT0iY2hpbGRyZW4iP3R5cGVvZiBiPT0ic3RyaW5nIj9pLnRleHRDb250ZW50IT09YiYmKGYuc3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIT09ITAmJiRsKGkudGV4dENvbnRlbnQsYix0KSxjPVsiY2hpbGRyZW4iLGJdKTp0eXBlb2YgYj09Im51bWJlciImJmkudGV4dENvbnRlbnQhPT0iIitiJiYoZi5zdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmchPT0hMCYmJGwoaS50ZXh0Q29udGVudCxiLHQpLGM9WyJjaGlsZHJlbiIsIiIrYl0pOmQuaGFzT3duUHJvcGVydHkoeSkmJmIhPW51bGwmJnk9PT0ib25TY3JvbGwiJiZ0dCgic2Nyb2xsIixpKX1zd2l0Y2gocyl7Y2FzZSJpbnB1dCI6ZWUoaSksSShpLGYsITApO2JyZWFrO2Nhc2UidGV4dGFyZWEiOmVlKGkpLGJlKGkpO2JyZWFrO2Nhc2Uic2VsZWN0IjpjYXNlIm9wdGlvbiI6YnJlYWs7ZGVmYXVsdDp0eXBlb2YgZi5vbkNsaWNrPT0iZnVuY3Rpb24iJiYoaS5vbmNsaWNrPVdsKX1pPWMsbi51cGRhdGVRdWV1ZT1pLGkhPT1udWxsJiYobi5mbGFnc3w9NCl9ZWxzZXt5PWMubm9kZVR5cGU9PT05P2M6Yy5vd25lckRvY3VtZW50LHQ9PT0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCImJih0PW5lKHMpKSx0PT09Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiP3M9PT0ic2NyaXB0Ij8odD15LmNyZWF0ZUVsZW1lbnQoImRpdiIpLHQuaW5uZXJIVE1MPSI8c2NyaXB0PjxcL3NjcmlwdD4iLHQ9dC5yZW1vdmVDaGlsZCh0LmZpcnN0Q2hpbGQpKTp0eXBlb2YgaS5pcz09InN0cmluZyI/dD15LmNyZWF0ZUVsZW1lbnQocyx7aXM6aS5pc30pOih0PXkuY3JlYXRlRWxlbWVudChzKSxzPT09InNlbGVjdCImJih5PXQsaS5tdWx0aXBsZT95Lm11bHRpcGxlPSEwOmkuc2l6ZSYmKHkuc2l6ZT1pLnNpemUpKSk6dD15LmNyZWF0ZUVsZW1lbnROUyh0LHMpLHRbeG5dPW4sdFtHc109aSxVZih0LG4sITEsITEpLG4uc3RhdGVOb2RlPXQ7ZTp7c3dpdGNoKHk9UWEocyxpKSxzKXtjYXNlImRpYWxvZyI6dHQoImNhbmNlbCIsdCksdHQoImNsb3NlIix0KSxjPWk7YnJlYWs7Y2FzZSJpZnJhbWUiOmNhc2Uib2JqZWN0IjpjYXNlImVtYmVkIjp0dCgibG9hZCIsdCksYz1pO2JyZWFrO2Nhc2UidmlkZW8iOmNhc2UiYXVkaW8iOmZvcihjPTA7YzxXcy5sZW5ndGg7YysrKXR0KFdzW2NdLHQpO2M9aTticmVhaztjYXNlInNvdXJjZSI6dHQoImVycm9yIix0KSxjPWk7YnJlYWs7Y2FzZSJpbWciOmNhc2UiaW1hZ2UiOmNhc2UibGluayI6dHQoImVycm9yIix0KSx0dCgibG9hZCIsdCksYz1pO2JyZWFrO2Nhc2UiZGV0YWlscyI6dHQoInRvZ2dsZSIsdCksYz1pO2JyZWFrO2Nhc2UiaW5wdXQiOmllKHQsaSksYz1QKHQsaSksdHQoImludmFsaWQiLHQpO2JyZWFrO2Nhc2Uib3B0aW9uIjpjPWk7YnJlYWs7Y2FzZSJzZWxlY3QiOnQuX3dyYXBwZXJTdGF0ZT17d2FzTXVsdGlwbGU6ISFpLm11bHRpcGxlfSxjPUYoe30saSx7dmFsdWU6dm9pZCAwfSksdHQoImludmFsaWQiLHQpO2JyZWFrO2Nhc2UidGV4dGFyZWEiOlgodCxpKSxjPWdlKHQsaSksdHQoImludmFsaWQiLHQpO2JyZWFrO2RlZmF1bHQ6Yz1pfVhhKHMsYyksYj1jO2ZvcihmIGluIGIpaWYoYi5oYXNPd25Qcm9wZXJ0eShmKSl7dmFyIE49YltmXTtmPT09InN0eWxlIj9Tcyh0LE4pOmY9PT0iZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwiPyhOPU4/Ti5fX2h0bWw6dm9pZCAwLE4hPW51bGwmJldlKHQsTikpOmY9PT0iY2hpbGRyZW4iP3R5cGVvZiBOPT0ic3RyaW5nIj8ocyE9PSJ0ZXh0YXJlYSJ8fE4hPT0iIikmJkdlKHQsTik6dHlwZW9mIE49PSJudW1iZXIiJiZHZSh0LCIiK04pOmYhPT0ic3VwcHJlc3NDb250ZW50RWRpdGFibGVXYXJuaW5nIiYmZiE9PSJzdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmciJiZmIT09ImF1dG9Gb2N1cyImJihkLmhhc093blByb3BlcnR5KGYpP04hPW51bGwmJmY9PT0ib25TY3JvbGwiJiZ0dCgic2Nyb2xsIix0KTpOIT1udWxsJiZxKHQsZixOLHkpKX1zd2l0Y2gocyl7Y2FzZSJpbnB1dCI6ZWUodCksSSh0LGksITEpO2JyZWFrO2Nhc2UidGV4dGFyZWEiOmVlKHQpLGJlKHQpO2JyZWFrO2Nhc2Uib3B0aW9uIjppLnZhbHVlIT1udWxsJiZ0LnNldEF0dHJpYnV0ZSgidmFsdWUiLCIiK0coaS52YWx1ZSkpO2JyZWFrO2Nhc2Uic2VsZWN0Ijp0Lm11bHRpcGxlPSEhaS5tdWx0aXBsZSxmPWkudmFsdWUsZiE9bnVsbD9qKHQsISFpLm11bHRpcGxlLGYsITEpOmkuZGVmYXVsdFZhbHVlIT1udWxsJiZqKHQsISFpLm11bHRpcGxlLGkuZGVmYXVsdFZhbHVlLCEwKTticmVhaztkZWZhdWx0OnR5cGVvZiBjLm9uQ2xpY2s9PSJmdW5jdGlvbiImJih0Lm9uY2xpY2s9V2wpfXN3aXRjaChzKXtjYXNlImJ1dHRvbiI6Y2FzZSJpbnB1dCI6Y2FzZSJzZWxlY3QiOmNhc2UidGV4dGFyZWEiOmk9ISFpLmF1dG9Gb2N1czticmVhayBlO2Nhc2UiaW1nIjppPSEwO2JyZWFrIGU7ZGVmYXVsdDppPSExfX1pJiYobi5mbGFnc3w9NCl9bi5yZWYhPT1udWxsJiYobi5mbGFnc3w9NTEyLG4uZmxhZ3N8PTIwOTcxNTIpfXJldHVybiBUdChuKSxudWxsO2Nhc2UgNjppZih0JiZuLnN0YXRlTm9kZSE9bnVsbClLZih0LG4sdC5tZW1vaXplZFByb3BzLGkpO2Vsc2V7aWYodHlwZW9mIGkhPSJzdHJpbmciJiZuLnN0YXRlTm9kZT09PW51bGwpdGhyb3cgRXJyb3IoYSgxNjYpKTtpZihzPXlyKFhzLmN1cnJlbnQpLHlyKHluLmN1cnJlbnQpLFlsKG4pKXtpZihpPW4uc3RhdGVOb2RlLHM9bi5tZW1vaXplZFByb3BzLGlbeG5dPW4sKGY9aS5ub2RlVmFsdWUhPT1zKSYmKHQ9R3QsdCE9PW51bGwpKXN3aXRjaCh0LnRhZyl7Y2FzZSAzOiRsKGkubm9kZVZhbHVlLHMsKHQubW9kZSYxKSE9PTApO2JyZWFrO2Nhc2UgNTp0Lm1lbW9pemVkUHJvcHMuc3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIT09ITAmJiRsKGkubm9kZVZhbHVlLHMsKHQubW9kZSYxKSE9PTApfWYmJihuLmZsYWdzfD00KX1lbHNlIGk9KHMubm9kZVR5cGU9PT05P3M6cy5vd25lckRvY3VtZW50KS5jcmVhdGVUZXh0Tm9kZShpKSxpW3huXT1uLG4uc3RhdGVOb2RlPWl9cmV0dXJuIFR0KG4pLG51bGw7Y2FzZSAxMzppZihudChhdCksaT1uLm1lbW9pemVkU3RhdGUsdD09PW51bGx8fHQubWVtb2l6ZWRTdGF0ZSE9PW51bGwmJnQubWVtb2l6ZWRTdGF0ZS5kZWh5ZHJhdGVkIT09bnVsbCl7aWYoc3QmJkt0IT09bnVsbCYmKG4ubW9kZSYxKSE9PTAmJihuLmZsYWdzJjEyOCk9PT0wKXF1KCksWXIoKSxuLmZsYWdzfD05ODU2MCxmPSExO2Vsc2UgaWYoZj1ZbChuKSxpIT09bnVsbCYmaS5kZWh5ZHJhdGVkIT09bnVsbCl7aWYodD09PW51bGwpe2lmKCFmKXRocm93IEVycm9yKGEoMzE4KSk7aWYoZj1uLm1lbW9pemVkU3RhdGUsZj1mIT09bnVsbD9mLmRlaHlkcmF0ZWQ6bnVsbCwhZil0aHJvdyBFcnJvcihhKDMxNykpO2ZbeG5dPW59ZWxzZSBZcigpLChuLmZsYWdzJjEyOCk9PT0wJiYobi5tZW1vaXplZFN0YXRlPW51bGwpLG4uZmxhZ3N8PTQ7VHQobiksZj0hMX1lbHNlIG5uIT09bnVsbCYmKENvKG5uKSxubj1udWxsKSxmPSEwO2lmKCFmKXJldHVybiBuLmZsYWdzJjY1NTM2P246bnVsbH1yZXR1cm4obi5mbGFncyYxMjgpIT09MD8obi5sYW5lcz1zLG4pOihpPWkhPT1udWxsLGkhPT0odCE9PW51bGwmJnQubWVtb2l6ZWRTdGF0ZSE9PW51bGwpJiZpJiYobi5jaGlsZC5mbGFnc3w9ODE5Miwobi5tb2RlJjEpIT09MCYmKHQ9PT1udWxsfHwoYXQuY3VycmVudCYxKSE9PTA/eXQ9PT0wJiYoeXQ9Myk6RW8oKSkpLG4udXBkYXRlUXVldWUhPT1udWxsJiYobi5mbGFnc3w9NCksVHQobiksbnVsbCk7Y2FzZSA0OnJldHVybiBacigpLHhvKHQsbiksdD09PW51bGwmJkhzKG4uc3RhdGVOb2RlLmNvbnRhaW5lckluZm8pLFR0KG4pLG51bGw7Y2FzZSAxMDpyZXR1cm4gVWkobi50eXBlLl9jb250ZXh0KSxUdChuKSxudWxsO2Nhc2UgMTc6cmV0dXJuIE90KG4udHlwZSkmJlVsKCksVHQobiksbnVsbDtjYXNlIDE5OmlmKG50KGF0KSxmPW4ubWVtb2l6ZWRTdGF0ZSxmPT09bnVsbClyZXR1cm4gVHQobiksbnVsbDtpZihpPShuLmZsYWdzJjEyOCkhPT0wLHk9Zi5yZW5kZXJpbmcseT09PW51bGwpaWYoaSl0bChmLCExKTtlbHNle2lmKHl0IT09MHx8dCE9PW51bGwmJih0LmZsYWdzJjEyOCkhPT0wKWZvcih0PW4uY2hpbGQ7dCE9PW51bGw7KXtpZih5PXRhKHQpLHkhPT1udWxsKXtmb3Iobi5mbGFnc3w9MTI4LHRsKGYsITEpLGk9eS51cGRhdGVRdWV1ZSxpIT09bnVsbCYmKG4udXBkYXRlUXVldWU9aSxuLmZsYWdzfD00KSxuLnN1YnRyZWVGbGFncz0wLGk9cyxzPW4uY2hpbGQ7cyE9PW51bGw7KWY9cyx0PWksZi5mbGFncyY9MTQ2ODAwNjYseT1mLmFsdGVybmF0ZSx5PT09bnVsbD8oZi5jaGlsZExhbmVzPTAsZi5sYW5lcz10LGYuY2hpbGQ9bnVsbCxmLnN1YnRyZWVGbGFncz0wLGYubWVtb2l6ZWRQcm9wcz1udWxsLGYubWVtb2l6ZWRTdGF0ZT1udWxsLGYudXBkYXRlUXVldWU9bnVsbCxmLmRlcGVuZGVuY2llcz1udWxsLGYuc3RhdGVOb2RlPW51bGwpOihmLmNoaWxkTGFuZXM9eS5jaGlsZExhbmVzLGYubGFuZXM9eS5sYW5lcyxmLmNoaWxkPXkuY2hpbGQsZi5zdWJ0cmVlRmxhZ3M9MCxmLmRlbGV0aW9ucz1udWxsLGYubWVtb2l6ZWRQcm9wcz15Lm1lbW9pemVkUHJvcHMsZi5tZW1vaXplZFN0YXRlPXkubWVtb2l6ZWRTdGF0ZSxmLnVwZGF0ZVF1ZXVlPXkudXBkYXRlUXVldWUsZi50eXBlPXkudHlwZSx0PXkuZGVwZW5kZW5jaWVzLGYuZGVwZW5kZW5jaWVzPXQ9PT1udWxsP251bGw6e2xhbmVzOnQubGFuZXMsZmlyc3RDb250ZXh0OnQuZmlyc3RDb250ZXh0fSkscz1zLnNpYmxpbmc7cmV0dXJuIGV0KGF0LGF0LmN1cnJlbnQmMXwyKSxuLmNoaWxkfXQ9dC5zaWJsaW5nfWYudGFpbCE9PW51bGwmJmZ0KCk+cnMmJihuLmZsYWdzfD0xMjgsaT0hMCx0bChmLCExKSxuLmxhbmVzPTQxOTQzMDQpfWVsc2V7aWYoIWkpaWYodD10YSh5KSx0IT09bnVsbCl7aWYobi5mbGFnc3w9MTI4LGk9ITAscz10LnVwZGF0ZVF1ZXVlLHMhPT1udWxsJiYobi51cGRhdGVRdWV1ZT1zLG4uZmxhZ3N8PTQpLHRsKGYsITApLGYudGFpbD09PW51bGwmJmYudGFpbE1vZGU9PT0iaGlkZGVuIiYmIXkuYWx0ZXJuYXRlJiYhc3QpcmV0dXJuIFR0KG4pLG51bGx9ZWxzZSAyKmZ0KCktZi5yZW5kZXJpbmdTdGFydFRpbWU+cnMmJnMhPT0xMDczNzQxODI0JiYobi5mbGFnc3w9MTI4LGk9ITAsdGwoZiwhMSksbi5sYW5lcz00MTk0MzA0KTtmLmlzQmFja3dhcmRzPyh5LnNpYmxpbmc9bi5jaGlsZCxuLmNoaWxkPXkpOihzPWYubGFzdCxzIT09bnVsbD9zLnNpYmxpbmc9eTpuLmNoaWxkPXksZi5sYXN0PXkpfXJldHVybiBmLnRhaWwhPT1udWxsPyhuPWYudGFpbCxmLnJlbmRlcmluZz1uLGYudGFpbD1uLnNpYmxpbmcsZi5yZW5kZXJpbmdTdGFydFRpbWU9ZnQoKSxuLnNpYmxpbmc9bnVsbCxzPWF0LmN1cnJlbnQsZXQoYXQsaT9zJjF8MjpzJjEpLG4pOihUdChuKSxudWxsKTtjYXNlIDIyOmNhc2UgMjM6cmV0dXJuIFBvKCksaT1uLm1lbW9pemVkU3RhdGUhPT1udWxsLHQhPT1udWxsJiZ0Lm1lbW9pemVkU3RhdGUhPT1udWxsIT09aSYmKG4uZmxhZ3N8PTgxOTIpLGkmJihuLm1vZGUmMSkhPT0wPyhWdCYxMDczNzQxODI0KSE9PTAmJihUdChuKSxuLnN1YnRyZWVGbGFncyY2JiYobi5mbGFnc3w9ODE5MikpOlR0KG4pLG51bGw7Y2FzZSAyNDpyZXR1cm4gbnVsbDtjYXNlIDI1OnJldHVybiBudWxsfXRocm93IEVycm9yKGEoMTU2LG4udGFnKSl9ZnVuY3Rpb24gcWgodCxuKXtzd2l0Y2goQmkobiksbi50YWcpe2Nhc2UgMTpyZXR1cm4gT3Qobi50eXBlKSYmVWwoKSx0PW4uZmxhZ3MsdCY2NTUzNj8obi5mbGFncz10Ji02NTUzN3wxMjgsbik6bnVsbDtjYXNlIDM6cmV0dXJuIFpyKCksbnQoX3QpLG50KFJ0KSxRaSgpLHQ9bi5mbGFncywodCY2NTUzNikhPT0wJiYodCYxMjgpPT09MD8obi5mbGFncz10Ji02NTUzN3wxMjgsbik6bnVsbDtjYXNlIDU6cmV0dXJuIFlpKG4pLG51bGw7Y2FzZSAxMzppZihudChhdCksdD1uLm1lbW9pemVkU3RhdGUsdCE9PW51bGwmJnQuZGVoeWRyYXRlZCE9PW51bGwpe2lmKG4uYWx0ZXJuYXRlPT09bnVsbCl0aHJvdyBFcnJvcihhKDM0MCkpO1lyKCl9cmV0dXJuIHQ9bi5mbGFncyx0JjY1NTM2PyhuLmZsYWdzPXQmLTY1NTM3fDEyOCxuKTpudWxsO2Nhc2UgMTk6cmV0dXJuIG50KGF0KSxudWxsO2Nhc2UgNDpyZXR1cm4gWnIoKSxudWxsO2Nhc2UgMTA6cmV0dXJuIFVpKG4udHlwZS5fY29udGV4dCksbnVsbDtjYXNlIDIyOmNhc2UgMjM6cmV0dXJuIFBvKCksbnVsbDtjYXNlIDI0OnJldHVybiBudWxsO2RlZmF1bHQ6cmV0dXJuIG51bGx9fXZhciB1YT0hMSxQdD0hMSxZaD10eXBlb2YgV2Vha1NldD09ImZ1bmN0aW9uIj9XZWFrU2V0OlNldCxNZT1udWxsO2Z1bmN0aW9uIHRzKHQsbil7dmFyIHM9dC5yZWY7aWYocyE9PW51bGwpaWYodHlwZW9mIHM9PSJmdW5jdGlvbiIpdHJ5e3MobnVsbCl9Y2F0Y2goaSl7b3QodCxuLGkpfWVsc2Ugcy5jdXJyZW50PW51bGx9ZnVuY3Rpb24geW8odCxuLHMpe3RyeXtzKCl9Y2F0Y2goaSl7b3QodCxuLGkpfX12YXIgVmY9ITE7ZnVuY3Rpb24gWGgodCxuKXtpZihUaT1QbCx0PVN1KCksYmkodCkpe2lmKCJzZWxlY3Rpb25TdGFydCJpbiB0KXZhciBzPXtzdGFydDp0LnNlbGVjdGlvblN0YXJ0LGVuZDp0LnNlbGVjdGlvbkVuZH07ZWxzZSBlOntzPShzPXQub3duZXJEb2N1bWVudCkmJnMuZGVmYXVsdFZpZXd8fHdpbmRvdzt2YXIgaT1zLmdldFNlbGVjdGlvbiYmcy5nZXRTZWxlY3Rpb24oKTtpZihpJiZpLnJhbmdlQ291bnQhPT0wKXtzPWkuYW5jaG9yTm9kZTt2YXIgYz1pLmFuY2hvck9mZnNldCxmPWkuZm9jdXNOb2RlO2k9aS5mb2N1c09mZnNldDt0cnl7cy5ub2RlVHlwZSxmLm5vZGVUeXBlfWNhdGNoe3M9bnVsbDticmVhayBlfXZhciB5PTAsYj0tMSxOPS0xLEI9MCxsZT0wLGNlPXQscmU9bnVsbDt0OmZvcig7Oyl7Zm9yKHZhciBOZTtjZSE9PXN8fGMhPT0wJiZjZS5ub2RlVHlwZSE9PTN8fChiPXkrYyksY2UhPT1mfHxpIT09MCYmY2Uubm9kZVR5cGUhPT0zfHwoTj15K2kpLGNlLm5vZGVUeXBlPT09MyYmKHkrPWNlLm5vZGVWYWx1ZS5sZW5ndGgpLChOZT1jZS5maXJzdENoaWxkKSE9PW51bGw7KXJlPWNlLGNlPU5lO2Zvcig7Oyl7aWYoY2U9PT10KWJyZWFrIHQ7aWYocmU9PT1zJiYrK0I9PT1jJiYoYj15KSxyZT09PWYmJisrbGU9PT1pJiYoTj15KSwoTmU9Y2UubmV4dFNpYmxpbmcpIT09bnVsbClicmVhaztjZT1yZSxyZT1jZS5wYXJlbnROb2RlfWNlPU5lfXM9Yj09PS0xfHxOPT09LTE/bnVsbDp7c3RhcnQ6YixlbmQ6Tn19ZWxzZSBzPW51bGx9cz1zfHx7c3RhcnQ6MCxlbmQ6MH19ZWxzZSBzPW51bGw7Zm9yKFBpPXtmb2N1c2VkRWxlbTp0LHNlbGVjdGlvblJhbmdlOnN9LFBsPSExLE1lPW47TWUhPT1udWxsOylpZihuPU1lLHQ9bi5jaGlsZCwobi5zdWJ0cmVlRmxhZ3MmMTAyOCkhPT0wJiZ0IT09bnVsbCl0LnJldHVybj1uLE1lPXQ7ZWxzZSBmb3IoO01lIT09bnVsbDspe249TWU7dHJ5e3ZhciBSZT1uLmFsdGVybmF0ZTtpZigobi5mbGFncyYxMDI0KSE9PTApc3dpdGNoKG4udGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OmJyZWFrO2Nhc2UgMTppZihSZSE9PW51bGwpe3ZhciBDZT1SZS5tZW1vaXplZFByb3BzLGR0PVJlLm1lbW9pemVkU3RhdGUsRT1uLnN0YXRlTm9kZSxDPUUuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUobi5lbGVtZW50VHlwZT09PW4udHlwZT9DZTpybihuLnR5cGUsQ2UpLGR0KTtFLl9fcmVhY3RJbnRlcm5hbFNuYXBzaG90QmVmb3JlVXBkYXRlPUN9YnJlYWs7Y2FzZSAzOnZhciBEPW4uc3RhdGVOb2RlLmNvbnRhaW5lckluZm87RC5ub2RlVHlwZT09PTE/RC50ZXh0Q29udGVudD0iIjpELm5vZGVUeXBlPT09OSYmRC5kb2N1bWVudEVsZW1lbnQmJkQucmVtb3ZlQ2hpbGQoRC5kb2N1bWVudEVsZW1lbnQpO2JyZWFrO2Nhc2UgNTpjYXNlIDY6Y2FzZSA0OmNhc2UgMTc6YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihhKDE2MykpfX1jYXRjaChtZSl7b3QobixuLnJldHVybixtZSl9aWYodD1uLnNpYmxpbmcsdCE9PW51bGwpe3QucmV0dXJuPW4ucmV0dXJuLE1lPXQ7YnJlYWt9TWU9bi5yZXR1cm59cmV0dXJuIFJlPVZmLFZmPSExLFJlfWZ1bmN0aW9uIG5sKHQsbixzKXt2YXIgaT1uLnVwZGF0ZVF1ZXVlO2lmKGk9aSE9PW51bGw/aS5sYXN0RWZmZWN0Om51bGwsaSE9PW51bGwpe3ZhciBjPWk9aS5uZXh0O2Rve2lmKChjLnRhZyZ0KT09PXQpe3ZhciBmPWMuZGVzdHJveTtjLmRlc3Ryb3k9dm9pZCAwLGYhPT12b2lkIDAmJnlvKG4scyxmKX1jPWMubmV4dH13aGlsZShjIT09aSl9fWZ1bmN0aW9uIGZhKHQsbil7aWYobj1uLnVwZGF0ZVF1ZXVlLG49biE9PW51bGw/bi5sYXN0RWZmZWN0Om51bGwsbiE9PW51bGwpe3ZhciBzPW49bi5uZXh0O2Rve2lmKChzLnRhZyZ0KT09PXQpe3ZhciBpPXMuY3JlYXRlO3MuZGVzdHJveT1pKCl9cz1zLm5leHR9d2hpbGUocyE9PW4pfX1mdW5jdGlvbiB2byh0KXt2YXIgbj10LnJlZjtpZihuIT09bnVsbCl7dmFyIHM9dC5zdGF0ZU5vZGU7c3dpdGNoKHQudGFnKXtjYXNlIDU6dD1zO2JyZWFrO2RlZmF1bHQ6dD1zfXR5cGVvZiBuPT0iZnVuY3Rpb24iP24odCk6bi5jdXJyZW50PXR9fWZ1bmN0aW9uIHFmKHQpe3ZhciBuPXQuYWx0ZXJuYXRlO24hPT1udWxsJiYodC5hbHRlcm5hdGU9bnVsbCxxZihuKSksdC5jaGlsZD1udWxsLHQuZGVsZXRpb25zPW51bGwsdC5zaWJsaW5nPW51bGwsdC50YWc9PT01JiYobj10LnN0YXRlTm9kZSxuIT09bnVsbCYmKGRlbGV0ZSBuW3huXSxkZWxldGUgbltHc10sZGVsZXRlIG5bRGldLGRlbGV0ZSBuW0xoXSxkZWxldGUgbltBaF0pKSx0LnN0YXRlTm9kZT1udWxsLHQucmV0dXJuPW51bGwsdC5kZXBlbmRlbmNpZXM9bnVsbCx0Lm1lbW9pemVkUHJvcHM9bnVsbCx0Lm1lbW9pemVkU3RhdGU9bnVsbCx0LnBlbmRpbmdQcm9wcz1udWxsLHQuc3RhdGVOb2RlPW51bGwsdC51cGRhdGVRdWV1ZT1udWxsfWZ1bmN0aW9uIFlmKHQpe3JldHVybiB0LnRhZz09PTV8fHQudGFnPT09M3x8dC50YWc9PT00fWZ1bmN0aW9uIFhmKHQpe2U6Zm9yKDs7KXtmb3IoO3Quc2libGluZz09PW51bGw7KXtpZih0LnJldHVybj09PW51bGx8fFlmKHQucmV0dXJuKSlyZXR1cm4gbnVsbDt0PXQucmV0dXJufWZvcih0LnNpYmxpbmcucmV0dXJuPXQucmV0dXJuLHQ9dC5zaWJsaW5nO3QudGFnIT09NSYmdC50YWchPT02JiZ0LnRhZyE9PTE4Oyl7aWYodC5mbGFncyYyfHx0LmNoaWxkPT09bnVsbHx8dC50YWc9PT00KWNvbnRpbnVlIGU7dC5jaGlsZC5yZXR1cm49dCx0PXQuY2hpbGR9aWYoISh0LmZsYWdzJjIpKXJldHVybiB0LnN0YXRlTm9kZX19ZnVuY3Rpb24gd28odCxuLHMpe3ZhciBpPXQudGFnO2lmKGk9PT01fHxpPT09Nil0PXQuc3RhdGVOb2RlLG4/cy5ub2RlVHlwZT09PTg/cy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LG4pOnMuaW5zZXJ0QmVmb3JlKHQsbik6KHMubm9kZVR5cGU9PT04PyhuPXMucGFyZW50Tm9kZSxuLmluc2VydEJlZm9yZSh0LHMpKToobj1zLG4uYXBwZW5kQ2hpbGQodCkpLHM9cy5fcmVhY3RSb290Q29udGFpbmVyLHMhPW51bGx8fG4ub25jbGljayE9PW51bGx8fChuLm9uY2xpY2s9V2wpKTtlbHNlIGlmKGkhPT00JiYodD10LmNoaWxkLHQhPT1udWxsKSlmb3Iod28odCxuLHMpLHQ9dC5zaWJsaW5nO3QhPT1udWxsOyl3byh0LG4scyksdD10LnNpYmxpbmd9ZnVuY3Rpb24gYm8odCxuLHMpe3ZhciBpPXQudGFnO2lmKGk9PT01fHxpPT09Nil0PXQuc3RhdGVOb2RlLG4/cy5pbnNlcnRCZWZvcmUodCxuKTpzLmFwcGVuZENoaWxkKHQpO2Vsc2UgaWYoaSE9PTQmJih0PXQuY2hpbGQsdCE9PW51bGwpKWZvcihibyh0LG4scyksdD10LnNpYmxpbmc7dCE9PW51bGw7KWJvKHQsbixzKSx0PXQuc2libGluZ312YXIgU3Q9bnVsbCxzbj0hMTtmdW5jdGlvbiBRbih0LG4scyl7Zm9yKHM9cy5jaGlsZDtzIT09bnVsbDspUWYodCxuLHMpLHM9cy5zaWJsaW5nfWZ1bmN0aW9uIFFmKHQsbixzKXtpZihnbiYmdHlwZW9mIGduLm9uQ29tbWl0RmliZXJVbm1vdW50PT0iZnVuY3Rpb24iKXRyeXtnbi5vbkNvbW1pdEZpYmVyVW5tb3VudChTbCxzKX1jYXRjaHt9c3dpdGNoKHMudGFnKXtjYXNlIDU6UHR8fHRzKHMsbik7Y2FzZSA2OnZhciBpPVN0LGM9c247U3Q9bnVsbCxRbih0LG4scyksU3Q9aSxzbj1jLFN0IT09bnVsbCYmKHNuPyh0PVN0LHM9cy5zdGF0ZU5vZGUsdC5ub2RlVHlwZT09PTg/dC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHMpOnQucmVtb3ZlQ2hpbGQocykpOlN0LnJlbW92ZUNoaWxkKHMuc3RhdGVOb2RlKSk7YnJlYWs7Y2FzZSAxODpTdCE9PW51bGwmJihzbj8odD1TdCxzPXMuc3RhdGVOb2RlLHQubm9kZVR5cGU9PT04P0FpKHQucGFyZW50Tm9kZSxzKTp0Lm5vZGVUeXBlPT09MSYmQWkodCxzKSxEcyh0KSk6QWkoU3Qscy5zdGF0ZU5vZGUpKTticmVhaztjYXNlIDQ6aT1TdCxjPXNuLFN0PXMuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sc249ITAsUW4odCxuLHMpLFN0PWksc249YzticmVhaztjYXNlIDA6Y2FzZSAxMTpjYXNlIDE0OmNhc2UgMTU6aWYoIVB0JiYoaT1zLnVwZGF0ZVF1ZXVlLGkhPT1udWxsJiYoaT1pLmxhc3RFZmZlY3QsaSE9PW51bGwpKSl7Yz1pPWkubmV4dDtkb3t2YXIgZj1jLHk9Zi5kZXN0cm95O2Y9Zi50YWcseSE9PXZvaWQgMCYmKChmJjIpIT09MHx8KGYmNCkhPT0wKSYmeW8ocyxuLHkpLGM9Yy5uZXh0fXdoaWxlKGMhPT1pKX1Rbih0LG4scyk7YnJlYWs7Y2FzZSAxOmlmKCFQdCYmKHRzKHMsbiksaT1zLnN0YXRlTm9kZSx0eXBlb2YgaS5jb21wb25lbnRXaWxsVW5tb3VudD09ImZ1bmN0aW9uIikpdHJ5e2kucHJvcHM9cy5tZW1vaXplZFByb3BzLGkuc3RhdGU9cy5tZW1vaXplZFN0YXRlLGkuY29tcG9uZW50V2lsbFVubW91bnQoKX1jYXRjaChiKXtvdChzLG4sYil9UW4odCxuLHMpO2JyZWFrO2Nhc2UgMjE6UW4odCxuLHMpO2JyZWFrO2Nhc2UgMjI6cy5tb2RlJjE/KFB0PShpPVB0KXx8cy5tZW1vaXplZFN0YXRlIT09bnVsbCxRbih0LG4scyksUHQ9aSk6UW4odCxuLHMpO2JyZWFrO2RlZmF1bHQ6UW4odCxuLHMpfX1mdW5jdGlvbiBKZih0KXt2YXIgbj10LnVwZGF0ZVF1ZXVlO2lmKG4hPT1udWxsKXt0LnVwZGF0ZVF1ZXVlPW51bGw7dmFyIHM9dC5zdGF0ZU5vZGU7cz09PW51bGwmJihzPXQuc3RhdGVOb2RlPW5ldyBZaCksbi5mb3JFYWNoKGZ1bmN0aW9uKGkpe3ZhciBjPWxtLmJpbmQobnVsbCx0LGkpO3MuaGFzKGkpfHwocy5hZGQoaSksaS50aGVuKGMsYykpfSl9fWZ1bmN0aW9uIGxuKHQsbil7dmFyIHM9bi5kZWxldGlvbnM7aWYocyE9PW51bGwpZm9yKHZhciBpPTA7aTxzLmxlbmd0aDtpKyspe3ZhciBjPXNbaV07dHJ5e3ZhciBmPXQseT1uLGI9eTtlOmZvcig7YiE9PW51bGw7KXtzd2l0Y2goYi50YWcpe2Nhc2UgNTpTdD1iLnN0YXRlTm9kZSxzbj0hMTticmVhayBlO2Nhc2UgMzpTdD1iLnN0YXRlTm9kZS5jb250YWluZXJJbmZvLHNuPSEwO2JyZWFrIGU7Y2FzZSA0OlN0PWIuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sc249ITA7YnJlYWsgZX1iPWIucmV0dXJufWlmKFN0PT09bnVsbCl0aHJvdyBFcnJvcihhKDE2MCkpO1FmKGYseSxjKSxTdD1udWxsLHNuPSExO3ZhciBOPWMuYWx0ZXJuYXRlO04hPT1udWxsJiYoTi5yZXR1cm49bnVsbCksYy5yZXR1cm49bnVsbH1jYXRjaChCKXtvdChjLG4sQil9fWlmKG4uc3VidHJlZUZsYWdzJjEyODU0KWZvcihuPW4uY2hpbGQ7biE9PW51bGw7KVpmKG4sdCksbj1uLnNpYmxpbmd9ZnVuY3Rpb24gWmYodCxuKXt2YXIgcz10LmFsdGVybmF0ZSxpPXQuZmxhZ3M7c3dpdGNoKHQudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE0OmNhc2UgMTU6aWYobG4obix0KSx3bih0KSxpJjQpe3RyeXtubCgzLHQsdC5yZXR1cm4pLGZhKDMsdCl9Y2F0Y2goQ2Upe290KHQsdC5yZXR1cm4sQ2UpfXRyeXtubCg1LHQsdC5yZXR1cm4pfWNhdGNoKENlKXtvdCh0LHQucmV0dXJuLENlKX19YnJlYWs7Y2FzZSAxOmxuKG4sdCksd24odCksaSY1MTImJnMhPT1udWxsJiZ0cyhzLHMucmV0dXJuKTticmVhaztjYXNlIDU6aWYobG4obix0KSx3bih0KSxpJjUxMiYmcyE9PW51bGwmJnRzKHMscy5yZXR1cm4pLHQuZmxhZ3MmMzIpe3ZhciBjPXQuc3RhdGVOb2RlO3RyeXtHZShjLCIiKX1jYXRjaChDZSl7b3QodCx0LnJldHVybixDZSl9fWlmKGkmNCYmKGM9dC5zdGF0ZU5vZGUsYyE9bnVsbCkpe3ZhciBmPXQubWVtb2l6ZWRQcm9wcyx5PXMhPT1udWxsP3MubWVtb2l6ZWRQcm9wczpmLGI9dC50eXBlLE49dC51cGRhdGVRdWV1ZTtpZih0LnVwZGF0ZVF1ZXVlPW51bGwsTiE9PW51bGwpdHJ5e2I9PT0iaW5wdXQiJiZmLnR5cGU9PT0icmFkaW8iJiZmLm5hbWUhPW51bGwmJlkoYyxmKSxRYShiLHkpO3ZhciBCPVFhKGIsZik7Zm9yKHk9MDt5PE4ubGVuZ3RoO3krPTIpe3ZhciBsZT1OW3ldLGNlPU5beSsxXTtsZT09PSJzdHlsZSI/U3MoYyxjZSk6bGU9PT0iZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwiP1dlKGMsY2UpOmxlPT09ImNoaWxkcmVuIj9HZShjLGNlKTpxKGMsbGUsY2UsQil9c3dpdGNoKGIpe2Nhc2UiaW5wdXQiOl8oYyxmKTticmVhaztjYXNlInRleHRhcmVhIjpUKGMsZik7YnJlYWs7Y2FzZSJzZWxlY3QiOnZhciByZT1jLl93cmFwcGVyU3RhdGUud2FzTXVsdGlwbGU7Yy5fd3JhcHBlclN0YXRlLndhc011bHRpcGxlPSEhZi5tdWx0aXBsZTt2YXIgTmU9Zi52YWx1ZTtOZSE9bnVsbD9qKGMsISFmLm11bHRpcGxlLE5lLCExKTpyZSE9PSEhZi5tdWx0aXBsZSYmKGYuZGVmYXVsdFZhbHVlIT1udWxsP2ooYywhIWYubXVsdGlwbGUsZi5kZWZhdWx0VmFsdWUsITApOmooYywhIWYubXVsdGlwbGUsZi5tdWx0aXBsZT9bXToiIiwhMSkpfWNbR3NdPWZ9Y2F0Y2goQ2Upe290KHQsdC5yZXR1cm4sQ2UpfX1icmVhaztjYXNlIDY6aWYobG4obix0KSx3bih0KSxpJjQpe2lmKHQuc3RhdGVOb2RlPT09bnVsbCl0aHJvdyBFcnJvcihhKDE2MikpO2M9dC5zdGF0ZU5vZGUsZj10Lm1lbW9pemVkUHJvcHM7dHJ5e2Mubm9kZVZhbHVlPWZ9Y2F0Y2goQ2Upe290KHQsdC5yZXR1cm4sQ2UpfX1icmVhaztjYXNlIDM6aWYobG4obix0KSx3bih0KSxpJjQmJnMhPT1udWxsJiZzLm1lbW9pemVkU3RhdGUuaXNEZWh5ZHJhdGVkKXRyeXtEcyhuLmNvbnRhaW5lckluZm8pfWNhdGNoKENlKXtvdCh0LHQucmV0dXJuLENlKX1icmVhaztjYXNlIDQ6bG4obix0KSx3bih0KTticmVhaztjYXNlIDEzOmxuKG4sdCksd24odCksYz10LmNoaWxkLGMuZmxhZ3MmODE5MiYmKGY9Yy5tZW1vaXplZFN0YXRlIT09bnVsbCxjLnN0YXRlTm9kZS5pc0hpZGRlbj1mLCFmfHxjLmFsdGVybmF0ZSE9PW51bGwmJmMuYWx0ZXJuYXRlLm1lbW9pemVkU3RhdGUhPT1udWxsfHwoU289ZnQoKSkpLGkmNCYmSmYodCk7YnJlYWs7Y2FzZSAyMjppZihsZT1zIT09bnVsbCYmcy5tZW1vaXplZFN0YXRlIT09bnVsbCx0Lm1vZGUmMT8oUHQ9KEI9UHQpfHxsZSxsbihuLHQpLFB0PUIpOmxuKG4sdCksd24odCksaSY4MTkyKXtpZihCPXQubWVtb2l6ZWRTdGF0ZSE9PW51bGwsKHQuc3RhdGVOb2RlLmlzSGlkZGVuPUIpJiYhbGUmJih0Lm1vZGUmMSkhPT0wKWZvcihNZT10LGxlPXQuY2hpbGQ7bGUhPT1udWxsOyl7Zm9yKGNlPU1lPWxlO01lIT09bnVsbDspe3N3aXRjaChyZT1NZSxOZT1yZS5jaGlsZCxyZS50YWcpe2Nhc2UgMDpjYXNlIDExOmNhc2UgMTQ6Y2FzZSAxNTpubCg0LHJlLHJlLnJldHVybik7YnJlYWs7Y2FzZSAxOnRzKHJlLHJlLnJldHVybik7dmFyIFJlPXJlLnN0YXRlTm9kZTtpZih0eXBlb2YgUmUuY29tcG9uZW50V2lsbFVubW91bnQ9PSJmdW5jdGlvbiIpe2k9cmUscz1yZS5yZXR1cm47dHJ5e249aSxSZS5wcm9wcz1uLm1lbW9pemVkUHJvcHMsUmUuc3RhdGU9bi5tZW1vaXplZFN0YXRlLFJlLmNvbXBvbmVudFdpbGxVbm1vdW50KCl9Y2F0Y2goQ2Upe290KGkscyxDZSl9fWJyZWFrO2Nhc2UgNTp0cyhyZSxyZS5yZXR1cm4pO2JyZWFrO2Nhc2UgMjI6aWYocmUubWVtb2l6ZWRTdGF0ZSE9PW51bGwpe25kKGNlKTtjb250aW51ZX19TmUhPT1udWxsPyhOZS5yZXR1cm49cmUsTWU9TmUpOm5kKGNlKX1sZT1sZS5zaWJsaW5nfWU6Zm9yKGxlPW51bGwsY2U9dDs7KXtpZihjZS50YWc9PT01KXtpZihsZT09PW51bGwpe2xlPWNlO3RyeXtjPWNlLnN0YXRlTm9kZSxCPyhmPWMuc3R5bGUsdHlwZW9mIGYuc2V0UHJvcGVydHk9PSJmdW5jdGlvbiI/Zi5zZXRQcm9wZXJ0eSgiZGlzcGxheSIsIm5vbmUiLCJpbXBvcnRhbnQiKTpmLmRpc3BsYXk9Im5vbmUiKTooYj1jZS5zdGF0ZU5vZGUsTj1jZS5tZW1vaXplZFByb3BzLnN0eWxlLHk9TiE9bnVsbCYmTi5oYXNPd25Qcm9wZXJ0eSgiZGlzcGxheSIpP04uZGlzcGxheTpudWxsLGIuc3R5bGUuZGlzcGxheT1qcygiZGlzcGxheSIseSkpfWNhdGNoKENlKXtvdCh0LHQucmV0dXJuLENlKX19fWVsc2UgaWYoY2UudGFnPT09Nil7aWYobGU9PT1udWxsKXRyeXtjZS5zdGF0ZU5vZGUubm9kZVZhbHVlPUI/IiI6Y2UubWVtb2l6ZWRQcm9wc31jYXRjaChDZSl7b3QodCx0LnJldHVybixDZSl9fWVsc2UgaWYoKGNlLnRhZyE9PTIyJiZjZS50YWchPT0yM3x8Y2UubWVtb2l6ZWRTdGF0ZT09PW51bGx8fGNlPT09dCkmJmNlLmNoaWxkIT09bnVsbCl7Y2UuY2hpbGQucmV0dXJuPWNlLGNlPWNlLmNoaWxkO2NvbnRpbnVlfWlmKGNlPT09dClicmVhayBlO2Zvcig7Y2Uuc2libGluZz09PW51bGw7KXtpZihjZS5yZXR1cm49PT1udWxsfHxjZS5yZXR1cm49PT10KWJyZWFrIGU7bGU9PT1jZSYmKGxlPW51bGwpLGNlPWNlLnJldHVybn1sZT09PWNlJiYobGU9bnVsbCksY2Uuc2libGluZy5yZXR1cm49Y2UucmV0dXJuLGNlPWNlLnNpYmxpbmd9fWJyZWFrO2Nhc2UgMTk6bG4obix0KSx3bih0KSxpJjQmJkpmKHQpO2JyZWFrO2Nhc2UgMjE6YnJlYWs7ZGVmYXVsdDpsbihuLHQpLHduKHQpfX1mdW5jdGlvbiB3bih0KXt2YXIgbj10LmZsYWdzO2lmKG4mMil7dHJ5e2U6e2Zvcih2YXIgcz10LnJldHVybjtzIT09bnVsbDspe2lmKFlmKHMpKXt2YXIgaT1zO2JyZWFrIGV9cz1zLnJldHVybn10aHJvdyBFcnJvcihhKDE2MCkpfXN3aXRjaChpLnRhZyl7Y2FzZSA1OnZhciBjPWkuc3RhdGVOb2RlO2kuZmxhZ3MmMzImJihHZShjLCIiKSxpLmZsYWdzJj0tMzMpO3ZhciBmPVhmKHQpO2JvKHQsZixjKTticmVhaztjYXNlIDM6Y2FzZSA0OnZhciB5PWkuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sYj1YZih0KTt3byh0LGIseSk7YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihhKDE2MSkpfX1jYXRjaChOKXtvdCh0LHQucmV0dXJuLE4pfXQuZmxhZ3MmPS0zfW4mNDA5NiYmKHQuZmxhZ3MmPS00MDk3KX1mdW5jdGlvbiBRaCh0LG4scyl7TWU9dCxlZCh0KX1mdW5jdGlvbiBlZCh0LG4scyl7Zm9yKHZhciBpPSh0Lm1vZGUmMSkhPT0wO01lIT09bnVsbDspe3ZhciBjPU1lLGY9Yy5jaGlsZDtpZihjLnRhZz09PTIyJiZpKXt2YXIgeT1jLm1lbW9pemVkU3RhdGUhPT1udWxsfHx1YTtpZigheSl7dmFyIGI9Yy5hbHRlcm5hdGUsTj1iIT09bnVsbCYmYi5tZW1vaXplZFN0YXRlIT09bnVsbHx8UHQ7Yj11YTt2YXIgQj1QdDtpZih1YT15LChQdD1OKSYmIUIpZm9yKE1lPWM7TWUhPT1udWxsOyl5PU1lLE49eS5jaGlsZCx5LnRhZz09PTIyJiZ5Lm1lbW9pemVkU3RhdGUhPT1udWxsP3JkKGMpOk4hPT1udWxsPyhOLnJldHVybj15LE1lPU4pOnJkKGMpO2Zvcig7ZiE9PW51bGw7KU1lPWYsZWQoZiksZj1mLnNpYmxpbmc7TWU9Yyx1YT1iLFB0PUJ9dGQodCl9ZWxzZShjLnN1YnRyZWVGbGFncyY4NzcyKSE9PTAmJmYhPT1udWxsPyhmLnJldHVybj1jLE1lPWYpOnRkKHQpfX1mdW5jdGlvbiB0ZCh0KXtmb3IoO01lIT09bnVsbDspe3ZhciBuPU1lO2lmKChuLmZsYWdzJjg3NzIpIT09MCl7dmFyIHM9bi5hbHRlcm5hdGU7dHJ5e2lmKChuLmZsYWdzJjg3NzIpIT09MClzd2l0Y2gobi50YWcpe2Nhc2UgMDpjYXNlIDExOmNhc2UgMTU6UHR8fGZhKDUsbik7YnJlYWs7Y2FzZSAxOnZhciBpPW4uc3RhdGVOb2RlO2lmKG4uZmxhZ3MmNCYmIVB0KWlmKHM9PT1udWxsKWkuY29tcG9uZW50RGlkTW91bnQoKTtlbHNle3ZhciBjPW4uZWxlbWVudFR5cGU9PT1uLnR5cGU/cy5tZW1vaXplZFByb3BzOnJuKG4udHlwZSxzLm1lbW9pemVkUHJvcHMpO2kuY29tcG9uZW50RGlkVXBkYXRlKGMscy5tZW1vaXplZFN0YXRlLGkuX19yZWFjdEludGVybmFsU25hcHNob3RCZWZvcmVVcGRhdGUpfXZhciBmPW4udXBkYXRlUXVldWU7ZiE9PW51bGwmJnRmKG4sZixpKTticmVhaztjYXNlIDM6dmFyIHk9bi51cGRhdGVRdWV1ZTtpZih5IT09bnVsbCl7aWYocz1udWxsLG4uY2hpbGQhPT1udWxsKXN3aXRjaChuLmNoaWxkLnRhZyl7Y2FzZSA1OnM9bi5jaGlsZC5zdGF0ZU5vZGU7YnJlYWs7Y2FzZSAxOnM9bi5jaGlsZC5zdGF0ZU5vZGV9dGYobix5LHMpfWJyZWFrO2Nhc2UgNTp2YXIgYj1uLnN0YXRlTm9kZTtpZihzPT09bnVsbCYmbi5mbGFncyY0KXtzPWI7dmFyIE49bi5tZW1vaXplZFByb3BzO3N3aXRjaChuLnR5cGUpe2Nhc2UiYnV0dG9uIjpjYXNlImlucHV0IjpjYXNlInNlbGVjdCI6Y2FzZSJ0ZXh0YXJlYSI6Ti5hdXRvRm9jdXMmJnMuZm9jdXMoKTticmVhaztjYXNlImltZyI6Ti5zcmMmJihzLnNyYz1OLnNyYyl9fWJyZWFrO2Nhc2UgNjpicmVhaztjYXNlIDQ6YnJlYWs7Y2FzZSAxMjpicmVhaztjYXNlIDEzOmlmKG4ubWVtb2l6ZWRTdGF0ZT09PW51bGwpe3ZhciBCPW4uYWx0ZXJuYXRlO2lmKEIhPT1udWxsKXt2YXIgbGU9Qi5tZW1vaXplZFN0YXRlO2lmKGxlIT09bnVsbCl7dmFyIGNlPWxlLmRlaHlkcmF0ZWQ7Y2UhPT1udWxsJiZEcyhjZSl9fX1icmVhaztjYXNlIDE5OmNhc2UgMTc6Y2FzZSAyMTpjYXNlIDIyOmNhc2UgMjM6Y2FzZSAyNTpicmVhaztkZWZhdWx0OnRocm93IEVycm9yKGEoMTYzKSl9UHR8fG4uZmxhZ3MmNTEyJiZ2byhuKX1jYXRjaChyZSl7b3QobixuLnJldHVybixyZSl9fWlmKG49PT10KXtNZT1udWxsO2JyZWFrfWlmKHM9bi5zaWJsaW5nLHMhPT1udWxsKXtzLnJldHVybj1uLnJldHVybixNZT1zO2JyZWFrfU1lPW4ucmV0dXJufX1mdW5jdGlvbiBuZCh0KXtmb3IoO01lIT09bnVsbDspe3ZhciBuPU1lO2lmKG49PT10KXtNZT1udWxsO2JyZWFrfXZhciBzPW4uc2libGluZztpZihzIT09bnVsbCl7cy5yZXR1cm49bi5yZXR1cm4sTWU9czticmVha31NZT1uLnJldHVybn19ZnVuY3Rpb24gcmQodCl7Zm9yKDtNZSE9PW51bGw7KXt2YXIgbj1NZTt0cnl7c3dpdGNoKG4udGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OnZhciBzPW4ucmV0dXJuO3RyeXtmYSg0LG4pfWNhdGNoKE4pe290KG4scyxOKX1icmVhaztjYXNlIDE6dmFyIGk9bi5zdGF0ZU5vZGU7aWYodHlwZW9mIGkuY29tcG9uZW50RGlkTW91bnQ9PSJmdW5jdGlvbiIpe3ZhciBjPW4ucmV0dXJuO3RyeXtpLmNvbXBvbmVudERpZE1vdW50KCl9Y2F0Y2goTil7b3QobixjLE4pfX12YXIgZj1uLnJldHVybjt0cnl7dm8obil9Y2F0Y2goTil7b3QobixmLE4pfWJyZWFrO2Nhc2UgNTp2YXIgeT1uLnJldHVybjt0cnl7dm8obil9Y2F0Y2goTil7b3Qobix5LE4pfX19Y2F0Y2goTil7b3QobixuLnJldHVybixOKX1pZihuPT09dCl7TWU9bnVsbDticmVha312YXIgYj1uLnNpYmxpbmc7aWYoYiE9PW51bGwpe2IucmV0dXJuPW4ucmV0dXJuLE1lPWI7YnJlYWt9TWU9bi5yZXR1cm59fXZhciBKaD1NYXRoLmNlaWwsZGE9b2UuUmVhY3RDdXJyZW50RGlzcGF0Y2hlcixrbz1vZS5SZWFjdEN1cnJlbnRPd25lcixKdD1vZS5SZWFjdEN1cnJlbnRCYXRjaENvbmZpZyxZZT0wLHd0PW51bGwscHQ9bnVsbCxOdD0wLFZ0PTAsbnM9S24oMCkseXQ9MCxybD1udWxsLHdyPTAscGE9MCxqbz0wLHNsPW51bGwsenQ9bnVsbCxTbz0wLHJzPTEvMCxBbj1udWxsLGhhPSExLE5vPW51bGwsSm49bnVsbCxtYT0hMSxabj1udWxsLGdhPTAsbGw9MCxNbz1udWxsLHhhPS0xLHlhPTA7ZnVuY3Rpb24gRHQoKXtyZXR1cm4oWWUmNikhPT0wP2Z0KCk6eGEhPT0tMT94YTp4YT1mdCgpfWZ1bmN0aW9uIGVyKHQpe3JldHVybih0Lm1vZGUmMSk9PT0wPzE6KFllJjIpIT09MCYmTnQhPT0wP050Ji1OdDpJaC50cmFuc2l0aW9uIT09bnVsbD8oeWE9PT0wJiYoeWE9WWMoKSkseWEpOih0PVplLHQhPT0wfHwodD13aW5kb3cuZXZlbnQsdD10PT09dm9pZCAwPzE2OnN1KHQudHlwZSkpLHQpfWZ1bmN0aW9uIGFuKHQsbixzLGkpe2lmKDUwPGxsKXRocm93IGxsPTAsTW89bnVsbCxFcnJvcihhKDE4NSkpO1RzKHQscyxpKSwoKFllJjIpPT09MHx8dCE9PXd0KSYmKHQ9PT13dCYmKChZZSYyKT09PTAmJihwYXw9cykseXQ9PT00JiZ0cih0LE50KSksRnQodCxpKSxzPT09MSYmWWU9PT0wJiYobi5tb2RlJjEpPT09MCYmKHJzPWZ0KCkrNTAwLEtsJiZxbigpKSl9ZnVuY3Rpb24gRnQodCxuKXt2YXIgcz10LmNhbGxiYWNrTm9kZTtJcCh0LG4pO3ZhciBpPVJsKHQsdD09PXd0P050OjApO2lmKGk9PT0wKXMhPT1udWxsJiZLYyhzKSx0LmNhbGxiYWNrTm9kZT1udWxsLHQuY2FsbGJhY2tQcmlvcml0eT0wO2Vsc2UgaWYobj1pJi1pLHQuY2FsbGJhY2tQcmlvcml0eSE9PW4pe2lmKHMhPW51bGwmJktjKHMpLG49PT0xKXQudGFnPT09MD9EaChsZC5iaW5kKG51bGwsdCkpOkh1KGxkLmJpbmQobnVsbCx0KSksUGgoZnVuY3Rpb24oKXsoWWUmNik9PT0wJiZxbigpfSkscz1udWxsO2Vsc2V7c3dpdGNoKFhjKGkpKXtjYXNlIDE6cz1zaTticmVhaztjYXNlIDQ6cz1WYzticmVhaztjYXNlIDE2OnM9amw7YnJlYWs7Y2FzZSA1MzY4NzA5MTI6cz1xYzticmVhaztkZWZhdWx0OnM9amx9cz1wZChzLHNkLmJpbmQobnVsbCx0KSl9dC5jYWxsYmFja1ByaW9yaXR5PW4sdC5jYWxsYmFja05vZGU9c319ZnVuY3Rpb24gc2QodCxuKXtpZih4YT0tMSx5YT0wLChZZSY2KSE9PTApdGhyb3cgRXJyb3IoYSgzMjcpKTt2YXIgcz10LmNhbGxiYWNrTm9kZTtpZihzcygpJiZ0LmNhbGxiYWNrTm9kZSE9PXMpcmV0dXJuIG51bGw7dmFyIGk9UmwodCx0PT09d3Q/TnQ6MCk7aWYoaT09PTApcmV0dXJuIG51bGw7aWYoKGkmMzApIT09MHx8KGkmdC5leHBpcmVkTGFuZXMpIT09MHx8biluPXZhKHQsaSk7ZWxzZXtuPWk7dmFyIGM9WWU7WWV8PTI7dmFyIGY9aWQoKTsod3QhPT10fHxOdCE9PW4pJiYoQW49bnVsbCxycz1mdCgpKzUwMCxrcih0LG4pKTtkbyB0cnl7dG0oKTticmVha31jYXRjaChiKXthZCh0LGIpfXdoaWxlKCEwKTtIaSgpLGRhLmN1cnJlbnQ9ZixZZT1jLHB0IT09bnVsbD9uPTA6KHd0PW51bGwsTnQ9MCxuPXl0KX1pZihuIT09MCl7aWYobj09PTImJihjPWxpKHQpLGMhPT0wJiYoaT1jLG49Um8odCxjKSkpLG49PT0xKXRocm93IHM9cmwsa3IodCwwKSx0cih0LGkpLEZ0KHQsZnQoKSkscztpZihuPT09Nil0cih0LGkpO2Vsc2V7aWYoYz10LmN1cnJlbnQuYWx0ZXJuYXRlLChpJjMwKT09PTAmJiFaaChjKSYmKG49dmEodCxpKSxuPT09MiYmKGY9bGkodCksZiE9PTAmJihpPWYsbj1Sbyh0LGYpKSksbj09PTEpKXRocm93IHM9cmwsa3IodCwwKSx0cih0LGkpLEZ0KHQsZnQoKSkscztzd2l0Y2godC5maW5pc2hlZFdvcms9Yyx0LmZpbmlzaGVkTGFuZXM9aSxuKXtjYXNlIDA6Y2FzZSAxOnRocm93IEVycm9yKGEoMzQ1KSk7Y2FzZSAyOmpyKHQsenQsQW4pO2JyZWFrO2Nhc2UgMzppZih0cih0LGkpLChpJjEzMDAyMzQyNCk9PT1pJiYobj1Tbys1MDAtZnQoKSwxMDxuKSl7aWYoUmwodCwwKSE9PTApYnJlYWs7aWYoYz10LnN1c3BlbmRlZExhbmVzLChjJmkpIT09aSl7RHQoKSx0LnBpbmdlZExhbmVzfD10LnN1c3BlbmRlZExhbmVzJmM7YnJlYWt9dC50aW1lb3V0SGFuZGxlPUxpKGpyLmJpbmQobnVsbCx0LHp0LEFuKSxuKTticmVha31qcih0LHp0LEFuKTticmVhaztjYXNlIDQ6aWYodHIodCxpKSwoaSY0MTk0MjQwKT09PWkpYnJlYWs7Zm9yKG49dC5ldmVudFRpbWVzLGM9LTE7MDxpOyl7dmFyIHk9MzEtZW4oaSk7Zj0xPDx5LHk9blt5XSx5PmMmJihjPXkpLGkmPX5mfWlmKGk9YyxpPWZ0KCktaSxpPSgxMjA+aT8xMjA6NDgwPmk/NDgwOjEwODA+aT8xMDgwOjE5MjA+aT8xOTIwOjNlMz5pPzNlMzo0MzIwPmk/NDMyMDoxOTYwKkpoKGkvMTk2MCkpLWksMTA8aSl7dC50aW1lb3V0SGFuZGxlPUxpKGpyLmJpbmQobnVsbCx0LHp0LEFuKSxpKTticmVha31qcih0LHp0LEFuKTticmVhaztjYXNlIDU6anIodCx6dCxBbik7YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihhKDMyOSkpfX19cmV0dXJuIEZ0KHQsZnQoKSksdC5jYWxsYmFja05vZGU9PT1zP3NkLmJpbmQobnVsbCx0KTpudWxsfWZ1bmN0aW9uIFJvKHQsbil7dmFyIHM9c2w7cmV0dXJuIHQuY3VycmVudC5tZW1vaXplZFN0YXRlLmlzRGVoeWRyYXRlZCYmKGtyKHQsbikuZmxhZ3N8PTI1NiksdD12YSh0LG4pLHQhPT0yJiYobj16dCx6dD1zLG4hPT1udWxsJiZDbyhuKSksdH1mdW5jdGlvbiBDbyh0KXt6dD09PW51bGw/enQ9dDp6dC5wdXNoLmFwcGx5KHp0LHQpfWZ1bmN0aW9uIFpoKHQpe2Zvcih2YXIgbj10Ozspe2lmKG4uZmxhZ3MmMTYzODQpe3ZhciBzPW4udXBkYXRlUXVldWU7aWYocyE9PW51bGwmJihzPXMuc3RvcmVzLHMhPT1udWxsKSlmb3IodmFyIGk9MDtpPHMubGVuZ3RoO2krKyl7dmFyIGM9c1tpXSxmPWMuZ2V0U25hcHNob3Q7Yz1jLnZhbHVlO3RyeXtpZighdG4oZigpLGMpKXJldHVybiExfWNhdGNoe3JldHVybiExfX19aWYocz1uLmNoaWxkLG4uc3VidHJlZUZsYWdzJjE2Mzg0JiZzIT09bnVsbClzLnJldHVybj1uLG49cztlbHNle2lmKG49PT10KWJyZWFrO2Zvcig7bi5zaWJsaW5nPT09bnVsbDspe2lmKG4ucmV0dXJuPT09bnVsbHx8bi5yZXR1cm49PT10KXJldHVybiEwO249bi5yZXR1cm59bi5zaWJsaW5nLnJldHVybj1uLnJldHVybixuPW4uc2libGluZ319cmV0dXJuITB9ZnVuY3Rpb24gdHIodCxuKXtmb3IobiY9fmpvLG4mPX5wYSx0LnN1c3BlbmRlZExhbmVzfD1uLHQucGluZ2VkTGFuZXMmPX5uLHQ9dC5leHBpcmF0aW9uVGltZXM7MDxuOyl7dmFyIHM9MzEtZW4obiksaT0xPDxzO3Rbc109LTEsbiY9fml9fWZ1bmN0aW9uIGxkKHQpe2lmKChZZSY2KSE9PTApdGhyb3cgRXJyb3IoYSgzMjcpKTtzcygpO3ZhciBuPVJsKHQsMCk7aWYoKG4mMSk9PT0wKXJldHVybiBGdCh0LGZ0KCkpLG51bGw7dmFyIHM9dmEodCxuKTtpZih0LnRhZyE9PTAmJnM9PT0yKXt2YXIgaT1saSh0KTtpIT09MCYmKG49aSxzPVJvKHQsaSkpfWlmKHM9PT0xKXRocm93IHM9cmwsa3IodCwwKSx0cih0LG4pLEZ0KHQsZnQoKSkscztpZihzPT09Nil0aHJvdyBFcnJvcihhKDM0NSkpO3JldHVybiB0LmZpbmlzaGVkV29yaz10LmN1cnJlbnQuYWx0ZXJuYXRlLHQuZmluaXNoZWRMYW5lcz1uLGpyKHQsenQsQW4pLEZ0KHQsZnQoKSksbnVsbH1mdW5jdGlvbiBUbyh0LG4pe3ZhciBzPVllO1llfD0xO3RyeXtyZXR1cm4gdChuKX1maW5hbGx5e1llPXMsWWU9PT0wJiYocnM9ZnQoKSs1MDAsS2wmJnFuKCkpfX1mdW5jdGlvbiBicih0KXtabiE9PW51bGwmJlpuLnRhZz09PTAmJihZZSY2KT09PTAmJnNzKCk7dmFyIG49WWU7WWV8PTE7dmFyIHM9SnQudHJhbnNpdGlvbixpPVplO3RyeXtpZihKdC50cmFuc2l0aW9uPW51bGwsWmU9MSx0KXJldHVybiB0KCl9ZmluYWxseXtaZT1pLEp0LnRyYW5zaXRpb249cyxZZT1uLChZZSY2KT09PTAmJnFuKCl9fWZ1bmN0aW9uIFBvKCl7VnQ9bnMuY3VycmVudCxudChucyl9ZnVuY3Rpb24ga3IodCxuKXt0LmZpbmlzaGVkV29yaz1udWxsLHQuZmluaXNoZWRMYW5lcz0wO3ZhciBzPXQudGltZW91dEhhbmRsZTtpZihzIT09LTEmJih0LnRpbWVvdXRIYW5kbGU9LTEsVGgocykpLHB0IT09bnVsbClmb3Iocz1wdC5yZXR1cm47cyE9PW51bGw7KXt2YXIgaT1zO3N3aXRjaChCaShpKSxpLnRhZyl7Y2FzZSAxOmk9aS50eXBlLmNoaWxkQ29udGV4dFR5cGVzLGkhPW51bGwmJlVsKCk7YnJlYWs7Y2FzZSAzOlpyKCksbnQoX3QpLG50KFJ0KSxRaSgpO2JyZWFrO2Nhc2UgNTpZaShpKTticmVhaztjYXNlIDQ6WnIoKTticmVhaztjYXNlIDEzOm50KGF0KTticmVhaztjYXNlIDE5Om50KGF0KTticmVhaztjYXNlIDEwOlVpKGkudHlwZS5fY29udGV4dCk7YnJlYWs7Y2FzZSAyMjpjYXNlIDIzOlBvKCl9cz1zLnJldHVybn1pZih3dD10LHB0PXQ9bnIodC5jdXJyZW50LG51bGwpLE50PVZ0PW4seXQ9MCxybD1udWxsLGpvPXBhPXdyPTAsenQ9c2w9bnVsbCx4ciE9PW51bGwpe2ZvcihuPTA7bjx4ci5sZW5ndGg7bisrKWlmKHM9eHJbbl0saT1zLmludGVybGVhdmVkLGkhPT1udWxsKXtzLmludGVybGVhdmVkPW51bGw7dmFyIGM9aS5uZXh0LGY9cy5wZW5kaW5nO2lmKGYhPT1udWxsKXt2YXIgeT1mLm5leHQ7Zi5uZXh0PWMsaS5uZXh0PXl9cy5wZW5kaW5nPWl9eHI9bnVsbH1yZXR1cm4gdH1mdW5jdGlvbiBhZCh0LG4pe2Rve3ZhciBzPXB0O3RyeXtpZihIaSgpLG5hLmN1cnJlbnQ9YWEscmEpe2Zvcih2YXIgaT1pdC5tZW1vaXplZFN0YXRlO2khPT1udWxsOyl7dmFyIGM9aS5xdWV1ZTtjIT09bnVsbCYmKGMucGVuZGluZz1udWxsKSxpPWkubmV4dH1yYT0hMX1pZih2cj0wLHZ0PXh0PWl0PW51bGwsUXM9ITEsSnM9MCxrby5jdXJyZW50PW51bGwscz09PW51bGx8fHMucmV0dXJuPT09bnVsbCl7eXQ9MSxybD1uLHB0PW51bGw7YnJlYWt9ZTp7dmFyIGY9dCx5PXMucmV0dXJuLGI9cyxOPW47aWYobj1OdCxiLmZsYWdzfD0zMjc2OCxOIT09bnVsbCYmdHlwZW9mIE49PSJvYmplY3QiJiZ0eXBlb2YgTi50aGVuPT0iZnVuY3Rpb24iKXt2YXIgQj1OLGxlPWIsY2U9bGUudGFnO2lmKChsZS5tb2RlJjEpPT09MCYmKGNlPT09MHx8Y2U9PT0xMXx8Y2U9PT0xNSkpe3ZhciByZT1sZS5hbHRlcm5hdGU7cmU/KGxlLnVwZGF0ZVF1ZXVlPXJlLnVwZGF0ZVF1ZXVlLGxlLm1lbW9pemVkU3RhdGU9cmUubWVtb2l6ZWRTdGF0ZSxsZS5sYW5lcz1yZS5sYW5lcyk6KGxlLnVwZGF0ZVF1ZXVlPW51bGwsbGUubWVtb2l6ZWRTdGF0ZT1udWxsKX12YXIgTmU9RWYoeSk7aWYoTmUhPT1udWxsKXtOZS5mbGFncyY9LTI1NyxMZihOZSx5LGIsZixuKSxOZS5tb2RlJjEmJlBmKGYsQixuKSxuPU5lLE49Qjt2YXIgUmU9bi51cGRhdGVRdWV1ZTtpZihSZT09PW51bGwpe3ZhciBDZT1uZXcgU2V0O0NlLmFkZChOKSxuLnVwZGF0ZVF1ZXVlPUNlfWVsc2UgUmUuYWRkKE4pO2JyZWFrIGV9ZWxzZXtpZigobiYxKT09PTApe1BmKGYsQixuKSxFbygpO2JyZWFrIGV9Tj1FcnJvcihhKDQyNikpfX1lbHNlIGlmKHN0JiZiLm1vZGUmMSl7dmFyIGR0PUVmKHkpO2lmKGR0IT09bnVsbCl7KGR0LmZsYWdzJjY1NTM2KT09PTAmJihkdC5mbGFnc3w9MjU2KSxMZihkdCx5LGIsZixuKSwkaShlcyhOLGIpKTticmVhayBlfX1mPU49ZXMoTixiKSx5dCE9PTQmJih5dD0yKSxzbD09PW51bGw/c2w9W2ZdOnNsLnB1c2goZiksZj15O2Rve3N3aXRjaChmLnRhZyl7Y2FzZSAzOmYuZmxhZ3N8PTY1NTM2LG4mPS1uLGYubGFuZXN8PW47dmFyIEU9Q2YoZixOLG4pO2VmKGYsRSk7YnJlYWsgZTtjYXNlIDE6Yj1OO3ZhciBDPWYudHlwZSxEPWYuc3RhdGVOb2RlO2lmKChmLmZsYWdzJjEyOCk9PT0wJiYodHlwZW9mIEMuZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yPT0iZnVuY3Rpb24ifHxEIT09bnVsbCYmdHlwZW9mIEQuY29tcG9uZW50RGlkQ2F0Y2g9PSJmdW5jdGlvbiImJihKbj09PW51bGx8fCFKbi5oYXMoRCkpKSl7Zi5mbGFnc3w9NjU1MzYsbiY9LW4sZi5sYW5lc3w9bjt2YXIgbWU9VGYoZixiLG4pO2VmKGYsbWUpO2JyZWFrIGV9fWY9Zi5yZXR1cm59d2hpbGUoZiE9PW51bGwpfWNkKHMpfWNhdGNoKFRlKXtuPVRlLHB0PT09cyYmcyE9PW51bGwmJihwdD1zPXMucmV0dXJuKTtjb250aW51ZX1icmVha313aGlsZSghMCl9ZnVuY3Rpb24gaWQoKXt2YXIgdD1kYS5jdXJyZW50O3JldHVybiBkYS5jdXJyZW50PWFhLHQ9PT1udWxsP2FhOnR9ZnVuY3Rpb24gRW8oKXsoeXQ9PT0wfHx5dD09PTN8fHl0PT09MikmJih5dD00KSx3dD09PW51bGx8fCh3ciYyNjg0MzU0NTUpPT09MCYmKHBhJjI2ODQzNTQ1NSk9PT0wfHx0cih3dCxOdCl9ZnVuY3Rpb24gdmEodCxuKXt2YXIgcz1ZZTtZZXw9Mjt2YXIgaT1pZCgpOyh3dCE9PXR8fE50IT09bikmJihBbj1udWxsLGtyKHQsbikpO2RvIHRyeXtlbSgpO2JyZWFrfWNhdGNoKGMpe2FkKHQsYyl9d2hpbGUoITApO2lmKEhpKCksWWU9cyxkYS5jdXJyZW50PWkscHQhPT1udWxsKXRocm93IEVycm9yKGEoMjYxKSk7cmV0dXJuIHd0PW51bGwsTnQ9MCx5dH1mdW5jdGlvbiBlbSgpe2Zvcig7cHQhPT1udWxsOylvZChwdCl9ZnVuY3Rpb24gdG0oKXtmb3IoO3B0IT09bnVsbCYmIU1wKCk7KW9kKHB0KX1mdW5jdGlvbiBvZCh0KXt2YXIgbj1kZCh0LmFsdGVybmF0ZSx0LFZ0KTt0Lm1lbW9pemVkUHJvcHM9dC5wZW5kaW5nUHJvcHMsbj09PW51bGw/Y2QodCk6cHQ9bixrby5jdXJyZW50PW51bGx9ZnVuY3Rpb24gY2QodCl7dmFyIG49dDtkb3t2YXIgcz1uLmFsdGVybmF0ZTtpZih0PW4ucmV0dXJuLChuLmZsYWdzJjMyNzY4KT09PTApe2lmKHM9VmgocyxuLFZ0KSxzIT09bnVsbCl7cHQ9cztyZXR1cm59fWVsc2V7aWYocz1xaChzLG4pLHMhPT1udWxsKXtzLmZsYWdzJj0zMjc2NyxwdD1zO3JldHVybn1pZih0IT09bnVsbCl0LmZsYWdzfD0zMjc2OCx0LnN1YnRyZWVGbGFncz0wLHQuZGVsZXRpb25zPW51bGw7ZWxzZXt5dD02LHB0PW51bGw7cmV0dXJufX1pZihuPW4uc2libGluZyxuIT09bnVsbCl7cHQ9bjtyZXR1cm59cHQ9bj10fXdoaWxlKG4hPT1udWxsKTt5dD09PTAmJih5dD01KX1mdW5jdGlvbiBqcih0LG4scyl7dmFyIGk9WmUsYz1KdC50cmFuc2l0aW9uO3RyeXtKdC50cmFuc2l0aW9uPW51bGwsWmU9MSxubSh0LG4scyxpKX1maW5hbGx5e0p0LnRyYW5zaXRpb249YyxaZT1pfXJldHVybiBudWxsfWZ1bmN0aW9uIG5tKHQsbixzLGkpe2RvIHNzKCk7d2hpbGUoWm4hPT1udWxsKTtpZigoWWUmNikhPT0wKXRocm93IEVycm9yKGEoMzI3KSk7cz10LmZpbmlzaGVkV29yazt2YXIgYz10LmZpbmlzaGVkTGFuZXM7aWYocz09PW51bGwpcmV0dXJuIG51bGw7aWYodC5maW5pc2hlZFdvcms9bnVsbCx0LmZpbmlzaGVkTGFuZXM9MCxzPT09dC5jdXJyZW50KXRocm93IEVycm9yKGEoMTc3KSk7dC5jYWxsYmFja05vZGU9bnVsbCx0LmNhbGxiYWNrUHJpb3JpdHk9MDt2YXIgZj1zLmxhbmVzfHMuY2hpbGRMYW5lcztpZihfcCh0LGYpLHQ9PT13dCYmKHB0PXd0PW51bGwsTnQ9MCksKHMuc3VidHJlZUZsYWdzJjIwNjQpPT09MCYmKHMuZmxhZ3MmMjA2NCk9PT0wfHxtYXx8KG1hPSEwLHBkKGpsLGZ1bmN0aW9uKCl7cmV0dXJuIHNzKCksbnVsbH0pKSxmPShzLmZsYWdzJjE1OTkwKSE9PTAsKHMuc3VidHJlZUZsYWdzJjE1OTkwKSE9PTB8fGYpe2Y9SnQudHJhbnNpdGlvbixKdC50cmFuc2l0aW9uPW51bGw7dmFyIHk9WmU7WmU9MTt2YXIgYj1ZZTtZZXw9NCxrby5jdXJyZW50PW51bGwsWGgodCxzKSxaZihzLHQpLGtoKFBpKSxQbD0hIVRpLFBpPVRpPW51bGwsdC5jdXJyZW50PXMsUWgocyksUnAoKSxZZT1iLFplPXksSnQudHJhbnNpdGlvbj1mfWVsc2UgdC5jdXJyZW50PXM7aWYobWEmJihtYT0hMSxabj10LGdhPWMpLGY9dC5wZW5kaW5nTGFuZXMsZj09PTAmJihKbj1udWxsKSxQcChzLnN0YXRlTm9kZSksRnQodCxmdCgpKSxuIT09bnVsbClmb3IoaT10Lm9uUmVjb3ZlcmFibGVFcnJvcixzPTA7czxuLmxlbmd0aDtzKyspYz1uW3NdLGkoYy52YWx1ZSx7Y29tcG9uZW50U3RhY2s6Yy5zdGFjayxkaWdlc3Q6Yy5kaWdlc3R9KTtpZihoYSl0aHJvdyBoYT0hMSx0PU5vLE5vPW51bGwsdDtyZXR1cm4oZ2EmMSkhPT0wJiZ0LnRhZyE9PTAmJnNzKCksZj10LnBlbmRpbmdMYW5lcywoZiYxKSE9PTA/dD09PU1vP2xsKys6KGxsPTAsTW89dCk6bGw9MCxxbigpLG51bGx9ZnVuY3Rpb24gc3MoKXtpZihabiE9PW51bGwpe3ZhciB0PVhjKGdhKSxuPUp0LnRyYW5zaXRpb24scz1aZTt0cnl7aWYoSnQudHJhbnNpdGlvbj1udWxsLFplPTE2PnQ/MTY6dCxabj09PW51bGwpdmFyIGk9ITE7ZWxzZXtpZih0PVpuLFpuPW51bGwsZ2E9MCwoWWUmNikhPT0wKXRocm93IEVycm9yKGEoMzMxKSk7dmFyIGM9WWU7Zm9yKFllfD00LE1lPXQuY3VycmVudDtNZSE9PW51bGw7KXt2YXIgZj1NZSx5PWYuY2hpbGQ7aWYoKE1lLmZsYWdzJjE2KSE9PTApe3ZhciBiPWYuZGVsZXRpb25zO2lmKGIhPT1udWxsKXtmb3IodmFyIE49MDtOPGIubGVuZ3RoO04rKyl7dmFyIEI9YltOXTtmb3IoTWU9QjtNZSE9PW51bGw7KXt2YXIgbGU9TWU7c3dpdGNoKGxlLnRhZyl7Y2FzZSAwOmNhc2UgMTE6Y2FzZSAxNTpubCg4LGxlLGYpfXZhciBjZT1sZS5jaGlsZDtpZihjZSE9PW51bGwpY2UucmV0dXJuPWxlLE1lPWNlO2Vsc2UgZm9yKDtNZSE9PW51bGw7KXtsZT1NZTt2YXIgcmU9bGUuc2libGluZyxOZT1sZS5yZXR1cm47aWYocWYobGUpLGxlPT09Qil7TWU9bnVsbDticmVha31pZihyZSE9PW51bGwpe3JlLnJldHVybj1OZSxNZT1yZTticmVha31NZT1OZX19fXZhciBSZT1mLmFsdGVybmF0ZTtpZihSZSE9PW51bGwpe3ZhciBDZT1SZS5jaGlsZDtpZihDZSE9PW51bGwpe1JlLmNoaWxkPW51bGw7ZG97dmFyIGR0PUNlLnNpYmxpbmc7Q2Uuc2libGluZz1udWxsLENlPWR0fXdoaWxlKENlIT09bnVsbCl9fU1lPWZ9fWlmKChmLnN1YnRyZWVGbGFncyYyMDY0KSE9PTAmJnkhPT1udWxsKXkucmV0dXJuPWYsTWU9eTtlbHNlIGU6Zm9yKDtNZSE9PW51bGw7KXtpZihmPU1lLChmLmZsYWdzJjIwNDgpIT09MClzd2l0Y2goZi50YWcpe2Nhc2UgMDpjYXNlIDExOmNhc2UgMTU6bmwoOSxmLGYucmV0dXJuKX12YXIgRT1mLnNpYmxpbmc7aWYoRSE9PW51bGwpe0UucmV0dXJuPWYucmV0dXJuLE1lPUU7YnJlYWsgZX1NZT1mLnJldHVybn19dmFyIEM9dC5jdXJyZW50O2ZvcihNZT1DO01lIT09bnVsbDspe3k9TWU7dmFyIEQ9eS5jaGlsZDtpZigoeS5zdWJ0cmVlRmxhZ3MmMjA2NCkhPT0wJiZEIT09bnVsbClELnJldHVybj15LE1lPUQ7ZWxzZSBlOmZvcih5PUM7TWUhPT1udWxsOyl7aWYoYj1NZSwoYi5mbGFncyYyMDQ4KSE9PTApdHJ5e3N3aXRjaChiLnRhZyl7Y2FzZSAwOmNhc2UgMTE6Y2FzZSAxNTpmYSg5LGIpfX1jYXRjaChUZSl7b3QoYixiLnJldHVybixUZSl9aWYoYj09PXkpe01lPW51bGw7YnJlYWsgZX12YXIgbWU9Yi5zaWJsaW5nO2lmKG1lIT09bnVsbCl7bWUucmV0dXJuPWIucmV0dXJuLE1lPW1lO2JyZWFrIGV9TWU9Yi5yZXR1cm59fWlmKFllPWMscW4oKSxnbiYmdHlwZW9mIGduLm9uUG9zdENvbW1pdEZpYmVyUm9vdD09ImZ1bmN0aW9uIil0cnl7Z24ub25Qb3N0Q29tbWl0RmliZXJSb290KFNsLHQpfWNhdGNoe31pPSEwfXJldHVybiBpfWZpbmFsbHl7WmU9cyxKdC50cmFuc2l0aW9uPW59fXJldHVybiExfWZ1bmN0aW9uIHVkKHQsbixzKXtuPWVzKHMsbiksbj1DZih0LG4sMSksdD1Ybih0LG4sMSksbj1EdCgpLHQhPT1udWxsJiYoVHModCwxLG4pLEZ0KHQsbikpfWZ1bmN0aW9uIG90KHQsbixzKXtpZih0LnRhZz09PTMpdWQodCx0LHMpO2Vsc2UgZm9yKDtuIT09bnVsbDspe2lmKG4udGFnPT09Myl7dWQobix0LHMpO2JyZWFrfWVsc2UgaWYobi50YWc9PT0xKXt2YXIgaT1uLnN0YXRlTm9kZTtpZih0eXBlb2Ygbi50eXBlLmdldERlcml2ZWRTdGF0ZUZyb21FcnJvcj09ImZ1bmN0aW9uInx8dHlwZW9mIGkuY29tcG9uZW50RGlkQ2F0Y2g9PSJmdW5jdGlvbiImJihKbj09PW51bGx8fCFKbi5oYXMoaSkpKXt0PWVzKHMsdCksdD1UZihuLHQsMSksbj1YbihuLHQsMSksdD1EdCgpLG4hPT1udWxsJiYoVHMobiwxLHQpLEZ0KG4sdCkpO2JyZWFrfX1uPW4ucmV0dXJufX1mdW5jdGlvbiBybSh0LG4scyl7dmFyIGk9dC5waW5nQ2FjaGU7aSE9PW51bGwmJmkuZGVsZXRlKG4pLG49RHQoKSx0LnBpbmdlZExhbmVzfD10LnN1c3BlbmRlZExhbmVzJnMsd3Q9PT10JiYoTnQmcyk9PT1zJiYoeXQ9PT00fHx5dD09PTMmJihOdCYxMzAwMjM0MjQpPT09TnQmJjUwMD5mdCgpLVNvP2tyKHQsMCk6am98PXMpLEZ0KHQsbil9ZnVuY3Rpb24gZmQodCxuKXtuPT09MCYmKCh0Lm1vZGUmMSk9PT0wP249MToobj1NbCxNbDw8PTEsKE1sJjEzMDAyMzQyNCk9PT0wJiYoTWw9NDE5NDMwNCkpKTt2YXIgcz1EdCgpO3Q9UG4odCxuKSx0IT09bnVsbCYmKFRzKHQsbixzKSxGdCh0LHMpKX1mdW5jdGlvbiBzbSh0KXt2YXIgbj10Lm1lbW9pemVkU3RhdGUscz0wO24hPT1udWxsJiYocz1uLnJldHJ5TGFuZSksZmQodCxzKX1mdW5jdGlvbiBsbSh0LG4pe3ZhciBzPTA7c3dpdGNoKHQudGFnKXtjYXNlIDEzOnZhciBpPXQuc3RhdGVOb2RlLGM9dC5tZW1vaXplZFN0YXRlO2MhPT1udWxsJiYocz1jLnJldHJ5TGFuZSk7YnJlYWs7Y2FzZSAxOTppPXQuc3RhdGVOb2RlO2JyZWFrO2RlZmF1bHQ6dGhyb3cgRXJyb3IoYSgzMTQpKX1pIT09bnVsbCYmaS5kZWxldGUobiksZmQodCxzKX12YXIgZGQ7ZGQ9ZnVuY3Rpb24odCxuLHMpe2lmKHQhPT1udWxsKWlmKHQubWVtb2l6ZWRQcm9wcyE9PW4ucGVuZGluZ1Byb3BzfHxfdC5jdXJyZW50KUJ0PSEwO2Vsc2V7aWYoKHQubGFuZXMmcyk9PT0wJiYobi5mbGFncyYxMjgpPT09MClyZXR1cm4gQnQ9ITEsS2godCxuLHMpO0J0PSh0LmZsYWdzJjEzMTA3MikhPT0wfWVsc2UgQnQ9ITEsc3QmJihuLmZsYWdzJjEwNDg1NzYpIT09MCYmVXUobixxbCxuLmluZGV4KTtzd2l0Y2gobi5sYW5lcz0wLG4udGFnKXtjYXNlIDI6dmFyIGk9bi50eXBlO2NhKHQsbiksdD1uLnBlbmRpbmdQcm9wczt2YXIgYz1LcihuLFJ0LmN1cnJlbnQpO0pyKG4scyksYz1lbyhudWxsLG4saSx0LGMscyk7dmFyIGY9dG8oKTtyZXR1cm4gbi5mbGFnc3w9MSx0eXBlb2YgYz09Im9iamVjdCImJmMhPT1udWxsJiZ0eXBlb2YgYy5yZW5kZXI9PSJmdW5jdGlvbiImJmMuJCR0eXBlb2Y9PT12b2lkIDA/KG4udGFnPTEsbi5tZW1vaXplZFN0YXRlPW51bGwsbi51cGRhdGVRdWV1ZT1udWxsLE90KGkpPyhmPSEwLEdsKG4pKTpmPSExLG4ubWVtb2l6ZWRTdGF0ZT1jLnN0YXRlIT09bnVsbCYmYy5zdGF0ZSE9PXZvaWQgMD9jLnN0YXRlOm51bGwsVmkobiksYy51cGRhdGVyPWlhLG4uc3RhdGVOb2RlPWMsYy5fcmVhY3RJbnRlcm5hbHM9bixpbyhuLGksdCxzKSxuPWZvKG51bGwsbixpLCEwLGYscykpOihuLnRhZz0wLHN0JiZmJiZPaShuKSxBdChudWxsLG4sYyxzKSxuPW4uY2hpbGQpLG47Y2FzZSAxNjppPW4uZWxlbWVudFR5cGU7ZTp7c3dpdGNoKGNhKHQsbiksdD1uLnBlbmRpbmdQcm9wcyxjPWkuX2luaXQsaT1jKGkuX3BheWxvYWQpLG4udHlwZT1pLGM9bi50YWc9aW0oaSksdD1ybihpLHQpLGMpe2Nhc2UgMDpuPXVvKG51bGwsbixpLHQscyk7YnJlYWsgZTtjYXNlIDE6bj1CZihudWxsLG4saSx0LHMpO2JyZWFrIGU7Y2FzZSAxMTpuPUFmKG51bGwsbixpLHQscyk7YnJlYWsgZTtjYXNlIDE0Om49RGYobnVsbCxuLGkscm4oaS50eXBlLHQpLHMpO2JyZWFrIGV9dGhyb3cgRXJyb3IoYSgzMDYsaSwiIikpfXJldHVybiBuO2Nhc2UgMDpyZXR1cm4gaT1uLnR5cGUsYz1uLnBlbmRpbmdQcm9wcyxjPW4uZWxlbWVudFR5cGU9PT1pP2M6cm4oaSxjKSx1byh0LG4saSxjLHMpO2Nhc2UgMTpyZXR1cm4gaT1uLnR5cGUsYz1uLnBlbmRpbmdQcm9wcyxjPW4uZWxlbWVudFR5cGU9PT1pP2M6cm4oaSxjKSxCZih0LG4saSxjLHMpO2Nhc2UgMzplOntpZih6ZihuKSx0PT09bnVsbCl0aHJvdyBFcnJvcihhKDM4NykpO2k9bi5wZW5kaW5nUHJvcHMsZj1uLm1lbW9pemVkU3RhdGUsYz1mLmVsZW1lbnQsWnUodCxuKSxlYShuLGksbnVsbCxzKTt2YXIgeT1uLm1lbW9pemVkU3RhdGU7aWYoaT15LmVsZW1lbnQsZi5pc0RlaHlkcmF0ZWQpaWYoZj17ZWxlbWVudDppLGlzRGVoeWRyYXRlZDohMSxjYWNoZTp5LmNhY2hlLHBlbmRpbmdTdXNwZW5zZUJvdW5kYXJpZXM6eS5wZW5kaW5nU3VzcGVuc2VCb3VuZGFyaWVzLHRyYW5zaXRpb25zOnkudHJhbnNpdGlvbnN9LG4udXBkYXRlUXVldWUuYmFzZVN0YXRlPWYsbi5tZW1vaXplZFN0YXRlPWYsbi5mbGFncyYyNTYpe2M9ZXMoRXJyb3IoYSg0MjMpKSxuKSxuPUZmKHQsbixpLHMsYyk7YnJlYWsgZX1lbHNlIGlmKGkhPT1jKXtjPWVzKEVycm9yKGEoNDI0KSksbiksbj1GZih0LG4saSxzLGMpO2JyZWFrIGV9ZWxzZSBmb3IoS3Q9R24obi5zdGF0ZU5vZGUuY29udGFpbmVySW5mby5maXJzdENoaWxkKSxHdD1uLHN0PSEwLG5uPW51bGwscz1RdShuLG51bGwsaSxzKSxuLmNoaWxkPXM7czspcy5mbGFncz1zLmZsYWdzJi0zfDQwOTYscz1zLnNpYmxpbmc7ZWxzZXtpZihZcigpLGk9PT1jKXtuPUxuKHQsbixzKTticmVhayBlfUF0KHQsbixpLHMpfW49bi5jaGlsZH1yZXR1cm4gbjtjYXNlIDU6cmV0dXJuIG5mKG4pLHQ9PT1udWxsJiZGaShuKSxpPW4udHlwZSxjPW4ucGVuZGluZ1Byb3BzLGY9dCE9PW51bGw/dC5tZW1vaXplZFByb3BzOm51bGwseT1jLmNoaWxkcmVuLEVpKGksYyk/eT1udWxsOmYhPT1udWxsJiZFaShpLGYpJiYobi5mbGFnc3w9MzIpLE9mKHQsbiksQXQodCxuLHkscyksbi5jaGlsZDtjYXNlIDY6cmV0dXJuIHQ9PT1udWxsJiZGaShuKSxudWxsO2Nhc2UgMTM6cmV0dXJuICRmKHQsbixzKTtjYXNlIDQ6cmV0dXJuIHFpKG4sbi5zdGF0ZU5vZGUuY29udGFpbmVySW5mbyksaT1uLnBlbmRpbmdQcm9wcyx0PT09bnVsbD9uLmNoaWxkPVhyKG4sbnVsbCxpLHMpOkF0KHQsbixpLHMpLG4uY2hpbGQ7Y2FzZSAxMTpyZXR1cm4gaT1uLnR5cGUsYz1uLnBlbmRpbmdQcm9wcyxjPW4uZWxlbWVudFR5cGU9PT1pP2M6cm4oaSxjKSxBZih0LG4saSxjLHMpO2Nhc2UgNzpyZXR1cm4gQXQodCxuLG4ucGVuZGluZ1Byb3BzLHMpLG4uY2hpbGQ7Y2FzZSA4OnJldHVybiBBdCh0LG4sbi5wZW5kaW5nUHJvcHMuY2hpbGRyZW4scyksbi5jaGlsZDtjYXNlIDEyOnJldHVybiBBdCh0LG4sbi5wZW5kaW5nUHJvcHMuY2hpbGRyZW4scyksbi5jaGlsZDtjYXNlIDEwOmU6e2lmKGk9bi50eXBlLl9jb250ZXh0LGM9bi5wZW5kaW5nUHJvcHMsZj1uLm1lbW9pemVkUHJvcHMseT1jLnZhbHVlLGV0KFFsLGkuX2N1cnJlbnRWYWx1ZSksaS5fY3VycmVudFZhbHVlPXksZiE9PW51bGwpaWYodG4oZi52YWx1ZSx5KSl7aWYoZi5jaGlsZHJlbj09PWMuY2hpbGRyZW4mJiFfdC5jdXJyZW50KXtuPUxuKHQsbixzKTticmVhayBlfX1lbHNlIGZvcihmPW4uY2hpbGQsZiE9PW51bGwmJihmLnJldHVybj1uKTtmIT09bnVsbDspe3ZhciBiPWYuZGVwZW5kZW5jaWVzO2lmKGIhPT1udWxsKXt5PWYuY2hpbGQ7Zm9yKHZhciBOPWIuZmlyc3RDb250ZXh0O04hPT1udWxsOyl7aWYoTi5jb250ZXh0PT09aSl7aWYoZi50YWc9PT0xKXtOPUVuKC0xLHMmLXMpLE4udGFnPTI7dmFyIEI9Zi51cGRhdGVRdWV1ZTtpZihCIT09bnVsbCl7Qj1CLnNoYXJlZDt2YXIgbGU9Qi5wZW5kaW5nO2xlPT09bnVsbD9OLm5leHQ9TjooTi5uZXh0PWxlLm5leHQsbGUubmV4dD1OKSxCLnBlbmRpbmc9Tn19Zi5sYW5lc3w9cyxOPWYuYWx0ZXJuYXRlLE4hPT1udWxsJiYoTi5sYW5lc3w9cyksR2koZi5yZXR1cm4scyxuKSxiLmxhbmVzfD1zO2JyZWFrfU49Ti5uZXh0fX1lbHNlIGlmKGYudGFnPT09MTApeT1mLnR5cGU9PT1uLnR5cGU/bnVsbDpmLmNoaWxkO2Vsc2UgaWYoZi50YWc9PT0xOCl7aWYoeT1mLnJldHVybix5PT09bnVsbCl0aHJvdyBFcnJvcihhKDM0MSkpO3kubGFuZXN8PXMsYj15LmFsdGVybmF0ZSxiIT09bnVsbCYmKGIubGFuZXN8PXMpLEdpKHkscyxuKSx5PWYuc2libGluZ31lbHNlIHk9Zi5jaGlsZDtpZih5IT09bnVsbCl5LnJldHVybj1mO2Vsc2UgZm9yKHk9Zjt5IT09bnVsbDspe2lmKHk9PT1uKXt5PW51bGw7YnJlYWt9aWYoZj15LnNpYmxpbmcsZiE9PW51bGwpe2YucmV0dXJuPXkucmV0dXJuLHk9ZjticmVha315PXkucmV0dXJufWY9eX1BdCh0LG4sYy5jaGlsZHJlbixzKSxuPW4uY2hpbGR9cmV0dXJuIG47Y2FzZSA5OnJldHVybiBjPW4udHlwZSxpPW4ucGVuZGluZ1Byb3BzLmNoaWxkcmVuLEpyKG4scyksYz1YdChjKSxpPWkoYyksbi5mbGFnc3w9MSxBdCh0LG4saSxzKSxuLmNoaWxkO2Nhc2UgMTQ6cmV0dXJuIGk9bi50eXBlLGM9cm4oaSxuLnBlbmRpbmdQcm9wcyksYz1ybihpLnR5cGUsYyksRGYodCxuLGksYyxzKTtjYXNlIDE1OnJldHVybiBJZih0LG4sbi50eXBlLG4ucGVuZGluZ1Byb3BzLHMpO2Nhc2UgMTc6cmV0dXJuIGk9bi50eXBlLGM9bi5wZW5kaW5nUHJvcHMsYz1uLmVsZW1lbnRUeXBlPT09aT9jOnJuKGksYyksY2EodCxuKSxuLnRhZz0xLE90KGkpPyh0PSEwLEdsKG4pKTp0PSExLEpyKG4scyksTWYobixpLGMpLGlvKG4saSxjLHMpLGZvKG51bGwsbixpLCEwLHQscyk7Y2FzZSAxOTpyZXR1cm4gSGYodCxuLHMpO2Nhc2UgMjI6cmV0dXJuIF9mKHQsbixzKX10aHJvdyBFcnJvcihhKDE1NixuLnRhZykpfTtmdW5jdGlvbiBwZCh0LG4pe3JldHVybiBHYyh0LG4pfWZ1bmN0aW9uIGFtKHQsbixzLGkpe3RoaXMudGFnPXQsdGhpcy5rZXk9cyx0aGlzLnNpYmxpbmc9dGhpcy5jaGlsZD10aGlzLnJldHVybj10aGlzLnN0YXRlTm9kZT10aGlzLnR5cGU9dGhpcy5lbGVtZW50VHlwZT1udWxsLHRoaXMuaW5kZXg9MCx0aGlzLnJlZj1udWxsLHRoaXMucGVuZGluZ1Byb3BzPW4sdGhpcy5kZXBlbmRlbmNpZXM9dGhpcy5tZW1vaXplZFN0YXRlPXRoaXMudXBkYXRlUXVldWU9dGhpcy5tZW1vaXplZFByb3BzPW51bGwsdGhpcy5tb2RlPWksdGhpcy5zdWJ0cmVlRmxhZ3M9dGhpcy5mbGFncz0wLHRoaXMuZGVsZXRpb25zPW51bGwsdGhpcy5jaGlsZExhbmVzPXRoaXMubGFuZXM9MCx0aGlzLmFsdGVybmF0ZT1udWxsfWZ1bmN0aW9uIFp0KHQsbixzLGkpe3JldHVybiBuZXcgYW0odCxuLHMsaSl9ZnVuY3Rpb24gTG8odCl7cmV0dXJuIHQ9dC5wcm90b3R5cGUsISghdHx8IXQuaXNSZWFjdENvbXBvbmVudCl9ZnVuY3Rpb24gaW0odCl7aWYodHlwZW9mIHQ9PSJmdW5jdGlvbiIpcmV0dXJuIExvKHQpPzE6MDtpZih0IT1udWxsKXtpZih0PXQuJCR0eXBlb2YsdD09PUJlKXJldHVybiAxMTtpZih0PT09TGUpcmV0dXJuIDE0fXJldHVybiAyfWZ1bmN0aW9uIG5yKHQsbil7dmFyIHM9dC5hbHRlcm5hdGU7cmV0dXJuIHM9PT1udWxsPyhzPVp0KHQudGFnLG4sdC5rZXksdC5tb2RlKSxzLmVsZW1lbnRUeXBlPXQuZWxlbWVudFR5cGUscy50eXBlPXQudHlwZSxzLnN0YXRlTm9kZT10LnN0YXRlTm9kZSxzLmFsdGVybmF0ZT10LHQuYWx0ZXJuYXRlPXMpOihzLnBlbmRpbmdQcm9wcz1uLHMudHlwZT10LnR5cGUscy5mbGFncz0wLHMuc3VidHJlZUZsYWdzPTAscy5kZWxldGlvbnM9bnVsbCkscy5mbGFncz10LmZsYWdzJjE0NjgwMDY0LHMuY2hpbGRMYW5lcz10LmNoaWxkTGFuZXMscy5sYW5lcz10LmxhbmVzLHMuY2hpbGQ9dC5jaGlsZCxzLm1lbW9pemVkUHJvcHM9dC5tZW1vaXplZFByb3BzLHMubWVtb2l6ZWRTdGF0ZT10Lm1lbW9pemVkU3RhdGUscy51cGRhdGVRdWV1ZT10LnVwZGF0ZVF1ZXVlLG49dC5kZXBlbmRlbmNpZXMscy5kZXBlbmRlbmNpZXM9bj09PW51bGw/bnVsbDp7bGFuZXM6bi5sYW5lcyxmaXJzdENvbnRleHQ6bi5maXJzdENvbnRleHR9LHMuc2libGluZz10LnNpYmxpbmcscy5pbmRleD10LmluZGV4LHMucmVmPXQucmVmLHN9ZnVuY3Rpb24gd2EodCxuLHMsaSxjLGYpe3ZhciB5PTI7aWYoaT10LHR5cGVvZiB0PT0iZnVuY3Rpb24iKUxvKHQpJiYoeT0xKTtlbHNlIGlmKHR5cGVvZiB0PT0ic3RyaW5nIil5PTU7ZWxzZSBlOnN3aXRjaCh0KXtjYXNlIFNlOnJldHVybiBTcihzLmNoaWxkcmVuLGMsZixuKTtjYXNlIGtlOnk9OCxjfD04O2JyZWFrO2Nhc2UgUGU6cmV0dXJuIHQ9WnQoMTIscyxuLGN8MiksdC5lbGVtZW50VHlwZT1QZSx0LmxhbmVzPWYsdDtjYXNlIHplOnJldHVybiB0PVp0KDEzLHMsbixjKSx0LmVsZW1lbnRUeXBlPXplLHQubGFuZXM9Zix0O2Nhc2UgRmU6cmV0dXJuIHQ9WnQoMTkscyxuLGMpLHQuZWxlbWVudFR5cGU9RmUsdC5sYW5lcz1mLHQ7Y2FzZSB3ZTpyZXR1cm4gYmEocyxjLGYsbik7ZGVmYXVsdDppZih0eXBlb2YgdD09Im9iamVjdCImJnQhPT1udWxsKXN3aXRjaCh0LiQkdHlwZW9mKXtjYXNlIEVlOnk9MTA7YnJlYWsgZTtjYXNlIE9lOnk9OTticmVhayBlO2Nhc2UgQmU6eT0xMTticmVhayBlO2Nhc2UgTGU6eT0xNDticmVhayBlO2Nhc2UgamU6eT0xNixpPW51bGw7YnJlYWsgZX10aHJvdyBFcnJvcihhKDEzMCx0PT1udWxsP3Q6dHlwZW9mIHQsIiIpKX1yZXR1cm4gbj1adCh5LHMsbixjKSxuLmVsZW1lbnRUeXBlPXQsbi50eXBlPWksbi5sYW5lcz1mLG59ZnVuY3Rpb24gU3IodCxuLHMsaSl7cmV0dXJuIHQ9WnQoNyx0LGksbiksdC5sYW5lcz1zLHR9ZnVuY3Rpb24gYmEodCxuLHMsaSl7cmV0dXJuIHQ9WnQoMjIsdCxpLG4pLHQuZWxlbWVudFR5cGU9d2UsdC5sYW5lcz1zLHQuc3RhdGVOb2RlPXtpc0hpZGRlbjohMX0sdH1mdW5jdGlvbiBBbyh0LG4scyl7cmV0dXJuIHQ9WnQoNix0LG51bGwsbiksdC5sYW5lcz1zLHR9ZnVuY3Rpb24gRG8odCxuLHMpe3JldHVybiBuPVp0KDQsdC5jaGlsZHJlbiE9PW51bGw/dC5jaGlsZHJlbjpbXSx0LmtleSxuKSxuLmxhbmVzPXMsbi5zdGF0ZU5vZGU9e2NvbnRhaW5lckluZm86dC5jb250YWluZXJJbmZvLHBlbmRpbmdDaGlsZHJlbjpudWxsLGltcGxlbWVudGF0aW9uOnQuaW1wbGVtZW50YXRpb259LG59ZnVuY3Rpb24gb20odCxuLHMsaSxjKXt0aGlzLnRhZz1uLHRoaXMuY29udGFpbmVySW5mbz10LHRoaXMuZmluaXNoZWRXb3JrPXRoaXMucGluZ0NhY2hlPXRoaXMuY3VycmVudD10aGlzLnBlbmRpbmdDaGlsZHJlbj1udWxsLHRoaXMudGltZW91dEhhbmRsZT0tMSx0aGlzLmNhbGxiYWNrTm9kZT10aGlzLnBlbmRpbmdDb250ZXh0PXRoaXMuY29udGV4dD1udWxsLHRoaXMuY2FsbGJhY2tQcmlvcml0eT0wLHRoaXMuZXZlbnRUaW1lcz1haSgwKSx0aGlzLmV4cGlyYXRpb25UaW1lcz1haSgtMSksdGhpcy5lbnRhbmdsZWRMYW5lcz10aGlzLmZpbmlzaGVkTGFuZXM9dGhpcy5tdXRhYmxlUmVhZExhbmVzPXRoaXMuZXhwaXJlZExhbmVzPXRoaXMucGluZ2VkTGFuZXM9dGhpcy5zdXNwZW5kZWRMYW5lcz10aGlzLnBlbmRpbmdMYW5lcz0wLHRoaXMuZW50YW5nbGVtZW50cz1haSgwKSx0aGlzLmlkZW50aWZpZXJQcmVmaXg9aSx0aGlzLm9uUmVjb3ZlcmFibGVFcnJvcj1jLHRoaXMubXV0YWJsZVNvdXJjZUVhZ2VySHlkcmF0aW9uRGF0YT1udWxsfWZ1bmN0aW9uIElvKHQsbixzLGksYyxmLHksYixOKXtyZXR1cm4gdD1uZXcgb20odCxuLHMsYixOKSxuPT09MT8obj0xLGY9PT0hMCYmKG58PTgpKTpuPTAsZj1adCgzLG51bGwsbnVsbCxuKSx0LmN1cnJlbnQ9ZixmLnN0YXRlTm9kZT10LGYubWVtb2l6ZWRTdGF0ZT17ZWxlbWVudDppLGlzRGVoeWRyYXRlZDpzLGNhY2hlOm51bGwsdHJhbnNpdGlvbnM6bnVsbCxwZW5kaW5nU3VzcGVuc2VCb3VuZGFyaWVzOm51bGx9LFZpKGYpLHR9ZnVuY3Rpb24gY20odCxuLHMpe3ZhciBpPTM8YXJndW1lbnRzLmxlbmd0aCYmYXJndW1lbnRzWzNdIT09dm9pZCAwP2FyZ3VtZW50c1szXTpudWxsO3JldHVybnskJHR5cGVvZjp5ZSxrZXk6aT09bnVsbD9udWxsOiIiK2ksY2hpbGRyZW46dCxjb250YWluZXJJbmZvOm4saW1wbGVtZW50YXRpb246c319ZnVuY3Rpb24gaGQodCl7aWYoIXQpcmV0dXJuIFZuO3Q9dC5fcmVhY3RJbnRlcm5hbHM7ZTp7aWYoZHIodCkhPT10fHx0LnRhZyE9PTEpdGhyb3cgRXJyb3IoYSgxNzApKTt2YXIgbj10O2Rve3N3aXRjaChuLnRhZyl7Y2FzZSAzOm49bi5zdGF0ZU5vZGUuY29udGV4dDticmVhayBlO2Nhc2UgMTppZihPdChuLnR5cGUpKXtuPW4uc3RhdGVOb2RlLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWVyZ2VkQ2hpbGRDb250ZXh0O2JyZWFrIGV9fW49bi5yZXR1cm59d2hpbGUobiE9PW51bGwpO3Rocm93IEVycm9yKGEoMTcxKSl9aWYodC50YWc9PT0xKXt2YXIgcz10LnR5cGU7aWYoT3QocykpcmV0dXJuICR1KHQscyxuKX1yZXR1cm4gbn1mdW5jdGlvbiBtZCh0LG4scyxpLGMsZix5LGIsTil7cmV0dXJuIHQ9SW8ocyxpLCEwLHQsYyxmLHksYixOKSx0LmNvbnRleHQ9aGQobnVsbCkscz10LmN1cnJlbnQsaT1EdCgpLGM9ZXIocyksZj1FbihpLGMpLGYuY2FsbGJhY2s9bj8/bnVsbCxYbihzLGYsYyksdC5jdXJyZW50LmxhbmVzPWMsVHModCxjLGkpLEZ0KHQsaSksdH1mdW5jdGlvbiBrYSh0LG4scyxpKXt2YXIgYz1uLmN1cnJlbnQsZj1EdCgpLHk9ZXIoYyk7cmV0dXJuIHM9aGQocyksbi5jb250ZXh0PT09bnVsbD9uLmNvbnRleHQ9czpuLnBlbmRpbmdDb250ZXh0PXMsbj1FbihmLHkpLG4ucGF5bG9hZD17ZWxlbWVudDp0fSxpPWk9PT12b2lkIDA/bnVsbDppLGkhPT1udWxsJiYobi5jYWxsYmFjaz1pKSx0PVhuKGMsbix5KSx0IT09bnVsbCYmKGFuKHQsYyx5LGYpLFpsKHQsYyx5KSkseX1mdW5jdGlvbiBqYSh0KXtpZih0PXQuY3VycmVudCwhdC5jaGlsZClyZXR1cm4gbnVsbDtzd2l0Y2godC5jaGlsZC50YWcpe2Nhc2UgNTpyZXR1cm4gdC5jaGlsZC5zdGF0ZU5vZGU7ZGVmYXVsdDpyZXR1cm4gdC5jaGlsZC5zdGF0ZU5vZGV9fWZ1bmN0aW9uIGdkKHQsbil7aWYodD10Lm1lbW9pemVkU3RhdGUsdCE9PW51bGwmJnQuZGVoeWRyYXRlZCE9PW51bGwpe3ZhciBzPXQucmV0cnlMYW5lO3QucmV0cnlMYW5lPXMhPT0wJiZzPG4/czpufX1mdW5jdGlvbiBfbyh0LG4pe2dkKHQsbiksKHQ9dC5hbHRlcm5hdGUpJiZnZCh0LG4pfWZ1bmN0aW9uIHVtKCl7cmV0dXJuIG51bGx9dmFyIHhkPXR5cGVvZiByZXBvcnRFcnJvcj09ImZ1bmN0aW9uIj9yZXBvcnRFcnJvcjpmdW5jdGlvbih0KXtjb25zb2xlLmVycm9yKHQpfTtmdW5jdGlvbiBPbyh0KXt0aGlzLl9pbnRlcm5hbFJvb3Q9dH1TYS5wcm90b3R5cGUucmVuZGVyPU9vLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24odCl7dmFyIG49dGhpcy5faW50ZXJuYWxSb290O2lmKG49PT1udWxsKXRocm93IEVycm9yKGEoNDA5KSk7a2EodCxuLG51bGwsbnVsbCl9LFNhLnByb3RvdHlwZS51bm1vdW50PU9vLnByb3RvdHlwZS51bm1vdW50PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5faW50ZXJuYWxSb290O2lmKHQhPT1udWxsKXt0aGlzLl9pbnRlcm5hbFJvb3Q9bnVsbDt2YXIgbj10LmNvbnRhaW5lckluZm87YnIoZnVuY3Rpb24oKXtrYShudWxsLHQsbnVsbCxudWxsKX0pLG5bTW5dPW51bGx9fTtmdW5jdGlvbiBTYSh0KXt0aGlzLl9pbnRlcm5hbFJvb3Q9dH1TYS5wcm90b3R5cGUudW5zdGFibGVfc2NoZWR1bGVIeWRyYXRpb249ZnVuY3Rpb24odCl7aWYodCl7dmFyIG49WmMoKTt0PXtibG9ja2VkT246bnVsbCx0YXJnZXQ6dCxwcmlvcml0eTpufTtmb3IodmFyIHM9MDtzPFduLmxlbmd0aCYmbiE9PTAmJm48V25bc10ucHJpb3JpdHk7cysrKTtXbi5zcGxpY2UocywwLHQpLHM9PT0wJiZudSh0KX19O2Z1bmN0aW9uIEJvKHQpe3JldHVybiEoIXR8fHQubm9kZVR5cGUhPT0xJiZ0Lm5vZGVUeXBlIT09OSYmdC5ub2RlVHlwZSE9PTExKX1mdW5jdGlvbiBOYSh0KXtyZXR1cm4hKCF0fHx0Lm5vZGVUeXBlIT09MSYmdC5ub2RlVHlwZSE9PTkmJnQubm9kZVR5cGUhPT0xMSYmKHQubm9kZVR5cGUhPT04fHx0Lm5vZGVWYWx1ZSE9PSIgcmVhY3QtbW91bnQtcG9pbnQtdW5zdGFibGUgIikpfWZ1bmN0aW9uIHlkKCl7fWZ1bmN0aW9uIGZtKHQsbixzLGksYyl7aWYoYyl7aWYodHlwZW9mIGk9PSJmdW5jdGlvbiIpe3ZhciBmPWk7aT1mdW5jdGlvbigpe3ZhciBCPWphKHkpO2YuY2FsbChCKX19dmFyIHk9bWQobixpLHQsMCxudWxsLCExLCExLCIiLHlkKTtyZXR1cm4gdC5fcmVhY3RSb290Q29udGFpbmVyPXksdFtNbl09eS5jdXJyZW50LEhzKHQubm9kZVR5cGU9PT04P3QucGFyZW50Tm9kZTp0KSxicigpLHl9Zm9yKDtjPXQubGFzdENoaWxkOyl0LnJlbW92ZUNoaWxkKGMpO2lmKHR5cGVvZiBpPT0iZnVuY3Rpb24iKXt2YXIgYj1pO2k9ZnVuY3Rpb24oKXt2YXIgQj1qYShOKTtiLmNhbGwoQil9fXZhciBOPUlvKHQsMCwhMSxudWxsLG51bGwsITEsITEsIiIseWQpO3JldHVybiB0Ll9yZWFjdFJvb3RDb250YWluZXI9Tix0W01uXT1OLmN1cnJlbnQsSHModC5ub2RlVHlwZT09PTg/dC5wYXJlbnROb2RlOnQpLGJyKGZ1bmN0aW9uKCl7a2EobixOLHMsaSl9KSxOfWZ1bmN0aW9uIE1hKHQsbixzLGksYyl7dmFyIGY9cy5fcmVhY3RSb290Q29udGFpbmVyO2lmKGYpe3ZhciB5PWY7aWYodHlwZW9mIGM9PSJmdW5jdGlvbiIpe3ZhciBiPWM7Yz1mdW5jdGlvbigpe3ZhciBOPWphKHkpO2IuY2FsbChOKX19a2Eobix5LHQsYyl9ZWxzZSB5PWZtKHMsbix0LGMsaSk7cmV0dXJuIGphKHkpfVFjPWZ1bmN0aW9uKHQpe3N3aXRjaCh0LnRhZyl7Y2FzZSAzOnZhciBuPXQuc3RhdGVOb2RlO2lmKG4uY3VycmVudC5tZW1vaXplZFN0YXRlLmlzRGVoeWRyYXRlZCl7dmFyIHM9Q3Mobi5wZW5kaW5nTGFuZXMpO3MhPT0wJiYoaWkobixzfDEpLEZ0KG4sZnQoKSksKFllJjYpPT09MCYmKHJzPWZ0KCkrNTAwLHFuKCkpKX1icmVhaztjYXNlIDEzOmJyKGZ1bmN0aW9uKCl7dmFyIGk9UG4odCwxKTtpZihpIT09bnVsbCl7dmFyIGM9RHQoKTthbihpLHQsMSxjKX19KSxfbyh0LDEpfX0sb2k9ZnVuY3Rpb24odCl7aWYodC50YWc9PT0xMyl7dmFyIG49UG4odCwxMzQyMTc3MjgpO2lmKG4hPT1udWxsKXt2YXIgcz1EdCgpO2FuKG4sdCwxMzQyMTc3Mjgscyl9X28odCwxMzQyMTc3MjgpfX0sSmM9ZnVuY3Rpb24odCl7aWYodC50YWc9PT0xMyl7dmFyIG49ZXIodCkscz1Qbih0LG4pO2lmKHMhPT1udWxsKXt2YXIgaT1EdCgpO2FuKHMsdCxuLGkpfV9vKHQsbil9fSxaYz1mdW5jdGlvbigpe3JldHVybiBaZX0sZXU9ZnVuY3Rpb24odCxuKXt2YXIgcz1aZTt0cnl7cmV0dXJuIFplPXQsbigpfWZpbmFsbHl7WmU9c319LGVpPWZ1bmN0aW9uKHQsbixzKXtzd2l0Y2gobil7Y2FzZSJpbnB1dCI6aWYoXyh0LHMpLG49cy5uYW1lLHMudHlwZT09PSJyYWRpbyImJm4hPW51bGwpe2ZvcihzPXQ7cy5wYXJlbnROb2RlOylzPXMucGFyZW50Tm9kZTtmb3Iocz1zLnF1ZXJ5U2VsZWN0b3JBbGwoImlucHV0W25hbWU9IitKU09OLnN0cmluZ2lmeSgiIituKSsnXVt0eXBlPSJyYWRpbyJdJyksbj0wO248cy5sZW5ndGg7bisrKXt2YXIgaT1zW25dO2lmKGkhPT10JiZpLmZvcm09PT10LmZvcm0pe3ZhciBjPUhsKGkpO2lmKCFjKXRocm93IEVycm9yKGEoOTApKTt6KGkpLF8oaSxjKX19fWJyZWFrO2Nhc2UidGV4dGFyZWEiOlQodCxzKTticmVhaztjYXNlInNlbGVjdCI6bj1zLnZhbHVlLG4hPW51bGwmJmoodCwhIXMubXVsdGlwbGUsbiwhMSl9fSxCYz1Ubyx6Yz1icjt2YXIgZG09e3VzaW5nQ2xpZW50RW50cnlQb2ludDohMSxFdmVudHM6W0tzLFVyLEhsLF9jLE9jLFRvXX0sYWw9e2ZpbmRGaWJlckJ5SG9zdEluc3RhbmNlOnByLGJ1bmRsZVR5cGU6MCx2ZXJzaW9uOiIxOC4zLjEiLHJlbmRlcmVyUGFja2FnZU5hbWU6InJlYWN0LWRvbSJ9LHBtPXtidW5kbGVUeXBlOmFsLmJ1bmRsZVR5cGUsdmVyc2lvbjphbC52ZXJzaW9uLHJlbmRlcmVyUGFja2FnZU5hbWU6YWwucmVuZGVyZXJQYWNrYWdlTmFtZSxyZW5kZXJlckNvbmZpZzphbC5yZW5kZXJlckNvbmZpZyxvdmVycmlkZUhvb2tTdGF0ZTpudWxsLG92ZXJyaWRlSG9va1N0YXRlRGVsZXRlUGF0aDpudWxsLG92ZXJyaWRlSG9va1N0YXRlUmVuYW1lUGF0aDpudWxsLG92ZXJyaWRlUHJvcHM6bnVsbCxvdmVycmlkZVByb3BzRGVsZXRlUGF0aDpudWxsLG92ZXJyaWRlUHJvcHNSZW5hbWVQYXRoOm51bGwsc2V0RXJyb3JIYW5kbGVyOm51bGwsc2V0U3VzcGVuc2VIYW5kbGVyOm51bGwsc2NoZWR1bGVVcGRhdGU6bnVsbCxjdXJyZW50RGlzcGF0Y2hlclJlZjpvZS5SZWFjdEN1cnJlbnREaXNwYXRjaGVyLGZpbmRIb3N0SW5zdGFuY2VCeUZpYmVyOmZ1bmN0aW9uKHQpe3JldHVybiB0PUhjKHQpLHQ9PT1udWxsP251bGw6dC5zdGF0ZU5vZGV9LGZpbmRGaWJlckJ5SG9zdEluc3RhbmNlOmFsLmZpbmRGaWJlckJ5SG9zdEluc3RhbmNlfHx1bSxmaW5kSG9zdEluc3RhbmNlc0ZvclJlZnJlc2g6bnVsbCxzY2hlZHVsZVJlZnJlc2g6bnVsbCxzY2hlZHVsZVJvb3Q6bnVsbCxzZXRSZWZyZXNoSGFuZGxlcjpudWxsLGdldEN1cnJlbnRGaWJlcjpudWxsLHJlY29uY2lsZXJWZXJzaW9uOiIxOC4zLjEtbmV4dC1mMTMzOGY4MDgwLTIwMjQwNDI2In07aWYodHlwZW9mIF9fUkVBQ1RfREVWVE9PTFNfR0xPQkFMX0hPT0tfXzwidSIpe3ZhciBSYT1fX1JFQUNUX0RFVlRPT0xTX0dMT0JBTF9IT09LX187aWYoIVJhLmlzRGlzYWJsZWQmJlJhLnN1cHBvcnRzRmliZXIpdHJ5e1NsPVJhLmluamVjdChwbSksZ249UmF9Y2F0Y2h7fX1yZXR1cm4gJHQuX19TRUNSRVRfSU5URVJOQUxTX0RPX05PVF9VU0VfT1JfWU9VX1dJTExfQkVfRklSRUQ9ZG0sJHQuY3JlYXRlUG9ydGFsPWZ1bmN0aW9uKHQsbil7dmFyIHM9Mjxhcmd1bWVudHMubGVuZ3RoJiZhcmd1bWVudHNbMl0hPT12b2lkIDA/YXJndW1lbnRzWzJdOm51bGw7aWYoIUJvKG4pKXRocm93IEVycm9yKGEoMjAwKSk7cmV0dXJuIGNtKHQsbixudWxsLHMpfSwkdC5jcmVhdGVSb290PWZ1bmN0aW9uKHQsbil7aWYoIUJvKHQpKXRocm93IEVycm9yKGEoMjk5KSk7dmFyIHM9ITEsaT0iIixjPXhkO3JldHVybiBuIT1udWxsJiYobi51bnN0YWJsZV9zdHJpY3RNb2RlPT09ITAmJihzPSEwKSxuLmlkZW50aWZpZXJQcmVmaXghPT12b2lkIDAmJihpPW4uaWRlbnRpZmllclByZWZpeCksbi5vblJlY292ZXJhYmxlRXJyb3IhPT12b2lkIDAmJihjPW4ub25SZWNvdmVyYWJsZUVycm9yKSksbj1Jbyh0LDEsITEsbnVsbCxudWxsLHMsITEsaSxjKSx0W01uXT1uLmN1cnJlbnQsSHModC5ub2RlVHlwZT09PTg/dC5wYXJlbnROb2RlOnQpLG5ldyBPbyhuKX0sJHQuZmluZERPTU5vZGU9ZnVuY3Rpb24odCl7aWYodD09bnVsbClyZXR1cm4gbnVsbDtpZih0Lm5vZGVUeXBlPT09MSlyZXR1cm4gdDt2YXIgbj10Ll9yZWFjdEludGVybmFscztpZihuPT09dm9pZCAwKXRocm93IHR5cGVvZiB0LnJlbmRlcj09ImZ1bmN0aW9uIj9FcnJvcihhKDE4OCkpOih0PU9iamVjdC5rZXlzKHQpLmpvaW4oIiwiKSxFcnJvcihhKDI2OCx0KSkpO3JldHVybiB0PUhjKG4pLHQ9dD09PW51bGw/bnVsbDp0LnN0YXRlTm9kZSx0fSwkdC5mbHVzaFN5bmM9ZnVuY3Rpb24odCl7cmV0dXJuIGJyKHQpfSwkdC5oeWRyYXRlPWZ1bmN0aW9uKHQsbixzKXtpZighTmEobikpdGhyb3cgRXJyb3IoYSgyMDApKTtyZXR1cm4gTWEobnVsbCx0LG4sITAscyl9LCR0Lmh5ZHJhdGVSb290PWZ1bmN0aW9uKHQsbixzKXtpZighQm8odCkpdGhyb3cgRXJyb3IoYSg0MDUpKTt2YXIgaT1zIT1udWxsJiZzLmh5ZHJhdGVkU291cmNlc3x8bnVsbCxjPSExLGY9IiIseT14ZDtpZihzIT1udWxsJiYocy51bnN0YWJsZV9zdHJpY3RNb2RlPT09ITAmJihjPSEwKSxzLmlkZW50aWZpZXJQcmVmaXghPT12b2lkIDAmJihmPXMuaWRlbnRpZmllclByZWZpeCkscy5vblJlY292ZXJhYmxlRXJyb3IhPT12b2lkIDAmJih5PXMub25SZWNvdmVyYWJsZUVycm9yKSksbj1tZChuLG51bGwsdCwxLHM/P251bGwsYywhMSxmLHkpLHRbTW5dPW4uY3VycmVudCxIcyh0KSxpKWZvcih0PTA7dDxpLmxlbmd0aDt0Kyspcz1pW3RdLGM9cy5fZ2V0VmVyc2lvbixjPWMocy5fc291cmNlKSxuLm11dGFibGVTb3VyY2VFYWdlckh5ZHJhdGlvbkRhdGE9PW51bGw/bi5tdXRhYmxlU291cmNlRWFnZXJIeWRyYXRpb25EYXRhPVtzLGNdOm4ubXV0YWJsZVNvdXJjZUVhZ2VySHlkcmF0aW9uRGF0YS5wdXNoKHMsYyk7cmV0dXJuIG5ldyBTYShuKX0sJHQucmVuZGVyPWZ1bmN0aW9uKHQsbixzKXtpZighTmEobikpdGhyb3cgRXJyb3IoYSgyMDApKTtyZXR1cm4gTWEobnVsbCx0LG4sITEscyl9LCR0LnVubW91bnRDb21wb25lbnRBdE5vZGU9ZnVuY3Rpb24odCl7aWYoIU5hKHQpKXRocm93IEVycm9yKGEoNDApKTtyZXR1cm4gdC5fcmVhY3RSb290Q29udGFpbmVyPyhicihmdW5jdGlvbigpe01hKG51bGwsbnVsbCx0LCExLGZ1bmN0aW9uKCl7dC5fcmVhY3RSb290Q29udGFpbmVyPW51bGwsdFtNbl09bnVsbH0pfSksITApOiExfSwkdC51bnN0YWJsZV9iYXRjaGVkVXBkYXRlcz1UbywkdC51bnN0YWJsZV9yZW5kZXJTdWJ0cmVlSW50b0NvbnRhaW5lcj1mdW5jdGlvbih0LG4scyxpKXtpZighTmEocykpdGhyb3cgRXJyb3IoYSgyMDApKTtpZih0PT1udWxsfHx0Ll9yZWFjdEludGVybmFscz09PXZvaWQgMCl0aHJvdyBFcnJvcihhKDM4KSk7cmV0dXJuIE1hKHQsbixzLCExLGkpfSwkdC52ZXJzaW9uPSIxOC4zLjEtbmV4dC1mMTMzOGY4MDgwLTIwMjQwNDI2IiwkdH12YXIgTWQ7ZnVuY3Rpb24ga20oKXtpZihNZClyZXR1cm4gJG8uZXhwb3J0cztNZD0xO2Z1bmN0aW9uIGUoKXtpZighKHR5cGVvZiBfX1JFQUNUX0RFVlRPT0xTX0dMT0JBTF9IT09LX18+InUifHx0eXBlb2YgX19SRUFDVF9ERVZUT09MU19HTE9CQUxfSE9PS19fLmNoZWNrRENFIT0iZnVuY3Rpb24iKSl0cnl7X19SRUFDVF9ERVZUT09MU19HTE9CQUxfSE9PS19fLmNoZWNrRENFKGUpfWNhdGNoKGwpe2NvbnNvbGUuZXJyb3IobCl9fXJldHVybiBlKCksJG8uZXhwb3J0cz1ibSgpLCRvLmV4cG9ydHN9dmFyIFJkO2Z1bmN0aW9uIGptKCl7aWYoUmQpcmV0dXJuIENhO1JkPTE7dmFyIGU9a20oKTtyZXR1cm4gQ2EuY3JlYXRlUm9vdD1lLmNyZWF0ZVJvb3QsQ2EuaHlkcmF0ZVJvb3Q9ZS5oeWRyYXRlUm9vdCxDYX12YXIgU209am0oKTtjb25zdCBObT1tbShTbSk7dmFyIHg9amMoKTtmdW5jdGlvbiBydCh7dGl0bGU6ZSxjaGlsZHJlbjpsLGNsYXNzTmFtZTphPSIifSl7cmV0dXJuIHIuanN4cygic2VjdGlvbiIse2NsYXNzTmFtZTpgcm91bmRlZC1tZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBwLTMuNSAke2F9YCxjaGlsZHJlbjpbci5qc3goImgyIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgbWItMyB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjJlbV0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjplfSksbF19KX1mdW5jdGlvbiBBZSh7Y2hpbGRyZW46ZSxvbkNsaWNrOmwsZGlzYWJsZWQ6YT0hMSx2YXJpYW50OnU9Imdob3N0IixjbGFzc05hbWU6ZD0iIn0pe3JldHVybiByLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixvbkNsaWNrOmwsZGlzYWJsZWQ6YSxjbGFzc05hbWU6YGJ0bi1hcmNhZGUgcHgtNCBweS0yLjUgdGV4dC1bMTJweF0gJHt1PT09InByaW1hcnkiPyJidG4tcHJpbWFyeSI6ImJ0bi1naG9zdCJ9ICR7ZH1gLGNoaWxkcmVuOmV9KX1mdW5jdGlvbiBBKHtjaGlsZHJlbjplfSl7cmV0dXJuIHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJrYmQiLGNoaWxkcmVuOmV9KX1mdW5jdGlvbiBfZSh7Y2xhc3NOYW1lOmU9ImgtNCB3LTQifSl7cmV0dXJuIHIuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46ci5qc3goInBhdGgiLHtkOiJNNyA0LjV2MTVsMTMtNy41eiJ9KX0pfWZ1bmN0aW9uIGd0KHtjbGFzc05hbWU6ZT0iaC00IHctNCJ9KXtyZXR1cm4gci5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpyLmpzeCgicGF0aCIse2Q6Ik02IDRoNHYxNkg2ek0xNCA0aDR2MTZoLTR6In0pfSl9ZnVuY3Rpb24gVWUoe2NsYXNzTmFtZTplPSJoLTQgdy00In0pe3JldHVybiByLmpzeCgic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJub25lIixzdHJva2U6ImN1cnJlbnRDb2xvciIsc3Ryb2tlV2lkdGg6IjIuNCIsc3Ryb2tlTGluZWNhcDoicm91bmQiLHN0cm9rZUxpbmVqb2luOiJyb3VuZCIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46ci5qc3goInBhdGgiLHtkOiJNMjEuNSAydjZoLTZNMjEuMzQgMTUuNTdhMTAgMTAgMCAxIDEtLjU3LTguMzhsNS42Ny01LjY3In0pfSl9ZnVuY3Rpb24gdW4oe2NsYXNzTmFtZTplPSJoLTQgdy00In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoibm9uZSIsc3Ryb2tlOiJjdXJyZW50Q29sb3IiLHN0cm9rZVdpZHRoOiIyLjIiLHN0cm9rZUxpbmVjYXA6InJvdW5kIixzdHJva2VMaW5lam9pbjoicm91bmQiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgicG9seWdvbiIse3BvaW50czoiMTEgNSA2IDkgMiA5IDIgMTUgNiAxNSAxMSAxOSAxMSA1IixmaWxsOiJjdXJyZW50Q29sb3IifSksci5qc3goInBhdGgiLHtkOiJNMTUuNTQgOC40NmE1IDUgMCAwIDEgMCA3LjA3In0pLHIuanN4KCJwYXRoIix7ZDoiTTE5LjA3IDQuOTNhMTAgMTAgMCAwIDEgMCAxNC4xNCJ9KV19KX1mdW5jdGlvbiBmbih7Y2xhc3NOYW1lOmU9ImgtNCB3LTQifSl7cmV0dXJuIHIuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJub25lIixzdHJva2U6ImN1cnJlbnRDb2xvciIsc3Ryb2tlV2lkdGg6IjIuMiIsc3Ryb2tlTGluZWNhcDoicm91bmQiLHN0cm9rZUxpbmVqb2luOiJyb3VuZCIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJwb2x5Z29uIix7cG9pbnRzOiIxMSA1IDYgOSAyIDkgMiAxNSA2IDE1IDExIDE5IDExIDUiLGZpbGw6ImN1cnJlbnRDb2xvciJ9KSxyLmpzeCgibGluZSIse3gxOiIyMyIseTE6IjkiLHgyOiIxNyIseTI6IjE1IixzdHJva2VXaWR0aDoiMi41In0pLHIuanN4KCJsaW5lIix7eDE6IjE3Iix5MToiOSIseDI6IjIzIix5MjoiMTUiLHN0cm9rZVdpZHRoOiIyLjUifSldfSl9ZnVuY3Rpb24gZG4oe3RpdGxlOmUsb3B0aW9uczpsLHZhbHVlOmEsb25DaGFuZ2U6dSxkaXNhYmxlZDpkPSExLGNsYXNzTmFtZTpvPSIifSl7cmV0dXJuIHIuanN4cyhydCx7dGl0bGU6ZSxjbGFzc05hbWU6byxjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiIsY2hpbGRyZW46bC5tYXAocD0+e2NvbnN0IGg9cC5pZD09PWE7cmV0dXJuIHIuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixkaXNhYmxlZDpkLG9uQ2xpY2s6KCk9PnUocC5pZCksImFyaWEtcHJlc3NlZCI6aCxjbGFzc05hbWU6YGJ0bi1hcmNhZGUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIHB4LTMgcHktMiB0ZXh0LWxlZnQgdGV4dC1bMTJweF0gZGlzYWJsZWQ6Y3Vyc29yLW5vdC1hbGxvd2VkIGRpc2FibGVkOm9wYWNpdHktNjAgJHtoPyJib3JkZXItYW1iZXJnbG93LTUwMCBiZy1hbWJlcmdsb3ctNDAwLzE1IHRleHQtYW1iZXJnbG93LTMwMCI6ImJ0bi1naG9zdCJ9YCxjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtY29sIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QiLGNoaWxkcmVuOnAubGFiZWx9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1bMTBweF0gZm9udC1tZWRpdW0gbm9ybWFsLWNhc2UgdHJhY2tpbmctbm9ybWFsIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOnAudGFnfSldfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZ2FwLTEiLGNoaWxkcmVuOlswLDEsMl0ubWFwKG09PnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBoLTIgdy0yIHJvdW5kZWQtZnVsbCAke208cC5kb3RzP2g/ImJnLWFtYmVyZ2xvdy00MDAiOiJiZy1tb3NzLTQwMCI6ImJnLXBpdC02MDAifWB9LG0pKX0pXX0scC5pZCl9KX0pLGQmJnIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0yIHRleHQtWzEwcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJTcGVlZCBpcyBsb2NrZWQgZHVyaW5nIGEgcnVuLiJ9KV19KX1mdW5jdGlvbiBwbih7YmVzdHM6ZSxvcHRpb25zOmwsYWN0aXZlOmF9KXtyZXR1cm4gci5qc3gocnQse3RpdGxlOiJIaWdoIFNjb3JlcyIsY2hpbGRyZW46ci5qc3goInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yIixjaGlsZHJlbjpsLm1hcCh1PT57Y29uc3QgZD11LmlkPT09YSxvPWVbdS5pZF0/PzA7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6YGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiByb3VuZGVkIGJvcmRlciBweC0yLjUgcHktMS41ICR7ZD8iYm9yZGVyLWFtYmVyZ2xvdy01MDAvNjAgYmctYW1iZXJnbG93LTQwMC8xMCI6ImJvcmRlci1waXQtNjAwIGJnLXBpdC04MDAifWAsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSAke2Q/InRleHQtYW1iZXJnbG93LTMwMCI6InRleHQtbW9zcy0zMDAifWAsY2hpbGRyZW46dS5sYWJlbH0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXNtIGZvbnQtYm9sZCB0YWJ1bGFyLW51bXMgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46b30pXX0sdS5pZCl9KX0pfSl9Y29uc3QgVW89W3tpZDoic25ha2UiLG5hbWU6IlNFUlBFTlRJTkUiLGNvbG9yOiIjYWNmNjY0IixnZW5yZToiQ2xhc3NpYyBzbmFrZSIsZ29hbDoiU3RlZXIgdGhlIHNlcnBlbnQgYXJvdW5kIHRoZSBwaXQgYW5kIGVhdCBhcHBsZXMgdG8gZ3Jvdy4gRXZlcnkgYml0ZSBzY29yZXMg4oCUIGJ1dCBoaXQgYSB3YWxsIG9yIHlvdXIgb3duIHRhaWwgYW5kIHRoZSBydW4gZW5kcy4iLGNvbnRyb2xzOlt7a2V5czpbIuKGkOKGkeKGk+KGkiIsIldBU0QiXSxhY3Rpb246IlN0ZWVyIChpbnB1dHMgcXVldWUsIHNvIGZhc3QgdHVybnMgYXJlIHNhZmUpIn0se2tleXM6WyJTcGFjZSJdLGFjdGlvbjoiU3RhcnQgwrcgcGF1c2UgwrcgcmVzdW1lIn0se2tleXM6WyJSIl0sYWN0aW9uOiJSZXN0YXJ0In0se2tleXM6WyIxIiwiMiIsIjMiXSxhY3Rpb246IlNwZWVkOiBDaGlsbCDCtyBDbGFzc2ljIMK3IFR1cmJvIn1dLHRpcDoiRXZlcnkgNXRoIGFwcGxlIHNwYXducyBhIEdPTERFTiBGUlVJVCB3b3J0aCA1MCDigJQgZ3JhYiBpdCBiZWZvcmUgaXQgYmxpbmtzIG91dC4gVGhlIHNlcnBlbnQgc3BlZWRzIHVwIGFzIGl0IGdyb3dzLiJ9LHtpZDoic2hvb3RlciIsbmFtZToiVkVDVE9SIFNUUklLRSIsY29sb3I6IiM2MmU2ZmYiLGdlbnJlOiJXYXZlIHNob290ZXIiLGdvYWw6IkRlZmVuZCB5b3VyIHNlY3RvciBmcm9tIHdhdmVzIG9mIGdydW50cywgd2VhdmVycyBhbmQgdGFua3MuIFN1cnZpdmUgYXMgbG9uZyBhcyB5b3UgY2FuIOKAlCB0aHJlZSBodWxsIGhpdHMgYW5kIHRoZSBzaGlwIGlzIGRvbmUuIixjb250cm9sczpbe2tleXM6WyJXQVNEIiwi4oaQ4oaR4oaT4oaSIl0sYWN0aW9uOiJGbHkgKGtleWJvYXJkIG9ubHkg4oCUIHRoZSBzaGlwIG5ldmVyIGNoYXNlcyB0aGUgcG9pbnRlcikifSx7a2V5czpbIkhvbGQgU3BhY2UiXSxhY3Rpb246IkNvbnRpbnVvdXMgZmlyZSJ9LHtrZXlzOlsiQ2xpY2siXSxhY3Rpb246IlNpbmdsZSBzaG90IMK3IGhvbGQgZm9yIGF1dG8tZmlyZSJ9LHtrZXlzOlsiUCJdLGFjdGlvbjoiUGF1c2UifV0sdGlwOiJXcmVja2FnZSBkcm9wcyBjYXBzdWxlczogVFJJUExFLCBSQVBJRCBhbmQgU0hJRUxELiBPbiB0b3VjaCBzY3JlZW5zIHVzZSB0aGUgRC1wYWQgcGx1cyB0aGUgYmlnIEZJUkUgYnV0dG9uLiJ9LHtpZDoiYnJpY2siLG5hbWU6IkJSSUNLIFJJT1QiLGNvbG9yOiIjZmY1ZDhmIixnZW5yZToiQnJlYWtvdXQiLGdvYWw6IktlZXAgdGhlIGJhbGwgYWxpdmUgYW5kIHNtYXNoIHRoZSB3YWxsLiBBbWJlciBhbmQgcGluayBicmlja3MgdGFrZSAy4oCTMyBoaXRzLiBMb3NlIGFsbCB5b3VyIGJhbGxzIGFuZCB0aGUgcmlvdCBpcyBvdmVyLiIsY29udHJvbHM6W3trZXlzOlsi4oaQIiwi4oaSIl0sYWN0aW9uOiJNb3ZlIHBhZGRsZSJ9LHtrZXlzOlsiTW91c2UiXSxhY3Rpb246IkhvdmVyIHRvIHN0ZWVyIMK3IGNsaWNrIHRvIGxhdW5jaCJ9LHtrZXlzOlsiU3BhY2UiXSxhY3Rpb246IkxhdW5jaCBiYWxsIn0se2tleXM6WyJUb3VjaCJdLGFjdGlvbjoiRHJhZyB0byBzdGVlciDCtyB0YXAgdG8gbGF1bmNoIn1dLHRpcDoiQ29uc2VjdXRpdmUgYnJpY2sgaGl0cyBidWlsZCBhIGNvbWJvIG11bHRpcGxpZXIgdXAgdG8gw5c2IOKAlCBpdCByZXNldHMgd2hlbiB0aGUgYmFsbCB0b3VjaGVzIHlvdXIgcGFkZGxlLiBDYXBzdWxlczogV0lERSwgTVVMVElCQUxMLCBTTE9XLiJ9LHtpZDoiYmFzZWJhbGwiLG5hbWU6IlNMVUdHRVIgTklHSFQiLGNvbG9yOiIjZjJlZGUwIixnZW5yZToiVGltaW5nIGJhdHRpbmciLGdvYWw6IkZhY2UgdGhlIENQVSBwaXRjaGVyIGFuZCBzd2luZyBhcyB0aGUgYmFsbCBjcm9zc2VzIHRoZSBwbGF0ZS4gRmlsbCB0aGUgYmFzZXMsIHN0cmluZyBoaXRzIHRvZ2V0aGVyIOKAlCB0aHJlZSBvdXRzIGVuZHMgdGhlIG5pZ2h0LiIsY29udHJvbHM6W3trZXlzOlsiU3BhY2UiLCJFbnRlciJdLGFjdGlvbjoiU3dpbmcgKGNsaWNrIG9yIHRhcCB3b3JrcyB0b28pIn0se2tleXM6WyJQIl0sYWN0aW9uOiJQYXVzZSDigJQgcmFpbiBkZWxheSJ9LHtrZXlzOlsiMSIsIjIiLCIzIl0sYWN0aW9uOiJMZWFndWU6IFJvb2tpZSDCtyBNYWpvciDCtyBBbGwtU3RhciJ9XSx0aXA6IlRoZSBBSSBzdHVkaWVzIHlvdXIgdGltaW5nOiBzd2luZyBlYXJseSBhbmQgaXQgZmVlZHMgeW91IG9mZnNwZWVkLCBzd2luZyBsYXRlIGFuZCBpdCBicmluZ3MgaGVhdC4gUGVyZmVjdCBjb250YWN0IGdvZXMgZGVlcC4ifSx7aWQ6InN0YWNrIixuYW1lOiJTS1lXQVJEIixjb2xvcjoiIzNmYzlhNiIsZ2VucmU6IlRvd2VyIHN0YWNrZXIiLGdvYWw6IkRyb3AgZWFjaCBzbGlkaW5nIGJsb2NrIG9udG8gdGhlIHRvd2VyIGJlbG93LiBPdmVyaGFuZyBnZXRzIHNsaWNlZCBhd2F5IOKAlCBtaXNzIGVudGlyZWx5IGFuZCB0aGUgd2hvbGUgdG93ZXIgZmFsbHMuIixjb250cm9sczpbe2tleXM6WyJTcGFjZSIsIkVudGVyIl0sYWN0aW9uOiJEcm9wIHRoZSBibG9jayAodGFwIHRoZSBib2FyZCBvbiB0b3VjaCkifSx7a2V5czpbIlAiXSxhY3Rpb246IlBhdXNlIn0se2tleXM6WyIxIiwiMiIsIjMiXSxhY3Rpb246IldpbmQ6IEJyZWV6ZSDCtyBHYWxlIMK3IFRlbXBlc3QifV0sdGlwOiJMYW5kIHdpdGhpbiB0aGUgZ2xvd2luZyB0b2xlcmFuY2UgZm9yIGEgUEVSRkVDVDogaXQgc25hcHMgYWxpZ25lZCwgcmVncm93cyB0aGUgYmxvY2ssIGFuZCBjaGFpbnMgYSBib251cyBtdWx0aXBsaWVyLiBXYXRjaCBmb3IgbWlkLXNsaWRlIGd1c3RzIG9uIEdhbGUgYW5kIFRlbXBlc3QuIn0se2lkOiJob29wcyIsbmFtZToiSE9PUFNUT1JNIixjb2xvcjoiI2ZmOGM0MiIsZ2VucmU6IkFyY2FkZSBiYXNrZXRiYWxsIixnb2FsOiJTY29yZSBhcyBtYW55IHBvaW50cyBhcyB5b3UgY2FuIGJlZm9yZSB0aGUgc2hvdCBjbG9jayBoaXRzIHplcm8uIFR3byBwb2ludHMgaW5zaWRlIHRoZSBhcmMsIHRocmVlIGJleW9uZCBpdCDigJQgc3dpc2hlcyBhbmQgc3RyZWFrcyBwYXkgZXh0cmEuIixjb250cm9sczpbe2tleXM6WyLihpAiLCLihpIiXSxhY3Rpb246IkFpbSB0aGUgYXJjIn0se2tleXM6WyJIb2xkIFNwYWNlIl0sYWN0aW9uOiJDaGFyZ2UgcG93ZXIg4oCUIHJlbGVhc2UgdG8gc2hvb3QifSx7a2V5czpbIlRvdWNoIl0sYWN0aW9uOiJEcmFnIGJhY2sgb24gdGhlIGJvYXJkIGFuZCByZWxlYXNlIHRvIHNsaW5nIn0se2tleXM6WyJQIl0sYWN0aW9uOiJQYXVzZSJ9XSx0aXA6Ik1ha2UgMysgaW4gYSByb3cgYW5kIHRoZSBiYWxsIGNhdGNoZXMgZmlyZTogeW91ciBtdWx0aXBsaWVyIGp1bXBzIHRvIMOXMywgdGhlbiDDlzQuIFdhdGNoIHRoZSB3aW5kIGZsYWcg4oCUIGFuZCB0aGUgZHJpZnRpbmcgcmltLiJ9LHtpZDoicnVubmVyIixuYW1lOiJORU9OIERSSUZUIixjb2xvcjoiI2ZmNWRhMiIsZ2VucmU6IkVuZGxlc3MgcnVubmVyIixnb2FsOiJTcHJpbnQgdGhlIG5lb24gcm9vZnRvcHMuIEp1bXAgdGhlIHBpbmsgYmFycmllcnMsIHNsaWRlIHVuZGVyIHRoZSBkcm9uZXMsIGNvbGxlY3QgY29pbnMg4oCUIG9uZSB0b3VjaCBlbmRzIHRoZSBydW4uIixjb250cm9sczpbe2tleXM6WyJTcGFjZSIsIuKGkSIsIlciXSxhY3Rpb246Ikp1bXAifSx7a2V5czpbIuKGkyIsIlMiXSxhY3Rpb246IkhvbGQgdG8gc2xpZGUifSx7a2V5czpbIlRvdWNoIl0sYWN0aW9uOiJUYXAgdG8ganVtcCDCtyBzd2lwZSBkb3duIGFuZCBob2xkIHRvIHNsaWRlIn0se2tleXM6WyJQIl0sYWN0aW9uOiJQYXVzZSJ9XSx0aXA6IkNvaW5zIGFyZSB3b3J0aCAyNSBlYWNoIGFuZCBzcGVlZCByYW1wcyB0aGUgbG9uZ2VyIHlvdSBzdXJ2aXZlIOKAlCBtZW1vcml6ZSB0aGUgc2xpZGUtanVtcC1zbGlkZSByaHl0aG0uIn0se2lkOiJibG9ja2ZhbGwiLG5hbWU6IkJMT0NLRkFMTCIsY29sb3I6IiM0ZGQ4YzAiLGdlbnJlOiJGYWxsaW5nIGJsb2NrcyIsZ29hbDoiU2xvdCB0aGUgZmFsbGluZyBwaWVjZXMgaW50byBzb2xpZCBsaW5lcyBhbmQgY2xlYXIgdGhlbS4gVGhlIHN0YWNrIG9ubHkgcmlzZXMg4oCUIHRvcCBvdXQgYW5kIHRoZSB3ZWxsIGlzIHNlYWxlZC4iLGNvbnRyb2xzOlt7a2V5czpbIuKGkCIsIuKGkiJdLGFjdGlvbjoiTW92ZSJ9LHtrZXlzOlsi4oaRIiwiWCJdLGFjdGlvbjoiUm90YXRlIn0se2tleXM6WyJTcGFjZSJdLGFjdGlvbjoiSGFyZCBkcm9wIn0se2tleXM6WyJDIl0sYWN0aW9uOiJIb2xkIHBpZWNlIn0se2tleXM6WyJUb3VjaCJdLGFjdGlvbjoiVGFwIHRvIHJvdGF0ZSDCtyBzd2lwZSB0byBtb3ZlIMK3IHN3aXBlIGRvd24gdG8gZHJvcCJ9XSx0aXA6IkEgUVVBRCAoNCBsaW5lcyBhdCBvbmNlKSBpcyB3b3J0aCA4MDAgw5cgbGV2ZWwsIGFuZCBjaGFpbmVkIGNsZWFycyBhZGQgY29tYm8gYm9udXNlcy4gVGhlIGdob3N0IHBpZWNlIHNob3dzIGV4YWN0bHkgd2hlcmUgeW91J2xsIGxhbmQuIn0se2lkOiJiZWF0IixuYW1lOiJCRUFUIERST1AiLGNvbG9yOiIjYjI4YmZmIixnZW5yZToiUmh5dGhtIixnb2FsOiJIaXQgdGhlIG5vdGVzIGFzIHRoZXkgY3Jvc3MgdGhlIGxpbmUsIGluIHRpbWUgd2l0aCB0aGUgYmVhdC4gS2VlcCB0aGUgZ3Jvb3ZlIG1ldGVyIGFsaXZlIOKAlCBzaXggbWlzc2VzIGVuZHMgdGhlIHNldC4iLGNvbnRyb2xzOlt7a2V5czpbIkQiLCJGIiwiSiIsIksiXSxhY3Rpb246IkxhbmVzIDHigJM0In0se2tleXM6WyLihpDihpPihpHihpIiXSxhY3Rpb246IkxhbmVzIChhbHRlcm5hdGl2ZSkifSx7a2V5czpbIlRvdWNoIl0sYWN0aW9uOiJUYXAgdGhlIGxhbmUgY29sdW1ucyBvciB0aGUgcGFkcyB1bmRlciB0aGUgYm9hcmQifV0sdGlwOiJQRVJGRUNUIHRpbWluZyAowrE2MG1zKSBidWlsZHMgdGhlIG11bHRpcGxpZXIgZmFzdGVzdCDigJQgaXQgY2xpbWJzIGV2ZXJ5IDEyIGNvbWJvIHVwIHRvIMOXNS4gRWFjaCBmaW5pc2hlZCB0cmFjayByYWlzZXMgdGhlIEJQTS4ifSx7aWQ6Im9yYml0YWwiLG5hbWU6Ik9SQklUQUwiLGNvbG9yOiIjN2VmMGM4IixnZW5yZToiR3Jhdml0eSBnb2xmIixnb2FsOiJGbGluZyB0aGUgcG9kIGFjcm9zcyA5IHByb2NlZHVyYWwgaG9sZXMgYW5kIGxhbmQgaXQgaW4gdGhlIGdyZWVuIGJlYWNvbi4gRmV3ZXIgc3Ryb2tlcywgYmlnZ2VyIHNjb3JlIOKAlCBob2xlLWluLW9uZXMgcGF5IGJlc3QuIixjb250cm9sczpbe2tleXM6WyJEcmFnIl0sYWN0aW9uOiJQdWxsIGJhY2sgYW5kIHJlbGVhc2UgdG8gc2xpbmdzaG90In0se2tleXM6WyLihpAiLCLihpIiXSxhY3Rpb246IkZpbmUtdHVuZSBhaW0ifSx7a2V5czpbIuKGkSIsIuKGkyJdLGFjdGlvbjoiQWRqdXN0IHBvd2VyIn0se2tleXM6WyJTcGFjZSJdLGFjdGlvbjoiTGF1bmNoIn0se2tleXM6WyJIIl0sYWN0aW9uOiJSZWNhbGwgdGhlIHBvZCJ9XSx0aXA6IlBsYW5ldCBncmF2aXR5IGJlbmRzIHlvdXIgZmxpZ2h0IOKAlCB1c2UgaXQgdG8gY3VydmUgYXJvdW5kIG9ic3RhY2xlcy4gWW91IGNhbiBib3VuY2Ugb2ZmIHBsYW5ldCBzdXJmYWNlcywgYnV0IGRyaWZ0aW5nIG91dCBvZiBib3VuZHMgY29zdHMgYSBzdHJva2UuIn0se2lkOiJ2YXVsdCIsbmFtZToiTUVNT1JZIFZBVUxUIixjb2xvcjoiI2U4YzU2YSIsZ2VucmU6Ik1lbW9yeSIsZ29hbDoiRmxpcCBjYXJkcyBhbmQgbWF0Y2ggZXZlcnkgcGFpciBiZWZvcmUgdGhlIGNsb2NrIGJlYXRzIHlvdS4gTWF0Y2hlcyBsb2NrIGluIHBsYWNlIOKAlCBtaXNzZXMgbWFrZSB0aGUgdmF1bHQgc2h1ZmZsZSBpdHMgcmVtYWluaW5nIGNhcmRzLiIsY29udHJvbHM6W3trZXlzOlsiVGFwIC8gY2xpY2siXSxhY3Rpb246IkZsaXAgYSBjYXJkIn0se2tleXM6WyLihpDihpHihpPihpIiXSxhY3Rpb246Ik1vdmUgdGhlIGN1cnNvciJ9LHtrZXlzOlsiU3BhY2UiLCJFbnRlciJdLGFjdGlvbjoiRmxpcCB0aGUgY2FyZCBhdCB0aGUgY3Vyc29yIn1dLHRpcDoiQ29uc2VjdXRpdmUgbWF0Y2hlcyBidWlsZCBhIHN0cmVhayBib251cyAoKzQwIHBlciBsaW5rIGluIHRoZSBjaGFpbiksIGFuZCBmaW5pc2hpbmcgdW5kZXIgcGFyIHRpbWUgYWRkcyBhIGJpZyBib251cy4gVGhlIFJvb2tpZSB2YXVsdCBuZXZlciBzaHVmZmxlcy4ifV07ZnVuY3Rpb24gTW0oe29wZW46ZSxhY3RpdmVJZDpsLG9uU2VsZWN0OmEsb25DbG9zZTp1fSl7aWYoeC51c2VFZmZlY3QoKCk9PntpZighZSlyZXR1cm47Y29uc3Qgbz1wPT57aWYocC5rZXk9PT0iRXNjYXBlIil7cC5wcmV2ZW50RGVmYXVsdCgpLHAuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCksdSgpO3JldHVybn0ocC50YXJnZXQ9PT1kb2N1bWVudC5ib2R5fHxwLnRhcmdldD09PWRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkmJihbIiAiLCJFbnRlciIsIkFycm93VXAiLCJBcnJvd0Rvd24iLCJBcnJvd0xlZnQiLCJBcnJvd1JpZ2h0Il0uaW5jbHVkZXMocC5rZXkpPyhwLnByZXZlbnREZWZhdWx0KCkscC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKSk6WyJyIiwicCIsIm0iLCJ3IiwiYSIsInMiLCJkIiwiMSIsIjIiLCIzIl0uaW5jbHVkZXMocC5rZXkudG9Mb3dlckNhc2UoKSkmJnAuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCkpfTtyZXR1cm4gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLG8sITApLCgpPT53aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsbywhMCl9LFtlLHVdKSwhZSlyZXR1cm4gbnVsbDtjb25zdCBkPVVvLmZpbmQobz0+by5pZD09PWwpPz9Vb1swXTtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZpeGVkIGluc2V0LTAgei1bNzBdIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHAtMyBzbTpwLTYiLHJvbGU6ImRpYWxvZyIsImFyaWEtbW9kYWwiOiJ0cnVlIiwiYXJpYS1sYWJlbCI6IkhvdyB0byBwbGF5IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCBiZy1ibGFjay83NSBiYWNrZHJvcC1ibHVyLVszcHhdIixvbkNsaWNrOnUsImFyaWEtaGlkZGVuIjoidHJ1ZSJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIHJlbGF0aXZlIHotMTAgZmxleCBtYXgtaC1bODhkdmhdIHctZnVsbCBtYXgtdy0zeGwgZmxleC1jb2wgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1waXQtNTAwIGJnLXBpdC05MDAgc2hhZG93LVswXzQwcHhfOTBweF8tMjBweF9yZ2JhKDAsMCwwLDAuOSldIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBib3JkZXItYiBib3JkZXItcGl0LTYwMCBweC00IHB5LTMiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJub25lIixjbGFzc05hbWU6ImgtNSB3LTUgdGV4dC1hbWJlcmdsb3ctNDAwIiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbci5qc3goInBhdGgiLHtkOiJNNCA1LjVBMi41IDIuNSAwIDAgMSA2LjUgM0gyMHYxNUg2LjVBMi41IDIuNSAwIDAgMCA0IDIwLjV6IixzdHJva2U6ImN1cnJlbnRDb2xvciIsc3Ryb2tlV2lkdGg6IjEuOCIsc3Ryb2tlTGluZWpvaW46InJvdW5kIn0pLHIuanN4KCJwYXRoIix7ZDoiTTQgMjAuNVY1LjVNOCA3LjVoOE04IDExaDUiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMS44IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KV19KSxyLmpzeCgiaDIiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVsxMXB4XSB0cmFja2luZy1bMC4yZW1dIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IkhPVyBUTyBQTEFZIn0pXX0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjoiQ2xvc2UgZ3VpZGUiLG9uQ2xpY2s6dSxjaGlsZHJlbjpyLmpzeCgic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJub25lIixjbGFzc05hbWU6ImgtNCB3LTQiLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOnIuanN4KCJwYXRoIix7ZDoiTTYgNmwxMiAxMk0xOCA2TDYgMTgiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMi40IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KX0pfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgbWluLWgtMCBmbGV4LTEgbWQ6Z3JpZC1jb2xzLVsxOTZweF8xZnJdIixjaGlsZHJlbjpbci5qc3goIm5hdiIse2NsYXNzTmFtZToibWluLWgtMCBvdmVyZmxvdy15LWF1dG8gYm9yZGVyLWIgYm9yZGVyLXBpdC02MDAgcC0yIG1kOmJvcmRlci1iLTAgbWQ6Ym9yZGVyLXIiLCJhcmlhLWxhYmVsIjoiR2FtZXMiLGNoaWxkcmVuOnIuanN4KCJ1bCIse2NsYXNzTmFtZToiZmxleCBnYXAtMSBvdmVyZmxvdy14LWF1dG8gcGItMSBtZDpmbGV4LWNvbCBtZDpvdmVyZmxvdy12aXNpYmxlIG1kOnBiLTAiLGNoaWxkcmVuOlVvLm1hcChvPT57Y29uc3QgcD1vLmlkPT09ZC5pZDtyZXR1cm4gci5qc3goImxpIix7Y2xhc3NOYW1lOiJzaHJpbmstMCIsY2hpbGRyZW46ci5qc3hzKCJidXR0b24iLHt0eXBlOiJidXR0b24iLG9uQ2xpY2s6KCk9PmEoby5pZCksY2xhc3NOYW1lOiJidG4tYXJjYWRlIGZsZXggdy1mdWxsIGl0ZW1zLWNlbnRlciBnYXAtMiBweC0yLjUgcHktMiB0ZXh0LWxlZnQgdGV4dC1bMTFweF0gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBtZDpweS0xLjUiLHN0eWxlOnA/e2JvcmRlckNvbG9yOm8uY29sb3IsY29sb3I6by5jb2xvcixiYWNrZ3JvdW5kOmAke28uY29sb3J9MTRgfTp2b2lkIDAsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJoLTIgdy0yIHNocmluay0wIHJvdW5kZWQtZnVsbCIsc3R5bGU6e2JhY2tncm91bmQ6by5jb2xvcixib3hTaGFkb3c6YDAgMCA2cHggJHtvLmNvbG9yfWB9fSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6IndoaXRlc3BhY2Utbm93cmFwIixjaGlsZHJlbjpvLm5hbWV9KV19KX0sby5pZCl9KX0pfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im1pbi1oLTAgb3ZlcmZsb3cteS1hdXRvIHAtNCBzbTpwLTUiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctWzAuMjVlbV0iLHN0eWxlOntjb2xvcjpkLmNvbG9yfSxjaGlsZHJlbjpkLmdlbnJlLnRvVXBwZXJDYXNlKCl9KSxyLmpzeCgiaDMiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0xLjUgdGV4dC1sZyIsc3R5bGU6e2NvbG9yOmQuY29sb3IsdGV4dFNoYWRvdzpgMCAwIDIycHggJHtkLmNvbG9yfTU1YH0sY2hpbGRyZW46ZC5uYW1lfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgdGV4dC1zbSBsZWFkaW5nLXJlbGF4ZWQgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZC5nb2FsfSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC01IHRleHQtWzhweF0gdHJhY2tpbmctWzAuMjVlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkNPTlRST0xTIn0pLHIuanN4KCJ1bCIse2NsYXNzTmFtZToibXQtMiBncmlkIGdhcC0yIixjaGlsZHJlbjpkLmNvbnRyb2xzLm1hcCgobyxwKT0+ci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0zIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBzaHJpbmstMCBmbGV4LXdyYXAgZ2FwLTEiLGNoaWxkcmVuOm8ua2V5cy5tYXAoaD0+ci5qc3goQSx7Y2hpbGRyZW46aH0saCkpfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcmlnaHQgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46by5hY3Rpb259KV19LHApKX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJtdC01IHJvdW5kZWQtci1tZCBib3JkZXItbC00IGJnLXBpdC04MDAvODAgcHgtMyBweS0yLjUiLHN0eWxlOntib3JkZXJDb2xvcjpkLmNvbG9yfSxjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLVswLjI1ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJQUk8gVElQIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0xIHRleHQtWzEyLjVweF0gbGVhZGluZy1yZWxheGVkIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmQudGlwfSldfSksci5qc3hzKCJwIix7Y2xhc3NOYW1lOiJtdC01IGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTMgdGV4dC1bMTFweF0gbGVhZGluZy1yZWxheGVkIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOlsiRXZlcnkgY2FydHJpZGdlOiAiLHIuanN4KEEse2NoaWxkcmVuOiJQIn0pLCIgcGF1c2UgwrcgIixyLmpzeChBLHtjaGlsZHJlbjoiUiJ9KSwiIHJlc3RhcnQgwrcgIixyLmpzeChBLHtjaGlsZHJlbjoiTSJ9KSwiIHNvdW5kIMK3ICIsci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgcHJpbWFyeSBhY3Rpb24gwrciLCIgIixyLmpzeChBLHtjaGlsZHJlbjoiMSJ9KSwi4oCTIixyLmpzeChBLHtjaGlsZHJlbjoiMyJ9KSwiIGRpZmZpY3VsdHkgwrcgIixyLmpzeChBLHtjaGlsZHJlbjoiPyJ9KSwiIHJlb3BlbiB0aGlzIGd1aWRlLiBIaWdoIHNjb3JlcyBzYXZlIGF1dG9tYXRpY2FsbHkgcGVyIGRpZmZpY3VsdHkgb24gdGhpcyBkZXZpY2UuIl19KV19KV19KV19KV19KX1jb25zdCB4bD0yMSx5bD0yMSxSbT01LENtPTY1MDAsVG09e2NoaWxsOntsYWJlbDoiQ2hpbGwiLGJhc2U6MTUwLG1pbjo5NixibHVyYjoiQSBsYXp5IGdhcmRlbiBzbmFrZS4iLGRvdHM6MX0sY2xhc3NpYzp7bGFiZWw6IkNsYXNzaWMiLGJhc2U6MTA1LG1pbjo2NixibHVyYjoiVGhlIGFyY2FkZSBzdGFuZGFyZC4iLGRvdHM6Mn0sdHVyYm86e2xhYmVsOiJUdXJibyIsYmFzZTo3MixtaW46NDYsYmx1cmI6IkEgY2FmZmVpbmF0ZWQgdmlwZXIuIixkb3RzOjN9fTtmdW5jdGlvbiBDZChlLGwpe2NvbnN0e2Jhc2U6YSxtaW46dX09VG1bZV07cmV0dXJuIE1hdGgubWF4KHUsTWF0aC5yb3VuZChhKk1hdGgucG93KC45OSxsKSkpfWZ1bmN0aW9uIFBtKGUsbCxhKXtyZXR1cm4gZS5zb21lKHU9PnUueD09PWwmJnUueT09PWEpfWZ1bmN0aW9uIHljKGUpe2NvbnN0IGw9W107Zm9yKGxldCBhPTA7YTx5bDthKyspZm9yKGxldCB1PTA7dTx4bDt1KyspUG0oZSx1LGEpfHxsLnB1c2goe3g6dSx5OmF9KTtyZXR1cm4gbC5sZW5ndGg9PT0wP3t4OjAseTowfTpsW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpsLmxlbmd0aCldfWZ1bmN0aW9uIFRkKCl7Y29uc3QgZT1NYXRoLmZsb29yKHlsLzIpLGw9W3t4OjgseTplfSx7eDo3LHk6ZX0se3g6Nix5OmV9XTtyZXR1cm57c25ha2U6bCxwcmV2OmwubWFwKGE9Pih7Li4uYX0pKSxkaXI6e3g6MSx5OjB9LHF1ZXVlOltdLGZvb2Q6eWMobCksZ29sZGVuOm51bGwsZWF0ZW46MCxhY2M6MCxsYXN0OjAsbGFzdEVhdEF0Oi05OTk5OSxkZWF0aEF0OjAsc2hha2U6MCxwYXJ0aWNsZXM6W10sZmxvYXRlcnM6W119fWZ1bmN0aW9uIEVtKGUsbCl7Zm9yKDtlLnF1ZXVlLmxlbmd0aDspe2NvbnN0IHY9ZS5xdWV1ZS5zaGlmdCgpLHc9di54PT09ZS5kaXIueCYmdi55PT09ZS5kaXIueSxNPXYueD09PS1lLmRpci54JiZ2Lnk9PT0tZS5kaXIueTtpZighdyYmIU0pe2UuZGlyPXY7YnJlYWt9fWNvbnN0IGE9ZS5zbmFrZVswXSx1PWEueCtlLmRpci54LGQ9YS55K2UuZGlyLnk7aWYodTwwfHxkPDB8fHU+PXhsfHxkPj15bClyZXR1cm57ZGllZDohMCxhdGU6ITEsZ29sZDohMX07Y29uc3Qgbz11PT09ZS5mb29kLngmJmQ9PT1lLmZvb2QueSxwPW8/ZS5zbmFrZTplLnNuYWtlLnNsaWNlKDAsLTEpO2lmKHAuc29tZSh2PT52Lng9PT11JiZ2Lnk9PT1kKSlyZXR1cm57ZGllZDohMCxhdGU6ITEsZ29sZDohMX07Y29uc3QgaD1lLnNuYWtlLm1hcCh2PT4oey4uLnZ9KSk7byYmaC5wdXNoKHsuLi5oW2gubGVuZ3RoLTFdfSk7Y29uc3QgbT1be3g6dSx5OmR9LC4uLnBdO2UucHJldj1oLGUuc25ha2U9bTtsZXQgZz0hMTtyZXR1cm4gbyYmKGUuZWF0ZW4rPTEsZS5sYXN0RWF0QXQ9bCxlLmZvb2Q9eWMoZS5zbmFrZSksZS5lYXRlbiVSbT09PTAmJiFlLmdvbGRlbiYmKGUuZ29sZGVuPXtjZWxsOnljKFsuLi5lLnNuYWtlLGUuZm9vZF0pLGV4cGlyZXM6bCtDbX0pKSxlLmdvbGRlbiYmKHU9PT1lLmdvbGRlbi5jZWxsLngmJmQ9PT1lLmdvbGRlbi5jZWxsLnk/KGc9ITAsZS5sYXN0RWF0QXQ9bCxlLmdvbGRlbj1udWxsKTpsPj1lLmdvbGRlbi5leHBpcmVzJiYoZS5nb2xkZW49bnVsbCkpLHtkaWVkOiExLGF0ZTpvLGdvbGQ6Z319ZnVuY3Rpb24gTG0oZSxsKXtpZihlLnBhcnRpY2xlcy5sZW5ndGgpe2NvbnN0IGE9TWF0aC5wb3coLjk4NSxsLzE2KTtlLnBhcnRpY2xlcz1lLnBhcnRpY2xlcy5maWx0ZXIodT0+KHUubGlmZS09bCk+MCk7Zm9yKGNvbnN0IHUgb2YgZS5wYXJ0aWNsZXMpdS54Kz11LnZ4KmwsdS55Kz11LnZ5KmwsdS52eCo9YSx1LnZ5Kj1hfWlmKGUuZmxvYXRlcnMubGVuZ3RoKXtlLmZsb2F0ZXJzPWUuZmxvYXRlcnMuZmlsdGVyKGE9PihhLmxpZmUtPWwpPjApO2Zvcihjb25zdCBhIG9mIGUuZmxvYXRlcnMpYS55LT0uMDAxNipsfX1mdW5jdGlvbiBQZChlLGwsYSx1PTE0KXtmb3IobGV0IGQ9MDtkPHU7ZCsrKXtjb25zdCBvPU1hdGgucmFuZG9tKCkqTWF0aC5QSSoyLHA9LjAwMytNYXRoLnJhbmRvbSgpKi4wMDksaD00MjArTWF0aC5yYW5kb20oKSozODA7ZS5wYXJ0aWNsZXMucHVzaCh7eDpsLngrLjUseTpsLnkrLjUsdng6TWF0aC5jb3MobykqcCx2eTpNYXRoLnNpbihvKSpwLGxpZmU6aCxtYXhMaWZlOmgsc2l6ZTouMDYrTWF0aC5yYW5kb20oKSouMDksY29sb3I6YVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqYS5sZW5ndGgpXX0pfX1jb25zdCBFZD1bMTcyLDI0NiwxMDBdLExkPVsyMSwxMDIsNjhdO2Z1bmN0aW9uIEFkKGUsbCxhKXtjb25zdCB1PU1hdGgucm91bmQoZVswXSsobFswXS1lWzBdKSphKSxkPU1hdGgucm91bmQoZVsxXSsobFsxXS1lWzFdKSphKSxvPU1hdGgucm91bmQoZVsyXSsobFsyXS1lWzJdKSphKTtyZXR1cm5gcmdiKCR7dX0sJHtkfSwke299KWB9ZnVuY3Rpb24gRGQoZSxsLGEsdT17fSl7Y29uc3QgZD1sLmxlbmd0aDtpZihkPDIpcmV0dXJuO2NvbnN0IG89dS5hbHBoYT8/MTtlLnNhdmUoKSxlLmdsb2JhbEFscGhhPW8sZS5saW5lQ2FwPSJyb3VuZCIsZS5saW5lSm9pbj0icm91bmQiLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8obFtkLTFdLngsbFtkLTFdLnkpO2ZvcihsZXQgUz1kLTI7Uz49MDtTLS0pZS5saW5lVG8obFtTXS54LGxbU10ueSk7ZS5zdHJva2VTdHlsZT0icmdiYSg0LDIwLDEyLDAuOTUpIixlLmxpbmVXaWR0aD1hKi44LGUuc3Ryb2tlKCk7Zm9yKGxldCBTPWQtMTtTPjA7Uy0tKXtjb25zdCBIPTEtUy8oZC0xKTtlLnN0cm9rZVN0eWxlPUFkKExkLEVkLEgpLGUubGluZVdpZHRoPWEqKC40MisuMjYqSCksZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsW1NdLngsbFtTXS55KSxlLmxpbmVUbyhsW1MtMV0ueCxsW1MtMV0ueSksZS5zdHJva2UoKX1jb25zdCBwPWxbMF07bGV0IGg9MSxtPTA7Y29uc3QgZz1wLngtbFsxXS54LHY9cC55LWxbMV0ueSx3PU1hdGguaHlwb3QoZyx2KTt3Pi4wMDEmJihoPWcvdyxtPXYvdyk7Y29uc3QgTT0tbSxSPWg7aWYoZS5zaGFkb3dDb2xvcj0icmdiYSgxNzIsMjQ2LDEwMCwwLjUpIixlLnNoYWRvd0JsdXI9YSouNTUsZS5maWxsU3R5bGU9QWQoTGQsRWQsMSksZS5iZWdpblBhdGgoKSxlLmFyYyhwLngscC55LGEqLjQyLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCx1LnRvbmd1ZSl7ZS5zdHJva2VTdHlsZT0iI2ZmNmI2YiIsZS5saW5lV2lkdGg9TWF0aC5tYXgoMS41LGEqLjA2KTtjb25zdCBTPXAueCtoKmEqLjQsSD1wLnkrbSphKi40LFY9cC54K2gqYSouNzgscT1wLnkrbSphKi43ODtlLmJlZ2luUGF0aCgpLGUubW92ZVRvKFMsSCksZS5saW5lVG8oVixxKSxlLm1vdmVUbyhWLHEpLGUubGluZVRvKFYrKGgqLjUrTSouNSkqYSouMTQscSsobSouNStSKi41KSphKi4xNCksZS5tb3ZlVG8oVixxKSxlLmxpbmVUbyhWKyhoKi41LU0qLjUpKmEqLjE0LHErKG0qLjUtUiouNSkqYSouMTQpLGUuc3Ryb2tlKCl9Y29uc3QgVz1hKi4xNjUsUT1hKi4xO2Zvcihjb25zdCBTIG9mWzEsLTFdKXtjb25zdCBIPXAueCtoKlErTSpXKlMsVj1wLnkrbSpRK1IqVypTO2lmKGUuZmlsbFN0eWxlPSIjZjJmZmYwIixlLmJlZ2luUGF0aCgpLGUuYXJjKEgsVixhKi4xMDUsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLHUuZGVhZCl7ZS5zdHJva2VTdHlsZT0iIzBkMjgxOCIsZS5saW5lV2lkdGg9TWF0aC5tYXgoMSxhKi4wNDUpO2NvbnN0IHE9YSouMDc7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhILXEsVi1xKSxlLmxpbmVUbyhIK3EsVitxKSxlLm1vdmVUbyhIK3EsVi1xKSxlLmxpbmVUbyhILXEsVitxKSxlLnN0cm9rZSgpfWVsc2UgZS5maWxsU3R5bGU9IiMwZDI4MTgiLGUuYmVnaW5QYXRoKCksZS5hcmMoSCtoKmEqLjAzOCxWK20qYSouMDM4LGEqLjA1NSwwLE1hdGguUEkqMiksZS5maWxsKCl9ZS5yZXN0b3JlKCl9ZnVuY3Rpb24gVGEoZSxsLGEsdSxkLG8scCl7bGV0IGg9MTtvJiZwIT09dm9pZCAwJiZwPDE2MDAmJihoPU1hdGguc2luKGQvNzApPjA/MTouMjgpO2NvbnN0IG09MSsuMDgqTWF0aC5zaW4oZC8obz8yMDA6MzAwKSksZz11KihvPy4zNDouMykqbTtlLnNhdmUoKSxlLmdsb2JhbEFscGhhPWgsZS5zaGFkb3dDb2xvcj1vPyJyZ2JhKDI1NSwyMDAsODcsMC44NSkiOiJyZ2JhKDI1NSw5Myw5MywwLjcpIixlLnNoYWRvd0JsdXI9dSouOTtjb25zdCB2PWUuY3JlYXRlUmFkaWFsR3JhZGllbnQobC1nKi4zNSxhLWcqLjQsZyouMTUsbCxhLGcpO2lmKG8/KHYuYWRkQ29sb3JTdG9wKDAsIiNmZmYzYzQiKSx2LmFkZENvbG9yU3RvcCguNTUsIiNmZmQxNjYiKSx2LmFkZENvbG9yU3RvcCgxLCIjZTg5MTJkIikpOih2LmFkZENvbG9yU3RvcCgwLCIjZmZiM2FiIiksdi5hZGRDb2xvclN0b3AoLjUsIiNmZjZiNmIiKSx2LmFkZENvbG9yU3RvcCgxLCIjYzkyZjNmIikpLGUuZmlsbFN0eWxlPXYsZS5iZWdpblBhdGgoKSxlLmFyYyhsLGEsZywwLE1hdGguUEkqMiksZS5maWxsKCksZS5zaGFkb3dCbHVyPTAsZS5zdHJva2VTdHlsZT0iIzdhNGEyMSIsZS5saW5lV2lkdGg9TWF0aC5tYXgoMS41LHUqLjA2KSxlLmxpbmVDYXA9InJvdW5kIixlLmJlZ2luUGF0aCgpLGUubW92ZVRvKGwsYS1nKSxlLmxpbmVUbyhsK2cqLjE1LGEtZy11Ki4xNCksZS5zdHJva2UoKSxlLmZpbGxTdHlsZT1vPyIjZmZlMDhhIjoiIzU5Yzk2YSIsZS5iZWdpblBhdGgoKSxlLmVsbGlwc2UobCtnKi40OCxhLWctdSouMSx1Ki4xMyx1Ki4wNiwtLjYsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuZmlsbFN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNSkiLGUuYmVnaW5QYXRoKCksZS5hcmMobC1nKi4zNSxhLWcqLjQyLGcqLjE2LDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxvKXtlLnN0cm9rZVN0eWxlPSJyZ2JhKDI1NSwyMjQsMTM4LDAuODUpIixlLmxpbmVXaWR0aD1NYXRoLm1heCgxLHUqLjA0NSk7Y29uc3Qgdz1kLzcwMDtmb3IobGV0IE09MDtNPDQ7TSsrKXtjb25zdCBSPXcrTSpNYXRoLlBJLzI7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK01hdGguY29zKFIpKmcqMS40LGErTWF0aC5zaW4oUikqZyoxLjQpLGUubGluZVRvKGwrTWF0aC5jb3MoUikqZyoxLjgsYStNYXRoLnNpbihSKSpnKjEuOCksZS5zdHJva2UoKX19ZS5yZXN0b3JlKCl9ZnVuY3Rpb24gQW0oZSxsLGEsdSxkLG8scCl7aWYoYTwxMHx8dTwxMClyZXR1cm47Y29uc3QgaD1hL3hsO2UuZmlsbFN0eWxlPSIjMGExYTExIixlLmZpbGxSZWN0KDAsMCxhLHUpLGUuZmlsbFN0eWxlPSJyZ2JhKDE3MiwyNDYsMTAwLDAuMDI1KSI7Zm9yKGxldCBnPTA7Zzx5bDtnKyspZm9yKGxldCB2PTA7djx4bDt2KyspditnJjEmJmUuZmlsbFJlY3QodipoLGcqaCxoLGgpO2lmKGUuc3Ryb2tlU3R5bGU9InJnYmEoMTcyLDI0NiwxMDAsMC4wNykiLGUubGluZVdpZHRoPTIsZS5zdHJva2VSZWN0KDEsMSxhLTIsdS0yKSxlLnNhdmUoKSxsLnNoYWtlPi4zPyhlLnRyYW5zbGF0ZSgoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSwoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSksbC5zaGFrZSo9Ljg2KTpsLnNoYWtlPTAsbz09PSJpZGxlIil7Y29uc3QgZz1bXSx3PWQqLjA1JShhK2gqMTApLWgqNTtmb3IobGV0IE09MDtNPDI2O00rKyl7Y29uc3QgUj13LU0qaCouNzI7Zy5wdXNoKHt4OlIseTp1Ki41MitNYXRoLnNpbihSKi4wMitkKi4wMDExKSp1Ki4xN30pfVRhKGUsaCooeGwtNC41KSxoKjQuNSxoLGQsITEpLFRhKGUsaCo0LjUsaCooeWwtNC41KSxoLGQsITApLERkKGUsZyxoLHthbHBoYTouOH0pfWVsc2V7aWYoVGEoZSwobC5mb29kLngrLjUpKmgsKGwuZm9vZC55Ky41KSpoLGgsZCwhMSksbC5nb2xkZW4pe2NvbnN0IHY9bC5nb2xkZW4uY2VsbDtUYShlLCh2LngrLjUpKmgsKHYueSsuNSkqaCxoLGQsITAsbC5nb2xkZW4uZXhwaXJlcy1kKX1jb25zdCBnPWwuc25ha2UubWFwKCh2LHcpPT57Y29uc3QgTT1sLnByZXZbd10/P3Y7cmV0dXJue3g6KE0ueCsodi54LU0ueCkqcCsuNSkqaCx5OihNLnkrKHYueS1NLnkpKnArLjUpKmh9fSk7RGQoZSxnLGgse2RlYWQ6bz09PSJvdmVyIix0b25ndWU6ZC1sLmxhc3RFYXRBdDwyNjB9KX1pZihsLnBhcnRpY2xlcy5sZW5ndGgpe2Zvcihjb25zdCBnIG9mIGwucGFydGljbGVzKXtjb25zdCB2PU1hdGgubWF4KDAsZy5saWZlL2cubWF4TGlmZSk7ZS5nbG9iYWxBbHBoYT12LGUuZmlsbFN0eWxlPWcuY29sb3IsZS5iZWdpblBhdGgoKSxlLmFyYyhnLngqaCxnLnkqaCxNYXRoLm1heCguNixnLnNpemUqaCp2KSwwLE1hdGguUEkqMiksZS5maWxsKCl9ZS5nbG9iYWxBbHBoYT0xfWlmKGwuZmxvYXRlcnMubGVuZ3RoKXtlLnRleHRBbGlnbj0iY2VudGVyIixlLmZvbnQ9YDcwMCAke01hdGgucm91bmQoaCouNjIpfXB4ICJDaGFrcmEgUGV0Y2giLCBzYW5zLXNlcmlmYDtmb3IoY29uc3QgZyBvZiBsLmZsb2F0ZXJzKWUuZ2xvYmFsQWxwaGE9TWF0aC5tYXgoMCxNYXRoLm1pbigxLGcubGlmZS8oZy5tYXhMaWZlKi41NSkpKSxlLmZpbGxTdHlsZT1nLmNvbG9yLGUuZmlsbFRleHQoZy50eHQsZy54KmgsZy55KmgpO2UuZ2xvYmFsQWxwaGE9MX1pZihlLnJlc3RvcmUoKSxsLmRlYXRoQXQ+MCl7Y29uc3QgZz1kLWwuZGVhdGhBdDtnPj0wJiZnPDM1MCYmKGUuZmlsbFN0eWxlPWByZ2JhKDI1NSw3MCw3MCwkey4yNiooMS1nLzM1MCl9KWAsZS5maWxsUmVjdCgwLDAsYSx1KSl9Y29uc3QgbT1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGEvMix1LzIsYSouMzUsYS8yLHUvMixhKi43OCk7bS5hZGRDb2xvclN0b3AoMCwicmdiYSgwLDAsMCwwKSIpLG0uYWRkQ29sb3JTdG9wKDEsInJnYmEoMywxMCw2LDAuNSkiKSxlLmZpbGxTdHlsZT1tLGUuZmlsbFJlY3QoMCwwLGEsdSl9bGV0IGh0PW51bGwsQm49bnVsbCxxYT0hMTtmdW5jdGlvbiBYZSgpe3RyeXtpZighaHQpe2NvbnN0IGU9d2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtpZighZSlyZXR1cm47aHQ9bmV3IGUsQm49aHQuY3JlYXRlR2FpbigpLEJuLmdhaW4udmFsdWU9cWE/MDouMTYsQm4uY29ubmVjdChodC5kZXN0aW5hdGlvbil9aHQuc3RhdGU9PT0ic3VzcGVuZGVkIiYmaHQucmVzdW1lKCl9Y2F0Y2h7fX1mdW5jdGlvbiB1dChlKXtxYT1lLGh0JiZCbiYmQm4uZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoZT8wOi4xNixodC5jdXJyZW50VGltZSwuMDEpfWNvbnN0IF8wPSJhcmNhZGUubXV0ZS52MSI7ZnVuY3Rpb24gaG4oKXt0cnl7cmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKF8wKT09PSIxIn1jYXRjaHtyZXR1cm4hMX19ZnVuY3Rpb24gbW4oZSl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKF8wLGU/IjEiOiIwIil9Y2F0Y2h7fX1mdW5jdGlvbiBLKGUsbCxhLHUsZD0wLG8pe2lmKCFodHx8IUJufHxxYSlyZXR1cm47Y29uc3QgcD1odC5jdXJyZW50VGltZStkLGg9aHQuY3JlYXRlT3NjaWxsYXRvcigpLG09aHQuY3JlYXRlR2FpbigpO2gudHlwZT1hLGguZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGUscCksbyE9PXZvaWQgMCYmaC5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShvLHArbCksbS5nYWluLnNldFZhbHVlQXRUaW1lKDAscCksbS5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHUscCsuMDA4KSxtLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgxZS00LHArbCksaC5jb25uZWN0KG0pLG0uY29ubmVjdChCbiksaC5zdGFydChwKSxoLnN0b3AocCtsKy4wMyl9Y29uc3QgSGU9e2VhdCgpe0soNTQwLC4wOCwic3F1YXJlIiwuNSksSyg4MTAsLjEsInNxdWFyZSIsLjMyLC4wNSl9LGdvbGQoKXtLKDY2MCwuMDgsInNxdWFyZSIsLjQyKSxLKDg4MCwuMDgsInNxdWFyZSIsLjQyLC4wNyksSygxMzIwLC4xOCwidHJpYW5nbGUiLC41LC4xNCl9LGRpZSgpe0soMzIwLC41LCJzYXd0b290aCIsLjUsMCw3MCksSygxNjAsLjYsInNxdWFyZSIsLjI4LC4wNiw0OCl9LHBhdXNlKCl7Syg0NDAsLjA3LCJ0cmlhbmdsZSIsLjQpLEsoMzMwLC4xLCJ0cmlhbmdsZSIsLjMyLC4wNyl9LHJlc3VtZSgpe0soMzMwLC4wNywidHJpYW5nbGUiLC40KSxLKDQ5NSwuMSwidHJpYW5nbGUiLC4zOCwuMDcpfSxzdGFydCgpe0soMzkyLC4wOSwic3F1YXJlIiwuMzgpLEsoNTIzLC4wOSwic3F1YXJlIiwuMzgsLjA5KSxLKDY1OSwuMTYsInNxdWFyZSIsLjQyLC4xOCl9LHNob290KCl7Syg5NDAsLjA1NSwic3F1YXJlIiwuMTQsMCw0ODApfSxoaXQoKXtLKDIyMCwuMDcsInNhd3Rvb3RoIiwuMjIpfSxib29tKCl7SygxNTAsLjI4LCJzYXd0b290aCIsLjQsMCw1NSksSyg5NSwuMzIsInNxdWFyZSIsLjI2LC4wMiw0MCl9LHBvd2VyKCl7Syg1MjAsLjA3LCJzcXVhcmUiLC4zMiksSyg3ODAsLjA4LCJzcXVhcmUiLC4zMiwuMDYpLEsoMTA0MCwuMTIsInRyaWFuZ2xlIiwuMzgsLjEyKX0sd2F2ZSgpe0soNDQwLC4wOSwic3F1YXJlIiwuMyksSyg1NTQsLjA5LCJzcXVhcmUiLC4zLC4xKSxLKDY1OSwuMTYsInNxdWFyZSIsLjMyLC4yKX0scGxheWVySGl0KCl7Syg0ODAsLjMsInNhd3Rvb3RoIiwuNDUsMCwxMTApLEsoMjQwLC4zNCwic3F1YXJlIiwuMjgsLjA0LDcwKX0sc2hpZWxkRG93bigpe0soNzIwLC4xNiwidHJpYW5nbGUiLC40LDAsMjgwKX0scGFkZGxlKCl7SygzMDAsLjA2LCJzcXVhcmUiLC4yLDAsMzYwKX0sd2FsbCgpe0soMjQwLC4wNCwic3F1YXJlIiwuMSwwLDIwMCl9LGJyaWNrKCl7Syg1MDAsLjA2LCJzcXVhcmUiLC4zLDAsMzAwKX0sYnJpY2tIYXJkKCl7SygxODAsLjA1LCJzYXd0b290aCIsLjIsMCwxMjApfSxjb21ibyhlKXtLKDUyMCtNYXRoLm1pbihlLDgpKjYwLC4wNywic3F1YXJlIiwuMjQpfSxsZXZlbENsZWFyKCl7SygzOTIsLjA5LCJzcXVhcmUiLC4zMiksSyg1MjMsLjA5LCJzcXVhcmUiLC4zMiwuMDkpLEsoNjU5LC4wOSwic3F1YXJlIiwuMzIsLjE4KSxLKDc4NCwuMiwic3F1YXJlIiwuMzQsLjI3KX0sbGlmZUxvc3QoKXtLKDQwMCwuMywic2F3dG9vdGgiLC40LDAsOTApLEsoMjAwLC4zNCwic3F1YXJlIiwuMjYsLjA1LDYwKX0sY2F0Y2hQb3dlcigpe0soNjAwLC4wNywic3F1YXJlIiwuMyksSyg5MDAsLjEsInRyaWFuZ2xlIiwuMzQsLjA2KX19O2xldCBQYT1udWxsO2Z1bmN0aW9uIGt0KGUsbCxhPTAsdT0wKXtpZighaHR8fCFCbnx8cWEpcmV0dXJuO2lmKCFQYSl7UGE9aHQuY3JlYXRlQnVmZmVyKDEsaHQuc2FtcGxlUmF0ZSouNSxodC5zYW1wbGVSYXRlKTtjb25zdCBtPVBhLmdldENoYW5uZWxEYXRhKDApO2ZvcihsZXQgZz0wO2c8bS5sZW5ndGg7ZysrKW1bZ109TWF0aC5yYW5kb20oKSoyLTF9Y29uc3QgZD1odC5jdXJyZW50VGltZSthLG89aHQuY3JlYXRlQnVmZmVyU291cmNlKCk7by5idWZmZXI9UGE7Y29uc3QgcD1odC5jcmVhdGVHYWluKCk7cC5nYWluLnNldFZhbHVlQXRUaW1lKDAsZCkscC5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKGwsZCsuMDEyKSxwLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgxZS00LGQrZSk7bGV0IGg9bztpZih1PjApe2NvbnN0IG09aHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7bS50eXBlPSJsb3dwYXNzIixtLmZyZXF1ZW5jeS52YWx1ZT11LG8uY29ubmVjdChtKSxoPW19aC5jb25uZWN0KHApLHAuY29ubmVjdChCbiksby5zdGFydChkKSxvLnN0b3AoZCtlKy4wNSl9Y29uc3Qgb249e2NyYWNrKCl7a3QoLjEzLC41NSwwLDM0MDApLEsoMTkwLC4wOSwic3F1YXJlIiwuMywwLDEyMCl9LGZvdWwoKXtrdCguMDksLjMsMCwyNDAwKSxLKDE1MCwuMDcsInNxdWFyZSIsLjE4LDAsOTApfSx3aGlmZigpe2t0KC4xNSwuMjYsMCw5MDApfSxzdHJpa2UoKXtLKDE5NiwuMTIsInNxdWFyZSIsLjMyLDAsMTMwKSxrdCguMDgsLjIsLjAxLDcwMCl9LGJhbGwoKXtLKDM5MiwuMDgsInRyaWFuZ2xlIiwuMil9LHdhbGsoKXtLKDUyMywuMDgsInNxdWFyZSIsLjI2KSxLKDY1OSwuMSwic3F1YXJlIiwuMjYsLjA4KX0sb3V0KCl7SygzMzAsLjEyLCJzYXd0b290aCIsLjI2LDAsMTgwKSxLKDE2NSwuMTYsInNxdWFyZSIsLjE2LC4wOCwxMDApfSxjaGVlcigpe2t0KC41LC4yLDAsMTUwMCksSyg2NTksLjA5LCJzcXVhcmUiLC4yLC4wMiksSyg3ODQsLjExLCJzcXVhcmUiLC4yLC4xKX0saHIoKXtrdCguOSwuMywwLDE4MDApLEsoNTIzLC4xLCJzcXVhcmUiLC4yOCwwKSxLKDY1OSwuMSwic3F1YXJlIiwuMjgsLjExKSxLKDc4NCwuMSwic3F1YXJlIiwuMjgsLjIyKSxLKDEwNDcsLjI4LCJzcXVhcmUiLC4zLC4zMyl9LHN0cmlrZW91dCgpe0soMzkyLC4xLCJzcXVhcmUiLC4yOCwwLDMwMCksSygyNjIsLjEyLCJzcXVhcmUiLC4yOCwuMSwyMDApLEsoMTk2LC4yMiwic2F3dG9vdGgiLC4yNiwuMiwxMTApfX0sbHM9e3BsYWNlKCl7SygyNDAsLjA3LCJ0cmlhbmdsZSIsLjQyKSxrdCguMDUsLjE2LDAsMTMwMCl9LHBlcmZlY3QoZSl7Y29uc3QgbD01MjAqTWF0aC5wb3coMS4wNTksTWF0aC5taW4oZSwxNCkpO0sobCwuMDksInNxdWFyZSIsLjI4KSxLKGwqMS4yNiwuMDksInNxdWFyZSIsLjI0LC4wNiksSyhsKjEuNSwuMTYsInRyaWFuZ2xlIiwuMywuMTIpfSxzbGljZSgpe0soNzIwLC4wNiwic2F3dG9vdGgiLC4yLDAsMzIwKSxrdCguMDcsLjIyLDAsMjYwMCl9LGd1c3QoKXtrdCguMzQsLjI0LDAsMTUwMCl9LGZhbGwoKXtLKDUyMCwuNSwic2F3dG9vdGgiLC4zNCwwLDkwKSxLKDI2MCwuNTYsInNxdWFyZSIsLjIsLjA1LDYyKX0sc3RhcnQoKXtLKDM5MiwuMDgsInNxdWFyZSIsLjMpLEsoNTIzLC4wOCwic3F1YXJlIiwuMywuMDgpLEsoNzg0LC4xNiwic3F1YXJlIiwuMzIsLjE2KX19LERuPXtsYXVuY2goKXtrdCguMTIsLjIsMCwxNDAwKSxLKDMwMCwuMSwidHJpYW5nbGUiLC4yLDAsNTIwKX0scmltKCl7Syg2NjAsLjA5LCJzcXVhcmUiLC4yNiwwLDU0MCksSyg5OTAsLjA2LCJzcXVhcmUiLC4xNCwuMDEpfSxib2FyZCgpe2t0KC4wOCwuMjQsMCwyZTMpLEsoMjQwLC4wNywic3F1YXJlIiwuMTgpfSxib3VuY2UoKXtLKDE0MCwuMDksInNpbmUiLC4zLDAsOTApfSxzd2lzaCgpe2t0KC4xOCwuMzQsMCwzMjAwKSxLKDUyMywuMDgsInNxdWFyZSIsLjI0LC4wNCksSyg3ODQsLjEsInNxdWFyZSIsLjI0LC4xKSxLKDEwNDcsLjE2LCJ0cmlhbmdsZSIsLjI2LC4xNil9LHNjb3JlKCl7Syg1MjMsLjA5LCJzcXVhcmUiLC4yOCwwKSxLKDY1OSwuMTIsInNxdWFyZSIsLjI2LC4wOSl9LG1pc3MoKXtLKDIyMCwuMTQsInNhd3Rvb3RoIiwuMTYsMCwxNTApfSxidXp6ZXIoKXtLKDIyMCwuNywic2F3dG9vdGgiLC40KSxLKDIyMywuNywic2F3dG9vdGgiLC4zKX0sc3RhcnQoKXtLKDM5MiwuMDksInNxdWFyZSIsLjMpLEsoNTIzLC4wOSwic3F1YXJlIiwuMywuMDkpLEsoNzg0LC4xOCwic3F1YXJlIiwuMzIsLjE4KX19LEVhPXtqdW1wKCl7SygyNDAsLjEyLCJzcXVhcmUiLC4yMiwwLDUyMCl9LGNvaW4oKXtLKDk4OCwuMDYsInNxdWFyZSIsLjIyKSxLKDEzMTksLjEsInNxdWFyZSIsLjIsLjA1KX0saGl0KCl7a3QoLjMsLjUsMCw5MDApLEsoMjAwLC40LCJzYXd0b290aCIsLjQsMCw1NSl9LHNsaWRlKCl7a3QoLjEsLjEyLDAsNzAwKX19LE5yPXttb3ZlKCl7SygzNDAsLjAzLCJzcXVhcmUiLC4xKX0scm90YXRlKCl7Syg0ODAsLjA1LCJzcXVhcmUiLC4xNiwwLDYyMCl9LGxvY2soKXtLKDE3MCwuMDYsInNxdWFyZSIsLjI0KX0sZHJvcCgpe2t0KC4wNywuMjIsMCwxMjAwKSxLKDEzMCwuMDcsInNxdWFyZSIsLjI0KX0sY2xlYXIoZSl7Syg1MjMsLjA4LCJzcXVhcmUiLC4yNiksSyg2NTksLjA4LCJzcXVhcmUiLC4yNiwuMDcpLGU+PTQmJihLKDc4NCwuMDgsInNxdWFyZSIsLjI2LC4xNCksSygxMDQ3LC4yLCJzcXVhcmUiLC4zLC4yMSkpfSxob2xkKCl7Syg2MDAsLjA2LCJ0cmlhbmdsZSIsLjIpfSxvdmVyKCl7SygzOTIsLjEyLCJzcXVhcmUiLC4yOCwwLDMwMCksSygyNjIsLjE0LCJzcXVhcmUiLC4yOCwuMTIsMTgwKSxLKDE3NSwuMywic2F3dG9vdGgiLC4zLC4yNCw4MCl9fSxhcz17dGljayhlKXtLKDE1MCwuMSwic2luZSIsLjUsMCw0OCksZSUyPT09MSYma3QoLjA1LC4xMiwwLDZlMyk7Y29uc3QgYT1bMCwwLDcsMCwzLDAsMTAsN11bZSU4XTtLKDU1Kk1hdGgucG93KDIsYS8xMiksLjE2LCJzcXVhcmUiLC4xKX0scGVyZmVjdCgpe0soMTA0NywuMDYsInNxdWFyZSIsLjIpLEsoMTU2OCwuMSwic3F1YXJlIiwuMTYsLjA0KX0sZ3JlYXQoKXtLKDg4MCwuMDgsInNxdWFyZSIsLjE4KX0sZ29vZCgpe0soNjYwLC4wOCwidHJpYW5nbGUiLC4xOCl9LG1pc3MoKXtLKDIwMCwuMTIsInNhd3Rvb3RoIiwuMiwwLDEyMCl9LHRyYWNrQ2xlYXIoKXtLKDUyMywuMDksInNxdWFyZSIsLjI4KSxLKDY1OSwuMDksInNxdWFyZSIsLjI4LC4wOSksSyg3ODQsLjA5LCJzcXVhcmUiLC4yOCwuMTgpLEsoMTA0NywuMjQsInNxdWFyZSIsLjMsLjI3KX19LG9sPXtsYXVuY2goKXtrdCguMjUsLjMsMCwyNDAwKSxLKDE4MCwuMywic2F3dG9vdGgiLC4yLDAsNDgwKX0sYm91bmNlKCl7SygzMDAsLjA3LCJ0cmlhbmdsZSIsLjI0LDAsMjEwKX0saG9sZSgpe0soNTIzLC4wOSwic3F1YXJlIiwuMjYpLEsoNjU5LC4wOSwic3F1YXJlIiwuMjYsLjA5KSxLKDc4NCwuMiwic3F1YXJlIiwuMywuMTgpfSx1bmRlclBhcigpe0soNjU5LC4wOCwic3F1YXJlIiwuMjQpLEsoODgwLC4wOCwic3F1YXJlIiwuMjQsLjA4KSxLKDEzMTksLjIyLCJzcXVhcmUiLC4yOCwuMTYpfSxsb3N0KCl7SygzMzAsLjIsInNhd3Rvb3RoIiwuMiwwLDExMCl9fSxpcz17ZmxpcCgpe0soNTIwLC4wNSwidHJpYW5nbGUiLC4xNiwwLDcwMCl9LG1hdGNoKCl7Syg2NTksLjA4LCJzcXVhcmUiLC4yKSxLKDk4OCwuMTIsInNxdWFyZSIsLjE4LC4wNyl9LG1pc21hdGNoKCl7SygyMjAsLjE0LCJzYXd0b290aCIsLjIsMCwxNTApfSxzaHVmZmxlKCl7a3QoLjIsLjE2LDAsM2UzKSxLKDQwMCwuMTYsInRyaWFuZ2xlIiwuMTQsMCw4MDApfSx3aW4oKXtLKDUyMywuMSwic3F1YXJlIiwuMjYpLEsoNjU5LC4xLCJzcXVhcmUiLC4yNiwuMSksSyg3ODQsLjEsInNxdWFyZSIsLjI2LC4yKSxLKDEwNDcsLjMsInNxdWFyZSIsLjMsLjMpfX0sTzA9InNlcnBlbnQuYmVzdHMudjEiLEIwPSJzZXJwZW50LmRpZmYudjEiO2Z1bmN0aW9uIERtKCl7Y29uc3QgZT17Y2hpbGw6MCxjbGFzc2ljOjAsdHVyYm86MH07dHJ5e2NvbnN0IGw9bG9jYWxTdG9yYWdlLmdldEl0ZW0oTzApO2lmKCFsKXJldHVybiBlO2NvbnN0IGE9SlNPTi5wYXJzZShsKTtyZXR1cm57Y2hpbGw6TnVtYmVyKGEuY2hpbGwpfHwwLGNsYXNzaWM6TnVtYmVyKGEuY2xhc3NpYyl8fDAsdHVyYm86TnVtYmVyKGEudHVyYm8pfHwwfX1jYXRjaHtyZXR1cm4gZX19ZnVuY3Rpb24gSW0oKXt0cnl7Y29uc3QgZT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShCMCk7aWYoZT09PSJjaGlsbCJ8fGU9PT0iY2xhc3NpYyJ8fGU9PT0idHVyYm8iKXJldHVybiBlfWNhdGNoe31yZXR1cm4iY2xhc3NpYyJ9ZnVuY3Rpb24gX20oKXtyZXR1cm4gaG4oKX1mdW5jdGlvbiBPbSgpe2NvbnN0IGU9eC51c2VSZWYobnVsbCksbD14LnVzZVJlZihudWxsKSxhPXgudXNlUmVmKFRkKCkpLHU9eC51c2VSZWYoe3c6MCxoOjB9KSxkPXgudXNlUmVmKDApLFtvLHBdPXgudXNlU3RhdGUoImlkbGUiKSxoPXgudXNlUmVmKCJpZGxlIiksW20sZ109eC51c2VTdGF0ZSgwKSx2PXgudXNlUmVmKDApLFt3LE1dPXgudXNlU3RhdGUoMyksW1IsV109eC51c2VTdGF0ZSgwKSxbUSxTXT14LnVzZVN0YXRlKCExKSxbSCxWXT14LnVzZVN0YXRlKEltKSxxPXgudXNlUmVmKEgpLFtvZSxaXT14LnVzZVN0YXRlKERtKSx5ZT14LnVzZVJlZihvZSksW1NlLGtlXT14LnVzZVN0YXRlKF9tKSxQZT14LnVzZVJlZihTZSksRWU9eC51c2VDYWxsYmFjaygkPT57aC5jdXJyZW50PSQscCgkKX0sW10pLE9lPXgudXNlQ2FsbGJhY2soKCk9PntkLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGQuY3VycmVudCksZC5jdXJyZW50PTApfSxbXSksQmU9eC51c2VDYWxsYmFjaygkPT57T2UoKSxFZSgicmVhZHkiKSxkLmN1cnJlbnQ9d2luZG93LnNldFRpbWVvdXQoKCk9PntkLmN1cnJlbnQ9MCxoLmN1cnJlbnQ9PT0icmVhZHkiJiZFZSgicnVubmluZyIpfSwkKX0sW09lLEVlXSksemU9eC51c2VDYWxsYmFjaygoKT0+e2EuY3VycmVudD1UZCgpLHYuY3VycmVudD0wLGcoMCksTSgzKSxTKCExKX0sW10pLEZlPXgudXNlQ2FsbGJhY2soKCQsSixoZSk9Pnt2LmN1cnJlbnQrPSQsZyh2LmN1cnJlbnQpLFcoRz0+RysxKSxhLmN1cnJlbnQuZmxvYXRlcnMucHVzaCh7eDpKLngrLjUseTpKLnkrLjIsdHh0OmArJHskfWAsbGlmZTo3NTAsbWF4TGlmZTo3NTAsY29sb3I6aGV9KX0sW10pLExlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCAkPWEuY3VycmVudDskLmRlYXRoQXQ9cGVyZm9ybWFuY2Uubm93KCksJC5zaGFrZT0xNSxIZS5kaWUoKTtjb25zdCBKPXEuY3VycmVudCxoZT12LmN1cnJlbnQ7aWYoaGU+eWUuY3VycmVudFtKXSl7Y29uc3QgdmU9ey4uLnllLmN1cnJlbnQsW0pdOmhlfTt5ZS5jdXJyZW50PXZlLFoodmUpLFMoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShPMCxKU09OLnN0cmluZ2lmeSh2ZSkpfWNhdGNoe319RWUoIm92ZXIiKX0sW0VlXSksamU9eC51c2VDYWxsYmFjaygoKT0+e1hlKCksT2UoKSx6ZSgpLEhlLnN0YXJ0KCksQmUoNzUwKX0sW09lLHplLEJlXSksd2U9eC51c2VDYWxsYmFjaygoKT0+e2guY3VycmVudD09PSJydW5uaW5nIiYmKE9lKCksSGUucGF1c2UoKSxFZSgicGF1c2VkIikpfSxbT2UsRWVdKSxVPXgudXNlQ2FsbGJhY2soKCk9PntoLmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksSGUucmVzdW1lKCksQmUoNTAwKSl9LFtCZV0pLHRlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCAkPWguY3VycmVudDskPT09ImlkbGUifHwkPT09Im92ZXIiP2plKCk6JD09PSJydW5uaW5nIj93ZSgpOiQ9PT0icGF1c2VkIiYmVSgpfSxbamUsd2UsVV0pLEY9eC51c2VDYWxsYmFjaygkPT57Y29uc3QgSj1hLmN1cnJlbnQsaGU9Si5xdWV1ZS5sZW5ndGg/Si5xdWV1ZVtKLnF1ZXVlLmxlbmd0aC0xXTpKLmRpcix2ZT0kLng9PT0taGUueCYmJC55PT09LWhlLnksRz0kLng9PT1oZS54JiYkLnk9PT1oZS55O3ZlfHxHfHxKLnF1ZXVlLmxlbmd0aDwzJiZKLnF1ZXVlLnB1c2goJCl9LFtdKSxrPXgudXNlQ2FsbGJhY2soJD0+e2NvbnN0IEo9aC5jdXJyZW50O2lmKEo9PT0iaWRsZSIpe2plKCksRigkKTtyZXR1cm59KEo9PT0icnVubmluZyJ8fEo9PT0icmVhZHkiKSYmRigkKX0sW2plLEZdKSxMPXgudXNlQ2FsbGJhY2soJD0+e2NvbnN0IEo9aC5jdXJyZW50O2lmKCEoSj09PSJydW5uaW5nInx8Sj09PSJyZWFkeSJ8fEo9PT0icGF1c2VkIikpe3EuY3VycmVudD0kLFYoJCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKEIwLCQpfWNhdGNoe316ZSgpfX0sW3plXSksdWU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0ICQ9IVBlLmN1cnJlbnQ7UGUuY3VycmVudD0kLGtlKCQpLHV0KCQpLG1uKCQpfSxbXSk7cmV0dXJuIHgudXNlRWZmZWN0KCgpPT57dXQoUGUuY3VycmVudCk7bGV0ICQ9MDtjb25zdCBKPWVlPT57Y29uc3Qgej1hLmN1cnJlbnQsZmU9ei5sYXN0LFA9ZmU/TWF0aC5taW4oNjAsZWUtZmUpOjE2O3oubGFzdD1lZSxMbSh6LFApO2NvbnN0IGllPWguY3VycmVudDtpZihpZT09PSJydW5uaW5nIil7ei5hY2MrPVA7Y29uc3QgZGU9Q2QocS5jdXJyZW50LHouZWF0ZW4pO2xldCBPPTA7Zm9yKDt6LmFjYz49ZGUmJk8rKzw0Oyl7ei5hY2MtPWRlO2NvbnN0IGo9RW0oeixlZSk7aWYoai5hdGUmJihGZSgxMCx6LnNuYWtlWzBdLCIjZmZjODU3IiksTSh6LnNuYWtlLmxlbmd0aCksSGUuZWF0KCksUGQoeix6LnNuYWtlWzBdLFsiI2ZmNmI2YiIsIiNmZmIzYWIiLCIjZmZlMDhhIl0pKSxqLmdvbGQmJihGZSg1MCx6LnNuYWtlWzBdLCIjZmZlMDhhIiksSGUuZ29sZCgpLFBkKHosei5zbmFrZVswXSxbIiNmZmQxNjYiLCIjZmZlMDhhIiwiI2ZmZjNjNCJdLDIyKSksai5kaWVkKXtMZSgpO2JyZWFrfX19Y29uc3QgWT1lLmN1cnJlbnQse3c6XyxoOkl9PXUuY3VycmVudDtpZihZJiZfPjApe2NvbnN0IGRlPVkuZ2V0Q29udGV4dCgiMmQiKTtpZihkZSl7Y29uc3QgTz1pZT09PSJydW5uaW5nIj9NYXRoLm1pbigxLHouYWNjL0NkKHEuY3VycmVudCx6LmVhdGVuKSk6MTtBbShkZSx6LF8sSSxlZSxpZSxPKX19JD1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoSil9OyQ9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKEopO2NvbnN0IGhlPWwuY3VycmVudCx2ZT1lLmN1cnJlbnQ7bGV0IEc9bnVsbDtpZihoZSYmdmUpe2NvbnN0IGVlPSgpPT57Y29uc3Qgej1oZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxmZT1NYXRoLm1heCgwLE1hdGguZmxvb3IoTWF0aC5taW4oei53aWR0aCx6LmhlaWdodCkpKSxQPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpO3ZlLndpZHRoPU1hdGgucm91bmQoZmUqUCksdmUuaGVpZ2h0PU1hdGgucm91bmQoZmUqUCksdmUuc3R5bGUud2lkdGg9YCR7ZmV9cHhgLHZlLnN0eWxlLmhlaWdodD1gJHtmZX1weGAsdS5jdXJyZW50PXt3OmZlLGg6ZmV9O2NvbnN0IGllPXZlLmdldENvbnRleHQoIjJkIik7aWUmJmllLnNldFRyYW5zZm9ybShQLDAsMCxQLDAsMCl9O2VlKCksRz1uZXcgUmVzaXplT2JzZXJ2ZXIoZWUpLEcub2JzZXJ2ZShoZSl9Y29uc3QgeGU9ZWU9Pntjb25zdCB6PWVlLmtleSxmZT16LnRvTG93ZXJDYXNlKCksUD17YXJyb3d1cDp7eDowLHk6LTF9LHc6e3g6MCx5Oi0xfSxhcnJvd2Rvd246e3g6MCx5OjF9LHM6e3g6MCx5OjF9LGFycm93bGVmdDp7eDotMSx5OjB9LGE6e3g6LTEseTowfSxhcnJvd3JpZ2h0Ont4OjEseTowfSxkOnt4OjEseTowfX07aWYoUFtmZV0pe2VlLnByZXZlbnREZWZhdWx0KCksayhQW2ZlXSk7cmV0dXJufWlmKHo9PT0iICIpe2VlLnByZXZlbnREZWZhdWx0KCksdGUoKTtyZXR1cm59aWYoZmU9PT0iciIpe2plKCk7cmV0dXJufWlmKGZlPT09InAifHx6PT09IkVzY2FwZSIpe2NvbnN0IGllPWguY3VycmVudDtpZT09PSJydW5uaW5nIj93ZSgpOmllPT09InBhdXNlZCImJlUoKTtyZXR1cm59aWYoZmU9PT0ibSIpe3VlKCk7cmV0dXJufWZlPT09IjEiJiZMKCJjaGlsbCIpLGZlPT09IjIiJiZMKCJjbGFzc2ljIiksZmU9PT0iMyImJkwoInR1cmJvIil9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIix4ZSk7Y29uc3QgYWU9KCk9Pntkb2N1bWVudC5oaWRkZW4mJmguY3VycmVudD09PSJydW5uaW5nIiYmd2UoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLGFlKSwoKT0+e2NhbmNlbEFuaW1hdGlvbkZyYW1lKCQpLE9lKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLHhlKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixhZSksRyYmRy5kaXNjb25uZWN0KCl9fSxbRmUsTCxPZSxMZSxrLHdlLHRlLFUsamUsdWVdKSx7Y2FudmFzUmVmOmUsd3JhcFJlZjpsLHBoYXNlOm8sc2NvcmU6bSxsZW46dyxwb3BLZXk6Uixpc05ld0Jlc3Q6USxkaWZmaWN1bHR5OkgsYmVzdHM6b2UsbXV0ZWQ6U2UsYWN0aW9uczp7c3RhcnQ6amUscHJpbWFyeTp0ZSxwYXVzZUdhbWU6d2UscmVzdW1lR2FtZTpVLGhhbmRsZURpcjprLGNoYW5nZURpZmZpY3VsdHk6TCx0b2dnbGVNdXRlOnVlfX19Y29uc3QgSWQ9W3tpZDoiY2hpbGwiLGxhYmVsOiJDaGlsbCIsdGFnOiJTbG93IGdsaWRlIixkb3RzOjF9LHtpZDoiY2xhc3NpYyIsbGFiZWw6IkNsYXNzaWMiLHRhZzoiVGhlIG9yaWdpbmFsIHBhY2UiLGRvdHM6Mn0se2lkOiJ0dXJibyIsbGFiZWw6IlR1cmJvIix0YWc6IkJsaXN0ZXJpbmciLGRvdHM6M31dO2Z1bmN0aW9uIEJtKHtjbGFzc05hbWU6ZT0iaC0zIHctMyJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgicGF0aCIse2Q6Ik0xMiA3Yy0zLjUtMi03IC41LTcgNSAwIDQgMi41IDggNSA4IDEgMCAxLjQtLjYgMi0uNnMxIC42IDIgLjZjMi41IDAgNS00IDUtOCAwLTQuNS0zLjUtNy03LTVaIixmaWxsOiIjZmY2YjZiIn0pLHIuanN4KCJwYXRoIix7ZDoiTTEyIDdjMC0yIDEtMy41IDMtNCIsc3Ryb2tlOiIjOGVmMDVhIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9ZnVuY3Rpb24gR28oe2xhYmVsOmUsdmFsdWU6bCxhY2NlbnQ6YT0hMSxwb3A6dT0wfSl7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7YT8iYW5pbWF0ZS1wb3AgdGV4dC1hbWJlcmdsb3ctNDAwIjoidGV4dC1tb3NzLTEwMCJ9YCxjaGlsZHJlbjpsfSx1KV19KX1mdW5jdGlvbiBvcyh7a2V5c0xpc3Q6ZSxhY3Rpb246bH0pe3JldHVybiByLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46ZX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpsfSldfSl9ZnVuY3Rpb24gem0oKXtyZXR1cm4gdHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXM/ci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDIwcHhdIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwIHB4LTIgcHktMSIsY2hpbGRyZW46IlN3aXBlIG9uIHRoZSBib2FyZCB0byBzdGVlciJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MCBweC0yIHB5LTEiLGNoaWxkcmVuOiJELXBhZCBiZWxvdyBvbiBzbWFsbCBzY3JlZW5zIn0pXX0pOm51bGx9ZnVuY3Rpb24gTGEoe29uUHJlc3M6ZSxjaGlsZHJlbjpsLGxhYmVsOmF9KXtyZXR1cm4gci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsImFyaWEtbGFiZWwiOmEsb25Qb2ludGVyRG93bjp1PT57dS5wcmV2ZW50RGVmYXVsdCgpLGUoKX0sY2xhc3NOYW1lOiJidG4tYXJjYWRlIGJ0bi1naG9zdCBmbGV4IGgtMTQgdy0xNiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46bH0pfWZ1bmN0aW9uIEFhKHtyb3Q6ZT0wfSl7cmV0dXJuIHIuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOiJoLTYgdy02IixzdHlsZTp7dHJhbnNmb3JtOmByb3RhdGUoJHtlfWRlZylgfSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpyLmpzeCgicGF0aCIse2Q6Ik0xMiA0bDggOWgtNXY3aC02di03SDR6In0pfSl9ZnVuY3Rpb24gRm0oKXtjb25zdCBlPU9tKCkse2FjdGlvbnM6bCxwaGFzZTphfT1lLHU9YT09PSJydW5uaW5nIjtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3IuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbci5qc3goR28se2xhYmVsOiJTY29yZSIsdmFsdWU6ZS5zY29yZSxhY2NlbnQ6ITAscG9wOmUucG9wS2V5fSksci5qc3goR28se2xhYmVsOmBCZXN0IMK3ICR7ZS5kaWZmaWN1bHR5fWAsdmFsdWU6ZS5iZXN0c1tlLmRpZmZpY3VsdHldfSksci5qc3goR28se2xhYmVsOiJMZW5ndGgiLHZhbHVlOmUubGVufSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTp1PyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOnU/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiF1JiZhIT09InBhdXNlZCIsY2hpbGRyZW46dT9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIn0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMiB6LTIwIiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbImxlZnQtMCB0b3AtMCBib3JkZXItbC0yIGJvcmRlci10LTIiLCJyaWdodC0wIHRvcC0wIGJvcmRlci1yLTIgYm9yZGVyLXQtMiIsImxlZnQtMCBib3R0b20tMCBib3JkZXItbC0yIGJvcmRlci1iLTIiLCJyaWdodC0wIGJvdHRvbS0wIGJvcmRlci1yLTIgYm9yZGVyLWItMiJdLm1hcChkPT5yLmpzeCgic3BhbiIse2NsYXNzTmFtZTpgYWJzb2x1dGUgaC00IHctNCBib3JkZXItYW1iZXJnbG93LTQwMC81MCAke2R9YH0sZCkpfSksYT09PSJpZGxlIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1waXQtOTUwLzgwIHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbci5qc3goQm0se2NsYXNzTmFtZToiaC04IHctOCJ9KSxyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgiaDEiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IlNFUlBFTlRJTkUifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0yIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiRUFUIMK3IEdST1cgwrcgU1VSVklWRSJ9KV19KV19KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgSW5zZXJ0IENvaW4iXX0pfSksci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJQUkVTUyBTUEFDRSBPUiBUQVAgVE8gU1RBUlQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJoaWRkZW4gaXRlbXMtY2VudGVyIGdhcC0xIHNtOmZsZXgiLGNoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiV0FTRCJ9KSxyLmpzeChBLHtjaGlsZHJlbjoi4oaQ4oaR4oaT4oaSIn0pLCIgc3RlZXIiXX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJzbTpoaWRkZW4iLGNoaWxkcmVuOiJTd2lwZSBvciB1c2UgdGhlIEQtcGFkIHRvIHN0ZWVyIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXBpdC01MDAiLGNoaWxkcmVuOiLigKIifSksci5qc3hzKCJzcGFuIix7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJTcGFjZSJ9KSwiIHBhdXNlIl19KV19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pXX0pLGE9PT0icmVhZHkiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgYmctcGl0LTk1MC81MCIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZSBhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQteGwgc206dGV4dC0yeGwiLGNoaWxkcmVuOiJSRUFEWT8ifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IkdPT0QgTFVDSyJ9KV19KSxhPT09InBhdXNlZCImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctcGl0LTk1MC84MCBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUgZm9udC1kaXNwbGF5IHRleHQteGwiLGNoaWxkcmVuOiJQQVVTRUQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3IuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucmVzdW1lR2FtZSxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxyLmpzeChBZSx7b25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgIixyLmpzeCgic3BhbiIse2NsYXNzTmFtZToibXgtMSIsY2hpbGRyZW46InJlc3VtZXMifSldfSldfSksYT09PSJvdmVyIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNCBiZy1waXQtOTUwLzg1IHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC14bCB0ZXh0LWFwcGxlLTQwMCBbdGV4dC1zaGFkb3c6MF8wXzI0cHhfcmdiYSgyNTUsMTA3LDEwNywwLjUpXSBzbTp0ZXh0LTJ4bCIsY2hpbGRyZW46IkdBTUUgT1ZFUiJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46ZS5zY29yZX0pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEFnYWluIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToibXgtYXV0byBtdC00IGdyaWQgdy1tYXggZ3JpZC1jb2xzLTMgZ2FwLTEuNSBtZDpoaWRkZW4iLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse30pLHIuanN4KExhLHtsYWJlbDoiVXAiLG9uUHJlc3M6KCk9PmwuaGFuZGxlRGlyKHt4OjAseTotMX0pLGNoaWxkcmVuOnIuanN4KEFhLHt9KX0pLHIuanN4KCJzcGFuIix7fSksci5qc3goTGEse2xhYmVsOiJMZWZ0IixvblByZXNzOigpPT5sLmhhbmRsZURpcih7eDotMSx5OjB9KSxjaGlsZHJlbjpyLmpzeChBYSx7cm90Oi05MH0pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUGxheSIsb25Qb2ludGVyRG93bjpkPT57ZC5wcmV2ZW50RGVmYXVsdCgpLGwucHJpbWFyeSgpfSxjbGFzc05hbWU6ImJ0bi1hcmNhZGUgYnRuLXByaW1hcnkgZmxleCBoLTE0IHctMTYgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjp1P3IuanN4KGd0LHtjbGFzc05hbWU6ImgtNiB3LTYifSk6ci5qc3goX2Use2NsYXNzTmFtZToiaC02IHctNiJ9KX0pLHIuanN4KExhLHtsYWJlbDoiUmlnaHQiLG9uUHJlc3M6KCk9PmwuaGFuZGxlRGlyKHt4OjEseTowfSksY2hpbGRyZW46ci5qc3goQWEse3JvdDo5MH0pfSksci5qc3goInNwYW4iLHt9KSxyLmpzeChMYSx7bGFiZWw6IkRvd24iLG9uUHJlc3M6KCk9PmwuaGFuZGxlRGlyKHt4OjAseToxfSksY2hpbGRyZW46ci5qc3goQWEse3JvdDoxODB9KX0pLHIuanN4KCJzcGFuIix7fSldfSksci5qc3goem0se30pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6Im10LTQgZmxleCBqdXN0aWZ5LWNlbnRlciIsY2hpbGRyZW46ci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5wcmltYXJ5LGNsYXNzTmFtZToibWluLXctWzIyMHB4XSIsY2hpbGRyZW46ci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIixjaGlsZHJlbjphPT09InJ1bm5pbmciP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goZ3Qse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBhdXNlIl19KTphPT09InBhdXNlZCI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KTphPT09Im92ZXIiP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBsYXkgQWdhaW4iXX0pOnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFN0YXJ0Il19KX0pfSl9KV19KSxyLmpzeHMoImFzaWRlIix7Y2xhc3NOYW1lOiJncmlkIGNvbnRlbnQtc3RhcnQgZ2FwLTQiLGNoaWxkcmVuOltyLmpzeChkbix7dGl0bGU6IlNwZWVkIixvcHRpb25zOklkLHZhbHVlOmUuZGlmZmljdWx0eSxvbkNoYW5nZTpsLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6YT09PSJydW5uaW5nInx8YT09PSJyZWFkeSJ8fGE9PT0icGF1c2VkIn0pLHIuanN4KHBuLHtiZXN0czplLmJlc3RzLG9wdGlvbnM6SWQsYWN0aXZlOmUuZGlmZmljdWx0eX0pLHIuanN4cyhydCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbci5qc3gob3Mse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IldBU0QifSksci5qc3goQSx7Y2hpbGRyZW46IuKGkOKGkeKGk+KGkiJ9KV19KSxhY3Rpb246IlN0ZWVyIn0pLHIuanN4KG9zLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiU3BhY2UifSksYWN0aW9uOiJTdGFydCAvIFBhdXNlIn0pLHIuanN4KG9zLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxyLmpzeChvcyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHIuanN4KG9zLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiIxIn0pLHIuanN4KEEse2NoaWxkcmVuOiIyIn0pLHIuanN4KEEse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiU3BlZWQifSksci5qc3gob3Mse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJNIn0pLGFjdGlvbjoiU291bmQifSldfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiR29sZGVuIGZydWl0ID0gNTAgcHRzLiBDaGFpbiBhcHBsZXMg4oCUIHRoZSBzZXJwZW50IG9ubHkgc3BlZWRzIHVwLiJ9KV19KV19KV19KV19KX1jb25zdCAkbT17Y2FkZXQ6e2xhYmVsOiJDQURFVCIsdGFnOiJyZWxheGVkIHBhdHJvbCIsZG90czoxLHNwYXduTXVsOjEuNDUsc3BlZWRNdWw6Ljc4LGZpcmVNdWw6LjYsYnVsbGV0U3BlZWQ6MTUwfSxwaWxvdDp7bGFiZWw6IlBJTE9UIix0YWc6InN0YW5kYXJkIG9wcyIsZG90czoyLHNwYXduTXVsOjEsc3BlZWRNdWw6MSxmaXJlTXVsOjEsYnVsbGV0U3BlZWQ6MTk1fSxhY2U6e2xhYmVsOiJBQ0UiLHRhZzoibm8gbWVyY3kiLGRvdHM6MyxzcGF3bk11bDouNzIsc3BlZWRNdWw6MS4yNCxmaXJlTXVsOjEuNTUsYnVsbGV0U3BlZWQ6MjQ1fX0sejA9TWF0aC5QSSoyLEplPShlLGwpPT5lK01hdGgucmFuZG9tKCkqKGwtZSksS289KGUsbCk9Pmw8ZT8oZStsKS8yOmUrTWF0aC5yYW5kb20oKSoobC1lKSxXYT0oZSxsLGEpPT5NYXRoLm1heChsLE1hdGgubWluKGEsZSkpLFdtPWU9PmVbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmUubGVuZ3RoKV07ZnVuY3Rpb24gSG0oZSl7cmV0dXJuIE1hdGgubWluKDI2LDYrZSoyKX1mdW5jdGlvbiBWbyhlPTYwMCxsPTYwMCl7Y29uc3QgYT1BcnJheS5mcm9tKHtsZW5ndGg6OTB9LCgpPT4oe3g6SmUoMCxlKSx5OkplKDAsbCksdjpKZSgxNiw5NSksczpKZSguNiwxLjkpLHR3OkplKDAsejApfSkpO3JldHVybnt3OmUsaDpsLHRpbWU6MCxsYXN0OjAscGxheWVyOnt4OmUvMix5OmwtNjQscjoxNCxmaXJlQ2Q6MCx0cmlwbGVUOjAscmFwaWRUOjAsc2hpZWxkVDowLGludnVsblQ6MTIwMCxhbGl2ZTohMH0sbGl2ZXM6MyxzY29yZTowLHdhdmU6MSxraWxsczowLGJ1bGxldHM6W10sZWJ1bGxldHM6W10sZW5lbWllczpbXSxwb3dlcnVwczpbXSxwYXJ0aWNsZXM6W10sZmxvYXRlcnM6W10sc3RhcnM6YSxzcGF3blQ6NzAwLHNwYXduZWQ6MCxicmVha1Q6MCx3YXZlSW50cm9UOjE1MDAsZmlyaW5nOiExLG1vdmU6e3g6MCx5OjB9LHNoYWtlOjAsaGl0Rmxhc2g6MCxkaWVkQXQ6MCxleGhhdXN0VDowLHNob3RzRmlyZWQ6MCxib29tczowLGhpdHM6MCxwb3dlcnM6MCx3YXZlQ2xlYXJzOjAscGxheWVySGl0czowLHNoaWVsZEhpdHM6MH19ZnVuY3Rpb24gd3MoZSxsLGEsdSxkPTE2LG89MSl7Y29uc3QgcD1NYXRoLm1pbigyNDAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgaD1lLnBhcnRpY2xlcy5sZW5ndGg7aDxwO2grKyl7Y29uc3QgbT1KZSgwLHowKSxnPUplKDMwLDI0MCkqbyx2PUplKDMwMCw3NTApO2UucGFydGljbGVzLnB1c2goe3g6bCx5OmEsdng6TWF0aC5jb3MobSkqZyx2eTpNYXRoLnNpbihtKSpnLGxpZmU6dixtYXhMaWZlOnYsc2l6ZTpKZSgxLjUsMy42KSpvLGNvbG9yOldtKHUpLGRyYWc6Mi4yLGdyYXY6MjZ9KX19ZnVuY3Rpb24gVW0oZSxsKXtjb25zdCBhPWUud2F2ZSx1PU1hdGgucmFuZG9tKCksZD1hPj0zP01hdGgubWluKC4yMiwuMSthKi4wMTIpOjAsbz1sLnNwZWVkTXVsKigxK2EqLjAzKTtsZXQgcD0iZ3J1bnQiO2lmKHU8ZD9wPSJ0YW5rIjp1PGQrLjQyJiYocD0id2VhdmVyIikscD09PSJ0YW5rIil7Y29uc3QgbT01K01hdGguZmxvb3IoYS8zKTtyZXR1cm57a2luZDpwLHg6S28oNTAsZS53LTUwKSx5Oi0zNixyOjIwLGhwOm0sbWF4SHA6bSx2eTozNipvLHQ6SmUoMCwxZTMpLGJhc2VYOjAsYW1wOjAsZnJlcTowLGZpcmVDZDpKZSg4MDAsMTUwMCksZmxhc2g6MCxzY29yZTo1MDB9fWlmKHA9PT0id2VhdmVyIil7Y29uc3QgbT1hPj04PzM6MixnPUtvKE1hdGgubWluKDkwLGUudyouMjUpLE1hdGgubWF4KGUudy05MCxlLncqLjc1KSk7cmV0dXJue2tpbmQ6cCx4OmcseTotMjYscjoxMyxocDptLG1heEhwOm0sdnk6KDU2K2EqNC41KSpvLHQ6SmUoMCwxZTMpLGJhc2VYOmcsYW1wOkplKDUwLDEwNSksZnJlcTpKZSgxLjIsMi4yKSxmaXJlQ2Q6SmUoNzAwLDE1MDApLGZsYXNoOjAsc2NvcmU6MjUwfX1jb25zdCBoPWE+PTc/MjoxO3JldHVybntraW5kOnAseDpLbygyNixlLnctMjYpLHk6LTI2LHI6MTMsaHA6aCxtYXhIcDpoLHZ5Oig2NithKjUpKm8qSmUoLjg1LDEuMTgpLHQ6SmUoMCwxZTMpLGJhc2VYOjAsYW1wOjAsZnJlcTowLGZpcmVDZDpKZSg5MDAsMjIwMCksZmxhc2g6MCxzY29yZToxMDB9fWZ1bmN0aW9uIEdtKGUsbCxhKXtjb25zdCB1PWUucGxheWVyO2lmKGwua2luZD09PSJncnVudCIpZS5lYnVsbGV0cy5wdXNoKHt4OmwueCx5OmwueStsLnIsdng6MCx2eTphLmJ1bGxldFNwZWVkfSksbC5maXJlQ2Q9SmUoMTMwMCwyMzAwKTtlbHNlIGlmKGwua2luZD09PSJ3ZWF2ZXIiKXtjb25zdCBkPXUueC1sLngsbz11LnktbC55LHA9TWF0aC5oeXBvdChkLG8pfHwxLGg9YS5idWxsZXRTcGVlZCouOTU7ZS5lYnVsbGV0cy5wdXNoKHt4OmwueCx5OmwueSs4LHZ4OmQvcCpoLHZ5Om8vcCpofSksbC5maXJlQ2Q9SmUoMTEwMCwxOTAwKX1lbHNle2NvbnN0IGQ9TWF0aC5hdGFuMih1LnktbC55LHUueC1sLngpLG89YS5idWxsZXRTcGVlZCouOTtmb3IoY29uc3QgcCBvZlstLjI2LDAsLjI2XSllLmVidWxsZXRzLnB1c2goe3g6bC54LHk6bC55K2wuciouNix2eDpNYXRoLmNvcyhkK3ApKm8sdnk6TWF0aC5zaW4oZCtwKSpvfSk7bC5maXJlQ2Q9SmUoMTQwMCwyMTAwKX19ZnVuY3Rpb24gS20oZSxsLGEpe2NvbnN0IHU9TWF0aC5yYW5kb20oKSxkPXU8LjQ/InRyaXBsZSI6dTwuNzU/InJhcGlkIjoic2hpZWxkIjtlLnBvd2VydXBzLnB1c2goe2tpbmQ6ZCx4OldhKGwsMTYsZS53LTE2KSx5OmEsdDowfSl9ZnVuY3Rpb24gX2QoZSxsKXtjb25zdCBhPWUuZW5lbWllc1tsXTtlLmVuZW1pZXMuc3BsaWNlKGwsMSksZS5raWxscysrLGUuc2NvcmUrPWEuc2NvcmUsZS5mbG9hdGVycy5wdXNoKHt4OmEueCx5OmEueSx0eHQ6YCske2Euc2NvcmV9YCxsaWZlOjgwMCxtYXhMaWZlOjgwMCxjb2xvcjoiI2ZmZTA4YSJ9KTtjb25zdCB1PWEua2luZD09PSJncnVudCI/WyIjZmY1ZDhmIiwiI2ZmOGZiMyIsIiNmZmQxNjYiLCIjZmZmZmZmIl06YS5raW5kPT09IndlYXZlciI/WyIjYzA4NGZjIiwiI2UzYzhmZiIsIiNmZmZmZmYiXTpbIiNmZjhjNDIiLCIjZmZkMTY2IiwiI2ZmZjNjNCJdO3dzKGUsYS54LGEueSx1LGEua2luZD09PSJ0YW5rIj8yNjoxNixhLmtpbmQ9PT0idGFuayI/MS4yNToxKSxlLnNoYWtlPU1hdGgubWF4KGUuc2hha2UsYS5raW5kPT09InRhbmsiPzU6Mi41KSxlLmJvb21zKyssTWF0aC5yYW5kb20oKTwuMTImJkttKGUsYS54LGEueSl9ZnVuY3Rpb24gT2QoZSxsKXtjb25zdCBhPWUucGxheWVyO2lmKGEuc2hpZWxkVD4wKXthLnNoaWVsZFQ9MCxlLnNoaWVsZEhpdHMrKyxlLmZsb2F0ZXJzLnB1c2goe3g6YS54LHk6YS55LTIyLHR4dDoiU0hJRUxEIERPV04iLGxpZmU6OTAwLG1heExpZmU6OTAwLGNvbG9yOiIjNjJlNmZmIn0pLHdzKGUsYS54LGEueSxbIiM2MmU2ZmYiLCIjYmZmN2ZmIiwiI2ZmZmZmZiJdLDE0LC44KSxlLnNoYWtlPU1hdGgubWF4KGUuc2hha2UsNyksYS5pbnZ1bG5UPTcwMDtyZXR1cm59ZS5saXZlcy0tLGUucGxheWVySGl0cysrLHdzKGUsYS54LGEueSxbIiM2MmU2ZmYiLCIjYmZmN2ZmIiwiI2ZmZmZmZiIsIiNmZmQxNjYiXSwyNiwxLjEpLGUuc2hha2U9MTUsZS5oaXRGbGFzaD0uNSxlLmxpdmVzPD0wPyhhLmFsaXZlPSExLGUuZmlyaW5nPSExLGUuZGllZEF0PWwsd3MoZSxhLngsYS55LFsiI2ZmZmZmZiIsIiM2MmU2ZmYiLCIjZmY1ZDhmIiwiI2ZmZDE2NiJdLDQwLDEuNikpOmEuaW52dWxuVD0yMjAwfWZ1bmN0aW9uIFZtKGUsbCl7Y29uc3QgYT1lLnBsYXllcjtlLnNjb3JlKz0xNTAsZS5wb3dlcnMrKztsZXQgdT0iU0hJRUxEICsxNTAiLGQ9IiM2MmU2ZmYiO2w9PT0idHJpcGxlIj8oYS50cmlwbGVUPThlMyx1PSJUUklQTEUgU0hPVCArMTUwIixkPSIjZmZkMTY2Iik6bD09PSJyYXBpZCI/KGEucmFwaWRUPThlMyx1PSJSQVBJRCBGSVJFICsxNTAiLGQ9IiM3ZWYwYTAiKTphLnNoaWVsZFQ9MSxlLmZsb2F0ZXJzLnB1c2goe3g6YS54LHk6YS55LTI2LHR4dDp1LGxpZmU6MWUzLG1heExpZmU6MWUzLGNvbG9yOmR9KSx3cyhlLGEueCxhLnksWyIjNjJlNmZmIiwiI2ZmZmZmZiIsIiNmZmQxNjYiXSwxMCwuNyl9ZnVuY3Rpb24gcW0oZSxsLGEsdSxkKXtjb25zdCBvPWwvMWUzO2UudGltZSs9bDtmb3IoY29uc3QgaCBvZiBlLnN0YXJzKWgueSs9aC52Km8qKDErZS53YXZlKi4wMyksaC55PmUuaCsyJiYoaC55PS0yLGgueD1KZSgwLGUudykpLGgueD5lLncmJihoLngtPWUudyk7Zm9yKGxldCBoPWUucGFydGljbGVzLmxlbmd0aC0xO2g+PTA7aC0tKXtjb25zdCBtPWUucGFydGljbGVzW2hdO2lmKG0ubGlmZS09bCxtLmxpZmU8PTApe2NvbnN0IGc9ZS5wYXJ0aWNsZXMucG9wKCk7ZyYmaDxlLnBhcnRpY2xlcy5sZW5ndGgmJihlLnBhcnRpY2xlc1toXT1nKTtjb250aW51ZX1tLnZ4LT1tLnZ4Km0uZHJhZypvLG0udnkrPW0uZ3JhdipvLW0udnkqbS5kcmFnKm8sbS54Kz1tLnZ4Km8sbS55Kz1tLnZ5Km99Zm9yKGxldCBoPWUuZmxvYXRlcnMubGVuZ3RoLTE7aD49MDtoLS0pZS5mbG9hdGVyc1toXS5saWZlLT1sLGUuZmxvYXRlcnNbaF0ubGlmZTw9MCYmZS5mbG9hdGVycy5zcGxpY2UoaCwxKTtlLnNoYWtlPU1hdGgubWF4KDAsZS5zaGFrZS1sKi4wNDUpLGUuaGl0Rmxhc2g9TWF0aC5tYXgoMCxlLmhpdEZsYXNoLWwqLjAwMTYpO2NvbnN0IHA9ZS5wbGF5ZXI7aWYocC5maXJlQ2QtPWwscC50cmlwbGVUPU1hdGgubWF4KDAscC50cmlwbGVULWwpLHAucmFwaWRUPU1hdGgubWF4KDAscC5yYXBpZFQtbCkscC5pbnZ1bG5UPU1hdGgubWF4KDAscC5pbnZ1bG5ULWwpLHAuYWxpdmUpe2NvbnN0IGg9ZS5tb3ZlLngsbT1lLm1vdmUueSxnPU1hdGguaHlwb3QoaCxtKTtpZihnPi4wMSl7Y29uc3Qgdj1nPjE/MS9nOjEsdz0zODA7cC54Kz1oKnYqdypvLHAueSs9bSp2Kncqb31wLng9V2EocC54LHAucixlLnctcC5yKSxwLnk9V2EocC55LGUuaCouNDIsZS5oLXAuci02KSxlLmV4aGF1c3RULT1sLGUuZXhoYXVzdFQ8PTAmJihlLmV4aGF1c3RUPTM2LGUucGFydGljbGVzLnB1c2goe3g6cC54K0plKC0zLDMpLHk6cC55KzEyLHZ4OkplKC0xMiwxMiksdnk6SmUoNjAsMTMwKSxsaWZlOjI2MCxtYXhMaWZlOjI2MCxzaXplOkplKDEuMiwyLjQpLGNvbG9yOk1hdGgucmFuZG9tKCk8LjU/IiM2MmU2ZmYiOiIjZmZkMTY2IixkcmFnOjIsZ3JhdjowfSkpfWlmKGQpe2lmKGUuZmlyaW5nJiZwLmFsaXZlJiZwLmZpcmVDZDw9MCl7cC5maXJlQ2Q9cC5yYXBpZFQ+MD8xMTU6MjUwO2NvbnN0IGg9LTY0MDtwLnRyaXBsZVQ+MD9lLmJ1bGxldHMucHVzaCh7eDpwLngtOCx5OnAueS0xMCx2eDotMTUwLHZ5Omh9LHt4OnAueCx5OnAueS0xNix2eDowLHZ5Omh9LHt4OnAueCs4LHk6cC55LTEwLHZ4OjE1MCx2eTpofSk6ZS5idWxsZXRzLnB1c2goe3g6cC54LHk6cC55LTE2LHZ4OjAsdnk6aH0pLGUuc2hvdHNGaXJlZCsrLGUucGFydGljbGVzLnB1c2goe3g6cC54LHk6cC55LTE4LHZ4OkplKC0yMCwyMCksdnk6SmUoLTkwLC00MCksbGlmZToxMjAsbWF4TGlmZToxMjAsc2l6ZTpKZSgxLDIpLGNvbG9yOiIjZmZkMTY2IixkcmFnOjIsZ3JhdjowfSl9aWYoZS5icmVha1Q+MCllLmJyZWFrVC09bCxlLmJyZWFrVDw9MCYmKGUud2F2ZSsrLGUuc3Bhd25lZD0wLGUud2F2ZUludHJvVD0xNTAwLGUuc3Bhd25UPTYwMCk7ZWxzZSBpZihwLmFsaXZlKXtpZihlLndhdmVJbnRyb1Q9TWF0aC5tYXgoMCxlLndhdmVJbnRyb1QtbCksZS5zcGF3bmVkPEhtKGUud2F2ZSkpZS5zcGF3blQtPWwsZS5zcGF3blQ8PTAmJmUuZW5lbWllcy5sZW5ndGg8MTQmJihlLmVuZW1pZXMucHVzaChVbShlLHUpKSxlLnNwYXduZWQrKyxlLnNwYXduVD1NYXRoLm1heCgyNjAsMTA1MC1lLndhdmUqNzApKnUuc3Bhd25NdWwqSmUoLjcsMS4yNSkpO2Vsc2UgaWYoZS5lbmVtaWVzLmxlbmd0aD09PTApe2NvbnN0IGg9MjAwK2Uud2F2ZSo1MDtlLnNjb3JlKz1oLGUud2F2ZUNsZWFycysrLGUuZmxvYXRlcnMucHVzaCh7eDplLncvMix5OmUuaCouMzYsdHh0OmBXQVZFIENMRUFSICArJHtofWAsbGlmZToxNzAwLG1heExpZmU6MTcwMCxjb2xvcjoiI2ZmZDE2NiJ9KSxlLmJyZWFrVD0zZTN9fWZvcihsZXQgaD1lLmVuZW1pZXMubGVuZ3RoLTE7aD49MDtoLS0pe2NvbnN0IG09ZS5lbmVtaWVzW2hdO2lmKG0udCs9bCxtLmZsYXNoPU1hdGgubWF4KDAsbS5mbGFzaC1sKSxtLnkrPW0udnkqbyxtLmtpbmQ9PT0id2VhdmVyIiYmKG0ueD1XYShtLmJhc2VYK01hdGguc2luKG0udC8xZTMqbS5mcmVxKjIpKm0uYW1wLDE0LGUudy0xNCkpLHAuYWxpdmUmJihtLmZpcmVDZC09bCp1LmZpcmVNdWwsbS5maXJlQ2Q8PTAmJm0ueT4xMCYmbS55PGUuaCouNzImJkdtKGUsbSx1KSksbS55PmUuaCs0NCl7ZS5lbmVtaWVzLnNwbGljZShoLDEpO2NvbnRpbnVlfXAuYWxpdmUmJnAuaW52dWxuVDw9MCYmTWF0aC5oeXBvdChtLngtcC54LG0ueS1wLnkpPG0ucitwLnItMiYmKF9kKGUsaCksT2QoZSxhKSl9Zm9yKGxldCBoPWUuYnVsbGV0cy5sZW5ndGgtMTtoPj0wO2gtLSl7Y29uc3QgbT1lLmJ1bGxldHNbaF07aWYobS54Kz1tLnZ4Km8sbS55Kz1tLnZ5Km8sbS55PC0yNHx8bS54PC0yNHx8bS54PmUudysyNCl7ZS5idWxsZXRzLnNwbGljZShoLDEpO2NvbnRpbnVlfWZvcihsZXQgZz1lLmVuZW1pZXMubGVuZ3RoLTE7Zz49MDtnLS0pe2NvbnN0IHY9ZS5lbmVtaWVzW2ddO2lmKE1hdGguaHlwb3QobS54LXYueCxtLnktdi55KTx2LnIrNCl7ZS5idWxsZXRzLnNwbGljZShoLDEpLHYuaHAtLSx2LmZsYXNoPTkwLHYuaHA8PTA/X2QoZSxnKTooZS5oaXRzKyssd3MoZSxtLngsbS55LFsiI2ZmZDE2NiIsIiNmZmZmZmYiXSwzLC40NSkpO2JyZWFrfX19Zm9yKGxldCBoPWUuZWJ1bGxldHMubGVuZ3RoLTE7aD49MDtoLS0pe2NvbnN0IG09ZS5lYnVsbGV0c1toXTtpZihtLngrPW0udngqbyxtLnkrPW0udnkqbyxtLnk+ZS5oKzIwfHxtLnk8LTIwfHxtLng8LTIwfHxtLng+ZS53KzIwKXtlLmVidWxsZXRzLnNwbGljZShoLDEpO2NvbnRpbnVlfXAuYWxpdmUmJnAuaW52dWxuVDw9MCYmTWF0aC5oeXBvdChtLngtcC54LG0ueS1wLnkpPHAuciszJiYoZS5lYnVsbGV0cy5zcGxpY2UoaCwxKSxPZChlLGEpKX1mb3IobGV0IGg9ZS5wb3dlcnVwcy5sZW5ndGgtMTtoPj0wO2gtLSl7Y29uc3QgbT1lLnBvd2VydXBzW2hdO2lmKG0udCs9bCxtLnkrPTcyKm8sbS55PmUuaCsyMCl7ZS5wb3dlcnVwcy5zcGxpY2UoaCwxKTtjb250aW51ZX1wLmFsaXZlJiZNYXRoLmh5cG90KG0ueC1wLngsbS55LXAueSk8cC5yKzEzJiYoZS5wb3dlcnVwcy5zcGxpY2UoaCwxKSxWbShlLG0ua2luZCkpfX19Y29uc3Qgdmw9TWF0aC5QSSoyLEJkPShlLGwpPT5lK01hdGgucmFuZG9tKCkqKGwtZSk7ZnVuY3Rpb24gYm4oZSxsLGEsdSl7ZS5iZWdpblBhdGgoKSxlLmFyYyhsLGEsdSwwLHZsKSxlLmZpbGwoKX1mdW5jdGlvbiBZbShlLGwsYSx1LGQsbyl7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK28sYSksZS5hcmNUbyhsK3UsYSxsK3UsYStkLG8pLGUuYXJjVG8obCt1LGErZCxsLGErZCxvKSxlLmFyY1RvKGwsYStkLGwsYSxvKSxlLmFyY1RvKGwsYSxsK3UsYSxvKSxlLmNsb3NlUGF0aCgpfWZ1bmN0aW9uIFhtKGUsbCl7aWYoZS5zYXZlKCksZS50cmFuc2xhdGUobC54LGwueSksbC5raW5kPT09ImdydW50IillLnJvdGF0ZShNYXRoLnNpbihsLnQqLjAwNCkqLjE4KSxlLnNoYWRvd0NvbG9yPSIjZmY1ZDhmIixlLnNoYWRvd0JsdXI9MTIsZS5maWxsU3R5bGU9IiNmZjVkOGYiLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oMCwxNSksZS5saW5lVG8oMTMsLTkpLGUubGluZVRvKDAsLTMpLGUubGluZVRvKC0xMywtOSksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCxlLmZpbGxTdHlsZT0iIzU3MTQyOCIsYm4oZSwwLC0xLDQuNSksZS5maWxsU3R5bGU9IiNmZmZmZmYiLGJuKGUsLTIsLTIsMS4yKSxibihlLDIsLTIsMS4yKTtlbHNlIGlmKGwua2luZD09PSJ3ZWF2ZXIiKWUucm90YXRlKE1hdGguc2luKGwudCouMDAzKSouMyksZS5zaGFkb3dDb2xvcj0iI2MwODRmYyIsZS5zaGFkb3dCbHVyPTEyLGUuZmlsbFN0eWxlPSIjYzA4NGZjIixlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsLTE1KSxlLmxpbmVUbygxMSwwKSxlLmxpbmVUbygwLDE1KSxlLmxpbmVUbygtMTEsMCksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCxlLmZpbGxTdHlsZT0iIzNiMWQ1ZSIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygwLC03KSxlLmxpbmVUbyg1LjUsMCksZS5saW5lVG8oMCw3KSxlLmxpbmVUbygtNS41LDApLGUuY2xvc2VQYXRoKCksZS5maWxsKCksZS5maWxsU3R5bGU9IiNmM2U4ZmYiLGJuKGUsMCwwLDIpO2Vsc2V7ZS5yb3RhdGUoTWF0aC5zaW4obC50Ki4wMDE1KSouMDgpLGUuc2hhZG93Q29sb3I9IiNmZjhjNDIiLGUuc2hhZG93Qmx1cj0xNCxlLmZpbGxTdHlsZT0iI2ZmOGM0MiIsZS5iZWdpblBhdGgoKTtmb3IobGV0IGE9MDthPDY7YSsrKXtjb25zdCB1PWEvNip2bC1NYXRoLlBJLzIsZD1NYXRoLmNvcyh1KSoyMCxvPU1hdGguc2luKHUpKjIwO2E9PT0wP2UubW92ZVRvKGQsbyk6ZS5saW5lVG8oZCxvKX1lLmNsb3NlUGF0aCgpLGUuZmlsbCgpLGUuc2hhZG93Qmx1cj0wLGUuc3Ryb2tlU3R5bGU9IiM4YTQ1MTUiLGUubGluZVdpZHRoPTIsZS5iZWdpblBhdGgoKTtmb3IobGV0IGE9MDthPDY7YSsrKXtjb25zdCB1PWEvNip2bC1NYXRoLlBJLzIsZD1NYXRoLmNvcyh1KSoxMixvPU1hdGguc2luKHUpKjEyO2E9PT0wP2UubW92ZVRvKGQsbyk6ZS5saW5lVG8oZCxvKX1lLmNsb3NlUGF0aCgpLGUuc3Ryb2tlKCksZS5maWxsU3R5bGU9IiM4YTQ1MTUiLGJuKGUsMCwwLDUpLGUuZmlsbFN0eWxlPSIjZmZkMTY2IixibihlLDAsMCwyLjUpfWlmKGwuZmxhc2g+MCYmKGUuZ2xvYmFsQWxwaGE9TWF0aC5taW4oMSxsLmZsYXNoLzkwKSxlLmZpbGxTdHlsZT0iI2ZmZmZmZiIsYm4oZSwwLDAsbC5yKi45KSxlLmdsb2JhbEFscGhhPTEpLGUucmVzdG9yZSgpLGwua2luZD09PSJ0YW5rIil7Y29uc3QgdT1NYXRoLm1heCgwLGwuaHAvbC5tYXhIcCk7ZS5maWxsU3R5bGU9InJnYmEoNTgsMzEsMTQsMC45KSIsZS5maWxsUmVjdChsLngtMzYvMixsLnktbC5yLTEyLDM2LDQpLGUuZmlsbFN0eWxlPSIjZmZkMTY2IixlLmZpbGxSZWN0KGwueC0zNi8yLGwueS1sLnItMTIsMzYqdSw0KX19ZnVuY3Rpb24gUW0oZSxsKXtjb25zdCBhPWwucGxheWVyO2lmKCFhLmFsaXZlKXJldHVybjtjb25zdCB1PWwudGltZTtlLnNhdmUoKSxlLnRyYW5zbGF0ZShhLngsYS55KSxhLmludnVsblQ+MCYmTWF0aC5mbG9vcih1LzExMCklMj09PTAmJihlLmdsb2JhbEFscGhhPS4zNSk7Y29uc3QgZD05K01hdGguc2luKHUqLjA0NSkqNCsobC5maXJpbmc/MzowKTtlLmZpbGxTdHlsZT0iI2ZmZDE2NiIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtNC41LDEwKSxlLmxpbmVUbygwLDEwK2QpLGUubGluZVRvKDQuNSwxMCksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLmZpbGxTdHlsZT0iI2ZmZjNjNCIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtMiwxMCksZS5saW5lVG8oMCwxMCtkKi41NSksZS5saW5lVG8oMiwxMCksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC45KSIsZS5zaGFkb3dCbHVyPTE2O2NvbnN0IG89ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLC0xOCwwLDE0KTtvLmFkZENvbG9yU3RvcCgwLCIjZGZmYWZmIiksby5hZGRDb2xvclN0b3AoLjUsIiM2MmU2ZmYiKSxvLmFkZENvbG9yU3RvcCgxLCIjMTc4NmE4IiksZS5maWxsU3R5bGU9byxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsLTE4KSxlLmxpbmVUbygxMyw5KSxlLmxpbmVUbyg3LDEzKSxlLmxpbmVUbygwLDgpLGUubGluZVRvKC03LDEzKSxlLmxpbmVUbygtMTMsOSksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCxlLnN0cm9rZVN0eWxlPSJyZ2JhKDIzMCwyNTUsMjU1LDAuNTUpIixlLmxpbmVXaWR0aD0xLGUuc3Ryb2tlKCksZS5maWxsU3R5bGU9IiNmZmZmZmYiLGJuKGUsMCwtNSwzKSxlLnJlc3RvcmUoKSxhLnNoaWVsZFQ+MCYmKGUuc2F2ZSgpLGUuc3Ryb2tlU3R5bGU9YHJnYmEoOTgsMjMwLDI1NSwkey41Ky4zKk1hdGguc2luKHUqLjAwOCl9KWAsZS5saW5lV2lkdGg9MixlLnNoYWRvd0NvbG9yPSIjNjJlNmZmIixlLnNoYWRvd0JsdXI9MTAsZS5iZWdpblBhdGgoKSxlLmFyYyhhLngsYS55LDI1LDAsdmwpLGUuc3Ryb2tlKCksZS5yZXN0b3JlKCkpfWNvbnN0IEptPXt0cmlwbGU6WyIjZmZkMTY2IiwiIzdjNGExMiJdLHJhcGlkOlsiIzdlZjBhMCIsIiMxZDVlMzUiXSxzaGllbGQ6WyIjNjJlNmZmIiwiIzE3NWU3NSJdfSxabT17dHJpcGxlOiJUIixyYXBpZDoiUiIsc2hpZWxkOiJTIn07ZnVuY3Rpb24gZWcoZSxsLGEsdSxkKXtjb25zdCBvPWwudGltZTtlLmZpbGxTdHlsZT0iIzA3MGQxYSIsZS5maWxsUmVjdCgwLDAsYSx1KTtsZXQgcD1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGEqLjI4K01hdGguc2luKG8qMmUtNCkqNDAsdSouMytNYXRoLmNvcyhvKjE3ZS01KSozMCwwLGEqLjI4LHUqLjMsYSouNSk7cC5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsOTMsMTQzLDAuMTApIikscC5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsOTMsMTQzLDApIiksZS5maWxsU3R5bGU9cCxlLmZpbGxSZWN0KDAsMCxhLHUpLHA9ZS5jcmVhdGVSYWRpYWxHcmFkaWVudChhKi43MitNYXRoLmNvcyhvKjE1ZS01KSo1MCx1Ki42OCtNYXRoLnNpbihvKjJlLTQpKjQwLDAsYSouNzIsdSouNjgsYSouNTUpLHAuYWRkQ29sb3JTdG9wKDAsInJnYmEoOTgsMjMwLDI1NSwwLjA4KSIpLHAuYWRkQ29sb3JTdG9wKDEsInJnYmEoOTgsMjMwLDI1NSwwKSIpLGUuZmlsbFN0eWxlPXAsZS5maWxsUmVjdCgwLDAsYSx1KTtmb3IoY29uc3QgbSBvZiBsLnN0YXJzKXtjb25zdCBnPS4yNSsuNTUqKC41Ky41Kk1hdGguc2luKG8qLjAwMSptLnYqLjA1K20udHcpKTtlLmdsb2JhbEFscGhhPWcsZS5maWxsU3R5bGU9IiNjZmU2ZmYiLGUuZmlsbFJlY3QobS54LG0ueSxtLnMsbS5zKX1lLmdsb2JhbEFscGhhPTEsZS5zYXZlKCksbC5zaGFrZT4uMiYmZS50cmFuc2xhdGUoQmQoLWwuc2hha2UsbC5zaGFrZSkqLjYsQmQoLWwuc2hha2UsbC5zaGFrZSkqLjYpO2Zvcihjb25zdCBtIG9mIGwucG93ZXJ1cHMpe2NvbnN0W2csdl09Sm1bbS5raW5kXSx3PTErTWF0aC5zaW4obS50Ki4wMDgpKi4wODtlLnNhdmUoKSxlLnRyYW5zbGF0ZShtLngsbS55KSxlLnNjYWxlKHcsdyksZS5zaGFkb3dDb2xvcj1nLGUuc2hhZG93Qmx1cj0xNCxlLmZpbGxTdHlsZT1nLFltKGUsLTExLC0xMSwyMiwyMiw2KSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCxlLnN0cm9rZVN0eWxlPXYsZS5saW5lV2lkdGg9MixlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSIjMGEwZjE0IixlLmZvbnQ9ImJvbGQgMTJweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsZS50ZXh0QWxpZ249ImNlbnRlciIsZS50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsZS5maWxsVGV4dChabVttLmtpbmRdLDAsMSksZS5yZXN0b3JlKCl9Zm9yKGNvbnN0IG0gb2YgbC5lbmVtaWVzKVhtKGUsbSk7ZS5zYXZlKCksZS5saW5lQ2FwPSJyb3VuZCI7Zm9yKGNvbnN0IG0gb2YgbC5idWxsZXRzKWUuc3Ryb2tlU3R5bGU9IiNmZmQxNjYiLGUubGluZVdpZHRoPTMuNSxlLnNoYWRvd0NvbG9yPSIjZmZkMTY2IixlLnNoYWRvd0JsdXI9OCxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKG0ueCxtLnkpLGUubGluZVRvKG0ueC1tLnZ4Ki4wMTYsbS55LW0udnkqLjAxNiksZS5zdHJva2UoKTtlLnJlc3RvcmUoKTtmb3IoY29uc3QgbSBvZiBsLmVidWxsZXRzKWUuc2F2ZSgpLGUuc2hhZG93Q29sb3I9IiNmZjVkOGYiLGUuc2hhZG93Qmx1cj0xMCxlLmZpbGxTdHlsZT0iI2ZmOGZiMyIsYm4oZSxtLngsbS55LDQpLGUuc2hhZG93Qmx1cj0wLGUuZmlsbFN0eWxlPSIjZmZmZmZmIixibihlLG0ueCxtLnksMS42KSxlLnJlc3RvcmUoKTtkIT09ImlkbGUiJiZRbShlLGwpO2Zvcihjb25zdCBtIG9mIGwucGFydGljbGVzKXtjb25zdCBnPU1hdGgubWF4KDAsbS5saWZlL20ubWF4TGlmZSk7ZS5nbG9iYWxBbHBoYT1nLGUuZmlsbFN0eWxlPW0uY29sb3IsZS5iZWdpblBhdGgoKSxlLmFyYyhtLngsbS55LE1hdGgubWF4KC40LG0uc2l6ZSpnKSwwLHZsKSxlLmZpbGwoKX1lLmdsb2JhbEFscGhhPTE7Zm9yKGNvbnN0IG0gb2YgbC5mbG9hdGVycyl7Y29uc3QgZz1NYXRoLm1heCgwLG0ubGlmZS9tLm1heExpZmUpO2UuZ2xvYmFsQWxwaGE9ZyxlLmZvbnQ9ImJvbGQgMTNweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsZS50ZXh0QWxpZ249ImNlbnRlciIsZS50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsZS5saW5lV2lkdGg9MyxlLnN0cm9rZVN0eWxlPSJyZ2JhKDAsMCwwLDAuNjUpIjtjb25zdCB2PW0ueS0oMS1nKSoyNjtlLnN0cm9rZVRleHQobS50eHQsbS54LHYpLGUuZmlsbFN0eWxlPW0uY29sb3IsZS5maWxsVGV4dChtLnR4dCxtLngsdil9aWYoZS5nbG9iYWxBbHBoYT0xLGUucmVzdG9yZSgpLGUudGV4dEFsaWduPSJjZW50ZXIiLGUudGV4dEJhc2VsaW5lPSJtaWRkbGUiLGQ9PT0icmVhZHkiKXtjb25zdCBtPTErTWF0aC5zaW4obyouMDA4KSouMDQ7ZS5zYXZlKCksZS50cmFuc2xhdGUoYS8yLHUqLjQpLGUuc2NhbGUobSxtKSxlLmZvbnQ9IjIycHggJ1ByZXNzIFN0YXJ0IDJQJywgbW9ub3NwYWNlIixlLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC44KSIsZS5zaGFkb3dCbHVyPTE4LGUuZmlsbFN0eWxlPSIjNjJlNmZmIixlLmZpbGxUZXh0KCJHRVQgUkVBRFkiLDAsMCksZS5yZXN0b3JlKCksZS5mb250PSJib2xkIDEzcHggJ0NoYWtyYSBQZXRjaCcsIHNhbnMtc2VyaWYiLGUuZmlsbFN0eWxlPSIjY2ZlNmZmIixlLmZpbGxUZXh0KCJXQVZFIDEgSU5CT1VORCIsYS8yLHUqLjQrMzQpfWlmKGQ9PT0icnVubmluZyIpe2lmKGwud2F2ZUludHJvVD4wKXtjb25zdCBtPU1hdGgubWluKDEsbC53YXZlSW50cm9ULzQwMCk7ZS5nbG9iYWxBbHBoYT1tLGUuZm9udD0iMjRweCAnUHJlc3MgU3RhcnQgMlAnLCBtb25vc3BhY2UiLGUuc2hhZG93Q29sb3I9InJnYmEoMjU1LDIwOSwxMDIsMC44KSIsZS5zaGFkb3dCbHVyPTE4LGUuZmlsbFN0eWxlPSIjZmZkMTY2IixlLmZpbGxUZXh0KGBXQVZFICR7bC53YXZlfWAsYS8yLHUqLjM4KSxlLnNoYWRvd0JsdXI9MCxlLmZvbnQ9ImJvbGQgMTNweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsZS5maWxsU3R5bGU9IiNjZmU2ZmYiLGUuZmlsbFRleHQoIkhPU1RJTEVTIElOQk9VTkQiLGEvMix1Ki4zOCszNCksZS5nbG9iYWxBbHBoYT0xfWVsc2UgaWYobC5icmVha1Q+MCl7Y29uc3QgbT1NYXRoLm1pbigxLGwuYnJlYWtULzUwMCwoM2UzLWwuYnJlYWtUKS8zMDApO2UuZ2xvYmFsQWxwaGE9TWF0aC5tYXgoMCxtKSxlLmZvbnQ9IjIwcHggJ1ByZXNzIFN0YXJ0IDJQJywgbW9ub3NwYWNlIixlLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC44KSIsZS5zaGFkb3dCbHVyPTE2LGUuZmlsbFN0eWxlPSIjYmZmN2ZmIixlLmZpbGxUZXh0KCJTRUNUT1IgQ0xFQVIiLGEvMix1Ki4zOCksZS5nbG9iYWxBbHBoYT0xfX1jb25zdCBoPWUuY3JlYXRlUmFkaWFsR3JhZGllbnQoYS8yLHUvMixNYXRoLm1pbihhLHUpKi4zNSxhLzIsdS8yLE1hdGgubWF4KGEsdSkqLjcyKTtoLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDIsNiwxNiwwKSIpLGguYWRkQ29sb3JTdG9wKDEsInJnYmEoMiw2LDE2LDAuNTUpIiksZS5maWxsU3R5bGU9aCxlLmZpbGxSZWN0KDAsMCxhLHUpLGwuaGl0Rmxhc2g+MCYmKGUuZmlsbFN0eWxlPWByZ2JhKDI1NSw4MCwxMTAsJHtsLmhpdEZsYXNoKi40fSlgLGUuZmlsbFJlY3QoMCwwLGEsdSkpfWNvbnN0IEYwPSJ2ZWN0b3JzdHJpa2UuYmVzdHMudjEiLCQwPSJ2ZWN0b3JzdHJpa2UuZGlmZi52MSI7ZnVuY3Rpb24gdGcoKXtjb25zdCBlPXtjYWRldDowLHBpbG90OjAsYWNlOjB9O3RyeXtjb25zdCBsPWxvY2FsU3RvcmFnZS5nZXRJdGVtKEYwKTtpZighbClyZXR1cm4gZTtjb25zdCBhPUpTT04ucGFyc2UobCk7cmV0dXJue2NhZGV0Ok51bWJlcihhLmNhZGV0KXx8MCxwaWxvdDpOdW1iZXIoYS5waWxvdCl8fDAsYWNlOk51bWJlcihhLmFjZSl8fDB9fWNhdGNoe3JldHVybiBlfX1mdW5jdGlvbiBuZygpe3RyeXtjb25zdCBlPWxvY2FsU3RvcmFnZS5nZXRJdGVtKCQwKTtpZihlPT09ImNhZGV0Inx8ZT09PSJwaWxvdCJ8fGU9PT0iYWNlIilyZXR1cm4gZX1jYXRjaHt9cmV0dXJuInBpbG90In1mdW5jdGlvbiByZygpe2NvbnN0IGU9eC51c2VSZWYobnVsbCksbD14LnVzZVJlZihudWxsKSxhPXgudXNlUmVmKFZvKCkpLHU9eC51c2VSZWYoe3c6MCxoOjB9KSxkPXgudXNlUmVmKDApLG89eC51c2VSZWYobmV3IFNldCkscD14LnVzZVJlZighMSksaD14LnVzZVJlZih7c2hvdHM6MCxib29tczowLGhpdHM6MCxwb3dlcnM6MCx3YXZlczowLHBoaXRzOjAsc2hpdHM6MH0pLFttLGddPXgudXNlU3RhdGUoImlkbGUiKSx2PXgudXNlUmVmKCJpZGxlIiksW3csTV09eC51c2VTdGF0ZSgwKSxSPXgudXNlUmVmKDApLFtXLFFdPXgudXNlU3RhdGUoMSksW1MsSF09eC51c2VTdGF0ZSgwKSxbVixxXT14LnVzZVN0YXRlKDMpLFtvZSxaXT14LnVzZVN0YXRlKDApLFt5ZSxTZV09eC51c2VTdGF0ZSghMSksW2tlLFBlXT14LnVzZVN0YXRlKG5nKSxFZT14LnVzZVJlZihrZSksW09lLEJlXT14LnVzZVN0YXRlKHRnKSx6ZT14LnVzZVJlZihPZSksW0ZlLExlXT14LnVzZVN0YXRlKGhuKSxqZT14LnVzZVJlZihGZSksd2U9eC51c2VDYWxsYmFjayhQPT57di5jdXJyZW50PVAsZyhQKX0sW10pLFU9eC51c2VDYWxsYmFjaygoKT0+e2QuY3VycmVudCYmKHdpbmRvdy5jbGVhclRpbWVvdXQoZC5jdXJyZW50KSxkLmN1cnJlbnQ9MCl9LFtdKSx0ZT14LnVzZUNhbGxiYWNrKFA9PntVKCksd2UoInJlYWR5IiksZC5jdXJyZW50PXdpbmRvdy5zZXRUaW1lb3V0KCgpPT57ZC5jdXJyZW50PTAsdi5jdXJyZW50PT09InJlYWR5IiYmd2UoInJ1bm5pbmciKX0sUCl9LFtVLHdlXSksRj14LnVzZUNhbGxiYWNrKCgpPT57WGUoKSxVKCk7Y29uc3R7dzpQLGg6aWV9PXUuY3VycmVudDthLmN1cnJlbnQ9Vm8oUHx8NjAwLGllfHw2MDApO2NvbnN0IFk9YS5jdXJyZW50O2guY3VycmVudD17c2hvdHM6WS5zaG90c0ZpcmVkLGJvb21zOlkuYm9vbXMsaGl0czpZLmhpdHMscG93ZXJzOlkucG93ZXJzLHdhdmVzOlkud2F2ZUNsZWFycyxwaGl0czpZLnBsYXllckhpdHMsc2hpdHM6WS5zaGllbGRIaXRzfSxSLmN1cnJlbnQ9MCxNKDApLFEoMSksSCgwKSxxKDMpLFNlKCExKSxIZS5zdGFydCgpLHRlKDFlMyl9LFtVLHRlXSksaz14LnVzZUNhbGxiYWNrKCgpPT57di5jdXJyZW50PT09InJ1bm5pbmciJiYoVSgpLEhlLnBhdXNlKCksd2UoInBhdXNlZCIpKX0sW1Usd2VdKSxMPXgudXNlQ2FsbGJhY2soKCk9Pnt2LmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksSGUucmVzdW1lKCksdGUoNTAwKSl9LFt0ZV0pLHVlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBQPXYuY3VycmVudDtQPT09ImlkbGUifHxQPT09Im92ZXIiP0YoKTpQPT09InJ1bm5pbmciP2soKTpQPT09InBhdXNlZCImJkwoKX0sW0YsayxMXSksJD14LnVzZUNhbGxiYWNrKFA9Pntjb25zdCBpZT12LmN1cnJlbnQ7aWYoaWU9PT0icnVubmluZyJ8fGllPT09InJlYWR5Inx8aWU9PT0icGF1c2VkIilyZXR1cm47RWUuY3VycmVudD1QLFBlKFApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgkMCxQKX1jYXRjaHt9Y29uc3R7dzpZLGg6X309dS5jdXJyZW50O2EuY3VycmVudD1WbyhZfHw2MDAsX3x8NjAwKSxSLmN1cnJlbnQ9MCxNKDApLFEoMSksSCgwKSxxKDMpLFNlKCExKX0sW10pLEo9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFA9IWplLmN1cnJlbnQ7amUuY3VycmVudD1QLExlKFApLHV0KFApLG1uKFApfSxbXSksaGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFA9YS5jdXJyZW50O0hlLmRpZSgpO2NvbnN0IGllPUVlLmN1cnJlbnQsWT1QLnNjb3JlO2lmKFk+emUuY3VycmVudFtpZV0pe2NvbnN0IF89ey4uLnplLmN1cnJlbnQsW2llXTpZfTt6ZS5jdXJyZW50PV8sQmUoXyksU2UoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShGMCxKU09OLnN0cmluZ2lmeShfKSl9Y2F0Y2h7fX13ZSgib3ZlciIpfSxbd2VdKSx2ZT14LnVzZVJlZighMSksRz14LnVzZVJlZighMSkseGU9eC51c2VDYWxsYmFjayhQPT57aWYoUC5wb2ludGVyVHlwZT09PSJtb3VzZSIpe1AucHJldmVudERlZmF1bHQoKSxYZSgpO3RyeXtQLmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmUoUC5wb2ludGVySWQpfWNhdGNoe312ZS5jdXJyZW50PSEwLHYuY3VycmVudD09PSJpZGxlIiYmRigpfX0sW0ZdKSxhZT14LnVzZUNhbGxiYWNrKFA9Pnt2ZS5jdXJyZW50PSExO3RyeXtQLmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKFAucG9pbnRlcklkKX1jYXRjaHt9fSxbXSksZWU9eC51c2VDYWxsYmFjayhQPT57UCYmKFhlKCksKHYuY3VycmVudD09PSJpZGxlInx8di5jdXJyZW50PT09Im92ZXIiKSYmRigpKSxHLmN1cnJlbnQ9UH0sW0ZdKSx6PXgudXNlQ2FsbGJhY2soUD0+e28uY3VycmVudC5hZGQoUCksdi5jdXJyZW50PT09ImlkbGUiJiZGKCl9LFtGXSksZmU9eC51c2VDYWxsYmFjayhQPT57by5jdXJyZW50LmRlbGV0ZShQKX0sW10pO3JldHVybiB4LnVzZUVmZmVjdCgoKT0+e3V0KGplLmN1cnJlbnQpO2xldCBQPTA7Y29uc3QgaWU9WD0+e2NvbnN0IFQ9YS5jdXJyZW50LGJlPVQubGFzdD9NYXRoLm1pbig2MCxYLVQubGFzdCk6MTY7VC5sYXN0PVg7Y29uc3QgbmU9dS5jdXJyZW50O25lLnc+MCYmKFQudz1uZS53LFQuaD1uZS5oKTtjb25zdCBzZT1vLmN1cnJlbnQ7VC5tb3ZlLng9KHNlLmhhcygiYXJyb3dyaWdodCIpfHxzZS5oYXMoImQiKT8xOjApLShzZS5oYXMoImFycm93bGVmdCIpfHxzZS5oYXMoImEiKT8xOjApLFQubW92ZS55PShzZS5oYXMoImFycm93ZG93biIpfHxzZS5oYXMoInMiKT8xOjApLShzZS5oYXMoImFycm93dXAiKXx8c2UuaGFzKCJ3Iik/MTowKTtjb25zdCBwZT12LmN1cnJlbnQ7VC5maXJpbmc9KHAuY3VycmVudHx8dmUuY3VycmVudHx8Ry5jdXJyZW50KSYmcGU9PT0icnVubmluZyI7Y29uc3QgV2U9cGU9PT0icnVubmluZyJ8fHBlPT09Im92ZXIiO3FtKFQsYmUsWCwkbVtFZS5jdXJyZW50XSxXZSksVC5zY29yZSE9PVIuY3VycmVudCYmKFIuY3VycmVudD1ULnNjb3JlLE0oVC5zY29yZSksWihsdD0+bHQrMSkpLFEoVC53YXZlKSxIKFQua2lsbHMpLHEoVC5saXZlcyk7Y29uc3QgR2U9aC5jdXJyZW50O1Quc2hvdHNGaXJlZCE9PUdlLnNob3RzJiYoR2Uuc2hvdHM9VC5zaG90c0ZpcmVkLEhlLnNob290KCkpLFQuYm9vbXMhPT1HZS5ib29tcyYmKEdlLmJvb21zPVQuYm9vbXMsSGUuYm9vbSgpKSxULmhpdHMhPT1HZS5oaXRzJiYoR2UuaGl0cz1ULmhpdHMsSGUuaGl0KCkpLFQucG93ZXJzIT09R2UucG93ZXJzJiYoR2UucG93ZXJzPVQucG93ZXJzLEhlLnBvd2VyKCkpLFQud2F2ZUNsZWFycyE9PUdlLndhdmVzJiYoR2Uud2F2ZXM9VC53YXZlQ2xlYXJzLEhlLndhdmUoKSksVC5wbGF5ZXJIaXRzIT09R2UucGhpdHMmJihHZS5waGl0cz1ULnBsYXllckhpdHMsSGUucGxheWVySGl0KCkpLFQuc2hpZWxkSGl0cyE9PUdlLnNoaXRzJiYoR2Uuc2hpdHM9VC5zaGllbGRIaXRzLEhlLnNoaWVsZERvd24oKSkscGU9PT0icnVubmluZyImJlQuZGllZEF0PjAmJlgtVC5kaWVkQXQ+ODUwJiZoZSgpO2NvbnN0IEx0PWUuY3VycmVudDtpZihMdCYmbmUudz4wKXtjb25zdCBsdD1MdC5nZXRDb250ZXh0KCIyZCIpO2x0JiZlZyhsdCxULG5lLncsbmUuaCxwZSl9UD1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoaWUpfTtQPXJlcXVlc3RBbmltYXRpb25GcmFtZShpZSk7Y29uc3QgWT1sLmN1cnJlbnQsXz1lLmN1cnJlbnQ7bGV0IEk9bnVsbDtpZihZJiZfKXtjb25zdCBYPSgpPT57Y29uc3QgVD1ZLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGJlPU1hdGgubWF4KDAsTWF0aC5mbG9vcihNYXRoLm1pbihULndpZHRoLFQuaGVpZ2h0KSkpLG5lPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpO18ud2lkdGg9TWF0aC5yb3VuZChiZSpuZSksXy5oZWlnaHQ9TWF0aC5yb3VuZChiZSpuZSksXy5zdHlsZS53aWR0aD1gJHtiZX1weGAsXy5zdHlsZS5oZWlnaHQ9YCR7YmV9cHhgLHUuY3VycmVudD17dzpiZSxoOmJlfTtjb25zdCBzZT1fLmdldENvbnRleHQoIjJkIik7c2UmJnNlLnNldFRyYW5zZm9ybShuZSwwLDAsbmUsMCwwKX07WCgpLEk9bmV3IFJlc2l6ZU9ic2VydmVyKFgpLEkub2JzZXJ2ZShZKX1jb25zdCBkZT1YPT57Y29uc3QgVD1YLmtleS50b0xvd2VyQ2FzZSgpO2lmKFsiYXJyb3d1cCIsImFycm93ZG93biIsImFycm93bGVmdCIsImFycm93cmlnaHQiLCJ3IiwiYSIsInMiLCJkIl0uaW5jbHVkZXMoVCkpe1gucHJldmVudERlZmF1bHQoKSxvLmN1cnJlbnQuYWRkKFQpLHYuY3VycmVudD09PSJpZGxlIiYmRigpO3JldHVybn1pZihUPT09IiAiKXtpZihYLnByZXZlbnREZWZhdWx0KCksIVgucmVwZWF0KXtjb25zdCBuZT12LmN1cnJlbnQ7bmU9PT0iaWRsZSJ8fG5lPT09Im92ZXIiP0YoKTpuZT09PSJwYXVzZWQiJiZMKCl9cC5jdXJyZW50PSEwO3JldHVybn1pZihUPT09InIiKXtGKCk7cmV0dXJufWlmKFQ9PT0icCJ8fFQ9PT0iZXNjYXBlIil7Y29uc3QgbmU9di5jdXJyZW50O25lPT09InJ1bm5pbmciP2soKTpuZT09PSJwYXVzZWQiJiZMKCk7cmV0dXJufWlmKFQ9PT0ibSIpe0ooKTtyZXR1cm59VD09PSIxIiYmJCgiY2FkZXQiKSxUPT09IjIiJiYkKCJwaWxvdCIpLFQ9PT0iMyImJiQoImFjZSIpfSxPPVg9Pntjb25zdCBUPVgua2V5LnRvTG93ZXJDYXNlKCk7by5jdXJyZW50LmRlbGV0ZShUKSxUPT09IiAiJiYocC5jdXJyZW50PSExKX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLGRlKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5dXAiLE8pO2NvbnN0IGo9KCk9Pntkb2N1bWVudC5oaWRkZW4mJnYuY3VycmVudD09PSJydW5uaW5nIiYmaygpfSxnZT0oKT0+e3YuY3VycmVudD09PSJydW5uaW5nIiYmaygpLG8uY3VycmVudC5jbGVhcigpLHAuY3VycmVudD0hMX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLGopLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixnZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShQKSxVKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLGRlKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5dXAiLE8pLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLGopLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixnZSksSSYmSS5kaXNjb25uZWN0KCl9fSxbJCxVLGhlLGssTCxGLEpdKSx7Y2FudmFzUmVmOmUsd3JhcFJlZjpsLHBoYXNlOm0sc2NvcmU6dyx3YXZlOlcsa2lsbHM6UyxsaXZlczpWLHBvcEtleTpvZSxpc05ld0Jlc3Q6eWUsZGlmZmljdWx0eTprZSxiZXN0czpPZSxtdXRlZDpGZSxhY3Rpb25zOntzdGFydDpGLHByaW1hcnk6dWUscGF1c2VHYW1lOmsscmVzdW1lR2FtZTpMLGNoYW5nZURpZmZpY3VsdHk6JCx0b2dnbGVNdXRlOkosb25DYW52YXNEb3duOnhlLG9uQ2FudmFzVXA6YWUsc2V0RmlyZTplZSxkcGFkRG93bjp6LGRwYWRVcDpmZX19fWNvbnN0IHpkPVt7aWQ6ImNhZGV0IixsYWJlbDoiQ2FkZXQiLHRhZzoiUmVsYXhlZCBwYXRyb2wiLGRvdHM6MX0se2lkOiJwaWxvdCIsbGFiZWw6IlBpbG90Iix0YWc6IlN0YW5kYXJkIG9wcyIsZG90czoyfSx7aWQ6ImFjZSIsbGFiZWw6IkFjZSIsdGFnOiJObyBtZXJjeSIsZG90czozfV07ZnVuY3Rpb24gc2coe2NsYXNzTmFtZTplPSJoLTggdy04In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxNiIscjoiMTMiLHN0cm9rZToiIzYyZTZmZiIsc3Ryb2tlV2lkdGg6IjIiLG9wYWNpdHk6IjAuNyJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0xNiAzdjVNMTYgMjR2NU0zIDE2aDVNMjQgMTZoNSIsc3Ryb2tlOiIjNjJlNmZmIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSksci5qc3goInBhdGgiLHtkOiJNMTYgOWw2IDEzLjUtNi0zLjYtNiAzLjZ6IixmaWxsOiIjZmZkMTY2IixzdHJva2U6IiNmZmYzYzQiLHN0cm9rZVdpZHRoOiIxIixzdHJva2VMaW5lam9pbjoicm91bmQifSldfSl9ZnVuY3Rpb24gbGcoe2NsYXNzTmFtZTplPSJoLTMuNSB3LTMuNSJ9KXtyZXR1cm4gci5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpyLmpzeCgicGF0aCIse2Q6Ik0xMiAybDcgMTgtNy00LjVMNSAyMHoifSl9KX1mdW5jdGlvbiBxbyh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTB9KXtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjplfSksci5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHthPyJhbmltYXRlLXBvcCB0ZXh0LWFtYmVyZ2xvdy00MDAiOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmx9LHUpXX0pfWZ1bmN0aW9uIHNyKHtrZXlzTGlzdDplLGFjdGlvbjpsfSl7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjplfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmx9KV19KX1mdW5jdGlvbiBGZCh7b25Eb3duOmUsb25VcDpsLGxhYmVsOmEsY2hpbGRyZW46dSxjbGFzc05hbWU6ZD0iIn0pe3JldHVybiByLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIiwiYXJpYS1sYWJlbCI6YSxjbGFzc05hbWU6YGZsZXggdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgJHtkfWAsb25Qb2ludGVyRG93bjpvPT57by5wcmV2ZW50RGVmYXVsdCgpLGUoKX0sb25Qb2ludGVyVXA6bCxvblBvaW50ZXJDYW5jZWw6bCxvblBvaW50ZXJMZWF2ZTpsLG9uQ29udGV4dE1lbnU6bz0+by5wcmV2ZW50RGVmYXVsdCgpLGNoaWxkcmVuOnV9KX1mdW5jdGlvbiBhZyh7Y2xhc3NOYW1lOmU9ImgtNSB3LTUifSl7cmV0dXJuIHIuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6Im5vbmUiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMyIsc3Ryb2tlTGluZWNhcDoicm91bmQiLHN0cm9rZUxpbmVqb2luOiJyb3VuZCIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46ci5qc3goInBhdGgiLHtkOiJNNiAxNGw2LTYgNiA2In0pfSl9Y29uc3QgaWc9W3tpZDoiYXJyb3d1cCIsbGFiZWw6IlVwIixjZWxsOiJjb2wtc3RhcnQtMiByb3ctc3RhcnQtMSIscm90OiIifSx7aWQ6ImFycm93bGVmdCIsbGFiZWw6IkxlZnQiLGNlbGw6ImNvbC1zdGFydC0xIHJvdy1zdGFydC0yIixyb3Q6Ii1yb3RhdGUtOTAifSx7aWQ6ImFycm93ZG93biIsbGFiZWw6IkRvd24iLGNlbGw6ImNvbC1zdGFydC0yIHJvdy1zdGFydC0yIixyb3Q6InJvdGF0ZS0xODAifSx7aWQ6ImFycm93cmlnaHQiLGxhYmVsOiJSaWdodCIsY2VsbDoiY29sLXN0YXJ0LTMgcm93LXN0YXJ0LTIiLHJvdDoicm90YXRlLTkwIn1dO2Z1bmN0aW9uIG9nKHthY3Rpb25zOmV9KXtyZXR1cm4gdHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXM/ci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDYwcHhdIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdyaWQtY29scy0zIGdyaWQtcm93cy0yIGdhcC0xLjUiLGNoaWxkcmVuOmlnLm1hcChhPT5yLmpzeChGZCx7bGFiZWw6YS5sYWJlbCxjbGFzc05hbWU6YGJ0bi1hcmNhZGUgYnRuLWdob3N0IGgtMTIgdy0xNiAke2EuY2VsbH1gLG9uRG93bjooKT0+ZS5kcGFkRG93bihhLmlkKSxvblVwOigpPT5lLmRwYWRVcChhLmlkKSxjaGlsZHJlbjpyLmpzeChhZyx7Y2xhc3NOYW1lOmBoLTUgdy01IHRleHQtbW9zcy0yMDAgJHthLnJvdH1gfSl9LGEuaWQpKX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMS41IixjaGlsZHJlbjpbci5qc3goRmQse2xhYmVsOiJGaXJlIixjbGFzc05hbWU6ImgtWzEwOHB4XSB3LVsxMDhweF0gcm91bmRlZC1mdWxsIGJvcmRlci0yIGJvcmRlci1hcHBsZS00MDAvNzAgYm9yZGVyLWItNCBib3JkZXItYi1bIzdlMjMyN10gYmctYXBwbGUtNTAwLzI1IHRleHQtYXBwbGUtNDAwIHNoYWRvdy1bMF8wXzI4cHhfcmdiYSgyNTUsOTMsMTQzLDAuMjgpXSBhY3RpdmU6dHJhbnNsYXRlLXktMC41IixvbkRvd246KCk9PmUuc2V0RmlyZSghMCksb25VcDooKT0+ZS5zZXRGaXJlKCExKSxjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRyYWNraW5nLVswLjJlbV0iLGNoaWxkcmVuOiJGSVJFIn0pfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWzEwcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJob2xkIHRvIGF1dG8tZmlyZSJ9KV19KV19KTpudWxsfWZ1bmN0aW9uIGNnKCl7Y29uc3QgZT1yZygpLHthY3Rpb25zOmwscGhhc2U6YX09ZSx1PWE9PT0icnVubmluZyI7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLXJpc2UiLGNoaWxkcmVuOltyLmpzeHMoImhlYWRlciIse2NsYXNzTmFtZToibWItNCBmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQganVzdGlmeS1iZXR3ZWVuIGdhcC0zIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBnYXAtMiBzbTpnYXAtMyIsY2hpbGRyZW46W3IuanN4KHFvLHtsYWJlbDoiU2NvcmUiLHZhbHVlOmUuc2NvcmUsYWNjZW50OiEwLHBvcDplLnBvcEtleX0pLHIuanN4KHFvLHtsYWJlbDoiV2F2ZSIsdmFsdWU6ci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM2MmU2ZmZdIFt0ZXh0LXNoYWRvdzowXzBfMTJweF9yZ2JhKDk4LDIzMCwyNTUsMC40NSldIixjaGlsZHJlbjplLndhdmV9KX0pLHIuanN4KHFvLHtsYWJlbDoiS2lsbHMiLHZhbHVlOmUua2lsbHN9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJMaXZlcyJ9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBwdC0xIHRleHQtWyM2MmU2ZmZdIixjaGlsZHJlbjpBcnJheS5mcm9tKHtsZW5ndGg6M30sKGQsbyk9PnIuanN4KGxnLHtjbGFzc05hbWU6YGgtMy41IHctMy41ICR7bzxlLmxpdmVzPyIiOiJvcGFjaXR5LTIwIGdyYXlzY2FsZSJ9YH0sbykpfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTp1PyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOnU/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiF1JiZhIT09InBhdXNlZCIsY2hpbGRyZW46dT9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1jcm9zc2hhaXIiLG9uUG9pbnRlckRvd246bC5vbkNhbnZhc0Rvd24sb25Qb2ludGVyVXA6bC5vbkNhbnZhc1VwLG9uUG9pbnRlckNhbmNlbDpsLm9uQ2FudmFzVXAsb25Db250ZXh0TWVudTpkPT5kLnByZXZlbnREZWZhdWx0KCl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTIgei0yMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46WyJsZWZ0LTAgdG9wLTAgYm9yZGVyLWwtMiBib3JkZXItdC0yIiwicmlnaHQtMCB0b3AtMCBib3JkZXItci0yIGJvcmRlci10LTIiLCJsZWZ0LTAgYm90dG9tLTAgYm9yZGVyLWwtMiBib3JkZXItYi0yIiwicmlnaHQtMCBib3R0b20tMCBib3JkZXItci0yIGJvcmRlci1iLTIiXS5tYXAoZD0+ci5qc3goInNwYW4iLHtjbGFzc05hbWU6YGFic29sdXRlIGgtNCB3LTQgYm9yZGVyLVsjNjJlNmZmXS80MCAke2R9YH0sZCkpfSksYT09PSJpZGxlIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzA1MGExNF0vODAgcC02IHRleHQtY2VudGVyIGJhY2tkcm9wLWJsdXItWzJweF0iLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltyLmpzeChzZyx7Y2xhc3NOYW1lOiJoLTEyIHctMTIifSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jeWFuIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IlZFQ1RPUiBTVFJJS0UifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0yIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LVsjOWZjM2Q5XSIsY2hpbGRyZW46IldBVkUgREVGRU5TRSBCTEFTVEVSIn0pXX0pXX0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBMYXVuY2ggTWlzc2lvbiJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIE9SIEhJVCBMQVVOQ0gifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJoaWRkZW4gaXRlbXMtY2VudGVyIGdhcC0xIHNtOmZsZXgiLGNoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiV0FTRCJ9KSwiIG1vdmUiXX0pLHIuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgaG9sZCB0byBmaXJlIl19KSxyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTEgc206ZmxleCIsY2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJDbGljayJ9KSwiIHNob290Il19KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToic206aGlkZGVuIixjaGlsZHJlbjoiRC1wYWQgbW92ZXMgwrcgRklSRSBzaG9vdHMifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxyLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiBwYXVzZSJdfSldfSksZS5pc05ld0Jlc3QmJnIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KV19KSxhPT09InBhdXNlZCImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNTBhMTRdLzgwIHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jeWFuIGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiU1lTVEVNUyBIQUxURUQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3IuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucmVzdW1lR2FtZSxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxyLmpzeChBZSx7b25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJtbC0xIixjaGlsZHJlbjoicmVzdW1lcyJ9KV19KV19KSxhPT09Im92ZXIiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMDUwYTE0XS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1hcHBsZS00MDAgW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDEwNywxMDcsMC41KV0gc206dGV4dC0yeGwiLGNoaWxkcmVuOiJTSElQIERFU1RST1lFRCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46ZS5zY29yZX0pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjOWZjM2Q5XSIsY2hpbGRyZW46WyJXQVZFICIsZS53YXZlLCIgwrcgIixlLmtpbGxzLCIgS0lMTFMiXX0pLGUuaXNOZXdCZXN0JiZyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIEZseSBBZ2FpbiJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSksci5qc3gob2cse2FjdGlvbnM6ZS5hY3Rpb25zfSksci5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmE9PT0icnVubmluZyI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChndCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgRmx5IEFnYWluIl19KTpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBMYXVuY2ggTWlzc2lvbiJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiTWlzc2lvbiBJbnRlbCIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiaC0yLjUgdy0yLjUgcm91bmRlZC1mdWxsIGJnLWFwcGxlLTQwMCBzaGFkb3ctWzBfMF84cHhfcmdiYSgyNTUsMTA3LDEwNywwLjgpXSJ9KSwiR3J1bnQiXX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiMTAwIHB0cyJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdGF0ZS00NSBiZy1bI2MwODRmY10gc2hhZG93LVswXzBfOHB4X3JnYmEoMTkyLDEzMiwyNTIsMC44KV0ifSksIldlYXZlciDigJQgYWltcyBhdCB5b3UiXX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiMjUwIHB0cyJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdW5kZWQtc20gYmctWyNmZjhjNDJdIHNoYWRvdy1bMF8wXzhweF9yZ2JhKDI1NSwxNDAsNjYsMC44KV0ifSksIlRhbmsg4oCUIHNwcmVhZCBzaG90Il19KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46IjUwMCBwdHMifSldfSldfSksci5qc3hzKCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46WyJDYXBzdWxlcyBkcm9wIGZyb20gd3JlY2thZ2U6ICIsci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46IlQifSksInJpcGxlLCIsIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjN2VmMGEwXSIsY2hpbGRyZW46IlIifSksImFwaWQsICIsci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM2MmU2ZmZdIixjaGlsZHJlbjoiUyJ9KSwiaGllbGQuIENsZWFyIGEgd2F2ZSBmb3IgYSBib251cy4iXX0pXX0pLHIuanN4KGRuLHt0aXRsZToiVGhyZWF0IExldmVsIixvcHRpb25zOnpkLHZhbHVlOmUuZGlmZmljdWx0eSxvbkNoYW5nZTpsLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6YT09PSJydW5uaW5nInx8YT09PSJyZWFkeSJ8fGE9PT0icGF1c2VkIn0pLHIuanN4KHBuLHtiZXN0czplLmJlc3RzLG9wdGlvbnM6emQsYWN0aXZlOmUuZGlmZmljdWx0eX0pLHIuanN4cyhydCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbci5qc3goc3Ise2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IldBU0QifSksci5qc3goQSx7Y2hpbGRyZW46IuKGkOKGkeKGk+KGkiJ9KV19KSxhY3Rpb246IkZseSJ9KSxyLmpzeChzcix7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IkhvbGQgU3BhY2UifSksYWN0aW9uOiJGaXJlIGNhbm5vbnMifSksci5qc3goc3Ise2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJDbGljayJ9KSxhY3Rpb246IlNpbmdsZSBzaG90In0pLHIuanN4KHNyLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiSG9sZCBtb3VzZSJ9KSxhY3Rpb246IkNvbnRpbnVvdXMgZmlyZSJ9KSxyLmpzeChzcix7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiUCJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiRXNjIn0pXX0pLGFjdGlvbjoiUGF1c2UifSksci5qc3goc3Ise2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJSIn0pLGFjdGlvbjoiUmVzdGFydCJ9KSxyLmpzeChzcix7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiMSJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiMiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiMyJ9KV19KSxhY3Rpb246IlRocmVhdCBsZXZlbCJ9KSxyLmpzeChzcix7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJGbGlnaHQgaXMga2V5Ym9hcmQtb25seSAoV0FTRCAvIGFycm93cykg4oCUIG9uIHRvdWNoIHNjcmVlbnMsIHVzZSB0aGUgb24tc2NyZWVuIEQtcGFkIGFuZCB0aGUgRklSRSBidXR0b24uIFRoZSBzaGlwIG5ldmVyIGNoYXNlcyB0aGUgcG9pbnRlci4ifSldfSldfSldfSldfSl9Y29uc3QgY2w9e3Jvb2tpZTp7bGFiZWw6IlJPT0tJRSIsdGFnOiJ3aWRlIHBhZGRsZSwgZ2VudGxlIHBhY2UiLGRvdHM6MSxiYWxsU3BlZWQ6MzAwLHBhZGRsZVJhdGlvOi4yNCxsaXZlczozLGRyb3BSYXRlOi4yNixzcGVlZFJhbXA6LjA1fSxwcm86e2xhYmVsOiJQUk8iLHRhZzoidGhlIGludGVuZGVkIHJpb3QiLGRvdHM6MixiYWxsU3BlZWQ6MzYwLHBhZGRsZVJhdGlvOi4xOSxsaXZlczozLGRyb3BSYXRlOi4xNixzcGVlZFJhbXA6LjA2NX0scmlvdDp7bGFiZWw6IlJJT1QiLHRhZzoiZmFzdCBiYWxsLCB0aGluIHBhZGRsZSIsZG90czozLGJhbGxTcGVlZDo0MTUscGFkZGxlUmF0aW86LjE1LGxpdmVzOjIsZHJvcFJhdGU6LjExLHNwZWVkUmFtcDouMDh9fSx1Zz1NYXRoLlBJKjIscGw9KGUsbCk9PmUrTWF0aC5yYW5kb20oKSoobC1lKSx5cz0oZSxsLGEpPT5NYXRoLm1heChsLE1hdGgubWluKGEsZSkpLGZnPWU9PmVbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmUubGVuZ3RoKV0sWW89MTAsZGc9NiwkZD0xNCxYbz02LHBnPTU4LFdkPTIyLEhkPTE0LFd0PTcsaGc9ODtmdW5jdGlvbiBqbihlKXtyZXR1cm4gZS5oLTQyfWZ1bmN0aW9uIFcwKGUpe2UuYnJpY2tzPVtdO2NvbnN0IGw9KGUudy0kZCoyLShZby0xKSpYbykvWW8sYT1lLmxldmVsO2ZvcihsZXQgdT0wO3U8ZGc7dSsrKWZvcihsZXQgZD0wO2Q8WW87ZCsrKXtsZXQgbz0xO2NvbnN0IHA9TWF0aC5yYW5kb20oKSxoPWE+PTM/TWF0aC5taW4oLjMsKGEtMikqLjA2KTowLG09TWF0aC5taW4oLjUsLjA4K2EqLjA3KTtwPGg/bz0zOnA8aCttJiYobz0yKSxlLmJyaWNrcy5wdXNoKHt4OiRkK2QqKGwrWG8pLHk6cGcrdSooV2QrWG8pLHc6bCxoOldkLGhwOm8sbWF4SHA6byxmbGFzaDowfSl9fWZ1bmN0aW9uIFNjKGUpe3JldHVybnt4OmUucGFkZGxlLngseTpqbihlKS1XdC0yLHZ4OjAsdnk6MCxzdHVjazohMH19ZnVuY3Rpb24gVWQoZT02MDAsbD02MDAsYSl7Y29uc3QgdT1lKmEucGFkZGxlUmF0aW8sZD17dzplLGg6bCx0aW1lOjAsbGFzdDowLHBhZGRsZTp7eDplLzIsdzp1LGJhc2VXOnUsdGFyZ2V0WDplLzIscG9pbnRlcjohMSxreDowfSxiYWxsczpbXSxicmlja3M6W10sY2Fwc3VsZXM6W10scGFydGljbGVzOltdLGZsb2F0ZXJzOltdLGxpdmVzOmEubGl2ZXMsc2NvcmU6MCxsZXZlbDoxLGNvbWJvOjAsd2lkZVQ6MCxzbG93VDowLHNlcnZlVDoxZTMsc2hha2U6MCxoaXRGbGFzaDowLGRpZWRBdDowLHBhZGRsZUhpdHM6MCx3YWxsSGl0czowLGJyaWNrQnJlYWtzOjAsYnJpY2tEZW50czowLHBvd2VyczowLGxldmVsQ2xlYXJzOjAsbGlmZUxvc3Q6MCxsYXVuY2hlczowfTtyZXR1cm4gVzAoZCksZC5iYWxscy5wdXNoKFNjKGQpKSxkfWZ1bmN0aW9uIE5jKGUsbCl7Y29uc3QgYT0xKyhlLmxldmVsLTEpKmwuc3BlZWRSYW1wO2xldCB1PWwuYmFsbFNwZWVkKmE7cmV0dXJuIGUuc2xvd1Q+MCYmKHUqPS42KSxNYXRoLm1pbih1LGwuYmFsbFNwZWVkKjEuOSl9ZnVuY3Rpb24gYnMoZSxsLGEsdSxkPTEyLG89MSl7Y29uc3QgcD1NYXRoLm1pbigyMjAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgaD1lLnBhcnRpY2xlcy5sZW5ndGg7aDxwO2grKyl7Y29uc3QgbT1wbCgwLHVnKSxnPXBsKDMwLDIyMCkqbyx2PXBsKDI4MCw2NTApO2UucGFydGljbGVzLnB1c2goe3g6bCx5OmEsdng6TWF0aC5jb3MobSkqZyx2eTpNYXRoLnNpbihtKSpnLGxpZmU6dixtYXhMaWZlOnYsc2l6ZTpwbCgxLjUsMy40KSpvLGNvbG9yOmZnKHUpLGRyYWc6Mi4yLGdyYXY6MzB9KX19ZnVuY3Rpb24gbWcoZSl7cmV0dXJuIE1hdGgubWluKDYsMStlKi41KX1mdW5jdGlvbiBIMChlLGwsYSl7ZS5zdHVjaz0hMTtjb25zdCB1PXBsKC0uMzUsLjM1KSxkPU5jKGwsYSk7ZS52eD1NYXRoLnNpbih1KSpkLGUudnk9LU1hdGguY29zKHUpKmQsbC5sYXVuY2hlcysrfWZ1bmN0aW9uIGdnKGUsbCl7Y29uc3QgYT1bXTtmb3IoY29uc3QgdSBvZiBlLmJhbGxzKXtpZih1LnN0dWNrKWNvbnRpbnVlO2NvbnN0IGQ9TWF0aC5hdGFuMih1LnZ5LHUudngpLG89TmMoZSxsKTtmb3IoY29uc3QgcCBvZlstLjUsLjVdKXtpZihlLmJhbGxzLmxlbmd0aCthLmxlbmd0aD49aGcpYnJlYWs7YS5wdXNoKHt4OnUueCx5OnUueSx2eDpNYXRoLmNvcyhkK3ApKm8sdnk6TWF0aC5zaW4oZCtwKSpvLHN0dWNrOiExfSl9fWUuYmFsbHMucHVzaCguLi5hKX1mdW5jdGlvbiB4ZyhlLGwsYSl7ZS5wb3dlcnMrKztjb25zdCB1PWUucGFkZGxlO2xldCBkPSIiLG89IiNmZmUwOGEiO2w9PT0id2lkZSI/KGUud2lkZVQ9MWU0LGQ9IldJREUgUEFERExFIixvPSIjOGVmMDVhIik6bD09PSJtdWx0aSI/KGdnKGUsYSksZD0iTVVMVElCQUxMIixvPSIjNjJlNmZmIik6KGUuc2xvd1Q9OGUzLGQ9IlNMT1ctTU8iLG89IiNjMDg0ZmMiKSxlLmZsb2F0ZXJzLnB1c2goe3g6dS54LHk6am4oZSktMjYsdHh0OmQsbGlmZToxZTMsbWF4TGlmZToxZTMsY29sb3I6b30pLGJzKGUsdS54LGpuKGUpLFtvLCIjZmZmZmZmIl0sMTAsLjcpfWZ1bmN0aW9uIHlnKGUsbCxhKXtjb25zdCB1PWUuYnJpY2tzW2xdO2UuYnJpY2tzLnNwbGljZShsLDEpLGUuY29tYm8rKyxlLmJyaWNrQnJlYWtzKys7Y29uc3QgZD00MCsodS5tYXhIcC0xKSozMCxvPU1hdGgucm91bmQoZCptZyhlLmNvbWJvKSk7ZS5zY29yZSs9bztjb25zdCBwPXUubWF4SHA9PT0xP1siIzhlZjA1YSIsIiNhY2Y2NjQiLCIjZmZmZmZmIl06dS5tYXhIcD09PTI/WyIjZmZjODU3IiwiI2ZmZTA4YSIsIiNmZmZmZmYiXTpbIiNmZjVkOGYiLCIjZmY4ZmIzIiwiI2ZmZDE2NiJdO2lmKGJzKGUsdS54K3Uudy8yLHUueSt1LmgvMixwLDEyLDEpLGUuc2hha2U9TWF0aC5tYXgoZS5zaGFrZSwyKSxlLmZsb2F0ZXJzLnB1c2goe3g6dS54K3Uudy8yLHk6dS55KzYsdHh0OmArJHtvfWAsbGlmZTo3MDAsbWF4TGlmZTo3MDAsY29sb3I6IiNmZmUwOGEifSksTWF0aC5yYW5kb20oKTxhLmRyb3BSYXRlKXtjb25zdCBoPU1hdGgucmFuZG9tKCksbT1oPC40PyJ3aWRlIjpoPC43NT8ibXVsdGkiOiJzbG93IjtlLmNhcHN1bGVzLnB1c2goe2tpbmQ6bSx4OnUueCt1LncvMix5OnUueSt1LmgvMix0OjB9KX19ZnVuY3Rpb24gdmcoZSxsLGEpe2UubGl2ZXMtLSxlLmNvbWJvPTAsZS5saWZlTG9zdCsrLGUuc2hha2U9MTMsZS5oaXRGbGFzaD0uNDUsZS5saXZlczw9MD8oZS5kaWVkQXQ9bCxicyhlLGUucGFkZGxlLngsam4oZSksWyIjZmY1ZDhmIiwiI2ZmZDE2NiIsIiNmZmZmZmYiXSwzNCwxLjQpKTooZS53aWRlVD0wLGUuc2xvd1Q9MCxlLnBhZGRsZS53PWUucGFkZGxlLmJhc2VXLGUuYmFsbHM9W1NjKGUpXSxlLnNlcnZlVD0xZTMsYnMoZSxlLnBhZGRsZS54LGpuKGUpLFsiI2ZmNWQ4ZiIsIiNmZmZmZmYiXSwxNiwxKSl9ZnVuY3Rpb24gd2coZSxsLGEsdSxkLG8scCl7Y29uc3QgaD15cyhlLHUsdStvKSxtPXlzKGwsZCxkK3ApLGc9ZS1oLHY9bC1tO3JldHVybiBnKmcrdip2PD1hKmF9ZnVuY3Rpb24gYmcoZSxsLGEsdSxkKXtjb25zdCBvPWwvMWUzO2UudGltZSs9bCxlLnNoYWtlPU1hdGgubWF4KDAsZS5zaGFrZS1sKi4wNDUpLGUuaGl0Rmxhc2g9TWF0aC5tYXgoMCxlLmhpdEZsYXNoLWwqLjAwMTYpLGUud2lkZVQ9TWF0aC5tYXgoMCxlLndpZGVULWwpLGUuc2xvd1Q9TWF0aC5tYXgoMCxlLnNsb3dULWwpO2NvbnN0IHA9ZS5wYWRkbGU7cC53PXAuYmFzZVcqKGUud2lkZVQ+MD8xLjU6MSk7Zm9yKGxldCBtPWUucGFydGljbGVzLmxlbmd0aC0xO20+PTA7bS0tKXtjb25zdCBnPWUucGFydGljbGVzW21dO2lmKGcubGlmZS09bCxnLmxpZmU8PTApe2NvbnN0IHY9ZS5wYXJ0aWNsZXMucG9wKCk7diYmbTxlLnBhcnRpY2xlcy5sZW5ndGgmJihlLnBhcnRpY2xlc1ttXT12KTtjb250aW51ZX1nLnZ4LT1nLnZ4KmcuZHJhZypvLGcudnkrPWcuZ3JhdipvLWcudnkqZy5kcmFnKm8sZy54Kz1nLnZ4Km8sZy55Kz1nLnZ5Km99Zm9yKGxldCBtPWUuZmxvYXRlcnMubGVuZ3RoLTE7bT49MDttLS0pZS5mbG9hdGVyc1ttXS5saWZlLT1sLGUuZmxvYXRlcnNbbV0ubGlmZTw9MCYmZS5mbG9hdGVycy5zcGxpY2UobSwxKTtmb3IoY29uc3QgbSBvZiBlLmJyaWNrcyltLmZsYXNoPU1hdGgubWF4KDAsbS5mbGFzaC1sKTtpZihwLmt4IT09MD9wLngrPXAua3gqNTIwKm86cC5wb2ludGVyJiYocC54Kz0ocC50YXJnZXRYLXAueCkqTWF0aC5taW4oMSxsKi4wMikpLHAueD15cyhwLngscC53LzIsZS53LXAudy8yKSwhZClyZXR1cm47aWYoZS5kaWVkQXQ9PT0wKXtjb25zdCBtPWUuYmFsbHMuZmluZChnPT5nLnN0dWNrKTttJiYobS54PXAueCxtLnk9am4oZSktV3QtMixlLnNlcnZlVC09bCxlLnNlcnZlVDw9MCYmSDAobSxlLHUpKX1mb3IobGV0IG09ZS5jYXBzdWxlcy5sZW5ndGgtMTttPj0wO20tLSl7Y29uc3QgZz1lLmNhcHN1bGVzW21dO2lmKGcudCs9bCxnLnkrPTk1Km8sZy55PmUuaCsyMCl7ZS5jYXBzdWxlcy5zcGxpY2UobSwxKTtjb250aW51ZX1lLmRpZWRBdD09PTAmJmcueSs5Pj1qbihlKSYmZy55LTk8PWpuKGUpK0hkJiZNYXRoLmFicyhnLngtcC54KTw9cC53LzIrMTAmJihlLmNhcHN1bGVzLnNwbGljZShtLDEpLHhnKGUsZy5raW5kLHUpKX1jb25zdCBoPU5jKGUsdSk7Zm9yKGxldCBtPWUuYmFsbHMubGVuZ3RoLTE7bT49MDttLS0pe2NvbnN0IGc9ZS5iYWxsc1ttXTtpZihnLnN0dWNrKWNvbnRpbnVlO2NvbnN0IHY9TWF0aC5oeXBvdChnLnZ4LGcudnkpfHwxO2cudng9Zy52eC92KmgsZy52eT1nLnZ5L3YqaDtjb25zdCB3PWgqLjI4O2lmKE1hdGguYWJzKGcudnkpPHcpe2NvbnN0IEg9Zy52eT09PTA/LTE6TWF0aC5zaWduKGcudnkpLFY9TWF0aC5zcXJ0KE1hdGgubWF4KDAsaCpoLXcqdykpO2cudnk9SCp3LGcudng9TWF0aC5zaWduKGcudnh8fDEpKlZ9Y29uc3QgTT1oKm8sUj1NYXRoLm1heCgxLE1hdGguY2VpbChNLzYpKSxXPWcudngqby9SLFE9Zy52eSpvL1I7bGV0IFM9ITE7Zm9yKGxldCBIPTA7SDxSJiYhUztIKyspe2lmKGcueCs9VyxnLnkrPVEsZy54PFd0PyhnLng9V3QsZy52eD1NYXRoLmFicyhnLnZ4KSxlLndhbGxIaXRzKyspOmcueD5lLnctV3QmJihnLng9ZS53LVd0LGcudng9LU1hdGguYWJzKGcudngpLGUud2FsbEhpdHMrKyksZy55PFd0JiYoZy55PVd0LGcudnk9TWF0aC5hYnMoZy52eSksZS53YWxsSGl0cysrKSxnLnk+ZS5oK1d0KzQpe2UuYmFsbHMuc3BsaWNlKG0sMSksUz0hMDticmVha31jb25zdCBWPWpuKGUpO2lmKGcudnk+MCYmZy55K1d0Pj1WJiZnLnktV3Q8PVYrSGQmJk1hdGguYWJzKGcueC1wLngpPD1wLncvMitXdCl7Y29uc3Qgb2U9eXMoKGcueC1wLngpLyhwLncvMiksLTEsMSkqMS4wNTtnLnZ4PU1hdGguc2luKG9lKSpoLGcudnk9LU1hdGguY29zKG9lKSpoLGcueT1WLVd0LS41LGUucGFkZGxlSGl0cysrLGUuY29tYm89MCxicyhlLGcueCxWLFsiIzhlZjA1YSIsIiNmZmZmZmYiXSw1LC41KX1mb3IobGV0IHE9ZS5icmlja3MubGVuZ3RoLTE7cT49MDtxLS0pe2NvbnN0IG9lPWUuYnJpY2tzW3FdO2lmKHdnKGcueCxnLnksV3Qsb2UueCxvZS55LG9lLncsb2UuaCkpe2NvbnN0IFo9eXMoZy54LG9lLngsb2UueCtvZS53KSx5ZT15cyhnLnksb2UueSxvZS55K29lLmgpLFNlPWcueC1aLGtlPWcueS15ZTtNYXRoLmFicyhTZSk+TWF0aC5hYnMoa2UpP2cudng9U2U+MD9NYXRoLmFicyhnLnZ4KTotTWF0aC5hYnMoZy52eCk6Zy52eT1rZT4wP01hdGguYWJzKGcudnkpOi1NYXRoLmFicyhnLnZ5KSxvZS5ocC0tLG9lLmZsYXNoPTkwLG9lLmhwPD0wP3lnKGUscSx1KTooZS5icmlja0RlbnRzKyssYnMoZSxnLngsZy55LFsiI2ZmZTA4YSIsIiNmZmZmZmYiXSwzLC40KSk7YnJlYWt9fX19aWYoZS5iYWxscy5sZW5ndGg9PT0wJiZlLmRpZWRBdD09PTAmJnZnKGUsYSksZS5icmlja3MubGVuZ3RoPT09MCYmZS5kaWVkQXQ9PT0wKXtlLmxldmVsKyssZS5sZXZlbENsZWFycysrO2NvbnN0IG09MjAwKyhlLmxldmVsLTEpKjEwMDtlLnNjb3JlKz1tLGUuZmxvYXRlcnMucHVzaCh7eDplLncvMix5OmUuaCouNCx0eHQ6YFdBTEwgQ0xFQVIgICske219YCxsaWZlOjE2MDAsbWF4TGlmZToxNjAwLGNvbG9yOiIjZmZlMDhhIn0pLFcwKGUpLGUuYmFsbHM9W1NjKGUpXSxlLnNlcnZlVD0xMTAwLGUuY2Fwc3VsZXM9W10sZS5jb21ibz0wfX1mdW5jdGlvbiBrZyhlLGwpe2NvbnN0IGE9ZS5iYWxscy5maW5kKHU9PnUuc3R1Y2spO2EmJkgwKGEsZSxsKX1jb25zdCBEYT0nIlByZXNzIFN0YXJ0IDJQIiwgIkNvdXJpZXIgTmV3IiwgbW9ub3NwYWNlJyxHZD17MTp7ZmlsbDoiIzNlOWQzMyIsZWRnZToiIzhlZjA1YSIsZ2xvdzoicmdiYSgxNDIsMjQwLDkwLDAuNTUpIn0sMjp7ZmlsbDoiI2I1N2ExZSIsZWRnZToiI2ZmYzg1NyIsZ2xvdzoicmdiYSgyNTUsMjAwLDg3LDAuNTUpIn0sMzp7ZmlsbDoiI2E4M2E1NSIsZWRnZToiI2ZmNWQ4ZiIsZ2xvdzoicmdiYSgyNTUsOTMsMTQzLDAuNTUpIn19LGpnPXt3aWRlOntiZzoiIzhlZjA1YSIsZmc6IiMwYzFkMTMiLGxldHRlcjoiVyJ9LG11bHRpOntiZzoiIzYyZTZmZiIsZmc6IiMwNTI1MzAiLGxldHRlcjoiTSJ9LHNsb3c6e2JnOiIjYzA4NGZjIixmZzoiIzI0MTAzMyIsbGV0dGVyOiJTIn19O2Z1bmN0aW9uIGNzKGUsbCxhLHUsZCxvKXtjb25zdCBwPU1hdGgubWluKG8sdS8yLGQvMik7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK3AsYSksZS5hcmNUbyhsK3UsYSxsK3UsYStkLHApLGUuYXJjVG8obCt1LGErZCxsLGErZCxwKSxlLmFyY1RvKGwsYStkLGwsYSxwKSxlLmFyY1RvKGwsYSxsK3UsYSxwKSxlLmNsb3NlUGF0aCgpfWZ1bmN0aW9uIFNnKGUsbCl7Y29uc3QgYT1sLnRpbWUvMWUzO2Uuc2F2ZSgpO2ZvcihsZXQgdT0wO3U8MjI7dSsrKXtjb25zdCBkPSgodSo5Ny4zK01hdGguc2luKGEqLjMrdSkqNDApJWwudytsLncpJWwudyxvPSgodSo1My43K2EqKDEwK3UlNSo2KSklbC5oK2wuaCklbC5oLHA9LjA1Ky4wNSpNYXRoLnNpbihhKjIrdSoxLjcpO2UuZmlsbFN0eWxlPWByZ2JhKDE3MiwyNDYsMTAwLCR7TWF0aC5tYXgoLjAyLHApfSlgLGUuYmVnaW5QYXRoKCksZS5hcmMoZCxvLHUlND09PTA/MS42OjEsMCxNYXRoLlBJKjIpLGUuZmlsbCgpfWUucmVzdG9yZSgpfWZ1bmN0aW9uIE5nKGUsbCl7ZS5zYXZlKCksZS5zdHJva2VTdHlsZT0icmdiYSgxNDAsMjAwLDE2MCwwLjA0NSkiLGUubGluZVdpZHRoPTE7Y29uc3QgYT0zNDtmb3IobGV0IHU9YTt1PGwudzt1Kz1hKWUuYmVnaW5QYXRoKCksZS5tb3ZlVG8odSwwKSxlLmxpbmVUbyh1LGwuaCksZS5zdHJva2UoKTtmb3IobGV0IHU9YTt1PGwuaDt1Kz1hKWUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oMCx1KSxlLmxpbmVUbyhsLncsdSksZS5zdHJva2UoKTtlLnJlc3RvcmUoKX1mdW5jdGlvbiBNZyhlLGwsYSx1LGQpe2NvbnN0IG89ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLDAsMCx1KTtvLmFkZENvbG9yU3RvcCgwLCIjMGQyMDEyIiksby5hZGRDb2xvclN0b3AoLjUsIiMwYTE4MTAiKSxvLmFkZENvbG9yU3RvcCgxLCIjMDYwZjBhIiksZS5maWxsU3R5bGU9byxlLmZpbGxSZWN0KDAsMCxhLHUpLE5nKGUsbCksU2coZSxsKSxlLnNhdmUoKSxsLnNoYWtlPi4yJiZlLnRyYW5zbGF0ZSgoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSwoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSk7Zm9yKGNvbnN0IHYgb2YgbC5icmlja3Mpe2NvbnN0IHc9R2Rbdi5tYXhIcF0/P0dkWzFdLE09di5ocDx2Lm1heEhwO2Uuc2F2ZSgpLGUuc2hhZG93Q29sb3I9dy5nbG93LGUuc2hhZG93Qmx1cj05LGUuZmlsbFN0eWxlPU0/Umcody5maWxsKTp3LmZpbGwsY3MoZSx2Lngsdi55LHYudyx2LmgsNCksZS5maWxsKCksZS5zaGFkb3dCbHVyPTAsZS5zdHJva2VTdHlsZT13LmVkZ2UsZS5saW5lV2lkdGg9MS41LGUuc3Ryb2tlKCksZS5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4xMikiLGNzKGUsdi54KzIsdi55KzIsdi53LTQsNSwyLjUpLGUuZmlsbCgpLHYuZmxhc2g+MCYmKGUuZmlsbFN0eWxlPWByZ2JhKDI1NSwyNTUsMjU1LCR7di5mbGFzaC85MCouOH0pYCxjcyhlLHYueCx2Lnksdi53LHYuaCw0KSxlLmZpbGwoKSksZS5yZXN0b3JlKCl9Zm9yKGNvbnN0IHYgb2YgbC5jYXBzdWxlcyl7Y29uc3Qgdz1qZ1t2LmtpbmRdLE09TWF0aC5zaW4odi50LzEyMCkqMjtlLnNhdmUoKSxlLnNoYWRvd0NvbG9yPXcuYmcsZS5zaGFkb3dCbHVyPTEyLGUuZmlsbFN0eWxlPXcuYmcsY3MoZSx2LngtMTEsdi55LTkrTSwyMiwxOCw5KSxlLmZpbGwoKSxlLnNoYWRvd0JsdXI9MCxlLmZpbGxTdHlsZT13LmZnLGUuZm9udD1gMTBweCAke0RhfWAsZS50ZXh0QWxpZ249ImNlbnRlciIsZS50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsZS5maWxsVGV4dCh3LmxldHRlcix2Lngsdi55KzErTSksZS5yZXN0b3JlKCl9Y29uc3QgcD1qbihsKTtlLnNhdmUoKTtjb25zdCBoPWwucGFkZGxlLncsbT1sLndpZGVUPjA7ZS5zaGFkb3dDb2xvcj1tPyJyZ2JhKDE0MiwyNDAsOTAsMC45KSI6InJnYmEoMjU1LDIwMCw4NywwLjcpIixlLnNoYWRvd0JsdXI9MTYsZS5maWxsU3R5bGU9bT8iIzhlZjA1YSI6IiNmZmM4NTciLGNzKGUsbC5wYWRkbGUueC1oLzIscCxoLDE0LDcpLGUuZmlsbCgpLGUuc2hhZG93Qmx1cj0wLGUuZmlsbFN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMzUpIixjcyhlLGwucGFkZGxlLngtaC8yKzMscCsyLGgtNiw0LDIpLGUuZmlsbCgpLGUucmVzdG9yZSgpO2Zvcihjb25zdCB2IG9mIGwuYmFsbHMpe2lmKGUuc2F2ZSgpLCF2LnN0dWNrKXtjb25zdCB3PU1hdGguaHlwb3Qodi52eCx2LnZ5KXx8MTtmb3IobGV0IE09MTtNPD0zO00rKyl7Y29uc3QgUj12Lngtdi52eC93Kk0qNixXPXYueS12LnZ5L3cqTSo2O2UuZmlsbFN0eWxlPWByZ2JhKDI1NSwyMjQsMTM4LCR7LjIyLU0qLjA2fSlgLGUuYmVnaW5QYXRoKCksZS5hcmMoUixXLDctTSoxLjYsMCxNYXRoLlBJKjIpLGUuZmlsbCgpfX1lLnNoYWRvd0NvbG9yPSJyZ2JhKDI1NSwyMjQsMTM4LDAuOSkiLGUuc2hhZG93Qmx1cj0xNCxlLmZpbGxTdHlsZT0iI2ZmZTA4YSIsZS5iZWdpblBhdGgoKSxlLmFyYyh2Lngsdi55LDcsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuc2hhZG93Qmx1cj0wLGUuZmlsbFN0eWxlPSIjZmZmOGUwIixlLmJlZ2luUGF0aCgpLGUuYXJjKHYueC0yLHYueS0yLDIuNCwwLE1hdGguUEkqMiksZS5maWxsKCksZS5yZXN0b3JlKCl9Zm9yKGNvbnN0IHYgb2YgbC5wYXJ0aWNsZXMpe2NvbnN0IHc9di5saWZlL3YubWF4TGlmZTtlLmdsb2JhbEFscGhhPXcsZS5maWxsU3R5bGU9di5jb2xvcixlLmJlZ2luUGF0aCgpLGUuYXJjKHYueCx2Lnksdi5zaXplKncsMCxNYXRoLlBJKjIpLGUuZmlsbCgpfWUuZ2xvYmFsQWxwaGE9MTtmb3IoY29uc3QgdiBvZiBsLmZsb2F0ZXJzKXtjb25zdCB3PXYubGlmZS92Lm1heExpZmU7ZS5zYXZlKCksZS5nbG9iYWxBbHBoYT1NYXRoLm1pbigxLHcqMiksZS5maWxsU3R5bGU9di5jb2xvcixlLmZvbnQ9YDExcHggJHtEYX1gLGUudGV4dEFsaWduPSJjZW50ZXIiLGUuc2hhZG93Q29sb3I9di5jb2xvcixlLnNoYWRvd0JsdXI9OCxlLmZpbGxUZXh0KHYudHh0LHYueCx2LnktKDEtdykqMjYpLGUucmVzdG9yZSgpfWlmKGQ9PT0icnVubmluZyImJmwuYmFsbHMuc29tZSh2PT52LnN0dWNrKSYmbC5kaWVkQXQ9PT0wKXtjb25zdCB2PS41Ky41Kk1hdGguc2luKGwudGltZS8xNjApO2Uuc2F2ZSgpLGUuZ2xvYmFsQWxwaGE9LjM1K3YqLjUsZS5maWxsU3R5bGU9IiNmZmUwOGEiLGUuZm9udD1gOXB4ICR7RGF9YCxlLnRleHRBbGlnbj0iY2VudGVyIixlLmZpbGxUZXh0KCJTUEFDRSAvIFRBUCBUTyBMQVVOQ0giLGwudy8yLGwuaC03NCksZS5yZXN0b3JlKCl9aWYoZD09PSJydW5uaW5nIiYmbC5jb21ibz49Mil7Y29uc3Qgdj1NYXRoLm1pbig2LDErbC5jb21ibyouNSk7ZS5zYXZlKCksZS5maWxsU3R5bGU9IiNmZjVkOGYiLGUuZm9udD1gMTJweCAke0RhfWAsZS50ZXh0QWxpZ249InJpZ2h0IixlLnNoYWRvd0NvbG9yPSJyZ2JhKDI1NSw5MywxNDMsMC44KSIsZS5zaGFkb3dCbHVyPTEwLGUuZmlsbFRleHQoYENPTUJPIHgke3YudG9GaXhlZCgxKX1gLGwudy0xNCwzMCksZS5yZXN0b3JlKCl9ZS5yZXN0b3JlKCksbC5oaXRGbGFzaD4wJiYoZS5maWxsU3R5bGU9YHJnYmEoMjU1LDYwLDgwLCR7bC5oaXRGbGFzaCouMzV9KWAsZS5maWxsUmVjdCgwLDAsYSx1KSk7Y29uc3QgZz1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGEvMix1LzIsdSouMzUsYS8yLHUvMix1Ki43NSk7Zy5hZGRDb2xvclN0b3AoMCwicmdiYSgwLDAsMCwwKSIpLGcuYWRkQ29sb3JTdG9wKDEsInJnYmEoMCwwLDAsMC4zMikiKSxlLmZpbGxTdHlsZT1nLGUuZmlsbFJlY3QoMCwwLGEsdSl9ZnVuY3Rpb24gUmcoZSl7Y29uc3QgbD1wYXJzZUludChlLnNsaWNlKDEpLDE2KSxhPU1hdGgucm91bmQoKGw+PjE2JjI1NSkqLjcyKSx1PU1hdGgucm91bmQoKGw+PjgmMjU1KSouNzIpLGQ9TWF0aC5yb3VuZCgobCYyNTUpKi43Mik7cmV0dXJuYHJnYigke2F9LCR7dX0sJHtkfSlgfWNvbnN0IFUwPSJicmlja3Jpb3QuYmVzdHMudjEiLEcwPSJicmlja3Jpb3QuZGlmZi52MSI7ZnVuY3Rpb24gQ2coKXtjb25zdCBlPXtyb29raWU6MCxwcm86MCxyaW90OjB9O3RyeXtjb25zdCBsPWxvY2FsU3RvcmFnZS5nZXRJdGVtKFUwKTtpZighbClyZXR1cm4gZTtjb25zdCBhPUpTT04ucGFyc2UobCk7cmV0dXJue3Jvb2tpZTpOdW1iZXIoYS5yb29raWUpfHwwLHBybzpOdW1iZXIoYS5wcm8pfHwwLHJpb3Q6TnVtYmVyKGEucmlvdCl8fDB9fWNhdGNoe3JldHVybiBlfX1mdW5jdGlvbiBLZCgpe3RyeXtjb25zdCBlPWxvY2FsU3RvcmFnZS5nZXRJdGVtKEcwKTtpZihlPT09InJvb2tpZSJ8fGU9PT0icHJvInx8ZT09PSJyaW90IilyZXR1cm4gZX1jYXRjaHt9cmV0dXJuInBybyJ9ZnVuY3Rpb24gVGcoKXtjb25zdCBlPXgudXNlUmVmKG51bGwpLGw9eC51c2VSZWYobnVsbCksYT14LnVzZVJlZihVZCg2MDAsNjAwLGNsW0tkKCldKSksdT14LnVzZVJlZih7dzowLGg6MH0pLGQ9eC51c2VSZWYoMCksbz14LnVzZVJlZihuZXcgU2V0KSxwPXgudXNlUmVmKHtwYWQ6MCx3YWxsOjAsYnJrOjAsZGVudDowLHBvdzowLGx2bDowLGxpZmU6MCxjb21ibzowfSksW2gsbV09eC51c2VTdGF0ZSgiaWRsZSIpLGc9eC51c2VSZWYoaCksW3Ysd109eC51c2VTdGF0ZSgwKSxNPXgudXNlUmVmKDApLFtSLFddPXgudXNlU3RhdGUoMSksW1EsU109eC51c2VTdGF0ZSgzKSxbSCxWXT14LnVzZVN0YXRlKDApLFtxLG9lXT14LnVzZVN0YXRlKDApLFtaLHllXT14LnVzZVN0YXRlKCExKSxbU2Usa2VdPXgudXNlU3RhdGUoS2QpLFBlPXgudXNlUmVmKFNlKSxbRWUsT2VdPXgudXNlU3RhdGUoQ2cpLEJlPXgudXNlUmVmKEVlKSxbemUsRmVdPXgudXNlU3RhdGUoaG4pLExlPXgudXNlUmVmKHplKSxqZT14LnVzZUNhbGxiYWNrKGFlPT57Zy5jdXJyZW50PWFlLG0oYWUpfSxbXSksd2U9eC51c2VDYWxsYmFjaygoKT0+e2QuY3VycmVudCYmKHdpbmRvdy5jbGVhclRpbWVvdXQoZC5jdXJyZW50KSxkLmN1cnJlbnQ9MCl9LFtdKSxVPXgudXNlQ2FsbGJhY2soYWU9Pnt3ZSgpLGplKCJyZWFkeSIpLGQuY3VycmVudD13aW5kb3cuc2V0VGltZW91dCgoKT0+e2QuY3VycmVudD0wLGcuY3VycmVudD09PSJyZWFkeSImJmplKCJydW5uaW5nIil9LGFlKX0sW3dlLGplXSksdGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0e3c6YWUsaDplZX09dS5jdXJyZW50O2EuY3VycmVudD1VZChhZXx8NjAwLGVlfHw2MDAsY2xbUGUuY3VycmVudF0pO2NvbnN0IHo9YS5jdXJyZW50O3AuY3VycmVudD17cGFkOjAsd2FsbDowLGJyazowLGRlbnQ6MCxwb3c6MCxsdmw6MCxsaWZlOjAsY29tYm86MH0sTS5jdXJyZW50PTAsdygwKSxXKDEpLFMoei5saXZlcyksVigwKSx5ZSghMSl9LFtdKSxGPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpLHdlKCksdGUoKSxIZS5zdGFydCgpLFUoOTAwKX0sW3dlLHRlLFVdKSxrPXgudXNlQ2FsbGJhY2soKCk9PntnLmN1cnJlbnQ9PT0icnVubmluZyImJih3ZSgpLEhlLnBhdXNlKCksamUoInBhdXNlZCIpKX0sW3dlLGplXSksTD14LnVzZUNhbGxiYWNrKCgpPT57Zy5jdXJyZW50PT09InBhdXNlZCImJihYZSgpLEhlLnJlc3VtZSgpLFUoNTAwKSl9LFtVXSksdWU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IGFlPWcuY3VycmVudDthZT09PSJpZGxlInx8YWU9PT0ib3ZlciI/RigpOmFlPT09InJ1bm5pbmciP2soKTphZT09PSJwYXVzZWQiJiZMKCl9LFtGLGssTF0pLCQ9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IGFlPWcuY3VycmVudDtpZihhZT09PSJpZGxlIil7RigpO3JldHVybn1pZihhZT09PSJvdmVyIil7RigpO3JldHVybn0oYWU9PT0icnVubmluZyJ8fGFlPT09InJlYWR5IikmJmtnKGEuY3VycmVudCxjbFtQZS5jdXJyZW50XSl9LFtGXSksSj14LnVzZUNhbGxiYWNrKGFlPT57Y29uc3QgZWU9Zy5jdXJyZW50O2lmKCEoZWU9PT0icnVubmluZyJ8fGVlPT09InJlYWR5Inx8ZWU9PT0icGF1c2VkIikpe1BlLmN1cnJlbnQ9YWUsa2UoYWUpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShHMCxhZSl9Y2F0Y2h7fXRlKCl9fSxbdGVdKSxoZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgYWU9IUxlLmN1cnJlbnQ7TGUuY3VycmVudD1hZSxGZShhZSksdXQoYWUpLG1uKGFlKX0sW10pLHZlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBhZT1hLmN1cnJlbnQ7SGUuZGllKCk7Y29uc3QgZWU9UGUuY3VycmVudDtpZihhZS5zY29yZT5CZS5jdXJyZW50W2VlXSl7Y29uc3Qgej17Li4uQmUuY3VycmVudCxbZWVdOmFlLnNjb3JlfTtCZS5jdXJyZW50PXosT2UoeikseWUoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShVMCxKU09OLnN0cmluZ2lmeSh6KSl9Y2F0Y2h7fX1qZSgib3ZlciIpfSxbamVdKSxHPXgudXNlQ2FsbGJhY2soYWU9PntYZSgpO2NvbnN0IGVlPWFlLmN1cnJlbnRUYXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksej1hLmN1cnJlbnQucGFkZGxlO3oucG9pbnRlcj0hMCx6LnRhcmdldFg9YWUuY2xpZW50WC1lZS5sZWZ0LCQoKX0sWyRdKSx4ZT14LnVzZUNhbGxiYWNrKGFlPT57Y29uc3QgZWU9YS5jdXJyZW50LnBhZGRsZTtpZihhZS5wb2ludGVyVHlwZT09PSJtb3VzZSJ8fGFlLmJ1dHRvbnM+MCl7Y29uc3Qgej1hZS5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO2VlLnBvaW50ZXI9ITAsZWUudGFyZ2V0WD1hZS5jbGllbnRYLXoubGVmdH19LFtdKTtyZXR1cm4geC51c2VFZmZlY3QoKCk9Pnt1dChMZS5jdXJyZW50KTtsZXQgYWU9MDtjb25zdCBlZT1kZT0+e2NvbnN0IE89YS5jdXJyZW50LGo9Ty5sYXN0P01hdGgubWluKDYwLGRlLU8ubGFzdCk6MTY7Ty5sYXN0PWRlO2NvbnN0IGdlPW8uY3VycmVudDtPLnBhZGRsZS5reD0oZ2UuaGFzKCJhcnJvd3JpZ2h0Iil8fGdlLmhhcygiZCIpPzE6MCktKGdlLmhhcygiYXJyb3dsZWZ0Iil8fGdlLmhhcygiYSIpPzE6MCk7Y29uc3QgWD1nLmN1cnJlbnQsVD1YPT09InJ1bm5pbmcifHxYPT09Im92ZXIiO2JnKE8saixkZSxjbFtQZS5jdXJyZW50XSxUKSxPLnNjb3JlIT09TS5jdXJyZW50JiYoTS5jdXJyZW50PU8uc2NvcmUsdyhPLnNjb3JlKSxvZShwZT0+cGUrMSkpLFcoTy5sZXZlbCksUyhPLmxpdmVzKSxWKE8uY29tYm8pO2NvbnN0IGJlPXAuY3VycmVudDtpZihPLnBhZGRsZUhpdHMhPT1iZS5wYWQmJihiZS5wYWQ9Ty5wYWRkbGVIaXRzLEhlLnBhZGRsZSgpKSxPLndhbGxIaXRzIT09YmUud2FsbCYmKGJlLndhbGw9Ty53YWxsSGl0cyxIZS53YWxsKCkpLE8uYnJpY2tCcmVha3MhPT1iZS5icmspe2NvbnN0IHBlPU8uYnJpY2tCcmVha3MtYmUuYnJrO2JlLmJyaz1PLmJyaWNrQnJlYWtzLEhlLmJyaWNrKCkscGU+MCYmSGUuY29tYm8oTy5jb21ibyl9Ty5icmlja0RlbnRzIT09YmUuZGVudCYmKGJlLmRlbnQ9Ty5icmlja0RlbnRzLEhlLmJyaWNrSGFyZCgpKSxPLnBvd2VycyE9PWJlLnBvdyYmKGJlLnBvdz1PLnBvd2VycyxIZS5jYXRjaFBvd2VyKCkpLE8ubGV2ZWxDbGVhcnMhPT1iZS5sdmwmJihiZS5sdmw9Ty5sZXZlbENsZWFycyxIZS5sZXZlbENsZWFyKCkpLE8ubGlmZUxvc3QhPT1iZS5saWZlJiYoYmUubGlmZT1PLmxpZmVMb3N0LEhlLmxpZmVMb3N0KCkpLGJlLmNvbWJvPU8uY29tYm8sWD09PSJydW5uaW5nIiYmTy5kaWVkQXQ+MCYmZGUtTy5kaWVkQXQ+OTAwJiZ2ZSgpO2NvbnN0IG5lPWUuY3VycmVudCxzZT11LmN1cnJlbnQ7aWYobmUmJnNlLnc+MCl7Y29uc3QgcGU9bmUuZ2V0Q29udGV4dCgiMmQiKTtwZSYmTWcocGUsTyxzZS53LHNlLmgsWCl9YWU9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGVlKX07YWU9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGVlKTtjb25zdCB6PWwuY3VycmVudCxmZT1lLmN1cnJlbnQ7bGV0IFA9bnVsbDtpZih6JiZmZSl7Y29uc3QgZGU9KCk9Pntjb25zdCBPPXouZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksaj1NYXRoLm1heCgwLE1hdGguZmxvb3IoTWF0aC5taW4oTy53aWR0aCxPLmhlaWdodCkpKSxnZT1NYXRoLm1pbigyLHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKTtmZS53aWR0aD1NYXRoLnJvdW5kKGoqZ2UpLGZlLmhlaWdodD1NYXRoLnJvdW5kKGoqZ2UpLGZlLnN0eWxlLndpZHRoPWAke2p9cHhgLGZlLnN0eWxlLmhlaWdodD1gJHtqfXB4YCx1LmN1cnJlbnQ9e3c6aixoOmp9O2NvbnN0IFg9ZmUuZ2V0Q29udGV4dCgiMmQiKTtYJiZYLnNldFRyYW5zZm9ybShnZSwwLDAsZ2UsMCwwKTtjb25zdCBUPWEuY3VycmVudCxiZT1ULnc+MD9ULnc6NjAwO2lmKGo+MCYmTWF0aC5hYnMoai1iZSk+LjUpe2NvbnN0IG5lPWovYmU7Zm9yKGNvbnN0IHNlIG9mIFQuYnJpY2tzKXNlLngqPW5lLHNlLnkqPW5lLHNlLncqPW5lLHNlLmgqPW5lO2Zvcihjb25zdCBzZSBvZiBULmJhbGxzKXNlLngqPW5lLHNlLnkqPW5lO2Zvcihjb25zdCBzZSBvZiBULmNhcHN1bGVzKXNlLngqPW5lLHNlLnkqPW5lO2Zvcihjb25zdCBzZSBvZiBULnBhcnRpY2xlcylzZS54Kj1uZSxzZS55Kj1uZTtmb3IoY29uc3Qgc2Ugb2YgVC5mbG9hdGVycylzZS54Kj1uZSxzZS55Kj1uZTtULnBhZGRsZS54Kj1uZSxULnBhZGRsZS50YXJnZXRYKj1uZX1qPjAmJihULnc9aixULmg9aixULnBhZGRsZS5iYXNlVz1qKmNsW1BlLmN1cnJlbnRdLnBhZGRsZVJhdGlvLFQucGFkZGxlLng9TWF0aC5taW4oTWF0aC5tYXgoVC5wYWRkbGUueCxULnBhZGRsZS53LzIpLGotVC5wYWRkbGUudy8yKSl9O2RlKCksUD1uZXcgUmVzaXplT2JzZXJ2ZXIoZGUpLFAub2JzZXJ2ZSh6KX1jb25zdCBpZT1kZT0+e2NvbnN0IE89ZGUua2V5LnRvTG93ZXJDYXNlKCk7aWYoWyJhcnJvd2xlZnQiLCJhcnJvd3JpZ2h0IiwiYSIsImQiXS5pbmNsdWRlcyhPKSl7ZGUucHJldmVudERlZmF1bHQoKSxvLmN1cnJlbnQuYWRkKE8pO3JldHVybn1pZihPPT09IiAiKXtkZS5wcmV2ZW50RGVmYXVsdCgpLGRlLnJlcGVhdHx8JCgpO3JldHVybn1pZihPPT09InIiKXtGKCk7cmV0dXJufWlmKE89PT0icCJ8fE89PT0iZXNjYXBlIil7Y29uc3Qgaj1nLmN1cnJlbnQ7aj09PSJydW5uaW5nIj9rKCk6aj09PSJwYXVzZWQiJiZMKCk7cmV0dXJufWlmKE89PT0ibSIpe2hlKCk7cmV0dXJufU89PT0iMSImJkooInJvb2tpZSIpLE89PT0iMiImJkooInBybyIpLE89PT0iMyImJkooInJpb3QiKX0sWT1kZT0+e28uY3VycmVudC5kZWxldGUoZGUua2V5LnRvTG93ZXJDYXNlKCkpfTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsaWUpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXl1cCIsWSk7Y29uc3QgXz0oKT0+e2RvY3VtZW50LmhpZGRlbiYmZy5jdXJyZW50PT09InJ1bm5pbmciJiZrKCl9LEk9KCk9PntnLmN1cnJlbnQ9PT0icnVubmluZyImJmsoKSxvLmN1cnJlbnQuY2xlYXIoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLF8pLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixJKSwoKT0+e2NhbmNlbEFuaW1hdGlvbkZyYW1lKGFlKSx3ZSgpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXlkb3duIixpZSksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleXVwIixZKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixfKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYmx1ciIsSSksUCYmUC5kaXNjb25uZWN0KCl9fSxbSix3ZSx2ZSwkLGssRixoZV0pLHtjYW52YXNSZWY6ZSx3cmFwUmVmOmwscGhhc2U6aCxzY29yZTp2LGxldmVsOlIsbGl2ZXM6USxjb21ibzpILHBvcEtleTpxLGlzTmV3QmVzdDpaLGRpZmZpY3VsdHk6U2UsYmVzdHM6RWUsbXV0ZWQ6emUsYWN0aW9uczp7c3RhcnQ6RixwcmltYXJ5OnVlLHBhdXNlR2FtZTprLHJlc3VtZUdhbWU6TCxjaGFuZ2VEaWZmaWN1bHR5OkosdG9nZ2xlTXV0ZTpoZSxvblBvaW50ZXJEb3duOkcsb25Qb2ludGVyTW92ZTp4ZX19fWNvbnN0IFZkPVt7aWQ6InJvb2tpZSIsbGFiZWw6IlJvb2tpZSIsdGFnOiJXaWRlIHBhZGRsZSwgZ2VudGxlIHBhY2UiLGRvdHM6MX0se2lkOiJwcm8iLGxhYmVsOiJQcm8iLHRhZzoiVGhlIGludGVuZGVkIHJpb3QiLGRvdHM6Mn0se2lkOiJyaW90IixsYWJlbDoiUmlvdCIsdGFnOiJGYXN0IGJhbGwsIHRoaW4gcGFkZGxlIixkb3RzOjN9XTtmdW5jdGlvbiBQZyh7Y2xhc3NOYW1lOmU9ImgtMyB3LTUiLGRpbTpsPSExfSl7cmV0dXJuIHIuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMTAiLGNsYXNzTmFtZTpgJHtlfSAke2w/Im9wYWNpdHktMjAiOiIifWAsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46ci5qc3goInJlY3QiLHt4OiIxIix5OiIyIix3aWR0aDoiMjIiLGhlaWdodDoiNiIscng6IjMiLGZpbGw6IiNmZmM4NTcifSl9KX1mdW5jdGlvbiBRbyh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTAsdmFsdWVDbGFzczpkPSIifSl7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7YT8iYW5pbWF0ZS1wb3AgdGV4dC1hbWJlcmdsb3ctNDAwIjoidGV4dC1tb3NzLTEwMCJ9ICR7ZH1gLGNoaWxkcmVuOmx9LHUpXX0pfWZ1bmN0aW9uIE1yKHtrZXlzTGlzdDplLGFjdGlvbjpsfSl7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjplfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmx9KV19KX1mdW5jdGlvbiBFZygpe3JldHVybiB0eXBlb2Ygd2luZG93PCJ1IiYmd2luZG93Lm1hdGNoTWVkaWEoIihwb2ludGVyOiBjb2Fyc2UpIikubWF0Y2hlcz9yLmpzeHMoImRpdiIse2NsYXNzTmFtZToibXgtYXV0byBtdC0zIGZsZXggdy1mdWxsIG1heC13LVs0MjBweF0gZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAgcHgtMiBweS0xIixjaGlsZHJlbjoiRHJhZyB0byBzbGlkZSB0aGUgcGFkZGxlIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwIHB4LTIgcHktMSIsY2hpbGRyZW46IlRhcCB0byBsYXVuY2ggdGhlIGJhbGwifSldfSk6bnVsbH1mdW5jdGlvbiBMZygpe2NvbnN0IGU9VGcoKSx7YWN0aW9uczpsLHBoYXNlOmF9PWUsdT1hPT09InJ1bm5pbmciLGQ9TWF0aC5taW4oNiwxK2UuY29tYm8qLjUpO3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbci5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltyLmpzeChRbyx7bGFiZWw6IlNjb3JlIix2YWx1ZTplLnNjb3JlLGFjY2VudDohMCxwb3A6ZS5wb3BLZXl9KSxyLmpzeChRbyx7bGFiZWw6IldhbGwiLHZhbHVlOnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXZlbm9tLTQwMCBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSgxNDIsMjQwLDkwLDAuNDUpXSIsY2hpbGRyZW46ZS5sZXZlbH0pfSksci5qc3goUW8se2xhYmVsOiJDb21ibyIsdmFsdWU6ZS5jb21ibz49Mj9yLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6InRleHQtYXBwbGUtNDAwIFt0ZXh0LXNoYWRvdzowXzBfMTJweF9yZ2JhKDI1NSw5MywxNDMsMC41KV0iLGNoaWxkcmVuOlsieCIsZC50b0ZpeGVkKDEpXX0pOnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoi4oCUIn0pfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiTGl2ZXMifSksci5qc3goImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBwdC0xLjUiLGNoaWxkcmVuOkFycmF5LmZyb20oe2xlbmd0aDozfSwobyxwKT0+ci5qc3goUGcse2RpbTpwPj1lLmxpdmVzfSxwKSl9KV19KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6dT8iUGF1c2UiOiJSZXN1bWUiLHRpdGxlOnU/IlBhdXNlIChQKSI6IlJlc3VtZSAoUCkiLG9uQ2xpY2s6dT9sLnBhdXNlR2FtZTpsLnJlc3VtZUdhbWUsZGlzYWJsZWQ6IXUmJmEhPT0icGF1c2VkIixjaGlsZHJlbjp1P3IuanN4KGd0LHt9KTpyLmpzeChfZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6IlJlc3RhcnQiLHRpdGxlOiJSZXN0YXJ0IChSKSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4KFVlLHt9KX0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjplLm11dGVkPyJVbm11dGUiOiJNdXRlIix0aXRsZToiU291bmQgKE0pIixvbkNsaWNrOmwudG9nZ2xlTXV0ZSxjaGlsZHJlbjplLm11dGVkP3IuanN4KGZuLHt9KTpyLmpzeCh1bix7fSl9KV19KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZ3JpZCBnYXAtNCBsZzpncmlkLWNvbHMtW21pbm1heCgwLDFmcilfMzAwcHhdIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJlbGF0aXZlIixjaGlsZHJlbjpbci5qc3goImRpdiIse3JlZjplLndyYXBSZWYsY2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46ci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImJvYXJkLWZyYW1lIHNjYW5saW5lcyByZWxhdGl2ZSBteC1hdXRvIGFzcGVjdC1zcXVhcmUgdy1mdWxsIG1heC13LVttaW4oOTR2dyw4MjBweCxjYWxjKDEwMGR2aC0xOTBweCkpXSB0b3VjaC1ub25lIHNlbGVjdC1ub25lIG92ZXJmbG93LWhpZGRlbiBsZzptYXgtdy1bbWluKDEwMCUsY2FsYygxMDBkdmgtMjgwcHgpKV0iLGNoaWxkcmVuOltyLmpzeCgiY2FudmFzIix7cmVmOmUuY2FudmFzUmVmLGNsYXNzTmFtZToiYWJzb2x1dGUgaW5zZXQtMCBtLWF1dG8gY3Vyc29yLW5vbmUiLG9uUG9pbnRlckRvd246bC5vblBvaW50ZXJEb3duLG9uUG9pbnRlck1vdmU6bC5vblBvaW50ZXJNb3ZlLG9uQ29udGV4dE1lbnU6bz0+by5wcmV2ZW50RGVmYXVsdCgpfSksci5qc3goImRpdiIse2NsYXNzTmFtZToicG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0yIHotMjAiLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOlsibGVmdC0wIHRvcC0wIGJvcmRlci1sLTIgYm9yZGVyLXQtMiIsInJpZ2h0LTAgdG9wLTAgYm9yZGVyLXItMiBib3JkZXItdC0yIiwibGVmdC0wIGJvdHRvbS0wIGJvcmRlci1sLTIgYm9yZGVyLWItMiIsInJpZ2h0LTAgYm90dG9tLTAgYm9yZGVyLXItMiBib3JkZXItYi0yIl0ubWFwKG89PnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBhYnNvbHV0ZSBoLTQgdy00IGJvcmRlci1hcHBsZS00MDAvNDAgJHtvfWB9LG8pKX0pLGE9PT0iaWRsZSImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwYTEyMGFdLzg1IHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1waW5rIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IkJSSUNLIFJJT1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0yIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU01BU0ggwrcgQ09NQk8gwrcgU1VSVklWRSJ9KV19KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhcnQgUmlvdCJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIE9SIFRBUCBUTyBQTEFZIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3IuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IuKGkOKGkiJ9KSwiIG1vdmUiXX0pLHIuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgbGF1bmNoIl19KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToic206aGlkZGVuIixjaGlsZHJlbjoiRHJhZyB0byBtb3ZlIMK3IHRhcCB0byBsYXVuY2gifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxyLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiBwYXVzZSJdfSldfSksZS5pc05ld0Jlc3QmJnIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KV19KSxhPT09InBhdXNlZCImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwYTEyMGFdLzg1IHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1waW5rIGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiUklPVCBQQVVTRUQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3IuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucmVzdW1lR2FtZSxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxyLmpzeChBZSx7b25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJtbC0xIixjaGlsZHJlbjoicmVzdW1lcyJ9KV19KV19KSxhPT09Im92ZXIiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMGExMjBhXS85MCBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1hcHBsZS00MDAgW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDkzLDE0MywwLjUpXSBzbTp0ZXh0LTJ4bCIsY2hpbGRyZW46IlBBRERMRSBET1dOIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWVuZCBnYXAtNiIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlNDT1JFIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjplLnNjb3JlfSldfSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiQkVTVCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmUuYmVzdHNbZS5kaWZmaWN1bHR5XX0pXX0pXX0pLHIuanN4cygicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOlsiUkVBQ0hFRCBXQUxMICIsZS5sZXZlbF19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSaW90IEFnYWluIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxyLmpzeChFZyx7fSksci5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmE9PT0icnVubmluZyI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChndCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmlvdCBBZ2FpbiJdfSk6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhcnQgUmlvdCJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiUG93ZXIgQ2Fwc3VsZXMiLGNoaWxkcmVuOltyLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaC01IHctNiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1mdWxsIGJnLXZlbm9tLTQwMCBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0ZXh0LXBpdC05NTAiLGNoaWxkcmVuOiJXIn0pLCJXaWRlIHBhZGRsZSJdfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiIxMHMifSldfSksci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGgtNSB3LTYgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCBiZy1bIzYyZTZmZl0gZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdGV4dC1bIzA1MjUzMF0iLGNoaWxkcmVuOiJNIn0pLCJNdWx0aWJhbGwiXX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoic3BsaXQhIn0pXX0pLHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBoLTUgdy02IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctWyNjMDg0ZmNdIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRleHQtWyMyNDEwMzNdIixjaGlsZHJlbjoiUyJ9KSwiU2xvdy1tbyJdfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiI4cyJ9KV19KV19KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJCcmlja3MgZHJvcCBjYXBzdWxlcyDigJQgY2F0Y2ggdGhlbSBvbiB0aGUgcGFkZGxlLiBBcm1vcmVkIGJyaWNrcyAoYW1iZXIsIHBpbmspIHRha2UgZXh0cmEgaGl0cy4gS2VlcCB0aGUgY29tYm8gYWxpdmUgYnkgbm90IHRvdWNoaW5nIHRoZSBwYWRkbGUuIn0pXX0pLHIuanN4KGRuLHt0aXRsZToiUmlvdCBMZXZlbCIsb3B0aW9uczpWZCx2YWx1ZTplLmRpZmZpY3VsdHksb25DaGFuZ2U6bC5jaGFuZ2VEaWZmaWN1bHR5LGRpc2FibGVkOmE9PT0icnVubmluZyJ8fGE9PT0icmVhZHkifHxhPT09InBhdXNlZCJ9KSxyLmpzeChwbix7YmVzdHM6ZS5iZXN0cyxvcHRpb25zOlZkLGFjdGl2ZTplLmRpZmZpY3VsdHl9KSxyLmpzeHMocnQse3RpdGxlOiJDb250cm9scyIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4KE1yLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiLihpDihpIifSksci5qc3goQSx7Y2hpbGRyZW46IkEvRCJ9KV19KSxhY3Rpb246Ik1vdmUgcGFkZGxlIn0pLHIuanN4KE1yLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiU3BhY2UifSksYWN0aW9uOiJMYXVuY2ggYmFsbCJ9KSxyLmpzeChNcix7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IkNsaWNrIn0pLGFjdGlvbjoiTGF1bmNoIC8gc3RlZXIifSksci5qc3goTXIse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksci5qc3goQSx7Y2hpbGRyZW46IkVzYyJ9KV19KSxhY3Rpb246IlBhdXNlIn0pLHIuanN4KE1yLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiUiJ9KSxhY3Rpb246IlJlc3RhcnQifSksci5qc3goTXIse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IjEifSksci5qc3goQSx7Y2hpbGRyZW46IjIifSksci5qc3goQSx7Y2hpbGRyZW46IjMifSldfSksYWN0aW9uOiJSaW90IGxldmVsIn0pLHIuanN4KE1yLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiTSJ9KSxhY3Rpb246IlNvdW5kIn0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IlRvdWNoOiBkcmFnIGFueXdoZXJlIG9uIHRoZSBib2FyZCB0byBzbGlkZSB0aGUgcGFkZGxlLCB0YXAgdG8gbGF1bmNoIHRoZSBiYWxsLiJ9KV19KV19KV19KV19KX1jb25zdCBKbz17cm9va2llOntsYWJlbDoiUk9PS0lFIix0YWc6ImhvbmVzdCBoZWF0LCBiaWcgd2luZG93Iixkb3RzOjEsZmxpZ2h0Ols3ODAsOTgwXSxjdXJ2ZTozNCxkZWNlcHRpb246MTQwLHdpbmRvdzoxNzAsYWRhcHQ6LjMsbXBoQm9udXM6LTN9LG1ham9yOntsYWJlbDoiTUFKT1IiLHRhZzoiYSByZWFsIHJvdGF0aW9uIixkb3RzOjIsZmxpZ2h0Ols2MDAsODAwXSxjdXJ2ZTo3MixkZWNlcHRpb246MzAwLHdpbmRvdzoxMjgsYWRhcHQ6LjY1LG1waEJvbnVzOjB9LGFsbHN0YXI6e2xhYmVsOiJBTEwtU1RBUiIsdGFnOiJuYXN0eSBzdHVmZiwgcXVpY2sgYXJtcyIsZG90czozLGZsaWdodDpbNDcwLDY2MF0sY3VydmU6MTA4LGRlY2VwdGlvbjo0NjAsd2luZG93Ojk4LGFkYXB0Oi45NSxtcGhCb251czoyfX0saGw9e2Zhc3RiYWxsOntuYW1lOiJGQVNUQkFMTCIsY29sb3I6IiNmZjVkOGYiLGJsdXJiOiJwdXJlIGhlYXQsIHN0cmFpZ2h0IGluIn0sc2xpZGVyOntuYW1lOiJTTElERVIiLGNvbG9yOiIjZmZkMTY2IixibHVyYjoibGF0ZSBzaWRld2F5cyBydW4ifSxjdXJ2ZTp7bmFtZToiQ1VSVkUiLGNvbG9yOiIjYzA4NGZjIixibHVyYjoiZmFsbHMgb2ZmIHRoZSB0YWJsZSJ9LGNoYW5nZXVwOntuYW1lOiJDSEFOR0VVUCIsY29sb3I6IiM2MmU2ZmYiLGJsdXJiOiJzYW1lIGFybSwgbm8gc3BlZWQifX0sSzA9TWF0aC5QSSoyLFZlPShlLGwpPT5lK01hdGgucmFuZG9tKCkqKGwtZSksSGE9KGUsbCxhKT0+TWF0aC5tYXgobCxNYXRoLm1pbihhLGUpKSxNYz1lPT5lW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSplLmxlbmd0aCldLEFnPVsiI2Q5YTA2NiIsIiNlOGMzOWUiLCIjOGY2YjRhIiwiI2M0NmE2YSIsIiM2YThmYzQiLCIjZTVlMGQwIiwiIzljYzQ2YSJdO2Z1bmN0aW9uIERnKGUpe3JldHVybiBlKi4wNzh9ZnVuY3Rpb24gWm8oZT02MDAsbD02MDApe2NvbnN0IGE9W107Zm9yKGxldCB1PTA7dTwxOTA7dSsrKWEucHVzaCh7eDpNYXRoLnJhbmRvbSgpLHk6TWF0aC5yYW5kb20oKSxjOk1jKEFnKSx0dzpWZSgwLEswKX0pO3JldHVybnt3OmUsaDpsLHRpbWU6MCxsYXN0OjAsc3RhZ2U6ImJldHdlZW4iLHN0YWdlVDowLHBpdGNoOm51bGwsc3d1bmc6ITEsc3dpbmdBbmltOjAsc3dpbmdFYXJseTohMSxjb250YWN0Om51bGwsYmFubmVyOm51bGwscGFFbmRlZDohMSxiYWxsczowLHN0cmlrZXM6MCxvdXRzOjAscnVuczowLGJhc2VzOlshMSwhMSwhMV0sc3RhdHM6e2FiOjAsaGl0czowLGhyOjAsazowLHN0cmVhazowLGJlc3RTdHJlYWs6MH0sbGFzdFBpdGNoTGFiZWw6IuKAlCIsZGlmZnM6W10scmVjZW50VHlwZXM6W10sY3Jvd2Q6YSxjaGVlcjowLHBhcnRpY2xlczpbXSxzaGFrZTowLGZsYXNoOjAsb3ZlcjohMSxldkNyYWNrOjAsZXZGb3VsOjAsZXZXaGlmZjowLGV2U3RyaWtlOjAsZXZCYWxsOjAsZXZXYWxrOjAsZXZPdXQ6MCxldkNoZWVyOjAsZXZIcjowLGV2SzowfX1mdW5jdGlvbiBJZyhlLGwpe2NvbnN0IGE9e2Zhc3RiYWxsOi40MixzbGlkZXI6LjIsY3VydmU6LjE4LGNoYW5nZXVwOi4yfSx1PWUuZGlmZnMubGVuZ3RoP0hhKGUuZGlmZnMucmVkdWNlKChxLG9lKT0+cStvZSwwKS9lLmRpZmZzLmxlbmd0aCwtODAsODApOjA7dTwtMjU/KGEuY2hhbmdldXArPS4zNCpsLmFkYXB0LGEuY3VydmUrPS4yKmwuYWRhcHQsYS5mYXN0YmFsbC09LjMqbC5hZGFwdCk6dT4yNSYmKGEuZmFzdGJhbGwrPS4zOCpsLmFkYXB0LGEuY2hhbmdldXAtPS4yNCpsLmFkYXB0KTtjb25zdCBkPWUucmVjZW50VHlwZXM7ZC5sZW5ndGg+PTImJmRbZC5sZW5ndGgtMV09PT1kW2QubGVuZ3RoLTJdJiYoYVtkW2QubGVuZ3RoLTFdXSo9LjM1KSxlLmJhbGxzPj0zJiYoYS5mYXN0YmFsbCs9LjM1KSxlLnN0cmlrZXM+PTImJihhLmN1cnZlKz0uMjIsYS5zbGlkZXIrPS4xNCk7Y29uc3Qgbz1PYmplY3QudmFsdWVzKGEpLnJlZHVjZSgocSxvZSk9PnErTWF0aC5tYXgoMCxvZSksMCk7bGV0IHA9TWF0aC5yYW5kb20oKSpvLGg9ImZhc3RiYWxsIjtmb3IoY29uc3QgcSBvZiBPYmplY3Qua2V5cyhhKSlpZihwLT1NYXRoLm1heCgwLGFbcV0pLHA8PTApe2g9cTticmVha31jb25zdCBtPWg9PT0iZmFzdGJhbGwiPzE6aD09PSJzbGlkZXIiPzEuMTQ6aD09PSJjdXJ2ZSI/MS4zMjoxLjQ2LGc9SGEoVmUobC5mbGlnaHRbMF0sbC5mbGlnaHRbMV0pKm0sNDMwLDE2MDApLHY9ODIwK1ZlKDAsbC5kZWNlcHRpb24pLE09TWF0aC5yb3VuZChIYSgoaD09PSJmYXN0YmFsbCI/OTY6aD09PSJzbGlkZXIiPzg4Omg9PT0iY3VydmUiPzc5Ojg0KStsLm1waEJvbnVzK1ZlKC0yLDIpLShnLTYwMCkqLjAwOCw2OCwxMDMpKTtsZXQgUj0wLFc9MDtjb25zdCBRPU1hdGgucmFuZG9tKCk8LjU/LTE6MTtoPT09ImZhc3RiYWxsIj9SPVZlKC0xMCwxMCk6aD09PSJzbGlkZXIiPyhSPVEqVmUoLjUsLjkpKmwuY3VydmUsVz1WZSguMSwuMykqbC5jdXJ2ZSk6aD09PSJjdXJ2ZSI/KFI9USpWZSguMSwuNCkqbC5jdXJ2ZSxXPVZlKC43LDEuMDUpKmwuY3VydmUpOihSPVZlKC0xNCwxNCksVz1WZSguMTUsLjM1KSpsLmN1cnZlKTtjb25zdCBTPURnKDYwMCk7bGV0IEg9TWF0aC5yYW5kb20oKTwoZS5iYWxscz49Mz8uODY6LjcpO2Uuc3RyaWtlcz09PTImJk1hdGgucmFuZG9tKCk8LjQmJihIPSEwKTtjb25zdCBWPUg/VmUoLS44MiwuODIpKlM6USpWZSgxLjA1LDEuNikqUztyZXR1cm57dHlwZTpoLGZsaWdodDpnLHdpbmR1cDp2LGJyZWFrWDpSLGJyZWFrWTpXLHRhcmdldFg6VixpblpvbmU6SCxtcGg6TX19ZnVuY3Rpb24gX2coZSxsKXtlLnBhRW5kZWQmJihlLmJhbGxzPTAsZS5zdHJpa2VzPTAsZS5wYUVuZGVkPSExKSxlLnBpdGNoPUlnKGUsbCksZS5zd3VuZz0hMSxlLnN3aW5nRWFybHk9ITEsZS5jb250YWN0PW51bGwsZS5iYW5uZXI9bnVsbCxlLnN0YWdlPSJ3aW5kdXAiLGUuc3RhZ2VUPTB9ZnVuY3Rpb24gX24oZSxsLGEsdSxkKXtlLmJhbm5lcj17dHh0Omwsc3ViOmEsY29sb3I6dSxkdXI6ZH19ZnVuY3Rpb24gcWQoZSxsLGEsdSxkLG89MSl7Y29uc3QgcD1NYXRoLm1pbigyMjAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgaD1lLnBhcnRpY2xlcy5sZW5ndGg7aDxwO2grKyl7Y29uc3QgbT1WZSgwLEswKSxnPVZlKDMwLDIyMCkqbyx2PVZlKDMwMCw4MDApO2UucGFydGljbGVzLnB1c2goe3g6bCx5OmEsdng6TWF0aC5jb3MobSkqZyx2eTpNYXRoLnNpbihtKSpnLGxpZmU6dixtYXhMaWZlOnYsc2l6ZTpWZSgxLjUsMy40KSpvLGNvbG9yOk1jKHUpLGRyYWc6MixncmF2OjQwfSl9fWZ1bmN0aW9uIE9nKGUpe2ZvcihsZXQgbD0wO2w8NTA7bCsrKWUucGFydGljbGVzLnB1c2goe3g6VmUoMCxlLncpLHk6VmUoLTMwLDApLHZ4OlZlKC00MCw0MCksdnk6VmUoNDAsMTQwKSxsaWZlOlZlKDkwMCwxNjAwKSxtYXhMaWZlOjE2MDAsc2l6ZTpWZSgyLDMuNiksY29sb3I6TWMoWyIjZmZkMTY2IiwiI2ZmNWQ4ZiIsIiM2MmU2ZmYiLCIjOGVmMDVhIiwiI2ZmZmZmZiJdKSxkcmFnOi42LGdyYXY6MzB9KX1mdW5jdGlvbiBCZyhlLGwpe2NvbnN0W2EsdSxkXT1lLmJhc2VzO2xldCBvPTA7cmV0dXJuIGw+PTQ/KG89KGE/MTowKSsodT8xOjApKyhkPzE6MCkrMSxlLmJhc2VzPVshMSwhMSwhMV0sbyk6bD09PTM/KG89KGE/MTowKSsodT8xOjApKyhkPzE6MCksZS5iYXNlcz1bITEsITEsITBdLG8pOmw9PT0yPyhvPSh1PzE6MCkrKGQ/MTowKSxlLmJhc2VzPVshMSwhMCxhXSxvKToobz1kPzE6MCxlLmJhc2VzPVshMCxhLHVdLG8pfWZ1bmN0aW9uIHpnKGUpe2NvbnN0W2wsYSx1XT1lLmJhc2VzO2xldCBkPTA7cmV0dXJuIGwmJmEmJnUmJihkPTEpLGUuYmFzZXM9WyEwLGx8fCExLGEmJmx8fHVdLGR9ZnVuY3Rpb24gZWMoZSxsKXtjb25zdCBhPWUudyx1PWUuaCxkPWEqLjQ2LG89dSouODtsZXQgcD1hKi41LGg9dSouNSxtPXUqLjEyLGc9NzAwO2NvbnN0IHY9TWF0aC5yYW5kb20oKTwuNT8tMToxO2w9PT0iaHIiPyhwPWEqKC41K3YqVmUoLjA4LC4zKSksaD11KlZlKC4xNiwuMjYpLG09dSouMyxnPTk1MCk6bD09PSIzYiI/KHA9YSooLjUrdipWZSguMTUsLjMyKSksaD11KlZlKC40MiwuNSksbT11Ki4xNixnPTgwMCk6bD09PSIyYiI/KHA9YSooLjUrdipWZSguMTIsLjMpKSxoPXUqVmUoLjUsLjU4KSxtPXUqLjEzLGc9NzUwKTpsPT09IjFiIj8ocD1hKiguNSt2KlZlKC4wOCwuMjYpKSxoPXUqVmUoLjU4LC42OCksbT11Ki4wNyxnPTY1MCk6bD09PSJmbHlvdXQiPyhwPWEqKC41K3YqVmUoLjEsLjI0KSksaD11KlZlKC40NiwuNTYpLG09dSouMjIsZz05MDApOmw9PT0iZ3JvdW5kb3V0Ij8ocD1hKiguNSt2KlZlKC4wNSwuMTgpKSxoPXUqVmUoLjYsLjY2KSxtPXUqLjAyLGc9NTUwKToocD1hKlZlKC4yLC40MiksaD11KlZlKC44NiwuOTUpLG09dSouMDgsZz01MDApLGUuY29udGFjdD17dDowLGR1cjpnLGtpbmQ6bCx4MDpkLHkwOm8seDE6cCx5MTpoLGFyYzptfX1mdW5jdGlvbiBSYyhlKXtlLnBhRW5kZWQ9ITB9ZnVuY3Rpb24gRmcoZSl7ZS5vdXRzPj0zPyhlLnN0YWdlPSJlbmRpbmciLGUuc3RhZ2VUPTApOihlLnN0YWdlPSJiZXR3ZWVuIixlLnN0YWdlVD0wKX1mdW5jdGlvbiAkZyhlLGwsYSx1KXtjb25zdCBkPWUudyxvPWUuc3RhdHM7aWYoYT09PSJmb3VsIil7ZS5zdHJpa2VzPDImJmUuc3RyaWtlcysrLG8uc3RyZWFrPTAsZS5ldkZvdWwrKyxfbihlLCJGT1VMIEJBTEwiLCJqdXN0IG1pc3NlZCBpdCIsIiNjOGMyYjAiLDg1MCksZWMoZSwiZm91bCIpLHFkKGUsZCouNDYsZCouNzgsWyIjZTVlMGQwIiwiI2ZmZmZmZiJdLDYsLjUpLGUuc3RhZ2U9InJlc29sdmUiLGUuc3RhZ2VUPTA7cmV0dXJufWlmKG8uYWIrKyxSYyhlKSxhPT09ImZseW91dCJ8fGE9PT0iZ3JvdW5kb3V0IillLm91dHMrKyxvLnN0cmVhaz0wLGUuZXZPdXQrKyxfbihlLGE9PT0iZmx5b3V0Ij8iRkxZIE9VVCI6IkdST1VORCBPVVQiLGAke2Uub3V0c30gT1VUJHtlLm91dHM+MT8iUyI6IiJ9YCwiI2ZmOGZiMyIsMTE1MCksZWMoZSxhKSxlLnNoYWtlPU1hdGgubWF4KGUuc2hha2UsMyk7ZWxzZXtvLmhpdHMrKyxvLnN0cmVhaysrLG8uYmVzdFN0cmVhaz1NYXRoLm1heChvLmJlc3RTdHJlYWssby5zdHJlYWspO2NvbnN0IGg9QmcoZSxhPT09ImhyIj80OmE9PT0iM2IiPzM6YT09PSIyYiI/MjoxKTtlLnJ1bnMrPWgsZS5jaGVlcj1NYXRoLm1pbigxLGUuY2hlZXIrKGE9PT0iaHIiPzE6LjU1KSksZS5ldkNyYWNrKyssYT09PSJociI/KG8uaHIrKyxlLmV2SHIrKyxPZyhlKSxlLnNoYWtlPTEwLGUuZmxhc2g9LjUsX24oZSwiSE9NRSBSVU4hIixoPjE/YCR7aH0gUlVOUyBTQ09SRURgOiJTT0xPIFNIT1QiLCIjZmZkMTY2IiwxNzUwKSk6KGUuZXZDaGVlcisrLGUuc2hha2U9TWF0aC5tYXgoZS5zaGFrZSw1KSxfbihlLHsiM2IiOiJUUklQTEUhIiwiMmIiOiJET1VCTEUhIiwiMWIiOiJTSU5HTEUhIn1bYV0saD4wP2ArJHtofSBSVU4ke2g+MT8iUyI6IiJ9YDoiIiwiIzhlZjA1YSIsMTI1MCkpLGVjKGUsYSkscWQoZSxkKi40NixkKi43OCxbIiNmZmZmZmYiLCIjZmZkMTY2IiwiIzhlZjA1YSJdLDE0LDEuMSl9ZS5zdGFnZT0icmVzb2x2ZSIsZS5zdGFnZVQ9MH1mdW5jdGlvbiBXZyhlLGwpe2NvbnN0IGE9ZS5waXRjaDtpZihhKXtpZihlLnN3dW5nKXtlLnN0cmlrZXMrKyxlLnN0YXRzLnN0cmVhaz0wLGUuZXZXaGlmZisrLGUuc3RyaWtlcz49Mz9ZZChlKTooZS5ldlN0cmlrZSsrLF9uKGUsIlNXSU5HIEFORCBBIE1JU1MiLGEuaW5ab25lP2BTVFJJS0UgJHtlLnN0cmlrZXN9YDoiY2hhc2VkIGEgYmFkIHBpdGNoIiwiI2ZmNWQ4ZiIsMTA1MCksZS5zdGFnZT0icmVzb2x2ZSIsZS5zdGFnZVQ9MCk7cmV0dXJufWlmKGEuaW5ab25lKWUuc3RyaWtlcysrLGUuc3RhdHMuc3RyZWFrPTAsZS5ldlN0cmlrZSsrLGUuc3RyaWtlcz49Mz9ZZChlKTooX24oZSwiQ0FMTEVEIFNUUklLRSIsYFNUUklLRSAke2Uuc3RyaWtlc30g4oCUIFRBS0UgQSBTV0lORyFgLCIjZmY1ZDhmIiw5NTApLGUuc3RhZ2U9InJlc29sdmUiLGUuc3RhZ2VUPTApO2Vsc2V7aWYoZS5iYWxscysrLGUuZXZCYWxsKyssZS5iYWxscz49NCl7Y29uc3QgdT16ZyhlKTtlLnJ1bnMrPXUsZS5zdGF0cy5hYisrLFJjKGUpLGUuZXZXYWxrKyssX24oZSwiV0FMSyEiLHU+MD8iUFVTSEVEIEEgUlVOIEFDUk9TUyI6IlRBS0UgWU9VUiBCQVNFIiwiIzYyZTZmZiIsMTE1MCl9ZWxzZSBfbihlLCJCQUxMIixgQkFMTCAke2UuYmFsbHN9YCwiI2U1ZTBkMCIsNzUwKTtlLnN0YWdlPSJyZXNvbHZlIixlLnN0YWdlVD0wfX19ZnVuY3Rpb24gWWQoZSl7ZS5vdXRzKyssZS5zdGF0cy5hYisrLGUuc3RhdHMuaysrLGUuc3RhdHMuc3RyZWFrPTAsUmMoZSksZS5ldksrKyxlLnNoYWtlPU1hdGgubWF4KGUuc2hha2UsNCksX24oZSwiU1RSSUtFT1VUISIsYCR7ZS5vdXRzfSBPVVQke2Uub3V0cz4xPyJTIjoiIn1gLCIjZmY1ZDhmIiwxMzUwKSxlLnN0YWdlPSJyZXNvbHZlIixlLnN0YWdlVD0wfWZ1bmN0aW9uIEhnKGUsbCl7aWYoZS5vdmVyfHwhZS5waXRjaClyZXR1cm4hMTtpZihlLnN3aW5nQW5pbT0xLGUuc3RhZ2U9PT0id2luZHVwIilyZXR1cm4gZS5zd2luZ0Vhcmx5PSEwLGUuc3d1bmc9ITAsITA7aWYoZS5zdGFnZSE9PSJmbGlnaHQiKXJldHVybiExO2NvbnN0IGE9ZS5zdGFnZVQtZS5waXRjaC5mbGlnaHQ7aWYoZS5zd3VuZz0hMCxlLmRpZmZzLnB1c2goSGEoYSwtNDAwLDQwMCkpLGUuZGlmZnMubGVuZ3RoPjYmJmUuZGlmZnMuc2hpZnQoKSxNYXRoLmFicyhhKTw9bC53aW5kb3cpe2NvbnN0IHU9MS1NYXRoLmFicyhhKS9sLndpbmRvdztsZXQgZDtjb25zdCBvPU1hdGgucmFuZG9tKCk7cmV0dXJuIHU+LjcyP2Q9bzwuNTU/ImhyIjpvPC44PyIzYiI6IjJiIjp1Pi40Mj9kPW88LjQ/IjJiIjpvPC44NT8iMWIiOiJmbHlvdXQiOmQ9bzwuMz8iMWIiOm88LjY1PyJncm91bmRvdXQiOiJmb3VsIiwkZyhlLGwsZCksZS5yZWNlbnRUeXBlcy5wdXNoKGUucGl0Y2gudHlwZSksZS5yZWNlbnRUeXBlcy5sZW5ndGg+NCYmZS5yZWNlbnRUeXBlcy5zaGlmdCgpLCEwfXJldHVybiEwfWZ1bmN0aW9uIFVnKGUsbCxhLHUsZCl7ZS50aW1lKz1sLGUuc2hha2U9TWF0aC5tYXgoMCxlLnNoYWtlLWwqLjA0KSxlLmZsYXNoPU1hdGgubWF4KDAsZS5mbGFzaC1sKi4wMDE0KSxlLmNoZWVyPU1hdGgubWF4KDAsZS5jaGVlci1sKjRlLTQpLGUuc3dpbmdBbmltPU1hdGgubWF4KDAsZS5zd2luZ0FuaW0tbCouMDA2KTtmb3IobGV0IHA9ZS5wYXJ0aWNsZXMubGVuZ3RoLTE7cD49MDtwLS0pe2NvbnN0IGg9ZS5wYXJ0aWNsZXNbcF07aWYoaC5saWZlLT1sLGgubGlmZTw9MCl7Y29uc3QgbT1lLnBhcnRpY2xlcy5wb3AoKTttJiZwPGUucGFydGljbGVzLmxlbmd0aCYmKGUucGFydGljbGVzW3BdPW0pO2NvbnRpbnVlfWgudngtPWgudngqaC5kcmFnKihsLzFlMyksaC52eSs9aC5ncmF2KihsLzFlMyktaC52eSpoLmRyYWcqKGwvMWUzKSxoLngrPWgudngqKGwvMWUzKSxoLnkrPWgudnkqKGwvMWUzKX1pZighZClyZXR1cm47ZS5jb250YWN0JiYoZS5jb250YWN0LnQrPWwsZS5jb250YWN0LnQ+PWUuY29udGFjdC5kdXImJihlLmNvbnRhY3Q9bnVsbCkpLGUuc3RhZ2VUKz1sO2NvbnN0IG89ZS5waXRjaDtlLnN0YWdlPT09ImJldHdlZW4iP2Uuc3RhZ2VUPjU2MCYmX2coZSx1KTplLnN0YWdlPT09IndpbmR1cCI/byYmZS5zdGFnZVQ+PW8ud2luZHVwJiYoZS5zdGFnZT0iZmxpZ2h0IixlLnN0YWdlVD0wLGUubGFzdFBpdGNoTGFiZWw9YCR7aGxbby50eXBlXS5uYW1lfSDCtyAke28ubXBofSBNUEhgKTplLnN0YWdlPT09ImZsaWdodCI/byYmZS5zdGFnZVQ+PW8uZmxpZ2h0JiYoZS5yZWNlbnRUeXBlcy5wdXNoKG8udHlwZSksZS5yZWNlbnRUeXBlcy5sZW5ndGg+NCYmZS5yZWNlbnRUeXBlcy5zaGlmdCgpLFdnKGUpKTplLnN0YWdlPT09InJlc29sdmUiP2UuYmFubmVyJiZlLnN0YWdlVD49ZS5iYW5uZXIuZHVyJiZGZyhlKTplLnN0YWdlPT09ImVuZGluZyImJmUuc3RhZ2VUPjE1MDAmJihlLm92ZXI9ITApfWZ1bmN0aW9uIEdnKGUsbCl7ZS5zdGFnZT0iYmV0d2VlbiIsZS5zdGFnZVQ9MCxlLnBpdGNoPW51bGx9Y29uc3QgS2c9ZT0+MSsyLjcwMTU4Kk1hdGgucG93KGUtMSwzKSsxLjcwMTU4Kk1hdGgucG93KGUtMSwyKSxWMD1lPT4xLU1hdGgucG93KDEtZSwzKSxvcj0oZSxsLGEpPT5lKyhsLWUpKmEsY3I9ZT0+TWF0aC5tYXgoMCxNYXRoLm1pbigxLGUpKTtmdW5jdGlvbiBYZChlLGwpe2NvbnN0IGE9ZS53LHU9ZS5oLGQ9YS82MDAsbz1lLnBpdGNoLHA9bCpsLGg9YSouNTA1LG09dSouNDQ1LGc9YSouNStvLnRhcmdldFgqZCx2PXUqLjc5NStvLmJyZWFrWSpkKi4zMix3PW9yKGgsZyxwKStvLmJyZWFrWCpkKk1hdGgucG93KGwsMi40KSxNPW9yKG0sdixwKSxSPSgzKzgqTWF0aC5wb3cobCwxLjcpKSpkO3JldHVybnt4OncseTpNLHI6Un19ZnVuY3Rpb24gVmcoZSxsLGEsdSl7Y29uc3QgZD1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLHUqLjQpO2QuYWRkQ29sb3JTdG9wKDAsIiMwNzBkMjIiKSxkLmFkZENvbG9yU3RvcCguNiwiIzBkMWIzZCIpLGQuYWRkQ29sb3JTdG9wKDEsIiMxNTI5NGYiKSxlLmZpbGxTdHlsZT1kLGUuZmlsbFJlY3QoMCwwLGEsdSouNCksZS5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC41KSI7Zm9yKGxldCBvPTA7bzw0MDtvKyspe2NvbnN0IHA9byoxMzcuNSVhKzQsaD1vKjg5LjclKHUqLjIpKzQsbT0uNCsuNipNYXRoLmFicyhNYXRoLnNpbihsLnRpbWUqLjAwMStvKSk7ZS5nbG9iYWxBbHBoYT1tKi43LGUuZmlsbFJlY3QocCxoLDEuNCwxLjQpfWUuZ2xvYmFsQWxwaGE9MX1mdW5jdGlvbiBxZyhlLGwsYSl7Zm9yKGNvbnN0IHUgb2ZbLjEzLC44N10pe2NvbnN0IGQ9bCp1LG89YSouMTtlLnN0cm9rZVN0eWxlPSIjMWQyYzRlIixlLmxpbmVXaWR0aD1NYXRoLm1heCgyLGwqLjAwNiksZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhkLG8rYSouMDMpLGUubGluZVRvKGQsYSouMyksZS5zdHJva2UoKSxlLmZpbGxTdHlsZT0iIzIyMzQ1OCIsZS5maWxsUmVjdChkLWwqLjA0NSxvLWEqLjAyLGwqLjA5LGEqLjA0NSk7Zm9yKGxldCBtPTA7bTw2O20rKyl7Y29uc3QgZz1kLWwqLjAzNSttJTMqbCouMDM1LHY9by1hKi4wMTIrTWF0aC5mbG9vcihtLzMpKmEqLjAyMjtlLmZpbGxTdHlsZT0iI2ZmZjZkOCIsZS5iZWdpblBhdGgoKSxlLmFyYyhnLHYsbCouMDA3LDAsTWF0aC5QSSoyKSxlLmZpbGwoKX1jb25zdCBwPWUuY3JlYXRlTGluZWFyR3JhZGllbnQoZCxvLGwqLjUsYSouNik7cC5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsMjQ2LDIxNiwwLjEwKSIpLHAuYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDI0NiwyMTYsMCkiKSxlLmZpbGxTdHlsZT1wLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oZC1sKi4wMyxvK2EqLjAyKSxlLmxpbmVUbyhsKi41LWwqLjE2LGEqLjYyKSxlLmxpbmVUbyhsKi41K2wqLjE2LGEqLjYyKSxlLmxpbmVUbyhkK2wqLjAzLG8rYSouMDIpLGUuY2xvc2VQYXRoKCksZS5maWxsKCk7Y29uc3QgaD1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGQsbywwLGQsbyxsKi4wOSk7aC5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsMjQ2LDIxNiwwLjI4KSIpLGguYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDI0NiwyMTYsMCkiKSxlLmZpbGxTdHlsZT1oLGUuZmlsbFJlY3QoZC1sKi4xLG8tbCouMSxsKi4yLGwqLjIpfX1mdW5jdGlvbiBZZyhlLGwsYSx1KXtjb25zdCBkPWUuY3JlYXRlTGluZWFyR3JhZGllbnQoMCx1Ki4yNCwwLHUqLjM4KTtkLmFkZENvbG9yU3RvcCgwLCIjMTAxYTMzIiksZC5hZGRDb2xvclN0b3AoMSwiIzFhMjU0MiIpLGUuZmlsbFN0eWxlPWQsZS5maWxsUmVjdCgwLHUqLjI0LGEsdSouMTQpLGUuc3Ryb2tlU3R5bGU9InJnYmEoMCwwLDAsMC4zNSkiLGUubGluZVdpZHRoPTE7Zm9yKGxldCBwPTE7cDw0O3ArKyllLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsdSooLjI0K3AqLjAzNSkpLGUubGluZVRvKGEsdSooLjI0K3AqLjAzNSkpLGUuc3Ryb2tlKCk7Y29uc3Qgbz1sLmNoZWVyKjIuNjtmb3IoY29uc3QgcCBvZiBsLmNyb3dkKXtjb25zdCBoPXAueCphLG09dSouMjQ1K3AueSp1Ki4xMjUrTWF0aC5zaW4obC50aW1lKi4wMDQrcC50dykqKC40K28pO2UuZmlsbFN0eWxlPXAuYyxlLmdsb2JhbEFscGhhPS43NSxlLmZpbGxSZWN0KGgsbSxNYXRoLm1heCgxLjYsYSouMDA0KSxNYXRoLm1heCgxLjYsYSouMDA0KSl9aWYoZS5nbG9iYWxBbHBoYT0xLGwuY2hlZXI+LjM1KXtjb25zdCBwPU1hdGguZmxvb3IobC5jaGVlcio3KTtmb3IobGV0IGg9MDtoPHA7aCsrKXtjb25zdCBtPU1hdGguZmxvb3IobC50aW1lLzkwKSozMStoKjE3LGc9bSo5NzElMWUzLzFlMyphLHY9dSouMjUrbSo1NTclMWUzLzFlMyp1Ki4xMTtlLmZpbGxTdHlsZT0iI2ZmZmZmZiIsZS5nbG9iYWxBbHBoYT0uOSxlLmZpbGxSZWN0KGcsdiwyLjQsMi40KX1lLmdsb2JhbEFscGhhPTF9ZS5maWxsU3R5bGU9IiMwZjJmNGQiLGUuZmlsbFJlY3QoMCx1Ki4zOCxhLHUqLjAzNSksZS5maWxsU3R5bGU9IiNmZmQxNjYiLGUuZmlsbFJlY3QoMCx1Ki4zOCxhLE1hdGgubWF4KDIsdSouMDA0KSksZS5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC41NSkiLGUuZm9udD1gNzAwICR7TWF0aC5yb3VuZChhKi4wMTgpfXB4ICJDaGFrcmEgUGV0Y2giLCBzYW5zLXNlcmlmYCxlLnRleHRBbGlnbj0iY2VudGVyIixlLmZpbGxUZXh0KCIzODUiLGEqLjUsdSouNDA1KX1mdW5jdGlvbiBYZyhlLGwsYSl7Y29uc3QgdT1hKi40MTUsZD03O2ZvcihsZXQgbT0wO208ZDttKyspe2NvbnN0IGc9TWF0aC5wb3cobS9kLDEuMjUpLHY9TWF0aC5wb3coKG0rMSkvZCwxLjI1KTtlLmZpbGxTdHlsZT1tJTI9PT0wPyIjMWU3ZDQzIjoiIzFhNzAzOSIsZS5maWxsUmVjdCgwLHUrKGEtdSkqZyxsLChhLXUpKih2LWcpKzEpfWUuc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC42NSkiLGUubGluZVdpZHRoPU1hdGgubWF4KDEuNSxsKi4wMDMpLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8obCouNDY1LGEqLjg3NSksZS5saW5lVG8obCouMDEsYSouNDMpLGUubW92ZVRvKGwqLjUzNSxhKi44NzUpLGUubGluZVRvKGwqLjk5LGEqLjQzKSxlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSIjYTA2YTNmIixlLmJlZ2luUGF0aCgpLGUuZWxsaXBzZShsKi41LGEqLjUsbCouMDc1LGEqLjAyOCwwLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLmZpbGxTdHlsZT0iI2U1ZTBkMCIsZS5maWxsUmVjdChsKi40OTIsYSouNTA1LGwqLjAxNixhKi4wMDYpLGUuZmlsbFN0eWxlPSIjYTA2YTNmIixlLmJlZ2luUGF0aCgpLGUuZWxsaXBzZShsKi41LGEqLjksbCouMTksYSouMDc1LDAsTWF0aC5QSSxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuZmlsbFN0eWxlPSIjZjJlZGUwIixlLmJlZ2luUGF0aCgpO2NvbnN0IG89bCouNSxwPWEqLjg3MixoPWwqLjAyMjtlLm1vdmVUbyhvLWgscC1oKi42KSxlLmxpbmVUbyhvK2gscC1oKi42KSxlLmxpbmVUbyhvK2gscCtoKi4yKSxlLmxpbmVUbyhvLHAraCouNyksZS5saW5lVG8oby1oLHAraCouMiksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKX1mdW5jdGlvbiBRZyhlLGwsYSl7Y29uc3QgdT1sLncsZD1sLmgsbz11Ki41LHA9ZCouNDk3LGg9dSouMDYyO2Uuc2F2ZSgpLGUudHJhbnNsYXRlKG8scCk7bGV0IG09MCxnPTAsdj0wO2E+PTAmJmE8MT8obT1hPC40P2EvLjQ6YT4uNzU/TWF0aC5tYXgoMCwxLShhLS43NSkvLjI1KToxLGc9Y3IoKGEtLjM1KS8uMyksdj1jcigoYS0uNykvLjMpKi4zNSk6YT49MSYmKHY9LjM1LGc9MSksZS5yb3RhdGUodiouMyksZS5saW5lQ2FwPSJyb3VuZCIsZS5zdHJva2VTdHlsZT0iI2U1ZTBkMCIsZS5saW5lV2lkdGg9aCouMTYsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygwLC1oKi40NSksZS5saW5lVG8oLWgqLjE2LDApLGUuc3Ryb2tlKCksZS5iZWdpblBhdGgoKSxlLm1vdmVUbygwLC1oKi40NSksZS5saW5lVG8oaCouMTQrbSpoKi4xLC1tKmgqLjMpLGUuc3Ryb2tlKCksZS5zdHJva2VTdHlsZT0iIzNiNmZkNCIsZS5saW5lV2lkdGg9aCouMjIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygwLC1oKi40NSksZS5saW5lVG8oaCouMDUsLWgqLjg1KSxlLnN0cm9rZSgpLGUuc3Ryb2tlU3R5bGU9IiMzYjZmZDQiLGUubGluZVdpZHRoPWgqLjEzLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oaCouMDMsLWgqLjc4KSxlLmxpbmVUbygtaCouMjItbSpoKi4wOCwtaCouNyksZS5zdHJva2UoKSxlLmZpbGxTdHlsZT0iIzhhNWEzNCIsZS5iZWdpblBhdGgoKSxlLmFyYygtaCouMjQtbSpoKi4wOCwtaCouNyxoKi4wOSwwLE1hdGguUEkqMiksZS5maWxsKCk7Y29uc3Qgdz0tLjYtZyoyLjErKGE+PS44NT9jcigoYS0uODUpLy4xNSkqMi42OjApO2Uuc2F2ZSgpLGUudHJhbnNsYXRlKGgqLjA1LC1oKi44KSxlLnJvdGF0ZSh3KSxlLnN0cm9rZVN0eWxlPSIjM2I2ZmQ0IixlLmxpbmVXaWR0aD1oKi4xMyxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsMCksZS5saW5lVG8oaCouMywwKSxlLnN0cm9rZSgpLGE8Ljk4JiYoZS5maWxsU3R5bGU9IiNmZmZmZmYiLGUuYmVnaW5QYXRoKCksZS5hcmMoaCouMzQsMCxoKi4wOCwwLE1hdGguUEkqMiksZS5maWxsKCkpLGUucmVzdG9yZSgpLGUuZmlsbFN0eWxlPSIjZDlhMDY2IixlLmJlZ2luUGF0aCgpLGUuYXJjKGgqLjA3LC1oKi45OCxoKi4xMywwLE1hdGguUEkqMiksZS5maWxsKCksZS5maWxsU3R5bGU9IiMyMzNjNzQiLGUuYmVnaW5QYXRoKCksZS5hcmMoaCouMDcsLWgqMS4wMixoKi4xMyxNYXRoLlBJLE1hdGguUEkqMiksZS5maWxsKCksZS5maWxsUmVjdChoKi4wNywtaCoxLjA0LGgqLjIsaCouMDUpLGUucmVzdG9yZSgpfWZ1bmN0aW9uIEpnKGUsbCl7Y29uc3QgYT1sLncsdT1sLmgsZD1hKi4zNTUsbz11Ki45MyxwPWEqLjA4NSxoPU1hdGguc2luKGwudGltZSouMDA0KSpwKi4wMjtlLnNhdmUoKSxlLnRyYW5zbGF0ZShkLG8raCk7Y29uc3QgbT1WMChjcigoMS1sLnN3aW5nQW5pbSkqMS43KSksZz1vcigtMSwxLjUsbC5zd2luZ0FuaW0+MD9tOjApKyhsLnN3aW5nQW5pbT4wPzA6TWF0aC5zaW4obC50aW1lKi4wMDQpKi4wNSk7ZS5zdHJva2VTdHlsZT0iI2NmZDZlNCIsZS5saW5lV2lkdGg9cCouMTYsZS5saW5lQ2FwPSJyb3VuZCIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtcCouMSwtcCouNSksZS5saW5lVG8oLXAqLjIsMCksZS5tb3ZlVG8ocCouMDgsLXAqLjUpLGUubGluZVRvKHAqLjIsMCksZS5zdHJva2UoKSxlLnN0cm9rZVN0eWxlPSIjYzQzYjNiIixlLmxpbmVXaWR0aD1wKi4yNixlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsLXAqLjUpLGUubGluZVRvKHAqLjAyLC1wKjEuMDUpLGUuc3Ryb2tlKCksZS5maWxsU3R5bGU9IiM4ZjI2MjYiLGUuYmVnaW5QYXRoKCksZS5hcmMocCouMDQsLXAqMS4yMixwKi4xNiwwLE1hdGguUEkqMiksZS5maWxsKCksZS5zYXZlKCksZS50cmFuc2xhdGUocCouMSwtcCouOTUpLGUucm90YXRlKGcpLGwuc3dpbmdBbmltPi4xNSYmKGUuc3Ryb2tlU3R5bGU9YHJnYmEoMjU1LDI1NSwyNTUsJHsobC5zd2luZ0FuaW0tLjE1KSouNTV9KWAsZS5saW5lV2lkdGg9cCouMjIsZS5iZWdpblBhdGgoKSxlLmFyYygwLDAscCouOTUsLS40LC43KSxlLnN0cm9rZSgpKSxlLnN0cm9rZVN0eWxlPSIjZDhiMDZhIixlLmxpbmVXaWR0aD1wKi4xMSxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsMCksZS5saW5lVG8ocCouOTUsLXAqLjI1KSxlLnN0cm9rZSgpLGUucmVzdG9yZSgpLGUucmVzdG9yZSgpfWZ1bmN0aW9uIFpnKGUsbCxhKXtjb25zdCB1PWwudyxkPWwuaCxvPXUqLjA3OCxwPXUqLjUsaD1kKi43OTU7ZS5zdHJva2VTdHlsZT1gcmdiYSgyNDIsMjM3LDIyNCwkey4zOCphfSlgLGUubGluZVdpZHRoPU1hdGgubWF4KDEuNSx1Ki4wMDI4KSxlLnNldExpbmVEYXNoKFs2LDVdKSxlLnN0cm9rZVJlY3QocC1vLGgtbyouODUsbyoyLG8qMS43KSxlLnNldExpbmVEYXNoKFtdKX1mdW5jdGlvbiB0YyhlLGwsYSx1LGQsbz0xKXtlLnNhdmUoKSxlLmdsb2JhbEFscGhhPW87Y29uc3QgcD1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGwsYSwwLGwsYSx1KjIuNik7cC5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsMjU1LDI1NSwwLjM1KSIpLHAuYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDI1NSwyNTUsMCkiKSxlLmZpbGxTdHlsZT1wLGUuZmlsbFJlY3QobC11KjMsYS11KjMsdSo2LHUqNiksZS5maWxsU3R5bGU9IiNmZmZmZmYiLGUuYmVnaW5QYXRoKCksZS5hcmMobCxhLHUsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuc3Ryb2tlU3R5bGU9IiNkNDNiM2IiLGUubGluZVdpZHRoPU1hdGgubWF4KDEsdSouMTYpLGUuYmVnaW5QYXRoKCksZS5hcmMobC11Ki40NSxhLHUqLjc1LC0uOStkLC45K2QpLGUuc3Ryb2tlKCksZS5iZWdpblBhdGgoKSxlLmFyYyhsK3UqLjQ1LGEsdSouNzUsTWF0aC5QSS0uOS1kLE1hdGguUEkrLjktZCksZS5zdHJva2UoKSxlLnJlc3RvcmUoKX1mdW5jdGlvbiBleChlLGwsYSx1LGQpe2UuY2xlYXJSZWN0KDAsMCxhLHUpLGUuc2F2ZSgpLGwuc2hha2U+MCYmZS50cmFuc2xhdGUoKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UsKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UpLFZnKGUsbCxhLHUpLHFnKGUsYSx1KSxZZyhlLGwsYSx1KSxYZyhlLGEsdSk7bGV0IG89LTE7aWYobC5zdGFnZT09PSJ3aW5kdXAiJiZsLnBpdGNoP289bC5zdGFnZVQvbC5waXRjaC53aW5kdXA6bC5zdGFnZT09PSJmbGlnaHQiJiZsLnBpdGNoJiYobz0xK2wuc3RhZ2VULzQwMCksUWcoZSxsLG8pLChkPT09InJ1bm5pbmcifHxkPT09InBhdXNlZCJ8fGQ9PT0icmVhZHkiKSYmWmcoZSxsLDEpLGwuc3RhZ2U9PT0iZmxpZ2h0IiYmbC5waXRjaCYmIWwuY29udGFjdCl7Y29uc3QgaD1jcihsLnN0YWdlVC9sLnBpdGNoLmZsaWdodCk7Zm9yKGNvbnN0W2csdl1vZltbLjE0LC4xMl0sWy4wOSwuMjJdLFsuMDQ1LC4zOF1dKWlmKGgtZz4wKXtjb25zdCB3PVhkKGwsaC1nKTt0YyhlLHcueCx3Lnksdy5yKi44NSwwLHYpfWNvbnN0IG09WGQobCxoKTt0YyhlLG0ueCxtLnksbS5yLGwudGltZSouMDMpfWlmKGwuY29udGFjdCl7Y29uc3QgaD1sLmNvbnRhY3QsbT1WMChjcihoLnQvaC5kdXIpKSxnPW9yKGgueDAsaC54MSxtKSx2PW9yKGgueTAsaC55MSxtKS1NYXRoLnNpbihNYXRoLlBJKm0pKmguYXJjLHc9b3IoYSouMDExLGEqLjAwNCxtKTtmb3IoY29uc3RbTSxSXW9mW1suMSwuMTVdLFsuMDUsLjNdXSlpZihtLU0+MCl7Y29uc3QgVz1tLU07ZS5nbG9iYWxBbHBoYT1SLGUuZmlsbFN0eWxlPSIjZmZmZmZmIixlLmJlZ2luUGF0aCgpLGUuYXJjKG9yKGgueDAsaC54MSxXKSxvcihoLnkwLGgueTEsVyktTWF0aC5zaW4oTWF0aC5QSSpXKSpoLmFyYyx3Ki44LDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLmdsb2JhbEFscGhhPTF9bTwuOTgmJnRjKGUsZyx2LHcsbC50aW1lKi4wNSl9SmcoZSxsKTtmb3IoY29uc3QgaCBvZiBsLnBhcnRpY2xlcyllLmdsb2JhbEFscGhhPWNyKGgubGlmZS9oLm1heExpZmUpLGUuZmlsbFN0eWxlPWguY29sb3IsZS5maWxsUmVjdChoLngtaC5zaXplLzIsaC55LWguc2l6ZS8yLGguc2l6ZSxoLnNpemUpO2UuZ2xvYmFsQWxwaGE9MTtjb25zdCBwPWUuY3JlYXRlUmFkaWFsR3JhZGllbnQoYS8yLHUvMix1Ki4zNSxhLzIsdS8yLHUqLjc4KTtpZihwLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDAsMCwwLDApIikscC5hZGRDb2xvclN0b3AoMSwicmdiYSgwLDAsMCwwLjQyKSIpLGUuZmlsbFN0eWxlPXAsZS5maWxsUmVjdCgwLDAsYSx1KSxlLnJlc3RvcmUoKSxsLmZsYXNoPjAmJihlLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjQxLDIxNCwke2wuZmxhc2gqLjN9KWAsZS5maWxsUmVjdCgwLDAsYSx1KSksbC5iYW5uZXImJihsLnN0YWdlPT09InJlc29sdmUifHxsLnN0YWdlPT09ImVuZGluZyIpKXtjb25zdCBoPWwuYmFubmVyLG09Y3IobC5zdGFnZVQvMTYwKSxnPW08MT8uNSsuNSpLZyhtKToxLHY9aC5kdXItbC5zdGFnZVQ8MjIwP01hdGgubWF4KDAsKGguZHVyLWwuc3RhZ2VUKS8yMjApOjE7ZS5zYXZlKCksZS50cmFuc2xhdGUoYS8yLHUqLjMpLGUuc2NhbGUoZyxnKSxlLmdsb2JhbEFscGhhPXYsZS50ZXh0QWxpZ249ImNlbnRlciIsZS50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsZS5mb250PWAke01hdGgucm91bmQoYSouMDUyKX1weCAiUHJlc3MgU3RhcnQgMlAiLCBtb25vc3BhY2VgLGUubGluZVdpZHRoPWEqLjAxMixlLnN0cm9rZVN0eWxlPSJyZ2JhKDcsMTMsMzQsMC45KSIsZS5zdHJva2VUZXh0KGgudHh0LDAsMCksZS5maWxsU3R5bGU9aC5jb2xvcixlLnNoYWRvd0NvbG9yPWguY29sb3IsZS5zaGFkb3dCbHVyPTI2LGUuZmlsbFRleHQoaC50eHQsMCwwKSxlLnNoYWRvd0JsdXI9MCxoLnN1YiYmKGUuZm9udD1gNzAwICR7TWF0aC5yb3VuZChhKi4wMjYpfXB4ICJDaGFrcmEgUGV0Y2giLCBzYW5zLXNlcmlmYCxlLnN0cm9rZVN0eWxlPSJyZ2JhKDcsMTMsMzQsMC45KSIsZS5saW5lV2lkdGg9YSouMDA2LGUuc3Ryb2tlVGV4dChoLnN1YiwwLGEqLjA1NSksZS5maWxsU3R5bGU9IiNmMmVkZTAiLGUuZmlsbFRleHQoaC5zdWIsMCxhKi4wNTUpKSxlLnJlc3RvcmUoKX0oZD09PSJydW5uaW5nInx8ZD09PSJwYXVzZWQiKSYmbC5sYXN0UGl0Y2hMYWJlbCE9PSLigJQiJiYoZS5mb250PWA3MDAgJHtNYXRoLnJvdW5kKGEqLjAyMSl9cHggIkNoYWtyYSBQZXRjaCIsIHNhbnMtc2VyaWZgLGUudGV4dEFsaWduPSJyaWdodCIsZS5maWxsU3R5bGU9InJnYmEoMjQyLDIzNywyMjQsMC43NSkiLGUuZmlsbFRleHQobC5sYXN0UGl0Y2hMYWJlbCxhLWEqLjAzLHUtYSouMDI1KSl9Y29uc3QgcTA9InNsdWdnZXJuaWdodC5iZXN0cy52MSIsWTA9InNsdWdnZXJuaWdodC5kaWZmLnYxIjtmdW5jdGlvbiB0eCgpe2NvbnN0IGU9e3Jvb2tpZTowLG1ham9yOjAsYWxsc3RhcjowfTt0cnl7Y29uc3QgbD1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShxMCk7aWYoIWwpcmV0dXJuIGU7Y29uc3QgYT1KU09OLnBhcnNlKGwpO3JldHVybntyb29raWU6TnVtYmVyKGEucm9va2llKXx8MCxtYWpvcjpOdW1iZXIoYS5tYWpvcil8fDAsYWxsc3RhcjpOdW1iZXIoYS5hbGxzdGFyKXx8MH19Y2F0Y2h7cmV0dXJuIGV9fWZ1bmN0aW9uIG54KCl7dHJ5e2NvbnN0IGU9bG9jYWxTdG9yYWdlLmdldEl0ZW0oWTApO2lmKGU9PT0icm9va2llInx8ZT09PSJtYWpvciJ8fGU9PT0iYWxsc3RhciIpcmV0dXJuIGV9Y2F0Y2h7fXJldHVybiJtYWpvciJ9ZnVuY3Rpb24gcngoKXtjb25zdCBlPXgudXNlUmVmKG51bGwpLGw9eC51c2VSZWYobnVsbCksYT14LnVzZVJlZihabygpKSx1PXgudXNlUmVmKHt3OjAsaDowfSksZD14LnVzZVJlZigwKSxvPXgudXNlUmVmKDApLHA9eC51c2VSZWYoe2FiOjAsaGl0czowLGhyOjAsazowLHN0cmVhazowLGJlc3RTdHJlYWs6MH0pLGg9eC51c2VSZWYoe2NyYWNrOjAsZm91bDowLHdoaWZmOjAsc3RyaWtlOjAsYmFsbDowLHdhbGs6MCxvdXQ6MCxjaGVlcjowLGhyOjAsazowfSksW20sZ109eC51c2VTdGF0ZSgiaWRsZSIpLHY9eC51c2VSZWYoImlkbGUiKSxbdyxNXT14LnVzZVN0YXRlKDApLFtSLFddPXgudXNlU3RhdGUoMCksW1EsU109eC51c2VTdGF0ZSgwKSxbSCxWXT14LnVzZVN0YXRlKDApLFtxLG9lXT14LnVzZVN0YXRlKFshMSwhMSwhMV0pLFtaLHllXT14LnVzZVN0YXRlKHthYjowLGhpdHM6MCxocjowLGs6MCxzdHJlYWs6MCxiZXN0U3RyZWFrOjB9KSxbU2Usa2VdPXgudXNlU3RhdGUoIuKAlCIpLFtQZSxFZV09eC51c2VTdGF0ZSgwKSxbT2UsQmVdPXgudXNlU3RhdGUoITEpLFt6ZSxGZV09eC51c2VTdGF0ZShueCksTGU9eC51c2VSZWYoemUpLFtqZSx3ZV09eC51c2VTdGF0ZSh0eCksVT14LnVzZVJlZihqZSksW3RlLEZdPXgudXNlU3RhdGUoaG4pLGs9eC51c2VSZWYodGUpLEw9eC51c2VDYWxsYmFjayh6PT57di5jdXJyZW50PXosZyh6KX0sW10pLHVlPXgudXNlQ2FsbGJhY2soKCk9PntkLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGQuY3VycmVudCksZC5jdXJyZW50PTApfSxbXSksJD14LnVzZUNhbGxiYWNrKHo9Pnt1ZSgpLEwoInJlYWR5IiksZC5jdXJyZW50PXdpbmRvdy5zZXRUaW1lb3V0KCgpPT57ZC5jdXJyZW50PTAsdi5jdXJyZW50PT09InJlYWR5IiYmTCgicnVubmluZyIpfSx6KX0sW3VlLExdKSxKPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpLHVlKCk7Y29uc3R7dzp6LGg6ZmV9PXUuY3VycmVudDthLmN1cnJlbnQ9Wm8oenx8NjAwLGZlfHw2MDApLEdnKGEuY3VycmVudCxKb1tMZS5jdXJyZW50XSk7Y29uc3QgUD1hLmN1cnJlbnQ7aC5jdXJyZW50PXtjcmFjazpQLmV2Q3JhY2ssZm91bDpQLmV2Rm91bCx3aGlmZjpQLmV2V2hpZmYsc3RyaWtlOlAuZXZTdHJpa2UsYmFsbDpQLmV2QmFsbCx3YWxrOlAuZXZXYWxrLG91dDpQLmV2T3V0LGNoZWVyOlAuZXZDaGVlcixocjpQLmV2SHIsazpQLmV2S30sTSgwKSxXKDApLFMoMCksVigwKSxvZShbITEsITEsITFdKSx5ZSh7YWI6MCxoaXRzOjAsaHI6MCxrOjAsc3RyZWFrOjAsYmVzdFN0cmVhazowfSksa2UoIuKAlCIpLEJlKCExKSwkKDFlMyl9LFt1ZSwkXSksaGU9eC51c2VDYWxsYmFjaygoKT0+e3YuY3VycmVudD09PSJydW5uaW5nIiYmKHVlKCksTCgicGF1c2VkIikpfSxbdWUsTF0pLHZlPXgudXNlQ2FsbGJhY2soKCk9Pnt2LmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksJCg2MDApKX0sWyRdKSxHPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpO2NvbnN0IHo9di5jdXJyZW50O2lmKHo9PT0iaWRsZSJ8fHo9PT0ib3ZlciIpe0ooKTtyZXR1cm59ej09PSJydW5uaW5nIiYmSGcoYS5jdXJyZW50LEpvW0xlLmN1cnJlbnRdKX0sW0pdKSx4ZT14LnVzZUNhbGxiYWNrKHo9Pntjb25zdCBmZT12LmN1cnJlbnQ7aWYoZmU9PT0icnVubmluZyJ8fGZlPT09InJlYWR5Inx8ZmU9PT0icGF1c2VkIilyZXR1cm47TGUuY3VycmVudD16LEZlKHopO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShZMCx6KX1jYXRjaHt9Y29uc3R7dzpQLGg6aWV9PXUuY3VycmVudDthLmN1cnJlbnQ9Wm8oUHx8NjAwLGllfHw2MDApLE0oMCksVygwKSxTKDApLFYoMCksb2UoWyExLCExLCExXSkseWUoe2FiOjAsaGl0czowLGhyOjAsazowLHN0cmVhazowLGJlc3RTdHJlYWs6MH0pLGtlKCLigJQiKSxCZSghMSl9LFtdKSxhZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3Qgej0hay5jdXJyZW50O2suY3VycmVudD16LEYoeiksdXQoeiksbW4oeil9LFtdKSxlZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3Qgej1hLmN1cnJlbnQ7b24uc3RyaWtlb3V0KCk7Y29uc3QgZmU9TGUuY3VycmVudCxQPXoucnVucztpZihQPlUuY3VycmVudFtmZV0pe2NvbnN0IGllPXsuLi5VLmN1cnJlbnQsW2ZlXTpQfTtVLmN1cnJlbnQ9aWUsd2UoaWUpLEJlKCEwKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0ocTAsSlNPTi5zdHJpbmdpZnkoaWUpKX1jYXRjaHt9fUwoIm92ZXIiKX0sW0xdKTtyZXR1cm4geC51c2VFZmZlY3QoKCk9Pnt1dChrLmN1cnJlbnQpO2xldCB6PTA7Y29uc3QgZmU9Tz0+e2NvbnN0IGo9YS5jdXJyZW50LGdlPWoubGFzdD9NYXRoLm1pbig2MCxPLWoubGFzdCk6MTY7ai5sYXN0PU87Y29uc3QgWD11LmN1cnJlbnQ7WC53PjAmJihqLnc9WC53LGouaD1YLmgpO2NvbnN0IFQ9di5jdXJyZW50O1VnKGosZ2UsTyxKb1tMZS5jdXJyZW50XSxUPT09InJ1bm5pbmciKSxqLnJ1bnMhPT1vLmN1cnJlbnQmJihvLmN1cnJlbnQ9ai5ydW5zLE0oai5ydW5zKSxFZShXZT0+V2UrMSkpLFcoai5vdXRzKSxTKGouYmFsbHMpLFYoai5zdHJpa2VzKSxvZShqLmJhc2VzKTtjb25zdCBiZT1qLnN0YXRzLG5lPXAuY3VycmVudDsoYmUuYWIhPT1uZS5hYnx8YmUuaGl0cyE9PW5lLmhpdHN8fGJlLmhyIT09bmUuaHJ8fGJlLmshPT1uZS5rfHxiZS5zdHJlYWshPT1uZS5zdHJlYWt8fGJlLmJlc3RTdHJlYWshPT1uZS5iZXN0U3RyZWFrKSYmKHAuY3VycmVudD17Li4uYmV9LHllKHsuLi5iZX0pKSxrZShqLmxhc3RQaXRjaExhYmVsKTtjb25zdCBzZT1oLmN1cnJlbnQ7ai5ldkNyYWNrIT09c2UuY3JhY2smJihzZS5jcmFjaz1qLmV2Q3JhY2ssb24uY3JhY2soKSksai5ldkZvdWwhPT1zZS5mb3VsJiYoc2UuZm91bD1qLmV2Rm91bCxvbi5mb3VsKCkpLGouZXZXaGlmZiE9PXNlLndoaWZmJiYoc2Uud2hpZmY9ai5ldldoaWZmLG9uLndoaWZmKCkpLGouZXZTdHJpa2UhPT1zZS5zdHJpa2UmJihzZS5zdHJpa2U9ai5ldlN0cmlrZSxvbi5zdHJpa2UoKSksai5ldkJhbGwhPT1zZS5iYWxsJiYoc2UuYmFsbD1qLmV2QmFsbCxvbi5iYWxsKCkpLGouZXZXYWxrIT09c2Uud2FsayYmKHNlLndhbGs9ai5ldldhbGssb24ud2FsaygpKSxqLmV2T3V0IT09c2Uub3V0JiYoc2Uub3V0PWouZXZPdXQsb24ub3V0KCkpLGouZXZDaGVlciE9PXNlLmNoZWVyJiYoc2UuY2hlZXI9ai5ldkNoZWVyLG9uLmNoZWVyKCkpLGouZXZIciE9PXNlLmhyJiYoc2UuaHI9ai5ldkhyLG9uLmhyKCkpLGouZXZLIT09c2UuayYmKHNlLms9ai5ldkssb24uc3RyaWtlb3V0KCkpLFQ9PT0icnVubmluZyImJmoub3ZlciYmZWUoKTtjb25zdCBwZT1lLmN1cnJlbnQ7aWYocGUmJlgudz4wKXtjb25zdCBXZT1wZS5nZXRDb250ZXh0KCIyZCIpO1dlJiZleChXZSxqLFgudyxYLmgsVCl9ej1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZmUpfTt6PXJlcXVlc3RBbmltYXRpb25GcmFtZShmZSk7Y29uc3QgUD1sLmN1cnJlbnQsaWU9ZS5jdXJyZW50O2xldCBZPW51bGw7aWYoUCYmaWUpe2NvbnN0IE89KCk9Pntjb25zdCBqPVAuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksZ2U9TWF0aC5tYXgoMCxNYXRoLmZsb29yKE1hdGgubWluKGoud2lkdGgsai5oZWlnaHQpKSksWD1NYXRoLm1pbigyLHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKTtpZS53aWR0aD1NYXRoLnJvdW5kKGdlKlgpLGllLmhlaWdodD1NYXRoLnJvdW5kKGdlKlgpLGllLnN0eWxlLndpZHRoPWAke2dlfXB4YCxpZS5zdHlsZS5oZWlnaHQ9YCR7Z2V9cHhgLHUuY3VycmVudD17dzpnZSxoOmdlfTtjb25zdCBUPWllLmdldENvbnRleHQoIjJkIik7VCYmVC5zZXRUcmFuc2Zvcm0oWCwwLDAsWCwwLDApfTtPKCksWT1uZXcgUmVzaXplT2JzZXJ2ZXIoTyksWS5vYnNlcnZlKFApfWNvbnN0IF89Tz0+e2NvbnN0IGo9Ty5rZXkudG9Mb3dlckNhc2UoKTtpZihqPT09IiAifHxqPT09ImVudGVyIil7Ty5wcmV2ZW50RGVmYXVsdCgpLE8ucmVwZWF0fHxHKCk7cmV0dXJufWlmKGo9PT0iciIpe0ooKTtyZXR1cm59aWYoaj09PSJwInx8aj09PSJlc2NhcGUiKXtjb25zdCBnZT12LmN1cnJlbnQ7Z2U9PT0icnVubmluZyI/aGUoKTpnZT09PSJwYXVzZWQiJiZ2ZSgpO3JldHVybn1pZihqPT09Im0iKXthZSgpO3JldHVybn1qPT09IjEiJiZ4ZSgicm9va2llIiksaj09PSIyIiYmeGUoIm1ham9yIiksaj09PSIzIiYmeGUoImFsbHN0YXIiKX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLF8pO2NvbnN0IEk9KCk9Pntkb2N1bWVudC5oaWRkZW4mJnYuY3VycmVudD09PSJydW5uaW5nIiYmaGUoKX0sZGU9KCk9Pnt2LmN1cnJlbnQ9PT0icnVubmluZyImJmhlKCl9O3JldHVybiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixJKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigiYmx1ciIsZGUpLCgpPT57Y2FuY2VsQW5pbWF0aW9uRnJhbWUoeiksdWUoKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsXyksZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsSSksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImJsdXIiLGRlKSxZJiZZLmRpc2Nvbm5lY3QoKX19LFt4ZSx1ZSxlZSxoZSx2ZSxKLEcsYWVdKSx7Y2FudmFzUmVmOmUsd3JhcFJlZjpsLHBoYXNlOm0scnVuczp3LG91dHM6UixiYWxsczpRLHN0cmlrZXM6SCxiYXNlczpxLHN0YXRzOlosbGFzdFBpdGNoOlNlLHBvcEtleTpQZSxpc05ld0Jlc3Q6T2UsZGlmZmljdWx0eTp6ZSxiZXN0czpqZSxtdXRlZDp0ZSxhY3Rpb25zOntzdGFydDpKLHN3aW5nSW5wdXQ6RyxwYXVzZUdhbWU6aGUscmVzdW1lR2FtZTp2ZSxjaGFuZ2VEaWZmaWN1bHR5OnhlLHRvZ2dsZU11dGU6YWV9fX1jb25zdCBRZD1be2lkOiJyb29raWUiLGxhYmVsOiJSb29raWUiLHRhZzoiSG9uZXN0IGhlYXQsIGJpZyB3aW5kb3ciLGRvdHM6MX0se2lkOiJtYWpvciIsbGFiZWw6Ik1ham9yIix0YWc6IkEgcmVhbCByb3RhdGlvbiIsZG90czoyfSx7aWQ6ImFsbHN0YXIiLGxhYmVsOiJBbGwtU3RhciIsdGFnOiJOYXN0eSBzdHVmZiwgcXVpY2sgYXJtcyIsZG90czozfV0sc3g9WyJmYXN0YmFsbCIsInNsaWRlciIsImN1cnZlIiwiY2hhbmdldXAiXTtmdW5jdGlvbiBseCh7b246ZSxjb2xvcjpsLGxhYmVsOmF9KXtyZXR1cm4gci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMSIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJoLTIuNSB3LTIuNSByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1ibGFjay80MCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0xNTAiLHN0eWxlOmU/e2JhY2tncm91bmQ6bCxib3hTaGFkb3c6YDAgMCA4cHggJHtsfWB9OntiYWNrZ3JvdW5kOiJ2YXIoLS1jb2xvci1waXQtNjAwKSJ9fSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs2cHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOmF9KV19KX1mdW5jdGlvbiBheCh7YmFzZXM6ZX0pe2NvbnN0IGw9YT0+ci5qc3goImNpcmNsZSIse3I6IjMuNCIsZmlsbDphPyIjZmZkMTY2IjoidHJhbnNwYXJlbnQiLHN0cm9rZTphPyIjZmZlMDhhIjoiIzVkN2Y2YiIsc3Ryb2tlV2lkdGg6IjEuNCIsc3R5bGU6YT97ZmlsdGVyOiJkcm9wLXNoYWRvdygwIDAgNHB4IHJnYmEoMjU1LDIwOSwxMDIsMC45KSkifTp2b2lkIDB9KTtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgNDQgNDQiLGNsYXNzTmFtZToiaC05IHctOSIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJyZWN0Iix7eDoiMTIiLHk6IjEyIix3aWR0aDoiMjAiLGhlaWdodDoiMjAiLHRyYW5zZm9ybToicm90YXRlKDQ1IDIyIDIyKSIsZmlsbDoibm9uZSIsc3Ryb2tlOiIjNWQ3ZjZiIixzdHJva2VXaWR0aDoiMS40In0pLHIuanN4KCJnIix7dHJhbnNmb3JtOiJ0cmFuc2xhdGUoMjIgNykiLGNoaWxkcmVuOmwoZVsxXSl9KSxyLmpzeCgiZyIse3RyYW5zZm9ybToidHJhbnNsYXRlKDM3IDIyKSIsY2hpbGRyZW46bChlWzBdKX0pLHIuanN4KCJnIix7dHJhbnNmb3JtOiJ0cmFuc2xhdGUoNyAyMikiLGNoaWxkcmVuOmwoZVsyXSl9KSxyLmpzeCgiY2lyY2xlIix7Y3g6IjIyIixjeToiMzciLHI6IjIuNCIsZmlsbDoiI2YyZWRlMCJ9KV19KX1mdW5jdGlvbiBuYyh7dGl0bGU6ZSxjb3VudDpsLHRvdGFsOmEsY29sb3I6dX0pe3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHQtMS41IixjaGlsZHJlbjpBcnJheS5mcm9tKHtsZW5ndGg6YX0sKGQsbyk9PnIuanN4KGx4LHtvbjpvPGwsY29sb3I6dSxsYWJlbDoiIn0sbykpfSldfSl9ZnVuY3Rpb24gSmQoe2xhYmVsOmUsdmFsdWU6bCxhY2NlbnQ6YT0hMSxwb3A6dT0wfSl7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7YT8iYW5pbWF0ZS1wb3AgdGV4dC1hbWJlcmdsb3ctNDAwIjoidGV4dC1tb3NzLTEwMCJ9YCxjaGlsZHJlbjpsfSx1KV19KX1mdW5jdGlvbiB1cyh7a2V5c0xpc3Q6ZSxhY3Rpb246bH0pe3JldHVybiByLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46ZX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpsfSldfSl9ZnVuY3Rpb24gaXgoKXtjb25zdCBlPXJ4KCkse2FjdGlvbnM6bCxwaGFzZTphfT1lLHU9YT09PSJydW5uaW5nIixkPWUuc3RhdHMuYWI+MD8oZS5zdGF0cy5oaXRzL2Uuc3RhdHMuYWIpLnRvRml4ZWQoMykucmVwbGFjZSgvXjAvLCIiKToiLjAwMCIsbz1wPT57cC5wcmV2ZW50RGVmYXVsdCgpLGwuc3dpbmdJbnB1dCgpfTtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3IuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbci5qc3goSmQse2xhYmVsOiJSdW5zIix2YWx1ZTplLnJ1bnMsYWNjZW50OiEwLHBvcDplLnBvcEtleX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiQmFzZXMifSksci5qc3goImRpdiIse2NsYXNzTmFtZToicHQtMC41IixjaGlsZHJlbjpyLmpzeChheCx7YmFzZXM6ZS5iYXNlc30pfSldfSksci5qc3gobmMse3RpdGxlOiJCYWxsIixjb3VudDplLmJhbGxzLHRvdGFsOjQsY29sb3I6IiM4ZWYwNWEifSksci5qc3gobmMse3RpdGxlOiJTdHJpa2UiLGNvdW50OmUuc3RyaWtlcyx0b3RhbDoyLGNvbG9yOiIjZmY1ZDhmIn0pLHIuanN4KG5jLHt0aXRsZToiT3V0Iixjb3VudDplLm91dHMsdG90YWw6Myxjb2xvcjoiI2ZmYzg1NyJ9KSxyLmpzeChKZCx7bGFiZWw6IkhSIix2YWx1ZTpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1bIzYyZTZmZl0gW3RleHQtc2hhZG93OjBfMF8xMnB4X3JnYmEoOTgsMjMwLDI1NSwwLjQ1KV0iLGNoaWxkcmVuOmUuc3RhdHMuaHJ9KX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJoaWRkZW4gcm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOmJsb2NrIixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46Ikxhc3QgUGl0Y2gifSksci5qc3goImRpdiIse2NsYXNzTmFtZToicHQtMSB0ZXh0LVsxMXB4XSBmb250LWJvbGQgdHJhY2tpbmctd2lkZSB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmxhc3RQaXRjaH0pXX0pXX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjp1PyJQYXVzZSI6IlJlc3VtZSIsdGl0bGU6dT8iUGF1c2UgKFApIjoiUmVzdW1lIChQKSIsb25DbGljazp1P2wucGF1c2VHYW1lOmwucmVzdW1lR2FtZSxkaXNhYmxlZDohdSYmYSE9PSJwYXVzZWQiLGNoaWxkcmVuOnU/ci5qc3goZ3Qse30pOnIuanN4KF9lLHt9KX0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjoiUmVzdGFydCIsdGl0bGU6IlJlc3RhcnQgKFIpIixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3goVWUse30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmUubXV0ZWQ/IlVubXV0ZSI6Ik11dGUiLHRpdGxlOiJTb3VuZCAoTSkiLG9uQ2xpY2s6bC50b2dnbGVNdXRlLGNoaWxkcmVuOmUubXV0ZWQ/ci5qc3goZm4se30pOnIuanN4KHVuLHt9KX0pXX0pXX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdhcC00IGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV8zMDBweF0iLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7cmVmOmUud3JhcFJlZixjbGFzc05hbWU6InJlbGF0aXZlIixjaGlsZHJlbjpyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYm9hcmQtZnJhbWUgc2NhbmxpbmVzIHJlbGF0aXZlIG14LWF1dG8gYXNwZWN0LXNxdWFyZSB3LWZ1bGwgbWF4LXctW21pbig5NHZ3LDgyMHB4LGNhbGMoMTAwZHZoLTE5MHB4KSldIHRvdWNoLW5vbmUgc2VsZWN0LW5vbmUgb3ZlcmZsb3ctaGlkZGVuIGxnOm1heC13LVttaW4oMTAwJSxjYWxjKDEwMGR2aC0yODBweCkpXSIsY2hpbGRyZW46W3IuanN4KCJjYW52YXMiLHtyZWY6ZS5jYW52YXNSZWYsY2xhc3NOYW1lOiJhYnNvbHV0ZSBpbnNldC0wIG0tYXV0byBjdXJzb3ItcG9pbnRlciIsb25Qb2ludGVyRG93bjpvLG9uQ29udGV4dE1lbnU6cD0+cC5wcmV2ZW50RGVmYXVsdCgpfSksci5qc3goImRpdiIse2NsYXNzTmFtZToicG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0yIHotMjAiLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOlsibGVmdC0wIHRvcC0wIGJvcmRlci1sLTIgYm9yZGVyLXQtMiIsInJpZ2h0LTAgdG9wLTAgYm9yZGVyLXItMiBib3JkZXItdC0yIiwibGVmdC0wIGJvdHRvbS0wIGJvcmRlci1sLTIgYm9yZGVyLWItMiIsInJpZ2h0LTAgYm90dG9tLTAgYm9yZGVyLXItMiBib3JkZXItYi0yIl0ubWFwKHA9PnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBhYnNvbHV0ZSBoLTQgdy00IGJvcmRlci1hbWJlcmdsb3ctNDAwLzQwICR7cH1gfSxwKSl9KSxhPT09ImlkbGUiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMDcwZDIyXS84MCBwLTYgdGV4dC1jZW50ZXIgYmFja2Ryb3AtYmx1ci1bMnB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJoMSIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtY2hhbGsgZm9udC1kaXNwbGF5IHRleHQtMnhsIHNtOnRleHQtM3hsIixjaGlsZHJlbjoiU0xVR0dFUiBOSUdIVCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IG10LTIgdGV4dC1bOXB4XSB0cmFja2luZy1bMC4zZW1dIHRleHQtWyM5ZmIwZDBdIixjaGlsZHJlbjoiVElNSU5HIEJBVFRJTkcgVlMuIENQVSBBUk1TIn0pXX0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEJhbGwiXX0pfSksci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJTUEFDRSAvIENMSUNLIC8gVEFQIFRPIFNXSU5HIn0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6Im1heC13LXNtIHRleHQtWzEycHhdIGxlYWRpbmctcmVsYXhlZCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU3dpbmcgd2hlbiB0aGUgYmFsbCByZWFjaGVzIHRoZSBwbGF0ZS4gUGVyZmVjdCB0aW1pbmcgZ29lcyBkZWVwIOKAlCB0aGUgQ1BVIHBpdGNoZXIgc3R1ZGllcyB5b3VyIHN3aW5nIGFuZCBjaGFuZ2VzIHNwZWVkcyBvbiB5b3UuIFRocmVlIG91dHMgYW5kIHRoZSBuaWdodCBpcyBvdmVyLiJ9KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBDTFVCIFJFQ09SRCDimIUifSldfSksYT09PSJwYXVzZWQiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMDcwZDIyXS84MCBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtY2hhbGsgZm9udC1kaXNwbGF5IHRleHQteGwiLGNoaWxkcmVuOiJSQUlOIERFTEFZIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnJlc3VtZUdhbWUsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pfSksci5qc3goQWUse29uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3RhcnQiXX0pfSldfSksci5qc3hzKCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLCIgIixyLmpzeCgic3BhbiIse2NsYXNzTmFtZToibXgtMSIsY2hpbGRyZW46Im9yIn0pLCIgIixyLmpzeChBLHtjaGlsZHJlbjoiRXNjIn0pLCIgIixyLmpzeCgic3BhbiIse2NsYXNzTmFtZToibWwtMSIsY2hpbGRyZW46InJlc3VtZXMifSldfSldfSksYT09PSJvdmVyIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNCBiZy1bIzA3MGQyMl0vODUgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LXhsIHRleHQtYXBwbGUtNDAwIFt0ZXh0LXNoYWRvdzowXzBfMjRweF9yZ2JhKDI1NSwxMDcsMTA3LDAuNSldIHNtOnRleHQtMnhsIixjaGlsZHJlbjoiQkFMTEdBTUUhIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWVuZCBnYXAtNiIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlJVTlMifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOmUucnVuc30pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZ3JpZCBncmlkLWNvbHMtMiBnYXAteC04IGdhcC15LTEgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCBzbTpncmlkLWNvbHMtNCIsY2hpbGRyZW46W3IuanN4cygic3BhbiIse2NoaWxkcmVuOlsiSFIgIixyLmpzeCgiYiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5zdGF0cy5ocn0pXX0pLHIuanN4cygic3BhbiIse2NoaWxkcmVuOlsiSElUUyAiLHIuanN4KCJiIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLnN0YXRzLmhpdHN9KV19KSxyLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbIkFWRyAiLHIuanN4KCJiIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpkfSldfSksci5qc3hzKCJzcGFuIix7Y2hpbGRyZW46WyJLICIsci5qc3goImIiLHtjbGFzc05hbWU6InRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmUuc3RhdHMua30pXX0pXX0pLGUuaXNOZXdCZXN0JiZyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIENMVUIgUkVDT1JEIOKYhSJ9KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGxheSBBZ2FpbiJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im10LTQgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSIsY2hpbGRyZW46W3IuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLG9uUG9pbnRlckRvd246cD0+e3AucHJldmVudERlZmF1bHQoKSxhPT09ImlkbGUifHxhPT09Im92ZXIiP2wuc3RhcnQoKTphPT09InBhdXNlZCI/bC5yZXN1bWVHYW1lKCk6bC5zd2luZ0lucHV0KCl9LG9uQ29udGV4dE1lbnU6cD0+cC5wcmV2ZW50RGVmYXVsdCgpLGNsYXNzTmFtZTpgYnRuLWFyY2FkZSBmbGV4IG1pbi13LVsyNDBweF0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgcHgtOCBweS00IHRleHQtWzE0cHhdICR7dT8iYnRuLXByaW1hcnkiOiJidG4tZ2hvc3QifWAsY2hpbGRyZW46YT09PSJydW5uaW5nIj9yLmpzeChyLkZyYWdtZW50LHtjaGlsZHJlbjoiU1dJTkchIn0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGxheSBBZ2FpbiJdfSk6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGxheSBCYWxsIl19KX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjp1PyJUaW1lIHlvdXIgc3dpbmcgYXMgdGhlIGJhbGwgY3Jvc3NlcyB0aGUgcGxhdGUiOiJTcGFjZSwgY2xpY2ssIG9yIHRhcCB3b3JrcyB0b28ifSldfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiU2NvdXRpbmcgUmVwb3J0IixjaGlsZHJlbjpbci5qc3goInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOnN4Lm1hcChwPT5yLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIiLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdW5kZWQtZnVsbCIsc3R5bGU6e2JhY2tncm91bmQ6aGxbcF0uY29sb3IsYm94U2hhZG93OmAwIDAgOHB4ICR7aGxbcF0uY29sb3J9YH19KSxobFtwXS5uYW1lLnRvTG93ZXJDYXNlKCldfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy00MDAiLGNoaWxkcmVuOmhsW3BdLmJsdXJifSldfSxwKSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIGxlYWRpbmctcmVsYXhlZCB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiVGhlIENQVSBhcm0gYWRhcHRzOiBzd2luZyBlYXJseSBhbmQgaXQgZ29lcyBvZmZzcGVlZCwgc3dpbmcgbGF0ZSBhbmQgaXQgYnJpbmdzIGhlYXQuIEl0IGFsc28gY2hhbmdlcyBzcGVlZHMgb2ZmIHRoZSBzYW1lIGFybSwgc28gdHJ1c3QgeW91ciBleWVzLCBub3QgdGhlIHdpbmR1cC4ifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im10LTMgZ3JpZCBncmlkLWNvbHMtMiBnYXAtMiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODAwIHB4LTIgcHktMS41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzEycHhdIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmR9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJ0ZXh0LVs5cHhdIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiQmF0dGluZyBBdmcifSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04MDAgcHgtMiBweS0xLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5zdGF0cy5zdHJlYWt9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJ0ZXh0LVs5cHhdIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiSGl0IFN0cmVhayJ9KV19KV19KV19KSxyLmpzeChkbix7dGl0bGU6IkxlYWd1ZSIsb3B0aW9uczpRZCx2YWx1ZTplLmRpZmZpY3VsdHksb25DaGFuZ2U6bC5jaGFuZ2VEaWZmaWN1bHR5LGRpc2FibGVkOmE9PT0icnVubmluZyJ8fGE9PT0icmVhZHkifHxhPT09InBhdXNlZCJ9KSxyLmpzeChwbix7YmVzdHM6ZS5iZXN0cyxvcHRpb25zOlFkLGFjdGl2ZTplLmRpZmZpY3VsdHl9KSxyLmpzeHMocnQse3RpdGxlOiJDb250cm9scyIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4KHVzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJTcGFjZSJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiRW50ZXIifSldfSksYWN0aW9uOiJTd2luZyJ9KSxyLmpzeCh1cyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IkNsaWNrIC8gVGFwIn0pLGFjdGlvbjoiU3dpbmcifSksci5qc3godXMse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksci5qc3goQSx7Y2hpbGRyZW46IkVzYyJ9KV19KSxhY3Rpb246IlBhdXNlIn0pLHIuanN4KHVzLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiUiJ9KSxhY3Rpb246IlJlc3RhcnQifSksci5qc3godXMse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IjEifSksci5qc3goQSx7Y2hpbGRyZW46IjIifSksci5qc3goQSx7Y2hpbGRyZW46IjMifSldfSksYWN0aW9uOiJMZWFndWUifSksci5qc3godXMse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJNIn0pLGFjdGlvbjoiU291bmQifSldfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiU3dpbmcgaW5zaWRlIHRoZSB3aW5kb3cgZm9yIGNvbnRhY3Qg4oCUIHRoZSB0aWdodGVyIHlvdXIgdGltaW5nLCB0aGUgaGFyZGVyIHRoZSBoaXQuIEZvdWxzIGNvdW50IGFzIHN0cmlrZXMgKG5ldmVyIHRoZSB0aGlyZCksIGZvdXIgYmFsbHMgaXMgYSB3YWxrLiJ9KV19KV19KV19KV19KX1jb25zdCB1bD17YnJlZXplOntsYWJlbDoiQlJFRVpFIix0YWc6ImdlbnRsZSBkcmlmdCwgZm9yZ2l2aW5nIGVkZ2UiLGRvdHM6MSxiYXNlU3BlZWQ6MTM1LHJhbXA6My40LGNhcDozMDAsdG9sZXJhbmNlOjksZ3VzdENoYW5jZTowLHJlZ3Jvd3RoOjh9LGdhbGU6e2xhYmVsOiJHQUxFIix0YWc6ImJyaXNrIHNsaWRlcywgcmFyZSBndXN0cyIsZG90czoyLGJhc2VTcGVlZDoxODAscmFtcDo0LjgsY2FwOjM4NSx0b2xlcmFuY2U6Ni41LGd1c3RDaGFuY2U6LjA1LHJlZ3Jvd3RoOjZ9LHRlbXBlc3Q6e2xhYmVsOiJURU1QRVNUIix0YWc6ImZhc3QgYmxvY2tzLCBzdWRkZW4gZ3VzdHMiLGRvdHM6MyxiYXNlU3BlZWQ6MjI4LHJhbXA6Ni42LGNhcDo0NzUsdG9sZXJhbmNlOjQuMixndXN0Q2hhbmNlOi4xNyxyZWdyb3d0aDo1fX0sTm49NjAwLEl0PTI0LFpkPTM2LG1sPTIzMixrbj1Obi00Nix1cj0xMCx2Yz0zNDAsanQ9KGUsbCk9PmUrTWF0aC5yYW5kb20oKSoobC1lKSxveD0oZSxsLGEpPT5NYXRoLm1heChsLE1hdGgubWluKGEsZSkpLGN4PWU9PmVbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmUubGVuZ3RoKV07ZnVuY3Rpb24gZTAoZSxsLGEsdSxkLG89MSl7Y29uc3QgcD1NYXRoLm1pbigyMDAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgaD1lLnBhcnRpY2xlcy5sZW5ndGg7aDxwO2grKyl7Y29uc3QgbT1qdCgwLE1hdGguUEkqMiksZz1qdCgzMCwyMDApKm8sdj1qdCgzMDAsNzAwKTtlLnBhcnRpY2xlcy5wdXNoKHt4OmwseTphLHZ4Ok1hdGguY29zKG0pKmcsdnk6TWF0aC5zaW4obSkqZy00MCxsaWZlOnYsbWF4TGlmZTp2LHNpemU6anQoMS41LDMuMikqbyxjb2xvcjpjeCh1KSxkcmFnOjIsZ3Jhdjo2MH0pfX1mdW5jdGlvbiBYMChlLGwpe2NvbnN0IGE9ZS50b3dlcltlLnRvd2VyLmxlbmd0aC0xXSx1PWUudG93ZXIubGVuZ3RoLGQ9TWF0aC5yYW5kb20oKTwuNT8tMToxLG89YS53O2UuYWN0aXZlPXt4OmQ+MD91cjpObi11ci1vLHc6byxkaXI6ZCxzcGVlZDpNYXRoLm1pbihsLmJhc2VTcGVlZCpqdCguOTIsMS4wOCkrKHUtMSkqbC5yYW1wLGwuY2FwKSxndXN0QXQ6TWF0aC5yYW5kb20oKTxsLmd1c3RDaGFuY2U/anQoNTAwLDE2MDApOjAsc2xpZGVUOjB9fWZ1bmN0aW9uIHJjKGUsbD0hMSl7Y29uc3QgYT1bXTtpZihsKWZvcihsZXQgZD0wO2Q8ODtkKyspYS5wdXNoKHt4OihObi1tbCkvMix3Om1sLHBlcmZlY3Q6ZCUzPT09Mn0pO2Vsc2UgYS5wdXNoKHt4OihObi1tbCkvMix3Om1sLHBlcmZlY3Q6ITF9KTtjb25zdCB1PXt0aW1lOjAsbGFzdDowLHRvd2VyOmEsYWN0aXZlOm51bGwsc2xpY2VzOltdLHJpbmdzOltdLHBhcnRpY2xlczpbXSxmbG9hdGVyczpbXSxjbG91ZHM6QXJyYXkuZnJvbSh7bGVuZ3RoOjh9LCgpPT4oe2Z4Ok1hdGgucmFuZG9tKCksZnk6TWF0aC5yYW5kb20oKSouNTUsZGVwdGg6anQoLjI1LC45KSxzY2FsZTpqdCguNywxLjUpLHNwZWVkOmp0KDksMjYpfSkpLHN0YXJzOkFycmF5LmZyb20oe2xlbmd0aDo4MH0sKCk9Pih7Zng6TWF0aC5yYW5kb20oKSxmeTpNYXRoLnJhbmRvbSgpKi43LHR3Omp0KDEsNCksc2l6ZTpqdCguNiwxLjgpfSkpLGNhbTpsP01hdGgubWF4KDAsNypJdC0oa24tdmMpKTowLGNhbVRhcmdldDpsP01hdGgubWF4KDAsNypJdC0oa24tdmMpKTowLHNreUFsdDpsPzc6MCxzY29yZTowLGNvbWJvOjAsbWF4Q29tYm86MCxydW5IdWU6anQoMCwzNjApLHNoYWtlOjAsZmxhc2g6MCx3aW5kVDowLGR5aW5nOjAsZXZQbGFjZTowLGV2UGVyZmVjdDowLGV2U2xpY2U6MCxldkd1c3Q6MCxldkZhbGw6MH07cmV0dXJuIGx8fFgwKHUsZSksdX1mdW5jdGlvbiBDYyhlKXtyZXR1cm4gTWF0aC5tYXgoMCxlLnRvd2VyLmxlbmd0aC0xKX1mdW5jdGlvbiB1eChlLGwsYSl7aWYoIWUuYWN0aXZlfHxlLmR5aW5nPjApcmV0dXJuO2NvbnN0IHU9ZS5hY3RpdmUsZD1lLnRvd2VyW2UudG93ZXIubGVuZ3RoLTFdLG89ZS50b3dlci5sZW5ndGgscD0oZS5ydW5IdWUrbyo3KSUzNjAsaD1rbi1vKkl0LG09dS54K3UudyxnPWQueCtkLncsdj1NYXRoLm1heCh1LngsZC54KSx3PU1hdGgubWluKG0sZyksTT13LXY7aWYoTTw9MCl7ZS5zbGljZXMucHVzaCh7eDp1LngseTpoLHc6dS53LHZ4OnUuZGlyKmp0KDUwLDEyMCksdnk6LTYwLHJvdDowLHZyOmp0KC0yLjYsMi42KSxodWU6cCxsaWZlOjI0MDB9KSxlLmFjdGl2ZT1udWxsLGUuZHlpbmc9YSxlLmNvbWJvPTAsZS5ldkZhbGwrKyxlLnNoYWtlPTEzO3JldHVybn1jb25zdCBSPXUueCt1LncvMixXPWQueCtkLncvMixRPU1hdGguYWJzKFItVyk7bGV0IFMsSD0xMDtpZihRPD1sLnRvbGVyYW5jZSl7ZS5jb21ibysrLGUubWF4Q29tYm89TWF0aC5tYXgoZS5tYXhDb21ibyxlLmNvbWJvKTtjb25zdCBxPU1hdGgubWluKGQudytsLnJlZ3Jvd3RoLG1sKTtTPXt4Om94KGQueC0ocS1kLncpLzIsdXIsTm4tdXItcSksdzpxLHBlcmZlY3Q6ITB9LEgrPTIwKk1hdGgubWluKGUuY29tYm8sOCksZS5yaW5ncy5wdXNoKHt4OlMueCtTLncvMix5Omgscjo4LG1heFI6OTIsbGlmZTo0ODAsbWF4TGlmZTo0ODAsY29sb3I6IiNmZmUwOGEifSksZS5mbG9hdGVycy5wdXNoKHt4OlMueCtTLncvMix5OmgtMTAsdHh0OmUuY29tYm8+MT9gUEVSRkVDVCDDlyR7ZS5jb21ib31gOiJQRVJGRUNUISIsbGlmZTo5NTAsbWF4TGlmZTo5NTAsY29sb3I6IiNmZmUwOGEifSksZS5ldlBlcmZlY3QrKyxlLmZsYXNoPU1hdGgubWF4KGUuZmxhc2gsLjIpLGUwKGUsUy54K1Mudy8yLGgrNixbIiNmZmUwOGEiLCIjZmZmM2M0IiwiI2ZmZmZmZiJdLDEzLC45KX1lbHNlIGUuY29tYm89MCxTPXt4OnYsdzpNLHBlcmZlY3Q6ITF9LFI+Vz9lLnNsaWNlcy5wdXNoKHt4OncseTpoLHc6bS13LHZ4Omp0KDcwLDE2MCksdnk6LTUwLHJvdDowLHZyOmp0KDEsMyksaHVlOnAsbGlmZToyNDAwfSk6ZS5zbGljZXMucHVzaCh7eDp1LngseTpoLHc6di11Lngsdng6LWp0KDcwLDE2MCksdnk6LTUwLHJvdDowLHZyOi1qdCgxLDMpLGh1ZTpwLGxpZmU6MjQwMH0pLGUuZXZTbGljZSsrLGUuc2hha2U9TWF0aC5tYXgoZS5zaGFrZSwzKSxlMChlLFI+Vz93OnYsaCs4LFtgaHNsKCR7cH0sIDYwJSwgNjAlKWAsIiNmZmZmZmYiXSw2LC41NSk7ZS5zY29yZSs9SCxlLmZsb2F0ZXJzLnB1c2goe3g6Uy54K1Mudy8yLHk6aCsxMix0eHQ6YCske0h9YCxsaWZlOjYyMCxtYXhMaWZlOjYyMCxjb2xvcjoiI2ZmZmZmZiJ9KSxlLnRvd2VyLnB1c2goUyksZS5ldlBsYWNlKys7Y29uc3QgVj1DYyhlKTtWPjAmJlYlMjU9PT0wJiZlLmZsb2F0ZXJzLnB1c2goe3g6Tm4vMix5OmgtNDYsdHh0OmBGTE9PUiAke1Z9IWAsbGlmZToxNDAwLG1heExpZmU6MTQwMCxjb2xvcjoiIzdlZjBjOCJ9KSxlLmNhbVRhcmdldD1NYXRoLm1heCgwLChlLnRvd2VyLmxlbmd0aC0xKSpJdC0oa24tdmMpKSxYMChlLGwpfWZ1bmN0aW9uIGZ4KGUsbCxhLHUpe2NvbnN0IGQ9bC8xZTM7ZS50aW1lKz1sLGUuc2hha2U9TWF0aC5tYXgoMCxlLnNoYWtlLWwqLjA0NSksZS5mbGFzaD1NYXRoLm1heCgwLGUuZmxhc2gtbCouMDAxNiksZS53aW5kVD1NYXRoLm1heCgwLGUud2luZFQtbCksZS5jYW0rPShlLmNhbVRhcmdldC1lLmNhbSkqTWF0aC5taW4oMSxsKi4wMDgpLGUuc2t5QWx0Kz0oQ2MoZSktZS5za3lBbHQpKk1hdGgubWluKDEsbCouMDAzKTtmb3IobGV0IHA9ZS5zbGljZXMubGVuZ3RoLTE7cD49MDtwLS0pe2NvbnN0IGg9ZS5zbGljZXNbcF07aWYoaC5saWZlLT1sLGgubGlmZTw9MHx8aC55Pk5uKjIuNCl7ZS5zbGljZXMuc3BsaWNlKHAsMSk7Y29udGludWV9aC52eSs9MTUwMCpkLGgueCs9aC52eCpkLGgueSs9aC52eSpkLGgucm90Kz1oLnZyKmR9Zm9yKGxldCBwPWUucmluZ3MubGVuZ3RoLTE7cD49MDtwLS0pZS5yaW5nc1twXS5saWZlLT1sLGUucmluZ3NbcF0ubGlmZTw9MCYmZS5yaW5ncy5zcGxpY2UocCwxKTtmb3IobGV0IHA9ZS5wYXJ0aWNsZXMubGVuZ3RoLTE7cD49MDtwLS0pe2NvbnN0IGg9ZS5wYXJ0aWNsZXNbcF07aWYoaC5saWZlLT1sLGgubGlmZTw9MCl7Y29uc3QgbT1lLnBhcnRpY2xlcy5wb3AoKTttJiZwPGUucGFydGljbGVzLmxlbmd0aCYmKGUucGFydGljbGVzW3BdPW0pO2NvbnRpbnVlfWgudngtPWgudngqaC5kcmFnKmQsaC52eSs9aC5ncmF2KmQtaC52eSpoLmRyYWcqZCxoLngrPWgudngqZCxoLnkrPWgudnkqZH1mb3IobGV0IHA9ZS5mbG9hdGVycy5sZW5ndGgtMTtwPj0wO3AtLSllLmZsb2F0ZXJzW3BdLmxpZmUtPWwsZS5mbG9hdGVyc1twXS5saWZlPD0wJiZlLmZsb2F0ZXJzLnNwbGljZShwLDEpO2lmKCF1KXJldHVybjtjb25zdCBvPWUuYWN0aXZlO28mJmUuZHlpbmc9PT0wJiYoby5zbGlkZVQrPWwsby54Kz1vLmRpcipvLnNwZWVkKmQsby54PHVyPyhvLng9dXIsby5kaXI9MSk6by54K28udz5Obi11ciYmKG8ueD1Obi11ci1vLncsby5kaXI9LTEpLG8uZ3VzdEF0PjAmJm8uc2xpZGVUPj1vLmd1c3RBdCYmKG8uZ3VzdEF0PTAsby5kaXIqPS0xLGUud2luZFQ9MzgwLGUuZXZHdXN0KyspKX1jb25zdCBJYT1bWzAsIiMyZTFhNDciLCIjZjI5NTVlIl0sWzEyLCIjMWY2ZmIwIiwiIzlmZTBlYSJdLFsyNiwiIzExNzNjOCIsIiNhNWU4ZjIiXSxbNDAsIiM1YjJhNzIiLCIjZmY4YzVhIl0sWzU0LCIjMmExYzUyIiwiIzhhNWFhMCJdLFs2OCwiIzBhMTEyOCIsIiMyNzQwNmUiXSxbODQsIiMyZTFhNDciLCIjZjI5NTVlIl1dO2Z1bmN0aW9uIHQwKGUpe2NvbnN0IGw9cGFyc2VJbnQoZS5zbGljZSgxKSwxNik7cmV0dXJuW2w+PjE2JjI1NSxsPj44JjI1NSxsJjI1NV19ZnVuY3Rpb24gbjAoZSxsLGEpe2NvbnN0IHU9dDAoZSksZD10MChsKSxvPU1hdGgucm91bmQodVswXSsoZFswXS11WzBdKSphKSxwPU1hdGgucm91bmQodVsxXSsoZFsxXS11WzFdKSphKSxoPU1hdGgucm91bmQodVsyXSsoZFsyXS11WzJdKSphKTtyZXR1cm5gcmdiKCR7b30sJHtwfSwke2h9KWB9ZnVuY3Rpb24gZHgoZSl7Y29uc3QgbD0oZSU4NCs4NCklODQ7bGV0IGE9MDtmb3IoO2E8SWEubGVuZ3RoLTImJklhW2ErMV1bMF08PWw7KWErKztjb25zdFt1LGQsb109SWFbYV0sW3AsaCxtXT1JYVthKzFdLGc9KGwtdSkvKHAtdSksdj1NYXRoLmFicygoKGwtNzArNDIpJTg0Kzg0KSU4NC00Miksdz1NYXRoLm1heCgwLE1hdGgubWluKDEsMS12LzE2KSk7cmV0dXJue3RvcDpuMChkLGgsZyksYm90dG9tOm4wKG8sbSxnKSxuZjp3fX1mdW5jdGlvbiBzYyhlLGwsYSx1LGQsbyxwPTAsaD0hMSl7Y29uc3QgbT1aZCouNSpvLGc9WmQqLjI2Km8sdj11Km8sdz1JdCpvO2UuZmlsbFN0eWxlPWBoc2woJHtkfSwgNTglLCAke01hdGgubWluKDgwLDU0K3ApfSUpYCxlLmZpbGxSZWN0KGwsYSx2LHcpLGUuZmlsbFN0eWxlPWBoc2woJHtkfSwgNjIlLCAke01hdGgubWluKDg4LDY3K3ApfSUpYCxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKGwsYSksZS5saW5lVG8obCttLGEtZyksZS5saW5lVG8obCt2K20sYS1nKSxlLmxpbmVUbyhsK3YsYSksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxlLmZpbGxTdHlsZT1gaHNsKCR7ZH0sIDU1JSwgJHtNYXRoLm1pbig3MCwzOCtwKX0lKWAsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK3YsYSksZS5saW5lVG8obCt2K20sYS1nKSxlLmxpbmVUbyhsK3YrbSxhK3ctZyksZS5saW5lVG8obCt2LGErdyksZS5jbG9zZVBhdGgoKSxlLmZpbGwoKSxoJiYoZS5zdHJva2VTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjU1KSIsZS5saW5lV2lkdGg9TWF0aC5tYXgoMSwxLjQqbyksZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsLGEpLGUubGluZVRvKGwrdixhKSxlLnN0cm9rZSgpKX1mdW5jdGlvbiBweChlLGwsYSx1LGQpe2NvbnN0IG89YS9ObixwPWR4KGwuc2t5QWx0KSxoPWUuY3JlYXRlTGluZWFyR3JhZGllbnQoMCwwLDAsdSk7aWYoaC5hZGRDb2xvclN0b3AoMCxwLnRvcCksaC5hZGRDb2xvclN0b3AoMSxwLmJvdHRvbSksZS5maWxsU3R5bGU9aCxlLmZpbGxSZWN0KDAsMCxhLHUpLHAubmY+LjAzKWZvcihjb25zdCB3IG9mIGwuc3RhcnMpe2NvbnN0IE09cC5uZiooLjMrLjcqKC41Ky41Kk1hdGguc2luKGwudGltZSouMDAxKncudHcrdy5meCozMCkpKTtlLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjU1LDI1NSwkeyhNKi45KS50b0ZpeGVkKDMpfSlgO2NvbnN0IFI9dy5zaXplKm87ZS5maWxsUmVjdCh3LmZ4KmEsdy5meSp1LFIsUil9aWYocC5uZjwuOTIpe2NvbnN0IHc9MS1wLm5mLE09YSouNzksUj11Ki4xNixXPWUuY3JlYXRlUmFkaWFsR3JhZGllbnQoTSxSLDAsTSxSLDEwMCpvKTtXLmFkZENvbG9yU3RvcCgwLGByZ2JhKDI1NSwxOTYsMTIwLCR7KC41KncpLnRvRml4ZWQoMyl9KWApLFcuYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDE5NiwxMjAsMCkiKSxlLmZpbGxTdHlsZT1XLGUuZmlsbFJlY3QoTS0xMTAqbyxSLTExMCpvLDIyMCpvLDIyMCpvKSxlLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjI4LDE3MCwkeyguOSp3KS50b0ZpeGVkKDMpfSlgLGUuYmVnaW5QYXRoKCksZS5hcmMoTSxSLDI0Km8sMCxNYXRoLlBJKjIpLGUuZmlsbCgpfWlmKHAubmY+LjA1KXtjb25zdCB3PXAubmYsTT1hKi4yLFI9dSouMTQ7ZS5nbG9iYWxBbHBoYT13Ki44NSxlLmZpbGxTdHlsZT0iI2UyZWNmZiIsZS5iZWdpblBhdGgoKSxlLmFyYyhNLFIsMjEqbywwLE1hdGguUEkqMiksZS5maWxsKCksZS5maWxsU3R5bGU9cC50b3AsZS5iZWdpblBhdGgoKSxlLmFyYyhNKzgqbyxSLTUqbywxNypvLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLmdsb2JhbEFscGhhPTF9Y29uc3QgbT1NYXRoLm1heCgwLC4xNi1wLm5mKi4xMSk7aWYobT4uMDEpe2UuZmlsbFN0eWxlPWByZ2JhKDI1NSwyNTUsMjU1LCR7bS50b0ZpeGVkKDMpfSlgO2Zvcihjb25zdCB3IG9mIGwuY2xvdWRzKXtjb25zdCBNPWErMTYwLFI9KHcuZngqTStsLnRpbWUqdy5zcGVlZCouMDEyKSVNLTgwLFc9dy5meSp1Ki41NStsLmNhbSpvKncuZGVwdGgqLjMsUT13LnNjYWxlKm87ZS5iZWdpblBhdGgoKSxlLmVsbGlwc2UoUixXLDU0KlEsMTUqUSwwLDAsTWF0aC5QSSoyKSxlLmVsbGlwc2UoUiszMipRLFcrNCpRLDM4KlEsMTIqUSwwLDAsTWF0aC5QSSoyKSxlLmVsbGlwc2UoUi0zNipRLFcrNSpRLDM0KlEsMTEqUSwwLDAsTWF0aC5QSSoyKSxlLmZpbGwoKX19ZS5zYXZlKCksbC5zaGFrZT4uMiYmZS50cmFuc2xhdGUoKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UqbywoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSpvKSxlLnRyYW5zbGF0ZSgwLGwuY2FtKm8pO2NvbnN0IGc9KGtuK0l0KSpvO2lmKGc8dSs0MCl7Y29uc3Qgdz1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsZywwLGcrMjQwKm8pO3cuYWRkQ29sb3JTdG9wKDAsIiMwYzE2MTAiKSx3LmFkZENvbG9yU3RvcCgxLCJyZ2JhKDEyLDIyLDE2LDApIiksZS5maWxsU3R5bGU9IiMwYzE2MTAiLGUuZmlsbFJlY3QoLTMwLGcsYSs2MCxNYXRoLm1heCgwLHUtbC5jYW0qby1nKzYwKSksZS5maWxsU3R5bGU9dyxlLmZpbGxSZWN0KC0zMCxnLGErNjAsMjQwKm8pLGUuZmlsbFN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDkpIixlLmZpbGxSZWN0KC0zMCxnLGErNjAsTWF0aC5tYXgoMSwxLjIqbykpfWNvbnN0IHY9bC50b3dlci5sZW5ndGg7Zm9yKGxldCB3PTA7dzx2O3crKyl7Y29uc3QgTT1sLnRvd2VyW3ddLFI9KGtuLXcqSXQpKm87aWYoUitsLmNhbSpvPnUrNjB8fFI8LTgwKWNvbnRpbnVlO2NvbnN0IFc9KGwucnVuSHVlK3cqNyklMzYwO3NjKGUsTS54Km8sUixNLncsVyxvLE0ucGVyZmVjdD83OjAsTS5wZXJmZWN0KX1pZihsLmFjdGl2ZSYmdj4wJiYoZD09PSJydW5uaW5nInx8ZD09PSJyZWFkeSIpKXtjb25zdCB3PWwudG93ZXJbdi0xXSxNPShrbi12Kkl0KSpvLFI9KGtuLSh2LTEpKkl0KSpvO2Uuc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLGUubGluZVdpZHRoPU1hdGgubWF4KDEsbyksZS5zZXRMaW5lRGFzaChbNSpvLDcqb10pO2Zvcihjb25zdCBXIG9mW3cueCx3Lngrdy53XSllLmJlZ2luUGF0aCgpLGUubW92ZVRvKFcqbyxNLTYqbyksZS5saW5lVG8oVypvLFIpLGUuc3Ryb2tlKCk7ZS5zZXRMaW5lRGFzaChbXSl9aWYobC5hY3RpdmUpe2NvbnN0IHc9bC5hY3RpdmUsTT0oa24tdipJdCkqbyxSPShsLnJ1bkh1ZSt2KjcpJTM2MDtzYyhlLHcueCpvLE0sdy53LFIsbyw5KSxlLnN0cm9rZVN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNDIpIixlLmxpbmVXaWR0aD1NYXRoLm1heCgxLDEuMipvKSxlLnN0cm9rZVJlY3Qody54Km8sTSx3LncqbyxJdCpvKX1mb3IoY29uc3QgdyBvZiBsLnNsaWNlcyl7aWYody53PD0uNSljb250aW51ZTtjb25zdCBNPSh3Lngrdy53LzIpKm8sUj0ody55K0l0LzIpKm87ZS5zYXZlKCksZS50cmFuc2xhdGUoTSxSKSxlLnJvdGF0ZSh3LnJvdCksZS5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLE1hdGgubWluKDEsdy5saWZlLzUwMCkpLHNjKGUsLXcudy8yKm8sLUl0LzIqbyx3Lncsdy5odWUsbywtNiksZS5yZXN0b3JlKCksZS5nbG9iYWxBbHBoYT0xfWZvcihjb25zdCB3IG9mIGwucmluZ3Mpe2NvbnN0IE09MS13LmxpZmUvdy5tYXhMaWZlLFI9KHcucisody5tYXhSLXcucikqTSkqbztlLnN0cm9rZVN0eWxlPXcuY29sb3IsZS5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLHcubGlmZS93Lm1heExpZmUpKi45LGUubGluZVdpZHRoPTMqbyxlLmJlZ2luUGF0aCgpLGUuYXJjKHcueCpvLHcueSpvLFIsMCxNYXRoLlBJKjIpLGUuc3Ryb2tlKCksZS5nbG9iYWxBbHBoYT0xfWlmKGwud2luZFQ+MCYmbC5hY3RpdmUpe2NvbnN0IHc9bC53aW5kVC8zODAqLjU1LE09KGtuLXYqSXQrSXQvMikqbztlLnN0cm9rZVN0eWxlPWByZ2JhKDE5MSwyNDcsMjU1LCR7dy50b0ZpeGVkKDMpfSlgLGUubGluZVdpZHRoPU1hdGgubWF4KDEsMS41Km8pO2ZvcihsZXQgUj0wO1I8NTtSKyspe2NvbnN0IFc9TSsoUi0yKSo5Km8sUT0obC50aW1lKi41NStSKjE3MyklKGErMjIwKS0xMTAsUz0oNDIrUiUzKjM0KSpvO2UuYmVnaW5QYXRoKCksZS5tb3ZlVG8oUSxXKSxlLmxpbmVUbyhRK1MsVyksZS5zdHJva2UoKX19Zm9yKGNvbnN0IHcgb2YgbC5wYXJ0aWNsZXMpe2NvbnN0IE09TWF0aC5tYXgoMCx3LmxpZmUvdy5tYXhMaWZlKTtlLmdsb2JhbEFscGhhPU0sZS5maWxsU3R5bGU9dy5jb2xvcjtjb25zdCBSPXcuc2l6ZSpvO2UuZmlsbFJlY3Qody54Km8tUi8yLHcueSpvLVIvMixSLFIpfWUuZ2xvYmFsQWxwaGE9MSxlLnRleHRBbGlnbj0iY2VudGVyIixlLnRleHRCYXNlbGluZT0ibWlkZGxlIjtmb3IoY29uc3QgdyBvZiBsLmZsb2F0ZXJzKXtjb25zdCBNPTEtdy5saWZlL3cubWF4TGlmZTtlLmdsb2JhbEFscGhhPU1hdGgubWF4KDAsMS1NKk0pLGUuZm9udD1gJHtNYXRoLm1heCg4LE1hdGgucm91bmQoMTEqbykpfXB4ICJQcmVzcyBTdGFydCAyUCIsIG1vbm9zcGFjZWA7Y29uc3QgUj13Lnkqby1NKjM0Km87ZS5saW5lV2lkdGg9NCpvLGUuc3Ryb2tlU3R5bGU9InJnYmEoNiwxMCw4LDAuNykiLGUuc3Ryb2tlVGV4dCh3LnR4dCx3LngqbyxSKSxlLmZpbGxTdHlsZT13LmNvbG9yLGUuZmlsbFRleHQody50eHQsdy54Km8sUil9ZS5nbG9iYWxBbHBoYT0xLGUucmVzdG9yZSgpLGwuZmxhc2g+LjAxJiYoZS5maWxsU3R5bGU9YHJnYmEoMjU1LDI1NSwyNTUsJHsobC5mbGFzaCouNykudG9GaXhlZCgzKX0pYCxlLmZpbGxSZWN0KDAsMCxhLHUpKX1jb25zdCBRMD0ic2t5d2FyZC5iZXN0cy52MSIsSjA9InNreXdhcmQuZGlmZi52MSI7ZnVuY3Rpb24gaHgoKXtjb25zdCBlPXticmVlemU6MCxnYWxlOjAsdGVtcGVzdDowfTt0cnl7Y29uc3QgbD1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShRMCk7aWYoIWwpcmV0dXJuIGU7Y29uc3QgYT1KU09OLnBhcnNlKGwpO3JldHVybnticmVlemU6TnVtYmVyKGEuYnJlZXplKXx8MCxnYWxlOk51bWJlcihhLmdhbGUpfHwwLHRlbXBlc3Q6TnVtYmVyKGEudGVtcGVzdCl8fDB9fWNhdGNoe3JldHVybiBlfX1mdW5jdGlvbiByMCgpe3RyeXtjb25zdCBlPWxvY2FsU3RvcmFnZS5nZXRJdGVtKEowKTtpZihlPT09ImJyZWV6ZSJ8fGU9PT0iZ2FsZSJ8fGU9PT0idGVtcGVzdCIpcmV0dXJuIGV9Y2F0Y2h7fXJldHVybiJnYWxlIn1mdW5jdGlvbiBteCgpe2NvbnN0IGU9eC51c2VSZWYobnVsbCksbD14LnVzZVJlZihudWxsKSxhPXgudXNlUmVmKHJjKHVsW3IwKCldLCEwKSksdT14LnVzZVJlZih7dzowLGg6MH0pLGQ9eC51c2VSZWYoMCksbz14LnVzZVJlZih7cGxhY2U6MCxwZXJmZWN0OjAsc2xpY2U6MCxndXN0OjAsZmFsbDowfSkscD14LnVzZVJlZigwKSxbaCxtXT14LnVzZVN0YXRlKCJpZGxlIiksZz14LnVzZVJlZigiaWRsZSIpLFt2LHddPXgudXNlU3RhdGUoMCksTT14LnVzZVJlZigwKSxbUixXXT14LnVzZVN0YXRlKDApLFtRLFNdPXgudXNlU3RhdGUoMCksW0gsVl09eC51c2VTdGF0ZSgwKSxbcSxvZV09eC51c2VTdGF0ZSgwKSxbWix5ZV09eC51c2VTdGF0ZSghMSksW1NlLGtlXT14LnVzZVN0YXRlKHIwKSxQZT14LnVzZVJlZihTZSksW0VlLE9lXT14LnVzZVN0YXRlKGh4KSxCZT14LnVzZVJlZihFZSksW3plLEZlXT14LnVzZVN0YXRlKGhuKSxMZT14LnVzZVJlZih6ZSksamU9eC51c2VDYWxsYmFjayhHPT57Zy5jdXJyZW50PUcsbShHKX0sW10pLHdlPXgudXNlQ2FsbGJhY2soKCk9PntkLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGQuY3VycmVudCksZC5jdXJyZW50PTApfSxbXSksVT14LnVzZUNhbGxiYWNrKEc9Pnt3ZSgpLGplKCJyZWFkeSIpLGQuY3VycmVudD13aW5kb3cuc2V0VGltZW91dCgoKT0+e2QuY3VycmVudD0wLGcuY3VycmVudD09PSJyZWFkeSImJmplKCJydW5uaW5nIil9LEcpfSxbd2UsamVdKSx0ZT14LnVzZUNhbGxiYWNrKCgpPT57WGUoKSx3ZSgpLGEuY3VycmVudD1yYyh1bFtQZS5jdXJyZW50XSwhMSksby5jdXJyZW50PXtwbGFjZTowLHBlcmZlY3Q6MCxzbGljZTowLGd1c3Q6MCxmYWxsOjB9LE0uY3VycmVudD0wLHAuY3VycmVudD0wLHcoMCksVygwKSxTKDApLFYoMCkseWUoITEpLGxzLnN0YXJ0KCksVSg5MDApfSxbd2UsVV0pLEY9eC51c2VDYWxsYmFjaygoKT0+e2cuY3VycmVudD09PSJydW5uaW5nIiYmdXgoYS5jdXJyZW50LHVsW1BlLmN1cnJlbnRdLHBlcmZvcm1hbmNlLm5vdygpKX0sW10pLGs9eC51c2VDYWxsYmFjaygoKT0+e2cuY3VycmVudD09PSJydW5uaW5nIiYmKHdlKCksSGUucGF1c2UoKSxqZSgicGF1c2VkIikpfSxbd2UsamVdKSxMPXgudXNlQ2FsbGJhY2soKCk9PntnLmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksSGUucmVzdW1lKCksVSg1MDApKX0sW1VdKSx1ZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgRz1nLmN1cnJlbnQ7Rz09PSJpZGxlInx8Rz09PSJvdmVyIj90ZSgpOkc9PT0icnVubmluZyI/RigpOkc9PT0icGF1c2VkIiYmTCgpfSxbdGUsRixMXSksJD14LnVzZUNhbGxiYWNrKEc9Pntjb25zdCB4ZT1nLmN1cnJlbnQ7aWYoISh4ZT09PSJydW5uaW5nInx8eGU9PT0icmVhZHkifHx4ZT09PSJwYXVzZWQiKSl7UGUuY3VycmVudD1HLGtlKEcpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShKMCxHKX1jYXRjaHt9YS5jdXJyZW50PXJjKHVsW0ddLCEwKSxNLmN1cnJlbnQ9MCx3KDApLFcoMCksUygwKSxWKDApLHllKCExKX19LFtdKSxKPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBHPSFMZS5jdXJyZW50O0xlLmN1cnJlbnQ9RyxGZShHKSx1dChHKSxtbihHKX0sW10pLGhlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBHPWEuY3VycmVudCx4ZT1QZS5jdXJyZW50LGFlPUcuc2NvcmU7aWYoYWU+QmUuY3VycmVudFt4ZV0pe2NvbnN0IGVlPXsuLi5CZS5jdXJyZW50LFt4ZV06YWV9O0JlLmN1cnJlbnQ9ZWUsT2UoZWUpLHllKCEwKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oUTAsSlNPTi5zdHJpbmdpZnkoZWUpKX1jYXRjaHt9fWplKCJvdmVyIil9LFtqZV0pLHZlPXgudXNlQ2FsbGJhY2soRz0+e0cucHJldmVudERlZmF1bHQoKSxYZSgpO2NvbnN0IHhlPWcuY3VycmVudDt4ZT09PSJpZGxlInx8eGU9PT0ib3ZlciI/dGUoKTp4ZT09PSJydW5uaW5nIiYmRigpfSxbdGUsRl0pO3JldHVybiB4LnVzZUVmZmVjdCgoKT0+e3V0KExlLmN1cnJlbnQpO2xldCBHPTA7Y29uc3QgeGU9WT0+e2NvbnN0IF89YS5jdXJyZW50LEk9Xy5sYXN0P01hdGgubWluKDYwLFktXy5sYXN0KToxNjtfLmxhc3Q9WTtjb25zdCBkZT1nLmN1cnJlbnQ7ZngoXyxJLHVsW1BlLmN1cnJlbnRdLGRlPT09InJ1bm5pbmciKSxfLnNjb3JlIT09TS5jdXJyZW50JiYoTS5jdXJyZW50PV8uc2NvcmUsdyhfLnNjb3JlKSxvZShYPT5YKzEpKSxXKENjKF8pKSxfLmNvbWJvIT09cC5jdXJyZW50JiYocC5jdXJyZW50PV8uY29tYm8sUyhfLmNvbWJvKSksVihfLm1heENvbWJvKTtjb25zdCBPPW8uY3VycmVudDtfLmV2UGxhY2UhPT1PLnBsYWNlJiYoTy5wbGFjZT1fLmV2UGxhY2UsbHMucGxhY2UoKSksXy5ldlBlcmZlY3QhPT1PLnBlcmZlY3QmJihPLnBlcmZlY3Q9Xy5ldlBlcmZlY3QsbHMucGVyZmVjdChfLmNvbWJvKSksXy5ldlNsaWNlIT09Ty5zbGljZSYmKE8uc2xpY2U9Xy5ldlNsaWNlLGxzLnNsaWNlKCkpLF8uZXZHdXN0IT09Ty5ndXN0JiYoTy5ndXN0PV8uZXZHdXN0LGxzLmd1c3QoKSksXy5ldkZhbGwhPT1PLmZhbGwmJihPLmZhbGw9Xy5ldkZhbGwsbHMuZmFsbCgpKSxkZT09PSJydW5uaW5nIiYmXy5keWluZz4wJiZZLV8uZHlpbmc+OTUwJiZoZSgpO2NvbnN0IGo9ZS5jdXJyZW50LGdlPXUuY3VycmVudDtpZihqJiZnZS53PjApe2NvbnN0IFg9ai5nZXRDb250ZXh0KCIyZCIpO1gmJnB4KFgsXyxnZS53LGdlLmgsZGUpfUc9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHhlKX07Rz1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoeGUpO2NvbnN0IGFlPWwuY3VycmVudCxlZT1lLmN1cnJlbnQ7bGV0IHo9bnVsbDtpZihhZSYmZWUpe2NvbnN0IFk9KCk9Pntjb25zdCBfPWFlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLEk9TWF0aC5tYXgoMCxNYXRoLmZsb29yKE1hdGgubWluKF8ud2lkdGgsXy5oZWlnaHQpKSksZGU9TWF0aC5taW4oMix3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb3x8MSk7ZWUud2lkdGg9TWF0aC5yb3VuZChJKmRlKSxlZS5oZWlnaHQ9TWF0aC5yb3VuZChJKmRlKSxlZS5zdHlsZS53aWR0aD1gJHtJfXB4YCxlZS5zdHlsZS5oZWlnaHQ9YCR7SX1weGAsdS5jdXJyZW50PXt3OkksaDpJfTtjb25zdCBPPWVlLmdldENvbnRleHQoIjJkIik7TyYmTy5zZXRUcmFuc2Zvcm0oZGUsMCwwLGRlLDAsMCl9O1koKSx6PW5ldyBSZXNpemVPYnNlcnZlcihZKSx6Lm9ic2VydmUoYWUpfWNvbnN0IGZlPVk9Pntjb25zdCBfPVkua2V5LnRvTG93ZXJDYXNlKCk7aWYoXz09PSIgInx8Xz09PSJlbnRlciIpe1kucHJldmVudERlZmF1bHQoKSxZLnJlcGVhdHx8dWUoKTtyZXR1cm59aWYoXz09PSJhcnJvd3VwInx8Xz09PSJ3Inx8Xz09PSJhcnJvd2Rvd24ifHxfPT09InMiKXtZLnByZXZlbnREZWZhdWx0KCksWS5yZXBlYXR8fHVlKCk7cmV0dXJufWlmKF89PT0iciIpe3RlKCk7cmV0dXJufWlmKF89PT0icCJ8fF89PT0iZXNjYXBlIil7Y29uc3QgST1nLmN1cnJlbnQ7ST09PSJydW5uaW5nIj9rKCk6ST09PSJwYXVzZWQiJiZMKCk7cmV0dXJufWlmKF89PT0ibSIpe0ooKTtyZXR1cm59Xz09PSIxIiYmJCgiYnJlZXplIiksXz09PSIyIiYmJCgiZ2FsZSIpLF89PT0iMyImJiQoInRlbXBlc3QiKX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLGZlKTtjb25zdCBQPSgpPT57ZG9jdW1lbnQuaGlkZGVuJiZnLmN1cnJlbnQ9PT0icnVubmluZyImJmsoKX0saWU9KCk9PntnLmN1cnJlbnQ9PT0icnVubmluZyImJmsoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLFApLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixpZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShHKSx3ZSgpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXlkb3duIixmZSksZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsUCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImJsdXIiLGllKSx6JiZ6LmRpc2Nvbm5lY3QoKX19LFskLHdlLGhlLGssdWUsTCx0ZSxKXSkse2NhbnZhc1JlZjplLHdyYXBSZWY6bCxwaGFzZTpoLHNjb3JlOnYsZmxvb3JzVXA6Uixjb21ibzpRLG1heENvbWJvOkgscG9wS2V5OnEsaXNOZXdCZXN0OlosZGlmZmljdWx0eTpTZSxiZXN0czpFZSxtdXRlZDp6ZSxhY3Rpb25zOntzdGFydDp0ZSxwcmltYXJ5OnVlLGRvRHJvcDpGLHBhdXNlR2FtZTprLHJlc3VtZUdhbWU6TCxjaGFuZ2VEaWZmaWN1bHR5OiQsdG9nZ2xlTXV0ZTpKLG9uQ2FudmFzRG93bjp2ZX19fWNvbnN0IHMwPVt7aWQ6ImJyZWV6ZSIsbGFiZWw6IkJyZWV6ZSIsdGFnOiJHZW50bGUgZHJpZnQsIGZvcmdpdmluZyBlZGdlIixkb3RzOjF9LHtpZDoiZ2FsZSIsbGFiZWw6IkdhbGUiLHRhZzoiQnJpc2sgc2xpZGVzLCByYXJlIGd1c3RzIixkb3RzOjJ9LHtpZDoidGVtcGVzdCIsbGFiZWw6IlRlbXBlc3QiLHRhZzoiRmFzdCBibG9ja3MsIHN1ZGRlbiBndXN0cyIsZG90czozfV07ZnVuY3Rpb24gbGMoe2NsYXNzTmFtZTplPSJoLTQgdy00In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbci5qc3goInBhdGgiLHtkOiJNMTIgM3YxMG0wIDBsLTQtNG00IDRsNC00IixzdHJva2U6ImN1cnJlbnRDb2xvciIsc3Ryb2tlV2lkdGg6IjIuNCIsZmlsbDoibm9uZSIsc3Ryb2tlTGluZWNhcDoicm91bmQiLHN0cm9rZUxpbmVqb2luOiJyb3VuZCJ9KSxyLmpzeCgicGF0aCIse2Q6Ik01IDE3aDE0djNINXoiLHJ4OiIxIn0pXX0pfWZ1bmN0aW9uIGFjKHtsYWJlbDplLHZhbHVlOmwsYWNjZW50OmE9ITEscG9wOnU9MCxkaW06ZD0hMX0pe3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmV9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1zbSBsZWFkaW5nLXRpZ2h0IHNtOnRleHQtYmFzZSAke2E/ImFuaW1hdGUtcG9wIHRleHQtYW1iZXJnbG93LTQwMCI6ZD8idGV4dC1tb3NzLTQwMCI6InRleHQtbW9zcy0xMDAifWAsY2hpbGRyZW46bH0sdSldfSl9ZnVuY3Rpb24gZnMoe2tleXNMaXN0OmUsYWN0aW9uOmx9KXtyZXR1cm4gci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgZ2FwLTEiLGNoaWxkcmVuOmV9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46bH0pXX0pfWZ1bmN0aW9uIGd4KCl7Y29uc3QgZT1teCgpLHthY3Rpb25zOmwscGhhc2U6YX09ZSx1PWE9PT0icnVubmluZyI7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLXJpc2UiLGNoaWxkcmVuOltyLmpzeHMoImhlYWRlciIse2NsYXNzTmFtZToibWItNCBmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQganVzdGlmeS1iZXR3ZWVuIGdhcC0zIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBnYXAtMiBzbTpnYXAtMyIsY2hpbGRyZW46W3IuanN4KGFjLHtsYWJlbDoiU2NvcmUiLHZhbHVlOmUuc2NvcmUsYWNjZW50OiEwLHBvcDplLnBvcEtleX0pLHIuanN4KGFjLHtsYWJlbDoiRmxvb3IiLHZhbHVlOmUuZmxvb3JzVXB9KSxyLmpzeChhYyx7bGFiZWw6IkJlc3QiLHZhbHVlOmUuYmVzdHNbZS5kaWZmaWN1bHR5XX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkNvbWJvIn0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7ZS5jb21ibz4xPyJhbmltYXRlLXB1bHNlLXNvZnQgdGV4dC1hbWJlcmdsb3ctMzAwIFt0ZXh0LXNoYWRvdzowXzBfMTRweF9yZ2JhKDI1NSwyMjQsMTM4LDAuNSldIjplLmNvbWJvPT09MT8idGV4dC1hbWJlcmdsb3ctNDAwIjoidGV4dC1tb3NzLTQwMCJ9YCxjaGlsZHJlbjplLmNvbWJvPjA/YMOXJHtlLmNvbWJvfWA6IuKAlCJ9KV19KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6dT8iUGF1c2UiOiJSZXN1bWUiLHRpdGxlOnU/IlBhdXNlIChQKSI6IlJlc3VtZSAoUCkiLG9uQ2xpY2s6dT9sLnBhdXNlR2FtZTpsLnJlc3VtZUdhbWUsZGlzYWJsZWQ6IXUmJmEhPT0icGF1c2VkIixjaGlsZHJlbjp1P3IuanN4KGd0LHt9KTpyLmpzeChfZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6IlJlc3RhcnQiLHRpdGxlOiJSZXN0YXJ0IChSKSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4KFVlLHt9KX0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjplLm11dGVkPyJVbm11dGUiOiJNdXRlIix0aXRsZToiU291bmQgKE0pIixvbkNsaWNrOmwudG9nZ2xlTXV0ZSxjaGlsZHJlbjplLm11dGVkP3IuanN4KGZuLHt9KTpyLmpzeCh1bix7fSl9KV19KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZ3JpZCBnYXAtNCBsZzpncmlkLWNvbHMtW21pbm1heCgwLDFmcilfMzAwcHhdIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJlbGF0aXZlIixjaGlsZHJlbjpbci5qc3goImRpdiIse3JlZjplLndyYXBSZWYsY2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46ci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImJvYXJkLWZyYW1lIHNjYW5saW5lcyByZWxhdGl2ZSBteC1hdXRvIGFzcGVjdC1zcXVhcmUgdy1mdWxsIG1heC13LVttaW4oOTR2dyw4MjBweCxjYWxjKDEwMGR2aC0xOTBweCkpXSB0b3VjaC1ub25lIHNlbGVjdC1ub25lIG92ZXJmbG93LWhpZGRlbiBsZzptYXgtdy1bbWluKDEwMCUsY2FsYygxMDBkdmgtMjgwcHgpKV0iLGNoaWxkcmVuOltyLmpzeCgiY2FudmFzIix7cmVmOmUuY2FudmFzUmVmLGNsYXNzTmFtZToiYWJzb2x1dGUgaW5zZXQtMCBtLWF1dG8gY3Vyc29yLXBvaW50ZXIiLG9uUG9pbnRlckRvd246bC5vbkNhbnZhc0Rvd24sb25Db250ZXh0TWVudTpkPT5kLnByZXZlbnREZWZhdWx0KCl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTIgei0yMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46WyJsZWZ0LTAgdG9wLTAgYm9yZGVyLWwtMiBib3JkZXItdC0yIiwicmlnaHQtMCB0b3AtMCBib3JkZXItci0yIGJvcmRlci10LTIiLCJsZWZ0LTAgYm90dG9tLTAgYm9yZGVyLWwtMiBib3JkZXItYi0yIiwicmlnaHQtMCBib3R0b20tMCBib3JkZXItci0yIGJvcmRlci1iLTIiXS5tYXAoZD0+ci5qc3goInNwYW4iLHtjbGFzc05hbWU6YGFic29sdXRlIGgtNCB3LTQgYm9yZGVyLVsjN2VmMGM4XS80MCAke2R9YH0sZCkpfSksYT09PSJpZGxlIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzEwMTQyNV0vNzggcC02IHRleHQtY2VudGVyIGJhY2tkcm9wLWJsdXItWzJweF0iLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgiaDEiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLW1pbnQgZm9udC1kaXNwbGF5IHRleHQtM3hsIHNtOnRleHQtNHhsIixjaGlsZHJlbjoiU0tZV0FSRCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IG10LTMgdGV4dC1bOXB4XSB0cmFja2luZy1bMC4zZW1dIHRleHQtWyM5ZmQ4YzJdIixjaGlsZHJlbjoiU1RBQ0sgwrcgU0xJQ0UgwrcgQVNDRU5EIn0pXX0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KGxjLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBTdGFydCBDbGltYmluZyJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIE9SIFRBUCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgZHJvcCBibG9jayJdfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiBwYXVzZSJdfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlIifSksIiByZXN0YXJ0Il19KV19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pXX0pLGE9PT0icGF1c2VkIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzEwMTQyNV0vNzggcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLW1pbnQgZm9udC1kaXNwbGF5IHRleHQteGwiLGNoaWxkcmVuOiJCUkVBVEhFUiJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5yZXN1bWVHYW1lLGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KX0pLHIuanN4KEFlLHtvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN0YXJ0Il19KX0pXX0pLHIuanN4cygicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiUCJ9KSwiICIsci5qc3goInNwYW4iLHtjbGFzc05hbWU6Im14LTEiLGNoaWxkcmVuOiJvciJ9KSwiICIsci5qc3goQSx7Y2hpbGRyZW46IkVzYyJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToibWwtMSIsY2hpbGRyZW46InJlc3VtZXMifSldfSldfSksYT09PSJvdmVyIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNCBiZy1bIzEwMTQyNV0vODUgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LXhsIHRleHQtYXBwbGUtNDAwIFt0ZXh0LXNoYWRvdzowXzBfMjRweF9yZ2JhKDI1NSwxMDcsMTA3LDAuNSldIHNtOnRleHQtMnhsIixjaGlsZHJlbjoiVE9XRVIgRkVMTCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46ZS5zY29yZX0pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjOWZkOGMyXSIsY2hpbGRyZW46WyJGTE9PUiAiLGUuZmxvb3JzVXAsIiDCtyBCRVNUIENPTUJPIMOXIixNYXRoLm1heCgxLGUubWF4Q29tYm8pXX0pLGUuaXNOZXdCZXN0JiZyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIENsaW1iIEFnYWluIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJtdC00IGZsZXgganVzdGlmeS1jZW50ZXIiLGNoaWxkcmVuOnIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucHJpbWFyeSxjbGFzc05hbWU6Im1pbi13LVsyMjBweF0iLGNoaWxkcmVuOnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiIsY2hpbGRyZW46YT09PSJydW5uaW5nIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KGxjLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBEcm9wIEJsb2NrIl19KTphPT09InBhdXNlZCI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KTphPT09Im92ZXIiP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIENsaW1iIEFnYWluIl19KTpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KGxjLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBTdGFydCBDbGltYmluZyJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiQmxvY2sgU2NpZW5jZSIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4cygibGkiLHtjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtYm9sZCB0ZXh0LWFtYmVyZ2xvdy0zMDAiLGNoaWxkcmVuOiJQZXJmZWN0IGxhbmRpbmdzIn0pLCIgc25hcCB0aGUgYmxvY2sgZmx1c2gsIGtlZXAgaXRzIHdpZHRoIOKAlCBldmVuIHJlZ3JvdyBpdCDigJQgYW5kIGJ1aWxkIGEgY29tYm8gd29ydGggdXAgdG8gKzE3MCBwZXIgZHJvcC4iXX0pLHIuanN4cygibGkiLHtjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtYm9sZCB0ZXh0LWFwcGxlLTQwMCIsY2hpbGRyZW46Ik9mZi1jZW50ZXIgZHJvcHMifSksIiBzaGVhciB0aGUgb3ZlcmhhbmcgYXdheS4gVGhlIHRvd2VyIG5hcnJvd3Mgd2l0aCBldmVyeSBtaXNzLXN0ZXAuIl19KSxyLmpzeHMoImxpIix7Y2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmb250LWJvbGQgdGV4dC1bIzdlZjBjOF0iLGNoaWxkcmVuOiJNaXNzIGVudGlyZWx5In0pLCIgYW5kIHRoZSBibG9jayB0dW1ibGVzIG9mZiDigJQgdGhlIHJ1biBpcyBvdmVyLiJdfSksci5qc3hzKCJsaSIse2NoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZm9udC1ib2xkIHRleHQtWyNiZmY3ZmZdIixjaGlsZHJlbjoiR3VzdHMifSksIiAoR2FsZSBhbmQgdXApIGZsaXAgdGhlIGJsb2NrIG1pZC1zbGlkZSB3aXRob3V0IHdhcm5pbmcuIFdhdGNoIHRoZSB3aW5kIGxpbmVzLiJdfSldfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiVGhlIHNreSB0dXJucyBhIGZ1bGwgZGF5LW5pZ2h0IGN5Y2xlIGV2ZXJ5IDg0IGZsb29ycy4gQmxvY2tzIGN5Y2xlIGh1ZSBhcyB5b3UgY2xpbWIg4oCUIG5vIHR3byB0b3dlcnMgbG9vayBhbGlrZS4ifSldfSksci5qc3goZG4se3RpdGxlOiJXaW5kIFJlcG9ydCIsb3B0aW9uczpzMCx2YWx1ZTplLmRpZmZpY3VsdHksb25DaGFuZ2U6bC5jaGFuZ2VEaWZmaWN1bHR5LGRpc2FibGVkOmE9PT0icnVubmluZyJ8fGE9PT0icmVhZHkifHxhPT09InBhdXNlZCJ9KSxyLmpzeChwbix7YmVzdHM6ZS5iZXN0cyxvcHRpb25zOnMwLGFjdGl2ZTplLmRpZmZpY3VsdHl9KSxyLmpzeHMocnQse3RpdGxlOiJDb250cm9scyIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4KGZzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJTcGFjZSJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiRW50ZXIifSldfSksYWN0aW9uOiJEcm9wIGJsb2NrIn0pLHIuanN4KGZzLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiQ2xpY2sgLyBUYXAifSksYWN0aW9uOiJEcm9wIGJsb2NrIn0pLHIuanN4KGZzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxyLmpzeChmcyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHIuanN4KGZzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiIxIn0pLHIuanN4KEEse2NoaWxkcmVuOiIyIn0pLHIuanN4KEEse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiV2luZCBsZXZlbCJ9KSxyLmpzeChmcyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJUb3VjaDogdGFwIGFueXdoZXJlIG9uIHRoZSBib2FyZCDigJQgb3IgdGhlIGJpZyBEUk9QIGJ1dHRvbiDigJQgdG8gcmVsZWFzZSB0aGUgYmxvY2suIn0pXX0pXX0pXX0pXX0pfWNvbnN0IFJyPXtzdHJlZXQ6e2xhYmVsOiJTVFJFRVQiLHRhZzoibm8gd2luZCwgc3RlYWR5IHJpbSIsZG90czoxLHRpbWU6NmU0LHdpbmRNYXg6MCxtb3ZlQ2hhbmNlOjAsbW92ZUFtcDowLG1vdmVTcGVlZDowLHJpbUhhbGY6Mjcsc3Bhd25NaW5YOjgwLHNwYXduTWF4WDozMjB9LHBybzp7bGFiZWw6IlBSTyIsdGFnOiJicmVlemVzLCByaW0gZHJpZnRzIixkb3RzOjIsdGltZTo1ZTQsd2luZE1heDoyLjQsbW92ZUNoYW5jZTouNSxtb3ZlQW1wOjI2LG1vdmVTcGVlZDoxLjEscmltSGFsZjoyNCxzcGF3bk1pblg6NzAsc3Bhd25NYXhYOjMwMH0sbGVnZW5kOntsYWJlbDoiTEVHRU5EIix0YWc6ImdhbGVzIGFuZCBhIHJvYW1pbmcgcmltIixkb3RzOjMsdGltZTo0NWUzLHdpbmRNYXg6NC40LG1vdmVDaGFuY2U6MSxtb3ZlQW1wOjQwLG1vdmVTcGVlZDoxLjYscmltSGFsZjoyMSxzcGF3bk1pblg6NjAsc3Bhd25NYXhYOjI5MH19LHFlPTYwMCxTbj01NDYsSHQ9MTMsRXQ9MjUyLHh4PTUwMCxVYT0yNDAsWjA9MTUwMCx5eD0xODQsdng9Mjc0LGN0PShlLGwpPT5lK01hdGgucmFuZG9tKCkqKGwtZSksbDA9KGUsbCxhKT0+TWF0aC5tYXgobCxNYXRoLm1pbihhLGUpKSx3bD1lPT5lW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSplLmxlbmd0aCldO2Z1bmN0aW9uIGVwKGUpe3JldHVybiBlLmhvb3BBbXA+MD9NYXRoLnNpbihlLmhvb3BUKSplLmhvb3BBbXA6MH1mdW5jdGlvbiBUYyhlKXtjb25zdCBsPXh4K2VwKGUpO3JldHVybntjeDpsLGw6bC1lLnJpbUhhbGYscjpsK2UucmltSGFsZixib2FyZFg6bCtlLnJpbUhhbGYrMTV9fWZ1bmN0aW9uIEdhKGUsbCxhLHUsZCxvPTEscD0hMSl7Y29uc3QgaD1NYXRoLm1pbigyNDAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgbT1lLnBhcnRpY2xlcy5sZW5ndGg7bTxoO20rKyl7Y29uc3QgZz1jdCgwLE1hdGguUEkqMiksdj1jdCgzMCwyMjApKm8sdz1jdCgzMDAsODAwKTtlLnBhcnRpY2xlcy5wdXNoKHt4OmwseTphLHZ4Ok1hdGguY29zKGcpKnYsdnk6TWF0aC5zaW4oZykqdi0ocD82MDowKSxsaWZlOncsbWF4TGlmZTp3LHNpemU6Y3QoMS41LDMuNCkqbyxjb2xvcjp3bCh1KSxkcmFnOjIsZ3JhdjpwPzIwOjU1fSl9fWZ1bmN0aW9uIHd4KGUsbCxhLHUpe2NvbnN0IGQ9TWF0aC5taW4oMjYwLGUucGFydGljbGVzLmxlbmd0aCt1KTtmb3IobGV0IG89ZS5wYXJ0aWNsZXMubGVuZ3RoO288ZDtvKyspe2NvbnN0IHA9Y3QoNzAwLDE0MDApO2UucGFydGljbGVzLnB1c2goe3g6bCtjdCgtMzAsMzApLHk6YStjdCgtMTAsMTApLHZ4OmN0KC0xNjAsMTYwKSx2eTpjdCgtMjYwLC02MCksbGlmZTpwLG1heExpZmU6cCxzaXplOmN0KDIsMy42KSxjb2xvcjp3bChbIiNmZmQxNjYiLCIjZmY4YzQyIiwiIzYyZTZmZiIsIiM4ZWYwNWEiLCIjZmZmZmZmIiwiI2ZmNWQ4ZiJdKSxkcmFnOjEuMixncmF2OjI2MH0pfX1mdW5jdGlvbiB0cChlLGwpe2NvbnN0IHU9d2woWzAsMCw0MCw3NiwxMTJdKSxkPWN0KGwuc3Bhd25NaW5YLGwuc3Bhd25NYXhYKTtlLnBsYXRIPXUsZS5wbGF0WD1kLGUuYmFsbD17eDpkLHk6U24tSHQtdSx2eDowLHZ5OjAscm90OmN0KDAsNiksZmxpZ2h0VDowLGJvdW5jZXM6MCxyaW1Ub3VjaGVkOiExLGJhbmtUb3VjaGVkOiExLHNjb3JlZDohMSxmcm9tVGhyZWU6ZDxVYX0sZS5iYWxsTW9kZT0icmVhZHkiLGUucG93ZXI9MCxlLmNoYXJnZURpcj0xLGUuY2hhcmdpbmc9ITEsZS5kcmFnLmFjdGl2ZT0hMSxlLndpbmQ9Y3QoLTEsMSkqbC53aW5kTWF4LE1hdGgucmFuZG9tKCk8bC5tb3ZlQ2hhbmNlPyhlLmhvb3BBbXA9bC5tb3ZlQW1wKmN0KC43LDEpLGUuaG9vcFNwZWVkPWwubW92ZVNwZWVkKmN0KC44LDEuMjUpKTooZS5ob29wQW1wPTAsZS5ob29wU3BlZWQ9MCksZS5ob29wVD1jdCgwLE1hdGguUEkqMiksZS5yaW1IYWxmPWwucmltSGFsZn1mdW5jdGlvbiBpYyhlLGw9ITEpe2NvbnN0IGE9W107Zm9yKGxldCBkPTA7ZDwxMjA7ZCsrKWEucHVzaCh7Zng6TWF0aC5yYW5kb20oKSxmeTpNYXRoLnJhbmRvbSgpLGM6d2woWyIjM2EyZjUyIiwiIzQ0MzY1OSIsIiMyZjI4NDYiLCIjNGQzYTVlIiwiIzM4MzA0ZSJdKSx0dzpjdCgwLE1hdGguUEkqMil9KTtjb25zdCB1PXt0aW1lOjAsbGFzdDowLHRpbWVMZWZ0OmUudGltZSxvdmVyOmwsYnV6emVyOiExLGJ1enplckZsYXNoOjAsYmFsbDp7eDoxNjAseTpTbi1IdCx2eDowLHZ5OjAscm90OjAsZmxpZ2h0VDowLGJvdW5jZXM6MCxyaW1Ub3VjaGVkOiExLGJhbmtUb3VjaGVkOiExLHNjb3JlZDohMSxmcm9tVGhyZWU6ITF9LGJhbGxNb2RlOiJyZWFkeSIsZGVhZFQ6MCxwbGF0WDoxNjAscGxhdEg6MCxhbmdsZURlZzo1Mixwb3dlcjowLGNoYXJnZURpcjoxLGNoYXJnaW5nOiExLGFpbUw6ITEsYWltUjohMSxkcmFnOnthY3RpdmU6ITEsYW5nbGVEZWc6NTIscG93ZXI6LjV9LHdpbmQ6MCxob29wQW1wOjAsaG9vcFNwZWVkOjAsaG9vcFQ6MCxyaW1IYWxmOmUucmltSGFsZixzY29yZTowLHN0cmVhazowLGJlc3RTdHJlYWs6MCxtYWtlczowLGF0dGVtcHRzOjAsc3dpc2hlczowLGxhc3RHYWluOjAscGFydGljbGVzOltdLGZsb2F0ZXJzOltdLGNyb3dkOmEsbmV0QW5pbTowLHNoYWtlOjAsZmxhc2g6MCxjaGVlcjowLGV2TGF1bmNoOjAsZXZSaW06MCxldkJvYXJkOjAsZXZCb3VuY2U6MCxldlN3aXNoOjAsZXZTY29yZTowLGV2TWlzczowLGV2QnV6emVyOjB9O3JldHVybiBsfHx0cCh1LGUpLHV9ZnVuY3Rpb24gYTAoZSl7aWYoZS5iYWxsTW9kZSE9PSJyZWFkeSJ8fGUub3Zlcnx8ZS5idXp6ZXIpcmV0dXJuO2NvbnN0IGw9KGUuZHJhZy5hY3RpdmU/ZS5kcmFnLmFuZ2xlRGVnOmUuYW5nbGVEZWcpKk1hdGguUEkvMTgwLHU9MzQwKyhlLmRyYWcuYWN0aXZlP2UuZHJhZy5wb3dlcjpNYXRoLm1heCguMTIsZS5wb3dlcikpKjczMDtlLmJhbGwudng9TWF0aC5jb3MobCkqdSxlLmJhbGwudnk9LU1hdGguc2luKGwpKnUsZS5iYWxsLmZsaWdodFQ9MCxlLmJhbGwuYm91bmNlcz0wLGUuYmFsbC5yaW1Ub3VjaGVkPSExLGUuYmFsbC5iYW5rVG91Y2hlZD0hMSxlLmJhbGwuc2NvcmVkPSExLGUuYmFsbE1vZGU9ImZseSIsZS5hdHRlbXB0cysrLGUuY2hhcmdpbmc9ITEsZS5ldkxhdW5jaCsrLEdhKGUsZS5iYWxsLngsZS5iYWxsLnkrOCxbIiNjOGI4OWEiLCIjOGE3YTVlIl0sNywuNSwhMCl9ZnVuY3Rpb24gYngoZSl7Y29uc3QgbD1lLmJhbGw7bC5zY29yZWQ9ITAsZS5tYWtlcysrLGUuc3RyZWFrKyssZS5iZXN0U3RyZWFrPU1hdGgubWF4KGUuYmVzdFN0cmVhayxlLnN0cmVhayk7Y29uc3QgYT0hbC5yaW1Ub3VjaGVkJiYhbC5iYW5rVG91Y2hlZDthJiZlLnN3aXNoZXMrKztjb25zdCB1PWwuZnJvbVRocmVlPzM6MixkPWUuc3RyZWFrPj00PzQ6ZS5zdHJlYWs+PTM/MzplLnN0cmVhaz49Mj8yOjE7bGV0IG89KHUrKGE/MjowKSkqZDtjb25zdCBwPVRjKGUpO2xldCBoPWE/IlNXSVNIISI6bC5iYW5rVG91Y2hlZD8iQkFOSyEiOmwucmltVG91Y2hlZD8iUkFUVExFRCBJTiEiOiJCVUNLRVQhIixtPWE/IiNmZmQxNjYiOiIjOGVmMDVhIjtlLmJ1enplciYmKG8rPTUsaD0iQlVaWkVSIEJFQVRFUiEiLG09IiNmZjVkOGYiLGUuZmxhc2g9LjYpLGUuc2NvcmUrPW8sZS5sYXN0R2Fpbj1vLGUubmV0QW5pbT0xLGUuY2hlZXI9MSxlLnNoYWtlPU1hdGgubWF4KGUuc2hha2UsYT82OjMuNSksYT9lLmV2U3dpc2grKzplLmV2U2NvcmUrKyx3eChlLHAuY3gsRXQrMTAsYT8zNDoxOCksZS5mbG9hdGVycy5wdXNoKHt4OnAuY3gseTpFdC00MCx0eHQ6aCxsaWZlOmF8fGUuYnV6emVyPzEzMDA6OTUwLG1heExpZmU6YXx8ZS5idXp6ZXI/MTMwMDo5NTAsY29sb3I6bSxiaWc6YXx8ZS5idXp6ZXJ9KSxlLmZsb2F0ZXJzLnB1c2goe3g6cC5jeCx5OkV0LTgsdHh0OmArJHtvfWAsbGlmZTo4MDAsbWF4TGlmZTo4MDAsY29sb3I6IiNmZmZmZmYiLGJpZzohMX0pfWZ1bmN0aW9uIGkwKGUpe2UuYmFsbC5zY29yZWR8fChlLnN0cmVhaz0wLGUuZXZNaXNzKyssZS5mbG9hdGVycy5wdXNoKHt4OmUuYmFsbC54LHk6ZS5iYWxsLnktMjQsdHh0OiJOTyBHT09EIixsaWZlOjcwMCxtYXhMaWZlOjcwMCxjb2xvcjoiI2E4OWM4YSIsYmlnOiExfSkpfWZ1bmN0aW9uIGt4KGUsbCxhLHUpe2NvbnN0IGQ9bC8xZTM7ZS50aW1lKz1sLGUuc2hha2U9TWF0aC5tYXgoMCxlLnNoYWtlLWwqLjA0NSksZS5mbGFzaD1NYXRoLm1heCgwLGUuZmxhc2gtbCouMDAxNSksZS5idXp6ZXJGbGFzaD1NYXRoLm1heCgwLGUuYnV6emVyRmxhc2gtbCouMDAxMiksZS5uZXRBbmltPU1hdGgubWF4KDAsZS5uZXRBbmltLWwqLjAwMzUpLGUuY2hlZXI9TWF0aC5tYXgoMCxlLmNoZWVyLWwqNmUtNCk7Zm9yKGxldCBnPWUucGFydGljbGVzLmxlbmd0aC0xO2c+PTA7Zy0tKXtjb25zdCB2PWUucGFydGljbGVzW2ddO2lmKHYubGlmZS09bCx2LmxpZmU8PTApe2NvbnN0IHc9ZS5wYXJ0aWNsZXMucG9wKCk7dyYmZzxlLnBhcnRpY2xlcy5sZW5ndGgmJihlLnBhcnRpY2xlc1tnXT13KTtjb250aW51ZX12LnZ4LT12LnZ4KnYuZHJhZypkLHYudnkrPXYuZ3JhdipkLXYudnkqdi5kcmFnKmQsdi54Kz12LnZ4KmQsdi55Kz12LnZ5KmR9Zm9yKGxldCBnPWUuZmxvYXRlcnMubGVuZ3RoLTE7Zz49MDtnLS0pZS5mbG9hdGVyc1tnXS5saWZlLT1sLGUuZmxvYXRlcnNbZ10ubGlmZTw9MCYmZS5mbG9hdGVycy5zcGxpY2UoZywxKTtpZighdXx8KCFlLm92ZXImJiFlLmJ1enplciYmKGUudGltZUxlZnQtPWwsZS50aW1lTGVmdDw9MCYmKGUudGltZUxlZnQ9MCxlLmJhbGxNb2RlPT09ImZseSI/KGUuYnV6emVyPSEwLGUuYnV6emVyRmxhc2g9MSxlLmV2QnV6emVyKyspOihlLm92ZXI9ITAsZS5idXp6ZXJGbGFzaD0xLGUuZXZCdXp6ZXIrKykpKSxlLmJ1enplciYmZS5iYWxsTW9kZSE9PSJmbHkiJiYoZS5vdmVyPSEwKSxlLm92ZXIpKXJldHVybjtpZihlLmhvb3BBbXA+MCYmKGUuaG9vcFQrPWQqZS5ob29wU3BlZWQqMi4yKSxlLmJhbGxNb2RlPT09InJlYWR5IiYmKGUuYWltTCYmKGUuYW5nbGVEZWc9bDAoZS5hbmdsZURlZys2NSpkLDE1LDg1KSksZS5haW1SJiYoZS5hbmdsZURlZz1sMChlLmFuZ2xlRGVnLTY1KmQsMTUsODUpKSxlLmNoYXJnaW5nJiYhZS5kcmFnLmFjdGl2ZSYmKGUucG93ZXIrPWUuY2hhcmdlRGlyKihsLzY1MCksZS5wb3dlcj49MT8oZS5wb3dlcj0xLGUuY2hhcmdlRGlyPS0xKTplLnBvd2VyPD0wJiYoZS5wb3dlcj0wLGUuY2hhcmdlRGlyPTEpKSksZS5iYWxsTW9kZT09PSJkZWFkIil7ZS5kZWFkVC09bCxlLmRlYWRUPD0wJiZ0cChlLGEpO3JldHVybn1pZihlLmJhbGxNb2RlIT09ImZseSIpcmV0dXJuO2NvbnN0IG89ZS5iYWxsLHA9TWF0aC5oeXBvdChvLnZ4LG8udnkpLGg9TWF0aC5tYXgoMSxNYXRoLmNlaWwocCpkLzUpKSxtPVRjKGUpO2ZvcihsZXQgZz0wO2c8aDtnKyspe2NvbnN0IHY9by55O28udnkrPVowKihkL2gpLG8udngrPWUud2luZCoyNiooZC9oKSxvLngrPW8udngqKGQvaCksby55Kz1vLnZ5KihkL2gpLG8ucm90Kz1vLnZ4KihkL2gpL0h0LG8ueDxIdCYmKG8ueD1IdCxvLnZ4PU1hdGguYWJzKG8udngpKi43KSxvLng+cWUtSHQmJihvLng9cWUtSHQsby52eD0tTWF0aC5hYnMoby52eCkqLjcpLG8ueTxIdCYmKG8ueT1IdCxvLnZ5PU1hdGguYWJzKG8udnkpKi43KSxvLnZ4PjAmJm8ueCtIdD49bS5ib2FyZFgmJm8ueT55eC00JiZvLnk8dngrNCYmKG8ueD1tLmJvYXJkWC1IdCxvLnZ4PS1NYXRoLmFicyhvLnZ4KSouNjIsby5iYW5rVG91Y2hlZHx8KG8uYmFua1RvdWNoZWQ9ITAsZS5ldkJvYXJkKyssR2EoZSxtLmJvYXJkWCxvLnksWyIjY2ZlOGZmIiwiI2ZmZmZmZiJdLDUsLjUpKSk7Zm9yKGNvbnN0IHcgb2ZbbS5sLG0ucl0pe2NvbnN0IE09by54LXcsUj1vLnktRXQsVz1NYXRoLmh5cG90KE0sUiksUT1IdCs0O2lmKFc8USYmVz4uMDAxKXtjb25zdCBTPU0vVyxIPVIvVztvLng9dytTKlEsby55PUV0K0gqUTtjb25zdCBWPW8udngqUytvLnZ5Kkg7VjwwJiYoby52eC09MS41NSpWKlMsby52eS09MS41NSpWKkgsby52eCo9LjkyLG8udnkqPS45MixvLnJpbVRvdWNoZWR8fChvLnJpbVRvdWNoZWQ9ITAsZS5ldlJpbSsrLEdhKGUsdyxFdCxbIiNmZjhjNDIiLCIjZmZkMTY2Il0sNSwuNSkpKX19aWYoIW8uc2NvcmVkJiZvLnZ5PjAmJnY8PUV0JiZvLnk+RXQmJm8ueD5tLmwrNCYmby54PG0uci00JiZieChlKSxvLnkrSHQ+U24mJihvLnk9U24tSHQsTWF0aC5hYnMoby52eSk+MTIwJiYoZS5ldkJvdW5jZSsrLEdhKGUsby54LFNuLTIsWyIjOGE3YTVlIiwiI2M4Yjg5YSJdLDQsLjQ1LCEwKSksby52eT0tTWF0aC5hYnMoby52eSkqLjU1LG8udngqPS44MixvLmJvdW5jZXMrKyxvLmJvdW5jZXM+PTN8fE1hdGguaHlwb3Qoby52eCxvLnZ5KTw3MCkpe28uc2NvcmVkfHxpMChlKSxlLmJhbGxNb2RlPSJkZWFkIixlLmRlYWRUPTQyMDticmVha319ZS5zdHJlYWs+PTMmJmUuYmFsbE1vZGU9PT0iZmx5IiYmTWF0aC5yYW5kb20oKTwuNyYmZS5wYXJ0aWNsZXMucHVzaCh7eDpvLngrY3QoLTQsNCkseTpvLnkrY3QoLTQsNCksdng6Y3QoLTIwLDIwKSx2eTpjdCgtMzAsMTApLGxpZmU6MzIwLG1heExpZmU6MzIwLHNpemU6Y3QoMS41LDMpLGNvbG9yOndsKFsiI2ZmOGM0MiIsIiNmZmQxNjYiLCIjZmY1ZDNjIl0pLGRyYWc6MS41LGdyYXY6LTQwfSksby5mbGlnaHRUKz1sLG8uZmxpZ2h0VD43ZTMmJihvLnNjb3JlZHx8aTAoZSksZS5iYWxsTW9kZT0iZGVhZCIsZS5kZWFkVD0zMDApfWZ1bmN0aW9uIGp4KGUsbCl7Y29uc3QgYT0oZS5kcmFnLmFjdGl2ZT9lLmRyYWcuYW5nbGVEZWc6ZS5hbmdsZURlZykqTWF0aC5QSS8xODAsZD0zNDArKGUuZHJhZy5hY3RpdmU/ZS5kcmFnLnBvd2VyOk1hdGgubWF4KC4xMixlLmNoYXJnaW5nP2UucG93ZXI6LjU1KSkqNzMwO2xldCBvPWUuYmFsbC54LHA9ZS5iYWxsLnksaD1NYXRoLmNvcyhhKSpkLG09LU1hdGguc2luKGEpKmQ7Y29uc3QgZz0xLzYwO2wubGVuZ3RoPTA7Zm9yKGxldCB2PTA7djwyNiYmKG0rPVowKmcsaCs9ZS53aW5kKjI2Kmcsbys9aCpnLHArPW0qZywhKHA+U258fG8+cWUpKTt2KyspdiUyPT09MCYmbC5wdXNoKHt4Om8seTpwfSl9Y29uc3QgZHM9TWF0aC5QSSoyO2Z1bmN0aW9uIF9hKGUsbCxhLHUsZCxvKXtjb25zdCBwPU1hdGgubWluKG8sdS8yLGQvMik7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK3AsYSksZS5hcmNUbyhsK3UsYSxsK3UsYStkLHApLGUuYXJjVG8obCt1LGErZCxsLGErZCxwKSxlLmFyY1RvKGwsYStkLGwsYSxwKSxlLmFyY1RvKGwsYSxsK3UsYSxwKSxlLmNsb3NlUGF0aCgpfWNvbnN0IE9hPVtdO2Z1bmN0aW9uIFN4KGUsbCxhLHUpe2NvbnN0IGQ9YS9xZTtlLmNsZWFyUmVjdCgwLDAsYSxhKSxlLnNhdmUoKSxlLnNjYWxlKGQsZCksbC5zaGFrZT4wJiZlLnRyYW5zbGF0ZSgoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSwoTWF0aC5yYW5kb20oKS0uNSkqbC5zaGFrZSk7Y29uc3Qgbz1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLHFlKTtvLmFkZENvbG9yU3RvcCgwLCIjMTkxMjI3Iiksby5hZGRDb2xvclN0b3AoLjU1LCIjMjQxYTM1Iiksby5hZGRDb2xvclN0b3AoMSwiIzJlMjE0MCIpLGUuZmlsbFN0eWxlPW8sZS5maWxsUmVjdCgtMjAsLTIwLHFlKzQwLHFlKzQwKTtmb3IoY29uc3QgUyBvZlsxMTAsNDkwXSl7Y29uc3QgSD1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KFMsLTQwLDIwLFMsLTQwLDUyMCk7SC5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsMTUwLDcwLDAuMTYpIiksSC5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsMTUwLDcwLDApIiksZS5maWxsU3R5bGU9SCxlLmZpbGxSZWN0KDAsMCxxZSxxZSl9Y29uc3QgcD0xLjUrbC5jaGVlcio1O2Zvcihjb25zdCBTIG9mIGwuY3Jvd2Qpe2NvbnN0IEg9Uy5meCpxZSxWPTMzMCtTLmZ5Kjk2K01hdGguc2luKGwudGltZSouMDA0K1MudHcpKnA7ZS5maWxsU3R5bGU9Uy5jLGUuYmVnaW5QYXRoKCksZS5hcmMoSCxWLDksMCxkcyksZS5maWxsKCl9ZS5maWxsU3R5bGU9IiMxYzE1MzAiLGUuZmlsbFJlY3QoLTIwLDQyNCxxZSs0MCwxNCksZS5maWxsU3R5bGU9InJnYmEoMjU1LDE0MCw2NiwwLjI1KSIsZS5maWxsUmVjdCgtMjAsNDI0LHFlKzQwLDIpO2NvbnN0IGg9ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLDQzOCwwLHFlKTtoLmFkZENvbG9yU3RvcCgwLCIjOGE1YTMwIiksaC5hZGRDb2xvclN0b3AoMSwiIzVjM2ExZCIpLGUuZmlsbFN0eWxlPWgsZS5maWxsUmVjdCgtMjAsNDM4LHFlKzQwLHFlLTQzOCsyMCksZS5zdHJva2VTdHlsZT0icmdiYSgwLDAsMCwwLjE0KSIsZS5saW5lV2lkdGg9Mjtmb3IobGV0IFM9MTQ7UzxxZTtTKz0zNCllLmJlZ2luUGF0aCgpLGUubW92ZVRvKFMsNDM4KSxlLmxpbmVUbyhTLTI2LHFlKzEwKSxlLnN0cm9rZSgpO2NvbnN0IG09ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLDQzOCwwLDUwMCk7bS5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsMjIwLDE2MCwwLjE2KSIpLG0uYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDIyMCwxNjAsMCkiKSxlLmZpbGxTdHlsZT1tLGUuZmlsbFJlY3QoLTIwLDQzOCxxZSs0MCw2MiksZS5zdHJva2VTdHlsZT0icmdiYSgyNTUsMjM1LDIwMCwwLjUpIixlLmxpbmVXaWR0aD0zLGUuc2V0TGluZURhc2goWzEwLDhdKSxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKFVhLDQ0MCksZS5saW5lVG8oVWEtMTgscWUpLGUuc3Ryb2tlKCksZS5zZXRMaW5lRGFzaChbXSksZS5maWxsU3R5bGU9InJnYmEoMjU1LDIzNSwyMDAsMC40NSkiLGUuZm9udD0iNzAwIDE1cHggJ0NoYWtyYSBQZXRjaCcsIHNhbnMtc2VyaWYiLGUudGV4dEFsaWduPSJjZW50ZXIiLGUuZmlsbFRleHQoIjNQVCIsVWEtMjYsNDcwKSxlLmZpbGxUZXh0KCJIT09QU1RPUk0iLHFlLzItNDAsU24rMzQpLGUuc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDIzNSwyMDAsMC4zNSkiLGUubGluZVdpZHRoPTMsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtMjAsU24pLGUubGluZVRvKHFlKzIwLFNuKSxlLnN0cm9rZSgpO2NvbnN0IGc9VGMobCk7ZS5zdHJva2VTdHlsZT0iIzNjMzM1NSIsZS5saW5lV2lkdGg9MTAsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhxZSsxMCwxNTApLGUubGluZVRvKGcuYm9hcmRYKzgsMTY4KSxlLnN0cm9rZSgpLGUuc3Ryb2tlU3R5bGU9IiM0ZDQyNzAiLGUubGluZVdpZHRoPTQsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhxZSsxMCwxNDgpLGUubGluZVRvKGcuYm9hcmRYKzgsMTY2KSxlLnN0cm9rZSgpO2NvbnN0IHY9ZS5jcmVhdGVMaW5lYXJHcmFkaWVudChnLmJvYXJkWCwxMjAsZy5ib2FyZFgrMTAsMjg2KTt2LmFkZENvbG9yU3RvcCgwLCJyZ2JhKDE5MCwyMjUsMjU1LDAuMzQpIiksdi5hZGRDb2xvclN0b3AoMSwicmdiYSgxNTAsMTkwLDIzNSwwLjE2KSIpLGUuZmlsbFN0eWxlPXYsX2EoZSxnLmJvYXJkWCwxNzgsOSwxMDQsMyksZS5maWxsKCksZS5zdHJva2VTdHlsZT0icmdiYSgyMjAsMjQwLDI1NSwwLjgpIixlLmxpbmVXaWR0aD0yLF9hKGUsZy5ib2FyZFgsMTc4LDksMTA0LDMpLGUuc3Ryb2tlKCksZS5zdHJva2VTdHlsZT0icmdiYSgyNTUsOTMsODAsMC44NSkiLGUubGluZVdpZHRoPTIuNSxlLnN0cm9rZVJlY3QoZy5ib2FyZFgtMSxFdC0yNiwxMCwzNCksZS5zdHJva2VTdHlsZT0iI2ZmN2ExYSIsZS5saW5lV2lkdGg9NSxlLmxpbmVDYXA9InJvdW5kIixlLmJlZ2luUGF0aCgpLGUubW92ZVRvKGcubCxFdCksZS5saW5lVG8oZy5yLEV0KSxlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSIjZmY5YTNjIjtmb3IoY29uc3QgUyBvZltnLmwsZy5yXSllLmJlZ2luUGF0aCgpLGUuYXJjKFMsRXQsNCwwLGRzKSxlLmZpbGwoKTtlLnN0cm9rZVN0eWxlPSIjYzk1YzEwIixlLmxpbmVXaWR0aD00LGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oZy5yLEV0KSxlLmxpbmVUbyhnLmJvYXJkWCxFdC00KSxlLnN0cm9rZSgpO2NvbnN0IHc9RXQrMyxNPUV0KzM0K2wubmV0QW5pbSoxNixSPWwucmltSGFsZiooLjQ1LWwubmV0QW5pbSouMTIpO2Uuc3Ryb2tlU3R5bGU9InJnYmEoMjQ1LDI0NSwyNTUsMC43NSkiLGUubGluZVdpZHRoPTEuNDtjb25zdCBXPTY7Zm9yKGxldCBTPTA7UzxXO1MrKyl7Y29uc3QgSD1nLmwrUy8oVy0xKSooZy5yLWcubCksVj1nLmN4LVIrUy8oVy0xKSpSKjIscT0oSCtWKS8yK01hdGguc2luKGwudGltZSouMDA2K1MpKjEuNTtlLmJlZ2luUGF0aCgpLGUubW92ZVRvKEgsdyksZS5xdWFkcmF0aWNDdXJ2ZVRvKHEsKHcrTSkvMitsLm5ldEFuaW0qNixWLE0pLGUuc3Ryb2tlKCl9Zm9yKGxldCBTPTE7Uzw9MjtTKyspe2NvbnN0IEg9Uy8zLFY9dysoTS13KSpIK2wubmV0QW5pbSo0KkgscT1sLnJpbUhhbGYqKDEtSCouNTUpLUgqUiouMjtlLmJlZ2luUGF0aCgpLGUubW92ZVRvKGcuY3gtcSxWKSxlLmxpbmVUbyhnLmN4K3EsViksZS5zdHJva2UoKX1pZihsLnBsYXRIPjAmJmwuYmFsbE1vZGUhPT0iZGVhZCIpe2NvbnN0IEg9bC5wbGF0WC0zOCxWPVNuLWwucGxhdEg7ZS5maWxsU3R5bGU9IiM2ZTRhMjYiLF9hKGUsSCxWLDc2LGwucGxhdEgsNCksZS5maWxsKCksZS5zdHJva2VTdHlsZT0icmdiYSgwLDAsMCwwLjMpIixlLmxpbmVXaWR0aD0yLF9hKGUsSCxWLDc2LGwucGxhdEgsNCksZS5zdHJva2UoKSxlLnN0cm9rZVN0eWxlPSJyZ2JhKDI1NSwyMjAsMTYwLDAuMjUpIixlLmJlZ2luUGF0aCgpLGUubW92ZVRvKEgrNixWK2wucGxhdEgvMiksZS5saW5lVG8oSCs3Ni02LFYrbC5wbGF0SC8yKSxlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSJyZ2JhKDI1NSwyMjAsMTYwLDAuNSkiLGUuZmlsbFJlY3QoSCxWLDc2LDMpfWlmKE1hdGguYWJzKGwud2luZCk+LjA1KXtlLnN0cm9rZVN0eWxlPSIjOGY4NmE4IixlLmxpbmVXaWR0aD0zLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oNjQsMTQyKSxlLmxpbmVUbyg2NCw5NiksZS5zdHJva2UoKTtjb25zdCBWPTE4K01hdGguYWJzKGwud2luZCkqMTAscT1NYXRoLnNpZ24obC53aW5kKSxvZT1NYXRoLnNpbihsLnRpbWUqLjAxMikqNDtlLmZpbGxTdHlsZT1sLndpbmQ+MD8icmdiYSg5OCwyMzAsMjU1LDAuODUpIjoicmdiYSgyNTUsMjA5LDEwMiwwLjg1KSIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyg2NCw5NiksZS5saW5lVG8oNjQrcSpWLDEwMitvZSouNCksZS5saW5lVG8oNjQsMTA5KSxlLmNsb3NlUGF0aCgpLGUuZmlsbCgpLGUuZmlsbFN0eWxlPSJyZ2JhKDIzMCwyMjUsMjQ1LDAuNykiLGUuZm9udD0iNzAwIDExcHggJ0NoYWtyYSBQZXRjaCcsIHNhbnMtc2VyaWYiLGUudGV4dEFsaWduPSJjZW50ZXIiLGUuZmlsbFRleHQoIldJTkQiLDY0LDE1OCl9aWYobC5iYWxsTW9kZT09PSJyZWFkeSImJiFsLm92ZXImJih1PT09InJ1bm5pbmcifHx1PT09InJlYWR5Iikpe2p4KGwsT2EpO2ZvcihsZXQgb2U9MDtvZTxPYS5sZW5ndGg7b2UrKyl7Y29uc3QgWj1PYVtvZV0seWU9LjU1KigxLW9lL09hLmxlbmd0aCk7ZS5maWxsU3R5bGU9YHJnYmEoMjU1LDIwOSwxMDIsJHt5ZS50b0ZpeGVkKDMpfSlgLGUuYmVnaW5QYXRoKCksZS5hcmMoWi54LFoueSwzLjItb2UqLjA2LDAsZHMpLGUuZmlsbCgpfWNvbnN0IFM9bC5kcmFnLmFjdGl2ZT9sLmRyYWcucG93ZXI6bC5wb3dlcixIPWwuY2hhcmdpbmd8fGwuZHJhZy5hY3RpdmU/UzouNTUsVj1sLmJhbGw7ZS5saW5lV2lkdGg9NCxlLnN0cm9rZVN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTQpIixlLmJlZ2luUGF0aCgpLGUuYXJjKFYueCxWLnksMjIsMCxkcyksZS5zdHJva2UoKTtjb25zdCBxPTEyMC1IKjEyMDtlLnN0cm9rZVN0eWxlPWBoc2xhKCR7cX0sIDkwJSwgNTglLCAwLjkpYCxlLmJlZ2luUGF0aCgpLGUuYXJjKFYueCxWLnksMjIsLU1hdGguUEkvMiwtTWF0aC5QSS8yK0gqZHMpLGUuc3Ryb2tlKCl9aWYobC5iYWxsTW9kZSE9PSJkZWFkIil7Y29uc3QgUz1sLmJhbGw7ZS5zYXZlKCksbC5zdHJlYWs+PTMmJihlLnNoYWRvd0NvbG9yPSIjZmY4YzQyIixlLnNoYWRvd0JsdXI9MjIpO2NvbnN0IEg9ZS5jcmVhdGVSYWRpYWxHcmFkaWVudChTLngtNCxTLnktNSwyLFMueCxTLnksMTQpO0guYWRkQ29sb3JTdG9wKDAsIiNmZmIwNjYiKSxILmFkZENvbG9yU3RvcCguNiwiI2YwN2YyNCIpLEguYWRkQ29sb3JTdG9wKDEsIiNjMjVhMTIiKSxlLmZpbGxTdHlsZT1ILGUuYmVnaW5QYXRoKCksZS5hcmMoUy54LFMueSwxMywwLGRzKSxlLmZpbGwoKSxlLnJlc3RvcmUoKSxlLnNhdmUoKSxlLnRyYW5zbGF0ZShTLngsUy55KSxlLnJvdGF0ZShTLnJvdCksZS5zdHJva2VTdHlsZT0icmdiYSg2MCwyMCw1LDAuNjUpIixlLmxpbmVXaWR0aD0xLjYsZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtMTMsMCksZS5saW5lVG8oMTMsMCksZS5zdHJva2UoKSxlLmJlZ2luUGF0aCgpLGUuYXJjKDAsMCwxMywtLjksLjkpLGUuc3Ryb2tlKCksZS5iZWdpblBhdGgoKSxlLmFyYygwLDAsMTMsTWF0aC5QSS0uOSxNYXRoLlBJKy45KSxlLnN0cm9rZSgpLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oMCwtMTMpLGUucXVhZHJhdGljQ3VydmVUbyg2LDAsMCwxMyksZS5zdHJva2UoKSxlLnJlc3RvcmUoKX1mb3IoY29uc3QgUyBvZiBsLnBhcnRpY2xlcyl7Y29uc3QgSD1NYXRoLm1heCgwLFMubGlmZS9TLm1heExpZmUpO2UuZ2xvYmFsQWxwaGE9SCxlLmZpbGxTdHlsZT1TLmNvbG9yLGUuZmlsbFJlY3QoUy54LVMuc2l6ZS8yLFMueS1TLnNpemUvMixTLnNpemUsUy5zaXplKX1lLmdsb2JhbEFscGhhPTE7Zm9yKGNvbnN0IFMgb2YgbC5mbG9hdGVycyl7Y29uc3QgSD0xLVMubGlmZS9TLm1heExpZmUsVj1IPC4xMj9ILy4xMjpNYXRoLm1heCgwLDEtKEgtLjU1KS8uNDUpO2UuZ2xvYmFsQWxwaGE9TWF0aC5taW4oMSxWKTtjb25zdCBxPVMuYmlnJiZIPC4yPzErKC4yLUgpKjEuNjoxO2Uuc2F2ZSgpLGUudHJhbnNsYXRlKFMueCxTLnktSCoyNiksZS5zY2FsZShxLHEpLGUuZm9udD1gJHtTLmJpZz8iOTAwIDI0IjoiNzAwIDE1In1weCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZmAsZS50ZXh0QWxpZ249ImNlbnRlciIsZS5saW5lV2lkdGg9NCxlLnN0cm9rZVN0eWxlPSJyZ2JhKDEwLDYsMTYsMC43KSIsZS5zdHJva2VUZXh0KFMudHh0LDAsMCksZS5maWxsU3R5bGU9Uy5jb2xvcixlLmZpbGxUZXh0KFMudHh0LDAsMCksZS5yZXN0b3JlKCl9ZS5nbG9iYWxBbHBoYT0xLGwuYnV6emVyRmxhc2g+MCYmKGUuZmlsbFN0eWxlPWByZ2JhKDI1NSw2MCw1MCwkeyhsLmJ1enplckZsYXNoKi4zKS50b0ZpeGVkKDMpfSlgLGUuZmlsbFJlY3QoLTIwLC0yMCxxZSs0MCxxZSs0MCkpLGwuZmxhc2g+MCYmKGUuZmlsbFN0eWxlPWByZ2JhKDI1NSwyMjAsMTUwLCR7KGwuZmxhc2gqLjMpLnRvRml4ZWQoMyl9KWAsZS5maWxsUmVjdCgtMjAsLTIwLHFlKzQwLHFlKzQwKSk7Y29uc3QgUT1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KHFlLzIscWUvMixxZSouMzUscWUvMixxZS8yLHFlKi43OCk7US5hZGRDb2xvclN0b3AoMCwicmdiYSgxMCw2LDE2LDApIiksUS5hZGRDb2xvclN0b3AoMSwicmdiYSgxMCw2LDE2LDAuNSkiKSxlLmZpbGxTdHlsZT1RLGUuZmlsbFJlY3QoLTIwLC0yMCxxZSs0MCxxZSs0MCksZXAobCkhPT0wJiYoZS5maWxsU3R5bGU9InJnYmEoOTgsMjMwLDI1NSwwLjUpIixlLmZvbnQ9IjcwMCAxMHB4ICdDaGFrcmEgUGV0Y2gnLCBzYW5zLXNlcmlmIixlLnRleHRBbGlnbj0iY2VudGVyIixlLmZpbGxUZXh0KCLil4IgTU9WSU5HIFJJTSDilrgiLGcuY3gsMTY4KSksZS5yZXN0b3JlKCl9Y29uc3QgbnA9Imhvb3BzdG9ybS5iZXN0cy52MSIscnA9Imhvb3BzdG9ybS5kaWZmLnYxIjtmdW5jdGlvbiBOeCgpe2NvbnN0IGU9e3N0cmVldDowLHBybzowLGxlZ2VuZDowfTt0cnl7Y29uc3QgbD1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShucCk7aWYoIWwpcmV0dXJuIGU7Y29uc3QgYT1KU09OLnBhcnNlKGwpO3JldHVybntzdHJlZXQ6TnVtYmVyKGEuc3RyZWV0KXx8MCxwcm86TnVtYmVyKGEucHJvKXx8MCxsZWdlbmQ6TnVtYmVyKGEubGVnZW5kKXx8MH19Y2F0Y2h7cmV0dXJuIGV9fWZ1bmN0aW9uIG9jKCl7dHJ5e2NvbnN0IGU9bG9jYWxTdG9yYWdlLmdldEl0ZW0ocnApO2lmKGU9PT0ic3RyZWV0Inx8ZT09PSJwcm8ifHxlPT09ImxlZ2VuZCIpcmV0dXJuIGV9Y2F0Y2h7fXJldHVybiJwcm8ifWZ1bmN0aW9uIE14KCl7Y29uc3QgZT14LnVzZVJlZihudWxsKSxsPXgudXNlUmVmKG51bGwpLGE9eC51c2VSZWYoaWMoUnJbb2MoKV0sITApKSx1PXgudXNlUmVmKHt3OjAsaDowfSksZD14LnVzZVJlZigwKSxvPXgudXNlUmVmKHtsYXVuY2g6MCxyaW06MCxib2FyZDowLGJvdW5jZTowLHN3aXNoOjAsc2NvcmU6MCxtaXNzOjAsYnV6emVyOjB9KSxwPXgudXNlUmVmKCExKSxoPXgudXNlUmVmKDApLG09eC51c2VSZWYoMCksZz14LnVzZVJlZih7eDowLHk6MH0pLFt2LHddPXgudXNlU3RhdGUoImlkbGUiKSxNPXgudXNlUmVmKCJpZGxlIiksW1IsV109eC51c2VTdGF0ZSgwKSxbUSxTXT14LnVzZVN0YXRlKFJyW29jKCldLnRpbWUpLFtILFZdPXgudXNlU3RhdGUoMCksW3Esb2VdPXgudXNlU3RhdGUoMCksW1oseWVdPXgudXNlU3RhdGUoMCksW1NlLGtlXT14LnVzZVN0YXRlKDApLFtQZSxFZV09eC51c2VTdGF0ZSgwKSxbT2UsQmVdPXgudXNlU3RhdGUoMCksW3plLEZlXT14LnVzZVN0YXRlKCExKSxbTGUsamVdPXgudXNlU3RhdGUob2MpLHdlPXgudXNlUmVmKExlKSxbVSx0ZV09eC51c2VTdGF0ZShOeCksRj14LnVzZVJlZihVKSxbayxMXT14LnVzZVN0YXRlKGhuKSx1ZT14LnVzZVJlZihrKSwkPXgudXNlQ2FsbGJhY2soST0+e00uY3VycmVudD1JLHcoSSl9LFtdKSxKPXgudXNlQ2FsbGJhY2soKCk9PntkLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGQuY3VycmVudCksZC5jdXJyZW50PTApfSxbXSksaGU9eC51c2VDYWxsYmFjayhJPT57SigpLCQoInJlYWR5IiksZC5jdXJyZW50PXdpbmRvdy5zZXRUaW1lb3V0KCgpPT57ZC5jdXJyZW50PTAsTS5jdXJyZW50PT09InJlYWR5IiYmJCgicnVubmluZyIpfSxJKX0sW0osJF0pLHZlPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpLEooKSxhLmN1cnJlbnQ9aWMoUnJbd2UuY3VycmVudF0sITEpLG8uY3VycmVudD17bGF1bmNoOjAscmltOjAsYm9hcmQ6MCxib3VuY2U6MCxzd2lzaDowLHNjb3JlOjAsbWlzczowLGJ1enplcjowfSxwLmN1cnJlbnQ9ITEsaC5jdXJyZW50PTAsVygwKSxTKFJyW3dlLmN1cnJlbnRdLnRpbWUpLFYoMCksb2UoMCkseWUoMCksa2UoMCksRWUoMCksRmUoITEpLERuLnN0YXJ0KCksaGUoOTUwKX0sW0osaGVdKSxHPXgudXNlQ2FsbGJhY2soKCk9PntNLmN1cnJlbnQ9PT0icnVubmluZyImJihKKCksSGUucGF1c2UoKSwkKCJwYXVzZWQiKSl9LFtKLCRdKSx4ZT14LnVzZUNhbGxiYWNrKCgpPT57TS5jdXJyZW50PT09InBhdXNlZCImJihYZSgpLEhlLnJlc3VtZSgpLGhlKDUwMCkpfSxbaGVdKSxhZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgST1NLmN1cnJlbnQ7ST09PSJpZGxlInx8ST09PSJvdmVyIj92ZSgpOkk9PT0icGF1c2VkIiYmeGUoKX0sW3ZlLHhlXSksZWU9eC51c2VDYWxsYmFjayhJPT57Y29uc3QgZGU9TS5jdXJyZW50O2lmKCEoZGU9PT0icnVubmluZyJ8fGRlPT09InJlYWR5Inx8ZGU9PT0icGF1c2VkIikpe3dlLmN1cnJlbnQ9SSxqZShJKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0ocnAsSSl9Y2F0Y2h7fWEuY3VycmVudD1pYyhScltJXSwhMCkscC5jdXJyZW50PSExLGguY3VycmVudD0wLFcoMCksUyhScltJXS50aW1lKSxWKDApLG9lKDApLHllKDApLGtlKDApLEVlKDApLEZlKCExKX19LFtdKSx6PXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBJPSF1ZS5jdXJyZW50O3VlLmN1cnJlbnQ9SSxMKEkpLHV0KEkpLG1uKEkpfSxbXSksZmU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEk9YS5jdXJyZW50LGRlPXdlLmN1cnJlbnQsTz1JLnNjb3JlO2lmKE8+Ri5jdXJyZW50W2RlXSl7Y29uc3Qgaj17Li4uRi5jdXJyZW50LFtkZV06T307Ri5jdXJyZW50PWosdGUoaiksRmUoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShucCxKU09OLnN0cmluZ2lmeShqKSl9Y2F0Y2h7fX0kKCJvdmVyIil9LFskXSksUD1JPT57Y29uc3QgZGU9SS5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO3JldHVybnt4OihJLmNsaWVudFgtZGUubGVmdCkvZGUud2lkdGgqNjAwLHk6KEkuY2xpZW50WS1kZS50b3ApL2RlLmhlaWdodCo2MDB9fSxpZT14LnVzZUNhbGxiYWNrKEk9PntYZSgpO2NvbnN0IGRlPU0uY3VycmVudDtpZihkZT09PSJpZGxlInx8ZGU9PT0ib3ZlciIpe3ZlKCk7cmV0dXJufWlmKGRlIT09InJ1bm5pbmciKXJldHVybjtjb25zdCBPPWEuY3VycmVudDtpZihPLmJhbGxNb2RlIT09InJlYWR5IilyZXR1cm47dHJ5e0kuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZShJLnBvaW50ZXJJZCl9Y2F0Y2h7fWNvbnN0IGo9UChJKTtnLmN1cnJlbnQ9aixPLmRyYWcuYWN0aXZlPSEwLE8uZHJhZy5hbmdsZURlZz1PLmFuZ2xlRGVnLE8uZHJhZy5wb3dlcj0wfSxbdmVdKSxZPXgudXNlQ2FsbGJhY2soST0+e2NvbnN0IGRlPWEuY3VycmVudDtpZighZGUuZHJhZy5hY3RpdmUpcmV0dXJuO2NvbnN0IE89UChJKSxqPU8ueC1nLmN1cnJlbnQueCxnZT1nLmN1cnJlbnQueS1PLnksWD1NYXRoLmh5cG90KGosZ2UpO2lmKFg8Nil7ZGUuZHJhZy5wb3dlcj0wO3JldHVybn1sZXQgVD1NYXRoLmF0YW4yKGdlLE1hdGgubWF4KGosOCkpKjE4MC9NYXRoLlBJO1Q9TWF0aC5tYXgoMTUsTWF0aC5taW4oODUsVCkpLGRlLmRyYWcuYW5nbGVEZWc9VCxkZS5kcmFnLnBvd2VyPU1hdGgubWF4KC4wOCxNYXRoLm1pbigxLFgvMjMwKSl9LFtdKSxfPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBJPWEuY3VycmVudDtJLmRyYWcuYWN0aXZlJiYoSS5kcmFnLnBvd2VyPj0uMTImJk0uY3VycmVudD09PSJydW5uaW5nIiYmYTAoSSksSS5kcmFnLmFjdGl2ZT0hMSl9LFtdKTtyZXR1cm4geC51c2VFZmZlY3QoKCk9Pnt1dCh1ZS5jdXJyZW50KTtsZXQgST0wO2NvbnN0IGRlPXNlPT57Y29uc3QgcGU9YS5jdXJyZW50LFdlPXBlLmxhc3Q/TWF0aC5taW4oNjAsc2UtcGUubGFzdCk6MTY7cGUubGFzdD1zZTtjb25zdCBHZT1NLmN1cnJlbnQ7a3gocGUsV2UsUnJbd2UuY3VycmVudF0sR2U9PT0icnVubmluZyIpLHBlLnNjb3JlIT09aC5jdXJyZW50JiYoaC5jdXJyZW50PXBlLnNjb3JlLFcocGUuc2NvcmUpLEJlKERyPT5EcisxKSk7Y29uc3QgTHQ9TWF0aC5jZWlsKHBlLnRpbWVMZWZ0LzEwMCkqMTAwO0x0IT09bS5jdXJyZW50JiYobS5jdXJyZW50PUx0LFMoTHQpKSxWKHBlLnN0cmVhayksb2UocGUubWFrZXMpLHllKHBlLmF0dGVtcHRzKSxrZShwZS5zd2lzaGVzKSxFZShwZS5iZXN0U3RyZWFrKTtjb25zdCBsdD1vLmN1cnJlbnQ7cGUuZXZMYXVuY2ghPT1sdC5sYXVuY2gmJihsdC5sYXVuY2g9cGUuZXZMYXVuY2gsRG4ubGF1bmNoKCkpLHBlLmV2UmltIT09bHQucmltJiYobHQucmltPXBlLmV2UmltLERuLnJpbSgpKSxwZS5ldkJvYXJkIT09bHQuYm9hcmQmJihsdC5ib2FyZD1wZS5ldkJvYXJkLERuLmJvYXJkKCkpLHBlLmV2Qm91bmNlIT09bHQuYm91bmNlJiYobHQuYm91bmNlPXBlLmV2Qm91bmNlLERuLmJvdW5jZSgpKSxwZS5ldlN3aXNoIT09bHQuc3dpc2gmJihsdC5zd2lzaD1wZS5ldlN3aXNoLERuLnN3aXNoKCkpLHBlLmV2U2NvcmUhPT1sdC5zY29yZSYmKGx0LnNjb3JlPXBlLmV2U2NvcmUsRG4uc2NvcmUoKSkscGUuZXZNaXNzIT09bHQubWlzcyYmKGx0Lm1pc3M9cGUuZXZNaXNzLERuLm1pc3MoKSkscGUuZXZCdXp6ZXIhPT1sdC5idXp6ZXImJihsdC5idXp6ZXI9cGUuZXZCdXp6ZXIsRG4uYnV6emVyKCkpLHBlLm92ZXImJiFwLmN1cnJlbnQmJihwLmN1cnJlbnQ9ITAsZmUoKSk7Y29uc3QganM9ZS5jdXJyZW50LFNzPXUuY3VycmVudDtpZihqcyYmU3Mudz4wKXtjb25zdCBEcj1qcy5nZXRDb250ZXh0KCIyZCIpO0RyJiZTeChEcixwZSxTcy53LEdlKX1JPXJlcXVlc3RBbmltYXRpb25GcmFtZShkZSl9O0k9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRlKTtjb25zdCBPPWwuY3VycmVudCxqPWUuY3VycmVudDtsZXQgZ2U9bnVsbDtpZihPJiZqKXtjb25zdCBzZT0oKT0+e2NvbnN0IHBlPU8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksV2U9TWF0aC5tYXgoMCxNYXRoLmZsb29yKE1hdGgubWluKHBlLndpZHRoLHBlLmhlaWdodCkpKSxHZT1NYXRoLm1pbigyLHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKTtqLndpZHRoPU1hdGgucm91bmQoV2UqR2UpLGouaGVpZ2h0PU1hdGgucm91bmQoV2UqR2UpLGouc3R5bGUud2lkdGg9YCR7V2V9cHhgLGouc3R5bGUuaGVpZ2h0PWAke1dlfXB4YCx1LmN1cnJlbnQ9e3c6V2UsaDpXZX07Y29uc3QgTHQ9ai5nZXRDb250ZXh0KCIyZCIpO0x0JiZMdC5zZXRUcmFuc2Zvcm0oR2UsMCwwLEdlLDAsMCl9O3NlKCksZ2U9bmV3IFJlc2l6ZU9ic2VydmVyKHNlKSxnZS5vYnNlcnZlKE8pfWNvbnN0IFg9c2U9Pntjb25zdCBwZT1zZS5rZXkudG9Mb3dlckNhc2UoKSxXZT1hLmN1cnJlbnQ7aWYocGU9PT0iYXJyb3dsZWZ0Inx8cGU9PT0iYSIpe3NlLnByZXZlbnREZWZhdWx0KCksV2UuYWltTD0hMDtyZXR1cm59aWYocGU9PT0iYXJyb3dyaWdodCJ8fHBlPT09ImQiKXtzZS5wcmV2ZW50RGVmYXVsdCgpLFdlLmFpbVI9ITA7cmV0dXJufWlmKHBlPT09IiAiKXtpZihzZS5wcmV2ZW50RGVmYXVsdCgpLCFzZS5yZXBlYXQpe2NvbnN0IEdlPU0uY3VycmVudDtHZT09PSJpZGxlInx8R2U9PT0ib3ZlciI/dmUoKTpHZT09PSJwYXVzZWQiP3hlKCk6R2U9PT0icnVubmluZyImJldlLmJhbGxNb2RlPT09InJlYWR5IiYmIVdlLmRyYWcuYWN0aXZlJiYoV2UuY2hhcmdpbmc9ITAsV2UuY2hhcmdlRGlyPTEsV2UucG93ZXI9MCl9cmV0dXJufWlmKHBlPT09InIiKXt2ZSgpO3JldHVybn1pZihwZT09PSJwInx8cGU9PT0iZXNjYXBlIil7Y29uc3QgR2U9TS5jdXJyZW50O0dlPT09InJ1bm5pbmciP0coKTpHZT09PSJwYXVzZWQiJiZ4ZSgpO3JldHVybn1pZihwZT09PSJtIil7eigpO3JldHVybn1wZT09PSIxIiYmZWUoInN0cmVldCIpLHBlPT09IjIiJiZlZSgicHJvIikscGU9PT0iMyImJmVlKCJsZWdlbmQiKX0sVD1zZT0+e2NvbnN0IHBlPXNlLmtleS50b0xvd2VyQ2FzZSgpLFdlPWEuY3VycmVudDsocGU9PT0iYXJyb3dsZWZ0Inx8cGU9PT0iYSIpJiYoV2UuYWltTD0hMSksKHBlPT09ImFycm93cmlnaHQifHxwZT09PSJkIikmJihXZS5haW1SPSExKSxwZT09PSIgIiYmKFdlLmNoYXJnaW5nJiZNLmN1cnJlbnQ9PT0icnVubmluZyImJmEwKFdlKSxXZS5jaGFyZ2luZz0hMSl9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixYKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5dXAiLFQpO2NvbnN0IGJlPSgpPT57ZG9jdW1lbnQuaGlkZGVuJiZNLmN1cnJlbnQ9PT0icnVubmluZyImJkcoKX0sbmU9KCk9PnthLmN1cnJlbnQuYWltTD0hMSxhLmN1cnJlbnQuYWltUj0hMSxhLmN1cnJlbnQuY2hhcmdpbmc9ITEsYS5jdXJyZW50LmRyYWcuYWN0aXZlPSExLE0uY3VycmVudD09PSJydW5uaW5nIiYmRygpfTtyZXR1cm4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsYmUpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixuZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShJKSxKKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLFgpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXl1cCIsVCksZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsYmUpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixuZSksZ2UmJmdlLmRpc2Nvbm5lY3QoKX19LFtlZSxKLGZlLEcseGUsdmUsel0pLHtjYW52YXNSZWY6ZSx3cmFwUmVmOmwscGhhc2U6dixzY29yZTpSLHRpbWVMZWZ0OlEsc3RyZWFrOkgsbWFrZXM6cSxhdHRlbXB0czpaLHN3aXNoZXM6U2UsYmVzdFN0cmVhazpQZSxwb3BLZXk6T2UsaXNOZXdCZXN0OnplLGRpZmZpY3VsdHk6TGUsYmVzdHM6VSxtdXRlZDprLGFjdGlvbnM6e3N0YXJ0OnZlLHByaW1hcnk6YWUscGF1c2VHYW1lOkcscmVzdW1lR2FtZTp4ZSxjaGFuZ2VEaWZmaWN1bHR5OmVlLHRvZ2dsZU11dGU6eixvblBvaW50ZXJEb3duOmllLG9uUG9pbnRlck1vdmU6WSxvblBvaW50ZXJVcDpffX19Y29uc3QgbzA9W3tpZDoic3RyZWV0IixsYWJlbDoiU3RyZWV0Iix0YWc6Ik5vIHdpbmQsIHN0ZWFkeSByaW0iLGRvdHM6MX0se2lkOiJwcm8iLGxhYmVsOiJQcm8iLHRhZzoiQnJlZXplcywgcmltIGRyaWZ0cyIsZG90czoyfSx7aWQ6ImxlZ2VuZCIsbGFiZWw6IkxlZ2VuZCIsdGFnOiJHYWxlcywgcm9hbWluZyByaW0iLGRvdHM6M31dO2Z1bmN0aW9uIFJ4KHtjbGFzc05hbWU6ZT0iaC04IHctOCJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgiY2lyY2xlIix7Y3g6IjE2IixjeToiMTYiLHI6IjEzIixmaWxsOiIjZjA3ZjI0In0pLHIuanN4KCJwYXRoIix7ZDoiTTMgMTZoMjZNMTYgM3YyNiIsc3Ryb2tlOiIjNWMyYTA4IixzdHJva2VXaWR0aDoiMS42In0pLHIuanN4KCJwYXRoIix7ZDoiTTcgNi41YzQgMy40IDQgMTUuNiAwIDE5TTI1IDYuNWMtNCAzLjQtNCAxNS42IDAgMTkiLHN0cm9rZToiIzVjMmEwOCIsc3Ryb2tlV2lkdGg6IjEuNiIsZmlsbDoibm9uZSJ9KSxyLmpzeCgiY2lyY2xlIix7Y3g6IjE2IixjeToiMTYiLHI6IjEzIixzdHJva2U6IiNmZmQxNjYiLHN0cm9rZVdpZHRoOiIxLjQiLG9wYWNpdHk6IjAuNyJ9KV19KX1mdW5jdGlvbiBCYSh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTB9KXtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjplfSksci5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHthPyJhbmltYXRlLXBvcCB0ZXh0LWFtYmVyZ2xvdy00MDAiOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmx9LHUpXX0pfWZ1bmN0aW9uIENyKHtrZXlzTGlzdDplLGFjdGlvbjpsfSl7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjplfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmx9KV19KX1mdW5jdGlvbiBDeCgpe3JldHVybiB0eXBlb2Ygd2luZG93PCJ1IiYmd2luZG93Lm1hdGNoTWVkaWEoIihwb2ludGVyOiBjb2Fyc2UpIikubWF0Y2hlcz9yLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJteC1hdXRvIG10LTMgZmxleCB3LWZ1bGwgbWF4LXctWzQ2MHB4XSBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwIHB4LTIgcHktMSIsY2hpbGRyZW46IkRyYWcgb24gdGhlIGNvdXJ0IOKAlCBwdWxsIHRvd2FyZCB0aGUgaG9vcCB0byBhaW0sIHJlbGVhc2UgdG8gc2hvb3QifSl9KTpudWxsfWZ1bmN0aW9uIFR4KCl7Y29uc3QgZT1NeCgpLHthY3Rpb25zOmwscGhhc2U6YX09ZSx1PWE9PT0icnVubmluZyIsZD1NYXRoLm1heCgwLGUudGltZUxlZnQvMWUzKSxvPWQ8PTEwLHA9ZS5zdHJlYWs+PTQ/NDplLnN0cmVhaz49Mz8zOmUuc3RyZWFrPj0yPzI6MTtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3IuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbci5qc3goQmEse2xhYmVsOiJTY29yZSIsdmFsdWU6ZS5zY29yZSxhY2NlbnQ6ITAscG9wOmUucG9wS2V5fSksci5qc3goQmEse2xhYmVsOiJDbG9jayIsdmFsdWU6ci5qc3goInNwYW4iLHtjbGFzc05hbWU6bz8iYW5pbWF0ZS1wdWxzZS1zb2Z0IHRleHQtYXBwbGUtNDAwIFt0ZXh0LXNoYWRvdzowXzBfMTJweF9yZ2JhKDI1NSwxMDcsMTA3LDAuNildIjoidGV4dC1bI2ZmOWEzY10gW3RleHQtc2hhZG93OjBfMF8xMnB4X3JnYmEoMjU1LDE1NCw2MCwwLjQpXSIsY2hpbGRyZW46ZC50b0ZpeGVkKDEpfSl9KSxyLmpzeChCYSx7bGFiZWw6IlN0cmVhayIsdmFsdWU6ZS5zdHJlYWs+MD9yLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ZS5zdHJlYWs+PTM/InRleHQtWyNmZjhjNDJdIjoidGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46W2Uuc3RyZWFrLCIgIixyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6InRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46WyLDlyIscF19KV19KToi4oCUIn0pLHIuanN4KEJhLHtsYWJlbDoiQnVja2V0cyIsdmFsdWU6YCR7ZS5tYWtlc30vJHtlLmF0dGVtcHRzfWB9KV19KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6dT8iUGF1c2UiOiJSZXN1bWUiLHRpdGxlOnU/IlBhdXNlIChQKSI6IlJlc3VtZSAoUCkiLG9uQ2xpY2s6dT9sLnBhdXNlR2FtZTpsLnJlc3VtZUdhbWUsZGlzYWJsZWQ6IXUmJmEhPT0icGF1c2VkIixjaGlsZHJlbjp1P3IuanN4KGd0LHt9KTpyLmpzeChfZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6IlJlcGxheSIsdGl0bGU6IlJlcGxheSAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1jcm9zc2hhaXIiLG9uUG9pbnRlckRvd246bC5vblBvaW50ZXJEb3duLG9uUG9pbnRlck1vdmU6bC5vblBvaW50ZXJNb3ZlLG9uUG9pbnRlclVwOmwub25Qb2ludGVyVXAsb25Qb2ludGVyQ2FuY2VsOmwub25Qb2ludGVyVXAsb25Db250ZXh0TWVudTpoPT5oLnByZXZlbnREZWZhdWx0KCl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTIgei0yMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46WyJsZWZ0LTAgdG9wLTAgYm9yZGVyLWwtMiBib3JkZXItdC0yIiwicmlnaHQtMCB0b3AtMCBib3JkZXItci0yIGJvcmRlci10LTIiLCJsZWZ0LTAgYm90dG9tLTAgYm9yZGVyLWwtMiBib3JkZXItYi0yIiwicmlnaHQtMCBib3R0b20tMCBib3JkZXItci0yIGJvcmRlci1iLTIiXS5tYXAoaD0+ci5qc3goInNwYW4iLHtjbGFzc05hbWU6YGFic29sdXRlIGgtNCB3LTQgYm9yZGVyLVsjZmY5YTNjXS80MCAke2h9YH0saCkpfSksYT09PSJpZGxlIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzE3MTAyMl0vODUgcC02IHRleHQtY2VudGVyIGJhY2tkcm9wLWJsdXItWzJweF0iLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltyLmpzeChSeCx7Y2xhc3NOYW1lOiJoLTE0IHctMTQifSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1vcmFuZ2UgZm9udC1kaXNwbGF5IHRleHQtMnhsIHNtOnRleHQtM3hsIixjaGlsZHJlbjoiSE9PUFNUT1JNIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgbXQtMiB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1bI2M5YjhlMF0iLGNoaWxkcmVuOiJCRUFUIFRIRSBCVVpaRVIifSldfSldfSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFRpcC1PZmYiXX0pfSksci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJQUkVTUyBTUEFDRSBPUiBUQVAgVEhFIENPVVJUIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3IuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IuKGkCDihpIifSksIiBhaW0iXX0pLHIuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IkhvbGQgU3BhY2UifSksIiBwb3dlciDCtyByZWxlYXNlIHRvIHNob290Il19KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToic206aGlkZGVuIixjaGlsZHJlbjoiRHJhZyBvbiB0aGUgY291cnQgdG8gYWltICYgc2hvb3QifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxyLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiB0aW1lb3V0Il19KV19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBDT1VSVCBSRUNPUkQg4piFIn0pXX0pLGE9PT0icGF1c2VkIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzE3MTAyMl0vODAgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLW9yYW5nZSBmb250LWRpc3BsYXkgdGV4dC14bCIsY2hpbGRyZW46IlRJTUVPVVQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3IuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucmVzdW1lR2FtZSxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIEJhY2sgSW4iXX0pfSksci5qc3goQWUse29uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlcGxheSJdfSl9KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSksIiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJtbC0xIixjaGlsZHJlbjoicmVzdW1lcyJ9KV19KV19KSxhPT09Im92ZXIiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMTcxMDIyXS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1hcHBsZS00MDAgW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDEwNywxMDcsMC41KV0gc206dGV4dC0yeGwiLGNoaWxkcmVuOiJGSU5BTCBCVVpaRVIifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtZW5kIGdhcC02IixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU0NPUkUifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOmUuc2NvcmV9KV19KSxyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCRVNUIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5iZXN0c1tlLmRpZmZpY3VsdHldfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTMgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCVUNLRVRTIn0pLHIuanN4cygicCIse2NsYXNzTmFtZToidGV4dC1zbSBmb250LWJvbGQgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46W2UubWFrZXMsIi8iLGUuYXR0ZW1wdHNdfSldfSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU1dJU0hFUyJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToidGV4dC1zbSBmb250LWJvbGQgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5zd2lzaGVzfSldfSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiVE9QIFNUUkVBSyJ9KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6InRleHQtc20gZm9udC1ib2xkIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOlsiw5ciLGUuYmVzdFN0cmVha119KV19KV19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBDT1VSVCBSRUNPUkQg4piFIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSdW4gSXQgQmFjayJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSksci5qc3goQ3gse30pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6Im10LTQgZmxleCBqdXN0aWZ5LWNlbnRlciIsY2hpbGRyZW46ci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5wcmltYXJ5LGNsYXNzTmFtZToibWluLXctWzIyMHB4XSIsY2hpbGRyZW46ci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIixjaGlsZHJlbjphPT09InJ1bm5pbmciP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goZ3Qse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFRpbWVvdXQiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBCYWNrIEluIl19KTphPT09Im92ZXIiP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJ1biBJdCBCYWNrIl19KTpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBUaXAtT2ZmIl19KX0pfSl9KV19KSxyLmpzeHMoImFzaWRlIix7Y2xhc3NOYW1lOiJncmlkIGNvbnRlbnQtc3RhcnQgZ2FwLTQiLGNoaWxkcmVuOltyLmpzeHMocnQse3RpdGxlOiJTY29yaW5nIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjaGlsZHJlbjoiQnVja2V0IGluc2lkZSB0aGUgYXJjIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiMiBwdHMifSldfSksci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjaGlsZHJlbjoiQmVoaW5kIHRoZSBjaGFsayAzUFQgbGluZSJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46IjMgcHRzIn0pXX0pLHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2hpbGRyZW46IlNXSVNIIOKAlCBub3RoaW5nIGJ1dCBuZXQifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRhYnVsYXItbnVtcyB0ZXh0LWFtYmVyZ2xvdy0zMDAiLGNoaWxkcmVuOiIrMiJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NoaWxkcmVuOiJDb25zZWN1dGl2ZSBtYWtlcyJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46InVwIHRvIMOXNCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NoaWxkcmVuOiJCdXp6ZXIgYmVhdGVyIChhaXIgYmFsbCBhdCAwKSJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtYXBwbGUtNDAwIixjaGlsZHJlbjoiKzUifSldfSldfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiV2luZCBiZW5kcyBldmVyeSBzaG90IOKAlCB3YXRjaCB0aGUgZmxhZy4gQ3JhdGVzIHJhaXNlIHlvdXIgcmVsZWFzZSBwb2ludC4ifSldfSksci5qc3goZG4se3RpdGxlOiJDb3VydCIsb3B0aW9uczpvMCx2YWx1ZTplLmRpZmZpY3VsdHksb25DaGFuZ2U6bC5jaGFuZ2VEaWZmaWN1bHR5LGRpc2FibGVkOmE9PT0icnVubmluZyJ8fGE9PT0icmVhZHkifHxhPT09InBhdXNlZCJ9KSxyLmpzeChwbix7YmVzdHM6ZS5iZXN0cyxvcHRpb25zOm8wLGFjdGl2ZTplLmRpZmZpY3VsdHl9KSxyLmpzeHMocnQse3RpdGxlOiJDb250cm9scyIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4KENyLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiLihpAifSksci5qc3goQSx7Y2hpbGRyZW46IuKGkiJ9KV19KSxhY3Rpb246IkFpbSBhcmMifSksci5qc3goQ3Ise2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJIb2xkIFNwYWNlIn0pLGFjdGlvbjoiQ2hhcmdlIHBvd2VyIn0pLHIuanN4KENyLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiUmVsZWFzZSJ9KSxhY3Rpb246IlNob290In0pLHIuanN4KENyLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJUaW1lb3V0In0pLHIuanN4KENyLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiUiJ9KSxhY3Rpb246IlJlcGxheSJ9KSxyLmpzeChDcix7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiMSJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiMiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiMyJ9KV19KSxhY3Rpb246IkNvdXJ0In0pLHIuanN4KENyLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiTSJ9KSxhY3Rpb246IlNvdW5kIn0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IlRvdWNoOiBkcmFnIGFueXdoZXJlIG9uIHRoZSBjb3VydCDigJQgdGhlIGRhc2hlZCBhcmMgYW5kIHBvd2VyIHJpbmcgc2hvdyB5b3VyIHNob3QsIHJlbGVhc2UgdG8gZmlyZS4ifSldfSldfSldfSldfSl9Y29uc3QgcHM9e2pvZzp7bGFiZWw6IkpPRyIsdGFnOiJ3YXJtLXVwIHBhY2UiLGRvdHM6MSxiYXNlU3BlZWQ6MjU1LGFjY2VsOjUuNSxnYXBNaW46LjY2LGdhcE1heDoxLjIsZHJvbmVDaGFuY2U6LjE4LGp1bXBWOjU0MH0scnVzaDp7bGFiZWw6IlJVU0giLHRhZzoiY2l0eSB0cmFmZmljIixkb3RzOjIsYmFzZVNwZWVkOjMwNSxhY2NlbDo3LjUsZ2FwTWluOi41NixnYXBNYXg6MS4wMixkcm9uZUNoYW5jZTouMjcsanVtcFY6NTYwfSxibGl0ejp7bGFiZWw6IkJMSVRaIix0YWc6Im91dHJ1biB0aGUgZ3JpZCIsZG90czozLGJhc2VTcGVlZDozNjAsYWNjZWw6MTAsZ2FwTWluOi40OCxnYXBNYXg6LjksZHJvbmVDaGFuY2U6LjM2LGp1bXBWOjU4NX19LHdjPTYwMCxjbj00NjgsSW49MTMyLEVyPShlLGwpPT5lK01hdGgucmFuZG9tKCkqKGwtZSksUHg9ZT0+ZVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqZS5sZW5ndGgpXTtmdW5jdGlvbiBjYyhlLGw9ITEpe3JldHVybnt0aW1lOjAsbGFzdDowLGRlbW86bCxzcGVlZDpsPzI3MDplLmJhc2VTcGVlZCxkaXN0OjAsc2NvcmU6MCxjb2luczowLHBsYXllcjp7eTpjbix2eTowLHNsaWRpbmc6ITEsb25Hcm91bmQ6ITAscm90OjB9LHNsaWRlSGVsZDohMSxvYnN0YWNsZXM6W10sY29pbkl0ZW1zOltdLHNwYXduVDo5MDAscGFydGljbGVzOltdLGZsb2F0ZXJzOltdLHNoYWtlOjAsZHlpbmc6MCxldkp1bXA6MCxldkNvaW46MCxldkhpdDowLGV2U2xpZGU6MH19ZnVuY3Rpb24gVmEoZSxsLGEsdSxkKXtjb25zdCBvPU1hdGgubWluKDIwMCxlLnBhcnRpY2xlcy5sZW5ndGgrZCk7Zm9yKGxldCBwPWUucGFydGljbGVzLmxlbmd0aDtwPG87cCsrKXtjb25zdCBoPUVyKDAsTWF0aC5QSSoyKSxtPUVyKDMwLDIyMCksZz1FcigzMDAsNzUwKTtlLnBhcnRpY2xlcy5wdXNoKHt4OmwseTphLHZ4Ok1hdGguY29zKGgpKm0sdnk6TWF0aC5zaW4oaCkqbS02MCxsaWZlOmcsbWF4TGlmZTpnLHNpemU6RXIoMS41LDMuNCksY29sb3I6UHgodSksZHJhZzoyLGdyYXY6NjB9KX19ZnVuY3Rpb24gYmMoZSxsKXtjb25zdCBhPWUucGxheWVyO2UuZHlpbmc+MHx8IWEub25Hcm91bmR8fChhLnZ5PS1sLmp1bXBWLGEub25Hcm91bmQ9ITEsYS5zbGlkaW5nPSExLGUuZXZKdW1wKyssVmEoZSxJbixjbixbIiM0ZGQ4YzAiLCIjZmZmZmZmIl0sNikpfWZ1bmN0aW9uIEV4KGUpe2NvbnN0IGE9ZS5wbGF5ZXIuc2xpZGluZz8yNjo1NDtyZXR1cm57eDpJbi0xMyx5OmUucGxheWVyLnktYSx3OjI2LGg6YX19ZnVuY3Rpb24gTHgoZSxsLGEpe3JldHVybiBlLngrYTxsLngrbC53LWEmJmUueCtlLnctYT5sLngrYSYmZS55K2E8bC55K2wuaC1hJiZlLnkrZS5oLWE+bC55K2F9ZnVuY3Rpb24gQXgoZSxsKXtjb25zdCBhPU1hdGgucmFuZG9tKCksdT13Yys2MDtpZihhPGwuZHJvbmVDaGFuY2Upe2lmKGUub2JzdGFjbGVzLnB1c2goe2tpbmQ6ImRyb25lIix4OnUsdzo1MixoOjQwLHk6Y24tODgscGFzc2VkOiExfSksTWF0aC5yYW5kb20oKTwuNSlmb3IobGV0IGQ9MDtkPDM7ZCsrKWUuY29pbkl0ZW1zLnB1c2goe3g6dS02MC1kKjM0LHk6Y24tMzQsdGFrZW46ITF9KX1lbHNlIGlmKGE8bC5kcm9uZUNoYW5jZSsuNTUpe2NvbnN0IGQ9RXIoMzQsNjIpLG89RXIoMjQsNDApO2Uub2JzdGFjbGVzLnB1c2goe2tpbmQ6ImJhcnJpZXIiLHg6dSx3Om8saDpkLHk6Y24tZCxwYXNzZWQ6ITF9KTtjb25zdCBwPU1hdGgucmFuZG9tKCk8LjY/MzowO2ZvcihsZXQgaD0wO2g8cDtoKyspZS5jb2luSXRlbXMucHVzaCh7eDp1K28vMi0zNCtoKjM0LHk6Y24tZC00Nix0YWtlbjohMX0pfWVsc2UgZm9yKGxldCBkPTA7ZDw0O2QrKyllLmNvaW5JdGVtcy5wdXNoKHt4OnUrZCozNCx5OmNuLTQwLU1hdGguc2luKGQvMypNYXRoLlBJKSo0Nix0YWtlbjohMX0pfWZ1bmN0aW9uIER4KGUsbCl7ZS5keWluZz1sLGUucGxheWVyLnZ5PS0zMzAsZS5wbGF5ZXIub25Hcm91bmQ9ITEsZS5zaGFrZT0xNSxlLmV2SGl0KyssVmEoZSxJbixlLnBsYXllci55LTI2LFsiI2ZmNWRhMiIsIiNmZmQxNjYiLCIjZmZmZmZmIiwiIzRkZDhjMCJdLDMwKX1mdW5jdGlvbiBJeChlLGwsYSx1LGQpe2NvbnN0IG89bC8xZTM7ZS50aW1lKz1sLGUuc2hha2U9TWF0aC5tYXgoMCxlLnNoYWtlLWwqLjA0NSk7Zm9yKGxldCBnPWUucGFydGljbGVzLmxlbmd0aC0xO2c+PTA7Zy0tKXtjb25zdCB2PWUucGFydGljbGVzW2ddO2lmKHYubGlmZS09bCx2LmxpZmU8PTApe2NvbnN0IHc9ZS5wYXJ0aWNsZXMucG9wKCk7dyYmZzxlLnBhcnRpY2xlcy5sZW5ndGgmJihlLnBhcnRpY2xlc1tnXT13KTtjb250aW51ZX12LnZ4LT12LnZ4KnYuZHJhZypvLHYudnkrPXYuZ3JhdipvLXYudnkqdi5kcmFnKm8sdi54Kz12LnZ4Km8sdi55Kz12LnZ5Km99Zm9yKGxldCBnPWUuZmxvYXRlcnMubGVuZ3RoLTE7Zz49MDtnLS0pZS5mbG9hdGVyc1tnXS5saWZlLT1sLGUuZmxvYXRlcnNbZ10ubGlmZTw9MCYmZS5mbG9hdGVycy5zcGxpY2UoZywxKTtpZighZClyZXR1cm47Y29uc3QgcD1lLnBsYXllcjtpZihlLmR5aW5nPjApe3AudnkrPTE1MDAqbyxwLnkrPXAudnkqbyxwLnJvdCs9OSpvO3JldHVybn1pZihlLmRlbW98fChlLnNwZWVkPU1hdGgubWluKDcyMCxlLnNwZWVkK3UuYWNjZWwqbykpLGUuZGlzdCs9ZS5zcGVlZCpvLGUuc2NvcmU9TWF0aC5mbG9vcihlLmRpc3QqLjEyKStlLmNvaW5zKjI1LGUuc3Bhd25ULT1sLGUuc3Bhd25UPD0wKXtBeChlLHUpO2NvbnN0IGc9MzAwL2Uuc3BlZWQ7ZS5zcGF3blQ9RXIodS5nYXBNaW4sdS5nYXBNYXgpKjFlMypnfWNvbnN0IG09ZS5zbGlkZUhlbGQ7aWYobSYmcC5vbkdyb3VuZCYmIXAuc2xpZGluZz8ocC5zbGlkaW5nPSEwLGUuZXZTbGlkZSsrKTohbSYmcC5zbGlkaW5nJiYocC5zbGlkaW5nPSExKSxwLm9uR3JvdW5kfHwocC52eSs9MTY1MCpvLHAueSs9cC52eSpvLHAueT49Y24mJihwLnk9Y24scC52eT0wLHAub25Hcm91bmQ9ITAsVmEoZSxJbixjbixbIiM0ZGQ4YzAiXSw0KSkpLGUuZGVtbyl7Y29uc3QgZz1lLm9ic3RhY2xlcy5maW5kKHc9PncueC1Jbj4tMjAmJncueC1JbjwxMzApO2c/Zy5raW5kPT09ImJhcnJpZXIiJiZwLm9uR3JvdW5kP2JjKGUsdSk6Zy5raW5kPT09ImRyb25lIiYmKGUuc2xpZGVIZWxkPSEwKTplLnNsaWRlSGVsZD0hMTtjb25zdCB2PWUuc2xpZGVIZWxkO3YmJnAub25Hcm91bmQmJiFwLnNsaWRpbmc/cC5zbGlkaW5nPSEwOiF2JiZwLnNsaWRpbmcmJihwLnNsaWRpbmc9ITEpfWZvcihsZXQgZz1lLm9ic3RhY2xlcy5sZW5ndGgtMTtnPj0wO2ctLSl7Y29uc3Qgdj1lLm9ic3RhY2xlc1tnXTtpZih2LngtPWUuc3BlZWQqbyx2Lngrdi53PC02MCl7ZS5vYnN0YWNsZXMuc3BsaWNlKGcsMSk7Y29udGludWV9Y29uc3Qgdz1FeChlKSxNPXt4OnYueCx5OnYueSx3OnYudyxoOnYuaH07aWYoIWUuZGVtbyYmTHgodyxNLDUpKXtEeChlLGEpO3JldHVybn0hdi5wYXNzZWQmJnYueCt2Lnc8SW4tMTQmJih2LnBhc3NlZD0hMCl9Zm9yKGxldCBnPWUuY29pbkl0ZW1zLmxlbmd0aC0xO2c+PTA7Zy0tKXtjb25zdCB2PWUuY29pbkl0ZW1zW2ddO2lmKHYueC09ZS5zcGVlZCpvLHYueDwtNDApe2UuY29pbkl0ZW1zLnNwbGljZShnLDEpO2NvbnRpbnVlfSF2LnRha2VuJiZNYXRoLmh5cG90KHYueC1Jbix2LnktKHAueS0yOCkpPDM0JiYodi50YWtlbj0hMCxlLmNvaW5zKyssZS5ldkNvaW4rKyxlLmZsb2F0ZXJzLnB1c2goe3g6di54LHk6di55LTEwLHR4dDoiKzI1IixsaWZlOjYwMCxtYXhMaWZlOjYwMCxjb2xvcjoiI2ZmZDE2NiJ9KSxWYShlLHYueCx2LnksWyIjZmZkMTY2IiwiI2ZmZjNjNCJdLDcpLGUuY29pbkl0ZW1zLnNwbGljZShnLDEpKX19Y29uc3QgbHI9ZT0+e2NvbnN0IGw9TWF0aC5zaW4oZSoxMjcuMSkqNDM3NTguNTQ1MztyZXR1cm4gbC1NYXRoLmZsb29yKGwpfTtmdW5jdGlvbiBfeChlLGwsYSx1LGQpe2NvbnN0IG89YS93YztlLnNhdmUoKSxlLmNsZWFyUmVjdCgwLDAsYSx1KSxsLnNoYWtlPjAmJmUudHJhbnNsYXRlKChNYXRoLnJhbmRvbSgpLS41KSpsLnNoYWtlLChNYXRoLnJhbmRvbSgpLS41KSpsLnNoYWtlKTtjb25zdCBwPWNuKm8saD1sLnRpbWUsbT1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLHApO20uYWRkQ29sb3JTdG9wKDAsIiMxMjA4MWYiKSxtLmFkZENvbG9yU3RvcCguNTUsIiMzNTEwM2YiKSxtLmFkZENvbG9yU3RvcCgxLCIjN2MyYTYyIiksZS5maWxsU3R5bGU9bSxlLmZpbGxSZWN0KDAsMCxhLHApO2NvbnN0IGc9cC03NCpvLHY9NTgqbyx3PWUuY3JlYXRlTGluZWFyR3JhZGllbnQoMCxnLXYsMCxnK3YpO3cuYWRkQ29sb3JTdG9wKDAsIiNmZmQxNjYiKSx3LmFkZENvbG9yU3RvcCgxLCIjZmY1ZGEyIiksZS5maWxsU3R5bGU9dyxlLmJlZ2luUGF0aCgpLGUuYXJjKGEqLjYyLGcsdiwwLE1hdGguUEkqMiksZS5maWxsKCksZS5maWxsU3R5bGU9IiMzNTEwM2YiO2ZvcihsZXQgWj0wO1o8NTtaKyspe2NvbnN0IHllPWcrdiooLjErWiouMik7ZS5maWxsUmVjdChhKi42Mi12LHllLHYqMixNYXRoLm1heCgxLjUsKDEuNStaKjEuMykqbykpfWZvcihjb25zdCBaIG9mWzAsMV0pe2NvbnN0IHllPVo9PT0wPy4xODouNDIsU2U9d2MrMTIwLGtlPWwuZGlzdCp5ZSVTZTtlLmZpbGxTdHlsZT1aPT09MD8iIzI0MTAzNiI6IiMxYTBiMmIiO2NvbnN0IFBlPTE1O2ZvcihsZXQgRWU9MDtFZTxQZTtFZSsrKXtjb25zdCBPZT1FZStaKjU3LEJlPSg0NitscihPZSkqNjIpKm8semU9KDcwK2xyKE9lKzExKSooWj09PTA/MTIwOjE3MCkpKm8sRmU9KChFZSooU2UvUGUpLWtlKSVTZStTZSklU2UtNjAqbztpZihlLmZpbGxSZWN0KEZlLHAtemUsQmUsemUpLFo9PT0xJiZscihPZSszKT4uNCl7ZS5maWxsU3R5bGU9bHIoT2UrNyk+LjU/IiNmZjVkYTIiOiIjNGRkOGMwIjtjb25zdCBMZT0zO2ZvcihsZXQgamU9MDtqZTxMZTtqZSsrKWxyKE9lK2plKjEzKT4uNDUmJihlLmdsb2JhbEFscGhhPS43LGUuZmlsbFJlY3QoRmUrNipvK2plKjEyKm8scC16ZSsxMCpvK2xyKE9lK2plKSo0MCpvLDQqbyw2Km8pLGUuZ2xvYmFsQWxwaGE9MSk7ZS5maWxsU3R5bGU9IiMxYTBiMmIifX19ZS5maWxsU3R5bGU9IiMxMjA4MWYiLGUuZmlsbFJlY3QoMCxwLGEsdS1wKSxlLmZpbGxTdHlsZT0iI2ZmNWRhMiIsZS5maWxsUmVjdCgwLHAtMS41LGEsMyksZS5zYXZlKCksZS5zaGFkb3dDb2xvcj0iI2ZmNWRhMiIsZS5zaGFkb3dCbHVyPTE0Km8sZS5maWxsUmVjdCgwLHAtMSxhLDIpLGUucmVzdG9yZSgpLGUuc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDkzLDE2MiwwLjI1KSIsZS5saW5lV2lkdGg9MTtjb25zdCBNPTQ2Km8sUj1sLmRpc3QqbyVNO2ZvcihsZXQgWj0tUjtaPGE7Wis9TSllLmJlZ2luUGF0aCgpLGUubW92ZVRvKFoscCksZS5saW5lVG8oWi0yNipvLHUpLGUuc3Ryb2tlKCk7aWYobC5zcGVlZD4zODApe2Uuc3Ryb2tlU3R5bGU9InJnYmEoNzcsMjE2LDE5MiwwLjIyKSIsZS5saW5lV2lkdGg9MS41Km87Zm9yKGxldCBaPTA7Wjw3O1orKyl7Y29uc3QgeWU9bHIoWitNYXRoLmZsb29yKGgvOTApKSpwKi44LFNlPWxyKFoqMytNYXRoLmZsb29yKGgvOTApKSphLGtlPSgzMCtsLnNwZWVkKi4xMikqbztlLmJlZ2luUGF0aCgpLGUubW92ZVRvKFNlLHllKSxlLmxpbmVUbyhTZS1rZSx5ZSksZS5zdHJva2UoKX19Zm9yKGNvbnN0IFogb2YgbC5jb2luSXRlbXMpe2NvbnN0IHllPVoueCpvLFNlPVoueSpvLGtlPU1hdGguYWJzKE1hdGguc2luKGgqLjAwNitaLngqLjA1KSk7ZS5zYXZlKCksZS5zaGFkb3dDb2xvcj0iI2ZmZDE2NiIsZS5zaGFkb3dCbHVyPTgqbyxlLmZpbGxTdHlsZT0iI2ZmZDE2NiIsZS5iZWdpblBhdGgoKSxlLmVsbGlwc2UoeWUsU2UsOSpvKk1hdGgubWF4KC4yNSxrZSksOSpvLDAsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuZmlsbFN0eWxlPSIjYjk4YzJlIixlLmJlZ2luUGF0aCgpLGUuZWxsaXBzZSh5ZSxTZSw1Km8qTWF0aC5tYXgoLjI1LGtlKSw1Km8sMCwwLE1hdGguUEkqMiksZS5maWxsKCksZS5yZXN0b3JlKCl9Zm9yKGNvbnN0IFogb2YgbC5vYnN0YWNsZXMpe2NvbnN0IHllPVoueCpvO2lmKFoua2luZD09PSJiYXJyaWVyIil7Y29uc3QgU2U9Wi5oKm8sa2U9Wi53Km87ZS5maWxsU3R5bGU9IiNkNjRmOGMiLGUuZmlsbFJlY3QoeWUscC1TZSxrZSxTZSksZS5maWxsU3R5bGU9IiNmZjVkYTIiLGUuZmlsbFJlY3QoeWUscC1TZSxrZSw0Km8pLGUuZmlsbFN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMjUpIjtmb3IobGV0IFBlPTA7UGU8MztQZSsrKWUuZmlsbFJlY3QoeWUrMypvK1BlKjkqbyxwLVNlKzcqbyw0Km8sU2UtMTIqbyl9ZWxzZXtjb25zdCBTZT0oWi55K1ouaC8yKSpvLGtlPVoudypvLFBlPTE2Km87ZS5zYXZlKCksZS5zaGFkb3dDb2xvcj0iIzYyZTZmZiIsZS5zaGFkb3dCbHVyPTEwKm8sZS5maWxsU3R5bGU9IiMyYjZhODAiLGUuYmVnaW5QYXRoKCksZS5lbGxpcHNlKHllK2tlLzIsU2Usa2UvMixQZS8yLDAsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUuZmlsbFN0eWxlPSIjNjJlNmZmIixlLmJlZ2luUGF0aCgpLGUuZWxsaXBzZSh5ZStrZS8yLFNlLTIqbyxrZS8yLjYsUGUvMy4yLDAsMCxNYXRoLlBJKjIpLGUuZmlsbCgpLGUucmVzdG9yZSgpLGUuc3Ryb2tlU3R5bGU9InJnYmEoOTgsMjMwLDI1NSwwLjUpIixlLmxpbmVXaWR0aD0xLjUqbztjb25zdCBFZT1rZS8xLjYqKC41Ky41Kk1hdGguYWJzKE1hdGguc2luKGgqLjA1KSkpO2UuYmVnaW5QYXRoKCksZS5tb3ZlVG8oeWUra2UvMi1FZSxTZS0xMCpvKSxlLmxpbmVUbyh5ZStrZS8yK0VlLFNlLTEwKm8pLGUuc3Ryb2tlKCksTWF0aC5mbG9vcihoLzIyMCklMj09PTAmJihlLmZpbGxTdHlsZT0iI2ZmNWQ1ZCIsZS5iZWdpblBhdGgoKSxlLmFyYyh5ZStrZS8yLFNlKzQqbywyLjQqbywwLE1hdGguUEkqMiksZS5maWxsKCkpfX1jb25zdCBXPWwucGxheWVyLFE9SW4qbyxTPVcueSpvO2Uuc2F2ZSgpLGUudHJhbnNsYXRlKFEsUyksbC5keWluZz4wJiZlLnJvdGF0ZShXLnJvdCksZS5zaGFkb3dDb2xvcj0iIzRkZDhjMCIsZS5zaGFkb3dCbHVyPTEyKm87Y29uc3QgSD1sLmRpc3QqLjA5LFY9TWF0aC5zaW4oSCkqLjkscT1NYXRoLnNpbihIK01hdGguUEkpKi45O2lmKGUuc3Ryb2tlU3R5bGU9IiM0ZGQ4YzAiLGUubGluZVdpZHRoPTUqbyxlLmxpbmVDYXA9InJvdW5kIixXLnNsaWRpbmcpZS5iZWdpblBhdGgoKSxlLm1vdmVUbygtMTYqbywtOCpvKSxlLmxpbmVUbygxNCpvLC0xMCpvKSxlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSIjNGRkOGMwIixlLmJlZ2luUGF0aCgpLGUuYXJjKDE2Km8sLTEyKm8sNypvLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLmZpbGxTdHlsZT0iI2U5ZmZmYSIsZS5maWxsUmVjdCgxNSpvLC0xNCpvLDcqbywzLjUqbyk7ZWxzZXtjb25zdCBaPSFXLm9uR3JvdW5kO2UuYmVnaW5QYXRoKCksZS5tb3ZlVG8oMCwtMjIqbyksZS5saW5lVG8oTWF0aC5zaW4oWj8uNzpWKSoxMipvLFo/LTgqbzowKSxlLm1vdmVUbygwLC0yMipvKSxlLmxpbmVUbyhNYXRoLnNpbihaPy0uNzpxKSoxMipvLFo/LTQqbzowKSxlLnN0cm9rZSgpLGUuYmVnaW5QYXRoKCksZS5tb3ZlVG8oMCwtMjIqbyksZS5saW5lVG8oMipvLC00MipvKSxlLnN0cm9rZSgpLGUubGluZVdpZHRoPTQqbyxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKDIqbywtMzgqbyksZS5saW5lVG8oTWF0aC5zaW4oWj8tMTpxKSoxMCpvKzIqbyxaPy00NipvOi0yOCpvKSxlLnN0cm9rZSgpLGUuZmlsbFN0eWxlPSIjNGRkOGMwIixlLmJlZ2luUGF0aCgpLGUuYXJjKDQqbywtNDkqbyw3LjUqbywwLE1hdGguUEkqMiksZS5maWxsKCksZS5maWxsU3R5bGU9IiNlOWZmZmEiLGUuZmlsbFJlY3QoNCpvLC01MSpvLDgqbyw0Km8pLGUuc3Ryb2tlU3R5bGU9IiNmZjVkYTIiLGUubGluZVdpZHRoPTMqbyxlLmJlZ2luUGF0aCgpLGUubW92ZVRvKC0xKm8sLTQwKm8pLGUucXVhZHJhdGljQ3VydmVUbygtMTQqbywtMzYqbytNYXRoLnNpbihIKjIpKjMqbywtMjIqbywtMzAqbyksZS5zdHJva2UoKX1lLnJlc3RvcmUoKTtmb3IoY29uc3QgWiBvZiBsLnBhcnRpY2xlcyl7Y29uc3QgeWU9Wi5saWZlL1oubWF4TGlmZTtlLmdsb2JhbEFscGhhPU1hdGgubWF4KDAseWUpLGUuZmlsbFN0eWxlPVouY29sb3IsZS5maWxsUmVjdCgoWi54LVouc2l6ZS8yKSpvLChaLnktWi5zaXplLzIpKm8sWi5zaXplKm8sWi5zaXplKm8pfWUuZ2xvYmFsQWxwaGE9MTtmb3IoY29uc3QgWiBvZiBsLmZsb2F0ZXJzKXtjb25zdCB5ZT1aLmxpZmUvWi5tYXhMaWZlO2UuZ2xvYmFsQWxwaGE9TWF0aC5tYXgoMCx5ZSksZS5mb250PWBib2xkICR7TWF0aC5yb3VuZCgxNSpvKX1weCAiQ2hha3JhIFBldGNoIiwgc2Fucy1zZXJpZmAsZS50ZXh0QWxpZ249ImNlbnRlciIsZS5maWxsU3R5bGU9Wi5jb2xvcixlLmZpbGxUZXh0KFoudHh0LFoueCpvLChaLnktKDEteWUpKjM0KSpvKX1lLmdsb2JhbEFscGhhPTE7Y29uc3Qgb2U9ZS5jcmVhdGVSYWRpYWxHcmFkaWVudChhLzIsdS8yLHUqLjM1LGEvMix1LzIsdSouNzUpO29lLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDAsMCwwLDApIiksb2UuYWRkQ29sb3JTdG9wKDEsInJnYmEoMTAsNCwxOCwwLjUpIiksZS5maWxsU3R5bGU9b2UsZS5maWxsUmVjdCgwLDAsYSx1KSxkPT09InBhdXNlZCImJihlLmZpbGxTdHlsZT0icmdiYSgxOCw4LDMxLDAuNCkiLGUuZmlsbFJlY3QoMCwwLGEsdSkpLGUucmVzdG9yZSgpfWNvbnN0IHNwPSJuZW9uZHJpZnQuYmVzdHMudjEiLGxwPSJuZW9uZHJpZnQuZGlmZi52MSI7ZnVuY3Rpb24gT3goKXtjb25zdCBlPXtqb2c6MCxydXNoOjAsYmxpdHo6MH07dHJ5e2NvbnN0IGw9bG9jYWxTdG9yYWdlLmdldEl0ZW0oc3ApO2lmKCFsKXJldHVybiBlO2NvbnN0IGE9SlNPTi5wYXJzZShsKTtyZXR1cm57am9nOk51bWJlcihhLmpvZyl8fDAscnVzaDpOdW1iZXIoYS5ydXNoKXx8MCxibGl0ejpOdW1iZXIoYS5ibGl0eil8fDB9fWNhdGNoe3JldHVybiBlfX1mdW5jdGlvbiBjMCgpe3RyeXtjb25zdCBlPWxvY2FsU3RvcmFnZS5nZXRJdGVtKGxwKTtpZihlPT09ImpvZyJ8fGU9PT0icnVzaCJ8fGU9PT0iYmxpdHoiKXJldHVybiBlfWNhdGNoe31yZXR1cm4icnVzaCJ9ZnVuY3Rpb24gQngoKXtjb25zdCBlPXgudXNlUmVmKG51bGwpLGw9eC51c2VSZWYobnVsbCksYT14LnVzZVJlZihjYyhwc1tjMCgpXSwhMCkpLHU9eC51c2VSZWYoe3c6MCxoOjB9KSxkPXgudXNlUmVmKDApLG89eC51c2VSZWYoe2p1bXA6MCxjb2luOjAsaGl0OjAsc2xpZGU6MH0pLHA9eC51c2VSZWYoMCksaD14LnVzZVJlZigwKSxtPXgudXNlUmVmKDApLFtnLHZdPXgudXNlU3RhdGUoImlkbGUiKSx3PXgudXNlUmVmKCJpZGxlIiksW00sUl09eC51c2VTdGF0ZSgwKSxbVyxRXT14LnVzZVN0YXRlKDApLFtTLEhdPXgudXNlU3RhdGUoMCksW1YscV09eC51c2VTdGF0ZSgwKSxbb2UsWl09eC51c2VTdGF0ZSghMSksW3llLFNlXT14LnVzZVN0YXRlKGMwKSxrZT14LnVzZVJlZih5ZSksW1BlLEVlXT14LnVzZVN0YXRlKE94KSxPZT14LnVzZVJlZihQZSksW0JlLHplXT14LnVzZVN0YXRlKGhuKSxGZT14LnVzZVJlZihCZSksTGU9eC51c2VDYWxsYmFjayhHPT57dy5jdXJyZW50PUcsdihHKX0sW10pLGplPXgudXNlQ2FsbGJhY2soKCk9PntkLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGQuY3VycmVudCksZC5jdXJyZW50PTApfSxbXSksd2U9eC51c2VDYWxsYmFjayhHPT57amUoKSxMZSgicmVhZHkiKSxkLmN1cnJlbnQ9d2luZG93LnNldFRpbWVvdXQoKCk9PntkLmN1cnJlbnQ9MCx3LmN1cnJlbnQ9PT0icmVhZHkiJiZMZSgicnVubmluZyIpfSxHKX0sW2plLExlXSksVT14LnVzZUNhbGxiYWNrKCgpPT57WGUoKSxqZSgpLGEuY3VycmVudD1jYyhwc1trZS5jdXJyZW50XSwhMSksby5jdXJyZW50PXtqdW1wOjAsY29pbjowLGhpdDowLHNsaWRlOjB9LHAuY3VycmVudD0wLGguY3VycmVudD0wLFIoMCksUSgwKSxIKDApLFooITEpLEhlLnN0YXJ0KCksd2UoODAwKX0sW2plLHdlXSksdGU9eC51c2VDYWxsYmFjaygoKT0+e3cuY3VycmVudD09PSJydW5uaW5nIiYmKGplKCksSGUucGF1c2UoKSxMZSgicGF1c2VkIikpfSxbamUsTGVdKSxGPXgudXNlQ2FsbGJhY2soKCk9Pnt3LmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksSGUucmVzdW1lKCksd2UoNTAwKSl9LFt3ZV0pLGs9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEc9dy5jdXJyZW50O0c9PT0iaWRsZSJ8fEc9PT0ib3ZlciI/VSgpOkc9PT0icnVubmluZyI/YmMoYS5jdXJyZW50LHBzW2tlLmN1cnJlbnRdKTpHPT09InBhdXNlZCImJkYoKX0sW1UsRl0pLEw9eC51c2VDYWxsYmFjayhHPT57Y29uc3QgeGU9dy5jdXJyZW50O2lmKCEoeGU9PT0icnVubmluZyJ8fHhlPT09InJlYWR5Inx8eGU9PT0icGF1c2VkIikpe2tlLmN1cnJlbnQ9RyxTZShHKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0obHAsRyl9Y2F0Y2h7fWEuY3VycmVudD1jYyhwc1tHXSwhMCkscC5jdXJyZW50PTAsUigwKSxRKDApLEgoMCksWighMSl9fSxbXSksdWU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEc9IUZlLmN1cnJlbnQ7RmUuY3VycmVudD1HLHplKEcpLHV0KEcpLG1uKEcpfSxbXSksJD14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgRz1hLmN1cnJlbnQseGU9a2UuY3VycmVudCxhZT1HLnNjb3JlO2lmKGFlPk9lLmN1cnJlbnRbeGVdKXtjb25zdCBlZT17Li4uT2UuY3VycmVudCxbeGVdOmFlfTtPZS5jdXJyZW50PWVlLEVlKGVlKSxaKCEwKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oc3AsSlNPTi5zdHJpbmdpZnkoZWUpKX1jYXRjaHt9fUxlKCJvdmVyIil9LFtMZV0pLEo9eC51c2VDYWxsYmFjayhHPT57WGUoKSxtLmN1cnJlbnQ9Ry5jbGllbnRZO2NvbnN0IHhlPXcuY3VycmVudDtpZih4ZT09PSJpZGxlInx8eGU9PT0ib3ZlciIpe1UoKTtyZXR1cm59eGU9PT0icnVubmluZyImJmJjKGEuY3VycmVudCxwc1trZS5jdXJyZW50XSl9LFtVXSksaGU9eC51c2VDYWxsYmFjayhHPT57Ry5idXR0b25zPjAmJkcuY2xpZW50WS1tLmN1cnJlbnQ+MjYmJihhLmN1cnJlbnQuc2xpZGVIZWxkPSEwKX0sW10pLHZlPXgudXNlQ2FsbGJhY2soKCk9PnthLmN1cnJlbnQuc2xpZGVIZWxkPSExfSxbXSk7cmV0dXJuIHgudXNlRWZmZWN0KCgpPT57dXQoRmUuY3VycmVudCk7bGV0IEc9MDtjb25zdCB4ZT1fPT57Y29uc3QgST1hLmN1cnJlbnQsZGU9SS5sYXN0P01hdGgubWluKDYwLF8tSS5sYXN0KToxNjtJLmxhc3Q9Xztjb25zdCBPPXcuY3VycmVudCxqPU89PT0icnVubmluZyJ8fE89PT0ib3ZlciJ8fE89PT0iaWRsZSImJkkuZGVtbztJeChJLGRlLF8scHNba2UuY3VycmVudF0saiksSS5zY29yZSE9PXAuY3VycmVudCYmKHAuY3VycmVudD1JLnNjb3JlLFIoSS5zY29yZSkscShuZT0+bmUrMSkpO2NvbnN0IGdlPU1hdGguZmxvb3IoSS5kaXN0LzEwKTtRKG5lPT5uZSE9PWdlP2dlOm5lKSxJLmNvaW5zIT09aC5jdXJyZW50JiYoaC5jdXJyZW50PUkuY29pbnMsSChJLmNvaW5zKSk7Y29uc3QgWD1vLmN1cnJlbnQ7SS5ldkp1bXAhPT1YLmp1bXAmJihYLmp1bXA9SS5ldkp1bXAsRWEuanVtcCgpKSxJLmV2Q29pbiE9PVguY29pbiYmKFguY29pbj1JLmV2Q29pbixFYS5jb2luKCkpLEkuZXZTbGlkZSE9PVguc2xpZGUmJihYLnNsaWRlPUkuZXZTbGlkZSxFYS5zbGlkZSgpKSxJLmV2SGl0IT09WC5oaXQmJihYLmhpdD1JLmV2SGl0LEVhLmhpdCgpKSxPPT09InJ1bm5pbmciJiZJLmR5aW5nPjAmJl8tSS5keWluZz45NTAmJiQoKTtjb25zdCBUPWUuY3VycmVudCxiZT11LmN1cnJlbnQ7aWYoVCYmYmUudz4wKXtjb25zdCBuZT1ULmdldENvbnRleHQoIjJkIik7bmUmJl94KG5lLEksYmUudyxiZS5oLE8pfUc9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHhlKX07Rz1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoeGUpO2NvbnN0IGFlPWwuY3VycmVudCxlZT1lLmN1cnJlbnQ7bGV0IHo9bnVsbDtpZihhZSYmZWUpe2NvbnN0IF89KCk9Pntjb25zdCBJPWFlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGRlPU1hdGgubWF4KDAsTWF0aC5mbG9vcihNYXRoLm1pbihJLndpZHRoLEkuaGVpZ2h0KSkpLE89TWF0aC5taW4oMix3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb3x8MSk7ZWUud2lkdGg9TWF0aC5yb3VuZChkZSpPKSxlZS5oZWlnaHQ9TWF0aC5yb3VuZChkZSpPKSxlZS5zdHlsZS53aWR0aD1gJHtkZX1weGAsZWUuc3R5bGUuaGVpZ2h0PWAke2RlfXB4YCx1LmN1cnJlbnQ9e3c6ZGUsaDpkZX07Y29uc3Qgaj1lZS5nZXRDb250ZXh0KCIyZCIpO2omJmouc2V0VHJhbnNmb3JtKE8sMCwwLE8sMCwwKX07XygpLHo9bmV3IFJlc2l6ZU9ic2VydmVyKF8pLHoub2JzZXJ2ZShhZSl9Y29uc3QgZmU9Xz0+e2NvbnN0IEk9Xy5rZXkudG9Mb3dlckNhc2UoKTtpZihJPT09IiAifHxJPT09ImFycm93dXAifHxJPT09IncifHxJPT09ImVudGVyIil7Xy5wcmV2ZW50RGVmYXVsdCgpLF8ucmVwZWF0fHxrKCk7cmV0dXJufWlmKEk9PT0iYXJyb3dkb3duInx8ST09PSJzIil7Xy5wcmV2ZW50RGVmYXVsdCgpLGEuY3VycmVudC5zbGlkZUhlbGQ9ITA7cmV0dXJufWlmKEk9PT0iciIpe1UoKTtyZXR1cm59aWYoST09PSJwInx8ST09PSJlc2NhcGUiKXtjb25zdCBkZT13LmN1cnJlbnQ7ZGU9PT0icnVubmluZyI/dGUoKTpkZT09PSJwYXVzZWQiJiZGKCk7cmV0dXJufWlmKEk9PT0ibSIpe3VlKCk7cmV0dXJufUk9PT0iMSImJkwoImpvZyIpLEk9PT0iMiImJkwoInJ1c2giKSxJPT09IjMiJiZMKCJibGl0eiIpfSxQPV89Pntjb25zdCBJPV8ua2V5LnRvTG93ZXJDYXNlKCk7KEk9PT0iYXJyb3dkb3duInx8ST09PSJzIikmJihhLmN1cnJlbnQuc2xpZGVIZWxkPSExKX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLGZlKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5dXAiLFApO2NvbnN0IGllPSgpPT57ZG9jdW1lbnQuaGlkZGVuJiZ3LmN1cnJlbnQ9PT0icnVubmluZyImJnRlKCl9LFk9KCk9Pnt3LmN1cnJlbnQ9PT0icnVubmluZyImJnRlKCl9O3JldHVybiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixpZSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImJsdXIiLFkpLCgpPT57Y2FuY2VsQW5pbWF0aW9uRnJhbWUoRyksamUoKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsZmUpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXl1cCIsUCksZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsaWUpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixZKSx6JiZ6LmRpc2Nvbm5lY3QoKX19LFtMLGplLCQsdGUsayxGLFUsdWVdKSx7Y2FudmFzUmVmOmUsd3JhcFJlZjpsLHBoYXNlOmcsc2NvcmU6TSxkaXN0OlcsY29pbnM6Uyxwb3BLZXk6Vixpc05ld0Jlc3Q6b2UsZGlmZmljdWx0eTp5ZSxiZXN0czpQZSxtdXRlZDpCZSxhY3Rpb25zOntzdGFydDpVLHByaW1hcnk6ayxwYXVzZUdhbWU6dGUscmVzdW1lR2FtZTpGLGNoYW5nZURpZmZpY3VsdHk6TCx0b2dnbGVNdXRlOnVlLG9uUG9pbnRlckRvd246SixvblBvaW50ZXJNb3ZlOmhlLG9uUG9pbnRlclVwOnZlfX19Y29uc3QgdTA9W3tpZDoiam9nIixsYWJlbDoiSm9nIix0YWc6Ildhcm0tdXAgcGFjZSIsZG90czoxfSx7aWQ6InJ1c2giLGxhYmVsOiJSdXNoIix0YWc6IkNpdHkgdHJhZmZpYyIsZG90czoyfSx7aWQ6ImJsaXR6IixsYWJlbDoiQmxpdHoiLHRhZzoiT3V0cnVuIHRoZSBncmlkIixkb3RzOjN9XTtmdW5jdGlvbiB1Yyh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTB9KXtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjplfSksci5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHthPyJhbmltYXRlLXBvcCB0ZXh0LVsjZmY1ZGEyXSBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSgyNTUsOTMsMTYyLDAuNSldIjoidGV4dC1tb3NzLTEwMCJ9YCxjaGlsZHJlbjpsfSx1KV19KX1mdW5jdGlvbiBocyh7a2V5c0xpc3Q6ZSxhY3Rpb246bH0pe3JldHVybiByLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46ZX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpsfSldfSl9ZnVuY3Rpb24gengoKXtjb25zdCBlPUJ4KCkse2FjdGlvbnM6bCxwaGFzZTphfT1lLHU9YT09PSJydW5uaW5nIjtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3IuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbci5qc3godWMse2xhYmVsOiJTY29yZSIsdmFsdWU6ZS5zY29yZSxhY2NlbnQ6ITAscG9wOmUucG9wS2V5fSksci5qc3godWMse2xhYmVsOiJEaXN0YW5jZSIsdmFsdWU6YCR7ZS5kaXN0fW1gfSksci5qc3godWMse2xhYmVsOiJDb2lucyIsdmFsdWU6ci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46ZS5jb2luc30pfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTp1PyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOnU/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiF1JiZhIT09InBhdXNlZCIsY2hpbGRyZW46dT9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIixvblBvaW50ZXJEb3duOmwub25Qb2ludGVyRG93bixvblBvaW50ZXJNb3ZlOmwub25Qb2ludGVyTW92ZSxvblBvaW50ZXJVcDpsLm9uUG9pbnRlclVwLG9uUG9pbnRlckNhbmNlbDpsLm9uUG9pbnRlclVwLG9uQ29udGV4dE1lbnU6ZD0+ZC5wcmV2ZW50RGVmYXVsdCgpfSksYT09PSJpZGxlIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzEyMDgxZl0vODAgcC02IHRleHQtY2VudGVyIGJhY2tkcm9wLWJsdXItWzJweF0iLGNoaWxkcmVuOltyLmpzeCgiaDEiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLW5lb24gZm9udC1kaXNwbGF5IHRleHQtM3hsIHNtOnRleHQtNHhsIixjaGlsZHJlbjoiTkVPTiBEUklGVCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LVsjNGRkOGMwXSIsY2hpbGRyZW46IlJPT0ZUT1AgUlVOTkVSIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBTdGFydCBSdW5uaW5nIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjoiVEFQIE9SIFBSRVNTIFNQQUNFIFRPIFJVTiJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIixjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLCIganVtcCJdfSksci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSIsY2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiLihpMifSksIiBob2xkIHRvIHNsaWRlIl19KSxyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTEgc206ZmxleCIsY2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLCIgcGF1c2UiXX0pXX0pXX0pLGE9PT0icGF1c2VkIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzEyMDgxZl0vODAgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLW5lb24gZm9udC1kaXNwbGF5IHRleHQteGwiLGNoaWxkcmVuOiJDQVVHSFQgWU9VUiBCUkVBVEgifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3IuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucmVzdW1lR2FtZSxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxyLmpzeChBZSx7b25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KV19KSxhPT09Im92ZXIiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMTIwODFmXS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1bI2ZmNWRhMl0gW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDkzLDE2MiwwLjUpXSBzbTp0ZXh0LTJ4bCIsY2hpbGRyZW46IldJUEVPVVQhIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWVuZCBnYXAtNiIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlNDT1JFIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1bI2ZmNWRhMl0iLGNoaWxkcmVuOmUuc2NvcmV9KV19KSxyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCRVNUIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5iZXN0c1tlLmRpZmZpY3VsdHldfSldfSldfSksci5qc3hzKCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1bIzRkZDhjMF0iLGNoaWxkcmVuOltlLmRpc3QsIm0gwrcgIixlLmNvaW5zLCIgQ09JTlMiXX0pLGUuaXNOZXdCZXN0JiZyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJ1biBJdCBCYWNrIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJtdC00IGZsZXgganVzdGlmeS1jZW50ZXIiLGNoaWxkcmVuOnIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwucHJpbWFyeSxjbGFzc05hbWU6Im1pbi13LVsyMjBweF0iLGNoaWxkcmVuOnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiIsY2hpbGRyZW46YT09PSJydW5uaW5nIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KGd0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQYXVzZSJdfSk6YT09PSJwYXVzZWQiP3IuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSk6YT09PSJvdmVyIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSdW4gSXQgQmFjayJdfSk6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhcnQgUnVubmluZyJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiU3RyZWV0IFJ1bGVzIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJoLTIuNSB3LTIuNSByb3VuZGVkLXNtIGJnLVsjZDY0ZjhjXSBzaGFkb3ctWzBfMF84cHhfcmdiYSgyMTQsNzksMTQwLDAuOCldIn0pLCJCYXJyaWVyIOKAlCBqdW1wIGl0Il19KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJkaXN0YW5jZSBwdHMifSldfSksci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJoLTIuNSB3LTIuNSByb3VuZGVkLWZ1bGwgYmctWyM2MmU2ZmZdIHNoYWRvdy1bMF8wXzhweF9yZ2JhKDk4LDIzMCwyNTUsMC44KV0ifSksIkRyb25lIOKAlCBzbGlkZSB1bmRlciJdfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRhYnVsYXItbnVtcyB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiZG9uJ3QganVtcCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdW5kZWQtZnVsbCBiZy1hbWJlcmdsb3ctNDAwIHNoYWRvdy1bMF8wXzhweF9yZ2JhKDI1NSwyMDAsODcsMC44KV0ifSksIkNvaW4iXX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiKzI1IHB0cyJ9KV19KV19KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJTcGVlZCByYW1wcyB0aGUgbG9uZ2VyIHlvdSBzdXJ2aXZlLiBPbmUgdG91Y2ggYW5kIGl0J3Mgb3Zlci4ifSldfSksci5qc3goZG4se3RpdGxlOiJQYWNlIixvcHRpb25zOnUwLHZhbHVlOmUuZGlmZmljdWx0eSxvbkNoYW5nZTpsLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6YT09PSJydW5uaW5nInx8YT09PSJyZWFkeSJ8fGE9PT0icGF1c2VkIn0pLHIuanN4KHBuLHtiZXN0czplLmJlc3RzLG9wdGlvbnM6dTAsYWN0aXZlOmUuZGlmZmljdWx0eX0pLHIuanN4cyhydCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbci5qc3goaHMse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLHIuanN4KEEse2NoaWxkcmVuOiLihpEifSksci5qc3goQSx7Y2hpbGRyZW46IlcifSldfSksYWN0aW9uOiJKdW1wIn0pLHIuanN4KGhzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiLihpMifSksci5qc3goQSx7Y2hpbGRyZW46IlMifSldfSksYWN0aW9uOiJIb2xkIHRvIHNsaWRlIn0pLHIuanN4KGhzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxyLmpzeChocyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHIuanN4KGhzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiIxIn0pLHIuanN4KEEse2NoaWxkcmVuOiIyIn0pLHIuanN4KEEse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiUGFjZSJ9KSxyLmpzeChocyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxyLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJUb3VjaDogdGFwIHRvIGp1bXAsIHN3aXBlIGRvd24gYW5kIGhvbGQgdG8gc2xpZGUgdW5kZXIgZHJvbmVzLiJ9KV19KV19KV19KV19KX1jb25zdCBGeD17Y2hpbGw6e2xhYmVsOiJDSElMTCIsdGFnOiJzbG93IHN0YWNrIixkb3RzOjEsYmFzZUludGVydmFsOjc4MH0sZmxvdzp7bGFiZWw6IkZMT1ciLHRhZzoic3RlYWR5IHJhaW4iLGRvdHM6MixiYXNlSW50ZXJ2YWw6NTgwfSxmcmVuenk6e2xhYmVsOiJGUkVOWlkiLHRhZzoidGVybWluYWwgdmVsb2NpdHkiLGRvdHM6MyxiYXNlSW50ZXJ2YWw6NDIwfX0sbXQ9MTAsZnI9MjAsdnM9e0k6W1swLDAsMCwwXSxbMSwxLDEsMV0sWzAsMCwwLDBdLFswLDAsMCwwXV0sTzpbWzEsMV0sWzEsMV1dLFQ6W1swLDEsMF0sWzEsMSwxXSxbMCwwLDBdXSxTOltbMCwxLDFdLFsxLDEsMF0sWzAsMCwwXV0sWjpbWzEsMSwwXSxbMCwxLDFdLFswLDAsMF1dLEo6W1sxLDAsMF0sWzEsMSwxXSxbMCwwLDBdXSxMOltbMCwwLDFdLFsxLDEsMV0sWzAsMCwwXV19LFBjPVsiSSIsIk8iLCJUIiwiUyIsIloiLCJKIiwiTCJdLEthPXtJOiIjNjJlNmZmIixPOiIjZmZkMTY2IixUOiIjYzA4NGZjIixTOiIjOGVmMDVhIixaOiIjZmY1ZDhmIixKOiIjN2FhMmZmIixMOiIjZmY4YzQyIn07ZnVuY3Rpb24gJHgoZSl7Y29uc3QgbD1lLmxlbmd0aCxhPVtdO2ZvcihsZXQgdT0wO3U8bDt1Kyspe2EucHVzaChbXSk7Zm9yKGxldCBkPTA7ZDxsO2QrKylhW3VdLnB1c2goZVtsLTEtZF1bdV0pfXJldHVybiBhfWZ1bmN0aW9uIFd4KGUpe2NvbnN0IGw9ZS5sZW5ndGgsYT1bXTtmb3IobGV0IHU9MDt1PGw7dSsrKXthLnB1c2goW10pO2ZvcihsZXQgZD0wO2Q8bDtkKyspYVt1XS5wdXNoKGVbZF1bbC0xLXVdKX1yZXR1cm4gYX1mdW5jdGlvbiBIeChlKXtjb25zdCBsPVsuLi5QY107Zm9yKGxldCBhPWwubGVuZ3RoLTE7YT4wO2EtLSl7Y29uc3QgdT1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGErMSkpO1tsW2FdLGxbdV1dPVtsW3VdLGxbYV1dfWUuYmFnLnB1c2goLi4ubCl9ZnVuY3Rpb24gRWMoZSl7cmV0dXJuIGUuYmFnLmxlbmd0aD09PTAmJkh4KGUpLGUuYmFnLnNoaWZ0KCl9ZnVuY3Rpb24gZmMoKXtjb25zdCBlPXtncmlkOm5ldyBVaW50OEFycmF5KG10KmZyKSxjdXI6bnVsbCxob2xkOm51bGwsaG9sZFVzZWQ6ITEscXVldWU6W10sYmFnOltdLHNjb3JlOjAsbGluZXM6MCxsZXZlbDoxLGNvbWJvOi0xLGRyb3BBY2M6MCxsb2NrQWNjOjAsc29mdDohMSxjbGVhcmluZzpbXSxjbGVhclQ6MCxvdmVyOiExLHRpbWU6MCxsYXN0OjAsZXZNb3ZlOjAsZXZSb3RhdGU6MCxldkxvY2s6MCxldkRyb3A6MCxldkNsZWFyOjAsZXZDbGVhck46MCxldkhvbGQ6MCxldk92ZXI6MH07Zm9yKDtlLnF1ZXVlLmxlbmd0aDw0OyllLnF1ZXVlLnB1c2goRWMoZSkpO3JldHVybiBMYyhlKSxlfWZ1bmN0aW9uIExjKGUpe2NvbnN0IGw9ZS5xdWV1ZS5zaGlmdCgpO2UucXVldWUucHVzaChFYyhlKSk7Y29uc3QgYT12c1tsXS5tYXAodT0+Wy4uLnVdKTtlLmN1cj17dDpsLG1hdDphLHg6TWF0aC5mbG9vcigobXQtYS5sZW5ndGgpLzIpLHk6MH0sZS5ob2xkVXNlZD0hMSxlLmRyb3BBY2M9MCxlLmxvY2tBY2M9MCxBcihlLGEsZS5jdXIueCxlLmN1ci55KSYmKGUub3Zlcj0hMCxlLmV2T3ZlcisrKX1mdW5jdGlvbiBBcihlLGwsYSx1KXtmb3IobGV0IGQ9MDtkPGwubGVuZ3RoO2QrKylmb3IobGV0IG89MDtvPGxbZF0ubGVuZ3RoO28rKyl7aWYoIWxbZF1bb10pY29udGludWU7Y29uc3QgcD1hK28saD11K2Q7aWYocDwwfHxwPj1tdHx8aD49ZnJ8fGg+PTAmJmUuZ3JpZFtoKm10K3BdKXJldHVybiEwfXJldHVybiExfWZ1bmN0aW9uIFV4KGUpe3JldHVybiBlLmN1cj9BcihlLGUuY3VyLm1hdCxlLmN1ci54LGUuY3VyLnkrMSk6ITF9ZnVuY3Rpb24gZGMoZSxsKXshZS5jdXJ8fGUub3Zlcnx8ZS5jbGVhcmluZy5sZW5ndGg+MHx8QXIoZSxlLmN1ci5tYXQsZS5jdXIueCtsLGUuY3VyLnkpfHwoZS5jdXIueCs9bCxlLmxvY2tBY2M9MCxlLmV2TW92ZSsrKX1mdW5jdGlvbiBmMChlLGwpe2lmKCFlLmN1cnx8ZS5vdmVyfHxlLmNsZWFyaW5nLmxlbmd0aD4wKXJldHVybjtjb25zdCBhPWw9PT0xPyR4KGUuY3VyLm1hdCk6V3goZS5jdXIubWF0KTtmb3IoY29uc3QgdSBvZlswLC0xLDEsLTIsMl0pZm9yKGNvbnN0IGQgb2ZbMCwtMV0paWYoIUFyKGUsYSxlLmN1ci54K3UsZS5jdXIueStkKSl7ZS5jdXIubWF0PWEsZS5jdXIueCs9dSxlLmN1ci55Kz1kLGUubG9ja0FjYz0wLGUuZXZSb3RhdGUrKztyZXR1cm59fWZ1bmN0aW9uIEd4KGUpe2lmKCFlLmN1cnx8ZS5vdmVyfHxlLmhvbGRVc2VkfHxlLmNsZWFyaW5nLmxlbmd0aD4wKXJldHVybjtjb25zdCBsPWUuY3VyLnQ7aWYoZS5ob2xkKXtjb25zdCBhPWUuaG9sZDtlLmhvbGQ9bCxlLmN1cj17dDphLG1hdDp2c1thXS5tYXAodT0+Wy4uLnVdKSx4Ok1hdGguZmxvb3IoKG10LXZzW2FdLmxlbmd0aCkvMikseTowfX1lbHNle2UuaG9sZD1sO2NvbnN0IGE9ZS5xdWV1ZS5zaGlmdCgpO2UucXVldWUucHVzaChFYyhlKSksZS5jdXI9e3Q6YSxtYXQ6dnNbYV0ubWFwKHU9PlsuLi51XSkseDpNYXRoLmZsb29yKChtdC12c1thXS5sZW5ndGgpLzIpLHk6MH19ZS5ob2xkVXNlZD0hMCxlLmRyb3BBY2M9MCxlLmxvY2tBY2M9MCxlLmV2SG9sZCsrfWZ1bmN0aW9uIEt4KGUpe2lmKCFlLmN1cnx8ZS5vdmVyfHxlLmNsZWFyaW5nLmxlbmd0aD4wKXJldHVybjtsZXQgbD0wO2Zvcig7IUFyKGUsZS5jdXIubWF0LGUuY3VyLngsZS5jdXIueSsxKTspZS5jdXIueSsrLGwrKztlLnNjb3JlKz1sKjIsZS5ldkRyb3ArKyxhcChlKX1mdW5jdGlvbiBhcChlKXtpZighZS5jdXIpcmV0dXJuO2NvbnN0e3Q6bCxtYXQ6YSx4OnUseTpkfT1lLmN1cixvPVBjLmluZGV4T2YobCkrMTtmb3IobGV0IGg9MDtoPGEubGVuZ3RoO2grKylmb3IobGV0IG09MDttPGFbaF0ubGVuZ3RoO20rKyl7aWYoIWFbaF1bbV0pY29udGludWU7Y29uc3QgZz1kK2gsdj11K207Zz49MCYmZzxmciYmdj49MCYmdjxtdCYmKGUuZ3JpZFtnKm10K3ZdPW8pfWUuZXZMb2NrKyssZS5jdXI9bnVsbDtjb25zdCBwPVtdO2ZvcihsZXQgaD0wO2g8ZnI7aCsrKXtsZXQgbT0hMDtmb3IobGV0IGc9MDtnPG10O2crKylpZighZS5ncmlkW2gqbXQrZ10pe209ITE7YnJlYWt9bSYmcC5wdXNoKGgpfWlmKHAubGVuZ3RoPjApe2UuY2xlYXJpbmc9cCxlLmNsZWFyVD0xODAsZS5jb21ibysrO2NvbnN0IGg9WzAsMTAwLDMwMCw1MDAsODAwXVtwLmxlbmd0aF0qZS5sZXZlbCtNYXRoLm1heCgwLGUuY29tYm8pKjQwO2Uuc2NvcmUrPWgsZS5ldkNsZWFyKyssZS5ldkNsZWFyTj1wLmxlbmd0aH1lbHNlIGUuY29tYm89LTEsTGMoZSl9ZnVuY3Rpb24gZDAoZSxsKXtyZXR1cm4gTWF0aC5tYXgoNjAsbC5iYXNlSW50ZXJ2YWwqTWF0aC5wb3coLjg3LGUubGV2ZWwtMSkpfWZ1bmN0aW9uIFZ4KGUsbCxhLHUpe2lmKGUudGltZSs9bCwhdXx8ZS5vdmVyKXJldHVybjtpZihlLmNsZWFyaW5nLmxlbmd0aD4wKXtpZihlLmNsZWFyVC09bCxlLmNsZWFyVDw9MCl7Zm9yKGNvbnN0IG8gb2YgZS5jbGVhcmluZyl7Zm9yKGxldCBwPW87cD4wO3AtLSlmb3IobGV0IGg9MDtoPG10O2grKyllLmdyaWRbcCptdCtoXT1lLmdyaWRbKHAtMSkqbXQraF07Zm9yKGxldCBwPTA7cDxtdDtwKyspZS5ncmlkW3BdPTB9ZS5saW5lcys9ZS5jbGVhcmluZy5sZW5ndGgsZS5sZXZlbD0xK01hdGguZmxvb3IoZS5saW5lcy8xMCksZS5jbGVhcmluZz1bXSxMYyhlKX1yZXR1cm59aWYoIWUuY3VyKXJldHVybjtjb25zdCBkPWUuc29mdD9kMChlLGEpLzE0OmQwKGUsYSk7ZS5kcm9wQWNjKz1sLGUuZHJvcEFjYz49ZCYmKGUuZHJvcEFjYz0wLEFyKGUsZS5jdXIubWF0LGUuY3VyLngsZS5jdXIueSsxKXx8KGUuY3VyLnkrKyxlLnNvZnQmJihlLnNjb3JlKz0xKSxlLmxvY2tBY2M9MCkpLFV4KGUpPyhlLmxvY2tBY2MrPWwsZS5sb2NrQWNjPjQzMCYmYXAoZSkpOmUubG9ja0FjYz0wfWZ1bmN0aW9uIHF4KGUpe2lmKCFlLmN1cilyZXR1cm4gMDtsZXQgbD1lLmN1ci55O2Zvcig7IUFyKGUsZS5jdXIubWF0LGUuY3VyLngsbCsxKTspbCsrO3JldHVybiBsfWNvbnN0IFl4PSJyZ2JhKDI1NSwyNTUsMjU1LDAuMjgpIixYeD0icmdiYSgwLDAsMCwwLjMpIjtmdW5jdGlvbiBwMChlLGwsYSx1LGQpe2UuZmlsbFN0eWxlPWQsZS5maWxsUmVjdChsLGEsdSx1KSxlLmZpbGxTdHlsZT1ZeCxlLmZpbGxSZWN0KGwsYSx1LHUqLjE2KSxlLmZpbGxSZWN0KGwsYSx1Ki4xNCx1KSxlLmZpbGxTdHlsZT1YeCxlLmZpbGxSZWN0KGwsYSt1Ki44NCx1LHUqLjE2KSxlLmZpbGxSZWN0KGwrdSouODYsYSx1Ki4xNCx1KSxlLnN0cm9rZVN0eWxlPSJyZ2JhKDAsMCwwLDAuNDUpIixlLmxpbmVXaWR0aD0xLGUuc3Ryb2tlUmVjdChsKy41LGErLjUsdS0xLHUtMSl9ZnVuY3Rpb24gUXgoZSxsLGEsdSxkKXtjb25zdCBvPWEvbXQ7ZS5zYXZlKCksZS5jbGVhclJlY3QoMCwwLGEsdSk7Y29uc3QgcD1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLHUpO3AuYWRkQ29sb3JTdG9wKDAsIiMwYjE1MjQiKSxwLmFkZENvbG9yU3RvcCgxLCIjMDcwZDE4IiksZS5maWxsU3R5bGU9cCxlLmZpbGxSZWN0KDAsMCxhLHUpLGUuc3Ryb2tlU3R5bGU9InJnYmEoOTgsMjMwLDI1NSwwLjA2KSIsZS5saW5lV2lkdGg9MTtmb3IobGV0IG09MTttPG10O20rKyllLmJlZ2luUGF0aCgpLGUubW92ZVRvKG0qbywwKSxlLmxpbmVUbyhtKm8sdSksZS5zdHJva2UoKTtmb3IobGV0IG09MTttPGZyO20rKyllLmJlZ2luUGF0aCgpLGUubW92ZVRvKDAsbSpvKSxlLmxpbmVUbyhhLG0qbyksZS5zdHJva2UoKTtmb3IobGV0IG09MDttPGZyO20rKylmb3IobGV0IGc9MDtnPG10O2crKyl7Y29uc3Qgdj1sLmdyaWRbbSptdCtnXTt2JiZwMChlLGcqbyxtKm8sbyxLYVtQY1t2LTFdXSl9aWYobC5jbGVhcmluZy5sZW5ndGg+MCl7Y29uc3QgbT1NYXRoLm1heCgwLGwuY2xlYXJULzE4MCk7ZS5maWxsU3R5bGU9YHJnYmEoMjU1LDI1NSwyNTUsJHsuODUqbX0pYDtmb3IoY29uc3QgZyBvZiBsLmNsZWFyaW5nKWUuZmlsbFJlY3QoMCxnKm8sYSxvKX1pZihsLmN1ciYmIWwub3ZlciYmbC5jbGVhcmluZy5sZW5ndGg9PT0wKXtjb25zdCBtPXF4KGwpLGc9S2FbbC5jdXIudF07ZS5nbG9iYWxBbHBoYT0uMjI7Zm9yKGxldCB2PTA7djxsLmN1ci5tYXQubGVuZ3RoO3YrKylmb3IobGV0IHc9MDt3PGwuY3VyLm1hdFt2XS5sZW5ndGg7dysrKWwuY3VyLm1hdFt2XVt3XSYmKGUuZmlsbFN0eWxlPWcsZS5maWxsUmVjdCgobC5jdXIueCt3KSpvLChtK3YpKm8sbyxvKSk7ZS5nbG9iYWxBbHBoYT0xfWlmKGwuY3VyJiYhbC5vdmVyKXtjb25zdCBtPUthW2wuY3VyLnRdO2Uuc2F2ZSgpLGUuc2hhZG93Q29sb3I9bSxlLnNoYWRvd0JsdXI9MTA7Zm9yKGxldCBnPTA7ZzxsLmN1ci5tYXQubGVuZ3RoO2crKylmb3IobGV0IHY9MDt2PGwuY3VyLm1hdFtnXS5sZW5ndGg7disrKWwuY3VyLm1hdFtnXVt2XSYmbC5jdXIueStnPj0wJiZwMChlLChsLmN1ci54K3YpKm8sKGwuY3VyLnkrZykqbyxvLG0pO2UucmVzdG9yZSgpfWxldCBoPWZyO2U6Zm9yKGxldCBtPTA7bTxmcjttKyspZm9yKGxldCBnPTA7ZzxtdDtnKyspaWYobC5ncmlkW20qbXQrZ10pe2g9bTticmVhayBlfWlmKGg8NSl7Y29uc3QgbT1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLDYqbyk7bS5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsOTMsOTMsMC4yMikiKSxtLmFkZENvbG9yU3RvcCgxLCJyZ2JhKDI1NSw5Myw5MywwKSIpLGUuZmlsbFN0eWxlPW0sZS5maWxsUmVjdCgwLDAsYSw2Km8pfWQ9PT0icGF1c2VkIiYmKGUuZmlsbFN0eWxlPSJyZ2JhKDcsMTMsMjQsMC41KSIsZS5maWxsUmVjdCgwLDAsYSx1KSksZS5yZXN0b3JlKCl9Y29uc3QgaXA9ImJsb2NrZmFsbC5iZXN0cy52MSIsb3A9ImJsb2NrZmFsbC5kaWZmLnYxIjtmdW5jdGlvbiBKeCgpe2NvbnN0IGU9e2NoaWxsOjAsZmxvdzowLGZyZW56eTowfTt0cnl7Y29uc3QgbD1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShpcCk7aWYoIWwpcmV0dXJuIGU7Y29uc3QgYT1KU09OLnBhcnNlKGwpO3JldHVybntjaGlsbDpOdW1iZXIoYS5jaGlsbCl8fDAsZmxvdzpOdW1iZXIoYS5mbG93KXx8MCxmcmVuenk6TnVtYmVyKGEuZnJlbnp5KXx8MH19Y2F0Y2h7cmV0dXJuIGV9fWZ1bmN0aW9uIFp4KCl7dHJ5e2NvbnN0IGU9bG9jYWxTdG9yYWdlLmdldEl0ZW0ob3ApO2lmKGU9PT0iY2hpbGwifHxlPT09ImZsb3cifHxlPT09ImZyZW56eSIpcmV0dXJuIGV9Y2F0Y2h7fXJldHVybiJmbG93In1mdW5jdGlvbiBlMSgpe2NvbnN0IGU9eC51c2VSZWYobnVsbCksbD14LnVzZVJlZihudWxsKSxhPXgudXNlUmVmKGZjKCkpLHU9eC51c2VSZWYoe3c6MCxoOjB9KSxkPXgudXNlUmVmKDApLG89eC51c2VSZWYoe21vdmU6MCxyb3RhdGU6MCxsb2NrOjAsZHJvcDowLGNsZWFyOjAsaG9sZDowLG92ZXI6MH0pLHA9eC51c2VSZWYoMCksaD14LnVzZVJlZigwKSxtPXgudXNlUmVmKDEpLGc9eC51c2VSZWYoe3g6MCx5OjAsdDowLGFjY1g6MCxtb3ZlZDohMX0pLFt2LHddPXgudXNlU3RhdGUoImlkbGUiKSxNPXgudXNlUmVmKCJpZGxlIiksW1IsV109eC51c2VTdGF0ZSgwKSxbUSxTXT14LnVzZVN0YXRlKDApLFtILFZdPXgudXNlU3RhdGUoMSksW3Esb2VdPXgudXNlU3RhdGUoMCksW1oseWVdPXgudXNlU3RhdGUoITEpLFtTZSxrZV09eC51c2VTdGF0ZShbXSksW1BlLEVlXT14LnVzZVN0YXRlKG51bGwpLFtPZSxCZV09eC51c2VTdGF0ZShaeCksemU9eC51c2VSZWYoT2UpLFtGZSxMZV09eC51c2VTdGF0ZShKeCksamU9eC51c2VSZWYoRmUpLFt3ZSxVXT14LnVzZVN0YXRlKGhuKSx0ZT14LnVzZVJlZih3ZSksRj14LnVzZUNhbGxiYWNrKFA9PntNLmN1cnJlbnQ9UCx3KFApfSxbXSksaz14LnVzZUNhbGxiYWNrKCgpPT57ZC5jdXJyZW50JiYod2luZG93LmNsZWFyVGltZW91dChkLmN1cnJlbnQpLGQuY3VycmVudD0wKX0sW10pLEw9eC51c2VDYWxsYmFjayhQPT57aygpLEYoInJlYWR5IiksZC5jdXJyZW50PXdpbmRvdy5zZXRUaW1lb3V0KCgpPT57ZC5jdXJyZW50PTAsTS5jdXJyZW50PT09InJlYWR5IiYmRigicnVubmluZyIpfSxQKX0sW2ssRl0pLHVlPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpLGsoKSxhLmN1cnJlbnQ9ZmMoKSxvLmN1cnJlbnQ9e21vdmU6MCxyb3RhdGU6MCxsb2NrOjAsZHJvcDowLGNsZWFyOjAsaG9sZDowLG92ZXI6MH0scC5jdXJyZW50PTAsaC5jdXJyZW50PTAsbS5jdXJyZW50PTEsVygwKSxTKDApLFYoMSkseWUoITEpLEhlLnN0YXJ0KCksTCg3MDApfSxbayxMXSksJD14LnVzZUNhbGxiYWNrKCgpPT57TS5jdXJyZW50PT09InJ1bm5pbmciJiYoaygpLEhlLnBhdXNlKCksRigicGF1c2VkIikpfSxbayxGXSksSj14LnVzZUNhbGxiYWNrKCgpPT57TS5jdXJyZW50PT09InBhdXNlZCImJihYZSgpLEhlLnJlc3VtZSgpLEwoNDAwKSl9LFtMXSksaGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFA9TS5jdXJyZW50O1A9PT0iaWRsZSJ8fFA9PT0ib3ZlciI/dWUoKTpQPT09InBhdXNlZCImJkooKX0sW3VlLEpdKSx2ZT14LnVzZUNhbGxiYWNrKFA9Pntjb25zdCBpZT1NLmN1cnJlbnQ7aWYoIShpZT09PSJydW5uaW5nInx8aWU9PT0icmVhZHkifHxpZT09PSJwYXVzZWQiKSl7emUuY3VycmVudD1QLEJlKFApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShvcCxQKX1jYXRjaHt9YS5jdXJyZW50PWZjKCkscC5jdXJyZW50PTAsVygwKSxTKDApLFYoMSkseWUoITEpfX0sW10pLEc9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFA9IXRlLmN1cnJlbnQ7dGUuY3VycmVudD1QLFUoUCksdXQoUCksbW4oUCl9LFtdKSx4ZT14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgUD1hLmN1cnJlbnQsaWU9emUuY3VycmVudCxZPVAuc2NvcmU7aWYoWT5qZS5jdXJyZW50W2llXSl7Y29uc3QgXz17Li4uamUuY3VycmVudCxbaWVdOll9O2plLmN1cnJlbnQ9XyxMZShfKSx5ZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGlwLEpTT04uc3RyaW5naWZ5KF8pKX1jYXRjaHt9fUYoIm92ZXIiKX0sW0ZdKSxhZT17bW92ZTp4LnVzZUNhbGxiYWNrKFA9PntNLmN1cnJlbnQ9PT0icnVubmluZyImJmRjKGEuY3VycmVudCxQKX0sW10pLHJvdGF0ZTp4LnVzZUNhbGxiYWNrKFA9PntNLmN1cnJlbnQ9PT0icnVubmluZyImJmYwKGEuY3VycmVudCxQKX0sW10pLGRyb3A6eC51c2VDYWxsYmFjaygoKT0+e00uY3VycmVudD09PSJydW5uaW5nIiYmS3goYS5jdXJyZW50KX0sW10pLGhvbGRTd2FwOngudXNlQ2FsbGJhY2soKCk9PntNLmN1cnJlbnQ9PT0icnVubmluZyImJkd4KGEuY3VycmVudCl9LFtdKSxzZXRTb2Z0OngudXNlQ2FsbGJhY2soUD0+e2EuY3VycmVudC5zb2Z0PVB9LFtdKX0sZWU9eC51c2VDYWxsYmFjayhQPT57aWYoWGUoKSxNLmN1cnJlbnQ9PT0iaWRsZSJ8fE0uY3VycmVudD09PSJvdmVyIil7dWUoKTtyZXR1cm59Zy5jdXJyZW50PXt4OlAuY2xpZW50WCx5OlAuY2xpZW50WSx0OnBlcmZvcm1hbmNlLm5vdygpLGFjY1g6MCxtb3ZlZDohMX19LFt1ZV0pLHo9eC51c2VDYWxsYmFjayhQPT57aWYoTS5jdXJyZW50IT09InJ1bm5pbmcifHxQLmJ1dHRvbnM9PT0wJiZQLnBvaW50ZXJUeXBlPT09Im1vdXNlIilyZXR1cm47Y29uc3QgaWU9Zy5jdXJyZW50LFk9UC5jbGllbnRYLWllLng7UC5jbGllbnRZLWllLnk+MzQmJiFpZS5tb3ZlZCYmKGllLm1vdmVkPSEwLGEuY3VycmVudC5zb2Z0PSEwKSxpZS5hY2NYKz1ZLGllLng9UC5jbGllbnRYLGllLnk9UC5jbGllbnRZO2NvbnN0IEk9MjY7Zm9yKDtpZS5hY2NYPkk7KWllLmFjY1gtPUksaWUubW92ZWQ9ITAsZGMoYS5jdXJyZW50LDEpO2Zvcig7aWUuYWNjWDwtSTspaWUuYWNjWCs9SSxpZS5tb3ZlZD0hMCxkYyhhLmN1cnJlbnQsLTEpfSxbXSksZmU9eC51c2VDYWxsYmFjayhQPT57YS5jdXJyZW50LnNvZnQ9ITE7Y29uc3QgaWU9Zy5jdXJyZW50LFk9cGVyZm9ybWFuY2Uubm93KCktaWUudDshKGllLm1vdmVkfHxNYXRoLmh5cG90KFAuY2xpZW50WC1pZS54LFAuY2xpZW50WS1pZS55KT4xMikmJlk8MjUwJiZNLmN1cnJlbnQ9PT0icnVubmluZyImJmYwKGEuY3VycmVudCwxKX0sW10pO3JldHVybiB4LnVzZUVmZmVjdCgoKT0+e3V0KHRlLmN1cnJlbnQpO2xldCBQPTA7Y29uc3QgaWU9WD0+e2NvbnN0IFQ9YS5jdXJyZW50LGJlPVQubGFzdD9NYXRoLm1pbig2MCxYLVQubGFzdCk6MTY7VC5sYXN0PVg7Y29uc3QgbmU9TS5jdXJyZW50O1Z4KFQsYmUsRnhbemUuY3VycmVudF0sbmU9PT0icnVubmluZyIpLFQuc2NvcmUhPT1wLmN1cnJlbnQmJihwLmN1cnJlbnQ9VC5zY29yZSxXKFQuc2NvcmUpLG9lKEdlPT5HZSsxKSksVC5saW5lcyE9PWguY3VycmVudCYmKGguY3VycmVudD1ULmxpbmVzLFMoVC5saW5lcykpLFQubGV2ZWwhPT1tLmN1cnJlbnQmJihtLmN1cnJlbnQ9VC5sZXZlbCxWKFQubGV2ZWwpKSxrZShbLi4uVC5xdWV1ZV0pLEVlKFQuaG9sZCk7Y29uc3Qgc2U9by5jdXJyZW50O1QuZXZNb3ZlIT09c2UubW92ZSYmKHNlLm1vdmU9VC5ldk1vdmUsTnIubW92ZSgpKSxULmV2Um90YXRlIT09c2Uucm90YXRlJiYoc2Uucm90YXRlPVQuZXZSb3RhdGUsTnIucm90YXRlKCkpLFQuZXZMb2NrIT09c2UubG9jayYmKHNlLmxvY2s9VC5ldkxvY2ssTnIubG9jaygpKSxULmV2RHJvcCE9PXNlLmRyb3AmJihzZS5kcm9wPVQuZXZEcm9wLE5yLmRyb3AoKSksVC5ldkNsZWFyIT09c2UuY2xlYXImJihzZS5jbGVhcj1ULmV2Q2xlYXIsTnIuY2xlYXIoVC5ldkNsZWFyTikpLFQuZXZIb2xkIT09c2UuaG9sZCYmKHNlLmhvbGQ9VC5ldkhvbGQsTnIuaG9sZCgpKSxULmV2T3ZlciE9PXNlLm92ZXImJihzZS5vdmVyPVQuZXZPdmVyLE5yLm92ZXIoKSksbmU9PT0icnVubmluZyImJlQub3ZlciYmeGUoKTtjb25zdCBwZT1lLmN1cnJlbnQsV2U9dS5jdXJyZW50O2lmKHBlJiZXZS53PjApe2NvbnN0IEdlPXBlLmdldENvbnRleHQoIjJkIik7R2UmJlF4KEdlLFQsV2UudyxXZS5oLG5lKX1QPXJlcXVlc3RBbmltYXRpb25GcmFtZShpZSl9O1A9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGllKTtjb25zdCBZPWwuY3VycmVudCxfPWUuY3VycmVudDtsZXQgST1udWxsO2lmKFkmJl8pe2NvbnN0IFg9KCk9Pntjb25zdCBUPVkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksYmU9TWF0aC5tYXgoMCxNYXRoLmZsb29yKE1hdGgubWluKFQud2lkdGgsVC5oZWlnaHQvMikpKSxuZT1iZSoyLHNlPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpO18ud2lkdGg9TWF0aC5yb3VuZChiZSpzZSksXy5oZWlnaHQ9TWF0aC5yb3VuZChuZSpzZSksXy5zdHlsZS53aWR0aD1gJHtiZX1weGAsXy5zdHlsZS5oZWlnaHQ9YCR7bmV9cHhgLHUuY3VycmVudD17dzpiZSxoOm5lfTtjb25zdCBwZT1fLmdldENvbnRleHQoIjJkIik7cGUmJnBlLnNldFRyYW5zZm9ybShzZSwwLDAsc2UsMCwwKX07WCgpLEk9bmV3IFJlc2l6ZU9ic2VydmVyKFgpLEkub2JzZXJ2ZShZKX1jb25zdCBkZT1YPT57Y29uc3QgVD1YLmtleS50b0xvd2VyQ2FzZSgpO2lmKFQ9PT0iYXJyb3dsZWZ0Inx8VD09PSJhIil7WC5wcmV2ZW50RGVmYXVsdCgpLGFlLm1vdmUoLTEpO3JldHVybn1pZihUPT09ImFycm93cmlnaHQifHxUPT09ImQiKXtYLnByZXZlbnREZWZhdWx0KCksYWUubW92ZSgxKTtyZXR1cm59aWYoVD09PSJhcnJvd2Rvd24ifHxUPT09InMiKXtYLnByZXZlbnREZWZhdWx0KCksYS5jdXJyZW50LnNvZnQ9ITA7cmV0dXJufWlmKFQ9PT0iYXJyb3d1cCJ8fFQ9PT0ieCJ8fFQ9PT0idyIpe1gucHJldmVudERlZmF1bHQoKSxYLnJlcGVhdHx8YWUucm90YXRlKDEpO3JldHVybn1pZihUPT09InoiKXtYLnJlcGVhdHx8YWUucm90YXRlKC0xKTtyZXR1cm59aWYoVD09PSIgIil7aWYoWC5wcmV2ZW50RGVmYXVsdCgpLCFYLnJlcGVhdCl7Y29uc3QgYmU9TS5jdXJyZW50O2JlPT09ImlkbGUifHxiZT09PSJvdmVyIj91ZSgpOmJlPT09InJ1bm5pbmciP2FlLmRyb3AoKTpiZT09PSJwYXVzZWQiJiZKKCl9cmV0dXJufWlmKFQ9PT0iYyIpe1gucmVwZWF0fHxhZS5ob2xkU3dhcCgpO3JldHVybn1pZihUPT09InIiKXt1ZSgpO3JldHVybn1pZihUPT09InAifHxUPT09ImVzY2FwZSIpe2NvbnN0IGJlPU0uY3VycmVudDtiZT09PSJydW5uaW5nIj8kKCk6YmU9PT0icGF1c2VkIiYmSigpO3JldHVybn1pZihUPT09Im0iKXtHKCk7cmV0dXJufVQ9PT0iMSImJnZlKCJjaGlsbCIpLFQ9PT0iMiImJnZlKCJmbG93IiksVD09PSIzIiYmdmUoImZyZW56eSIpfSxPPVg9Pntjb25zdCBUPVgua2V5LnRvTG93ZXJDYXNlKCk7KFQ9PT0iYXJyb3dkb3duInx8VD09PSJzIikmJihhLmN1cnJlbnQuc29mdD0hMSl9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixkZSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleXVwIixPKTtjb25zdCBqPSgpPT57ZG9jdW1lbnQuaGlkZGVuJiZNLmN1cnJlbnQ9PT0icnVubmluZyImJiQoKX0sZ2U9KCk9PntNLmN1cnJlbnQ9PT0icnVubmluZyImJiQoKSxhLmN1cnJlbnQuc29mdD0hMX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLGopLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixnZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShQKSxrKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLGRlKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5dXAiLE8pLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLGopLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixnZSksSSYmSS5kaXNjb25uZWN0KCl9fSxbYWUuZHJvcCxhZS5ob2xkU3dhcCxhZS5tb3ZlLGFlLnJvdGF0ZSx2ZSxrLHhlLCQsSix1ZSxHXSkse2NhbnZhc1JlZjplLHdyYXBSZWY6bCxwaGFzZTp2LHNjb3JlOlIsbGluZXM6USxsZXZlbDpILHBvcEtleTpxLGlzTmV3QmVzdDpaLHF1ZXVlOlNlLGhvbGQ6UGUsZGlmZmljdWx0eTpPZSxiZXN0czpGZSxtdXRlZDp3ZSxhY3Rpb25zOntzdGFydDp1ZSxwcmltYXJ5OmhlLHBhdXNlR2FtZTokLHJlc3VtZUdhbWU6SixjaGFuZ2VEaWZmaWN1bHR5OnZlLHRvZ2dsZU11dGU6RyxvblBvaW50ZXJEb3duOmVlLG9uUG9pbnRlck1vdmU6eixvblBvaW50ZXJVcDpmZSwuLi5hZX19fWNvbnN0IGgwPVt7aWQ6ImNoaWxsIixsYWJlbDoiQ2hpbGwiLHRhZzoiU2xvdyBzdGFjayIsZG90czoxfSx7aWQ6ImZsb3ciLGxhYmVsOiJGbG93Iix0YWc6IlN0ZWFkeSByYWluIixkb3RzOjJ9LHtpZDoiZnJlbnp5IixsYWJlbDoiRnJlbnp5Iix0YWc6IlRlcm1pbmFsIHZlbG9jaXR5Iixkb3RzOjN9XTtmdW5jdGlvbiBtMCh7dDplLGRpbTpsPSExfSl7aWYoIWUpcmV0dXJuIHIuanN4KCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgaC0xMCB3LTE0IHBsYWNlLWl0ZW1zLWNlbnRlciB0ZXh0LVs5cHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiLigJQifSk7Y29uc3QgYT12c1tlXSx1PUthW2VdO3JldHVybiByLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdhcC1bMnB4XSIsc3R5bGU6e2dyaWRUZW1wbGF0ZUNvbHVtbnM6YHJlcGVhdCgke2EubGVuZ3RofSwgOXB4KWB9LGNoaWxkcmVuOmEuZmxhdE1hcCgoZCxvKT0+ZC5tYXAoKHAsaCk9PnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJoLVs5cHhdIHctWzlweF0gcm91bmRlZC1bMnB4XSIsc3R5bGU6e2JhY2tncm91bmQ6cD91OiJ0cmFuc3BhcmVudCIsb3BhY2l0eTpsPy4zNToxfX0sYCR7b30tJHtofWApKSl9KX1mdW5jdGlvbiBwYyh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTB9KXtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjplfSksci5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHthPyJhbmltYXRlLXBvcCB0ZXh0LVsjNjJlNmZmXSBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSg5OCwyMzAsMjU1LDAuNSldIjoidGV4dC1tb3NzLTEwMCJ9YCxjaGlsZHJlbjpsfSx1KV19KX1mdW5jdGlvbiBUcih7a2V5c0xpc3Q6ZSxhY3Rpb246bH0pe3JldHVybiByLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46ZX0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpsfSldfSl9ZnVuY3Rpb24gdDEoe2FjdGlvbnM6ZX0pe2lmKCEodHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXMpKXJldHVybiBudWxsO2NvbnN0IGE9ImJ0bi1hcmNhZGUgYnRuLWdob3N0IGgtMTIgZmxleC0xIHRleHQtbGcgZm9udC1ib2xkIjtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDIwcHhdIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOmEsImFyaWEtbGFiZWwiOiJNb3ZlIGxlZnQiLG9uUG9pbnRlckRvd246dT0+e3UucHJldmVudERlZmF1bHQoKSxlLm1vdmUoLTEpfSxjaGlsZHJlbjoi4peAIn0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZTphLCJhcmlhLWxhYmVsIjoiTW92ZSByaWdodCIsb25Qb2ludGVyRG93bjp1PT57dS5wcmV2ZW50RGVmYXVsdCgpLGUubW92ZSgxKX0sY2hpbGRyZW46IuKWtiJ9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6YSwiYXJpYS1sYWJlbCI6IlJvdGF0ZSIsb25Qb2ludGVyRG93bjp1PT57dS5wcmV2ZW50RGVmYXVsdCgpLGUucm90YXRlKDEpfSxjaGlsZHJlbjoi4p+zIn0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZTphLCJhcmlhLWxhYmVsIjoiSGFyZCBkcm9wIixvblBvaW50ZXJEb3duOnU9Pnt1LnByZXZlbnREZWZhdWx0KCksZS5kcm9wKCl9LGNoaWxkcmVuOiLipJMifSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOmEsImFyaWEtbGFiZWwiOiJIb2xkIixvblBvaW50ZXJEb3duOnU9Pnt1LnByZXZlbnREZWZhdWx0KCksZS5ob2xkU3dhcCgpfSxjaGlsZHJlbjoiSCJ9KV19KX1mdW5jdGlvbiBuMSgpe2NvbnN0IGU9ZTEoKSx7YWN0aW9uczpsLHBoYXNlOmF9PWUsdT1hPT09InJ1bm5pbmciO3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbci5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltyLmpzeChwYyx7bGFiZWw6IlNjb3JlIix2YWx1ZTplLnNjb3JlLGFjY2VudDohMCxwb3A6ZS5wb3BLZXl9KSxyLmpzeChwYyx7bGFiZWw6IkxpbmVzIix2YWx1ZTplLmxpbmVzfSksci5qc3gocGMse2xhYmVsOiJMZXZlbCIsdmFsdWU6ZS5sZXZlbH0pXX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjp1PyJQYXVzZSI6IlJlc3VtZSIsdGl0bGU6dT8iUGF1c2UgKFApIjoiUmVzdW1lIChQKSIsb25DbGljazp1P2wucGF1c2VHYW1lOmwucmVzdW1lR2FtZSxkaXNhYmxlZDohdSYmYSE9PSJwYXVzZWQiLGNoaWxkcmVuOnU/ci5qc3goZ3Qse30pOnIuanN4KF9lLHt9KX0pLHIuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLGNsYXNzTmFtZToiaWNvbi1idG4iLCJhcmlhLWxhYmVsIjoiUmVzdGFydCIsdGl0bGU6IlJlc3RhcnQgKFIpIixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3goVWUse30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmUubXV0ZWQ/IlVubXV0ZSI6Ik11dGUiLHRpdGxlOiJTb3VuZCAoTSkiLG9uQ2xpY2s6bC50b2dnbGVNdXRlLGNoaWxkcmVuOmUubXV0ZWQ/ci5qc3goZm4se30pOnIuanN4KHVuLHt9KX0pXX0pXX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdhcC00IGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV8zMDBweF0iLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7cmVmOmUud3JhcFJlZixjbGFzc05hbWU6InJlbGF0aXZlIGZsZXgganVzdGlmeS1jZW50ZXIiLHN0eWxlOnttaW5IZWlnaHQ6Im1pbig3OGR2aCwgNzIwcHgpIn0sY2hpbGRyZW46ci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImJvYXJkLWZyYW1lIHNjYW5saW5lcyByZWxhdGl2ZSB0b3VjaC1ub25lIHNlbGVjdC1ub25lIG92ZXJmbG93LWhpZGRlbiIsc3R5bGU6e2hlaWdodDoibWluKDc4ZHZoLCA3MjBweCkiLGFzcGVjdFJhdGlvOiIxIC8gMiJ9LGNoaWxkcmVuOltyLmpzeCgiY2FudmFzIix7cmVmOmUuY2FudmFzUmVmLGNsYXNzTmFtZToiYWJzb2x1dGUgaW5zZXQtMCIsb25Qb2ludGVyRG93bjpsLm9uUG9pbnRlckRvd24sb25Qb2ludGVyTW92ZTpsLm9uUG9pbnRlck1vdmUsb25Qb2ludGVyVXA6bC5vblBvaW50ZXJVcCxvblBvaW50ZXJDYW5jZWw6bC5vblBvaW50ZXJVcCxvbkNvbnRleHRNZW51OmQ9PmQucHJldmVudERlZmF1bHQoKX0pLGE9PT0iaWRsZSImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNzBkMThdLzg1IHAtNCB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS10ZWFsIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IkJMT0NLRkFMTCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LVsjNGRkOGMwXSIsY2hpbGRyZW46IlNUQUNLIMK3IENMRUFSIMK3IFNVUlZJVkUifSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFN0YXJ0IFN0YWNraW5nIl19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjoiU1BBQ0UgVE8gU1RBUlQifSldfSksYT09PSJwYXVzZWQiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMDcwZDE4XS84NSBwLTQgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtdGVhbCBmb250LWRpc3BsYXkgdGV4dC14bCIsY2hpbGRyZW46IkZST1pFTiBTVEFDSyJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5yZXN1bWVHYW1lLGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KX0pLHIuanN4KEFlLHtvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN0YXJ0Il19KX0pXX0pXX0pLGE9PT0ib3ZlciImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTQgYmctWyMwNzBkMThdLzkwIHAtNCB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC14bCB0ZXh0LVsjZmY1ZDhmXSBbdGV4dC1zaGFkb3c6MF8wXzI0cHhfcmdiYSgyNTUsOTMsMTQzLDAuNSldIHNtOnRleHQtMnhsIixjaGlsZHJlbjoiU1RBQ0tFRCBPVVQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtZW5kIGdhcC02IixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU0NPUkUifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LVsjNjJlNmZmXSIsY2hpbGRyZW46ZS5zY29yZX0pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjNGRkOGMwXSIsY2hpbGRyZW46W2UubGluZXMsIiBMSU5FUyDCtyBMRVZFTCAiLGUubGV2ZWxdfSksZS5pc05ld0Jlc3QmJnIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhY2sgQWdhaW4iXX0pfSldfSldfSl9KSxyLmpzeCh0MSx7YWN0aW9uczpsfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTQiLGNoaWxkcmVuOltyLmpzeChydCx7dGl0bGU6IkhvbGQiLGNoaWxkcmVuOnIuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZsZXgganVzdGlmeS1jZW50ZXIgcHktMSIsY2hpbGRyZW46ci5qc3gobTAse3Q6ZS5ob2xkLGRpbTohMX0pfSl9KSxyLmpzeChydCx7dGl0bGU6Ik5leHQiLGNoaWxkcmVuOnIuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0yIHB5LTEiLGNoaWxkcmVuOmUucXVldWUuc2xpY2UoMCwzKS5tYXAoKGQsbyk9PnIuanN4KCJkaXYiLHtzdHlsZTp7b3BhY2l0eToxLW8qLjN9LGNoaWxkcmVuOnIuanN4KG0wLHt0OmR9KX0sbykpfSl9KV19KSxyLmpzeHMocnQse3RpdGxlOiJTY29yaW5nIixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMS41IHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2hpbGRyZW46IlNpbmdsZSJ9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiIxMDAgw5cgbHZsIn0pXX0pLHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXgganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjaGlsZHJlbjoiRG91YmxlIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IjMwMCDDlyBsdmwifSldfSksci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NoaWxkcmVuOiJUcmlwbGUifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRhYnVsYXItbnVtcyB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiNTAwIMOXIGx2bCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LWFtYmVyZ2xvdy0zMDAiLGNoaWxkcmVuOiJRdWFkIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiODAwIMOXIGx2bCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2hpbGRyZW46IkNvbWJvIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46Iis0MCAvIGNoYWluIn0pXX0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0yIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IkxldmVsIHVwIGV2ZXJ5IDEwIGxpbmVzIOKAlCBncmF2aXR5IGdldHMgbWVhbmVyLiJ9KV19KSxyLmpzeChkbix7dGl0bGU6IkdyYXZpdHkiLG9wdGlvbnM6aDAsdmFsdWU6ZS5kaWZmaWN1bHR5LG9uQ2hhbmdlOmwuY2hhbmdlRGlmZmljdWx0eSxkaXNhYmxlZDphPT09InJ1bm5pbmcifHxhPT09InJlYWR5Inx8YT09PSJwYXVzZWQifSksci5qc3gocG4se2Jlc3RzOmUuYmVzdHMsb3B0aW9uczpoMCxhY3RpdmU6ZS5kaWZmaWN1bHR5fSksci5qc3hzKHJ0LHt0aXRsZToiQ29udHJvbHMiLGNoaWxkcmVuOltyLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yLjUiLGNoaWxkcmVuOltyLmpzeChUcix7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoi4oaQIn0pLHIuanN4KEEse2NoaWxkcmVuOiLihpIifSldfSksYWN0aW9uOiJNb3ZlIn0pLHIuanN4KFRyLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiLihpEifSksci5qc3goQSx7Y2hpbGRyZW46IlgifSldfSksYWN0aW9uOiJSb3RhdGUifSksci5qc3goVHIse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJaIn0pLGFjdGlvbjoiUm90YXRlIENDVyJ9KSxyLmpzeChUcix7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IuKGkyJ9KSxhY3Rpb246IlNvZnQgZHJvcCJ9KSxyLmpzeChUcix7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IlNwYWNlIn0pLGFjdGlvbjoiSGFyZCBkcm9wIn0pLHIuanN4KFRyLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiQyJ9KSxhY3Rpb246IkhvbGQgcGllY2UifSksci5qc3goVHIse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksci5qc3goQSx7Y2hpbGRyZW46IlIifSksci5qc3goQSx7Y2hpbGRyZW46Ik0ifSldfSksYWN0aW9uOiJQYXVzZSDCtyByZXN0YXJ0IMK3IHNvdW5kIn0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IlRvdWNoOiB0YXAgYm9hcmQgdG8gcm90YXRlLCBzd2lwZSBzaWRld2F5cyB0byBtb3ZlLCBzd2lwZSBkb3duIHRvIHNvZnQgZHJvcC4ifSldfSldfSldfSldfSl9Y29uc3QgYXI9e2xvZmk6e2xhYmVsOiJMTy1GSSIsdGFnOiI5MiBicG0gwrcgY2hpbGwgdGFwIixkb3RzOjEsYnBtOjkyLGFwcHJvYWNoOjE1MDAsZGVuc2l0eTouNjIsb2ZmYmVhdDouMTQsZG91YmxlczouMDR9LGhvdXNlOntsYWJlbDoiSE9VU0UiLHRhZzoiMTIwIGJwbSDCtyBjbHViIGhlYXQiLGRvdHM6MixicG06MTIwLGFwcHJvYWNoOjExNTAsZGVuc2l0eTouOCxvZmZiZWF0Oi4zLGRvdWJsZXM6LjF9LGhhcmRzdHlsZTp7bGFiZWw6IkhBUkRTVFlMRSIsdGFnOiIxNTAgYnBtIMK3IGZ1bGwgc2VuZCIsZG90czozLGJwbToxNTAsYXBwcm9hY2g6ODgwLGRlbnNpdHk6MSxvZmZiZWF0Oi41LGRvdWJsZXM6LjE4fX0sQWM9NjAwLE9uPTQsTHI9NTAwLERjPTYsa2M9MzIsaXI9WyIjZmY1ZDhmIiwiI2ZmZDE2NiIsIiM4ZWYwNWEiLCIjNjJlNmZmIl0semE9KGUsbCk9PmUrTWF0aC5yYW5kb20oKSoobC1lKSxyMT1lPT5lW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSplLmxlbmd0aCldO2Z1bmN0aW9uIGhjKGUsbD0hMSl7Y29uc3QgYT17dGltZTowLGxhc3Q6MCxvdmVyOmwsbm90ZXM6W10sc2NvcmU6MCxjb21ibzowLGJlc3RDb21ibzowLGhlYWx0aDpEYyx0cmFjazoxLGJwbTplLmJwbSxzcGI6NmU0L2UuYnBtLGFwcHJvYWNoOmUuYXBwcm9hY2gsdHJhY2tFbmRUOjAsY291bnRzOntwZXJmZWN0OjAsZ3JlYXQ6MCxnb29kOjAsbWlzczowfSxsYW5lRmxhc2g6WzAsMCwwLDBdLGJlYXRBY2M6MCxiZWF0SWR4OjAscGFydGljbGVzOltdLGZsb2F0ZXJzOltdLHNoYWtlOjAsZXZCZWF0OjAsZXZQZXJmZWN0OjAsZXZHcmVhdDowLGV2R29vZDowLGV2TWlzczowLGV2VHJhY2s6MH07cmV0dXJuIGx8fGNwKGEsZSwhMCksYX1mdW5jdGlvbiBjcChlLGwsYSl7ZS5zcGI9NmU0L2UuYnBtO2NvbnN0IHU9ZS50aW1lKyhhPzE5MDA6MjMwMCk7bGV0IGQ9LTE7Zm9yKGxldCBvPTA7bzxrYztvKyspe2NvbnN0IHA9dStvKmUuc3BiO2lmKE1hdGgucmFuZG9tKCk8bC5kZW5zaXR5KXtsZXQgaD1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqT24pO2lmKGg9PT1kJiZNYXRoLnJhbmRvbSgpPC43JiYoaD0oaCsxK01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSozKSklT24pLGUubm90ZXMucHVzaCh7bGFuZTpoLHQ6cCxqdWRnZWQ6MH0pLGQ9aCxNYXRoLnJhbmRvbSgpPGwuZG91Ymxlcyl7Y29uc3QgbT0oaCsxK01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSozKSklT247ZS5ub3Rlcy5wdXNoKHtsYW5lOm0sdDpwLGp1ZGdlZDowfSl9fWlmKE1hdGgucmFuZG9tKCk8bC5vZmZiZWF0KXtjb25zdCBoPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpPbik7ZS5ub3Rlcy5wdXNoKHtsYW5lOmgsdDpwK2Uuc3BiLzIsanVkZ2VkOjB9KX19ZS50cmFja0VuZFQ9dStrYyplLnNwYn1mdW5jdGlvbiB1cChlKXtjb25zdCBsPUFjL09uO3JldHVybiBsKmUrbC8yfWZ1bmN0aW9uIHMxKGUpe2NvbnN0IGw9ZS5jb3VudHMucGVyZmVjdCtlLmNvdW50cy5ncmVhdCtlLmNvdW50cy5nb29kK2UuY291bnRzLm1pc3M7cmV0dXJuIGw9PT0wPzEwMDpNYXRoLnJvdW5kKChlLmNvdW50cy5wZXJmZWN0K2UuY291bnRzLmdyZWF0Ki42K2UuY291bnRzLmdvb2QqLjMpL2wqMWUzKS8xMH1mdW5jdGlvbiBnMChlLGwsYSl7aWYoZS5vdmVyKXJldHVybiExO2xldCB1PW51bGwsZD0xZTk7Zm9yKGNvbnN0IHcgb2YgZS5ub3Rlcyl7aWYody5sYW5lIT09bHx8dy5qdWRnZWQhPT0wKWNvbnRpbnVlO2NvbnN0IE09TWF0aC5hYnMody50LWUudGltZSk7TTxkJiYoZD1NLHU9dyl9aWYoIXV8fGQ+MTY1KXJldHVybiBlLmxhbmVGbGFzaFtsXT1NYXRoLm1heChlLmxhbmVGbGFzaFtsXSwuMyksITE7Y29uc3Qgbz0xK01hdGgubWluKDQsTWF0aC5mbG9vcihlLmNvbWJvLzEyKSk7bGV0IHA9IkdPT0QiLGg9IiNiOGIwYTAiLG09MTAwO2Q8PTYwPyh1Lmp1ZGdlZD0xLGUuY291bnRzLnBlcmZlY3QrKyxlLmV2UGVyZmVjdCsrLHA9IlBFUkZFQ1QiLGg9IiNmZmQxNjYiLG09MzAwKTpkPD0xMTU/KHUuanVkZ2VkPTIsZS5jb3VudHMuZ3JlYXQrKyxlLmV2R3JlYXQrKyxwPSJHUkVBVCIsaD0iIzhlZjA1YSIsbT0yMDApOih1Lmp1ZGdlZD0zLGUuY291bnRzLmdvb2QrKyxlLmV2R29vZCsrLHA9IkdPT0QiLGg9IiM2MmU2ZmYiLG09MTAwKSxlLmNvbWJvKyssZS5iZXN0Q29tYm89TWF0aC5tYXgoZS5iZXN0Q29tYm8sZS5jb21ibyksZS5zY29yZSs9bSpvLGUubGFuZUZsYXNoW2xdPTE7Y29uc3QgZz11cChsKTtlLmZsb2F0ZXJzLnB1c2goe3g6Zyx5OkxyLTQ2LHR4dDpwLGxpZmU6NTUwLG1heExpZmU6NTUwLGNvbG9yOmgsYmlnOiExfSk7Y29uc3Qgdj1NYXRoLm1pbig2MCwxMCk7Zm9yKGxldCB3PTA7dzx2O3crKyl7Y29uc3QgTT16YSgwLE1hdGguUEkqMiksUj16YSg0MCwyMjApLFc9emEoMjUwLDU1MCk7ZS5wYXJ0aWNsZXMucHVzaCh7eDpnLHk6THIsdng6TWF0aC5jb3MoTSkqUix2eTpNYXRoLnNpbihNKSpSLTgwLGxpZmU6VyxtYXhMaWZlOlcsc2l6ZTp6YSgxLjUsMy4yKSxjb2xvcjpyMShbaXJbbF0sIiNmZmZmZmYiXSl9KX1yZXR1cm4hMH1mdW5jdGlvbiBsMShlLGwsYSx1KXtlLnRpbWUrPWwsZS5zaGFrZT1NYXRoLm1heCgwLGUuc2hha2UtbCouMDQ1KTtmb3IobGV0IGQ9MDtkPE9uO2QrKyllLmxhbmVGbGFzaFtkXT1NYXRoLm1heCgwLGUubGFuZUZsYXNoW2RdLWwqLjAwNCk7Zm9yKGxldCBkPWUucGFydGljbGVzLmxlbmd0aC0xO2Q+PTA7ZC0tKXtjb25zdCBvPWUucGFydGljbGVzW2RdO2lmKG8ubGlmZS09bCxvLmxpZmU8PTApe2NvbnN0IHA9ZS5wYXJ0aWNsZXMucG9wKCk7cCYmZDxlLnBhcnRpY2xlcy5sZW5ndGgmJihlLnBhcnRpY2xlc1tkXT1wKTtjb250aW51ZX1vLnZ5Kz0zMDAqKGwvMWUzKSxvLngrPW8udngqKGwvMWUzKSxvLnkrPW8udnkqKGwvMWUzKX1mb3IobGV0IGQ9ZS5mbG9hdGVycy5sZW5ndGgtMTtkPj0wO2QtLSllLmZsb2F0ZXJzW2RdLmxpZmUtPWwsZS5mbG9hdGVyc1tkXS5saWZlPD0wJiZlLmZsb2F0ZXJzLnNwbGljZShkLDEpO2lmKCEoIXV8fGUub3Zlcikpe2UuYmVhdEFjYys9bCxlLmJlYXRBY2M+PWUuc3BiJiYoZS5iZWF0QWNjLT1lLnNwYixlLmJlYXRJZHgrKyxlLmV2QmVhdCsrKTtmb3IoY29uc3QgZCBvZiBlLm5vdGVzKWQuanVkZ2VkPT09MCYmZS50aW1lPmQudCsxNjUmJihkLmp1ZGdlZD00LGUuY291bnRzLm1pc3MrKyxlLmNvbWJvPTAsZS5oZWFsdGgtLSxlLmV2TWlzcysrLGUuc2hha2U9TWF0aC5tYXgoZS5zaGFrZSw0KSxlLmZsb2F0ZXJzLnB1c2goe3g6dXAoZC5sYW5lKSx5OkxyLTQ2LHR4dDoiTUlTUyIsbGlmZTo1MDAsbWF4TGlmZTo1MDAsY29sb3I6IiNmZjVkNWQiLGJpZzohMX0pLGUuaGVhbHRoPD0wJiYoZS5oZWFsdGg9MCxlLm92ZXI9ITApKTtpZihlLm5vdGVzLmxlbmd0aD40MDApZS5ub3Rlcz1lLm5vdGVzLmZpbHRlcihkPT5kLmp1ZGdlZD09PTB8fGUudGltZS1kLnQ8NDAwKTtlbHNlIGZvcihsZXQgZD1lLm5vdGVzLmxlbmd0aC0xO2Q+PTA7ZC0tKXtjb25zdCBvPWUubm90ZXNbZF07by5qdWRnZWQhPT0wJiZlLnRpbWUtby50PjQwMCYmZS5ub3Rlcy5zcGxpY2UoZCwxKX0hZS5vdmVyJiZlLnRpbWU+ZS50cmFja0VuZFQrOTAwJiYoZS50cmFjaysrLGUuc2NvcmUrPTFlMytlLnRyYWNrKjI1MCxlLmhlYWx0aD1NYXRoLm1pbihEYyxlLmhlYWx0aCsxKSxlLmJwbT1NYXRoLm1pbihhLmJwbSs0OCxlLmJwbSs1KSxlLmV2VHJhY2srKyxlLmZsb2F0ZXJzLnB1c2goe3g6QWMvMix5OjI0MCx0eHQ6YFRSQUNLICR7ZS50cmFja30gwrcgJHtNYXRoLnJvdW5kKGUuYnBtKX0gQlBNYCxsaWZlOjE1MDAsbWF4TGlmZToxNTAwLGNvbG9yOiIjZmZkMTY2IixiaWc6ITB9KSxjcChlLGEsITEpKX19Y29uc3QgYTE9ZT0+e2NvbnN0IGw9TWF0aC5zaW4oZSoxMjcuMSkqNDM3NTguNTQ1MztyZXR1cm4gbC1NYXRoLmZsb29yKGwpfTtmdW5jdGlvbiBpMShlLGwsYSx1LGQsbyl7ZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhsK28sYSksZS5hcmNUbyhsK3UsYSxsK3UsYStkLG8pLGUuYXJjVG8obCt1LGErZCxsLGErZCxvKSxlLmFyY1RvKGwsYStkLGwsYSxvKSxlLmFyY1RvKGwsYSxsK3UsYSxvKSxlLmNsb3NlUGF0aCgpfWZ1bmN0aW9uIG8xKGUsbCxhLHUsZCl7Y29uc3Qgbz1hL0FjO2Uuc2F2ZSgpLGUuY2xlYXJSZWN0KDAsMCxhLHUpLGwuc2hha2U+MCYmZS50cmFuc2xhdGUoKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UsKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UpO2NvbnN0IHA9ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLDAsMCx1KTtwLmFkZENvbG9yU3RvcCgwLCIjMTYwYTI2IikscC5hZGRDb2xvclN0b3AoMSwiIzBhMDYxNCIpLGUuZmlsbFN0eWxlPXAsZS5maWxsUmVjdCgwLDAsYSx1KTtjb25zdCBoPWEvT24sbT1sLnNwYj4wP2wuYmVhdEFjYy9sLnNwYjowLGc9TWF0aC5tYXgoMCwxLW0qMi4yKSx2PTI2O2ZvcihsZXQgUj0wO1I8djtSKyspe2NvbnN0IFc9KDE0K2ExKFIrbC5iZWF0SWR4KSo3MCkqKC4zNSsuNjUqZykqbyxRPWEvdjtlLmZpbGxTdHlsZT1SJTQ9PT0wPyJyZ2JhKDI1NSw5MywxNDMsMC4xNikiOiJyZ2JhKDk4LDIzMCwyNTUsMC4xKSIsZS5maWxsUmVjdChSKlErMSx1LVcsUS0yLFcpfWZvcihsZXQgUj0wO1I8T247UisrKXtjb25zdCBXPVIqaDtpZihlLmZpbGxTdHlsZT1SJTI9PT0wPyJyZ2JhKDI1NSwyNTUsMjU1LDAuMDI1KSI6InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLGUuZmlsbFJlY3QoVywwLGgsdSksbC5sYW5lRmxhc2hbUl0+MCl7Y29uc3QgUT1lLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsTHIqby0xNjAqbywwLExyKm8pO1EuYWRkQ29sb3JTdG9wKDAsInJnYmEoMjU1LDI1NSwyNTUsMCkiKSxRLmFkZENvbG9yU3RvcCgxLGlyW1JdKSxlLmdsb2JhbEFscGhhPWwubGFuZUZsYXNoW1JdKi4yMixlLmZpbGxTdHlsZT1RLGUuZmlsbFJlY3QoVywwLGgsTHIqbyksZS5nbG9iYWxBbHBoYT0xfWUuc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLGUubGluZVdpZHRoPTEsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhXLDApLGUubGluZVRvKFcsdSksZS5zdHJva2UoKX1pZihsLnRyYWNrRW5kVD4wKXtjb25zdCBSPWwudHJhY2tFbmRULShsLnRyYWNrRW5kVC1rYypsLnNwYiksVz1NYXRoLm1heCgwLE1hdGgubWluKDEsMS0obC50cmFja0VuZFQtbC50aW1lKS9SKSk7ZS5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIsZS5maWxsUmVjdCgwLDAsYSw0Km8pO2NvbnN0IFE9ZS5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLDAsYSwwKTtRLmFkZENvbG9yU3RvcCgwLCIjZmY1ZDhmIiksUS5hZGRDb2xvclN0b3AoMSwiIzYyZTZmZiIpLGUuZmlsbFN0eWxlPVEsZS5maWxsUmVjdCgwLDAsYSpXLDQqbyl9Y29uc3Qgdz1McipvO2Uuc2F2ZSgpLGUuc2hhZG93Q29sb3I9IiNmZmZmZmYiLGUuc2hhZG93Qmx1cj04Km8sZS5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC44NSkiLGUuZmlsbFJlY3QoMCx3LTEuNSpvLGEsMypvKSxlLnJlc3RvcmUoKTtmb3IobGV0IFI9MDtSPE9uO1IrKyl7Y29uc3QgVz1SKmgraC8yLFE9aCouMyooMStsLmxhbmVGbGFzaFtSXSouMTgrZyouMDUpO2Uuc2F2ZSgpLGUuc2hhZG93Q29sb3I9aXJbUl0sZS5zaGFkb3dCbHVyPSg4K2wubGFuZUZsYXNoW1JdKjE4KSpvLGUuc3Ryb2tlU3R5bGU9aXJbUl0sZS5saW5lV2lkdGg9KDMrbC5sYW5lRmxhc2hbUl0qMikqbyxlLmJlZ2luUGF0aCgpLGUuYXJjKFcsdyxRLDAsTWF0aC5QSSoyKSxlLnN0cm9rZSgpLGUucmVzdG9yZSgpfWZvcihjb25zdCBSIG9mIGwubm90ZXMpe2lmKFIuanVkZ2VkIT09MCljb250aW51ZTtjb25zdCBXPVIudC1sLnRpbWU7aWYoVz5sLmFwcHJvYWNofHxXPC0yMDApY29udGludWU7Y29uc3QgUz0oMS1XL2wuYXBwcm9hY2gpKncsSD1SLmxhbmUqaCtoLzIsVj1oKi42MixxPTIyKm87ZS5zYXZlKCksZS5zaGFkb3dDb2xvcj1pcltSLmxhbmVdLGUuc2hhZG93Qmx1cj0xMipvO2NvbnN0IG9lPWUuY3JlYXRlTGluZWFyR3JhZGllbnQoMCxTLXEsMCxTK3EpO29lLmFkZENvbG9yU3RvcCgwLCIjZmZmZmZmIiksb2UuYWRkQ29sb3JTdG9wKC4zNSxpcltSLmxhbmVdKSxvZS5hZGRDb2xvclN0b3AoMSxpcltSLmxhbmVdKSxlLmZpbGxTdHlsZT1vZSxpMShlLEgtVi8yLFMtcS8yLFYscSw4Km8pLGUuZmlsbCgpLGUucmVzdG9yZSgpfWZvcihjb25zdCBSIG9mIGwucGFydGljbGVzKXtjb25zdCBXPVIubGlmZS9SLm1heExpZmU7ZS5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLFcpLGUuZmlsbFN0eWxlPVIuY29sb3IsZS5maWxsUmVjdCgoUi54LVIuc2l6ZS8yKSpvLChSLnktUi5zaXplLzIpKm8sUi5zaXplKm8sUi5zaXplKm8pfWUuZ2xvYmFsQWxwaGE9MSxsLmNvbWJvPj04JiYhbC5vdmVyJiYoZS50ZXh0QWxpZ249ImNlbnRlciIsZS5mb250PWAke01hdGgucm91bmQoMzQqbyl9cHggIlByZXNzIFN0YXJ0IDJQIiwgbW9ub3NwYWNlYCxlLmZpbGxTdHlsZT0icmdiYSgyNTUsMjA5LDEwMiwwLjIpIixlLmZpbGxUZXh0KGAke2wuY29tYm99YCxhLzIsdSouMzYpLGUuZm9udD1gJHtNYXRoLnJvdW5kKDkqbyl9cHggIlByZXNzIFN0YXJ0IDJQIiwgbW9ub3NwYWNlYCxlLmZpbGxTdHlsZT0icmdiYSgyNTUsMjA5LDEwMiwwLjQ1KSIsZS5maWxsVGV4dCgiQ09NQk8iLGEvMix1Ki4zNisyMipvKSk7Zm9yKGNvbnN0IFIgb2YgbC5mbG9hdGVycyl7Y29uc3QgVz1SLmxpZmUvUi5tYXhMaWZlO2UuZ2xvYmFsQWxwaGE9TWF0aC5tYXgoMCxXKSxlLnRleHRBbGlnbj0iY2VudGVyIixlLmZvbnQ9YCR7TWF0aC5yb3VuZCgoUi5iaWc/MjA6MTMpKm8pfXB4ICJQcmVzcyBTdGFydCAyUCIsIG1vbm9zcGFjZWAsZS5maWxsU3R5bGU9Ui5jb2xvcixlLmZpbGxUZXh0KFIudHh0LFIueCpvLChSLnktKDEtVykqMzApKm8pfWUuZ2xvYmFsQWxwaGE9MTtjb25zdCBNPWUuY3JlYXRlUmFkaWFsR3JhZGllbnQoYS8yLHUvMix1Ki4zNSxhLzIsdS8yLHUqLjgpO00uYWRkQ29sb3JTdG9wKDAsInJnYmEoMCwwLDAsMCkiKSxNLmFkZENvbG9yU3RvcCgxLCJyZ2JhKDYsMywxNCwwLjU1KSIpLGUuZmlsbFN0eWxlPU0sZS5maWxsUmVjdCgwLDAsYSx1KSxkPT09InBhdXNlZCImJihlLmZpbGxTdHlsZT0icmdiYSgxMCw2LDIwLDAuNDUpIixlLmZpbGxSZWN0KDAsMCxhLHUpKSxlLnJlc3RvcmUoKX1jb25zdCBmcD0iYmVhdGRyb3AuYmVzdHMudjEiLGRwPSJiZWF0ZHJvcC5kaWZmLnYxIjtmdW5jdGlvbiBjMSgpe2NvbnN0IGU9e2xvZmk6MCxob3VzZTowLGhhcmRzdHlsZTowfTt0cnl7Y29uc3QgbD1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShmcCk7aWYoIWwpcmV0dXJuIGU7Y29uc3QgYT1KU09OLnBhcnNlKGwpO3JldHVybntsb2ZpOk51bWJlcihhLmxvZmkpfHwwLGhvdXNlOk51bWJlcihhLmhvdXNlKXx8MCxoYXJkc3R5bGU6TnVtYmVyKGEuaGFyZHN0eWxlKXx8MH19Y2F0Y2h7cmV0dXJuIGV9fWZ1bmN0aW9uIHgwKCl7dHJ5e2NvbnN0IGU9bG9jYWxTdG9yYWdlLmdldEl0ZW0oZHApO2lmKGU9PT0ibG9maSJ8fGU9PT0iaG91c2UifHxlPT09ImhhcmRzdHlsZSIpcmV0dXJuIGV9Y2F0Y2h7fXJldHVybiJob3VzZSJ9ZnVuY3Rpb24gdTEoKXtjb25zdCBlPXgudXNlUmVmKG51bGwpLGw9eC51c2VSZWYobnVsbCksYT14LnVzZVJlZihoYyhhclt4MCgpXSkpLHU9eC51c2VSZWYoe3c6MCxoOjB9KSxkPXgudXNlUmVmKDApLG89eC51c2VSZWYoe2JlYXQ6MCxwZXJmZWN0OjAsZ3JlYXQ6MCxnb29kOjAsbWlzczowLHRyYWNrOjB9KSxwPXgudXNlUmVmKHtzY29yZTowLGNvbWJvOjAsaGVhbHRoOjYsdHJhY2s6MSxhY2M6MWUzfSksW2gsbV09eC51c2VTdGF0ZSgiaWRsZSIpLGc9eC51c2VSZWYoImlkbGUiKSxbdix3XT14LnVzZVN0YXRlKDApLFtNLFJdPXgudXNlU3RhdGUoMCksW1csUV09eC51c2VTdGF0ZSg2KSxbUyxIXT14LnVzZVN0YXRlKDEpLFtWLHFdPXgudXNlU3RhdGUoMTIwKSxbb2UsWl09eC51c2VTdGF0ZSgxMDApLFt5ZSxTZV09eC51c2VTdGF0ZSgwKSxba2UsUGVdPXgudXNlU3RhdGUoITEpLFtFZSxPZV09eC51c2VTdGF0ZSh4MCksQmU9eC51c2VSZWYoRWUpLFt6ZSxGZV09eC51c2VTdGF0ZShjMSksTGU9eC51c2VSZWYoemUpLFtqZSx3ZV09eC51c2VTdGF0ZShobiksVT14LnVzZVJlZihqZSksdGU9eC51c2VDYWxsYmFjayhlZT0+e2cuY3VycmVudD1lZSxtKGVlKX0sW10pLEY9eC51c2VDYWxsYmFjaygoKT0+e2QuY3VycmVudCYmKHdpbmRvdy5jbGVhclRpbWVvdXQoZC5jdXJyZW50KSxkLmN1cnJlbnQ9MCl9LFtdKSxrPXgudXNlQ2FsbGJhY2soZWU9PntGKCksdGUoInJlYWR5IiksZC5jdXJyZW50PXdpbmRvdy5zZXRUaW1lb3V0KCgpPT57ZC5jdXJyZW50PTAsZy5jdXJyZW50PT09InJlYWR5IiYmdGUoInJ1bm5pbmciKX0sZWUpfSxbRix0ZV0pLEw9eC51c2VDYWxsYmFjaygoKT0+e1hlKCksRigpLGEuY3VycmVudD1oYyhhcltCZS5jdXJyZW50XSksby5jdXJyZW50PXtiZWF0OjAscGVyZmVjdDowLGdyZWF0OjAsZ29vZDowLG1pc3M6MCx0cmFjazowfSxwLmN1cnJlbnQ9e3Njb3JlOjAsY29tYm86MCxoZWFsdGg6Nix0cmFjazoxLGFjYzoxZTN9LHcoMCksUigwKSxRKDYpLEgoMSkscShhcltCZS5jdXJyZW50XS5icG0pLFooMTAwKSxQZSghMSksSGUuc3RhcnQoKSxrKDcwMCl9LFtGLGtdKSx1ZT14LnVzZUNhbGxiYWNrKCgpPT57Zy5jdXJyZW50PT09InJ1bm5pbmciJiYoRigpLEhlLnBhdXNlKCksdGUoInBhdXNlZCIpKX0sW0YsdGVdKSwkPXgudXNlQ2FsbGJhY2soKCk9PntnLmN1cnJlbnQ9PT0icGF1c2VkIiYmKFhlKCksSGUucmVzdW1lKCksayg0MDApKX0sW2tdKSxKPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBlZT1nLmN1cnJlbnQ7ZWU9PT0iaWRsZSJ8fGVlPT09Im92ZXIiP0woKTplZT09PSJwYXVzZWQiJiYkKCl9LFtMLCRdKSxoZT14LnVzZUNhbGxiYWNrKGVlPT57Zy5jdXJyZW50PT09InJ1bm5pbmciJiZnMChhLmN1cnJlbnQsZWUsYXJbQmUuY3VycmVudF0pfSxbXSksdmU9eC51c2VDYWxsYmFjayhlZT0+e2NvbnN0IHo9Zy5jdXJyZW50O2lmKCEoej09PSJydW5uaW5nInx8ej09PSJyZWFkeSJ8fHo9PT0icGF1c2VkIikpe0JlLmN1cnJlbnQ9ZWUsT2UoZWUpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShkcCxlZSl9Y2F0Y2h7fWEuY3VycmVudD1oYyhhcltlZV0pLHcoMCksUigwKSxRKDYpLEgoMSkscShhcltlZV0uYnBtKSxaKDEwMCksUGUoITEpfX0sW10pLEc9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IGVlPSFVLmN1cnJlbnQ7VS5jdXJyZW50PWVlLHdlKGVlKSx1dChlZSksbW4oZWUpfSxbXSkseGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IGVlPWEuY3VycmVudCx6PUJlLmN1cnJlbnQsZmU9ZWUuc2NvcmU7aWYoZmU+TGUuY3VycmVudFt6XSl7Y29uc3QgUD17Li4uTGUuY3VycmVudCxbel06ZmV9O0xlLmN1cnJlbnQ9UCxGZShQKSxQZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGZwLEpTT04uc3RyaW5naWZ5KFApKX1jYXRjaHt9fXRlKCJvdmVyIil9LFt0ZV0pLGFlPXgudXNlQ2FsbGJhY2soZWU9PntYZSgpO2NvbnN0IHo9Zy5jdXJyZW50O2lmKHo9PT0iaWRsZSJ8fHo9PT0ib3ZlciIpe0woKTtyZXR1cm59aWYoej09PSJydW5uaW5nIil7Y29uc3QgZmU9ZWUuY3VycmVudFRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxQPU1hdGgubWluKDMsTWF0aC5tYXgoMCxNYXRoLmZsb29yKChlZS5jbGllbnRYLWZlLmxlZnQpL2ZlLndpZHRoKjQpKSk7ZzAoYS5jdXJyZW50LFAsYXJbQmUuY3VycmVudF0pfX0sW0xdKTtyZXR1cm4geC51c2VFZmZlY3QoKCk9Pnt1dChVLmN1cnJlbnQpO2xldCBlZT0wO2NvbnN0IHo9Tz0+e2NvbnN0IGo9YS5jdXJyZW50LGdlPWoubGFzdD9NYXRoLm1pbig2MCxPLWoubGFzdCk6MTY7ai5sYXN0PU87Y29uc3QgWD1nLmN1cnJlbnQ7bDEoaixnZSxhcltCZS5jdXJyZW50XSxYPT09InJ1bm5pbmciKTtjb25zdCBUPXAuY3VycmVudDtqLnNjb3JlIT09VC5zY29yZSYmKFQuc2NvcmU9ai5zY29yZSx3KGouc2NvcmUpLFNlKFdlPT5XZSsxKSksai5jb21ibyE9PVQuY29tYm8mJihULmNvbWJvPWouY29tYm8sUihqLmNvbWJvKSksai5oZWFsdGghPT1ULmhlYWx0aCYmKFQuaGVhbHRoPWouaGVhbHRoLFEoai5oZWFsdGgpKSxqLnRyYWNrIT09VC50cmFjayYmKFQudHJhY2s9ai50cmFjayxIKGoudHJhY2spLHEoai5icG0pKTtjb25zdCBiZT1NYXRoLnJvdW5kKHMxKGopKjEwKTtiZSE9PVQuYWNjJiYoVC5hY2M9YmUsWihiZS8xMCkpO2NvbnN0IG5lPW8uY3VycmVudDtqLmV2QmVhdCE9PW5lLmJlYXQmJihuZS5iZWF0PWouZXZCZWF0LGFzLnRpY2soai5iZWF0SWR4KSksai5ldlBlcmZlY3QhPT1uZS5wZXJmZWN0JiYobmUucGVyZmVjdD1qLmV2UGVyZmVjdCxhcy5wZXJmZWN0KCkpLGouZXZHcmVhdCE9PW5lLmdyZWF0JiYobmUuZ3JlYXQ9ai5ldkdyZWF0LGFzLmdyZWF0KCkpLGouZXZHb29kIT09bmUuZ29vZCYmKG5lLmdvb2Q9ai5ldkdvb2QsYXMuZ29vZCgpKSxqLmV2TWlzcyE9PW5lLm1pc3MmJihuZS5taXNzPWouZXZNaXNzLGFzLm1pc3MoKSksai5ldlRyYWNrIT09bmUudHJhY2smJihuZS50cmFjaz1qLmV2VHJhY2ssYXMudHJhY2tDbGVhcigpKSxYPT09InJ1bm5pbmciJiZqLm92ZXImJnhlKCk7Y29uc3Qgc2U9ZS5jdXJyZW50LHBlPXUuY3VycmVudDtpZihzZSYmcGUudz4wKXtjb25zdCBXZT1zZS5nZXRDb250ZXh0KCIyZCIpO1dlJiZvMShXZSxqLHBlLncscGUuaCxYKX1lZT1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoeil9O2VlPXJlcXVlc3RBbmltYXRpb25GcmFtZSh6KTtjb25zdCBmZT1sLmN1cnJlbnQsUD1lLmN1cnJlbnQ7bGV0IGllPW51bGw7aWYoZmUmJlApe2NvbnN0IE89KCk9Pntjb25zdCBqPWZlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGdlPU1hdGgubWF4KDAsTWF0aC5mbG9vcihNYXRoLm1pbihqLndpZHRoLGouaGVpZ2h0KSkpLFg9TWF0aC5taW4oMix3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb3x8MSk7UC53aWR0aD1NYXRoLnJvdW5kKGdlKlgpLFAuaGVpZ2h0PU1hdGgucm91bmQoZ2UqWCksUC5zdHlsZS53aWR0aD1gJHtnZX1weGAsUC5zdHlsZS5oZWlnaHQ9YCR7Z2V9cHhgLHUuY3VycmVudD17dzpnZSxoOmdlfTtjb25zdCBUPVAuZ2V0Q29udGV4dCgiMmQiKTtUJiZULnNldFRyYW5zZm9ybShYLDAsMCxYLDAsMCl9O08oKSxpZT1uZXcgUmVzaXplT2JzZXJ2ZXIoTyksaWUub2JzZXJ2ZShmZSl9Y29uc3QgWT17ZDowLGY6MSxqOjIsazozLGFycm93bGVmdDowLGFycm93ZG93bjoxLGFycm93dXA6MixhcnJvd3JpZ2h0OjN9LF89Tz0+e2NvbnN0IGo9Ty5rZXkudG9Mb3dlckNhc2UoKTtpZihqIGluIFkpe08ucHJldmVudERlZmF1bHQoKSxPLnJlcGVhdHx8aGUoWVtqXSk7cmV0dXJufWlmKGo9PT0iICIpe08ucHJldmVudERlZmF1bHQoKSxPLnJlcGVhdHx8SigpO3JldHVybn1pZihqPT09InIiKXtMKCk7cmV0dXJufWlmKGo9PT0icCJ8fGo9PT0iZXNjYXBlIil7Y29uc3QgZ2U9Zy5jdXJyZW50O2dlPT09InJ1bm5pbmciP3VlKCk6Z2U9PT0icGF1c2VkIiYmJCgpO3JldHVybn1pZihqPT09Im0iKXtHKCk7cmV0dXJufWo9PT0iMSImJnZlKCJsb2ZpIiksaj09PSIyIiYmdmUoImhvdXNlIiksaj09PSIzIiYmdmUoImhhcmRzdHlsZSIpfTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsXyk7Y29uc3QgST0oKT0+e2RvY3VtZW50LmhpZGRlbiYmZy5jdXJyZW50PT09InJ1bm5pbmciJiZ1ZSgpfSxkZT0oKT0+e2cuY3VycmVudD09PSJydW5uaW5nIiYmdWUoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLEkpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixkZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShlZSksRigpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXlkb3duIixfKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixJKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYmx1ciIsZGUpLGllJiZpZS5kaXNjb25uZWN0KCl9fSxbdmUsRix4ZSxoZSx1ZSxKLCQsTCxHXSkse2NhbnZhc1JlZjplLHdyYXBSZWY6bCxwaGFzZTpoLHNjb3JlOnYsY29tYm86TSxoZWFsdGg6Vyx0cmFjazpTLGJwbTpWLGFjYzpvZSxwb3BLZXk6eWUsaXNOZXdCZXN0OmtlLGRpZmZpY3VsdHk6RWUsYmVzdHM6emUsbXV0ZWQ6amUsYWN0aW9uczp7c3RhcnQ6TCxwcmltYXJ5OkoscGF1c2VHYW1lOnVlLHJlc3VtZUdhbWU6JCxoaXQ6aGUsY2hhbmdlRGlmZmljdWx0eTp2ZSx0b2dnbGVNdXRlOkcsb25Qb2ludGVyRG93bjphZX19fWNvbnN0IHkwPVt7aWQ6ImxvZmkiLGxhYmVsOiJMby1GaSIsdGFnOiI5MiBicG0gY2hpbGwgdGFwIixkb3RzOjF9LHtpZDoiaG91c2UiLGxhYmVsOiJIb3VzZSIsdGFnOiIxMjAgYnBtIGNsdWIgaGVhdCIsZG90czoyfSx7aWQ6ImhhcmRzdHlsZSIsbGFiZWw6IkhhcmRzdHlsZSIsdGFnOiIxNTAgYnBtIGZ1bGwgc2VuZCIsZG90czozfV07ZnVuY3Rpb24gRmEoe2xhYmVsOmUsdmFsdWU6bCxhY2NlbnQ6YT0hMSxwb3A6dT0wfSl7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7YT8iYW5pbWF0ZS1wb3AgdGV4dC1bI2IyOGJmZl0gW3RleHQtc2hhZG93OjBfMF8xMnB4X3JnYmEoMTc4LDEzOSwyNTUsMC41KV0iOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmx9LHUpXX0pfWZ1bmN0aW9uIG1zKHtrZXlzTGlzdDplLGFjdGlvbjpsfSl7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjplfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmx9KV19KX1mdW5jdGlvbiBmMSh7b25IaXQ6ZX0pe3JldHVybiB0eXBlb2Ygd2luZG93PCJ1IiYmd2luZG93Lm1hdGNoTWVkaWEoIihwb2ludGVyOiBjb2Fyc2UpIikubWF0Y2hlcz9yLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJteC1hdXRvIG10LTMgZ3JpZCB3LWZ1bGwgbWF4LXctWzQyMHB4XSBncmlkLWNvbHMtNCBnYXAtMiIsY2hpbGRyZW46aXIubWFwKChhLHUpPT5yLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIiwiYXJpYS1sYWJlbCI6YExhbmUgJHt1KzF9YCxjbGFzc05hbWU6ImJ0bi1hcmNhZGUgaC0xNCBib3JkZXItYi00IHRleHQtc20gZm9udC1ib2xkIixzdHlsZTp7YmFja2dyb3VuZDpgJHthfTIyYCxib3JkZXJDb2xvcjphLGNvbG9yOmF9LG9uUG9pbnRlckRvd246ZD0+e2QucHJldmVudERlZmF1bHQoKSxlKHUpfSxjaGlsZHJlbjoi4pePIn0sdSkpfSk6bnVsbH1mdW5jdGlvbiBkMSgpe2NvbnN0IGU9dTEoKSx7YWN0aW9uczpsLHBoYXNlOmF9PWUsdT1hPT09InJ1bm5pbmciO3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbci5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltyLmpzeChGYSx7bGFiZWw6IlNjb3JlIix2YWx1ZTplLnNjb3JlLGFjY2VudDohMCxwb3A6ZS5wb3BLZXl9KSxyLmpzeChGYSx7bGFiZWw6IkNvbWJvIix2YWx1ZTpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyNmZmQxNjZdIixjaGlsZHJlbjpbZS5jb21ibywiw5ciXX0pfSksci5qc3goRmEse2xhYmVsOiJUcmFjayIsdmFsdWU6YCR7ZS50cmFja30gwrcgJHtlLmJwbX1icG1gfSksci5qc3goRmEse2xhYmVsOiJBY2N1cmFjeSIsdmFsdWU6YCR7ZS5hY2N9JWB9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJHcm9vdmUifSksci5qc3goImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHQtMS41IixjaGlsZHJlbjpBcnJheS5mcm9tKHtsZW5ndGg6RGN9LChkLG8pPT5yLmpzeCgic3BhbiIse2NsYXNzTmFtZTpgaC0yLjUgdy0yLjUgcm91bmRlZC1mdWxsICR7bzxlLmhlYWx0aD8iYmctWyNiMjhiZmZdIHNoYWRvdy1bMF8wXzZweF9yZ2JhKDE3OCwxMzksMjU1LDAuOCldIjoiYmctcGl0LTYwMCJ9YH0sbykpfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTp1PyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOnU/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiF1JiZhIT09InBhdXNlZCIsY2hpbGRyZW46dT9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIixvblBvaW50ZXJEb3duOmwub25Qb2ludGVyRG93bixvbkNvbnRleHRNZW51OmQ9PmQucHJldmVudERlZmF1bHQoKX0pLGE9PT0iaWRsZSImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwYTA2MTRdLzg1IHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS12aW9sZXQgZm9udC1kaXNwbGF5IHRleHQtM3hsIHNtOnRleHQtNHhsIixjaGlsZHJlbjoiQkVBVCBEUk9QIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy1bMC4zZW1dIHRleHQtWyNiMjhiZmZdIixjaGlsZHJlbjoiUklERSBUSEUgUkhZVEhNIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBEcm9wIFRoZSBCZWF0Il19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjoiU1BBQ0UgVE8gU1RBUlQifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiRCJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiRiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiSiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiSyJ9KSxyLmpzeCgic3BhbiIse2NoaWxkcmVuOiJvciB0YXAgdGhlIGxhbmVzIn0pXX0pXX0pLGE9PT0icGF1c2VkIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzBhMDYxNF0vODUgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLXZpb2xldCBmb250LWRpc3BsYXkgdGV4dC14bCIsY2hpbGRyZW46IlRSQUNLIFBBVVNFRCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5yZXN1bWVHYW1lLGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KX0pLHIuanN4KEFlLHtvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN0YXJ0Il19KX0pXX0pXX0pLGE9PT0ib3ZlciImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTQgYmctWyMwYTA2MTRdLzkwIHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC14bCB0ZXh0LVsjZmY1ZDhmXSBbdGV4dC1zaGFkb3c6MF8wXzI0cHhfcmdiYSgyNTUsOTMsMTQzLDAuNSldIHNtOnRleHQtMnhsIixjaGlsZHJlbjoiR1JPT1ZFIExPU1QifSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtZW5kIGdhcC02IixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU0NPUkUifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LVsjYjI4YmZmXSIsY2hpbGRyZW46ZS5zY29yZX0pXX0pLHIuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjplLmJlc3RzW2UuZGlmZmljdWx0eV19KV19KV19KSxyLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjNjJlNmZmXSIsY2hpbGRyZW46WyJUUkFDSyAiLGUudHJhY2ssIiDCtyAiLGUuYWNjLCIlIEFDQ1VSQUNZIl19KSxlLmlzTmV3QmVzdCYmci5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pLHIuanN4KEFlLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBPbmUgTW9yZSBUcmFjayJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSksci5qc3goZjEse29uSGl0OmwuaGl0fSksci5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmE9PT0icnVubmluZyI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChndCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgT25lIE1vcmUgVHJhY2siXX0pOnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIERyb3AgVGhlIEJlYXQiXX0pfSl9KX0pXX0pLHIuanN4cygiYXNpZGUiLHtjbGFzc05hbWU6ImdyaWQgY29udGVudC1zdGFydCBnYXAtNCIsY2hpbGRyZW46W3IuanN4cyhydCx7dGl0bGU6Ikp1ZGdtZW50IixjaGlsZHJlbjpbci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMS41IHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjZmZkMTY2XSIsY2hpbGRyZW46IlBFUkZFQ1QgwrE2MG1zIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMiLGNoaWxkcmVuOiIzMDAgw5cgbXVsdCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjOGVmMDVhXSIsY2hpbGRyZW46IkdSRUFUIMKxMTE1bXMifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRhYnVsYXItbnVtcyIsY2hpbGRyZW46IjIwMCDDlyBtdWx0In0pXX0pLHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXgganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM2MmU2ZmZdIixjaGlsZHJlbjoiR09PRCDCsTE2NW1zIn0pLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMiLGNoaWxkcmVuOiIxMDAgw5cgbXVsdCJ9KV19KSxyLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjZmY1ZDVkXSIsY2hpbGRyZW46Ik1JU1MifSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRhYnVsYXItbnVtcyIsY2hpbGRyZW46ImNvbWJvIGJyZWFrIn0pXX0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0yIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46Ik11bHRpcGxpZXIgY2xpbWJzIGV2ZXJ5IDEyIGNvbWJvIChtYXggw5c1KS4gU2l4IG1pc3NlcyBlbmRzIHRoZSBzZXQuIEVhY2ggdHJhY2sgZW5kcyB3aXRoIGEgYm9udXMgYW5kIEJQTSB1cC4ifSldfSksci5qc3goZG4se3RpdGxlOiJCUE0iLG9wdGlvbnM6eTAsdmFsdWU6ZS5kaWZmaWN1bHR5LG9uQ2hhbmdlOmwuY2hhbmdlRGlmZmljdWx0eSxkaXNhYmxlZDphPT09InJ1bm5pbmcifHxhPT09InJlYWR5Inx8YT09PSJwYXVzZWQifSksci5qc3gocG4se2Jlc3RzOmUuYmVzdHMsb3B0aW9uczp5MCxhY3RpdmU6ZS5kaWZmaWN1bHR5fSksci5qc3hzKHJ0LHt0aXRsZToiQ29udHJvbHMiLGNoaWxkcmVuOltyLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yLjUiLGNoaWxkcmVuOltyLmpzeChtcyx7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiRCJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiRiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiSiJ9KSxyLmpzeChBLHtjaGlsZHJlbjoiSyJ9KV19KSxhY3Rpb246IkhpdCBsYW5lcyAx4oCTNCJ9KSxyLmpzeChtcyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IuKGkOKGk+KGkeKGkiJ9KSxhY3Rpb246IkxhbmVzIChhbHQpIn0pLHIuanN4KG1zLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxyLmpzeChtcyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHIuanN4KG1zLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiIxIn0pLHIuanN4KEEse2NoaWxkcmVuOiIyIn0pLHIuanN4KEEse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiQlBNIHRpZXIifSksci5qc3gobXMse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJNIn0pLGFjdGlvbjoiU291bmQifSldfSksci5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiVG91Y2g6IHRhcCB0aGUgbGFuZSBjb2x1bW5zIG9uIHRoZSBib2FyZCwgb3IgdXNlIHRoZSBsYW5lIHBhZHMgdW5kZXIgaXQuIn0pXX0pXX0pXX0pXX0pfWNvbnN0IGZsPXtjYWRldDp7bGFiZWw6IkNBREVUIix0YWc6ImdlbnRsZSB3ZWxscywgYmlnIGJlYWNvbiIsZG90czoxLGdNdWw6LjcsYmVhY29uUjoyNixwbGFuZXRzTWF4OjMsbW92aW5nOiExfSxwaWxvdDp7bGFiZWw6IlBJTE9UIix0YWc6InRoZSBzdGFuZGFyZCBkcmlmdCIsZG90czoyLGdNdWw6MSxiZWFjb25SOjIwLHBsYW5ldHNNYXg6NCxtb3Zpbmc6ITF9LHZvaWQ6e2xhYmVsOiJWT0lEIix0YWc6InJvYW1pbmcgd29ybGRzIixkb3RzOjMsZ011bDoxLjM1LGJlYWNvblI6MTUscGxhbmV0c01heDo1LG1vdmluZzohMH19LGtzPTYwMCxZYT05LGdsPTcsTXQ9KGUsbCk9PmUrTWF0aC5yYW5kb20oKSoobC1lKSxwMT0oZSxsLGEpPT5NYXRoLm1heChsLE1hdGgubWluKGEsZSkpLHBwPWU9PmVbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmUubGVuZ3RoKV07ZnVuY3Rpb24gbWMoZSxsPSExKXtjb25zdCBhPXt0aW1lOjAsbGFzdDowLGRlbW86bCxtb2RlOiJhaW0iLGhvbGVJZHg6MCxzdHJva2VzOjAsdG90YWxTY29yZTowLGxhc3RHYWluOjAscGFyczpbXSxyZXN1bHRzOltdLHBvZDp7eDoxMTAseTo0NjAsdng6MCx2eTowfSxzdGFydDp7eDoxMTAseTo0NjB9LGJlYWNvbjp7eDo0ODAseToxNDAscjplLmJlYWNvblJ9LHBsYW5ldHM6W10sYWltQW5nbGU6LU1hdGguUEkvNCxhaW1Qb3dlcjouNTUsZHJhZzp7YWN0aXZlOiExLHZ4OjAsdnk6MH0sdHJhaWw6W10sc3RhcnM6QXJyYXkuZnJvbSh7bGVuZ3RoOjExMH0sKCk9Pih7Zng6TWF0aC5yYW5kb20oKSxmeTpNYXRoLnJhbmRvbSgpLHR3Ok10KDAsTWF0aC5QSSoyKSxzaXplOk10KC42LDEuOCl9KSkscGFydGljbGVzOltdLGZsb2F0ZXJzOltdLHNoYWtlOjAsbW9kZVQ6MCxmbGlnaHRUOjAsZXZMYXVuY2g6MCxldkJvdW5jZTowLGV2SG9sZTowLGV2VW5kZXJQYXI6MCxldkxvc3Q6MH07cmV0dXJuIGhwKGEsZSksYX1mdW5jdGlvbiBocChlLGwpe2NvbnN0IGE9ZS5ob2xlSWR4O2Uuc3RhcnQ9e3g6TXQoNzAsMTUwKSx5Ok10KDM4MCw1MjApfSxlLmJlYWNvbj17eDpNdCg0MzAsNTQwKSx5Ok10KDcwLDIxMCkscjpsLmJlYWNvblJ9LGUucG9kPXt4OmUuc3RhcnQueCx5OmUuc3RhcnQueSx2eDowLHZ5OjB9LGUuc3Ryb2tlcz0wLGUudHJhaWw9W10sZS5tb2RlPSJhaW0iLGUubW9kZVQ9MCxlLmZsaWdodFQ9MCxlLmFpbUFuZ2xlPU1hdGguYXRhbjIoZS5iZWFjb24ueS1lLnN0YXJ0LnksZS5iZWFjb24ueC1lLnN0YXJ0LngpLGUuYWltUG93ZXI9LjU1O2NvbnN0IHU9TWF0aC5taW4obC5wbGFuZXRzTWF4LDErTWF0aC5jZWlsKChhKzEpKmwucGxhbmV0c01heC9ZYSkrKE1hdGgucmFuZG9tKCk8LjQ1PzE6MCkpLGQ9W107bGV0IG89MDtmb3IoO2QubGVuZ3RoPHUmJm8rKzwyMDA7KXtjb25zdCBtPU10KDE0MCw0NzApLGc9TXQoMTEwLDQ4MCksdj1NdCgyNiw0NCk7TWF0aC5oeXBvdChtLWUuc3RhcnQueCxnLWUuc3RhcnQueSk8disxMTB8fE1hdGguaHlwb3QobS1lLmJlYWNvbi54LGctZS5iZWFjb24ueSk8dis5MHx8ZC5zb21lKHc9Pk1hdGguaHlwb3QobS13LngsZy13LnkpPHYrdy5yKzcwKXx8ZC5wdXNoKHt4Om0seTpnLHI6dixnOk10KC44NSwxLjUpLGh1ZTpwcChbMTY1LDE5NSwyNjUsMzIwLDMwXSksb3JiaXQ6bC5tb3ZpbmcmJmQubGVuZ3RoPT09dS0xJiZhPj0zLGN4Om0sY3k6ZyxvcjpNdCgzNCw1Miksb2E6TXQoMCxNYXRoLlBJKjIpLG9zOk10KC41LC45KX0pfWUucGxhbmV0cz1kO2NvbnN0IGg9TWF0aC5oeXBvdChlLmJlYWNvbi54LWUuc3RhcnQueCxlLmJlYWNvbi55LWUuc3RhcnQueSk+NTQwfHx1Pj0zPzM6MjtlLnBhcnMubGVuZ3RoPD1hP2UucGFycy5wdXNoKGgpOmUucGFyc1thXT1ofWZ1bmN0aW9uIHYwKGUpe2lmKGUubW9kZSE9PSJhaW0iKXJldHVybjtsZXQgbCxhO2lmKGUuZHJhZy5hY3RpdmUpbD1lLmRyYWcudngsYT1lLmRyYWcudnk7ZWxzZXtjb25zdCB1PTE0MCtlLmFpbVBvd2VyKjQ2MDtsPU1hdGguY29zKGUuYWltQW5nbGUpKnUsYT1NYXRoLnNpbihlLmFpbUFuZ2xlKSp1fU1hdGguaHlwb3QobCxhKTw0MHx8KGUucG9kLnZ4PWwsZS5wb2Qudnk9YSxlLnN0cm9rZXMrKyxlLm1vZGU9ImZseSIsZS5tb2RlVD0wLGUuZmxpZ2h0VD0wLGUudHJhaWw9W10sZS5kcmFnLmFjdGl2ZT0hMSxlLmV2TGF1bmNoKyspfWZ1bmN0aW9uIG1wKGUsbCxhLHUsZCl7Y29uc3Qgbz1NYXRoLm1pbigyMjAsZS5wYXJ0aWNsZXMubGVuZ3RoK2QpO2ZvcihsZXQgcD1lLnBhcnRpY2xlcy5sZW5ndGg7cDxvO3ArKyl7Y29uc3QgaD1NdCgwLE1hdGguUEkqMiksbT1NdCgzMCwyMjApLGc9TXQoMzAwLDgwMCk7ZS5wYXJ0aWNsZXMucHVzaCh7eDpsLHk6YSx2eDpNYXRoLmNvcyhoKSptLHZ5Ok1hdGguc2luKGgpKm0sbGlmZTpnLG1heExpZmU6ZyxzaXplOk10KDEuNSwzLjQpLGNvbG9yOnBwKHUpfSl9fWZ1bmN0aW9uIHcwKGUsbCl7ZS5ldkxvc3QrKyxlLmZsb2F0ZXJzLnB1c2goe3g6ZS5wb2QueCx5OnAxKGUucG9kLnksNDAsa3MtNDApLHR4dDpsLGxpZmU6MWUzLG1heExpZmU6MWUzLGNvbG9yOiIjZmY4ZmIzIixiaWc6ITF9KSxlLnBvZD17eDplLnN0YXJ0LngseTplLnN0YXJ0Lnksdng6MCx2eTowfSxlLnRyYWlsPVtdLGUubW9kZT0iYWltIixlLm1vZGVUPTB9ZnVuY3Rpb24gaDEoZSxsKXtjb25zdCBhPWUucGFyc1tlLmhvbGVJZHhdLHU9ZS5zdHJva2VzPD1hLGQ9TWF0aC5tYXgoNjAsNTIwLShlLnN0cm9rZXMtMSkqODApKyh1PzI2MDowKTtlLnRvdGFsU2NvcmUrPWQsZS5sYXN0R2Fpbj1kLGUucmVzdWx0cy5wdXNoKGUuc3Ryb2tlcyksZS5tb2RlPSJob2xlIixlLm1vZGVUPTAsZS5zaGFrZT11Pzg6NCxlLmV2SG9sZSsrLHUmJmUuZXZVbmRlclBhcisrLG1wKGUsZS5iZWFjb24ueCxlLmJlYWNvbi55LFsiIzdlZjBjOCIsIiNmZmUwOGEiLCIjZmZmZmZmIl0sMzApLGUuZmxvYXRlcnMucHVzaCh7eDplLmJlYWNvbi54LHk6ZS5iZWFjb24ueS0zNCx0eHQ6dT8iVU5ERVIgUEFSISI6IkhPTEUgQ0xFQVIiLGxpZmU6MTMwMCxtYXhMaWZlOjEzMDAsY29sb3I6dT8iI2ZmZTA4YSI6IiM3ZWYwYzgiLGJpZzohMH0pLGUuZmxvYXRlcnMucHVzaCh7eDplLmJlYWNvbi54LHk6ZS5iZWFjb24ueS00LHR4dDpgKyR7ZH1gLGxpZmU6MTEwMCxtYXhMaWZlOjExMDAsY29sb3I6IiNmZmZmZmYiLGJpZzohMX0pfWZ1bmN0aW9uIG0xKGUsbCxhLHUpe2NvbnN0IGQ9bC8xZTM7ZS50aW1lKz1sLGUuc2hha2U9TWF0aC5tYXgoMCxlLnNoYWtlLWwqLjA0KSxlLm1vZGVUKz1sO2ZvcihsZXQgaD1lLnBhcnRpY2xlcy5sZW5ndGgtMTtoPj0wO2gtLSl7Y29uc3QgbT1lLnBhcnRpY2xlc1toXTtpZihtLmxpZmUtPWwsbS5saWZlPD0wKXtjb25zdCBnPWUucGFydGljbGVzLnBvcCgpO2cmJmg8ZS5wYXJ0aWNsZXMubGVuZ3RoJiYoZS5wYXJ0aWNsZXNbaF09Zyk7Y29udGludWV9bS54Kz1tLnZ4KmQsbS55Kz1tLnZ5KmQsbS52eCo9MS0xLjYqZCxtLnZ5Kj0xLTEuNipkfWZvcihsZXQgaD1lLmZsb2F0ZXJzLmxlbmd0aC0xO2g+PTA7aC0tKWUuZmxvYXRlcnNbaF0ubGlmZS09bCxlLmZsb2F0ZXJzW2hdLmxpZmU8PTAmJmUuZmxvYXRlcnMuc3BsaWNlKGgsMSk7Zm9yKGNvbnN0IGggb2YgZS5wbGFuZXRzKWgub3JiaXQmJihoLm9hKz1oLm9zKmQsaC54PWguY3grTWF0aC5jb3MoaC5vYSkqaC5vcixoLnk9aC5jeStNYXRoLnNpbihoLm9hKSpoLm9yKTtpZighdSlyZXR1cm47aWYoZS5tb2RlPT09ImhvbGUiJiZlLm1vZGVUPjEzMDApe2UuaG9sZUlkeCsrLGUuaG9sZUlkeD49WWE/ZS5tb2RlPSJvdmVyIjpocChlLGEpO3JldHVybn1pZihlLm1vZGUhPT0iZmx5IilyZXR1cm47ZS5mbGlnaHRUKz1sO2NvbnN0IG89NDtmb3IobGV0IGg9MDtoPG87aCsrKXtmb3IoY29uc3QgbSBvZiBlLnBsYW5ldHMpe2NvbnN0IGc9bS54LWUucG9kLngsdj1tLnktZS5wb2QueSx3PU1hdGgubWF4KDI1MDAsZypnK3YqdiksTT1NYXRoLnNxcnQodyksUj1tLmcqYS5nTXVsKjI2ZTUvdztlLnBvZC52eCs9Zy9NKlIqKGQvbyksZS5wb2QudnkrPXYvTSpSKihkL28pfWUucG9kLngrPWUucG9kLnZ4KihkL28pLGUucG9kLnkrPWUucG9kLnZ5KihkL28pO2Zvcihjb25zdCBtIG9mIGUucGxhbmV0cyl7Y29uc3QgZz1lLnBvZC54LW0ueCx2PWUucG9kLnktbS55LHc9TWF0aC5oeXBvdChnLHYpLE09bS5yK2dsO2lmKHc8TSYmdz4uMDAxKXtjb25zdCBSPWcvdyxXPXYvdztlLnBvZC54PW0ueCtSKk0sZS5wb2QueT1tLnkrVypNO2NvbnN0IFE9ZS5wb2QudngqUitlLnBvZC52eSpXO1E8MCYmKGUucG9kLnZ4LT0xLjcyKlEqUixlLnBvZC52eS09MS43MipRKlcsZS5wb2QudngqPS43OCxlLnBvZC52eSo9Ljc4LGUuZXZCb3VuY2UrKyxtcChlLGUucG9kLngtUipnbCxlLnBvZC55LVcqZ2wsWyIjOWZkOGZmIiwiI2ZmZmZmZiJdLDUpKX19aWYoTWF0aC5oeXBvdChlLnBvZC54LWUuYmVhY29uLngsZS5wb2QueS1lLmJlYWNvbi55KTxlLmJlYWNvbi5yK2dsKXtoMShlKTtyZXR1cm59fWUudHJhaWwucHVzaCh7eDplLnBvZC54LHk6ZS5wb2QueX0pLGUudHJhaWwubGVuZ3RoPjQ2JiZlLnRyYWlsLnNoaWZ0KCk7Y29uc3QgcD03MDtpZihlLnBvZC54PC1wfHxlLnBvZC54PmtzK3B8fGUucG9kLnk8LXB8fGUucG9kLnk+a3MrcCl7dzAoZSwiTE9TVCBQT0QiKTtyZXR1cm59ZS5mbGlnaHRUPjEzZTMmJncwKGUsIkRSSUZURUQgT1VUIil9ZnVuY3Rpb24gZzEoZSxsLGEpe2EubGVuZ3RoPTA7bGV0IHUsZDtpZihlLmRyYWcuYWN0aXZlKXU9ZS5kcmFnLnZ4LGQ9ZS5kcmFnLnZ5O2Vsc2V7Y29uc3QgbT0xNDArZS5haW1Qb3dlcio0NjA7dT1NYXRoLmNvcyhlLmFpbUFuZ2xlKSptLGQ9TWF0aC5zaW4oZS5haW1BbmdsZSkqbX1sZXQgbz1lLnBvZC54LHA9ZS5wb2QueTtjb25zdCBoPTEvNTA7Zm9yKGxldCBtPTA7bTwxNTA7bSsrKXtmb3IoY29uc3QgZyBvZiBlLnBsYW5ldHMpe2NvbnN0IHY9Zy54LW8sdz1nLnktcCxNPU1hdGgubWF4KDI1MDAsdip2K3cqdyksUj1NYXRoLnNxcnQoTSksVz1nLmcqbC5nTXVsKjI2ZTUvTTt1Kz12L1IqVypoLGQrPXcvUipXKmh9aWYobys9dSpoLHArPWQqaCxvPC00MHx8bz5rcys0MHx8cDwtNDB8fHA+a3MrNDB8fGUucGxhbmV0cy5zb21lKGc9Pk1hdGguaHlwb3Qoby1nLngscC1nLnkpPGcucitnbCkpYnJlYWs7aWYoTWF0aC5oeXBvdChvLWUuYmVhY29uLngscC1lLmJlYWNvbi55KTxlLmJlYWNvbi5yKXthLnB1c2goe3g6byx5OnB9KTticmVha31tJTM9PT0wJiZhLnB1c2goe3g6byx5OnB9KX19Y29uc3QgZ2M9NztmdW5jdGlvbiB4MShlLGwsYSx1LGQsbyl7Y29uc3QgcD1hL2tzO2Uuc2F2ZSgpLGUuY2xlYXJSZWN0KDAsMCxhLHUpLGwuc2hha2U+MCYmZS50cmFuc2xhdGUoKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UsKE1hdGgucmFuZG9tKCktLjUpKmwuc2hha2UpO2NvbnN0IGg9ZS5jcmVhdGVSYWRpYWxHcmFkaWVudChhLzIsdS8yLDAsYS8yLHUvMixhKi43NSk7aC5hZGRDb2xvclN0b3AoMCwiIzBkMTIyNiIpLGguYWRkQ29sb3JTdG9wKDEsIiMwNTA3MGYiKSxlLmZpbGxTdHlsZT1oLGUuZmlsbFJlY3QoMCwwLGEsdSk7Zm9yKGNvbnN0IFMgb2YgbC5zdGFycyl7Y29uc3QgSD0uNCsuNipNYXRoLmFicyhNYXRoLnNpbihsLnRpbWUqLjAwMSpTLnR3K1MuZngqOSkpO2UuZ2xvYmFsQWxwaGE9SCouOCxlLmZpbGxTdHlsZT0iI2NmZTNmZiIsZS5maWxsUmVjdChTLmZ4KmEsUy5meSp1LFMuc2l6ZSpwLFMuc2l6ZSpwKX1lLmdsb2JhbEFscGhhPTE7Zm9yKGNvbnN0IFMgb2YgbC5wbGFuZXRzKXtjb25zdCBIPVMueCpwLFY9Uy55KnAscT1TLnIqcDtlLnN0cm9rZVN0eWxlPWBoc2xhKCR7Uy5odWV9LCA3MCUsIDcwJSwgMC4xKWAsZS5saW5lV2lkdGg9MTtmb3IobGV0IFo9MTtaPD0yO1orKyllLmJlZ2luUGF0aCgpLGUuYXJjKEgsVixxK1oqMjYqcCwwLE1hdGguUEkqMiksZS5zdHJva2UoKTtjb25zdCBvZT1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KEgtcSouMzUsVi1xKi4zNSxxKi4xLEgsVixxKTtvZS5hZGRDb2xvclN0b3AoMCxgaHNsKCR7Uy5odWV9LCA2MiUsIDYyJSlgKSxvZS5hZGRDb2xvclN0b3AoMSxgaHNsKCR7Uy5odWV9LCA1NSUsIDI0JSlgKSxlLnNhdmUoKSxlLnNoYWRvd0NvbG9yPWBoc2woJHtTLmh1ZX0sIDcwJSwgNTUlKWAsZS5zaGFkb3dCbHVyPTE0KnAsZS5maWxsU3R5bGU9b2UsZS5iZWdpblBhdGgoKSxlLmFyYyhILFYscSwwLE1hdGguUEkqMiksZS5maWxsKCksZS5yZXN0b3JlKCksZS5maWxsU3R5bGU9YGhzbGEoJHtTLmh1ZX0sIDUwJSwgMTglLCAwLjYpYCxlLmJlZ2luUGF0aCgpLGUuYXJjKEgrcSouMyxWK3EqLjI1LHEqLjE4LDAsTWF0aC5QSSoyKSxlLmFyYyhILXEqLjM1LFYtcSouMSxxKi4xMiwwLE1hdGguUEkqMiksZS5maWxsKCl9Y29uc3QgbT1sLmJlYWNvbi54KnAsZz1sLmJlYWNvbi55KnAsdj1sLmJlYWNvbi5yKnAsdz0xK01hdGguc2luKGwudGltZSouMDA1KSouMTI7ZS5zYXZlKCksZS5zaGFkb3dDb2xvcj0iIzdlZjBjOCIsZS5zaGFkb3dCbHVyPTE4KnAsZS5zdHJva2VTdHlsZT0iIzdlZjBjOCIsZS5saW5lV2lkdGg9Mi41KnAsZS5iZWdpblBhdGgoKSxlLmFyYyhtLGcsdip3LDAsTWF0aC5QSSoyKSxlLnN0cm9rZSgpLGUuZ2xvYmFsQWxwaGE9LjUsZS5iZWdpblBhdGgoKSxlLmFyYyhtLGcsdiouNip3LDAsTWF0aC5QSSoyKSxlLnN0cm9rZSgpLGUuZ2xvYmFsQWxwaGE9MSxlLmZpbGxTdHlsZT0iIzdlZjBjOCIsZS5iZWdpblBhdGgoKSxlLmFyYyhtLGcsNCpwLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLnJlc3RvcmUoKTtmb3IobGV0IFM9MDtTPGwudHJhaWwubGVuZ3RoO1MrKyl7Y29uc3QgSD1sLnRyYWlsW1NdLFY9Uy9sLnRyYWlsLmxlbmd0aDtlLmdsb2JhbEFscGhhPVYqLjUsZS5maWxsU3R5bGU9IiM5ZmQ4ZmYiO2NvbnN0IHE9KDErVioyLjYpKnA7ZS5maWxsUmVjdChILngqcC1xLzIsSC55KnAtcS8yLHEscSl9aWYoZS5nbG9iYWxBbHBoYT0xLGwubW9kZT09PSJhaW0iJiYhbC5kZW1vJiYoZD09PSJydW5uaW5nInx8ZD09PSJyZWFkeSIpKXtjb25zdCBTPVtdO2cxKGwsbyxTKTtmb3IobGV0IHllPTA7eWU8Uy5sZW5ndGg7eWUrKyl7Y29uc3QgU2U9MS15ZS9TLmxlbmd0aDtlLmdsb2JhbEFscGhhPVNlKi42NSxlLmZpbGxTdHlsZT0iI2ZmZTA4YSI7Y29uc3Qga2U9Mi42KnA7ZS5maWxsUmVjdChTW3llXS54KnAta2UvMixTW3llXS55KnAta2UvMixrZSxrZSl9ZS5nbG9iYWxBbHBoYT0xO2NvbnN0IEg9bC5kcmFnLmFjdGl2ZT9NYXRoLm1pbigxLE1hdGguaHlwb3QobC5kcmFnLnZ4LGwuZHJhZy52eSkvNjAwKTpsLmFpbVBvd2VyLFY9bC5kcmFnLmFjdGl2ZT9NYXRoLmF0YW4yKGwuZHJhZy52eSxsLmRyYWcudngpOmwuYWltQW5nbGUscT0oMzArSCo0NikqcCxvZT1sLnBvZC54KnAsWj1sLnBvZC55KnA7ZS5zdHJva2VTdHlsZT0iI2ZmZTA4YSIsZS5saW5lV2lkdGg9Mi41KnAsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhvZSxaKSxlLmxpbmVUbyhvZStNYXRoLmNvcyhWKSpxLForTWF0aC5zaW4oVikqcSksZS5zdHJva2UoKSxlLmZpbGxTdHlsZT0iI2ZmZTA4YSIsZS5iZWdpblBhdGgoKSxlLm1vdmVUbyhvZStNYXRoLmNvcyhWKSoocSs4KnApLForTWF0aC5zaW4oVikqKHErOCpwKSksZS5saW5lVG8ob2UrTWF0aC5jb3MoVisyLjYpKjgqcCtNYXRoLmNvcyhWKSpxLForTWF0aC5zaW4oVisyLjYpKjgqcCtNYXRoLnNpbihWKSpxKSxlLmxpbmVUbyhvZStNYXRoLmNvcyhWLTIuNikqOCpwK01hdGguY29zKFYpKnEsWitNYXRoLnNpbihWLTIuNikqOCpwK01hdGguc2luKFYpKnEpLGUuY2xvc2VQYXRoKCksZS5maWxsKCl9Y29uc3QgTT1sLnBvZC54KnAsUj1sLnBvZC55KnA7ZS5zYXZlKCksZS5zaGFkb3dDb2xvcj0iI2ZmZTA4YSIsZS5zaGFkb3dCbHVyPTEyKnA7Y29uc3QgVz1lLmNyZWF0ZVJhZGlhbEdyYWRpZW50KE0tMipwLFItMipwLDEsTSxSLGdjKnApO1cuYWRkQ29sb3JTdG9wKDAsIiNmZmZmZmYiKSxXLmFkZENvbG9yU3RvcCgxLCIjZmZjODU3IiksZS5maWxsU3R5bGU9VyxlLmJlZ2luUGF0aCgpLGUuYXJjKE0sUixnYypwLDAsTWF0aC5QSSoyKSxlLmZpbGwoKSxlLnJlc3RvcmUoKSxlLnN0cm9rZVN0eWxlPSIjOWZkOGZmIixlLmxpbmVXaWR0aD0yKnAsZS5iZWdpblBhdGgoKSxlLmFyYyhNLFIsZ2MqcCszKnAsLjYsMS40KSxlLnN0cm9rZSgpO2Zvcihjb25zdCBTIG9mIGwucGFydGljbGVzKXtjb25zdCBIPVMubGlmZS9TLm1heExpZmU7ZS5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLEgpLGUuZmlsbFN0eWxlPVMuY29sb3IsZS5maWxsUmVjdCgoUy54LVMuc2l6ZS8yKSpwLChTLnktUy5zaXplLzIpKnAsUy5zaXplKnAsUy5zaXplKnApfWUuZ2xvYmFsQWxwaGE9MTtmb3IoY29uc3QgUyBvZiBsLmZsb2F0ZXJzKXtjb25zdCBIPVMubGlmZS9TLm1heExpZmU7ZS5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLEgpLGUudGV4dEFsaWduPSJjZW50ZXIiLGUuZm9udD1gJHtNYXRoLnJvdW5kKChTLmJpZz8yMDoxMikqcCl9cHggIlByZXNzIFN0YXJ0IDJQIiwgbW9ub3NwYWNlYCxlLmZpbGxTdHlsZT1TLmNvbG9yLGUuZmlsbFRleHQoUy50eHQsUy54KnAsKFMueS0oMS1IKSozMCkqcCl9ZS5nbG9iYWxBbHBoYT0xO2NvbnN0IFE9ZS5jcmVhdGVSYWRpYWxHcmFkaWVudChhLzIsdS8yLHUqLjM1LGEvMix1LzIsdSouOCk7US5hZGRDb2xvclN0b3AoMCwicmdiYSgwLDAsMCwwKSIpLFEuYWRkQ29sb3JTdG9wKDEsInJnYmEoMyw0LDEwLDAuNTUpIiksZS5maWxsU3R5bGU9USxlLmZpbGxSZWN0KDAsMCxhLHUpLGQ9PT0icGF1c2VkIiYmKGUuZmlsbFN0eWxlPSJyZ2JhKDUsNywxNSwwLjQ1KSIsZS5maWxsUmVjdCgwLDAsYSx1KSksZS5yZXN0b3JlKCl9Y29uc3QgZ3A9Im9yYml0YWwuYmVzdHMudjEiLHhwPSJvcmJpdGFsLmRpZmYudjEiO2Z1bmN0aW9uIHkxKCl7Y29uc3QgZT17Y2FkZXQ6MCxwaWxvdDowLHZvaWQ6MH07dHJ5e2NvbnN0IGw9bG9jYWxTdG9yYWdlLmdldEl0ZW0oZ3ApO2lmKCFsKXJldHVybiBlO2NvbnN0IGE9SlNPTi5wYXJzZShsKTtyZXR1cm57Y2FkZXQ6TnVtYmVyKGEuY2FkZXQpfHwwLHBpbG90Ok51bWJlcihhLnBpbG90KXx8MCx2b2lkOk51bWJlcihhLnZvaWQpfHwwfX1jYXRjaHtyZXR1cm4gZX19ZnVuY3Rpb24gYjAoKXt0cnl7Y29uc3QgZT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh4cCk7aWYoZT09PSJjYWRldCJ8fGU9PT0icGlsb3QifHxlPT09InZvaWQiKXJldHVybiBlfWNhdGNoe31yZXR1cm4icGlsb3QifWZ1bmN0aW9uIHYxKCl7Y29uc3QgZT14LnVzZVJlZihudWxsKSxsPXgudXNlUmVmKG51bGwpLGE9eC51c2VSZWYobWMoZmxbYjAoKV0sITApKSx1PXgudXNlUmVmKHt3OjAsaDowfSksZD14LnVzZVJlZigwKSxvPXgudXNlUmVmKHtsYXVuY2g6MCxib3VuY2U6MCxob2xlOjAsdW5kZXI6MCxsb3N0OjB9KSxwPXgudXNlUmVmKHtzY29yZTowLGhvbGU6MCxzdHJva2VzOjAscmVzdWx0czowfSksaD14LnVzZVJlZih7eDowLHk6MCxhY3RpdmU6ITF9KSxbbSxnXT14LnVzZVN0YXRlKCJpZGxlIiksdj14LnVzZVJlZigiaWRsZSIpLFt3LE1dPXgudXNlU3RhdGUoMCksW1IsV109eC51c2VTdGF0ZSgxKSxbUSxTXT14LnVzZVN0YXRlKDApLFtILFZdPXgudXNlU3RhdGUoMiksW3Esb2VdPXgudXNlU3RhdGUoW10pLFtaLHllXT14LnVzZVN0YXRlKDApLFtTZSxrZV09eC51c2VTdGF0ZSghMSksW1BlLEVlXT14LnVzZVN0YXRlKGIwKSxPZT14LnVzZVJlZihQZSksW0JlLHplXT14LnVzZVN0YXRlKHkxKSxGZT14LnVzZVJlZihCZSksW0xlLGplXT14LnVzZVN0YXRlKGhuKSx3ZT14LnVzZVJlZihMZSksVT14LnVzZUNhbGxiYWNrKHo9Pnt2LmN1cnJlbnQ9eixnKHopfSxbXSksdGU9eC51c2VDYWxsYmFjaygoKT0+e2QuY3VycmVudCYmKHdpbmRvdy5jbGVhclRpbWVvdXQoZC5jdXJyZW50KSxkLmN1cnJlbnQ9MCl9LFtdKSxGPXgudXNlQ2FsbGJhY2soej0+e3RlKCksVSgicmVhZHkiKSxkLmN1cnJlbnQ9d2luZG93LnNldFRpbWVvdXQoKCk9PntkLmN1cnJlbnQ9MCx2LmN1cnJlbnQ9PT0icmVhZHkiJiZVKCJydW5uaW5nIil9LHopfSxbdGUsVV0pLGs9eC51c2VDYWxsYmFjaygoKT0+e1hlKCksdGUoKSxhLmN1cnJlbnQ9bWMoZmxbT2UuY3VycmVudF0sITEpLG8uY3VycmVudD17bGF1bmNoOjAsYm91bmNlOjAsaG9sZTowLHVuZGVyOjAsbG9zdDowfSxwLmN1cnJlbnQ9e3Njb3JlOjAsaG9sZTowLHN0cm9rZXM6MCxyZXN1bHRzOjB9LE0oMCksVygxKSxTKDApLFYoYS5jdXJyZW50LnBhcnNbMF0/PzIpLG9lKFtdKSxrZSghMSksSGUuc3RhcnQoKSxGKDgwMCl9LFt0ZSxGXSksTD14LnVzZUNhbGxiYWNrKCgpPT57di5jdXJyZW50PT09InJ1bm5pbmciJiYodGUoKSxIZS5wYXVzZSgpLFUoInBhdXNlZCIpKX0sW3RlLFVdKSx1ZT14LnVzZUNhbGxiYWNrKCgpPT57di5jdXJyZW50PT09InBhdXNlZCImJihYZSgpLEhlLnJlc3VtZSgpLEYoNDAwKSl9LFtGXSksJD14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3Qgej12LmN1cnJlbnQ7ej09PSJpZGxlInx8ej09PSJvdmVyIj9rKCk6ej09PSJydW5uaW5nIj9hLmN1cnJlbnQubW9kZT09PSJhaW0iJiZ2MChhLmN1cnJlbnQpOno9PT0icGF1c2VkIiYmdWUoKX0sW2ssdWVdKSxKPXgudXNlQ2FsbGJhY2soej0+e2NvbnN0IGZlPXYuY3VycmVudDtpZighKGZlPT09InJ1bm5pbmcifHxmZT09PSJyZWFkeSJ8fGZlPT09InBhdXNlZCIpKXtPZS5jdXJyZW50PXosRWUoeik7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKHhwLHopfWNhdGNoe31hLmN1cnJlbnQ9bWMoZmxbel0sITApLE0oMCksVygxKSxTKDApLG9lKFtdKSxrZSghMSl9fSxbXSksaGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IHo9IXdlLmN1cnJlbnQ7d2UuY3VycmVudD16LGplKHopLHV0KHopLG1uKHopfSxbXSksdmU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IHo9YS5jdXJyZW50LGZlPU9lLmN1cnJlbnQsUD16LnRvdGFsU2NvcmU7aWYoUD5GZS5jdXJyZW50W2ZlXSl7Y29uc3QgaWU9ey4uLkZlLmN1cnJlbnQsW2ZlXTpQfTtGZS5jdXJyZW50PWllLHplKGllKSxrZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGdwLEpTT04uc3RyaW5naWZ5KGllKSl9Y2F0Y2h7fX1VKCJvdmVyIil9LFtVXSksRz16PT57Y29uc3QgZmU9ei5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFA9dS5jdXJyZW50Lnd8fDE7cmV0dXJue3g6KHouY2xpZW50WC1mZS5sZWZ0KS9mZS53aWR0aCpQLHk6KHouY2xpZW50WS1mZS50b3ApL2ZlLmhlaWdodCpQfX0seGU9eC51c2VDYWxsYmFjayh6PT57WGUoKTtjb25zdCBmZT12LmN1cnJlbnQ7aWYoZmU9PT0iaWRsZSJ8fGZlPT09Im92ZXIiKXtrKCk7cmV0dXJufWNvbnN0IFA9Ryh6KTtoLmN1cnJlbnQ9e3g6UC54LHk6UC55LGFjdGl2ZTohMH07dHJ5e3ouY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZSh6LnBvaW50ZXJJZCl9Y2F0Y2h7fX0sW2tdKSxhZT14LnVzZUNhbGxiYWNrKHo9PntpZighaC5jdXJyZW50LmFjdGl2ZSlyZXR1cm47Y29uc3QgZmU9YS5jdXJyZW50O2lmKGZlLm1vZGUhPT0iYWltIilyZXR1cm47Y29uc3QgUD1HKHopLGllPShoLmN1cnJlbnQueC1QLngpKjIuNCxZPShoLmN1cnJlbnQueS1QLnkpKjIuNCxfPU1hdGguaHlwb3QoaWUsWSksST1fPjYyMD82MjAvXzoxO2ZlLmRyYWcuYWN0aXZlPV8+MTgsZmUuZHJhZy52eD1pZSpJLGZlLmRyYWcudnk9WSpJfSxbXSksZWU9eC51c2VDYWxsYmFjayh6PT57Y29uc3QgZmU9YS5jdXJyZW50LmRyYWcuYWN0aXZlO2guY3VycmVudC5hY3RpdmU9ITE7dHJ5e3ouY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoei5wb2ludGVySWQpfWNhdGNoe31mZSYmdi5jdXJyZW50PT09InJ1bm5pbmciJiZhLmN1cnJlbnQubW9kZT09PSJhaW0iP3YwKGEuY3VycmVudCk6YS5jdXJyZW50LmRyYWcuYWN0aXZlPSExfSxbXSk7cmV0dXJuIHgudXNlRWZmZWN0KCgpPT57dXQod2UuY3VycmVudCk7bGV0IHo9MDtjb25zdCBmZT1PPT57Y29uc3Qgaj1hLmN1cnJlbnQsZ2U9ai5sYXN0P01hdGgubWluKDYwLE8tai5sYXN0KToxNjtqLmxhc3Q9Tztjb25zdCBYPXYuY3VycmVudCxUPVg9PT0icnVubmluZyJ8fFg9PT0ib3ZlciJ8fFg9PT0iaWRsZSImJmouZGVtbzttMShqLGdlLGZsW09lLmN1cnJlbnRdLFQpO2NvbnN0IGJlPXAuY3VycmVudDtqLnRvdGFsU2NvcmUhPT1iZS5zY29yZSYmKGJlLnNjb3JlPWoudG90YWxTY29yZSxNKGoudG90YWxTY29yZSkseWUoV2U9PldlKzEpKSxqLmhvbGVJZHghPT1iZS5ob2xlJiYoYmUuaG9sZT1qLmhvbGVJZHgsVyhNYXRoLm1pbihZYSxqLmhvbGVJZHgrMSkpLFYoai5wYXJzW2ouaG9sZUlkeF0/PzIpKSxqLnN0cm9rZXMhPT1iZS5zdHJva2VzJiYoYmUuc3Ryb2tlcz1qLnN0cm9rZXMsUyhqLnN0cm9rZXMpKSxqLnJlc3VsdHMubGVuZ3RoIT09YmUucmVzdWx0cyYmKGJlLnJlc3VsdHM9ai5yZXN1bHRzLmxlbmd0aCxvZShbLi4uai5yZXN1bHRzXSkpO2NvbnN0IG5lPW8uY3VycmVudDtqLmV2TGF1bmNoIT09bmUubGF1bmNoJiYobmUubGF1bmNoPWouZXZMYXVuY2gsb2wubGF1bmNoKCkpLGouZXZCb3VuY2UhPT1uZS5ib3VuY2UmJihuZS5ib3VuY2U9ai5ldkJvdW5jZSxvbC5ib3VuY2UoKSksai5ldkhvbGUhPT1uZS5ob2xlJiYobmUuaG9sZT1qLmV2SG9sZSxvbC5ob2xlKCkpLGouZXZVbmRlclBhciE9PW5lLnVuZGVyJiYobmUudW5kZXI9ai5ldlVuZGVyUGFyLG9sLnVuZGVyUGFyKCkpLGouZXZMb3N0IT09bmUubG9zdCYmKG5lLmxvc3Q9ai5ldkxvc3Qsb2wubG9zdCgpKSxYPT09InJ1bm5pbmciJiZqLm1vZGU9PT0ib3ZlciImJnZlKCk7Y29uc3Qgc2U9ZS5jdXJyZW50LHBlPXUuY3VycmVudDtpZihzZSYmcGUudz4wKXtjb25zdCBXZT1zZS5nZXRDb250ZXh0KCIyZCIpO1dlJiZ4MShXZSxqLHBlLncscGUuaCxYLGZsW09lLmN1cnJlbnRdKX16PXJlcXVlc3RBbmltYXRpb25GcmFtZShmZSl9O3o9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZlKTtjb25zdCBQPWwuY3VycmVudCxpZT1lLmN1cnJlbnQ7bGV0IFk9bnVsbDtpZihQJiZpZSl7Y29uc3QgTz0oKT0+e2NvbnN0IGo9UC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxnZT1NYXRoLm1heCgwLE1hdGguZmxvb3IoTWF0aC5taW4oai53aWR0aCxqLmhlaWdodCkpKSxYPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpO2llLndpZHRoPU1hdGgucm91bmQoZ2UqWCksaWUuaGVpZ2h0PU1hdGgucm91bmQoZ2UqWCksaWUuc3R5bGUud2lkdGg9YCR7Z2V9cHhgLGllLnN0eWxlLmhlaWdodD1gJHtnZX1weGAsdS5jdXJyZW50PXt3OmdlLGg6Z2V9O2NvbnN0IFQ9aWUuZ2V0Q29udGV4dCgiMmQiKTtUJiZULnNldFRyYW5zZm9ybShYLDAsMCxYLDAsMCl9O08oKSxZPW5ldyBSZXNpemVPYnNlcnZlcihPKSxZLm9ic2VydmUoUCl9Y29uc3QgXz1PPT57Y29uc3Qgaj1PLmtleS50b0xvd2VyQ2FzZSgpLGdlPWEuY3VycmVudDtpZihqPT09ImFycm93bGVmdCJ8fGo9PT0iYSIpe08ucHJldmVudERlZmF1bHQoKSxnZS5tb2RlPT09ImFpbSImJihnZS5haW1BbmdsZS09LjA0NSk7cmV0dXJufWlmKGo9PT0iYXJyb3dyaWdodCJ8fGo9PT0iZCIpe08ucHJldmVudERlZmF1bHQoKSxnZS5tb2RlPT09ImFpbSImJihnZS5haW1BbmdsZSs9LjA0NSk7cmV0dXJufWlmKGo9PT0iYXJyb3d1cCJ8fGo9PT0idyIpe08ucHJldmVudERlZmF1bHQoKSxnZS5tb2RlPT09ImFpbSImJihnZS5haW1Qb3dlcj1NYXRoLm1pbigxLGdlLmFpbVBvd2VyKy4wMikpO3JldHVybn1pZihqPT09ImFycm93ZG93biJ8fGo9PT0icyIpe08ucHJldmVudERlZmF1bHQoKSxnZS5tb2RlPT09ImFpbSImJihnZS5haW1Qb3dlcj1NYXRoLm1heCguMDgsZ2UuYWltUG93ZXItLjAyKSk7cmV0dXJufWlmKGo9PT0iICIpe08ucHJldmVudERlZmF1bHQoKSxPLnJlcGVhdHx8JCgpO3JldHVybn1pZihqPT09ImgiKXt2LmN1cnJlbnQ9PT0icnVubmluZyImJmdlLm1vZGU9PT0iZmx5IiYmKGdlLnBvZD17eDpnZS5zdGFydC54LHk6Z2Uuc3RhcnQueSx2eDowLHZ5OjB9LGdlLnRyYWlsPVtdLGdlLm1vZGU9ImFpbSIsZ2UubW9kZVQ9MCk7cmV0dXJufWlmKGo9PT0iciIpe2soKTtyZXR1cm59aWYoaj09PSJwInx8aj09PSJlc2NhcGUiKXtjb25zdCBYPXYuY3VycmVudDtYPT09InJ1bm5pbmciP0woKTpYPT09InBhdXNlZCImJnVlKCk7cmV0dXJufWlmKGo9PT0ibSIpe2hlKCk7cmV0dXJufWo9PT0iMSImJkooImNhZGV0Iiksaj09PSIyIiYmSigicGlsb3QiKSxqPT09IjMiJiZKKCJ2b2lkIil9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixfKTtjb25zdCBJPSgpPT57ZG9jdW1lbnQuaGlkZGVuJiZ2LmN1cnJlbnQ9PT0icnVubmluZyImJkwoKX0sZGU9KCk9Pnt2LmN1cnJlbnQ9PT0icnVubmluZyImJkwoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLEkpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixkZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZSh6KSx0ZSgpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXlkb3duIixfKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixJKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYmx1ciIsZGUpLFkmJlkuZGlzY29ubmVjdCgpfX0sW0osdGUsdmUsTCwkLHVlLGssaGVdKSx7Y2FudmFzUmVmOmUsd3JhcFJlZjpsLHBoYXNlOm0sc2NvcmU6dyxob2xlOlIsc3Ryb2tlczpRLHBhcjpILHJlc3VsdHM6cSxwb3BLZXk6Wixpc05ld0Jlc3Q6U2UsZGlmZmljdWx0eTpQZSxiZXN0czpCZSxtdXRlZDpMZSxhY3Rpb25zOntzdGFydDprLHByaW1hcnk6JCxwYXVzZUdhbWU6TCxyZXN1bWVHYW1lOnVlLGNoYW5nZURpZmZpY3VsdHk6Six0b2dnbGVNdXRlOmhlLG9uUG9pbnRlckRvd246eGUsb25Qb2ludGVyTW92ZTphZSxvblBvaW50ZXJVcDplZX19fWNvbnN0IGswPVt7aWQ6ImNhZGV0IixsYWJlbDoiQ2FkZXQiLHRhZzoiR2VudGxlIHdlbGxzLCBiaWcgYmVhY29uIixkb3RzOjF9LHtpZDoicGlsb3QiLGxhYmVsOiJQaWxvdCIsdGFnOiJUaGUgc3RhbmRhcmQgZHJpZnQiLGRvdHM6Mn0se2lkOiJ2b2lkIixsYWJlbDoiVm9pZCIsdGFnOiJSb2FtaW5nIHdvcmxkcyIsZG90czozfV07ZnVuY3Rpb24gJGEoe2xhYmVsOmUsdmFsdWU6bCxhY2NlbnQ6YT0hMSxwb3A6dT0wfSl7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbci5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46ZX0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7YT8iYW5pbWF0ZS1wb3AgdGV4dC1bIzdlZjBjOF0gW3RleHQtc2hhZG93OjBfMF8xMnB4X3JnYmEoMTI2LDI0MCwyMDAsMC41KV0iOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmx9LHUpXX0pfWZ1bmN0aW9uIGdzKHtrZXlzTGlzdDplLGFjdGlvbjpsfSl7cmV0dXJuIHIuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjplfSksci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmx9KV19KX1mdW5jdGlvbiB3MSgpe2NvbnN0IGU9djEoKSx7YWN0aW9uczpsLHBoYXNlOmF9PWUsdT1hPT09InJ1bm5pbmciO3JldHVybiByLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbci5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltyLmpzeCgkYSx7bGFiZWw6IlRvdGFsIix2YWx1ZTplLnNjb3JlLGFjY2VudDohMCxwb3A6ZS5wb3BLZXl9KSxyLmpzeCgkYSx7bGFiZWw6IkhvbGUiLHZhbHVlOmAke2UuaG9sZX0vJHtZYX1gfSksci5qc3goJGEse2xhYmVsOiJTdHJva2VzIix2YWx1ZTplLnN0cm9rZXN9KSxyLmpzeCgkYSx7bGFiZWw6IlBhciIsdmFsdWU6ZS5wYXJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJDYXJkIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IG1heC13LVsxNTBweF0gZmxleC13cmFwIGdhcC0xIHB0LTEiLGNoaWxkcmVuOltlLnJlc3VsdHMubWFwKChkLG8pPT5yLmpzeCgic3BhbiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHJvdW5kZWQgcHgtMSB0ZXh0LVs4cHhdICR7ZD09PTE/ImJnLVsjZmZlMDhhXSB0ZXh0LVsjMjIxNjA0XSI6ImJnLXBpdC03MDAgdGV4dC1tb3NzLTIwMCJ9YCxjaGlsZHJlbjpkfSxvKSksZS5yZXN1bHRzLmxlbmd0aD09PTAmJnIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVs5cHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiLigJQifSldfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOnU/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTp1PyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOnU/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiF1JiZhIT09InBhdXNlZCIsY2hpbGRyZW46dT9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4KCJkaXYiLHtyZWY6ZS53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbci5qc3goImNhbnZhcyIse3JlZjplLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1jcm9zc2hhaXIiLG9uUG9pbnRlckRvd246bC5vblBvaW50ZXJEb3duLG9uUG9pbnRlck1vdmU6bC5vblBvaW50ZXJNb3ZlLG9uUG9pbnRlclVwOmwub25Qb2ludGVyVXAsb25Qb2ludGVyQ2FuY2VsOmwub25Qb2ludGVyVXAsb25Db250ZXh0TWVudTpkPT5kLnByZXZlbnREZWZhdWx0KCl9KSxhPT09ImlkbGUiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMDUwNzBmXS84NSBwLTYgdGV4dC1jZW50ZXIgYmFja2Ryb3AtYmx1ci1bMnB4XSIsY2hpbGRyZW46W3IuanN4KCJoMSIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtaWNlIGZvbnQtZGlzcGxheSB0ZXh0LTN4bCBzbTp0ZXh0LTR4bCIsY2hpbGRyZW46Ik9SQklUQUwifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1bIzlmZDhmZl0iLGNoaWxkcmVuOiJHUkFWSVRZIEdPTEYgwrcgOSBIT0xFUyJ9KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgVGVlIE9mZiJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IkRSQUcgQkFDSyAmIFJFTEVBU0UgVE8gRkxJTkcifSldfSksYT09PSJwYXVzZWQiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMDUwNzBmXS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtaWNlIGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiT1JCSVQgSEVMRCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5yZXN1bWVHYW1lLGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KX0pLHIuanN4KEFlLHtvbkNsaWNrOmwuc3RhcnQsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KFVlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN0YXJ0Il19KX0pXX0pXX0pLGE9PT0ib3ZlciImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTQgYmctWyMwNTA3MGZdLzkwIHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1pY2UgZm9udC1kaXNwbGF5IHRleHQtMnhsIixjaGlsZHJlbjoiQ09VUlNFIENMRUFSIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWVuZCBnYXAtNiIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlRPVEFMIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1bIzdlZjBjOF0iLGNoaWxkcmVuOmUuc2NvcmV9KV19KSxyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCRVNUIn0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46ZS5iZXN0c1tlLmRpZmZpY3VsdHldfSldfSldfSksci5qc3goImRpdiIse2NsYXNzTmFtZToiZmxleCBtYXgtdy1bMjgwcHhdIGZsZXgtd3JhcCBqdXN0aWZ5LWNlbnRlciBnYXAtMSIsY2hpbGRyZW46ZS5yZXN1bHRzLm1hcCgoZCxvKT0+ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgcm91bmRlZCBweC0xLjUgcHktMC41IHRleHQtWzhweF0gJHtkPT09MT8iYmctWyNmZmUwOGFdIHRleHQtWyMyMjE2MDRdIjoiYmctcGl0LTcwMCB0ZXh0LW1vc3MtMjAwIn1gLGNoaWxkcmVuOlsiSCIsbysxLCI6ICIsZF19LG8pKX0pLGUuaXNOZXdCZXN0JiZyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSksci5qc3goQWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBsYXkgVGhlIENvdXJzZSBBZ2FpbiJdfSl9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSksci5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmE9PT0icnVubmluZyI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChndCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGxheSBBZ2FpbiJdfSk6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgVGVlIE9mZiJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3hzKHJ0LHt0aXRsZToiRmxpZ2h0IE1hbnVhbCIsY2hpbGRyZW46W3IuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3IuanN4cygibGkiLHtjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM3ZWYwYzhdIixjaGlsZHJlbjoiQmVhY29uIn0pLCIg4oCUIGxhbmQgdGhlIHBvZCBpbiB0aGUgcmluZyB0byBjbGVhciB0aGUgaG9sZS4iXX0pLHIuanN4cygibGkiLHtjaGlsZHJlbjpbci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM5ZmQ4ZmZdIixjaGlsZHJlbjoiUGxhbmV0cyJ9KSwiIOKAlCB0aGVpciBncmF2aXR5IGJlbmRzIHlvdXIgZmxpZ2h0OyBzdXJmYWNlcyBib3VuY2UuIl19KSxyLmpzeHMoImxpIix7Y2hpbGRyZW46W3IuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LWFtYmVyZ2xvdy0zMDAiLGNoaWxkcmVuOiJTY29yaW5nIn0pLCIg4oCUIHVwIHRvIDUyMCBwZXIgaG9sZSwgKzI2MCBib251cyBhdCBvciB1bmRlciBwYXIsIGhvbGUtaW4tb25lIHBheXMgYmVzdC4iXX0pXX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0yIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IkZseSBvdXQgb2YgYm91bmRzIGFuZCB0aGUgcG9kIHJlc3Bhd25zIOKAlCB0aGUgc3Ryb2tlIHN0aWxsIGNvdW50cy4ifSldfSksci5qc3goZG4se3RpdGxlOiJMZWFndWUiLG9wdGlvbnM6azAsdmFsdWU6ZS5kaWZmaWN1bHR5LG9uQ2hhbmdlOmwuY2hhbmdlRGlmZmljdWx0eSxkaXNhYmxlZDphPT09InJ1bm5pbmcifHxhPT09InJlYWR5Inx8YT09PSJwYXVzZWQifSksci5qc3gocG4se2Jlc3RzOmUuYmVzdHMsb3B0aW9uczprMCxhY3RpdmU6ZS5kaWZmaWN1bHR5fSksci5qc3gocnQse3RpdGxlOiJDb250cm9scyIsY2hpbGRyZW46ci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbci5qc3goZ3Mse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJEcmFnICsgcmVsZWFzZSJ9KSxhY3Rpb246IlNsaW5nc2hvdCBmbGluZyJ9KSxyLmpzeChncyx7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoi4oaQIn0pLHIuanN4KEEse2NoaWxkcmVuOiLihpIifSldfSksYWN0aW9uOiJBaW0gYW5nbGUifSksci5qc3goZ3Mse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IuKGkSJ9KSxyLmpzeChBLHtjaGlsZHJlbjoi4oaTIn0pXX0pLGFjdGlvbjoiUG93ZXIifSksci5qc3goZ3Mse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiJTcGFjZSJ9KSxhY3Rpb246IkxhdW5jaCJ9KSxyLmpzeChncyx7a2V5c0xpc3Q6ci5qc3goQSx7Y2hpbGRyZW46IkgifSksYWN0aW9uOiJSZWNhbGwgcG9kIn0pLHIuanN4KGdzLHtrZXlzTGlzdDpyLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KEEse2NoaWxkcmVuOiJQIn0pLHIuanN4KEEse2NoaWxkcmVuOiJSIn0pLHIuanN4KEEse2NoaWxkcmVuOiJNIn0pXX0pLGFjdGlvbjoiUGF1c2UgwrcgcmVzdGFydCDCtyBzb3VuZCJ9KV19KX0pXX0pXX0pXX0pfWNvbnN0IFByPXtyb29raWU6e2xhYmVsOiJST09LSUUiLHRhZzoiMTIgY2FyZHMgwrcgNiBwYWlycyIsZG90czoxLGNvbHM6NCxyb3dzOjMscGFyU2VjOjM1fSxwcm86e2xhYmVsOiJQUk8iLHRhZzoiMTYgY2FyZHMgwrcgOCBwYWlycyIsZG90czoyLGNvbHM6NCxyb3dzOjQscGFyU2VjOjYwfSxtYXN0ZXI6e2xhYmVsOiJNQVNURVIiLHRhZzoiMjQgY2FyZHMgwrcgMTIgcGFpcnMiLGRvdHM6Myxjb2xzOjYscm93czo0LHBhclNlYzoxMDB9fSxiMT1be2NoOiLinKYiLGNvbG9yOiIjZmZkMTY2In0se2NoOiLil4YiLGNvbG9yOiIjZmY1ZDhmIn0se2NoOiLilrIiLGNvbG9yOiIjOGVmMDVhIn0se2NoOiLil48iLGNvbG9yOiIjNjJlNmZmIn0se2NoOiLimaYiLGNvbG9yOiIjZmY4YzQyIn0se2NoOiLinJoiLGNvbG9yOiIjYzA4NGZjIn0se2NoOiLirJ8iLGNvbG9yOiIjN2VmMGM4In0se2NoOiLimL4iLGNvbG9yOiIjOWZkOGZmIn0se2NoOiLimIUiLGNvbG9yOiIjZmZlMDhhIn0se2NoOiLirKIiLGNvbG9yOiIjZmY5ZGI4In0se2NoOiLimaoiLGNvbG9yOiIjYjZmMDljIn0se2NoOiLinLgiLGNvbG9yOiIjZmZjMzZiIn1dLHlwPSJtZW1vcnl2YXVsdC5iZXN0cy52MSIsdnA9Im1lbW9yeXZhdWx0LmRpZmYudjEiO2Z1bmN0aW9uIGsxKCl7Y29uc3QgZT17cm9va2llOjAscHJvOjAsbWFzdGVyOjB9O3RyeXtjb25zdCBsPWxvY2FsU3RvcmFnZS5nZXRJdGVtKHlwKTtpZighbClyZXR1cm4gZTtjb25zdCBhPUpTT04ucGFyc2UobCk7cmV0dXJue3Jvb2tpZTpOdW1iZXIoYS5yb29raWUpfHwwLHBybzpOdW1iZXIoYS5wcm8pfHwwLG1hc3RlcjpOdW1iZXIoYS5tYXN0ZXIpfHwwfX1jYXRjaHtyZXR1cm4gZX19ZnVuY3Rpb24gajEoKXt0cnl7Y29uc3QgZT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh2cCk7aWYoZT09PSJyb29raWUifHxlPT09InBybyJ8fGU9PT0ibWFzdGVyIilyZXR1cm4gZX1jYXRjaHt9cmV0dXJuInBybyJ9ZnVuY3Rpb24gd3AoZSl7Y29uc3QgbD1bLi4uZV07Zm9yKGxldCBhPWwubGVuZ3RoLTE7YT4wO2EtLSl7Y29uc3QgdT1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGErMSkpO1tsW2FdLGxbdV1dPVtsW3VdLGxbYV1dfXJldHVybiBsfWZ1bmN0aW9uIHhjKGUpe2NvbnN0IGw9ZS5jb2xzKmUucm93cy8yLGE9QXJyYXkuZnJvbSh7bGVuZ3RoOmwqMn0sKGQsbyk9Pm8pLHU9d3AoYSk7cmV0dXJuIGEubWFwKGQ9Pih7aWQ6ZCxnbHlwaDpNYXRoLmZsb29yKGQvMiksc2xvdDp1W2RdfSkpfWZ1bmN0aW9uIFMxKCl7Y29uc3QgZT14LnVzZVJlZihqMSgpKSxsPXgudXNlUmVmKHtjYXJkczp4YyhQcltlLmN1cnJlbnRdKSxmbGlwcGVkOltdLG1hdGNoZWQ6W10sYnVzeTohMX0pLGE9eC51c2VSZWYoW10pLHU9eC51c2VSZWYoMCksZD14LnVzZVJlZigwKSxvPXgudXNlUmVmKDApLFtwLGhdPXgudXNlU3RhdGUoImlkbGUiKSxtPXgudXNlUmVmKCJpZGxlIiksW2csdl09eC51c2VTdGF0ZShsLmN1cnJlbnQuY2FyZHMpLFt3LE1dPXgudXNlU3RhdGUoW10pLFtSLFddPXgudXNlU3RhdGUoW10pLFtRLFNdPXgudXNlU3RhdGUoMCksW0gsVl09eC51c2VTdGF0ZSgwKSxbcSxvZV09eC51c2VTdGF0ZSgwKSxbWix5ZV09eC51c2VTdGF0ZSgwKSxbU2Usa2VdPXgudXNlU3RhdGUoMCksW1BlLEVlXT14LnVzZVN0YXRlKDApLFtPZSxCZV09eC51c2VTdGF0ZSgwKSxbemUsRmVdPXgudXNlU3RhdGUoITEpLFtMZSxqZV09eC51c2VTdGF0ZShlLmN1cnJlbnQpLHdlPXgudXNlUmVmKGUuY3VycmVudCksW1UsdGVdPXgudXNlU3RhdGUoazEpLEY9eC51c2VSZWYoVSksW2ssTF09eC51c2VTdGF0ZShobiksdWU9eC51c2VSZWYoayksJD14LnVzZUNhbGxiYWNrKFk9PnttLmN1cnJlbnQ9WSxoKFkpfSxbXSksSj14LnVzZUNhbGxiYWNrKCgpPT57Zm9yKGNvbnN0IFkgb2YgYS5jdXJyZW50KXdpbmRvdy5jbGVhclRpbWVvdXQoWSk7YS5jdXJyZW50PVtdfSxbXSksaGU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFk9bC5jdXJyZW50O3YoWy4uLlkuY2FyZHNdKSxNKFsuLi5ZLmZsaXBwZWRdKSxXKFsuLi5ZLm1hdGNoZWRdKX0sW10pLHZlPXgudXNlQ2FsbGJhY2soKCk9PntYZSgpLEooKTtjb25zdCBZPWwuY3VycmVudDtZLmNhcmRzPXhjKFByW3dlLmN1cnJlbnRdKSxZLmZsaXBwZWQ9W10sWS5tYXRjaGVkPVtdLFkuYnVzeT0hMSx1LmN1cnJlbnQ9MCxkLmN1cnJlbnQ9MCxvLmN1cnJlbnQ9MCxWKDApLG9lKDApLHllKDApLGtlKDApLEVlKDApLFMoMCksRmUoITEpLGhlKCksJCgicnVubmluZyIpLGlzLnNodWZmbGUoKX0sW0osJCxoZV0pLEc9eC51c2VDYWxsYmFjaygoKT0+e20uY3VycmVudD09PSJydW5uaW5nIiYmJCgicGF1c2VkIil9LFskXSkseGU9eC51c2VDYWxsYmFjaygoKT0+e20uY3VycmVudD09PSJwYXVzZWQiJiYoWGUoKSwkKCJydW5uaW5nIikpfSxbJF0pLGFlPXgudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBZPW0uY3VycmVudDtZPT09ImlkbGUifHxZPT09Im92ZXIiP3ZlKCk6WT09PSJydW5uaW5nIj9HKCk6WT09PSJwYXVzZWQiJiZ4ZSgpfSxbdmUsRyx4ZV0pLGVlPXgudXNlQ2FsbGJhY2soWT0+e2lmKG0uY3VycmVudD09PSJydW5uaW5nInx8bS5jdXJyZW50PT09InBhdXNlZCIpcmV0dXJuO3dlLmN1cnJlbnQ9WSxqZShZKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0odnAsWSl9Y2F0Y2h7fUooKTtjb25zdCBfPWwuY3VycmVudDtfLmNhcmRzPXhjKFByW1ldKSxfLmZsaXBwZWQ9W10sXy5tYXRjaGVkPVtdLF8uYnVzeT0hMSxkLmN1cnJlbnQ9MCxvLmN1cnJlbnQ9MCx1LmN1cnJlbnQ9MCxWKDApLG9lKDApLHllKDApLGtlKDApLEVlKDApLFMoMCksRmUoITEpLGhlKCl9LFtKLGhlXSksej14LnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgWT0hdWUuY3VycmVudDt1ZS5jdXJyZW50PVksTChZKSx1dChZKSxtbihZKX0sW10pLGZlPXgudXNlQ2FsbGJhY2soWT0+e2lmKG0uY3VycmVudCE9PSJydW5uaW5nIilyZXR1cm47Y29uc3QgXz1sLmN1cnJlbnQ7aWYoXy5idXN5fHxfLmZsaXBwZWQubGVuZ3RoPj0yfHxfLm1hdGNoZWQuaW5jbHVkZXMoWSl8fF8uZmxpcHBlZC5pbmNsdWRlcyhZKXx8KFhlKCksXy5mbGlwcGVkPVsuLi5fLmZsaXBwZWQsWV0saXMuZmxpcCgpLGhlKCksXy5mbGlwcGVkLmxlbmd0aDwyKSlyZXR1cm47Xy5idXN5PSEwLHllKFg9PlgrMSk7Y29uc3RbSSxkZV09Xy5mbGlwcGVkLE89Xy5jYXJkcy5maW5kKFg9PlguaWQ9PT1JKSxqPV8uY2FyZHMuZmluZChYPT5YLmlkPT09ZGUpO08hPT12b2lkIDAmJmohPT12b2lkIDAmJk8uZ2x5cGg9PT1qLmdseXBoP2EuY3VycmVudC5wdXNoKHdpbmRvdy5zZXRUaW1lb3V0KCgpPT57Xy5tYXRjaGVkPVsuLi5fLm1hdGNoZWQsSSxkZV0sXy5mbGlwcGVkPVtdLF8uYnVzeT0hMTtjb25zdCBYPTEwMCtvLmN1cnJlbnQqNDA7aWYoby5jdXJyZW50KyssZC5jdXJyZW50Kz1YLFYoZC5jdXJyZW50KSxvZShvLmN1cnJlbnQpLEJlKFQ9PlQrMSksaXMubWF0Y2goKSxoZSgpLF8ubWF0Y2hlZC5sZW5ndGg9PT1fLmNhcmRzLmxlbmd0aCl7Y29uc3QgVD1Qclt3ZS5jdXJyZW50XS5wYXJTZWMsYmU9dS5jdXJyZW50LzFlMyxuZT1NYXRoLm1heCgwLE1hdGgucm91bmQoKFQtYmUpKjEwKSk7ZC5jdXJyZW50Kz1uZSxWKGQuY3VycmVudCksRWUobmUpO2NvbnN0IHNlPXdlLmN1cnJlbnQ7aWYoZC5jdXJyZW50PkYuY3VycmVudFtzZV0pe2NvbnN0IHBlPXsuLi5GLmN1cnJlbnQsW3NlXTpkLmN1cnJlbnR9O0YuY3VycmVudD1wZSx0ZShwZSksRmUoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh5cCxKU09OLnN0cmluZ2lmeShwZSkpfWNhdGNoe319aXMud2luKCksJCgib3ZlciIpfX0sNDIwKSk6YS5jdXJyZW50LnB1c2god2luZG93LnNldFRpbWVvdXQoKCk9PntfLmZsaXBwZWQ9W10sby5jdXJyZW50PTAsb2UoMCksaXMubWlzbWF0Y2goKSxoZSgpLGEuY3VycmVudC5wdXNoKHdpbmRvdy5zZXRUaW1lb3V0KCgpPT57Y29uc3QgWD1fLmNhcmRzLmZpbHRlcihuZT0+IV8ubWF0Y2hlZC5pbmNsdWRlcyhuZS5pZCkpLFQ9d3AoWC5tYXAobmU9Pm5lLnNsb3QpKSxiZT1uZXcgTWFwKFgubWFwKChuZSxzZSk9PltuZS5pZCxUW3NlXV0pKTtfLmNhcmRzPV8uY2FyZHMubWFwKG5lPT5iZS5oYXMobmUuaWQpP3suLi5uZSxzbG90OmJlLmdldChuZS5pZCl9Om5lKSxfLmJ1c3k9ITEsaXMuc2h1ZmZsZSgpLGhlKCl9LDI2MCkpfSw3ODApKX0sWyQsaGVdKSxQPXgudXNlQ2FsbGJhY2soKFksXyk9Pntjb25zdCBJPVByW3dlLmN1cnJlbnRdO1MoZGU9Pntjb25zdCBPPWwuY3VycmVudC5jYXJkcy5maW5kKGJlPT5iZS5zbG90PT09ZGUpO2lmKCFPKXJldHVybiBkZTtjb25zdCBqPU1hdGguZmxvb3IoTy5zbG90L0kuY29scyksZ2U9Ty5zbG90JUkuY29scyxYPU1hdGgubWluKEkucm93cy0xLE1hdGgubWF4KDAsaitfKSksVD1NYXRoLm1pbihJLmNvbHMtMSxNYXRoLm1heCgwLGdlK1kpKTtyZXR1cm4gWCpJLmNvbHMrVH0pfSxbXSksaWU9eC51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFk9bC5jdXJyZW50LmNhcmRzLmZpbmQoXz0+Xy5zbG90PT09USk7WSYmZmUoWS5pZCl9LFtRLGZlXSk7cmV0dXJuIHgudXNlRWZmZWN0KCgpPT57Y29uc3QgWT13aW5kb3cuc2V0SW50ZXJ2YWwoKCk9PnttLmN1cnJlbnQ9PT0icnVubmluZyImJih1LmN1cnJlbnQrPTEwMCxrZSh1LmN1cnJlbnQpKX0sMTAwKTtyZXR1cm4oKT0+e3dpbmRvdy5jbGVhckludGVydmFsKFkpLEooKX19LFtKXSkseC51c2VFZmZlY3QoKCk9Pnt1dCh1ZS5jdXJyZW50KTtjb25zdCBZPV89Pntjb25zdCBJPV8ua2V5LnRvTG93ZXJDYXNlKCk7aWYoST09PSJhcnJvd2xlZnQiKXtfLnByZXZlbnREZWZhdWx0KCksUCgtMSwwKTtyZXR1cm59aWYoST09PSJhcnJvd3JpZ2h0Iil7Xy5wcmV2ZW50RGVmYXVsdCgpLFAoMSwwKTtyZXR1cm59aWYoST09PSJhcnJvd3VwIil7Xy5wcmV2ZW50RGVmYXVsdCgpLFAoMCwtMSk7cmV0dXJufWlmKEk9PT0iYXJyb3dkb3duIil7Xy5wcmV2ZW50RGVmYXVsdCgpLFAoMCwxKTtyZXR1cm59aWYoST09PSIgInx8ST09PSJlbnRlciIpe18ucHJldmVudERlZmF1bHQoKSxtLmN1cnJlbnQ9PT0icnVubmluZyI/aWUoKTphZSgpO3JldHVybn1pZihJPT09InIiKXt2ZSgpO3JldHVybn1pZihJPT09InAifHxJPT09ImVzY2FwZSIpe2NvbnN0IGRlPW0uY3VycmVudDtkZT09PSJydW5uaW5nIj9HKCk6ZGU9PT0icGF1c2VkIiYmeGUoKTtyZXR1cm59aWYoST09PSJtIil7eigpO3JldHVybn1JPT09IjEiJiZlZSgicm9va2llIiksST09PSIyIiYmZWUoInBybyIpLEk9PT0iMyImJmVlKCJtYXN0ZXIiKX07cmV0dXJuIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixZKSwoKT0+d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLFkpfSxbZWUsaWUsUCxHLGFlLHhlLHZlLHpdKSx7cGhhc2U6cCxjYXJkczpnLGZsaXBwZWQ6dyxtYXRjaGVkOlIsY3Vyc29yOlEsc2NvcmU6SCxzdHJlYWs6cSxtb3ZlczpaLHRpbWVNczpTZSx0aW1lQm9udXM6UGUscG9wS2V5Ok9lLGlzTmV3QmVzdDp6ZSxkaWZmaWN1bHR5OkxlLGJlc3RzOlUsbXV0ZWQ6ayxjb25maWc6UHJbTGVdLGFjdGlvbnM6e3N0YXJ0OnZlLHByaW1hcnk6YWUscGF1c2VHYW1lOkcscmVzdW1lR2FtZTp4ZSxmbGlwOmZlLGNoYW5nZURpZmZpY3VsdHk6ZWUsdG9nZ2xlTXV0ZTp6fX19Y29uc3QgajA9W3tpZDoicm9va2llIixsYWJlbDoiUm9va2llIix0YWc6IjEyIGNhcmRzIMK3IDYgcGFpcnMiLGRvdHM6MX0se2lkOiJwcm8iLGxhYmVsOiJQcm8iLHRhZzoiMTYgY2FyZHMgwrcgOCBwYWlycyIsZG90czoyfSx7aWQ6Im1hc3RlciIsbGFiZWw6Ik1hc3RlciIsdGFnOiIyNCBjYXJkcyDCtyAxMiBwYWlycyIsZG90czozfV07ZnVuY3Rpb24gUzAoZSl7Y29uc3QgbD1NYXRoLmZsb29yKGUvMWUzKTtyZXR1cm5gJHtNYXRoLmZsb29yKGwvNjApfToke1N0cmluZyhsJTYwKS5wYWRTdGFydCgyLCIwIil9YH1mdW5jdGlvbiBkbCh7bGFiZWw6ZSx2YWx1ZTpsLGFjY2VudDphPSExLHBvcDp1PTB9KXtyZXR1cm4gci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjplfSksci5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHthPyJhbmltYXRlLXBvcCB0ZXh0LVsjZThjNTZhXSBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSgyMzIsMTk3LDEwNiwwLjUpXSI6InRleHQtbW9zcy0xMDAifWAsY2hpbGRyZW46bH0sdSldfSl9ZnVuY3Rpb24geHMoe2tleXNMaXN0OmUsYWN0aW9uOmx9KXtyZXR1cm4gci5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgZ2FwLTEiLGNoaWxkcmVuOmV9KSxyLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46bH0pXX0pfWZ1bmN0aW9uIE4xKCl7Y29uc3QgZT1TMSgpLHthY3Rpb25zOmwscGhhc2U6YSxjb25maWc6dX09ZSxkPWE9PT0icnVubmluZyIsbz11LmNvbHMqdS5yb3dzLzIscD1lLm1hdGNoZWQubGVuZ3RoLzI7cmV0dXJuIHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLXJpc2UiLGNoaWxkcmVuOltyLmpzeHMoImhlYWRlciIse2NsYXNzTmFtZToibWItNCBmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQganVzdGlmeS1iZXR3ZWVuIGdhcC0zIixjaGlsZHJlbjpbci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBnYXAtMiBzbTpnYXAtMyIsY2hpbGRyZW46W3IuanN4KGRsLHtsYWJlbDoiU2NvcmUiLHZhbHVlOmUuc2NvcmUsYWNjZW50OiEwLHBvcDplLnBvcEtleX0pLHIuanN4KGRsLHtsYWJlbDoiVGltZSIsdmFsdWU6UzAoZS50aW1lTXMpfSksci5qc3goZGwse2xhYmVsOiJNb3ZlcyIsdmFsdWU6ZS5tb3Zlc30pLHIuanN4KGRsLHtsYWJlbDoiU3RyZWFrIix2YWx1ZTpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM3ZWYwYzhdIixjaGlsZHJlbjpbIsOXIixlLnN0cmVha119KX0pLHIuanN4KGRsLHtsYWJlbDoiUGFpcnMiLHZhbHVlOmAke3B9LyR7b31gfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmQ/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpkPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmQ/bC5wYXVzZUdhbWU6bC5yZXN1bWVHYW1lLGRpc2FibGVkOiFkJiZhIT09InBhdXNlZCIsY2hpbGRyZW46ZD9yLmpzeChndCx7fSk6ci5qc3goX2Use30pfSksci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeChVZSx7fSl9KSxyLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6ZS5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazpsLnRvZ2dsZU11dGUsY2hpbGRyZW46ZS5tdXRlZD9yLmpzeChmbix7fSk6ci5qc3godW4se30pfSldfSldfSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3IuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSByZWxhdGl2ZSBteC1hdXRvIHctZnVsbCBtYXgtdy1bNzYwcHhdIHRvdWNoLW5vbmUgc2VsZWN0LW5vbmUgb3ZlcmZsb3ctaGlkZGVuIHAtMyBzbTpwLTQiLHN0eWxlOnthc3BlY3RSYXRpbzpgJHt1LmNvbHN9IC8gJHt1LnJvd3N9YH0sY2hpbGRyZW46W3IuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMCIsc3R5bGU6e2JhY2tncm91bmQ6InJhZGlhbC1ncmFkaWVudChlbGxpcHNlIDcwJSA2MCUgYXQgNTAlIDQ1JSwgcmdiYSgyMzIsMTk3LDEwNiwwLjA4KSwgdHJhbnNwYXJlbnQgNzAlKSwgbGluZWFyLWdyYWRpZW50KCMwYzFkMTMsICMwYTE4MTApIn0sImFyaWEtaGlkZGVuIjoidHJ1ZSJ9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSBoLWZ1bGwgdy1mdWxsIixjaGlsZHJlbjplLmNhcmRzLm1hcChoPT57Y29uc3QgbT1oLnNsb3QldS5jb2xzLGc9TWF0aC5mbG9vcihoLnNsb3QvdS5jb2xzKSx2PWUuZmxpcHBlZC5pbmNsdWRlcyhoLmlkKXx8ZS5tYXRjaGVkLmluY2x1ZGVzKGguaWQpLHc9ZS5tYXRjaGVkLmluY2x1ZGVzKGguaWQpLE09ZS5jdXJzb3I9PT1oLnNsb3QmJmE9PT0icnVubmluZyIsUj1iMVtoLmdseXBoXTtyZXR1cm4gci5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsImFyaWEtbGFiZWwiOnY/YENhcmQgJHtSLmNofWA6IkhpZGRlbiBjYXJkIixvbkNsaWNrOigpPT57aWYoYT09PSJpZGxlInx8YT09PSJvdmVyIil7bC5zdGFydCgpO3JldHVybn1sLmZsaXAoaC5pZCl9LGNsYXNzTmFtZToiYWJzb2x1dGUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tNTAwIGVhc2Utb3V0IixzdHlsZTp7bGVmdDpgJHttL3UuY29scyoxMDB9JWAsdG9wOmAke2cvdS5yb3dzKjEwMH0lYCx3aWR0aDpgJHsxMDAvdS5jb2xzfSVgLGhlaWdodDpgJHsxMDAvdS5yb3dzfSVgLHBhZGRpbmc6IjRweCIsekluZGV4Ok0/NToxfSxjaGlsZHJlbjpyLmpzeHMoImRpdiIse2NsYXNzTmFtZToidjNkIHJlbGF0aXZlIGgtZnVsbCB3LWZ1bGwiLHN0eWxlOnt0cmFuc2Zvcm06dj8icm90YXRlWSgxODBkZWcpIjoicm90YXRlWSgwZGVnKSJ9LGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOmB2ZmFjZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLW1kIGJvcmRlciAke00/ImJvcmRlci1bI2U4YzU2YV0gc2hhZG93LVswXzBfMTRweF9yZ2JhKDIzMiwxOTcsMTA2LDAuNDUpXSI6ImJvcmRlci1waXQtNTAwIn1gLHN0eWxlOntiYWNrZ3JvdW5kOiJsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMWQzYTI5LCAjMGYyNDE3KSIsdHJhbnNmb3JtOiJyb3RhdGVZKDBkZWcpIn0sY2hpbGRyZW46ci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZToiaC0xLzMgdy0xLzMgb3BhY2l0eS01MCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJjaXJjbGUiLHtjeDoiMTIiLGN5OiIxMiIscjoiOSIsc3Ryb2tlOiIjNWQ3ZjZiIixzdHJva2VXaWR0aDoiMS42In0pLHIuanN4KCJjaXJjbGUiLHtjeDoiMTIiLGN5OiIxMiIscjoiMy40IixzdHJva2U6IiM1ZDdmNmIiLHN0cm9rZVdpZHRoOiIxLjQifSksci5qc3goInBhdGgiLHtkOiJNMTIgM3YzTTEyIDE4djNNMyAxMmgzTTE4IDEyaDMiLHN0cm9rZToiIzVkN2Y2YiIsc3Ryb2tlV2lkdGg6IjEuNCIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJ2ZmFjZSB2ZmxpcCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLW1kIGJvcmRlciIsc3R5bGU6e2JhY2tncm91bmQ6dz8icmdiYSgxNSwzNiwyMywwLjkyKSI6IiMxMjI5MWIiLGJvcmRlckNvbG9yOnc/YCR7Ui5jb2xvcn01NWA6Ui5jb2xvcixib3hTaGFkb3c6dz8ibm9uZSI6YDAgMCAxNnB4ICR7Ui5jb2xvcn00NGAsdHJhbnNmb3JtOiJyb3RhdGVZKDE4MGRlZykiLG9wYWNpdHk6dz8uNTU6MX0sY2hpbGRyZW46ci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQteGwgbGVhZGluZy1ub25lIHNtOnRleHQtM3hsIixzdHlsZTp7Y29sb3I6Ui5jb2xvcix0ZXh0U2hhZG93OmAwIDAgMTJweCAke1IuY29sb3J9YH0sY2hpbGRyZW46Ui5jaH0pfSldfSl9LGguaWQpfSl9KSxhPT09ImlkbGUiJiZyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMDYwZjBhXS84OCBwLTQgdGV4dC1jZW50ZXIgYmFja2Ryb3AtYmx1ci1bMnB4XSIsY2hpbGRyZW46W3IuanN4KCJoMSIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtZ29sZCBmb250LWRpc3BsYXkgdGV4dC0yeGwgc206dGV4dC0zeGwiLGNoaWxkcmVuOiJNRU1PUlkgVkFVTFQifSksci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1bI2U4YzU2YV0iLGNoaWxkcmVuOiJDUkFDSyBUSEUgUEFJUlMgQkVGT1JFIFRIRVkgTU9WRSJ9KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChfZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgQ3JhY2sgVGhlIFZhdWx0Il19KX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJtYXgtdy1bMzIwcHhdIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJFdmVyeSBtaXNzZWQgcGFpciBtYWtlcyB0aGUgcmVtYWluaW5nIGNhcmRzIHRyYWRlIHBsYWNlcy4gU3RyZWFrcyBtdWx0aXBseSB5b3VyIHNjb3JlOyBiZWF0IHBhciB0aW1lIGZvciBhIGJvbnVzLiJ9KV19KSxhPT09InBhdXNlZCImJnIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNjBmMGFdLzg4IHAtNCB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3IuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1nb2xkIGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiVkFVTFQgU0VBTEVEIn0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnJlc3VtZUdhbWUsY2hpbGRyZW46ci5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pfSksci5qc3goQWUse29uQ2xpY2s6bC5zdGFydCxjaGlsZHJlbjpyLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbci5qc3goVWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3RhcnQiXX0pfSldfSldfSksYT09PSJvdmVyIiYmci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyBiZy1bIzA2MGYwYV0vOTAgcC00IHRleHQtY2VudGVyIixjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlLWdvbGQgZm9udC1kaXNwbGF5IHRleHQtMnhsIixjaGlsZHJlbjoiVkFVTFQgQ1JBQ0tFRCJ9KSxyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NoaWxkcmVuOltyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtWyNlOGM1NmFdIixjaGlsZHJlbjplLnNjb3JlfSldfSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiQkVTVCJ9KSxyLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmUuYmVzdHNbZS5kaWZmaWN1bHR5XX0pXX0pXX0pLHIuanN4cygicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtWyM3ZWYwYzhdIixjaGlsZHJlbjpbUzAoZS50aW1lTXMpLCIgwrcgIixlLm1vdmVzLCIgTU9WRVMgIixlLnRpbWVCb251cz4wP2DCtyBUSU1FIEJPTlVTICske2UudGltZUJvbnVzfWA6IiJdfSksZS5pc05ld0Jlc3QmJnIuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KSxyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnN0YXJ0LGNoaWxkcmVuOnIuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgQ3JhY2sgSXQgQWdhaW4iXX0pfSldfSldfSksci5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpyLmpzeChBZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazpsLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpyLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmE9PT0icnVubmluZyI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChndCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmE9PT0icGF1c2VkIj9yLmpzeHMoci5GcmFnbWVudCx7Y2hpbGRyZW46W3IuanN4KF9lLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmE9PT0ib3ZlciI/ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChVZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgQ3JhY2sgSXQgQWdhaW4iXX0pOnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goX2Use2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIENyYWNrIFRoZSBWYXVsdCJdfSl9KX0pfSldfSksci5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbci5qc3gocnQse3RpdGxlOiJWYXVsdCBSdWxlcyIsY2hpbGRyZW46ci5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbci5qc3hzKCJsaSIse2NoaWxkcmVuOlsiTWF0Y2ggYSBwYWlyOiAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjZThjNTZhXSIsY2hpbGRyZW46IisxMDAifSksIiBwbHVzICIsci5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM3ZWYwYzhdIixjaGlsZHJlbjoiKzQwIHBlciBzdHJlYWsifSksIi4iXX0pLHIuanN4cygibGkiLHtjaGlsZHJlbjpbIk1pc3MgYW5kIHRoZSB2YXVsdCAiLHIuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjZmY5ZGI4XSIsY2hpbGRyZW46InNodWZmbGVzIGV2ZXJ5IHVubWF0Y2hlZCBjYXJkIn0pLCIuIl19KSxyLmpzeHMoImxpIix7Y2hpbGRyZW46WyJDbGVhciB1bmRlciBwYXIgKCIsUHJbZS5kaWZmaWN1bHR5XS5wYXJTZWMsInMpIGZvciBhIHRpbWUgYm9udXMuIl19KV19KX0pLHIuanN4KGRuLHt0aXRsZToiVmF1bHQgU2l6ZSIsb3B0aW9uczpqMCx2YWx1ZTplLmRpZmZpY3VsdHksb25DaGFuZ2U6bC5jaGFuZ2VEaWZmaWN1bHR5LGRpc2FibGVkOmE9PT0icnVubmluZyJ8fGE9PT0icGF1c2VkIn0pLHIuanN4KHBuLHtiZXN0czplLmJlc3RzLG9wdGlvbnM6ajAsYWN0aXZlOmUuZGlmZmljdWx0eX0pLHIuanN4KHJ0LHt0aXRsZToiQ29udHJvbHMiLGNoaWxkcmVuOnIuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIuNSIsY2hpbGRyZW46W3IuanN4KHhzLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiVGFwIC8gY2xpY2sifSksYWN0aW9uOiJGbGlwIGNhcmQifSksci5qc3goeHMse2tleXNMaXN0OnIuanN4KEEse2NoaWxkcmVuOiLihpDihpHihpPihpIifSksYWN0aW9uOiJNb3ZlIGN1cnNvciJ9KSxyLmpzeCh4cyx7a2V5c0xpc3Q6ci5qc3hzKHIuRnJhZ21lbnQse2NoaWxkcmVuOltyLmpzeChBLHtjaGlsZHJlbjoiU3BhY2UifSksci5qc3goQSx7Y2hpbGRyZW46IkVudGVyIn0pXX0pLGFjdGlvbjoiRmxpcCBhdCBjdXJzb3IifSksci5qc3goeHMse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IlAifSksci5qc3goQSx7Y2hpbGRyZW46IkVzYyJ9KV19KSxhY3Rpb246IlBhdXNlIn0pLHIuanN4KHhzLHtrZXlzTGlzdDpyLmpzeChBLHtjaGlsZHJlbjoiUiJ9KSxhY3Rpb246IlJlc3RhcnQifSksci5qc3goeHMse2tleXNMaXN0OnIuanN4cyhyLkZyYWdtZW50LHtjaGlsZHJlbjpbci5qc3goQSx7Y2hpbGRyZW46IjEifSksci5qc3goQSx7Y2hpbGRyZW46IjIifSksci5qc3goQSx7Y2hpbGRyZW46IjMifSldfSksYWN0aW9uOiJWYXVsdCBzaXplIn0pXX0pfSldfSldfSldfSl9Y29uc3QgTTE9e3NuYWtlOntuYW1lOiJTRVJQRU5USU5FIixzdWI6ImVhdCDCtyBncm93IMK3IHN1cnZpdmUifSxzaG9vdGVyOntuYW1lOiJWRUNUT1IgU1RSSUtFIixzdWI6IndhdmUgZGVmZW5zZSBibGFzdGVyIn0sYnJpY2s6e25hbWU6IkJSSUNLIFJJT1QiLHN1Yjoic21hc2ggwrcgY29tYm8gwrcgc3Vydml2ZSJ9LGJhc2ViYWxsOntuYW1lOiJTTFVHR0VSIE5JR0hUIixzdWI6InRpbWluZyBiYXR0aW5nIHZzLiBjcHUgYXJtcyJ9LHN0YWNrOntuYW1lOiJTS1lXQVJEIixzdWI6InN0YWNrIMK3IHNsaWNlIMK3IGFzY2VuZCJ9LGhvb3BzOntuYW1lOiJIT09QU1RPUk0iLHN1Yjoic3dpc2ggwrcgc3RyZWFrIMK3IGJlYXQgdGhlIGJ1enplciJ9LHJ1bm5lcjp7bmFtZToiTkVPTiBEUklGVCIsc3ViOiJqdW1wIMK3IHNsaWRlIMK3IG91dHJ1biJ9LGJsb2NrZmFsbDp7bmFtZToiQkxPQ0tGQUxMIixzdWI6InN0YWNrIMK3IGNsZWFyIMK3IHN1cnZpdmUifSxiZWF0OntuYW1lOiJCRUFUIERST1AiLHN1YjoicmlkZSB0aGUgcmh5dGhtIn0sb3JiaXRhbDp7bmFtZToiT1JCSVRBTCIsc3ViOiJzbGluZ3Nob3QgZ3Jhdml0eSBnb2xmIn0sdmF1bHQ6e25hbWU6Ik1FTU9SWSBWQVVMVCIsc3ViOiJtYXRjaCBiZWZvcmUgdGhleSBtb3ZlIn19O2Z1bmN0aW9uIE4wKHtjbGFzc05hbWU6ZT0iaC05IHctOSJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgicGF0aCIse2Q6Ik03IDIxYzAtNC4yIDMuNC02LjUgNy40LTYuNWg0LjhjMi45IDAgNC44LTEuOSA0LjgtNC40IixzdHJva2U6IiNhY2Y2NjQiLHN0cm9rZVdpZHRoOiI0IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KSxyLmpzeCgicGF0aCIse2Q6Ik03IDIxYzAgMyAyLjQgNSA1LjggNWg5LjQiLHN0cm9rZToiIzhlZjA1YSIsc3Ryb2tlV2lkdGg6IjQiLHN0cm9rZUxpbmVjYXA6InJvdW5kIixvcGFjaXR5OiIwLjUifSksci5qc3goImNpcmNsZSIse2N4OiIyMC41IixjeToiNy41IixyOiIzLjQiLGZpbGw6IiNmZmUwOGEifSksci5qc3goImNpcmNsZSIse2N4OiIyMS42IixjeToiNi42IixyOiIwLjkiLGZpbGw6IiMwYzFkMTMifSldfSl9ZnVuY3Rpb24gTTAoe2NsYXNzTmFtZTplPSJoLTkgdy05In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxNiIscjoiMTMiLHN0cm9rZToiIzYyZTZmZiIsc3Ryb2tlV2lkdGg6IjIiLG9wYWNpdHk6IjAuNyJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0xNiAzdjVNMTYgMjR2NU0zIDE2aDVNMjQgMTZoNSIsc3Ryb2tlOiIjNjJlNmZmIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSksci5qc3goInBhdGgiLHtkOiJNMTYgOWw2IDEzLjUtNi0zLjYtNiAzLjZ6IixmaWxsOiIjZmZkMTY2IixzdHJva2U6IiNmZmYzYzQiLHN0cm9rZVdpZHRoOiIxIixzdHJva2VMaW5lam9pbjoicm91bmQifSldfSl9ZnVuY3Rpb24gUjAoe2NsYXNzTmFtZTplPSJoLTkgdy05In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJyZWN0Iix7eDoiMyIseToiNSIsd2lkdGg6IjgiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiM4ZWYwNWEifSksci5qc3goInJlY3QiLHt4OiIxMi41Iix5OiI1Iix3aWR0aDoiOCIsaGVpZ2h0OiI1IixyeDoiMSIsZmlsbDoiI2ZmYzg1NyJ9KSxyLmpzeCgicmVjdCIse3g6IjIyIix5OiI1Iix3aWR0aDoiNyIsaGVpZ2h0OiI1IixyeDoiMSIsZmlsbDoiI2ZmNWQ4ZiJ9KSxyLmpzeCgicmVjdCIse3g6IjMiLHk6IjEyIix3aWR0aDoiMTIiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiNmZmM4NTciLG9wYWNpdHk6IjAuODUifSksci5qc3goInJlY3QiLHt4OiIxNi41Iix5OiIxMiIsd2lkdGg6IjEyLjUiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiM4ZWYwNWEiLG9wYWNpdHk6IjAuODUifSksci5qc3goImNpcmNsZSIse2N4OiIxNiIsY3k6IjIyIixyOiIzIixmaWxsOiIjZmZlMDhhIn0pLHIuanN4KCJyZWN0Iix7eDoiOCIseToiMjYuNSIsd2lkdGg6IjE2IixoZWlnaHQ6IjMuNSIscng6IjEuNzUiLGZpbGw6IiNmZmM4NTcifSldfSl9ZnVuY3Rpb24gQzAoe2NsYXNzTmFtZTplPSJoLTkgdy05In0pe2NvbnN0IGw9KGEsdSxkLG8scCk9PnIuanN4cygiZyIse2NoaWxkcmVuOltyLmpzeCgicGF0aCIse2Q6YE03ICR7YX0gTDEyICR7YS0zLjR9IEgzMCBMMjUgJHthfSBaYCxmaWxsOmR9KSxyLmpzeCgicGF0aCIse2Q6YE0yNSAke2F9IEwzMCAke2EtMy40fSBWJHthKzIuMX0gTDI1ICR7YSs1LjV9IFpgLGZpbGw6b30pLHIuanN4KCJyZWN0Iix7eDoiNyIseTphLHdpZHRoOiIxOCIsaGVpZ2h0OiI1LjUiLGZpbGw6dX0pXX0scCk7cmV0dXJuIHIuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDMyIDMyIixmaWxsOiJub25lIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbbCgyMywiIzNmYzlhNiIsIiM3ZWYwYzgiLCIjMmE5ZTgwIiwiYjEiKSxsKDE1LjUsIiMyZmI5OGYiLCIjNWZlMGI0IiwiIzFmOGE2YSIsImIyIiksbCg4LCIjZThiODRhIiwiI2ZmZDE2NiIsIiNiOThjMmUiLCJiMyIpXX0pfWZ1bmN0aW9uIFQwKHtjbGFzc05hbWU6ZT0iaC05IHctOSJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgiY2lyY2xlIix7Y3g6IjE2IixjeToiMTYiLHI6IjEyLjUiLGZpbGw6IiNmMmVkZTAifSksci5qc3goInBhdGgiLHtkOiJNOC41IDcuNWMzLjUgMi40IDUuNSA1LjIgNS41IDguNXMtMiA2LjEtNS41IDguNSIsc3Ryb2tlOiIjZDQzYjNiIixzdHJva2VXaWR0aDoiMS42IixzdHJva2VMaW5lY2FwOiJyb3VuZCIsZmlsbDoibm9uZSJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0yMy41IDcuNWMtMy41IDIuNC01LjUgNS4yLTUuNSA4LjVzMiA2LjEgNS41IDguNSIsc3Ryb2tlOiIjZDQzYjNiIixzdHJva2VXaWR0aDoiMS42IixzdHJva2VMaW5lY2FwOiJyb3VuZCIsZmlsbDoibm9uZSJ9KSxyLmpzeCgicGF0aCIse2Q6Ik05LjYgMTFsMiAuOU05LjYgMjFsMi0uOU0yMi40IDExbC0yIC45TTIyLjQgMjFsLTItLjkiLHN0cm9rZToiI2Q0M2IzYiIsc3Ryb2tlV2lkdGg6IjEuMSIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9ZnVuY3Rpb24gUDAoe2NsYXNzTmFtZTplPSJoLTkgdy05In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxMiIscjoiOC41IixmaWxsOiIjZjA3ZjI0In0pLHIuanN4KCJwYXRoIix7ZDoiTTcuNSAxMmgxN00xNiAzLjV2MTciLHN0cm9rZToiIzVjMmEwOCIsc3Ryb2tlV2lkdGg6IjEuNCJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0xMC41IDUuNWMyLjYgMi40IDIuNiAxMC42IDAgMTNNMjEuNSA1LjVjLTIuNiAyLjQtMi42IDEwLjYgMCAxMyIsc3Ryb2tlOiIjNWMyYTA4IixzdHJva2VXaWR0aDoiMS40IixmaWxsOiJub25lIn0pLHIuanN4KCJwYXRoIix7ZDoiTTggMjIuNWgxNiIsc3Ryb2tlOiIjZmY3YTFhIixzdHJva2VXaWR0aDoiMi42IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0xMCAyMi41bDIuNSA2TTIyIDIyLjVsLTIuNSA2TTEwIDIyLjVMMTYgMjZsNi0zLjVNMTIuNSAyOC41TDE2IDI2bDMuNSAyLjUiLHN0cm9rZToiI2U4ZTRmMiIsc3Ryb2tlV2lkdGg6IjEuMSIsZmlsbDoibm9uZSIsb3BhY2l0eToiMC44NSJ9KV19KX1mdW5jdGlvbiBFMCh7Y2xhc3NOYW1lOmU9ImgtOSB3LTkifSl7cmV0dXJuIHIuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDMyIDMyIixmaWxsOiJub25lIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbci5qc3goImNpcmNsZSIse2N4OiIxNyIsY3k6IjE4IixyOiIxMiIsZmlsbDoiI2ZmZDE2NiIsb3BhY2l0eToiMC45In0pLHIuanN4KCJwYXRoIix7ZDoiTTE3IDZhMTIgMTIgMCAwIDEgMCAyNCIsZmlsbDoiI2ZmNWRhMiJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0zIDEyaDlNMiAxN2g3TTMgMjJoOSIsc3Ryb2tlOiIjNGRkOGMwIixzdHJva2VXaWR0aDoiMi42IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0xNCAyN2gxNiIsc3Ryb2tlOiIjZmY1ZGEyIixzdHJva2VXaWR0aDoiMi42IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KV19KX1mdW5jdGlvbiBMMCh7Y2xhc3NOYW1lOmU9ImgtOSB3LTkifSl7cmV0dXJuIHIuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDMyIDMyIixmaWxsOiJub25lIixjbGFzc05hbWU6ZSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbci5qc3goInJlY3QiLHt4OiIxMiIseToiNCIsd2lkdGg6IjgiLGhlaWdodDoiOCIscng6IjEiLGZpbGw6IiNjMDg0ZmMifSksci5qc3goInJlY3QiLHt4OiI0Iix5OiIxMiIsd2lkdGg6IjgiLGhlaWdodDoiOCIscng6IjEiLGZpbGw6IiNjMDg0ZmMifSksci5qc3goInJlY3QiLHt4OiIxMiIseToiMTIiLHdpZHRoOiI4IixoZWlnaHQ6IjgiLHJ4OiIxIixmaWxsOiIjYzA4NGZjIn0pLHIuanN4KCJyZWN0Iix7eDoiMjAiLHk6IjEyIix3aWR0aDoiOCIsaGVpZ2h0OiI4IixyeDoiMSIsZmlsbDoiI2MwODRmYyJ9KSxyLmpzeCgicmVjdCIse3g6IjQiLHk6IjI0Iix3aWR0aDoiOCIsaGVpZ2h0OiI1IixyeDoiMSIsZmlsbDoiIzYyZTZmZiJ9KSxyLmpzeCgicmVjdCIse3g6IjEzIix5OiIyNCIsd2lkdGg6IjgiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiM4ZWYwNWEifSksci5qc3goInJlY3QiLHt4OiIyMiIseToiMjQiLHdpZHRoOiI2IixoZWlnaHQ6IjUiLHJ4OiIxIixmaWxsOiIjZmZkMTY2In0pXX0pfWZ1bmN0aW9uIEEwKHtjbGFzc05hbWU6ZT0iaC05IHctOSJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgicGF0aCIse2Q6Ik00IDIwdi02TTkgMjRWMTBNMTQgMjdWN00xOSAyNFYxME0yNCAyMHYtNiIsc3Ryb2tlOiIjYjI4YmZmIixzdHJva2VXaWR0aDoiMi42IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KSxyLmpzeCgiY2lyY2xlIix7Y3g6IjI2IixjeToiOSIscjoiNCIsZmlsbDoiI2ZmZDE2NiJ9KSxyLmpzeCgicGF0aCIse2Q6Ik0zMCAzdjYiLHN0cm9rZToiI2ZmZDE2NiIsc3Ryb2tlV2lkdGg6IjIiLHN0cm9rZUxpbmVjYXA6InJvdW5kIn0pXX0pfWZ1bmN0aW9uIEQwKHtjbGFzc05hbWU6ZT0iaC05IHctOSJ9KXtyZXR1cm4gci5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTplLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltyLmpzeCgiY2lyY2xlIix7Y3g6IjE2IixjeToiMTYiLHI6IjciLGZpbGw6IiM3ZmE4ZDkifSksci5qc3goImNpcmNsZSIse2N4OiIxMyIsY3k6IjEzIixyOiIyIixmaWxsOiIjYzNkY2Y1IixvcGFjaXR5OiIwLjgifSksci5qc3goImVsbGlwc2UiLHtjeDoiMTYiLGN5OiIxNiIscng6IjE0IixyeToiNS41IixzdHJva2U6IiM3ZWYwYzgiLHN0cm9rZVdpZHRoOiIxLjYiLHRyYW5zZm9ybToicm90YXRlKC0xOCAxNiAxNikifSksci5qc3goImNpcmNsZSIse2N4OiIyNyIsY3k6IjEwIixyOiIyLjQiLGZpbGw6IiNmZmUwOGEifSldfSl9ZnVuY3Rpb24gSTAoe2NsYXNzTmFtZTplPSJoLTkgdy05In0pe3JldHVybiByLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOmUsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3IuanN4KCJyZWN0Iix7eDoiNCIseToiNSIsd2lkdGg6IjI0IixoZWlnaHQ6IjIyIixyeDoiMyIsZmlsbDoiIzFkM2EyOSIsc3Ryb2tlOiIjZThjNTZhIixzdHJva2VXaWR0aDoiMS42In0pLHIuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxNiIscjoiNi41IixzdHJva2U6IiNlOGM1NmEiLHN0cm9rZVdpZHRoOiIxLjgifSksci5qc3goImNpcmNsZSIse2N4OiIxNiIsY3k6IjE2IixyOiIyIixmaWxsOiIjZThjNTZhIn0pLHIuanN4KCJwYXRoIix7ZDoiTTE2IDd2M00xNiAyMnYzTTcgMTZoM00yMiAxNmgzIixzdHJva2U6IiNlOGM1NmEiLHN0cm9rZVdpZHRoOiIxLjYiLHN0cm9rZUxpbmVjYXA6InJvdW5kIn0pXX0pfWZ1bmN0aW9uIFIxKCl7Y29uc3RbZSxsXT14LnVzZVN0YXRlKCJzbmFrZSIpLFthLHVdPXgudXNlU3RhdGUoITEpLFtkLG9dPXgudXNlU3RhdGUoInNuYWtlIikscD1NMVtlXSxoPXgudXNlUmVmKGUpO3JldHVybiBoLmN1cnJlbnQ9ZSx4LnVzZUVmZmVjdCgoKT0+e2NvbnN0IG09Zz0+e2cua2V5PT09Ij8iJiYobyhoLmN1cnJlbnQpLHUoITApKX07cmV0dXJuIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixtKSwoKT0+d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLG0pfSxbXSksci5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJlbGF0aXZlIGZsZXggbWluLWgtZHZoIGZsZXgtY29sIG92ZXJmbG93LWhpZGRlbiBiZy1waXQtOTUwIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOltyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTAgb3BhY2l0eS02MCIsc3R5bGU6e2JhY2tncm91bmRJbWFnZToibGluZWFyLWdyYWRpZW50KHJnYmEoMTQwLDIwMCwxNjAsMC4wNSkgMXB4LCB0cmFuc3BhcmVudCAxcHgpLCBsaW5lYXItZ3JhZGllbnQoOTBkZWcsIHJnYmEoMTQwLDIwMCwxNjAsMC4wNSkgMXB4LCB0cmFuc3BhcmVudCAxcHgpIixiYWNrZ3JvdW5kU2l6ZToiMzRweCAzNHB4IixtYXNrSW1hZ2U6InJhZGlhbC1ncmFkaWVudChlbGxpcHNlIDkwJSA3MCUgYXQgNTAlIDMwJSwgYmxhY2sgMzAlLCB0cmFuc3BhcmVudCA3NSUpIixXZWJraXRNYXNrSW1hZ2U6InJhZGlhbC1ncmFkaWVudChlbGxpcHNlIDkwJSA3MCUgYXQgNTAlIDMwJSwgYmxhY2sgMzAlLCB0cmFuc3BhcmVudCA3NSUpIn0sImFyaWEtaGlkZGVuIjoidHJ1ZSJ9KSxyLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTAiLHN0eWxlOntiYWNrZ3JvdW5kOiJyYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSA2MCUgNDIlIGF0IDUwJSAtOCUsIHJnYmEoMjU1LDIwMCw4NywwLjEyKSwgdHJhbnNwYXJlbnQgNzAlKSwgcmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgNDUlIDM1JSBhdCAxMiUgMTA4JSwgcmdiYSgxMTEsMjI0LDgxLDAuMDcpLCB0cmFuc3BhcmVudCA3MCUpLCByYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSA0NSUgMzUlIGF0IDg4JSAxMDglLCByZ2JhKDk4LDIzMCwyNTUsMC4wNyksIHRyYW5zcGFyZW50IDcwJSkifSwiYXJpYS1oaWRkZW4iOiJ0cnVlIn0pLHIuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46QXJyYXkuZnJvbSh7bGVuZ3RoOjEyfSwobSxnKT0+ci5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZpcmVmbHkiLHN0eWxlOntsZWZ0OmAke2cqODMlMTAwfSVgLHRvcDpgJHsoZyo0NysxMyklMTAwfSVgLHdpZHRoOmclMz09PTA/MzoyLGhlaWdodDpnJTM9PT0wPzM6MiwiLS10eCI6YCR7KGclNS0yKSo2MH1weGAsIi0tdHkiOmAkeyhnJTQtMikqODB9cHhgLCItLWQiOmAkezcrZyU1KjN9c2AsIi0tZGVsIjpgJHstKGcqMS43KX1zYCwiLS1wZWFrIjouNStnJTMqLjE4LCItLWMiOmclND09PTA/IiNmZmUwOGEiOmclMz09PTA/IiM2MmU2ZmYiOiIjYWNmNjY0In19LGcpKX0pLHIuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSB6LTEwIG14LWF1dG8gZmxleCB3LWZ1bGwgbWF4LXctNnhsIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00IHB4LTQgcGItMyBwdC01IHNtOnB4LTYiLGNoaWxkcmVuOltyLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltlPT09InNuYWtlIj9yLmpzeChOMCx7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6ZT09PSJzaG9vdGVyIj9yLmpzeChNMCx7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6ZT09PSJicmljayI/ci5qc3goUjAse2NsYXNzTmFtZToiaC0xMCB3LTEwIn0pOmU9PT0iYmFzZWJhbGwiP3IuanN4KFQwLHtjbGFzc05hbWU6ImgtMTAgdy0xMCJ9KTplPT09InN0YWNrIj9yLmpzeChDMCx7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6ZT09PSJob29wcyI/ci5qc3goUDAse2NsYXNzTmFtZToiaC0xMCB3LTEwIn0pOmU9PT0icnVubmVyIj9yLmpzeChFMCx7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6ZT09PSJibG9ja2ZhbGwiP3IuanN4KEwwLHtjbGFzc05hbWU6ImgtMTAgdy0xMCJ9KTplPT09ImJlYXQiP3IuanN4KEEwLHtjbGFzc05hbWU6ImgtMTAgdy0xMCJ9KTplPT09Im9yYml0YWwiP3IuanN4KEQwLHtjbGFzc05hbWU6ImgtMTAgdy0xMCJ9KTpyLmpzeChJMCx7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSksci5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbci5qc3goImgxIix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1sZyBsZWFkaW5nLW5vbmUgc206dGV4dC14bCAke2U9PT0ic2hvb3RlciI/InJldHJvLXRpdGxlLWN5YW4iOmU9PT0iYnJpY2siPyJyZXRyby10aXRsZS1waW5rIjplPT09ImJhc2ViYWxsIj8icmV0cm8tdGl0bGUtY2hhbGsiOmU9PT0ic3RhY2siPyJyZXRyby10aXRsZS1taW50IjplPT09Imhvb3BzIj8icmV0cm8tdGl0bGUtb3JhbmdlIjplPT09InJ1bm5lciI/InJldHJvLXRpdGxlLW5lb24iOmU9PT0iYmxvY2tmYWxsIj8icmV0cm8tdGl0bGUtdGVhbCI6ZT09PSJiZWF0Ij8icmV0cm8tdGl0bGUtdmlvbGV0IjplPT09Im9yYml0YWwiPyJyZXRyby10aXRsZS1pY2UiOiJyZXRyby10aXRsZS1nb2xkIn1gLGNoaWxkcmVuOnAubmFtZX0pLHIuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgbXQtMS41IHRleHQtWzhweF0gdHJhY2tpbmctWzAuMjVlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46cC5zdWIudG9VcHBlckNhc2UoKX0pXX0pXX0pLHIuanN4KCJuYXYiLHsiYXJpYS1sYWJlbCI6IkdhbWUgc2VsZWN0IixjbGFzc05hbWU6ImZsZXggbWF4LXctZnVsbCBmbGV4LXdyYXAganVzdGlmeS1jZW50ZXIgZ2FwLTEgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXBpdC01MDAgYmctcGl0LTkwMC84MCBwLTEgc2hhZG93LVtpbnNldF8wXzJweF84cHhfcmdiYSgwLDAsMCwwLjU1KV0iLGNoaWxkcmVuOlt7aWQ6InNuYWtlIixsYWJlbDoiU05BS0UiLE1hcms6TjB9LHtpZDoic2hvb3RlciIsbGFiZWw6IkJMQVNURVIiLE1hcms6TTB9LHtpZDoiYnJpY2siLGxhYmVsOiJCUkVBS09VVCIsTWFyazpSMH0se2lkOiJiYXNlYmFsbCIsbGFiZWw6IkJBU0VCQUxMIixNYXJrOlQwfSx7aWQ6InN0YWNrIixsYWJlbDoiU1RBQ0siLE1hcms6QzB9LHtpZDoiaG9vcHMiLGxhYmVsOiJIT09QUyIsTWFyazpQMH0se2lkOiJydW5uZXIiLGxhYmVsOiJSVU5ORVIiLE1hcms6RTB9LHtpZDoiYmxvY2tmYWxsIixsYWJlbDoiQkxPQ0tTIixNYXJrOkwwfSx7aWQ6ImJlYXQiLGxhYmVsOiJSSFlUSE0iLE1hcms6QTB9LHtpZDoib3JiaXRhbCIsbGFiZWw6Ik9SQklUIixNYXJrOkQwfSx7aWQ6InZhdWx0IixsYWJlbDoiVkFVTFQiLE1hcms6STB9XS5tYXAoKHtpZDptLGxhYmVsOmcsTWFyazp2fSk9PnIuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixvbkNsaWNrOigpPT5sKG0pLCJhcmlhLXByZXNzZWQiOmU9PT1tLGNsYXNzTmFtZTpgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSByb3VuZGVkLW1kIHB4LTIgcHktMS41IGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVyIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTE1MCBzbTpnYXAtMiBzbTpweC0zIHNtOnRleHQtWzEwcHhdICR7ZT09PW0/ImJnLXBpdC03MDAgdGV4dC1hbWJlcmdsb3ctNDAwIHNoYWRvdy1bMF8wXzE4cHhfcmdiYSgyNTUsMjAwLDg3LDAuMTgpXSI6InRleHQtbW9zcy0zMDAgaG92ZXI6YmctcGl0LTgwMCBob3Zlcjp0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOltyLmpzeCh2LHtjbGFzc05hbWU6ImgtNCB3LTQifSksZ119LG0pKX0pLHIuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3IuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixvbkNsaWNrOigpPT57byhlKSx1KCEwKX0sImFyaWEtbGFiZWwiOiJPcGVuIHRoZSBob3ctdG8tcGxheSBndWlkZSIsY2xhc3NOYW1lOiJidG4tYXJjYWRlIGJ0bi1naG9zdCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMiB0ZXh0LVsxMXB4XSIsY2hpbGRyZW46W3IuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJub25lIixjbGFzc05hbWU6ImgtNCB3LTQgdGV4dC1hbWJlcmdsb3ctNDAwIiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbci5qc3goInBhdGgiLHtkOiJNNCA1LjVBMi41IDIuNSAwIDAgMSA2LjUgM0gyMHYxNUg2LjVBMi41IDIuNSAwIDAgMCA0IDIwLjV6IixzdHJva2U6ImN1cnJlbnRDb2xvciIsc3Ryb2tlV2lkdGg6IjEuOCIsc3Ryb2tlTGluZWpvaW46InJvdW5kIn0pLHIuanN4KCJwYXRoIix7ZDoiTTQgMjAuNVY1LjVNOCA3LjVoOE04IDExaDUiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMS44IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KV19KSwiR1VJREUiXX0pLHIuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixvbkNsaWNrOigpPT57d2luZG93LnBhcmVudCYmd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7dHlwZToiQ0xPU0VfQVJDQURFIn0sIioiKX0sImFyaWEtbGFiZWwiOiLEkMOzbmcgQXJjYWRlIix0aXRsZToixJDDs25nIEFyY2FkZSAoRXNjKSIsY2xhc3NOYW1lOiJidG4tYXJjYWRlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgYm9yZGVyLXJlZC01MDAvNzAgYmctcmVkLTk1MC84MCBweC0zLjUgcHktMiB0ZXh0LVsxMXB4XSBmb250LWJvbGQgdGV4dC1yZWQtMjAwIHNoYWRvdy1bMF8wXzE4cHhfcmdiYSgyMzksNjgsNjgsMC4zNSldIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTE1MCBob3ZlcjpzY2FsZS0xMDUgaG92ZXI6Ym9yZGVyLXJlZC00MDAgaG92ZXI6YmctcmVkLTkwMCBob3Zlcjp0ZXh0LXdoaXRlIixjaGlsZHJlbjpbci5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOiJoLTQgdy00IHRleHQtcmVkLTQwMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46ci5qc3goInBhdGgiLHtkOiJNMTggNkw2IDE4TTYgNmwxMiAxMiIsc3Ryb2tlOiJjdXJyZW50Q29sb3IiLHN0cm9rZVdpZHRoOiIyLjUiLHN0cm9rZUxpbmVjYXA6InJvdW5kIixzdHJva2VMaW5lam9pbjoicm91bmQifSl9KSwi4pyVIMSQw5NORyJdfSldfSldfSksci5qc3goIm1haW4iLHtjbGFzc05hbWU6InJlbGF0aXZlIHotMTAgbXgtYXV0byB3LWZ1bGwgbWF4LXctNnhsIGZsZXgtMSBweC00IHBiLTEwIHNtOnB4LTYiLGNoaWxkcmVuOmU9PT0ic25ha2UiP3IuanN4KEZtLHt9KTplPT09InNob290ZXIiP3IuanN4KGNnLHt9KTplPT09ImJyaWNrIj9yLmpzeChMZyx7fSk6ZT09PSJiYXNlYmFsbCI/ci5qc3goaXgse30pOmU9PT0ic3RhY2siP3IuanN4KGd4LHt9KTplPT09Imhvb3BzIj9yLmpzeChUeCx7fSk6ZT09PSJydW5uZXIiP3IuanN4KHp4LHt9KTplPT09ImJsb2NrZmFsbCI/ci5qc3gobjEse30pOmU9PT0iYmVhdCI/ci5qc3goZDEse30pOmU9PT0ib3JiaXRhbCI/ci5qc3godzEse30pOnIuanN4KE4xLHt9KX0pLHIuanN4KE1tLHtvcGVuOmEsYWN0aXZlSWQ6ZCxvblNlbGVjdDptPT57byhtKSxsKG0pfSxvbkNsb3NlOigpPT51KCExKX0pLHIuanN4KCJmb290ZXIiLHtjbGFzc05hbWU6InJlbGF0aXZlIHotMTAgYm9yZGVyLXQgYm9yZGVyLXBpdC03MDAvNjAgcHktMyB0ZXh0LWNlbnRlciIsY2hpbGRyZW46ci5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLVswLjJlbV0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IkVMRVZFTiBDQVJUUklER0VTIExPQURFRCDigJQgU0VSUEVOVElORSDDlyBWRUNUT1IgU1RSSUtFIMOXIEJSSUNLIFJJT1Qgw5cgU0xVR0dFUiBOSUdIVCDDlyBTS1lXQVJEIMOXIEhPT1BTVE9STSDDlyBORU9OIERSSUZUIMOXIEJMT0NLRkFMTCDDlyBCRUFUIERST1Agw5cgT1JCSVRBTCDDlyBNRU1PUlkgVkFVTFQgwrcgU0NPUkVTIFNBVkVEIE9OIFRISVMgREVWSUNFIn0pfSldfSl9Tm0uY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicm9vdCIpKS5yZW5kZXIoci5qc3goUjEse30pKTsKCiAgICA8L3NjcmlwdD4KICA8L2JvZHk+CjwvaHRtbD4=";

  function openArcade() {
    overlay.classList.remove('hidden');
    document.body.classList.add('arcade-active');
    if (iframe && !iframe.srcdoc) {
      try {
        const bin = atob(ARCADE_B64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        iframe.srcdoc = new TextDecoder('utf-8').decode(bytes);
      } catch (e) {
        iframe.src = 'arcade.html';
      }
    }
  }

  function closeArcade() {
    overlay.classList.add('hidden');
    document.body.classList.remove('arcade-active');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'PAUSE_ARCADE' }, '*');
      } catch (e) {}
    }
  }

  if (openBtn) openBtn.addEventListener('click', openArcade);

  window.addEventListener('message', (e) => {
    if (e.data && (e.data.type === 'CLOSE_ARCADE' || e.data === 'CLOSE_ARCADE')) {
      closeArcade();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeArcade();
    }
  });
})();


/* ════════════════════════════════════════════════════════════
   ██  BACK-TO-TOP BUTTON CONTROLLER — CUỘN LÊN ĐẦU TRANG
   ════════════════════════════════════════════════════════════ */
(function initBackToTop() {
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  if (!scrollTopBtn) return;

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  let scrollTicking = false;
  function onScroll() {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > 160) {
      scrollTopBtn.classList.remove('hidden');
    } else {
      scrollTopBtn.classList.add('hidden');
    }
    scrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(onScroll);
      scrollTicking = true;
    }
  }, { passive: true });

  onScroll();
})();
