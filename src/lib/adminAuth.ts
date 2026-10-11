import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * 타이밍 공격 방지 안전 문자열 비교 함수
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 관리자 API 전용 서버 사이드 권한 검증 모듈
 * 
 * [보안 원칙 - STEP 4.3 준수]
 * 1. 관리자 API는 ADMIN_SECRET만 단독으로 사용 (CRON_SECRET 대체 허용 절대 불가)
 * 2. ADMIN_SECRET이 미설정/빈 문자열인 경우 환경(개발/프로덕션)과 무관하게 요청 전면 차단
 * 3. URL 쿼리 파라미터(?secret=, ?admin_key=)를 통한 비밀키 전달 완전 금지 (로그/브라우저 히스토리 노출 차단)
 * 4. 오직 Authorization: Bearer <ADMIN_SECRET> 또는 x-admin-key: <ADMIN_SECRET> 헤더만 허용
 * 5. 인증 실패 시 토큰이나 비밀키를 로그에 일절 기록하지 않음
 */
export function verifyAdminAuth(request: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const adminSecret = process.env.ADMIN_SECRET?.trim();

  // 1. ADMIN_SECRET이 없거나 비어 있으면 관리자 요청을 무조건 거부 (개발 환경 우회 차단)
  if (!adminSecret) {
    console.error("[ADMIN AUTH] 서버에 ADMIN_SECRET이 미설정되어 관리자 요청을 전면 거부합니다.");
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: ADMIN_SECRET is not configured on the server.",
        },
        { status: 401 }
      ),
    };
  }

  // 2. Authorization 헤더 확인 (Bearer <ADMIN_SECRET>)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (safeCompare(bearerToken, adminSecret)) {
      return { authorized: true };
    }
  }

  // 3. x-admin-key 헤더 확인 (<ADMIN_SECRET>)
  const adminKeyHeader = request.headers.get("x-admin-key")?.trim();
  if (adminKeyHeader && safeCompare(adminKeyHeader, adminSecret)) {
    return { authorized: true };
  }

  // 4. URL 쿼리 파라미터 인증은 보안 취약점 방지를 위해 완전히 무시 및 거부
  console.warn(`[ADMIN AUTH] 비인가 관리자 요청 차단 (IP: ${request.headers.get("x-forwarded-for") || "unknown"})`);

  return {
    authorized: false,
    response: NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing administrator credentials.",
      },
      { status: 401 }
    ),
  };
}
