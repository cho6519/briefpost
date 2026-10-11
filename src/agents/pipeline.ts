import { KeywordHunterAgent } from "./keywordHunter";
import { DuplicateRemover } from "./duplicateRemover";
import { KeywordEvaluatorAgent } from "./keywordEvaluator";
import { ContentWriterAgent } from "./contentWriter";
import { FactCheckerAgent } from "./factChecker";
import { SeoEditorAgent } from "./seoEditor";
import { policySourceResolver } from "./policySourceResolver";
import { policyTemporalValidator } from "./policyTemporalValidator";
import { officialSourceEvidenceEngine } from "./officialSourceEvidenceEngine";
import { pipelineStore } from "./pipelineStore";
import {
  KeywordHunterInput,
  PipelineExecutionResult,
  PipelineExecutionLog,
  PipelineLogLevel,
  PublishQueueItem,
  ReviewStatus,
  FactCheckReport,
  PolicySourcePack,
  PolicyTemporalValidationResult,
  OfficialSourceEvidenceEngineOutput,
} from "./types";

export interface PipelineOptions {
  domain?: string;
  seedKeywords?: string[];
  targetAudience?: string;
  hunterCount?: number;
}

/**
 * 완전 자동화 파이프라인 오케스트레이터
 * 
 * 전체 실행 순서:
 * STEP 1: KEYWORD HUNTER (새로운 키워드 수집)
 * STEP 2: DUPLICATE REMOVER (중복 및 동일검색의도 제거)
 * STEP 3: KEYWORD EVALUATOR (6대 지표 정밀 평가)
 * STEP 4: PRIORITY SELECTION (우선순위 최우선 키워드 선정)
 * STEP 5: CONTENT WRITER (검색의도 맞춤형 본문 작성)
 * STEP 6: FACT CHECKER (공식 출처 기반 16대 핵심 사실 전수 검증 ➔ VERIFIED 시에만 통과)
 * STEP 7: SEO EDITOR (SEO 체크리스트 및 헤드라인/슬러그 교정)
 * STEP 8: REVISION LOOP (에디터/팩트체커 피드백 재작성 루프, 최대 2회)
 * STEP 9: REJECTION ARCHIVE (거절/폐기 사유 기록)
 * STEP 10: INTERNAL LINK RECOMMENDER (관련 콘텐츠 내부링크 자동 연결)
 * STEP 11: PUBLISH QUEUE (발행 대기열 적재 - 승인 전까지 PENDING 유지)
 */
export class AgentPipeline {
  private hunter: KeywordHunterAgent;
  private duplicateRemover: DuplicateRemover;
  private evaluator: KeywordEvaluatorAgent;
  private writer: ContentWriterAgent;
  private factChecker: FactCheckerAgent;
  private seoEditor: SeoEditorAgent;

  constructor() {
    this.hunter = new KeywordHunterAgent();
    this.duplicateRemover = new DuplicateRemover();
    this.evaluator = new KeywordEvaluatorAgent();
    this.writer = new ContentWriterAgent();
    this.factChecker = new FactCheckerAgent();
    this.seoEditor = new SeoEditorAgent();
  }

  public async run(options: PipelineOptions = {}): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const logs: PipelineExecutionLog[] = [];

    const recordLog = (
      step: number,
      stepName: string,
      level: PipelineLogLevel,
      message: string,
      details?: Record<string, unknown>
    ) => {
      const logEntry: Omit<PipelineExecutionLog, "id"> = {
        runId,
        step,
        stepName,
        level,
        message,
        details,
        timestamp: new Date().toISOString(),
      };
      pipelineStore.addLog(logEntry);
      logs.push({
        id: `log_${Date.now()}_${logs.length}`,
        ...logEntry,
      });
    };

    pipelineStore.recordPipelineRun({
      id: runId,
      status: "RUNNING",
      summary: `파이프라인 실행 시작 (도메인: ${options.domain || "AI & 테크"})`,
    });

