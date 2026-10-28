import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { createEmptyCard } from "ts-fsrs";
import { config } from "./config";
import { rows, vectorLiteral, withTransaction } from "./db";
import { embedTexts } from "./embed";
import { extractConcepts, generateCards, transcribeImage } from "./llm";
import { chunkText, truncate } from "./text";

export type IngestInput = {
  courseId: number;
  title: string;
  kind: "pdf" | "image" | "text";
  buffer?: Buffer;
  text?: string;
  mime?: string;
  fileName?: string;
  caption?: string;
};

export type IngestResult = {
  materialId: number;
  chunkCount: number;
  conceptCount: number;
  cardCount: number;
  usedVision: boolean;
  usedLLM: boolean;
};

type PageText = { pageNo: number | null; text: string };

const MAX_CHUNKS = 400;

function extensionFor(mime: string, fileName?: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : "bin";
}

async function persistFile(
  buffer: Buffer,
  mime: string,
  originalName?: string,
): Promise<{ storedName: string; filePath: string }> {
  await mkdir(config.uploadDir, { recursive: true });
  const storedName = `${randomUUID()}.${extensionFor(mime, originalName)}`;
  const filePath = path.join(config.uploadDir, storedName);
  await writeFile(filePath, buffer);
  return { storedName, filePath };
}

async function extractPdf(buffer: Buffer): Promise<{ pages: PageText[]; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  const pageCount = doc.numPages;
  const pages: PageText[] = [];

  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push({ pageNo, text });
    page.cleanup();
  }

  await doc.cleanup();
  return { pages, pageCount };
}

export async function ingestMaterial(input: IngestInput): Promise<IngestResult> {
  const course = await rows<RowDataPacket>("SELECT id FROM courses WHERE id = ?", [
    input.courseId,
  ]);
  if (!course.length) throw new Error("课程不存在");

  let pages: PageText[] = [];
  let pageCount = 0;
  let storedName: string | null = null;
  let filePath: string | null = null;
  let mime = input.mime ?? "text/plain";
  let usedVision = false;

  if (input.kind === "pdf") {
    if (!input.buffer) throw new Error("缺少 PDF 文件内容");
    const extracted = await extractPdf(input.buffer);
    pageCount = extracted.pageCount;
    pages = extracted.pages;
    const saved = await persistFile(input.buffer, input.mime ?? "application/pdf", input.fileName);
    storedName = saved.storedName;
    filePath = saved.filePath;
    if (!pages.length) {
      throw new Error("这个 PDF 没有可提取的文字，可能是扫描件，请把关键页拍照上传或补充一段说明");
    }
  } else if (input.kind === "image") {
    if (!input.buffer) throw new Error("缺少图片内容");
    mime = input.mime ?? "image/jpeg";
    const saved = await persistFile(input.buffer, mime, input.fileName);
    storedName = saved.storedName;
    filePath = saved.filePath;

    const transcribed = await transcribeImage(input.buffer, mime).catch(() => null);
    usedVision = Boolean(transcribed);
    const text = [input.caption?.trim(), transcribed?.trim()].filter(Boolean).join("\n\n");
    pages = [{ pageNo: null, text: text || `图片资料：${input.title}` }];
  } else {
    const text = (input.text ?? "").trim();
    if (!text) throw new Error("文字内容为空");
    mime = "text/plain";
    const saved = await persistFile(Buffer.from(text, "utf8"), mime, `${input.title}.txt`);
    storedName = saved.storedName;
    filePath = saved.filePath;
    pages = [{ pageNo: null, text }];
  }

  const chunkRows: { pageNo: number | null; content: string }[] = [];
  for (const page of pages) {
    const pieces = chunkText(page.text);
    for (const content of pieces) {
      chunkRows.push({ pageNo: page.pageNo, content });
      if (chunkRows.length >= MAX_CHUNKS) break;
    }
    if (chunkRows.length >= MAX_CHUNKS) break;
  }

  if (!chunkRows.length) throw new Error("没有提取到可用内容");

  const vectors = await embedTexts(chunkRows.map((row) => row.content));

  const materialId = await withTransaction(async (conn: PoolConnection) => {
    const [materialResult] = await conn.query(
      `INSERT INTO materials (course_id, title, kind, file_name, file_path, mime_type, page_count, chunk_count, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.courseId,
        input.title,
        input.kind,
        storedName,
        filePath,
        mime,
        pageCount,
        chunkRows.length,
        truncate(chunkRows[0].content, 160),
      ],
    );
    const newId = (materialResult as { insertId: number }).insertId;

    for (let index = 0; index < chunkRows.length; index += 1) {
      const row = chunkRows[index];
      await conn.query(
        `INSERT INTO chunks (material_id, course_id, page_no, chunk_index, content, embedding)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newId,
          input.courseId,
          row.pageNo,
          index,
          row.content,
          vectorLiteral(vectors[index]),
        ],
      );
    }
    return newId;
  });

  const chunkTexts = chunkRows.map((row) => row.content);
  let conceptCount = 0;
  let cardCount = 0;
  let usedLLM = false;

  try {
    const chunkRecords = await rows<
      RowDataPacket & { id: number; chunk_index: number }
    >("SELECT id, chunk_index FROM chunks WHERE material_id = ? ORDER BY chunk_index", [
      materialId,
    ]);

    const concepts = await extractConcepts(input.title, chunkTexts);
    if (concepts) {
      usedLLM = true;
      for (const concept of concepts) {
        await rows("INSERT IGNORE INTO concepts (name, course_id, aliases) VALUES (?, ?, ?)", [
          concept.name,
          input.courseId,
          concept.aliases.join(","),
        ]);
        const [conceptRow] = await rows<RowDataPacket & { id: number }>(
          "SELECT id FROM concepts WHERE name = ?",
          [concept.name],
        );
        if (!conceptRow) continue;
        conceptCount += 1;
        for (const chunkIndex of concept.chunkIndexes) {
          const target = chunkRecords.find((item) => item.chunk_index === chunkIndex);
          if (!target) continue;
          await rows("INSERT IGNORE INTO chunk_concepts (chunk_id, concept_id) VALUES (?, ?)", [
            target.id,
            conceptRow.id,
          ]);
        }
      }
    }

    const generated = await generateCards(input.title, chunkTexts);
    const cards =
      generated ??
      chunkRows.slice(0, 6).map((row, index) => {
        const heading = row.content.split("\n")[0].trim();
        const usable = heading.length > 1 && heading.length <= 30 && !heading.includes("。");
        return {
          chunkIndex: index,
          front: usable
            ? `用自己的话解释「${heading}」`
            : `《${input.title}》${row.pageNo ? `第 ${row.pageNo} 页` : "这段笔记"}的核心内容是什么？`,
          back: truncate(row.content, 180),
        };
      });
    if (generated) usedLLM = true;

    const empty = createEmptyCard(new Date());
    for (const card of cards) {
      const target = chunkRecords.find((item) => item.chunk_index === card.chunkIndex);
      if (!target) continue;
      await rows(
        `INSERT INTO cards (chunk_id, course_id, front, back, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          target.id,
          input.courseId,
          card.front,
          card.back,
          empty.due,
          empty.stability,
          empty.difficulty,
          empty.elapsed_days,
          empty.scheduled_days,
          empty.learning_steps,
          empty.reps,
          empty.lapses,
          empty.state,
        ],
      );
      cardCount += 1;
    }
  } catch (error) {
    console.error("生成概念/卡片失败（不影响资料入库）", error);
  }

  return {
    materialId,
    chunkCount: chunkRows.length,
    conceptCount,
    cardCount,
    usedVision,
    usedLLM,
  };
}
