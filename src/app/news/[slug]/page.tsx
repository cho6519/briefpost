import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AdUnit from "@/components/ads/AdUnit";
import OfficialCtaCard from "@/components/article/OfficialCtaCard";
import FAQSection from "@/components/article/FAQSection";
import RelatedArticles from "@/components/article/RelatedArticles";
import MarkdownRenderer from "@/components/article/MarkdownRenderer";
import { getArticleBySlug, getAllArticleSlugs, getRelatedArticles } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";
import { getSourceDisplayName } from "@/lib/sourceHelper";
import { normalizeArticleContent } from "@/lib/articleValidator";
import { ArticleFaqItem, determineCtaType } from "@/lib/ai";
import { getStockImage } from "@/utils/imageMapper";

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
 * 본문 마크다운을 4단계 H2 섹션 및 애드센스 슬롯 위치에 맞게 스마트 3단 분할
 * - Part 1: 도입부 및 1번, 2번 H2 섹션
 *   -> [광고 슬롯 ② 배치: 문맥 매칭 인피드 위치]
 * - Part 2: 3번 H2 섹션 (세부 혜택 및 수치 비교)
 *   -> [광고 슬롯 ③ 배치: 공식 신청 가이드 바로 위]
 * - Part 3: 4번 H2 섹션 (신청 방법 및 공식 안내)
 */
