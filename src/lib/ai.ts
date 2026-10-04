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
  cleanseCardTitle,
  stripMediaAndPortalTags,
} from "./articleValidator";
import { detectImageTheme, ImageTheme } from "../utils/imageMapper";
import { extractCardBadge } from "./cardBadgeExtractor";
import { extractKeywordTitle } from "./catchphraseExtractor";

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
  card_title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  metaTitle: string;
  metaDescription: string;
  faq?: ArticleFaqItem[];
  ctaType?: "subsidy" | "general";
  imageTheme?: ImageTheme;
  highlightBadge?: string;
}

/**
 * 기사 카테고리, 제목, 본문 키워드를 분석하여 액션 CTA 버튼 타입('subsidy' vs 'general')을 스마트하게 판별
 * - 오직 '정책·지원금' 카테고리 기사만 'subsidy'(공식 접수처/신청)로 판별될 수 있으며, 타 카테고리는 무조건 'general'
 */
export function determineCtaType(category?: string, title?: string, content?: string): "subsidy" | "general" {
  // 정책·지원금 카테고리가 아니면 절대로 subsidy가 될 수 없음 (정부24 등 오연결 방지)
  const isPolicySubsidy = category === "정책·지원금" || category?.includes("정책") || category?.includes("지원금");
  if (!isPolicySubsidy) {
    return "general";
  }

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

const SYSTEM_PROMPT = `당신은 월 100만 독자가 신뢰하는 전문 경제·정책 정보성 블로거(Info-Blogger)이자 독자 체류시간 극대화 최고 전문가입니다.
주어지는 원본 팩트(Fact)를 바탕으로, 지루하고 경직된 뉴스 보도체가 아닌 독자가 한 글자도 놓치지 않고 끝까지 읽게 만드는 "친절하고 전문적인 블로그형 심층 완독 가이드(공백 제외 최소 1,500자 ~ 2,200자 이상)"로 100% 재작성하십시오.

[CRITICAL 0: 독자 체류시간 극대화 블로그 문체 및 스토리텔링 지침 - 절대 준수]
1. [친절하고 전문적인 블로그 큐레이터 톤]:
   - 딱딱한 공문서체/뉴스 보도체(~했습니다, ~로 파악되었습니다, ~전망입니다)를 탈피하고, 독자의 눈높이에서 공감하고 꼼꼼히 짚어주는 친절한 설명체(~해요, ~해 보세요, ~정리해 드릴게요, ~확인해 보세요, ~해야 안전합니다)를 주축으로 자연스럽게 작성하십시오.
   - 독자에게 말을 건네듯 친근하면서도 행정/경제 팩트는 명확하게 짚어주어 신뢰감과 완독률을 동시에 극대화하십시오.
2. [도입부 독자 공감 3초 훅(Hook)]:
   - 1번 소제목 첫 문단은 딱딱한 뉴스 개요 대신, 독자의 페인 포인트(신청 자격의 혼란, 복잡한 서류, 혜택 놓침에 대한 아쉬움 등)를 시원하게 긁어주며 시작하십시오.
   - 예시: "신청 방법이 너무 복잡해서 수백만 원 혜택을 그냥 지나치실 뻔하셨나요? 오늘 글 하나로 자격 조건부터 3분 컷 온라인 신청법, 서류 반려 방지 꿀팁까지 알기 쉽게 정리해 드릴게요!"
3. [독자가 손가락을 멈추고 직접 읽는 '체류 장치' 4가지 필수 포함]:
   - 장치 1 (30초 자가진단 체크리스트): 1번 또는 2번 소제목 아래에 '### 🔍 [30초 컷] 나도 대상자일까? 자가진단 체크'를 넣고, 체크박스(- [x], - [ ]) 3~4개로 독자가 직접 세어보게 유도할 것.
   - 장치 2 (한눈에 쏙 들어오는 비교표): 기존 조건과 개편된 혜택을 일목요연하게 비교하는 마크다운 표(| 항목 | 기존 | 개편(지원) | 비고 |) 1개 필수.
   - 장치 3 (실전 모의 시뮬레이션): 실제 인물 A씨(예: 연 매출 1억 5천만 원 사업자 A씨 또는 연봉 3,500만 원 직장인 A씨)의 구체적인 절감액/지원금 모의 계산 예시 1문단 필수.
   - 장치 4 (공문서엔 없는 '실전 신청 꿀팁 & 반려 방지 실수 TOP 3'): 서류 뗄 때 주의점, 당일 접수 요령 등 실전 팁 상세 안내.

[CRITICAL 1: 제목 생성 규칙 (Title Rule) - 절대 준수]
1. [심층 분석], [속보], [단독], [기획], [해설], [칼럼], [사설], [오피니언] 같은 대괄호 태그를 절대 사용하지 마십시오.
2. 언론사명이나 ': 핵심 쟁점과 향후 전망' 같은 기계적 접미사를 절대 붙이지 마십시오.
3. 독자의 클릭과 완독을 부르는 "20~38자 내외의 자연스럽고 유익한 블로그형 헤드라인"으로 작성하십시오.
   - 좋은 예: "2026 소상공인 경영안정자금 자격 조건과 3분 온라인 신청 꿀팁 총정리"
   - 좋은 예: "청년 주택드림 청약통장 전환 자격 및 놓치면 손해보는 금리 혜택 비교"

[CRITICAL 1-1: 카드뉴스 전용 헤드라인 규칙 (card_title Rule) - 절대 준수]
1. 카드 이미지 중앙에 들어갈 "card_title" 필드를 반드시 별도로 생성하십시오.
2. 괄호, 대괄호 없이 순수 핵심 주제어만 "12자~16자 내외의 깔끔한 단문"으로 추출하십시오.

[CRITICAL 1-2: 영문 슬러그 규칙 (slug Rule) - 절대 준수]
1. 무의미한 해시 문자열 금지. 핵심 키워드를 반영한 영문 소문자 하이픈 연결(kebab-case) 슬러그를 생성하십시오.

[CRITICAL 1-3: 도입부 핵심 지원 대상 뱃지 (highlightBadge) - 절대 준수]
1. 독자가 접속 3초 만에 본인 해당 여부를 파악할 수 있는 한 줄 뱃지 문구를 작성하십시오. (예: "💡 핵심 지원 대상: 연 매출 10억 원 이하 소상공인 및 자영업자")

[CRITICAL 2: 메인 목록용 3줄 요약 규칙 (Summary Rule) - 절대 준수]
1. 독자의 궁금증을 자극하는 완성형 문장 3줄로 작성하십시오:
   - 1. 무엇에 관한 핵심 혜택/소식인가?
   - 2. 누가 얼마나 받을 수 있는가? (지원 자격 및 구체적 수치)
   - 3. 언제 어떻게 챙겨야 하는가? (신청 일정 및 실전 꿀팁)

[CRITICAL 3: 상세 페이지용 심층 블로그 본문 (Content Rule) - 공백 제외 최소 1,500자 ~ 2,200자 보장]
★ 본문 분량: 공백 제외 **최소 1,500자 ~ 2,200자 이상(공백 포함 2,000자 ~ 2,800자)**의 깊이 있는 전문 완독 블로그 가이드.
★ 각 소제목(##) 아래에는 최소 2~3개 이상의 완성된 문단을 작성할 것. (문단당 2~3문장 단위 분리, 벽돌글 절대 금지)

[CRITICAL 3-1: 천편일률적 소제목 절대 금지 & 주제 맞춤형 팩트 소제목 강제]
★ '나도 받을 수 있을까?', '얼마나 받을 수 있을까?', '3분 컷!', '이것 모르면 탈락!' 같은 기계적이고 뻔한 템플릿 소제목은 AI 양산형 글로 낙인찍혀 저품질 판정을 받으므로 절대 금지합니다.
★ 기사의 실제 팩트, 제도 변경점, 구체적 일정, 지원 대상 커트라인, 기관명을 담은 생생한 **주제 맞춤형 소제목(H2)**을 생성하십시오:
- ## 1. (제도 개편 배경 및 핵심 변화 - 예: 선착순 오픈런 폐지 및 접수 방식 개편 배경)
  - 독자 페인 포인트 공감 인트로 (2문단 이상)
  - ### 🔍 [30초 컷] 대상자 자가진단 체크리스트 (- [x], - [ ] 형태의 자가진단 3~4개)
- ## 2. (구체적 접수 일정 및 지원 자격 커트라인 - 접수 시작/종료 일시, 기간, 신용점수/소득 기준 명시)
  - 언제부터 언제까지 접수인지, 선착순인지 기간 내 접수 후 심사인지 명확한 운영 방식 서술
- ## 3. (지원 혜택 비교 및 실전 시뮬레이션 - 금리, 한도, 상환기간 비교)
  - ### 주요 비교표 (| 항목 | 기존 | 개편(지원) | 비고 | 1개 필수)
  - ### 실제 적용 사례 및 지원 효과 (A씨의 실제 절감액 모의 계산 1문단 필수)
- ## 4. (사전 필수 요건 및 온라인 신청 실전 동선 - 지식배움터 등 사전 교육, 포털 접수 3단계)
  - 사전 필수 교육 이수 여부, 공공 마이데이터 연동 등 실제 독자가 따라할 수 있는 구체적 동선
- ## 5. (서류 반려 방지 및 심사 탈락 방지 핵심 체크포인트 - 세금 체납, 서류 유효기간 등)
  - ### 신청 전 주의사항 & 반려 방지 체크리스트 (자주 하는 실수 4~5가지 구체적 해설)

[CRITICAL 4: 독자 궁금증 해결 FAQ]
독자가 댓글로 가장 많이 물어볼 법한 질문 2~3개와 친절하고 명쾌한 답변을 "faq" 필드에 생성하십시오.

[CRITICAL 5: CTA 버튼 타입 (ctaType)]
- "subsidy": 실제 신청/접수가 수반되는 정책·지원금 포스팅
- "general": 그 외 정보성 분석 포스팅

[CRITICAL 6: 실사 썸네일 테마 태그 (imageTheme)]
- "housing" | "finance" | "youth" | "policy" | "economy" 중 하나 지정.

반드시 다른 설명 없이 아래 JSON 규격 하나만을 엄격히 출력하십시오:
{
  "title": "20~38자 내외의 자연스러운 정통 뉴스 헤드라인 (대괄호 태그나 기계적 접미사 절대 금지)",
  "card_title": "15~22자 내외의 카드뉴스 전용 임팩트 헤드라인 (키워드·액션 중심)",
  "slug": "url-friendly-lowercase-slug-in-english (예: busan-small-business-energy-voucher-2026)",
  "highlightBadge": "💡 핵심 지원 대상: 연 매출 10억 원 이하 소상공인",
  "summary": "1. 첫 번째 핵심 사건 요약 문장.\n2. 두 번째 세부 내용 및 수치 요약 문장.\n3. 세 번째 향후 전망 및 독자 영향 요약 문장.",
  "content": "## 1. (카테고리에 맞는 1번 소제목)\n\n(400자 이상 상세 서술, 2~3문단 분리)\n\n## 2. (카테고리에 맞는 2번 소제목)\n\n(400자 이상 상세 서술, 2~3문단 분리)\n\n## 3. (카테고리에 맞는 3번 소제목)\n\n(500자 이상 상세 서술)\n\n### 주요 비교표\n| 항목 | 기존 | 변경(지원) | 비고 |\n| :--- | :--- | :--- | :--- |\n| 핵심 비교치 | 세부 데이터 | 개선 수치 | 분석 내용 |\n\n### 실제 적용 사례 및 지원 효과\n(구체적 가상 사례 A씨의 연 매출 및 조건별 절감 금액 계산 예시 1문단 이상 서술)\n\n## 4. (카테고리에 맞는 4번 소제목)\n\n(350자 이상 상세 서술)\n\n## 5. 신청 전 주의사항 & 반려 방지 체크리스트\n\n(350자 이상 상세 서술)\n\n### 신청 전 주의사항 & 반려 방지 체크리스트\n- **서류 구비 적격성:** ...\n- **지원 제외 업종 확인:** ...\n- **중복 수혜 배제 검증:** ...\n- **접수 마감 시한 준수:** ...",
  "category": "['정책·지원금', '부동산·세제', '금융·경제', '테크·IT', '사회·문화'] 중 하나",
  "metaTitle": "검색 결과용 60자 내외 SEO 타이틀",
  "metaDescription": "검색 결과 클릭률을 높이는 130자 내외 메타 디스크립션",
  "ctaType": "['subsidy', 'general'] 중 하나",
  "imageTheme": "['housing', 'finance', 'youth', 'policy', 'economy'] 중 하나",
  "faq": [
    {
      "question": "핵심 관련 질문 1?",
      "answer": "기사 팩트에 기반한 명확한 2~3문장 답변."
    },
    {
      "question": "핵심 관련 질문 2?",
      "answer": "기사 팩트에 기반한 명확한 2~3문장 답변."
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
- 원문 카테고리/성격: ${raw.category || "정책·지원금"}
- 원문 내용:
${cleanInputContent}

[작성 필수 지침 - 공백 제외 최소 1,500자 ~ 2,200자 롱폼 전문 블로그 가이드 작성]
0. [독자 체류시간 극대화 블로그 큐레이터 톤]:
   - 딱딱한 공문서/기자 어조를 버리고, 친절하고 상냥한 설명체(~해요, ~해 보세요, ~정리해 드릴게요, ~확인해 보세요)로 작성하십시오.
   - 1번 소제목 도입부는 독자의 페인 포인트(신청 자격의 혼란, 혜택 놓침의 아쉬움 등)를 시원하게 짚어주는 3초 훅 인트로 문단으로 시작하십시오.
   - 1번 또는 2번 소제목 아래에 '### 🔍 [30초 컷] 나도 대상자일까? 자가진단 체크'를 넣고, 체크박스(- [x], - [ ]) 3~4개로 독자가 손가락을 멈추고 직접 확인하게 만드십시오.
1. 제목(title): 대괄호 태그나 기계적 접미사를 배제하고, 독자의 클릭과 완독을 부르는 20~38자 내외의 매끄러운 블로그형 제목으로 작성하십시오.
2. 영문 슬러그(slug): 무의미한 해시 절대 금지. 기사 핵심 키워드를 반영한 영문 슬러그를 생성하십시오.
3. 핵심 지원 대상 뱃지(highlightBadge): 독자가 3초 만에 본인 해당 여부를 파악할 수 있는 한 줄 뱃지 문구를 작성하십시오.
4. 요약(summary): '1. 무엇에 관한 소식인가? 2. 누가 얼마나 받는가? 3. 언제 어떻게 신청하는가?' 3줄 완성형 문장으로 작성하십시오.
5. 본문(content) 작성 필수 원칙:
   - 분량 강제: 공백 제외 **최소 1,500자 ~ 2,200자 이상(공백 포함 2,000자 ~ 2,800자)**의 깊이 있는 전문 블로그 가이드.
   - 각 소제목(##) 아래 2~3개 이상의 완성된 문단 작성 (문단당 2~3문장 단위 분리, 벽돌글 절대 금지).
   - 천편일률적 템플릿 소제목 절대 금지: '나도 받을 수 있을까?', '얼마나 받을 수 있을까?', '3분 컷!' 같은 뻔한 소제목 대신, 기사의 실제 팩트(일정, 기간, 자격 요건 수치, 제도 개편 내용 등)를 직접 담은 맞춤형 소제목(##) 작성.
   - 독자 필수 운영 팩트 서술: 독자가 가장 궁금해하는 '언제부터 언제까지 접수인지(구체적 시작/마감 일시)', '선착순인지 이틀간/기간 내 상시 접수인지 운영 방식', '사전 필수 이수 요건(지식배움터 교육 등)'을 본문에 명확히 서술.
   - 필수 1: [실제 적용 사례 및 지원 효과] (H3: ### 실제 적용 사례 및 지원 효과) - 실제 인물 A씨의 연 매출 및 조건별 절감 금액 모의 계산 예시 1문단 필수.
   - 필수 2: [신청 전 주의사항 & 반려 방지 꿀팁] (H3: ### 신청 전 주의사항 & 반려 방지 체크리스트) - 서류 누락, 실수 TOP 3 등 4~5개 항목 구체적 안내.
   - 필수 3: 마크다운 비교표(| 항목 | 기존 | 개편 | 비고 |) 1개 이상 반드시 포함.
6. 독자 궁금증 해결 FAQ: 핵심 질문 2~3개와 실질적인 답변을 "faq" 배열에 작성하십시오.
7. CTA 버튼 타입(ctaType): 실제 신청/접수가 있는 지원금/복지는 "subsidy", 일반 시사/경제/테크 기사는 "general"로 지정하십시오.
8. 이미지 테마 태그(imageTheme): 'housing' | 'finance' | 'youth' | 'policy' | 'economy' 중 하나를 필수로 지정하십시오.
반드시 지정된 JSON 규격 하나만 출력하십시오.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    let rawContent = "";

    // 2-A. Google Gemini API 분기 처리
    if (geminiKey) {
      const preferredModel = process.env.AI_MODEL || process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
      const candidateModels = Array.from(
        new Set([
          preferredModel,
          "gemini-flash-lite-latest",
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.8-flash",
          "gemini-3.7-flash",
          "gemini-flash-latest",
          "gemini-pro-latest",
        ])
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

    let cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.slice(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      // JSON 문자열 리터럴(큰따옴표 내부)에 언이스케이프된 실제 개행/탭 문자가 있는 경우 자동 복원
      let inString = false;
      let isEscaped = false;
      let repaired = "";
      for (let i = 0; i < cleanedJson.length; i++) {
        const char = cleanedJson[i];
        if (char === '"' && !isEscaped) {
          inString = !inString;
          repaired += char;
        } else if (inString && char === "\n") {
          repaired += "\\n";
        } else if (inString && char === "\r") {
          repaired += "\\r";
        } else if (inString && char === "\t") {
          repaired += "\\t";
        } else {
          repaired += char;
        }
        isEscaped = char === "\\" && !isEscaped;
      }

      // 후행 콤마(trailing commas) 정리
      repaired = repaired.replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(repaired);
    }

    if (!parsed || !parsed.title || !parsed.content || !parsed.summary) {
      throw new Error("AI 응답에 필수 필드(title, content, summary)가 누락되었습니다.");
    }

    const assignedCategory = (raw.category && (ALLOWED_CATEGORIES as readonly string[]).includes(raw.category))
      ? (raw.category as ArticleCategory)
      : normalizeCategory(parsed.category || raw.category);

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

    // 슬러그 안정화: AI가 생성한 슬러그가 유효하지 않거나 무의미한 해시(brief-xxx 등)인 경우 지능형 슬러그로 강제 보정
    let finalSlug = "";
    if (parsed.slug && typeof parsed.slug === "string") {
      const candidate = parsed.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const isMeaningful =
        !candidate.startsWith("brief-") &&
        !candidate.startsWith("article-") &&
        !candidate.startsWith("news-") &&
        candidate.length >= 6 &&
        candidate.split("-").length >= 2 &&
        !/^[a-z0-9]{4,8}$/.test(candidate);
      if (isMeaningful) {
        finalSlug = candidate;
      }
    }
    if (!finalSlug) {
      finalSlug = createEnglishSlug(sanitizedAiTitle, assignedCategory);
    }

    const validated = verifyAndSanitizeArticle({
      title: sanitizedAiTitle,
      slug: finalSlug,
      summary: sanitizedAiSummary,
      content: sanitizedAiContent,
      category: assignedCategory,
      metaTitle: parsed.metaTitle ? cleanseHeadline(parsed.metaTitle) : null,
      metaDescription: parsed.metaDescription ? stripMediaAndPortalTags(parsed.metaDescription) : null,
    });

    // CTA 버튼 성격 결정: 오직 '정책·지원금' 카테고리 기사만 'subsidy' 가능, 그 외는 무조건 'general'
    const isPolicySubsidyCat = assignedCategory === "정책·지원금" || assignedCategory.includes("정책") || assignedCategory.includes("지원금");
    const finalCtaType: "subsidy" | "general" = isPolicySubsidyCat
      ? (parsed.ctaType === "subsidy" || parsed.ctaType === "general"
          ? parsed.ctaType
          : determineCtaType(assignedCategory, sanitizedAiTitle, sanitizedAiContent))
      : "general";

    // 대표 실사 이미지 테마 태그 결정 ('housing' | 'finance' | 'youth' | 'policy' | 'economy')
    let finalImageTheme: ImageTheme = "policy";
    const validThemes: ImageTheme[] = ["housing", "finance", "youth", "policy", "economy", "tech", "society"];
    if (parsed.imageTheme && validThemes.includes(parsed.imageTheme as ImageTheme)) {
      finalImageTheme = parsed.imageTheme as ImageTheme;
    } else {
      finalImageTheme = detectImageTheme(undefined, assignedCategory, sanitizedAiTitle, sanitizedAiContent);
    }

    // 핵심 지원 대상 뱃지 결정 (AI 응답 뱃지 우선, 미응답 시 자동 추출기)
    let finalHighlightBadge = "";
    if (parsed.highlightBadge && typeof parsed.highlightBadge === "string" && parsed.highlightBadge.trim().length >= 4) {
      const cleanBadge = stripMediaAndPortalTags(parsed.highlightBadge).trim();
      finalHighlightBadge = cleanBadge.startsWith("💡") ? cleanBadge : `💡 ${cleanBadge}`;
    } else {
      const cardBadge = extractCardBadge(
        validated.sanitized.title,
        validated.sanitized.content,
        validated.sanitized.category
      );
      finalHighlightBadge = cardBadge.badgeText;
    }

    // 카드뉴스 전용 헤드라인 card_title 추출 및 정제 (12~16자 내외, 괄호/잡음 완전 제거)
    let finalCardTitle = "";
    if (parsed.card_title && typeof parsed.card_title === "string") {
      finalCardTitle = cleanseCardTitle(parsed.card_title);
    }
    if (!finalCardTitle || finalCardTitle.length < 4) {
      finalCardTitle = cleanseCardTitle(validated.sanitized.title);
    }

    return {
      title: validated.sanitized.title,
      card_title: finalCardTitle,
      slug: validated.sanitized.slug,
      summary: validated.sanitized.summary,
      content: validated.sanitized.content,
      category: validated.sanitized.category,
      metaTitle: validated.sanitized.metaTitle || `${validated.sanitized.title} | Brief Post`,
      metaDescription: validated.sanitized.metaDescription || validated.sanitized.summary.replace(/\n/g, " ").slice(0, 130),
      faq: parsedFaq && parsedFaq.length > 0 ? parsedFaq : undefined,
      ctaType: finalCtaType,
      imageTheme: finalImageTheme,
      highlightBadge: finalHighlightBadge,
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
  const cleanTitle = stripMediaAndPortalTags(cleanseHeadline(sanitizePlainText(raw.title || "")));
  const finalCategory = normalizeCategory(raw.category);

  // 자연스러운 정통 경제·정책 완결형 헤드라인 (말줄임표 절삭 없는 온전한 문장 보존)
  const title = cleanTitle;

  const slug = createEnglishSlug(cleanTitle, finalCategory);

  // 본문 및 언론사/포털 태그 정제
  const pureText = stripMediaAndPortalTags(sanitizePlainText(raw.content || ""));
  const sentences = pureText
    .split(/(?<=[.?!])\s+/)
    .map((s) => stripMediaAndPortalTags(s).trim())
    .filter((s) => s.length >= 15 && /[가-힣]/.test(s) && !s.includes("http"));

  // 3줄 요약 문장 (1. 핵심 내용 -> 2. 세부 내용/수치 -> 3. 전망/영향)
  let rawS1 = sentences[0] || `${cleanTitle} 관련 정부 부처 및 주요 관계 기관의 공식 발표가 나왔습니다.`;
  // 만약 s1에 도메인이나 불완전한 문장 끝단이 남아있다면 정제
  rawS1 = stripMediaAndPortalTags(rawS1).replace(/[a-zA-Z0-9.-]+\.(?:com|co\.kr|net|org|kr)/gi, "").trim();
  if (!/[.?!]$/.test(rawS1)) {
    rawS1 += ".";
  }

  const s1 = rawS1;
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
## 1. 한눈에 보는 핵심 요약 및 지원 배경

${s1}

신청 절차가 복잡해 수백만 원에 달하는 정부 지원 혜택을 그냥 지나치실 뻔하셨나요? 오늘 글 하나로 지원 자격부터 모바일 3분 컷 신청법, 서류 반려 방지 꿀팁까지 알기 쉽게 꼼꼼히 정리해 드릴게요!

이번 ${cleanTitle} 대책은 급변하는 경제 여건 속에서 실수요자와 서민·소상공인의 실질적 부담을 덜어드리기 위해 마련되었어요. 예산 배정 규모와 신청 기간을 사전에 꼭 확인하셔서 준비된 혜택을 선점해 보세요.

### 🔍 [30초 컷] 나도 대상자일까? 자가진단 체크
- [ ] 현재 공고일 기준 정상 영업 또는 거주 요건을 충족하고 있나요?
- [ ] 소득 또는 매출 기준이 지원 구간(중위소득 또는 연매출 기준) 이내인가요?
- [ ] 최근 1년 이내 동일 목적의 국비·지방비 유사 지원금을 중복 수령하지 않으셨나요?
- [ ] 필수 제출 서류(주민등록등본, 사업자등록증명원 등)를 온라인으로 즉시 발급 가능한가요?

## 2. 나도 받을 수 있을까? 상세 지원 자격 및 선정 요건

본 지원 제도는 복지 사각지대를 해소하고 꼭 필요한 실수요자에게 혜택이 집중되도록 구체적인 선정 기준을 적용하고 있어요.

### 핵심 자격 요건 및 적격성 심사 기준
- **소득 및 매출 기준:** 기준 중위소득 일정 비율 이하 가구 또는 최근 분기별 매출 증빙이 가능한 사업자에게 우선 순위가 주어집니다.
- **연령 및 계층별 특화:** 청년, 소상공인, 신혼부부, 고령자 등 생애주기별 우대 기준이 차등 적용됩니다.
- **활동 및 등록 요건:** 공고일 현재 관할 지자체 또는 국내에 정상 등록되어 활동 중인 대상을 원칙으로 합니다.
- **중복 수혜 배제 검증:** 유사한 정부 지원 사업이나 보조금을 이미 수령 중인 경우 일부 감액되거나 제외될 수 있으니 사전 대조가 필요해요.

${s2} 행정정보 공동이용 시스템을 통해 자격 요건이 자동으로 확인되므로 불필요한 서류 발급 부담을 덜 수 있습니다.

## 3. 얼마나 받을 수 있을까? 지원 혜택 비교 및 실전 시뮬레이션

이번 ${cleanTitle} 대책의 가장 큰 장점은 이전 제도 대비 실질적인 지원 단가와 한도가 대폭 상향되었다는 점이에요.

### 주요 지원 항목별 수치 및 이전 대비 비교
| 지원 항목 | 기존 제도 | 변경(확대) 지원 | 세부 비고 |
| :--- | :--- | :--- | :--- |
| 지원 한도 | 회당 최대 1,000만 원 | 최대 2,000만~7,000만 원 | 한도 대폭 증액 |
| 우대 금리 | 연 3.5%~5.0% 수준 | 연 2.0%~3.2% 우대 | 정책 우대 적용 |
| 수혜 기간 | 최대 12개월 | 최대 24~60개월 연장 | 거치 및 분할상환 |
| 활용처 | 지정 사용처 한정 | 생활·경영 전 영역 | 활용처 전면 확대 |

- **지원 한도 상향:** 기존 기준 대비 최대 30~50% 이상의 실질적인 상향 조정이 이루어졌습니다.
- **비용 경감 혜택:** 일반 시중 평균 대비 1.5%~2.5%p 낮은 특별 정책 우대 금리가 지원됩니다.
- **안정적 분할 상환:** 단기 일시 상환 압박 없이 최장 거치 및 분할 상환이 가능해 유동성을 확보할 수 있어요.

### 실제 적용 사례 및 지원 효과
연 매출 1억 2천만 원 규모의 매장을 운영하는 30대 자영업자 A씨의 경우, 이번 지원 프로그램을 통해 연간 약 340만 원의 고정 금융 비용을 절감할 수 있어요. 최장 거치 기간 동안 원금 상환 없이 우대 금리만 적용받아 월 28만 원 이상의 순 현금 흐름을 추가 확보할 수 있는 셈입니다.

## 4. 3분 컷! 온라인·방문 공식 신청 방법 및 구비 서류

신청 접수는 공식 온라인 전용 플랫폼을 통해 모바일 3분 컷으로 손쉽게 진행하실 수 있습니다.

### 공식 신청 절차 및 구비 서류
- **온라인 공식 접수:** 정부24(gov.kr), 복지로(bokjiro.go.kr), 소상공인정책자금 누리집(ols.semas.or.kr)에서 공동인증서 로그인 후 신청서 작성
- **자동 연동 서류:** 신분증 사본, 주민등록등본, 사업자등록증명원 등 행정정보 연계 동의 시 원클릭 자동 제출
- **오프라인 방문 창구:** 거주지 관할 행정복지센터(주민센터) 복지 창구 및 소상공인 지역센터 방문 가능

${s3}

## 5. 이것 모르면 탈락! 신청 전 주의사항 & 반려 방지 꿀팁

예산이 조기 소진되면 접수가 마감될 수 있으므로, 아래 4가지 반려 방지 체크포인트를 꼭 기억해 두세요!

### 신청 전 주의사항 & 반려 방지 체크리스트
- **서류 발급 유효기간 준수:** 건강보험료 납부확인서, 주민등록초본 등 필수 서류는 신청일 기준 최근 1개월 이내 발급분만 유효합니다.
- **중복 수혜 배제 검증:** 국민취업지원제도, 타 지자체 청년수당 등 동일 목적의 보조금을 수령 중인 경우 즉시 반려되니 사전 확인 필수입니다.
- **공공 마이데이터 정보제공 동의:** 필수 동의 항목을 누락하면 전산 조회가 되지 않아 심사가 장기 보류될 수 있어요.
- **마감 당일 접속 폭주 대비:** 마감일에는 트래픽 폭주로 사이트 오류가 발생할 수 있으니 최소 1~2일 전에 여유 있게 접수를 완료하세요.
    `.trim();

  } else if (finalCategory === "부동산·세제") {
    content = `
## 1. 한눈에 보는 핵심 요약 및 주요 쟁점

${s1}

복잡한 부동산 규제와 세법 때문에 자칫 수천만 원에 달하는 절세 혜택을 놓치실까 봐 걱정되셨나요? 오늘 글 하나로 개편된 세제 요건부터 청약 자격, 실수요자 절세 꿀팁까지 일목요연하게 짚어드릴게요!

이번 ${cleanTitle} 관련 발표는 내 집 마련을 준비하는 실수요자의 주거 사다리를 복원하고 세부담을 합리화하기 위해 마련되었어요. 세목별 적용 시기와 유예 기간을 미리 점검해 보세요.

### 🔍 [30초 컷] 나도 대상자일까? 자가진단 체크
- [ ] 현재 본인 및 세대원 전원이 무주택자이거나 1세대 1주택자인가요?
- [ ] 취득 주택의 공시가격 또는 실거래가가 세제 감면 기준선 이내인가요?
- [ ] 청약통장 가입 기간 및 납입 인정 횟수가 1순위 요건을 충족했나요?
- [ ] DSR 및 LTV 대출 규제 한도 내에서 자금 조달 계획이 수립되어 있나요?

## 2. 나도 받을 수 있을까? 상세 지원 자격 및 선정 요건

이번 부동산 및 세제 개편의 적용 대상은 주택 보유 수, 취득 가액, 청약 통장 보유 기간 등에 따라 세밀하게 나뉩니다.

### 실수요자 자격 요건 및 규제 적용 기준
- **무주택 실수요자:** 생애 최초 주택 구입자 또는 무주택 기간 3년 이상인 세대주에게 우선 청약 배정 및 취득세 감면 혜택이 집중됩니다.
- **1주택 갈아타기 세대:** 일시적 2주택 처분 기한 내 종전 주택을 매도하는 경우 비과세 및 취득세 일반세율이 적용됩니다.
- **청약 가점 요건:** 무주택 기간, 부양가족 수, 청약통장 가입 기간에 따른 가점제 비율과 추첨제 배정 물량이 시장 여건에 맞춰 재조정됩니다.
- **소득 및 대출 한도:** 서민 우대 보금자리·디딤돌 대출 연계 시 부부합산 소득 요건 및 주택가격 기준이 합리적으로 완화됩니다.

${s2} 자격 요건 산정 시 부양가족의 주민등록 분리 여부나 세대원 주택 소유 이력에 따라 부적격 처리가 될 수 있으니 꼼꼼한 확인이 필요해요.

## 3. 얼마나 절감할 수 있을까? 세부 혜택 비교 및 실전 시뮬레이션

이번 세제 및 공급 정책의 핵심은 불필요한 거래 비용을 줄이고 실수요자의 대출 문턱을 낮춰주는 데 있습니다.

### 주요 세목별 수치 비교 및 감면 혜택
| 세목 및 규제 | 기존 기준 | 개편(완화) 기준 | 세부 혜택 |
| :--- | :--- | :--- | :--- |
| 생애최초 취득세 | 200만 원 한도 감면 | 전액 면제 대상 확대 | 서민 실수요 지원 |
| 1주택 양도세 | 9억 원 초과 과세 | 12억 원까지 비과세 | 세부담 대폭 경감 |
| 서민 우대 주담대 | 최대 4억 원 | 최대 6억 원 한도 | 자금 조달 여력 확대 |
| 종부세 기본공제 | 1주택 11억 원 | 12억 원(일반 9억 원) | 중과세율 단순화 |

### 실제 적용 사례 및 지원 효과
생애 최초로 5억 원대 아파트를 매수하는 30대 신혼부부 A씨의 경우, 이번 취득세 감면 확대와 우대 정책 대출을 연계하면 기존 대비 취득세 약 200만 원을 즉시 절약하고, 연간 대출 이자 비용을 약 180만 원 절감할 수 있습니다.

## 4. 3분 컷! 공식 신청 방법 및 조회 창구

주요 세제 혜택 감면 신청과 청약 접수는 공식 공공 전산망을 통해 안전하게 처리하실 수 있습니다.

### 신청 절차 및 공식 확인 창구
- **청약 신청처:** 한국부동산원 청약홈(applyhome.co.kr) 웹사이트 및 모바일 앱
- **세제 감면 신청:** 주택 취득 후 60일 이내 관할 시·군·구청 세무과 방문 또는 위택스(wetax.go.kr) 전자 신청
- **정책 대출 상담:** 주택도시기금(enhf.molit.go.kr) 또는 한국주택금융공사(hf.go.kr) 전용 상담 창구

${s3}

## 5. 이것 모르면 탈락! 신청 전 주의사항 & 반려 방지 꿀팁

부동산 거래는 계약 시점의 세법 규정이 적용되므로 사전에 다음 사항을 철저히 점검해야 합니다.

### 신청 전 주의사항 & 반려 방지 체크리스트
- **계약일과 잔금일 세법 적용 시점 대조:** 법 개정 시행일 이전 계약된 물건의 경우 종전 규정이 적용될 수 있으므로 계약서 작성 시 부칙 조항을 확인하세요.
- **주민등록 세대 분리 적격성:** 부모님과 주민등록상 동일 세대로 등재되어 있는 경우 1세대 다주택으로 판정받을 수 있으니 잔금 전 세대 분리를 완료해야 합니다.
- **취득세 감면 후 실거주 의무 준수:** 감면을 받은 후 3개월 이내 상시 전입하지 않거나 3년 이내 매도·임대 시 감면세액이 추징될 수 있습니다.
- **자금조달계획서 증빙 서류 구비:** 규제지역 취득 시 예금잔액증명서, 차용증 등 소명 자료를 사전에 준비해 두셔야 과태료 처분을 피할 수 있습니다.
    `.trim();

  } else if (finalCategory === "금융·경제") {
    content = `
## 1. 한눈에 보는 핵심 요약 및 주요 배경

${s1}

급변하는 금리와 금융 시장 소식 속에서 내 자산을 지키고 이자 부담을 줄일 수 있는 핵심 방법이 궁금하셨나요? 오늘 글 하나로 달라진 금융 정책의 핵심 수치부터 가계 이자 절감 꿀팁까지 명쾌하게 풀어드릴게요!

이번 ${cleanTitle}에 관한 조치는 통화 정책과 거시 경제 변수를 종합적으로 고려하여 서민 가계의 금융 안전판을 강화하고자 마련되었어요.

### 🔍 [30초 컷] 나도 대상자일까? 자가진단 체크
- [ ] 현재 보유 중인 대출의 금리 유형(변동 vs 고정)과 가산금리를 파악하고 계신가요?
- [ ] 연체 이력 없이 최근 6개월 이상 정상적으로 금융 거래를 유지하셨나요?
- [ ] 대환 대출 인프라를 통한 최저 금리 비교 플랫폼 조회를 진행해 보셨나요?
- [ ] 정책성 저금리 서민금융상품(햇살론, 안심전환대출 등) 지원 자격에 해당하나요?

## 2. 내 지갑에 미칠 영향: 상세 분석 및 시장 파급 효과

이번 금융 조치는 가계의 가처분 소득과 기업의 자금 순환 구조에 직간접적인 파급 효과를 미칩니다.

### 금융 시장 및 가계 경제 파급 영향
- **가계 금융 비용 경감:** 대출 금리 조정 및 갈아타기 플랫폼 확대로 가계의 이자 상환 부담이 실질적으로 줄어듭니다.
- **예적금 수익률 재편:** 수신 금리 변동에 따라 단기 파킹통장 및 정기예금 간 자금 이동이 활발해질 전망입니다.
- **신용 점수 관리 기회:** 성실 상환자에 대한 인센티브 및 정책 우대 금리가 연동되어 신용 회복 기회가 확대됩니다.
- **취약 차주 금융 안전망:** 고금리 다중채무자를 위한 중금리 대환 상품이 추가 공급되어 연체 위험을 방지합니다.

${s2} 금융 소비자들은 변동금리와 고정금리 간 스프레드를 정밀하게 비교하여 상환 전략을 재정비해야 합니다.

## 3. 얼마나 아낄 수 있을까? 주요 지표 비교 및 실전 시뮬레이션

이번 금융 지원 대책의 핵심 지표를 기존 시장 조건과 객관적으로 비교해 드립니다.

### 주요 금융 지표 비교 및 수치 분석
| 주요 금융 지표 | 이전 시장 조건 | 신규 개편 조건 | 개선 및 절감 효과 |
| :--- | :--- | :--- | :--- |
| 체감 대출 금리 | 연 4.8%~5.5% 수준 | 연 3.2%~3.8% 안정 | 최대 1.6%p 이자 절감 |
| 자금 조달 한도 | 1인당 3,000만 원 | 최대 5,000만~1억 원 | 한도 유동성 2배 확대 |
| 분할 상환 기간 | 단기 3년 분할 | 5년~10년 장기 전환 | 월 원리금 부담 완화 |
| 중도상환수수료 | 1.2%~1.5% 부과 | 한시 면제 또는 인하 | 갈아타기 비용 최소화 |

### 실제 적용 사례 및 지원 효과
연 5.2% 금리로 1억 원의 신용·주담대를 이용 중이던 직장인 A씨의 경우, 이번 정책 대환 프로그램을 통해 3.6% 저금리로 갈아탈 경우 연간 약 160만 원의 순이자 비용을 즉시 절약할 수 있습니다. 3년 누적으로는 약 480만 원의 가계 여유 자금이 생기는 셈이에요.

## 4. 3분 컷! 공식 신청 방법 및 조회 창구

스마트폰 하나로 수수료 없이 원클릭 대환 및 자격 조회가 가능합니다.

### 공식 신청 절차 및 확인 창구
- **원클릭 금리 비교:** 금융결제원 대환대출 인프라 및 네이버페이, 카카오페이, 토스 공식 앱
- **공공 금융 상담:** 서민금융진흥원 누리집(kinfa.or.kr) 및 1397 서민금융콜센터
- **제도권 은행 창구:** 주거래 시중은행 모바일 뱅킹 앱 내 정책 금융 섹션

${s3}

## 5. 이것 모르면 손해! 금융 소비자 유의사항 & 피해 예방 팁

최근 정책 금융을 사칭한 불법 금융 사기가 급증하고 있으니 다음 3가지를 반드시 유념하세요.

### 신청 전 주의사항 & 반려 방지 체크리스트
- **정부 기관 사칭 피싱 문자 주의:** 정부·금융당국은 전화나 문자로 특정 앱 설치나 선입금을 절대 요구하지 않습니다.
- **중도상환수수료 면제 조건 확인:** 대환 전 기존 대출의 중도상환수수료 잔여 기간을 조회하여 실제 절감액과 비교 계산하세요.
- **DSR 규제 비율 사전 점검:** 신규 한도 산정 시 타 금융기관의 카드론이나 마이너스통장 한도가 DSR에 합산되니 유휴 한도는 정리해 두는 것이 유리합니다.
    `.trim();

  } else if (finalCategory === "테크·IT") {
    content = `
## 1. 한눈에 보는 핵심 요약 및 주요 배경

${s1}

하루가 다르게 쏟아지는 최신 테크·IT 소식 속에서, 내 업무와 일상에 진짜 도움 되는 핵심 정보만 빠르게 찾고 싶으셨나요? 오늘 글 하나로 신규 기술의 핵심 스펙부터 실무 적용 꿀팁까지 핵심만 쏙쏙 짚어드릴게요!

이번 ${cleanTitle} 관련 혁신은 AI와 디지털 생태계가 결합되어 엔드유저의 생산성과 편의성을 비약적으로 끌어올리는 분수령이 될 전망이에요.

### 🔍 [30초 컷] 나에게 필요한 기술일까? 자가진단 체크
- [ ] 현재 사용 중인 디바이스 또는 소프트웨어 환경이 해당 최신 기능을 지원하나요?
- [ ] 반복적인 일상 업무나 개발 워크플로우를 자동화하여 시간을 단축하고 싶나요?
- [ ] 클라우드 비용이나 컴퓨팅 인프라 리소스를 효율적으로 절감해야 하나요?
- [ ] 보안 취약점 패치 및 최신 OS 업데이트 준비가 완료되어 있나요?

## 2. 내 일상이 어떻게 바뀔까? 상세 분석 및 생태계 파급 효과

새롭게 선보인 기술 아키텍처와 사용자 경험은 일상과 비즈니스 전반에 강력한 변화를 몰고 옵니다.

### 기술 혁신 및 산업 생태계 파급 영향
- **압도적인 생산성 향상:** 자동화 워크플로우와 초경량 엔진을 바탕으로 작업 처리 리드타임이 획기적으로 줄어듭니다.
- **직관적인 사용자 인터페이스:** 복잡한 명령어 없이도 터치나 자연어 입력만으로 원하는 작업을 완벽히 수행할 수 있어요.
- **오픈 플랫폼 생태계 확장:** 폭넓은 API 연동을 통해 기존 업무 도구들과의 통합 호환성이 대폭 강화되었습니다.
- **차세대 프라이버시 보호:** 온디바이스 암호화와 최신 보안 프로토콜로 개인정보 유출 걱정 없이 안전하게 활용 가능합니다.

${s2} 사용자 환경에 따라 최적화 세팅이 다를 수 있으니 공식 가이드라인을 참조하시는 것이 좋습니다.

## 3. 얼마나 빨라졌을까? 핵심 지표 및 스펙 비교

이번 기술 혁신의 체감 성능을 이전 세대와 한눈에 비교해 보세요.

### 주요 벤치마크 수치 및 이전 세대 대비 비교
| 주요 성능 지표 | 이전 세대 사양 | 차세대 아키텍처 | 향상 수치 및 효과 |
| :--- | :--- | :--- | :--- |
| 연산 처리 속도 | 기준 1.0x | 최대 2.5x 고속 처리 | 150% 성능 도약 |
| 전력 소모율 | 풀로드 100% | 저전력 최적화 65% | 배터리 소모 35% 절감 |
| 시스템 지연율 | 평균 45ms | 10ms 이내 초저지연 | 실시간 인터랙션 보장 |
| 인프라 운영비 | 고비용 구조 | 토큰 및 메모리 최적화 | 운영비 40% 절감 |

### 실제 적용 사례 및 지원 효과
일일 평균 4시간 이상 데이터 정리와 콘텐츠 편집을 진행하는 프리랜서 A씨의 경우, 이번 신규 도구를 업무에 도입한 후 단순 반복 작업 시간을 하루 1시간 30분 단축할 수 있었습니다. 월 환산 시 30시간 이상의 유의미한 생산성 향상을 거둔 셈입니다.

## 4. 3분 컷! 공식 설치 방법 및 업데이트 동선

공식 소프트웨어 스토어와 개발자 포털을 통해 지금 즉시 최신 버전을 경험해 보세요.

### 공식 설치 절차 및 가이드
- **공식 다운로드:** 공인 앱 마켓(App Store, Google Play) 및 공식 개발사 웹사이트
- **시스템 권장 사양:** 최신 OS 패치가 적용된 환경에서 가장 안정적으로 구동됩니다.
- **릴리스 노트 확인:** 신규 기능 및 버그 픽스 내역은 공식 블로그와 깃허브 레포지토리를 참조하세요.

${s3}

## 5. 이것 모르면 낭패! 설치 전 주의사항 & 호환성 팁

새로운 기능을 원활하게 도입하기 위해 다음 주의사항을 사전에 체크해 보세요.

### 신청 전 주의사항 & 반려 방지 체크리스트
- **데이터 사전 백업 필수:** 대규모 메이저 업데이트 전 중요 작업 파일은 클라우드나 외장 드라이브에 안전하게 백업하세요.
- **서드파티 플러그인 호환성:** 기존에 사용 중이던 외부 확장 프로그램과의 충돌 여부를 커뮤니티 릴리스 노트를 통해 확인하세요.
- **권한 설정 검토:** 백그라운드 데이터 접근 권한과 알림 설정을 필요 최소한으로 최적화하여 배터리 수명을 확보하세요.
    `.trim();

  } else {
    // 사회·문화 등 기본 템플릿
    content = `
## 1. 한눈에 보는 핵심 요약 및 주요 배경

${s1}

생활 속에서 꼭 알아두어야 할 핵심 공공·문화 소식을 빠르게 파악하고 싶으셨나요? 오늘 글 하나로 주요 쟁점부터 실생활 체감 혜택까지 친절하게 정리해 드릴게요!

이번 ${cleanTitle}에 대한 안내는 시민들의 일상 복지와 권익을 보장하기 위해 각계의 의견을 수렴하여 마련되었어요.

### 🔍 [30초 컷] 나에게 해당될까? 자가진단 체크
- [ ] 현재 거주 중인 지역 또는 생활권에서 제공되는 공공 혜택인가요?
- [ ] 공고된 일정 및 신청 기간 내에 참여가 가능한 상태인가요?
- [ ] 구비 서류나 참가 자격 기준에 부합하는지 확인해 보셨나요?
- [ ] 공공 누리집이나 전용 포털을 통해 실시간 접수 현황을 확인하셨나요?

## 2. 내 생활에 미칠 영향: 상세 혜택 및 선정 요건

본 정책 및 사업은 시민들이 실생활에서 즉각 체감할 수 있는 실질적인 편의를 제공하는 데 중점을 둡니다.

### 주요 혜택 및 공공 서비스 지원 내용
- **시민 편익 증진:** 일상 속 행정 서비스와 문화 프로그램에 대한 접근성이 대폭 개선됩니다.
- **취약 계층 맞춤 지원:** 어르신, 다문화 가구, 1인 가구 등을 위한 특화 편의가 함께 제공됩니다.
- **안전 및 환경 기준 강화:** 공공 인프라의 위생과 안전 점검이 한층 엄격하게 이루어집니다.

${s2}

## 3. 얼마나 달라질까? 주요 혜택 비교 및 실전 시뮬레이션

이번 개편으로 시민들이 누릴 수 있는 일상 혜택을 기존과 비교해 드립니다.

### 주요 변화 비교표
| 항목 | 기존 운영 | 개편(확대) 운영 | 비고 |
| :--- | :--- | :--- | :--- |
| 이용 대상 | 제한적 선별 지원 | 일반 시민 누구나 이용 | 대상 대폭 확대 |
| 운영 시간 | 평일 주간 한정 | 야간 및 주말 확대 운영 | 편의성 극대화 |
| 이용 비용 | 부분 유료 부담 | 무료 또는 대폭 할인 | 가계 부담 완화 |

### 실제 적용 사례 및 지원 효과
해당 공공 시설과 문화 바우처를 정기적으로 이용하는 시민 A씨의 경우, 이번 확대 프로그램을 통해 매월 약 12만 원 상당의 여가·문화 비용을 절약할 수 있습니다.

## 4. 3분 컷! 공식 신청 및 참여 방법

공식 지자체 포털을 통해 모바일로 간편하게 신청하고 참여하실 수 있습니다.

### 참여 절차 및 안내
- **공식 접수처:** 관할 시·도청 공식 누리집 및 공공 예약 포털
- **문의처:** 120 다산콜센터 및 지자체 전담 안내 부서

${s3}

## 5. 이것 모르면 놓쳐요! 신청 전 주의사항 꿀팁

### 신청 전 주의사항 & 반려 방지 체크리스트
- **신분증 지참:** 현장 확인 시 본인 인증이 필요하므로 모바일 신분증을 준비해 두세요.
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

  // 카테고리별 맞춤 FAQ 구성 (구글 FAQPage 스키마 대응)
  let defaultFaq: ArticleFaqItem[] = [];

  if (finalCategory === "정책·지원금" || finalCategory === "부동산·세제") {
    defaultFaq = [
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
  } else if (finalCategory === "금융·경제") {
    defaultFaq = [
      {
        question: `${title.slice(0, 25)} 이슈가 가계 경제와 금융 시장에 미치는 영향은 무엇인가요?`,
        answer: "이번 조치 및 지표 변화는 대출 금리와 가계 이자 부담, 금융 자산의 기대 수익률에 직접적인 영향을 주며, 중장기적인 자산 배분 전략의 재조정이 요구됩니다.",
      },
      {
        question: "투자자 및 금융 소비자가 주의해야 할 핵심 유의점은 무엇인가요?",
        answer: "단기적인 시장 루머보다는 공식 통계와 중앙은행 및 금융당국의 공식 발표에 주목하고, 금리 변동성에 대비한 리스크 관리가 필요합니다.",
      },
    ];
  } else if (finalCategory === "테크·IT") {
    defaultFaq = [
      {
        question: `${title.slice(0, 25)}의 핵심 기술 변화와 이전 세대 대비 차별점은 무엇인가요?`,
        answer: "차세대 고성능 아키텍처와 혁신적 사용자 경험을 적용하여 데이터 처리 속도와 전력 효율성을 대폭 개선한 것이 이번 기술의 핵심 강점입니다.",
      },
      {
        question: "일반 사용자와 개발자가 이용할 수 있는 일정은 언제인가요?",
        answer: "공식 출시 및 플랫폼 업데이트는 로드맵에 따라 글로벌 순차 배포되며, 공식 기술 문서와 개발자 포털을 통해 세부 일정이 공지됩니다.",
      },
    ];
  } else {
    // 사회·문화
    defaultFaq = [
      {
        question: `${title.slice(0, 25)} 사안의 핵심 쟁점과 사회적 논란 배경은 무엇인가요?`,
        answer: "기존 제도의 실효성과 공공의 형평성을 둘러싸고 각계각층의 시각이 교차하고 있으며, 시대적 요구를 반영한 제도 개선의 필요성이 핵심 배경입니다.",
      },
      {
        question: "향후 관련 절차와 사회적 공론화는 어떻게 진행되나요?",
        answer: "관할 기관의 추가 검토 회의 및 공청회를 거쳐 제도 보완 방안이 마련될 예정이며, 대중 여론과 각계 의견 수렴이 지속될 전망입니다.",
      },
    ];
  }

  const cardBadge = extractCardBadge(
    validated.sanitized.title,
    validated.sanitized.content,
    validated.sanitized.category
  );

  return {
    title: validated.sanitized.title,
    card_title: cleanseCardTitle(validated.sanitized.title),
    slug: validated.sanitized.slug,
    summary: validated.sanitized.summary,
    content: validated.sanitized.content,
    category: validated.sanitized.category,
    metaTitle: validated.sanitized.metaTitle || `${title} | Brief Post`,
    metaDescription: validated.sanitized.metaDescription || `${s1.slice(0, 90)} 심층 분석`,
    faq: defaultFaq,
    ctaType: determineCtaType(finalCategory, title, content),
    imageTheme: detectImageTheme(undefined, finalCategory, title, content),
    highlightBadge: cardBadge.badgeText,
  };
}

const KOREAN_KEYWORD_MAP: Array<{ regex: RegExp; en: string }> = [
  // 지역
  { regex: /부산/g, en: "busan" },
  { regex: /서울/g, en: "seoul" },
  { regex: /경기/g, en: "gyeonggi" },
  { regex: /인천/g, en: "incheon" },
  { regex: /대구/g, en: "daegu" },
  { regex: /대전/g, en: "daejeon" },
  { regex: /광주/g, en: "gwangju" },
  { regex: /울산/g, en: "ulsan" },
  { regex: /강원/g, en: "gangwon" },
  { regex: /충북|충청북도/g, en: "chungbuk" },
  { regex: /충남|충청남도/g, en: "chungnam" },
  { regex: /전북|전라북도/g, en: "jeonbuk" },
  { regex: /전남|전라남도/g, en: "jeonnam" },
  { regex: /경북|경상북도/g, en: "gyeongbuk" },
  { regex: /경남|경상남도/g, en: "gyeongnam" },
  { regex: /제주/g, en: "jeju" },
  { regex: /세종/g, en: "sejong" },

  // 수혜 대상
  { regex: /소상공인|자영업자|소진공|골목상권/g, en: "small-business" },
  { regex: /중소기업|중기부/g, en: "sme" },
  { regex: /벤처기업|스타트업/g, en: "startup" },
  { regex: /청년|대학생/g, en: "youth" },
  { regex: /신혼부부/g, en: "newlywed" },
  { regex: /고령자|어르신|노인/g, en: "senior" },
  { regex: /구직자|취업준비|실업/g, en: "job-seeker" },
  { regex: /근로자|직장인|노동자/g, en: "worker" },
  { regex: /무주택/g, en: "non-homeowner" },
  { regex: /임차인|세입자/g, en: "tenant" },
  { regex: /임대인/g, en: "landlord" },
  { regex: /다자녀/g, en: "multi-child" },

  // 지원 및 정책 키워드
  { regex: /에너지\s*바우처/g, en: "energy-voucher" },
  { regex: /바우처/g, en: "voucher" },
  { regex: /에너지/g, en: "energy" },
  { regex: /지원금|보조금|장려금/g, en: "subsidy" },
  { regex: /정책자금|경영안정자금/g, en: "policy-fund" },
  { regex: /환급(?:금)?/g, en: "refund" },
  { regex: /장학금/g, en: "scholarship" },
  { regex: /우대\s*금리|저리/g, en: "low-rate" },
  { regex: /대출/g, en: "loan" },
  { regex: /금리/g, en: "rate" },
  { regex: /감면|면제/g, en: "reduction" },
  { regex: /복지/g, en: "welfare" },
  { regex: /수당/g, en: "allowance" },
  { regex: /패스/g, en: "pass" },
  { regex: /연금/g, en: "pension" },
  { regex: /일자리|고용/g, en: "employment" },

  // 부동산 & 세제
  { regex: /아파트/g, en: "apartment" },
  { regex: /주택|주거/g, en: "housing" },
  { regex: /청약/g, en: "subscription" },
  { regex: /분양/g, en: "presale" },
  { regex: /전세/g, en: "jeonse" },
  { regex: /월세/g, en: "monthly-rent" },
  { regex: /재건축/g, en: "reconstruction" },
  { regex: /재개발/g, en: "redevelopment" },
  { regex: /양도세/g, en: "capital-gains-tax" },
  { regex: /취득세/g, en: "acquisition-tax" },
  { regex: /종부세/g, en: "real-estate-tax" },
  { regex: /세금|세제/g, en: "tax" },

  // 경제 & 금융
  { regex: /기준금리/g, en: "base-rate" },
  { regex: /물가/g, en: "inflation" },
  { regex: /주식|증시|코스피/g, en: "stock" },
  { regex: /환율/g, en: "exchange-rate" },
  { regex: /한국은행/g, en: "bok" },
  { regex: /수출/g, en: "export" },
  { regex: /투자/g, en: "investment" },
  { regex: /가상자산|코인|비트코인/g, en: "crypto" },

  // 테크 & IT
  { regex: /인공지능|생성형\s*ai/g, en: "ai" },
  { regex: /반도체/g, en: "semiconductor" },
  { regex: /클라우드/g, en: "cloud" },
  { regex: /보안/g, en: "security" },
  { regex: /소프트웨어/g, en: "software" },
  { regex: /플랫폼/g, en: "platform" },
  { regex: /모바일/g, en: "mobile" },

  // 행정 & 액션
  { regex: /공고|발표|개시/g, en: "notice" },
  { regex: /신청|접수/g, en: "apply" },
  { regex: /모집/g, en: "recruit" },
  { regex: /확대|개편/g, en: "expand" },
];

/**
 * 한글/혼합 제목을 기반으로 안정적이고 의미 있는 영문 슬러그를 생성
 * - 기사 핵심 키워드를 기반으로 한 의미 있는 영문 슬러그(예: busan-small-business-energy-voucher-2026) 우선 생성
 * - 변환 실패 시에도 category-date-keyword 형태의 규칙적인 슬러그 생성 (무의미한 brief-yr4y5 등 해시 원천 차단)
 */
export function createEnglishSlug(title: string, category?: string): string {
  const clean = sanitizePlainText(title);

  // 1. 연도 추출 (예: 2026, 2025 등)
  const yearMatch = clean.match(/\b(202[4-9]|203[0-9])\b/);
  const year = yearMatch ? yearMatch[1] : "";

  // 2. 제목 내 기존 영문 단어 추출
  const existingEnglishWords = clean
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["the", "and", "for", "with", "this", "that", "from"].includes(w));

  // 3. 한글 키워드 사전 매핑
  const mappedTokens: string[] = [];
  for (const item of KOREAN_KEYWORD_MAP) {
    if (item.regex.test(clean)) {
      if (!mappedTokens.includes(item.en)) {
        mappedTokens.push(item.en);
      }
    }
  }

  // 4. 결합 및 우선순위 토큰 구성
  const allTokens = [...mappedTokens, ...existingEnglishWords];
  const uniqueTokens = Array.from(new Set(allTokens)).filter(Boolean);

  // 연도가 있고 아직 토큰에 없다면 추가
  if (year && !uniqueTokens.includes(year)) {
    uniqueTokens.push(year);
  }

  // 의미 있는 토큰이 2개 이상 모인 경우: 결합하여 안정적 슬러그 반환
  if (uniqueTokens.length >= 2) {
    const slugBase = uniqueTokens.slice(0, 5).join("-");
    return slugBase.toLowerCase();
  }

  // 5. 토큰이 부족할 경우: 규칙적인 category-date-keyword 형태 생성
  const catKey = (category || "").trim();
  let categorySlug = "policy-subsidy";
  if (catKey.includes("부동산") || catKey.includes("세제")) categorySlug = "real-estate-tax";
  else if (catKey.includes("금융") || catKey.includes("경제")) categorySlug = "finance-economy";
  else if (catKey.includes("테크") || catKey.includes("IT")) categorySlug = "tech-it";
  else if (catKey.includes("사회") || catKey.includes("문화")) categorySlug = "society-culture";
  else if (catKey.includes("정책") || catKey.includes("지원금")) categorySlug = "policy-subsidy";

  // 날짜 생성 (YYYYMMDD)
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const fallbackKeyword = uniqueTokens[0] || (clean.length > 0 ? "guide" : "notice");
  return `${categorySlug}-${dateStr}-${fallbackKeyword}`;
}
