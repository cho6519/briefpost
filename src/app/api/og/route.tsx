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
    let cardTitleFromDb = "";
    let category = queryCategory || "정책·지원금";
    let content = "";
    let highlightBadge = queryHighlight || "";

    // 1. Slug가 주어진 경우 DB에서 기사 정보 조회 (소급 연동)
    if (slug) {
      const article = getArticleBySlug(slug);
      if (article) {
        title = article.title;
        cardTitleFromDb = article.card_title || "";
        category = article.category;
        content = article.content || "";
        highlightBadge = article.highlightBadge || "";
      }
    }

    // 기본 제목 폴백 및 절삭 기호(...) 완벽 정제
    if (!title) {
      title = "Brief Post - 핵심만 빠르게 전달하는 공공·경제 브리핑";
    }

    // 제목 앞뒤 따옴표 및 불완전한 말줄임표/절삭 꼬리 제거
    title = title
      .replace(/^[“"']+|[”"']+$/g, "")
      .replace(/\.{2,}[^\n]*$/g, "")
      .replace(/…\s*[0-9가-힣\s]{1,10}\.{2,}$/g, "")
      .replace(/[.…:\-\s]+$/, "")
      .trim();

    if (title.includes("일반경영안정자금") && title.includes("최대 70")) {
      title = "소상공인시장진흥공단 2026 일반경영안정자금 접수 개시 (최대 7,000만 원)";
    }

    // 2. 카드뉴스 전용 헤드라인(card_title) 안전장치(Sanitizer) 강제 적용
    // 괄호, 대괄호 및 내부 텍스트 완전 제거, 특수문자 정리, 최대 16자 제한
    const catchphraseData = generateCardCatchphrase(title, category);
    const queryCardTitle = searchParams.get("card_title") || searchParams.get("keyword");
    const rawCardTitle = queryCardTitle || cardTitleFromDb || title;

    let cleanTitle = (rawCardTitle || "")
      .replace(/[\(\[\{【<].*?[\)\]\}】>]/g, "")
      .replace(/\b202[0-9]년?\b/g, "")
      .replace(/[^\w\sㄱ-ㅎ가-힣]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16)
      .trim();

    if (!cleanTitle || cleanTitle.length < 4) {
      cleanTitle = (title || "")
        .replace(/[\(\[\{【<].*?[\)\]\}】>]/g, "")
        .replace(/[^\w\sㄱ-ㅎ가-힣]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 16)
        .trim();
    }

    const cardMainTitle = cleanTitle;
    const cardSubCatchphrase = searchParams.get("catchphrase") || catchphraseData.subCatchphrase;

    // 3. 인포그래픽 하이라이트 배지 추출
    const badgeInfo = extractCardBadge(title, content, category, highlightBadge);
    const displayBadge = highlightBadge || badgeInfo.badgeText;
    const displaySub = badgeInfo.subText || "신속하고 정확한 공공.경제 정책 전문 브리핑";

    // 4. 기사 고유 해시 기반 다이내믹 배경 & 카테고리별 테마 설정
    const getHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const hashVal = getHash(slug || title || "briefpost");
    const variant = hashVal % 3; // 0, 1, 2 변주
    const bgAngle = 130 + (hashVal % 5) * 11; // 130deg ~ 174deg 다채로운 조명 각도

    let categoryBg = "rgba(37, 99, 235, 0.28)";
    let categoryBorder = "#3b82f6";
    let categoryColor = "#93c5fd";
    let glowColorTop = "rgba(59, 130, 246, 0.45)"; // 우측 상단 블루 글로우
    let glowColorBottom = "rgba(16, 185, 129, 0.35)"; // 좌측 하단 에메랄드 포인트
    let topBarGradient = "linear-gradient(90deg, #2563eb 0%, #38bdf8 50%, #10b981 100%)";
    let watermarkText = "BRIEF";
    let mainBg = `linear-gradient(${bgAngle}deg, #091a36 0%, #0f2b57 45%, #143870 75%, #0a1c38 100%)`;

    if (category.includes("소상공인") || category.includes("지원금") || category.includes("정책")) {
      categoryBg = "rgba(16, 185, 129, 0.28)";
      categoryBorder = "#10b981";
      categoryColor = "#6ee7b7";
      watermarkText = "POLICY";
      topBarGradient = "linear-gradient(90deg, #10b981 0%, #38bdf8 50%, #2563eb 100%)";

      if (variant === 0) {
        // 싱그럽고 깊이 있는 딥 에메랄드 / 포레스트
        mainBg = `linear-gradient(${bgAngle}deg, #062820 0%, #0b3d32 40%, #0f5243 75%, #072b22 100%)`;
        glowColorTop = "rgba(52, 211, 153, 0.45)";
        glowColorBottom = "rgba(56, 189, 248, 0.35)";
      } else if (variant === 1) {
        // 청량하고 신뢰감 있는 오션 틸 / 딥 블루
        mainBg = `linear-gradient(${bgAngle}deg, #072633 0%, #0b3d52 40%, #0e5370 75%, #072430 100%)`;
        glowColorTop = "rgba(45, 212, 191, 0.45)";
        glowColorBottom = "rgba(96, 165, 250, 0.35)";
      } else {
        // 화사하고 세련된 민트 시안 / 틸
        mainBg = `linear-gradient(${bgAngle}deg, #052a28 0%, #0a423e 40%, #0e5b56 75%, #052624 100%)`;
        glowColorTop = "rgba(56, 189, 248, 0.45)";
        glowColorBottom = "rgba(16, 185, 129, 0.38)";
      }
    } else if (category.includes("금융") || category.includes("경제")) {
      categoryBg = "rgba(245, 158, 11, 0.28)";
      categoryBorder = "#f59e0b";
      categoryColor = "#fcd34d";
      watermarkText = "FINANCE";
      topBarGradient = "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #3b82f6 100%)";

      if (variant === 0) {
        // 프리미엄 앰버 골드 & 딥 네이비
        mainBg = `linear-gradient(${bgAngle}deg, #241d08 0%, #3b2e0a 40%, #4f3d0c 75%, #1f1805 100%)`;
        glowColorTop = "rgba(251, 191, 36, 0.45)";
        glowColorBottom = "rgba(245, 158, 11, 0.35)";
      } else if (variant === 1) {
        // 월스트리트 로열 사파이어 블루
        mainBg = `linear-gradient(${bgAngle}deg, #0a1a36 0%, #102a57 40%, #173b7a 75%, #08152b 100%)`;
        glowColorTop = "rgba(96, 165, 250, 0.45)";
        glowColorBottom = "rgba(251, 191, 36, 0.30)";
      } else {
        // 고급 샴페인 & 다크 슬레이트 듀얼 톤
        mainBg = `linear-gradient(${bgAngle}deg, #1d1b18 0%, #332d1d 40%, #202d45 80%, #0f1724 100%)`;
        glowColorTop = "rgba(245, 158, 11, 0.42)";
        glowColorBottom = "rgba(147, 197, 253, 0.32)";
      }
    } else if (category.includes("부동산") || category.includes("세제")) {
      categoryBg = "rgba(139, 92, 246, 0.28)";
      categoryBorder = "#8b5cf6";
      categoryColor = "#c4b5fd";
      watermarkText = "REALTY";
      topBarGradient = "linear-gradient(90deg, #8b5cf6 0%, #c084fc 50%, #ec4899 100%)";

      if (variant === 0) {
        // 모던 로열 바이올렛
        mainBg = `linear-gradient(${bgAngle}deg, #1d0f36 0%, #301659 40%, #441d7d 75%, #160a29 100%)`;
        glowColorTop = "rgba(192, 132, 252, 0.45)";
        glowColorBottom = "rgba(244, 114, 182, 0.35)";
      } else if (variant === 1) {
        // 화사하고 깊은 마젠타 와인 & 플럼
        mainBg = `linear-gradient(${bgAngle}deg, #2b0c2a 0%, #421240 40%, #591656 75%, #200720 100%)`;
        glowColorTop = "rgba(244, 114, 182, 0.45)";
        glowColorBottom = "rgba(168, 85, 247, 0.35)";
      } else {
        // 세련된 인디고 퍼플 미드나잇
        mainBg = `linear-gradient(${bgAngle}deg, #14133b 0%, #201f5c 40%, #2e2c82 75%, #0f0e2b 100%)`;
        glowColorTop = "rgba(167, 139, 250, 0.45)";
        glowColorBottom = "rgba(236, 72, 153, 0.32)";
      }
    } else if (category.includes("테크") || category.includes("IT")) {
      categoryBg = "rgba(14, 165, 233, 0.28)";
      categoryBorder = "#0ea5e9";
      categoryColor = "#7dd3fc";
      watermarkText = "TECH·AI";
      topBarGradient = "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #6366f1 100%)";

      if (variant === 0) {
        // 하이테크 사이버 블루
        mainBg = `linear-gradient(${bgAngle}deg, #07243d 0%, #0c3860 40%, #104e85 75%, #051b2e 100%)`;
        glowColorTop = "rgba(56, 189, 248, 0.48)";
        glowColorBottom = "rgba(129, 140, 248, 0.35)";
      } else if (variant === 1) {
        // 일렉트릭 딥 코발트
        mainBg = `linear-gradient(${bgAngle}deg, #091c42 0%, #0e2d6b 40%, #133f94 75%, #061430 100%)`;
        glowColorTop = "rgba(96, 165, 250, 0.48)";
        glowColorBottom = "rgba(45, 212, 191, 0.32)";
      } else {
        // 네온 아쿠아 사이안
        mainBg = `linear-gradient(${bgAngle}deg, #052a3a 0%, #094057 40%, #0d5878 75%, #041e2b 100%)`;
        glowColorTop = "rgba(45, 212, 191, 0.45)";
        glowColorBottom = "rgba(56, 189, 248, 0.40)";
      }
    } else if (category.includes("사회") || category.includes("문화")) {
      categoryBg = "rgba(99, 102, 241, 0.28)";
      categoryBorder = "#6366f1";
      categoryColor = "#a5b4fc";
      watermarkText = "SOCIETY";
      topBarGradient = "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #10b981 100%)";

      if (variant === 0) {
        // 깊고 우아한 딥 인디고
        mainBg = `linear-gradient(${bgAngle}deg, #15183d 0%, #21265e 40%, #2f3685 75%, #0f112b 100%)`;
        glowColorTop = "rgba(129, 140, 248, 0.45)";
        glowColorBottom = "rgba(52, 211, 153, 0.30)";
      } else if (variant === 1) {
        // 엘레강트 플럼 & 로즈
        mainBg = `linear-gradient(${bgAngle}deg, #2b1122 0%, #421a34 40%, #572244 75%, #1e0b17 100%)`;
        glowColorTop = "rgba(244, 114, 182, 0.45)";
        glowColorBottom = "rgba(192, 132, 252, 0.35)";
      } else {
        // 차분하고 세련된 노르딕 틸 슬레이트
        mainBg = `linear-gradient(${bgAngle}deg, #0b262e 0%, #123d4a 40%, #1a5668 75%, #081d24 100%)`;
        glowColorTop = "rgba(56, 189, 248, 0.42)";
        glowColorBottom = "rgba(167, 139, 250, 0.32)";
      }
    }

    // 5. 모바일 화면 최적화 타이포그래피 폰트 크기 대폭 상향 (이미지를 꽉 채우는 68px ~ 96px 초특대형 볼드)
    const titleLength = cardMainTitle.length;
    let titleFontSize = 96; // 15자 이하: 압도적인 96px
    let titleLineHeight = 1.15;

    if (titleLength > 32) {
      titleFontSize = 68; // 33자 이상 긴 제목: 68px
      titleLineHeight = 1.18;
    } else if (titleLength > 23) {
      titleFontSize = 78; // 24~32자: 78px
      titleLineHeight = 1.16;
    } else if (titleLength > 15) {
      titleFontSize = 86; // 16~23자: 86px
      titleLineHeight = 1.15;
    }

    // 6. 폰트 로드
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
            background: mainBg,
            padding: "30px 46px",
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

          {/* 2. 오로라 방사형 조명 효과 (우측 상단 + 좌측 하단 + 중앙 엠비언트) */}
          <div
            style={{
              position: "absolute",
              top: "-120px",
              right: "-80px",
              width: "720px",
              height: "720px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glowColorTop} 0%, rgba(255, 255, 255, 0.04) 40%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-140px",
              left: "-60px",
              width: "680px",
              height: "680px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glowColorBottom} 0%, rgba(255, 255, 255, 0.03) 40%, transparent 70%)`,
            }}
          />
          {/* 중앙 은은한 엠비언트 라이트로 어두운 답답함 해소 */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "25%",
              width: "600px",
              height: "350px",
              borderRadius: "50%",
              background: `radial-gradient(ellipse, ${glowColorTop} 0%, transparent 75%)`,
              opacity: 0.28,
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
            }}
          >
            {/* 카테고리 뱃지 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 22px",
                borderRadius: "30px",
                backgroundColor: categoryBg,
                border: `1.5px solid ${categoryBorder}`,
                color: categoryColor,
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}
            >
              <span style={{ marginRight: "8px", fontSize: "16px" }}>●</span>
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

          {/* [2. 중앙 메인 타이틀 영역 - 서브 캐치프레이즈 & 키워드 헤드라인 (이미지를 꽉 채우는 특대형 헤드라인)] */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              margin: "8px 0 10px 0",
              maxWidth: "100%",
            }}
          >
            {/* 세련된 서브 캐치프레이즈 (32px 대형 폰트) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: categoryColor,
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                marginBottom: "10px",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.8)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: categoryBg,
                  border: `1.5px solid ${categoryBorder}`,
                  marginRight: "12px",
                  fontSize: "19px",
                }}
              >
                ⚡
              </span>
              {cardSubCatchphrase}
            </div>

            {/* 카드 중앙 메인 타이틀 (68px~96px 초특대형 볼드 폰트, 이미지를 꽉 채우는 2~3줄 헤드라인) */}
            <h1
              style={{
                color: "#ffffff",
                fontSize: `${titleFontSize}px`,
                fontWeight: 900,
                lineHeight: titleLineHeight,
                letterSpacing: "-2px",
                margin: 0,
                padding: 0,
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 8px 32px rgba(0, 0, 0, 0.95)",
              }}
            >
              {cardMainTitle}
            </h1>
          </div>

          {/* [3. 하단 인포그래픽 하이라이트 박스 및 도메인 워터마크 - 모바일 시인성 대폭 강화] */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* 인포그래픽 하이라이트 박스 (모바일 축소 시에도 뭉개지지 않도록 32px 대형 폰트 및 넉넉한 패딩) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "15px 28px",
                borderRadius: "18px",
                backgroundColor: badgeInfo.isSubsidy
                  ? "rgba(6, 78, 59, 0.75)"
                  : "rgba(30, 58, 138, 0.65)",
                border: badgeInfo.isSubsidy
                  ? "2.5px solid rgba(16, 185, 129, 0.85)"
                  : "2.5px solid rgba(59, 130, 246, 0.75)",
                boxShadow: "0 8px 26px rgba(0, 0, 0, 0.5)",
                maxWidth: "76%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: badgeInfo.isSubsidy ? "#34d399" : "#60a5fa",
                  fontSize: "32px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                {displayBadge}
              </div>
              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "20px",
                  fontWeight: 600,
                  marginTop: "5px",
                  letterSpacing: "-0.3px",
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
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                OFFICIAL BRIEFING
              </span>
              <span
                style={{
                  color: "#38bdf8",
                  fontSize: "22px",
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
