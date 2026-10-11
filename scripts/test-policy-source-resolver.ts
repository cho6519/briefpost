import { policySourceResolver } from "../src/agents/policySourceResolver";
import { PolicySourcePack } from "../src/agents/types";

interface TestCase {
  name: string;
  keyword: string;
  category: string;
  expectedCurrentValues: {
    supportPeriod?: string;
    supportAmount?: string;
    incomeCriteriaSubstring?: string;
    keyChangeSubstring?: string;
    officialSourceDepartment?: string;
  };
  expectedOldValuesDetected: string[];
}

const testCases: TestCase[] = [
  {
    name: "1. 청년 월세 특별지원 (2차·계속사업)",
    keyword: "2026 청년 월세 특별지원 2차 신청 자격과 소득 기준 및 지급일",
    category: "정책·지원금",
    expectedCurrentValues: {
      supportPeriod: "24개월",
      supportAmount: "최대 20만 원",
      incomeCriteriaSubstring: "중위소득 60%",
      keyChangeSubstring: "24개월(480만 원)",
      officialSourceDepartment: "주거복지지원과",
    },
    expectedOldValuesDetected: ["12개월 (총 240만 원)", "합산 70만 원"]
  },
  {
    name: "2. 근로장려금 및 자녀장려금",
    keyword: "2026 근로장려금 정기 신청 기한 및 단독·맞벌이 가구별 소득·재산 자격 기준",
    category: "금융·경제",
    expectedCurrentValues: {
      supportAmount: "최대 165만 원",
      incomeCriteriaSubstring: "2,200만 원",
      keyChangeSubstring: "2억 4천만 원",
      officialSourceDepartment: "소득세과",
    },
    expectedOldValuesDetected: ["2억 원 미만"]
  },
  {
    name: "3. 실업급여 (구직급여)",
    keyword: "2026 실업급여 상·하한액 개편 및 구직급여 수급자격과 반복수급 감액 기준",
    category: "취업·자격증",
    expectedCurrentValues: {
      supportAmount: "66,000원",
      keyChangeSubstring: "최대 50%",
      officialSourceDepartment: "고용보험기획과",
    },
    expectedOldValuesDetected: ["반복 수급 횟수 제한 및 감액 규정 없음"]
  },
  {
    name: "4. 국민연금 조기노령연금",
    keyword: "2026 국민연금 조기노령연금 수령 조건 및 감액률 손익분기점 계산법",
    category: "금융·경제",
    expectedCurrentValues: {
      supportAmount: "연 6%(월 0.5%)씩 감액",
      keyChangeSubstring: "70%만 평생 지급",
      officialSourceDepartment: "급여운영부",
    },
    expectedOldValuesDetected: ["만 60세"]
  },
  {
    name: "5. 건강보험 피부양자",
    keyword: "2026년 건강보험 피부양자 자격 상실 기준과 소득·재산 요건 및 지역가입자 전환 대응",
    category: "사회·문화",
    expectedCurrentValues: {
      incomeCriteriaSubstring: "2,000만 원",
      keyChangeSubstring: "2,000만 원",
      officialSourceDepartment: "자격부과실",
    },
    expectedOldValuesDetected: ["연간 3,400만 원"]
  }
];

