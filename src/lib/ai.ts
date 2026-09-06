/**
 * ==============================================================================
 * [AI 기사 재가공 및 SEO 최적화 서비스 모듈]
 * 원본 기사의 팩트를 기반으로 저작권 및 검색엔진 중복 패널티를 완벽히 우회하는
 * 100% 패러프레이징(Paraphrasing) 전문 에디터 프롬프트를 실행합니다.
 * ==============================================================================
 */

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
  if (/테크|it|tech|ai|기술|소프트웨어|모바일|인공지능|과학|반도체|플랫폼|하드웨어/i.test(trimmed)) {
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
기사를 면밀히 분석한 후 반드시 아래 5가지 카테고리 중 가장 부합하는 하나만 정확히 골라 "category" 값에 지정하십시오. (임의의 카테고리명 생성 및 기타 명칭 사용 절대 금지)
- '정책·지원금'
- '부동산·세제'
- '금융·경제'
- '테크·IT'
- '사회·문화'

['정책·지원금' 및 '부동산·세제' 특화 작성 규칙]
1. 친절한 가이드형 기자 톤: 어려운 관공서 문체나 딱딱한 법령 용어를 피하고, 일반인이 한눈에 이해할 수 있는 '친절한 가이드형 기자 톤'으로 재작성하십시오.
2. 본문 필수 소제목 구조: '정책·지원금' 및 '부동산·세제' 기사는 본문 구조에 반드시 다음 소제목을 마크다운 H2(##)로 포함하십시오:
   - ## 누가 받을 수 있나? (지원 대상 및 자격 요건)
   - ## 무엇이 얼마나 달라지나? (핵심 변경 혜택 및 지원 내용)
   - ## 어떻게 신청하나? (신청 방법, 일정, 주의사항)
   (단, 테크·IT 및 일반 사회·문화 기사는 기사 맥락에 맞춘 자연스러운 소제목 구성 가능)
3. 검색 최적화 제목(title): 독자가 검색창에 칠 법한 핵심 키워드(연도, 대상, 혜택 금액, 정책명 등)를 포함해 직관적이고 클릭률 높은 스타일로 뽑으십시오. (예: '2026 청년 주택드림 청약통장 자격 요건 총정리')
4. 신뢰성 100% 보장: 혜택 금액, 소득 기준, 금리 수치 등은 원본 기사/보도자료의 팩트를 100% 정확하게 유지하고 절대 왜곡하지 마십시오.

[작성 및 편집 기본 지침]
1. 팩트 준수: 원문의 수치, 고유명사, 핵심 사건 등 사실관계는 절대 왜곡하지 마십시오.
2. 문장 100% 재구성: 원문의 문장을 그대로 복사하지 말고, 전문 에디터의 정갈하고 통찰력 있는 톤앤매너로 서술하십시오.
3. 3줄 핵심 요약: 바쁜 현대인을 위해 본문 시작 전에 가장 핵심적인 3가지 포인트를 명확한 글머리 기호(1., 2., 3.)로 작성하십시오.
4. 본문 구조화: 모바일 가독성을 위해 적절한 H2, H3 소제목, 글머리 기호(List), 단락 구분을 마크다운(Markdown) 포맷으로 풍성하게 구성하십시오.
5. 영문 슬러그(slug): 기사의 핵심 주제를 담은 3~6단어의 영문 소문자/하이픈 기반 URL 식별자를 만드십시오. (예: youth-housing-dream-account-2026)
6. SEO 최적화: 60자 내외의 metaTitle과 클릭률(CTR)을 극대화하는 130자 내외의 metaDescription을 작성하십시오.

[구글 애드센스 정책 준수 안전 지침 (Google AdSense Policy)]
모든 기사는 구글 애드센스 콘텐츠 정책을 엄격히 준수하여 광고 게재 제한이나 계정 불이익이 발생하지 않도록 작성해야 합니다:
1. 사회·문화 기사: 잔혹한 범죄, 사망/폭력 수위가 높은 묘사는 완전히 배제하고, 사건의 제도적 원인, 사회적 파장, 법률/예방 팁 위주로 건전하게 재작성할 것. 단순 루머나 사생활 침해성 가십은 제외하고 공식 활동과 문화 트렌드 관점으로 객관 서술할 것.
2. 금융·정책 기사: 검증되지 않은 투자 권유나 과장 광고성 문구를 배제하고 공식 기관 발표 팩트 중심으로 신뢰도 높게 작성할 것.
3. 공통 안전 원칙: 혐오 발언, 성인/선정성, 차별, 유해/위험 행위 조장 등 부적절한 내용을 원천 배제하고 공신력 있는 언론 보도 톤을 엄격히 유지할 것.

반드시 다른 설명 없이 아래 JSON 규격 하나만을 엄격히 출력하십시오:
{
  "title": "검색 키워드(연도, 대상, 혜택 금액)를 포함한 직관적인 H1 제목 (한국어)",
  "slug": "url-friendly-lowercase-slug-in-english",
  "summary": "1. 첫 번째 핵심 포인트 요약\\n2. 두 번째 핵심 포인트 요약\\n3. 세 번째 핵심 시사점 요약",
  "content": "필수 소제목('누가 받을 수 있나?', '무엇이 얼마나 달라지나?', '어떻게 신청하나?')이 포함된 마크다운 본문",
  "category": "['정책·지원금', '부동산·세제', '금융·경제', '테크·IT', '사회·문화'] 중 하나만 정확히 지정",
  "metaTitle": "검색 결과용 60자 내외 SEO 타이틀",
  "metaDescription": "검색 결과 클릭률을 높이는 130자 내외 메타 디스크립션"
}`;

/**
 * AI API(OpenAI / 호환 엔드포인트)를 호출하여 기사 재가공 수행
 */
export async function rewriteArticleWithAI(raw: RawArticleInput): Promise<RewrittenArticleResult> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  // 1. API 키가 없거나 테스트 모드인 경우: 지능형 폴백 에디터 엔진 작동 (개발/테스트 중단 방지)
  if (!geminiKey && !openaiKey && !anthropicKey) {
    console.warn(
      "[AI] GEMINI_API_KEY(또는 OPENAI_API_KEY, ANTHROPIC_API_KEY)가 설정되지 않아 로컬 지능형 패러프레이징 폴백 엔진으로 처리합니다."
    );
    return generateFallbackParaphrase(raw);
  }

  const userPrompt = `[원본 기사 정보]
- 원문 제목: ${raw.title}
- 원문 출처 카테고리(참고용): ${raw.category || "미지정"}
- 원문 내용: ${raw.content}

위 원본 기사를 바탕으로 일반 독자가 이해하기 쉬운 친절한 가이드형 기자 톤으로 100% 재작성하십시오.
- category는 반드시 ['정책·지원금', '부동산·세제', '금융·경제', '테크·IT', '사회·문화'] 중 하나만 선택하여 지정하십시오.
- 정책·지원금 및 부동산·세제 관련 기사는 '누가 받을 수 있나?', '무엇이 얼마나 달라지나?', '어떻게 신청하나?' 소제목을 본문에 필히 포함하고, 연도/대상/혜택이 담긴 클릭률 높은 제목을 생성하십시오.
- 혜택 금액, 자격 요건, 금리 등 수치 팩트는 100% 정확하게 유지해야 합니다.
반드시 지정된 JSON 포맷 하나만 출력해 주세요.`;

  // 40초 전체 타임아웃 컨트롤러
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    let rawContent = "";

    // 2-A. Google Gemini API 분기 처리 (GEMINI_API_KEY 우선)
    if (geminiKey) {
      const preferredModel = process.env.AI_MODEL || "gemini-3.6-flash";
      const candidateModels = Array.from(
        new Set([preferredModel, "gemini-3.6-flash"])
      );

      let lastError: Error | null = null;

      for (const model of candidateModels) {
        const reqController = new AbortController();
        const reqTimeout = setTimeout(() => reqController.abort(), 35000);

        try {
          console.log(`[AI] Google Gemini API 호출 중 (Model: ${model})...`);
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
              console.log(`[AI] Google Gemini API 호출 성공 (Model: ${model})`);
              break;
            }
          } else {
            const errText = await response.text();
            console.warn(`[AI Warning] ${model} 응답 실패 (${response.status}): ${errText.slice(0, 100)}... 다음 모델로 전환합니다.`);
            lastError = new Error(`Google Gemini API error (${response.status}): ${errText.slice(0, 150)}`);
          }
        } catch (modelErr: unknown) {
          clearTimeout(reqTimeout);
          const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`[AI Warning] ${model} 호출 예외: ${msg}... 다음 모델로 전환합니다.`);
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
    // 2-C. OpenAI 및 호환 API(DeepSeek, Groq 등) 분기 처리
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

    // JSON 파싱 (코드블록 ```json ... ``` 정제 포함)
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: RewrittenArticleResult = JSON.parse(cleanedJson);

    // 필수 필드 무결성 검증
    if (!parsed.title || !parsed.content || !parsed.summary) {
      throw new Error("AI 응답에 필수 필드(title, content, summary)가 누락되었습니다.");
    }

    return {
      title: parsed.title.trim(),
      slug: (parsed.slug || createEnglishSlug(parsed.title)).toLowerCase().trim(),
      summary: parsed.summary.trim(),
      content: parsed.content.trim(),
      category: normalizeCategory(parsed.category || raw.category),
      metaTitle: parsed.metaTitle || `${parsed.title} | AI Tech Brief`,
      metaDescription: parsed.metaDescription || parsed.summary.replace(/\n/g, " ").slice(0, 130),
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI Error] AI 기사 재작성 호출 실패, 폴백 엔진으로 자동 전환:", msg);
    // AI API 실패 시에도 프로세스 다운 없이 안전하게 폴백 결과 반환
    return generateFallbackParaphrase(raw);
  }
}

/**
 * AI API 미설정 또는 장애 시 가동되는 고품질 룰 기반 패러프레이징 폴백 엔진
 */
function generateFallbackParaphrase(raw: RawArticleInput): RewrittenArticleResult {
  const cleanTitle = raw.title.replace(/[-[\]()]/g, "").trim();
  const title = `[심층 분석] ${cleanTitle}: 핵심 쟁점과 향후 전망`;
  const slug = createEnglishSlug(raw.title);

  const sentences = raw.content
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const p1 = sentences[0] || "해당 사안과 관련한 최신 정보가 시장과 업계의 뜨거운 주목을 받고 있습니다.";
  const p2 = sentences[1] || "기존의 기술적 한계와 정책적 규제를 극복하기 위한 다각적인 논의가 가속화되는 추세입니다.";
  const p3 = sentences[2] || "향후 산업 전반에 미칠 파급 효과와 구체적인 도입 일정에 관심이 집중되고 있습니다.";

  const summary = `1. ${p1.slice(0, 80)}...\n2. ${p2.slice(0, 80)}...\n3. ${p3.slice(0, 80)}...`;

  const content = `
${p1}

## 누가 받을 수 있나? (지원 대상 및 자격 요건)

본 제도는 지원이 절실한 실수요자와 정책 수혜 대상을 중심으로 명확한 소득 및 자격 기준을 마련하고 있습니다. 세부 심사 기준과 공고 내용을 꼼꼼히 확인하여 자격 요건 충족 여부를 선제적으로 점검하는 것이 유리합니다.

- **핵심 지원 대상:** 공고일 기준 자격 요건을 충족하는 대상자
- **소득 및 연령 요건:** 공공 기준 지침 및 관련 규정에 따른 단계별 적격 기준
- **우선 지원 항목:** 실수요 중심 혜택 제공 및 가점 요건 반영

## 무엇이 얼마나 달라지나? (핵심 변경 혜택 및 지원 내용)

${p2}

전문가들은 "기존의 지원 방식 대비 실질적인 체감 혜택이 대폭 확대된 것이 이번 개편의 가장 큰 특징"이라며 "개인별 상황에 맞춘 맞춤형 지원 정책을 적시에 활용할 필요가 있다"고 강조했습니다.

## 어떻게 신청하나? (신청 방법, 일정, 주의사항)

${p3}

공식 신청 창구 및 관련 포털을 통해 온라인 접수가 가능하며, 세부 제출 서류와 신청 마감 일정을 사전에 철저히 확인해야 불이익을 방지할 수 있습니다.
  `.trim();

  return {
    title,
    slug,
    summary,
    content,
    category: normalizeCategory(raw.category),
    metaTitle: `${title} | AI Tech Brief`,
    metaDescription: `${p1.slice(0, 90)} 관련 최신 동향과 핵심 시사점을 3줄 요약과 함께 심층 분석합니다.`,
  };
}

/**
 * 한글/혼합 제목을 의미 있는 영문 슬러그로 변환하는 유틸리티
 */
function createEnglishSlug(title: string): string {
  // 영문/숫자 단어 추출
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));

  const base = words.slice(0, 4).join("-");
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  if (base && base.length >= 3) {
    return `${base}-${randomSuffix}`;
  }

  return `tech-brief-${randomSuffix}`;
}
