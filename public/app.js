import { METRICS, isValidResult, metricValue, sortAndFilter } from './benchmark.js';

const state = { metric: 'quality', results: [], publishedAt: null, query: '', sort: 'best' };
const elements = {
  tabs: [...document.querySelectorAll('[data-metric]')],
  panel: document.querySelector('#board-content'),
  controls: document.querySelector('#board-controls'),
  resultsWrap: document.querySelector('#results-wrap'),
  resultsBody: document.querySelector('#results-body'),
  emptyState: document.querySelector('#empty-state'),
  search: document.querySelector('#search'),
  sort: document.querySelector('#sort'),
};

function setMetric(metric) {
  state.metric = metric;
  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.metric === metric;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) elements.panel.setAttribute('aria-labelledby', tab.id);
  });
  const selected = METRICS[metric];
  const index = Object.keys(METRICS).indexOf(metric) + 1;
  document.querySelector('#metric-code').textContent = `METRIC / ${String(index).padStart(2, '0')}`;
  document.querySelector('#metric-title').textContent = selected.title;
  document.querySelector('#metric-description').textContent = selected.description;
  document.querySelector('#metric-direction').textContent = selected.direction;
  document.querySelector('#metric-column').textContent = selected.title;
  renderRows();
}

function cell(text, className = '') {
  const td = document.createElement('td');
  td.className = className;
  td.textContent = text;
  return td;
}

function renderRows() {
  const matches = sortAndFilter(state.results, state.metric, state.query, state.sort);
  elements.resultsBody.replaceChildren();
  for (const result of matches) {
    const tr = document.createElement('tr');
    const name = cell('', 'model-cell');
    const strong = document.createElement('strong');
    strong.textContent = result.model;
    const provider = document.createElement('span');
    provider.textContent = result.provider;
    name.append(strong, provider);
    const value = metricValue(result, state.metric);
    const metricCell = cell(value == null ? '—' : METRICS[state.metric].format(value), 'value-cell');
    const date = cell(new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(result.measuredAt)));
    const source = cell('');
    const url = state.metric === 'price' ? result.pricing?.sourceUrl : result.runUrl;
    if (typeof url === 'string' && url.startsWith('https://')) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '查看 ↗';
      source.append(link);
    } else {
      source.textContent = '—';
    }
    tr.append(name, metricCell, date, source);
    elements.resultsBody.append(tr);
  }
  const hasData = state.results.length > 0;
  elements.controls.hidden = !hasData;
  elements.resultsWrap.hidden = !hasData || matches.length === 0;
  elements.emptyState.hidden = hasData && matches.length > 0;
  if (hasData && matches.length === 0) {
    elements.emptyState.querySelector('h4').textContent = '没有匹配的模型';
    elements.emptyState.querySelector('p').textContent = '试试其他模型名称或提供商。';
  }
}

elements.tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setMetric(tab.dataset.metric));
  tab.addEventListener('keydown', (event) => {
    const move = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: elements.tabs.length - 1 - index }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = elements.tabs[(index + move + elements.tabs.length) % elements.tabs.length];
    next.focus();
    setMetric(next.dataset.metric);
  });
});
elements.search.addEventListener('input', (event) => { state.query = event.target.value; renderRows(); });
elements.sort.addEventListener('change', (event) => { state.sort = event.target.value; renderRows(); });

try {
  const response = await fetch('/data/results.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.results) || !payload.results.every(isValidResult)
    || (payload.publishedAt != null && !Number.isFinite(Date.parse(payload.publishedAt)))) throw new Error('Invalid results');
  state.results = payload.results;
  state.publishedAt = payload.publishedAt;
  const count = state.results.length;
  document.querySelector('#hero-count').textContent = String(count).padStart(2, '0');
  document.querySelector('#result-count').textContent = `${count} 条结果`;
  if (state.publishedAt) document.querySelector('#published-at').textContent = `数据更新 · ${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(state.publishedAt))}`;
  setMetric('quality');
} catch {
  document.querySelector('#published-at').textContent = '数据状态 · 加载失败';
  document.querySelector('#empty-state h4').textContent = '数据暂时无法加载';
  document.querySelector('#empty-state p').textContent = '请稍后刷新页面。';
}
