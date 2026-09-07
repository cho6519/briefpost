import { NextRequest, NextResponse } from "next/server";
import { fetchRssFeeds } from "@/lib/rss";
import { createArticle } from "@/lib/articles";
import { verifyCronAuth } from "@/lib/cronAuth";
import { verifyAndSanitizeArticle, normalizeThreeLineSummary } from "@/lib/articleValidator";

export const dynamic = "force-dynamic";

/**
 * 영어/숫자 기반 URL-friendly Slug 생성 유틸리티
 */
function generateSlug(title: string): string {
  const timestamp = Date.now().toString(36);
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);

  return `${cleanTitle}-${timestamp}`;
}

/**
 * RSS 피드 수집 공통 핸들러
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
    // 기본적으로 신규 기사를 DB에 자동 적재하여 다음 호출 시 중복 수집을 원천 방지 (save=false로 끌 수 있음)
    const shouldSaveToDb = searchParams.get("save") !== "false";

    const customFeeds = customUrl
      ? [{ url: customUrl, category: customCategory }]
      : undefined;

    // 1. RSS 파싱 및 중복 필터링 실행
    const result = await fetchRssFeeds(customFeeds);

    // 2. 만약 ?save=true 파라미터가 주어졌다면 신규 기사를 즉시 DB에 적재
    let savedCount = 0;
    if (shouldSaveToDb && result.items.length > 0) {
      for (const item of result.items) {
        try {
          const slug = generateSlug(item.title);
          const rawContent = item.content || item.contentSnippet;
          const { summary } = normalizeThreeLineSummary(
            item.contentSnippet,
            rawContent,
            item.title
          );

          // 품질 및 태그 제거 검증 게이트
          const validated = verifyAndSanitizeArticle({
            title: item.title,
            slug,
            content: rawContent,
            summary,
            category: item.category,
            metaTitle: `${item.title} | Brief Post`,
            metaDescription: item.contentSnippet.slice(0, 150),
            thumbnailUrl: item.thumbnailUrl,
            sourceUrl: item.link,
          });

          if (!validated.isValid) {
            console.warn(`[CRON fetch-rss] 유효성 검사 미통과 건너뜀: ${item.title}`);
            continue;
          }

          const validItem = validated.sanitized;

          createArticle({
            title: validItem.title,
            slug: validItem.slug,
            content: validItem.content,
            summary: validItem.summary,
            category: validItem.category,
            metaTitle: validItem.metaTitle ?? null,
            metaDescription: validItem.metaDescription ?? null,
            thumbnailUrl: validItem.thumbnailUrl ?? null,
            sourceUrl: validItem.sourceUrl ?? null,
            createdAt: item.pubDate,
          });
          savedCount++;
        } catch (dbError: unknown) {
          const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
          console.error(`[CRON DB Save Error] 기사 저장 실패 (${item.link}):`, errMsg);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    console.log(
      `[CRON /api/cron/fetch-rss] 완료 (${durationMs}ms) - 전체 발견: ${result.totalFetched}건, 신규 수집: ${result.newItemsCount}건, 중복 건너뜀: ${result.skippedCount}건${shouldSaveToDb ? `, DB 저장: ${savedCount}건` : ""}`
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
