import { config, hasLLM, hasVision } from "./config";

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "user";
      content: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
    };

async function chat(messages: ChatMessage[], model: string): Promise<string> {
  const base = config.llm.apiUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`模型接口返回 ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

function parseJson<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export type ExtractedConcept = {
  name: string;
  aliases: string[];
  chunkIndexes: number[];
};

type RawConcept = {
  name?: string;
  aliases?: string[];
  chunkIndexes?: number[];
  chunks?: number[];
};

export async function extractConcepts(
  title: string,
  chunks: string[],
): Promise<ExtractedConcept[] | null> {
  if (!hasLLM) return null;

  const numbered = chunks
    .slice(0, 20)
    .map((text, index) => `[${index}] ${text.slice(0, 400)}`)
    .join("\n\n");

  const raw = await chat(
    [
      {
        role: "system",
        content:
          "你是严谨的课程笔记整理助手，只输出 JSON，不要输出解释或 Markdown 代码块。",
      },
      {
        role: "user",
        content: `资料标题：${title}

请抽取 3-8 个这门课的核心概念（专有名词、公式名、方法名），并标注每个概念出现在哪些片段里。概念名控制在 2-12 个字。

片段：
${numbered}

输出格式：
{"concepts":[{"name":"贝叶斯公式","aliases":["Bayes"],"chunks":[0,2]}]}`,
      },
    ],
    config.llm.model,
  );

  const parsed = parseJson<{ concepts?: RawConcept[] }>(raw);
  if (!parsed?.concepts?.length) return null;

  return parsed.concepts
    .map((item) => {
      const indexes = Array.isArray(item.chunkIndexes)
        ? item.chunkIndexes
        : Array.isArray(item.chunks)
          ? item.chunks
          : [];
      return {
        name: (item.name ?? "").trim(),
        aliases: Array.isArray(item.aliases) ? item.aliases.filter(Boolean) : [],
        chunkIndexes: indexes.filter(
          (index) => Number.isInteger(index) && index >= 0,
        ),
      };
    })
    .filter((item) => item.name.length > 0)
    .slice(0, 8);
}

export type GeneratedCard = {
  chunkIndex: number;
  front: string;
  back: string;
};

export async function generateCards(
  title: string,
  chunks: string[],
): Promise<GeneratedCard[] | null> {
  if (!hasLLM) return null;

  const numbered = chunks
    .slice(0, 10)
    .map((text, index) => `[${index}] ${text}`)
    .join("\n\n");

  const raw = await chat(
    [
      {
        role: "system",
        content:
          "你是复习卡片设计师，只输出 JSON，不要输出解释或 Markdown 代码块。",
      },
      {
        role: "user",
        content: `资料标题：${title}

请为下面的片段各生成一张问答式复习卡。问题要考察理解而不是背诵原文，答案不超过 120 字。片段编号必须原样返回。

${numbered}

输出格式：
{"cards":[{"chunk":0,"front":"为什么...？","back":"因为..."}]}`,
      },
    ],
    config.llm.model,
  );

  const parsed = parseJson<{ cards?: GeneratedCard[] }>(raw);
  if (!parsed?.cards?.length) return null;

  return parsed.cards
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.chunkIndex) &&
        typeof item.front === "string" &&
        typeof item.back === "string",
    )
    .slice(0, 10);
}

export async function transcribeImage(
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  if (!hasVision) return null;

  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const raw = await chat(
    [
      {
        role: "system",
        content: "你是课堂笔记转写员，只输出转写后的正文。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "这是一页课堂笔记、板书或课件照片。请尽可能完整地转写其中的文字，数学公式用 LaTeX 表示，保留标题和条目结构。如果页面几乎没有文字，只描述图表内容。",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    config.llm.visionModel,
  );

  return raw || null;
}
