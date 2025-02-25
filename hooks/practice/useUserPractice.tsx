"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Practice } from "@/types/supabase";
import { useEffect } from "react";

const supabase = createClient();

// Query keys
export const practiceKeys = {
    all: ["practices"] as const,
    user: (userId: string | undefined) => [...practiceKeys.all, userId] as const,
    detail: (practiceId: string) => [...practiceKeys.all, practiceId] as const,
};

// Fetch and sync user's practices
export const useUserPractices = (userId: string) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: practiceKeys.user(userId),
        queryFn: async (): Promise<Practice[]> => {
            // Fetch practices
            const { data: practices, error: practiceError } = await supabase
                .from("practices")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (practiceError) throw practiceError;

            // Fetch current total_coins from profiles
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("total_coins")
                .eq("id", userId)
                .single();

            if (profileError && profileError.code !== "PGRST116") throw profileError; // Ignore "no rows" error

            const practicesData = practices || [];
            const calculatedTotalCoins = practicesData.reduce(
                (sum, practice) => sum + (practice.points || 0),
                0
            );
            const currentTotalCoins = profile?.total_coins ?? 0;

            // Sync total_coins if there's a mismatch
            if (calculatedTotalCoins !== currentTotalCoins) {
                const { error: updateError } = await supabase
                    .from("profiles")
                    .upsert(
                        { id: userId, total_coins: calculatedTotalCoins },
                        { onConflict: "id" }
                    );

                if (updateError) throw updateError;
            }

            return practicesData;
        },
    });

    // Optional: Refetch on mount to ensure sync
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: practiceKeys.user(userId) });
    }, [userId, queryClient]);

    return query;
};