import { NextRequest, NextResponse } from "next/server";
import { pipelineStore } from "@/agents/pipelineStore";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { isPublishingPaused } from "@/lib/emergencyStop";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. 관리자 권한 서버 사이드 검증
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. 전역 긴급 중지 검사
    if (isPublishingPaused()) {
      return NextResponse.json(
        {
          success: false,
          error: "전역 긴급 중지 상태(PUBLISHING_PAUSED)로 인해 신규 기사 발행이 차단되었습니다.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { queueId } = body;

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: "queueId가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const result = await pipelineStore.publishQueueItem(queueId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      articleId: result.articleId,
      message: "정식 기사 발행이 성공적으로 완료되었습니다.",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
