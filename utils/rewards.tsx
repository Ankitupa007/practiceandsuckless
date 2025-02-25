// rewards.ts
import {subDays} from 'date-fns';
import {Achievement, Practice} from "@/types/supabase";
import {v4 as uuidv4} from 'uuid';

export const REWARD_CONFIG = {
    BASE_POINTS: 10,          // Points for completing a day
    STREAK_BONUSES: {
        7: 20,               // +20 points per day on 7+ day streak
        30: 50,              // +50 points per day on 30+ day streak
        100: 100,           // +100 points per day on 100+ day streak
    },
    COMPLETION_BONUS: 100,    // Bonus for completing the entire challenge
    ACHIEVEMENTS: {
        STREAKS: [
            { days: 7, points: 20, title: "Week Warrior" },
            { days: 30, points: 50, title: "Monthly Master" },
            { days: 100, points: 100, title: "Century Champion" },
        ],
        MILESTONES: [
            { percent: 25, points: 20, title: "Quarter Way" },
            { percent: 50, points: 30, title: "Halfway Hero" },
            { percent: 75, points: 40, title: "Almost There" },
            { percent: 100, points: 50, title: "Challenge Champion" },
        ],
    },
};

export const calculateStreak = (completedDays: string[], lastPracticeDate: string | null): number => {
    if (!completedDays.length) return 0;
    const sortedDays = [...completedDays].sort();
    const today = new Date();
    const yesterday = subDays(today, 1);
    const lastDay = lastPracticeDate ? new Date(lastPracticeDate) : new Date(sortedDays[sortedDays.length - 1]);

    // Break streak if last practice wasn't today or yesterday
    // if (!isWithinInterval(lastDay, { start: yesterday, end: today })) {
    //     console.log("breaking streak")
    //     return 0;
    // }

    let streak = 1;
    let currentDate = new Date(sortedDays[sortedDays.length - 1]);
    for (let i = sortedDays.length - 2; i >= 0; i--) {
        const prevDate = new Date(sortedDays[i]);
        const expectedPrevDate = subDays(currentDate, 1);

        if (prevDate.getTime() === expectedPrevDate.getTime()) {
            streak++;
            currentDate = prevDate;
        } else {
            break;
        }
    }
    return streak;
};

export const calculateDailyPoints = (streak: number): number => {
    let points = REWARD_CONFIG.BASE_POINTS;

    // Add streak bonuses
    for (const [days, bonus] of Object.entries(REWARD_CONFIG.STREAK_BONUSES)) {
        if (streak >= parseInt(days)) {
            points += bonus;
        }
    }
    return points;
};

export const calculateTotalPoints = (practice: Practice, completedDays: string[]): number => {
    let totalPoints = 0;

    // Calculate points for each day considering streaks
    for (let i = 0; i < completedDays.length; i++) {
        const currentStreak = i + 1; // Streak at this point
        let dayPoints = REWARD_CONFIG.BASE_POINTS;

        // Add streak bonuses
        if (currentStreak >= 100) {
            dayPoints += REWARD_CONFIG.STREAK_BONUSES[100];
        } else if (currentStreak >= 30) {
            dayPoints += REWARD_CONFIG.STREAK_BONUSES[30];
        } else if (currentStreak >= 7) {
            dayPoints += REWARD_CONFIG.STREAK_BONUSES[7];
        }
        totalPoints += dayPoints;
    }

    // Add completion bonus if applicable
    if (completedDays.length === practice.total_days) {
        totalPoints += REWARD_CONFIG.COMPLETION_BONUS;
    }

    return totalPoints;
};

export const checkAchievements = async (
    practice: Practice,
    completedDays: string[],
    supabase: any
): Promise<Achievement[]> => {
    const newAchievements: Achievement[] = [];
    const completionPercentage = (completedDays.length / practice.total_days) * 100;
    const streak = calculateStreak(completedDays, completedDays[completedDays.length - 1]);

    // Check streak achievements
    for (const streakAchievement of REWARD_CONFIG.ACHIEVEMENTS.STREAKS) {
        if (streak >= streakAchievement.days) {
            const { data: existing } = await supabase
                .from('achievements')
                .select('*')
                .eq('practice_id', practice.id)
                .eq('title', streakAchievement.title)
                .single();

            if (!existing) {
                newAchievements.push({
                    id: uuidv4(),
                    practice_id: practice.id,
                    user_id: practice.user_id,
                    type: 'streak',
                    title: streakAchievement.title,
                    description: `Maintained a ${streakAchievement.days}-day streak!`,
                    points: streakAchievement.points,
                    unlocked_at: new Date().toISOString(),
                });
            }
        }
    }

    // Check milestone achievements
    for (const milestone of REWARD_CONFIG.ACHIEVEMENTS.MILESTONES) {
        if (completionPercentage >= milestone.percent) {
            const { data: existing } = await supabase
                .from('achievements')
                .select('*')
                .eq('practice_id', practice.id)
                .eq('title', milestone.title)
                .single();

            if (!existing) {
                newAchievements.push({
                    id: uuidv4(),
                    practice_id: practice.id,
                    user_id: practice.user_id,
                    type: 'milestone',
                    title: milestone.title,
                    description: `Completed ${milestone.percent}% of the challenge!`,
                    points: milestone.points,
                    unlocked_at: new Date().toISOString(),
                });
            }
        }
    }

    return newAchievements;
};