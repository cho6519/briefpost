/**
 * 전문 에이전트 파이프라인 공통 인터페이스 및 데이터 스키마 정의
 *
 * 전체 자동화 파이프라인 10단계:
 * STEP 1: KEYWORD HUNTER (키워드 수집)
 * STEP 2: DEDUPLICATION (중복 키워드 및 이미 작성된 주제 제거)
 * STEP 3: KEYWORD EVALUATOR (검색수요, 경쟁도, 검색의도, 수익성, 확장성, 지속성 평가)
 * STEP 4: SELECTION (우선순위/S급/A급/트렌드 키워드 선정)
 * STEP 5: CONTENT WRITER (검색의도 맞춤형 콘텐츠 작성 & 공식 출처 우선)
 * STEP 6: SEO EDITOR (품질 및 SEO 검수 -> PUBLISH / REVISE / REJECT)
 * STEP 7: PUBLISH QUEUE (검수 결과 PUBLISH만 대기열 적재)
 * STEP 8: REVISION LOOP (REVISE인 경우 CONTENT WRITER에게 수정 요청 루프)
 * STEP 9: REJECTION ARCHIVE (REJECT인 콘텐츠는 발행하지 않고 사유 기록)
 * STEP 10: INTERNAL LINK RECOMMENDER (관련 콘텐츠 내부링크 자동 추천)
 */

// ==========================================
// 공통 도메인 상태 및 열거형 (Canonical Definitions)
// ==========================================

export type SearchIntentType =
  | "INFORMATIONAL"   // 정보 탐색형
  | "COMMERCIAL"      // 상업적 조사/비교형
  | "TRANSACTIONAL"   // 행동/전환형
  | "NAVIGATIONAL";   // 특정 사이트/브랜드 탐색형

export type KeywordGrade = "S" | "A" | "TREND" | "B" | "C";

/**
 * [SEO Review Layer]
 * SEO 에디터 최종 판정 상태
 * - PUBLISH: SEO 및 품질 기준 충족 (85점 이상) -> 발행 대기열(PENDING) 적재 판단
 * - REVISE: 내용 보완 및 소주제 개선 필요 (70~84점) -> Content Writer 재작성 루프
 * - REJECT: 품질 미달 또는 규정 위반 (70점 미만) -> 폐기 아카이브
 * ※ "MINOR EDIT"는 정식 상태가 아니며, 헤드라인/슬러그 등의 미세 교정은 에디터 내부에서 자동 보정된 후 PUBLISH로 수렴함.
 */
export type ReviewStatus = "PUBLISH" | "REVISE" | "REJECT";

/**
 * [Publish Queue Layer]
 * 발행 대기열 항목의 생명주기 상태
 * - PENDING: 검수 통과 후 대기열 적재 완료, 관리자 수동 승인 대기 (자동 발행 절대 금지)
 * - PROCESSING: 발행 처리 진행 중
 * - PUBLISHED: 관리자 명시적 승인 후 실제 articles 테이블에 등록 완료
 * - FAILED: 발행 처리 중 데이터베이스 또는 시스템 오류 발생
 * - REJECTED: 대기열에서 반려/취소됨
 */
export type QueueItemStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED" | "REJECTED";

/**
 * [Pipeline Content Task Layer]
 * 작업 관리 테이블(pipeline_content_tasks) 내 키워드/콘텐츠 단위 작업 진행 상태
 */
export type ContentTaskStatus = "PENDING_WRITING" | "REVIEWED" | "REVISE" | "QUEUED" | "REJECTED";

/**
 * [Pipeline Log Layer]
 * 파이프라인 실시간 실행 로그 레벨
 */
export type PipelineLogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

/**
 * [Pipeline Run Layer]
 * 파이프라인 전체 세션 실행 상태
 */
export type PipelineRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

// ==========================================
// 1. KEYWORD HUNTER (STEP 1)
// ==========================================

export interface KeywordHunterInput {
  domain?: string;              // 예: "AI & 테크", "경제/비즈니스", "IT 트렌드"
  seedKeywords?: string[];      // 발굴 시드 키워드 (선택)
  count?: number;               // 발굴할 키워드 후보 수 (기본: 6)
}

