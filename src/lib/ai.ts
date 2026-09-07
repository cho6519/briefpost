/**
 * ==============================================================================
 * [AI 기사 재가공 및 SEO 최적화 서비스 모듈]
 * 원본 기사의 팩트를 기반으로 저작권 및 검색엔진 중복 패널티를 완벽히 우회하는
 * 100% 패러프레이징(Paraphrasing) 전문 에디터 프롬프트를 실행합니다.
 * ==============================================================================
 */

import {
  verifyAndSanitizeArticle,
  normalizeThreeLineSummary,
  sanitizePlainText,
  extractTitleKeywords,
} from "./articleValidator";

export interface RewrittenArticleResult {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  metaTitle: string;
  metaDescription: string;
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

const SYSTEM_PROMPT = `당신은 정책·세제·생활경제 및 테크 미디어 수석 에디터이자 구글 검색엔진 최적화(SEO) 및 구글 애드센스 정책 최고 전문가입니다.
주어지는 원본 기사나 보도자료의 팩트(Fact)를 철저히 검증하고, 저작권 분쟁 및 검색엔진의 중복 콘텐츠(Duplicate Content) 패널티를 원천 차단하기 위해 원문의 어휘와 문장 구조를 100% 새롭게 재작성(Paraphrasing)하십시오.

[카테고리 선택지 제한]
기사를 면밀히 분석한 후 반드시 아래 5가지 카테고리 중 가장 부합하는 하나만 정확히 골라 "category" 값에 지정하십시오:
- '정책·지원금'
- '부동산·세제'
- '금융·경제'
- '테크·IT'
- '사회·문화'

[카테고리별 맞춤 소제목 구조 (절대 획일적 소제목 강제 금지)]
기사의 본문은 반드시 기사 제목 및 카테고리에 완벽히 부합하는 소제목(##) 3개로 구성하십시오:
1. '정책·지원금':
   - ## 지원 대상 및 핵심 자격 요건
   - ## 무엇이 얼마나 달라지나? (핵심 변경 혜택)
   - ## 어떻게 신청하나? (신청 방법 및 주의사항)
2. '부동산·세제':
   - ## 주요 정책 및 세제 개편 핵심
   - ## 시장 거래 반응 및 가격 영향 분석
   - ## 실수요자 대응 전략 및 가이드
3. '금융·경제':
   - ## 시장 핵심 동향 및 주요 배경
   - ## 거시 경제 지표 및 시장 파급 효과
   - ## 향후 시장 전망 및 투자자 유의점
4. '테크·IT':
   - ## 신제품 및 핵심 기술 주요 특징
   - ## 사용자 경험 및 산업 전반의 파급 효과
   - ## 향후 출시 일정 및 기술 로드맵
5. '사회·문화':
   - ## 핵심 이슈 개요 및 사건 배경
   - ## 사회적 반응 및 각계 목소리
   - ## 향후 일정 및 주요 쟁점 점검

[CRITICAL: 3줄 핵심 요약 작성 절대 규칙]
1. HTML 태그(<ol>, <li>, <a>, <p> 등), 웹 주소(http://, https://), 마크다운 링크 절대 포함 금지!
2. 반드시 순수한 한글 완전 문장 3개로만 작성하십시오. (줄바꿈 구분: "1. 첫 번째 핵심 요약 문장.\\n2. 두 번째 핵심 요약 문장.\\n3. 세 번째 핵심 요약 문장.")
3. 기사 제목의 주제와 100% 일치하는 팩트만 서술하십시오.

[작성 및 편집 기본 지침]
1. 팩트 준수: 원문의 수치, 고유명사, 핵심 사건 등 사실관계는 왜곡하지 마십시오.
2. 제목-내용 일치: 본문과 요약은 기사 제목의 핵심 주제를 철저히 관통해야 합니다.
3. 영문 슬러그(slug): 기사의 핵심 주제를 담은 3~6단어의 영문 소문자/하이픈 식별자를 만드십시오.
4. SEO 최적화: 60자 내외의 metaTitle과 클릭률 높은 130자 내외의 metaDescription을 작성하십시오.

반드시 다른 설명 없이 아래 JSON 규격 하나만을 엄격히 출력하십시오:
{
  "title": "검색 키워드를 포함한 직관적인 H1 제목 (한국어)",
  "slug": "url-friendly-lowercase-slug-in-english",
  "summary": "1. 첫 번째 핵심 포인트 요약.\\n2. 두 번째 핵심 분석 요약.\\n3. 세 번째 향후 전망 요약.",
  "content": "카테고리에 부합하는 마크다운 H2(##) 소제목 3개가 포함된 풍성한 마크다운 본문",
  "category": "['정책·지원금', '부동산·세제', '금융·경제', '테크·IT', '사회·문화'] 중 하나",
  "metaTitle": "검색 결과용 60자 내외 SEO 타이틀",
  "metaDescription": "검색 결과 클릭률을 높이는 130자 내외 메타 디스크립션"
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

  // 원문 텍스트 내 HTML 태그 사전 정제
  const cleanInputContent = sanitizePlainText(raw.content);
  const cleanInputTitle = sanitizePlainText(raw.title);

  const userPrompt = `[원본 기사 정보]
- 원문 제목: ${cleanInputTitle}
- 원문 출처 카테고리(참고용): ${raw.category || "미지정"}
- 원문 내용:
${cleanInputContent}

위 원본 기사를 바탕으로 일반 독자가 이해하기 쉬운 친절한 전문 기자 톤으로 100% 재작성하십시오.
- HTML 태그(<ol>, <li>, <a> 등)나 외부 링크는 절대 포함하지 마십시오.
- 카테고리('${raw.category || "정책·지원금"}')에 최적화된 마크다운 H2(##) 소제목을 사용하십시오.
- 3줄 요약은 반드시 '1. ...\\n2. ...\\n3. ...' 형식의 순수 텍스트 3문장이어야 합니다.
- 원문 기사의 사실(Fact)과 제목에 100% 부합하는 내용만 기술하십시오.
반드시 지정된 JSON 포맷 하나만 출력해 주세요.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    let rawContent = "";

    // 2-A. Google Gemini API 분기 처리
    if (geminiKey) {
      const preferredModel = process.env.AI_MODEL || "gemini-2.5-flash";
      const candidateModels = Array.from(
        new Set([preferredModel, "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-pro"])
      );

      let lastError: Error | null = null;

      for (const model of candidateModels) {
        const reqController = new AbortController();
        const reqTimeout = setTimeout(() => reqController.abort(), 35000);

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

    // 품질 검증 게이트 통과 및 자동 정제
    const validated = verifyAndSanitizeArticle({
      title: parsed.title,
      slug: (parsed.slug || createEnglishSlug(parsed.title)).toLowerCase().trim(),
      summary: parsed.summary,
      content: parsed.content,
      category: assignedCategory,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
    });

    return {
      title: validated.sanitized.title,
      slug: validated.sanitized.slug,
      summary: validated.sanitized.summary,
      content: validated.sanitized.content,
      category: validated.sanitized.category,
      metaTitle: validated.sanitized.metaTitle || `${validated.sanitized.title} | Brief Post`,
      metaDescription: validated.sanitized.metaDescription || validated.sanitized.summary.replace(/\n/g, " ").slice(0, 130),
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
  const cleanTitle = sanitizePlainText(raw.title || "")
    .replace(/\[심층\s*분석\]/gi, "")
    .replace(/[-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const finalCategory = normalizeCategory(raw.category);
  const title = `[심층 분석] ${cleanTitle}: 핵심 쟁점과 향후 전망`;
  const slug = createEnglishSlug(cleanTitle);

  // 본문 정제
  const pureText = sanitizePlainText(raw.content || "");
  const sentences = pureText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && /[가-힣]/.test(s) && !s.includes("http"));

  // 3줄 요약 문장 선별
  const s1 =
    sentences[0] ||
    `${cleanTitle} 관련 최신 동향과 주요 발표 내용이 시장과 국민들의 뜨거운 관심을 모으고 있습니다.`;
  const s2 =
    sentences[1] ||
    "주요 이해관계자 및 관련 업계 전반에 미칠 파급 효과와 구체적인 추진 방안이 다각도로 논의되고 있습니다.";
  const s3 =
    sentences[2] ||
    "향후 세부 일정과 공식적인 후속 발표가 이어질 예정이므로 관련 공고와 동향을 지속적으로 점검할 필요가 있습니다.";

  // 3줄 요약 정규화
  const { summary } = normalizeThreeLineSummary(`${s1}\n${s2}\n${s3}`, pureText, cleanTitle);

  // 카테고리별 맞춤 소제목 및 본문 구성
  let content = "";

  if (finalCategory === "정책·지원금") {
    content = `
${s1}

## 지원 대상 및 핵심 자격 요건

본 제도는 지원이 절실한 실수요자와 정책 수혜 대상을 중심으로 명확한 자격 기준을 마련하고 있습니다. 공고일 기준 대상 요건을 충족하는지 선제적으로 점검하는 것이 유리합니다.

- **핵심 대상:** 공고일 기준 자격 요건 충족자
- **소득 및 연령 요건:** 공공 기준 지침 및 관련 규정에 따른 적격 기준
- **우선 지원 항목:** 실수요 중심 혜택 제공 및 심사 가점 요건 반영

## 무엇이 얼마나 달라지나? (핵심 변경 혜택)

${s2}

전문가들은 "기존 지원 체계 대비 실질적인 체감 혜택이 확대된 것이 이번 사안의 핵심"이라며 "개인별 상황에 맞춘 맞춤형 지원 제도를 적시에 활용할 필요가 있다"고 강조했습니다.

## 어떻게 신청하나? (신청 방법 및 주의사항)

${s3}

공식 전용 포털 및 관련 접수 창구를 통해 온라인 신청이 가능하며, 세부 제출 서류와 접수 일정을 사전에 철저히 확인해야 불이익을 방지할 수 있습니다.
    `.trim();
  } else if (finalCategory === "부동산·세제") {
    content = `
${s1}

## 주요 정책 및 세제 개편 핵심

${cleanTitle}에 대한 시장의 관심이 집중되면서 관련 세제 규제와 거래 환경의 변화가 가시화되고 있습니다. 이번 조치는 시장 안정성과 거래 투명성을 확보하기 위한 핵심 정책 기조를 반영하고 있습니다.

- **핵심 쟁점:** 세제 개편 및 대출 규제 환경 변화
- **시장 반응:** 주요 권역별 거래 동향 및 가격 변동성 주시
- **적용 시점:** 관련 법령 및 시행령 고시 일정에 따른 단계별 시행

## 시장 거래 반응 및 가격 영향 분석

${s2}

부동산 및 세무 전문가들은 "세부적인 과세 기준과 금융 규제의 변화가 실제 거래량과 가격 형성에 직접적인 변수로 작용하고 있다"며 "지역별, 주택 유형별 양극화 현상에 주목해야 한다"고 진단했습니다.

## 실수요자 대응 전략 및 가이드

${s3}

실수요자들은 본인의 자금 조달 계획과 보유 현황을 면밀히 분석하고, 세제 변경에 따른 유불리를 선제적으로 계산하여 신중한 의사결정을 내릴 필요가 있습니다.
    `.trim();
  } else if (finalCategory === "금융·경제") {
    content = `
${s1}

## 시장 핵심 동향 및 주요 배경

${cleanTitle}에 대한 글로벌 금융 시장 및 국내 경제 주체들의 이목이 집중되고 있습니다. 거시 경제 지표의 변동과 주요 정책 당국의 기조 변화가 이번 시장 흐름을 견인하는 핵심 원인으로 분석됩니다.

- **주요 지표:** 기준금리, 물가상승률 및 주요 통화 환율 동향
- **시장 영향:** 자금 조달 비용 및 채권·주식 시장 변동성 확대
- **당국 기조:** 통화 정책 정상화 및 금융 건전성 강화 기조

## 거시 경제 지표 및 시장 파급 효과

${s2}

금융 시장 분석가들은 "대내외 불확실성 속에서 주요 경제 지표의 흐름이 기업의 수익성과 가계의 이자 부담에 직접적인 영향을 미치고 있다"고 평가하며, 향후 통화 정책 방향을 주시할 것을 권고했습니다.

## 향후 시장 전망 및 투자자 유의점

${s3}

향후 발표될 주요 경제 데이터와 중앙은행의 추가 입장 발표에 따라 단기 변동성이 확대될 수 있으므로, 투자자들은 포트폴리오 다변화와 리스크 관리를 철저히 병행해야 합니다.
    `.trim();
  } else if (finalCategory === "테크·IT") {
    content = `
${s1}

## 신제품 및 핵심 기술 주요 특징

${cleanTitle}의 등장은 관련 디지털 산업과 테크 생태계에 새로운 기술적 이정표를 제시하고 있습니다. 혁신적인 기능과 향상된 성능을 통해 사용자 경험을 한 단계 끌어올렸다는 평가를 받고 있습니다.

- **핵심 기술:** 차세대 아키텍처 및 성능 고도화
- **사용자 편의:** 직관적인 인터페이스 및 멀티 플랫폼 호환성
- **경쟁력:** 기존 솔루션 대비 대폭 향상된 처리 속도와 안정성

## 사용자 경험 및 산업 전반의 파급 효과

${s2}

IT 업계 전문가들은 "이번 발표는 단순한 신제품 출시를 넘어 관련 산업 전반의 생태계를 재편하는 계기가 될 것"이라며, "경쟁사들의 후속 대응과 플랫폼 확장 추이를 면밀히 지켜볼 필요가 있다"고 밝혔습니다.

## 향후 출시 일정 및 기술 로드맵

${s3}

공식 출시 일정과 함께 글로벌 서비스 전개 계획이 순차적으로 진행될 예정이며, 향후 정기 업데이트를 통해 신규 기능이 지속적으로 추가될 전망입니다.
    `.trim();
  } else {
    // 사회·문화
    content = `
${s1}

## 핵심 이슈 개요 및 사건 배경

${cleanTitle}에 관한 소식이 알려지면서 대중과 사회 각계의 폭넓은 관심이 모아지고 있습니다. 이번 사안은 시대적 흐름과 사회적 요구가 결합되어 대두된 중요한 사회문화적 이슈로 평가받고 있습니다.

## 사회적 반응 및 각계 전문가 분석

${s2}

각계 전문가들은 이번 사안이 지닌 사회적 함의를 면밀히 분석하면서, "단순한 일회성 이슈에 그치지 않고 제도적 보완과 문화적 인식 개선으로 이어져야 한다"고 입을 모았습니다.

## 향후 일정 및 주요 쟁점 점검

${s3}

관련 기관 및 단체들의 후속 조치와 공청회 등 세부 일정이 이어질 예정이므로, 객관적인 사실관계에 기반하여 향후 진행 과정을 차분하게 지켜볼 필요가 있습니다.
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

  return {
    title: validated.sanitized.title,
    slug: validated.sanitized.slug,
    summary: validated.sanitized.summary,
    content: validated.sanitized.content,
    category: validated.sanitized.category,
    metaTitle: validated.sanitized.metaTitle || `${title} | Brief Post`,
    metaDescription: validated.sanitized.metaDescription || `${s1.slice(0, 90)} 심층 분석`,
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
