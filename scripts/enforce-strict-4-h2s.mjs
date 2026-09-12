import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles ORDER BY id ASC").all();

console.log("=== Strict 4 H2s & Readability Enforcement ===");

for (const r of rows) {
  let text = r.content;

  // ID 26 전면 교정: 1 -> 2 -> 3 -> 4 순서 바로잡기
  if (r.id === 26) {
    text = `최근 원·달러 환율이 두 달 사이 250원 이상 급락하며 23개월 만에 최저 수준으로 떨어졌습니다. 이번 환율 급변동은 글로벌 통화 정책의 피벗(전환) 기대감과 복합적인 거시 지표 변화가 맞물린 결과로 해석됩니다.

원화 가치의 급격한 반등세가 이어지는 가운데, 이번 주 후반 발표될 미국의 8월 소비자물가지수(CPI) 결과가 환율의 추가 하락 여부를 결정지을 중대 분수령으로 부상하고 있습니다.

## 1. 주요 동향 및 환율 급락 배경

서울 외환시장에서 원·달러 환율은 장중 1,310원대 초반까지 내려앉으며 연중 최저치 기록을 경신했습니다. 이는 불과 두 달 전 1,400원선 돌파를 위협하던 국면과 비교하면 극적인 반전입니다.

미국의 경기 둔화 징후와 이에 따른 미 연방준비제도(Fed)의 '빅컷(0.50%p 금리 인하)' 가능성이 달러화 약세를 자극하면서 원화 가치를 빠르게 밀어 올렸습니다.

## 2. 금융시장 파급 효과 및 각계 반응

외환시장의 급변동은 수입 원자재 비중이 높은 기업들에게 숨통을 틔워주고 있지만, 수출 대기업들에게는 채산성 악화라는 이중의 파장을 낳고 있습니다.

### 시장의 기대와 우려: 물가 안정 vs 환율 과속
- **물가 안정 효과:** 달러 약세와 원화 강세는 국제 유가 및 수입 곡물 가격을 낮추어 국내 소비자 물가 안정에 긍정적으로 작용합니다.
- **수출 기업 채산성 압박:** 반도체, 자동차 등 주요 수출 기업의 달러 환산 매출 및 영업이익률이 감소할 수 있다는 우려가 제기됩니다.
- **외국인 투자자 자금 유입:** 환차익을 노린 글로벌 펀드 자금이 국내 증시 및 국채 시장으로 유입되며 금융시장 유동성이 보강되고 있습니다.

금융 전문가들은 "원화 강세의 속도가 지나치게 빠를 경우 경기 회복세를 지연시킬 수 있으므로 속도 조절이 필요하다"고 지적합니다.

## 3. 핵심 지표 및 수치 비교

이번 환율 변동 추이는 최근 2년간의 최고점 및 주요 경제 지표와 비교했을 때 뚜렷한 전환점을 보여줍니다.

### 주요 핵심 비교표

| 외환 및 금융 지표 | 2024년 고점 국면 | 현행 저점 수준 | 변동폭 및 시사점 |
| :--- | :--- | :--- | :--- |
| 원·달러 환율 | 1,400원선 육박 | 1,310원선 안착 | 90원~250원 급락 |
| 미 국채 10년물 금리 | 연 4.7%대 | 연 3.7%선 후퇴 | 금리 인하 기대 반영 |
| 달러 인덱스 (DXY) | 106p 상회 | 100p 초반 하회 | 글로벌 달러화 약세 |
| 외국인 순매수 규모 | 순매도 우위 | 채권·주식 순유입 전환 | 자본 시장 안정화 |

## 4. 향후 전망 및 체크포인트

외환시장의 향방은 이번 주 발표될 미국의 8월 CPI와 곧이어 열릴 FOMC 정례회의의 금리 결정에 따라 요동칠 가능성이 큽니다.

### 분수령은 미국 CPI 발표 및 금리 결정
- **8월 CPI 지표 발표:** 헤드라인 및 근원 물가 상승률이 시장 예상치(2.6%)를 밑돌 경우 연준의 금리 인하 폭이 확대될 수 있습니다.
- **연준 통화정책 기조:** 9월 FOMC에서 25bp와 50bp 인하 중 어떤 선택을 내리느냐에 따라 환율의 추가 하락 혹은 단기 기술적 반등이 결정됩니다.
- **외환당국 스무딩 오퍼레이션:** 급격한 일방 쏠림을 방지하기 위한 외환당국의 구두 개입 및 미세 조정 가능성에 유의해야 합니다.

환율 변동성에 노출된 기업과 투자자들은 결제 시점 분산과 환헤지 전략을 점검하고, 주요 거시 지표 발표를 주시해야 합니다.`;
  }

  // 1. 모든 비대제목 H2 (1~4번 번호가 없는 H2)를 H3으로 일괄 강등
  text = text.replace(/^##\s+(?![1-4]\.)(.*)$/gm, "### $1");

  // 2. 혹시나 남아있는 350자 초과 긴 문단 쪼개기
  const paragraphs = text.split(/\n\s*\n/);
  const refined = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      refined.push(trimmed);
      continue;
    }

    if (trimmed.length > 250) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [trimmed];
      let chunk = [];
      let len = 0;
      for (const s of sentences) {
        chunk.push(s.trim());
        len += s.length;
        if (chunk.length >= 2 && len > 140) {
          refined.push(chunk.join(" "));
          chunk = [];
          len = 0;
        }
      }
      if (chunk.length > 0) {
        refined.push(chunk.join(" "));
      }
    } else {
      refined.push(trimmed);
    }
  }

  text = refined.join("\n\n");

  // 3. 줄바꿈 정리
  text = text
    .replace(/\s*##\s+/g, "\n\n## ")
    .replace(/\s*###\s+/g, "\n\n### ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // DB 갱신
  db.prepare("UPDATE articles SET content = ? WHERE id = ?").run(text, r.id);
}

console.log("=== Strict 4 H2s & Readability Enforcement 완료 ===");
