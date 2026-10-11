import { redirect, notFound } from "next/navigation";
import { getArticleByIdAsync, getArticleBySlugAsync } from "@/lib/articles";

interface ArticleIdProps {
  params: Promise<{ id: string }>;
}

export default async function ArticleIdRedirectPage({ params }: ArticleIdProps) {
  const { id } = await params;
  
  // 1. 숫자 ID로 조회 시도 (Neon / SQLite 듀얼 호환)
  let article = await getArticleByIdAsync(id);
  
  // 2. Slug로 조회 시도 (id 파라미터가 slug 형태로 전달된 경우 대응)
  if (!article) {
    article = await getArticleBySlugAsync(id);
  }

  if (!article) {
    notFound();
  }

  // 표준 기사 URL(/news/[slug])로 영구 리다이렉트
  redirect(`/news/${article.slug}`);
}
