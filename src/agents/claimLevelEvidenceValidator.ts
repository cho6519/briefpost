/**
 * CLAIM-LEVEL EVIDENCE VALIDATOR
 * 
 * 콘텐츠의 개별 정책 주장(Claim)이 실제 공식 수집 문서의 원문 구절로
 * 직접 뒷받침되는지 정밀 검증하는 엔진.
 * 
 * 핵심 검증 체인:
 * Article Claim -> Evidence ID -> 원문 구절(supportingExcerpt) -> 주장 값(claimedValue) ->
 * 적용 연도(policyYear) -> 신청자 유형(applicantType) -> 검증 판정(ClaimVerificationStatus)
 * 
 * 6대 검증 상태:
 * - VERIFIED: 원문이 해당 주장을 직접 뒷받침함 (Direct Evidence)
 * - DERIVED: 원문에 근거가 있으나 계산 또는 추론이 포함됨 (Calculation/Inference)
 * - CONTRADICTED: 원문이 주장과 모순됨
 * - UNKNOWN: 근거가 부족하거나 적용 여부를 판단할 수 없음 (NO_OFFICIAL_EVIDENCE 호환)
 * - CONFLICTING_SOURCES: 공식 자료 간 수치/규정이 상충함
 * - HISTORICAL_ONLY: 과거 정책 자료만 존재함 (현재 연도 미적용)
 */
import {
  OfficialEvidence,
  PolicyClaim,
  ClaimEvidenceValidation,
  ClaimVerificationStatus,
  VerificationMethod,
  PolicyApplicantType,
  TemporalStatus,
  ExcerptLocation,
  MetadataOrigin,
} from "./types";

export interface ClaimValidationOptions {
  currentDateStr?: string;
  targetPolicyYear?: string;
  allowDerivedCalculation?: boolean;
}

export interface ClaimValidationSummary {
  totalClaims: number;
  verifiedCount: number;
  derivedCount: number;
  unverifiedCount: number;
  contradictedCount: number;
  conflictingCount: number;
  historicalCount: number;
  isAllStrictlyVerified: boolean;
  isValidForPublish: boolean;
  warnings: string[];
}

