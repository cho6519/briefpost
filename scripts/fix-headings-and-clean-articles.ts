import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

console.log("=== DB 기사 본문 대제목(H태그) 및 찌꺼기 텍스트 전수 정제 시작 ===");

const articles = db.prepare("SELECT id, slug, title, category, content FROM articles").all() as {
  id: number;
  slug: string;
  title: string;
  category: string;
  content: string;
}[];

let updatedCount = 0;

for (const a of articles) {
  let content = a.content;
  const original = content;

  // 1. 단독 빈 헤딩 기호(#, ##, ### 등 단독 줄) 완전 제거
  content = content.replace(/^\s*#{1,6}\s*$/gm, "");

  // 2. 대제목 바로 밑에 붙어있는 대제목 꼬리 찌꺼기 텍스트 제거 (예: '및 수치 비교', '및 향후 일정')
  const lines = content.split("\n");
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed && !trimmed.startsWith("#")) {
      let prevH2: string | null = null;
      for (let j = cleanedLines.length - 1; j >= 0; j--) {
        const pTrim = cleanedLines[j].trim();
        if (pTrim === "") continue;
        if (pTrim.startsWith("## ")) {
          prevH2 = pTrim;
        }
        break;
      }

      if (prevH2) {
        const headingText = prevH2.replace(/^##\s+[0-9]+\.\s*/, "").trim();
        if (headingText.includes(trimmed) && trimmed.length >= 3) {
          console.log(`[Article ${a.id}] 대제목 중복 찌꺼기 단락 제거: "${trimmed}" (상단 헤딩: ${prevH2})`);
          continue;
        }
        if (/^및\s+[가-힣\s]{2,15}$/.test(trimmed) && headingText.includes("및")) {
          console.log(`[Article ${a.id}] 정규식 매칭 중복 찌꺼기 단락 제거: "${trimmed}" (상단 헤딩: ${prevH2})`);
          continue;
        }
      }
    }
    cleanedLines.push(line);
  }

  content = cleanedLines.join("\n");

  // 3. 기사 8, 24번 헤딩 역순(1 -> 2 -> 4 -> 3) 배치 교정
  if (a.id === 8 || a.id === 24) {
    const sections = content.split(/(?=\n##\s+)/);
    const sec1 = sections.find((s) => s.includes("## 1."));
    const sec2 = sections.find((s) => s.includes("## 2."));
    const sec3 = sections.find((s) => s.includes("## 3."));
    const sec4 = sections.find((s) => s.includes("## 4."));

    if (sec1 && sec2 && sec3 && sec4) {
      const introIdx = content.indexOf("## 1.");
      const intro = introIdx > 0 ? content.slice(0, introIdx).trim() : "";
      content = `${intro ? intro + "\n\n" : ""}${sec1.trim()}\n\n${sec2.trim()}\n\n${sec3.trim()}\n\n${sec4.trim()}`;
      console.log(`[Article ${a.id}] 섹션 3, 4 순서 정상화 (1 -> 2 -> 3 -> 4)`);
    }
  }

  // 4. 본문 맥락에 부합하는 자연스러운 대제목으로 보정
  if (a.id === 37) {
    content = content.replace("## 2. 기술·시장적 파급 효과", "## 2. 경제적 파급 효과 및 시장 영향");
  }
  if (a.id === 38) {
    content = content.replace("## 2. 기술·시장적 파급 효과", "## 2. 부동산 시장 파급 효과 및 가격 동향");
  }
  if (a.id === 39) {
    content = content.replace("## 1. 핵심 개요 및 주요 쟁점", "## 1. 지원 사업 개요 및 추진 배경");
  }
  if (a.id === 40) {
    content = content.replace("## 1. 핵심 개요 및 주요 쟁점", "## 1. 지원 사업 개요 및 추진 배경");
  }

  // 5. 연속된 빈 줄 2개 초과 방지
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  if (content !== original) {
    db.prepare("UPDATE articles SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(
      content,
      a.id
    );
    updatedCount++;
    console.log(`[OK] Article ${a.id} (${a.slug}) 업데이트 완료`);
  }
}

console.log(`=== 전체 36건 중 ${updatedCount}건 정제 및 DB 반영 완료 ===`);
