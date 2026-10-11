import { NextRequest, NextResponse } from "next/server";
import { pipelineStore } from "@/agents/pipelineStore";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. 관리자 권한 서버 사이드 검증
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await req.json();
    const { queueId, reason } = body;

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: "queueId가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const result = pipelineStore.rejectQueueItem(queueId, reason || "관리자에 의해 대기열에서 반려됨");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "기사가 대기열에서 성공적으로 반려(REJECTED)되었습니다.",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
