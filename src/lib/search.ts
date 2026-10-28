import type { RowDataPacket } from "mysql2/promise";
import { config, lexicalWeight } from "./config";
import { rows, vectorLiteral } from "./db";
import { embedOne } from "./embed";

export type SearchHit = {
  id: number;
  materialId: number;
  courseId: number;
  courseName: string;
  semester: string;
  pageNo: number | null;
  content: string;
  title: string;
  kind: string;
  fileName: string | null;
  dist: number;
  rel: number;
  semantic: number;
  lexical: number;
  score: number;
  matchedBy: "hybrid" | "semantic" | "lexical" | "none";
};

type HitRow = RowDataPacket & {
  id: number;
  materialId: number;
  courseId: number;
  courseName: string;
  semester: string;
  pageNo: number | null;
  content: string;
  title: string;
  kind: string;
  fileName: string | null;
  dist: number | null;
  rel: number | null;
  score: number | null;
};

export type SearchOptions = {
  query: string;
  courseId?: number;
  kind?: string;
  limit?: number;
};

const COLUMNS = `
  c.id, c.material_id AS materialId, c.course_id AS courseId, c.page_no AS pageNo, c.content,
  m.title, m.kind, m.file_name AS fileName,
  co.name AS courseName, co.semester`;

export async function hybridSearch(options: SearchOptions): Promise<SearchHit[]> {
  const query = options.query.trim();
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const filters: string[] = [];
  const filterParams: unknown[] = [];

  if (options.courseId) {
    filters.push("c.course_id = ?");
    filterParams.push(options.courseId);
  }
  if (options.kind) {
    filters.push("m.kind = ?");
    filterParams.push(options.kind);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  if (!query) {
    const browse = await rows<HitRow>(
      `SELECT ${COLUMNS}, 0 AS dist, 0 AS rel, 0 AS score
       FROM chunks c
       JOIN materials m ON m.id = c.material_id
       JOIN courses co ON co.id = c.course_id
       ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT ?`,
      [...filterParams, limit],
    );
    return browse.map((row) => ({
      ...row,
      dist: 0,
      rel: 0,
      semantic: 0,
      lexical: 0,
      score: 0,
      matchedBy: "none" as const,
    }));
  }

  const vector = vectorLiteral(await embedOne(query));
  const semanticWeight = config.semanticWeight;

  const queryRows = await rows<HitRow>(
    `SELECT * FROM (
       SELECT ${COLUMNS},
              cosine_distance(c.embedding, ?) AS dist,
              MATCH(c.content) AGAINST(?) AS rel
       FROM chunks c
       JOIN materials m ON m.id = c.material_id
       JOIN courses co ON co.id = c.course_id
       ${where}
     ) t
     ORDER BY ? * (CASE WHEN t.dist < 1 THEN 1 - t.dist ELSE 0 END)
            + ? * (CASE WHEN t.rel >= 0.6 THEN t.rel / (t.rel + 1) ELSE 0 END) DESC
     LIMIT ?`,
    [vector, query, semanticWeight, lexicalWeight, ...filterParams, limit * 3],
  ).catch(async (error: unknown) => {
    console.error("混合检索 SQL 失败，退回纯向量检索", error);
    return rows<HitRow>(
      `SELECT ${COLUMNS}, cosine_distance(c.embedding, ?) AS dist, 0 AS rel, 0 AS score
       FROM chunks c
       JOIN materials m ON m.id = c.material_id
       JOIN courses co ON co.id = c.course_id
       ${where}
       ORDER BY dist ASC
       LIMIT ?`,
      [vector, ...filterParams, limit],
    );
  });

  const mapped = queryRows
    .map((row) => {
      const dist = Number(row.dist ?? 1);
      const rel = Number(row.rel ?? 0);
      const semantic = Math.max(0, 1 - dist);
      const lexical = rel >= 0.6 ? rel / (rel + 1) : 0;
      const score = semantic * semanticWeight + lexical * lexicalWeight;
      const matchedBy: SearchHit["matchedBy"] =
        lexical > 0 && semantic >= 0.2
          ? "hybrid"
          : lexical > 0
            ? "lexical"
            : semantic >= 0.2
              ? "semantic"
              : "none";

      return { ...row, dist, rel, semantic, lexical, score, matchedBy };
    })
    // 过滤掉"既没有语义相似度、全文相关度也很弱"的噪声结果
    .filter((hit) => hit.lexical > 0 || hit.semantic >= 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return mapped;
}
