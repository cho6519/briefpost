export const metadata = {
  title: "개인정보처리방침",
  description: "Brief Post 서비스의 개인정보처리방침 안내입니다.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        개인정보처리방침
      </h1>
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>
          Brief Post(이하 &apos;사이트&apos;)는 이용자의 개인정보를 중요시하며, &apos;개인정보 보호법&apos; 등 관련 법령을 준수하고 있습니다.
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-4">
          1. 수집하는 개인정보 항목 및 수집 방법
        </h2>
        <p>
          사이트는 별도의 회원가입 없이 콘텐츠를 열람할 수 있으며, 서비스 이용 과정에서 쿠키, 방문 일시, IP 주소 등의 로그 정보가 자동으로 생성되어 수집될 수 있습니다.
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-4">
          2. 구글 애드센스 및 서드파티 쿠키
        </h2>
        <p>
          본 사이트는 구글(Google LLC)을 포함한 제3자 광고 사업자의 광고를 게재할 수 있습니다. 구글은 사용자의 이전 방문 기록 등을 바탕으로 맞춤형 광고를 게재하기 위해 쿠키(Cookie)를 사용할 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-4">
          3. 개인정보의 보유 및 파기
        </h2>
        <p>
          수집된 로그 데이터는 법령이 정한 목적 이외의 용도로 사용되지 않으며, 보유 목적 달성 시 지체 없이 파기합니다.
        </p>
      </div>
    </article>
  );
}
