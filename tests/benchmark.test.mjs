import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDataset, isValidResult, isValidWorkload, sortAndFilter } from '../public/benchmark.js';

const workload = { id: 'short', label: '短输入', hardware: '8 GPUs', inputTokens: 1028, outputTokens: 128 };
const base = {
  workloadId: 'short', model: 'Model A', release: '2026-10-24', concurrency: 32,
  measuredAt: '2026-10-24T00:00:00Z', sourceUrl: 'https://example.com/run',
};
const results = [
  { ...base, engine: 'vLLM', metrics: { outputTps: 500, ttftSeconds: 2, requestDecodeTps: 40, e2eSeconds: 5 } },
  { ...base, engine: 'DeepInfer', metrics: { outputTps: 700, ttftSeconds: 1, requestDecodeTps: 30, e2eSeconds: 4 } },
  { ...base, engine: 'SGLang', concurrency: 64, metrics: { outputTps: null, ttftSeconds: null, e2eSeconds: 8 } },
];

test('sorts metrics in the correct direction and puts missing values last', () => {
  assert.deepEqual(sortAndFilter(results, 'throughput').map((row) => row.engine), ['DeepInfer', 'vLLM', 'SGLang']);
  assert.deepEqual(sortAndFilter(results, 'ttft').map((row) => row.engine), ['DeepInfer', 'vLLM', 'SGLang']);
});

test('filters by comparable workload, concurrency and search term', () => {
  assert.deepEqual(sortAndFilter(results, 'throughput', { workloadId: 'short', concurrency: 32, query: 'vllm' }).map((row) => row.engine), ['vLLM']);
  assert.deepEqual(sortAndFilter(results, 'throughput', { concurrency: 64 }).map((row) => row.engine), ['SGLang']);
});

test('validates workload and published result provenance', () => {
  assert.equal(isValidWorkload(workload), true);
  assert.equal(isValidWorkload({ ...workload, inputTokens: 0 }), false);
  assert.equal(isValidResult(results[0]), true);
  assert.equal(isValidResult({ ...results[0], sourceUrl: 'http://example.com/run' }), false);
  assert.equal(isValidResult({ ...results[0], metrics: { outputTps: '500' } }), false);
  assert.equal(isValidDataset({ publishedAt: '2026-10-24T00:00:00Z', workloads: [workload], results }), true);
  assert.equal(isValidDataset({ publishedAt: '2026-10-24T00:00:00Z', workloads: [], results }), false);
});
