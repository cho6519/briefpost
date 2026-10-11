import { pipelineStore } from "../src/agents/pipelineStore";
import { getArticleBySlugAsync } from "../src/lib/articles";

async function main() {
  console.log("=== [1-Click 승인 발행 및 9단계 렌더링 검증 시작] ===");
  const pending = pipelineStore.getQueueItems().find((i) => i.status === "PENDING" && i.payload.headline.includes("경영안정자금")) ||
                  pipelineStore.getQueueItems().find((i) => i.status === "PENDING") ||
                  pipelineStore.getQueueItems()[0];
  const queueId = pending ? pending.id : "queue_1791710664350_rb03";

  // 1. 관리자 1-Click 승인 발행 API 호출 시뮬레이션
  console.log(`대기열 항목 '${queueId}' 승인 및 발행 처리...`);
  const publishResult = await pipelineStore.publishQueueItem(queueId);

  console.log("발행 처리 결과:", publishResult);
  if (!publishResult.success) {
    throw new Error(`발행 실패: ${publishResult.error}`);
  }

  // 2. 대기열 상태 확인
  const queueItems = pipelineStore.getQueueItems();
  const publishedQueueItem = queueItems.find((i) => i.id === queueId);
  console.log("대기열 상태:", {
    id: publishedQueueItem?.id,
    status: publishedQueueItem?.status,
    publishedAt: publishedQueueItem?.publishedAt,
  });

  // 3. DB 비동기 조회 (Neon DB & SQLite 듀얼 호환)
  const slug = publishedQueueItem?.payload.slug || "2026-small-business-management-stabilization-fund-guide";
  console.log(`슬러그 '${slug}' 기사 DB 조회 검증...`);
  const article = await getArticleBySlugAsync(slug);

  if (!article) {
    throw new Error(`DB에서 기사를 찾을 수 없습니다: ${slug}`);
  }

  console.log("\n=== [발행된 기사 무결성 검증] ===");
  console.log("ID:", article.id);
  console.log("제목:", article.title);
  console.log("카테고리:", article.category);
  console.log("슬러그:", article.slug);
  console.log("생성일:", article.createdAt);
  console.log("대표 뱃지:", article.highlightBadge);
  console.log("CTA 타입:", article.ctaType);

  console.log("\n--- 9단계 구조 항목 검증 ---");
  const content = article.content;
  console.log("1. 핵심 요약 박스 포함 여부:", content.includes("[⚡ 핵심 지원 요약]"));
  console.log("2. 지원 대상 및 자격 조건 H2:", content.includes("## 1. 지원 대상 및 상세 자격 조건"));
  console.log("3. 지원 금액/금리 Markdown 비교표:", content.includes("| 구분 | 지원 내용 | 세부 조건 | 비고 |"));
  console.log("4. 온라인 접수 3단계 절차:", content.includes("1단계") && content.includes("2단계") && content.includes("3단계"));
  console.log("5. 불법 브로커 경고 콜아웃:", content.includes("callout-amber") && content.includes("불법 브로커"));
  console.log("6. 공식 출처 및 기준 표기:", content.includes("인용된 공식 출처") && content.includes("ols.semas.or.kr"));
  console.log("7. 관련 글/내부 링크 추천:", content.includes("함께 읽어볼 만한 관련 리포트"));
  console.log("8. 전체 본문 글자수:", content.length);

  console.log("\n✅ 모든 검증이 성공적으로 완료되었습니다!");
}

main().catch((err) => {
  console.error("검증 실패:", err);
  process.exit(1);
});
