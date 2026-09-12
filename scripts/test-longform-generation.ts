import fs from "fs";
import path from "path";

// .env.local 직접 로드
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

import { rewriteArticleWithAI } from "../src/lib/ai";
import { normalizeArticleContent, enforceHeadingHierarchy } from "../src/lib/articleValidator";
import { marked } from "marked";

async function testLongformPipeline() {
  console.log("=================================================");
  console.log("🚀 [심층 가이드형 롱폼 콘텐츠 파이프라인 수동 테스트 시작]");
  console.log("=================================================\n");

  // 테스트용 보도자료 샘플 (실제 정책 지원금 기사 형태)
  const sampleArticle = {
    title: `[보도자료] 2026년 청년 도약 지원금 및 일자리 디딤돌 바우처 2차 지원 시작`,
    content: `고용노동부와 기획재정부는 2026년도 청년 일자리 도약 장려금 및 생활 디딤돌 바우처 2차 신청 접수를 오는 25일부터 시작한다고 밝혔습니다. 이번 사업은 취업 준비 청년과 저소득 청년층의 경제적 자립 기반을 강화하기 위해 마련되었으며, 총 예산 8,500억 원이 투입됩니다.
지원 대상은 만 19세부터 34세 이하의 미취업 청년 중 기준 중위소득 120% 이하 가구원입니다. 기존 사업 대비 소득 기준이 100%에서 120%로 대폭 완화되었으며, 군 복무 기간만큼 최대 만 39세까지 연령 상한이 연장됩니다.
선정된 청년에게는 월 50만 원씩 최대 12개월간 총 600만 원의 구직 활동 및 생활 안정 지원금이 지급되며, 취업 성공 시 100만 원의 취업 축하금이 일시금으로 추가 지급됩니다. 또한 직무 역량 강화를 위한 교육 바우처 연 200만 원 한도가 별도 제공됩니다.
신청은 고용24 포털(work24.go.kr)과 청년몽땅정보통 웹사이트를 통해 온라인으로 진행되며, 관할 고용복지플러스센터에서도 방문 상담이 가능합니다. 필요 서류는 신분증, 최종학력증명서, 가족관계증명서 등이며, 자세한 사항은 고객센터(1350)를 통해 확인할 수 있습니다.`,
    category: "정책·지원금" as const,
    sourceUrl: "https://www.korea.kr/news/policyBriefingView.do?newsId=156689000",
  };

  console.log(`[입력 원문 정보]`);
  console.log(`- 제목: ${sampleArticle.title}`);
  console.log(`- 카테고리: ${sampleArticle.category}`);
  console.log(`- 원문 글자 수: ${sampleArticle.content.length}자\n`);

  // 1. 파이프라인 가공 실행 (rewriteArticleWithAI)
  console.log(`⏳ Gemini / Fallback 재가공 엔진 구동 중...`);
  const result = await rewriteArticleWithAI(sampleArticle);

  console.log("\n=================================================");
  console.log("✅ [파이프라인 가공 완료 결과 검증]");
  console.log("=================================================");
  console.log(`📌 헤드라인 (Title): ${result.title}`);
  console.log(`   (글자 수: ${result.title.length}자)`);
  console.log(`📌 슬러그 (Slug): ${result.slug}`);
  console.log(`📌 카테고리 (Category): ${result.category}`);

  console.log(`\n📌 [메인 피드용 3줄 요약 (Summary)]`);
  console.log(result.summary);

  // 2. 본문 정규화 및 가독성 복원
  const cleanMarkdown = normalizeArticleContent(result.content);
  const rawHtml = marked.parse(cleanMarkdown, { async: false }) as string;
  const contentHtml = enforceHeadingHierarchy(rawHtml);

  const charCountWithSpaces = cleanMarkdown.length;
  const charCountWithoutSpaces = cleanMarkdown.replace(/\s+/g, "").length;

  console.log(`\n📌 [상세 페이지용 심층 본문 (Content)]`);
  console.log(`- 총 글자 수 (공백 포함): ${charCountWithSpaces}자`);
  console.log(`- 총 글자 수 (공백 제외): ${charCountWithoutSpaces}자`);
  console.log(`- 최소 기준(1,300자) 달성 여부: ${charCountWithSpaces >= 1300 ? "✅ 충족 (" + charCountWithSpaces + "자)" : "❌ 미달 (" + charCountWithSpaces + "자)"}`);

  // 3. H태그 섹션 구조 분석
  const h1Matches = contentHtml.match(/<h1\b[^>]*>.*?<\/h1>/gi) || [];
  const h2Matches = contentHtml.match(/<h2\b[^>]*>.*?<\/h2>/gi) || [];
  const h3Matches = contentHtml.match(/<h3\b[^>]*>.*?<\/h3>/gi) || [];
  const h4To6Matches = contentHtml.match(/<h[4-6]\b[^>]*>.*?<\/h[4-6]>/gi) || [];

  console.log(`\n📌 [H태그 위계 구조 분석]`);
  console.log(`- <h1> 태그 (본문 내 허용 불가): ${h1Matches.length}개 ${h1Matches.length === 0 ? "✅ 합격" : "❌ 위반"}`);
  console.log(`- <h2> 태그 (주요 섹션 4단계): ${h2Matches.length}개 ${h2Matches.length >= 4 ? "✅ 합격" : "⚠️ " + h2Matches.length + "개"}`);
  h2Matches.forEach((h2, i) => console.log(`    [H2-${i + 1}] ${h2.replace(/<[^>]+>/g, "").trim()}`));

  console.log(`- <h3> 태그 (세부 항목 및 유의사항): ${h3Matches.length}개`);
  h3Matches.forEach((h3, i) => console.log(`    [H3-${i + 1}] ${h3.replace(/<[^>]+>/g, "").trim()}`));

  console.log(`- <h4~h6> 규격 외 태그: ${h4To6Matches.length}개 ${h4To6Matches.length === 0 ? "✅ 합격" : "❌ 위반"}`);

  // 4. FAQ 생성 결과 검증
  console.log(`\n📌 [FAQ 구조화 데이터 (schema.org/FAQPage)]`);
  if (result.faq && result.faq.length > 0) {
    console.log(`- 생성된 FAQ 개수: ${result.faq.length}개 ✅ 성공`);
    result.faq.forEach((f, idx) => {
      console.log(`    [Q${idx + 1}] ${f.question}`);
      console.log(`    [A${idx + 1}] ${f.answer}`);
    });
  } else {
    console.log(`- FAQ가 생성되지 않았습니다 (undefined) ⚠️`);
  }

  // 5. 애드센스 슬롯 분할 검증
  const h2Parsed = Array.from(contentHtml.matchAll(/<h2\b[^>]*>/gi));
  console.log(`\n📌 [애드센스 슬롯 3개 위치 분할 검증]`);
  console.log(`- 슬롯 ① 위치: H1 제목 바로 아래 (상단 탑) ✅`);
  if (h2Parsed.length >= 4) {
    const idxH2_3 = h2Parsed[2].index!;
    const idxH2_4 = h2Parsed[3].index!;
    const p1 = contentHtml.slice(0, idxH2_3);
    const p2 = contentHtml.slice(idxH2_3, idxH2_4);
    const p3 = contentHtml.slice(idxH2_4);
    console.log(`- 슬롯 ② 위치: Part 1(섹션 1,2: ${p1.length}자) 뒤 / 문맥 인피드 ✅`);
    console.log(`- 슬롯 ③ 위치: Part 2(섹션 3: ${p2.length}자) 뒤 / 신청 가이드(Part 3: ${p3.length}자) 바로 위 ✅`);
  } else {
    console.log(`- H2 개수가 4개 미만(${h2Parsed.length}개)이므로 안전 폴백 분할 적용`);
  }

  console.log("\n=================================================");
  console.log("📝 [생성된 본문 마크다운 미리보기 (앞 600자)]");
  console.log("=================================================");
  console.log(cleanMarkdown.slice(0, 600) + "\n...\n");
}

testLongformPipeline().catch((err) => {
  console.error("테스트 실패:", err);
  process.exit(1);
});
