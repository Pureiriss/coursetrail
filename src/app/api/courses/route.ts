import { NextResponse } from "next/server";
import { createCourse, listCourses } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ courses: await listCourses() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "课程读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      semester?: string;
      teacher?: string;
    };
    const name = body.name?.trim();
    const semester = body.semester?.trim();
    if (!name || !semester) {
      return NextResponse.json({ error: "课程名和学期不能为空" }, { status: 400 });
    }
    const id = await createCourse({ name, semester, teacher: body.teacher?.trim() });
    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "课程创建失败" }, { status: 500 });
  }
}
