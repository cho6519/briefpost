import Parser from "rss-parser";
import { getAllSourceUrls } from "./articles";
import { getActiveRssFeeds, RSS_FEEDS } from "@/config/rssFeeds";

export interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  thumbnailUrl: string | null;
  category: string;
  feedTitle: string;
}

export interface FetchRssResult {
  success: boolean;
  totalFetched: number;
  newItemsCount: number;
  skippedCount: number;
  expiredCount?: number;
  items: ParsedRssItem[];
  feedStatuses: {
    feedUrl: string;
    status: "success" | "error";
    itemCount: number;
    error?: string;
  }[];
}

export const DEFAULT_RSS_FEEDS = RSS_FEEDS;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 공공기관 및 일반 언론사 RSS/Atom의 다양한 규격을 포용하는 커스텀 파서
const rssParser = new Parser({
  timeout: 12000,
  headers: {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["content:encoded", "contentEncoded"],
      ["dc:date", "dcDate"],
      ["dc:identifier", "dcIdentifier"],
      ["dc:creator", "dcCreator"],
      ["dc:title", "dcTitle"],
      ["description", "description"],
      ["summary", "summary"],
      ["id", "guidId"],
    ],
  },
});

interface RssItemLike {
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string } };
  mediaThumbnail?: { $?: { url?: string } };
  content?: string;
  contentEncoded?: string;
  description?: string;
  "content:encoded"?: string;
  [key: string]: unknown;
}

/**
 * HTML 본문 및 미디어 태그에서 썸네일 이미지 URL 추출
 */
function extractThumbnailUrl(item: RssItemLike): string | null {
  // 1) enclosure 태그 확인
  if (
    item.enclosure?.url &&
    (item.enclosure.type?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url))
  ) {
    return item.enclosure.url;
  }

  // 2) media:content 또는 media:thumbnail 속성 확인
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }

  // 3) 본문 HTML 내 <img> src 정규식 추출
  const contentToSearch =
    item.contentEncoded ||
    (typeof item["content:encoded"] === "string" ? item["content:encoded"] : "") ||
    item.content ||
    (typeof item.description === "string" ? item.description : "") ||
    "";

  const imgMatch = contentToSearch.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  return null;
}

/**
 * HTML 태그 제거 및 텍스트 정리
 */
function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 일반 언론사 및 공공기관 RSS 아이템에서 필드를 유연하게 추출
 */
function extractItemDetails(
  item: Record<string, unknown>,
  targetFeed: { url: string; name: string; category: string },
  feedTitle: string
): ParsedRssItem | null {
  // 1. Title 추출
  const rawTitle =
    item.title ||
    item.dcTitle ||
    item["dc:title"] ||
    item.heading ||
    item.headline ||
    "";
  const title = stripHtmlTags(String(rawTitle)).trim();

  // 2. Link 추출 (Atom href 객체, guid, dc:identifier 등 다형성 지원)
  let rawLink: unknown =
    item.link ||
    item.guid ||
    item.guidId ||
    item.dcIdentifier ||
    item["dc:identifier"] ||
    item.id ||
    "";

  if (typeof rawLink === "object" && rawLink !== null) {
    const obj = rawLink as Record<string, unknown>;
    if (typeof obj.$ === "object" && obj.$ !== null) {
      const nested = obj.$ as Record<string, unknown>;
      if (typeof nested.href === "string") rawLink = nested.href;
    } else if (typeof obj.href === "string") {
      rawLink = obj.href;
    } else if (typeof obj._ === "string") {
      rawLink = obj._;
    }
  }

  const link = typeof rawLink === "string" ? rawLink.trim() : "";

  if (!title || !link) {
    return null;
  }

  // 3. 본문 및 요약 텍스트 추출
  const rawContent =
    item.contentEncoded ||
    item["content:encoded"] ||
    item.content ||
    item.description ||
    item.summary ||
    item.contentSnippet ||
    "";
  const contentStr = typeof rawContent === "string" ? rawContent : "";
  const rawSnippet = item.contentSnippet || item.description || item.summary || contentStr;
  const cleanSnippet = stripHtmlTags(typeof rawSnippet === "string" ? rawSnippet : "").slice(0, 300);

  // 4. 날짜 추출 (pubDate, isoDate, dc:date 등 다형성 지원)
  const rawDate =
    item.pubDate ||
    item.isoDate ||
    item.dcDate ||
    item["dc:date"] ||
    item.date ||
    item.published ||
    item.updated;

  let pubDate = new Date().toISOString();
  if (rawDate) {
    const parsedTime = Date.parse(String(rawDate));
    if (!isNaN(parsedTime)) {
      pubDate = new Date(parsedTime).toISOString();
    }
  }

  // 5. 썸네일 이미지 추출
  const thumbnailUrl = extractThumbnailUrl(item as RssItemLike);

  return {
    title,
    link,
    pubDate,
    content: contentStr || cleanSnippet,
    contentSnippet: cleanSnippet,
    thumbnailUrl,
    category: targetFeed.category,
    feedTitle: feedTitle || targetFeed.name,
  };
}

