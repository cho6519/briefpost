import { NextRequest, NextResponse } from "next/server";
import { AgentPipeline } from "@/agents/pipeline";
import { pipelineStore } from "@/agents/pipelineStore";
import { verifyCronAuth } from "@/lib/cronAuth";
import { isPublishingPaused } from "@/lib/emergencyStop";
import { isNeonConfigured, getNeonSql } from "@/lib/neonDb";
import getDatabase from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel 서버리스 함수 최대 실행 시간 허용

/**
 * 5대 핵심 카테고리 쿼터제 정의
 */
export interface CategoryQuotaSpec {
  id: string;
  name: string;
  aliases: string[];
  seedKeywords: string[];
  targetAudience: string;
}

export const QUOTA_CATEGORIES: CategoryQuotaSpec[] = [
  {
    id: "loan",
    name: "정책자금/대출",
    aliases: ["정책자금", "대출", "정책·지원금", "금융", "소상공인대출"],
    seedKeywords: [
      "2026 소상공인 정책자금 직접대출 신청 자격",
      "2026 소상공인 저금리 대환대출 조건 및 한도",
      "2026 소상공인 일반경영안정자금 신청 방법",
    ],
    targetAudience: "긴급 유동성 자금 및 저금리 대환이 필요한 소상공인 대표님",
  },
  {
    id: "subsidy",
    name: "지원금/바우처",
    aliases: ["지원금", "바우처", "보조금", "전기요금"],
    seedKeywords: [
      "2026 소상공인 전기요금 특별지원 신청 방법 및 환급",
      "2026 소상공인 스마트상점 기술보급 바우처 지원",
      "2026 영세 소상공인 난방비 및 에너지바우처 신청",
    ],
    targetAudience: "고정비 감면 및 공공 보조금 수혜를 원하는 영세 자영업자",
  },
  {
    id: "tax",
    name: "세금/절세",
    aliases: ["세금", "절세", "노란우산", "부가세", "종합소득세"],
    seedKeywords: [
      "2026 소상공인 노란우산공제 소득공제 한도 및 복리이자",
      "2026 자영업자 부가가치세 매입세액공제 절세 전략",
      "2026 개인사업자 종합소득세 필요경비 인정 항목 총정리",
    ],
    targetAudience: "합법적 절세와 사업소득 공제를 극대화하려는 개인·법인 사업주",
  },
  {
    id: "labor",
    name: "인건비/4대보험",
    aliases: ["인건비", "4대보험", "두루누리", "고용보험", "일자리"],
    seedKeywords: [
      "2026 두루누리 사회보험료 80% 지원 신청 자격 및 방법",
      "2026 1인 자영업자 고용보험 및 산재보험료 환급 지원",
      "2026 청년일자리도약장려금 소상공인 채용 인건비 지원",
    ],
    targetAudience: "직원 채용 부담과 4대보험료 경감을 원하는 고용 사업주 및 1인 자영업자",
  },
  {
    id: "restart",
    name: "폐업/재기지원",
    aliases: ["폐업", "재기지원", "희망리턴패키지", "점포철거비", "철거비"],
    seedKeywords: [
      "2026 희망리턴패키지 점포철거비 평당 지원금 신청 방법",
      "2026 폐업 소상공인 브릿지보증 및 채무조정 재기지원",
      "2026 소상공인 전업 재취업 전직장려수당 신청 가이드",
    ],
    targetAudience: "한계 사업장 폐업 원상복구 및 안전한 재기를 준비하는 소상공인",
  },
];

/**
 * DB 및 대기열의 카테고리별 현황을 집계하여 가장 적게 발행된 카테고리를 우선 선정 (Balanced Quota)
 */
