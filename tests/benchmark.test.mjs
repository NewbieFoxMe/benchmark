import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isValidDataset, isValidResult, isValidWorkload, sortAndFilter } from '../public/benchmark.js';
import { buildChartView } from '../public/charts.js';

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

test('published results match the audited aggregate evidence', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/results.json', import.meta.url), 'utf8'));
  const evidenceFile = await readFile(new URL('../public/data/evidence/2026-10-24-concurrency-plot-data.json', import.meta.url));
  const evidence = JSON.parse(evidenceFile);
  assert.equal(createHash('sha256').update(evidenceFile).digest('hex'), 'db35811228d5ee568400abf7400ac9371d4ecb1839ce628e2810ec65e05a6d56');
  assert.equal(isValidDataset(dataset), true);
  assert.equal(dataset.workloads.length, 1);
  assert.equal(dataset.results.length, 21);

  const releases = new Map([
    ['recipe-sm120-capacity256-deepinfer-index512-20261024', 'DeepInfer'],
    ['sglang-tp8-gdr-capacity256-mem74-graph32-20261024', 'SGLang'],
    ['vllm-tp4-dp2-ep8-capacity256-20261024', 'vLLM'],
  ]);
  const keys = new Set();
  for (const series of evidence.filter((item) => releases.has(item.release))) {
    const engine = releases.get(series.release);
    assert.deepEqual(series.rows.map((row) => row.concurrency), [1, 8, 16, 32, 64, 128, 256]);
    for (const row of series.rows) {
      const result = dataset.results.find((item) => item.engine === engine && item.concurrency === row.concurrency);
      assert.ok(result, `${engine} C${row.concurrency}`);
      keys.add(`${result.workloadId}/${result.model}/${result.engine}/${result.release}/${result.concurrency}`);
      assert.equal(result.metrics.outputTps, row.output_tokens_per_second_mean);
      assert.equal(result.metrics.ttftSeconds, row.ttft_mean_ms / 1000);
      assert.equal(result.metrics.requestDecodeTps, row.request_decode_tokens_per_second);
      assert.equal(result.metrics.e2eSeconds, row.e2e_mean_ms / 1000);
    }
  }
  assert.equal(keys.size, dataset.results.length);
});

test('chart series preserve concurrency levels and metric values', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/results.json', import.meta.url), 'utf8'));
  const view = buildChartView(dataset.results, 'short-1028-128', 'throughput');
  assert.deepEqual(view.levels, [1, 8, 16, 32, 64, 128, 256]);
  assert.deepEqual(view.series.map((item) => item.label), ['DeepInfer', 'SGLang', 'vLLM']);
  assert.equal(view.series[0].values.get(32), 713.4327353519229);
  assert.equal(view.series[2].values.get(256), 759.5940542481228);
  assert.deepEqual(buildChartView(dataset.results, 'short-1028-128', 'ttft', 'sglang').series.map((item) => item.label), ['SGLang']);
});
