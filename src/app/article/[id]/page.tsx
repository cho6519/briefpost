import { permanentRedirect } from "next/navigation";
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

  // 비공개(DRAFT) 또는 미발행 글 외부 접속 시 404 방지 -> 메인 페이지('/')로 301/308 리디렉션
  if (!article || article.status === "DRAFT" || article.status !== "PUBLISHED") {
    permanentRedirect("/");
  }

  // 표준 기사 URL(/news/[slug])로 영구 리다이렉트
  permanentRedirect(`/news/${article.slug}`);
}
