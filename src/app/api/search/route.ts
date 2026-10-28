import { NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const hits = await hybridSearch({
      query: params.get("q") ?? "",
      courseId: params.get("courseId") ? Number(params.get("courseId")) : undefined,
      kind: params.get("kind") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 12,
    });
    return NextResponse.json({ hits });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "检索失败" }, { status: 500 });
  }
}
