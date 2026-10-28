import { config, hasEmbeddingApi } from "./config";

export const embeddingMode = hasEmbeddingApi ? "api" : "local";

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * 本地兜底向量：中文按 2/3-gram、英文按词做特征哈希。
 * 没有配置 embedding 服务时仍能跑通混合检索，配置后自动切换到真实向量。
 */
export function localEmbed(text: string, dim = config.embedding.dim): number[] {
  const vector = new Float64Array(dim);
  const add = (token: string, weight: number) => {
    const hash = fnv1a(token);
    const index = hash % dim;
    const sign = (hash >>> 15) & 1 ? -1 : 1;
    vector[index] += sign * weight;
  };

  const lower = text.toLowerCase();
  for (const word of lower.match(/[a-z0-9_]{2,}/g) ?? []) add(word, 1);
  for (const run of lower.match(/[\u4e00-\u9fff]+/g) ?? []) {
    for (let i = 0; i < run.length; i += 1) {
      add(run[i], 0.35);
      if (i + 1 < run.length) add(run.slice(i, i + 2), 1);
      if (i + 2 < run.length) add(run.slice(i, i + 3), 0.65);
    }
  }

  let norm = 0;
  for (let i = 0; i < dim; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => value / norm);
}

async function remoteEmbed(texts: string[]): Promise<number[][]> {
  const base = config.embedding.apiUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.embedding.apiKey}`,
    },
    body: JSON.stringify({ model: config.embedding.model, input: texts }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`embedding 接口返回 ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    data?: { embedding: number[]; index?: number }[];
  };
  if (!payload.data?.length) throw new Error("embedding 接口没有返回向量");

  return payload.data
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((item) => item.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  if (!hasEmbeddingApi) return texts.map((text) => localEmbed(text));

  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const batch = texts.slice(i, i + 16);
    const vectors = await remoteEmbed(batch);
    for (const vector of vectors) {
      if (vector.length !== config.embedding.dim) {
        throw new Error(
          `向量维度不一致：模型返回 ${vector.length}，建表为 ${config.embedding.dim}，请调整 EMBEDDING_DIM 后重建表`,
        );
      }
      result.push(vector);
    }
  }
  return result;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
