import Link from "next/link";
import { getAllCategories } from "@/lib/articles";

export default function Header() {
  const categories = getAllCategories();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-black text-lg tracking-tighter shadow-sm">
              B
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Brief Post
              </span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                1단 요약 뉴스레터
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none max-w-[55%] sm:max-w-none">
            <Link
              href="/"
              className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              전체
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/?category=${encodeURIComponent(category)}`}
                className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                {category}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