async function runPolicySourceResolverTests() {
  console.log("================================================================");
  console.log("🏛️ [POLICY SOURCE RESOLVER AGENT 정밀 검증 테스트 스위트]");
  console.log("================================================================\n");

  let allPassed = true;
  let testIndex = 1;

  for (const tc of testCases) {
    console.log(`----------------------------------------------------------------`);
    console.log(`[TEST ${testIndex}] ${tc.name}`);
    console.log(`- 입력 키워드: "${tc.keyword}"`);
    console.log(`- 카테고리: "${tc.category}"`);

    // 1. 정책성 키워드 자동 감지 검증
    const isDetected = policySourceResolver.isPolicyKeyword(tc.keyword, tc.category);
    if (!isDetected) {
      console.error(`❌ FAIL: 정책성 키워드로 감지되지 않음!`);
      allPassed = false;
      continue;
    }
    console.log(`  ✓ 1. 정책성 키워드 감지: SUCCESS`);

    // 2. 최신 공식 정책 팩(PolicySourcePack) 해결
    const pack = policySourceResolver.resolve(tc.keyword, tc.category);
    if (!pack) {
      console.error(`❌ FAIL: PolicySourcePack 생성 실패!`);
      allPassed = false;
      continue;
    }
    console.log(`  ✓ 2. 공식 정책 팩 생성: SUCCESS [${pack.officialPolicyName}] (신뢰도: ${pack.confidence})`);

    // 3. 최신성 검증 (CURRENT 여부)
    if (pack.currentStatus !== "CURRENT") {
      console.error(`❌ FAIL: 최신성 상태가 CURRENT가 아님 (${pack.currentStatus})`);
      allPassed = false;
    } else {
      console.log(`  ✓ 3. 최신성 유효성 판정: CURRENT (PASS)`);
    }

    // 4. 공식 출처 우선순위(Priority 1/2) 및 정부기관 검증
    const hasPrimaryGov = pack.officialSources.some(s => s.isPrimaryGov && s.priority <= 2);
    if (!hasPrimaryGov) {
      console.error(`❌ FAIL: Priority 1/2 정부 공식 출처 누락!`);
      allPassed = false;
    } else {
      console.log(`  ✓ 4. Priority 1/2 공식 출처 연결: ${pack.officialSources.map(s => s.name).join(", ")} (PASS)`);
    }

    // 5. 최신 수치 정확도 검증
    let valueMatches = true;
    if (tc.expectedCurrentValues.supportPeriod && !pack.supportPeriod.value.includes(tc.expectedCurrentValues.supportPeriod)) {
      console.error(`❌ 수치 불일치: supportPeriod에 '${tc.expectedCurrentValues.supportPeriod}' 미포함! (실제: ${pack.supportPeriod.value})`);
      valueMatches = false;
    }
    if (tc.expectedCurrentValues.supportAmount && !pack.supportAmount.value.includes(tc.expectedCurrentValues.supportAmount)) {
      console.error(`❌ 수치 불일치: supportAmount에 '${tc.expectedCurrentValues.supportAmount}' 미포함! (실제: ${pack.supportAmount.value})`);
      valueMatches = false;
    }
    if (tc.expectedCurrentValues.incomeCriteriaSubstring && pack.incomeCriteria && !pack.incomeCriteria.value.includes(tc.expectedCurrentValues.incomeCriteriaSubstring)) {
      console.error(`❌ 수치 불일치: incomeCriteria에 '${tc.expectedCurrentValues.incomeCriteriaSubstring}' 미포함!`);
      valueMatches = false;
    }
    if (valueMatches) {
      console.log(`  ✓ 5. 2026년 최신 공식 수치 검증: 통과 (PASS)`);
    } else {
      allPassed = false;
    }

    // 6. 과거 정책(OLD POLICY) 대비 변경 감지(POLICY_CHANGE_DETECTED) 검증
    let oldComparisonMatches = true;
    if (pack.comparisonWithOldPolicy && pack.comparisonWithOldPolicy.length > 0) {
      for (const expectedOld of tc.expectedOldValuesDetected) {
        const found = pack.comparisonWithOldPolicy.some(c => c.oldPolicyValue.includes(expectedOld));
        if (!found) {
          console.error(`❌ 과거 정책 감지 실패: '${expectedOld}' 항목 누락!`);
          oldComparisonMatches = false;
        }
      }
    }
    if (oldComparisonMatches) {
      console.log(`  ✓ 6. 과거 정책 감지 및 비교표 (OLD -> CURRENT): ${pack.comparisonWithOldPolicy?.length || 0}건 감지 완료 (PASS)`);
      pack.comparisonWithOldPolicy?.forEach(c => {
        console.log(`     - [${c.fieldName}]: 과거 [${c.oldPolicyValue}] -> 현재 [${c.currentPolicyValue}]`);
      });
    } else {
      allPassed = false;
    }

    console.log(`[TEST ${testIndex} 결과] => ${valueMatches && oldComparisonMatches ? "✅ PASS" : "❌ FAIL"}\n`);
    testIndex++;
  }

  // 6. 정책 키워드가 아닌 일반 정보성 키워드 테스트 (과잉 작동 방지 검증)
  console.log(`----------------------------------------------------------------`);
  console.log(`[TEST 6] 비(非)정책 일반 정보성 키워드 과잉 작동 방지 검사`);
  const nonPolicyKw = "구글 픽셀워치5 자가 수리 분해 및 배터리 교체 방법";
  const nonPolicyCategory = "테크·IT";
  const isFalsePositive = policySourceResolver.isPolicyKeyword(nonPolicyKw, nonPolicyCategory);
  if (!isFalsePositive) {
    console.log(`- 키워드: "${nonPolicyKw}" -> 정책 키워드 미감지 (정상 통과 PASS)`);
  } else {
    console.error(`❌ FAIL: 비정책 키워드에 정책 감지가 오작동함!`);
    allPassed = false;
  }

  console.log("\n================================================================");
  console.log(`🏁 최종 스위트 판정: [${allPassed ? "POLICY SOURCE LAYER PASS" : "POLICY SOURCE LAYER FAILED"}]`);
  console.log("================================================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runPolicySourceResolverTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
