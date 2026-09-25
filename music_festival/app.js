import { artworkReady, ensureArtwork, PERSONAS, renderPoster, encodePayload } from './poster.js';
import { drawMural } from './mural.js';
import { addEcho, getEchoes, qrSource, staticDemo } from './echo-client.js';

const form = document.getElementById('poster-form');
const nickname = document.getElementById('nickname');
const message = document.getElementById('message');
const error = document.getElementById('form-error');
const previewCanvas = document.getElementById('poster-canvas');
const resultCanvas = document.getElementById('result-canvas');
const overlay = document.getElementById('result-overlay');
const appShell = document.querySelector('.app-shell');
const generateButton = document.getElementById('generate');
const qrImage = document.getElementById('qr-image');
const qrFallback = document.getElementById('qr-fallback');
const attract = document.getElementById('attract-screen');
const muralCanvas = document.getElementById('mural-canvas');
const muralTitle = document.getElementById('attract-title');
const muralDescription = document.getElementById('attract-description');
let selectedPersona = 'pulse';
let selectedStyle = 'neon';
let resultUrl = '';
let muralSnapshot = { count: 0, echoes: [] };
let idleTimer;
let resultInterval;
let generationId = 0;
let lanHost = '';

if (!staticDemo) fetch('./api/config').then(r => r.ok ? r.json() : null).then(data => { lanHost = data?.lanHost || ''; }).catch(() => {});
if (staticDemo) {
  document.querySelector('.mural-counter p').textContent = '当前浏览器中的演示声波';
  document.querySelector('.attract-footnote').textContent = '静态演示 · 声波仅保存在当前浏览器';
}

function renderMural(highlightId = 0, progress = 1) {
  document.getElementById('echo-count').textContent = String(muralSnapshot.count || 0).padStart(4, '0');
  drawMural(muralCanvas, muralSnapshot, highlightId, progress);
}
async function fetchEchoes(shouldRender = true) {
  try {
    muralSnapshot = await getEchoes();
    if (shouldRender) renderMural();
    return true;
  } catch { if (shouldRender) renderMural(); return false; }
}
window.addEventListener('resize', () => renderMural());
document.getElementById('attract-start').addEventListener('click', () => {
  attract.hidden = true;
  appShell.inert = false;
  resetIdle();
});
appShell.inert = true;
fetchEchoes();
// An idle display can stay open as the audience wall while another device contributes.
setInterval(() => {
  if (!attract.hidden && !attract.classList.contains('is-joining')) fetchEchoes();
}, 5000);

function graphemes(value) {
  if (Intl.Segmenter) return [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(value)].length;
  return Array.from(value).length;
}

function currentPayload() {
  return { persona: selectedPersona, style: selectedStyle, nickname: nickname.value.trim() || '你的名字', message: message.value.trim() || '今晚，和世界同频', seed: 1 };
}

function updatePreview() { renderPoster(previewCanvas, currentPayload()); }
artworkReady.then(updatePreview);

function showError(text) { error.textContent = text; error.hidden = !text; }

function validate() {
  const name = nickname.value.trim().normalize('NFKC');
  const line = message.value.trim().normalize('NFKC');
  if (!name) return '先留下你的昵称，再生成海报。';
  if (!line) return '写一句想留在海报上的话。';
  if (graphemes(name) > 12) return '昵称最多 12 个字，请缩短一点。';
  if (graphemes(line) > 24) return '这句话最多 24 个字，请缩短一点。';
  const all = `${name} ${line}`;
  if (/[\u0000-\u001f\u007f]/.test(all)) return '请移除换行或特殊控制字符。';
  if (/(?:\+?86[-\s]?)?1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|(?:微信|vx|qq)\s*[:：]?\s*\d{5,}/i.test(all)) return '请勿填写手机号、网址或联系账号。';
  if (/(色情|约炮|自杀|毒品|炸弹|杀人|仇恨)/.test(all)) return '这句话暂时无法用于公开海报，请换一种表达。';
  return '';
}

function select(group, attr, value) {
  document.querySelectorAll(`[${attr}]`).forEach(button => {
    const active = button.dataset[attr.replace('data-', '')] === value;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (group === 'persona') selectedPersona = value;
  else selectedStyle = value;
  document.querySelector('.poster-stage').dataset.persona = selectedPersona;
  updatePreview();
  if (group === 'persona') ensureArtwork(value).then(() => { if (selectedPersona === value) updatePreview(); });
  resetIdle();
}

document.querySelectorAll('[data-persona]').forEach(button => button.addEventListener('click', () => select('persona', 'data-persona', button.dataset.persona)));
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => select('style', 'data-style', button.dataset.style)));
document.querySelectorAll('[data-text]').forEach(button => button.addEventListener('click', () => { message.value = button.dataset.text; message.focus(); updatePreview(); resetIdle(); }));
[nickname, message].forEach(input => input.addEventListener('input', () => { showError(''); updatePreview(); resetIdle(); }));

function shareLink(payload) {
  const url = new URL('./share.html', window.location.href);
  if (lanHost && ['localhost', '127.0.0.1'].includes(url.hostname)) url.hostname = lanHost;
  url.searchParams.set('p', encodePayload(payload));
  return url.toString();
}

