import { NextResponse } from "next/server";
import { getStats } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStats());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "统计读取失败" }, { status: 500 });
  }
}
