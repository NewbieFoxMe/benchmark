# Benchmark

AI 模型基准测试站点。首版提供质量、输出速度、首 Token 延迟与输出价格的比较界面，结果数据由 `public/data/results.json` 提供。

## 本地预览

```bash
python3 -m http.server 8000 -d public
```

打开 `http://localhost:8000`。运行 `npm test` 验证数据排序与校验逻辑。

## 数据格式

`public/data/results.json` 是唯一的发布数据源：

```json
{
  "publishedAt": "2026-10-30T00:00:00Z",
  "results": [
    {
      "model": "模型名称及版本",
      "provider": "提供商",
      "measuredAt": "2026-10-30T00:00:00Z",
      "runUrl": "https://example.com/run/1",
      "metrics": {
        "qualityScore": 80,
        "outputTps": 120,
        "ttftSeconds": 0.8
      },
      "pricing": {
        "outputUsdPerMillion": 5,
        "sourceUrl": "https://example.com/pricing"
      }
    }
  ]
}
```

结果按维度排序，缺失值使用 `null`。`runUrl` 指向评测记录，`pricing.sourceUrl` 指向公开定价。示例数字仅说明格式，未进入发布数据。

## Cloudflare Pages

在 Cloudflare「Workers & Pages」中选择「Connect to Git」，授权 `NewbieFoxMe/benchmark`，生产分支选 `main`，构建命令留空，输出目录填 `public`。随后在 Pages 项目的「自定义域」中添加 `benchmark.dev-supranett.space`。提交到 `main` 后，Pages 自动部署。

指标范围参考 [Artificial Analysis 模型比较](https://artificialanalysis.ai/zh/models)；本站为独立项目。
