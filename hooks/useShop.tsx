// hooks/useShop.ts
"use client";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
const supabase = createClient();

// Fetch available items
export const useShopItems = () => {
    return useQuery({
        queryKey: ["shop-items"],
        queryFn: async () => {
            const { data, error } = await supabase.from("items").select("*");
            if (error) throw error;
            return data;
        },
    });
};

// Fetch user's purchased items
export const useUserItems = (userId: string) => {
    return useQuery({
        queryKey: ["user-items", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("user_items")
                .select("*, items(*)")
                .eq("user_id", userId);
            if (error) throw error;
            return data;
        },
    });
};

// Purchase an item
export const usePurchaseItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
                               userId,
                               itemId,
                               userCoins,
                               itemCost,
                           }: {
            userId: string;
            itemId: string;
            userCoins: number;
            itemCost: number;
        }) => {
            if (userCoins < itemCost) throw new Error("Insufficient coins");

            const { error: purchaseError } = await supabase
                .from("user_items")
                .insert({ user_id: userId, item_id: itemId });
            if (purchaseError) throw purchaseError;

            const { error: coinError } = await supabase
                .from("profiles")
                .update({ total_coins: userCoins - itemCost })
                .eq("id", userId);
            if (coinError) throw coinError;

            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-items"] });
            queryClient.invalidateQueries({ queryKey: ["user-practices"] }); // To update coins
        },
    });
};