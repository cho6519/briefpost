/**
 * 기사 상세 본문의 가독성과 시각적 완성도를 극대화하는 전문 미디어 포매터
 * - 마크다운/HTML의 문단(<p>), 소제목(<h2>, <h3>), 리스트(<ul>, <li>)를 명확히 분리
 * - 소제목(h2)은 독립 블록 요소(block mt-8 mb-3)와 좌측 블루 바(border-l-4 border-blue-600 pl-3) 적용
 * - 과도한 엠버 박스 적용 원천 차단: 오직 명시된 '주의사항/유의사항' 1~2개 단락에만 한정 적용
 */

/**
 * 1. 주의사항/유의사항 엄격 콜아웃 박스 변환
 */
export function formatCalloutBoxes(html: string): string {
  if (!html) return "";

  let formatted = html.replace(
    /<p\b[^>]*>\s*(?:\[|⚠️)?\s*(?:<strong>)?\s*(주의사항|유의사항|독자\s*유의사항)\s*(?:<\/strong>)?\s*[:：\]]\s*([^\n<]{5,350}?)<\/p>/gi,
    (match, label, body) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const cleanBody = body.replace(/^[:：\s]+/, "").trim();

      return `<aside class="callout-amber w-full bg-amber-50/90 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-950 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
          <span class="text-base">⚠️</span>
          <span>${cleanLabel}</span>
        </div>
        <div class="text-amber-950 font-normal text-[14.5px] leading-relaxed">
          ${cleanBody}
        </div>
      </aside>`;
    }
  );

  formatted = formatted.replace(
    /<li\b[^>]*>\s*(?:<p>)?\s*(?:\[|⚠️)\s*(?:<strong>)?\s*(주의사항|유의사항|독자\s*유의사항)\s*(?:<\/strong>)?\s*[:：\]]\s*([^\n<]{5,350}?)(?:<\/p>)?\s*<\/li>/gi,
    (match, label, content) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const cleanContent = content.replace(/^[:：\s]+/, "").trim();

      return `<li class="list-none my-3 !pl-0 !block w-full">
        <aside class="callout-amber w-full bg-amber-50/90 border-l-4 border-amber-400 p-4 rounded-r-lg text-amber-950 text-sm shadow-2xs leading-relaxed">
          <div class="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
            <span class="text-base">⚠️</span>
            <span>${cleanLabel}</span>
          </div>
          <div class="text-amber-950 font-normal text-[14.5px] leading-relaxed">
            ${cleanContent}
          </div>
        </aside>
      </li>`;
    }
  );

  formatted = formatted.replace(
    /<h3\b[^>]*>\s*(?:⚠️|\[)?\s*(주의사항|유의사항|독자\s*유의사항|필독사항)\s*(?:\]|:)?\s*<\/h3>\s*<p\b[^>]*>([^\n<]{5,350}?)<\/p>/gi,
    (match, cleanTitle, contentBlock) => {
      return `<aside class="callout-amber w-full bg-amber-50/90 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-950 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-2 font-bold text-amber-900 mb-1.5">
          <span class="text-base">⚠️</span>
          <span>${cleanTitle.trim()}</span>
        </div>
        <div class="text-amber-950 font-normal text-[14.5px] leading-relaxed">
          ${contentBlock.trim()}
        </div>
      </aside>`;
    }
  );

  return formatted;
}

/**
 * 2. 불릿 리스트 키워드 머리말 하이라이트 배지
 */
export function formatBulletHighlights(html: string): string {
  if (!html) return "";

  let formatted = html.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*<strong>)([^<]{2,40}?)(<\/strong>\s*[:：]|\s*[:：]\s*<\/strong>)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, p2, rest) => {
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;

      const cleanKeyword = keyword.replace(/[:：]/g, "").trim();
      const cleanRest = rest.replace(/^[:：\s]*/, "").replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  formatted = formatted.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*<strong>)([^<]{2,30}?)(<\/strong>\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, p2, rest) => {
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;

      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/^[:：\s]*/, "").replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  formatted = formatted.replace(
    /<li\b[^>]*>(\s*(?:<p>)?\s*)([가-힣a-zA-Z0-9\s]{2,25}?)([:：]\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, keyword, colon, rest) => {
      if (keyword.includes("<span") || rest.includes("callout-amber")) return match;

      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block shrink-0 mr-1.5 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  formatted = formatted.replace(
    /<li\b([^>]*)>(\s*(?:<p>)?\s*)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, attrs, p1, content) => {
      if (content.includes("callout-amber") || content.includes("text-blue-700") || attrs.includes("callout")) {
        return match;
      }
      const cleanContent = content.replace(/<\/?p>/gi, "").trim();
      return `<li class="flex items-start text-slate-700 font-medium leading-relaxed"${attrs}><span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 text-blue-600 mt-2.5 shrink-0 mr-2.5"></span><span>${cleanContent}</span></li>`;
    }
  );

  return formatted;
}

