"use client";

import { useMemo, useState } from "react";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

/**
 * 글 상단 목차(TOC: Table of Contents) 네비게이션
 * - 본문의 5단 핵심 소제목들을 추출하여 직관적인 네비게이션 카드 제공
 * - 원하는 항목으로 원클릭 스크롤 이동하여 사용자 탐색 경험 및 체류 만족도 증대
 */
export default function TableOfContents({ content }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // 본문 마크다운에서 ## 소제목 추출
  const tocItems: TocItem[] = useMemo(() => {
    if (!content) return [];

    const lines = content.split("\n");
    const items: TocItem[] = [];
    let sectionIdx = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        const rawTitle = trimmed.replace(/^##\s+/, "").trim();
        // 헤딩 텍스트 정제
        const cleanTitle = rawTitle.replace(/^[0-9]+[.)]\s*/, "").trim();
        if (cleanTitle && cleanTitle.length >= 2 && !cleanTitle.includes("<") && !cleanTitle.includes("http")) {
          items.push({
            id: `toc-heading-${sectionIdx}`,
            title: cleanTitle,
            level: 2,
          });
          sectionIdx++;
        }
      }
    }

    return items;
  }, [content]);

  if (tocItems.length < 2) return null;

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; // 헤더 높이 여백 고려
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="본문 목차"
      className="my-5 rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/60 via-slate-50/80 to-indigo-50/40 p-4 sm:p-5 shadow-xs transition-all"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-blue-200/60">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left group focus:outline-hidden"
          aria-expanded={isOpen}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-2xs group-hover:bg-blue-700 transition-colors">
            ☰
          </div>
          <span className="text-[15px] sm:text-[16px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            핵심 목차 한눈에 보기
          </span>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full ml-1">
            {tocItems.length}개 챕터
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
        >
          {isOpen ? "접기 ▲" : "펼치기 ▼"}
        </button>
      </div>

      {isOpen && (
        <ol className="mt-3.5 space-y-2 text-[14.5px] sm:text-[15px]">
          {tocItems.map((item, idx) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-700 border border-blue-200/80 text-[11px] font-bold shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => scrollToHeading(item.id)}
                className="text-left text-slate-700 font-medium hover:text-blue-700 hover:underline underline-offset-4 transition-colors leading-snug cursor-pointer"
              >
                {item.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
