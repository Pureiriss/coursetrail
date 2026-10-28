import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { rows } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const materialId = Number(id);
  if (!Number.isInteger(materialId)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const found = await rows<RowDataPacket & { file_path: string | null; file_name: string | null }>(
    "SELECT file_path, file_name FROM materials WHERE id = ?",
    [materialId],
  );
  const material = found[0];
  if (!material?.file_path) {
    return NextResponse.json({ error: "没有原始文件" }, { status: 404 });
  }

  const absolute = path.resolve(material.file_path);
  if (!absolute.startsWith(path.resolve(config.uploadDir) + path.sep)) {
    return NextResponse.json({ error: "路径不合法" }, { status: 403 });
  }

  let data: Buffer;
  try {
    data = await readFile(absolute);
  } catch {
    return NextResponse.json({ error: "文件已丢失" }, { status: 404 });
  }

  const ext = path.extname(material.file_name ?? absolute).slice(1).toLowerCase();
  const body = new Uint8Array(data);

  return new Response(body, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${encodeURIComponent(material.file_name ?? `material-${materialId}.${ext}`)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
