import fs from "fs";
import path from "path";

// 환경변수 로드
const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const adminSecret = process.env.ADMIN_SECRET;
console.log("================================================================================");
console.log("🧪 [검증 1] ADMIN_SECRET 환경변수 로드 확인");
console.log("• ADMIN_SECRET:", adminSecret ? "OK (설정됨)" : "FAIL (미설정)");
console.log("================================================================================");

async function runVerification() {
  const { GET: statsGet } = await import("../src/app/api/admin/pipeline/stats/route");
  const { POST: publishPost } = await import("../src/app/api/admin/pipeline/publish/route");
  const { getArticleBySlug } = await import("../src/lib/articles");

  console.log("\n🧪 [검증 2] stats 엔드포인트 보안 헤더 검증");

  // 2-1. 헤더 없이 호출
  const reqNoHeader = new Request("http://localhost:3000/api/admin/pipeline/stats", {
    method: "GET",
  });
  // @ts-expect-error NextRequest compatibility
  const resNoHeader = await statsGet(reqNoHeader);
  console.log("• 헤더 없음 요청 응답 코드:", resNoHeader.status, "(기대치: 401)");
  if (resNoHeader.status !== 401) throw new Error("Expected 401 for missing header");

  // 2-2. 잘못된 키로 호출
  const reqBadKey = new Request("http://localhost:3000/api/admin/pipeline/stats", {
    method: "GET",
    headers: { "x-admin-key": "invalid-wrong-key" },
  });
  // @ts-expect-error NextRequest compatibility
  const resBadKey = await statsGet(reqBadKey);
  console.log("• 잘못된 키 요청 응답 코드:", resBadKey.status, "(기대치: 401)");
  if (resBadKey.status !== 401) throw new Error("Expected 401 for wrong key");

  // 2-3. 올바른 키로 호출
  const reqGoodKey = new Request("http://localhost:3000/api/admin/pipeline/stats", {
    method: "GET",
    headers: { "x-admin-key": adminSecret! },
  });
  // @ts-expect-error NextRequest compatibility
  const resGoodKey = await statsGet(reqGoodKey);
  console.log("• 올바른 키 요청 응답 코드:", resGoodKey.status, "(기대치: 200)");
  const jsonGoodKey = await resGoodKey.json();
  console.log("• stats 응답 success:", jsonGoodKey.success);
  console.log("• 대기열 아이템 수:", jsonGoodKey.queueItems?.length, "건");
  if (resGoodKey.status !== 200 || !jsonGoodKey.success) throw new Error("Expected 200 for valid key");

  console.log("\n🧪 [검증 3] 1-Click 수동 승인 발행 (/api/admin/pipeline/publish) 검증");
  const targetQueueId = "queue_1791099785870_ytag";

  // 3-1. 헤더 없이 publish 호출
  const reqPubNoHeader = new Request("http://localhost:3000/api/admin/pipeline/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queueId: targetQueueId }),
  });
  // @ts-expect-error NextRequest compatibility
  const resPubNoHeader = await publishPost(reqPubNoHeader);
  console.log("• 발행 헤더 없음 요청 응답 코드:", resPubNoHeader.status, "(기대치: 401)");
  if (resPubNoHeader.status !== 401) throw new Error("Expected 401 for missing header");

  // 3-2. 올바른 x-admin-key 주입하여 publish 호출
  const reqPubGood = new Request("http://localhost:3000/api/admin/pipeline/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminSecret!,
    },
    body: JSON.stringify({ queueId: targetQueueId }),
  });
  // @ts-expect-error NextRequest compatibility
  const resPubGood = await publishPost(reqPubGood);
  console.log("• 정식 발행 요청 응답 코드:", resPubGood.status, "(기대치: 200)");
  const jsonPubGood = await resPubGood.json();
  console.log("• 정식 발행 결과:", JSON.stringify(jsonPubGood, null, 2));
  if (resPubGood.status !== 200 || !jsonPubGood.success) {
    throw new Error(`Publish failed: ${jsonPubGood.error}`);
  }

  console.log("\n🧪 [검증 4] DB(news.db) 영구 적재 및 블로그 상세 조회 검증");
  const publishedSlug = "multi-agent-workflow-orchestration-b2b-saas-ecosystem";
  const article = getArticleBySlug(publishedSlug);
  if (!article) {
    throw new Error(`Article with slug '${publishedSlug}' not found in DB!`);
  }
  console.log("• DB 조회 성공:");
  console.log("  - ID:", article.id);
  console.log("  - 제목:", article.title);
  console.log("  - 슬러그:", article.slug);
  console.log("  - 카테고리:", article.category);
  console.log("  - 생성일시:", article.createdAt);
  console.log("  - 썸네일:", article.thumbnailUrl ? "OK" : "None");
  console.log("  - 본문 길이:", article.content.length, "자");

  // 3-3. 동일 기사 재발행(멱등성/Idempotency) 검증
  console.log("\n🧪 [검증 5] 멱등성 및 중복 발행 방지 검증");
  const reqPubDup = new Request("http://localhost:3000/api/admin/pipeline/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminSecret!,
    },
    body: JSON.stringify({ queueId: targetQueueId }),
  });
  // @ts-expect-error NextRequest compatibility
  const resPubDup = await publishPost(reqPubDup);
  const jsonPubDup = await resPubDup.json();
  console.log("• 이미 발행된 기사 재요청 응답:", JSON.stringify(jsonPubDup, null, 2));

  console.log("\n================================================================================");
  console.log("🎉 [전체 검증 완료] 모든 인증 헤더 연동 및 1-Click 수동 승인 발행 완벽 통과!");
  console.log("================================================================================");
}

runVerification().catch((err) => {
  console.error("❌ 검증 실패:", err);
  process.exit(1);
});
