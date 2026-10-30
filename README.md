# Benchmark

自托管 LLM 推理服务性能对比站点。页面按工作负载与并发度分组，展示总吞吐、首 Token 延迟、单请求解码速度和端到端时间。当前版本完成站点骨架，评测快照随后从 `llm-serving` 整理。

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

每条结果引用已定义的工作负载，`sourceUrl` 指向公开来源；缺失的指标用 `null`。同一工作负载与并发度下比较结果，避免混合不同测量条件。

## Cloudflare Pages

在 Cloudflare「Workers & Pages」中选择「Connect to Git」，授权 `NewbieFoxMe/benchmark`，生产分支选 `main`，构建命令留空，输出目录填 `public`。随后在 Pages 项目的「自定义域」中添加 `benchmark.dev-supranett.space`。提交到 `main` 后，Pages 自动部署。

对比界面的维度切换方式参考 [Artificial Analysis 模型比较](https://artificialanalysis.ai/zh/models)；本站基于自托管推理服务的实测记录。
