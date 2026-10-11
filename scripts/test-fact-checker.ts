import fs from "fs";
import { FactCheckerAgent } from "../src/agents/factChecker";

async function testFactCheckerDetailed() {
  const content = fs.readFileSync("data/drafts/2026-flu-vaccine-free-schedule.md", "utf-8");
  const agent = new FactCheckerAgent();
  const checkedAt = new Date().toISOString();

  console.log("=================================================");
  console.log("🔍 FACT CHECKER 10대 핵심 공표 팩트 정밀 검증");
  console.log("=================================================");
  const report = agent.ruleBasedFactCheck(content, "2026 독감 예방접종 무료 대상", checkedAt);

  console.log(`최종 상태: ${report.status}`);
  console.log(`검증 일시: ${report.checkedAt}`);
  console.log(`총 주장(Claims) 수: ${report.claimCount}건`);
  console.log(`- VERIFIED: ${report.verifiedCount}건`);
  console.log(`- REVISE: ${report.reviseCount}건`);
  console.log(`- REJECT: ${report.rejectCount}건`);
  console.log(`- UNVERIFIABLE: ${report.unverifiableCount}건`);
  console.log(`- 참조 공식 출처 수: ${report.sourceCount}개\n`);

  report.claims.forEach((c, idx) => {
    console.log(`[주장 ${idx + 1}] [${c.status}] ${c.claim}`);
    console.log(`  - 출처: ${c.sourceOrganization} (${c.sourceUrl})`);
    console.log(`  - 문서: ${c.sourceTitle} (공표: ${c.sourceDate})`);
    console.log(`  - 신뢰도: ${c.confidence}%`);
    console.log(`  - 증거: ${c.evidence}\n`);
  });
}

testFactCheckerDetailed().catch(console.error);
