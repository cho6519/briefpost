import { NextRequest, NextResponse } from "next/server";
import { agentPipeline } from "@/agents/pipeline";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. 관리자 권한 서버 사이드 검증
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await req.json().catch(() => ({}));
    const { domain, seedKeywords, targetAudience, hunterCount } = body;

    const result = await agentPipeline.run({
      domain,
      seedKeywords,
      targetAudience,
      hunterCount: hunterCount ? Number(hunterCount) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
