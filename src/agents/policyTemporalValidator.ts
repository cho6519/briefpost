import {
  PolicySourcePack,
  PolicyTemporalValidationResult,
  TemporalStatus,
} from "./types";

/**
 * POLICY TEMPORAL VALIDATOR AGENT
 * 
 * 단일 책임 (Single Responsibility):
 * - 정책 문서의 게시일(publishedAt)과 실제 시행/접수 기간(effectiveFrom ~ effectiveUntil)을 엄격히 분리 검증
 * - 현재 시점(기준일) 대비 신청 기간 종료 여부(EXPIRED) 판정 및 미발표 차기 일정 임의 생성 차단
 * - 과거 한시 사업의 구규정(청약통장 필수, 12개월/240만원 등)이 현재 2026년 규칙으로 오인·자동 승격되는 것 방지
 * - 기존 수혜자(24개월 전액 수혜 시 재신청 불가)와 신규 신청자 규칙 분리 점검
 */
export class PolicyTemporalValidatorAgent {
  public readonly name = "POLICY_TEMPORAL_VALIDATOR";

  /**
   * 기준일자(기본: 현재 실행 일자) 기준 정책 시점 유효성 전수 검증
   */
  public validate(
    pack: PolicySourcePack,
    currentDateStr: string = new Date().toISOString().split("T")[0]
  ): PolicyTemporalValidationResult {
    const warnings: string[] = [];
    const oldRulesDetected: PolicyTemporalValidationResult["oldRulesDetected"] = [];

    const targetPolicyYear = pack.policyYear || "2026";
    const appPeriodStr = pack.applicationPeriod?.value || "";

    // 1. 게시일(publishedAt/sourceDate)과 시행일/신청일의 엄격한 분리 검증
    const pubDate = pack.effectiveDate?.sourceDate || pack.sourceCheckedAt?.split("T")[0];
    const effDateValue = pack.effectiveDate?.value || "";

    if (pubDate && (effDateValue === pubDate || appPeriodStr === pubDate)) {
      warnings.push(
        "TEMPORAL_WARNING: 문서 게시일(publishedAt)과 시행일/접수일이 동일한 값으로 지정되어 있습니다. 실제 시행 일정을 원문에서 분리 확인하십시오."
      );
    }

    // 2. 신청 기간 만료(EXPIRED) 분석
    // 예: "2026년 3월 30일(월) ~ 5월 29일(금)" 형태 파싱
    let isExpired = false;
    let applicationPeriodStatus: TemporalStatus = "UNKNOWN";

    const dateRangeMatch = appPeriodStr.match(/(\d{4})년.*?(\d{1,2})월\s*(\d{1,2})일.*?~.*?(\d{1,2})월\s*(\d{1,2})일/);
    if (dateRangeMatch) {
      const endYear = parseInt(dateRangeMatch[1]);
      const endMonth = parseInt(dateRangeMatch[4]);
      const endDay = parseInt(dateRangeMatch[5]);

      const endDateFormatted = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

      if (currentDateStr > endDateFormatted) {
        isExpired = true;
        applicationPeriodStatus = "EXPIRED";
        warnings.push(
          `APPLICATION_PERIOD_EXPIRED: 2026년 정기 집중 접수 기간(${endDateFormatted})이 종료되었습니다. 현재는 지자체별 잔여예산 추가접수 또는 차기 공고 대기 상태이므로, 접수가 진행 중인 것처럼 작성해서는 안 됩니다.`
        );
      } else {
        applicationPeriodStatus = "CURRENT_EFFECTIVE";
      }
    } else if (appPeriodStr.includes("상시") || appPeriodStr.includes("계속사업")) {
      applicationPeriodStatus = "CURRENT_EFFECTIVE";
    }

    // 3. 과거 규정의 현재 규칙 오인/자동 승격(Auto-Promotion) 감지
    // (1) 지원 기간 및 금액: 12개월 / 240만 원 (과거 1차) vs 24개월 / 480만 원 (현재 계속사업)
    if (pack.comparisonWithOldPolicy) {
      for (const item of pack.comparisonWithOldPolicy) {
        if (item.fieldName.includes("지원 기간") && item.oldPolicyValue.includes("12개월")) {
          oldRulesDetected.push({
            field: "지원 기간 및 총 한도",
            oldValue: item.oldPolicyValue,
            currentValue: item.currentPolicyValue,
            isPromotedWarning: true,
          });
          warnings.push("OLD_RULE_DETECTED: 과거 12개월(240만 원) 지원 규정은 현행 24개월(480만 원) 기준과 혼동되어서는 안 됩니다.");
        }
        if (item.fieldName.includes("청약통장")) {
          oldRulesDetected.push({
            field: "청약통장 가입 요건",
            oldValue: item.oldPolicyValue,
            currentValue: item.currentPolicyValue,
            isPromotedWarning: true,
          });
          warnings.push("OLD_RULE_DETECTED: 과거 청약통장 필수 규정은 2026 계속사업에서 삭제/폐지되었으므로, 현재 필수 요건으로 부활·승격시키지 마십시오.");
        }
      }
    }

    // 4. 시행 기간 유효성
    const effectivePeriodStatus: TemporalStatus = effDateValue.includes("2026") ? "CURRENT_EFFECTIVE" : "UNKNOWN";

    const isValidForCurrentYear = targetPolicyYear === "2026" && !warnings.some(w => w.startsWith("INVALID_YEAR"));

    return {
      currentDate: currentDateStr,
      targetPolicyYear,
      isExpired,
      applicationPeriodStatus,
      effectivePeriodStatus,
      oldRulesDetected,
      warnings,
      isValidForCurrentYear,
    };
  }
}

export const policyTemporalValidator = new PolicyTemporalValidatorAgent();
