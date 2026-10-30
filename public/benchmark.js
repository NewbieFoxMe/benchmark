export const METRICS = {
  quality: {
    title: '综合质量',
    description: '固定题集上的综合得分。具体题集、配置与计分方式随结果公开。',
    direction: '↑ 越高越好',
    field: 'qualityScore',
    ascending: false,
    format: (value) => `${formatNumber(value, 1)} 分`,
  },
  speed: {
    title: '输出速度',
    description: '开始输出后每秒生成的 token 数，按统一采样配置测量。',
    direction: '↑ 越高越好',
    field: 'outputTps',
    ascending: false,
    format: (value) => `${formatNumber(value, 0)} token/s`,
  },
  latency: {
    title: '首字延迟',
    description: '从请求发出到收到首个输出 token 的时间。',
    direction: '↓ 越低越好',
    field: 'ttftSeconds',
    ascending: true,
    format: (value) => `${formatNumber(value, 2)} s`,
  },
  price: {
    title: '输出价格',
    description: '提供商公布的每百万输出 token 美元价格。',
    direction: '↓ 越低越好',
    field: 'outputUsdPerMillion',
    ascending: true,
    format: (value) => `$${formatNumber(value, 2)} / 1M`,
  },
};

function formatNumber(value, digits) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function metricValue(result, metric) {
  return metric === 'price' ? result.pricing?.outputUsdPerMillion : result.metrics?.[METRICS[metric].field];
}

export function sortAndFilter(results, metric, query = '', sort = 'best') {
  const needle = query.trim().toLocaleLowerCase();
  return results.filter((result) => `${result.model} ${result.provider}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === 'name') return a.model.localeCompare(b.model, 'zh-CN');
      const aValue = metricValue(a, metric);
      const bValue = metricValue(b, metric);
      if (aValue == null) return bValue == null ? a.model.localeCompare(b.model, 'zh-CN') : 1;
      if (bValue == null) return -1;
      return (aValue - bValue) * (METRICS[metric].ascending ? 1 : -1) || a.model.localeCompare(b.model, 'zh-CN');
    });
}

export function isValidResult(result) {
  const metrics = result?.metrics;
  const pricing = result?.pricing;
  const validNumber = (value) => value == null || (typeof value === 'number' && Number.isFinite(value));
  const validUrl = (value) => {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  };
  return typeof result?.model === 'string' && result.model.trim() !== ''
    && typeof result.provider === 'string' && result.provider.trim() !== ''
    && typeof result.measuredAt === 'string' && Number.isFinite(Date.parse(result.measuredAt))
    && validUrl(result.runUrl)
    && metrics && typeof metrics === 'object'
    && ['qualityScore', 'outputTps', 'ttftSeconds'].every((key) => validNumber(metrics[key]))
    && (metrics.outputTps == null || metrics.outputTps >= 0)
    && (metrics.ttftSeconds == null || metrics.ttftSeconds >= 0)
    && (pricing == null || (validNumber(pricing.outputUsdPerMillion)
      && (pricing.outputUsdPerMillion == null || (pricing.outputUsdPerMillion >= 0 && validUrl(pricing.sourceUrl)))));
}
