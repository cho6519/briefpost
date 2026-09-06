import { NextRequest, NextResponse } from "next/server";
import { fetchRssFeeds } from "@/lib/rss";
import { rewriteArticleWithAI } from "@/lib/ai";
import { createArticle, ensureUniqueSlug, articleExistsBySourceUrl } from "@/lib/articles";
import { verifyCronAuth } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

/**
 * RSS 수집 + AI 패러프레이징 + DB 자동 퍼블리싱 공통 핸들러
 */
async function handlePublishArticles(request: NextRequest) {
  // 0. Vercel Cron 및 외부 무단 호출 방지 인증 검증
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  const startTime = Date.now();
  console.log(`[PUBLISH CRON] 자동 기사 가공 및 퍼블리싱 시작 (${new Date().toISOString()})`);

  try {
    const { searchParams } = new URL(request.url);
    // 한 번의 실행에서 처리할 최대 기사 수 (기본값: 3개, 최대 10개)
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "3", 10)));
    const customFeedUrl = searchParams.get("url") || undefined;
    const customCategory = searchParams.get("category") || undefined;

    // 1. RSS 피드에서 최신 기사 수집 (기존 DB 중복 기사는 자동 제외됨)
    const rssResult = await fetchRssFeeds(
      customFeedUrl ? [{ url: customFeedUrl, category: customCategory }] : undefined
    );

    const candidates = rssResult.items.slice(0, limit);
    console.log(`[PUBLISH CRON] 신규 수집 후보: ${rssResult.newItemsCount}건 중 상위 ${candidates.length}건 AI 재가공 진행`);

    const publishedArticles = [];
    const failedItems = [];

    // 2. 수집된 후보 기사를 AI로 100% 재작성 및 DB 저장
    for (const rawItem of candidates) {
      try {
        // 이중 안전장치: 혹시라도 이미 등록된 sourceUrl이면 건너뜀
        if (articleExistsBySourceUrl(rawItem.link)) {
          console.log(`[PUBLISH CRON] 이미 등록된 원문 URL 건너뜀: ${rawItem.link}`);
          continue;
        }

        console.log(`[PUBLISH CRON] AI 재가공 시작: "${rawItem.title.slice(0, 35)}..."`);

        // AI 패러프레이징 호출 (100% 문장 재구성 및 팩트 보존)
        const rewritten = await rewriteArticleWithAI({
          title: rawItem.title,
          content: rawItem.content || rawItem.contentSnippet,
          category: rawItem.category,
          link: rawItem.link,
        });

        // 고유 슬러그 검증 및 중복 방지 타임스탬프 처리
        const uniqueSlug = ensureUniqueSlug(rewritten.slug);

        // SQLite DB에 최종 기사 자동 Insert
        const savedArticle = createArticle({
          title: rewritten.title,
          slug: uniqueSlug,
          content: rewritten.content,
          summary: rewritten.summary,
          category: rewritten.category || rawItem.category,
          metaTitle: rewritten.metaTitle,
          metaDescription: rewritten.metaDescription,
          thumbnailUrl: rawItem.thumbnailUrl,
          sourceUrl: rawItem.link,
          createdAt: rawItem.pubDate || new Date().toISOString(),
        });

        publishedArticles.push({
          id: savedArticle.id,
          title: savedArticle.title,
          slug: savedArticle.slug,
          category: savedArticle.category,
          url: `/news/${savedArticle.slug}`,
          sourceUrl: savedArticle.sourceUrl,
          publishedAt: savedArticle.createdAt,
        });

        console.log(`[PUBLISH CRON] 기사 발행 완료: /news/${savedArticle.slug} (ID: ${savedArticle.id})`);
      } catch (itemError: unknown) {
        // 개별 기사 실패 시 전체 프로세스가 죽지 않고 다음 기사로 안전하게 넘어감
        const itemErrMsg = itemError instanceof Error ? itemError.message : String(itemError);
        console.error(`[PUBLISH CRON Error] 개별 기사 가공/저장 실패 ("${rawItem.title}"):`, itemErrMsg);
        failedItems.push({
          title: rawItem.title,
          link: rawItem.link,
          error: itemErrMsg || "Unknown processing error",
        });
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[PUBLISH CRON] 최종 완료: 발행 ${publishedArticles.length}건, 실패 ${failedItems.length}건, 소요시간 ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        totalRssFetched: rssResult.totalFetched,
        totalNewCandidates: rssResult.newItemsCount,
        processedLimit: limit,
        publishedCount: publishedArticles.length,
        skippedCount: rssResult.skippedCount,
        failedCount: failedItems.length,
      },
      publishedArticles,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });
  } catch (globalError: unknown) {
    console.error("[PUBLISH CRON Fatal Error] 퍼블리싱 엔드포인트 치명적 오류:", globalError);
    const globalErrMsg = globalError instanceof Error ? globalError.message : "Fatal error during article publishing";

    return NextResponse.json(
      {
        success: false,
        error: globalErrMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePublishArticles(request);
}

export async function POST(request: NextRequest) {
  return handlePublishArticles(request);
}
