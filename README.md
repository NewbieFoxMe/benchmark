# Benchmark

开放权重模型选型与自部署推理评测站点。页面以概览指标和图表呈现两类独立数据：

- [Arena 文本偏好榜](docs/datasets/arena-text.md)：默认展示开放权重条目的评分、置信区间、许可与投票数，支持切换闭源参照和全部条目。
- [2026-10-24 双机并发评测](docs/datasets/2026-10-24-concurrency256.md)：DeepSeek-V4.1-Flash-1017 的三套容量 256 服务配置、七档并发，共 21 条结果，按吞吐、延迟与解码速度切换图表。

## 本地预览

```bash
python3 -m http.server 8000 -d public
```

打开 `http://localhost:8000`。运行 `npm test` 验证数据筛选、排序与校验逻辑。

`public/index.html` 是页面入口；`arena-data.js` 负责许可分类与筛选，`arena.js` 与 `app.js` 分别处理模型参考和自部署评测，`charts.js` 负责服务图表。

## 数据

`public/data/results.json` 是发布数据源：

| 字段 | 内容 |
| --- | --- |
| `publishedAt` | 数据快照时间，ISO 8601 |
| `workloads[]` | `id`、`label`、`hardware`、`inputTokens`、`outputTokens` |
| `results[]` | `workloadId`、`model`、`engine`、`release`、`concurrency`、`measuredAt`、`sourceUrl`、`metrics` |
| `metrics` | `outputTps`、`ttftSeconds`、`requestDecodeTps`、`e2eSeconds` |

每条结果引用已定义的工作负载，`sourceUrl` 指向公开来源；缺失的指标用 `null`。同一工作负载与并发度下比较结果，评测配置与聚合证据见[数据说明](docs/datasets/2026-10-24-concurrency256.md)。

`public/data/arena-text.json` 是独立的 Arena 文本偏好榜快照，由 `npm run refresh:arena` 从官方数据集更新；来源、许可和字段见 [Arena 数据说明](docs/datasets/arena-text.md)。两类指标分别呈现。

## Cloudflare Pages

生产站点：[benchmark.dev-supranett.space](https://benchmark.dev-supranett.space)。Pages 项目为 `benchmark-dev-supranett`，关联 GitHub 仓库的 `main` 分支；构建命令留空，输出目录为 `public`。提交到 `main` 后自动部署。

图表优先的维度切换参考 [Artificial Analysis 模型比较](https://artificialanalysis.ai/zh/models)；模型偏好与服务性能按各自来源和口径展示。

图表使用 [Chart.js 4.6.1](https://www.chartjs.org/)；`public/vendor/` 保留发布文件和 MIT 许可。
