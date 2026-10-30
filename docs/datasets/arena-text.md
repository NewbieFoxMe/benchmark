# Arena 文本偏好榜

[数据快照](../../public/data/arena-text.json)来自 [Arena 官方榜单数据集](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)，使用 `text_style_control` 的 `latest` 分区及 `overall` 类别。页面保留模型名、机构、许可、排名、评分、95% 置信区间和投票数；图表展示当前筛选下排名靠前的 15 个模型。

当前快照对应榜单发布日期 2026-10-28，数据集版本 `323062f70843f40e3f739865c3fe9d806126e412`，共 419 个模型。[Arena Text Arena](https://arena.ai/leaderboard/chat/text) 的评分基于匿名回答对比投票，反映人类偏好；服务吞吐和延迟来自另一组独立测量。

页面默认展示开放权重条目，保留 Arena 总榜排名。许可分类使用 [`arena-data.js`](../../public/arena-data.js) 中已识别的权重许可，涵盖 MIT、Apache、社区及研究许可；`Proprietary` 归为闭源参照，`Other` 和新增待识别许可归为待确认，可通过全部条目查看。当前快照含 226 条开放权重、192 条闭源参照和 1 条待确认记录，模型的不同推理模式分别计数。

开放权重模型的使用范围和硬件适配以模型卡为准。例如 [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3) 使用 Kimi K3 License；本站自部署实测的 [DeepSeek-V4.1-Flash-1017](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017) 使用 MIT 许可，具体版本与测试条件见[实测说明](2026-10-24-concurrency256.md)。

数据 © Arena，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。本站将官方字段重命名为页面数据结构，并保留原始数值。运行 `npm run refresh:arena` 可从官方数据集更新快照。