    try {
      // ========================================================
      // STEP 1: KEYWORD HUNTER (키워드 수집)
      // ========================================================
      recordLog(1, "KEYWORD_HUNTER", "INFO", "STEP 1 시작: 시장 트렌드 및 최신 이슈 원천 키워드 수집");
      const hunterInput: KeywordHunterInput = {
        domain: options.domain || "AI & 테크놀로지 / IT 비즈니스",
        seedKeywords: options.seedKeywords,
        count: options.hunterCount || 6,
      };
      const hunterOutput = await this.hunter.hunt(hunterInput);
      recordLog(
        1,
        "KEYWORD_HUNTER",
        "SUCCESS",
        `STEP 1 완료: 총 ${hunterOutput.huntedKeywords.length}개 키워드 발굴 성공 (추정치 플래그 엄격 적용)`,
        { keywords: hunterOutput.huntedKeywords.map((k) => k.keyword) }
      );

      // ========================================================
      // STEP 2: 중복 키워드와 이미 작성된 주제 제거
      // ========================================================
      recordLog(2, "DEDUPLICATION", "INFO", "STEP 2 시작: 중복 키워드, 기존 발행 기사 및 동일 검색의도 필터링");
      const deduplicationOutput = this.duplicateRemover.filter({
        candidates: hunterOutput.huntedKeywords,
      });
      recordLog(
        2,
        "DEDUPLICATION",
        "SUCCESS",
        `STEP 2 완료: 필터 통과 ${deduplicationOutput.filteredKeywords.length}개, 중복/동일의도 제외 ${deduplicationOutput.removedDuplicates.length}개`,
        {
          passed: deduplicationOutput.filteredKeywords.map((k) => k.keyword),
          removed: deduplicationOutput.removedDuplicates,
        }
      );

      if (deduplicationOutput.filteredKeywords.length === 0) {
        throw new Error("DEDUPLICATION_ALL_FILTERED: 모든 키워드가 중복 또는 동일 검색의도로 필터링되었습니다.");
      }

      // ========================================================
      // STEP 3: KEYWORD EVALUATOR (6대 지표 평가)
      // ========================================================
      recordLog(3, "KEYWORD_EVALUATOR", "INFO", "STEP 3 시작: 6대 핵심 지표 정밀 평가 및 등급(S/A/TREND) 산정");
      const evaluatorOutput = await this.evaluator.evaluate({
        candidates: deduplicationOutput.filteredKeywords,
        targetAudience: options.targetAudience,
      });
      recordLog(
        3,
        "KEYWORD_EVALUATOR",
        "SUCCESS",
        `STEP 3 완료: ${evaluatorOutput.evaluatedCount}개 키워드 정량 평가 완료 (S급, A급, 트렌드 분류)`,
        {
          grades: evaluatorOutput.allEvaluated.map((e) => ({
            keyword: e.keyword,
            grade: e.grade,
            score: e.score,
          })),
        }
      );

      // ========================================================
      // STEP 4: 우선순위가 높은 키워드 선정
      // ========================================================
      const selectedKeyword = evaluatorOutput.selectedKeyword;
      recordLog(
        4,
        "KEYWORD_SELECTION",
        "SUCCESS",
        `STEP 4 완료: 최우선 기사화 대상 키워드 선정 -> '${selectedKeyword.keyword}' (등급: ${selectedKeyword.grade}, 점수: ${selectedKeyword.score}점)`,
        {
          keyword: selectedKeyword.keyword,
          grade: selectedKeyword.grade,
          intent: selectedKeyword.searchIntent,
          angle: selectedKeyword.recommendedAngle,
        }
      );
      pipelineStore.updateContentTask(selectedKeyword.keyword, "PENDING_WRITING");

      // ========================================================
      // STEP 4.5: POLICY SOURCE RESOLVER (정책 키워드 감지 및 최신 공식 팩 수집)
      // ========================================================
      let policySourcePack: PolicySourcePack | undefined = undefined;
      let temporalValidation: PolicyTemporalValidationResult | undefined = undefined;
      let evidenceEngineOutput: OfficialSourceEvidenceEngineOutput | undefined = undefined;
      const isPolicyTopic = policySourceResolver.isPolicyKeyword(selectedKeyword.keyword, selectedKeyword.category);

      if (isPolicyTopic) {
        recordLog(4, "POLICY_SOURCE_RESOLVER", "INFO", `STEP 4.5 시작: 정책성 키워드 감지 -> 대한민국 정부 최신 공식 지침(Policy Source Pack) 전수 수집`);
        const resolvedPack = policySourceResolver.resolve(selectedKeyword.keyword, selectedKeyword.category);
        if (resolvedPack) {
          policySourcePack = resolvedPack;
          recordLog(
            4,
            "POLICY_SOURCE_RESOLVER",
            "SUCCESS",
            `STEP 4.5 완료: 최신 공식 정책 팩 장착 완료 [${resolvedPack.officialPolicyName}], 유효성: ${resolvedPack.currentStatus}, 신뢰도: ${resolvedPack.confidence}`,
            {
              officialPolicyName: resolvedPack.officialPolicyName,
              effectiveDate: resolvedPack.effectiveDate.value,
              supportPeriod: resolvedPack.supportPeriod.value,
              supportAmount: resolvedPack.supportAmount.value,
              warnings: resolvedPack.warnings,
            }
          );

          // STEP 4.6: POLICY TEMPORAL VALIDATOR
          recordLog(4, "POLICY_TEMPORAL_VALIDATOR", "INFO", `STEP 4.6 시작: 정책 시행 기간, 신청 접수 마감 여부 및 과거 규정 자동 승격 방지 점검`);
          temporalValidation = policyTemporalValidator.validate(resolvedPack);
          resolvedPack.temporalValidation = temporalValidation;
          recordLog(
            4,
            "POLICY_TEMPORAL_VALIDATOR",
            temporalValidation.isExpired ? "WARN" : "SUCCESS",
            `STEP 4.6 완료: 접수 상태 [${temporalValidation.applicationPeriodStatus}], 과거 규정 오인 감지: ${temporalValidation.oldRulesDetected.length}건, 경고: ${temporalValidation.warnings.length}건`,
            {
              isExpired: temporalValidation.isExpired,
              applicationPeriodStatus: temporalValidation.applicationPeriodStatus,
              oldRulesDetected: temporalValidation.oldRulesDetected,
              warnings: temporalValidation.warnings,
            }
          );

          // STEP 4.7: OFFICIAL SOURCE EVIDENCE ENGINE
          recordLog(4, "OFFICIAL_SOURCE_EVIDENCE_ENGINE", "INFO", `STEP 4.7 시작: 5대 정부 공표 우선순위 기반 공식 출처 원문 수집 및 13대 핵심 주장별 근거 매핑`);
          evidenceEngineOutput = await officialSourceEvidenceEngine.execute(selectedKeyword.keyword, resolvedPack);
          resolvedPack.evidenceEngineOutput = evidenceEngineOutput;
          recordLog(
            4,
            "OFFICIAL_SOURCE_EVIDENCE_ENGINE",
            evidenceEngineOutput.isVerified ? "SUCCESS" : "WARN",
            `STEP 4.7 완료: ${evidenceEngineOutput.summary}`,
            {
              evidencesCount: evidenceEngineOutput.evidences.length,
              claimsCount: evidenceEngineOutput.claims.length,
              unverifiedClaimsCount: evidenceEngineOutput.unverifiedClaimsCount,
              retrievalSummary: evidenceEngineOutput.retrievalSummary,
              warnings: evidenceEngineOutput.warnings,
            }
          );
        }
      }

      // ========================================================
      // STEP 5: CONTENT WRITER (초안 작성)
      // ========================================================
      recordLog(5, "CONTENT_WRITER", "INFO", `STEP 5 시작: 검색의도(${selectedKeyword.searchIntent})에 맞춘 본문 초안 작성 (공식 출처 우선)`);
      let writerOutput = await this.writer.write({
        evaluatedKeyword: selectedKeyword,
        policySourcePack,
      });
      recordLog(
        5,
        "CONTENT_WRITER",
        "SUCCESS",
        `STEP 5 완료: 초안 본문 작성 완료 (제목: "${writerOutput.draft.draftTitle}", 글자 수: ${writerOutput.draft.wordCount}자)`,
        {
          draftTitle: writerOutput.draft.draftTitle,
          officialSources: writerOutput.draft.officialSources,
        }
      );

      // ========================================================
      // STEP 6: FACT CHECKER (공식 출처 기반 중요 사실 전수 검증)
      // ========================================================
      recordLog(6, "FACT_CHECKER", "INFO", "STEP 6 시작: 기사 초안 내 모든 사실 주장(Claim) 16대 항목 공식 검증");
      let factReport: FactCheckReport = await this.factChecker.check({
        draft: writerOutput.draft,
        category: selectedKeyword.category,
        keyword: selectedKeyword.keyword,
        searchIntent: selectedKeyword.searchIntent,
        policySourcePack,
      });

      let factCheckLoops = 0;
      const MAX_FACT_REVISIONS = 2; // 최대 팩트 수정 루프

      while (factReport.status === "REVISE_REQUIRED" && factCheckLoops < MAX_FACT_REVISIONS) {
        factCheckLoops++;
        recordLog(
          6,
          "FACT_CHECKER_REVISION",
          "WARN",
          `FACT CHECKER 수정 요청(${factCheckLoops}/${MAX_FACT_REVISIONS}): 수정필요(${factReport.reviseCount}건), 미확인(${factReport.unverifiableCount}건) 보정`,
          {
            feedback: factReport.feedback,
          }
        );

        writerOutput = await this.writer.write({
          evaluatedKeyword: selectedKeyword,
          revisionFeedback: factReport.feedback,
          previousDraft: writerOutput.draft,
          policySourcePack,
        });

        factReport = await this.factChecker.check({
          draft: writerOutput.draft,
          category: selectedKeyword.category,
          keyword: selectedKeyword.keyword,
          searchIntent: selectedKeyword.searchIntent,
          policySourcePack,
        });
      }

      // FACT CHECKER 단계 로그 기록
      recordLog(
        6,
        "FACT_CHECKER",
        factReport.status === "VERIFIED" ? "SUCCESS" : (factReport.status === "REVISE_REQUIRED" ? "WARN" : "ERROR"),
        `STEP 6 FACT CHECKER 판정 [${factReport.status}]: 총 ${factReport.claimCount}건 검증 (VERIFIED: ${factReport.verifiedCount}, REVISE: ${factReport.reviseCount}, REJECT: ${factReport.rejectCount}, UNVERIFIABLE: ${factReport.unverifiableCount})`,
        {
          articleId: `task_${selectedKeyword.keyword.replace(/\s+/g, "_")}`,
          keyword: selectedKeyword.keyword,
          step: 6,
          status: factReport.status,
          checkedAt: factReport.checkedAt,
          claimCount: factReport.claimCount,
          verifiedCount: factReport.verifiedCount,
          reviseCount: factReport.reviseCount,
          rejectCount: factReport.rejectCount,
          unverifiableCount: factReport.unverifiableCount,
          sourceCount: factReport.sourceCount,
          errors: factReport.errors,
          feedback: factReport.feedback,
        }
      );

      // FACT CHECKER에서 REJECT되거나 2회 수정 후에도 VERIFIED 실패 시 거절 처리
      if (factReport.status !== "VERIFIED") {
        const rejectionReason =
          factReport.status === "REJECT"
            ? "FACT CHECKER 검증 결과 치명적 사실 오류 또는 근거 없는 주장으로 폐기"
            : "FACT CHECKER 2회 수정 후에도 사실 검증 기준 미달";

        recordLog(9, "REJECTION_ARCHIVE", "ERROR", `STEP 9 실행: 사실 검증 실패로 콘텐츠 폐기 -> ${rejectionReason}`);
        const rejectedRecord = {
          id: `rej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          keyword: selectedKeyword.keyword,
          category: selectedKeyword.category,
          reason: rejectionReason,
          feedback: factReport.feedback || [],
          score: 60,
          rejectedAt: new Date().toISOString(),
        };
        pipelineStore.saveRejectedArticle(rejectedRecord, runId);

        const executionDurationMs = Date.now() - startTime;
        pipelineStore.recordPipelineRun({
          id: runId,
          status: "COMPLETED",
          durationMs: executionDurationMs,
          summary: `키워드 '${selectedKeyword.keyword}' FACT CHECKER 검증 탈락(REJECT)`,
        });

        return {
          runId,
          success: true,
          step1Hunter: hunterOutput,
          step2Deduplication: deduplicationOutput,
          step3Evaluator: evaluatorOutput,
          step4SelectedKeyword: selectedKeyword,
          step4_5PolicySourcePack: policySourcePack,
          step5Writer: writerOutput,
          step6SeoEditor: {
            status: "REJECT",
            reviewScore: 50,
            reviewFeedback: factReport.feedback || [rejectionReason],
            rejectionReason,
            timestamp: new Date().toISOString(),
          },
          step8RevisionLoops: factCheckLoops,
          step9Rejected: rejectedRecord,
          step10InternalLinks: [],
          executionDurationMs,
          logs,
        };
      }

      // ========================================================
      // STEP 7: SEO EDITOR (검수 및 최적화)
      // (FACT CHECKER에서 VERIFIED 판정을 받은 경우에만 실행)
      // ========================================================
      recordLog(7, "SEO_EDITOR", "INFO", "STEP 7 시작: 팩트 검증 완료본의 SEO 체크리스트 및 헤드라인 교정");
      let editorOutput = await this.seoEditor.edit({
        draft: writerOutput.draft,
        category: selectedKeyword.category,
        primaryKeyword: selectedKeyword.keyword,
        searchIntent: selectedKeyword.searchIntent,
        policySourcePack,
      });

      let editorRevisionLoops = 0;
      const MAX_EDITOR_REVISIONS = 2;

      while (editorOutput.status === "REVISE" && editorRevisionLoops < MAX_EDITOR_REVISIONS) {
        editorRevisionLoops++;
        recordLog(
          8,
          "REVISION_LOOP",
          "WARN",
          `STEP 8 실행: SEO 에디터 수정 요청(REVISE, 점수: ${editorOutput.reviewScore}점) -> 재교정 (${editorRevisionLoops}/${MAX_EDITOR_REVISIONS})`,
          { feedback: editorOutput.reviewFeedback }
        );

        writerOutput = await this.writer.write({
          evaluatedKeyword: selectedKeyword,
          revisionFeedback: editorOutput.reviewFeedback,
          previousDraft: writerOutput.draft,
          policySourcePack,
        });

        editorOutput = await this.seoEditor.edit({
          draft: writerOutput.draft,
          category: selectedKeyword.category,
          primaryKeyword: selectedKeyword.keyword,
          searchIntent: selectedKeyword.searchIntent,
          policySourcePack,
        });
      }

      let finalStatus: ReviewStatus = editorOutput.status;
      if (finalStatus === "REVISE") {
        finalStatus = editorOutput.reviewScore >= 80 ? "PUBLISH" : "REJECT";
      }

      if (finalStatus === "REJECT" || !editorOutput.article) {
        recordLog(9, "REJECTION_ARCHIVE", "ERROR", "STEP 9 실행: SEO 검수 최종 탈락(REJECT)");
        const rejectedRecord = {
          id: `rej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          keyword: selectedKeyword.keyword,
          category: selectedKeyword.category,
          reason: editorOutput.rejectionReason || "SEO 품질 기준 미달",
          feedback: editorOutput.reviewFeedback,
          score: editorOutput.reviewScore,
          rejectedAt: new Date().toISOString(),
        };
        pipelineStore.saveRejectedArticle(rejectedRecord, runId);

        const executionDurationMs = Date.now() - startTime;
        pipelineStore.recordPipelineRun({
          id: runId,
          status: "COMPLETED",
          durationMs: executionDurationMs,
          summary: `키워드 '${selectedKeyword.keyword}' SEO 검수 탈락`,
        });

        return {
          runId,
          success: true,
          step1Hunter: hunterOutput,
          step2Deduplication: deduplicationOutput,
          step3Evaluator: evaluatorOutput,
          step4SelectedKeyword: selectedKeyword,
          step4_5PolicySourcePack: policySourcePack,
          step5Writer: writerOutput,
          step6SeoEditor: editorOutput,
          step8RevisionLoops: factCheckLoops + editorRevisionLoops,
          step9Rejected: rejectedRecord,
          step10InternalLinks: [],
          executionDurationMs,
          logs,
        };
      }

      // ========================================================
      // STEP 10: 관련 콘텐츠 내부링크 추천 및 연동
      // ========================================================
      const internalLinks = editorOutput.article.internalLinks || [];
      recordLog(10, "INTERNAL_LINKER", "SUCCESS", `STEP 10 완료: 관련 내부링크 ${internalLinks.length}개 자동 연동`, {
        links: internalLinks,
      });

      // ========================================================
      // STEP 11(큐 적재): 검수 결과 PUBLISH 대기열 적재
      // [중요 제한]: 실제 자동 발행 차단 (PENDING 유지)
      // ========================================================
      const article = editorOutput.article;
      const queueItem: PublishQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: "PENDING",
        queuedAt: new Date().toISOString(),
        payload: article,
        searchIntent: selectedKeyword.searchIntent,
        attempts: 0,
      };

