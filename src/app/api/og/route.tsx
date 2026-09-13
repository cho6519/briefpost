import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getArticleBySlug } from "@/lib/articles";
import { extractCardBadge } from "@/lib/cardBadgeExtractor";
import { generateCardCatchphrase } from "@/lib/catchphraseExtractor";

export const runtime = "nodejs";

// Pretendard 볼드 폰트 캐싱용 변수 (0ms 오프라인 로드)
let fontBuffer: ArrayBuffer | null = null;

async function getPretendardFont(): Promise<ArrayBuffer> {
  if (fontBuffer) return fontBuffer;
  try {
    const fontPath = join(process.cwd(), "public", "fonts", "Pretendard-Bold.otf");
    const buffer = await readFile(fontPath);
    fontBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return fontBuffer;
  } catch (error) {
    console.error("[OG Font Error] 로컬 폰트 로드 실패:", error);
    // 긴급 폴백: 빈 ArrayBuffer 반환 시 시스템 기본 글꼴로 대체
    return new ArrayBuffer(0);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const queryTitle = searchParams.get("title");
    const queryCategory = searchParams.get("category");
    const queryHighlight = searchParams.get("highlight") || searchParams.get("badge");

    let title = queryTitle || "";
    let category = queryCategory || "정책·지원금";
    let content = "";
    let highlightBadge = queryHighlight || "";

    // 1. Slug가 주어진 경우 DB에서 기사 정보 조회 (소급 연동)
    if (slug) {
      const article = getArticleBySlug(slug);
      if (article) {
        title = article.title;
        category = article.category;
        content = article.content || "";
        highlightBadge = article.highlightBadge || "";
      }
    }

    // 기본 제목 폴백 및 절삭 기호(...) 완벽 정제
    if (!title) {
      title = "Brief Post - 핵심만 빠르게 전달하는 공공·경제 브리핑";
    }

    // 제목 앞뒤 따옴표 및 불완전한 말줄임표/절삭 꼬리 제거 (예: '…최대 70...', '...최대 70')
    title = title
      .replace(/^[“"']+|[”"']+$/g, "")
      .replace(/\.{2,}[^\n]*$/g, "")
      .replace(/…\s*[0-9가-힣\s]{1,10}\.{2,}$/g, "")
      .replace(/[.…:\-\s]+$/, "")
      .trim();

    if (title.includes("일반경영안정자금") && title.includes("최대 70")) {
      title = "소상공인시장진흥공단 2026 일반경영안정자금 접수 개시 (최대 7,000만 원)";
    }

    // 2. 카드뉴스 전용 키워드 타이틀 및 서브 캐치프레이즈 생성 (상세 페이지 h1과의 중복 제거)
    const catchphraseData = generateCardCatchphrase(title, category);
    const cardMainTitle = searchParams.get("keyword") || catchphraseData.keywordTitle;
    const cardSubCatchphrase = searchParams.get("catchphrase") || catchphraseData.subCatchphrase;

    // 3. 인포그래픽 하이라이트 배지 추출
    const badgeInfo = extractCardBadge(title, content, category, highlightBadge);
    const displayBadge = highlightBadge || badgeInfo.badgeText;
    const displaySub = badgeInfo.subText || "신속하고 정확한 1단 핵심 요약 브리핑";

    // 4. 카테고리별 테마 및 오로라 방사형 조명 포인트 색상 설정
    let categoryBg = "rgba(37, 99, 235, 0.25)";
    let categoryBorder = "#3b82f6";
    let categoryColor = "#93c5fd";
    let glowColorTop = "rgba(59, 130, 246, 0.35)"; // 우측 상단 블루 글로우
    let glowColorBottom = "rgba(16, 185, 129, 0.25)"; // 좌측 하단 에메랄드 포인트
    let topBarGradient = "linear-gradient(90deg, #2563eb 0%, #38bdf8 50%, #10b981 100%)";
    let watermarkText = "POLICY";

    if (category.includes("소상공인") || category.includes("지원금") || category.includes("정책")) {
      categoryBg = "rgba(16, 185, 129, 0.25)";
      categoryBorder = "#10b981";
      categoryColor = "#6ee7b7";
      glowColorTop = "rgba(59, 130, 246, 0.35)";
      glowColorBottom = "rgba(16, 185, 129, 0.28)";
      topBarGradient = "linear-gradient(90deg, #2563eb 0%, #38bdf8 50%, #10b981 100%)";
      watermarkText = "POLICY";
    } else if (category.includes("금융") || category.includes("경제")) {
      categoryBg = "rgba(245, 158, 11, 0.25)";
      categoryBorder = "#f59e0b";
      categoryColor = "#fcd34d";
      glowColorTop = "rgba(245, 158, 11, 0.32)";
      glowColorBottom = "rgba(59, 130, 246, 0.25)";
      topBarGradient = "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #3b82f6 100%)";
      watermarkText = "FINANCE";
    } else if (category.includes("부동산") || category.includes("세제")) {
      categoryBg = "rgba(139, 92, 246, 0.25)";
      categoryBorder = "#8b5cf6";
      categoryColor = "#c4b5fd";
      glowColorTop = "rgba(139, 92, 246, 0.32)";
      glowColorBottom = "rgba(236, 72, 153, 0.22)";
      topBarGradient = "linear-gradient(90deg, #8b5cf6 0%, #c084fc 50%, #ec4899 100%)";
      watermarkText = "REALTY";
    } else if (category.includes("테크") || category.includes("IT")) {
      categoryBg = "rgba(14, 165, 233, 0.25)";
      categoryBorder = "#0ea5e9";
      categoryColor = "#7dd3fc";
      glowColorTop = "rgba(14, 165, 233, 0.35)";
      glowColorBottom = "rgba(99, 102, 241, 0.25)";
      topBarGradient = "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #6366f1 100%)";
      watermarkText = "TECH·AI";
    } else if (category.includes("사회") || category.includes("문화")) {
      categoryBg = "rgba(99, 102, 241, 0.25)";
      categoryBorder = "#6366f1";
      categoryColor = "#a5b4fc";
      glowColorTop = "rgba(99, 102, 241, 0.32)";
      glowColorBottom = "rgba(16, 185, 129, 0.22)";
      topBarGradient = "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #10b981 100%)";
      watermarkText = "SOCIETY";
    } else {
      watermarkText = "BRIEF";
    }

    // 5. 모바일 화면 최적화 타이포그래피 폰트 크기 계산 (최소 48px 이상 보장)
    const titleLength = cardMainTitle.length;
    let titleFontSize = 58; // 짧은 키워드 타이틀(20자 이하)
    if (titleLength > 30) {
      titleFontSize = 48; // 다소 긴 헤드라인(31자 이상): 최소 48px 엄격 보장
    } else if (titleLength > 20) {
      titleFontSize = 54; // 중간 헤드라인(21~30자)
    }

    // 5. 폰트 로드
    const fontData = await getPretendardFont();
    const fontsOption =
      fontData.byteLength > 0
        ? [
            {
              name: "Pretendard",
              data: fontData,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : undefined;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(145deg, #020617 0%, #070e1b 40%, #0d1a2d 75%, #020617 100%)",
            padding: "46px 56px",
            fontFamily: "Pretendard, sans-serif",
            position: "relative",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* 1. 상단 다이내믹 컬러 바 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background: topBarGradient,
            }}
          />

          {/* 2. 오로라 방사형 조명 효과 (우측 상단 35% 글로우 + 좌측 하단 25% 포인트) */}
          <div
            style={{
              position: "absolute",
              top: "-140px",
              right: "-100px",
              width: "680px",
              height: "680px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glowColorTop} 0%, rgba(59, 130, 246, 0.08) 50%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-160px",
              left: "-80px",
              width: "640px",
              height: "640px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glowColorBottom} 0%, rgba(16, 185, 129, 0.06) 50%, transparent 70%)`,
            }}
          />

          {/* 3. 미세 마이크로 그리드(Grid Pattern) 오버레이 (3.5% 투명도 엔지니어링 리포트 텍스처) */}
          <svg
            width="1200"
            height="630"
            viewBox="0 0 1200 630"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0.035,
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * 42}
                x2="1200"
                y2={i * 42}
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 29 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 42}
                y1="0"
                x2={i * 42}
                y2="630"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
          </svg>

          {/* 4. 배경 거대 영문 카테고리 워터마크 실루엣 (opacity: 0.035) */}
          <div
            style={{
              position: "absolute",
              right: "-15px",
              bottom: "45px",
              fontSize: "175px",
              fontWeight: 900,
              letterSpacing: "-2px",
              color: "#ffffff",
              opacity: 0.035,
              userSelect: "none",
              lineHeight: 1,
              zIndex: 1,
            }}
          >
            {watermarkText}
          </div>

          {/* [1. 상단 헤더 영역] 카테고리 뱃지 & Brief Post 브랜드 로고 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              zIndex: 10,
            }}
          >
            {/* 카테고리 뱃지 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 20px",
                borderRadius: "30px",
                backgroundColor: categoryBg,
                border: `1.5px solid ${categoryBorder}`,
                color: categoryColor,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}
            >
              <span style={{ marginRight: "8px", fontSize: "14px" }}>●</span>
              {category}
            </div>

            {/* Brief Post 공식 브랜드 로고 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "11px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "21px",
                  fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
                }}
              >
                B
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "22px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                  }}
                >
                  BRIEF POST
                </span>
                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                    marginTop: "-2px",
                  }}
                >
                  공공·경제 정책 전문 브리핑
                </span>
              </div>
            </div>
          </div>

          {/* [2. 중앙 메인 타이틀 영역 - 서브 캐치프레이즈 & 키워드 헤드라인 (h1과의 중복 제거)] */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              margin: "18px 0",
              zIndex: 10,
              maxWidth: "100%",
            }}
          >
            {/* 세련된 서브 캐치프레이즈 (예: 소상공인 정책자금 긴급 브리핑, 2026년 정부 지원 사업 안내) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: categoryColor,
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-0.4px",
                marginBottom: "12px",
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.7)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: categoryBg,
                  border: `1px solid ${categoryBorder}`,
                  marginRight: "10px",
                  fontSize: "15px",
                }}
              >
                ⚡
              </span>
              {cardSubCatchphrase}
            </div>

            {/* 카드 중앙 메인 키워드 타이틀 (전체 제목 대신 15~26자의 핵심 키워드 헤드라인) */}
            <h1
              style={{
                color: "#ffffff",
                fontSize: `${titleFontSize}px`,
                fontWeight: 800,
                lineHeight: 1.28,
                letterSpacing: "-1px",
                margin: 0,
                padding: 0,
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 4px 24px rgba(0, 0, 0, 0.85)",
              }}
            >
              {cardMainTitle}
            </h1>
          </div>

          {/* [3. 하단 인포그래픽 하이라이트 박스 및 도메인 워터마크 - 모바일 시인성 강화] */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              zIndex: 10,
            }}
          >
            {/* 인포그래픽 하이라이트 박스 (모바일 축소 시에도 선명하게 보이도록 볼륨 및 폰트 사이즈 상향) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 28px",
                borderRadius: "18px",
                backgroundColor: badgeInfo.isSubsidy
                  ? "rgba(6, 78, 59, 0.65)"
                  : "rgba(30, 58, 138, 0.55)",
                border: badgeInfo.isSubsidy
                  ? "2px solid rgba(16, 185, 129, 0.75)"
                  : "2px solid rgba(59, 130, 246, 0.65)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                maxWidth: "76%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: badgeInfo.isSubsidy ? "#34d399" : "#60a5fa",
                  fontSize: "26px",
                  fontWeight: 700,
                  letterSpacing: "-0.4px",
                }}
              >
                {displayBadge}
              </div>
              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "16px",
                  fontWeight: 500,
                  marginTop: "6px",
                  letterSpacing: "-0.2px",
                }}
              >
                {displaySub}
              </div>
            </div>

            {/* 도메인 워터마크 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                OFFICIAL BRIEFING
              </span>
              <span
                style={{
                  color: "#38bdf8",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "0.2px",
                  marginTop: "2px",
                }}
              >
                briefpost.kr
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontsOption,
        headers: {
          "Cache-Control":
            process.env.NODE_ENV === "development"
              ? "no-cache, no-store, must-revalidate"
              : "public, max-age=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[OG Image Generation Error]:", errMessage);
    return new Response(`OG Image generation failed: ${errMessage}`, {
      status: 500,
    });
  }
}
