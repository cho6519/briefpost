import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 (Privacy Policy) | Brief Post",
  description: "Brief Post의 개인정보처리방침 및 구글 애드센스 쿠키 수집, 이용자 권리 안내입니다.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-zinc-200 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
          개인정보처리방침
        </h1>
        <p className="text-xs text-zinc-500">
          시행일자: 2025년 1월 1일 | 최근 개정일자: 2026년 9월 12일
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 break-keep">
        <p>
          Brief Post(이하 &apos;사이트&apos;)는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            1. 수집하는 개인정보 항목 및 수집 방법
          </h2>
          <p>
            본 사이트는 별도의 회원가입 절차 없이 모든 기사와 콘텐츠를 자유롭게 열람할 수 있습니다. 다만, 서비스 이용 과정에서 서비스 개선, 비정상적인 트래픽 감지 및 보안을 위해 다음과 같은 정보가 자동으로 생성되어 수집될 수 있습니다:
          </p>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-1 text-xs sm:text-sm">
            <li>접속 IP 주소, 쿠키(Cookie), 방문 일시, 브라우저 종류 및 OS 정보, 서비스 이용 기록</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            2. 구글 애드센스(Google AdSense) 및 쿠키(Cookie) 운용 고지
          </h2>
          <p>
            본 사이트는 수익 창출 및 서비스 유지보수를 위해 구글(Google LLC)을 포함한 제3자 광고 사업자의 광고를 게재할 수 있습니다. 이와 관련하여 다음과 같은 정책이 적용됩니다:
          </p>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-2 text-xs sm:text-sm">
            <li>
              구글을 비롯한 서드파티 공급업체는 이용자가 본 웹사이트나 다른 웹사이트를 과거에 방문한 기록을 바탕으로 광고를 게재하기 위해 쿠키를 사용합니다.
            </li>
            <li>
              구글의 광고 쿠키 사용으로 인해 구글 및 파트너사는 이용자의 본 사이트 및 인터넷상의 다른 사이트 방문 정보를 바탕으로 관련성 높은 맞춤형 광고를 제공할 수 있습니다.
            </li>
            <li>
              이용자는{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold underline"
              >
                구글 광고 설정 페이지
              </a>
              를 방문하여 개인 맞춤 광고 게재를 비활성화(Opt-out)할 수 있습니다.
            </li>
            <li>
              또한,{" "}
              <a
                href="https://www.aboutads.info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold underline"
              >
                aboutads.info
              </a>
              를 방문하여 제3자 공급업체의 맞춤 광고용 쿠키 수집을 일괄 차단할 수 있습니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            3. 웹 브라우저의 쿠키 설정 거부 방법
          </h2>
          <p>
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 사용하시는 웹 브라우저의 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다:
          </p>
          <ul className="list-disc list-inside text-zinc-600 pl-2 space-y-1 text-xs sm:text-sm">
            <li><strong>Chrome:</strong> 웹브라우저 설정 &gt; 개인정보 보호 및 보안 &gt; 인터넷 사용 기록 삭제 또는 서드 파티 쿠키 차단</li>
            <li><strong>Safari:</strong> 환경설정 &gt; 크로스 사이트 추적 방지 및 모든 쿠키 차단</li>
            <li><strong>Edge:</strong> 설정 &gt; 쿠키 및 사이트 권한 &gt; 쿠키 및 사이트 데이터 관리 및 삭제</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            4. 개인정보의 보유 및 파기
          </h2>
          <p>
            본 사이트는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 안전하게 삭제합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-900 border-l-3 border-blue-600 pl-2.5">
            5. 개인정보 보호책임자 및 문의처
          </h2>
          <p>
            본 사이트의 개인정보 보호 및 고충 처리를 위한 책임자는 다음과 같습니다:
          </p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs sm:text-sm space-y-1 text-zinc-600">
            <p>• <strong>담당 부서:</strong> Brief Post 편집국</p>
            <p>• <strong>개인정보 보호책임자:</strong> 편집팀장</p>
            <p>• <strong>이메일 문의:</strong> contact.briefpost@gmail.com</p>
          </div>
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
