const normalizeLicense = (license) =>
  license
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
const OPEN_WEIGHT_LICENSES = new Set(
  [
    'MIT',
    'Modified MIT',
    'Apache 2.0',
    'Kimi K3 license',
    'MiniMax Community License',
    'OpenMDW-1.1',
    'tencent-hunyuan-community',
    'Gemma',
    'Gemma license',
    'NVIDIA Open Model',
    'Nvidia Open',
    'Nvidia',
    'DeepSeek',
    'DeepSeek License',
    'CC-BY-NC-4.0',
    'CC-BY-NC-SA-4.0',
    'Llama',
    'Llama 2 Community',
    'Llama 3 Community',
    'Llama 3.1 Community',
    'Llama 3.1',
    'Llama 3.2',
    'Llama-3.3',
    'Llama 4',
    'Qwen',
    'Qianwen LICENSE',
    'Mistral Research',
    'MRL',
    'NexusFlow',
    'Jamba Open',
    'DBRX LICENSE',
    'Yi License',
    'AI2 ImpACT Low-risk',
    'Non-commercial',
    'Falcon-180B TII License',
  ].map(normalizeLicense),
);

export function classifyModelAccess(model) {
  const license = normalizeLicense(model.license ?? '');
  if (license === 'proprietary') return 'proprietary';
  return OPEN_WEIGHT_LICENSES.has(license) ? 'open-weight' : 'unknown';
}

export function isValidArenaDataset(payload) {
  const source = payload?.source;
  const models = payload?.models;
  if (!source || !Array.isArray(models) || models.length === 0) return false;
  if (
    typeof source.name !== 'string' ||
    !isHttpsUrl(source.url) ||
    !isHttpsUrl(source.datasetUrl) ||
    source.license !== 'CC BY 4.0' ||
    !/^[a-f0-9]{40}$/.test(source.revision) ||
    typeof source.publishedAt !== 'string' ||
    typeof source.retrievedAt !== 'string'
  )
    return false;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt) ||
    !Number.isFinite(Date.parse(source.retrievedAt))
  )
    return false;
  return models.every(
    (model, index) =>
      model.rank === index + 1 &&
      typeof model.name === 'string' &&
      model.name.trim() !== '' &&
      typeof model.organization === 'string' &&
      typeof model.license === 'string' &&
      [model.rating, model.ratingLower, model.ratingUpper].every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      ) &&
      model.ratingLower <= model.rating &&
      model.rating <= model.ratingUpper &&
      Number.isInteger(model.votes) &&
      model.votes >= 0,
  );
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function filterArenaModels(
  models,
  { query = '', access = 'open-weight' } = {},
) {
  const needle = query.trim().toLocaleLowerCase();
  return models
    .filter(
      (model) =>
        (access === 'all' || classifyModelAccess(model) === access) &&
        `${model.name} ${model.organization}`
          .toLocaleLowerCase()
          .includes(needle),
    )
    .sort((a, b) => a.rank - b.rank);
}
