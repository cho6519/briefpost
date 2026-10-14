import db from '../src/lib/db';

interface ArticleRow {
  id: number;
  title: string;
  category: string;
  slug: string;
  len: number;
}

function audit() {
  const rows = db.prepare('SELECT id, title, category, slug, length(content) as len FROM articles ORDER BY id DESC').all() as ArticleRow[];
  console.log(`총 기사 수: ${rows.length}개`);
  
  // 카테고리별 집계
  const catMap = new Map<string, number>();
  for (const r of rows) {
    catMap.set(r.category, (catMap.get(r.category) || 0) + 1);
  }
  console.log('\n[카테고리별 기사 수]');
  for (const [cat, cnt] of catMap.entries()) {
    console.log(`- ${cat}: ${cnt}개`);
  }

  // 글자 수 기준 집계
  const under1500 = rows.filter((r) => r.len < 1500);
  const between1500And2500 = rows.filter((r) => r.len >= 1500 && r.len < 2500);
  const over2500 = rows.filter((r) => r.len >= 2500);
  console.log('\n[글자 수 분포]');
  console.log(`- 1,500자 미만 (Thin Content): ${under1500.length}개`);
  console.log(`- 1,500자 ~ 2,500자: ${between1500And2500.length}개`);
  console.log(`- 2,500자 이상 (고품질 롱폼): ${over2500.length}개`);

  if (under1500.length > 0) {
    console.log('\n[1,500자 미만 기사 목록]');
    for (const r of under1500) {
      console.log(`  [ID ${r.id}] [${r.category}] len: ${r.len} | ${r.title}`);
    }
  }

  // 비관련/테스트성 키워드 검사 (예: SaaS, AI, 테크, 음악, 피아니스트 등)
  const nonTargetKeywords = [
    'SaaS', 'B2B', 'LLM', 'AI', '클래식', '피아니스트', '테크', 'IT', '개발자', '스타트업',
    'DeepMind', '오픈AI', 'GPT', 'GPU', '엔터프라이즈'
  ];
  
  console.log('\n[소상공인 5대 주제 외 비관련/테스트성 의심 기사]');
  const nonTargetArticles = rows.filter((r) => {
    return nonTargetKeywords.some((kw) => r.title.toLowerCase().includes(kw.toLowerCase()) || r.category.includes('테크'));
  });
  console.log(`비관련 의심 기사 총 ${nonTargetArticles.length}개:`);
  for (const r of nonTargetArticles) {
    console.log(`  [ID ${r.id}] [${r.category}] len: ${r.len} | ${r.title}`);
  }

  console.log('\n[최신 상위 10개 기사]');
  for (const r of rows.slice(0, 10)) {
    console.log(`  [ID ${r.id}] [${r.category}] len: ${r.len} | ${r.title}`);
  }
}

audit();
