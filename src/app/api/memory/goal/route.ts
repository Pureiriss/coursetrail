import { NextResponse } from "next/server";
import { getDailyGoal, setPreference } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ goal: await getDailyGoal() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { goal?: number };
    const goal = Number(body.goal);
    if (!Number.isInteger(goal) || goal < 1 || goal > 100) {
      return NextResponse.json({ error: "目标需要在 1–100 之间" }, { status: 400 });
    }
    await setPreference("daily_goal", String(goal));
    return NextResponse.json({ goal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
