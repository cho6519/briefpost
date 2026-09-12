/**
 * 기사 상세 본문의 가독성과 시각적 완성도를 극대화하는 전문 미디어 포맷터
 * - DB 수정 없이도 기존 발행된 모든 기사(9월 7일 기사 포함)에 즉시 일괄 적용
 */

/**
 * 1. 주의사항/유의사항 콜아웃(Callout) 알림 박스 자동 변환:
 *    - 본문 내 '주의사항', '유의사항', '주의점', '유의점' 등이 감지되면
 *    - bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-900 박스로 감싸서 출력
 */
export function formatCalloutBoxes(html: string): string {
  if (!html) return "";

  // 1-A. <p> 또는 <blockquote> 내에서 [주의사항], ※ 유의사항, <strong>주의사항:</strong> 등으로 시작하는 단락 감지
  let formatted = html.replace(
    /<p\b[^>]*>(\s*(?:\[|※|\(★\)|★)?\s*(?:<strong>)?\s*(주의사항|유의사항|주의점|유의점|필독\s*사항|알아둘\s*점)\s*(?:\]|:|\))?\s*(?:<\/strong>)?\s*[:：]?\s*)([\s\S]*?)<\/p>/gi,
    (match, prefix, label, body) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const cleanBody = body.replace(/^[:：]\s*/, "").trim();

      return `<aside class="callout-amber w-full bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 sm:p-5 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100 mb-1.5">
          <span class="text-base">⚠️</span>
          <span>${cleanLabel}</span>
        </div>
        <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed">
          ${cleanBody}
        </div>
      </aside>`;
    }
  );

  // 1-B. 불릿 항목(<li>) 내에 '주의사항/유의사항'이 들어있는 경우 앰버 알림 박스로 변환
  formatted = formatted.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*(?:\[|※|\(★\)|★)?\s*(?:<strong>)?\s*(주의사항|유의사항|주의점|유의점|주의|유의|필독)\s*(?:\]|:|\))?\s*(?:<\/strong>)?\s*[:：]?\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, prefix, label, content) => {
      const cleanContent = content
        .replace(/<\/?strong>/gi, "")
        .replace(/<\/?p>/gi, "")
        .replace(/^[:：]\s*/, "")
        .trim();

      return `<li class="list-none my-4 !pl-0 !block w-full">
        <aside class="callout-amber w-full bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 sm:p-5 rounded-r-lg text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
          <div class="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100 mb-1.5">
            <span class="text-base">⚠️</span>
            <span>${label.trim()}</span>
          </div>
          <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed">
            ${cleanContent}
          </div>
        </aside>
      </li>`;
    }
  );

  // 1-C. <h3>...주의사항/유의사항...</h3> 바로 다음 <p>...</p> 또는 <ul>...</ul> 블록 전체 변환
  formatted = formatted.replace(
    /<h3\b[^>]*>([\s\S]*?(?:주의사항|유의사항|주의점|유의점|필독|알아둘\s*점)[\s\S]*?)<\/h3>\s*(<(?:p|ul|ol)[\s\S]*?<\/(?:p|ul|ol)>)/gi,
    (match, titleText, contentBlock) => {
      const cleanTitle = titleText.replace(/<[^>]+>/g, "").replace(/^[#\s*•-]+/, "").trim();
      return `<aside class="callout-amber w-full bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 sm:p-5 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100 mb-2">
          <span class="text-base">⚠️</span>
          <span>${cleanTitle}</span>
        </div>
        <div class="text-amber-900/95 dark:text-amber-200/95 font-normal text-[14.5px] leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1">
          ${contentBlock}
        </div>
      </aside>`;
    }
  );

  // 1-D. <blockquote> 단락을 세련된 강조 콜아웃으로 표준화
  formatted = formatted.replace(
    /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (match, inner) => {
      return `<div class="my-5 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-r-lg text-slate-800 dark:text-slate-200 italic leading-relaxed text-[15px]">${inner}</div>`;
    }
  );

  return formatted;
}

/**
 * 2. 불릿 리스트 키워드/머리말 하이라이트 배지:
 *    - 리스트 내 강조 텍스트(<strong> 또는 콜론 앞 텍스트)에
 *      text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block mr-1 적용
 */
export function formatBulletHighlights(html: string): string {
  if (!html) return "";

  // 2-A. <li> 내에 <strong>키워드</strong>: 또는 <strong>키워드:</strong> 가 있는 경우
  // 콜론이 strong 내부/외부 어디에 있든 완벽하게 감지
  let formatted = html.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*<strong>)([^<]{2,40}?)(<\/strong>\s*[:：]|\s*[:：]\s*<\/strong>)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, p2, rest) => {
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;

      const cleanKeyword = keyword.replace(/[:：]/g, "").trim();
      const cleanRest = rest.replace(/^[:：]\s*/, "").replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  // 2-B. <li> 내에 콜론 없이 선두에 <strong>키워드</strong> 만 있는 경우 (예: <li><strong>핵심 이점</strong> 내용...</li>)
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

  // 2-D. 배지나 콜아웃이 없는 일반 불릿 항목에 세련된 블루 닷 부여
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
 * 3. H2 태그 및 본문 태그 인라인 클래스 보강:
 *    - h2: border-l-4 border-blue-600 pl-3 py-0.5 text-xl font-bold text-slate-900 mt-8 mb-4
 *    - p, li: text-slate-700 leading-relaxed
 */
export function formatTagTypography(html: string): string {
  if (!html) return "";

  // 3-A. <h2> 태그에 직접 블루 세로 바 및 타이포그래피 클래스 주입
  let formatted = html.replace(
    /<h2(\b[^>]*)>/gi,
    (match, attrs) => {
      const existingClassMatch = attrs.match(/class="([^"]*)"/i);
      if (existingClassMatch) {
        return match; // 이미 커스텀 클래스가 있으면 보존
      }
      return `<h2 class="border-l-4 border-blue-600 pl-3 py-0.5 text-xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4 tracking-tight"${attrs}>`;
    }
  );

  return formatted;
}

/**
 * 최종 본문 HTML 스타일링 파이프라인 (기존 기사 100% 무결성 일괄 적용)
 */
export function enhanceArticleHtml(html: string): string {
  if (!html) return "";
  // 1단계: 주의사항/유의사항 콜아웃 우선 감지 및 앰버 박스 변환
  let enhanced = formatCalloutBoxes(html);
  // 2단계: 불릿 목록 머리말/키워드 블루 배지 변환
  enhanced = formatBulletHighlights(enhanced);
  // 3단계: H2 태그 및 타이포그래피 클래스 보강
  enhanced = formatTagTypography(enhanced);
  return enhanced;
}
