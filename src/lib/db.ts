import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Vercel Serverless 환경(읽기 전용 파일시스템) 감지 및 /tmp 디렉토리 지원
const isServerless =
  process.env.VERCEL === "1" ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

const DB_DIR = isServerless ? "/tmp" : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "news.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 서버리스 환경에서 /tmp에 DB가 없고 원본 프로젝트에 시드된 DB가 있다면 복사하여 초기 기사 데이터 보존
if (isServerless && !fs.existsSync(/*turbopackIgnore: true*/ DB_PATH)) {
  const seedDbPath = path.join(process.cwd(), "data", "news.db");
  if (fs.existsSync(/*turbopackIgnore: true*/ seedDbPath)) {
    try {
      fs.copyFileSync(seedDbPath, DB_PATH);
    } catch (err) {
      console.warn("[DB] 기존 SQLite 파일 /tmp 복사 실패, 새로 생성합니다:", err);
    }
  }
}

// 싱글톤 패턴으로 DB 인스턴스 관리 (Next.js 핫 리로딩 대응)
declare global {
  var __dbInstance: Database.Database | undefined;
}

export function getDatabase(): Database.Database {
  if (process.env.NODE_ENV === "production") {
    return createDb();
  }

  if (!global.__dbInstance) {
    global.__dbInstance = createDb();
  }

  return global.__dbInstance;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);

  // 윈도우 Turbopack 파일 워처와의 락 충돌 방지를 위해 저널 모드 설정
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // 테이블 및 인덱스 초기화
  initSchema(db);

  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      summary TEXT,
      category TEXT NOT NULL,
      metaTitle TEXT,
      metaDescription TEXT,
      thumbnailUrl TEXT,
      sourceUrl TEXT,
      faq TEXT,
      ctaType TEXT DEFAULT 'general',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_createdAt ON articles(createdAt DESC);
  `);

  // 기존 테이블에 faq 및 ctaType 컬럼이 없는 경우 안전하게 마이그레이션 추가
  try {
    const tableInfo = db.pragma("table_info(articles)") as { name: string }[];
    const hasFaq = tableInfo.some((col) => col.name === "faq");
    if (!hasFaq) {
      db.exec("ALTER TABLE articles ADD COLUMN faq TEXT");
    }
    const hasCtaType = tableInfo.some((col) => col.name === "ctaType");
    if (!hasCtaType) {
      db.exec("ALTER TABLE articles ADD COLUMN ctaType TEXT DEFAULT 'general'");
    }
  } catch (err) {
    console.warn("[DB] 컬럼 확인/마이그레이션 스킵:", err);
  }
}

export default getDatabase();
