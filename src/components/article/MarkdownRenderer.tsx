"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ... helper functions 유지 ...


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
 * 마크다운 테이블(비교표) 구조 자동 복원 및 정규화
 * 1. 한 줄로 뭉개진 테이블 행 분리 (| ... | | :--- | -> 개행 삽입)
 * 2. 테이블 헤더 열 개수와 구분선(| :--- |) 열 개수 불일치 자동 동기화 (GFM 파서 파괴 방지)
 * 3. 테이블 시작 전 빈 줄(\n\n) 보장 및 직전 표 제목(예: 주요 ... 비교)을 H3(###)로 정상화
 * 4. 테이블 종료 후 빈 줄(\n\n) 보장
 * 5. 테이블 데이터 행의 부족한 열 자동 패딩
 */
export function repairMarkdownTables(content: string): string {
  if (!content || !content.includes("|")) return content;

  // 1. 테이블 행들이 줄바꿈 없이 한 줄로 이어진 경우 분리 (| | :--- | 또는 | | 데이터 |)
  let text = content.replace(/\|\s*\|\s*(?=[가-힣a-zA-Z0-9\:\-\s\*\#]+\|)/g, "|\n|");

  // 2. 혹시 헤더와 구분선 사이에 빈 줄이 끼어있는 경우 제거
  text = text.replace(/(\|.+?\|\n)\s*\n+(\|\s*:?-+:?\s*\|)/g, "$1$2");

  const lines = text.split("\n");
  const resultLines: string[] = [];

  let inTable = false;
  let headerColCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 파이프로 시작하고 파이프로 끝나는 테이블 행 후보
    const isTableLine = trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length >= 3;

    if (isTableLine) {
      if (!inTable) {
        // [테이블 시작]
        inTable = true;

        // 테이블 시작 직전 행 처리: 빈 줄 확보 및 직전 표 제목 H3 승격
        if (resultLines.length > 0) {
          const lastIdx = resultLines.length - 1;
          const prevLine = resultLines[lastIdx].trim();

          if (prevLine !== "") {
            // 직전 줄이 표 제목(예: "주요 금융 지원 비교", "비교표") 형태인 경우 H3로 승격
            if (
              !prevLine.startsWith("#") &&
              (prevLine.includes("비교") || prevLine.includes("표") || prevLine.includes("현황") || prevLine.includes("조건") || prevLine.includes("기준")) &&
              prevLine.length <= 40
            ) {
              resultLines[lastIdx] = `### ${prevLine}\n`;
            } else {
              resultLines.push("");
            }
          }
        }

        // 헤더 행의 열 개수 측정
        const cols = trimmed.split("|").slice(1, -1);
        headerColCount = cols.length;
        resultLines.push(trimmed);
        continue;
      }

      // [테이블 내부]
      // 구분선 행 판별 (예: | :--- | :--- | 또는 | --- | --- |)
      const isDelimiterRow = /^\|(\s*:?-{2,}:?\s*\|)+$/.test(trimmed);
      if (isDelimiterRow) {
        const delimiterCols = trimmed.split("|").slice(1, -1);
        if (delimiterCols.length !== headerColCount && headerColCount > 0) {
          // 구분선 열 개수가 헤더 열 개수와 다르면 헤더에 맞춰 재생성
          const fixedDelimiter = "| " + Array(headerColCount).fill(":---").join(" | ") + " |";
          resultLines.push(fixedDelimiter);
          continue;
        }
      } else if (headerColCount > 0) {
        // 일반 데이터 행의 열 개수 확인
        const dataCols = trimmed.split("|").slice(1, -1);
        if (dataCols.length < headerColCount) {
          // 열이 부족한 경우 빈 셀 추가
          const padding = " |".repeat(headerColCount - dataCols.length);
          resultLines.push(trimmed.slice(0, -1) + padding + "|");
          continue;
        }
      }

      resultLines.push(trimmed);
    } else {
      if (inTable) {
        // [테이블 종료 직후]
        inTable = false;
        headerColCount = 0;
        if (trimmed !== "") {
          resultLines.push("");
        }
      }
      resultLines.push(line);
    }
  }

  return resultLines.join("\n");
}

/**
 * 마크다운 원시 텍스트 정제 및 한글 인라인 볼드 전처리
 * - 마크다운 테이블 구조 자동 복원 및 구분선 열 개수 정규화
 * - 한글 조사가 바로 붙은 **단어**조사 형태를 <strong>단어</strong>조사로 치환하여 파서 누락 원천 차단
 * - 문장 끝 찌꺼기 기호(#, ---) 정제
 * - 긴 벽돌글 2~3문장 단위 자동 문단 분리
 */
export function preprocessMarkdown(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // 0. 불필요한 기계적 접두사 ('체감형 혜택 시뮬레이션:') 완전 제거
  text = text.replace(/###\s*체감형\s*혜택\s*시뮬레이션\s*:\s*/gi, "### ");
  text = text.replace(/체감형\s*혜택\s*시뮬레이션\s*:\s*/gi, "");

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

  // 5. 마크다운 비교표(Table) 구조 자동 복원 및 구분선 컬럼 개수 정규화 (GFM 파서 파괴 방지)
  text = repairMarkdownTables(text);

  // 6. 문장 끝에 붙어있는 ---는 단락 뒤 독립된 수평선(<hr>)으로 분리 (테이블 구분선 제외)
  text = text.replace(/([^\n\|])\s*---\s*(?=\n|$)/g, "$1\n\n---\n\n");
  text = text.replace(/\n+---\s*\n+(?=[^\|])/g, "\n\n---\n\n");

  // 7. 긴 텍스트 덩어리(벽돌글) 2~3문장 단위 문단 분리
  text = breakLongParagraphs(text);

  // 8. **볼드 텍스트**가 한글 조사(이/가/은/는/을/를/의/에/로/도 등)와 붙어있어 마크다운 파서가 무시하는 현상 해결
  text = text.replace(/\*\*([^\*\n]+?)\*\*([가-힣a-zA-Z0-9])/g, "<strong>$1</strong>$2");
  text = text.replace(/\*\*([^\*\n]+?)\*\*/g, "<strong>$1</strong>");

  return text.trim();
}

/**
 * ReactNode로부터 순수 텍스트를 안전하게 추출하는 헬퍼 함수
 */
function extractNodeText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) {
    return node.map(extractNodeText).join("");
  }
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return extractNodeText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

/**
 * 자가진단 인터랙티브 체크박스 아이템 (체류 시간 극대화 인터랙션)
 */
function InteractiveTaskItem({ children, defaultChecked }: { children: React.ReactNode; defaultChecked?: boolean }) {
  const [isChecked, setIsChecked] = useState(defaultChecked ?? false);

  return (
    <li
      onClick={() => setIsChecked(!isChecked)}
      role="checkbox"
      aria-checked={isChecked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setIsChecked(!isChecked);
        }
      }}
      className={`group flex items-start text-slate-800 font-medium text-[15px] sm:text-[15.5px] leading-relaxed gap-3 p-3 sm:p-3.5 rounded-xl border my-2.5 shadow-2xs transition-all duration-200 cursor-pointer select-none ${
        isChecked
          ? "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs"
          : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-blue-300"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-md border text-xs font-bold shrink-0 mt-0.5 transition-all duration-200 ${
          isChecked
            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs scale-105"
            : "bg-white border-slate-300 text-transparent group-hover:border-blue-400"
        }`}
      >
        ✓
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">{children}</div>
      {isChecked && (
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 self-start mt-0.5 animate-in fade-in">
          적합 확인
        </span>
      )}
    </li>
  );
}

/**
 * 전문 미디어 표준 마크다운 렌더러 (react-markdown + remark-gfm + rehype-raw)
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const cleanMarkdown = preprocessMarkdown(content);
  let h2Count = 0;

  return (
    <div className={`article-markdown-body space-y-6 text-slate-800 font-normal leading-relaxed text-[16px] sm:text-[17px] break-keep ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 단일 H1 원칙: 본문 내부의 h1은 자동으로 h2 스타일로 렌더링 (빈 헤딩 방지)
          h1: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            h2Count++;
            return (
              <h2
                id={`toc-heading-${h2Count}`}
                className="block border-l-[4px] border-blue-600 pl-3.5 py-0.5 text-[21px] sm:text-[23px] font-bold text-slate-900 mt-10 mb-4 tracking-tight leading-snug scroll-mt-24"
                {...props}
              >
                {children}
              </h2>
            );
          },
          // H2: 소제목(h2) - text-slate-900 font-bold (완전한 짙은 검정색으로 파란 바 옆에 또렷하게 표시)
          h2: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            h2Count++;
            const textContent = React.Children.toArray(children)
              .map((c) => (typeof c === "string" ? c : ""))
              .join("")
              .replace(/^[0-9]+[.)]\s*/, "")
              .trim();
            const slugId = "heading-" + textContent.toLowerCase().replace(/[^\w\uAC00-\uD7A3]+/g, "-").replace(/^-+|-+$/g, "");
            const finalId = slugId !== "heading-" ? slugId : `toc-heading-${h2Count}`;
            return (
              <h2
                id={finalId}
                data-toc-id={`toc-heading-${h2Count}`}
                className="block border-l-[4px] border-blue-600 pl-3.5 py-0.5 text-[21px] sm:text-[23px] font-bold text-slate-900 mt-10 mb-4 tracking-tight leading-snug scroll-mt-24"
                {...props}
              >
                {children}
              </h2>
            );
          },
          // H3: 소제목(h3) - 자가진단, 시뮬레이션, 체크리스트 등에 특화 하이라이트 부여
          h3: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;

            // '체감형 혜택 시뮬레이션:' 텍스트 잔여물 완벽 정제
            const cleanChildNode = (child: React.ReactNode): React.ReactNode => {
              if (typeof child === "string") {
                return child.replace(/체감형\s*혜택\s*시뮬레이션\s*:\s*/gi, "").trim();
              }
              return child;
            };

            const processedChildren = Array.isArray(children)
              ? children.map(cleanChildNode)
              : cleanChildNode(children);

            const textContent = String(children);
            const isSimulation =
              textContent.includes("시뮬레이션") ||
              textContent.includes("적용 사례") ||
              textContent.includes("지원 효과") ||
              textContent.includes("사례");
            const isChecklist =
              textContent.includes("자가진단") ||
              textContent.includes("체크리스트") ||
              textContent.includes("주의사항");

            if (isSimulation) {
              return (
                <div className="mt-8 mb-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-l-4 border-amber-500">
                  <h3
                    className="flex items-center gap-2 text-[17.5px] sm:text-[19px] font-extrabold text-amber-950 m-0 tracking-tight leading-snug"
                    {...props}
                  >
                    <span className="text-amber-600">💡</span>
                    <span>{processedChildren}</span>
                  </h3>
                </div>
              );
            }

            if (isChecklist) {
              return (
                <div className="mt-8 mb-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-l-4 border-blue-600">
                  <h3
                    className="flex items-center gap-2 text-[17.5px] sm:text-[19px] font-extrabold text-slate-900 m-0 tracking-tight leading-snug"
                    {...props}
                  >
                    <span className="text-blue-600">🔍</span>
                    <span>{children}</span>
                  </h3>
                </div>
              );
            }

            return (
              <h3
                className="block text-[17px] sm:text-[18.5px] font-bold text-slate-900 mt-7 mb-2.5 tracking-tight leading-snug"
                {...props}
              >
                {children}
              </h3>
            );
          },
          // 링크(a): 외부 공식 링크는 새 탭(target="_blank", rel="noopener noreferrer") 및 직관적인 블루 버튼/하이라이트 스타일
          a: ({ node, href, children, ...props }) => {
            if (!href) return <span>{children}</span>;
            const isExternal = href.startsWith("http://") || href.startsWith("https://");
            const childText = String(children);
            const isActionLink =
              childText.includes("바로가기") ||
              childText.includes("수강") ||
              childText.includes("신청") ||
              childText.includes("조회") ||
              childText.includes("누리집") ||
              childText.includes("배움터");

            if (isActionLink) {
              return (
                <a
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1 my-1 text-[13.5px] sm:text-[14.5px] font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/90 rounded-lg shadow-2xs hover:shadow-xs transition-all no-underline cursor-pointer align-middle"
                  {...props}
                >
                  <span>{children}</span>
                  <span className="text-xs font-bold text-blue-600">↗</span>
                </a>
              );
            }

            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-4 decoration-blue-300 hover:decoration-blue-600 transition-colors inline-flex items-center gap-0.5"
                {...props}
              >
                <span>{children}</span>
                {isExternal && <span className="text-xs opacity-75">↗</span>}
              </a>
            );
          },
          // 본문 일반 단락(<p>): text-slate-800 leading-relaxed font-normal (충분한 명도 대비 확보)
          p: ({ node, children, ...props }) => {
            if (!children || (typeof children === "string" && !children.trim())) return null;
            return (
              <p
                className="text-slate-800 leading-relaxed font-normal mb-5 text-[16px] sm:text-[17px] break-keep"
                {...props}
              >
                {children}
              </p>
            );
          },
          // 수평 구분선(hr): 은은한 그레이 구분선
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t border-slate-200" {...props} />
          ),
          // 볼드(strong): 선명한 본문 다크 텍스트
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-slate-900" {...props} />
          ),
          // 순서 없는 리스트(ul)
          ul: ({ node, ...props }) => (
            <ul className="my-5 space-y-3 list-none pl-0" {...props} />
          ),
          // 순서 있는 리스트(ol)
          ol: ({ node, ...props }) => (
            <ol className="my-5 space-y-3 list-decimal pl-5 text-slate-800" {...props} />
          ),
          // 체크박스(input type=checkbox) 커스텀 렌더링
          input: ({ node, ...props }) => {
            if (props.type === "checkbox") {
              return null; // InteractiveTaskItem에서 자체 렌더링
            }
            return <input {...props} />;
          },
          // 불릿 리스트(li): 체크박스(task-list-item) 및 핵심 실무 서식(3줄 포맷, 3단 구조, 시뮬레이션 속성) 자동 스타일링
          li: ({ node, children, className, ...props }) => {
            const isTaskItem = className?.includes("task-list-item");
            if (isTaskItem) {
              return (
                <InteractiveTaskItem defaultChecked={false}>
                  {children}
                </InteractiveTaskItem>
              );
            }

            const text = extractNodeText(children).trim();

            // 1. 단계별 신청 절차 3줄 포맷
            if (text.startsWith("소요 기간:") || text.includes("소요 기간:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/90 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold shrink-0 mt-0.5">⏱️</span>
                  <div className="flex-1 font-medium">{children}</div>
                </li>
              );
            }
            if (text.startsWith("준비물 및 서류:") || text.includes("준비물 및 서류:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/90 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">📑</span>
                  <div className="flex-1 font-medium">{children}</div>
                </li>
              );
            }
            if (text.startsWith("자주 하는 실수:") || text.includes("자주 하는 실수:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-600 text-white text-xs font-bold shrink-0 mt-0.5">⚠️</span>
                  <div className="flex-1 font-medium text-rose-950">{children}</div>
                </li>
              );
            }

            // 2. 탈락·부결 방지 3단 구조
            if (text.startsWith("왜 문제가 되는가:") || text.includes("왜 문제가 되는가:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-600 text-white text-xs font-bold shrink-0 mt-0.5">🚨</span>
                  <div className="flex-1 font-medium text-amber-950">{children}</div>
                </li>
              );
            }
            if (text.startsWith("신청 전 확인법:") || text.includes("신청 전 확인법:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-sky-600 text-white text-xs font-bold shrink-0 mt-0.5">🔍</span>
                  <div className="flex-1 font-medium text-sky-950">{children}</div>
                </li>
              );
            }
            if (text.startsWith("이미 걸렸다면 대응책:") || text.includes("이미 걸렸다면 대응책:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 my-1.5 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold shrink-0 mt-0.5">🛡️</span>
                  <div className="flex-1 font-medium text-emerald-950">{children}</div>
                </li>
              );
            }

            // 3. 자가진단 결격 시 대처법 (💡 대처법:)
            if (text.startsWith("대처법:") || text.includes("대처법:") || text.includes("💡 대처법")) {
              return (
                <li className="flex items-start text-amber-950 text-[14px] sm:text-[14.5px] leading-relaxed gap-2 p-2 rounded-lg bg-amber-50/90 border border-amber-200/70 my-1 shadow-2xs" {...props}>
                  <span className="text-amber-600 text-sm font-bold shrink-0">💡</span>
                  <div className="flex-1 font-normal">{children}</div>
                </li>
              );
            }

            // 4. 가상 시뮬레이션 카드 속성 (신청 가능성, 추천 자금, 주의사항)
            if (text.startsWith("신청 가능성:") || text.includes("신청 가능성:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 my-1 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold shrink-0 mt-0.5">평가</span>
                  <div className="flex-1 font-medium">{children}</div>
                </li>
              );
            }
            if (text.startsWith("추천 자금:") || text.includes("추천 자금:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 my-1 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0 mt-0.5">추천</span>
                  <div className="flex-1 font-medium">{children}</div>
                </li>
              );
            }
            if (text.startsWith("주의사항:") || text.startsWith("핵심 주의사항:") || text.includes("주의사항:")) {
              return (
                <li className="flex items-start text-slate-800 text-[15px] sm:text-[15.5px] leading-relaxed gap-2.5 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 my-1 shadow-2xs" {...props}>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold shrink-0 mt-0.5">주의</span>
                  <div className="flex-1 font-medium">{children}</div>
                </li>
              );
            }

            // 일반 불릿
            return (
              <li
                className="flex items-start text-slate-700 font-medium leading-relaxed gap-2 my-1"
                {...props}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 text-blue-600 mt-2.5 shrink-0 mr-1" />
                <div className="flex-1">{children}</div>
              </li>
            );
          },
          // 비교표(Table) 스타일 화이트 톤앤매너로 교체:
          // 테이블 외곽선: border border-slate-200 rounded-xl overflow-hidden shadow-sm
          table: ({ node, ...props }) => (
            <div className="w-full my-6 overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white">
              <table className="w-full min-w-[520px] text-sm border-collapse text-left m-0" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 border-b border-slate-200" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="bg-white divide-y divide-slate-100" {...props} />
          ),
          // 표 상단 캡션/제목: text-slate-900 font-bold text-base mb-3
          caption: ({ node, ...props }) => (
            <caption
              className="text-slate-900 font-bold text-base mb-3 text-left caption-top px-1"
              {...props}
            />
          ),
          // 표 헤더(<th>): bg-slate-100 text-slate-900 font-semibold py-3 px-4 text-center border-b border-slate-200
          th: ({ node, ...props }) => (
            <th
              className="bg-slate-100 text-slate-900 font-semibold py-3 px-4 text-center border-b border-slate-200 whitespace-nowrap tracking-tight"
              {...props}
            />
          ),
          // 표 데이터 셀(<td>): bg-white text-slate-800 py-3 px-4 text-sm border-b border-slate-100 even:bg-slate-50/50
          td: ({ node, ...props }) => (
            <td
              className="bg-white text-slate-800 py-3 px-4 text-sm border-b border-slate-100 even:bg-slate-50/50 leading-relaxed"
              {...props}
            />
          ),
          // 표 행(tr): 호버 및 교차 배경색 지원
          tr: ({ node, ...props }) => (
            <tr className="transition-colors hover:bg-slate-50/80 even:bg-slate-50/50" {...props} />
          ),
          // 인용구(blockquote): 문맥에 맞는 콜아웃 박스 (YMYL 면책고지, 핵심 요약, 브로커 경고 등)
          blockquote: ({ node, children, ...props }) => {
            const text = extractNodeText(children);
            const isYmyl = text.includes("YMYL") || text.includes("면책 고지") || text.includes("법적 책임");
            const isSummary = text.includes("핵심 지원 요약") || text.includes("핵심 요약") || text.includes("지원 요약");
            const isWarning = text.includes("브로커") || text.includes("사기") || text.includes("주의");

            if (isYmyl) {
              return (
                <aside
                  className="w-full bg-slate-50/95 border-l-4 border-slate-400 p-4 sm:p-4.5 rounded-r-xl my-6 text-slate-700 text-[13.5px] sm:text-[14px] shadow-2xs leading-relaxed"
                  {...props}
                >
                  {children}
                </aside>
              );
            }

            if (isSummary) {
              return (
                <aside
                  className="w-full bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-transparent border-l-4 border-blue-600 p-4 sm:p-5 rounded-r-xl my-6 text-slate-800 text-sm sm:text-[15px] shadow-2xs leading-relaxed"
                  {...props}
                >
                  {children}
                </aside>
              );
            }

            if (isWarning) {
              return (
                <aside
                  className="w-full bg-amber-50/90 border-l-4 border-amber-500 p-4 sm:p-4.5 rounded-r-xl my-6 text-amber-950 text-sm shadow-2xs leading-relaxed"
                  {...props}
                >
                  {children}
                </aside>
              );
            }

            return (
              <aside
                className="w-full bg-slate-50/80 border-l-4 border-blue-500 p-4 rounded-r-xl my-5 text-slate-800 text-sm shadow-2xs leading-relaxed"
                {...props}
              >
                {children}
              </aside>
            );
          },
        }}
      >
        {cleanMarkdown}
      </ReactMarkdown>
    </div>
  );
}
