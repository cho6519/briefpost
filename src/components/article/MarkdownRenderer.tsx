import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 긴 텍스트 덩어리(벽돌글)를 2~3문장 단위로 쪼개어 가독성과 호흡을 확보
 */
export function breakLongParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const formatted = paragraphs.map((p) => {
    const trimmed = p.trim();
    // 마크다운 헤딩(#), 테이블(|), 리스트(-, *, 숫자.), 태그(<)는 건드리지 않음
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("*") ||
      /^[0-9]+\.\s+/.test(trimmed) ||
      trimmed.startsWith("<") ||
      trimmed.length <= 150
    ) {
      return p;
    }

    // 150자 초과하고 마침표가 3개 이상 있는 긴 설명 문단은 2~3문장 단위로 분할
    const sentences = trimmed.split(/(?<=[.!?])\s+(?=[가-힣A-Z"'‘“])/);
    if (sentences.length >= 3) {
      const chunks: string[] = [];
      let current: string[] = [];
      for (const s of sentences) {
        current.push(s);
        if (current.length >= 2) {
          chunks.push(current.join(" "));
          current = [];
        }
      }
      if (current.length > 0) {
        if (chunks.length > 0 && current.length === 1) {
          chunks[chunks.length - 1] += " " + current[0];
        } else {
          chunks.push(current.join(" "));
        }
      }
      return chunks.join("\n\n");
    }

    return p;
  });

  return formatted.join("\n\n");
}

/**
 * 마크다운 원시 텍스트 정제 및 한글 인라인 볼드 전처리
 * - 한글 조사가 바로 붙은 **단어**조사 형태를 <strong>단어</strong>조사로 치환하여 파서 누락 원천 차단
 * - 문장 끝 찌꺼기 기호(#, ---) 정제
 * - 긴 벽돌글 2~3문장 단위 자동 문단 분리
 */
export function preprocessMarkdown(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // 1. 단독 빈 헤딩 기호(#, ##, ### 등 단독 줄) 완전 제거
  text = text.replace(/^\s*#{1,6}\s*$/gm, "");
  text = text.replace(/\n##\s*\n+(?=##)/g, "\n\n");
  text = text.replace(/\n##\s*(\n|$)/g, "\n\n");

  // 2. 소제목과 본문 설명이 한 줄에 뭉개진 경우만 안전하게 분리 (이미 #로 시작하는 줄은 절대 쪼개지 않음)
  text = text.replace(
    /(?:^|\n)(?<!#)([0-9]+\.\s+[가-힣a-zA-Z0-9\s]{2,25}?(?:개선|가능성|의미|특징|요건|기준|절차|배경|전망|효과|대책|현황|동향|분석|방향|역할|전환|원인|구조|방법|혜택|지원|확대|축소|설계|이유|쟁점))\s+([가-힣][^\n]+?(?:다\.|습니다\.|됩니다\.|있습니다\.|합니다\.)[^\n]*)/g,
    "\n\n## $1\n\n$2"
  );

  // 3. 줄 끝의 불필요한 단독 # 기호 제거
  text = text.replace(/\s+#(?=\n|$)/g, "");

  // 4. 대제목 바로 아래 줄에 대제목 말미 찌꺼기 텍스트(예: '및 수치 비교', '및 향후 일정')가 단락으로 중복 노출되는 현상 방지
  const lines = text.split("\n");
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed && !trimmed.startsWith("#")) {
      let prevH2: string | null = null;
      for (let j = cleanedLines.length - 1; j >= 0; j--) {
        const pTrim = cleanedLines[j].trim();
        if (pTrim === "") continue;
        if (pTrim.startsWith("## ")) {
          prevH2 = pTrim;
        }
        break;
      }

      if (prevH2) {
        const headingText = prevH2.replace(/^##\s+[0-9]+\.\s*/, "").trim();
        if (headingText.includes(trimmed) && trimmed.length >= 3) {
          continue; // 중복 찌꺼기 단락 스킵
        }
        if (/^및\s+[가-힣\s]{2,15}$/.test(trimmed) && headingText.includes("및")) {
          continue;
        }
      }
    }
    cleanedLines.push(line);
  }
  text = cleanedLines.join("\n");

  // 5. 문장 끝에 붙어있는 ---는 단락 뒤 독립된 수평선(<hr>)으로 분리
  text = text.replace(/([^\n])\s*---\s*(?=\n|$)/g, "$1\n\n---\n\n");
  text = text.replace(/\n+---\s*\n+/g, "\n\n---\n\n");

  // 6. 긴 텍스트 덩어리(벽돌글) 2~3문장 단위 문단 분리
  text = breakLongParagraphs(text);

  // 7. **볼드 텍스트**가 한글 조사(이/가/은/는/을/를/의/에/로/도 등)와 붙어있어 마크다운 파서가 무시하는 현상 해결
  text = text.replace(/\*\*([^\*\n]+?)\*\*([가-힣a-zA-Z0-9])/g, "<strong>$1</strong>$2");
  text = text.replace(/\*\*([^\*\n]+?)\*\*/g, "<strong>$1</strong>");

  return text.trim();
}

/**
 * 전문 미디어 표준 마크다운 렌더러 (react-markdown + remark-gfm + rehype-raw)
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const cleanMarkdown = preprocessMarkdown(content);

  return (
    <div className={`article-markdown-body space-y-6 text-slate-700 dark:text-slate-300 font-normal leading-relaxed text-[16px] sm:text-[17px] break-keep ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 단일 H1 원칙: 본문 내부의 h1은 자동으로 h2 스타일로 렌더링 (빈 헤딩 방지)
          h1: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            return (
              <h2
                className="block border-l-[4px] border-blue-600 pl-3.5 py-0.5 text-[21px] sm:text-[23px] font-extrabold text-slate-950 dark:text-slate-50 mt-10 mb-4 tracking-tight leading-snug"
                {...props}
              >
                {children}
              </h2>
            );
          },
          // H2: 대제목 - 왼쪽 블루 포인트 바와 굵은 볼드 폰트, 안정적인 상하 여백
          h2: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            return (
              <h2
                className="block border-l-[4px] border-blue-600 pl-3.5 py-0.5 text-[21px] sm:text-[23px] font-extrabold text-slate-950 dark:text-slate-50 mt-10 mb-4 tracking-tight leading-snug"
                {...props}
              >
                {children}
              </h2>
            );
          },
          // H3: 중제목/소제목 - 블루 바 없이 깔끔한 중간 볼드 폰트로 확실한 위계 차별화
          h3: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            return (
              <h3
                className="block text-[17px] sm:text-[18.5px] font-bold text-slate-800 dark:text-slate-200 mt-7 mb-2.5 tracking-tight leading-snug"
                {...props}
              >
                {children}
              </h3>
            );
          },
          // 문단(p): 넉넉한 줄간격(leading-[1.85])과 문단 간 여백(mb-5) (빈 문단 방지)
          p: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            return (
              <p
                className="text-slate-700 dark:text-slate-300 font-normal leading-[1.85] mb-5 text-[16px] sm:text-[17px] break-keep"
                {...props}
              >
                {children}
              </p>
            );
          },
          // 수평 구분선(hr): 은은한 그레이 구분선
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t border-zinc-200 dark:border-zinc-800" {...props} />
          ),
          // 볼드(strong): 선명한 본문 다크 텍스트
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
          ),
          // 순서 없는 리스트(ul)
          ul: ({ node, ...props }) => (
            <ul className="my-5 space-y-3 list-none pl-0" {...props} />
          ),
          // 순서 있는 리스트(ol)
          ol: ({ node, ...props }) => (
            <ol className="my-5 space-y-3 list-decimal pl-5 text-slate-700 dark:text-slate-300" {...props} />
          ),
          // 리스트 항목(li)
          li: ({ node, children, ...props }) => {
            return (
              <li
                className="flex items-start text-slate-700 dark:text-slate-300 leading-relaxed gap-2"
                {...props}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/80 mt-2.5 shrink-0 mr-1" />
                <div className="flex-1">{children}</div>
              </li>
            );
          },
          // 핀테크 스타일 고가독성 2px 컬러 테두리 비교표 (Table)
          table: ({ node, ...props }) => (
            <div className="w-full my-6 overflow-x-auto rounded-xl border-2 border-blue-200 dark:border-blue-800/80 shadow-xs bg-white dark:bg-slate-900">
              <table className="w-full text-sm border-collapse text-left m-0" {...props} />
            </div>
          ),
          // 표 헤더(th): 소프트 블루 배경 + 하단 2px 블루 보더 + 열 구분선
          th: ({ node, ...props }) => (
            <th
              className="bg-blue-50/90 dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold p-3.5 border-b-2 border-blue-200 dark:border-blue-700/80 border-r border-blue-100 dark:border-blue-900/60 last:border-r-0 text-left text-[13.5px] sm:text-sm whitespace-nowrap tracking-tight"
              {...props}
            />
          ),
          // 표 데이터 셀(td): 블루 틴트 격자선 + 텍스트
          td: ({ node, ...props }) => (
            <td
              className="p-3.5 border-b border-blue-100/80 dark:border-slate-800 border-r border-blue-100/50 dark:border-slate-800/80 last:border-r-0 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/80 text-[13.5px] sm:text-sm leading-relaxed"
              {...props}
            />
          ),
          // 표 행(tr): 호버 효과
          tr: ({ node, ...props }) => (
            <tr className="transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/30" {...props} />
          ),
          // 인용구(blockquote): 주의사항 콜아웃 스타일
          blockquote: ({ node, ...props }) => (
            <aside
              className="w-full bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 p-4 rounded-r-lg my-4 text-amber-900 dark:text-amber-200 text-sm shadow-2xs leading-relaxed"
              {...props}
            />
          ),
        }}
      >
        {cleanMarkdown}
      </ReactMarkdown>
    </div>
  );
}
