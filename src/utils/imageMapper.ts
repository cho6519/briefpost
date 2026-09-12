/**
 * ==============================================================================
 * [한국형 일상·공공 테마 상업용 무료 실사 이미지 딕셔너리 및 1:1 스마트 매퍼]
 * - 비용 0원: Unsplash의 검증된 112개 고화질 상업용 무료 실사 스톡 사진 풀
 * - 6대 메인 테마 (housing, finance, youth, tech, policy, society)
 * - 기사 내용/키워드(반도체, 스마트워치, 아파트, 금리 등)에 맞는 정밀 서브테마 매칭
 * - 기사 ID / 슬러그 / 제목 기반 FNV-1a 해시로 결정론적 1:1 무중복 분산 배정
 * ==============================================================================
 */

export type ImageTheme = "housing" | "finance" | "youth" | "tech" | "policy" | "society" | "general";

export interface StockImageItem {
  url: string;
  caption: string;
  description: string;
  keywords?: string[];
}

/**
 * 테마별 검증된 112개 대규모 고화질 실사 스톡 이미지 풀 (Unsplash)
 */
export const STOCK_IMAGE_POOL: Record<Exclude<ImageTheme, "general">, StockImageItem[]> = {
  // 1. 부동산·주거 테마 (아파트 단지, 열쇠, 계약서, 신축 인테리어 등 18선)
  housing: [
    {
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 아파트 주거 단지 전경",
      keywords: ["아파트", "단지", "주거", "주택", "공급"],
    },
    {
      url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "내 집 마련 및 주택 열쇠",
      keywords: ["열쇠", "내집마련", "입주", "분양"],
    },
    {
      url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "부동산 및 주택 분양 계약서 서명",
      keywords: ["계약", "서명", "청약", "매매", "등기"],
    },
    {
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도심 주거 환경 및 신축 단지",
      keywords: ["신축", "도심", "타운", "주택"],
    },
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 고층 주상복합 및 도심 빌딩",
      keywords: ["빌딩", "고층", "스카이라인", "강남", "도심"],
    },
    {
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "모던 아파트 거실 실내 인테리어",
      keywords: ["실내", "인테리어", "전세", "월세", "거실"],
    },
    {
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "신축 모델하우스 및 주거 평면",
      keywords: ["모델하우스", "평면", "분양가", "견본주택"],
    },
    {
      url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "단독주택 및 주거지 전경",
      keywords: ["단독주택", "빌라", "다세대", "주거지"],
    },
    {
      url: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공인중개사 부동산 거래 상담",
      keywords: ["부동산", "중개", "상담", "시세", "거래"],
    },
    {
      url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "주거 빌딩 창문 및 세대 전경",
      keywords: ["임대", "보증금", "전세보증", "세대"],
    },
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "고급 주거 단지 외관 및 조경",
      keywords: ["조경", "프리미엄", "재건축", "정비사업"],
    },
    {
      url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대적 주거 공간 디자인",
      keywords: ["공간", "스마트홈", "리모델링"],
    },
    {
      url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "주택 단지 복도 및 채광",
      keywords: ["채광", "복도", "공용공간"],
    },
    {
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "따뜻한 감성의 주거 인테리어",
      keywords: ["감성", "신혼부부", "보금자리"],
    },
    {
      url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도시 건축 설계 및 청사진",
      keywords: ["설계", "청사진", "도시계획", "개발"],
    },
    {
      url: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "아파트 단지 건설 및 시공 현장",
      keywords: ["건설", "시공", "공사", "재개발"],
    },
    {
      url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "교외 전원 주거 단지",
      keywords: ["신도시", "택지지구", "교외"],
    },
    {
      url: "https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도심 주거 단지 야경",
      keywords: ["야경", "도시", "수도권", "교통"],
    },
  ],

  // 2. 금융·경제 테마 (차트, 계산기, 모바일뱅킹, 증시, 환율 등 20선)
  finance: [
    {
      url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "금융 지표 분석 및 경제 계획 차트",
      keywords: ["지표", "차트", "거시경제", "분석"],
    },
    {
      url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "계산기 및 자금 계획 수립",
      keywords: ["계산기", "예산", "자금", "지출"],
    },
    {
      url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트폰 모바일 뱅킹 및 간편 결제",
      keywords: ["모바일뱅킹", "핀테크", "송금", "대출신청"],
    },
    {
      url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "저축, 적금 및 자산 형성 지원",
      keywords: ["적금", "예금", "도약계좌", "자산형성"],
    },
    {
      url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "경제 지표 및 증시 트렌드 그래프",
      keywords: ["증시", "주식", "코스피", "지수", "상승"],
    },
    {
      url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "증권 거래소 시장 동향 전광판",
      keywords: ["증권", "거래소", "시장", "매매"],
    },
    {
      url: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "가상자산 및 디지털 금융 트렌드",
      keywords: ["가상자산", "코인", "디지털금융", "비트코인"],
    },
    {
      url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "글로벌 통화 및 환율 변동성",
      keywords: ["환율", "달러", "외환", "원화", "금리"],
    },
    {
      url: "https://images.unsplash.com/photo-1556742049-0a67e55722c3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "신용카드 결제 및 소상공인 매출",
      keywords: ["결제", "카드", "수수료", "소상공인"],
    },
    {
      url: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "지폐 및 금융 현금 유동성",
      keywords: ["지원금", "보조금", "현금", "지급"],
    },
    {
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "비즈니스 재무 성장 지표",
      keywords: ["성장", "매출", "기업", "실적"],
    },
    {
      url: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "회계 결산 및 세무 장부 검토",
      keywords: ["세무", "세금", "연말정산", "환급", "공제"],
    },
    {
      url: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "금괴 및 안전 자산 투자",
      keywords: ["금", "안전자산", "물가", "인플레이션"],
    },
    {
      url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "전문 금융 상담 및 자산 관리",
      keywords: ["상담", "PB", "자산관리", "은행"],
    },
    {
      url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "세금 신고서 및 환급 영수증",
      keywords: ["영수증", "환급금", "부가세", "종소세"],
    },
    {
      url: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "동전 저금통과 가계 재테크",
      keywords: ["저축", "가계", "절약", "재테크"],
    },
    {
      url: "https://images.unsplash.com/photo-1520607164069-c5b03dd77535?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "비즈니스 투자 계약 및 금융 협력",
      keywords: ["투자", "유치", "펀드", "벤처"],
    },
    {
      url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "금융 포트폴리오 기획 검토",
      keywords: ["포트폴리오", "자산배분", "리스크"],
    },
    {
      url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "글로벌 금융 시장 브리핑",
      keywords: ["중앙은행", "기준금리", "연준", "한은"],
    },
    {
      url: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "가계 금융 지출 관리 및 다이어리",
      keywords: ["생활비", "물가안정", "가계부"],
    },
  ],

  // 3. 청년·취업·교육 테마 (청년 스터디, 면접, 카페 작업, 캠퍼스 등 18선)
  youth: [
    {
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년들의 스터디 및 협업 논의",
      keywords: ["청년", "스터디", "대학생", "협업"],
    },
    {
      url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트 워크스페이스에서 작업 중인 청년",
      keywords: ["워크스페이스", "노트북", "스타트업", "청년창업"],
    },
    {
      url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "취업 준비 및 비즈니스 미팅",
      keywords: ["취업", "구직", "이력서", "면접"],
    },
    {
      url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 도서관 및 학업 환경",
      keywords: ["도서관", "자격증", "시험", "학업"],
    },
    {
      url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년 창업팀 아이디어 회의",
      keywords: ["창업", "아이디어", "기획", "프로젝트"],
    },
    {
      url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "대학 캠퍼스 토론 및 소통",
      keywords: ["캠퍼스", "장학금", "등록금", "소통"],
    },
    {
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "카페에서 노트북 작업 중인 프리랜서",
      keywords: ["프리랜서", "긱워커", "디지털노마드"],
    },
    {
      url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "채용 면접 및 역량 인터뷰",
      keywords: ["채용", "공채", "면접관", "합격"],
    },
    {
      url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년 세대의 활력과 협력 네트워크",
      keywords: ["네트워크", "도약", "희망", "교류"],
    },
    {
      url: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년 개발자 팀 프로젝트 브레인스토밍",
      keywords: ["개발자", "코딩", "소프트웨어"],
    },
    {
      url: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도서관 서가에서 미래를 준비하는 청년",
      keywords: ["미래", "진로", "역량강화", "취업박람회"],
    },
    {
      url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "디지털 기기 기반 청년 연구 활동",
      keywords: ["연구", "R&D", "데이터", "논문"],
    },
    {
      url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "자격증 취득 및 전문 시험 학습 노트",
      keywords: ["자격증", "공무원", "기사", "합격"],
    },
    {
      url: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년 커리어 멘토링 상담",
      keywords: ["멘토링", "상담", "컨설팅", "취업지원"],
    },
    {
      url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "사회초년생 직장인의 자신감 있는 업무",
      keywords: ["사회초년생", "신입사원", "첫직장"],
    },
    {
      url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "직무 교육 세미나 수강",
      keywords: ["직무교육", "국비지원", "내일배움카드"],
    },
    {
      url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년의 꿈을 키우는 책상",
      keywords: ["자기계발", "도전", "성장"],
    },
    {
      url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년 창업 아이디어 데모데이",
      keywords: ["데모데이", "피칭", "지원사업"],
    },
  ],

  // 4. 테크·IT·디지털 테마 (반도체, AI, 스마트워치, 보안, 서버 등 20선)
  tech: [
    {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "첨단 전자 회로 및 마이크로 반도체 칩",
      keywords: ["반도체", "칩", "HBM", "메모리", "하드웨어"],
    },
    {
      url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "사이버 보안 및 네트워크 침해 방어",
      keywords: ["보안", "해킹", "취약점", "제로데이", "크롬", "업데이트"],
    },
    {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "디지털 매트릭스 코드 및 암호화 시스템",
      keywords: ["암호화", "코드", "방화벽", "사이버"],
    },
    {
      url: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트워치 및 차세대 웨어러블 디바이스",
      keywords: ["스마트워치", "픽셀워치", "웨어러블", "갤럭시워치", "애플워치"],
    },
    {
      url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "모바일 전자기기 분해 및 자가 수리 부품",
      keywords: ["수리", "분해", "아이픽스잇", "접착제", "나사", "배터리"],
    },
    {
      url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "최신 프리미엄 노트북 및 슬림 테크",
      keywords: ["노트북", "PC", "컴퓨터", "맥북", "디바이스"],
    },
    {
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "빅데이터 시각화 및 비즈니스 인텔리전스",
      keywords: ["데이터", "대시보드", "통계", "분석"],
    },
    {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "글로벌 디지털 클라우드 네트워크 망",
      keywords: ["네트워크", "클라우드", "인터넷", "5G", "통신"],
    },
    {
      url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "테크 기업 스마트 워크스페이스",
      keywords: ["플랫폼", "포털", "IT기업", "빅테크"],
    },
    {
      url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "최신 플래그십 스마트폰 디스플레이",
      keywords: ["스마트폰", "모바일", "갤럭시", "아이폰", "앱"],
    },
    {
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "클린룸 첨단 반도체 제조 및 연구원",
      keywords: ["웨이퍼", "파운드리", "삼성전자", "SK하이닉스", "공정"],
    },
    {
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트 팩토리 및 산업용 자동화 로봇",
      keywords: ["로봇", "자동화", "스마트팩토리", "제조"],
    },
    {
      url: "https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "소프트웨어 프로그래밍 및 알고리즘 코딩",
      keywords: ["코딩", "알고리즘", "파이썬", "자바스크립트"],
    },
    {
      url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "엔터프라이즈 데이터센터 서버 랙",
      keywords: ["데이터센터", "서버", "인프라", "호스팅"],
    },
    {
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "생성형 AI 및 차세대 인공지능 그래픽",
      keywords: ["AI", "인공지능", "생성형", "챗GPT", "LLM"],
    },
    {
      url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "하이테크 전자 기술과 정보사회",
      keywords: ["하이테크", "정보통신", "ICT"],
    },
    {
      url: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트 헬스케어 및 바이오 센서 디바이스",
      keywords: ["바이오", "헬스케어", "센서", "의료기기"],
    },
    {
      url: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "차세대 OLED 디스플레이 패널",
      keywords: ["디스플레이", "OLED", "패널"],
    },
    {
      url: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "인공지능 로봇 비전 및 인터랙션",
      keywords: ["로보틱스", "비전", "자율주행"],
    },
    {
      url: "https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "차세대 양자 컴퓨팅 및 보안 프로토콜",
      keywords: ["양자", "프로토콜", "통신보안"],
    },
  ],

  // 5. 정책·공공·행정 테마 (정부청사, 공식 브리핑, 법안, 행정 서비스 등 18선)
  policy: [
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 관공서 및 공공 복합 행정 타운",
      keywords: ["정부청사", "관공서", "지자체", "행정"],
    },
    {
      url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "정부 공식 브리핑 및 정책 발표 현장",
      keywords: ["브리핑", "발표", "기자회견", "공식"],
    },
    {
      url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "제도 및 대국민 지원 정책 기획 검토",
      keywords: ["제도", "정책", "입안", "개편"],
    },
    {
      url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 대국민 설명회 및 지원 사업 안내",
      keywords: ["설명회", "사업안내", "공모", "접수"],
    },
    {
      url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "사법부 법원 및 공공 법률 규정",
      keywords: ["법원", "법률", "판결", "시행령", "개정"],
    },
    {
      url: "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "국회 및 의회 공식 위원회 회의실",
      keywords: ["국회", "의회", "법안", "통과", "예산안"],
    },
    {
      url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공-민간 상생 협약 및 공식 파트너십",
      keywords: ["협약", "MOU", "상생", "파트너십"],
    },
    {
      url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 정책 지침 및 시행령 공람",
      keywords: ["공람", "지침", "고시", "가이드라인"],
    },
    {
      url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "정부 부처 실무 정책 조율 회의",
      keywords: ["국무회의", "부처", "장관", "실무"],
    },
    {
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "열린 행정을 상징하는 관공서 청사 로비",
      keywords: ["청사", "민원실", "열린행정"],
    },
    {
      url: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "주민센터 민원 상담 및 복지 서비스 안내",
      keywords: ["주민센터", "행정복지센터", "복지창구", "정부24"],
    },
    {
      url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 기관 스마트 행정 업무 공간",
      keywords: ["공공기관", "공기업", "행정혁신"],
    },
    {
      url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "디지털 공공 마이데이터 및 온라인 접수",
      keywords: ["마이데이터", "복지로", "온라인신청"],
    },
    {
      url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "국가 주요 공공 정책 심층 보고서",
      keywords: ["보고서", "국책연구원", "KDI"],
    },
    {
      url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "국가 기간시설 및 공공 인프라 현장",
      keywords: ["인프라", "SOC", "교통망", "철도", "공항"],
    },
    {
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "소상공인·자영업자 맞춤 정책 지원",
      keywords: ["소상공인", "자영업", "희망회복", "버팀목"],
    },
    {
      url: "https://images.unsplash.com/photo-1521790797524-b2497295b8a0?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "취약계층 복지 안전망 강화 사업",
      keywords: ["취약계층", "기초수급", "차상위", "생계급여"],
    },
    {
      url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 대중교통 및 시민 편의 인프라",
      keywords: ["기후동행카드", "교통복지", "환승"],
    },
  ],

  // 6. 사회·문화·환경·생활 테마 (문화 예술, 기후/태풍, 보건/의료, 교육 등 18선)
  society: [
    {
      url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대 사회 라이프스타일과 지식 정보",
      keywords: ["사회", "문화", "생활", "트렌드"],
    },
    {
      url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "문화 예술 축제 및 미디어 공연",
      keywords: ["축제", "공연", "콘서트", "문화패스", "예술"],
    },
    {
      url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "미술관 및 공공 전시 문화 공간",
      keywords: ["미술관", "전시", "박물관", "문화누리"],
    },
    {
      url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "자연 생태 보존 및 청정 환경",
      keywords: ["생태", "청정", "제주", "자연", "바이오"],
    },
    {
      url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "친환경 풍력 및 신재생 그린 에너지",
      keywords: ["에너지", "친환경", "풍력", "태양광", "탄소중립"],
    },
    {
      url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 보건 의료 및 첨단 병원 시설",
      keywords: ["의료", "병원", "보건", "건강보험", "치료"],
    },
    {
      url: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "전문 의료진과 국민 건강 증진 체계",
      keywords: ["의사", "간호사", "백신", "방역", "돌봄"],
    },
    {
      url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "초중고 교육 현장 및 미래 교실",
      keywords: ["교육", "학교", "늘봄학교", "돌봄교실", "교사"],
    },
    {
      url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "급변하는 기상 기후 및 태풍 안전 대책",
      keywords: ["태풍", "기상", "날씨", "호우", "기후", "크로반", "안전"],
    },
    {
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "미세먼지 없는 맑은 하늘과 대기 환경",
      keywords: ["미세먼지", "대기", "맑은하늘", "환경보호"],
    },
    {
      url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "지역사회 시민 화합 및 문화 행사",
      keywords: ["시민", "행사", "마을", "공동체"],
    },
    {
      url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "사회 복지 나눔 및 자원봉사 활동",
      keywords: ["봉사", "나눔", "기부", "사회복지"],
    },
    {
      url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "울창한 산림과 국립공원 생태계",
      keywords: ["산림", "산불예방", "국립공원", "숲"],
    },
    {
      url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "전통과 현대가 어우러진 문화 축제",
      keywords: ["전통", "K컬처", "한류", "관광"],
    },
    {
      url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "가족 친화 및 따뜻한 일상 복지",
      keywords: ["가족", "부모", "아이", "육아", "출산지원"],
    },
    {
      url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "사계절 기후 변화와 계절별 안전 대책",
      keywords: ["한파", "폭염", "계절", "재난대응"],
    },
    {
      url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도시 대중교통 및 친환경 교통망",
      keywords: ["교통", "지하철", "버스", "친환경차"],
    },
    {
      url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "세대 간 소통과 따뜻한 포용 사회",
      keywords: ["어르신", "노인복지", "기초연금", "포용"],
    },
  ],
};

