import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import { config } from "./config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 8,
      charset: "utf8mb4",
      dateStrings: false,
    });
  }
  return pool;
}

export async function rows<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [result] = await getPool().query<T[]>(sql, params);
  return result;
}

export async function run(sql: string, params: unknown[] = []) {
  const [result] = await getPool().query(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