function startResultTimer() {
  clearInterval(resultInterval);
  let remaining = 30;
  const label = document.getElementById('result-timer');
  label.textContent = `${remaining} 秒后自动清屏`;
  resultInterval = setInterval(() => {
    remaining -= 1;
    label.textContent = `${remaining} 秒后自动清屏`;
    if (remaining <= 0) resetAll(true);
  }, 1000);
}

function openResult(payload) {
  renderPoster(resultCanvas, payload);
  document.getElementById('result-echo').textContent = payload.echoId
    ? `第 ${String(payload.echoId).padStart(4, '0')} 道回声，已加入今晚的共振谱。`
    : '海报已生成；共振谱暂不可用，你仍可扫码保存。';
  resultUrl = shareLink(payload);
  qrImage.hidden = false;
  qrFallback.hidden = true;
  try { qrImage.src = qrSource(resultUrl); }
  catch { qrImage.hidden = true; qrFallback.hidden = false; }
  overlay.hidden = false;
  appShell.inert = true;
  clearTimeout(idleTimer);
  startResultTimer();
  document.getElementById('download-btn').focus();
}

qrImage.addEventListener('error', () => { qrImage.hidden = true; qrFallback.hidden = false; });

async function showContribution(echo, token) {
  attract.hidden = false;
  attract.classList.add('is-joining');
  appShell.inert = true;
  muralTitle.innerHTML = `第 ${echo.id} 道回声，<br><em>已加入今晚。</em>`;
  muralDescription.textContent = `${PERSONAS[echo.persona].name}的声波，成为全场共创作品的一部分。`;
  const loaded = await fetchEchoes(false);
  if (!loaded) {
    muralSnapshot = { count: echo.id, echoes: [...muralSnapshot.echoes, echo].slice(-80) };
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise(resolve => {
    const duration = reduced ? 1 : 1200;
    const start = performance.now();
    const frame = now => {
      if (token !== generationId) { resolve(); return; }
      const progress = Math.min(1, (now - start) / duration);
      renderMural(echo.id, progress);
      if (progress < 1) requestAnimationFrame(frame);
      else setTimeout(resolve, reduced ? 150 : 330);
    };
    requestAnimationFrame(frame);
  });
  attract.classList.remove('is-joining');
  attract.hidden = true;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (generateButton.disabled) return;
  const validation = validate();
  if (validation) { showError(validation); (nickname.value.trim() ? message : nickname).focus(); return; }
  showError('');
  const thisGeneration = ++generationId;
  const payload = { ...currentPayload(), seed: crypto.getRandomValues(new Uint32Array(1))[0] };
  generateButton.disabled = true;
  generateButton.querySelector('span').textContent = '正在制作海报…';
  await ensureArtwork(payload.persona);
  await new Promise(resolve => setTimeout(resolve, 330));
  if (thisGeneration !== generationId) return;
  let echo = null;
  try {
    echo = await addEcho({ persona: payload.persona, style: payload.style, seed: payload.seed });
  } catch { /* The poster still works if the live wall is temporarily unavailable. */ }
  if (thisGeneration !== generationId) return;
  generateButton.disabled = false;
  generateButton.querySelector('span').textContent = '生成我的专属海报';
  if (echo) await showContribution(echo, thisGeneration);
  if (thisGeneration !== generationId) return;
  openResult({ ...payload, echoId: echo?.id || 0 });
});

function downloadCanvas(canvas) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'ECHO-WAVE-我的音乐海报.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
document.getElementById('download-btn').addEventListener('click', () => downloadCanvas(resultCanvas));
document.getElementById('copy-btn').addEventListener('click', async event => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(resultUrl);
    button.textContent = '链接已复制';
  } catch {
    const field = document.createElement('input');
    field.value = resultUrl;
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    button.textContent = copied ? '链接已复制' : '请手动复制地址';
  }
});

function resetIdle() {
  if (!overlay.hidden || !attract.hidden) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => resetAll(true), 60000);
}

function resetAll(toAttract = true) {
  ++generationId;
  clearTimeout(idleTimer);
  clearInterval(resultInterval);
  overlay.hidden = true;
  attract.classList.remove('is-joining');
  muralTitle.innerHTML = '今晚的声音，<br><em>由我们一起画。</em>';
  muralDescription.textContent = '选择你的音乐人格，生成一张专属海报，也为这场音乐节留下自己的声波。';
  form.reset();
  selectedPersona = 'pulse';
  selectedStyle = 'neon';
  select('persona', 'data-persona', 'pulse');
  select('style', 'data-style', 'neon');
  showError('');
  resultUrl = '';
  qrImage.removeAttribute('src');
  resultCanvas.getContext('2d').clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  document.getElementById('copy-btn').textContent = '复制分享链接';
  generateButton.disabled = false;
  generateButton.querySelector('span').textContent = '生成我的专属海报';
  attract.hidden = !toAttract;
  appShell.inert = toAttract;
  if (toAttract) { clearTimeout(idleTimer); fetchEchoes(); renderMural(); }
  else { resetIdle(); nickname.focus(); }
}
document.getElementById('reset-top').addEventListener('click', () => resetAll(true));
document.getElementById('again-btn').addEventListener('click', () => resetAll(false));
document.getElementById('result-close').addEventListener('click', () => resetAll(true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) resetAll(true); else if (event.key === 'Escape' && attract.hidden) resetAll(true); else if (overlay.hidden) resetIdle(); });
document.addEventListener('pointerdown', resetIdle);
resetIdle();