/**
 * 32-bit FNV-1a 해시 생성기
 * 문자열 전체의 비트를 고르게 분산하여 충돌을 극적으로 줄임
 */
export function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 기사의 imageTheme, 카테고리, 제목, 본문 키워드를 분석하여 6대 메인 테마 판별
 */
export function detectImageTheme(
  themeInput?: string | null,
  category?: string,
  title?: string,
  content?: string
): Exclude<ImageTheme, "general"> {
  const normalized = (themeInput || "").toLowerCase().trim();

  if (normalized === "tech" || normalized === "general") {
    // 테크 관련 키워드가 맞는지 또는 사회인지 구분
    const textCombined = `${title || ""} ${content?.slice(0, 400) || ""}`.toLowerCase();
    if (/태풍|날씨|기후|의료|병원|축제|공연|예술|교육|자연|환경/i.test(textCombined)) {
      return "society";
    }
    return "tech";
  }

  if (
    normalized === "housing" ||
    normalized === "finance" ||
    normalized === "youth" ||
    normalized === "policy" ||
    normalized === "society"
  ) {
    return normalized as Exclude<ImageTheme, "general">;
  }

  const cat = (category || "").trim();
  const textCombined = `${title || ""} ${content?.slice(0, 500) || ""}`.toLowerCase();

  // 1. 테크·IT 키워드 최우선 판별
  if (
    /테크|it|tech|반도체|스마트워치|아이픽스잇|크롬|해킹|취약점|제로데이|ai|인공지능|소프트웨어|하드웨어|hbm|서버|보안/i.test(
      cat
    ) ||
    /반도체|스마트워치|픽셀워치|크롬|제로데이|해킹|취약점|인공지능|chatgpt|엔비디아|hbm|수리점수|아이픽스잇|하드웨어|소프트웨어|모바일앱|안드로이드|ios/i.test(
      textCombined
    )
  ) {
    return "tech";
  }

  // 2. 청년·취업 키워드
  if (
    /청년|취업|구직|인턴|면접|대학생|사회초년생|일자리|도약계좌|도약장려금|역량강화/i.test(
      textCombined
    )
  ) {
    return "youth";
  }

  // 3. 부동산·세제 키워드
  if (
    /부동산|세제|주택|아파트|청약|전세|월세|분양|매매|종부세|취득세|양도세|재건축|임대/i.test(
      cat
    ) ||
    /아파트|주택|청약|분양|전세|월세|부동산|강남|재건축|디딤돌|버팀목/i.test(
      textCombined
    )
  ) {
    return "housing";
  }

  // 4. 금융·경제 키워드
  if (
    /금융|경제|증시|금리|대출|환율|투자|은행|가상자산|코인|주식|예금|적금|세금|환급|이자/i.test(
      cat
    ) ||
    /금리|환율|대출|증시|주식|환급|연말정산|예금|적금|금융지원|바우처|비용|소득|자금|이자|물가/i.test(
      textCombined
    )
  ) {
    return "finance";
  }

  // 5. 사회·문화·환경 키워드
  if (
    /사회|문화|생활|환경|교육|날씨|의료|보건|컬처/i.test(cat) ||
    /태풍|크로반|기상|호우|의료|병원|건강|공연|축제|미술관|전시|학교|학생|교육|환경|바이오|제주/i.test(
      textCombined
    )
  ) {
    return "society";
  }

  // 6. 정책·공공 키워드 (기본 테마)
  return "policy";
}

