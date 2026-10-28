# 验证样例

本文给出从零开始的一组可执行样例：初始数据、输入、操作步骤、预期结果，以及 seekdb 实际发挥作用的证据。

## 0. 运行环境（实测）

| 项目 | 版本 |
| --- | --- |
| 操作系统 | Windows 11（10.0.26200），x64 |
| Node.js | v22.14.0 |
| npm | 11.2.0 |
| Docker | 28.0.4 |
| seekdb 镜像 | `oceanbase/seekdb:latest`（sha256:4db4961869d554313520d6081fca29265ba6da6db7313311bd8acbed771a956b） |
| 端口 | 2881（MySQL 协议）、2886 |

数据库连接：`127.0.0.1:2881`，用户 `root`，空密码，数据库 `coursetrail`（可用 `.env.local` 覆盖）。

## 1. 初始化

```bash
docker compose up -d
npm ci
npm run db:init
npm run db:seed
npm run dev
```

`docker compose up -d` 后等待日志出现 `SeekDB SQL ready`（首次约 10–30 秒）。

**初始数据（seed 后应完全一致）**

| 表 | 数量 |
| --- | --- |
| courses | 3 |
| materials | 13（11 份文字笔记 + 1 份 PDF + 1 张板书图片） |
| chunks | 27 |
| cards | 33（16 张手写卡 + 12 张模板卡 + 5 张示例资料卡） |

seed 的标准输出结尾：

```
种子数据完成：27 个片段，33 张卡片（手写 16 张，模板 12 张），21 张当前待复习
```

> 由于插入时间与 `NOW()` 的秒级差异，最后一次统计的待复习数量可能略有出入；以页面或 `SELECT COUNT(*) FROM cards WHERE due <= NOW()` 为准。

## 2. 样例 A：混合检索（seekdb 核心路径）

**输入**：搜索框输入 `树状图`，或在地址栏打开 `http://localhost:3000/search?q=树状图`。

**操作步骤**

1. 打开首页或资料库，在搜索框输入 `树状图`，点击检索。
2. 观察结果卡片上的「语义 / 关键词 / 融合」三条分数，以及右上角的命中方式。

**预期结果**

- 返回 2 条，第一条是图片资料《板书 · 贝叶斯树状图》（显示缩略图），第二条是《条件概率、全概率与贝叶斯公式》。
- 两条的命中方式均为「关键词命中」；图片资料的融合分高于文字片段。
- 点击「打开原文」：图片在新标签页显示原图；PDF 跳到对应页。

**接口复现**

```bash
curl "http://localhost:3000/api/search?q=树状图"
```

预期返回（字段截取）：

```json
{
  "hits": [
    {
      "title": "板书 · 贝叶斯树状图",
      "kind": "image",
      "matchedBy": "lexical",
      "rel": 2.25,
      "semantic": 0.37
    },
    {
      "title": "条件概率、全概率与贝叶斯公式",
      "kind": "text",
      "matchedBy": "lexical",
      "rel": 0.93
    }
  ]
}
```

`rel` 是 IK 全文相关度，`semantic = 1 - cosine_distance`。两条来自**同一条 SQL**，不是两个库拼接。

## 3. 样例 B：证明 seekdb 建了向量索引和中文全文索引

**操作**：连接到 seekdb 后执行：

```sql
USE coursetrail;
SHOW CREATE TABLE chunks;
```

**预期结果（关键行）**

```sql
`embedding` VECTOR(1024) DEFAULT NULL,
FULLTEXT KEY `ft_content` (`content`) WITH PARSER ik PARSER_PROPERTIES=(ik_mode="smart") BLOCK_SIZE 16384,
VECTOR KEY `vec_embedding` (`embedding`) WITH (DISTANCE=COSINE, TYPE=HNSW, LIB=VSAG, M=16, EF_CONSTRUCTION=200, EF_SEARCH=64, SYNC_MODE=ASYNC) BLOCK_SIZE 16384,
```

**一条 SQL 同时返回两种信号**

