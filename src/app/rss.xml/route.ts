import { NextResponse } from "next/server";
import { getArticles } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const siteUrl = getSiteUrl();
  const { articles } = getArticles({ limit: 50 });

  const items = articles
    .map((article) => {
      const url = `${siteUrl}/news/${article.slug}`;
      const pubDate = new Date(article.createdAt || Date.now()).toUTCString();
      const content = article.summary || article.content || "";

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${content}]]></description>
      <category><![CDATA[${article.category}]]></category>
    </item>`;
    })
    .join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Tech Brief - 1단 요약 뉴스레터</title>
    <link>${siteUrl}</link>
    <description>인공지능, 테크, 경제 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