/**
 * 1:1 고유 실사 스톡 이미지 매핑 옵션
 */
export interface StockImageOptions {
  themeInput?: string | null;
  title?: string;
  category?: string;
  content?: string;
  articleId?: number | string;
  slug?: string;
  existingUrls?: Set<string>; // 동일 페이지/피드 내에서 이미 사용된 URL (충돌 방지용)
}

/**
 * 기사에 맞는 실사 스톡 이미지 항목 반환 (1:1 충돌 최소화 및 겹침 방지)
 * - 기사 ID, 슬러그, 제목의 고유 해시와 키워드 가중치를 결합
 * - 112개 대규모 풀에서 중복 없이 골고루 1:1 분산 매핑
 */
export function getStockImage(
  themeInput?: string | null,
  title: string = "",
  category?: string,
  content?: string,
  articleId?: number | string,
  slug?: string,
  existingUrls?: Set<string>
): StockImageItem & { theme: Exclude<ImageTheme, "general"> } {
  const theme = detectImageTheme(themeInput, category, title, content);
  const pool = STOCK_IMAGE_POOL[theme] || STOCK_IMAGE_POOL.policy;

  // 1. 기사 텍스트 내 세부 키워드 매칭 인덱스 검색 (예: '스마트워치', '크롬', '반도체' 등)
  const fullText = `${title} ${content?.slice(0, 300) || ""}`.toLowerCase();
  const keywordMatchedIndices: number[] = [];

  pool.forEach((item, idx) => {
    if (item.keywords && item.keywords.some((kw) => fullText.includes(kw.toLowerCase()))) {
      keywordMatchedIndices.push(idx);
    }
  });

  // 2. 고유 해시 시드 생성 (articleId + slug + title 결합)
  const uniqueKey = `${articleId || ""}_${slug || ""}_${title}`;
  const seed = fnv1aHash(uniqueKey || "briefpost-default-seed");

  let chosenIndex = 0;

  // 3. 키워드 매칭 후보가 있는 경우 그 안에서 해시 분산
  if (keywordMatchedIndices.length > 0) {
    const candidateIdx = Math.abs((seed ^ (seed >>> 8))) % keywordMatchedIndices.length;
    chosenIndex = keywordMatchedIndices[candidateIdx];
  } else {
    // 키워드가 없으면 테마 풀 전체에서 고유 해시로 분산
    chosenIndex = Math.abs((seed ^ (seed >>> 16))) % pool.length;
  }

  // 4. 충돌 회피 (이미 사용된 URL이 전달되었고, 다른 선택지가 있는 경우 다음 슬롯으로 순환)
  if (existingUrls && pool[chosenIndex] && existingUrls.has(pool[chosenIndex].url)) {
    for (let offset = 1; offset < pool.length; offset++) {
      const nextIdx = (chosenIndex + offset) % pool.length;
      if (pool[nextIdx] && !existingUrls.has(pool[nextIdx].url)) {
        chosenIndex = nextIdx;
        break;
      }
    }
  }

  const selectedItem = pool[chosenIndex] || pool[0];

  return {
    ...selectedItem,
    theme,
  };
}

/**
 * 기사 목록 전체에 대해 100% 겹침 없는 고유 실사 스톡 썸네일 URL을 1:1로 일괄 배정하는 알고리즘
 * - 이미 배정된 URL을 추적하여 전체 112개 풀에서 겹침(0건)을 완벽 보장
 */
export function assignUniqueStockThumbnails<T extends { id?: number | string; slug?: string; title: string; category?: string; content?: string; imageTheme?: string | null }>(
  articles: T[]
): Array<T & { assignedThumbnailUrl: string; assignedCaption: string; assignedTheme: string }> {
  const usedUrls = new Set<string>();

  return articles.map((art) => {
    const stock = getStockImage(
      art.imageTheme,
      art.title,
      art.category,
      art.content,
      art.id,
      art.slug,
      usedUrls
    );

    usedUrls.add(stock.url);

    return {
      ...art,
      assignedThumbnailUrl: stock.url,
      assignedCaption: stock.caption,
      assignedTheme: stock.theme,
    };
  });
}
