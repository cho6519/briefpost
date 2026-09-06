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
    <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none">
      <Link
        href="/"
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
          !currentCategory
            ? "bg-zinc-900 text-white shadow-sm font-semibold"
            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
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
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-zinc-900 text-white shadow-sm font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
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
        <nav className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white">
            전체
          </span>
          {categories.map((cat) => (
            <span
              key={cat}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-zinc-600"
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
