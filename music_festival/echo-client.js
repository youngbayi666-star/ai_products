import { supabaseConfig } from './supabase-config.js';

const staticHost = location.hostname.endsWith('.github.io')
  || new URLSearchParams(location.search).has('static-demo');
export const sharedWall = Boolean(supabaseConfig.url && supabaseConfig.publishableKey);
// GitHub Pages without a connected database offers an explicitly local demo.
export const staticDemo = staticHost && !sharedWall;

const KEY = 'echo-wave-static-demo-v1';
let memorySnapshot = { count: 0, echoes: [] };

function readDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && Number.isInteger(value.count) && Array.isArray(value.echoes)) return value;
  } catch { /* Private browsing may disable localStorage. */ }
  return memorySnapshot;
}

function writeDemo(snapshot) {
  memorySnapshot = snapshot;
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* Keep this tab usable. */ }
}

export async function getEchoes() {
  if (sharedWall) {
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, '')}/rest/v1/rpc/festival_wall`, {
      method: 'POST', headers: { apikey: supabaseConfig.publishableKey }
    });
    if (!response.ok) throw new Error('Shared mural unavailable');
    return response.json();
  }
  if (staticDemo) return readDemo();
  const response = await fetch('./api/echoes', { cache: 'no-store' });
  if (!response.ok) throw new Error('Mural unavailable');
  return response.json();
}

export async function addEcho({ persona, style, seed }) {
  if (sharedWall) {
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, '')}/rest/v1/festival_echoes?select=id,persona,style,seed,created_at`, {
      method: 'POST',
      headers: { apikey: supabaseConfig.publishableKey, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ persona, style, seed })
    });
    if (!response.ok) throw new Error('Shared contribution unavailable');
    const [echo] = await response.json();
    return { id: echo.id, persona: echo.persona, style: echo.style, seed: echo.seed, createdAt: Date.parse(echo.created_at) / 1000 };
  }
  if (staticDemo) {
    const current = readDemo();
    const echo = { id: current.count + 1, persona, style, seed, createdAt: Math.floor(Date.now() / 1000) };
    writeDemo({ count: echo.id, echoes: [...current.echoes, echo].slice(-80) });
    return echo;
  }
  const response = await fetch('./api/echoes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona, style, seed })
  });
  if (!response.ok) throw new Error('Contribution unavailable');
  return (await response.json()).echo;
}

export function qrSource(url) {
  if (!staticHost) return `./api/qr?text=${encodeURIComponent(url)}`;
  const qr = window.qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createDataURL(5, 4);
}
