import { NextRequest, NextResponse } from "next/server";
import { fetchRssFeeds, ParsedRssItem } from "@/lib/rss";
import { rewriteArticleWithAI } from "@/lib/ai";
import { createArticle, ensureUniqueSlug, articleExistsBySourceUrl } from "@/lib/articles";
import { verifyCronAuth } from "@/lib/cronAuth";
import { verifyAndSanitizeArticle } from "@/lib/articleValidator";

export const dynamic = "force-dynamic";

type CronStage =
  | "AUTH"
  | "CONFIG_CHECK"
  | "RSS_FETCH"
  | "AI_PROCESSING"
  | "QUALITY_VALIDATION"
  | "DB_SAVE"
  | "COMPLETED";

/**
 * RSS 수집 + AI 패러프레이징 + 품질 검증 + DB 자동 퍼블리싱 공통 핸들러
 */
async function handlePublishArticles(request: NextRequest) {
  const startTime = Date.now();
  let currentStage: CronStage = "AUTH";

  const stageDescriptions: Record<CronStage, string> = {
    AUTH: "인증 토큰(CRON_SECRET) 검증",
    CONFIG_CHECK: "환경변수 및 Gemini API 설정 확인",
    RSS_FETCH: "공공 및 언론사 RSS 피드 원문 수집 및 중복 체크",
    AI_PROCESSING: "Google Gemini AI 본문 재가공 및 요약·SEO 생성",
    QUALITY_VALIDATION: "3줄 요약 태그 제거 및 제목-내용 일치성 무결성 검증",
    DB_SAVE: "SQLite 데이터베이스 영구 저장 및 슬러그 검증",
    COMPLETED: "전체 기사 자동 발행 파이프라인 완료",
  };

  let rssResult: Awaited<ReturnType<typeof fetchRssFeeds>> | null = null;
  let candidates: ParsedRssItem[] = [];
  const publishedArticles = [];
  const failedItems = [];

  console.log(`\n======================================================`);
  console.log(`[PUBLISH CRON] 기사 수집 및 AI 자동 발행 파이프라인 개시`);
  console.log(`- 시작 일시: ${new Date().toISOString()}`);
  console.log(`======================================================`);

  try {
    // 0. Vercel Cron 및 외부 무단 호출 방지 인증 검증
    currentStage = "AUTH";
    console.log(`[PUBLISH CRON] [1/5] 인증 검증 단계 (${stageDescriptions[currentStage]})...`);
    const auth = verifyCronAuth(request);
    if (!auth.authorized) {
      console.warn(`[PUBLISH CRON] 인증 실패 - 요청 거부`);
      return auth.response!;
    }
    console.log(`[PUBLISH CRON] [1/5] 인증 통과 완료`);

    // 1. 설정 및 API 키 확인
    currentStage = "CONFIG_CHECK";
    console.log(`[PUBLISH CRON] [2/5] 환경변수 및 키 검증 단계...`);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const aiModel = process.env.AI_MODEL || "gemini-3.6-flash";

    if (!geminiKey) {
      console.warn(
        `[PUBLISH CRON Warning] GEMINI_API_KEY가 미설정 상태입니다. (로컬 폴백 에디터가 적용됩니다)`
      );
    } else {
      console.log(`[PUBLISH CRON] Gemini API Key 확인 완료 (모델: ${aiModel})`);
    }

    const { searchParams } = new URL(request.url);
    // 한 번의 실행에서 처리할 최대 기사 수 (기본값: 3개, 최대 10개)
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "3", 10)));
    const customFeedUrl = searchParams.get("url") || undefined;
    const customCategory = searchParams.get("category") || undefined;

    // 2. RSS 피드에서 최신 기사 수집 (피드별 상태 추적 및 중복 필터링)
    currentStage = "RSS_FETCH";
    console.log(`[PUBLISH CRON] [3/5] RSS 피드 원문 수집 단계 시작 (limit: ${limit})...`);
    rssResult = await fetchRssFeeds(
      customFeedUrl ? [{ url: customFeedUrl, category: customCategory }] : undefined
    );

    candidates = rssResult.items.slice(0, limit);
    console.log(
      `[PUBLISH CRON] [3/5] RSS 수집 결과: 원문 ${rssResult.totalFetched}건 중 신규 ${rssResult.newItemsCount}건 확보 (상위 ${candidates.length}건 AI 재가공 대상 선정)`
    );

    if (candidates.length === 0) {
      console.log(`[PUBLISH CRON] 새로 발행할 신규 기사 후보가 없어 작업을 종료합니다.`);
      const durationMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        stage: "COMPLETED",
        stageDescription: "신규 수집 대상 없음 (모두 중복이거나 피드 없음)",
        timestamp: new Date().toISOString(),
        durationMs,
        summary: {
          totalRssRawFetched: rssResult.totalFetched,
          totalNewCandidates: rssResult.newItemsCount,
          duplicateSkippedCount: rssResult.skippedCount,
          processedLimit: limit,
          publishedCount: 0,
          failedCount: 0,
        },
        feedStatuses: rssResult.feedStatuses,
        publishedArticles: [],
      });
    }

    // 3. 수집된 후보 기사를 AI로 100% 재작성 및 DB 저장
    console.log(`[PUBLISH CRON] [4/5] AI 재가공 및 DB 저장 루프 시작 (총 ${candidates.length}건)`);

    for (let i = 0; i < candidates.length; i++) {
      const rawItem = candidates[i];
      const itemIndexStr = `[${i + 1}/${candidates.length}]`;

      try {
        // 이중 안전장치: 혹시라도 이미 등록된 sourceUrl이면 건너뜀
        if (articleExistsBySourceUrl(rawItem.link)) {
          console.log(
            `[PUBLISH CRON] ${itemIndexStr} 이미 DB에 존재하는 URL이므로 스킵: ${rawItem.link}`
          );
          continue;
        }

        currentStage = "AI_PROCESSING";
        console.log(
          `[PUBLISH CRON] ${itemIndexStr} AI 패러프레이징 시작: "${rawItem.title.slice(0, 40)}..."`
        );

        // AI 패러프레이징 호출 (100% 문장 재구성 및 팩트 보존)
        const rewritten = await rewriteArticleWithAI({
          title: rawItem.title,
          content: rawItem.content || rawItem.contentSnippet,
          category: rawItem.category,
          link: rawItem.link,
        });

        currentStage = "QUALITY_VALIDATION";
        console.log(`[PUBLISH CRON] ${itemIndexStr} 기사 품질 및 제목-내용 일치성 무결성 검증 수행...`);

        // 3줄 요약 태그 제거 및 제목-내용 일치성 검증 게이트 통과
        const validation = verifyAndSanitizeArticle({
          title: rewritten.title,
          slug: rewritten.slug,
          summary: rewritten.summary,
          content: rewritten.content,
          category: rewritten.category || rawItem.category,
          metaTitle: rewritten.metaTitle,
          metaDescription: rewritten.metaDescription,
          thumbnailUrl: rawItem.thumbnailUrl,
          sourceUrl: rawItem.link,
        });

        if (!validation.isValid) {
          throw new Error(`기사 품질 기준 미달로 발행 거절: ${validation.rejectionReason}`);
        }

        if (validation.repairedIssues.length > 0) {
          console.log(
            `[PUBLISH CRON REPAIRED] ${itemIndexStr} 무결성 자동 보정 적용: ${validation.repairedIssues.join(" | ")}`
          );
        }

        const validArticle = validation.sanitized;

        currentStage = "DB_SAVE";
        // 고유 슬러그 검증 및 중복 방지 타임스탬프 처리
        const uniqueSlug = ensureUniqueSlug(validArticle.slug);

        // SQLite DB에 최종 기사 자동 Insert (우리 사이트 송출 시점 기준 최신화)
        const savedArticle = createArticle({
          title: validArticle.title,
          slug: uniqueSlug,
          content: validArticle.content,
          summary: validArticle.summary,
          category: validArticle.category,
          metaTitle: validArticle.metaTitle ?? null,
          metaDescription: validArticle.metaDescription ?? null,
          thumbnailUrl: rawItem.thumbnailUrl,
          sourceUrl: rawItem.link,
          createdAt: new Date().toISOString(),
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

        console.log(
          `[PUBLISH CRON SUCCESS] ${itemIndexStr} 기사 발행 완료: /news/${savedArticle.slug} (DB ID: ${savedArticle.id})`
        );
      } catch (itemError: unknown) {
        // 개별 기사 실패 시 전체 프로세스가 죽지 않고 다음 기사로 안전하게 넘어감
        const itemErrMsg = itemError instanceof Error ? itemError.message : String(itemError);
        console.error(
          `[PUBLISH CRON ERROR] ${itemIndexStr} 개별 기사 가공/저장 실패 ("${rawItem.title}"):`,
          itemErrMsg
        );
        failedItems.push({
          title: rawItem.title,
          link: rawItem.link,
          stage: currentStage,
          error: itemErrMsg || "Unknown processing error",
        });
      }
    }

    currentStage = "COMPLETED";
    const durationMs = Date.now() - startTime;
    console.log(`\n======================================================`);
    console.log(
      `[PUBLISH CRON COMPLETE] 전체 완료: 성공 ${publishedArticles.length}건, 실패 ${failedItems.length}건, 소요시간 ${durationMs}ms`
    );
    console.log(`======================================================\n`);

    return NextResponse.json({
      success: true,
      stage: currentStage,
      stageDescription: stageDescriptions[currentStage],
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        totalRssRawFetched: rssResult.totalFetched,
        totalNewCandidates: rssResult.newItemsCount,
        duplicateSkippedCount: rssResult.skippedCount,
        expiredCount: rssResult.expiredCount ?? 0,
        processedLimit: limit,
        publishedCount: publishedArticles.length,
        failedCount: failedItems.length,
      },
      feedStatuses: rssResult.feedStatuses,
      publishedArticles,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });
  } catch (globalError: unknown) {
    const durationMs = Date.now() - startTime;
    console.error(`[PUBLISH CRON FATAL ERROR] [단계: ${currentStage}] 치명적 오류 발생:`, globalError);
    const globalErrMsg =
      globalError instanceof Error ? globalError.message : "Fatal error during article publishing";

    return NextResponse.json(
      {
        success: false,
        stage: currentStage,
        stageDescription: stageDescriptions[currentStage] || "알 수 없는 단계",
        error: globalErrMsg,
        timestamp: new Date().toISOString(),
        durationMs,
        diagnostics: {
          hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
          aiModel: process.env.AI_MODEL || "gemini-3.6-flash",
          rssSummary: rssResult
            ? {
                totalRawFetched: rssResult.totalFetched,
                totalNewCandidates: rssResult.newItemsCount,
                duplicateSkippedCount: rssResult.skippedCount,
              }
            : null,
          feedStatuses: rssResult?.feedStatuses || [],
          candidatesCount: candidates ? candidates.length : 0,
          publishedCount: publishedArticles.length,
          failedCount: failedItems.length,
          failedItems,
        },
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
