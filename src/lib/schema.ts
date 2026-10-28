import { config } from "./config";
import { run } from "./db";

const dim = config.embedding.dim;

const statements = [
  `CREATE TABLE IF NOT EXISTS courses (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    semester VARCHAR(32) NOT NULL,
    teacher VARCHAR(64) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_semester (semester)
  )`,
  `CREATE TABLE IF NOT EXISTS materials (
    id INT NOT NULL AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_path VARCHAR(512) DEFAULT NULL,
    mime_type VARCHAR(128) DEFAULT NULL,
    page_count INT NOT NULL DEFAULT 0,
    chunk_count INT NOT NULL DEFAULT 0,
    summary TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id)
  )`,
  `CREATE TABLE IF NOT EXISTS chunks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    material_id INT NOT NULL,
    course_id INT NOT NULL,
    page_no INT DEFAULT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    embedding VECTOR(${dim}),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FULLTEXT KEY ft_content (content) WITH PARSER ik,
    VECTOR KEY vec_embedding (embedding) WITH (DISTANCE=COSINE, TYPE=HNSW, LIB=VSAG),
    KEY idx_material (material_id),
    KEY idx_course (course_id)
  ) ORGANIZATION = HEAP`,
  `CREATE TABLE IF NOT EXISTS concepts (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    course_id INT DEFAULT NULL,
    aliases VARCHAR(512) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (name)
  )`,
  `CREATE TABLE IF NOT EXISTS chunk_concepts (
    chunk_id BIGINT NOT NULL,
    concept_id INT NOT NULL,
    PRIMARY KEY (chunk_id, concept_id)
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id BIGINT NOT NULL AUTO_INCREMENT,
    concept_id INT DEFAULT NULL,
    chunk_id BIGINT DEFAULT NULL,
    course_id INT DEFAULT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    due DATETIME NOT NULL,
    stability DOUBLE NOT NULL DEFAULT 0,
    difficulty DOUBLE NOT NULL DEFAULT 0,
    elapsed_days INT NOT NULL DEFAULT 0,
    scheduled_days INT NOT NULL DEFAULT 0,
    learning_steps INT NOT NULL DEFAULT 0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    state INT NOT NULL DEFAULT 0,
    last_review DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_due (due)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    card_id BIGINT NOT NULL,
    rating INT NOT NULL,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_card (card_id)
  )`,
  `CREATE TABLE IF NOT EXISTS prefs (
    k VARCHAR(64) NOT NULL,
    v TEXT NOT NULL,
    PRIMARY KEY (k)
  )`,
  `CREATE TABLE IF NOT EXISTS search_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    query VARCHAR(255) NOT NULL,
    course_id INT DEFAULT NULL,
    hit_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_created (created_at)
  )`,
];

export async function ensureSchema(): Promise<void> {
  for (const statement of statements) {
    await run(statement);
  }
}
