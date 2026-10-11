/**
 * 에이전트 파이프라인 10단계 통합 테스트 스크립트
 * 
 * 실행: npx tsx scripts/test-agents.ts
 */
import { KeywordHunterAgent } from "../src/agents/keywordHunter";
import { DuplicateRemover } from "../src/agents/duplicateRemover";
import { KeywordEvaluatorAgent } from "../src/agents/keywordEvaluator";
import { ContentWriterAgent } from "../src/agents/contentWriter";
import { SeoEditorAgent } from "../src/agents/seoEditor";
import { agentPipeline } from "../src/agents/pipeline";
import { pipelineStore } from "../src/agents/pipelineStore";

async function runPipelineTest() {
  console.log("========================================================");
  console.log("🚀 [STEP 1] KEYWORD HUNTER 독립 실행 테스트");
  console.log("========================================================");
  const hunter = new KeywordHunterAgent();
  const hunterResult = await hunter.hunt({
    domain: "차세대 AI 에이전트 및 자동화 아키텍처",
    count: 4,
  });

  console.log(`[HUNTER] 발굴 완료 키워드 수: ${hunterResult.huntedKeywords.length}개`);
  hunterResult.huntedKeywords.forEach((k, idx) => {
    console.log(`  ${idx + 1}. [${k.keyword}] 출처: ${k.source} / 트렌드점수: ${k.trendScore} / 검색의도: ${k.searchIntent} / 추정치여부: ${k.isSearchVolumeEstimate}`);
  });

  console.log("\n========================================================");
  console.log("🛡️ [STEP 2] DUPLICATE REMOVER 중복 및 동일검색의도 필터링");
  console.log("========================================================");
  const duplicateRemover = new DuplicateRemover();
  const dedupResult = duplicateRemover.filter({
    candidates: hunterResult.huntedKeywords,
  });
  console.log(`[DEDUP] 통과 키워드: ${dedupResult.filteredKeywords.length}개 / 제거된 중복: ${dedupResult.removedDuplicates.length}개`);

  console.log("\n========================================================");
  console.log("⚖️ [STEP 3 & 4] KEYWORD EVALUATOR & 우선순위 선정");
  console.log("========================================================");
  const evaluator = new KeywordEvaluatorAgent();
  const evalResult = await evaluator.evaluate({
    candidates: dedupResult.filteredKeywords,
    targetAudience: "시니어 소프트웨어 엔지니어 및 테크 리더",
  });

  console.log(`[EVALUATOR] 최종 선정 키워드: [${evalResult.selectedKeyword.keyword}] (등급: ${evalResult.selectedKeyword.grade}, 점수: ${evalResult.selectedKeyword.score}점)`);
  console.log(`  - 선정 이유: ${evalResult.selectedKeyword.selectionReason}`);
  console.log(`  - 기획 앵글: ${evalResult.selectedKeyword.recommendedAngle}`);
  console.log(`  - 6대 지표: 수요(${evalResult.selectedKeyword.criteria.searchDemand}), 경쟁(${evalResult.selectedKeyword.criteria.competition}), 의도부합(${evalResult.selectedKeyword.criteria.searchIntentFit}), 수익(${evalResult.selectedKeyword.criteria.monetizationPotential})`);

  console.log("\n========================================================");
  console.log("✍️ [STEP 5] CONTENT WRITER 초안 작성 (공식 출처 우선)");
  console.log("========================================================");
  const writer = new ContentWriterAgent();
  const writeResult = await writer.write({
    evaluatedKeyword: evalResult.selectedKeyword,
  });

  console.log(`[WRITER] 초안 작성 완료!`);
  console.log(`  - 초안 제목: "${writeResult.draft.draftTitle}"`);
  console.log(`  - 글자수: 약 ${writeResult.draft.wordCount}자`);
  console.log(`  - 공식 출처: ${writeResult.draft.officialSources ? writeResult.draft.officialSources.join(", ") : "없음"}`);

  console.log("\n========================================================");
  console.log("🔍 [STEP 6 & 10] SEO EDITOR 검수 및 내부링크 자동 추천");
  console.log("========================================================");
  const seoEditor = new SeoEditorAgent();
  const seoResult = await seoEditor.edit({
    draft: writeResult.draft,
    category: evalResult.selectedKeyword.category,
    primaryKeyword: evalResult.selectedKeyword.keyword,
    searchIntent: evalResult.selectedKeyword.searchIntent,
  });

  console.log(`[SEO EDITOR] 검수 결과: ${seoResult.status} (점수: ${seoResult.reviewScore}점)`);
  if (seoResult.article) {
    console.log(`  - 최종 헤드라인: "${seoResult.article.headline}"`);
    console.log(`  - URL 슬러그: "${seoResult.article.slug}"`);
    console.log(`  - 추천 내부링크 수: ${seoResult.article.internalLinks.length}개`);
  }

  console.log("\n========================================================");
  console.log("🚀 [E2E] AgentPipeline 전체 10단계 순차 실행 검증");
  console.log("========================================================");
  const pipelineResult = await agentPipeline.run({
    domain: "글로벌 AI 스타트업 & 벤처 생태계",
    hunterCount: 4,
    targetAudience: "초기 창업가 및 테크 투자자",
  });

  console.log(`\n🎉 [성공] 파이프라인 전 과정 완료! (소요 시간: ${pipelineResult.executionDurationMs}ms)`);
  console.log(`  - 1단계 발굴 키워드: ${pipelineResult.step1Hunter.huntedKeywords.length}개`);
  console.log(`  - 2단계 중복 필터 통과: ${pipelineResult.step2Deduplication.filteredKeywords.length}개`);
  console.log(`  - 4단계 최우선 선정: "${pipelineResult.step4SelectedKeyword.keyword}"`);
  console.log(`  - 6단계 검수 상태: ${pipelineResult.step6SeoEditor.status}`);
  if (pipelineResult.step7QueueItem) {
    console.log(`  - 7단계 발행 대기열 적재: ID ${pipelineResult.step7QueueItem.id} (상태: ${pipelineResult.step7QueueItem.status})`);
  }
  console.log(`  - 10단계 추천 내부링크: ${pipelineResult.step10InternalLinks.length}개`);

  const stats = pipelineStore.getDashboardStats();
  console.log("\n[대시보드 12대 지표 확인]");
  console.log(JSON.stringify(stats, null, 2));
  console.log("========================================================\n");
}

runPipelineTest().catch(console.error);
