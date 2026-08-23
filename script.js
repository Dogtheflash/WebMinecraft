/* ════════════════════════════════════════════════════════════
   CHẾ ĐỘ NHẸ — bật trên điện thoại / máy yếu / màn cảm ứng.
   Các hiệu ứng ăn GPU sẽ tự tắt thay vì làm rớt khung hình.
   ════════════════════════════════════════════════════════════ */
window.__LOW_PERF = (function () {
  try {
    var touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    var small = window.matchMedia('(max-width: 900px)').matches;
    var weak  = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    var slow  = (navigator.connection && navigator.connection.saveData) === true;
    var rm    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return touch || small || weak || slow || rm;
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
  if (window.__LOW_PERF) return;
  const target = getTiltTarget();
  if (!target) return;
  if (activeTiltTarget && activeTiltTarget !== target) resetCardPointer();
  activeTiltTarget = target;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const px = Math.max(0, Math.min(1, x / rect.width));
  const py = Math.max(0, Math.min(1, y / rect.height));
  
  // 3D Tilt calculation (max 15 degrees for dramatic 3D effect)
  const tiltY = (px - 0.5) * 16;
  const tiltX = (0.5 - py) * 16;
  
  // Holographic rainbow angle & glare spotlight position
  const angle = Math.round(Math.atan2(py - 0.5, px - 0.5) * (180 / Math.PI) + 90);
  const glareX = Math.round(px * 100);
  const glareY = Math.round(py * 100);
  
  target.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
  target.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
  target.style.setProperty('--card-scale', '1.02');
  target.style.setProperty('--holo-angle', `${angle}deg`);
  target.style.setProperty('--holo-pos-x', `${(px * 100).toFixed(1)}%`);
  target.style.setProperty('--holo-pos-y', `${(py * 100).toFixed(1)}%`);
  target.style.setProperty('--holo-opacity', '0.75');
  target.style.setProperty('--glare-x', `${glareX}%`);
  target.style.setProperty('--glare-y', `${glareY}%`);
  target.style.setProperty('--glare-opacity', '0.85');
  target.classList.add('interactive-hover');
}

function resetCardPointer() {
  const target = activeTiltTarget || interactiveCard;
  if (!target) return;
  target.classList.remove('interactive-hover');
  target.style.setProperty('--tilt-x', '0deg');
  target.style.setProperty('--tilt-y', '0deg');
  target.style.setProperty('--card-scale', '1');
  target.style.setProperty('--holo-opacity', '0');
  target.style.setProperty('--glare-opacity', '0');
  activeTiltTarget = null;
}

// Mobile Gyroscope 3D Holo Tilt
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (e) => {
    if (window.__LOW_PERF || !interactiveCard) return;
    if (e.gamma === null || e.beta === null) return;
    const gamma = Math.max(-35, Math.min(35, e.gamma));
    const beta = Math.max(15, Math.min(75, e.beta)) - 45;
    const tiltY = (gamma / 35) * 12;
    const tiltX = -(beta / 30) * 12;
    const angle = Math.round(Math.atan2(beta, gamma) * (180 / Math.PI) + 90);
    const px = (gamma + 35) / 70;
    const py = (beta + 30) / 60;
    
    interactiveCard.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    interactiveCard.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    interactiveCard.style.setProperty('--holo-angle', `${angle}deg`);
    interactiveCard.style.setProperty('--holo-pos-x', `${(px * 100).toFixed(1)}%`);
    interactiveCard.style.setProperty('--holo-pos-y', `${(py * 100).toFixed(1)}%`);
    interactiveCard.style.setProperty('--holo-opacity', '0.65');
    interactiveCard.style.setProperty('--glare-x', `${Math.round(px * 100)}%`);
    interactiveCard.style.setProperty('--glare-y', `${Math.round(py * 100)}%`);
    interactiveCard.style.setProperty('--glare-opacity', '0.7');
  });
}

function spawnCardRipple(event) {
  if (window.__LOW_PERF) return;
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
  document.addEventListener('pointermove', (event) => {
    const target = getTiltTarget();
    if (!target || !target.contains(event.target)) {
      if (activeTiltTarget) resetCardPointer();
      return;
    }
    updateCardPointer(event);
    spawnCardRipple(event);
  });
  document.addEventListener('pointerdown', (event) => {
    const target = getTiltTarget();
    if (!target || !target.contains(event.target)) return;
    spawnCardRipple(event);
  });
  document.addEventListener('pointerover', (event) => {
    const target = getTiltTarget();
    if (target && target.contains(event.target)) activeTiltTarget = target;
  });
  document.addEventListener('pointerout', (event) => {
    const target = activeTiltTarget;
    if (target && !target.contains(event.relatedTarget)) resetCardPointer();
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
    if (currentWeather === 'off' || window.__LOW_PERF) return;

    var count = 36;
    if (currentWeather === 'sakura') count = window.innerWidth < 768 ? 26 : 42;
    else if (currentWeather === 'snow') count = window.innerWidth < 768 ? 45 : 75;
    else if (currentWeather === 'rain') count = window.innerWidth < 768 ? 55 : 95;
    else if (currentWeather === 'stars') count = window.innerWidth < 768 ? 35 : 60;

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

/* ============================================================
   SERPENTINE SNAKE ARCADE GAME CONTROLLER & BUNDLE
   ============================================================ */
(function initSnakeModalController() {
  const modal = document.getElementById('snake-modal');
  const toggleBtn = document.getElementById('snake-game-toggle');
  const closeBtn = document.getElementById('snake-close-btn');
  const backdrop = document.getElementById('snake-backdrop');

  if (!modal) return;

  function openSnakeGame() {
    modal.classList.remove('hidden');
    document.body.classList.add('snake-game-active');
  }

  function closeSnakeGame() {
    modal.classList.add('hidden');
    document.body.classList.remove('snake-game-active');
  }

  window.openSnakeGame = openSnakeGame;
  window.closeSnakeGame = closeSnakeGame;

  if (toggleBtn) {
    toggleBtn.addEventListener('click', openSnakeGame);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSnakeGame);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeSnakeGame);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeSnakeGame();
    }
  });
})();