export interface HuntedKeyword {
  id?: string;
  keyword: string;              // 발굴된 키워드명
  category: string;             // 도메인/분야
  source: string;               // 발굴 출처/근거
  context: string;              // 주목받는 배경 맥락
  trendScore: number;           // 트렌드 지수 (1~100)
  searchIntent: SearchIntentType; // 1차 추정 검색의도
  searchVolume: number | null;  // 검색량 (데이터 없으면 null)
  isSearchVolumeEstimate: boolean; // 실제치인지 추정치인지 명시
  cpc: number | null;           // CPC (데이터 없으면 null)
  isCpcEstimate: boolean;       // 실제치인지 추정치인지 명시
  discoveredAt: string;         // 발굴 시각 (ISO string)
}

export interface KeywordHunterOutput {
  query: string;
  huntedKeywords: HuntedKeyword[];
  timestamp: string;
}

// ==========================================
// 2. DEDUPLICATION (STEP 2)
// ==========================================

export interface DeduplicationInput {
  candidates: HuntedKeyword[];
  existingTitlesAndKeywords?: string[];
  existingSlugs?: string[];
}

export interface DeduplicationOutput {
  filteredKeywords: HuntedKeyword[];
  removedDuplicates: Array<{
    keyword: string;
    reason: string;
    similarityScore?: number;
  }>;
  timestamp: string;
}

// ==========================================
// 3 & 4. KEYWORD EVALUATOR & SELECTION (STEP 3 & 4)
// ==========================================

export interface EvaluationCriteria {
  searchDemand: number;          // 1. 검색수요 잠재력 (1~100)
  competition: number;           // 2. 경쟁 강도 (낮을수록 진입 용이, 1~100)
  searchIntentFit: number;       // 3. 검색의도 부합성 (1~100)
  monetizationPotential: number; // 4. 수익성 및 가치 (1~100)
  topicScalability: number;      // 5. 확장성 (연관 토픽 클러스터 확장력 1~100)
  sustainability: number;        // 6. 지속성 (에버그린 수명 1~100)
  totalScore: number;            // 종합 환산 점수 (1~100)
}

export interface EvaluatedKeyword {
  keyword: string;              // 키워드명
  category: string;             // 카테고리
  grade: KeywordGrade;          // S / A / TREND / B / C 등급
  score: number;                // 최종 점수
  criteria: EvaluationCriteria; // 6대 세부 평가지표
  searchIntent: SearchIntentType; // 확정된 검색의도
  selectionReason: string;      // 선정/평가 이유
  recommendedAngle: string;     // 기사 기획 앵글 / 핵심 관점
  targetAudience: string;       // 타깃 독자 정의
  isDataEstimated: boolean;     // 수치 데이터 추정치 여부 명시
  evaluatedAt: string;          // 평가 일시
}

export interface KeywordEvaluatorInput {
  candidates: HuntedKeyword[];
  targetAudience?: string;
}

export interface KeywordEvaluatorOutput {
  selectedKeyword: EvaluatedKeyword;
  allEvaluated: EvaluatedKeyword[];
  runnerUps: Array<{
    keyword: string;
    score: number;
    grade: KeywordGrade;
    reason: string;
  }>;
  evaluatedCount: number;
  timestamp: string;
}

// ==========================================
// 5 & 8. CONTENT WRITER (STEP 5 & 8)
// ==========================================

export interface ArticleSection {
  subheading: string;           // 소주제
  content: string;              // 소주제 본문
}

