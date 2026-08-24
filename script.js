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
var bootDone = false;
var timers = [];

function schedule(fn, delay) { timers.push(setTimeout(fn, delay)); }
function clearTimers() { timers.forEach(function (id) { clearTimeout(id); }); timers = []; }

function showStage(name) {
  var stages = ['boot', 'hello', 'ready'];
  stages.forEach(function (s) {
    var el = document.getElementById('stage-' + s);
    if (el) el.style.display = (s === name) ? 'flex' : 'none';
  });
}

function setBootEnergy(progress) {
  particleState.energy = 0.25 + progress * 0.85;
}

function handleBootComplete() {
  chimePlay();
  hapticTap('heavy');
  showFlash();
  schedule(function () { hideFlash(); }, 700);
  schedule(function () { stage = 'hello'; showStage('hello'); }, 340);
  schedule(hapticSettle, CHIME_MS);

  /* Transition directly into main CMD Terminal screen right after "hello" stage */
  schedule(function () {
    var appEl = document.getElementById('app');
    if (appEl) {
      appEl.style.transition = 'opacity 0.8s ease';
      appEl.style.opacity = '0';
      setTimeout(function () {
        appEl.style.display = 'none';
        var terminal = document.getElementById('terminal-screen');
        if (terminal) {
          terminal.style.visibility = 'visible';
          terminal.style.opacity = '0';
          terminal.style.transition = 'opacity 0.6s ease';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              terminal.style.opacity = '1';
              if (typeof window.initCmd === 'function') {
                window.initCmd();
              }
            });
          });
        }
      }, 800);
    }
  }, 3200);
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

function showSlider() {
  var el = document.getElementById('speed-slider');
  if (el) el.style.display = 'flex';
}

function hideSlider() {
  var el = document.getElementById('speed-slider');
  if (el) el.style.display = 'none';
}

function startBootProgress() {
  bootDone = false;
  var progress = 0;
  var start = performance.now();
  var duration = 4800;
  var fillEl = document.getElementById('progress-fill');
  var lineEl = document.getElementById('boot-line');
  var pctEl = document.getElementById('boot-percent');
  var lastLineIndex = -1;

  function tick(now) {
    var t = Math.min((now - start) / duration, 1);
    var eased;
    if (t < 0.35) eased = t * 1.8;
    else if (t < 0.55) eased = 0.63 + (t - 0.35) * 0.35;
    else if (t < 0.8) eased = 0.7 + (t - 0.55) * 0.6;
    else eased = 0.85 + (t - 0.8) * 0.75;
    progress = Math.min(eased, 1);

    if (fillEl) fillEl.style.width = (progress * 100) + '%';
    if (pctEl) pctEl.textContent = Math.round(progress * 100) + '%';
    setBootEnergy(progress);

    var lineIndex = Math.min(BOOT_LINES.length - 1, Math.floor(progress * BOOT_LINES.length));
    if (lineIndex !== lastLineIndex) {
      lastLineIndex = lineIndex;
      if (lineEl) {
        lineEl.textContent = BOOT_LINES[lineIndex];
        lineEl.classList.remove('line-swap');
        void lineEl.offsetWidth;
        lineEl.classList.add('line-swap');
      }
    }

    if (t < 1) {
      bootRaf = requestAnimationFrame(tick);
    } else if (!bootDone) {
      bootDone = true;
      handleBootComplete();
    }
  }
  bootRaf = requestAnimationFrame(tick);
}

function replay() {
  hapticTap('medium');
  clearTimers();
  hideFlash();
  hideSlider();
  cancelAnimationFrame(bootRaf);

  var appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.display = 'block';
    appEl.style.opacity = '1';
  }

  stage = 'boot';
  runKey++;
  showStage('boot');
  renderName();
  var bootEl = document.getElementById('stage-boot');
  if (bootEl) {
    bootEl.style.animation = 'none';
    void bootEl.offsetWidth;
    bootEl.style.animation = '';
  }
  startBootProgress();
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
  function init() {
    applyAuroraVars();
    unlockAudio();
    initParallax();
    renderName();
    initParticles();
    initVisualizer();
    initRipples();
    initClock();
    initSlider();

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

    startBootProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
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
  const closeBtn = document.getElementById('snake-close-btn');

  if (!overlay) return;

  const ARCADE_B64 = "PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KICA8aGVhZD4KICAgIDxtZXRhIGNoYXJzZXQ9IlVURi04IiAvPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAsIHZpZXdwb3J0LWZpdD1jb3ZlciIgLz4KICAgIDxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMDYwZjBhIiAvPgogICAgPHRpdGxlPlRoZSBNaWRuaWdodCBBcmNhZGUg4oCUIDExIENhcnRyaWRnZXM8L3RpdGxlPgogICAgPGxpbmsgcmVsPSJwcmVjb25uZWN0IiBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tIiAvPgogICAgPGxpbmsgcmVsPSJwcmVjb25uZWN0IiBocmVmPSJodHRwczovL2ZvbnRzLmdzdGF0aWMuY29tIiBjcm9zc29yaWdpbiAvPgogICAgPGxpbmsgaHJlZj0iaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1DaGFrcmErUGV0Y2g6d2dodEA0MDA7NTAwOzYwMDs3MDAmZmFtaWx5PVByZXNzK1N0YXJ0KzJQJmRpc3BsYXk9c3dhcCIgcmVsPSJzdHlsZXNoZWV0IiAvPgogICAgPHN0eWxlPgovKiEgdGFpbHdpbmRjc3MgdjQuMy4zIHwgTUlUIExpY2Vuc2UgfCBodHRwczovL3RhaWx3aW5kY3NzLmNvbSAqL0BsYXllciBwcm9wZXJ0aWVze0BzdXBwb3J0cyAoKCgtd2Via2l0LWh5cGhlbnM6bm9uZSkpIGFuZCAobm90IChtYXJnaW4tdHJpbTppbmxpbmUpKSkgb3IgKCgtbW96LW9yaWVudDppbmxpbmUpIGFuZCAobm90IChjb2xvcjpyZ2IoZnJvbSByZWQgciBnIGIpKSkpeyosOmJlZm9yZSw6YWZ0ZXIsOjpiYWNrZHJvcHstLXR3LXJvdGF0ZS14OmluaXRpYWw7LS10dy1yb3RhdGUteTppbml0aWFsOy0tdHctcm90YXRlLXo6aW5pdGlhbDstLXR3LXNrZXcteDppbml0aWFsOy0tdHctc2tldy15OmluaXRpYWw7LS10dy1ib3JkZXItc3R5bGU6c29saWQ7LS10dy1sZWFkaW5nOmluaXRpYWw7LS10dy1mb250LXdlaWdodDppbml0aWFsOy0tdHctdHJhY2tpbmc6aW5pdGlhbDstLXR3LW9yZGluYWw6aW5pdGlhbDstLXR3LXNsYXNoZWQtemVybzppbml0aWFsOy0tdHctbnVtZXJpYy1maWd1cmU6aW5pdGlhbDstLXR3LW51bWVyaWMtc3BhY2luZzppbml0aWFsOy0tdHctbnVtZXJpYy1mcmFjdGlvbjppbml0aWFsOy0tdHctc2hhZG93OjAgMCAjMDAwMDstLXR3LXNoYWRvdy1jb2xvcjppbml0aWFsOy0tdHctc2hhZG93LWFscGhhOjEwMCU7LS10dy1pbnNldC1zaGFkb3c6MCAwICMwMDAwOy0tdHctaW5zZXQtc2hhZG93LWNvbG9yOmluaXRpYWw7LS10dy1pbnNldC1zaGFkb3ctYWxwaGE6MTAwJTstLXR3LXJpbmctY29sb3I6aW5pdGlhbDstLXR3LXJpbmctc2hhZG93OjAgMCAjMDAwMDstLXR3LWluc2V0LXJpbmctY29sb3I6aW5pdGlhbDstLXR3LWluc2V0LXJpbmctc2hhZG93OjAgMCAjMDAwMDstLXR3LXJpbmctaW5zZXQ6aW5pdGlhbDstLXR3LXJpbmctb2Zmc2V0LXdpZHRoOjBweDstLXR3LXJpbmctb2Zmc2V0LWNvbG9yOiNmZmY7LS10dy1yaW5nLW9mZnNldC1zaGFkb3c6MCAwICMwMDAwOy0tdHctb3V0bGluZS1zdHlsZTpzb2xpZDstLXR3LWJsdXI6aW5pdGlhbDstLXR3LWJyaWdodG5lc3M6aW5pdGlhbDstLXR3LWNvbnRyYXN0OmluaXRpYWw7LS10dy1ncmF5c2NhbGU6aW5pdGlhbDstLXR3LWh1ZS1yb3RhdGU6aW5pdGlhbDstLXR3LWludmVydDppbml0aWFsOy0tdHctb3BhY2l0eTppbml0aWFsOy0tdHctc2F0dXJhdGU6aW5pdGlhbDstLXR3LXNlcGlhOmluaXRpYWw7LS10dy1kcm9wLXNoYWRvdzppbml0aWFsOy0tdHctZHJvcC1zaGFkb3ctY29sb3I6aW5pdGlhbDstLXR3LWRyb3Atc2hhZG93LWFscGhhOjEwMCU7LS10dy1kcm9wLXNoYWRvdy1zaXplOmluaXRpYWw7LS10dy1iYWNrZHJvcC1ibHVyOmluaXRpYWw7LS10dy1iYWNrZHJvcC1icmlnaHRuZXNzOmluaXRpYWw7LS10dy1iYWNrZHJvcC1jb250cmFzdDppbml0aWFsOy0tdHctYmFja2Ryb3AtZ3JheXNjYWxlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1odWUtcm90YXRlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1pbnZlcnQ6aW5pdGlhbDstLXR3LWJhY2tkcm9wLW9wYWNpdHk6aW5pdGlhbDstLXR3LWJhY2tkcm9wLXNhdHVyYXRlOmluaXRpYWw7LS10dy1iYWNrZHJvcC1zZXBpYTppbml0aWFsOy0tdHctZHVyYXRpb246aW5pdGlhbDstLXR3LXRyYW5zbGF0ZS14OjA7LS10dy10cmFuc2xhdGUteTowOy0tdHctdHJhbnNsYXRlLXo6MH19fUBsYXllciB0aGVtZXs6cm9vdCw6aG9zdHstLWZvbnQtc2FuczotYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICJTZWdvZSBVSSIsIFJvYm90bywgIkhlbHZldGljYSBOZXVlIiwgIk5vdG8gU2FucyIsIEFyaWFsLCBzYW5zLXNlcmlmLCAiQXBwbGUgQ29sb3IgRW1vamkiLCAiU2Vnb2UgVUkgRW1vamkiLCAiU2Vnb2UgVUkgU3ltYm9sIiwgIk5vdG8gQ29sb3IgRW1vamkiOy0tZm9udC1tb25vOnVpLW1vbm9zcGFjZSwgU0ZNb25vLVJlZ3VsYXIsIE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCAiTGliZXJhdGlvbiBNb25vIiwgIkNvdXJpZXIgTmV3IiwgbW9ub3NwYWNlOy0tY29sb3ItYmxhY2s6IzAwMDstLXNwYWNpbmc6LjI1cmVtOy0tY29udGFpbmVyLXNtOjI0cmVtOy0tY29udGFpbmVyLTZ4bDo3MnJlbTstLXRleHQtc206Ljg3NXJlbTstLXRleHQtc20tLWxpbmUtaGVpZ2h0OmNhbGMoMS4yNSAvIC44NzUpOy0tdGV4dC1iYXNlOjFyZW07LS10ZXh0LWJhc2UtLWxpbmUtaGVpZ2h0OiAxLjUgOy0tdGV4dC1sZzoxLjEyNXJlbTstLXRleHQtbGctLWxpbmUtaGVpZ2h0OmNhbGMoMS43NSAvIDEuMTI1KTstLXRleHQteGw6MS4yNXJlbTstLXRleHQteGwtLWxpbmUtaGVpZ2h0OmNhbGMoMS43NSAvIDEuMjUpOy0tdGV4dC0yeGw6MS41cmVtOy0tdGV4dC0yeGwtLWxpbmUtaGVpZ2h0OmNhbGMoMiAvIDEuNSk7LS10ZXh0LTN4bDoxLjg3NXJlbTstLXRleHQtM3hsLS1saW5lLWhlaWdodDogMS4yIDstLXRleHQtNHhsOjIuMjVyZW07LS10ZXh0LTR4bC0tbGluZS1oZWlnaHQ6Y2FsYygyLjUgLyAyLjI1KTstLWZvbnQtd2VpZ2h0LW1lZGl1bTo1MDA7LS1mb250LXdlaWdodC1ib2xkOjcwMDstLXRyYWNraW5nLW5vcm1hbDowZW07LS10cmFja2luZy13aWRlOi4wMjVlbTstLXRyYWNraW5nLXdpZGVyOi4wNWVtOy0tdHJhY2tpbmctd2lkZXN0Oi4xZW07LS1sZWFkaW5nLXRpZ2h0OjEuMjU7LS1sZWFkaW5nLXJlbGF4ZWQ6MS42MjU7LS1yYWRpdXMtc206LjI1cmVtOy0tcmFkaXVzLW1kOi4zNzVyZW07LS1yYWRpdXMtbGc6LjVyZW07LS1kZWZhdWx0LXRyYW5zaXRpb24tZHVyYXRpb246LjE1czstLWRlZmF1bHQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246Y3ViaWMtYmV6aWVyKC40LCAwLCAuMiwgMSk7LS1kZWZhdWx0LWZvbnQtZmFtaWx5OnZhcigtLWZvbnQtc2Fucyk7LS1kZWZhdWx0LW1vbm8tZm9udC1mYW1pbHk6dmFyKC0tZm9udC1tb25vKTstLWZvbnQtZGlzcGxheToiUHJlc3MgU3RhcnQgMlAiLCAiQ291cmllciBOZXciLCBtb25vc3BhY2U7LS1mb250LWJvZHk6IkNoYWtyYSBQZXRjaCIsIHVpLXNhbnMtc2VyaWYsIHN5c3RlbS11aSwgc2Fucy1zZXJpZjstLWNvbG9yLXBpdC05NTA6IzA2MGYwYTstLWNvbG9yLXBpdC05MDA6IzBhMTgxMDstLWNvbG9yLXBpdC04NTA6IzBjMWQxMzstLWNvbG9yLXBpdC04MDA6IzBmMjQxNzstLWNvbG9yLXBpdC03MDA6IzE2MzAxZjstLWNvbG9yLXBpdC02MDA6IzFkM2EyOTstLWNvbG9yLXBpdC01MDA6IzJjNGEzNzstLWNvbG9yLW1vc3MtNDAwOiM1ZDdmNmI7LS1jb2xvci1tb3NzLTMwMDojOGZiMzliOy0tY29sb3ItbW9zcy0yMDA6I2JmZThjODstLWNvbG9yLW1vc3MtMTAwOiNlOGY2ZWE7LS1jb2xvci12ZW5vbS00MDA6IzhlZjA1YTstLWNvbG9yLWFtYmVyZ2xvdy01MDA6I2U4YTkzYzstLWNvbG9yLWFtYmVyZ2xvdy00MDA6I2ZmYzg1NzstLWNvbG9yLWFtYmVyZ2xvdy0zMDA6I2ZmZTA4YTstLWNvbG9yLWFwcGxlLTUwMDojZTA0MzQ4Oy0tY29sb3ItYXBwbGUtNDAwOiNmZjZiNmJ9fUBsYXllciBiYXNleyosOmFmdGVyLDpiZWZvcmUsOjpiYWNrZHJvcHtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjAgc29saWQ7bWFyZ2luOjA7cGFkZGluZzowfTo6ZmlsZS1zZWxlY3Rvci1idXR0b257Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjowIHNvbGlkO21hcmdpbjowO3BhZGRpbmc6MH1odG1sLDpob3N0ey13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOy1tb3otdGFiLXNpemU6NDt0YWItc2l6ZTo0O2xpbmUtaGVpZ2h0OjEuNTtmb250LWZhbWlseTp2YXIoLS1kZWZhdWx0LWZvbnQtZmFtaWx5LC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgIlNlZ29lIFVJIiwgUm9ib3RvLCAiSGVsdmV0aWNhIE5ldWUiLCAiTm90byBTYW5zIiwgQXJpYWwsIHNhbnMtc2VyaWYsICJBcHBsZSBDb2xvciBFbW9qaSIsICJTZWdvZSBVSSBFbW9qaSIsICJTZWdvZSBVSSBTeW1ib2wiLCAiTm90byBDb2xvciBFbW9qaSIpO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczp2YXIoLS1kZWZhdWx0LWZvbnQtZmVhdHVyZS1zZXR0aW5ncyxub3JtYWwpO2ZvbnQtdmFyaWF0aW9uLXNldHRpbmdzOnZhcigtLWRlZmF1bHQtZm9udC12YXJpYXRpb24tc2V0dGluZ3Msbm9ybWFsKTstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnR9aHJ7aGVpZ2h0OjA7Y29sb3I6aW5oZXJpdDtib3JkZXItdG9wLXdpZHRoOjFweH1hYmJyOndoZXJlKFt0aXRsZV0pey13ZWJraXQtdGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZSBkb3R0ZWQ7dGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZSBkb3R0ZWR9aDEsaDIsaDMsaDQsaDUsaDZ7Zm9udC1zaXplOmluaGVyaXQ7Zm9udC13ZWlnaHQ6aW5oZXJpdH1he2NvbG9yOmluaGVyaXQ7LXdlYmtpdC10ZXh0LWRlY29yYXRpb246aW5oZXJpdDt0ZXh0LWRlY29yYXRpb246aW5oZXJpdH1iLHN0cm9uZ3tmb250LXdlaWdodDpib2xkZXJ9Y29kZSxrYmQsc2FtcCxwcmV7Zm9udC1mYW1pbHk6dmFyKC0tZGVmYXVsdC1tb25vLWZvbnQtZmFtaWx5LHVpLW1vbm9zcGFjZSwgU0ZNb25vLVJlZ3VsYXIsIE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCAiTGliZXJhdGlvbiBNb25vIiwgIkNvdXJpZXIgTmV3IiwgbW9ub3NwYWNlKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6dmFyKC0tZGVmYXVsdC1tb25vLWZvbnQtZmVhdHVyZS1zZXR0aW5ncyxub3JtYWwpO2ZvbnQtdmFyaWF0aW9uLXNldHRpbmdzOnZhcigtLWRlZmF1bHQtbW9uby1mb250LXZhcmlhdGlvbi1zZXR0aW5ncyxub3JtYWwpO2ZvbnQtc2l6ZToxZW19c21hbGx7Zm9udC1zaXplOjgwJX1zdWIsc3Vwe3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lO2ZvbnQtc2l6ZTo3NSU7bGluZS1oZWlnaHQ6MDtwb3NpdGlvbjpyZWxhdGl2ZX1zdWJ7Ym90dG9tOi0uMjVlbX1zdXB7dG9wOi0uNWVtfXRhYmxle3RleHQtaW5kZW50OjA7Ym9yZGVyLWNvbG9yOmluaGVyaXQ7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlfTotbW96LWZvY3VzcmluZzp3aGVyZSg6bm90KGlmcmFtZSkpe291dGxpbmU6YXV0b31wcm9ncmVzc3t2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZX1zdW1tYXJ5e2Rpc3BsYXk6bGlzdC1pdGVtfW9sLHVsLG1lbnV7bGlzdC1zdHlsZTpub25lfWltZyxzdmcsdmlkZW8sY2FudmFzLGF1ZGlvLGlmcmFtZSxlbWJlZCxvYmplY3R7dmVydGljYWwtYWxpZ246bWlkZGxlO2Rpc3BsYXk6YmxvY2t9aW1nLHZpZGVve21heC13aWR0aDoxMDAlO2hlaWdodDphdXRvfWJ1dHRvbixpbnB1dCxzZWxlY3Qsb3B0Z3JvdXAsdGV4dGFyZWF7Zm9udDppbmhlcml0O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczppbmhlcml0O2ZvbnQtdmFyaWF0aW9uLXNldHRpbmdzOmluaGVyaXQ7bGV0dGVyLXNwYWNpbmc6aW5oZXJpdDtjb2xvcjppbmhlcml0O29wYWNpdHk6MTtiYWNrZ3JvdW5kLWNvbG9yOiMwMDAwO2JvcmRlci1yYWRpdXM6MH06OmZpbGUtc2VsZWN0b3ItYnV0dG9ue2ZvbnQ6aW5oZXJpdDtmb250LWZlYXR1cmUtc2V0dGluZ3M6aW5oZXJpdDtmb250LXZhcmlhdGlvbi1zZXR0aW5nczppbmhlcml0O2xldHRlci1zcGFjaW5nOmluaGVyaXQ7Y29sb3I6aW5oZXJpdDtvcGFjaXR5OjE7YmFja2dyb3VuZC1jb2xvcjojMDAwMDtib3JkZXItcmFkaXVzOjB9OndoZXJlKHNlbGVjdDppcyhbbXVsdGlwbGVdLFtzaXplXSkpIG9wdGdyb3Vwe2ZvbnQtd2VpZ2h0OmJvbGRlcn06d2hlcmUoc2VsZWN0OmlzKFttdWx0aXBsZV0sW3NpemVdKSkgb3B0Z3JvdXAgb3B0aW9ue3BhZGRpbmctaW5saW5lLXN0YXJ0OjIwcHh9OjpmaWxlLXNlbGVjdG9yLWJ1dHRvbnttYXJnaW4taW5saW5lLWVuZDo0cHh9OjpwbGFjZWhvbGRlcntvcGFjaXR5OjF9QHN1cHBvcnRzIChub3QgKCgtd2Via2l0LWFwcGVhcmFuY2U6LWFwcGxlLXBheS1idXR0b24pKSkgb3IgKGNvbnRhaW4taW50cmluc2ljLXNpemU6MXB4KXs6OnBsYWNlaG9sZGVye2NvbG9yOmN1cnJlbnRDb2xvcn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpezo6cGxhY2Vob2xkZXJ7Y29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLGN1cnJlbnRjb2xvciA1MCUsdHJhbnNwYXJlbnQpfX19dGV4dGFyZWF7cmVzaXplOnZlcnRpY2FsfTo6LXdlYmtpdC1zZWFyY2gtZGVjb3JhdGlvbnstd2Via2l0LWFwcGVhcmFuY2U6bm9uZX06Oi13ZWJraXQtZGF0ZS1hbmQtdGltZS12YWx1ZXttaW4taGVpZ2h0OjFsaDt0ZXh0LWFsaWduOmluaGVyaXR9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXR7ZGlzcGxheTppbmxpbmUtZmxleH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1maWVsZHMtd3JhcHBlcntwYWRkaW5nOjB9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LXllYXItZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LW1vbnRoLWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1kYXktZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LWhvdXItZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1kYXRldGltZS1lZGl0LW1pbnV0ZS1maWVsZHtwYWRkaW5nLWJsb2NrOjB9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXQtc2Vjb25kLWZpZWxke3BhZGRpbmctYmxvY2s6MH06Oi13ZWJraXQtZGF0ZXRpbWUtZWRpdC1taWxsaXNlY29uZC1maWVsZHtwYWRkaW5nLWJsb2NrOjB9Ojotd2Via2l0LWRhdGV0aW1lLWVkaXQtbWVyaWRpZW0tZmllbGR7cGFkZGluZy1ibG9jazowfTo6LXdlYmtpdC1jYWxlbmRhci1waWNrZXItaW5kaWNhdG9ye2xpbmUtaGVpZ2h0OjF9Oi1tb3otdWktaW52YWxpZHtib3gtc2hhZG93Om5vbmV9YnV0dG9uLGlucHV0OndoZXJlKFt0eXBlPWJ1dHRvbl0sW3R5cGU9cmVzZXRdLFt0eXBlPXN1Ym1pdF0pey13ZWJraXQtYXBwZWFyYW5jZTpidXR0b247LW1vei1hcHBlYXJhbmNlOmJ1dHRvbjthcHBlYXJhbmNlOmJ1dHRvbn06OmZpbGUtc2VsZWN0b3ItYnV0dG9uey13ZWJraXQtYXBwZWFyYW5jZTpidXR0b247LW1vei1hcHBlYXJhbmNlOmJ1dHRvbjthcHBlYXJhbmNlOmJ1dHRvbn06Oi13ZWJraXQtaW5uZXItc3Bpbi1idXR0b257aGVpZ2h0OmF1dG99Ojotd2Via2l0LW91dGVyLXNwaW4tYnV0dG9ue2hlaWdodDphdXRvfVtoaWRkZW5dOndoZXJlKDpub3QoW2hpZGRlbj11bnRpbC1mb3VuZF0pKXtkaXNwbGF5Om5vbmUhaW1wb3J0YW50fX1AbGF5ZXIgY29tcG9uZW50cztAbGF5ZXIgdXRpbGl0aWVzey5wb2ludGVyLWV2ZW50cy1ub25le3BvaW50ZXItZXZlbnRzOm5vbmV9LmFic29sdXRle3Bvc2l0aW9uOmFic29sdXRlfS5yZWxhdGl2ZXtwb3NpdGlvbjpyZWxhdGl2ZX0uaW5zZXQtMHt0b3A6MDtyaWdodDowO2JvdHRvbTowO2xlZnQ6MH0uaW5zZXQtMntpbnNldDpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9LnRvcC0we3RvcDowfS5yaWdodC0we3JpZ2h0OjB9LmJvdHRvbS0we2JvdHRvbTowfS5sZWZ0LTB7bGVmdDowfS56LTEwe3otaW5kZXg6MTB9LnotMjB7ei1pbmRleDoyMH0uei0zMHt6LWluZGV4OjMwfS5jb2wtc3RhcnQtMXtncmlkLWNvbHVtbi1zdGFydDoxfS5jb2wtc3RhcnQtMntncmlkLWNvbHVtbi1zdGFydDoyfS5jb2wtc3RhcnQtM3tncmlkLWNvbHVtbi1zdGFydDozfS5yb3ctc3RhcnQtMXtncmlkLXJvdy1zdGFydDoxfS5yb3ctc3RhcnQtMntncmlkLXJvdy1zdGFydDoyfS5tLWF1dG97bWFyZ2luOmF1dG99Lm14LTF7bWFyZ2luLWlubGluZTp2YXIoLS1zcGFjaW5nKX0ubXgtYXV0b3ttYXJnaW4taW5saW5lOmF1dG99Lm10LTFcLjV7bWFyZ2luLXRvcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMS41KX0ubXQtMnttYXJnaW4tdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0ubXQtM3ttYXJnaW4tdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0ubXQtNHttYXJnaW4tdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0ubWItM3ttYXJnaW4tYm90dG9tOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0ubWItNHttYXJnaW4tYm90dG9tOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0ubWwtMXttYXJnaW4tbGVmdDp2YXIoLS1zcGFjaW5nKX0uYmxvY2t7ZGlzcGxheTpibG9ja30uZmxleHtkaXNwbGF5OmZsZXh9LmdyaWR7ZGlzcGxheTpncmlkfS5oaWRkZW57ZGlzcGxheTpub25lfS5pbmxpbmV7ZGlzcGxheTppbmxpbmV9LmlubGluZS1mbGV4e2Rpc3BsYXk6aW5saW5lLWZsZXh9LnRhYmxle2Rpc3BsYXk6dGFibGV9LmFzcGVjdC1zcXVhcmV7YXNwZWN0LXJhdGlvOjF9LmgtMntoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS5oLTJcLjV7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiAyLjUpfS5oLTN7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0uaC0zXC41e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMy41KX0uaC00e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9LmgtNXtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDUpfS5oLTZ7aGVpZ2h0OmNhbGModmFyKC0tc3BhY2luZykgKiA2KX0uaC04e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogOCl9LmgtOXtoZWlnaHQ6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDkpfS5oLTEwe2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTApfS5oLTEye2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTIpfS5oLTE0e2hlaWdodDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTQpfS5oLVxbMTA4cHhcXXtoZWlnaHQ6MTA4cHh9Lm1pbi1oLWR2aHttaW4taGVpZ2h0OjEwMGR2aH0udy0ye3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0udy0yXC41e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiAyLjUpfS53LTN7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMpfS53LTNcLjV7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMuNSl9LnctNHt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9LnctNXt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogNSl9LnctNnt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogNil9LnctOHt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogOCl9LnctOXt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogOSl9LnctMTB7d2lkdGg6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEwKX0udy0xMnt3aWR0aDpjYWxjKHZhcigtLXNwYWNpbmcpICogMTIpfS53LTE2e3dpZHRoOmNhbGModmFyKC0tc3BhY2luZykgKiAxNil9LnctXFsxMDhweFxde3dpZHRoOjEwOHB4fS53LWZ1bGx7d2lkdGg6MTAwJX0udy1tYXh7d2lkdGg6bWF4LWNvbnRlbnR9Lm1heC13LTZ4bHttYXgtd2lkdGg6dmFyKC0tY29udGFpbmVyLTZ4bCl9Lm1heC13LVxbNDIwcHhcXXttYXgtd2lkdGg6NDIwcHh9Lm1heC13LVxbNDYwcHhcXXttYXgtd2lkdGg6NDYwcHh9Lm1heC13LVxbbWluXCg5NHZ3XCw4MjBweFwsY2FsY1woMTAwZHZoLTE5MHB4XClcKVxde21heC13aWR0aDptaW4oOTR2dyw4MjBweCwxMDBkdmggLSAxOTBweCl9Lm1heC13LXNte21heC13aWR0aDp2YXIoLS1jb250YWluZXItc20pfS5taW4tdy1cWzIyMHB4XF17bWluLXdpZHRoOjIyMHB4fS5taW4tdy1cWzI0MHB4XF17bWluLXdpZHRoOjI0MHB4fS5mbGV4LTF7ZmxleDoxfS5ncm93e2ZsZXgtZ3JvdzoxfS4tcm90YXRlLTkwe3JvdGF0ZTotOTBkZWd9LnJvdGF0ZS00NXtyb3RhdGU6NDVkZWd9LnJvdGF0ZS05MHtyb3RhdGU6OTBkZWd9LnJvdGF0ZS0xODB7cm90YXRlOjE4MGRlZ30udHJhbnNmb3Jte3RyYW5zZm9ybTp2YXIoLS10dy1yb3RhdGUteCwpIHZhcigtLXR3LXJvdGF0ZS15LCkgdmFyKC0tdHctcm90YXRlLXosKSB2YXIoLS10dy1za2V3LXgsKSB2YXIoLS10dy1za2V3LXksKX0uY3Vyc29yLWNyb3NzaGFpcntjdXJzb3I6Y3Jvc3NoYWlyfS5jdXJzb3Itbm9uZXtjdXJzb3I6bm9uZX0uY3Vyc29yLXBvaW50ZXJ7Y3Vyc29yOnBvaW50ZXJ9LnRvdWNoLW5vbmV7dG91Y2gtYWN0aW9uOm5vbmV9LnJlc2l6ZXtyZXNpemU6Ym90aH0uZ3JpZC1jb2xzLTJ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgyLG1pbm1heCgwLDFmcikpfS5ncmlkLWNvbHMtM3tncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsbWlubWF4KDAsMWZyKSl9LmdyaWQtcm93cy0ye2dyaWQtdGVtcGxhdGUtcm93czpyZXBlYXQoMixtaW5tYXgoMCwxZnIpKX0uZmxleC1jb2x7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5mbGV4LXdyYXB7ZmxleC13cmFwOndyYXB9LmNvbnRlbnQtc3RhcnR7YWxpZ24tY29udGVudDpmbGV4LXN0YXJ0fS5pdGVtcy1jZW50ZXJ7YWxpZ24taXRlbXM6Y2VudGVyfS5pdGVtcy1lbmR7YWxpZ24taXRlbXM6ZmxleC1lbmR9Lmp1c3RpZnktYmV0d2VlbntqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uanVzdGlmeS1jZW50ZXJ7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uZ2FwLTF7Z2FwOnZhcigtLXNwYWNpbmcpfS5nYXAtMVwuNXtnYXA6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEuNSl9LmdhcC0ye2dhcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMil9LmdhcC0yXC41e2dhcDpjYWxjKHZhcigtLXNwYWNpbmcpICogMi41KX0uZ2FwLTN7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0uZ2FwLTR7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA0KX0uZ2FwLTV7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0uZ2FwLTZ7Z2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA2KX0uZ2FwLXgtOHtjb2x1bW4tZ2FwOmNhbGModmFyKC0tc3BhY2luZykgKiA4KX0uZ2FwLXktMXtyb3ctZ2FwOnZhcigtLXNwYWNpbmcpfS5vdmVyZmxvdy1oaWRkZW57b3ZlcmZsb3c6aGlkZGVufS5yb3VuZGVke2JvcmRlci1yYWRpdXM6LjI1cmVtfS5yb3VuZGVkLWZ1bGx7Ym9yZGVyLXJhZGl1czozLjQwMjgyZTM4cHh9LnJvdW5kZWQtbGd7Ym9yZGVyLXJhZGl1czp2YXIoLS1yYWRpdXMtbGcpfS5yb3VuZGVkLW1ke2JvcmRlci1yYWRpdXM6dmFyKC0tcmFkaXVzLW1kKX0ucm91bmRlZC1zbXtib3JkZXItcmFkaXVzOnZhcigtLXJhZGl1cy1zbSl9LmJvcmRlcntib3JkZXItc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItd2lkdGg6MXB4fS5ib3JkZXItMntib3JkZXItc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItd2lkdGg6MnB4fS5ib3JkZXItdHtib3JkZXItdG9wLXN0eWxlOnZhcigtLXR3LWJvcmRlci1zdHlsZSk7Ym9yZGVyLXRvcC13aWR0aDoxcHh9LmJvcmRlci10LTJ7Ym9yZGVyLXRvcC1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci10b3Atd2lkdGg6MnB4fS5ib3JkZXItci0ye2JvcmRlci1yaWdodC1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci1yaWdodC13aWR0aDoycHh9LmJvcmRlci1iLTJ7Ym9yZGVyLWJvdHRvbS1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci1ib3R0b20td2lkdGg6MnB4fS5ib3JkZXItYi00e2JvcmRlci1ib3R0b20tc3R5bGU6dmFyKC0tdHctYm9yZGVyLXN0eWxlKTtib3JkZXItYm90dG9tLXdpZHRoOjRweH0uYm9yZGVyLWwtMntib3JkZXItbGVmdC1zdHlsZTp2YXIoLS10dy1ib3JkZXItc3R5bGUpO2JvcmRlci1sZWZ0LXdpZHRoOjJweH0uYm9yZGVyLVxbXCM3ZWYwYzhcXVwvNDB7Ym9yZGVyLWNvbG9yOiM3ZWYwYzg2Nn0uYm9yZGVyLVxbXCM2MmU2ZmZcXVwvNDB7Ym9yZGVyLWNvbG9yOiM2MmU2ZmY2Nn0uYm9yZGVyLWFtYmVyZ2xvdy00MDBcLzQwe2JvcmRlci1jb2xvcjojZmZjODU3NjZ9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYm9yZGVyLWFtYmVyZ2xvdy00MDBcLzQwe2JvcmRlci1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItYW1iZXJnbG93LTQwMCkgNDAlLHRyYW5zcGFyZW50KX19LmJvcmRlci1hbWJlcmdsb3ctNDAwXC81MHtib3JkZXItY29sb3I6I2ZmYzg1NzgwfUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1hbWJlcmdsb3ctNDAwXC81MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApIDUwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItYW1iZXJnbG93LTUwMHtib3JkZXItY29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTUwMCl9LmJvcmRlci1hbWJlcmdsb3ctNTAwXC82MHtib3JkZXItY29sb3I6I2U4YTkzYzk5fUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1hbWJlcmdsb3ctNTAwXC82MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFtYmVyZ2xvdy01MDApIDYwJSx0cmFuc3BhcmVudCl9fS5ib3JkZXItYXBwbGUtNDAwXC80MHtib3JkZXItY29sb3I6I2ZmNmI2YjY2fUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1hcHBsZS00MDBcLzQwe2JvcmRlci1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItYXBwbGUtNDAwKSA0MCUsdHJhbnNwYXJlbnQpfX0uYm9yZGVyLWFwcGxlLTQwMFwvNzB7Ym9yZGVyLWNvbG9yOiNmZjZiNmJiM31Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItYXBwbGUtNDAwXC83MHtib3JkZXItY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLWFwcGxlLTQwMCkgNzAlLHRyYW5zcGFyZW50KX19LmJvcmRlci1ibGFja1wvNDB7Ym9yZGVyLWNvbG9yOiMwMDA2fUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJvcmRlci1ibGFja1wvNDB7Ym9yZGVyLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1ibGFjaykgNDAlLHRyYW5zcGFyZW50KX19LmJvcmRlci1waXQtNTAwe2JvcmRlci1jb2xvcjp2YXIoLS1jb2xvci1waXQtNTAwKX0uYm9yZGVyLXBpdC02MDB7Ym9yZGVyLWNvbG9yOnZhcigtLWNvbG9yLXBpdC02MDApfS5ib3JkZXItcGl0LTcwMFwvNjB7Ym9yZGVyLWNvbG9yOiMxNjMwMWY5OX1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5ib3JkZXItcGl0LTcwMFwvNjB7Ym9yZGVyLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1waXQtNzAwKSA2MCUsdHJhbnNwYXJlbnQpfX0uYm9yZGVyLWItXFtcIzdlMjMyN1xde2JvcmRlci1ib3R0b20tY29sb3I6IzdlMjMyN30uYmctXFtcIzBhMTIwYVxdXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMwYTEyMGFkOX0uYmctXFtcIzBhMTIwYVxdXC85MHtiYWNrZ3JvdW5kLWNvbG9yOiMwYTEyMGFlNn0uYmctXFtcIzA1MGExNFxdXC84MHtiYWNrZ3JvdW5kLWNvbG9yOiMwNTBhMTRjY30uYmctXFtcIzA1MGExNFxdXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMwNTBhMTRkOX0uYmctXFtcIzYyZTZmZlxde2JhY2tncm91bmQtY29sb3I6IzYyZTZmZn0uYmctXFtcIzA3MGQyMlxdXC84MHtiYWNrZ3JvdW5kLWNvbG9yOiMwNzBkMjJjY30uYmctXFtcIzA3MGQyMlxdXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMwNzBkMjJkOX0uYmctXFtcIzEwMTQyNVxdXC83OHtiYWNrZ3JvdW5kLWNvbG9yOiMxMDE0MjVjN30uYmctXFtcIzEwMTQyNVxdXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMxMDE0MjVkOX0uYmctXFtcI2MwODRmY1xde2JhY2tncm91bmQtY29sb3I6I2MwODRmY30uYmctXFtcI2ZmOGM0Mlxde2JhY2tncm91bmQtY29sb3I6I2ZmOGM0Mn0uYmctYW1iZXJnbG93LTQwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApfS5iZy1hbWJlcmdsb3ctNDAwXC8xMHtiYWNrZ3JvdW5kLWNvbG9yOiNmZmM4NTcxYX1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1hbWJlcmdsb3ctNDAwXC8xMHtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKSAxMCUsdHJhbnNwYXJlbnQpfX0uYmctYW1iZXJnbG93LTQwMFwvMTV7YmFja2dyb3VuZC1jb2xvcjojZmZjODU3MjZ9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctYW1iZXJnbG93LTQwMFwvMTV7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItYW1iZXJnbG93LTQwMCkgMTUlLHRyYW5zcGFyZW50KX19LmJnLWFwcGxlLTQwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLWFwcGxlLTQwMCl9LmJnLWFwcGxlLTUwMFwvMjV7YmFja2dyb3VuZC1jb2xvcjojZTA0MzQ4NDB9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctYXBwbGUtNTAwXC8yNXtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1hcHBsZS01MDApIDI1JSx0cmFuc3BhcmVudCl9fS5iZy1tb3NzLTQwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLW1vc3MtNDAwKX0uYmctcGl0LTYwMHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC02MDApfS5iZy1waXQtNzAwe2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItcGl0LTcwMCl9LmJnLXBpdC04MDB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtODAwKX0uYmctcGl0LTg1MHtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC04NTApfS5iZy1waXQtODUwXC85MHtiYWNrZ3JvdW5kLWNvbG9yOiMwYzFkMTNlNn1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1waXQtODUwXC85MHtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1waXQtODUwKSA5MCUsdHJhbnNwYXJlbnQpfX0uYmctcGl0LTkwMFwvODB7YmFja2dyb3VuZC1jb2xvcjojMGExODEwY2N9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTkwMFwvODB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTkwMCkgODAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC05NTB7YmFja2dyb3VuZC1jb2xvcjp2YXIoLS1jb2xvci1waXQtOTUwKX0uYmctcGl0LTk1MFwvNTB7YmFja2dyb3VuZC1jb2xvcjojMDYwZjBhODB9QHN1cHBvcnRzIChjb2xvcjpjb2xvci1taXgoaW4gbGFiLHJlZCxyZWQpKXsuYmctcGl0LTk1MFwvNTB7YmFja2dyb3VuZC1jb2xvcjpjb2xvci1taXgoaW4gb2tsYWIsdmFyKC0tY29sb3ItcGl0LTk1MCkgNTAlLHRyYW5zcGFyZW50KX19LmJnLXBpdC05NTBcLzgwe2JhY2tncm91bmQtY29sb3I6IzA2MGYwYWNjfUBzdXBwb3J0cyAoY29sb3I6Y29sb3ItbWl4KGluIGxhYixyZWQscmVkKSl7LmJnLXBpdC05NTBcLzgwe2JhY2tncm91bmQtY29sb3I6Y29sb3ItbWl4KGluIG9rbGFiLHZhcigtLWNvbG9yLXBpdC05NTApIDgwJSx0cmFuc3BhcmVudCl9fS5iZy1waXQtOTUwXC84NXtiYWNrZ3JvdW5kLWNvbG9yOiMwNjBmMGFkOX1Ac3VwcG9ydHMgKGNvbG9yOmNvbG9yLW1peChpbiBsYWIscmVkLHJlZCkpey5iZy1waXQtOTUwXC84NXtiYWNrZ3JvdW5kLWNvbG9yOmNvbG9yLW1peChpbiBva2xhYix2YXIoLS1jb2xvci1waXQtOTUwKSA4NSUsdHJhbnNwYXJlbnQpfX0uYmctdmVub20tNDAwe2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItdmVub20tNDAwKX0ucC0xe3BhZGRpbmc6dmFyKC0tc3BhY2luZyl9LnAtM1wuNXtwYWRkaW5nOmNhbGModmFyKC0tc3BhY2luZykgKiAzLjUpfS5wLTZ7cGFkZGluZzpjYWxjKHZhcigtLXNwYWNpbmcpICogNil9LnB4LTJ7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS5weC0yXC41e3BhZGRpbmctaW5saW5lOmNhbGModmFyKC0tc3BhY2luZykgKiAyLjUpfS5weC0ze3BhZGRpbmctaW5saW5lOmNhbGModmFyKC0tc3BhY2luZykgKiAzKX0ucHgtNHtwYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogNCl9LnB4LTh7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDgpfS5weS0xe3BhZGRpbmctYmxvY2s6dmFyKC0tc3BhY2luZyl9LnB5LTFcLjV7cGFkZGluZy1ibG9jazpjYWxjKHZhcigtLXNwYWNpbmcpICogMS41KX0ucHktMntwYWRkaW5nLWJsb2NrOmNhbGModmFyKC0tc3BhY2luZykgKiAyKX0ucHktMlwuNXtwYWRkaW5nLWJsb2NrOmNhbGModmFyKC0tc3BhY2luZykgKiAyLjUpfS5weS0ze3BhZGRpbmctYmxvY2s6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMpfS5weS00e3BhZGRpbmctYmxvY2s6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDQpfS5wdC0wXC41e3BhZGRpbmctdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiAuNSl9LnB0LTF7cGFkZGluZy10b3A6dmFyKC0tc3BhY2luZyl9LnB0LTFcLjV7cGFkZGluZy10b3A6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDEuNSl9LnB0LTJ7cGFkZGluZy10b3A6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDIpfS5wdC01e3BhZGRpbmctdG9wOmNhbGModmFyKC0tc3BhY2luZykgKiA1KX0ucGItM3twYWRkaW5nLWJvdHRvbTpjYWxjKHZhcigtLXNwYWNpbmcpICogMyl9LnBiLTEwe3BhZGRpbmctYm90dG9tOmNhbGModmFyKC0tc3BhY2luZykgKiAxMCl9LnRleHQtY2VudGVye3RleHQtYWxpZ246Y2VudGVyfS50ZXh0LWxlZnR7dGV4dC1hbGlnbjpsZWZ0fS5mb250LWRpc3BsYXl7Zm9udC1mYW1pbHk6dmFyKC0tZm9udC1kaXNwbGF5KX0udGV4dC0yeGx7Zm9udC1zaXplOnZhcigtLXRleHQtMnhsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQtMnhsLS1saW5lLWhlaWdodCkpfS50ZXh0LTN4bHtmb250LXNpemU6dmFyKC0tdGV4dC0zeGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC0zeGwtLWxpbmUtaGVpZ2h0KSl9LnRleHQtbGd7Zm9udC1zaXplOnZhcigtLXRleHQtbGcpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC1sZy0tbGluZS1oZWlnaHQpKX0udGV4dC1zbXtmb250LXNpemU6dmFyKC0tdGV4dC1zbSk7bGluZS1oZWlnaHQ6dmFyKC0tdHctbGVhZGluZyx2YXIoLS10ZXh0LXNtLS1saW5lLWhlaWdodCkpfS50ZXh0LXhse2ZvbnQtc2l6ZTp2YXIoLS10ZXh0LXhsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQteGwtLWxpbmUtaGVpZ2h0KSl9LnRleHQtXFs2cHhcXXtmb250LXNpemU6NnB4fS50ZXh0LVxbN3B4XF17Zm9udC1zaXplOjdweH0udGV4dC1cWzhweFxde2ZvbnQtc2l6ZTo4cHh9LnRleHQtXFs5cHhcXXtmb250LXNpemU6OXB4fS50ZXh0LVxbMTBweFxde2ZvbnQtc2l6ZToxMHB4fS50ZXh0LVxbMTFweFxde2ZvbnQtc2l6ZToxMXB4fS50ZXh0LVxbMTJweFxde2ZvbnQtc2l6ZToxMnB4fS50ZXh0LVxbMTRweFxde2ZvbnQtc2l6ZToxNHB4fS5sZWFkaW5nLW5vbmV7LS10dy1sZWFkaW5nOjE7bGluZS1oZWlnaHQ6MX0ubGVhZGluZy1yZWxheGVkey0tdHctbGVhZGluZzp2YXIoLS1sZWFkaW5nLXJlbGF4ZWQpO2xpbmUtaGVpZ2h0OnZhcigtLWxlYWRpbmctcmVsYXhlZCl9LmxlYWRpbmctdGlnaHR7LS10dy1sZWFkaW5nOnZhcigtLWxlYWRpbmctdGlnaHQpO2xpbmUtaGVpZ2h0OnZhcigtLWxlYWRpbmctdGlnaHQpfS5mb250LWJvbGR7LS10dy1mb250LXdlaWdodDp2YXIoLS1mb250LXdlaWdodC1ib2xkKTtmb250LXdlaWdodDp2YXIoLS1mb250LXdlaWdodC1ib2xkKX0uZm9udC1tZWRpdW17LS10dy1mb250LXdlaWdodDp2YXIoLS1mb250LXdlaWdodC1tZWRpdW0pO2ZvbnQtd2VpZ2h0OnZhcigtLWZvbnQtd2VpZ2h0LW1lZGl1bSl9LnRyYWNraW5nLVxbMFwuMmVtXF17LS10dy10cmFja2luZzouMmVtO2xldHRlci1zcGFjaW5nOi4yZW19LnRyYWNraW5nLVxbMFwuM2VtXF17LS10dy10cmFja2luZzouM2VtO2xldHRlci1zcGFjaW5nOi4zZW19LnRyYWNraW5nLVxbMFwuMThlbVxdey0tdHctdHJhY2tpbmc6LjE4ZW07bGV0dGVyLXNwYWNpbmc6LjE4ZW19LnRyYWNraW5nLVxbMFwuMjVlbVxdey0tdHctdHJhY2tpbmc6LjI1ZW07bGV0dGVyLXNwYWNpbmc6LjI1ZW19LnRyYWNraW5nLW5vcm1hbHstLXR3LXRyYWNraW5nOnZhcigtLXRyYWNraW5nLW5vcm1hbCk7bGV0dGVyLXNwYWNpbmc6dmFyKC0tdHJhY2tpbmctbm9ybWFsKX0udHJhY2tpbmctd2lkZXstLXR3LXRyYWNraW5nOnZhcigtLXRyYWNraW5nLXdpZGUpO2xldHRlci1zcGFjaW5nOnZhcigtLXRyYWNraW5nLXdpZGUpfS50cmFja2luZy13aWRlcnstLXR3LXRyYWNraW5nOnZhcigtLXRyYWNraW5nLXdpZGVyKTtsZXR0ZXItc3BhY2luZzp2YXIoLS10cmFja2luZy13aWRlcil9LnRyYWNraW5nLXdpZGVzdHstLXR3LXRyYWNraW5nOnZhcigtLXRyYWNraW5nLXdpZGVzdCk7bGV0dGVyLXNwYWNpbmc6dmFyKC0tdHJhY2tpbmctd2lkZXN0KX0udGV4dC1cW1wjN2VmMGEwXF17Y29sb3I6IzdlZjBhMH0udGV4dC1cW1wjN2VmMGM4XF17Y29sb3I6IzdlZjBjOH0udGV4dC1cW1wjOWZiMGQwXF17Y29sb3I6IzlmYjBkMH0udGV4dC1cW1wjOWZjM2Q5XF17Y29sb3I6IzlmYzNkOX0udGV4dC1cW1wjOWZkOGMyXF17Y29sb3I6IzlmZDhjMn0udGV4dC1cW1wjNjJlNmZmXF17Y29sb3I6IzYyZTZmZn0udGV4dC1cW1wjMDUyNTMwXF17Y29sb3I6IzA1MjUzMH0udGV4dC1cW1wjMjQxMDMzXF17Y29sb3I6IzI0MTAzM30udGV4dC1cW1wjYmZmN2ZmXF17Y29sb3I6I2JmZjdmZn0udGV4dC1hbWJlcmdsb3ctMzAwe2NvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy0zMDApfS50ZXh0LWFtYmVyZ2xvdy00MDB7Y29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTQwMCl9LnRleHQtYXBwbGUtNDAwe2NvbG9yOnZhcigtLWNvbG9yLWFwcGxlLTQwMCl9LnRleHQtbW9zcy0xMDB7Y29sb3I6dmFyKC0tY29sb3ItbW9zcy0xMDApfS50ZXh0LW1vc3MtMjAwe2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKX0udGV4dC1tb3NzLTMwMHtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTMwMCl9LnRleHQtbW9zcy00MDB7Y29sb3I6dmFyKC0tY29sb3ItbW9zcy00MDApfS50ZXh0LXBpdC01MDB7Y29sb3I6dmFyKC0tY29sb3ItcGl0LTUwMCl9LnRleHQtcGl0LTk1MHtjb2xvcjp2YXIoLS1jb2xvci1waXQtOTUwKX0udGV4dC12ZW5vbS00MDB7Y29sb3I6dmFyKC0tY29sb3ItdmVub20tNDAwKX0ubm9ybWFsLWNhc2V7dGV4dC10cmFuc2Zvcm06bm9uZX0udXBwZXJjYXNle3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZX0udGFidWxhci1udW1zey0tdHctbnVtZXJpYy1zcGFjaW5nOnRhYnVsYXItbnVtcztmb250LXZhcmlhbnQtbnVtZXJpYzp2YXIoLS10dy1vcmRpbmFsLCkgdmFyKC0tdHctc2xhc2hlZC16ZXJvLCkgdmFyKC0tdHctbnVtZXJpYy1maWd1cmUsKSB2YXIoLS10dy1udW1lcmljLXNwYWNpbmcsKSB2YXIoLS10dy1udW1lcmljLWZyYWN0aW9uLCl9Lm9wYWNpdHktMjB7b3BhY2l0eTouMn0ub3BhY2l0eS02MHtvcGFjaXR5Oi42fS5zaGFkb3ctXFswXzBfOHB4X3JnYmFcKDE5MlwsMTMyXCwyNTJcLDBcLjhcKVxdey0tdHctc2hhZG93OjAgMCA4cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNjMDg0ZmNjYyk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFswXzBfOHB4X3JnYmFcKDI1NVwsMTA3XCwxMDdcLDBcLjhcKVxdey0tdHctc2hhZG93OjAgMCA4cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNmZjZiNmJjYyk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFswXzBfOHB4X3JnYmFcKDI1NVwsMTQwXCw2NlwsMFwuOFwpXF17LS10dy1zaGFkb3c6MCAwIDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsI2ZmOGM0MmNjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9LnNoYWRvdy1cWzBfMF8xOHB4X3JnYmFcKDI1NVwsMjAwXCw4N1wsMFwuMThcKVxdey0tdHctc2hhZG93OjAgMCAxOHB4IHZhcigtLXR3LXNoYWRvdy1jb2xvciwjZmZjODU3MmUpO2JveC1zaGFkb3c6dmFyKC0tdHctaW5zZXQtc2hhZG93KSx2YXIoLS10dy1pbnNldC1yaW5nLXNoYWRvdyksdmFyKC0tdHctcmluZy1vZmZzZXQtc2hhZG93KSx2YXIoLS10dy1yaW5nLXNoYWRvdyksdmFyKC0tdHctc2hhZG93KX0uc2hhZG93LVxbMF8wXzI4cHhfcmdiYVwoMjU1XCw5M1wsMTQzXCwwXC4yOFwpXF17LS10dy1zaGFkb3c6MCAwIDI4cHggdmFyKC0tdHctc2hhZG93LWNvbG9yLCNmZjVkOGY0Nyk7Ym94LXNoYWRvdzp2YXIoLS10dy1pbnNldC1zaGFkb3cpLHZhcigtLXR3LWluc2V0LXJpbmctc2hhZG93KSx2YXIoLS10dy1yaW5nLW9mZnNldC1zaGFkb3cpLHZhcigtLXR3LXJpbmctc2hhZG93KSx2YXIoLS10dy1zaGFkb3cpfS5zaGFkb3ctXFtpbnNldF8wXzJweF84cHhfcmdiYVwoMFwsMFwsMFwsMFwuNTVcKVxdey0tdHctc2hhZG93Omluc2V0IDAgMnB4IDhweCB2YXIoLS10dy1zaGFkb3ctY29sb3IsIzAwMDAwMDhjKTtib3gtc2hhZG93OnZhcigtLXR3LWluc2V0LXNoYWRvdyksdmFyKC0tdHctaW5zZXQtcmluZy1zaGFkb3cpLHZhcigtLXR3LXJpbmctb2Zmc2V0LXNoYWRvdyksdmFyKC0tdHctcmluZy1zaGFkb3cpLHZhcigtLXR3LXNoYWRvdyl9Lm91dGxpbmV7b3V0bGluZS1zdHlsZTp2YXIoLS10dy1vdXRsaW5lLXN0eWxlKTtvdXRsaW5lLXdpZHRoOjFweH0uYmx1cnstLXR3LWJsdXI6Ymx1cig4cHgpO2ZpbHRlcjp2YXIoLS10dy1ibHVyLCkgdmFyKC0tdHctYnJpZ2h0bmVzcywpIHZhcigtLXR3LWNvbnRyYXN0LCkgdmFyKC0tdHctZ3JheXNjYWxlLCkgdmFyKC0tdHctaHVlLXJvdGF0ZSwpIHZhcigtLXR3LWludmVydCwpIHZhcigtLXR3LXNhdHVyYXRlLCkgdmFyKC0tdHctc2VwaWEsKSB2YXIoLS10dy1kcm9wLXNoYWRvdywpfS5ncmF5c2NhbGV7LS10dy1ncmF5c2NhbGU6Z3JheXNjYWxlKDEwMCUpO2ZpbHRlcjp2YXIoLS10dy1ibHVyLCkgdmFyKC0tdHctYnJpZ2h0bmVzcywpIHZhcigtLXR3LWNvbnRyYXN0LCkgdmFyKC0tdHctZ3JheXNjYWxlLCkgdmFyKC0tdHctaHVlLXJvdGF0ZSwpIHZhcigtLXR3LWludmVydCwpIHZhcigtLXR3LXNhdHVyYXRlLCkgdmFyKC0tdHctc2VwaWEsKSB2YXIoLS10dy1kcm9wLXNoYWRvdywpfS5maWx0ZXJ7ZmlsdGVyOnZhcigtLXR3LWJsdXIsKSB2YXIoLS10dy1icmlnaHRuZXNzLCkgdmFyKC0tdHctY29udHJhc3QsKSB2YXIoLS10dy1ncmF5c2NhbGUsKSB2YXIoLS10dy1odWUtcm90YXRlLCkgdmFyKC0tdHctaW52ZXJ0LCkgdmFyKC0tdHctc2F0dXJhdGUsKSB2YXIoLS10dy1zZXBpYSwpIHZhcigtLXR3LWRyb3Atc2hhZG93LCl9LmJhY2tkcm9wLWJsdXItXFsycHhcXXstLXR3LWJhY2tkcm9wLWJsdXI6Ymx1cigycHgpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOnZhcigtLXR3LWJhY2tkcm9wLWJsdXIsKSB2YXIoLS10dy1iYWNrZHJvcC1icmlnaHRuZXNzLCkgdmFyKC0tdHctYmFja2Ryb3AtY29udHJhc3QsKSB2YXIoLS10dy1iYWNrZHJvcC1ncmF5c2NhbGUsKSB2YXIoLS10dy1iYWNrZHJvcC1odWUtcm90YXRlLCkgdmFyKC0tdHctYmFja2Ryb3AtaW52ZXJ0LCkgdmFyKC0tdHctYmFja2Ryb3Atb3BhY2l0eSwpIHZhcigtLXR3LWJhY2tkcm9wLXNhdHVyYXRlLCkgdmFyKC0tdHctYmFja2Ryb3Atc2VwaWEsKTtiYWNrZHJvcC1maWx0ZXI6dmFyKC0tdHctYmFja2Ryb3AtYmx1ciwpIHZhcigtLXR3LWJhY2tkcm9wLWJyaWdodG5lc3MsKSB2YXIoLS10dy1iYWNrZHJvcC1jb250cmFzdCwpIHZhcigtLXR3LWJhY2tkcm9wLWdyYXlzY2FsZSwpIHZhcigtLXR3LWJhY2tkcm9wLWh1ZS1yb3RhdGUsKSB2YXIoLS10dy1iYWNrZHJvcC1pbnZlcnQsKSB2YXIoLS10dy1iYWNrZHJvcC1vcGFjaXR5LCkgdmFyKC0tdHctYmFja2Ryb3Atc2F0dXJhdGUsKSB2YXIoLS10dy1iYWNrZHJvcC1zZXBpYSwpfS50cmFuc2l0aW9ue3RyYW5zaXRpb24tcHJvcGVydHk6Y29sb3IsYmFja2dyb3VuZC1jb2xvcixib3JkZXItY29sb3Isb3V0bGluZS1jb2xvcix0ZXh0LWRlY29yYXRpb24tY29sb3IsZmlsbCxzdHJva2UsLS10dy1ncmFkaWVudC1mcm9tLC0tdHctZ3JhZGllbnQtdmlhLC0tdHctZ3JhZGllbnQtdG8sb3BhY2l0eSxib3gtc2hhZG93LHRyYW5zZm9ybSx0cmFuc2xhdGUsc2NhbGUscm90YXRlLGZpbHRlciwtd2Via2l0LWJhY2tkcm9wLWZpbHRlcixiYWNrZHJvcC1maWx0ZXIsZGlzcGxheSxjb250ZW50LXZpc2liaWxpdHksb3ZlcmxheSxwb2ludGVyLWV2ZW50czt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjp2YXIoLS10dy1lYXNlLHZhcigtLWRlZmF1bHQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb24pKTt0cmFuc2l0aW9uLWR1cmF0aW9uOnZhcigtLXR3LWR1cmF0aW9uLHZhcigtLWRlZmF1bHQtdHJhbnNpdGlvbi1kdXJhdGlvbikpfS50cmFuc2l0aW9uLWFsbHt0cmFuc2l0aW9uLXByb3BlcnR5OmFsbDt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjp2YXIoLS10dy1lYXNlLHZhcigtLWRlZmF1bHQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb24pKTt0cmFuc2l0aW9uLWR1cmF0aW9uOnZhcigtLXR3LWR1cmF0aW9uLHZhcigtLWRlZmF1bHQtdHJhbnNpdGlvbi1kdXJhdGlvbikpfS5kdXJhdGlvbi0xNTB7LS10dy1kdXJhdGlvbjouMTVzO3RyYW5zaXRpb24tZHVyYXRpb246LjE1c30uc2VsZWN0LW5vbmV7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmV9LlxbdGV4dC1zaGFkb3dcOjBfMF8xMnB4X3JnYmFcKDk4XCwyMzBcLDI1NVwsMFwuNDVcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICM2MmU2ZmY3M30uXFt0ZXh0LXNoYWRvd1w6MF8wXzEycHhfcmdiYVwoMTQyXCwyNDBcLDkwXCwwXC40NVwpXF17dGV4dC1zaGFkb3c6MCAwIDEycHggIzhlZjA1YTczfS5cW3RleHQtc2hhZG93XDowXzBfMTJweF9yZ2JhXCgyNTVcLDkzXCwxNDNcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAxMnB4ICNmZjVkOGY4MH0uXFt0ZXh0LXNoYWRvd1w6MF8wXzE0cHhfcmdiYVwoMjU1XCwyMjRcLDEzOFwsMFwuNVwpXF17dGV4dC1zaGFkb3c6MCAwIDE0cHggI2ZmZTA4YTgwfS5cW3RleHQtc2hhZG93XDowXzBfMjRweF9yZ2JhXCgyNTVcLDkzXCwxNDNcLDBcLjVcKVxde3RleHQtc2hhZG93OjAgMCAyNHB4ICNmZjVkOGY4MH0uXFt0ZXh0LXNoYWRvd1w6MF8wXzI0cHhfcmdiYVwoMjU1XCwxMDdcLDEwN1wsMFwuNVwpXF17dGV4dC1zaGFkb3c6MCAwIDI0cHggI2ZmNmI2YjgwfUBtZWRpYShob3Zlcjpob3Zlcil7LmhvdmVyXDpiZy1waXQtODAwOmhvdmVye2JhY2tncm91bmQtY29sb3I6dmFyKC0tY29sb3ItcGl0LTgwMCl9LmhvdmVyXDp0ZXh0LW1vc3MtMTAwOmhvdmVye2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMTAwKX19LmFjdGl2ZVw6dHJhbnNsYXRlLXktMFwuNTphY3RpdmV7LS10dy10cmFuc2xhdGUteTpjYWxjKHZhcigtLXNwYWNpbmcpICogLjUpO3RyYW5zbGF0ZTp2YXIoLS10dy10cmFuc2xhdGUteCkgdmFyKC0tdHctdHJhbnNsYXRlLXkpfS5kaXNhYmxlZFw6Y3Vyc29yLW5vdC1hbGxvd2VkOmRpc2FibGVke2N1cnNvcjpub3QtYWxsb3dlZH0uZGlzYWJsZWRcOm9wYWNpdHktNjA6ZGlzYWJsZWR7b3BhY2l0eTouNn1AbWVkaWEobWluLXdpZHRoOjQwcmVtKXsuc21cOmJsb2Nre2Rpc3BsYXk6YmxvY2t9LnNtXDpmbGV4e2Rpc3BsYXk6ZmxleH0uc21cOmhpZGRlbntkaXNwbGF5Om5vbmV9LnNtXDpncmlkLWNvbHMtNHtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsbWlubWF4KDAsMWZyKSl9LnNtXDpnYXAtM3tnYXA6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDMpfS5zbVw6cHgtM1wuNXtwYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogMy41KX0uc21cOnB4LTR7cGFkZGluZy1pbmxpbmU6Y2FsYyh2YXIoLS1zcGFjaW5nKSAqIDQpfS5zbVw6cHgtNntwYWRkaW5nLWlubGluZTpjYWxjKHZhcigtLXNwYWNpbmcpICogNil9LnNtXDp0ZXh0LTJ4bHtmb250LXNpemU6dmFyKC0tdGV4dC0yeGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC0yeGwtLWxpbmUtaGVpZ2h0KSl9LnNtXDp0ZXh0LTN4bHtmb250LXNpemU6dmFyKC0tdGV4dC0zeGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC0zeGwtLWxpbmUtaGVpZ2h0KSl9LnNtXDp0ZXh0LTR4bHtmb250LXNpemU6dmFyKC0tdGV4dC00eGwpO2xpbmUtaGVpZ2h0OnZhcigtLXR3LWxlYWRpbmcsdmFyKC0tdGV4dC00eGwtLWxpbmUtaGVpZ2h0KSl9LnNtXDp0ZXh0LWJhc2V7Zm9udC1zaXplOnZhcigtLXRleHQtYmFzZSk7bGluZS1oZWlnaHQ6dmFyKC0tdHctbGVhZGluZyx2YXIoLS10ZXh0LWJhc2UtLWxpbmUtaGVpZ2h0KSl9LnNtXDp0ZXh0LXhse2ZvbnQtc2l6ZTp2YXIoLS10ZXh0LXhsKTtsaW5lLWhlaWdodDp2YXIoLS10dy1sZWFkaW5nLHZhcigtLXRleHQteGwtLWxpbmUtaGVpZ2h0KSl9LnNtXDp0ZXh0LVxbMTBweFxde2ZvbnQtc2l6ZToxMHB4fX1AbWVkaWEobWluLXdpZHRoOjQ4cmVtKXsubWRcOmhpZGRlbntkaXNwbGF5Om5vbmV9fUBtZWRpYShtaW4td2lkdGg6NjRyZW0pey5sZ1w6bWF4LXctXFttaW5cKDEwMFwlXCxjYWxjXCgxMDBkdmgtMjgwcHhcKVwpXF17bWF4LXdpZHRoOm1pbigxMDAlLDEwMGR2aCAtIDI4MHB4KX0ubGdcOmdyaWQtY29scy1cW21pbm1heFwoMFwsMWZyXClfMzAwcHhcXXtncmlkLXRlbXBsYXRlLWNvbHVtbnM6bWlubWF4KDAsMWZyKSAzMDBweH19fWh0bWwsYm9keXtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWNvbG9yLXBpdC05NTApO21pbi1oZWlnaHQ6MTAwJTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTEwMCk7Zm9udC1mYW1pbHk6dmFyKC0tZm9udC1ib2R5KTstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnQ7b3ZlcnNjcm9sbC1iZWhhdmlvci15Om5vbmU7dG91Y2gtYWN0aW9uOm1hbmlwdWxhdGlvbjttYXJnaW46MH0uZm9udC1kaXNwbGF5e2ZvbnQtZmFtaWx5OnZhcigtLWZvbnQtZGlzcGxheSl9LmJ0bi1hcmNhZGV7Zm9udC1mYW1pbHk6dmFyKC0tZm9udC1ib2R5KTtsZXR0ZXItc3BhY2luZzouMDhlbTt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtib3JkZXItYm90dG9tLXdpZHRoOjNweDtib3JkZXItcmFkaXVzOjZweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gODBtcyxmaWx0ZXIgLjEycyxiYWNrZ3JvdW5kLWNvbG9yIC4xMnMsYm94LXNoYWRvdyAuMTJzfS5idG4tYXJjYWRlOmFjdGl2ZTpub3QoOmRpc2FibGVkKXtib3JkZXItYm90dG9tLXdpZHRoOjFweDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgycHgpfS5idG4tYXJjYWRlOmRpc2FibGVke29wYWNpdHk6LjQ1O2N1cnNvcjpub3QtYWxsb3dlZH0uYnRuLXByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKTtib3JkZXItY29sb3I6dmFyKC0tY29sb3ItYW1iZXJnbG93LTUwMCk7Y29sb3I6IzIyMTYwNDtib3JkZXItYm90dG9tLWNvbG9yOiM4YTY0MjA7Ym94LXNoYWRvdzowIDAgMjJweCAjZmZjODU3Mzh9LmJ0bi1wcmltYXJ5OmhvdmVyOm5vdCg6ZGlzYWJsZWQpe2ZpbHRlcjpicmlnaHRuZXNzKDEuMDcpO2JveC1zaGFkb3c6MCAwIDMwcHggI2ZmYzg1NzYxfS5idG4tZ2hvc3R7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtODAwKTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTIwMCk7Ym9yZGVyLWJvdHRvbS1jb2xvcjojMDgxMzBjfS5idG4tZ2hvc3Q6aG92ZXI6bm90KDpkaXNhYmxlZCl7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtNzAwKTtjb2xvcjp2YXIoLS1jb2xvci1tb3NzLTEwMCl9Lmljb24tYnRue2JvcmRlcjoxcHggc29saWQgdmFyKC0tY29sb3ItcGl0LTUwMCk7YmFja2dyb3VuZDp2YXIoLS1jb2xvci1waXQtODAwKTt3aWR0aDoyLjM1cmVtO2hlaWdodDoyLjM1cmVtO2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKTtib3JkZXItYm90dG9tLXdpZHRoOjNweDtib3JkZXItYm90dG9tLWNvbG9yOiMwODEzMGM7Ym9yZGVyLXJhZGl1czo2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7dHJhbnNpdGlvbjphbGwgLjEycztkaXNwbGF5OmlubGluZS1mbGV4fS5pY29uLWJ0bjpob3ZlcntiYWNrZ3JvdW5kOnZhcigtLWNvbG9yLXBpdC03MDApO2NvbG9yOnZhcigtLWNvbG9yLWFtYmVyZ2xvdy00MDApfS5pY29uLWJ0bjphY3RpdmV7Ym9yZGVyLWJvdHRvbS13aWR0aDoxcHg7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMnB4KX0ua2Jke2ZvbnQtZmFtaWx5OnZhcigtLWZvbnQtYm9keSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTtib3JkZXItYm90dG9tOjJweCBzb2xpZCB2YXIoLS1jb2xvci1waXQtNTAwKTtiYWNrZ3JvdW5kOnZhcigtLWNvbG9yLXBpdC04MDApO2NvbG9yOnZhcigtLWNvbG9yLW1vc3MtMjAwKTt3aGl0ZS1zcGFjZTpub3dyYXA7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo0cHggNnB4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfS5ib2FyZC1mcmFtZXtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWNvbG9yLXBpdC02MDApO2JhY2tncm91bmQ6dmFyKC0tY29sb3ItcGl0LTkwMCk7Ym94LXNoYWRvdzowIDAgMCA0cHggdmFyKC0tY29sb3ItcGl0LTk1MCksMCAwIDAgNXB4IHZhcigtLWNvbG9yLXBpdC03MDApLDAgMzBweCA3MHB4IC0yNHB4ICMwMDAwMDBlNixpbnNldCAwIDFweCAjYWNmNjY0MTQ7Ym9yZGVyLXJhZGl1czo2cHh9LnNjYW5saW5lczphZnRlcntjb250ZW50OiIiO3otaW5kZXg6MTA7cG9pbnRlci1ldmVudHM6bm9uZTtib3JkZXItcmFkaXVzOmluaGVyaXQ7b3BhY2l0eTouNDtiYWNrZ3JvdW5kOnJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoMGRlZywjMDAwMDAwMjQgMCwjMDAwMDAwMjQgMXB4LCMwMDAwIDFweCwjMDAwMCAzcHgpO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO3JpZ2h0OjA7Ym90dG9tOjA7bGVmdDowfS5yZXRyby10aXRsZXtjb2xvcjp2YXIoLS1jb2xvci1hbWJlcmdsb3ctNDAwKTt0ZXh0LXNoYWRvdzowIDNweCAjN2M0YTEyLDAgNnB4ICMwMDAwMDA3MywwIDAgMzRweCAjZmZjODU3NjZ9LnJldHJvLXRpdGxlLWN5YW57Y29sb3I6IzYyZTZmZjt0ZXh0LXNoYWRvdzowIDNweCAjMTc1ZTc1LDAgNnB4ICMwMDAwMDA3MywwIDAgMzRweCAjNjJlNmZmNzN9LnJldHJvLXRpdGxlLWNoYWxre2NvbG9yOiNmMmVkZTA7dGV4dC1zaGFkb3c6MCAzcHggI2EwM2MzYywwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2YyZWRlMDY2fS5yZXRyby10aXRsZS1taW50e2NvbG9yOiM3ZWYwZDA7dGV4dC1zaGFkb3c6MCAzcHggIzE0NjU1YSwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggIzdlZjBkMDczfS5yZXRyby10aXRsZS1waW5re2NvbG9yOiNmZjVkOGY7dGV4dC1zaGFkb3c6MCAzcHggIzdjMWYzZSwwIDZweCAjMDAwMDAwNzMsMCAwIDM0cHggI2ZmNWQ4ZjczfUBrZXlmcmFtZXMgcG9wezAle2ZpbHRlcjpicmlnaHRuZXNzKDEuNik7dHJhbnNmb3JtOnNjYWxlKDEuNSl9dG97ZmlsdGVyOmJyaWdodG5lc3MoKTt0cmFuc2Zvcm06c2NhbGUoMSl9fS5hbmltYXRlLXBvcHthbmltYXRpb246LjI4cyBjdWJpYy1iZXppZXIoLjIsMS42LC40LDEpIHBvcH1Aa2V5ZnJhbWVzIHJpc2V7MCV7b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE2cHgpc2NhbGUoLjk2KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMClzY2FsZSgxKX19LmFuaW1hdGUtcmlzZXthbmltYXRpb246LjM4cyBjdWJpYy1iZXppZXIoLjIsMS4yLC4zLDEpIGJvdGggcmlzZX1Aa2V5ZnJhbWVzIGZhZGVpbnswJXtvcGFjaXR5OjB9dG97b3BhY2l0eToxfX0uYW5pbWF0ZS1mYWRlaW57YW5pbWF0aW9uOi4yNXMgYm90aCBmYWRlaW59QGtleWZyYW1lcyBibGluay1oYXJkezAlLDU4JXtvcGFjaXR5OjF9NTklLHRve29wYWNpdHk6LjEyfX0uYW5pbWF0ZS1ibGlua3thbmltYXRpb246MS4xNXMgc3RlcC1lbmQgaW5maW5pdGUgYmxpbmstaGFyZH1Aa2V5ZnJhbWVzIHB1bHNlLXNvZnR7MCUsdG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKX01MCV7b3BhY2l0eTouODU7dHJhbnNmb3JtOnNjYWxlKDEuMDYpfX0uYW5pbWF0ZS1wdWxzZS1zb2Z0e2FuaW1hdGlvbjouOXMgZWFzZS1pbi1vdXQgaW5maW5pdGUgcHVsc2Utc29mdH1Aa2V5ZnJhbWVzIGZpcmVmbHktZmx5ezAle3RyYW5zZm9ybTp0cmFuc2xhdGUoMCl9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZTNkKHZhcigtLXR4KSx2YXIoLS10eSksMCl9fUBrZXlmcmFtZXMgZmlyZWZseS1mbGlja3swJSx0b3tvcGFjaXR5OjB9NDUlLDYwJXtvcGFjaXR5OnZhcigtLXBlYWspfX0uZmlyZWZseXtiYWNrZ3JvdW5kOnZhcigtLWMpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHZhcigtLWMpO29wYWNpdHk6MDthbmltYXRpb246ZmlyZWZseS1mbHkgdmFyKC0tZCkgZWFzZS1pbi1vdXQgdmFyKC0tZGVsKSBpbmZpbml0ZSBhbHRlcm5hdGUsZmlyZWZseS1mbGljayB2YXIoLS1kKSBlYXNlLWluLW91dCB2YXIoLS1kZWwpIGluZmluaXRlO2JvcmRlci1yYWRpdXM6OTk5OXB4O3Bvc2l0aW9uOmFic29sdXRlfUBwcm9wZXJ0eSAtLXR3LXJvdGF0ZS14e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctcm90YXRlLXl7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1yb3RhdGUtentzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNrZXcteHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNrZXcteXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJvcmRlci1zdHlsZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6c29saWR9QHByb3BlcnR5IC0tdHctbGVhZGluZ3tzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWZvbnQtd2VpZ2h0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctdHJhY2tpbmd7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1vcmRpbmFse3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2xhc2hlZC16ZXJve3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctbnVtZXJpYy1maWd1cmV7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1udW1lcmljLXNwYWNpbmd7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1udW1lcmljLWZyYWN0aW9ue3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctc2hhZG93LWNvbG9ye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93LWNvbG9ye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctaW5zZXQtc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctcmluZy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXJpbmctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctaW5zZXQtcmluZy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWluc2V0LXJpbmctc2hhZG93e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowIDAgIzAwMDB9QHByb3BlcnR5IC0tdHctcmluZy1pbnNldHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXJpbmctb2Zmc2V0LXdpZHRoe3N5bnRheDoiPGxlbmd0aD4iO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6MH1AcHJvcGVydHkgLS10dy1yaW5nLW9mZnNldC1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlO2luaXRpYWwtdmFsdWU6I2ZmZn1AcHJvcGVydHkgLS10dy1yaW5nLW9mZnNldC1zaGFkb3d7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjAgMCAjMDAwMH1AcHJvcGVydHkgLS10dy1vdXRsaW5lLXN0eWxle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTpzb2xpZH1AcHJvcGVydHkgLS10dy1ibHVye3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYnJpZ2h0bmVzc3tzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWNvbnRyYXN0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctZ3JheXNjYWxle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctaHVlLXJvdGF0ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWludmVydHtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LW9wYWNpdHl7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1zYXR1cmF0ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXNlcGlhe3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctZHJvcC1zaGFkb3d7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1kcm9wLXNoYWRvdy1jb2xvcntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWRyb3Atc2hhZG93LWFscGhhe3N5bnRheDoiPHBlcmNlbnRhZ2U+Ijtpbmhlcml0czpmYWxzZTtpbml0aWFsLXZhbHVlOjEwMCV9QHByb3BlcnR5IC0tdHctZHJvcC1zaGFkb3ctc2l6ZXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJhY2tkcm9wLWJsdXJ7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1icmlnaHRuZXNze3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3AtY29udHJhc3R7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1ncmF5c2NhbGV7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1iYWNrZHJvcC1odWUtcm90YXRle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3AtaW52ZXJ0e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3Atb3BhY2l0eXtzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LWJhY2tkcm9wLXNhdHVyYXRle3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2V9QHByb3BlcnR5IC0tdHctYmFja2Ryb3Atc2VwaWF7c3ludGF4OiIqIjtpbmhlcml0czpmYWxzZX1AcHJvcGVydHkgLS10dy1kdXJhdGlvbntzeW50YXg6IioiO2luaGVyaXRzOmZhbHNlfUBwcm9wZXJ0eSAtLXR3LXRyYW5zbGF0ZS14e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowfUBwcm9wZXJ0eSAtLXR3LXRyYW5zbGF0ZS15e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowfUBwcm9wZXJ0eSAtLXR3LXRyYW5zbGF0ZS16e3N5bnRheDoiKiI7aW5oZXJpdHM6ZmFsc2U7aW5pdGlhbC12YWx1ZTowfQoKICAgIDwvc3R5bGU+CiAgPC9oZWFkPgogIDxib2R5PgogICAgPGRpdiBpZD0icm9vdCI+PC9kaXY+CiAgICA8c2NyaXB0IHR5cGU9Im1vZHVsZSI+CihmdW5jdGlvbigpe2NvbnN0IGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgibGluayIpLnJlbExpc3Q7aWYoYSYmYS5zdXBwb3J0cyYmYS5zdXBwb3J0cygibW9kdWxlcHJlbG9hZCIpKXJldHVybjtmb3IoY29uc3QgaCBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdsaW5rW3JlbD0ibW9kdWxlcHJlbG9hZCJdJykpYyhoKTtuZXcgTXV0YXRpb25PYnNlcnZlcihoPT57Zm9yKGNvbnN0IHAgb2YgaClpZihwLnR5cGU9PT0iY2hpbGRMaXN0Iilmb3IoY29uc3QgbSBvZiBwLmFkZGVkTm9kZXMpbS50YWdOYW1lPT09IkxJTksiJiZtLnJlbD09PSJtb2R1bGVwcmVsb2FkIiYmYyhtKX0pLm9ic2VydmUoZG9jdW1lbnQse2NoaWxkTGlzdDohMCxzdWJ0cmVlOiEwfSk7ZnVuY3Rpb24gaShoKXtjb25zdCBwPXt9O3JldHVybiBoLmludGVncml0eSYmKHAuaW50ZWdyaXR5PWguaW50ZWdyaXR5KSxoLnJlZmVycmVyUG9saWN5JiYocC5yZWZlcnJlclBvbGljeT1oLnJlZmVycmVyUG9saWN5KSxoLmNyb3NzT3JpZ2luPT09InVzZS1jcmVkZW50aWFscyI/cC5jcmVkZW50aWFscz0iaW5jbHVkZSI6aC5jcm9zc09yaWdpbj09PSJhbm9ueW1vdXMiP3AuY3JlZGVudGlhbHM9Im9taXQiOnAuY3JlZGVudGlhbHM9InNhbWUtb3JpZ2luIixwfWZ1bmN0aW9uIGMoaCl7aWYoaC5lcClyZXR1cm47aC5lcD0hMDtjb25zdCBwPWkoaCk7ZmV0Y2goaC5ocmVmLHApfX0pKCk7ZnVuY3Rpb24gbHAobil7cmV0dXJuIG4mJm4uX19lc01vZHVsZSYmT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG4sImRlZmF1bHQiKT9uLmRlZmF1bHQ6bn12YXIgRmk9e2V4cG9ydHM6e319LHhsPXt9LEJpPXtleHBvcnRzOnt9fSxDZT17fTsvKioKICogQGxpY2Vuc2UgUmVhY3QKICogcmVhY3QucHJvZHVjdGlvbi5taW4uanMKICoKICogQ29weXJpZ2h0IChjKSBGYWNlYm9vaywgSW5jLiBhbmQgaXRzIGFmZmlsaWF0ZXMuCiAqCiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlIGZvdW5kIGluIHRoZQogKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuCiAqL3ZhciBlZjtmdW5jdGlvbiBzcCgpe2lmKGVmKXJldHVybiBDZTtlZj0xO3ZhciBuPVN5bWJvbC5mb3IoInJlYWN0LmVsZW1lbnQiKSxhPVN5bWJvbC5mb3IoInJlYWN0LnBvcnRhbCIpLGk9U3ltYm9sLmZvcigicmVhY3QuZnJhZ21lbnQiKSxjPVN5bWJvbC5mb3IoInJlYWN0LnN0cmljdF9tb2RlIiksaD1TeW1ib2wuZm9yKCJyZWFjdC5wcm9maWxlciIpLHA9U3ltYm9sLmZvcigicmVhY3QucHJvdmlkZXIiKSxtPVN5bWJvbC5mb3IoInJlYWN0LmNvbnRleHQiKSxmPVN5bWJvbC5mb3IoInJlYWN0LmZvcndhcmRfcmVmIiksZz1TeW1ib2wuZm9yKCJyZWFjdC5zdXNwZW5zZSIpLHY9U3ltYm9sLmZvcigicmVhY3QubWVtbyIpLHg9U3ltYm9sLmZvcigicmVhY3QubGF6eSIpLGI9U3ltYm9sLml0ZXJhdG9yO2Z1bmN0aW9uIFQoayl7cmV0dXJuIGs9PT1udWxsfHx0eXBlb2YgayE9Im9iamVjdCI/bnVsbDooaz1iJiZrW2JdfHxrWyJAQGl0ZXJhdG9yIl0sdHlwZW9mIGs9PSJmdW5jdGlvbiI/azpudWxsKX12YXIgQT17aXNNb3VudGVkOmZ1bmN0aW9uKCl7cmV0dXJuITF9LGVucXVldWVGb3JjZVVwZGF0ZTpmdW5jdGlvbigpe30sZW5xdWV1ZVJlcGxhY2VTdGF0ZTpmdW5jdGlvbigpe30sZW5xdWV1ZVNldFN0YXRlOmZ1bmN0aW9uKCl7fX0sZWU9T2JqZWN0LmFzc2lnbixyZT17fTtmdW5jdGlvbiAkKGssUixsZSl7dGhpcy5wcm9wcz1rLHRoaXMuY29udGV4dD1SLHRoaXMucmVmcz1yZSx0aGlzLnVwZGF0ZXI9bGV8fEF9JC5wcm90b3R5cGUuaXNSZWFjdENvbXBvbmVudD17fSwkLnByb3RvdHlwZS5zZXRTdGF0ZT1mdW5jdGlvbihrLFIpe2lmKHR5cGVvZiBrIT0ib2JqZWN0IiYmdHlwZW9mIGshPSJmdW5jdGlvbiImJmshPW51bGwpdGhyb3cgRXJyb3IoInNldFN0YXRlKC4uLik6IHRha2VzIGFuIG9iamVjdCBvZiBzdGF0ZSB2YXJpYWJsZXMgdG8gdXBkYXRlIG9yIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBvYmplY3Qgb2Ygc3RhdGUgdmFyaWFibGVzLiIpO3RoaXMudXBkYXRlci5lbnF1ZXVlU2V0U3RhdGUodGhpcyxrLFIsInNldFN0YXRlIil9LCQucHJvdG90eXBlLmZvcmNlVXBkYXRlPWZ1bmN0aW9uKGspe3RoaXMudXBkYXRlci5lbnF1ZXVlRm9yY2VVcGRhdGUodGhpcyxrLCJmb3JjZVVwZGF0ZSIpfTtmdW5jdGlvbiBnZSgpe31nZS5wcm90b3R5cGU9JC5wcm90b3R5cGU7ZnVuY3Rpb24gZGUoayxSLGxlKXt0aGlzLnByb3BzPWssdGhpcy5jb250ZXh0PVIsdGhpcy5yZWZzPXJlLHRoaXMudXBkYXRlcj1sZXx8QX12YXIgYWU9ZGUucHJvdG90eXBlPW5ldyBnZTthZS5jb25zdHJ1Y3Rvcj1kZSxlZShhZSwkLnByb3RvdHlwZSksYWUuaXNQdXJlUmVhY3RDb21wb25lbnQ9ITA7dmFyIGhlPUFycmF5LmlzQXJyYXksWGU9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxSZT17Y3VycmVudDpudWxsfSxFZT17a2V5OiEwLHJlZjohMCxfX3NlbGY6ITAsX19zb3VyY2U6ITB9O2Z1bmN0aW9uICRlKGssUixsZSl7dmFyIEksVT17fSx0ZT1udWxsLHVlPW51bGw7aWYoUiE9bnVsbClmb3IoSSBpbiBSLnJlZiE9PXZvaWQgMCYmKHVlPVIucmVmKSxSLmtleSE9PXZvaWQgMCYmKHRlPSIiK1Iua2V5KSxSKVhlLmNhbGwoUixJKSYmIUVlLmhhc093blByb3BlcnR5KEkpJiYoVVtJXT1SW0ldKTt2YXIgVj1hcmd1bWVudHMubGVuZ3RoLTI7aWYoVj09PTEpVS5jaGlsZHJlbj1sZTtlbHNlIGlmKDE8Vil7Zm9yKHZhciBwZT1BcnJheShWKSxxPTA7cTxWO3ErKylwZVtxXT1hcmd1bWVudHNbcSsyXTtVLmNoaWxkcmVuPXBlfWlmKGsmJmsuZGVmYXVsdFByb3BzKWZvcihJIGluIFY9ay5kZWZhdWx0UHJvcHMsVilVW0ldPT09dm9pZCAwJiYoVVtJXT1WW0ldKTtyZXR1cm57JCR0eXBlb2Y6bix0eXBlOmssa2V5OnRlLHJlZjp1ZSxwcm9wczpVLF9vd25lcjpSZS5jdXJyZW50fX1mdW5jdGlvbiBEZShrLFIpe3JldHVybnskJHR5cGVvZjpuLHR5cGU6ay50eXBlLGtleTpSLHJlZjprLnJlZixwcm9wczprLnByb3BzLF9vd25lcjprLl9vd25lcn19ZnVuY3Rpb24gemUoayl7cmV0dXJuIHR5cGVvZiBrPT0ib2JqZWN0IiYmayE9PW51bGwmJmsuJCR0eXBlb2Y9PT1ufWZ1bmN0aW9uIEhlKGspe3ZhciBSPXsiPSI6Ij0wIiwiOiI6Ij0yIn07cmV0dXJuIiQiK2sucmVwbGFjZSgvWz06XS9nLGZ1bmN0aW9uKGxlKXtyZXR1cm4gUltsZV19KX12YXIgT2U9L1wvKy9nO2Z1bmN0aW9uIF9lKGssUil7cmV0dXJuIHR5cGVvZiBrPT0ib2JqZWN0IiYmayE9PW51bGwmJmsua2V5IT1udWxsP0hlKCIiK2sua2V5KTpSLnRvU3RyaW5nKDM2KX1mdW5jdGlvbiBLZShrLFIsbGUsSSxVKXt2YXIgdGU9dHlwZW9mIGs7KHRlPT09InVuZGVmaW5lZCJ8fHRlPT09ImJvb2xlYW4iKSYmKGs9bnVsbCk7dmFyIHVlPSExO2lmKGs9PT1udWxsKXVlPSEwO2Vsc2Ugc3dpdGNoKHRlKXtjYXNlInN0cmluZyI6Y2FzZSJudW1iZXIiOnVlPSEwO2JyZWFrO2Nhc2Uib2JqZWN0Ijpzd2l0Y2goay4kJHR5cGVvZil7Y2FzZSBuOmNhc2UgYTp1ZT0hMH19aWYodWUpcmV0dXJuIHVlPWssVT1VKHVlKSxrPUk9PT0iIj8iLiIrX2UodWUsMCk6SSxoZShVKT8obGU9IiIsayE9bnVsbCYmKGxlPWsucmVwbGFjZShPZSwiJCYvIikrIi8iKSxLZShVLFIsbGUsIiIsZnVuY3Rpb24ocSl7cmV0dXJuIHF9KSk6VSE9bnVsbCYmKHplKFUpJiYoVT1EZShVLGxlKyghVS5rZXl8fHVlJiZ1ZS5rZXk9PT1VLmtleT8iIjooIiIrVS5rZXkpLnJlcGxhY2UoT2UsIiQmLyIpKyIvIikraykpLFIucHVzaChVKSksMTtpZih1ZT0wLEk9ST09PSIiPyIuIjpJKyI6IixoZShrKSlmb3IodmFyIFY9MDtWPGsubGVuZ3RoO1YrKyl7dGU9a1tWXTt2YXIgcGU9SStfZSh0ZSxWKTt1ZSs9S2UodGUsUixsZSxwZSxVKX1lbHNlIGlmKHBlPVQoayksdHlwZW9mIHBlPT0iZnVuY3Rpb24iKWZvcihrPXBlLmNhbGwoayksVj0wOyEodGU9ay5uZXh0KCkpLmRvbmU7KXRlPXRlLnZhbHVlLHBlPUkrX2UodGUsVisrKSx1ZSs9S2UodGUsUixsZSxwZSxVKTtlbHNlIGlmKHRlPT09Im9iamVjdCIpdGhyb3cgUj1TdHJpbmcoayksRXJyb3IoIk9iamVjdHMgYXJlIG5vdCB2YWxpZCBhcyBhIFJlYWN0IGNoaWxkIChmb3VuZDogIisoUj09PSJbb2JqZWN0IE9iamVjdF0iPyJvYmplY3Qgd2l0aCBrZXlzIHsiK09iamVjdC5rZXlzKGspLmpvaW4oIiwgIikrIn0iOlIpKyIpLiBJZiB5b3UgbWVhbnQgdG8gcmVuZGVyIGEgY29sbGVjdGlvbiBvZiBjaGlsZHJlbiwgdXNlIGFuIGFycmF5IGluc3RlYWQuIik7cmV0dXJuIHVlfWZ1bmN0aW9uIEZlKGssUixsZSl7aWYoaz09bnVsbClyZXR1cm4gazt2YXIgST1bXSxVPTA7cmV0dXJuIEtlKGssSSwiIiwiIixmdW5jdGlvbih0ZSl7cmV0dXJuIFIuY2FsbChsZSx0ZSxVKyspfSksSX1mdW5jdGlvbiB3ZShrKXtpZihrLl9zdGF0dXM9PT0tMSl7dmFyIFI9ay5fcmVzdWx0O1I9UigpLFIudGhlbihmdW5jdGlvbihsZSl7KGsuX3N0YXR1cz09PTB8fGsuX3N0YXR1cz09PS0xKSYmKGsuX3N0YXR1cz0xLGsuX3Jlc3VsdD1sZSl9LGZ1bmN0aW9uKGxlKXsoay5fc3RhdHVzPT09MHx8ay5fc3RhdHVzPT09LTEpJiYoay5fc3RhdHVzPTIsay5fcmVzdWx0PWxlKX0pLGsuX3N0YXR1cz09PS0xJiYoay5fc3RhdHVzPTAsay5fcmVzdWx0PVIpfWlmKGsuX3N0YXR1cz09PTEpcmV0dXJuIGsuX3Jlc3VsdC5kZWZhdWx0O3Rocm93IGsuX3Jlc3VsdH12YXIgaWU9e2N1cnJlbnQ6bnVsbH0sUD17dHJhbnNpdGlvbjpudWxsfSxLPXtSZWFjdEN1cnJlbnREaXNwYXRjaGVyOmllLFJlYWN0Q3VycmVudEJhdGNoQ29uZmlnOlAsUmVhY3RDdXJyZW50T3duZXI6UmV9O2Z1bmN0aW9uIF8oKXt0aHJvdyBFcnJvcigiYWN0KC4uLikgaXMgbm90IHN1cHBvcnRlZCBpbiBwcm9kdWN0aW9uIGJ1aWxkcyBvZiBSZWFjdC4iKX1yZXR1cm4gQ2UuQ2hpbGRyZW49e21hcDpGZSxmb3JFYWNoOmZ1bmN0aW9uKGssUixsZSl7RmUoayxmdW5jdGlvbigpe1IuYXBwbHkodGhpcyxhcmd1bWVudHMpfSxsZSl9LGNvdW50OmZ1bmN0aW9uKGspe3ZhciBSPTA7cmV0dXJuIEZlKGssZnVuY3Rpb24oKXtSKyt9KSxSfSx0b0FycmF5OmZ1bmN0aW9uKGspe3JldHVybiBGZShrLGZ1bmN0aW9uKFIpe3JldHVybiBSfSl8fFtdfSxvbmx5OmZ1bmN0aW9uKGspe2lmKCF6ZShrKSl0aHJvdyBFcnJvcigiUmVhY3QuQ2hpbGRyZW4ub25seSBleHBlY3RlZCB0byByZWNlaXZlIGEgc2luZ2xlIFJlYWN0IGVsZW1lbnQgY2hpbGQuIik7cmV0dXJuIGt9fSxDZS5Db21wb25lbnQ9JCxDZS5GcmFnbWVudD1pLENlLlByb2ZpbGVyPWgsQ2UuUHVyZUNvbXBvbmVudD1kZSxDZS5TdHJpY3RNb2RlPWMsQ2UuU3VzcGVuc2U9ZyxDZS5fX1NFQ1JFVF9JTlRFUk5BTFNfRE9fTk9UX1VTRV9PUl9ZT1VfV0lMTF9CRV9GSVJFRD1LLENlLmFjdD1fLENlLmNsb25lRWxlbWVudD1mdW5jdGlvbihrLFIsbGUpe2lmKGs9PW51bGwpdGhyb3cgRXJyb3IoIlJlYWN0LmNsb25lRWxlbWVudCguLi4pOiBUaGUgYXJndW1lbnQgbXVzdCBiZSBhIFJlYWN0IGVsZW1lbnQsIGJ1dCB5b3UgcGFzc2VkICIraysiLiIpO3ZhciBJPWVlKHt9LGsucHJvcHMpLFU9ay5rZXksdGU9ay5yZWYsdWU9ay5fb3duZXI7aWYoUiE9bnVsbCl7aWYoUi5yZWYhPT12b2lkIDAmJih0ZT1SLnJlZix1ZT1SZS5jdXJyZW50KSxSLmtleSE9PXZvaWQgMCYmKFU9IiIrUi5rZXkpLGsudHlwZSYmay50eXBlLmRlZmF1bHRQcm9wcyl2YXIgVj1rLnR5cGUuZGVmYXVsdFByb3BzO2ZvcihwZSBpbiBSKVhlLmNhbGwoUixwZSkmJiFFZS5oYXNPd25Qcm9wZXJ0eShwZSkmJihJW3BlXT1SW3BlXT09PXZvaWQgMCYmViE9PXZvaWQgMD9WW3BlXTpSW3BlXSl9dmFyIHBlPWFyZ3VtZW50cy5sZW5ndGgtMjtpZihwZT09PTEpSS5jaGlsZHJlbj1sZTtlbHNlIGlmKDE8cGUpe1Y9QXJyYXkocGUpO2Zvcih2YXIgcT0wO3E8cGU7cSsrKVZbcV09YXJndW1lbnRzW3ErMl07SS5jaGlsZHJlbj1WfXJldHVybnskJHR5cGVvZjpuLHR5cGU6ay50eXBlLGtleTpVLHJlZjp0ZSxwcm9wczpJLF9vd25lcjp1ZX19LENlLmNyZWF0ZUNvbnRleHQ9ZnVuY3Rpb24oayl7cmV0dXJuIGs9eyQkdHlwZW9mOm0sX2N1cnJlbnRWYWx1ZTprLF9jdXJyZW50VmFsdWUyOmssX3RocmVhZENvdW50OjAsUHJvdmlkZXI6bnVsbCxDb25zdW1lcjpudWxsLF9kZWZhdWx0VmFsdWU6bnVsbCxfZ2xvYmFsTmFtZTpudWxsfSxrLlByb3ZpZGVyPXskJHR5cGVvZjpwLF9jb250ZXh0Omt9LGsuQ29uc3VtZXI9a30sQ2UuY3JlYXRlRWxlbWVudD0kZSxDZS5jcmVhdGVGYWN0b3J5PWZ1bmN0aW9uKGspe3ZhciBSPSRlLmJpbmQobnVsbCxrKTtyZXR1cm4gUi50eXBlPWssUn0sQ2UuY3JlYXRlUmVmPWZ1bmN0aW9uKCl7cmV0dXJue2N1cnJlbnQ6bnVsbH19LENlLmZvcndhcmRSZWY9ZnVuY3Rpb24oayl7cmV0dXJueyQkdHlwZW9mOmYscmVuZGVyOmt9fSxDZS5pc1ZhbGlkRWxlbWVudD16ZSxDZS5sYXp5PWZ1bmN0aW9uKGspe3JldHVybnskJHR5cGVvZjp4LF9wYXlsb2FkOntfc3RhdHVzOi0xLF9yZXN1bHQ6a30sX2luaXQ6d2V9fSxDZS5tZW1vPWZ1bmN0aW9uKGssUil7cmV0dXJueyQkdHlwZW9mOnYsdHlwZTprLGNvbXBhcmU6Uj09PXZvaWQgMD9udWxsOlJ9fSxDZS5zdGFydFRyYW5zaXRpb249ZnVuY3Rpb24oayl7dmFyIFI9UC50cmFuc2l0aW9uO1AudHJhbnNpdGlvbj17fTt0cnl7aygpfWZpbmFsbHl7UC50cmFuc2l0aW9uPVJ9fSxDZS51bnN0YWJsZV9hY3Q9XyxDZS51c2VDYWxsYmFjaz1mdW5jdGlvbihrLFIpe3JldHVybiBpZS5jdXJyZW50LnVzZUNhbGxiYWNrKGssUil9LENlLnVzZUNvbnRleHQ9ZnVuY3Rpb24oayl7cmV0dXJuIGllLmN1cnJlbnQudXNlQ29udGV4dChrKX0sQ2UudXNlRGVidWdWYWx1ZT1mdW5jdGlvbigpe30sQ2UudXNlRGVmZXJyZWRWYWx1ZT1mdW5jdGlvbihrKXtyZXR1cm4gaWUuY3VycmVudC51c2VEZWZlcnJlZFZhbHVlKGspfSxDZS51c2VFZmZlY3Q9ZnVuY3Rpb24oayxSKXtyZXR1cm4gaWUuY3VycmVudC51c2VFZmZlY3QoayxSKX0sQ2UudXNlSWQ9ZnVuY3Rpb24oKXtyZXR1cm4gaWUuY3VycmVudC51c2VJZCgpfSxDZS51c2VJbXBlcmF0aXZlSGFuZGxlPWZ1bmN0aW9uKGssUixsZSl7cmV0dXJuIGllLmN1cnJlbnQudXNlSW1wZXJhdGl2ZUhhbmRsZShrLFIsbGUpfSxDZS51c2VJbnNlcnRpb25FZmZlY3Q9ZnVuY3Rpb24oayxSKXtyZXR1cm4gaWUuY3VycmVudC51c2VJbnNlcnRpb25FZmZlY3QoayxSKX0sQ2UudXNlTGF5b3V0RWZmZWN0PWZ1bmN0aW9uKGssUil7cmV0dXJuIGllLmN1cnJlbnQudXNlTGF5b3V0RWZmZWN0KGssUil9LENlLnVzZU1lbW89ZnVuY3Rpb24oayxSKXtyZXR1cm4gaWUuY3VycmVudC51c2VNZW1vKGssUil9LENlLnVzZVJlZHVjZXI9ZnVuY3Rpb24oayxSLGxlKXtyZXR1cm4gaWUuY3VycmVudC51c2VSZWR1Y2VyKGssUixsZSl9LENlLnVzZVJlZj1mdW5jdGlvbihrKXtyZXR1cm4gaWUuY3VycmVudC51c2VSZWYoayl9LENlLnVzZVN0YXRlPWZ1bmN0aW9uKGspe3JldHVybiBpZS5jdXJyZW50LnVzZVN0YXRlKGspfSxDZS51c2VTeW5jRXh0ZXJuYWxTdG9yZT1mdW5jdGlvbihrLFIsbGUpe3JldHVybiBpZS5jdXJyZW50LnVzZVN5bmNFeHRlcm5hbFN0b3JlKGssUixsZSl9LENlLnVzZVRyYW5zaXRpb249ZnVuY3Rpb24oKXtyZXR1cm4gaWUuY3VycmVudC51c2VUcmFuc2l0aW9uKCl9LENlLnZlcnNpb249IjE4LjMuMSIsQ2V9dmFyIHRmO2Z1bmN0aW9uIG9vKCl7cmV0dXJuIHRmfHwodGY9MSxCaS5leHBvcnRzPXNwKCkpLEJpLmV4cG9ydHN9LyoqCiAqIEBsaWNlbnNlIFJlYWN0CiAqIHJlYWN0LWpzeC1ydW50aW1lLnByb2R1Y3Rpb24ubWluLmpzCiAqCiAqIENvcHlyaWdodCAoYykgRmFjZWJvb2ssIEluYy4gYW5kIGl0cyBhZmZpbGlhdGVzLgogKgogKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSBmb3VuZCBpbiB0aGUKICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLgogKi92YXIgbmY7ZnVuY3Rpb24gYXAoKXtpZihuZilyZXR1cm4geGw7bmY9MTt2YXIgbj1vbygpLGE9U3ltYm9sLmZvcigicmVhY3QuZWxlbWVudCIpLGk9U3ltYm9sLmZvcigicmVhY3QuZnJhZ21lbnQiKSxjPU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksaD1uLl9fU0VDUkVUX0lOVEVSTkFMU19ET19OT1RfVVNFX09SX1lPVV9XSUxMX0JFX0ZJUkVELlJlYWN0Q3VycmVudE93bmVyLHA9e2tleTohMCxyZWY6ITAsX19zZWxmOiEwLF9fc291cmNlOiEwfTtmdW5jdGlvbiBtKGYsZyx2KXt2YXIgeCxiPXt9LFQ9bnVsbCxBPW51bGw7diE9PXZvaWQgMCYmKFQ9IiIrdiksZy5rZXkhPT12b2lkIDAmJihUPSIiK2cua2V5KSxnLnJlZiE9PXZvaWQgMCYmKEE9Zy5yZWYpO2Zvcih4IGluIGcpYy5jYWxsKGcseCkmJiFwLmhhc093blByb3BlcnR5KHgpJiYoYlt4XT1nW3hdKTtpZihmJiZmLmRlZmF1bHRQcm9wcylmb3IoeCBpbiBnPWYuZGVmYXVsdFByb3BzLGcpYlt4XT09PXZvaWQgMCYmKGJbeF09Z1t4XSk7cmV0dXJueyQkdHlwZW9mOmEsdHlwZTpmLGtleTpULHJlZjpBLHByb3BzOmIsX293bmVyOmguY3VycmVudH19cmV0dXJuIHhsLkZyYWdtZW50PWkseGwuanN4PW0seGwuanN4cz1tLHhsfXZhciByZjtmdW5jdGlvbiBpcCgpe3JldHVybiByZnx8KHJmPTEsRmkuZXhwb3J0cz1hcCgpKSxGaS5leHBvcnRzfXZhciBzPWlwKCksJHM9e30sJGk9e2V4cG9ydHM6e319LFR0PXt9LFdpPXtleHBvcnRzOnt9fSxVaT17fTsvKioKICogQGxpY2Vuc2UgUmVhY3QKICogc2NoZWR1bGVyLnByb2R1Y3Rpb24ubWluLmpzCiAqCiAqIENvcHlyaWdodCAoYykgRmFjZWJvb2ssIEluYy4gYW5kIGl0cyBhZmZpbGlhdGVzLgogKgogKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSBmb3VuZCBpbiB0aGUKICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLgogKi92YXIgbGY7ZnVuY3Rpb24gb3AoKXtyZXR1cm4gbGZ8fChsZj0xLChmdW5jdGlvbihuKXtmdW5jdGlvbiBhKFAsSyl7dmFyIF89UC5sZW5ndGg7UC5wdXNoKEspO2U6Zm9yKDswPF87KXt2YXIgaz1fLTE+Pj4xLFI9UFtrXTtpZigwPGgoUixLKSlQW2tdPUssUFtfXT1SLF89aztlbHNlIGJyZWFrIGV9fWZ1bmN0aW9uIGkoUCl7cmV0dXJuIFAubGVuZ3RoPT09MD9udWxsOlBbMF19ZnVuY3Rpb24gYyhQKXtpZihQLmxlbmd0aD09PTApcmV0dXJuIG51bGw7dmFyIEs9UFswXSxfPVAucG9wKCk7aWYoXyE9PUspe1BbMF09XztlOmZvcih2YXIgaz0wLFI9UC5sZW5ndGgsbGU9Uj4+PjE7azxsZTspe3ZhciBJPTIqKGsrMSktMSxVPVBbSV0sdGU9SSsxLHVlPVBbdGVdO2lmKDA+aChVLF8pKXRlPFImJjA+aCh1ZSxVKT8oUFtrXT11ZSxQW3RlXT1fLGs9dGUpOihQW2tdPVUsUFtJXT1fLGs9SSk7ZWxzZSBpZih0ZTxSJiYwPmgodWUsXykpUFtrXT11ZSxQW3RlXT1fLGs9dGU7ZWxzZSBicmVhayBlfX1yZXR1cm4gS31mdW5jdGlvbiBoKFAsSyl7dmFyIF89UC5zb3J0SW5kZXgtSy5zb3J0SW5kZXg7cmV0dXJuIF8hPT0wP186UC5pZC1LLmlkfWlmKHR5cGVvZiBwZXJmb3JtYW5jZT09Im9iamVjdCImJnR5cGVvZiBwZXJmb3JtYW5jZS5ub3c9PSJmdW5jdGlvbiIpe3ZhciBwPXBlcmZvcm1hbmNlO24udW5zdGFibGVfbm93PWZ1bmN0aW9uKCl7cmV0dXJuIHAubm93KCl9fWVsc2V7dmFyIG09RGF0ZSxmPW0ubm93KCk7bi51bnN0YWJsZV9ub3c9ZnVuY3Rpb24oKXtyZXR1cm4gbS5ub3coKS1mfX12YXIgZz1bXSx2PVtdLHg9MSxiPW51bGwsVD0zLEE9ITEsZWU9ITEscmU9ITEsJD10eXBlb2Ygc2V0VGltZW91dD09ImZ1bmN0aW9uIj9zZXRUaW1lb3V0Om51bGwsZ2U9dHlwZW9mIGNsZWFyVGltZW91dD09ImZ1bmN0aW9uIj9jbGVhclRpbWVvdXQ6bnVsbCxkZT10eXBlb2Ygc2V0SW1tZWRpYXRlPCJ1Ij9zZXRJbW1lZGlhdGU6bnVsbDt0eXBlb2YgbmF2aWdhdG9yPCJ1IiYmbmF2aWdhdG9yLnNjaGVkdWxpbmchPT12b2lkIDAmJm5hdmlnYXRvci5zY2hlZHVsaW5nLmlzSW5wdXRQZW5kaW5nIT09dm9pZCAwJiZuYXZpZ2F0b3Iuc2NoZWR1bGluZy5pc0lucHV0UGVuZGluZy5iaW5kKG5hdmlnYXRvci5zY2hlZHVsaW5nKTtmdW5jdGlvbiBhZShQKXtmb3IodmFyIEs9aSh2KTtLIT09bnVsbDspe2lmKEsuY2FsbGJhY2s9PT1udWxsKWModik7ZWxzZSBpZihLLnN0YXJ0VGltZTw9UCljKHYpLEsuc29ydEluZGV4PUsuZXhwaXJhdGlvblRpbWUsYShnLEspO2Vsc2UgYnJlYWs7Sz1pKHYpfX1mdW5jdGlvbiBoZShQKXtpZihyZT0hMSxhZShQKSwhZWUpaWYoaShnKSE9PW51bGwpZWU9ITAsd2UoWGUpO2Vsc2V7dmFyIEs9aSh2KTtLIT09bnVsbCYmaWUoaGUsSy5zdGFydFRpbWUtUCl9fWZ1bmN0aW9uIFhlKFAsSyl7ZWU9ITEscmUmJihyZT0hMSxnZSgkZSksJGU9LTEpLEE9ITA7dmFyIF89VDt0cnl7Zm9yKGFlKEspLGI9aShnKTtiIT09bnVsbCYmKCEoYi5leHBpcmF0aW9uVGltZT5LKXx8UCYmIUhlKCkpOyl7dmFyIGs9Yi5jYWxsYmFjaztpZih0eXBlb2Ygaz09ImZ1bmN0aW9uIil7Yi5jYWxsYmFjaz1udWxsLFQ9Yi5wcmlvcml0eUxldmVsO3ZhciBSPWsoYi5leHBpcmF0aW9uVGltZTw9Syk7Sz1uLnVuc3RhYmxlX25vdygpLHR5cGVvZiBSPT0iZnVuY3Rpb24iP2IuY2FsbGJhY2s9UjpiPT09aShnKSYmYyhnKSxhZShLKX1lbHNlIGMoZyk7Yj1pKGcpfWlmKGIhPT1udWxsKXZhciBsZT0hMDtlbHNle3ZhciBJPWkodik7SSE9PW51bGwmJmllKGhlLEkuc3RhcnRUaW1lLUspLGxlPSExfXJldHVybiBsZX1maW5hbGx5e2I9bnVsbCxUPV8sQT0hMX19dmFyIFJlPSExLEVlPW51bGwsJGU9LTEsRGU9NSx6ZT0tMTtmdW5jdGlvbiBIZSgpe3JldHVybiEobi51bnN0YWJsZV9ub3coKS16ZTxEZSl9ZnVuY3Rpb24gT2UoKXtpZihFZSE9PW51bGwpe3ZhciBQPW4udW5zdGFibGVfbm93KCk7emU9UDt2YXIgSz0hMDt0cnl7Sz1FZSghMCxQKX1maW5hbGx5e0s/X2UoKTooUmU9ITEsRWU9bnVsbCl9fWVsc2UgUmU9ITF9dmFyIF9lO2lmKHR5cGVvZiBkZT09ImZ1bmN0aW9uIilfZT1mdW5jdGlvbigpe2RlKE9lKX07ZWxzZSBpZih0eXBlb2YgTWVzc2FnZUNoYW5uZWw8InUiKXt2YXIgS2U9bmV3IE1lc3NhZ2VDaGFubmVsLEZlPUtlLnBvcnQyO0tlLnBvcnQxLm9ubWVzc2FnZT1PZSxfZT1mdW5jdGlvbigpe0ZlLnBvc3RNZXNzYWdlKG51bGwpfX1lbHNlIF9lPWZ1bmN0aW9uKCl7JChPZSwwKX07ZnVuY3Rpb24gd2UoUCl7RWU9UCxSZXx8KFJlPSEwLF9lKCkpfWZ1bmN0aW9uIGllKFAsSyl7JGU9JChmdW5jdGlvbigpe1Aobi51bnN0YWJsZV9ub3coKSl9LEspfW4udW5zdGFibGVfSWRsZVByaW9yaXR5PTUsbi51bnN0YWJsZV9JbW1lZGlhdGVQcmlvcml0eT0xLG4udW5zdGFibGVfTG93UHJpb3JpdHk9NCxuLnVuc3RhYmxlX05vcm1hbFByaW9yaXR5PTMsbi51bnN0YWJsZV9Qcm9maWxpbmc9bnVsbCxuLnVuc3RhYmxlX1VzZXJCbG9ja2luZ1ByaW9yaXR5PTIsbi51bnN0YWJsZV9jYW5jZWxDYWxsYmFjaz1mdW5jdGlvbihQKXtQLmNhbGxiYWNrPW51bGx9LG4udW5zdGFibGVfY29udGludWVFeGVjdXRpb249ZnVuY3Rpb24oKXtlZXx8QXx8KGVlPSEwLHdlKFhlKSl9LG4udW5zdGFibGVfZm9yY2VGcmFtZVJhdGU9ZnVuY3Rpb24oUCl7MD5QfHwxMjU8UD9jb25zb2xlLmVycm9yKCJmb3JjZUZyYW1lUmF0ZSB0YWtlcyBhIHBvc2l0aXZlIGludCBiZXR3ZWVuIDAgYW5kIDEyNSwgZm9yY2luZyBmcmFtZSByYXRlcyBoaWdoZXIgdGhhbiAxMjUgZnBzIGlzIG5vdCBzdXBwb3J0ZWQiKTpEZT0wPFA/TWF0aC5mbG9vcigxZTMvUCk6NX0sbi51bnN0YWJsZV9nZXRDdXJyZW50UHJpb3JpdHlMZXZlbD1mdW5jdGlvbigpe3JldHVybiBUfSxuLnVuc3RhYmxlX2dldEZpcnN0Q2FsbGJhY2tOb2RlPWZ1bmN0aW9uKCl7cmV0dXJuIGkoZyl9LG4udW5zdGFibGVfbmV4dD1mdW5jdGlvbihQKXtzd2l0Y2goVCl7Y2FzZSAxOmNhc2UgMjpjYXNlIDM6dmFyIEs9MzticmVhaztkZWZhdWx0Oks9VH12YXIgXz1UO1Q9Szt0cnl7cmV0dXJuIFAoKX1maW5hbGx5e1Q9X319LG4udW5zdGFibGVfcGF1c2VFeGVjdXRpb249ZnVuY3Rpb24oKXt9LG4udW5zdGFibGVfcmVxdWVzdFBhaW50PWZ1bmN0aW9uKCl7fSxuLnVuc3RhYmxlX3J1bldpdGhQcmlvcml0eT1mdW5jdGlvbihQLEspe3N3aXRjaChQKXtjYXNlIDE6Y2FzZSAyOmNhc2UgMzpjYXNlIDQ6Y2FzZSA1OmJyZWFrO2RlZmF1bHQ6UD0zfXZhciBfPVQ7VD1QO3RyeXtyZXR1cm4gSygpfWZpbmFsbHl7VD1ffX0sbi51bnN0YWJsZV9zY2hlZHVsZUNhbGxiYWNrPWZ1bmN0aW9uKFAsSyxfKXt2YXIgaz1uLnVuc3RhYmxlX25vdygpO3N3aXRjaCh0eXBlb2YgXz09Im9iamVjdCImJl8hPT1udWxsPyhfPV8uZGVsYXksXz10eXBlb2YgXz09Im51bWJlciImJjA8Xz9rK186ayk6Xz1rLFApe2Nhc2UgMTp2YXIgUj0tMTticmVhaztjYXNlIDI6Uj0yNTA7YnJlYWs7Y2FzZSA1OlI9MTA3Mzc0MTgyMzticmVhaztjYXNlIDQ6Uj0xZTQ7YnJlYWs7ZGVmYXVsdDpSPTVlM31yZXR1cm4gUj1fK1IsUD17aWQ6eCsrLGNhbGxiYWNrOksscHJpb3JpdHlMZXZlbDpQLHN0YXJ0VGltZTpfLGV4cGlyYXRpb25UaW1lOlIsc29ydEluZGV4Oi0xfSxfPms/KFAuc29ydEluZGV4PV8sYSh2LFApLGkoZyk9PT1udWxsJiZQPT09aSh2KSYmKHJlPyhnZSgkZSksJGU9LTEpOnJlPSEwLGllKGhlLF8taykpKTooUC5zb3J0SW5kZXg9UixhKGcsUCksZWV8fEF8fChlZT0hMCx3ZShYZSkpKSxQfSxuLnVuc3RhYmxlX3Nob3VsZFlpZWxkPUhlLG4udW5zdGFibGVfd3JhcENhbGxiYWNrPWZ1bmN0aW9uKFApe3ZhciBLPVQ7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIF89VDtUPUs7dHJ5e3JldHVybiBQLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1maW5hbGx5e1Q9X319fX0pKFVpKSksVWl9dmFyIHNmO2Z1bmN0aW9uIHVwKCl7cmV0dXJuIHNmfHwoc2Y9MSxXaS5leHBvcnRzPW9wKCkpLFdpLmV4cG9ydHN9LyoqCiAqIEBsaWNlbnNlIFJlYWN0CiAqIHJlYWN0LWRvbS5wcm9kdWN0aW9uLm1pbi5qcwogKgogKiBDb3B5cmlnaHQgKGMpIEZhY2Vib29rLCBJbmMuIGFuZCBpdHMgYWZmaWxpYXRlcy4KICoKICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgZm91bmQgaW4gdGhlCiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4KICovdmFyIGFmO2Z1bmN0aW9uIGNwKCl7aWYoYWYpcmV0dXJuIFR0O2FmPTE7dmFyIG49b28oKSxhPXVwKCk7ZnVuY3Rpb24gaShlKXtmb3IodmFyIHQ9Imh0dHBzOi8vcmVhY3Rqcy5vcmcvZG9jcy9lcnJvci1kZWNvZGVyLmh0bWw/aW52YXJpYW50PSIrZSxyPTE7cjxhcmd1bWVudHMubGVuZ3RoO3IrKyl0Kz0iJmFyZ3NbXT0iK2VuY29kZVVSSUNvbXBvbmVudChhcmd1bWVudHNbcl0pO3JldHVybiJNaW5pZmllZCBSZWFjdCBlcnJvciAjIitlKyI7IHZpc2l0ICIrdCsiIGZvciB0aGUgZnVsbCBtZXNzYWdlIG9yIHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCBmb3IgZnVsbCBlcnJvcnMgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4ifXZhciBjPW5ldyBTZXQsaD17fTtmdW5jdGlvbiBwKGUsdCl7bShlLHQpLG0oZSsiQ2FwdHVyZSIsdCl9ZnVuY3Rpb24gbShlLHQpe2ZvcihoW2VdPXQsZT0wO2U8dC5sZW5ndGg7ZSsrKWMuYWRkKHRbZV0pfXZhciBmPSEodHlwZW9mIHdpbmRvdz4idSJ8fHR5cGVvZiB3aW5kb3cuZG9jdW1lbnQ+InUifHx0eXBlb2Ygd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQ+InUiKSxnPU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksdj0vXls6QS1aX2Etelx1MDBDMC1cdTAwRDZcdTAwRDgtXHUwMEY2XHUwMEY4LVx1MDJGRlx1MDM3MC1cdTAzN0RcdTAzN0YtXHUxRkZGXHUyMDBDLVx1MjAwRFx1MjA3MC1cdTIxOEZcdTJDMDAtXHUyRkVGXHUzMDAxLVx1RDdGRlx1RjkwMC1cdUZEQ0ZcdUZERjAtXHVGRkZEXVs6QS1aX2Etelx1MDBDMC1cdTAwRDZcdTAwRDgtXHUwMEY2XHUwMEY4LVx1MDJGRlx1MDM3MC1cdTAzN0RcdTAzN0YtXHUxRkZGXHUyMDBDLVx1MjAwRFx1MjA3MC1cdTIxOEZcdTJDMDAtXHUyRkVGXHUzMDAxLVx1RDdGRlx1RjkwMC1cdUZEQ0ZcdUZERjAtXHVGRkZEXC0uMC05XHUwMEI3XHUwMzAwLVx1MDM2Rlx1MjAzRi1cdTIwNDBdKiQvLHg9e30sYj17fTtmdW5jdGlvbiBUKGUpe3JldHVybiBnLmNhbGwoYixlKT8hMDpnLmNhbGwoeCxlKT8hMTp2LnRlc3QoZSk/YltlXT0hMDooeFtlXT0hMCwhMSl9ZnVuY3Rpb24gQShlLHQscixsKXtpZihyIT09bnVsbCYmci50eXBlPT09MClyZXR1cm4hMTtzd2l0Y2godHlwZW9mIHQpe2Nhc2UiZnVuY3Rpb24iOmNhc2Uic3ltYm9sIjpyZXR1cm4hMDtjYXNlImJvb2xlYW4iOnJldHVybiBsPyExOnIhPT1udWxsPyFyLmFjY2VwdHNCb29sZWFuczooZT1lLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCw1KSxlIT09ImRhdGEtIiYmZSE9PSJhcmlhLSIpO2RlZmF1bHQ6cmV0dXJuITF9fWZ1bmN0aW9uIGVlKGUsdCxyLGwpe2lmKHQ9PT1udWxsfHx0eXBlb2YgdD4idSJ8fEEoZSx0LHIsbCkpcmV0dXJuITA7aWYobClyZXR1cm4hMTtpZihyIT09bnVsbClzd2l0Y2goci50eXBlKXtjYXNlIDM6cmV0dXJuIXQ7Y2FzZSA0OnJldHVybiB0PT09ITE7Y2FzZSA1OnJldHVybiBpc05hTih0KTtjYXNlIDY6cmV0dXJuIGlzTmFOKHQpfHwxPnR9cmV0dXJuITF9ZnVuY3Rpb24gcmUoZSx0LHIsbCxvLHUsZCl7dGhpcy5hY2NlcHRzQm9vbGVhbnM9dD09PTJ8fHQ9PT0zfHx0PT09NCx0aGlzLmF0dHJpYnV0ZU5hbWU9bCx0aGlzLmF0dHJpYnV0ZU5hbWVzcGFjZT1vLHRoaXMubXVzdFVzZVByb3BlcnR5PXIsdGhpcy5wcm9wZXJ0eU5hbWU9ZSx0aGlzLnR5cGU9dCx0aGlzLnNhbml0aXplVVJMPXUsdGhpcy5yZW1vdmVFbXB0eVN0cmluZz1kfXZhciAkPXt9OyJjaGlsZHJlbiBkYW5nZXJvdXNseVNldElubmVySFRNTCBkZWZhdWx0VmFsdWUgZGVmYXVsdENoZWNrZWQgaW5uZXJIVE1MIHN1cHByZXNzQ29udGVudEVkaXRhYmxlV2FybmluZyBzdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmcgc3R5bGUiLnNwbGl0KCIgIikuZm9yRWFjaChmdW5jdGlvbihlKXskW2VdPW5ldyByZShlLDAsITEsZSxudWxsLCExLCExKX0pLFtbImFjY2VwdENoYXJzZXQiLCJhY2NlcHQtY2hhcnNldCJdLFsiY2xhc3NOYW1lIiwiY2xhc3MiXSxbImh0bWxGb3IiLCJmb3IiXSxbImh0dHBFcXVpdiIsImh0dHAtZXF1aXYiXV0uZm9yRWFjaChmdW5jdGlvbihlKXt2YXIgdD1lWzBdOyRbdF09bmV3IHJlKHQsMSwhMSxlWzFdLG51bGwsITEsITEpfSksWyJjb250ZW50RWRpdGFibGUiLCJkcmFnZ2FibGUiLCJzcGVsbENoZWNrIiwidmFsdWUiXS5mb3JFYWNoKGZ1bmN0aW9uKGUpeyRbZV09bmV3IHJlKGUsMiwhMSxlLnRvTG93ZXJDYXNlKCksbnVsbCwhMSwhMSl9KSxbImF1dG9SZXZlcnNlIiwiZXh0ZXJuYWxSZXNvdXJjZXNSZXF1aXJlZCIsImZvY3VzYWJsZSIsInByZXNlcnZlQWxwaGEiXS5mb3JFYWNoKGZ1bmN0aW9uKGUpeyRbZV09bmV3IHJlKGUsMiwhMSxlLG51bGwsITEsITEpfSksImFsbG93RnVsbFNjcmVlbiBhc3luYyBhdXRvRm9jdXMgYXV0b1BsYXkgY29udHJvbHMgZGVmYXVsdCBkZWZlciBkaXNhYmxlZCBkaXNhYmxlUGljdHVyZUluUGljdHVyZSBkaXNhYmxlUmVtb3RlUGxheWJhY2sgZm9ybU5vVmFsaWRhdGUgaGlkZGVuIGxvb3Agbm9Nb2R1bGUgbm9WYWxpZGF0ZSBvcGVuIHBsYXlzSW5saW5lIHJlYWRPbmx5IHJlcXVpcmVkIHJldmVyc2VkIHNjb3BlZCBzZWFtbGVzcyBpdGVtU2NvcGUiLnNwbGl0KCIgIikuZm9yRWFjaChmdW5jdGlvbihlKXskW2VdPW5ldyByZShlLDMsITEsZS50b0xvd2VyQ2FzZSgpLG51bGwsITEsITEpfSksWyJjaGVja2VkIiwibXVsdGlwbGUiLCJtdXRlZCIsInNlbGVjdGVkIl0uZm9yRWFjaChmdW5jdGlvbihlKXskW2VdPW5ldyByZShlLDMsITAsZSxudWxsLCExLCExKX0pLFsiY2FwdHVyZSIsImRvd25sb2FkIl0uZm9yRWFjaChmdW5jdGlvbihlKXskW2VdPW5ldyByZShlLDQsITEsZSxudWxsLCExLCExKX0pLFsiY29scyIsInJvd3MiLCJzaXplIiwic3BhbiJdLmZvckVhY2goZnVuY3Rpb24oZSl7JFtlXT1uZXcgcmUoZSw2LCExLGUsbnVsbCwhMSwhMSl9KSxbInJvd1NwYW4iLCJzdGFydCJdLmZvckVhY2goZnVuY3Rpb24oZSl7JFtlXT1uZXcgcmUoZSw1LCExLGUudG9Mb3dlckNhc2UoKSxudWxsLCExLCExKX0pO3ZhciBnZT0vW1wtOl0oW2Etel0pL2c7ZnVuY3Rpb24gZGUoZSl7cmV0dXJuIGVbMV0udG9VcHBlckNhc2UoKX0iYWNjZW50LWhlaWdodCBhbGlnbm1lbnQtYmFzZWxpbmUgYXJhYmljLWZvcm0gYmFzZWxpbmUtc2hpZnQgY2FwLWhlaWdodCBjbGlwLXBhdGggY2xpcC1ydWxlIGNvbG9yLWludGVycG9sYXRpb24gY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzIGNvbG9yLXByb2ZpbGUgY29sb3ItcmVuZGVyaW5nIGRvbWluYW50LWJhc2VsaW5lIGVuYWJsZS1iYWNrZ3JvdW5kIGZpbGwtb3BhY2l0eSBmaWxsLXJ1bGUgZmxvb2QtY29sb3IgZmxvb2Qtb3BhY2l0eSBmb250LWZhbWlseSBmb250LXNpemUgZm9udC1zaXplLWFkanVzdCBmb250LXN0cmV0Y2ggZm9udC1zdHlsZSBmb250LXZhcmlhbnQgZm9udC13ZWlnaHQgZ2x5cGgtbmFtZSBnbHlwaC1vcmllbnRhdGlvbi1ob3Jpem9udGFsIGdseXBoLW9yaWVudGF0aW9uLXZlcnRpY2FsIGhvcml6LWFkdi14IGhvcml6LW9yaWdpbi14IGltYWdlLXJlbmRlcmluZyBsZXR0ZXItc3BhY2luZyBsaWdodGluZy1jb2xvciBtYXJrZXItZW5kIG1hcmtlci1taWQgbWFya2VyLXN0YXJ0IG92ZXJsaW5lLXBvc2l0aW9uIG92ZXJsaW5lLXRoaWNrbmVzcyBwYWludC1vcmRlciBwYW5vc2UtMSBwb2ludGVyLWV2ZW50cyByZW5kZXJpbmctaW50ZW50IHNoYXBlLXJlbmRlcmluZyBzdG9wLWNvbG9yIHN0b3Atb3BhY2l0eSBzdHJpa2V0aHJvdWdoLXBvc2l0aW9uIHN0cmlrZXRocm91Z2gtdGhpY2tuZXNzIHN0cm9rZS1kYXNoYXJyYXkgc3Ryb2tlLWRhc2hvZmZzZXQgc3Ryb2tlLWxpbmVjYXAgc3Ryb2tlLWxpbmVqb2luIHN0cm9rZS1taXRlcmxpbWl0IHN0cm9rZS1vcGFjaXR5IHN0cm9rZS13aWR0aCB0ZXh0LWFuY2hvciB0ZXh0LWRlY29yYXRpb24gdGV4dC1yZW5kZXJpbmcgdW5kZXJsaW5lLXBvc2l0aW9uIHVuZGVybGluZS10aGlja25lc3MgdW5pY29kZS1iaWRpIHVuaWNvZGUtcmFuZ2UgdW5pdHMtcGVyLWVtIHYtYWxwaGFiZXRpYyB2LWhhbmdpbmcgdi1pZGVvZ3JhcGhpYyB2LW1hdGhlbWF0aWNhbCB2ZWN0b3ItZWZmZWN0IHZlcnQtYWR2LXkgdmVydC1vcmlnaW4teCB2ZXJ0LW9yaWdpbi15IHdvcmQtc3BhY2luZyB3cml0aW5nLW1vZGUgeG1sbnM6eGxpbmsgeC1oZWlnaHQiLnNwbGl0KCIgIikuZm9yRWFjaChmdW5jdGlvbihlKXt2YXIgdD1lLnJlcGxhY2UoZ2UsZGUpOyRbdF09bmV3IHJlKHQsMSwhMSxlLG51bGwsITEsITEpfSksInhsaW5rOmFjdHVhdGUgeGxpbms6YXJjcm9sZSB4bGluazpyb2xlIHhsaW5rOnNob3cgeGxpbms6dGl0bGUgeGxpbms6dHlwZSIuc3BsaXQoIiAiKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3ZhciB0PWUucmVwbGFjZShnZSxkZSk7JFt0XT1uZXcgcmUodCwxLCExLGUsImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiLCExLCExKX0pLFsieG1sOmJhc2UiLCJ4bWw6bGFuZyIsInhtbDpzcGFjZSJdLmZvckVhY2goZnVuY3Rpb24oZSl7dmFyIHQ9ZS5yZXBsYWNlKGdlLGRlKTskW3RdPW5ldyByZSh0LDEsITEsZSwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlIiwhMSwhMSl9KSxbInRhYkluZGV4IiwiY3Jvc3NPcmlnaW4iXS5mb3JFYWNoKGZ1bmN0aW9uKGUpeyRbZV09bmV3IHJlKGUsMSwhMSxlLnRvTG93ZXJDYXNlKCksbnVsbCwhMSwhMSl9KSwkLnhsaW5rSHJlZj1uZXcgcmUoInhsaW5rSHJlZiIsMSwhMSwieGxpbms6aHJlZiIsImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiLCEwLCExKSxbInNyYyIsImhyZWYiLCJhY3Rpb24iLCJmb3JtQWN0aW9uIl0uZm9yRWFjaChmdW5jdGlvbihlKXskW2VdPW5ldyByZShlLDEsITEsZS50b0xvd2VyQ2FzZSgpLG51bGwsITAsITApfSk7ZnVuY3Rpb24gYWUoZSx0LHIsbCl7dmFyIG89JC5oYXNPd25Qcm9wZXJ0eSh0KT8kW3RdOm51bGw7KG8hPT1udWxsP28udHlwZSE9PTA6bHx8ISgyPHQubGVuZ3RoKXx8dFswXSE9PSJvIiYmdFswXSE9PSJPInx8dFsxXSE9PSJuIiYmdFsxXSE9PSJOIikmJihlZSh0LHIsbyxsKSYmKHI9bnVsbCksbHx8bz09PW51bGw/VCh0KSYmKHI9PT1udWxsP2UucmVtb3ZlQXR0cmlidXRlKHQpOmUuc2V0QXR0cmlidXRlKHQsIiIrcikpOm8ubXVzdFVzZVByb3BlcnR5P2Vbby5wcm9wZXJ0eU5hbWVdPXI9PT1udWxsP28udHlwZT09PTM/ITE6IiI6cjoodD1vLmF0dHJpYnV0ZU5hbWUsbD1vLmF0dHJpYnV0ZU5hbWVzcGFjZSxyPT09bnVsbD9lLnJlbW92ZUF0dHJpYnV0ZSh0KToobz1vLnR5cGUscj1vPT09M3x8bz09PTQmJnI9PT0hMD8iIjoiIityLGw/ZS5zZXRBdHRyaWJ1dGVOUyhsLHQscik6ZS5zZXRBdHRyaWJ1dGUodCxyKSkpKX12YXIgaGU9bi5fX1NFQ1JFVF9JTlRFUk5BTFNfRE9fTk9UX1VTRV9PUl9ZT1VfV0lMTF9CRV9GSVJFRCxYZT1TeW1ib2wuZm9yKCJyZWFjdC5lbGVtZW50IiksUmU9U3ltYm9sLmZvcigicmVhY3QucG9ydGFsIiksRWU9U3ltYm9sLmZvcigicmVhY3QuZnJhZ21lbnQiKSwkZT1TeW1ib2wuZm9yKCJyZWFjdC5zdHJpY3RfbW9kZSIpLERlPVN5bWJvbC5mb3IoInJlYWN0LnByb2ZpbGVyIiksemU9U3ltYm9sLmZvcigicmVhY3QucHJvdmlkZXIiKSxIZT1TeW1ib2wuZm9yKCJyZWFjdC5jb250ZXh0IiksT2U9U3ltYm9sLmZvcigicmVhY3QuZm9yd2FyZF9yZWYiKSxfZT1TeW1ib2wuZm9yKCJyZWFjdC5zdXNwZW5zZSIpLEtlPVN5bWJvbC5mb3IoInJlYWN0LnN1c3BlbnNlX2xpc3QiKSxGZT1TeW1ib2wuZm9yKCJyZWFjdC5tZW1vIiksd2U9U3ltYm9sLmZvcigicmVhY3QubGF6eSIpLGllPVN5bWJvbC5mb3IoInJlYWN0Lm9mZnNjcmVlbiIpLFA9U3ltYm9sLml0ZXJhdG9yO2Z1bmN0aW9uIEsoZSl7cmV0dXJuIGU9PT1udWxsfHx0eXBlb2YgZSE9Im9iamVjdCI/bnVsbDooZT1QJiZlW1BdfHxlWyJAQGl0ZXJhdG9yIl0sdHlwZW9mIGU9PSJmdW5jdGlvbiI/ZTpudWxsKX12YXIgXz1PYmplY3QuYXNzaWduLGs7ZnVuY3Rpb24gUihlKXtpZihrPT09dm9pZCAwKXRyeXt0aHJvdyBFcnJvcigpfWNhdGNoKHIpe3ZhciB0PXIuc3RhY2sudHJpbSgpLm1hdGNoKC9cbiggKihhdCApPykvKTtrPXQmJnRbMV18fCIifXJldHVybmAKYCtrK2V9dmFyIGxlPSExO2Z1bmN0aW9uIEkoZSx0KXtpZighZXx8bGUpcmV0dXJuIiI7bGU9ITA7dmFyIHI9RXJyb3IucHJlcGFyZVN0YWNrVHJhY2U7RXJyb3IucHJlcGFyZVN0YWNrVHJhY2U9dm9pZCAwO3RyeXtpZih0KWlmKHQ9ZnVuY3Rpb24oKXt0aHJvdyBFcnJvcigpfSxPYmplY3QuZGVmaW5lUHJvcGVydHkodC5wcm90b3R5cGUsInByb3BzIix7c2V0OmZ1bmN0aW9uKCl7dGhyb3cgRXJyb3IoKX19KSx0eXBlb2YgUmVmbGVjdD09Im9iamVjdCImJlJlZmxlY3QuY29uc3RydWN0KXt0cnl7UmVmbGVjdC5jb25zdHJ1Y3QodCxbXSl9Y2F0Y2goTSl7dmFyIGw9TX1SZWZsZWN0LmNvbnN0cnVjdChlLFtdLHQpfWVsc2V7dHJ5e3QuY2FsbCgpfWNhdGNoKE0pe2w9TX1lLmNhbGwodC5wcm90b3R5cGUpfWVsc2V7dHJ5e3Rocm93IEVycm9yKCl9Y2F0Y2goTSl7bD1NfWUoKX19Y2F0Y2goTSl7aWYoTSYmbCYmdHlwZW9mIE0uc3RhY2s9PSJzdHJpbmciKXtmb3IodmFyIG89TS5zdGFjay5zcGxpdChgCmApLHU9bC5zdGFjay5zcGxpdChgCmApLGQ9by5sZW5ndGgtMSx5PXUubGVuZ3RoLTE7MTw9ZCYmMDw9eSYmb1tkXSE9PXVbeV07KXktLTtmb3IoOzE8PWQmJjA8PXk7ZC0tLHktLSlpZihvW2RdIT09dVt5XSl7aWYoZCE9PTF8fHkhPT0xKWRvIGlmKGQtLSx5LS0sMD55fHxvW2RdIT09dVt5XSl7dmFyIHc9YApgK29bZF0ucmVwbGFjZSgiIGF0IG5ldyAiLCIgYXQgIik7cmV0dXJuIGUuZGlzcGxheU5hbWUmJncuaW5jbHVkZXMoIjxhbm9ueW1vdXM+IikmJih3PXcucmVwbGFjZSgiPGFub255bW91cz4iLGUuZGlzcGxheU5hbWUpKSx3fXdoaWxlKDE8PWQmJjA8PXkpO2JyZWFrfX19ZmluYWxseXtsZT0hMSxFcnJvci5wcmVwYXJlU3RhY2tUcmFjZT1yfXJldHVybihlPWU/ZS5kaXNwbGF5TmFtZXx8ZS5uYW1lOiIiKT9SKGUpOiIifWZ1bmN0aW9uIFUoZSl7c3dpdGNoKGUudGFnKXtjYXNlIDU6cmV0dXJuIFIoZS50eXBlKTtjYXNlIDE2OnJldHVybiBSKCJMYXp5Iik7Y2FzZSAxMzpyZXR1cm4gUigiU3VzcGVuc2UiKTtjYXNlIDE5OnJldHVybiBSKCJTdXNwZW5zZUxpc3QiKTtjYXNlIDA6Y2FzZSAyOmNhc2UgMTU6cmV0dXJuIGU9SShlLnR5cGUsITEpLGU7Y2FzZSAxMTpyZXR1cm4gZT1JKGUudHlwZS5yZW5kZXIsITEpLGU7Y2FzZSAxOnJldHVybiBlPUkoZS50eXBlLCEwKSxlO2RlZmF1bHQ6cmV0dXJuIiJ9fWZ1bmN0aW9uIHRlKGUpe2lmKGU9PW51bGwpcmV0dXJuIG51bGw7aWYodHlwZW9mIGU9PSJmdW5jdGlvbiIpcmV0dXJuIGUuZGlzcGxheU5hbWV8fGUubmFtZXx8bnVsbDtpZih0eXBlb2YgZT09InN0cmluZyIpcmV0dXJuIGU7c3dpdGNoKGUpe2Nhc2UgRWU6cmV0dXJuIkZyYWdtZW50IjtjYXNlIFJlOnJldHVybiJQb3J0YWwiO2Nhc2UgRGU6cmV0dXJuIlByb2ZpbGVyIjtjYXNlICRlOnJldHVybiJTdHJpY3RNb2RlIjtjYXNlIF9lOnJldHVybiJTdXNwZW5zZSI7Y2FzZSBLZTpyZXR1cm4iU3VzcGVuc2VMaXN0In1pZih0eXBlb2YgZT09Im9iamVjdCIpc3dpdGNoKGUuJCR0eXBlb2Ype2Nhc2UgSGU6cmV0dXJuKGUuZGlzcGxheU5hbWV8fCJDb250ZXh0IikrIi5Db25zdW1lciI7Y2FzZSB6ZTpyZXR1cm4oZS5fY29udGV4dC5kaXNwbGF5TmFtZXx8IkNvbnRleHQiKSsiLlByb3ZpZGVyIjtjYXNlIE9lOnZhciB0PWUucmVuZGVyO3JldHVybiBlPWUuZGlzcGxheU5hbWUsZXx8KGU9dC5kaXNwbGF5TmFtZXx8dC5uYW1lfHwiIixlPWUhPT0iIj8iRm9yd2FyZFJlZigiK2UrIikiOiJGb3J3YXJkUmVmIiksZTtjYXNlIEZlOnJldHVybiB0PWUuZGlzcGxheU5hbWV8fG51bGwsdCE9PW51bGw/dDp0ZShlLnR5cGUpfHwiTWVtbyI7Y2FzZSB3ZTp0PWUuX3BheWxvYWQsZT1lLl9pbml0O3RyeXtyZXR1cm4gdGUoZSh0KSl9Y2F0Y2h7fX1yZXR1cm4gbnVsbH1mdW5jdGlvbiB1ZShlKXt2YXIgdD1lLnR5cGU7c3dpdGNoKGUudGFnKXtjYXNlIDI0OnJldHVybiJDYWNoZSI7Y2FzZSA5OnJldHVybih0LmRpc3BsYXlOYW1lfHwiQ29udGV4dCIpKyIuQ29uc3VtZXIiO2Nhc2UgMTA6cmV0dXJuKHQuX2NvbnRleHQuZGlzcGxheU5hbWV8fCJDb250ZXh0IikrIi5Qcm92aWRlciI7Y2FzZSAxODpyZXR1cm4iRGVoeWRyYXRlZEZyYWdtZW50IjtjYXNlIDExOnJldHVybiBlPXQucmVuZGVyLGU9ZS5kaXNwbGF5TmFtZXx8ZS5uYW1lfHwiIix0LmRpc3BsYXlOYW1lfHwoZSE9PSIiPyJGb3J3YXJkUmVmKCIrZSsiKSI6IkZvcndhcmRSZWYiKTtjYXNlIDc6cmV0dXJuIkZyYWdtZW50IjtjYXNlIDU6cmV0dXJuIHQ7Y2FzZSA0OnJldHVybiJQb3J0YWwiO2Nhc2UgMzpyZXR1cm4iUm9vdCI7Y2FzZSA2OnJldHVybiJUZXh0IjtjYXNlIDE2OnJldHVybiB0ZSh0KTtjYXNlIDg6cmV0dXJuIHQ9PT0kZT8iU3RyaWN0TW9kZSI6Ik1vZGUiO2Nhc2UgMjI6cmV0dXJuIk9mZnNjcmVlbiI7Y2FzZSAxMjpyZXR1cm4iUHJvZmlsZXIiO2Nhc2UgMjE6cmV0dXJuIlNjb3BlIjtjYXNlIDEzOnJldHVybiJTdXNwZW5zZSI7Y2FzZSAxOTpyZXR1cm4iU3VzcGVuc2VMaXN0IjtjYXNlIDI1OnJldHVybiJUcmFjaW5nTWFya2VyIjtjYXNlIDE6Y2FzZSAwOmNhc2UgMTc6Y2FzZSAyOmNhc2UgMTQ6Y2FzZSAxNTppZih0eXBlb2YgdD09ImZ1bmN0aW9uIilyZXR1cm4gdC5kaXNwbGF5TmFtZXx8dC5uYW1lfHxudWxsO2lmKHR5cGVvZiB0PT0ic3RyaW5nIilyZXR1cm4gdH1yZXR1cm4gbnVsbH1mdW5jdGlvbiBWKGUpe3N3aXRjaCh0eXBlb2YgZSl7Y2FzZSJib29sZWFuIjpjYXNlIm51bWJlciI6Y2FzZSJzdHJpbmciOmNhc2UidW5kZWZpbmVkIjpyZXR1cm4gZTtjYXNlIm9iamVjdCI6cmV0dXJuIGU7ZGVmYXVsdDpyZXR1cm4iIn19ZnVuY3Rpb24gcGUoZSl7dmFyIHQ9ZS50eXBlO3JldHVybihlPWUubm9kZU5hbWUpJiZlLnRvTG93ZXJDYXNlKCk9PT0iaW5wdXQiJiYodD09PSJjaGVja2JveCJ8fHQ9PT0icmFkaW8iKX1mdW5jdGlvbiBxKGUpe3ZhciB0PXBlKGUpPyJjaGVja2VkIjoidmFsdWUiLHI9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSx0KSxsPSIiK2VbdF07aWYoIWUuaGFzT3duUHJvcGVydHkodCkmJnR5cGVvZiByPCJ1IiYmdHlwZW9mIHIuZ2V0PT0iZnVuY3Rpb24iJiZ0eXBlb2Ygci5zZXQ9PSJmdW5jdGlvbiIpe3ZhciBvPXIuZ2V0LHU9ci5zZXQ7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLHQse2NvbmZpZ3VyYWJsZTohMCxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gby5jYWxsKHRoaXMpfSxzZXQ6ZnVuY3Rpb24oZCl7bD0iIitkLHUuY2FsbCh0aGlzLGQpfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLHQse2VudW1lcmFibGU6ci5lbnVtZXJhYmxlfSkse2dldFZhbHVlOmZ1bmN0aW9uKCl7cmV0dXJuIGx9LHNldFZhbHVlOmZ1bmN0aW9uKGQpe2w9IiIrZH0sc3RvcFRyYWNraW5nOmZ1bmN0aW9uKCl7ZS5fdmFsdWVUcmFja2VyPW51bGwsZGVsZXRlIGVbdF19fX19ZnVuY3Rpb24gbWUoZSl7ZS5fdmFsdWVUcmFja2VyfHwoZS5fdmFsdWVUcmFja2VyPXEoZSkpfWZ1bmN0aW9uIEgoZSl7aWYoIWUpcmV0dXJuITE7dmFyIHQ9ZS5fdmFsdWVUcmFja2VyO2lmKCF0KXJldHVybiEwO3ZhciByPXQuZ2V0VmFsdWUoKSxsPSIiO3JldHVybiBlJiYobD1wZShlKT9lLmNoZWNrZWQ/InRydWUiOiJmYWxzZSI6ZS52YWx1ZSksZT1sLGUhPT1yPyh0LnNldFZhbHVlKGUpLCEwKTohMX1mdW5jdGlvbiB2ZShlKXtpZihlPWV8fCh0eXBlb2YgZG9jdW1lbnQ8InUiP2RvY3VtZW50OnZvaWQgMCksdHlwZW9mIGU+InUiKXJldHVybiBudWxsO3RyeXtyZXR1cm4gZS5hY3RpdmVFbGVtZW50fHxlLmJvZHl9Y2F0Y2h7cmV0dXJuIGUuYm9keX19ZnVuY3Rpb24gRihlLHQpe3ZhciByPXQuY2hlY2tlZDtyZXR1cm4gXyh7fSx0LHtkZWZhdWx0Q2hlY2tlZDp2b2lkIDAsZGVmYXVsdFZhbHVlOnZvaWQgMCx2YWx1ZTp2b2lkIDAsY2hlY2tlZDpyPz9lLl93cmFwcGVyU3RhdGUuaW5pdGlhbENoZWNrZWR9KX1mdW5jdGlvbiBrZShlLHQpe3ZhciByPXQuZGVmYXVsdFZhbHVlPT1udWxsPyIiOnQuZGVmYXVsdFZhbHVlLGw9dC5jaGVja2VkIT1udWxsP3QuY2hlY2tlZDp0LmRlZmF1bHRDaGVja2VkO3I9Vih0LnZhbHVlIT1udWxsP3QudmFsdWU6ciksZS5fd3JhcHBlclN0YXRlPXtpbml0aWFsQ2hlY2tlZDpsLGluaXRpYWxWYWx1ZTpyLGNvbnRyb2xsZWQ6dC50eXBlPT09ImNoZWNrYm94Inx8dC50eXBlPT09InJhZGlvIj90LmNoZWNrZWQhPW51bGw6dC52YWx1ZSE9bnVsbH19ZnVuY3Rpb24gU2UoZSx0KXt0PXQuY2hlY2tlZCx0IT1udWxsJiZhZShlLCJjaGVja2VkIix0LCExKX1mdW5jdGlvbiBZKGUsdCl7U2UoZSx0KTt2YXIgcj1WKHQudmFsdWUpLGw9dC50eXBlO2lmKHIhPW51bGwpbD09PSJudW1iZXIiPyhyPT09MCYmZS52YWx1ZT09PSIifHxlLnZhbHVlIT1yKSYmKGUudmFsdWU9IiIrcik6ZS52YWx1ZSE9PSIiK3ImJihlLnZhbHVlPSIiK3IpO2Vsc2UgaWYobD09PSJzdWJtaXQifHxsPT09InJlc2V0Iil7ZS5yZW1vdmVBdHRyaWJ1dGUoInZhbHVlIik7cmV0dXJufXQuaGFzT3duUHJvcGVydHkoInZhbHVlIik/TmUoZSx0LnR5cGUscik6dC5oYXNPd25Qcm9wZXJ0eSgiZGVmYXVsdFZhbHVlIikmJk5lKGUsdC50eXBlLFYodC5kZWZhdWx0VmFsdWUpKSx0LmNoZWNrZWQ9PW51bGwmJnQuZGVmYXVsdENoZWNrZWQhPW51bGwmJihlLmRlZmF1bHRDaGVja2VkPSEhdC5kZWZhdWx0Q2hlY2tlZCl9ZnVuY3Rpb24gV2UoZSx0LHIpe2lmKHQuaGFzT3duUHJvcGVydHkoInZhbHVlIil8fHQuaGFzT3duUHJvcGVydHkoImRlZmF1bHRWYWx1ZSIpKXt2YXIgbD10LnR5cGU7aWYoIShsIT09InN1Ym1pdCImJmwhPT0icmVzZXQifHx0LnZhbHVlIT09dm9pZCAwJiZ0LnZhbHVlIT09bnVsbCkpcmV0dXJuO3Q9IiIrZS5fd3JhcHBlclN0YXRlLmluaXRpYWxWYWx1ZSxyfHx0PT09ZS52YWx1ZXx8KGUudmFsdWU9dCksZS5kZWZhdWx0VmFsdWU9dH1yPWUubmFtZSxyIT09IiImJihlLm5hbWU9IiIpLGUuZGVmYXVsdENoZWNrZWQ9ISFlLl93cmFwcGVyU3RhdGUuaW5pdGlhbENoZWNrZWQsciE9PSIiJiYoZS5uYW1lPXIpfWZ1bmN0aW9uIE5lKGUsdCxyKXsodCE9PSJudW1iZXIifHx2ZShlLm93bmVyRG9jdW1lbnQpIT09ZSkmJihyPT1udWxsP2UuZGVmYXVsdFZhbHVlPSIiK2UuX3dyYXBwZXJTdGF0ZS5pbml0aWFsVmFsdWU6ZS5kZWZhdWx0VmFsdWUhPT0iIityJiYoZS5kZWZhdWx0VmFsdWU9IiIrcikpfXZhciBCPUFycmF5LmlzQXJyYXk7ZnVuY3Rpb24gTyhlLHQscixsKXtpZihlPWUub3B0aW9ucyx0KXt0PXt9O2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXRbIiQiK3Jbb11dPSEwO2ZvcihyPTA7cjxlLmxlbmd0aDtyKyspbz10Lmhhc093blByb3BlcnR5KCIkIitlW3JdLnZhbHVlKSxlW3JdLnNlbGVjdGVkIT09byYmKGVbcl0uc2VsZWN0ZWQ9byksbyYmbCYmKGVbcl0uZGVmYXVsdFNlbGVjdGVkPSEwKX1lbHNle2ZvcihyPSIiK1YociksdD1udWxsLG89MDtvPGUubGVuZ3RoO28rKyl7aWYoZVtvXS52YWx1ZT09PXIpe2Vbb10uc2VsZWN0ZWQ9ITAsbCYmKGVbb10uZGVmYXVsdFNlbGVjdGVkPSEwKTtyZXR1cm59dCE9PW51bGx8fGVbb10uZGlzYWJsZWR8fCh0PWVbb10pfXQhPT1udWxsJiYodC5zZWxlY3RlZD0hMCl9fWZ1bmN0aW9uIFBlKGUsdCl7aWYodC5kYW5nZXJvdXNseVNldElubmVySFRNTCE9bnVsbCl0aHJvdyBFcnJvcihpKDkxKSk7cmV0dXJuIF8oe30sdCx7dmFsdWU6dm9pZCAwLGRlZmF1bHRWYWx1ZTp2b2lkIDAsY2hpbGRyZW46IiIrZS5fd3JhcHBlclN0YXRlLmluaXRpYWxWYWx1ZX0pfWZ1bmN0aW9uIGplKGUsdCl7dmFyIHI9dC52YWx1ZTtpZihyPT1udWxsKXtpZihyPXQuY2hpbGRyZW4sdD10LmRlZmF1bHRWYWx1ZSxyIT1udWxsKXtpZih0IT1udWxsKXRocm93IEVycm9yKGkoOTIpKTtpZihCKHIpKXtpZigxPHIubGVuZ3RoKXRocm93IEVycm9yKGkoOTMpKTtyPXJbMF19dD1yfXQ9PW51bGwmJih0PSIiKSxyPXR9ZS5fd3JhcHBlclN0YXRlPXtpbml0aWFsVmFsdWU6VihyKX19ZnVuY3Rpb24gVyhlLHQpe3ZhciByPVYodC52YWx1ZSksbD1WKHQuZGVmYXVsdFZhbHVlKTtyIT1udWxsJiYocj0iIityLHIhPT1lLnZhbHVlJiYoZS52YWx1ZT1yKSx0LmRlZmF1bHRWYWx1ZT09bnVsbCYmZS5kZWZhdWx0VmFsdWUhPT1yJiYoZS5kZWZhdWx0VmFsdWU9cikpLGwhPW51bGwmJihlLmRlZmF1bHRWYWx1ZT0iIitsKX1mdW5jdGlvbiBiZShlKXt2YXIgdD1lLnRleHRDb250ZW50O3Q9PT1lLl93cmFwcGVyU3RhdGUuaW5pdGlhbFZhbHVlJiZ0IT09IiImJnQhPT1udWxsJiYoZS52YWx1ZT10KX1mdW5jdGlvbiB4ZShlKXtzd2l0Y2goZSl7Y2FzZSJzdmciOnJldHVybiJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI7Y2FzZSJtYXRoIjpyZXR1cm4iaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTCI7ZGVmYXVsdDpyZXR1cm4iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCJ9fWZ1bmN0aW9uIG9lKGUsdCl7cmV0dXJuIGU9PW51bGx8fGU9PT0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCI/eGUodCk6ZT09PSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyImJnQ9PT0iZm9yZWlnbk9iamVjdCI/Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiOmV9dmFyIHJ0LGFuPShmdW5jdGlvbihlKXtyZXR1cm4gdHlwZW9mIE1TQXBwPCJ1IiYmTVNBcHAuZXhlY1Vuc2FmZUxvY2FsRnVuY3Rpb24/ZnVuY3Rpb24odCxyLGwsbyl7TVNBcHAuZXhlY1Vuc2FmZUxvY2FsRnVuY3Rpb24oZnVuY3Rpb24oKXtyZXR1cm4gZSh0LHIsbCxvKX0pfTplfSkoZnVuY3Rpb24oZSx0KXtpZihlLm5hbWVzcGFjZVVSSSE9PSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyJ8fCJpbm5lckhUTUwiaW4gZSllLmlubmVySFRNTD10O2Vsc2V7Zm9yKHJ0PXJ0fHxkb2N1bWVudC5jcmVhdGVFbGVtZW50KCJkaXYiKSxydC5pbm5lckhUTUw9Ijxzdmc+Iit0LnZhbHVlT2YoKS50b1N0cmluZygpKyI8L3N2Zz4iLHQ9cnQuZmlyc3RDaGlsZDtlLmZpcnN0Q2hpbGQ7KWUucmVtb3ZlQ2hpbGQoZS5maXJzdENoaWxkKTtmb3IoO3QuZmlyc3RDaGlsZDspZS5hcHBlbmRDaGlsZCh0LmZpcnN0Q2hpbGQpfX0pO2Z1bmN0aW9uIGx0KGUsdCl7aWYodCl7dmFyIHI9ZS5maXJzdENoaWxkO2lmKHImJnI9PT1lLmxhc3RDaGlsZCYmci5ub2RlVHlwZT09PTMpe3Iubm9kZVZhbHVlPXQ7cmV0dXJufX1lLnRleHRDb250ZW50PXR9dmFyIHduPXthbmltYXRpb25JdGVyYXRpb25Db3VudDohMCxhc3BlY3RSYXRpbzohMCxib3JkZXJJbWFnZU91dHNldDohMCxib3JkZXJJbWFnZVNsaWNlOiEwLGJvcmRlckltYWdlV2lkdGg6ITAsYm94RmxleDohMCxib3hGbGV4R3JvdXA6ITAsYm94T3JkaW5hbEdyb3VwOiEwLGNvbHVtbkNvdW50OiEwLGNvbHVtbnM6ITAsZmxleDohMCxmbGV4R3JvdzohMCxmbGV4UG9zaXRpdmU6ITAsZmxleFNocmluazohMCxmbGV4TmVnYXRpdmU6ITAsZmxleE9yZGVyOiEwLGdyaWRBcmVhOiEwLGdyaWRSb3c6ITAsZ3JpZFJvd0VuZDohMCxncmlkUm93U3BhbjohMCxncmlkUm93U3RhcnQ6ITAsZ3JpZENvbHVtbjohMCxncmlkQ29sdW1uRW5kOiEwLGdyaWRDb2x1bW5TcGFuOiEwLGdyaWRDb2x1bW5TdGFydDohMCxmb250V2VpZ2h0OiEwLGxpbmVDbGFtcDohMCxsaW5lSGVpZ2h0OiEwLG9wYWNpdHk6ITAsb3JkZXI6ITAsb3JwaGFuczohMCx0YWJTaXplOiEwLHdpZG93czohMCx6SW5kZXg6ITAsem9vbTohMCxmaWxsT3BhY2l0eTohMCxmbG9vZE9wYWNpdHk6ITAsc3RvcE9wYWNpdHk6ITAsc3Ryb2tlRGFzaGFycmF5OiEwLHN0cm9rZURhc2hvZmZzZXQ6ITAsc3Ryb2tlTWl0ZXJsaW1pdDohMCxzdHJva2VPcGFjaXR5OiEwLHN0cm9rZVdpZHRoOiEwfSxscj1bIldlYmtpdCIsIm1zIiwiTW96IiwiTyJdO09iamVjdC5rZXlzKHduKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2xyLmZvckVhY2goZnVuY3Rpb24odCl7dD10K2UuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkrZS5zdWJzdHJpbmcoMSksd25bdF09d25bZV19KX0pO2Z1bmN0aW9uIG1vKGUsdCxyKXtyZXR1cm4gdD09bnVsbHx8dHlwZW9mIHQ9PSJib29sZWFuInx8dD09PSIiPyIiOnJ8fHR5cGVvZiB0IT0ibnVtYmVyInx8dD09PTB8fHduLmhhc093blByb3BlcnR5KGUpJiZ3bltlXT8oIiIrdCkudHJpbSgpOnQrInB4In1mdW5jdGlvbiBnbyhlLHQpe2U9ZS5zdHlsZTtmb3IodmFyIHIgaW4gdClpZih0Lmhhc093blByb3BlcnR5KHIpKXt2YXIgbD1yLmluZGV4T2YoIi0tIik9PT0wLG89bW8ocix0W3JdLGwpO3I9PT0iZmxvYXQiJiYocj0iY3NzRmxvYXQiKSxsP2Uuc2V0UHJvcGVydHkocixvKTplW3JdPW99fXZhciB1ZD1fKHttZW51aXRlbTohMH0se2FyZWE6ITAsYmFzZTohMCxicjohMCxjb2w6ITAsZW1iZWQ6ITAsaHI6ITAsaW1nOiEwLGlucHV0OiEwLGtleWdlbjohMCxsaW5rOiEwLG1ldGE6ITAscGFyYW06ITAsc291cmNlOiEwLHRyYWNrOiEwLHdicjohMH0pO2Z1bmN0aW9uIFhzKGUsdCl7aWYodCl7aWYodWRbZV0mJih0LmNoaWxkcmVuIT1udWxsfHx0LmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MIT1udWxsKSl0aHJvdyBFcnJvcihpKDEzNyxlKSk7aWYodC5kYW5nZXJvdXNseVNldElubmVySFRNTCE9bnVsbCl7aWYodC5jaGlsZHJlbiE9bnVsbCl0aHJvdyBFcnJvcihpKDYwKSk7aWYodHlwZW9mIHQuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwhPSJvYmplY3QifHwhKCJfX2h0bWwiaW4gdC5kYW5nZXJvdXNseVNldElubmVySFRNTCkpdGhyb3cgRXJyb3IoaSg2MSkpfWlmKHQuc3R5bGUhPW51bGwmJnR5cGVvZiB0LnN0eWxlIT0ib2JqZWN0Iil0aHJvdyBFcnJvcihpKDYyKSl9fWZ1bmN0aW9uIFpzKGUsdCl7aWYoZS5pbmRleE9mKCItIik9PT0tMSlyZXR1cm4gdHlwZW9mIHQuaXM9PSJzdHJpbmciO3N3aXRjaChlKXtjYXNlImFubm90YXRpb24teG1sIjpjYXNlImNvbG9yLXByb2ZpbGUiOmNhc2UiZm9udC1mYWNlIjpjYXNlImZvbnQtZmFjZS1zcmMiOmNhc2UiZm9udC1mYWNlLXVyaSI6Y2FzZSJmb250LWZhY2UtZm9ybWF0IjpjYXNlImZvbnQtZmFjZS1uYW1lIjpjYXNlIm1pc3NpbmctZ2x5cGgiOnJldHVybiExO2RlZmF1bHQ6cmV0dXJuITB9fXZhciBKcz1udWxsO2Z1bmN0aW9uIGVhKGUpe3JldHVybiBlPWUudGFyZ2V0fHxlLnNyY0VsZW1lbnR8fHdpbmRvdyxlLmNvcnJlc3BvbmRpbmdVc2VFbGVtZW50JiYoZT1lLmNvcnJlc3BvbmRpbmdVc2VFbGVtZW50KSxlLm5vZGVUeXBlPT09Mz9lLnBhcmVudE5vZGU6ZX12YXIgdGE9bnVsbCxzcj1udWxsLGFyPW51bGw7ZnVuY3Rpb24gdm8oZSl7aWYoZT1sbChlKSl7aWYodHlwZW9mIHRhIT0iZnVuY3Rpb24iKXRocm93IEVycm9yKGkoMjgwKSk7dmFyIHQ9ZS5zdGF0ZU5vZGU7dCYmKHQ9bnModCksdGEoZS5zdGF0ZU5vZGUsZS50eXBlLHQpKX19ZnVuY3Rpb24geW8oZSl7c3I/YXI/YXIucHVzaChlKTphcj1bZV06c3I9ZX1mdW5jdGlvbiB4bygpe2lmKHNyKXt2YXIgZT1zcix0PWFyO2lmKGFyPXNyPW51bGwsdm8oZSksdClmb3IoZT0wO2U8dC5sZW5ndGg7ZSsrKXZvKHRbZV0pfX1mdW5jdGlvbiB3byhlLHQpe3JldHVybiBlKHQpfWZ1bmN0aW9uIGtvKCl7fXZhciBuYT0hMTtmdW5jdGlvbiBTbyhlLHQscil7aWYobmEpcmV0dXJuIGUodCxyKTtuYT0hMDt0cnl7cmV0dXJuIHdvKGUsdCxyKX1maW5hbGx5e25hPSExLChzciE9PW51bGx8fGFyIT09bnVsbCkmJihrbygpLHhvKCkpfX1mdW5jdGlvbiB6cihlLHQpe3ZhciByPWUuc3RhdGVOb2RlO2lmKHI9PT1udWxsKXJldHVybiBudWxsO3ZhciBsPW5zKHIpO2lmKGw9PT1udWxsKXJldHVybiBudWxsO3I9bFt0XTtlOnN3aXRjaCh0KXtjYXNlIm9uQ2xpY2siOmNhc2Uib25DbGlja0NhcHR1cmUiOmNhc2Uib25Eb3VibGVDbGljayI6Y2FzZSJvbkRvdWJsZUNsaWNrQ2FwdHVyZSI6Y2FzZSJvbk1vdXNlRG93biI6Y2FzZSJvbk1vdXNlRG93bkNhcHR1cmUiOmNhc2Uib25Nb3VzZU1vdmUiOmNhc2Uib25Nb3VzZU1vdmVDYXB0dXJlIjpjYXNlIm9uTW91c2VVcCI6Y2FzZSJvbk1vdXNlVXBDYXB0dXJlIjpjYXNlIm9uTW91c2VFbnRlciI6KGw9IWwuZGlzYWJsZWQpfHwoZT1lLnR5cGUsbD0hKGU9PT0iYnV0dG9uInx8ZT09PSJpbnB1dCJ8fGU9PT0ic2VsZWN0Inx8ZT09PSJ0ZXh0YXJlYSIpKSxlPSFsO2JyZWFrIGU7ZGVmYXVsdDplPSExfWlmKGUpcmV0dXJuIG51bGw7aWYociYmdHlwZW9mIHIhPSJmdW5jdGlvbiIpdGhyb3cgRXJyb3IoaSgyMzEsdCx0eXBlb2YgcikpO3JldHVybiByfXZhciByYT0hMTtpZihmKXRyeXt2YXIgT3I9e307T2JqZWN0LmRlZmluZVByb3BlcnR5KE9yLCJwYXNzaXZlIix7Z2V0OmZ1bmN0aW9uKCl7cmE9ITB9fSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoInRlc3QiLE9yLE9yKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigidGVzdCIsT3IsT3IpfWNhdGNoe3JhPSExfWZ1bmN0aW9uIGNkKGUsdCxyLGwsbyx1LGQseSx3KXt2YXIgTT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMyk7dHJ5e3QuYXBwbHkocixNKX1jYXRjaChMKXt0aGlzLm9uRXJyb3IoTCl9fXZhciBGcj0hMSxBbD1udWxsLElsPSExLGxhPW51bGwsZmQ9e29uRXJyb3I6ZnVuY3Rpb24oZSl7RnI9ITAsQWw9ZX19O2Z1bmN0aW9uIGRkKGUsdCxyLGwsbyx1LGQseSx3KXtGcj0hMSxBbD1udWxsLGNkLmFwcGx5KGZkLGFyZ3VtZW50cyl9ZnVuY3Rpb24gcGQoZSx0LHIsbCxvLHUsZCx5LHcpe2lmKGRkLmFwcGx5KHRoaXMsYXJndW1lbnRzKSxGcil7aWYoRnIpe3ZhciBNPUFsO0ZyPSExLEFsPW51bGx9ZWxzZSB0aHJvdyBFcnJvcihpKDE5OCkpO0lsfHwoSWw9ITAsbGE9TSl9fWZ1bmN0aW9uIEhuKGUpe3ZhciB0PWUscj1lO2lmKGUuYWx0ZXJuYXRlKWZvcig7dC5yZXR1cm47KXQ9dC5yZXR1cm47ZWxzZXtlPXQ7ZG8gdD1lLCh0LmZsYWdzJjQwOTgpIT09MCYmKHI9dC5yZXR1cm4pLGU9dC5yZXR1cm47d2hpbGUoZSl9cmV0dXJuIHQudGFnPT09Mz9yOm51bGx9ZnVuY3Rpb24gam8oZSl7aWYoZS50YWc9PT0xMyl7dmFyIHQ9ZS5tZW1vaXplZFN0YXRlO2lmKHQ9PT1udWxsJiYoZT1lLmFsdGVybmF0ZSxlIT09bnVsbCYmKHQ9ZS5tZW1vaXplZFN0YXRlKSksdCE9PW51bGwpcmV0dXJuIHQuZGVoeWRyYXRlZH1yZXR1cm4gbnVsbH1mdW5jdGlvbiBibyhlKXtpZihIbihlKSE9PWUpdGhyb3cgRXJyb3IoaSgxODgpKX1mdW5jdGlvbiBoZChlKXt2YXIgdD1lLmFsdGVybmF0ZTtpZighdCl7aWYodD1IbihlKSx0PT09bnVsbCl0aHJvdyBFcnJvcihpKDE4OCkpO3JldHVybiB0IT09ZT9udWxsOmV9Zm9yKHZhciByPWUsbD10Ozspe3ZhciBvPXIucmV0dXJuO2lmKG89PT1udWxsKWJyZWFrO3ZhciB1PW8uYWx0ZXJuYXRlO2lmKHU9PT1udWxsKXtpZihsPW8ucmV0dXJuLGwhPT1udWxsKXtyPWw7Y29udGludWV9YnJlYWt9aWYoby5jaGlsZD09PXUuY2hpbGQpe2Zvcih1PW8uY2hpbGQ7dTspe2lmKHU9PT1yKXJldHVybiBibyhvKSxlO2lmKHU9PT1sKXJldHVybiBibyhvKSx0O3U9dS5zaWJsaW5nfXRocm93IEVycm9yKGkoMTg4KSl9aWYoci5yZXR1cm4hPT1sLnJldHVybilyPW8sbD11O2Vsc2V7Zm9yKHZhciBkPSExLHk9by5jaGlsZDt5Oyl7aWYoeT09PXIpe2Q9ITAscj1vLGw9dTticmVha31pZih5PT09bCl7ZD0hMCxsPW8scj11O2JyZWFrfXk9eS5zaWJsaW5nfWlmKCFkKXtmb3IoeT11LmNoaWxkO3k7KXtpZih5PT09cil7ZD0hMCxyPXUsbD1vO2JyZWFrfWlmKHk9PT1sKXtkPSEwLGw9dSxyPW87YnJlYWt9eT15LnNpYmxpbmd9aWYoIWQpdGhyb3cgRXJyb3IoaSgxODkpKX19aWYoci5hbHRlcm5hdGUhPT1sKXRocm93IEVycm9yKGkoMTkwKSl9aWYoci50YWchPT0zKXRocm93IEVycm9yKGkoMTg4KSk7cmV0dXJuIHIuc3RhdGVOb2RlLmN1cnJlbnQ9PT1yP2U6dH1mdW5jdGlvbiBObyhlKXtyZXR1cm4gZT1oZChlKSxlIT09bnVsbD9DbyhlKTpudWxsfWZ1bmN0aW9uIENvKGUpe2lmKGUudGFnPT09NXx8ZS50YWc9PT02KXJldHVybiBlO2ZvcihlPWUuY2hpbGQ7ZSE9PW51bGw7KXt2YXIgdD1DbyhlKTtpZih0IT09bnVsbClyZXR1cm4gdDtlPWUuc2libGluZ31yZXR1cm4gbnVsbH12YXIgTW89YS51bnN0YWJsZV9zY2hlZHVsZUNhbGxiYWNrLFJvPWEudW5zdGFibGVfY2FuY2VsQ2FsbGJhY2ssbWQ9YS51bnN0YWJsZV9zaG91bGRZaWVsZCxnZD1hLnVuc3RhYmxlX3JlcXVlc3RQYWludCx0dD1hLnVuc3RhYmxlX25vdyx2ZD1hLnVuc3RhYmxlX2dldEN1cnJlbnRQcmlvcml0eUxldmVsLHNhPWEudW5zdGFibGVfSW1tZWRpYXRlUHJpb3JpdHksVG89YS51bnN0YWJsZV9Vc2VyQmxvY2tpbmdQcmlvcml0eSxEbD1hLnVuc3RhYmxlX05vcm1hbFByaW9yaXR5LHlkPWEudW5zdGFibGVfTG93UHJpb3JpdHksRW89YS51bnN0YWJsZV9JZGxlUHJpb3JpdHksemw9bnVsbCxZdD1udWxsO2Z1bmN0aW9uIHhkKGUpe2lmKFl0JiZ0eXBlb2YgWXQub25Db21taXRGaWJlclJvb3Q9PSJmdW5jdGlvbiIpdHJ5e1l0Lm9uQ29tbWl0RmliZXJSb290KHpsLGUsdm9pZCAwLChlLmN1cnJlbnQuZmxhZ3MmMTI4KT09PTEyOCl9Y2F0Y2h7fX12YXIgJHQ9TWF0aC5jbHozMj9NYXRoLmNsejMyOlNkLHdkPU1hdGgubG9nLGtkPU1hdGguTE4yO2Z1bmN0aW9uIFNkKGUpe3JldHVybiBlPj4+PTAsZT09PTA/MzI6MzEtKHdkKGUpL2tkfDApfDB9dmFyIE9sPTY0LEZsPTQxOTQzMDQ7ZnVuY3Rpb24gQnIoZSl7c3dpdGNoKGUmLWUpe2Nhc2UgMTpyZXR1cm4gMTtjYXNlIDI6cmV0dXJuIDI7Y2FzZSA0OnJldHVybiA0O2Nhc2UgODpyZXR1cm4gODtjYXNlIDE2OnJldHVybiAxNjtjYXNlIDMyOnJldHVybiAzMjtjYXNlIDY0OmNhc2UgMTI4OmNhc2UgMjU2OmNhc2UgNTEyOmNhc2UgMTAyNDpjYXNlIDIwNDg6Y2FzZSA0MDk2OmNhc2UgODE5MjpjYXNlIDE2Mzg0OmNhc2UgMzI3Njg6Y2FzZSA2NTUzNjpjYXNlIDEzMTA3MjpjYXNlIDI2MjE0NDpjYXNlIDUyNDI4ODpjYXNlIDEwNDg1NzY6Y2FzZSAyMDk3MTUyOnJldHVybiBlJjQxOTQyNDA7Y2FzZSA0MTk0MzA0OmNhc2UgODM4ODYwODpjYXNlIDE2Nzc3MjE2OmNhc2UgMzM1NTQ0MzI6Y2FzZSA2NzEwODg2NDpyZXR1cm4gZSYxMzAwMjM0MjQ7Y2FzZSAxMzQyMTc3Mjg6cmV0dXJuIDEzNDIxNzcyODtjYXNlIDI2ODQzNTQ1NjpyZXR1cm4gMjY4NDM1NDU2O2Nhc2UgNTM2ODcwOTEyOnJldHVybiA1MzY4NzA5MTI7Y2FzZSAxMDczNzQxODI0OnJldHVybiAxMDczNzQxODI0O2RlZmF1bHQ6cmV0dXJuIGV9fWZ1bmN0aW9uIEJsKGUsdCl7dmFyIHI9ZS5wZW5kaW5nTGFuZXM7aWYocj09PTApcmV0dXJuIDA7dmFyIGw9MCxvPWUuc3VzcGVuZGVkTGFuZXMsdT1lLnBpbmdlZExhbmVzLGQ9ciYyNjg0MzU0NTU7aWYoZCE9PTApe3ZhciB5PWQmfm87eSE9PTA/bD1Ccih5KToodSY9ZCx1IT09MCYmKGw9QnIodSkpKX1lbHNlIGQ9ciZ+byxkIT09MD9sPUJyKGQpOnUhPT0wJiYobD1Ccih1KSk7aWYobD09PTApcmV0dXJuIDA7aWYodCE9PTAmJnQhPT1sJiYodCZvKT09PTAmJihvPWwmLWwsdT10Ji10LG8+PXV8fG89PT0xNiYmKHUmNDE5NDI0MCkhPT0wKSlyZXR1cm4gdDtpZigobCY0KSE9PTAmJihsfD1yJjE2KSx0PWUuZW50YW5nbGVkTGFuZXMsdCE9PTApZm9yKGU9ZS5lbnRhbmdsZW1lbnRzLHQmPWw7MDx0OylyPTMxLSR0KHQpLG89MTw8cixsfD1lW3JdLHQmPX5vO3JldHVybiBsfWZ1bmN0aW9uIGpkKGUsdCl7c3dpdGNoKGUpe2Nhc2UgMTpjYXNlIDI6Y2FzZSA0OnJldHVybiB0KzI1MDtjYXNlIDg6Y2FzZSAxNjpjYXNlIDMyOmNhc2UgNjQ6Y2FzZSAxMjg6Y2FzZSAyNTY6Y2FzZSA1MTI6Y2FzZSAxMDI0OmNhc2UgMjA0ODpjYXNlIDQwOTY6Y2FzZSA4MTkyOmNhc2UgMTYzODQ6Y2FzZSAzMjc2ODpjYXNlIDY1NTM2OmNhc2UgMTMxMDcyOmNhc2UgMjYyMTQ0OmNhc2UgNTI0Mjg4OmNhc2UgMTA0ODU3NjpjYXNlIDIwOTcxNTI6cmV0dXJuIHQrNWUzO2Nhc2UgNDE5NDMwNDpjYXNlIDgzODg2MDg6Y2FzZSAxNjc3NzIxNjpjYXNlIDMzNTU0NDMyOmNhc2UgNjcxMDg4NjQ6cmV0dXJuLTE7Y2FzZSAxMzQyMTc3Mjg6Y2FzZSAyNjg0MzU0NTY6Y2FzZSA1MzY4NzA5MTI6Y2FzZSAxMDczNzQxODI0OnJldHVybi0xO2RlZmF1bHQ6cmV0dXJuLTF9fWZ1bmN0aW9uIGJkKGUsdCl7Zm9yKHZhciByPWUuc3VzcGVuZGVkTGFuZXMsbD1lLnBpbmdlZExhbmVzLG89ZS5leHBpcmF0aW9uVGltZXMsdT1lLnBlbmRpbmdMYW5lczswPHU7KXt2YXIgZD0zMS0kdCh1KSx5PTE8PGQsdz1vW2RdO3c9PT0tMT8oKHkmcik9PT0wfHwoeSZsKSE9PTApJiYob1tkXT1qZCh5LHQpKTp3PD10JiYoZS5leHBpcmVkTGFuZXN8PXkpLHUmPX55fX1mdW5jdGlvbiBhYShlKXtyZXR1cm4gZT1lLnBlbmRpbmdMYW5lcyYtMTA3Mzc0MTgyNSxlIT09MD9lOmUmMTA3Mzc0MTgyND8xMDczNzQxODI0OjB9ZnVuY3Rpb24gUG8oKXt2YXIgZT1PbDtyZXR1cm4gT2w8PD0xLChPbCY0MTk0MjQwKT09PTAmJihPbD02NCksZX1mdW5jdGlvbiBpYShlKXtmb3IodmFyIHQ9W10scj0wOzMxPnI7cisrKXQucHVzaChlKTtyZXR1cm4gdH1mdW5jdGlvbiAkcihlLHQscil7ZS5wZW5kaW5nTGFuZXN8PXQsdCE9PTUzNjg3MDkxMiYmKGUuc3VzcGVuZGVkTGFuZXM9MCxlLnBpbmdlZExhbmVzPTApLGU9ZS5ldmVudFRpbWVzLHQ9MzEtJHQodCksZVt0XT1yfWZ1bmN0aW9uIE5kKGUsdCl7dmFyIHI9ZS5wZW5kaW5nTGFuZXMmfnQ7ZS5wZW5kaW5nTGFuZXM9dCxlLnN1c3BlbmRlZExhbmVzPTAsZS5waW5nZWRMYW5lcz0wLGUuZXhwaXJlZExhbmVzJj10LGUubXV0YWJsZVJlYWRMYW5lcyY9dCxlLmVudGFuZ2xlZExhbmVzJj10LHQ9ZS5lbnRhbmdsZW1lbnRzO3ZhciBsPWUuZXZlbnRUaW1lcztmb3IoZT1lLmV4cGlyYXRpb25UaW1lczswPHI7KXt2YXIgbz0zMS0kdChyKSx1PTE8PG87dFtvXT0wLGxbb109LTEsZVtvXT0tMSxyJj1+dX19ZnVuY3Rpb24gb2EoZSx0KXt2YXIgcj1lLmVudGFuZ2xlZExhbmVzfD10O2ZvcihlPWUuZW50YW5nbGVtZW50cztyOyl7dmFyIGw9MzEtJHQociksbz0xPDxsO28mdHxlW2xdJnQmJihlW2xdfD10KSxyJj1+b319dmFyIEJlPTA7ZnVuY3Rpb24gTG8oZSl7cmV0dXJuIGUmPS1lLDE8ZT80PGU/KGUmMjY4NDM1NDU1KSE9PTA/MTY6NTM2ODcwOTEyOjQ6MX12YXIgX28sdWEsQW8sSW8sRG8sY2E9ITEsJGw9W10sa249bnVsbCxTbj1udWxsLGpuPW51bGwsV3I9bmV3IE1hcCxVcj1uZXcgTWFwLGJuPVtdLENkPSJtb3VzZWRvd24gbW91c2V1cCB0b3VjaGNhbmNlbCB0b3VjaGVuZCB0b3VjaHN0YXJ0IGF1eGNsaWNrIGRibGNsaWNrIHBvaW50ZXJjYW5jZWwgcG9pbnRlcmRvd24gcG9pbnRlcnVwIGRyYWdlbmQgZHJhZ3N0YXJ0IGRyb3AgY29tcG9zaXRpb25lbmQgY29tcG9zaXRpb25zdGFydCBrZXlkb3duIGtleXByZXNzIGtleXVwIGlucHV0IHRleHRJbnB1dCBjb3B5IGN1dCBwYXN0ZSBjbGljayBjaGFuZ2UgY29udGV4dG1lbnUgcmVzZXQgc3VibWl0Ii5zcGxpdCgiICIpO2Z1bmN0aW9uIHpvKGUsdCl7c3dpdGNoKGUpe2Nhc2UiZm9jdXNpbiI6Y2FzZSJmb2N1c291dCI6a249bnVsbDticmVhaztjYXNlImRyYWdlbnRlciI6Y2FzZSJkcmFnbGVhdmUiOlNuPW51bGw7YnJlYWs7Y2FzZSJtb3VzZW92ZXIiOmNhc2UibW91c2VvdXQiOmpuPW51bGw7YnJlYWs7Y2FzZSJwb2ludGVyb3ZlciI6Y2FzZSJwb2ludGVyb3V0IjpXci5kZWxldGUodC5wb2ludGVySWQpO2JyZWFrO2Nhc2UiZ290cG9pbnRlcmNhcHR1cmUiOmNhc2UibG9zdHBvaW50ZXJjYXB0dXJlIjpVci5kZWxldGUodC5wb2ludGVySWQpfX1mdW5jdGlvbiBIcihlLHQscixsLG8sdSl7cmV0dXJuIGU9PT1udWxsfHxlLm5hdGl2ZUV2ZW50IT09dT8oZT17YmxvY2tlZE9uOnQsZG9tRXZlbnROYW1lOnIsZXZlbnRTeXN0ZW1GbGFnczpsLG5hdGl2ZUV2ZW50OnUsdGFyZ2V0Q29udGFpbmVyczpbb119LHQhPT1udWxsJiYodD1sbCh0KSx0IT09bnVsbCYmdWEodCkpLGUpOihlLmV2ZW50U3lzdGVtRmxhZ3N8PWwsdD1lLnRhcmdldENvbnRhaW5lcnMsbyE9PW51bGwmJnQuaW5kZXhPZihvKT09PS0xJiZ0LnB1c2gobyksZSl9ZnVuY3Rpb24gTWQoZSx0LHIsbCxvKXtzd2l0Y2godCl7Y2FzZSJmb2N1c2luIjpyZXR1cm4ga249SHIoa24sZSx0LHIsbCxvKSwhMDtjYXNlImRyYWdlbnRlciI6cmV0dXJuIFNuPUhyKFNuLGUsdCxyLGwsbyksITA7Y2FzZSJtb3VzZW92ZXIiOnJldHVybiBqbj1IcihqbixlLHQscixsLG8pLCEwO2Nhc2UicG9pbnRlcm92ZXIiOnZhciB1PW8ucG9pbnRlcklkO3JldHVybiBXci5zZXQodSxIcihXci5nZXQodSl8fG51bGwsZSx0LHIsbCxvKSksITA7Y2FzZSJnb3Rwb2ludGVyY2FwdHVyZSI6cmV0dXJuIHU9by5wb2ludGVySWQsVXIuc2V0KHUsSHIoVXIuZ2V0KHUpfHxudWxsLGUsdCxyLGwsbykpLCEwfXJldHVybiExfWZ1bmN0aW9uIE9vKGUpe3ZhciB0PVZuKGUudGFyZ2V0KTtpZih0IT09bnVsbCl7dmFyIHI9SG4odCk7aWYociE9PW51bGwpe2lmKHQ9ci50YWcsdD09PTEzKXtpZih0PWpvKHIpLHQhPT1udWxsKXtlLmJsb2NrZWRPbj10LERvKGUucHJpb3JpdHksZnVuY3Rpb24oKXtBbyhyKX0pO3JldHVybn19ZWxzZSBpZih0PT09MyYmci5zdGF0ZU5vZGUuY3VycmVudC5tZW1vaXplZFN0YXRlLmlzRGVoeWRyYXRlZCl7ZS5ibG9ja2VkT249ci50YWc9PT0zP3Iuc3RhdGVOb2RlLmNvbnRhaW5lckluZm86bnVsbDtyZXR1cm59fX1lLmJsb2NrZWRPbj1udWxsfWZ1bmN0aW9uIFdsKGUpe2lmKGUuYmxvY2tlZE9uIT09bnVsbClyZXR1cm4hMTtmb3IodmFyIHQ9ZS50YXJnZXRDb250YWluZXJzOzA8dC5sZW5ndGg7KXt2YXIgcj1kYShlLmRvbUV2ZW50TmFtZSxlLmV2ZW50U3lzdGVtRmxhZ3MsdFswXSxlLm5hdGl2ZUV2ZW50KTtpZihyPT09bnVsbCl7cj1lLm5hdGl2ZUV2ZW50O3ZhciBsPW5ldyByLmNvbnN0cnVjdG9yKHIudHlwZSxyKTtKcz1sLHIudGFyZ2V0LmRpc3BhdGNoRXZlbnQobCksSnM9bnVsbH1lbHNlIHJldHVybiB0PWxsKHIpLHQhPT1udWxsJiZ1YSh0KSxlLmJsb2NrZWRPbj1yLCExO3Quc2hpZnQoKX1yZXR1cm4hMH1mdW5jdGlvbiBGbyhlLHQscil7V2woZSkmJnIuZGVsZXRlKHQpfWZ1bmN0aW9uIFJkKCl7Y2E9ITEsa24hPT1udWxsJiZXbChrbikmJihrbj1udWxsKSxTbiE9PW51bGwmJldsKFNuKSYmKFNuPW51bGwpLGpuIT09bnVsbCYmV2woam4pJiYoam49bnVsbCksV3IuZm9yRWFjaChGbyksVXIuZm9yRWFjaChGbyl9ZnVuY3Rpb24gVnIoZSx0KXtlLmJsb2NrZWRPbj09PXQmJihlLmJsb2NrZWRPbj1udWxsLGNhfHwoY2E9ITAsYS51bnN0YWJsZV9zY2hlZHVsZUNhbGxiYWNrKGEudW5zdGFibGVfTm9ybWFsUHJpb3JpdHksUmQpKSl9ZnVuY3Rpb24gR3IoZSl7ZnVuY3Rpb24gdChvKXtyZXR1cm4gVnIobyxlKX1pZigwPCRsLmxlbmd0aCl7VnIoJGxbMF0sZSk7Zm9yKHZhciByPTE7cjwkbC5sZW5ndGg7cisrKXt2YXIgbD0kbFtyXTtsLmJsb2NrZWRPbj09PWUmJihsLmJsb2NrZWRPbj1udWxsKX19Zm9yKGtuIT09bnVsbCYmVnIoa24sZSksU24hPT1udWxsJiZWcihTbixlKSxqbiE9PW51bGwmJlZyKGpuLGUpLFdyLmZvckVhY2godCksVXIuZm9yRWFjaCh0KSxyPTA7cjxibi5sZW5ndGg7cisrKWw9Ym5bcl0sbC5ibG9ja2VkT249PT1lJiYobC5ibG9ja2VkT249bnVsbCk7Zm9yKDswPGJuLmxlbmd0aCYmKHI9Ym5bMF0sci5ibG9ja2VkT249PT1udWxsKTspT28ociksci5ibG9ja2VkT249PT1udWxsJiZibi5zaGlmdCgpfXZhciBpcj1oZS5SZWFjdEN1cnJlbnRCYXRjaENvbmZpZyxVbD0hMDtmdW5jdGlvbiBUZChlLHQscixsKXt2YXIgbz1CZSx1PWlyLnRyYW5zaXRpb247aXIudHJhbnNpdGlvbj1udWxsO3RyeXtCZT0xLGZhKGUsdCxyLGwpfWZpbmFsbHl7QmU9byxpci50cmFuc2l0aW9uPXV9fWZ1bmN0aW9uIEVkKGUsdCxyLGwpe3ZhciBvPUJlLHU9aXIudHJhbnNpdGlvbjtpci50cmFuc2l0aW9uPW51bGw7dHJ5e0JlPTQsZmEoZSx0LHIsbCl9ZmluYWxseXtCZT1vLGlyLnRyYW5zaXRpb249dX19ZnVuY3Rpb24gZmEoZSx0LHIsbCl7aWYoVWwpe3ZhciBvPWRhKGUsdCxyLGwpO2lmKG89PT1udWxsKVRhKGUsdCxsLEhsLHIpLHpvKGUsbCk7ZWxzZSBpZihNZChvLGUsdCxyLGwpKWwuc3RvcFByb3BhZ2F0aW9uKCk7ZWxzZSBpZih6byhlLGwpLHQmNCYmLTE8Q2QuaW5kZXhPZihlKSl7Zm9yKDtvIT09bnVsbDspe3ZhciB1PWxsKG8pO2lmKHUhPT1udWxsJiZfbyh1KSx1PWRhKGUsdCxyLGwpLHU9PT1udWxsJiZUYShlLHQsbCxIbCxyKSx1PT09bylicmVhaztvPXV9byE9PW51bGwmJmwuc3RvcFByb3BhZ2F0aW9uKCl9ZWxzZSBUYShlLHQsbCxudWxsLHIpfX12YXIgSGw9bnVsbDtmdW5jdGlvbiBkYShlLHQscixsKXtpZihIbD1udWxsLGU9ZWEobCksZT1WbihlKSxlIT09bnVsbClpZih0PUhuKGUpLHQ9PT1udWxsKWU9bnVsbDtlbHNlIGlmKHI9dC50YWcscj09PTEzKXtpZihlPWpvKHQpLGUhPT1udWxsKXJldHVybiBlO2U9bnVsbH1lbHNlIGlmKHI9PT0zKXtpZih0LnN0YXRlTm9kZS5jdXJyZW50Lm1lbW9pemVkU3RhdGUuaXNEZWh5ZHJhdGVkKXJldHVybiB0LnRhZz09PTM/dC5zdGF0ZU5vZGUuY29udGFpbmVySW5mbzpudWxsO2U9bnVsbH1lbHNlIHQhPT1lJiYoZT1udWxsKTtyZXR1cm4gSGw9ZSxudWxsfWZ1bmN0aW9uIEJvKGUpe3N3aXRjaChlKXtjYXNlImNhbmNlbCI6Y2FzZSJjbGljayI6Y2FzZSJjbG9zZSI6Y2FzZSJjb250ZXh0bWVudSI6Y2FzZSJjb3B5IjpjYXNlImN1dCI6Y2FzZSJhdXhjbGljayI6Y2FzZSJkYmxjbGljayI6Y2FzZSJkcmFnZW5kIjpjYXNlImRyYWdzdGFydCI6Y2FzZSJkcm9wIjpjYXNlImZvY3VzaW4iOmNhc2UiZm9jdXNvdXQiOmNhc2UiaW5wdXQiOmNhc2UiaW52YWxpZCI6Y2FzZSJrZXlkb3duIjpjYXNlImtleXByZXNzIjpjYXNlImtleXVwIjpjYXNlIm1vdXNlZG93biI6Y2FzZSJtb3VzZXVwIjpjYXNlInBhc3RlIjpjYXNlInBhdXNlIjpjYXNlInBsYXkiOmNhc2UicG9pbnRlcmNhbmNlbCI6Y2FzZSJwb2ludGVyZG93biI6Y2FzZSJwb2ludGVydXAiOmNhc2UicmF0ZWNoYW5nZSI6Y2FzZSJyZXNldCI6Y2FzZSJyZXNpemUiOmNhc2Uic2Vla2VkIjpjYXNlInN1Ym1pdCI6Y2FzZSJ0b3VjaGNhbmNlbCI6Y2FzZSJ0b3VjaGVuZCI6Y2FzZSJ0b3VjaHN0YXJ0IjpjYXNlInZvbHVtZWNoYW5nZSI6Y2FzZSJjaGFuZ2UiOmNhc2Uic2VsZWN0aW9uY2hhbmdlIjpjYXNlInRleHRJbnB1dCI6Y2FzZSJjb21wb3NpdGlvbnN0YXJ0IjpjYXNlImNvbXBvc2l0aW9uZW5kIjpjYXNlImNvbXBvc2l0aW9udXBkYXRlIjpjYXNlImJlZm9yZWJsdXIiOmNhc2UiYWZ0ZXJibHVyIjpjYXNlImJlZm9yZWlucHV0IjpjYXNlImJsdXIiOmNhc2UiZnVsbHNjcmVlbmNoYW5nZSI6Y2FzZSJmb2N1cyI6Y2FzZSJoYXNoY2hhbmdlIjpjYXNlInBvcHN0YXRlIjpjYXNlInNlbGVjdCI6Y2FzZSJzZWxlY3RzdGFydCI6cmV0dXJuIDE7Y2FzZSJkcmFnIjpjYXNlImRyYWdlbnRlciI6Y2FzZSJkcmFnZXhpdCI6Y2FzZSJkcmFnbGVhdmUiOmNhc2UiZHJhZ292ZXIiOmNhc2UibW91c2Vtb3ZlIjpjYXNlIm1vdXNlb3V0IjpjYXNlIm1vdXNlb3ZlciI6Y2FzZSJwb2ludGVybW92ZSI6Y2FzZSJwb2ludGVyb3V0IjpjYXNlInBvaW50ZXJvdmVyIjpjYXNlInNjcm9sbCI6Y2FzZSJ0b2dnbGUiOmNhc2UidG91Y2htb3ZlIjpjYXNlIndoZWVsIjpjYXNlIm1vdXNlZW50ZXIiOmNhc2UibW91c2VsZWF2ZSI6Y2FzZSJwb2ludGVyZW50ZXIiOmNhc2UicG9pbnRlcmxlYXZlIjpyZXR1cm4gNDtjYXNlIm1lc3NhZ2UiOnN3aXRjaCh2ZCgpKXtjYXNlIHNhOnJldHVybiAxO2Nhc2UgVG86cmV0dXJuIDQ7Y2FzZSBEbDpjYXNlIHlkOnJldHVybiAxNjtjYXNlIEVvOnJldHVybiA1MzY4NzA5MTI7ZGVmYXVsdDpyZXR1cm4gMTZ9ZGVmYXVsdDpyZXR1cm4gMTZ9fXZhciBObj1udWxsLHBhPW51bGwsVmw9bnVsbDtmdW5jdGlvbiAkbygpe2lmKFZsKXJldHVybiBWbDt2YXIgZSx0PXBhLHI9dC5sZW5ndGgsbCxvPSJ2YWx1ZSJpbiBObj9Obi52YWx1ZTpObi50ZXh0Q29udGVudCx1PW8ubGVuZ3RoO2ZvcihlPTA7ZTxyJiZ0W2VdPT09b1tlXTtlKyspO3ZhciBkPXItZTtmb3IobD0xO2w8PWQmJnRbci1sXT09PW9bdS1sXTtsKyspO3JldHVybiBWbD1vLnNsaWNlKGUsMTxsPzEtbDp2b2lkIDApfWZ1bmN0aW9uIEdsKGUpe3ZhciB0PWUua2V5Q29kZTtyZXR1cm4iY2hhckNvZGUiaW4gZT8oZT1lLmNoYXJDb2RlLGU9PT0wJiZ0PT09MTMmJihlPTEzKSk6ZT10LGU9PT0xMCYmKGU9MTMpLDMyPD1lfHxlPT09MTM/ZTowfWZ1bmN0aW9uIEtsKCl7cmV0dXJuITB9ZnVuY3Rpb24gV28oKXtyZXR1cm4hMX1mdW5jdGlvbiBQdChlKXtmdW5jdGlvbiB0KHIsbCxvLHUsZCl7dGhpcy5fcmVhY3ROYW1lPXIsdGhpcy5fdGFyZ2V0SW5zdD1vLHRoaXMudHlwZT1sLHRoaXMubmF0aXZlRXZlbnQ9dSx0aGlzLnRhcmdldD1kLHRoaXMuY3VycmVudFRhcmdldD1udWxsO2Zvcih2YXIgeSBpbiBlKWUuaGFzT3duUHJvcGVydHkoeSkmJihyPWVbeV0sdGhpc1t5XT1yP3IodSk6dVt5XSk7cmV0dXJuIHRoaXMuaXNEZWZhdWx0UHJldmVudGVkPSh1LmRlZmF1bHRQcmV2ZW50ZWQhPW51bGw/dS5kZWZhdWx0UHJldmVudGVkOnUucmV0dXJuVmFsdWU9PT0hMSk/S2w6V28sdGhpcy5pc1Byb3BhZ2F0aW9uU3RvcHBlZD1Xbyx0aGlzfXJldHVybiBfKHQucHJvdG90eXBlLHtwcmV2ZW50RGVmYXVsdDpmdW5jdGlvbigpe3RoaXMuZGVmYXVsdFByZXZlbnRlZD0hMDt2YXIgcj10aGlzLm5hdGl2ZUV2ZW50O3ImJihyLnByZXZlbnREZWZhdWx0P3IucHJldmVudERlZmF1bHQoKTp0eXBlb2Ygci5yZXR1cm5WYWx1ZSE9InVua25vd24iJiYoci5yZXR1cm5WYWx1ZT0hMSksdGhpcy5pc0RlZmF1bHRQcmV2ZW50ZWQ9S2wpfSxzdG9wUHJvcGFnYXRpb246ZnVuY3Rpb24oKXt2YXIgcj10aGlzLm5hdGl2ZUV2ZW50O3ImJihyLnN0b3BQcm9wYWdhdGlvbj9yLnN0b3BQcm9wYWdhdGlvbigpOnR5cGVvZiByLmNhbmNlbEJ1YmJsZSE9InVua25vd24iJiYoci5jYW5jZWxCdWJibGU9ITApLHRoaXMuaXNQcm9wYWdhdGlvblN0b3BwZWQ9S2wpfSxwZXJzaXN0OmZ1bmN0aW9uKCl7fSxpc1BlcnNpc3RlbnQ6S2x9KSx0fXZhciBvcj17ZXZlbnRQaGFzZTowLGJ1YmJsZXM6MCxjYW5jZWxhYmxlOjAsdGltZVN0YW1wOmZ1bmN0aW9uKGUpe3JldHVybiBlLnRpbWVTdGFtcHx8RGF0ZS5ub3coKX0sZGVmYXVsdFByZXZlbnRlZDowLGlzVHJ1c3RlZDowfSxoYT1QdChvciksS3I9Xyh7fSxvcix7dmlldzowLGRldGFpbDowfSksUGQ9UHQoS3IpLG1hLGdhLHFyLHFsPV8oe30sS3Ise3NjcmVlblg6MCxzY3JlZW5ZOjAsY2xpZW50WDowLGNsaWVudFk6MCxwYWdlWDowLHBhZ2VZOjAsY3RybEtleTowLHNoaWZ0S2V5OjAsYWx0S2V5OjAsbWV0YUtleTowLGdldE1vZGlmaWVyU3RhdGU6eWEsYnV0dG9uOjAsYnV0dG9uczowLHJlbGF0ZWRUYXJnZXQ6ZnVuY3Rpb24oZSl7cmV0dXJuIGUucmVsYXRlZFRhcmdldD09PXZvaWQgMD9lLmZyb21FbGVtZW50PT09ZS5zcmNFbGVtZW50P2UudG9FbGVtZW50OmUuZnJvbUVsZW1lbnQ6ZS5yZWxhdGVkVGFyZ2V0fSxtb3ZlbWVudFg6ZnVuY3Rpb24oZSl7cmV0dXJuIm1vdmVtZW50WCJpbiBlP2UubW92ZW1lbnRYOihlIT09cXImJihxciYmZS50eXBlPT09Im1vdXNlbW92ZSI/KG1hPWUuc2NyZWVuWC1xci5zY3JlZW5YLGdhPWUuc2NyZWVuWS1xci5zY3JlZW5ZKTpnYT1tYT0wLHFyPWUpLG1hKX0sbW92ZW1lbnRZOmZ1bmN0aW9uKGUpe3JldHVybiJtb3ZlbWVudFkiaW4gZT9lLm1vdmVtZW50WTpnYX19KSxVbz1QdChxbCksTGQ9Xyh7fSxxbCx7ZGF0YVRyYW5zZmVyOjB9KSxfZD1QdChMZCksQWQ9Xyh7fSxLcix7cmVsYXRlZFRhcmdldDowfSksdmE9UHQoQWQpLElkPV8oe30sb3Ise2FuaW1hdGlvbk5hbWU6MCxlbGFwc2VkVGltZTowLHBzZXVkb0VsZW1lbnQ6MH0pLERkPVB0KElkKSx6ZD1fKHt9LG9yLHtjbGlwYm9hcmREYXRhOmZ1bmN0aW9uKGUpe3JldHVybiJjbGlwYm9hcmREYXRhImluIGU/ZS5jbGlwYm9hcmREYXRhOndpbmRvdy5jbGlwYm9hcmREYXRhfX0pLE9kPVB0KHpkKSxGZD1fKHt9LG9yLHtkYXRhOjB9KSxIbz1QdChGZCksQmQ9e0VzYzoiRXNjYXBlIixTcGFjZWJhcjoiICIsTGVmdDoiQXJyb3dMZWZ0IixVcDoiQXJyb3dVcCIsUmlnaHQ6IkFycm93UmlnaHQiLERvd246IkFycm93RG93biIsRGVsOiJEZWxldGUiLFdpbjoiT1MiLE1lbnU6IkNvbnRleHRNZW51IixBcHBzOiJDb250ZXh0TWVudSIsU2Nyb2xsOiJTY3JvbGxMb2NrIixNb3pQcmludGFibGVLZXk6IlVuaWRlbnRpZmllZCJ9LCRkPXs4OiJCYWNrc3BhY2UiLDk6IlRhYiIsMTI6IkNsZWFyIiwxMzoiRW50ZXIiLDE2OiJTaGlmdCIsMTc6IkNvbnRyb2wiLDE4OiJBbHQiLDE5OiJQYXVzZSIsMjA6IkNhcHNMb2NrIiwyNzoiRXNjYXBlIiwzMjoiICIsMzM6IlBhZ2VVcCIsMzQ6IlBhZ2VEb3duIiwzNToiRW5kIiwzNjoiSG9tZSIsMzc6IkFycm93TGVmdCIsMzg6IkFycm93VXAiLDM5OiJBcnJvd1JpZ2h0Iiw0MDoiQXJyb3dEb3duIiw0NToiSW5zZXJ0Iiw0NjoiRGVsZXRlIiwxMTI6IkYxIiwxMTM6IkYyIiwxMTQ6IkYzIiwxMTU6IkY0IiwxMTY6IkY1IiwxMTc6IkY2IiwxMTg6IkY3IiwxMTk6IkY4IiwxMjA6IkY5IiwxMjE6IkYxMCIsMTIyOiJGMTEiLDEyMzoiRjEyIiwxNDQ6Ik51bUxvY2siLDE0NToiU2Nyb2xsTG9jayIsMjI0OiJNZXRhIn0sV2Q9e0FsdDoiYWx0S2V5IixDb250cm9sOiJjdHJsS2V5IixNZXRhOiJtZXRhS2V5IixTaGlmdDoic2hpZnRLZXkifTtmdW5jdGlvbiBVZChlKXt2YXIgdD10aGlzLm5hdGl2ZUV2ZW50O3JldHVybiB0LmdldE1vZGlmaWVyU3RhdGU/dC5nZXRNb2RpZmllclN0YXRlKGUpOihlPVdkW2VdKT8hIXRbZV06ITF9ZnVuY3Rpb24geWEoKXtyZXR1cm4gVWR9dmFyIEhkPV8oe30sS3Ise2tleTpmdW5jdGlvbihlKXtpZihlLmtleSl7dmFyIHQ9QmRbZS5rZXldfHxlLmtleTtpZih0IT09IlVuaWRlbnRpZmllZCIpcmV0dXJuIHR9cmV0dXJuIGUudHlwZT09PSJrZXlwcmVzcyI/KGU9R2woZSksZT09PTEzPyJFbnRlciI6U3RyaW5nLmZyb21DaGFyQ29kZShlKSk6ZS50eXBlPT09ImtleWRvd24ifHxlLnR5cGU9PT0ia2V5dXAiPyRkW2Uua2V5Q29kZV18fCJVbmlkZW50aWZpZWQiOiIifSxjb2RlOjAsbG9jYXRpb246MCxjdHJsS2V5OjAsc2hpZnRLZXk6MCxhbHRLZXk6MCxtZXRhS2V5OjAscmVwZWF0OjAsbG9jYWxlOjAsZ2V0TW9kaWZpZXJTdGF0ZTp5YSxjaGFyQ29kZTpmdW5jdGlvbihlKXtyZXR1cm4gZS50eXBlPT09ImtleXByZXNzIj9HbChlKTowfSxrZXlDb2RlOmZ1bmN0aW9uKGUpe3JldHVybiBlLnR5cGU9PT0ia2V5ZG93biJ8fGUudHlwZT09PSJrZXl1cCI/ZS5rZXlDb2RlOjB9LHdoaWNoOmZ1bmN0aW9uKGUpe3JldHVybiBlLnR5cGU9PT0ia2V5cHJlc3MiP0dsKGUpOmUudHlwZT09PSJrZXlkb3duInx8ZS50eXBlPT09ImtleXVwIj9lLmtleUNvZGU6MH19KSxWZD1QdChIZCksR2Q9Xyh7fSxxbCx7cG9pbnRlcklkOjAsd2lkdGg6MCxoZWlnaHQ6MCxwcmVzc3VyZTowLHRhbmdlbnRpYWxQcmVzc3VyZTowLHRpbHRYOjAsdGlsdFk6MCx0d2lzdDowLHBvaW50ZXJUeXBlOjAsaXNQcmltYXJ5OjB9KSxWbz1QdChHZCksS2Q9Xyh7fSxLcix7dG91Y2hlczowLHRhcmdldFRvdWNoZXM6MCxjaGFuZ2VkVG91Y2hlczowLGFsdEtleTowLG1ldGFLZXk6MCxjdHJsS2V5OjAsc2hpZnRLZXk6MCxnZXRNb2RpZmllclN0YXRlOnlhfSkscWQ9UHQoS2QpLFFkPV8oe30sb3Ise3Byb3BlcnR5TmFtZTowLGVsYXBzZWRUaW1lOjAscHNldWRvRWxlbWVudDowfSksWWQ9UHQoUWQpLFhkPV8oe30scWwse2RlbHRhWDpmdW5jdGlvbihlKXtyZXR1cm4iZGVsdGFYImluIGU/ZS5kZWx0YVg6IndoZWVsRGVsdGFYImluIGU/LWUud2hlZWxEZWx0YVg6MH0sZGVsdGFZOmZ1bmN0aW9uKGUpe3JldHVybiJkZWx0YVkiaW4gZT9lLmRlbHRhWToid2hlZWxEZWx0YVkiaW4gZT8tZS53aGVlbERlbHRhWToid2hlZWxEZWx0YSJpbiBlPy1lLndoZWVsRGVsdGE6MH0sZGVsdGFaOjAsZGVsdGFNb2RlOjB9KSxaZD1QdChYZCksSmQ9WzksMTMsMjcsMzJdLHhhPWYmJiJDb21wb3NpdGlvbkV2ZW50ImluIHdpbmRvdyxRcj1udWxsO2YmJiJkb2N1bWVudE1vZGUiaW4gZG9jdW1lbnQmJihRcj1kb2N1bWVudC5kb2N1bWVudE1vZGUpO3ZhciBlMD1mJiYiVGV4dEV2ZW50ImluIHdpbmRvdyYmIVFyLEdvPWYmJigheGF8fFFyJiY4PFFyJiYxMT49UXIpLEtvPSIgIixxbz0hMTtmdW5jdGlvbiBRbyhlLHQpe3N3aXRjaChlKXtjYXNlImtleXVwIjpyZXR1cm4gSmQuaW5kZXhPZih0LmtleUNvZGUpIT09LTE7Y2FzZSJrZXlkb3duIjpyZXR1cm4gdC5rZXlDb2RlIT09MjI5O2Nhc2Uia2V5cHJlc3MiOmNhc2UibW91c2Vkb3duIjpjYXNlImZvY3Vzb3V0IjpyZXR1cm4hMDtkZWZhdWx0OnJldHVybiExfX1mdW5jdGlvbiBZbyhlKXtyZXR1cm4gZT1lLmRldGFpbCx0eXBlb2YgZT09Im9iamVjdCImJiJkYXRhImluIGU/ZS5kYXRhOm51bGx9dmFyIHVyPSExO2Z1bmN0aW9uIHQwKGUsdCl7c3dpdGNoKGUpe2Nhc2UiY29tcG9zaXRpb25lbmQiOnJldHVybiBZbyh0KTtjYXNlImtleXByZXNzIjpyZXR1cm4gdC53aGljaCE9PTMyP251bGw6KHFvPSEwLEtvKTtjYXNlInRleHRJbnB1dCI6cmV0dXJuIGU9dC5kYXRhLGU9PT1LbyYmcW8/bnVsbDplO2RlZmF1bHQ6cmV0dXJuIG51bGx9fWZ1bmN0aW9uIG4wKGUsdCl7aWYodXIpcmV0dXJuIGU9PT0iY29tcG9zaXRpb25lbmQifHwheGEmJlFvKGUsdCk/KGU9JG8oKSxWbD1wYT1Obj1udWxsLHVyPSExLGUpOm51bGw7c3dpdGNoKGUpe2Nhc2UicGFzdGUiOnJldHVybiBudWxsO2Nhc2Uia2V5cHJlc3MiOmlmKCEodC5jdHJsS2V5fHx0LmFsdEtleXx8dC5tZXRhS2V5KXx8dC5jdHJsS2V5JiZ0LmFsdEtleSl7aWYodC5jaGFyJiYxPHQuY2hhci5sZW5ndGgpcmV0dXJuIHQuY2hhcjtpZih0LndoaWNoKXJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHQud2hpY2gpfXJldHVybiBudWxsO2Nhc2UiY29tcG9zaXRpb25lbmQiOnJldHVybiBHbyYmdC5sb2NhbGUhPT0ia28iP251bGw6dC5kYXRhO2RlZmF1bHQ6cmV0dXJuIG51bGx9fXZhciByMD17Y29sb3I6ITAsZGF0ZTohMCxkYXRldGltZTohMCwiZGF0ZXRpbWUtbG9jYWwiOiEwLGVtYWlsOiEwLG1vbnRoOiEwLG51bWJlcjohMCxwYXNzd29yZDohMCxyYW5nZTohMCxzZWFyY2g6ITAsdGVsOiEwLHRleHQ6ITAsdGltZTohMCx1cmw6ITAsd2VlazohMH07ZnVuY3Rpb24gWG8oZSl7dmFyIHQ9ZSYmZS5ub2RlTmFtZSYmZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO3JldHVybiB0PT09ImlucHV0Ij8hIXIwW2UudHlwZV06dD09PSJ0ZXh0YXJlYSJ9ZnVuY3Rpb24gWm8oZSx0LHIsbCl7eW8obCksdD1KbCh0LCJvbkNoYW5nZSIpLDA8dC5sZW5ndGgmJihyPW5ldyBoYSgib25DaGFuZ2UiLCJjaGFuZ2UiLG51bGwscixsKSxlLnB1c2goe2V2ZW50OnIsbGlzdGVuZXJzOnR9KSl9dmFyIFlyPW51bGwsWHI9bnVsbDtmdW5jdGlvbiBsMChlKXtndShlLDApfWZ1bmN0aW9uIFFsKGUpe3ZhciB0PWhyKGUpO2lmKEgodCkpcmV0dXJuIGV9ZnVuY3Rpb24gczAoZSx0KXtpZihlPT09ImNoYW5nZSIpcmV0dXJuIHR9dmFyIEpvPSExO2lmKGYpe3ZhciB3YTtpZihmKXt2YXIga2E9Im9uaW5wdXQiaW4gZG9jdW1lbnQ7aWYoIWthKXt2YXIgZXU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiZGl2Iik7ZXUuc2V0QXR0cmlidXRlKCJvbmlucHV0IiwicmV0dXJuOyIpLGthPXR5cGVvZiBldS5vbmlucHV0PT0iZnVuY3Rpb24ifXdhPWthfWVsc2Ugd2E9ITE7Sm89d2EmJighZG9jdW1lbnQuZG9jdW1lbnRNb2RlfHw5PGRvY3VtZW50LmRvY3VtZW50TW9kZSl9ZnVuY3Rpb24gdHUoKXtZciYmKFlyLmRldGFjaEV2ZW50KCJvbnByb3BlcnR5Y2hhbmdlIixudSksWHI9WXI9bnVsbCl9ZnVuY3Rpb24gbnUoZSl7aWYoZS5wcm9wZXJ0eU5hbWU9PT0idmFsdWUiJiZRbChYcikpe3ZhciB0PVtdO1pvKHQsWHIsZSxlYShlKSksU28obDAsdCl9fWZ1bmN0aW9uIGEwKGUsdCxyKXtlPT09ImZvY3VzaW4iPyh0dSgpLFlyPXQsWHI9cixZci5hdHRhY2hFdmVudCgib25wcm9wZXJ0eWNoYW5nZSIsbnUpKTplPT09ImZvY3Vzb3V0IiYmdHUoKX1mdW5jdGlvbiBpMChlKXtpZihlPT09InNlbGVjdGlvbmNoYW5nZSJ8fGU9PT0ia2V5dXAifHxlPT09ImtleWRvd24iKXJldHVybiBRbChYcil9ZnVuY3Rpb24gbzAoZSx0KXtpZihlPT09ImNsaWNrIilyZXR1cm4gUWwodCl9ZnVuY3Rpb24gdTAoZSx0KXtpZihlPT09ImlucHV0Inx8ZT09PSJjaGFuZ2UiKXJldHVybiBRbCh0KX1mdW5jdGlvbiBjMChlLHQpe3JldHVybiBlPT09dCYmKGUhPT0wfHwxL2U9PT0xL3QpfHxlIT09ZSYmdCE9PXR9dmFyIFd0PXR5cGVvZiBPYmplY3QuaXM9PSJmdW5jdGlvbiI/T2JqZWN0LmlzOmMwO2Z1bmN0aW9uIFpyKGUsdCl7aWYoV3QoZSx0KSlyZXR1cm4hMDtpZih0eXBlb2YgZSE9Im9iamVjdCJ8fGU9PT1udWxsfHx0eXBlb2YgdCE9Im9iamVjdCJ8fHQ9PT1udWxsKXJldHVybiExO3ZhciByPU9iamVjdC5rZXlzKGUpLGw9T2JqZWN0LmtleXModCk7aWYoci5sZW5ndGghPT1sLmxlbmd0aClyZXR1cm4hMTtmb3IobD0wO2w8ci5sZW5ndGg7bCsrKXt2YXIgbz1yW2xdO2lmKCFnLmNhbGwodCxvKXx8IVd0KGVbb10sdFtvXSkpcmV0dXJuITF9cmV0dXJuITB9ZnVuY3Rpb24gcnUoZSl7Zm9yKDtlJiZlLmZpcnN0Q2hpbGQ7KWU9ZS5maXJzdENoaWxkO3JldHVybiBlfWZ1bmN0aW9uIGx1KGUsdCl7dmFyIHI9cnUoZSk7ZT0wO2Zvcih2YXIgbDtyOyl7aWYoci5ub2RlVHlwZT09PTMpe2lmKGw9ZStyLnRleHRDb250ZW50Lmxlbmd0aCxlPD10JiZsPj10KXJldHVybntub2RlOnIsb2Zmc2V0OnQtZX07ZT1sfWU6e2Zvcig7cjspe2lmKHIubmV4dFNpYmxpbmcpe3I9ci5uZXh0U2libGluZzticmVhayBlfXI9ci5wYXJlbnROb2RlfXI9dm9pZCAwfXI9cnUocil9fWZ1bmN0aW9uIHN1KGUsdCl7cmV0dXJuIGUmJnQ/ZT09PXQ/ITA6ZSYmZS5ub2RlVHlwZT09PTM/ITE6dCYmdC5ub2RlVHlwZT09PTM/c3UoZSx0LnBhcmVudE5vZGUpOiJjb250YWlucyJpbiBlP2UuY29udGFpbnModCk6ZS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbj8hIShlLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKHQpJjE2KTohMTohMX1mdW5jdGlvbiBhdSgpe2Zvcih2YXIgZT13aW5kb3csdD12ZSgpO3QgaW5zdGFuY2VvZiBlLkhUTUxJRnJhbWVFbGVtZW50Oyl7dHJ5e3ZhciByPXR5cGVvZiB0LmNvbnRlbnRXaW5kb3cubG9jYXRpb24uaHJlZj09InN0cmluZyJ9Y2F0Y2h7cj0hMX1pZihyKWU9dC5jb250ZW50V2luZG93O2Vsc2UgYnJlYWs7dD12ZShlLmRvY3VtZW50KX1yZXR1cm4gdH1mdW5jdGlvbiBTYShlKXt2YXIgdD1lJiZlLm5vZGVOYW1lJiZlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7cmV0dXJuIHQmJih0PT09ImlucHV0IiYmKGUudHlwZT09PSJ0ZXh0Inx8ZS50eXBlPT09InNlYXJjaCJ8fGUudHlwZT09PSJ0ZWwifHxlLnR5cGU9PT0idXJsInx8ZS50eXBlPT09InBhc3N3b3JkIil8fHQ9PT0idGV4dGFyZWEifHxlLmNvbnRlbnRFZGl0YWJsZT09PSJ0cnVlIil9ZnVuY3Rpb24gZjAoZSl7dmFyIHQ9YXUoKSxyPWUuZm9jdXNlZEVsZW0sbD1lLnNlbGVjdGlvblJhbmdlO2lmKHQhPT1yJiZyJiZyLm93bmVyRG9jdW1lbnQmJnN1KHIub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQscikpe2lmKGwhPT1udWxsJiZTYShyKSl7aWYodD1sLnN0YXJ0LGU9bC5lbmQsZT09PXZvaWQgMCYmKGU9dCksInNlbGVjdGlvblN0YXJ0ImluIHIpci5zZWxlY3Rpb25TdGFydD10LHIuc2VsZWN0aW9uRW5kPU1hdGgubWluKGUsci52YWx1ZS5sZW5ndGgpO2Vsc2UgaWYoZT0odD1yLm93bmVyRG9jdW1lbnR8fGRvY3VtZW50KSYmdC5kZWZhdWx0Vmlld3x8d2luZG93LGUuZ2V0U2VsZWN0aW9uKXtlPWUuZ2V0U2VsZWN0aW9uKCk7dmFyIG89ci50ZXh0Q29udGVudC5sZW5ndGgsdT1NYXRoLm1pbihsLnN0YXJ0LG8pO2w9bC5lbmQ9PT12b2lkIDA/dTpNYXRoLm1pbihsLmVuZCxvKSwhZS5leHRlbmQmJnU+bCYmKG89bCxsPXUsdT1vKSxvPWx1KHIsdSk7dmFyIGQ9bHUocixsKTtvJiZkJiYoZS5yYW5nZUNvdW50IT09MXx8ZS5hbmNob3JOb2RlIT09by5ub2RlfHxlLmFuY2hvck9mZnNldCE9PW8ub2Zmc2V0fHxlLmZvY3VzTm9kZSE9PWQubm9kZXx8ZS5mb2N1c09mZnNldCE9PWQub2Zmc2V0KSYmKHQ9dC5jcmVhdGVSYW5nZSgpLHQuc2V0U3RhcnQoby5ub2RlLG8ub2Zmc2V0KSxlLnJlbW92ZUFsbFJhbmdlcygpLHU+bD8oZS5hZGRSYW5nZSh0KSxlLmV4dGVuZChkLm5vZGUsZC5vZmZzZXQpKToodC5zZXRFbmQoZC5ub2RlLGQub2Zmc2V0KSxlLmFkZFJhbmdlKHQpKSl9fWZvcih0PVtdLGU9cjtlPWUucGFyZW50Tm9kZTspZS5ub2RlVHlwZT09PTEmJnQucHVzaCh7ZWxlbWVudDplLGxlZnQ6ZS5zY3JvbGxMZWZ0LHRvcDplLnNjcm9sbFRvcH0pO2Zvcih0eXBlb2Ygci5mb2N1cz09ImZ1bmN0aW9uIiYmci5mb2N1cygpLHI9MDtyPHQubGVuZ3RoO3IrKyllPXRbcl0sZS5lbGVtZW50LnNjcm9sbExlZnQ9ZS5sZWZ0LGUuZWxlbWVudC5zY3JvbGxUb3A9ZS50b3B9fXZhciBkMD1mJiYiZG9jdW1lbnRNb2RlImluIGRvY3VtZW50JiYxMT49ZG9jdW1lbnQuZG9jdW1lbnRNb2RlLGNyPW51bGwsamE9bnVsbCxKcj1udWxsLGJhPSExO2Z1bmN0aW9uIGl1KGUsdCxyKXt2YXIgbD1yLndpbmRvdz09PXI/ci5kb2N1bWVudDpyLm5vZGVUeXBlPT09OT9yOnIub3duZXJEb2N1bWVudDtiYXx8Y3I9PW51bGx8fGNyIT09dmUobCl8fChsPWNyLCJzZWxlY3Rpb25TdGFydCJpbiBsJiZTYShsKT9sPXtzdGFydDpsLnNlbGVjdGlvblN0YXJ0LGVuZDpsLnNlbGVjdGlvbkVuZH06KGw9KGwub3duZXJEb2N1bWVudCYmbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3fHx3aW5kb3cpLmdldFNlbGVjdGlvbigpLGw9e2FuY2hvck5vZGU6bC5hbmNob3JOb2RlLGFuY2hvck9mZnNldDpsLmFuY2hvck9mZnNldCxmb2N1c05vZGU6bC5mb2N1c05vZGUsZm9jdXNPZmZzZXQ6bC5mb2N1c09mZnNldH0pLEpyJiZacihKcixsKXx8KEpyPWwsbD1KbChqYSwib25TZWxlY3QiKSwwPGwubGVuZ3RoJiYodD1uZXcgaGEoIm9uU2VsZWN0Iiwic2VsZWN0IixudWxsLHQsciksZS5wdXNoKHtldmVudDp0LGxpc3RlbmVyczpsfSksdC50YXJnZXQ9Y3IpKSl9ZnVuY3Rpb24gWWwoZSx0KXt2YXIgcj17fTtyZXR1cm4gcltlLnRvTG93ZXJDYXNlKCldPXQudG9Mb3dlckNhc2UoKSxyWyJXZWJraXQiK2VdPSJ3ZWJraXQiK3QsclsiTW96IitlXT0ibW96Iit0LHJ9dmFyIGZyPXthbmltYXRpb25lbmQ6WWwoIkFuaW1hdGlvbiIsIkFuaW1hdGlvbkVuZCIpLGFuaW1hdGlvbml0ZXJhdGlvbjpZbCgiQW5pbWF0aW9uIiwiQW5pbWF0aW9uSXRlcmF0aW9uIiksYW5pbWF0aW9uc3RhcnQ6WWwoIkFuaW1hdGlvbiIsIkFuaW1hdGlvblN0YXJ0IiksdHJhbnNpdGlvbmVuZDpZbCgiVHJhbnNpdGlvbiIsIlRyYW5zaXRpb25FbmQiKX0sTmE9e30sb3U9e307ZiYmKG91PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImRpdiIpLnN0eWxlLCJBbmltYXRpb25FdmVudCJpbiB3aW5kb3d8fChkZWxldGUgZnIuYW5pbWF0aW9uZW5kLmFuaW1hdGlvbixkZWxldGUgZnIuYW5pbWF0aW9uaXRlcmF0aW9uLmFuaW1hdGlvbixkZWxldGUgZnIuYW5pbWF0aW9uc3RhcnQuYW5pbWF0aW9uKSwiVHJhbnNpdGlvbkV2ZW50ImluIHdpbmRvd3x8ZGVsZXRlIGZyLnRyYW5zaXRpb25lbmQudHJhbnNpdGlvbik7ZnVuY3Rpb24gWGwoZSl7aWYoTmFbZV0pcmV0dXJuIE5hW2VdO2lmKCFmcltlXSlyZXR1cm4gZTt2YXIgdD1mcltlXSxyO2ZvcihyIGluIHQpaWYodC5oYXNPd25Qcm9wZXJ0eShyKSYmciBpbiBvdSlyZXR1cm4gTmFbZV09dFtyXTtyZXR1cm4gZX12YXIgdXU9WGwoImFuaW1hdGlvbmVuZCIpLGN1PVhsKCJhbmltYXRpb25pdGVyYXRpb24iKSxmdT1YbCgiYW5pbWF0aW9uc3RhcnQiKSxkdT1YbCgidHJhbnNpdGlvbmVuZCIpLHB1PW5ldyBNYXAsaHU9ImFib3J0IGF1eENsaWNrIGNhbmNlbCBjYW5QbGF5IGNhblBsYXlUaHJvdWdoIGNsaWNrIGNsb3NlIGNvbnRleHRNZW51IGNvcHkgY3V0IGRyYWcgZHJhZ0VuZCBkcmFnRW50ZXIgZHJhZ0V4aXQgZHJhZ0xlYXZlIGRyYWdPdmVyIGRyYWdTdGFydCBkcm9wIGR1cmF0aW9uQ2hhbmdlIGVtcHRpZWQgZW5jcnlwdGVkIGVuZGVkIGVycm9yIGdvdFBvaW50ZXJDYXB0dXJlIGlucHV0IGludmFsaWQga2V5RG93biBrZXlQcmVzcyBrZXlVcCBsb2FkIGxvYWRlZERhdGEgbG9hZGVkTWV0YWRhdGEgbG9hZFN0YXJ0IGxvc3RQb2ludGVyQ2FwdHVyZSBtb3VzZURvd24gbW91c2VNb3ZlIG1vdXNlT3V0IG1vdXNlT3ZlciBtb3VzZVVwIHBhc3RlIHBhdXNlIHBsYXkgcGxheWluZyBwb2ludGVyQ2FuY2VsIHBvaW50ZXJEb3duIHBvaW50ZXJNb3ZlIHBvaW50ZXJPdXQgcG9pbnRlck92ZXIgcG9pbnRlclVwIHByb2dyZXNzIHJhdGVDaGFuZ2UgcmVzZXQgcmVzaXplIHNlZWtlZCBzZWVraW5nIHN0YWxsZWQgc3VibWl0IHN1c3BlbmQgdGltZVVwZGF0ZSB0b3VjaENhbmNlbCB0b3VjaEVuZCB0b3VjaFN0YXJ0IHZvbHVtZUNoYW5nZSBzY3JvbGwgdG9nZ2xlIHRvdWNoTW92ZSB3YWl0aW5nIHdoZWVsIi5zcGxpdCgiICIpO2Z1bmN0aW9uIENuKGUsdCl7cHUuc2V0KGUsdCkscCh0LFtlXSl9Zm9yKHZhciBDYT0wO0NhPGh1Lmxlbmd0aDtDYSsrKXt2YXIgTWE9aHVbQ2FdLHAwPU1hLnRvTG93ZXJDYXNlKCksaDA9TWFbMF0udG9VcHBlckNhc2UoKStNYS5zbGljZSgxKTtDbihwMCwib24iK2gwKX1Dbih1dSwib25BbmltYXRpb25FbmQiKSxDbihjdSwib25BbmltYXRpb25JdGVyYXRpb24iKSxDbihmdSwib25BbmltYXRpb25TdGFydCIpLENuKCJkYmxjbGljayIsIm9uRG91YmxlQ2xpY2siKSxDbigiZm9jdXNpbiIsIm9uRm9jdXMiKSxDbigiZm9jdXNvdXQiLCJvbkJsdXIiKSxDbihkdSwib25UcmFuc2l0aW9uRW5kIiksbSgib25Nb3VzZUVudGVyIixbIm1vdXNlb3V0IiwibW91c2VvdmVyIl0pLG0oIm9uTW91c2VMZWF2ZSIsWyJtb3VzZW91dCIsIm1vdXNlb3ZlciJdKSxtKCJvblBvaW50ZXJFbnRlciIsWyJwb2ludGVyb3V0IiwicG9pbnRlcm92ZXIiXSksbSgib25Qb2ludGVyTGVhdmUiLFsicG9pbnRlcm91dCIsInBvaW50ZXJvdmVyIl0pLHAoIm9uQ2hhbmdlIiwiY2hhbmdlIGNsaWNrIGZvY3VzaW4gZm9jdXNvdXQgaW5wdXQga2V5ZG93biBrZXl1cCBzZWxlY3Rpb25jaGFuZ2UiLnNwbGl0KCIgIikpLHAoIm9uU2VsZWN0IiwiZm9jdXNvdXQgY29udGV4dG1lbnUgZHJhZ2VuZCBmb2N1c2luIGtleWRvd24ga2V5dXAgbW91c2Vkb3duIG1vdXNldXAgc2VsZWN0aW9uY2hhbmdlIi5zcGxpdCgiICIpKSxwKCJvbkJlZm9yZUlucHV0IixbImNvbXBvc2l0aW9uZW5kIiwia2V5cHJlc3MiLCJ0ZXh0SW5wdXQiLCJwYXN0ZSJdKSxwKCJvbkNvbXBvc2l0aW9uRW5kIiwiY29tcG9zaXRpb25lbmQgZm9jdXNvdXQga2V5ZG93biBrZXlwcmVzcyBrZXl1cCBtb3VzZWRvd24iLnNwbGl0KCIgIikpLHAoIm9uQ29tcG9zaXRpb25TdGFydCIsImNvbXBvc2l0aW9uc3RhcnQgZm9jdXNvdXQga2V5ZG93biBrZXlwcmVzcyBrZXl1cCBtb3VzZWRvd24iLnNwbGl0KCIgIikpLHAoIm9uQ29tcG9zaXRpb25VcGRhdGUiLCJjb21wb3NpdGlvbnVwZGF0ZSBmb2N1c291dCBrZXlkb3duIGtleXByZXNzIGtleXVwIG1vdXNlZG93biIuc3BsaXQoIiAiKSk7dmFyIGVsPSJhYm9ydCBjYW5wbGF5IGNhbnBsYXl0aHJvdWdoIGR1cmF0aW9uY2hhbmdlIGVtcHRpZWQgZW5jcnlwdGVkIGVuZGVkIGVycm9yIGxvYWRlZGRhdGEgbG9hZGVkbWV0YWRhdGEgbG9hZHN0YXJ0IHBhdXNlIHBsYXkgcGxheWluZyBwcm9ncmVzcyByYXRlY2hhbmdlIHJlc2l6ZSBzZWVrZWQgc2Vla2luZyBzdGFsbGVkIHN1c3BlbmQgdGltZXVwZGF0ZSB2b2x1bWVjaGFuZ2Ugd2FpdGluZyIuc3BsaXQoIiAiKSxtMD1uZXcgU2V0KCJjYW5jZWwgY2xvc2UgaW52YWxpZCBsb2FkIHNjcm9sbCB0b2dnbGUiLnNwbGl0KCIgIikuY29uY2F0KGVsKSk7ZnVuY3Rpb24gbXUoZSx0LHIpe3ZhciBsPWUudHlwZXx8InVua25vd24tZXZlbnQiO2UuY3VycmVudFRhcmdldD1yLHBkKGwsdCx2b2lkIDAsZSksZS5jdXJyZW50VGFyZ2V0PW51bGx9ZnVuY3Rpb24gZ3UoZSx0KXt0PSh0JjQpIT09MDtmb3IodmFyIHI9MDtyPGUubGVuZ3RoO3IrKyl7dmFyIGw9ZVtyXSxvPWwuZXZlbnQ7bD1sLmxpc3RlbmVycztlOnt2YXIgdT12b2lkIDA7aWYodClmb3IodmFyIGQ9bC5sZW5ndGgtMTswPD1kO2QtLSl7dmFyIHk9bFtkXSx3PXkuaW5zdGFuY2UsTT15LmN1cnJlbnRUYXJnZXQ7aWYoeT15Lmxpc3RlbmVyLHchPT11JiZvLmlzUHJvcGFnYXRpb25TdG9wcGVkKCkpYnJlYWsgZTttdShvLHksTSksdT13fWVsc2UgZm9yKGQ9MDtkPGwubGVuZ3RoO2QrKyl7aWYoeT1sW2RdLHc9eS5pbnN0YW5jZSxNPXkuY3VycmVudFRhcmdldCx5PXkubGlzdGVuZXIsdyE9PXUmJm8uaXNQcm9wYWdhdGlvblN0b3BwZWQoKSlicmVhayBlO211KG8seSxNKSx1PXd9fX1pZihJbCl0aHJvdyBlPWxhLElsPSExLGxhPW51bGwsZX1mdW5jdGlvbiBWZShlLHQpe3ZhciByPXRbSWFdO3I9PT12b2lkIDAmJihyPXRbSWFdPW5ldyBTZXQpO3ZhciBsPWUrIl9fYnViYmxlIjtyLmhhcyhsKXx8KHZ1KHQsZSwyLCExKSxyLmFkZChsKSl9ZnVuY3Rpb24gUmEoZSx0LHIpe3ZhciBsPTA7dCYmKGx8PTQpLHZ1KHIsZSxsLHQpfXZhciBabD0iX3JlYWN0TGlzdGVuaW5nIitNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTtmdW5jdGlvbiB0bChlKXtpZighZVtabF0pe2VbWmxdPSEwLGMuZm9yRWFjaChmdW5jdGlvbihyKXtyIT09InNlbGVjdGlvbmNoYW5nZSImJihtMC5oYXMocil8fFJhKHIsITEsZSksUmEociwhMCxlKSl9KTt2YXIgdD1lLm5vZGVUeXBlPT09OT9lOmUub3duZXJEb2N1bWVudDt0PT09bnVsbHx8dFtabF18fCh0W1psXT0hMCxSYSgic2VsZWN0aW9uY2hhbmdlIiwhMSx0KSl9fWZ1bmN0aW9uIHZ1KGUsdCxyLGwpe3N3aXRjaChCbyh0KSl7Y2FzZSAxOnZhciBvPVRkO2JyZWFrO2Nhc2UgNDpvPUVkO2JyZWFrO2RlZmF1bHQ6bz1mYX1yPW8uYmluZChudWxsLHQscixlKSxvPXZvaWQgMCwhcmF8fHQhPT0idG91Y2hzdGFydCImJnQhPT0idG91Y2htb3ZlIiYmdCE9PSJ3aGVlbCJ8fChvPSEwKSxsP28hPT12b2lkIDA/ZS5hZGRFdmVudExpc3RlbmVyKHQscix7Y2FwdHVyZTohMCxwYXNzaXZlOm99KTplLmFkZEV2ZW50TGlzdGVuZXIodCxyLCEwKTpvIT09dm9pZCAwP2UuYWRkRXZlbnRMaXN0ZW5lcih0LHIse3Bhc3NpdmU6b30pOmUuYWRkRXZlbnRMaXN0ZW5lcih0LHIsITEpfWZ1bmN0aW9uIFRhKGUsdCxyLGwsbyl7dmFyIHU9bDtpZigodCYxKT09PTAmJih0JjIpPT09MCYmbCE9PW51bGwpZTpmb3IoOzspe2lmKGw9PT1udWxsKXJldHVybjt2YXIgZD1sLnRhZztpZihkPT09M3x8ZD09PTQpe3ZhciB5PWwuc3RhdGVOb2RlLmNvbnRhaW5lckluZm87aWYoeT09PW98fHkubm9kZVR5cGU9PT04JiZ5LnBhcmVudE5vZGU9PT1vKWJyZWFrO2lmKGQ9PT00KWZvcihkPWwucmV0dXJuO2QhPT1udWxsOyl7dmFyIHc9ZC50YWc7aWYoKHc9PT0zfHx3PT09NCkmJih3PWQuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sdz09PW98fHcubm9kZVR5cGU9PT04JiZ3LnBhcmVudE5vZGU9PT1vKSlyZXR1cm47ZD1kLnJldHVybn1mb3IoO3khPT1udWxsOyl7aWYoZD1Wbih5KSxkPT09bnVsbClyZXR1cm47aWYodz1kLnRhZyx3PT09NXx8dz09PTYpe2w9dT1kO2NvbnRpbnVlIGV9eT15LnBhcmVudE5vZGV9fWw9bC5yZXR1cm59U28oZnVuY3Rpb24oKXt2YXIgTT11LEw9ZWEociksRD1bXTtlOnt2YXIgRT1wdS5nZXQoZSk7aWYoRSE9PXZvaWQgMCl7dmFyIFE9aGEsSj1lO3N3aXRjaChlKXtjYXNlImtleXByZXNzIjppZihHbChyKT09PTApYnJlYWsgZTtjYXNlImtleWRvd24iOmNhc2Uia2V5dXAiOlE9VmQ7YnJlYWs7Y2FzZSJmb2N1c2luIjpKPSJmb2N1cyIsUT12YTticmVhaztjYXNlImZvY3Vzb3V0IjpKPSJibHVyIixRPXZhO2JyZWFrO2Nhc2UiYmVmb3JlYmx1ciI6Y2FzZSJhZnRlcmJsdXIiOlE9dmE7YnJlYWs7Y2FzZSJjbGljayI6aWYoci5idXR0b249PT0yKWJyZWFrIGU7Y2FzZSJhdXhjbGljayI6Y2FzZSJkYmxjbGljayI6Y2FzZSJtb3VzZWRvd24iOmNhc2UibW91c2Vtb3ZlIjpjYXNlIm1vdXNldXAiOmNhc2UibW91c2VvdXQiOmNhc2UibW91c2VvdmVyIjpjYXNlImNvbnRleHRtZW51IjpRPVVvO2JyZWFrO2Nhc2UiZHJhZyI6Y2FzZSJkcmFnZW5kIjpjYXNlImRyYWdlbnRlciI6Y2FzZSJkcmFnZXhpdCI6Y2FzZSJkcmFnbGVhdmUiOmNhc2UiZHJhZ292ZXIiOmNhc2UiZHJhZ3N0YXJ0IjpjYXNlImRyb3AiOlE9X2Q7YnJlYWs7Y2FzZSJ0b3VjaGNhbmNlbCI6Y2FzZSJ0b3VjaGVuZCI6Y2FzZSJ0b3VjaG1vdmUiOmNhc2UidG91Y2hzdGFydCI6UT1xZDticmVhaztjYXNlIHV1OmNhc2UgY3U6Y2FzZSBmdTpRPURkO2JyZWFrO2Nhc2UgZHU6UT1ZZDticmVhaztjYXNlInNjcm9sbCI6UT1QZDticmVhaztjYXNlIndoZWVsIjpRPVpkO2JyZWFrO2Nhc2UiY29weSI6Y2FzZSJjdXQiOmNhc2UicGFzdGUiOlE9T2Q7YnJlYWs7Y2FzZSJnb3Rwb2ludGVyY2FwdHVyZSI6Y2FzZSJsb3N0cG9pbnRlcmNhcHR1cmUiOmNhc2UicG9pbnRlcmNhbmNlbCI6Y2FzZSJwb2ludGVyZG93biI6Y2FzZSJwb2ludGVybW92ZSI6Y2FzZSJwb2ludGVyb3V0IjpjYXNlInBvaW50ZXJvdmVyIjpjYXNlInBvaW50ZXJ1cCI6UT1Wb312YXIgbmU9KHQmNCkhPT0wLG50PSFuZSYmZT09PSJzY3JvbGwiLE49bmU/RSE9PW51bGw/RSsiQ2FwdHVyZSI6bnVsbDpFO25lPVtdO2Zvcih2YXIgUz1NLEM7UyE9PW51bGw7KXtDPVM7dmFyIHo9Qy5zdGF0ZU5vZGU7aWYoQy50YWc9PT01JiZ6IT09bnVsbCYmKEM9eixOIT09bnVsbCYmKHo9enIoUyxOKSx6IT1udWxsJiZuZS5wdXNoKG5sKFMseixDKSkpKSxudClicmVhaztTPVMucmV0dXJufTA8bmUubGVuZ3RoJiYoRT1uZXcgUShFLEosbnVsbCxyLEwpLEQucHVzaCh7ZXZlbnQ6RSxsaXN0ZW5lcnM6bmV9KSl9fWlmKCh0JjcpPT09MCl7ZTp7aWYoRT1lPT09Im1vdXNlb3ZlciJ8fGU9PT0icG9pbnRlcm92ZXIiLFE9ZT09PSJtb3VzZW91dCJ8fGU9PT0icG9pbnRlcm91dCIsRSYmciE9PUpzJiYoSj1yLnJlbGF0ZWRUYXJnZXR8fHIuZnJvbUVsZW1lbnQpJiYoVm4oSil8fEpbb25dKSlicmVhayBlO2lmKChRfHxFKSYmKEU9TC53aW5kb3c9PT1MP0w6KEU9TC5vd25lckRvY3VtZW50KT9FLmRlZmF1bHRWaWV3fHxFLnBhcmVudFdpbmRvdzp3aW5kb3csUT8oSj1yLnJlbGF0ZWRUYXJnZXR8fHIudG9FbGVtZW50LFE9TSxKPUo/Vm4oSik6bnVsbCxKIT09bnVsbCYmKG50PUhuKEopLEohPT1udHx8Si50YWchPT01JiZKLnRhZyE9PTYpJiYoSj1udWxsKSk6KFE9bnVsbCxKPU0pLFEhPT1KKSl7aWYobmU9VW8sej0ib25Nb3VzZUxlYXZlIixOPSJvbk1vdXNlRW50ZXIiLFM9Im1vdXNlIiwoZT09PSJwb2ludGVyb3V0Inx8ZT09PSJwb2ludGVyb3ZlciIpJiYobmU9Vm8sej0ib25Qb2ludGVyTGVhdmUiLE49Im9uUG9pbnRlckVudGVyIixTPSJwb2ludGVyIiksbnQ9UT09bnVsbD9FOmhyKFEpLEM9Sj09bnVsbD9FOmhyKEopLEU9bmV3IG5lKHosUysibGVhdmUiLFEscixMKSxFLnRhcmdldD1udCxFLnJlbGF0ZWRUYXJnZXQ9Qyx6PW51bGwsVm4oTCk9PT1NJiYobmU9bmV3IG5lKE4sUysiZW50ZXIiLEoscixMKSxuZS50YXJnZXQ9QyxuZS5yZWxhdGVkVGFyZ2V0PW50LHo9bmUpLG50PXosUSYmSil0Ontmb3IobmU9USxOPUosUz0wLEM9bmU7QztDPWRyKEMpKVMrKztmb3IoQz0wLHo9Tjt6O3o9ZHIoeikpQysrO2Zvcig7MDxTLUM7KW5lPWRyKG5lKSxTLS07Zm9yKDswPEMtUzspTj1kcihOKSxDLS07Zm9yKDtTLS07KXtpZihuZT09PU58fE4hPT1udWxsJiZuZT09PU4uYWx0ZXJuYXRlKWJyZWFrIHQ7bmU9ZHIobmUpLE49ZHIoTil9bmU9bnVsbH1lbHNlIG5lPW51bGw7USE9PW51bGwmJnl1KEQsRSxRLG5lLCExKSxKIT09bnVsbCYmbnQhPT1udWxsJiZ5dShELG50LEosbmUsITApfX1lOntpZihFPU0/aHIoTSk6d2luZG93LFE9RS5ub2RlTmFtZSYmRS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpLFE9PT0ic2VsZWN0Inx8UT09PSJpbnB1dCImJkUudHlwZT09PSJmaWxlIil2YXIgc2U9czA7ZWxzZSBpZihYbyhFKSlpZihKbylzZT11MDtlbHNle3NlPWkwO3ZhciBjZT1hMH1lbHNlKFE9RS5ub2RlTmFtZSkmJlEudG9Mb3dlckNhc2UoKT09PSJpbnB1dCImJihFLnR5cGU9PT0iY2hlY2tib3gifHxFLnR5cGU9PT0icmFkaW8iKSYmKHNlPW8wKTtpZihzZSYmKHNlPXNlKGUsTSkpKXtabyhELHNlLHIsTCk7YnJlYWsgZX1jZSYmY2UoZSxFLE0pLGU9PT0iZm9jdXNvdXQiJiYoY2U9RS5fd3JhcHBlclN0YXRlKSYmY2UuY29udHJvbGxlZCYmRS50eXBlPT09Im51bWJlciImJk5lKEUsIm51bWJlciIsRS52YWx1ZSl9c3dpdGNoKGNlPU0/aHIoTSk6d2luZG93LGUpe2Nhc2UiZm9jdXNpbiI6KFhvKGNlKXx8Y2UuY29udGVudEVkaXRhYmxlPT09InRydWUiKSYmKGNyPWNlLGphPU0sSnI9bnVsbCk7YnJlYWs7Y2FzZSJmb2N1c291dCI6SnI9amE9Y3I9bnVsbDticmVhaztjYXNlIm1vdXNlZG93biI6YmE9ITA7YnJlYWs7Y2FzZSJjb250ZXh0bWVudSI6Y2FzZSJtb3VzZXVwIjpjYXNlImRyYWdlbmQiOmJhPSExLGl1KEQscixMKTticmVhaztjYXNlInNlbGVjdGlvbmNoYW5nZSI6aWYoZDApYnJlYWs7Y2FzZSJrZXlkb3duIjpjYXNlImtleXVwIjppdShELHIsTCl9dmFyIGZlO2lmKHhhKWU6e3N3aXRjaChlKXtjYXNlImNvbXBvc2l0aW9uc3RhcnQiOnZhciB5ZT0ib25Db21wb3NpdGlvblN0YXJ0IjticmVhayBlO2Nhc2UiY29tcG9zaXRpb25lbmQiOnllPSJvbkNvbXBvc2l0aW9uRW5kIjticmVhayBlO2Nhc2UiY29tcG9zaXRpb251cGRhdGUiOnllPSJvbkNvbXBvc2l0aW9uVXBkYXRlIjticmVhayBlfXllPXZvaWQgMH1lbHNlIHVyP1FvKGUscikmJih5ZT0ib25Db21wb3NpdGlvbkVuZCIpOmU9PT0ia2V5ZG93biImJnIua2V5Q29kZT09PTIyOSYmKHllPSJvbkNvbXBvc2l0aW9uU3RhcnQiKTt5ZSYmKEdvJiZyLmxvY2FsZSE9PSJrbyImJih1cnx8eWUhPT0ib25Db21wb3NpdGlvblN0YXJ0Ij95ZT09PSJvbkNvbXBvc2l0aW9uRW5kIiYmdXImJihmZT0kbygpKTooTm49TCxwYT0idmFsdWUiaW4gTm4/Tm4udmFsdWU6Tm4udGV4dENvbnRlbnQsdXI9ITApKSxjZT1KbChNLHllKSwwPGNlLmxlbmd0aCYmKHllPW5ldyBIbyh5ZSxlLG51bGwscixMKSxELnB1c2goe2V2ZW50OnllLGxpc3RlbmVyczpjZX0pLGZlP3llLmRhdGE9ZmU6KGZlPVlvKHIpLGZlIT09bnVsbCYmKHllLmRhdGE9ZmUpKSkpLChmZT1lMD90MChlLHIpOm4wKGUscikpJiYoTT1KbChNLCJvbkJlZm9yZUlucHV0IiksMDxNLmxlbmd0aCYmKEw9bmV3IEhvKCJvbkJlZm9yZUlucHV0IiwiYmVmb3JlaW5wdXQiLG51bGwscixMKSxELnB1c2goe2V2ZW50OkwsbGlzdGVuZXJzOk19KSxMLmRhdGE9ZmUpKX1ndShELHQpfSl9ZnVuY3Rpb24gbmwoZSx0LHIpe3JldHVybntpbnN0YW5jZTplLGxpc3RlbmVyOnQsY3VycmVudFRhcmdldDpyfX1mdW5jdGlvbiBKbChlLHQpe2Zvcih2YXIgcj10KyJDYXB0dXJlIixsPVtdO2UhPT1udWxsOyl7dmFyIG89ZSx1PW8uc3RhdGVOb2RlO28udGFnPT09NSYmdSE9PW51bGwmJihvPXUsdT16cihlLHIpLHUhPW51bGwmJmwudW5zaGlmdChubChlLHUsbykpLHU9enIoZSx0KSx1IT1udWxsJiZsLnB1c2gobmwoZSx1LG8pKSksZT1lLnJldHVybn1yZXR1cm4gbH1mdW5jdGlvbiBkcihlKXtpZihlPT09bnVsbClyZXR1cm4gbnVsbDtkbyBlPWUucmV0dXJuO3doaWxlKGUmJmUudGFnIT09NSk7cmV0dXJuIGV8fG51bGx9ZnVuY3Rpb24geXUoZSx0LHIsbCxvKXtmb3IodmFyIHU9dC5fcmVhY3ROYW1lLGQ9W107ciE9PW51bGwmJnIhPT1sOyl7dmFyIHk9cix3PXkuYWx0ZXJuYXRlLE09eS5zdGF0ZU5vZGU7aWYodyE9PW51bGwmJnc9PT1sKWJyZWFrO3kudGFnPT09NSYmTSE9PW51bGwmJih5PU0sbz8odz16cihyLHUpLHchPW51bGwmJmQudW5zaGlmdChubChyLHcseSkpKTpvfHwodz16cihyLHUpLHchPW51bGwmJmQucHVzaChubChyLHcseSkpKSkscj1yLnJldHVybn1kLmxlbmd0aCE9PTAmJmUucHVzaCh7ZXZlbnQ6dCxsaXN0ZW5lcnM6ZH0pfXZhciBnMD0vXHJcbj8vZyx2MD0vXHUwMDAwfFx1RkZGRC9nO2Z1bmN0aW9uIHh1KGUpe3JldHVybih0eXBlb2YgZT09InN0cmluZyI/ZToiIitlKS5yZXBsYWNlKGcwLGAKYCkucmVwbGFjZSh2MCwiIil9ZnVuY3Rpb24gZXMoZSx0LHIpe2lmKHQ9eHUodCkseHUoZSkhPT10JiZyKXRocm93IEVycm9yKGkoNDI1KSl9ZnVuY3Rpb24gdHMoKXt9dmFyIEVhPW51bGwsUGE9bnVsbDtmdW5jdGlvbiBMYShlLHQpe3JldHVybiBlPT09InRleHRhcmVhInx8ZT09PSJub3NjcmlwdCJ8fHR5cGVvZiB0LmNoaWxkcmVuPT0ic3RyaW5nInx8dHlwZW9mIHQuY2hpbGRyZW49PSJudW1iZXIifHx0eXBlb2YgdC5kYW5nZXJvdXNseVNldElubmVySFRNTD09Im9iamVjdCImJnQuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwhPT1udWxsJiZ0LmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MLl9faHRtbCE9bnVsbH12YXIgX2E9dHlwZW9mIHNldFRpbWVvdXQ9PSJmdW5jdGlvbiI/c2V0VGltZW91dDp2b2lkIDAseTA9dHlwZW9mIGNsZWFyVGltZW91dD09ImZ1bmN0aW9uIj9jbGVhclRpbWVvdXQ6dm9pZCAwLHd1PXR5cGVvZiBQcm9taXNlPT0iZnVuY3Rpb24iP1Byb21pc2U6dm9pZCAwLHgwPXR5cGVvZiBxdWV1ZU1pY3JvdGFzaz09ImZ1bmN0aW9uIj9xdWV1ZU1pY3JvdGFzazp0eXBlb2Ygd3U8InUiP2Z1bmN0aW9uKGUpe3JldHVybiB3dS5yZXNvbHZlKG51bGwpLnRoZW4oZSkuY2F0Y2godzApfTpfYTtmdW5jdGlvbiB3MChlKXtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dGhyb3cgZX0pfWZ1bmN0aW9uIEFhKGUsdCl7dmFyIHI9dCxsPTA7ZG97dmFyIG89ci5uZXh0U2libGluZztpZihlLnJlbW92ZUNoaWxkKHIpLG8mJm8ubm9kZVR5cGU9PT04KWlmKHI9by5kYXRhLHI9PT0iLyQiKXtpZihsPT09MCl7ZS5yZW1vdmVDaGlsZChvKSxHcih0KTtyZXR1cm59bC0tfWVsc2UgciE9PSIkIiYmciE9PSIkPyImJnIhPT0iJCEifHxsKys7cj1vfXdoaWxlKHIpO0dyKHQpfWZ1bmN0aW9uIE1uKGUpe2Zvcig7ZSE9bnVsbDtlPWUubmV4dFNpYmxpbmcpe3ZhciB0PWUubm9kZVR5cGU7aWYodD09PTF8fHQ9PT0zKWJyZWFrO2lmKHQ9PT04KXtpZih0PWUuZGF0YSx0PT09IiQifHx0PT09IiQhInx8dD09PSIkPyIpYnJlYWs7aWYodD09PSIvJCIpcmV0dXJuIG51bGx9fXJldHVybiBlfWZ1bmN0aW9uIGt1KGUpe2U9ZS5wcmV2aW91c1NpYmxpbmc7Zm9yKHZhciB0PTA7ZTspe2lmKGUubm9kZVR5cGU9PT04KXt2YXIgcj1lLmRhdGE7aWYocj09PSIkInx8cj09PSIkISJ8fHI9PT0iJD8iKXtpZih0PT09MClyZXR1cm4gZTt0LS19ZWxzZSByPT09Ii8kIiYmdCsrfWU9ZS5wcmV2aW91c1NpYmxpbmd9cmV0dXJuIG51bGx9dmFyIHByPU1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpLFh0PSJfX3JlYWN0RmliZXIkIitwcixybD0iX19yZWFjdFByb3BzJCIrcHIsb249Il9fcmVhY3RDb250YWluZXIkIitwcixJYT0iX19yZWFjdEV2ZW50cyQiK3ByLGswPSJfX3JlYWN0TGlzdGVuZXJzJCIrcHIsUzA9Il9fcmVhY3RIYW5kbGVzJCIrcHI7ZnVuY3Rpb24gVm4oZSl7dmFyIHQ9ZVtYdF07aWYodClyZXR1cm4gdDtmb3IodmFyIHI9ZS5wYXJlbnROb2RlO3I7KXtpZih0PXJbb25dfHxyW1h0XSl7aWYocj10LmFsdGVybmF0ZSx0LmNoaWxkIT09bnVsbHx8ciE9PW51bGwmJnIuY2hpbGQhPT1udWxsKWZvcihlPWt1KGUpO2UhPT1udWxsOyl7aWYocj1lW1h0XSlyZXR1cm4gcjtlPWt1KGUpfXJldHVybiB0fWU9cixyPWUucGFyZW50Tm9kZX1yZXR1cm4gbnVsbH1mdW5jdGlvbiBsbChlKXtyZXR1cm4gZT1lW1h0XXx8ZVtvbl0sIWV8fGUudGFnIT09NSYmZS50YWchPT02JiZlLnRhZyE9PTEzJiZlLnRhZyE9PTM/bnVsbDplfWZ1bmN0aW9uIGhyKGUpe2lmKGUudGFnPT09NXx8ZS50YWc9PT02KXJldHVybiBlLnN0YXRlTm9kZTt0aHJvdyBFcnJvcihpKDMzKSl9ZnVuY3Rpb24gbnMoZSl7cmV0dXJuIGVbcmxdfHxudWxsfXZhciBEYT1bXSxtcj0tMTtmdW5jdGlvbiBSbihlKXtyZXR1cm57Y3VycmVudDplfX1mdW5jdGlvbiBHZShlKXswPm1yfHwoZS5jdXJyZW50PURhW21yXSxEYVttcl09bnVsbCxtci0tKX1mdW5jdGlvbiBVZShlLHQpe21yKyssRGFbbXJdPWUuY3VycmVudCxlLmN1cnJlbnQ9dH12YXIgVG49e30sZ3Q9Um4oVG4pLGJ0PVJuKCExKSxHbj1UbjtmdW5jdGlvbiBncihlLHQpe3ZhciByPWUudHlwZS5jb250ZXh0VHlwZXM7aWYoIXIpcmV0dXJuIFRuO3ZhciBsPWUuc3RhdGVOb2RlO2lmKGwmJmwuX19yZWFjdEludGVybmFsTWVtb2l6ZWRVbm1hc2tlZENoaWxkQ29udGV4dD09PXQpcmV0dXJuIGwuX19yZWFjdEludGVybmFsTWVtb2l6ZWRNYXNrZWRDaGlsZENvbnRleHQ7dmFyIG89e30sdTtmb3IodSBpbiByKW9bdV09dFt1XTtyZXR1cm4gbCYmKGU9ZS5zdGF0ZU5vZGUsZS5fX3JlYWN0SW50ZXJuYWxNZW1vaXplZFVubWFza2VkQ2hpbGRDb250ZXh0PXQsZS5fX3JlYWN0SW50ZXJuYWxNZW1vaXplZE1hc2tlZENoaWxkQ29udGV4dD1vKSxvfWZ1bmN0aW9uIE50KGUpe3JldHVybiBlPWUuY2hpbGRDb250ZXh0VHlwZXMsZSE9bnVsbH1mdW5jdGlvbiBycygpe0dlKGJ0KSxHZShndCl9ZnVuY3Rpb24gU3UoZSx0LHIpe2lmKGd0LmN1cnJlbnQhPT1Ubil0aHJvdyBFcnJvcihpKDE2OCkpO1VlKGd0LHQpLFVlKGJ0LHIpfWZ1bmN0aW9uIGp1KGUsdCxyKXt2YXIgbD1lLnN0YXRlTm9kZTtpZih0PXQuY2hpbGRDb250ZXh0VHlwZXMsdHlwZW9mIGwuZ2V0Q2hpbGRDb250ZXh0IT0iZnVuY3Rpb24iKXJldHVybiByO2w9bC5nZXRDaGlsZENvbnRleHQoKTtmb3IodmFyIG8gaW4gbClpZighKG8gaW4gdCkpdGhyb3cgRXJyb3IoaSgxMDgsdWUoZSl8fCJVbmtub3duIixvKSk7cmV0dXJuIF8oe30scixsKX1mdW5jdGlvbiBscyhlKXtyZXR1cm4gZT0oZT1lLnN0YXRlTm9kZSkmJmUuX19yZWFjdEludGVybmFsTWVtb2l6ZWRNZXJnZWRDaGlsZENvbnRleHR8fFRuLEduPWd0LmN1cnJlbnQsVWUoZ3QsZSksVWUoYnQsYnQuY3VycmVudCksITB9ZnVuY3Rpb24gYnUoZSx0LHIpe3ZhciBsPWUuc3RhdGVOb2RlO2lmKCFsKXRocm93IEVycm9yKGkoMTY5KSk7cj8oZT1qdShlLHQsR24pLGwuX19yZWFjdEludGVybmFsTWVtb2l6ZWRNZXJnZWRDaGlsZENvbnRleHQ9ZSxHZShidCksR2UoZ3QpLFVlKGd0LGUpKTpHZShidCksVWUoYnQscil9dmFyIHVuPW51bGwsc3M9ITEsemE9ITE7ZnVuY3Rpb24gTnUoZSl7dW49PT1udWxsP3VuPVtlXTp1bi5wdXNoKGUpfWZ1bmN0aW9uIGowKGUpe3NzPSEwLE51KGUpfWZ1bmN0aW9uIEVuKCl7aWYoIXphJiZ1biE9PW51bGwpe3phPSEwO3ZhciBlPTAsdD1CZTt0cnl7dmFyIHI9dW47Zm9yKEJlPTE7ZTxyLmxlbmd0aDtlKyspe3ZhciBsPXJbZV07ZG8gbD1sKCEwKTt3aGlsZShsIT09bnVsbCl9dW49bnVsbCxzcz0hMX1jYXRjaChvKXt0aHJvdyB1biE9PW51bGwmJih1bj11bi5zbGljZShlKzEpKSxNbyhzYSxFbiksb31maW5hbGx5e0JlPXQsemE9ITF9fXJldHVybiBudWxsfXZhciB2cj1bXSx5cj0wLGFzPW51bGwsaXM9MCxJdD1bXSxEdD0wLEtuPW51bGwsY249MSxmbj0iIjtmdW5jdGlvbiBxbihlLHQpe3ZyW3lyKytdPWlzLHZyW3lyKytdPWFzLGFzPWUsaXM9dH1mdW5jdGlvbiBDdShlLHQscil7SXRbRHQrK109Y24sSXRbRHQrK109Zm4sSXRbRHQrK109S24sS249ZTt2YXIgbD1jbjtlPWZuO3ZhciBvPTMyLSR0KGwpLTE7bCY9figxPDxvKSxyKz0xO3ZhciB1PTMyLSR0KHQpK287aWYoMzA8dSl7dmFyIGQ9by1vJTU7dT0obCYoMTw8ZCktMSkudG9TdHJpbmcoMzIpLGw+Pj1kLG8tPWQsY249MTw8MzItJHQodCkrb3xyPDxvfGwsZm49dStlfWVsc2UgY249MTw8dXxyPDxvfGwsZm49ZX1mdW5jdGlvbiBPYShlKXtlLnJldHVybiE9PW51bGwmJihxbihlLDEpLEN1KGUsMSwwKSl9ZnVuY3Rpb24gRmEoZSl7Zm9yKDtlPT09YXM7KWFzPXZyWy0teXJdLHZyW3lyXT1udWxsLGlzPXZyWy0teXJdLHZyW3lyXT1udWxsO2Zvcig7ZT09PUtuOylLbj1JdFstLUR0XSxJdFtEdF09bnVsbCxmbj1JdFstLUR0XSxJdFtEdF09bnVsbCxjbj1JdFstLUR0XSxJdFtEdF09bnVsbH12YXIgTHQ9bnVsbCxfdD1udWxsLHFlPSExLFV0PW51bGw7ZnVuY3Rpb24gTXUoZSx0KXt2YXIgcj1CdCg1LG51bGwsbnVsbCwwKTtyLmVsZW1lbnRUeXBlPSJERUxFVEVEIixyLnN0YXRlTm9kZT10LHIucmV0dXJuPWUsdD1lLmRlbGV0aW9ucyx0PT09bnVsbD8oZS5kZWxldGlvbnM9W3JdLGUuZmxhZ3N8PTE2KTp0LnB1c2gocil9ZnVuY3Rpb24gUnUoZSx0KXtzd2l0Y2goZS50YWcpe2Nhc2UgNTp2YXIgcj1lLnR5cGU7cmV0dXJuIHQ9dC5ub2RlVHlwZSE9PTF8fHIudG9Mb3dlckNhc2UoKSE9PXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKT9udWxsOnQsdCE9PW51bGw/KGUuc3RhdGVOb2RlPXQsTHQ9ZSxfdD1Nbih0LmZpcnN0Q2hpbGQpLCEwKTohMTtjYXNlIDY6cmV0dXJuIHQ9ZS5wZW5kaW5nUHJvcHM9PT0iInx8dC5ub2RlVHlwZSE9PTM/bnVsbDp0LHQhPT1udWxsPyhlLnN0YXRlTm9kZT10LEx0PWUsX3Q9bnVsbCwhMCk6ITE7Y2FzZSAxMzpyZXR1cm4gdD10Lm5vZGVUeXBlIT09OD9udWxsOnQsdCE9PW51bGw/KHI9S24hPT1udWxsP3tpZDpjbixvdmVyZmxvdzpmbn06bnVsbCxlLm1lbW9pemVkU3RhdGU9e2RlaHlkcmF0ZWQ6dCx0cmVlQ29udGV4dDpyLHJldHJ5TGFuZToxMDczNzQxODI0fSxyPUJ0KDE4LG51bGwsbnVsbCwwKSxyLnN0YXRlTm9kZT10LHIucmV0dXJuPWUsZS5jaGlsZD1yLEx0PWUsX3Q9bnVsbCwhMCk6ITE7ZGVmYXVsdDpyZXR1cm4hMX19ZnVuY3Rpb24gQmEoZSl7cmV0dXJuKGUubW9kZSYxKSE9PTAmJihlLmZsYWdzJjEyOCk9PT0wfWZ1bmN0aW9uICRhKGUpe2lmKHFlKXt2YXIgdD1fdDtpZih0KXt2YXIgcj10O2lmKCFSdShlLHQpKXtpZihCYShlKSl0aHJvdyBFcnJvcihpKDQxOCkpO3Q9TW4oci5uZXh0U2libGluZyk7dmFyIGw9THQ7dCYmUnUoZSx0KT9NdShsLHIpOihlLmZsYWdzPWUuZmxhZ3MmLTQwOTd8MixxZT0hMSxMdD1lKX19ZWxzZXtpZihCYShlKSl0aHJvdyBFcnJvcihpKDQxOCkpO2UuZmxhZ3M9ZS5mbGFncyYtNDA5N3wyLHFlPSExLEx0PWV9fX1mdW5jdGlvbiBUdShlKXtmb3IoZT1lLnJldHVybjtlIT09bnVsbCYmZS50YWchPT01JiZlLnRhZyE9PTMmJmUudGFnIT09MTM7KWU9ZS5yZXR1cm47THQ9ZX1mdW5jdGlvbiBvcyhlKXtpZihlIT09THQpcmV0dXJuITE7aWYoIXFlKXJldHVybiBUdShlKSxxZT0hMCwhMTt2YXIgdDtpZigodD1lLnRhZyE9PTMpJiYhKHQ9ZS50YWchPT01KSYmKHQ9ZS50eXBlLHQ9dCE9PSJoZWFkIiYmdCE9PSJib2R5IiYmIUxhKGUudHlwZSxlLm1lbW9pemVkUHJvcHMpKSx0JiYodD1fdCkpe2lmKEJhKGUpKXRocm93IEV1KCksRXJyb3IoaSg0MTgpKTtmb3IoO3Q7KU11KGUsdCksdD1Nbih0Lm5leHRTaWJsaW5nKX1pZihUdShlKSxlLnRhZz09PTEzKXtpZihlPWUubWVtb2l6ZWRTdGF0ZSxlPWUhPT1udWxsP2UuZGVoeWRyYXRlZDpudWxsLCFlKXRocm93IEVycm9yKGkoMzE3KSk7ZTp7Zm9yKGU9ZS5uZXh0U2libGluZyx0PTA7ZTspe2lmKGUubm9kZVR5cGU9PT04KXt2YXIgcj1lLmRhdGE7aWYocj09PSIvJCIpe2lmKHQ9PT0wKXtfdD1NbihlLm5leHRTaWJsaW5nKTticmVhayBlfXQtLX1lbHNlIHIhPT0iJCImJnIhPT0iJCEiJiZyIT09IiQ/Inx8dCsrfWU9ZS5uZXh0U2libGluZ31fdD1udWxsfX1lbHNlIF90PUx0P01uKGUuc3RhdGVOb2RlLm5leHRTaWJsaW5nKTpudWxsO3JldHVybiEwfWZ1bmN0aW9uIEV1KCl7Zm9yKHZhciBlPV90O2U7KWU9TW4oZS5uZXh0U2libGluZyl9ZnVuY3Rpb24geHIoKXtfdD1MdD1udWxsLHFlPSExfWZ1bmN0aW9uIFdhKGUpe1V0PT09bnVsbD9VdD1bZV06VXQucHVzaChlKX12YXIgYjA9aGUuUmVhY3RDdXJyZW50QmF0Y2hDb25maWc7ZnVuY3Rpb24gc2woZSx0LHIpe2lmKGU9ci5yZWYsZSE9PW51bGwmJnR5cGVvZiBlIT0iZnVuY3Rpb24iJiZ0eXBlb2YgZSE9Im9iamVjdCIpe2lmKHIuX293bmVyKXtpZihyPXIuX293bmVyLHIpe2lmKHIudGFnIT09MSl0aHJvdyBFcnJvcihpKDMwOSkpO3ZhciBsPXIuc3RhdGVOb2RlfWlmKCFsKXRocm93IEVycm9yKGkoMTQ3LGUpKTt2YXIgbz1sLHU9IiIrZTtyZXR1cm4gdCE9PW51bGwmJnQucmVmIT09bnVsbCYmdHlwZW9mIHQucmVmPT0iZnVuY3Rpb24iJiZ0LnJlZi5fc3RyaW5nUmVmPT09dT90LnJlZjoodD1mdW5jdGlvbihkKXt2YXIgeT1vLnJlZnM7ZD09PW51bGw/ZGVsZXRlIHlbdV06eVt1XT1kfSx0Ll9zdHJpbmdSZWY9dSx0KX1pZih0eXBlb2YgZSE9InN0cmluZyIpdGhyb3cgRXJyb3IoaSgyODQpKTtpZighci5fb3duZXIpdGhyb3cgRXJyb3IoaSgyOTAsZSkpfXJldHVybiBlfWZ1bmN0aW9uIHVzKGUsdCl7dGhyb3cgZT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodCksRXJyb3IoaSgzMSxlPT09IltvYmplY3QgT2JqZWN0XSI/Im9iamVjdCB3aXRoIGtleXMgeyIrT2JqZWN0LmtleXModCkuam9pbigiLCAiKSsifSI6ZSkpfWZ1bmN0aW9uIFB1KGUpe3ZhciB0PWUuX2luaXQ7cmV0dXJuIHQoZS5fcGF5bG9hZCl9ZnVuY3Rpb24gTHUoZSl7ZnVuY3Rpb24gdChOLFMpe2lmKGUpe3ZhciBDPU4uZGVsZXRpb25zO0M9PT1udWxsPyhOLmRlbGV0aW9ucz1bU10sTi5mbGFnc3w9MTYpOkMucHVzaChTKX19ZnVuY3Rpb24gcihOLFMpe2lmKCFlKXJldHVybiBudWxsO2Zvcig7UyE9PW51bGw7KXQoTixTKSxTPVMuc2libGluZztyZXR1cm4gbnVsbH1mdW5jdGlvbiBsKE4sUyl7Zm9yKE49bmV3IE1hcDtTIT09bnVsbDspUy5rZXkhPT1udWxsP04uc2V0KFMua2V5LFMpOk4uc2V0KFMuaW5kZXgsUyksUz1TLnNpYmxpbmc7cmV0dXJuIE59ZnVuY3Rpb24gbyhOLFMpe3JldHVybiBOPU9uKE4sUyksTi5pbmRleD0wLE4uc2libGluZz1udWxsLE59ZnVuY3Rpb24gdShOLFMsQyl7cmV0dXJuIE4uaW5kZXg9QyxlPyhDPU4uYWx0ZXJuYXRlLEMhPT1udWxsPyhDPUMuaW5kZXgsQzxTPyhOLmZsYWdzfD0yLFMpOkMpOihOLmZsYWdzfD0yLFMpKTooTi5mbGFnc3w9MTA0ODU3NixTKX1mdW5jdGlvbiBkKE4pe3JldHVybiBlJiZOLmFsdGVybmF0ZT09PW51bGwmJihOLmZsYWdzfD0yKSxOfWZ1bmN0aW9uIHkoTixTLEMseil7cmV0dXJuIFM9PT1udWxsfHxTLnRhZyE9PTY/KFM9X2koQyxOLm1vZGUseiksUy5yZXR1cm49TixTKTooUz1vKFMsQyksUy5yZXR1cm49TixTKX1mdW5jdGlvbiB3KE4sUyxDLHope3ZhciBzZT1DLnR5cGU7cmV0dXJuIHNlPT09RWU/TChOLFMsQy5wcm9wcy5jaGlsZHJlbix6LEMua2V5KTpTIT09bnVsbCYmKFMuZWxlbWVudFR5cGU9PT1zZXx8dHlwZW9mIHNlPT0ib2JqZWN0IiYmc2UhPT1udWxsJiZzZS4kJHR5cGVvZj09PXdlJiZQdShzZSk9PT1TLnR5cGUpPyh6PW8oUyxDLnByb3BzKSx6LnJlZj1zbChOLFMsQyksei5yZXR1cm49Tix6KTooej1fcyhDLnR5cGUsQy5rZXksQy5wcm9wcyxudWxsLE4ubW9kZSx6KSx6LnJlZj1zbChOLFMsQyksei5yZXR1cm49Tix6KX1mdW5jdGlvbiBNKE4sUyxDLHope3JldHVybiBTPT09bnVsbHx8Uy50YWchPT00fHxTLnN0YXRlTm9kZS5jb250YWluZXJJbmZvIT09Qy5jb250YWluZXJJbmZvfHxTLnN0YXRlTm9kZS5pbXBsZW1lbnRhdGlvbiE9PUMuaW1wbGVtZW50YXRpb24/KFM9QWkoQyxOLm1vZGUseiksUy5yZXR1cm49TixTKTooUz1vKFMsQy5jaGlsZHJlbnx8W10pLFMucmV0dXJuPU4sUyl9ZnVuY3Rpb24gTChOLFMsQyx6LHNlKXtyZXR1cm4gUz09PW51bGx8fFMudGFnIT09Nz8oUz1ucihDLE4ubW9kZSx6LHNlKSxTLnJldHVybj1OLFMpOihTPW8oUyxDKSxTLnJldHVybj1OLFMpfWZ1bmN0aW9uIEQoTixTLEMpe2lmKHR5cGVvZiBTPT0ic3RyaW5nIiYmUyE9PSIifHx0eXBlb2YgUz09Im51bWJlciIpcmV0dXJuIFM9X2koIiIrUyxOLm1vZGUsQyksUy5yZXR1cm49TixTO2lmKHR5cGVvZiBTPT0ib2JqZWN0IiYmUyE9PW51bGwpe3N3aXRjaChTLiQkdHlwZW9mKXtjYXNlIFhlOnJldHVybiBDPV9zKFMudHlwZSxTLmtleSxTLnByb3BzLG51bGwsTi5tb2RlLEMpLEMucmVmPXNsKE4sbnVsbCxTKSxDLnJldHVybj1OLEM7Y2FzZSBSZTpyZXR1cm4gUz1BaShTLE4ubW9kZSxDKSxTLnJldHVybj1OLFM7Y2FzZSB3ZTp2YXIgej1TLl9pbml0O3JldHVybiBEKE4seihTLl9wYXlsb2FkKSxDKX1pZihCKFMpfHxLKFMpKXJldHVybiBTPW5yKFMsTi5tb2RlLEMsbnVsbCksUy5yZXR1cm49TixTO3VzKE4sUyl9cmV0dXJuIG51bGx9ZnVuY3Rpb24gRShOLFMsQyx6KXt2YXIgc2U9UyE9PW51bGw/Uy5rZXk6bnVsbDtpZih0eXBlb2YgQz09InN0cmluZyImJkMhPT0iInx8dHlwZW9mIEM9PSJudW1iZXIiKXJldHVybiBzZSE9PW51bGw/bnVsbDp5KE4sUywiIitDLHopO2lmKHR5cGVvZiBDPT0ib2JqZWN0IiYmQyE9PW51bGwpe3N3aXRjaChDLiQkdHlwZW9mKXtjYXNlIFhlOnJldHVybiBDLmtleT09PXNlP3coTixTLEMseik6bnVsbDtjYXNlIFJlOnJldHVybiBDLmtleT09PXNlP00oTixTLEMseik6bnVsbDtjYXNlIHdlOnJldHVybiBzZT1DLl9pbml0LEUoTixTLHNlKEMuX3BheWxvYWQpLHopfWlmKEIoQyl8fEsoQykpcmV0dXJuIHNlIT09bnVsbD9udWxsOkwoTixTLEMseixudWxsKTt1cyhOLEMpfXJldHVybiBudWxsfWZ1bmN0aW9uIFEoTixTLEMseixzZSl7aWYodHlwZW9mIHo9PSJzdHJpbmciJiZ6IT09IiJ8fHR5cGVvZiB6PT0ibnVtYmVyIilyZXR1cm4gTj1OLmdldChDKXx8bnVsbCx5KFMsTiwiIit6LHNlKTtpZih0eXBlb2Ygej09Im9iamVjdCImJnohPT1udWxsKXtzd2l0Y2goei4kJHR5cGVvZil7Y2FzZSBYZTpyZXR1cm4gTj1OLmdldCh6LmtleT09PW51bGw/Qzp6LmtleSl8fG51bGwsdyhTLE4seixzZSk7Y2FzZSBSZTpyZXR1cm4gTj1OLmdldCh6LmtleT09PW51bGw/Qzp6LmtleSl8fG51bGwsTShTLE4seixzZSk7Y2FzZSB3ZTp2YXIgY2U9ei5faW5pdDtyZXR1cm4gUShOLFMsQyxjZSh6Ll9wYXlsb2FkKSxzZSl9aWYoQih6KXx8Syh6KSlyZXR1cm4gTj1OLmdldChDKXx8bnVsbCxMKFMsTix6LHNlLG51bGwpO3VzKFMseil9cmV0dXJuIG51bGx9ZnVuY3Rpb24gSihOLFMsQyx6KXtmb3IodmFyIHNlPW51bGwsY2U9bnVsbCxmZT1TLHllPVM9MCxkdD1udWxsO2ZlIT09bnVsbCYmeWU8Qy5sZW5ndGg7eWUrKyl7ZmUuaW5kZXg+eWU/KGR0PWZlLGZlPW51bGwpOmR0PWZlLnNpYmxpbmc7dmFyIExlPUUoTixmZSxDW3llXSx6KTtpZihMZT09PW51bGwpe2ZlPT09bnVsbCYmKGZlPWR0KTticmVha31lJiZmZSYmTGUuYWx0ZXJuYXRlPT09bnVsbCYmdChOLGZlKSxTPXUoTGUsUyx5ZSksY2U9PT1udWxsP3NlPUxlOmNlLnNpYmxpbmc9TGUsY2U9TGUsZmU9ZHR9aWYoeWU9PT1DLmxlbmd0aClyZXR1cm4gcihOLGZlKSxxZSYmcW4oTix5ZSksc2U7aWYoZmU9PT1udWxsKXtmb3IoO3llPEMubGVuZ3RoO3llKyspZmU9RChOLENbeWVdLHopLGZlIT09bnVsbCYmKFM9dShmZSxTLHllKSxjZT09PW51bGw/c2U9ZmU6Y2Uuc2libGluZz1mZSxjZT1mZSk7cmV0dXJuIHFlJiZxbihOLHllKSxzZX1mb3IoZmU9bChOLGZlKTt5ZTxDLmxlbmd0aDt5ZSsrKWR0PVEoZmUsTix5ZSxDW3llXSx6KSxkdCE9PW51bGwmJihlJiZkdC5hbHRlcm5hdGUhPT1udWxsJiZmZS5kZWxldGUoZHQua2V5PT09bnVsbD95ZTpkdC5rZXkpLFM9dShkdCxTLHllKSxjZT09PW51bGw/c2U9ZHQ6Y2Uuc2libGluZz1kdCxjZT1kdCk7cmV0dXJuIGUmJmZlLmZvckVhY2goZnVuY3Rpb24oRm4pe3JldHVybiB0KE4sRm4pfSkscWUmJnFuKE4seWUpLHNlfWZ1bmN0aW9uIG5lKE4sUyxDLHope3ZhciBzZT1LKEMpO2lmKHR5cGVvZiBzZSE9ImZ1bmN0aW9uIil0aHJvdyBFcnJvcihpKDE1MCkpO2lmKEM9c2UuY2FsbChDKSxDPT1udWxsKXRocm93IEVycm9yKGkoMTUxKSk7Zm9yKHZhciBjZT1zZT1udWxsLGZlPVMseWU9Uz0wLGR0PW51bGwsTGU9Qy5uZXh0KCk7ZmUhPT1udWxsJiYhTGUuZG9uZTt5ZSsrLExlPUMubmV4dCgpKXtmZS5pbmRleD55ZT8oZHQ9ZmUsZmU9bnVsbCk6ZHQ9ZmUuc2libGluZzt2YXIgRm49RShOLGZlLExlLnZhbHVlLHopO2lmKEZuPT09bnVsbCl7ZmU9PT1udWxsJiYoZmU9ZHQpO2JyZWFrfWUmJmZlJiZGbi5hbHRlcm5hdGU9PT1udWxsJiZ0KE4sZmUpLFM9dShGbixTLHllKSxjZT09PW51bGw/c2U9Rm46Y2Uuc2libGluZz1GbixjZT1GbixmZT1kdH1pZihMZS5kb25lKXJldHVybiByKE4sZmUpLHFlJiZxbihOLHllKSxzZTtpZihmZT09PW51bGwpe2Zvcig7IUxlLmRvbmU7eWUrKyxMZT1DLm5leHQoKSlMZT1EKE4sTGUudmFsdWUseiksTGUhPT1udWxsJiYoUz11KExlLFMseWUpLGNlPT09bnVsbD9zZT1MZTpjZS5zaWJsaW5nPUxlLGNlPUxlKTtyZXR1cm4gcWUmJnFuKE4seWUpLHNlfWZvcihmZT1sKE4sZmUpOyFMZS5kb25lO3llKyssTGU9Qy5uZXh0KCkpTGU9UShmZSxOLHllLExlLnZhbHVlLHopLExlIT09bnVsbCYmKGUmJkxlLmFsdGVybmF0ZSE9PW51bGwmJmZlLmRlbGV0ZShMZS5rZXk9PT1udWxsP3llOkxlLmtleSksUz11KExlLFMseWUpLGNlPT09bnVsbD9zZT1MZTpjZS5zaWJsaW5nPUxlLGNlPUxlKTtyZXR1cm4gZSYmZmUuZm9yRWFjaChmdW5jdGlvbihycCl7cmV0dXJuIHQoTixycCl9KSxxZSYmcW4oTix5ZSksc2V9ZnVuY3Rpb24gbnQoTixTLEMseil7aWYodHlwZW9mIEM9PSJvYmplY3QiJiZDIT09bnVsbCYmQy50eXBlPT09RWUmJkMua2V5PT09bnVsbCYmKEM9Qy5wcm9wcy5jaGlsZHJlbiksdHlwZW9mIEM9PSJvYmplY3QiJiZDIT09bnVsbCl7c3dpdGNoKEMuJCR0eXBlb2Ype2Nhc2UgWGU6ZTp7Zm9yKHZhciBzZT1DLmtleSxjZT1TO2NlIT09bnVsbDspe2lmKGNlLmtleT09PXNlKXtpZihzZT1DLnR5cGUsc2U9PT1FZSl7aWYoY2UudGFnPT09Nyl7cihOLGNlLnNpYmxpbmcpLFM9byhjZSxDLnByb3BzLmNoaWxkcmVuKSxTLnJldHVybj1OLE49UzticmVhayBlfX1lbHNlIGlmKGNlLmVsZW1lbnRUeXBlPT09c2V8fHR5cGVvZiBzZT09Im9iamVjdCImJnNlIT09bnVsbCYmc2UuJCR0eXBlb2Y9PT13ZSYmUHUoc2UpPT09Y2UudHlwZSl7cihOLGNlLnNpYmxpbmcpLFM9byhjZSxDLnByb3BzKSxTLnJlZj1zbChOLGNlLEMpLFMucmV0dXJuPU4sTj1TO2JyZWFrIGV9cihOLGNlKTticmVha31lbHNlIHQoTixjZSk7Y2U9Y2Uuc2libGluZ31DLnR5cGU9PT1FZT8oUz1ucihDLnByb3BzLmNoaWxkcmVuLE4ubW9kZSx6LEMua2V5KSxTLnJldHVybj1OLE49Uyk6KHo9X3MoQy50eXBlLEMua2V5LEMucHJvcHMsbnVsbCxOLm1vZGUseiksei5yZWY9c2woTixTLEMpLHoucmV0dXJuPU4sTj16KX1yZXR1cm4gZChOKTtjYXNlIFJlOmU6e2ZvcihjZT1DLmtleTtTIT09bnVsbDspe2lmKFMua2V5PT09Y2UpaWYoUy50YWc9PT00JiZTLnN0YXRlTm9kZS5jb250YWluZXJJbmZvPT09Qy5jb250YWluZXJJbmZvJiZTLnN0YXRlTm9kZS5pbXBsZW1lbnRhdGlvbj09PUMuaW1wbGVtZW50YXRpb24pe3IoTixTLnNpYmxpbmcpLFM9byhTLEMuY2hpbGRyZW58fFtdKSxTLnJldHVybj1OLE49UzticmVhayBlfWVsc2V7cihOLFMpO2JyZWFrfWVsc2UgdChOLFMpO1M9Uy5zaWJsaW5nfVM9QWkoQyxOLm1vZGUseiksUy5yZXR1cm49TixOPVN9cmV0dXJuIGQoTik7Y2FzZSB3ZTpyZXR1cm4gY2U9Qy5faW5pdCxudChOLFMsY2UoQy5fcGF5bG9hZCkseil9aWYoQihDKSlyZXR1cm4gSihOLFMsQyx6KTtpZihLKEMpKXJldHVybiBuZShOLFMsQyx6KTt1cyhOLEMpfXJldHVybiB0eXBlb2YgQz09InN0cmluZyImJkMhPT0iInx8dHlwZW9mIEM9PSJudW1iZXIiPyhDPSIiK0MsUyE9PW51bGwmJlMudGFnPT09Nj8ocihOLFMuc2libGluZyksUz1vKFMsQyksUy5yZXR1cm49TixOPVMpOihyKE4sUyksUz1faShDLE4ubW9kZSx6KSxTLnJldHVybj1OLE49UyksZChOKSk6cihOLFMpfXJldHVybiBudH12YXIgd3I9THUoITApLF91PUx1KCExKSxjcz1SbihudWxsKSxmcz1udWxsLGtyPW51bGwsVWE9bnVsbDtmdW5jdGlvbiBIYSgpe1VhPWtyPWZzPW51bGx9ZnVuY3Rpb24gVmEoZSl7dmFyIHQ9Y3MuY3VycmVudDtHZShjcyksZS5fY3VycmVudFZhbHVlPXR9ZnVuY3Rpb24gR2EoZSx0LHIpe2Zvcig7ZSE9PW51bGw7KXt2YXIgbD1lLmFsdGVybmF0ZTtpZigoZS5jaGlsZExhbmVzJnQpIT09dD8oZS5jaGlsZExhbmVzfD10LGwhPT1udWxsJiYobC5jaGlsZExhbmVzfD10KSk6bCE9PW51bGwmJihsLmNoaWxkTGFuZXMmdCkhPT10JiYobC5jaGlsZExhbmVzfD10KSxlPT09cilicmVhaztlPWUucmV0dXJufX1mdW5jdGlvbiBTcihlLHQpe2ZzPWUsVWE9a3I9bnVsbCxlPWUuZGVwZW5kZW5jaWVzLGUhPT1udWxsJiZlLmZpcnN0Q29udGV4dCE9PW51bGwmJigoZS5sYW5lcyZ0KSE9PTAmJihDdD0hMCksZS5maXJzdENvbnRleHQ9bnVsbCl9ZnVuY3Rpb24genQoZSl7dmFyIHQ9ZS5fY3VycmVudFZhbHVlO2lmKFVhIT09ZSlpZihlPXtjb250ZXh0OmUsbWVtb2l6ZWRWYWx1ZTp0LG5leHQ6bnVsbH0sa3I9PT1udWxsKXtpZihmcz09PW51bGwpdGhyb3cgRXJyb3IoaSgzMDgpKTtrcj1lLGZzLmRlcGVuZGVuY2llcz17bGFuZXM6MCxmaXJzdENvbnRleHQ6ZX19ZWxzZSBrcj1rci5uZXh0PWU7cmV0dXJuIHR9dmFyIFFuPW51bGw7ZnVuY3Rpb24gS2EoZSl7UW49PT1udWxsP1FuPVtlXTpRbi5wdXNoKGUpfWZ1bmN0aW9uIEF1KGUsdCxyLGwpe3ZhciBvPXQuaW50ZXJsZWF2ZWQ7cmV0dXJuIG89PT1udWxsPyhyLm5leHQ9cixLYSh0KSk6KHIubmV4dD1vLm5leHQsby5uZXh0PXIpLHQuaW50ZXJsZWF2ZWQ9cixkbihlLGwpfWZ1bmN0aW9uIGRuKGUsdCl7ZS5sYW5lc3w9dDt2YXIgcj1lLmFsdGVybmF0ZTtmb3IociE9PW51bGwmJihyLmxhbmVzfD10KSxyPWUsZT1lLnJldHVybjtlIT09bnVsbDspZS5jaGlsZExhbmVzfD10LHI9ZS5hbHRlcm5hdGUsciE9PW51bGwmJihyLmNoaWxkTGFuZXN8PXQpLHI9ZSxlPWUucmV0dXJuO3JldHVybiByLnRhZz09PTM/ci5zdGF0ZU5vZGU6bnVsbH12YXIgUG49ITE7ZnVuY3Rpb24gcWEoZSl7ZS51cGRhdGVRdWV1ZT17YmFzZVN0YXRlOmUubWVtb2l6ZWRTdGF0ZSxmaXJzdEJhc2VVcGRhdGU6bnVsbCxsYXN0QmFzZVVwZGF0ZTpudWxsLHNoYXJlZDp7cGVuZGluZzpudWxsLGludGVybGVhdmVkOm51bGwsbGFuZXM6MH0sZWZmZWN0czpudWxsfX1mdW5jdGlvbiBJdShlLHQpe2U9ZS51cGRhdGVRdWV1ZSx0LnVwZGF0ZVF1ZXVlPT09ZSYmKHQudXBkYXRlUXVldWU9e2Jhc2VTdGF0ZTplLmJhc2VTdGF0ZSxmaXJzdEJhc2VVcGRhdGU6ZS5maXJzdEJhc2VVcGRhdGUsbGFzdEJhc2VVcGRhdGU6ZS5sYXN0QmFzZVVwZGF0ZSxzaGFyZWQ6ZS5zaGFyZWQsZWZmZWN0czplLmVmZmVjdHN9KX1mdW5jdGlvbiBwbihlLHQpe3JldHVybntldmVudFRpbWU6ZSxsYW5lOnQsdGFnOjAscGF5bG9hZDpudWxsLGNhbGxiYWNrOm51bGwsbmV4dDpudWxsfX1mdW5jdGlvbiBMbihlLHQscil7dmFyIGw9ZS51cGRhdGVRdWV1ZTtpZihsPT09bnVsbClyZXR1cm4gbnVsbDtpZihsPWwuc2hhcmVkLChUZSYyKSE9PTApe3ZhciBvPWwucGVuZGluZztyZXR1cm4gbz09PW51bGw/dC5uZXh0PXQ6KHQubmV4dD1vLm5leHQsby5uZXh0PXQpLGwucGVuZGluZz10LGRuKGUscil9cmV0dXJuIG89bC5pbnRlcmxlYXZlZCxvPT09bnVsbD8odC5uZXh0PXQsS2EobCkpOih0Lm5leHQ9by5uZXh0LG8ubmV4dD10KSxsLmludGVybGVhdmVkPXQsZG4oZSxyKX1mdW5jdGlvbiBkcyhlLHQscil7aWYodD10LnVwZGF0ZVF1ZXVlLHQhPT1udWxsJiYodD10LnNoYXJlZCwociY0MTk0MjQwKSE9PTApKXt2YXIgbD10LmxhbmVzO2wmPWUucGVuZGluZ0xhbmVzLHJ8PWwsdC5sYW5lcz1yLG9hKGUscil9fWZ1bmN0aW9uIER1KGUsdCl7dmFyIHI9ZS51cGRhdGVRdWV1ZSxsPWUuYWx0ZXJuYXRlO2lmKGwhPT1udWxsJiYobD1sLnVwZGF0ZVF1ZXVlLHI9PT1sKSl7dmFyIG89bnVsbCx1PW51bGw7aWYocj1yLmZpcnN0QmFzZVVwZGF0ZSxyIT09bnVsbCl7ZG97dmFyIGQ9e2V2ZW50VGltZTpyLmV2ZW50VGltZSxsYW5lOnIubGFuZSx0YWc6ci50YWcscGF5bG9hZDpyLnBheWxvYWQsY2FsbGJhY2s6ci5jYWxsYmFjayxuZXh0Om51bGx9O3U9PT1udWxsP289dT1kOnU9dS5uZXh0PWQscj1yLm5leHR9d2hpbGUociE9PW51bGwpO3U9PT1udWxsP289dT10OnU9dS5uZXh0PXR9ZWxzZSBvPXU9dDtyPXtiYXNlU3RhdGU6bC5iYXNlU3RhdGUsZmlyc3RCYXNlVXBkYXRlOm8sbGFzdEJhc2VVcGRhdGU6dSxzaGFyZWQ6bC5zaGFyZWQsZWZmZWN0czpsLmVmZmVjdHN9LGUudXBkYXRlUXVldWU9cjtyZXR1cm59ZT1yLmxhc3RCYXNlVXBkYXRlLGU9PT1udWxsP3IuZmlyc3RCYXNlVXBkYXRlPXQ6ZS5uZXh0PXQsci5sYXN0QmFzZVVwZGF0ZT10fWZ1bmN0aW9uIHBzKGUsdCxyLGwpe3ZhciBvPWUudXBkYXRlUXVldWU7UG49ITE7dmFyIHU9by5maXJzdEJhc2VVcGRhdGUsZD1vLmxhc3RCYXNlVXBkYXRlLHk9by5zaGFyZWQucGVuZGluZztpZih5IT09bnVsbCl7by5zaGFyZWQucGVuZGluZz1udWxsO3ZhciB3PXksTT13Lm5leHQ7dy5uZXh0PW51bGwsZD09PW51bGw/dT1NOmQubmV4dD1NLGQ9dzt2YXIgTD1lLmFsdGVybmF0ZTtMIT09bnVsbCYmKEw9TC51cGRhdGVRdWV1ZSx5PUwubGFzdEJhc2VVcGRhdGUseSE9PWQmJih5PT09bnVsbD9MLmZpcnN0QmFzZVVwZGF0ZT1NOnkubmV4dD1NLEwubGFzdEJhc2VVcGRhdGU9dykpfWlmKHUhPT1udWxsKXt2YXIgRD1vLmJhc2VTdGF0ZTtkPTAsTD1NPXc9bnVsbCx5PXU7ZG97dmFyIEU9eS5sYW5lLFE9eS5ldmVudFRpbWU7aWYoKGwmRSk9PT1FKXtMIT09bnVsbCYmKEw9TC5uZXh0PXtldmVudFRpbWU6USxsYW5lOjAsdGFnOnkudGFnLHBheWxvYWQ6eS5wYXlsb2FkLGNhbGxiYWNrOnkuY2FsbGJhY2ssbmV4dDpudWxsfSk7ZTp7dmFyIEo9ZSxuZT15O3N3aXRjaChFPXQsUT1yLG5lLnRhZyl7Y2FzZSAxOmlmKEo9bmUucGF5bG9hZCx0eXBlb2YgSj09ImZ1bmN0aW9uIil7RD1KLmNhbGwoUSxELEUpO2JyZWFrIGV9RD1KO2JyZWFrIGU7Y2FzZSAzOkouZmxhZ3M9Si5mbGFncyYtNjU1Mzd8MTI4O2Nhc2UgMDppZihKPW5lLnBheWxvYWQsRT10eXBlb2YgSj09ImZ1bmN0aW9uIj9KLmNhbGwoUSxELEUpOkosRT09bnVsbClicmVhayBlO0Q9Xyh7fSxELEUpO2JyZWFrIGU7Y2FzZSAyOlBuPSEwfX15LmNhbGxiYWNrIT09bnVsbCYmeS5sYW5lIT09MCYmKGUuZmxhZ3N8PTY0LEU9by5lZmZlY3RzLEU9PT1udWxsP28uZWZmZWN0cz1beV06RS5wdXNoKHkpKX1lbHNlIFE9e2V2ZW50VGltZTpRLGxhbmU6RSx0YWc6eS50YWcscGF5bG9hZDp5LnBheWxvYWQsY2FsbGJhY2s6eS5jYWxsYmFjayxuZXh0Om51bGx9LEw9PT1udWxsPyhNPUw9USx3PUQpOkw9TC5uZXh0PVEsZHw9RTtpZih5PXkubmV4dCx5PT09bnVsbCl7aWYoeT1vLnNoYXJlZC5wZW5kaW5nLHk9PT1udWxsKWJyZWFrO0U9eSx5PUUubmV4dCxFLm5leHQ9bnVsbCxvLmxhc3RCYXNlVXBkYXRlPUUsby5zaGFyZWQucGVuZGluZz1udWxsfX13aGlsZSghMCk7aWYoTD09PW51bGwmJih3PUQpLG8uYmFzZVN0YXRlPXcsby5maXJzdEJhc2VVcGRhdGU9TSxvLmxhc3RCYXNlVXBkYXRlPUwsdD1vLnNoYXJlZC5pbnRlcmxlYXZlZCx0IT09bnVsbCl7bz10O2RvIGR8PW8ubGFuZSxvPW8ubmV4dDt3aGlsZShvIT09dCl9ZWxzZSB1PT09bnVsbCYmKG8uc2hhcmVkLmxhbmVzPTApO1pufD1kLGUubGFuZXM9ZCxlLm1lbW9pemVkU3RhdGU9RH19ZnVuY3Rpb24genUoZSx0LHIpe2lmKGU9dC5lZmZlY3RzLHQuZWZmZWN0cz1udWxsLGUhPT1udWxsKWZvcih0PTA7dDxlLmxlbmd0aDt0Kyspe3ZhciBsPWVbdF0sbz1sLmNhbGxiYWNrO2lmKG8hPT1udWxsKXtpZihsLmNhbGxiYWNrPW51bGwsbD1yLHR5cGVvZiBvIT0iZnVuY3Rpb24iKXRocm93IEVycm9yKGkoMTkxLG8pKTtvLmNhbGwobCl9fX12YXIgYWw9e30sWnQ9Um4oYWwpLGlsPVJuKGFsKSxvbD1SbihhbCk7ZnVuY3Rpb24gWW4oZSl7aWYoZT09PWFsKXRocm93IEVycm9yKGkoMTc0KSk7cmV0dXJuIGV9ZnVuY3Rpb24gUWEoZSx0KXtzd2l0Y2goVWUob2wsdCksVWUoaWwsZSksVWUoWnQsYWwpLGU9dC5ub2RlVHlwZSxlKXtjYXNlIDk6Y2FzZSAxMTp0PSh0PXQuZG9jdW1lbnRFbGVtZW50KT90Lm5hbWVzcGFjZVVSSTpvZShudWxsLCIiKTticmVhaztkZWZhdWx0OmU9ZT09PTg/dC5wYXJlbnROb2RlOnQsdD1lLm5hbWVzcGFjZVVSSXx8bnVsbCxlPWUudGFnTmFtZSx0PW9lKHQsZSl9R2UoWnQpLFVlKFp0LHQpfWZ1bmN0aW9uIGpyKCl7R2UoWnQpLEdlKGlsKSxHZShvbCl9ZnVuY3Rpb24gT3UoZSl7WW4ob2wuY3VycmVudCk7dmFyIHQ9WW4oWnQuY3VycmVudCkscj1vZSh0LGUudHlwZSk7dCE9PXImJihVZShpbCxlKSxVZShadCxyKSl9ZnVuY3Rpb24gWWEoZSl7aWwuY3VycmVudD09PWUmJihHZShadCksR2UoaWwpKX12YXIgWmU9Um4oMCk7ZnVuY3Rpb24gaHMoZSl7Zm9yKHZhciB0PWU7dCE9PW51bGw7KXtpZih0LnRhZz09PTEzKXt2YXIgcj10Lm1lbW9pemVkU3RhdGU7aWYociE9PW51bGwmJihyPXIuZGVoeWRyYXRlZCxyPT09bnVsbHx8ci5kYXRhPT09IiQ/Inx8ci5kYXRhPT09IiQhIikpcmV0dXJuIHR9ZWxzZSBpZih0LnRhZz09PTE5JiZ0Lm1lbW9pemVkUHJvcHMucmV2ZWFsT3JkZXIhPT12b2lkIDApe2lmKCh0LmZsYWdzJjEyOCkhPT0wKXJldHVybiB0fWVsc2UgaWYodC5jaGlsZCE9PW51bGwpe3QuY2hpbGQucmV0dXJuPXQsdD10LmNoaWxkO2NvbnRpbnVlfWlmKHQ9PT1lKWJyZWFrO2Zvcig7dC5zaWJsaW5nPT09bnVsbDspe2lmKHQucmV0dXJuPT09bnVsbHx8dC5yZXR1cm49PT1lKXJldHVybiBudWxsO3Q9dC5yZXR1cm59dC5zaWJsaW5nLnJldHVybj10LnJldHVybix0PXQuc2libGluZ31yZXR1cm4gbnVsbH12YXIgWGE9W107ZnVuY3Rpb24gWmEoKXtmb3IodmFyIGU9MDtlPFhhLmxlbmd0aDtlKyspWGFbZV0uX3dvcmtJblByb2dyZXNzVmVyc2lvblByaW1hcnk9bnVsbDtYYS5sZW5ndGg9MH12YXIgbXM9aGUuUmVhY3RDdXJyZW50RGlzcGF0Y2hlcixKYT1oZS5SZWFjdEN1cnJlbnRCYXRjaENvbmZpZyxYbj0wLEplPW51bGwsb3Q9bnVsbCxjdD1udWxsLGdzPSExLHVsPSExLGNsPTAsTjA9MDtmdW5jdGlvbiB2dCgpe3Rocm93IEVycm9yKGkoMzIxKSl9ZnVuY3Rpb24gZWkoZSx0KXtpZih0PT09bnVsbClyZXR1cm4hMTtmb3IodmFyIHI9MDtyPHQubGVuZ3RoJiZyPGUubGVuZ3RoO3IrKylpZighV3QoZVtyXSx0W3JdKSlyZXR1cm4hMTtyZXR1cm4hMH1mdW5jdGlvbiB0aShlLHQscixsLG8sdSl7aWYoWG49dSxKZT10LHQubWVtb2l6ZWRTdGF0ZT1udWxsLHQudXBkYXRlUXVldWU9bnVsbCx0LmxhbmVzPTAsbXMuY3VycmVudD1lPT09bnVsbHx8ZS5tZW1vaXplZFN0YXRlPT09bnVsbD9UMDpFMCxlPXIobCxvKSx1bCl7dT0wO2Rve2lmKHVsPSExLGNsPTAsMjU8PXUpdGhyb3cgRXJyb3IoaSgzMDEpKTt1Kz0xLGN0PW90PW51bGwsdC51cGRhdGVRdWV1ZT1udWxsLG1zLmN1cnJlbnQ9UDAsZT1yKGwsbyl9d2hpbGUodWwpfWlmKG1zLmN1cnJlbnQ9eHMsdD1vdCE9PW51bGwmJm90Lm5leHQhPT1udWxsLFhuPTAsY3Q9b3Q9SmU9bnVsbCxncz0hMSx0KXRocm93IEVycm9yKGkoMzAwKSk7cmV0dXJuIGV9ZnVuY3Rpb24gbmkoKXt2YXIgZT1jbCE9PTA7cmV0dXJuIGNsPTAsZX1mdW5jdGlvbiBKdCgpe3ZhciBlPXttZW1vaXplZFN0YXRlOm51bGwsYmFzZVN0YXRlOm51bGwsYmFzZVF1ZXVlOm51bGwscXVldWU6bnVsbCxuZXh0Om51bGx9O3JldHVybiBjdD09PW51bGw/SmUubWVtb2l6ZWRTdGF0ZT1jdD1lOmN0PWN0Lm5leHQ9ZSxjdH1mdW5jdGlvbiBPdCgpe2lmKG90PT09bnVsbCl7dmFyIGU9SmUuYWx0ZXJuYXRlO2U9ZSE9PW51bGw/ZS5tZW1vaXplZFN0YXRlOm51bGx9ZWxzZSBlPW90Lm5leHQ7dmFyIHQ9Y3Q9PT1udWxsP0plLm1lbW9pemVkU3RhdGU6Y3QubmV4dDtpZih0IT09bnVsbCljdD10LG90PWU7ZWxzZXtpZihlPT09bnVsbCl0aHJvdyBFcnJvcihpKDMxMCkpO290PWUsZT17bWVtb2l6ZWRTdGF0ZTpvdC5tZW1vaXplZFN0YXRlLGJhc2VTdGF0ZTpvdC5iYXNlU3RhdGUsYmFzZVF1ZXVlOm90LmJhc2VRdWV1ZSxxdWV1ZTpvdC5xdWV1ZSxuZXh0Om51bGx9LGN0PT09bnVsbD9KZS5tZW1vaXplZFN0YXRlPWN0PWU6Y3Q9Y3QubmV4dD1lfXJldHVybiBjdH1mdW5jdGlvbiBmbChlLHQpe3JldHVybiB0eXBlb2YgdD09ImZ1bmN0aW9uIj90KGUpOnR9ZnVuY3Rpb24gcmkoZSl7dmFyIHQ9T3QoKSxyPXQucXVldWU7aWYocj09PW51bGwpdGhyb3cgRXJyb3IoaSgzMTEpKTtyLmxhc3RSZW5kZXJlZFJlZHVjZXI9ZTt2YXIgbD1vdCxvPWwuYmFzZVF1ZXVlLHU9ci5wZW5kaW5nO2lmKHUhPT1udWxsKXtpZihvIT09bnVsbCl7dmFyIGQ9by5uZXh0O28ubmV4dD11Lm5leHQsdS5uZXh0PWR9bC5iYXNlUXVldWU9bz11LHIucGVuZGluZz1udWxsfWlmKG8hPT1udWxsKXt1PW8ubmV4dCxsPWwuYmFzZVN0YXRlO3ZhciB5PWQ9bnVsbCx3PW51bGwsTT11O2Rve3ZhciBMPU0ubGFuZTtpZigoWG4mTCk9PT1MKXchPT1udWxsJiYodz13Lm5leHQ9e2xhbmU6MCxhY3Rpb246TS5hY3Rpb24saGFzRWFnZXJTdGF0ZTpNLmhhc0VhZ2VyU3RhdGUsZWFnZXJTdGF0ZTpNLmVhZ2VyU3RhdGUsbmV4dDpudWxsfSksbD1NLmhhc0VhZ2VyU3RhdGU/TS5lYWdlclN0YXRlOmUobCxNLmFjdGlvbik7ZWxzZXt2YXIgRD17bGFuZTpMLGFjdGlvbjpNLmFjdGlvbixoYXNFYWdlclN0YXRlOk0uaGFzRWFnZXJTdGF0ZSxlYWdlclN0YXRlOk0uZWFnZXJTdGF0ZSxuZXh0Om51bGx9O3c9PT1udWxsPyh5PXc9RCxkPWwpOnc9dy5uZXh0PUQsSmUubGFuZXN8PUwsWm58PUx9TT1NLm5leHR9d2hpbGUoTSE9PW51bGwmJk0hPT11KTt3PT09bnVsbD9kPWw6dy5uZXh0PXksV3QobCx0Lm1lbW9pemVkU3RhdGUpfHwoQ3Q9ITApLHQubWVtb2l6ZWRTdGF0ZT1sLHQuYmFzZVN0YXRlPWQsdC5iYXNlUXVldWU9dyxyLmxhc3RSZW5kZXJlZFN0YXRlPWx9aWYoZT1yLmludGVybGVhdmVkLGUhPT1udWxsKXtvPWU7ZG8gdT1vLmxhbmUsSmUubGFuZXN8PXUsWm58PXUsbz1vLm5leHQ7d2hpbGUobyE9PWUpfWVsc2Ugbz09PW51bGwmJihyLmxhbmVzPTApO3JldHVyblt0Lm1lbW9pemVkU3RhdGUsci5kaXNwYXRjaF19ZnVuY3Rpb24gbGkoZSl7dmFyIHQ9T3QoKSxyPXQucXVldWU7aWYocj09PW51bGwpdGhyb3cgRXJyb3IoaSgzMTEpKTtyLmxhc3RSZW5kZXJlZFJlZHVjZXI9ZTt2YXIgbD1yLmRpc3BhdGNoLG89ci5wZW5kaW5nLHU9dC5tZW1vaXplZFN0YXRlO2lmKG8hPT1udWxsKXtyLnBlbmRpbmc9bnVsbDt2YXIgZD1vPW8ubmV4dDtkbyB1PWUodSxkLmFjdGlvbiksZD1kLm5leHQ7d2hpbGUoZCE9PW8pO1d0KHUsdC5tZW1vaXplZFN0YXRlKXx8KEN0PSEwKSx0Lm1lbW9pemVkU3RhdGU9dSx0LmJhc2VRdWV1ZT09PW51bGwmJih0LmJhc2VTdGF0ZT11KSxyLmxhc3RSZW5kZXJlZFN0YXRlPXV9cmV0dXJuW3UsbF19ZnVuY3Rpb24gRnUoKXt9ZnVuY3Rpb24gQnUoZSx0KXt2YXIgcj1KZSxsPU90KCksbz10KCksdT0hV3QobC5tZW1vaXplZFN0YXRlLG8pO2lmKHUmJihsLm1lbW9pemVkU3RhdGU9byxDdD0hMCksbD1sLnF1ZXVlLHNpKFV1LmJpbmQobnVsbCxyLGwsZSksW2VdKSxsLmdldFNuYXBzaG90IT09dHx8dXx8Y3QhPT1udWxsJiZjdC5tZW1vaXplZFN0YXRlLnRhZyYxKXtpZihyLmZsYWdzfD0yMDQ4LGRsKDksV3UuYmluZChudWxsLHIsbCxvLHQpLHZvaWQgMCxudWxsKSxmdD09PW51bGwpdGhyb3cgRXJyb3IoaSgzNDkpKTsoWG4mMzApIT09MHx8JHUocix0LG8pfXJldHVybiBvfWZ1bmN0aW9uICR1KGUsdCxyKXtlLmZsYWdzfD0xNjM4NCxlPXtnZXRTbmFwc2hvdDp0LHZhbHVlOnJ9LHQ9SmUudXBkYXRlUXVldWUsdD09PW51bGw/KHQ9e2xhc3RFZmZlY3Q6bnVsbCxzdG9yZXM6bnVsbH0sSmUudXBkYXRlUXVldWU9dCx0LnN0b3Jlcz1bZV0pOihyPXQuc3RvcmVzLHI9PT1udWxsP3Quc3RvcmVzPVtlXTpyLnB1c2goZSkpfWZ1bmN0aW9uIFd1KGUsdCxyLGwpe3QudmFsdWU9cix0LmdldFNuYXBzaG90PWwsSHUodCkmJlZ1KGUpfWZ1bmN0aW9uIFV1KGUsdCxyKXtyZXR1cm4gcihmdW5jdGlvbigpe0h1KHQpJiZWdShlKX0pfWZ1bmN0aW9uIEh1KGUpe3ZhciB0PWUuZ2V0U25hcHNob3Q7ZT1lLnZhbHVlO3RyeXt2YXIgcj10KCk7cmV0dXJuIVd0KGUscil9Y2F0Y2h7cmV0dXJuITB9fWZ1bmN0aW9uIFZ1KGUpe3ZhciB0PWRuKGUsMSk7dCE9PW51bGwmJkt0KHQsZSwxLC0xKX1mdW5jdGlvbiBHdShlKXt2YXIgdD1KdCgpO3JldHVybiB0eXBlb2YgZT09ImZ1bmN0aW9uIiYmKGU9ZSgpKSx0Lm1lbW9pemVkU3RhdGU9dC5iYXNlU3RhdGU9ZSxlPXtwZW5kaW5nOm51bGwsaW50ZXJsZWF2ZWQ6bnVsbCxsYW5lczowLGRpc3BhdGNoOm51bGwsbGFzdFJlbmRlcmVkUmVkdWNlcjpmbCxsYXN0UmVuZGVyZWRTdGF0ZTplfSx0LnF1ZXVlPWUsZT1lLmRpc3BhdGNoPVIwLmJpbmQobnVsbCxKZSxlKSxbdC5tZW1vaXplZFN0YXRlLGVdfWZ1bmN0aW9uIGRsKGUsdCxyLGwpe3JldHVybiBlPXt0YWc6ZSxjcmVhdGU6dCxkZXN0cm95OnIsZGVwczpsLG5leHQ6bnVsbH0sdD1KZS51cGRhdGVRdWV1ZSx0PT09bnVsbD8odD17bGFzdEVmZmVjdDpudWxsLHN0b3JlczpudWxsfSxKZS51cGRhdGVRdWV1ZT10LHQubGFzdEVmZmVjdD1lLm5leHQ9ZSk6KHI9dC5sYXN0RWZmZWN0LHI9PT1udWxsP3QubGFzdEVmZmVjdD1lLm5leHQ9ZToobD1yLm5leHQsci5uZXh0PWUsZS5uZXh0PWwsdC5sYXN0RWZmZWN0PWUpKSxlfWZ1bmN0aW9uIEt1KCl7cmV0dXJuIE90KCkubWVtb2l6ZWRTdGF0ZX1mdW5jdGlvbiB2cyhlLHQscixsKXt2YXIgbz1KdCgpO0plLmZsYWdzfD1lLG8ubWVtb2l6ZWRTdGF0ZT1kbCgxfHQscix2b2lkIDAsbD09PXZvaWQgMD9udWxsOmwpfWZ1bmN0aW9uIHlzKGUsdCxyLGwpe3ZhciBvPU90KCk7bD1sPT09dm9pZCAwP251bGw6bDt2YXIgdT12b2lkIDA7aWYob3QhPT1udWxsKXt2YXIgZD1vdC5tZW1vaXplZFN0YXRlO2lmKHU9ZC5kZXN0cm95LGwhPT1udWxsJiZlaShsLGQuZGVwcykpe28ubWVtb2l6ZWRTdGF0ZT1kbCh0LHIsdSxsKTtyZXR1cm59fUplLmZsYWdzfD1lLG8ubWVtb2l6ZWRTdGF0ZT1kbCgxfHQscix1LGwpfWZ1bmN0aW9uIHF1KGUsdCl7cmV0dXJuIHZzKDgzOTA2NTYsOCxlLHQpfWZ1bmN0aW9uIHNpKGUsdCl7cmV0dXJuIHlzKDIwNDgsOCxlLHQpfWZ1bmN0aW9uIFF1KGUsdCl7cmV0dXJuIHlzKDQsMixlLHQpfWZ1bmN0aW9uIFl1KGUsdCl7cmV0dXJuIHlzKDQsNCxlLHQpfWZ1bmN0aW9uIFh1KGUsdCl7aWYodHlwZW9mIHQ9PSJmdW5jdGlvbiIpcmV0dXJuIGU9ZSgpLHQoZSksZnVuY3Rpb24oKXt0KG51bGwpfTtpZih0IT1udWxsKXJldHVybiBlPWUoKSx0LmN1cnJlbnQ9ZSxmdW5jdGlvbigpe3QuY3VycmVudD1udWxsfX1mdW5jdGlvbiBadShlLHQscil7cmV0dXJuIHI9ciE9bnVsbD9yLmNvbmNhdChbZV0pOm51bGwseXMoNCw0LFh1LmJpbmQobnVsbCx0LGUpLHIpfWZ1bmN0aW9uIGFpKCl7fWZ1bmN0aW9uIEp1KGUsdCl7dmFyIHI9T3QoKTt0PXQ9PT12b2lkIDA/bnVsbDp0O3ZhciBsPXIubWVtb2l6ZWRTdGF0ZTtyZXR1cm4gbCE9PW51bGwmJnQhPT1udWxsJiZlaSh0LGxbMV0pP2xbMF06KHIubWVtb2l6ZWRTdGF0ZT1bZSx0XSxlKX1mdW5jdGlvbiBlYyhlLHQpe3ZhciByPU90KCk7dD10PT09dm9pZCAwP251bGw6dDt2YXIgbD1yLm1lbW9pemVkU3RhdGU7cmV0dXJuIGwhPT1udWxsJiZ0IT09bnVsbCYmZWkodCxsWzFdKT9sWzBdOihlPWUoKSxyLm1lbW9pemVkU3RhdGU9W2UsdF0sZSl9ZnVuY3Rpb24gdGMoZSx0LHIpe3JldHVybihYbiYyMSk9PT0wPyhlLmJhc2VTdGF0ZSYmKGUuYmFzZVN0YXRlPSExLEN0PSEwKSxlLm1lbW9pemVkU3RhdGU9cik6KFd0KHIsdCl8fChyPVBvKCksSmUubGFuZXN8PXIsWm58PXIsZS5iYXNlU3RhdGU9ITApLHQpfWZ1bmN0aW9uIEMwKGUsdCl7dmFyIHI9QmU7QmU9ciE9PTAmJjQ+cj9yOjQsZSghMCk7dmFyIGw9SmEudHJhbnNpdGlvbjtKYS50cmFuc2l0aW9uPXt9O3RyeXtlKCExKSx0KCl9ZmluYWxseXtCZT1yLEphLnRyYW5zaXRpb249bH19ZnVuY3Rpb24gbmMoKXtyZXR1cm4gT3QoKS5tZW1vaXplZFN0YXRlfWZ1bmN0aW9uIE0wKGUsdCxyKXt2YXIgbD1EbihlKTtpZihyPXtsYW5lOmwsYWN0aW9uOnIsaGFzRWFnZXJTdGF0ZTohMSxlYWdlclN0YXRlOm51bGwsbmV4dDpudWxsfSxyYyhlKSlsYyh0LHIpO2Vsc2UgaWYocj1BdShlLHQscixsKSxyIT09bnVsbCl7dmFyIG89a3QoKTtLdChyLGUsbCxvKSxzYyhyLHQsbCl9fWZ1bmN0aW9uIFIwKGUsdCxyKXt2YXIgbD1EbihlKSxvPXtsYW5lOmwsYWN0aW9uOnIsaGFzRWFnZXJTdGF0ZTohMSxlYWdlclN0YXRlOm51bGwsbmV4dDpudWxsfTtpZihyYyhlKSlsYyh0LG8pO2Vsc2V7dmFyIHU9ZS5hbHRlcm5hdGU7aWYoZS5sYW5lcz09PTAmJih1PT09bnVsbHx8dS5sYW5lcz09PTApJiYodT10Lmxhc3RSZW5kZXJlZFJlZHVjZXIsdSE9PW51bGwpKXRyeXt2YXIgZD10Lmxhc3RSZW5kZXJlZFN0YXRlLHk9dShkLHIpO2lmKG8uaGFzRWFnZXJTdGF0ZT0hMCxvLmVhZ2VyU3RhdGU9eSxXdCh5LGQpKXt2YXIgdz10LmludGVybGVhdmVkO3c9PT1udWxsPyhvLm5leHQ9byxLYSh0KSk6KG8ubmV4dD13Lm5leHQsdy5uZXh0PW8pLHQuaW50ZXJsZWF2ZWQ9bztyZXR1cm59fWNhdGNoe31maW5hbGx5e31yPUF1KGUsdCxvLGwpLHIhPT1udWxsJiYobz1rdCgpLEt0KHIsZSxsLG8pLHNjKHIsdCxsKSl9fWZ1bmN0aW9uIHJjKGUpe3ZhciB0PWUuYWx0ZXJuYXRlO3JldHVybiBlPT09SmV8fHQhPT1udWxsJiZ0PT09SmV9ZnVuY3Rpb24gbGMoZSx0KXt1bD1ncz0hMDt2YXIgcj1lLnBlbmRpbmc7cj09PW51bGw/dC5uZXh0PXQ6KHQubmV4dD1yLm5leHQsci5uZXh0PXQpLGUucGVuZGluZz10fWZ1bmN0aW9uIHNjKGUsdCxyKXtpZigociY0MTk0MjQwKSE9PTApe3ZhciBsPXQubGFuZXM7bCY9ZS5wZW5kaW5nTGFuZXMscnw9bCx0LmxhbmVzPXIsb2EoZSxyKX19dmFyIHhzPXtyZWFkQ29udGV4dDp6dCx1c2VDYWxsYmFjazp2dCx1c2VDb250ZXh0OnZ0LHVzZUVmZmVjdDp2dCx1c2VJbXBlcmF0aXZlSGFuZGxlOnZ0LHVzZUluc2VydGlvbkVmZmVjdDp2dCx1c2VMYXlvdXRFZmZlY3Q6dnQsdXNlTWVtbzp2dCx1c2VSZWR1Y2VyOnZ0LHVzZVJlZjp2dCx1c2VTdGF0ZTp2dCx1c2VEZWJ1Z1ZhbHVlOnZ0LHVzZURlZmVycmVkVmFsdWU6dnQsdXNlVHJhbnNpdGlvbjp2dCx1c2VNdXRhYmxlU291cmNlOnZ0LHVzZVN5bmNFeHRlcm5hbFN0b3JlOnZ0LHVzZUlkOnZ0LHVuc3RhYmxlX2lzTmV3UmVjb25jaWxlcjohMX0sVDA9e3JlYWRDb250ZXh0Onp0LHVzZUNhbGxiYWNrOmZ1bmN0aW9uKGUsdCl7cmV0dXJuIEp0KCkubWVtb2l6ZWRTdGF0ZT1bZSx0PT09dm9pZCAwP251bGw6dF0sZX0sdXNlQ29udGV4dDp6dCx1c2VFZmZlY3Q6cXUsdXNlSW1wZXJhdGl2ZUhhbmRsZTpmdW5jdGlvbihlLHQscil7cmV0dXJuIHI9ciE9bnVsbD9yLmNvbmNhdChbZV0pOm51bGwsdnMoNDE5NDMwOCw0LFh1LmJpbmQobnVsbCx0LGUpLHIpfSx1c2VMYXlvdXRFZmZlY3Q6ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdnMoNDE5NDMwOCw0LGUsdCl9LHVzZUluc2VydGlvbkVmZmVjdDpmdW5jdGlvbihlLHQpe3JldHVybiB2cyg0LDIsZSx0KX0sdXNlTWVtbzpmdW5jdGlvbihlLHQpe3ZhciByPUp0KCk7cmV0dXJuIHQ9dD09PXZvaWQgMD9udWxsOnQsZT1lKCksci5tZW1vaXplZFN0YXRlPVtlLHRdLGV9LHVzZVJlZHVjZXI6ZnVuY3Rpb24oZSx0LHIpe3ZhciBsPUp0KCk7cmV0dXJuIHQ9ciE9PXZvaWQgMD9yKHQpOnQsbC5tZW1vaXplZFN0YXRlPWwuYmFzZVN0YXRlPXQsZT17cGVuZGluZzpudWxsLGludGVybGVhdmVkOm51bGwsbGFuZXM6MCxkaXNwYXRjaDpudWxsLGxhc3RSZW5kZXJlZFJlZHVjZXI6ZSxsYXN0UmVuZGVyZWRTdGF0ZTp0fSxsLnF1ZXVlPWUsZT1lLmRpc3BhdGNoPU0wLmJpbmQobnVsbCxKZSxlKSxbbC5tZW1vaXplZFN0YXRlLGVdfSx1c2VSZWY6ZnVuY3Rpb24oZSl7dmFyIHQ9SnQoKTtyZXR1cm4gZT17Y3VycmVudDplfSx0Lm1lbW9pemVkU3RhdGU9ZX0sdXNlU3RhdGU6R3UsdXNlRGVidWdWYWx1ZTphaSx1c2VEZWZlcnJlZFZhbHVlOmZ1bmN0aW9uKGUpe3JldHVybiBKdCgpLm1lbW9pemVkU3RhdGU9ZX0sdXNlVHJhbnNpdGlvbjpmdW5jdGlvbigpe3ZhciBlPUd1KCExKSx0PWVbMF07cmV0dXJuIGU9QzAuYmluZChudWxsLGVbMV0pLEp0KCkubWVtb2l6ZWRTdGF0ZT1lLFt0LGVdfSx1c2VNdXRhYmxlU291cmNlOmZ1bmN0aW9uKCl7fSx1c2VTeW5jRXh0ZXJuYWxTdG9yZTpmdW5jdGlvbihlLHQscil7dmFyIGw9SmUsbz1KdCgpO2lmKHFlKXtpZihyPT09dm9pZCAwKXRocm93IEVycm9yKGkoNDA3KSk7cj1yKCl9ZWxzZXtpZihyPXQoKSxmdD09PW51bGwpdGhyb3cgRXJyb3IoaSgzNDkpKTsoWG4mMzApIT09MHx8JHUobCx0LHIpfW8ubWVtb2l6ZWRTdGF0ZT1yO3ZhciB1PXt2YWx1ZTpyLGdldFNuYXBzaG90OnR9O3JldHVybiBvLnF1ZXVlPXUscXUoVXUuYmluZChudWxsLGwsdSxlKSxbZV0pLGwuZmxhZ3N8PTIwNDgsZGwoOSxXdS5iaW5kKG51bGwsbCx1LHIsdCksdm9pZCAwLG51bGwpLHJ9LHVzZUlkOmZ1bmN0aW9uKCl7dmFyIGU9SnQoKSx0PWZ0LmlkZW50aWZpZXJQcmVmaXg7aWYocWUpe3ZhciByPWZuLGw9Y247cj0obCZ+KDE8PDMyLSR0KGwpLTEpKS50b1N0cmluZygzMikrcix0PSI6Iit0KyJSIityLHI9Y2wrKywwPHImJih0Kz0iSCIrci50b1N0cmluZygzMikpLHQrPSI6In1lbHNlIHI9TjArKyx0PSI6Iit0KyJyIityLnRvU3RyaW5nKDMyKSsiOiI7cmV0dXJuIGUubWVtb2l6ZWRTdGF0ZT10fSx1bnN0YWJsZV9pc05ld1JlY29uY2lsZXI6ITF9LEUwPXtyZWFkQ29udGV4dDp6dCx1c2VDYWxsYmFjazpKdSx1c2VDb250ZXh0Onp0LHVzZUVmZmVjdDpzaSx1c2VJbXBlcmF0aXZlSGFuZGxlOlp1LHVzZUluc2VydGlvbkVmZmVjdDpRdSx1c2VMYXlvdXRFZmZlY3Q6WXUsdXNlTWVtbzplYyx1c2VSZWR1Y2VyOnJpLHVzZVJlZjpLdSx1c2VTdGF0ZTpmdW5jdGlvbigpe3JldHVybiByaShmbCl9LHVzZURlYnVnVmFsdWU6YWksdXNlRGVmZXJyZWRWYWx1ZTpmdW5jdGlvbihlKXt2YXIgdD1PdCgpO3JldHVybiB0Yyh0LG90Lm1lbW9pemVkU3RhdGUsZSl9LHVzZVRyYW5zaXRpb246ZnVuY3Rpb24oKXt2YXIgZT1yaShmbClbMF0sdD1PdCgpLm1lbW9pemVkU3RhdGU7cmV0dXJuW2UsdF19LHVzZU11dGFibGVTb3VyY2U6RnUsdXNlU3luY0V4dGVybmFsU3RvcmU6QnUsdXNlSWQ6bmMsdW5zdGFibGVfaXNOZXdSZWNvbmNpbGVyOiExfSxQMD17cmVhZENvbnRleHQ6enQsdXNlQ2FsbGJhY2s6SnUsdXNlQ29udGV4dDp6dCx1c2VFZmZlY3Q6c2ksdXNlSW1wZXJhdGl2ZUhhbmRsZTpadSx1c2VJbnNlcnRpb25FZmZlY3Q6UXUsdXNlTGF5b3V0RWZmZWN0Oll1LHVzZU1lbW86ZWMsdXNlUmVkdWNlcjpsaSx1c2VSZWY6S3UsdXNlU3RhdGU6ZnVuY3Rpb24oKXtyZXR1cm4gbGkoZmwpfSx1c2VEZWJ1Z1ZhbHVlOmFpLHVzZURlZmVycmVkVmFsdWU6ZnVuY3Rpb24oZSl7dmFyIHQ9T3QoKTtyZXR1cm4gb3Q9PT1udWxsP3QubWVtb2l6ZWRTdGF0ZT1lOnRjKHQsb3QubWVtb2l6ZWRTdGF0ZSxlKX0sdXNlVHJhbnNpdGlvbjpmdW5jdGlvbigpe3ZhciBlPWxpKGZsKVswXSx0PU90KCkubWVtb2l6ZWRTdGF0ZTtyZXR1cm5bZSx0XX0sdXNlTXV0YWJsZVNvdXJjZTpGdSx1c2VTeW5jRXh0ZXJuYWxTdG9yZTpCdSx1c2VJZDpuYyx1bnN0YWJsZV9pc05ld1JlY29uY2lsZXI6ITF9O2Z1bmN0aW9uIEh0KGUsdCl7aWYoZSYmZS5kZWZhdWx0UHJvcHMpe3Q9Xyh7fSx0KSxlPWUuZGVmYXVsdFByb3BzO2Zvcih2YXIgciBpbiBlKXRbcl09PT12b2lkIDAmJih0W3JdPWVbcl0pO3JldHVybiB0fXJldHVybiB0fWZ1bmN0aW9uIGlpKGUsdCxyLGwpe3Q9ZS5tZW1vaXplZFN0YXRlLHI9cihsLHQpLHI9cj09bnVsbD90Ol8oe30sdCxyKSxlLm1lbW9pemVkU3RhdGU9cixlLmxhbmVzPT09MCYmKGUudXBkYXRlUXVldWUuYmFzZVN0YXRlPXIpfXZhciB3cz17aXNNb3VudGVkOmZ1bmN0aW9uKGUpe3JldHVybihlPWUuX3JlYWN0SW50ZXJuYWxzKT9IbihlKT09PWU6ITF9LGVucXVldWVTZXRTdGF0ZTpmdW5jdGlvbihlLHQscil7ZT1lLl9yZWFjdEludGVybmFsczt2YXIgbD1rdCgpLG89RG4oZSksdT1wbihsLG8pO3UucGF5bG9hZD10LHIhPW51bGwmJih1LmNhbGxiYWNrPXIpLHQ9TG4oZSx1LG8pLHQhPT1udWxsJiYoS3QodCxlLG8sbCksZHModCxlLG8pKX0sZW5xdWV1ZVJlcGxhY2VTdGF0ZTpmdW5jdGlvbihlLHQscil7ZT1lLl9yZWFjdEludGVybmFsczt2YXIgbD1rdCgpLG89RG4oZSksdT1wbihsLG8pO3UudGFnPTEsdS5wYXlsb2FkPXQsciE9bnVsbCYmKHUuY2FsbGJhY2s9ciksdD1MbihlLHUsbyksdCE9PW51bGwmJihLdCh0LGUsbyxsKSxkcyh0LGUsbykpfSxlbnF1ZXVlRm9yY2VVcGRhdGU6ZnVuY3Rpb24oZSx0KXtlPWUuX3JlYWN0SW50ZXJuYWxzO3ZhciByPWt0KCksbD1EbihlKSxvPXBuKHIsbCk7by50YWc9Mix0IT1udWxsJiYoby5jYWxsYmFjaz10KSx0PUxuKGUsbyxsKSx0IT09bnVsbCYmKEt0KHQsZSxsLHIpLGRzKHQsZSxsKSl9fTtmdW5jdGlvbiBhYyhlLHQscixsLG8sdSxkKXtyZXR1cm4gZT1lLnN0YXRlTm9kZSx0eXBlb2YgZS5zaG91bGRDb21wb25lbnRVcGRhdGU9PSJmdW5jdGlvbiI/ZS5zaG91bGRDb21wb25lbnRVcGRhdGUobCx1LGQpOnQucHJvdG90eXBlJiZ0LnByb3RvdHlwZS5pc1B1cmVSZWFjdENvbXBvbmVudD8hWnIocixsKXx8IVpyKG8sdSk6ITB9ZnVuY3Rpb24gaWMoZSx0LHIpe3ZhciBsPSExLG89VG4sdT10LmNvbnRleHRUeXBlO3JldHVybiB0eXBlb2YgdT09Im9iamVjdCImJnUhPT1udWxsP3U9enQodSk6KG89TnQodCk/R246Z3QuY3VycmVudCxsPXQuY29udGV4dFR5cGVzLHU9KGw9bCE9bnVsbCk/Z3IoZSxvKTpUbiksdD1uZXcgdChyLHUpLGUubWVtb2l6ZWRTdGF0ZT10LnN0YXRlIT09bnVsbCYmdC5zdGF0ZSE9PXZvaWQgMD90LnN0YXRlOm51bGwsdC51cGRhdGVyPXdzLGUuc3RhdGVOb2RlPXQsdC5fcmVhY3RJbnRlcm5hbHM9ZSxsJiYoZT1lLnN0YXRlTm9kZSxlLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkVW5tYXNrZWRDaGlsZENvbnRleHQ9byxlLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWFza2VkQ2hpbGRDb250ZXh0PXUpLHR9ZnVuY3Rpb24gb2MoZSx0LHIsbCl7ZT10LnN0YXRlLHR5cGVvZiB0LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM9PSJmdW5jdGlvbiImJnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhyLGwpLHR5cGVvZiB0LlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzPT0iZnVuY3Rpb24iJiZ0LlVOU0FGRV9jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHIsbCksdC5zdGF0ZSE9PWUmJndzLmVucXVldWVSZXBsYWNlU3RhdGUodCx0LnN0YXRlLG51bGwpfWZ1bmN0aW9uIG9pKGUsdCxyLGwpe3ZhciBvPWUuc3RhdGVOb2RlO28ucHJvcHM9cixvLnN0YXRlPWUubWVtb2l6ZWRTdGF0ZSxvLnJlZnM9e30scWEoZSk7dmFyIHU9dC5jb250ZXh0VHlwZTt0eXBlb2YgdT09Im9iamVjdCImJnUhPT1udWxsP28uY29udGV4dD16dCh1KToodT1OdCh0KT9HbjpndC5jdXJyZW50LG8uY29udGV4dD1ncihlLHUpKSxvLnN0YXRlPWUubWVtb2l6ZWRTdGF0ZSx1PXQuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzLHR5cGVvZiB1PT0iZnVuY3Rpb24iJiYoaWkoZSx0LHUsciksby5zdGF0ZT1lLm1lbW9pemVkU3RhdGUpLHR5cGVvZiB0LmdldERlcml2ZWRTdGF0ZUZyb21Qcm9wcz09ImZ1bmN0aW9uInx8dHlwZW9mIG8uZ2V0U25hcHNob3RCZWZvcmVVcGRhdGU9PSJmdW5jdGlvbiJ8fHR5cGVvZiBvLlVOU0FGRV9jb21wb25lbnRXaWxsTW91bnQhPSJmdW5jdGlvbiImJnR5cGVvZiBvLmNvbXBvbmVudFdpbGxNb3VudCE9ImZ1bmN0aW9uInx8KHQ9by5zdGF0ZSx0eXBlb2Ygby5jb21wb25lbnRXaWxsTW91bnQ9PSJmdW5jdGlvbiImJm8uY29tcG9uZW50V2lsbE1vdW50KCksdHlwZW9mIG8uVU5TQUZFX2NvbXBvbmVudFdpbGxNb3VudD09ImZ1bmN0aW9uIiYmby5VTlNBRkVfY29tcG9uZW50V2lsbE1vdW50KCksdCE9PW8uc3RhdGUmJndzLmVucXVldWVSZXBsYWNlU3RhdGUobyxvLnN0YXRlLG51bGwpLHBzKGUscixvLGwpLG8uc3RhdGU9ZS5tZW1vaXplZFN0YXRlKSx0eXBlb2Ygby5jb21wb25lbnREaWRNb3VudD09ImZ1bmN0aW9uIiYmKGUuZmxhZ3N8PTQxOTQzMDgpfWZ1bmN0aW9uIGJyKGUsdCl7dHJ5e3ZhciByPSIiLGw9dDtkbyByKz1VKGwpLGw9bC5yZXR1cm47d2hpbGUobCk7dmFyIG89cn1jYXRjaCh1KXtvPWAKRXJyb3IgZ2VuZXJhdGluZyBzdGFjazogYCt1Lm1lc3NhZ2UrYApgK3Uuc3RhY2t9cmV0dXJue3ZhbHVlOmUsc291cmNlOnQsc3RhY2s6byxkaWdlc3Q6bnVsbH19ZnVuY3Rpb24gdWkoZSx0LHIpe3JldHVybnt2YWx1ZTplLHNvdXJjZTpudWxsLHN0YWNrOnI/P251bGwsZGlnZXN0OnQ/P251bGx9fWZ1bmN0aW9uIGNpKGUsdCl7dHJ5e2NvbnNvbGUuZXJyb3IodC52YWx1ZSl9Y2F0Y2gocil7c2V0VGltZW91dChmdW5jdGlvbigpe3Rocm93IHJ9KX19dmFyIEwwPXR5cGVvZiBXZWFrTWFwPT0iZnVuY3Rpb24iP1dlYWtNYXA6TWFwO2Z1bmN0aW9uIHVjKGUsdCxyKXtyPXBuKC0xLHIpLHIudGFnPTMsci5wYXlsb2FkPXtlbGVtZW50Om51bGx9O3ZhciBsPXQudmFsdWU7cmV0dXJuIHIuY2FsbGJhY2s9ZnVuY3Rpb24oKXtNc3x8KE1zPSEwLE5pPWwpLGNpKGUsdCl9LHJ9ZnVuY3Rpb24gY2MoZSx0LHIpe3I9cG4oLTEsciksci50YWc9Mzt2YXIgbD1lLnR5cGUuZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yO2lmKHR5cGVvZiBsPT0iZnVuY3Rpb24iKXt2YXIgbz10LnZhbHVlO3IucGF5bG9hZD1mdW5jdGlvbigpe3JldHVybiBsKG8pfSxyLmNhbGxiYWNrPWZ1bmN0aW9uKCl7Y2koZSx0KX19dmFyIHU9ZS5zdGF0ZU5vZGU7cmV0dXJuIHUhPT1udWxsJiZ0eXBlb2YgdS5jb21wb25lbnREaWRDYXRjaD09ImZ1bmN0aW9uIiYmKHIuY2FsbGJhY2s9ZnVuY3Rpb24oKXtjaShlLHQpLHR5cGVvZiBsIT0iZnVuY3Rpb24iJiYoQW49PT1udWxsP0FuPW5ldyBTZXQoW3RoaXNdKTpBbi5hZGQodGhpcykpO3ZhciBkPXQuc3RhY2s7dGhpcy5jb21wb25lbnREaWRDYXRjaCh0LnZhbHVlLHtjb21wb25lbnRTdGFjazpkIT09bnVsbD9kOiIifSl9KSxyfWZ1bmN0aW9uIGZjKGUsdCxyKXt2YXIgbD1lLnBpbmdDYWNoZTtpZihsPT09bnVsbCl7bD1lLnBpbmdDYWNoZT1uZXcgTDA7dmFyIG89bmV3IFNldDtsLnNldCh0LG8pfWVsc2Ugbz1sLmdldCh0KSxvPT09dm9pZCAwJiYobz1uZXcgU2V0LGwuc2V0KHQsbykpO28uaGFzKHIpfHwoby5hZGQociksZT1HMC5iaW5kKG51bGwsZSx0LHIpLHQudGhlbihlLGUpKX1mdW5jdGlvbiBkYyhlKXtkb3t2YXIgdDtpZigodD1lLnRhZz09PTEzKSYmKHQ9ZS5tZW1vaXplZFN0YXRlLHQ9dCE9PW51bGw/dC5kZWh5ZHJhdGVkIT09bnVsbDohMCksdClyZXR1cm4gZTtlPWUucmV0dXJufXdoaWxlKGUhPT1udWxsKTtyZXR1cm4gbnVsbH1mdW5jdGlvbiBwYyhlLHQscixsLG8pe3JldHVybihlLm1vZGUmMSk9PT0wPyhlPT09dD9lLmZsYWdzfD02NTUzNjooZS5mbGFnc3w9MTI4LHIuZmxhZ3N8PTEzMTA3MixyLmZsYWdzJj0tNTI4MDUsci50YWc9PT0xJiYoci5hbHRlcm5hdGU9PT1udWxsP3IudGFnPTE3Oih0PXBuKC0xLDEpLHQudGFnPTIsTG4ocix0LDEpKSksci5sYW5lc3w9MSksZSk6KGUuZmxhZ3N8PTY1NTM2LGUubGFuZXM9byxlKX12YXIgXzA9aGUuUmVhY3RDdXJyZW50T3duZXIsQ3Q9ITE7ZnVuY3Rpb24gd3QoZSx0LHIsbCl7dC5jaGlsZD1lPT09bnVsbD9fdSh0LG51bGwscixsKTp3cih0LGUuY2hpbGQscixsKX1mdW5jdGlvbiBoYyhlLHQscixsLG8pe3I9ci5yZW5kZXI7dmFyIHU9dC5yZWY7cmV0dXJuIFNyKHQsbyksbD10aShlLHQscixsLHUsbykscj1uaSgpLGUhPT1udWxsJiYhQ3Q/KHQudXBkYXRlUXVldWU9ZS51cGRhdGVRdWV1ZSx0LmZsYWdzJj0tMjA1MyxlLmxhbmVzJj1+byxobihlLHQsbykpOihxZSYmciYmT2EodCksdC5mbGFnc3w9MSx3dChlLHQsbCxvKSx0LmNoaWxkKX1mdW5jdGlvbiBtYyhlLHQscixsLG8pe2lmKGU9PT1udWxsKXt2YXIgdT1yLnR5cGU7cmV0dXJuIHR5cGVvZiB1PT0iZnVuY3Rpb24iJiYhTGkodSkmJnUuZGVmYXVsdFByb3BzPT09dm9pZCAwJiZyLmNvbXBhcmU9PT1udWxsJiZyLmRlZmF1bHRQcm9wcz09PXZvaWQgMD8odC50YWc9MTUsdC50eXBlPXUsZ2MoZSx0LHUsbCxvKSk6KGU9X3Moci50eXBlLG51bGwsbCx0LHQubW9kZSxvKSxlLnJlZj10LnJlZixlLnJldHVybj10LHQuY2hpbGQ9ZSl9aWYodT1lLmNoaWxkLChlLmxhbmVzJm8pPT09MCl7dmFyIGQ9dS5tZW1vaXplZFByb3BzO2lmKHI9ci5jb21wYXJlLHI9ciE9PW51bGw/cjpacixyKGQsbCkmJmUucmVmPT09dC5yZWYpcmV0dXJuIGhuKGUsdCxvKX1yZXR1cm4gdC5mbGFnc3w9MSxlPU9uKHUsbCksZS5yZWY9dC5yZWYsZS5yZXR1cm49dCx0LmNoaWxkPWV9ZnVuY3Rpb24gZ2MoZSx0LHIsbCxvKXtpZihlIT09bnVsbCl7dmFyIHU9ZS5tZW1vaXplZFByb3BzO2lmKFpyKHUsbCkmJmUucmVmPT09dC5yZWYpaWYoQ3Q9ITEsdC5wZW5kaW5nUHJvcHM9bD11LChlLmxhbmVzJm8pIT09MCkoZS5mbGFncyYxMzEwNzIpIT09MCYmKEN0PSEwKTtlbHNlIHJldHVybiB0LmxhbmVzPWUubGFuZXMsaG4oZSx0LG8pfXJldHVybiBmaShlLHQscixsLG8pfWZ1bmN0aW9uIHZjKGUsdCxyKXt2YXIgbD10LnBlbmRpbmdQcm9wcyxvPWwuY2hpbGRyZW4sdT1lIT09bnVsbD9lLm1lbW9pemVkU3RhdGU6bnVsbDtpZihsLm1vZGU9PT0iaGlkZGVuIilpZigodC5tb2RlJjEpPT09MCl0Lm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczowLGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LFVlKENyLEF0KSxBdHw9cjtlbHNle2lmKChyJjEwNzM3NDE4MjQpPT09MClyZXR1cm4gZT11IT09bnVsbD91LmJhc2VMYW5lc3xyOnIsdC5sYW5lcz10LmNoaWxkTGFuZXM9MTA3Mzc0MTgyNCx0Lm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczplLGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LHQudXBkYXRlUXVldWU9bnVsbCxVZShDcixBdCksQXR8PWUsbnVsbDt0Lm1lbW9pemVkU3RhdGU9e2Jhc2VMYW5lczowLGNhY2hlUG9vbDpudWxsLHRyYW5zaXRpb25zOm51bGx9LGw9dSE9PW51bGw/dS5iYXNlTGFuZXM6cixVZShDcixBdCksQXR8PWx9ZWxzZSB1IT09bnVsbD8obD11LmJhc2VMYW5lc3xyLHQubWVtb2l6ZWRTdGF0ZT1udWxsKTpsPXIsVWUoQ3IsQXQpLEF0fD1sO3JldHVybiB3dChlLHQsbyxyKSx0LmNoaWxkfWZ1bmN0aW9uIHljKGUsdCl7dmFyIHI9dC5yZWY7KGU9PT1udWxsJiZyIT09bnVsbHx8ZSE9PW51bGwmJmUucmVmIT09cikmJih0LmZsYWdzfD01MTIsdC5mbGFnc3w9MjA5NzE1Mil9ZnVuY3Rpb24gZmkoZSx0LHIsbCxvKXt2YXIgdT1OdChyKT9HbjpndC5jdXJyZW50O3JldHVybiB1PWdyKHQsdSksU3IodCxvKSxyPXRpKGUsdCxyLGwsdSxvKSxsPW5pKCksZSE9PW51bGwmJiFDdD8odC51cGRhdGVRdWV1ZT1lLnVwZGF0ZVF1ZXVlLHQuZmxhZ3MmPS0yMDUzLGUubGFuZXMmPX5vLGhuKGUsdCxvKSk6KHFlJiZsJiZPYSh0KSx0LmZsYWdzfD0xLHd0KGUsdCxyLG8pLHQuY2hpbGQpfWZ1bmN0aW9uIHhjKGUsdCxyLGwsbyl7aWYoTnQocikpe3ZhciB1PSEwO2xzKHQpfWVsc2UgdT0hMTtpZihTcih0LG8pLHQuc3RhdGVOb2RlPT09bnVsbClTcyhlLHQpLGljKHQscixsKSxvaSh0LHIsbCxvKSxsPSEwO2Vsc2UgaWYoZT09PW51bGwpe3ZhciBkPXQuc3RhdGVOb2RlLHk9dC5tZW1vaXplZFByb3BzO2QucHJvcHM9eTt2YXIgdz1kLmNvbnRleHQsTT1yLmNvbnRleHRUeXBlO3R5cGVvZiBNPT0ib2JqZWN0IiYmTSE9PW51bGw/TT16dChNKTooTT1OdChyKT9HbjpndC5jdXJyZW50LE09Z3IodCxNKSk7dmFyIEw9ci5nZXREZXJpdmVkU3RhdGVGcm9tUHJvcHMsRD10eXBlb2YgTD09ImZ1bmN0aW9uInx8dHlwZW9mIGQuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGU9PSJmdW5jdGlvbiI7RHx8dHlwZW9mIGQuVU5TQUZFX2NvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMhPSJmdW5jdGlvbiImJnR5cGVvZiBkLmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMhPSJmdW5jdGlvbiJ8fCh5IT09bHx8dyE9PU0pJiZvYyh0LGQsbCxNKSxQbj0hMTt2YXIgRT10Lm1lbW9pemVkU3RhdGU7ZC5zdGF0ZT1FLHBzKHQsbCxkLG8pLHc9dC5tZW1vaXplZFN0YXRlLHkhPT1sfHxFIT09d3x8YnQuY3VycmVudHx8UG4/KHR5cGVvZiBMPT0iZnVuY3Rpb24iJiYoaWkodCxyLEwsbCksdz10Lm1lbW9pemVkU3RhdGUpLCh5PVBufHxhYyh0LHIseSxsLEUsdyxNKSk/KER8fHR5cGVvZiBkLlVOU0FGRV9jb21wb25lbnRXaWxsTW91bnQhPSJmdW5jdGlvbiImJnR5cGVvZiBkLmNvbXBvbmVudFdpbGxNb3VudCE9ImZ1bmN0aW9uInx8KHR5cGVvZiBkLmNvbXBvbmVudFdpbGxNb3VudD09ImZ1bmN0aW9uIiYmZC5jb21wb25lbnRXaWxsTW91bnQoKSx0eXBlb2YgZC5VTlNBRkVfY29tcG9uZW50V2lsbE1vdW50PT0iZnVuY3Rpb24iJiZkLlVOU0FGRV9jb21wb25lbnRXaWxsTW91bnQoKSksdHlwZW9mIGQuY29tcG9uZW50RGlkTW91bnQ9PSJmdW5jdGlvbiImJih0LmZsYWdzfD00MTk0MzA4KSk6KHR5cGVvZiBkLmNvbXBvbmVudERpZE1vdW50PT0iZnVuY3Rpb24iJiYodC5mbGFnc3w9NDE5NDMwOCksdC5tZW1vaXplZFByb3BzPWwsdC5tZW1vaXplZFN0YXRlPXcpLGQucHJvcHM9bCxkLnN0YXRlPXcsZC5jb250ZXh0PU0sbD15KToodHlwZW9mIGQuY29tcG9uZW50RGlkTW91bnQ9PSJmdW5jdGlvbiImJih0LmZsYWdzfD00MTk0MzA4KSxsPSExKX1lbHNle2Q9dC5zdGF0ZU5vZGUsSXUoZSx0KSx5PXQubWVtb2l6ZWRQcm9wcyxNPXQudHlwZT09PXQuZWxlbWVudFR5cGU/eTpIdCh0LnR5cGUseSksZC5wcm9wcz1NLEQ9dC5wZW5kaW5nUHJvcHMsRT1kLmNvbnRleHQsdz1yLmNvbnRleHRUeXBlLHR5cGVvZiB3PT0ib2JqZWN0IiYmdyE9PW51bGw/dz16dCh3KToodz1OdChyKT9HbjpndC5jdXJyZW50LHc9Z3IodCx3KSk7dmFyIFE9ci5nZXREZXJpdmVkU3RhdGVGcm9tUHJvcHM7KEw9dHlwZW9mIFE9PSJmdW5jdGlvbiJ8fHR5cGVvZiBkLmdldFNuYXBzaG90QmVmb3JlVXBkYXRlPT0iZnVuY3Rpb24iKXx8dHlwZW9mIGQuVU5TQUZFX2NvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMhPSJmdW5jdGlvbiImJnR5cGVvZiBkLmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMhPSJmdW5jdGlvbiJ8fCh5IT09RHx8RSE9PXcpJiZvYyh0LGQsbCx3KSxQbj0hMSxFPXQubWVtb2l6ZWRTdGF0ZSxkLnN0YXRlPUUscHModCxsLGQsbyk7dmFyIEo9dC5tZW1vaXplZFN0YXRlO3khPT1EfHxFIT09Snx8YnQuY3VycmVudHx8UG4/KHR5cGVvZiBRPT0iZnVuY3Rpb24iJiYoaWkodCxyLFEsbCksSj10Lm1lbW9pemVkU3RhdGUpLChNPVBufHxhYyh0LHIsTSxsLEUsSix3KXx8ITEpPyhMfHx0eXBlb2YgZC5VTlNBRkVfY29tcG9uZW50V2lsbFVwZGF0ZSE9ImZ1bmN0aW9uIiYmdHlwZW9mIGQuY29tcG9uZW50V2lsbFVwZGF0ZSE9ImZ1bmN0aW9uInx8KHR5cGVvZiBkLmNvbXBvbmVudFdpbGxVcGRhdGU9PSJmdW5jdGlvbiImJmQuY29tcG9uZW50V2lsbFVwZGF0ZShsLEosdyksdHlwZW9mIGQuVU5TQUZFX2NvbXBvbmVudFdpbGxVcGRhdGU9PSJmdW5jdGlvbiImJmQuVU5TQUZFX2NvbXBvbmVudFdpbGxVcGRhdGUobCxKLHcpKSx0eXBlb2YgZC5jb21wb25lbnREaWRVcGRhdGU9PSJmdW5jdGlvbiImJih0LmZsYWdzfD00KSx0eXBlb2YgZC5nZXRTbmFwc2hvdEJlZm9yZVVwZGF0ZT09ImZ1bmN0aW9uIiYmKHQuZmxhZ3N8PTEwMjQpKToodHlwZW9mIGQuY29tcG9uZW50RGlkVXBkYXRlIT0iZnVuY3Rpb24ifHx5PT09ZS5tZW1vaXplZFByb3BzJiZFPT09ZS5tZW1vaXplZFN0YXRlfHwodC5mbGFnc3w9NCksdHlwZW9mIGQuZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUhPSJmdW5jdGlvbiJ8fHk9PT1lLm1lbW9pemVkUHJvcHMmJkU9PT1lLm1lbW9pemVkU3RhdGV8fCh0LmZsYWdzfD0xMDI0KSx0Lm1lbW9pemVkUHJvcHM9bCx0Lm1lbW9pemVkU3RhdGU9SiksZC5wcm9wcz1sLGQuc3RhdGU9SixkLmNvbnRleHQ9dyxsPU0pOih0eXBlb2YgZC5jb21wb25lbnREaWRVcGRhdGUhPSJmdW5jdGlvbiJ8fHk9PT1lLm1lbW9pemVkUHJvcHMmJkU9PT1lLm1lbW9pemVkU3RhdGV8fCh0LmZsYWdzfD00KSx0eXBlb2YgZC5nZXRTbmFwc2hvdEJlZm9yZVVwZGF0ZSE9ImZ1bmN0aW9uInx8eT09PWUubWVtb2l6ZWRQcm9wcyYmRT09PWUubWVtb2l6ZWRTdGF0ZXx8KHQuZmxhZ3N8PTEwMjQpLGw9ITEpfXJldHVybiBkaShlLHQscixsLHUsbyl9ZnVuY3Rpb24gZGkoZSx0LHIsbCxvLHUpe3ljKGUsdCk7dmFyIGQ9KHQuZmxhZ3MmMTI4KSE9PTA7aWYoIWwmJiFkKXJldHVybiBvJiZidSh0LHIsITEpLGhuKGUsdCx1KTtsPXQuc3RhdGVOb2RlLF8wLmN1cnJlbnQ9dDt2YXIgeT1kJiZ0eXBlb2Ygci5nZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IhPSJmdW5jdGlvbiI/bnVsbDpsLnJlbmRlcigpO3JldHVybiB0LmZsYWdzfD0xLGUhPT1udWxsJiZkPyh0LmNoaWxkPXdyKHQsZS5jaGlsZCxudWxsLHUpLHQuY2hpbGQ9d3IodCxudWxsLHksdSkpOnd0KGUsdCx5LHUpLHQubWVtb2l6ZWRTdGF0ZT1sLnN0YXRlLG8mJmJ1KHQsciwhMCksdC5jaGlsZH1mdW5jdGlvbiB3YyhlKXt2YXIgdD1lLnN0YXRlTm9kZTt0LnBlbmRpbmdDb250ZXh0P1N1KGUsdC5wZW5kaW5nQ29udGV4dCx0LnBlbmRpbmdDb250ZXh0IT09dC5jb250ZXh0KTp0LmNvbnRleHQmJlN1KGUsdC5jb250ZXh0LCExKSxRYShlLHQuY29udGFpbmVySW5mbyl9ZnVuY3Rpb24ga2MoZSx0LHIsbCxvKXtyZXR1cm4geHIoKSxXYShvKSx0LmZsYWdzfD0yNTYsd3QoZSx0LHIsbCksdC5jaGlsZH12YXIgcGk9e2RlaHlkcmF0ZWQ6bnVsbCx0cmVlQ29udGV4dDpudWxsLHJldHJ5TGFuZTowfTtmdW5jdGlvbiBoaShlKXtyZXR1cm57YmFzZUxhbmVzOmUsY2FjaGVQb29sOm51bGwsdHJhbnNpdGlvbnM6bnVsbH19ZnVuY3Rpb24gU2MoZSx0LHIpe3ZhciBsPXQucGVuZGluZ1Byb3BzLG89WmUuY3VycmVudCx1PSExLGQ9KHQuZmxhZ3MmMTI4KSE9PTAseTtpZigoeT1kKXx8KHk9ZSE9PW51bGwmJmUubWVtb2l6ZWRTdGF0ZT09PW51bGw/ITE6KG8mMikhPT0wKSx5Pyh1PSEwLHQuZmxhZ3MmPS0xMjkpOihlPT09bnVsbHx8ZS5tZW1vaXplZFN0YXRlIT09bnVsbCkmJihvfD0xKSxVZShaZSxvJjEpLGU9PT1udWxsKXJldHVybiAkYSh0KSxlPXQubWVtb2l6ZWRTdGF0ZSxlIT09bnVsbCYmKGU9ZS5kZWh5ZHJhdGVkLGUhPT1udWxsKT8oKHQubW9kZSYxKT09PTA/dC5sYW5lcz0xOmUuZGF0YT09PSIkISI/dC5sYW5lcz04OnQubGFuZXM9MTA3Mzc0MTgyNCxudWxsKTooZD1sLmNoaWxkcmVuLGU9bC5mYWxsYmFjayx1PyhsPXQubW9kZSx1PXQuY2hpbGQsZD17bW9kZToiaGlkZGVuIixjaGlsZHJlbjpkfSwobCYxKT09PTAmJnUhPT1udWxsPyh1LmNoaWxkTGFuZXM9MCx1LnBlbmRpbmdQcm9wcz1kKTp1PUFzKGQsbCwwLG51bGwpLGU9bnIoZSxsLHIsbnVsbCksdS5yZXR1cm49dCxlLnJldHVybj10LHUuc2libGluZz1lLHQuY2hpbGQ9dSx0LmNoaWxkLm1lbW9pemVkU3RhdGU9aGkociksdC5tZW1vaXplZFN0YXRlPXBpLGUpOm1pKHQsZCkpO2lmKG89ZS5tZW1vaXplZFN0YXRlLG8hPT1udWxsJiYoeT1vLmRlaHlkcmF0ZWQseSE9PW51bGwpKXJldHVybiBBMChlLHQsZCxsLHksbyxyKTtpZih1KXt1PWwuZmFsbGJhY2ssZD10Lm1vZGUsbz1lLmNoaWxkLHk9by5zaWJsaW5nO3ZhciB3PXttb2RlOiJoaWRkZW4iLGNoaWxkcmVuOmwuY2hpbGRyZW59O3JldHVybihkJjEpPT09MCYmdC5jaGlsZCE9PW8/KGw9dC5jaGlsZCxsLmNoaWxkTGFuZXM9MCxsLnBlbmRpbmdQcm9wcz13LHQuZGVsZXRpb25zPW51bGwpOihsPU9uKG8sdyksbC5zdWJ0cmVlRmxhZ3M9by5zdWJ0cmVlRmxhZ3MmMTQ2ODAwNjQpLHkhPT1udWxsP3U9T24oeSx1KToodT1ucih1LGQscixudWxsKSx1LmZsYWdzfD0yKSx1LnJldHVybj10LGwucmV0dXJuPXQsbC5zaWJsaW5nPXUsdC5jaGlsZD1sLGw9dSx1PXQuY2hpbGQsZD1lLmNoaWxkLm1lbW9pemVkU3RhdGUsZD1kPT09bnVsbD9oaShyKTp7YmFzZUxhbmVzOmQuYmFzZUxhbmVzfHIsY2FjaGVQb29sOm51bGwsdHJhbnNpdGlvbnM6ZC50cmFuc2l0aW9uc30sdS5tZW1vaXplZFN0YXRlPWQsdS5jaGlsZExhbmVzPWUuY2hpbGRMYW5lcyZ+cix0Lm1lbW9pemVkU3RhdGU9cGksbH1yZXR1cm4gdT1lLmNoaWxkLGU9dS5zaWJsaW5nLGw9T24odSx7bW9kZToidmlzaWJsZSIsY2hpbGRyZW46bC5jaGlsZHJlbn0pLCh0Lm1vZGUmMSk9PT0wJiYobC5sYW5lcz1yKSxsLnJldHVybj10LGwuc2libGluZz1udWxsLGUhPT1udWxsJiYocj10LmRlbGV0aW9ucyxyPT09bnVsbD8odC5kZWxldGlvbnM9W2VdLHQuZmxhZ3N8PTE2KTpyLnB1c2goZSkpLHQuY2hpbGQ9bCx0Lm1lbW9pemVkU3RhdGU9bnVsbCxsfWZ1bmN0aW9uIG1pKGUsdCl7cmV0dXJuIHQ9QXMoe21vZGU6InZpc2libGUiLGNoaWxkcmVuOnR9LGUubW9kZSwwLG51bGwpLHQucmV0dXJuPWUsZS5jaGlsZD10fWZ1bmN0aW9uIGtzKGUsdCxyLGwpe3JldHVybiBsIT09bnVsbCYmV2EobCksd3IodCxlLmNoaWxkLG51bGwsciksZT1taSh0LHQucGVuZGluZ1Byb3BzLmNoaWxkcmVuKSxlLmZsYWdzfD0yLHQubWVtb2l6ZWRTdGF0ZT1udWxsLGV9ZnVuY3Rpb24gQTAoZSx0LHIsbCxvLHUsZCl7aWYocilyZXR1cm4gdC5mbGFncyYyNTY/KHQuZmxhZ3MmPS0yNTcsbD11aShFcnJvcihpKDQyMikpKSxrcyhlLHQsZCxsKSk6dC5tZW1vaXplZFN0YXRlIT09bnVsbD8odC5jaGlsZD1lLmNoaWxkLHQuZmxhZ3N8PTEyOCxudWxsKToodT1sLmZhbGxiYWNrLG89dC5tb2RlLGw9QXMoe21vZGU6InZpc2libGUiLGNoaWxkcmVuOmwuY2hpbGRyZW59LG8sMCxudWxsKSx1PW5yKHUsbyxkLG51bGwpLHUuZmxhZ3N8PTIsbC5yZXR1cm49dCx1LnJldHVybj10LGwuc2libGluZz11LHQuY2hpbGQ9bCwodC5tb2RlJjEpIT09MCYmd3IodCxlLmNoaWxkLG51bGwsZCksdC5jaGlsZC5tZW1vaXplZFN0YXRlPWhpKGQpLHQubWVtb2l6ZWRTdGF0ZT1waSx1KTtpZigodC5tb2RlJjEpPT09MClyZXR1cm4ga3MoZSx0LGQsbnVsbCk7aWYoby5kYXRhPT09IiQhIil7aWYobD1vLm5leHRTaWJsaW5nJiZvLm5leHRTaWJsaW5nLmRhdGFzZXQsbCl2YXIgeT1sLmRnc3Q7cmV0dXJuIGw9eSx1PUVycm9yKGkoNDE5KSksbD11aSh1LGwsdm9pZCAwKSxrcyhlLHQsZCxsKX1pZih5PShkJmUuY2hpbGRMYW5lcykhPT0wLEN0fHx5KXtpZihsPWZ0LGwhPT1udWxsKXtzd2l0Y2goZCYtZCl7Y2FzZSA0Om89MjticmVhaztjYXNlIDE2Om89ODticmVhaztjYXNlIDY0OmNhc2UgMTI4OmNhc2UgMjU2OmNhc2UgNTEyOmNhc2UgMTAyNDpjYXNlIDIwNDg6Y2FzZSA0MDk2OmNhc2UgODE5MjpjYXNlIDE2Mzg0OmNhc2UgMzI3Njg6Y2FzZSA2NTUzNjpjYXNlIDEzMTA3MjpjYXNlIDI2MjE0NDpjYXNlIDUyNDI4ODpjYXNlIDEwNDg1NzY6Y2FzZSAyMDk3MTUyOmNhc2UgNDE5NDMwNDpjYXNlIDgzODg2MDg6Y2FzZSAxNjc3NzIxNjpjYXNlIDMzNTU0NDMyOmNhc2UgNjcxMDg4NjQ6bz0zMjticmVhaztjYXNlIDUzNjg3MDkxMjpvPTI2ODQzNTQ1NjticmVhaztkZWZhdWx0Om89MH1vPShvJihsLnN1c3BlbmRlZExhbmVzfGQpKSE9PTA/MDpvLG8hPT0wJiZvIT09dS5yZXRyeUxhbmUmJih1LnJldHJ5TGFuZT1vLGRuKGUsbyksS3QobCxlLG8sLTEpKX1yZXR1cm4gUGkoKSxsPXVpKEVycm9yKGkoNDIxKSkpLGtzKGUsdCxkLGwpfXJldHVybiBvLmRhdGE9PT0iJD8iPyh0LmZsYWdzfD0xMjgsdC5jaGlsZD1lLmNoaWxkLHQ9SzAuYmluZChudWxsLGUpLG8uX3JlYWN0UmV0cnk9dCxudWxsKTooZT11LnRyZWVDb250ZXh0LF90PU1uKG8ubmV4dFNpYmxpbmcpLEx0PXQscWU9ITAsVXQ9bnVsbCxlIT09bnVsbCYmKEl0W0R0KytdPWNuLEl0W0R0KytdPWZuLEl0W0R0KytdPUtuLGNuPWUuaWQsZm49ZS5vdmVyZmxvdyxLbj10KSx0PW1pKHQsbC5jaGlsZHJlbiksdC5mbGFnc3w9NDA5Nix0KX1mdW5jdGlvbiBqYyhlLHQscil7ZS5sYW5lc3w9dDt2YXIgbD1lLmFsdGVybmF0ZTtsIT09bnVsbCYmKGwubGFuZXN8PXQpLEdhKGUucmV0dXJuLHQscil9ZnVuY3Rpb24gZ2koZSx0LHIsbCxvKXt2YXIgdT1lLm1lbW9pemVkU3RhdGU7dT09PW51bGw/ZS5tZW1vaXplZFN0YXRlPXtpc0JhY2t3YXJkczp0LHJlbmRlcmluZzpudWxsLHJlbmRlcmluZ1N0YXJ0VGltZTowLGxhc3Q6bCx0YWlsOnIsdGFpbE1vZGU6b306KHUuaXNCYWNrd2FyZHM9dCx1LnJlbmRlcmluZz1udWxsLHUucmVuZGVyaW5nU3RhcnRUaW1lPTAsdS5sYXN0PWwsdS50YWlsPXIsdS50YWlsTW9kZT1vKX1mdW5jdGlvbiBiYyhlLHQscil7dmFyIGw9dC5wZW5kaW5nUHJvcHMsbz1sLnJldmVhbE9yZGVyLHU9bC50YWlsO2lmKHd0KGUsdCxsLmNoaWxkcmVuLHIpLGw9WmUuY3VycmVudCwobCYyKSE9PTApbD1sJjF8Mix0LmZsYWdzfD0xMjg7ZWxzZXtpZihlIT09bnVsbCYmKGUuZmxhZ3MmMTI4KSE9PTApZTpmb3IoZT10LmNoaWxkO2UhPT1udWxsOyl7aWYoZS50YWc9PT0xMyllLm1lbW9pemVkU3RhdGUhPT1udWxsJiZqYyhlLHIsdCk7ZWxzZSBpZihlLnRhZz09PTE5KWpjKGUscix0KTtlbHNlIGlmKGUuY2hpbGQhPT1udWxsKXtlLmNoaWxkLnJldHVybj1lLGU9ZS5jaGlsZDtjb250aW51ZX1pZihlPT09dClicmVhayBlO2Zvcig7ZS5zaWJsaW5nPT09bnVsbDspe2lmKGUucmV0dXJuPT09bnVsbHx8ZS5yZXR1cm49PT10KWJyZWFrIGU7ZT1lLnJldHVybn1lLnNpYmxpbmcucmV0dXJuPWUucmV0dXJuLGU9ZS5zaWJsaW5nfWwmPTF9aWYoVWUoWmUsbCksKHQubW9kZSYxKT09PTApdC5tZW1vaXplZFN0YXRlPW51bGw7ZWxzZSBzd2l0Y2gobyl7Y2FzZSJmb3J3YXJkcyI6Zm9yKHI9dC5jaGlsZCxvPW51bGw7ciE9PW51bGw7KWU9ci5hbHRlcm5hdGUsZSE9PW51bGwmJmhzKGUpPT09bnVsbCYmKG89cikscj1yLnNpYmxpbmc7cj1vLHI9PT1udWxsPyhvPXQuY2hpbGQsdC5jaGlsZD1udWxsKToobz1yLnNpYmxpbmcsci5zaWJsaW5nPW51bGwpLGdpKHQsITEsbyxyLHUpO2JyZWFrO2Nhc2UiYmFja3dhcmRzIjpmb3Iocj1udWxsLG89dC5jaGlsZCx0LmNoaWxkPW51bGw7byE9PW51bGw7KXtpZihlPW8uYWx0ZXJuYXRlLGUhPT1udWxsJiZocyhlKT09PW51bGwpe3QuY2hpbGQ9bzticmVha31lPW8uc2libGluZyxvLnNpYmxpbmc9cixyPW8sbz1lfWdpKHQsITAscixudWxsLHUpO2JyZWFrO2Nhc2UidG9nZXRoZXIiOmdpKHQsITEsbnVsbCxudWxsLHZvaWQgMCk7YnJlYWs7ZGVmYXVsdDp0Lm1lbW9pemVkU3RhdGU9bnVsbH1yZXR1cm4gdC5jaGlsZH1mdW5jdGlvbiBTcyhlLHQpeyh0Lm1vZGUmMSk9PT0wJiZlIT09bnVsbCYmKGUuYWx0ZXJuYXRlPW51bGwsdC5hbHRlcm5hdGU9bnVsbCx0LmZsYWdzfD0yKX1mdW5jdGlvbiBobihlLHQscil7aWYoZSE9PW51bGwmJih0LmRlcGVuZGVuY2llcz1lLmRlcGVuZGVuY2llcyksWm58PXQubGFuZXMsKHImdC5jaGlsZExhbmVzKT09PTApcmV0dXJuIG51bGw7aWYoZSE9PW51bGwmJnQuY2hpbGQhPT1lLmNoaWxkKXRocm93IEVycm9yKGkoMTUzKSk7aWYodC5jaGlsZCE9PW51bGwpe2ZvcihlPXQuY2hpbGQscj1PbihlLGUucGVuZGluZ1Byb3BzKSx0LmNoaWxkPXIsci5yZXR1cm49dDtlLnNpYmxpbmchPT1udWxsOyllPWUuc2libGluZyxyPXIuc2libGluZz1PbihlLGUucGVuZGluZ1Byb3BzKSxyLnJldHVybj10O3Iuc2libGluZz1udWxsfXJldHVybiB0LmNoaWxkfWZ1bmN0aW9uIEkwKGUsdCxyKXtzd2l0Y2godC50YWcpe2Nhc2UgMzp3Yyh0KSx4cigpO2JyZWFrO2Nhc2UgNTpPdSh0KTticmVhaztjYXNlIDE6TnQodC50eXBlKSYmbHModCk7YnJlYWs7Y2FzZSA0OlFhKHQsdC5zdGF0ZU5vZGUuY29udGFpbmVySW5mbyk7YnJlYWs7Y2FzZSAxMDp2YXIgbD10LnR5cGUuX2NvbnRleHQsbz10Lm1lbW9pemVkUHJvcHMudmFsdWU7VWUoY3MsbC5fY3VycmVudFZhbHVlKSxsLl9jdXJyZW50VmFsdWU9bzticmVhaztjYXNlIDEzOmlmKGw9dC5tZW1vaXplZFN0YXRlLGwhPT1udWxsKXJldHVybiBsLmRlaHlkcmF0ZWQhPT1udWxsPyhVZShaZSxaZS5jdXJyZW50JjEpLHQuZmxhZ3N8PTEyOCxudWxsKToociZ0LmNoaWxkLmNoaWxkTGFuZXMpIT09MD9TYyhlLHQscik6KFVlKFplLFplLmN1cnJlbnQmMSksZT1obihlLHQsciksZSE9PW51bGw/ZS5zaWJsaW5nOm51bGwpO1VlKFplLFplLmN1cnJlbnQmMSk7YnJlYWs7Y2FzZSAxOTppZihsPShyJnQuY2hpbGRMYW5lcykhPT0wLChlLmZsYWdzJjEyOCkhPT0wKXtpZihsKXJldHVybiBiYyhlLHQscik7dC5mbGFnc3w9MTI4fWlmKG89dC5tZW1vaXplZFN0YXRlLG8hPT1udWxsJiYoby5yZW5kZXJpbmc9bnVsbCxvLnRhaWw9bnVsbCxvLmxhc3RFZmZlY3Q9bnVsbCksVWUoWmUsWmUuY3VycmVudCksbClicmVhaztyZXR1cm4gbnVsbDtjYXNlIDIyOmNhc2UgMjM6cmV0dXJuIHQubGFuZXM9MCx2YyhlLHQscil9cmV0dXJuIGhuKGUsdCxyKX12YXIgTmMsdmksQ2MsTWM7TmM9ZnVuY3Rpb24oZSx0KXtmb3IodmFyIHI9dC5jaGlsZDtyIT09bnVsbDspe2lmKHIudGFnPT09NXx8ci50YWc9PT02KWUuYXBwZW5kQ2hpbGQoci5zdGF0ZU5vZGUpO2Vsc2UgaWYoci50YWchPT00JiZyLmNoaWxkIT09bnVsbCl7ci5jaGlsZC5yZXR1cm49cixyPXIuY2hpbGQ7Y29udGludWV9aWYocj09PXQpYnJlYWs7Zm9yKDtyLnNpYmxpbmc9PT1udWxsOyl7aWYoci5yZXR1cm49PT1udWxsfHxyLnJldHVybj09PXQpcmV0dXJuO3I9ci5yZXR1cm59ci5zaWJsaW5nLnJldHVybj1yLnJldHVybixyPXIuc2libGluZ319LHZpPWZ1bmN0aW9uKCl7fSxDYz1mdW5jdGlvbihlLHQscixsKXt2YXIgbz1lLm1lbW9pemVkUHJvcHM7aWYobyE9PWwpe2U9dC5zdGF0ZU5vZGUsWW4oWnQuY3VycmVudCk7dmFyIHU9bnVsbDtzd2l0Y2gocil7Y2FzZSJpbnB1dCI6bz1GKGUsbyksbD1GKGUsbCksdT1bXTticmVhaztjYXNlInNlbGVjdCI6bz1fKHt9LG8se3ZhbHVlOnZvaWQgMH0pLGw9Xyh7fSxsLHt2YWx1ZTp2b2lkIDB9KSx1PVtdO2JyZWFrO2Nhc2UidGV4dGFyZWEiOm89UGUoZSxvKSxsPVBlKGUsbCksdT1bXTticmVhaztkZWZhdWx0OnR5cGVvZiBvLm9uQ2xpY2shPSJmdW5jdGlvbiImJnR5cGVvZiBsLm9uQ2xpY2s9PSJmdW5jdGlvbiImJihlLm9uY2xpY2s9dHMpfVhzKHIsbCk7dmFyIGQ7cj1udWxsO2ZvcihNIGluIG8paWYoIWwuaGFzT3duUHJvcGVydHkoTSkmJm8uaGFzT3duUHJvcGVydHkoTSkmJm9bTV0hPW51bGwpaWYoTT09PSJzdHlsZSIpe3ZhciB5PW9bTV07Zm9yKGQgaW4geSl5Lmhhc093blByb3BlcnR5KGQpJiYocnx8KHI9e30pLHJbZF09IiIpfWVsc2UgTSE9PSJkYW5nZXJvdXNseVNldElubmVySFRNTCImJk0hPT0iY2hpbGRyZW4iJiZNIT09InN1cHByZXNzQ29udGVudEVkaXRhYmxlV2FybmluZyImJk0hPT0ic3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIiYmTSE9PSJhdXRvRm9jdXMiJiYoaC5oYXNPd25Qcm9wZXJ0eShNKT91fHwodT1bXSk6KHU9dXx8W10pLnB1c2goTSxudWxsKSk7Zm9yKE0gaW4gbCl7dmFyIHc9bFtNXTtpZih5PW8hPW51bGw/b1tNXTp2b2lkIDAsbC5oYXNPd25Qcm9wZXJ0eShNKSYmdyE9PXkmJih3IT1udWxsfHx5IT1udWxsKSlpZihNPT09InN0eWxlIilpZih5KXtmb3IoZCBpbiB5KSF5Lmhhc093blByb3BlcnR5KGQpfHx3JiZ3Lmhhc093blByb3BlcnR5KGQpfHwocnx8KHI9e30pLHJbZF09IiIpO2ZvcihkIGluIHcpdy5oYXNPd25Qcm9wZXJ0eShkKSYmeVtkXSE9PXdbZF0mJihyfHwocj17fSkscltkXT13W2RdKX1lbHNlIHJ8fCh1fHwodT1bXSksdS5wdXNoKE0scikpLHI9dztlbHNlIE09PT0iZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwiPyh3PXc/dy5fX2h0bWw6dm9pZCAwLHk9eT95Ll9faHRtbDp2b2lkIDAsdyE9bnVsbCYmeSE9PXcmJih1PXV8fFtdKS5wdXNoKE0sdykpOk09PT0iY2hpbGRyZW4iP3R5cGVvZiB3IT0ic3RyaW5nIiYmdHlwZW9mIHchPSJudW1iZXIifHwodT11fHxbXSkucHVzaChNLCIiK3cpOk0hPT0ic3VwcHJlc3NDb250ZW50RWRpdGFibGVXYXJuaW5nIiYmTSE9PSJzdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmciJiYoaC5oYXNPd25Qcm9wZXJ0eShNKT8odyE9bnVsbCYmTT09PSJvblNjcm9sbCImJlZlKCJzY3JvbGwiLGUpLHV8fHk9PT13fHwodT1bXSkpOih1PXV8fFtdKS5wdXNoKE0sdykpfXImJih1PXV8fFtdKS5wdXNoKCJzdHlsZSIscik7dmFyIE09dTsodC51cGRhdGVRdWV1ZT1NKSYmKHQuZmxhZ3N8PTQpfX0sTWM9ZnVuY3Rpb24oZSx0LHIsbCl7ciE9PWwmJih0LmZsYWdzfD00KX07ZnVuY3Rpb24gcGwoZSx0KXtpZighcWUpc3dpdGNoKGUudGFpbE1vZGUpe2Nhc2UiaGlkZGVuIjp0PWUudGFpbDtmb3IodmFyIHI9bnVsbDt0IT09bnVsbDspdC5hbHRlcm5hdGUhPT1udWxsJiYocj10KSx0PXQuc2libGluZztyPT09bnVsbD9lLnRhaWw9bnVsbDpyLnNpYmxpbmc9bnVsbDticmVhaztjYXNlImNvbGxhcHNlZCI6cj1lLnRhaWw7Zm9yKHZhciBsPW51bGw7ciE9PW51bGw7KXIuYWx0ZXJuYXRlIT09bnVsbCYmKGw9cikscj1yLnNpYmxpbmc7bD09PW51bGw/dHx8ZS50YWlsPT09bnVsbD9lLnRhaWw9bnVsbDplLnRhaWwuc2libGluZz1udWxsOmwuc2libGluZz1udWxsfX1mdW5jdGlvbiB5dChlKXt2YXIgdD1lLmFsdGVybmF0ZSE9PW51bGwmJmUuYWx0ZXJuYXRlLmNoaWxkPT09ZS5jaGlsZCxyPTAsbD0wO2lmKHQpZm9yKHZhciBvPWUuY2hpbGQ7byE9PW51bGw7KXJ8PW8ubGFuZXN8by5jaGlsZExhbmVzLGx8PW8uc3VidHJlZUZsYWdzJjE0NjgwMDY0LGx8PW8uZmxhZ3MmMTQ2ODAwNjQsby5yZXR1cm49ZSxvPW8uc2libGluZztlbHNlIGZvcihvPWUuY2hpbGQ7byE9PW51bGw7KXJ8PW8ubGFuZXN8by5jaGlsZExhbmVzLGx8PW8uc3VidHJlZUZsYWdzLGx8PW8uZmxhZ3Msby5yZXR1cm49ZSxvPW8uc2libGluZztyZXR1cm4gZS5zdWJ0cmVlRmxhZ3N8PWwsZS5jaGlsZExhbmVzPXIsdH1mdW5jdGlvbiBEMChlLHQscil7dmFyIGw9dC5wZW5kaW5nUHJvcHM7c3dpdGNoKEZhKHQpLHQudGFnKXtjYXNlIDI6Y2FzZSAxNjpjYXNlIDE1OmNhc2UgMDpjYXNlIDExOmNhc2UgNzpjYXNlIDg6Y2FzZSAxMjpjYXNlIDk6Y2FzZSAxNDpyZXR1cm4geXQodCksbnVsbDtjYXNlIDE6cmV0dXJuIE50KHQudHlwZSkmJnJzKCkseXQodCksbnVsbDtjYXNlIDM6cmV0dXJuIGw9dC5zdGF0ZU5vZGUsanIoKSxHZShidCksR2UoZ3QpLFphKCksbC5wZW5kaW5nQ29udGV4dCYmKGwuY29udGV4dD1sLnBlbmRpbmdDb250ZXh0LGwucGVuZGluZ0NvbnRleHQ9bnVsbCksKGU9PT1udWxsfHxlLmNoaWxkPT09bnVsbCkmJihvcyh0KT90LmZsYWdzfD00OmU9PT1udWxsfHxlLm1lbW9pemVkU3RhdGUuaXNEZWh5ZHJhdGVkJiYodC5mbGFncyYyNTYpPT09MHx8KHQuZmxhZ3N8PTEwMjQsVXQhPT1udWxsJiYoUmkoVXQpLFV0PW51bGwpKSksdmkoZSx0KSx5dCh0KSxudWxsO2Nhc2UgNTpZYSh0KTt2YXIgbz1ZbihvbC5jdXJyZW50KTtpZihyPXQudHlwZSxlIT09bnVsbCYmdC5zdGF0ZU5vZGUhPW51bGwpQ2MoZSx0LHIsbCxvKSxlLnJlZiE9PXQucmVmJiYodC5mbGFnc3w9NTEyLHQuZmxhZ3N8PTIwOTcxNTIpO2Vsc2V7aWYoIWwpe2lmKHQuc3RhdGVOb2RlPT09bnVsbCl0aHJvdyBFcnJvcihpKDE2NikpO3JldHVybiB5dCh0KSxudWxsfWlmKGU9WW4oWnQuY3VycmVudCksb3ModCkpe2w9dC5zdGF0ZU5vZGUscj10LnR5cGU7dmFyIHU9dC5tZW1vaXplZFByb3BzO3N3aXRjaChsW1h0XT10LGxbcmxdPXUsZT0odC5tb2RlJjEpIT09MCxyKXtjYXNlImRpYWxvZyI6VmUoImNhbmNlbCIsbCksVmUoImNsb3NlIixsKTticmVhaztjYXNlImlmcmFtZSI6Y2FzZSJvYmplY3QiOmNhc2UiZW1iZWQiOlZlKCJsb2FkIixsKTticmVhaztjYXNlInZpZGVvIjpjYXNlImF1ZGlvIjpmb3Iobz0wO288ZWwubGVuZ3RoO28rKylWZShlbFtvXSxsKTticmVhaztjYXNlInNvdXJjZSI6VmUoImVycm9yIixsKTticmVhaztjYXNlImltZyI6Y2FzZSJpbWFnZSI6Y2FzZSJsaW5rIjpWZSgiZXJyb3IiLGwpLFZlKCJsb2FkIixsKTticmVhaztjYXNlImRldGFpbHMiOlZlKCJ0b2dnbGUiLGwpO2JyZWFrO2Nhc2UiaW5wdXQiOmtlKGwsdSksVmUoImludmFsaWQiLGwpO2JyZWFrO2Nhc2Uic2VsZWN0IjpsLl93cmFwcGVyU3RhdGU9e3dhc011bHRpcGxlOiEhdS5tdWx0aXBsZX0sVmUoImludmFsaWQiLGwpO2JyZWFrO2Nhc2UidGV4dGFyZWEiOmplKGwsdSksVmUoImludmFsaWQiLGwpfVhzKHIsdSksbz1udWxsO2Zvcih2YXIgZCBpbiB1KWlmKHUuaGFzT3duUHJvcGVydHkoZCkpe3ZhciB5PXVbZF07ZD09PSJjaGlsZHJlbiI/dHlwZW9mIHk9PSJzdHJpbmciP2wudGV4dENvbnRlbnQhPT15JiYodS5zdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmchPT0hMCYmZXMobC50ZXh0Q29udGVudCx5LGUpLG89WyJjaGlsZHJlbiIseV0pOnR5cGVvZiB5PT0ibnVtYmVyIiYmbC50ZXh0Q29udGVudCE9PSIiK3kmJih1LnN1cHByZXNzSHlkcmF0aW9uV2FybmluZyE9PSEwJiZlcyhsLnRleHRDb250ZW50LHksZSksbz1bImNoaWxkcmVuIiwiIit5XSk6aC5oYXNPd25Qcm9wZXJ0eShkKSYmeSE9bnVsbCYmZD09PSJvblNjcm9sbCImJlZlKCJzY3JvbGwiLGwpfXN3aXRjaChyKXtjYXNlImlucHV0IjptZShsKSxXZShsLHUsITApO2JyZWFrO2Nhc2UidGV4dGFyZWEiOm1lKGwpLGJlKGwpO2JyZWFrO2Nhc2Uic2VsZWN0IjpjYXNlIm9wdGlvbiI6YnJlYWs7ZGVmYXVsdDp0eXBlb2YgdS5vbkNsaWNrPT0iZnVuY3Rpb24iJiYobC5vbmNsaWNrPXRzKX1sPW8sdC51cGRhdGVRdWV1ZT1sLGwhPT1udWxsJiYodC5mbGFnc3w9NCl9ZWxzZXtkPW8ubm9kZVR5cGU9PT05P286by5vd25lckRvY3VtZW50LGU9PT0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCImJihlPXhlKHIpKSxlPT09Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiP3I9PT0ic2NyaXB0Ij8oZT1kLmNyZWF0ZUVsZW1lbnQoImRpdiIpLGUuaW5uZXJIVE1MPSI8c2NyaXB0PjxcL3NjcmlwdD4iLGU9ZS5yZW1vdmVDaGlsZChlLmZpcnN0Q2hpbGQpKTp0eXBlb2YgbC5pcz09InN0cmluZyI/ZT1kLmNyZWF0ZUVsZW1lbnQocix7aXM6bC5pc30pOihlPWQuY3JlYXRlRWxlbWVudChyKSxyPT09InNlbGVjdCImJihkPWUsbC5tdWx0aXBsZT9kLm11bHRpcGxlPSEwOmwuc2l6ZSYmKGQuc2l6ZT1sLnNpemUpKSk6ZT1kLmNyZWF0ZUVsZW1lbnROUyhlLHIpLGVbWHRdPXQsZVtybF09bCxOYyhlLHQsITEsITEpLHQuc3RhdGVOb2RlPWU7ZTp7c3dpdGNoKGQ9WnMocixsKSxyKXtjYXNlImRpYWxvZyI6VmUoImNhbmNlbCIsZSksVmUoImNsb3NlIixlKSxvPWw7YnJlYWs7Y2FzZSJpZnJhbWUiOmNhc2Uib2JqZWN0IjpjYXNlImVtYmVkIjpWZSgibG9hZCIsZSksbz1sO2JyZWFrO2Nhc2UidmlkZW8iOmNhc2UiYXVkaW8iOmZvcihvPTA7bzxlbC5sZW5ndGg7bysrKVZlKGVsW29dLGUpO289bDticmVhaztjYXNlInNvdXJjZSI6VmUoImVycm9yIixlKSxvPWw7YnJlYWs7Y2FzZSJpbWciOmNhc2UiaW1hZ2UiOmNhc2UibGluayI6VmUoImVycm9yIixlKSxWZSgibG9hZCIsZSksbz1sO2JyZWFrO2Nhc2UiZGV0YWlscyI6VmUoInRvZ2dsZSIsZSksbz1sO2JyZWFrO2Nhc2UiaW5wdXQiOmtlKGUsbCksbz1GKGUsbCksVmUoImludmFsaWQiLGUpO2JyZWFrO2Nhc2Uib3B0aW9uIjpvPWw7YnJlYWs7Y2FzZSJzZWxlY3QiOmUuX3dyYXBwZXJTdGF0ZT17d2FzTXVsdGlwbGU6ISFsLm11bHRpcGxlfSxvPV8oe30sbCx7dmFsdWU6dm9pZCAwfSksVmUoImludmFsaWQiLGUpO2JyZWFrO2Nhc2UidGV4dGFyZWEiOmplKGUsbCksbz1QZShlLGwpLFZlKCJpbnZhbGlkIixlKTticmVhaztkZWZhdWx0Om89bH1YcyhyLG8pLHk9bztmb3IodSBpbiB5KWlmKHkuaGFzT3duUHJvcGVydHkodSkpe3ZhciB3PXlbdV07dT09PSJzdHlsZSI/Z28oZSx3KTp1PT09ImRhbmdlcm91c2x5U2V0SW5uZXJIVE1MIj8odz13P3cuX19odG1sOnZvaWQgMCx3IT1udWxsJiZhbihlLHcpKTp1PT09ImNoaWxkcmVuIj90eXBlb2Ygdz09InN0cmluZyI/KHIhPT0idGV4dGFyZWEifHx3IT09IiIpJiZsdChlLHcpOnR5cGVvZiB3PT0ibnVtYmVyIiYmbHQoZSwiIit3KTp1IT09InN1cHByZXNzQ29udGVudEVkaXRhYmxlV2FybmluZyImJnUhPT0ic3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIiYmdSE9PSJhdXRvRm9jdXMiJiYoaC5oYXNPd25Qcm9wZXJ0eSh1KT93IT1udWxsJiZ1PT09Im9uU2Nyb2xsIiYmVmUoInNjcm9sbCIsZSk6dyE9bnVsbCYmYWUoZSx1LHcsZCkpfXN3aXRjaChyKXtjYXNlImlucHV0IjptZShlKSxXZShlLGwsITEpO2JyZWFrO2Nhc2UidGV4dGFyZWEiOm1lKGUpLGJlKGUpO2JyZWFrO2Nhc2Uib3B0aW9uIjpsLnZhbHVlIT1udWxsJiZlLnNldEF0dHJpYnV0ZSgidmFsdWUiLCIiK1YobC52YWx1ZSkpO2JyZWFrO2Nhc2Uic2VsZWN0IjplLm11bHRpcGxlPSEhbC5tdWx0aXBsZSx1PWwudmFsdWUsdSE9bnVsbD9PKGUsISFsLm11bHRpcGxlLHUsITEpOmwuZGVmYXVsdFZhbHVlIT1udWxsJiZPKGUsISFsLm11bHRpcGxlLGwuZGVmYXVsdFZhbHVlLCEwKTticmVhaztkZWZhdWx0OnR5cGVvZiBvLm9uQ2xpY2s9PSJmdW5jdGlvbiImJihlLm9uY2xpY2s9dHMpfXN3aXRjaChyKXtjYXNlImJ1dHRvbiI6Y2FzZSJpbnB1dCI6Y2FzZSJzZWxlY3QiOmNhc2UidGV4dGFyZWEiOmw9ISFsLmF1dG9Gb2N1czticmVhayBlO2Nhc2UiaW1nIjpsPSEwO2JyZWFrIGU7ZGVmYXVsdDpsPSExfX1sJiYodC5mbGFnc3w9NCl9dC5yZWYhPT1udWxsJiYodC5mbGFnc3w9NTEyLHQuZmxhZ3N8PTIwOTcxNTIpfXJldHVybiB5dCh0KSxudWxsO2Nhc2UgNjppZihlJiZ0LnN0YXRlTm9kZSE9bnVsbClNYyhlLHQsZS5tZW1vaXplZFByb3BzLGwpO2Vsc2V7aWYodHlwZW9mIGwhPSJzdHJpbmciJiZ0LnN0YXRlTm9kZT09PW51bGwpdGhyb3cgRXJyb3IoaSgxNjYpKTtpZihyPVluKG9sLmN1cnJlbnQpLFluKFp0LmN1cnJlbnQpLG9zKHQpKXtpZihsPXQuc3RhdGVOb2RlLHI9dC5tZW1vaXplZFByb3BzLGxbWHRdPXQsKHU9bC5ub2RlVmFsdWUhPT1yKSYmKGU9THQsZSE9PW51bGwpKXN3aXRjaChlLnRhZyl7Y2FzZSAzOmVzKGwubm9kZVZhbHVlLHIsKGUubW9kZSYxKSE9PTApO2JyZWFrO2Nhc2UgNTplLm1lbW9pemVkUHJvcHMuc3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIT09ITAmJmVzKGwubm9kZVZhbHVlLHIsKGUubW9kZSYxKSE9PTApfXUmJih0LmZsYWdzfD00KX1lbHNlIGw9KHIubm9kZVR5cGU9PT05P3I6ci5vd25lckRvY3VtZW50KS5jcmVhdGVUZXh0Tm9kZShsKSxsW1h0XT10LHQuc3RhdGVOb2RlPWx9cmV0dXJuIHl0KHQpLG51bGw7Y2FzZSAxMzppZihHZShaZSksbD10Lm1lbW9pemVkU3RhdGUsZT09PW51bGx8fGUubWVtb2l6ZWRTdGF0ZSE9PW51bGwmJmUubWVtb2l6ZWRTdGF0ZS5kZWh5ZHJhdGVkIT09bnVsbCl7aWYocWUmJl90IT09bnVsbCYmKHQubW9kZSYxKSE9PTAmJih0LmZsYWdzJjEyOCk9PT0wKUV1KCkseHIoKSx0LmZsYWdzfD05ODU2MCx1PSExO2Vsc2UgaWYodT1vcyh0KSxsIT09bnVsbCYmbC5kZWh5ZHJhdGVkIT09bnVsbCl7aWYoZT09PW51bGwpe2lmKCF1KXRocm93IEVycm9yKGkoMzE4KSk7aWYodT10Lm1lbW9pemVkU3RhdGUsdT11IT09bnVsbD91LmRlaHlkcmF0ZWQ6bnVsbCwhdSl0aHJvdyBFcnJvcihpKDMxNykpO3VbWHRdPXR9ZWxzZSB4cigpLCh0LmZsYWdzJjEyOCk9PT0wJiYodC5tZW1vaXplZFN0YXRlPW51bGwpLHQuZmxhZ3N8PTQ7eXQodCksdT0hMX1lbHNlIFV0IT09bnVsbCYmKFJpKFV0KSxVdD1udWxsKSx1PSEwO2lmKCF1KXJldHVybiB0LmZsYWdzJjY1NTM2P3Q6bnVsbH1yZXR1cm4odC5mbGFncyYxMjgpIT09MD8odC5sYW5lcz1yLHQpOihsPWwhPT1udWxsLGwhPT0oZSE9PW51bGwmJmUubWVtb2l6ZWRTdGF0ZSE9PW51bGwpJiZsJiYodC5jaGlsZC5mbGFnc3w9ODE5MiwodC5tb2RlJjEpIT09MCYmKGU9PT1udWxsfHwoWmUuY3VycmVudCYxKSE9PTA/dXQ9PT0wJiYodXQ9Myk6UGkoKSkpLHQudXBkYXRlUXVldWUhPT1udWxsJiYodC5mbGFnc3w9NCkseXQodCksbnVsbCk7Y2FzZSA0OnJldHVybiBqcigpLHZpKGUsdCksZT09PW51bGwmJnRsKHQuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8pLHl0KHQpLG51bGw7Y2FzZSAxMDpyZXR1cm4gVmEodC50eXBlLl9jb250ZXh0KSx5dCh0KSxudWxsO2Nhc2UgMTc6cmV0dXJuIE50KHQudHlwZSkmJnJzKCkseXQodCksbnVsbDtjYXNlIDE5OmlmKEdlKFplKSx1PXQubWVtb2l6ZWRTdGF0ZSx1PT09bnVsbClyZXR1cm4geXQodCksbnVsbDtpZihsPSh0LmZsYWdzJjEyOCkhPT0wLGQ9dS5yZW5kZXJpbmcsZD09PW51bGwpaWYobClwbCh1LCExKTtlbHNle2lmKHV0IT09MHx8ZSE9PW51bGwmJihlLmZsYWdzJjEyOCkhPT0wKWZvcihlPXQuY2hpbGQ7ZSE9PW51bGw7KXtpZihkPWhzKGUpLGQhPT1udWxsKXtmb3IodC5mbGFnc3w9MTI4LHBsKHUsITEpLGw9ZC51cGRhdGVRdWV1ZSxsIT09bnVsbCYmKHQudXBkYXRlUXVldWU9bCx0LmZsYWdzfD00KSx0LnN1YnRyZWVGbGFncz0wLGw9cixyPXQuY2hpbGQ7ciE9PW51bGw7KXU9cixlPWwsdS5mbGFncyY9MTQ2ODAwNjYsZD11LmFsdGVybmF0ZSxkPT09bnVsbD8odS5jaGlsZExhbmVzPTAsdS5sYW5lcz1lLHUuY2hpbGQ9bnVsbCx1LnN1YnRyZWVGbGFncz0wLHUubWVtb2l6ZWRQcm9wcz1udWxsLHUubWVtb2l6ZWRTdGF0ZT1udWxsLHUudXBkYXRlUXVldWU9bnVsbCx1LmRlcGVuZGVuY2llcz1udWxsLHUuc3RhdGVOb2RlPW51bGwpOih1LmNoaWxkTGFuZXM9ZC5jaGlsZExhbmVzLHUubGFuZXM9ZC5sYW5lcyx1LmNoaWxkPWQuY2hpbGQsdS5zdWJ0cmVlRmxhZ3M9MCx1LmRlbGV0aW9ucz1udWxsLHUubWVtb2l6ZWRQcm9wcz1kLm1lbW9pemVkUHJvcHMsdS5tZW1vaXplZFN0YXRlPWQubWVtb2l6ZWRTdGF0ZSx1LnVwZGF0ZVF1ZXVlPWQudXBkYXRlUXVldWUsdS50eXBlPWQudHlwZSxlPWQuZGVwZW5kZW5jaWVzLHUuZGVwZW5kZW5jaWVzPWU9PT1udWxsP251bGw6e2xhbmVzOmUubGFuZXMsZmlyc3RDb250ZXh0OmUuZmlyc3RDb250ZXh0fSkscj1yLnNpYmxpbmc7cmV0dXJuIFVlKFplLFplLmN1cnJlbnQmMXwyKSx0LmNoaWxkfWU9ZS5zaWJsaW5nfXUudGFpbCE9PW51bGwmJnR0KCk+TXImJih0LmZsYWdzfD0xMjgsbD0hMCxwbCh1LCExKSx0LmxhbmVzPTQxOTQzMDQpfWVsc2V7aWYoIWwpaWYoZT1ocyhkKSxlIT09bnVsbCl7aWYodC5mbGFnc3w9MTI4LGw9ITAscj1lLnVwZGF0ZVF1ZXVlLHIhPT1udWxsJiYodC51cGRhdGVRdWV1ZT1yLHQuZmxhZ3N8PTQpLHBsKHUsITApLHUudGFpbD09PW51bGwmJnUudGFpbE1vZGU9PT0iaGlkZGVuIiYmIWQuYWx0ZXJuYXRlJiYhcWUpcmV0dXJuIHl0KHQpLG51bGx9ZWxzZSAyKnR0KCktdS5yZW5kZXJpbmdTdGFydFRpbWU+TXImJnIhPT0xMDczNzQxODI0JiYodC5mbGFnc3w9MTI4LGw9ITAscGwodSwhMSksdC5sYW5lcz00MTk0MzA0KTt1LmlzQmFja3dhcmRzPyhkLnNpYmxpbmc9dC5jaGlsZCx0LmNoaWxkPWQpOihyPXUubGFzdCxyIT09bnVsbD9yLnNpYmxpbmc9ZDp0LmNoaWxkPWQsdS5sYXN0PWQpfXJldHVybiB1LnRhaWwhPT1udWxsPyh0PXUudGFpbCx1LnJlbmRlcmluZz10LHUudGFpbD10LnNpYmxpbmcsdS5yZW5kZXJpbmdTdGFydFRpbWU9dHQoKSx0LnNpYmxpbmc9bnVsbCxyPVplLmN1cnJlbnQsVWUoWmUsbD9yJjF8MjpyJjEpLHQpOih5dCh0KSxudWxsKTtjYXNlIDIyOmNhc2UgMjM6cmV0dXJuIEVpKCksbD10Lm1lbW9pemVkU3RhdGUhPT1udWxsLGUhPT1udWxsJiZlLm1lbW9pemVkU3RhdGUhPT1udWxsIT09bCYmKHQuZmxhZ3N8PTgxOTIpLGwmJih0Lm1vZGUmMSkhPT0wPyhBdCYxMDczNzQxODI0KSE9PTAmJih5dCh0KSx0LnN1YnRyZWVGbGFncyY2JiYodC5mbGFnc3w9ODE5MikpOnl0KHQpLG51bGw7Y2FzZSAyNDpyZXR1cm4gbnVsbDtjYXNlIDI1OnJldHVybiBudWxsfXRocm93IEVycm9yKGkoMTU2LHQudGFnKSl9ZnVuY3Rpb24gejAoZSx0KXtzd2l0Y2goRmEodCksdC50YWcpe2Nhc2UgMTpyZXR1cm4gTnQodC50eXBlKSYmcnMoKSxlPXQuZmxhZ3MsZSY2NTUzNj8odC5mbGFncz1lJi02NTUzN3wxMjgsdCk6bnVsbDtjYXNlIDM6cmV0dXJuIGpyKCksR2UoYnQpLEdlKGd0KSxaYSgpLGU9dC5mbGFncywoZSY2NTUzNikhPT0wJiYoZSYxMjgpPT09MD8odC5mbGFncz1lJi02NTUzN3wxMjgsdCk6bnVsbDtjYXNlIDU6cmV0dXJuIFlhKHQpLG51bGw7Y2FzZSAxMzppZihHZShaZSksZT10Lm1lbW9pemVkU3RhdGUsZSE9PW51bGwmJmUuZGVoeWRyYXRlZCE9PW51bGwpe2lmKHQuYWx0ZXJuYXRlPT09bnVsbCl0aHJvdyBFcnJvcihpKDM0MCkpO3hyKCl9cmV0dXJuIGU9dC5mbGFncyxlJjY1NTM2Pyh0LmZsYWdzPWUmLTY1NTM3fDEyOCx0KTpudWxsO2Nhc2UgMTk6cmV0dXJuIEdlKFplKSxudWxsO2Nhc2UgNDpyZXR1cm4ganIoKSxudWxsO2Nhc2UgMTA6cmV0dXJuIFZhKHQudHlwZS5fY29udGV4dCksbnVsbDtjYXNlIDIyOmNhc2UgMjM6cmV0dXJuIEVpKCksbnVsbDtjYXNlIDI0OnJldHVybiBudWxsO2RlZmF1bHQ6cmV0dXJuIG51bGx9fXZhciBqcz0hMSx4dD0hMSxPMD10eXBlb2YgV2Vha1NldD09ImZ1bmN0aW9uIj9XZWFrU2V0OlNldCxaPW51bGw7ZnVuY3Rpb24gTnIoZSx0KXt2YXIgcj1lLnJlZjtpZihyIT09bnVsbClpZih0eXBlb2Ygcj09ImZ1bmN0aW9uIil0cnl7cihudWxsKX1jYXRjaChsKXtldChlLHQsbCl9ZWxzZSByLmN1cnJlbnQ9bnVsbH1mdW5jdGlvbiB5aShlLHQscil7dHJ5e3IoKX1jYXRjaChsKXtldChlLHQsbCl9fXZhciBSYz0hMTtmdW5jdGlvbiBGMChlLHQpe2lmKEVhPVVsLGU9YXUoKSxTYShlKSl7aWYoInNlbGVjdGlvblN0YXJ0ImluIGUpdmFyIHI9e3N0YXJ0OmUuc2VsZWN0aW9uU3RhcnQsZW5kOmUuc2VsZWN0aW9uRW5kfTtlbHNlIGU6e3I9KHI9ZS5vd25lckRvY3VtZW50KSYmci5kZWZhdWx0Vmlld3x8d2luZG93O3ZhciBsPXIuZ2V0U2VsZWN0aW9uJiZyLmdldFNlbGVjdGlvbigpO2lmKGwmJmwucmFuZ2VDb3VudCE9PTApe3I9bC5hbmNob3JOb2RlO3ZhciBvPWwuYW5jaG9yT2Zmc2V0LHU9bC5mb2N1c05vZGU7bD1sLmZvY3VzT2Zmc2V0O3RyeXtyLm5vZGVUeXBlLHUubm9kZVR5cGV9Y2F0Y2h7cj1udWxsO2JyZWFrIGV9dmFyIGQ9MCx5PS0xLHc9LTEsTT0wLEw9MCxEPWUsRT1udWxsO3Q6Zm9yKDs7KXtmb3IodmFyIFE7RCE9PXJ8fG8hPT0wJiZELm5vZGVUeXBlIT09M3x8KHk9ZCtvKSxEIT09dXx8bCE9PTAmJkQubm9kZVR5cGUhPT0zfHwodz1kK2wpLEQubm9kZVR5cGU9PT0zJiYoZCs9RC5ub2RlVmFsdWUubGVuZ3RoKSwoUT1ELmZpcnN0Q2hpbGQpIT09bnVsbDspRT1ELEQ9UTtmb3IoOzspe2lmKEQ9PT1lKWJyZWFrIHQ7aWYoRT09PXImJisrTT09PW8mJih5PWQpLEU9PT11JiYrK0w9PT1sJiYodz1kKSwoUT1ELm5leHRTaWJsaW5nKSE9PW51bGwpYnJlYWs7RD1FLEU9RC5wYXJlbnROb2RlfUQ9UX1yPXk9PT0tMXx8dz09PS0xP251bGw6e3N0YXJ0OnksZW5kOnd9fWVsc2Ugcj1udWxsfXI9cnx8e3N0YXJ0OjAsZW5kOjB9fWVsc2Ugcj1udWxsO2ZvcihQYT17Zm9jdXNlZEVsZW06ZSxzZWxlY3Rpb25SYW5nZTpyfSxVbD0hMSxaPXQ7WiE9PW51bGw7KWlmKHQ9WixlPXQuY2hpbGQsKHQuc3VidHJlZUZsYWdzJjEwMjgpIT09MCYmZSE9PW51bGwpZS5yZXR1cm49dCxaPWU7ZWxzZSBmb3IoO1ohPT1udWxsOyl7dD1aO3RyeXt2YXIgSj10LmFsdGVybmF0ZTtpZigodC5mbGFncyYxMDI0KSE9PTApc3dpdGNoKHQudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OmJyZWFrO2Nhc2UgMTppZihKIT09bnVsbCl7dmFyIG5lPUoubWVtb2l6ZWRQcm9wcyxudD1KLm1lbW9pemVkU3RhdGUsTj10LnN0YXRlTm9kZSxTPU4uZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUodC5lbGVtZW50VHlwZT09PXQudHlwZT9uZTpIdCh0LnR5cGUsbmUpLG50KTtOLl9fcmVhY3RJbnRlcm5hbFNuYXBzaG90QmVmb3JlVXBkYXRlPVN9YnJlYWs7Y2FzZSAzOnZhciBDPXQuc3RhdGVOb2RlLmNvbnRhaW5lckluZm87Qy5ub2RlVHlwZT09PTE/Qy50ZXh0Q29udGVudD0iIjpDLm5vZGVUeXBlPT09OSYmQy5kb2N1bWVudEVsZW1lbnQmJkMucmVtb3ZlQ2hpbGQoQy5kb2N1bWVudEVsZW1lbnQpO2JyZWFrO2Nhc2UgNTpjYXNlIDY6Y2FzZSA0OmNhc2UgMTc6YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihpKDE2MykpfX1jYXRjaCh6KXtldCh0LHQucmV0dXJuLHopfWlmKGU9dC5zaWJsaW5nLGUhPT1udWxsKXtlLnJldHVybj10LnJldHVybixaPWU7YnJlYWt9Wj10LnJldHVybn1yZXR1cm4gSj1SYyxSYz0hMSxKfWZ1bmN0aW9uIGhsKGUsdCxyKXt2YXIgbD10LnVwZGF0ZVF1ZXVlO2lmKGw9bCE9PW51bGw/bC5sYXN0RWZmZWN0Om51bGwsbCE9PW51bGwpe3ZhciBvPWw9bC5uZXh0O2Rve2lmKChvLnRhZyZlKT09PWUpe3ZhciB1PW8uZGVzdHJveTtvLmRlc3Ryb3k9dm9pZCAwLHUhPT12b2lkIDAmJnlpKHQscix1KX1vPW8ubmV4dH13aGlsZShvIT09bCl9fWZ1bmN0aW9uIGJzKGUsdCl7aWYodD10LnVwZGF0ZVF1ZXVlLHQ9dCE9PW51bGw/dC5sYXN0RWZmZWN0Om51bGwsdCE9PW51bGwpe3ZhciByPXQ9dC5uZXh0O2Rve2lmKChyLnRhZyZlKT09PWUpe3ZhciBsPXIuY3JlYXRlO3IuZGVzdHJveT1sKCl9cj1yLm5leHR9d2hpbGUociE9PXQpfX1mdW5jdGlvbiB4aShlKXt2YXIgdD1lLnJlZjtpZih0IT09bnVsbCl7dmFyIHI9ZS5zdGF0ZU5vZGU7c3dpdGNoKGUudGFnKXtjYXNlIDU6ZT1yO2JyZWFrO2RlZmF1bHQ6ZT1yfXR5cGVvZiB0PT0iZnVuY3Rpb24iP3QoZSk6dC5jdXJyZW50PWV9fWZ1bmN0aW9uIFRjKGUpe3ZhciB0PWUuYWx0ZXJuYXRlO3QhPT1udWxsJiYoZS5hbHRlcm5hdGU9bnVsbCxUYyh0KSksZS5jaGlsZD1udWxsLGUuZGVsZXRpb25zPW51bGwsZS5zaWJsaW5nPW51bGwsZS50YWc9PT01JiYodD1lLnN0YXRlTm9kZSx0IT09bnVsbCYmKGRlbGV0ZSB0W1h0XSxkZWxldGUgdFtybF0sZGVsZXRlIHRbSWFdLGRlbGV0ZSB0W2swXSxkZWxldGUgdFtTMF0pKSxlLnN0YXRlTm9kZT1udWxsLGUucmV0dXJuPW51bGwsZS5kZXBlbmRlbmNpZXM9bnVsbCxlLm1lbW9pemVkUHJvcHM9bnVsbCxlLm1lbW9pemVkU3RhdGU9bnVsbCxlLnBlbmRpbmdQcm9wcz1udWxsLGUuc3RhdGVOb2RlPW51bGwsZS51cGRhdGVRdWV1ZT1udWxsfWZ1bmN0aW9uIEVjKGUpe3JldHVybiBlLnRhZz09PTV8fGUudGFnPT09M3x8ZS50YWc9PT00fWZ1bmN0aW9uIFBjKGUpe2U6Zm9yKDs7KXtmb3IoO2Uuc2libGluZz09PW51bGw7KXtpZihlLnJldHVybj09PW51bGx8fEVjKGUucmV0dXJuKSlyZXR1cm4gbnVsbDtlPWUucmV0dXJufWZvcihlLnNpYmxpbmcucmV0dXJuPWUucmV0dXJuLGU9ZS5zaWJsaW5nO2UudGFnIT09NSYmZS50YWchPT02JiZlLnRhZyE9PTE4Oyl7aWYoZS5mbGFncyYyfHxlLmNoaWxkPT09bnVsbHx8ZS50YWc9PT00KWNvbnRpbnVlIGU7ZS5jaGlsZC5yZXR1cm49ZSxlPWUuY2hpbGR9aWYoIShlLmZsYWdzJjIpKXJldHVybiBlLnN0YXRlTm9kZX19ZnVuY3Rpb24gd2koZSx0LHIpe3ZhciBsPWUudGFnO2lmKGw9PT01fHxsPT09NillPWUuc3RhdGVOb2RlLHQ/ci5ub2RlVHlwZT09PTg/ci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShlLHQpOnIuaW5zZXJ0QmVmb3JlKGUsdCk6KHIubm9kZVR5cGU9PT04Pyh0PXIucGFyZW50Tm9kZSx0Lmluc2VydEJlZm9yZShlLHIpKToodD1yLHQuYXBwZW5kQ2hpbGQoZSkpLHI9ci5fcmVhY3RSb290Q29udGFpbmVyLHIhPW51bGx8fHQub25jbGljayE9PW51bGx8fCh0Lm9uY2xpY2s9dHMpKTtlbHNlIGlmKGwhPT00JiYoZT1lLmNoaWxkLGUhPT1udWxsKSlmb3Iod2koZSx0LHIpLGU9ZS5zaWJsaW5nO2UhPT1udWxsOyl3aShlLHQsciksZT1lLnNpYmxpbmd9ZnVuY3Rpb24ga2koZSx0LHIpe3ZhciBsPWUudGFnO2lmKGw9PT01fHxsPT09NillPWUuc3RhdGVOb2RlLHQ/ci5pbnNlcnRCZWZvcmUoZSx0KTpyLmFwcGVuZENoaWxkKGUpO2Vsc2UgaWYobCE9PTQmJihlPWUuY2hpbGQsZSE9PW51bGwpKWZvcihraShlLHQsciksZT1lLnNpYmxpbmc7ZSE9PW51bGw7KWtpKGUsdCxyKSxlPWUuc2libGluZ312YXIgaHQ9bnVsbCxWdD0hMTtmdW5jdGlvbiBfbihlLHQscil7Zm9yKHI9ci5jaGlsZDtyIT09bnVsbDspTGMoZSx0LHIpLHI9ci5zaWJsaW5nfWZ1bmN0aW9uIExjKGUsdCxyKXtpZihZdCYmdHlwZW9mIFl0Lm9uQ29tbWl0RmliZXJVbm1vdW50PT0iZnVuY3Rpb24iKXRyeXtZdC5vbkNvbW1pdEZpYmVyVW5tb3VudCh6bCxyKX1jYXRjaHt9c3dpdGNoKHIudGFnKXtjYXNlIDU6eHR8fE5yKHIsdCk7Y2FzZSA2OnZhciBsPWh0LG89VnQ7aHQ9bnVsbCxfbihlLHQsciksaHQ9bCxWdD1vLGh0IT09bnVsbCYmKFZ0PyhlPWh0LHI9ci5zdGF0ZU5vZGUsZS5ub2RlVHlwZT09PTg/ZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHIpOmUucmVtb3ZlQ2hpbGQocikpOmh0LnJlbW92ZUNoaWxkKHIuc3RhdGVOb2RlKSk7YnJlYWs7Y2FzZSAxODpodCE9PW51bGwmJihWdD8oZT1odCxyPXIuc3RhdGVOb2RlLGUubm9kZVR5cGU9PT04P0FhKGUucGFyZW50Tm9kZSxyKTplLm5vZGVUeXBlPT09MSYmQWEoZSxyKSxHcihlKSk6QWEoaHQsci5zdGF0ZU5vZGUpKTticmVhaztjYXNlIDQ6bD1odCxvPVZ0LGh0PXIuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sVnQ9ITAsX24oZSx0LHIpLGh0PWwsVnQ9bzticmVhaztjYXNlIDA6Y2FzZSAxMTpjYXNlIDE0OmNhc2UgMTU6aWYoIXh0JiYobD1yLnVwZGF0ZVF1ZXVlLGwhPT1udWxsJiYobD1sLmxhc3RFZmZlY3QsbCE9PW51bGwpKSl7bz1sPWwubmV4dDtkb3t2YXIgdT1vLGQ9dS5kZXN0cm95O3U9dS50YWcsZCE9PXZvaWQgMCYmKCh1JjIpIT09MHx8KHUmNCkhPT0wKSYmeWkocix0LGQpLG89by5uZXh0fXdoaWxlKG8hPT1sKX1fbihlLHQscik7YnJlYWs7Y2FzZSAxOmlmKCF4dCYmKE5yKHIsdCksbD1yLnN0YXRlTm9kZSx0eXBlb2YgbC5jb21wb25lbnRXaWxsVW5tb3VudD09ImZ1bmN0aW9uIikpdHJ5e2wucHJvcHM9ci5tZW1vaXplZFByb3BzLGwuc3RhdGU9ci5tZW1vaXplZFN0YXRlLGwuY29tcG9uZW50V2lsbFVubW91bnQoKX1jYXRjaCh5KXtldChyLHQseSl9X24oZSx0LHIpO2JyZWFrO2Nhc2UgMjE6X24oZSx0LHIpO2JyZWFrO2Nhc2UgMjI6ci5tb2RlJjE/KHh0PShsPXh0KXx8ci5tZW1vaXplZFN0YXRlIT09bnVsbCxfbihlLHQscikseHQ9bCk6X24oZSx0LHIpO2JyZWFrO2RlZmF1bHQ6X24oZSx0LHIpfX1mdW5jdGlvbiBfYyhlKXt2YXIgdD1lLnVwZGF0ZVF1ZXVlO2lmKHQhPT1udWxsKXtlLnVwZGF0ZVF1ZXVlPW51bGw7dmFyIHI9ZS5zdGF0ZU5vZGU7cj09PW51bGwmJihyPWUuc3RhdGVOb2RlPW5ldyBPMCksdC5mb3JFYWNoKGZ1bmN0aW9uKGwpe3ZhciBvPXEwLmJpbmQobnVsbCxlLGwpO3IuaGFzKGwpfHwoci5hZGQobCksbC50aGVuKG8sbykpfSl9fWZ1bmN0aW9uIEd0KGUsdCl7dmFyIHI9dC5kZWxldGlvbnM7aWYociE9PW51bGwpZm9yKHZhciBsPTA7bDxyLmxlbmd0aDtsKyspe3ZhciBvPXJbbF07dHJ5e3ZhciB1PWUsZD10LHk9ZDtlOmZvcig7eSE9PW51bGw7KXtzd2l0Y2goeS50YWcpe2Nhc2UgNTpodD15LnN0YXRlTm9kZSxWdD0hMTticmVhayBlO2Nhc2UgMzpodD15LnN0YXRlTm9kZS5jb250YWluZXJJbmZvLFZ0PSEwO2JyZWFrIGU7Y2FzZSA0Omh0PXkuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8sVnQ9ITA7YnJlYWsgZX15PXkucmV0dXJufWlmKGh0PT09bnVsbCl0aHJvdyBFcnJvcihpKDE2MCkpO0xjKHUsZCxvKSxodD1udWxsLFZ0PSExO3ZhciB3PW8uYWx0ZXJuYXRlO3chPT1udWxsJiYody5yZXR1cm49bnVsbCksby5yZXR1cm49bnVsbH1jYXRjaChNKXtldChvLHQsTSl9fWlmKHQuc3VidHJlZUZsYWdzJjEyODU0KWZvcih0PXQuY2hpbGQ7dCE9PW51bGw7KUFjKHQsZSksdD10LnNpYmxpbmd9ZnVuY3Rpb24gQWMoZSx0KXt2YXIgcj1lLmFsdGVybmF0ZSxsPWUuZmxhZ3M7c3dpdGNoKGUudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE0OmNhc2UgMTU6aWYoR3QodCxlKSxlbihlKSxsJjQpe3RyeXtobCgzLGUsZS5yZXR1cm4pLGJzKDMsZSl9Y2F0Y2gobmUpe2V0KGUsZS5yZXR1cm4sbmUpfXRyeXtobCg1LGUsZS5yZXR1cm4pfWNhdGNoKG5lKXtldChlLGUucmV0dXJuLG5lKX19YnJlYWs7Y2FzZSAxOkd0KHQsZSksZW4oZSksbCY1MTImJnIhPT1udWxsJiZOcihyLHIucmV0dXJuKTticmVhaztjYXNlIDU6aWYoR3QodCxlKSxlbihlKSxsJjUxMiYmciE9PW51bGwmJk5yKHIsci5yZXR1cm4pLGUuZmxhZ3MmMzIpe3ZhciBvPWUuc3RhdGVOb2RlO3RyeXtsdChvLCIiKX1jYXRjaChuZSl7ZXQoZSxlLnJldHVybixuZSl9fWlmKGwmNCYmKG89ZS5zdGF0ZU5vZGUsbyE9bnVsbCkpe3ZhciB1PWUubWVtb2l6ZWRQcm9wcyxkPXIhPT1udWxsP3IubWVtb2l6ZWRQcm9wczp1LHk9ZS50eXBlLHc9ZS51cGRhdGVRdWV1ZTtpZihlLnVwZGF0ZVF1ZXVlPW51bGwsdyE9PW51bGwpdHJ5e3k9PT0iaW5wdXQiJiZ1LnR5cGU9PT0icmFkaW8iJiZ1Lm5hbWUhPW51bGwmJlNlKG8sdSksWnMoeSxkKTt2YXIgTT1acyh5LHUpO2ZvcihkPTA7ZDx3Lmxlbmd0aDtkKz0yKXt2YXIgTD13W2RdLEQ9d1tkKzFdO0w9PT0ic3R5bGUiP2dvKG8sRCk6TD09PSJkYW5nZXJvdXNseVNldElubmVySFRNTCI/YW4obyxEKTpMPT09ImNoaWxkcmVuIj9sdChvLEQpOmFlKG8sTCxELE0pfXN3aXRjaCh5KXtjYXNlImlucHV0IjpZKG8sdSk7YnJlYWs7Y2FzZSJ0ZXh0YXJlYSI6VyhvLHUpO2JyZWFrO2Nhc2Uic2VsZWN0Ijp2YXIgRT1vLl93cmFwcGVyU3RhdGUud2FzTXVsdGlwbGU7by5fd3JhcHBlclN0YXRlLndhc011bHRpcGxlPSEhdS5tdWx0aXBsZTt2YXIgUT11LnZhbHVlO1EhPW51bGw/TyhvLCEhdS5tdWx0aXBsZSxRLCExKTpFIT09ISF1Lm11bHRpcGxlJiYodS5kZWZhdWx0VmFsdWUhPW51bGw/TyhvLCEhdS5tdWx0aXBsZSx1LmRlZmF1bHRWYWx1ZSwhMCk6TyhvLCEhdS5tdWx0aXBsZSx1Lm11bHRpcGxlP1tdOiIiLCExKSl9b1tybF09dX1jYXRjaChuZSl7ZXQoZSxlLnJldHVybixuZSl9fWJyZWFrO2Nhc2UgNjppZihHdCh0LGUpLGVuKGUpLGwmNCl7aWYoZS5zdGF0ZU5vZGU9PT1udWxsKXRocm93IEVycm9yKGkoMTYyKSk7bz1lLnN0YXRlTm9kZSx1PWUubWVtb2l6ZWRQcm9wczt0cnl7by5ub2RlVmFsdWU9dX1jYXRjaChuZSl7ZXQoZSxlLnJldHVybixuZSl9fWJyZWFrO2Nhc2UgMzppZihHdCh0LGUpLGVuKGUpLGwmNCYmciE9PW51bGwmJnIubWVtb2l6ZWRTdGF0ZS5pc0RlaHlkcmF0ZWQpdHJ5e0dyKHQuY29udGFpbmVySW5mbyl9Y2F0Y2gobmUpe2V0KGUsZS5yZXR1cm4sbmUpfWJyZWFrO2Nhc2UgNDpHdCh0LGUpLGVuKGUpO2JyZWFrO2Nhc2UgMTM6R3QodCxlKSxlbihlKSxvPWUuY2hpbGQsby5mbGFncyY4MTkyJiYodT1vLm1lbW9pemVkU3RhdGUhPT1udWxsLG8uc3RhdGVOb2RlLmlzSGlkZGVuPXUsIXV8fG8uYWx0ZXJuYXRlIT09bnVsbCYmby5hbHRlcm5hdGUubWVtb2l6ZWRTdGF0ZSE9PW51bGx8fChiaT10dCgpKSksbCY0JiZfYyhlKTticmVhaztjYXNlIDIyOmlmKEw9ciE9PW51bGwmJnIubWVtb2l6ZWRTdGF0ZSE9PW51bGwsZS5tb2RlJjE/KHh0PShNPXh0KXx8TCxHdCh0LGUpLHh0PU0pOkd0KHQsZSksZW4oZSksbCY4MTkyKXtpZihNPWUubWVtb2l6ZWRTdGF0ZSE9PW51bGwsKGUuc3RhdGVOb2RlLmlzSGlkZGVuPU0pJiYhTCYmKGUubW9kZSYxKSE9PTApZm9yKFo9ZSxMPWUuY2hpbGQ7TCE9PW51bGw7KXtmb3IoRD1aPUw7WiE9PW51bGw7KXtzd2l0Y2goRT1aLFE9RS5jaGlsZCxFLnRhZyl7Y2FzZSAwOmNhc2UgMTE6Y2FzZSAxNDpjYXNlIDE1OmhsKDQsRSxFLnJldHVybik7YnJlYWs7Y2FzZSAxOk5yKEUsRS5yZXR1cm4pO3ZhciBKPUUuc3RhdGVOb2RlO2lmKHR5cGVvZiBKLmNvbXBvbmVudFdpbGxVbm1vdW50PT0iZnVuY3Rpb24iKXtsPUUscj1FLnJldHVybjt0cnl7dD1sLEoucHJvcHM9dC5tZW1vaXplZFByb3BzLEouc3RhdGU9dC5tZW1vaXplZFN0YXRlLEouY29tcG9uZW50V2lsbFVubW91bnQoKX1jYXRjaChuZSl7ZXQobCxyLG5lKX19YnJlYWs7Y2FzZSA1Ok5yKEUsRS5yZXR1cm4pO2JyZWFrO2Nhc2UgMjI6aWYoRS5tZW1vaXplZFN0YXRlIT09bnVsbCl7emMoRCk7Y29udGludWV9fVEhPT1udWxsPyhRLnJldHVybj1FLFo9USk6emMoRCl9TD1MLnNpYmxpbmd9ZTpmb3IoTD1udWxsLEQ9ZTs7KXtpZihELnRhZz09PTUpe2lmKEw9PT1udWxsKXtMPUQ7dHJ5e289RC5zdGF0ZU5vZGUsTT8odT1vLnN0eWxlLHR5cGVvZiB1LnNldFByb3BlcnR5PT0iZnVuY3Rpb24iP3Uuc2V0UHJvcGVydHkoImRpc3BsYXkiLCJub25lIiwiaW1wb3J0YW50Iik6dS5kaXNwbGF5PSJub25lIik6KHk9RC5zdGF0ZU5vZGUsdz1ELm1lbW9pemVkUHJvcHMuc3R5bGUsZD13IT1udWxsJiZ3Lmhhc093blByb3BlcnR5KCJkaXNwbGF5Iik/dy5kaXNwbGF5Om51bGwseS5zdHlsZS5kaXNwbGF5PW1vKCJkaXNwbGF5IixkKSl9Y2F0Y2gobmUpe2V0KGUsZS5yZXR1cm4sbmUpfX19ZWxzZSBpZihELnRhZz09PTYpe2lmKEw9PT1udWxsKXRyeXtELnN0YXRlTm9kZS5ub2RlVmFsdWU9TT8iIjpELm1lbW9pemVkUHJvcHN9Y2F0Y2gobmUpe2V0KGUsZS5yZXR1cm4sbmUpfX1lbHNlIGlmKChELnRhZyE9PTIyJiZELnRhZyE9PTIzfHxELm1lbW9pemVkU3RhdGU9PT1udWxsfHxEPT09ZSkmJkQuY2hpbGQhPT1udWxsKXtELmNoaWxkLnJldHVybj1ELEQ9RC5jaGlsZDtjb250aW51ZX1pZihEPT09ZSlicmVhayBlO2Zvcig7RC5zaWJsaW5nPT09bnVsbDspe2lmKEQucmV0dXJuPT09bnVsbHx8RC5yZXR1cm49PT1lKWJyZWFrIGU7TD09PUQmJihMPW51bGwpLEQ9RC5yZXR1cm59TD09PUQmJihMPW51bGwpLEQuc2libGluZy5yZXR1cm49RC5yZXR1cm4sRD1ELnNpYmxpbmd9fWJyZWFrO2Nhc2UgMTk6R3QodCxlKSxlbihlKSxsJjQmJl9jKGUpO2JyZWFrO2Nhc2UgMjE6YnJlYWs7ZGVmYXVsdDpHdCh0LGUpLGVuKGUpfX1mdW5jdGlvbiBlbihlKXt2YXIgdD1lLmZsYWdzO2lmKHQmMil7dHJ5e2U6e2Zvcih2YXIgcj1lLnJldHVybjtyIT09bnVsbDspe2lmKEVjKHIpKXt2YXIgbD1yO2JyZWFrIGV9cj1yLnJldHVybn10aHJvdyBFcnJvcihpKDE2MCkpfXN3aXRjaChsLnRhZyl7Y2FzZSA1OnZhciBvPWwuc3RhdGVOb2RlO2wuZmxhZ3MmMzImJihsdChvLCIiKSxsLmZsYWdzJj0tMzMpO3ZhciB1PVBjKGUpO2tpKGUsdSxvKTticmVhaztjYXNlIDM6Y2FzZSA0OnZhciBkPWwuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8seT1QYyhlKTt3aShlLHksZCk7YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihpKDE2MSkpfX1jYXRjaCh3KXtldChlLGUucmV0dXJuLHcpfWUuZmxhZ3MmPS0zfXQmNDA5NiYmKGUuZmxhZ3MmPS00MDk3KX1mdW5jdGlvbiBCMChlLHQscil7Wj1lLEljKGUpfWZ1bmN0aW9uIEljKGUsdCxyKXtmb3IodmFyIGw9KGUubW9kZSYxKSE9PTA7WiE9PW51bGw7KXt2YXIgbz1aLHU9by5jaGlsZDtpZihvLnRhZz09PTIyJiZsKXt2YXIgZD1vLm1lbW9pemVkU3RhdGUhPT1udWxsfHxqcztpZighZCl7dmFyIHk9by5hbHRlcm5hdGUsdz15IT09bnVsbCYmeS5tZW1vaXplZFN0YXRlIT09bnVsbHx8eHQ7eT1qczt2YXIgTT14dDtpZihqcz1kLCh4dD13KSYmIU0pZm9yKFo9bztaIT09bnVsbDspZD1aLHc9ZC5jaGlsZCxkLnRhZz09PTIyJiZkLm1lbW9pemVkU3RhdGUhPT1udWxsP09jKG8pOnchPT1udWxsPyh3LnJldHVybj1kLFo9dyk6T2Mobyk7Zm9yKDt1IT09bnVsbDspWj11LEljKHUpLHU9dS5zaWJsaW5nO1o9byxqcz15LHh0PU19RGMoZSl9ZWxzZShvLnN1YnRyZWVGbGFncyY4NzcyKSE9PTAmJnUhPT1udWxsPyh1LnJldHVybj1vLFo9dSk6RGMoZSl9fWZ1bmN0aW9uIERjKGUpe2Zvcig7WiE9PW51bGw7KXt2YXIgdD1aO2lmKCh0LmZsYWdzJjg3NzIpIT09MCl7dmFyIHI9dC5hbHRlcm5hdGU7dHJ5e2lmKCh0LmZsYWdzJjg3NzIpIT09MClzd2l0Y2godC50YWcpe2Nhc2UgMDpjYXNlIDExOmNhc2UgMTU6eHR8fGJzKDUsdCk7YnJlYWs7Y2FzZSAxOnZhciBsPXQuc3RhdGVOb2RlO2lmKHQuZmxhZ3MmNCYmIXh0KWlmKHI9PT1udWxsKWwuY29tcG9uZW50RGlkTW91bnQoKTtlbHNle3ZhciBvPXQuZWxlbWVudFR5cGU9PT10LnR5cGU/ci5tZW1vaXplZFByb3BzOkh0KHQudHlwZSxyLm1lbW9pemVkUHJvcHMpO2wuY29tcG9uZW50RGlkVXBkYXRlKG8sci5tZW1vaXplZFN0YXRlLGwuX19yZWFjdEludGVybmFsU25hcHNob3RCZWZvcmVVcGRhdGUpfXZhciB1PXQudXBkYXRlUXVldWU7dSE9PW51bGwmJnp1KHQsdSxsKTticmVhaztjYXNlIDM6dmFyIGQ9dC51cGRhdGVRdWV1ZTtpZihkIT09bnVsbCl7aWYocj1udWxsLHQuY2hpbGQhPT1udWxsKXN3aXRjaCh0LmNoaWxkLnRhZyl7Y2FzZSA1OnI9dC5jaGlsZC5zdGF0ZU5vZGU7YnJlYWs7Y2FzZSAxOnI9dC5jaGlsZC5zdGF0ZU5vZGV9enUodCxkLHIpfWJyZWFrO2Nhc2UgNTp2YXIgeT10LnN0YXRlTm9kZTtpZihyPT09bnVsbCYmdC5mbGFncyY0KXtyPXk7dmFyIHc9dC5tZW1vaXplZFByb3BzO3N3aXRjaCh0LnR5cGUpe2Nhc2UiYnV0dG9uIjpjYXNlImlucHV0IjpjYXNlInNlbGVjdCI6Y2FzZSJ0ZXh0YXJlYSI6dy5hdXRvRm9jdXMmJnIuZm9jdXMoKTticmVhaztjYXNlImltZyI6dy5zcmMmJihyLnNyYz13LnNyYyl9fWJyZWFrO2Nhc2UgNjpicmVhaztjYXNlIDQ6YnJlYWs7Y2FzZSAxMjpicmVhaztjYXNlIDEzOmlmKHQubWVtb2l6ZWRTdGF0ZT09PW51bGwpe3ZhciBNPXQuYWx0ZXJuYXRlO2lmKE0hPT1udWxsKXt2YXIgTD1NLm1lbW9pemVkU3RhdGU7aWYoTCE9PW51bGwpe3ZhciBEPUwuZGVoeWRyYXRlZDtEIT09bnVsbCYmR3IoRCl9fX1icmVhaztjYXNlIDE5OmNhc2UgMTc6Y2FzZSAyMTpjYXNlIDIyOmNhc2UgMjM6Y2FzZSAyNTpicmVhaztkZWZhdWx0OnRocm93IEVycm9yKGkoMTYzKSl9eHR8fHQuZmxhZ3MmNTEyJiZ4aSh0KX1jYXRjaChFKXtldCh0LHQucmV0dXJuLEUpfX1pZih0PT09ZSl7Wj1udWxsO2JyZWFrfWlmKHI9dC5zaWJsaW5nLHIhPT1udWxsKXtyLnJldHVybj10LnJldHVybixaPXI7YnJlYWt9Wj10LnJldHVybn19ZnVuY3Rpb24gemMoZSl7Zm9yKDtaIT09bnVsbDspe3ZhciB0PVo7aWYodD09PWUpe1o9bnVsbDticmVha312YXIgcj10LnNpYmxpbmc7aWYociE9PW51bGwpe3IucmV0dXJuPXQucmV0dXJuLFo9cjticmVha31aPXQucmV0dXJufX1mdW5jdGlvbiBPYyhlKXtmb3IoO1ohPT1udWxsOyl7dmFyIHQ9Wjt0cnl7c3dpdGNoKHQudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OnZhciByPXQucmV0dXJuO3RyeXticyg0LHQpfWNhdGNoKHcpe2V0KHQscix3KX1icmVhaztjYXNlIDE6dmFyIGw9dC5zdGF0ZU5vZGU7aWYodHlwZW9mIGwuY29tcG9uZW50RGlkTW91bnQ9PSJmdW5jdGlvbiIpe3ZhciBvPXQucmV0dXJuO3RyeXtsLmNvbXBvbmVudERpZE1vdW50KCl9Y2F0Y2godyl7ZXQodCxvLHcpfX12YXIgdT10LnJldHVybjt0cnl7eGkodCl9Y2F0Y2godyl7ZXQodCx1LHcpfWJyZWFrO2Nhc2UgNTp2YXIgZD10LnJldHVybjt0cnl7eGkodCl9Y2F0Y2godyl7ZXQodCxkLHcpfX19Y2F0Y2godyl7ZXQodCx0LnJldHVybix3KX1pZih0PT09ZSl7Wj1udWxsO2JyZWFrfXZhciB5PXQuc2libGluZztpZih5IT09bnVsbCl7eS5yZXR1cm49dC5yZXR1cm4sWj15O2JyZWFrfVo9dC5yZXR1cm59fXZhciAkMD1NYXRoLmNlaWwsTnM9aGUuUmVhY3RDdXJyZW50RGlzcGF0Y2hlcixTaT1oZS5SZWFjdEN1cnJlbnRPd25lcixGdD1oZS5SZWFjdEN1cnJlbnRCYXRjaENvbmZpZyxUZT0wLGZ0PW51bGwsc3Q9bnVsbCxtdD0wLEF0PTAsQ3I9Um4oMCksdXQ9MCxtbD1udWxsLFpuPTAsQ3M9MCxqaT0wLGdsPW51bGwsTXQ9bnVsbCxiaT0wLE1yPTEvMCxtbj1udWxsLE1zPSExLE5pPW51bGwsQW49bnVsbCxScz0hMSxJbj1udWxsLFRzPTAsdmw9MCxDaT1udWxsLEVzPS0xLFBzPTA7ZnVuY3Rpb24ga3QoKXtyZXR1cm4oVGUmNikhPT0wP3R0KCk6RXMhPT0tMT9FczpFcz10dCgpfWZ1bmN0aW9uIERuKGUpe3JldHVybihlLm1vZGUmMSk9PT0wPzE6KFRlJjIpIT09MCYmbXQhPT0wP210Ji1tdDpiMC50cmFuc2l0aW9uIT09bnVsbD8oUHM9PT0wJiYoUHM9UG8oKSksUHMpOihlPUJlLGUhPT0wfHwoZT13aW5kb3cuZXZlbnQsZT1lPT09dm9pZCAwPzE2OkJvKGUudHlwZSkpLGUpfWZ1bmN0aW9uIEt0KGUsdCxyLGwpe2lmKDUwPHZsKXRocm93IHZsPTAsQ2k9bnVsbCxFcnJvcihpKDE4NSkpOyRyKGUscixsKSwoKFRlJjIpPT09MHx8ZSE9PWZ0KSYmKGU9PT1mdCYmKChUZSYyKT09PTAmJihDc3w9ciksdXQ9PT00JiZ6bihlLG10KSksUnQoZSxsKSxyPT09MSYmVGU9PT0wJiYodC5tb2RlJjEpPT09MCYmKE1yPXR0KCkrNTAwLHNzJiZFbigpKSl9ZnVuY3Rpb24gUnQoZSx0KXt2YXIgcj1lLmNhbGxiYWNrTm9kZTtiZChlLHQpO3ZhciBsPUJsKGUsZT09PWZ0P210OjApO2lmKGw9PT0wKXIhPT1udWxsJiZSbyhyKSxlLmNhbGxiYWNrTm9kZT1udWxsLGUuY2FsbGJhY2tQcmlvcml0eT0wO2Vsc2UgaWYodD1sJi1sLGUuY2FsbGJhY2tQcmlvcml0eSE9PXQpe2lmKHIhPW51bGwmJlJvKHIpLHQ9PT0xKWUudGFnPT09MD9qMChCYy5iaW5kKG51bGwsZSkpOk51KEJjLmJpbmQobnVsbCxlKSkseDAoZnVuY3Rpb24oKXsoVGUmNik9PT0wJiZFbigpfSkscj1udWxsO2Vsc2V7c3dpdGNoKExvKGwpKXtjYXNlIDE6cj1zYTticmVhaztjYXNlIDQ6cj1UbzticmVhaztjYXNlIDE2OnI9RGw7YnJlYWs7Y2FzZSA1MzY4NzA5MTI6cj1FbzticmVhaztkZWZhdWx0OnI9RGx9cj1xYyhyLEZjLmJpbmQobnVsbCxlKSl9ZS5jYWxsYmFja1ByaW9yaXR5PXQsZS5jYWxsYmFja05vZGU9cn19ZnVuY3Rpb24gRmMoZSx0KXtpZihFcz0tMSxQcz0wLChUZSY2KSE9PTApdGhyb3cgRXJyb3IoaSgzMjcpKTt2YXIgcj1lLmNhbGxiYWNrTm9kZTtpZihScigpJiZlLmNhbGxiYWNrTm9kZSE9PXIpcmV0dXJuIG51bGw7dmFyIGw9QmwoZSxlPT09ZnQ/bXQ6MCk7aWYobD09PTApcmV0dXJuIG51bGw7aWYoKGwmMzApIT09MHx8KGwmZS5leHBpcmVkTGFuZXMpIT09MHx8dCl0PUxzKGUsbCk7ZWxzZXt0PWw7dmFyIG89VGU7VGV8PTI7dmFyIHU9V2MoKTsoZnQhPT1lfHxtdCE9PXQpJiYobW49bnVsbCxNcj10dCgpKzUwMCxlcihlLHQpKTtkbyB0cnl7SDAoKTticmVha31jYXRjaCh5KXskYyhlLHkpfXdoaWxlKCEwKTtIYSgpLE5zLmN1cnJlbnQ9dSxUZT1vLHN0IT09bnVsbD90PTA6KGZ0PW51bGwsbXQ9MCx0PXV0KX1pZih0IT09MCl7aWYodD09PTImJihvPWFhKGUpLG8hPT0wJiYobD1vLHQ9TWkoZSxvKSkpLHQ9PT0xKXRocm93IHI9bWwsZXIoZSwwKSx6bihlLGwpLFJ0KGUsdHQoKSkscjtpZih0PT09Nil6bihlLGwpO2Vsc2V7aWYobz1lLmN1cnJlbnQuYWx0ZXJuYXRlLChsJjMwKT09PTAmJiFXMChvKSYmKHQ9THMoZSxsKSx0PT09MiYmKHU9YWEoZSksdSE9PTAmJihsPXUsdD1NaShlLHUpKSksdD09PTEpKXRocm93IHI9bWwsZXIoZSwwKSx6bihlLGwpLFJ0KGUsdHQoKSkscjtzd2l0Y2goZS5maW5pc2hlZFdvcms9byxlLmZpbmlzaGVkTGFuZXM9bCx0KXtjYXNlIDA6Y2FzZSAxOnRocm93IEVycm9yKGkoMzQ1KSk7Y2FzZSAyOnRyKGUsTXQsbW4pO2JyZWFrO2Nhc2UgMzppZih6bihlLGwpLChsJjEzMDAyMzQyNCk9PT1sJiYodD1iaSs1MDAtdHQoKSwxMDx0KSl7aWYoQmwoZSwwKSE9PTApYnJlYWs7aWYobz1lLnN1c3BlbmRlZExhbmVzLChvJmwpIT09bCl7a3QoKSxlLnBpbmdlZExhbmVzfD1lLnN1c3BlbmRlZExhbmVzJm87YnJlYWt9ZS50aW1lb3V0SGFuZGxlPV9hKHRyLmJpbmQobnVsbCxlLE10LG1uKSx0KTticmVha310cihlLE10LG1uKTticmVhaztjYXNlIDQ6aWYoem4oZSxsKSwobCY0MTk0MjQwKT09PWwpYnJlYWs7Zm9yKHQ9ZS5ldmVudFRpbWVzLG89LTE7MDxsOyl7dmFyIGQ9MzEtJHQobCk7dT0xPDxkLGQ9dFtkXSxkPm8mJihvPWQpLGwmPX51fWlmKGw9byxsPXR0KCktbCxsPSgxMjA+bD8xMjA6NDgwPmw/NDgwOjEwODA+bD8xMDgwOjE5MjA+bD8xOTIwOjNlMz5sPzNlMzo0MzIwPmw/NDMyMDoxOTYwKiQwKGwvMTk2MCkpLWwsMTA8bCl7ZS50aW1lb3V0SGFuZGxlPV9hKHRyLmJpbmQobnVsbCxlLE10LG1uKSxsKTticmVha310cihlLE10LG1uKTticmVhaztjYXNlIDU6dHIoZSxNdCxtbik7YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihpKDMyOSkpfX19cmV0dXJuIFJ0KGUsdHQoKSksZS5jYWxsYmFja05vZGU9PT1yP0ZjLmJpbmQobnVsbCxlKTpudWxsfWZ1bmN0aW9uIE1pKGUsdCl7dmFyIHI9Z2w7cmV0dXJuIGUuY3VycmVudC5tZW1vaXplZFN0YXRlLmlzRGVoeWRyYXRlZCYmKGVyKGUsdCkuZmxhZ3N8PTI1NiksZT1McyhlLHQpLGUhPT0yJiYodD1NdCxNdD1yLHQhPT1udWxsJiZSaSh0KSksZX1mdW5jdGlvbiBSaShlKXtNdD09PW51bGw/TXQ9ZTpNdC5wdXNoLmFwcGx5KE10LGUpfWZ1bmN0aW9uIFcwKGUpe2Zvcih2YXIgdD1lOzspe2lmKHQuZmxhZ3MmMTYzODQpe3ZhciByPXQudXBkYXRlUXVldWU7aWYociE9PW51bGwmJihyPXIuc3RvcmVzLHIhPT1udWxsKSlmb3IodmFyIGw9MDtsPHIubGVuZ3RoO2wrKyl7dmFyIG89cltsXSx1PW8uZ2V0U25hcHNob3Q7bz1vLnZhbHVlO3RyeXtpZighV3QodSgpLG8pKXJldHVybiExfWNhdGNoe3JldHVybiExfX19aWYocj10LmNoaWxkLHQuc3VidHJlZUZsYWdzJjE2Mzg0JiZyIT09bnVsbClyLnJldHVybj10LHQ9cjtlbHNle2lmKHQ9PT1lKWJyZWFrO2Zvcig7dC5zaWJsaW5nPT09bnVsbDspe2lmKHQucmV0dXJuPT09bnVsbHx8dC5yZXR1cm49PT1lKXJldHVybiEwO3Q9dC5yZXR1cm59dC5zaWJsaW5nLnJldHVybj10LnJldHVybix0PXQuc2libGluZ319cmV0dXJuITB9ZnVuY3Rpb24gem4oZSx0KXtmb3IodCY9fmppLHQmPX5DcyxlLnN1c3BlbmRlZExhbmVzfD10LGUucGluZ2VkTGFuZXMmPX50LGU9ZS5leHBpcmF0aW9uVGltZXM7MDx0Oyl7dmFyIHI9MzEtJHQodCksbD0xPDxyO2Vbcl09LTEsdCY9fmx9fWZ1bmN0aW9uIEJjKGUpe2lmKChUZSY2KSE9PTApdGhyb3cgRXJyb3IoaSgzMjcpKTtScigpO3ZhciB0PUJsKGUsMCk7aWYoKHQmMSk9PT0wKXJldHVybiBSdChlLHR0KCkpLG51bGw7dmFyIHI9THMoZSx0KTtpZihlLnRhZyE9PTAmJnI9PT0yKXt2YXIgbD1hYShlKTtsIT09MCYmKHQ9bCxyPU1pKGUsbCkpfWlmKHI9PT0xKXRocm93IHI9bWwsZXIoZSwwKSx6bihlLHQpLFJ0KGUsdHQoKSkscjtpZihyPT09Nil0aHJvdyBFcnJvcihpKDM0NSkpO3JldHVybiBlLmZpbmlzaGVkV29yaz1lLmN1cnJlbnQuYWx0ZXJuYXRlLGUuZmluaXNoZWRMYW5lcz10LHRyKGUsTXQsbW4pLFJ0KGUsdHQoKSksbnVsbH1mdW5jdGlvbiBUaShlLHQpe3ZhciByPVRlO1RlfD0xO3RyeXtyZXR1cm4gZSh0KX1maW5hbGx5e1RlPXIsVGU9PT0wJiYoTXI9dHQoKSs1MDAsc3MmJkVuKCkpfX1mdW5jdGlvbiBKbihlKXtJbiE9PW51bGwmJkluLnRhZz09PTAmJihUZSY2KT09PTAmJlJyKCk7dmFyIHQ9VGU7VGV8PTE7dmFyIHI9RnQudHJhbnNpdGlvbixsPUJlO3RyeXtpZihGdC50cmFuc2l0aW9uPW51bGwsQmU9MSxlKXJldHVybiBlKCl9ZmluYWxseXtCZT1sLEZ0LnRyYW5zaXRpb249cixUZT10LChUZSY2KT09PTAmJkVuKCl9fWZ1bmN0aW9uIEVpKCl7QXQ9Q3IuY3VycmVudCxHZShDcil9ZnVuY3Rpb24gZXIoZSx0KXtlLmZpbmlzaGVkV29yaz1udWxsLGUuZmluaXNoZWRMYW5lcz0wO3ZhciByPWUudGltZW91dEhhbmRsZTtpZihyIT09LTEmJihlLnRpbWVvdXRIYW5kbGU9LTEseTAocikpLHN0IT09bnVsbClmb3Iocj1zdC5yZXR1cm47ciE9PW51bGw7KXt2YXIgbD1yO3N3aXRjaChGYShsKSxsLnRhZyl7Y2FzZSAxOmw9bC50eXBlLmNoaWxkQ29udGV4dFR5cGVzLGwhPW51bGwmJnJzKCk7YnJlYWs7Y2FzZSAzOmpyKCksR2UoYnQpLEdlKGd0KSxaYSgpO2JyZWFrO2Nhc2UgNTpZYShsKTticmVhaztjYXNlIDQ6anIoKTticmVhaztjYXNlIDEzOkdlKFplKTticmVhaztjYXNlIDE5OkdlKFplKTticmVhaztjYXNlIDEwOlZhKGwudHlwZS5fY29udGV4dCk7YnJlYWs7Y2FzZSAyMjpjYXNlIDIzOkVpKCl9cj1yLnJldHVybn1pZihmdD1lLHN0PWU9T24oZS5jdXJyZW50LG51bGwpLG10PUF0PXQsdXQ9MCxtbD1udWxsLGppPUNzPVpuPTAsTXQ9Z2w9bnVsbCxRbiE9PW51bGwpe2Zvcih0PTA7dDxRbi5sZW5ndGg7dCsrKWlmKHI9UW5bdF0sbD1yLmludGVybGVhdmVkLGwhPT1udWxsKXtyLmludGVybGVhdmVkPW51bGw7dmFyIG89bC5uZXh0LHU9ci5wZW5kaW5nO2lmKHUhPT1udWxsKXt2YXIgZD11Lm5leHQ7dS5uZXh0PW8sbC5uZXh0PWR9ci5wZW5kaW5nPWx9UW49bnVsbH1yZXR1cm4gZX1mdW5jdGlvbiAkYyhlLHQpe2Rve3ZhciByPXN0O3RyeXtpZihIYSgpLG1zLmN1cnJlbnQ9eHMsZ3Mpe2Zvcih2YXIgbD1KZS5tZW1vaXplZFN0YXRlO2whPT1udWxsOyl7dmFyIG89bC5xdWV1ZTtvIT09bnVsbCYmKG8ucGVuZGluZz1udWxsKSxsPWwubmV4dH1ncz0hMX1pZihYbj0wLGN0PW90PUplPW51bGwsdWw9ITEsY2w9MCxTaS5jdXJyZW50PW51bGwscj09PW51bGx8fHIucmV0dXJuPT09bnVsbCl7dXQ9MSxtbD10LHN0PW51bGw7YnJlYWt9ZTp7dmFyIHU9ZSxkPXIucmV0dXJuLHk9cix3PXQ7aWYodD1tdCx5LmZsYWdzfD0zMjc2OCx3IT09bnVsbCYmdHlwZW9mIHc9PSJvYmplY3QiJiZ0eXBlb2Ygdy50aGVuPT0iZnVuY3Rpb24iKXt2YXIgTT13LEw9eSxEPUwudGFnO2lmKChMLm1vZGUmMSk9PT0wJiYoRD09PTB8fEQ9PT0xMXx8RD09PTE1KSl7dmFyIEU9TC5hbHRlcm5hdGU7RT8oTC51cGRhdGVRdWV1ZT1FLnVwZGF0ZVF1ZXVlLEwubWVtb2l6ZWRTdGF0ZT1FLm1lbW9pemVkU3RhdGUsTC5sYW5lcz1FLmxhbmVzKTooTC51cGRhdGVRdWV1ZT1udWxsLEwubWVtb2l6ZWRTdGF0ZT1udWxsKX12YXIgUT1kYyhkKTtpZihRIT09bnVsbCl7US5mbGFncyY9LTI1NyxwYyhRLGQseSx1LHQpLFEubW9kZSYxJiZmYyh1LE0sdCksdD1RLHc9TTt2YXIgSj10LnVwZGF0ZVF1ZXVlO2lmKEo9PT1udWxsKXt2YXIgbmU9bmV3IFNldDtuZS5hZGQodyksdC51cGRhdGVRdWV1ZT1uZX1lbHNlIEouYWRkKHcpO2JyZWFrIGV9ZWxzZXtpZigodCYxKT09PTApe2ZjKHUsTSx0KSxQaSgpO2JyZWFrIGV9dz1FcnJvcihpKDQyNikpfX1lbHNlIGlmKHFlJiZ5Lm1vZGUmMSl7dmFyIG50PWRjKGQpO2lmKG50IT09bnVsbCl7KG50LmZsYWdzJjY1NTM2KT09PTAmJihudC5mbGFnc3w9MjU2KSxwYyhudCxkLHksdSx0KSxXYShicih3LHkpKTticmVhayBlfX11PXc9YnIodyx5KSx1dCE9PTQmJih1dD0yKSxnbD09PW51bGw/Z2w9W3VdOmdsLnB1c2godSksdT1kO2Rve3N3aXRjaCh1LnRhZyl7Y2FzZSAzOnUuZmxhZ3N8PTY1NTM2LHQmPS10LHUubGFuZXN8PXQ7dmFyIE49dWModSx3LHQpO0R1KHUsTik7YnJlYWsgZTtjYXNlIDE6eT13O3ZhciBTPXUudHlwZSxDPXUuc3RhdGVOb2RlO2lmKCh1LmZsYWdzJjEyOCk9PT0wJiYodHlwZW9mIFMuZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yPT0iZnVuY3Rpb24ifHxDIT09bnVsbCYmdHlwZW9mIEMuY29tcG9uZW50RGlkQ2F0Y2g9PSJmdW5jdGlvbiImJihBbj09PW51bGx8fCFBbi5oYXMoQykpKSl7dS5mbGFnc3w9NjU1MzYsdCY9LXQsdS5sYW5lc3w9dDt2YXIgej1jYyh1LHksdCk7RHUodSx6KTticmVhayBlfX11PXUucmV0dXJufXdoaWxlKHUhPT1udWxsKX1IYyhyKX1jYXRjaChzZSl7dD1zZSxzdD09PXImJnIhPT1udWxsJiYoc3Q9cj1yLnJldHVybik7Y29udGludWV9YnJlYWt9d2hpbGUoITApfWZ1bmN0aW9uIFdjKCl7dmFyIGU9TnMuY3VycmVudDtyZXR1cm4gTnMuY3VycmVudD14cyxlPT09bnVsbD94czplfWZ1bmN0aW9uIFBpKCl7KHV0PT09MHx8dXQ9PT0zfHx1dD09PTIpJiYodXQ9NCksZnQ9PT1udWxsfHwoWm4mMjY4NDM1NDU1KT09PTAmJihDcyYyNjg0MzU0NTUpPT09MHx8em4oZnQsbXQpfWZ1bmN0aW9uIExzKGUsdCl7dmFyIHI9VGU7VGV8PTI7dmFyIGw9V2MoKTsoZnQhPT1lfHxtdCE9PXQpJiYobW49bnVsbCxlcihlLHQpKTtkbyB0cnl7VTAoKTticmVha31jYXRjaChvKXskYyhlLG8pfXdoaWxlKCEwKTtpZihIYSgpLFRlPXIsTnMuY3VycmVudD1sLHN0IT09bnVsbCl0aHJvdyBFcnJvcihpKDI2MSkpO3JldHVybiBmdD1udWxsLG10PTAsdXR9ZnVuY3Rpb24gVTAoKXtmb3IoO3N0IT09bnVsbDspVWMoc3QpfWZ1bmN0aW9uIEgwKCl7Zm9yKDtzdCE9PW51bGwmJiFtZCgpOylVYyhzdCl9ZnVuY3Rpb24gVWMoZSl7dmFyIHQ9S2MoZS5hbHRlcm5hdGUsZSxBdCk7ZS5tZW1vaXplZFByb3BzPWUucGVuZGluZ1Byb3BzLHQ9PT1udWxsP0hjKGUpOnN0PXQsU2kuY3VycmVudD1udWxsfWZ1bmN0aW9uIEhjKGUpe3ZhciB0PWU7ZG97dmFyIHI9dC5hbHRlcm5hdGU7aWYoZT10LnJldHVybiwodC5mbGFncyYzMjc2OCk9PT0wKXtpZihyPUQwKHIsdCxBdCksciE9PW51bGwpe3N0PXI7cmV0dXJufX1lbHNle2lmKHI9ejAocix0KSxyIT09bnVsbCl7ci5mbGFncyY9MzI3Njcsc3Q9cjtyZXR1cm59aWYoZSE9PW51bGwpZS5mbGFnc3w9MzI3NjgsZS5zdWJ0cmVlRmxhZ3M9MCxlLmRlbGV0aW9ucz1udWxsO2Vsc2V7dXQ9NixzdD1udWxsO3JldHVybn19aWYodD10LnNpYmxpbmcsdCE9PW51bGwpe3N0PXQ7cmV0dXJufXN0PXQ9ZX13aGlsZSh0IT09bnVsbCk7dXQ9PT0wJiYodXQ9NSl9ZnVuY3Rpb24gdHIoZSx0LHIpe3ZhciBsPUJlLG89RnQudHJhbnNpdGlvbjt0cnl7RnQudHJhbnNpdGlvbj1udWxsLEJlPTEsVjAoZSx0LHIsbCl9ZmluYWxseXtGdC50cmFuc2l0aW9uPW8sQmU9bH1yZXR1cm4gbnVsbH1mdW5jdGlvbiBWMChlLHQscixsKXtkbyBScigpO3doaWxlKEluIT09bnVsbCk7aWYoKFRlJjYpIT09MCl0aHJvdyBFcnJvcihpKDMyNykpO3I9ZS5maW5pc2hlZFdvcms7dmFyIG89ZS5maW5pc2hlZExhbmVzO2lmKHI9PT1udWxsKXJldHVybiBudWxsO2lmKGUuZmluaXNoZWRXb3JrPW51bGwsZS5maW5pc2hlZExhbmVzPTAscj09PWUuY3VycmVudCl0aHJvdyBFcnJvcihpKDE3NykpO2UuY2FsbGJhY2tOb2RlPW51bGwsZS5jYWxsYmFja1ByaW9yaXR5PTA7dmFyIHU9ci5sYW5lc3xyLmNoaWxkTGFuZXM7aWYoTmQoZSx1KSxlPT09ZnQmJihzdD1mdD1udWxsLG10PTApLChyLnN1YnRyZWVGbGFncyYyMDY0KT09PTAmJihyLmZsYWdzJjIwNjQpPT09MHx8UnN8fChScz0hMCxxYyhEbCxmdW5jdGlvbigpe3JldHVybiBScigpLG51bGx9KSksdT0oci5mbGFncyYxNTk5MCkhPT0wLChyLnN1YnRyZWVGbGFncyYxNTk5MCkhPT0wfHx1KXt1PUZ0LnRyYW5zaXRpb24sRnQudHJhbnNpdGlvbj1udWxsO3ZhciBkPUJlO0JlPTE7dmFyIHk9VGU7VGV8PTQsU2kuY3VycmVudD1udWxsLEYwKGUsciksQWMocixlKSxmMChQYSksVWw9ISFFYSxQYT1FYT1udWxsLGUuY3VycmVudD1yLEIwKHIpLGdkKCksVGU9eSxCZT1kLEZ0LnRyYW5zaXRpb249dX1lbHNlIGUuY3VycmVudD1yO2lmKFJzJiYoUnM9ITEsSW49ZSxUcz1vKSx1PWUucGVuZGluZ0xhbmVzLHU9PT0wJiYoQW49bnVsbCkseGQoci5zdGF0ZU5vZGUpLFJ0KGUsdHQoKSksdCE9PW51bGwpZm9yKGw9ZS5vblJlY292ZXJhYmxlRXJyb3Iscj0wO3I8dC5sZW5ndGg7cisrKW89dFtyXSxsKG8udmFsdWUse2NvbXBvbmVudFN0YWNrOm8uc3RhY2ssZGlnZXN0Om8uZGlnZXN0fSk7aWYoTXMpdGhyb3cgTXM9ITEsZT1OaSxOaT1udWxsLGU7cmV0dXJuKFRzJjEpIT09MCYmZS50YWchPT0wJiZScigpLHU9ZS5wZW5kaW5nTGFuZXMsKHUmMSkhPT0wP2U9PT1DaT92bCsrOih2bD0wLENpPWUpOnZsPTAsRW4oKSxudWxsfWZ1bmN0aW9uIFJyKCl7aWYoSW4hPT1udWxsKXt2YXIgZT1MbyhUcyksdD1GdC50cmFuc2l0aW9uLHI9QmU7dHJ5e2lmKEZ0LnRyYW5zaXRpb249bnVsbCxCZT0xNj5lPzE2OmUsSW49PT1udWxsKXZhciBsPSExO2Vsc2V7aWYoZT1JbixJbj1udWxsLFRzPTAsKFRlJjYpIT09MCl0aHJvdyBFcnJvcihpKDMzMSkpO3ZhciBvPVRlO2ZvcihUZXw9NCxaPWUuY3VycmVudDtaIT09bnVsbDspe3ZhciB1PVosZD11LmNoaWxkO2lmKChaLmZsYWdzJjE2KSE9PTApe3ZhciB5PXUuZGVsZXRpb25zO2lmKHkhPT1udWxsKXtmb3IodmFyIHc9MDt3PHkubGVuZ3RoO3crKyl7dmFyIE09eVt3XTtmb3IoWj1NO1ohPT1udWxsOyl7dmFyIEw9Wjtzd2l0Y2goTC50YWcpe2Nhc2UgMDpjYXNlIDExOmNhc2UgMTU6aGwoOCxMLHUpfXZhciBEPUwuY2hpbGQ7aWYoRCE9PW51bGwpRC5yZXR1cm49TCxaPUQ7ZWxzZSBmb3IoO1ohPT1udWxsOyl7TD1aO3ZhciBFPUwuc2libGluZyxRPUwucmV0dXJuO2lmKFRjKEwpLEw9PT1NKXtaPW51bGw7YnJlYWt9aWYoRSE9PW51bGwpe0UucmV0dXJuPVEsWj1FO2JyZWFrfVo9UX19fXZhciBKPXUuYWx0ZXJuYXRlO2lmKEohPT1udWxsKXt2YXIgbmU9Si5jaGlsZDtpZihuZSE9PW51bGwpe0ouY2hpbGQ9bnVsbDtkb3t2YXIgbnQ9bmUuc2libGluZztuZS5zaWJsaW5nPW51bGwsbmU9bnR9d2hpbGUobmUhPT1udWxsKX19Wj11fX1pZigodS5zdWJ0cmVlRmxhZ3MmMjA2NCkhPT0wJiZkIT09bnVsbClkLnJldHVybj11LFo9ZDtlbHNlIGU6Zm9yKDtaIT09bnVsbDspe2lmKHU9WiwodS5mbGFncyYyMDQ4KSE9PTApc3dpdGNoKHUudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OmhsKDksdSx1LnJldHVybil9dmFyIE49dS5zaWJsaW5nO2lmKE4hPT1udWxsKXtOLnJldHVybj11LnJldHVybixaPU47YnJlYWsgZX1aPXUucmV0dXJufX12YXIgUz1lLmN1cnJlbnQ7Zm9yKFo9UztaIT09bnVsbDspe2Q9Wjt2YXIgQz1kLmNoaWxkO2lmKChkLnN1YnRyZWVGbGFncyYyMDY0KSE9PTAmJkMhPT1udWxsKUMucmV0dXJuPWQsWj1DO2Vsc2UgZTpmb3IoZD1TO1ohPT1udWxsOyl7aWYoeT1aLCh5LmZsYWdzJjIwNDgpIT09MCl0cnl7c3dpdGNoKHkudGFnKXtjYXNlIDA6Y2FzZSAxMTpjYXNlIDE1OmJzKDkseSl9fWNhdGNoKHNlKXtldCh5LHkucmV0dXJuLHNlKX1pZih5PT09ZCl7Wj1udWxsO2JyZWFrIGV9dmFyIHo9eS5zaWJsaW5nO2lmKHohPT1udWxsKXt6LnJldHVybj15LnJldHVybixaPXo7YnJlYWsgZX1aPXkucmV0dXJufX1pZihUZT1vLEVuKCksWXQmJnR5cGVvZiBZdC5vblBvc3RDb21taXRGaWJlclJvb3Q9PSJmdW5jdGlvbiIpdHJ5e1l0Lm9uUG9zdENvbW1pdEZpYmVyUm9vdCh6bCxlKX1jYXRjaHt9bD0hMH1yZXR1cm4gbH1maW5hbGx5e0JlPXIsRnQudHJhbnNpdGlvbj10fX1yZXR1cm4hMX1mdW5jdGlvbiBWYyhlLHQscil7dD1icihyLHQpLHQ9dWMoZSx0LDEpLGU9TG4oZSx0LDEpLHQ9a3QoKSxlIT09bnVsbCYmKCRyKGUsMSx0KSxSdChlLHQpKX1mdW5jdGlvbiBldChlLHQscil7aWYoZS50YWc9PT0zKVZjKGUsZSxyKTtlbHNlIGZvcig7dCE9PW51bGw7KXtpZih0LnRhZz09PTMpe1ZjKHQsZSxyKTticmVha31lbHNlIGlmKHQudGFnPT09MSl7dmFyIGw9dC5zdGF0ZU5vZGU7aWYodHlwZW9mIHQudHlwZS5nZXREZXJpdmVkU3RhdGVGcm9tRXJyb3I9PSJmdW5jdGlvbiJ8fHR5cGVvZiBsLmNvbXBvbmVudERpZENhdGNoPT0iZnVuY3Rpb24iJiYoQW49PT1udWxsfHwhQW4uaGFzKGwpKSl7ZT1icihyLGUpLGU9Y2ModCxlLDEpLHQ9TG4odCxlLDEpLGU9a3QoKSx0IT09bnVsbCYmKCRyKHQsMSxlKSxSdCh0LGUpKTticmVha319dD10LnJldHVybn19ZnVuY3Rpb24gRzAoZSx0LHIpe3ZhciBsPWUucGluZ0NhY2hlO2whPT1udWxsJiZsLmRlbGV0ZSh0KSx0PWt0KCksZS5waW5nZWRMYW5lc3w9ZS5zdXNwZW5kZWRMYW5lcyZyLGZ0PT09ZSYmKG10JnIpPT09ciYmKHV0PT09NHx8dXQ9PT0zJiYobXQmMTMwMDIzNDI0KT09PW10JiY1MDA+dHQoKS1iaT9lcihlLDApOmppfD1yKSxSdChlLHQpfWZ1bmN0aW9uIEdjKGUsdCl7dD09PTAmJigoZS5tb2RlJjEpPT09MD90PTE6KHQ9RmwsRmw8PD0xLChGbCYxMzAwMjM0MjQpPT09MCYmKEZsPTQxOTQzMDQpKSk7dmFyIHI9a3QoKTtlPWRuKGUsdCksZSE9PW51bGwmJigkcihlLHQsciksUnQoZSxyKSl9ZnVuY3Rpb24gSzAoZSl7dmFyIHQ9ZS5tZW1vaXplZFN0YXRlLHI9MDt0IT09bnVsbCYmKHI9dC5yZXRyeUxhbmUpLEdjKGUscil9ZnVuY3Rpb24gcTAoZSx0KXt2YXIgcj0wO3N3aXRjaChlLnRhZyl7Y2FzZSAxMzp2YXIgbD1lLnN0YXRlTm9kZSxvPWUubWVtb2l6ZWRTdGF0ZTtvIT09bnVsbCYmKHI9by5yZXRyeUxhbmUpO2JyZWFrO2Nhc2UgMTk6bD1lLnN0YXRlTm9kZTticmVhaztkZWZhdWx0OnRocm93IEVycm9yKGkoMzE0KSl9bCE9PW51bGwmJmwuZGVsZXRlKHQpLEdjKGUscil9dmFyIEtjO0tjPWZ1bmN0aW9uKGUsdCxyKXtpZihlIT09bnVsbClpZihlLm1lbW9pemVkUHJvcHMhPT10LnBlbmRpbmdQcm9wc3x8YnQuY3VycmVudClDdD0hMDtlbHNle2lmKChlLmxhbmVzJnIpPT09MCYmKHQuZmxhZ3MmMTI4KT09PTApcmV0dXJuIEN0PSExLEkwKGUsdCxyKTtDdD0oZS5mbGFncyYxMzEwNzIpIT09MH1lbHNlIEN0PSExLHFlJiYodC5mbGFncyYxMDQ4NTc2KSE9PTAmJkN1KHQsaXMsdC5pbmRleCk7c3dpdGNoKHQubGFuZXM9MCx0LnRhZyl7Y2FzZSAyOnZhciBsPXQudHlwZTtTcyhlLHQpLGU9dC5wZW5kaW5nUHJvcHM7dmFyIG89Z3IodCxndC5jdXJyZW50KTtTcih0LHIpLG89dGkobnVsbCx0LGwsZSxvLHIpO3ZhciB1PW5pKCk7cmV0dXJuIHQuZmxhZ3N8PTEsdHlwZW9mIG89PSJvYmplY3QiJiZvIT09bnVsbCYmdHlwZW9mIG8ucmVuZGVyPT0iZnVuY3Rpb24iJiZvLiQkdHlwZW9mPT09dm9pZCAwPyh0LnRhZz0xLHQubWVtb2l6ZWRTdGF0ZT1udWxsLHQudXBkYXRlUXVldWU9bnVsbCxOdChsKT8odT0hMCxscyh0KSk6dT0hMSx0Lm1lbW9pemVkU3RhdGU9by5zdGF0ZSE9PW51bGwmJm8uc3RhdGUhPT12b2lkIDA/by5zdGF0ZTpudWxsLHFhKHQpLG8udXBkYXRlcj13cyx0LnN0YXRlTm9kZT1vLG8uX3JlYWN0SW50ZXJuYWxzPXQsb2kodCxsLGUsciksdD1kaShudWxsLHQsbCwhMCx1LHIpKToodC50YWc9MCxxZSYmdSYmT2EodCksd3QobnVsbCx0LG8sciksdD10LmNoaWxkKSx0O2Nhc2UgMTY6bD10LmVsZW1lbnRUeXBlO2U6e3N3aXRjaChTcyhlLHQpLGU9dC5wZW5kaW5nUHJvcHMsbz1sLl9pbml0LGw9byhsLl9wYXlsb2FkKSx0LnR5cGU9bCxvPXQudGFnPVkwKGwpLGU9SHQobCxlKSxvKXtjYXNlIDA6dD1maShudWxsLHQsbCxlLHIpO2JyZWFrIGU7Y2FzZSAxOnQ9eGMobnVsbCx0LGwsZSxyKTticmVhayBlO2Nhc2UgMTE6dD1oYyhudWxsLHQsbCxlLHIpO2JyZWFrIGU7Y2FzZSAxNDp0PW1jKG51bGwsdCxsLEh0KGwudHlwZSxlKSxyKTticmVhayBlfXRocm93IEVycm9yKGkoMzA2LGwsIiIpKX1yZXR1cm4gdDtjYXNlIDA6cmV0dXJuIGw9dC50eXBlLG89dC5wZW5kaW5nUHJvcHMsbz10LmVsZW1lbnRUeXBlPT09bD9vOkh0KGwsbyksZmkoZSx0LGwsbyxyKTtjYXNlIDE6cmV0dXJuIGw9dC50eXBlLG89dC5wZW5kaW5nUHJvcHMsbz10LmVsZW1lbnRUeXBlPT09bD9vOkh0KGwsbykseGMoZSx0LGwsbyxyKTtjYXNlIDM6ZTp7aWYod2ModCksZT09PW51bGwpdGhyb3cgRXJyb3IoaSgzODcpKTtsPXQucGVuZGluZ1Byb3BzLHU9dC5tZW1vaXplZFN0YXRlLG89dS5lbGVtZW50LEl1KGUsdCkscHModCxsLG51bGwscik7dmFyIGQ9dC5tZW1vaXplZFN0YXRlO2lmKGw9ZC5lbGVtZW50LHUuaXNEZWh5ZHJhdGVkKWlmKHU9e2VsZW1lbnQ6bCxpc0RlaHlkcmF0ZWQ6ITEsY2FjaGU6ZC5jYWNoZSxwZW5kaW5nU3VzcGVuc2VCb3VuZGFyaWVzOmQucGVuZGluZ1N1c3BlbnNlQm91bmRhcmllcyx0cmFuc2l0aW9uczpkLnRyYW5zaXRpb25zfSx0LnVwZGF0ZVF1ZXVlLmJhc2VTdGF0ZT11LHQubWVtb2l6ZWRTdGF0ZT11LHQuZmxhZ3MmMjU2KXtvPWJyKEVycm9yKGkoNDIzKSksdCksdD1rYyhlLHQsbCxyLG8pO2JyZWFrIGV9ZWxzZSBpZihsIT09byl7bz1icihFcnJvcihpKDQyNCkpLHQpLHQ9a2MoZSx0LGwscixvKTticmVhayBlfWVsc2UgZm9yKF90PU1uKHQuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8uZmlyc3RDaGlsZCksTHQ9dCxxZT0hMCxVdD1udWxsLHI9X3UodCxudWxsLGwsciksdC5jaGlsZD1yO3I7KXIuZmxhZ3M9ci5mbGFncyYtM3w0MDk2LHI9ci5zaWJsaW5nO2Vsc2V7aWYoeHIoKSxsPT09byl7dD1obihlLHQscik7YnJlYWsgZX13dChlLHQsbCxyKX10PXQuY2hpbGR9cmV0dXJuIHQ7Y2FzZSA1OnJldHVybiBPdSh0KSxlPT09bnVsbCYmJGEodCksbD10LnR5cGUsbz10LnBlbmRpbmdQcm9wcyx1PWUhPT1udWxsP2UubWVtb2l6ZWRQcm9wczpudWxsLGQ9by5jaGlsZHJlbixMYShsLG8pP2Q9bnVsbDp1IT09bnVsbCYmTGEobCx1KSYmKHQuZmxhZ3N8PTMyKSx5YyhlLHQpLHd0KGUsdCxkLHIpLHQuY2hpbGQ7Y2FzZSA2OnJldHVybiBlPT09bnVsbCYmJGEodCksbnVsbDtjYXNlIDEzOnJldHVybiBTYyhlLHQscik7Y2FzZSA0OnJldHVybiBRYSh0LHQuc3RhdGVOb2RlLmNvbnRhaW5lckluZm8pLGw9dC5wZW5kaW5nUHJvcHMsZT09PW51bGw/dC5jaGlsZD13cih0LG51bGwsbCxyKTp3dChlLHQsbCxyKSx0LmNoaWxkO2Nhc2UgMTE6cmV0dXJuIGw9dC50eXBlLG89dC5wZW5kaW5nUHJvcHMsbz10LmVsZW1lbnRUeXBlPT09bD9vOkh0KGwsbyksaGMoZSx0LGwsbyxyKTtjYXNlIDc6cmV0dXJuIHd0KGUsdCx0LnBlbmRpbmdQcm9wcyxyKSx0LmNoaWxkO2Nhc2UgODpyZXR1cm4gd3QoZSx0LHQucGVuZGluZ1Byb3BzLmNoaWxkcmVuLHIpLHQuY2hpbGQ7Y2FzZSAxMjpyZXR1cm4gd3QoZSx0LHQucGVuZGluZ1Byb3BzLmNoaWxkcmVuLHIpLHQuY2hpbGQ7Y2FzZSAxMDplOntpZihsPXQudHlwZS5fY29udGV4dCxvPXQucGVuZGluZ1Byb3BzLHU9dC5tZW1vaXplZFByb3BzLGQ9by52YWx1ZSxVZShjcyxsLl9jdXJyZW50VmFsdWUpLGwuX2N1cnJlbnRWYWx1ZT1kLHUhPT1udWxsKWlmKFd0KHUudmFsdWUsZCkpe2lmKHUuY2hpbGRyZW49PT1vLmNoaWxkcmVuJiYhYnQuY3VycmVudCl7dD1obihlLHQscik7YnJlYWsgZX19ZWxzZSBmb3IodT10LmNoaWxkLHUhPT1udWxsJiYodS5yZXR1cm49dCk7dSE9PW51bGw7KXt2YXIgeT11LmRlcGVuZGVuY2llcztpZih5IT09bnVsbCl7ZD11LmNoaWxkO2Zvcih2YXIgdz15LmZpcnN0Q29udGV4dDt3IT09bnVsbDspe2lmKHcuY29udGV4dD09PWwpe2lmKHUudGFnPT09MSl7dz1wbigtMSxyJi1yKSx3LnRhZz0yO3ZhciBNPXUudXBkYXRlUXVldWU7aWYoTSE9PW51bGwpe009TS5zaGFyZWQ7dmFyIEw9TS5wZW5kaW5nO0w9PT1udWxsP3cubmV4dD13Oih3Lm5leHQ9TC5uZXh0LEwubmV4dD13KSxNLnBlbmRpbmc9d319dS5sYW5lc3w9cix3PXUuYWx0ZXJuYXRlLHchPT1udWxsJiYody5sYW5lc3w9ciksR2EodS5yZXR1cm4scix0KSx5LmxhbmVzfD1yO2JyZWFrfXc9dy5uZXh0fX1lbHNlIGlmKHUudGFnPT09MTApZD11LnR5cGU9PT10LnR5cGU/bnVsbDp1LmNoaWxkO2Vsc2UgaWYodS50YWc9PT0xOCl7aWYoZD11LnJldHVybixkPT09bnVsbCl0aHJvdyBFcnJvcihpKDM0MSkpO2QubGFuZXN8PXIseT1kLmFsdGVybmF0ZSx5IT09bnVsbCYmKHkubGFuZXN8PXIpLEdhKGQscix0KSxkPXUuc2libGluZ31lbHNlIGQ9dS5jaGlsZDtpZihkIT09bnVsbClkLnJldHVybj11O2Vsc2UgZm9yKGQ9dTtkIT09bnVsbDspe2lmKGQ9PT10KXtkPW51bGw7YnJlYWt9aWYodT1kLnNpYmxpbmcsdSE9PW51bGwpe3UucmV0dXJuPWQucmV0dXJuLGQ9dTticmVha31kPWQucmV0dXJufXU9ZH13dChlLHQsby5jaGlsZHJlbixyKSx0PXQuY2hpbGR9cmV0dXJuIHQ7Y2FzZSA5OnJldHVybiBvPXQudHlwZSxsPXQucGVuZGluZ1Byb3BzLmNoaWxkcmVuLFNyKHQsciksbz16dChvKSxsPWwobyksdC5mbGFnc3w9MSx3dChlLHQsbCxyKSx0LmNoaWxkO2Nhc2UgMTQ6cmV0dXJuIGw9dC50eXBlLG89SHQobCx0LnBlbmRpbmdQcm9wcyksbz1IdChsLnR5cGUsbyksbWMoZSx0LGwsbyxyKTtjYXNlIDE1OnJldHVybiBnYyhlLHQsdC50eXBlLHQucGVuZGluZ1Byb3BzLHIpO2Nhc2UgMTc6cmV0dXJuIGw9dC50eXBlLG89dC5wZW5kaW5nUHJvcHMsbz10LmVsZW1lbnRUeXBlPT09bD9vOkh0KGwsbyksU3MoZSx0KSx0LnRhZz0xLE50KGwpPyhlPSEwLGxzKHQpKTplPSExLFNyKHQsciksaWModCxsLG8pLG9pKHQsbCxvLHIpLGRpKG51bGwsdCxsLCEwLGUscik7Y2FzZSAxOTpyZXR1cm4gYmMoZSx0LHIpO2Nhc2UgMjI6cmV0dXJuIHZjKGUsdCxyKX10aHJvdyBFcnJvcihpKDE1Nix0LnRhZykpfTtmdW5jdGlvbiBxYyhlLHQpe3JldHVybiBNbyhlLHQpfWZ1bmN0aW9uIFEwKGUsdCxyLGwpe3RoaXMudGFnPWUsdGhpcy5rZXk9cix0aGlzLnNpYmxpbmc9dGhpcy5jaGlsZD10aGlzLnJldHVybj10aGlzLnN0YXRlTm9kZT10aGlzLnR5cGU9dGhpcy5lbGVtZW50VHlwZT1udWxsLHRoaXMuaW5kZXg9MCx0aGlzLnJlZj1udWxsLHRoaXMucGVuZGluZ1Byb3BzPXQsdGhpcy5kZXBlbmRlbmNpZXM9dGhpcy5tZW1vaXplZFN0YXRlPXRoaXMudXBkYXRlUXVldWU9dGhpcy5tZW1vaXplZFByb3BzPW51bGwsdGhpcy5tb2RlPWwsdGhpcy5zdWJ0cmVlRmxhZ3M9dGhpcy5mbGFncz0wLHRoaXMuZGVsZXRpb25zPW51bGwsdGhpcy5jaGlsZExhbmVzPXRoaXMubGFuZXM9MCx0aGlzLmFsdGVybmF0ZT1udWxsfWZ1bmN0aW9uIEJ0KGUsdCxyLGwpe3JldHVybiBuZXcgUTAoZSx0LHIsbCl9ZnVuY3Rpb24gTGkoZSl7cmV0dXJuIGU9ZS5wcm90b3R5cGUsISghZXx8IWUuaXNSZWFjdENvbXBvbmVudCl9ZnVuY3Rpb24gWTAoZSl7aWYodHlwZW9mIGU9PSJmdW5jdGlvbiIpcmV0dXJuIExpKGUpPzE6MDtpZihlIT1udWxsKXtpZihlPWUuJCR0eXBlb2YsZT09PU9lKXJldHVybiAxMTtpZihlPT09RmUpcmV0dXJuIDE0fXJldHVybiAyfWZ1bmN0aW9uIE9uKGUsdCl7dmFyIHI9ZS5hbHRlcm5hdGU7cmV0dXJuIHI9PT1udWxsPyhyPUJ0KGUudGFnLHQsZS5rZXksZS5tb2RlKSxyLmVsZW1lbnRUeXBlPWUuZWxlbWVudFR5cGUsci50eXBlPWUudHlwZSxyLnN0YXRlTm9kZT1lLnN0YXRlTm9kZSxyLmFsdGVybmF0ZT1lLGUuYWx0ZXJuYXRlPXIpOihyLnBlbmRpbmdQcm9wcz10LHIudHlwZT1lLnR5cGUsci5mbGFncz0wLHIuc3VidHJlZUZsYWdzPTAsci5kZWxldGlvbnM9bnVsbCksci5mbGFncz1lLmZsYWdzJjE0NjgwMDY0LHIuY2hpbGRMYW5lcz1lLmNoaWxkTGFuZXMsci5sYW5lcz1lLmxhbmVzLHIuY2hpbGQ9ZS5jaGlsZCxyLm1lbW9pemVkUHJvcHM9ZS5tZW1vaXplZFByb3BzLHIubWVtb2l6ZWRTdGF0ZT1lLm1lbW9pemVkU3RhdGUsci51cGRhdGVRdWV1ZT1lLnVwZGF0ZVF1ZXVlLHQ9ZS5kZXBlbmRlbmNpZXMsci5kZXBlbmRlbmNpZXM9dD09PW51bGw/bnVsbDp7bGFuZXM6dC5sYW5lcyxmaXJzdENvbnRleHQ6dC5maXJzdENvbnRleHR9LHIuc2libGluZz1lLnNpYmxpbmcsci5pbmRleD1lLmluZGV4LHIucmVmPWUucmVmLHJ9ZnVuY3Rpb24gX3MoZSx0LHIsbCxvLHUpe3ZhciBkPTI7aWYobD1lLHR5cGVvZiBlPT0iZnVuY3Rpb24iKUxpKGUpJiYoZD0xKTtlbHNlIGlmKHR5cGVvZiBlPT0ic3RyaW5nIilkPTU7ZWxzZSBlOnN3aXRjaChlKXtjYXNlIEVlOnJldHVybiBucihyLmNoaWxkcmVuLG8sdSx0KTtjYXNlICRlOmQ9OCxvfD04O2JyZWFrO2Nhc2UgRGU6cmV0dXJuIGU9QnQoMTIscix0LG98MiksZS5lbGVtZW50VHlwZT1EZSxlLmxhbmVzPXUsZTtjYXNlIF9lOnJldHVybiBlPUJ0KDEzLHIsdCxvKSxlLmVsZW1lbnRUeXBlPV9lLGUubGFuZXM9dSxlO2Nhc2UgS2U6cmV0dXJuIGU9QnQoMTkscix0LG8pLGUuZWxlbWVudFR5cGU9S2UsZS5sYW5lcz11LGU7Y2FzZSBpZTpyZXR1cm4gQXMocixvLHUsdCk7ZGVmYXVsdDppZih0eXBlb2YgZT09Im9iamVjdCImJmUhPT1udWxsKXN3aXRjaChlLiQkdHlwZW9mKXtjYXNlIHplOmQ9MTA7YnJlYWsgZTtjYXNlIEhlOmQ9OTticmVhayBlO2Nhc2UgT2U6ZD0xMTticmVhayBlO2Nhc2UgRmU6ZD0xNDticmVhayBlO2Nhc2Ugd2U6ZD0xNixsPW51bGw7YnJlYWsgZX10aHJvdyBFcnJvcihpKDEzMCxlPT1udWxsP2U6dHlwZW9mIGUsIiIpKX1yZXR1cm4gdD1CdChkLHIsdCxvKSx0LmVsZW1lbnRUeXBlPWUsdC50eXBlPWwsdC5sYW5lcz11LHR9ZnVuY3Rpb24gbnIoZSx0LHIsbCl7cmV0dXJuIGU9QnQoNyxlLGwsdCksZS5sYW5lcz1yLGV9ZnVuY3Rpb24gQXMoZSx0LHIsbCl7cmV0dXJuIGU9QnQoMjIsZSxsLHQpLGUuZWxlbWVudFR5cGU9aWUsZS5sYW5lcz1yLGUuc3RhdGVOb2RlPXtpc0hpZGRlbjohMX0sZX1mdW5jdGlvbiBfaShlLHQscil7cmV0dXJuIGU9QnQoNixlLG51bGwsdCksZS5sYW5lcz1yLGV9ZnVuY3Rpb24gQWkoZSx0LHIpe3JldHVybiB0PUJ0KDQsZS5jaGlsZHJlbiE9PW51bGw/ZS5jaGlsZHJlbjpbXSxlLmtleSx0KSx0LmxhbmVzPXIsdC5zdGF0ZU5vZGU9e2NvbnRhaW5lckluZm86ZS5jb250YWluZXJJbmZvLHBlbmRpbmdDaGlsZHJlbjpudWxsLGltcGxlbWVudGF0aW9uOmUuaW1wbGVtZW50YXRpb259LHR9ZnVuY3Rpb24gWDAoZSx0LHIsbCxvKXt0aGlzLnRhZz10LHRoaXMuY29udGFpbmVySW5mbz1lLHRoaXMuZmluaXNoZWRXb3JrPXRoaXMucGluZ0NhY2hlPXRoaXMuY3VycmVudD10aGlzLnBlbmRpbmdDaGlsZHJlbj1udWxsLHRoaXMudGltZW91dEhhbmRsZT0tMSx0aGlzLmNhbGxiYWNrTm9kZT10aGlzLnBlbmRpbmdDb250ZXh0PXRoaXMuY29udGV4dD1udWxsLHRoaXMuY2FsbGJhY2tQcmlvcml0eT0wLHRoaXMuZXZlbnRUaW1lcz1pYSgwKSx0aGlzLmV4cGlyYXRpb25UaW1lcz1pYSgtMSksdGhpcy5lbnRhbmdsZWRMYW5lcz10aGlzLmZpbmlzaGVkTGFuZXM9dGhpcy5tdXRhYmxlUmVhZExhbmVzPXRoaXMuZXhwaXJlZExhbmVzPXRoaXMucGluZ2VkTGFuZXM9dGhpcy5zdXNwZW5kZWRMYW5lcz10aGlzLnBlbmRpbmdMYW5lcz0wLHRoaXMuZW50YW5nbGVtZW50cz1pYSgwKSx0aGlzLmlkZW50aWZpZXJQcmVmaXg9bCx0aGlzLm9uUmVjb3ZlcmFibGVFcnJvcj1vLHRoaXMubXV0YWJsZVNvdXJjZUVhZ2VySHlkcmF0aW9uRGF0YT1udWxsfWZ1bmN0aW9uIElpKGUsdCxyLGwsbyx1LGQseSx3KXtyZXR1cm4gZT1uZXcgWDAoZSx0LHIseSx3KSx0PT09MT8odD0xLHU9PT0hMCYmKHR8PTgpKTp0PTAsdT1CdCgzLG51bGwsbnVsbCx0KSxlLmN1cnJlbnQ9dSx1LnN0YXRlTm9kZT1lLHUubWVtb2l6ZWRTdGF0ZT17ZWxlbWVudDpsLGlzRGVoeWRyYXRlZDpyLGNhY2hlOm51bGwsdHJhbnNpdGlvbnM6bnVsbCxwZW5kaW5nU3VzcGVuc2VCb3VuZGFyaWVzOm51bGx9LHFhKHUpLGV9ZnVuY3Rpb24gWjAoZSx0LHIpe3ZhciBsPTM8YXJndW1lbnRzLmxlbmd0aCYmYXJndW1lbnRzWzNdIT09dm9pZCAwP2FyZ3VtZW50c1szXTpudWxsO3JldHVybnskJHR5cGVvZjpSZSxrZXk6bD09bnVsbD9udWxsOiIiK2wsY2hpbGRyZW46ZSxjb250YWluZXJJbmZvOnQsaW1wbGVtZW50YXRpb246cn19ZnVuY3Rpb24gUWMoZSl7aWYoIWUpcmV0dXJuIFRuO2U9ZS5fcmVhY3RJbnRlcm5hbHM7ZTp7aWYoSG4oZSkhPT1lfHxlLnRhZyE9PTEpdGhyb3cgRXJyb3IoaSgxNzApKTt2YXIgdD1lO2Rve3N3aXRjaCh0LnRhZyl7Y2FzZSAzOnQ9dC5zdGF0ZU5vZGUuY29udGV4dDticmVhayBlO2Nhc2UgMTppZihOdCh0LnR5cGUpKXt0PXQuc3RhdGVOb2RlLl9fcmVhY3RJbnRlcm5hbE1lbW9pemVkTWVyZ2VkQ2hpbGRDb250ZXh0O2JyZWFrIGV9fXQ9dC5yZXR1cm59d2hpbGUodCE9PW51bGwpO3Rocm93IEVycm9yKGkoMTcxKSl9aWYoZS50YWc9PT0xKXt2YXIgcj1lLnR5cGU7aWYoTnQocikpcmV0dXJuIGp1KGUscix0KX1yZXR1cm4gdH1mdW5jdGlvbiBZYyhlLHQscixsLG8sdSxkLHksdyl7cmV0dXJuIGU9SWkocixsLCEwLGUsbyx1LGQseSx3KSxlLmNvbnRleHQ9UWMobnVsbCkscj1lLmN1cnJlbnQsbD1rdCgpLG89RG4ociksdT1wbihsLG8pLHUuY2FsbGJhY2s9dD8/bnVsbCxMbihyLHUsbyksZS5jdXJyZW50LmxhbmVzPW8sJHIoZSxvLGwpLFJ0KGUsbCksZX1mdW5jdGlvbiBJcyhlLHQscixsKXt2YXIgbz10LmN1cnJlbnQsdT1rdCgpLGQ9RG4obyk7cmV0dXJuIHI9UWMociksdC5jb250ZXh0PT09bnVsbD90LmNvbnRleHQ9cjp0LnBlbmRpbmdDb250ZXh0PXIsdD1wbih1LGQpLHQucGF5bG9hZD17ZWxlbWVudDplfSxsPWw9PT12b2lkIDA/bnVsbDpsLGwhPT1udWxsJiYodC5jYWxsYmFjaz1sKSxlPUxuKG8sdCxkKSxlIT09bnVsbCYmKEt0KGUsbyxkLHUpLGRzKGUsbyxkKSksZH1mdW5jdGlvbiBEcyhlKXtpZihlPWUuY3VycmVudCwhZS5jaGlsZClyZXR1cm4gbnVsbDtzd2l0Y2goZS5jaGlsZC50YWcpe2Nhc2UgNTpyZXR1cm4gZS5jaGlsZC5zdGF0ZU5vZGU7ZGVmYXVsdDpyZXR1cm4gZS5jaGlsZC5zdGF0ZU5vZGV9fWZ1bmN0aW9uIFhjKGUsdCl7aWYoZT1lLm1lbW9pemVkU3RhdGUsZSE9PW51bGwmJmUuZGVoeWRyYXRlZCE9PW51bGwpe3ZhciByPWUucmV0cnlMYW5lO2UucmV0cnlMYW5lPXIhPT0wJiZyPHQ/cjp0fX1mdW5jdGlvbiBEaShlLHQpe1hjKGUsdCksKGU9ZS5hbHRlcm5hdGUpJiZYYyhlLHQpfWZ1bmN0aW9uIEowKCl7cmV0dXJuIG51bGx9dmFyIFpjPXR5cGVvZiByZXBvcnRFcnJvcj09ImZ1bmN0aW9uIj9yZXBvcnRFcnJvcjpmdW5jdGlvbihlKXtjb25zb2xlLmVycm9yKGUpfTtmdW5jdGlvbiB6aShlKXt0aGlzLl9pbnRlcm5hbFJvb3Q9ZX16cy5wcm90b3R5cGUucmVuZGVyPXppLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oZSl7dmFyIHQ9dGhpcy5faW50ZXJuYWxSb290O2lmKHQ9PT1udWxsKXRocm93IEVycm9yKGkoNDA5KSk7SXMoZSx0LG51bGwsbnVsbCl9LHpzLnByb3RvdHlwZS51bm1vdW50PXppLnByb3RvdHlwZS51bm1vdW50PWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy5faW50ZXJuYWxSb290O2lmKGUhPT1udWxsKXt0aGlzLl9pbnRlcm5hbFJvb3Q9bnVsbDt2YXIgdD1lLmNvbnRhaW5lckluZm87Sm4oZnVuY3Rpb24oKXtJcyhudWxsLGUsbnVsbCxudWxsKX0pLHRbb25dPW51bGx9fTtmdW5jdGlvbiB6cyhlKXt0aGlzLl9pbnRlcm5hbFJvb3Q9ZX16cy5wcm90b3R5cGUudW5zdGFibGVfc2NoZWR1bGVIeWRyYXRpb249ZnVuY3Rpb24oZSl7aWYoZSl7dmFyIHQ9SW8oKTtlPXtibG9ja2VkT246bnVsbCx0YXJnZXQ6ZSxwcmlvcml0eTp0fTtmb3IodmFyIHI9MDtyPGJuLmxlbmd0aCYmdCE9PTAmJnQ8Ym5bcl0ucHJpb3JpdHk7cisrKTtibi5zcGxpY2UociwwLGUpLHI9PT0wJiZPbyhlKX19O2Z1bmN0aW9uIE9pKGUpe3JldHVybiEoIWV8fGUubm9kZVR5cGUhPT0xJiZlLm5vZGVUeXBlIT09OSYmZS5ub2RlVHlwZSE9PTExKX1mdW5jdGlvbiBPcyhlKXtyZXR1cm4hKCFlfHxlLm5vZGVUeXBlIT09MSYmZS5ub2RlVHlwZSE9PTkmJmUubm9kZVR5cGUhPT0xMSYmKGUubm9kZVR5cGUhPT04fHxlLm5vZGVWYWx1ZSE9PSIgcmVhY3QtbW91bnQtcG9pbnQtdW5zdGFibGUgIikpfWZ1bmN0aW9uIEpjKCl7fWZ1bmN0aW9uIGVwKGUsdCxyLGwsbyl7aWYobyl7aWYodHlwZW9mIGw9PSJmdW5jdGlvbiIpe3ZhciB1PWw7bD1mdW5jdGlvbigpe3ZhciBNPURzKGQpO3UuY2FsbChNKX19dmFyIGQ9WWModCxsLGUsMCxudWxsLCExLCExLCIiLEpjKTtyZXR1cm4gZS5fcmVhY3RSb290Q29udGFpbmVyPWQsZVtvbl09ZC5jdXJyZW50LHRsKGUubm9kZVR5cGU9PT04P2UucGFyZW50Tm9kZTplKSxKbigpLGR9Zm9yKDtvPWUubGFzdENoaWxkOyllLnJlbW92ZUNoaWxkKG8pO2lmKHR5cGVvZiBsPT0iZnVuY3Rpb24iKXt2YXIgeT1sO2w9ZnVuY3Rpb24oKXt2YXIgTT1Ecyh3KTt5LmNhbGwoTSl9fXZhciB3PUlpKGUsMCwhMSxudWxsLG51bGwsITEsITEsIiIsSmMpO3JldHVybiBlLl9yZWFjdFJvb3RDb250YWluZXI9dyxlW29uXT13LmN1cnJlbnQsdGwoZS5ub2RlVHlwZT09PTg/ZS5wYXJlbnROb2RlOmUpLEpuKGZ1bmN0aW9uKCl7SXModCx3LHIsbCl9KSx3fWZ1bmN0aW9uIEZzKGUsdCxyLGwsbyl7dmFyIHU9ci5fcmVhY3RSb290Q29udGFpbmVyO2lmKHUpe3ZhciBkPXU7aWYodHlwZW9mIG89PSJmdW5jdGlvbiIpe3ZhciB5PW87bz1mdW5jdGlvbigpe3ZhciB3PURzKGQpO3kuY2FsbCh3KX19SXModCxkLGUsbyl9ZWxzZSBkPWVwKHIsdCxlLG8sbCk7cmV0dXJuIERzKGQpfV9vPWZ1bmN0aW9uKGUpe3N3aXRjaChlLnRhZyl7Y2FzZSAzOnZhciB0PWUuc3RhdGVOb2RlO2lmKHQuY3VycmVudC5tZW1vaXplZFN0YXRlLmlzRGVoeWRyYXRlZCl7dmFyIHI9QnIodC5wZW5kaW5nTGFuZXMpO3IhPT0wJiYob2EodCxyfDEpLFJ0KHQsdHQoKSksKFRlJjYpPT09MCYmKE1yPXR0KCkrNTAwLEVuKCkpKX1icmVhaztjYXNlIDEzOkpuKGZ1bmN0aW9uKCl7dmFyIGw9ZG4oZSwxKTtpZihsIT09bnVsbCl7dmFyIG89a3QoKTtLdChsLGUsMSxvKX19KSxEaShlLDEpfX0sdWE9ZnVuY3Rpb24oZSl7aWYoZS50YWc9PT0xMyl7dmFyIHQ9ZG4oZSwxMzQyMTc3MjgpO2lmKHQhPT1udWxsKXt2YXIgcj1rdCgpO0t0KHQsZSwxMzQyMTc3Mjgscil9RGkoZSwxMzQyMTc3MjgpfX0sQW89ZnVuY3Rpb24oZSl7aWYoZS50YWc9PT0xMyl7dmFyIHQ9RG4oZSkscj1kbihlLHQpO2lmKHIhPT1udWxsKXt2YXIgbD1rdCgpO0t0KHIsZSx0LGwpfURpKGUsdCl9fSxJbz1mdW5jdGlvbigpe3JldHVybiBCZX0sRG89ZnVuY3Rpb24oZSx0KXt2YXIgcj1CZTt0cnl7cmV0dXJuIEJlPWUsdCgpfWZpbmFsbHl7QmU9cn19LHRhPWZ1bmN0aW9uKGUsdCxyKXtzd2l0Y2godCl7Y2FzZSJpbnB1dCI6aWYoWShlLHIpLHQ9ci5uYW1lLHIudHlwZT09PSJyYWRpbyImJnQhPW51bGwpe2ZvcihyPWU7ci5wYXJlbnROb2RlOylyPXIucGFyZW50Tm9kZTtmb3Iocj1yLnF1ZXJ5U2VsZWN0b3JBbGwoImlucHV0W25hbWU9IitKU09OLnN0cmluZ2lmeSgiIit0KSsnXVt0eXBlPSJyYWRpbyJdJyksdD0wO3Q8ci5sZW5ndGg7dCsrKXt2YXIgbD1yW3RdO2lmKGwhPT1lJiZsLmZvcm09PT1lLmZvcm0pe3ZhciBvPW5zKGwpO2lmKCFvKXRocm93IEVycm9yKGkoOTApKTtIKGwpLFkobCxvKX19fWJyZWFrO2Nhc2UidGV4dGFyZWEiOlcoZSxyKTticmVhaztjYXNlInNlbGVjdCI6dD1yLnZhbHVlLHQhPW51bGwmJk8oZSwhIXIubXVsdGlwbGUsdCwhMSl9fSx3bz1UaSxrbz1Kbjt2YXIgdHA9e3VzaW5nQ2xpZW50RW50cnlQb2ludDohMSxFdmVudHM6W2xsLGhyLG5zLHlvLHhvLFRpXX0seWw9e2ZpbmRGaWJlckJ5SG9zdEluc3RhbmNlOlZuLGJ1bmRsZVR5cGU6MCx2ZXJzaW9uOiIxOC4zLjEiLHJlbmRlcmVyUGFja2FnZU5hbWU6InJlYWN0LWRvbSJ9LG5wPXtidW5kbGVUeXBlOnlsLmJ1bmRsZVR5cGUsdmVyc2lvbjp5bC52ZXJzaW9uLHJlbmRlcmVyUGFja2FnZU5hbWU6eWwucmVuZGVyZXJQYWNrYWdlTmFtZSxyZW5kZXJlckNvbmZpZzp5bC5yZW5kZXJlckNvbmZpZyxvdmVycmlkZUhvb2tTdGF0ZTpudWxsLG92ZXJyaWRlSG9va1N0YXRlRGVsZXRlUGF0aDpudWxsLG92ZXJyaWRlSG9va1N0YXRlUmVuYW1lUGF0aDpudWxsLG92ZXJyaWRlUHJvcHM6bnVsbCxvdmVycmlkZVByb3BzRGVsZXRlUGF0aDpudWxsLG92ZXJyaWRlUHJvcHNSZW5hbWVQYXRoOm51bGwsc2V0RXJyb3JIYW5kbGVyOm51bGwsc2V0U3VzcGVuc2VIYW5kbGVyOm51bGwsc2NoZWR1bGVVcGRhdGU6bnVsbCxjdXJyZW50RGlzcGF0Y2hlclJlZjpoZS5SZWFjdEN1cnJlbnREaXNwYXRjaGVyLGZpbmRIb3N0SW5zdGFuY2VCeUZpYmVyOmZ1bmN0aW9uKGUpe3JldHVybiBlPU5vKGUpLGU9PT1udWxsP251bGw6ZS5zdGF0ZU5vZGV9LGZpbmRGaWJlckJ5SG9zdEluc3RhbmNlOnlsLmZpbmRGaWJlckJ5SG9zdEluc3RhbmNlfHxKMCxmaW5kSG9zdEluc3RhbmNlc0ZvclJlZnJlc2g6bnVsbCxzY2hlZHVsZVJlZnJlc2g6bnVsbCxzY2hlZHVsZVJvb3Q6bnVsbCxzZXRSZWZyZXNoSGFuZGxlcjpudWxsLGdldEN1cnJlbnRGaWJlcjpudWxsLHJlY29uY2lsZXJWZXJzaW9uOiIxOC4zLjEtbmV4dC1mMTMzOGY4MDgwLTIwMjQwNDI2In07aWYodHlwZW9mIF9fUkVBQ1RfREVWVE9PTFNfR0xPQkFMX0hPT0tfXzwidSIpe3ZhciBCcz1fX1JFQUNUX0RFVlRPT0xTX0dMT0JBTF9IT09LX187aWYoIUJzLmlzRGlzYWJsZWQmJkJzLnN1cHBvcnRzRmliZXIpdHJ5e3psPUJzLmluamVjdChucCksWXQ9QnN9Y2F0Y2h7fX1yZXR1cm4gVHQuX19TRUNSRVRfSU5URVJOQUxTX0RPX05PVF9VU0VfT1JfWU9VX1dJTExfQkVfRklSRUQ9dHAsVHQuY3JlYXRlUG9ydGFsPWZ1bmN0aW9uKGUsdCl7dmFyIHI9Mjxhcmd1bWVudHMubGVuZ3RoJiZhcmd1bWVudHNbMl0hPT12b2lkIDA/YXJndW1lbnRzWzJdOm51bGw7aWYoIU9pKHQpKXRocm93IEVycm9yKGkoMjAwKSk7cmV0dXJuIFowKGUsdCxudWxsLHIpfSxUdC5jcmVhdGVSb290PWZ1bmN0aW9uKGUsdCl7aWYoIU9pKGUpKXRocm93IEVycm9yKGkoMjk5KSk7dmFyIHI9ITEsbD0iIixvPVpjO3JldHVybiB0IT1udWxsJiYodC51bnN0YWJsZV9zdHJpY3RNb2RlPT09ITAmJihyPSEwKSx0LmlkZW50aWZpZXJQcmVmaXghPT12b2lkIDAmJihsPXQuaWRlbnRpZmllclByZWZpeCksdC5vblJlY292ZXJhYmxlRXJyb3IhPT12b2lkIDAmJihvPXQub25SZWNvdmVyYWJsZUVycm9yKSksdD1JaShlLDEsITEsbnVsbCxudWxsLHIsITEsbCxvKSxlW29uXT10LmN1cnJlbnQsdGwoZS5ub2RlVHlwZT09PTg/ZS5wYXJlbnROb2RlOmUpLG5ldyB6aSh0KX0sVHQuZmluZERPTU5vZGU9ZnVuY3Rpb24oZSl7aWYoZT09bnVsbClyZXR1cm4gbnVsbDtpZihlLm5vZGVUeXBlPT09MSlyZXR1cm4gZTt2YXIgdD1lLl9yZWFjdEludGVybmFscztpZih0PT09dm9pZCAwKXRocm93IHR5cGVvZiBlLnJlbmRlcj09ImZ1bmN0aW9uIj9FcnJvcihpKDE4OCkpOihlPU9iamVjdC5rZXlzKGUpLmpvaW4oIiwiKSxFcnJvcihpKDI2OCxlKSkpO3JldHVybiBlPU5vKHQpLGU9ZT09PW51bGw/bnVsbDplLnN0YXRlTm9kZSxlfSxUdC5mbHVzaFN5bmM9ZnVuY3Rpb24oZSl7cmV0dXJuIEpuKGUpfSxUdC5oeWRyYXRlPWZ1bmN0aW9uKGUsdCxyKXtpZighT3ModCkpdGhyb3cgRXJyb3IoaSgyMDApKTtyZXR1cm4gRnMobnVsbCxlLHQsITAscil9LFR0Lmh5ZHJhdGVSb290PWZ1bmN0aW9uKGUsdCxyKXtpZighT2koZSkpdGhyb3cgRXJyb3IoaSg0MDUpKTt2YXIgbD1yIT1udWxsJiZyLmh5ZHJhdGVkU291cmNlc3x8bnVsbCxvPSExLHU9IiIsZD1aYztpZihyIT1udWxsJiYoci51bnN0YWJsZV9zdHJpY3RNb2RlPT09ITAmJihvPSEwKSxyLmlkZW50aWZpZXJQcmVmaXghPT12b2lkIDAmJih1PXIuaWRlbnRpZmllclByZWZpeCksci5vblJlY292ZXJhYmxlRXJyb3IhPT12b2lkIDAmJihkPXIub25SZWNvdmVyYWJsZUVycm9yKSksdD1ZYyh0LG51bGwsZSwxLHI/P251bGwsbywhMSx1LGQpLGVbb25dPXQuY3VycmVudCx0bChlKSxsKWZvcihlPTA7ZTxsLmxlbmd0aDtlKyspcj1sW2VdLG89ci5fZ2V0VmVyc2lvbixvPW8oci5fc291cmNlKSx0Lm11dGFibGVTb3VyY2VFYWdlckh5ZHJhdGlvbkRhdGE9PW51bGw/dC5tdXRhYmxlU291cmNlRWFnZXJIeWRyYXRpb25EYXRhPVtyLG9dOnQubXV0YWJsZVNvdXJjZUVhZ2VySHlkcmF0aW9uRGF0YS5wdXNoKHIsbyk7cmV0dXJuIG5ldyB6cyh0KX0sVHQucmVuZGVyPWZ1bmN0aW9uKGUsdCxyKXtpZighT3ModCkpdGhyb3cgRXJyb3IoaSgyMDApKTtyZXR1cm4gRnMobnVsbCxlLHQsITEscil9LFR0LnVubW91bnRDb21wb25lbnRBdE5vZGU9ZnVuY3Rpb24oZSl7aWYoIU9zKGUpKXRocm93IEVycm9yKGkoNDApKTtyZXR1cm4gZS5fcmVhY3RSb290Q29udGFpbmVyPyhKbihmdW5jdGlvbigpe0ZzKG51bGwsbnVsbCxlLCExLGZ1bmN0aW9uKCl7ZS5fcmVhY3RSb290Q29udGFpbmVyPW51bGwsZVtvbl09bnVsbH0pfSksITApOiExfSxUdC51bnN0YWJsZV9iYXRjaGVkVXBkYXRlcz1UaSxUdC51bnN0YWJsZV9yZW5kZXJTdWJ0cmVlSW50b0NvbnRhaW5lcj1mdW5jdGlvbihlLHQscixsKXtpZighT3MocikpdGhyb3cgRXJyb3IoaSgyMDApKTtpZihlPT1udWxsfHxlLl9yZWFjdEludGVybmFscz09PXZvaWQgMCl0aHJvdyBFcnJvcihpKDM4KSk7cmV0dXJuIEZzKGUsdCxyLCExLGwpfSxUdC52ZXJzaW9uPSIxOC4zLjEtbmV4dC1mMTMzOGY4MDgwLTIwMjQwNDI2IixUdH12YXIgb2Y7ZnVuY3Rpb24gZnAoKXtpZihvZilyZXR1cm4gJGkuZXhwb3J0cztvZj0xO2Z1bmN0aW9uIG4oKXtpZighKHR5cGVvZiBfX1JFQUNUX0RFVlRPT0xTX0dMT0JBTF9IT09LX18+InUifHx0eXBlb2YgX19SRUFDVF9ERVZUT09MU19HTE9CQUxfSE9PS19fLmNoZWNrRENFIT0iZnVuY3Rpb24iKSl0cnl7X19SRUFDVF9ERVZUT09MU19HTE9CQUxfSE9PS19fLmNoZWNrRENFKG4pfWNhdGNoKGEpe2NvbnNvbGUuZXJyb3IoYSl9fXJldHVybiBuKCksJGkuZXhwb3J0cz1jcCgpLCRpLmV4cG9ydHN9dmFyIHVmO2Z1bmN0aW9uIGRwKCl7aWYodWYpcmV0dXJuICRzO3VmPTE7dmFyIG49ZnAoKTtyZXR1cm4gJHMuY3JlYXRlUm9vdD1uLmNyZWF0ZVJvb3QsJHMuaHlkcmF0ZVJvb3Q9bi5oeWRyYXRlUm9vdCwkc312YXIgcHA9ZHAoKTtjb25zdCBocD1scChwcCk7dmFyIGo9b28oKTtjb25zdCBObD0yMSxDbD0yMSxtcD01LGdwPTY1MDAsdnA9e2NoaWxsOntsYWJlbDoiQ2hpbGwiLGJhc2U6MTUwLG1pbjo5NixibHVyYjoiQSBsYXp5IGdhcmRlbiBzbmFrZS4iLGRvdHM6MX0sY2xhc3NpYzp7bGFiZWw6IkNsYXNzaWMiLGJhc2U6MTA1LG1pbjo2NixibHVyYjoiVGhlIGFyY2FkZSBzdGFuZGFyZC4iLGRvdHM6Mn0sdHVyYm86e2xhYmVsOiJUdXJibyIsYmFzZTo3MixtaW46NDYsYmx1cmI6IkEgY2FmZmVpbmF0ZWQgdmlwZXIuIixkb3RzOjN9fTtmdW5jdGlvbiBjZihuLGEpe2NvbnN0e2Jhc2U6aSxtaW46Y309dnBbbl07cmV0dXJuIE1hdGgubWF4KGMsTWF0aC5yb3VuZChpKk1hdGgucG93KC45OSxhKSkpfWZ1bmN0aW9uIHlwKG4sYSxpKXtyZXR1cm4gbi5zb21lKGM9PmMueD09PWEmJmMueT09PWkpfWZ1bmN0aW9uIGFvKG4pe2NvbnN0IGE9W107Zm9yKGxldCBpPTA7aTxDbDtpKyspZm9yKGxldCBjPTA7YzxObDtjKyspeXAobixjLGkpfHxhLnB1c2goe3g6Yyx5Oml9KTtyZXR1cm4gYS5sZW5ndGg9PT0wP3t4OjAseTowfTphW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSphLmxlbmd0aCldfWZ1bmN0aW9uIGZmKCl7Y29uc3Qgbj1NYXRoLmZsb29yKENsLzIpLGE9W3t4OjgseTpufSx7eDo3LHk6bn0se3g6Nix5Om59XTtyZXR1cm57c25ha2U6YSxwcmV2OmEubWFwKGk9Pih7Li4uaX0pKSxkaXI6e3g6MSx5OjB9LHF1ZXVlOltdLGZvb2Q6YW8oYSksZ29sZGVuOm51bGwsZWF0ZW46MCxhY2M6MCxsYXN0OjAsbGFzdEVhdEF0Oi05OTk5OSxkZWF0aEF0OjAsc2hha2U6MCxwYXJ0aWNsZXM6W10sZmxvYXRlcnM6W119fWZ1bmN0aW9uIHhwKG4sYSl7Zm9yKDtuLnF1ZXVlLmxlbmd0aDspe2NvbnN0IHg9bi5xdWV1ZS5zaGlmdCgpLGI9eC54PT09bi5kaXIueCYmeC55PT09bi5kaXIueSxUPXgueD09PS1uLmRpci54JiZ4Lnk9PT0tbi5kaXIueTtpZighYiYmIVQpe24uZGlyPXg7YnJlYWt9fWNvbnN0IGk9bi5zbmFrZVswXSxjPWkueCtuLmRpci54LGg9aS55K24uZGlyLnk7aWYoYzwwfHxoPDB8fGM+PU5sfHxoPj1DbClyZXR1cm57ZGllZDohMCxhdGU6ITEsZ29sZDohMX07Y29uc3QgcD1jPT09bi5mb29kLngmJmg9PT1uLmZvb2QueSxtPXA/bi5zbmFrZTpuLnNuYWtlLnNsaWNlKDAsLTEpO2lmKG0uc29tZSh4PT54Lng9PT1jJiZ4Lnk9PT1oKSlyZXR1cm57ZGllZDohMCxhdGU6ITEsZ29sZDohMX07Y29uc3QgZj1uLnNuYWtlLm1hcCh4PT4oey4uLnh9KSk7cCYmZi5wdXNoKHsuLi5mW2YubGVuZ3RoLTFdfSk7Y29uc3QgZz1be3g6Yyx5Omh9LC4uLm1dO24ucHJldj1mLG4uc25ha2U9ZztsZXQgdj0hMTtyZXR1cm4gcCYmKG4uZWF0ZW4rPTEsbi5sYXN0RWF0QXQ9YSxuLmZvb2Q9YW8obi5zbmFrZSksbi5lYXRlbiVtcD09PTAmJiFuLmdvbGRlbiYmKG4uZ29sZGVuPXtjZWxsOmFvKFsuLi5uLnNuYWtlLG4uZm9vZF0pLGV4cGlyZXM6YStncH0pKSxuLmdvbGRlbiYmKGM9PT1uLmdvbGRlbi5jZWxsLngmJmg9PT1uLmdvbGRlbi5jZWxsLnk/KHY9ITAsbi5sYXN0RWF0QXQ9YSxuLmdvbGRlbj1udWxsKTphPj1uLmdvbGRlbi5leHBpcmVzJiYobi5nb2xkZW49bnVsbCkpLHtkaWVkOiExLGF0ZTpwLGdvbGQ6dn19ZnVuY3Rpb24gd3AobixhKXtpZihuLnBhcnRpY2xlcy5sZW5ndGgpe2NvbnN0IGk9TWF0aC5wb3coLjk4NSxhLzE2KTtuLnBhcnRpY2xlcz1uLnBhcnRpY2xlcy5maWx0ZXIoYz0+KGMubGlmZS09YSk+MCk7Zm9yKGNvbnN0IGMgb2Ygbi5wYXJ0aWNsZXMpYy54Kz1jLnZ4KmEsYy55Kz1jLnZ5KmEsYy52eCo9aSxjLnZ5Kj1pfWlmKG4uZmxvYXRlcnMubGVuZ3RoKXtuLmZsb2F0ZXJzPW4uZmxvYXRlcnMuZmlsdGVyKGk9PihpLmxpZmUtPWEpPjApO2Zvcihjb25zdCBpIG9mIG4uZmxvYXRlcnMpaS55LT0uMDAxNiphfX1mdW5jdGlvbiBkZihuLGEsaSxjPTE0KXtmb3IobGV0IGg9MDtoPGM7aCsrKXtjb25zdCBwPU1hdGgucmFuZG9tKCkqTWF0aC5QSSoyLG09LjAwMytNYXRoLnJhbmRvbSgpKi4wMDksZj00MjArTWF0aC5yYW5kb20oKSozODA7bi5wYXJ0aWNsZXMucHVzaCh7eDphLngrLjUseTphLnkrLjUsdng6TWF0aC5jb3MocCkqbSx2eTpNYXRoLnNpbihwKSptLGxpZmU6ZixtYXhMaWZlOmYsc2l6ZTouMDYrTWF0aC5yYW5kb20oKSouMDksY29sb3I6aVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqaS5sZW5ndGgpXX0pfX1jb25zdCBwZj1bMTcyLDI0NiwxMDBdLGhmPVsyMSwxMDIsNjhdO2Z1bmN0aW9uIG1mKG4sYSxpKXtjb25zdCBjPU1hdGgucm91bmQoblswXSsoYVswXS1uWzBdKSppKSxoPU1hdGgucm91bmQoblsxXSsoYVsxXS1uWzFdKSppKSxwPU1hdGgucm91bmQoblsyXSsoYVsyXS1uWzJdKSppKTtyZXR1cm5gcmdiKCR7Y30sJHtofSwke3B9KWB9ZnVuY3Rpb24gZ2YobixhLGksYz17fSl7Y29uc3QgaD1hLmxlbmd0aDtpZihoPDIpcmV0dXJuO2NvbnN0IHA9Yy5hbHBoYT8/MTtuLnNhdmUoKSxuLmdsb2JhbEFscGhhPXAsbi5saW5lQ2FwPSJyb3VuZCIsbi5saW5lSm9pbj0icm91bmQiLG4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oYVtoLTFdLngsYVtoLTFdLnkpO2ZvcihsZXQgJD1oLTI7JD49MDskLS0pbi5saW5lVG8oYVskXS54LGFbJF0ueSk7bi5zdHJva2VTdHlsZT0icmdiYSg0LDIwLDEyLDAuOTUpIixuLmxpbmVXaWR0aD1pKi44LG4uc3Ryb2tlKCk7Zm9yKGxldCAkPWgtMTskPjA7JC0tKXtjb25zdCBnZT0xLSQvKGgtMSk7bi5zdHJva2VTdHlsZT1tZihoZixwZixnZSksbi5saW5lV2lkdGg9aSooLjQyKy4yNipnZSksbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhWyRdLngsYVskXS55KSxuLmxpbmVUbyhhWyQtMV0ueCxhWyQtMV0ueSksbi5zdHJva2UoKX1jb25zdCBtPWFbMF07bGV0IGY9MSxnPTA7Y29uc3Qgdj1tLngtYVsxXS54LHg9bS55LWFbMV0ueSxiPU1hdGguaHlwb3Qodix4KTtiPi4wMDEmJihmPXYvYixnPXgvYik7Y29uc3QgVD0tZyxBPWY7aWYobi5zaGFkb3dDb2xvcj0icmdiYSgxNzIsMjQ2LDEwMCwwLjUpIixuLnNoYWRvd0JsdXI9aSouNTUsbi5maWxsU3R5bGU9bWYoaGYscGYsMSksbi5iZWdpblBhdGgoKSxuLmFyYyhtLngsbS55LGkqLjQyLDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxjLnRvbmd1ZSl7bi5zdHJva2VTdHlsZT0iI2ZmNmI2YiIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMS41LGkqLjA2KTtjb25zdCAkPW0ueCtmKmkqLjQsZ2U9bS55K2cqaSouNCxkZT1tLngrZippKi43OCxhZT1tLnkrZyppKi43ODtuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKCQsZ2UpLG4ubGluZVRvKGRlLGFlKSxuLm1vdmVUbyhkZSxhZSksbi5saW5lVG8oZGUrKGYqLjUrVCouNSkqaSouMTQsYWUrKGcqLjUrQSouNSkqaSouMTQpLG4ubW92ZVRvKGRlLGFlKSxuLmxpbmVUbyhkZSsoZiouNS1UKi41KSppKi4xNCxhZSsoZyouNS1BKi41KSppKi4xNCksbi5zdHJva2UoKX1jb25zdCBlZT1pKi4xNjUscmU9aSouMTtmb3IoY29uc3QgJCBvZlsxLC0xXSl7Y29uc3QgZ2U9bS54K2YqcmUrVCplZSokLGRlPW0ueStnKnJlK0EqZWUqJDtpZihuLmZpbGxTdHlsZT0iI2YyZmZmMCIsbi5iZWdpblBhdGgoKSxuLmFyYyhnZSxkZSxpKi4xMDUsMCxNYXRoLlBJKjIpLG4uZmlsbCgpLGMuZGVhZCl7bi5zdHJva2VTdHlsZT0iIzBkMjgxOCIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMSxpKi4wNDUpO2NvbnN0IGFlPWkqLjA3O24uYmVnaW5QYXRoKCksbi5tb3ZlVG8oZ2UtYWUsZGUtYWUpLG4ubGluZVRvKGdlK2FlLGRlK2FlKSxuLm1vdmVUbyhnZSthZSxkZS1hZSksbi5saW5lVG8oZ2UtYWUsZGUrYWUpLG4uc3Ryb2tlKCl9ZWxzZSBuLmZpbGxTdHlsZT0iIzBkMjgxOCIsbi5iZWdpblBhdGgoKSxuLmFyYyhnZStmKmkqLjAzOCxkZStnKmkqLjAzOCxpKi4wNTUsMCxNYXRoLlBJKjIpLG4uZmlsbCgpfW4ucmVzdG9yZSgpfWZ1bmN0aW9uIFdzKG4sYSxpLGMsaCxwLG0pe2xldCBmPTE7cCYmbSE9PXZvaWQgMCYmbTwxNjAwJiYoZj1NYXRoLnNpbihoLzcwKT4wPzE6LjI4KTtjb25zdCBnPTErLjA4Kk1hdGguc2luKGgvKHA/MjAwOjMwMCkpLHY9YyoocD8uMzQ6LjMpKmc7bi5zYXZlKCksbi5nbG9iYWxBbHBoYT1mLG4uc2hhZG93Q29sb3I9cD8icmdiYSgyNTUsMjAwLDg3LDAuODUpIjoicmdiYSgyNTUsOTMsOTMsMC43KSIsbi5zaGFkb3dCbHVyPWMqLjk7Y29uc3QgeD1uLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGEtdiouMzUsaS12Ki40LHYqLjE1LGEsaSx2KTtpZihwPyh4LmFkZENvbG9yU3RvcCgwLCIjZmZmM2M0IikseC5hZGRDb2xvclN0b3AoLjU1LCIjZmZkMTY2IikseC5hZGRDb2xvclN0b3AoMSwiI2U4OTEyZCIpKTooeC5hZGRDb2xvclN0b3AoMCwiI2ZmYjNhYiIpLHguYWRkQ29sb3JTdG9wKC41LCIjZmY2YjZiIikseC5hZGRDb2xvclN0b3AoMSwiI2M5MmYzZiIpKSxuLmZpbGxTdHlsZT14LG4uYmVnaW5QYXRoKCksbi5hcmMoYSxpLHYsMCxNYXRoLlBJKjIpLG4uZmlsbCgpLG4uc2hhZG93Qmx1cj0wLG4uc3Ryb2tlU3R5bGU9IiM3YTRhMjEiLG4ubGluZVdpZHRoPU1hdGgubWF4KDEuNSxjKi4wNiksbi5saW5lQ2FwPSJyb3VuZCIsbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhLGktdiksbi5saW5lVG8oYSt2Ki4xNSxpLXYtYyouMTQpLG4uc3Ryb2tlKCksbi5maWxsU3R5bGU9cD8iI2ZmZTA4YSI6IiM1OWM5NmEiLG4uYmVnaW5QYXRoKCksbi5lbGxpcHNlKGErdiouNDgsaS12LWMqLjEsYyouMTMsYyouMDYsLS42LDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLmZpbGxTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIixuLmJlZ2luUGF0aCgpLG4uYXJjKGEtdiouMzUsaS12Ki40Mix2Ki4xNiwwLE1hdGguUEkqMiksbi5maWxsKCkscCl7bi5zdHJva2VTdHlsZT0icmdiYSgyNTUsMjI0LDEzOCwwLjg1KSIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMSxjKi4wNDUpO2NvbnN0IGI9aC83MDA7Zm9yKGxldCBUPTA7VDw0O1QrKyl7Y29uc3QgQT1iK1QqTWF0aC5QSS8yO24uYmVnaW5QYXRoKCksbi5tb3ZlVG8oYStNYXRoLmNvcyhBKSp2KjEuNCxpK01hdGguc2luKEEpKnYqMS40KSxuLmxpbmVUbyhhK01hdGguY29zKEEpKnYqMS44LGkrTWF0aC5zaW4oQSkqdioxLjgpLG4uc3Ryb2tlKCl9fW4ucmVzdG9yZSgpfWZ1bmN0aW9uIGtwKG4sYSxpLGMsaCxwLG0pe2lmKGk8MTB8fGM8MTApcmV0dXJuO2NvbnN0IGY9aS9ObDtuLmZpbGxTdHlsZT0iIzBhMWExMSIsbi5maWxsUmVjdCgwLDAsaSxjKSxuLmZpbGxTdHlsZT0icmdiYSgxNzIsMjQ2LDEwMCwwLjAyNSkiO2ZvcihsZXQgdj0wO3Y8Q2w7disrKWZvcihsZXQgeD0wO3g8Tmw7eCsrKXgrdiYxJiZuLmZpbGxSZWN0KHgqZix2KmYsZixmKTtpZihuLnN0cm9rZVN0eWxlPSJyZ2JhKDE3MiwyNDYsMTAwLDAuMDcpIixuLmxpbmVXaWR0aD0yLG4uc3Ryb2tlUmVjdCgxLDEsaS0yLGMtMiksbi5zYXZlKCksYS5zaGFrZT4uMz8obi50cmFuc2xhdGUoKE1hdGgucmFuZG9tKCktLjUpKmEuc2hha2UsKE1hdGgucmFuZG9tKCktLjUpKmEuc2hha2UpLGEuc2hha2UqPS44Nik6YS5zaGFrZT0wLHA9PT0iaWRsZSIpe2NvbnN0IHY9W10sYj1oKi4wNSUoaStmKjEwKS1mKjU7Zm9yKGxldCBUPTA7VDwyNjtUKyspe2NvbnN0IEE9Yi1UKmYqLjcyO3YucHVzaCh7eDpBLHk6YyouNTIrTWF0aC5zaW4oQSouMDIraCouMDAxMSkqYyouMTd9KX1XcyhuLGYqKE5sLTQuNSksZio0LjUsZixoLCExKSxXcyhuLGYqNC41LGYqKENsLTQuNSksZixoLCEwKSxnZihuLHYsZix7YWxwaGE6Ljh9KX1lbHNle2lmKFdzKG4sKGEuZm9vZC54Ky41KSpmLChhLmZvb2QueSsuNSkqZixmLGgsITEpLGEuZ29sZGVuKXtjb25zdCB4PWEuZ29sZGVuLmNlbGw7V3MobiwoeC54Ky41KSpmLCh4LnkrLjUpKmYsZixoLCEwLGEuZ29sZGVuLmV4cGlyZXMtaCl9Y29uc3Qgdj1hLnNuYWtlLm1hcCgoeCxiKT0+e2NvbnN0IFQ9YS5wcmV2W2JdPz94O3JldHVybnt4OihULngrKHgueC1ULngpKm0rLjUpKmYseTooVC55Kyh4LnktVC55KSptKy41KSpmfX0pO2dmKG4sdixmLHtkZWFkOnA9PT0ib3ZlciIsdG9uZ3VlOmgtYS5sYXN0RWF0QXQ8MjYwfSl9aWYoYS5wYXJ0aWNsZXMubGVuZ3RoKXtmb3IoY29uc3QgdiBvZiBhLnBhcnRpY2xlcyl7Y29uc3QgeD1NYXRoLm1heCgwLHYubGlmZS92Lm1heExpZmUpO24uZ2xvYmFsQWxwaGE9eCxuLmZpbGxTdHlsZT12LmNvbG9yLG4uYmVnaW5QYXRoKCksbi5hcmModi54KmYsdi55KmYsTWF0aC5tYXgoLjYsdi5zaXplKmYqeCksMCxNYXRoLlBJKjIpLG4uZmlsbCgpfW4uZ2xvYmFsQWxwaGE9MX1pZihhLmZsb2F0ZXJzLmxlbmd0aCl7bi50ZXh0QWxpZ249ImNlbnRlciIsbi5mb250PWA3MDAgJHtNYXRoLnJvdW5kKGYqLjYyKX1weCAiQ2hha3JhIFBldGNoIiwgc2Fucy1zZXJpZmA7Zm9yKGNvbnN0IHYgb2YgYS5mbG9hdGVycyluLmdsb2JhbEFscGhhPU1hdGgubWF4KDAsTWF0aC5taW4oMSx2LmxpZmUvKHYubWF4TGlmZSouNTUpKSksbi5maWxsU3R5bGU9di5jb2xvcixuLmZpbGxUZXh0KHYudHh0LHYueCpmLHYueSpmKTtuLmdsb2JhbEFscGhhPTF9aWYobi5yZXN0b3JlKCksYS5kZWF0aEF0PjApe2NvbnN0IHY9aC1hLmRlYXRoQXQ7dj49MCYmdjwzNTAmJihuLmZpbGxTdHlsZT1gcmdiYSgyNTUsNzAsNzAsJHsuMjYqKDEtdi8zNTApfSlgLG4uZmlsbFJlY3QoMCwwLGksYykpfWNvbnN0IGc9bi5jcmVhdGVSYWRpYWxHcmFkaWVudChpLzIsYy8yLGkqLjM1LGkvMixjLzIsaSouNzgpO2cuYWRkQ29sb3JTdG9wKDAsInJnYmEoMCwwLDAsMCkiKSxnLmFkZENvbG9yU3RvcCgxLCJyZ2JhKDMsMTAsNiwwLjUpIiksbi5maWxsU3R5bGU9ZyxuLmZpbGxSZWN0KDAsMCxpLGMpfWxldCBhdD1udWxsLHluPW51bGwsWXM9ITE7ZnVuY3Rpb24ganQoKXt0cnl7aWYoIWF0KXtjb25zdCBuPXdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7aWYoIW4pcmV0dXJuO2F0PW5ldyBuLHluPWF0LmNyZWF0ZUdhaW4oKSx5bi5nYWluLnZhbHVlPVlzPzA6LjE2LHluLmNvbm5lY3QoYXQuZGVzdGluYXRpb24pfWF0LnN0YXRlPT09InN1c3BlbmRlZCImJmF0LnJlc3VtZSgpfWNhdGNoe319ZnVuY3Rpb24gc24obil7WXM9bixhdCYmeW4mJnluLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKG4/MDouMTYsYXQuY3VycmVudFRpbWUsLjAxKX1jb25zdCBHZj0iYXJjYWRlLm11dGUudjEiO2Z1bmN0aW9uIFJsKCl7dHJ5e3JldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShHZik9PT0iMSJ9Y2F0Y2h7cmV0dXJuITF9fWZ1bmN0aW9uIFRsKG4pe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShHZixuPyIxIjoiMCIpfWNhdGNoe319ZnVuY3Rpb24gWChuLGEsaSxjLGg9MCxwKXtpZighYXR8fCF5bnx8WXMpcmV0dXJuO2NvbnN0IG09YXQuY3VycmVudFRpbWUraCxmPWF0LmNyZWF0ZU9zY2lsbGF0b3IoKSxnPWF0LmNyZWF0ZUdhaW4oKTtmLnR5cGU9aSxmLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShuLG0pLHAhPT12b2lkIDAmJmYuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUocCxtK2EpLGcuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLG0pLGcuZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZShjLG0rLjAwOCksZy5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMWUtNCxtK2EpLGYuY29ubmVjdChnKSxnLmNvbm5lY3QoeW4pLGYuc3RhcnQobSksZi5zdG9wKG0rYSsuMDMpfWNvbnN0IEFlPXtlYXQoKXtYKDU0MCwuMDgsInNxdWFyZSIsLjUpLFgoODEwLC4xLCJzcXVhcmUiLC4zMiwuMDUpfSxnb2xkKCl7WCg2NjAsLjA4LCJzcXVhcmUiLC40MiksWCg4ODAsLjA4LCJzcXVhcmUiLC40MiwuMDcpLFgoMTMyMCwuMTgsInRyaWFuZ2xlIiwuNSwuMTQpfSxkaWUoKXtYKDMyMCwuNSwic2F3dG9vdGgiLC41LDAsNzApLFgoMTYwLC42LCJzcXVhcmUiLC4yOCwuMDYsNDgpfSxwYXVzZSgpe1goNDQwLC4wNywidHJpYW5nbGUiLC40KSxYKDMzMCwuMSwidHJpYW5nbGUiLC4zMiwuMDcpfSxyZXN1bWUoKXtYKDMzMCwuMDcsInRyaWFuZ2xlIiwuNCksWCg0OTUsLjEsInRyaWFuZ2xlIiwuMzgsLjA3KX0sc3RhcnQoKXtYKDM5MiwuMDksInNxdWFyZSIsLjM4KSxYKDUyMywuMDksInNxdWFyZSIsLjM4LC4wOSksWCg2NTksLjE2LCJzcXVhcmUiLC40MiwuMTgpfSxzaG9vdCgpe1goOTQwLC4wNTUsInNxdWFyZSIsLjE0LDAsNDgwKX0saGl0KCl7WCgyMjAsLjA3LCJzYXd0b290aCIsLjIyKX0sYm9vbSgpe1goMTUwLC4yOCwic2F3dG9vdGgiLC40LDAsNTUpLFgoOTUsLjMyLCJzcXVhcmUiLC4yNiwuMDIsNDApfSxwb3dlcigpe1goNTIwLC4wNywic3F1YXJlIiwuMzIpLFgoNzgwLC4wOCwic3F1YXJlIiwuMzIsLjA2KSxYKDEwNDAsLjEyLCJ0cmlhbmdsZSIsLjM4LC4xMil9LHdhdmUoKXtYKDQ0MCwuMDksInNxdWFyZSIsLjMpLFgoNTU0LC4wOSwic3F1YXJlIiwuMywuMSksWCg2NTksLjE2LCJzcXVhcmUiLC4zMiwuMil9LHBsYXllckhpdCgpe1goNDgwLC4zLCJzYXd0b290aCIsLjQ1LDAsMTEwKSxYKDI0MCwuMzQsInNxdWFyZSIsLjI4LC4wNCw3MCl9LHNoaWVsZERvd24oKXtYKDcyMCwuMTYsInRyaWFuZ2xlIiwuNCwwLDI4MCl9LHBhZGRsZSgpe1goMzAwLC4wNiwic3F1YXJlIiwuMiwwLDM2MCl9LHdhbGwoKXtYKDI0MCwuMDQsInNxdWFyZSIsLjEsMCwyMDApfSxicmljaygpe1goNTAwLC4wNiwic3F1YXJlIiwuMywwLDMwMCl9LGJyaWNrSGFyZCgpe1goMTgwLC4wNSwic2F3dG9vdGgiLC4yLDAsMTIwKX0sY29tYm8obil7WCg1MjArTWF0aC5taW4obiw4KSo2MCwuMDcsInNxdWFyZSIsLjI0KX0sbGV2ZWxDbGVhcigpe1goMzkyLC4wOSwic3F1YXJlIiwuMzIpLFgoNTIzLC4wOSwic3F1YXJlIiwuMzIsLjA5KSxYKDY1OSwuMDksInNxdWFyZSIsLjMyLC4xOCksWCg3ODQsLjIsInNxdWFyZSIsLjM0LC4yNyl9LGxpZmVMb3N0KCl7WCg0MDAsLjMsInNhd3Rvb3RoIiwuNCwwLDkwKSxYKDIwMCwuMzQsInNxdWFyZSIsLjI2LC4wNSw2MCl9LGNhdGNoUG93ZXIoKXtYKDYwMCwuMDcsInNxdWFyZSIsLjMpLFgoOTAwLC4xLCJ0cmlhbmdsZSIsLjM0LC4wNil9fTtsZXQgVXM9bnVsbDtmdW5jdGlvbiBnbihuLGEsaT0wLGM9MCl7aWYoIWF0fHwheW58fFlzKXJldHVybjtpZighVXMpe1VzPWF0LmNyZWF0ZUJ1ZmZlcigxLGF0LnNhbXBsZVJhdGUqLjUsYXQuc2FtcGxlUmF0ZSk7Y29uc3QgZz1Vcy5nZXRDaGFubmVsRGF0YSgwKTtmb3IobGV0IHY9MDt2PGcubGVuZ3RoO3YrKylnW3ZdPU1hdGgucmFuZG9tKCkqMi0xfWNvbnN0IGg9YXQuY3VycmVudFRpbWUraSxwPWF0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO3AuYnVmZmVyPVVzO2NvbnN0IG09YXQuY3JlYXRlR2FpbigpO20uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLGgpLG0uZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZShhLGgrLjAxMiksbS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMWUtNCxoK24pO2xldCBmPXA7aWYoYz4wKXtjb25zdCBnPWF0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO2cudHlwZT0ibG93cGFzcyIsZy5mcmVxdWVuY3kudmFsdWU9YyxwLmNvbm5lY3QoZyksZj1nfWYuY29ubmVjdChtKSxtLmNvbm5lY3QoeW4pLHAuc3RhcnQoaCkscC5zdG9wKGgrbisuMDUpfWNvbnN0IHF0PXtjcmFjaygpe2duKC4xMywuNTUsMCwzNDAwKSxYKDE5MCwuMDksInNxdWFyZSIsLjMsMCwxMjApfSxmb3VsKCl7Z24oLjA5LC4zLDAsMjQwMCksWCgxNTAsLjA3LCJzcXVhcmUiLC4xOCwwLDkwKX0sd2hpZmYoKXtnbiguMTUsLjI2LDAsOTAwKX0sc3RyaWtlKCl7WCgxOTYsLjEyLCJzcXVhcmUiLC4zMiwwLDEzMCksZ24oLjA4LC4yLC4wMSw3MDApfSxiYWxsKCl7WCgzOTIsLjA4LCJ0cmlhbmdsZSIsLjIpfSx3YWxrKCl7WCg1MjMsLjA4LCJzcXVhcmUiLC4yNiksWCg2NTksLjEsInNxdWFyZSIsLjI2LC4wOCl9LG91dCgpe1goMzMwLC4xMiwic2F3dG9vdGgiLC4yNiwwLDE4MCksWCgxNjUsLjE2LCJzcXVhcmUiLC4xNiwuMDgsMTAwKX0sY2hlZXIoKXtnbiguNSwuMiwwLDE1MDApLFgoNjU5LC4wOSwic3F1YXJlIiwuMiwuMDIpLFgoNzg0LC4xMSwic3F1YXJlIiwuMiwuMSl9LGhyKCl7Z24oLjksLjMsMCwxODAwKSxYKDUyMywuMSwic3F1YXJlIiwuMjgsMCksWCg2NTksLjEsInNxdWFyZSIsLjI4LC4xMSksWCg3ODQsLjEsInNxdWFyZSIsLjI4LC4yMiksWCgxMDQ3LC4yOCwic3F1YXJlIiwuMywuMzMpfSxzdHJpa2VvdXQoKXtYKDM5MiwuMSwic3F1YXJlIiwuMjgsMCwzMDApLFgoMjYyLC4xMiwic3F1YXJlIiwuMjgsLjEsMjAwKSxYKDE5NiwuMjIsInNhd3Rvb3RoIiwuMjYsLjIsMTEwKX19LFRyPXtwbGFjZSgpe1goMjQwLC4wNywidHJpYW5nbGUiLC40MiksZ24oLjA1LC4xNiwwLDEzMDApfSxwZXJmZWN0KG4pe2NvbnN0IGE9NTIwKk1hdGgucG93KDEuMDU5LE1hdGgubWluKG4sMTQpKTtYKGEsLjA5LCJzcXVhcmUiLC4yOCksWChhKjEuMjYsLjA5LCJzcXVhcmUiLC4yNCwuMDYpLFgoYSoxLjUsLjE2LCJ0cmlhbmdsZSIsLjMsLjEyKX0sc2xpY2UoKXtYKDcyMCwuMDYsInNhd3Rvb3RoIiwuMiwwLDMyMCksZ24oLjA3LC4yMiwwLDI2MDApfSxndXN0KCl7Z24oLjM0LC4yNCwwLDE1MDApfSxmYWxsKCl7WCg1MjAsLjUsInNhd3Rvb3RoIiwuMzQsMCw5MCksWCgyNjAsLjU2LCJzcXVhcmUiLC4yLC4wNSw2Mil9LHN0YXJ0KCl7WCgzOTIsLjA4LCJzcXVhcmUiLC4zKSxYKDUyMywuMDgsInNxdWFyZSIsLjMsLjA4KSxYKDc4NCwuMTYsInNxdWFyZSIsLjMyLC4xNil9fSxLZj0ic2VycGVudC5iZXN0cy52MSIscWY9InNlcnBlbnQuZGlmZi52MSI7ZnVuY3Rpb24gU3AoKXtjb25zdCBuPXtjaGlsbDowLGNsYXNzaWM6MCx0dXJibzowfTt0cnl7Y29uc3QgYT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShLZik7aWYoIWEpcmV0dXJuIG47Y29uc3QgaT1KU09OLnBhcnNlKGEpO3JldHVybntjaGlsbDpOdW1iZXIoaS5jaGlsbCl8fDAsY2xhc3NpYzpOdW1iZXIoaS5jbGFzc2ljKXx8MCx0dXJibzpOdW1iZXIoaS50dXJibyl8fDB9fWNhdGNoe3JldHVybiBufX1mdW5jdGlvbiBqcCgpe3RyeXtjb25zdCBuPWxvY2FsU3RvcmFnZS5nZXRJdGVtKHFmKTtpZihuPT09ImNoaWxsInx8bj09PSJjbGFzc2ljInx8bj09PSJ0dXJibyIpcmV0dXJuIG59Y2F0Y2h7fXJldHVybiJjbGFzc2ljIn1mdW5jdGlvbiBicCgpe3JldHVybiBSbCgpfWZ1bmN0aW9uIE5wKCl7Y29uc3Qgbj1qLnVzZVJlZihudWxsKSxhPWoudXNlUmVmKG51bGwpLGk9ai51c2VSZWYoZmYoKSksYz1qLnVzZVJlZih7dzowLGg6MH0pLGg9ai51c2VSZWYoMCksW3AsbV09ai51c2VTdGF0ZSgiaWRsZSIpLGY9ai51c2VSZWYoImlkbGUiKSxbZyx2XT1qLnVzZVN0YXRlKDApLHg9ai51c2VSZWYoMCksW2IsVF09ai51c2VTdGF0ZSgzKSxbQSxlZV09ai51c2VTdGF0ZSgwKSxbcmUsJF09ai51c2VTdGF0ZSghMSksW2dlLGRlXT1qLnVzZVN0YXRlKGpwKSxhZT1qLnVzZVJlZihnZSksW2hlLFhlXT1qLnVzZVN0YXRlKFNwKSxSZT1qLnVzZVJlZihoZSksW0VlLCRlXT1qLnVzZVN0YXRlKGJwKSxEZT1qLnVzZVJlZihFZSksemU9ai51c2VDYWxsYmFjayhJPT57Zi5jdXJyZW50PUksbShJKX0sW10pLEhlPWoudXNlQ2FsbGJhY2soKCk9PntoLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGguY3VycmVudCksaC5jdXJyZW50PTApfSxbXSksT2U9ai51c2VDYWxsYmFjayhJPT57SGUoKSx6ZSgicmVhZHkiKSxoLmN1cnJlbnQ9d2luZG93LnNldFRpbWVvdXQoKCk9PntoLmN1cnJlbnQ9MCxmLmN1cnJlbnQ9PT0icmVhZHkiJiZ6ZSgicnVubmluZyIpfSxJKX0sW0hlLHplXSksX2U9ai51c2VDYWxsYmFjaygoKT0+e2kuY3VycmVudD1mZigpLHguY3VycmVudD0wLHYoMCksVCgzKSwkKCExKX0sW10pLEtlPWoudXNlQ2FsbGJhY2soKEksVSx0ZSk9Pnt4LmN1cnJlbnQrPUksdih4LmN1cnJlbnQpLGVlKFY9PlYrMSksaS5jdXJyZW50LmZsb2F0ZXJzLnB1c2goe3g6VS54Ky41LHk6VS55Ky4yLHR4dDpgKyR7SX1gLGxpZmU6NzUwLG1heExpZmU6NzUwLGNvbG9yOnRlfSl9LFtdKSxGZT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgST1pLmN1cnJlbnQ7SS5kZWF0aEF0PXBlcmZvcm1hbmNlLm5vdygpLEkuc2hha2U9MTUsQWUuZGllKCk7Y29uc3QgVT1hZS5jdXJyZW50LHRlPXguY3VycmVudDtpZih0ZT5SZS5jdXJyZW50W1VdKXtjb25zdCB1ZT17Li4uUmUuY3VycmVudCxbVV06dGV9O1JlLmN1cnJlbnQ9dWUsWGUodWUpLCQoITApO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShLZixKU09OLnN0cmluZ2lmeSh1ZSkpfWNhdGNoe319emUoIm92ZXIiKX0sW3plXSksd2U9ai51c2VDYWxsYmFjaygoKT0+e2p0KCksSGUoKSxfZSgpLEFlLnN0YXJ0KCksT2UoNzUwKX0sW0hlLF9lLE9lXSksaWU9ai51c2VDYWxsYmFjaygoKT0+e2YuY3VycmVudD09PSJydW5uaW5nIiYmKEhlKCksQWUucGF1c2UoKSx6ZSgicGF1c2VkIikpfSxbSGUsemVdKSxQPWoudXNlQ2FsbGJhY2soKCk9PntmLmN1cnJlbnQ9PT0icGF1c2VkIiYmKGp0KCksQWUucmVzdW1lKCksT2UoNTAwKSl9LFtPZV0pLEs9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEk9Zi5jdXJyZW50O0k9PT0iaWRsZSJ8fEk9PT0ib3ZlciI/d2UoKTpJPT09InJ1bm5pbmciP2llKCk6ST09PSJwYXVzZWQiJiZQKCl9LFt3ZSxpZSxQXSksXz1qLnVzZUNhbGxiYWNrKEk9Pntjb25zdCBVPWkuY3VycmVudCx0ZT1VLnF1ZXVlLmxlbmd0aD9VLnF1ZXVlW1UucXVldWUubGVuZ3RoLTFdOlUuZGlyLHVlPUkueD09PS10ZS54JiZJLnk9PT0tdGUueSxWPUkueD09PXRlLngmJkkueT09PXRlLnk7dWV8fFZ8fFUucXVldWUubGVuZ3RoPDMmJlUucXVldWUucHVzaChJKX0sW10pLGs9ai51c2VDYWxsYmFjayhJPT57Y29uc3QgVT1mLmN1cnJlbnQ7aWYoVT09PSJpZGxlIil7d2UoKSxfKEkpO3JldHVybn0oVT09PSJydW5uaW5nInx8VT09PSJyZWFkeSIpJiZfKEkpfSxbd2UsX10pLFI9ai51c2VDYWxsYmFjayhJPT57Y29uc3QgVT1mLmN1cnJlbnQ7aWYoIShVPT09InJ1bm5pbmcifHxVPT09InJlYWR5Inx8VT09PSJwYXVzZWQiKSl7YWUuY3VycmVudD1JLGRlKEkpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShxZixJKX1jYXRjaHt9X2UoKX19LFtfZV0pLGxlPWoudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBJPSFEZS5jdXJyZW50O0RlLmN1cnJlbnQ9SSwkZShJKSxzbihJKSxUbChJKX0sW10pO3JldHVybiBqLnVzZUVmZmVjdCgoKT0+e3NuKERlLmN1cnJlbnQpO2xldCBJPTA7Y29uc3QgVT1tZT0+e2NvbnN0IEg9aS5jdXJyZW50LHZlPUgubGFzdCxGPXZlP01hdGgubWluKDYwLG1lLXZlKToxNjtILmxhc3Q9bWUsd3AoSCxGKTtjb25zdCBrZT1mLmN1cnJlbnQ7aWYoa2U9PT0icnVubmluZyIpe0guYWNjKz1GO2NvbnN0IE5lPWNmKGFlLmN1cnJlbnQsSC5lYXRlbik7bGV0IEI9MDtmb3IoO0guYWNjPj1OZSYmQisrPDQ7KXtILmFjYy09TmU7Y29uc3QgTz14cChILG1lKTtpZihPLmF0ZSYmKEtlKDEwLEguc25ha2VbMF0sIiNmZmM4NTciKSxUKEguc25ha2UubGVuZ3RoKSxBZS5lYXQoKSxkZihILEguc25ha2VbMF0sWyIjZmY2YjZiIiwiI2ZmYjNhYiIsIiNmZmUwOGEiXSkpLE8uZ29sZCYmKEtlKDUwLEguc25ha2VbMF0sIiNmZmUwOGEiKSxBZS5nb2xkKCksZGYoSCxILnNuYWtlWzBdLFsiI2ZmZDE2NiIsIiNmZmUwOGEiLCIjZmZmM2M0Il0sMjIpKSxPLmRpZWQpe0ZlKCk7YnJlYWt9fX1jb25zdCBTZT1uLmN1cnJlbnQse3c6WSxoOldlfT1jLmN1cnJlbnQ7aWYoU2UmJlk+MCl7Y29uc3QgTmU9U2UuZ2V0Q29udGV4dCgiMmQiKTtpZihOZSl7Y29uc3QgQj1rZT09PSJydW5uaW5nIj9NYXRoLm1pbigxLEguYWNjL2NmKGFlLmN1cnJlbnQsSC5lYXRlbikpOjE7a3AoTmUsSCxZLFdlLG1lLGtlLEIpfX1JPXJlcXVlc3RBbmltYXRpb25GcmFtZShVKX07ST1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoVSk7Y29uc3QgdGU9YS5jdXJyZW50LHVlPW4uY3VycmVudDtsZXQgVj1udWxsO2lmKHRlJiZ1ZSl7Y29uc3QgbWU9KCk9Pntjb25zdCBIPXRlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLHZlPU1hdGgubWF4KDAsTWF0aC5mbG9vcihNYXRoLm1pbihILndpZHRoLEguaGVpZ2h0KSkpLEY9TWF0aC5taW4oMix3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb3x8MSk7dWUud2lkdGg9TWF0aC5yb3VuZCh2ZSpGKSx1ZS5oZWlnaHQ9TWF0aC5yb3VuZCh2ZSpGKSx1ZS5zdHlsZS53aWR0aD1gJHt2ZX1weGAsdWUuc3R5bGUuaGVpZ2h0PWAke3ZlfXB4YCxjLmN1cnJlbnQ9e3c6dmUsaDp2ZX07Y29uc3Qga2U9dWUuZ2V0Q29udGV4dCgiMmQiKTtrZSYma2Uuc2V0VHJhbnNmb3JtKEYsMCwwLEYsMCwwKX07bWUoKSxWPW5ldyBSZXNpemVPYnNlcnZlcihtZSksVi5vYnNlcnZlKHRlKX1jb25zdCBwZT1tZT0+e2NvbnN0IEg9bWUua2V5LHZlPUgudG9Mb3dlckNhc2UoKSxGPXthcnJvd3VwOnt4OjAseTotMX0sdzp7eDowLHk6LTF9LGFycm93ZG93bjp7eDowLHk6MX0sczp7eDowLHk6MX0sYXJyb3dsZWZ0Ont4Oi0xLHk6MH0sYTp7eDotMSx5OjB9LGFycm93cmlnaHQ6e3g6MSx5OjB9LGQ6e3g6MSx5OjB9fTtpZihGW3ZlXSl7bWUucHJldmVudERlZmF1bHQoKSxrKEZbdmVdKTtyZXR1cm59aWYoSD09PSIgIil7bWUucHJldmVudERlZmF1bHQoKSxLKCk7cmV0dXJufWlmKHZlPT09InIiKXt3ZSgpO3JldHVybn1pZih2ZT09PSJwInx8SD09PSJFc2NhcGUiKXtjb25zdCBrZT1mLmN1cnJlbnQ7a2U9PT0icnVubmluZyI/aWUoKTprZT09PSJwYXVzZWQiJiZQKCk7cmV0dXJufWlmKHZlPT09Im0iKXtsZSgpO3JldHVybn12ZT09PSIxIiYmUigiY2hpbGwiKSx2ZT09PSIyIiYmUigiY2xhc3NpYyIpLHZlPT09IjMiJiZSKCJ0dXJibyIpfTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5ZG93biIscGUpO2NvbnN0IHE9KCk9Pntkb2N1bWVudC5oaWRkZW4mJmYuY3VycmVudD09PSJydW5uaW5nIiYmaWUoKX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLHEpLCgpPT57Y2FuY2VsQW5pbWF0aW9uRnJhbWUoSSksSGUoKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5ZG93biIscGUpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLHEpLFYmJlYuZGlzY29ubmVjdCgpfX0sW0tlLFIsSGUsRmUsayxpZSxLLFAsd2UsbGVdKSx7Y2FudmFzUmVmOm4sd3JhcFJlZjphLHBoYXNlOnAsc2NvcmU6ZyxsZW46Yixwb3BLZXk6QSxpc05ld0Jlc3Q6cmUsZGlmZmljdWx0eTpnZSxiZXN0czpoZSxtdXRlZDpFZSxhY3Rpb25zOntzdGFydDp3ZSxwcmltYXJ5OksscGF1c2VHYW1lOmllLHJlc3VtZUdhbWU6UCxoYW5kbGVEaXI6ayxjaGFuZ2VEaWZmaWN1bHR5OlIsdG9nZ2xlTXV0ZTpsZX19fWZ1bmN0aW9uIFF0KHt0aXRsZTpuLGNoaWxkcmVuOmEsY2xhc3NOYW1lOmk9IiJ9KXtyZXR1cm4gcy5qc3hzKCJzZWN0aW9uIix7Y2xhc3NOYW1lOmByb3VuZGVkLW1kIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHAtMy41ICR7aX1gLGNoaWxkcmVuOltzLmpzeCgiaDIiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtYi0zIHRleHQtWzlweF0gdHJhY2tpbmctWzAuMmVtXSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOm59KSxhXX0pfWZ1bmN0aW9uIFllKHtjaGlsZHJlbjpuLG9uQ2xpY2s6YSxkaXNhYmxlZDppPSExLHZhcmlhbnQ6Yz0iZ2hvc3QiLGNsYXNzTmFtZTpoPSIifSl7cmV0dXJuIHMuanN4KCJidXR0b24iLHt0eXBlOiJidXR0b24iLG9uQ2xpY2s6YSxkaXNhYmxlZDppLGNsYXNzTmFtZTpgYnRuLWFyY2FkZSBweC00IHB5LTIuNSB0ZXh0LVsxMnB4XSAke2M9PT0icHJpbWFyeSI/ImJ0bi1wcmltYXJ5IjoiYnRuLWdob3N0In0gJHtofWAsY2hpbGRyZW46bn0pfWZ1bmN0aW9uIEcoe2NoaWxkcmVuOm59KXtyZXR1cm4gcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImtiZCIsY2hpbGRyZW46bn0pfWZ1bmN0aW9uIFFlKHtjbGFzc05hbWU6bj0iaC00IHctNCJ9KXtyZXR1cm4gcy5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6biwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpzLmpzeCgicGF0aCIse2Q6Ik04IDV2MTRsMTEtN3oifSl9KX1mdW5jdGlvbiB4bih7Y2xhc3NOYW1lOm49ImgtNCB3LTQifSl7cmV0dXJuIHMuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46cy5qc3goInBhdGgiLHtkOiJNNiA1aDR2MTRINnpNMTQgNWg0djE0aC00eiJ9KX0pfWZ1bmN0aW9uIGl0KHtjbGFzc05hbWU6bj0iaC00IHctNCJ9KXtyZXR1cm4gcy5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6biwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpzLmpzeCgicGF0aCIse2Q6Ik0xMiA1VjJMNyA2bDUgNFY3YTUgNSAwIDEgMS01IDVINWE3IDcgMCAxIDAgNy03eiJ9KX0pfWZ1bmN0aW9uIEVsKHtjbGFzc05hbWU6bj0iaC00IHctNCJ9KXtyZXR1cm4gcy5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3MuanN4KCJwYXRoIix7ZDoiTTMgOXY2aDRsNSA1VjRMNyA5SDN6In0pLHMuanN4KCJwYXRoIix7ZDoiTTE2IDguNWE1IDUgMCAwIDEgMCA3TTE4LjUgNmE4LjUgOC41IDAgMCAxIDAgMTIiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMS44IixmaWxsOiJub25lIixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KV19KX1mdW5jdGlvbiBQbCh7Y2xhc3NOYW1lOm49ImgtNCB3LTQifSl7cmV0dXJuIHMuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDI0IDI0IixmaWxsOiJjdXJyZW50Q29sb3IiLGNsYXNzTmFtZTpuLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltzLmpzeCgicGF0aCIse2Q6Ik0zIDl2Nmg0bDUgNVY0TDcgOUgzeiJ9KSxzLmpzeCgicGF0aCIse2Q6Ik0xNiA5bDYgNk0yMiA5bC02IDYiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMiIsZmlsbDoibm9uZSIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9ZnVuY3Rpb24gTGwoe3RpdGxlOm4sb3B0aW9uczphLHZhbHVlOmksb25DaGFuZ2U6YyxkaXNhYmxlZDpoPSExLGNsYXNzTmFtZTpwPSIifSl7cmV0dXJuIHMuanN4cyhRdCx7dGl0bGU6bixjbGFzc05hbWU6cCxjaGlsZHJlbjpbcy5qc3goImRpdiIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiIsY2hpbGRyZW46YS5tYXAobT0+e2NvbnN0IGY9bS5pZD09PWk7cmV0dXJuIHMuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixkaXNhYmxlZDpoLG9uQ2xpY2s6KCk9PmMobS5pZCksImFyaWEtcHJlc3NlZCI6ZixjbGFzc05hbWU6YGJ0bi1hcmNhZGUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIHB4LTMgcHktMiB0ZXh0LWxlZnQgdGV4dC1bMTJweF0gZGlzYWJsZWQ6Y3Vyc29yLW5vdC1hbGxvd2VkIGRpc2FibGVkOm9wYWNpdHktNjAgJHtmPyJib3JkZXItYW1iZXJnbG93LTUwMCBiZy1hbWJlcmdsb3ctNDAwLzE1IHRleHQtYW1iZXJnbG93LTMwMCI6ImJ0bi1naG9zdCJ9YCxjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtY29sIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QiLGNoaWxkcmVuOm0ubGFiZWx9KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1bMTBweF0gZm9udC1tZWRpdW0gbm9ybWFsLWNhc2UgdHJhY2tpbmctbm9ybWFsIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOm0udGFnfSldfSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZ2FwLTEiLGNoaWxkcmVuOlswLDEsMl0ubWFwKGc9PnMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBoLTIgdy0yIHJvdW5kZWQtZnVsbCAke2c8bS5kb3RzP2Y/ImJnLWFtYmVyZ2xvdy00MDAiOiJiZy1tb3NzLTQwMCI6ImJnLXBpdC02MDAifWB9LGcpKX0pXX0sbS5pZCl9KX0pLGgmJnMuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0yIHRleHQtWzEwcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJTcGVlZCBpcyBsb2NrZWQgZHVyaW5nIGEgcnVuLiJ9KV19KX1mdW5jdGlvbiBfbCh7YmVzdHM6bixvcHRpb25zOmEsYWN0aXZlOml9KXtyZXR1cm4gcy5qc3goUXQse3RpdGxlOiJIaWdoIFNjb3JlcyIsY2hpbGRyZW46cy5qc3goInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yIixjaGlsZHJlbjphLm1hcChjPT57Y29uc3QgaD1jLmlkPT09aSxwPW5bYy5pZF0/PzA7cmV0dXJuIHMuanN4cygibGkiLHtjbGFzc05hbWU6YGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiByb3VuZGVkIGJvcmRlciBweC0yLjUgcHktMS41ICR7aD8iYm9yZGVyLWFtYmVyZ2xvdy01MDAvNjAgYmctYW1iZXJnbG93LTQwMC8xMCI6ImJvcmRlci1waXQtNjAwIGJnLXBpdC04MDAifWAsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSAke2g/InRleHQtYW1iZXJnbG93LTMwMCI6InRleHQtbW9zcy0zMDAifWAsY2hpbGRyZW46Yy5sYWJlbH0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXNtIGZvbnQtYm9sZCB0YWJ1bGFyLW51bXMgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46cH0pXX0sYy5pZCl9KX0pfSl9Y29uc3QgdmY9W3tpZDoiY2hpbGwiLGxhYmVsOiJDaGlsbCIsdGFnOiJTbG93IGdsaWRlIixkb3RzOjF9LHtpZDoiY2xhc3NpYyIsbGFiZWw6IkNsYXNzaWMiLHRhZzoiVGhlIG9yaWdpbmFsIHBhY2UiLGRvdHM6Mn0se2lkOiJ0dXJibyIsbGFiZWw6IlR1cmJvIix0YWc6IkJsaXN0ZXJpbmciLGRvdHM6M31dO2Z1bmN0aW9uIENwKHtjbGFzc05hbWU6bj0iaC0zIHctMyJ9KXtyZXR1cm4gcy5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTpuLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltzLmpzeCgicGF0aCIse2Q6Ik0xMiA3Yy0zLjUtMi03IC41LTcgNSAwIDQgMi41IDggNSA4IDEgMCAxLjQtLjYgMi0uNnMxIC42IDIgLjZjMi41IDAgNS00IDUtOCAwLTQuNS0zLjUtNy03LTVaIixmaWxsOiIjZmY2YjZiIn0pLHMuanN4KCJwYXRoIix7ZDoiTTEyIDdjMC0yIDEtMy41IDMtNCIsc3Ryb2tlOiIjOGVmMDVhIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9ZnVuY3Rpb24gSGkoe2xhYmVsOm4sdmFsdWU6YSxhY2NlbnQ6aT0hMSxwb3A6Yz0wfSl7cmV0dXJuIHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbcy5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46bn0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6YGZvbnQtZGlzcGxheSB0ZXh0LXNtIGxlYWRpbmctdGlnaHQgc206dGV4dC1iYXNlICR7aT8iYW5pbWF0ZS1wb3AgdGV4dC1hbWJlcmdsb3ctNDAwIjoidGV4dC1tb3NzLTEwMCJ9YCxjaGlsZHJlbjphfSxjKV19KX1mdW5jdGlvbiBFcih7a2V5c0xpc3Q6bixhY3Rpb246YX0pe3JldHVybiBzLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46bn0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjphfSldfSl9ZnVuY3Rpb24gTXAoKXtyZXR1cm4gdHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXM/cy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDIwcHhdIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwIHB4LTIgcHktMSIsY2hpbGRyZW46IlN3aXBlIG9uIHRoZSBib2FyZCB0byBzdGVlciJ9KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MCBweC0yIHB5LTEiLGNoaWxkcmVuOiJELXBhZCBiZWxvdyBvbiBzbWFsbCBzY3JlZW5zIn0pXX0pOm51bGx9ZnVuY3Rpb24gSHMoe29uUHJlc3M6bixjaGlsZHJlbjphLGxhYmVsOml9KXtyZXR1cm4gcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsImFyaWEtbGFiZWwiOmksb25Qb2ludGVyRG93bjpjPT57Yy5wcmV2ZW50RGVmYXVsdCgpLG4oKX0sY2xhc3NOYW1lOiJidG4tYXJjYWRlIGJ0bi1naG9zdCBmbGV4IGgtMTQgdy0xNiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46YX0pfWZ1bmN0aW9uIFZzKHtyb3Q6bj0wfSl7cmV0dXJuIHMuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOiJoLTYgdy02IixzdHlsZTp7dHJhbnNmb3JtOmByb3RhdGUoJHtufWRlZylgfSwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpzLmpzeCgicGF0aCIse2Q6Ik0xMiA0bDggOWgtNXY3aC02di03SDR6In0pfSl9ZnVuY3Rpb24gUnAoKXtjb25zdCBuPU5wKCkse2FjdGlvbnM6YSxwaGFzZTppfT1uLGM9aT09PSJydW5uaW5nIjtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3MuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbcy5qc3goSGkse2xhYmVsOiJTY29yZSIsdmFsdWU6bi5zY29yZSxhY2NlbnQ6ITAscG9wOm4ucG9wS2V5fSkscy5qc3goSGkse2xhYmVsOmBCZXN0IMK3ICR7bi5kaWZmaWN1bHR5fWAsdmFsdWU6bi5iZXN0c1tuLmRpZmZpY3VsdHldfSkscy5qc3goSGkse2xhYmVsOiJMZW5ndGgiLHZhbHVlOm4ubGVufSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpjPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmM/YS5wYXVzZUdhbWU6YS5yZXN1bWVHYW1lLGRpc2FibGVkOiFjJiZpIT09InBhdXNlZCIsY2hpbGRyZW46Yz9zLmpzeCh4bix7fSk6cy5qc3goUWUse30pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeChpdCx7fSl9KSxzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6bi5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazphLnRvZ2dsZU11dGUsY2hpbGRyZW46bi5tdXRlZD9zLmpzeChQbCx7fSk6cy5qc3goRWwse30pfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtyZWY6bi53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbcy5qc3goImNhbnZhcyIse3JlZjpuLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIn0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMiB6LTIwIiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbImxlZnQtMCB0b3AtMCBib3JkZXItbC0yIGJvcmRlci10LTIiLCJyaWdodC0wIHRvcC0wIGJvcmRlci1yLTIgYm9yZGVyLXQtMiIsImxlZnQtMCBib3R0b20tMCBib3JkZXItbC0yIGJvcmRlci1iLTIiLCJyaWdodC0wIGJvdHRvbS0wIGJvcmRlci1yLTIgYm9yZGVyLWItMiJdLm1hcChoPT5zLmpzeCgic3BhbiIse2NsYXNzTmFtZTpgYWJzb2x1dGUgaC00IHctNCBib3JkZXItYW1iZXJnbG93LTQwMC81MCAke2h9YH0saCkpfSksaT09PSJpZGxlIiYmcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1waXQtOTUwLzgwIHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIixjaGlsZHJlbjpbcy5qc3goQ3Ase2NsYXNzTmFtZToiaC04IHctOCJ9KSxzLmpzeHMoImRpdiIse2NoaWxkcmVuOltzLmpzeCgiaDEiLHtjbGFzc05hbWU6InJldHJvLXRpdGxlIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IlNFUlBFTlRJTkUifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0yIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiRUFUIMK3IEdST1cgwrcgU1VSVklWRSJ9KV19KV19KSxzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChRZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgSW5zZXJ0IENvaW4iXX0pfSkscy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJQUkVTUyBTUEFDRSBPUiBUQVAgVE8gU1RBUlQifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJoaWRkZW4gaXRlbXMtY2VudGVyIGdhcC0xIHNtOmZsZXgiLGNoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiV0FTRCJ9KSxzLmpzeChHLHtjaGlsZHJlbjoi4oaQ4oaR4oaT4oaSIn0pLCIgc3RlZXIiXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJzbTpoaWRkZW4iLGNoaWxkcmVuOiJTd2lwZSBvciB1c2UgdGhlIEQtcGFkIHRvIHN0ZWVyIn0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXBpdC01MDAiLGNoaWxkcmVuOiLigKIifSkscy5qc3hzKCJzcGFuIix7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJTcGFjZSJ9KSwiIHBhdXNlIl19KV19KSxuLmlzTmV3QmVzdCYmcy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pXX0pLGk9PT0icmVhZHkiJiZzLmpzeHMoImRpdiIse2NsYXNzTmFtZToicG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgYmctcGl0LTk1MC81MCIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZSBhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQteGwgc206dGV4dC0yeGwiLGNoaWxkcmVuOiJSRUFEWT8ifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IkdPT0QgTFVDSyJ9KV19KSxpPT09InBhdXNlZCImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctcGl0LTk1MC84MCBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUgZm9udC1kaXNwbGF5IHRleHQteGwiLGNoaWxkcmVuOiJQQVVTRUQifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3MuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEucmVzdW1lR2FtZSxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxzLmpzeChZZSx7b25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgIixzLmpzeCgic3BhbiIse2NsYXNzTmFtZToibXgtMSIsY2hpbGRyZW46InJlc3VtZXMifSldfSldfSksaT09PSJvdmVyIiYmcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNCBiZy1waXQtOTUwLzg1IHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC14bCB0ZXh0LWFwcGxlLTQwMCBbdGV4dC1zaGFkb3c6MF8wXzI0cHhfcmdiYSgyNTUsMTA3LDEwNywwLjUpXSBzbTp0ZXh0LTJ4bCIsY2hpbGRyZW46IkdBTUUgT1ZFUiJ9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46bi5zY29yZX0pXX0pLHMuanN4cygiZGl2Iix7Y2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpuLmJlc3RzW24uZGlmZmljdWx0eV19KV19KV19KSxuLmlzTmV3QmVzdCYmcy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pLHMuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEuc3RhcnQsY2hpbGRyZW46cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KGl0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEFnYWluIl19KX0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToibXgtYXV0byBtdC00IGdyaWQgdy1tYXggZ3JpZC1jb2xzLTMgZ2FwLTEuNSBtZDpoaWRkZW4iLGNoaWxkcmVuOltzLmpzeCgic3BhbiIse30pLHMuanN4KEhzLHtsYWJlbDoiVXAiLG9uUHJlc3M6KCk9PmEuaGFuZGxlRGlyKHt4OjAseTotMX0pLGNoaWxkcmVuOnMuanN4KFZzLHt9KX0pLHMuanN4KCJzcGFuIix7fSkscy5qc3goSHMse2xhYmVsOiJMZWZ0IixvblByZXNzOigpPT5hLmhhbmRsZURpcih7eDotMSx5OjB9KSxjaGlsZHJlbjpzLmpzeChWcyx7cm90Oi05MH0pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUGxheSIsb25Qb2ludGVyRG93bjpoPT57aC5wcmV2ZW50RGVmYXVsdCgpLGEucHJpbWFyeSgpfSxjbGFzc05hbWU6ImJ0bi1hcmNhZGUgYnRuLXByaW1hcnkgZmxleCBoLTE0IHctMTYgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpjP3MuanN4KHhuLHtjbGFzc05hbWU6ImgtNiB3LTYifSk6cy5qc3goUWUse2NsYXNzTmFtZToiaC02IHctNiJ9KX0pLHMuanN4KEhzLHtsYWJlbDoiUmlnaHQiLG9uUHJlc3M6KCk9PmEuaGFuZGxlRGlyKHt4OjEseTowfSksY2hpbGRyZW46cy5qc3goVnMse3JvdDo5MH0pfSkscy5qc3goInNwYW4iLHt9KSxzLmpzeChIcyx7bGFiZWw6IkRvd24iLG9uUHJlc3M6KCk9PmEuaGFuZGxlRGlyKHt4OjAseToxfSksY2hpbGRyZW46cy5qc3goVnMse3JvdDoxODB9KX0pLHMuanN4KCJzcGFuIix7fSldfSkscy5qc3goTXAse30pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6Im10LTQgZmxleCBqdXN0aWZ5LWNlbnRlciIsY2hpbGRyZW46cy5qc3goWWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6YS5wcmltYXJ5LGNsYXNzTmFtZToibWluLXctWzIyMHB4XSIsY2hpbGRyZW46cy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIixjaGlsZHJlbjppPT09InJ1bm5pbmciP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goeG4se2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBhdXNlIl19KTppPT09InBhdXNlZCI/cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChRZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KTppPT09Im92ZXIiP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goaXQse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBsYXkgQWdhaW4iXX0pOnMuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFN0YXJ0Il19KX0pfSl9KV19KSxzLmpzeHMoImFzaWRlIix7Y2xhc3NOYW1lOiJncmlkIGNvbnRlbnQtc3RhcnQgZ2FwLTQiLGNoaWxkcmVuOltzLmpzeChMbCx7dGl0bGU6IlNwZWVkIixvcHRpb25zOnZmLHZhbHVlOm4uZGlmZmljdWx0eSxvbkNoYW5nZTphLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6aT09PSJydW5uaW5nInx8aT09PSJyZWFkeSJ8fGk9PT0icGF1c2VkIn0pLHMuanN4KF9sLHtiZXN0czpuLmJlc3RzLG9wdGlvbnM6dmYsYWN0aXZlOm4uZGlmZmljdWx0eX0pLHMuanN4cyhRdCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbcy5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbcy5qc3goRXIse2tleXNMaXN0OnMuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IldBU0QifSkscy5qc3goRyx7Y2hpbGRyZW46IuKGkOKGkeKGk+KGkiJ9KV19KSxhY3Rpb246IlN0ZWVyIn0pLHMuanN4KEVyLHtrZXlzTGlzdDpzLmpzeChHLHtjaGlsZHJlbjoiU3BhY2UifSksYWN0aW9uOiJTdGFydCAvIFBhdXNlIn0pLHMuanN4KEVyLHtrZXlzTGlzdDpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJQIn0pLHMuanN4KEcse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxzLmpzeChFcix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHMuanN4KEVyLHtrZXlzTGlzdDpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiIxIn0pLHMuanN4KEcse2NoaWxkcmVuOiIyIn0pLHMuanN4KEcse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiU3BlZWQifSkscy5qc3goRXIse2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJNIn0pLGFjdGlvbjoiU291bmQifSldfSkscy5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiR29sZGVuIGZydWl0ID0gNTAgcHRzLiBDaGFpbiBhcHBsZXMg4oCUIHRoZSBzZXJwZW50IG9ubHkgc3BlZWRzIHVwLiJ9KV19KV19KV19KV19KX1jb25zdCBUcD17Y2FkZXQ6e2xhYmVsOiJDQURFVCIsdGFnOiJyZWxheGVkIHBhdHJvbCIsZG90czoxLHNwYXduTXVsOjEuNDUsc3BlZWRNdWw6Ljc4LGZpcmVNdWw6LjYsYnVsbGV0U3BlZWQ6MTUwfSxwaWxvdDp7bGFiZWw6IlBJTE9UIix0YWc6InN0YW5kYXJkIG9wcyIsZG90czoyLHNwYXduTXVsOjEsc3BlZWRNdWw6MSxmaXJlTXVsOjEsYnVsbGV0U3BlZWQ6MTk1fSxhY2U6e2xhYmVsOiJBQ0UiLHRhZzoibm8gbWVyY3kiLGRvdHM6MyxzcGF3bk11bDouNzIsc3BlZWRNdWw6MS4yNCxmaXJlTXVsOjEuNTUsYnVsbGV0U3BlZWQ6MjQ1fX0sUWY9TWF0aC5QSSoyLEllPShuLGEpPT5uK01hdGgucmFuZG9tKCkqKGEtbiksVmk9KG4sYSk9PmE8bj8obithKS8yOm4rTWF0aC5yYW5kb20oKSooYS1uKSxxcz0obixhLGkpPT5NYXRoLm1heChhLE1hdGgubWluKGksbikpLEVwPW49Pm5bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKm4ubGVuZ3RoKV07ZnVuY3Rpb24gUHAobil7cmV0dXJuIE1hdGgubWluKDI2LDYrbioyKX1mdW5jdGlvbiBHaShuPTYwMCxhPTYwMCl7Y29uc3QgaT1BcnJheS5mcm9tKHtsZW5ndGg6OTB9LCgpPT4oe3g6SWUoMCxuKSx5OkllKDAsYSksdjpJZSgxNiw5NSksczpJZSguNiwxLjkpLHR3OkllKDAsUWYpfSkpO3JldHVybnt3Om4saDphLHRpbWU6MCxsYXN0OjAscGxheWVyOnt4Om4vMix5OmEtNjQscjoxNCxmaXJlQ2Q6MCx0cmlwbGVUOjAscmFwaWRUOjAsc2hpZWxkVDowLGludnVsblQ6MTIwMCxhbGl2ZTohMH0sbGl2ZXM6MyxzY29yZTowLHdhdmU6MSxraWxsczowLGJ1bGxldHM6W10sZWJ1bGxldHM6W10sZW5lbWllczpbXSxwb3dlcnVwczpbXSxwYXJ0aWNsZXM6W10sZmxvYXRlcnM6W10sc3RhcnM6aSxzcGF3blQ6NzAwLHNwYXduZWQ6MCxicmVha1Q6MCx3YXZlSW50cm9UOjE1MDAsZmlyaW5nOiExLG1vdmU6e3g6MCx5OjB9LHNoYWtlOjAsaGl0Rmxhc2g6MCxkaWVkQXQ6MCxleGhhdXN0VDowLHNob3RzRmlyZWQ6MCxib29tczowLGhpdHM6MCxwb3dlcnM6MCx3YXZlQ2xlYXJzOjAscGxheWVySGl0czowLHNoaWVsZEhpdHM6MH19ZnVuY3Rpb24gSXIobixhLGksYyxoPTE2LHA9MSl7Y29uc3QgbT1NYXRoLm1pbigyNDAsbi5wYXJ0aWNsZXMubGVuZ3RoK2gpO2ZvcihsZXQgZj1uLnBhcnRpY2xlcy5sZW5ndGg7ZjxtO2YrKyl7Y29uc3QgZz1JZSgwLFFmKSx2PUllKDMwLDI0MCkqcCx4PUllKDMwMCw3NTApO24ucGFydGljbGVzLnB1c2goe3g6YSx5Omksdng6TWF0aC5jb3MoZykqdix2eTpNYXRoLnNpbihnKSp2LGxpZmU6eCxtYXhMaWZlOngsc2l6ZTpJZSgxLjUsMy42KSpwLGNvbG9yOkVwKGMpLGRyYWc6Mi4yLGdyYXY6MjZ9KX19ZnVuY3Rpb24gTHAobixhKXtjb25zdCBpPW4ud2F2ZSxjPU1hdGgucmFuZG9tKCksaD1pPj0zP01hdGgubWluKC4yMiwuMStpKi4wMTIpOjAscD1hLnNwZWVkTXVsKigxK2kqLjAzKTtsZXQgbT0iZ3J1bnQiO2lmKGM8aD9tPSJ0YW5rIjpjPGgrLjQyJiYobT0id2VhdmVyIiksbT09PSJ0YW5rIil7Y29uc3QgZz01K01hdGguZmxvb3IoaS8zKTtyZXR1cm57a2luZDptLHg6VmkoNTAsbi53LTUwKSx5Oi0zNixyOjIwLGhwOmcsbWF4SHA6Zyx2eTozNipwLHQ6SWUoMCwxZTMpLGJhc2VYOjAsYW1wOjAsZnJlcTowLGZpcmVDZDpJZSg4MDAsMTUwMCksZmxhc2g6MCxzY29yZTo1MDB9fWlmKG09PT0id2VhdmVyIil7Y29uc3QgZz1pPj04PzM6Mix2PVZpKE1hdGgubWluKDkwLG4udyouMjUpLE1hdGgubWF4KG4udy05MCxuLncqLjc1KSk7cmV0dXJue2tpbmQ6bSx4OnYseTotMjYscjoxMyxocDpnLG1heEhwOmcsdnk6KDU2K2kqNC41KSpwLHQ6SWUoMCwxZTMpLGJhc2VYOnYsYW1wOkllKDUwLDEwNSksZnJlcTpJZSgxLjIsMi4yKSxmaXJlQ2Q6SWUoNzAwLDE1MDApLGZsYXNoOjAsc2NvcmU6MjUwfX1jb25zdCBmPWk+PTc/MjoxO3JldHVybntraW5kOm0seDpWaSgyNixuLnctMjYpLHk6LTI2LHI6MTMsaHA6ZixtYXhIcDpmLHZ5Oig2NitpKjUpKnAqSWUoLjg1LDEuMTgpLHQ6SWUoMCwxZTMpLGJhc2VYOjAsYW1wOjAsZnJlcTowLGZpcmVDZDpJZSg5MDAsMjIwMCksZmxhc2g6MCxzY29yZToxMDB9fWZ1bmN0aW9uIF9wKG4sYSxpKXtjb25zdCBjPW4ucGxheWVyO2lmKGEua2luZD09PSJncnVudCIpbi5lYnVsbGV0cy5wdXNoKHt4OmEueCx5OmEueSthLnIsdng6MCx2eTppLmJ1bGxldFNwZWVkfSksYS5maXJlQ2Q9SWUoMTMwMCwyMzAwKTtlbHNlIGlmKGEua2luZD09PSJ3ZWF2ZXIiKXtjb25zdCBoPWMueC1hLngscD1jLnktYS55LG09TWF0aC5oeXBvdChoLHApfHwxLGY9aS5idWxsZXRTcGVlZCouOTU7bi5lYnVsbGV0cy5wdXNoKHt4OmEueCx5OmEueSs4LHZ4OmgvbSpmLHZ5OnAvbSpmfSksYS5maXJlQ2Q9SWUoMTEwMCwxOTAwKX1lbHNle2NvbnN0IGg9TWF0aC5hdGFuMihjLnktYS55LGMueC1hLngpLHA9aS5idWxsZXRTcGVlZCouOTtmb3IoY29uc3QgbSBvZlstLjI2LDAsLjI2XSluLmVidWxsZXRzLnB1c2goe3g6YS54LHk6YS55K2EuciouNix2eDpNYXRoLmNvcyhoK20pKnAsdnk6TWF0aC5zaW4oaCttKSpwfSk7YS5maXJlQ2Q9SWUoMTQwMCwyMTAwKX19ZnVuY3Rpb24gQXAobixhLGkpe2NvbnN0IGM9TWF0aC5yYW5kb20oKSxoPWM8LjQ/InRyaXBsZSI6YzwuNzU/InJhcGlkIjoic2hpZWxkIjtuLnBvd2VydXBzLnB1c2goe2tpbmQ6aCx4OnFzKGEsMTYsbi53LTE2KSx5OmksdDowfSl9ZnVuY3Rpb24geWYobixhKXtjb25zdCBpPW4uZW5lbWllc1thXTtuLmVuZW1pZXMuc3BsaWNlKGEsMSksbi5raWxscysrLG4uc2NvcmUrPWkuc2NvcmUsbi5mbG9hdGVycy5wdXNoKHt4OmkueCx5OmkueSx0eHQ6YCske2kuc2NvcmV9YCxsaWZlOjgwMCxtYXhMaWZlOjgwMCxjb2xvcjoiI2ZmZTA4YSJ9KTtjb25zdCBjPWkua2luZD09PSJncnVudCI/WyIjZmY1ZDhmIiwiI2ZmOGZiMyIsIiNmZmQxNjYiLCIjZmZmZmZmIl06aS5raW5kPT09IndlYXZlciI/WyIjYzA4NGZjIiwiI2UzYzhmZiIsIiNmZmZmZmYiXTpbIiNmZjhjNDIiLCIjZmZkMTY2IiwiI2ZmZjNjNCJdO0lyKG4saS54LGkueSxjLGkua2luZD09PSJ0YW5rIj8yNjoxNixpLmtpbmQ9PT0idGFuayI/MS4yNToxKSxuLnNoYWtlPU1hdGgubWF4KG4uc2hha2UsaS5raW5kPT09InRhbmsiPzU6Mi41KSxuLmJvb21zKyssTWF0aC5yYW5kb20oKTwuMTImJkFwKG4saS54LGkueSl9ZnVuY3Rpb24geGYobixhKXtjb25zdCBpPW4ucGxheWVyO2lmKGkuc2hpZWxkVD4wKXtpLnNoaWVsZFQ9MCxuLnNoaWVsZEhpdHMrKyxuLmZsb2F0ZXJzLnB1c2goe3g6aS54LHk6aS55LTIyLHR4dDoiU0hJRUxEIERPV04iLGxpZmU6OTAwLG1heExpZmU6OTAwLGNvbG9yOiIjNjJlNmZmIn0pLElyKG4saS54LGkueSxbIiM2MmU2ZmYiLCIjYmZmN2ZmIiwiI2ZmZmZmZiJdLDE0LC44KSxuLnNoYWtlPU1hdGgubWF4KG4uc2hha2UsNyksaS5pbnZ1bG5UPTcwMDtyZXR1cm59bi5saXZlcy0tLG4ucGxheWVySGl0cysrLElyKG4saS54LGkueSxbIiM2MmU2ZmYiLCIjYmZmN2ZmIiwiI2ZmZmZmZiIsIiNmZmQxNjYiXSwyNiwxLjEpLG4uc2hha2U9MTUsbi5oaXRGbGFzaD0uNSxuLmxpdmVzPD0wPyhpLmFsaXZlPSExLG4uZmlyaW5nPSExLG4uZGllZEF0PWEsSXIobixpLngsaS55LFsiI2ZmZmZmZiIsIiM2MmU2ZmYiLCIjZmY1ZDhmIiwiI2ZmZDE2NiJdLDQwLDEuNikpOmkuaW52dWxuVD0yMjAwfWZ1bmN0aW9uIElwKG4sYSl7Y29uc3QgaT1uLnBsYXllcjtuLnNjb3JlKz0xNTAsbi5wb3dlcnMrKztsZXQgYz0iU0hJRUxEICsxNTAiLGg9IiM2MmU2ZmYiO2E9PT0idHJpcGxlIj8oaS50cmlwbGVUPThlMyxjPSJUUklQTEUgU0hPVCArMTUwIixoPSIjZmZkMTY2Iik6YT09PSJyYXBpZCI/KGkucmFwaWRUPThlMyxjPSJSQVBJRCBGSVJFICsxNTAiLGg9IiM3ZWYwYTAiKTppLnNoaWVsZFQ9MSxuLmZsb2F0ZXJzLnB1c2goe3g6aS54LHk6aS55LTI2LHR4dDpjLGxpZmU6MWUzLG1heExpZmU6MWUzLGNvbG9yOmh9KSxJcihuLGkueCxpLnksWyIjNjJlNmZmIiwiI2ZmZmZmZiIsIiNmZmQxNjYiXSwxMCwuNyl9ZnVuY3Rpb24gRHAobixhLGksYyxoKXtjb25zdCBwPWEvMWUzO24udGltZSs9YTtmb3IoY29uc3QgZiBvZiBuLnN0YXJzKWYueSs9Zi52KnAqKDErbi53YXZlKi4wMyksZi55Pm4uaCsyJiYoZi55PS0yLGYueD1JZSgwLG4udykpLGYueD5uLncmJihmLngtPW4udyk7Zm9yKGxldCBmPW4ucGFydGljbGVzLmxlbmd0aC0xO2Y+PTA7Zi0tKXtjb25zdCBnPW4ucGFydGljbGVzW2ZdO2lmKGcubGlmZS09YSxnLmxpZmU8PTApe2NvbnN0IHY9bi5wYXJ0aWNsZXMucG9wKCk7diYmZjxuLnBhcnRpY2xlcy5sZW5ndGgmJihuLnBhcnRpY2xlc1tmXT12KTtjb250aW51ZX1nLnZ4LT1nLnZ4KmcuZHJhZypwLGcudnkrPWcuZ3JhdipwLWcudnkqZy5kcmFnKnAsZy54Kz1nLnZ4KnAsZy55Kz1nLnZ5KnB9Zm9yKGxldCBmPW4uZmxvYXRlcnMubGVuZ3RoLTE7Zj49MDtmLS0pbi5mbG9hdGVyc1tmXS5saWZlLT1hLG4uZmxvYXRlcnNbZl0ubGlmZTw9MCYmbi5mbG9hdGVycy5zcGxpY2UoZiwxKTtuLnNoYWtlPU1hdGgubWF4KDAsbi5zaGFrZS1hKi4wNDUpLG4uaGl0Rmxhc2g9TWF0aC5tYXgoMCxuLmhpdEZsYXNoLWEqLjAwMTYpO2NvbnN0IG09bi5wbGF5ZXI7aWYobS5maXJlQ2QtPWEsbS50cmlwbGVUPU1hdGgubWF4KDAsbS50cmlwbGVULWEpLG0ucmFwaWRUPU1hdGgubWF4KDAsbS5yYXBpZFQtYSksbS5pbnZ1bG5UPU1hdGgubWF4KDAsbS5pbnZ1bG5ULWEpLG0uYWxpdmUpe2NvbnN0IGY9bi5tb3ZlLngsZz1uLm1vdmUueSx2PU1hdGguaHlwb3QoZixnKTtpZih2Pi4wMSl7Y29uc3QgeD12PjE/MS92OjEsYj0zODA7bS54Kz1mKngqYipwLG0ueSs9Zyp4KmIqcH1tLng9cXMobS54LG0ucixuLnctbS5yKSxtLnk9cXMobS55LG4uaCouNDIsbi5oLW0uci02KSxuLmV4aGF1c3RULT1hLG4uZXhoYXVzdFQ8PTAmJihuLmV4aGF1c3RUPTM2LG4ucGFydGljbGVzLnB1c2goe3g6bS54K0llKC0zLDMpLHk6bS55KzEyLHZ4OkllKC0xMiwxMiksdnk6SWUoNjAsMTMwKSxsaWZlOjI2MCxtYXhMaWZlOjI2MCxzaXplOkllKDEuMiwyLjQpLGNvbG9yOk1hdGgucmFuZG9tKCk8LjU/IiM2MmU2ZmYiOiIjZmZkMTY2IixkcmFnOjIsZ3JhdjowfSkpfWlmKGgpe2lmKG4uZmlyaW5nJiZtLmFsaXZlJiZtLmZpcmVDZDw9MCl7bS5maXJlQ2Q9bS5yYXBpZFQ+MD8xMTU6MjUwO2NvbnN0IGY9LTY0MDttLnRyaXBsZVQ+MD9uLmJ1bGxldHMucHVzaCh7eDptLngtOCx5Om0ueS0xMCx2eDotMTUwLHZ5OmZ9LHt4Om0ueCx5Om0ueS0xNix2eDowLHZ5OmZ9LHt4Om0ueCs4LHk6bS55LTEwLHZ4OjE1MCx2eTpmfSk6bi5idWxsZXRzLnB1c2goe3g6bS54LHk6bS55LTE2LHZ4OjAsdnk6Zn0pLG4uc2hvdHNGaXJlZCsrLG4ucGFydGljbGVzLnB1c2goe3g6bS54LHk6bS55LTE4LHZ4OkllKC0yMCwyMCksdnk6SWUoLTkwLC00MCksbGlmZToxMjAsbWF4TGlmZToxMjAsc2l6ZTpJZSgxLDIpLGNvbG9yOiIjZmZkMTY2IixkcmFnOjIsZ3JhdjowfSl9aWYobi5icmVha1Q+MCluLmJyZWFrVC09YSxuLmJyZWFrVDw9MCYmKG4ud2F2ZSsrLG4uc3Bhd25lZD0wLG4ud2F2ZUludHJvVD0xNTAwLG4uc3Bhd25UPTYwMCk7ZWxzZSBpZihtLmFsaXZlKXtpZihuLndhdmVJbnRyb1Q9TWF0aC5tYXgoMCxuLndhdmVJbnRyb1QtYSksbi5zcGF3bmVkPFBwKG4ud2F2ZSkpbi5zcGF3blQtPWEsbi5zcGF3blQ8PTAmJm4uZW5lbWllcy5sZW5ndGg8MTQmJihuLmVuZW1pZXMucHVzaChMcChuLGMpKSxuLnNwYXduZWQrKyxuLnNwYXduVD1NYXRoLm1heCgyNjAsMTA1MC1uLndhdmUqNzApKmMuc3Bhd25NdWwqSWUoLjcsMS4yNSkpO2Vsc2UgaWYobi5lbmVtaWVzLmxlbmd0aD09PTApe2NvbnN0IGY9MjAwK24ud2F2ZSo1MDtuLnNjb3JlKz1mLG4ud2F2ZUNsZWFycysrLG4uZmxvYXRlcnMucHVzaCh7eDpuLncvMix5Om4uaCouMzYsdHh0OmBXQVZFIENMRUFSICArJHtmfWAsbGlmZToxNzAwLG1heExpZmU6MTcwMCxjb2xvcjoiI2ZmZDE2NiJ9KSxuLmJyZWFrVD0zZTN9fWZvcihsZXQgZj1uLmVuZW1pZXMubGVuZ3RoLTE7Zj49MDtmLS0pe2NvbnN0IGc9bi5lbmVtaWVzW2ZdO2lmKGcudCs9YSxnLmZsYXNoPU1hdGgubWF4KDAsZy5mbGFzaC1hKSxnLnkrPWcudnkqcCxnLmtpbmQ9PT0id2VhdmVyIiYmKGcueD1xcyhnLmJhc2VYK01hdGguc2luKGcudC8xZTMqZy5mcmVxKjIpKmcuYW1wLDE0LG4udy0xNCkpLG0uYWxpdmUmJihnLmZpcmVDZC09YSpjLmZpcmVNdWwsZy5maXJlQ2Q8PTAmJmcueT4xMCYmZy55PG4uaCouNzImJl9wKG4sZyxjKSksZy55Pm4uaCs0NCl7bi5lbmVtaWVzLnNwbGljZShmLDEpO2NvbnRpbnVlfW0uYWxpdmUmJm0uaW52dWxuVDw9MCYmTWF0aC5oeXBvdChnLngtbS54LGcueS1tLnkpPGcucittLnItMiYmKHlmKG4sZikseGYobixpKSl9Zm9yKGxldCBmPW4uYnVsbGV0cy5sZW5ndGgtMTtmPj0wO2YtLSl7Y29uc3QgZz1uLmJ1bGxldHNbZl07aWYoZy54Kz1nLnZ4KnAsZy55Kz1nLnZ5KnAsZy55PC0yNHx8Zy54PC0yNHx8Zy54Pm4udysyNCl7bi5idWxsZXRzLnNwbGljZShmLDEpO2NvbnRpbnVlfWZvcihsZXQgdj1uLmVuZW1pZXMubGVuZ3RoLTE7dj49MDt2LS0pe2NvbnN0IHg9bi5lbmVtaWVzW3ZdO2lmKE1hdGguaHlwb3QoZy54LXgueCxnLnkteC55KTx4LnIrNCl7bi5idWxsZXRzLnNwbGljZShmLDEpLHguaHAtLSx4LmZsYXNoPTkwLHguaHA8PTA/eWYobix2KToobi5oaXRzKyssSXIobixnLngsZy55LFsiI2ZmZDE2NiIsIiNmZmZmZmYiXSwzLC40NSkpO2JyZWFrfX19Zm9yKGxldCBmPW4uZWJ1bGxldHMubGVuZ3RoLTE7Zj49MDtmLS0pe2NvbnN0IGc9bi5lYnVsbGV0c1tmXTtpZihnLngrPWcudngqcCxnLnkrPWcudnkqcCxnLnk+bi5oKzIwfHxnLnk8LTIwfHxnLng8LTIwfHxnLng+bi53KzIwKXtuLmVidWxsZXRzLnNwbGljZShmLDEpO2NvbnRpbnVlfW0uYWxpdmUmJm0uaW52dWxuVDw9MCYmTWF0aC5oeXBvdChnLngtbS54LGcueS1tLnkpPG0uciszJiYobi5lYnVsbGV0cy5zcGxpY2UoZiwxKSx4ZihuLGkpKX1mb3IobGV0IGY9bi5wb3dlcnVwcy5sZW5ndGgtMTtmPj0wO2YtLSl7Y29uc3QgZz1uLnBvd2VydXBzW2ZdO2lmKGcudCs9YSxnLnkrPTcyKnAsZy55Pm4uaCsyMCl7bi5wb3dlcnVwcy5zcGxpY2UoZiwxKTtjb250aW51ZX1tLmFsaXZlJiZNYXRoLmh5cG90KGcueC1tLngsZy55LW0ueSk8bS5yKzEzJiYobi5wb3dlcnVwcy5zcGxpY2UoZiwxKSxJcChuLGcua2luZCkpfX19Y29uc3QgTWw9TWF0aC5QSSoyLHdmPShuLGEpPT5uK01hdGgucmFuZG9tKCkqKGEtbik7ZnVuY3Rpb24gdG4obixhLGksYyl7bi5iZWdpblBhdGgoKSxuLmFyYyhhLGksYywwLE1sKSxuLmZpbGwoKX1mdW5jdGlvbiB6cChuLGEsaSxjLGgscCl7bi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhK3AsaSksbi5hcmNUbyhhK2MsaSxhK2MsaStoLHApLG4uYXJjVG8oYStjLGkraCxhLGkraCxwKSxuLmFyY1RvKGEsaStoLGEsaSxwKSxuLmFyY1RvKGEsaSxhK2MsaSxwKSxuLmNsb3NlUGF0aCgpfWZ1bmN0aW9uIE9wKG4sYSl7aWYobi5zYXZlKCksbi50cmFuc2xhdGUoYS54LGEueSksYS5raW5kPT09ImdydW50IiluLnJvdGF0ZShNYXRoLnNpbihhLnQqLjAwNCkqLjE4KSxuLnNoYWRvd0NvbG9yPSIjZmY1ZDhmIixuLnNoYWRvd0JsdXI9MTIsbi5maWxsU3R5bGU9IiNmZjVkOGYiLG4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oMCwxNSksbi5saW5lVG8oMTMsLTkpLG4ubGluZVRvKDAsLTMpLG4ubGluZVRvKC0xMywtOSksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLmZpbGxTdHlsZT0iIzU3MTQyOCIsdG4obiwwLC0xLDQuNSksbi5maWxsU3R5bGU9IiNmZmZmZmYiLHRuKG4sLTIsLTIsMS4yKSx0bihuLDIsLTIsMS4yKTtlbHNlIGlmKGEua2luZD09PSJ3ZWF2ZXIiKW4ucm90YXRlKE1hdGguc2luKGEudCouMDAzKSouMyksbi5zaGFkb3dDb2xvcj0iI2MwODRmYyIsbi5zaGFkb3dCbHVyPTEyLG4uZmlsbFN0eWxlPSIjYzA4NGZjIixuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKDAsLTE1KSxuLmxpbmVUbygxMSwwKSxuLmxpbmVUbygwLDE1KSxuLmxpbmVUbygtMTEsMCksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLmZpbGxTdHlsZT0iIzNiMWQ1ZSIsbi5iZWdpblBhdGgoKSxuLm1vdmVUbygwLC03KSxuLmxpbmVUbyg1LjUsMCksbi5saW5lVG8oMCw3KSxuLmxpbmVUbygtNS41LDApLG4uY2xvc2VQYXRoKCksbi5maWxsKCksbi5maWxsU3R5bGU9IiNmM2U4ZmYiLHRuKG4sMCwwLDIpO2Vsc2V7bi5yb3RhdGUoTWF0aC5zaW4oYS50Ki4wMDE1KSouMDgpLG4uc2hhZG93Q29sb3I9IiNmZjhjNDIiLG4uc2hhZG93Qmx1cj0xNCxuLmZpbGxTdHlsZT0iI2ZmOGM0MiIsbi5iZWdpblBhdGgoKTtmb3IobGV0IGk9MDtpPDY7aSsrKXtjb25zdCBjPWkvNipNbC1NYXRoLlBJLzIsaD1NYXRoLmNvcyhjKSoyMCxwPU1hdGguc2luKGMpKjIwO2k9PT0wP24ubW92ZVRvKGgscCk6bi5saW5lVG8oaCxwKX1uLmNsb3NlUGF0aCgpLG4uZmlsbCgpLG4uc2hhZG93Qmx1cj0wLG4uc3Ryb2tlU3R5bGU9IiM4YTQ1MTUiLG4ubGluZVdpZHRoPTIsbi5iZWdpblBhdGgoKTtmb3IobGV0IGk9MDtpPDY7aSsrKXtjb25zdCBjPWkvNipNbC1NYXRoLlBJLzIsaD1NYXRoLmNvcyhjKSoxMixwPU1hdGguc2luKGMpKjEyO2k9PT0wP24ubW92ZVRvKGgscCk6bi5saW5lVG8oaCxwKX1uLmNsb3NlUGF0aCgpLG4uc3Ryb2tlKCksbi5maWxsU3R5bGU9IiM4YTQ1MTUiLHRuKG4sMCwwLDUpLG4uZmlsbFN0eWxlPSIjZmZkMTY2Iix0bihuLDAsMCwyLjUpfWlmKGEuZmxhc2g+MCYmKG4uZ2xvYmFsQWxwaGE9TWF0aC5taW4oMSxhLmZsYXNoLzkwKSxuLmZpbGxTdHlsZT0iI2ZmZmZmZiIsdG4obiwwLDAsYS5yKi45KSxuLmdsb2JhbEFscGhhPTEpLG4ucmVzdG9yZSgpLGEua2luZD09PSJ0YW5rIil7Y29uc3QgYz1NYXRoLm1heCgwLGEuaHAvYS5tYXhIcCk7bi5maWxsU3R5bGU9InJnYmEoNTgsMzEsMTQsMC45KSIsbi5maWxsUmVjdChhLngtMzYvMixhLnktYS5yLTEyLDM2LDQpLG4uZmlsbFN0eWxlPSIjZmZkMTY2IixuLmZpbGxSZWN0KGEueC0zNi8yLGEueS1hLnItMTIsMzYqYyw0KX19ZnVuY3Rpb24gRnAobixhKXtjb25zdCBpPWEucGxheWVyO2lmKCFpLmFsaXZlKXJldHVybjtjb25zdCBjPWEudGltZTtuLnNhdmUoKSxuLnRyYW5zbGF0ZShpLngsaS55KSxpLmludnVsblQ+MCYmTWF0aC5mbG9vcihjLzExMCklMj09PTAmJihuLmdsb2JhbEFscGhhPS4zNSk7Y29uc3QgaD05K01hdGguc2luKGMqLjA0NSkqNCsoYS5maXJpbmc/MzowKTtuLmZpbGxTdHlsZT0iI2ZmZDE2NiIsbi5iZWdpblBhdGgoKSxuLm1vdmVUbygtNC41LDEwKSxuLmxpbmVUbygwLDEwK2gpLG4ubGluZVRvKDQuNSwxMCksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLmZpbGxTdHlsZT0iI2ZmZjNjNCIsbi5iZWdpblBhdGgoKSxuLm1vdmVUbygtMiwxMCksbi5saW5lVG8oMCwxMCtoKi41NSksbi5saW5lVG8oMiwxMCksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC45KSIsbi5zaGFkb3dCbHVyPTE2O2NvbnN0IHA9bi5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLC0xOCwwLDE0KTtwLmFkZENvbG9yU3RvcCgwLCIjZGZmYWZmIikscC5hZGRDb2xvclN0b3AoLjUsIiM2MmU2ZmYiKSxwLmFkZENvbG9yU3RvcCgxLCIjMTc4NmE4Iiksbi5maWxsU3R5bGU9cCxuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKDAsLTE4KSxuLmxpbmVUbygxMyw5KSxuLmxpbmVUbyg3LDEzKSxuLmxpbmVUbygwLDgpLG4ubGluZVRvKC03LDEzKSxuLmxpbmVUbygtMTMsOSksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLnN0cm9rZVN0eWxlPSJyZ2JhKDIzMCwyNTUsMjU1LDAuNTUpIixuLmxpbmVXaWR0aD0xLG4uc3Ryb2tlKCksbi5maWxsU3R5bGU9IiNmZmZmZmYiLHRuKG4sMCwtNSwzKSxuLnJlc3RvcmUoKSxpLnNoaWVsZFQ+MCYmKG4uc2F2ZSgpLG4uc3Ryb2tlU3R5bGU9YHJnYmEoOTgsMjMwLDI1NSwkey41Ky4zKk1hdGguc2luKGMqLjAwOCl9KWAsbi5saW5lV2lkdGg9MixuLnNoYWRvd0NvbG9yPSIjNjJlNmZmIixuLnNoYWRvd0JsdXI9MTAsbi5iZWdpblBhdGgoKSxuLmFyYyhpLngsaS55LDI1LDAsTWwpLG4uc3Ryb2tlKCksbi5yZXN0b3JlKCkpfWNvbnN0IEJwPXt0cmlwbGU6WyIjZmZkMTY2IiwiIzdjNGExMiJdLHJhcGlkOlsiIzdlZjBhMCIsIiMxZDVlMzUiXSxzaGllbGQ6WyIjNjJlNmZmIiwiIzE3NWU3NSJdfSwkcD17dHJpcGxlOiJUIixyYXBpZDoiUiIsc2hpZWxkOiJTIn07ZnVuY3Rpb24gV3AobixhLGksYyxoKXtjb25zdCBwPWEudGltZTtuLmZpbGxTdHlsZT0iIzA3MGQxYSIsbi5maWxsUmVjdCgwLDAsaSxjKTtsZXQgbT1uLmNyZWF0ZVJhZGlhbEdyYWRpZW50KGkqLjI4K01hdGguc2luKHAqMmUtNCkqNDAsYyouMytNYXRoLmNvcyhwKjE3ZS01KSozMCwwLGkqLjI4LGMqLjMsaSouNSk7bS5hZGRDb2xvclN0b3AoMCwicmdiYSgyNTUsOTMsMTQzLDAuMTApIiksbS5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsOTMsMTQzLDApIiksbi5maWxsU3R5bGU9bSxuLmZpbGxSZWN0KDAsMCxpLGMpLG09bi5jcmVhdGVSYWRpYWxHcmFkaWVudChpKi43MitNYXRoLmNvcyhwKjE1ZS01KSo1MCxjKi42OCtNYXRoLnNpbihwKjJlLTQpKjQwLDAsaSouNzIsYyouNjgsaSouNTUpLG0uYWRkQ29sb3JTdG9wKDAsInJnYmEoOTgsMjMwLDI1NSwwLjA4KSIpLG0uYWRkQ29sb3JTdG9wKDEsInJnYmEoOTgsMjMwLDI1NSwwKSIpLG4uZmlsbFN0eWxlPW0sbi5maWxsUmVjdCgwLDAsaSxjKTtmb3IoY29uc3QgZyBvZiBhLnN0YXJzKXtjb25zdCB2PS4yNSsuNTUqKC41Ky41Kk1hdGguc2luKHAqLjAwMSpnLnYqLjA1K2cudHcpKTtuLmdsb2JhbEFscGhhPXYsbi5maWxsU3R5bGU9IiNjZmU2ZmYiLG4uZmlsbFJlY3QoZy54LGcueSxnLnMsZy5zKX1uLmdsb2JhbEFscGhhPTEsbi5zYXZlKCksYS5zaGFrZT4uMiYmbi50cmFuc2xhdGUod2YoLWEuc2hha2UsYS5zaGFrZSkqLjYsd2YoLWEuc2hha2UsYS5zaGFrZSkqLjYpO2Zvcihjb25zdCBnIG9mIGEucG93ZXJ1cHMpe2NvbnN0W3YseF09QnBbZy5raW5kXSxiPTErTWF0aC5zaW4oZy50Ki4wMDgpKi4wODtuLnNhdmUoKSxuLnRyYW5zbGF0ZShnLngsZy55KSxuLnNjYWxlKGIsYiksbi5zaGFkb3dDb2xvcj12LG4uc2hhZG93Qmx1cj0xNCxuLmZpbGxTdHlsZT12LHpwKG4sLTExLC0xMSwyMiwyMiw2KSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLnN0cm9rZVN0eWxlPXgsbi5saW5lV2lkdGg9MixuLnN0cm9rZSgpLG4uZmlsbFN0eWxlPSIjMGEwZjE0IixuLmZvbnQ9ImJvbGQgMTJweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsbi50ZXh0QWxpZ249ImNlbnRlciIsbi50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsbi5maWxsVGV4dCgkcFtnLmtpbmRdLDAsMSksbi5yZXN0b3JlKCl9Zm9yKGNvbnN0IGcgb2YgYS5lbmVtaWVzKU9wKG4sZyk7bi5zYXZlKCksbi5saW5lQ2FwPSJyb3VuZCI7Zm9yKGNvbnN0IGcgb2YgYS5idWxsZXRzKW4uc3Ryb2tlU3R5bGU9IiNmZmQxNjYiLG4ubGluZVdpZHRoPTMuNSxuLnNoYWRvd0NvbG9yPSIjZmZkMTY2IixuLnNoYWRvd0JsdXI9OCxuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKGcueCxnLnkpLG4ubGluZVRvKGcueC1nLnZ4Ki4wMTYsZy55LWcudnkqLjAxNiksbi5zdHJva2UoKTtuLnJlc3RvcmUoKTtmb3IoY29uc3QgZyBvZiBhLmVidWxsZXRzKW4uc2F2ZSgpLG4uc2hhZG93Q29sb3I9IiNmZjVkOGYiLG4uc2hhZG93Qmx1cj0xMCxuLmZpbGxTdHlsZT0iI2ZmOGZiMyIsdG4obixnLngsZy55LDQpLG4uc2hhZG93Qmx1cj0wLG4uZmlsbFN0eWxlPSIjZmZmZmZmIix0bihuLGcueCxnLnksMS42KSxuLnJlc3RvcmUoKTtoIT09ImlkbGUiJiZGcChuLGEpO2Zvcihjb25zdCBnIG9mIGEucGFydGljbGVzKXtjb25zdCB2PU1hdGgubWF4KDAsZy5saWZlL2cubWF4TGlmZSk7bi5nbG9iYWxBbHBoYT12LG4uZmlsbFN0eWxlPWcuY29sb3Isbi5iZWdpblBhdGgoKSxuLmFyYyhnLngsZy55LE1hdGgubWF4KC40LGcuc2l6ZSp2KSwwLE1sKSxuLmZpbGwoKX1uLmdsb2JhbEFscGhhPTE7Zm9yKGNvbnN0IGcgb2YgYS5mbG9hdGVycyl7Y29uc3Qgdj1NYXRoLm1heCgwLGcubGlmZS9nLm1heExpZmUpO24uZ2xvYmFsQWxwaGE9dixuLmZvbnQ9ImJvbGQgMTNweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsbi50ZXh0QWxpZ249ImNlbnRlciIsbi50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsbi5saW5lV2lkdGg9MyxuLnN0cm9rZVN0eWxlPSJyZ2JhKDAsMCwwLDAuNjUpIjtjb25zdCB4PWcueS0oMS12KSoyNjtuLnN0cm9rZVRleHQoZy50eHQsZy54LHgpLG4uZmlsbFN0eWxlPWcuY29sb3Isbi5maWxsVGV4dChnLnR4dCxnLngseCl9aWYobi5nbG9iYWxBbHBoYT0xLG4ucmVzdG9yZSgpLG4udGV4dEFsaWduPSJjZW50ZXIiLG4udGV4dEJhc2VsaW5lPSJtaWRkbGUiLGg9PT0icmVhZHkiKXtjb25zdCBnPTErTWF0aC5zaW4ocCouMDA4KSouMDQ7bi5zYXZlKCksbi50cmFuc2xhdGUoaS8yLGMqLjQpLG4uc2NhbGUoZyxnKSxuLmZvbnQ9IjIycHggJ1ByZXNzIFN0YXJ0IDJQJywgbW9ub3NwYWNlIixuLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC44KSIsbi5zaGFkb3dCbHVyPTE4LG4uZmlsbFN0eWxlPSIjNjJlNmZmIixuLmZpbGxUZXh0KCJHRVQgUkVBRFkiLDAsMCksbi5yZXN0b3JlKCksbi5mb250PSJib2xkIDEzcHggJ0NoYWtyYSBQZXRjaCcsIHNhbnMtc2VyaWYiLG4uZmlsbFN0eWxlPSIjY2ZlNmZmIixuLmZpbGxUZXh0KCJXQVZFIDEgSU5CT1VORCIsaS8yLGMqLjQrMzQpfWlmKGg9PT0icnVubmluZyIpe2lmKGEud2F2ZUludHJvVD4wKXtjb25zdCBnPU1hdGgubWluKDEsYS53YXZlSW50cm9ULzQwMCk7bi5nbG9iYWxBbHBoYT1nLG4uZm9udD0iMjRweCAnUHJlc3MgU3RhcnQgMlAnLCBtb25vc3BhY2UiLG4uc2hhZG93Q29sb3I9InJnYmEoMjU1LDIwOSwxMDIsMC44KSIsbi5zaGFkb3dCbHVyPTE4LG4uZmlsbFN0eWxlPSIjZmZkMTY2IixuLmZpbGxUZXh0KGBXQVZFICR7YS53YXZlfWAsaS8yLGMqLjM4KSxuLnNoYWRvd0JsdXI9MCxuLmZvbnQ9ImJvbGQgMTNweCAnQ2hha3JhIFBldGNoJywgc2Fucy1zZXJpZiIsbi5maWxsU3R5bGU9IiNjZmU2ZmYiLG4uZmlsbFRleHQoIkhPU1RJTEVTIElOQk9VTkQiLGkvMixjKi4zOCszNCksbi5nbG9iYWxBbHBoYT0xfWVsc2UgaWYoYS5icmVha1Q+MCl7Y29uc3QgZz1NYXRoLm1pbigxLGEuYnJlYWtULzUwMCwoM2UzLWEuYnJlYWtUKS8zMDApO24uZ2xvYmFsQWxwaGE9TWF0aC5tYXgoMCxnKSxuLmZvbnQ9IjIwcHggJ1ByZXNzIFN0YXJ0IDJQJywgbW9ub3NwYWNlIixuLnNoYWRvd0NvbG9yPSJyZ2JhKDk4LDIzMCwyNTUsMC44KSIsbi5zaGFkb3dCbHVyPTE2LG4uZmlsbFN0eWxlPSIjYmZmN2ZmIixuLmZpbGxUZXh0KCJTRUNUT1IgQ0xFQVIiLGkvMixjKi4zOCksbi5nbG9iYWxBbHBoYT0xfX1jb25zdCBmPW4uY3JlYXRlUmFkaWFsR3JhZGllbnQoaS8yLGMvMixNYXRoLm1pbihpLGMpKi4zNSxpLzIsYy8yLE1hdGgubWF4KGksYykqLjcyKTtmLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDIsNiwxNiwwKSIpLGYuYWRkQ29sb3JTdG9wKDEsInJnYmEoMiw2LDE2LDAuNTUpIiksbi5maWxsU3R5bGU9ZixuLmZpbGxSZWN0KDAsMCxpLGMpLGEuaGl0Rmxhc2g+MCYmKG4uZmlsbFN0eWxlPWByZ2JhKDI1NSw4MCwxMTAsJHthLmhpdEZsYXNoKi40fSlgLG4uZmlsbFJlY3QoMCwwLGksYykpfWNvbnN0IFlmPSJ2ZWN0b3JzdHJpa2UuYmVzdHMudjEiLFhmPSJ2ZWN0b3JzdHJpa2UuZGlmZi52MSI7ZnVuY3Rpb24gVXAoKXtjb25zdCBuPXtjYWRldDowLHBpbG90OjAsYWNlOjB9O3RyeXtjb25zdCBhPWxvY2FsU3RvcmFnZS5nZXRJdGVtKFlmKTtpZighYSlyZXR1cm4gbjtjb25zdCBpPUpTT04ucGFyc2UoYSk7cmV0dXJue2NhZGV0Ok51bWJlcihpLmNhZGV0KXx8MCxwaWxvdDpOdW1iZXIoaS5waWxvdCl8fDAsYWNlOk51bWJlcihpLmFjZSl8fDB9fWNhdGNoe3JldHVybiBufX1mdW5jdGlvbiBIcCgpe3RyeXtjb25zdCBuPWxvY2FsU3RvcmFnZS5nZXRJdGVtKFhmKTtpZihuPT09ImNhZGV0Inx8bj09PSJwaWxvdCJ8fG49PT0iYWNlIilyZXR1cm4gbn1jYXRjaHt9cmV0dXJuInBpbG90In1mdW5jdGlvbiBWcCgpe2NvbnN0IG49ai51c2VSZWYobnVsbCksYT1qLnVzZVJlZihudWxsKSxpPWoudXNlUmVmKEdpKCkpLGM9ai51c2VSZWYoe3c6MCxoOjB9KSxoPWoudXNlUmVmKDApLHA9ai51c2VSZWYobmV3IFNldCksbT1qLnVzZVJlZighMSksZj1qLnVzZVJlZih7c2hvdHM6MCxib29tczowLGhpdHM6MCxwb3dlcnM6MCx3YXZlczowLHBoaXRzOjAsc2hpdHM6MH0pLFtnLHZdPWoudXNlU3RhdGUoImlkbGUiKSx4PWoudXNlUmVmKCJpZGxlIiksW2IsVF09ai51c2VTdGF0ZSgwKSxBPWoudXNlUmVmKDApLFtlZSxyZV09ai51c2VTdGF0ZSgxKSxbJCxnZV09ai51c2VTdGF0ZSgwKSxbZGUsYWVdPWoudXNlU3RhdGUoMyksW2hlLFhlXT1qLnVzZVN0YXRlKDApLFtSZSxFZV09ai51c2VTdGF0ZSghMSksWyRlLERlXT1qLnVzZVN0YXRlKEhwKSx6ZT1qLnVzZVJlZigkZSksW0hlLE9lXT1qLnVzZVN0YXRlKFVwKSxfZT1qLnVzZVJlZihIZSksW0tlLEZlXT1qLnVzZVN0YXRlKFJsKSx3ZT1qLnVzZVJlZihLZSksaWU9ai51c2VDYWxsYmFjayhGPT57eC5jdXJyZW50PUYsdihGKX0sW10pLFA9ai51c2VDYWxsYmFjaygoKT0+e2guY3VycmVudCYmKHdpbmRvdy5jbGVhclRpbWVvdXQoaC5jdXJyZW50KSxoLmN1cnJlbnQ9MCl9LFtdKSxLPWoudXNlQ2FsbGJhY2soRj0+e1AoKSxpZSgicmVhZHkiKSxoLmN1cnJlbnQ9d2luZG93LnNldFRpbWVvdXQoKCk9PntoLmN1cnJlbnQ9MCx4LmN1cnJlbnQ9PT0icmVhZHkiJiZpZSgicnVubmluZyIpfSxGKX0sW1AsaWVdKSxfPWoudXNlQ2FsbGJhY2soKCk9PntqdCgpLFAoKTtjb25zdHt3OkYsaDprZX09Yy5jdXJyZW50O2kuY3VycmVudD1HaShGfHw2MDAsa2V8fDYwMCk7Y29uc3QgU2U9aS5jdXJyZW50O2YuY3VycmVudD17c2hvdHM6U2Uuc2hvdHNGaXJlZCxib29tczpTZS5ib29tcyxoaXRzOlNlLmhpdHMscG93ZXJzOlNlLnBvd2Vycyx3YXZlczpTZS53YXZlQ2xlYXJzLHBoaXRzOlNlLnBsYXllckhpdHMsc2hpdHM6U2Uuc2hpZWxkSGl0c30sQS5jdXJyZW50PTAsVCgwKSxyZSgxKSxnZSgwKSxhZSgzKSxFZSghMSksQWUuc3RhcnQoKSxLKDFlMyl9LFtQLEtdKSxrPWoudXNlQ2FsbGJhY2soKCk9Pnt4LmN1cnJlbnQ9PT0icnVubmluZyImJihQKCksQWUucGF1c2UoKSxpZSgicGF1c2VkIikpfSxbUCxpZV0pLFI9ai51c2VDYWxsYmFjaygoKT0+e3guY3VycmVudD09PSJwYXVzZWQiJiYoanQoKSxBZS5yZXN1bWUoKSxLKDUwMCkpfSxbS10pLGxlPWoudXNlQ2FsbGJhY2soKCk9Pntjb25zdCBGPXguY3VycmVudDtGPT09ImlkbGUifHxGPT09Im92ZXIiP18oKTpGPT09InJ1bm5pbmciP2soKTpGPT09InBhdXNlZCImJlIoKX0sW18sayxSXSksST1qLnVzZUNhbGxiYWNrKEY9Pntjb25zdCBrZT14LmN1cnJlbnQ7aWYoa2U9PT0icnVubmluZyJ8fGtlPT09InJlYWR5Inx8a2U9PT0icGF1c2VkIilyZXR1cm47emUuY3VycmVudD1GLERlKEYpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShYZixGKX1jYXRjaHt9Y29uc3R7dzpTZSxoOll9PWMuY3VycmVudDtpLmN1cnJlbnQ9R2koU2V8fDYwMCxZfHw2MDApLEEuY3VycmVudD0wLFQoMCkscmUoMSksZ2UoMCksYWUoMyksRWUoITEpfSxbXSksVT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgRj0hd2UuY3VycmVudDt3ZS5jdXJyZW50PUYsRmUoRiksc24oRiksVGwoRil9LFtdKSx0ZT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgRj1pLmN1cnJlbnQ7QWUuZGllKCk7Y29uc3Qga2U9emUuY3VycmVudCxTZT1GLnNjb3JlO2lmKFNlPl9lLmN1cnJlbnRba2VdKXtjb25zdCBZPXsuLi5fZS5jdXJyZW50LFtrZV06U2V9O19lLmN1cnJlbnQ9WSxPZShZKSxFZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKFlmLEpTT04uc3RyaW5naWZ5KFkpKX1jYXRjaHt9fWllKCJvdmVyIil9LFtpZV0pLHVlPWoudXNlUmVmKCExKSxWPWoudXNlUmVmKCExKSxwZT1qLnVzZUNhbGxiYWNrKEY9PntpZihGLnBvaW50ZXJUeXBlPT09Im1vdXNlIil7Ri5wcmV2ZW50RGVmYXVsdCgpLGp0KCk7dHJ5e0YuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZShGLnBvaW50ZXJJZCl9Y2F0Y2h7fXVlLmN1cnJlbnQ9ITAseC5jdXJyZW50PT09ImlkbGUiJiZfKCl9fSxbX10pLHE9ai51c2VDYWxsYmFjayhGPT57dWUuY3VycmVudD0hMTt0cnl7Ri5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShGLnBvaW50ZXJJZCl9Y2F0Y2h7fX0sW10pLG1lPWoudXNlQ2FsbGJhY2soRj0+e0YmJihqdCgpLCh4LmN1cnJlbnQ9PT0iaWRsZSJ8fHguY3VycmVudD09PSJvdmVyIikmJl8oKSksVi5jdXJyZW50PUZ9LFtfXSksSD1qLnVzZUNhbGxiYWNrKEY9PntwLmN1cnJlbnQuYWRkKEYpLHguY3VycmVudD09PSJpZGxlIiYmXygpfSxbX10pLHZlPWoudXNlQ2FsbGJhY2soRj0+e3AuY3VycmVudC5kZWxldGUoRil9LFtdKTtyZXR1cm4gai51c2VFZmZlY3QoKCk9Pntzbih3ZS5jdXJyZW50KTtsZXQgRj0wO2NvbnN0IGtlPWplPT57Y29uc3QgVz1pLmN1cnJlbnQsYmU9Vy5sYXN0P01hdGgubWluKDYwLGplLVcubGFzdCk6MTY7Vy5sYXN0PWplO2NvbnN0IHhlPWMuY3VycmVudDt4ZS53PjAmJihXLnc9eGUudyxXLmg9eGUuaCk7Y29uc3Qgb2U9cC5jdXJyZW50O1cubW92ZS54PShvZS5oYXMoImFycm93cmlnaHQiKXx8b2UuaGFzKCJkIik/MTowKS0ob2UuaGFzKCJhcnJvd2xlZnQiKXx8b2UuaGFzKCJhIik/MTowKSxXLm1vdmUueT0ob2UuaGFzKCJhcnJvd2Rvd24iKXx8b2UuaGFzKCJzIik/MTowKS0ob2UuaGFzKCJhcnJvd3VwIil8fG9lLmhhcygidyIpPzE6MCk7Y29uc3QgcnQ9eC5jdXJyZW50O1cuZmlyaW5nPShtLmN1cnJlbnR8fHVlLmN1cnJlbnR8fFYuY3VycmVudCkmJnJ0PT09InJ1bm5pbmciO2NvbnN0IGFuPXJ0PT09InJ1bm5pbmcifHxydD09PSJvdmVyIjtEcChXLGJlLGplLFRwW3plLmN1cnJlbnRdLGFuKSxXLnNjb3JlIT09QS5jdXJyZW50JiYoQS5jdXJyZW50PVcuc2NvcmUsVChXLnNjb3JlKSxYZShscj0+bHIrMSkpLHJlKFcud2F2ZSksZ2UoVy5raWxscyksYWUoVy5saXZlcyk7Y29uc3QgbHQ9Zi5jdXJyZW50O1cuc2hvdHNGaXJlZCE9PWx0LnNob3RzJiYobHQuc2hvdHM9Vy5zaG90c0ZpcmVkLEFlLnNob290KCkpLFcuYm9vbXMhPT1sdC5ib29tcyYmKGx0LmJvb21zPVcuYm9vbXMsQWUuYm9vbSgpKSxXLmhpdHMhPT1sdC5oaXRzJiYobHQuaGl0cz1XLmhpdHMsQWUuaGl0KCkpLFcucG93ZXJzIT09bHQucG93ZXJzJiYobHQucG93ZXJzPVcucG93ZXJzLEFlLnBvd2VyKCkpLFcud2F2ZUNsZWFycyE9PWx0LndhdmVzJiYobHQud2F2ZXM9Vy53YXZlQ2xlYXJzLEFlLndhdmUoKSksVy5wbGF5ZXJIaXRzIT09bHQucGhpdHMmJihsdC5waGl0cz1XLnBsYXllckhpdHMsQWUucGxheWVySGl0KCkpLFcuc2hpZWxkSGl0cyE9PWx0LnNoaXRzJiYobHQuc2hpdHM9Vy5zaGllbGRIaXRzLEFlLnNoaWVsZERvd24oKSkscnQ9PT0icnVubmluZyImJlcuZGllZEF0PjAmJmplLVcuZGllZEF0Pjg1MCYmdGUoKTtjb25zdCB3bj1uLmN1cnJlbnQ7aWYod24mJnhlLnc+MCl7Y29uc3QgbHI9d24uZ2V0Q29udGV4dCgiMmQiKTtsciYmV3AobHIsVyx4ZS53LHhlLmgscnQpfUY9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGtlKX07Rj1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoa2UpO2NvbnN0IFNlPWEuY3VycmVudCxZPW4uY3VycmVudDtsZXQgV2U9bnVsbDtpZihTZSYmWSl7Y29uc3QgamU9KCk9Pntjb25zdCBXPVNlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGJlPU1hdGgubWF4KDAsTWF0aC5mbG9vcihNYXRoLm1pbihXLndpZHRoLFcuaGVpZ2h0KSkpLHhlPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpO1kud2lkdGg9TWF0aC5yb3VuZChiZSp4ZSksWS5oZWlnaHQ9TWF0aC5yb3VuZChiZSp4ZSksWS5zdHlsZS53aWR0aD1gJHtiZX1weGAsWS5zdHlsZS5oZWlnaHQ9YCR7YmV9cHhgLGMuY3VycmVudD17dzpiZSxoOmJlfTtjb25zdCBvZT1ZLmdldENvbnRleHQoIjJkIik7b2UmJm9lLnNldFRyYW5zZm9ybSh4ZSwwLDAseGUsMCwwKX07amUoKSxXZT1uZXcgUmVzaXplT2JzZXJ2ZXIoamUpLFdlLm9ic2VydmUoU2UpfWNvbnN0IE5lPWplPT57Y29uc3QgVz1qZS5rZXkudG9Mb3dlckNhc2UoKTtpZihbImFycm93dXAiLCJhcnJvd2Rvd24iLCJhcnJvd2xlZnQiLCJhcnJvd3JpZ2h0IiwidyIsImEiLCJzIiwiZCJdLmluY2x1ZGVzKFcpKXtqZS5wcmV2ZW50RGVmYXVsdCgpLHAuY3VycmVudC5hZGQoVykseC5jdXJyZW50PT09ImlkbGUiJiZfKCk7cmV0dXJufWlmKFc9PT0iICIpe2lmKGplLnByZXZlbnREZWZhdWx0KCksIWplLnJlcGVhdCl7Y29uc3QgeGU9eC5jdXJyZW50O3hlPT09ImlkbGUifHx4ZT09PSJvdmVyIj9fKCk6eGU9PT0icGF1c2VkIiYmUigpfW0uY3VycmVudD0hMDtyZXR1cm59aWYoVz09PSJyIil7XygpO3JldHVybn1pZihXPT09InAifHxXPT09ImVzY2FwZSIpe2NvbnN0IHhlPXguY3VycmVudDt4ZT09PSJydW5uaW5nIj9rKCk6eGU9PT0icGF1c2VkIiYmUigpO3JldHVybn1pZihXPT09Im0iKXtVKCk7cmV0dXJufVc9PT0iMSImJkkoImNhZGV0IiksVz09PSIyIiYmSSgicGlsb3QiKSxXPT09IjMiJiZJKCJhY2UiKX0sQj1qZT0+e2NvbnN0IFc9amUua2V5LnRvTG93ZXJDYXNlKCk7cC5jdXJyZW50LmRlbGV0ZShXKSxXPT09IiAiJiYobS5jdXJyZW50PSExKX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleWRvd24iLE5lKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5dXAiLEIpO2NvbnN0IE89KCk9Pntkb2N1bWVudC5oaWRkZW4mJnguY3VycmVudD09PSJydW5uaW5nIiYmaygpfSxQZT0oKT0+e3guY3VycmVudD09PSJydW5uaW5nIiYmaygpLHAuY3VycmVudC5jbGVhcigpLG0uY3VycmVudD0hMX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLE8pLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJibHVyIixQZSksKCk9PntjYW5jZWxBbmltYXRpb25GcmFtZShGKSxQKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLE5lKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5dXAiLEIpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLE8pLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixQZSksV2UmJldlLmRpc2Nvbm5lY3QoKX19LFtJLFAsdGUsayxSLF8sVV0pLHtjYW52YXNSZWY6bix3cmFwUmVmOmEscGhhc2U6ZyxzY29yZTpiLHdhdmU6ZWUsa2lsbHM6JCxsaXZlczpkZSxwb3BLZXk6aGUsaXNOZXdCZXN0OlJlLGRpZmZpY3VsdHk6JGUsYmVzdHM6SGUsbXV0ZWQ6S2UsYWN0aW9uczp7c3RhcnQ6XyxwcmltYXJ5OmxlLHBhdXNlR2FtZTprLHJlc3VtZUdhbWU6UixjaGFuZ2VEaWZmaWN1bHR5OkksdG9nZ2xlTXV0ZTpVLG9uQ2FudmFzRG93bjpwZSxvbkNhbnZhc1VwOnEsc2V0RmlyZTptZSxkcGFkRG93bjpILGRwYWRVcDp2ZX19fWNvbnN0IGtmPVt7aWQ6ImNhZGV0IixsYWJlbDoiQ2FkZXQiLHRhZzoiUmVsYXhlZCBwYXRyb2wiLGRvdHM6MX0se2lkOiJwaWxvdCIsbGFiZWw6IlBpbG90Iix0YWc6IlN0YW5kYXJkIG9wcyIsZG90czoyfSx7aWQ6ImFjZSIsbGFiZWw6IkFjZSIsdGFnOiJObyBtZXJjeSIsZG90czozfV07ZnVuY3Rpb24gR3Aoe2NsYXNzTmFtZTpuPSJoLTggdy04In0pe3JldHVybiBzLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3MuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxNiIscjoiMTMiLHN0cm9rZToiIzYyZTZmZiIsc3Ryb2tlV2lkdGg6IjIiLG9wYWNpdHk6IjAuNyJ9KSxzLmpzeCgicGF0aCIse2Q6Ik0xNiAzdjVNMTYgMjR2NU0zIDE2aDVNMjQgMTZoNSIsc3Ryb2tlOiIjNjJlNmZmIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSkscy5qc3goInBhdGgiLHtkOiJNMTYgOWw2IDEzLjUtNi0zLjYtNiAzLjZ6IixmaWxsOiIjZmZkMTY2IixzdHJva2U6IiNmZmYzYzQiLHN0cm9rZVdpZHRoOiIxIixzdHJva2VMaW5lam9pbjoicm91bmQifSldfSl9ZnVuY3Rpb24gS3Aoe2NsYXNzTmFtZTpuPSJoLTMuNSB3LTMuNSJ9KXtyZXR1cm4gcy5qc3goInN2ZyIse3ZpZXdCb3g6IjAgMCAyNCAyNCIsZmlsbDoiY3VycmVudENvbG9yIixjbGFzc05hbWU6biwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpzLmpzeCgicGF0aCIse2Q6Ik0xMiAybDcgMTgtNy00LjVMNSAyMHoifSl9KX1mdW5jdGlvbiBLaSh7bGFiZWw6bix2YWx1ZTphLGFjY2VudDppPSExLHBvcDpjPTB9KXtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpufSkscy5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHtpPyJhbmltYXRlLXBvcCB0ZXh0LWFtYmVyZ2xvdy00MDAiOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmF9LGMpXX0pfWZ1bmN0aW9uIEJuKHtrZXlzTGlzdDpuLGFjdGlvbjphfSl7cmV0dXJuIHMuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjpufSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmF9KV19KX1mdW5jdGlvbiBTZih7b25Eb3duOm4sb25VcDphLGxhYmVsOmksY2hpbGRyZW46YyxjbGFzc05hbWU6aD0iIn0pe3JldHVybiBzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIiwiYXJpYS1sYWJlbCI6aSxjbGFzc05hbWU6YGZsZXggdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgJHtofWAsb25Qb2ludGVyRG93bjpwPT57cC5wcmV2ZW50RGVmYXVsdCgpLG4oKX0sb25Qb2ludGVyVXA6YSxvblBvaW50ZXJDYW5jZWw6YSxvblBvaW50ZXJMZWF2ZTphLG9uQ29udGV4dE1lbnU6cD0+cC5wcmV2ZW50RGVmYXVsdCgpLGNoaWxkcmVuOmN9KX1mdW5jdGlvbiBxcCh7Y2xhc3NOYW1lOm49ImgtNSB3LTUifSl7cmV0dXJuIHMuanN4KCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6Im5vbmUiLHN0cm9rZToiY3VycmVudENvbG9yIixzdHJva2VXaWR0aDoiMyIsc3Ryb2tlTGluZWNhcDoicm91bmQiLHN0cm9rZUxpbmVqb2luOiJyb3VuZCIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46cy5qc3goInBhdGgiLHtkOiJNNiAxNGw2LTYgNiA2In0pfSl9Y29uc3QgUXA9W3tpZDoiYXJyb3d1cCIsbGFiZWw6IlVwIixjZWxsOiJjb2wtc3RhcnQtMiByb3ctc3RhcnQtMSIscm90OiIifSx7aWQ6ImFycm93bGVmdCIsbGFiZWw6IkxlZnQiLGNlbGw6ImNvbC1zdGFydC0xIHJvdy1zdGFydC0yIixyb3Q6Ii1yb3RhdGUtOTAifSx7aWQ6ImFycm93ZG93biIsbGFiZWw6IkRvd24iLGNlbGw6ImNvbC1zdGFydC0yIHJvdy1zdGFydC0yIixyb3Q6InJvdGF0ZS0xODAifSx7aWQ6ImFycm93cmlnaHQiLGxhYmVsOiJSaWdodCIsY2VsbDoiY29sLXN0YXJ0LTMgcm93LXN0YXJ0LTIiLHJvdDoicm90YXRlLTkwIn1dO2Z1bmN0aW9uIFlwKHthY3Rpb25zOm59KXtyZXR1cm4gdHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXM/cy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDYwcHhdIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdyaWQtY29scy0zIGdyaWQtcm93cy0yIGdhcC0xLjUiLGNoaWxkcmVuOlFwLm1hcChpPT5zLmpzeChTZix7bGFiZWw6aS5sYWJlbCxjbGFzc05hbWU6YGJ0bi1hcmNhZGUgYnRuLWdob3N0IGgtMTIgdy0xNiAke2kuY2VsbH1gLG9uRG93bjooKT0+bi5kcGFkRG93bihpLmlkKSxvblVwOigpPT5uLmRwYWRVcChpLmlkKSxjaGlsZHJlbjpzLmpzeChxcCx7Y2xhc3NOYW1lOmBoLTUgdy01IHRleHQtbW9zcy0yMDAgJHtpLnJvdH1gfSl9LGkuaWQpKX0pLHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMS41IixjaGlsZHJlbjpbcy5qc3goU2Yse2xhYmVsOiJGaXJlIixjbGFzc05hbWU6ImgtWzEwOHB4XSB3LVsxMDhweF0gcm91bmRlZC1mdWxsIGJvcmRlci0yIGJvcmRlci1hcHBsZS00MDAvNzAgYm9yZGVyLWItNCBib3JkZXItYi1bIzdlMjMyN10gYmctYXBwbGUtNTAwLzI1IHRleHQtYXBwbGUtNDAwIHNoYWRvdy1bMF8wXzI4cHhfcmdiYSgyNTUsOTMsMTQzLDAuMjgpXSBhY3RpdmU6dHJhbnNsYXRlLXktMC41IixvbkRvd246KCk9Pm4uc2V0RmlyZSghMCksb25VcDooKT0+bi5zZXRGaXJlKCExKSxjaGlsZHJlbjpzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRyYWNraW5nLVswLjJlbV0iLGNoaWxkcmVuOiJGSVJFIn0pfSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWzEwcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJob2xkIHRvIGF1dG8tZmlyZSJ9KV19KV19KTpudWxsfWZ1bmN0aW9uIFhwKCl7Y29uc3Qgbj1WcCgpLHthY3Rpb25zOmEscGhhc2U6aX09bixjPWk9PT0icnVubmluZyI7cmV0dXJuIHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLXJpc2UiLGNoaWxkcmVuOltzLmpzeHMoImhlYWRlciIse2NsYXNzTmFtZToibWItNCBmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQganVzdGlmeS1iZXR3ZWVuIGdhcC0zIixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBnYXAtMiBzbTpnYXAtMyIsY2hpbGRyZW46W3MuanN4KEtpLHtsYWJlbDoiU2NvcmUiLHZhbHVlOm4uc2NvcmUsYWNjZW50OiEwLHBvcDpuLnBvcEtleX0pLHMuanN4KEtpLHtsYWJlbDoiV2F2ZSIsdmFsdWU6cy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM2MmU2ZmZdIFt0ZXh0LXNoYWRvdzowXzBfMTJweF9yZ2JhKDk4LDIzMCwyNTUsMC40NSldIixjaGlsZHJlbjpuLndhdmV9KX0pLHMuanN4KEtpLHtsYWJlbDoiS2lsbHMiLHZhbHVlOm4ua2lsbHN9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJMaXZlcyJ9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBwdC0xIHRleHQtWyM2MmU2ZmZdIixjaGlsZHJlbjpBcnJheS5mcm9tKHtsZW5ndGg6M30sKGgscCk9PnMuanN4KEtwLHtjbGFzc05hbWU6YGgtMy41IHctMy41ICR7cDxuLmxpdmVzPyIiOiJvcGFjaXR5LTIwIGdyYXlzY2FsZSJ9YH0scCkpfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpjPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmM/YS5wYXVzZUdhbWU6YS5yZXN1bWVHYW1lLGRpc2FibGVkOiFjJiZpIT09InBhdXNlZCIsY2hpbGRyZW46Yz9zLmpzeCh4bix7fSk6cy5qc3goUWUse30pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeChpdCx7fSl9KSxzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6bi5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazphLnRvZ2dsZU11dGUsY2hpbGRyZW46bi5tdXRlZD9zLmpzeChQbCx7fSk6cy5qc3goRWwse30pfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtyZWY6bi53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbcy5qc3goImNhbnZhcyIse3JlZjpuLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1jcm9zc2hhaXIiLG9uUG9pbnRlckRvd246YS5vbkNhbnZhc0Rvd24sb25Qb2ludGVyVXA6YS5vbkNhbnZhc1VwLG9uUG9pbnRlckNhbmNlbDphLm9uQ2FudmFzVXAsb25Db250ZXh0TWVudTpoPT5oLnByZXZlbnREZWZhdWx0KCl9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTIgei0yMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46WyJsZWZ0LTAgdG9wLTAgYm9yZGVyLWwtMiBib3JkZXItdC0yIiwicmlnaHQtMCB0b3AtMCBib3JkZXItci0yIGJvcmRlci10LTIiLCJsZWZ0LTAgYm90dG9tLTAgYm9yZGVyLWwtMiBib3JkZXItYi0yIiwicmlnaHQtMCBib3R0b20tMCBib3JkZXItci0yIGJvcmRlci1iLTIiXS5tYXAoaD0+cy5qc3goInNwYW4iLHtjbGFzc05hbWU6YGFic29sdXRlIGgtNCB3LTQgYm9yZGVyLVsjNjJlNmZmXS80MCAke2h9YH0saCkpfSksaT09PSJpZGxlIiYmcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNSBiZy1bIzA1MGExNF0vODAgcC02IHRleHQtY2VudGVyIGJhY2tkcm9wLWJsdXItWzJweF0iLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltzLmpzeChHcCx7Y2xhc3NOYW1lOiJoLTEyIHctMTIifSkscy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jeWFuIGZvbnQtZGlzcGxheSB0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCIsY2hpbGRyZW46IlZFQ1RPUiBTVFJJS0UifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0yIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LVsjOWZjM2Q5XSIsY2hpbGRyZW46IldBVkUgREVGRU5TRSBCTEFTVEVSIn0pXX0pXX0pLHMuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEuc3RhcnQsY2hpbGRyZW46cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KFFlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBMYXVuY2ggTWlzc2lvbiJdfSl9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIE9SIEhJVCBMQVVOQ0gifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJoaWRkZW4gaXRlbXMtY2VudGVyIGdhcC0xIHNtOmZsZXgiLGNoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiV0FTRCJ9KSwiIG1vdmUiXX0pLHMuanN4cygic3BhbiIse2NsYXNzTmFtZToiaGlkZGVuIGl0ZW1zLWNlbnRlciBnYXAtMSBzbTpmbGV4IixjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlNwYWNlIn0pLCIgaG9sZCB0byBmaXJlIl19KSxzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTEgc206ZmxleCIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJDbGljayJ9KSwiIHNob290Il19KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToic206aGlkZGVuIixjaGlsZHJlbjoiRC1wYWQgbW92ZXMgwrcgRklSRSBzaG9vdHMifSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtcGl0LTUwMCIsY2hpbGRyZW46IuKAoiJ9KSxzLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlAifSksIiBwYXVzZSJdfSldfSksbi5pc05ld0Jlc3QmJnMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KV19KSxpPT09InBhdXNlZCImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNTBhMTRdLzgwIHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jeWFuIGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiU1lTVEVNUyBIQUxURUQifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3MuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEucmVzdW1lR2FtZSxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxzLmpzeChZZSx7b25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlAifSksIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHMuanN4KEcse2NoaWxkcmVuOiJFc2MifSksIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJtbC0xIixjaGlsZHJlbjoicmVzdW1lcyJ9KV19KV19KSxpPT09Im92ZXIiJiZzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMDUwYTE0XS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1hcHBsZS00MDAgW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDEwNywxMDcsMC41KV0gc206dGV4dC0yeGwiLGNoaWxkcmVuOiJTSElQIERFU1RST1lFRCJ9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46bi5zY29yZX0pXX0pLHMuanN4cygiZGl2Iix7Y2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpuLmJlc3RzW24uZGlmZmljdWx0eV19KV19KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjOWZjM2Q5XSIsY2hpbGRyZW46WyJXQVZFICIsbi53YXZlLCIgwrcgIixuLmtpbGxzLCIgS0lMTFMiXX0pLG4uaXNOZXdCZXN0JiZzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSkscy5qc3goWWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goaXQse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIEZseSBBZ2FpbiJdfSl9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSkscy5qc3goWXAse2FjdGlvbnM6bi5hY3Rpb25zfSkscy5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmk9PT0icnVubmluZyI/cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeCh4bix7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUGF1c2UiXX0pOmk9PT0icGF1c2VkIj9zLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KFFlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pOmk9PT0ib3ZlciI/cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgRmx5IEFnYWluIl19KTpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KFFlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBMYXVuY2ggTWlzc2lvbiJdfSl9KX0pfSldfSkscy5qc3hzKCJhc2lkZSIse2NsYXNzTmFtZToiZ3JpZCBjb250ZW50LXN0YXJ0IGdhcC00IixjaGlsZHJlbjpbcy5qc3hzKFF0LHt0aXRsZToiTWlzc2lvbiBJbnRlbCIsY2hpbGRyZW46W3MuanN4cygidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3MuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3MuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiaC0yLjUgdy0yLjUgcm91bmRlZC1mdWxsIGJnLWFwcGxlLTQwMCBzaGFkb3ctWzBfMF84cHhfcmdiYSgyNTUsMTA3LDEwNywwLjgpXSJ9KSwiR3J1bnQiXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiMTAwIHB0cyJ9KV19KSxzLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdGF0ZS00NSBiZy1bI2MwODRmY10gc2hhZG93LVswXzBfOHB4X3JnYmEoMTkyLDEzMiwyNTIsMC44KV0ifSksIldlYXZlciDigJQgYWltcyBhdCB5b3UiXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0YWJ1bGFyLW51bXMgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiMjUwIHB0cyJ9KV19KSxzLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdW5kZWQtc20gYmctWyNmZjhjNDJdIHNoYWRvdy1bMF8wXzhweF9yZ2JhKDI1NSwxNDAsNjYsMC44KV0ifSksIlRhbmsg4oCUIHNwcmVhZCBzaG90Il19KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGFidWxhci1udW1zIHRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46IjUwMCBwdHMifSldfSldfSkscy5qc3hzKCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46WyJDYXBzdWxlcyBkcm9wIGZyb20gd3JlY2thZ2U6ICIscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtYW1iZXJnbG93LTMwMCIsY2hpbGRyZW46IlQifSksInJpcGxlLCIsIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjN2VmMGEwXSIsY2hpbGRyZW46IlIifSksImFwaWQsICIscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWyM2MmU2ZmZdIixjaGlsZHJlbjoiUyJ9KSwiaGllbGQuIENsZWFyIGEgd2F2ZSBmb3IgYSBib251cy4iXX0pXX0pLHMuanN4KExsLHt0aXRsZToiVGhyZWF0IExldmVsIixvcHRpb25zOmtmLHZhbHVlOm4uZGlmZmljdWx0eSxvbkNoYW5nZTphLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6aT09PSJydW5uaW5nInx8aT09PSJyZWFkeSJ8fGk9PT0icGF1c2VkIn0pLHMuanN4KF9sLHtiZXN0czpuLmJlc3RzLG9wdGlvbnM6a2YsYWN0aXZlOm4uZGlmZmljdWx0eX0pLHMuanN4cyhRdCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbcy5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbcy5qc3goQm4se2tleXNMaXN0OnMuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IldBU0QifSkscy5qc3goRyx7Y2hpbGRyZW46IuKGkOKGkeKGk+KGkiJ9KV19KSxhY3Rpb246IkZseSJ9KSxzLmpzeChCbix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46IkhvbGQgU3BhY2UifSksYWN0aW9uOiJGaXJlIGNhbm5vbnMifSkscy5qc3goQm4se2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJDbGljayJ9KSxhY3Rpb246IlNpbmdsZSBzaG90In0pLHMuanN4KEJuLHtrZXlzTGlzdDpzLmpzeChHLHtjaGlsZHJlbjoiSG9sZCBtb3VzZSJ9KSxhY3Rpb246IkNvbnRpbnVvdXMgZmlyZSJ9KSxzLmpzeChCbix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiUCJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiRXNjIn0pXX0pLGFjdGlvbjoiUGF1c2UifSkscy5qc3goQm4se2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJSIn0pLGFjdGlvbjoiUmVzdGFydCJ9KSxzLmpzeChCbix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiMSJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMiJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMyJ9KV19KSxhY3Rpb246IlRocmVhdCBsZXZlbCJ9KSxzLmpzeChCbix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxzLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJGbGlnaHQgaXMga2V5Ym9hcmQtb25seSAoV0FTRCAvIGFycm93cykg4oCUIG9uIHRvdWNoIHNjcmVlbnMsIHVzZSB0aGUgb24tc2NyZWVuIEQtcGFkIGFuZCB0aGUgRklSRSBidXR0b24uIFRoZSBzaGlwIG5ldmVyIGNoYXNlcyB0aGUgcG9pbnRlci4ifSldfSldfSldfSldfSl9Y29uc3Qgd2w9e3Jvb2tpZTp7bGFiZWw6IlJPT0tJRSIsdGFnOiJ3aWRlIHBhZGRsZSwgZ2VudGxlIHBhY2UiLGRvdHM6MSxiYWxsU3BlZWQ6MzAwLHBhZGRsZVJhdGlvOi4yNCxsaXZlczozLGRyb3BSYXRlOi4yNixzcGVlZFJhbXA6LjA1fSxwcm86e2xhYmVsOiJQUk8iLHRhZzoidGhlIGludGVuZGVkIHJpb3QiLGRvdHM6MixiYWxsU3BlZWQ6MzYwLHBhZGRsZVJhdGlvOi4xOSxsaXZlczozLGRyb3BSYXRlOi4xNixzcGVlZFJhbXA6LjA2NX0scmlvdDp7bGFiZWw6IlJJT1QiLHRhZzoiZmFzdCBiYWxsLCB0aGluIHBhZGRsZSIsZG90czozLGJhbGxTcGVlZDo0MTUscGFkZGxlUmF0aW86LjE1LGxpdmVzOjIsZHJvcFJhdGU6LjExLHNwZWVkUmFtcDouMDh9fSxacD1NYXRoLlBJKjIsU2w9KG4sYSk9Pm4rTWF0aC5yYW5kb20oKSooYS1uKSxBcj0obixhLGkpPT5NYXRoLm1heChhLE1hdGgubWluKGksbikpLEpwPW49Pm5bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKm4ubGVuZ3RoKV0scWk9MTAsZWg9NixqZj0xNCxRaT02LHRoPTU4LGJmPTIyLE5mPTE0LEV0PTcsbmg9ODtmdW5jdGlvbiBybihuKXtyZXR1cm4gbi5oLTQyfWZ1bmN0aW9uIFpmKG4pe24uYnJpY2tzPVtdO2NvbnN0IGE9KG4udy1qZioyLShxaS0xKSpRaSkvcWksaT1uLmxldmVsO2ZvcihsZXQgYz0wO2M8ZWg7YysrKWZvcihsZXQgaD0wO2g8cWk7aCsrKXtsZXQgcD0xO2NvbnN0IG09TWF0aC5yYW5kb20oKSxmPWk+PTM/TWF0aC5taW4oLjMsKGktMikqLjA2KTowLGc9TWF0aC5taW4oLjUsLjA4K2kqLjA3KTttPGY/cD0zOm08ZitnJiYocD0yKSxuLmJyaWNrcy5wdXNoKHt4OmpmK2gqKGErUWkpLHk6dGgrYyooYmYrUWkpLHc6YSxoOmJmLGhwOnAsbWF4SHA6cCxmbGFzaDowfSl9fWZ1bmN0aW9uIHVvKG4pe3JldHVybnt4Om4ucGFkZGxlLngseTpybihuKS1FdC0yLHZ4OjAsdnk6MCxzdHVjazohMH19ZnVuY3Rpb24gQ2Yobj02MDAsYT02MDAsaSl7Y29uc3QgYz1uKmkucGFkZGxlUmF0aW8saD17dzpuLGg6YSx0aW1lOjAsbGFzdDowLHBhZGRsZTp7eDpuLzIsdzpjLGJhc2VXOmMsdGFyZ2V0WDpuLzIscG9pbnRlcjohMSxreDowfSxiYWxsczpbXSxicmlja3M6W10sY2Fwc3VsZXM6W10scGFydGljbGVzOltdLGZsb2F0ZXJzOltdLGxpdmVzOmkubGl2ZXMsc2NvcmU6MCxsZXZlbDoxLGNvbWJvOjAsd2lkZVQ6MCxzbG93VDowLHNlcnZlVDoxZTMsc2hha2U6MCxoaXRGbGFzaDowLGRpZWRBdDowLHBhZGRsZUhpdHM6MCx3YWxsSGl0czowLGJyaWNrQnJlYWtzOjAsYnJpY2tEZW50czowLHBvd2VyczowLGxldmVsQ2xlYXJzOjAsbGlmZUxvc3Q6MCxsYXVuY2hlczowfTtyZXR1cm4gWmYoaCksaC5iYWxscy5wdXNoKHVvKGgpKSxofWZ1bmN0aW9uIGNvKG4sYSl7Y29uc3QgaT0xKyhuLmxldmVsLTEpKmEuc3BlZWRSYW1wO2xldCBjPWEuYmFsbFNwZWVkKmk7cmV0dXJuIG4uc2xvd1Q+MCYmKGMqPS42KSxNYXRoLm1pbihjLGEuYmFsbFNwZWVkKjEuOSl9ZnVuY3Rpb24gRHIobixhLGksYyxoPTEyLHA9MSl7Y29uc3QgbT1NYXRoLm1pbigyMjAsbi5wYXJ0aWNsZXMubGVuZ3RoK2gpO2ZvcihsZXQgZj1uLnBhcnRpY2xlcy5sZW5ndGg7ZjxtO2YrKyl7Y29uc3QgZz1TbCgwLFpwKSx2PVNsKDMwLDIyMCkqcCx4PVNsKDI4MCw2NTApO24ucGFydGljbGVzLnB1c2goe3g6YSx5Omksdng6TWF0aC5jb3MoZykqdix2eTpNYXRoLnNpbihnKSp2LGxpZmU6eCxtYXhMaWZlOngsc2l6ZTpTbCgxLjUsMy40KSpwLGNvbG9yOkpwKGMpLGRyYWc6Mi4yLGdyYXY6MzB9KX19ZnVuY3Rpb24gcmgobil7cmV0dXJuIE1hdGgubWluKDYsMStuKi41KX1mdW5jdGlvbiBKZihuLGEsaSl7bi5zdHVjaz0hMTtjb25zdCBjPVNsKC0uMzUsLjM1KSxoPWNvKGEsaSk7bi52eD1NYXRoLnNpbihjKSpoLG4udnk9LU1hdGguY29zKGMpKmgsYS5sYXVuY2hlcysrfWZ1bmN0aW9uIGxoKG4sYSl7Y29uc3QgaT1bXTtmb3IoY29uc3QgYyBvZiBuLmJhbGxzKXtpZihjLnN0dWNrKWNvbnRpbnVlO2NvbnN0IGg9TWF0aC5hdGFuMihjLnZ5LGMudngpLHA9Y28obixhKTtmb3IoY29uc3QgbSBvZlstLjUsLjVdKXtpZihuLmJhbGxzLmxlbmd0aCtpLmxlbmd0aD49bmgpYnJlYWs7aS5wdXNoKHt4OmMueCx5OmMueSx2eDpNYXRoLmNvcyhoK20pKnAsdnk6TWF0aC5zaW4oaCttKSpwLHN0dWNrOiExfSl9fW4uYmFsbHMucHVzaCguLi5pKX1mdW5jdGlvbiBzaChuLGEsaSl7bi5wb3dlcnMrKztjb25zdCBjPW4ucGFkZGxlO2xldCBoPSIiLHA9IiNmZmUwOGEiO2E9PT0id2lkZSI/KG4ud2lkZVQ9MWU0LGg9IldJREUgUEFERExFIixwPSIjOGVmMDVhIik6YT09PSJtdWx0aSI/KGxoKG4saSksaD0iTVVMVElCQUxMIixwPSIjNjJlNmZmIik6KG4uc2xvd1Q9OGUzLGg9IlNMT1ctTU8iLHA9IiNjMDg0ZmMiKSxuLmZsb2F0ZXJzLnB1c2goe3g6Yy54LHk6cm4obiktMjYsdHh0OmgsbGlmZToxZTMsbWF4TGlmZToxZTMsY29sb3I6cH0pLERyKG4sYy54LHJuKG4pLFtwLCIjZmZmZmZmIl0sMTAsLjcpfWZ1bmN0aW9uIGFoKG4sYSxpKXtjb25zdCBjPW4uYnJpY2tzW2FdO24uYnJpY2tzLnNwbGljZShhLDEpLG4uY29tYm8rKyxuLmJyaWNrQnJlYWtzKys7Y29uc3QgaD00MCsoYy5tYXhIcC0xKSozMCxwPU1hdGgucm91bmQoaCpyaChuLmNvbWJvKSk7bi5zY29yZSs9cDtjb25zdCBtPWMubWF4SHA9PT0xP1siIzhlZjA1YSIsIiNhY2Y2NjQiLCIjZmZmZmZmIl06Yy5tYXhIcD09PTI/WyIjZmZjODU3IiwiI2ZmZTA4YSIsIiNmZmZmZmYiXTpbIiNmZjVkOGYiLCIjZmY4ZmIzIiwiI2ZmZDE2NiJdO2lmKERyKG4sYy54K2Mudy8yLGMueStjLmgvMixtLDEyLDEpLG4uc2hha2U9TWF0aC5tYXgobi5zaGFrZSwyKSxuLmZsb2F0ZXJzLnB1c2goe3g6Yy54K2Mudy8yLHk6Yy55KzYsdHh0OmArJHtwfWAsbGlmZTo3MDAsbWF4TGlmZTo3MDAsY29sb3I6IiNmZmUwOGEifSksTWF0aC5yYW5kb20oKTxpLmRyb3BSYXRlKXtjb25zdCBmPU1hdGgucmFuZG9tKCksZz1mPC40PyJ3aWRlIjpmPC43NT8ibXVsdGkiOiJzbG93IjtuLmNhcHN1bGVzLnB1c2goe2tpbmQ6Zyx4OmMueCtjLncvMix5OmMueStjLmgvMix0OjB9KX19ZnVuY3Rpb24gaWgobixhLGkpe24ubGl2ZXMtLSxuLmNvbWJvPTAsbi5saWZlTG9zdCsrLG4uc2hha2U9MTMsbi5oaXRGbGFzaD0uNDUsbi5saXZlczw9MD8obi5kaWVkQXQ9YSxEcihuLG4ucGFkZGxlLngscm4obiksWyIjZmY1ZDhmIiwiI2ZmZDE2NiIsIiNmZmZmZmYiXSwzNCwxLjQpKToobi53aWRlVD0wLG4uc2xvd1Q9MCxuLnBhZGRsZS53PW4ucGFkZGxlLmJhc2VXLG4uYmFsbHM9W3VvKG4pXSxuLnNlcnZlVD0xZTMsRHIobixuLnBhZGRsZS54LHJuKG4pLFsiI2ZmNWQ4ZiIsIiNmZmZmZmYiXSwxNiwxKSl9ZnVuY3Rpb24gb2gobixhLGksYyxoLHAsbSl7Y29uc3QgZj1BcihuLGMsYytwKSxnPUFyKGEsaCxoK20pLHY9bi1mLHg9YS1nO3JldHVybiB2KnYreCp4PD1pKml9ZnVuY3Rpb24gdWgobixhLGksYyxoKXtjb25zdCBwPWEvMWUzO24udGltZSs9YSxuLnNoYWtlPU1hdGgubWF4KDAsbi5zaGFrZS1hKi4wNDUpLG4uaGl0Rmxhc2g9TWF0aC5tYXgoMCxuLmhpdEZsYXNoLWEqLjAwMTYpLG4ud2lkZVQ9TWF0aC5tYXgoMCxuLndpZGVULWEpLG4uc2xvd1Q9TWF0aC5tYXgoMCxuLnNsb3dULWEpO2NvbnN0IG09bi5wYWRkbGU7bS53PW0uYmFzZVcqKG4ud2lkZVQ+MD8xLjU6MSk7Zm9yKGxldCBnPW4ucGFydGljbGVzLmxlbmd0aC0xO2c+PTA7Zy0tKXtjb25zdCB2PW4ucGFydGljbGVzW2ddO2lmKHYubGlmZS09YSx2LmxpZmU8PTApe2NvbnN0IHg9bi5wYXJ0aWNsZXMucG9wKCk7eCYmZzxuLnBhcnRpY2xlcy5sZW5ndGgmJihuLnBhcnRpY2xlc1tnXT14KTtjb250aW51ZX12LnZ4LT12LnZ4KnYuZHJhZypwLHYudnkrPXYuZ3JhdipwLXYudnkqdi5kcmFnKnAsdi54Kz12LnZ4KnAsdi55Kz12LnZ5KnB9Zm9yKGxldCBnPW4uZmxvYXRlcnMubGVuZ3RoLTE7Zz49MDtnLS0pbi5mbG9hdGVyc1tnXS5saWZlLT1hLG4uZmxvYXRlcnNbZ10ubGlmZTw9MCYmbi5mbG9hdGVycy5zcGxpY2UoZywxKTtmb3IoY29uc3QgZyBvZiBuLmJyaWNrcylnLmZsYXNoPU1hdGgubWF4KDAsZy5mbGFzaC1hKTtpZihtLmt4IT09MD9tLngrPW0ua3gqNTIwKnA6bS5wb2ludGVyJiYobS54Kz0obS50YXJnZXRYLW0ueCkqTWF0aC5taW4oMSxhKi4wMikpLG0ueD1BcihtLngsbS53LzIsbi53LW0udy8yKSwhaClyZXR1cm47aWYobi5kaWVkQXQ9PT0wKXtjb25zdCBnPW4uYmFsbHMuZmluZCh2PT52LnN0dWNrKTtnJiYoZy54PW0ueCxnLnk9cm4obiktRXQtMixuLnNlcnZlVC09YSxuLnNlcnZlVDw9MCYmSmYoZyxuLGMpKX1mb3IobGV0IGc9bi5jYXBzdWxlcy5sZW5ndGgtMTtnPj0wO2ctLSl7Y29uc3Qgdj1uLmNhcHN1bGVzW2ddO2lmKHYudCs9YSx2LnkrPTk1KnAsdi55Pm4uaCsyMCl7bi5jYXBzdWxlcy5zcGxpY2UoZywxKTtjb250aW51ZX1uLmRpZWRBdD09PTAmJnYueSs5Pj1ybihuKSYmdi55LTk8PXJuKG4pK05mJiZNYXRoLmFicyh2LngtbS54KTw9bS53LzIrMTAmJihuLmNhcHN1bGVzLnNwbGljZShnLDEpLHNoKG4sdi5raW5kLGMpKX1jb25zdCBmPWNvKG4sYyk7Zm9yKGxldCBnPW4uYmFsbHMubGVuZ3RoLTE7Zz49MDtnLS0pe2NvbnN0IHY9bi5iYWxsc1tnXTtpZih2LnN0dWNrKWNvbnRpbnVlO2NvbnN0IHg9TWF0aC5oeXBvdCh2LnZ4LHYudnkpfHwxO3Yudng9di52eC94KmYsdi52eT12LnZ5L3gqZjtjb25zdCBiPWYqLjI4O2lmKE1hdGguYWJzKHYudnkpPGIpe2NvbnN0IGdlPXYudnk9PT0wPy0xOk1hdGguc2lnbih2LnZ5KSxkZT1NYXRoLnNxcnQoTWF0aC5tYXgoMCxmKmYtYipiKSk7di52eT1nZSpiLHYudng9TWF0aC5zaWduKHYudnh8fDEpKmRlfWNvbnN0IFQ9ZipwLEE9TWF0aC5tYXgoMSxNYXRoLmNlaWwoVC82KSksZWU9di52eCpwL0EscmU9di52eSpwL0E7bGV0ICQ9ITE7Zm9yKGxldCBnZT0wO2dlPEEmJiEkO2dlKyspe2lmKHYueCs9ZWUsdi55Kz1yZSx2Lng8RXQ/KHYueD1FdCx2LnZ4PU1hdGguYWJzKHYudngpLG4ud2FsbEhpdHMrKyk6di54Pm4udy1FdCYmKHYueD1uLnctRXQsdi52eD0tTWF0aC5hYnModi52eCksbi53YWxsSGl0cysrKSx2Lnk8RXQmJih2Lnk9RXQsdi52eT1NYXRoLmFicyh2LnZ5KSxuLndhbGxIaXRzKyspLHYueT5uLmgrRXQrNCl7bi5iYWxscy5zcGxpY2UoZywxKSwkPSEwO2JyZWFrfWNvbnN0IGRlPXJuKG4pO2lmKHYudnk+MCYmdi55K0V0Pj1kZSYmdi55LUV0PD1kZStOZiYmTWF0aC5hYnModi54LW0ueCk8PW0udy8yK0V0KXtjb25zdCBoZT1Bcigodi54LW0ueCkvKG0udy8yKSwtMSwxKSoxLjA1O3Yudng9TWF0aC5zaW4oaGUpKmYsdi52eT0tTWF0aC5jb3MoaGUpKmYsdi55PWRlLUV0LS41LG4ucGFkZGxlSGl0cysrLG4uY29tYm89MCxEcihuLHYueCxkZSxbIiM4ZWYwNWEiLCIjZmZmZmZmIl0sNSwuNSl9Zm9yKGxldCBhZT1uLmJyaWNrcy5sZW5ndGgtMTthZT49MDthZS0tKXtjb25zdCBoZT1uLmJyaWNrc1thZV07aWYob2godi54LHYueSxFdCxoZS54LGhlLnksaGUudyxoZS5oKSl7Y29uc3QgWGU9QXIodi54LGhlLngsaGUueCtoZS53KSxSZT1Bcih2LnksaGUueSxoZS55K2hlLmgpLEVlPXYueC1YZSwkZT12LnktUmU7TWF0aC5hYnMoRWUpPk1hdGguYWJzKCRlKT92LnZ4PUVlPjA/TWF0aC5hYnModi52eCk6LU1hdGguYWJzKHYudngpOnYudnk9JGU+MD9NYXRoLmFicyh2LnZ5KTotTWF0aC5hYnModi52eSksaGUuaHAtLSxoZS5mbGFzaD05MCxoZS5ocDw9MD9haChuLGFlLGMpOihuLmJyaWNrRGVudHMrKyxEcihuLHYueCx2LnksWyIjZmZlMDhhIiwiI2ZmZmZmZiJdLDMsLjQpKTticmVha319fX1pZihuLmJhbGxzLmxlbmd0aD09PTAmJm4uZGllZEF0PT09MCYmaWgobixpKSxuLmJyaWNrcy5sZW5ndGg9PT0wJiZuLmRpZWRBdD09PTApe24ubGV2ZWwrKyxuLmxldmVsQ2xlYXJzKys7Y29uc3QgZz0yMDArKG4ubGV2ZWwtMSkqMTAwO24uc2NvcmUrPWcsbi5mbG9hdGVycy5wdXNoKHt4Om4udy8yLHk6bi5oKi40LHR4dDpgV0FMTCBDTEVBUiAgKyR7Z31gLGxpZmU6MTYwMCxtYXhMaWZlOjE2MDAsY29sb3I6IiNmZmUwOGEifSksWmYobiksbi5iYWxscz1bdW8obildLG4uc2VydmVUPTExMDAsbi5jYXBzdWxlcz1bXSxuLmNvbWJvPTB9fWZ1bmN0aW9uIGNoKG4sYSl7Y29uc3QgaT1uLmJhbGxzLmZpbmQoYz0+Yy5zdHVjayk7aSYmSmYoaSxuLGEpfWNvbnN0IEdzPSciUHJlc3MgU3RhcnQgMlAiLCAiQ291cmllciBOZXciLCBtb25vc3BhY2UnLE1mPXsxOntmaWxsOiIjM2U5ZDMzIixlZGdlOiIjOGVmMDVhIixnbG93OiJyZ2JhKDE0MiwyNDAsOTAsMC41NSkifSwyOntmaWxsOiIjYjU3YTFlIixlZGdlOiIjZmZjODU3IixnbG93OiJyZ2JhKDI1NSwyMDAsODcsMC41NSkifSwzOntmaWxsOiIjYTgzYTU1IixlZGdlOiIjZmY1ZDhmIixnbG93OiJyZ2JhKDI1NSw5MywxNDMsMC41NSkifX0sZmg9e3dpZGU6e2JnOiIjOGVmMDVhIixmZzoiIzBjMWQxMyIsbGV0dGVyOiJXIn0sbXVsdGk6e2JnOiIjNjJlNmZmIixmZzoiIzA1MjUzMCIsbGV0dGVyOiJNIn0sc2xvdzp7Ymc6IiNjMDg0ZmMiLGZnOiIjMjQxMDMzIixsZXR0ZXI6IlMifX07ZnVuY3Rpb24gUHIobixhLGksYyxoLHApe2NvbnN0IG09TWF0aC5taW4ocCxjLzIsaC8yKTtuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKGErbSxpKSxuLmFyY1RvKGErYyxpLGErYyxpK2gsbSksbi5hcmNUbyhhK2MsaStoLGEsaStoLG0pLG4uYXJjVG8oYSxpK2gsYSxpLG0pLG4uYXJjVG8oYSxpLGErYyxpLG0pLG4uY2xvc2VQYXRoKCl9ZnVuY3Rpb24gZGgobixhKXtjb25zdCBpPWEudGltZS8xZTM7bi5zYXZlKCk7Zm9yKGxldCBjPTA7YzwyMjtjKyspe2NvbnN0IGg9KChjKjk3LjMrTWF0aC5zaW4oaSouMytjKSo0MCklYS53K2EudyklYS53LHA9KChjKjUzLjcraSooMTArYyU1KjYpKSVhLmgrYS5oKSVhLmgsbT0uMDUrLjA1Kk1hdGguc2luKGkqMitjKjEuNyk7bi5maWxsU3R5bGU9YHJnYmEoMTcyLDI0NiwxMDAsJHtNYXRoLm1heCguMDIsbSl9KWAsbi5iZWdpblBhdGgoKSxuLmFyYyhoLHAsYyU0PT09MD8xLjY6MSwwLE1hdGguUEkqMiksbi5maWxsKCl9bi5yZXN0b3JlKCl9ZnVuY3Rpb24gcGgobixhKXtuLnNhdmUoKSxuLnN0cm9rZVN0eWxlPSJyZ2JhKDE0MCwyMDAsMTYwLDAuMDQ1KSIsbi5saW5lV2lkdGg9MTtjb25zdCBpPTM0O2ZvcihsZXQgYz1pO2M8YS53O2MrPWkpbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhjLDApLG4ubGluZVRvKGMsYS5oKSxuLnN0cm9rZSgpO2ZvcihsZXQgYz1pO2M8YS5oO2MrPWkpbi5iZWdpblBhdGgoKSxuLm1vdmVUbygwLGMpLG4ubGluZVRvKGEudyxjKSxuLnN0cm9rZSgpO24ucmVzdG9yZSgpfWZ1bmN0aW9uIGhoKG4sYSxpLGMsaCl7Y29uc3QgcD1uLmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsMCwwLGMpO3AuYWRkQ29sb3JTdG9wKDAsIiMwZDIwMTIiKSxwLmFkZENvbG9yU3RvcCguNSwiIzBhMTgxMCIpLHAuYWRkQ29sb3JTdG9wKDEsIiMwNjBmMGEiKSxuLmZpbGxTdHlsZT1wLG4uZmlsbFJlY3QoMCwwLGksYykscGgobixhKSxkaChuLGEpLG4uc2F2ZSgpLGEuc2hha2U+LjImJm4udHJhbnNsYXRlKChNYXRoLnJhbmRvbSgpLS41KSphLnNoYWtlLChNYXRoLnJhbmRvbSgpLS41KSphLnNoYWtlKTtmb3IoY29uc3QgeCBvZiBhLmJyaWNrcyl7Y29uc3QgYj1NZlt4Lm1heEhwXT8/TWZbMV0sVD14LmhwPHgubWF4SHA7bi5zYXZlKCksbi5zaGFkb3dDb2xvcj1iLmdsb3csbi5zaGFkb3dCbHVyPTksbi5maWxsU3R5bGU9VD9taChiLmZpbGwpOmIuZmlsbCxQcihuLHgueCx4LnkseC53LHguaCw0KSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLnN0cm9rZVN0eWxlPWIuZWRnZSxuLmxpbmVXaWR0aD0xLjUsbi5zdHJva2UoKSxuLmZpbGxTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEyKSIsUHIobix4LngrMix4LnkrMix4LnctNCw1LDIuNSksbi5maWxsKCkseC5mbGFzaD4wJiYobi5maWxsU3R5bGU9YHJnYmEoMjU1LDI1NSwyNTUsJHt4LmZsYXNoLzkwKi44fSlgLFByKG4seC54LHgueSx4LncseC5oLDQpLG4uZmlsbCgpKSxuLnJlc3RvcmUoKX1mb3IoY29uc3QgeCBvZiBhLmNhcHN1bGVzKXtjb25zdCBiPWZoW3gua2luZF0sVD1NYXRoLnNpbih4LnQvMTIwKSoyO24uc2F2ZSgpLG4uc2hhZG93Q29sb3I9Yi5iZyxuLnNoYWRvd0JsdXI9MTIsbi5maWxsU3R5bGU9Yi5iZyxQcihuLHgueC0xMSx4LnktOStULDIyLDE4LDkpLG4uZmlsbCgpLG4uc2hhZG93Qmx1cj0wLG4uZmlsbFN0eWxlPWIuZmcsbi5mb250PWAxMHB4ICR7R3N9YCxuLnRleHRBbGlnbj0iY2VudGVyIixuLnRleHRCYXNlbGluZT0ibWlkZGxlIixuLmZpbGxUZXh0KGIubGV0dGVyLHgueCx4LnkrMStUKSxuLnJlc3RvcmUoKX1jb25zdCBtPXJuKGEpO24uc2F2ZSgpO2NvbnN0IGY9YS5wYWRkbGUudyxnPWEud2lkZVQ+MDtuLnNoYWRvd0NvbG9yPWc/InJnYmEoMTQyLDI0MCw5MCwwLjkpIjoicmdiYSgyNTUsMjAwLDg3LDAuNykiLG4uc2hhZG93Qmx1cj0xNixuLmZpbGxTdHlsZT1nPyIjOGVmMDVhIjoiI2ZmYzg1NyIsUHIobixhLnBhZGRsZS54LWYvMixtLGYsMTQsNyksbi5maWxsKCksbi5zaGFkb3dCbHVyPTAsbi5maWxsU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4zNSkiLFByKG4sYS5wYWRkbGUueC1mLzIrMyxtKzIsZi02LDQsMiksbi5maWxsKCksbi5yZXN0b3JlKCk7Zm9yKGNvbnN0IHggb2YgYS5iYWxscyl7aWYobi5zYXZlKCksIXguc3R1Y2spe2NvbnN0IGI9TWF0aC5oeXBvdCh4LnZ4LHgudnkpfHwxO2ZvcihsZXQgVD0xO1Q8PTM7VCsrKXtjb25zdCBBPXgueC14LnZ4L2IqVCo2LGVlPXgueS14LnZ5L2IqVCo2O24uZmlsbFN0eWxlPWByZ2JhKDI1NSwyMjQsMTM4LCR7LjIyLVQqLjA2fSlgLG4uYmVnaW5QYXRoKCksbi5hcmMoQSxlZSw3LVQqMS42LDAsTWF0aC5QSSoyKSxuLmZpbGwoKX19bi5zaGFkb3dDb2xvcj0icmdiYSgyNTUsMjI0LDEzOCwwLjkpIixuLnNoYWRvd0JsdXI9MTQsbi5maWxsU3R5bGU9IiNmZmUwOGEiLG4uYmVnaW5QYXRoKCksbi5hcmMoeC54LHgueSw3LDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLnNoYWRvd0JsdXI9MCxuLmZpbGxTdHlsZT0iI2ZmZjhlMCIsbi5iZWdpblBhdGgoKSxuLmFyYyh4LngtMix4LnktMiwyLjQsMCxNYXRoLlBJKjIpLG4uZmlsbCgpLG4ucmVzdG9yZSgpfWZvcihjb25zdCB4IG9mIGEucGFydGljbGVzKXtjb25zdCBiPXgubGlmZS94Lm1heExpZmU7bi5nbG9iYWxBbHBoYT1iLG4uZmlsbFN0eWxlPXguY29sb3Isbi5iZWdpblBhdGgoKSxuLmFyYyh4LngseC55LHguc2l6ZSpiLDAsTWF0aC5QSSoyKSxuLmZpbGwoKX1uLmdsb2JhbEFscGhhPTE7Zm9yKGNvbnN0IHggb2YgYS5mbG9hdGVycyl7Y29uc3QgYj14LmxpZmUveC5tYXhMaWZlO24uc2F2ZSgpLG4uZ2xvYmFsQWxwaGE9TWF0aC5taW4oMSxiKjIpLG4uZmlsbFN0eWxlPXguY29sb3Isbi5mb250PWAxMXB4ICR7R3N9YCxuLnRleHRBbGlnbj0iY2VudGVyIixuLnNoYWRvd0NvbG9yPXguY29sb3Isbi5zaGFkb3dCbHVyPTgsbi5maWxsVGV4dCh4LnR4dCx4LngseC55LSgxLWIpKjI2KSxuLnJlc3RvcmUoKX1pZihoPT09InJ1bm5pbmciJiZhLmJhbGxzLnNvbWUoeD0+eC5zdHVjaykmJmEuZGllZEF0PT09MCl7Y29uc3QgeD0uNSsuNSpNYXRoLnNpbihhLnRpbWUvMTYwKTtuLnNhdmUoKSxuLmdsb2JhbEFscGhhPS4zNSt4Ki41LG4uZmlsbFN0eWxlPSIjZmZlMDhhIixuLmZvbnQ9YDlweCAke0dzfWAsbi50ZXh0QWxpZ249ImNlbnRlciIsbi5maWxsVGV4dCgiU1BBQ0UgLyBUQVAgVE8gTEFVTkNIIixhLncvMixhLmgtNzQpLG4ucmVzdG9yZSgpfWlmKGg9PT0icnVubmluZyImJmEuY29tYm8+PTIpe2NvbnN0IHg9TWF0aC5taW4oNiwxK2EuY29tYm8qLjUpO24uc2F2ZSgpLG4uZmlsbFN0eWxlPSIjZmY1ZDhmIixuLmZvbnQ9YDEycHggJHtHc31gLG4udGV4dEFsaWduPSJyaWdodCIsbi5zaGFkb3dDb2xvcj0icmdiYSgyNTUsOTMsMTQzLDAuOCkiLG4uc2hhZG93Qmx1cj0xMCxuLmZpbGxUZXh0KGBDT01CTyB4JHt4LnRvRml4ZWQoMSl9YCxhLnctMTQsMzApLG4ucmVzdG9yZSgpfW4ucmVzdG9yZSgpLGEuaGl0Rmxhc2g+MCYmKG4uZmlsbFN0eWxlPWByZ2JhKDI1NSw2MCw4MCwke2EuaGl0Rmxhc2gqLjM1fSlgLG4uZmlsbFJlY3QoMCwwLGksYykpO2NvbnN0IHY9bi5jcmVhdGVSYWRpYWxHcmFkaWVudChpLzIsYy8yLGMqLjM1LGkvMixjLzIsYyouNzUpO3YuYWRkQ29sb3JTdG9wKDAsInJnYmEoMCwwLDAsMCkiKSx2LmFkZENvbG9yU3RvcCgxLCJyZ2JhKDAsMCwwLDAuMzIpIiksbi5maWxsU3R5bGU9dixuLmZpbGxSZWN0KDAsMCxpLGMpfWZ1bmN0aW9uIG1oKG4pe2NvbnN0IGE9cGFyc2VJbnQobi5zbGljZSgxKSwxNiksaT1NYXRoLnJvdW5kKChhPj4xNiYyNTUpKi43MiksYz1NYXRoLnJvdW5kKChhPj44JjI1NSkqLjcyKSxoPU1hdGgucm91bmQoKGEmMjU1KSouNzIpO3JldHVybmByZ2IoJHtpfSwke2N9LCR7aH0pYH1jb25zdCBlZD0iYnJpY2tyaW90LmJlc3RzLnYxIix0ZD0iYnJpY2tyaW90LmRpZmYudjEiO2Z1bmN0aW9uIGdoKCl7Y29uc3Qgbj17cm9va2llOjAscHJvOjAscmlvdDowfTt0cnl7Y29uc3QgYT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShlZCk7aWYoIWEpcmV0dXJuIG47Y29uc3QgaT1KU09OLnBhcnNlKGEpO3JldHVybntyb29raWU6TnVtYmVyKGkucm9va2llKXx8MCxwcm86TnVtYmVyKGkucHJvKXx8MCxyaW90Ok51bWJlcihpLnJpb3QpfHwwfX1jYXRjaHtyZXR1cm4gbn19ZnVuY3Rpb24gUmYoKXt0cnl7Y29uc3Qgbj1sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0ZCk7aWYobj09PSJyb29raWUifHxuPT09InBybyJ8fG49PT0icmlvdCIpcmV0dXJuIG59Y2F0Y2h7fXJldHVybiJwcm8ifWZ1bmN0aW9uIHZoKCl7Y29uc3Qgbj1qLnVzZVJlZihudWxsKSxhPWoudXNlUmVmKG51bGwpLGk9ai51c2VSZWYoQ2YoNjAwLDYwMCx3bFtSZigpXSkpLGM9ai51c2VSZWYoe3c6MCxoOjB9KSxoPWoudXNlUmVmKDApLHA9ai51c2VSZWYobmV3IFNldCksbT1qLnVzZVJlZih7cGFkOjAsd2FsbDowLGJyazowLGRlbnQ6MCxwb3c6MCxsdmw6MCxsaWZlOjAsY29tYm86MH0pLFtmLGddPWoudXNlU3RhdGUoImlkbGUiKSx2PWoudXNlUmVmKGYpLFt4LGJdPWoudXNlU3RhdGUoMCksVD1qLnVzZVJlZigwKSxbQSxlZV09ai51c2VTdGF0ZSgxKSxbcmUsJF09ai51c2VTdGF0ZSgzKSxbZ2UsZGVdPWoudXNlU3RhdGUoMCksW2FlLGhlXT1qLnVzZVN0YXRlKDApLFtYZSxSZV09ai51c2VTdGF0ZSghMSksW0VlLCRlXT1qLnVzZVN0YXRlKFJmKSxEZT1qLnVzZVJlZihFZSksW3plLEhlXT1qLnVzZVN0YXRlKGdoKSxPZT1qLnVzZVJlZih6ZSksW19lLEtlXT1qLnVzZVN0YXRlKFJsKSxGZT1qLnVzZVJlZihfZSksd2U9ai51c2VDYWxsYmFjayhxPT57di5jdXJyZW50PXEsZyhxKX0sW10pLGllPWoudXNlQ2FsbGJhY2soKCk9PntoLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGguY3VycmVudCksaC5jdXJyZW50PTApfSxbXSksUD1qLnVzZUNhbGxiYWNrKHE9PntpZSgpLHdlKCJyZWFkeSIpLGguY3VycmVudD13aW5kb3cuc2V0VGltZW91dCgoKT0+e2guY3VycmVudD0wLHYuY3VycmVudD09PSJyZWFkeSImJndlKCJydW5uaW5nIil9LHEpfSxbaWUsd2VdKSxLPWoudXNlQ2FsbGJhY2soKCk9Pntjb25zdHt3OnEsaDptZX09Yy5jdXJyZW50O2kuY3VycmVudD1DZihxfHw2MDAsbWV8fDYwMCx3bFtEZS5jdXJyZW50XSk7Y29uc3QgSD1pLmN1cnJlbnQ7bS5jdXJyZW50PXtwYWQ6MCx3YWxsOjAsYnJrOjAsZGVudDowLHBvdzowLGx2bDowLGxpZmU6MCxjb21ibzowfSxULmN1cnJlbnQ9MCxiKDApLGVlKDEpLCQoSC5saXZlcyksZGUoMCksUmUoITEpfSxbXSksXz1qLnVzZUNhbGxiYWNrKCgpPT57anQoKSxpZSgpLEsoKSxBZS5zdGFydCgpLFAoOTAwKX0sW2llLEssUF0pLGs9ai51c2VDYWxsYmFjaygoKT0+e3YuY3VycmVudD09PSJydW5uaW5nIiYmKGllKCksQWUucGF1c2UoKSx3ZSgicGF1c2VkIikpfSxbaWUsd2VdKSxSPWoudXNlQ2FsbGJhY2soKCk9Pnt2LmN1cnJlbnQ9PT0icGF1c2VkIiYmKGp0KCksQWUucmVzdW1lKCksUCg1MDApKX0sW1BdKSxsZT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgcT12LmN1cnJlbnQ7cT09PSJpZGxlInx8cT09PSJvdmVyIj9fKCk6cT09PSJydW5uaW5nIj9rKCk6cT09PSJwYXVzZWQiJiZSKCl9LFtfLGssUl0pLEk9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IHE9di5jdXJyZW50O2lmKHE9PT0iaWRsZSIpe18oKTtyZXR1cm59aWYocT09PSJvdmVyIil7XygpO3JldHVybn0ocT09PSJydW5uaW5nInx8cT09PSJyZWFkeSIpJiZjaChpLmN1cnJlbnQsd2xbRGUuY3VycmVudF0pfSxbX10pLFU9ai51c2VDYWxsYmFjayhxPT57Y29uc3QgbWU9di5jdXJyZW50O2lmKCEobWU9PT0icnVubmluZyJ8fG1lPT09InJlYWR5Inx8bWU9PT0icGF1c2VkIikpe0RlLmN1cnJlbnQ9cSwkZShxKTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0odGQscSl9Y2F0Y2h7fUsoKX19LFtLXSksdGU9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IHE9IUZlLmN1cnJlbnQ7RmUuY3VycmVudD1xLEtlKHEpLHNuKHEpLFRsKHEpfSxbXSksdWU9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IHE9aS5jdXJyZW50O0FlLmRpZSgpO2NvbnN0IG1lPURlLmN1cnJlbnQ7aWYocS5zY29yZT5PZS5jdXJyZW50W21lXSl7Y29uc3QgSD17Li4uT2UuY3VycmVudCxbbWVdOnEuc2NvcmV9O09lLmN1cnJlbnQ9SCxIZShIKSxSZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGVkLEpTT04uc3RyaW5naWZ5KEgpKX1jYXRjaHt9fXdlKCJvdmVyIil9LFt3ZV0pLFY9ai51c2VDYWxsYmFjayhxPT57anQoKTtjb25zdCBtZT1xLmN1cnJlbnRUYXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksSD1pLmN1cnJlbnQucGFkZGxlO0gucG9pbnRlcj0hMCxILnRhcmdldFg9cS5jbGllbnRYLW1lLmxlZnQsSSgpfSxbSV0pLHBlPWoudXNlQ2FsbGJhY2socT0+e2NvbnN0IG1lPWkuY3VycmVudC5wYWRkbGU7aWYocS5wb2ludGVyVHlwZT09PSJtb3VzZSJ8fHEuYnV0dG9ucz4wKXtjb25zdCBIPXEuY3VycmVudFRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTttZS5wb2ludGVyPSEwLG1lLnRhcmdldFg9cS5jbGllbnRYLUgubGVmdH19LFtdKTtyZXR1cm4gai51c2VFZmZlY3QoKCk9PntzbihGZS5jdXJyZW50KTtsZXQgcT0wO2NvbnN0IG1lPU5lPT57Y29uc3QgQj1pLmN1cnJlbnQsTz1CLmxhc3Q/TWF0aC5taW4oNjAsTmUtQi5sYXN0KToxNjtCLmxhc3Q9TmU7Y29uc3QgUGU9cC5jdXJyZW50O0IucGFkZGxlLmt4PShQZS5oYXMoImFycm93cmlnaHQiKXx8UGUuaGFzKCJkIik/MTowKS0oUGUuaGFzKCJhcnJvd2xlZnQiKXx8UGUuaGFzKCJhIik/MTowKTtjb25zdCBqZT12LmN1cnJlbnQsVz1qZT09PSJydW5uaW5nInx8amU9PT0ib3ZlciI7dWgoQixPLE5lLHdsW0RlLmN1cnJlbnRdLFcpLEIuc2NvcmUhPT1ULmN1cnJlbnQmJihULmN1cnJlbnQ9Qi5zY29yZSxiKEIuc2NvcmUpLGhlKHJ0PT5ydCsxKSksZWUoQi5sZXZlbCksJChCLmxpdmVzKSxkZShCLmNvbWJvKTtjb25zdCBiZT1tLmN1cnJlbnQ7aWYoQi5wYWRkbGVIaXRzIT09YmUucGFkJiYoYmUucGFkPUIucGFkZGxlSGl0cyxBZS5wYWRkbGUoKSksQi53YWxsSGl0cyE9PWJlLndhbGwmJihiZS53YWxsPUIud2FsbEhpdHMsQWUud2FsbCgpKSxCLmJyaWNrQnJlYWtzIT09YmUuYnJrKXtjb25zdCBydD1CLmJyaWNrQnJlYWtzLWJlLmJyaztiZS5icms9Qi5icmlja0JyZWFrcyxBZS5icmljaygpLHJ0PjAmJkFlLmNvbWJvKEIuY29tYm8pfUIuYnJpY2tEZW50cyE9PWJlLmRlbnQmJihiZS5kZW50PUIuYnJpY2tEZW50cyxBZS5icmlja0hhcmQoKSksQi5wb3dlcnMhPT1iZS5wb3cmJihiZS5wb3c9Qi5wb3dlcnMsQWUuY2F0Y2hQb3dlcigpKSxCLmxldmVsQ2xlYXJzIT09YmUubHZsJiYoYmUubHZsPUIubGV2ZWxDbGVhcnMsQWUubGV2ZWxDbGVhcigpKSxCLmxpZmVMb3N0IT09YmUubGlmZSYmKGJlLmxpZmU9Qi5saWZlTG9zdCxBZS5saWZlTG9zdCgpKSxiZS5jb21ibz1CLmNvbWJvLGplPT09InJ1bm5pbmciJiZCLmRpZWRBdD4wJiZOZS1CLmRpZWRBdD45MDAmJnVlKCk7Y29uc3QgeGU9bi5jdXJyZW50LG9lPWMuY3VycmVudDtpZih4ZSYmb2Uudz4wKXtjb25zdCBydD14ZS5nZXRDb250ZXh0KCIyZCIpO3J0JiZoaChydCxCLG9lLncsb2UuaCxqZSl9cT1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobWUpfTtxPXJlcXVlc3RBbmltYXRpb25GcmFtZShtZSk7Y29uc3QgSD1hLmN1cnJlbnQsdmU9bi5jdXJyZW50O2xldCBGPW51bGw7aWYoSCYmdmUpe2NvbnN0IE5lPSgpPT57Y29uc3QgQj1ILmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLE89TWF0aC5tYXgoMCxNYXRoLmZsb29yKE1hdGgubWluKEIud2lkdGgsQi5oZWlnaHQpKSksUGU9TWF0aC5taW4oMix3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb3x8MSk7dmUud2lkdGg9TWF0aC5yb3VuZChPKlBlKSx2ZS5oZWlnaHQ9TWF0aC5yb3VuZChPKlBlKSx2ZS5zdHlsZS53aWR0aD1gJHtPfXB4YCx2ZS5zdHlsZS5oZWlnaHQ9YCR7T31weGAsYy5jdXJyZW50PXt3Ok8saDpPfTtjb25zdCBqZT12ZS5nZXRDb250ZXh0KCIyZCIpO2plJiZqZS5zZXRUcmFuc2Zvcm0oUGUsMCwwLFBlLDAsMCk7Y29uc3QgVz1pLmN1cnJlbnQsYmU9Vy53PjA/Vy53OjYwMDtpZihPPjAmJk1hdGguYWJzKE8tYmUpPi41KXtjb25zdCB4ZT1PL2JlO2Zvcihjb25zdCBvZSBvZiBXLmJyaWNrcylvZS54Kj14ZSxvZS55Kj14ZSxvZS53Kj14ZSxvZS5oKj14ZTtmb3IoY29uc3Qgb2Ugb2YgVy5iYWxscylvZS54Kj14ZSxvZS55Kj14ZTtmb3IoY29uc3Qgb2Ugb2YgVy5jYXBzdWxlcylvZS54Kj14ZSxvZS55Kj14ZTtmb3IoY29uc3Qgb2Ugb2YgVy5wYXJ0aWNsZXMpb2UueCo9eGUsb2UueSo9eGU7Zm9yKGNvbnN0IG9lIG9mIFcuZmxvYXRlcnMpb2UueCo9eGUsb2UueSo9eGU7Vy5wYWRkbGUueCo9eGUsVy5wYWRkbGUudGFyZ2V0WCo9eGV9Tz4wJiYoVy53PU8sVy5oPU8sVy5wYWRkbGUuYmFzZVc9Typ3bFtEZS5jdXJyZW50XS5wYWRkbGVSYXRpbyxXLnBhZGRsZS54PU1hdGgubWluKE1hdGgubWF4KFcucGFkZGxlLngsVy5wYWRkbGUudy8yKSxPLVcucGFkZGxlLncvMikpfTtOZSgpLEY9bmV3IFJlc2l6ZU9ic2VydmVyKE5lKSxGLm9ic2VydmUoSCl9Y29uc3Qga2U9TmU9Pntjb25zdCBCPU5lLmtleS50b0xvd2VyQ2FzZSgpO2lmKFsiYXJyb3dsZWZ0IiwiYXJyb3dyaWdodCIsImEiLCJkIl0uaW5jbHVkZXMoQikpe05lLnByZXZlbnREZWZhdWx0KCkscC5jdXJyZW50LmFkZChCKTtyZXR1cm59aWYoQj09PSIgIil7TmUucHJldmVudERlZmF1bHQoKSxOZS5yZXBlYXR8fEkoKTtyZXR1cm59aWYoQj09PSJyIil7XygpO3JldHVybn1pZihCPT09InAifHxCPT09ImVzY2FwZSIpe2NvbnN0IE89di5jdXJyZW50O089PT0icnVubmluZyI/aygpOk89PT0icGF1c2VkIiYmUigpO3JldHVybn1pZihCPT09Im0iKXt0ZSgpO3JldHVybn1CPT09IjEiJiZVKCJyb29raWUiKSxCPT09IjIiJiZVKCJwcm8iKSxCPT09IjMiJiZVKCJyaW90Iil9LFNlPU5lPT57cC5jdXJyZW50LmRlbGV0ZShOZS5rZXkudG9Mb3dlckNhc2UoKSl9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJrZXlkb3duIixrZSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImtleXVwIixTZSk7Y29uc3QgWT0oKT0+e2RvY3VtZW50LmhpZGRlbiYmdi5jdXJyZW50PT09InJ1bm5pbmciJiZrKCl9LFdlPSgpPT57di5jdXJyZW50PT09InJ1bm5pbmciJiZrKCkscC5jdXJyZW50LmNsZWFyKCl9O3JldHVybiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixZKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigiYmx1ciIsV2UpLCgpPT57Y2FuY2VsQW5pbWF0aW9uRnJhbWUocSksaWUoKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsa2UpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJrZXl1cCIsU2UpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLFkpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJibHVyIixXZSksRiYmRi5kaXNjb25uZWN0KCl9fSxbVSxpZSx1ZSxJLGssXyx0ZV0pLHtjYW52YXNSZWY6bix3cmFwUmVmOmEscGhhc2U6ZixzY29yZTp4LGxldmVsOkEsbGl2ZXM6cmUsY29tYm86Z2UscG9wS2V5OmFlLGlzTmV3QmVzdDpYZSxkaWZmaWN1bHR5OkVlLGJlc3RzOnplLG11dGVkOl9lLGFjdGlvbnM6e3N0YXJ0Ol8scHJpbWFyeTpsZSxwYXVzZUdhbWU6ayxyZXN1bWVHYW1lOlIsY2hhbmdlRGlmZmljdWx0eTpVLHRvZ2dsZU11dGU6dGUsb25Qb2ludGVyRG93bjpWLG9uUG9pbnRlck1vdmU6cGV9fX1jb25zdCBUZj1be2lkOiJyb29raWUiLGxhYmVsOiJSb29raWUiLHRhZzoiV2lkZSBwYWRkbGUsIGdlbnRsZSBwYWNlIixkb3RzOjF9LHtpZDoicHJvIixsYWJlbDoiUHJvIix0YWc6IlRoZSBpbnRlbmRlZCByaW90Iixkb3RzOjJ9LHtpZDoicmlvdCIsbGFiZWw6IlJpb3QiLHRhZzoiRmFzdCBiYWxsLCB0aGluIHBhZGRsZSIsZG90czozfV07ZnVuY3Rpb24geWgoe2NsYXNzTmFtZTpuPSJoLTMgdy01IixkaW06YT0hMX0pe3JldHVybiBzLmpzeCgic3ZnIix7dmlld0JveDoiMCAwIDI0IDEwIixjbGFzc05hbWU6YCR7bn0gJHthPyJvcGFjaXR5LTIwIjoiIn1gLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOnMuanN4KCJyZWN0Iix7eDoiMSIseToiMiIsd2lkdGg6IjIyIixoZWlnaHQ6IjYiLHJ4OiIzIixmaWxsOiIjZmZjODU3In0pfSl9ZnVuY3Rpb24gWWkoe2xhYmVsOm4sdmFsdWU6YSxhY2NlbnQ6aT0hMSxwb3A6Yz0wLHZhbHVlQ2xhc3M6aD0iIn0pe3JldHVybiBzLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOm59KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1zbSBsZWFkaW5nLXRpZ2h0IHNtOnRleHQtYmFzZSAke2k/ImFuaW1hdGUtcG9wIHRleHQtYW1iZXJnbG93LTQwMCI6InRleHQtbW9zcy0xMDAifSAke2h9YCxjaGlsZHJlbjphfSxjKV19KX1mdW5jdGlvbiBycih7a2V5c0xpc3Q6bixhY3Rpb246YX0pe3JldHVybiBzLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBnYXAtMSIsY2hpbGRyZW46bn0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjphfSldfSl9ZnVuY3Rpb24geGgoKXtyZXR1cm4gdHlwZW9mIHdpbmRvdzwidSImJndpbmRvdy5tYXRjaE1lZGlhKCIocG9pbnRlcjogY29hcnNlKSIpLm1hdGNoZXM/cy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6Im14LWF1dG8gbXQtMyBmbGV4IHctZnVsbCBtYXgtdy1bNDIwcHhdIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwIHB4LTIgcHktMSIsY2hpbGRyZW46IkRyYWcgdG8gc2xpZGUgdGhlIHBhZGRsZSJ9KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MCBweC0yIHB5LTEiLGNoaWxkcmVuOiJUYXAgdG8gbGF1bmNoIHRoZSBiYWxsIn0pXX0pOm51bGx9ZnVuY3Rpb24gd2goKXtjb25zdCBuPXZoKCkse2FjdGlvbnM6YSxwaGFzZTppfT1uLGM9aT09PSJydW5uaW5nIixoPU1hdGgubWluKDYsMStuLmNvbWJvKi41KTtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtcmlzZSIsY2hpbGRyZW46W3MuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJtYi00IGZsZXggZmxleC13cmFwIGl0ZW1zLWVuZCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGdhcC0yIHNtOmdhcC0zIixjaGlsZHJlbjpbcy5qc3goWWkse2xhYmVsOiJTY29yZSIsdmFsdWU6bi5zY29yZSxhY2NlbnQ6ITAscG9wOm4ucG9wS2V5fSkscy5qc3goWWkse2xhYmVsOiJXYWxsIix2YWx1ZTpzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC12ZW5vbS00MDAgW3RleHQtc2hhZG93OjBfMF8xMnB4X3JnYmEoMTQyLDI0MCw5MCwwLjQ1KV0iLGNoaWxkcmVuOm4ubGV2ZWx9KX0pLHMuanN4KFlpLHtsYWJlbDoiQ29tYm8iLHZhbHVlOm4uY29tYm8+PTI/cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LWFwcGxlLTQwMCBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSgyNTUsOTMsMTQzLDAuNSldIixjaGlsZHJlbjpbIngiLGgudG9GaXhlZCgxKV19KTpzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IuKAlCJ9KX0pLHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206cHgtMy41IixjaGlsZHJlbjpbcy5qc3goImRpdiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzdweF0gdHJhY2tpbmctWzAuMThlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkxpdmVzIn0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHQtMS41IixjaGlsZHJlbjpBcnJheS5mcm9tKHtsZW5ndGg6M30sKHAsbSk9PnMuanN4KHloLHtkaW06bT49bi5saXZlc30sbSkpfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpjPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmM/YS5wYXVzZUdhbWU6YS5yZXN1bWVHYW1lLGRpc2FibGVkOiFjJiZpIT09InBhdXNlZCIsY2hpbGRyZW46Yz9zLmpzeCh4bix7fSk6cy5qc3goUWUse30pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeChpdCx7fSl9KSxzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6bi5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazphLnRvZ2dsZU11dGUsY2hpbGRyZW46bi5tdXRlZD9zLmpzeChQbCx7fSk6cy5qc3goRWwse30pfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtyZWY6bi53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbcy5qc3goImNhbnZhcyIse3JlZjpuLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1ub25lIixvblBvaW50ZXJEb3duOmEub25Qb2ludGVyRG93bixvblBvaW50ZXJNb3ZlOmEub25Qb2ludGVyTW92ZSxvbkNvbnRleHRNZW51OnA9PnAucHJldmVudERlZmF1bHQoKX0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMiB6LTIwIiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbImxlZnQtMCB0b3AtMCBib3JkZXItbC0yIGJvcmRlci10LTIiLCJyaWdodC0wIHRvcC0wIGJvcmRlci1yLTIgYm9yZGVyLXQtMiIsImxlZnQtMCBib3R0b20tMCBib3JkZXItbC0yIGJvcmRlci1iLTIiLCJyaWdodC0wIGJvdHRvbS0wIGJvcmRlci1yLTIgYm9yZGVyLWItMiJdLm1hcChwPT5zLmpzeCgic3BhbiIse2NsYXNzTmFtZTpgYWJzb2x1dGUgaC00IHctNCBib3JkZXItYXBwbGUtNDAwLzQwICR7cH1gfSxwKSl9KSxpPT09ImlkbGUiJiZzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMGExMjBhXS84NSBwLTYgdGV4dC1jZW50ZXIgYmFja2Ryb3AtYmx1ci1bMnB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2hpbGRyZW46W3MuanN4KCJoMSIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtcGluayBmb250LWRpc3BsYXkgdGV4dC0yeGwgc206dGV4dC0zeGwiLGNoaWxkcmVuOiJCUklDSyBSSU9UIn0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgbXQtMiB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlNNQVNIIMK3IENPTUJPIMK3IFNVUlZJVkUifSldfSkscy5qc3goWWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFN0YXJ0IFJpb3QiXX0pfSkscy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJQUkVTUyBTUEFDRSBPUiBUQVAgVE8gUExBWSJ9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOltzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTEgc206ZmxleCIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiLihpDihpIifSksIiBtb3ZlIl19KSxzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTEgc206ZmxleCIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJTcGFjZSJ9KSwiIGxhdW5jaCJdfSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InNtOmhpZGRlbiIsY2hpbGRyZW46IkRyYWcgdG8gbW92ZSDCtyB0YXAgdG8gbGF1bmNoIn0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXBpdC01MDAiLGNoaWxkcmVuOiLigKIifSkscy5qc3hzKCJzcGFuIix7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJQIn0pLCIgcGF1c2UiXX0pXX0pLG4uaXNOZXdCZXN0JiZzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIFJFQ09SRCDimIUifSldfSksaT09PSJwYXVzZWQiJiZzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC01IGJnLVsjMGExMjBhXS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToicmV0cm8tdGl0bGUtcGluayBmb250LWRpc3BsYXkgdGV4dC14bCIsY2hpbGRyZW46IlJJT1QgUEFVU0VEIn0pLHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnJlc3VtZUdhbWUsY2hpbGRyZW46cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KFFlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBSZXN1bWUiXX0pfSkscy5qc3goWWUse29uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goaXQse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3RhcnQiXX0pfSldfSkscy5qc3hzKCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJQIn0pLCIgIixzLmpzeCgic3BhbiIse2NsYXNzTmFtZToibXgtMSIsY2hpbGRyZW46Im9yIn0pLCIgIixzLmpzeChHLHtjaGlsZHJlbjoiRXNjIn0pLCIgIixzLmpzeCgic3BhbiIse2NsYXNzTmFtZToibWwtMSIsY2hpbGRyZW46InJlc3VtZXMifSldfSldfSksaT09PSJvdmVyIiYmcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImFuaW1hdGUtZmFkZWluIGFic29sdXRlIGluc2V0LTAgei0zMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtNCBiZy1bIzBhMTIwYV0vOTAgcC02IHRleHQtY2VudGVyIixjaGlsZHJlbjpbcy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LXhsIHRleHQtYXBwbGUtNDAwIFt0ZXh0LXNoYWRvdzowXzBfMjRweF9yZ2JhKDI1NSw5MywxNDMsMC41KV0gc206dGV4dC0yeGwiLGNoaWxkcmVuOiJQQURETEUgRE9XTiJ9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1lbmQgZ2FwLTYiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTQ09SRSJ9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46bi5zY29yZX0pXX0pLHMuanN4cygiZGl2Iix7Y2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IkJFU1QifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpuLmJlc3RzW24uZGlmZmljdWx0eV19KV19KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs5cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbIlJFQUNIRUQgV0FMTCAiLG4ubGV2ZWxdfSksbi5pc05ld0Jlc3QmJnMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KSxzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmlvdCBBZ2FpbiJdfSl9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSkscy5qc3goeGgse30pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6Im10LTQgZmxleCBqdXN0aWZ5LWNlbnRlciIsY2hpbGRyZW46cy5qc3goWWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6YS5wcmltYXJ5LGNsYXNzTmFtZToibWluLXctWzIyMHB4XSIsY2hpbGRyZW46cy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIixjaGlsZHJlbjppPT09InJ1bm5pbmciP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goeG4se2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBhdXNlIl19KTppPT09InBhdXNlZCI/cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChRZSx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdW1lIl19KTppPT09Im92ZXIiP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goaXQse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJpb3QgQWdhaW4iXX0pOnMuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFN0YXJ0IFJpb3QiXX0pfSl9KX0pXX0pLHMuanN4cygiYXNpZGUiLHtjbGFzc05hbWU6ImdyaWQgY29udGVudC1zdGFydCBnYXAtNCIsY2hpbGRyZW46W3MuanN4cyhRdCx7dGl0bGU6IlBvd2VyIENhcHN1bGVzIixjaGlsZHJlbjpbcy5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbcy5qc3hzKCJsaSIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIixjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGgtNSB3LTYgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCBiZy12ZW5vbS00MDAgZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdGV4dC1waXQtOTUwIixjaGlsZHJlbjoiVyJ9KSwiV2lkZSBwYWRkbGUiXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiMTBzIn0pXX0pLHMuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiIsY2hpbGRyZW46W3MuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBoLTUgdy02IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctWyM2MmU2ZmZdIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRleHQtWyMwNTI1MzBdIixjaGlsZHJlbjoiTSJ9KSwiTXVsdGliYWxsIl19KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46InNwbGl0ISJ9KV19KSxzLmpzeHMoImxpIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4iLGNoaWxkcmVuOltzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaC01IHctNiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1mdWxsIGJnLVsjYzA4NGZjXSBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0ZXh0LVsjMjQxMDMzXSIsY2hpbGRyZW46IlMifSksIlNsb3ctbW8iXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiOHMifSldfSldfSkscy5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiQnJpY2tzIGRyb3AgY2Fwc3VsZXMg4oCUIGNhdGNoIHRoZW0gb24gdGhlIHBhZGRsZS4gQXJtb3JlZCBicmlja3MgKGFtYmVyLCBwaW5rKSB0YWtlIGV4dHJhIGhpdHMuIEtlZXAgdGhlIGNvbWJvIGFsaXZlIGJ5IG5vdCB0b3VjaGluZyB0aGUgcGFkZGxlLiJ9KV19KSxzLmpzeChMbCx7dGl0bGU6IlJpb3QgTGV2ZWwiLG9wdGlvbnM6VGYsdmFsdWU6bi5kaWZmaWN1bHR5LG9uQ2hhbmdlOmEuY2hhbmdlRGlmZmljdWx0eSxkaXNhYmxlZDppPT09InJ1bm5pbmcifHxpPT09InJlYWR5Inx8aT09PSJwYXVzZWQifSkscy5qc3goX2wse2Jlc3RzOm4uYmVzdHMsb3B0aW9uczpUZixhY3RpdmU6bi5kaWZmaWN1bHR5fSkscy5qc3hzKFF0LHt0aXRsZToiQ29udHJvbHMiLGNoaWxkcmVuOltzLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yLjUiLGNoaWxkcmVuOltzLmpzeChycix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoi4oaQ4oaSIn0pLHMuanN4KEcse2NoaWxkcmVuOiJBL0QifSldfSksYWN0aW9uOiJNb3ZlIHBhZGRsZSJ9KSxzLmpzeChycix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46IlNwYWNlIn0pLGFjdGlvbjoiTGF1bmNoIGJhbGwifSkscy5qc3gocnIse2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJDbGljayJ9KSxhY3Rpb246IkxhdW5jaCAvIHN0ZWVyIn0pLHMuanN4KHJyLHtrZXlzTGlzdDpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJQIn0pLHMuanN4KEcse2NoaWxkcmVuOiJFc2MifSldfSksYWN0aW9uOiJQYXVzZSJ9KSxzLmpzeChycix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46IlIifSksYWN0aW9uOiJSZXN0YXJ0In0pLHMuanN4KHJyLHtrZXlzTGlzdDpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiIxIn0pLHMuanN4KEcse2NoaWxkcmVuOiIyIn0pLHMuanN4KEcse2NoaWxkcmVuOiIzIn0pXX0pLGFjdGlvbjoiUmlvdCBsZXZlbCJ9KSxzLmpzeChycix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxzLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJUb3VjaDogZHJhZyBhbnl3aGVyZSBvbiB0aGUgYm9hcmQgdG8gc2xpZGUgdGhlIHBhZGRsZSwgdGFwIHRvIGxhdW5jaCB0aGUgYmFsbC4ifSldfSldfSldfSldfSl9Y29uc3QgWGk9e3Jvb2tpZTp7bGFiZWw6IlJPT0tJRSIsdGFnOiJob25lc3QgaGVhdCwgYmlnIHdpbmRvdyIsZG90czoxLGZsaWdodDpbNzgwLDk4MF0sY3VydmU6MzQsZGVjZXB0aW9uOjE0MCx3aW5kb3c6MTcwLGFkYXB0Oi4zLG1waEJvbnVzOi0zfSxtYWpvcjp7bGFiZWw6Ik1BSk9SIix0YWc6ImEgcmVhbCByb3RhdGlvbiIsZG90czoyLGZsaWdodDpbNjAwLDgwMF0sY3VydmU6NzIsZGVjZXB0aW9uOjMwMCx3aW5kb3c6MTI4LGFkYXB0Oi42NSxtcGhCb251czowfSxhbGxzdGFyOntsYWJlbDoiQUxMLVNUQVIiLHRhZzoibmFzdHkgc3R1ZmYsIHF1aWNrIGFybXMiLGRvdHM6MyxmbGlnaHQ6WzQ3MCw2NjBdLGN1cnZlOjEwOCxkZWNlcHRpb246NDYwLHdpbmRvdzo5OCxhZGFwdDouOTUsbXBoQm9udXM6Mn19LGpsPXtmYXN0YmFsbDp7bmFtZToiRkFTVEJBTEwiLGNvbG9yOiIjZmY1ZDhmIixibHVyYjoicHVyZSBoZWF0LCBzdHJhaWdodCBpbiJ9LHNsaWRlcjp7bmFtZToiU0xJREVSIixjb2xvcjoiI2ZmZDE2NiIsYmx1cmI6ImxhdGUgc2lkZXdheXMgcnVuIn0sY3VydmU6e25hbWU6IkNVUlZFIixjb2xvcjoiI2MwODRmYyIsYmx1cmI6ImZhbGxzIG9mZiB0aGUgdGFibGUifSxjaGFuZ2V1cDp7bmFtZToiQ0hBTkdFVVAiLGNvbG9yOiIjNjJlNmZmIixibHVyYjoic2FtZSBhcm0sIG5vIHNwZWVkIn19LG5kPU1hdGguUEkqMixNZT0obixhKT0+bitNYXRoLnJhbmRvbSgpKihhLW4pLFFzPShuLGEsaSk9Pk1hdGgubWF4KGEsTWF0aC5taW4oaSxuKSksZm89bj0+bltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqbi5sZW5ndGgpXSxraD1bIiNkOWEwNjYiLCIjZThjMzllIiwiIzhmNmI0YSIsIiNjNDZhNmEiLCIjNmE4ZmM0IiwiI2U1ZTBkMCIsIiM5Y2M0NmEiXTtmdW5jdGlvbiBTaChuKXtyZXR1cm4gbiouMDc4fWZ1bmN0aW9uIFppKG49NjAwLGE9NjAwKXtjb25zdCBpPVtdO2ZvcihsZXQgYz0wO2M8MTkwO2MrKylpLnB1c2goe3g6TWF0aC5yYW5kb20oKSx5Ok1hdGgucmFuZG9tKCksYzpmbyhraCksdHc6TWUoMCxuZCl9KTtyZXR1cm57dzpuLGg6YSx0aW1lOjAsbGFzdDowLHN0YWdlOiJiZXR3ZWVuIixzdGFnZVQ6MCxwaXRjaDpudWxsLHN3dW5nOiExLHN3aW5nQW5pbTowLHN3aW5nRWFybHk6ITEsY29udGFjdDpudWxsLGJhbm5lcjpudWxsLHBhRW5kZWQ6ITEsYmFsbHM6MCxzdHJpa2VzOjAsb3V0czowLHJ1bnM6MCxiYXNlczpbITEsITEsITFdLHN0YXRzOnthYjowLGhpdHM6MCxocjowLGs6MCxzdHJlYWs6MCxiZXN0U3RyZWFrOjB9LGxhc3RQaXRjaExhYmVsOiLigJQiLGRpZmZzOltdLHJlY2VudFR5cGVzOltdLGNyb3dkOmksY2hlZXI6MCxwYXJ0aWNsZXM6W10sc2hha2U6MCxmbGFzaDowLG92ZXI6ITEsZXZDcmFjazowLGV2Rm91bDowLGV2V2hpZmY6MCxldlN0cmlrZTowLGV2QmFsbDowLGV2V2FsazowLGV2T3V0OjAsZXZDaGVlcjowLGV2SHI6MCxldks6MH19ZnVuY3Rpb24gamgobixhKXtjb25zdCBpPXtmYXN0YmFsbDouNDIsc2xpZGVyOi4yLGN1cnZlOi4xOCxjaGFuZ2V1cDouMn0sYz1uLmRpZmZzLmxlbmd0aD9RcyhuLmRpZmZzLnJlZHVjZSgoYWUsaGUpPT5hZStoZSwwKS9uLmRpZmZzLmxlbmd0aCwtODAsODApOjA7YzwtMjU/KGkuY2hhbmdldXArPS4zNCphLmFkYXB0LGkuY3VydmUrPS4yKmEuYWRhcHQsaS5mYXN0YmFsbC09LjMqYS5hZGFwdCk6Yz4yNSYmKGkuZmFzdGJhbGwrPS4zOCphLmFkYXB0LGkuY2hhbmdldXAtPS4yNCphLmFkYXB0KTtjb25zdCBoPW4ucmVjZW50VHlwZXM7aC5sZW5ndGg+PTImJmhbaC5sZW5ndGgtMV09PT1oW2gubGVuZ3RoLTJdJiYoaVtoW2gubGVuZ3RoLTFdXSo9LjM1KSxuLmJhbGxzPj0zJiYoaS5mYXN0YmFsbCs9LjM1KSxuLnN0cmlrZXM+PTImJihpLmN1cnZlKz0uMjIsaS5zbGlkZXIrPS4xNCk7Y29uc3QgcD1PYmplY3QudmFsdWVzKGkpLnJlZHVjZSgoYWUsaGUpPT5hZStNYXRoLm1heCgwLGhlKSwwKTtsZXQgbT1NYXRoLnJhbmRvbSgpKnAsZj0iZmFzdGJhbGwiO2Zvcihjb25zdCBhZSBvZiBPYmplY3Qua2V5cyhpKSlpZihtLT1NYXRoLm1heCgwLGlbYWVdKSxtPD0wKXtmPWFlO2JyZWFrfWNvbnN0IGc9Zj09PSJmYXN0YmFsbCI/MTpmPT09InNsaWRlciI/MS4xNDpmPT09ImN1cnZlIj8xLjMyOjEuNDYsdj1RcyhNZShhLmZsaWdodFswXSxhLmZsaWdodFsxXSkqZyw0MzAsMTYwMCkseD04MjArTWUoMCxhLmRlY2VwdGlvbiksVD1NYXRoLnJvdW5kKFFzKChmPT09ImZhc3RiYWxsIj85NjpmPT09InNsaWRlciI/ODg6Zj09PSJjdXJ2ZSI/Nzk6ODQpK2EubXBoQm9udXMrTWUoLTIsMiktKHYtNjAwKSouMDA4LDY4LDEwMykpO2xldCBBPTAsZWU9MDtjb25zdCByZT1NYXRoLnJhbmRvbSgpPC41Py0xOjE7Zj09PSJmYXN0YmFsbCI/QT1NZSgtMTAsMTApOmY9PT0ic2xpZGVyIj8oQT1yZSpNZSguNSwuOSkqYS5jdXJ2ZSxlZT1NZSguMSwuMykqYS5jdXJ2ZSk6Zj09PSJjdXJ2ZSI/KEE9cmUqTWUoLjEsLjQpKmEuY3VydmUsZWU9TWUoLjcsMS4wNSkqYS5jdXJ2ZSk6KEE9TWUoLTE0LDE0KSxlZT1NZSguMTUsLjM1KSphLmN1cnZlKTtjb25zdCAkPVNoKDYwMCk7bGV0IGdlPU1hdGgucmFuZG9tKCk8KG4uYmFsbHM+PTM/Ljg2Oi43KTtuLnN0cmlrZXM9PT0yJiZNYXRoLnJhbmRvbSgpPC40JiYoZ2U9ITApO2NvbnN0IGRlPWdlP01lKC0uODIsLjgyKSokOnJlKk1lKDEuMDUsMS42KSokO3JldHVybnt0eXBlOmYsZmxpZ2h0OnYsd2luZHVwOngsYnJlYWtYOkEsYnJlYWtZOmVlLHRhcmdldFg6ZGUsaW5ab25lOmdlLG1waDpUfX1mdW5jdGlvbiBiaChuLGEpe24ucGFFbmRlZCYmKG4uYmFsbHM9MCxuLnN0cmlrZXM9MCxuLnBhRW5kZWQ9ITEpLG4ucGl0Y2g9amgobixhKSxuLnN3dW5nPSExLG4uc3dpbmdFYXJseT0hMSxuLmNvbnRhY3Q9bnVsbCxuLmJhbm5lcj1udWxsLG4uc3RhZ2U9IndpbmR1cCIsbi5zdGFnZVQ9MH1mdW5jdGlvbiB2bihuLGEsaSxjLGgpe24uYmFubmVyPXt0eHQ6YSxzdWI6aSxjb2xvcjpjLGR1cjpofX1mdW5jdGlvbiBFZihuLGEsaSxjLGgscD0xKXtjb25zdCBtPU1hdGgubWluKDIyMCxuLnBhcnRpY2xlcy5sZW5ndGgraCk7Zm9yKGxldCBmPW4ucGFydGljbGVzLmxlbmd0aDtmPG07ZisrKXtjb25zdCBnPU1lKDAsbmQpLHY9TWUoMzAsMjIwKSpwLHg9TWUoMzAwLDgwMCk7bi5wYXJ0aWNsZXMucHVzaCh7eDphLHk6aSx2eDpNYXRoLmNvcyhnKSp2LHZ5Ok1hdGguc2luKGcpKnYsbGlmZTp4LG1heExpZmU6eCxzaXplOk1lKDEuNSwzLjQpKnAsY29sb3I6Zm8oYyksZHJhZzoyLGdyYXY6NDB9KX19ZnVuY3Rpb24gTmgobil7Zm9yKGxldCBhPTA7YTw1MDthKyspbi5wYXJ0aWNsZXMucHVzaCh7eDpNZSgwLG4udykseTpNZSgtMzAsMCksdng6TWUoLTQwLDQwKSx2eTpNZSg0MCwxNDApLGxpZmU6TWUoOTAwLDE2MDApLG1heExpZmU6MTYwMCxzaXplOk1lKDIsMy42KSxjb2xvcjpmbyhbIiNmZmQxNjYiLCIjZmY1ZDhmIiwiIzYyZTZmZiIsIiM4ZWYwNWEiLCIjZmZmZmZmIl0pLGRyYWc6LjYsZ3JhdjozMH0pfWZ1bmN0aW9uIENoKG4sYSl7Y29uc3RbaSxjLGhdPW4uYmFzZXM7bGV0IHA9MDtyZXR1cm4gYT49ND8ocD0oaT8xOjApKyhjPzE6MCkrKGg/MTowKSsxLG4uYmFzZXM9WyExLCExLCExXSxwKTphPT09Mz8ocD0oaT8xOjApKyhjPzE6MCkrKGg/MTowKSxuLmJhc2VzPVshMSwhMSwhMF0scCk6YT09PTI/KHA9KGM/MTowKSsoaD8xOjApLG4uYmFzZXM9WyExLCEwLGldLHApOihwPWg/MTowLG4uYmFzZXM9WyEwLGksY10scCl9ZnVuY3Rpb24gTWgobil7Y29uc3RbYSxpLGNdPW4uYmFzZXM7bGV0IGg9MDtyZXR1cm4gYSYmaSYmYyYmKGg9MSksbi5iYXNlcz1bITAsYXx8ITEsaSYmYXx8Y10saH1mdW5jdGlvbiBKaShuLGEpe2NvbnN0IGk9bi53LGM9bi5oLGg9aSouNDYscD1jKi44O2xldCBtPWkqLjUsZj1jKi41LGc9YyouMTIsdj03MDA7Y29uc3QgeD1NYXRoLnJhbmRvbSgpPC41Py0xOjE7YT09PSJociI/KG09aSooLjUreCpNZSguMDgsLjMpKSxmPWMqTWUoLjE2LC4yNiksZz1jKi4zLHY9OTUwKTphPT09IjNiIj8obT1pKiguNSt4Kk1lKC4xNSwuMzIpKSxmPWMqTWUoLjQyLC41KSxnPWMqLjE2LHY9ODAwKTphPT09IjJiIj8obT1pKiguNSt4Kk1lKC4xMiwuMykpLGY9YypNZSguNSwuNTgpLGc9YyouMTMsdj03NTApOmE9PT0iMWIiPyhtPWkqKC41K3gqTWUoLjA4LC4yNikpLGY9YypNZSguNTgsLjY4KSxnPWMqLjA3LHY9NjUwKTphPT09ImZseW91dCI/KG09aSooLjUreCpNZSguMSwuMjQpKSxmPWMqTWUoLjQ2LC41NiksZz1jKi4yMix2PTkwMCk6YT09PSJncm91bmRvdXQiPyhtPWkqKC41K3gqTWUoLjA1LC4xOCkpLGY9YypNZSguNiwuNjYpLGc9YyouMDIsdj01NTApOihtPWkqTWUoLjIsLjQyKSxmPWMqTWUoLjg2LC45NSksZz1jKi4wOCx2PTUwMCksbi5jb250YWN0PXt0OjAsZHVyOnYsa2luZDphLHgwOmgseTA6cCx4MTptLHkxOmYsYXJjOmd9fWZ1bmN0aW9uIHBvKG4pe24ucGFFbmRlZD0hMH1mdW5jdGlvbiBSaChuKXtuLm91dHM+PTM/KG4uc3RhZ2U9ImVuZGluZyIsbi5zdGFnZVQ9MCk6KG4uc3RhZ2U9ImJldHdlZW4iLG4uc3RhZ2VUPTApfWZ1bmN0aW9uIFRoKG4sYSxpLGMpe2NvbnN0IGg9bi53LHA9bi5zdGF0cztpZihpPT09ImZvdWwiKXtuLnN0cmlrZXM8MiYmbi5zdHJpa2VzKysscC5zdHJlYWs9MCxuLmV2Rm91bCsrLHZuKG4sIkZPVUwgQkFMTCIsImp1c3QgbWlzc2VkIGl0IiwiI2M4YzJiMCIsODUwKSxKaShuLCJmb3VsIiksRWYobixoKi40NixoKi43OCxbIiNlNWUwZDAiLCIjZmZmZmZmIl0sNiwuNSksbi5zdGFnZT0icmVzb2x2ZSIsbi5zdGFnZVQ9MDtyZXR1cm59aWYocC5hYisrLHBvKG4pLGk9PT0iZmx5b3V0Inx8aT09PSJncm91bmRvdXQiKW4ub3V0cysrLHAuc3RyZWFrPTAsbi5ldk91dCsrLHZuKG4saT09PSJmbHlvdXQiPyJGTFkgT1VUIjoiR1JPVU5EIE9VVCIsYCR7bi5vdXRzfSBPVVQke24ub3V0cz4xPyJTIjoiIn1gLCIjZmY4ZmIzIiwxMTUwKSxKaShuLGkpLG4uc2hha2U9TWF0aC5tYXgobi5zaGFrZSwzKTtlbHNle3AuaGl0cysrLHAuc3RyZWFrKysscC5iZXN0U3RyZWFrPU1hdGgubWF4KHAuYmVzdFN0cmVhayxwLnN0cmVhayk7Y29uc3QgZj1DaChuLGk9PT0iaHIiPzQ6aT09PSIzYiI/MzppPT09IjJiIj8yOjEpO24ucnVucys9ZixuLmNoZWVyPU1hdGgubWluKDEsbi5jaGVlcisoaT09PSJociI/MTouNTUpKSxuLmV2Q3JhY2srKyxpPT09ImhyIj8ocC5ocisrLG4uZXZIcisrLE5oKG4pLG4uc2hha2U9MTAsbi5mbGFzaD0uNSx2bihuLCJIT01FIFJVTiEiLGY+MT9gJHtmfSBSVU5TIFNDT1JFRGA6IlNPTE8gU0hPVCIsIiNmZmQxNjYiLDE3NTApKToobi5ldkNoZWVyKyssbi5zaGFrZT1NYXRoLm1heChuLnNoYWtlLDUpLHZuKG4seyIzYiI6IlRSSVBMRSEiLCIyYiI6IkRPVUJMRSEiLCIxYiI6IlNJTkdMRSEifVtpXSxmPjA/YCske2Z9IFJVTiR7Zj4xPyJTIjoiIn1gOiIiLCIjOGVmMDVhIiwxMjUwKSksSmkobixpKSxFZihuLGgqLjQ2LGgqLjc4LFsiI2ZmZmZmZiIsIiNmZmQxNjYiLCIjOGVmMDVhIl0sMTQsMS4xKX1uLnN0YWdlPSJyZXNvbHZlIixuLnN0YWdlVD0wfWZ1bmN0aW9uIEVoKG4sYSl7Y29uc3QgaT1uLnBpdGNoO2lmKGkpe2lmKG4uc3d1bmcpe24uc3RyaWtlcysrLG4uc3RhdHMuc3RyZWFrPTAsbi5ldldoaWZmKyssbi5zdHJpa2VzPj0zP1BmKG4pOihuLmV2U3RyaWtlKyssdm4obiwiU1dJTkcgQU5EIEEgTUlTUyIsaS5pblpvbmU/YFNUUklLRSAke24uc3RyaWtlc31gOiJjaGFzZWQgYSBiYWQgcGl0Y2giLCIjZmY1ZDhmIiwxMDUwKSxuLnN0YWdlPSJyZXNvbHZlIixuLnN0YWdlVD0wKTtyZXR1cm59aWYoaS5pblpvbmUpbi5zdHJpa2VzKyssbi5zdGF0cy5zdHJlYWs9MCxuLmV2U3RyaWtlKyssbi5zdHJpa2VzPj0zP1BmKG4pOih2bihuLCJDQUxMRUQgU1RSSUtFIixgU1RSSUtFICR7bi5zdHJpa2VzfSDigJQgVEFLRSBBIFNXSU5HIWAsIiNmZjVkOGYiLDk1MCksbi5zdGFnZT0icmVzb2x2ZSIsbi5zdGFnZVQ9MCk7ZWxzZXtpZihuLmJhbGxzKyssbi5ldkJhbGwrKyxuLmJhbGxzPj00KXtjb25zdCBjPU1oKG4pO24ucnVucys9YyxuLnN0YXRzLmFiKysscG8obiksbi5ldldhbGsrKyx2bihuLCJXQUxLISIsYz4wPyJQVVNIRUQgQSBSVU4gQUNST1NTIjoiVEFLRSBZT1VSIEJBU0UiLCIjNjJlNmZmIiwxMTUwKX1lbHNlIHZuKG4sIkJBTEwiLGBCQUxMICR7bi5iYWxsc31gLCIjZTVlMGQwIiw3NTApO24uc3RhZ2U9InJlc29sdmUiLG4uc3RhZ2VUPTB9fX1mdW5jdGlvbiBQZihuKXtuLm91dHMrKyxuLnN0YXRzLmFiKyssbi5zdGF0cy5rKyssbi5zdGF0cy5zdHJlYWs9MCxwbyhuKSxuLmV2SysrLG4uc2hha2U9TWF0aC5tYXgobi5zaGFrZSw0KSx2bihuLCJTVFJJS0VPVVQhIixgJHtuLm91dHN9IE9VVCR7bi5vdXRzPjE/IlMiOiIifWAsIiNmZjVkOGYiLDEzNTApLG4uc3RhZ2U9InJlc29sdmUiLG4uc3RhZ2VUPTB9ZnVuY3Rpb24gUGgobixhKXtpZihuLm92ZXJ8fCFuLnBpdGNoKXJldHVybiExO2lmKG4uc3dpbmdBbmltPTEsbi5zdGFnZT09PSJ3aW5kdXAiKXJldHVybiBuLnN3aW5nRWFybHk9ITAsbi5zd3VuZz0hMCwhMDtpZihuLnN0YWdlIT09ImZsaWdodCIpcmV0dXJuITE7Y29uc3QgaT1uLnN0YWdlVC1uLnBpdGNoLmZsaWdodDtpZihuLnN3dW5nPSEwLG4uZGlmZnMucHVzaChRcyhpLC00MDAsNDAwKSksbi5kaWZmcy5sZW5ndGg+NiYmbi5kaWZmcy5zaGlmdCgpLE1hdGguYWJzKGkpPD1hLndpbmRvdyl7Y29uc3QgYz0xLU1hdGguYWJzKGkpL2Eud2luZG93O2xldCBoO2NvbnN0IHA9TWF0aC5yYW5kb20oKTtyZXR1cm4gYz4uNzI/aD1wPC41NT8iaHIiOnA8Ljg/IjNiIjoiMmIiOmM+LjQyP2g9cDwuND8iMmIiOnA8Ljg1PyIxYiI6ImZseW91dCI6aD1wPC4zPyIxYiI6cDwuNjU/Imdyb3VuZG91dCI6ImZvdWwiLFRoKG4sYSxoKSxuLnJlY2VudFR5cGVzLnB1c2gobi5waXRjaC50eXBlKSxuLnJlY2VudFR5cGVzLmxlbmd0aD40JiZuLnJlY2VudFR5cGVzLnNoaWZ0KCksITB9cmV0dXJuITB9ZnVuY3Rpb24gTGgobixhLGksYyxoKXtuLnRpbWUrPWEsbi5zaGFrZT1NYXRoLm1heCgwLG4uc2hha2UtYSouMDQpLG4uZmxhc2g9TWF0aC5tYXgoMCxuLmZsYXNoLWEqLjAwMTQpLG4uY2hlZXI9TWF0aC5tYXgoMCxuLmNoZWVyLWEqNGUtNCksbi5zd2luZ0FuaW09TWF0aC5tYXgoMCxuLnN3aW5nQW5pbS1hKi4wMDYpO2ZvcihsZXQgbT1uLnBhcnRpY2xlcy5sZW5ndGgtMTttPj0wO20tLSl7Y29uc3QgZj1uLnBhcnRpY2xlc1ttXTtpZihmLmxpZmUtPWEsZi5saWZlPD0wKXtjb25zdCBnPW4ucGFydGljbGVzLnBvcCgpO2cmJm08bi5wYXJ0aWNsZXMubGVuZ3RoJiYobi5wYXJ0aWNsZXNbbV09Zyk7Y29udGludWV9Zi52eC09Zi52eCpmLmRyYWcqKGEvMWUzKSxmLnZ5Kz1mLmdyYXYqKGEvMWUzKS1mLnZ5KmYuZHJhZyooYS8xZTMpLGYueCs9Zi52eCooYS8xZTMpLGYueSs9Zi52eSooYS8xZTMpfWlmKCFoKXJldHVybjtuLmNvbnRhY3QmJihuLmNvbnRhY3QudCs9YSxuLmNvbnRhY3QudD49bi5jb250YWN0LmR1ciYmKG4uY29udGFjdD1udWxsKSksbi5zdGFnZVQrPWE7Y29uc3QgcD1uLnBpdGNoO24uc3RhZ2U9PT0iYmV0d2VlbiI/bi5zdGFnZVQ+NTYwJiZiaChuLGMpOm4uc3RhZ2U9PT0id2luZHVwIj9wJiZuLnN0YWdlVD49cC53aW5kdXAmJihuLnN0YWdlPSJmbGlnaHQiLG4uc3RhZ2VUPTAsbi5sYXN0UGl0Y2hMYWJlbD1gJHtqbFtwLnR5cGVdLm5hbWV9IMK3ICR7cC5tcGh9IE1QSGApOm4uc3RhZ2U9PT0iZmxpZ2h0Ij9wJiZuLnN0YWdlVD49cC5mbGlnaHQmJihuLnJlY2VudFR5cGVzLnB1c2gocC50eXBlKSxuLnJlY2VudFR5cGVzLmxlbmd0aD40JiZuLnJlY2VudFR5cGVzLnNoaWZ0KCksRWgobikpOm4uc3RhZ2U9PT0icmVzb2x2ZSI/bi5iYW5uZXImJm4uc3RhZ2VUPj1uLmJhbm5lci5kdXImJlJoKG4pOm4uc3RhZ2U9PT0iZW5kaW5nIiYmbi5zdGFnZVQ+MTUwMCYmKG4ub3Zlcj0hMCl9ZnVuY3Rpb24gX2gobixhKXtuLnN0YWdlPSJiZXR3ZWVuIixuLnN0YWdlVD0wLG4ucGl0Y2g9bnVsbH1jb25zdCBBaD1uPT4xKzIuNzAxNTgqTWF0aC5wb3cobi0xLDMpKzEuNzAxNTgqTWF0aC5wb3cobi0xLDIpLHJkPW49PjEtTWF0aC5wb3coMS1uLDMpLCRuPShuLGEsaSk9Pm4rKGEtbikqaSxXbj1uPT5NYXRoLm1heCgwLE1hdGgubWluKDEsbikpO2Z1bmN0aW9uIExmKG4sYSl7Y29uc3QgaT1uLncsYz1uLmgsaD1pLzYwMCxwPW4ucGl0Y2gsbT1hKmEsZj1pKi41MDUsZz1jKi40NDUsdj1pKi41K3AudGFyZ2V0WCpoLHg9YyouNzk1K3AuYnJlYWtZKmgqLjMyLGI9JG4oZix2LG0pK3AuYnJlYWtYKmgqTWF0aC5wb3coYSwyLjQpLFQ9JG4oZyx4LG0pLEE9KDMrOCpNYXRoLnBvdyhhLDEuNykpKmg7cmV0dXJue3g6Yix5OlQscjpBfX1mdW5jdGlvbiBJaChuLGEsaSxjKXtjb25zdCBoPW4uY3JlYXRlTGluZWFyR3JhZGllbnQoMCwwLDAsYyouNCk7aC5hZGRDb2xvclN0b3AoMCwiIzA3MGQyMiIpLGguYWRkQ29sb3JTdG9wKC42LCIjMGQxYjNkIiksaC5hZGRDb2xvclN0b3AoMSwiIzE1Mjk0ZiIpLG4uZmlsbFN0eWxlPWgsbi5maWxsUmVjdCgwLDAsaSxjKi40KSxuLmZpbGxTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIjtmb3IobGV0IHA9MDtwPDQwO3ArKyl7Y29uc3QgbT1wKjEzNy41JWkrNCxmPXAqODkuNyUoYyouMikrNCxnPS40Ky42Kk1hdGguYWJzKE1hdGguc2luKGEudGltZSouMDAxK3ApKTtuLmdsb2JhbEFscGhhPWcqLjcsbi5maWxsUmVjdChtLGYsMS40LDEuNCl9bi5nbG9iYWxBbHBoYT0xfWZ1bmN0aW9uIERoKG4sYSxpKXtmb3IoY29uc3QgYyBvZlsuMTMsLjg3XSl7Y29uc3QgaD1hKmMscD1pKi4xO24uc3Ryb2tlU3R5bGU9IiMxZDJjNGUiLG4ubGluZVdpZHRoPU1hdGgubWF4KDIsYSouMDA2KSxuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKGgscCtpKi4wMyksbi5saW5lVG8oaCxpKi4zKSxuLnN0cm9rZSgpLG4uZmlsbFN0eWxlPSIjMjIzNDU4IixuLmZpbGxSZWN0KGgtYSouMDQ1LHAtaSouMDIsYSouMDksaSouMDQ1KTtmb3IobGV0IGc9MDtnPDY7ZysrKXtjb25zdCB2PWgtYSouMDM1K2clMyphKi4wMzUseD1wLWkqLjAxMitNYXRoLmZsb29yKGcvMykqaSouMDIyO24uZmlsbFN0eWxlPSIjZmZmNmQ4IixuLmJlZ2luUGF0aCgpLG4uYXJjKHYseCxhKi4wMDcsMCxNYXRoLlBJKjIpLG4uZmlsbCgpfWNvbnN0IG09bi5jcmVhdGVMaW5lYXJHcmFkaWVudChoLHAsYSouNSxpKi42KTttLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDI1NSwyNDYsMjE2LDAuMTApIiksbS5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsMjQ2LDIxNiwwKSIpLG4uZmlsbFN0eWxlPW0sbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhoLWEqLjAzLHAraSouMDIpLG4ubGluZVRvKGEqLjUtYSouMTYsaSouNjIpLG4ubGluZVRvKGEqLjUrYSouMTYsaSouNjIpLG4ubGluZVRvKGgrYSouMDMscCtpKi4wMiksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKTtjb25zdCBmPW4uY3JlYXRlUmFkaWFsR3JhZGllbnQoaCxwLDAsaCxwLGEqLjA5KTtmLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDI1NSwyNDYsMjE2LDAuMjgpIiksZi5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsMjQ2LDIxNiwwKSIpLG4uZmlsbFN0eWxlPWYsbi5maWxsUmVjdChoLWEqLjEscC1hKi4xLGEqLjIsYSouMil9fWZ1bmN0aW9uIHpoKG4sYSxpLGMpe2NvbnN0IGg9bi5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLGMqLjI0LDAsYyouMzgpO2guYWRkQ29sb3JTdG9wKDAsIiMxMDFhMzMiKSxoLmFkZENvbG9yU3RvcCgxLCIjMWEyNTQyIiksbi5maWxsU3R5bGU9aCxuLmZpbGxSZWN0KDAsYyouMjQsaSxjKi4xNCksbi5zdHJva2VTdHlsZT0icmdiYSgwLDAsMCwwLjM1KSIsbi5saW5lV2lkdGg9MTtmb3IobGV0IG09MTttPDQ7bSsrKW4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oMCxjKiguMjQrbSouMDM1KSksbi5saW5lVG8oaSxjKiguMjQrbSouMDM1KSksbi5zdHJva2UoKTtjb25zdCBwPWEuY2hlZXIqMi42O2Zvcihjb25zdCBtIG9mIGEuY3Jvd2Qpe2NvbnN0IGY9bS54KmksZz1jKi4yNDUrbS55KmMqLjEyNStNYXRoLnNpbihhLnRpbWUqLjAwNCttLnR3KSooLjQrcCk7bi5maWxsU3R5bGU9bS5jLG4uZ2xvYmFsQWxwaGE9Ljc1LG4uZmlsbFJlY3QoZixnLE1hdGgubWF4KDEuNixpKi4wMDQpLE1hdGgubWF4KDEuNixpKi4wMDQpKX1pZihuLmdsb2JhbEFscGhhPTEsYS5jaGVlcj4uMzUpe2NvbnN0IG09TWF0aC5mbG9vcihhLmNoZWVyKjcpO2ZvcihsZXQgZj0wO2Y8bTtmKyspe2NvbnN0IGc9TWF0aC5mbG9vcihhLnRpbWUvOTApKjMxK2YqMTcsdj1nKjk3MSUxZTMvMWUzKmkseD1jKi4yNStnKjU1NyUxZTMvMWUzKmMqLjExO24uZmlsbFN0eWxlPSIjZmZmZmZmIixuLmdsb2JhbEFscGhhPS45LG4uZmlsbFJlY3Qodix4LDIuNCwyLjQpfW4uZ2xvYmFsQWxwaGE9MX1uLmZpbGxTdHlsZT0iIzBmMmY0ZCIsbi5maWxsUmVjdCgwLGMqLjM4LGksYyouMDM1KSxuLmZpbGxTdHlsZT0iI2ZmZDE2NiIsbi5maWxsUmVjdCgwLGMqLjM4LGksTWF0aC5tYXgoMixjKi4wMDQpKSxuLmZpbGxTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjU1KSIsbi5mb250PWA3MDAgJHtNYXRoLnJvdW5kKGkqLjAxOCl9cHggIkNoYWtyYSBQZXRjaCIsIHNhbnMtc2VyaWZgLG4udGV4dEFsaWduPSJjZW50ZXIiLG4uZmlsbFRleHQoIjM4NSIsaSouNSxjKi40MDUpfWZ1bmN0aW9uIE9oKG4sYSxpKXtjb25zdCBjPWkqLjQxNSxoPTc7Zm9yKGxldCBnPTA7ZzxoO2crKyl7Y29uc3Qgdj1NYXRoLnBvdyhnL2gsMS4yNSkseD1NYXRoLnBvdygoZysxKS9oLDEuMjUpO24uZmlsbFN0eWxlPWclMj09PTA/IiMxZTdkNDMiOiIjMWE3MDM5IixuLmZpbGxSZWN0KDAsYysoaS1jKSp2LGEsKGktYykqKHgtdikrMSl9bi5zdHJva2VTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjY1KSIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMS41LGEqLjAwMyksbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhKi40NjUsaSouODc1KSxuLmxpbmVUbyhhKi4wMSxpKi40Myksbi5tb3ZlVG8oYSouNTM1LGkqLjg3NSksbi5saW5lVG8oYSouOTksaSouNDMpLG4uc3Ryb2tlKCksbi5maWxsU3R5bGU9IiNhMDZhM2YiLG4uYmVnaW5QYXRoKCksbi5lbGxpcHNlKGEqLjUsaSouNSxhKi4wNzUsaSouMDI4LDAsMCxNYXRoLlBJKjIpLG4uZmlsbCgpLG4uZmlsbFN0eWxlPSIjZTVlMGQwIixuLmZpbGxSZWN0KGEqLjQ5MixpKi41MDUsYSouMDE2LGkqLjAwNiksbi5maWxsU3R5bGU9IiNhMDZhM2YiLG4uYmVnaW5QYXRoKCksbi5lbGxpcHNlKGEqLjUsaSouOSxhKi4xOSxpKi4wNzUsMCxNYXRoLlBJLE1hdGguUEkqMiksbi5maWxsKCksbi5maWxsU3R5bGU9IiNmMmVkZTAiLG4uYmVnaW5QYXRoKCk7Y29uc3QgcD1hKi41LG09aSouODcyLGY9YSouMDIyO24ubW92ZVRvKHAtZixtLWYqLjYpLG4ubGluZVRvKHArZixtLWYqLjYpLG4ubGluZVRvKHArZixtK2YqLjIpLG4ubGluZVRvKHAsbStmKi43KSxuLmxpbmVUbyhwLWYsbStmKi4yKSxuLmNsb3NlUGF0aCgpLG4uZmlsbCgpfWZ1bmN0aW9uIEZoKG4sYSxpKXtjb25zdCBjPWEudyxoPWEuaCxwPWMqLjUsbT1oKi40OTcsZj1jKi4wNjI7bi5zYXZlKCksbi50cmFuc2xhdGUocCxtKTtsZXQgZz0wLHY9MCx4PTA7aT49MCYmaTwxPyhnPWk8LjQ/aS8uNDppPi43NT9NYXRoLm1heCgwLDEtKGktLjc1KS8uMjUpOjEsdj1XbigoaS0uMzUpLy4zKSx4PVduKChpLS43KS8uMykqLjM1KTppPj0xJiYoeD0uMzUsdj0xKSxuLnJvdGF0ZSh4Ki4zKSxuLmxpbmVDYXA9InJvdW5kIixuLnN0cm9rZVN0eWxlPSIjZTVlMGQwIixuLmxpbmVXaWR0aD1mKi4xNixuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKDAsLWYqLjQ1KSxuLmxpbmVUbygtZiouMTYsMCksbi5zdHJva2UoKSxuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKDAsLWYqLjQ1KSxuLmxpbmVUbyhmKi4xNCtnKmYqLjEsLWcqZiouMyksbi5zdHJva2UoKSxuLnN0cm9rZVN0eWxlPSIjM2I2ZmQ0IixuLmxpbmVXaWR0aD1mKi4yMixuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKDAsLWYqLjQ1KSxuLmxpbmVUbyhmKi4wNSwtZiouODUpLG4uc3Ryb2tlKCksbi5zdHJva2VTdHlsZT0iIzNiNmZkNCIsbi5saW5lV2lkdGg9ZiouMTMsbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhmKi4wMywtZiouNzgpLG4ubGluZVRvKC1mKi4yMi1nKmYqLjA4LC1mKi43KSxuLnN0cm9rZSgpLG4uZmlsbFN0eWxlPSIjOGE1YTM0IixuLmJlZ2luUGF0aCgpLG4uYXJjKC1mKi4yNC1nKmYqLjA4LC1mKi43LGYqLjA5LDAsTWF0aC5QSSoyKSxuLmZpbGwoKTtjb25zdCBiPS0uNi12KjIuMSsoaT49Ljg1P1duKChpLS44NSkvLjE1KSoyLjY6MCk7bi5zYXZlKCksbi50cmFuc2xhdGUoZiouMDUsLWYqLjgpLG4ucm90YXRlKGIpLG4uc3Ryb2tlU3R5bGU9IiMzYjZmZDQiLG4ubGluZVdpZHRoPWYqLjEzLG4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oMCwwKSxuLmxpbmVUbyhmKi4zLDApLG4uc3Ryb2tlKCksaTwuOTgmJihuLmZpbGxTdHlsZT0iI2ZmZmZmZiIsbi5iZWdpblBhdGgoKSxuLmFyYyhmKi4zNCwwLGYqLjA4LDAsTWF0aC5QSSoyKSxuLmZpbGwoKSksbi5yZXN0b3JlKCksbi5maWxsU3R5bGU9IiNkOWEwNjYiLG4uYmVnaW5QYXRoKCksbi5hcmMoZiouMDcsLWYqLjk4LGYqLjEzLDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLmZpbGxTdHlsZT0iIzIzM2M3NCIsbi5iZWdpblBhdGgoKSxuLmFyYyhmKi4wNywtZioxLjAyLGYqLjEzLE1hdGguUEksTWF0aC5QSSoyKSxuLmZpbGwoKSxuLmZpbGxSZWN0KGYqLjA3LC1mKjEuMDQsZiouMixmKi4wNSksbi5yZXN0b3JlKCl9ZnVuY3Rpb24gQmgobixhKXtjb25zdCBpPWEudyxjPWEuaCxoPWkqLjM1NSxwPWMqLjkzLG09aSouMDg1LGY9TWF0aC5zaW4oYS50aW1lKi4wMDQpKm0qLjAyO24uc2F2ZSgpLG4udHJhbnNsYXRlKGgscCtmKTtjb25zdCBnPXJkKFduKCgxLWEuc3dpbmdBbmltKSoxLjcpKSx2PSRuKC0xLDEuNSxhLnN3aW5nQW5pbT4wP2c6MCkrKGEuc3dpbmdBbmltPjA/MDpNYXRoLnNpbihhLnRpbWUqLjAwNCkqLjA1KTtuLnN0cm9rZVN0eWxlPSIjY2ZkNmU0IixuLmxpbmVXaWR0aD1tKi4xNixuLmxpbmVDYXA9InJvdW5kIixuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKC1tKi4xLC1tKi41KSxuLmxpbmVUbygtbSouMiwwKSxuLm1vdmVUbyhtKi4wOCwtbSouNSksbi5saW5lVG8obSouMiwwKSxuLnN0cm9rZSgpLG4uc3Ryb2tlU3R5bGU9IiNjNDNiM2IiLG4ubGluZVdpZHRoPW0qLjI2LG4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oMCwtbSouNSksbi5saW5lVG8obSouMDIsLW0qMS4wNSksbi5zdHJva2UoKSxuLmZpbGxTdHlsZT0iIzhmMjYyNiIsbi5iZWdpblBhdGgoKSxuLmFyYyhtKi4wNCwtbSoxLjIyLG0qLjE2LDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLnNhdmUoKSxuLnRyYW5zbGF0ZShtKi4xLC1tKi45NSksbi5yb3RhdGUodiksYS5zd2luZ0FuaW0+LjE1JiYobi5zdHJva2VTdHlsZT1gcmdiYSgyNTUsMjU1LDI1NSwkeyhhLnN3aW5nQW5pbS0uMTUpKi41NX0pYCxuLmxpbmVXaWR0aD1tKi4yMixuLmJlZ2luUGF0aCgpLG4uYXJjKDAsMCxtKi45NSwtLjQsLjcpLG4uc3Ryb2tlKCkpLG4uc3Ryb2tlU3R5bGU9IiNkOGIwNmEiLG4ubGluZVdpZHRoPW0qLjExLG4uYmVnaW5QYXRoKCksbi5tb3ZlVG8oMCwwKSxuLmxpbmVUbyhtKi45NSwtbSouMjUpLG4uc3Ryb2tlKCksbi5yZXN0b3JlKCksbi5yZXN0b3JlKCl9ZnVuY3Rpb24gJGgobixhLGkpe2NvbnN0IGM9YS53LGg9YS5oLHA9YyouMDc4LG09YyouNSxmPWgqLjc5NTtuLnN0cm9rZVN0eWxlPWByZ2JhKDI0MiwyMzcsMjI0LCR7LjM4Kml9KWAsbi5saW5lV2lkdGg9TWF0aC5tYXgoMS41LGMqLjAwMjgpLG4uc2V0TGluZURhc2goWzYsNV0pLG4uc3Ryb2tlUmVjdChtLXAsZi1wKi44NSxwKjIscCoxLjcpLG4uc2V0TGluZURhc2goW10pfWZ1bmN0aW9uIGVvKG4sYSxpLGMsaCxwPTEpe24uc2F2ZSgpLG4uZ2xvYmFsQWxwaGE9cDtjb25zdCBtPW4uY3JlYXRlUmFkaWFsR3JhZGllbnQoYSxpLDAsYSxpLGMqMi42KTttLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDI1NSwyNTUsMjU1LDAuMzUpIiksbS5hZGRDb2xvclN0b3AoMSwicmdiYSgyNTUsMjU1LDI1NSwwKSIpLG4uZmlsbFN0eWxlPW0sbi5maWxsUmVjdChhLWMqMyxpLWMqMyxjKjYsYyo2KSxuLmZpbGxTdHlsZT0iI2ZmZmZmZiIsbi5iZWdpblBhdGgoKSxuLmFyYyhhLGksYywwLE1hdGguUEkqMiksbi5maWxsKCksbi5zdHJva2VTdHlsZT0iI2Q0M2IzYiIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMSxjKi4xNiksbi5iZWdpblBhdGgoKSxuLmFyYyhhLWMqLjQ1LGksYyouNzUsLS45K2gsLjkraCksbi5zdHJva2UoKSxuLmJlZ2luUGF0aCgpLG4uYXJjKGErYyouNDUsaSxjKi43NSxNYXRoLlBJLS45LWgsTWF0aC5QSSsuOS1oKSxuLnN0cm9rZSgpLG4ucmVzdG9yZSgpfWZ1bmN0aW9uIFdoKG4sYSxpLGMsaCl7bi5jbGVhclJlY3QoMCwwLGksYyksbi5zYXZlKCksYS5zaGFrZT4wJiZuLnRyYW5zbGF0ZSgoTWF0aC5yYW5kb20oKS0uNSkqYS5zaGFrZSwoTWF0aC5yYW5kb20oKS0uNSkqYS5zaGFrZSksSWgobixhLGksYyksRGgobixpLGMpLHpoKG4sYSxpLGMpLE9oKG4saSxjKTtsZXQgcD0tMTtpZihhLnN0YWdlPT09IndpbmR1cCImJmEucGl0Y2g/cD1hLnN0YWdlVC9hLnBpdGNoLndpbmR1cDphLnN0YWdlPT09ImZsaWdodCImJmEucGl0Y2gmJihwPTErYS5zdGFnZVQvNDAwKSxGaChuLGEscCksKGg9PT0icnVubmluZyJ8fGg9PT0icGF1c2VkInx8aD09PSJyZWFkeSIpJiYkaChuLGEsMSksYS5zdGFnZT09PSJmbGlnaHQiJiZhLnBpdGNoJiYhYS5jb250YWN0KXtjb25zdCBmPVduKGEuc3RhZ2VUL2EucGl0Y2guZmxpZ2h0KTtmb3IoY29uc3Rbdix4XW9mW1suMTQsLjEyXSxbLjA5LC4yMl0sWy4wNDUsLjM4XV0paWYoZi12PjApe2NvbnN0IGI9TGYoYSxmLXYpO2VvKG4sYi54LGIueSxiLnIqLjg1LDAseCl9Y29uc3QgZz1MZihhLGYpO2VvKG4sZy54LGcueSxnLnIsYS50aW1lKi4wMyl9aWYoYS5jb250YWN0KXtjb25zdCBmPWEuY29udGFjdCxnPXJkKFduKGYudC9mLmR1cikpLHY9JG4oZi54MCxmLngxLGcpLHg9JG4oZi55MCxmLnkxLGcpLU1hdGguc2luKE1hdGguUEkqZykqZi5hcmMsYj0kbihpKi4wMTEsaSouMDA0LGcpO2Zvcihjb25zdFtULEFdb2ZbWy4xLC4xNV0sWy4wNSwuM11dKWlmKGctVD4wKXtjb25zdCBlZT1nLVQ7bi5nbG9iYWxBbHBoYT1BLG4uZmlsbFN0eWxlPSIjZmZmZmZmIixuLmJlZ2luUGF0aCgpLG4uYXJjKCRuKGYueDAsZi54MSxlZSksJG4oZi55MCxmLnkxLGVlKS1NYXRoLnNpbihNYXRoLlBJKmVlKSpmLmFyYyxiKi44LDAsTWF0aC5QSSoyKSxuLmZpbGwoKSxuLmdsb2JhbEFscGhhPTF9ZzwuOTgmJmVvKG4sdix4LGIsYS50aW1lKi4wNSl9QmgobixhKTtmb3IoY29uc3QgZiBvZiBhLnBhcnRpY2xlcyluLmdsb2JhbEFscGhhPVduKGYubGlmZS9mLm1heExpZmUpLG4uZmlsbFN0eWxlPWYuY29sb3Isbi5maWxsUmVjdChmLngtZi5zaXplLzIsZi55LWYuc2l6ZS8yLGYuc2l6ZSxmLnNpemUpO24uZ2xvYmFsQWxwaGE9MTtjb25zdCBtPW4uY3JlYXRlUmFkaWFsR3JhZGllbnQoaS8yLGMvMixjKi4zNSxpLzIsYy8yLGMqLjc4KTtpZihtLmFkZENvbG9yU3RvcCgwLCJyZ2JhKDAsMCwwLDApIiksbS5hZGRDb2xvclN0b3AoMSwicmdiYSgwLDAsMCwwLjQyKSIpLG4uZmlsbFN0eWxlPW0sbi5maWxsUmVjdCgwLDAsaSxjKSxuLnJlc3RvcmUoKSxhLmZsYXNoPjAmJihuLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjQxLDIxNCwke2EuZmxhc2gqLjN9KWAsbi5maWxsUmVjdCgwLDAsaSxjKSksYS5iYW5uZXImJihhLnN0YWdlPT09InJlc29sdmUifHxhLnN0YWdlPT09ImVuZGluZyIpKXtjb25zdCBmPWEuYmFubmVyLGc9V24oYS5zdGFnZVQvMTYwKSx2PWc8MT8uNSsuNSpBaChnKToxLHg9Zi5kdXItYS5zdGFnZVQ8MjIwP01hdGgubWF4KDAsKGYuZHVyLWEuc3RhZ2VUKS8yMjApOjE7bi5zYXZlKCksbi50cmFuc2xhdGUoaS8yLGMqLjMpLG4uc2NhbGUodix2KSxuLmdsb2JhbEFscGhhPXgsbi50ZXh0QWxpZ249ImNlbnRlciIsbi50ZXh0QmFzZWxpbmU9Im1pZGRsZSIsbi5mb250PWAke01hdGgucm91bmQoaSouMDUyKX1weCAiUHJlc3MgU3RhcnQgMlAiLCBtb25vc3BhY2VgLG4ubGluZVdpZHRoPWkqLjAxMixuLnN0cm9rZVN0eWxlPSJyZ2JhKDcsMTMsMzQsMC45KSIsbi5zdHJva2VUZXh0KGYudHh0LDAsMCksbi5maWxsU3R5bGU9Zi5jb2xvcixuLnNoYWRvd0NvbG9yPWYuY29sb3Isbi5zaGFkb3dCbHVyPTI2LG4uZmlsbFRleHQoZi50eHQsMCwwKSxuLnNoYWRvd0JsdXI9MCxmLnN1YiYmKG4uZm9udD1gNzAwICR7TWF0aC5yb3VuZChpKi4wMjYpfXB4ICJDaGFrcmEgUGV0Y2giLCBzYW5zLXNlcmlmYCxuLnN0cm9rZVN0eWxlPSJyZ2JhKDcsMTMsMzQsMC45KSIsbi5saW5lV2lkdGg9aSouMDA2LG4uc3Ryb2tlVGV4dChmLnN1YiwwLGkqLjA1NSksbi5maWxsU3R5bGU9IiNmMmVkZTAiLG4uZmlsbFRleHQoZi5zdWIsMCxpKi4wNTUpKSxuLnJlc3RvcmUoKX0oaD09PSJydW5uaW5nInx8aD09PSJwYXVzZWQiKSYmYS5sYXN0UGl0Y2hMYWJlbCE9PSLigJQiJiYobi5mb250PWA3MDAgJHtNYXRoLnJvdW5kKGkqLjAyMSl9cHggIkNoYWtyYSBQZXRjaCIsIHNhbnMtc2VyaWZgLG4udGV4dEFsaWduPSJyaWdodCIsbi5maWxsU3R5bGU9InJnYmEoMjQyLDIzNywyMjQsMC43NSkiLG4uZmlsbFRleHQoYS5sYXN0UGl0Y2hMYWJlbCxpLWkqLjAzLGMtaSouMDI1KSl9Y29uc3QgbGQ9InNsdWdnZXJuaWdodC5iZXN0cy52MSIsc2Q9InNsdWdnZXJuaWdodC5kaWZmLnYxIjtmdW5jdGlvbiBVaCgpe2NvbnN0IG49e3Jvb2tpZTowLG1ham9yOjAsYWxsc3RhcjowfTt0cnl7Y29uc3QgYT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShsZCk7aWYoIWEpcmV0dXJuIG47Y29uc3QgaT1KU09OLnBhcnNlKGEpO3JldHVybntyb29raWU6TnVtYmVyKGkucm9va2llKXx8MCxtYWpvcjpOdW1iZXIoaS5tYWpvcil8fDAsYWxsc3RhcjpOdW1iZXIoaS5hbGxzdGFyKXx8MH19Y2F0Y2h7cmV0dXJuIG59fWZ1bmN0aW9uIEhoKCl7dHJ5e2NvbnN0IG49bG9jYWxTdG9yYWdlLmdldEl0ZW0oc2QpO2lmKG49PT0icm9va2llInx8bj09PSJtYWpvciJ8fG49PT0iYWxsc3RhciIpcmV0dXJuIG59Y2F0Y2h7fXJldHVybiJtYWpvciJ9ZnVuY3Rpb24gVmgoKXtjb25zdCBuPWoudXNlUmVmKG51bGwpLGE9ai51c2VSZWYobnVsbCksaT1qLnVzZVJlZihaaSgpKSxjPWoudXNlUmVmKHt3OjAsaDowfSksaD1qLnVzZVJlZigwKSxwPWoudXNlUmVmKDApLG09ai51c2VSZWYoe2FiOjAsaGl0czowLGhyOjAsazowLHN0cmVhazowLGJlc3RTdHJlYWs6MH0pLGY9ai51c2VSZWYoe2NyYWNrOjAsZm91bDowLHdoaWZmOjAsc3RyaWtlOjAsYmFsbDowLHdhbGs6MCxvdXQ6MCxjaGVlcjowLGhyOjAsazowfSksW2csdl09ai51c2VTdGF0ZSgiaWRsZSIpLHg9ai51c2VSZWYoImlkbGUiKSxbYixUXT1qLnVzZVN0YXRlKDApLFtBLGVlXT1qLnVzZVN0YXRlKDApLFtyZSwkXT1qLnVzZVN0YXRlKDApLFtnZSxkZV09ai51c2VTdGF0ZSgwKSxbYWUsaGVdPWoudXNlU3RhdGUoWyExLCExLCExXSksW1hlLFJlXT1qLnVzZVN0YXRlKHthYjowLGhpdHM6MCxocjowLGs6MCxzdHJlYWs6MCxiZXN0U3RyZWFrOjB9KSxbRWUsJGVdPWoudXNlU3RhdGUoIuKAlCIpLFtEZSx6ZV09ai51c2VTdGF0ZSgwKSxbSGUsT2VdPWoudXNlU3RhdGUoITEpLFtfZSxLZV09ai51c2VTdGF0ZShIaCksRmU9ai51c2VSZWYoX2UpLFt3ZSxpZV09ai51c2VTdGF0ZShVaCksUD1qLnVzZVJlZih3ZSksW0ssX109ai51c2VTdGF0ZShSbCksaz1qLnVzZVJlZihLKSxSPWoudXNlQ2FsbGJhY2soSD0+e3guY3VycmVudD1ILHYoSCl9LFtdKSxsZT1qLnVzZUNhbGxiYWNrKCgpPT57aC5jdXJyZW50JiYod2luZG93LmNsZWFyVGltZW91dChoLmN1cnJlbnQpLGguY3VycmVudD0wKX0sW10pLEk9ai51c2VDYWxsYmFjayhIPT57bGUoKSxSKCJyZWFkeSIpLGguY3VycmVudD13aW5kb3cuc2V0VGltZW91dCgoKT0+e2guY3VycmVudD0wLHguY3VycmVudD09PSJyZWFkeSImJlIoInJ1bm5pbmciKX0sSCl9LFtsZSxSXSksVT1qLnVzZUNhbGxiYWNrKCgpPT57anQoKSxsZSgpO2NvbnN0e3c6SCxoOnZlfT1jLmN1cnJlbnQ7aS5jdXJyZW50PVppKEh8fDYwMCx2ZXx8NjAwKSxfaChpLmN1cnJlbnQsWGlbRmUuY3VycmVudF0pO2NvbnN0IEY9aS5jdXJyZW50O2YuY3VycmVudD17Y3JhY2s6Ri5ldkNyYWNrLGZvdWw6Ri5ldkZvdWwsd2hpZmY6Ri5ldldoaWZmLHN0cmlrZTpGLmV2U3RyaWtlLGJhbGw6Ri5ldkJhbGwsd2FsazpGLmV2V2FsayxvdXQ6Ri5ldk91dCxjaGVlcjpGLmV2Q2hlZXIsaHI6Ri5ldkhyLGs6Ri5ldkt9LFQoMCksZWUoMCksJCgwKSxkZSgwKSxoZShbITEsITEsITFdKSxSZSh7YWI6MCxoaXRzOjAsaHI6MCxrOjAsc3RyZWFrOjAsYmVzdFN0cmVhazowfSksJGUoIuKAlCIpLE9lKCExKSxJKDFlMyl9LFtsZSxJXSksdGU9ai51c2VDYWxsYmFjaygoKT0+e3guY3VycmVudD09PSJydW5uaW5nIiYmKGxlKCksUigicGF1c2VkIikpfSxbbGUsUl0pLHVlPWoudXNlQ2FsbGJhY2soKCk9Pnt4LmN1cnJlbnQ9PT0icGF1c2VkIiYmKGp0KCksSSg2MDApKX0sW0ldKSxWPWoudXNlQ2FsbGJhY2soKCk9PntqdCgpO2NvbnN0IEg9eC5jdXJyZW50O2lmKEg9PT0iaWRsZSJ8fEg9PT0ib3ZlciIpe1UoKTtyZXR1cm59SD09PSJydW5uaW5nIiYmUGgoaS5jdXJyZW50LFhpW0ZlLmN1cnJlbnRdKX0sW1VdKSxwZT1qLnVzZUNhbGxiYWNrKEg9Pntjb25zdCB2ZT14LmN1cnJlbnQ7aWYodmU9PT0icnVubmluZyJ8fHZlPT09InJlYWR5Inx8dmU9PT0icGF1c2VkIilyZXR1cm47RmUuY3VycmVudD1ILEtlKEgpO3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzZCxIKX1jYXRjaHt9Y29uc3R7dzpGLGg6a2V9PWMuY3VycmVudDtpLmN1cnJlbnQ9WmkoRnx8NjAwLGtlfHw2MDApLFQoMCksZWUoMCksJCgwKSxkZSgwKSxoZShbITEsITEsITFdKSxSZSh7YWI6MCxoaXRzOjAsaHI6MCxrOjAsc3RyZWFrOjAsYmVzdFN0cmVhazowfSksJGUoIuKAlCIpLE9lKCExKX0sW10pLHE9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEg9IWsuY3VycmVudDtrLmN1cnJlbnQ9SCxfKEgpLHNuKEgpLFRsKEgpfSxbXSksbWU9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IEg9aS5jdXJyZW50O3F0LnN0cmlrZW91dCgpO2NvbnN0IHZlPUZlLmN1cnJlbnQsRj1ILnJ1bnM7aWYoRj5QLmN1cnJlbnRbdmVdKXtjb25zdCBrZT17Li4uUC5jdXJyZW50LFt2ZV06Rn07UC5jdXJyZW50PWtlLGllKGtlKSxPZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGxkLEpTT04uc3RyaW5naWZ5KGtlKSl9Y2F0Y2h7fX1SKCJvdmVyIil9LFtSXSk7cmV0dXJuIGoudXNlRWZmZWN0KCgpPT57c24oay5jdXJyZW50KTtsZXQgSD0wO2NvbnN0IHZlPUI9Pntjb25zdCBPPWkuY3VycmVudCxQZT1PLmxhc3Q/TWF0aC5taW4oNjAsQi1PLmxhc3QpOjE2O08ubGFzdD1CO2NvbnN0IGplPWMuY3VycmVudDtqZS53PjAmJihPLnc9amUudyxPLmg9amUuaCk7Y29uc3QgVz14LmN1cnJlbnQ7TGgoTyxQZSxCLFhpW0ZlLmN1cnJlbnRdLFc9PT0icnVubmluZyIpLE8ucnVucyE9PXAuY3VycmVudCYmKHAuY3VycmVudD1PLnJ1bnMsVChPLnJ1bnMpLHplKGFuPT5hbisxKSksZWUoTy5vdXRzKSwkKE8uYmFsbHMpLGRlKE8uc3RyaWtlcyksaGUoTy5iYXNlcyk7Y29uc3QgYmU9Ty5zdGF0cyx4ZT1tLmN1cnJlbnQ7KGJlLmFiIT09eGUuYWJ8fGJlLmhpdHMhPT14ZS5oaXRzfHxiZS5ociE9PXhlLmhyfHxiZS5rIT09eGUua3x8YmUuc3RyZWFrIT09eGUuc3RyZWFrfHxiZS5iZXN0U3RyZWFrIT09eGUuYmVzdFN0cmVhaykmJihtLmN1cnJlbnQ9ey4uLmJlfSxSZSh7Li4uYmV9KSksJGUoTy5sYXN0UGl0Y2hMYWJlbCk7Y29uc3Qgb2U9Zi5jdXJyZW50O08uZXZDcmFjayE9PW9lLmNyYWNrJiYob2UuY3JhY2s9Ty5ldkNyYWNrLHF0LmNyYWNrKCkpLE8uZXZGb3VsIT09b2UuZm91bCYmKG9lLmZvdWw9Ty5ldkZvdWwscXQuZm91bCgpKSxPLmV2V2hpZmYhPT1vZS53aGlmZiYmKG9lLndoaWZmPU8uZXZXaGlmZixxdC53aGlmZigpKSxPLmV2U3RyaWtlIT09b2Uuc3RyaWtlJiYob2Uuc3RyaWtlPU8uZXZTdHJpa2UscXQuc3RyaWtlKCkpLE8uZXZCYWxsIT09b2UuYmFsbCYmKG9lLmJhbGw9Ty5ldkJhbGwscXQuYmFsbCgpKSxPLmV2V2FsayE9PW9lLndhbGsmJihvZS53YWxrPU8uZXZXYWxrLHF0LndhbGsoKSksTy5ldk91dCE9PW9lLm91dCYmKG9lLm91dD1PLmV2T3V0LHF0Lm91dCgpKSxPLmV2Q2hlZXIhPT1vZS5jaGVlciYmKG9lLmNoZWVyPU8uZXZDaGVlcixxdC5jaGVlcigpKSxPLmV2SHIhPT1vZS5ociYmKG9lLmhyPU8uZXZIcixxdC5ocigpKSxPLmV2SyE9PW9lLmsmJihvZS5rPU8uZXZLLHF0LnN0cmlrZW91dCgpKSxXPT09InJ1bm5pbmciJiZPLm92ZXImJm1lKCk7Y29uc3QgcnQ9bi5jdXJyZW50O2lmKHJ0JiZqZS53PjApe2NvbnN0IGFuPXJ0LmdldENvbnRleHQoIjJkIik7YW4mJldoKGFuLE8samUudyxqZS5oLFcpfUg9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHZlKX07SD1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodmUpO2NvbnN0IEY9YS5jdXJyZW50LGtlPW4uY3VycmVudDtsZXQgU2U9bnVsbDtpZihGJiZrZSl7Y29uc3QgQj0oKT0+e2NvbnN0IE89Ri5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxQZT1NYXRoLm1heCgwLE1hdGguZmxvb3IoTWF0aC5taW4oTy53aWR0aCxPLmhlaWdodCkpKSxqZT1NYXRoLm1pbigyLHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKTtrZS53aWR0aD1NYXRoLnJvdW5kKFBlKmplKSxrZS5oZWlnaHQ9TWF0aC5yb3VuZChQZSpqZSksa2Uuc3R5bGUud2lkdGg9YCR7UGV9cHhgLGtlLnN0eWxlLmhlaWdodD1gJHtQZX1weGAsYy5jdXJyZW50PXt3OlBlLGg6UGV9O2NvbnN0IFc9a2UuZ2V0Q29udGV4dCgiMmQiKTtXJiZXLnNldFRyYW5zZm9ybShqZSwwLDAsamUsMCwwKX07QigpLFNlPW5ldyBSZXNpemVPYnNlcnZlcihCKSxTZS5vYnNlcnZlKEYpfWNvbnN0IFk9Qj0+e2NvbnN0IE89Qi5rZXkudG9Mb3dlckNhc2UoKTtpZihPPT09IiAifHxPPT09ImVudGVyIil7Qi5wcmV2ZW50RGVmYXVsdCgpLEIucmVwZWF0fHxWKCk7cmV0dXJufWlmKE89PT0iciIpe1UoKTtyZXR1cm59aWYoTz09PSJwInx8Tz09PSJlc2NhcGUiKXtjb25zdCBQZT14LmN1cnJlbnQ7UGU9PT0icnVubmluZyI/dGUoKTpQZT09PSJwYXVzZWQiJiZ1ZSgpO3JldHVybn1pZihPPT09Im0iKXtxKCk7cmV0dXJufU89PT0iMSImJnBlKCJyb29raWUiKSxPPT09IjIiJiZwZSgibWFqb3IiKSxPPT09IjMiJiZwZSgiYWxsc3RhciIpfTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsWSk7Y29uc3QgV2U9KCk9Pntkb2N1bWVudC5oaWRkZW4mJnguY3VycmVudD09PSJydW5uaW5nIiYmdGUoKX0sTmU9KCk9Pnt4LmN1cnJlbnQ9PT0icnVubmluZyImJnRlKCl9O3JldHVybiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixXZSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImJsdXIiLE5lKSwoKT0+e2NhbmNlbEFuaW1hdGlvbkZyYW1lKEgpLGxlKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLFkpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLFdlKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYmx1ciIsTmUpLFNlJiZTZS5kaXNjb25uZWN0KCl9fSxbcGUsbGUsbWUsdGUsdWUsVSxWLHFdKSx7Y2FudmFzUmVmOm4sd3JhcFJlZjphLHBoYXNlOmcscnVuczpiLG91dHM6QSxiYWxsczpyZSxzdHJpa2VzOmdlLGJhc2VzOmFlLHN0YXRzOlhlLGxhc3RQaXRjaDpFZSxwb3BLZXk6RGUsaXNOZXdCZXN0OkhlLGRpZmZpY3VsdHk6X2UsYmVzdHM6d2UsbXV0ZWQ6SyxhY3Rpb25zOntzdGFydDpVLHN3aW5nSW5wdXQ6VixwYXVzZUdhbWU6dGUscmVzdW1lR2FtZTp1ZSxjaGFuZ2VEaWZmaWN1bHR5OnBlLHRvZ2dsZU11dGU6cX19fWNvbnN0IF9mPVt7aWQ6InJvb2tpZSIsbGFiZWw6IlJvb2tpZSIsdGFnOiJIb25lc3QgaGVhdCwgYmlnIHdpbmRvdyIsZG90czoxfSx7aWQ6Im1ham9yIixsYWJlbDoiTWFqb3IiLHRhZzoiQSByZWFsIHJvdGF0aW9uIixkb3RzOjJ9LHtpZDoiYWxsc3RhciIsbGFiZWw6IkFsbC1TdGFyIix0YWc6Ik5hc3R5IHN0dWZmLCBxdWljayBhcm1zIixkb3RzOjN9XSxHaD1bImZhc3RiYWxsIiwic2xpZGVyIiwiY3VydmUiLCJjaGFuZ2V1cCJdO2Z1bmN0aW9uIEtoKHtvbjpuLGNvbG9yOmEsbGFiZWw6aX0pe3JldHVybiBzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImgtMi41IHctMi41IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLWJsYWNrLzQwIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTE1MCIsc3R5bGU6bj97YmFja2dyb3VuZDphLGJveFNoYWRvdzpgMCAwIDhweCAke2F9YH06e2JhY2tncm91bmQ6InZhcigtLWNvbG9yLXBpdC02MDApIn19KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzZweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46aX0pXX0pfWZ1bmN0aW9uIHFoKHtiYXNlczpufSl7Y29uc3QgYT1pPT5zLmpzeCgiY2lyY2xlIix7cjoiMy40IixmaWxsOmk/IiNmZmQxNjYiOiJ0cmFuc3BhcmVudCIsc3Ryb2tlOmk/IiNmZmUwOGEiOiIjNWQ3ZjZiIixzdHJva2VXaWR0aDoiMS40IixzdHlsZTppP3tmaWx0ZXI6ImRyb3Atc2hhZG93KDAgMCA0cHggcmdiYSgyNTUsMjA5LDEwMiwwLjkpKSJ9OnZvaWQgMH0pO3JldHVybiBzLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCA0NCA0NCIsY2xhc3NOYW1lOiJoLTkgdy05IiwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbcy5qc3goInJlY3QiLHt4OiIxMiIseToiMTIiLHdpZHRoOiIyMCIsaGVpZ2h0OiIyMCIsdHJhbnNmb3JtOiJyb3RhdGUoNDUgMjIgMjIpIixmaWxsOiJub25lIixzdHJva2U6IiM1ZDdmNmIiLHN0cm9rZVdpZHRoOiIxLjQifSkscy5qc3goImciLHt0cmFuc2Zvcm06InRyYW5zbGF0ZSgyMiA3KSIsY2hpbGRyZW46YShuWzFdKX0pLHMuanN4KCJnIix7dHJhbnNmb3JtOiJ0cmFuc2xhdGUoMzcgMjIpIixjaGlsZHJlbjphKG5bMF0pfSkscy5qc3goImciLHt0cmFuc2Zvcm06InRyYW5zbGF0ZSg3IDIyKSIsY2hpbGRyZW46YShuWzJdKX0pLHMuanN4KCJjaXJjbGUiLHtjeDoiMjIiLGN5OiIzNyIscjoiMi40IixmaWxsOiIjZjJlZGUwIn0pXX0pfWZ1bmN0aW9uIHRvKHt0aXRsZTpuLGNvdW50OmEsdG90YWw6aSxjb2xvcjpjfSl7cmV0dXJuIHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpufSkscy5qc3goImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBwdC0xLjUiLGNoaWxkcmVuOkFycmF5LmZyb20oe2xlbmd0aDppfSwoaCxwKT0+cy5qc3goS2gse29uOnA8YSxjb2xvcjpjLGxhYmVsOiIifSxwKSl9KV19KX1mdW5jdGlvbiBBZih7bGFiZWw6bix2YWx1ZTphLGFjY2VudDppPSExLHBvcDpjPTB9KXtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpufSkscy5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHtpPyJhbmltYXRlLXBvcCB0ZXh0LWFtYmVyZ2xvdy00MDAiOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmF9LGMpXX0pfWZ1bmN0aW9uIExyKHtrZXlzTGlzdDpuLGFjdGlvbjphfSl7cmV0dXJuIHMuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjpufSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmF9KV19KX1mdW5jdGlvbiBRaCgpe2NvbnN0IG49VmgoKSx7YWN0aW9uczphLHBoYXNlOml9PW4sYz1pPT09InJ1bm5pbmciLGg9bi5zdGF0cy5hYj4wPyhuLnN0YXRzLmhpdHMvbi5zdGF0cy5hYikudG9GaXhlZCgzKS5yZXBsYWNlKC9eMC8sIiIpOiIuMDAwIixwPW09PnttLnByZXZlbnREZWZhdWx0KCksYS5zd2luZ0lucHV0KCl9O3JldHVybiBzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbcy5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltzLmpzeChBZix7bGFiZWw6IlJ1bnMiLHZhbHVlOm4ucnVucyxhY2NlbnQ6ITAscG9wOm4ucG9wS2V5fSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCYXNlcyJ9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwdC0wLjUiLGNoaWxkcmVuOnMuanN4KHFoLHtiYXNlczpuLmJhc2VzfSl9KV19KSxzLmpzeCh0byx7dGl0bGU6IkJhbGwiLGNvdW50Om4uYmFsbHMsdG90YWw6NCxjb2xvcjoiIzhlZjA1YSJ9KSxzLmpzeCh0byx7dGl0bGU6IlN0cmlrZSIsY291bnQ6bi5zdHJpa2VzLHRvdGFsOjIsY29sb3I6IiNmZjVkOGYifSkscy5qc3godG8se3RpdGxlOiJPdXQiLGNvdW50Om4ub3V0cyx0b3RhbDozLGNvbG9yOiIjZmZjODU3In0pLHMuanN4KEFmLHtsYWJlbDoiSFIiLHZhbHVlOnMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LVsjNjJlNmZmXSBbdGV4dC1zaGFkb3c6MF8wXzEycHhfcmdiYSg5OCwyMzAsMjU1LDAuNDUpXSIsY2hpbGRyZW46bi5zdGF0cy5ocn0pfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImhpZGRlbiByb3VuZGVkIGJvcmRlciBib3JkZXItcGl0LTYwMCBiZy1waXQtODUwLzkwIHB4LTIuNSBweS0xLjUgc206YmxvY2siLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiTGFzdCBQaXRjaCJ9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwdC0xIHRleHQtWzExcHhdIGZvbnQtYm9sZCB0cmFja2luZy13aWRlIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOm4ubGFzdFBpdGNofSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpjPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmM/YS5wYXVzZUdhbWU6YS5yZXN1bWVHYW1lLGRpc2FibGVkOiFjJiZpIT09InBhdXNlZCIsY2hpbGRyZW46Yz9zLmpzeCh4bix7fSk6cy5qc3goUWUse30pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeChpdCx7fSl9KSxzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6bi5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazphLnRvZ2dsZU11dGUsY2hpbGRyZW46bi5tdXRlZD9zLmpzeChQbCx7fSk6cy5qc3goRWwse30pfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtyZWY6bi53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbcy5qc3goImNhbnZhcyIse3JlZjpuLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1wb2ludGVyIixvblBvaW50ZXJEb3duOnAsb25Db250ZXh0TWVudTptPT5tLnByZXZlbnREZWZhdWx0KCl9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTIgei0yMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46WyJsZWZ0LTAgdG9wLTAgYm9yZGVyLWwtMiBib3JkZXItdC0yIiwicmlnaHQtMCB0b3AtMCBib3JkZXItci0yIGJvcmRlci10LTIiLCJsZWZ0LTAgYm90dG9tLTAgYm9yZGVyLWwtMiBib3JkZXItYi0yIiwicmlnaHQtMCBib3R0b20tMCBib3JkZXItci0yIGJvcmRlci1iLTIiXS5tYXAobT0+cy5qc3goInNwYW4iLHtjbGFzc05hbWU6YGFic29sdXRlIGgtNCB3LTQgYm9yZGVyLWFtYmVyZ2xvdy00MDAvNDAgJHttfWB9LG0pKX0pLGk9PT0iaWRsZSImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNzBkMjJdLzgwIHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jaGFsayBmb250LWRpc3BsYXkgdGV4dC0yeGwgc206dGV4dC0zeGwiLGNoaWxkcmVuOiJTTFVHR0VSIE5JR0hUIn0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgbXQtMiB0ZXh0LVs5cHhdIHRyYWNraW5nLVswLjNlbV0gdGV4dC1bIzlmYjBkMF0iLGNoaWxkcmVuOiJUSU1JTkcgQkFUVElORyBWUy4gQ1BVIEFSTVMifSldfSkscy5qc3goWWUse3ZhcmlhbnQ6InByaW1hcnkiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFBsYXkgQmFsbCJdfSl9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46IlNQQUNFIC8gQ0xJQ0sgLyBUQVAgVE8gU1dJTkcifSkscy5qc3goImRpdiIse2NsYXNzTmFtZToibWF4LXctc20gdGV4dC1bMTJweF0gbGVhZGluZy1yZWxheGVkIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJTd2luZyB3aGVuIHRoZSBiYWxsIHJlYWNoZXMgdGhlIHBsYXRlLiBQZXJmZWN0IHRpbWluZyBnb2VzIGRlZXAg4oCUIHRoZSBDUFUgcGl0Y2hlciBzdHVkaWVzIHlvdXIgc3dpbmcgYW5kIGNoYW5nZXMgc3BlZWRzIG9uIHlvdS4gVGhyZWUgb3V0cyBhbmQgdGhlIG5pZ2h0IGlzIG92ZXIuIn0pLG4uaXNOZXdCZXN0JiZzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1wdWxzZS1zb2Z0IGZvbnQtZGlzcGxheSB0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOiLimIUgTkVXIENMVUIgUkVDT1JEIOKYhSJ9KV19KSxpPT09InBhdXNlZCImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMwNzBkMjJdLzgwIHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1jaGFsayBmb250LWRpc3BsYXkgdGV4dC14bCIsY2hpbGRyZW46IlJBSU4gREVMQVkifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3MuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEucmVzdW1lR2FtZSxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxzLmpzeChZZSx7b25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlAifSksIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHMuanN4KEcse2NoaWxkcmVuOiJFc2MifSksIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJtbC0xIixjaGlsZHJlbjoicmVzdW1lcyJ9KV19KV19KSxpPT09Im92ZXIiJiZzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1mYWRlaW4gYWJzb2x1dGUgaW5zZXQtMCB6LTMwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC00IGJnLVsjMDcwZDIyXS84NSBwLTYgdGV4dC1jZW50ZXIiLGNoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQteGwgdGV4dC1hcHBsZS00MDAgW3RleHQtc2hhZG93OjBfMF8yNHB4X3JnYmEoMjU1LDEwNywxMDcsMC41KV0gc206dGV4dC0yeGwiLGNoaWxkcmVuOiJCQUxMR0FNRSEifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtZW5kIGdhcC02IixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUlVOUyJ9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46bi5ydW5zfSldfSkscy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiQkVTVCJ9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtMnhsIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOm4uYmVzdHNbbi5kaWZmaWN1bHR5XX0pXX0pXX0pLHMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJncmlkIGdyaWQtY29scy0yIGdhcC14LTggZ2FwLXktMSB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIHNtOmdyaWQtY29scy00IixjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2hpbGRyZW46WyJIUiAiLHMuanN4KCJiIix7Y2xhc3NOYW1lOiJ0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpuLnN0YXRzLmhyfSldfSkscy5qc3hzKCJzcGFuIix7Y2hpbGRyZW46WyJISVRTICIscy5qc3goImIiLHtjbGFzc05hbWU6InRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOm4uc3RhdHMuaGl0c30pXX0pLHMuanN4cygic3BhbiIse2NoaWxkcmVuOlsiQVZHICIscy5qc3goImIiLHtjbGFzc05hbWU6InRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOmh9KV19KSxzLmpzeHMoInNwYW4iLHtjaGlsZHJlbjpbIksgIixzLmpzeCgiYiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46bi5zdGF0cy5rfSldfSldfSksbi5pc05ld0Jlc3QmJnMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgQ0xVQiBSRUNPUkQg4piFIn0pLHMuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEuc3RhcnQsY2hpbGRyZW46cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KGl0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEFnYWluIl19KX0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLWJsaW5rIGZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiUFJFU1MgU1BBQ0UifSldfSldfSl9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMS41IixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsb25Qb2ludGVyRG93bjptPT57bS5wcmV2ZW50RGVmYXVsdCgpLGk9PT0iaWRsZSJ8fGk9PT0ib3ZlciI/YS5zdGFydCgpOmk9PT0icGF1c2VkIj9hLnJlc3VtZUdhbWUoKTphLnN3aW5nSW5wdXQoKX0sb25Db250ZXh0TWVudTptPT5tLnByZXZlbnREZWZhdWx0KCksY2xhc3NOYW1lOmBidG4tYXJjYWRlIGZsZXggbWluLXctWzI0MHB4XSB0b3VjaC1ub25lIHNlbGVjdC1ub25lIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweC04IHB5LTQgdGV4dC1bMTRweF0gJHtjPyJidG4tcHJpbWFyeSI6ImJ0bi1naG9zdCJ9YCxjaGlsZHJlbjppPT09InJ1bm5pbmciP3MuanN4KHMuRnJhZ21lbnQse2NoaWxkcmVuOiJTV0lORyEifSk6aT09PSJwYXVzZWQiP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSk6aT09PSJvdmVyIj9zLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KGl0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEFnYWluIl19KTpzLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KFFlLHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBQbGF5IEJhbGwiXX0pfSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOmM/IlRpbWUgeW91ciBzd2luZyBhcyB0aGUgYmFsbCBjcm9zc2VzIHRoZSBwbGF0ZSI6IlNwYWNlLCBjbGljaywgb3IgdGFwIHdvcmtzIHRvbyJ9KV19KV19KSxzLmpzeHMoImFzaWRlIix7Y2xhc3NOYW1lOiJncmlkIGNvbnRlbnQtc3RhcnQgZ2FwLTQiLGNoaWxkcmVuOltzLmpzeHMoUXQse3RpdGxlOiJTY291dGluZyBSZXBvcnQiLGNoaWxkcmVuOltzLmpzeCgidWwiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTIgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTIwMCIsY2hpbGRyZW46R2gubWFwKG09PnMuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiIsY2hpbGRyZW46W3MuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiaC0yLjUgdy0yLjUgcm91bmRlZC1mdWxsIixzdHlsZTp7YmFja2dyb3VuZDpqbFttXS5jb2xvcixib3hTaGFkb3c6YDAgMCA4cHggJHtqbFttXS5jb2xvcn1gfX0pLGpsW21dLm5hbWUudG9Mb3dlckNhc2UoKV19KSxzLmpzeCgic3BhbiIse2NsYXNzTmFtZToidGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46amxbbV0uYmx1cmJ9KV19LG0pKX0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gbGVhZGluZy1yZWxheGVkIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJUaGUgQ1BVIGFybSBhZGFwdHM6IHN3aW5nIGVhcmx5IGFuZCBpdCBnb2VzIG9mZnNwZWVkLCBzd2luZyBsYXRlIGFuZCBpdCBicmluZ3MgaGVhdC4gSXQgYWxzbyBjaGFuZ2VzIHNwZWVkcyBvZmYgdGhlIHNhbWUgYXJtLCBzbyB0cnVzdCB5b3VyIGV5ZXMsIG5vdCB0aGUgd2luZHVwLiJ9KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToibXQtMyBncmlkIGdyaWQtY29scy0yIGdhcC0yIHRleHQtY2VudGVyIixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04MDAgcHgtMiBweS0xLjUiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bMTJweF0gdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46aH0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6InRleHQtWzlweF0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJCYXR0aW5nIEF2ZyJ9KV19KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTgwMCBweC0yIHB5LTEuNSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMTAwIixjaGlsZHJlbjpuLnN0YXRzLnN0cmVha30pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6InRleHQtWzlweF0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJIaXQgU3RyZWFrIn0pXX0pXX0pXX0pLHMuanN4KExsLHt0aXRsZToiTGVhZ3VlIixvcHRpb25zOl9mLHZhbHVlOm4uZGlmZmljdWx0eSxvbkNoYW5nZTphLmNoYW5nZURpZmZpY3VsdHksZGlzYWJsZWQ6aT09PSJydW5uaW5nInx8aT09PSJyZWFkeSJ8fGk9PT0icGF1c2VkIn0pLHMuanN4KF9sLHtiZXN0czpuLmJlc3RzLG9wdGlvbnM6X2YsYWN0aXZlOm4uZGlmZmljdWx0eX0pLHMuanN4cyhRdCx7dGl0bGU6IkNvbnRyb2xzIixjaGlsZHJlbjpbcy5qc3hzKCJ1bCIse2NsYXNzTmFtZToiZ3JpZCBnYXAtMi41IixjaGlsZHJlbjpbcy5qc3goTHIse2tleXNMaXN0OnMuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlNwYWNlIn0pLHMuanN4KEcse2NoaWxkcmVuOiJFbnRlciJ9KV19KSxhY3Rpb246IlN3aW5nIn0pLHMuanN4KExyLHtrZXlzTGlzdDpzLmpzeChHLHtjaGlsZHJlbjoiQ2xpY2sgLyBUYXAifSksYWN0aW9uOiJTd2luZyJ9KSxzLmpzeChMcix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiUCJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiRXNjIn0pXX0pLGFjdGlvbjoiUGF1c2UifSkscy5qc3goTHIse2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJSIn0pLGFjdGlvbjoiUmVzdGFydCJ9KSxzLmpzeChMcix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiMSJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMiJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMyJ9KV19KSxhY3Rpb246IkxlYWd1ZSJ9KSxzLmpzeChMcix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46Ik0ifSksYWN0aW9uOiJTb3VuZCJ9KV19KSxzLmpzeCgicCIse2NsYXNzTmFtZToibXQtMyBib3JkZXItdCBib3JkZXItcGl0LTYwMCBwdC0yIHRleHQtWzExcHhdIHRleHQtbW9zcy00MDAiLGNoaWxkcmVuOiJTd2luZyBpbnNpZGUgdGhlIHdpbmRvdyBmb3IgY29udGFjdCDigJQgdGhlIHRpZ2h0ZXIgeW91ciB0aW1pbmcsIHRoZSBoYXJkZXIgdGhlIGhpdC4gRm91bHMgY291bnQgYXMgc3RyaWtlcyAobmV2ZXIgdGhlIHRoaXJkKSwgZm91ciBiYWxscyBpcyBhIHdhbGsuIn0pXX0pXX0pXX0pXX0pfWNvbnN0IGtsPXticmVlemU6e2xhYmVsOiJCUkVFWkUiLHRhZzoiZ2VudGxlIGRyaWZ0LCBmb3JnaXZpbmcgZWRnZSIsZG90czoxLGJhc2VTcGVlZDoxMzUscmFtcDozLjQsY2FwOjMwMCx0b2xlcmFuY2U6OSxndXN0Q2hhbmNlOjAscmVncm93dGg6OH0sZ2FsZTp7bGFiZWw6IkdBTEUiLHRhZzoiYnJpc2sgc2xpZGVzLCByYXJlIGd1c3RzIixkb3RzOjIsYmFzZVNwZWVkOjE4MCxyYW1wOjQuOCxjYXA6Mzg1LHRvbGVyYW5jZTo2LjUsZ3VzdENoYW5jZTouMDUscmVncm93dGg6Nn0sdGVtcGVzdDp7bGFiZWw6IlRFTVBFU1QiLHRhZzoiZmFzdCBibG9ja3MsIHN1ZGRlbiBndXN0cyIsZG90czozLGJhc2VTcGVlZDoyMjgscmFtcDo2LjYsY2FwOjQ3NSx0b2xlcmFuY2U6NC4yLGd1c3RDaGFuY2U6LjE3LHJlZ3Jvd3RoOjV9fSxsbj02MDAsU3Q9MjQsSWY9MzYsYmw9MjMyLG5uPWxuLTQ2LFVuPTEwLGlvPTM0MCxwdD0obixhKT0+bitNYXRoLnJhbmRvbSgpKihhLW4pLFloPShuLGEsaSk9Pk1hdGgubWF4KGEsTWF0aC5taW4oaSxuKSksWGg9bj0+bltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqbi5sZW5ndGgpXTtmdW5jdGlvbiBEZihuLGEsaSxjLGgscD0xKXtjb25zdCBtPU1hdGgubWluKDIwMCxuLnBhcnRpY2xlcy5sZW5ndGgraCk7Zm9yKGxldCBmPW4ucGFydGljbGVzLmxlbmd0aDtmPG07ZisrKXtjb25zdCBnPXB0KDAsTWF0aC5QSSoyKSx2PXB0KDMwLDIwMCkqcCx4PXB0KDMwMCw3MDApO24ucGFydGljbGVzLnB1c2goe3g6YSx5Omksdng6TWF0aC5jb3MoZykqdix2eTpNYXRoLnNpbihnKSp2LTQwLGxpZmU6eCxtYXhMaWZlOngsc2l6ZTpwdCgxLjUsMy4yKSpwLGNvbG9yOlhoKGMpLGRyYWc6MixncmF2OjYwfSl9fWZ1bmN0aW9uIGFkKG4sYSl7Y29uc3QgaT1uLnRvd2VyW24udG93ZXIubGVuZ3RoLTFdLGM9bi50b3dlci5sZW5ndGgsaD1NYXRoLnJhbmRvbSgpPC41Py0xOjEscD1pLnc7bi5hY3RpdmU9e3g6aD4wP1VuOmxuLVVuLXAsdzpwLGRpcjpoLHNwZWVkOk1hdGgubWluKGEuYmFzZVNwZWVkKnB0KC45MiwxLjA4KSsoYy0xKSphLnJhbXAsYS5jYXApLGd1c3RBdDpNYXRoLnJhbmRvbSgpPGEuZ3VzdENoYW5jZT9wdCg1MDAsMTYwMCk6MCxzbGlkZVQ6MH19ZnVuY3Rpb24gbm8obixhPSExKXtjb25zdCBpPVtdO2lmKGEpZm9yKGxldCBoPTA7aDw4O2grKylpLnB1c2goe3g6KGxuLWJsKS8yLHc6YmwscGVyZmVjdDpoJTM9PT0yfSk7ZWxzZSBpLnB1c2goe3g6KGxuLWJsKS8yLHc6YmwscGVyZmVjdDohMX0pO2NvbnN0IGM9e3RpbWU6MCxsYXN0OjAsdG93ZXI6aSxhY3RpdmU6bnVsbCxzbGljZXM6W10scmluZ3M6W10scGFydGljbGVzOltdLGZsb2F0ZXJzOltdLGNsb3VkczpBcnJheS5mcm9tKHtsZW5ndGg6OH0sKCk9Pih7Zng6TWF0aC5yYW5kb20oKSxmeTpNYXRoLnJhbmRvbSgpKi41NSxkZXB0aDpwdCguMjUsLjkpLHNjYWxlOnB0KC43LDEuNSksc3BlZWQ6cHQoOSwyNil9KSksc3RhcnM6QXJyYXkuZnJvbSh7bGVuZ3RoOjgwfSwoKT0+KHtmeDpNYXRoLnJhbmRvbSgpLGZ5Ok1hdGgucmFuZG9tKCkqLjcsdHc6cHQoMSw0KSxzaXplOnB0KC42LDEuOCl9KSksY2FtOmE/TWF0aC5tYXgoMCw3KlN0LShubi1pbykpOjAsY2FtVGFyZ2V0OmE/TWF0aC5tYXgoMCw3KlN0LShubi1pbykpOjAsc2t5QWx0OmE/NzowLHNjb3JlOjAsY29tYm86MCxtYXhDb21ibzowLHJ1bkh1ZTpwdCgwLDM2MCksc2hha2U6MCxmbGFzaDowLHdpbmRUOjAsZHlpbmc6MCxldlBsYWNlOjAsZXZQZXJmZWN0OjAsZXZTbGljZTowLGV2R3VzdDowLGV2RmFsbDowfTtyZXR1cm4gYXx8YWQoYyxuKSxjfWZ1bmN0aW9uIGhvKG4pe3JldHVybiBNYXRoLm1heCgwLG4udG93ZXIubGVuZ3RoLTEpfWZ1bmN0aW9uIFpoKG4sYSxpKXtpZighbi5hY3RpdmV8fG4uZHlpbmc+MClyZXR1cm47Y29uc3QgYz1uLmFjdGl2ZSxoPW4udG93ZXJbbi50b3dlci5sZW5ndGgtMV0scD1uLnRvd2VyLmxlbmd0aCxtPShuLnJ1bkh1ZStwKjcpJTM2MCxmPW5uLXAqU3QsZz1jLngrYy53LHY9aC54K2gudyx4PU1hdGgubWF4KGMueCxoLngpLGI9TWF0aC5taW4oZyx2KSxUPWIteDtpZihUPD0wKXtuLnNsaWNlcy5wdXNoKHt4OmMueCx5OmYsdzpjLncsdng6Yy5kaXIqcHQoNTAsMTIwKSx2eTotNjAscm90OjAsdnI6cHQoLTIuNiwyLjYpLGh1ZTptLGxpZmU6MjQwMH0pLG4uYWN0aXZlPW51bGwsbi5keWluZz1pLG4uY29tYm89MCxuLmV2RmFsbCsrLG4uc2hha2U9MTM7cmV0dXJufWNvbnN0IEE9Yy54K2Mudy8yLGVlPWgueCtoLncvMixyZT1NYXRoLmFicyhBLWVlKTtsZXQgJCxnZT0xMDtpZihyZTw9YS50b2xlcmFuY2Upe24uY29tYm8rKyxuLm1heENvbWJvPU1hdGgubWF4KG4ubWF4Q29tYm8sbi5jb21ibyk7Y29uc3QgYWU9TWF0aC5taW4oaC53K2EucmVncm93dGgsYmwpOyQ9e3g6WWgoaC54LShhZS1oLncpLzIsVW4sbG4tVW4tYWUpLHc6YWUscGVyZmVjdDohMH0sZ2UrPTIwKk1hdGgubWluKG4uY29tYm8sOCksbi5yaW5ncy5wdXNoKHt4OiQueCskLncvMix5OmYscjo4LG1heFI6OTIsbGlmZTo0ODAsbWF4TGlmZTo0ODAsY29sb3I6IiNmZmUwOGEifSksbi5mbG9hdGVycy5wdXNoKHt4OiQueCskLncvMix5OmYtMTAsdHh0Om4uY29tYm8+MT9gUEVSRkVDVCDDlyR7bi5jb21ib31gOiJQRVJGRUNUISIsbGlmZTo5NTAsbWF4TGlmZTo5NTAsY29sb3I6IiNmZmUwOGEifSksbi5ldlBlcmZlY3QrKyxuLmZsYXNoPU1hdGgubWF4KG4uZmxhc2gsLjIpLERmKG4sJC54KyQudy8yLGYrNixbIiNmZmUwOGEiLCIjZmZmM2M0IiwiI2ZmZmZmZiJdLDEzLC45KX1lbHNlIG4uY29tYm89MCwkPXt4LHc6VCxwZXJmZWN0OiExfSxBPmVlP24uc2xpY2VzLnB1c2goe3g6Yix5OmYsdzpnLWIsdng6cHQoNzAsMTYwKSx2eTotNTAscm90OjAsdnI6cHQoMSwzKSxodWU6bSxsaWZlOjI0MDB9KTpuLnNsaWNlcy5wdXNoKHt4OmMueCx5OmYsdzp4LWMueCx2eDotcHQoNzAsMTYwKSx2eTotNTAscm90OjAsdnI6LXB0KDEsMyksaHVlOm0sbGlmZToyNDAwfSksbi5ldlNsaWNlKyssbi5zaGFrZT1NYXRoLm1heChuLnNoYWtlLDMpLERmKG4sQT5lZT9iOngsZis4LFtgaHNsKCR7bX0sIDYwJSwgNjAlKWAsIiNmZmZmZmYiXSw2LC41NSk7bi5zY29yZSs9Z2Usbi5mbG9hdGVycy5wdXNoKHt4OiQueCskLncvMix5OmYrMTIsdHh0OmArJHtnZX1gLGxpZmU6NjIwLG1heExpZmU6NjIwLGNvbG9yOiIjZmZmZmZmIn0pLG4udG93ZXIucHVzaCgkKSxuLmV2UGxhY2UrKztjb25zdCBkZT1obyhuKTtkZT4wJiZkZSUyNT09PTAmJm4uZmxvYXRlcnMucHVzaCh7eDpsbi8yLHk6Zi00Nix0eHQ6YEZMT09SICR7ZGV9IWAsbGlmZToxNDAwLG1heExpZmU6MTQwMCxjb2xvcjoiIzdlZjBjOCJ9KSxuLmNhbVRhcmdldD1NYXRoLm1heCgwLChuLnRvd2VyLmxlbmd0aC0xKSpTdC0obm4taW8pKSxhZChuLGEpfWZ1bmN0aW9uIEpoKG4sYSxpLGMpe2NvbnN0IGg9YS8xZTM7bi50aW1lKz1hLG4uc2hha2U9TWF0aC5tYXgoMCxuLnNoYWtlLWEqLjA0NSksbi5mbGFzaD1NYXRoLm1heCgwLG4uZmxhc2gtYSouMDAxNiksbi53aW5kVD1NYXRoLm1heCgwLG4ud2luZFQtYSksbi5jYW0rPShuLmNhbVRhcmdldC1uLmNhbSkqTWF0aC5taW4oMSxhKi4wMDgpLG4uc2t5QWx0Kz0oaG8obiktbi5za3lBbHQpKk1hdGgubWluKDEsYSouMDAzKTtmb3IobGV0IG09bi5zbGljZXMubGVuZ3RoLTE7bT49MDttLS0pe2NvbnN0IGY9bi5zbGljZXNbbV07aWYoZi5saWZlLT1hLGYubGlmZTw9MHx8Zi55PmxuKjIuNCl7bi5zbGljZXMuc3BsaWNlKG0sMSk7Y29udGludWV9Zi52eSs9MTUwMCpoLGYueCs9Zi52eCpoLGYueSs9Zi52eSpoLGYucm90Kz1mLnZyKmh9Zm9yKGxldCBtPW4ucmluZ3MubGVuZ3RoLTE7bT49MDttLS0pbi5yaW5nc1ttXS5saWZlLT1hLG4ucmluZ3NbbV0ubGlmZTw9MCYmbi5yaW5ncy5zcGxpY2UobSwxKTtmb3IobGV0IG09bi5wYXJ0aWNsZXMubGVuZ3RoLTE7bT49MDttLS0pe2NvbnN0IGY9bi5wYXJ0aWNsZXNbbV07aWYoZi5saWZlLT1hLGYubGlmZTw9MCl7Y29uc3QgZz1uLnBhcnRpY2xlcy5wb3AoKTtnJiZtPG4ucGFydGljbGVzLmxlbmd0aCYmKG4ucGFydGljbGVzW21dPWcpO2NvbnRpbnVlfWYudngtPWYudngqZi5kcmFnKmgsZi52eSs9Zi5ncmF2KmgtZi52eSpmLmRyYWcqaCxmLngrPWYudngqaCxmLnkrPWYudnkqaH1mb3IobGV0IG09bi5mbG9hdGVycy5sZW5ndGgtMTttPj0wO20tLSluLmZsb2F0ZXJzW21dLmxpZmUtPWEsbi5mbG9hdGVyc1ttXS5saWZlPD0wJiZuLmZsb2F0ZXJzLnNwbGljZShtLDEpO2lmKCFjKXJldHVybjtjb25zdCBwPW4uYWN0aXZlO3AmJm4uZHlpbmc9PT0wJiYocC5zbGlkZVQrPWEscC54Kz1wLmRpcipwLnNwZWVkKmgscC54PFVuPyhwLng9VW4scC5kaXI9MSk6cC54K3Audz5sbi1VbiYmKHAueD1sbi1Vbi1wLncscC5kaXI9LTEpLHAuZ3VzdEF0PjAmJnAuc2xpZGVUPj1wLmd1c3RBdCYmKHAuZ3VzdEF0PTAscC5kaXIqPS0xLG4ud2luZFQ9MzgwLG4uZXZHdXN0KyspKX1jb25zdCBLcz1bWzAsIiMyZTFhNDciLCIjZjI5NTVlIl0sWzEyLCIjMWY2ZmIwIiwiIzlmZTBlYSJdLFsyNiwiIzExNzNjOCIsIiNhNWU4ZjIiXSxbNDAsIiM1YjJhNzIiLCIjZmY4YzVhIl0sWzU0LCIjMmExYzUyIiwiIzhhNWFhMCJdLFs2OCwiIzBhMTEyOCIsIiMyNzQwNmUiXSxbODQsIiMyZTFhNDciLCIjZjI5NTVlIl1dO2Z1bmN0aW9uIHpmKG4pe2NvbnN0IGE9cGFyc2VJbnQobi5zbGljZSgxKSwxNik7cmV0dXJuW2E+PjE2JjI1NSxhPj44JjI1NSxhJjI1NV19ZnVuY3Rpb24gT2YobixhLGkpe2NvbnN0IGM9emYobiksaD16ZihhKSxwPU1hdGgucm91bmQoY1swXSsoaFswXS1jWzBdKSppKSxtPU1hdGgucm91bmQoY1sxXSsoaFsxXS1jWzFdKSppKSxmPU1hdGgucm91bmQoY1syXSsoaFsyXS1jWzJdKSppKTtyZXR1cm5gcmdiKCR7cH0sJHttfSwke2Z9KWB9ZnVuY3Rpb24gZW0obil7Y29uc3QgYT0obiU4NCs4NCklODQ7bGV0IGk9MDtmb3IoO2k8S3MubGVuZ3RoLTImJktzW2krMV1bMF08PWE7KWkrKztjb25zdFtjLGgscF09S3NbaV0sW20sZixnXT1Lc1tpKzFdLHY9KGEtYykvKG0tYykseD1NYXRoLmFicygoKGEtNzArNDIpJTg0Kzg0KSU4NC00MiksYj1NYXRoLm1heCgwLE1hdGgubWluKDEsMS14LzE2KSk7cmV0dXJue3RvcDpPZihoLGYsdiksYm90dG9tOk9mKHAsZyx2KSxuZjpifX1mdW5jdGlvbiBybyhuLGEsaSxjLGgscCxtPTAsZj0hMSl7Y29uc3QgZz1JZiouNSpwLHY9SWYqLjI2KnAseD1jKnAsYj1TdCpwO24uZmlsbFN0eWxlPWBoc2woJHtofSwgNTglLCAke01hdGgubWluKDgwLDU0K20pfSUpYCxuLmZpbGxSZWN0KGEsaSx4LGIpLG4uZmlsbFN0eWxlPWBoc2woJHtofSwgNjIlLCAke01hdGgubWluKDg4LDY3K20pfSUpYCxuLmJlZ2luUGF0aCgpLG4ubW92ZVRvKGEsaSksbi5saW5lVG8oYStnLGktdiksbi5saW5lVG8oYSt4K2csaS12KSxuLmxpbmVUbyhhK3gsaSksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxuLmZpbGxTdHlsZT1gaHNsKCR7aH0sIDU1JSwgJHtNYXRoLm1pbig3MCwzOCttKX0lKWAsbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhK3gsaSksbi5saW5lVG8oYSt4K2csaS12KSxuLmxpbmVUbyhhK3grZyxpK2Itdiksbi5saW5lVG8oYSt4LGkrYiksbi5jbG9zZVBhdGgoKSxuLmZpbGwoKSxmJiYobi5zdHJva2VTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjU1KSIsbi5saW5lV2lkdGg9TWF0aC5tYXgoMSwxLjQqcCksbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhhLGkpLG4ubGluZVRvKGEreCxpKSxuLnN0cm9rZSgpKX1mdW5jdGlvbiB0bShuLGEsaSxjLGgpe2NvbnN0IHA9aS9sbixtPWVtKGEuc2t5QWx0KSxmPW4uY3JlYXRlTGluZWFyR3JhZGllbnQoMCwwLDAsYyk7aWYoZi5hZGRDb2xvclN0b3AoMCxtLnRvcCksZi5hZGRDb2xvclN0b3AoMSxtLmJvdHRvbSksbi5maWxsU3R5bGU9ZixuLmZpbGxSZWN0KDAsMCxpLGMpLG0ubmY+LjAzKWZvcihjb25zdCBiIG9mIGEuc3RhcnMpe2NvbnN0IFQ9bS5uZiooLjMrLjcqKC41Ky41Kk1hdGguc2luKGEudGltZSouMDAxKmIudHcrYi5meCozMCkpKTtuLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjU1LDI1NSwkeyhUKi45KS50b0ZpeGVkKDMpfSlgO2NvbnN0IEE9Yi5zaXplKnA7bi5maWxsUmVjdChiLmZ4KmksYi5meSpjLEEsQSl9aWYobS5uZjwuOTIpe2NvbnN0IGI9MS1tLm5mLFQ9aSouNzksQT1jKi4xNixlZT1uLmNyZWF0ZVJhZGlhbEdyYWRpZW50KFQsQSwwLFQsQSwxMDAqcCk7ZWUuYWRkQ29sb3JTdG9wKDAsYHJnYmEoMjU1LDE5NiwxMjAsJHsoLjUqYikudG9GaXhlZCgzKX0pYCksZWUuYWRkQ29sb3JTdG9wKDEsInJnYmEoMjU1LDE5NiwxMjAsMCkiKSxuLmZpbGxTdHlsZT1lZSxuLmZpbGxSZWN0KFQtMTEwKnAsQS0xMTAqcCwyMjAqcCwyMjAqcCksbi5maWxsU3R5bGU9YHJnYmEoMjU1LDIyOCwxNzAsJHsoLjkqYikudG9GaXhlZCgzKX0pYCxuLmJlZ2luUGF0aCgpLG4uYXJjKFQsQSwyNCpwLDAsTWF0aC5QSSoyKSxuLmZpbGwoKX1pZihtLm5mPi4wNSl7Y29uc3QgYj1tLm5mLFQ9aSouMixBPWMqLjE0O24uZ2xvYmFsQWxwaGE9YiouODUsbi5maWxsU3R5bGU9IiNlMmVjZmYiLG4uYmVnaW5QYXRoKCksbi5hcmMoVCxBLDIxKnAsMCxNYXRoLlBJKjIpLG4uZmlsbCgpLG4uZmlsbFN0eWxlPW0udG9wLG4uYmVnaW5QYXRoKCksbi5hcmMoVCs4KnAsQS01KnAsMTcqcCwwLE1hdGguUEkqMiksbi5maWxsKCksbi5nbG9iYWxBbHBoYT0xfWNvbnN0IGc9TWF0aC5tYXgoMCwuMTYtbS5uZiouMTEpO2lmKGc+LjAxKXtuLmZpbGxTdHlsZT1gcmdiYSgyNTUsMjU1LDI1NSwke2cudG9GaXhlZCgzKX0pYDtmb3IoY29uc3QgYiBvZiBhLmNsb3Vkcyl7Y29uc3QgVD1pKzE2MCxBPShiLmZ4KlQrYS50aW1lKmIuc3BlZWQqLjAxMiklVC04MCxlZT1iLmZ5KmMqLjU1K2EuY2FtKnAqYi5kZXB0aCouMyxyZT1iLnNjYWxlKnA7bi5iZWdpblBhdGgoKSxuLmVsbGlwc2UoQSxlZSw1NCpyZSwxNSpyZSwwLDAsTWF0aC5QSSoyKSxuLmVsbGlwc2UoQSszMipyZSxlZSs0KnJlLDM4KnJlLDEyKnJlLDAsMCxNYXRoLlBJKjIpLG4uZWxsaXBzZShBLTM2KnJlLGVlKzUqcmUsMzQqcmUsMTEqcmUsMCwwLE1hdGguUEkqMiksbi5maWxsKCl9fW4uc2F2ZSgpLGEuc2hha2U+LjImJm4udHJhbnNsYXRlKChNYXRoLnJhbmRvbSgpLS41KSphLnNoYWtlKnAsKE1hdGgucmFuZG9tKCktLjUpKmEuc2hha2UqcCksbi50cmFuc2xhdGUoMCxhLmNhbSpwKTtjb25zdCB2PShubitTdCkqcDtpZih2PGMrNDApe2NvbnN0IGI9bi5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLHYsMCx2KzI0MCpwKTtiLmFkZENvbG9yU3RvcCgwLCIjMGMxNjEwIiksYi5hZGRDb2xvclN0b3AoMSwicmdiYSgxMiwyMiwxNiwwKSIpLG4uZmlsbFN0eWxlPSIjMGMxNjEwIixuLmZpbGxSZWN0KC0zMCx2LGkrNjAsTWF0aC5tYXgoMCxjLWEuY2FtKnAtdis2MCkpLG4uZmlsbFN0eWxlPWIsbi5maWxsUmVjdCgtMzAsdixpKzYwLDI0MCpwKSxuLmZpbGxTdHlsZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA5KSIsbi5maWxsUmVjdCgtMzAsdixpKzYwLE1hdGgubWF4KDEsMS4yKnApKX1jb25zdCB4PWEudG93ZXIubGVuZ3RoO2ZvcihsZXQgYj0wO2I8eDtiKyspe2NvbnN0IFQ9YS50b3dlcltiXSxBPShubi1iKlN0KSpwO2lmKEErYS5jYW0qcD5jKzYwfHxBPC04MCljb250aW51ZTtjb25zdCBlZT0oYS5ydW5IdWUrYio3KSUzNjA7cm8obixULngqcCxBLFQudyxlZSxwLFQucGVyZmVjdD83OjAsVC5wZXJmZWN0KX1pZihhLmFjdGl2ZSYmeD4wJiYoaD09PSJydW5uaW5nInx8aD09PSJyZWFkeSIpKXtjb25zdCBiPWEudG93ZXJbeC0xXSxUPShubi14KlN0KSpwLEE9KG5uLSh4LTEpKlN0KSpwO24uc3Ryb2tlU3R5bGU9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLG4ubGluZVdpZHRoPU1hdGgubWF4KDEscCksbi5zZXRMaW5lRGFzaChbNSpwLDcqcF0pO2Zvcihjb25zdCBlZSBvZltiLngsYi54K2Iud10pbi5iZWdpblBhdGgoKSxuLm1vdmVUbyhlZSpwLFQtNipwKSxuLmxpbmVUbyhlZSpwLEEpLG4uc3Ryb2tlKCk7bi5zZXRMaW5lRGFzaChbXSl9aWYoYS5hY3RpdmUpe2NvbnN0IGI9YS5hY3RpdmUsVD0obm4teCpTdCkqcCxBPShhLnJ1bkh1ZSt4KjcpJTM2MDtybyhuLGIueCpwLFQsYi53LEEscCw5KSxuLnN0cm9rZVN0eWxlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNDIpIixuLmxpbmVXaWR0aD1NYXRoLm1heCgxLDEuMipwKSxuLnN0cm9rZVJlY3QoYi54KnAsVCxiLncqcCxTdCpwKX1mb3IoY29uc3QgYiBvZiBhLnNsaWNlcyl7aWYoYi53PD0uNSljb250aW51ZTtjb25zdCBUPShiLngrYi53LzIpKnAsQT0oYi55K1N0LzIpKnA7bi5zYXZlKCksbi50cmFuc2xhdGUoVCxBKSxuLnJvdGF0ZShiLnJvdCksbi5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLE1hdGgubWluKDEsYi5saWZlLzUwMCkpLHJvKG4sLWIudy8yKnAsLVN0LzIqcCxiLncsYi5odWUscCwtNiksbi5yZXN0b3JlKCksbi5nbG9iYWxBbHBoYT0xfWZvcihjb25zdCBiIG9mIGEucmluZ3Mpe2NvbnN0IFQ9MS1iLmxpZmUvYi5tYXhMaWZlLEE9KGIucisoYi5tYXhSLWIucikqVCkqcDtuLnN0cm9rZVN0eWxlPWIuY29sb3Isbi5nbG9iYWxBbHBoYT1NYXRoLm1heCgwLGIubGlmZS9iLm1heExpZmUpKi45LG4ubGluZVdpZHRoPTMqcCxuLmJlZ2luUGF0aCgpLG4uYXJjKGIueCpwLGIueSpwLEEsMCxNYXRoLlBJKjIpLG4uc3Ryb2tlKCksbi5nbG9iYWxBbHBoYT0xfWlmKGEud2luZFQ+MCYmYS5hY3RpdmUpe2NvbnN0IGI9YS53aW5kVC8zODAqLjU1LFQ9KG5uLXgqU3QrU3QvMikqcDtuLnN0cm9rZVN0eWxlPWByZ2JhKDE5MSwyNDcsMjU1LCR7Yi50b0ZpeGVkKDMpfSlgLG4ubGluZVdpZHRoPU1hdGgubWF4KDEsMS41KnApO2ZvcihsZXQgQT0wO0E8NTtBKyspe2NvbnN0IGVlPVQrKEEtMikqOSpwLHJlPShhLnRpbWUqLjU1K0EqMTczKSUoaSsyMjApLTExMCwkPSg0MitBJTMqMzQpKnA7bi5iZWdpblBhdGgoKSxuLm1vdmVUbyhyZSxlZSksbi5saW5lVG8ocmUrJCxlZSksbi5zdHJva2UoKX19Zm9yKGNvbnN0IGIgb2YgYS5wYXJ0aWNsZXMpe2NvbnN0IFQ9TWF0aC5tYXgoMCxiLmxpZmUvYi5tYXhMaWZlKTtuLmdsb2JhbEFscGhhPVQsbi5maWxsU3R5bGU9Yi5jb2xvcjtjb25zdCBBPWIuc2l6ZSpwO24uZmlsbFJlY3QoYi54KnAtQS8yLGIueSpwLUEvMixBLEEpfW4uZ2xvYmFsQWxwaGE9MSxuLnRleHRBbGlnbj0iY2VudGVyIixuLnRleHRCYXNlbGluZT0ibWlkZGxlIjtmb3IoY29uc3QgYiBvZiBhLmZsb2F0ZXJzKXtjb25zdCBUPTEtYi5saWZlL2IubWF4TGlmZTtuLmdsb2JhbEFscGhhPU1hdGgubWF4KDAsMS1UKlQpLG4uZm9udD1gJHtNYXRoLm1heCg4LE1hdGgucm91bmQoMTEqcCkpfXB4ICJQcmVzcyBTdGFydCAyUCIsIG1vbm9zcGFjZWA7Y29uc3QgQT1iLnkqcC1UKjM0KnA7bi5saW5lV2lkdGg9NCpwLG4uc3Ryb2tlU3R5bGU9InJnYmEoNiwxMCw4LDAuNykiLG4uc3Ryb2tlVGV4dChiLnR4dCxiLngqcCxBKSxuLmZpbGxTdHlsZT1iLmNvbG9yLG4uZmlsbFRleHQoYi50eHQsYi54KnAsQSl9bi5nbG9iYWxBbHBoYT0xLG4ucmVzdG9yZSgpLGEuZmxhc2g+LjAxJiYobi5maWxsU3R5bGU9YHJnYmEoMjU1LDI1NSwyNTUsJHsoYS5mbGFzaCouNykudG9GaXhlZCgzKX0pYCxuLmZpbGxSZWN0KDAsMCxpLGMpKX1jb25zdCBpZD0ic2t5d2FyZC5iZXN0cy52MSIsb2Q9InNreXdhcmQuZGlmZi52MSI7ZnVuY3Rpb24gbm0oKXtjb25zdCBuPXticmVlemU6MCxnYWxlOjAsdGVtcGVzdDowfTt0cnl7Y29uc3QgYT1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShpZCk7aWYoIWEpcmV0dXJuIG47Y29uc3QgaT1KU09OLnBhcnNlKGEpO3JldHVybnticmVlemU6TnVtYmVyKGkuYnJlZXplKXx8MCxnYWxlOk51bWJlcihpLmdhbGUpfHwwLHRlbXBlc3Q6TnVtYmVyKGkudGVtcGVzdCl8fDB9fWNhdGNoe3JldHVybiBufX1mdW5jdGlvbiBGZigpe3RyeXtjb25zdCBuPWxvY2FsU3RvcmFnZS5nZXRJdGVtKG9kKTtpZihuPT09ImJyZWV6ZSJ8fG49PT0iZ2FsZSJ8fG49PT0idGVtcGVzdCIpcmV0dXJuIG59Y2F0Y2h7fXJldHVybiJnYWxlIn1mdW5jdGlvbiBybSgpe2NvbnN0IG49ai51c2VSZWYobnVsbCksYT1qLnVzZVJlZihudWxsKSxpPWoudXNlUmVmKG5vKGtsW0ZmKCldLCEwKSksYz1qLnVzZVJlZih7dzowLGg6MH0pLGg9ai51c2VSZWYoMCkscD1qLnVzZVJlZih7cGxhY2U6MCxwZXJmZWN0OjAsc2xpY2U6MCxndXN0OjAsZmFsbDowfSksbT1qLnVzZVJlZigwKSxbZixnXT1qLnVzZVN0YXRlKCJpZGxlIiksdj1qLnVzZVJlZigiaWRsZSIpLFt4LGJdPWoudXNlU3RhdGUoMCksVD1qLnVzZVJlZigwKSxbQSxlZV09ai51c2VTdGF0ZSgwKSxbcmUsJF09ai51c2VTdGF0ZSgwKSxbZ2UsZGVdPWoudXNlU3RhdGUoMCksW2FlLGhlXT1qLnVzZVN0YXRlKDApLFtYZSxSZV09ai51c2VTdGF0ZSghMSksW0VlLCRlXT1qLnVzZVN0YXRlKEZmKSxEZT1qLnVzZVJlZihFZSksW3plLEhlXT1qLnVzZVN0YXRlKG5tKSxPZT1qLnVzZVJlZih6ZSksW19lLEtlXT1qLnVzZVN0YXRlKFJsKSxGZT1qLnVzZVJlZihfZSksd2U9ai51c2VDYWxsYmFjayhWPT57di5jdXJyZW50PVYsZyhWKX0sW10pLGllPWoudXNlQ2FsbGJhY2soKCk9PntoLmN1cnJlbnQmJih3aW5kb3cuY2xlYXJUaW1lb3V0KGguY3VycmVudCksaC5jdXJyZW50PTApfSxbXSksUD1qLnVzZUNhbGxiYWNrKFY9PntpZSgpLHdlKCJyZWFkeSIpLGguY3VycmVudD13aW5kb3cuc2V0VGltZW91dCgoKT0+e2guY3VycmVudD0wLHYuY3VycmVudD09PSJyZWFkeSImJndlKCJydW5uaW5nIil9LFYpfSxbaWUsd2VdKSxLPWoudXNlQ2FsbGJhY2soKCk9PntqdCgpLGllKCksaS5jdXJyZW50PW5vKGtsW0RlLmN1cnJlbnRdLCExKSxwLmN1cnJlbnQ9e3BsYWNlOjAscGVyZmVjdDowLHNsaWNlOjAsZ3VzdDowLGZhbGw6MH0sVC5jdXJyZW50PTAsbS5jdXJyZW50PTAsYigwKSxlZSgwKSwkKDApLGRlKDApLFJlKCExKSxUci5zdGFydCgpLFAoOTAwKX0sW2llLFBdKSxfPWoudXNlQ2FsbGJhY2soKCk9Pnt2LmN1cnJlbnQ9PT0icnVubmluZyImJlpoKGkuY3VycmVudCxrbFtEZS5jdXJyZW50XSxwZXJmb3JtYW5jZS5ub3coKSl9LFtdKSxrPWoudXNlQ2FsbGJhY2soKCk9Pnt2LmN1cnJlbnQ9PT0icnVubmluZyImJihpZSgpLEFlLnBhdXNlKCksd2UoInBhdXNlZCIpKX0sW2llLHdlXSksUj1qLnVzZUNhbGxiYWNrKCgpPT57di5jdXJyZW50PT09InBhdXNlZCImJihqdCgpLEFlLnJlc3VtZSgpLFAoNTAwKSl9LFtQXSksbGU9ai51c2VDYWxsYmFjaygoKT0+e2NvbnN0IFY9di5jdXJyZW50O1Y9PT0iaWRsZSJ8fFY9PT0ib3ZlciI/SygpOlY9PT0icnVubmluZyI/XygpOlY9PT0icGF1c2VkIiYmUigpfSxbSyxfLFJdKSxJPWoudXNlQ2FsbGJhY2soVj0+e2NvbnN0IHBlPXYuY3VycmVudDtpZighKHBlPT09InJ1bm5pbmcifHxwZT09PSJyZWFkeSJ8fHBlPT09InBhdXNlZCIpKXtEZS5jdXJyZW50PVYsJGUoVik7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKG9kLFYpfWNhdGNoe31pLmN1cnJlbnQ9bm8oa2xbVl0sITApLFQuY3VycmVudD0wLGIoMCksZWUoMCksJCgwKSxkZSgwKSxSZSghMSl9fSxbXSksVT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgVj0hRmUuY3VycmVudDtGZS5jdXJyZW50PVYsS2UoViksc24oViksVGwoVil9LFtdKSx0ZT1qLnVzZUNhbGxiYWNrKCgpPT57Y29uc3QgVj1pLmN1cnJlbnQscGU9RGUuY3VycmVudCxxPVYuc2NvcmU7aWYocT5PZS5jdXJyZW50W3BlXSl7Y29uc3QgbWU9ey4uLk9lLmN1cnJlbnQsW3BlXTpxfTtPZS5jdXJyZW50PW1lLEhlKG1lKSxSZSghMCk7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGlkLEpTT04uc3RyaW5naWZ5KG1lKSl9Y2F0Y2h7fX13ZSgib3ZlciIpfSxbd2VdKSx1ZT1qLnVzZUNhbGxiYWNrKFY9PntWLnByZXZlbnREZWZhdWx0KCksanQoKTtjb25zdCBwZT12LmN1cnJlbnQ7cGU9PT0iaWRsZSJ8fHBlPT09Im92ZXIiP0soKTpwZT09PSJydW5uaW5nIiYmXygpfSxbSyxfXSk7cmV0dXJuIGoudXNlRWZmZWN0KCgpPT57c24oRmUuY3VycmVudCk7bGV0IFY9MDtjb25zdCBwZT1TZT0+e2NvbnN0IFk9aS5jdXJyZW50LFdlPVkubGFzdD9NYXRoLm1pbig2MCxTZS1ZLmxhc3QpOjE2O1kubGFzdD1TZTtjb25zdCBOZT12LmN1cnJlbnQ7SmgoWSxXZSxrbFtEZS5jdXJyZW50XSxOZT09PSJydW5uaW5nIiksWS5zY29yZSE9PVQuY3VycmVudCYmKFQuY3VycmVudD1ZLnNjb3JlLGIoWS5zY29yZSksaGUoamU9PmplKzEpKSxlZShobyhZKSksWS5jb21ibyE9PW0uY3VycmVudCYmKG0uY3VycmVudD1ZLmNvbWJvLCQoWS5jb21ibykpLGRlKFkubWF4Q29tYm8pO2NvbnN0IEI9cC5jdXJyZW50O1kuZXZQbGFjZSE9PUIucGxhY2UmJihCLnBsYWNlPVkuZXZQbGFjZSxUci5wbGFjZSgpKSxZLmV2UGVyZmVjdCE9PUIucGVyZmVjdCYmKEIucGVyZmVjdD1ZLmV2UGVyZmVjdCxUci5wZXJmZWN0KFkuY29tYm8pKSxZLmV2U2xpY2UhPT1CLnNsaWNlJiYoQi5zbGljZT1ZLmV2U2xpY2UsVHIuc2xpY2UoKSksWS5ldkd1c3QhPT1CLmd1c3QmJihCLmd1c3Q9WS5ldkd1c3QsVHIuZ3VzdCgpKSxZLmV2RmFsbCE9PUIuZmFsbCYmKEIuZmFsbD1ZLmV2RmFsbCxUci5mYWxsKCkpLE5lPT09InJ1bm5pbmciJiZZLmR5aW5nPjAmJlNlLVkuZHlpbmc+OTUwJiZ0ZSgpO2NvbnN0IE89bi5jdXJyZW50LFBlPWMuY3VycmVudDtpZihPJiZQZS53PjApe2NvbnN0IGplPU8uZ2V0Q29udGV4dCgiMmQiKTtqZSYmdG0oamUsWSxQZS53LFBlLmgsTmUpfVY9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHBlKX07Vj1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocGUpO2NvbnN0IHE9YS5jdXJyZW50LG1lPW4uY3VycmVudDtsZXQgSD1udWxsO2lmKHEmJm1lKXtjb25zdCBTZT0oKT0+e2NvbnN0IFk9cS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxXZT1NYXRoLm1heCgwLE1hdGguZmxvb3IoTWF0aC5taW4oWS53aWR0aCxZLmhlaWdodCkpKSxOZT1NYXRoLm1pbigyLHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKTttZS53aWR0aD1NYXRoLnJvdW5kKFdlKk5lKSxtZS5oZWlnaHQ9TWF0aC5yb3VuZChXZSpOZSksbWUuc3R5bGUud2lkdGg9YCR7V2V9cHhgLG1lLnN0eWxlLmhlaWdodD1gJHtXZX1weGAsYy5jdXJyZW50PXt3OldlLGg6V2V9O2NvbnN0IEI9bWUuZ2V0Q29udGV4dCgiMmQiKTtCJiZCLnNldFRyYW5zZm9ybShOZSwwLDAsTmUsMCwwKX07U2UoKSxIPW5ldyBSZXNpemVPYnNlcnZlcihTZSksSC5vYnNlcnZlKHEpfWNvbnN0IHZlPVNlPT57Y29uc3QgWT1TZS5rZXkudG9Mb3dlckNhc2UoKTtpZihZPT09IiAifHxZPT09ImVudGVyIil7U2UucHJldmVudERlZmF1bHQoKSxTZS5yZXBlYXR8fGxlKCk7cmV0dXJufWlmKFk9PT0iYXJyb3d1cCJ8fFk9PT0idyJ8fFk9PT0iYXJyb3dkb3duInx8WT09PSJzIil7U2UucHJldmVudERlZmF1bHQoKSxTZS5yZXBlYXR8fGxlKCk7cmV0dXJufWlmKFk9PT0iciIpe0soKTtyZXR1cm59aWYoWT09PSJwInx8WT09PSJlc2NhcGUiKXtjb25zdCBXZT12LmN1cnJlbnQ7V2U9PT0icnVubmluZyI/aygpOldlPT09InBhdXNlZCImJlIoKTtyZXR1cm59aWYoWT09PSJtIil7VSgpO3JldHVybn1ZPT09IjEiJiZJKCJicmVlemUiKSxZPT09IjIiJiZJKCJnYWxlIiksWT09PSIzIiYmSSgidGVtcGVzdCIpfTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigia2V5ZG93biIsdmUpO2NvbnN0IEY9KCk9Pntkb2N1bWVudC5oaWRkZW4mJnYuY3VycmVudD09PSJydW5uaW5nIiYmaygpfSxrZT0oKT0+e3YuY3VycmVudD09PSJydW5uaW5nIiYmaygpfTtyZXR1cm4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsRiksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImJsdXIiLGtlKSwoKT0+e2NhbmNlbEFuaW1hdGlvbkZyYW1lKFYpLGllKCksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoImtleWRvd24iLHZlKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixGKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYmx1ciIsa2UpLEgmJkguZGlzY29ubmVjdCgpfX0sW0ksaWUsdGUsayxsZSxSLEssVV0pLHtjYW52YXNSZWY6bix3cmFwUmVmOmEscGhhc2U6ZixzY29yZTp4LGZsb29yc1VwOkEsY29tYm86cmUsbWF4Q29tYm86Z2UscG9wS2V5OmFlLGlzTmV3QmVzdDpYZSxkaWZmaWN1bHR5OkVlLGJlc3RzOnplLG11dGVkOl9lLGFjdGlvbnM6e3N0YXJ0OksscHJpbWFyeTpsZSxkb0Ryb3A6XyxwYXVzZUdhbWU6ayxyZXN1bWVHYW1lOlIsY2hhbmdlRGlmZmljdWx0eTpJLHRvZ2dsZU11dGU6VSxvbkNhbnZhc0Rvd246dWV9fX1jb25zdCBCZj1be2lkOiJicmVlemUiLGxhYmVsOiJCcmVlemUiLHRhZzoiR2VudGxlIGRyaWZ0LCBmb3JnaXZpbmcgZWRnZSIsZG90czoxfSx7aWQ6ImdhbGUiLGxhYmVsOiJHYWxlIix0YWc6IkJyaXNrIHNsaWRlcywgcmFyZSBndXN0cyIsZG90czoyfSx7aWQ6InRlbXBlc3QiLGxhYmVsOiJUZW1wZXN0Iix0YWc6IkZhc3QgYmxvY2tzLCBzdWRkZW4gZ3VzdHMiLGRvdHM6M31dO2Z1bmN0aW9uIGxvKHtjbGFzc05hbWU6bj0iaC00IHctNCJ9KXtyZXR1cm4gcy5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMjQgMjQiLGZpbGw6ImN1cnJlbnRDb2xvciIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3MuanN4KCJwYXRoIix7ZDoiTTEyIDN2MTBtMCAwbC00LTRtNCA0bDQtNCIsc3Ryb2tlOiJjdXJyZW50Q29sb3IiLHN0cm9rZVdpZHRoOiIyLjQiLGZpbGw6Im5vbmUiLHN0cm9rZUxpbmVjYXA6InJvdW5kIixzdHJva2VMaW5lam9pbjoicm91bmQifSkscy5qc3goInBhdGgiLHtkOiJNNSAxN2gxNHYzSDV6IixyeDoiMSJ9KV19KX1mdW5jdGlvbiBzbyh7bGFiZWw6bix2YWx1ZTphLGFjY2VudDppPSExLHBvcDpjPTAsZGltOmg9ITF9KXtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJvdW5kZWQgYm9yZGVyIGJvcmRlci1waXQtNjAwIGJnLXBpdC04NTAvOTAgcHgtMi41IHB5LTEuNSBzbTpweC0zLjUiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bN3B4XSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpufSkscy5qc3goImRpdiIse2NsYXNzTmFtZTpgZm9udC1kaXNwbGF5IHRleHQtc20gbGVhZGluZy10aWdodCBzbTp0ZXh0LWJhc2UgJHtpPyJhbmltYXRlLXBvcCB0ZXh0LWFtYmVyZ2xvdy00MDAiOmg/InRleHQtbW9zcy00MDAiOiJ0ZXh0LW1vc3MtMTAwIn1gLGNoaWxkcmVuOmF9LGMpXX0pfWZ1bmN0aW9uIF9yKHtrZXlzTGlzdDpuLGFjdGlvbjphfSl7cmV0dXJuIHMuanN4cygibGkiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiB0ZXh0LVsxMnB4XSB0ZXh0LW1vc3MtMjAwIixjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGdhcC0xIixjaGlsZHJlbjpufSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6InRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOmF9KV19KX1mdW5jdGlvbiBsbSgpe2NvbnN0IG49cm0oKSx7YWN0aW9uczphLHBoYXNlOml9PW4sYz1pPT09InJ1bm5pbmciO3JldHVybiBzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiYW5pbWF0ZS1yaXNlIixjaGlsZHJlbjpbcy5qc3hzKCJoZWFkZXIiLHtjbGFzc05hbWU6Im1iLTQgZmxleCBmbGV4LXdyYXAgaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBnYXAtMyIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJmbGV4IGZsZXgtd3JhcCBpdGVtcy1lbmQgZ2FwLTIgc206Z2FwLTMiLGNoaWxkcmVuOltzLmpzeChzbyx7bGFiZWw6IlNjb3JlIix2YWx1ZTpuLnNjb3JlLGFjY2VudDohMCxwb3A6bi5wb3BLZXl9KSxzLmpzeChzbyx7bGFiZWw6IkZsb29yIix2YWx1ZTpuLmZsb29yc1VwfSkscy5qc3goc28se2xhYmVsOiJCZXN0Iix2YWx1ZTpuLmJlc3RzW24uZGlmZmljdWx0eV19KSxzLmpzeHMoImRpdiIse2NsYXNzTmFtZToicm91bmRlZCBib3JkZXIgYm9yZGVyLXBpdC02MDAgYmctcGl0LTg1MC85MCBweC0yLjUgcHktMS41IHNtOnB4LTMuNSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs3cHhdIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJDb21ibyJ9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1zbSBsZWFkaW5nLXRpZ2h0IHNtOnRleHQtYmFzZSAke24uY29tYm8+MT8iYW5pbWF0ZS1wdWxzZS1zb2Z0IHRleHQtYW1iZXJnbG93LTMwMCBbdGV4dC1zaGFkb3c6MF8wXzE0cHhfcmdiYSgyNTUsMjI0LDEzOCwwLjUpXSI6bi5jb21ibz09PTE/InRleHQtYW1iZXJnbG93LTQwMCI6InRleHQtbW9zcy00MDAifWAsY2hpbGRyZW46bi5jb21ibz4wP2DDlyR7bi5jb21ib31gOiLigJQifSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOmM/IlBhdXNlIjoiUmVzdW1lIix0aXRsZTpjPyJQYXVzZSAoUCkiOiJSZXN1bWUgKFApIixvbkNsaWNrOmM/YS5wYXVzZUdhbWU6YS5yZXN1bWVHYW1lLGRpc2FibGVkOiFjJiZpIT09InBhdXNlZCIsY2hpbGRyZW46Yz9zLmpzeCh4bix7fSk6cy5qc3goUWUse30pfSkscy5qc3goImJ1dHRvbiIse3R5cGU6ImJ1dHRvbiIsY2xhc3NOYW1lOiJpY29uLWJ0biIsImFyaWEtbGFiZWwiOiJSZXN0YXJ0Iix0aXRsZToiUmVzdGFydCAoUikiLG9uQ2xpY2s6YS5zdGFydCxjaGlsZHJlbjpzLmpzeChpdCx7fSl9KSxzLmpzeCgiYnV0dG9uIix7dHlwZToiYnV0dG9uIixjbGFzc05hbWU6Imljb24tYnRuIiwiYXJpYS1sYWJlbCI6bi5tdXRlZD8iVW5tdXRlIjoiTXV0ZSIsdGl0bGU6IlNvdW5kIChNKSIsb25DbGljazphLnRvZ2dsZU11dGUsY2hpbGRyZW46bi5tdXRlZD9zLmpzeChQbCx7fSk6cy5qc3goRWwse30pfSldfSldfSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImdyaWQgZ2FwLTQgbGc6Z3JpZC1jb2xzLVttaW5tYXgoMCwxZnIpXzMwMHB4XSIsY2hpbGRyZW46W3MuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSIsY2hpbGRyZW46W3MuanN4KCJkaXYiLHtyZWY6bi53cmFwUmVmLGNsYXNzTmFtZToicmVsYXRpdmUiLGNoaWxkcmVuOnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJib2FyZC1mcmFtZSBzY2FubGluZXMgcmVsYXRpdmUgbXgtYXV0byBhc3BlY3Qtc3F1YXJlIHctZnVsbCBtYXgtdy1bbWluKDk0dncsODIwcHgsY2FsYygxMDBkdmgtMTkwcHgpKV0gdG91Y2gtbm9uZSBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW4gbGc6bWF4LXctW21pbigxMDAlLGNhbGMoMTAwZHZoLTI4MHB4KSldIixjaGlsZHJlbjpbcy5qc3goImNhbnZhcyIse3JlZjpuLmNhbnZhc1JlZixjbGFzc05hbWU6ImFic29sdXRlIGluc2V0LTAgbS1hdXRvIGN1cnNvci1wb2ludGVyIixvblBvaW50ZXJEb3duOmEub25DYW52YXNEb3duLG9uQ29udGV4dE1lbnU6aD0+aC5wcmV2ZW50RGVmYXVsdCgpfSkscy5qc3goImRpdiIse2NsYXNzTmFtZToicG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0yIHotMjAiLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOlsibGVmdC0wIHRvcC0wIGJvcmRlci1sLTIgYm9yZGVyLXQtMiIsInJpZ2h0LTAgdG9wLTAgYm9yZGVyLXItMiBib3JkZXItdC0yIiwibGVmdC0wIGJvdHRvbS0wIGJvcmRlci1sLTIgYm9yZGVyLWItMiIsInJpZ2h0LTAgYm90dG9tLTAgYm9yZGVyLXItMiBib3JkZXItYi0yIl0ubWFwKGg9PnMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOmBhYnNvbHV0ZSBoLTQgdy00IGJvcmRlci1bIzdlZjBjOF0vNDAgJHtofWB9LGgpKX0pLGk9PT0iaWRsZSImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMxMDE0MjVdLzc4IHAtNiB0ZXh0LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsycHhdIixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goImgxIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1taW50IGZvbnQtZGlzcGxheSB0ZXh0LTN4bCBzbTp0ZXh0LTR4bCIsY2hpbGRyZW46IlNLWVdBUkQifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0zIHRleHQtWzlweF0gdHJhY2tpbmctWzAuM2VtXSB0ZXh0LVsjOWZkOGMyXSIsY2hpbGRyZW46IlNUQUNLIMK3IFNMSUNFIMK3IEFTQ0VORCJ9KV19KSxzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChsbyx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhcnQgQ2xpbWJpbmciXX0pfSkscy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtYmxpbmsgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOiJQUkVTUyBTUEFDRSBPUiBUQVAifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJTcGFjZSJ9KSwiIGRyb3AgYmxvY2siXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXBpdC01MDAiLGNoaWxkcmVuOiLigKIifSkscy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJQIn0pLCIgcGF1c2UiXX0pLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJ0ZXh0LXBpdC01MDAiLGNoaWxkcmVuOiLigKIifSkscy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSIsY2hpbGRyZW46W3MuanN4KEcse2NoaWxkcmVuOiJSIn0pLCIgcmVzdGFydCJdfSldfSksbi5pc05ld0Jlc3QmJnMuanN4KCJwIix7Y2xhc3NOYW1lOiJhbmltYXRlLXB1bHNlLXNvZnQgZm9udC1kaXNwbGF5IHRleHQtWzEwcHhdIHRleHQtYW1iZXJnbG93LTQwMCIsY2hpbGRyZW46IuKYhSBORVcgUkVDT1JEIOKYhSJ9KV19KSxpPT09InBhdXNlZCImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTUgYmctWyMxMDE0MjVdLzc4IHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJyZXRyby10aXRsZS1taW50IGZvbnQtZGlzcGxheSB0ZXh0LXhsIixjaGlsZHJlbjoiQlJFQVRIRVIifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyIsY2hpbGRyZW46W3MuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEucmVzdW1lR2FtZSxjaGlsZHJlbjpzLmpzeHMoInNwYW4iLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIixjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSl9KSxzLmpzeChZZSx7b25DbGljazphLnN0YXJ0LGNoaWxkcmVuOnMuanN4cygic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOltzLmpzeChpdCx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgUmVzdGFydCJdfSl9KV19KSxzLmpzeHMoInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjpbcy5qc3goRyx7Y2hpbGRyZW46IlAifSksIiAiLHMuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJteC0xIixjaGlsZHJlbjoib3IifSksIiAiLHMuanN4KEcse2NoaWxkcmVuOiJFc2MifSkscy5qc3goInNwYW4iLHtjbGFzc05hbWU6Im1sLTEiLGNoaWxkcmVuOiJyZXN1bWVzIn0pXX0pXX0pLGk9PT0ib3ZlciImJnMuanN4cygiZGl2Iix7Y2xhc3NOYW1lOiJhbmltYXRlLWZhZGVpbiBhYnNvbHV0ZSBpbnNldC0wIHotMzAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTQgYmctWyMxMDE0MjVdLzg1IHAtNiB0ZXh0LWNlbnRlciIsY2hpbGRyZW46W3MuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC14bCB0ZXh0LWFwcGxlLTQwMCBbdGV4dC1zaGFkb3c6MF8wXzI0cHhfcmdiYSgyNTUsMTA3LDEwNywwLjUpXSBzbTp0ZXh0LTJ4bCIsY2hpbGRyZW46IlRPV0VSIEZFTEwifSkscy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6ImZsZXggaXRlbXMtZW5kIGdhcC02IixjaGlsZHJlbjpbcy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLXdpZGVzdCB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjoiU0NPUkUifSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LTJ4bCB0ZXh0LWFtYmVyZ2xvdy00MDAiLGNoaWxkcmVuOm4uc2NvcmV9KV19KSxzLmpzeHMoImRpdiIse2NoaWxkcmVuOltzLmpzeCgicCIse2NsYXNzTmFtZToiZm9udC1kaXNwbGF5IHRleHQtWzhweF0gdHJhY2tpbmctd2lkZXN0IHRleHQtbW9zcy0zMDAiLGNoaWxkcmVuOiJCRVNUIn0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC0yeGwgdGV4dC1tb3NzLTEwMCIsY2hpbGRyZW46bi5iZXN0c1tuLmRpZmZpY3VsdHldfSldfSldfSkscy5qc3hzKCJwIix7Y2xhc3NOYW1lOiJmb250LWRpc3BsYXkgdGV4dC1bOXB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1bIzlmZDhjMl0iLGNoaWxkcmVuOlsiRkxPT1IgIixuLmZsb29yc1VwLCIgwrcgQkVTVCBDT01CTyDDlyIsTWF0aC5tYXgoMSxuLm1heENvbWJvKV19KSxuLmlzTmV3QmVzdCYmcy5qc3goInAiLHtjbGFzc05hbWU6ImFuaW1hdGUtcHVsc2Utc29mdCBmb250LWRpc3BsYXkgdGV4dC1bMTBweF0gdGV4dC1hbWJlcmdsb3ctNDAwIixjaGlsZHJlbjoi4piFIE5FVyBSRUNPUkQg4piFIn0pLHMuanN4KFllLHt2YXJpYW50OiJwcmltYXJ5IixvbkNsaWNrOmEuc3RhcnQsY2hpbGRyZW46cy5qc3hzKCJzcGFuIix7Y2xhc3NOYW1lOiJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiIsY2hpbGRyZW46W3MuanN4KGl0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBDbGltYiBBZ2FpbiJdfSl9KSxzLmpzeCgicCIse2NsYXNzTmFtZToiYW5pbWF0ZS1ibGluayBmb250LWRpc3BsYXkgdGV4dC1bOHB4XSB0cmFja2luZy13aWRlc3QgdGV4dC1tb3NzLTMwMCIsY2hpbGRyZW46IlBSRVNTIFNQQUNFIn0pXX0pXX0pfSkscy5qc3goImRpdiIse2NsYXNzTmFtZToibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIixjaGlsZHJlbjpzLmpzeChZZSx7dmFyaWFudDoicHJpbWFyeSIsb25DbGljazphLnByaW1hcnksY2xhc3NOYW1lOiJtaW4tdy1bMjIwcHhdIixjaGlsZHJlbjpzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIiLGNoaWxkcmVuOmk9PT0icnVubmluZyI/cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChsbyx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgRHJvcCBCbG9jayJdfSk6aT09PSJwYXVzZWQiP3MuanN4cyhzLkZyYWdtZW50LHtjaGlsZHJlbjpbcy5qc3goUWUse2NsYXNzTmFtZToiaC00IHctNCJ9KSwiIFJlc3VtZSJdfSk6aT09PSJvdmVyIj9zLmpzeHMocy5GcmFnbWVudCx7Y2hpbGRyZW46W3MuanN4KGl0LHtjbGFzc05hbWU6ImgtNCB3LTQifSksIiBDbGltYiBBZ2FpbiJdfSk6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChsbyx7Y2xhc3NOYW1lOiJoLTQgdy00In0pLCIgU3RhcnQgQ2xpbWJpbmciXX0pfSl9KX0pXX0pLHMuanN4cygiYXNpZGUiLHtjbGFzc05hbWU6ImdyaWQgY29udGVudC1zdGFydCBnYXAtNCIsY2hpbGRyZW46W3MuanN4cyhRdCx7dGl0bGU6IkJsb2NrIFNjaWVuY2UiLGNoaWxkcmVuOltzLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yIHRleHQtWzEycHhdIHRleHQtbW9zcy0yMDAiLGNoaWxkcmVuOltzLmpzeHMoImxpIix7Y2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmb250LWJvbGQgdGV4dC1hbWJlcmdsb3ctMzAwIixjaGlsZHJlbjoiUGVyZmVjdCBsYW5kaW5ncyJ9KSwiIHNuYXAgdGhlIGJsb2NrIGZsdXNoLCBrZWVwIGl0cyB3aWR0aCDigJQgZXZlbiByZWdyb3cgaXQg4oCUIGFuZCBidWlsZCBhIGNvbWJvIHdvcnRoIHVwIHRvICsxNzAgcGVyIGRyb3AuIl19KSxzLmpzeHMoImxpIix7Y2hpbGRyZW46W3MuanN4KCJzcGFuIix7Y2xhc3NOYW1lOiJmb250LWJvbGQgdGV4dC1hcHBsZS00MDAiLGNoaWxkcmVuOiJPZmYtY2VudGVyIGRyb3BzIn0pLCIgc2hlYXIgdGhlIG92ZXJoYW5nIGF3YXkuIFRoZSB0b3dlciBuYXJyb3dzIHdpdGggZXZlcnkgbWlzcy1zdGVwLiJdfSkscy5qc3hzKCJsaSIse2NoaWxkcmVuOltzLmpzeCgic3BhbiIse2NsYXNzTmFtZToiZm9udC1ib2xkIHRleHQtWyM3ZWYwYzhdIixjaGlsZHJlbjoiTWlzcyBlbnRpcmVseSJ9KSwiIGFuZCB0aGUgYmxvY2sgdHVtYmxlcyBvZmYg4oCUIHRoZSBydW4gaXMgb3Zlci4iXX0pLHMuanN4cygibGkiLHtjaGlsZHJlbjpbcy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZvbnQtYm9sZCB0ZXh0LVsjYmZmN2ZmXSIsY2hpbGRyZW46Ikd1c3RzIn0pLCIgKEdhbGUgYW5kIHVwKSBmbGlwIHRoZSBibG9jayBtaWQtc2xpZGUgd2l0aG91dCB3YXJuaW5nLiBXYXRjaCB0aGUgd2luZCBsaW5lcy4iXX0pXX0pLHMuanN4KCJwIix7Y2xhc3NOYW1lOiJtdC0zIGJvcmRlci10IGJvcmRlci1waXQtNjAwIHB0LTIgdGV4dC1bMTFweF0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IlRoZSBza3kgdHVybnMgYSBmdWxsIGRheS1uaWdodCBjeWNsZSBldmVyeSA4NCBmbG9vcnMuIEJsb2NrcyBjeWNsZSBodWUgYXMgeW91IGNsaW1iIOKAlCBubyB0d28gdG93ZXJzIGxvb2sgYWxpa2UuIn0pXX0pLHMuanN4KExsLHt0aXRsZToiV2luZCBSZXBvcnQiLG9wdGlvbnM6QmYsdmFsdWU6bi5kaWZmaWN1bHR5LG9uQ2hhbmdlOmEuY2hhbmdlRGlmZmljdWx0eSxkaXNhYmxlZDppPT09InJ1bm5pbmcifHxpPT09InJlYWR5Inx8aT09PSJwYXVzZWQifSkscy5qc3goX2wse2Jlc3RzOm4uYmVzdHMsb3B0aW9uczpCZixhY3RpdmU6bi5kaWZmaWN1bHR5fSkscy5qc3hzKFF0LHt0aXRsZToiQ29udHJvbHMiLGNoaWxkcmVuOltzLmpzeHMoInVsIix7Y2xhc3NOYW1lOiJncmlkIGdhcC0yLjUiLGNoaWxkcmVuOltzLmpzeChfcix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiU3BhY2UifSkscy5qc3goRyx7Y2hpbGRyZW46IkVudGVyIn0pXX0pLGFjdGlvbjoiRHJvcCBibG9jayJ9KSxzLmpzeChfcix7a2V5c0xpc3Q6cy5qc3goRyx7Y2hpbGRyZW46IkNsaWNrIC8gVGFwIn0pLGFjdGlvbjoiRHJvcCBibG9jayJ9KSxzLmpzeChfcix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiUCJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiRXNjIn0pXX0pLGFjdGlvbjoiUGF1c2UifSkscy5qc3goX3Ise2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJSIn0pLGFjdGlvbjoiUmVzdGFydCJ9KSxzLmpzeChfcix7a2V5c0xpc3Q6cy5qc3hzKHMuRnJhZ21lbnQse2NoaWxkcmVuOltzLmpzeChHLHtjaGlsZHJlbjoiMSJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMiJ9KSxzLmpzeChHLHtjaGlsZHJlbjoiMyJ9KV19KSxhY3Rpb246IldpbmQgbGV2ZWwifSkscy5qc3goX3Ise2tleXNMaXN0OnMuanN4KEcse2NoaWxkcmVuOiJNIn0pLGFjdGlvbjoiU291bmQifSldfSkscy5qc3goInAiLHtjbGFzc05hbWU6Im10LTMgYm9yZGVyLXQgYm9yZGVyLXBpdC02MDAgcHQtMiB0ZXh0LVsxMXB4XSB0ZXh0LW1vc3MtNDAwIixjaGlsZHJlbjoiVG91Y2g6IHRhcCBhbnl3aGVyZSBvbiB0aGUgYm9hcmQg4oCUIG9yIHRoZSBiaWcgRFJPUCBidXR0b24g4oCUIHRvIHJlbGVhc2UgdGhlIGJsb2NrLiJ9KV19KV19KV19KV19KX1jb25zdCBzbT17c25ha2U6e25hbWU6IlNFUlBFTlRJTkUiLHN1YjoiZWF0IMK3IGdyb3cgwrcgc3Vydml2ZSJ9LHNob290ZXI6e25hbWU6IlZFQ1RPUiBTVFJJS0UiLHN1Yjoid2F2ZSBkZWZlbnNlIGJsYXN0ZXIifSxicmljazp7bmFtZToiQlJJQ0sgUklPVCIsc3ViOiJzbWFzaCDCtyBjb21ibyDCtyBzdXJ2aXZlIn0sYmFzZWJhbGw6e25hbWU6IlNMVUdHRVIgTklHSFQiLHN1YjoidGltaW5nIGJhdHRpbmcgdnMuIGNwdSBhcm1zIn0sc3RhY2s6e25hbWU6IlNLWVdBUkQiLHN1Yjoic3RhY2sgwrcgc2xpY2UgwrcgYXNjZW5kIn19O2Z1bmN0aW9uICRmKHtjbGFzc05hbWU6bj0iaC05IHctOSJ9KXtyZXR1cm4gcy5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTpuLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltzLmpzeCgicGF0aCIse2Q6Ik03IDIxYzAtNC4yIDMuNC02LjUgNy40LTYuNWg0LjhjMi45IDAgNC44LTEuOSA0LjgtNC40IixzdHJva2U6IiNhY2Y2NjQiLHN0cm9rZVdpZHRoOiI0IixzdHJva2VMaW5lY2FwOiJyb3VuZCJ9KSxzLmpzeCgicGF0aCIse2Q6Ik03IDIxYzAgMyAyLjQgNSA1LjggNWg5LjQiLHN0cm9rZToiIzhlZjA1YSIsc3Ryb2tlV2lkdGg6IjQiLHN0cm9rZUxpbmVjYXA6InJvdW5kIixvcGFjaXR5OiIwLjUifSkscy5qc3goImNpcmNsZSIse2N4OiIyMC41IixjeToiNy41IixyOiIzLjQiLGZpbGw6IiNmZmUwOGEifSkscy5qc3goImNpcmNsZSIse2N4OiIyMS42IixjeToiNi42IixyOiIwLjkiLGZpbGw6IiMwYzFkMTMifSldfSl9ZnVuY3Rpb24gV2Yoe2NsYXNzTmFtZTpuPSJoLTkgdy05In0pe3JldHVybiBzLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3MuanN4KCJjaXJjbGUiLHtjeDoiMTYiLGN5OiIxNiIscjoiMTMiLHN0cm9rZToiIzYyZTZmZiIsc3Ryb2tlV2lkdGg6IjIiLG9wYWNpdHk6IjAuNyJ9KSxzLmpzeCgicGF0aCIse2Q6Ik0xNiAzdjVNMTYgMjR2NU0zIDE2aDVNMjQgMTZoNSIsc3Ryb2tlOiIjNjJlNmZmIixzdHJva2VXaWR0aDoiMiIsc3Ryb2tlTGluZWNhcDoicm91bmQifSkscy5qc3goInBhdGgiLHtkOiJNMTYgOWw2IDEzLjUtNi0zLjYtNiAzLjZ6IixmaWxsOiIjZmZkMTY2IixzdHJva2U6IiNmZmYzYzQiLHN0cm9rZVdpZHRoOiIxIixzdHJva2VMaW5lam9pbjoicm91bmQifSldfSl9ZnVuY3Rpb24gVWYoe2NsYXNzTmFtZTpuPSJoLTkgdy05In0pe3JldHVybiBzLmpzeHMoInN2ZyIse3ZpZXdCb3g6IjAgMCAzMiAzMiIsZmlsbDoibm9uZSIsY2xhc3NOYW1lOm4sImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46W3MuanN4KCJyZWN0Iix7eDoiMyIseToiNSIsd2lkdGg6IjgiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiM4ZWYwNWEifSkscy5qc3goInJlY3QiLHt4OiIxMi41Iix5OiI1Iix3aWR0aDoiOCIsaGVpZ2h0OiI1IixyeDoiMSIsZmlsbDoiI2ZmYzg1NyJ9KSxzLmpzeCgicmVjdCIse3g6IjIyIix5OiI1Iix3aWR0aDoiNyIsaGVpZ2h0OiI1IixyeDoiMSIsZmlsbDoiI2ZmNWQ4ZiJ9KSxzLmpzeCgicmVjdCIse3g6IjMiLHk6IjEyIix3aWR0aDoiMTIiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiNmZmM4NTciLG9wYWNpdHk6IjAuODUifSkscy5qc3goInJlY3QiLHt4OiIxNi41Iix5OiIxMiIsd2lkdGg6IjEyLjUiLGhlaWdodDoiNSIscng6IjEiLGZpbGw6IiM4ZWYwNWEiLG9wYWNpdHk6IjAuODUifSkscy5qc3goImNpcmNsZSIse2N4OiIxNiIsY3k6IjIyIixyOiIzIixmaWxsOiIjZmZlMDhhIn0pLHMuanN4KCJyZWN0Iix7eDoiOCIseToiMjYuNSIsd2lkdGg6IjE2IixoZWlnaHQ6IjMuNSIscng6IjEuNzUiLGZpbGw6IiNmZmM4NTcifSldfSl9ZnVuY3Rpb24gSGYoe2NsYXNzTmFtZTpuPSJoLTkgdy05In0pe2NvbnN0IGE9KGksYyxoLHAsbSk9PnMuanN4cygiZyIse2NoaWxkcmVuOltzLmpzeCgicGF0aCIse2Q6YE03ICR7aX0gTDEyICR7aS0zLjR9IEgzMCBMMjUgJHtpfSBaYCxmaWxsOmh9KSxzLmpzeCgicGF0aCIse2Q6YE0yNSAke2l9IEwzMCAke2ktMy40fSBWJHtpKzIuMX0gTDI1ICR7aSs1LjV9IFpgLGZpbGw6cH0pLHMuanN4KCJyZWN0Iix7eDoiNyIseTppLHdpZHRoOiIxOCIsaGVpZ2h0OiI1LjUiLGZpbGw6Y30pXX0sbSk7cmV0dXJuIHMuanN4cygic3ZnIix7dmlld0JveDoiMCAwIDMyIDMyIixmaWxsOiJub25lIixjbGFzc05hbWU6biwiYXJpYS1oaWRkZW4iOiJ0cnVlIixjaGlsZHJlbjpbYSgyMywiIzNmYzlhNiIsIiM3ZWYwYzgiLCIjMmE5ZTgwIiwiYjEiKSxhKDE1LjUsIiMyZmI5OGYiLCIjNWZlMGI0IiwiIzFmOGE2YSIsImIyIiksYSg4LCIjZThiODRhIiwiI2ZmZDE2NiIsIiNiOThjMmUiLCJiMyIpXX0pfWZ1bmN0aW9uIFZmKHtjbGFzc05hbWU6bj0iaC05IHctOSJ9KXtyZXR1cm4gcy5qc3hzKCJzdmciLHt2aWV3Qm94OiIwIDAgMzIgMzIiLGZpbGw6Im5vbmUiLGNsYXNzTmFtZTpuLCJhcmlhLWhpZGRlbiI6InRydWUiLGNoaWxkcmVuOltzLmpzeCgiY2lyY2xlIix7Y3g6IjE2IixjeToiMTYiLHI6IjEyLjUiLGZpbGw6IiNmMmVkZTAifSkscy5qc3goInBhdGgiLHtkOiJNOC41IDcuNWMzLjUgMi40IDUuNSA1LjIgNS41IDguNXMtMiA2LjEtNS41IDguNSIsc3Ryb2tlOiIjZDQzYjNiIixzdHJva2VXaWR0aDoiMS42IixzdHJva2VMaW5lY2FwOiJyb3VuZCIsZmlsbDoibm9uZSJ9KSxzLmpzeCgicGF0aCIse2Q6Ik0yMy41IDcuNWMtMy41IDIuNC01LjUgNS4yLTUuNSA4LjVzMiA2LjEgNS41IDguNSIsc3Ryb2tlOiIjZDQzYjNiIixzdHJva2VXaWR0aDoiMS42IixzdHJva2VMaW5lY2FwOiJyb3VuZCIsZmlsbDoibm9uZSJ9KSxzLmpzeCgicGF0aCIse2Q6Ik05LjYgMTFsMiAuOU05LjYgMjFsMi0uOU0yMi40IDExbC0yIC45TTIyLjQgMjFsLTItLjkiLHN0cm9rZToiI2Q0M2IzYiIsc3Ryb2tlV2lkdGg6IjEuMSIsc3Ryb2tlTGluZWNhcDoicm91bmQifSldfSl9ZnVuY3Rpb24gYW0oKXtjb25zdFtuLGFdPWoudXNlU3RhdGUoInNuYWtlIiksaT1zbVtuXTtyZXR1cm4gcy5qc3hzKCJkaXYiLHtjbGFzc05hbWU6InJlbGF0aXZlIGZsZXggbWluLWgtZHZoIGZsZXgtY29sIG92ZXJmbG93LWhpZGRlbiBiZy1waXQtOTUwIHRleHQtbW9zcy0xMDAiLGNoaWxkcmVuOltzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTAgb3BhY2l0eS02MCIsc3R5bGU6e2JhY2tncm91bmRJbWFnZToibGluZWFyLWdyYWRpZW50KHJnYmEoMTQwLDIwMCwxNjAsMC4wNSkgMXB4LCB0cmFuc3BhcmVudCAxcHgpLCBsaW5lYXItZ3JhZGllbnQoOTBkZWcsIHJnYmEoMTQwLDIwMCwxNjAsMC4wNSkgMXB4LCB0cmFuc3BhcmVudCAxcHgpIixiYWNrZ3JvdW5kU2l6ZToiMzRweCAzNHB4IixtYXNrSW1hZ2U6InJhZGlhbC1ncmFkaWVudChlbGxpcHNlIDkwJSA3MCUgYXQgNTAlIDMwJSwgYmxhY2sgMzAlLCB0cmFuc3BhcmVudCA3NSUpIixXZWJraXRNYXNrSW1hZ2U6InJhZGlhbC1ncmFkaWVudChlbGxpcHNlIDkwJSA3MCUgYXQgNTAlIDMwJSwgYmxhY2sgMzAlLCB0cmFuc3BhcmVudCA3NSUpIn0sImFyaWEtaGlkZGVuIjoidHJ1ZSJ9KSxzLmpzeCgiZGl2Iix7Y2xhc3NOYW1lOiJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGluc2V0LTAiLHN0eWxlOntiYWNrZ3JvdW5kOiJyYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSA2MCUgNDIlIGF0IDUwJSAtOCUsIHJnYmEoMjU1LDIwMCw4NywwLjEyKSwgdHJhbnNwYXJlbnQgNzAlKSwgcmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgNDUlIDM1JSBhdCAxMiUgMTA4JSwgcmdiYSgxMTEsMjI0LDgxLDAuMDcpLCB0cmFuc3BhcmVudCA3MCUpLCByYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSA0NSUgMzUlIGF0IDg4JSAxMDglLCByZ2JhKDk4LDIzMCwyNTUsMC4wNyksIHRyYW5zcGFyZW50IDcwJSkifSwiYXJpYS1oaWRkZW4iOiJ0cnVlIn0pLHMuanN4KCJkaXYiLHtjbGFzc05hbWU6InBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgaW5zZXQtMCIsImFyaWEtaGlkZGVuIjoidHJ1ZSIsY2hpbGRyZW46QXJyYXkuZnJvbSh7bGVuZ3RoOjEyfSwoYyxoKT0+cy5qc3goInNwYW4iLHtjbGFzc05hbWU6ImZpcmVmbHkiLHN0eWxlOntsZWZ0OmAke2gqODMlMTAwfSVgLHRvcDpgJHsoaCo0NysxMyklMTAwfSVgLHdpZHRoOmglMz09PTA/MzoyLGhlaWdodDpoJTM9PT0wPzM6MiwiLS10eCI6YCR7KGglNS0yKSo2MH1weGAsIi0tdHkiOmAkeyhoJTQtMikqODB9cHhgLCItLWQiOmAkezcraCU1KjN9c2AsIi0tZGVsIjpgJHstKGgqMS43KX1zYCwiLS1wZWFrIjouNStoJTMqLjE4LCItLWMiOmglND09PTA/IiNmZmUwOGEiOmglMz09PTA/IiM2MmU2ZmYiOiIjYWNmNjY0In19LGgpKX0pLHMuanN4cygiaGVhZGVyIix7Y2xhc3NOYW1lOiJyZWxhdGl2ZSB6LTEwIG14LWF1dG8gZmxleCB3LWZ1bGwgbWF4LXctNnhsIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00IHB4LTQgcGItMyBwdC01IHNtOnB4LTYiLGNoaWxkcmVuOltzLmpzeHMoImRpdiIse2NsYXNzTmFtZToiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMiLGNoaWxkcmVuOltuPT09InNuYWtlIj9zLmpzeCgkZix7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6bj09PSJzaG9vdGVyIj9zLmpzeChXZix7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSk6bj09PSJicmljayI/cy5qc3goVWYse2NsYXNzTmFtZToiaC0xMCB3LTEwIn0pOm49PT0iYmFzZWJhbGwiP3MuanN4KFZmLHtjbGFzc05hbWU6ImgtMTAgdy0xMCJ9KTpzLmpzeChIZix7Y2xhc3NOYW1lOiJoLTEwIHctMTAifSkscy5qc3hzKCJkaXYiLHtjaGlsZHJlbjpbcy5qc3goImgxIix7Y2xhc3NOYW1lOmBmb250LWRpc3BsYXkgdGV4dC1sZyBsZWFkaW5nLW5vbmUgc206dGV4dC14bCAke249PT0ic2hvb3RlciI/InJldHJvLXRpdGxlLWN5YW4iOm49PT0iYnJpY2siPyJyZXRyby10aXRsZS1waW5rIjpuPT09ImJhc2ViYWxsIj8icmV0cm8tdGl0bGUtY2hhbGsiOm49PT0ic3RhY2siPyJyZXRyby10aXRsZS1taW50IjoicmV0cm8tdGl0bGUifWAsY2hpbGRyZW46aS5uYW1lfSkscy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSBtdC0xLjUgdGV4dC1bOHB4XSB0cmFja2luZy1bMC4yNWVtXSB0ZXh0LW1vc3MtMzAwIixjaGlsZHJlbjppLnN1Yi50b1VwcGVyQ2FzZSgpfSldfSldfSkscy5qc3goIm5hdiIseyJhcmlhLWxhYmVsIjoiR2FtZSBzZWxlY3QiLGNsYXNzTmFtZToiaW5saW5lLWZsZXggcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXBpdC01MDAgYmctcGl0LTkwMC84MCBwLTEgc2hhZG93LVtpbnNldF8wXzJweF84cHhfcmdiYSgwLDAsMCwwLjU1KV0iLGNoaWxkcmVuOlt7aWQ6InNuYWtlIixsYWJlbDoiU05BS0UiLE1hcms6JGZ9LHtpZDoic2hvb3RlciIsbGFiZWw6IkJMQVNURVIiLE1hcms6V2Z9LHtpZDoiYnJpY2siLGxhYmVsOiJCUkVBS09VVCIsTWFyazpVZn0se2lkOiJiYXNlYmFsbCIsbGFiZWw6IkJBU0VCQUxMIixNYXJrOlZmfSx7aWQ6InN0YWNrIixsYWJlbDoiU1RBQ0siLE1hcms6SGZ9XS5tYXAoKHtpZDpjLGxhYmVsOmgsTWFyazpwfSk9PnMuanN4cygiYnV0dG9uIix7dHlwZToiYnV0dG9uIixvbkNsaWNrOigpPT5hKGMpLCJhcmlhLXByZXNzZWQiOm49PT1jLGNsYXNzTmFtZTpgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1tZCBweC0zIHB5LTIgZm9udC1kaXNwbGF5IHRleHQtWzlweF0gdHJhY2tpbmctd2lkZXIgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIHNtOnB4LTQgc206dGV4dC1bMTBweF0gJHtuPT09Yz8iYmctcGl0LTcwMCB0ZXh0LWFtYmVyZ2xvdy00MDAgc2hhZG93LVswXzBfMThweF9yZ2JhKDI1NSwyMDAsODcsMC4xOCldIjoidGV4dC1tb3NzLTMwMCBob3ZlcjpiZy1waXQtODAwIGhvdmVyOnRleHQtbW9zcy0xMDAifWAsY2hpbGRyZW46W3MuanN4KHAse2NsYXNzTmFtZToiaC00IHctNCJ9KSxoXX0sYykpfSldfSkscy5qc3goIm1haW4iLHtjbGFzc05hbWU6InJlbGF0aXZlIHotMTAgbXgtYXV0byB3LWZ1bGwgbWF4LXctNnhsIGZsZXgtMSBweC00IHBiLTEwIHNtOnB4LTYiLGNoaWxkcmVuOm49PT0ic25ha2UiP3MuanN4KFJwLHt9KTpuPT09InNob290ZXIiP3MuanN4KFhwLHt9KTpuPT09ImJyaWNrIj9zLmpzeCh3aCx7fSk6bj09PSJiYXNlYmFsbCI/cy5qc3goUWgse30pOnMuanN4KGxtLHt9KX0pLHMuanN4KCJmb290ZXIiLHtjbGFzc05hbWU6InJlbGF0aXZlIHotMTAgYm9yZGVyLXQgYm9yZGVyLXBpdC03MDAvNjAgcHktMyB0ZXh0LWNlbnRlciIsY2hpbGRyZW46cy5qc3goInAiLHtjbGFzc05hbWU6ImZvbnQtZGlzcGxheSB0ZXh0LVs4cHhdIHRyYWNraW5nLVswLjJlbV0gdGV4dC1tb3NzLTQwMCIsY2hpbGRyZW46IkZJVkUgQ0FSVFJJREdFUyBMT0FERUQg4oCUIFNFUlBFTlRJTkUgw5cgVkVDVE9SIFNUUklLRSDDlyBCUklDSyBSSU9UIMOXIFNMVUdHRVIgTklHSFQgw5cgU0tZV0FSRCDCtyBTQ09SRVMgU0FWRUQgT04gVEhJUyBERVZJQ0UifSl9KV19KX1ocC5jcmVhdGVSb290KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJyb290IikpLnJlbmRlcihzLmpzeChhbSx7fSkpOwoKICAgIDwvc2NyaXB0PgogIDwvYm9keT4KPC9odG1sPg==";

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
  if (closeBtn) closeBtn.addEventListener('click', closeArcade);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeArcade();
    }
  });
})();
