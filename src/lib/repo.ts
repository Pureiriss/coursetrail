import type { RowDataPacket } from "mysql2/promise";
import { rows, run } from "./db";

export type Course = {
  id: number;
  name: string;
  semester: string;
  teacher: string | null;
  materialCount: number;
  chunkCount: number;
  cardCount: number;
};

export type Material = {
  id: number;
  courseId: number;
  courseName: string;
  semester: string;
  title: string;
  kind: string;
  fileName: string | null;
  pageCount: number;
  chunkCount: number;
  summary: string | null;
  createdAt: string;
  cardCount: number;
};

type CountRow = RowDataPacket & { total: number };

export async function listCourses(): Promise<Course[]> {
  const result = await rows<
    RowDataPacket & {
      id: number;
      name: string;
      semester: string;
      teacher: string | null;
      materialCount: number;
      chunkCount: number;
      cardCount: number;
    }
  >(
    `SELECT co.id, co.name, co.semester, co.teacher,
       (SELECT COUNT(*) FROM materials m WHERE m.course_id = co.id) AS materialCount,
       (SELECT COUNT(*) FROM chunks c WHERE c.course_id = co.id) AS chunkCount,
       (SELECT COUNT(*) FROM cards k WHERE k.course_id = co.id) AS cardCount
     FROM courses co
     ORDER BY co.created_at DESC`,
  );
  return result.map((row) => ({
    ...row,
    materialCount: Number(row.materialCount),
    chunkCount: Number(row.chunkCount),
    cardCount: Number(row.cardCount),
  }));
}

export async function listMaterials(courseId?: number): Promise<Material[]> {
  const where = courseId ? "WHERE m.course_id = ?" : "";
  const result = await rows<
    RowDataPacket & {
      id: number;
      courseId: number;
      courseName: string;
      semester: string;
      title: string;
      kind: string;
      fileName: string | null;
      pageCount: number;
      chunkCount: number;
      summary: string | null;
      createdAt: string;
      cardCount: number;
    }
  >(
    `SELECT m.id, m.course_id AS courseId, co.name AS courseName, co.semester,
            m.title, m.kind, m.file_name AS fileName, m.page_count AS pageCount,
            m.chunk_count AS chunkCount, m.summary,
            DATE_FORMAT(m.created_at, '%Y-%m-%d') AS createdAt,
            (SELECT COUNT(*) FROM cards k WHERE k.chunk_id IN (SELECT id FROM chunks c WHERE c.material_id = m.id)) AS cardCount
     FROM materials m
     JOIN courses co ON co.id = m.course_id
     ${where}
     ORDER BY m.created_at DESC`,
    courseId ? [courseId] : [],
  );
  return result.map((row) => ({
    ...row,
    pageCount: Number(row.pageCount),
    chunkCount: Number(row.chunkCount),
    cardCount: Number(row.cardCount),
  }));
}

export async function getStats() {
  const [courses] = await rows<CountRow>("SELECT COUNT(*) AS total FROM courses");
  const [materials] = await rows<CountRow>("SELECT COUNT(*) AS total FROM materials");
  const [chunks] = await rows<CountRow>("SELECT COUNT(*) AS total FROM chunks");
  const [concepts] = await rows<CountRow>("SELECT COUNT(*) AS total FROM concepts");
  const [cards] = await rows<CountRow>("SELECT COUNT(*) AS total FROM cards");
  const [due] = await rows<CountRow>("SELECT COUNT(*) AS total FROM cards WHERE due <= NOW()");
  const [reviewedToday] = await rows<CountRow>(
    "SELECT COUNT(*) AS total FROM reviews WHERE reviewed_at >= CURDATE()",
  );

  return {
    courses: Number(courses?.total ?? 0),
    materials: Number(materials?.total ?? 0),
    chunks: Number(chunks?.total ?? 0),
    concepts: Number(concepts?.total ?? 0),
    cards: Number(cards?.total ?? 0),
    due: Number(due?.total ?? 0),
    reviewedToday: Number(reviewedToday?.total ?? 0),
  };
}

export async function createCourse(input: {
  name: string;
  semester: string;
  teacher?: string;
}): Promise<number> {
  const result = await run("INSERT INTO courses (name, semester, teacher) VALUES (?, ?, ?)", [
    input.name,
    input.semester,
    input.teacher ?? null,
  ]);
  return result.insertId;
}
