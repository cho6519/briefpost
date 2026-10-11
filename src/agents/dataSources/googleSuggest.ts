/**
 * Google 자동완성 (Google Suggest) 실시간 수집기
 * - API Key 불필요, 실시간 검색어 쿼리 반환
 * - 확인되지 않은 검색량/CPC는 일체 생성하지 않음
 */
export async function fetchGoogleSuggestions(query: string, lang = "ko"): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${lang}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as [string, string[]];
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].filter((item) => typeof item === "string" && item.trim().length > 1);
    }
    return [];
  } catch (err) {
    console.warn(`[GoogleSuggest] '${query}' 수집 중 에러:`, err);
    return [];
  }
}
