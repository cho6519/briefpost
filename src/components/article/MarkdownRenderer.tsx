import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 마크다운 원시 텍스트 정제 및 한글 인라인 볼드 전처리
 * - 한글 조사가 바로 붙은 **단어**조사 형태를 <strong>단어</strong>조사로 치환하여 파서 누락 원천 차단
 * - 문장 끝 찌꺼기 기호(#, ---) 정제
 */
export function preprocessMarkdown(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // 1. 단독 빈 헤딩(## 단독 줄) 제거
  text = text.replace(/\n##\s*\n+(?=##)/g, "\n\n");
  text = text.replace(/\n##\s*(\n|$)/g, "\n\n");

  // 2. 소제목과 본문 설명이 한 줄에 뭉개진 경우 자동 분리
  // 예: "2. 모듈형 부품 배치와 자가 수리 가능성 내부 배터리 및..." -> "## 2. ... \n\n내부 배터리 및..."
  text = text.replace(
    /(?:^|\n)(?:##\s*)?([0-9]+\.\s+[가-힣a-zA-Z0-9\s]{2,30}?(?:개선|가능성|의미|특징|요건|기준|절차|배경|전망|효과|대책|현황|동향|분석|방향|역할|전환|원인|구조|방법|혜택|지원|확대|축소|설계|이유|쟁점))\s+([가-힣][^\n]+)/g,
    "\n\n## $1\n\n$2"
  );

  // 3. 줄 끝의 불필요한 단독 # 기호 제거
  text = text.replace(/\s+#(?=\n|$)/g, "");

  // 4. 문장 끝에 붙어있는 ---는 단락 뒤 독립된 수평선(<hr>)으로 분리
  text = text.replace(/([^\n])\s*---\s*(?=\n|$)/g, "$1\n\n---\n\n");
  text = text.replace(/\n+---\s*\n+/g, "\n\n---\n\n");

  // 5. **볼드 텍스트**가 한글 조사(이/가/은/는/을/를/의/에/로/도 등)와 붙어있어 마크다운 파서가 무시하는 현상 해결
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
    <div className={`article-markdown-body break-keep ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 단일 H1 원칙: 본문 내부의 h1은 자동으로 h2 스타일로 렌더링
          h1: ({ node, ...props }) => (
            <h2
              className="block border-l-4 border-blue-600 pl-3 py-0.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4 tracking-tight"
              {...props}
            />
          ),
          // H2: 시원한 여백과 함께 왼쪽에만 블루 포인트 바 적용
          h2: ({ node, ...props }) => (
            <h2
              className="block border-l-4 border-blue-600 pl-3 py-0.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4 tracking-tight"
              {...props}
            />
          ),
          // H3: 블루 바 없이 깔끔한 중간 볼드 폰트로 위계 차별화
          h3: ({ node, ...props }) => (
            <h3
              className="block text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2.5 tracking-tight"
              {...props}
            />
          ),
          // 문단(p): 넉넉한 줄간격과 가독성 폰트 크기
          p: ({ node, ...props }) => (
            <p
              className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed mb-5 text-[16px] sm:text-[17px] break-keep"
              {...props}
            />
          ),
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
