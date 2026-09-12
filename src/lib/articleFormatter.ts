/**
 * 기사 상세 본문의 가독성과 시각적 완성도를 극대화하는 전문 미디어 포맷터
 * - 마크다운/HTML이 문단(<p>), 소제목(<h2>, <h3>), 리스트(<ul>, <li>)로 명확히 분리
 * - 소제목(h2)은 독립 블록 요소(block mt-8 mb-3)와 좌측 블루 바(border-l-4 border-blue-600 pl-3) 적용
 * - 과도한 앰버 박스 적용 원천 차단: 오직 명시적 '주의사항/유의사항' 1~2줄 단락에만 한정 적용
 */

/**
 * 1. 주의사항/유의사항 콜아웃(Callout) 알림 박스 변환:
 *    - 일반 본문 설명이나 대주제 헤딩에는 절대 적용 금지
 *    - 오직 '### 주의사항' 전용 헤딩 또는 '주의사항:'으로 시작하는 1~2줄 단락에만 한정 적용
 */
export function formatCalloutBoxes(html: string): string {
  if (!html) return "";

  // 1-A. <p> 단락이 명확히 '주의사항:' 또는 '[주의사항]' 등으로 시작하는 1~2줄 단락(최대 300자)만 변환
  let formatted = html.replace(
    /<p\b[^>]*>\s*(?:\[|※|⚠️)?\s*(?:<strong>)?\s*(주의사항|유의사항|독자\s*유의점)\s*(?:<\/strong>)?\s*[:：\]]\s*([^\n<]{5,350}?)<\/p>/gi,
    (match, label, body) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const cleanBody = body.replace(/^[:：\s]+/, "").trim();

      return `<aside class="callout-amber w-full bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100 mb-1">
          <span class="text-base">⚠️</span>
          <span>${cleanLabel}</span>
        </div>
        <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed">
          ${cleanBody}
        </div>
      </aside>`;
    }
  );

  // 1-B. <li> 항목이 명확히 '주의사항:' 또는 '[주의사항]' 등으로 시작하는 1~2줄 항목만 변환
  formatted = formatted.replace(
    /<li\b[^>]*>\s*(?:<p>)?\s*(?:\[|※|⚠️)\s*(?:<strong>)?\s*(주의사항|유의사항|독자\s*유의점)\s*(?:<\/strong>)?\s*[:：\]]\s*([^\n<]{5,350}?)(?:<\/p>)?\s*<\/li>/gi,
    (match, label, content) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const cleanContent = content.replace(/^[:：\s]+/, "").trim();

      return `<li class="list-none my-3 !pl-0 !block w-full">
        <aside class="callout-amber w-full bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 rounded-r-lg text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
          <div class="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100 mb-1">
            <span class="text-base">⚠️</span>
            <span>${cleanLabel}</span>
          </div>
          <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed">
            ${cleanContent}
          </div>
        </aside>
      </li>`;
    }
  );

  // 1-C. <h3> 태그의 제목 자체가 오직 '주의사항' 또는 '유의사항' 단독인 경우에만 바로 뒤 짧은 <p>와 결합
  // (헤딩 제목에 다른 내용이 섞여있으면 절대 매칭하지 않음)
  formatted = formatted.replace(
    /<h3\b[^>]*>\s*(?:⚠️|※|\[)?\s*(주의사항|유의사항|독자\s*유의점|필독사항)\s*(?:\]|:)?\s*<\/h3>\s*<p\b[^>]*>([^\n<]{5,350}?)<\/p>/gi,
    (match, cleanTitle, contentBlock) => {
      return `<aside class="callout-amber w-full bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100 mb-1.5">
          <span class="text-base">⚠️</span>
          <span>${cleanTitle.trim()}</span>
        </div>
        <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed">
          ${contentBlock.trim()}
        </div>
      </aside>`;
    }
  );

  return formatted;
}

/**
 * 2. 불릿 리스트 키워드/머리말 하이라이트 배지:
 *    - 리스트 내 강조 텍스트(<strong> 또는 콜론 앞 텍스트)에
 *      text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block mr-1.5 적용
 */
