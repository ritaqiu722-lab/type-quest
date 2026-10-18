(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ================= 題庫 ================= */
const WORDS = ['apple','happy','green','water','light','music','friend','school','window','garden',
  'bridge','forest','castle','orange','yellow','monkey','simple','summer','winter','pencil',
  'family','market','animal','flower','dragon','travel'];
const LONG_WORDS = ['beautiful','adventure','keyboard','wonderful','treasure','mountain',
  'chocolate','important','knowledge','beginning','challenge','language'];
const SENTENCES = ['the cat sleeps on the sofa','i like to read books','we walk in the forest',
  'birds sing in the morning','the river runs to the sea','she opens the old door',
  'a small dragon guards the gold','practice makes perfect','keep your fingers on the home row',
  'the knight crosses the bridge','every day i learn something new','the castle is on the hill'];
const LETTERS = 'asdfjklghqwertyuiopzxcvbnm';
const TIPS = ['保持正確指法，讓打字更快更準確！','眼睛看畫面，不要低頭看鍵盤。','先求準，再求快，速度自然會上來。',
  '食指放在 F 和 J 的小凸點上。','每天練習十分鐘，比一次練一小時有效。'];

/* ================= 工具 ================= */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const genLetters = n => { const r = []; while (r.length < n) { const c = LETTERS[Math.floor(Math.random() * LETTERS.length)]; if (c !== r[r.length - 1]) r.push(c); } return r; };
const pad2 = n => String(n).padStart(2, '0');
const fmt = s => `${pad2(Math.floor(s / 60))}:${pad2(Math.floor(s % 60))}`;
const dayStr = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* ================= 關卡 ================= */
const LEVELS = [
  { id: 1, chapter: '第一章', tag: '新手難度', name: '鍵盤新手村', desc: '練習基本字母位置與按法', need: 80, time: 60, icon: '🏕️', bg: 'linear-gradient(135deg,#a9d8a5,#5f9c6a)', unit: '字母', make: () => genLetters(15) },
  { id: 2, chapter: '第二章', tag: '普通難度', name: '單字森林', desc: '練習輸入基本英文單字', need: 85, time: 60, icon: '🌲', bg: 'linear-gradient(135deg,#7fbf7a,#2f6b3a)', unit: '單字', make: () => pick(WORDS, 10) },
  { id: 3, chapter: '第三章', tag: '難度偏高', name: '句子城堡', desc: '練習完整句子及較長英文單字', need: 90, time: 120, icon: '🏰', bg: 'linear-gradient(135deg,#b9c9dd,#6f86a8)', unit: '句子', make: () => shuffle([...pick(LONG_WORDS, 2), ...pick(SENTENCES, 4)]) },
  { id: 4, chapter: '第四章', tag: '高難度', name: '速度競技場', desc: '綜合運用前面學到的技能，時間更短', need: 95, time: 80, icon: '⚔️', bg: 'linear-gradient(135deg,#e2b98a,#a8683a)', unit: '挑戰', make: () => shuffle([...pick(LONG_WORDS, 4), ...pick(SENTENCES, 4)]) }
];
const lv = id => LEVELS.find(l => l.id === id);

/* ================= 存檔 ================= */
const SAVE_KEY = 'typequest_save_v1';
const defaultSave = () => ({ name: '小雲', wallet: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0 }, records: {}, badges: {},
  rounds: 0, lastDay: null, streak: 0, current: 1, autoSpeak: false });
function loadSave() {
  try { const o = JSON.parse(localStorage.getItem(SAVE_KEY)); return Object.assign(defaultSave(), o || {}); }
  catch (e) { return defaultSave(); }
}
let save = loadSave();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

// 連續簽到
(function checkIn() {
  const today = dayStr(new Date());
  if (save.lastDay === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  save.streak = save.lastDay === dayStr(y) ? save.streak + 1 : 1;
  save.lastDay = today;
  persist();
})();

/* ================= 徽章 ================= */
const BADGES = [
  { id: 'rookie', name: '初學者', icon: '📖', desc: '完成第一次練習', test: () => save.rounds >= 1 },
  { id: 'pro', name: '打字高手', icon: '⌨️', desc: '單次練習正確率達 95%', test: c => c.completed && c.acc >= 95 },
  { id: 'fast', name: '快速達人', icon: '⚡', desc: '單次練習速度達 35 WPM', test: c => c.completed && c.wpm >= 35 },
  { id: 'streak', name: '連續挑戰', icon: '📅', desc: '連續 3 天登入練習', test: () => save.streak >= 3 },
  { id: 'master', name: '單字大師', icon: '🏅', desc: '通過第二章：單字森林', test: () => save.stars[2] > 0 },
  { id: 'hero', name: '冒險家', icon: '⛰️', desc: '通過第四章，奪得城堡寶藏', test: () => save.stars[4] > 0 }
];

/* ================= 遊戲狀態 ================= */
const st = { level: 1, items: [], idx: 0, pos: 0, correct: 0, errors: 0, start: 0, running: false, active: false,
  timer: null, ok: new Set(), bad: new Set() };
let view = 'home';
const el = {};

const curLevel = () => lv(st.level);
const unlocked = id => id === 1 || save.stars[id - 1] > 0;
const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);

