import db from "./db";

/**
 * 전역 긴급 중지(Emergency Kill Switch) 관리 모듈
 * 
 * [안전 원칙]
 * 1. Fail-Safe: 설정 조회 실패 또는 상태가 불명확한 경우 공개 발행을 허용하지 않고 차단(true) 처리
 * 2. SQLite pipeline_settings 테이블에 영구 저장
 * 3. 발행 경로 A(대기열 발행)와 경로 B(RSS 크론 직접 발행) 모두에 공통 적용
 * 4. 이미 외부에 공개된 기존 기사를 삭제하지 않고, 신규 기사의 INSERT만 차단
 */

export interface EmergencyStopStatus {
  isPaused: boolean;
  reason: string;
  updatedAt: string;
  updatedBy: string;
}

const SETTING_KEY = "publishing_emergency_stop";

function ensureSettingsTable(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedBy TEXT
      );
    `);
  } catch (err) {
    console.error("[EmergencyStop] settings 테이블 초기화 실패:", err);
  }
}

/**
 * 전역 발행 중지 여부 확인 (Fail-Safe 적용)
 * @returns true: 발행 차단 (중지 상태이거나 오류 발생 시)
 *          false: 정상 발행 허용
 */
export function isPublishingPaused(): boolean {
  try {
    ensureSettingsTable();
    const row = db
      .prepare("SELECT value FROM pipeline_settings WHERE key = ?")
      .get(SETTING_KEY) as { value: string } | undefined;

    if (!row) {
      // 미설정 시 기본값은 정상 허용(false)
      return false;
    }

    const parsed = JSON.parse(row.value) as { isPaused?: boolean };
    return Boolean(parsed.isPaused);
  } catch (err) {
    // Fail-Safe: 상태 조회가 불명확하거나 에러 발생 시 발행을 차단
    console.error("[EmergencyStop Fail-Safe Triggered] 설정 조회 오류로 발행을 긴급 차단합니다:", err);
    return true;
  }
}

/**
 * 현재 긴급 중지 상태 상세 조회
 */
export function getEmergencyStopStatus(): EmergencyStopStatus {
  try {
    ensureSettingsTable();
    const row = db
      .prepare("SELECT value, updatedAt, updatedBy FROM pipeline_settings WHERE key = ?")
      .get(SETTING_KEY) as { value: string; updatedAt: string; updatedBy: string | null } | undefined;

    if (!row) {
      return {
        isPaused: false,
        reason: "정상 운영 중 (기본 상태)",
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      };
    }

    const parsed = JSON.parse(row.value) as { isPaused?: boolean; reason?: string };
    return {
      isPaused: Boolean(parsed.isPaused),
      reason: parsed.reason || (parsed.isPaused ? "관리자에 의해 일시 중지됨" : "정상 운영 중"),
      updatedAt: row.updatedAt || new Date().toISOString(),
      updatedBy: row.updatedBy || "admin",
    };
  } catch (err) {
    console.error("[EmergencyStop] 상태 조회 실패:", err);
    return {
      isPaused: true,
      reason: "시스템 조회 오류로 인한 안전 중지 (Fail-Safe)",
      updatedAt: new Date().toISOString(),
      updatedBy: "system-failsafe",
    };
  }
}

/**
 * 전역 발행 상태 변경 (중지 / 재개)
 */
export function setPublishingPaused(
  paused: boolean,
  reason: string = "",
  updatedBy: string = "admin"
): { success: boolean; status: EmergencyStopStatus; error?: string } {
  try {
    ensureSettingsTable();

    const payload = JSON.stringify({
      isPaused: paused,
      reason: reason || (paused ? "관리자에 의해 일시 중지됨" : "관리자에 의해 발행 재개됨"),
    });

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO pipeline_settings (key, value, updatedAt, updatedBy)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updatedAt = excluded.updatedAt,
        updatedBy = excluded.updatedBy
    `);

    stmt.run(SETTING_KEY, payload, now, updatedBy);

    const status: EmergencyStopStatus = {
      isPaused: paused,
      reason: reason || (paused ? "관리자에 의해 일시 중지됨" : "관리자에 의해 발행 재개됨"),
      updatedAt: now,
      updatedBy,
    };

    console.log(
      `[EmergencyStop] 전역 발행 상태 변경: ${paused ? "🚨 PAUSED (중지)" : "✅ RESUMED (재개)"} (사유: ${status.reason}, 변경자: ${updatedBy})`
    );

    return { success: true, status };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[EmergencyStop] 상태 변경 실패:", err);
    return {
      success: false,
      status: getEmergencyStopStatus(),
      error: errorMsg,
    };
  }
}
