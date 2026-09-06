import Link from "next/link";
import Image from "next/image";
import AdSlot from "@/components/ads/AdSlot";
import { getArticles, seedArticlesIfNeeded } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

  return (
    <div className="mx-auto max-w-2xl px-1 sm:px-0 space-y-6 sm:space-y-8">
      {/* 구글 검색엔진용 WebSite 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* 상단 배너 슬롯 (신단수 / KECEL 또는 구글 애드센스) */}
      <AdSlot
        bannerId="shindansu"
        format="horizontal"
        label="SPONSORED (추천)"
        className="my-4 sm:my-6"
      />

      {/* 카테고리 필터 안내 바 */}
      {category && (
        <div className="flex items-center justify-between rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 px-4 py-3 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              #{category}
            </span>
            <span className="text-xs text-zinc-500">기사 {total}건</span>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2"
          >
            전체 보기
          </Link>
        </div>
      )}

      {/* 기사 피드 리스트 (모바일 최적화 1단 카드 뷰) */}
      <section className="space-y-6 sm:space-y-7">
        {articles.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
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

            return (
              <div key={article.id}>
                <article className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
                  <div className="flex flex-col gap-3.5">
                    {/* 상단 메타: 카테고리 & 날짜 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 font-bold text-[11px] text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40">
                        {article.category}
                      </span>
                      <time dateTime={article.createdAt} className="text-zinc-600 dark:text-zinc-500 text-[11px]">
                        {formattedDate}
                      </time>
                    </div>

                    {/* 기사 썸네일 (존재할 경우 상단 컴팩트 뷰) */}
                    {article.thumbnailUrl && (
                      <Link
                        href={`/news/${article.slug}`}
                        className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        <Image
                          src={article.thumbnailUrl}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 680px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </Link>
                    )}

                    {/* 기사 제목 */}
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <Link href={`/news/${article.slug}`} className="focus:outline-none">
                        {article.title}
                      </Link>
                    </h2>

                    {/* 3줄 핵심 요약 박스 (모바일 터치 스크롤 중 한눈에 핵심 파악) */}
                    {article.summary && (
                      <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 p-3.5 text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                          <span>⚡ 3줄 핵심 요약</span>
                        </div>
                        <p className="whitespace-pre-line text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 leading-normal line-clamp-3">
                          {article.summary}
                        </p>
                      </div>
                    )}

                    {/* 하단 액션: 원문 출처 표기 및 기사 읽기 버튼 */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      {article.sourceUrl ? (
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-500 font-medium">
                          출처 정보 포함
                        </span>
                      ) : (
                        <span />
                      )}

                      <Link
                        href={`/news/${article.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                      >
                        전문 보기 <span className="text-sm">→</span>
                      </Link>
                    </div>
                  </div>
                </article>

                {/* 2번째 기사 뒤에 자연스럽게 인피드 광고 슬롯(KECEL) 삽입 */}
                {index === 1 && (
                  <AdSlot
                    bannerId="kecel"
                    format="fluid"
                    label="SPONSORED (추천)"
                    className="my-6"
                  />
                )}
              </div>
            );
          })
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200/80 dark:border-zinc-800/80 pt-6">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
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
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            >
              다음 페이지 →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* 목록 하단 광고 슬롯 (신단수) */}
      <AdSlot
        bannerId="shindansu"
        format="rectangle"
        label="SPONSORED (추천)"
        className="my-6 sm:my-8"
      />
    </div>
  );
}