function splitMarkdownForAdSense(markdown: string): {
  part1: string;
  part2: string;
  part3: string;
} {
  const sections = markdown.split(/(?=\n##\s+)/);
  if (sections.length >= 4) {
    return {
      part1: sections.slice(0, 2).join("\n"),
      part2: sections.slice(2, 3).join("\n"),
      part3: sections.slice(3).join("\n"),
    };
  }
  if (sections.length === 3) {
    return {
      part1: sections[0],
      part2: sections[1],
      part3: sections[2],
    };
  }
  return { part1: markdown, part2: "", part3: "" };
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
  const stockImage = getStockImage(article.imageTheme, article.title, article.category, article.content);
  const imageUrl = (article.thumbnailUrl && article.thumbnailUrl.includes("unsplash.com"))
    ? article.thumbnailUrl
    : stockImage.url;

  return {
    title,
    description,
    keywords: [
      article.category,
      "정책 브리핑",
      "지원금 안내",
      "정부 혜택",
      "경제 뉴스",
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

  // 마크다운 구조 무결성 보정
  const cleanMarkdown = normalizeArticleContent(article.content);

  // 애드센스 문맥 매칭 슬롯에 맞춘 본문 3단 분할
  const { part1: mdPart1, part2: mdPart2, part3: mdPart3 } = splitMarkdownForAdSense(cleanMarkdown);

  // 애드센스 광고 활성화 여부 (심사용 클린 모드: NEXT_PUBLIC_ENABLE_ADS === 'true'일 때만 활성화)
  const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";

  // FAQ 구조화 데이터 파싱
  let faqList: ArticleFaqItem[] = [];
  if (article.faq) {
    try {
      const parsed = JSON.parse(article.faq);
      if (Array.isArray(parsed)) {
        faqList = parsed;
      }
    } catch {
      // 무시
    }
  }

  // 관련 기사 3선 조회
  const relatedArticles = getRelatedArticles(article.slug, article.category, 3);

  const formattedDate = new Date(article.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 한국형 일상·공공 테마 검증된 Unsplash 실사 스톡 이미지 풀 매핑
  const stockImage = getStockImage(article.imageTheme, article.title, article.category, article.content);
  const featuredImage = {
    url: (article.thumbnailUrl && article.thumbnailUrl.includes("unsplash.com"))
      ? article.thumbnailUrl
      : stockImage.url,
    caption: stockImage.caption || "사진: Unsplash / 공공 포털 참고",
  };

  // 1. 기사 표준 구조화 데이터 (NewsArticle & BlogPosting)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["NewsArticle", "BlogPosting"],
    headline: article.title,
    description: article.metaDescription || article.summary || article.title,
    image: [featuredImage.url],
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

  // 2. 구글 schema.org/FAQPage 구조화 데이터
  const faqJsonLd =
    faqList.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqList.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  const sourceName = getSourceDisplayName(article.sourceUrl, article.title, article.category);

  return (
    <article className="mx-auto max-w-2xl px-1 sm:px-0 space-y-6 sm:space-y-8">
      {/* 구조화 데이터 주입 (기사 스키마 & 구글 FAQPage 스키마) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* 상단 네비게이션 & 카테고리 태그 */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
        >
          <span className="text-sm">←</span> 피드로 돌아가기
        </Link>
        <Link
          href={`/?category=${encodeURIComponent(article.category)}`}
          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition-colors"
        >
          {article.category}
        </Link>
      </div>

      {/* 기사 헤더 (H1 제목, 작성일, 출처 링크) */}
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-[22px] sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 leading-[1.35] sm:leading-[1.25]">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-[13px] text-zinc-500 border-b border-zinc-200 pb-4">
          <time dateTime={article.createdAt} className="font-medium">
            발행: {formattedDate}
          </time>
          {article.sourceUrl && (
            <>
              <span className="text-zinc-300">•</span>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-semibold"
              >
                출처: {sourceName} ↗
              </a>
            </>
          )}
        </div>
      </header>

      {/* [광고 슬롯 ①] 기사 메인 타이틀(h1) 바로 아래 (심사용 클린 모드: isAdsEnabled === true 일 때만 노출) */}
      {isAdsEnabled && (
        <AdUnit
          slotId="ad-top-headline"
          format="horizontal"
          label="광고 영역 (AdSense Slot ① - 상단)"
          className="my-4"
        />
      )}

      {/* 상단 대표 실사 썸네일 (한국형 일상·공공 테마 검증된 Unsplash 실사 풀) */}
      <div className="w-full mb-6">
        <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-xl shadow-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800">
          <Image
            src={featuredImage.url}
            alt={article.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 680px"
            className="w-full h-64 md:h-80 object-cover rounded-xl"
          />
        </div>
        <p className="mt-2 text-right text-xs text-zinc-400 dark:text-zinc-500 tracking-tight font-normal">
          {featuredImage.caption}
        </p>
      </div>

      {/* 가독성 특화: 3줄 핵심 요약 블루 틴트 박스 */}
      {article.summary && (
        <section className="summary-box rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-blue-200/70 pb-3 mb-3.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-900">
              <span className="text-blue-600 text-sm">⚡</span>
              <span>3줄 핵심 요약</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-blue-700 uppercase bg-blue-100/80 px-2.5 py-0.5 rounded-full">
              EXECUTIVE BRIEF
            </span>
          </div>
          <ul className="space-y-3">
            {article.summary
              .split(/(?:^|\n|\s+)(?:[1-3][.)\-]\s+|[•\-*]\s+)/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) =>
                line
                  .replace(/^[0-9]+[.)]\s*/, "")
                  .replace(/^[-*•]\s*/, "")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/<\/?[a-z][a-z0-9]*\b[^>]*$/gi, " ")
                  .replace(/https?:\/\/[^\s]+/g, " ")
                  .replace(/&nbsp;/g, " ")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\s+/g, " ")
                  .trim()
              )
              .filter((line) => line.length >= 5 && !line.includes("<") && !line.includes("http"))
              .map((cleanLine, pIdx) => (
                <li key={pIdx} className="flex items-start gap-3 text-[15px] sm:text-base leading-[1.75] text-zinc-800 font-medium">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs mt-0.5">
                    {pIdx + 1}
                  </span>
                  <span>{cleanLine}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 본문 텍스트 영역 (react-markdown + remark-gfm 기반 전문 미디어 표준 렌더러) */}
      <div className="article-content text-[16px] sm:text-[17px] leading-relaxed text-slate-700 dark:text-slate-300 font-normal tracking-[-0.01em] break-keep">
        {isAdsEnabled ? (
          <>
            {/* 본문 1단계: 도입부 및 1번, 2번 H2 섹션 (개요 및 자격 요건) */}
            <MarkdownRenderer content={mdPart1} />

            {/* [광고 슬롯 ②] 두 번째 <h2> 섹션과 세 번째 <h2> 섹션 사이 (심사용 클린 모드) */}
            <AdUnit
              slotId="ad-in-feed-mid"
              format="fluid"
              label="광고 영역 (AdSense Slot ② - 문맥 인피드)"
              className="my-8"
            />

            {/* 본문 2단계: 3번 H2 섹션 (세부 혜택 및 수치 비교) */}
            {mdPart2 && <MarkdownRenderer content={mdPart2} />}

            {/* [광고 슬롯 ③] 본문 최하단 '공식 신청 가이드' 바로 위 (심사용 클린 모드) */}
            <AdUnit
              slotId="ad-bottom-guide"
              format="rectangle"
              label="광고 영역 (AdSense Slot ③ - 하단 가이드 직전)"
              className="my-8"
            />

            {/* 본문 3단계: 4번 H2 섹션 (신청 방법 및 향후 일정) */}
            {mdPart3 && <MarkdownRenderer content={mdPart3} />}
          </>
        ) : (
          /* 광고 비활성화 심사 클린 모드: 분할 없이 온전한 본문 react-markdown 단일 렌더링 */
          <MarkdownRenderer content={cleanMarkdown} />
        )}
      </div>

      {/* 공식 신청 및 안내 바로가기 스마트 조건부 콜아웃 카드 (CTA) */}
      <OfficialCtaCard
        sourceUrl={article.sourceUrl}
        title={article.title}
        category={article.category}
        ctaType={article.ctaType || determineCtaType(article.category, article.title, article.content)}
      />

      {/* 독자 궁금증 해결 FAQ 섹션 (구글 FAQPage 스키마 연계) */}
      {faqList.length > 0 && <FAQSection faqItems={faqList} />}

      {/* 원문 출처 및 면책 안내 박스 */}
      {article.sourceUrl && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900">출처:</span>
            <span className="font-medium text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-md">
              {sourceName}
            </span>
          </div>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>원문 확인하기</span>
            <span className="text-xs">↗</span>
          </a>
        </div>
      )}

      {/* 하단 '관련 정책 및 추천 브리핑' 3선 카드 노출 (이탈률 방지 및 체류시간 극대화) */}
      <div className="pt-2 pb-6">
        <RelatedArticles
          articles={relatedArticles}
          currentCategory={article.category}
        />
      </div>
    </article>
  );
}