/**
 * 단일 피드를 안전하게 수집 및 파싱 (에러 발생 시 상세 상태 코드 및 원인 기록)
 */
async function fetchSingleFeed(targetFeed: {
  url: string;
  name: string;
  category: string;
}): Promise<{
  items: ParsedRssItem[];
  rawCount: number;
  status: "success" | "error";
  statusCode?: number;
  error?: string;
}> {
  console.log(`[RSS] 피드 수집 시도: [${targetFeed.name}] (URL: ${targetFeed.url})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    let rawXml = "";
    let httpStatus = 200;

    try {
      const res = await fetch(targetFeed.url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      httpStatus = res.status;

      if (!res.ok) {
        const errorMsg = `HTTP 에러 상태 코드: ${res.status} (${res.statusText})`;
        console.error(
          `[RSS ERROR] 피드 수집 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${errorMsg}`
        );
        return {
          items: [],
          rawCount: 0,
          status: "error",
          statusCode: res.status,
          error: errorMsg,
        };
      }

      rawXml = await res.text();
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const fetchErrMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);

      // fetch 실패 시 rssParser.parseURL로 재시도
      try {
        const directFeed = await rssParser.parseURL(targetFeed.url);
        const processed = processFeedResult(directFeed, targetFeed);
        console.log(
          `[RSS SUCCESS] 피드 수집 성공(parseURL 폴백): [${targetFeed.name}] (${targetFeed.url}) -> 긁어온 원문: ${processed.items.length}건`
        );
        return {
          items: processed.items,
          rawCount: processed.items.length,
          status: "success",
          statusCode: 200,
        };
      } catch (parseErr: unknown) {
        const parseErrMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        const finalError = `네트워크 연결 실패 (${fetchErrMsg}) / 파서 재시도 실패 (${parseErrMsg})`;
        console.error(
          `[RSS ERROR] 피드 수집 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${finalError}`
        );
        return {
          items: [],
          rawCount: 0,
          status: "error",
          error: finalError,
        };
      }
    }

    // 공공기관 서버가 200 OK이면서 HTML 에러/안내 페이지를 반환하는 경우 방어
    if (
      (rawXml.includes("<!DOCTYPE html") ||
        rawXml.includes("<!doctype html") ||
        rawXml.includes("<html")) &&
      !rawXml.includes("<rss") &&
      !rawXml.includes("<feed") &&
      !rawXml.includes("<channel")
    ) {
      const errorMsg = "HTTP 200 응답이나 XML 피드가 아닌 웹페이지(HTML 안내/에러 페이지) 반환됨";
      console.warn(
        `[RSS ERROR] 피드 파싱 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${errorMsg}`
      );
      return {
        items: [],
        rawCount: 0,
        status: "error",
        statusCode: httpStatus,
        error: errorMsg,
      };
    }

    const parsedFeed = await rssParser.parseString(rawXml);
    const processed = processFeedResult(parsedFeed, targetFeed);

    console.log(
      `[RSS SUCCESS] 피드 수집 성공: [${targetFeed.name}] (${targetFeed.url}) -> 긁어온 원문: ${processed.items.length}건 (HTTP ${httpStatus})`
    );

    return {
      items: processed.items,
      rawCount: processed.items.length,
      status: "success",
      statusCode: httpStatus,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[RSS ERROR] 피드 예외 발생: [${targetFeed.name}] (${targetFeed.url}) -> ${errMsg}`
    );
    return {
      items: [],
      rawCount: 0,
      status: "error",
      error: errMsg,
    };
  }
}

/**
 * 파싱된 피드 객체에서 최대 10개의 아이템 정제 반환
 */
function processFeedResult(
  feed: { items?: any[]; title?: string },
  targetFeed: { url: string; name: string; category: string }
): { items: ParsedRssItem[]; status: "success" } {
  const rawItems = feed.items || [];
  const targetItems = rawItems.slice(0, 10);
  const items: ParsedRssItem[] = [];

  for (const rawItem of targetItems) {
    const parsed = extractItemDetails(rawItem as Record<string, unknown>, targetFeed, feed.title || targetFeed.name);
    if (parsed) {
      items.push(parsed);
    }
  }

  return { items, status: "success" };
}

/**
 * Promise.allSettled를 통해 모든 등록된 RSS 피드를 병렬로 안전하게 수집
 */
