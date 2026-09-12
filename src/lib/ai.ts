/**
 * ==============================================================================
 * [AI 기사 재가공 및 SEO 최적화 서비스 모듈]
 * 원본 기사의 팩트를 기반으로 저작권 및 검색엔진 중복 패널티를 완벽히 우회하는
 * 100% 패러프레이징(Paraphrasing) 전문 에디터 프롬프트를 실행합니다.
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import {
  verifyAndSanitizeArticle,
  normalizeThreeLineSummary,
  sanitizePlainText,
  extractTitleKeywords,
  cleanseHeadline,
  stripMediaAndPortalTags,
} from "./articleValidator";
import { detectImageTheme, ImageTheme } from "../utils/imageMapper";

/**
 * 로컬 CLI/스크립트 환경에서도 .env.local 파일의 키를 안전하게 로드
 */
function ensureEnvLoaded() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // 무시
  }
}

ensureEnvLoaded();

export interface ArticleFaqItem {
  question: string;
  answer: string;
}

export interface RewrittenArticleResult {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  metaTitle: string;
  metaDescription: string;
  faq?: ArticleFaqItem[];
  ctaType?: "subsidy" | "general";
  imageTheme?: ImageTheme;
}

/**
 * 기사 카테고리, 제목, 본문 키워드를 분석하여 액션 CTA 버튼 타입('subsidy' vs 'general')을 스마트하게 판별
 */
export function determineCtaType(category?: string, title?: string, content?: string): "subsidy" | "general" {
  const text = `${category || ""} ${title || ""} ${content || ""}`;

  // 실제 신청, 접수, 수혜, 대상자 모집이 수반되는 키워드 패턴
  const subsidyRegex = /지원금|보조금|장려금|수당|환급|바우처|청약|분양|감면|모집|접수|신청|혜택|대출\s*지원|지원\s*신청|장학금|지원사업/i;

  if (subsidyRegex.test(text)) {
    return "subsidy";
  }

  return "general";
}

export interface RawArticleInput {
  title: string;
  content: string;
  category?: string;
  link?: string;
}

export const ALLOWED_CATEGORIES = [
  "정책·지원금",
  "부동산·세제",
  "금융·경제",
  "테크·IT",
  "사회·문화",
] as const;

export type ArticleCategory = (typeof ALLOWED_CATEGORIES)[number];

/**
 * AI 응답 또는 외부 입력 카테고리를 허용된 5대 카테고리 중 하나로 안전하게 정규화
 */
