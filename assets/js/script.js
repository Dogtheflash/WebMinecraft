/* Giữ nguyên chất lượng hình ảnh và hiệu ứng trên cả desktop lẫn mobile. */
window.__LOW_PERF = false;
document.documentElement.classList.remove('low-perf');


/* ============================================================
   UI SOUND EFFECTS (Web Audio API)
   ============================================================ */
let uiAudioCtx = null;
function getUIAudioCtx() {
  if (uiAudioCtx) return uiAudioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    uiAudioCtx = new Ctor();
    return uiAudioCtx;
  } catch (e) {
    return null;
  }
}

function playUISound(type) {
  try {
    const ctx = getUIAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'theme') {
      // Light click/blip for theme change
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'page') {
      // Futuristic swoosh/bloop for page transition
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
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
const cmdWindow = document.querySelector('.cmd-window');
const progressBar = document.getElementById('progress-bar');
const volumeControl = document.getElementById('volume-control');
const volumeToggle = document.getElementById('volume-toggle');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
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

let lastCmdGrowthLineCount = 0;

function syncCmdWindowHeight(log = '') {
  if (!cmdWindow || cmdWindow.classList.contains('maximized')) return;
  const lineCount = Math.max(1, log.split('\n').length);
  if (lineCount === lastCmdGrowthLineCount) return;
  lastCmdGrowthLineCount = lineCount;
  const targetHeight = Math.min(410, 150 + lineCount * 14);
  cmdWindow.style.setProperty('--cmd-growth-height', `${targetHeight}px`);
}

function renderCmdBody() {
  const tab = activeCmdTab();
  cmdLog.textContent = tab.log;
  cmdLog.classList.toggle('typing', Boolean(tab.typing));
  cmdForm.classList.toggle('hidden', !tab.interactive);
  cmdInput.value = tab.input || '';
  syncCmdWindowHeight(tab.log);
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
    if (!cmdWindow.classList.contains('maximized')) {
      lastCmdGrowthLineCount = 0;
      syncCmdWindowHeight(activeCmdTab().log);
    }
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
  { name: 'Orbs Lính Mới', icon: './assets/badges/Orbs-linh-moi.png' },
  { name: 'HypeSquad Quả Cảm', icon: './assets/badges/hypesquad-bravery.svg' },
  { name: 'Nhà Phát Triển Tích Cực', icon: './assets/badges/active-developer.svg' },
  { name: 'Đăng ký từ 6 thg 12, 2021', icon: './assets/badges/nitro-new.svg', nitro: true },
  { name: 'Nitro Boost', icon: './assets/badges/boost-6-month.svg', nitro: true },
  { name: 'nakarotad#2413', icon: './assets/badges/legacy-username.svg' },
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
  presenceEls.decoration.src = `./assets/decoration/${randomImage}`;
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
  // Start the real music first while the click/keypress still owns a valid
  // user activation. Mobile Safari and Chrome can reject playback if visual
  // work happens before audio.play().
  startMusic();
  if (typeof playUISound === 'function') {
    playUISound('page');
  }
  showScreen(profileScreen);
}

const trackTitle = document.getElementById('track-title');
const trackCover = document.getElementById('track-cover');
const prevTrackButton = document.getElementById('prev-track');
const nextTrackButton = document.getElementById('next-track');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

// Resolve every track against the actual page URL. This works on the custom
// domain, GitHub Pages subfolders and local previews without fragile paths.
const trackUrl = (fileName) => new URL(`assets/audio/${fileName}`, document.baseURI).href;
const trackArtUrl = (fileName) => new URL(`assets/music/${fileName}`, document.baseURI).href;
const tracks = [
  { title: 'Nightcore - Rise Up', src: trackUrl('Nightcore-Rise-Up.mp3'), art: trackArtUrl('nightcore-rise-up.jpg') },
  { title: 'Esoa (Ballad Version)', src: trackUrl('Esoa-Ballad-version.mp3'), art: trackArtUrl('esoa-ballad.jpg') },
  { title: 'Alan Walker - Alone', src: trackUrl('Music.mp3'), art: trackArtUrl('alan-walker-alone.jpg') }
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
  if (trackCover.src !== track.art) trackCover.src = track.art;
  trackCover.alt = `Ảnh bìa ${track.title}`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationTimeEl.textContent = formatTime(audio.duration);
}

function loadTrack(index) {
  currentTrackIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentTrackIndex];
  audio.src = track.src;
  audio.load();
  progressBar.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  durationTimeEl.textContent = '0:00';
  renderTrackMeta();
}

async function playCurrentTrack() {
  if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) audio.load();
  await audio.play();
  playing = true;
  playToggle.textContent = '❚❚';
  player.classList.remove('paused');
  renderTrackMeta();
}

