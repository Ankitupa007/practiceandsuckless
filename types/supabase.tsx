export type Practice = {
  id: string;
  user_id: string;
  practice_name: string;
  total_days: number;
  completed_days: string[];
  created_at: string;
  current_streak: number;
  longest_streak: number;
  points: number;
  last_practice_date: string | null;
  is_completed:boolean;
  achievement_points:number;
};

export type Achievement = {
  id: string;
  user_id:string;
  practice_id: string;
  points:number;
  type: 'streak' | 'completion' | 'milestone';
  title: string;
  description: string;
  unlocked_at: string;
};