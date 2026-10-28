import { NextResponse } from "next/server";
import { cardStats, getDueCards } from "@/lib/cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
    const [cards, stats] = await Promise.all([
      getDueCards(Number.isFinite(limit) ? Math.min(limit, 50) : 20),
      cardStats(),
    ]);
    return NextResponse.json({ cards, stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "复习队列读取失败" }, { status: 500 });
  }
}
