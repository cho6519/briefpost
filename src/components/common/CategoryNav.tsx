"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface CategoryNavProps {
  categories: string[];
}

function CategoryNavList({ categories }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");

  return (
    <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto scrollbar-none w-full py-0.5">
      <Link
        href="/"
        className={`whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-xs font-semibold transition-all duration-200 shrink-0 ${
          !currentCategory
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25"
            : "text-zinc-600 hover:text-blue-600 hover:bg-blue-50/70"
        }`}
      >
        전체
      </Link>
      {categories.map((category) => {
        const isActive = currentCategory === category;
        return (
          <Link
            key={category}
            href={`/?category=${encodeURIComponent(category)}`}
            className={`whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-xs font-semibold transition-all duration-200 shrink-0 ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25"
                : "text-zinc-600 hover:text-blue-600 hover:bg-blue-50/70"
            }`}
          >
            {category}
          </Link>
        );
      })}
    </nav>
  );
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  return (
    <Suspense
      fallback={
        <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto scrollbar-none w-full py-0.5">
          <span className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25">
            전체
          </span>
          {categories.map((cat) => (
            <span
              key={cat}
              className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-xs text-zinc-600"
            >
              {cat}
            </span>
          ))}
        </nav>
      }
    >
      <CategoryNavList categories={categories} />
    </Suspense>
  );
}
