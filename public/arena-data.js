export function isValidArenaDataset(payload) {
  const source = payload?.source;
  const models = payload?.models;
  if (!source || !Array.isArray(models) || models.length === 0) return false;
  if (typeof source.name !== 'string' || !isHttpsUrl(source.url) || !isHttpsUrl(source.datasetUrl)
    || source.license !== 'CC BY 4.0' || !/^[a-f0-9]{40}$/.test(source.revision)
    || typeof source.publishedAt !== 'string' || typeof source.retrievedAt !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt) || !Number.isFinite(Date.parse(source.retrievedAt))) return false;
  return models.every((model, index) => model.rank === index + 1
    && typeof model.name === 'string' && model.name.trim() !== ''
    && typeof model.organization === 'string' && typeof model.license === 'string'
    && [model.rating, model.ratingLower, model.ratingUpper].every((value) => typeof value === 'number' && Number.isFinite(value))
    && model.ratingLower <= model.rating && model.rating <= model.ratingUpper
    && Number.isInteger(model.votes) && model.votes >= 0);
}

function isHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function filterArenaModels(models, { query = '', license = 'all' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return models.filter((model) => (
    (license === 'all' || (license === 'proprietary' ? model.license === 'Proprietary' : model.license !== 'Proprietary'))
    && `${model.name} ${model.organization}`.toLocaleLowerCase().includes(needle)
  )).sort((a, b) => a.rank - b.rank);
}
