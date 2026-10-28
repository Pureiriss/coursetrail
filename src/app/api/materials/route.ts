import { NextResponse } from "next/server";
import { ingestMaterial } from "@/lib/ingest";
import { listMaterials } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_SIZE = 25 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const courseId = new URL(request.url).searchParams.get("courseId");
    return NextResponse.json({
      materials: await listMaterials(courseId ? Number(courseId) : undefined),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "资料读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const courseId = Number(form.get("courseId"));
    const caption = String(form.get("caption") ?? "").trim();
    const titleInput = String(form.get("title") ?? "").trim();

    if (!courseId) return NextResponse.json({ error: "请先选择课程" }, { status: 400 });
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件超过 25MB" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const name = file.name;
    const lower = name.toLowerCase();
    const kind = mime === "application/pdf" || lower.endsWith(".pdf")
      ? "pdf"
      : mime.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/.test(lower)
        ? "image"
        : "text";

    if (!["pdf", "image", "text"].includes(kind)) {
      return NextResponse.json({ error: "暂不支持这种文件类型" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const title = titleInput || name.replace(/\.[^.]+$/, "") || "未命名资料";

    const result = await ingestMaterial({
      courseId,
      title,
      kind,
      buffer,
      mime,
      fileName: name,
      caption,
      text: kind === "text" ? buffer.toString("utf8") : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "入库失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
