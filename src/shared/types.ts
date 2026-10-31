// Shared contracts. See AGENTS.md section 5. Changes need a team heads up.

export type Monster = "vampire" | "banshee" | "hob" | "zombie";

export interface Assessment {
  id: string;
  course: string;          // "MAT224"
  title: string;           // "Term Test 2"
  type: "test" | "exam" | "assignment" | "lab" | "quiz" | "project" | "other";
  date: string;            // ISO date, "2026-11-18"
  time?: string;           // "18:00"
  weight: number;          // percent of final grade, after "best of" adjustments
  location?: string;       // building code if known, "BA"
  confidence: number;      // 0 to 1, from extraction, low values need user review
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;           // ISO datetime
  end: string;
  buildingCode?: string;
  kind: "class" | "study" | "meal" | "assessment" | "other";
}

export interface CrunchWeek {
  weekStart: string;       // ISO date (Monday)
  load: number;            // sum of weights due that week
  phase: "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full";
  assessments: Assessment[];
}

export interface StudyBlock {
  assessmentId: string;
  start: string;
  end: string;
}

export interface RouteResult {
  path: [number, number][];   // [lng, lat]
  distanceM: number;
  durationMin: number;
  sunExposure: number;        // 0 to 1, fraction of route in direct sun
  indoorFraction: number;     // 0 to 1
  steps: string[];            // human readable directions
}

export interface Ingredient {
  name: string;
  quantity?: string;
}

export interface MealSuggestion {
  name: string;
  minutes: number;            // prep time
  effort: "none" | "low" | "medium";
  uses: string[];             // ingredient names from the pantry
  missing: string[];
  whereToGetMissing?: string; // dining hall or café name
}

export interface CovenUser {
  id: string;
  firstName: string;
  imageUrl?: string;
  guest: boolean;
}