```sql
SELECT m.title, c.page_no,
       cosine_distance(c.embedding, ?) AS dist,
       MATCH(c.content) AGAINST('树状图') AS rel
FROM chunks c
JOIN materials m ON m.id = c.material_id
WHERE MATCH(c.content) AGAINST('树状图')
ORDER BY rel DESC
LIMIT 3;
```

实测输出：

| title | page_no | dist | rel |
| --- | --- | --- | --- |
| 板书 · 贝叶斯树状图 | NULL | 0.625 | 2.251 |
| 条件概率、全概率与贝叶斯公式 | NULL | 0.000 | 0.927 |

说明：`cosine_distance()` 与 `MATCH … AGAINST` 在同一条查询里同时可用；`FULLTEXT … WITH PARSER ik` 能正确切分中文，`VECTOR … TYPE=HNSW` 负责语义召回。

## 4. 样例 C：复习评分写回 seekdb

**输入**：一张到期卡片，评分「记得」（rating=3）。

**操作步骤**

1. 打开 `http://localhost:3000/review`。
2. 按空格翻面，点击「记得」。
3. 再次读取复习队列。

```bash
curl -s "http://localhost:3000/api/cards/due?limit=1"
# 取返回里的 cards[0].id，例如 25

curl -s -X POST "http://localhost:3000/api/cards/review" \
  -H "Content-Type: application/json" \
  -d '{"cardId":25,"rating":3}'
```

**预期结果**

```json
{
  "due": "2026-10-28T09:39:13.816Z",
  "intervalDays": 0,
  "state": 1,
  "stats": { "due": 10, "total": 16, "reviewedToday": 1 }
}
```

- `due` 变为约 10 分钟后（FSRS 学习阶段），`state` 从 0（New）变为 1（Learning）。
- `reviews` 表新增一行，`cards.due / stability / reps` 已更新：

```sql
SELECT k.id, k.due, k.stability, k.reps, k.state, COUNT(r.id) AS review_rows
FROM cards k LEFT JOIN reviews r ON r.card_id = k.id
WHERE k.id = 25
GROUP BY k.id;
```

这证明复习状态不是存在内存或前端，而是持久化在 seekdb，刷新、重启后仍然有效。

## 5. 样例 D：PDF 页码溯源

**输入**：seed 内置的《第 6 讲 马尔可夫链》（2 页）。

**操作步骤**

1. 打开 `http://localhost:3000/search?q=平稳分布`。
2. 找到来自《第 6 讲 马尔可夫链》的结果，卡片上应显示「第 1 页」或「第 2 页」。
3. 点击「打开原文」。

**预期结果**

- 检索结果里的页码与 PDF 实际页一致（该资料共 4 个片段，分布在第 1、2 页）。
- 浏览器打开 PDF 并定位到对应页（URL 形如 `/api/files/<id>#page=2`）。

验证片段页码：

```sql
SELECT c.page_no, c.chunk_index, SUBSTRING(c.content, 1, 30) AS head
FROM chunks c JOIN materials m ON m.id = c.material_id
WHERE m.title = '第 6 讲 马尔可夫链'
ORDER BY c.chunk_index;
```

预期 4 行，`page_no` 依次为 1、1、2、2。

## 6. 可选：真实 embedding

未配置 `EMBEDDING_API_URL` 时使用本地 2/3-gram 特征哈希向量，检索可用但语义精度有限（这也是门户评测表里三种方式差距不大的原因）。配置后重新 seed（或重建片段）即可获得真正的语义召回：

```bash
EMBEDDING_API_URL=https://api.siliconflow.cn/v1
EMBEDDING_API_KEY=sk-xxx
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
```

## 7. 证据清单

- 真实界面截图：`web/assets/home.jpg`、`search.jpg`、`library.jpg`、`review.jpg`、`devlog.jpg`
- 公开站点：https://coursetrail-ukrnh1e2s5p.qoder.zone
- 检索评测：`npm run eval`（22 条关键词级基准，输出 Recall@5 对照）
- 开发过程：`docs/devlog/2026-10-28.md`
