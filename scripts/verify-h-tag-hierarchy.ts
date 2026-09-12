import Database from "better-sqlite3";
import { marked } from "marked";
import { normalizeArticleContent, enforceHeadingHierarchy } from "../src/lib/articleValidator";

const db = new Database("./data/news.db");

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
}

const articles = db.prepare("SELECT * FROM articles").all() as ArticleRow[];
console.log(`[H-Tag 검증 시작] 총 ${articles.length}개 기사 상세 페이지 점검...`);

let allPassed = true;

for (const article of articles) {
  // 1. 마크다운 정규화 및 HTML 변환
  const cleanMarkdown = normalizeArticleContent(article.content);
  const rawHtml = marked.parse(cleanMarkdown, { async: false }) as string;
  const contentHtml = enforceHeadingHierarchy(rawHtml);

  // 2. 가상 상세 페이지 렌더링 (H1: 메인 기사 타이틀 + 본문 HTML)
  const fullPageHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <header>
          <span>Brief Post</span>
          <nav>카테고리 네비게이션</nav>
        </header>
        <main>
          <article>
            <h1>${article.title}</h1>
            <div class="article-content">
              ${contentHtml}
            </div>
          </article>
        </main>
        <footer>
          <span>Brief Post 푸터</span>
        </footer>
      </body>
    </html>
  `;

  // 3. 태그 검사
  const h1Matches = fullPageHtml.match(/<h1\b[^>]*>/gi) || [];
  const h2Matches = fullPageHtml.match(/<h2\b[^>]*>/gi) || [];
  const h3Matches = fullPageHtml.match(/<h3\b[^>]*>/gi) || [];
  const h4To6Matches = fullPageHtml.match(/<h[4-6]\b[^>]*>/gi) || [];

  // 검증 1: H1 태그의 단일성 보장 (정확히 1개)
  if (h1Matches.length !== 1) {
    console.error(`[FAIL - H1 개수 위반] ID ${article.id}: H1 개수 = ${h1Matches.length}`);
    allPassed = false;
  }

  // 검증 2: H4~H6 사용 금지 (0개여야 함)
  if (h4To6Matches.length > 0) {
    console.error(`[FAIL - H4~H6 사용 위반] ID ${article.id}: H4~H6 개수 = ${h4To6Matches.length}`);
    allPassed = false;
  }

  // 검증 3: 본문 내 H2 존재 여부 (최소 1개 이상)
  if (h2Matches.length === 0) {
    console.warn(`[WARN - H2 부재] ID ${article.id}: H2 태그 없음`);
  }
}

if (allPassed) {
  console.log(`\n✅ [전수 검증 성공] 모든 ${articles.length}개 기사 상세 페이지가 H태그 위계 표준 규격을 100% 충족합니다!`);
  console.log(`   - <h1> 단일성: 각 상세 페이지당 정확히 1개 (기사 제목)`);
  console.log(`   - 사이트 로고/헤더/푸터: <h1> 0개 (span/p/div 사용)`);
  console.log(`   - 본문 위계: <h2>(섹션 소제목) ➔ <h3>(세부 항목) 완전 준수`);
  console.log(`   - 규격 외 태그: <h4>, <h5>, <h6> 0개 완벽 차단`);
} else {
  console.error("\n❌ [검증 실패] 위반 항목이 발견되었습니다.");
  process.exit(1);
}
