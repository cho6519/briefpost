"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DashboardStats,
  PublishQueueItem,
  PipelineExecutionLog,
  RejectedArticleRecord,
} from "@/agents/types";

interface KeywordRow {
  id: string;
  keyword: string;
  category: string;
  source: string;
  searchIntent: string;
  trendScore: number;
  searchVolume: number | null;
  isSearchVolumeEstimate: boolean;
  cpc: number | null;
  isCpcEstimate: boolean;
  grade: string | null;
  score: number | null;
  status: string;
  discoveredAt: string;
}

interface ApiErrorRow {
  id: string;
  runId: string | null;
  endpoint: string;
  errorMessage: string;
  requestData: unknown;
  timestamp: string;
}

interface FailedRunRow {
  id: string;
  status: string;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queueItems, setQueueItems] = useState<PublishQueueItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [rejectedList, setRejectedList] = useState<RejectedArticleRecord[]>([]);
  const [apiErrors, setApiErrors] = useState<ApiErrorRow[]>([]);
  const [failedRuns, setFailedRuns] = useState<FailedRunRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<PipelineExecutionLog[]>([]);
  const [emergencyStop, setEmergencyStop] = useState<{
    isPaused: boolean;
    reason: string;
    updatedAt: string;
    updatedBy: string;
  } | null>(null);

  const ADMIN_KEY_STORAGE = "briefpost_admin_secret";

  const [activeTab, setActiveTab] = useState<
    "queue" | "keywords" | "rejects" | "logs" | "errors"
  >("queue");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isTogglingEmergency, setIsTogglingEmergency] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<PublishQueueItem | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // 관리자 인증 상태 (localStorage x-admin-key 연동)
  const [adminKey, setAdminKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [showKeyPassword, setShowKeyPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 마운트 시 localStorage에서 ADMIN_SECRET 안전 로드
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
      setAdminKey(saved);
      setInputKey(saved);
      if (!saved) {
        setIsKeyModalOpen(true);
      }
    }
  }, []);

  // 공통 x-admin-key 주입 fetch 래퍼 (401 발생 시 자동 감지)
  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      const keyToUse =
        adminKey ||
        (typeof window !== "undefined"
          ? localStorage.getItem(ADMIN_KEY_STORAGE) || ""
          : "");

      if (keyToUse) {
        headers.set("x-admin-key", keyToUse);
      }

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        const errorMsg = "인증 실패 (401 Unauthorized): 관리자 시크릿(ADMIN_SECRET)이 유효하지 않거나 미입력 상태입니다.";
        setAuthError(errorMsg);
        setIsKeyModalOpen(true);
        throw new Error(errorMsg);
      }
      return res;
    },
    [adminKey]
  );

  // 시크릿 키 저장 핸들러
  const handleSaveAdminKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) {
      alert("ADMIN_SECRET 값을 입력해주세요.");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    }
    setAdminKey(trimmed);
    setAuthError(null);
    setIsKeyModalOpen(false);
  };

  // 시크릿 키 초기화 핸들러
  const handleClearAdminKey = () => {
    if (confirm("저장된 관리자 인증 키를 초기화하시겠습니까?")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(ADMIN_KEY_STORAGE);
      }
      setAdminKey("");
      setInputKey("");
      setAuthError("관리자 인증 키가 초기화되었습니다.");
    }
  };

  // 데이터 로드
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/pipeline/stats");
      const json = await res.json();
      if (json.success) {
        setStats(json.stats);
        setEmergencyStop(json.emergencyStop || null);
        setQueueItems(json.queueItems || []);
        setKeywords(json.keywords || []);
        setRejectedList(json.rejectedList || []);
        setApiErrors(json.apiErrors || []);
        setFailedRuns(json.failedRuns || []);
        setRecentLogs(json.recentLogs || []);
        setAuthError(null);
      } else {
        if (json.error) {
          console.warn("대시보드 데이터 로드 경고:", json.error);
        }
      }
    } catch (e) {
      console.error("데이터 로드 실패:", e);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (isMounted) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 10000); // 10초마다 자동 갱신
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, isMounted, adminKey]);

  // 전역 긴급 중지 토글 (pause / resume)
  const handleToggleEmergencyStop = async () => {
    if (isTogglingEmergency) return;
    const isCurrentlyPaused = emergencyStop?.isPaused;
    const action = isCurrentlyPaused ? "resume" : "pause";
    const promptMsg = isCurrentlyPaused
      ? "전역 기사 발행을 정상 재개하시겠습니까?"
      : "🚨 경고: 전역 기사 발행을 긴급 중지하시겠습니까?\n중지 시 RSS 크론과 대기열 발행이 모두 즉시 차단됩니다.\n사유를 입력하세요:";

    let reason = "";
    if (!isCurrentlyPaused) {
      const input = prompt(promptMsg, "관리자 수동 긴급 점검");
      if (input === null) return;
      reason = input.trim();
    } else {
      if (!confirm(promptMsg)) return;
      reason = "관리자 발행 정상 재개";
    }

    setIsTogglingEmergency(true);
    try {
      const res = await adminFetch("/api/admin/pipeline/emergency-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchDashboardData();
      } else {
        alert(`설정 변경 실패: ${data.error}`);
      }
    } catch (err) {
      alert(`오류 발생: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTogglingEmergency(false);
    }
  };

  // 대기열 아이템 관리자 반려 (REJECT)
  const handleReject = async (queueId: string) => {
    if (rejectingId) return;
    const reason = prompt("대기열 기사 반려 사유를 입력하세요:", "콘텐츠 방향성 불일치로 반려");
    if (reason === null) return;

    setRejectingId(queueId);
    try {
      const res = await adminFetch("/api/admin/pipeline/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert("기사가 성공적으로 반려(REJECTED)되었습니다.");
        await fetchDashboardData();
        if (selectedPreview?.id === queueId) {
          setSelectedPreview(null);
        }
      } else {
        alert(`반려 실패: ${data.error}`);
      }
    } catch (err) {
      alert(`반려 중 오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRejectingId(null);
    }
  };

  // 파이프라인 1-Click 실행 (STEP 1 ~ STEP 10)
  const handleRunPipeline = async () => {
    if (isRunningPipeline) return;
    setIsRunningPipeline(true);
    setPipelineMessage("STEP 1~10 파이프라인 가동 중... (수집 -> 중복제거 -> 평가 -> 작성 -> 검수 -> 큐적재)");

    try {
      const res = await adminFetch("/api/admin/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "AI 테크놀로지 및 디지털 정책 비즈니스",
          hunterCount: 6,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPipelineMessage("✅ 파이프라인 완료! 검수된 콘텐츠가 발행 대기열(Publish Queue)에 안전하게 적재되었습니다.");
      } else {
        setPipelineMessage(`❌ 파이프라인 중단: ${data.error}`);
      }
      await fetchDashboardData();
    } catch (err) {
      setPipelineMessage(`❌ 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  // '발행' 명령 (수동 승인 시에만 실제 articles 테이블에 INSERT)
  const handlePublish = async (queueId: string) => {
    if (publishingId) return;
    setPublishingId(queueId);

    try {
      const res = await adminFetch("/api/admin/pipeline/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("기사가 성공적으로 정식 발행되었습니다!");
        await fetchDashboardData();
        if (selectedPreview?.id === queueId) {
          setSelectedPreview(null);
        }
      } else {
        alert(`발행 실패: ${data.error}`);
      }
    } catch (e) {
      alert(`발행 중 오류 발생: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* 상단 네비게이션 헤더 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 font-bold text-white shadow-lg shadow-indigo-500/30">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">
                  BriefPost 자동화 파이프라인 관제 센터
                </h1>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                10단계 완전 자동화 오케스트레이터 & 승인 기반 발행 대기 큐
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 관리자 보안 인증 버튼 및 상태 배지 */}
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition shadow-sm ${
                adminKey
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30 animate-pulse"
              }`}
              title="클릭하여 서버 ADMIN_SECRET 연동 키 설정"
            >
              <span>{adminKey ? "🔒" : "🔑"}</span>
              <span>{adminKey ? "인증됨" : "인증 필요"}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
            >
              🌐 사이트
            </Link>
            <button
              onClick={handleRunPipeline}
              disabled={isRunningPipeline}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all ${
                isRunningPipeline
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:brightness-110 text-white shadow-indigo-500/25 active:scale-95"
              }`}
            >
              {isRunningPipeline ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  파이프라인 실행 중...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>파이프라인 1-Click 실행</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ADMIN_SECRET 미설정 또는 401 인증 실패 경고 배너 */}
      {(!adminKey || authError) && isMounted && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 shadow-lg shadow-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-bold text-sm text-amber-100">
                  {authError || "관리자 보안 인증 시크릿(ADMIN_SECRET) 입력이 필요합니다."}
                </div>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  기사 발행(Publish), 파이프라인 가동, 반려 등 모든 관리자 API는 <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-200">x-admin-key</code> 헤더가 필요합니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition"
            >
              🔑 ADMIN_SECRET 입력하기
            </button>
          </div>
        </div>
      )}

      {/* 전역 긴급 중지 관제 배너 */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div
          className={`rounded-xl border p-4 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            emergencyStop?.isPaused
              ? "border-rose-500/60 bg-rose-950/40 shadow-lg shadow-rose-950/30"
              : "border-emerald-500/30 bg-emerald-950/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {emergencyStop?.isPaused ? "🚨" : "🛡️"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  전역 발행 안전 게이트
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    emergencyStop?.isPaused
                      ? "bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {emergencyStop?.isPaused
                    ? "🚨 전역 발행 긴급 중지 (KILL SWITCH ACTIVATED)"
                    : "✅ 자동 발행 활성 (ACTIVE)"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {emergencyStop?.isPaused ? (
                  <span className="text-rose-200">
                    <strong>모든 신규 기사 송출이 전면 차단되었습니다.</strong> (사유: {emergencyStop.reason} | 변경: {new Date(emergencyStop.updatedAt).toLocaleTimeString()})
                  </span>
                ) : (
                  <span>
                    모든 기사는 <strong>[발행 대기열]</strong>에서 관리자 승인 대기하며, 비상 시 즉시 전역 발행을 중단할 수 있습니다.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {pipelineMessage && (
              <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                {pipelineMessage}
              </div>
            )}
            <button
              onClick={handleToggleEmergencyStop}
              disabled={isTogglingEmergency}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
                emergencyStop?.isPaused
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
              }`}
            >
              {emergencyStop?.isPaused ? (
                <>
                  <span>▶️</span>
                  <span>발행 정상 재개</span>
                </>
              ) : (
                <>
                  <span>⏹️</span>
                  <span>긴급 발행 중지 (Kill Switch)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 12대 핵심 관리자 지표 카드 섹션 */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            📊 12대 핵심 관제 지표
          </h2>
          <span className="text-xs text-slate-500">
            최근 갱신: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : "-"}
          </span>
        </div>

        {/* 12개 지표 카드 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* 1. 오늘 발견한 키워드 수 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400">1. 오늘 발견한 키워드</div>
            <div className="text-2xl font-black text-white mt-1">
              {stats?.todayDiscoveredKeywords ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">개</span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1">
              <span>🎯</span> STEP 1 Hunter 수집
            </div>
          </div>

          {/* 2. 평가 완료 키워드 수 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400">2. 평가 완료 키워드</div>
            <div className="text-2xl font-black text-white mt-1">
              {stats?.evaluatedKeywordsCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">개</span>
            </div>
            <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
              <span>⚖️</span> STEP 3 6대지표 평가
            </div>
          </div>

          {/* 3. S급 키워드 */}
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-amber-950/20 to-slate-900">
            <div className="text-xs font-semibold text-amber-300">3. S급 키워드 (최우선)</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {stats?.gradeSCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">지속성 90+ & 고수익</div>
          </div>

          {/* 4. A급 키워드 */}
          <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-blue-950/20 to-slate-900">
            <div className="text-xs font-semibold text-blue-300">4. A급 키워드</div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {stats?.gradeACount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </div>
            <div className="text-[11px] text-blue-400/80 mt-1">종합 80~89점</div>
          </div>

          {/* 5. 트렌드 키워드 */}
          <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-rose-950/20 to-slate-900">
            <div className="text-xs font-semibold text-rose-300">5. 트렌드 키워드</div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {stats?.trendKeywordsCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1">실시간 급상승 화제성</div>
          </div>

          {/* 6. 작성 대기 콘텐츠 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400">6. 작성 대기 콘텐츠</div>
            <div className="text-2xl font-black text-white mt-1">
              {stats?.pendingWritingCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">건</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">STEP 4 선정 완료</div>
          </div>

          {/* 7. 검수 완료 콘텐츠 */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-slate-900">
            <div className="text-xs font-semibold text-emerald-300">7. 검수 완료 콘텐츠</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {stats?.reviewedCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건</span>
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">STEP 6 SEO 검수 통과</div>
          </div>

          {/* 8. 수정 필요 콘텐츠 */}
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-amber-300">8. 수정 필요 콘텐츠 (REVISE)</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {stats?.reviseCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건</span>
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">STEP 8 재작성 루프 진행</div>
          </div>

          {/* 9. 발행 대기 콘텐츠 (가장 중요) */}
          <div className="bg-slate-900/80 border-2 border-indigo-500 rounded-xl p-4 relative overflow-hidden shadow-lg shadow-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-900">
            <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
              <span>9. 발행 대기 (PUBLISH QUEUE)</span>
              <span className="animate-ping h-2 w-2 rounded-full bg-indigo-400"></span>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {stats?.publishQueuePendingCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건 승인대기</span>
            </div>
            <div className="text-[11px] text-indigo-300 font-semibold mt-1">
              ⚡ 수동 &apos;발행&apos; 승인 전용
            </div>
          </div>

          {/* 10. 발행 완료 콘텐츠 */}
          <div className="bg-slate-900/80 border border-teal-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-teal-950/20 to-slate-900">
            <div className="text-xs font-semibold text-teal-300">10. 발행 완료 콘텐츠</div>
            <div className="text-2xl font-black text-teal-400 mt-1">
              {stats?.publishedCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건 송출완료</span>
            </div>
            <div className="text-[11px] text-teal-400/80 mt-1">실제 사이트 서비스 중</div>
          </div>

          {/* 11. 실패한 작업 */}
          <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-rose-300">11. 실패한 작업</div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {stats?.failedTasksCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건</span>
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1">파이프라인 런 실패</div>
          </div>

          {/* 12. API 오류 */}
          <div className="bg-slate-900/80 border border-red-500/30 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-red-300">12. API 오류</div>
            <div className="text-2xl font-black text-red-400 mt-1">
              {stats?.apiErrorsCount ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">건</span>
            </div>
            <div className="text-[11px] text-red-400/80 mt-1">엔드포인트 호출 에러</div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mt-8 border-b border-slate-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "queue"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📥 발행 대기열 (Publish Queue)</span>
            <span className="rounded-full bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 font-mono">
              {queueItems.filter((q) => q.status === "PENDING").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("keywords")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "keywords"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🎯 발굴 & 평가 키워드</span>
            <span className="rounded-full bg-slate-800 text-slate-400 text-xs px-2 py-0.5 font-mono">
              {keywords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("rejects")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "rejects"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🚫 거절 아카이브 (REJECT)</span>
            <span className="rounded-full bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 font-mono">
              {rejectedList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📜 실시간 파이프라인 로그 (STEP 1~10)</span>
            <span className="rounded-full bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 font-mono">
              {recentLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("errors")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "errors"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>⚠️ API 오류 및 실패 작업</span>
            <span className="rounded-full bg-red-500/20 text-red-300 text-xs px-2 py-0.5 font-mono">
              {apiErrors.length + failedRuns.length}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 탭 1: 발행 대기열 (Publish Queue) */}
        {/* ======================================================== */}
        {activeTab === "queue" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                SEO 에디터의 엄격한 검수를 통과(PUBLISH)한 완성도 85점 이상의 콘텐츠입니다. 
                <strong>오직 관리자의 [기사 정식 발행] 명령 시에만</strong> 실제 서비스에 송출됩니다.
              </p>
              <button
                onClick={fetchDashboardData}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                🔄 새로고침
              </button>
            </div>

            {queueItems.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">현재 대기열에 적재된 콘텐츠가 없습니다.</p>
                <p className="text-xs mt-1">상단의 &apos;파이프라인 1-Click 실행&apos; 버튼을 눌러 새로운 콘텐츠를 생성해보세요.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {queueItems.map((item) => {
                  const art = item.payload;
                  const isPending = item.status === "PENDING";
                  return (
                    <div
                      key={item.id}
                      className={`bg-slate-900/90 border rounded-xl p-5 transition-all ${
                        isPending
                          ? "border-indigo-500/50 shadow-md shadow-indigo-500/10"
                          : "border-slate-800 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                item.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : item.status === "PUBLISHED"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : item.status === "PROCESSING"
                                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
                                  : item.status === "REJECTED"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : "bg-red-500/20 text-red-300 border-red-500/40"
                              }`}
                            >
                              {item.status === "PENDING" && "⏳ 발행 승인 대기중 (PENDING)"}
                              {item.status === "PUBLISHED" && "✅ 정식 발행 완료 (PUBLISHED)"}
                              {item.status === "PROCESSING" && "⚙️ 처리 중 (PROCESSING)"}
                              {item.status === "REJECTED" && "🚫 관리자 반려됨 (REJECTED)"}
                              {item.status === "FAILED" && `❌ 발행 실패 (FAILED, 시도: ${item.attempts}회)`}
                            </span>
                            <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {art.category}
                            </span>
                            <span className="text-[11px] font-semibold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                              의도: {item.searchIntent}
                            </span>
                            <span className="text-[11px] font-mono text-cyan-400">
                              SEO 점수: {art.seoScore}점
                            </span>
                            {item.attempts > 0 && (
                              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                                시도: {item.attempts}회
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-white leading-snug">
                            {art.headline}
                          </h3>

                          <p className="text-xs text-slate-400 line-clamp-2">
                            {art.metaDescription}
                          </p>

                          {item.error && (
                            <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/60 font-mono">
                              ⚠️ 최근 오류: {item.error}
                            </p>
                          )}
                          {item.rejectionReason && (
                            <p className="text-xs text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900/60">
                              🚫 반려 사유: {item.rejectionReason}
                            </p>
                          )}

                          {/* 인용된 공식 출처 뱃지 */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">🏛️ 공식 출처:</span>
                            {art.checklist.officialSourceVerified ? (
                              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                공식 출처 검증 통과
                              </span>
                            ) : (
                              <span className="text-amber-400">자체 리서치</span>
                            )}
                            {art.internalLinks && art.internalLinks.length > 0 && (
                              <span className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800 ml-2">
                                🔗 추천 내부링크 {art.internalLinks.length}개 연동
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 작업 액션 버튼들 */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => setSelectedPreview(item)}
                            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                          >
                            👁️ 기사 전문 미리보기
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => handlePublish(item.id)}
                                disabled={publishingId === item.id || rejectingId === item.id}
                                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
                              >
                                {publishingId === item.id ? (
                                  "발행 처리중..."
                                ) : (
                                  <>
                                    <span>⚡</span>
                                    <span>기사 정식 발행 승인</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(item.id)}
                                disabled={publishingId === item.id || rejectingId === item.id}
                                className="px-3 py-2 text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg border border-rose-800 transition active:scale-95 flex items-center gap-1"
                              >
                                <span>🚫</span>
                                <span>{rejectingId === item.id ? "반려중..." : "반려 (REJECT)"}</span>
                              </button>
                            </>
                          ) : item.status === "PUBLISHED" ? (
                            <Link
                              href={`/article/${art.slug}`}
                              target="_blank"
                              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-emerald-500/40 transition flex items-center gap-1"
                            >
                              <span>🔗</span>
                              <span>발행 기사 보기</span>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 탭 2: 발굴 & 평가 키워드 현황 */}
        {/* ======================================================== */}
        {activeTab === "keywords" && (
          <div className="mt-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">수집 및 6대 지표 평가 키워드 데이터</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    * [중요 제한] 검색량, CPC 등 외부 툴 미연동 데이터는 실제치로 위장하지 않고 &apos;추정치(Est.)&apos;로 엄격 관리됩니다.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">총 {keywords.length}개</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">등급</th>
                      <th className="p-3.5">키워드</th>
                      <th className="p-3.5">도메인/카테고리</th>
                      <th className="p-3.5">검색의도</th>
                      <th className="p-3.5">월간 검색량</th>
                      <th className="p-3.5">CPC 단가</th>
                      <th className="p-3.5">트렌드 지수</th>
                      <th className="p-3.5">상태</th>
                      <th className="p-3.5">수집 일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {keywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold">
                          {kw.grade === "S" && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              S급
                            </span>
                          )}
                          {kw.grade === "A" && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              A급
                            </span>
                          )}
                          {kw.grade === "TREND" && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              TREND
                            </span>
                          )}
                          {!["S", "A", "TREND"].includes(kw.grade || "") && (
                            <span className="text-slate-500">{kw.grade || "미평가"}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-white">{kw.keyword}</td>
                        <td className="p-3.5 text-slate-400">{kw.category}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10.5px]">
                            {kw.searchIntent}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : "-"}
                          {kw.isSearchVolumeEstimate && (
                            <span className="ml-1 text-[9.5px] text-amber-400 bg-amber-950/60 px-1 py-0.5 rounded">
                              추정치
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono">
                          {kw.cpc !== null ? `$${kw.cpc}` : "-"}
                          {kw.isCpcEstimate && (
                            <span className="ml-1 text-[9.5px] text-amber-400 bg-amber-950/60 px-1 py-0.5 rounded">
                              추정치
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-cyan-400">{kw.trendScore} / 100</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10.5px]">
                            {kw.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {kw.discoveredAt ? new Date(kw.discoveredAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 탭 3: 거절 아카이브 (REJECT) */}
        {/* ======================================================== */}
        {activeTab === "rejects" && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <h3 className="text-sm font-bold text-white">STEP 9 거절 아카이브 (Rejection Records)</h3>
              <p className="text-xs text-slate-400 mt-1">
                SEO 에디터 검수 점수가 70점 미만이거나 신뢰성 기준(공식 출처 결여 등)을 충족하지 못해 
                <strong>발행되지 않고 안전하게 폐기/기록된 콘텐츠</strong> 목록입니다.
              </p>
            </div>

            {rejectedList.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                현재 거절(REJECT)된 콘텐츠가 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {rejectedList.map((rej) => (
                  <div key={rej.id} className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30">
                          REJECT (거절됨)
                        </span>
                        <h4 className="text-sm font-bold text-white">{rej.keyword}</h4>
                        <span className="text-xs text-slate-500 font-mono">({rej.category})</span>
                      </div>
                      <span className="text-xs text-rose-400 font-mono">점수: {rej.score}점</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-300">
                      <strong className="text-rose-300">거절 사유: </strong>
                      {rej.reason}
                    </div>

                    {rej.feedback && rej.feedback.length > 0 && (
                      <div className="mt-2 text-[11.5px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        <span className="font-semibold text-slate-300">에디터 검수 피드백:</span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {rej.feedback.map((fb, idx) => (
                            <li key={idx}>{fb}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 탭 4: 실시간 파이프라인 로그 (STEP 1 ~ STEP 10) */}
        {/* ======================================================== */}
        {activeTab === "logs" && (
          <div className="mt-6 bg-slate-900/95 border border-slate-800 rounded-xl p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                실행 로그 스트림 (최신 60개)
              </span>
              <button onClick={fetchDashboardData} className="text-xs text-indigo-400 hover:underline">
                새로고침
              </button>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2">
              {recentLogs.map((log) => {
                let badgeColor = "bg-slate-800 text-slate-300";
                if (log.level === "SUCCESS") badgeColor = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                if (log.level === "WARN") badgeColor = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
                if (log.level === "ERROR") badgeColor = "bg-rose-500/20 text-rose-400 border border-rose-500/30";
                if (log.level === "INFO") badgeColor = "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30";

                return (
                  <div key={log.id} className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeColor}`}>
                      STEP {log.step} | {log.level}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10.5px]">
                        <span className="font-semibold text-slate-300">[{log.stepName}]</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 탭 5: 오류 및 실패 작업 모니터 */}
        {/* ======================================================== */}
        {activeTab === "errors" && (
          <div className="mt-6 space-y-6">
            {/* 실패한 작업 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                <span>💥</span> 11. 실패한 작업 (Failed Pipeline Runs)
              </h3>
              {failedRuns.length === 0 ? (
                <p className="text-xs text-slate-500">실패한 작업 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {failedRuns.map((r) => (
                    <div key={r.id} className="p-3 rounded bg-slate-950 border border-rose-950 text-slate-300">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Run ID: {r.id}</span>
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-rose-300 mt-1 font-sans">{r.error || "알 수 없는 오류"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API 오류 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                <span>🚨</span> 12. API 오류 로그 (API Errors)
              </h3>
              {apiErrors.length === 0 ? (
                <p className="text-xs text-slate-500">발생한 API 오류가 없습니다.</p>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {apiErrors.map((err) => (
                    <div key={err.id} className="p-3 rounded bg-slate-950 border border-red-950 text-slate-300">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>엔드포인트: {err.endpoint}</span>
                        <span>{new Date(err.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-red-300 mt-1 font-sans">{err.errorMessage}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 기사 미리보기 모달 */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  PUBLISH QUEUE 기사 본문 검토
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedPreview.payload.headline}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans text-sm text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">
                  <strong>메타 요약:</strong> {selectedPreview.payload.metaDescription}
                </div>
                <div className="text-xs text-slate-400">
                  <strong>슬러그:</strong> /article/{selectedPreview.payload.slug}
                </div>
                <div className="text-xs text-slate-400">
                  <strong>타깃 키워드:</strong> {selectedPreview.payload.targetKeywords.join(", ")}
                </div>
              </div>

              <div className="prose prose-invert max-w-none whitespace-pre-wrap font-sans text-slate-200">
                {selectedPreview.payload.finalMarkdownContent}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                상태: <strong>{selectedPreview.status}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                >
                  닫기
                </button>
                {selectedPreview.status === "PENDING" && (
                  <button
                    onClick={() => handlePublish(selectedPreview.id)}
                    className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white rounded-lg shadow-lg shadow-emerald-500/20"
                  >
                    ⚡ 지금 정식 발행 승인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN_SECRET 설정 모달 */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30 text-sm">
                  🔑
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    관리자 보안 인증 설정
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ADMIN_SECRET 토큰 헤더 연동
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminKey} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-slate-300 leading-relaxed space-y-1.5">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>보안 원칙 (STEP 4.3 준수)</span>
                </p>
                <p className="text-[11.5px] text-slate-400">
                  파이프라인 실행, 기사 승인/발행, 반려 등의 API는 서버의 <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">ADMIN_SECRET</code>과 일치하는 <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">x-admin-key</code> 헤더가 필수입니다.
                </p>
                <p className="text-[11px] text-slate-500">
                  * 입력된 시크릿은 브라우저의 localStorage에만 안전하게 보관됩니다.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-[11.5px] flex items-center gap-2">
                  <span>❌</span>
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  ADMIN_SECRET 키 입력
                </label>
                <div className="relative">
                  <input
                    type={showKeyPassword ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="서버 환경변수 ADMIN_SECRET과 동일한 값 입력"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10 font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
                    title={showKeyPassword ? "숨기기" : "보기"}
                  >
                    {showKeyPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {adminKey && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span>✅</span>
                    <span>현재 키 등록됨 ({adminKey.slice(0, 3)}••••••)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAdminKey}
                    className="text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    키 삭제(초기화)
                  </button>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:brightness-110 text-white rounded-xl shadow-md shadow-indigo-500/20 transition"
                >
                  저장 후 즉시 적용
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
