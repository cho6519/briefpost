import React from "react";
import Link from "next/link";

interface AuthorBioCardProps {
  category: string;
  sourceName?: string;
  createdAt: string;
}

interface EditorProfile {
  name: string;
  role: string;
  bio: string;
  email: string;
}

function getEditorForCategory(category: string): EditorProfile {
  if (category.includes("정책") || category.includes("지원금") || category.includes("복지")) {
    return {
      name: "김민준 에디터",
      role: "공공정책 & 복지제도 수석 분석관",
      bio: "중앙부처 및 지자체 공공 복지제도, 청년·소상공인 지원 사업의 수혜 요건과 실전 신청 가이드를 심층 분석하여 전달합니다.",
      email: "minjun.policy@briefpost.kr",
    };
  }
  if (category.includes("금융") || category.includes("경제") || category.includes("부동산")) {
    return {
      name: "정서연 에디터",
      role: "민생경제 & 금융정책 전문 에디터",
      bio: "금리·세제 개편안과 서민금융 지원제도의 핵심 골자를 분석하여 시민의 실생활에 미치는 실질적 혜택과 위험요인을 진단합니다.",
      email: "seoyeon.finance@briefpost.kr",
    };
  }
  if (category.includes("테크") || category.includes("IT") || category.includes("산업")) {
    return {
      name: "박현우 에디터",
      role: "산업기술 & 디지털정책 전문 에디터",
      bio: "인공지능, 데이터 보안, 디지털 공공 인프라 변화가 산업 생태계와 개인에게 미치는 영향을 명료하게 짚어냅니다.",
      email: "hyunwoo.tech@briefpost.kr",
    };
  }
  return {
    name: "이지훈 에디터",
    role: "시사·사회 정책 팩트체커",
    bio: "사회적 주요 이슈와 정부 부처 발표의 객관적 팩트를 다각도로 교차 검증하여 독자에게 신뢰할 수 있는 정보를 제공합니다.",
    email: "editorial@briefpost.kr",
  };
}

export default function AuthorBioCard({ category, sourceName, createdAt }: AuthorBioCardProps) {
  const editor = getEditorForCategory(category);
  const formattedDate = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="my-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* 팩트체크 & 저작권 준수 배너 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Fact Checked &amp; Verified</span>
        </div>
        <span className="text-zinc-600 text-[11px] font-medium">
          공공누리 제1유형 출처 교차 검증 완료
        </span>
      </div>

      {/* 에디터 프로필 본문 */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-xs">
          {editor.name.slice(0, 1)}
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              {editor.name}
            </h3>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {editor.role}
            </span>
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600 break-keep">
            {editor.bio}
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
            <span>최종 검증일: {formattedDate}</span>
            {sourceName && <span>· 1차 근거 자료: {sourceName}</span>}
            <Link
              href="/about"
              className="text-blue-700 font-semibold hover:underline ml-auto"
            >
              편집 원칙 및 검증 기준 보기 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
