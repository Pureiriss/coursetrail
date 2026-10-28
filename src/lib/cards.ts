import type { RowDataPacket } from "mysql2/promise";
import { createEmptyCard, fsrs, type Card as FsrsCard, type Grade } from "ts-fsrs";
import { rows, run } from "./db";

const scheduler = fsrs({ enable_fuzz: false });

export type DueCard = {
  id: number;
  front: string;
  back: string;
  due: string;
  state: number;
  reps: number;
  sourceTitle: string | null;
  materialId: number | null;
  pageNo: number | null;
  fileName: string | null;
  courseName: string | null;
};

type CardRow = RowDataPacket & {
  id: number;
  front: string;
  back: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: Date | null;
  sourceTitle: string | null;
  materialId: number | null;
  pageNo: number | null;
  fileName: string | null;
  courseName: string | null;
};

const CARD_COLUMNS = `
  k.id, k.front, k.back, k.due, k.stability, k.difficulty, k.elapsed_days,
  k.scheduled_days, k.learning_steps, k.reps, k.lapses, k.state, k.last_review,
  m.title AS sourceTitle, m.id AS materialId, ch.page_no AS pageNo,
  m.file_name AS fileName, co.name AS courseName`;

const CARD_JOINS = `
  FROM cards k
  LEFT JOIN chunks ch ON ch.id = k.chunk_id
  LEFT JOIN materials m ON m.id = ch.material_id
  LEFT JOIN courses co ON co.id = k.course_id`;

function toFsrsCard(row: CardRow): FsrsCard {
  return {
    due: new Date(row.due),
    stability: Number(row.stability),
    difficulty: Number(row.difficulty),
    elapsed_days: Number(row.elapsed_days),
    scheduled_days: Number(row.scheduled_days),
    learning_steps: Number(row.learning_steps),
    reps: Number(row.reps),
    lapses: Number(row.lapses),
    state: Number(row.state),
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export async function getDueCards(limit = 20): Promise<DueCard[]> {
  const result = await rows<CardRow>(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS} WHERE k.due <= NOW() ORDER BY k.due ASC LIMIT ?`,
    [limit],
  );
  return result.map((row) => ({
    id: row.id,
    front: row.front,
    back: row.back,
    due: new Date(row.due).toISOString(),
    state: Number(row.state),
    reps: Number(row.reps),
    sourceTitle: row.sourceTitle,
    materialId: row.materialId,
    pageNo: row.pageNo,
    fileName: row.fileName,
    courseName: row.courseName,
  }));
}

export async function reviewCard(cardId: number, rating: Grade) {
  const found = await rows<CardRow>(`SELECT ${CARD_COLUMNS} ${CARD_JOINS} WHERE k.id = ?`, [cardId]);
  const row = found[0];
  if (!row) throw new Error("卡片不存在");

  const now = new Date();
  const { card: next } = scheduler.next(toFsrsCard(row), now, rating);

  await run(
    `UPDATE cards SET due = ?, stability = ?, difficulty = ?, elapsed_days = ?,
       scheduled_days = ?, learning_steps = ?, reps = ?, lapses = ?, state = ?, last_review = ?
     WHERE id = ?`,
    [
      next.due,
      next.stability,
      next.difficulty,
      next.elapsed_days,
      next.scheduled_days,
      next.learning_steps,
      next.reps,
      next.lapses,
      next.state,
      next.last_review ?? now,
      cardId,
    ],
  );
  await run("INSERT INTO reviews (card_id, rating, reviewed_at) VALUES (?, ?, ?)", [
    cardId,
    rating,
    now,
  ]);

  return {
    due: next.due.toISOString(),
    intervalDays: next.scheduled_days,
    state: next.state,
  };
}

export async function cardStats() {
  const [due] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM cards WHERE due <= NOW()",
  );
  const [total] = await rows<RowDataPacket & { total: number }>("SELECT COUNT(*) AS total FROM cards");
  const [today] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM reviews WHERE reviewed_at >= CURDATE()",
  );
  return {
    due: Number(due?.total ?? 0),
    total: Number(total?.total ?? 0),
    reviewedToday: Number(today?.total ?? 0),
  };
}

export function emptyCardState() {
  return createEmptyCard(new Date());
}