export interface ArticleDraft {
  topicKeyword: string;         // 주제 키워드
  draftTitle: string;           // 초안 제목 (H1)
  seoTitle?: string;            // SEO 제목
  metaDescription?: string;     // 메타 설명
  slug?: string;                // 슬러그
  primaryKeyword?: string;      // 메인 키워드
  secondaryKeywords?: string[]; // 서브 키워드
  relatedKeywords?: string[];   // 연관 키워드
  h1?: string;                  // H1 제목
  introduction: string;         // 서론 (문제 제기 및 공식 출처 배경)
  sections: ArticleSection[];   // 본론 (H2/H3 소주제별 상세 단락)
  faq?: Array<{ question: string; answer: string }>; // FAQ
  conclusion: string;           // 결론 및 시사점
  keyTakeaways: string[];       // 3줄 핵심 요약
  officialSources: string[];    // 인용/참조된 공식 출처 (정부, 공식 보도자료, 원천 기술 문서 등)
  internalLinkCandidates?: string[]; // 내부링크 후보
  wordCount: number;            // 글자 수
  revisionNotes?: string;       // 수정 반영 사항 (REVISE 시)
  writtenAt: string;
}

// ==========================================
// 4.5. POLICY SOURCE RESOLVER
// ==========================================

export type PolicyValidityStatus = "CURRENT" | "OUTDATED" | "SUPERSEDED" | "UPCOMING" | "UNKNOWN";
export type SourceConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface PolicySourceReference {
  value: string;
  source: string;
  sourceUrl?: string;
  sourceDate?: string;
  notes?: string;
}

export interface PolicyComparisonItem {
  fieldName: string;
  oldPolicyValue: string;
  currentPolicyValue: string;
  changeDescription: string;
  effectiveDate?: string;
  impactNote?: string;
}

export interface PolicySourcePack {
  keyword: string;
  policyKey?: string;
  policyName: string;
  policyYear: string;
  officialPolicyName: string;
  currentStatus: PolicyValidityStatus;
  effectiveDate: PolicySourceReference;
  applicationPeriod: PolicySourceReference;
  eligibility: PolicySourceReference;
  ageCriteria?: PolicySourceReference;
  incomeCriteria?: PolicySourceReference;
  assetCriteria?: PolicySourceReference;
  supportAmount: PolicySourceReference;
  supportPeriod: PolicySourceReference;
  paymentSchedule?: PolicySourceReference;
  applicationMethod: PolicySourceReference;
  applicationDocuments: PolicySourceReference;
  exceptions: PolicySourceReference[];
  exclusionCriteria: PolicySourceReference[];
  duplicateSupportRules: PolicySourceReference[];
  comparisonWithOldPolicy?: PolicyComparisonItem[];
  importantChanges: string[];
  officialSources: Array<{
    name: string;
    url: string;
    priority: number;
    department?: string;
    isPrimaryGov: boolean;
  }>;
  sourceCheckedAt: string;
  confidence: SourceConfidence;
  warnings: string[];
  evidenceEngineOutput?: OfficialSourceEvidenceEngineOutput;
  temporalValidation?: PolicyTemporalValidationResult;
  claimValidations?: ClaimEvidenceValidation[];
}

// ==========================================
// 4.6 OFFICIAL SOURCE EVIDENCE ENGINE & TEMPORAL VALIDATOR
// ==========================================

export type OfficialDocumentType =
  | "PRESS_RELEASE"     // 정부 부처 공식 보도자료 및 공고 (Priority 1)
  | "REGULATION"        // 법령정보 및 공식 행정 규정 (Priority 2)
  | "SERVICE_GUIDE"     // 복지로·정부24·고용24·홈택스 등 공식 서비스의 사업 안내 (Priority 3)
  | "PUBLIC_NOTICE"     // 공공기관 공식 공지 (Priority 4)
  | "LOCAL_GOV_NOTICE"  // 지자체 공식 공고 (Priority 5)
  | "NOTICE";           // 일반 공식 공지사항

export type EvidenceExtractionMethod = "HTTP_LIVE" | "CACHE" | "OFFICIAL_FIXTURE";

export interface OfficialEvidence {
  evidenceId: string;
  sourceOrganization: string;
  sourceTitle: string;
  sourceUrl: string;
  canonicalUrl: string;
  retrievedAt: string;
  publishedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  policyYear: string | null;
  documentType: OfficialDocumentType;
  httpStatus: number;
  contentHash: string;
  evidenceText: string;
  extractionMethod: EvidenceExtractionMethod;
  isLiveRetrieved: boolean;
  isFixture: boolean;
  retrievalWarnings: string[];
  publishedAtOrigin?: MetadataOrigin;
  effectiveFromOrigin?: MetadataOrigin;
  effectiveUntilOrigin?: MetadataOrigin;
  isTruncated?: boolean;
  totalLength?: number;
}

