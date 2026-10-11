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
 * Vercel Cron 및 스케줄러 전용 CRON_SECRET 인증 토큰 검증 함수
 * 
 * [보안 원칙 - STEP 4.3 준수]
 * 1. 크론 API는 CRON_SECRET만 단독으로 사용 (ADMIN_SECRET과 상호 대체 불가)
 * 2. CRON_SECRET이 미설정/비어있는 경우 환경(개발/프로덕션)과 무관하게 요청 전면 차단
 * 3. URL 쿼리 파라미터(?secret=)를 통한 비밀키 전달 완전 금지 (로그/모니터링 URL 노출 원천 차단)
 * 4. Vercel Cron 표준인 Authorization: Bearer <CRON_SECRET> 헤더만 허용
 * 5. 크론 인증 통과가 관리자 권한을 부여하지 않음 (권한 철저 분리)
 * 6. 실패 시 토큰이나 비밀키를 로그에 일절 노출하지 않음
 */
export function verifyCronAuth(request: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // 1. CRON_SECRET이 환경변수에 등록되지 않은 경우 (개발/운영 공통 즉시 차단)
  if (!cronSecret) {
    console.error("[CRON AUTH] 서버 환경변수에 CRON_SECRET이 설정되어 있지 않아 크론 요청을 전면 거부합니다.");
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: CRON_SECRET is not configured on the server.",
        },
        { status: 401 }
      ),
    };
  }

  // 2. 요청 헤더의 Authorization 토큰 추출 (Bearer <CRON_SECRET>)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (safeCompare(bearerToken, cronSecret)) {
      return { authorized: true };
    }
  }

  // 3. URL 쿼리 파라미터(?secret=) 인증은 보안 정책상 차단
  console.warn(
    `[CRON AUTH] 유효하지 않은 크론 인증 시도 차단 (IP: ${request.headers.get("x-forwarded-for") || "unknown"})`
  );

  return {
    authorized: false,
    response: NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing authorization token.",
      },
      { status: 401 }
    ),
  };
}
