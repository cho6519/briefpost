export type AdType = "auto" | "adsense" | "custom";
export type CustomBannerId = "shindansu" | "kecel" | "random";

export interface CustomBannerInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  ctaText: string;
  targetUrl: string;
  theme: {
    bgGradient: string;
    darkBgGradient: string;
    textColor: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const CUSTOM_BANNERS: Record<"shindansu" | "kecel", CustomBannerInfo> = {
  shindansu: {
    id: "shindansu",
    name: "신단수 (SHINDANSU)",
    tagline: "자연의 순수함을 담은 프리미엄 건강 브랜드",
    description: "엄선된 전통 원료와 현대 과학의 조화, 활력 넘치는 하루를 위한 선택",
    ctaText: "브랜드 스토리 보기 →",
    targetUrl: "https://shindansu.com",
    theme: {
      bgGradient: "from-emerald-950 via-teal-900 to-slate-900",
      darkBgGradient: "from-emerald-950 via-teal-950 to-zinc-900",
      textColor: "text-emerald-50",
      accentColor: "text-emerald-400",
      badgeBg: "bg-emerald-500/20 border-emerald-500/30",
      badgeText: "text-emerald-300",
    },
  },
  kecel: {
    id: "kecel",
    name: "KECEL (케셀)",
    tagline: "미래를 선도하는 스마트 에너지 & 테크놀로지",
    description: "고효율 친환경 솔루션과 혁신적인 엔지니어링 기술력",
    ctaText: "기술 솔루션 안내 →",
    targetUrl: "https://kecel.co.kr",
    theme: {
      bgGradient: "from-blue-950 via-indigo-900 to-slate-900",
      darkBgGradient: "from-blue-950 via-indigo-950 to-zinc-900",
      textColor: "text-blue-50",
      accentColor: "text-blue-400",
      badgeBg: "bg-blue-500/20 border-blue-500/30",
      badgeText: "text-blue-300",
    },
  },
};