export type TemporalStatus =
  | "CURRENT_EFFECTIVE"   // 현재 유효/시행 중
  | "UPCOMING"            // 시행 예정
  | "EXPIRED"             // 신청/시행 기간 종료
  | "PAST_ONLY"           // 과거 규정 (현재 미적용)
  | "UNKNOWN";            // 시점 불명

export type ClaimVerificationStatus =
  | "VERIFIED"             // 원문이 해당 주장을 직접 뒷받침함 (Direct Evidence)
  | "DERIVED"              // 원문에 근거가 있지만 계산 또는 추론이 포함됨 (Calculation/Inference)
  | "CONTRADICTED"         // 원문이 주장과 모순됨
  | "UNKNOWN"              // 근거가 부족하거나 적용 여부를 판단할 수 없음
  | "NO_OFFICIAL_EVIDENCE" // 공식 근거를 찾지 못함 (UNKNOWN 동의어)
  | "CONFLICTING_SOURCES"  // 공식 출처끼리 서로 충돌함
  | "HISTORICAL_ONLY";     // 과거 규정만 존재함

export type VerificationMethod =
  | "DIRECT_EXCERPT"        // 원문 직접 인용 및 완전 일치
  | "CALCULATION_DERIVED"   // 원문 수치 기반 계산 유도 (DERIVED)
  | "HISTORICAL_INFERENCE"  // 과거 자료로부터의 추론
  | "METADATA_MATCH"        // 메타데이터 대조
  | "UNVERIFIED";           // 미검증

export type MetadataOrigin =
  | "EXTRACTED_FROM_SOURCE" // 원문에서 직접 추출
  | "SUPPLIED_METADATA"     // 호출자/시스템 제공 메타데이터
  | "UNKNOWN";              // 출처 불명

export interface ExcerptLocation {
  start: number;
  end: number;
  paragraphIndex?: number;
}

export interface ClaimEvidenceValidation {
  claimId: string;
  claimText: string;
  claimKey: string;
  claimedValue: string;
  evidenceId: string | null;
  sourceUrl: string | null;
  sourceOrganization: string | null;
  sourceTitle: string | null;
  evidenceText: string;
  supportingExcerpt: string | null;
  excerptLocation?: ExcerptLocation;
  policyYear: string;
  applicantType: PolicyApplicantType;
  temporalStatus: TemporalStatus;
  verificationStatus: ClaimVerificationStatus;
  verificationMethod: VerificationMethod;
  verificationReason: string;
  metadataOrigin?: MetadataOrigin;
  missingEvidence?: string;
  warnings: string[];
}

export type PolicyApplicantType =
  | "NEW_APPLICANT"         // 신규 신청자
  | "EXISTING_BENEFICIARY"  // 기존 수혜자
  | "ALL"                   // 전체
  | "UNKNOWN";              // 불명확

export interface PolicyClaim {
  claimId: string;
  claimText: string;
  claimKey: string;
  claimedValue: string;
  evidenceIds: string[];
  applicantType?: PolicyApplicantType;
  policyYear?: string;
  temporalStatus: TemporalStatus;
  verificationStatus: ClaimVerificationStatus;
  verificationReason: string;
}

export interface PolicyTemporalValidationResult {
  currentDate: string;
  targetPolicyYear: string;
  isExpired: boolean;
  applicationPeriodStatus: TemporalStatus;
  effectivePeriodStatus: TemporalStatus;
  oldRulesDetected: Array<{
    field: string;
    oldValue: string;
    currentValue: string;
    isPromotedWarning: boolean;
  }>;
  warnings: string[];
  isValidForCurrentYear: boolean;
}

