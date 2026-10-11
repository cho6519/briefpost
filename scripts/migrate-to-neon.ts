import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { isNeonConfigured, getNeonSql, initializeNeonSchema } from "../src/lib/neonDb";

// .env.local 직접 로드
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

async function runMigration() {
  console.log("================================================================================");
  console.log("🐘 [Neon PostgreSQL] SQLite ➔ Neon Serverless 완전 이전 마이그레이터");
  console.log("• 시작 일시:", new Date().toISOString());
  console.log("================================================================================");

  if (!isNeonConfigured()) {
    console.error("❌ [오류] DATABASE_URL 환경변수가 설정되지 않았습니다.");
    console.log("💡 .env.local 또는 Vercel 환경변수에 다음과 같이 Neon 연결 URL을 설정하세요:");
    console.log("   DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require\n");
    process.exit(1);
  }

  const sql = getNeonSql();
  if (!sql) {
    throw new Error("Neon SQL 인스턴스 초기화 실패");
  }

  // 1. 스키마 초기화
  console.log("📦 [1/4] Neon PostgreSQL 테이블 스키마 초기화 중...");
  await initializeNeonSchema();
  console.log("✅ [1/4] 스키마(articles, publish_queue, pipeline_runs 등) 생성/확인 완료!");

  // 2. 원본 SQLite 데이터 로드
  const sqliteDbPath = path.join(process.cwd(), "data", "news.db");
  if (!fs.existsSync(sqliteDbPath)) {
    throw new Error(`SQLite 파일이 존재하지 않습니다: ${sqliteDbPath}`);
  }
  const sqlite = new Database(sqliteDbPath, { readonly: true });
  const rawArticles = sqlite.prepare("SELECT * FROM articles ORDER BY id ASC").all() as Array<Record<string, unknown>>;
  console.log(`📦 [2/4] 원본 SQLite articles 기사 로드: 총 ${rawArticles.length}건`);

  // 3. Neon DB articles 테이블로 마이그레이션
  console.log("🚀 [3/4] Neon articles 테이블로 데이터 복제 진행 중...");
  let insertedArticles = 0;
  let skippedArticles = 0;

  for (const a of rawArticles) {
    try {
      // slug 중복 시 충돌 방지
      const res = await sql`
        INSERT INTO articles (
          title, slug, content, summary, category, meta_title, meta_description,
          thumbnail_url, source_url, cta_type, image_theme, highlight_badge, card_title,
          created_at, updated_at
        ) VALUES (
          ${a.title as string},
          ${a.slug as string},
          ${a.content as string},
          ${(a.summary as string) || null},
          ${a.category as string},
          ${(a.metaTitle as string) || null},
          ${(a.metaDescription as string) || null},
          ${(a.thumbnailUrl as string) || null},
          ${(a.sourceUrl as string) || null},
          ${(a.ctaType as string) || "general"},
          ${(a.imageTheme as string) || null},
          ${(a.highlightBadge as string) || null},
          ${(a.card_title as string) || null},
          ${(a.createdAt as string) || new Date().toISOString()},
          ${(a.updatedAt as string) || new Date().toISOString()}
        )
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;
      if (res.length > 0) insertedArticles++;
    } catch (err) {
      console.warn(`  ⚠️ 기사 '${a.slug}' 이전 경고:`, err instanceof Error ? err.message : String(err));
      skippedArticles++;
    }
  }
  console.log(`✅ [3/4] 기사 마이그레이션 완료: 성공 ${insertedArticles}건, 건너뜀/실패 ${skippedArticles}건`);

  // 4. 발행 대기열(publish-queue.json) 마이그레이션
  console.log("📦 [4/4] 발행 대기열(publish_queue) 마이그레이션 중...");
  const queuePath = path.join(process.cwd(), "data", "publish-queue.json");
  let queueCount = 0;
  if (fs.existsSync(queuePath)) {
    try {
      const queueItems = JSON.parse(fs.readFileSync(queuePath, "utf-8")) as Array<Record<string, unknown>>;
      for (const item of queueItems) {
        await sql`
          INSERT INTO publish_queue (
            id, status, payload, search_intent, attempts, last_error, queued_at, published_at
          ) VALUES (
            ${item.id as string},
            ${item.status as string},
            ${JSON.stringify(item.payload)},
            ${(item.searchIntent as string) || null},
            ${Number(item.attempts) || 0},
            ${(item.lastError as string) || null},
            ${(item.queuedAt as string) || new Date().toISOString()},
            ${(item.publishedAt as string) || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            payload = EXCLUDED.payload
        `;
        queueCount++;
      }
      console.log(`✅ [4/4] 대기열 아이템 ${queueCount}건 마이그레이션 완료!`);
    } catch (err) {
      console.warn("  ⚠️ 대기열 마이그레이션 경고:", err);
    }
  }

  // 최종 검증
  const [articleCountRow] = await sql`SELECT COUNT(*)::int as count FROM articles`;
  const [queueCountRow] = await sql`SELECT COUNT(*)::int as count FROM publish_queue`;

  console.log("\n================================================================================");
  console.log("🎉 [Neon 마이그레이션 완료] 최종 데이터베이스 상태 검증 리포트");
  console.log(`• Neon PostgreSQL 기사 총계: ${articleCountRow?.count}건`);
  console.log(`• Neon PostgreSQL 대기열 총계: ${queueCountRow?.count}건`);
  console.log("================================================================================");
}

runMigration().catch((err) => {
  console.error("❌ 마이그레이션 실행 중단:", err);
  process.exit(1);
});
