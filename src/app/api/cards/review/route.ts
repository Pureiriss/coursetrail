import { NextResponse } from "next/server";
import type { Grade } from "ts-fsrs";
import { cardStats, reviewCard } from "@/lib/cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cardId?: number; rating?: number };
    const cardId = Number(body.cardId);
    const rating = Number(body.rating);

    if (!Number.isInteger(cardId) || rating < 1 || rating > 4) {
      return NextResponse.json({ error: "参数不合法" }, { status: 400 });
    }

    const result = await reviewCard(cardId, rating as Grade);
    return NextResponse.json({ ...result, stats: await cardStats() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "提交复习结果失败" }, { status: 500 });
  }
}
