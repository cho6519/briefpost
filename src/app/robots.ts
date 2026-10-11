import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
        disallow: ["/api/cron/", "/api/articles/", "/api/admin/", "/admin/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/api/og"],
        disallow: ["/api/cron/", "/api/articles/", "/api/admin/", "/admin/"],
      },
      {
        userAgent: "Yeti", // 네이버 크롤러 봇
        allow: ["/", "/api/og"],
        disallow: ["/api/cron/", "/api/articles/", "/api/admin/", "/admin/"],
      },
      {
        userAgent: "Daumoa", // 다음/카카오 크롤러 봇
        allow: ["/", "/api/og"],
        disallow: ["/api/cron/", "/api/articles/", "/api/admin/", "/admin/"],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