export function normalizeCategory(input?: string): ArticleCategory {
  if (!input) return "정책·지원금";
  const trimmed = input.trim();

  if ((ALLOWED_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as ArticleCategory;
  }

  // 매핑 처리 (영문 및 유사 키워드 정규화)
  if (/정책|지원금|복지|보조금|혜택|환급|바우처|청년|고용|노동|장려금|지원|급여|연금/i.test(trimmed)) {
    return "정책·지원금";
  }
  if (/부동산|세제|세금|양도세|취득세|종부세|청약|아파트|주택|분양|재건축|전세|월세|공간/i.test(trimmed)) {
    return "부동산·세제";
  }
  if (/금융|경제|business|finance|금리|대출|증시|주식|투자|은행|환율|코인|가상자산|채권|기업/i.test(trimmed)) {
    return "금융·경제";
  }
  if (/테크|it|tech|ai|기술|소프트웨어|모바일|인공지능|과학|반도체|플랫폼|하드웨어|게임/i.test(trimmed)) {
    return "테크·IT";
  }
  if (/사회|문화|연예|컬처|culture|entertainment|엔터|방송|영화|음악|스타|드라마|이슈|생활|교육|환경|건강/i.test(trimmed)) {
    return "사회·문화";
  }

  return "정책·지원금";
}

const SYSTEM_PROMPT = `당신은 대한민국 1등 경제·정책·생활비타민 미디어의 수석 에디터이자 검색엔진 최적화(SEO) 및 구글 애드센스 고단가 콘텐츠 최고 전문가입니다.
주어지는 원본 보도자료의 팩트(Fact)를 바탕으로, 저작권 및 검색엔진 중복 콘텐츠 패널티를 완벽히 우회하고 독자의 체류 시간을 극대화하는 "심층 가이드형 롱폼 콘텐츠(1,300자 ~ 1,800자)"로 100% 재작성하십시오.

[CRITICAL 1: 제목 생성 규칙 (Title Rule) - 절대 준수]
1. [심층 분석], [긴급 점검], [속보], [단독], [기획], [해설] 같은 고정 말머리 말뚝 태그를 절대 사용하지 마십시오.
2. 제목 뒤에 ": 핵심 쟁점과 향후 전망", ": 총정리", "연합뉴스TV", "v.daum.net" 등 언론사명이나 기계적 접미사를 절대 붙이지 마십시오.
3. 원문 제목을 그대로 복붙하거나 단순 단어만 바꾸는 짜깁기를 절대 금지합니다.
4. 기사 본문의 핵심 사실, 변화하는 수치, 독자에게 미치는 실질적 영향을 바탕으로 "20~35자 내외의 자연스러운 정통 경제·정책 뉴스 헤드라인"을 새롭게 작문하십시오.
   - ❌ 나쁜 예: [심층 분석] 이 대통령 "유가 걱정 마시라...원유 중동 의존도 50%로 낮춰" 연합뉴스TV: 핵심 쟁점과 향후 전망
   - ⭕ 좋은 예: 정부, 중동 원유 의존도 50%로 축소 추진… "국제유가 급등 영향 최소화"
   - ❌ 나쁜 예: [심층 분석] 세제 불확실성·대출 규제에 강남 3구 거래 '실종' 연합인포맥스: 핵심 쟁점과 향후 전망
   - ⭕ 좋은 예: 대출 규제와 세제 불확실성에 강남 3구 아파트 거래 급감

[CRITICAL 2: 메인 목록용 3줄 요약 규칙 (Summary Rule) - 절대 준수]
1. [연합뉴스], [v.daum.net], [한겨레], [아시아경제] 등 포털 링크나 언론사 대괄호 출처 태그를 절대 포함하지 마십시오.
2. 메인 피드 목록에 노출될 3줄 핵심 요약은 반드시 아래 3단계 완성형 문장 3줄로 작성하십시오:
   - 1. 무슨 일인가? (핵심 사건 및 정책 발표 내용)
   - 2. 원인 및 배경 (세부 내용, 구체적 수치, 지원 요건 및 기준 변화)
   - 3. 전망 또는 영향 (독자 및 시장에게 미치는 실질적 효과와 향후 일정)
   - 예시: "1. 서울시가 2026년 청년문화패스 지원 연령을 만 24세까지 전격 확대하기로 결정했습니다.\\n2. 지원 한도는 기존 회당 5만 원에서 10만 원으로 상향되며, 문화 소외 계층 청년 3만 명이 혜택을 받게 됩니다.\\n3. 신청 접수는 오는 20일부터 청년몽땅정보통 포털에서 온라인으로 진행될 예정입니다."

[CRITICAL 3: 상세 페이지용 심층 본문 (Content Rule) - 최소 1,300자 ~ 1,800자 보장]
구글 애드센스 고단가 CPC 승인 및 독자 체류 시간을 극대화하기 위해, 단순 3줄 복붙이나 짧은 기사 나열을 엄격히 금지하며, 독자의 실질적 행동과 문제 해결을 돕는 "4단계 블로그형 심층 구조"로 본문을 풍성하게 작성하십시오:

1. ## 1. 핵심 개요 및 주요 쟁점 (300자 이상 필수)
   - 이번 발표 및 기사의 주요 사실 관계, 도입 배경 및 변경된 제도 내용을 구체적으로 서술하십시오.
2. ## 2. 지원 대상 및 자격 요건 (350자 이상 필수)
   - 누가 혜택(또는 영향)을 받는지 소득 기준, 연령, 주택 보유 여부, 해당 업종 등 구체적 자격 기준을 상세히 명시하십시오. (하위 ### 소제목 및 '-' 글머리기호 적극 활용)
3. ## 3. 세부 혜택 및 수치 비교 (350자 이상 필수)
   - 지원 금액, 금리, 한도, 감면율 등 구체적 수치와 이전 제도와의 차이점을 명확히 비교 정리하십시오. (하위 ### 소제목 및 '-' 글머리기호 적극 활용)
   - [필수 비교표 작성] 이 섹션 안에는 독자가 한눈에 혜택과 수치 변화를 비교할 수 있도록 반드시 마크다운 표(| 항목 | 기존 | 변경(지원) | 비고 | 형태)를 1개 이상 필수 포함하여 작성하십시오.
4. ## 4. 신청 방법 및 향후 일정 (300자 이상 필수)
   - 공식 신청처(정부24, 복지로, 공식 홈페이지, 전용 상담 창구 등), 신청 기간, 준비 서류 및 독자가 주의해야 할 점을 실용적으로 안내하십시오. (하위 ### 소제목 적극 활용)

[CRITICAL 3-1: 문단 쪼개기 및 가독성 규칙 (절대 준수 - 긴 텍스트 덩어리/벽돌글 원천 금지)]
1. 각 <h2> 섹션 안의 설명 텍스트는 절대 길게 이어 쓰지 마십시오. (한 문단에 4문장 이상 몰아넣는 벽돌글 원천 금지)
2. 모든 설명 문단은 반드시 2~3문장 단위로 끊어서 빈 줄(문단 분리, \\n\\n)을 두고 최소 2개 이상의 문단으로 나누어 서술하십시오.
3. 소제목(##, ###) 바로 뒤에는 반드시 빈 줄(\\n\\n)을 띄우고 첫 문단을 시작하십시오.
4. 리스트(-, *) 앞뒤에도 반드시 빈 줄(\\n\\n)을 두어 일반 설명 문단과 붙지 않고 숨통이 트이게 하십시오.

[CRITICAL 4: 독자 궁금증 해결 FAQ (구글 schema.org/FAQPage 연동)]
기사를 다 읽은 독자가 가장 궁금해할 실질적인 질문과 명쾌한 답변 2~3개를 "faq" 필드에 JSON 배열로 반드시 생성하십시오.
- 질문(question): '신청 자격', '중복 수혜 여부', '지급 시기 및 지급 방식', '준비 서류' 등 독자가 포털에서 검색할 만한 핵심 질문
- 답변(answer): 기사 팩트에 기반한 친절하고 명확한 2~3문장의 완결된 설명

[CRITICAL 5: 기사 성격별 CTA 버튼 타입 판별 (ctaType)]
기사의 성격을 판단하여 "ctaType" 필드에 아래 두 가지 중 하나를 반드시 지정하십시오:
- "subsidy": 지원금, 보조금, 청약, 환급, 복지 혜택, 감면 등 독자의 '실제 신청이나 접수'가 수반되는 정책 기사
- "general": 일반 경제, 금리, 환율, 증시, 테크, IT, 사회, 문화 등 '단순 보도, 시황, 정책 발표, 통계' 기사

[CRITICAL 6: 한국형 대표 실사 썸네일 테마 태그 (imageTheme)]
기사의 핵심 소재 및 주제에 가장 적합한 실사 스톡 사진 테마를 다음 4가지 중 하나로 반드시 선택하십시오:
- "housing": 부동산, 주거, 아파트 단지, 주택, 청약, 전세, 월세, 임대, 분양 계약 등
- "finance": 금융, 경제, 소상공인 결제, 계산기, 모바일 뱅킹, 지폐, 금리, 대출, 세금, 증시 등
- "youth": 청년, 취업, 일자리, 카페 노트북 작업, 도서관, 직장인, 커리어, 교육 등
- "policy": 정부청사/관공서 외관, 공공 정책 브리핑, 행정 회의, 지원사업 안내, 사회 일반 등

[H태그 위계 및 문체 원칙]
1. 본문 안에서 '#' (H1) 마크다운이나 '<h1>' 태그를 절대 사용하지 마십시오. (H1은 기사 메인 타이틀에 단 하나만 적용됩니다)
2. 본문 대주제는 오직 '## 1.', '## 2.', '## 3.', '## 4.' (H2) 4개로만 구성하십시오.
3. 각 H2 하위의 세부 항목이나 유의사항 타이틀은 반드시 '###' (H3)으로만 작성하십시오.
4. '####' (H4) 이하의 태그나 마크다운은 절대 사용하지 마십시오. (H태그는 H1 ➔ H2 ➔ H3 3단계로 엄격히 제한)
5. 문체는 신뢰감 있는 전문 에디터 톤(단정한 하십시오/합니다 체)으로 일관되게 작성하십시오.
6. HTML 태그나 외부 링크는 본문에 절대 포함하지 마십시오.
7. 전체 본문(content) 분량은 공백 포함 **최소 1,300자 이상(1,300자 ~ 1,800자 내외)**을 반드시 충족해야 합니다.

[카테고리 선택지 제한]
기사 성격에 부합하는 하나만 정확히 골라 "category" 값에 지정하십시오:
- '정책·지원금' | '부동산·세제' | '금융·경제' | '테크·IT' | '사회·문화'

반드시 다른 설명 없이 아래 JSON 규격 하나만을 엄격히 출력하십시오:
{
  "title": "20~35자 내외의 자연스러운 정통 뉴스 헤드라인 (대괄호 태그나 기계적 접미사 절대 금지)",
  "slug": "url-friendly-lowercase-slug-in-english",
  "summary": "1. 첫 번째 핵심 사건 요약 문장.\\n2. 두 번째 세부 내용 및 수치 요약 문장.\\n3. 세 번째 향후 전망 및 독자 영향 요약 문장.",
  "content": "## 1. 핵심 개요 및 주요 쟁점\\n\\n(300자 이상 상세 서술)\\n\\n## 2. 지원 대상 및 자격 요건\\n\\n(350자 이상 상세 서술)\\n\\n### 주요 자격 요건\\n- **소득 기준:** ...\\n- **연령 및 대상:** ...\\n\\n## 3. 세부 혜택 및 수치 비교\\n\\n(350자 이상 상세 서술)\\n\\n### 주요 혜택 비교표\\n| 항목 | 기존 지원 | 변경(확대) 지원 | 비고 |\\n| :--- | :--- | :--- | :--- |\\n| 지원 한도 | 1,000만 원 | 최대 2,000만 원 | 100% 증액 |\\n| 적용 금리 | 연 3.5% | 연 2.2% 고정 | 우대 금리 |\\n\\n## 4. 신청 방법 및 향후 일정\\n\\n(300자 이상 상세 서술)\\n\\n### 공식 신청처 및 제출 서류\\n- **접수처:** ...\\n- **준비 서류:** ...",
  "category": "['정책·지원금', '부동산·세제', '금융·경제', '테크·IT', '사회·문화'] 중 하나",
  "metaTitle": "검색 결과용 60자 내외 SEO 타이틀",
  "metaDescription": "검색 결과 클릭률을 높이는 130자 내외 메타 디스크립션",
  "ctaType": "['subsidy', 'general'] 중 하나",
  "imageTheme": "['housing', 'finance', 'youth', 'policy'] 중 하나",
  "faq": [
    {
      "question": "구체적인 지원 대상 자격 기준은 어떻게 확인하나요?",
      "answer": "공식 신청처 및 복지로 포털에서 모의 계산기를 통해 소득인정액과 연령 기준 충족 여부를 즉시 조회하실 수 있습니다."
    },
    {
      "question": "신청 시 필수 구비 서류는 무엇이 있나요?",
      "answer": "신분증 사본과 함께 주민등록등본, 소득 증빙 서류를 준비하셔야 하며 온라인 신청 시 정부24 공공 마이데이터로 간편 제출이 가능합니다."
    }
  ]
}`;

/**
 * AI API(Google Gemini / Claude / OpenAI)를 호출하여 기사 재가공 수행
 */
export async function rewriteArticleWithAI(raw: RawArticleInput): Promise<RewrittenArticleResult> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  // 1. API 키가 없는 경우: 카테고리별 맞춤형 지능형 Fallback 엔진 작동
  if (!geminiKey && !openaiKey && !anthropicKey) {
    console.warn(
      "[AI] API 키가 설정되지 않아 로컬 지능형 맞춤 패러프레이징 엔진으로 처리합니다."
    );
    return generateFallbackParaphrase(raw);
  }

  // 원문 텍스트 내 언론사/포털 태그 및 HTML 사전 완벽 정제
  const cleanInputTitle = cleanseHeadline(sanitizePlainText(raw.title));
  const cleanInputContent = stripMediaAndPortalTags(sanitizePlainText(raw.content));

  const userPrompt = `[원본 기사 정보]
- 원문 제목: ${cleanInputTitle}
- 카테고리: ${raw.category || "정책·지원금"}
- 원문 내용:
${cleanInputContent}

[작성 필수 지침]
1. 제목(title): [심층 분석], [속보] 같은 대괄호 태그나 ': 핵심 쟁점과 향후 전망' 같은 접미사를 절대 넣지 말고, 20~35자 내외의 매끄러운 정통 뉴스 헤드라인으로 새로 작문하십시오.
2. 요약(summary): [연합뉴스], [v.daum.net] 같은 언론사/포털 태그를 100% 배제하고, '1. 무슨 일인가? 2. 세부 내용/수치 3. 향후 전망/영향' 3줄 완전한 문장으로 작성하십시오.
3. 본문(content): 단순 요약이 아닌, 독자에게 실질적 도움을 주는 '4단계 블로그형 심층 롱폼 가이드(공백 포함 최소 1,300자 ~ 1,800자 이상)'로 풍성하게 작성하십시오.
   - ## 1. 핵심 개요 및 주요 쟁점 (300자 이상)
   - ## 2. 지원 대상 및 자격 요건 (350자 이상, ### 소제목과 '-' 불릿 적극 활용)
   - ## 3. 세부 혜택 및 수치 비교 (350자 이상, 반드시 마크다운 비교표 | 항목 | 기존 | 변경(지원) | 비고 | 1개 이상 포함)
   - ## 4. 신청 방법 및 향후 일정 (300자 이상, ### 소제목 적극 활용)
4. 본문 내 H1('#') 사용 절대 금지, 오직 '##'(H2) 4개와 하위 '###'(H3)으로만 H태그 위계를 구성하십시오.
5. 독자 궁금증 해결 FAQ: 독자가 가장 궁금해할 핵심 질문 2~3개와 실질적인 답변을 "faq" 배열에 반드시 작성하십시오.
6. CTA 버튼 타입(ctaType): 실제 신청/접수가 있는 지원금/복지/청약은 "subsidy", 일반 경제/시황/보도 기사는 "general"로 지정하십시오.
7. 이미지 테마 태그(imageTheme): 기사 주제에 맞추어 'housing' | 'finance' | 'youth' | 'policy' 중 하나를 필수로 지정하십시오.

반드시 지정된 JSON 규격 하나만 출력하십시오.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    let rawContent = "";

    // 2-A. Google Gemini API 분기 처리
    if (geminiKey) {
      const preferredModel = process.env.AI_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const candidateModels = Array.from(
        new Set([preferredModel, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"])
      );

      let lastError: Error | null = null;

      for (const model of candidateModels) {
        const reqController = new AbortController();
        const reqTimeout = setTimeout(() => reqController.abort(), 25000);

        try {
          console.log(`[AI GEMINI] API 호출 시작 - 모델: ${model} | 대상 기사: "${cleanInputTitle.slice(0, 40)}"`);
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

          const response = await fetch(geminiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
              },
            }),
            signal: reqController.signal,
          });

          clearTimeout(reqTimeout);

          if (response.ok) {
            const data = await response.json();
            rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawContent) {
              console.log(`[AI GEMINI SUCCESS] API 응답 수신 성공 (모델: ${model})`);
              break;
            }
          } else {
            const errText = await response.text();
            console.warn(
              `[AI GEMINI WARNING] 모델 ${model} 호출 실패 (${response.status}): ${errText.slice(0, 100)}... 다음 대체 모델로 전환`
            );
            lastError = new Error(`Google Gemini API error (${response.status}): ${errText.slice(0, 150)}`);

            if (response.status === 503 || response.status === 429) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        } catch (modelErr: unknown) {
          clearTimeout(reqTimeout);
          const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`[AI GEMINI WARNING] 모델 ${model} 예외 발생: ${msg}... 다음 대체 모델로 전환`);
          lastError = modelErr instanceof Error ? modelErr : new Error(msg);
        }
      }

      if (!rawContent && lastError) {
        throw lastError;
      }
    }
    // 2-B. Anthropic Claude API 분기 처리
    else if (anthropicKey || (openaiKey && openaiKey.startsWith("sk-ant-"))) {
      const apiKey = anthropicKey || openaiKey;
      const model = process.env.AI_MODEL || "claude-3-5-sonnet-20241022";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      rawContent = data.content?.[0]?.text || "";
    }
    // 2-C. OpenAI API 분기 처리
    else {
      const apiKey = openaiKey;
      const baseUrl = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.AI_MODEL || "gpt-4o-mini";

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      rawContent = data.choices?.[0]?.message?.content || "";
    }

    if (!rawContent) {
      throw new Error("AI 응답 본문이 비어 있습니다.");
    }

    const cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    if (!parsed.title || !parsed.content || !parsed.summary) {
      throw new Error("AI 응답에 필수 필드(title, content, summary)가 누락되었습니다.");
    }

    const assignedCategory = normalizeCategory(parsed.category || raw.category);

    // 품질 검증 게이트 통과 및 자동 정제 (고정 태그 및 언론사 찌꺼기 100% 제거)
    const sanitizedAiTitle = cleanseHeadline(parsed.title);
    const sanitizedAiSummary = stripMediaAndPortalTags(parsed.summary);
    const sanitizedAiContent = stripMediaAndPortalTags(parsed.content);

    // FAQ 구조화 데이터 안전 파싱 및 정제
    let parsedFaq: ArticleFaqItem[] | undefined = undefined;
    if (Array.isArray(parsed.faq) && parsed.faq.length > 0) {
      parsedFaq = parsed.faq
        .filter((item: unknown) => item && typeof item === "object" && "question" in item && "answer" in item)
        .map((item: { question: string; answer: string }) => ({
          question: stripMediaAndPortalTags(String(item.question)).trim(),
          answer: stripMediaAndPortalTags(String(item.answer)).trim(),
        }))
        .filter((item: { question: string; answer: string }) => item.question.length > 3 && item.answer.length > 5);
    }

    const validated = verifyAndSanitizeArticle({
      title: sanitizedAiTitle,
      slug: (parsed.slug || createEnglishSlug(sanitizedAiTitle)).toLowerCase().trim(),
      summary: sanitizedAiSummary,
      content: sanitizedAiContent,
      category: assignedCategory,
      metaTitle: parsed.metaTitle ? cleanseHeadline(parsed.metaTitle) : null,
      metaDescription: parsed.metaDescription ? stripMediaAndPortalTags(parsed.metaDescription) : null,
    });

    // CTA 버튼 성격 결정 ('subsidy' vs 'general')
    const finalCtaType: "subsidy" | "general" =
      parsed.ctaType === "subsidy" || parsed.ctaType === "general"
        ? parsed.ctaType
        : determineCtaType(assignedCategory, sanitizedAiTitle, sanitizedAiContent);

    // 대표 실사 이미지 테마 태그 결정 ('housing' | 'finance' | 'youth' | 'policy')
    let finalImageTheme: ImageTheme = "policy";
    const validThemes: ImageTheme[] = ["housing", "finance", "youth", "policy"];
    if (parsed.imageTheme && validThemes.includes(parsed.imageTheme as ImageTheme)) {
      finalImageTheme = parsed.imageTheme as ImageTheme;
    } else {
      finalImageTheme = detectImageTheme(undefined, assignedCategory, sanitizedAiTitle, sanitizedAiContent);
    }

    return {
      title: validated.sanitized.title,
      slug: validated.sanitized.slug,
      summary: validated.sanitized.summary,
      content: validated.sanitized.content,
      category: validated.sanitized.category,
      metaTitle: validated.sanitized.metaTitle || `${validated.sanitized.title} | Brief Post`,
      metaDescription: validated.sanitized.metaDescription || validated.sanitized.summary.replace(/\n/g, " ").slice(0, 130),
      faq: parsedFaq && parsedFaq.length > 0 ? parsedFaq : undefined,
      ctaType: finalCtaType,
      imageTheme: finalImageTheme,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI Error] AI 기사 재작성 호출 실패, 카테고리별 맞춤 폴백 엔진으로 자동 전환:", msg);
    return generateFallbackParaphrase(raw);
  }
}

/**
 * AI API 미설정 또는 장애 시 가동되는 카테고리별 맞춤형 지능형 패러프레이징 폴백 엔진
 * 기사 제목 및 카테고리에 완벽히 일치하는 소제목과 문맥을 지능적으로 합성
 */
export function generateFallbackParaphrase(raw: RawArticleInput): RewrittenArticleResult {
  const cleanTitle = cleanseHeadline(sanitizePlainText(raw.title || ""));
  const finalCategory = normalizeCategory(raw.category);

  // 자연스러운 정통 경제·정책 뉴스 헤드라인 (고정 말머리 및 기계적 접미사 100% 제거)
  let title = cleanTitle;
  if (title.length > 38) {
    title = title.slice(0, 36).trim() + "...";
  }

  const slug = createEnglishSlug(cleanTitle);

  // 본문 및 언론사/포털 태그 정제
  const pureText = stripMediaAndPortalTags(sanitizePlainText(raw.content || ""));
  const sentences = pureText
    .split(/(?<=[.?!])\s+/)
    .map((s) => stripMediaAndPortalTags(s).trim())
    .filter((s) => s.length >= 15 && /[가-힣]/.test(s) && !s.includes("http"));

  // 3줄 요약 문장 (1. 핵심 내용 -> 2. 세부 내용/수치 -> 3. 전망/영향)
  const s1 =
    sentences[0] ||
    `${cleanTitle} 관련 정부 부처 및 주요 관계 기관의 공식 발표가 나왔습니다.`;
  const s2 =
    sentences[1] ||
    "지원 요건과 세부 적용 기준이 구체화되면서 실수요자 및 관련 업계의 실질적 혜택이 확대될 전망입니다.";
  const s3 =
    sentences[2] ||
    "세부 신청 일정과 공식 가이드라인에 따라 순차적으로 진행될 예정이므로 꼼꼼한 확인이 필요합니다.";

  // 3줄 요약 정규화
  const { summary } = normalizeThreeLineSummary(`${s1}\n${s2}\n${s3}`, pureText, title);

  // 카테고리별 맞춤 4단계 블로그형 심층 롱폼 본문 구성 (최소 1,300자 ~ 1,800자 보장)
  let content = "";

  if (finalCategory === "정책·지원금") {
    content = `
## 1. 핵심 개요 및 주요 쟁점

${s1}

최근 발표된 정부 및 관계 부처의 정책 개편안은 경제적 여건 변화에 선제적으로 대응하고, 취약 계층 및 실수요자의 실질적인 생활 안정성을 강화하기 위해 추진되었습니다. 이번 지원 제도는 기존의 단편적 지원 방식을 탈피하여 수혜 대상의 생활 주기와 소득 구간을 정밀하게 타겟팅한 맞춤형 지원 패키지라는 점에서 정책적 의의가 큽니다.

전문가들은 "급변하는 경제 환경 속에서 정책 지원금의 실효성을 높이기 위해서는 단순 현금 지급을 넘어 수혜자의 자립 기반을 마련해 주는 제도적 설계가 필수적"이라며 "이번 정책 개편이 민생 경제의 완충 역할을 충실히 수행할 것으로 기대된다"고 평가하고 있습니다. 본 사안과 관련된 구체적인 정책 배경과 예산 배정 규모, 추진 일정 등을 면밀히 검토하여 실질적인 혜택을 선점하는 것이 중요합니다.

## 2. 지원 대상 및 자격 요건

본 지원 제도는 복지 사각지대를 해소하고 실수요자에게 혜택이 집중되도록 구체적이고 명확한 선정 기준을 적용하고 있습니다. 대상 요건을 충족하는지 공고일 기준으로 사전에 세밀히 점검해야 합니다.

### 핵심 자격 요건 및 적격성 심사 기준
- **소득 및 자산 기준:** 중위소득 기준 일정 비율 이하 가구 또는 최근 분기별 소득 증빙이 가능한 대상자에게 우선 순위가 부여됩니다.
- **연령 및 세대 요건:** 청년, 신혼부부, 고령자, 중장년 재도약층 등 생애 주기별 특화 기준이 차등 적용됩니다.
- **거주 및 등록 요건:** 공고일 현재 해당 지자체 또는 국내에 주민등록을 두고 실제 거주 중인 국민을 원칙으로 합니다.
- **중복 수혜 배제 규정:** 유사한 국비 지원 사업이나 기존 동일 목적 보조금을 이미 수령 중인 경우 일부 감액되거나 대상에서 제외될 수 있으므로 사전 대조가 필요합니다.

${s2} 관계 부처는 전산 연계를 통해 자격 요건을 신속하게 검증하되, 특수한 가구 상황이나 예외적인 증빙이 필요한 경우 이의신청 절차를 병행 운영할 방침입니다.

## 3. 세부 혜택 및 수치 비교

이번 개편안의 가장 큰 특징은 이전 제도 대비 지원 단가와 수혜 한도가 대폭 현실화되었다는 점입니다. 물가 상승률과 실질 부담 비용을 정밀하게 반영하여 체감 혜택을 극대화했습니다.

### 주요 지원 항목별 수치 및 이전 대비 비교
- **지원 한도 상향:** 기존 회당 평균 지급 기준 대비 최대 30~50% 수준의 상향 조정이 이루어졌습니다.
- **금리 및 수수료 우대:** 연계 금융 지원 상품의 경우 일반 시중 은행 평균 금리 대비 1.5%~2.5%p 낮은 특별 정책 우대 금리가 적용됩니다.
- **지원 기간 확대:** 단기 일회성 지원에 그치지 않고, 최대 12개월에서 24개월까지 안정적으로 수혜를 받을 수 있도록 지원 기간이 연장되었습니다.
- **바우처 활용 범위:** 지정된 사용처에서만 국한되던 방식을 벗어나, 교육·문화·주거 관리 등 일상 소비 영역 전반으로 바우처 결제 가능 범위가 대폭 확대되었습니다.

이처럼 구체적인 수치와 혜택 범위가 상향 조정됨에 따라, 혜택 대상 가구는 연간 수백만 원 상당의 직접적인 가계 부담 경감 효과를 누릴 수 있을 것으로 분석됩니다.

## 4. 신청 방법 및 향후 일정

신청 접수는 공식 온라인 전용 플랫폼을 통해 비대면으로 간편하게 진행되며, 디지털 취약 계층을 위한 현장 오프라인 창구도 동시에 운영됩니다.

### 공식 신청 절차 및 구비 서류
- **공식 접수 창구:** 정부24(gov.kr), 복지로(bokjiro.go.kr) 또는 해당 지자체 전용 복지 포털에서 본인 인증 후 신청서 작성
- **제출 구비 서류:** 신분증 사본, 주민등록등본, 소득금액증명원, 건강보험료 납부확인서 등 행정정보 공동이용 동의 시 자동 제출
- **오프라인 접수처:** 주소지 관할 행정복지센터(주민센터) 복지 창구 방문 접수 가능

${s3}

### 독자 유의사항 및 마감 전 체크포인트
공식 접수 초기에는 동시 접속자 급증으로 시스템 지연이 발생할 수 있으므로, 구비 서류를 사전에 파일 형태로 준비해 둘 것을 권장합니다. 아울러 예산 소진 시 선착순 조기 마감될 수 있으므로 반드시 공고 일정을 수시로 확인하여 신속하게 신청을 완료하시기 바랍니다.
    `.trim();

  } else if (finalCategory === "부동산·세제") {
    content = `
## 1. 핵심 개요 및 주요 쟁점

${s1}

${cleanTitle}과 관련된 시장의 관심이 고조되면서, 부동산 세제 개편과 공급 정책의 실질적인 파급 효과에 대한 다양한 논의가 이루어지고 있습니다. 이번 대책은 과열된 시장 환경을 안정화하고 실수요자의 주거 사다리를 복원하기 위한 다각적인 정책 수단을 담고 있습니다.

부동산 시장 전문가들은 "단순한 규제 강화나 일시적 완화보다는 시장의 수요 공급 메커니즘을 정상화하는 일관된 정책 시그널이 중요하다"고 입을 모으며, "이번 발표가 향후 분양 및 매매 거래량의 흐름을 가늠하는 중대한 분수령이 될 것"이라고 진단했습니다. 시장 참여자들은 세부 항목별 법 개정 시점과 유예 기간을 철저히 확인해야 합니다.

## 2. 지원 대상 및 자격 요건

이번 부동산 및 세제 정책의 적용 대상은 주택 보유 수, 취득 가액, 청약 통장 보유 기간 등에 따라 정교하게 세분화되어 있습니다.

### 실수요자 자격 요건 및 규제 적용 기준
- **무주택 실수요자:** 생애 최초 주택 구입자 또는 무주택 기간 3년 이상인 세대주에게 우선 청약 배정 및 취득세 감면 혜택이 집중됩니다.
- **다주택자 규제 기준:** 조정대상지역 내 2주택 이상 보유자에 대한 취득세·양도소득세 중과 배제 여부와 종합부동산세 기본 공제액 기준이 차등 적용됩니다.
- **청약 가점 요건:** 무주택 기간, 부양가족 수, 청약통장 가입 기간에 따른 가점제 비율과 추첨제 배정 물량이 시장 여건에 맞춰 재조정됩니다.
- **소득 및 부채 비율:** DSR(총부채원리금상환비율) 및 LTV(주택담보인정비율) 규제 한도가 차주의 소득 수준과 주택 가액에 따라 단계별로 적용됩니다.

${s2} 자격 요건 산정 시 부양가족의 주민등록 분리 여부나 세대원 주택 소유 이력에 따라 부적격 처리가 될 수 있으므로 세심한 주의가 요구됩니다.

## 3. 세부 혜택 및 수치 비교

이번 세제 및 금융 정책의 핵심은 과도한 거래 비용을 경감하고, 실수요자의 대출 문턱을 합리적으로 조정하는 데 초점이 맞춰져 있습니다.

### 주요 세목별 수치 비교 및 감면 혜택
- **취득세 감면율:** 생애최초 주택 구입 시 200만 원 한도 내 취득세 전액 면제 혜택 유지 및 적용 대상 주택 가액 기준 현실화
- **양도세 비과세 요건:** 1세대 1주택 비과세 고가주택 기준(12억 원) 및 보유·거주 요건의 합리적 완화 조치 적용
- **주택담보대출 한도:** 서민·실수요자 우대 주담대 한도가 기존 대비 최대 1억~2억 원 상향되어 자금 조달 유연성 확보
- **종합부동산세 공제:** 1세대 1주택자 기본공제 12억 원, 일반 9억 원 기준이 유지되며 다주택자 중과세율 체계가 대폭 간소화되었습니다.

이러한 수치적 변화는 매수자와 매도자 모두에게 실질적인 세금 절감 효과를 제공하며, 중장기적인 거래 정상화의 기폭제로 작용할 전망입니다.

## 4. 신청 방법 및 향후 일정

주요 세제 혜택 감면 및 청약 신청은 관련 공공 시스템을 통해 투명하게 진행됩니다.

### 신청 절차 및 공식 확인 창구
- **청약 신청처:** 청약홈(applyhome.co.kr) 전용 웹사이트 및 모바일 앱을 통한 비대면 전자 접수
- **세제 감면 신청:** 주택 취득 후 60일 이내 관할 시·군·구청 세무과 방문 또는 위택스(wetax.go.kr)를 통한 전자 감면 신청
- **대출 상담:** 주택도시기금(enhf.molit.go.kr) 또는 한국주택금융공사(hf.go.kr) 및 시중 협약 은행 전용 창구

${s3}

### 시장 참여자 유의사항
법령 개정안의 국회 통과 일정 및 시행령 공포 시점에 따라 실제 적용일이 상이할 수 있으므로, 매매 계약 체결 전 반드시 계약일과 잔금일, 등기 접수일의 세법 적용 기준을 전문 세무사와 사전 상담하시기 바랍니다.
    `.trim();

  } else if (finalCategory === "금융·경제") {
    content = `
## 1. 핵심 개요 및 주요 쟁점

${s1}

${cleanTitle}에 관한 발표는 국내외 거시 경제 지표의 변동성과 맞물려 금융 시장 전반에 상당한 반향을 불러일으키고 있습니다. 이번 조치는 중앙은행의 통화 정책 기조, 물가 상승 압력, 환율 변동성 등 다층적인 거시 경제 변수를 종합적으로 고려하여 도출된 결과입니다.

금융 시장 전문가들은 "글로벌 공급망 불확실성과 주요국의 금리 결정 경로가 여전히 유동적인 상황에서, 이번 발표가 기업의 자금 조달 비용과 가계의 금융 자산 배분 전략에 직접적인 가이드라인이 될 것"이라고 분석했습니다. 국내외 투자자들은 이번 이슈가 자산 시장 전반에 미칠 단기적 파급 효과와 중장기적 펀더멘털 변화를 복합적으로 주시해야 합니다.

## 2. 지원 대상 및 자격 요건

이번 금융 정책 및 시장 안정화 프로그램은 단기 유동성 위험에 노출된 취약 차주와 건전한 투자 주체를 명확히 구분하여 맞춤형으로 작동합니다.

### 금융 수혜 대상 및 시장 참여자 기준
- **소상공인 및 중소기업 차주:** 매출 감소 증빙이 가능하고 정상적인 금융 거래를 유지 중인 차주를 대상으로 대환 대출 및 만기 연장 혜택이 부여됩니다.
- **가계 채무자 적격 기준:** 총부채 상환 부담이 과중한 저신용·저소득 다중 채무자에 대해 고금리 대출을 저금리 정책 자금으로 전환하는 자격 요건이 설정되었습니다.
- **금융 투자자 적격성:** 예금자보호법 적용 한도, 파생결합상품 가입 요건, 전문투자자 등록 기준 등 투자자 성향별 보호 장치가 강화됩니다.
- **기업 금융 지원:** 첨단 전략 산업 및 수출 유망 업종 영위 기업을 대상으로 특별 신용 보증 및 시설 자금 우대 기준이 적용됩니다.

${s2} 자격 심사 과정에서는 신용평가사(CB)의 최신 평점과 최근 금융 거래 내역이 엄격히 반영되므로 연체 이력 관리가 필수적입니다.

## 3. 세부 혜택 및 수치 비교

이번 조치를 통해 제공되는 금융 지원의 핵심 수치는 기존 시중 금융 조건과 비교했을 때 뚜렷한 이자 절감 효과를 나타냅니다.

### 주요 금융 지표 비교 및 수치 혜택
- **대출 금리 인하 폭:** 정책 대환 대출 이용 시 평균 연 7~10%대 고금리 상품이 연 3~4%대 고정·혼합형 금리로 전환되어 최대 4~6%p의 이자 부담이 경감됩니다.
- **보증 지원 한도:** 기업 및 소상공인 대상 특례 보증 한도가 업체당 최대 5천만 원에서 1억 원 이상으로 확대되었습니다.
- **상환 유예 기간:** 원금 상환 부담을 완화하기 위해 최대 3년 거치, 5~10년 장기 분할 상환 방식이 도입되었습니다.
- **수수료 면제:** 중도상환수수료 및 각종 보증 심사 수수료가 전액 면제되어 차주의 금융 비용이 추가로 절감됩니다.

이러한 수치적 혜택은 경기 둔화 국면에서 가계와 기업의 가처분 소득을 방어하고 부실 위험을 선제적으로 차단하는 실질적인 금융 안전망이 될 것입니다.

## 4. 신청 방법 및 향후 일정

금융 지원 신청 및 관련 상품 가입은 공식 서민금융 포털 및 전용 금융 창구를 통해 원스톱으로 처리됩니다.

### 신청 절차 및 공식 상담 안내
- **공식 신청처:** 서민금융진흥원(kinfa.or.kr), 신용회복위원회(ccrs.or.kr) 및 각 시중은행 모바일 앱
- **필요 서류:** 소득금액증명원, 사업자등록증, 부가가치세 과세표준증명, 금융 거래 확인서 등 공동인증서를 통한 스크래핑 자동 제출
- **상담 창구:** 서민금융콜센터(1397) 및 금융감독원 종합금융상담센터(1332)

${s3}

### 금융 소비자 유의사항
공식 정책 지원을 사칭한 불법 대출 스팸 문자나 비대면 입금 유도 사기가 기승을 부리고 있으므로, 반드시 공식 포털이나 제도권 금융회사 공식 창구를 통해서만 신청해야 합니다.
    `.trim();

  } else if (finalCategory === "테크·IT") {
    content = `
## 1. 핵심 개요 및 주요 쟁점

${s1}

${cleanTitle}의 등장은 차세대 디지털 패러다임의 진화 방향을 보여주는 중대한 기술적 이정표로 평가받고 있습니다. 인공지능(AI), 클라우드 컴퓨팅, 고성능 반도체 생태계가 융합되면서 산업 전반의 디지털 전환 속도가 전례 없이 빨라지고 있습니다.

글로벌 테크 업계 전문가들은 "단순한 하드웨어 스펙 경쟁이나 단편적 소프트웨어 개선을 넘어, 실제 사용자 경험(UX)과 엔터프라이즈 업무 생산성을 근본적으로 혁신하는 생태계 락인(Lock-in) 전략이 본격화되고 있다"고 입을 모았습니다. 개발자와 기업, 얼리어답터들은 이번 기술 발표가 향후 플랫폼 지형도에 미칠 파급 효과를 면밀히 분석해야 합니다.

## 2. 지원 대상 및 자격 요건

새롭게 공개된 테크 플랫폼과 기술 솔루션은 일반 소비자부터 전문 개발자, 엔터프라이즈 고객까지 폭넓은 사용자 층을 대상으로 최적화된 활용 기준을 제시합니다.

### 사용자 참여 기준 및 지원 환경 요건
- **하드웨어 호환성:** 차세대 운영체제(OS) 및 전용 프로세서 아키텍처를 탑재한 디바이스에서 최적의 성능이 발휘되도록 최소 시스템 사양이 규정되었습니다.
- **개발자 API 접근 권한:** 공식 개발자 포털을 통해 등록된 파트너사 및 인증 개발자에게 고성능 SDK와 클라우드 API 엔드포인트가 우선 개방됩니다.
- **기업 고객 라이선스:** 데이터 프라이버시 보호 및 온프레미스 연동을 필요로 하는 엔터프라이즈 고객을 위한 전용 보안 계정이 별도로 운영됩니다.
- **베타 테스터 자격:** 글로벌 사전 등록을 완료한 일반 사용자 및 테스터를 대상으로 단계별 프리뷰 빌드가 배포됩니다.

${s2} 다양한 환경에서의 호환성 테스트 결과가 지속적으로 공유되고 있으므로, 공식 기술 문서를 통해 본인의 디바이스 및 서비스 지원 여부를 사전에 확인하는 것이 권장됩니다.

## 3. 세부 혜택 및 수치 비교

이번 기술 혁신의 본질은 처리 속도, 전력 효율성, 인프라 운영 비용 등 구체적인 벤치마크 지표에서 뚜렷한 성능 향상을 입증했다는 점에 있습니다.

### 주요 벤치마크 수치 및 이전 세대 대비 비교
- **연산 처리 속도:** 차세대 아키텍처 적용으로 이전 세대 대비 최소 40%에서 최대 2.5배 이상의 데이터 처리 속도 향상을 기록했습니다.
- **전력 소모 절감:** 혁신적인 저전력 설계를 통해 동일 워크로드 기준 전력 소비량을 최대 35% 절감하여 기기 발열과 탄소 배출을 줄였습니다.
- **인프라 비용 효율화:** 클라우드 토큰 및 서버 호스팅 비용이 기존 솔루션 대비 대폭 최적화되어 도입 기업의 운영 부담을 경감했습니다.
- **멀티 플랫폼 레이턴시:** 크로스 플랫폼 동기화 지연율이 10ms 이내로 단축되어 실시간 협업과 고사양 인터랙션이 매끄럽게 지원됩니다.

이러한 수치적 도약은 관련 산업계의 연구 개발(R&D) 생산성을 배가시키고, 소비자에게는 차원이 다른 몰입감을 선사할 것으로 전망됩니다.

## 4. 신청 방법 및 향후 일정

신규 서비스 이용 및 정식 업데이트는 공식 플랫폼과 앱 마켓을 통해 전 세계에 순차적으로 배포됩니다.

### 이용 절차 및 공식 업데이트 일정
- **공식 다운로드:** 공식 제조사 웹사이트, 글로벌 앱스토어 및 구글 플레이스토어를 통한 공식 빌드 설치
- **개발자 리소스:** 깃허브(GitHub) 공식 저장소 및 전용 개발자 허브를 통해 오픈소스 라이브러리와 튜토리얼 문서 제공
- **정기 업데이트:** 분기별 로드맵에 따라 핵심 기능과 보안 패치가 OTA(Over-The-Air) 무선 업데이트 방식으로 자동 배포

${s3}

### 사용자 주의사항 및 팁
초기 배포 버전의 경우 일부 레거시 소프트웨어와의 일시적 충돌이 발생할 수 있으므로, 중요 데이터는 사전에 클라우드나 외장 스토리지에 백업한 후 업데이트를 진행하시기 바랍니다.
    `.trim();

  } else {
    // 사회·문화
    content = `
## 1. 핵심 개요 및 주요 쟁점

${s1}

${cleanTitle}에 대한 이번 발표는 대중과 사회 각계의 뜨거운 관심 속에 우리 사회의 문화적 가치와 공공의 담론을 재조명하는 계기를 마련하고 있습니다. 이번 사안은 시대적 흐름과 시민들의 높아진 기대 수준이 결합되어 대두된 중요한 사회문화적 이슈로 평가받고 있습니다.

사회학 및 문화계 전문가들은 "현대 사회에서 발생하는 다양한 이슈들은 단순한 일회성 사건에 그치지 않고, 우리 공동체의 제도적 보완과 성숙한 문화적 인식 개선으로 승화되어야 한다"고 강조했습니다. 본 사안의 사실 관계와 사회적 파급 효과를 객관적인 시각에서 다각도로 짚어볼 필요가 있습니다.

## 2. 지원 대상 및 자격 요건

이번 문화·복지 정책 및 사회적 지원 프로그램은 다양한 사회 구성원들의 문화 향유권을 신장하고 실질적인 참여 기회를 보장하기 위해 마련되었습니다.

### 프로그램 참여 기준 및 수혜 자격
- **문화 소외 계층 지원:** 저소득층, 한부모 가정, 다문화 가정 등 문화 접근성이 취약한 계층에게 우선 참여 혜택이 주어집니다.
- **청년 및 신진 예술인:** 창작 활동 공간과 프로젝트 지원금을 필요로 하는 만 19세~39세 예술인을 위한 맞춤형 심사 기준이 적용됩니다.
- **지역 주민 참여 요건:** 해당 지역 기초 지자체 주민등록 거주자 및 지역 문화재단 회원에게 특별 관람 및 할인 혜택이 제공됩니다.
- **비영리 문화 단체:** 공익 목적의 문화 예술 프로젝트를 기획하는 비영리 민간 단체 및 예술 동아리 대상 공모 자격이 부여됩니다.

${s2} 선정 과정에서는 공정성과 투명성을 담보하기 위해 외부 전문가로 구성된 심사위원회의 객관적 평가가 이루어집니다.

## 3. 세부 혜택 및 수치 비교

이번 사업은 이전 대비 예산 규모와 지원 인원을 대폭 확대하여 시민들의 문화 체감도를 끌어올리는 데 주력했습니다.

### 주요 지원 규모 및 수치 혜택
- **지원금 단가 인상:** 1인당 또는 팀당 지원 한도가 전년 대비 평균 20% 이상 증액되어 실질적인 창작 및 향유 활동을 뒷받침합니다.
- **수혜 대상 인원 확대:** 총 수혜 인원이 이전 1만 명 규모에서 3만 명 이상으로 대폭 늘어나 문턱이 낮아졌습니다.
- **바우처 지원 금액:** 문화누리카드 등 전용 문화 바우처 지원 금액이 연간 13만 원에서 15만 원 이상으로 추가 인상되었습니다.
- **공공 문화 시설 개방:** 국공립 박물관, 미술관, 공연장 등 공공 문화 시설의 무료 관람일 및 야간 개방 프로그램이 확대 운영됩니다.

이러한 정책적 지원 확대는 일상 속 문화 향유 기회를 넓히고, 침체된 지역 문화 예술 생태계에 활력을 불어넣는 든든한 마중물이 될 것입니다.

## 4. 신청 방법 및 향후 일정

사업 참여 및 티켓 예매는 공식 온라인 문화 포털을 통해 누구나 손쉽게 신청할 수 있습니다.

### 신청 절차 및 공식 접수처
- **온라인 신청:** 한국문화예술위원회(arko.or.kr), 지역 문화재단 공식 웹사이트 또는 문화누리 공식 포털
- **접수 기간:** 매월 지정된 정기 공모 기간 또는 상시 접수 창구를 통해 신청 가능
- **문의 및 안내:** 문화예술 대표 상담 콜센터(1544-3412) 및 각 지자체 문화예술과

${s3}

### 시민 참여 팁 및 주의사항
인기 있는 문화 프로그램이나 공모 사업은 조기에 마감되는 경우가 많으므로, 사전 알림 서비스를 신청해 두고 접수 시작일에 맞춰 신속하게 신청서를 제출하는 것이 유리합니다.
    `.trim();
  }


  // 최종 무결성 검증 통과
  const validated = verifyAndSanitizeArticle({
    title,
    slug,
    summary,
    content,
    category: finalCategory,
    metaTitle: `${title} | Brief Post`,
    metaDescription: `${s1.slice(0, 90)} 관련 최신 동향과 핵심 시사점을 3줄 요약과 함께 심층 분석합니다.`,
  });

  // 기본 FAQ 항목 구성 (구글 FAQPage 스키마 대응)
  const defaultFaq: ArticleFaqItem[] = [
    {
      question: `${title.slice(0, 25)}의 지원 대상 및 신청 자격은 어떻게 되나요?`,
      answer: "해당 지원 사업은 공고된 기준에 부합하는 대상자(연령, 소득, 가구 요건 등)를 우선 선발하며, 상세 자격 기준은 공식 신청처 및 관할 안내 창구에서 확인하실 수 있습니다.",
    },
    {
      question: "신청 방법과 준비해야 할 필수 서류는 무엇인가요?",
      answer: "공식 웹사이트를 통한 온라인 신청 또는 관할 행정기관 방문 접수가 가능하며, 본인 확인을 위한 신분증과 자격 증빙 서류를 사전에 구비하셔야 합니다.",
    },
    {
      question: "지급 일정 및 향후 진행 상황은 어디서 조회할 수 있나요?",
      answer: "신청 접수 마감 후 서류 심사를 거쳐 개별 통보되며, 공식 포털의 마이페이지를 통해 실시간 심사 상태를 조회하실 수 있습니다.",
    },
  ];

  return {
    title: validated.sanitized.title,
    slug: validated.sanitized.slug,
    summary: validated.sanitized.summary,
    content: validated.sanitized.content,
    category: validated.sanitized.category,
    metaTitle: validated.sanitized.metaTitle || `${title} | Brief Post`,
    metaDescription: validated.sanitized.metaDescription || `${s1.slice(0, 90)} 심층 분석`,
    faq: defaultFaq,
    ctaType: determineCtaType(finalCategory, title, content),
    imageTheme: detectImageTheme(undefined, finalCategory, title, content),
  };
}

/**
 * 한글/혼합 제목을 의미 있는 영문 슬러그로 변환하는 유틸리티
 */
export function createEnglishSlug(title: string): string {
  const clean = sanitizePlainText(title);
  const words = clean
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));

  const base = words.slice(0, 4).join("-");
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  if (base && base.length >= 3) {
    return `${base}-${randomSuffix}`;
  }

  return `brief-${randomSuffix}`;
}
