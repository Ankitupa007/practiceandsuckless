"use client"
import React, {useState} from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Award, Check, Coins, Edit2, Medal, Star, Trash2, Trophy, X} from 'lucide-react';
import {addDays, format} from 'date-fns';
import {
    useCreatePractice,
    useDeletePractice,
    useUpdatePractice,
    useUpdatePracticeDay,
    useUserPractices
} from '@/hooks/usePractice';
import {toast} from "sonner"
import {Practice} from "@/types/supabase";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    calculateDailyPoints,
    calculateStreak,
    calculateTotalPoints,
    checkAchievements,
    REWARD_CONFIG
} from "@/utils/rewards";
import {createClient} from "@/utils/supabase/client";
import {ProgressBar} from "@/components/progressBar";
import {NothingCheckbox} from "@/components/NothingCheckbox";
import CoinStore from "@/components/CoinStore";

const PracticeTracker = ({ userId }: { userId: string }) => {
        const [days, setDays] = useState<number>(0);
        const [practice_name, setPracticeName] = useState<string>('');
        const [animatedPoints, setAnimatedPoints] = useState<{ [key: string]: number }>({});
        const [editingPractice, setEditingPractice] = useState<string | null>(null);
        const [editName, setEditName] = useState<string>('');
        const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
        const [loadingCheckbox, setLoadingCheckbox] = useState<{ practiceId: string; dayIndex: number } | null>(null); // New state
        const supabase = createClient();
        const { data: practices, isLoading: practicesLoading } = useUserPractices(userId);
        const createPracticeMutation = useCreatePractice();
        const updatePracticeMutation = useUpdatePractice();
        const updatePracticeDayMutation = useUpdatePracticeDay();
        const deletePracticeMutation = useDeletePractice();
    
        const getAchievements = (practice: Practice) => {
            const achievements = [];
            const completionRate = (practice.completed_days.length / practice.total_days) * 100;
    
            if (practice.completed_days.length >= 1) {
                achievements.push({
                    icon: <Star className="w-4 h-4" />,
                    text: "First Day Complete",
                    color: "bg-blue-100 text-blue-800"
                });
            }
    
            if (completionRate >= 50) {
                achievements.push({
                    icon: <Medal className="w-4 h-4" />,
                    text: "Halfway There",
                    color: "bg-yellow-100 text-yellow-800"
                });
            }
    
            if (practice.completed_days.length >= 7) {
                achievements.push({
                    icon: <Award className="w-4 h-4" />,
                    text: "Week Warrior",
                    color: "bg-green-100 text-green-800"
                });
            }
    
            if (completionRate === 100) {
                achievements.push({
                    icon: <Trophy className="w-4 h-4" />,
                    text: "Challenge Complete",
                    color: "bg-purple-100 text-purple-800"
                });
            }
    
            return achievements;
        };
    
        const handleStart = async () => {
            if (days > 0 && practice_name) {
                try {
                    await createPracticeMutation.mutateAsync({
                        userId,
                        practice_name,
                        totalDays: days,
                    });
                    toast("Success",{
                        description: "Practice challenge created!",
                    });
                    setDays(0);
                    setPracticeName('');
                } catch (error) {
                    toast("Error",{
                        description: "Failed to create practice challenge",
                    });
                }
            }
        };
    
        const handleEdit = (practice: Practice) => {
            setEditingPractice(practice.id);
            setEditName(practice.practice_name);
        };
    
        const handleSaveEdit = async (practice: Practice) => {
            try {
                await updatePracticeMutation.mutateAsync({
                    practiceId: practice.id,
                    userId,
                    updates: { practice_name: editName }
                });
                setEditingPractice(null);
                toast("Success",{
                    description: "Practice name updated!",
                });
            } catch (error) {
                toast("Error",{
                    description: "Failed to update practice name",
                });
            }
        };
    
        const handleDelete = async (practiceId: string) => {
            try {
                await deletePracticeMutation.mutateAsync({
                    practiceId,
                    userId,
                });
                setDeleteConfirmId(null);
                toast("Success",{
                    description: "Practice challenge deleted",
                });
            } catch (error) {
                toast("Error",{
                    description: "Failed to delete practice challenge",
                });
            }
        };

        const handleCheck = async (practice: Practice, dayIndex: number) => {
            const date = format(addDays(new Date(practice.created_at), dayIndex), 'yyyy-MM-dd');
            const isChecked = practice.completed_days.includes(date);

            try {
                // Set loading state for this specific checkbox
                setLoadingCheckbox({ practiceId: practice.id, dayIndex });

                const updatedDays = isChecked
                    ? practice.completed_days.filter((d) => d !== date)
                    : [...practice.completed_days, date].sort();
                const basePoints = calculateTotalPoints(practice, updatedDays);
                const newAchievements = await checkAchievements(practice, updatedDays, supabase);
                const achievementPoints = practice.achievement_points || 0;
                const newAchievementPoints = newAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
                const totalAchievementPoints = achievementPoints + newAchievementPoints;
                const finalPoints = basePoints + totalAchievementPoints;
                const streak = calculateStreak(updatedDays, updatedDays[updatedDays.length - 1]);

                await updatePracticeDayMutation.mutateAsync({
                    practice: {
                        ...practice,
                        completed_days: updatedDays,
                        current_streak: streak,
                        longest_streak: Math.max(streak, practice.longest_streak || 0),
                        points: finalPoints,
                        achievement_points: totalAchievementPoints,
                        last_practice_date: new Date().toISOString(),
                        is_completed: updatedDays.length === practice.total_days,
                    },
                    userId: userId,
                    completedDays: updatedDays,
                });

                const pointsEarned = finalPoints - (practice.points || 0);

                if (pointsEarned > 0 && !isChecked) {
                    setAnimatedPoints((prev) => ({
                        ...prev,
                        [practice.id]: pointsEarned,
                    }));
                    setTimeout(() => {
                        setAnimatedPoints((prev) => {
                            const newPoints = { ...prev };
                            delete newPoints[practice.id];
                            return newPoints;
                        });
                    }, 3000);
                }
                if (pointsEarned > 0) {
                    toast("Points Earned!",{
                        description: `+${pointsEarned + newAchievementPoints} points`,
                    });
                }

                newAchievements.forEach((achievement) => {
                    toast("Achievement Unlocked!",{
                        description: `${achievement.title}: ${achievement.description} (+${achievement.points} points)`,
                    });
                });

                if (updatedDays.length === practice.total_days) {
                    toast( "Congratulations!",{
                        description: `Challenge completed! (+${REWARD_CONFIG.COMPLETION_BONUS} bonus points)`,
                    });
                }
            } catch (error) {
                toast("Error",{
                    description: "Failed to update progress",
                });
            } finally {
                // Clear loading state
                setLoadingCheckbox(null);
            }
        };
    
    
        if (practicesLoading) {
            return <div className="flex justify-center p-8">LOADING...</div>;
        }
    
        return (
            <div className="space-y-8">
                // components/PracticeTracker.tsx
                <CoinStore practices={practices || []} userId={userId} />
                <Card className="w-full max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Create New Practice Challenge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Challenge Name
                                </label>
                                <Input
                                    type="text"
                                    value={practice_name}
                                    onChange={(e) => setPracticeName(e.target.value)}
                                    placeholder="Enter challenge name"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Number of Days
                                </label>
                                <Input
                                    type="number"
                                    value={days || ''}
                                    onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                                    min="1"
                                    className="w-full"
                                />
                            </div>
                            <Button
                                onClick={handleStart}
                                disabled={!days || !practice_name || createPracticeMutation.isPending}
                                className="w-full"
                            >
                                {createPracticeMutation.isPending ? 'Creating...' : 'Start Challenge'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
    
                {practices?.map((practice) => (
                    <Card
                        key={practice.id}
                        className={`w-full relative max-w-2xl bg-white dark:bg-black mx-auto ${practice.is_completed ? '' : ''}`}
                    >
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    {editingPractice === practice.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full"
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleSaveEdit(practice)}
                                                disabled={updatePracticeMutation.isPending}
                                            >
                                                <Check className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingPractice(null)}
                                            >
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="gap-2">
                                            <CardTitle
                                                className={"text-md uppercase tracking-wider flex items-center gap-4"}>{practice.practice_name}</CardTitle>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className={"flex items-center gap-2 py-4"}>
                                            <Coins className="w-5 h-5 text-yellow-500"/>
                                            <span
                                                className="font-bold">{practice.points || calculateDailyPoints(practice.current_streak)} COINS</span>
                                        </div>
                                        <div className={"flex items-center gap-2 py-4"}>
                                            {animatedPoints[practice.id] && (
                                                <span className="points-animation">
                                                +{animatedPoints[practice.id]}
                                            </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm uppercase text-muted-foreground">
                                        {practice.completed_days.length}/{practice.total_days} days completed      <span className={""}>
                                            [{(practice.completed_days.length*100 / practice.total_days).toFixed(2)}%]
                                        </span>
                                    </p>
                                    <div className="flex items-center gap-0 py-4">
                                        <span className="text-2xl md:text-3xl">[</span>
                                        <div className={"w-full space-y-1 md:space-y-3"}>
                                            <ProgressBar
                                                completed={practice.completed_days.length}
                                                total={practice.total_days}
                                            />
                                            <ProgressBar
                                                completed={practice.completed_days.length}
                                                total={practice.total_days}
                                            />
                                        </div>
                                        <span className="text-2xl md:text-3xl">]</span>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 flex items-center gap-4">
                                    {!editingPractice && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(practice)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeleteConfirmId(practice.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {getAchievements(practice).map((achievement, index) => (
                                    <span
                                        key={index}
                                        className={`flex text-[10px] justify-center rounded-2xl px-2 py-2 items-center uppercase gap-2 ${achievement.color}`}
                                    >
                                        {achievement.icon}
                                        {achievement.text}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                {Array.from({ length: practice.total_days }).map((_, index) => {
                                    const date = format(addDays(new Date(practice.created_at), index), 'MMM d');
                                    const dateKey = format(addDays(new Date(practice.created_at), index), 'yyyy-MM-dd');
                                    const isChecked = practice.completed_days.includes(dateKey);
                                    const isLoading =
                                        loadingCheckbox?.practiceId === practice.id && loadingCheckbox?.dayIndex === index;

                                    return (
                                        <div key={index} className="flex flex-col items-center p-2 border rounded">
                                            <span className="text-xs md:text-sm mb-1 uppercase">{date}</span>
                                            <NothingCheckbox
                                                checked={isChecked}
                                                onCheckedChange={() => handleCheck(practice, index)}
                                                disabled={updatePracticeDayMutation.isPending} // Still disable all if mutation is pending globally
                                                loading={isLoading} // Pass specific loading state
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        {practice.current_streak > 0 && (
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">
                                    Current streak: {practice.current_streak} days
                                    {practice.longest_streak > practice.current_streak &&
                                        ` (Longest: ${practice.longest_streak} days)`}
                                </p>
                            </CardFooter>
                        )}
                    </Card>
                ))}
    
                <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this practice challenge and all its progress.
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };
    
    export default PracticeTracker;