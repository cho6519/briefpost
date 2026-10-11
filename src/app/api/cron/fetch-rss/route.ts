import { NextRequest, NextResponse } from "next/server";
import { fetchRssFeeds } from "@/lib/rss";
import { verifyCronAuth } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

/**
 * RSS 피드 수집 공통 핸들러 (읽기 전용 / 모니터링 전용)
 */
async function handleFetchRss(request: NextRequest) {
  // 0. Vercel Cron 및 외부 무단 호출 방지 인증 검증
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  const startTime = Date.now();
  console.log(`[CRON /api/cron/fetch-rss] 수집 작업 트리거됨 (${new Date().toISOString()})`);

  try {
    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get("url");
    const customCategory = searchParams.get("category") || "Tech";
    const customFeeds = customUrl
      ? [{ url: customUrl, category: customCategory }]
      : undefined;

    // 1. RSS 파싱 및 중복 필터링 실행 (읽기 전용)
    const result = await fetchRssFeeds(customFeeds);

    // [STEP 4.3 Safe-Guard] RSS 수집과 공개 발행의 엄격한 분리:
    // 공식 출처 대조 및 개별 주장 팩트 검증이 완료되기 전까지 공개 DB 직접 INSERT를 전면 차단합니다.
    // 본 엔드포인트는 원문 수집 및 피드 모니터링/진단 전용(읽기 전용)으로만 동작합니다.
    const requestedSave = searchParams.get("save") === "true";
    let savedCount = 0;
    let saveBlockedReason: string | undefined = undefined;

    if (requestedSave) {
      saveBlockedReason =
        "UNVERIFIED_DIRECT_INSERT_BLOCKED: RSS 수집 결과의 공개 DB 직접 저장은 공식 출처 대조 및 사실 검증 부재로 인해 안전 차단되었습니다.";
      console.warn(`[CRON fetch-rss SAFEGUARD] ${saveBlockedReason}`);
    }

    const durationMs = Date.now() - startTime;

    console.log(
      `[CRON /api/cron/fetch-rss] 완료 (${durationMs}ms) - 전체 발견: ${result.totalFetched}건, 신규 수집: ${result.newItemsCount}건, 중복 건너뜀: ${result.skippedCount}건 (공개 DB 저장: 차단됨)`
    );

    return NextResponse.json({
      success: true,
      count: result.newItemsCount,
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        totalFetched: result.totalFetched,
        newItemsCount: result.newItemsCount,
        skippedCount: result.skippedCount,
        savedToDbCount: savedCount,
        saveBlockedReason,
      },
      feedStatuses: result.feedStatuses,
      items: result.items,
    });
  } catch (globalError: unknown) {
    console.error("[CRON Global Error] RSS 수집 엔드포인트 치명적 오류:", globalError);
    const errMsg = globalError instanceof Error ? globalError.message : "Internal server error during RSS fetching";

    return NextResponse.json(
      {
        success: false,
        error: errMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleFetchRss(request);
}

export async function POST(request: NextRequest) {
  return handleFetchRss(request);
}
