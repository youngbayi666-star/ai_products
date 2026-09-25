import { drawWave } from './waveform.js';

export const PERSONAS = {
  pulse: { name: '夜行节拍', en: 'NIGHT PULSE', line: '把心跳交给低音', accent: '#dfff64', deep: '#0b0d28', artwork: './assets/soundwave-art.png' },
  glow: { name: '心动合唱', en: 'HEART CHORUS', line: '与万人同频发光', accent: '#ffafaa', deep: '#281329', artwork: './assets/heart-chorus.png' },
  roam: { name: '日落漫游', en: 'SUNSET ROAM', line: '沿着旋律走向晚霞', accent: '#ffc88f', deep: '#29182d', artwork: './assets/sunset-roam.png' },
  wild: { name: '自由电波', en: 'FREE SIGNAL', line: '每一拍都不设边界', accent: '#91f5f1', deep: '#0b2134', artwork: './assets/free-signal.png' }
};

export const STYLES = {
  neon: { name: '霓虹频谱', filter: 'saturate(1.14) contrast(1.04)', overlay: 'rgba(80, 55, 210, .06)' },
  sunset: { name: '落日胶片', filter: 'sepia(.12) saturate(1.12) hue-rotate(-7deg)', overlay: 'rgba(255, 123, 66, .10)' },
  silver: { name: '未来银幕', filter: 'saturate(.64) contrast(1.12) hue-rotate(9deg)', overlay: 'rgba(116, 186, 232, .11)' }
};

const images = new Map();
export function ensureArtwork(persona = 'pulse') {
  const key = PERSONAS[persona] ? persona : 'pulse';
  if (images.has(key)) return images.get(key).ready;
  const image = new Image();
  const ready = new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
  images.set(key, { image, ready });
  image.src = PERSONAS[key].artwork;
  return ready;
}
export const artworkReady = ensureArtwork('pulse');

export function safePayload(data = {}) {
  return {
    persona: PERSONAS[data.persona] ? data.persona : 'pulse',
    style: STYLES[data.style] ? data.style : 'neon',
    nickname: String(data.nickname || '你的名字').trim().slice(0, 24),
    message: String(data.message || '今晚，和世界同频').trim().slice(0, 80),
    seed: Number.isInteger(data.seed) && data.seed >= 0 && data.seed <= 0xFFFFFFFF ? data.seed : 1,
    echoId: Number.isInteger(data.echoId) && data.echoId > 0 && data.echoId <= 999999 ? data.echoId : 0
  };
}

export function encodePayload(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(safePayload(data)));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function publicTextAllowed(data) {
  const name = String(data.nickname || '').trim().normalize('NFKC');
  const line = String(data.message || '').trim().normalize('NFKC');
  const count = value => Intl.Segmenter ? [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(value)].length : Array.from(value).length;
  const all = `${name} ${line}`;
  return Boolean(name && line && count(name) <= 12 && count(line) <= 24
    && !/[\u0000-\u001f\u007f]/.test(all)
    && !/(?:\+?86[-\s]?)?1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|(?:微信|vx|qq)\s*[:：]?\s*\d{5,}/i.test(all)
    && !/(色情|约炮|自杀|毒品|炸弹|杀人|仇恨)/.test(all));
}

export function decodePayload(encoded) {
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return publicTextAllowed(data) ? safePayload(data) : null;
  } catch {
    return null;
  }
}

