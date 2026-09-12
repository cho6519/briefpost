import { rewriteArticleWithAI } from "../src/lib/ai";
import { createArticle, getArticleBySlug } from "../src/lib/articles";
import { getStockImage } from "../src/utils/imageMapper";

async function main() {
  console.log("=== 소상공인 정책자금 실기사 1건 발행 및 검증 테스트 ===");

  const sampleRaw = {
    title: "소상공인시장진흥공단 2026 일반경영안정자금 접수 개시…최대 7000만원 저리 지원",
    content: `중소벤처기업부와 소상공인시장진흥공단(소진공)이 경영 애로를 겪는 소상공인을 위해 '2026년 소상공인 정책자금 일반경영안정자금' 접수를 시작한다. 
상시근로자 5인 미만(제조·건설·운수업 10인 미만) 소상공인을 대상으로 기업당 최대 7,000만 원 한도로 연 2~3%대 정책금리를 지원한다.
대출 기간은 5년(2년 거치, 3년 분할상환)이며 소상공인정책자금 누리집(ols.semas.or.kr)에서 온라인 비대면 접수가 가능하다. 예산 소진 시 조기 마감될 수 있다.`,
    category: "정책·지원금",
    sourceUrl: "https://ols.semas.or.kr/announcement/2026-general-fund",
  };

  console.log(`[1] AI 재가공 엔진 호출: "${sampleRaw.title}"`);
  const rewritten = await rewriteArticleWithAI(sampleRaw);

  console.log("\n[2] 재가공 결과 점검:");
  console.log(`- 제목: ${rewritten.title}`);
  console.log(`- 카테고리: ${rewritten.category}`);
  console.log(`- 슬러그: ${rewritten.slug}`);
  console.log(`- CTA 타입: ${rewritten.ctaType}`);
  console.log(`- 이미지 테마: ${rewritten.imageTheme}`);
  console.log(`\n- 3줄 핵심 요약:\n${rewritten.summary}`);

  console.log("\n- 본문 헤딩 구조:");
  const headings = rewritten.content.split("\n").filter((l) => /^#{1,4}\s/.test(l));
  headings.forEach((h) => console.log(`  ${h}`));

  // 소상공인 5대 헤딩 포함 여부 엄격 검증
  const requiredHeadings = [
    "## 1. 지원 사업 개요 및 목적",
    "## 2. 지원 대상 및 선정 기준 (소상공인 요건)",
    "## 3. 지원 내용 및 한도 (금리, 지원금액 등)",
    "## 4. 신청 방법 및 구비 서류",
    "## 5. 주의사항 및 접수 마감일",
  ];

  console.log("\n[3] 소상공인 5대 소제목 일치성 검증:");
  let allMatched = true;
  for (const rh of requiredHeadings) {
    const found = headings.some((h) => h.includes(rh.slice(3, 15)));
    console.log(`  ${found ? "✅" : "❌"} ${rh}: ${found ? "정상 일치" : "누락됨"}`);
    if (!found) allMatched = false;
  }

  const hasTable = rewritten.content.includes("|") && rewritten.content.includes("---");
  console.log(`  ${hasTable ? "✅" : "❌"} 비교 표 포함 여부: ${hasTable ? "포함됨" : "누락됨"}`);

  // 썸네일 이미지 배정
  const stock = getStockImage(
    rewritten.imageTheme || "finance",
    rewritten.title,
    rewritten.category,
    rewritten.content,
    999,
    rewritten.slug
  );

  // DB 적재
  console.log("\n[4] DB(data/news.db)에 신규 기사 저장 중...");
  const created = createArticle({
    title: rewritten.title,
    slug: rewritten.slug,
    category: rewritten.category,
    summary: rewritten.summary,
    content: rewritten.content,
    metaTitle: rewritten.metaTitle || `${rewritten.title} | Brief Post`,
    metaDescription: rewritten.metaDescription || rewritten.summary.slice(0, 100),
    thumbnailUrl: stock.url,
    sourceUrl: sampleRaw.sourceUrl,
    faq: rewritten.faq ? JSON.stringify(rewritten.faq) : null,
    ctaType: rewritten.ctaType || "subsidy",
    imageTheme: rewritten.imageTheme || "finance",
  });

  console.log(`✅ 기사 발행 성공! (ID: ${created.id}, Slug: ${created.slug})`);
  console.log(`접속 URL: http://localhost:3000/news/${created.slug}`);
}

main().catch(console.error);
