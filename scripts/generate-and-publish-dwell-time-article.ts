import { AgentPipeline } from "../src/agents/pipeline";
import { pipelineStore } from "../src/agents/pipelineStore";
import { getArticleBySlugAsync } from "../src/lib/articles";

async function main() {
  console.log("==================================================================");
  console.log("🚀 [검증 시작] 체류 시간 극대화 실무 자가진단 및 부결 방지 심층 기사 생성");
  console.log("==================================================================");

  const pipeline = new AgentPipeline();
  
  // 1. 파이프라인 실행 (소상공인 정책자금 / 경영안정자금 도메인)
  console.log("▶ 1. 파이프라인 오케스트레이션 실행 중...");
  const result = await pipeline.run({
    domain: "정책·지원금",
    seedKeywords: ["2026 소상공인 경영안정자금 신청 자격"],
    hunterCount: 2,
    targetAudience: "자금 조달이 시급한 소상공인 및 자영업 대표님",
  });

  if (!result.success || !result.step7QueueItem) {
    console.error("❌ 파이프라인 실패 또는 대기열 적재 누락:", result);
    process.exit(1);
  }

  const queueItem = result.step7QueueItem;
  console.log(`✅ 대기열 적재 성공! Queue ID: ${queueItem.id}`);
  console.log(`   - 제목: ${queueItem.payload.headline}`);
  console.log(`   - 슬러그: ${queueItem.payload.slug}`);
  console.log(`   - 상태: ${queueItem.status}`);

  // 2. 관리자 승인 발행 시뮬레이션
  console.log("\n▶ 2. 관리자 화면 승인 발행(publishQueueItem) 실행...");
  const publishResult = await pipelineStore.publishQueueItem(queueItem.id);
  
  if (!publishResult.success) {
    console.error("❌ 발행 실패:", publishResult.error);
    process.exit(1);
  }

  console.log(`✅ 승인 발행 완료! Article ID: ${publishResult.articleId}`);

  // 3. 발행된 기사 본문 심층 분석 및 렌더링 무결성 검증
  console.log("\n▶ 3. 발행 기사 본문 규격 정밀 검증...");
  const publishedArticle = await getArticleBySlugAsync(queueItem.payload.slug);

  if (!publishedArticle) {
    console.error("❌ DB에서 발행된 기사를 조회할 수 없습니다:", queueItem.payload.slug);
    process.exit(1);
  }

  const content = publishedArticle.content;
  console.log(`   - 기사 본문 총 길이: ${content.length}자 (공백 포함)`);

  // 세부 항목 체크
  const hasChecklist = content.includes("- [ ]") || content.includes("자가진단");
  const hasCountermeasure = content.includes("대처법:") || content.includes("💡");
  const hasSimulationCases = content.includes("Case 1") || content.includes("신규") || content.includes("시뮬레이션");
  const hasSimulationStructure = content.includes("신청 가능성") && content.includes("추천 자금") && content.includes("주의사항");
  const hasStepFormat = content.includes("소요 기간") && content.includes("준비물 및 서류") && content.includes("자주 하는 실수");
  const hasFailurePrevention = content.includes("왜 문제가 되는가") && content.includes("신청 전 확인법") && content.includes("이미 걸렸다면 대응책");
  const hasComparisonTable = content.includes("|") && content.includes("지원 한도") && content.includes("적용 금리");
  const hasYmylDisclaimer = content.includes("YMYL") || content.includes("면책 고지") || content.includes("법적 책임");

  console.log("\n📋 [핵심 7대 규격 충족 검증 결과]");
  console.log(`  1. 3분 자가진단 체크리스트: ${hasChecklist ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2. 각 문항 💡 1줄 대처법: ${hasCountermeasure ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3. 3대 독자 유형별 가상 시뮬레이션 카드: ${hasSimulationCases ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  4. 시뮬레이션 3대 속성 [가능성/추천/주의]: ${hasSimulationStructure ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  5. 단계별 신청 절차 3줄 포맷: ${hasStepFormat ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  6. 부결 방지 5대 실무 팁 3단 구조: ${hasFailurePrevention ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  7. 지원 한도·금리 비교표 (Table): ${hasComparisonTable ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  8. YMYL 기준일자 및 법적 면책 조항: ${hasYmylDisclaimer ? "✅ PASS" : "❌ FAIL"}`);

  if (
    hasChecklist &&
    hasCountermeasure &&
    hasSimulationCases &&
    hasSimulationStructure &&
    hasStepFormat &&
    hasFailurePrevention &&
    hasComparisonTable &&
    hasYmylDisclaimer
  ) {
    console.log("\n🎉 [검증 성공] 모든 체류 시간 극대화 디테일 규격이 100% 충족되었습니다!");
    console.log(`🔗 기사 URL 경로: /news/${publishedArticle.slug}`);
  } else {
    console.warn("\n⚠️ 일부 규격이 누락되었거나 일치하지 않습니다. 점검이 필요합니다.");
  }
}

main().catch((err) => {
  console.error("실행 중 치명적 오류 발생:", err);
  process.exit(1);
});