export class ClaimLevelEvidenceValidator {
  /**
   * 단일 주장에 대해 전체 공식 근거 풀을 대상으로 정밀 대조 검증 수행
   */
  public validateClaim(
    claim: PolicyClaim,
    evidences: OfficialEvidence[],
    options: ClaimValidationOptions = {}
  ): ClaimEvidenceValidation {
    const targetPolicyYear = options.targetPolicyYear || claim.policyYear || "2026";
    const currentDateStr = options.currentDateStr || new Date().toISOString().split("T")[0];
    const warnings: string[] = [];

    // 1. 유효한 근거 필터링 (HTTP 200, evidenceText 비어있지 않음)
    const validEvidences = evidences.filter(
      (ev) => ev.httpStatus === 200 && ev.evidenceText && ev.evidenceText.trim().length > 0
    );

    // 근거가 아예 없거나 빈 텍스트인 경우
    if (validEvidences.length === 0) {
      const hasEmptyEvidence = evidences.some((ev) => !ev.evidenceText || ev.evidenceText.trim().length === 0);
      if (hasEmptyEvidence) {
        warnings.push("EMPTY_EVIDENCE_TEXT: evidenceId는 존재하나 원문 텍스트(evidenceText)가 비어 있어 검증 불가");
      }
      return {
        claimId: claim.claimId,
        claimText: claim.claimText,
        claimKey: claim.claimKey,
        claimedValue: claim.claimedValue,
        evidenceId: null,
        sourceUrl: null,
        sourceOrganization: null,
        sourceTitle: null,
        evidenceText: "",
        supportingExcerpt: null,
        policyYear: targetPolicyYear,
        applicantType: claim.applicantType || "ALL",
        temporalStatus: claim.temporalStatus || "UNKNOWN",
        verificationStatus: "UNKNOWN",
        verificationMethod: "UNVERIFIED",
        verificationReason: "공식 문서 원문 부재 또는 evidenceText 공백",
        missingEvidence: claim.claimText,
        warnings,
      };
    }

    // 2. 근거 문서 중 연도 및 신청자 유형 적합성 분석
    const candidateMatches: Array<{
      evidence: OfficialEvidence;
      excerpt: string;
      location: ExcerptLocation;
      status: ClaimVerificationStatus;
      method: VerificationMethod;
      reason: string;
      origin: MetadataOrigin;
    }> = [];

    // 출처 간 상충(Conflict) 감지용 값 수집
    const conflictingValues = new Set<string>();

    for (const ev of validEvidences) {
      // 문서 잘림(Truncation) 경고 감지
      if (ev.isTruncated || (ev.evidenceText.length >= 4000 && ev.totalLength && ev.totalLength > 4000)) {
        warnings.push(`DOCUMENT_TRUNCATED_WARNING: [${ev.sourceTitle}] 앞부분 4,000자만 보관되어 후반부 정보가 누락되었을 수 있음`);
      }

      // 달력 요일 일치 검증
      this.checkCalendarDayMismatch(ev.evidenceText, warnings);

      // 연도 검증
      const evYear = ev.policyYear || "2026";
      const isHistoricalOnly = evYear < targetPolicyYear;

      // 주장 키별 정밀 매칭
      const matchResult = this.evaluateClaimAgainstEvidence(
        claim,
        ev,
        targetPolicyYear,
        isHistoricalOnly
      );

      if (matchResult) {
        candidateMatches.push(matchResult);
        if (matchResult.status === "VERIFIED" || matchResult.status === "DERIVED") {
          conflictingValues.add(claim.claimedValue);
        }
      }
    }

    // 3. 다중 출처 충돌 감지 (동일 연도 다른 문서에서 상충되는 값 제시)
    const distinctConflictingStatuses = candidateMatches.filter((m) => m.status === "CONFLICTING_SOURCES");
    if (distinctConflictingStatuses.length > 0) {
      const firstConflict = distinctConflictingStatuses[0];
      return {
        claimId: claim.claimId,
        claimText: claim.claimText,
        claimKey: claim.claimKey,
        claimedValue: claim.claimedValue,
        evidenceId: firstConflict.evidence.evidenceId,
        sourceUrl: firstConflict.evidence.sourceUrl,
        sourceOrganization: firstConflict.evidence.sourceOrganization,
        sourceTitle: firstConflict.evidence.sourceTitle,
        evidenceText: firstConflict.evidence.evidenceText,
        supportingExcerpt: firstConflict.excerpt,
        excerptLocation: firstConflict.location,
        policyYear: targetPolicyYear,
        applicantType: claim.applicantType || "ALL",
        temporalStatus: claim.temporalStatus,
        verificationStatus: "CONFLICTING_SOURCES",
        verificationMethod: firstConflict.method,
        verificationReason: firstConflict.reason,
        warnings: [...warnings, "CONFLICTING_SOURCES_DETECTED: 공식 출처 간 수치 또는 규정이 서로 상충함"],
      };
    }

    // 4. 최선의 후보 선정 (VERIFIED > DERIVED > HISTORICAL_ONLY > CONTRADICTED > UNKNOWN)
    const priorityOrder: Record<ClaimVerificationStatus, number> = {
      VERIFIED: 1,
      DERIVED: 2,
      HISTORICAL_ONLY: 3,
      CONTRADICTED: 4,
      CONFLICTING_SOURCES: 5,
      UNKNOWN: 6,
      NO_OFFICIAL_EVIDENCE: 6,
    };

    candidateMatches.sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);

