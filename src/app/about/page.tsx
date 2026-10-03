import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "매체 소개 (About Us) | Brief Post",
  description: "공공 정책, 경제, 금융, 주거 등 핵심 이슈를 전문적이고 신속하게 전달하는 공공.경제 정책 전문 브리핑 Brief Post의 운영 목적과 편집 원칙을 소개합니다.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-12 space-y-10">
      {/* 헤더 섹션 */}
      <header className="space-y-4 border-b border-zinc-200 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/80">
          EDITORIAL MISSION
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 leading-snug">
          바쁜 현대인을 위한 명확한 나침반,<br className="hidden sm:inline" /> Brief Post 미디어 소개
        </h1>
        <p className="text-base text-zinc-600 leading-relaxed break-keep">
          Brief Post(브리프 포스트)는 방대한 정보 속에서 독자에게 실질적인 도움이 되는 공공 정책, 경제, 주거, 금융 정보를 선별하여 핵심을 전달하는 전문 뉴스 브리핑 미디어입니다.
        </p>
      </header>

      {/* 1. 설립 목적 및 가치 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 border-l-4 border-blue-600 pl-3">
          1. 발행 목적 및 핵심 가치
        </h2>
        <p className="text-zinc-700 leading-relaxed text-sm sm:text-base break-keep">
          정보 과잉의 시대에서 시민들에게 가장 중요한 것은 &apos;나에게 영향을 주는 실질적 정보가 무엇인가&apos;입니다. Brief Post는 수많은 보도자료와 통계, 법률 개정안 중에서 시민의 일상과 직결된 청년·주거 정책, 금융·세제 개편, 거시경제 지표를 면밀히 모니터링하여 알기 쉬운 언어로 재구성합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-1.5">
            <span className="text-blue-600 font-bold text-sm">01. 팩트 기반 검증</span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              공식 정부 부처 보도자료 및 공신력 있는 언론 보도를 교차 확인하여 검증된 사실만을 다룹니다.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-1.5">
            <span className="text-blue-600 font-bold text-sm">02. 3줄 핵심 브리핑</span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              기사의 본론에 앞서 1분 만에 맥락을 파악할 수 있는 고밀도 3줄 요약을 우선 제공합니다.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-1.5">
            <span className="text-blue-600 font-bold text-sm">03. 심층 가이드 & 표</span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              주요 변경점, 지원 대상, 신청 자격 등을 일목요연한 비교 표와 단락으로 알기 쉽게 분석합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 2. 편집 원칙 (Editorial Guidelines) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 border-l-4 border-blue-600 pl-3">
          2. 편집 및 보도 원칙 (Editorial Principles)
        </h2>
        <ul className="space-y-3 text-sm sm:text-base text-zinc-700 leading-relaxed">
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-blue-600 shrink-0">•</span>
            <span>
              <strong>공정성과 중립성 유지:</strong> 특정 정당, 단체, 기업의 이해관계에 치우치지 않고 객관적인 사실과 제도적 영향 위주로 서술합니다.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-blue-600 shrink-0">•</span>
            <span>
              <strong>출처 표기 및 투명성:</strong> 모든 브리핑 콘텐츠는 출처(정부 부처, 통계청, 각 언론사 등)를 원문 링크와 함께 명확히 밝힙니다.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-blue-600 shrink-0">•</span>
            <span>
              <strong>신속한 정정보도 준수:</strong> 사실과 다른 정보가 발견될 경우 지체 없이 수정하며, 정정 내역을 투명하게 공지합니다.
            </span>
          </li>
        </ul>
      </section>

      {/* 3. 편집국 전문 에디터 소개 (E-E-A-T 저자 전문성) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 border-l-4 border-blue-600 pl-3">
            3. 편집국 전문 에디터 및 팩트체크 팀
          </h2>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            EDITORIAL DESK
          </span>
        </div>
        <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed break-keep">
          Brief Post의 모든 콘텐츠는 각 분야 전문 에디터의 1차 기획 및 공공기관 팩트 교차 검증을 거쳐 독자에게 투명하게 송출됩니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 에디터 1 */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                김
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm sm:text-base">김민준 에디터</h3>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  공공정책 & 복지제도 수석 분석관
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-keep">
              중앙부처 및 지자체 공공 복지제도, 청년·소상공인 지원 사업의 수혜 요건과 실전 신청 가이드를 심층 분석하여 전달합니다.
            </p>
            <p className="text-[11px] font-mono text-zinc-400">minjun.policy@briefpost.kr</p>
          </div>

          {/* 에디터 2 */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                정
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm sm:text-base">정서연 에디터</h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  민생경제 & 금융정책 전문 에디터
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-keep">
              금리·세제 개편안과 서민금융 지원제도의 핵심 골자를 분석하여 시민의 실생활에 미치는 실질적 혜택과 위험요인을 진단합니다.
            </p>
            <p className="text-[11px] font-mono text-zinc-400">seoyeon.finance@briefpost.kr</p>
          </div>

          {/* 에디터 3 */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                박
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm sm:text-base">박현우 에디터</h3>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  산업기술 & 디지털정책 전문 에디터
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-keep">
              인공지능, 데이터 보안, 디지털 공공 인프라 변화가 산업 생태계와 개인에게 미치는 영향을 명료하게 짚어냅니다.
            </p>
            <p className="text-[11px] font-mono text-zinc-400">hyunwoo.tech@briefpost.kr</p>
          </div>

          {/* 에디터 4 */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-zinc-800 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                이
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm sm:text-base">이지훈 팩트체커</h3>
                <span className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                  시사·사회 정책 팩트체크 팀장
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-keep">
              사회적 주요 이슈와 정부 부처 공식 보도자료의 팩트를 다각도로 교차 검증하고 신속한 정정보도 시스템을 총괄합니다.
            </p>
            <p className="text-[11px] font-mono text-zinc-400">editorial@briefpost.kr</p>
          </div>
        </div>
      </section>

      {/* 4. 발행처 정보 및 연락처 */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="text-base font-bold text-zinc-900">
          Brief Post 미디어 운영 안내
        </h3>
        <div className="space-y-1.5 text-xs sm:text-sm text-zinc-600 leading-relaxed">
          <p>• <strong>발행 매체명:</strong> Brief Post (브리프 포스트)</p>
          <p>• <strong>발행·편집인:</strong> Brief Post 편집국 (공동대표)</p>
          <p>• <strong>청소년보호책임자:</strong> 이지훈 편집팀장</p>
          <p>• <strong>기사 정정 및 고충처리:</strong> contact.briefpost@gmail.com</p>
          <p>• <strong>콘텐츠 이용 허락:</strong> 공공누리 제1유형 원칙 및 출처 명시 기반 자유 인용 허용</p>
        </div>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>정정 요청 및 문의하기 페이지 바로가기</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </article>
  );
}