/**
 * 3. H2 태그 및 본문 태그 독립 블록 스타일링:
 *    - h2: display: block, margin-top: 2rem, margin-bottom: 0.75rem, border-l-4 border-blue-600 pl-3, text-slate-900 font-bold
 */
export function formatTagTypography(html: string): string {
  if (!html) return "";

  let formatted = html.replace(
    /<h2(\b[^>]*)>/gi,
    (match, attrs) => {
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<h2 class="block border-l-4 border-blue-600 pl-3 py-0.5 text-xl sm:text-2xl font-bold text-slate-900 mt-8 mb-3 tracking-tight"${cleanAttrs}>`;
    }
  );

  formatted = html.replace(
    /<h3(\b[^>]*)>/gi,
    (match, attrs) => {
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<h3 class="block text-[17px] sm:text-[18px] font-bold text-slate-900 mt-6 mb-2.5 tracking-tight"${cleanAttrs}>`;
    }
  );

  formatted = html.replace(
    /<p(\b[^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes("callout")) return match;
      const cleanAttrs = attrs.replace(/\s*class="[^"]*"/gi, "");
      return `<p class="text-slate-800 font-normal leading-relaxed mb-4 text-[16px] sm:text-[17px]"${cleanAttrs}>`;
    }
  );

  return formatted;
}

/**
 * 4. 비교표(Table) 스타일 화이트 톤앤매너 렌더링:
 *    - 외곽 테두리: border border-slate-200 rounded-xl overflow-hidden shadow-sm
 *    - 헤더(th): bg-slate-100 text-slate-900 font-semibold py-3 px-4 text-center border-b border-slate-200
 *    - 본문 셀(td): bg-white text-slate-800 py-3 px-4 text-sm border-b border-slate-100 even:bg-slate-50/50
 *    - 모바일 화면에서도 깨지지 않도록 overflow-x-auto 래퍼로 감쌈
 */
export function formatTableElements(html: string): string {
  if (!html || !html.includes("<table")) return html;

  let formatted = html.replace(
    /<table\b([^>]*)>([\s\S]*?)<\/table>/gi,
    (match, tableAttrs, tableInner) => {
      let styledInner = tableInner.replace(
        /<th\b([^>]*)>/gi,
        '<th class="bg-slate-100 text-slate-900 font-semibold py-3 px-4 text-center border-b border-slate-200 whitespace-nowrap tracking-tight"$1>'
      );

      styledInner = styledInner.replace(
        /<td\b([^>]*)>/gi,
        '<td class="bg-white text-slate-800 py-3 px-4 text-sm border-b border-slate-100 even:bg-slate-50/50 leading-relaxed"$1>'
      );

      styledInner = styledInner.replace(
        /<caption\b([^>]*)>/gi,
        '<caption class="text-slate-900 font-bold text-base mb-3 text-left caption-top px-1"$1>'
      );

      styledInner = styledInner.replace(
        /<tr\b([^>]*)>/gi,
        '<tr class="transition-colors hover:bg-slate-50/80 even:bg-slate-50/50"$1>'
      );

      return `<div class="w-full my-6 overflow-x-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <table class="w-full text-sm border-collapse text-left m-0"${tableAttrs}>
          ${styledInner}
        </table>
      </div>`;
    }
  );

  return formatted;
}

/**
 * 최종 본문 HTML 스타일링 파이프라인
 */
export function enhanceArticleHtml(html: string): string {
  if (!html) return "";
  let enhanced = formatTableElements(html);
  enhanced = formatCalloutBoxes(enhanced);
  enhanced = formatBulletHighlights(enhanced);
  enhanced = formatTagTypography(enhanced);
  return enhanced;
}