export interface OfficialSourceEvidenceEngineOutput {
  keyword: string;
  policyYear: string;
  evidences: OfficialEvidence[];
  claims: PolicyClaim[];
  isVerified: boolean;
  unverifiedClaimsCount: number;
  summary: string;
  retrievalSummary: {
    liveCount: number;
    fixtureCount: number;
    failedCount: number;
  };
  warnings: string[];
  claimValidations?: ClaimEvidenceValidation[];
  timestamp: string;
}

export interface ContentWriterInput {
  evaluatedKeyword: EvaluatedKeyword;
  revisionFeedback?: string[];  // REVISE 발생 시 전달받는 에디터 피드백
  previousDraft?: ArticleDraft; // 이전 초안 (수정 모드일 때)
  policySourcePack?: PolicySourcePack; // 최신 공식 정책 팩 (정책성 키워드일 경우 제공)
}

export interface ContentWriterOutput {
  draft: ArticleDraft;
  targetAudience: string;
  revisionAttempt: number;
  timestamp: string;
}

// ==========================================
// 6. FACT CHECKER
// ==========================================

/**
 * [Fact Check Claim Layer]
 * 개별 사실 주장(Claim) 단위의 검증 상태
 * - VERIFIED: 공식 출처(정부 공고, 보도자료, 원천 문서)와 완벽히 일치
 * - REVISE: 세부 내용/날짜/명칭에 부분적 수정이 필요함
 * - REJECT: 치명적 왜곡, 날조, 명백한 허위 사실
 * - UNVERIFIABLE: 공식 출처에서 확인 불가능하거나 불분명함
 */
export type ClaimStatus = "VERIFIED" | "REVISE" | "REJECT" | "UNVERIFIABLE";

/**
 * [Fact Check Report Layer]
 * 전체 기사에 대한 FACT CHECKER 종합 판정 상태
 * - VERIFIED: 모든 주장이 VERIFIED -> SEO EDITOR 단계 진입 허용
 * - REVISE_REQUIRED: REVISE 또는 UNVERIFIABLE 존재 -> Content Writer 수정 루프로 회귀 (SEO EDITOR 차단)
 * - REJECT: 1건 이상의 REJECT 존재 -> REJECTION ARCHIVE로 즉시 영구 폐기 (SEO EDITOR 차단)
 */
export type FactCheckStatus = "VERIFIED" | "REVISE_REQUIRED" | "REJECT";

export interface FactClaim {
  claim: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceOrganization?: string;
  sourceDate?: string;
  checkedAt: string;
  evidence: string;
  status: ClaimStatus;
  confidence: number;
  evidenceId?: string;
  claimKey?: string;
  claimedValue?: string;
  applicantType?: PolicyApplicantType;
  temporalStatus?: TemporalStatus;
  verificationStatus?: ClaimVerificationStatus;
}

export interface FactCheckInput {
  draft: ArticleDraft;
  category: string;
  keyword: string;
  searchIntent?: SearchIntentType;
  policySourcePack?: PolicySourcePack;
}

export interface FactCheckReport {
  status: FactCheckStatus;
  checkedAt: string;
  claims: FactClaim[];
  claimCount: number;
  verifiedCount: number;
  reviseCount: number;
  rejectCount: number;
  unverifiableCount: number;
  sourceCount: number;
  errors?: string[];
  feedback?: string[];
}

// ==========================================
// 7. SEO EDITOR
// ==========================================

export interface SeoChecklist {
  keywordInTitle: boolean;
  keywordInFirst100Words: boolean;
  properHeadingStructure: boolean;
  metaDescriptionValid: boolean;
  officialSourceVerified: boolean;
  searchIntentMatched: boolean;
}

export interface InternalLinkRecommendation {
  title: string;
  slug: string;
  anchorText: string;
  reason: string;
  similarityScore: number;
}

