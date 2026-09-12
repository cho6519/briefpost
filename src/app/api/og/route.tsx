import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getArticleBySlug } from "@/lib/articles";
import { extractCardBadge } from "@/lib/cardBadgeExtractor";

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

    // 2. 인포그래픽 하이라이트 배지 추출
    const badgeInfo = extractCardBadge(title, content, category, highlightBadge);
    const displayBadge = highlightBadge || badgeInfo.badgeText;
    const displaySub = badgeInfo.subText || "신속하고 정확한 1단 핵심 요약 브리핑";

    // 3. 카테고리별 테마 색상 설정
    let categoryBg = "rgba(37, 99, 235, 0.25)";
    let categoryBorder = "#3b82f6";
    let categoryColor = "#93c5fd";

    if (category.includes("소상공인") || category.includes("지원금")) {
      categoryBg = "rgba(16, 185, 129, 0.25)";
      categoryBorder = "#10b981";
      categoryColor = "#6ee7b7";
    } else if (category.includes("금융") || category.includes("경제")) {
      categoryBg = "rgba(245, 158, 11, 0.25)";
      categoryBorder = "#f59e0b";
      categoryColor = "#fcd34d";
    } else if (category.includes("부동산") || category.includes("세제")) {
      categoryBg = "rgba(139, 92, 246, 0.25)";
      categoryBorder = "#8b5cf6";
      categoryColor = "#c4b5fd";
    } else if (category.includes("테크") || category.includes("IT")) {
      categoryBg = "rgba(14, 165, 233, 0.25)";
      categoryBorder = "#0ea5e9";
      categoryColor = "#7dd3fc";
    }

    // 4. 제목 길이에 따른 폰트 크기 계산 (최적 줄바꿈 및 가독성)
    const titleLength = title.length;
    let titleFontSize = 48;
    if (titleLength > 46) {
      titleFontSize = 39;
    } else if (titleLength > 34) {
      titleFontSize = 44;
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
            background: "linear-gradient(135deg, #070c14 0%, #0d1a2d 45%, #15253d 80%, #0a111e 100%)",
            padding: "52px 64px",
            fontFamily: "Pretendard, sans-serif",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {/* 상단 액센트 글로우 바 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background: "linear-gradient(90deg, #2563eb 0%, #38bdf8 50%, #10b981 100%)",
            }}
          />

          {/* 배경 미세 글로우 오브 */}
          <div
            style={{
              position: "absolute",
              top: "-120px",
              right: "-100px",
              width: "480px",
              height: "480px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(37, 99, 235, 0) 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-150px",
              left: "10%",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)",
            }}
          />

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
                padding: "8px 18px",
                borderRadius: "30px",
                backgroundColor: categoryBg,
                border: `1.5px solid ${categoryBorder}`,
                color: categoryColor,
                fontSize: "20px",
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
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "20px",
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

          {/* [2. 중앙 메인 타이틀 영역 - 카드뉴스 스타일 고가독성 타이포그래피] */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              margin: "24px 0",
              zIndex: 10,
              maxWidth: "100%",
            }}
          >
            <h1
              style={{
                color: "#ffffff",
                fontSize: `${titleFontSize}px`,
                fontWeight: 700,
                lineHeight: 1.34,
                letterSpacing: "-0.6px",
                margin: 0,
                padding: 0,
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 4px 16px rgba(0, 0, 0, 0.6)",
              }}
            >
              {title}
            </h1>
          </div>

          {/* [3. 하단 인포그래픽 하이라이트 박스 및 도메인 워터마크] */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              zIndex: 10,
            }}
          >
            {/* 인포그래픽 하이라이트 박스 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 24px",
                borderRadius: "16px",
                backgroundColor: badgeInfo.isSubsidy
                  ? "rgba(6, 78, 59, 0.55)"
                  : "rgba(30, 58, 138, 0.45)",
                border: badgeInfo.isSubsidy
                  ? "1.5px solid rgba(16, 185, 129, 0.6)"
                  : "1.5px solid rgba(59, 130, 246, 0.5)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                maxWidth: "75%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: badgeInfo.isSubsidy ? "#34d399" : "#60a5fa",
                  fontSize: "21px",
                  fontWeight: 700,
                  letterSpacing: "-0.4px",
                }}
              >
                {displayBadge}
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "14px",
                  fontWeight: 500,
                  marginTop: "4px",
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
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                OFFICIAL BRIEFING
              </span>
              <span
                style={{
                  color: "#38bdf8",
                  fontSize: "18px",
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
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
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
