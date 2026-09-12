import React from "react";
import { ArticleFaqItem } from "@/lib/ai";

interface FAQSectionProps {
  faqItems: ArticleFaqItem[];
}

/**
 * 독자 궁금증 해결 FAQ 섹션 컴포넌트
 * - 구글 애드센스 체류 시간 증대 및 schema.org/FAQPage 스키마 시각화
 * - 깔끔한 Q&A 카드 스타일로 독자의 의문점을 신속하게 해소
 */
export default function FAQSection({ faqItems }: FAQSectionProps) {
  if (!faqItems || faqItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="자주 묻는 질문 FAQ"
      className="my-10 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3.5 mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-black">
            ?
          </span>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            독자가 가장 많이 묻는 핵심 질문 (FAQ)
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-zinc-400">
          Q&A 가이드
        </span>
      </div>

      <div className="space-y-4">
        {faqItems.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 sm:p-5 transition-colors hover:bg-zinc-50"
          >
            {/* 질문 */}
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white text-[11px] font-extrabold mt-0.5 shadow-2xs">
                Q
              </span>
              <h4 className="text-[15px] sm:text-base font-bold text-zinc-900 leading-snug">
                {item.question}
              </h4>
            </div>

            {/* 답변 */}
            <div className="mt-2.5 flex items-start gap-2.5 pl-0 sm:pl-7">
              <span className="hidden sm:inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white text-[11px] font-extrabold mt-0.5 shadow-2xs">
                A
              </span>
              <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-700 font-normal">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