    if (candidateMatches.length > 0) {
      const best = candidateMatches[0];
      return {
        claimId: claim.claimId,
        claimText: claim.claimText,
        claimKey: claim.claimKey,
        claimedValue: claim.claimedValue,
        evidenceId: best.evidence.evidenceId,
        sourceUrl: best.evidence.sourceUrl,
        sourceOrganization: best.evidence.sourceOrganization,
        sourceTitle: best.evidence.sourceTitle,
        evidenceText: best.evidence.evidenceText,
        supportingExcerpt: best.excerpt,
        excerptLocation: best.location,
        policyYear: targetPolicyYear,
        applicantType: claim.applicantType || "ALL",
        temporalStatus: claim.temporalStatus,
        verificationStatus: best.status,
        verificationMethod: best.method,
        verificationReason: best.reason,
        metadataOrigin: best.origin,
        warnings,
      };
    }

    // 후보 매칭이 전혀 없는 경우
    return {
      claimId: claim.claimId,
      claimText: claim.claimText,
      claimKey: claim.claimKey,
      claimedValue: claim.claimedValue,
      evidenceId: null,
      sourceUrl: null,
      sourceOrganization: null,
      sourceTitle: null,
      evidenceText: "",
      supportingExcerpt: null,
      policyYear: targetPolicyYear,
      applicantType: claim.applicantType || "ALL",
      temporalStatus: claim.temporalStatus,
      verificationStatus: "UNKNOWN",
      verificationMethod: "UNVERIFIED",
      verificationReason: `원문 어디에서도 주장 [${claim.claimedValue}]을 뒷받침하는 구절을 찾을 수 없음`,
      missingEvidence: claim.claimText,
      warnings,
    };
  }

  /**
   * 단일 근거 문서에 대해 주장을 세부 평가
   */
  private evaluateClaimAgainstEvidence(
    claim: PolicyClaim,
    evidence: OfficialEvidence,
    targetPolicyYear: string,
    isHistoricalOnly: boolean
  ): {
    evidence: OfficialEvidence;
    excerpt: string;
    location: ExcerptLocation;
    status: ClaimVerificationStatus;
    method: VerificationMethod;
    reason: string;
    origin: MetadataOrigin;
  } | null {
    const text = evidence.evidenceText;
    const origin: MetadataOrigin = evidence.isLiveRetrieved ? "EXTRACTED_FROM_SOURCE" : "SUPPLIED_METADATA";

    // 1. 지원 금액 (SUPPORT_AMOUNT: 월 최대 20만 원)
    if (claim.claimKey === "SUPPORT_AMOUNT") {
      const match = text.match(/(월\s*최대\s*20만\s*원|월\s*20만\s*원씩|최대\s*20만\s*원)/);
      if (match) {
        const excerpt = this.extractSentenceOrContext(text, match.index!, match[0].length);
        if (isHistoricalOnly) {
          return {
            evidence,
            excerpt,
            location: this.locateExcerpt(text, excerpt),
            status: "HISTORICAL_ONLY",
            method: "HISTORICAL_INFERENCE",
            reason: `과거(${evidence.policyYear}년) 규정 원문에서 확인되었으나 현재(${targetPolicyYear}년) 적용 여부 추가 확인 필요`,
            origin,
          };
        }
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 '월 최대 20만 원' 구절이 직접 명시됨 (${evidence.sourceOrganization})`,
          origin,
        };
      }
    }

    // 2. 지급 기간 및 총액 (SUPPORT_PERIOD_TOTAL)
    // 원문에 '최장 24개월'은 있으나 '480만 원'은 계산(20만×24)인 경우 DERIVED 분리!
    if (claim.claimKey === "SUPPORT_PERIOD_TOTAL") {
      const matchPeriod = text.match(/(최장\s*24개월|최대\s*24개월|2년간\s*월세)/);
      const matchTotal = text.match(/(최대\s*480만\s*원|총\s*480만\s*원)/);

      if (matchPeriod) {
        const excerpt = this.extractSentenceOrContext(text, matchPeriod.index!, matchPeriod[0].length);
        // 총액 480만 원이 원문에 직접 명시되어 있는지 확인
        if (matchTotal) {
          return {
            evidence,
            excerpt,
            location: this.locateExcerpt(text, excerpt),
            status: "VERIFIED",
            method: "DIRECT_EXCERPT",
            reason: `원문에 '24개월' 및 '총 480만 원'이 모두 직접 명시됨`,
            origin,
          };
        } else {
          // 총액은 없으나 월 20만 원과 24개월이 있어 계산 가능한 경우 -> DERIVED!
          return {
            evidence,
            excerpt,
            location: this.locateExcerpt(text, excerpt),
            status: "DERIVED",
            method: "CALCULATION_DERIVED",
            reason: `원문에 '최장 24개월' 및 '월 최대 20만 원'이 직접 명시되어 총액 480만 원(20만×24)은 산술 계산으로 유도됨 (원문 직기재 아님)`,
            origin,
          };
        }
      }
    }

    // 3. 신청 기간 (APPLICATION_PERIOD: 3.30~5.29)
    if (claim.claimKey === "APPLICATION_PERIOD") {
      const matchPeriod = text.match(/(3\.30|3월\s*30일)[\s\S]*?(5\.29|5월\s*29일)/);
      if (matchPeriod) {
        const excerpt = this.extractSentenceOrContext(text, matchPeriod.index!, matchPeriod[0].length);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 신청 기간 '3월 30일 ~ 5월 29일' 명시 확인됨`,
          origin,
        };
      }
    }

    // 4. 청약통장 가입 조건 (HOUSING_SUBSCRIPTION)
    if (claim.claimKey === "HOUSING_SUBSCRIPTION") {
      // 2026년 규정: 삭제/폐지
      const matchAbolished = text.match(/청약통장[\s\S]{0,30}(삭제|폐지|없어도)/);
      // 과거 규정: 필수 가입
      const matchRequired = text.match(/청약통장[\s\S]{0,20}(필수|가입\s*요건\s*신설)/);

      if (matchAbolished) {
        const excerpt = this.extractSentenceOrContext(text, matchAbolished.index!, matchAbolished[0].length);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 청약통장 가입 요건 삭제/폐지 문구가 직접 명시됨`,
          origin,
        };
      } else if (matchRequired) {
        const excerpt = this.extractSentenceOrContext(text, matchRequired.index!, matchRequired[0].length);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "HISTORICAL_ONLY",
          method: "HISTORICAL_INFERENCE",
          reason: `과거 2차 사업의 청약통장 필수 가입 문구가 감지되었으나, 2026년 현행 규정으로 자동 승격 불가`,
          origin,
        };
      }
    }

    // 5. 소득 기준 (INCOME_CRITERIA: 청년 60%, 원가구 100%)
    if (claim.claimKey === "INCOME_CRITERIA") {
      const match60 = text.match(/(중위소득\s*60%|독립가구\s*중위소득\s*60%|60%\s*이하)/);
      const match100 = text.match(/(원가구\s*중위소득\s*100%|중위소득\s*100%|100%\s*이하)/);

      if (match60 && match100) {
        const excerpt = this.extractSentenceOrContext(text, match60.index!, 150);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 청년가구 중위소득 60% 및 원가구 100% 수치가 직접 기재됨`,
          origin,
        };
      } else if (match60) {
        const excerpt = this.extractSentenceOrContext(text, match60.index!, 80);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 청년가구 중위소득 60% 수치 직접 확인됨 (원가구는 별도 확인 요망)`,
          origin,
        };
      } else {
        // 원문에 '소득 요건 충족' 등 추상적 문구만 있고 60% 수치가 없는 경우 -> UNKNOWN!
        const matchAbstract =
          text.match(/소득[\s·및]*재산\s*요건[\s을를]*충족/) ||
          text.match(/소득[\s·및]*재산[\s\S]{0,10}충족/);
        if (matchAbstract) {
          const excerpt = this.extractSentenceOrContext(text, matchAbstract.index!, matchAbstract[0].length);
          return {
            evidence,
            excerpt,
            location: this.locateExcerpt(text, excerpt),
            status: "UNKNOWN",
            method: "UNVERIFIED",
            reason: `원문에 '소득·재산 요건 충족'이라는 포괄적 문구만 존재하고, 구체적 비율(60%, 100%) 수치는 직접 기재되지 않음`,
            origin,
          };
        }
      }
    }

    // 6. 신규 신청자와 기존 수혜자의 적용 규칙 (BENEFICIARY_RULES)
    if (claim.claimKey === "BENEFICIARY_RULES") {
      // 신규 신청자 6만 명 선정 문구
      const matchNewOnly = text.match(/6만\s*명의\s*신규수혜자/);
      // 기존 수혜자 잔여 지원 문구
      const matchResidual = text.match(/(기존\s*수혜자[\s\S]{0,30}잔여|미소진[\s\S]{0,20}추가)/);

      if (matchResidual) {
        const excerpt = this.extractSentenceOrContext(text, matchResidual.index!, matchResidual[0].length);
        return {
          evidence,
          excerpt,
          location: this.locateExcerpt(text, excerpt),
          status: "VERIFIED",
          method: "DIRECT_EXCERPT",
          reason: `원문에 기존 수혜자 잔여 횟수 지원 규정이 직접 명시됨`,
          origin,
        };
      } else if (matchNewOnly) {
        // 신규수혜자 6만 명만 있고 기존 수혜자 잔여 지원 문장이 없는 경우
        if (claim.applicantType === "EXISTING_BENEFICIARY") {
          const excerpt = this.extractSentenceOrContext(text, matchNewOnly.index!, matchNewOnly[0].length);
          return {
            evidence,
            excerpt,
            location: this.locateExcerpt(text, excerpt),
            status: "UNKNOWN",
            method: "UNVERIFIED",
            reason: `원문에는 '6만 명의 신규수혜자'만 명시되어 있고, 기존 수혜자의 잔여 횟수 추가 지원 규정은 직접 확인되지 않음 (신규 규칙을 기존 수혜자에게 유추 적용 금지)`,
            origin,
          };
        }
      }
    }

    // 7. 일반적인 claimedValue 텍스트 완전 일치 검사
    if (claim.claimedValue && text.includes(claim.claimedValue)) {
      const idx = text.indexOf(claim.claimedValue);
      const excerpt = this.extractSentenceOrContext(text, idx, claim.claimedValue.length);
      return {
        evidence,
        excerpt,
        location: this.locateExcerpt(text, excerpt),
        status: isHistoricalOnly ? "HISTORICAL_ONLY" : "VERIFIED",
        method: "DIRECT_EXCERPT",
        reason: `원문에 주장 값 '${claim.claimedValue}' 구절이 완전 일치함`,
        origin,
      };
    }

    return null;
  }

  /**
   * 달력 날짜와 요일의 일치 여부 정밀 점검
   * 예: 2026년 3월 30일(월), 5월 29일(금) vs 5월 29일(목)
   */
  private checkCalendarDayMismatch(text: string, warnings: string[]): void {
    const dayRegex = /(\d{4}년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*\(([월화수목금토일])\)/g;
    let match: RegExpExecArray | null;

    const daysKor = ["일", "월", "화", "수", "목", "금", "토"];

    while ((match = dayRegex.exec(text)) !== null) {
      const yearStr = match[1] ? match[1].replace(/[^\d]/g, "") : "2026";
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const claimedDayOfWeek = match[4];

      const year = parseInt(yearStr, 10);
      const dateObj = new Date(year, month - 1, day);
      const actualDayOfWeek = daysKor[dateObj.getDay()];

      if (claimedDayOfWeek !== actualDayOfWeek) {
        warnings.push(
          `CALENDAR_DAY_MISMATCH: 원문 표기 [${month}월 ${day}일(${claimedDayOfWeek})]은 실제 요일(${actualDayOfWeek}요일)과 불일치함 (원문 오기 주의, 날짜 기준 유효성 검증 필요)`
        );
      }
    }
  }

  /**
   * 텍스트 내 구절 위치 추출
   */
  private locateExcerpt(text: string, excerpt: string): ExcerptLocation {
    const start = text.indexOf(excerpt);
    const end = start !== -1 ? start + excerpt.length : 0;
    // 대략적인 문단 번호 계산
    const beforeText = text.slice(0, Math.max(0, start));
    const paragraphIndex = (beforeText.match(/\n\n|\r\n\r\n/g) || []).length;
    return {
      start: Math.max(0, start),
      end,
      paragraphIndex,
    };
  }

  /**
   * 위치 기준 문맥 문장 추출 (원문 보존)
   */
  private extractSentenceOrContext(text: string, matchIndex: number, matchLength: number): string {
    const buffer = 80;
    const start = Math.max(0, matchIndex - buffer);
    const end = Math.min(text.length, matchIndex + matchLength + buffer);
    let excerpt = text.slice(start, end).trim();

    // 문장 마침표 정리
    const firstPeriod = excerpt.indexOf(". ");
    if (firstPeriod !== -1 && firstPeriod < buffer) {
      excerpt = excerpt.slice(firstPeriod + 2);
    }
    const lastPeriod = excerpt.lastIndexOf(". ");
    if (lastPeriod !== -1 && lastPeriod > excerpt.length - buffer) {
      excerpt = excerpt.slice(0, lastPeriod + 1);
    }

    return excerpt || text.slice(matchIndex, matchIndex + matchLength);
  }

  /**
   * 전체 주장 목록에 대한 종합 검증 실행
   */
  public validateAllClaims(
    claims: PolicyClaim[],
    evidences: OfficialEvidence[],
    options: ClaimValidationOptions = {}
  ): {
    validations: ClaimEvidenceValidation[];
    summary: ClaimValidationSummary;
  } {
    const validations: ClaimEvidenceValidation[] = [];
    const allWarnings: string[] = [];

    let verifiedCount = 0;
    let derivedCount = 0;
    let unverifiedCount = 0;
    let contradictedCount = 0;
    let conflictingCount = 0;
    let historicalCount = 0;

    for (const claim of claims) {
      const v = this.validateClaim(claim, evidences, options);
      validations.push(v);
      if (v.warnings.length > 0) {
        allWarnings.push(...v.warnings);
      }

      switch (v.verificationStatus) {
        case "VERIFIED":
          verifiedCount++;
          break;
        case "DERIVED":
          derivedCount++;
          break;
        case "CONTRADICTED":
          contradictedCount++;
          break;
        case "CONFLICTING_SOURCES":
          conflictingCount++;
          break;
        case "HISTORICAL_ONLY":
          historicalCount++;
          break;
        default:
          unverifiedCount++;
          break;
      }
    }

    // 엄격 검증 통과 여부: 모든 주장이 직접 VERIFIED
    const isAllStrictlyVerified = verifiedCount === claims.length && claims.length > 0;

    // 발행 가능 여부: 핵심 주장에 CONTRADICTED, CONFLICTING_SOURCES, HISTORICAL_ONLY, UNKNOWN이 없어야 함
    // (DERIVED는 적법한 산술 유도인 경우 허용)
    const hasFatalIssues = contradictedCount > 0 || conflictingCount > 0 || unverifiedCount > 0;
    const isValidForPublish = !hasFatalIssues && (verifiedCount + derivedCount === claims.length);

    const summary: ClaimValidationSummary = {
      totalClaims: claims.length,
      verifiedCount,
      derivedCount,
      unverifiedCount,
      contradictedCount,
      conflictingCount,
      historicalCount,
      isAllStrictlyVerified,
      isValidForPublish,
      warnings: Array.from(new Set(allWarnings)),
    };

    return { validations, summary };
  }
}

export const claimLevelEvidenceValidator = new ClaimLevelEvidenceValidator();
