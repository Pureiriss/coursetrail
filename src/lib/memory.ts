import type { RowDataPacket } from "mysql2/promise";
import { rows, run } from "./db";

export type RecentSearch = {
  query: string;
  hits: number;
  at: string;
};

export type WeakCard = {
  id: number;
  front: string;
  lapses: number;
  source: string | null;
  pageNo: number | null;
};

export type MemorySummary = {
  goal: number;
  todayReviews: number;
  totalReviews: number;
  streakDays: number;
  recentSearches: RecentSearch[];
  weakCards: WeakCard[];
  storedAt: string;
};

export async function getPreference(key: string, fallback: string): Promise<string> {
  const found = await rows<RowDataPacket & { v: string }>(
    "SELECT v FROM prefs WHERE k = ?",
    [key],
  );
  return found[0]?.v ?? fallback;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO prefs (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)",
    [key, value],
  );
}

export async function getDailyGoal(): Promise<number> {
  const value = Number(await getPreference("daily_goal", "10"));
  return Number.isFinite(value) && value > 0 ? Math.min(value, 100) : 10;
}

export async function recordSearch(
  query: string,
  courseId: number | undefined,
  hitCount: number,
): Promise<void> {
  const trimmed = query.trim().slice(0, 200);
  if (trimmed.length < 2) return;

  const recent = await rows<RowDataPacket & { id: number }>(
    `SELECT id FROM search_history
     WHERE query = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
     LIMIT 1`,
    [trimmed],
  );
  if (recent.length) return;

  await run(
    "INSERT INTO search_history (query, course_id, hit_count) VALUES (?, ?, ?)",
    [trimmed, courseId ?? null, hitCount],
  );
}

export async function recentSearches(limit = 6): Promise<RecentSearch[]> {
  const result = await rows<
    RowDataPacket & { query: string; hits: number; at: string }
  >(
    `SELECT query, MAX(hit_count) AS hits, DATE_FORMAT(MAX(created_at), '%m-%d %H:%i') AS at
     FROM search_history
     GROUP BY query
     ORDER BY MAX(created_at) DESC
     LIMIT ?`,
    [limit],
  );
  return result.map((row) => ({ query: row.query, hits: Number(row.hits), at: row.at }));
}

export async function todayReviews(): Promise<number> {
  const [row] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM reviews WHERE reviewed_at >= CURDATE()",
  );
  return Number(row?.total ?? 0);
}

async function streakDays(): Promise<number> {
  const days = await rows<RowDataPacket & { d: string }>(
    `SELECT DISTINCT DATE_FORMAT(reviewed_at, '%Y-%m-%d') AS d
     FROM reviews ORDER BY d DESC LIMIT 400`,
  );
  if (!days.length) return 0;

  const set = new Set(days.map((row) => row.d));
  const cursor = new Date();
  const key = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

  if (!set.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (set.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function weakCards(limit = 5): Promise<WeakCard[]> {
  const result = await rows<
    RowDataPacket & {
      id: number;
      front: string;
      lapses: number;
      title: string | null;
      page_no: number | null;
    }
  >(
    `SELECT k.id, k.front, k.lapses, m.title, c.page_no
     FROM cards k
     LEFT JOIN chunks c ON c.id = k.chunk_id
     LEFT JOIN materials m ON m.id = c.material_id
     ORDER BY k.lapses DESC, k.stability ASC
     LIMIT ?`,
    [limit * 4],
  );

  const seen = new Set<string>();
  const picked: WeakCard[] = [];
  for (const row of result) {
    const key = row.title ?? row.front;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push({
      id: row.id,
      front: row.front,
      lapses: Number(row.lapses),
      source: row.title,
      pageNo: row.page_no,
    });
    if (picked.length >= limit) break;
  }
  return picked;
}

export async function getMemorySummary(): Promise<MemorySummary> {
  const [goal, today, total, streak, recent, weak] = await Promise.all([
    getDailyGoal(),
    todayReviews(),
    rows<RowDataPacket & { total: number }>("SELECT COUNT(*) AS total FROM reviews"),
    streakDays(),
    recentSearches(),
    weakCards(),
  ]);

  return {
    goal,
    todayReviews: today,
    totalReviews: Number(total[0]?.total ?? 0),
    streakDays: streak,
    recentSearches: recent,
    weakCards: weak,
    storedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
}
