import { METRICS, metricValue } from "./benchmark.js";

const COLORS = ["#7455d3", "#2773d7", "#db7949", "#159d84", "#344054"];
const shortNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function buildChartView(results, workloadId, metric, query = "") {
  const workloadRows = results.filter((row) => row.workloadId === workloadId);
  const levels = [...new Set(workloadRows.map((row) => row.concurrency))].sort(
    (a, b) => a - b,
  );
  const needle = query.trim().toLocaleLowerCase();
  const groups = new Map();

  for (const row of workloadRows) {
    if (
      !`${row.model} ${row.engine} ${row.release}`
        .toLocaleLowerCase()
        .includes(needle)
    )
      continue;
    const key = JSON.stringify([row.engine, row.release, row.model]);
    if (!groups.has(key))
      groups.set(key, {
        key,
        engine: row.engine,
        release: row.release,
        model: row.model,
        values: new Map(),
      });
    groups.get(key).values.set(row.concurrency, metricValue(row, metric));
  }

  const series = [...groups.values()].sort(
    (a, b) =>
      a.engine.localeCompare(b.engine, "en") ||
      a.release.localeCompare(b.release, "en"),
  );
  const counts = new Map();
  for (const item of series)
    counts.set(item.engine, (counts.get(item.engine) ?? 0) + 1);
  for (const item of series) {
    item.label =
      counts.get(item.engine) === 1
        ? item.engine
        : `${item.engine} · ${item.release} · ${item.model}`;
  }
  return { levels, series };
}

function chartTooltip(metric) {
  return {
    callbacks: {
      label: (item) =>
        `${item.dataset.label ?? item.label}: ${METRICS[metric].format(item.parsed.y ?? item.parsed.x)}`,
    },
  };
}

function axis(color, grid) {
  return {
    grid: { color: grid },
    border: { display: false },
    ticks: {
      color,
      font: { size: 11 },
      callback: (value) => shortNumber.format(value),
    },
  };
}

function lineConfig(
  view,
  metric,
  concurrency,
  colors,
  onSelectConcurrency = null,
  compact = false,
) {
  const labels = view.levels.map((level) => `C${level}`);
  const datasets = view.series.map((item, index) => ({
    label: item.label,
    data: view.levels.map((level) => item.values.get(level) ?? null),
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length],
    borderWidth: compact ? 2 : 2.5,
    pointRadius: view.levels.map((level) =>
      level === concurrency ? 5 : compact ? 2 : 2.5,
    ),
    pointHoverRadius: 6,
    tension: 0.25,
    spanGaps: false,
  }));
  const ink = "#747b88";
  const grid = "#e8eaf0";
  return {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      onClick: onSelectConcurrency
        ? (_event, points) => {
            if (points.length > 0)
              onSelectConcurrency(view.levels[points[0].index]);
          }
        : undefined,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: ink,
            usePointStyle: true,
            pointStyle: "line",
            boxWidth: 14,
            padding: compact ? 8 : 14,
            font: { size: compact ? 10 : 11 },
          },
        },
        tooltip: chartTooltip(metric),
      },
      scales: {
        x: {
          grid: { color: grid },
          border: { display: false },
          ticks: { color: ink, font: { size: compact ? 9 : 11 } },
        },
        y: { ...axis(ink, grid), beginAtZero: true },
      },
    },
  };
}

function barConfig(view, metric, concurrency, colors) {
  const ascending = METRICS[metric].ascending;
  const items = view.series
    .map((item, index) => ({
      label: item.label,
      value: item.values.get(concurrency),
      color: colors[index % colors.length],
    }))
    .filter((item) => item.value != null)
    .sort((a, b) => (a.value - b.value) * (ascending ? 1 : -1));
  return {
    type: "bar",
    data: {
      labels: items.map((item) => item.label),
      datasets: [
        {
          label: METRICS[metric].title,
          data: items.map((item) => item.value),
          backgroundColor: items.map((item) => item.color),
          borderRadius: 3,
          barThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (item) => METRICS[metric].format(item.parsed.x) },
        },
      },
      scales: {
        x: { ...axis("#747b88", "#e8eaf0"), beginAtZero: true },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#363b48", font: { size: 11 } },
        },
      },
    },
  };
}

export class BenchmarkCharts {
  constructor(Chart, onSelectConcurrency) {
    this.Chart = Chart;
    this.onSelectConcurrency = onSelectConcurrency;
    this.throughputPreview = null;
    this.ttftPreview = null;
    this.trend = null;
    this.ranking = null;
    this.previewWorkloadId = null;
  }

  update(current, canvas, config) {
    if (!current) return new this.Chart(canvas, config);
    current.data = config.data;
    current.options = config.options;
    current.update("none");
    return current;
  }

  renderOverview(results, workloadId) {
    if (this.previewWorkloadId === workloadId) return;
    for (const [metric, property, selector] of [
      ["throughput", "throughputPreview", "#throughput-preview"],
      ["ttft", "ttftPreview", "#ttft-preview"],
    ]) {
      const view = buildChartView(results, workloadId, metric);
      this[property] = this.update(
        this[property],
        document.querySelector(selector),
        lineConfig(view, metric, null, COLORS, null, true),
      );
    }
    this.previewWorkloadId = workloadId;
  }

  renderBoard({ results, workloadId, metric, concurrency, query }) {
    const full = buildChartView(results, workloadId, metric);
    const view = buildChartView(results, workloadId, metric, query);
    const wrap = document.querySelector("#charts-grid");
    wrap.hidden = view.series.length === 0;
    if (wrap.hidden) return;
    const colors = view.series.map(
      (item) =>
        COLORS[
          full.series.findIndex((entry) => entry.key === item.key) %
            COLORS.length
        ],
    );
    document.querySelector("#trend-title").textContent =
      `${METRICS[metric].title} · 并发趋势`;
    document.querySelector("#ranking-title").textContent =
      `${METRICS[metric].title} · C${concurrency} 对比`;
    document.querySelector("#chart-unit").textContent = METRICS[metric].unit;
    document
      .querySelector("#trend-chart")
      .setAttribute("aria-label", `${METRICS[metric].title}随并发变化的曲线图`);
    document
      .querySelector("#ranking-chart")
      .setAttribute(
        "aria-label",
        `C${concurrency} 各服务${METRICS[metric].title}条形图`,
      );
    this.trend = this.update(
      this.trend,
      document.querySelector("#trend-chart"),
      lineConfig(view, metric, concurrency, colors, this.onSelectConcurrency),
    );
    this.ranking = this.update(
      this.ranking,
      document.querySelector("#ranking-chart"),
      barConfig(view, metric, concurrency, colors),
    );
  }
}
