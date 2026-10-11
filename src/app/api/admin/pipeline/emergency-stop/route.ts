import { NextRequest, NextResponse } from "next/server";
import {
  getEmergencyStopStatus,
  setPublishingPaused,
} from "@/lib/emergencyStop";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * GET: 현재 전역 긴급 중지 상태 조회
 */
export async function GET() {
  const status = getEmergencyStopStatus();
  return NextResponse.json({
    success: true,
    status,
  });
}

/**
 * POST: 전역 긴급 중지 상태 변경 (pause | resume)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 관리자 권한 서버 사이드 검증
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await req.json();
    const { action, reason, updatedBy } = body;

    if (action !== "pause" && action !== "resume") {
      return NextResponse.json(
        { success: false, error: "action은 'pause' 또는 'resume'이어야 합니다." },
        { status: 400 }
      );
    }

    const shouldPause = action === "pause";
    const result = setPublishingPaused(
      shouldPause,
      reason || (shouldPause ? "관리자에 의한 긴급 일시 중지" : "관리자에 의한 정상 발행 재개"),
      updatedBy || "admin"
    );

    return NextResponse.json({
      success: result.success,
      status: result.status,
      error: result.error,
      message: shouldPause
        ? "🚨 전역 기사 발행이 긴급 일시 중지되었습니다. (RSS 크론 및 대기열 발행 모두 차단)"
        : "✅ 전역 기사 발행이 정상 재개되었습니다.",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
