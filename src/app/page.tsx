import Link from "next/link";
import Image from "next/image";
import AdSlot from "@/components/ads/AdSlot";
import { getArticles, seedArticlesIfNeeded } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";
import { getSourceDisplayName } from "@/lib/sourceHelper";
import { getStockImage } from "@/utils/imageMapper";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseSummaryPoints(summary?: string | null): string[] {
  if (!summary) return [];
  return summary
    .split(/(?:^|\n|\s+)(?:[1-3][.)\-]\s+|[•\-*]\s+)/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^[0-9]+[.)]\s*/, "")
        .replace(/^[-*•]\s*/, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/<\/?[a-z][a-z0-9]*\b[^>]*$/gi, " ")
        .replace(/https?:\/\/[^\s]+/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 5 && !line.includes("<") && !line.includes("http"));
}

function estimateReadingTime(content: string): string {
  const words = content.length;
  const minutes = Math.max(1, Math.ceil(words / 500));
  return `약 ${minutes}분 읽기`;
}

export default async function HomePage({ searchParams }: PageProps) {
  // 초기 실행 시 샘플 기사 데이터 시딩
  seedArticlesIfNeeded();

  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const category = typeof resolvedParams.category === "string" ? resolvedParams.category : undefined;

  const { articles, total, totalPages } = getArticles({
    page,
    limit: 6,
    category,
  });

  const siteUrl = getSiteUrl();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Brief Post",
    url: siteUrl,
    description: "정책, 경제, 테크 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터",
    publisher: {
      "@type": "Organization",
      name: "Brief Post",
      url: siteUrl,
    },
  };

  const breakingArticle = articles.length > 0 ? articles[0] : null;
  const isHeroPage = page === 1 && !category;

  return (
    <div className="mx-auto max-w-2xl px-1 sm:px-0 space-y-6 sm:space-y-8">
      {/* 구글 검색엔진용 WebSite 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      {/* 실시간 브레이킹 뉴스 캡슐 */}
      {breakingArticle && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-[11px] font-black tracking-wider uppercase text-rose-600">
              LIVE
            </span>
          </div>
          <span className="text-zinc-300 select-none">|</span>
          <Link
            href={`/news/${breakingArticle.slug}`}
            className="text-xs font-semibold text-zinc-800 hover:text-blue-600 transition-colors truncate"
          >
            {breakingArticle.title}
          </Link>
        </div>
      )}

      {/* 카테고리 필터 헤더 */}
      {category && (
        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 border border-zinc-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              #{category}
            </span>
            <span className="text-xs text-zinc-500">기사 {total}건</span>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
          >
            전체 보기
          </Link>
        </div>
      )}

      {/* 기사 피드 리스트 */}
      <section className="space-y-6 sm:space-y-7">
        {articles.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-300 bg-white">
            <p className="text-sm font-medium text-zinc-500">
              등록된 기사가 없습니다.
            </p>
          </div>
        ) : (
          articles.map((article, index) => {
            const formattedDate = new Date(article.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const readingTime = estimateReadingTime(article.content);
            const summaryPoints = parseSummaryPoints(article.summary);
            const isHero = isHeroPage && index === 0;
            const sourceName = getSourceDisplayName(article.sourceUrl, article.title, article.category);
            const cardStockImage = getStockImage(article.imageTheme, article.title, article.category, article.content);
            const cardImageUrl = (article.thumbnailUrl && article.thumbnailUrl.includes("unsplash.com"))
              ? article.thumbnailUrl
              : cardStockImage.url;

            // 1) 히어로 피처드 스토리 (메인 첫 페이지 1위 기사)
            if (isHero) {
              return (
                <div key={article.id} className="space-y-6">
                  <article className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-md">
                    <div className="flex flex-col gap-4">
                      {/* 기사 썸네일 (실사 스톡 이미지 풀 매핑) */}
                      <Link
                        href={`/news/${article.slug}`}
                        className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-100"
                      >
                        <Image
                          src={cardImageUrl}
                          alt={article.title}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 720px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      </Link>

                      {/* 상단 메타 바 */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/70">
                            {article.category}
                          </span>
                          <span className="text-[11px] font-medium text-zinc-500">
                            {readingTime}
                          </span>
                        </div>
                        <time dateTime={article.createdAt} className="text-zinc-500 text-[11px]">
                          {formattedDate}
                        </time>
                      </div>

                      {/* 헤드라인 */}
                      <h2 className="text-[20px] sm:text-2xl font-extrabold tracking-tight text-zinc-950 leading-snug group-hover:text-blue-600 transition-colors">
                        <Link href={`/news/${article.slug}`} className="focus:outline-none">
                          {article.title}
                        </Link>
                      </h2>

                      {/* 가독성 특화: 3줄 핵심 요약 블루 틴트 박스 */}
                      {summaryPoints.length > 0 && (
                        <div className="summary-box rounded-xl p-4 sm:p-5 shadow-2xs">
                          <div className="mb-3 flex items-center justify-between border-b border-blue-200/70 pb-2.5">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-900">
                              <span className="text-blue-600">⚡</span>
                              <span>3줄 핵심 요약</span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-blue-700 uppercase bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                              EXECUTIVE BRIEF
                            </span>
                          </div>
                          <ul className="space-y-3">
                            {summaryPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] leading-[1.65] text-zinc-800 font-medium">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs mt-0.5">
                                  {pIdx + 1}
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 하단 바 */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                        <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[240px]">
                          출처: {sourceName}
                        </span>

                        <Link
                          href={`/news/${article.slug}`}
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>전문 보기</span>
                          <span className="text-sm">→</span>
                        </Link>
                      </div>
                    </div>
                  </article>

                  {/* 네이티브 파트너 광고 */}
                  <AdSlot
                    bannerId="shindansu"
                    format="horizontal"
                    label="SPONSORED (추천)"
                    className="my-6"
                  />
                </div>
              );
            }

            // 2) 일반 에디토리얼 피드 카드
            return (
              <div key={article.id}>
                <article className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-zinc-300">
                  <div className="flex flex-col gap-3.5">
                    {/* 상단 메타 바 */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-[11px] text-zinc-700 border border-zinc-200/70">
                          {article.category}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium">
                          {readingTime}
                        </span>
                      </div>
                      <time dateTime={article.createdAt} className="text-zinc-500 text-[11px]">
                        {formattedDate}
                      </time>
                    </div>

                    {/* 컴팩트 썸네일 (실사 스톡 이미지 풀 매핑) */}
                    <Link
                      href={`/news/${article.slug}`}
                      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-100"
                    >
                      <Image
                        src={cardImageUrl}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 680px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </Link>

                    {/* 헤드라인 */}
                    <h2 className="text-[17px] sm:text-lg font-bold tracking-tight text-zinc-950 leading-snug group-hover:text-blue-600 transition-colors">
                      <Link href={`/news/${article.slug}`} className="focus:outline-none">
                        {article.title}
                      </Link>
                    </h2>

                    {/* 3줄 요약 목록 */}
                    {summaryPoints.length > 0 && (
                      <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3.5 sm:p-4 text-xs leading-relaxed text-zinc-800">
                        <ul className="space-y-2.5">
                          {summaryPoints.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] leading-[1.65] text-zinc-800 font-medium">
                              <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                              <span className="line-clamp-2">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 하단 액션 */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[200px]">
                        출처: {sourceName}
                      </span>

                      <Link
                        href={`/news/${article.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>전문 보기</span>
                        <span className="text-sm">→</span>
                      </Link>
                    </div>
                  </div>
                </article>

                {/* 피드 중간 광고 슬롯 (KECEL) */}
                {index === 2 && (
                  <AdSlot
                    bannerId="kecel"
                    format="fluid"
                    label="SPONSORED (추천)"
                    className="my-6 sm:my-7"
                  />
                )}
              </div>
            );
          })
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors shadow-2xs"
            >
              ← 이전 페이지
            </Link>
          ) : (
            <div />
          )}

          <span className="text-xs font-medium text-zinc-500">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors shadow-2xs"
            >
              다음 페이지 →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* 목록 하단 광고 슬롯 */}
      <AdSlot
        bannerId="shindansu"
        format="rectangle"
        label="SPONSORED (추천)"
        className="my-6 sm:my-8"
      />
    </div>
  );
}
