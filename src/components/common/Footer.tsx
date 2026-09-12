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
                핵심 뉴스를 신속·정확하게 전달하는 정책·경제 전문 브리핑 미디어
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
            발행·편집: Brief Post 편집팀 | 청소년보호책임자: 편집팀장 | 본 사이트는 공공 포털 및 신뢰도 높은 공개 뉴스를 기반으로 전문적인 편집 및 심층 분석을 거쳐 독자에게 유용한 정보를 신속하게 전달하는 독립 뉴스레터 미디어입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
