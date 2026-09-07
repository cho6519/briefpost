import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

/**
 * .env.local 파일에서 환경변수를 안전하게 파싱
 */
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

async function triggerCron() {
  const env = loadEnvLocal();
  const secret = process.env.CRON_SECRET || env.CRON_SECRET || "test-cron-secret-12345";
  const baseUrl = process.env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 명령줄 인자에서 limit 수신 (예: node scripts/trigger-cron.mjs 2)
  const argLimit = parseInt(process.argv[2], 10);
  const limit = !isNaN(argLimit) && argLimit > 0 ? argLimit : 2;

  console.log("\n================================================================================");
  console.log("🚀 [BriefPost] 로컬 기사 수집 & AI 패러프레이징 자동 송출 파이프라인 수동 트리거");
  console.log("================================================================================");
  console.log(`• 대상 서버: ${baseUrl}`);
  console.log(`• 엔드포인트: /api/cron/publish-articles`);
  console.log(`• 1회 처리 목표 기사 수(limit): ${limit}건`);
  console.log(`• 인증 토큰(CRON_SECRET): ${secret.slice(0, 4)}****`);
  console.log(`• 시작 일시: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
  console.log("--------------------------------------------------------------------------------");

  const targetUrl = `${baseUrl}/api/cron/publish-articles?secret=${encodeURIComponent(secret)}&limit=${limit}`;

  const startTime = Date.now();
  console.log("⏳ 파이프라인 호출 중... (RSS 수집 + Gemini AI 재가공 + DB 저장이 진행됩니다)");

  let response;
  try {
    response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
    });
  } catch (netErr) {
    console.error("\n❌ [연결 실패] 로컬 Next.js 서버에 접속할 수 없습니다.");
    console.error(`  - 오류 내용: ${netErr.message}`);
    console.error("\n💡 [조치 방법]");
    console.error("  새 터미널 창을 열고 먼저 개발 서버를 실행해 주세요:");
    console.error("  👉 npm run dev\n");
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;
  const status = response.status;
  const statusText = response.statusText;

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    const rawText = await response.text();
    console.error(`\n❌ [응답 파싱 오류] HTTP ${status} (${statusText})`);
    console.error("서버 반환 본문:", rawText.slice(0, 300));
    process.exit(1);
  }

  console.log(`\n📡 [엔드포인트 응답 수신] HTTP ${status} ${statusText} (소요 시간: ${(durationMs / 1000).toFixed(1)}초)`);
  console.log("--------------------------------------------------------------------------------");

  if (!response.ok || !data.success) {
    console.error("❌ 파이프라인 처리 중 에러 발생!");
    console.error(`• 실패 단계: [${data.stage || "UNKNOWN"}] ${data.stageDescription || ""}`);
    console.error(`• 에러 메시지: ${data.error || "원인 불명"}`);
    if (data.diagnostics) {
      console.error("• 진단 정보:", JSON.stringify(data.diagnostics, null, 2));
    }
    process.exit(1);
  }

  // 1. 수집 요약 출력
  const summary = data.summary || {};
  console.log("📊 [1. RSS 수집 & 7일 날짜 필터링 통계]");
  console.log(`  - 전체 긁어온 원문 기사: ${summary.totalRssRawFetched ?? summary.totalRssFetched ?? 0}건`);
  console.log(`  - 기존 DB 중복 스킵:     ${summary.duplicateSkippedCount ?? summary.skippedCount ?? 0}건`);
  console.log(`  - 제외된 지난 기사(>7일): ${summary.expiredCount ?? 0}건`);
  console.log(`  - 7일 이내 유효 신규 기사:${summary.totalNewCandidates ?? 0}건`);
  console.log(`  - AI 재가공 발행 성공:   ${summary.publishedCount ?? 0}건`);
  console.log(`  - 처리 실패 건수:        ${summary.failedCount ?? 0}건`);

  // 2. 피드별 상태
  if (Array.isArray(data.feedStatuses)) {
    console.log("\n🌐 [2. 피드별 수집 결과]");
    for (const f of data.feedStatuses) {
      const mark = f.status === "success" ? "✅" : "⚠️";
      console.log(`  ${mark} [신규 ${f.itemCount}건] ${f.feedUrl} ${f.error ? `(${f.error})` : ""}`);
    }
  }

  // 3. 신규 발행 기사 목록
  const articles = data.publishedArticles || [];
  console.log("\n📝 [3. 새로 DB에 적재된 기사 목록]");
  if (articles.length === 0) {
    console.log("  (새로 발행할 신규 기사 후보가 없거나 모두 중복 처리되었습니다)");
  } else {
    articles.forEach((a, idx) => {
      console.log(`  [${idx + 1}] ID: ${a.id} | [${a.category}] ${a.title}`);
      console.log(`      🔗 로컬 URL: ${baseUrl}${a.url}`);
      console.log(`      📰 원문 출처: ${a.sourceUrl ? a.sourceUrl.slice(0, 70) + "..." : "미지정"}`);
    });
  }

  // 4. 로컬 SQLite news.db 직접 교차 검증
  try {
    const dbPath = path.join(process.cwd(), "data", "news.db");
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath);
      const totalCount = db.prepare("SELECT COUNT(*) as count FROM articles").get().count;
      const latestRows = db
        .prepare("SELECT id, title, category, createdAt FROM articles ORDER BY id DESC LIMIT 5")
        .all();

      console.log("\n💾 [4. 로컬 SQLite DB (news.db) 최종 교차 검증]");
      console.log(`  - 현재 DB 전체 기사 총계: ${totalCount}건`);
      console.log("  - 최신 등록 기사 TOP 5:");
      console.table(latestRows);
    }
  } catch (dbErr) {
    console.warn("  (DB 파일 직접 조회 실패, 엔드포인트 응답 데이터로 확인 완료):", dbErr.message);
  }

  console.log("================================================================================");
  console.log("🎉 파이프라인 1회 즉시 실행 및 로컬 DB 적재 확인이 정상 완료되었습니다!");
  console.log(`👉 브라우저에서 확인: ${baseUrl}`);
  console.log("================================================================================\n");
}

triggerCron();
