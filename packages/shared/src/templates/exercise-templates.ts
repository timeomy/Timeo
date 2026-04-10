export const SESSION_LOG_TYPE_VALUES = [
  "personal_training",
  "group_class",
  "assessment",
  "consultation",
  "leg_day",
  "back_day",
  "shoulder_day",
  "chest_day",
  "arms_day",
  "full_body",
  "cardio",
  "core",
  "custom",
] as const;

export type SessionLogType = (typeof SESSION_LOG_TYPE_VALUES)[number];

export const SESSION_LOG_QUICK_TYPE_OPTIONS = [
  { value: "leg_day", label: "Leg Day" },
  { value: "back_day", label: "Back Day" },
  { value: "shoulder_day", label: "Shoulder Day" },
  { value: "chest_day", label: "Chest Day" },
  { value: "arms_day", label: "Arms Day" },
  { value: "full_body", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
  { value: "assessment", label: "Assessment" },
  { value: "custom", label: "Custom" },
] as const;

export type SessionLogQuickType =
  (typeof SESSION_LOG_QUICK_TYPE_OPTIONS)[number]["value"];

export const SESSION_LOG_TYPE_LABELS: Record<SessionLogType, string> = {
  personal_training: "Personal Training",
  group_class: "Group Class",
  assessment: "Assessment",
  consultation: "Consultation",
  leg_day: "Leg Day",
  back_day: "Back Day",
  shoulder_day: "Shoulder Day",
  chest_day: "Chest Day",
  arms_day: "Arms Day",
  full_body: "Full Body",
  cardio: "Cardio",
  core: "Core",
  custom: "Custom",
};

export const DEFAULT_EXERCISE_SETS = 3;
export const DEFAULT_EXERCISE_REPS = 12;

export const SESSION_LOG_DURATION_OPTIONS = [30, 45, 60, 90] as const;

export const SESSION_LOG_FEEDBACK_OPTIONS = [
  "great",
  "good",
  "tired",
  "struggling",
] as const;

export type SessionLogFeedback =
  (typeof SESSION_LOG_FEEDBACK_OPTIONS)[number];

export const SESSION_LOG_EXERCISE_TEMPLATES: Record<
  SessionLogQuickType,
  string[]
> = {
  leg_day: [
    "Squats",
    "Leg Press",
    "Lunges",
    "Leg Curl",
    "Leg Extension",
    "Calf Raises",
  ],
  back_day: [
    "Lat Pulldown",
    "Seated Row",
    "Deadlift",
    "Bent Over Row",
    "Pull-ups",
  ],
  shoulder_day: [
    "Overhead Press",
    "Lateral Raise",
    "Front Raise",
    "Face Pulls",
    "Shrugs",
  ],
  chest_day: [
    "Bench Press",
    "Incline Press",
    "Cable Fly",
    "Push-ups",
    "Dips",
  ],
  arms_day: [
    "Bicep Curl",
    "Tricep Extension",
    "Hammer Curl",
    "Skull Crushers",
  ],
  full_body: [
    "Squats",
    "Deadlift",
    "Bench Press",
    "Pull-ups",
    "Overhead Press",
  ],
  cardio: [
    "Treadmill",
    "Bike",
    "Rowing",
    "Jump Rope",
    "HIIT Circuit",
  ],
  core: ["Plank", "Crunches", "Russian Twist", "Leg Raise", "Ab Wheel"],
  assessment: [],
  custom: [],
};
