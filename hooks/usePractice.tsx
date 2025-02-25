"use client"
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {createClient} from '@/utils/supabase/client';
import {Practice} from '@/types/supabase';
import {format} from "date-fns";
import {calculateStreak, checkAchievements} from "@/utils/rewards";

const supabase = createClient()

// Query keys
export const practiceKeys = {
    all: ['practices'] as const,
    user: (userId: string | undefined) => [...practiceKeys.all, userId] as const,
    detail: (practiceId: string) => [...practiceKeys.all, practiceId] as const,
};

// Fetch user's practices
export const useUserPractices = (userId: string) => {
    return useQuery({
        queryKey: practiceKeys.user(userId),
        queryFn: async (): Promise<Practice[]> => {
            const { data, error } = await supabase
                .from('practices')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
    });
};

// Create new practice with optimistic update
export const useCreatePractice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               userId,
                               practice_name,
                               totalDays,
                           }: {
            userId: string;
            practice_name: string;
            totalDays: number;
        }): Promise<Practice> => {
            const { data, error } = await supabase
                .from('practices')
                .insert({
                    user_id: userId,
                    practice_name: practice_name,
                    total_days: totalDays,
                    completed_days: [],
                    is_completed: false,
                    current_streak: 0,
                    longest_streak: 0,
                    points: 0,
                    last_practice_date: null,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ userId, practice_name, totalDays }) => {
            await queryClient.cancelQueries({ queryKey: practiceKeys.user(userId) });
            const previousPractices = queryClient.getQueryData<Practice[]>(practiceKeys.user(userId));

            const optimisticPractice: Practice = {
                id: 'temp-id-' + new Date().getTime(),
                user_id: userId,
                is_completed: false,
                practice_name: practice_name,
                total_days: totalDays,
                current_streak: 0,
                longest_streak: 0,
                points: 0,
                achievement_points:0,
                last_practice_date: null,
                completed_days: [],
                created_at: new Date().toISOString(),
            };

            queryClient.setQueryData<Practice[]>(practiceKeys.user(userId), (old = []) => {
                return [optimisticPractice, ...old];
            });

            return { previousPractices };
        },
        onError: (err, variables, context) => {
            if (context?.previousPractices) {
                queryClient.setQueryData(practiceKeys.user(variables.userId), context.previousPractices);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData<Practice[]>(practiceKeys.user(variables.userId), (old = []) => {
                return old.map(practice =>
                    practice.id.startsWith('temp-id-') ? data : practice
                );
            });
        },
    });
};

// Update practice days with optimistic update
export const useUpdatePracticeDay = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
                               practice,
                               completedDays,
            userId
                           }: {
            practice: Practice;
            userId:string;
            completedDays: string[];
        }): Promise<void> => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const streak = calculateStreak(completedDays, today);
            const points = practice.points
            const isCompleted = completedDays.length === practice.total_days;

            const { error } = await supabase
                .from('practices')
                .update({
                    ...practice
                })
                .eq('id', practice.id)
                .eq('user_id', userId);

            if (error) throw error;

            const newAchievements = await checkAchievements(practice, completedDays, supabase);
            if (newAchievements.length > 0) {
                const { error: achievementError } = await supabase
                    .from('achievements')
                    .insert(newAchievements)
                    .eq("user_id", userId)
                    .eq('practice_id', practice.id);
                if (achievementError) throw achievementError;
            }
        },
        onMutate: async ({ practice, completedDays }) => {
            await queryClient.cancelQueries({ queryKey: practiceKeys.detail(practice.id) });
            await queryClient.cancelQueries({ queryKey: practiceKeys.all });

            const previousPractice = queryClient.getQueryData<Practice>(practiceKeys.detail(practice.id));
            const previousPractices = queryClient.getQueryData<Practice[]>(practiceKeys.all);

            const isCompleted = completedDays.length === practice.total_days;

            if (previousPractice) {
                queryClient.setQueryData<Practice>(practiceKeys.detail(practice.id), {
                    ...previousPractice,
                    completed_days: completedDays,
                    is_completed: isCompleted,
                });
            }

            queryClient.setQueryData<Practice[]>(practiceKeys.all, (old = []) => {
                return old.map(p =>
                    p.id === practice.id
                        ? { ...p, completed_days: completedDays, is_completed: isCompleted }
                        : p
                );
            });

            return { previousPractice, previousPractices };
        },
        onError: (err, variables, context) => {
            if (context?.previousPractice) {
                queryClient.setQueryData(practiceKeys.detail(variables.practice.id), context.previousPractice);
            }
            if (context?.previousPractices) {
                queryClient.setQueryData(practiceKeys.all, context.previousPractices);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: practiceKeys.detail(variables.practice.id) });
            queryClient.invalidateQueries({ queryKey: practiceKeys.all });
        },
    });
};

