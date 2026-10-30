import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyModelAccess,
  filterArenaModels,
  isValidArenaDataset,
} from '../public/arena-data.js';

test('Arena snapshot stays separate and supports model filtering', async () => {
  const payload = JSON.parse(
    await readFile(
      new URL('../public/data/arena-text.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(isValidArenaDataset(payload), true);
  assert.ok(payload.models.length > 100);
  assert.equal(payload.source.license, 'CC BY 4.0');
  assert.ok(payload.source.datasetUrl.includes(payload.source.revision));
  assert.equal(
    isValidArenaDataset({
      ...payload,
      models: [{ ...payload.models[0], rank: 2 }],
    }),
    false,
  );
  assert.equal(
    isValidArenaDataset({
      ...payload,
      source: { ...payload.source, datasetUrl: 'javascript:alert(1)' },
    }),
    false,
  );
  const openModels = filterArenaModels(payload.models);
  assert.ok(openModels.length > 100);
  assert.ok(
    openModels.every((model) => classifyModelAccess(model) === 'open-weight'),
  );
  assert.ok(
    openModels.every(
      (model, index) => index === 0 || model.rank > openModels[index - 1].rank,
    ),
  );
  assert.equal(
    filterArenaModels(payload.models, { access: 'all' }).length,
    payload.models.length,
  );
  const closed = filterArenaModels(payload.models, {
    query: 'claude',
    access: 'proprietary',
  });
  assert.ok(closed.length > 0);
  assert.ok(
    closed.every(
      (model) =>
        model.name.toLowerCase().includes('claude') &&
        model.license === 'Proprietary',
    ),
  );
});

test('open-weight scope recognizes known licenses and keeps unknown licenses pending', () => {
  for (const license of [
    'MIT',
    ' Apache-2.0 ',
    'Llama 3.1 Community',
    'CC-BY-NC-4.0',
    'Kimi K3 license',
  ]) {
    assert.equal(classifyModelAccess({ license }), 'open-weight', license);
  }
  assert.equal(
    classifyModelAccess({ license: ' Proprietary ' }),
    'proprietary',
  );
  for (const license of ['Other', '', 'New custom license', undefined]) {
    assert.equal(classifyModelAccess({ license }), 'unknown');
  }
  const models = [
    {
      rank: 1,
      name: 'API model',
      organization: 'Vendor',
      license: 'Proprietary',
    },
    { rank: 2, name: 'Pending model', organization: 'Lab', license: 'Other' },
    { rank: 3, name: 'Open model', organization: 'Lab', license: 'MIT' },
  ];
  assert.deepEqual(
    filterArenaModels(models).map((model) => model.rank),
    [3],
  );
  assert.deepEqual(
    filterArenaModels(models, { query: 'lab', access: 'all' }).map(
      (model) => model.rank,
    ),
    [2, 3],
  );
});
