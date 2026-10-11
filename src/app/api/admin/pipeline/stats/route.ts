import { NextRequest, NextResponse } from "next/server";
import { pipelineStore } from "@/agents/pipelineStore";
import { getEmergencyStopStatus } from "@/lib/emergencyStop";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const stats = pipelineStore.getDashboardStats();
    const queueItems = pipelineStore.getQueueItems();
    const keywords = pipelineStore.getAllKeywords(100);
    const rejectedList = pipelineStore.getRejectedList(50);
    const apiErrors = pipelineStore.getApiErrors(50);
    const failedRuns = pipelineStore.getFailedRuns(20);
    const recentLogs = pipelineStore.getRecentLogs(60);
    const emergencyStop = getEmergencyStopStatus();

    return NextResponse.json({
      success: true,
      stats,
      emergencyStop,
      queueItems,
      keywords,
      rejectedList,
      apiErrors,
      failedRuns,
      recentLogs,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
