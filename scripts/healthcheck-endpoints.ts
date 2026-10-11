import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { GET as getAdsTxt } from "../src/app/ads.txt/route";
import fs from "fs";
import path from "path";

async function runHealthCheck() {
  console.log("==================================================================");
  console.log("🏥 [최종 헬스체크] 서치콘솔 및 애드센스 필수 공개 엔드포인트 검증");
  console.log("==================================================================");

  let allPassed = true;

  // 1. /sitemap.xml 점검
  console.log("\n▶ 1. /sitemap.xml 검증...");
  try {
    const sitemapData = await sitemap();
    const urlCount = sitemapData.length;
    const newsUrls = sitemapData.filter((e) => e.url.includes("/news/"));
    
    console.log(`   - 총 URL 수: ${urlCount}개 (기사: ${newsUrls.length}개)`);
    console.log(`   - 샘플 URL 1: ${sitemapData[0].url}`);
    console.log(`   - 샘플 URL 2: ${newsUrls[0]?.url}`);

    if (urlCount >= 100 && newsUrls.length > 0) {
      console.log("   ✅ [PASS] sitemap.xml 규격 정상 (100개 이상 URL 포함)");
    } else {
      console.warn("   ⚠️ [WARN] sitemap URL 수가 예상보다 적습니다:", urlCount);
      allPassed = false;
    }
  } catch (err) {
    console.error("   ❌ [FAIL] sitemap.xml 생성 실패:", err);
    allPassed = false;
  }

  // 2. /robots.txt 점검
  console.log("\n▶ 2. /robots.txt 검증...");
  try {
    const robotsData = robots();
    const rules = Array.isArray(robotsData.rules) ? robotsData.rules : [robotsData.rules];
    const googleBotRule = rules.find((r) => r && r.userAgent === "Googlebot");
    const sitemapDirective = robotsData.sitemap;

    console.log(`   - Googlebot 규칙 설정: ${googleBotRule ? "등록됨" : "누락"}`);
    console.log(`   - Sitemap 지시자: ${sitemapDirective}`);
    console.log(`   - Host: ${robotsData.host}`);

    if (sitemapDirective && googleBotRule) {
      console.log("   ✅ [PASS] robots.txt 검색엔진 크롤러 및 사이트맵 지시자 정상");
    } else {
      console.warn("   ⚠️ [WARN] robots.txt 지시자 확인 필요");
      allPassed = false;
    }
  } catch (err) {
    console.error("   ❌ [FAIL] robots.txt 검증 실패:", err);
    allPassed = false;
  }

  // 3. /ads.txt 점검 (동적 라우트 및 정적 public/ads.txt 듀얼 점검)
  console.log("\n▶ 3. /ads.txt 검증...");
  try {
    const response = await getAdsTxt();
    const textContent = await response.text();
    const status = response.status;

    console.log(`   - 라우트 응답 상태코드: ${status}`);
    console.log(`   - 라우트 본문 내용:\n     ${textContent.trim()}`);

    const staticPath = path.join(process.cwd(), "public", "ads.txt");
    const staticExists = fs.existsSync(staticPath);
    console.log(`   - public/ads.txt 정적 파일 존재 여부: ${staticExists ? "존재함" : "누락"}`);

    if (status === 200 && textContent.includes("pub-5916106612077152") && textContent.includes("f08c47fec0942fa0")) {
      console.log("   ✅ [PASS] ads.txt 규격 및 구글 게시자 ID 매칭 정상 (200 OK)");
    } else {
      console.warn("   ⚠️ [WARN] ads.txt 응답 내용 점검 필요:", textContent);
      allPassed = false;
    }
  } catch (err) {
    console.error("   ❌ [FAIL] ads.txt 검증 실패:", err);
    allPassed = false;
  }

  // 4. 필수 정책 페이지 존재 및 메타데이터 점검
  console.log("\n▶ 4. 필수 정책 페이지 파일 및 라우트 점검...");
  const policyPages = ["privacy", "terms", "about", "contact"];
  for (const pageName of policyPages) {
    const filePath = path.join(process.cwd(), "src", "app", pageName, "page.tsx");
    const exists = fs.existsSync(filePath);
    console.log(`   - /${pageName} 페이지 파일: ${exists ? "정상 존재" : "누락"}`);
    if (!exists) allPassed = false;
  }

  console.log("\n==================================================================");
  if (allPassed) {
    console.log("🎉 [최종 판정] 서치콘솔 및 애드센스 신청을 위한 모든 필수 엔드포인트 100% 정상!");
  } else {
    console.warn("⚠️ [최종 판정] 일부 항목에 경고가 있습니다.");
  }
  console.log("==================================================================");
}

runHealthCheck().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
