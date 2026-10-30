# Arena 文本偏好榜

[数据快照](../../public/data/arena-text.json)来自 [Arena 官方榜单数据集](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)，使用 `text_style_control` 的 `latest` 分区及 `overall` 类别。页面保留模型名、机构、许可、排名、评分、95% 置信区间和投票数；图表展示当前筛选下排名靠前的 15 个模型。

当前快照对应榜单发布日期 2026-10-28，数据集版本 `323062f70843f40e3f739865c3fe9d806126e412`，共 419 个模型。[Arena Text Arena](https://arena.ai/leaderboard/chat/text) 的评分基于匿名回答对比投票，反映人类偏好；服务吞吐和延迟来自另一组独立测量。

数据 © Arena，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。本站将官方字段重命名为页面数据结构，并保留原始数值。运行 `npm run refresh:arena` 可从官方数据集更新快照。
