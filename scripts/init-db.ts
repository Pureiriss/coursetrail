import mysql from "mysql2/promise";
import { config } from "../src/lib/config";
import { ensureSchema } from "../src/lib/schema";

async function main() {
  const { database, ...connection } = config.db;
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error(`数据库名不合法：${database}`);
  }

  const conn = await mysql.createConnection(connection);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4`,
  );
  await conn.end();

  await ensureSchema();
  console.log(`✓ 数据库 ${database} 与表结构已就绪`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("初始化失败：", error);
    process.exit(1);
  });
