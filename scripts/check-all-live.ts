import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

const articles = db.prepare("SELECT id, slug, title FROM articles ORDER BY id DESC").all() as {
  id: number;
  slug: string;
  title: string;
}[];

console.log(`=== 전체 ${articles.length}건 기사 라이브 404 전수 점검 시작 ===`);

async function checkAll() {
  const failures: any[] = [];
  let checked = 0;

  for (const a of articles) {
    checked++;
    const url = `https://www.briefpost.kr/news/${encodeURIComponent(a.slug)}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status !== 200) {
        failures.push({ id: a.id, slug: a.slug, title: a.title, status: res.status });
        console.error(`❌ [${res.status}] #${checked} ${a.slug} (${a.title.slice(0, 25)})`);
      } else {
        if (checked % 10 === 0 || checked === articles.length) {
          console.log(`진행 중... ${checked}/${articles.length} 완료`);
        }
      }
    } catch (err: any) {
      failures.push({ id: a.id, slug: a.slug, title: a.title, status: 0, error: err.message });
      console.error(`⚠️ [FETCH ERROR] ${a.slug}: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`전체 ${articles.length}건 검사 완료 | 실패(404 등): ${failures.length}건`);
  console.log(`========================================`);
  failures.forEach(f => console.log(`- [${f.status}] /news/${f.slug}: ${f.title}`));
}

checkAll();