async function selectQuotaCategory(requestedCategoryId?: string | null): Promise<{
  selected: CategoryQuotaSpec;
  counts: Record<string, number>;
  reason: string;
}> {
  // 1. 요청 파라미터로 특정 카테고리가 강제 지정된 경우
  if (requestedCategoryId) {
    const matched = QUOTA_CATEGORIES.find(
      (c) =>
        c.id === requestedCategoryId.toLowerCase() ||
        c.name === requestedCategoryId ||
        c.aliases.some((a) => requestedCategoryId.includes(a))
    );
    if (matched) {
      return {
        selected: matched,
        counts: {},
        reason: `사용자 지정 카테고리 강제 실행: '${matched.name}'`,
      };
    }
  }

  // 2. Neon DB 및 SQLite에서 최근 발행 기사들의 카테고리 분포 집계
  const counts: Record<string, number> = {
    loan: 0,
    subsidy: 0,
    tax: 0,
    labor: 0,
    restart: 0,
  };

  try {
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        const rows = await sql`
          SELECT category, title FROM articles ORDER BY id DESC LIMIT 50
        `;
        for (const row of rows) {
          const cat = String(row.category || "");
          const title = String(row.title || "");
          classifyItem(cat, title, counts);
        }
      }
    } else {
      const db = getDatabase;
      const rows = db.prepare("SELECT category, title FROM articles ORDER BY id DESC LIMIT 50").all() as Array<{
        category: string;
        title: string;
      }>;
      for (const row of rows) {
        classifyItem(row.category, row.title, counts);
      }
    }
  } catch (e) {
    console.warn("[Quota Selector] 카테고리 집계 조회 중 경고, 기본 분배 적용:", e);
  }

  // 3. 대기열(PublishQueue)에 대기 중인 항목들도 카운트에 반영
  try {
    const queueItems = pipelineStore.getQueueItems();
    for (const item of queueItems) {
      if (item.status === "PENDING" || item.status === "PROCESSING") {
        classifyItem(item.payload.category, item.payload.headline, counts);
      }
    }
  } catch {
    // 무시
  }

  // 4. 가장 발행 건수가 적은 카테고리를 1순위로 선정 (동률 시 랜덤 순환)
  let minCount = Infinity;
  let candidates: CategoryQuotaSpec[] = [];

  for (const cat of QUOTA_CATEGORIES) {
    const count = counts[cat.id] || 0;
    if (count < minCount) {
      minCount = count;
      candidates = [cat];
    } else if (count === minCount) {
      candidates.push(cat);
    }
  }

  const selected = candidates[Math.floor(Math.random() * candidates.length)] || QUOTA_CATEGORIES[0];

  return {
    selected,
    counts,
    reason: `5대 카테고리 쿼터제 균등 배정: '${selected.name}' (현재 누적 ${minCount}건으로 최소 배정군)`,
  };
}

/**
 * 텍스트 기반 카테고리 분류 헬퍼
 */
function classifyItem(category: string, title: string, counts: Record<string, number>): void {
  const combined = `${category} ${title}`.toLowerCase();
  if (combined.includes("대출") || combined.includes("경영안정") || combined.includes("정책자금")) {
    counts.loan = (counts.loan || 0) + 1;
  } else if (combined.includes("전기요금") || combined.includes("바우처") || combined.includes("지원금") || combined.includes("보조금")) {
    counts.subsidy = (counts.subsidy || 0) + 1;
  } else if (combined.includes("노란우산") || combined.includes("세금") || combined.includes("절세") || combined.includes("소득공제")) {
    counts.tax = (counts.tax || 0) + 1;
  } else if (combined.includes("두루누리") || combined.includes("4대보험") || combined.includes("인건비") || combined.includes("고용보험")) {
    counts.labor = (counts.labor || 0) + 1;
  } else if (combined.includes("희망리턴") || combined.includes("철거비") || combined.includes("폐업") || combined.includes("재기")) {
    counts.restart = (counts.restart || 0) + 1;
  } else {
    counts.loan = (counts.loan || 0) + 1;
  }
}

/**
 * Vercel Cron 엔드포인트 핸들러
 */
