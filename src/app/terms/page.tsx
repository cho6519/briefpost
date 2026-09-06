export const metadata = {
  title: "이용약관",
  description: "Brief Post 서비스의 이용약관 안내입니다.",
};

export default function TermsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        이용약관 및 면책조항
      </h1>
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-2">
          1. 목적 및 서비스 제공
        </h2>
        <p>
          본 약관은 Brief Post(이하 &apos;사이트&apos;)가 제공하는 핵심 뉴스레터 요약 정보 서비스의 이용 조건을 규정합니다.
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-4">
          2. 콘텐츠 및 지식재산권
        </h2>
        <p>
          사이트에서 제공하는 뉴스 기사 요약본은 정보 전달을 목적으로 제공되며, 각 기사의 원문 저작권은 해당 언론사 및 원출처에 귀속됩니다. 사이트는 가능한 한 원출처 링크를 명기합니다.
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-4">
          3. 면책조항
        </h2>
        <p>
          본 사이트에 수록된 정보의 완전성이나 정확성에 대해 보증하지 않으며, 해당 정보를 바탕으로 한 판단 및 투자 등에 대한 최종 책임은 이용자 본인에게 있습니다.
        </p>
      </div>
    </article>
  );
}
