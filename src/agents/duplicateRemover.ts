import getDatabase from "../lib/db";
import {
  DeduplicationInput,
  DeduplicationOutput,
  HuntedKeyword,
} from "./types";
import { pipelineStore } from "./pipelineStore";

/**
 * STEP 2. DUPLICATE & REPEATED INTENT REMOVER
 *
 * 책임:
 * - 완전 중복 키워드 필터링
 * - 이미 작성/발행된 기사(articles 테이블)의 제목, 슬러그, 핵심 키워드와 대조
 * - 현재 발행 대기열(Publish Queue)에 담긴 주제와 대조
 * - "동일 검색의도"를 가진 중복 콘텐츠 반복 생성 원천 차단
 */
export class DuplicateRemover {
  public filter(input: DeduplicationInput): DeduplicationOutput {
    const { candidates } = input;
    const removedDuplicates: DeduplicationOutput["removedDuplicates"] = [];
    const filteredKeywords: HuntedKeyword[] = [];

    // 1. 기존 발행 기사의 제목 및 슬러그 로드
    const db = getDatabase;
    const existingArticles = db
      .prepare("SELECT title, slug, highlightBadge FROM articles")
      .all() as Array<{ title: string; slug: string; highlightBadge: string | null }>;

    const existingTitles = existingArticles.map((a) => a.title.toLowerCase());
    const existingBadges = existingArticles
      .map((a) => a.highlightBadge?.toLowerCase())
      .filter(Boolean) as string[];

    // 2. 발행 대기 큐 항목 로드
    const queueItems = pipelineStore.getQueueItems();
    const queuedKeywords = queueItems.map((q) => q.payload.canonicalKeyword.toLowerCase());
    const queuedTitles = queueItems.map((q) => q.payload.headline.toLowerCase());
    const queuedIntents = queueItems.map((q) => ({
      keyword: q.payload.canonicalKeyword.toLowerCase(),
      intent: q.searchIntent,
    }));

    // 중복 검사 루프
    const seenInBatch = new Set<string>();

    for (const candidate of candidates) {
      const kw = candidate.keyword.trim().toLowerCase();
      const normalizedKw = kw.replace(/\s+/g, "");

      // 1) 이번 배치 내 중복
      if (seenInBatch.has(normalizedKw)) {
        removedDuplicates.push({
          keyword: candidate.keyword,
          reason: "현재 수집 배치 내 중복 키워드",
        });
        continue;
      }

      // 2) 이미 발행된 기사 제목 또는 뱃지 키워드와 직접 충돌
      const isAlreadyPublishedExact = existingBadges.some(
        (badge) => badge.includes(kw) || kw.includes(badge)
      );
      if (isAlreadyPublishedExact) {
        removedDuplicates.push({
          keyword: candidate.keyword,
          reason: "이미 사이트에 정식 발행된 기존 기사의 핵심 키워드와 중복",
          similarityScore: 95,
        });
        continue;
      }

      const isTitleSimilar = existingTitles.some((title) => {
        const cleanTitle = title.replace(/\s+/g, "");
        return cleanTitle.includes(normalizedKw) || normalizedKw.includes(cleanTitle);
      });
      if (isTitleSimilar) {
        removedDuplicates.push({
          keyword: candidate.keyword,
          reason: "기존 발행된 기사 제목과 동일/유사한 주제",
          similarityScore: 90,
        });
        continue;
      }

      // 3) 대기열(Publish Queue) 내 동일 키워드 충돌
      const isQueued = queuedKeywords.some((qk) => qk === kw || qk.includes(kw));
      if (isQueued) {
        removedDuplicates.push({
          keyword: candidate.keyword,
          reason: "현재 발행 대기열(Publish Queue)에 이미 적재되어 있는 키워드",
          similarityScore: 92,
        });
        continue;
      }

      // 4) [중요 제한] 동일 검색의도를 가진 유사 주제 반복 생성 차단
      const sameIntentCollision = queuedIntents.find(
        (qi) =>
          qi.intent === candidate.searchIntent &&
          (candidate.keyword.includes(qi.keyword) || qi.keyword.includes(candidate.keyword))
      );
      if (sameIntentCollision) {
        removedDuplicates.push({
          keyword: candidate.keyword,
          reason: `동일 검색의도(${candidate.searchIntent})를 가진 콘텐츠('${sameIntentCollision.keyword}')가 이미 대기열에 존재하여 반복 생성 차단`,
          similarityScore: 85,
        });
        continue;
      }

      // 모든 중복 및 동일의도 필터 통과
      seenInBatch.add(normalizedKw);
      filteredKeywords.push(candidate);
    }

    return {
      filteredKeywords,
      removedDuplicates,
      timestamp: new Date().toISOString(),
    };
  }
}