async function handlePublishCron(request: NextRequest) {
  const startTime = Date.now();

  console.log("\n========================================================");
  console.log("⏰ [VERCEL CRON] 5대 카테고리 균등 쿼터제 파이프라인 트리거");
  console.log(`- 실행 일시: ${new Date().toISOString()}`);
  console.log("========================================================");

  try {
    // 1. Vercel Cron 인증 토큰 검증
    const auth = verifyCronAuth(request);
    if (!auth.authorized) {
      console.warn("[VERCEL CRON] 인증 실패 - 요청 거부");
      return auth.response!;
    }

    // 2. 전역 긴급 중지 검사
    if (isPublishingPaused()) {
      console.warn("[VERCEL CRON] 전역 긴급 중지 상태로 실행 중단");
      return NextResponse.json(
        {
          success: false,
          error: "전역 긴급 중지 상태(PUBLISHING_PAUSED)로 인해 파이프라인 가동이 차단되었습니다.",
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedCategory = searchParams.get("category");
    // autoPublish: 쿼리 파라미터가 없으면 기본 true (검증 통과본 즉시 발행), 'false' 명시 시 대기열만 적재
    const autoPublish = searchParams.get("autoPublish") !== "false";

    // 3. 5대 카테고리 균등 쿼터제 엔진 구동 -> 1순위 카테고리 자동 선정
    const quotaResult = await selectQuotaCategory(requestedCategory);
    const target = quotaResult.selected;

    // 카테고리별 시드 키워드 중 1개 선택
    const seedKeyword = target.seedKeywords[Math.floor(Math.random() * target.seedKeywords.length)];

    console.log(`[QUOTA SELECTION] ${quotaResult.reason}`);
    console.log(`- 선정 카테고리: [${target.name}]`);
    console.log(`- 시드 키워드: "${seedKeyword}"`);

    // 4. 9단계 무결성 에이전트 파이프라인 가동
    const pipeline = new AgentPipeline();
    const pipelineResult = await pipeline.run({
      domain: target.name,
      seedKeywords: [seedKeyword],
      hunterCount: 2,
      targetAudience: target.targetAudience,
    });

    if (!pipelineResult.success || !pipelineResult.step7QueueItem) {
      console.warn("[VERCEL CRON] 파이프라인 검증 반려 또는 팩트체크 미달:", pipelineResult.step9Rejected);
      return NextResponse.json({
        success: false,
        category: target.name,
        seedKeyword,
        rejection: pipelineResult.step9Rejected,
        durationMs: Date.now() - startTime,
        message: "팩트체크 또는 SEO 검수 미달로 대기열 적재 제외됨 (품질 안전장치 정상 작동)",
      });
    }

    const queueItem = pipelineResult.step7QueueItem;
    console.log(`✅ [대기열 적재 성공] Queue ID: ${queueItem.id}`);
    console.log(`- 기사 제목: "${queueItem.payload.headline}"`);
    console.log(`- 슬러그: /news/${queueItem.payload.slug}`);

    // 5. 옵션에 따른 정식 기사 발행 처리
    let publishedArticleId: number | undefined;
    if (autoPublish) {
      console.log(`▶ [자동 승인 발행] 대기열 ID ${queueItem.id} 즉시 발행 진행...`);
      const pubResult = await pipelineStore.publishQueueItem(queueItem.id);
      if (pubResult.success) {
        publishedArticleId = pubResult.articleId;
        console.log(`🎉 [정식 발행 완료] Article ID: ${publishedArticleId}`);
      } else {
        console.warn(`⚠️ [발행 지연] 대기열 상태 유지: ${pubResult.error}`);
      }
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      category: target.name,
      seedKeyword,
      quotaDistribution: quotaResult.counts,
      queueItem: {
        id: queueItem.id,
        headline: queueItem.payload.headline,
        slug: queueItem.payload.slug,
        status: publishedArticleId ? "PUBLISHED" : "PENDING",
      },
      articleId: publishedArticleId,
      url: `/news/${queueItem.payload.slug}`,
      durationMs,
      timestamp: new Date().toISOString(),
      message: publishedArticleId
        ? "5대 카테고리 균등 쿼터제 파이프라인 가동 및 정식 발행이 완벽히 완료되었습니다."
        : "5대 카테고리 균등 쿼터제 파이프라인 가동 및 발행 대기열 적재가 완료되었습니다.",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[VERCEL CRON FATAL ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePublishCron(request);
}

export async function POST(request: NextRequest) {
  return handlePublishCron(request);
}