      pipelineStore.enqueueArticle(queueItem);
      pipelineStore.updateContentTask(selectedKeyword.keyword, "QUEUED");
      recordLog(
        7,
        "PUBLISH_QUEUE",
        "SUCCESS",
        `검수 및 팩트체크 통과 콘텐츠 발행 대기열(Publish Queue) 적재 완료 (수동 승인 대기 중)`,
        { queueId: queueItem.id, headline: article.headline, status: queueItem.status }
      );

      const executionDurationMs = Date.now() - startTime;
      pipelineStore.recordPipelineRun({
        id: runId,
        status: "COMPLETED",
        durationMs: executionDurationMs,
        summary: `파이프라인 성공 완료: '${article.headline}' 발행 대기열 적재 완료`,
      });

      return {
        runId,
        success: true,
        step1Hunter: hunterOutput,
        step2Deduplication: deduplicationOutput,
        step3Evaluator: evaluatorOutput,
        step4SelectedKeyword: selectedKeyword,
        step4_5PolicySourcePack: policySourcePack,
        step4_6TemporalValidation: temporalValidation,
        step4_7EvidenceEngine: evidenceEngineOutput,
        step5Writer: writerOutput,
        step6SeoEditor: editorOutput,
        step7QueueItem: queueItem,
        step8RevisionLoops: factCheckLoops + editorRevisionLoops,
        step10InternalLinks: internalLinks,
        executionDurationMs,
        logs,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      recordLog(0, "PIPELINE_ERROR", "ERROR", `파이프라인 실행 중 오류 발생: ${errorMsg}`);
      pipelineStore.recordApiError("pipeline.run", errorMsg, runId, options);
      pipelineStore.recordPipelineRun({
        id: runId,
        status: "FAILED",
        durationMs: Date.now() - startTime,
        error: errorMsg,
      });

      throw err;
    }
  }

  public getHunter(): KeywordHunterAgent {
    return this.hunter;
  }

  public getDuplicateRemover(): DuplicateRemover {
    return this.duplicateRemover;
  }

  public getEvaluator(): KeywordEvaluatorAgent {
    return this.evaluator;
  }

  public getWriter(): ContentWriterAgent {
    return this.writer;
  }

  public getFactChecker(): FactCheckerAgent {
    return this.factChecker;
  }

  public getSeoEditor(): SeoEditorAgent {
    return this.seoEditor;
  }
}

export const agentPipeline = new AgentPipeline();