export interface SeoOptimizedArticle {
  headline: string;             // 완성 헤드라인
  subHeadline: string;          // 부제
  metaDescription: string;      // 메타 디스크립션 (130~160자)
  slug: string;                 // 영문/하이픈 슬러그
  targetKeywords: string[];     // 검색 노출 타깃 키워드
  tags: string[];               // 태그
  finalMarkdownContent: string; // 마크다운 전문 (내부링크 반영 포함)
  readingTimeMinutes: number;   // 독서 시간
  canonicalKeyword: string;     // 대표 키워드
  category: string;             // 분류
  seoScore: number;             // SEO 최적화 지수 (1~100)
  checklist: SeoChecklist;      // 점검 통과 여부
  internalLinks: InternalLinkRecommendation[]; // STEP 10 추천 내부링크
  editedAt: string;
}

export interface SeoEditorInput {
  draft: ArticleDraft;
  category: string;
  primaryKeyword: string;
  searchIntent: SearchIntentType;
  availableInternalLinks?: Array<{ title: string; slug: string; category: string }>;
  policySourcePack?: PolicySourcePack;
}

export interface SeoEditorOutput {
  status: ReviewStatus;         // PUBLISH | REVISE | REJECT
  reviewScore: number;          // 검수 점수 (1~100)
  reviewFeedback: string[];     // 검수 피드백 (수정 필요 시 개선점, 거절 시 사유)
  article?: SeoOptimizedArticle; // PUBLISH 또는 REVISE 시 완성/교정본
  rejectionReason?: string;     // REJECT 시 상세 사유
  timestamp: string;
}

// ==========================================
// 7, 8, 9, 10. 파이프라인 큐 및 결과 관리
// ==========================================

export interface PublishQueueItem {
  id: string;
  status: QueueItemStatus;      // 기본: PENDING (자동 발행 금지, '발행' 명령 시 PUBLISHED)
  queuedAt: string;
  publishedAt?: string;
  processingStartedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  failedAt?: string;
  payload: SeoOptimizedArticle;
  searchIntent?: SearchIntentType;
  attempts: number;
  error?: string;
}

export interface PublishQueueOutput {
  queueId: string;
  status: "QUEUED";
  item: PublishQueueItem;
  queueLength: number;
}

export interface RejectedArticleRecord {
  id: string;
  keyword: string;
  category: string;
  reason: string;
  feedback: string[];
  score: number;
  rejectedAt: string;
}

export interface PipelineExecutionLog {
  id: string;
  runId: string;
  step: number;
  stepName: string;
  level: PipelineLogLevel;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PipelineExecutionResult {
  runId: string;
  success: boolean;
  step1Hunter: KeywordHunterOutput;
  step2Deduplication: DeduplicationOutput;
  step3Evaluator: KeywordEvaluatorOutput;
  step4SelectedKeyword: EvaluatedKeyword;
  step4_5PolicySourcePack?: PolicySourcePack;
  step4_6TemporalValidation?: PolicyTemporalValidationResult;
  step4_7EvidenceEngine?: OfficialSourceEvidenceEngineOutput;
  step5Writer: ContentWriterOutput;
  step6SeoEditor: SeoEditorOutput;
  step7QueueItem?: PublishQueueItem;
  step8RevisionLoops: number;
  step9Rejected?: RejectedArticleRecord;
  step10InternalLinks: InternalLinkRecommendation[];
  executionDurationMs: number;
  logs: PipelineExecutionLog[];
  error?: string;
}

// ==========================================
// 관리자 대시보드 12대 필수 지표
// ==========================================

export interface DashboardStats {
  todayDiscoveredKeywords: number;   // 1. 오늘 발견한 키워드 수
  evaluatedKeywordsCount: number;    // 2. 평가 완료 키워드 수
  gradeSCount: number;               // 3. S급 키워드
  gradeACount: number;               // 4. A급 키워드
  trendKeywordsCount: number;        // 5. 트렌드 키워드
  pendingWritingCount: number;       // 6. 작성 대기 콘텐츠
  reviewedCount: number;             // 7. 검수 완료 콘텐츠
  reviseCount: number;               // 8. 수정 필요 콘텐츠
  publishQueuePendingCount: number;  // 9. 발행 대기 콘텐츠
  publishedCount: number;            // 10. 발행 완료 콘텐츠
  failedTasksCount: number;          // 11. 실패한 작업
  apiErrorsCount: number;            // 12. API 오류
  lastUpdated: string;
}
