import { agentPipeline } from "../src/agents/pipeline";

async function main() {
  console.log("=== [소상공인 9단계 실전 롱폼 파이프라인 가동] ===");
  const targetSeed = "2026 소상공인 저금리 대환대출 자격 조건 및 온라인 신청 가이드";

  const result = await agentPipeline.run({
    domain: "자영업자·소상공인 실전 정책자금 및 세무/지원금 가이드",
    seedKeywords: [targetSeed],
    targetAudience: "대한민국 자영업자 및 소상공인 사업자 대표",
    hunterCount: 1,
  });

  console.log("파이프라인 실행 결과 요약:");
  console.log("Success:", result.success);
  console.log("Selected Keyword:", result.step4SelectedKeyword?.keyword);
  console.log("Fact Check Status:", result.step5Writer ? "Done" : "None");
  console.log("SEO Editor Status:", result.step6SeoEditor?.status, "Score:", result.step6SeoEditor?.reviewScore);
  console.log("Queue Item:", result.step7QueueItem?.id);
  console.log("Rejected Record:", result.step9Rejected);

  if (result.logs) {
    console.log("\n--- 파이프라인 단계별 로그 ---");
    for (const log of result.logs) {
      console.log(`[${log.stepName}] [${log.level}] ${log.message}`);
      if (log.details) console.log("   Details:", JSON.stringify(log.details));
    }
  }
}

main().catch((err) => {
  console.error("파이프라인 실행 중 오류:", err);
  process.exit(1);
});