/* --- BUNDLED SERPENTINE SNAKE REACT/CANVAS ENGINE --- */
(function(){const y=document.createElement("link").relList;if(y&&y.supports&&y.supports("modulepreload"))return;for(const E of document.querySelectorAll('link[rel="modulepreload"]'))C(E);new MutationObserver(E=>{for(const D of E)if(D.type==="childList")for(const M of D.addedNodes)M.tagName==="LINK"&&M.rel==="modulepreload"&&C(M)}).observe(document,{childList:!0,subtree:!0});function c(E){const D={};return E.integrity&&(D.integrity=E.integrity),E.referrerPolicy&&(D.referrerPolicy=E.referrerPolicy),E.crossOrigin==="use-credentials"?D.credentials="include":E.crossOrigin==="anonymous"?D.credentials="omit":D.credentials="same-origin",D}function C(E){if(E.ep)return;E.ep=!0;const D=c(E);fetch(E.href,D)}})();function rd(u){return u&&u.__esModule&&Object.prototype.hasOwnProperty.call(u,"default")?u.default:u}var Uo={exports:{}},Lr={},Bo={exports:{}},b={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Aa;function ld(){if(Aa)return b;Aa=1;var u=Symbol.for("react.element"),y=Symbol.for("react.portal"),c=Symbol.for("react.fragment"),C=Symbol.for("react.strict_mode"),E=Symbol.for("react.profiler"),D=Symbol.for("react.provider"),M=Symbol.for("react.context"),S=Symbol.for("react.forward_ref"),U=Symbol.for("react.suspense"),P=Symbol.for("react.memo"),I=Symbol.for("react.lazy"),W=Symbol.iterator;function H(p){return p===null||typeof p!="object"?null:(p=W&&p[W]||p["@@iterator"],typeof p=="function"?p:null)}var oe={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Ne=Object.assign,ne={};function Q(p,g,Y){this.props=p,this.context=g,this.refs=ne,this.updater=Y||oe}Q.prototype.isReactComponent={},Q.prototype.setState=function(p,g){if(typeof p!="object"&&typeof p!="function"&&p!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,p,g,"setState")},Q.prototype.forceUpdate=function(p){this.updater.enqueueForceUpdate(this,p,"forceUpdate")};function ce(){}ce.prototype=Q.prototype;function Z(p,g,Y){this.props=p,this.context=g,this.refs=ne,this.updater=Y||oe}var q=Z.prototype=new ce;q.constructor=Z,Ne(q,Q.prototype),q.isPureReactComponent=!0;var ge=Array.isArray,Ae=Object.prototype.hasOwnProperty,xe={current:null},Ce={key:!0,ref:!0,__self:!0,__source:!0};function De(p,g,Y){var _,A={},G=null,X=null;if(g!=null)for(_ in g.ref!==void 0&&(X=g.ref),g.key!==void 0&&(G=""+g.key),g)Ae.call(g,_)&&!Ce.hasOwnProperty(_)&&(A[_]=g[_]);var J=arguments.length-2;if(J===1)A.children=Y;else if(1<J){for(var se=Array(J),Be=0;Be<J;Be++)se[Be]=arguments[Be+2];A.children=se}if(p&&p.defaultProps)for(_ in J=p.defaultProps,J)A[_]===void 0&&(A[_]=J[_]);return{$$typeof:u,type:p,key:G,ref:X,props:A,_owner:xe.current}}function at(p,g){return{$$typeof:u,type:p.type,key:g,ref:p.ref,props:p.props,_owner:p._owner}}function Oe(p){return typeof p=="object"&&p!==null&&p.$$typeof===u}function Ue(p){var g={"=":"=0",":":"=2"};return"$"+p.replace(/[=:]/g,function(Y){return g[Y]})}var Ke=/\/+/g;function Te(p,g){return typeof p=="object"&&p!==null&&p.key!=null?Ue(""+p.key):g.toString(36)}function Ge(p,g,Y,_,A){var G=typeof p;(G==="undefined"||G==="boolean")&&(p=null);var X=!1;if(p===null)X=!0;else switch(G){case"string":case"number":X=!0;break;case"object":switch(p.$$typeof){case u:case y:X=!0}}if(X)return X=p,A=A(X),p=_===""?"."+Te(X,0):_,ge(A)?(Y="",p!=null&&(Y=p.replace(Ke,"$&/")+"/"),Ge(A,g,Y,"",function(Be){return Be})):A!=null&&(Oe(A)&&(A=at(A,Y+(!A.key||X&&X.key===A.key?"":(""+A.key).replace(Ke,"$&/")+"/")+p)),g.push(A)),1;if(X=0,_=_===""?".":_+":",ge(p))for(var J=0;J<p.length;J++){G=p[J];var se=_+Te(G,J);X+=Ge(G,g,Y,se,A)}else if(se=H(p),typeof se=="function")for(p=se.call(p),J=0;!(G=p.next()).done;)G=G.value,se=_+Te(G,J++),X+=Ge(G,g,Y,se,A);else if(G==="object")throw g=String(p),Error("Objects are not valid as a React child (found: "+(g==="[object Object]"?"object with keys {"+Object.keys(p).join(", ")+"}":g)+"). If you meant to render a collection of children, use an array instead.");return X}function lt(p,g,Y){if(p==null)return p;var _=[],A=0;return Ge(p,_,"","",function(G){return g.call(Y,G,A++)}),_}function we(p){if(p._status===-1){var g=p._result;g=g(),g.then(function(Y){(p._status===0||p._status===-1)&&(p._status=1,p._result=Y)},function(Y){(p._status===0||p._status===-1)&&(p._status=2,p._result=Y)}),p._status===-1&&(p._status=0,p._result=g)}if(p._status===1)return p._result.default;throw p._result}var le={current:null},j={transition:null},B={ReactCurrentDispatcher:le,ReactCurrentBatchConfig:j,ReactCurrentOwner:xe};function R(){throw Error("act(...) is not supported in production builds of React.")}return b.Children={map:lt,forEach:function(p,g,Y){lt(p,function(){g.apply(this,arguments)},Y)},count:function(p){var g=0;return lt(p,function(){g++}),g},toArray:function(p){return lt(p,function(g){return g})||[]},only:function(p){if(!Oe(p))throw Error("React.Children.only expected to receive a single React element child.");return p}},b.Component=Q,b.Fragment=c,b.Profiler=E,b.PureComponent=Z,b.StrictMode=C,b.Suspense=U,b.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=B,b.act=R,b.cloneElement=function(p,g,Y){if(p==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+p+".");var _=Ne({},p.props),A=p.key,G=p.ref,X=p._owner;if(g!=null){if(g.ref!==void 0&&(G=g.ref,X=xe.current),g.key!==void 0&&(A=""+g.key),p.type&&p.type.defaultProps)var J=p.type.defaultProps;for(se in g)Ae.call(g,se)&&!Ce.hasOwnProperty(se)&&(_[se]=g[se]===void 0&&J!==void 0?J[se]:g[se])}var se=arguments.length-2;if(se===1)_.children=Y;else if(1<se){J=Array(se);for(var Be=0;Be<se;Be++)J[Be]=arguments[Be+2];_.children=J}return{$$typeof:u,type:p.type,key:A,ref:G,props:_,_owner:X}},b.createContext=function(p){return p={$$typeof:M,_currentValue:p,_currentValue2:p,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},p.Provider={$$typeof:D,_context:p},p.Consumer=p},b.createElement=De,b.createFactory=function(p){var g=De.bind(null,p);return g.type=p,g},b.createRef=function(){return{current:null}},b.forwardRef=function(p){return{$$typeof:S,render:p}},b.isValidElement=Oe,b.lazy=function(p){return{$$typeof:I,_payload:{_status:-1,_result:p},_init:we}},b.memo=function(p,g){return{$$typeof:P,type:p,compare:g===void 0?null:g}},b.startTransition=function(p){var g=j.transition;j.transition={};try{p()}finally{j.transition=g}},b.unstable_act=R,b.useCallback=function(p,g){return le.current.useCallback(p,g)},b.useContext=function(p){return le.current.useContext(p)},b.useDebugValue=function(){},b.useDeferredValue=function(p){return le.current.useDeferredValue(p)},b.useEffect=function(p,g){return le.current.useEffect(p,g)},b.useId=function(){return le.current.useId()},b.useImperativeHandle=function(p,g,Y){return le.current.useImperativeHandle(p,g,Y)},b.useInsertionEffect=function(p,g){return le.current.useInsertionEffect(p,g)},b.useLayoutEffect=function(p,g){return le.current.useLayoutEffect(p,g)},b.useMemo=function(p,g){return le.current.useMemo(p,g)},b.useReducer=function(p,g,Y){return le.current.useReducer(p,g,Y)},b.useRef=function(p){return le.current.useRef(p)},b.useState=function(p){return le.current.useState(p)},b.useSyncExternalStore=function(p,g,Y){return le.current.useSyncExternalStore(p,g,Y)},b.useTransition=function(){return le.current.useTransition()},b.version="18.3.1",b}var Ua;function Ko(){return Ua||(Ua=1,Bo.exports=ld()),Bo.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Ba;function id(){if(Ba)return Lr;Ba=1;var u=Ko(),y=Symbol.for("react.element"),c=Symbol.for("react.fragment"),C=Object.prototype.hasOwnProperty,E=u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,D={key:!0,ref:!0,__self:!0,__source:!0};function M(S,U,P){var I,W={},H=null,oe=null;P!==void 0&&(H=""+P),U.key!==void 0&&(H=""+U.key),U.ref!==void 0&&(oe=U.ref);for(I in U)C.call(U,I)&&!D.hasOwnProperty(I)&&(W[I]=U[I]);if(S&&S.defaultProps)for(I in U=S.defaultProps,U)W[I]===void 0&&(W[I]=U[I]);return{$$typeof:y,type:S,key:H,ref:oe,props:W,_owner:E.current}}return Lr.Fragment=c,Lr.jsx=M,Lr.jsxs=M,Lr}var Va;function od(){return Va||(Va=1,Uo.exports=id()),Uo.exports}var f=od(),Ql={},Vo={exports:{}},nt={},$o={exports:{}},Wo={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var $a;function ud(){return $a||($a=1,(function(u){function y(j,B){var R=j.length;j.push(B);e:for(;0<R;){var p=R-1>>>1,g=j[p];if(0<E(g,B))j[p]=B,j[R]=g,R=p;else break e}}function c(j){return j.length===0?null:j[0]}function C(j){if(j.length===0)return null;var B=j[0],R=j.pop();if(R!==B){j[0]=R;e:for(var p=0,g=j.length,Y=g>>>1;p<Y;){var _=2*(p+1)-1,A=j[_],G=_+1,X=j[G];if(0>E(A,R))G<g&&0>E(X,A)?(j[p]=X,j[G]=R,p=G):(j[p]=A,j[_]=R,p=_);else if(G<g&&0>E(X,R))j[p]=X,j[G]=R,p=G;else break e}}return B}function E(j,B){var R=j.sortIndex-B.sortIndex;return R!==0?R:j.id-B.id}if(typeof performance=="object"&&typeof performance.now=="function"){var D=performance;u.unstable_now=function(){return D.now()}}else{var M=Date,S=M.now();u.unstable_now=function(){return M.now()-S}}var U=[],P=[],I=1,W=null,H=3,oe=!1,Ne=!1,ne=!1,Q=typeof setTimeout=="function"?setTimeout:null,ce=typeof clearTimeout=="function"?clearTimeout:null,Z=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function q(j){for(var B=c(P);B!==null;){if(B.callback===null)C(P);else if(B.startTime<=j)C(P),B.sortIndex=B.expirationTime,y(U,B);else break;B=c(P)}}function ge(j){if(ne=!1,q(j),!Ne)if(c(U)!==null)Ne=!0,we(Ae);else{var B=c(P);B!==null&&le(ge,B.startTime-j)}}function Ae(j,B){Ne=!1,ne&&(ne=!1,ce(De),De=-1),oe=!0;var R=H;try{for(q(B),W=c(U);W!==null&&(!(W.expirationTime>B)||j&&!Ue());){var p=W.callback;if(typeof p=="function"){W.callback=null,H=W.priorityLevel;var g=p(W.expirationTime<=B);B=u.unstable_now(),typeof g=="function"?W.callback=g:W===c(U)&&C(U),q(B)}else C(U);W=c(U)}if(W!==null)var Y=!0;else{var _=c(P);_!==null&&le(ge,_.startTime-B),Y=!1}return Y}finally{W=null,H=R,oe=!1}}var xe=!1,Ce=null,De=-1,at=5,Oe=-1;function Ue(){return!(u.unstable_now()-Oe<at)}function Ke(){if(Ce!==null){var j=u.unstable_now();Oe=j;var B=!0;try{B=Ce(!0,j)}finally{B?Te():(xe=!1,Ce=null)}}else xe=!1}var Te;if(typeof Z=="function")Te=function(){Z(Ke)};else if(typeof MessageChannel<"u"){var Ge=new MessageChannel,lt=Ge.port2;Ge.port1.onmessage=Ke,Te=function(){lt.postMessage(null)}}else Te=function(){Q(Ke,0)};function we(j){Ce=j,xe||(xe=!0,Te())}function le(j,B){De=Q(function(){j(u.unstable_now())},B)}u.unstable_IdlePriority=5,u.unstable_ImmediatePriority=1,u.unstable_LowPriority=4,u.unstable_NormalPriority=3,u.unstable_Profiling=null,u.unstable_UserBlockingPriority=2,u.unstable_cancelCallback=function(j){j.callback=null},u.unstable_continueExecution=function(){Ne||oe||(Ne=!0,we(Ae))},u.unstable_forceFrameRate=function(j){0>j||125<j?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):at=0<j?Math.floor(1e3/j):5},u.unstable_getCurrentPriorityLevel=function(){return H},u.unstable_getFirstCallbackNode=function(){return c(U)},u.unstable_next=function(j){switch(H){case 1:case 2:case 3:var B=3;break;default:B=H}var R=H;H=B;try{return j()}finally{H=R}},u.unstable_pauseExecution=function(){},u.unstable_requestPaint=function(){},u.unstable_runWithPriority=function(j,B){switch(j){case 1:case 2:case 3:case 4:case 5:break;default:j=3}var R=H;H=j;try{return B()}finally{H=R}},u.unstable_scheduleCallback=function(j,B,R){var p=u.unstable_now();switch(typeof R=="object"&&R!==null?(R=R.delay,R=typeof R=="number"&&0<R?p+R:p):R=p,j){case 1:var g=-1;break;case 2:g=250;break;case 5:g=1073741823;break;case 4:g=1e4;break;default:g=5e3}return g=R+g,j={id:I++,callback:B,priorityLevel:j,startTime:R,expirationTime:g,sortIndex:-1},R>p?(j.sortIndex=R,y(P,j),c(U)===null&&j===c(P)&&(ne?(ce(De),De=-1):ne=!0,le(ge,R-p))):(j.sortIndex=g,y(U,j),Ne||oe||(Ne=!0,we(Ae))),j},u.unstable_shouldYield=Ue,u.unstable_wrapCallback=function(j){var B=H;return function(){var R=H;H=B;try{return j.apply(this,arguments)}finally{H=R}}}})(Wo)),Wo}var Wa;function sd(){return Wa||(Wa=1,$o.exports=ud()),$o.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Ha;function ad(){if(Ha)return nt;Ha=1;var u=Ko(),y=sd();function c(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var C=new Set,E={};function D(e,t){M(e,t),M(e+"Capture",t)}function M(e,t){for(E[e]=t,e=0;e<t.length;e++)C.add(t[e])}var S=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),U=Object.prototype.hasOwnProperty,P=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,I={},W={};function H(e){return U.call(W,e)?!0:U.call(I,e)?!1:P.test(e)?W[e]=!0:(I[e]=!0,!1)}function oe(e,t,n,r){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function Ne(e,t,n,r){if(t===null||typeof t>"u"||oe(e,t,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function ne(e,t,n,r,l,i,o){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=r,this.attributeNamespace=l,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=i,this.removeEmptyString=o}var Q={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Q[e]=new ne(e,0,!1,e,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Q[t]=new ne(t,1,!1,e[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(e){Q[e]=new ne(e,2,!1,e.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Q[e]=new ne(e,2,!1,e,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Q[e]=new ne(e,3,!1,e.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(e){Q[e]=new ne(e,3,!0,e,null,!1,!1)}),["capture","download"].forEach(function(e){Q[e]=new ne(e,4,!1,e,null,!1,!1)}),["cols","rows","size","span"].forEach(function(e){Q[e]=new ne(e,6,!1,e,null,!1,!1)}),["rowSpan","start"].forEach(function(e){Q[e]=new ne(e,5,!1,e.toLowerCase(),null,!1,!1)});var ce=/[\-:]([a-z])/g;function Z(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(ce,Z);Q[t]=new ne(t,1,!1,e,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(ce,Z);Q[t]=new ne(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(ce,Z);Q[t]=new ne(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(e){Q[e]=new ne(e,1,!1,e.toLowerCase(),null,!1,!1)}),Q.xlinkHref=new ne("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(e){Q[e]=new ne(e,1,!1,e.toLowerCase(),null,!0,!0)});function q(e,t,n,r){var l=Q.hasOwnProperty(t)?Q[t]:null;(l!==null?l.type!==0:r||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(Ne(t,n,l,r)&&(n=null),r||l===null?H(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):l.mustUseProperty?e[l.propertyName]=n===null?l.type===3?!1:"":n:(t=l.attributeName,r=l.attributeNamespace,n===null?e.removeAttribute(t):(l=l.type,n=l===3||l===4&&n===!0?"":""+n,r?e.setAttributeNS(r,t,n):e.setAttribute(t,n))))}var ge=u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ae=Symbol.for("react.element"),xe=Symbol.for("react.portal"),Ce=Symbol.for("react.fragment"),De=Symbol.for("react.strict_mode"),at=Symbol.for("react.profiler"),Oe=Symbol.for("react.provider"),Ue=Symbol.for("react.context"),Ke=Symbol.for("react.forward_ref"),Te=Symbol.for("react.suspense"),Ge=Symbol.for("react.suspense_list"),lt=Symbol.for("react.memo"),we=Symbol.for("react.lazy"),le=Symbol.for("react.offscreen"),j=Symbol.iterator;function B(e){return e===null||typeof e!="object"?null:(e=j&&e[j]||e["@@iterator"],typeof e=="function"?e:null)}var R=Object.assign,p;function g(e){if(p===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);p=t&&t[1]||""}return`
`+p+e}var Y=!1;function _(e,t){if(!e||Y)return"";Y=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(v){var r=v}Reflect.construct(e,[],t)}else{try{t.call()}catch(v){r=v}e.call(t.prototype)}else{try{throw Error()}catch(v){r=v}e()}}catch(v){if(v&&r&&typeof v.stack=="string"){for(var l=v.stack.split(`
`),i=r.stack.split(`
`),o=l.length-1,s=i.length-1;1<=o&&0<=s&&l[o]!==i[s];)s--;for(;1<=o&&0<=s;o--,s--)if(l[o]!==i[s]){if(o!==1||s!==1)do if(o--,s--,0>s||l[o]!==i[s]){var a=`
`+l[o].replace(" at new "," at ");return e.displayName&&a.includes("<anonymous>")&&(a=a.replace("<anonymous>",e.displayName)),a}while(1<=o&&0<=s);break}}}finally{Y=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?g(e):""}function A(e){switch(e.tag){case 5:return g(e.type);case 16:return g("Lazy");case 13:return g("Suspense");case 19:return g("SuspenseList");case 0:case 2:case 15:return e=_(e.type,!1),e;case 11:return e=_(e.type.render,!1),e;case 1:return e=_(e.type,!0),e;default:return""}}function G(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case Ce:return"Fragment";case xe:return"Portal";case at:return"Profiler";case De:return"StrictMode";case Te:return"Suspense";case Ge:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Ue:return(e.displayName||"Context")+".Consumer";case Oe:return(e._context.displayName||"Context")+".Provider";case Ke:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case lt:return t=e.displayName||null,t!==null?t:G(e.type)||"Memo";case we:t=e._payload,e=e._init;try{return G(e(t))}catch{}}return null}function X(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return G(t);case 8:return t===De?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function J(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function se(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Be(e){var t=se(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),r=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var l=n.get,i=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(o){r=""+o,i.call(this,o)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Ve(e){e._valueTracker||(e._valueTracker=Be(e))}function ue(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),r="";return e&&(r=se(e)?e.checked?"true":"false":e.value),e=r,e!==n?(t.setValue(e),!0):!1}function he(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function Ze(e,t){var n=t.checked;return R({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function ct(e,t){var n=t.defaultValue==null?"":t.defaultValue,r=t.checked!=null?t.checked:t.defaultChecked;n=J(t.value!=null?t.value:n),e._wrapperState={initialChecked:r,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function Yn(e,t){t=t.checked,t!=null&&q(e,"checked",t,!1)}function Sn(e,t){Yn(e,t);var n=J(t.value),r=t.type;if(n!=null)r==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(r==="submit"||r==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?zt(e,t.type,n):t.hasOwnProperty("defaultValue")&&zt(e,t.type,J(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function Ir(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var r=t.type;if(!(r!=="submit"&&r!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function zt(e,t,n){(t!=="number"||he(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var Mt=Array.isArray;function Ct(e,t,n,r){if(e=e.options,t){t={};for(var l=0;l<n.length;l++)t["$"+n[l]]=!0;for(n=0;n<e.length;n++)l=t.hasOwnProperty("$"+e[n].value),e[n].selected!==l&&(e[n].selected=l),l&&r&&(e[n].defaultSelected=!0)}else{for(n=""+J(n),t=null,l=0;l<e.length;l++){if(e[l].value===n){e[l].selected=!0,r&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function Yl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(c(91));return R({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function Yo(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(c(92));if(Mt(n)){if(1<n.length)throw Error(c(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:J(n)}}function Xo(e,t){var n=J(t.value),r=J(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),r!=null&&(e.defaultValue=""+r)}function Zo(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function qo(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Xl(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?qo(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Fr,Jo=(function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,r,l){MSApp.execUnsafeLocalFunction(function(){return e(t,n,r,l)})}:e})(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Fr=Fr||document.createElement("div"),Fr.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Fr.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function Xn(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var Zn={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},oc=["Webkit","ms","Moz","O"];Object.keys(Zn).forEach(function(e){oc.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Zn[t]=Zn[e]})});function bo(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||Zn.hasOwnProperty(e)&&Zn[e]?(""+t).trim():t+"px"}function eu(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var r=n.indexOf("--")===0,l=bo(n,t[n],r);n==="float"&&(n="cssFloat"),r?e.setProperty(n,l):e[n]=l}}var uc=R({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Zl(e,t){if(t){if(uc[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(c(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(c(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(c(61))}if(t.style!=null&&typeof t.style!="object")throw Error(c(62))}}function ql(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Jl=null;function bl(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var ei=null,En=null,Nn=null;function tu(e){if(e=gr(e)){if(typeof ei!="function")throw Error(c(280));var t=e.stateNode;t&&(t=ol(t),ei(e.stateNode,e.type,t))}}function nu(e){En?Nn?Nn.push(e):Nn=[e]:En=e}function ru(){if(En){var e=En,t=Nn;if(Nn=En=null,tu(e),t)for(e=0;e<t.length;e++)tu(t[e])}}function lu(e,t){return e(t)}function iu(){}var ti=!1;function ou(e,t,n){if(ti)return e(t,n);ti=!0;try{return lu(e,t,n)}finally{ti=!1,(En!==null||Nn!==null)&&(iu(),ru())}}function qn(e,t){var n=e.stateNode;if(n===null)return null;var r=ol(n);if(r===null)return null;n=r[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(e=e.type,r=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!r;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(c(231,t,typeof n));return n}var ni=!1;if(S)try{var Jn={};Object.defineProperty(Jn,"passive",{get:function(){ni=!0}}),window.addEventListener("test",Jn,Jn),window.removeEventListener("test",Jn,Jn)}catch{ni=!1}function sc(e,t,n,r,l,i,o,s,a){var v=Array.prototype.slice.call(arguments,3);try{t.apply(n,v)}catch(w){this.onError(w)}}var bn=!1,Ar=null,Ur=!1,ri=null,ac={onError:function(e){bn=!0,Ar=e}};function cc(e,t,n,r,l,i,o,s,a){bn=!1,Ar=null,sc.apply(ac,arguments)}function fc(e,t,n,r,l,i,o,s,a){if(cc.apply(this,arguments),bn){if(bn){var v=Ar;bn=!1,Ar=null}else throw Error(c(198));Ur||(Ur=!0,ri=v)}}function sn(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function uu(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function su(e){if(sn(e)!==e)throw Error(c(188))}function dc(e){var t=e.alternate;if(!t){if(t=sn(e),t===null)throw Error(c(188));return t!==e?null:e}for(var n=e,r=t;;){var l=n.return;if(l===null)break;var i=l.alternate;if(i===null){if(r=l.return,r!==null){n=r;continue}break}if(l.child===i.child){for(i=l.child;i;){if(i===n)return su(l),e;if(i===r)return su(l),t;i=i.sibling}throw Error(c(188))}if(n.return!==r.return)n=l,r=i;else{for(var o=!1,s=l.child;s;){if(s===n){o=!0,n=l,r=i;break}if(s===r){o=!0,r=l,n=i;break}s=s.sibling}if(!o){for(s=i.child;s;){if(s===n){o=!0,n=i,r=l;break}if(s===r){o=!0,r=i,n=l;break}s=s.sibling}if(!o)throw Error(c(189))}}if(n.alternate!==r)throw Error(c(190))}if(n.tag!==3)throw Error(c(188));return n.stateNode.current===n?e:t}function au(e){return e=dc(e),e!==null?cu(e):null}function cu(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=cu(e);if(t!==null)return t;e=e.sibling}return null}var fu=y.unstable_scheduleCallback,du=y.unstable_cancelCallback,pc=y.unstable_shouldYield,mc=y.unstable_requestPaint,Se=y.unstable_now,hc=y.unstable_getCurrentPriorityLevel,li=y.unstable_ImmediatePriority,pu=y.unstable_UserBlockingPriority,Br=y.unstable_NormalPriority,vc=y.unstable_LowPriority,mu=y.unstable_IdlePriority,Vr=null,jt=null;function yc(e){if(jt&&typeof jt.onCommitFiberRoot=="function")try{jt.onCommitFiberRoot(Vr,e,void 0,(e.current.flags&128)===128)}catch{}}var gt=Math.clz32?Math.clz32:wc,gc=Math.log,xc=Math.LN2;function wc(e){return e>>>=0,e===0?32:31-(gc(e)/xc|0)|0}var $r=64,Wr=4194304;function er(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Hr(e,t){var n=e.pendingLanes;if(n===0)return 0;var r=0,l=e.suspendedLanes,i=e.pingedLanes,o=n&268435455;if(o!==0){var s=o&~l;s!==0?r=er(s):(i&=o,i!==0&&(r=er(i)))}else o=n&~l,o!==0?r=er(o):i!==0&&(r=er(i));if(r===0)return 0;if(t!==0&&t!==r&&(t&l)===0&&(l=r&-r,i=t&-t,l>=i||l===16&&(i&4194240)!==0))return t;if((r&4)!==0&&(r|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=r;0<t;)n=31-gt(t),l=1<<n,r|=e[n],t&=~l;return r}function kc(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Sc(e,t){for(var n=e.suspendedLanes,r=e.pingedLanes,l=e.expirationTimes,i=e.pendingLanes;0<i;){var o=31-gt(i),s=1<<o,a=l[o];a===-1?((s&n)===0||(s&r)!==0)&&(l[o]=kc(s,t)):a<=t&&(e.expiredLanes|=s),i&=~s}}function ii(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function hu(){var e=$r;return $r<<=1,($r&4194240)===0&&($r=64),e}function oi(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function tr(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-gt(t),e[t]=n}function Ec(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var r=e.eventTimes;for(e=e.expirationTimes;0<n;){var l=31-gt(n),i=1<<l;t[l]=0,r[l]=-1,e[l]=-1,n&=~i}}function ui(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var r=31-gt(n),l=1<<r;l&t|e[r]&t&&(e[r]|=t),n&=~l}}var ie=0;function vu(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var yu,si,gu,xu,wu,ai=!1,Qr=[],$t=null,Wt=null,Ht=null,nr=new Map,rr=new Map,Qt=[],Nc="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function ku(e,t){switch(e){case"focusin":case"focusout":$t=null;break;case"dragenter":case"dragleave":Wt=null;break;case"mouseover":case"mouseout":Ht=null;break;case"pointerover":case"pointerout":nr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":rr.delete(t.pointerId)}}function lr(e,t,n,r,l,i){return e===null||e.nativeEvent!==i?(e={blockedOn:t,domEventName:n,eventSystemFlags:r,nativeEvent:i,targetContainers:[l]},t!==null&&(t=gr(t),t!==null&&si(t)),e):(e.eventSystemFlags|=r,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function Cc(e,t,n,r,l){switch(t){case"focusin":return $t=lr($t,e,t,n,r,l),!0;case"dragenter":return Wt=lr(Wt,e,t,n,r,l),!0;case"mouseover":return Ht=lr(Ht,e,t,n,r,l),!0;case"pointerover":var i=l.pointerId;return nr.set(i,lr(nr.get(i)||null,e,t,n,r,l)),!0;case"gotpointercapture":return i=l.pointerId,rr.set(i,lr(rr.get(i)||null,e,t,n,r,l)),!0}return!1}function Su(e){var t=an(e.target);if(t!==null){var n=sn(t);if(n!==null){if(t=n.tag,t===13){if(t=uu(n),t!==null){e.blockedOn=t,wu(e.priority,function(){gu(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Kr(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=fi(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var r=new n.constructor(n.type,n);Jl=r,n.target.dispatchEvent(r),Jl=null}else return t=gr(n),t!==null&&si(t),e.blockedOn=n,!1;t.shift()}return!0}function Eu(e,t,n){Kr(e)&&n.delete(t)}function jc(){ai=!1,$t!==null&&Kr($t)&&($t=null),Wt!==null&&Kr(Wt)&&(Wt=null),Ht!==null&&Kr(Ht)&&(Ht=null),nr.forEach(Eu),rr.forEach(Eu)}function ir(e,t){e.blockedOn===t&&(e.blockedOn=null,ai||(ai=!0,y.unstable_scheduleCallback(y.unstable_NormalPriority,jc)))}function or(e){function t(l){return ir(l,e)}if(0<Qr.length){ir(Qr[0],e);for(var n=1;n<Qr.length;n++){var r=Qr[n];r.blockedOn===e&&(r.blockedOn=null)}}for($t!==null&&ir($t,e),Wt!==null&&ir(Wt,e),Ht!==null&&ir(Ht,e),nr.forEach(t),rr.forEach(t),n=0;n<Qt.length;n++)r=Qt[n],r.blockedOn===e&&(r.blockedOn=null);for(;0<Qt.length&&(n=Qt[0],n.blockedOn===null);)Su(n),n.blockedOn===null&&Qt.shift()}var Cn=ge.ReactCurrentBatchConfig,Gr=!0;function _c(e,t,n,r){var l=ie,i=Cn.transition;Cn.transition=null;try{ie=1,ci(e,t,n,r)}finally{ie=l,Cn.transition=i}}function Pc(e,t,n,r){var l=ie,i=Cn.transition;Cn.transition=null;try{ie=4,ci(e,t,n,r)}finally{ie=l,Cn.transition=i}}function ci(e,t,n,r){if(Gr){var l=fi(e,t,n,r);if(l===null)Pi(e,t,r,Yr,n),ku(e,r);else if(Cc(l,e,t,n,r))r.stopPropagation();else if(ku(e,r),t&4&&-1<Nc.indexOf(e)){for(;l!==null;){var i=gr(l);if(i!==null&&yu(i),i=fi(e,t,n,r),i===null&&Pi(e,t,r,Yr,n),i===l)break;l=i}l!==null&&r.stopPropagation()}else Pi(e,t,r,null,n)}}var Yr=null;function fi(e,t,n,r){if(Yr=null,e=bl(r),e=an(e),e!==null)if(t=sn(e),t===null)e=null;else if(n=t.tag,n===13){if(e=uu(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Yr=e,null}function Nu(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(hc()){case li:return 1;case pu:return 4;case Br:case vc:return 16;case mu:return 536870912;default:return 16}default:return 16}}var Kt=null,di=null,Xr=null;function Cu(){if(Xr)return Xr;var e,t=di,n=t.length,r,l="value"in Kt?Kt.value:Kt.textContent,i=l.length;for(e=0;e<n&&t[e]===l[e];e++);var o=n-e;for(r=1;r<=o&&t[n-r]===l[i-r];r++);return Xr=l.slice(e,1<r?1-r:void 0)}function Zr(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function qr(){return!0}function ju(){return!1}function it(e){function t(n,r,l,i,o){this._reactName=n,this._targetInst=l,this.type=r,this.nativeEvent=i,this.target=o,this.currentTarget=null;for(var s in e)e.hasOwnProperty(s)&&(n=e[s],this[s]=n?n(i):i[s]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?qr:ju,this.isPropagationStopped=ju,this}return R(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=qr)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=qr)},persist:function(){},isPersistent:qr}),t}var jn={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},pi=it(jn),ur=R({},jn,{view:0,detail:0}),Tc=it(ur),mi,hi,sr,Jr=R({},ur,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:yi,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==sr&&(sr&&e.type==="mousemove"?(mi=e.screenX-sr.screenX,hi=e.screenY-sr.screenY):hi=mi=0,sr=e),mi)},movementY:function(e){return"movementY"in e?e.movementY:hi}}),_u=it(Jr),Rc=R({},Jr,{dataTransfer:0}),zc=it(Rc),Mc=R({},ur,{relatedTarget:0}),vi=it(Mc),Lc=R({},jn,{animationName:0,elapsedTime:0,pseudoElement:0}),Dc=it(Lc),Oc=R({},jn,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Ic=it(Oc),Fc=R({},jn,{data:0}),Pu=it(Fc),Ac={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Uc={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Bc={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Vc(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Bc[e])?!!t[e]:!1}function yi(){return Vc}var $c=R({},ur,{key:function(e){if(e.key){var t=Ac[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Zr(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Uc[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:yi,charCode:function(e){return e.type==="keypress"?Zr(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Zr(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Wc=it($c),Hc=R({},Jr,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Tu=it(Hc),Qc=R({},ur,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:yi}),Kc=it(Qc),Gc=R({},jn,{propertyName:0,elapsedTime:0,pseudoElement:0}),Yc=it(Gc),Xc=R({},Jr,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Zc=it(Xc),qc=[9,13,27,32],gi=S&&"CompositionEvent"in window,ar=null;S&&"documentMode"in document&&(ar=document.documentMode);var Jc=S&&"TextEvent"in window&&!ar,Ru=S&&(!gi||ar&&8<ar&&11>=ar),zu=" ",Mu=!1;function Lu(e,t){switch(e){case"keyup":return qc.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Du(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var _n=!1;function bc(e,t){switch(e){case"compositionend":return Du(t);case"keypress":return t.which!==32?null:(Mu=!0,zu);case"textInput":return e=t.data,e===zu&&Mu?null:e;default:return null}}function ef(e,t){if(_n)return e==="compositionend"||!gi&&Lu(e,t)?(e=Cu(),Xr=di=Kt=null,_n=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Ru&&t.locale!=="ko"?null:t.data;default:return null}}var tf={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Ou(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!tf[e.type]:t==="textarea"}function Iu(e,t,n,r){nu(r),t=rl(t,"onChange"),0<t.length&&(n=new pi("onChange","change",null,n,r),e.push({event:n,listeners:t}))}var cr=null,fr=null;function nf(e){es(e,0)}function br(e){var t=Mn(e);if(ue(t))return e}function rf(e,t){if(e==="change")return t}var Fu=!1;if(S){var xi;if(S){var wi="oninput"in document;if(!wi){var Au=document.createElement("div");Au.setAttribute("oninput","return;"),wi=typeof Au.oninput=="function"}xi=wi}else xi=!1;Fu=xi&&(!document.documentMode||9<document.documentMode)}function Uu(){cr&&(cr.detachEvent("onpropertychange",Bu),fr=cr=null)}function Bu(e){if(e.propertyName==="value"&&br(fr)){var t=[];Iu(t,fr,e,bl(e)),ou(nf,t)}}function lf(e,t,n){e==="focusin"?(Uu(),cr=t,fr=n,cr.attachEvent("onpropertychange",Bu)):e==="focusout"&&Uu()}function of(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return br(fr)}function uf(e,t){if(e==="click")return br(t)}function sf(e,t){if(e==="input"||e==="change")return br(t)}function af(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var xt=typeof Object.is=="function"?Object.is:af;function dr(e,t){if(xt(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var l=n[r];if(!U.call(t,l)||!xt(e[l],t[l]))return!1}return!0}function Vu(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function $u(e,t){var n=Vu(e);e=0;for(var r;n;){if(n.nodeType===3){if(r=e+n.textContent.length,e<=t&&r>=t)return{node:n,offset:t-e};e=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Vu(n)}}function Wu(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Wu(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Hu(){for(var e=window,t=he();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=he(e.document)}return t}function ki(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function cf(e){var t=Hu(),n=e.focusedElem,r=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Wu(n.ownerDocument.documentElement,n)){if(r!==null&&ki(n)){if(t=r.start,e=r.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=n.textContent.length,i=Math.min(r.start,l);r=r.end===void 0?i:Math.min(r.end,l),!e.extend&&i>r&&(l=r,r=i,i=l),l=$u(n,i);var o=$u(n,r);l&&o&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==o.node||e.focusOffset!==o.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),i>r?(e.addRange(t),e.extend(o.node,o.offset)):(t.setEnd(o.node,o.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var ff=S&&"documentMode"in document&&11>=document.documentMode,Pn=null,Si=null,pr=null,Ei=!1;function Qu(e,t,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Ei||Pn==null||Pn!==he(r)||(r=Pn,"selectionStart"in r&&ki(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),pr&&dr(pr,r)||(pr=r,r=rl(Si,"onSelect"),0<r.length&&(t=new pi("onSelect","select",null,t,n),e.push({event:t,listeners:r}),t.target=Pn)))}function el(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var Tn={animationend:el("Animation","AnimationEnd"),animationiteration:el("Animation","AnimationIteration"),animationstart:el("Animation","AnimationStart"),transitionend:el("Transition","TransitionEnd")},Ni={},Ku={};S&&(Ku=document.createElement("div").style,"AnimationEvent"in window||(delete Tn.animationend.animation,delete Tn.animationiteration.animation,delete Tn.animationstart.animation),"TransitionEvent"in window||delete Tn.transitionend.transition);function tl(e){if(Ni[e])return Ni[e];if(!Tn[e])return e;var t=Tn[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in Ku)return Ni[e]=t[n];return e}var Gu=tl("animationend"),Yu=tl("animationiteration"),Xu=tl("animationstart"),Zu=tl("transitionend"),qu=new Map,Ju="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Gt(e,t){qu.set(e,t),D(t,[e])}for(var Ci=0;Ci<Ju.length;Ci++){var ji=Ju[Ci],df=ji.toLowerCase(),pf=ji[0].toUpperCase()+ji.slice(1);Gt(df,"on"+pf)}Gt(Gu,"onAnimationEnd"),Gt(Yu,"onAnimationIteration"),Gt(Xu,"onAnimationStart"),Gt("dblclick","onDoubleClick"),Gt("focusin","onFocus"),Gt("focusout","onBlur"),Gt(Zu,"onTransitionEnd"),M("onMouseEnter",["mouseout","mouseover"]),M("onMouseLeave",["mouseout","mouseover"]),M("onPointerEnter",["pointerout","pointerover"]),M("onPointerLeave",["pointerout","pointerover"]),D("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),D("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),D("onBeforeInput",["compositionend","keypress","textInput","paste"]),D("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),D("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),D("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var mr="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),mf=new Set("cancel close invalid load scroll toggle".split(" ").concat(mr));function bu(e,t,n){var r=e.type||"unknown-event";e.currentTarget=n,fc(r,t,void 0,e),e.currentTarget=null}function es(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var r=e[n],l=r.event;r=r.listeners;e:{var i=void 0;if(t)for(var o=r.length-1;0<=o;o--){var s=r[o],a=s.instance,v=s.currentTarget;if(s=s.listener,a!==i&&l.isPropagationStopped())break e;bu(l,s,v),i=a}else for(o=0;o<r.length;o++){if(s=r[o],a=s.instance,v=s.currentTarget,s=s.listener,a!==i&&l.isPropagationStopped())break e;bu(l,s,v),i=a}}}if(Ur)throw e=ri,Ur=!1,ri=null,e}function de(e,t){var n=t[Di];n===void 0&&(n=t[Di]=new Set);var r=e+"__bubble";n.has(r)||(ts(t,e,2,!1),n.add(r))}function _i(e,t,n){var r=0;t&&(r|=4),ts(n,e,r,t)}var nl="_reactListening"+Math.random().toString(36).slice(2);function hr(e){if(!e[nl]){e[nl]=!0,C.forEach(function(n){n!=="selectionchange"&&(mf.has(n)||_i(n,!1,e),_i(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[nl]||(t[nl]=!0,_i("selectionchange",!1,t))}}function ts(e,t,n,r){switch(Nu(t)){case 1:var l=_c;break;case 4:l=Pc;break;default:l=ci}n=l.bind(null,t,n,e),l=void 0,!ni||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),r?l!==void 0?e.addEventListener(t,n,{capture:!0,passive:l}):e.addEventListener(t,n,!0):l!==void 0?e.addEventListener(t,n,{passive:l}):e.addEventListener(t,n,!1)}function Pi(e,t,n,r,l){var i=r;if((t&1)===0&&(t&2)===0&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var s=r.stateNode.containerInfo;if(s===l||s.nodeType===8&&s.parentNode===l)break;if(o===4)for(o=r.return;o!==null;){var a=o.tag;if((a===3||a===4)&&(a=o.stateNode.containerInfo,a===l||a.nodeType===8&&a.parentNode===l))return;o=o.return}for(;s!==null;){if(o=an(s),o===null)return;if(a=o.tag,a===5||a===6){r=i=o;continue e}s=s.parentNode}}r=r.return}ou(function(){var v=i,w=bl(n),k=[];e:{var x=qu.get(e);if(x!==void 0){var T=pi,L=e;switch(e){case"keypress":if(Zr(n)===0)break e;case"keydown":case"keyup":T=Wc;break;case"focusin":L="focus",T=vi;break;case"focusout":L="blur",T=vi;break;case"beforeblur":case"afterblur":T=vi;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":T=_u;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":T=zc;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":T=Kc;break;case Gu:case Yu:case Xu:T=Dc;break;case Zu:T=Yc;break;case"scroll":T=Tc;break;case"wheel":T=Zc;break;case"copy":case"cut":case"paste":T=Ic;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":T=Tu}var O=(t&4)!==0,Ee=!O&&e==="scroll",m=O?x!==null?x+"Capture":null:x;O=[];for(var d=v,h;d!==null;){h=d;var N=h.stateNode;if(h.tag===5&&N!==null&&(h=N,m!==null&&(N=qn(d,m),N!=null&&O.push(vr(d,N,h)))),Ee)break;d=d.return}0<O.length&&(x=new T(x,L,null,n,w),k.push({event:x,listeners:O}))}}if((t&7)===0){e:{if(x=e==="mouseover"||e==="pointerover",T=e==="mouseout"||e==="pointerout",x&&n!==Jl&&(L=n.relatedTarget||n.fromElement)&&(an(L)||L[Lt]))break e;if((T||x)&&(x=w.window===w?w:(x=w.ownerDocument)?x.defaultView||x.parentWindow:window,T?(L=n.relatedTarget||n.toElement,T=v,L=L?an(L):null,L!==null&&(Ee=sn(L),L!==Ee||L.tag!==5&&L.tag!==6)&&(L=null)):(T=null,L=v),T!==L)){if(O=_u,N="onMouseLeave",m="onMouseEnter",d="mouse",(e==="pointerout"||e==="pointerover")&&(O=Tu,N="onPointerLeave",m="onPointerEnter",d="pointer"),Ee=T==null?x:Mn(T),h=L==null?x:Mn(L),x=new O(N,d+"leave",T,n,w),x.target=Ee,x.relatedTarget=h,N=null,an(w)===v&&(O=new O(m,d+"enter",L,n,w),O.target=h,O.relatedTarget=Ee,N=O),Ee=N,T&&L)t:{for(O=T,m=L,d=0,h=O;h;h=Rn(h))d++;for(h=0,N=m;N;N=Rn(N))h++;for(;0<d-h;)O=Rn(O),d--;for(;0<h-d;)m=Rn(m),h--;for(;d--;){if(O===m||m!==null&&O===m.alternate)break t;O=Rn(O),m=Rn(m)}O=null}else O=null;T!==null&&ns(k,x,T,O,!1),L!==null&&Ee!==null&&ns(k,Ee,L,O,!0)}}e:{if(x=v?Mn(v):window,T=x.nodeName&&x.nodeName.toLowerCase(),T==="select"||T==="input"&&x.type==="file")var F=rf;else if(Ou(x))if(Fu)F=sf;else{F=of;var V=lf}else(T=x.nodeName)&&T.toLowerCase()==="input"&&(x.type==="checkbox"||x.type==="radio")&&(F=uf);if(F&&(F=F(e,v))){Iu(k,F,n,w);break e}V&&V(e,x,v),e==="focusout"&&(V=x._wrapperState)&&V.controlled&&x.type==="number"&&zt(x,"number",x.value)}switch(V=v?Mn(v):window,e){case"focusin":(Ou(V)||V.contentEditable==="true")&&(Pn=V,Si=v,pr=null);break;case"focusout":pr=Si=Pn=null;break;case"mousedown":Ei=!0;break;case"contextmenu":case"mouseup":case"dragend":Ei=!1,Qu(k,n,w);break;case"selectionchange":if(ff)break;case"keydown":case"keyup":Qu(k,n,w)}var $;if(gi)e:{switch(e){case"compositionstart":var K="onCompositionStart";break e;case"compositionend":K="onCompositionEnd";break e;case"compositionupdate":K="onCompositionUpdate";break e}K=void 0}else _n?Lu(e,n)&&(K="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(K="onCompositionStart");K&&(Ru&&n.locale!=="ko"&&(_n||K!=="onCompositionStart"?K==="onCompositionEnd"&&_n&&($=Cu()):(Kt=w,di="value"in Kt?Kt.value:Kt.textContent,_n=!0)),V=rl(v,K),0<V.length&&(K=new Pu(K,e,null,n,w),k.push({event:K,listeners:V}),$?K.data=$:($=Du(n),$!==null&&(K.data=$)))),($=Jc?bc(e,n):ef(e,n))&&(v=rl(v,"onBeforeInput"),0<v.length&&(w=new Pu("onBeforeInput","beforeinput",null,n,w),k.push({event:w,listeners:v}),w.data=$))}es(k,t)})}function vr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function rl(e,t){for(var n=t+"Capture",r=[];e!==null;){var l=e,i=l.stateNode;l.tag===5&&i!==null&&(l=i,i=qn(e,n),i!=null&&r.unshift(vr(e,i,l)),i=qn(e,t),i!=null&&r.push(vr(e,i,l))),e=e.return}return r}function Rn(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function ns(e,t,n,r,l){for(var i=t._reactName,o=[];n!==null&&n!==r;){var s=n,a=s.alternate,v=s.stateNode;if(a!==null&&a===r)break;s.tag===5&&v!==null&&(s=v,l?(a=qn(n,i),a!=null&&o.unshift(vr(n,a,s))):l||(a=qn(n,i),a!=null&&o.push(vr(n,a,s)))),n=n.return}o.length!==0&&e.push({event:t,listeners:o})}var hf=/\r\n?/g,vf=/\u0000|\uFFFD/g;function rs(e){return(typeof e=="string"?e:""+e).replace(hf,`
`).replace(vf,"")}function ll(e,t,n){if(t=rs(t),rs(e)!==t&&n)throw Error(c(425))}function il(){}var Ti=null,Ri=null;function zi(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Mi=typeof setTimeout=="function"?setTimeout:void 0,yf=typeof clearTimeout=="function"?clearTimeout:void 0,ls=typeof Promise=="function"?Promise:void 0,gf=typeof queueMicrotask=="function"?queueMicrotask:typeof ls<"u"?function(e){return ls.resolve(null).then(e).catch(xf)}:Mi;function xf(e){setTimeout(function(){throw e})}function Li(e,t){var n=t,r=0;do{var l=n.nextSibling;if(e.removeChild(n),l&&l.nodeType===8)if(n=l.data,n==="/$"){if(r===0){e.removeChild(l),or(t);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=l}while(n);or(t)}function Yt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function is(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var zn=Math.random().toString(36).slice(2),_t="__reactFiber$"+zn,yr="__reactProps$"+zn,Lt="__reactContainer$"+zn,Di="__reactEvents$"+zn,wf="__reactListeners$"+zn,kf="__reactHandles$"+zn;function an(e){var t=e[_t];if(t)return t;for(var n=e.parentNode;n;){if(t=n[Lt]||n[_t]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=is(e);e!==null;){if(n=e[_t])return n;e=is(e)}return t}e=n,n=e.parentNode}return null}function gr(e){return e=e[_t]||e[Lt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Mn(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(c(33))}function ol(e){return e[yr]||null}var Oi=[],Ln=-1;function Xt(e){return{current:e}}function pe(e){0>Ln||(e.current=Oi[Ln],Oi[Ln]=null,Ln--)}function fe(e,t){Ln++,Oi[Ln]=e.current,e.current=t}var Zt={},$e=Xt(Zt),qe=Xt(!1),cn=Zt;function Dn(e,t){var n=e.type.contextTypes;if(!n)return Zt;var r=e.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===t)return r.__reactInternalMemoizedMaskedChildContext;var l={},i;for(i in n)l[i]=t[i];return r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Je(e){return e=e.childContextTypes,e!=null}function ul(){pe(qe),pe($e)}function os(e,t,n){if($e.current!==Zt)throw Error(c(168));fe($e,t),fe(qe,n)}function us(e,t,n){var r=e.stateNode;if(t=t.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var l in r)if(!(l in t))throw Error(c(108,X(e)||"Unknown",l));return R({},n,r)}function sl(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Zt,cn=$e.current,fe($e,e),fe(qe,qe.current),!0}function ss(e,t,n){var r=e.stateNode;if(!r)throw Error(c(169));n?(e=us(e,t,cn),r.__reactInternalMemoizedMergedChildContext=e,pe(qe),pe($e),fe($e,e)):pe(qe),fe(qe,n)}var Dt=null,al=!1,Ii=!1;function as(e){Dt===null?Dt=[e]:Dt.push(e)}function Sf(e){al=!0,as(e)}function qt(){if(!Ii&&Dt!==null){Ii=!0;var e=0,t=ie;try{var n=Dt;for(ie=1;e<n.length;e++){var r=n[e];do r=r(!0);while(r!==null)}Dt=null,al=!1}catch(l){throw Dt!==null&&(Dt=Dt.slice(e+1)),fu(li,qt),l}finally{ie=t,Ii=!1}}return null}var On=[],In=0,cl=null,fl=0,ft=[],dt=0,fn=null,Ot=1,It="";function dn(e,t){On[In++]=fl,On[In++]=cl,cl=e,fl=t}function cs(e,t,n){ft[dt++]=Ot,ft[dt++]=It,ft[dt++]=fn,fn=e;var r=Ot;e=It;var l=32-gt(r)-1;r&=~(1<<l),n+=1;var i=32-gt(t)+l;if(30<i){var o=l-l%5;i=(r&(1<<o)-1).toString(32),r>>=o,l-=o,Ot=1<<32-gt(t)+l|n<<l|r,It=i+e}else Ot=1<<i|n<<l|r,It=e}function Fi(e){e.return!==null&&(dn(e,1),cs(e,1,0))}function Ai(e){for(;e===cl;)cl=On[--In],On[In]=null,fl=On[--In],On[In]=null;for(;e===fn;)fn=ft[--dt],ft[dt]=null,It=ft[--dt],ft[dt]=null,Ot=ft[--dt],ft[dt]=null}var ot=null,ut=null,me=!1,wt=null;function fs(e,t){var n=vt(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function ds(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,ot=e,ut=Yt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,ot=e,ut=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=fn!==null?{id:Ot,overflow:It}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=vt(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,ot=e,ut=null,!0):!1;default:return!1}}function Ui(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Bi(e){if(me){var t=ut;if(t){var n=t;if(!ds(e,t)){if(Ui(e))throw Error(c(418));t=Yt(n.nextSibling);var r=ot;t&&ds(e,t)?fs(r,n):(e.flags=e.flags&-4097|2,me=!1,ot=e)}}else{if(Ui(e))throw Error(c(418));e.flags=e.flags&-4097|2,me=!1,ot=e}}}function ps(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;ot=e}function dl(e){if(e!==ot)return!1;if(!me)return ps(e),me=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!zi(e.type,e.memoizedProps)),t&&(t=ut)){if(Ui(e))throw ms(),Error(c(418));for(;t;)fs(e,t),t=Yt(t.nextSibling)}if(ps(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(c(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ut=Yt(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ut=null}}else ut=ot?Yt(e.stateNode.nextSibling):null;return!0}function ms(){for(var e=ut;e;)e=Yt(e.nextSibling)}function Fn(){ut=ot=null,me=!1}function Vi(e){wt===null?wt=[e]:wt.push(e)}var Ef=ge.ReactCurrentBatchConfig;function xr(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(c(309));var r=n.stateNode}if(!r)throw Error(c(147,e));var l=r,i=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===i?t.ref:(t=function(o){var s=l.refs;o===null?delete s[i]:s[i]=o},t._stringRef=i,t)}if(typeof e!="string")throw Error(c(284));if(!n._owner)throw Error(c(290,e))}return e}function pl(e,t){throw e=Object.prototype.toString.call(t),Error(c(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function hs(e){var t=e._init;return t(e._payload)}function vs(e){function t(m,d){if(e){var h=m.deletions;h===null?(m.deletions=[d],m.flags|=16):h.push(d)}}function n(m,d){if(!e)return null;for(;d!==null;)t(m,d),d=d.sibling;return null}function r(m,d){for(m=new Map;d!==null;)d.key!==null?m.set(d.key,d):m.set(d.index,d),d=d.sibling;return m}function l(m,d){return m=on(m,d),m.index=0,m.sibling=null,m}function i(m,d,h){return m.index=h,e?(h=m.alternate,h!==null?(h=h.index,h<d?(m.flags|=2,d):h):(m.flags|=2,d)):(m.flags|=1048576,d)}function o(m){return e&&m.alternate===null&&(m.flags|=2),m}function s(m,d,h,N){return d===null||d.tag!==6?(d=Lo(h,m.mode,N),d.return=m,d):(d=l(d,h),d.return=m,d)}function a(m,d,h,N){var F=h.type;return F===Ce?w(m,d,h.props.children,N,h.key):d!==null&&(d.elementType===F||typeof F=="object"&&F!==null&&F.$$typeof===we&&hs(F)===d.type)?(N=l(d,h.props),N.ref=xr(m,d,h),N.return=m,N):(N=Fl(h.type,h.key,h.props,null,m.mode,N),N.ref=xr(m,d,h),N.return=m,N)}function v(m,d,h,N){return d===null||d.tag!==4||d.stateNode.containerInfo!==h.containerInfo||d.stateNode.implementation!==h.implementation?(d=Do(h,m.mode,N),d.return=m,d):(d=l(d,h.children||[]),d.return=m,d)}function w(m,d,h,N,F){return d===null||d.tag!==7?(d=wn(h,m.mode,N,F),d.return=m,d):(d=l(d,h),d.return=m,d)}function k(m,d,h){if(typeof d=="string"&&d!==""||typeof d=="number")return d=Lo(""+d,m.mode,h),d.return=m,d;if(typeof d=="object"&&d!==null){switch(d.$$typeof){case Ae:return h=Fl(d.type,d.key,d.props,null,m.mode,h),h.ref=xr(m,null,d),h.return=m,h;case xe:return d=Do(d,m.mode,h),d.return=m,d;case we:var N=d._init;return k(m,N(d._payload),h)}if(Mt(d)||B(d))return d=wn(d,m.mode,h,null),d.return=m,d;pl(m,d)}return null}function x(m,d,h,N){var F=d!==null?d.key:null;if(typeof h=="string"&&h!==""||typeof h=="number")return F!==null?null:s(m,d,""+h,N);if(typeof h=="object"&&h!==null){switch(h.$$typeof){case Ae:return h.key===F?a(m,d,h,N):null;case xe:return h.key===F?v(m,d,h,N):null;case we:return F=h._init,x(m,d,F(h._payload),N)}if(Mt(h)||B(h))return F!==null?null:w(m,d,h,N,null);pl(m,h)}return null}function T(m,d,h,N,F){if(typeof N=="string"&&N!==""||typeof N=="number")return m=m.get(h)||null,s(d,m,""+N,F);if(typeof N=="object"&&N!==null){switch(N.$$typeof){case Ae:return m=m.get(N.key===null?h:N.key)||null,a(d,m,N,F);case xe:return m=m.get(N.key===null?h:N.key)||null,v(d,m,N,F);case we:var V=N._init;return T(m,d,h,V(N._payload),F)}if(Mt(N)||B(N))return m=m.get(h)||null,w(d,m,N,F,null);pl(d,N)}return null}function L(m,d,h,N){for(var F=null,V=null,$=d,K=d=0,Me=null;$!==null&&K<h.length;K++){$.index>K?(Me=$,$=null):Me=$.sibling;var re=x(m,$,h[K],N);if(re===null){$===null&&($=Me);break}e&&$&&re.alternate===null&&t(m,$),d=i(re,d,K),V===null?F=re:V.sibling=re,V=re,$=Me}if(K===h.length)return n(m,$),me&&dn(m,K),F;if($===null){for(;K<h.length;K++)$=k(m,h[K],N),$!==null&&(d=i($,d,K),V===null?F=$:V.sibling=$,V=$);return me&&dn(m,K),F}for($=r(m,$);K<h.length;K++)Me=T($,m,K,h[K],N),Me!==null&&(e&&Me.alternate!==null&&$.delete(Me.key===null?K:Me.key),d=i(Me,d,K),V===null?F=Me:V.sibling=Me,V=Me);return e&&$.forEach(function(un){return t(m,un)}),me&&dn(m,K),F}function O(m,d,h,N){var F=B(h);if(typeof F!="function")throw Error(c(150));if(h=F.call(h),h==null)throw Error(c(151));for(var V=F=null,$=d,K=d=0,Me=null,re=h.next();$!==null&&!re.done;K++,re=h.next()){$.index>K?(Me=$,$=null):Me=$.sibling;var un=x(m,$,re.value,N);if(un===null){$===null&&($=Me);break}e&&$&&un.alternate===null&&t(m,$),d=i(un,d,K),V===null?F=un:V.sibling=un,V=un,$=Me}if(re.done)return n(m,$),me&&dn(m,K),F;if($===null){for(;!re.done;K++,re=h.next())re=k(m,re.value,N),re!==null&&(d=i(re,d,K),V===null?F=re:V.sibling=re,V=re);return me&&dn(m,K),F}for($=r(m,$);!re.done;K++,re=h.next())re=T($,m,K,re.value,N),re!==null&&(e&&re.alternate!==null&&$.delete(re.key===null?K:re.key),d=i(re,d,K),V===null?F=re:V.sibling=re,V=re);return e&&$.forEach(function(nd){return t(m,nd)}),me&&dn(m,K),F}function Ee(m,d,h,N){if(typeof h=="object"&&h!==null&&h.type===Ce&&h.key===null&&(h=h.props.children),typeof h=="object"&&h!==null){switch(h.$$typeof){case Ae:e:{for(var F=h.key,V=d;V!==null;){if(V.key===F){if(F=h.type,F===Ce){if(V.tag===7){n(m,V.sibling),d=l(V,h.props.children),d.return=m,m=d;break e}}else if(V.elementType===F||typeof F=="object"&&F!==null&&F.$$typeof===we&&hs(F)===V.type){n(m,V.sibling),d=l(V,h.props),d.ref=xr(m,V,h),d.return=m,m=d;break e}n(m,V);break}else t(m,V);V=V.sibling}h.type===Ce?(d=wn(h.props.children,m.mode,N,h.key),d.return=m,m=d):(N=Fl(h.type,h.key,h.props,null,m.mode,N),N.ref=xr(m,d,h),N.return=m,m=N)}return o(m);case xe:e:{for(V=h.key;d!==null;){if(d.key===V)if(d.tag===4&&d.stateNode.containerInfo===h.containerInfo&&d.stateNode.implementation===h.implementation){n(m,d.sibling),d=l(d,h.children||[]),d.return=m,m=d;break e}else{n(m,d);break}else t(m,d);d=d.sibling}d=Do(h,m.mode,N),d.return=m,m=d}return o(m);case we:return V=h._init,Ee(m,d,V(h._payload),N)}if(Mt(h))return L(m,d,h,N);if(B(h))return O(m,d,h,N);pl(m,h)}return typeof h=="string"&&h!==""||typeof h=="number"?(h=""+h,d!==null&&d.tag===6?(n(m,d.sibling),d=l(d,h),d.return=m,m=d):(n(m,d),d=Lo(h,m.mode,N),d.return=m,m=d),o(m)):n(m,d)}return Ee}var An=vs(!0),ys=vs(!1),ml=Xt(null),hl=null,Un=null,$i=null;function Wi(){$i=Un=hl=null}function Hi(e){var t=ml.current;pe(ml),e._currentValue=t}function Qi(e,t,n){for(;e!==null;){var r=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,r!==null&&(r.childLanes|=t)):r!==null&&(r.childLanes&t)!==t&&(r.childLanes|=t),e===n)break;e=e.return}}function Bn(e,t){hl=e,$i=Un=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&t)!==0&&(be=!0),e.firstContext=null)}function pt(e){var t=e._currentValue;if($i!==e)if(e={context:e,memoizedValue:t,next:null},Un===null){if(hl===null)throw Error(c(308));Un=e,hl.dependencies={lanes:0,firstContext:e}}else Un=Un.next=e;return t}var pn=null;function Ki(e){pn===null?pn=[e]:pn.push(e)}function gs(e,t,n,r){var l=t.interleaved;return l===null?(n.next=n,Ki(t)):(n.next=l.next,l.next=n),t.interleaved=n,Ft(e,r)}function Ft(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var Jt=!1;function Gi(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function xs(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function At(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function bt(e,t,n){var r=e.updateQueue;if(r===null)return null;if(r=r.shared,(te&2)!==0){var l=r.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),r.pending=t,Ft(e,n)}return l=r.interleaved,l===null?(t.next=t,Ki(r)):(t.next=l.next,l.next=t),r.interleaved=t,Ft(e,n)}function vl(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,ui(e,n)}}function ws(e,t){var n=e.updateQueue,r=e.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var l=null,i=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};i===null?l=i=o:i=i.next=o,n=n.next}while(n!==null);i===null?l=i=t:i=i.next=t}else l=i=t;n={baseState:r.baseState,firstBaseUpdate:l,lastBaseUpdate:i,shared:r.shared,effects:r.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function yl(e,t,n,r){var l=e.updateQueue;Jt=!1;var i=l.firstBaseUpdate,o=l.lastBaseUpdate,s=l.shared.pending;if(s!==null){l.shared.pending=null;var a=s,v=a.next;a.next=null,o===null?i=v:o.next=v,o=a;var w=e.alternate;w!==null&&(w=w.updateQueue,s=w.lastBaseUpdate,s!==o&&(s===null?w.firstBaseUpdate=v:s.next=v,w.lastBaseUpdate=a))}if(i!==null){var k=l.baseState;o=0,w=v=a=null,s=i;do{var x=s.lane,T=s.eventTime;if((r&x)===x){w!==null&&(w=w.next={eventTime:T,lane:0,tag:s.tag,payload:s.payload,callback:s.callback,next:null});e:{var L=e,O=s;switch(x=t,T=n,O.tag){case 1:if(L=O.payload,typeof L=="function"){k=L.call(T,k,x);break e}k=L;break e;case 3:L.flags=L.flags&-65537|128;case 0:if(L=O.payload,x=typeof L=="function"?L.call(T,k,x):L,x==null)break e;k=R({},k,x);break e;case 2:Jt=!0}}s.callback!==null&&s.lane!==0&&(e.flags|=64,x=l.effects,x===null?l.effects=[s]:x.push(s))}else T={eventTime:T,lane:x,tag:s.tag,payload:s.payload,callback:s.callback,next:null},w===null?(v=w=T,a=k):w=w.next=T,o|=x;if(s=s.next,s===null){if(s=l.shared.pending,s===null)break;x=s,s=x.next,x.next=null,l.lastBaseUpdate=x,l.shared.pending=null}}while(!0);if(w===null&&(a=k),l.baseState=a,l.firstBaseUpdate=v,l.lastBaseUpdate=w,t=l.shared.interleaved,t!==null){l=t;do o|=l.lane,l=l.next;while(l!==t)}else i===null&&(l.shared.lanes=0);vn|=o,e.lanes=o,e.memoizedState=k}}function ks(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var r=e[t],l=r.callback;if(l!==null){if(r.callback=null,r=n,typeof l!="function")throw Error(c(191,l));l.call(r)}}}var wr={},Pt=Xt(wr),kr=Xt(wr),Sr=Xt(wr);function mn(e){if(e===wr)throw Error(c(174));return e}function Yi(e,t){switch(fe(Sr,t),fe(kr,e),fe(Pt,wr),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:Xl(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=Xl(t,e)}pe(Pt),fe(Pt,t)}function Vn(){pe(Pt),pe(kr),pe(Sr)}function Ss(e){mn(Sr.current);var t=mn(Pt.current),n=Xl(t,e.type);t!==n&&(fe(kr,e),fe(Pt,n))}function Xi(e){kr.current===e&&(pe(Pt),pe(kr))}var ve=Xt(0);function gl(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Zi=[];function qi(){for(var e=0;e<Zi.length;e++)Zi[e]._workInProgressVersionPrimary=null;Zi.length=0}var xl=ge.ReactCurrentDispatcher,Ji=ge.ReactCurrentBatchConfig,hn=0,ye=null,_e=null,Re=null,wl=!1,Er=!1,Nr=0,Nf=0;function We(){throw Error(c(321))}function bi(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!xt(e[n],t[n]))return!1;return!0}function eo(e,t,n,r,l,i){if(hn=i,ye=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,xl.current=e===null||e.memoizedState===null?Pf:Tf,e=n(r,l),Er){i=0;do{if(Er=!1,Nr=0,25<=i)throw Error(c(301));i+=1,Re=_e=null,t.updateQueue=null,xl.current=Rf,e=n(r,l)}while(Er)}if(xl.current=El,t=_e!==null&&_e.next!==null,hn=0,Re=_e=ye=null,wl=!1,t)throw Error(c(300));return e}function to(){var e=Nr!==0;return Nr=0,e}function Tt(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Re===null?ye.memoizedState=Re=e:Re=Re.next=e,Re}function mt(){if(_e===null){var e=ye.alternate;e=e!==null?e.memoizedState:null}else e=_e.next;var t=Re===null?ye.memoizedState:Re.next;if(t!==null)Re=t,_e=e;else{if(e===null)throw Error(c(310));_e=e,e={memoizedState:_e.memoizedState,baseState:_e.baseState,baseQueue:_e.baseQueue,queue:_e.queue,next:null},Re===null?ye.memoizedState=Re=e:Re=Re.next=e}return Re}function Cr(e,t){return typeof t=="function"?t(e):t}function no(e){var t=mt(),n=t.queue;if(n===null)throw Error(c(311));n.lastRenderedReducer=e;var r=_e,l=r.baseQueue,i=n.pending;if(i!==null){if(l!==null){var o=l.next;l.next=i.next,i.next=o}r.baseQueue=l=i,n.pending=null}if(l!==null){i=l.next,r=r.baseState;var s=o=null,a=null,v=i;do{var w=v.lane;if((hn&w)===w)a!==null&&(a=a.next={lane:0,action:v.action,hasEagerState:v.hasEagerState,eagerState:v.eagerState,next:null}),r=v.hasEagerState?v.eagerState:e(r,v.action);else{var k={lane:w,action:v.action,hasEagerState:v.hasEagerState,eagerState:v.eagerState,next:null};a===null?(s=a=k,o=r):a=a.next=k,ye.lanes|=w,vn|=w}v=v.next}while(v!==null&&v!==i);a===null?o=r:a.next=s,xt(r,t.memoizedState)||(be=!0),t.memoizedState=r,t.baseState=o,t.baseQueue=a,n.lastRenderedState=r}if(e=n.interleaved,e!==null){l=e;do i=l.lane,ye.lanes|=i,vn|=i,l=l.next;while(l!==e)}else l===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function ro(e){var t=mt(),n=t.queue;if(n===null)throw Error(c(311));n.lastRenderedReducer=e;var r=n.dispatch,l=n.pending,i=t.memoizedState;if(l!==null){n.pending=null;var o=l=l.next;do i=e(i,o.action),o=o.next;while(o!==l);xt(i,t.memoizedState)||(be=!0),t.memoizedState=i,t.baseQueue===null&&(t.baseState=i),n.lastRenderedState=i}return[i,r]}function Es(){}function Ns(e,t){var n=ye,r=mt(),l=t(),i=!xt(r.memoizedState,l);if(i&&(r.memoizedState=l,be=!0),r=r.queue,lo(_s.bind(null,n,r,e),[e]),r.getSnapshot!==t||i||Re!==null&&Re.memoizedState.tag&1){if(n.flags|=2048,jr(9,js.bind(null,n,r,l,t),void 0,null),ze===null)throw Error(c(349));(hn&30)!==0||Cs(n,t,l)}return l}function Cs(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=ye.updateQueue,t===null?(t={lastEffect:null,stores:null},ye.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function js(e,t,n,r){t.value=n,t.getSnapshot=r,Ps(t)&&Ts(e)}function _s(e,t,n){return n(function(){Ps(t)&&Ts(e)})}function Ps(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!xt(e,n)}catch{return!0}}function Ts(e){var t=Ft(e,1);t!==null&&Nt(t,e,1,-1)}function Rs(e){var t=Tt();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Cr,lastRenderedState:e},t.queue=e,e=e.dispatch=_f.bind(null,ye,e),[t.memoizedState,e]}function jr(e,t,n,r){return e={tag:e,create:t,destroy:n,deps:r,next:null},t=ye.updateQueue,t===null?(t={lastEffect:null,stores:null},ye.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(r=n.next,n.next=e,e.next=r,t.lastEffect=e)),e}function zs(){return mt().memoizedState}function kl(e,t,n,r){var l=Tt();ye.flags|=e,l.memoizedState=jr(1|t,n,void 0,r===void 0?null:r)}function Sl(e,t,n,r){var l=mt();r=r===void 0?null:r;var i=void 0;if(_e!==null){var o=_e.memoizedState;if(i=o.destroy,r!==null&&bi(r,o.deps)){l.memoizedState=jr(t,n,i,r);return}}ye.flags|=e,l.memoizedState=jr(1|t,n,i,r)}function Ms(e,t){return kl(8390656,8,e,t)}function lo(e,t){return Sl(2048,8,e,t)}function Ls(e,t){return Sl(4,2,e,t)}function Ds(e,t){return Sl(4,4,e,t)}function Os(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function Is(e,t,n){return n=n!=null?n.concat([e]):null,Sl(4,4,Os.bind(null,t,e),n)}function io(){}function Fs(e,t){var n=mt();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&bi(t,r[1])?r[0]:(n.memoizedState=[e,t],e)}function As(e,t){var n=mt();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&bi(t,r[1])?r[0]:(e=e(),n.memoizedState=[e,t],e)}function Us(e,t,n){return(hn&21)===0?(e.baseState&&(e.baseState=!1,be=!0),e.memoizedState=n):(xt(n,t)||(n=hu(),ye.lanes|=n,vn|=n,e.baseState=!0),t)}function Cf(e,t){var n=ie;ie=n!==0&&4>n?n:4,e(!0);var r=Ji.transition;Ji.transition={};try{e(!1),t()}finally{ie=n,Ji.transition=r}}function Bs(){return mt().memoizedState}function jf(e,t,n){var r=rn(e);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Vs(e))$s(t,n);else if(n=gs(e,t,n,r),n!==null){var l=Xe();Nt(n,e,r,l),Ws(n,t,r)}}function _f(e,t,n){var r=rn(e),l={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Vs(e))$s(t,l);else{var i=e.alternate;if(e.lanes===0&&(i===null||i.lanes===0)&&(i=t.lastRenderedReducer,i!==null))try{var o=t.lastRenderedState,s=i(o,n);if(l.hasEagerState=!0,l.eagerState=s,xt(s,o)){var a=t.interleaved;a===null?(l.next=l,Ki(t)):(l.next=a.next,a.next=l),t.interleaved=l;return}}catch{}finally{}n=gs(e,t,l,r),n!==null&&(l=Xe(),Nt(n,e,r,l),Ws(n,t,r))}}function Vs(e){var t=e.alternate;return e===ye||t!==null&&t===ye}function $s(e,t){Er=wl=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function Ws(e,t,n){if((n&4194240)!==0){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,ui(e,n)}}var El={readContext:pt,useCallback:We,useContext:We,useEffect:We,useImperativeHandle:We,useInsertionEffect:We,useLayoutEffect:We,useMemo:We,useReducer:We,useRef:We,useState:We,useDebugValue:We,useDeferredValue:We,useTransition:We,useMutableSource:We,useSyncExternalStore:We,useId:We,unstable_isNewReconciler:!1},Pf={readContext:pt,useCallback:function(e,t){return Tt().memoizedState=[e,t===void 0?null:t],e},useContext:pt,useEffect:Ms,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,kl(4194308,4,Os.bind(null,t,e),n)},useLayoutEffect:function(e,t){return kl(4194308,4,e,t)},useInsertionEffect:function(e,t){return kl(4,2,e,t)},useMemo:function(e,t){var n=Tt();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var r=Tt();return t=n!==void 0?n(t):t,r.memoizedState=r.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},r.queue=e,e=e.dispatch=jf.bind(null,ye,e),[r.memoizedState,e]},useRef:function(e){var t=Tt();return e={current:e},t.memoizedState=e},useState:Rs,useDebugValue:io,useDeferredValue:function(e){return Tt().memoizedState=e},useTransition:function(){var e=Rs(!1),t=e[0];return e=Cf.bind(null,e[1]),Tt().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var r=ye,l=Tt();if(me){if(n===void 0)throw Error(c(407));n=n()}else{if(n=t(),ze===null)throw Error(c(349));(hn&30)!==0||Cs(r,t,n)}l.memoizedState=n;var i={value:n,getSnapshot:t};return l.queue=i,Ms(_s.bind(null,r,i,e),[e]),r.flags|=2048,jr(9,js.bind(null,r,i,n,t),void 0,null),n},useId:function(){var e=Tt(),t=ze.identifierPrefix;if(me){var n=It,r=Ot;n=(r&~(1<<32-gt(r)-1)).toString(32)+n,t=":"+t+"R"+n,n=Nr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=Nf++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},Tf={readContext:pt,useCallback:Fs,useContext:pt,useEffect:lo,useImperativeHandle:Is,useInsertionEffect:Ls,useLayoutEffect:Ds,useMemo:As,useReducer:no,useRef:zs,useState:function(){return no(Cr)},useDebugValue:io,useDeferredValue:function(e){var t=mt();return Us(t,_e.memoizedState,e)},useTransition:function(){var e=no(Cr)[0],t=mt().memoizedState;return[e,t]},useMutableSource:Es,useSyncExternalStore:Ns,useId:Bs,unstable_isNewReconciler:!1},Rf={readContext:pt,useCallback:Fs,useContext:pt,useEffect:lo,useImperativeHandle:Is,useInsertionEffect:Ls,useLayoutEffect:Ds,useMemo:As,useReducer:ro,useRef:zs,useState:function(){return ro(Cr)},useDebugValue:io,useDeferredValue:function(e){var t=mt();return _e===null?t.memoizedState=e:Us(t,_e.memoizedState,e)},useTransition:function(){var e=ro(Cr)[0],t=mt().memoizedState;return[e,t]},useMutableSource:Es,useSyncExternalStore:Ns,useId:Bs,unstable_isNewReconciler:!1};function kt(e,t){if(e&&e.defaultProps){t=R({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function oo(e,t,n,r){t=e.memoizedState,n=n(r,t),n=n==null?t:R({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var Nl={isMounted:function(e){return(e=e._reactInternals)?sn(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var r=Xe(),l=rn(e),i=At(r,l);i.payload=t,n!=null&&(i.callback=n),t=bt(e,i,l),t!==null&&(Nt(t,e,l,r),vl(t,e,l))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var r=Xe(),l=rn(e),i=At(r,l);i.tag=1,i.payload=t,n!=null&&(i.callback=n),t=bt(e,i,l),t!==null&&(Nt(t,e,l,r),vl(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Xe(),r=rn(e),l=At(n,r);l.tag=2,t!=null&&(l.callback=t),t=bt(e,l,r),t!==null&&(Nt(t,e,r,n),vl(t,e,r))}};function Hs(e,t,n,r,l,i,o){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(r,i,o):t.prototype&&t.prototype.isPureReactComponent?!dr(n,r)||!dr(l,i):!0}function Qs(e,t,n){var r=!1,l=Zt,i=t.contextType;return typeof i=="object"&&i!==null?i=pt(i):(l=Je(t)?cn:$e.current,r=t.contextTypes,i=(r=r!=null)?Dn(e,l):Zt),t=new t(n,i),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=Nl,e.stateNode=t,t._reactInternals=e,r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=i),t}function Ks(e,t,n,r){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,r),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,r),t.state!==e&&Nl.enqueueReplaceState(t,t.state,null)}function uo(e,t,n,r){var l=e.stateNode;l.props=n,l.state=e.memoizedState,l.refs={},Gi(e);var i=t.contextType;typeof i=="object"&&i!==null?l.context=pt(i):(i=Je(t)?cn:$e.current,l.context=Dn(e,i)),l.state=e.memoizedState,i=t.getDerivedStateFromProps,typeof i=="function"&&(oo(e,t,i,n),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&Nl.enqueueReplaceState(l,l.state,null),yl(e,n,l,r),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function $n(e,t){try{var n="",r=t;do n+=A(r),r=r.return;while(r);var l=n}catch(i){l=`
Error generating stack: `+i.message+`
`+i.stack}return{value:e,source:t,stack:l,digest:null}}function so(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function ao(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var zf=typeof WeakMap=="function"?WeakMap:Map;function Gs(e,t,n){n=At(-1,n),n.tag=3,n.payload={element:null};var r=t.value;return n.callback=function(){zl||(zl=!0,Co=r),ao(e,t)},n}function Ys(e,t,n){n=At(-1,n),n.tag=3;var r=e.type.getDerivedStateFromError;if(typeof r=="function"){var l=t.value;n.payload=function(){return r(l)},n.callback=function(){ao(e,t)}}var i=e.stateNode;return i!==null&&typeof i.componentDidCatch=="function"&&(n.callback=function(){ao(e,t),typeof r!="function"&&(tn===null?tn=new Set([this]):tn.add(this));var o=t.stack;this.componentDidCatch(t.value,{componentStack:o!==null?o:""})}),n}function Xs(e,t,n){var r=e.pingCache;if(r===null){r=e.pingCache=new zf;var l=new Set;r.set(t,l)}else l=r.get(t),l===void 0&&(l=new Set,r.set(t,l));l.has(n)||(l.add(n),e=Qf.bind(null,e,t,n),t.then(e,e))}function Zs(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function qs(e,t,n,r,l){return(e.mode&1)===0?(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=At(-1,1),t.tag=2,bt(n,t,1))),n.lanes|=1),e):(e.flags|=65536,e.lanes=l,e)}var Mf=ge.ReactCurrentOwner,be=!1;function Ye(e,t,n,r){t.child=e===null?ys(t,null,n,r):An(t,e.child,n,r)}function Js(e,t,n,r,l){n=n.render;var i=t.ref;return Bn(t,l),r=eo(e,t,n,r,i,l),n=to(),e!==null&&!be?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Ut(e,t,l)):(me&&n&&Fi(t),t.flags|=1,Ye(e,t,r,l),t.child)}function bs(e,t,n,r,l){if(e===null){var i=n.type;return typeof i=="function"&&!Mo(i)&&i.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=i,ea(e,t,i,r,l)):(e=Fl(n.type,null,r,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(i=e.child,(e.lanes&l)===0){var o=i.memoizedProps;if(n=n.compare,n=n!==null?n:dr,n(o,r)&&e.ref===t.ref)return Ut(e,t,l)}return t.flags|=1,e=on(i,r),e.ref=t.ref,e.return=t,t.child=e}function ea(e,t,n,r,l){if(e!==null){var i=e.memoizedProps;if(dr(i,r)&&e.ref===t.ref)if(be=!1,t.pendingProps=r=i,(e.lanes&l)!==0)(e.flags&131072)!==0&&(be=!0);else return t.lanes=e.lanes,Ut(e,t,l)}return co(e,t,n,r,l)}function ta(e,t,n){var r=t.pendingProps,l=r.children,i=e!==null?e.memoizedState:null;if(r.mode==="hidden")if((t.mode&1)===0)t.memoizedState={baseLanes:0,cachePool:null,transitions:null},fe(Hn,st),st|=n;else{if((n&1073741824)===0)return e=i!==null?i.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,fe(Hn,st),st|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=i!==null?i.baseLanes:n,fe(Hn,st),st|=r}else i!==null?(r=i.baseLanes|n,t.memoizedState=null):r=n,fe(Hn,st),st|=r;return Ye(e,t,l,n),t.child}function na(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function co(e,t,n,r,l){var i=Je(n)?cn:$e.current;return i=Dn(t,i),Bn(t,l),n=eo(e,t,n,r,i,l),r=to(),e!==null&&!be?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Ut(e,t,l)):(me&&r&&Fi(t),t.flags|=1,Ye(e,t,n,l),t.child)}function ra(e,t,n,r,l){if(Je(n)){var i=!0;sl(t)}else i=!1;if(Bn(t,l),t.stateNode===null)jl(e,t),Qs(t,n,r),uo(t,n,r,l),r=!0;else if(e===null){var o=t.stateNode,s=t.memoizedProps;o.props=s;var a=o.context,v=n.contextType;typeof v=="object"&&v!==null?v=pt(v):(v=Je(n)?cn:$e.current,v=Dn(t,v));var w=n.getDerivedStateFromProps,k=typeof w=="function"||typeof o.getSnapshotBeforeUpdate=="function";k||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(s!==r||a!==v)&&Ks(t,o,r,v),Jt=!1;var x=t.memoizedState;o.state=x,yl(t,r,o,l),a=t.memoizedState,s!==r||x!==a||qe.current||Jt?(typeof w=="function"&&(oo(t,n,w,r),a=t.memoizedState),(s=Jt||Hs(t,n,s,r,x,a,v))?(k||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(t.flags|=4194308)):(typeof o.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=r,t.memoizedState=a),o.props=r,o.state=a,o.context=v,r=s):(typeof o.componentDidMount=="function"&&(t.flags|=4194308),r=!1)}else{o=t.stateNode,xs(e,t),s=t.memoizedProps,v=t.type===t.elementType?s:kt(t.type,s),o.props=v,k=t.pendingProps,x=o.context,a=n.contextType,typeof a=="object"&&a!==null?a=pt(a):(a=Je(n)?cn:$e.current,a=Dn(t,a));var T=n.getDerivedStateFromProps;(w=typeof T=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(s!==k||x!==a)&&Ks(t,o,r,a),Jt=!1,x=t.memoizedState,o.state=x,yl(t,r,o,l);var L=t.memoizedState;s!==k||x!==L||qe.current||Jt?(typeof T=="function"&&(oo(t,n,T,r),L=t.memoizedState),(v=Jt||Hs(t,n,v,r,x,L,a)||!1)?(w||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,L,a),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,L,a)),typeof o.componentDidUpdate=="function"&&(t.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof o.componentDidUpdate!="function"||s===e.memoizedProps&&x===e.memoizedState||(t.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||s===e.memoizedProps&&x===e.memoizedState||(t.flags|=1024),t.memoizedProps=r,t.memoizedState=L),o.props=r,o.state=L,o.context=a,r=v):(typeof o.componentDidUpdate!="function"||s===e.memoizedProps&&x===e.memoizedState||(t.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||s===e.memoizedProps&&x===e.memoizedState||(t.flags|=1024),r=!1)}return fo(e,t,n,r,i,l)}function fo(e,t,n,r,l,i){na(e,t);var o=(t.flags&128)!==0;if(!r&&!o)return l&&ss(t,n,!1),Ut(e,t,i);r=t.stateNode,Mf.current=t;var s=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return t.flags|=1,e!==null&&o?(t.child=An(t,e.child,null,i),t.child=An(t,null,s,i)):Ye(e,t,s,i),t.memoizedState=r.state,l&&ss(t,n,!0),t.child}function la(e){var t=e.stateNode;t.pendingContext?os(e,t.pendingContext,t.pendingContext!==t.context):t.context&&os(e,t.context,!1),Yi(e,t.containerInfo)}function ia(e,t,n,r,l){return Fn(),Vi(l),t.flags|=256,Ye(e,t,n,r),t.child}var po={dehydrated:null,treeContext:null,retryLane:0};function mo(e){return{baseLanes:e,cachePool:null,transitions:null}}function oa(e,t,n){var r=t.pendingProps,l=ve.current,i=!1,o=(t.flags&128)!==0,s;if((s=o)||(s=e!==null&&e.memoizedState===null?!1:(l&2)!==0),s?(i=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),fe(ve,l&1),e===null)return Bi(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?((t.mode&1)===0?t.lanes=1:e.data==="$!"?t.lanes=8:t.lanes=1073741824,null):(o=r.children,e=r.fallback,i?(r=t.mode,i=t.child,o={mode:"hidden",children:o},(r&1)===0&&i!==null?(i.childLanes=0,i.pendingProps=o):i=Al(o,r,0,null),e=wn(e,r,n,null),i.return=t,e.return=t,i.sibling=e,t.child=i,t.child.memoizedState=mo(n),t.memoizedState=po,e):ho(t,o));if(l=e.memoizedState,l!==null&&(s=l.dehydrated,s!==null))return Lf(e,t,o,r,s,l,n);if(i){i=r.fallback,o=t.mode,l=e.child,s=l.sibling;var a={mode:"hidden",children:r.children};return(o&1)===0&&t.child!==l?(r=t.child,r.childLanes=0,r.pendingProps=a,t.deletions=null):(r=on(l,a),r.subtreeFlags=l.subtreeFlags&14680064),s!==null?i=on(s,i):(i=wn(i,o,n,null),i.flags|=2),i.return=t,r.return=t,r.sibling=i,t.child=r,r=i,i=t.child,o=e.child.memoizedState,o=o===null?mo(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},i.memoizedState=o,i.childLanes=e.childLanes&~n,t.memoizedState=po,r}return i=e.child,e=i.sibling,r=on(i,{mode:"visible",children:r.children}),(t.mode&1)===0&&(r.lanes=n),r.return=t,r.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=r,t.memoizedState=null,r}function ho(e,t){return t=Al({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function Cl(e,t,n,r){return r!==null&&Vi(r),An(t,e.child,null,n),e=ho(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Lf(e,t,n,r,l,i,o){if(n)return t.flags&256?(t.flags&=-257,r=so(Error(c(422))),Cl(e,t,o,r)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(i=r.fallback,l=t.mode,r=Al({mode:"visible",children:r.children},l,0,null),i=wn(i,l,o,null),i.flags|=2,r.return=t,i.return=t,r.sibling=i,t.child=r,(t.mode&1)!==0&&An(t,e.child,null,o),t.child.memoizedState=mo(o),t.memoizedState=po,i);if((t.mode&1)===0)return Cl(e,t,o,null);if(l.data==="$!"){if(r=l.nextSibling&&l.nextSibling.dataset,r)var s=r.dgst;return r=s,i=Error(c(419)),r=so(i,r,void 0),Cl(e,t,o,r)}if(s=(o&e.childLanes)!==0,be||s){if(r=ze,r!==null){switch(o&-o){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=(l&(r.suspendedLanes|o))!==0?0:l,l!==0&&l!==i.retryLane&&(i.retryLane=l,Ft(e,l),Nt(r,e,l,-1))}return zo(),r=so(Error(c(421))),Cl(e,t,o,r)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=Kf.bind(null,e),l._reactRetry=t,null):(e=i.treeContext,ut=Yt(l.nextSibling),ot=t,me=!0,wt=null,e!==null&&(ft[dt++]=Ot,ft[dt++]=It,ft[dt++]=fn,Ot=e.id,It=e.overflow,fn=t),t=ho(t,r.children),t.flags|=4096,t)}function ua(e,t,n){e.lanes|=t;var r=e.alternate;r!==null&&(r.lanes|=t),Qi(e.return,t,n)}function vo(e,t,n,r,l){var i=e.memoizedState;i===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:l}:(i.isBackwards=t,i.rendering=null,i.renderingStartTime=0,i.last=r,i.tail=n,i.tailMode=l)}function sa(e,t,n){var r=t.pendingProps,l=r.revealOrder,i=r.tail;if(Ye(e,t,r.children,n),r=ve.current,(r&2)!==0)r=r&1|2,t.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&ua(e,n,t);else if(e.tag===19)ua(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}r&=1}if(fe(ve,r),(t.mode&1)===0)t.memoizedState=null;else switch(l){case"forwards":for(n=t.child,l=null;n!==null;)e=n.alternate,e!==null&&gl(e)===null&&(l=n),n=n.sibling;n=l,n===null?(l=t.child,t.child=null):(l=n.sibling,n.sibling=null),vo(t,!1,l,n,i);break;case"backwards":for(n=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&gl(e)===null){t.child=l;break}e=l.sibling,l.sibling=n,n=l,l=e}vo(t,!0,n,null,i);break;case"together":vo(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function jl(e,t){(t.mode&1)===0&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Ut(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),vn|=t.lanes,(n&t.childLanes)===0)return null;if(e!==null&&t.child!==e.child)throw Error(c(153));if(t.child!==null){for(e=t.child,n=on(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=on(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function Df(e,t,n){switch(t.tag){case 3:la(t),Fn();break;case 5:Ss(t);break;case 1:Je(t.type)&&sl(t);break;case 4:Yi(t,t.stateNode.containerInfo);break;case 10:var r=t.type._context,l=t.memoizedProps.value;fe(ml,r._currentValue),r._currentValue=l;break;case 13:if(r=t.memoizedState,r!==null)return r.dehydrated!==null?(fe(ve,ve.current&1),t.flags|=128,null):(n&t.child.childLanes)!==0?oa(e,t,n):(fe(ve,ve.current&1),e=Ut(e,t,n),e!==null?e.sibling:null);fe(ve,ve.current&1);break;case 19:if(r=(n&t.childLanes)!==0,(e.flags&128)!==0){if(r)return sa(e,t,n);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),fe(ve,ve.current),r)break;return null;case 22:case 23:return t.lanes=0,ta(e,t,n)}return Ut(e,t,n)}var aa,yo,ca,fa;aa=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}},yo=function(){},ca=function(e,t,n,r){var l=e.memoizedProps;if(l!==r){e=t.stateNode,mn(Pt.current);var i=null;switch(n){case"input":l=Ze(e,l),r=Ze(e,r),i=[];break;case"select":l=R({},l,{value:void 0}),r=R({},r,{value:void 0}),i=[];break;case"textarea":l=Yl(e,l),r=Yl(e,r),i=[];break;default:typeof l.onClick!="function"&&typeof r.onClick=="function"&&(e.onclick=il)}Zl(n,r);var o;n=null;for(v in l)if(!r.hasOwnProperty(v)&&l.hasOwnProperty(v)&&l[v]!=null)if(v==="style"){var s=l[v];for(o in s)s.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else v!=="dangerouslySetInnerHTML"&&v!=="children"&&v!=="suppressContentEditableWarning"&&v!=="suppressHydrationWarning"&&v!=="autoFocus"&&(E.hasOwnProperty(v)?i||(i=[]):(i=i||[]).push(v,null));for(v in r){var a=r[v];if(s=l!=null?l[v]:void 0,r.hasOwnProperty(v)&&a!==s&&(a!=null||s!=null))if(v==="style")if(s){for(o in s)!s.hasOwnProperty(o)||a&&a.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in a)a.hasOwnProperty(o)&&s[o]!==a[o]&&(n||(n={}),n[o]=a[o])}else n||(i||(i=[]),i.push(v,n)),n=a;else v==="dangerouslySetInnerHTML"?(a=a?a.__html:void 0,s=s?s.__html:void 0,a!=null&&s!==a&&(i=i||[]).push(v,a)):v==="children"?typeof a!="string"&&typeof a!="number"||(i=i||[]).push(v,""+a):v!=="suppressContentEditableWarning"&&v!=="suppressHydrationWarning"&&(E.hasOwnProperty(v)?(a!=null&&v==="onScroll"&&de("scroll",e),i||s===a||(i=[])):(i=i||[]).push(v,a))}n&&(i=i||[]).push("style",n);var v=i;(t.updateQueue=v)&&(t.flags|=4)}},fa=function(e,t,n,r){n!==r&&(t.flags|=4)};function _r(e,t){if(!me)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:r.sibling=null}}function He(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,r=0;if(t)for(var l=e.child;l!==null;)n|=l.lanes|l.childLanes,r|=l.subtreeFlags&14680064,r|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)n|=l.lanes|l.childLanes,r|=l.subtreeFlags,r|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=r,e.childLanes=n,t}function Of(e,t,n){var r=t.pendingProps;switch(Ai(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return He(t),null;case 1:return Je(t.type)&&ul(),He(t),null;case 3:return r=t.stateNode,Vn(),pe(qe),pe($e),qi(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(e===null||e.child===null)&&(dl(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,wt!==null&&(Po(wt),wt=null))),yo(e,t),He(t),null;case 5:Xi(t);var l=mn(Sr.current);if(n=t.type,e!==null&&t.stateNode!=null)ca(e,t,n,r,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!r){if(t.stateNode===null)throw Error(c(166));return He(t),null}if(e=mn(Pt.current),dl(t)){r=t.stateNode,n=t.type;var i=t.memoizedProps;switch(r[_t]=t,r[yr]=i,e=(t.mode&1)!==0,n){case"dialog":de("cancel",r),de("close",r);break;case"iframe":case"object":case"embed":de("load",r);break;case"video":case"audio":for(l=0;l<mr.length;l++)de(mr[l],r);break;case"source":de("error",r);break;case"img":case"image":case"link":de("error",r),de("load",r);break;case"details":de("toggle",r);break;case"input":ct(r,i),de("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!i.multiple},de("invalid",r);break;case"textarea":Yo(r,i),de("invalid",r)}Zl(n,i),l=null;for(var o in i)if(i.hasOwnProperty(o)){var s=i[o];o==="children"?typeof s=="string"?r.textContent!==s&&(i.suppressHydrationWarning!==!0&&ll(r.textContent,s,e),l=["children",s]):typeof s=="number"&&r.textContent!==""+s&&(i.suppressHydrationWarning!==!0&&ll(r.textContent,s,e),l=["children",""+s]):E.hasOwnProperty(o)&&s!=null&&o==="onScroll"&&de("scroll",r)}switch(n){case"input":Ve(r),Ir(r,i,!0);break;case"textarea":Ve(r),Zo(r);break;case"select":case"option":break;default:typeof i.onClick=="function"&&(r.onclick=il)}r=l,t.updateQueue=r,r!==null&&(t.flags|=4)}else{o=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=qo(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=o.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof r.is=="string"?e=o.createElement(n,{is:r.is}):(e=o.createElement(n),n==="select"&&(o=e,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):e=o.createElementNS(e,n),e[_t]=t,e[yr]=r,aa(e,t,!1,!1),t.stateNode=e;e:{switch(o=ql(n,r),n){case"dialog":de("cancel",e),de("close",e),l=r;break;case"iframe":case"object":case"embed":de("load",e),l=r;break;case"video":case"audio":for(l=0;l<mr.length;l++)de(mr[l],e);l=r;break;case"source":de("error",e),l=r;break;case"img":case"image":case"link":de("error",e),de("load",e),l=r;break;case"details":de("toggle",e),l=r;break;case"input":ct(e,r),l=Ze(e,r),de("invalid",e);break;case"option":l=r;break;case"select":e._wrapperState={wasMultiple:!!r.multiple},l=R({},r,{value:void 0}),de("invalid",e);break;case"textarea":Yo(e,r),l=Yl(e,r),de("invalid",e);break;default:l=r}Zl(n,l),s=l;for(i in s)if(s.hasOwnProperty(i)){var a=s[i];i==="style"?eu(e,a):i==="dangerouslySetInnerHTML"?(a=a?a.__html:void 0,a!=null&&Jo(e,a)):i==="children"?typeof a=="string"?(n!=="textarea"||a!=="")&&Xn(e,a):typeof a=="number"&&Xn(e,""+a):i!=="suppressContentEditableWarning"&&i!=="suppressHydrationWarning"&&i!=="autoFocus"&&(E.hasOwnProperty(i)?a!=null&&i==="onScroll"&&de("scroll",e):a!=null&&q(e,i,a,o))}switch(n){case"input":Ve(e),Ir(e,r,!1);break;case"textarea":Ve(e),Zo(e);break;case"option":r.value!=null&&e.setAttribute("value",""+J(r.value));break;case"select":e.multiple=!!r.multiple,i=r.value,i!=null?Ct(e,!!r.multiple,i,!1):r.defaultValue!=null&&Ct(e,!!r.multiple,r.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=il)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return He(t),null;case 6:if(e&&t.stateNode!=null)fa(e,t,e.memoizedProps,r);else{if(typeof r!="string"&&t.stateNode===null)throw Error(c(166));if(n=mn(Sr.current),mn(Pt.current),dl(t)){if(r=t.stateNode,n=t.memoizedProps,r[_t]=t,(i=r.nodeValue!==n)&&(e=ot,e!==null))switch(e.tag){case 3:ll(r.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&ll(r.nodeValue,n,(e.mode&1)!==0)}i&&(t.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[_t]=t,t.stateNode=r}return He(t),null;case 13:if(pe(ve),r=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(me&&ut!==null&&(t.mode&1)!==0&&(t.flags&128)===0)ms(),Fn(),t.flags|=98560,i=!1;else if(i=dl(t),r!==null&&r.dehydrated!==null){if(e===null){if(!i)throw Error(c(318));if(i=t.memoizedState,i=i!==null?i.dehydrated:null,!i)throw Error(c(317));i[_t]=t}else Fn(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;He(t),i=!1}else wt!==null&&(Po(wt),wt=null),i=!0;if(!i)return t.flags&65536?t:null}return(t.flags&128)!==0?(t.lanes=n,t):(r=r!==null,r!==(e!==null&&e.memoizedState!==null)&&r&&(t.child.flags|=8192,(t.mode&1)!==0&&(e===null||(ve.current&1)!==0?Pe===0&&(Pe=3):zo())),t.updateQueue!==null&&(t.flags|=4),He(t),null);case 4:return Vn(),yo(e,t),e===null&&hr(t.stateNode.containerInfo),He(t),null;case 10:return Hi(t.type._context),He(t),null;case 17:return Je(t.type)&&ul(),He(t),null;case 19:if(pe(ve),i=t.memoizedState,i===null)return He(t),null;if(r=(t.flags&128)!==0,o=i.rendering,o===null)if(r)_r(i,!1);else{if(Pe!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(o=gl(e),o!==null){for(t.flags|=128,_r(i,!1),r=o.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),t.subtreeFlags=0,r=n,n=t.child;n!==null;)i=n,e=r,i.flags&=14680066,o=i.alternate,o===null?(i.childLanes=0,i.lanes=e,i.child=null,i.subtreeFlags=0,i.memoizedProps=null,i.memoizedState=null,i.updateQueue=null,i.dependencies=null,i.stateNode=null):(i.childLanes=o.childLanes,i.lanes=o.lanes,i.child=o.child,i.subtreeFlags=0,i.deletions=null,i.memoizedProps=o.memoizedProps,i.memoizedState=o.memoizedState,i.updateQueue=o.updateQueue,i.type=o.type,e=o.dependencies,i.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return fe(ve,ve.current&1|2),t.child}e=e.sibling}i.tail!==null&&Se()>Qn&&(t.flags|=128,r=!0,_r(i,!1),t.lanes=4194304)}else{if(!r)if(e=gl(o),e!==null){if(t.flags|=128,r=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),_r(i,!0),i.tail===null&&i.tailMode==="hidden"&&!o.alternate&&!me)return He(t),null}else 2*Se()-i.renderingStartTime>Qn&&n!==1073741824&&(t.flags|=128,r=!0,_r(i,!1),t.lanes=4194304);i.isBackwards?(o.sibling=t.child,t.child=o):(n=i.last,n!==null?n.sibling=o:t.child=o,i.last=o)}return i.tail!==null?(t=i.tail,i.rendering=t,i.tail=t.sibling,i.renderingStartTime=Se(),t.sibling=null,n=ve.current,fe(ve,r?n&1|2:n&1),t):(He(t),null);case 22:case 23:return Ro(),r=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==r&&(t.flags|=8192),r&&(t.mode&1)!==0?(st&1073741824)!==0&&(He(t),t.subtreeFlags&6&&(t.flags|=8192)):He(t),null;case 24:return null;case 25:return null}throw Error(c(156,t.tag))}function If(e,t){switch(Ai(t),t.tag){case 1:return Je(t.type)&&ul(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Vn(),pe(qe),pe($e),qi(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 5:return Xi(t),null;case 13:if(pe(ve),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(c(340));Fn()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return pe(ve),null;case 4:return Vn(),null;case 10:return Hi(t.type._context),null;case 22:case 23:return Ro(),null;case 24:return null;default:return null}}var _l=!1,Qe=!1,Ff=typeof WeakSet=="function"?WeakSet:Set,z=null;function Wn(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){ke(e,t,r)}else n.current=null}function go(e,t,n){try{n()}catch(r){ke(e,t,r)}}var da=!1;function Af(e,t){if(Ti=Gr,e=Hu(),ki(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var l=r.anchorOffset,i=r.focusNode;r=r.focusOffset;try{n.nodeType,i.nodeType}catch{n=null;break e}var o=0,s=-1,a=-1,v=0,w=0,k=e,x=null;t:for(;;){for(var T;k!==n||l!==0&&k.nodeType!==3||(s=o+l),k!==i||r!==0&&k.nodeType!==3||(a=o+r),k.nodeType===3&&(o+=k.nodeValue.length),(T=k.firstChild)!==null;)x=k,k=T;for(;;){if(k===e)break t;if(x===n&&++v===l&&(s=o),x===i&&++w===r&&(a=o),(T=k.nextSibling)!==null)break;k=x,x=k.parentNode}k=T}n=s===-1||a===-1?null:{start:s,end:a}}else n=null}n=n||{start:0,end:0}}else n=null;for(Ri={focusedElem:e,selectionRange:n},Gr=!1,z=t;z!==null;)if(t=z,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,z=e;else for(;z!==null;){t=z;try{var L=t.alternate;if((t.flags&1024)!==0)switch(t.tag){case 0:case 11:case 15:break;case 1:if(L!==null){var O=L.memoizedProps,Ee=L.memoizedState,m=t.stateNode,d=m.getSnapshotBeforeUpdate(t.elementType===t.type?O:kt(t.type,O),Ee);m.__reactInternalSnapshotBeforeUpdate=d}break;case 3:var h=t.stateNode.containerInfo;h.nodeType===1?h.textContent="":h.nodeType===9&&h.documentElement&&h.removeChild(h.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(c(163))}}catch(N){ke(t,t.return,N)}if(e=t.sibling,e!==null){e.return=t.return,z=e;break}z=t.return}return L=da,da=!1,L}function Pr(e,t,n){var r=t.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var l=r=r.next;do{if((l.tag&e)===e){var i=l.destroy;l.destroy=void 0,i!==void 0&&go(t,n,i)}l=l.next}while(l!==r)}}function Pl(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var r=n.create;n.destroy=r()}n=n.next}while(n!==t)}}function xo(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function pa(e){var t=e.alternate;t!==null&&(e.alternate=null,pa(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[_t],delete t[yr],delete t[Di],delete t[wf],delete t[kf])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function ma(e){return e.tag===5||e.tag===3||e.tag===4}function ha(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||ma(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function wo(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=il));else if(r!==4&&(e=e.child,e!==null))for(wo(e,t,n),e=e.sibling;e!==null;)wo(e,t,n),e=e.sibling}function ko(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(r!==4&&(e=e.child,e!==null))for(ko(e,t,n),e=e.sibling;e!==null;)ko(e,t,n),e=e.sibling}var Ie=null,St=!1;function en(e,t,n){for(n=n.child;n!==null;)va(e,t,n),n=n.sibling}function va(e,t,n){if(jt&&typeof jt.onCommitFiberUnmount=="function")try{jt.onCommitFiberUnmount(Vr,n)}catch{}switch(n.tag){case 5:Qe||Wn(n,t);case 6:var r=Ie,l=St;Ie=null,en(e,t,n),Ie=r,St=l,Ie!==null&&(St?(e=Ie,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):Ie.removeChild(n.stateNode));break;case 18:Ie!==null&&(St?(e=Ie,n=n.stateNode,e.nodeType===8?Li(e.parentNode,n):e.nodeType===1&&Li(e,n),or(e)):Li(Ie,n.stateNode));break;case 4:r=Ie,l=St,Ie=n.stateNode.containerInfo,St=!0,en(e,t,n),Ie=r,St=l;break;case 0:case 11:case 14:case 15:if(!Qe&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){l=r=r.next;do{var i=l,o=i.destroy;i=i.tag,o!==void 0&&((i&2)!==0||(i&4)!==0)&&go(n,t,o),l=l.next}while(l!==r)}en(e,t,n);break;case 1:if(!Qe&&(Wn(n,t),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(s){ke(n,t,s)}en(e,t,n);break;case 21:en(e,t,n);break;case 22:n.mode&1?(Qe=(r=Qe)||n.memoizedState!==null,en(e,t,n),Qe=r):en(e,t,n);break;default:en(e,t,n)}}function ya(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new Ff),t.forEach(function(r){var l=Gf.bind(null,e,r);n.has(r)||(n.add(r),r.then(l,l))})}}function Et(e,t){var n=t.deletions;if(n!==null)for(var r=0;r<n.length;r++){var l=n[r];try{var i=e,o=t,s=o;e:for(;s!==null;){switch(s.tag){case 5:Ie=s.stateNode,St=!1;break e;case 3:Ie=s.stateNode.containerInfo,St=!0;break e;case 4:Ie=s.stateNode.containerInfo,St=!0;break e}s=s.return}if(Ie===null)throw Error(c(160));va(i,o,l),Ie=null,St=!1;var a=l.alternate;a!==null&&(a.return=null),l.return=null}catch(v){ke(l,t,v)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)ga(t,e),t=t.sibling}function ga(e,t){var n=e.alternate,r=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(Et(t,e),Rt(e),r&4){try{Pr(3,e,e.return),Pl(3,e)}catch(O){ke(e,e.return,O)}try{Pr(5,e,e.return)}catch(O){ke(e,e.return,O)}}break;case 1:Et(t,e),Rt(e),r&512&&n!==null&&Wn(n,n.return);break;case 5:if(Et(t,e),Rt(e),r&512&&n!==null&&Wn(n,n.return),e.flags&32){var l=e.stateNode;try{Xn(l,"")}catch(O){ke(e,e.return,O)}}if(r&4&&(l=e.stateNode,l!=null)){var i=e.memoizedProps,o=n!==null?n.memoizedProps:i,s=e.type,a=e.updateQueue;if(e.updateQueue=null,a!==null)try{s==="input"&&i.type==="radio"&&i.name!=null&&Yn(l,i),ql(s,o);var v=ql(s,i);for(o=0;o<a.length;o+=2){var w=a[o],k=a[o+1];w==="style"?eu(l,k):w==="dangerouslySetInnerHTML"?Jo(l,k):w==="children"?Xn(l,k):q(l,w,k,v)}switch(s){case"input":Sn(l,i);break;case"textarea":Xo(l,i);break;case"select":var x=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!i.multiple;var T=i.value;T!=null?Ct(l,!!i.multiple,T,!1):x!==!!i.multiple&&(i.defaultValue!=null?Ct(l,!!i.multiple,i.defaultValue,!0):Ct(l,!!i.multiple,i.multiple?[]:"",!1))}l[yr]=i}catch(O){ke(e,e.return,O)}}break;case 6:if(Et(t,e),Rt(e),r&4){if(e.stateNode===null)throw Error(c(162));l=e.stateNode,i=e.memoizedProps;try{l.nodeValue=i}catch(O){ke(e,e.return,O)}}break;case 3:if(Et(t,e),Rt(e),r&4&&n!==null&&n.memoizedState.isDehydrated)try{or(t.containerInfo)}catch(O){ke(e,e.return,O)}break;case 4:Et(t,e),Rt(e);break;case 13:Et(t,e),Rt(e),l=e.child,l.flags&8192&&(i=l.memoizedState!==null,l.stateNode.isHidden=i,!i||l.alternate!==null&&l.alternate.memoizedState!==null||(No=Se())),r&4&&ya(e);break;case 22:if(w=n!==null&&n.memoizedState!==null,e.mode&1?(Qe=(v=Qe)||w,Et(t,e),Qe=v):Et(t,e),Rt(e),r&8192){if(v=e.memoizedState!==null,(e.stateNode.isHidden=v)&&!w&&(e.mode&1)!==0)for(z=e,w=e.child;w!==null;){for(k=z=w;z!==null;){switch(x=z,T=x.child,x.tag){case 0:case 11:case 14:case 15:Pr(4,x,x.return);break;case 1:Wn(x,x.return);var L=x.stateNode;if(typeof L.componentWillUnmount=="function"){r=x,n=x.return;try{t=r,L.props=t.memoizedProps,L.state=t.memoizedState,L.componentWillUnmount()}catch(O){ke(r,n,O)}}break;case 5:Wn(x,x.return);break;case 22:if(x.memoizedState!==null){ka(k);continue}}T!==null?(T.return=x,z=T):ka(k)}w=w.sibling}e:for(w=null,k=e;;){if(k.tag===5){if(w===null){w=k;try{l=k.stateNode,v?(i=l.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none"):(s=k.stateNode,a=k.memoizedProps.style,o=a!=null&&a.hasOwnProperty("display")?a.display:null,s.style.display=bo("display",o))}catch(O){ke(e,e.return,O)}}}else if(k.tag===6){if(w===null)try{k.stateNode.nodeValue=v?"":k.memoizedProps}catch(O){ke(e,e.return,O)}}else if((k.tag!==22&&k.tag!==23||k.memoizedState===null||k===e)&&k.child!==null){k.child.return=k,k=k.child;continue}if(k===e)break e;for(;k.sibling===null;){if(k.return===null||k.return===e)break e;w===k&&(w=null),k=k.return}w===k&&(w=null),k.sibling.return=k.return,k=k.sibling}}break;case 19:Et(t,e),Rt(e),r&4&&ya(e);break;case 21:break;default:Et(t,e),Rt(e)}}function Rt(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(ma(n)){var r=n;break e}n=n.return}throw Error(c(160))}switch(r.tag){case 5:var l=r.stateNode;r.flags&32&&(Xn(l,""),r.flags&=-33);var i=ha(e);ko(e,i,l);break;case 3:case 4:var o=r.stateNode.containerInfo,s=ha(e);wo(e,s,o);break;default:throw Error(c(161))}}catch(a){ke(e,e.return,a)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function Uf(e,t,n){z=e,xa(e)}function xa(e,t,n){for(var r=(e.mode&1)!==0;z!==null;){var l=z,i=l.child;if(l.tag===22&&r){var o=l.memoizedState!==null||_l;if(!o){var s=l.alternate,a=s!==null&&s.memoizedState!==null||Qe;s=_l;var v=Qe;if(_l=o,(Qe=a)&&!v)for(z=l;z!==null;)o=z,a=o.child,o.tag===22&&o.memoizedState!==null?Sa(l):a!==null?(a.return=o,z=a):Sa(l);for(;i!==null;)z=i,xa(i),i=i.sibling;z=l,_l=s,Qe=v}wa(e)}else(l.subtreeFlags&8772)!==0&&i!==null?(i.return=l,z=i):wa(e)}}function wa(e){for(;z!==null;){var t=z;if((t.flags&8772)!==0){var n=t.alternate;try{if((t.flags&8772)!==0)switch(t.tag){case 0:case 11:case 15:Qe||Pl(5,t);break;case 1:var r=t.stateNode;if(t.flags&4&&!Qe)if(n===null)r.componentDidMount();else{var l=t.elementType===t.type?n.memoizedProps:kt(t.type,n.memoizedProps);r.componentDidUpdate(l,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var i=t.updateQueue;i!==null&&ks(t,i,r);break;case 3:var o=t.updateQueue;if(o!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}ks(t,o,n)}break;case 5:var s=t.stateNode;if(n===null&&t.flags&4){n=s;var a=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":a.autoFocus&&n.focus();break;case"img":a.src&&(n.src=a.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var v=t.alternate;if(v!==null){var w=v.memoizedState;if(w!==null){var k=w.dehydrated;k!==null&&or(k)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(c(163))}Qe||t.flags&512&&xo(t)}catch(x){ke(t,t.return,x)}}if(t===e){z=null;break}if(n=t.sibling,n!==null){n.return=t.return,z=n;break}z=t.return}}function ka(e){for(;z!==null;){var t=z;if(t===e){z=null;break}var n=t.sibling;if(n!==null){n.return=t.return,z=n;break}z=t.return}}function Sa(e){for(;z!==null;){var t=z;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{Pl(4,t)}catch(a){ke(t,n,a)}break;case 1:var r=t.stateNode;if(typeof r.componentDidMount=="function"){var l=t.return;try{r.componentDidMount()}catch(a){ke(t,l,a)}}var i=t.return;try{xo(t)}catch(a){ke(t,i,a)}break;case 5:var o=t.return;try{xo(t)}catch(a){ke(t,o,a)}}}catch(a){ke(t,t.return,a)}if(t===e){z=null;break}var s=t.sibling;if(s!==null){s.return=t.return,z=s;break}z=t.return}}var Bf=Math.ceil,Tl=ge.ReactCurrentDispatcher,So=ge.ReactCurrentOwner,ht=ge.ReactCurrentBatchConfig,te=0,ze=null,je=null,Fe=0,st=0,Hn=Xt(0),Pe=0,Tr=null,vn=0,Rl=0,Eo=0,Rr=null,et=null,No=0,Qn=1/0,Bt=null,zl=!1,Co=null,tn=null,Ml=!1,nn=null,Ll=0,zr=0,jo=null,Dl=-1,Ol=0;function Xe(){return(te&6)!==0?Se():Dl!==-1?Dl:Dl=Se()}function rn(e){return(e.mode&1)===0?1:(te&2)!==0&&Fe!==0?Fe&-Fe:Ef.transition!==null?(Ol===0&&(Ol=hu()),Ol):(e=ie,e!==0||(e=window.event,e=e===void 0?16:Nu(e.type)),e)}function Nt(e,t,n,r){if(50<zr)throw zr=0,jo=null,Error(c(185));tr(e,n,r),((te&2)===0||e!==ze)&&(e===ze&&((te&2)===0&&(Rl|=n),Pe===4&&ln(e,Fe)),tt(e,r),n===1&&te===0&&(t.mode&1)===0&&(Qn=Se()+500,al&&qt()))}function tt(e,t){var n=e.callbackNode;Sc(e,t);var r=Hr(e,e===ze?Fe:0);if(r===0)n!==null&&du(n),e.callbackNode=null,e.callbackPriority=0;else if(t=r&-r,e.callbackPriority!==t){if(n!=null&&du(n),t===1)e.tag===0?Sf(Na.bind(null,e)):as(Na.bind(null,e)),gf(function(){(te&6)===0&&qt()}),n=null;else{switch(vu(r)){case 1:n=li;break;case 4:n=pu;break;case 16:n=Br;break;case 536870912:n=mu;break;default:n=Br}n=Ma(n,Ea.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Ea(e,t){if(Dl=-1,Ol=0,(te&6)!==0)throw Error(c(327));var n=e.callbackNode;if(Kn()&&e.callbackNode!==n)return null;var r=Hr(e,e===ze?Fe:0);if(r===0)return null;if((r&30)!==0||(r&e.expiredLanes)!==0||t)t=Il(e,r);else{t=r;var l=te;te|=2;var i=ja();(ze!==e||Fe!==t)&&(Bt=null,Qn=Se()+500,gn(e,t));do try{Wf();break}catch(s){Ca(e,s)}while(!0);Wi(),Tl.current=i,te=l,je!==null?t=0:(ze=null,Fe=0,t=Pe)}if(t!==0){if(t===2&&(l=ii(e),l!==0&&(r=l,t=_o(e,l))),t===1)throw n=Tr,gn(e,0),ln(e,r),tt(e,Se()),n;if(t===6)ln(e,r);else{if(l=e.current.alternate,(r&30)===0&&!Vf(l)&&(t=Il(e,r),t===2&&(i=ii(e),i!==0&&(r=i,t=_o(e,i))),t===1))throw n=Tr,gn(e,0),ln(e,r),tt(e,Se()),n;switch(e.finishedWork=l,e.finishedLanes=r,t){case 0:case 1:throw Error(c(345));case 2:xn(e,et,Bt);break;case 3:if(ln(e,r),(r&130023424)===r&&(t=No+500-Se(),10<t)){if(Hr(e,0)!==0)break;if(l=e.suspendedLanes,(l&r)!==r){Xe(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=Mi(xn.bind(null,e,et,Bt),t);break}xn(e,et,Bt);break;case 4:if(ln(e,r),(r&4194240)===r)break;for(t=e.eventTimes,l=-1;0<r;){var o=31-gt(r);i=1<<o,o=t[o],o>l&&(l=o),r&=~i}if(r=l,r=Se()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Bf(r/1960))-r,10<r){e.timeoutHandle=Mi(xn.bind(null,e,et,Bt),r);break}xn(e,et,Bt);break;case 5:xn(e,et,Bt);break;default:throw Error(c(329))}}}return tt(e,Se()),e.callbackNode===n?Ea.bind(null,e):null}function _o(e,t){var n=Rr;return e.current.memoizedState.isDehydrated&&(gn(e,t).flags|=256),e=Il(e,t),e!==2&&(t=et,et=n,t!==null&&Po(t)),e}function Po(e){et===null?et=e:et.push.apply(et,e)}function Vf(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var l=n[r],i=l.getSnapshot;l=l.value;try{if(!xt(i(),l))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function ln(e,t){for(t&=~Eo,t&=~Rl,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-gt(t),r=1<<n;e[n]=-1,t&=~r}}function Na(e){if((te&6)!==0)throw Error(c(327));Kn();var t=Hr(e,0);if((t&1)===0)return tt(e,Se()),null;var n=Il(e,t);if(e.tag!==0&&n===2){var r=ii(e);r!==0&&(t=r,n=_o(e,r))}if(n===1)throw n=Tr,gn(e,0),ln(e,t),tt(e,Se()),n;if(n===6)throw Error(c(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,xn(e,et,Bt),tt(e,Se()),null}function To(e,t){var n=te;te|=1;try{return e(t)}finally{te=n,te===0&&(Qn=Se()+500,al&&qt())}}function yn(e){nn!==null&&nn.tag===0&&(te&6)===0&&Kn();var t=te;te|=1;var n=ht.transition,r=ie;try{if(ht.transition=null,ie=1,e)return e()}finally{ie=r,ht.transition=n,te=t,(te&6)===0&&qt()}}function Ro(){st=Hn.current,pe(Hn)}function gn(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,yf(n)),je!==null)for(n=je.return;n!==null;){var r=n;switch(Ai(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&ul();break;case 3:Vn(),pe(qe),pe($e),qi();break;case 5:Xi(r);break;case 4:Vn();break;case 13:pe(ve);break;case 19:pe(ve);break;case 10:Hi(r.type._context);break;case 22:case 23:Ro()}n=n.return}if(ze=e,je=e=on(e.current,null),Fe=st=t,Pe=0,Tr=null,Eo=Rl=vn=0,et=Rr=null,pn!==null){for(t=0;t<pn.length;t++)if(n=pn[t],r=n.interleaved,r!==null){n.interleaved=null;var l=r.next,i=n.pending;if(i!==null){var o=i.next;i.next=l,r.next=o}n.pending=r}pn=null}return e}function Ca(e,t){do{var n=je;try{if(Wi(),xl.current=El,wl){for(var r=ye.memoizedState;r!==null;){var l=r.queue;l!==null&&(l.pending=null),r=r.next}wl=!1}if(hn=0,Re=_e=ye=null,Er=!1,Nr=0,So.current=null,n===null||n.return===null){Pe=1,Tr=t,je=null;break}e:{var i=e,o=n.return,s=n,a=t;if(t=Fe,s.flags|=32768,a!==null&&typeof a=="object"&&typeof a.then=="function"){var v=a,w=s,k=w.tag;if((w.mode&1)===0&&(k===0||k===11||k===15)){var x=w.alternate;x?(w.updateQueue=x.updateQueue,w.memoizedState=x.memoizedState,w.lanes=x.lanes):(w.updateQueue=null,w.memoizedState=null)}var T=Zs(o);if(T!==null){T.flags&=-257,qs(T,o,s,i,t),T.mode&1&&Xs(i,v,t),t=T,a=v;var L=t.updateQueue;if(L===null){var O=new Set;O.add(a),t.updateQueue=O}else L.add(a);break e}else{if((t&1)===0){Xs(i,v,t),zo();break e}a=Error(c(426))}}else if(me&&s.mode&1){var Ee=Zs(o);if(Ee!==null){(Ee.flags&65536)===0&&(Ee.flags|=256),qs(Ee,o,s,i,t),Vi($n(a,s));break e}}i=a=$n(a,s),Pe!==4&&(Pe=2),Rr===null?Rr=[i]:Rr.push(i),i=o;do{switch(i.tag){case 3:i.flags|=65536,t&=-t,i.lanes|=t;var m=Gs(i,a,t);ws(i,m);break e;case 1:s=a;var d=i.type,h=i.stateNode;if((i.flags&128)===0&&(typeof d.getDerivedStateFromError=="function"||h!==null&&typeof h.componentDidCatch=="function"&&(tn===null||!tn.has(h)))){i.flags|=65536,t&=-t,i.lanes|=t;var N=Ys(i,s,t);ws(i,N);break e}}i=i.return}while(i!==null)}Pa(n)}catch(F){t=F,je===n&&n!==null&&(je=n=n.return);continue}break}while(!0)}function ja(){var e=Tl.current;return Tl.current=El,e===null?El:e}function zo(){(Pe===0||Pe===3||Pe===2)&&(Pe=4),ze===null||(vn&268435455)===0&&(Rl&268435455)===0||ln(ze,Fe)}function Il(e,t){var n=te;te|=2;var r=ja();(ze!==e||Fe!==t)&&(Bt=null,gn(e,t));do try{$f();break}catch(l){Ca(e,l)}while(!0);if(Wi(),te=n,Tl.current=r,je!==null)throw Error(c(261));return ze=null,Fe=0,Pe}function $f(){for(;je!==null;)_a(je)}function Wf(){for(;je!==null&&!pc();)_a(je)}function _a(e){var t=za(e.alternate,e,st);e.memoizedProps=e.pendingProps,t===null?Pa(e):je=t,So.current=null}function Pa(e){var t=e;do{var n=t.alternate;if(e=t.return,(t.flags&32768)===0){if(n=Of(n,t,st),n!==null){je=n;return}}else{if(n=If(n,t),n!==null){n.flags&=32767,je=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{Pe=6,je=null;return}}if(t=t.sibling,t!==null){je=t;return}je=t=e}while(t!==null);Pe===0&&(Pe=5)}function xn(e,t,n){var r=ie,l=ht.transition;try{ht.transition=null,ie=1,Hf(e,t,n,r)}finally{ht.transition=l,ie=r}return null}function Hf(e,t,n,r){do Kn();while(nn!==null);if((te&6)!==0)throw Error(c(327));n=e.finishedWork;var l=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(c(177));e.callbackNode=null,e.callbackPriority=0;var i=n.lanes|n.childLanes;if(Ec(e,i),e===ze&&(je=ze=null,Fe=0),(n.subtreeFlags&2064)===0&&(n.flags&2064)===0||Ml||(Ml=!0,Ma(Br,function(){return Kn(),null})),i=(n.flags&15990)!==0,(n.subtreeFlags&15990)!==0||i){i=ht.transition,ht.transition=null;var o=ie;ie=1;var s=te;te|=4,So.current=null,Af(e,n),ga(n,e),cf(Ri),Gr=!!Ti,Ri=Ti=null,e.current=n,Uf(n),mc(),te=s,ie=o,ht.transition=i}else e.current=n;if(Ml&&(Ml=!1,nn=e,Ll=l),i=e.pendingLanes,i===0&&(tn=null),yc(n.stateNode),tt(e,Se()),t!==null)for(r=e.onRecoverableError,n=0;n<t.length;n++)l=t[n],r(l.value,{componentStack:l.stack,digest:l.digest});if(zl)throw zl=!1,e=Co,Co=null,e;return(Ll&1)!==0&&e.tag!==0&&Kn(),i=e.pendingLanes,(i&1)!==0?e===jo?zr++:(zr=0,jo=e):zr=0,qt(),null}function Kn(){if(nn!==null){var e=vu(Ll),t=ht.transition,n=ie;try{if(ht.transition=null,ie=16>e?16:e,nn===null)var r=!1;else{if(e=nn,nn=null,Ll=0,(te&6)!==0)throw Error(c(331));var l=te;for(te|=4,z=e.current;z!==null;){var i=z,o=i.child;if((z.flags&16)!==0){var s=i.deletions;if(s!==null){for(var a=0;a<s.length;a++){var v=s[a];for(z=v;z!==null;){var w=z;switch(w.tag){case 0:case 11:case 15:Pr(8,w,i)}var k=w.child;if(k!==null)k.return=w,z=k;else for(;z!==null;){w=z;var x=w.sibling,T=w.return;if(pa(w),w===v){z=null;break}if(x!==null){x.return=T,z=x;break}z=T}}}var L=i.alternate;if(L!==null){var O=L.child;if(O!==null){L.child=null;do{var Ee=O.sibling;O.sibling=null,O=Ee}while(O!==null)}}z=i}}if((i.subtreeFlags&2064)!==0&&o!==null)o.return=i,z=o;else e:for(;z!==null;){if(i=z,(i.flags&2048)!==0)switch(i.tag){case 0:case 11:case 15:Pr(9,i,i.return)}var m=i.sibling;if(m!==null){m.return=i.return,z=m;break e}z=i.return}}var d=e.current;for(z=d;z!==null;){o=z;var h=o.child;if((o.subtreeFlags&2064)!==0&&h!==null)h.return=o,z=h;else e:for(o=d;z!==null;){if(s=z,(s.flags&2048)!==0)try{switch(s.tag){case 0:case 11:case 15:Pl(9,s)}}catch(F){ke(s,s.return,F)}if(s===o){z=null;break e}var N=s.sibling;if(N!==null){N.return=s.return,z=N;break e}z=s.return}}if(te=l,qt(),jt&&typeof jt.onPostCommitFiberRoot=="function")try{jt.onPostCommitFiberRoot(Vr,e)}catch{}r=!0}return r}finally{ie=n,ht.transition=t}}return!1}function Ta(e,t,n){t=$n(n,t),t=Gs(e,t,1),e=bt(e,t,1),t=Xe(),e!==null&&(tr(e,1,t),tt(e,t))}function ke(e,t,n){if(e.tag===3)Ta(e,e,n);else for(;t!==null;){if(t.tag===3){Ta(t,e,n);break}else if(t.tag===1){var r=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(tn===null||!tn.has(r))){e=$n(n,e),e=Ys(t,e,1),t=bt(t,e,1),e=Xe(),t!==null&&(tr(t,1,e),tt(t,e));break}}t=t.return}}function Qf(e,t,n){var r=e.pingCache;r!==null&&r.delete(t),t=Xe(),e.pingedLanes|=e.suspendedLanes&n,ze===e&&(Fe&n)===n&&(Pe===4||Pe===3&&(Fe&130023424)===Fe&&500>Se()-No?gn(e,0):Eo|=n),tt(e,t)}function Ra(e,t){t===0&&((e.mode&1)===0?t=1:(t=Wr,Wr<<=1,(Wr&130023424)===0&&(Wr=4194304)));var n=Xe();e=Ft(e,t),e!==null&&(tr(e,t,n),tt(e,n))}function Kf(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Ra(e,n)}function Gf(e,t){var n=0;switch(e.tag){case 13:var r=e.stateNode,l=e.memoizedState;l!==null&&(n=l.retryLane);break;case 19:r=e.stateNode;break;default:throw Error(c(314))}r!==null&&r.delete(t),Ra(e,n)}var za;za=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||qe.current)be=!0;else{if((e.lanes&n)===0&&(t.flags&128)===0)return be=!1,Df(e,t,n);be=(e.flags&131072)!==0}else be=!1,me&&(t.flags&1048576)!==0&&cs(t,fl,t.index);switch(t.lanes=0,t.tag){case 2:var r=t.type;jl(e,t),e=t.pendingProps;var l=Dn(t,$e.current);Bn(t,n),l=eo(null,t,r,e,l,n);var i=to();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Je(r)?(i=!0,sl(t)):i=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,Gi(t),l.updater=Nl,t.stateNode=l,l._reactInternals=t,uo(t,r,e,n),t=fo(null,t,r,!0,i,n)):(t.tag=0,me&&i&&Fi(t),Ye(null,t,l,n),t=t.child),t;case 16:r=t.elementType;e:{switch(jl(e,t),e=t.pendingProps,l=r._init,r=l(r._payload),t.type=r,l=t.tag=Xf(r),e=kt(r,e),l){case 0:t=co(null,t,r,e,n);break e;case 1:t=ra(null,t,r,e,n);break e;case 11:t=Js(null,t,r,e,n);break e;case 14:t=bs(null,t,r,kt(r.type,e),n);break e}throw Error(c(306,r,""))}return t;case 0:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:kt(r,l),co(e,t,r,l,n);case 1:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:kt(r,l),ra(e,t,r,l,n);case 3:e:{if(la(t),e===null)throw Error(c(387));r=t.pendingProps,i=t.memoizedState,l=i.element,xs(e,t),yl(t,r,null,n);var o=t.memoizedState;if(r=o.element,i.isDehydrated)if(i={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},t.updateQueue.baseState=i,t.memoizedState=i,t.flags&256){l=$n(Error(c(423)),t),t=ia(e,t,r,n,l);break e}else if(r!==l){l=$n(Error(c(424)),t),t=ia(e,t,r,n,l);break e}else for(ut=Yt(t.stateNode.containerInfo.firstChild),ot=t,me=!0,wt=null,n=ys(t,null,r,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Fn(),r===l){t=Ut(e,t,n);break e}Ye(e,t,r,n)}t=t.child}return t;case 5:return Ss(t),e===null&&Bi(t),r=t.type,l=t.pendingProps,i=e!==null?e.memoizedProps:null,o=l.children,zi(r,l)?o=null:i!==null&&zi(r,i)&&(t.flags|=32),na(e,t),Ye(e,t,o,n),t.child;case 6:return e===null&&Bi(t),null;case 13:return oa(e,t,n);case 4:return Yi(t,t.stateNode.containerInfo),r=t.pendingProps,e===null?t.child=An(t,null,r,n):Ye(e,t,r,n),t.child;case 11:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:kt(r,l),Js(e,t,r,l,n);case 7:return Ye(e,t,t.pendingProps,n),t.child;case 8:return Ye(e,t,t.pendingProps.children,n),t.child;case 12:return Ye(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(r=t.type._context,l=t.pendingProps,i=t.memoizedProps,o=l.value,fe(ml,r._currentValue),r._currentValue=o,i!==null)if(xt(i.value,o)){if(i.children===l.children&&!qe.current){t=Ut(e,t,n);break e}}else for(i=t.child,i!==null&&(i.return=t);i!==null;){var s=i.dependencies;if(s!==null){o=i.child;for(var a=s.firstContext;a!==null;){if(a.context===r){if(i.tag===1){a=At(-1,n&-n),a.tag=2;var v=i.updateQueue;if(v!==null){v=v.shared;var w=v.pending;w===null?a.next=a:(a.next=w.next,w.next=a),v.pending=a}}i.lanes|=n,a=i.alternate,a!==null&&(a.lanes|=n),Qi(i.return,n,t),s.lanes|=n;break}a=a.next}}else if(i.tag===10)o=i.type===t.type?null:i.child;else if(i.tag===18){if(o=i.return,o===null)throw Error(c(341));o.lanes|=n,s=o.alternate,s!==null&&(s.lanes|=n),Qi(o,n,t),o=i.sibling}else o=i.child;if(o!==null)o.return=i;else for(o=i;o!==null;){if(o===t){o=null;break}if(i=o.sibling,i!==null){i.return=o.return,o=i;break}o=o.return}i=o}Ye(e,t,l.children,n),t=t.child}return t;case 9:return l=t.type,r=t.pendingProps.children,Bn(t,n),l=pt(l),r=r(l),t.flags|=1,Ye(e,t,r,n),t.child;case 14:return r=t.type,l=kt(r,t.pendingProps),l=kt(r.type,l),bs(e,t,r,l,n);case 15:return ea(e,t,t.type,t.pendingProps,n);case 17:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:kt(r,l),jl(e,t),t.tag=1,Je(r)?(e=!0,sl(t)):e=!1,Bn(t,n),Qs(t,r,l),uo(t,r,l,n),fo(null,t,r,!0,e,n);case 19:return sa(e,t,n);case 22:return ta(e,t,n)}throw Error(c(156,t.tag))};function Ma(e,t){return fu(e,t)}function Yf(e,t,n,r){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function vt(e,t,n,r){return new Yf(e,t,n,r)}function Mo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Xf(e){if(typeof e=="function")return Mo(e)?1:0;if(e!=null){if(e=e.$$typeof,e===Ke)return 11;if(e===lt)return 14}return 2}function on(e,t){var n=e.alternate;return n===null?(n=vt(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function Fl(e,t,n,r,l,i){var o=2;if(r=e,typeof e=="function")Mo(e)&&(o=1);else if(typeof e=="string")o=5;else e:switch(e){case Ce:return wn(n.children,l,i,t);case De:o=8,l|=8;break;case at:return e=vt(12,n,t,l|2),e.elementType=at,e.lanes=i,e;case Te:return e=vt(13,n,t,l),e.elementType=Te,e.lanes=i,e;case Ge:return e=vt(19,n,t,l),e.elementType=Ge,e.lanes=i,e;case le:return Al(n,l,i,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Oe:o=10;break e;case Ue:o=9;break e;case Ke:o=11;break e;case lt:o=14;break e;case we:o=16,r=null;break e}throw Error(c(130,e==null?e:typeof e,""))}return t=vt(o,n,t,l),t.elementType=e,t.type=r,t.lanes=i,t}function wn(e,t,n,r){return e=vt(7,e,r,t),e.lanes=n,e}function Al(e,t,n,r){return e=vt(22,e,r,t),e.elementType=le,e.lanes=n,e.stateNode={isHidden:!1},e}function Lo(e,t,n){return e=vt(6,e,null,t),e.lanes=n,e}function Do(e,t,n){return t=vt(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Zf(e,t,n,r,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=oi(0),this.expirationTimes=oi(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=oi(0),this.identifierPrefix=r,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function Oo(e,t,n,r,l,i,o,s,a){return e=new Zf(e,t,n,s,a),t===1?(t=1,i===!0&&(t|=8)):t=0,i=vt(3,null,null,t),e.current=i,i.stateNode=e,i.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},Gi(i),e}function qf(e,t,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:xe,key:r==null?null:""+r,children:e,containerInfo:t,implementation:n}}function La(e){if(!e)return Zt;e=e._reactInternals;e:{if(sn(e)!==e||e.tag!==1)throw Error(c(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Je(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(c(171))}if(e.tag===1){var n=e.type;if(Je(n))return us(e,n,t)}return t}function Da(e,t,n,r,l,i,o,s,a){return e=Oo(n,r,!0,e,l,i,o,s,a),e.context=La(null),n=e.current,r=Xe(),l=rn(n),i=At(r,l),i.callback=t??null,bt(n,i,l),e.current.lanes=l,tr(e,l,r),tt(e,r),e}function Ul(e,t,n,r){var l=t.current,i=Xe(),o=rn(l);return n=La(n),t.context===null?t.context=n:t.pendingContext=n,t=At(i,o),t.payload={element:e},r=r===void 0?null:r,r!==null&&(t.callback=r),e=bt(l,t,o),e!==null&&(Nt(e,l,o,i),vl(e,l,o)),o}function Bl(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Oa(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Io(e,t){Oa(e,t),(e=e.alternate)&&Oa(e,t)}function Jf(){return null}var Ia=typeof reportError=="function"?reportError:function(e){console.error(e)};function Fo(e){this._internalRoot=e}Vl.prototype.render=Fo.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(c(409));Ul(e,t,null,null)},Vl.prototype.unmount=Fo.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;yn(function(){Ul(null,e,null,null)}),t[Lt]=null}};function Vl(e){this._internalRoot=e}Vl.prototype.unstable_scheduleHydration=function(e){if(e){var t=xu();e={blockedOn:null,target:e,priority:t};for(var n=0;n<Qt.length&&t!==0&&t<Qt[n].priority;n++);Qt.splice(n,0,e),n===0&&Su(e)}};function Ao(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function $l(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Fa(){}function bf(e,t,n,r,l){if(l){if(typeof r=="function"){var i=r;r=function(){var v=Bl(o);i.call(v)}}var o=Da(t,r,e,0,null,!1,!1,"",Fa);return e._reactRootContainer=o,e[Lt]=o.current,hr(e.nodeType===8?e.parentNode:e),yn(),o}for(;l=e.lastChild;)e.removeChild(l);if(typeof r=="function"){var s=r;r=function(){var v=Bl(a);s.call(v)}}var a=Oo(e,0,!1,null,null,!1,!1,"",Fa);return e._reactRootContainer=a,e[Lt]=a.current,hr(e.nodeType===8?e.parentNode:e),yn(function(){Ul(t,a,n,r)}),a}function Wl(e,t,n,r,l){var i=n._reactRootContainer;if(i){var o=i;if(typeof l=="function"){var s=l;l=function(){var a=Bl(o);s.call(a)}}Ul(t,o,e,l)}else o=bf(n,t,e,l,r);return Bl(o)}yu=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=er(t.pendingLanes);n!==0&&(ui(t,n|1),tt(t,Se()),(te&6)===0&&(Qn=Se()+500,qt()))}break;case 13:yn(function(){var r=Ft(e,1);if(r!==null){var l=Xe();Nt(r,e,1,l)}}),Io(e,1)}},si=function(e){if(e.tag===13){var t=Ft(e,134217728);if(t!==null){var n=Xe();Nt(t,e,134217728,n)}Io(e,134217728)}},gu=function(e){if(e.tag===13){var t=rn(e),n=Ft(e,t);if(n!==null){var r=Xe();Nt(n,e,t,r)}Io(e,t)}},xu=function(){return ie},wu=function(e,t){var n=ie;try{return ie=e,t()}finally{ie=n}},ei=function(e,t,n){switch(t){case"input":if(Sn(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var r=n[t];if(r!==e&&r.form===e.form){var l=ol(r);if(!l)throw Error(c(90));ue(r),Sn(r,l)}}}break;case"textarea":Xo(e,n);break;case"select":t=n.value,t!=null&&Ct(e,!!n.multiple,t,!1)}},lu=To,iu=yn;var ed={usingClientEntryPoint:!1,Events:[gr,Mn,ol,nu,ru,To]},Mr={findFiberByHostInstance:an,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},td={bundleType:Mr.bundleType,version:Mr.version,rendererPackageName:Mr.rendererPackageName,rendererConfig:Mr.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:ge.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=au(e),e===null?null:e.stateNode},findFiberByHostInstance:Mr.findFiberByHostInstance||Jf,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Hl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Hl.isDisabled&&Hl.supportsFiber)try{Vr=Hl.inject(td),jt=Hl}catch{}}return nt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ed,nt.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Ao(t))throw Error(c(200));return qf(e,t,null,n)},nt.createRoot=function(e,t){if(!Ao(e))throw Error(c(299));var n=!1,r="",l=Ia;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(r=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=Oo(e,1,!1,null,null,n,!1,r,l),e[Lt]=t.current,hr(e.nodeType===8?e.parentNode:e),new Fo(t)},nt.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(c(188)):(e=Object.keys(e).join(","),Error(c(268,e)));return e=au(t),e=e===null?null:e.stateNode,e},nt.flushSync=function(e){return yn(e)},nt.hydrate=function(e,t,n){if(!$l(t))throw Error(c(200));return Wl(null,e,t,!0,n)},nt.hydrateRoot=function(e,t,n){if(!Ao(e))throw Error(c(405));var r=n!=null&&n.hydratedSources||null,l=!1,i="",o=Ia;if(n!=null&&(n.unstable_strictMode===!0&&(l=!0),n.identifierPrefix!==void 0&&(i=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),t=Da(t,null,e,1,n??null,l,!1,i,o),e[Lt]=t.current,hr(e),r)for(e=0;e<r.length;e++)n=r[e],l=n._getVersion,l=l(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,l]:t.mutableSourceEagerHydrationData.push(n,l);return new Vl(t)},nt.render=function(e,t,n){if(!$l(t))throw Error(c(200));return Wl(null,e,t,!1,n)},nt.unmountComponentAtNode=function(e){if(!$l(e))throw Error(c(40));return e._reactRootContainer?(yn(function(){Wl(null,null,e,!1,function(){e._reactRootContainer=null,e[Lt]=null})}),!0):!1},nt.unstable_batchedUpdates=To,nt.unstable_renderSubtreeIntoContainer=function(e,t,n,r){if(!$l(n))throw Error(c(200));if(e==null||e._reactInternals===void 0)throw Error(c(38));return Wl(e,t,n,!1,r)},nt.version="18.3.1-next-f1338f8080-20240426",nt}var Qa;function cd(){if(Qa)return Vo.exports;Qa=1;function u(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(u)}catch(y){console.error(y)}}return u(),Vo.exports=ad(),Vo.exports}var Ka;function fd(){if(Ka)return Ql;Ka=1;var u=cd();return Ql.createRoot=u.createRoot,Ql.hydrateRoot=u.hydrateRoot,Ql}var dd=fd();const pd=rd(dd);var ee=Ko();const Dr=21,Or=21,md=5,hd=6500,Vt={chill:{label:"Chill",base:150,min:96,blurb:"A lazy garden snake.",dots:1},classic:{label:"Classic",base:105,min:66,blurb:"The arcade standard.",dots:2},turbo:{label:"Turbo",base:72,min:46,blurb:"A caffeinated viper.",dots:3}},Ho=["chill","classic","turbo"];function Ga(u,y){const{base:c,min:C}=Vt[u];return Math.max(C,Math.round(c*Math.pow(.99,y)))}function vd(u,y,c){return u.some(C=>C.x===y&&C.y===c)}function Qo(u){const y=[];for(let c=0;c<Or;c++)for(let C=0;C<Dr;C++)vd(u,C,c)||y.push({x:C,y:c});return y.length===0?{x:0,y:0}:y[Math.floor(Math.random()*y.length)]}function Ya(){const u=Math.floor(Or/2),y=[{x:8,y:u},{x:7,y:u},{x:6,y:u}];return{snake:y,prev:y.map(c=>({...c})),dir:{x:1,y:0},queue:[],food:Qo(y),golden:null,eaten:0,acc:0,last:0,lastEatAt:-99999,deathAt:0,shake:0,particles:[],floaters:[]}}function yd(u,y){for(;u.queue.length;){const I=u.queue.shift(),W=I.x===u.dir.x&&I.y===u.dir.y,H=I.x===-u.dir.x&&I.y===-u.dir.y;if(!W&&!H){u.dir=I;break}}const c=u.snake[0],C=c.x+u.dir.x,E=c.y+u.dir.y;if(C<0||E<0||C>=Dr||E>=Or)return{died:!0,ate:!1,gold:!1};const D=C===u.food.x&&E===u.food.y,M=D?u.snake:u.snake.slice(0,-1);if(M.some(I=>I.x===C&&I.y===E))return{died:!0,ate:!1,gold:!1};const S=u.snake.map(I=>({...I}));D&&S.push({...S[S.length-1]});const U=[{x:C,y:E},...M];u.prev=S,u.snake=U;let P=!1;return D&&(u.eaten+=1,u.lastEatAt=y,u.food=Qo(u.snake),u.eaten%md===0&&!u.golden&&(u.golden={cell:Qo([...u.snake,u.food]),expires:y+hd})),u.golden&&(C===u.golden.cell.x&&E===u.golden.cell.y?(P=!0,u.lastEatAt=y,u.golden=null):y>=u.golden.expires&&(u.golden=null)),{died:!1,ate:D,gold:P}}function gd(u,y){if(u.particles.length){const c=Math.pow(.985,y/16);u.particles=u.particles.filter(C=>(C.life-=y)>0);for(const C of u.particles)C.x+=C.vx*y,C.y+=C.vy*y,C.vx*=c,C.vy*=c}if(u.floaters.length){u.floaters=u.floaters.filter(c=>(c.life-=y)>0);for(const c of u.floaters)c.y-=.0016*y}}function Xa(u,y,c,C=14){for(let E=0;E<C;E++){const D=Math.random()*Math.PI*2,M=.003+Math.random()*.009,S=420+Math.random()*380;u.particles.push({x:y.x+.5,y:y.y+.5,vx:Math.cos(D)*M,vy:Math.sin(D)*M,life:S,maxLife:S,size:.06+Math.random()*.09,color:c[Math.floor(Math.random()*c.length)]})}}const Za=[172,246,100],qa=[21,102,68];function Ja(u,y,c){const C=Math.round(u[0]+(y[0]-u[0])*c),E=Math.round(u[1]+(y[1]-u[1])*c),D=Math.round(u[2]+(y[2]-u[2])*c);return`rgb(${C},${E},${D})`}function ba(u,y,c,C={}){const E=y.length;if(E<2)return;const D=C.alpha??1;u.save(),u.globalAlpha=D,u.lineCap="round",u.lineJoin="round",u.beginPath(),u.moveTo(y[E-1].x,y[E-1].y);for(let Q=E-2;Q>=0;Q--)u.lineTo(y[Q].x,y[Q].y);u.strokeStyle="rgba(4,20,12,0.95)",u.lineWidth=c*.8,u.stroke();for(let Q=E-1;Q>0;Q--){const ce=1-Q/(E-1);u.strokeStyle=Ja(qa,Za,ce),u.lineWidth=c*(.42+.26*ce),u.beginPath(),u.moveTo(y[Q].x,y[Q].y),u.lineTo(y[Q-1].x,y[Q-1].y),u.stroke()}const M=y[0];let S=1,U=0;const P=M.x-y[1].x,I=M.y-y[1].y,W=Math.hypot(P,I);W>.001&&(S=P/W,U=I/W);const H=-U,oe=S;if(u.shadowColor="rgba(172,246,100,0.5)",u.shadowBlur=c*.55,u.fillStyle=Ja(qa,Za,1),u.beginPath(),u.arc(M.x,M.y,c*.42,0,Math.PI*2),u.fill(),u.shadowBlur=0,C.tongue){u.strokeStyle="#ff6b6b",u.lineWidth=Math.max(1.5,c*.06);const Q=M.x+S*c*.4,ce=M.y+U*c*.4,Z=M.x+S*c*.78,q=M.y+U*c*.78;u.beginPath(),u.moveTo(Q,ce),u.lineTo(Z,q),u.moveTo(Z,q),u.lineTo(Z+(S*.5+H*.5)*c*.14,q+(U*.5+oe*.5)*c*.14),u.moveTo(Z,q),u.lineTo(Z+(S*.5-H*.5)*c*.14,q+(U*.5-oe*.5)*c*.14),u.stroke()}const Ne=c*.165,ne=c*.1;for(const Q of[1,-1]){const ce=M.x+S*ne+H*Ne*Q,Z=M.y+U*ne+oe*Ne*Q;if(u.fillStyle="#f2fff0",u.beginPath(),u.arc(ce,Z,c*.105,0,Math.PI*2),u.fill(),C.dead){u.strokeStyle="#0d2818",u.lineWidth=Math.max(1,c*.045);const q=c*.07;u.beginPath(),u.moveTo(ce-q,Z-q),u.lineTo(ce+q,Z+q),u.moveTo(ce+q,Z-q),u.lineTo(ce-q,Z+q),u.stroke()}else u.fillStyle="#0d2818",u.beginPath(),u.arc(ce+S*c*.038,Z+U*c*.038,c*.055,0,Math.PI*2),u.fill()}u.restore()}function Kl(u,y,c,C,E,D,M){let S=1;D&&M!==void 0&&M<1600&&(S=Math.sin(E/70)>0?1:.28);const U=1+.08*Math.sin(E/(D?200:300)),P=C*(D?.34:.3)*U;u.save(),u.globalAlpha=S,u.shadowColor=D?"rgba(255,200,87,0.85)":"rgba(255,93,93,0.7)",u.shadowBlur=C*.9;const I=u.createRadialGradient(y-P*.35,c-P*.4,P*.15,y,c,P);if(D?(I.addColorStop(0,"#fff3c4"),I.addColorStop(.55,"#ffd166"),I.addColorStop(1,"#e8912d")):(I.addColorStop(0,"#ffb3ab"),I.addColorStop(.5,"#ff6b6b"),I.addColorStop(1,"#c92f3f")),u.fillStyle=I,u.beginPath(),u.arc(y,c,P,0,Math.PI*2),u.fill(),u.shadowBlur=0,u.strokeStyle="#7a4a21",u.lineWidth=Math.max(1.5,C*.06),u.lineCap="round",u.beginPath(),u.moveTo(y,c-P),u.lineTo(y+P*.15,c-P-C*.14),u.stroke(),u.fillStyle=D?"#ffe08a":"#59c96a",u.beginPath(),u.ellipse(y+P*.48,c-P-C*.1,C*.13,C*.06,-.6,0,Math.PI*2),u.fill(),u.fillStyle="rgba(255,255,255,0.5)",u.beginPath(),u.arc(y-P*.35,c-P*.42,P*.16,0,Math.PI*2),u.fill(),D){u.strokeStyle="rgba(255,224,138,0.85)",u.lineWidth=Math.max(1,C*.045);const W=E/700;for(let H=0;H<4;H++){const oe=W+H*Math.PI/2;u.beginPath(),u.moveTo(y+Math.cos(oe)*P*1.4,c+Math.sin(oe)*P*1.4),u.lineTo(y+Math.cos(oe)*P*1.8,c+Math.sin(oe)*P*1.8),u.stroke()}}u.restore()}function xd(u,y,c,C,E,D,M){if(c<10||C<10)return;const S=c/Dr;u.fillStyle="#0a1a11",u.fillRect(0,0,c,C),u.fillStyle="rgba(172,246,100,0.025)";for(let P=0;P<Or;P++)for(let I=0;I<Dr;I++)I+P&1&&u.fillRect(I*S,P*S,S,S);if(u.strokeStyle="rgba(172,246,100,0.07)",u.lineWidth=2,u.strokeRect(1,1,c-2,C-2),u.save(),y.shake>.3?(u.translate((Math.random()-.5)*y.shake,(Math.random()-.5)*y.shake),y.shake*=.86):y.shake=0,D==="idle"){const P=[],W=E*.05%(c+S*10)-S*5;for(let H=0;H<26;H++){const oe=W-H*S*.72;P.push({x:oe,y:C*.52+Math.sin(oe*.02+E*.0011)*C*.17})}Kl(u,S*(Dr-4.5),S*4.5,S,E,!1),Kl(u,S*4.5,S*(Or-4.5),S,E,!0),ba(u,P,S,{alpha:.8})}else{if(Kl(u,(y.food.x+.5)*S,(y.food.y+.5)*S,S,E,!1),y.golden){const I=y.golden.cell;Kl(u,(I.x+.5)*S,(I.y+.5)*S,S,E,!0,y.golden.expires-E)}const P=y.snake.map((I,W)=>{const H=y.prev[W]??I;return{x:(H.x+(I.x-H.x)*M+.5)*S,y:(H.y+(I.y-H.y)*M+.5)*S}});ba(u,P,S,{dead:D==="over",tongue:E-y.lastEatAt<260})}if(y.particles.length){for(const P of y.particles){const I=Math.max(0,P.life/P.maxLife);u.globalAlpha=I,u.fillStyle=P.color,u.beginPath(),u.arc(P.x*S,P.y*S,Math.max(.6,P.size*S*I),0,Math.PI*2),u.fill()}u.globalAlpha=1}if(y.floaters.length){u.textAlign="center",u.font=`700 ${Math.round(S*.62)}px "Chakra Petch", sans-serif`;for(const P of y.floaters)u.globalAlpha=Math.max(0,Math.min(1,P.life/(P.maxLife*.55))),u.fillStyle=P.color,u.fillText(P.txt,P.x*S,P.y*S);u.globalAlpha=1}if(u.restore(),y.deathAt>0){const P=E-y.deathAt;P>=0&&P<350&&(u.fillStyle=`rgba(255,70,70,${.26*(1-P/350)})`,u.fillRect(0,0,c,C))}const U=u.createRadialGradient(c/2,C/2,c*.35,c/2,C/2,c*.78);U.addColorStop(0,"rgba(0,0,0,0)"),U.addColorStop(1,"rgba(3,10,6,0.5)"),u.fillStyle=U,u.fillRect(0,0,c,C)}let yt=null,kn=null,Go=!1;function ec(){try{if(!yt){const u=window.AudioContext||window.webkitAudioContext;if(!u)return;yt=new u,kn=yt.createGain(),kn.gain.value=Go?0:.16,kn.connect(yt.destination)}yt.state==="suspended"&&yt.resume()}catch{}}function tc(u){Go=u,yt&&kn&&kn.gain.setTargetAtTime(u?0:.16,yt.currentTime,.01)}function rt(u,y,c,C,E=0,D){if(!yt||!kn||Go)return;const M=yt.currentTime+E,S=yt.createOscillator(),U=yt.createGain();S.type=c,S.frequency.setValueAtTime(u,M),D!==void 0&&S.frequency.exponentialRampToValueAtTime(D,M+y),U.gain.setValueAtTime(0,M),U.gain.linearRampToValueAtTime(C,M+.008),U.gain.exponentialRampToValueAtTime(1e-4,M+y),S.connect(U),U.connect(kn),S.start(M),S.stop(M+y+.03)}const Gn={eat(){rt(540,.08,"square",.5),rt(810,.1,"square",.32,.05)},gold(){rt(660,.08,"square",.42),rt(880,.08,"square",.42,.07),rt(1320,.18,"triangle",.5,.14)},die(){rt(320,.5,"sawtooth",.5,0,70),rt(160,.6,"square",.28,.06,48)},pause(){rt(440,.07,"triangle",.4),rt(330,.1,"triangle",.32,.07)},resume(){rt(330,.07,"triangle",.4),rt(495,.1,"triangle",.38,.07)},start(){rt(392,.09,"square",.38),rt(523,.09,"square",.38,.09),rt(659,.16,"square",.42,.18)}},rc="serpent.bests.v1",lc="serpent.diff.v1",ic="serpent.mute.v1";function wd(){const u={chill:0,classic:0,turbo:0};try{const y=localStorage.getItem(rc);if(!y)return u;const c=JSON.parse(y);return{chill:Number(c.chill)||0,classic:Number(c.classic)||0,turbo:Number(c.turbo)||0}}catch{return u}}function kd(){try{const u=localStorage.getItem(lc);if(u==="chill"||u==="classic"||u==="turbo")return u}catch{}return"classic"}function Sd(){try{return localStorage.getItem(ic)==="1"}catch{return!1}}function Ed(){const u=ee.useRef(null),y=ee.useRef(null),c=ee.useRef(Ya()),C=ee.useRef({w:0,h:0}),E=ee.useRef(0),[D,M]=ee.useState("idle"),S=ee.useRef("idle"),[U,P]=ee.useState(0),I=ee.useRef(0),[W,H]=ee.useState(3),[oe,Ne]=ee.useState(0),[ne,Q]=ee.useState(!1),[ce,Z]=ee.useState(kd),q=ee.useRef(ce),[ge,Ae]=ee.useState(wd),xe=ee.useRef(ge),[Ce,De]=ee.useState(Sd),at=ee.useRef(Ce),Oe=ee.useCallback(_=>{S.current=_,M(_)},[]),Ue=ee.useCallback(()=>{E.current&&(window.clearTimeout(E.current),E.current=0)},[]),Ke=ee.useCallback(_=>{Ue(),Oe("ready"),E.current=window.setTimeout(()=>{E.current=0,S.current==="ready"&&Oe("running")},_)},[Ue,Oe]),Te=ee.useCallback(()=>{c.current=Ya(),I.current=0,P(0),H(3),Q(!1)},[]),Ge=ee.useCallback((_,A,G)=>{I.current+=_,P(I.current),Ne(J=>J+1),c.current.floaters.push({x:A.x+.5,y:A.y+.2,txt:`+${_}`,life:750,maxLife:750,color:G})},[]),lt=ee.useCallback(()=>{const _=c.current;_.deathAt=performance.now(),_.shake=15,Gn.die();const A=q.current,G=I.current;if(G>xe.current[A]){const X={...xe.current,[A]:G};xe.current=X,Ae(X),Q(!0);try{localStorage.setItem(rc,JSON.stringify(X))}catch{}}Oe("over")},[Oe]),we=ee.useCallback(()=>{ec(),Ue(),Te(),Gn.start(),Ke(750)},[Ue,Te,Ke]),le=ee.useCallback(()=>{S.current==="running"&&(Ue(),Gn.pause(),Oe("paused"))},[Ue,Oe]),j=ee.useCallback(()=>{S.current==="paused"&&(ec(),Gn.resume(),Ke(500))},[Ke]),B=ee.useCallback(()=>{const _=S.current;_==="idle"||_==="over"?we():_==="running"?le():_==="paused"&&j()},[we,le,j]),R=ee.useCallback(_=>{const A=c.current,G=A.queue.length?A.queue[A.queue.length-1]:A.dir,X=_.x===-G.x&&_.y===-G.y,J=_.x===G.x&&_.y===G.y;X||J||A.queue.length<3&&A.queue.push(_)},[]),p=ee.useCallback(_=>{const A=S.current;if(A==="idle"){we(),R(_);return}(A==="running"||A==="ready")&&R(_)},[we,R]),g=ee.useCallback(_=>{const A=S.current;if(!(A==="running"||A==="ready"||A==="paused")){q.current=_,Z(_);try{localStorage.setItem(lc,_)}catch{}Te()}},[Te]),Y=ee.useCallback(()=>{const _=!at.current;at.current=_,De(_),tc(_);try{localStorage.setItem(ic,_?"1":"0")}catch{}},[]);return ee.useEffect(()=>{tc(at.current);let _=0;const A=Ve=>{const ue=c.current,he=ue.last,Ze=he?Math.min(60,Ve-he):16;ue.last=Ve,gd(ue,Ze);const ct=S.current;if(ct==="running"){ue.acc+=Ze;const zt=Ga(q.current,ue.eaten);let Mt=0;for(;ue.acc>=zt&&Mt++<4;){ue.acc-=zt;const Ct=yd(ue,Ve);if(Ct.ate&&(Ge(10,ue.snake[0],"#ffc857"),H(ue.snake.length),Gn.eat(),Xa(ue,ue.snake[0],["#ff6b6b","#ffb3ab","#ffe08a"])),Ct.gold&&(Ge(50,ue.snake[0],"#ffe08a"),Gn.gold(),Xa(ue,ue.snake[0],["#ffd166","#ffe08a","#fff3c4"],22)),Ct.died){lt();break}}}const Yn=u.current,{w:Sn,h:Ir}=C.current;if(Yn&&Sn>0){const zt=Yn.getContext("2d");if(zt){const Mt=ct==="running"?Math.min(1,ue.acc/Ga(q.current,ue.eaten)):1;xd(zt,ue,Sn,Ir,Ve,ct,Mt)}}_=requestAnimationFrame(A)};_=requestAnimationFrame(A);const G=y.current,X=u.current;let J=null;if(G&&X){const Ve=()=>{const ue=G.getBoundingClientRect(),he=Math.max(0,Math.floor(Math.min(ue.width,ue.height))),Ze=Math.min(2,window.devicePixelRatio||1);X.width=Math.round(he*Ze),X.height=Math.round(he*Ze),X.style.width=`${he}px`,X.style.height=`${he}px`,C.current={w:he,h:he};const ct=X.getContext("2d");ct&&ct.setTransform(Ze,0,0,Ze,0,0)};Ve(),J=new ResizeObserver(Ve),J.observe(G)}const se=Ve=>{const ue=Ve.key,he=ue.toLowerCase(),Ze={arrowup:{x:0,y:-1},w:{x:0,y:-1},arrowdown:{x:0,y:1},s:{x:0,y:1},arrowleft:{x:-1,y:0},a:{x:-1,y:0},arrowright:{x:1,y:0},d:{x:1,y:0}};if(Ze[he]){Ve.preventDefault(),p(Ze[he]);return}if(ue===" "){Ve.preventDefault(),B();return}if(he==="r"){we();return}if(he==="p"||ue==="Escape"){const ct=S.current;ct==="running"?le():ct==="paused"&&j();return}if(he==="m"){Y();return}he==="1"&&g("chill"),he==="2"&&g("classic"),he==="3"&&g("turbo")};window.addEventListener("keydown",se);const Be=()=>{document.hidden&&S.current==="running"&&le()};return document.addEventListener("visibilitychange",Be),()=>{cancelAnimationFrame(_),Ue(),window.removeEventListener("keydown",se),document.removeEventListener("visibilitychange",Be),J&&J.disconnect()}},[Ge,g,Ue,lt,p,le,B,j,we,Y]),{canvasRef:u,wrapRef:y,phase:D,score:U,len:W,popKey:oe,isNewBest:ne,difficulty:ce,bests:ge,muted:Ce,actions:{start:we,primary:B,pauseGame:le,resumeGame:j,handleDir:p,changeDifficulty:g,toggleMute:Y}}}const Le={play:f.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",className:"h-4 w-4",children:f.jsx("path",{d:"M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z"})}),pause:f.jsxs("svg",{viewBox:"0 0 24 24",fill:"currentColor",className:"h-4 w-4",children:[f.jsx("rect",{x:"6",y:"5",width:"4",height:"14",rx:"1"}),f.jsx("rect",{x:"14",y:"5",width:"4",height:"14",rx:"1"})]}),restart:f.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.4",strokeLinecap:"round",strokeLinejoin:"round",className:"h-4 w-4",children:[f.jsx("path",{d:"M3 12a9 9 0 1 0 3-6.7"}),f.jsx("path",{d:"M3 4v5h5"})]}),soundOn:f.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",className:"h-4 w-4",children:[f.jsx("path",{d:"M11 5 6.5 9H3v6h3.5L11 19V5Z",fill:"currentColor",stroke:"none"}),f.jsx("path",{d:"M15.5 8.5a5 5 0 0 1 0 7"}),f.jsx("path",{d:"M18.5 6a9 9 0 0 1 0 12"})]}),soundOff:f.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",className:"h-4 w-4",children:[f.jsx("path",{d:"M11 5 6.5 9H3v6h3.5L11 19V5Z",fill:"currentColor",stroke:"none"}),f.jsx("path",{d:"m16 9 6 6M22 9l-6 6"})]}),trophy:f.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:"h-3.5 w-3.5",children:[f.jsx("path",{d:"M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4Z"}),f.jsx("path",{d:"M7 6H4a1 1 0 0 0-1 1c0 2.2 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.2-1.8 4-4 4"})]}),bolt:f.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",className:"h-3.5 w-3.5",children:f.jsx("path",{d:"M13 2 4 14h6l-1 8 9-12h-6l1-8Z"})}),chevron:u=>{const y={up:0,right:90,down:180,left:270}[u];return f.jsx("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",className:"h-6 w-6",style:{transform:`rotate(${y}deg)`},children:f.jsx("path",{d:"m6 14 6-6 6 6"})})}};function Nd({className:u="h-8 w-8"}){return f.jsxs("svg",{viewBox:"0 0 32 32",className:u,"aria-hidden":!0,children:[f.jsx("rect",{width:"32",height:"32",rx:"6",fill:"#0c1d13",stroke:"#2c4a37"}),f.jsx("path",{d:"M25 9a5 5 0 0 0-5-4H10a4 4 0 0 0 0 8h12a4 4 0 0 1 0 8H8",stroke:"#8ef05a",strokeWidth:"3.4",fill:"none",strokeLinecap:"round"}),f.jsx("circle",{cx:"25.4",cy:"9",r:"2.8",fill:"#acf664"}),f.jsx("circle",{cx:"26.1",cy:"8.3",r:"0.9",fill:"#0d2818"})]})}function ae({children:u}){return f.jsx("kbd",{className:"kbd",children:u})}function Cd({onDir:u,onPrimary:y,running:c}){const C="flex h-14 select-none items-center justify-center rounded-md border border-pit-500 bg-pit-800 text-moss-200 shadow-[0_3px_0_#08130c] transition active:translate-y-0.5 active:bg-pit-700 active:shadow-none touch-none",E=D=>M=>{M.preventDefault(),u(D)};return f.jsxs("div",{className:"mx-auto grid w-52 touch-none grid-cols-3 gap-2",onContextMenu:D=>D.preventDefault(),children:[f.jsx("div",{}),f.jsx("button",{type:"button","aria-label":"Move up",className:C,onPointerDown:E({x:0,y:-1}),children:Le.chevron("up")}),f.jsx("div",{}),f.jsx("button",{type:"button","aria-label":"Move left",className:C,onPointerDown:E({x:-1,y:0}),children:Le.chevron("left")}),f.jsx("button",{type:"button","aria-label":c?"Pause":"Play",className:`${C} ${c?"text-amberglow-400":"text-venom-400"}`,onPointerDown:D=>{D.preventDefault(),y()},children:c?Le.pause:Le.play}),f.jsx("button",{type:"button","aria-label":"Move right",className:C,onPointerDown:E({x:1,y:0}),children:Le.chevron("right")}),f.jsx("div",{}),f.jsx("button",{type:"button","aria-label":"Move down",className:C,onPointerDown:E({x:0,y:1}),children:Le.chevron("down")}),f.jsx("div",{})]})}const jd=[{left:"8%",top:"22%",d:"11s",del:"0s",tx:"38px",ty:"-26px",c:"rgba(142,240,90,0.8)",peak:.7,size:4},{left:"16%",top:"70%",d:"13s",del:"1.2s",tx:"-30px",ty:"-40px",c:"rgba(255,200,87,0.75)",peak:.6,size:3},{left:"30%",top:"12%",d:"9s",del:"0.6s",tx:"24px",ty:"30px",c:"rgba(142,240,90,0.7)",peak:.55,size:3},{left:"55%",top:"85%",d:"14s",del:"2s",tx:"44px",ty:"-30px",c:"rgba(255,200,87,0.7)",peak:.6,size:4},{left:"72%",top:"18%",d:"10s",del:"0.3s",tx:"-36px",ty:"26px",c:"rgba(172,246,100,0.75)",peak:.65,size:3},{left:"88%",top:"55%",d:"12s",del:"1.6s",tx:"-28px",ty:"-34px",c:"rgba(142,240,90,0.7)",peak:.5,size:4},{left:"44%",top:"40%",d:"15s",del:"2.4s",tx:"30px",ty:"24px",c:"rgba(255,224,138,0.6)",peak:.45,size:3},{left:"64%",top:"66%",d:"11.5s",del:"0.9s",tx:"-24px",ty:"34px",c:"rgba(142,240,90,0.65)",peak:.55,size:3}];function _d(){return f.jsxs("div",{className:"pointer-events-none fixed inset-0 -z-10 overflow-hidden","aria-hidden":!0,children:[f.jsx("div",{className:"absolute inset-0",style:{backgroundImage:"linear-gradient(rgba(142,240,90,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(142,240,90,0.035) 1px, transparent 1px)",backgroundSize:"44px 44px",maskImage:"radial-gradient(ellipse 90% 80% at 50% 30%, black 30%, transparent 100%)",WebkitMaskImage:"radial-gradient(ellipse 90% 80% at 50% 30%, black 30%, transparent 100%)"}}),f.jsx("div",{className:"absolute -left-44 -top-44 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(142,240,90,0.08),transparent_65%)]"}),f.jsx("div",{className:"absolute -bottom-52 -right-44 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(255,200,87,0.06),transparent_65%)]"}),jd.map((u,y)=>f.jsx("span",{className:"firefly",style:{left:u.left,top:u.top,width:u.size,height:u.size,"--d":u.d,"--del":u.del,"--tx":u.tx,"--ty":u.ty,"--c":u.c,"--peak":u.peak}},y))]})}function Pd({n:u,active:y}){return f.jsx("span",{className:"flex items-center gap-1",children:[1,2,3].map(c=>f.jsx("span",{className:`h-1.5 w-1.5 rounded-full ${c<=u?y?"bg-amberglow-400":"bg-venom-400":"bg-pit-500"}`},c))})}function nc({value:u,locked:y,onPick:c,compact:C}){return C?f.jsx("div",{className:"flex gap-1.5",children:Ho.map(E=>f.jsx("button",{type:"button",onClick:()=>c(E),disabled:y,className:`btn-arcade flex-1 px-2 py-2 text-[11px] ${u===E?"btn-primary":"btn-ghost"}`,children:Vt[E].label},E))}):f.jsxs("div",{className:"space-y-2",children:[Ho.map((E,D)=>{const M=u===E;return f.jsxs("button",{type:"button",onClick:()=>c(E),disabled:y,className:`group w-full rounded-md border px-3 py-2.5 text-left transition ${M?"border-amberglow-500/70 bg-amberglow-400/10 shadow-[0_0_18px_rgba(255,200,87,0.12)]":"border-pit-600 bg-pit-800 hover:border-pit-500 hover:bg-pit-700"} ${y?"cursor-not-allowed opacity-50":""}`,children:[f.jsxs("span",{className:"flex items-center justify-between",children:[f.jsxs("span",{className:`text-sm font-bold tracking-wider ${M?"text-amberglow-400":"text-moss-100"}`,children:[f.jsx("span",{className:"mr-2 text-[10px] text-moss-400",children:D+1}),Vt[E].label.toUpperCase()]}),f.jsx(Pd,{n:Vt[E].dots,active:M})]}),f.jsx("span",{className:"mt-0.5 block text-xs text-moss-300",children:Vt[E].blurb})]},E)}),y&&f.jsx("p",{className:"pt-1 text-[11px] leading-snug text-moss-400",children:"Speed is locked mid-run — it switches on your next game."})]})}function Gl({children:u,onClick:y}){return f.jsx("div",{className:"animate-fadein absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[4px] bg-[#04100a]/85 px-6 text-center",onClick:y,children:u})}function Td(){const u=Ed(),{phase:y,score:c,len:C,popKey:E,isNewBest:D,difficulty:M,bests:S,muted:U,canvasRef:P,wrapRef:I,actions:W}=u,H=ee.useRef(null),[oe]=ee.useState(()=>typeof window<"u"&&window.matchMedia("(pointer: coarse)").matches),Ne=y==="running"||y==="ready"||y==="paused",ne=S[M],Q=Z=>{const q=Z.touches[0];H.current={x:q.clientX,y:q.clientY}},ce=Z=>{const q=H.current;if(H.current=null,!q)return;const ge=Z.changedTouches[0],Ae=ge.clientX-q.x,xe=ge.clientY-q.y,Ce=Math.abs(Ae),De=Math.abs(xe);if(Math.max(Ce,De)<24){y==="idle"&&W.start();return}W.handleDir(Ce>De?{x:Math.sign(Ae),y:0}:{x:0,y:Math.sign(xe)})};return f.jsxs("div",{className:"min-h-screen font-body text-moss-100",children:[f.jsx(_d,{}),f.jsx("header",{className:"border-b border-pit-700/70",children:f.jsxs("div",{className:"mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6",children:[f.jsxs("div",{className:"flex items-center gap-3",children:[f.jsx(Nd,{className:"h-9 w-9"}),f.jsxs("div",{children:[f.jsx("h1",{className:"font-display text-sm leading-none tracking-wider text-venom-300 sm:text-base",children:"SERPENTINE"}),f.jsx("p",{className:"mt-1 hidden text-[11px] uppercase tracking-[0.22em] text-moss-400 sm:block",children:"a tiny arcade serpent"})]})]}),f.jsxs("div",{className:"flex items-center gap-2",children:[f.jsx("button",{type:"button",className:"icon-btn","aria-label":U?"Unmute":"Mute",title:"Sound (M)",onClick:W.toggleMute,children:U?Le.soundOff:Le.soundOn}),f.jsx("button",{type:"button",className:"icon-btn","aria-label":y==="running"?"Pause":"Resume",title:"Pause / resume (Space)",disabled:y!=="running"&&y!=="paused",style:{opacity:y==="running"||y==="paused"?1:.4},onClick:W.primary,children:y==="running"?Le.pause:Le.play}),f.jsx("button",{type:"button",className:"icon-btn","aria-label":"Restart",title:"Restart (R)",onClick:W.start,children:Le.restart})]})]})}),f.jsxs("main",{className:"mx-auto grid max-w-6xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-8",children:[f.jsxs("section",{className:"mx-auto w-full max-w-[620px] lg:max-w-none",children:[f.jsxs("div",{className:"mb-4 grid grid-cols-3 overflow-hidden rounded-md border border-pit-600 bg-pit-850",children:[f.jsxs("div",{className:"flex flex-col items-center gap-1.5 border-r border-pit-700 px-2 py-3",children:[f.jsx("span",{className:"font-display text-[8px] tracking-widest text-moss-400",children:"SCORE"}),f.jsx("span",{className:"animate-pop font-display text-xl text-amberglow-400 sm:text-2xl",children:c},E)]}),f.jsxs("div",{className:"flex flex-col items-center gap-1.5 border-r border-pit-700 px-2 py-3",children:[f.jsxs("span",{className:"flex items-center gap-1.5 font-display text-[8px] tracking-widest text-moss-400",children:[f.jsx("span",{className:"text-amberglow-500",children:Le.trophy}),"BEST"]}),f.jsx("span",{className:"font-display text-xl text-moss-200 sm:text-2xl",children:ne})]}),f.jsxs("div",{className:"flex flex-col items-center gap-1.5 px-2 py-3",children:[f.jsxs("span",{className:"flex items-center gap-1.5 font-display text-[8px] tracking-widest text-moss-400",children:[f.jsx("span",{className:"text-venom-400",children:Le.bolt}),"LENGTH"]}),f.jsx("span",{className:"font-display text-xl text-venom-300 sm:text-2xl",children:C})]})]}),f.jsx("div",{className:"mb-4 lg:hidden",children:f.jsx(nc,{compact:!0,value:M,locked:Ne,onPick:W.changeDifficulty})}),f.jsxs("div",{ref:I,className:"board-frame scanlines relative mx-auto aspect-square w-full max-w-[min(92vw,620px,calc(100dvh-230px))] touch-none select-none overflow-hidden lg:max-w-[min(100%,calc(100dvh-320px))]",onTouchStart:Q,onTouchEnd:ce,children:[f.jsx("canvas",{ref:P,className:"block"}),["left-1.5 top-1.5 border-l-2 border-t-2","right-1.5 top-1.5 border-r-2 border-t-2","bottom-1.5 left-1.5 border-b-2 border-l-2","bottom-1.5 right-1.5 border-b-2 border-r-2"].map(Z=>f.jsx("span",{className:`pointer-events-none absolute z-10 h-4 w-4 border-amberglow-400/50 ${Z}`},Z)),f.jsx("span",{className:"pointer-events-none absolute right-3 top-3 z-10 rounded border border-pit-500 bg-pit-950/70 px-2 py-1 font-display text-[7px] tracking-widest text-moss-300",children:Vt[M].label.toUpperCase()}),y==="idle"&&f.jsx(Gl,{onClick:W.start,children:f.jsxs("div",{className:"animate-rise cursor-pointer",children:[f.jsx("p",{className:"font-display text-[9px] tracking-widest text-venom-400",children:"◢ CABINET No.1 ◣"}),f.jsx("h2",{className:"retro-title font-display mt-4 text-3xl leading-tight sm:text-4xl",children:"SERPENTINE"}),f.jsx("p",{className:"mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-moss-300",children:"eat · grow · survive"}),f.jsx("p",{className:"animate-blink mt-8 font-display text-[10px] tracking-wider text-amberglow-400",children:"TAP OR PRESS SPACE TO START"}),f.jsxs("div",{className:"mt-7 hidden items-center justify-center gap-4 text-xs text-moss-400 sm:flex",children:[f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"↑"}),f.jsx(ae,{children:"↓"}),f.jsx(ae,{children:"←"}),f.jsx(ae,{children:"→"})," steer"]}),f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"SPACE"})," pause"]})]}),f.jsx("p",{className:"mt-3 text-xs text-moss-400 sm:hidden",children:"swipe the board to steer"})]})}),y==="ready"&&f.jsx(Gl,{children:f.jsxs("div",{className:"animate-rise",children:[f.jsxs("p",{className:"font-display text-[9px] tracking-widest text-moss-300",children:[Vt[M].label.toUpperCase()," MODE"]}),f.jsx("p",{className:"animate-pulse-soft retro-title font-display mt-4 text-3xl",children:"READY?"})]})}),y==="paused"&&f.jsx(Gl,{children:f.jsxs("div",{className:"animate-rise flex flex-col items-center",children:[f.jsx("p",{className:"font-display text-2xl tracking-wider text-moss-100",children:"PAUSED"}),f.jsx("p",{className:"mt-3 text-xs uppercase tracking-[0.25em] text-moss-400",children:"the serpent naps"}),f.jsxs("div",{className:"mt-7 flex flex-wrap items-center justify-center gap-3",children:[f.jsxs("button",{type:"button",className:"btn-arcade btn-primary flex items-center gap-2 px-5 py-2.5 text-xs",onClick:W.resumeGame,children:[Le.play," Resume"]}),f.jsxs("button",{type:"button",className:"btn-arcade btn-ghost flex items-center gap-2 px-5 py-2.5 text-xs",onClick:W.start,children:[Le.restart," Restart"]})]}),f.jsxs("p",{className:"mt-5 text-[11px] text-moss-400",children:[f.jsx(ae,{children:"SPACE"})," to resume"]})]})}),y==="over"&&f.jsx(Gl,{children:f.jsxs("div",{className:"animate-rise flex flex-col items-center",children:[f.jsx("p",{className:"font-display text-2xl tracking-wider text-apple-400 sm:text-3xl",children:"GAME OVER"}),D?f.jsx("p",{className:"animate-pulse-soft mt-4 rounded border border-amberglow-500/70 bg-amberglow-400/10 px-3 py-1.5 font-display text-[9px] tracking-widest text-amberglow-400",children:"★ NEW BEST ★"}):f.jsxs("p",{className:"mt-4 text-xs uppercase tracking-[0.25em] text-moss-400",children:["best on ",Vt[M].label.toLowerCase()," · ",ne]}),f.jsx("p",{className:"mt-5 font-display text-[9px] tracking-widest text-moss-300",children:"FINAL SCORE"}),f.jsx("p",{className:"retro-title font-display mt-2 text-4xl",children:c}),f.jsxs("button",{type:"button",className:"btn-arcade btn-primary mt-8 flex items-center gap-2 px-6 py-3 text-xs",onClick:W.start,children:[Le.restart," Play again"]}),f.jsxs("p",{className:"mt-4 text-[11px] text-moss-400",children:["or press ",f.jsx(ae,{children:"R"})]})]})})]}),oe?f.jsxs("div",{className:"mt-5",children:[f.jsx(Cd,{onDir:W.handleDir,onPrimary:W.primary,running:y==="running"}),f.jsx("p",{className:"mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-moss-400",children:"swipe the board or use the pad"})]}):f.jsxs("div",{className:"mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-moss-400",children:[f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"↑↓←→"}),"/",f.jsx(ae,{children:"WASD"})," steer"]}),f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"SPACE"})," pause"]}),f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"R"})," restart"]}),f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"M"})," sound"]}),f.jsxs("span",{className:"flex items-center gap-1.5",children:[f.jsx(ae,{children:"1·2·3"})," speed"]})]})]}),f.jsxs("aside",{className:"mx-auto w-full max-w-[620px] space-y-5 lg:mx-0 lg:max-w-none lg:sticky lg:top-8 lg:self-start",children:[f.jsxs("section",{className:"rounded-md border border-pit-600 bg-pit-850 p-4",children:[f.jsxs("h3",{className:"mb-3 flex items-center gap-2 font-display text-[9px] tracking-widest text-venom-300",children:[f.jsx("span",{className:"text-amberglow-400",children:Le.bolt})," SPEED"]}),f.jsx(nc,{value:M,locked:Ne,onPick:W.changeDifficulty})]}),f.jsxs("section",{className:"rounded-md border border-pit-600 bg-pit-850 p-4",children:[f.jsxs("h3",{className:"mb-3 flex items-center gap-2 font-display text-[9px] tracking-widest text-venom-300",children:[f.jsx("span",{className:"text-amberglow-400",children:Le.trophy})," HALL OF FAME"]}),f.jsx("ul",{className:"divide-y divide-pit-700",children:Ho.map(Z=>f.jsxs("li",{className:"flex items-center justify-between py-2",children:[f.jsx("span",{className:`text-xs font-bold uppercase tracking-widest ${Z===M?"text-amberglow-400":"text-moss-300"}`,children:Vt[Z].label}),f.jsx("span",{className:`font-display text-sm ${S[Z]>0?"text-moss-100":"text-moss-400"}`,children:S[Z]>0?S[Z]:"——"})]},Z))}),f.jsx("p",{className:"mt-2 text-[11px] text-moss-400",children:"Saved locally, per speed."})]}),f.jsxs("section",{className:"rounded-md border border-pit-600 bg-pit-850 p-4",children:[f.jsx("h3",{className:"mb-3 font-display text-[9px] tracking-widest text-venom-300",children:"FIELD NOTES"}),f.jsxs("ul",{className:"space-y-2.5 text-xs leading-relaxed text-moss-300",children:[f.jsxs("li",{className:"flex gap-2.5",children:[f.jsx("span",{className:"mt-0.5 h-3 w-3 shrink-0 rounded-full bg-apple-400 shadow-[0_0_10px_rgba(255,107,107,0.7)]"}),f.jsxs("span",{children:["Apples are worth ",f.jsx("b",{className:"text-moss-100",children:"10"}),". Every 5th apple you eat summons a golden fruit."]})]}),f.jsxs("li",{className:"flex gap-2.5",children:[f.jsx("span",{className:"mt-0.5 h-3 w-3 shrink-0 rounded-full bg-amberglow-400 shadow-[0_0_10px_rgba(255,200,87,0.7)]"}),f.jsxs("span",{children:["Golden fruit is worth ",f.jsx("b",{className:"text-moss-100",children:"50"})," — grab it before it blinks out."]})]}),f.jsxs("li",{className:"flex gap-2.5",children:[f.jsx("span",{className:"mt-0.5 h-3 w-3 shrink-0 rounded-full bg-venom-400 shadow-[0_0_10px_rgba(142,240,90,0.7)]"}),f.jsx("span",{children:"The serpent speeds up as it grows. Walls and your own tail are fatal."})]})]})]}),f.jsxs("section",{className:"hidden rounded-md border border-pit-600 bg-pit-850 p-4 lg:block",children:[f.jsx("h3",{className:"mb-3 font-display text-[9px] tracking-widest text-venom-300",children:"CONTROLS"}),f.jsxs("ul",{className:"space-y-2 text-xs text-moss-300",children:[f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Steer"}),f.jsxs("span",{className:"flex gap-1",children:[f.jsx(ae,{children:"↑"}),f.jsx(ae,{children:"↓"}),f.jsx(ae,{children:"←"}),f.jsx(ae,{children:"→"})]})]}),f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Steer (alt)"}),f.jsxs("span",{className:"flex gap-1",children:[f.jsx(ae,{children:"W"}),f.jsx(ae,{children:"A"}),f.jsx(ae,{children:"S"}),f.jsx(ae,{children:"D"})]})]}),f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Start / pause"}),f.jsx(ae,{children:"SPACE"})]}),f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Restart"}),f.jsx(ae,{children:"R"})]}),f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Sound on / off"}),f.jsx(ae,{children:"M"})]}),f.jsxs("li",{className:"flex items-center justify-between gap-2",children:[f.jsx("span",{children:"Speed"}),f.jsxs("span",{className:"flex gap-1",children:[f.jsx(ae,{children:"1"}),f.jsx(ae,{children:"2"}),f.jsx(ae,{children:"3"})]})]})]})]})]})]}),f.jsx("footer",{className:"mx-auto max-w-6xl px-4 pb-8 sm:px-6",children:f.jsx("p",{className:"border-t border-pit-700/70 pt-4 text-center text-[11px] uppercase tracking-[0.22em] text-moss-400",children:"serpentine · react + canvas · no serpents were harmed"})})]})}pd.createRoot(document.getElementById("root")).render(f.jsx(Td,{}));

