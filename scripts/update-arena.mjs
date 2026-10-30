import { writeFile } from 'node:fs/promises';
import { isValidArenaDataset } from '../public/arena-data.js';

const dataset = 'lmarena-ai/leaderboard-dataset';
const config = 'text_style_control';
const output = new URL('../public/data/arena-text.json', import.meta.url);
const metadataUrl = `https://huggingface.co/api/datasets/${dataset}`;

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

const revision = (await json(metadataUrl)).sha;
const rows = [];
for (let offset = 0; ; offset += 100) {
  const url = new URL('https://datasets-server.huggingface.co/rows');
  for (const [key, value] of Object.entries({ dataset, config, split: 'latest', offset, length: 100 })) {
    url.searchParams.set(key, String(value));
  }
  const page = await json(url);
  if (page.rows.length === 0) break;
  for (const entry of page.rows) {
    if (entry.row.category !== 'overall') break;
    rows.push(entry.row);
  }
  if (rows.length < offset + page.rows.length) break;
}

if ((await json(metadataUrl)).sha !== revision) throw new Error('Arena dataset changed during download');
if (rows.length < 20 || rows[0].rank !== 1) throw new Error('Invalid Arena overall ranking');
const dates = new Set(rows.map((row) => row.leaderboard_publish_date));
if (dates.size !== 1 || rows.some((row, index) => index > 0 && row.rank < rows[index - 1].rank)) {
  throw new Error('Inconsistent Arena snapshot');
}

const payload = {
  source: {
    name: 'Arena Text Arena · Style Control',
    url: 'https://arena.ai/leaderboard/chat/text',
    datasetUrl: `https://huggingface.co/datasets/${dataset}/tree/${revision}/${config}`,
    license: 'CC BY 4.0',
    revision,
    publishedAt: [...dates][0],
    retrievedAt: new Date().toISOString(),
  },
  models: rows.map((row) => ({
    rank: row.rank,
    name: row.model_name,
    organization: row.organization,
    license: row.license,
    rating: row.rating,
    ratingLower: row.rating_lower,
    ratingUpper: row.rating_upper,
    votes: row.vote_count,
  })),
};

if (!isValidArenaDataset(payload)) throw new Error('Invalid Arena snapshot');
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`Arena ${payload.source.publishedAt}: ${payload.models.length} models\n`);
