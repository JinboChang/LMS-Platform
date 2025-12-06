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
    title: "Learner",
    description: "Browse courses, enroll, and submit assignments.",
    highlights: [
      "See upcoming deadlines quickly",
      "Track submission status and scores",
      "Access course content and feedback",
    ],
  },
  {
    value: "instructor",
    title: "Instructor",
    description: "Create courses and manage student submissions.",
    highlights: [
      "Create and publish courses/assignments",
      "Grade submissions and provide feedback",
      "Control deadlines and resubmission policies",
    ],
  },
];

export type { RoleOption };
