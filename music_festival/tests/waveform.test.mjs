import test from 'node:test';
import assert from 'node:assert/strict';

let waveform;
try { waveform = await import('../waveform.js'); } catch { /* first red run */ }

test('personal wave is deterministic for the same seed', () => {
  assert.ok(waveform?.sampleWave, 'sampleWave must be implemented');
  const one = [0, .2, .4, .6, .8, 1].map(t => waveform.sampleWave('pulse', t, 12345));
  const two = [0, .2, .4, .6, .8, 1].map(t => waveform.sampleWave('pulse', t, 12345));
  assert.deepEqual(one, two);
  assert.ok(one.every(n => Number.isFinite(n) && Math.abs(n) <= 1));
});

test('each music persona has a different wave silhouette', () => {
  assert.ok(waveform?.sampleWave, 'sampleWave must be implemented');
  const samples = ['pulse', 'glow', 'roam', 'wild'].map(persona =>
    JSON.stringify([.13, .27, .49, .73].map(t => waveform.sampleWave(persona, t, 839))));
  assert.equal(new Set(samples).size, 4);
});
