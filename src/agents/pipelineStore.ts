import fs from "fs";
import path from "path";
import getDatabase from "../lib/db";
import {
  DashboardStats,
  HuntedKeyword,
  EvaluatedKeyword,
  PipelineExecutionLog,
  PublishQueueItem,
  RejectedArticleRecord,
  ContentTaskStatus,
  PipelineRunStatus,
} from "./types";
import { createArticle } from "../lib/articles";
import { isPublishingPaused } from "../lib/emergencyStop";
import { getStockImage } from "../utils/imageMapper";

export class PipelineStore {
  private static instance: PipelineStore;
  private queueFilePath: string;

  private constructor() {
    this.queueFilePath = path.join(process.cwd(), "data", "publish-queue.json");
    this.initTables();
    this.ensureQueueStore();
  }

  public static getInstance(): PipelineStore {
    if (!PipelineStore.instance) {
      PipelineStore.instance = new PipelineStore();
    }
    return PipelineStore.instance;
  }

  private ensureQueueStore(): void {
    const dir = path.dirname(this.queueFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.queueFilePath)) {
      fs.writeFileSync(this.queueFilePath, JSON.stringify([], null, 2), "utf-8");
    }
  }

  private initTables(): void {
    const db = getDatabase;
    db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        durationMs INTEGER,
        summary TEXT,
        error TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_logs (
        id TEXT PRIMARY KEY,
        runId TEXT NOT NULL,
        step INTEGER NOT NULL,
        stepName TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_keywords (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL,
        category TEXT,
        source TEXT,
        context TEXT,
        searchIntent TEXT,
        trendScore INTEGER,
        searchVolume INTEGER,
        isSearchVolumeEstimate INTEGER DEFAULT 1,
        cpc REAL,
        isCpcEstimate INTEGER DEFAULT 1,
        grade TEXT,
        score REAL,
        status TEXT NOT NULL,
        criteriaJson TEXT,
        discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluatedAt DATETIME
      );

      CREATE TABLE IF NOT EXISTS pipeline_rejected (
        id TEXT PRIMARY KEY,
        runId TEXT,
        keyword TEXT NOT NULL,
        category TEXT,
        reason TEXT,
        feedbackJson TEXT,
        score REAL,
        rejectedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_api_errors (
        id TEXT PRIMARY KEY,
        runId TEXT,
        endpoint TEXT,
        errorMessage TEXT,
        requestData TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_content_tasks (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL,
        status TEXT NOT NULL, -- PENDING_WRITING, REVIEWED, REVISE, QUEUED, REJECTED
        feedbackJson TEXT,
        revisionCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pipe_logs_runId ON pipeline_logs(runId);
      CREATE INDEX IF NOT EXISTS idx_pipe_keywords_created ON pipeline_keywords(discoveredAt);
      CREATE INDEX IF NOT EXISTS idx_pipe_keywords_grade ON pipeline_keywords(grade);
    `);
  }

  // ==========================================
  // 1. 로그 저장
  // ==========================================
  public addLog(log: Omit<PipelineExecutionLog, "id">): void {
    const db = getDatabase;
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO pipeline_logs (id, runId, step, stepName, level, message, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      log.runId,
      log.step,
      log.stepName,
      log.level,
      log.message,
      log.details ? JSON.stringify(log.details) : null,
      log.timestamp || new Date().toISOString()
    );
  }

  public getRecentLogs(limit = 100, runId?: string): PipelineExecutionLog[] {
    const db = getDatabase;
    let rows: Array<{
      id: string;
      runId: string;
      step: number;
      stepName: string;
      level: string;
      message: string;
      details: string | null;
      timestamp: string;
    }> = [];

    if (runId) {
      const stmt = db.prepare(
        "SELECT * FROM pipeline_logs WHERE runId = ? ORDER BY timestamp DESC LIMIT ?"
      );
      rows = stmt.all(runId, limit) as typeof rows;
    } else {
      const stmt = db.prepare(
        "SELECT * FROM pipeline_logs ORDER BY timestamp DESC LIMIT ?"
      );
      rows = stmt.all(limit) as typeof rows;
    }

    return rows.map((r) => ({
      id: r.id,
      runId: r.runId,
      step: r.step,
      stepName: r.stepName,
      level: r.level as "INFO" | "WARN" | "ERROR" | "SUCCESS",
      message: r.message,
      details: r.details ? JSON.parse(r.details) : undefined,
      timestamp: r.timestamp,
    }));
  }

  // ==========================================
  // 2. 키워드 저장 & 관리
  // ==========================================
  public saveHuntedKeywords(keywords: HuntedKeyword[]): void {
    const db = getDatabase;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pipeline_keywords (
        id, keyword, category, source, context, searchIntent,
        trendScore, searchVolume, isSearchVolumeEstimate, cpc, isCpcEstimate,
        status, discoveredAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISCOVERED', ?)
    `);

    const insertMany = db.transaction((list: HuntedKeyword[]) => {
      for (const k of list) {
        const id = k.id || `kw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        stmt.run(
          id,
          k.keyword,
          k.category,
          k.source,
          k.context,
          k.searchIntent,
          k.trendScore,
          k.searchVolume,
          k.isSearchVolumeEstimate ? 1 : 0,
          k.cpc,
          k.isCpcEstimate ? 1 : 0,
          k.discoveredAt || new Date().toISOString()
        );
      }
    });

    insertMany(keywords);
  }

  public saveEvaluatedKeywords(keywords: EvaluatedKeyword[]): void {
    const db = getDatabase;
    const stmt = db.prepare(`
      INSERT INTO pipeline_keywords (
        id, keyword, category, searchIntent, grade, score,
        status, criteriaJson, evaluatedAt, isSearchVolumeEstimate
      ) VALUES (?, ?, ?, ?, ?, ?, 'EVALUATED', ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        grade = excluded.grade,
        score = excluded.score,
        status = 'EVALUATED',
        criteriaJson = excluded.criteriaJson,
        evaluatedAt = excluded.evaluatedAt
    `);

    const updateMany = db.transaction((list: EvaluatedKeyword[]) => {
      for (const k of list) {
        const id = `kw_eval_${k.keyword.replace(/\s+/g, "_")}`;
        stmt.run(
          id,
          k.keyword,
          k.category,
          k.searchIntent,
          k.grade,
          k.score,
          JSON.stringify(k.criteria),
          k.evaluatedAt || new Date().toISOString()
        );
      }
    });

    updateMany(keywords);
  }

  // ==========================================
  // 3. 작업 상태 (작성대기, 검수완료, 수정필요 등)
  // ==========================================
  public updateContentTask(
    keyword: string,
    status: ContentTaskStatus,
    feedback?: string[],
    revisionCount?: number
  ): void {
    const db = getDatabase;
    const id = `task_${keyword.replace(/\s+/g, "_")}`;
    const stmt = db.prepare(`
      INSERT INTO pipeline_content_tasks (id, keyword, status, feedbackJson, revisionCount, updatedAt)
      VALUES (?, ?, ?, ?, COALESCE(?, 0), CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        feedbackJson = excluded.feedbackJson,
        revisionCount = CASE WHEN ? IS NOT NULL THEN ? ELSE revisionCount END,
        updatedAt = CURRENT_TIMESTAMP
    `);
    stmt.run(
      id,
      keyword,
      status,
      feedback ? JSON.stringify(feedback) : null,
      revisionCount ?? null,
      revisionCount ?? null,
      revisionCount ?? null
    );
  }

  // ==========================================
  // 4. 거절 및 API 오류 기록
  // ==========================================
  public saveRejectedArticle(record: RejectedArticleRecord, runId?: string): void {
    const db = getDatabase;
    const stmt = db.prepare(`
      INSERT INTO pipeline_rejected (id, runId, keyword, category, reason, feedbackJson, score, rejectedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      runId || null,
      record.keyword,
      record.category,
      record.reason,
      JSON.stringify(record.feedback),
      record.score,
      record.rejectedAt || new Date().toISOString()
    );

    this.updateContentTask(record.keyword, "REJECTED", record.feedback);
  }

  public recordApiError(endpoint: string, errorMessage: string, runId?: string, requestData?: unknown): void {
    const db = getDatabase;
    const id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO pipeline_api_errors (id, runId, endpoint, errorMessage, requestData, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      runId || null,
      endpoint,
      errorMessage,
      requestData ? JSON.stringify(requestData) : null
    );
  }

  public recordPipelineRun(run: {
    id: string;
    status: PipelineRunStatus;
    durationMs?: number;
    summary?: string;
    error?: string;
  }): void {
    const db = getDatabase;
    const stmt = db.prepare(`
      INSERT INTO pipeline_runs (id, status, durationMs, summary, error)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        durationMs = excluded.durationMs,
        summary = excluded.summary,
        error = excluded.error
    `);
    stmt.run(run.id, run.status, run.durationMs || null, run.summary || null, run.error || null);
  }

  // ==========================================
  // 5. 발행 큐 (PUBLISH QUEUE) 관리
  // (중요 제한: 처음에는 오직 큐에만 PENDING으로 저장)
  // (내가 '발행' 명령을 내렸을 때만 실제 발행)
  // ==========================================
  public getQueueItems(): PublishQueueItem[] {
    try {
      this.ensureQueueStore();
      const content = fs.readFileSync(this.queueFilePath, "utf-8");
      return JSON.parse(content) as PublishQueueItem[];
    } catch {
      return [];
    }
  }

  public enqueueArticle(item: PublishQueueItem): void {
    const items = this.getQueueItems();
    // 중복 제거 후 추가
    const filtered = items.filter((i) => i.id !== item.id);
    filtered.unshift(item);
    fs.writeFileSync(this.queueFilePath, JSON.stringify(filtered, null, 2), "utf-8");
  }

  /**
   * 관리자가 명시적으로 '발행' 명령을 내렸을 때만 실제 articles 테이블에 INSERT
   * 
   * [안전장치 5대 원칙]
   * 1. 전역 긴급 중지(PUBLISHING_PAUSED) 상태 시 즉시 차단
   * 2. 원자적 선점 락 (item.status = "PROCESSING", processingStartedAt 기록)
   * 3. 멱등성 보장 및 응답 유실 복구: 기존 slug 대조 후 동일 기사 감지 시 재등록 없이 PUBLISHED로 정상 복구
   * 4. 실패 상태 전이 및 재시도: 영구 오류 즉시 FAILED, 일시 오류 3회 도달 시 FAILED 전이
   * 5. REJECTED / FAILED 항목 자동 발행 불가
   */
  public publishQueueItem(queueId: string): { success: boolean; articleId?: number; error?: string; recovered?: boolean } {
    // 1. 전역 긴급 중지 검사 (Fail-Safe)
    if (isPublishingPaused()) {
      return {
        success: false,
        error: "전역 긴급 중지 상태(PUBLISHING_PAUSED)로 인해 발행이 차단되었습니다.",
      };
    }

    const items = this.getQueueItems();
    const targetIdx = items.findIndex((i) => i.id === queueId);
    if (targetIdx === -1) {
      return { success: false, error: "큐 항목을 찾을 수 없습니다." };
    }

    const item = items[targetIdx];

    // 2. 상태 사전 검사
    if (item.status === "PUBLISHED") {
      return { success: false, error: "이미 발행 완료된 항목입니다." };
    }
    if (item.status === "REJECTED") {
      return { success: false, error: "관리자에 의해 반려(REJECTED)된 항목은 발행할 수 없습니다." };
    }
    if (item.status === "FAILED") {
      return { success: false, error: "최대 재시도 초과로 실패(FAILED)한 항목입니다. 명시적 재처리 절차가 필요합니다." };
    }

    // 3. 동시 실행 방지 락 및 Stale Lock(10분) 검사
    const STALE_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10분
    if (item.status === "PROCESSING") {
      const startedAt = item.processingStartedAt ? new Date(item.processingStartedAt).getTime() : 0;
      const elapsed = Date.now() - startedAt;
      if (elapsed < STALE_LOCK_TIMEOUT_MS) {
        return { success: false, error: "현재 다른 프로세스에서 처리 중(PROCESSING)입니다." };
      }
      console.warn(`[Queue Stale Lock] ID '${queueId}' 항목의 PROCESSING 락(${Math.round(elapsed / 1000)}초 경과)을 복구하여 재시도합니다.`);
    }

    // 4. 원자적 PROCESSING 락 획득 및 상태 즉시 영구 저장
    item.status = "PROCESSING";
    item.processingStartedAt = new Date().toISOString();
    items[targetIdx] = item;
    fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");

    try {
      const article = item.payload;
      const db = getDatabase;

      // 5. 멱등성 검사 및 응답 유실 복구 (Idempotency Check)
      const existingRow = db
        .prepare("SELECT id, title, slug, createdAt FROM articles WHERE slug = ?")
        .get(article.slug) as { id: number; title: string; slug: string; createdAt: string } | undefined;

      if (existingRow) {
        // 동일 기사인지 검증 (제목 일치 여부)
        if (existingRow.title === article.headline) {
          // 응답 유실 직후 재시도 상황: 중복 INSERT 없이 기존 기사 ID로 PUBLISHED 상태 복구
          item.status = "PUBLISHED";
          item.publishedAt = existingRow.createdAt || new Date().toISOString();
          delete item.error;
          items[targetIdx] = item;
          fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");

          this.addLog({
            runId: `recovery_publish_${Date.now()}`,
            step: 7,
            stepName: "IDEMPOTENT_RECOVERY",
            level: "INFO",
            message: `응답 유실 대기열 기사 정상 복구 동기화: "${article.headline}" (DB ID: ${existingRow.id}, Slug: ${existingRow.slug})`,
            details: { articleId: existingRow.id, slug: existingRow.slug },
            timestamp: new Date().toISOString(),
          });

          return { success: true, articleId: existingRow.id, recovered: true };
        } else {
          // 슬러그는 같은데 내용이 다른 별개 기사인 경우 (영구적 slug 충돌 오류)
          throw new Error(`SLUG_COLLISION_DIFFERENT_CONTENT: 슬러그 '${article.slug}'가 다른 기사에 의해 이미 사용 중입니다.`);
        }
      }

      // 6. 실제 기사 등록 직전 긴급 중지 2차 검사
      if (isPublishingPaused()) {
        item.status = "PENDING"; // 안전하게 롤백
        items[targetIdx] = item;
        fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");
        return {
          success: false,
          error: "전역 긴급 중지 상태(PUBLISHING_PAUSED)로 인해 기사 생성이 취소되었습니다.",
        };
      }

      // 7. 정식 기사 생성 (고화질 실사 스톡 이미지 배정)
      const stock = getStockImage(
        undefined,
        article.headline,
        article.category,
        article.finalMarkdownContent,
        undefined,
        article.slug
      );

      const created = createArticle({
        title: article.headline,
        slug: article.slug,
        content: article.finalMarkdownContent,
        summary: article.metaDescription,
        category: article.category,
        metaTitle: `${article.headline} | 브리프포스트`,
        metaDescription: article.metaDescription,
        thumbnailUrl: stock.url,
        sourceUrl: null,
        ctaType: "general",
        highlightBadge: article.canonicalKeyword,
        card_title: article.headline,
        imageTheme: stock.theme,
      });

      // 8. 큐 상태를 PUBLISHED로 갱신
      item.status = "PUBLISHED";
      item.publishedAt = new Date().toISOString();
      delete item.error;
      items[targetIdx] = item;
      fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");

      // 파이프라인 로그 및 작업 상태 갱신
      this.addLog({
        runId: `manual_publish_${Date.now()}`,
        step: 7,
        stepName: "MANUAL_PUBLISH",
        level: "SUCCESS",
        message: `관리자 승인으로 기사 정식 발행 완료: "${article.headline}" (ID: ${created.id}, Slug: ${created.slug})`,
        details: { articleId: created.id, slug: created.slug },
        timestamp: new Date().toISOString(),
      });

      return { success: true, articleId: created.id };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      item.error = errorMsg;
      item.attempts = (item.attempts || 0) + 1;

      // 오류 유형 분류: 영구적 오류 vs 일시적 오류
      const isPermanentError =
        errorMsg.includes("SLUG_COLLISION") ||
        errorMsg.includes("NOT NULL constraint") ||
        errorMsg.includes("CHECK constraint") ||
        errorMsg.includes("품질 기준 미달");

      if (isPermanentError || item.attempts >= 3) {
        item.status = "FAILED";
        item.failedAt = new Date().toISOString();
        console.error(`[Queue Item FAILED] ID '${queueId}' (시도: ${item.attempts}회, 원인: ${errorMsg})`);
      } else {
        // 재시도 가능한 일시적 오류인 경우 PENDING으로 롤백하여 재시도 허용
        item.status = "PENDING";
      }

      items[targetIdx] = item;
      fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 관리자 대기열 반려(REJECT) 기능
   */
  public rejectQueueItem(queueId: string, reason: string): { success: boolean; error?: string } {
    const items = this.getQueueItems();
    const targetIdx = items.findIndex((i) => i.id === queueId);
    if (targetIdx === -1) {
      return { success: false, error: "큐 항목을 찾을 수 없습니다." };
    }

    const item = items[targetIdx];
    if (item.status === "PUBLISHED") {
      return { success: false, error: "이미 정식 발행된 기사는 대기열에서 반려할 수 없습니다." };
    }

    const rejectionReason = reason || "관리자에 의해 대기열에서 반려됨";
    item.status = "REJECTED";
    item.rejectedAt = new Date().toISOString();
    item.rejectionReason = rejectionReason;
    items[targetIdx] = item;
    fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");

    // 거절 아카이브에도 영구 기록
    this.saveRejectedArticle(
      {
        id: `rej_q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        keyword: item.payload.canonicalKeyword || item.payload.headline,
        category: item.payload.category,
        reason: rejectionReason,
        feedback: [rejectionReason],
        score: item.payload.seoScore || 0,
        rejectedAt: item.rejectedAt,
      },
      `admin_reject_${Date.now()}`
    );

    this.addLog({
      runId: `admin_reject_${Date.now()}`,
      step: 7,
      stepName: "ADMIN_REJECT",
      level: "WARN",
      message: `관리자가 대기열 기사를 반려 처리함: "${item.payload.headline}" (사유: ${rejectionReason})`,
      details: { queueId, reason: rejectionReason },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * 장시간 잔존한 stale PROCESSING 항목 자동 복구
   */
  public recoverStaleProcessingItems(timeoutMs: number = 10 * 60 * 1000): {
    recoveredCount: number;
    details: Array<{ id: string; action: string }>;
  } {
    const items = this.getQueueItems();
    const now = Date.now();
    let recoveredCount = 0;
    const details: Array<{ id: string; action: string }> = [];

    const db = getDatabase;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== "PROCESSING") continue;

      const startedAt = item.processingStartedAt ? new Date(item.processingStartedAt).getTime() : 0;
      if (now - startedAt < timeoutMs) continue;

      // 10분 초과: 실제 DB에 발행 완료되었는지 확인
      const existing = db
        .prepare("SELECT id FROM articles WHERE slug = ?")
        .get(item.payload.slug) as { id: number } | undefined;

      if (existing) {
        item.status = "PUBLISHED";
        item.publishedAt = item.publishedAt || new Date().toISOString();
        details.push({ id: item.id, action: "RECOVERED_TO_PUBLISHED" });
      } else {
        item.status = "PENDING";
        details.push({ id: item.id, action: "ROLLED_BACK_TO_PENDING" });
      }
      recoveredCount++;
    }

    if (recoveredCount > 0) {
      fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");
      console.log(`[Stale Lock Recovery] ${recoveredCount}개 stale PROCESSING 항목 복구 완료:`, details);
    }

    return { recoveredCount, details };
  }

  // ==========================================
  // 6. 관리자 화면 12대 필수 지표 집계
  // ==========================================
  public getDashboardStats(): DashboardStats {
    const db = getDatabase;

    // 1. 오늘 발견한 키워드 수
    const today = new Date().toISOString().slice(0, 10);
    const todayStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_keywords WHERE discoveredAt >= ?"
    );
    const todayDiscoveredKeywords = (todayStmt.get(`${today} 00:00:00`) as { count: number }).count;

    // 2. 평가 완료 키워드 수
    const evaluatedStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_keywords WHERE status = 'EVALUATED' OR grade IS NOT NULL"
    );
    const evaluatedKeywordsCount = (evaluatedStmt.get() as { count: number }).count;

    // 3. S급 키워드
    const sGradeStmt = db.prepare("SELECT COUNT(*) as count FROM pipeline_keywords WHERE grade = 'S'");
    const gradeSCount = (sGradeStmt.get() as { count: number }).count;

    // 4. A급 키워드
    const aGradeStmt = db.prepare("SELECT COUNT(*) as count FROM pipeline_keywords WHERE grade = 'A'");
    const gradeACount = (aGradeStmt.get() as { count: number }).count;

    // 5. 트렌드 키워드
    const trendStmt = db.prepare("SELECT COUNT(*) as count FROM pipeline_keywords WHERE grade = 'TREND'");
    const trendKeywordsCount = (trendStmt.get() as { count: number }).count;

    // 6. 작성 대기 콘텐츠
    const pendingWritingStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_content_tasks WHERE status = 'PENDING_WRITING'"
    );
    const pendingWritingCount = (pendingWritingStmt.get() as { count: number }).count;

    // 7. 검수 완료 콘텐츠
    const reviewedStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_content_tasks WHERE status = 'REVIEWED' OR status = 'QUEUED'"
    );
    const reviewedCount = (reviewedStmt.get() as { count: number }).count;

    // 8. 수정 필요 콘텐츠 (REVISE)
    const reviseStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_content_tasks WHERE status = 'REVISE'"
    );
    const reviseCount = (reviseStmt.get() as { count: number }).count;

    // 9. 발행 대기 콘텐츠 (큐에서 PENDING)
    const queueItems = this.getQueueItems();
    const publishQueuePendingCount = queueItems.filter((i) => i.status === "PENDING").length;

    // 10. 발행 완료 콘텐츠 (DB의 실제 발행된 articles 수)
    const articlesCountStmt = db.prepare("SELECT COUNT(*) as count FROM articles");
    const publishedCount = (articlesCountStmt.get() as { count: number }).count;

    // 11. 실패한 작업
    const failedStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pipeline_runs WHERE status = 'FAILED'"
    );
    const failedTasksCount = (failedStmt.get() as { count: number }).count;

    // 12. API 오류
    const apiErrStmt = db.prepare("SELECT COUNT(*) as count FROM pipeline_api_errors");
    const apiErrorsCount = (apiErrStmt.get() as { count: number }).count;

    return {
      todayDiscoveredKeywords,
      evaluatedKeywordsCount,
      gradeSCount,
      gradeACount,
      trendKeywordsCount,
      pendingWritingCount,
      reviewedCount,
      reviseCount,
      publishQueuePendingCount,
      publishedCount,
      failedTasksCount,
      apiErrorsCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ==========================================
  // 7. 상세 데이터 목록 조회 (대시보드 뷰용)
  // ==========================================
  public getAllKeywords(limit = 100): Array<{
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
  }> {
    const db = getDatabase;
    const stmt = db.prepare(`
      SELECT id, keyword, category, source, searchIntent, trendScore,
             searchVolume, isSearchVolumeEstimate, cpc, isCpcEstimate,
             grade, score, status, discoveredAt
      FROM pipeline_keywords
      ORDER BY discoveredAt DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      keyword: string;
      category: string;
      source: string;
      searchIntent: string;
      trendScore: number;
      searchVolume: number | null;
      isSearchVolumeEstimate: number;
      cpc: number | null;
      isCpcEstimate: number;
      grade: string | null;
      score: number | null;
      status: string;
      discoveredAt: string;
    }>;

    return rows.map((r) => ({
      ...r,
      isSearchVolumeEstimate: Boolean(r.isSearchVolumeEstimate),
      isCpcEstimate: Boolean(r.isCpcEstimate),
    }));
  }

  public getRejectedList(limit = 50): RejectedArticleRecord[] {
    const db = getDatabase;
    const stmt = db.prepare(`
      SELECT id, keyword, category, reason, feedbackJson, score, rejectedAt
      FROM pipeline_rejected
      ORDER BY rejectedAt DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      keyword: string;
      category: string;
      reason: string;
      feedbackJson: string | null;
      score: number;
      rejectedAt: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      category: r.category,
      reason: r.reason,
      feedback: r.feedbackJson ? JSON.parse(r.feedbackJson) : [],
      score: r.score,
      rejectedAt: r.rejectedAt,
    }));
  }

  public getApiErrors(limit = 50): Array<{
    id: string;
    runId: string | null;
    endpoint: string;
    errorMessage: string;
    requestData: unknown;
    timestamp: string;
  }> {
    const db = getDatabase;
    const stmt = db.prepare(`
      SELECT id, runId, endpoint, errorMessage, requestData, timestamp
      FROM pipeline_api_errors
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      runId: string | null;
      endpoint: string;
      errorMessage: string;
      requestData: string | null;
      timestamp: string;
    }>;

    return rows.map((r) => ({
      ...r,
      requestData: r.requestData ? JSON.parse(r.requestData) : null,
    }));
  }

  public getFailedRuns(limit = 20): Array<{
    id: string;
    status: string;
    durationMs: number | null;
    error: string | null;
    createdAt: string;
  }> {
    const db = getDatabase;
    const stmt = db.prepare(`
      SELECT id, status, durationMs, error, createdAt
      FROM pipeline_runs
      WHERE status = 'FAILED'
      ORDER BY createdAt DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<{
      id: string;
      status: string;
      durationMs: number | null;
      error: string | null;
      createdAt: string;
    }>;
  }
}

export const pipelineStore = PipelineStore.getInstance();
