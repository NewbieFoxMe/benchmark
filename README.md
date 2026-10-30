# Benchmark

自托管 LLM 推理服务性能对比站点。页面按工作负载与并发度分组，展示总吞吐、首 Token 延迟、单请求解码速度和端到端时间。首批公开数据来自 [2026-10-24 双机并发评测](docs/datasets/2026-10-24-concurrency256.md)：三个容量 256 的服务配置、七档并发，共 21 条结果。

## 本地预览

```bash
python3 -m http.server 8000 -d public
```

打开 `http://localhost:8000`。运行 `npm test` 验证数据筛选、排序与校验逻辑。

## 数据

`public/data/results.json` 是发布数据源：

| 字段 | 内容 |
| --- | --- |
| `publishedAt` | 数据快照时间，ISO 8601 |
| `workloads[]` | `id`、`label`、`hardware`、`inputTokens`、`outputTokens` |
| `results[]` | `workloadId`、`model`、`engine`、`release`、`concurrency`、`measuredAt`、`sourceUrl`、`metrics` |
| `metrics` | `outputTps`、`ttftSeconds`、`requestDecodeTps`、`e2eSeconds` |

每条结果引用已定义的工作负载，`sourceUrl` 指向公开来源；缺失的指标用 `null`。同一工作负载与并发度下比较结果，评测配置与聚合证据见[数据说明](docs/datasets/2026-10-24-concurrency256.md)。

## Cloudflare Pages

生产站点：[benchmark.dev-supranett.space](https://benchmark.dev-supranett.space)。Pages 项目为 `benchmark-dev-supranett`，关联 GitHub 仓库的 `main` 分支；构建命令留空，输出目录为 `public`。提交到 `main` 后自动部署。

对比界面的维度切换方式参考 [Artificial Analysis 模型比较](https://artificialanalysis.ai/zh/models)；本站基于自托管推理服务的实测记录。
