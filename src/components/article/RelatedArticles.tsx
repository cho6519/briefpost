import React from "react";
import Link from "next/link";
import { Article } from "@/lib/articles";

interface RelatedArticlesProps {
  articles: Article[];
  currentCategory: string;
}

/**
 * 하단 '관련 정책 및 추천 브리핑' 3선 카드 섹션
 * - 본문을 다 읽은 독자의 이탈 방지(Bounce Rate 감소) 및 추가 페이지뷰/체류 시간 유도
 */
export default function RelatedArticles({
  articles,
  currentCategory,
}: RelatedArticlesProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="관련 정책 및 추천 브리핑"
      className="border-t border-zinc-200 pt-8 mt-10"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-base">📌</span>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-950 tracking-tight">
              관련 정책 및 맞춤 브리핑 3선
            </h3>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            ‘{currentCategory}’ 분야에서 함께 읽으면 좋은 최신 핵심 기사입니다.
          </p>
        </div>

        <Link
          href={`/?category=${encodeURIComponent(currentCategory)}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
        >
          더보기 →
        </Link>
      </div>

      {/* 3선 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {articles.slice(0, 3).map((item) => {
          const itemDate = new Date(item.createdAt).toLocaleDateString("ko-KR", {
            month: "numeric",
            day: "numeric",
          });

          // 요약 첫 줄 추출
          const firstSummary =
            item.summary?.split("\n")[0]?.replace(/^[0-9]+[.)\-]\s*/, "") ||
            item.title;

          return (
            <Link
              key={item.id}
              href={`/news/${item.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-sm"
            >
              <div className="space-y-2">
                <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {item.category}
                </span>

                <h4 className="text-[14px] font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h4>

                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {firstSummary}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                <time dateTime={item.createdAt}>{itemDate}</time>
                <span className="font-semibold text-blue-600 group-hover:underline">
                  읽기 →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
