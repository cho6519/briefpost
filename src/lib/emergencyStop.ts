import db from "./db";
import { isNeonConfigured, getNeonPool } from "./neonDb";

/**
 * 전역 긴급 중지(Emergency Kill Switch) 관리 모듈
 * 
 * [안전 원칙]
 * 1. Fail-Safe: 설정 조회 실패 또는 상태가 불명확한 경우 공개 발행을 허용하지 않고 차단(true) 처리
 * 2. SQLite / Neon PostgreSQL pipeline_settings 테이블에 영구 저장 (듀얼 지원)
 * 3. 발행 경로 A(대기열 발행)와 경로 B(RSS 크론 직접 발행) 모두에 공통 적용
 * 4. 이미 외부에 공개된 기존 기사를 삭제하지 않고, 신규 기사의 INSERT만 차단
 */

export interface EmergencyStopStatus {
  isPaused: boolean;
  reason: string;
  updatedAt: string;
  updatedBy: string;
}

export const SETTING_KEY = "publishing_emergency_stop";

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
 * 전역 발행 중지 여부 확인 (동기 - SQLite 기준 Fail-Safe)
 */
export function isPublishingPaused(): boolean {
  try {
    ensureSettingsTable();
    const row = db
      .prepare("SELECT value FROM pipeline_settings WHERE key = ?")
      .get(SETTING_KEY) as { value: string } | undefined;

    if (!row) {
      return false;
    }

    const parsed = JSON.parse(row.value) as { isPaused?: boolean };
    return Boolean(parsed.isPaused);
  } catch (err) {
    console.error("[EmergencyStop Fail-Safe Triggered] 설정 조회 오류로 발행을 긴급 차단합니다:", err);
    return true;
  }
}

/**
 * 전역 발행 중지 여부 확인 (비동기 - Neon / SQLite 듀얼 Fail-Safe)
 */
export async function isPublishingPausedAsync(): Promise<boolean> {
  if (isNeonConfigured()) {
    const pool = getNeonPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          const res = await client.query<{ value: any }>(
            "SELECT value FROM pipeline_settings WHERE key = $1",
            [SETTING_KEY]
          );
          if (res.rows.length === 0) {
            return false;
          }
          const val = res.rows[0].value;
          const parsed = typeof val === "string" ? JSON.parse(val) : val;
          return Boolean(parsed?.isPaused);
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("[EmergencyStop Async Neon Fail-Safe Triggered - Fail-Closed]:", err);
        return true; // Fail-Closed: 조회 오류 시 발행 차단
      }
    } else {
      // Neon이 구성되었으나 Pool 초기화 실패 시에도 안전을 위해 발행 차단 (Fail-Closed)
      console.error("[EmergencyStop Async Neon Pool Missing - Fail-Closed]");
      return true;
    }
  }

  return isPublishingPaused();
}

/**
 * 현재 긴급 중지 상태 상세 조회 (비동기 - Neon / SQLite 듀얼)
 */
export async function getEmergencyStopStatusAsync(): Promise<EmergencyStopStatus> {
  if (isNeonConfigured()) {
    const pool = getNeonPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          const res = await client.query<{ value: any; updated_at: string }>(
            "SELECT value, updated_at FROM pipeline_settings WHERE key = $1",
            [SETTING_KEY]
          );
          if (res.rows.length === 0) {
            return {
              isPaused: false,
              reason: "정상 운영 중 (기본 상태)",
              updatedAt: new Date().toISOString(),
              updatedBy: "system",
            };
          }
          const row = res.rows[0];
          const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          return {
            isPaused: Boolean(parsed?.isPaused),
            reason: parsed?.reason || (parsed?.isPaused ? "관리자에 의해 일시 중지됨" : "정상 운영 중"),
            updatedAt: row.updated_at || new Date().toISOString(),
            updatedBy: parsed?.updatedBy || "admin",
          };
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("[EmergencyStop] Neon 상태 조회 실패:", err);
        return {
          isPaused: true,
          reason: "시스템 조회 오류로 인한 안전 중지 (Fail-Safe)",
          updatedAt: new Date().toISOString(),
          updatedBy: "system-failsafe",
        };
      }
    }
  }

  return getEmergencyStopStatus();
}

/**
 * 현재 긴급 중지 상태 상세 조회 (동기)
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
 * 전역 발행 상태 변경 (비동기 - Neon / SQLite 듀얼)
 */
export async function setPublishingPausedAsync(
  paused: boolean,
  reason: string = "",
  updatedBy: string = "admin"
): Promise<{ success: boolean; status: EmergencyStopStatus; error?: string }> {
  const payloadObj = {
    isPaused: paused,
    reason: reason || (paused ? "관리자에 의해 일시 중지됨" : "관리자에 의해 발행 재개됨"),
    updatedBy,
  };

  if (isNeonConfigured()) {
    const pool = getNeonPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `
            INSERT INTO pipeline_settings (key, value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET
              value = EXCLUDED.value,
              updated_at = CURRENT_TIMESTAMP
            `,
            [SETTING_KEY, JSON.stringify(payloadObj)]
          );
        } finally {
          client.release();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[EmergencyStop] Neon 상태 변경 실패:", err);
        return {
          success: false,
          status: await getEmergencyStopStatusAsync(),
          error: errorMsg,
        };
      }
    }
  }

  // 로컬 SQLite도 함께 동기화
  return setPublishingPaused(paused, reason, updatedBy);
}

/**
 * 전역 발행 상태 변경 (동기)
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
      updatedBy,
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
