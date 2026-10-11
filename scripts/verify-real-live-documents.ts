import { officialSourceEvidenceEngine } from "../src/agents/officialSourceEvidenceEngine";
import { claimLevelEvidenceValidator } from "../src/agents/claimLevelEvidenceValidator";
import { PolicyClaim } from "../src/agents/types";

async function verifyRealLiveDocuments() {
  console.log("=================================================");
  console.log("🏛️ [실제 공식 문서 기반 핵심 6대 정책 주장 검증]");
  console.log("=================================================\n");

  // 실제 HTTP 수집 2건 실행
  const doc1 = await officialSourceEvidenceEngine.fetchLiveOfficialDocument(
    "https://www.korea.kr/news/policyNewsView.do?newsId=148961039",
    {
      sourceOrganization: "대한민국 정책브리핑 (korea.kr) / 국토교통부",
      documentType: "PRESS_RELEASE",
      policyYear: "2026",
    }
  );

  const doc2 = await officialSourceEvidenceEngine.fetchLiveOfficialDocument(
    "https://eiec.kdi.re.kr/policy/materialView.do?num=278145",
    {
      sourceOrganization: "KDI 경제교육·정보센터 (국토교통부 배포)",
      documentType: "PRESS_RELEASE",
      policyYear: "2026",
    }
  );

  const liveEvidences = [doc1, doc2].filter(d => d.isLiveRetrieved);
  console.log(`실제 수집 성공 문서 수: ${liveEvidences.length}건 (HTTP 200)`);
  liveEvidences.forEach((d, i) => {
    console.log(`  [문서 ${i+1}] ${d.sourceOrganization} | ${d.sourceTitle}`);
    console.log(`    URL: ${d.sourceUrl}`);
    console.log(`    ContentHash: ${d.contentHash.slice(0, 16)}...`);
  });

  const claimsToVerify: PolicyClaim[] = [
    {
      claimId: "CLM_01_AMOUNT",
      claimKey: "SUPPORT_AMOUNT",
      claimText: "실제 납부 월세 범위 내에서 월 최대 20만 원이 지원된다.",
      claimedValue: "월 최대 20만 원",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "ALL",
      temporalStatus: "CURRENT_EFFECTIVE",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
    {
      claimId: "CLM_02_PERIOD",
      claimKey: "SUPPORT_PERIOD_TOTAL",
      claimText: "지원 기간은 최장 24개월간 지원된다.",
      claimedValue: "최장 24개월 (총 480만 원)",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "ALL",
      temporalStatus: "CURRENT_EFFECTIVE",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
    {
      claimId: "CLM_03_APP_PERIOD",
      claimKey: "APPLICATION_PERIOD",
      claimText: "2026년 신규 접수는 3월 30일부터 5월 29일까지 진행되었다.",
      claimedValue: "3월 30일 ~ 5월 29일",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "NEW_APPLICANT",
      temporalStatus: "EXPIRED",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
    {
      claimId: "CLM_04_SUBSCRIPTION",
      claimKey: "HOUSING_SUBSCRIPTION",
      claimText: "청약통장 가입 요건은 삭제 및 폐지되었다.",
      claimedValue: "청약통장 가입 요건 폐지/삭제",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "ALL",
      temporalStatus: "CURRENT_EFFECTIVE",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
    {
      claimId: "CLM_05_INCOME",
      claimKey: "INCOME_CRITERIA",
      claimText: "청년가구 중위소득 60% 이하 및 원가구 100% 이하 요건을 충족해야 한다.",
      claimedValue: "중위소득 60% & 100%",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "ALL",
      temporalStatus: "CURRENT_EFFECTIVE",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
    {
      claimId: "CLM_06_BENEFICIARY",
      claimKey: "BENEFICIARY_RULES",
      claimText: "기존 수혜자도 잔여 횟수만큼 추가 지원을 받을 수 있다.",
      claimedValue: "기존 수혜자 잔여 지원",
      evidenceIds: [],
      policyYear: "2026",
      applicantType: "EXISTING_BENEFICIARY",
      temporalStatus: "CURRENT_EFFECTIVE",
      verificationStatus: "VERIFIED",
      verificationReason: "",
    },
  ];

  console.log("\n-------------------------------------------------");
  console.log("📋 [Claim-Level 실데이터 개별 검증 결과]");
  console.log("-------------------------------------------------");

  for (const claim of claimsToVerify) {
    const result = claimLevelEvidenceValidator.validateClaim(claim, liveEvidences);
    console.log(`\n▶ [${result.claimKey}] 검증 판정: [${result.verificationStatus}] (${result.verificationMethod})`);
    console.log(`  - 주장 내용: ${result.claimText}`);
    console.log(`  - 주장 값: ${result.claimedValue}`);
    console.log(`  - supportingExcerpt: ${result.supportingExcerpt ? `"${result.supportingExcerpt.trim()}"` : "(없음)"}`);
    console.log(`  - 판정 사유: ${result.verificationReason}`);
    if (result.warnings.length > 0) {
      console.log(`  - 경고: ${result.warnings.join(", ")}`);
    }
  }
}

verifyRealLiveDocuments().catch(console.error);
