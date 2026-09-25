const TAU = Math.PI * 2;

function triangle(value) {
  const phase = ((value % 1) + 1) % 1;
  return 1 - 4 * Math.abs(phase - .5);
}

export function sampleWave(persona, position, seed = 1) {
  const t = Math.max(0, Math.min(1, position));
  const phase = ((seed >>> 0) % 997) / 997;
  const envelope = Math.sin(Math.PI * t) ** .55;
  let value;
  switch (persona) {
    case 'glow':
      value = .55 * Math.sin(TAU * (2.2 * t + phase)) + .3 * Math.sin(TAU * (3.4 * t - phase * .7));
      break;
    case 'roam':
      value = .72 * Math.sin(TAU * (1.15 * t + phase * .25)) + .12 * Math.sin(TAU * (2.5 * t + phase));
      break;
    case 'wild':
      value = .6 * triangle(4.7 * t + phase) + .2 * Math.sin(TAU * (13 * t + phase));
      break;
    default:
      value = .35 * Math.sin(TAU * (8 * t + phase)) + .55 * Math.sin(TAU * (3 * t + phase)) ** 7;
  }
  return Math.max(-1, Math.min(1, value * envelope));
}

export function drawWave(ctx, persona, seed, { x, y, width, height, color, lineWidth = 3, alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = persona === 'wild' ? 'square' : 'round';
  ctx.lineJoin = persona === 'wild' ? 'miter' : 'round';
  ctx.beginPath();
  for (let index = 0; index <= 120; index += 1) {
    const t = index / 120;
    const py = y + sampleWave(persona, t, seed) * height;
    if (index === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x + width * t, py);
  }
  ctx.stroke();
  ctx.restore();
}
