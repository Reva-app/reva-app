// ─── Raw database row types (snake_case, mirrors Supabase schema) ─────────────
// These are the exact shapes returned by Supabase queries.

export interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  localstorage_migrated: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSettings {
  id: string;
  user_id: string;
  birth_date: string | null;
  injury_date: string | null;
  surgery_date: string | null;
  injury_type: string | null;
  injury_type_other: string | null;
  injury_description: string | null;
  insurer_name: string | null;
  insurer_other: string | null;
  policy_number: string | null;
  supplementary_insurances: string[];
  physio_sessions_total: string | null;
  checkin_reminder_enabled: boolean | null;
  checkin_reminder_time: string | null;
  notifications: Record<string, unknown>;
  setup_completed: boolean;
  trial_start_date: string | null;
  trial_end_date: string | null;
  plan_type: string;
  subscription_status: string;
  subscription_source: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCheckIn {
  id: string;
  user_id: string;
  date: string;
  day_score: number;
  pain_score: number | null;
  mobility_score: number | null;
  energy_score: number | null;
  sleep_score: number | null;
  mood_score: number | null;
  swelling: boolean | null;
  note: string | null;
  training_done: boolean | null;
  medication_used: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface DbAppointment {
  id: string;
  user_id: string;
  title: string;
  appointment_type: string | null;
  date: string;
  time: string | null;
  location: string | null;
  provider_name: string | null;
  preparation: string | null;
  bring_items: string | null;
  notes_before: string | null;
  outcome_after: string | null;
  follow_up_action: string | null;
  reminder_enabled: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTrainingExercise {
  id: string;
  user_id: string;
  title: string;
  exercise_type: string | null;
  description: string | null;
  repetitions: string | null;
  load_or_time: string | null;
  location_label: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTrainingSchema {
  id: string;
  user_id: string;
  title: string;
  status: string | null;
  duration: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTrainingSchemaExercise {
  schema_id: string;
  exercise_id: string;
  sort_order: number;
}

export interface DbTrainingLog {
  id: string;
  user_id: string;
  schema_id: string | null;
  title: string;
  date: string;
  status: string | null;
  note: string | null;
  completed_exercise_ids: string[];
  duration_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDiaryWorkout {
  id: string;
  user_id: string;
  date: string;
  title: string;
  schema_id: string | null;
  completed: boolean;
  completed_at: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMedicationLog {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  medication_name: string;
  dosage: string | null;
  quantity: string | null;
  reason: string | null;
  effect: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMedicationSchedule {
  id: string;
  user_id: string;
  medication_name: string;
  name_other: string | null;
  dosage: string | null;
  quantity: string | null;
  times: string[] | null; // legacy column, kept in sync with medication_schedule_times junction table
  active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMedicationScheduleTime {
  schedule_id: string;
  time: string;
  sort_order: number;
}

export interface DbNotificationState {
  user_id: string;
  read_ids: string[];
  logged_ids: string[];
  updated_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  goal_type: string;
  icon: string | null;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMilestone {
  id: string;
  user_id: string;
  phase: string | null;
  title: string;
  completed: boolean;
  completed_at: string | null;
  reflection_text: string | null;
  pain_score: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbDossierDocument {
  id: string;
  user_id: string;
  title: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  provider_type: string | null;
  provider_name: string | null;
  date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDossierPhotoUpdate {
  id: string;
  user_id: string;
  date: string;
  week_number: number | null;
  image_url: string | null;
  image_name: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDossierContact {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  organization: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
