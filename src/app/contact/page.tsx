import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의하기 (Contact Us) | Brief Post",
  description: "Brief Post에 대한 기사 정정 요청, 보도자료 배포, 제휴 제안 및 독자 의견을 접수하는 공식 문의 창구입니다.",
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-12 space-y-10">
      {/* 헤더 섹션 */}
      <header className="space-y-4 border-b border-zinc-200 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/80">
          COMMUNICATION DESK
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 leading-snug">
          독자 피드백 및 기사 문의 (Contact Us)
        </h1>
        <p className="text-base text-zinc-600 leading-relaxed break-keep">
          Brief Post는 독자 여러분의 소중한 의견과 피드백을 기반으로 더욱 정교하고 신뢰받는 브리핑을 제공합니다. 기사 정정 요청이나 제휴 문의는 아래 공식 채널을 이용해 주시기 바랍니다.
        </p>
      </header>

      {/* 1. 공식 이메일 창구 */}
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold">
            ✉
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">공식 피드백 및 제휴 수신함</h2>
            <p className="text-xs text-zinc-500">모든 문의는 접수 순서대로 신속하게 검토됩니다.</p>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="mailto:contact.briefpost@gmail.com"
            className="inline-flex items-center gap-2 text-lg sm:text-xl font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            contact.briefpost@gmail.com
          </a>
        </div>
      </section>

      {/* 2. 문의 유형별 안내 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 border-l-4 border-blue-600 pl-3">
          주요 문의 분야
        </h2>
        <div className="space-y-4 text-sm sm:text-base text-zinc-700 leading-relaxed">
          <div className="rounded-xl border border-zinc-200 p-4 space-y-1">
            <h3 className="font-bold text-zinc-900">1) 기사 팩트체크 및 정정·반론 요청</h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              발행된 브리핑 내용 중 사실과 다르거나 보완이 필요한 부분이 있을 경우, 해당 기사의 제목 또는 URL과 함께 관련 근거 자료를 보내주시면 편집팀 검토 후 즉시 조치합니다.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 space-y-1">
            <h3 className="font-bold text-zinc-900">2) 정부 부처·기관 보도자료 배포 제안</h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              공공 정책, 복지 제도, 부동산·금융 정책 관련 보도자료 및 공지사항을 수신하여 심층 브리핑 자료로 적극 검토합니다.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 space-y-1">
            <h3 className="font-bold text-zinc-900">3) 콘텐츠 제휴 및 비즈니스 협력</h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              Brief Post의 1단 뉴스레터 포맷을 활용한 제휴, 데이터 연동, 비즈니스 협업 제안을 환영합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 3. 처리 및 회신 원칙 */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-xs sm:text-sm text-zinc-600 leading-relaxed">
        <p className="font-bold text-zinc-800">
          ※ 회신 안내
        </p>
        <p>
          보내주신 의견은 접수일 기준 영업일 24~48시간 이내에 담당자가 직접 확인 후 회신드리고 있습니다. 단, 광고성 스팸이나 관련 없는 홍보물에는 회신하지 않을 수 있습니다.
        </p>
        <div className="pt-2 flex items-center gap-4 text-xs">
          <Link href="/about" className="text-blue-600 hover:underline font-medium">
            매체 소개 보기
          </Link>
          <span className="text-zinc-300">•</span>
          <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
            개인정보처리방침
          </Link>
          <span className="text-zinc-300">•</span>
          <Link href="/terms" className="text-blue-600 hover:underline font-medium">
            이용약관
          </Link>
        </div>
      </section>
    </article>
  );
}
