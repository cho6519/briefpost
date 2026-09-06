import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { marked } from "marked";
import AdSlot from "@/components/ads/AdSlot";
import { getArticleBySlug, getAllArticleSlugs } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

const siteUrl = getSiteUrl();

/**
 * 사전 렌더링용 Static Params 생성
 */
export async function generateStaticParams() {
  const articles = getAllArticleSlugs();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

/**
 * 본문 HTML을 문단 블록 단위로 50% 지점에서 분할하는 스마트 스플리터
 */
function splitContentInHalf(html: string): [string, string] {
  // 블록 요소 시작 태그 기준으로 분할
  const blockRegex = /(?=<p|<h[1-6]|<ul|<ol|<blockquote|<div)/gi;
  const blocks = html.split(blockRegex).filter((b) => b.trim().length > 0);

  if (blocks.length <= 1) {
    return [html, ""];
  }

  const midIndex = Math.ceil(blocks.length / 2);
  const firstHalf = blocks.slice(0, midIndex).join("");
  const secondHalf = blocks.slice(midIndex).join("");

  return [firstHalf, secondHalf];
}

/**
 * SEO 최적화 동적 메타데이터 생성
 */
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: "기사를 찾을 수 없습니다",
    };
  }

  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.summary || "";
  const canonicalUrl = `${siteUrl}/news/${article.slug}`;
  const imageUrl = article.thumbnailUrl || `${siteUrl}/favicon.ico`;

  return {
    title,
    description,
    keywords: [
      article.category,
      "AI 뉴스",
      "테크 브리프",
      "기술 뉴스레터",
      ...article.title.split(" ").slice(0, 4),
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Brief Post",
      locale: "ko_KR",
      type: "article",
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt || article.createdAt,
      section: article.category,
      authors: ["Brief Post 편집팀"],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // 마크다운 파싱 및 본문 50% 스마트 분할
  const fullHtml = marked.parse(article.content, { async: false }) as string;
  const [firstHalfHtml, secondHalfHtml] = splitContentInHalf(fullHtml);

  const formattedDate = new Date(article.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 구글 검색엔진용 NewsArticle & BlogPosting 복합 구조화 데이터 (Google Rich Results 완전 준수)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["NewsArticle", "BlogPosting"],
    headline: article.title,
    description: article.metaDescription || article.summary || article.title,
    image: article.thumbnailUrl ? [article.thumbnailUrl] : [`${siteUrl}/favicon.ico`],
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    articleSection: article.category,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/news/${article.slug}`,
    },
    author: [
      {
        "@type": "Organization",
        name: "Brief Post 편집팀",
        url: siteUrl,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "Brief Post",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.ico`,
      },
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "section p"],
    },
  };

  return (
    <article className="mx-auto max-w-2xl px-1 sm:px-0 space-y-6 sm:space-y-8">
      {/* 구조화 데이터 주입 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 상단 네비게이션 & 카테고리 태그 */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <span className="text-sm">←</span> 피드로 돌아가기
        </Link>
        <Link
          href={`/?category=${encodeURIComponent(article.category)}`}
          className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 hover:bg-blue-100 transition-colors"
        >
          {article.category}
        </Link>
      </div>

      {/* 기사 헤더 (H1 제목, 작성일, 출처 링크) */}
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.3] sm:leading-[1.25]">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
          <time dateTime={article.createdAt} className="font-medium">
            발행: {formattedDate}
          </time>
          {article.sourceUrl && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                원문 보기 ↗
              </a>
            </>
          )}
        </div>
      </header>

      {/* 스티치(Stitch) 시그니처 3줄 핵심 요약 Bento 글로우 박스 */}
      {article.summary && (
        <section className="glow-border inner-glow rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3 mb-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <span className="text-cyan-500 dark:text-cyan-400 text-sm">⚡</span>
              <span>3줄 핵심 요약</span>
            </div>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
              EXECUTIVE BRIEF
            </span>
          </div>
          <ul className="space-y-3">
            {article.summary
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, pIdx) => (
                <li key={pIdx} className="flex items-start gap-3 text-sm sm:text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mt-0.5">
                    {pIdx + 1}
                  </span>
                  <span>{line.replace(/^[0-9]+[.)]\s*/, "").replace(/^[-*•]\s*/, "")}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 썸네일 이미지 */}
      {article.thumbnailUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Image
            src={article.thumbnailUrl}
            alt={article.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 680px"
            className="object-cover"
          />
        </div>
      )}

      {/* [광고 슬롯 1] 본문 시작 직전 (상단 슬롯) - 신단수 자체 배너 또는 구글 애드센스 */}
      <AdSlot
        slotId="top-in-article"
        bannerId="shindansu"
        format="horizontal"
        label="SPONSORED (상단)"
        className="my-6"
      />

      {/* 본문 텍스트 영역 (가독성 높은 폰트와 행간 적용) */}
      <div className="text-[17px] sm:text-[18px] leading-[1.85] text-zinc-800 dark:text-zinc-200 tracking-[-0.01em]">
        {/* 본문 전반부 (50% 이전) */}
        <div
          className="space-y-5 [&>h2]:text-xl sm:[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-zinc-900 dark:[&>h2]:text-zinc-50 [&>h2]:pt-4 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:pt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2"
          dangerouslySetInnerHTML={{ __html: firstHalfHtml }}
        />

        {/* [광고 슬롯 2] 본문 50% 지점 (인필드 슬롯) - KECEL 자체 배너 또는 구글 애드센스 */}
        <AdSlot
          slotId="mid-in-article"
          bannerId="kecel"
          format="fluid"
          label="SPONSORED (인피드)"
          className="my-8"
        />

        {/* 본문 후반부 (50% 이후) */}
        {secondHalfHtml && (
          <div
            className="space-y-5 [&>h2]:text-xl sm:[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-zinc-900 dark:[&>h2]:text-zinc-50 [&>h2]:pt-4 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:pt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2"
            dangerouslySetInnerHTML={{ __html: secondHalfHtml }}
          />
        )}
      </div>

      {/* 원문 출처 및 면책 안내 박스 */}
      {article.sourceUrl && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">출처 안내: </span>
          본 기사는 다음 원문 보도를 바탕으로 요약 및 재구성되었습니다:{" "}
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
          >
            {article.sourceUrl}
          </a>
        </div>
      )}

      {/* [광고 슬롯 3] 본문 끝/댓글 직전 (하단 슬롯) - 신단수 자체 배너 또는 구글 애드센스 */}
      <AdSlot
        slotId="bottom-in-article"
        bannerId="shindansu"
        format="rectangle"
        label="SPONSORED (하단)"
        className="my-8"
      />

      {/* 댓글 영역 (하단 슬롯 바로 뒤) */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            의견 남기기
          </h3>
          <span className="text-xs text-zinc-500">클린 뉴스레터 커뮤니티</span>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center bg-zinc-50/50 dark:bg-zinc-900/30">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
            이 기사에 대한 의견을 자유롭게 나눠보세요.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="댓글을 작성해 주세요..."
              disabled
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs text-zinc-500 focus:outline-none"
            />
            <button
              disabled
              className="rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-xs font-bold opacity-60 cursor-not-allowed"
            >
              등록
            </button>
          </div>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-500 mt-2 block">
            현재 댓글 기능은 준비 중입니다.
          </span>
        </div>
      </section>
    </article>
  );
}
