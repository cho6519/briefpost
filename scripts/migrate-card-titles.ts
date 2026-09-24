import Database from 'better-sqlite3';
import path from 'path';
import { cleanseCardTitle } from '../src/lib/articleValidator';

const dbPath = path.join(process.cwd(), 'data', 'news.db');
const db = new Database(dbPath);

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  card_title: string | null;
}

function runMigration() {
  console.log('=== [카드뉴스 타이틀(card_title) 전수 일괄 정제 시작] ===');
  
  const articles = db.prepare('SELECT id, slug, title, card_title FROM articles').all() as ArticleRow[];
  console.log(`총 대상 기사 수: ${articles.length}건`);

  const updateStmt = db.prepare('UPDATE articles SET card_title = ? WHERE id = ?');
  
  let updatedCount = 0;
  
  const updateMany = db.transaction((rows: ArticleRow[]) => {
    for (const article of rows) {
      const originalCardTitle = article.card_title || article.title;
      const cleaned = cleanseCardTitle(originalCardTitle);

      if (article.card_title !== cleaned) {
        updateStmt.run(cleaned, article.id);
        updatedCount++;
        console.log(`[UPDATE] ${article.slug}`);
        console.log(`   기존: "${article.card_title || '(없음)'}"`);
        console.log(`   변경: "${cleaned}"`);
      }
    }
  });

  updateMany(articles);

  // 최적화 실행
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  
  console.log(`\n=== [마이그레이션 완료] ===`);
  console.log(`총 업데이트된 기사: ${updatedCount}건 / 전체: ${articles.length}건`);
}

runMigration();
