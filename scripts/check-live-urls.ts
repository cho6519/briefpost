import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

const articles = db.prepare("SELECT id, slug, title FROM articles ORDER BY id DESC").all() as {
  id: number;
  slug: string;
  title: string;
}[];

console.log(`=== 라이브 프로덕션(https://www.briefpost.kr) 기사 URL 404 전수 조사 (최신 30개) ===`);

async function checkLiveUrls() {
  const targets = articles.slice(0, 30);
  const failures: { id: number; slug: string; title: string; status: number }[] = [];

  for (const a of targets) {
    const url = `https://www.briefpost.kr/news/${encodeURIComponent(a.slug)}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status !== 200) {
        failures.push({ id: a.id, slug: a.slug, title: a.title, status: res.status });
        console.error(`❌ [${res.status}] ${url} (${a.title.slice(0, 25)})`);
      } else {
        console.log(`✅ [200 OK] ${a.slug}`);
      }
    } catch (err: any) {
      console.error(`⚠️ [FETCH ERROR] ${url}: ${err.message}`);
    }
  }

  console.log(`\n결과 요약: 30개 중 실패 ${failures.length}건`);
  failures.forEach(f => console.log(`- [${f.status}] /news/${f.slug}: ${f.title}`));
}

checkLiveUrls();
