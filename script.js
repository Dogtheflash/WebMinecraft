/* ============================================================
   CYBER LOADING SCREEN v2 — Premium Cyberpunk
   Tốc độ: ~2 giây, tự vào luôn khi đạt 100%
   ============================================================ */
(function () {
  var overlay  = document.getElementById('cyber-loading');
  var fill     = document.getElementById('cl-fill');
  var head     = document.getElementById('cl-head');
  var pctEl    = document.getElementById('cl-pct');
  var statusEl = document.getElementById('cl-status');
  var clockEl  = document.getElementById('cl-clock');
  var fadeEl   = document.getElementById('cl-fade');
  var terminal = document.getElementById('terminal-screen');

  /* Ẩn CMD ngay từ đầu */
  if (terminal) terminal.style.visibility = 'hidden';

  var msgs = [
    'Đang khởi động hệ thống...',
    'Nạp giao thức bảo mật...',
    'Kết nối neural interface...',
    'Giải mã ma trận dữ liệu...',
    'Đồng bộ cyberspace...',
    'Xác thực danh tính...',
    'Tải môi trường ảo...',
    'Hoàn tất. Sẵn sàng!'
  ];

  var prog = 0, s1 = 0, s2 = 0, s3 = 0, done = false;

  /* Đồng hồ realtime */
  setInterval(function () {
    if (clockEl) clockEl.textContent = new Date().toTimeString().slice(0, 8);
  }, 1000);

  /* Progress bar — ~2 giây để hoàn thành */
  var iv = setInterval(function () {
    if (done) return;

    var inc = prog < 50 ? (Math.random() * 5 + 4)
            : prog < 80 ? (Math.random() * 3 + 2.5)
            : prog < 95 ? (Math.random() * 2 + 1)
            :              (Math.random() * 1.5 + 0.8);

    prog = Math.min(prog + inc, 100);
    s1   = Math.min(s1 + Math.random() * 6 + 3,  100);
    s2   = Math.min(s2 + Math.random() * 5 + 2.5, 100);
    s3   = Math.min(s3 + Math.random() * 6 + 2,  100);

    var p = Math.floor(prog);
    if (fill)  fill.style.width  = prog + '%';
    if (head)  head.style.right  = (100 - prog) + '%';
    if (pctEl) pctEl.textContent = p + '%';

    var si = Math.min(Math.floor(prog / 12.5), msgs.length - 1);
    if (statusEl) statusEl.textContent = msgs[si];

    function setBar(id, pid, v) {
      var el = document.getElementById(id);
      var ep = document.getElementById(pid);
      if (el) el.style.width  = Math.floor(v) + '%';
      if (ep) ep.textContent  = Math.floor(v) + '%';
    }
    setBar('cs1', 'cs1p', s1);
    setBar('cs2', 'cs2p', s2);
    setBar('cs3', 'cs3p', s3);

    if (prog >= 100) {
      clearInterval(iv);
      done = true;
      if (statusEl) statusEl.textContent = 'Hoàn tất. Sẵn sàng!';

      setTimeout(function () {
        if (fadeEl) fadeEl.classList.add('active');

        setTimeout(function () {
          if (overlay) overlay.classList.add('cl-hidden');

          if (terminal) {
            terminal.style.visibility = 'visible';
            terminal.style.opacity    = '0';
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
        }, 950);
      }, 400);
    }
  }, 30);
})();
/* ============================================================
   END CYBER LOADING SCREEN
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
const progressBar = document.getElementById('progress-bar');
const volumeControl = document.getElementById('volume-control');
const volumeToggle = document.getElementById('volume-toggle');
const volumeSlider = document.getElementById('volume-slider');
const cmdTabs = document.getElementById('cmd-tabs');
const cmdNewTab = document.getElementById('cmd-new-tab');
const cmdLog = document.getElementById('cmd-log');
const cmdForm = document.getElementById('cmd-form');
const cmdInput = document.getElementById('cmd-input');

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
  activeTabId = tabId;
  renderCmd();
  cmdInput.focus();
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

window.initCmd = function () {
  renderCmd();
  typeIntro();
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
  if (['help', '?'].includes(lower)) return 'Available: help, clear, profile, status, ping, dir, scan, run <anything>, or paste a URL.';
  if (lower === 'profile') return 'Opening Chinatsu Kamado profile interface... done. Press Enter outside this input to continue.';
  if (lower === 'status') return 'Discord presence daemon: ONLINE\nAnime energy: 98%\nCute cursor: armed.';
  if (lower === 'ping') return 'Pinging moonlight.anime [127.0.0.1]... Reply: time=7ms TTL=uwu';
  if (lower === 'dir') return ' Directory of C:\\Users\\Chinatsu Kamado\n\n<DIR> anime\n<DIR> lofi\n<DIR> minecraft\n<DIR> secrets\nprofile.exe';
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
    presenceEls.avatar.src = 'https://images-ext-1.discordapp.net/external/KglgTpgmix6LkqXu75sNwRMz8sWZuOl9JWnUCLWG_IA/%3Fsize%3D4096/https/cdn.discordapp.com/avatars/917263515209859102/cd121ea4baf2512e6e98f16f0f2a8d04.png?format=webp&quality=lossless&width=656&height=656';

    setDiscordDecoration(discordDecorationUrls);
    presenceEls.decoration.src = './data/decoration/buom-dem.png';

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
  }, 760);
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
  }, 560);
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
  document.body.style.setProperty('--pointer-x', `${event.clientX}px`);
  document.body.style.setProperty('--pointer-y', `${event.clientY}px`);
  document.body.classList.add('pointer-active');
}

function spawnPageRipple(event) {
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
  if (activeTiltTarget && activeTiltTarget !== target) resetCardPointer();
  activeTiltTarget = target;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const px = x / rect.width;
  const py = y / rect.height;
  const tiltY = (px - 0.5) * 9;
  const tiltX = (0.5 - py) * 9;
  target.style.setProperty('--glow-x', `${px * 100}%`);
  target.style.setProperty('--glow-y', `${py * 100}%`);
  target.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
  target.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
  target.classList.add('interactive-hover');
}

function resetCardPointer() {
  const target = activeTiltTarget || interactiveCard;
  if (!target) return;
  target.classList.remove('interactive-hover');
  target.style.setProperty('--tilt-x', '0deg');
  target.style.setProperty('--tilt-y', '0deg');
  activeTiltTarget = null;
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
  var STORAGE_KEY = 'profile-theme';

  var toggleBtn = document.getElementById('theme-toggle');
  var menu = document.getElementById('theme-menu');
  var options = document.querySelectorAll('.theme-option');

  if (!toggleBtn || !menu) return;

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'cyber';
    document.documentElement.setAttribute('data-theme', theme);
    toggleBtn.textContent = THEME_ICONS[theme] || '🌙';
    options.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }

  // Load saved theme on page load
  var saved = '';
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  applyTheme(saved || 'cyber');

  // Toggle menu open/close
  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
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
   PARALLAX BANNER — Mouse-driven layer movement
   ============================================================ */
(function () {
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

    var rect = canvas.getBoundingClientRect();
    var W = rect.width;
    var H = rect.height;
    ctx.clearRect(0, 0, W, H);
    
    // --- GLOBAL AUDIO REACTIVITY ---
    // Calculate average bass/low frequencies (first 8 bins)
    var bassSum = 0;
    for (var j = 0; j < 8; j++) {
      bassSum += dataArray[j];
    }
    var bassAvg = bassSum / 8;
    // Normalize (0 to 1) and set CSS variable on body
    document.body.style.setProperty('--audio-bass', bassAvg / 255);
    // --------------------------------

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
    
    function wakeUpCat() {
      cat.classList.add('awake');
      resetCatSleepTimer();
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
  const magnets = document.querySelectorAll('.social-row a, .play-btn, .next-btn, .volume-toggle, .theme-toggle-btn');
  
  magnets.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      // Set a quick linear transition for the magnetic pull
      btn.style.transition = 'transform 0.05s linear';
    });
    
    btn.addEventListener('mousemove', (e) => {
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
  const tiltCards = document.querySelectorAll('.presence-card, .activity-card, .about-card');
  
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation (-6 to 6 degrees)
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      
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
  let lastTime = 0;
  
  document.addEventListener('mousemove', (e) => {
    // Only show trail when profile screen is active
    if (!document.getElementById('profile-screen').classList.contains('active')) return;
    
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
