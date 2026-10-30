import { METRICS, metricValue } from './benchmark.js';

const LIGHT_COLORS = ['#427d3d', '#bd6934', '#586fba', '#9a5c9b', '#2d8b88'];
const DARK_COLORS = ['#d8fa83', '#ffb47c', '#9db8ff', '#f2a9ef', '#82ded2'];
const shortNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function buildChartView(results, workloadId, metric, query = '') {
  const workloadRows = results.filter((row) => row.workloadId === workloadId);
  const levels = [...new Set(workloadRows.map((row) => row.concurrency))].sort((a, b) => a - b);
  const needle = query.trim().toLocaleLowerCase();
  const groups = new Map();

  for (const row of workloadRows) {
    if (!`${row.model} ${row.engine} ${row.release}`.toLocaleLowerCase().includes(needle)) continue;
    const key = JSON.stringify([row.engine, row.release, row.model]);
    if (!groups.has(key)) groups.set(key, { key, engine: row.engine, release: row.release, model: row.model, values: new Map() });
    groups.get(key).values.set(row.concurrency, metricValue(row, metric));
  }

  const series = [...groups.values()].sort((a, b) => a.engine.localeCompare(b.engine, 'en') || a.release.localeCompare(b.release, 'en'));
  const counts = new Map();
  for (const item of series) counts.set(item.engine, (counts.get(item.engine) ?? 0) + 1);
  for (const item of series) {
    item.label = counts.get(item.engine) === 1 ? item.engine : `${item.engine} · ${item.release} · ${item.model}`;
  }
  return { levels, series };
}

function chartTooltip(metric) {
  return { callbacks: { label: (item) => `${item.dataset.label ?? item.label}: ${METRICS[metric].format(item.parsed.y ?? item.parsed.x)}` } };
}

function axis(color, grid) {
  return {
    grid: { color: grid },
    border: { display: false },
    ticks: { color, font: { size: 11 }, callback: (value) => shortNumber.format(value) },
  };
}

function lineConfig(view, metric, concurrency, colors, dark, onSelectConcurrency) {
  const labels = view.levels.map((level) => `C${level}`);
  const datasets = view.series.map((item, index) => ({
    label: item.label,
    data: view.levels.map((level) => item.values.get(level) ?? null),
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length],
    borderWidth: dark ? 2 : 2.5,
    pointRadius: view.levels.map((level) => level === concurrency ? 5 : 2.5),
    pointHoverRadius: 6,
    tension: 0.25,
    spanGaps: false,
  }));
  const ink = dark ? '#c4d5c3' : '#687b6d';
  const grid = dark ? '#ffffff24' : '#e6ece4';
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      onClick: onSelectConcurrency ? (_event, points) => {
        if (points.length > 0) onSelectConcurrency(view.levels[points[0].index]);
      } : undefined,
      plugins: {
        legend: { position: 'bottom', labels: { color: ink, usePointStyle: true, pointStyle: 'line', boxWidth: 18, padding: 14, font: { size: 11 } } },
        tooltip: chartTooltip(metric),
      },
      scales: {
        x: { grid: { color: grid }, border: { display: false }, ticks: { color: ink, font: { size: 11 } } },
        y: { ...axis(ink, grid), beginAtZero: true },
      },
    },
  };
}

function barConfig(view, metric, concurrency, colors) {
  const ascending = METRICS[metric].ascending;
  const items = view.series.map((item, index) => ({ label: item.label, value: item.values.get(concurrency), color: colors[index % colors.length] }))
    .filter((item) => item.value != null)
    .sort((a, b) => (a.value - b.value) * (ascending ? 1 : -1));
  return {
    type: 'bar',
    data: {
      labels: items.map((item) => item.label),
      datasets: [{ label: METRICS[metric].title, data: items.map((item) => item.value), backgroundColor: items.map((item) => item.color), borderRadius: 3, barThickness: 28 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => METRICS[metric].format(item.parsed.x) } },
      },
      scales: {
        x: { ...axis('#687b6d', '#e6ece4'), beginAtZero: true },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: '#364b3b', font: { size: 11 } } },
      },
    },
  };
}

export class BenchmarkCharts {
  constructor(Chart, onSelectConcurrency) {
    this.Chart = Chart;
    this.onSelectConcurrency = onSelectConcurrency;
    this.hero = null;
    this.trend = null;
    this.ranking = null;
    this.heroWorkloadId = null;
  }

  update(current, canvas, config) {
    if (!current) return new this.Chart(canvas, config);
    current.data = config.data;
    current.options = config.options;
    current.update('none');
    return current;
  }

  renderHero(results, workloadId) {
    if (this.heroWorkloadId === workloadId) return;
    const view = buildChartView(results, workloadId, 'throughput');
    if (view.series.length === 0) return;
    const wrap = document.querySelector('#hero-chart-wrap');
    wrap.hidden = false;
    document.querySelector('.hero-panel').classList.add('has-chart');
    const canvas = document.querySelector('#hero-chart');
    canvas.setAttribute('aria-label', `总吞吐并发曲线：${view.series.map((item) => item.label).join('、')}`);
    this.hero = this.update(this.hero, canvas, lineConfig(view, 'throughput', null, DARK_COLORS, true));
    this.heroWorkloadId = workloadId;
  }

  renderBoard({ results, workloadId, metric, concurrency, query }) {
    const full = buildChartView(results, workloadId, metric);
    const view = buildChartView(results, workloadId, metric, query);
    const wrap = document.querySelector('#charts-grid');
    wrap.hidden = view.series.length === 0;
    if (wrap.hidden) return;
    const colors = view.series.map((item) => LIGHT_COLORS[full.series.findIndex((entry) => entry.key === item.key) % LIGHT_COLORS.length]);
    document.querySelector('#trend-title').textContent = `${METRICS[metric].title} · 并发趋势`;
    document.querySelector('#ranking-title').textContent = `${METRICS[metric].title} · C${concurrency} 对比`;
    document.querySelector('#chart-unit').textContent = METRICS[metric].unit;
    document.querySelector('#trend-chart').setAttribute('aria-label', `${METRICS[metric].title}随并发变化的曲线图`);
    document.querySelector('#ranking-chart').setAttribute('aria-label', `C${concurrency} 各服务${METRICS[metric].title}条形图`);
    this.trend = this.update(this.trend, document.querySelector('#trend-chart'), lineConfig(view, metric, concurrency, colors, false, this.onSelectConcurrency));
    this.ranking = this.update(this.ranking, document.querySelector('#ranking-chart'), barConfig(view, metric, concurrency, colors));
  }
}
