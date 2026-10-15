import { permanentRedirect } from "next/navigation";
import { getArticleBySlugAsync } from "@/lib/articles";

interface SlugProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacySlugRedirect({ params }: SlugProps) {
  const { slug: rawSlug } = await params;
  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug);
  } catch {}

  const article = (await getArticleBySlugAsync(decodedSlug)) || (await getArticleBySlugAsync(rawSlug));

  // 비공개(DRAFT) 또는 미발행 글 외부 접속 시 404 방지 -> 메인 페이지('/')로 301/308 리디렉션
  if (!article || article.status === "DRAFT" || article.status !== "PUBLISHED") {
    permanentRedirect("/");
  }

  permanentRedirect(`/news/${article.slug}`);
}
