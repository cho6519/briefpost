import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-zinc-200 bg-white py-12 text-xs text-zinc-500 transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-serif font-black text-xs shadow-xs shadow-blue-500/20">
              B
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-bold text-zinc-900">
                Brief Post
              </span>
              <p className="text-[11px] text-zinc-500">
                소상공인을 위한 정책자금·지원금·세무·노무 실전 가이드 전문 미디어
              </p>
            </div>
          </div>

          {/* 4대 법적 규정 및 안내 페이지 네비게이션 */}
          <nav aria-label="바닥글 링크" className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11.5px]">
            <Link href="/about" className="text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
              매체 소개
            </Link>
            <span className="text-zinc-300 select-none">•</span>
            <Link href="/privacy" className="text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
              개인정보처리방침
            </Link>
            <span className="text-zinc-300 select-none">•</span>
            <Link href="/terms" className="text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
              이용약관
            </Link>
            <span className="text-zinc-300 select-none">•</span>
            <Link href="/contact" className="text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
              문의하기
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-zinc-100 pt-6 space-y-2.5 text-[11px] text-zinc-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p>© {currentYear} Brief Post. All rights reserved.</p>
            <p className="text-zinc-600 font-medium">
              기사 정정 및 제휴 문의:{" "}
              <a
                href="mailto:contact.briefpost@gmail.com"
                className="text-blue-600 hover:underline font-semibold"
              >
                contact.briefpost@gmail.com
              </a>
            </p>
          </div>
          <p className="text-[10.5px] text-zinc-400 leading-relaxed break-keep">
            발행·편집: Brief Post 편집팀 | 청소년보호책임자: 편집팀장 | 본 사이트는 소상공인 정책자금, 정부지원금, 세무·절세, 인건비·4대보험, 폐업·재기지원 등 소상공인 생태계에 직결된 핵심 공공 정책과 실전 가이드를 신속·정확하게 전달하는 독립 소상공인 정책 전문 브리핑 미디어입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
