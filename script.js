(function () {
  "use strict";

  /* ---------------- Data ---------------- */

  const PHASES = [
    { at: 0, title: "Đang khởi động", caption: "Chuẩn bị hệ thống" },
    { at: 20, title: "Tối ưu bộ nhớ", caption: "Dọn dẹp tiến trình nền" },
    { at: 40, title: "Đồng bộ dữ liệu", caption: "iCloud • Bảo mật đầu cuối" },
    { at: 60, title: "Dựng giao diện", caption: "ProMotion 120Hz" },
    { at: 80, title: "Hoàn tất", caption: "Sẵn sàng" },
  ];

  const STATUS_POOL = [
    [
      "boot_rom: đã xác minh chữ ký",
      "secure_enclave: mở khoá bảo mật",
      "apfs: gắn kết ổ dữ liệu",
      "kernel: nạp 214 tiện ích mở rộng",
      "nvram: đọc cấu hình khởi động",
    ],
    [
      "memory: nén 1.2 GB bộ nhớ",
      "daemons: khởi chạy 38 tiến trình",
      "thermal: 31°C — ổn định",
      "battery: hiệu chuẩn cảm biến pin",
      "swap: dọn 412 MB vùng nhớ tạm",
    ],
    [
      "icloud: bắt tay TLS 1.3",
      "keychain: đồng bộ 1.482 mục",
      "photos: lập chỉ mục thư viện",
      "messages: giải mã đầu cuối",
      "backup: đối chiếu 96 bản ghi",
    ],
    [
      "metal: biên dịch shader",
      "promotion: khoá 120 Hz",
      "springboard: dựng lưới ứng dụng",
      "haptics: hiệu chỉnh Taptic Engine",
      "coreanimation: khởi tạo lớp render",
    ],
    [
      "handoff: chuyển sang giao diện",
      "system: kiểm tra lần cuối",
      "runtime: nạp phiên người dùng",
      "faceid: kích hoạt cảm biến TrueDepth",
      "network: bắt sóng 5G",
    ],
  ];

  const SPEEDS = [
    { id: "calm", label: "Thong thả", value: 0.5 },
    { id: "slow", label: "Chậm rãi", value: 0.75 },
    { id: "normal", label: "Bình thường", value: 1 },
    { id: "fast", label: "Nhanh", value: 1.6 },
    { id: "turbo", label: "Siêu nhanh", value: 2.5 },
  ];

  const THEME_OPTIONS = [
    { id: "dark", label: "Tối" },
    { id: "light", label: "Sáng" },
  ];

  const STEP = 20;
  const BAR_COUNT = 12;
  const LOGO_HOLD_MS = 5000;
  const BASE_DURATION_S = 5.4;
  const HANDOFF_HOLD_MS = 1250;
  const SPARKLE_MS = 1900;
  const AUTO_REPLAY_DELAY_MS = 3200;
  const SPEED_KEY = "aurora.boot.speed";
  const THEME_KEY = "aurora.boot.theme";

  const DARK_TINTS = ["#ffffff", "#ffe8a3", "#8ec9ff", "#ff9ecd", "#a8ffd0", "#c3b6ff"];
  const LIGHT_TINTS = ["#ffb648", "#ff5f9e", "#4d7bff", "#00b8a9", "#8a5cf6", "#ff3b30"];

  /* ---------------- Helpers ---------------- */

  const $ = (id) => document.getElementById(id);

  function haptic() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(8); } catch (e) { /* optional */ }
    }
  }

  function hapticPattern(pattern) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(pattern); } catch (e) { /* optional */ }
    }
  }

  let audioCtx = null;
  function beep(freq, durationMs, gainValue) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = gainValue || 0.05;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
      osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.02);
    } catch (e) { /* audio can fail silently (autoplay policy) */ }
  }

  function readStoredSpeedId() {
    try {
      const stored = window.localStorage.getItem(SPEED_KEY);
      return SPEEDS.some((s) => s.id === stored) ? stored : "normal";
    } catch (e) { return "normal"; }
  }

  function readStoredTheme() {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) { /* ignore */ }
    const prefersLight = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "dark";
  }

  /* ---------------- Rolling digit rendering ---------------- */

  function renderRollingNumber(container, value, height) {
    const str = String(value);
    if (container.children.length !== str.length) {
      container.innerHTML = "";
      for (let i = 0; i < str.length; i += 1) {
        const digitRoll = document.createElement("span");
        digitRoll.className = "digit-roll";
        digitRoll.style.height = height + "px";
        const inner = document.createElement("span");
        inner.className = "digit-roll-inner";
        for (let d = 0; d <= 9; d += 1) {
          const block = document.createElement("span");
          block.className = "block";
          block.style.height = height + "px";
          block.style.lineHeight = height + "px";
          block.textContent = String(d);
          inner.appendChild(block);
        }
        digitRoll.appendChild(inner);
        container.appendChild(digitRoll);
      }
    }
    for (let i = 0; i < str.length; i += 1) {
      const digit = Number(str[i]);
      const inner = container.children[i].firstChild;
      inner.style.transform = "translateY(" + -digit * height + "px)";
    }
  }

  /* ---------------- Activity indicator (12-bar spinner) ---------------- */

  function buildActivityIndicator(container, size) {
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.width = size + "px";
    container.style.height = size + "px";
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const bar = document.createElement("span");
      bar.className = "spinner-bar-el";
      bar.style.position = "absolute";
      bar.style.left = "50%";
      bar.style.top = "50%";
      bar.style.width = "2px";
      bar.style.height = size * 0.3 + "px";
      bar.style.marginLeft = "-1px";
      bar.style.borderRadius = "2px";
      bar.style.background = "rgba(255,255,255,0.95)";
      bar.style.transformOrigin = "1px 0";
      bar.style.transform = "rotate(" + (360 / BAR_COUNT) * i + "deg) translateY(" + size * 0.2 + "px)";
      bar.style.animation = "fade-bar 0.9s linear infinite";
      bar.style.animationDelay = (i / BAR_COUNT) * 0.9 - 0.9 + "s";
      container.appendChild(bar);
    }
  }

  // Keyframe for the spinner bars (not present in styles.css, injected once).
  (function injectSpinnerKeyframes() {
    const style = document.createElement("style");
    style.textContent = "@keyframes fade-bar { 0% { opacity: 1; } 100% { opacity: 0.15; } }";
    document.head.appendChild(style);
  })();

  function buildCheckIcon(container, color) {
    container.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
      '<circle cx="12" cy="12" r="10" fill="' + color + '" opacity="0.16"></circle>' +
      '<path class="check-draw" d="M7.5 12.4 10.6 15.5 16.6 9.2" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
      "</svg>";
  }

  /* ---------------- App state ---------------- */

  const state = {
    speedId: readStoredSpeedId(),
    theme: readStoredTheme(),
    autoReplay: true,
    isLoading: false,
    runToken: 0,
  };

  const timers = { list: [] };
  function setTimer(fn, ms) {
    const id = window.setTimeout(fn, ms);
    timers.list.push(id);
    return id;
  }
  function clearAllTimers() {
    timers.list.forEach((id) => window.clearTimeout(id));
    timers.list = [];
  }

  function currentSpeed() {
    return SPEEDS.find((s) => s.id === state.speedId) || SPEEDS[2];
  }

  /* ---------------- DOM refs ---------------- */

  const el = {
    home: $("home"),
    loader: $("loader"),
    island: $("island"),
    islandIcon: $("islandIcon"),
    islandTitle: $("islandTitle"),
    islandRoll: $("islandRoll"),
    bootHalo: $("bootHalo"),
    pulseWaves: $("pulseWaves"),
    arcWrap: $("arcWrap"),
    arcCircle: $("arcCircle"),
    arcCap: $("arcCap"),
    orbWrap: $("orbWrap"),
    orbRing: $("orbRing"),
    burstWaves: $("burstWaves"),
    logoMorph: $("logoMorph"),
    centerPercent: $("centerPercent"),
    centerRoll: $("centerRoll"),
    belowOrb: $("belowOrb"),
    phaseText: $("phaseText"),
    phaseTitle: $("phaseTitle"),
    phaseCaption: $("phaseCaption"),
    statusDot: $("statusDot"),
    statusLine: $("statusLine"),
    progressFill: $("progressFill"),
    stepDots: $("stepDots"),
    elapsedText: $("elapsedText"),
    handoffSweep: $("handoffSweep"),
    handoffToast: $("handoffToast"),
    handoffBar: $("handoffBar"),
    themeToggle: $("themeToggle"),
    sparkleLayer: $("sparkleLayer"),
    replayBtn: $("replayBtn"),
    autoReplayBtn: $("autoReplayBtn"),
    autoDot: $("autoDot"),
    autoLabel: $("autoLabel"),
    speedGroup: $("speedGroup"),
    speedCaption: $("speedCaption"),
    themeGroup: $("themeGroup"),
  };

  const ARC_RADIUS = 92;
  const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
  el.arcCircle.style.strokeDasharray = String(ARC_CIRCUMFERENCE);

  /* ---------------- Boot run ---------------- */

  function phaseIndexFor(progress) {
    let index = 0;
    for (let i = 0; i < PHASES.length; i += 1) {
      if (progress >= PHASES[i].at) index = i;
    }
    return index;
  }

  function applyTheme() {
    const isLight = state.theme === "light";
    el.loader.classList.toggle("theme-light", isLight);
    el.themeToggle.classList.toggle("theme-light", isLight);
    THEME_OPTIONS.forEach((opt) => {
      const btn = el.themeGroup.querySelector('[data-id="' + opt.id + '"]');
      if (btn) btn.classList.toggle("is-active", opt.id === state.theme);
    });
  }

  function buildSpeedGroup() {
    el.speedGroup.innerHTML = "";
    SPEEDS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill" + (opt.id === state.speedId ? " is-active" : "");
      btn.dataset.id = opt.id;
      btn.setAttribute("aria-pressed", opt.id === state.speedId ? "true" : "false");
      btn.textContent = opt.value + "×";
      btn.addEventListener("click", () => selectSpeed(opt.id));
      el.speedGroup.appendChild(btn);
    });
    updateSpeedCaption();
  }

  function buildThemeGroup() {
    el.themeGroup.innerHTML = "";
    THEME_OPTIONS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill" + (opt.id === state.theme ? " is-active" : "");
      btn.dataset.id = opt.id;
      btn.setAttribute("aria-pressed", opt.id === state.theme ? "true" : "false");
      const iconSvg = opt.id === "light"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
      btn.innerHTML = iconSvg + "<span>" + opt.label + "</span>";
      btn.addEventListener("click", () => selectTheme(opt.id));
      el.themeGroup.appendChild(btn);
    });
  }

  function updateSpeedCaption() {
    const speed = currentSpeed();
    el.speedGroup.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.id === speed.id);
      btn.setAttribute("aria-pressed", btn.dataset.id === speed.id ? "true" : "false");
    });
    el.speedCaption.textContent =
      speed.label + " · khoảng " + (BASE_DURATION_S / speed.value).toFixed(1) + "s";
    // Restart the blur-replace entrance animation.
    el.speedCaption.classList.remove("blur-replace");
    void el.speedCaption.offsetWidth;
    el.speedCaption.classList.add("blur-replace");
  }

  function selectSpeed(id) {
    state.speedId = id;
    try { window.localStorage.setItem(SPEED_KEY, id); } catch (e) { /* ignore */ }
    haptic();
    updateSpeedCaption();
  }

  function selectTheme(id) {
    state.theme = id;
    try { window.localStorage.setItem(THEME_KEY, id); } catch (e) { /* ignore */ }
    haptic();
    applyTheme();
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    try { window.localStorage.setItem(THEME_KEY, state.theme); } catch (e) { /* ignore */ }
    hapticPattern(10);
    applyTheme();
  }

  function toggleAutoReplay() {
    state.autoReplay = !state.autoReplay;
    el.autoDot.classList.toggle("is-on", state.autoReplay);
    el.autoDot.classList.toggle("ticker-dot", state.autoReplay);
    el.autoLabel.textContent = state.autoReplay ? "Tự động phát lại: Bật" : "Tự động phát lại: Tắt";
  }

  function buildStepDots() {
    el.stepDots.innerHTML = "";
    PHASES.forEach(() => {
      const dot = document.createElement("span");
      dot.className = "step-dot";
      el.stepDots.appendChild(dot);
    });
  }

  function updateStepDots(phaseIdx, isDone) {
    const dots = el.stepDots.children;
    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];
      dot.classList.remove("is-active", "is-passed", "is-done");
      if (isDone) {
        dot.classList.add("is-done");
      } else if (i === phaseIdx) {
        dot.classList.add("is-active");
      } else if (i < phaseIdx) {
        dot.classList.add("is-passed");
      }
    }
  }

  /**
   * Runs one full boot sequence. Resolves (via onFinished) once the
   * hand-off toast has cleared and the loader is ready to close.
   */
  function runBootSequence(onFinished) {
    const myToken = ++state.runToken;
    clearAllTimers();

    const speed = currentSpeed();
    const duration = BASE_DURATION_S / Math.max(speed.value, 0.1);

    let hasStarted = false;
    let isDone = false;
    let rafId = null;
    let startTime = null;
    let lastPercent = 0;
    let statusStep = -1;

    // Reset visuals to the pre-boot state.
    el.loader.hidden = false;
    el.loader.classList.remove("loader-exit");
    el.loader.classList.toggle("theme-light", state.theme === "light");
    el.island.style.width = "272px";
    el.island.classList.remove("liquid-squish");
    void el.island.offsetWidth;
    el.island.classList.add("liquid-squish");
    buildActivityIndicator(el.islandIcon, 18);
    el.islandTitle.classList.add("text-shimmer");
    el.islandTitle.classList.remove("is-done");
    el.islandTitle.textContent = PHASES[0].title;
    renderRollingNumber(el.islandRoll, 0, 16);
    renderRollingNumber(el.centerRoll, 0, 44);
    el.bootHalo.style.opacity = "1";
    el.pulseWaves.style.display = "";
    el.arcWrap.style.opacity = "0";
    el.orbWrap.style.opacity = "0";
    el.orbWrap.classList.remove("breathe");
    el.orbRing.classList.remove("is-done");
    el.burstWaves.innerHTML = "";
    el.logoMorph.classList.add("boot-logo-in", "logo-idle");
    el.logoMorph.style.transform = "translateY(0) scale(3.3)";
    el.logoMorph.style.filter = state.theme === "light"
      ? "drop-shadow(0 0 26px rgba(80,90,160,0.35))"
      : "drop-shadow(0 0 30px rgba(255,255,255,0.32))";
    el.centerPercent.style.opacity = "0";
    el.centerPercent.style.transform = "translateY(34px)";
    el.belowOrb.style.opacity = "0";
    el.belowOrb.style.transform = "translate(-50%, 14px)";
    el.progressFill.style.width = "0%";
    el.statusDot.style.background = "#32D3FF";
    el.statusDot.classList.remove("is-done");
    el.statusLine.textContent = STATUS_POOL[0][0];
    el.handoffSweep.style.display = "none";
    el.handoffToast.style.display = "none";
    buildStepDots();
    updateStepDots(0, false);

    function setPhase(idx) {
      const phase = PHASES[idx];
      el.islandTitle.textContent = phase.title;
      el.phaseTitle.textContent = phase.title;
      el.phaseCaption.textContent = phase.caption;
      el.phaseText.classList.remove("blur-replace");
      void el.phaseText.offsetWidth;
      el.phaseText.classList.add("blur-replace");
      el.island.classList.remove("liquid-squish");
      void el.island.offsetWidth;
      el.island.classList.add("liquid-squish");
      updateStepDots(idx, false);
    }
    setPhase(0);

    function renderArc(progress, done) {
      const clamped = Math.min(progress, 100);
      const offset = ARC_CIRCUMFERENCE * (1 - clamped / 100);
      el.arcCircle.style.strokeDashoffset = String(offset);
      el.arcCircle.style.stroke = done ? "#30D158" : "rgba(255,255,255,0.9)";
      const angle = (clamped / 100) * 360 - 90;
      const capX = 100 + ARC_RADIUS * Math.cos((angle * Math.PI) / 180);
      const capY = 100 + ARC_RADIUS * Math.sin((angle * Math.PI) / 180);
      el.arcCap.setAttribute("cx", String(capX));
      el.arcCap.setAttribute("cy", String(capY));
      el.arcCap.style.display = !done && clamped > 1 ? "" : "none";
    }

    function frame(now) {
      if (myToken !== state.runToken) return; // superseded by a newer run
      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t);
      const stutter = Math.sin(t * 11) * 1.4 * (1 - t);
      const progress = Math.max(0, Math.min(100, eased * 100 + stutter));
      const rounded = Math.round(progress);
      const phaseIdx = phaseIndexFor(progress);

      renderRollingNumber(el.islandRoll, rounded, 16);
      renderRollingNumber(el.centerRoll, rounded, 44);
      el.progressFill.style.width = progress + "%";
      renderArc(progress, false);
      el.elapsedText.innerHTML =
        (Math.min(progress, 100) / 100 * duration).toFixed(1) + "s" +
        '<span class="elapsed-speed">· ' + speed.label + " " + speed.value + "×</span>";

      if (rounded !== lastPercent) {
        const crossedPhase = PHASES.some((p) => p.at > 0 && lastPercent < p.at && rounded >= p.at);
        lastPercent = rounded;
        haptic();
        if (crossedPhase) setPhase(phaseIdx);
      }

      const step = Math.min(Math.floor(progress / STEP), STATUS_POOL.length - 1);
      if (step !== statusStep) {
        statusStep = step;
        const lines = STATUS_POOL[step];
        const line = lines[Math.floor(Math.random() * lines.length)];
        el.statusLine.textContent = line;
        el.statusLine.classList.remove("ticker-line");
        void el.statusLine.offsetWidth;
        el.statusLine.classList.add("ticker-line");
      }

      if (t < 1) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }

      // Reached 100%.
      renderRollingNumber(el.islandRoll, 100, 16);
      renderRollingNumber(el.centerRoll, 100, 44);
      el.progressFill.style.width = "100%";
      renderArc(100, true);
      updateStepDots(phaseIdx, true);
      finishBoot();
    }

    function finishBoot() {
      if (isDone) return;
      isDone = true;
      el.island.style.width = "214px";
      el.island.classList.remove("liquid-squish");
      void el.island.offsetWidth;
      el.island.classList.add("liquid-squish");
      el.islandTitle.classList.remove("text-shimmer");
      el.islandTitle.classList.add("is-done");
      buildCheckIcon(el.islandIcon, "#30D158");
      el.orbRing.classList.add("is-done");
      el.statusDot.style.background = "#30D158";
      el.statusDot.classList.add("is-done");
      el.statusLine.textContent = "system: sẵn sàng";
      hapticPattern([6, 30, 10]);
      beep(880, 260, 0.05);

      // Completion burst rings + flash on the orb.
      el.burstWaves.innerHTML =
        '<div class="burst-wave"></div>' +
        '<div class="burst-wave" style="animation-delay:0.18s;border-color:rgba(255,255,255,0.45);"></div>' +
        '<div class="orb-flash"></div>';

      setTimer(() => {
        el.handoffToast.style.display = "flex";
        el.handoffBar.style.animationDuration = HANDOFF_HOLD_MS + "ms";
      }, 340);

      setTimer(() => {
        el.loader.classList.add("loader-exit");
        el.handoffSweep.style.display = "block";
        haptic();
      }, 340 + HANDOFF_HOLD_MS);

      setTimer(() => {
        el.loader.hidden = true;
        onFinished();
      }, 340 + HANDOFF_HOLD_MS + 760);
    }

    // The Apple mark lights up on mount: soft chime + a single light tap.
    setTimer(() => {
      beep(660, 180, 0.04);
      haptic();
    }, 260);

    setTimer(() => {
      hasStarted = true;
      el.bootHalo.style.opacity = "0";
      el.pulseWaves.style.display = "none";
      el.arcWrap.style.opacity = "1";
      el.orbWrap.style.opacity = "1";
      el.orbWrap.classList.add("breathe");
      el.logoMorph.classList.remove("logo-idle");
      el.logoMorph.style.transform = "translateY(-30px) scale(1)";
      el.logoMorph.style.filter = state.theme === "light"
        ? "drop-shadow(0 2px 12px rgba(70,80,140,0.35))"
        : "drop-shadow(0 2px 12px rgba(0,0,0,0.45))";
      el.centerPercent.style.opacity = "1";
      el.centerPercent.style.transform = "translateY(24px)";
      el.belowOrb.style.opacity = "1";
      el.belowOrb.style.transform = "translate(-50%, 0)";
      rafId = window.requestAnimationFrame(frame);
    }, LOGO_HOLD_MS);
  }

  /* ---------------- Sparkle burst ---------------- */

  function spawnSparkles() {
    const tints = state.theme === "light" ? LIGHT_TINTS : DARK_TINTS;
    const layer = el.sparkleLayer;
    layer.innerHTML = "";
    layer.style.display = "block";

    const ring1 = document.createElement("div");
    ring1.className = "spark-ring";
    ring1.style.borderColor = state.theme === "light" ? "rgba(70,80,150,0.5)" : "rgba(255,255,255,0.7)";
    layer.appendChild(ring1);

    const ring2 = document.createElement("div");
    ring2.className = "spark-ring";
    ring2.style.animationDelay = "0.14s";
    ring2.style.borderColor = state.theme === "light" ? "rgba(255,95,158,0.45)" : "rgba(160,200,255,0.55)";
    layer.appendChild(ring2);

    const STREAK_COUNT = 12;
    for (let i = 0; i < STREAK_COUNT; i += 1) {
      const rot = (i / STREAK_COUNT) * 360 + Math.random() * 14;
      const dist = 130 + Math.random() * 120;
      const tint = tints[(i + 2) % tints.length];
      const streak = document.createElement("span");
      streak.className = "spark-streak";
      streak.style.setProperty("--rot", rot + "deg");
      streak.style.setProperty("--dist", dist + "px");
      streak.style.setProperty("--tint", tint);
      streak.style.setProperty("--delay", Math.random() * 0.1 + "s");
      streak.style.setProperty("--dur", "0.85s");
      layer.appendChild(streak);
    }

    const SPARK_COUNT = 34;
    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const angle = (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
      const distance = 110 + Math.random() * 190;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 3 + Math.random() * 6;
      const tint = tints[i % tints.length];
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.setProperty("--tx", tx + "px");
      spark.style.setProperty("--ty", ty + "px");
      spark.style.setProperty("--sz", size + "px");
      spark.style.setProperty("--tint", tint);
      spark.style.setProperty("--delay", Math.random() * 0.16 + "s");
      spark.style.setProperty("--dur", (0.95 + Math.random() * 0.6) + "s");
      layer.appendChild(spark);
    }

    setTimer(() => {
      layer.style.display = "none";
      layer.innerHTML = "";
    }, SPARKLE_MS);
  }

  /* ---------------- Orchestration ---------------- */

  let autoReplayTimer = null;

  function startRun() {
    if (autoReplayTimer) {
      window.clearTimeout(autoReplayTimer);
      autoReplayTimer = null;
    }
    state.isLoading = true;
    el.home.classList.remove("home-enter");
    runBootSequence(() => {
      state.isLoading = false;
      el.home.classList.add("home-enter");
      spawnSparkles();
      hapticPattern([6, 40, 12]);
      if (state.autoReplay) {
        autoReplayTimer = window.setTimeout(() => {
          if (state.autoReplay) startRun();
        }, AUTO_REPLAY_DELAY_MS);
      }
    });
  }

  function init() {
    buildSpeedGroup();
    buildThemeGroup();
    applyTheme();

    el.replayBtn.addEventListener("click", startRun);
    el.autoReplayBtn.addEventListener("click", toggleAutoReplay);
    el.themeToggle.addEventListener("click", toggleTheme);

    startRun();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
