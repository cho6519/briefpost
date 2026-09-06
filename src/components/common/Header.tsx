import Link from "next/link";
import { getAllCategories } from "@/lib/articles";
import CategoryNav from "./CategoryNav";

export default function Header() {
  const categories = getAllCategories();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/90 bg-white/95 backdrop-blur-md shadow-2xs transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* 상단 1단: 로고 & 사이트 타이틀 */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 pb-2">
          <Link href="/" className="group flex items-center gap-2.5 shrink-0">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-serif font-black text-base sm:text-lg shadow-sm shadow-blue-500/25 transition-transform group-hover:scale-105">
              B
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 group-hover:text-blue-600 transition-colors">
                  Brief Post
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-200/60">
                  AI BRIEF
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                1단 요약 뉴스레터
              </span>
            </div>
          </Link>
        </div>

        {/* 하단 2단: 제목 바로 아래에 배치되는 전폭 카테고리 메뉴바 */}
        <div className="border-t border-zinc-100/90 py-1.5 sm:py-2">
          <CategoryNav categories={categories} />
        </div>
      </div>
    </header>
  );
}
