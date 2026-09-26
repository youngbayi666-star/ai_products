import { sampleWave } from './waveform.js';

const COLORS = { pulse: '#dfff64', glow: '#ffaaa7', roam: '#ffc48d', wild: '#8cf1ed' };
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function pseudo(seed) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xFFFFFFFF;
}

function muralGeometry(width, height) {
  const cx = width < 700 ? width * .52 : width * .58;
  const cy = height * .5;
  const unit = Math.min(width < 700 ? width * 1.15 : width, height);
  return { cx, cy, unit, base: unit * .18 };
}

export function muralPlacement(echo, width, height) {
  const { cx, cy, unit, base } = muralGeometry(width, height);
  const arc = .74 + pseudo(echo.seed + 3) * .40;
  const jitter = (pseudo(echo.seed + echo.id * 97) - .5) * .24;
  const middle = (echo.id * GOLDEN_ANGLE + jitter) % (Math.PI * 2) - Math.PI;
  return {
    cx, cy,
    radius: base + unit * (.08 + (echo.id % 5) * .064),
    angleStart: middle - arc / 2,
    arc
  };
}

export function drawMural(canvas, snapshot = { echoes: [] }, highlightId = 0, progress = 1) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width);
  const height = Math.max(320, rect.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const background = ctx.createRadialGradient(width * .67, height * .47, 20, width * .67, height * .5, width * .65);
  background.addColorStop(0, '#22254b');
  background.addColorStop(.45, '#141737');
  background.addColorStop(1, '#080b1d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const { cx, cy, unit, base } = muralGeometry(width, height);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, base + i * unit * .092, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(178, 186, 240, ${.11 - i * .015})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 95; i += 1) {
    const x = pseudo(i * 817 + 13) * width;
    const y = pseudo(i * 1763 + 11) * height;
    ctx.fillStyle = `rgba(223, 229, 255, ${.08 + pseudo(i * 29) * .22})`;
    ctx.fillRect(x, y, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
  }

  // A few faint guide tracks make the canvas feel alive even before its first real contribution.
  const guides = ['pulse', 'glow', 'roam', 'wild'];
  guides.forEach((persona, index) => {
    ctx.beginPath();
    for (let step = 0; step <= 140; step += 1) {
      const t = step / 140;
      const angle = (index * .5 + t * .36 + .05) * Math.PI * 2;
      const radius = base + unit * (.11 + index * .045) + sampleWave(persona, t, 911 + index) * 5;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = COLORS[persona] + '24';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const echoes = snapshot.echoes || [];
  echoes.forEach((echo, index) => {
    const isNew = echo.id === highlightId;
    // Evenly advance contributions around the circle, with a small seed-based variation.
    const { angleStart, radius, arc } = muralPlacement(echo, width, height);
    const maxStep = Math.max(1, Math.round(96 * (isNew ? progress : 1)));
    ctx.beginPath();
    for (let step = 0; step <= maxStep; step += 1) {
      const t = step / 96;
      const angle = angleStart + t * arc;
      const wave = sampleWave(echo.persona, t, echo.seed) * (isNew ? 17 : 11);
      const x = cx + Math.cos(angle) * (radius + wave);
      const y = cy + Math.sin(angle) * (radius + wave);
      if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const recentness = .4 + .6 * (index + 1) / Math.max(1, echoes.length);
    ctx.strokeStyle = COLORS[echo.persona] || '#dfff64';
    ctx.globalAlpha = isNew ? 1 : recentness * .85;
    ctx.lineWidth = isNew ? 5 : 3.2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = isNew ? 23 : 12;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if (isNew && progress > .96) {
      const angle = angleStart + arc;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 7, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[echo.persona];
      ctx.fill();
    }
  });

  const core = ctx.createRadialGradient(cx - 28, cy - 38, 1, cx, cy, base * .73);
  core.addColorStop(0, '#494b7a');
  core.addColorStop(.68, '#171a3b');
  core.addColorStop(1, '#090d26');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, base * .74, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 238, 255, .28)';
  ctx.lineWidth = 1;
  [0.31, .48, .65].forEach(scale => { ctx.beginPath(); ctx.arc(cx, cy, base * scale, 0, Math.PI * 2); ctx.stroke(); });
  ctx.fillStyle = '#e5fc88';
  ctx.font = `900 ${Math.max(20, Math.round(base * .25))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ECHO', cx, cy + 6);
  ctx.textAlign = 'left';
}
