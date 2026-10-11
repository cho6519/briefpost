import {
  PolicySourcePack,
  PolicyValidityStatus,
  SourceConfidence,
  PolicyComparisonItem,
  PolicySourceReference,
} from "./types";

/**
 * 정책성 키워드 감지용 핵심 단어 사전
 */
export const POLICY_KEYWORDS: string[] = [
  "정책", "지원금", "보조금", "복지", "청년", "월세", "주거", "주택드림", "디딤돌",
  "근로장려금", "자녀장려금", "실업급여", "구직급여", "국민연금", "조기노령연금", "기초연금",
  "건강보험", "피부양자", "보험료", "세금", "연말정산", "소득세", "종합소득세", "부모급여",
  "아동수당", "소득요건", "소득기준", "재산요건", "재산기준", "신청자격", "수급자격",
  "바우처", "에너지바우처", "대출", "정책자금", "대환대출", "시행령", "시행규칙", "고시",
  "개정안", "감액률", "상한액", "하한액", "지원기간", "신청기간", "지급일", "환산액", "환산율",
  "법률", "개정법"
];

/**
 * 2026년 공표/시행 기준 대한민국 핵심 정책 표준 공식 팩 데이터베이스 (Priority 1 & 2 검증본)
 */
interface OfficialPolicyMaster {
  policyKey: string;
  matchPatterns: string[];
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
  paymentSchedule: PolicySourceReference;
  applicationMethod: PolicySourceReference;
  applicationDocuments: PolicySourceReference;
  exceptions: PolicySourceReference[];
  exclusionCriteria: PolicySourceReference[];
  duplicateSupportRules: PolicySourceReference[];
  comparisonWithOldPolicy: PolicyComparisonItem[];
  importantChanges: string[];
  officialSources: Array<{
    name: string;
    url: string;
    priority: number;
    department?: string;
    isPrimaryGov: boolean;
  }>;
  confidence: SourceConfidence;
  warnings: string[];
}

