import {
  METRICS,
  isValidDataset,
  metricValue,
  sortAndFilter,
} from "./benchmark.js";
import { BenchmarkCharts } from "./charts.js";

const state = {
  metric: "throughput",
  results: [],
  workloads: [],
  workloadId: null,
  concurrency: null,
  query: "",
  sort: "best",
};
const elements = {
  tabs: [...document.querySelectorAll("[data-metric]")],
  panel: document.querySelector("#board-content"),
  controls: document.querySelector("#board-controls"),
  resultsWrap: document.querySelector("#results-wrap"),
  resultsBody: document.querySelector("#results-body"),
  emptyState: document.querySelector("#empty-state"),
  search: document.querySelector("#search"),
  workload: document.querySelector("#workload"),
  concurrency: document.querySelector("#concurrency"),
  sort: document.querySelector("#sort"),
  caption: document.querySelector("#workload-caption"),
};
const charts = window.Chart
  ? new BenchmarkCharts(window.Chart, (level) => {
      state.concurrency = level;
      elements.concurrency.value = String(level);
      renderRows();
    })
  : null;

function setMetric(metric) {
  state.metric = metric;
  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.metric === metric;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) elements.panel.setAttribute("aria-labelledby", tab.id);
  });
  const selected = METRICS[metric];
  const index = Object.keys(METRICS).indexOf(metric) + 1;
  document.querySelector("#metric-code").textContent =
    `METRIC / ${String(index).padStart(2, "0")}`;
  document.querySelector("#metric-title").textContent = selected.title;
  document.querySelector("#metric-description").textContent =
    selected.description;
  document.querySelector("#metric-direction").textContent = selected.direction;
  document.querySelector("#metric-column").textContent = selected.title;
  renderRows();
}

function cell(text, className = "") {
  const td = document.createElement("td");
  td.className = className;
  td.textContent = text;
  return td;
}

function renderRows() {
  const matches = sortAndFilter(state.results, state.metric, state);
  elements.resultsBody.replaceChildren();
  for (const result of matches) {
    const tr = document.createElement("tr");
    const name = cell("", "model-cell");
    const strong = document.createElement("strong");
    strong.textContent = `${result.engine} · ${result.release}`;
    const engine = document.createElement("span");
    engine.textContent = result.model;
    name.append(strong, engine);
    const value = metricValue(result, state.metric);
    const metricCell = cell(
      value == null ? "—" : METRICS[state.metric].format(value),
      "value-cell",
    );
    const concurrency = cell(`C${result.concurrency}`);
    const date = cell(
      new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
        new Date(result.measuredAt),
      ),
    );
    const source = cell("");
    const link = document.createElement("a");
    link.href = result.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "查看 ↗";
    source.append(link);
    tr.append(name, metricCell, concurrency, date, source);
    elements.resultsBody.append(tr);
  }
  const hasData = state.results.length > 0;
  elements.controls.hidden = !hasData;
  elements.caption.hidden = !hasData;
  elements.resultsWrap.hidden = !hasData || matches.length === 0;
  elements.emptyState.hidden = hasData && matches.length > 0;
  elements.emptyState.querySelector("a").hidden = hasData;
  document.querySelector("#result-count").textContent = hasData
    ? `${matches.length} / ${state.results.length} 条结果`
    : "0 条结果";
  if (charts && hasData) charts.renderBoard(state);
  if (hasData && matches.length === 0) {
    elements.emptyState.querySelector(".empty-label").textContent =
      "FILTER / EMPTY";
    elements.emptyState.querySelector("h4").textContent = "当前条件没有结果";
    elements.emptyState.querySelector("p").textContent =
      "换个模型名称、工作负载或并发度试试。";
  }
}

