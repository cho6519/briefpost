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
const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Tech Brief - 1단 요약 뉴스레터",
    template: "%s | AI Tech Brief",
  },
  description: "인공지능, 테크, 경제 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터",
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
    title: "AI Tech Brief - 1단 요약 뉴스레터",
    description: "인공지능, 테크, 경제 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터",
    url: siteUrl,
    siteName: "AI Tech Brief",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tech Brief - 1단 요약 뉴스레터",
    description: "인공지능, 테크, 경제 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터",
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
      <body className={`${inter.className} min-h-screen flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-blue-500 selection:text-white`}>
        <Header />
        <main className="flex-1 w-full mx-auto max-w-3xl px-4 sm:px-6 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