function calc() {
  const total = st.correct + st.errors;
  const acc = total ? Math.round(st.correct / total * 100) : 100;
  const min = st.running ? Math.max((Date.now() - st.start) / 60000, 0.05) : 0;
  const wpm = st.running && Date.now() - st.start > 1500 ? Math.round(st.correct / 5 / min) : 0;
  return { acc, wpm, total };
}

function setup(levelId) {
  clearInterval(st.timer);
  const L = lv(levelId);
  Object.assign(st, { level: levelId, items: L.make(), idx: 0, pos: 0, correct: 0, errors: 0, start: 0,
    running: false, active: true, ok: new Set(), bad: new Set() });
  save.current = levelId; persist();
  el.tipText.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  renderAll();
  maybeSpeak();
}

function renderAll() {
  renderLevelCard(); renderPractice(); renderRight(); updateStats();
}

/* ================= 畫面 ================= */
function renderLevelCard() {
  const L = curLevel();
  el.levelCard.innerHTML = `<div class="lc-ico">${L.icon}</div>
    <div><small>目前關卡</small><b>${L.name}</b>
    <div class="lc-meta">Lv.${L.id} ｜ ${save.stars[L.id]}/3 ⭐　通關：正確率 ${L.need}%</div></div>`;
}

function renderPractice() {
  const L = curLevel();
  const t = st.items[st.idx] || '';
  const unit = t.length === 1 ? '字母' : t.includes(' ') ? '句子' : '單字';
  el.hintText.textContent = `請輸入下方的英文${unit}（每個${unit}完成後會自動換下一個）`;
  el.target.className = 'target ' + (t.length === 1 ? 'big' : t.length > 14 ? 'small' : '');
  el.target.innerHTML = '<span>' + [...t].map((c, i) =>
    `<span class="ch ${i < st.pos ? 'done' : i === st.pos ? 'cur' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('') +
    '</span><button class="speak" id="speak" title="朗讀">🔊</button>';
  renderTyped();
  updateKeys();
  el.sProg.textContent = `${Math.min(st.idx, st.items.length)}/${st.items.length}`;
  el.barFill.style.width = (st.idx / st.items.length * 100) + '%';
}

function renderTyped() {
  const t = (st.items[st.idx] || '').slice(0, st.pos).replace(/ /g, '&nbsp;');
  el.typed.innerHTML = t ? t + '<span class="caret"></span>' : '<span class="ph">按下鍵盤開始打字…</span><span class="caret"></span>';
}

function buildKeyboard() {
  const rows = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l'],
    ['Shift','z','x','c','v','b','n','m','Enter'], ['space']];
  el.kb.innerHTML = rows.map(r => '<div class="kb-row">' + r.map(k => {
    if (k === 'Shift' || k === 'Enter') return `<div class="key wide">${k}</div>`;
    if (k === 'space') return '<div class="key space" data-k=" "></div>';
    return `<div class="key" data-k="${k}">${k}</div>`;
  }).join('') + '</div>').join('');
}

function updateKeys() {
  const exp = (st.items[st.idx] || '')[st.pos];
  $$('.key[data-k]').forEach(k => {
    const c = k.dataset.k;
    k.classList.toggle('ok', st.ok.has(c));
    k.classList.toggle('bad', st.bad.has(c));
    k.classList.toggle('next', st.active && c === exp);
  });
}

function flashKey(c, cls, ms) {
  const k = document.querySelector(`.key[data-k="${c}"]`);
  if (!k) return;
  k.classList.add(cls);
  setTimeout(() => k.classList.remove(cls), ms);
}

function updateStats() {
  const L = curLevel();
  const s = calc();
  const remain = st.running ? Math.max(0, L.time - (Date.now() - st.start) / 1000) : L.time;
  el.sTime.textContent = fmt(remain);
  el.sWpm.textContent = s.wpm;
  el.sAcc.textContent = s.acc + '%';
}

function renderRight() {
  el.userName.textContent = save.name;
  el.userStars.textContent = save.wallet;
  el.levelList.innerHTML = LEVELS.map(L => {
    const ok = unlocked(L.id);
    return `<div class="lv-item ${L.id === st.level ? 'current' : ''} ${ok ? '' : 'locked'}" data-lv="${L.id}">
      <div class="lv-thumb" style="background:${L.bg}">${L.icon}</div>
      <div class="lv-info"><b>Lv.${L.id} ${L.name}</b><span>${save.stars[L.id]}/3 ⭐</span></div>
      <div class="lv-state">${!ok ? '🔒' : save.stars[L.id] > 0 ? '✔️' : '›'}</div></div>`;
  }).join('');
  el.badgeMini.innerHTML = BADGES.map(b => badgeHtml(b, false)).join('');
}

function badgeHtml(b, big) {
  const got = save.badges[b.id];
  return `<div class="badge ${got ? '' : 'locked'}"><div class="badge-ico">${b.icon}</div><div>${b.name}</div>${big ? `<small>${b.desc}</small>` : ''}</div>`;
}

function renderMap() {
  $('#mapBox').innerHTML = '<h2>🗺️ 關卡地圖</h2><div class="map-grid">' + LEVELS.map(L => {
    const ok = unlocked(L.id);
    return `<div class="map-card ${ok ? '' : 'locked'}"><h3>${L.icon} ${L.chapter}：${L.name}</h3>
      <div>${L.tag}｜${L.desc}</div>
      <div>闖關條件：正確率達 ${L.need}%　時限 ${L.time} 秒</div>
      <div>最佳評價：<span style="color:#e0a21a">${starsText(save.stars[L.id])}</span></div>
      <button class="btn btn-primary" data-play="${L.id}" ${ok ? '' : 'disabled'}>${ok ? '開始挑戰' : '🔒 尚未解鎖'}</button></div>`;
  }).join('') + '</div>';
}

function renderBadges() {
  $('#badgeBox').innerHTML = '<h2>🏆 成就徽章</h2><div class="big-badges">' + BADGES.map(b => badgeHtml(b, true)).join('') + '</div>';
}

function renderRecords() {
  let bestW = 0, bestA = 0;
  Object.values(save.records).forEach(r => { bestW = Math.max(bestW, r.bestWpm || 0); bestA = Math.max(bestA, r.bestAcc || 0); });
  const rows = LEVELS.map(L => {
    const r = save.records[L.id];
    if (!r) return `<tr><td>${L.name}</td><td colspan="5">尚未挑戰</td></tr>`;
    const dW = r.bestWpm - r.first.wpm, dA = r.bestAcc - r.first.acc;
    const f = d => `<span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}</span>`;
    return `<tr><td>${L.name}</td><td>${r.plays}</td><td>${r.first.wpm} / ${r.first.acc}%</td>
      <td>${r.bestWpm} / ${r.bestAcc}%</td><td>${f(dW)} WPM</td><td>${f(dA)}%</td></tr>`;
  }).join('');
  $('#recordBox').innerHTML = `<h2>📊 個人紀錄</h2>
    <div class="cards3"><div class="card-n"><b>${bestW}</b>最佳速度 WPM</div>
    <div class="card-n"><b>${bestA}%</b>最佳正確率</div><div class="card-n"><b>${save.streak} 天</b>連續簽到</div></div>
    <table><tr><th>關卡</th><th>練習次數</th><th>第一次<br>(WPM/正確率)</th><th>目前最佳<br>(WPM/正確率)</th><th>速度進步</th><th>正確率進步</th></tr>${rows}</table>`;
}

function renderSettings() {
  $('#settingBox').innerHTML = `<h2>⚙️ 設定</h2>
    <div class="set-row"><span>冒險者名稱</span><input type="text" id="setName" maxlength="8" value=""></div>
    <div class="set-row"><span>出題時自動朗讀</span><input type="checkbox" id="setSpeak" ${save.autoSpeak ? 'checked' : ''}></div>
    <div class="set-row"><span>清除所有進度與紀錄</span><button class="btn btn-outline" id="setReset" style="padding:8px 18px;font-size:14px">重置</button></div>`;
  $('#setName').value = save.name;
}

function show(v) {
  view = v;
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + v));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (v === 'map') renderMap();
  if (v === 'badges') renderBadges();
  if (v === 'records') renderRecords();
  if (v === 'settings') renderSettings();
}

function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.toast.classList.remove('show'), 2200);
}

/* ================= 朗讀 ================= */
function speak() {
  const t = st.items[st.idx];
  if (!t || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.85;
  speechSynthesis.speak(u);
}
const maybeSpeak = () => { if (save.autoSpeak) speak(); };

/* ================= 遊戲流程 ================= */
function tick() {
  const L = curLevel();
  updateStats();
  if ((Date.now() - st.start) / 1000 >= L.time) finish();
}

function onKey(e) {
  if (!st.active || view !== 'home' || el.modal.classList.contains('show')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  let k = e.key;
  if (k.length !== 1) return;
  k = k.toLowerCase();
  if (!/^[a-z ]$/.test(k)) return;
  e.preventDefault();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  if (!st.running) { st.running = true; st.start = Date.now(); st.timer = setInterval(tick, 200); }
  const t = st.items[st.idx];
  const expected = t[st.pos];

  if (k === expected) {
    st.correct++; st.pos++; st.ok.add(k);
    if (st.pos >= t.length) {
      renderPractice();
      st.idx++; st.pos = 0; st.ok = new Set(); st.bad = new Set();
      if (st.idx >= st.items.length) { renderPractice(); updateStats(); finish(); return; }
      setTimeout(() => { if (st.active) { renderPractice(); maybeSpeak(); } }, 180);
      updateStats();
      return;
    }
  } else {
    st.errors++;
    if (k !== ' ') st.bad.add(k);
    flashKey(expected, 'hint', 600);
    const cur = el.target.querySelectorAll('.ch')[st.pos];
    if (cur) { cur.classList.add('err'); setTimeout(() => cur.classList.remove('err'), 250); }
    el.typed.classList.remove('shake'); void el.typed.offsetWidth; el.typed.classList.add('shake');
  }
  renderTyped();
  el.target.querySelectorAll('.ch').forEach((c, i) => {
    c.classList.toggle('done', i < st.pos);
    c.classList.toggle('cur', i === st.pos);
  });
  updateKeys();
  updateStats();
}

function skip() {
  if (!st.active) return;
  if (!st.running) { st.running = true; st.start = Date.now(); st.timer = setInterval(tick, 200); }
  const t = st.items[st.idx];
  st.errors += t.length - st.pos; // 跳過會扣正確率
  st.idx++; st.pos = 0; st.ok = new Set(); st.bad = new Set();
  if (st.idx >= st.items.length) { renderPractice(); finish(); return; }
  renderPractice(); updateStats(); maybeSpeak();
}

function finish() {
  clearInterval(st.timer);
  if (!st.active) return;
  st.active = false;
  const L = curLevel();
  const s = calc();
  const completed = st.idx >= st.items.length;
  const pass = completed && s.acc >= L.need;
  let stars = 0;
  if (pass) {
    const gap = (100 - L.need) / 3;
    stars = 1 + (s.acc >= L.need + gap ? 1 : 0) + (s.acc >= L.need + 2 * gap ? 1 : 0);
  }
  if (stars > save.stars[L.id]) save.stars[L.id] = stars;
  save.wallet += stars;
  save.rounds++;

  // 紀錄（比較使用前後）
  let r = save.records[L.id];
  if (!r) r = save.records[L.id] = { plays: 0, first: { wpm: s.wpm, acc: s.acc }, bestWpm: 0, bestAcc: 0 };
  r.plays++;
  r.bestWpm = Math.max(r.bestWpm, s.wpm);
  r.bestAcc = Math.max(r.bestAcc, s.acc);
  const dW = s.wpm - r.first.wpm, dA = s.acc - r.first.acc;

  // 徽章
  const ctx = { acc: s.acc, wpm: s.wpm, completed, pass };
  const fresh = BADGES.filter(b => !save.badges[b.id] && b.test(ctx));
  fresh.forEach(b => save.badges[b.id] = true);
  persist();
  renderAll();

  const next = LEVELS.find(x => x.id === L.id + 1);
  el.modalBox.innerHTML = `
    <h2>${pass ? '🎉 闖關成功！' : completed ? '💪 再接再厲！' : '⏰ 時間到！'}</h2>
    <div class="result-note">${L.name}｜通關條件：正確率 ${L.need}%</div>
    <div class="result-stars" style="color:#e0a21a">${starsText(stars)}</div>
    <div class="result-stats"><div><b>${s.wpm}</b>WPM 速度</div><div><b>${s.acc}%</b>正確率</div><div><b>${st.idx}/${st.items.length}</b>完成題數</div></div>
    <div class="result-note">${r.plays > 1 ? `與第一次相比：速度 ${dW >= 0 ? '+' : ''}${dW} WPM、正確率 ${dA >= 0 ? '+' : ''}${dA}%` : '這是你的第一筆紀錄，繼續加油！'}</div>
    ${fresh.length ? `<div class="result-note">🏆 獲得新徽章：${fresh.map(b => b.icon + b.name).join('、')}</div>` : ''}
    ${!pass ? `<div class="result-note">${completed ? '正確率還沒達標，放慢一點、先求準確吧！' : '要在時間內完成所有題目才能過關喔。'}</div>` : ''}
    <div class="modal-actions">
      <button class="btn btn-outline" data-m="retry">🔄 再玩一次</button>
      ${pass && next ? '<button class="btn btn-primary" data-m="next">下一關 →</button>' : ''}
      <button class="btn btn-outline" data-m="close">關閉</button>
    </div>`;
  el.modal.classList.add('show');
}

function startLevel(id) {
  if (!unlocked(id)) { toast('🔒 請先通過上一關！'); return; }
  el.modal.classList.remove('show');
  show('home');
  setup(id);
}

/* ================= 背景樹木 ================= */
function drawTrees() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = $('#trees'); let html = '';
  const spots = [];
  for (let i = 0; i < 26; i++) spots.push([rnd() * 330, 520 + rnd() * 380]);      // 左側
  for (let i = 0; i < 26; i++) spots.push([1270 + rnd() * 330, 520 + rnd() * 380]); // 右側
  for (let i = 0; i < 14; i++) spots.push([330 + rnd() * 940, 780 + rnd() * 120]);  // 底部
  spots.sort((a, b) => a[1] - b[1]);
  spots.forEach(([x, y]) => { const s = 0.7 + (y - 520) / 380 * 1.1; html += `<use href="#pine" x="${x}" y="${y - 160 * s}" width="${100 * s}" height="${160 * s}"/>`; });
  g.innerHTML = html;
}

/* ================= 初始化 ================= */
function init() {
  Object.assign(el, {
    levelCard: $('#levelCard'), hintText: $('#hintText'), target: $('#target'), typed: $('#typed'), kb: $('#kb'),
    sTime: $('#sTime'), sWpm: $('#sWpm'), sAcc: $('#sAcc'), sProg: $('#sProg'), barFill: $('#barFill'), tipText: $('#tipText'),
    userName: $('#userName'), userStars: $('#userStars'), levelList: $('#levelList'), badgeMini: $('#badgeMini'),
    modal: $('#modal'), modalBox: $('#modalBox'), toast: $('#toast')
  });
  drawTrees();
  buildKeyboard();

  $$('.nav-btn').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  $('#seeAll').addEventListener('click', e => { e.preventDefault(); show('badges'); });
  $('#btnRestart').addEventListener('click', () => setup(st.level));
  $('#btnSkip').addEventListener('click', skip);
  el.target.addEventListener('click', e => { if (e.target.id === 'speak') speak(); });
  el.levelList.addEventListener('click', e => { const it = e.target.closest('[data-lv]'); if (it) startLevel(+it.dataset.lv); });
  $('#mapBox').addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) startLevel(+b.dataset.play); });
  el.modalBox.addEventListener('click', e => {
    const m = e.target.closest('[data-m]'); if (!m) return;
    if (m.dataset.m === 'retry') startLevel(st.level);
    if (m.dataset.m === 'next') startLevel(st.level + 1);
    if (m.dataset.m === 'close') el.modal.classList.remove('show');
  });
  $('#settingBox').addEventListener('change', e => {
    if (e.target.id === 'setName') { save.name = e.target.value.trim() || '冒險者'; persist(); renderRight(); }
    if (e.target.id === 'setSpeak') { save.autoSpeak = e.target.checked; persist(); }
  });
  $('#settingBox').addEventListener('click', e => {
    if (e.target.id === 'setReset' && confirm('確定要清除所有進度嗎？')) {
      localStorage.removeItem(SAVE_KEY); save = loadSave(); persist(); show('home'); setup(1); toast('已重置');
    }
  });
  document.addEventListener('keydown', onKey);

  setup(unlocked(save.current) ? save.current : 1);
  if (save.streak > 1) toast(`📅 連續簽到 ${save.streak} 天，太棒了！`);
}
init();
})();
