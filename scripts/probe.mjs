import mysql from "mysql2/promise";

const cfg = { host: "127.0.0.1", port: 2881, user: "root", password: "" };
const conn = await mysql.createConnection(cfg);

const [dbs] = await conn.query("SHOW DATABASES");
console.log("databases:", dbs.map((d) => Object.values(d)[0]).join(", "));

await conn.query("CREATE DATABASE IF NOT EXISTS coursetrail");
await conn.query("USE coursetrail");
await conn.query("DROP TABLE IF EXISTS t_probe");

const variants = [
  `CREATE TABLE t_probe (
     id INT PRIMARY KEY,
     content TEXT,
     embedding VECTOR(4),
     FULLTEXT INDEX ft (content) WITH PARSER ik,
     VECTOR INDEX vi (embedding) WITH (DISTANCE=cosine, TYPE=hnsw, LIB=vsag)
   ) ORGANIZATION = HEAP`,
  `CREATE TABLE t_probe (
     id INT PRIMARY KEY,
     content TEXT,
     embedding VECTOR(4),
     FULLTEXT INDEX ft (content),
     VECTOR INDEX vi (embedding) WITH (DISTANCE=cosine, TYPE=hnsw, LIB=vsag)
   ) ORGANIZATION = HEAP`,
  `CREATE TABLE t_probe (
     id INT PRIMARY KEY,
     content TEXT,
     embedding VECTOR(4),
     FULLTEXT INDEX ft (content),
     VECTOR INDEX vi (embedding) WITH (DISTANCE=l2, TYPE=hnsw, LIB=vsag)
   ) ORGANIZATION = HEAP`,
];

for (const [i, ddl] of variants.entries()) {
  try {
    await conn.query("DROP TABLE IF EXISTS t_probe");
    await conn.query(ddl);
    console.log(`DDL variant ${i}: OK`);
    break;
  } catch (e) {
    console.log(`DDL variant ${i} failed: ${e.code} ${e.message}`);
  }
}

try {
  await conn.query(
    `INSERT INTO t_probe VALUES
     (1, '贝叶斯公式与先验后验概率', '[1,0,0,0]'),
     (2, '矩阵特征值分解 SVD', '[0,1,0,0]'),
     (3, '线性回归最小二乘', '[0,0,1,0]')`,
  );
  const [rows] = await conn.query(
    `SELECT id, content,
            l2_distance(embedding, '[0.9,0.1,0,0]') AS dist,
            MATCH(content) AGAINST('贝叶斯') AS rel
     FROM t_probe
     ORDER BY dist ASC
     LIMIT 3`,
  );
  console.log("query ok:", JSON.stringify(rows));
} catch (e) {
  console.log("query failed:", e.code, e.message);
}

const [show] = await conn.query("SHOW CREATE TABLE t_probe");
console.log("ddl:", JSON.stringify(show));
await conn.end();
