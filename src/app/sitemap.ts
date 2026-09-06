import { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllCategories } from "@/lib/articles";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticleSlugs();
  const categories = getAllCategories();

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: new Date(article.updatedAt || Date.now()),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteUrl}/?category=${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
