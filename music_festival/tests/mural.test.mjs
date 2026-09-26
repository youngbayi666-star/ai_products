import test from 'node:test';
import assert from 'node:assert/strict';
import * as mural from '../mural.js';

test('the first nine contributions reach all four mural quadrants', () => {
  assert.equal(typeof mural.muralPlacement, 'function');
  const quadrants = new Map();
  for (let id = 1; id <= 9; id += 1) {
    const placement = mural.muralPlacement({ id, seed: id * 76391 }, 1440, 900);
    const middle = placement.angleStart + placement.arc / 2;
    const quadrant = `${Math.cos(middle) < 0 ? 'left' : 'right'}-${Math.sin(middle) < 0 ? 'top' : 'bottom'}`;
    quadrants.set(quadrant, (quadrants.get(quadrant) || 0) + 1);
    assert.ok(placement.cx < 1440 * .65, 'the mural center should leave room for waves on the left');
  }
  assert.equal(quadrants.size, 4);
  assert.ok(Math.max(...quadrants.values()) <= 4);
});
