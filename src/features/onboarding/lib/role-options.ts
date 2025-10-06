import { onboardingRoles } from "@/features/onboarding/lib/dto";

type RoleOption = {
  value: (typeof onboardingRoles)[number];
  title: string;
  description: string;
  highlights: string[];
};

export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "learner",
    title: "학습자",
    description: "코스를 탐색하고 수강하며 과제를 제출합니다.",
    highlights: [
      "마감 임박 과제를 빠르게 확인",
      "제출 현황과 점수 추적",
      "코스 콘텐츠와 피드백 열람",
    ],
  },
  {
    value: "instructor",
    title: "강사",
    description: "코스를 개설하고 제출물을 관리합니다.",
    highlights: [
      "코스/과제 생성 및 게시",
      "제출물 채점과 피드백 제공",
      "마감 및 재제출 정책 제어",
    ],
  },
];

export type { RoleOption };