export function formatBulletHighlights(html: string): string {
  if (!html) return "";

  // 2-A. <li> 내에 <strong>키워드</strong>: 또는 <strong>키워드:</strong> 가 있는 경우
  let formatted = html.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*<strong>)([^<]{2,40}?)(<\/strong>\s*[:：]|\s*[:：]\s*<\/strong>)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, p2, rest) => {
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;

      const cleanKeyword = keyword.replace(/[:：]/g, "").trim();
      const cleanRest = rest.replace(/^[:：]\s*/, "").replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  // 2-B. <li> 내에 콜론 없이 선두에 <strong>키워드</strong> 만 있는 경우
  formatted = formatted.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*<strong>)([^<]{2,30}?)(<\/strong>\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, p2, rest) => {
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;

      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/^[:：]\s*/, "").replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  // 2-C. <li> 키워드: 내용 (strong 태그가 없는 일반 불릿)
  formatted = formatted.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*)([가-힣a-zA-Z0-9\s]{2,25}?)([:：]\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, colon, rest) => {
      if (keyword.includes("<span") || rest.includes("callout-amber")) return match;

      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  // 2-D. 배지나 콜아웃이 없는 일반 불릿 항목에 블루 닷 부여
  formatted = formatted.replace(
    /<li\b([^>]*)>(\s*(?:<p>)?\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, attrs, p1, content) => {
      if (content.includes("callout-amber") || content.includes("text-blue-700") || attrs.includes("callout")) {
        return match;
      }
      const cleanContent = content.replace(/<\/?p>/gi, "").trim();
      return `<li class="flex items-start text-slate-700 dark:text-slate-300 leading-relaxed"${attrs}><span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/80 mt-2.5 shrink-0 mr-2.5"></span><span>${cleanContent}</span></li>`;
    }
  );

  return formatted;
}

/**
 * 3. H2 태그 및 본문 태그 독립 블록 스타일링:
 *    - h2: display: block, margin-top: 2rem, margin-bottom: 0.75rem, border-l-4 border-blue-600 pl-3
 */
export function formatTagTypography(html: string): string {
  if (!html) return "";

  // 3-A. <h2> 태그를 명확한 독립 블록 요소 및 블루 바 스타일로 보강
  let formatted = html.replace(
    /<h2(\b[^>]*)>/gi,
    (match, attrs) => {
      // 기존 클래스 제거 후 표준 클래스로 통일
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<h2 class="block border-l-4 border-blue-600 pl-3 py-0.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-3 tracking-tight"${cleanAttrs}>`;
    }
  );

  // 3-B. <h3> 태그 스타일 보강
  formatted = formatted.replace(
    /<h3(\b[^>]*)>/gi,
    (match, attrs) => {
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<h3 class="block text-[17px] sm:text-[18px] font-bold text-slate-800 dark:text-slate-200 mt-6 mb-2.5 tracking-tight"${cleanAttrs}>`;
    }
  );

  // 3-C. <p> 문단 줄간격 및 여백 보강
  formatted = formatted.replace(
    /<p(\b[^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes("callout")) return match;
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<p class="text-slate-700 dark:text-slate-300 font-normal leading-relaxed mb-4 text-[16px] sm:text-[17px]"${cleanAttrs}>`;
    }
  );

  return formatted;
}

/**
 * 최종 본문 HTML 스타일링 파이프라인
 */
export function enhanceArticleHtml(html: string): string {
  if (!html) return "";
  // 1단계: 엄격한 주의사항 콜아웃 (과도한 적용 없이 1~2줄 한정)
  let enhanced = formatCalloutBoxes(html);
  // 2단계: 불릿 목록 키워드 블루 배지 변환
  enhanced = formatBulletHighlights(enhanced);
  // 3단계: H2 블록 요소 및 단락 분리 타이포그래피 주입
  enhanced = formatTagTypography(enhanced);
  return enhanced;
}
