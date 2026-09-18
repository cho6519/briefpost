import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = getSiteUrl();
const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-5916106612077152";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Brief Post - 공공.경제 정책 전문 브리핑",
    template: "%s | Brief Post",
  },
  description: "정책, 경제, 테크 핵심 뉴스를 빠르게 전달하는 공공.경제 정책 전문 브리핑",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Brief Post - 공공.경제 정책 전문 브리핑",
    description: "정책, 경제, 테크 핵심 뉴스를 빠르게 전달하는 공공.경제 정책 전문 브리핑",
    url: siteUrl,
    siteName: "Brief Post",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brief Post - 공공.경제 정책 전문 브리핑",
    description: "정책, 경제, 테크 핵심 뉴스를 빠르게 전달하는 공공.경제 정책 전문 브리핑",
  },
  verification: {
    google: "kQuFAyO0YE_YE_v2Hn2MPjHdG6HkXW_lAGPs-E2g0So",
    other: {
      "naver-site-verification": "d82d4537edb61c62c480aee081f939b9cb57cc18",
      "google-adsense-account": "ca-pub-5916106612077152",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* 구글 애드센스 공식 비동기 로더 (환경변수 설정 시 활성화) */}
        {adClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#f8f9fa] text-zinc-900 selection:bg-blue-600 selection:text-white`}>
        <Header />
        <main className="flex-1 w-full mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
