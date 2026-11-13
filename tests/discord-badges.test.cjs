const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const userId = '917263515209859102';
const script = fs.readFileSync(path.join(root, 'assets/js/script.js'), 'utf8');
const badgeCode = script.slice(script.indexOf('const staticDiscordBadges ='), script.indexOf('// Render outside the animated cards'));

function setup() {
  const list = { children: [], replacements: 0, replaceChildren(fragment) {
    this.children = fragment.children;
    this.replacements += 1;
  } };
  function element() {
    return { dataset: {}, children: [], attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      appendChild(child) { this.children.push(child); },
    };
  }
  const context = { Intl, Date, console, presenceEls: { publicFlags: list },
    document: { createElement: element, createDocumentFragment: element },
    hideBadgeTooltip() {},
  };
  vm.createContext(context);
  vm.runInContext(`const DISCORD_USER_ID = '${userId}';\n${badgeCode}\nthis.api = {
    age: getDiscordAccountAgeBadge, read: readDiscordBadgeProgress,
    activities: getDiscordActivityBadges, render: renderDiscordBadges,
    setProgress(progress) { liveDiscordBadgeProgress = progress; }
  };`, context);
  return { api: context.api, list };
}

function payload(overrides = {}) {
  return { discord_user: { id: userId }, kv: { discord_badges: JSON.stringify({
    version: 1, userId, updatedAt: '2026-11-13T07:00:00Z',
    gameTimeHours: 327, gamesPlayed: 70, streamHours: 6, ...overrides,
  }) } };
}

const now = Date.parse('2026-11-13T08:00:00Z');

test('the three screenshot-confirmed tiers and totals are displayed exactly', () => {
  const badges = setup().api.activities();
  assert.deepEqual(Array.from(badges, (b) => b.tier), [6, 8, 2]);
  for (const [i, text] of ['327 giờ chơi tích lũy', '70 trò chơi đã chơi', '6 giờ đã stream cho người khác'].entries()) {
    assert.ok(badges[i].tooltip.includes(text));
    assert.equal(badges[i].source, 'snapshot');
    assert.ok(badges[i].tooltip.includes('13/11/2026'));
  }
});

test('account creation is decoded from the ID and age advances at its actual anniversary', () => {
  const { age } = setup().api;
  const current = age(userId, new Date(now));
  assert.equal(current.tier, 4);
  assert.match(current.detail, /4 năm, 11 tháng.*06\/12\/2021/);
  assert.match(current.name, /Nụ chồi/);
  assert.equal(age(userId, new Date('2026-12-06T03:57:43.957Z')).tier, 4);
  assert.equal(age(userId, new Date('2026-12-06T03:57:43.958Z')).tier, 5);
  assert.equal(age(userId, new Date('2040-01-01T00:00:00Z')).tier, 10);
  assert.equal(age(userId, new Date('2022-12-06T03:57:43.957Z')), null);
  assert.equal(age('invalid', new Date(now)), null);
  assert.equal(age(userId, new Date('invalid')), null);
});

test('published progress changes totals, names and icons at the next milestones', () => {
  const { api } = setup();
  const before = api.activities(api.read(payload({ gameTimeHours: 499.9, gamesPlayed: 79, streamHours: 19.9 }), now));
  assert.deepEqual(Array.from(before, (b) => b.tier), [6, 8, 2]);
  const after = api.activities(api.read(payload({ gameTimeHours: 500, gamesPlayed: 80, streamHours: 20 }), now));
  assert.deepEqual(Array.from(after, (b) => b.tier), [7, 9, 3]);
  assert.match(after[0].icon, /game-time-seasoned\.svg$/);
  assert.match(after[1].icon, /game-variety-polymath\.svg$/);
  assert.match(after[2].icon, /streaming-breakout\.svg$/);
  assert.ok(after.every((b) => b.source === 'published' && !b.tooltip.includes('Đã mở khóa')));
});

test('maximum tiers are capped and unearned activity badges are not invented', () => {
  const { api } = setup();
  const max = api.activities(api.read(payload({ gameTimeHours: 6000, gamesPlayed: 150, streamHours: 6000 }), now));
  assert.deepEqual(Array.from(max, (b) => b.tier), [10, 10, 10]);
  assert.equal(api.activities(api.read(payload({ gameTimeHours: 0, gamesPlayed: 0, streamHours: 0 }), now)).length, 0);
});

test('the receiver rejects wrong accounts, malformed, stale and invalid data', () => {
  const { read } = setup().api;
  assert.equal(read({ discord_user: { id: '1' }, kv: payload().kv }, now), null);
  assert.equal(read({ discord_user: { id: userId }, kv: {} }, now), null);
  assert.equal(read({ discord_user: { id: userId }, kv: { discord_badges: '{' } }, now), null);
  for (const override of [
    { userId: '1' }, { version: 2 }, { updatedAt: 'invalid' },
    { updatedAt: '2026-11-12T00:00:00Z' }, { updatedAt: '2026-11-13T09:00:00Z' },
    { gameTimeHours: -1 }, { gamesPlayed: 70.5 }, { gamesPlayed: '70' },
    { streamHours: null }, { gameTimeHours: '<img onerror=alert(1)>' },
  ]) assert.equal(read(payload(override), now), null, JSON.stringify(override));
});

test('presence refreshes preserve the existing badge elements and keyboard focus', () => {
  const { api, list } = setup();
  api.render();
  const first = list.children[0];
  api.render();
  assert.equal(list.children.length, 10);
  assert.equal(list.replacements, 1);
  assert.equal(first, list.children[0]);
  assert.equal(first.type, 'button');
  assert.ok(first.attributes['aria-label'].includes('Tận hiến'));
  api.setProgress(api.read(payload({ gameTimeHours: 500, gamesPlayed: 80, streamHours: 20 }), now));
  api.render();
  assert.equal(list.replacements, 2);
  assert.equal(list.children[0].dataset.badgeTier, '7');
  assert.equal(list.children[0].dataset.badgeSource, 'published');
  api.render();
  assert.equal(list.replacements, 2);
});

test('all forty evolution icons are local SVGs without executable content', () => {
  const { api } = setup();
  const icons = new Set();
  for (let i = 0; i < 10; i += 1) {
    const hours = [1, 5, 20, 75, 150, 300, 500, 1000, 2000, 5000][i];
    const games = [2, 5, 10, 15, 20, 30, 40, 60, 80, 100][i];
    for (const badge of api.activities(api.read(payload({ gameTimeHours: hours, gamesPlayed: games, streamHours: hours }), now))) icons.add(badge.icon);
    icons.add(api.age(userId, new Date(`${2022 + i}-12-07T00:00:00Z`)).icon);
  }
  assert.equal(icons.size, 40);
  for (const icon of icons) {
    const svg = fs.readFileSync(path.resolve(root, icon), 'utf8');
    assert.match(svg, /^<svg /);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(svg, /<script|onload=|<foreignObject|(?:href|src)=/i);
  }
});