async function startMusic() {
  try {
    setMusicVolume(15);
    if (!audio.paused) {
      playing = true;
      playToggle.textContent = '❚❚';
      player.classList.remove('paused');
      return;
    }
    await playCurrentTrack();
  } catch (error) {
    console.warn('Autoplay blocked:', error);
    playing = false;
    playToggle.textContent = '▶';
    player.classList.add('paused');
    trackTitle.textContent = 'Chạm ▶ để phát nhạc';
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

prevTrackButton.addEventListener('click', async () => {
  const shouldResume = playing;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    renderTrackMeta();
    return;
  }
  loadTrack(currentTrackIndex - 1);
  if (!shouldResume) return;
  try {
    await playCurrentTrack();
  } catch (error) {
    console.warn('Unable to switch track:', error);
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
audio.addEventListener('canplay', renderTrackMeta);
audio.addEventListener('error', () => {
  playing = false;
  playToggle.textContent = '▶';
  player.classList.add('paused');
  trackTitle.textContent = 'Không tải được nhạc — chạm ▶ để thử lại';
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

let lastAudibleVolume = Math.max(audio.volume, 0.5);

function updateMusicVolumeUI() {
  const percent = Math.round(audio.volume * 100);
  volumeSlider.value = String(percent);
  volumeSlider.setAttribute('aria-valuetext', `${percent} phần trăm`);
  volumeValue.value = String(percent);
  volumeValue.textContent = String(percent);
  volumeControl.style.setProperty('--music-volume', `${percent}%`);

  const isMuted = percent === 0;
  volumeToggle.textContent = isMuted ? '🔇' : percent < 45 ? '🔉' : '🔊';
  volumeToggle.setAttribute('aria-label', isMuted ? 'Bật âm lượng' : 'Tắt âm lượng');
  volumeToggle.title = isMuted ? 'Bật âm lượng' : 'Tắt âm lượng';
}

function setMusicVolume(percent) {
  const numericValue = Number(percent);
  const safePercent = Number.isFinite(numericValue)
    ? Math.max(0, Math.min(100, numericValue))
    : 0;

  audio.volume = safePercent / 100;
  if (safePercent > 0) lastAudibleVolume = audio.volume;
  updateMusicVolumeUI();
}

volumeSlider.addEventListener('input', () => setMusicVolume(volumeSlider.value));
volumeSlider.addEventListener('change', () => setMusicVolume(volumeSlider.value));

volumeToggle.addEventListener('click', () => {
  if (window.matchMedia('(hover: none)').matches && !volumeControl.classList.contains('open')) {
    volumeControl.classList.add('open');
    return;
  }
  if (audio.volume > 0) {
    lastAudibleVolume = audio.volume;
    setMusicVolume(0);
    return;
  }

  setMusicVolume(Math.round((lastAudibleVolume || 0.5) * 100));
});

audio.addEventListener('volumechange', updateMusicVolumeUI);
document.addEventListener('pointerdown', (event) => {
  if (!volumeControl.contains(event.target)) volumeControl.classList.remove('open');
});
volumeControl.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    volumeControl.classList.remove('open');
    document.activeElement?.blur();
  }
});
updateMusicVolumeUI();

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

function renderSteamPlaying(gameName, detail = '', state = '', elapsed = '') {
  if (!steamPage.playing) return;

  steamPage.playing.replaceChildren();

  const title = document.createElement('strong');
  title.style.color = '#fff';
  title.textContent = `🎮 ${gameName || 'Unknown Game'}`;
  steamPage.playing.appendChild(title);

  const extra = [detail, state].filter(Boolean).join(' · ');
  if (extra) {
    steamPage.playing.appendChild(document.createElement('br'));
    const detailEl = document.createElement('span');
    detailEl.style.cssText = 'font-size:11px;color:var(--muted)';
    detailEl.textContent = extra;
    steamPage.playing.appendChild(detailEl);
  }

  if (elapsed) {
    steamPage.playing.appendChild(document.createElement('br'));
    const elapsedEl = document.createElement('span');
    elapsedEl.style.cssText = 'font-size:11px;color:var(--cyan)';
    elapsedEl.textContent = elapsed;
    steamPage.playing.appendChild(elapsedEl);
  }
}

// Load before displaying, retry once, and never leave a broken-image icon.
function setSteamImage(image, source) {
  if (!image || !source) return;
  if (image.dataset.loadedSource === source && image.naturalWidth > 0) {
    image.style.visibility = 'visible';
    image.style.display = 'block';
    return;
  }
  const token = {};
  image._steamLoadToken = token;
  image.style.visibility = 'hidden';
  image.style.display = 'block';
  const probe = new Image();
  probe.referrerPolicy = 'no-referrer';
  let retried = false;
  probe.onload = () => {
    if (image._steamLoadToken !== token) return;
    image.referrerPolicy = 'no-referrer';
    image.src = probe.src;
    image.dataset.loadedSource = source;
    image.style.visibility = 'visible';
  };
  probe.onerror = () => {
    if (image._steamLoadToken !== token) return;
    if (!retried) {
      retried = true;
      try {
        const retry = new URL(source);
        retry.searchParams.set('retry', Date.now());
        probe.src = retry.href;
        return;
      } catch (_) { /* Invalid source stays hidden. */ }
    }
    image.removeAttribute('src');
    image.style.visibility = 'hidden';
    delete image.dataset.loadedSource;
  };
  probe.src = source;
}

let steamHasCurrentGame = false;

function applySteamData(data) {
  steamHasCurrentGame = Boolean(data.currentGame);
  if (steamPage.avatar && data.avatar)
    setSteamImage(steamPage.avatar, data.avatar);

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
      renderSteamPlaying(data.currentGame);
    } else {
      steamPage.playing.textContent = 'Không có game đang chạy';
    }
  }

  if (steamPage.gameThumb) {
    if (isIngame && data.currentGameThumb) {
      setSteamImage(steamPage.gameThumb, data.currentGameThumb);
    } else {
      steamPage.gameThumb._steamLoadToken = null;
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
  if (!steamPage.page || steamHasCurrentGame) return;
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
    renderSteamPlaying(gameName, gameDetail, gameState, elapsed);
  }

  if (steamActivity?.assets?.large_image && steamPage.gameThumb) {
    const appId = steamActivity.application_id;
    const asset = steamActivity.assets.large_image;
    const source = /^\d+$/.test(asset)
      ? `https://cdn.discordapp.com/app-assets/${appId}/${asset}.png`
      : asset.startsWith('mp:external/')
        ? `https://images-ext-1.discordapp.net/external/${asset.slice('mp:external/'.length)}`
        : '';
    if (source) setSteamImage(steamPage.gameThumb, source);
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

    if (!data.currentGame && lanyardCache) applySteamLanyardFallback(lanyardCache);
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

  var THEME_WEATHER = { cyber: 'rain', sakura: 'sakura', ocean: 'snow', fire: 'stars' };

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'cyber';
    document.documentElement.setAttribute('data-theme', theme);
    toggleBtn.textContent = THEME_ICONS[theme] || '🌙';
    options.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    
    // Tự động đồng bộ hiệu ứng thời tiết theo Theme màu
    if (typeof window.setProfileWeather === 'function' && THEME_WEATHER[theme]) {
      window.setProfileWeather(THEME_WEATHER[theme]);
    }

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
  var currentWeather = 'off';
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
    if (!WEATHER_ICONS[mode]) mode = 'off';
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
  window.setProfileWeather = setWeather;

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
  var defaultWeather = { cyber: 'rain', sakura: 'sakura', ocean: 'snow', fire: 'stars' }[document.documentElement.getAttribute('data-theme')] || 'rain';
  var savedWeather = defaultWeather;
  try {
    savedWeather = localStorage.getItem(STORAGE_KEY) || defaultWeather;
    if (!localStorage.getItem('profile-weather-enabled-v1')) {
      savedWeather = defaultWeather;
      localStorage.setItem('profile-weather-enabled-v1', '1');
    }
  } catch (e) {}
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
   MAGNETIC BUTTONS
   ============================================================ */
(function initPremiumUI() {
  /* 2. Magnetic Buttons */
  document.querySelectorAll('.mini-btn, .copy-btn, .social-row a, .profile-footer a').forEach(btn => {
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
  if (window.__LOW_PERF) return;
  const tiltCards = document.querySelectorAll('.presence-card, .activity-card, .about-card');
  
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      
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
      setTimeout(() => canvas.remove(), 500);
    }, 2000);
  }
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

  function loadMp4Background() {
    if (mp4Video.dataset.loaded === 'true') return;
    const src = mp4Video.dataset.bgSrc;
    if (!src) return;
    mp4Video.src = src;
    mp4Video.dataset.loaded = 'true';
    mp4Video.load();
    mp4Video.play().catch(() => {});
  }

  function loadYouTubeBackground() {
    if (!ytIframe.getAttribute('src') && ytIframe.dataset.src) {
      ytIframe.setAttribute('src', ytIframe.dataset.src);
    }
  }

  // Poster hiện ngay; video bắt đầu tải sớm để nền CMD không bị đen trên mobile.
  const start = () => loadMp4Background();
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 900 });
  else window.setTimeout(start, 400);

  function postYtCommand(func, args) {
    if (ytIframe && ytIframe.contentWindow) {
      ytIframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: func,
        args: args || []
      }), 'https://www.youtube.com');
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
      loadYouTubeBackground();

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
      loadMp4Background();

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

  document.body.classList.remove('reduce-motion');

  document.body.classList.remove('lite-mode');

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
    const dur = 780;
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
    if (!canVT) { fn(); return; }
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
    else {
      if (!v.src && v.dataset.bgSrc) {
        v.src = v.dataset.bgSrc;
        v.dataset.loaded = 'true';
        v.load();
      }
      v.play().catch(function () {});
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


/* ============================================================
   SCROLL REVEAL — IntersectionObserver, stagger 80ms
   ============================================================ */
(function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var parent = el.parentElement;
      var siblings = parent ? Array.prototype.filter.call(parent.children, function (c) {
        return c.classList && c.classList.contains('reveal');
      }) : [el];
      var idx = siblings.indexOf(el);
      el.style.transitionDelay = (Math.max(0, idx) * 80) + 'ms';
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();

/* ==========================================================================
   BENTO INTERACTION: 3D CARD TILT & EQUALIZER
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.bento-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });

  const eqCols = document.querySelectorAll('.eq-col');
  if (eqCols.length > 0) {
    setInterval(() => {
      eqCols.forEach(col => {
        const h = Math.floor(Math.random() * 70 + 25);
        col.style.setProperty('--h1', `${h}%`);
      });
    }, 350);
  }
});
