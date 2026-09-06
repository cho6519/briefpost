import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 py-12 text-xs text-zinc-500 transition-colors">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Brief Post
            </span>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-500">
              핵심 뉴스를 3줄 요약으로 빠르게 전달하는 1단 뉴스레터
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              홈
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              개인정보처리방침
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              이용약관
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-6 text-center sm:text-left text-[11px] text-zinc-600 dark:text-zinc-500">
          <p>© {currentYear} Brief Post. All rights reserved.</p>
          <p className="mt-1 text-[10px]">
            본 사이트의 기사는 공공 및 공개된 테크 뉴스를 기반으로 자동 또는 준자동 생성 및 요약된 콘텐츠가 포함되어 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
