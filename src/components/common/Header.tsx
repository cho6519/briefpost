import Link from "next/link";
import { getAllCategories } from "@/lib/articles";
import CategoryNav from "./CategoryNav";

export default function Header() {
  const categories = getAllCategories();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#09090b]/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <Link href="/" className="group flex items-center gap-3 shrink-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border border-zinc-700/60 shadow-md transition-transform group-hover:scale-105">
              <span className="font-serif font-black text-lg tracking-tighter text-white drop-shadow-sm">
                B
              </span>
              <div className="absolute inset-0 rounded-xl bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Brief Post
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  AI BRIEF
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                1단 요약 뉴스레터
              </span>
            </div>
          </Link>

          {/* Category Navigation with Active Pills */}
          <div className="flex items-center overflow-x-auto max-w-[60%] sm:max-w-none">
            <CategoryNav categories={categories} />
          </div>
        </div>
      </div>
    </header>
  );
}
