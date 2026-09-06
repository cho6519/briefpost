import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Cron 또는 외부 호출에 대한 CRON_SECRET 인증 토큰 검증 함수
 * 
 * Vercel Cron은 vercel.json에 등록된 작업 실행 시
 * 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더를 포함하여 요청합니다.
 */
export function verifyCronAuth(request: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // 1. 프로덕션 환경에서 CRON_SECRET이 환경변수에 등록되지 않은 경우
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CRON AUTH] 서버 환경변수에 CRON_SECRET이 설정되어 있지 않아 요청을 거부합니다.");
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

    // 로컬 개발 환경(development)인 경우 편의를 위해 경고 로그만 남기고 통과 허용
    console.warn("[CRON AUTH] 개발 모드: CRON_SECRET이 설정되지 않아 인증을 임시 통과합니다.");
    return { authorized: true };
  }

  // 2. 요청 헤더의 Authorization 토큰 추출 (Bearer <TOKEN>)
  const authHeader = request.headers.get("authorization");
  const expectedAuthHeader = `Bearer ${cronSecret}`;

  // 3. 편의 지원: URL 쿼리 파라미터 ?secret=... 로도 전달 가능하도록 지원
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");

  const isValidHeader = authHeader === expectedAuthHeader;
  const isValidParam = secretParam === cronSecret;

  if (isValidHeader || isValidParam) {
    return { authorized: true };
  }

  console.warn(
    `[CRON AUTH] 유효하지 않은 인증 시도 차단 (IP: ${request.headers.get("x-forwarded-for") || "unknown"})`
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
