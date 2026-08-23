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

/* ════════════════════════════════════════════════════════════
   ██  SERPENTINE — SNAKE GAME (vanilla JS port)
   Dán toàn bộ khối này vào CUỐI file JS của bạn (sau mọi thứ khác).
   Yêu cầu: đã dán xong HTML (nút #snake-game-btn + #snake-overlay)
   và CSS tương ứng. Không đụng gì tới code cũ.
   Logic gốc port 1:1 từ engine.ts / render.ts / audio.ts / useSnakeGame.ts
   ════════════════════════════════════════════════════════════ */
(function SerpentineGame() {
  'use strict';

  const btn = document.getElementById('snake-game-btn');
  const overlay = document.getElementById('snake-overlay');
  if (!btn || !overlay) return; // HTML chưa được dán — bỏ qua an toàn

  /* ---------------- engine.ts ---------------- */
  const COLS = 21, ROWS = 21, START_LEN = 3, GOLDEN_EVERY = 5, GOLDEN_LIFETIME = 6500;
  const DIFFS = {
    chill:   { label: 'Chill',   base: 150, min: 96, blurb: 'A lazy garden snake.', dots: 1 },
    classic: { label: 'Classic', base: 105, min: 66, blurb: 'The arcade standard.', dots: 2 },
    turbo:   { label: 'Turbo',   base: 72,  min: 46, blurb: 'A caffeinated viper.', dots: 3 },
  };
  const DIFF_ORDER = ['chill', 'classic', 'turbo'];

  function intervalFor(d, eaten) {
    const { base, min } = DIFFS[d];
    return Math.max(min, Math.round(base * Math.pow(0.99, eaten)));
  }
  function isOccupied(cells, x, y) { return cells.some((c) => c.x === x && c.y === y); }
  function randCell(blocked) {
    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!isOccupied(blocked, x, y)) free.push({ x, y });
    if (!free.length) return { x: 0, y: 0 };
    return free[Math.floor(Math.random() * free.length)];
  }
  function createState() {
    const cy = Math.floor(ROWS / 2);
    const snake = [{ x: 8, y: cy }, { x: 7, y: cy }, { x: 6, y: cy }];
    return {
      snake, prev: snake.map((c) => ({ ...c })), dir: { x: 1, y: 0 }, queue: [],
      food: randCell(snake), golden: null, eaten: 0, acc: 0, last: 0,
      lastEatAt: -99999, deathAt: 0, shake: 0, particles: [], floaters: [],
    };
  }
  function stepGame(s, now) {
    while (s.queue.length) {
      const d = s.queue.shift();
      const same = d.x === s.dir.x && d.y === s.dir.y;
      const opposite = d.x === -s.dir.x && d.y === -s.dir.y;
      if (!same && !opposite) { s.dir = d; break; }
    }
    const head = s.snake[0];
    const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return { died: true, ate: false, gold: false };
    const ateFood = nx === s.food.x && ny === s.food.y;
    const body = ateFood ? s.snake : s.snake.slice(0, -1);
    if (body.some((c) => c.x === nx && c.y === ny)) return { died: true, ate: false, gold: false };

    const prevSnake = s.snake.map((c) => ({ ...c }));
    if (ateFood) prevSnake.push({ ...prevSnake[prevSnake.length - 1] });
    const next = [{ x: nx, y: ny }, ...body];
    s.prev = prevSnake; s.snake = next;

    let gold = false;
    if (ateFood) {
      s.eaten += 1; s.lastEatAt = now; s.food = randCell(s.snake);
      if (s.eaten % GOLDEN_EVERY === 0 && !s.golden) {
        s.golden = { cell: randCell([...s.snake, s.food]), expires: now + GOLDEN_LIFETIME };
      }
    }
    if (s.golden) {
      if (nx === s.golden.cell.x && ny === s.golden.cell.y) { gold = true; s.lastEatAt = now; s.golden = null; }
      else if (now >= s.golden.expires) s.golden = null;
    }
    return { died: false, ate: ateFood, gold };
  }
  function updateFx(s, dt) {
    if (s.particles.length) {
      const damp = Math.pow(0.985, dt / 16);
      s.particles = s.particles.filter((p) => (p.life -= dt) > 0);
      for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= damp; p.vy *= damp; }
    }
    if (s.floaters.length) {
      s.floaters = s.floaters.filter((f) => (f.life -= dt) > 0);
      for (const f of s.floaters) f.y -= 0.0016 * dt;
    }
  }
  function burst(s, at, colors, count) {
    count = count || 14;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.003 + Math.random() * 0.009, life = 420 + Math.random() * 380;
      s.particles.push({
        x: at.x + 0.5, y: at.y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life, size: 0.06 + Math.random() * 0.09,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /* ---------------- render.ts ---------------- */
  const HEAD_RGB = [172, 246, 100], TAIL_RGB = [21, 102, 68];
  function mix(a, b, t) {
    const r = Math.round(a[0] + (b[0] - a[0]) * t), g = Math.round(a[1] + (b[1] - a[1]) * t), bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function strokeSerpent(ctx, pts, cell, opts) {
    opts = opts || {};
    const n = pts.length;
    if (n < 2) return;
    const alpha = opts.alpha != null ? opts.alpha : 1;
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.beginPath(); ctx.moveTo(pts[n - 1].x, pts[n - 1].y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = 'rgba(4,20,12,0.95)'; ctx.lineWidth = cell * 0.8; ctx.stroke();

    for (let i = n - 1; i > 0; i--) {
      const f = 1 - i / (n - 1);
      ctx.strokeStyle = mix(TAIL_RGB, HEAD_RGB, f);
      ctx.lineWidth = cell * (0.42 + 0.26 * f);
      ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke();
    }

    const hp = pts[0];
    let dx = 1, dy = 0;
    const ddx = hp.x - pts[1].x, ddy = hp.y - pts[1].y, dl = Math.hypot(ddx, ddy);
    if (dl > 0.001) { dx = ddx / dl; dy = ddy / dl; }
    const px = -dy, py = dx;

    ctx.shadowColor = 'rgba(172,246,100,0.5)'; ctx.shadowBlur = cell * 0.55;
    ctx.fillStyle = mix(TAIL_RGB, HEAD_RGB, 1);
    ctx.beginPath(); ctx.arc(hp.x, hp.y, cell * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (opts.tongue) {
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(1.5, cell * 0.06);
      const mx = hp.x + dx * cell * 0.4, my = hp.y + dy * cell * 0.4;
      const tx = hp.x + dx * cell * 0.78, ty = hp.y + dy * cell * 0.78;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + (dx * 0.5 + px * 0.5) * cell * 0.14, ty + (dy * 0.5 + py * 0.5) * cell * 0.14);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + (dx * 0.5 - px * 0.5) * cell * 0.14, ty + (dy * 0.5 - py * 0.5) * cell * 0.14);
      ctx.stroke();
    }

    const eo = cell * 0.165, ef = cell * 0.1;
    for (const side of [1, -1]) {
      const ex = hp.x + dx * ef + px * eo * side, ey = hp.y + dy * ef + py * eo * side;
      ctx.fillStyle = '#f2fff0'; ctx.beginPath(); ctx.arc(ex, ey, cell * 0.105, 0, Math.PI * 2); ctx.fill();
      if (opts.dead) {
        ctx.strokeStyle = '#0d2818'; ctx.lineWidth = Math.max(1, cell * 0.045);
        const r = cell * 0.07;
        ctx.beginPath(); ctx.moveTo(ex - r, ey - r); ctx.lineTo(ex + r, ey + r);
        ctx.moveTo(ex + r, ey - r); ctx.lineTo(ex - r, ey + r); ctx.stroke();
      } else {
        ctx.fillStyle = '#0d2818';
        ctx.beginPath(); ctx.arc(ex + dx * cell * 0.038, ey + dy * cell * 0.038, cell * 0.055, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawFruit(ctx, cx, cy, cell, now, golden, expiresIn) {
    let alpha = 1;
    if (golden && expiresIn !== undefined && expiresIn < 1600) alpha = Math.sin(now / 70) > 0 ? 1 : 0.28;
    const pulse = 1 + 0.08 * Math.sin(now / (golden ? 200 : 300));
    const r = cell * (golden ? 0.34 : 0.3) * pulse;

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.shadowColor = golden ? 'rgba(255,200,87,0.85)' : 'rgba(255,93,93,0.7)';
    ctx.shadowBlur = cell * 0.9;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
    if (golden) { g.addColorStop(0, '#fff3c4'); g.addColorStop(0.55, '#ffd166'); g.addColorStop(1, '#e8912d'); }
    else { g.addColorStop(0, '#ffb3ab'); g.addColorStop(0.5, '#ff6b6b'); g.addColorStop(1, '#c92f3f'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    ctx.strokeStyle = '#7a4a21'; ctx.lineWidth = Math.max(1.5, cell * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.15, cy - r - cell * 0.14); ctx.stroke();
    ctx.fillStyle = golden ? '#ffe08a' : '#59c96a';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.48, cy - r - cell * 0.1, cell * 0.13, cell * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.42, r * 0.16, 0, Math.PI * 2); ctx.fill();

    if (golden) {
      ctx.strokeStyle = 'rgba(255,224,138,0.85)'; ctx.lineWidth = Math.max(1, cell * 0.045);
      const rot = now / 700;
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.4);
        ctx.lineTo(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function renderGame(ctx, s, w, h, now, phase, t) {
    if (w < 10 || h < 10) return;
    const cell = w / COLS;

    ctx.fillStyle = '#0a1a11'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(172,246,100,0.025)';
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) & 1) ctx.fillRect(x * cell, y * cell, cell, cell);
    ctx.strokeStyle = 'rgba(172,246,100,0.07)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.save();
    if (s.shake > 0.3) { ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake); s.shake *= 0.86; }
    else s.shake = 0;

    if (phase === 'idle') {
      const pts = []; const N = 26;
      const headX = ((now * 0.05) % (w + cell * 10)) - cell * 5;
      for (let k = 0; k < N; k++) {
        const x = headX - k * cell * 0.72;
        pts.push({ x, y: h * 0.52 + Math.sin(x * 0.02 + now * 0.0011) * h * 0.17 });
      }
      drawFruit(ctx, cell * (COLS - 4.5), cell * 4.5, cell, now, false);
      drawFruit(ctx, cell * 4.5, cell * (ROWS - 4.5), cell, now, true);
      strokeSerpent(ctx, pts, cell, { alpha: 0.8 });
    } else {
      drawFruit(ctx, (s.food.x + 0.5) * cell, (s.food.y + 0.5) * cell, cell, now, false);
      if (s.golden) {
        const gc = s.golden.cell;
        drawFruit(ctx, (gc.x + 0.5) * cell, (gc.y + 0.5) * cell, cell, now, true, s.golden.expires - now);
      }
      const pts = s.snake.map((c, i) => {
        const p = s.prev[i] || c;
        return { x: (p.x + (c.x - p.x) * t + 0.5) * cell, y: (p.y + (c.y - p.y) * t + 0.5) * cell };
      });
      strokeSerpent(ctx, pts, cell, { dead: phase === 'over', tongue: now - s.lastEatAt < 260 });
    }

    if (s.particles.length) {
      for (const p of s.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x * cell, p.y * cell, Math.max(0.6, p.size * cell * a), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (s.floaters.length) {
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(cell * 0.62)}px "Chakra Petch", sans-serif`;
      for (const f of s.floaters) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life / (f.maxLife * 0.55)));
        ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x * cell, f.y * cell);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (s.deathAt > 0) {
      const dt = now - s.deathAt;
      if (dt >= 0 && dt < 350) { ctx.fillStyle = `rgba(255,70,70,${0.26 * (1 - dt / 350)})`; ctx.fillRect(0, 0, w, h); }
    }
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(3,10,6,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  /* ---------------- audio.ts ---------------- */
  let ac = null, master = null, muted = false;
  function initAudio() {
    try {
      if (!ac) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        ac = new Ctor(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.16; master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  }
  function setAudioMuted(m) { muted = m; if (ac && master) master.gain.setTargetAtTime(m ? 0 : 0.16, ac.currentTime, 0.01); }
  function tone(freq, dur, type, vol, delay, slideTo) {
    delay = delay || 0;
    if (!ac || !master || muted) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  const sfx = {
    eat() { tone(540, 0.08, 'square', 0.5); tone(810, 0.1, 'square', 0.32, 0.05); },
    gold() { tone(660, 0.08, 'square', 0.42); tone(880, 0.08, 'square', 0.42, 0.07); tone(1320, 0.18, 'triangle', 0.5, 0.14); },
    die() { tone(320, 0.5, 'sawtooth', 0.5, 0, 70); tone(160, 0.6, 'square', 0.28, 0.06, 48); },
    pause() { tone(440, 0.07, 'triangle', 0.4); tone(330, 0.1, 'triangle', 0.32, 0.07); },
    resume() { tone(330, 0.07, 'triangle', 0.4); tone(495, 0.1, 'triangle', 0.38, 0.07); },
    start() { tone(392, 0.09, 'square', 0.38); tone(523, 0.09, 'square', 0.38, 0.09); tone(659, 0.16, 'square', 0.42, 0.18); },
  };

  /* ---------------- persistence ---------------- */
  const BEST_KEY = 'serpent.bests.v1', DIFF_KEY = 'serpent.diff.v1', MUTE_KEY = 'serpent.mute.v1';
  function loadBests() {
    const fb = { chill: 0, classic: 0, turbo: 0 };
    try {
      const raw = localStorage.getItem(BEST_KEY); if (!raw) return fb;
      const p = JSON.parse(raw);
      return { chill: Number(p.chill) || 0, classic: Number(p.classic) || 0, turbo: Number(p.turbo) || 0 };
    } catch (e) { return fb; }
  }
  function loadDifficulty() {
    try { const d = localStorage.getItem(DIFF_KEY); if (d === 'chill' || d === 'classic' || d === 'turbo') return d; } catch (e) {}
    return 'classic';
  }
  function loadMuted() { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } }

  /* ---------------- state / DOM wiring ---------------- */
  const els = {
    canvas: document.getElementById('snake-canvas'),
    wrap: document.getElementById('snake-board-wrap'),
    score: document.getElementById('snake-score'),
    best: document.getElementById('snake-best'),
    len: document.getElementById('snake-len'),
    modeTag: document.getElementById('snake-mode-tag'),
    ovIdle: document.getElementById('snake-ov-idle'),
    ovReady: document.getElementById('snake-ov-ready'),
    readyMode: document.getElementById('snake-ready-mode'),
    ovPaused: document.getElementById('snake-ov-paused'),
    ovOver: document.getElementById('snake-ov-over'),
    newbest: document.getElementById('snake-newbest'),
    bestline: document.getElementById('snake-bestline'),
    finalScore: document.getElementById('snake-final-score'),
    diffCompact: document.getElementById('snake-diff-compact'),
    diffList: document.getElementById('snake-diff-list'),
    lockedNote: document.getElementById('snake-locked-note'),
    bestsList: document.getElementById('snake-bests-list'),
    muteBtn: document.getElementById('snake-mute-btn'),
    pauseBtn: document.getElementById('snake-pause-btn'),
    restartBtn: document.getElementById('snake-restart-btn'),
    restartBtn2: document.getElementById('snake-restart-btn2'),
    closeBtn: document.getElementById('snake-close-btn'),
    resumeBtn: document.getElementById('snake-resume-btn'),
    againBtn: document.getElementById('snake-again-btn'),
    dpad: document.getElementById('snake-dpad'),
    dpadPrimary: document.getElementById('snake-dpad-primary'),
  };
  const ctx = els.canvas.getContext('2d');

  let gs = createState();
  let phase = 'idle';
  let score = 0;
  let len = START_LEN;
  let isNewBest = false;
  let difficulty = loadDifficulty();
  let bests = loadBests();
  let isMuted = loadMuted();
  let readyTimer = 0;
  let size = { w: 0, h: 0 };
  let raf = 0;
  let ro = null;

  function clearReadyTimer() { if (readyTimer) { clearTimeout(readyTimer); readyTimer = 0; } }
  function setPhase(p) { phase = p; renderUI(); }

  function scheduleRun(ms) {
    clearReadyTimer();
    setPhase('ready');
    readyTimer = setTimeout(() => { readyTimer = 0; if (phase === 'ready') setPhase('running'); }, ms);
  }
  function resetBoard() { gs = createState(); score = 0; len = START_LEN; isNewBest = false; }

  function addScore(n, at, color) {
    score += n;
    els.score.textContent = String(score);
    els.score.classList.remove('snake-pop'); void els.score.offsetWidth; els.score.classList.add('snake-pop');
    gs.floaters.push({ x: at.x + 0.5, y: at.y + 0.2, txt: `+${n}`, life: 750, maxLife: 750, color });
  }

  function die() {
    gs.deathAt = performance.now();
    gs.shake = 15;
    sfx.die();
    if (score > bests[difficulty]) {
      bests = { ...bests, [difficulty]: score };
      isNewBest = true;
      try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) {}
    }
    setPhase('over');
  }

  function start() {
    initAudio();
    clearReadyTimer();
    resetBoard();
    sfx.start();
    els.len.textContent = String(len);
    scheduleRun(750);
  }
  function pauseGame() { if (phase !== 'running') return; clearReadyTimer(); sfx.pause(); setPhase('paused'); }
  function resumeGame() { if (phase !== 'paused') return; initAudio(); sfx.resume(); scheduleRun(500); }
  function primary() {
    if (phase === 'idle' || phase === 'over') start();
    else if (phase === 'running') pauseGame();
    else if (phase === 'paused') resumeGame();
  }
  function enqueue(d) {
    const last = gs.queue.length ? gs.queue[gs.queue.length - 1] : gs.dir;
    const opposite = d.x === -last.x && d.y === -last.y;
    const same = d.x === last.x && d.y === last.y;
    if (opposite || same) return;
    if (gs.queue.length < 3) gs.queue.push(d);
  }
  function handleDir(d) {
    if (phase === 'idle') { start(); enqueue(d); return; }
    if (phase === 'running' || phase === 'ready') enqueue(d);
  }
  function changeDifficulty(d) {
    if (phase === 'running' || phase === 'ready' || phase === 'paused') return;
    difficulty = d;
    try { localStorage.setItem(DIFF_KEY, d); } catch (e) {}
    resetBoard();
    renderUI();
  }
  function toggleMute() {
    isMuted = !isMuted;
    setAudioMuted(isMuted);
    try { localStorage.setItem(MUTE_KEY, isMuted ? '1' : '0'); } catch (e) {}
    renderUI();
  }

  /* ---------------- UI sync ---------------- */
  function renderUI() {
    els.modeTag.textContent = DIFFS[difficulty].label.toUpperCase();
    els.best.textContent = String(bests[difficulty]);
    els.muteBtn.textContent = isMuted ? '🔇' : '🔊';
    els.pauseBtn.textContent = phase === 'running' ? '⏸' : '▶';
    els.dpadPrimary.textContent = phase === 'running' ? '⏸' : '▶';

    const locked = phase === 'running' || phase === 'ready' || phase === 'paused';
    els.lockedNote.classList.toggle('hidden', !locked);

    [els.diffCompact, els.diffList].forEach((wrap) => {
      wrap.querySelectorAll('[data-diff]').forEach((elm) => {
        elm.classList.toggle('active', elm.dataset.diff === difficulty);
        elm.disabled = locked;
      });
    });
    els.diffList.querySelectorAll('.snake-diff-row').forEach((row) => {
      const dotsWrap = row.querySelector('.snake-dots');
      const n = DIFFS[row.dataset.diff].dots;
      dotsWrap.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const dot = document.createElement('i');
        const on = i <= n;
        dot.style.background = on ? (row.dataset.diff === difficulty ? '#ffc857' : '#8ef05a') : '#1f3a26';
        dotsWrap.appendChild(dot);
      }
    });

    els.bestsList.querySelectorAll('li').forEach((li) => {
      const key = li.querySelector('[data-v]').dataset.v;
      const v = bests[key];
      li.querySelector('[data-v]').textContent = v > 0 ? String(v) : '——';
    });

    els.ovIdle.classList.toggle('hidden', phase !== 'idle');
    els.ovReady.classList.toggle('hidden', phase !== 'ready');
    els.ovPaused.classList.toggle('hidden', phase !== 'paused');
    els.ovOver.classList.toggle('hidden', phase !== 'over');

    if (phase === 'ready') els.readyMode.textContent = DIFFS[difficulty].label.toUpperCase() + ' MODE';
    if (phase === 'over') {
      els.finalScore.textContent = String(score);
      els.newbest.classList.toggle('hidden', !isNewBest);
      els.bestline.classList.toggle('hidden', isNewBest);
      els.bestline.textContent = `best on ${DIFFS[difficulty].label.toLowerCase()} · ${bests[difficulty]}`;
    }
  }

  /* ---------------- main loop ---------------- */
  function fit() {
    const rect = els.wrap.getBoundingClientRect();
    const s = Math.max(0, Math.floor(Math.min(rect.width, rect.height)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    els.canvas.width = Math.round(s * dpr);
    els.canvas.height = Math.round(s * dpr);
    els.canvas.style.width = s + 'px';
    els.canvas.style.height = s + 'px';
    size = { w: s, h: s };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    const sLast = gs.last;
    const dt = sLast ? Math.min(60, now - sLast) : 16;
    gs.last = now;
    updateFx(gs, dt);

    if (phase === 'running') {
      gs.acc += dt;
      const iv = intervalFor(difficulty, gs.eaten);
      let guard = 0;
      while (gs.acc >= iv && guard++ < 4) {
        gs.acc -= iv;
        const res = stepGame(gs, now);
        if (res.ate) {
          addScore(10, gs.snake[0], '#ffc857');
          len = gs.snake.length; els.len.textContent = String(len);
          sfx.eat();
          burst(gs, gs.snake[0], ['#ff6b6b', '#ffb3ab', '#ffe08a']);
        }
        if (res.gold) { addScore(50, gs.snake[0], '#ffe08a'); sfx.gold(); burst(gs, gs.snake[0], ['#ffd166', '#ffe08a', '#fff3c4'], 22); }
        if (res.died) { die(); break; }
      }
    }

    if (size.w > 0) {
      const t = phase === 'running' ? Math.min(1, gs.acc / intervalFor(difficulty, gs.eaten)) : 1;
      renderGame(ctx, gs, size.w, size.h, now, phase, t);
    }
    raf = requestAnimationFrame(frame);
  }

  const KEY_DIRS = {
    arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
  };
  function onKey(e) {
    if (overlay.classList.contains('hidden')) return;
    const name = e.key.toLowerCase();
    if (KEY_DIRS[name]) { e.preventDefault(); handleDir(KEY_DIRS[name]); return; }
    if (e.key === ' ') { e.preventDefault(); primary(); return; }
    if (name === 'r') { start(); return; }
    if (name === 'p' || e.key === 'Escape') {
      if (e.key === 'Escape' && phase !== 'running' && phase !== 'paused') { closeGame(); return; }
      if (phase === 'running') pauseGame(); else if (phase === 'paused') resumeGame(); else closeGame();
      return;
    }
    if (name === 'm') { toggleMute(); return; }
    if (name === '1') changeDifficulty('chill');
    if (name === '2') changeDifficulty('classic');
    if (name === '3') changeDifficulty('turbo');
  }
  function onVis() { if (document.hidden && phase === 'running') pauseGame(); }

  let running = false;
  function startLoop() {
    if (running) return;
    running = true;
    setAudioMuted(isMuted);
    fit();
    ro = new ResizeObserver(fit);
    ro.observe(els.wrap);
    raf = requestAnimationFrame(frame);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    clearReadyTimer();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    if (ro) { ro.disconnect(); ro = null; }
  }

  /* ---------------- touch swipe on board ---------------- */
  let touchStart = null;
  els.wrap.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  els.wrap.addEventListener('touchend', (e) => {
    const st = touchStart; touchStart = null; if (!st) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x, dy = t.clientY - st.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 24) { if (phase === 'idle') start(); return; }
    handleDir(adx > ady ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
  }, { passive: true });
  els.wrap.addEventListener('click', () => { if (phase === 'idle') start(); });

  /* ---------------- button wiring ---------------- */
  els.muteBtn.addEventListener('click', toggleMute);
  els.pauseBtn.addEventListener('click', primary);
  els.restartBtn.addEventListener('click', start);
  els.restartBtn2.addEventListener('click', start);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.againBtn.addEventListener('click', start);
  els.dpadPrimary.addEventListener('pointerdown', (e) => { e.preventDefault(); primary(); });
  els.dpad.querySelectorAll('[data-dir]').forEach((b) => {
    const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); handleDir(map[b.dataset.dir]); });
  });
  [els.diffCompact, els.diffList].forEach((wrap) => {
    wrap.addEventListener('click', (e) => {
      const t = e.target.closest('[data-diff]');
      if (t) changeDifficulty(t.dataset.diff);
    });
  });

  function openGame() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    resetBoard();
    phase = 'idle';
    renderUI();
    startLoop();
  }
  function closeGame() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    stopLoop();
    phase = 'idle';
  }

  window.openSnakeGame = openGame;
  window.closeSnakeGame = closeGame;

  btn.addEventListener('click', openGame);
  els.closeBtn.addEventListener('click', closeGame);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGame(); });

  renderUI();
})();

