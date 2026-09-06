// scripts/test-cron-auth.mjs
import { NextRequest } from "next/server.js";

// 간단한 독립 단위 검증 (NextRequest & Header & Bearer 토큰)
console.log("=== CRON_SECRET 인증 검증 로직 자체 테스트 ===");

const CRON_SECRET = "test-secret-key-12345";

function verify(req) {
  const authHeader = req.headers.get("authorization");
  const expectedAuthHeader = `Bearer ${CRON_SECRET}`;
  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get("secret");

  if (authHeader === expectedAuthHeader || secretParam === CRON_SECRET) {
    return { authorized: true };
  }
  return { authorized: false, status: 401 };
}

// 1. 헤더 없음
const req1 = new NextRequest("http://localhost:3000/api/cron/publish-articles");
console.log("1. 헤더 없음 차단:", !verify(req1).authorized ? "성공 (차단)" : "실패");

// 2. 오답 헤더
const req2 = new NextRequest("http://localhost:3000/api/cron/publish-articles", {
  headers: { authorization: "Bearer invalid" },
});
console.log("2. 잘못된 헤더 차단:", !verify(req2).authorized ? "성공 (차단)" : "실패");

// 3. 정답 Bearer 헤더
const req3 = new NextRequest("http://localhost:3000/api/cron/publish-articles", {
  headers: { authorization: `Bearer ${CRON_SECRET}` },
});
console.log("3. Bearer 토큰 통과:", verify(req3).authorized ? "성공 (통과)" : "실패");

// 4. ?secret= 파라미터
const req4 = new NextRequest(`http://localhost:3000/api/cron/publish-articles?secret=${CRON_SECRET}`);
console.log("4. ?secret= 파라미터 통과:", verify(req4).authorized ? "성공 (통과)" : "실패");
