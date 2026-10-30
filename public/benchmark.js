export const METRICS = {
  throughput: {
    title: '总吞吐',
    unit: 'token/s',
    description: '整个测量批次每秒完成的输出 token 数。相同负载与并发度下比较。',
    direction: '↑ 越高越好',
    field: 'outputTps',
    ascending: false,
    format: (value) => `${formatNumber(value, 1)} token/s`,
  },
  ttft: {
    title: '首 Token 延迟',
    unit: '秒',
    description: '客户端从发出请求到收到首个非空输出的平均时间。',
    direction: '↓ 越低越好',
    field: 'ttftSeconds',
    ascending: true,
    format: (value) => `${formatNumber(value, 2)} s`,
  },
  decode: {
    title: '单请求解码速度',
    unit: 'token/s / 请求',
    description: '逐请求计算首 Token 后的输出速率，再按请求聚合。',
    direction: '↑ 越高越好',
    field: 'requestDecodeTps',
    ascending: false,
    format: (value) => `${formatNumber(value, 1)} token/s`,
  },
  e2e: {
    title: '端到端时间',
    unit: '秒',
    description: '客户端从发出请求到收到完整输出的平均耗时。',
    direction: '↓ 越低越好',
    field: 'e2eSeconds',
    ascending: true,
    format: (value) => `${formatNumber(value, 2)} s`,
  },
};

function formatNumber(value, digits) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function metricValue(result, metric) {
  return result.metrics?.[METRICS[metric].field];
}

export function sortAndFilter(results, metric, { query = '', workloadId = null, concurrency = null, sort = 'best' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return results.filter((result) => (
    (workloadId == null || result.workloadId === workloadId)
    && (concurrency == null || result.concurrency === concurrency)
    && `${result.model} ${result.engine} ${result.release}`.toLocaleLowerCase().includes(needle)
  )).sort((a, b) => {
    if (sort === 'name') return rowName(a).localeCompare(rowName(b), 'zh-CN');
    const aValue = metricValue(a, metric);
    const bValue = metricValue(b, metric);
    if (aValue == null) return bValue == null ? rowName(a).localeCompare(rowName(b), 'zh-CN') : 1;
    if (bValue == null) return -1;
    return (aValue - bValue) * (METRICS[metric].ascending ? 1 : -1) || rowName(a).localeCompare(rowName(b), 'zh-CN');
  });
}

function rowName(result) {
  return `${result.engine} ${result.release} ${result.model}`;
}

function isHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function isValidWorkload(workload) {
  return typeof workload?.id === 'string' && workload.id.trim() !== ''
    && typeof workload.label === 'string' && workload.label.trim() !== ''
    && typeof workload.hardware === 'string' && workload.hardware.trim() !== ''
    && Number.isInteger(workload.inputTokens) && workload.inputTokens > 0
    && Number.isInteger(workload.outputTokens) && workload.outputTokens > 0;
}

export function isValidResult(result) {
  const metrics = result?.metrics;
  return typeof result?.workloadId === 'string' && result.workloadId.trim() !== ''
    && typeof result.model === 'string' && result.model.trim() !== ''
    && typeof result.engine === 'string' && result.engine.trim() !== ''
    && typeof result.release === 'string' && result.release.trim() !== ''
    && Number.isInteger(result.concurrency) && result.concurrency > 0
    && typeof result.measuredAt === 'string' && Number.isFinite(Date.parse(result.measuredAt))
    && isHttpsUrl(result.sourceUrl)
    && metrics && typeof metrics === 'object' && !Array.isArray(metrics)
    && Object.values(METRICS).every(({ field }) => metrics[field] == null
      || (typeof metrics[field] === 'number' && Number.isFinite(metrics[field]) && metrics[field] >= 0))
    && Object.values(METRICS).some(({ field }) => metrics[field] != null);
}

export function isValidDataset(payload) {
  const workloads = payload?.workloads;
  const results = payload?.results;
  if (!Array.isArray(workloads) || !Array.isArray(results)) return false;
  const ids = workloads.map((workload) => workload.id);
  return workloads.every(isValidWorkload) && new Set(ids).size === ids.length
    && results.every(isValidResult)
    && results.every((result) => ids.includes(result.workloadId))
    && (results.length === 0 || payload.publishedAt != null)
    && (payload.publishedAt == null || (typeof payload.publishedAt === 'string'
      && Number.isFinite(Date.parse(payload.publishedAt))));
}
