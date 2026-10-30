import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidResult, sortAndFilter } from '../public/benchmark.js';

const results = [
  { model: 'Alpha', provider: 'One', measuredAt: '2026-10-30', runUrl: 'https://example.com/alpha', metrics: { qualityScore: 80, outputTps: 20, ttftSeconds: 2 } },
  { model: 'Beta', provider: 'Two', measuredAt: '2026-10-30', runUrl: 'https://example.com/beta', metrics: { qualityScore: 60, outputTps: 40, ttftSeconds: 1 } },
  { model: 'Gamma', provider: 'Three', measuredAt: '2026-10-30', runUrl: 'https://example.com/gamma', metrics: { qualityScore: null, outputTps: null, ttftSeconds: null } },
];

test('metric sorting handles direction and missing values', () => {
  assert.deepEqual(sortAndFilter(results, 'quality').map((row) => row.model), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(sortAndFilter(results, 'latency').map((row) => row.model), ['Beta', 'Alpha', 'Gamma']);
});

test('search matches model and provider', () => {
  assert.deepEqual(sortAndFilter(results, 'speed', 'two').map((row) => row.model), ['Beta']);
});

test('published rows require a date and HTTPS source', () => {
  assert.equal(isValidResult(results[0]), true);
  assert.equal(isValidResult({ ...results[0], runUrl: 'http://example.com' }), false);
  assert.equal(isValidResult({ ...results[0], pricing: { outputUsdPerMillion: 5 } }), false);
  assert.equal(isValidResult({ ...results[0], metrics: { outputTps: '20' } }), false);
});