// Update practice details
export const useUpdatePractice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               practiceId,
                               userId,
                               updates,
                           }: {
            practiceId: string;
            userId: string;
            updates: Partial<Practice>;
        }): Promise<Practice> => {
            const { data, error } = await supabase
                .from('practices')
                .update(updates)
                .eq('id', practiceId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ practiceId, updates, userId }) => {
            await queryClient.cancelQueries({ queryKey: practiceKeys.detail(practiceId) });
            await queryClient.cancelQueries({ queryKey: practiceKeys.user(userId) });

            const previousPractice = queryClient.getQueryData<Practice>(practiceKeys.detail(practiceId));
            const previousPractices = queryClient.getQueryData<Practice[]>(practiceKeys.user(userId));

            // Update practice detail
            if (previousPractice) {
                queryClient.setQueryData<Practice>(practiceKeys.detail(practiceId), {
                    ...previousPractice,
                    ...updates,
                });
            }

            // Update practice in list
            queryClient.setQueryData<Practice[]>(practiceKeys.user(userId), (old = []) => {
                return old.map(practice =>
                    practice.id === practiceId
                        ? { ...practice, ...updates }
                        : practice
                );
            });

            return { previousPractice, previousPractices };
        },
        onError: (err, variables, context) => {
            if (context?.previousPractice) {
                queryClient.setQueryData(practiceKeys.detail(variables.practiceId), context.previousPractice);
            }
            if (context?.previousPractices) {
                queryClient.setQueryData(practiceKeys.user(variables.userId), context.previousPractices);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: practiceKeys.detail(variables.practiceId) });
            queryClient.invalidateQueries({ queryKey: practiceKeys.user(variables.userId) });
        },
    });
};

// Delete practice
export const useDeletePractice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               practiceId,
                               userId,
                           }: {
            practiceId: string;
            userId: string;
        }): Promise<void> => {
            const { error } = await supabase
                .from('practices')
                .delete()
                .eq('id', practiceId)
                .eq('user_id', userId);

            if (error) throw error;
        },
        onMutate: async ({ practiceId, userId }) => {
            await queryClient.cancelQueries({ queryKey: practiceKeys.user(userId) });
            const previousPractices = queryClient.getQueryData<Practice[]>(practiceKeys.user(userId));

            queryClient.setQueryData<Practice[]>(practiceKeys.user(userId), (old = []) => {
                return old.filter(practice => practice.id !== practiceId);
            });

            return { previousPractices };
        },
        onError: (err, variables, context) => {
            if (context?.previousPractices) {
                queryClient.setQueryData(practiceKeys.user(variables.userId), context.previousPractices);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: practiceKeys.user(variables.userId) });
        },
    });
};

// Get single practice
export const usePractice = (practiceId: string) => {
    return useQuery({
        queryKey: practiceKeys.detail(practiceId),
        queryFn: async (): Promise<Practice> => {
            const { data, error } = await supabase
                .from('practices')
                .select('*')
                .eq('id', practiceId)
                .single();

            if (error) throw error;
            return data;
        },
    });
};