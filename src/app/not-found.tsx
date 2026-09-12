import Link from "next/link";

export const metadata = {
  title: "페이지를 찾을 수 없습니다",
  description: "요청하신 기사나 페이지가 존재하지 않거나 주소가 변경되었습니다.",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-3xl font-black shadow-xs">
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 leading-relaxed break-keep">
          요청하신 페이지가 삭제되었거나, 주소가 잘못 입력되었을 수 있습니다.
          아래 버튼을 눌러 최신 뉴스 브리핑 목록으로 이동해 보세요.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-blue-500/25 hover:opacity-95 transition-all"
        >
          <span>←</span>
          <span>Brief Post 홈으로 이동</span>
        </Link>
      </div>
    </div>
  );
}
