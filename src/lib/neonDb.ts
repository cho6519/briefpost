import { neon, Pool, NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Neon PostgreSQL 서버리스 데이터베이스 커넥터
 * 
 * Vercel Serverless / Edge 및 로컬 환경에서 안전하게 동작하며:
 * - process.env.DATABASE_URL이 설정된 경우 Neon PostgreSQL 풀 연결 제공
 * - 미설정 시 null 반환 (SQLite Fallback 유지)
 */

let neonSql: NeonQueryFunction<false, false> | null = null;
let neonPool: Pool | null = null;

export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && url.startsWith("postgres"));
}

export function getNeonSql(): NeonQueryFunction<false, false> | null {
  if (!isNeonConfigured()) return null;
  if (!neonSql) {
    const url = process.env.DATABASE_URL!.trim();
    neonSql = neon(url);
  }
  return neonSql;
}

export function getNeonPool(): Pool | null {
  if (!isNeonConfigured()) return null;
  if (!neonPool) {
    const connectionString = process.env.DATABASE_URL!.trim();
    neonPool = new Pool({ connectionString });
  }
  return neonPool;
}

/**
 * Neon PostgreSQL 기본 스키마 DDL
 */
export const NEON_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  thumbnail_url TEXT,
  source_url TEXT,
  cta_type TEXT DEFAULT 'general',
  image_theme TEXT,
  highlight_badge TEXT,
  card_title TEXT,
  status TEXT DEFAULT 'PUBLISHED',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

CREATE TABLE IF NOT EXISTS publish_queue (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  search_intent TEXT,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  processing_started_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  summary TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  source TEXT,
  context TEXT,
  search_intent TEXT,
  trend_score INTEGER,
  search_volume INTEGER,
  is_search_volume_estimate BOOLEAN DEFAULT TRUE,
  cpc NUMERIC,
  is_cpc_estimate BOOLEAN DEFAULT TRUE,
  grade TEXT,
  score NUMERIC,
  status TEXT NOT NULL,
  criteria_json JSONB,
  discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  evaluated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pipeline_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * Neon PostgreSQL 데이터베이스 스키마 초기화 함수
 */
export async function initializeNeonSchema(): Promise<boolean> {
  const pool = getNeonPool();
  if (!pool) return false;

  try {
    // 세미콜론 기준으로 DDL 분할 실행
    const statements = NEON_SCHEMA_DDL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
    }
    return true;
  } catch (err) {
    console.error("[Neon DB] 스키마 초기화 실패:", err);
    throw err;
  }
}
