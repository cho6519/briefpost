/**
 * 기사 상세 본문의 가독성과 시각적 완성도를 극대화하는 전문 미디어 포맷터
 */

/**
 * 1. 주의사항/유의사항/일정 콜아웃(Callout) 알림 박스 변환:
 *    - '주의사항', '유의사항', '주의점', '유의점' 단락/불릿을
 *    - 단순 불릿 대신 연한 오렌지/앰버 배경의 알림 박스
 *      (bg-amber-50/70 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-900 text-sm)로 렌더링
 */
export function formatCalloutBoxes(html: string): string {
  if (!html) return "";

  // 1-A. 불릿 항목(<li>) 내에 '주의사항/유의사항'이 들어있는 경우 앰버 알림 박스로 변환
  let formatted = html.replace(
    /<li>(\s*(?:<p>)?\s*(?:<strong>)?\s*(?:\[?(주의사항|유의사항|주의점|유의점|주의|유의|필독)\]?[:：]?)\s*(?:<\/strong>)?)([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    (match, p1, label, content) => {
      const cleanContent = content
        .replace(/<\/?strong>/gi, "")
        .replace(/<\/?p>/gi, "")
        .replace(/^[:：]\s*/, "")
        .trim();

      return `<li class="list-none my-4 !pl-0 !block w-full">
        <aside class="callout-amber w-full bg-amber-50/70 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 sm:p-5 rounded-r-lg text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
          <div class="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100 mb-1.5">
            <span class="text-base">⚠️</span>
            <span>${label.trim()}</span>
          </div>
          <div class="text-amber-900/95 dark:text-amber-200/95 font-normal">
            ${cleanContent}
          </div>
        </aside>
      </li>`;
    }
  );

  // 1-B. <h3>...주의사항...</h3> 바로 다음 <p>...</p> 또는 <ul>...</ul> 블록 전체 변환
  formatted = formatted.replace(
    /<h3\b[^>]*>([\s\S]*?(?:주의|유의|주의사항|유의점|주의점|필독|알아둘\s*점)[\s\S]*?)<\/h3>\s*(<(?:p|ul|ol)[\s\S]*?<\/(?:p|ul|ol)>)/gi,
    (match, titleText, contentBlock) => {
      const cleanTitle = titleText.replace(/<[^>]+>/g, "").replace(/^[#\s*•-]+/, "").trim();
      return `<aside class="callout-amber bg-amber-50/70 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed">
        <div class="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100 mb-2">
          <span class="text-base">⚠️</span>
          <span>${cleanTitle}</span>
        </div>
        <div class="text-amber-900/95 dark:text-amber-200/95 font-normal [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1">
          ${contentBlock}
        </div>
      </aside>`;
    }
  );

  // 1-C. <blockquote> 단락을 세련된 인용/강조 콜아웃으로 표준화
  formatted = formatted.replace(
    /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (match, inner) => {
      return `<div class="my-5 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-r-lg text-slate-800 dark:text-slate-200 italic leading-relaxed text-[15px]">${inner}</div>`;
    }
  );

  return formatted;
}

/**
 * 2. 불릿 리스트 키워드 하이라이트:
 *    - "<li><strong>소득 기준:</strong> ..." 또는 "<li>연령: ..." 형태에서
 *    - 콜론(:) 앞부분을 연한 블루 텍스트 배지(text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold inline-block mr-2)로 자동 변환
 *    - 본문 내부 불필요한 중첩 태그 정돈
 */
export function formatBulletHighlights(html: string): string {
  if (!html) return "";

  // 2-A. <li><p><strong>키워드:</strong> 내용</p></li> 또는 <li><strong>키워드:</strong> 내용</li>
  let formatted = html.replace(
    /<li>(\s*(?:<p>)?\s*<strong>)([^:<]{2,30}?)([:：])(<\/strong>\s*)([\s\S]*?)(<\/li>)/gi,
    (match, p1, keyword, colon, p2, rest, p3) => {
      // 이미 callout-amber 처리된 리스트는 통과
      if (rest.includes("callout-amber") || keyword.includes("span")) return match;
      
      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-md font-semibold inline-block shrink-0 mr-2 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  // 2-B. <li> 키워드: 내용 (strong이 없는 일반 불릿)
  formatted = formatted.replace(
    /<li>(\s*(?:<p>)?\s*)([가-힣a-zA-Z0-9\s]{2,20}?)([:：]\s*)([\s\S]*?)(<\/li>)/gi,
    (match, p1, keyword, colon, rest, p2) => {
      if (keyword.includes("<span") || rest.includes("callout-amber")) return match;
      
      const cleanKeyword = keyword.trim();
      const cleanRest = rest.replace(/<\/?p>/gi, "").trim();

      return `<li><span class="text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-md font-semibold inline-block shrink-0 mr-2 text-[14px] shadow-2xs">${cleanKeyword}</span>${cleanRest}</li>`;
    }
  );

  return formatted;
}

/**
 * 최종 본문 HTML 스타일링 파이프라인
 */
export function enhanceArticleHtml(html: string): string {
  if (!html) return "";
  // 1. 주의사항 콜아웃 우선 처리 (불릿 목록 중 주의사항 항목을 앰버 알림 박스로 승격)
  let enhanced = formatCalloutBoxes(html);
  // 2. 일반 불릿 키워드 블루 배지 변환
  enhanced = formatBulletHighlights(enhanced);
  return enhanced;
}
