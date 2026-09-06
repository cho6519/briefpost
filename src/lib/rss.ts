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
  items: ParsedRssItem[];
  feedStatuses: {
    feedUrl: string;
    status: "success" | "error";
    itemCount: number;
    error?: string;
  }[];
}

export const DEFAULT_RSS_FEEDS = RSS_FEEDS;

// 공공기관 및 일반 언론사 RSS/Atom의 다양한 규격을 포용하는 커스텀 파서
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
 * 단일 피드를 안전하게 수집 및 파싱 (에러 발생 시에도 예외를 삼키고 status 반환)
 */
async function fetchSingleFeed(targetFeed: {
  url: string;
  name: string;
  category: string;
}): Promise<{
  items: ParsedRssItem[];
  status: "success" | "error";
  error?: string;
}> {
  try {
    console.log(`[RSS] 피드 수집 시도: ${targetFeed.name} (${targetFeed.url})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let rawXml = "";
    try {
      const res = await fetch(targetFeed.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} (${res.statusText})`);
      }

      rawXml = await res.text();
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      // fetch 실패 시 rssParser.parseURL로 재시도
      try {
        const directFeed = await rssParser.parseURL(targetFeed.url);
        return processFeedResult(directFeed, targetFeed);
      } catch {
        throw fetchErr;
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
      console.warn(`[RSS Warning] ${targetFeed.name}: XML 피드가 아닌 웹페이지(HTML)가 응답되었습니다.`);
      return {
        items: [],
        status: "error",
        error: "서버가 XML 피드 대신 일반 웹페이지(HTML)를 반환했습니다.",
      };
    }

    const parsedFeed = await rssParser.parseString(rawXml);
    return processFeedResult(parsedFeed, targetFeed);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[RSS Warning] ${targetFeed.name} 수집 실패: ${errMsg}`);
    return {
      items: [],
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

  console.log(`[RSS] 총 ${feedsToFetch.length}개 피드 병렬 수집 시작 (Promise.allSettled)`);

  // 병렬 호출: 하나의 피드가 지연되거나 실패해도 다른 피드 수집에 전혀 영향을 주지 않음
  const results = await Promise.allSettled(
    feedsToFetch.map((targetFeed) => fetchSingleFeed(targetFeed))
  );

  const feedStatuses: FetchRssResult["feedStatuses"] = [];
  const newItems: ParsedRssItem[] = [];
  let totalFetched = 0;
  let skippedCount = 0;

  for (let i = 0; i < feedsToFetch.length; i++) {
    const targetFeed = feedsToFetch[i];
    const settled = results[i];

    if (settled.status === "fulfilled") {
      const { items, status, error } = settled.value;
      totalFetched += items.length;
      let feedNewCount = 0;

      for (const item of items) {
        if (existingSourceUrls.has(item.link)) {
          skippedCount++;
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
        `[RSS] 피드 완료: ${targetFeed.name} -> 신규 ${feedNewCount}건 (파싱 ${items.length}건) [상태: ${status}]`
      );
    } else {
      const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      console.warn(`[RSS Warning] ${targetFeed.name} 수집 실패: ${errMsg}`);
      feedStatuses.push({
        feedUrl: targetFeed.url,
        status: "error",
        itemCount: 0,
        error: errMsg,
      });
    }
  }

  return {
    success: true,
    totalFetched,
    newItemsCount: newItems.length,
    skippedCount,
    items: newItems,
    feedStatuses,
  };
}
