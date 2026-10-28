import path from "node:path";

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  db: {
    host: process.env.SEEKDB_HOST ?? "127.0.0.1",
    port: num(process.env.SEEKDB_PORT, 2881),
    user: process.env.SEEKDB_USER ?? "root",
    password: process.env.SEEKDB_PASSWORD ?? "",
    database: process.env.SEEKDB_DATABASE ?? "coursetrail",
  },
  embedding: {
    apiUrl: process.env.EMBEDDING_API_URL ?? "",
    apiKey: process.env.EMBEDDING_API_KEY ?? "",
    model: process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3",
    dim: num(process.env.EMBEDDING_DIM, 1024),
  },
  llm: {
    apiUrl: process.env.LLM_API_URL ?? "",
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "",
    visionModel: process.env.VISION_MODEL ?? "",
  },
  semanticWeight: Number(process.env.SEMANTIC_WEIGHT ?? 0.62),
  uploadDir: path.join(process.cwd(), "data", "uploads"),
};

export const hasEmbeddingApi = Boolean(config.embedding.apiUrl);
export const hasLLM = Boolean(
  config.llm.apiUrl && config.llm.apiKey && config.llm.model,
);
export const hasVision = Boolean(
  config.llm.apiUrl && config.llm.apiKey && config.llm.visionModel,
);
export const lexicalWeight = 1 - config.semanticWeight;