export async function fetchRssFeeds(
  customUrls?: { url: string; category?: string }[]
): Promise<FetchRssResult> {
  const feedsToFetch =
    customUrls && customUrls.length > 0
      ? customUrls.map((c) => ({
          url: c.url,
          category: c.category || "정책·지원금",
          name: c.url,
        }))
      : getActiveRssFeeds();

  const existingSourceUrls = getAllSourceUrls();

  console.log(`\n======================================================`);
  console.log(`[RSS 수집 시작] 총 ${feedsToFetch.length}개 피드 병렬 수집 개시`);
  console.log(`- 기존 DB 등록 기사(중복 배제용 URL): 총 ${existingSourceUrls.size}건`);
  console.log(`======================================================`);

  // 병렬 호출: 하나의 피드가 지연되거나 실패해도 다른 피드 수집에 전혀 영향을 주지 않음
  const results = await Promise.allSettled(
    feedsToFetch.map((targetFeed) => fetchSingleFeed(targetFeed))
  );

  const feedStatuses: FetchRssResult["feedStatuses"] = [];
  const newItems: ParsedRssItem[] = [];
  let totalRawCount = 0;
  let skippedCount = 0;

  console.log(`\n------------------------------------------------------`);
  console.log(`[RSS 피드별 원문 수집 결과 요약]`);

  for (let i = 0; i < feedsToFetch.length; i++) {
    const targetFeed = feedsToFetch[i];
    const settled = results[i];

    if (settled.status === "fulfilled") {
      const { items, rawCount, status, error } = settled.value;
      totalRawCount += rawCount;
      let feedNewCount = 0;
      let feedSkippedCount = 0;

      for (const item of items) {
        if (existingSourceUrls.has(item.link)) {
          skippedCount++;
          feedSkippedCount++;
          continue;
        }

        newItems.push(item);
        existingSourceUrls.add(item.link);
        feedNewCount++;
      }

      feedStatuses.push({
        feedUrl: targetFeed.url,
        status,
        itemCount: feedNewCount,
        error,
      });

      console.log(
        `• [${targetFeed.name}] (URL: ${targetFeed.url}) -> 긁어온 원문: ${rawCount}건 | 신규: ${feedNewCount}건 | 중복 스킵: ${feedSkippedCount}건 | 상태: ${status}${error ? ` (${error})` : ""}`
      );
    } else {
      const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      console.error(
        `• [${targetFeed.name}] (URL: ${targetFeed.url}) -> 수집 실패: ${errMsg}`
      );
      feedStatuses.push({
        feedUrl: targetFeed.url,
        status: "error",
        itemCount: 0,
        error: errMsg,
      });
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`[RSS 중복 체크 최종 결과]`);
  console.log(`- 전체 긁어온 원문: ${totalRawCount}건`);
  console.log(`- 신규 기사로 판정된 건수: ${newItems.length}건`);
  console.log(`- 중복으로 스킵된 건수: ${skippedCount}건`);
  console.log(`======================================================`);

  // --- 최근 7일 이내 발행된 기사만 필터링 (7 * 24 * 60 * 60 * 1000 ms) ---
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - SEVEN_DAYS_MS;

  const validRecentItems: ParsedRssItem[] = [];
  let expiredCount = 0;

  for (const item of newItems) {
    let itemTime = Date.parse(item.pubDate);
    // 다양한 공공기관 날짜 포맷 안전 파싱 예외 처리
    if (isNaN(itemTime)) {
      const fallbackDate = new Date(item.pubDate);
      itemTime = fallbackDate.getTime();
    }

    // 날짜 파싱이 불가능한 경우(isNaN) 안전하게 유효 기사로 인정하여 통과
    if (isNaN(itemTime)) {
      validRecentItems.push(item);
      continue;
    }

    // 7일 이내 기사만 채택, 7일 이전 기사는 제외
    if (itemTime >= cutoffTime) {
      validRecentItems.push(item);
    } else {
      expiredCount++;
    }
  }

  // 최신 발행일(pubDate) 내림차순 정렬
  validRecentItems.sort((a, b) => {
    const timeA = Date.parse(a.pubDate) || 0;
    const timeB = Date.parse(b.pubDate) || 0;
    return timeB - timeA;
  });

  console.log(
    `[RSS Filter] 전체 수집 건수: ${newItems.length}건 / 7일 이내 유효 기사: ${validRecentItems.length}건 / 제외된 지난 기사: ${expiredCount}건\n`
  );

  return {
    success: true,
    totalFetched: totalRawCount,
    newItemsCount: validRecentItems.length,
    skippedCount,
    expiredCount,
    items: validRecentItems,
    feedStatuses,
  };
}