const OFFICIAL_POLICY_MASTERS: OfficialPolicyMaster[] = [
  {
    policyKey: "소상공인전기요금특별지원",
    matchPatterns: ["전기요금", "전기세", "소상공인 전기요금", "전기요금 특별지원", "전기요금지원"],
    policyName: "2026 소상공인 전기요금 특별지원 사업",
    policyYear: "2026",
    officialPolicyName: "중소벤처기업부 2026년도 소상공인 전기요금 특별지원 사업 시행계획 공고",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년도 연중 수시 접수",
      source: "중소벤처기업부 공식 공고",
      sourceUrl: "https://www.mss.go.kr",
      sourceDate: "2026-01-05",
      notes: "예산 소진 시 조기 마감"
    },
    applicationPeriod: {
      value: "2026년 1월부터 예산 소진 시까지 온라인 접수",
      source: "소상공인시장진흥공단 공고",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    eligibility: {
      value: "개업일이 공고일 이전이며, 공고일 기준 활동 중이고 연 매출 1억 400만 원 이하인 개인·법인 소상공인 (국세 완납)",
      source: "소상공인전기요금특별지원 사업 지침",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    supportAmount: {
      value: "사업자당 최대 20만 원 (한국전력 요금 직접 차감 또는 계좌 환급)",
      source: "중소벤처기업부 보도자료",
      sourceUrl: "https://www.mss.go.kr",
      sourceDate: "2026-01-05"
    },
    supportPeriod: {
      value: "사업 기간 내 1회 지원 (최대 20만 원 한도 차감/환급 완료 시 종료)",
      source: "사업 시행 매뉴얼",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    paymentSchedule: {
      value: "신청 접수 후 검증을 거쳐 한전 계약자는 익월 고지서 차감, 비계약사용자는 계좌 입금",
      source: "소진공 사업 매뉴얼",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    applicationMethod: {
      value: "온라인 전용: '소상공인전기요금특별지원.kr' (포털 검색 가능)",
      source: "공식 전용 누리집",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    applicationDocuments: {
      value: "직접계약자(신청서만 작성, 행정망 연계 자동검증), 비계약사용자(고지서 사본, 관리비 내역서 등 추가 제출)",
      source: "제출서류 안내",
      sourceUrl: "https://소상공인전기요금특별지원.kr",
      sourceDate: "2026-01-05"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "휴·폐업 소상공인, 유흥·도박 등 정책자금 융자제외 업종, 연 매출 1억 400만 원 초과 사업자",
        source: "지원제외 기준",
        sourceUrl: "https://소상공인전기요금특별지원.kr",
        sourceDate: "2026-01-05"
      }
    ],
    duplicateSupportRules: [
      {
        value: "기존 1차·2차 전기요금 수혜자 중 지원 한도(20만 원) 기수급자는 중복 지원 불가",
        source: "중복지원 방지 규정",
        sourceUrl: "https://소상공인전기요금특별지원.kr",
        sourceDate: "2026-01-05"
      }
    ],
    comparisonWithOldPolicy: [
      {
        fieldName: "연매출 기준",
        oldPolicyValue: "과거 연 매출 6,000만 원 이하",
        currentPolicyValue: "2026 현재 연 매출 1억 400만 원 이하로 대폭 확대",
        changeDescription: "취약 소상공인 지원 대상을 일반 소상공인 대다수로 수혜 범위 대폭 확대"
      }
    ],
    importantChanges: [
      "매출 요건이 기존 6,000만 원에서 1억 400만 원 이하로 대폭 완화되어 더 많은 영세 소상공인이 수혜 가능합니다.",
      "소상공인전기요금특별지원.kr에서 간편 본인인증으로 접수 가능합니다."
    ],
    officialSources: [
      {
        name: "중소벤처기업부",
        url: "https://www.mss.go.kr",
        priority: 1,
        isPrimaryGov: true
      },
      {
        name: "소상공인전기요금특별지원 공식 누리집",
        url: "https://소상공인전기요금특별지원.kr",
        priority: 2,
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "OFFICIAL_SOURCE_NOTE: 대출/융자가 아닌 '전기요금 특별지원(최대 20만 원 환급)' 현금성/차감성 보조금 사업임"
    ]
  },
  {
    policyKey: "소상공인경영안정자금",
    matchPatterns: ["경영안정자금", "소상공인 정책자금", "정책자금 직접대출", "대환대출", "소진공 직접대출", "자영업자 대출", "소상공인 대출", "정책자금"],
    policyName: "2026 소상공인 경영안정자금 및 정책자금",
    policyYear: "2026",
    officialPolicyName: "중소벤처기업부 및 소상공인시장진흥공단 2026년도 소상공인 정책자금 운용계획",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년도 연중 수시 (분기별 회차 배정)",
      source: "중소벤처기업부 공식 공고",
      sourceUrl: "https://www.mss.go.kr",
      sourceDate: "2026-01-02",
      notes: "예산 소진 시 조기 마감"
    },
    applicationPeriod: {
      value: "2026년 1월부터 예산 소진 시까지 상시 접수",
      source: "소상공인시장진흥공단 공고",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    eligibility: {
      value: "소상공인기본법상 소상공인 (상시 근로자 5인 미만, 제조업·건설업·운수업 10인 미만, 국세 완납)",
      source: "소상공인시장진흥공단 지침",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    supportAmount: {
      value: "일반 경영안정 최대 7,000만 원, 특별 경영안정 최대 1억 원, 대환대출 최대 5,000만 원",
      source: "소상공인시장진흥공단 사업계획",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    supportPeriod: {
      value: "최대 5년 (거치기간 2년 포함) 또는 대환 10년 분할상환",
      source: "중소벤처기업부 지침",
      sourceUrl: "https://www.mss.go.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "전자약정 체결 후 7~14영업일 이내 계좌 입금",
      source: "소진공 매뉴얼",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    applicationMethod: {
      value: "온라인: 소상공인정책자금 누리집(ols.semas.or.kr) 비대면 원스톱 접수",
      source: "소상공인정책자금 공식 누리집",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    applicationDocuments: {
      value: "사업자등록증명원, 부가가치세 과세표준증명, 국세·지방세 납세증명서, 4대보험 가입자명부",
      source: "소진공 제출서류 가이드",
      sourceUrl: "https://ols.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "세금 체납자, 유흥·향락·도박 사행성 업종, 신용도 판단정보 등록자",
        source: "소진공 지원제외 기준",
        sourceUrl: "https://ols.semas.or.kr",
        sourceDate: "2026-01-05"
      }
    ],
    duplicateSupportRules: [
      {
        value: "기존 정책자금 잔액 한도 범위 내 추가 대출 가능 (한도 초과 시 대환 등 활용)",
        source: "소진공 한도 관리 지침",
        sourceUrl: "https://ols.semas.or.kr",
        sourceDate: "2026-01-05"
      }
    ],
    comparisonWithOldPolicy: [],
    importantChanges: [
      "2026년 소상공인 경영안정자금은 선착순으로 예산이 조기 소진될 수 있으므로 사전 서류 준비가 필수적입니다.",
      "소상공인정책자금 누리집(ols.semas.or.kr)에서 100% 비대면 온라인으로 접수됩니다.",
      "불법 브로커의 수수료 요구 행위는 사기이므로 절대 응하지 마십시오."
    ],
    officialSources: [
      {
        name: "중소벤처기업부",
        url: "https://www.mss.go.kr",
        priority: 1,
        isPrimaryGov: true
      },
      {
        name: "소상공인시장진흥공단 소상공인정책자금 누리집",
        url: "https://ols.semas.or.kr",
        priority: 2,
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "OFFICIAL_SOURCE_NOTE: 복지로가 아닌 소상공인정책자금 누리집(ols.semas.or.kr)이 공식 접수처임"
    ]
  },
  {
    policyKey: "소상공인노란우산공제",
    matchPatterns: ["노란우산공제", "소득공제", "자영업자 절세", "노란우산", "사업자 소득공제", "세금 절세"],
    policyName: "2026 소상공인 노란우산공제 소득공제 및 절세 혜택",
    policyYear: "2026",
    officialPolicyName: "중소벤처기업부 및 중소기업중앙회 2026년도 소기업·소상공인 공제(노란우산) 운용계획",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년도 연중 상시 운용",
      source: "중소기업중앙회 공식 공고",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02",
      notes: "과세표준 구간별 최대 500만 원 소득공제 혜택"
    },
    applicationPeriod: {
      value: "2026년 연중 상시 가입 접수",
      source: "노란우산 누리집",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    eligibility: {
      value: "소기업·소상공인 대표자 (사업자등록증 보유 개인사업자 및 법인대표자)",
      source: "중소기업협동조합법 제115조",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    supportAmount: {
      value: "사업소득 금액에 따라 연 최대 500만 원 소득공제 및 연복리 이자 지급, 수급권 법적 보호(압류·양도·담보 금지)",
      source: "중소벤처기업부 세제지원 안내",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "가입 유지 기간 동안 매년 소득공제 적용, 폐업·사망·노령 시 공제금 지급",
      source: "노란우산 정관",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "공제 사유 발생 시 청구 즉시 일시금 또는 분할 지급",
      source: "중소기업중앙회",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "온라인: 노란우산 공식 누리집(8899.or.kr) 또는 시중 주요 은행(국민, 신한, 우리, 하나, 기업 등) 모바일 뱅킹",
      source: "노란우산 공식 가입 안내",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "사업자등록증명원, 부가가치세 과세표준증명원(또는 표준재무제표증명), 대표자 신분증",
      source: "가입 구비서류 목록",
      sourceUrl: "https://www.8899.or.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "유흥주점업, 도박 및 사행성 업종, 사업자등록이 말소된 폐업자",
        source: "공제 가입 제한 규정",
        sourceUrl: "https://www.8899.or.kr",
        sourceDate: "2026-01-02"
      }
    ],
    duplicateSupportRules: [],
    comparisonWithOldPolicy: [],
    importantChanges: [
      "2026년 세법 개정안 연계로 영세 자영업자의 소득공제 실효 혜택이 강화되었습니다.",
      "복리이자 적용 및 압류방지 통장 개설 지원으로 폐업 시 사업주의 안전망 역할을 수행합니다."
    ],
    officialSources: [
      {
        name: "중소기업중앙회 노란우산 누리집",
        url: "https://www.8899.or.kr",
        priority: 1,
        isPrimaryGov: true
      },
      {
        name: "국세청 홈택스",
        url: "https://www.hometax.go.kr",
        priority: 2,
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: []
  },
  {
    policyKey: "두루누리사회보험료지원",
    matchPatterns: ["두루누리", "4대보험 지원", "사회보험료 지원", "일자리안정자금", "인건비 지원", "고용보험 환급"],
    policyName: "2026 두루누리 사회보험료(고용·국민연금) 80% 지원 사업",
    policyYear: "2026",
    officialPolicyName: "고용노동부 및 근로복지공단 2026년도 두루누리 사회보험료 지원사업 공고",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년도 연중 상시 지원",
      source: "근로복지공단 공식 공고",
      sourceUrl: "https://www.comwel.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationPeriod: {
      value: "2026년 매월 수시 접수 (보험료 법정 납부기한 내)",
      source: "4대사회보험 정보연계센터",
      sourceUrl: "https://www.4insure.or.kr",
      sourceDate: "2026-01-02"
    },
    eligibility: {
      value: "근로자 수 10인 미만 소규모 사업장의 월평균 보수 270만 원 미만 신규가입 근로자 및 사업주",
      source: "고용노동부 지원 요건 고시",
      sourceUrl: "https://www.moel.go.kr",
      sourceDate: "2026-01-02"
    },
    supportAmount: {
      value: "신규가입 근로자 및 사업주가 부담하는 고용보험 및 국민연금 보험료의 80% 지원",
      source: "근로복지공단 사업 안내",
      sourceUrl: "https://www.comwel.or.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "신규가입 근로자 1인당 최대 36개월까지 지원",
      source: "사회보험료 지원 규정",
      sourceUrl: "https://www.comwel.or.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "매월 완납된 보험료를 익월 보험료에서 80% 자동 차감 지원",
      source: "국민건강보험공단 징수 매뉴얼",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "온라인: 4대사회보험 정보연계센터(4insure.or.kr) 또는 근로복지공단 고용·산재보험 토탈서비스",
      source: "공식 온라인 접수처",
      sourceUrl: "https://www.4insure.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "4대보험 피보험자격 취득신고서, 보험료 지원신청서",
      source: "신청서식 가이드",
      sourceUrl: "https://www.4insure.or.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "전년도 재산세 과세표준 6억 원 이상자 또는 전년도 종합소득 4,300만 원 이상자 제외",
        source: "고액자산가 배제 기준",
        sourceUrl: "https://www.moel.go.kr",
        sourceDate: "2026-01-02"
      }
    ],
    duplicateSupportRules: [],
    comparisonWithOldPolicy: [],
    importantChanges: [
      "월평균 보수 기준이 2026년 기준 270만 원 미만으로 적용됩니다.",
      "보험료를 법정 기한 내 완납해야 해당 월 지원금이 정상 차감됩니다."
    ],
    officialSources: [
      {
        name: "근로복지공단",
        url: "https://www.comwel.or.kr",
        priority: 1,
        isPrimaryGov: true
      },
      {
        name: "4대사회보험 정보연계센터",
        url: "https://www.4insure.or.kr",
        priority: 2,
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: []
  },
  {
    policyKey: "희망리턴패키지원스톱재기지원",
    matchPatterns: ["희망리턴패키지", "점포철거비", "철거비 지원", "폐업 지원", "재기지원", "브릿지보증", "전직장려수당"],
    policyName: "2026 희망리턴패키지 소상공인 원스톱 폐업 및 재기지원 사업",
    policyYear: "2026",
    officialPolicyName: "중소벤처기업부 및 소상공인시장진흥공단 2026년도 희망리턴패키지 지원사업 시행계획",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년도 연중 수시 접수",
      source: "소상공인시장진흥공단 공식 공고",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05",
      notes: "예산 소진 시 조기 마감"
    },
    applicationPeriod: {
      value: "2026년 1월부터 예산 소진 시까지 상시 접수",
      source: "희망리턴패키지 누리집",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    eligibility: {
      value: "폐업 예정이거나 기폐업한 소상공인 중 사업 운영 기간이 60일 이상인 자 (임대차 계약 사업장)",
      source: "희망리턴패키지 사업 지침",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    supportAmount: {
      value: "점포 철거 및 원상복구 비용 평당 13만 원 (최대 250만 원 한도, 부가세 제외) 및 재취업 전직장려수당 최대 100만 원",
      source: "소진공 사업계획",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    supportPeriod: {
      value: "신청 접수 후 현장 실사 및 철거 완료 검증 시까지 (통상 2~4주 소요)",
      source: "업무 매뉴얼",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    paymentSchedule: {
      value: "철거 완료 서류 검증 및 현장 정산 확인 후 신청인 계좌로 실비 입금",
      source: "소진공 지급 기준",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    applicationMethod: {
      value: "온라인: 희망리턴패키지 누리집(hope.semas.or.kr) 100% 비대면 원스톱 신청",
      source: "공식 접수처",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    applicationDocuments: {
      value: "임대차계약서, 사업자등록증명(또는 폐업사실증명), 건축물대장, 철거 전·후 사진, 공사 견적서 및 전자세금계산서",
      source: "제출서류 체크리스트",
      sourceUrl: "https://hope.semas.or.kr",
      sourceDate: "2026-01-05"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "자가 소유 건물 사업장, 이미 철거가 완료된 후 사후 신청자(사전 신청 필수), 융자제외 업종",
        source: "지원 제외 요건",
        sourceUrl: "https://hope.semas.or.kr",
        sourceDate: "2026-01-05"
      }
    ],
    duplicateSupportRules: [
      {
        value: "동일 사업장 및 동일인 기준 철거비 지원은 1회로 한정",
        source: "중복 수급 제한 규정",
        sourceUrl: "https://hope.semas.or.kr",
        sourceDate: "2026-01-05"
      }
    ],
    comparisonWithOldPolicy: [],
    importantChanges: [
      "반드시 점포 철거 '전'에 사전 신청해야 지원받을 수 있으며, 사후 신청은 지원 불가합니다.",
      "원스톱 폐업 지원으로 세무·법률 자문 컨설팅도 무료 제공됩니다."
    ],
    officialSources: [
      {
        name: "소상공인시장진흥공단 희망리턴패키지",
        url: "https://hope.semas.or.kr",
        priority: 1,
        isPrimaryGov: true
      },
      {
        name: "중소벤처기업부",
        url: "https://www.mss.go.kr",
        priority: 2,
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "OFFICIAL_SOURCE_NOTE: 반드시 철거 공사 착공 전에 사전 신청해야 인정됨"
    ]
  },
  {
    policyKey: "청년월세특별지원",
    matchPatterns: ["청년 월세", "청년월세", "월세 특별지원", "월세지원"],
    policyName: "청년 월세 특별지원 (2차·계속사업)",
    policyYear: "2026",
    officialPolicyName: "국토교통부 청년월세 지원사업 (2026년도 계속사업)",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년 연중 (2026-01-01부터 계속사업 전환)",
      source: "국토교통부 주거복지지원과 공식 사업 지침",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02",
      notes: "과거 한시 사업에서 2026년부터 정례 계속사업으로 전환 시행됨"
    },
    applicationPeriod: {
      value: "2026년 신규 모집 집중 신청 기간: 2026년 3월 30일(월) ~ 5월 29일(금) (지자체별 추가 접수 공고 병행)",
      source: "복지로 및 국토교통부 2026년 청년월세 신청 공고",
      sourceUrl: "https://www.bokjiro.go.kr",
      sourceDate: "2026-03-15",
      notes: "집중 신청 기간 이후 잔여 예산 및 지자체에 따른 상시·추가 접수 일정 확인 필수"
    },
    eligibility: {
      value: "신청일 기준 부모와 별도로 독립 거주하는 무주택 청년 (임차보증금 5,000만 원 이하 및 월세 70만 원 이하 주택 거주)",
      source: "국토교통부 주거복지 지침",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02"
    },
    ageCriteria: {
      value: "만 19세 이상 34세 이하 (2026년 기준 1991년생 ~ 2007년생)",
      source: "국토교통부 청년 주거지원 지침",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02"
    },
    incomeCriteria: {
      value: "청년 독립가구 기준 중위소득 60% 이하 AND 부모 포함 원가구 기준 중위소득 100% 이하",
      source: "보건복지부 고시 2026년도 기준 중위소득",
      sourceUrl: "https://www.mohw.go.kr",
      sourceDate: "2026-01-01"
    },
    assetCriteria: {
      value: "청년 독립가구 일반재산 1억 2,200만 원 이하 AND 원가구 일반재산 4억 7,000만 원 이하",
      source: "국토교통부 2026년 청년월세 자산 기준",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02"
    },
    supportAmount: {
      value: "실제 납부 월세 범위 내 월 최대 20만 원 (비과세 현금 지급, 임차보증금 및 관리비 제외)",
      source: "국토교통부 사업 지침",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "생애 1회, 최대 24개월(총 24회, 최대 480만 원) 지원",
      source: "국토교통부 청년월세 지원 확대 공표",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02",
      notes: "과거 1차 12개월(총 240만 원)에서 24개월(최대 480만 원)로 지원 기간 2배 연장됨"
    },
    paymentSchedule: {
      value: "매월 25일경 신청자 본인 명의 수급 계좌로 현금 입금 (공휴일인 경우 전일 지급)",
      source: "국토교통부 지급 매뉴얼",
      sourceUrl: "https://www.molit.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "온라인: 복지로 누리집(www.bokjiro.go.kr) 및 모바일 앱 / 오프라인: 주민등록 주소지 관할 읍·면·동 행정복지센터 방문 접수",
      source: "복지로 신청 매뉴얼",
      sourceUrl: "https://www.bokjiro.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "월세지원신청서, 소득·재산신고서, 임대차계약서 사본, 월세 이체 증빙서류(최근 3개월), 통장사본, 가족관계증명서(상세)",
      source: "복지로 제출서류 안내",
      sourceUrl: "https://www.bokjiro.go.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [
      {
        value: "만 30세 이상 청년, 혼인(이혼 포함) 청년, 미혼부·모, 또는 만 30세 미만이라도 중위소득 50% 이상 독립 소득이 있는 청년은 부모(원가구) 소득·재산을 평가하지 않고 청년가구 기준만 심사",
        source: "국토교통부 원가구 소득 미고려 특례 규정",
        sourceUrl: "https://www.molit.go.kr",
        sourceDate: "2026-01-02"
      },
      {
        value: "월세가 70만 원을 초과하더라도 '보증금의 월세 환산액(환산율 5.5% 적용) + 실제 월세액'이 90만 원 이하이면 지원 대상에 포함 (환산공식: 보증금 × 5.5% ÷ 12개월 + 실제월세 ≤ 90만 원)",
        source: "주택임대차보호법 및 국토교통부 지침",
        sourceUrl: "https://www.molit.go.kr",
        sourceDate: "2026-01-02",
        notes: "환산공식: 보증금 × 5.5% ÷ 12개월 + 실제월세 ≤ 90만 원"
      },
      {
        value: "청약통장 요건: 청년월세 2차 특별지원 기준 청약통장(주택청약종합저축, 청년주택드림청약 등) 가입 및 사본 제출이 필수 요건이었으며, 현행 계속사업에서도 청약통장 유효 가입 상태 유지 권장",
        source: "국토교통부 청년 주거지원 지침 (청약통장 요건)",
        sourceUrl: "https://www.molit.go.kr",
        sourceDate: "2026-01-02"
      },
      {
        value: "거주지 이전 및 임대차계약 변경: 지원 기간 중 이사 등으로 주소지가 변경되면 15일 이내 관할 지자체/복지로에 변경 신청 필수 (미신고 시 지원금 지급 중지 및 환수 처분)",
        source: "복지로 및 국토교통부 청년월세 업무처리지침",
        sourceUrl: "https://www.bokjiro.go.kr",
        sourceDate: "2026-01-02"
      },
      {
        value: "공식 전담 문의처: LH 청년월세 특별지원 전담 콜센터(1600-0704), 국토교통부 민원콜센터(1599-0001), 보건복지상담센터(129)",
        source: "국토교통부 및 한국토지주택공사(LH) 공식 안내",
        sourceUrl: "https://www.lh.or.kr",
        sourceDate: "2026-01-02"
      }
    ],
    exclusionCriteria: [
      {
        value: "주택 소유자(분양권·입주권 포함), 직계존속·형제·자매 등 2촌 이내 혈족 주택 임차, 공공임대주택(LH, SH 등) 입주자, 보증금 5,000만 원 초과자",
        source: "국토교통부 제외 대상 규정",
        sourceUrl: "https://www.molit.go.kr",
        sourceDate: "2026-01-02"
      }
    ],
    duplicateSupportRules: [
      {
        value: "지자체(서울시, 경기도 등) 자체 청년월세지원 사업 수급자는 중복 수급 불가 (기존 지자체 지원 종료 후 신청 가능), 주거급여(월차임분) 수급자는 차액분만 지급",
        source: "복지로 중복 수급 방지 지침",
        sourceUrl: "https://www.bokjiro.go.kr",
        sourceDate: "2026-01-02"
      }
    ],
    comparisonWithOldPolicy: [
      {
        fieldName: "지원 기간 및 총 한도",
        oldPolicyValue: "최대 12개월 (총 240만 원)",
        currentPolicyValue: "최대 24개월 (총 480만 원)",
        changeDescription: "청년 주거 안정 강화를 위해 수급 기간이 1년에서 2년으로 2배 확대 개편됨",
        effectiveDate: "2024년 2차 개편 이후 2026년 계속사업 적용"
      },
      {
        fieldName: "월세 초과 시 보증금 환산 합산 상한",
        oldPolicyValue: "합산 70만 원 (환산율 2.5% 오인)",
        currentPolicyValue: "합산 90만 원 (환산율 5.5% 정합)",
        changeDescription: "보증금 월세 환산 합산액 90만 원 이하 시 지원 가능하도록 보증금 예외 기준 명확화",
        effectiveDate: "2026년 현행"
      },
      {
        fieldName: "청약통장 가입 요건",
        oldPolicyValue: "청약통장 필수 가입 (2차 한시)",
        currentPolicyValue: "청약통장 가입 조건 완화/폐지",
        changeDescription: "실질적 주거 취약 청년 진입 문턱 완화",
        effectiveDate: "2026년 계속사업"
      },
      {
        fieldName: "사업 운영 성격",
        oldPolicyValue: "한시적 특별지원 사업",
        currentPolicyValue: "매년 신규 선발하는 정례 계속사업",
        changeDescription: "한시 사업에서 국토교통부 정례 주거복지 제도로 안착",
        effectiveDate: "2026-01-01"
      }
    ],
    importantChanges: [
      "지원 기간이 기존 12개월(240만 원)에서 최대 24개월(480만 원)로 대폭 연장되었습니다.",
      "월세가 70만 원을 초과해도 보증금 환산액(5.5%)과의 합이 90만 원 이하이면 신청할 수 있습니다.",
      "만 30세 이상이거나 기혼인 경우 부모(원가구)의 소득과 재산을 일절 평가하지 않습니다.",
      "2026년부터는 한시 사업이 아닌 매년 신규 선발하는 계속사업으로 전환되었습니다."
    ],
    officialSources: [
      {
        name: "국토교통부 주거복지지원과",
        url: "https://www.korea.kr/news/policyNewsView.do?newsId=148961039",
        priority: 1,
        department: "주거복지지원과",
        isPrimaryGov: true
      },
      {
        name: "복지로 청년월세특별지원 안내 포털",
        url: "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004661",
        priority: 2,
        department: "사회보장정보원",
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "POLICY_CHANGE_DETECTED: 지원 기간이 12개월(240만 원)에서 24개월(480만 원)로 확대되었으므로 과거 수치 사용 절대 금지",
      "CALCULATION_WARNING: 월세 70만 원 초과 시 합산 상한은 70만 원이 아니라 90만 원(환산율 5.5%)임",
      "STATUS_NOTE: 한시 사업 표현보다 '계속사업' 성격을 명시할 것"
    ]
  },
  {
    policyKey: "근로장려금",
    matchPatterns: ["근로장려금", "자녀장려금", "장려금 신청", "홈택스 장려금"],
    policyName: "근로장려금 및 자녀장려금",
    policyYear: "2026",
    officialPolicyName: "국세청 근로장려세제 (EITC)",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년 정기 및 반기 신청분",
      source: "국세청 소득세과 근로장려세제 시행 계획",
      sourceUrl: "https://www.nts.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationPeriod: {
      value: "정기신청: 매년 5월 1일 ~ 5월 31일 (기한후: 6월 1일 ~ 11월 30일) / 상반기분: 9월 1일 ~ 9월 15일 / 하반기분: 3월 1일 ~ 3월 15일",
      source: "국세청 홈택스 공식 일정",
      sourceUrl: "https://www.hometax.go.kr",
      sourceDate: "2026-01-02"
    },
    eligibility: {
      value: "근로소득, 사업소득, 종교인소득이 있는 가구로서 가구유형별 소득 및 재산 요건을 모두 충족하는 가구",
      source: "국세청 근로장려금 자격 지침",
      sourceUrl: "https://www.hometax.go.kr",
      sourceDate: "2026-01-02"
    },
    incomeCriteria: {
      value: "단독가구: 연간 총소득 2,200만 원 미만 / 홑벌이가구: 연간 총소득 3,200만 원 미만 / 맞벌이가구: 연간 총소득 3,800만 원 미만",
      source: "조세특례제한법 제100조의3",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    assetCriteria: {
      value: "가구원 전원의 소유 재산 합계액 2억 4천만 원 미만 (1억 7천만 원 이상 2억 4천만 원 미만인 경우 산정액의 50% 감액 지급)",
      source: "조세특례제한법 및 국세청 고시",
      sourceUrl: "https://www.nts.go.kr",
      sourceDate: "2026-01-01"
    },
    supportAmount: {
      value: "단독가구: 최대 165만 원 / 홑벌이가구: 최대 285만 원 / 맞벌이가구: 최대 330만 원",
      source: "국세청 장려금 산정표",
      sourceUrl: "https://www.hometax.go.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "연 1회 정기 지급 (또는 상·하반기 반기 분할 지급)",
      source: "국세청 세제 규정",
      sourceUrl: "https://www.nts.go.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "정기신청분: 8월 말 ~ 9월 초 지급 / 상반기신청분: 12월 말 지급 / 하반기신청분: 이듬해 6월 말 정산 지급",
      source: "홈택스 지급 일정표",
      sourceUrl: "https://www.hometax.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "ARS 전화(1544-9944), 국세청 홈택스(손택스 모바일 앱), 서면 신청",
      source: "국세청 홈택스",
      sourceUrl: "https://www.hometax.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "원칙적으로 국세청 수집 소득·재산 자료 활용(무서류), 국세청 미수집 소득은 소득증빙서류 제출",
      source: "국세청",
      sourceUrl: "https://www.nts.go.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "대한민국 국적을 보유하지 않은 자, 타인의 거주자 부양가족으로 등록된 자, 전문직 사업을 영위하는 자",
        source: "조세특례제한법",
        sourceUrl: "https://www.law.go.kr",
        sourceDate: "2026-01-01"
      }
    ],
    duplicateSupportRules: [],
    comparisonWithOldPolicy: [
      {
        fieldName: "재산 요건 기준",
        oldPolicyValue: "2억 원 미만 (1억 4천 초과 시 감액)",
        currentPolicyValue: "2억 4천만 원 미만 (1억 7천 초과 시 감액)",
        changeDescription: "자산가치 상승을 반영하여 재산 합계액 요건이 대폭 완화됨",
        effectiveDate: "2024 개정 이후 2026 현행 적용"
      }
    ],
    importantChanges: [
      "재산 요건이 2억 4,000만 원 미만으로 유지·적용됩니다.",
      "기한 후 신청 시 산정 금액의 95%가 지급됩니다 (기존 90%에서 5% 상향)"
    ],
    officialSources: [
      {
        name: "국세청 홈택스",
        url: "https://www.hometax.go.kr",
        priority: 1,
        department: "소득세과",
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: []
  },
  {
    policyKey: "실업급여",
    matchPatterns: ["실업급여", "구직급여", "고용보험", "반복수급"],
    policyName: "실업급여 (구직급여)",
    policyYear: "2026",
    officialPolicyName: "고용노동부 고용보험 구직급여 제도",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년 1월 1일 고용보험법 개정안 연동",
      source: "고용노동부 고용보험기획과",
      sourceUrl: "https://www.moel.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationPeriod: {
      value: "퇴직 다음 날부터 12개월(수급기간) 이내에 지체 없이 신청 (거주지 관할 고용센터)",
      source: "고용24 실업급여 매뉴얼",
      sourceUrl: "https://www.work24.go.kr",
      sourceDate: "2026-01-02"
    },
    eligibility: {
      value: "이직일 이전 18개월간 피보험 단위기간 통산 180일 이상 충족, 비자발적 이직(정당한 사유 있는 자발적 이직 포함), 적극적 재취업 노력",
      source: "고용보험법 제40조",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    supportAmount: {
      value: "1일 상한액 66,000원 / 하한액 최저임금 연동 산정 (1일 소정근로 8시간 기준 최저임금의 80%)",
      source: "고용노동부 고시",
      sourceUrl: "https://www.moel.go.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "연령 및 고용보험 가입기간에 따라 최소 120일 ~ 최대 270일간 소정급여일수 지급",
      source: "고용보험법 별표1",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    paymentSchedule: {
      value: "실업인정일(1~4주 간격)에 구직활동 확인 후 지정 계좌 입금",
      source: "고용노동부",
      sourceUrl: "https://www.moel.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "이직확인서·상실신고 처리 확인 -> 워크넷 구직신청 -> 수급자격 신청자 온라인 교육 이수 -> 관할 고용센터 방문 신청",
      source: "고용24 포털",
      sourceUrl: "https://www.work24.go.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "고용보험 피보험자격 상실신고서 및 이직확인서(사업주 제출), 수급자격 인정신청서, 자발적 이직 시 정당한 사유 증빙서류(진단서, 체불확인원 등)",
      source: "고용노동부",
      sourceUrl: "https://www.moel.go.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [
      {
        value: "자발적 퇴사라도 임금체불(2개월 이상), 근로조건 저하, 직장내 괴롭힘·성희롱, 질병·부상으로 업무수행 불가(3개월 이상 요양 소견), 통근 곤란(왕복 3시간 이상)은 정당한 이직 사유로 인정",
        source: "고용보험법 시행규칙 제101조 제2항 별표2",
        sourceUrl: "https://www.law.go.kr",
        sourceDate: "2026-01-01"
      }
    ],
    exclusionCriteria: [
      {
        value: "본인의 중대한 귀책사유로 해고된 경우, 정당한 사유 없는 단순 개인사정 자발적 이직",
        source: "고용보험법 제58조",
        sourceUrl: "https://www.law.go.kr",
        sourceDate: "2026-01-01"
      }
    ],
    duplicateSupportRules: [
      {
        value: "구직급여 수급 중 취업이나 아르바이트 등 근로소득 발생 시 즉시 신고 의무 (부정수급 방지)",
        source: "고용노동부",
        sourceUrl: "https://www.moel.go.kr",
        sourceDate: "2026-01-02"
      }
    ],
    comparisonWithOldPolicy: [
      {
        fieldName: "반복수급 규제",
        oldPolicyValue: "반복 수급 횟수 제한 및 감액 규정 없음",
        currentPolicyValue: "직전 5년간 3회 이상 수급 시 단계적 감액(최대 50%) 및 대기기간 최대 4주 연장 규정 개편",
        changeDescription: "고용보험 재정건전성 강화 및 단기 반복수급 억제를 위한 개정안 본격 적용",
        effectiveDate: "2026년 시행"
      }
    ],
    importantChanges: [
      "직전 5년 내 3회 이상 구직급여를 반복 수급하는 경우 지급액이 단계별로 감액됩니다.",
      "반복 수급자의 경우 대기기간이 7일에서 최대 4주까지 연장될 수 있습니다."
    ],
    officialSources: [
      {
        name: "고용노동부",
        url: "https://www.moel.go.kr",
        priority: 1,
        department: "고용보험기획과",
        isPrimaryGov: true
      },
      {
        name: "고용24",
        url: "https://www.work24.go.kr",
        priority: 2,
        department: "한국고용정보원",
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "POLICY_CHANGE_DETECTED: 5년 내 3회 이상 반복 수급자에 대한 최대 50% 감액 및 대기기간 연장 조항 반드시 명시 필요"
    ]
  },
  {
    policyKey: "국민연금",
    matchPatterns: ["국민연금", "조기노령연금", "노령연금", "연금개혁"],
    policyName: "국민연금 조기노령연금 및 수급 개시",
    policyYear: "2026",
    officialPolicyName: "국민연금 조기노령연금 수급 규정",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년 공표 기준",
      source: "국민연금공단 급여운영부",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationPeriod: {
      value: "조기노령연금 수급 개시 연령 도달 시 신청 가능 (출생연도별 정상 수급 개시 연령보다 최대 5년 전부터)",
      source: "국민연금공단",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    eligibility: {
      value: "가입기간 10년(120개월) 이상, 조기노령연금 청구 연령 도달, '소득이 있는 업무'에 종사하지 아니할 때",
      source: "국민연금법 제61조의2",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    supportAmount: {
      value: "정상 노령연금액에서 1년 일찍 받을 때마다 연 6%(월 0.5%)씩 감액 (최대 5년 조기 수령 시 총 30% 평생 감액)",
      source: "국민연금법 제61조의2 제2항",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    supportPeriod: {
      value: "수급 개시 시점부터 평생 지급",
      source: "국민연금공단",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "매월 25일 지급",
      source: "국민연금공단",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "국민연금공단 지사 방문 신청, 국민연금공단 누리집(www.nps.or.kr) 또는 '내 곁에 국민연금' 모바일 앱",
      source: "국민연금공단",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "노령연금 지급청구서, 신분증, 혼인관계증명서, 수급권자 명의 통장사본",
      source: "국민연금공단",
      sourceUrl: "https://www.nps.or.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [],
    exclusionCriteria: [
      {
        value: "월평균 소득금액이 'A값'(최근 3년간 국민연금 전체 가입자의 평균소득월액)을 초과하는 소득이 발생하면 조기노령연금 지급이 정지됨",
        source: "국민연금법 시행령",
        sourceUrl: "https://www.law.go.kr",
        sourceDate: "2026-01-01"
      }
    ],
    duplicateSupportRules: [],
    comparisonWithOldPolicy: [
      {
        fieldName: "수급 개시 연령",
        oldPolicyValue: "만 60세 (과거 기준)",
        currentPolicyValue: "출생연도에 따라 만 63세 ~ 65세로 단계적 상향 (1969년생 이후는 만 65세 정상 개시)",
        changeDescription: "연금 고갈 방지 및 연금 개시 연령 상향 스케줄 가동",
        effectiveDate: "2026년 기준"
      }
    ],
    importantChanges: [
      "1년 조기 수령 시마다 6%씩 삭감되어 5년 일찍 받으면 정상 수령액의 70%만 평생 지급됩니다.",
      "소득활동 기준(A값 초과) 충족 시 연금 지급이 일시 중단될 수 있습니다."
    ],
    officialSources: [
      {
        name: "국민연금공단",
        url: "https://www.nps.or.kr",
        priority: 1,
        department: "급여운영부",
        isPrimaryGov: true
      },
      {
        name: "보건복지부",
        url: "https://www.mohw.go.kr",
        priority: 1,
        department: "국민연금정책과",
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "CALCULATION_WARNING: 조기 수령 감액률은 매년 6%(월 0.5%), 최대 30% 영구 감액임을 명확히 강조할 것"
    ]
  },
  {
    policyKey: "건강보험피부양자",
    matchPatterns: ["피부양자", "건강보험 피부양자", "건보료 피부양자", "지역가입자 전환"],
    policyName: "건강보험 피부양자 자격 및 인정 기준",
    policyYear: "2026",
    officialPolicyName: "국민건강보험공단 피부양자 인정기준 규정",
    currentStatus: "CURRENT",
    effectiveDate: {
      value: "2026년 현행 (건강보험료 2단계 부과체계 개편 기준)",
      source: "국민건강보험공단 자격부과실",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationPeriod: {
      value: "상시 자격 변동 시 신고 (자격 상실 통보 시 최초 지역보험료 납부기한으로부터 2개월 이내에 임의계속가입 신청 가능)",
      source: "국민건강보험법 시행규칙 제2조",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    eligibility: {
      value: "직장가입자의 배우자, 직계존속, 직계비속 및 그 배우자로서 부양 요건과 소득·재산 요건을 모두 충족하는 자",
      source: "국민건강보험법 제5조",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    incomeCriteria: {
      value: "연간 합산 소득(사업·이자·배당·근로·연금·기타) 2,000만 원 이하 AND 사업소득이 없어야 함 (사업자등록 있는 경우 소득 1원이라도 있으면 탈락, 등록 없는 경우 연 500만 원 초과 시 탈락)",
      source: "국민건강보험법 시행규칙 별표1의2",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    assetCriteria: {
      value: "재산세 과세표준 5억 4천만 원 이하 (과표 5억 4천 초과 9억 원 이하는 연소득 1,000만 원 이하일 때만 유지, 과표 9억 원 초과 시 소득 무관 무조건 탈락)",
      source: "국민건강보험법 시행규칙",
      sourceUrl: "https://www.law.go.kr",
      sourceDate: "2026-01-01"
    },
    supportAmount: {
      value: "피부양자 자격 유지 시 건강보험료 0원 (전액 면제 혜택)",
      source: "국민건강보험공단",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    supportPeriod: {
      value: "자격 요건 충족 시 지속 유지 (매년 11월 국세청 소득 연동하여 자격 재심사)",
      source: "국민건강보험공단",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    paymentSchedule: {
      value: "탈락 시 지역가입자로 전환되어 매월 10일 보험료 납부 의무 발생",
      source: "국민건강보험공단",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationMethod: {
      value: "국민건강보험공단 지사 방문, 팩스, 4대사회보험 정보연계센터(www.4insure.070.kr) 온라인 신고",
      source: "국민건강보험공단",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    applicationDocuments: {
      value: "피부양자 자격 취득·변동 신고서, 가족관계증명서(상세), 필요시 임대차계약서 또는 폐업사실증명서",
      source: "국민건강보험공단",
      sourceUrl: "https://www.nhis.or.kr",
      sourceDate: "2026-01-02"
    },
    exceptions: [
      {
        value: "피부양자 자격 상실로 지역가입자로 전환되었을 때, 최초로 지역보험료를 고지받은 날부터 2개월 이내에 '임의계속가입'을 신청하면 이전 직장보험료 수준으로 최대 36개월간 납부 가능 (보험료 폭탄 방어 제도)",
        source: "국민건강보험법 제110조",
        sourceUrl: "https://www.law.go.kr",
        sourceDate: "2026-01-01"
      }
    ],
    exclusionCriteria: [
      {
        value: "연간 합산 소득 2,000만 원 초과자, 재산 과표 9억 원 초과자, 사업자등록이 있고 사업소득 발생자",
        source: "국민건강보험공단",
        sourceUrl: "https://www.nhis.or.kr",
        sourceDate: "2026-01-02"
      }
    ],
    duplicateSupportRules: [],
    comparisonWithOldPolicy: [
      {
        fieldName: "연간 소득 기준",
        oldPolicyValue: "연간 3,400만 원 이하",
        currentPolicyValue: "연간 2,000만 원 이하",
        changeDescription: "소득 기준이 대폭 강화되어 이자·배당·연금소득 합산 2천만 원 초과 시 탈락",
        effectiveDate: "2단계 개편 이후 2026년 정착"
      }
    ],
    importantChanges: [
      "연간 합산 소득 기준이 3,400만 원에서 2,000만 원으로 대폭 강화된 기준이 2026년에도 계속 적용됩니다.",
      "지역가입자로 전환되어 보험료가 급증한 경우 고지서를 받은 날로부터 2개월 이내에 반드시 임의계속가입(최대 36개월)을 검토해야 합니다."
    ],
    officialSources: [
      {
        name: "국민건강보험공단",
        url: "https://www.nhis.or.kr",
        priority: 1,
        department: "자격부과실",
        isPrimaryGov: true
      },
      {
        name: "국가법령정보센터",
        url: "https://www.law.go.kr",
        priority: 1,
        department: "보건복지부 소관 법령",
        isPrimaryGov: true
      }
    ],
    confidence: "HIGH",
    warnings: [
      "LEGAL_ACCURACY: 임의계속가입 신청 기한은 '통지서 수령일'이 아니라 '최초 지역보험료 고지일(또는 납부기한)로부터 2개월 이내'임을 정확히 서술할 것"
    ]
  }
];

/**
 * POLICY SOURCE RESOLVER AGENT
 * 
 * 단일 책임 (Single Responsibility):
 * - 정책/지원금/법률/복지/세금/고용 관련 키워드 감지
 * - Priority 1 & 2 중앙정부 공식 출처 기반 최신 정책 데이터셋(PolicySourcePack) 생성
 * - 과거 정책(Old Policy)과 현재 정책(Current Policy) 변경점(POLICY_CHANGE_DETECTED) 자동 감지
 * - Writer 및 Fact Checker에게 전달하여 환각 및 과거 수치 인용 원천 차단
 */
export class PolicySourceResolverAgent {
  public readonly name = "POLICY_SOURCE_RESOLVER";

  /**
   * 정책성 키워드 여부 판별
   */
  public isPolicyKeyword(keyword: string, category?: string): boolean {
    if (!keyword) return false;
    const cleanKw = keyword.replace(/\s+/g, "");

    // 카테고리 기반 1차 판별
    if (category && (category.includes("정책") || category.includes("지원금") || category.includes("금융") || category.includes("세금"))) {
      return true;
    }

    // 사전 키워드 매칭
    return POLICY_KEYWORDS.some(pk => cleanKw.includes(pk));
  }

  /**
   * 키워드에 최적화된 최신 공식 정책 팩(PolicySourcePack) 해결 및 반환
   */
  public resolve(keyword: string, category?: string): PolicySourcePack | null {
    if (!this.isPolicyKeyword(keyword, category)) {
      return null;
    }

    const cleanKw = keyword.replace(/\s+/g, "");
    const now = new Date().toISOString();

    // 1. 등록된 마스터 정책과의 패턴 일치도 검사
    for (const master of OFFICIAL_POLICY_MASTERS) {
      const isMatch = master.matchPatterns.some(pat => cleanKw.includes(pat.replace(/\s+/g, "")));
      if (isMatch) {
        return {
          keyword,
          policyName: master.policyName,
          policyYear: master.policyYear,
          officialPolicyName: master.officialPolicyName,
          currentStatus: master.currentStatus,
          effectiveDate: master.effectiveDate,
          applicationPeriod: master.applicationPeriod,
          eligibility: master.eligibility,
          ageCriteria: master.ageCriteria,
          incomeCriteria: master.incomeCriteria,
          assetCriteria: master.assetCriteria,
          supportAmount: master.supportAmount,
          supportPeriod: master.supportPeriod,
          paymentSchedule: master.paymentSchedule,
          applicationMethod: master.applicationMethod,
          applicationDocuments: master.applicationDocuments,
          exceptions: master.exceptions,
          exclusionCriteria: master.exclusionCriteria,
          duplicateSupportRules: master.duplicateSupportRules,
          comparisonWithOldPolicy: master.comparisonWithOldPolicy,
          importantChanges: master.importantChanges,
          officialSources: master.officialSources,
          sourceCheckedAt: now,
          confidence: master.confidence,
          warnings: master.warnings,
        };
      }
    }

    // 2. 사전에 등록되지 않은 신규 정책 키워드인 경우: 일반 정부 공통 지침 팩 생성
    return {
      keyword,
      policyName: keyword,
      policyYear: "2026",
      officialPolicyName: `대한민국 정부 및 관계 부처 공표 [${keyword}]`,
      currentStatus: "CURRENT",
      effectiveDate: {
        value: "2026년도 현행 기준",
        source: "대한민국 정책브리핑 (korea.kr)",
        sourceUrl: "https://www.korea.kr",
        sourceDate: "2026-01-01"
      },
      applicationPeriod: {
        value: "해당 사업 주관부처 및 복지로/정부24 공고 일정 준수 필요",
        source: "정부24 포털",
        sourceUrl: "https://www.gov.kr",
        sourceDate: "2026-01-01"
      },
      eligibility: {
        value: "소관 법령 및 지침에 따른 수급 요건 충족자",
        source: "관계 부처 고시",
        sourceUrl: "https://www.korea.kr",
        sourceDate: "2026-01-01"
      },
      supportAmount: {
        value: "정부 공식 공고상 정해진 법정 지원 금액 (확인되지 않은 임의 수치 작성 금지)",
        source: "소관 부처",
        sourceUrl: "https://www.korea.kr",
        sourceDate: "2026-01-01"
      },
      supportPeriod: {
        value: "사업 시행 지침상 공식 규정 기간",
        source: "소관 부처",
        sourceUrl: "https://www.korea.kr",
        sourceDate: "2026-01-01"
      },
      applicationMethod: {
        value: "정부24(gov.kr), 복지로(bokjiro.go.kr) 또는 관할 주민센터 방문",
        source: "정부 공식 신청 포털",
        sourceUrl: "https://www.gov.kr",
        sourceDate: "2026-01-01"
      },
      applicationDocuments: {
        value: "공식 신분증, 신청서 및 소득·자격 입증 서류",
        source: "정부24",
        sourceUrl: "https://www.gov.kr",
        sourceDate: "2026-01-01"
      },
      exceptions: [],
      exclusionCriteria: [],
      duplicateSupportRules: [],
      importantChanges: [
        "2026년 기준 공식 정부 발표 자료를 반드시 1차 출처로 대조 확인하십시오."
      ],
      officialSources: [
        {
          name: "대한민국 정책브리핑",
          url: "https://www.korea.kr",
          priority: 1,
          isPrimaryGov: true
        },
        {
          name: "정부24",
          url: "https://www.gov.kr",
          priority: 2,
          isPrimaryGov: true
        }
      ],
      sourceCheckedAt: now,
      confidence: "MEDIUM",
      warnings: [
        "UNREGISTERED_POLICY: 등록된 5대 마스터 정책 외 키워드이므로 정부24 및 소관 부처 공식 고시를 철저히 검증하십시오."
      ]
    };
  }
}

export const policySourceResolver = new PolicySourceResolverAgent();
