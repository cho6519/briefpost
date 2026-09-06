import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#09090b] py-12 text-xs text-zinc-500 transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-white font-serif font-black text-xs">
              B
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-bold text-zinc-900 dark:text-zinc-200">
                Brief Post
              </span>
              <p className="text-[11px] text-zinc-500">
                핵심 뉴스를 3줄 요약으로 빠르게 전달하는 1단 뉴스레터
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              홈
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700 select-none">•</span>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              개인정보처리방침
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700 select-none">•</span>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              이용약관
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200/50 dark:border-zinc-800/60 pt-6 text-center sm:text-left text-[11px] text-zinc-500">
          <p>© {currentYear} Brief Post. All rights reserved.</p>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">
            본 사이트의 기사는 공공 및 공개된 뉴스를 기반으로 인공지능 요약 및 분석을 거쳐 자동 송출됩니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
