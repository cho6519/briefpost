import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 구글 애드센스 공식 ads.txt 동적 라우트
 * - 환경변수(NEXT_PUBLIC_ADSENSE_CLIENT_ID 또는 ADSENSE_PUB_ID) 설정 시 자동으로 본인 ID 바인딩
 */
export async function GET() {
  const rawClientId =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ||
    process.env.ADSENSE_PUB_ID ||
    "";

  // ca-pub-1234567890123456 또는 pub-1234567890123456 에서 숫자 부분 추출
  const pubMatch = rawClientId.match(/pub-(\d+)/i);
  const pubId = pubMatch ? `pub-${pubMatch[1]}` : "pub-XXXXXXXXXXXXXXXX";

  const content = `# Google AdSense ads.txt for Brief Post\ngoogle.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
