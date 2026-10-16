import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPathDB = path.resolve(__dirname, "../../../test.db");
const dbPath = process.env.DATABASE_URL || rootPathDB;

const db: DatabaseType = new Database(dbPath, {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
});

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("temp_store = MEMORY");

const createSchema = `
  CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    total_token INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(35) UNIQUE NOT NULL,
    phonetic_token VARCHAR(12),
    alt_phonetic_token VARCHAR(12),
    idf_score REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scores (
    token_id INTEGER NOT NULL,
    doc_id INTEGER NOT NULL,
    tf_score REAL NOT NULL,
    position BLOB,
  
    PRIMARY KEY (token_id, doc_id),
    FOREIGN KEY (token_id) REFERENCES vocabulary(id),
    FOREIGN KEY (doc_id) REFERENCES docs(id)
  );


  CREATE INDEX IF NOT EXISTS idx_token_id ON scores(token_id);
  CREATE INDEX IF NOT EXISTS idx_scores_token_tfscore ON scores(token_id, tf_score DESC);

  CREATE INDEX IF NOT EXISTS idx_vocabulary_phonetic ON vocabulary(phonetic_token);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_alt_phonetic ON vocabulary(alt_phonetic_token);
`;

db.exec(createSchema);

export default db;
