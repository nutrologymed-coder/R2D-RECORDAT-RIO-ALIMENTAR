export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  sodium_mg: number;
}

export interface MeasureConversions {
  defaults: Record<string, number>;
  specifics: Record<string, Record<string, number>>;
}

export interface FoodItem {
  foodId: string;
  measure: string;
  quantity: number;
}

export interface Meal {
  name: string;
  items: FoodItem[];
  skipped: boolean;
}

export interface DayRecord {
  meals: Meal[];
}

export interface PatientData {
  name: string;
  phone: string;
  startDate: string;
  notes: string;
}

export interface DailyTotals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  sodium_mg: number;
  topItems: { name: string; kcal: number }[];
  warnings: string[];
}

export interface R2DSubmission {
  patient: PatientData;
  days: DayRecord[];
  summary: {
    day1: DailyTotals;
    day2: DailyTotals;
    average: Omit<DailyTotals, 'topItems' | 'warnings'>;
  };
}