function fittedText(ctx, text, x, y, maxWidth, size, minSize = 40) {
  let currentSize = size;
  while (currentSize > minSize) {
    ctx.font = `900 ${currentSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    currentSize -= 2;
  }
  ctx.fillText(text, x, y, maxWidth);
}

function roundRect(ctx, x, y, w, h, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawPersonaMotif(ctx, persona, accent) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  if (persona === 'pulse') {
    ctx.globalAlpha = .66;
    [120, 171, 224].forEach(radius => { ctx.beginPath(); ctx.arc(819, 399, radius, -.35, 1.25); ctx.lineWidth = 2; ctx.stroke(); });
    for (let i = 0; i < 18; i += 1) ctx.fillRect(78 + i * 14, 652 - (i % 5) * 12, 7, 21 + (i % 5) * 12);
  } else if (persona === 'glow') {
    ctx.globalAlpha = .68;
    [0, 1, 2].forEach(i => { ctx.beginPath(); ctx.arc(176 + i * 103, 664, 74, Math.PI * 1.02, Math.PI * 1.97); ctx.lineWidth = 4; ctx.stroke(); });
    for (let i = 0; i < 11; i += 1) { ctx.beginPath(); ctx.arc(776 + i * 20, 741 - Math.sin(i * .7) * 15, 4 + i % 3, 0, Math.PI * 2); ctx.fill(); }
  } else if (persona === 'roam') {
    ctx.globalAlpha = .75;
    ctx.lineWidth = 3;
    [628, 646, 665].forEach(y => { ctx.beginPath(); ctx.moveTo(78, y); ctx.bezierCurveTo(320, y - 44, 620, y + 40, 1002, y - 12); ctx.stroke(); });
    for (let i = 0; i < 10; i += 1) { roundRect(ctx, 49, 278 + i * 46, 11, 18, 3, accent); roundRect(ctx, 1020, 278 + i * 46, 11, 18, 3, accent); }
  } else {
    ctx.globalAlpha = .9;
    ctx.lineWidth = 7;
    [[76, 695, 220, 642], [200, 704, 400, 631], [750, 705, 970, 620]].forEach(line => { ctx.beginPath(); ctx.moveTo(line[0], line[1]); ctx.lineTo(line[2], line[3]); ctx.stroke(); });
    for (let i = 0; i < 13; i += 1) ctx.fillRect(79 + i * 35, 753 + (i % 3) * 8, 15, 5);
  }
  ctx.restore();
}

export function renderPoster(canvas, rawData) {
  const data = safePayload(rawData);
  const persona = PERSONAS[data.persona];
  const style = STYLES[data.style];
  const image = images.get(data.persona)?.image;
  const accent = persona.accent;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 1080;
  const h = canvas.height = 1440;

  ctx.fillStyle = persona.deep;
  ctx.fillRect(0, 0, w, h);
  if (image?.naturalWidth) {
    ctx.save();
    ctx.filter = style.filter;
    ctx.drawImage(image, 0, 0, w, h);
    ctx.restore();
  }
  ctx.fillStyle = style.overlay;
  ctx.fillRect(0, 0, w, h);

  const topVeil = ctx.createLinearGradient(0, 0, 0, 240);
  topVeil.addColorStop(0, persona.deep + 'e8');
  topVeil.addColorStop(1, persona.deep + '00');
  ctx.fillStyle = topVeil;
  ctx.fillRect(0, 0, w, 240);

  // Transparent dark base keeps personalized type legible across all artwork variants.
  const veil = ctx.createLinearGradient(0, 700, 0, h);
  veil.addColorStop(0, 'rgba(10, 10, 33, 0)');
  veil.addColorStop(.32, persona.deep + 'aa');
  veil.addColorStop(1, persona.deep + 'f8');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 700, w, 740);

  drawPersonaMotif(ctx, data.persona, accent);

  ctx.strokeStyle = 'rgba(255,255,255,.54)';
  ctx.lineWidth = 2;
  if (data.persona === 'wild') ctx.setLineDash([19, 10]);
  ctx.strokeRect(42, 42, 996, 1356);
  ctx.setLineDash([]);

  ctx.fillStyle = accent;
  ctx.fillRect(76, 86, 26, 26);
  ctx.fillRect(110, 86, 11, 26);
  ctx.fillRect(129, 86, 6, 26);
  ctx.fillStyle = '#fff';
  ctx.font = '900 42px Arial, sans-serif';
  ctx.fillText('ECHO', 155, 116);
  ctx.font = '500 20px Arial, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('WAVE / 2026', 78, 159);
  ctx.textAlign = 'right';
  ctx.font = '700 23px Arial, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('FESTIVAL  /  PERSONAL PASS', 1002, 111);
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(255,255,255,.86)';
  ctx.font = '700 26px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(persona.line, 80, 786);
  roundRect(ctx, 76, 822, 282, 49, data.persona === 'glow' ? 22 : 4, accent);
  ctx.fillStyle = persona.deep;
  ctx.font = '800 24px Arial, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('YOUR MUSIC DNA', 95, 856);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#fff';
  fittedText(ctx, persona.name, 72, 999, 930, 110, 62);
  ctx.fillStyle = accent;
  ctx.font = '900 45px Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(persona.en, 79, 1065, 925);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillRect(77, 1101, 924, 2);
  ctx.fillStyle = '#fff';
  ctx.font = '700 31px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText('TO  ' + data.nickname, 78, 1162, 920);
  ctx.fillStyle = '#e4e4ee';
  fittedText(ctx, '“' + data.message + '”', 76, 1242, 925, 44, 30);

  drawWave(ctx, data.persona, data.seed, { x: 79, y: 1297, width: 920, height: 17, color: accent, lineWidth: 4, alpha: .95 });

  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '500 23px Arial, sans-serif';
  ctx.fillText('ECHO WAVE   /   KEEP THIS MOMENT LOUD', 78, 1345);
  ctx.textAlign = 'right';
  ctx.fillText(data.echoId ? `ECHO ${String(data.echoId).padStart(4, '0')}` : 'LIVE PREVIEW', 1001, 1345);
  ctx.textAlign = 'left';
  return canvas;
}
