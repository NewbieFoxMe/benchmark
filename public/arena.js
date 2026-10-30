import { filterArenaModels, isValidArenaDataset } from "./arena-data.js";

const ratingNumber = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("zh-CN");
const date = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const elements = {
  published: document.querySelector("#arena-published"),
  controls: document.querySelector("#arena-controls"),
  search: document.querySelector("#arena-search"),
  license: document.querySelector("#arena-license"),
  limit: document.querySelector("#arena-limit"),
  count: document.querySelector("#arena-count"),
  empty: document.querySelector("#arena-empty"),
  visual: document.querySelector("#arena-visual"),
  plot: document.querySelector("#arena-plot"),
  chart: document.querySelector("#arena-chart"),
  body: document.querySelector("#arena-body"),
  dataset: document.querySelector("#arena-dataset"),
  preview: document.querySelector("#arena-preview"),
};
let models = [];
let chart;

function cell(value, className = "") {
  const element = document.createElement("td");
  element.className = className;
  element.textContent = value;
  return element;
}

function renderTable(rows) {
  const limit =
    elements.limit.value === "all" ? rows.length : Number(elements.limit.value);
  const fragment = document.createDocumentFragment();
  for (const model of rows.slice(0, limit)) {
    const row = document.createElement("tr");
    const name = cell("", "arena-model-cell");
    const title = document.createElement("strong");
    title.textContent = model.name;
    const detail = document.createElement("span");
    detail.textContent = [model.organization, model.license]
      .filter(Boolean)
      .join(" · ");
    name.append(title, detail);
    row.append(
      cell(`#${model.rank}`, "arena-rank-cell"),
      name,
      cell(ratingNumber.format(model.rating), "arena-rating-cell"),
      cell(
        `${ratingNumber.format(model.ratingLower)}–${ratingNumber.format(model.ratingUpper)}`,
      ),
      cell(integer.format(model.votes)),
    );
    fragment.append(row);
  }
  elements.body.replaceChildren(fragment);
  elements.count.textContent = `${Math.min(rows.length, limit)} / ${rows.length} 条筛选结果`;
}

function chartConfig(rows, compact = false) {
  const labels = rows.map((model) => `#${model.rank} ${model.name}`);
  const colors = rows.map((model) =>
    model.license === "Proprietary" ? "#7455d3" : "#139d83",
  );
  const min =
    Math.floor(Math.min(...rows.map((model) => model.ratingLower)) / 10) * 10 -
    10;
  const max =
    Math.ceil(Math.max(...rows.map((model) => model.ratingUpper)) / 10) * 10 +
    10;
  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: rows.map((model) => [model.ratingLower, model.ratingUpper]),
          backgroundColor: colors,
          barThickness: compact ? 3 : 4,
          borderRadius: 2,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { right: compact ? 4 : 12 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: ([item]) => rows[item.dataIndex].name,
            label: (item) => {
              const model = rows[item.dataIndex];
              return `评分 ${ratingNumber.format(model.rating)} · 95% 区间 ${ratingNumber.format(model.ratingLower)}–${ratingNumber.format(model.ratingUpper)} · ${integer.format(model.votes)} 票`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min,
          max,
          grid: { color: "#e8eaf0" },
          border: { display: false },
          ticks: { color: "#808795", font: { size: compact ? 9 : 11 } },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "#363b48",
            font: { size: compact ? 9 : 11 },
            autoSkip: false,
            callback: (value) =>
              window.innerWidth <= 760
                ? `#${rows[value].rank}`
                : compact
                  ? `${labels[value].slice(0, 19)}${labels[value].length > 19 ? "…" : ""}`
                  : labels[value],
          },
        },
      },
    },
    plugins: [
      {
        id: "ratingMarkers",
        afterDatasetsDraw(instance) {
          const bars = instance.getDatasetMeta(0).data;
          const scale = instance.scales.x;
          const context = instance.ctx;
          context.save();
          rows.forEach((model, index) => {
            context.beginPath();
            context.arc(
              scale.getPixelForValue(model.rating),
              bars[index].y,
              compact ? 4 : 5,
              0,
              2 * Math.PI,
            );
            context.fillStyle = colors[index];
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#fff";
            context.stroke();
          });
          context.restore();
        },
      },
    ],
  };
}

function render() {
  const rows = filterArenaModels(models, {
    query: elements.search.value,
    license: elements.license.value,
  });
  renderTable(rows);
  elements.visual.hidden = rows.length === 0;
  elements.empty.hidden = rows.length > 0;
  if (rows.length === 0) {
    elements.empty.textContent = "当前条件没有匹配的模型。";
    chart?.destroy();
    chart = null;
    return;
  }
  elements.plot.hidden = !window.Chart;
  if (!window.Chart) return;
  const top = rows.slice(0, 15);
  elements.chart.setAttribute(
    "aria-label",
    `Arena 模型评分及 95% 置信区间：${top.map((model) => model.name).join("、")}`,
  );
  chart?.destroy();
  chart = new window.Chart(elements.chart, chartConfig(top));
}

elements.search.addEventListener("input", render);
elements.license.addEventListener("change", render);
elements.limit.addEventListener("change", render);

try {
  const response = await fetch("/data/arena-text.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!isValidArenaDataset(payload)) throw new Error("Invalid Arena snapshot");
  models = payload.models;
  elements.published.textContent = `榜单更新 · ${date.format(new Date(`${payload.source.publishedAt}T00:00:00Z`))} · ${models.length} 个模型`;
  elements.dataset.href = payload.source.datasetUrl;
  document.querySelector("#summary-arena-value").textContent =
    ratingNumber.format(models[0].rating);
  document.querySelector("#summary-arena-name").textContent = models[0].name;
  const other = models.find((model) => model.license !== "Proprietary");
  if (other) {
    document.querySelector("#summary-other-value").textContent =
      ratingNumber.format(other.rating);
    document.querySelector("#summary-other-name").textContent = other.name;
  }
  if (window.Chart)
    new window.Chart(elements.preview, chartConfig(models.slice(0, 10), true));
  elements.controls.hidden = false;
  render();
} catch {
  elements.published.textContent = "数据暂时不可用";
  elements.empty.textContent = "Arena 榜单加载失败，请稍后刷新。";
  document.querySelector("#summary-arena-name").textContent = "数据加载失败";
  document.querySelector("#summary-other-name").textContent = "数据加载失败";
}
