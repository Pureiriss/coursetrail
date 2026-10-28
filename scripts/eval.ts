import type { RowDataPacket } from "mysql2/promise";
import { rows } from "../src/lib/db";
import { embedOne } from "../src/lib/embed";

type EvalQuery = { query: string; expect: string };

const QUERIES: EvalQuery[] = [
  { query: "贝叶斯 后验", expect: "贝叶斯" },
  { query: "全概率公式怎么拆", expect: "全概率" },
  { query: "树状图那道检测阳性的例题", expect: "树状图" },
  { query: "条件概率定义", expect: "条件概率" },
  { query: "似然函数是什么", expect: "似然" },
  { query: "协方差矩阵", expect: "协方差" },
  { query: "大数定律", expect: "大数定律" },
  { query: "中心极限定理近似", expect: "中心极限" },
  { query: "切比雪夫不等式", expect: "切比雪夫" },
  { query: "特征值特征向量", expect: "特征值" },
  { query: "矩阵分解 SVD", expect: "奇异值" },
  { query: "低秩近似和图像压缩", expect: "低秩" },
  { query: "PCA 主成分方向", expect: "PCA" },
  { query: "最小二乘正规方程", expect: "最小二乘" },
  { query: "正交投影矩阵", expect: "投影" },
  { query: "过拟合怎么判断", expect: "过拟合" },
  { query: "L1 L2 正则化区别", expect: "正则化" },
  { query: "偏差方差权衡", expect: "偏差" },
  { query: "学习率太大会怎样", expect: "学习率" },
  { query: "Adam 优化器", expect: "Adam" },
  { query: "交叉验证调超参数", expect: "交叉验证" },
  { query: "梯度消失爆炸", expect: "梯度" },
];

type Row = RowDataPacket & {
  id: number;
  content: string;
  dist: number;
  rel: number;
};

function hybridScore(row: Row): number {
  const semantic = Math.max(0, 1 - Number(row.dist));
  const rel = Number(row.rel);
  const lexical = rel > 0 ? rel / (rel + 1) : 0;
  return semantic * 0.62 + lexical * 0.38;
}

function hit(rows: Row[], keyword: string): boolean {
  return rows.some((row) => row.content.includes(keyword));
}

async function main() {
  const vectorHits: number[] = [];
  const lexicalHits: number[] = [];
  const hybridHits: number[] = [];

  console.log("query\t\t\t\tvector\tfulltext\thybrid");
  for (const item of QUERIES) {
    const vector = `[${(await embedOne(item.query)).join(",")}]`;
    const data = await rows<Row>(
      `SELECT id, content, cosine_distance(embedding, ?) AS dist,
              MATCH(content) AGAINST(?) AS rel
       FROM chunks`,
      [vector, item.query],
    );

    const topVector = [...data].sort((a, b) => a.dist - b.dist).slice(0, 5);
    const topLexical = [...data].sort((a, b) => b.rel - a.rel).slice(0, 5);
    const topHybrid = [...data].sort((a, b) => hybridScore(b) - hybridScore(a)).slice(0, 5);

    const v = hit(topVector, item.expect);
    const l = hit(topLexical, item.expect);
    const h = hit(topHybrid, item.expect);
    if (v) vectorHits.push(1);
    if (l) lexicalHits.push(1);
    if (h) hybridHits.push(1);

    console.log(
      `${item.query.padEnd(24, " ")}\t${v ? "✓" : "✗"}\t${l ? "✓" : "✗"}\t${h ? "✓" : "✗"}`,
    );
  }

  const pct = (list: number[]) =>
    `${((list.length / QUERIES.length) * 100).toFixed(1)}% (${list.length}/${QUERIES.length})`;
  console.log(`\nRecall@5  纯向量: ${pct(vectorHits)}`);
  console.log(`Recall@5  纯全文: ${pct(lexicalHits)}`);
  console.log(`Recall@5  混合  : ${pct(hybridHits)}`);
  console.log("\n注：命中判定为 Top5 中存在包含预期关键词的片段，属于关键词级自动标注。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
