import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 이용약관 (Terms of Service) | Brief Post",
  description: "Brief Post 미디어의 서비스 이용약관, 저작권 안내 및 법적 책임 한계 고지입니다.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-zinc-200 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
          서비스 이용약관
        </h1>
        <p className="text-xs text-zinc-500">
          시행일자: 2025년 1월 1일 | 최근 개정일자: 2026년 9월 12일
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 break-keep">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제1조 (목적)
          </h2>
          <p>
            본 약관은 Brief Post(이하 &apos;사이트&apos;)가 제공하는 웹사이트 기반의 공공 정책, 경제, 주거, 금융 등 핵심 뉴스 브리핑 서비스(이하 &apos;서비스&apos;)의 이용 조건 및 절차, 권리와 의무 등 기본적인 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제2조 (용어의 정의)
          </h2>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-1 text-xs sm:text-sm">
            <li>&apos;사이트&apos;란 Brief Post가 정보 및 서비스를 이용자에게 제공하기 위하여 운영하는 웹사이트를 의미합니다.</li>
            <li>&apos;이용자&apos;란 본 사이트에 접속하여 본 약관에 따라 사이트가 제공하는 브리핑 콘텐츠 및 제반 서비스를 열람 또는 이용하는 자를 의미합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제3조 (저작권 및 지식재산권의 귀속)
          </h2>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-2 text-xs sm:text-sm">
            <li>
              본 사이트가 자체 제작한 편집 저작물(3줄 요약, 분석 단락, 도표, UI 디자인 등)의 저작권은 사이트에 귀속됩니다.
            </li>
            <li>
              본 사이트에서 인용하거나 참조한 각 뉴스 기사의 원문 및 보도자료의 저작권은 해당 저작권자(원 언론사, 정부 부처 및 유관 기관)에 있습니다. 사이트는 정보의 투명성을 위해 출처 및 원문 링크를 명기하고 있습니다.
            </li>
            <li>
              이용자는 사이트의 사전 서면 승낙 없이 콘텐츠를 무단 전재, 복제, 배포, 판매하거나 영리 목적으로 이용할 수 없습니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제4조 (서비스의 변경 및 중단)
          </h2>
          <p>
            사이트는 기술적 사양의 변경이나 시스템 점검, 교체 등의 필요가 있는 경우 제공하는 서비스의 내용을 변경하거나 일시적으로 중단할 수 있으며, 이와 관련하여 불가피한 경우 사전 통지 없이 서비스가 중단될 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제5조 (면책 조항)
          </h2>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-2 text-xs sm:text-sm">
            <li>
              본 사이트에서 제공하는 브리핑 정보는 독자의 이해를 돕기 위한 참고 자료이며, 투자·법률·행정적 최종 의사결정을 대신할 수 없습니다.
            </li>
            <li>
              정부 정책, 금융 상품, 세제 관련 세부 요건은 관련 부처 및 기관의 최종 공고에 따라 변경될 수 있으므로, 이용자는 실행 전 반드시 공식 주관 기관의 최신 지침을 확인해야 합니다.
            </li>
            <li>
              사이트는 이용자가 서비스를 이용하여 기대하는 수익을 상실하거나 얻지 못한 것에 대하여 책임을 지지 않으며, 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            제6조 (관할 법원)
          </h2>
          <p>
            서비스 이용과 관련하여 분쟁이 발생할 경우 대한민국 법령을 준거법으로 하며, 관할 법원은 민사소송법에 따른 관할 법원으로 합니다.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-zinc-200">
        <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline">
          ← Brief Post 홈으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