function renderSummary() {
  const measuredModels = [...new Set(state.results.map((row) => row.model))];
  document.querySelector("#summary-model-count").textContent =
    `${measuredModels.length} 模型`;
  document.querySelector("#summary-model-name").textContent =
    measuredModels.join(" / ");
  document.querySelector("#summary-model-context").textContent =
    `${new Set(state.results.map((row) => row.engine)).size} 引擎 · ${new Set(state.results.map((row) => row.concurrency)).size} 档并发 · ${state.results.length} 条结果`;
  const rows = state.results.filter(
    (row) => row.workloadId === state.workloadId,
  );
  const levels = [...new Set(rows.map((row) => row.concurrency))].sort(
    (a, b) => a - b,
  );
  const throughputLevel = levels.at(-1);
  const throughput = rows
    .filter(
      (row) =>
        row.concurrency === throughputLevel && row.metrics.outputTps != null,
    )
    .sort((a, b) => b.metrics.outputTps - a.metrics.outputTps)[0];
  const ttftLevel = levels.includes(32) ? 32 : levels[0];
  const ttft = rows
    .filter(
      (row) => row.concurrency === ttftLevel && row.metrics.ttftSeconds != null,
    )
    .sort((a, b) => a.metrics.ttftSeconds - b.metrics.ttftSeconds)[0];
  if (throughput) {
    document.querySelector("#summary-throughput-value").textContent =
      new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
        throughput.metrics.outputTps,
      );
    document.querySelector("#summary-throughput-name").textContent =
      throughput.engine;
    document.querySelector("#summary-throughput-context").textContent =
      `C${throughputLevel} · 输出 token/s`;
  }
  if (ttft) {
    document.querySelector("#summary-ttft-value").textContent =
      `${ttft.metrics.ttftSeconds.toFixed(2)} s`;
    document.querySelector("#summary-ttft-name").textContent = ttft.engine;
    document.querySelector("#summary-ttft-context").textContent =
      `C${ttftLevel} · 客户端计时`;
  }
}

function setWorkload(workloadId) {
  state.workloadId = workloadId;
  const levels = [
    ...new Set(
      state.results
        .filter((row) => row.workloadId === workloadId)
        .map((row) => row.concurrency),
    ),
  ].sort((a, b) => a - b);
  elements.concurrency.replaceChildren(
    ...levels.map((level) => new Option(`C${level}`, String(level))),
  );
  state.concurrency = levels.includes(32) ? 32 : levels[0];
  elements.concurrency.value = String(state.concurrency);
  const workload = state.workloads.find((item) => item.id === workloadId);
  const measuredModels = [
    ...new Set(
      state.results
        .filter((row) => row.workloadId === workloadId)
        .map((row) => row.model),
    ),
  ];
  elements.caption.textContent = `${measuredModels.join(" / ")} · ${workload.label} · 输入 ${workload.inputTokens.toLocaleString("zh-CN")} token / 输出上限 ${workload.outputTokens.toLocaleString("zh-CN")} token · ${workload.hardware}`;
  renderSummary();
  charts?.renderOverview(state.results, workloadId);
  renderRows();
}

elements.tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setMetric(tab.dataset.metric));
  tab.addEventListener("keydown", (event) => {
    const move = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: -index,
      End: elements.tabs.length - 1 - index,
    }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next =
      elements.tabs[
        (index + move + elements.tabs.length) % elements.tabs.length
      ];
    next.focus();
    setMetric(next.dataset.metric);
  });
});
elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderRows();
});
elements.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderRows();
});
elements.workload.addEventListener("change", (event) => {
  setWorkload(event.target.value);
});
elements.concurrency.addEventListener("change", (event) => {
  state.concurrency = Number(event.target.value);
  renderRows();
});

try {
  const response = await fetch("/data/results.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const workloads = payload.workloads;
  const results = payload.results;
  if (!isValidDataset(payload)) throw new Error("Invalid results");
  state.results = results;
  state.workloads = workloads;
  document.querySelector("#published-count").textContent =
    `${results.length} 条服务实测结果`;
  if (results.length === 0) {
    document.querySelector("#summary-model-count").textContent = "0 模型";
    document.querySelector("#summary-model-name").textContent =
      "暂无已发布实测";
    document.querySelector("#empty-state .empty-label").textContent =
      "DATASET / EMPTY";
    document.querySelector("#empty-state h4").textContent = "暂无已发布结果";
    document.querySelector("#empty-state p").textContent = "请稍后查看。";
  }
  if (payload.publishedAt)
    document.querySelector("#published-at").textContent =
      `数据更新 · ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(payload.publishedAt))}`;
  if (results.length > 0) {
    const activeWorkloads = workloads.filter((workload) =>
      results.some((row) => row.workloadId === workload.id),
    );
    elements.workload.replaceChildren(
      ...activeWorkloads.map(
        (workload) => new Option(workload.label, workload.id),
      ),
    );
    setWorkload(activeWorkloads[0].id);
  }
  setMetric("throughput");
} catch {
  document.querySelector("#summary-model-name").textContent = "数据加载失败";
  document.querySelector("#summary-throughput-name").textContent =
    "数据加载失败";
  document.querySelector("#summary-ttft-name").textContent = "数据加载失败";
  document.querySelector("#published-at").textContent = "数据状态 · 加载失败";
  document.querySelector("#empty-state .empty-label").textContent =
    "DATASET / ERROR";
  document.querySelector("#empty-state h4").textContent = "数据暂时无法加载";
  document.querySelector("#empty-state p").textContent = "请稍后刷新页面。";
  document.querySelector("#empty-state a").hidden = true;
}
