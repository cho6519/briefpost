import { MetadataRoute } from "next";
import { getAllArticleSlugsAsync } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticleSlugsAsync();

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...legalPages,
    ...articleEntries,
  ];
}
