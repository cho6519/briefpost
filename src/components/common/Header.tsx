import Link from "next/link";
import { getAllCategories } from "@/lib/articles";
import CategoryNav from "./CategoryNav";

export default function Header() {
  const categories = getAllCategories();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <Link href="/" className="group flex items-center gap-3 shrink-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white font-serif font-black text-lg shadow-sm transition-transform group-hover:scale-105">
              B
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 group-hover:text-blue-600 transition-colors">
                  Brief Post
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-200/60">
                  AI BRIEF
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                1단 요약 뉴스레터
              </span>
            </div>
          </Link>

          {/* Category Navigation */}
          <div className="flex items-center overflow-x-auto max-w-[60%] sm:max-w-none">
            <CategoryNav categories={categories} />
          </div>
        </div>
      </div>
    </header>
  );
}
