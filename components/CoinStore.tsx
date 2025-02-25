// components/CoinStore.tsx
"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Flame, Trophy, CheckCircle } from "lucide-react";
import { Practice } from "@/types/supabase";
import { useShopItems, useUserItems, usePurchaseItem } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CoinStoreProps {
    practices: Practice[];
    userId: string;
}

const CoinStore = ({ practices, userId }: CoinStoreProps) => {
    const [showShop, setShowShop] = useState(false);
    const totalCoins = practices.reduce((sum, p) => sum + (p.points || 0), 0);
    const totalCompletedDays = practices.reduce(
        (sum, p) => sum + p.completed_days.length,
        0
    );
    const totalDays = practices.reduce((sum, p) => sum + p.total_days, 0);
    const completionRate =
        totalDays > 0 ? (totalCompletedDays / totalDays) * 100 : 0;
    const longestStreak = Math.max(
        ...practices.map((p) => p.longest_streak || 0),
        0
    );
    const completedChallenges = practices.filter((p) => p.is_completed).length;

    const { data: shopItems, isLoading: shopLoading } = useShopItems();
    const { data: userItems, isLoading: userItemsLoading } = useUserItems(userId);
    const purchaseMutation = usePurchaseItem();

    const handlePurchase = (itemId: string, cost: number) => {
        purchaseMutation.mutate(
            { userId, itemId, userCoins: totalCoins, itemCost: cost },
            {
                onSuccess: () => toast("Success!", { description: "Item purchased!" }),
                onError: (error) =>
                    toast("Error", { description: error.message || "Purchase failed" }),
            }
        );
    };

    return (
        <Card className="w-full max-w-2xl mx-auto bg-white dark:bg-black border-none shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        Coin Store
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowShop(!showShop)}
                    >
                        {showShop ? "Stats" : "Shop"}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!showShop ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col items-center text-center">
                            <Coins className="w-6 h-6 text-yellow-500 mb-1" />
                            <span className="text-2xl font-bold">{totalCoins}</span>
                            <span className="text-xs uppercase text-muted-foreground">
                Total Coins
              </span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                            <span className="text-2xl font-bold">
                {completionRate.toFixed(1)}%
              </span>
                            <span className="text-xs uppercase text-muted-foreground">
                Completion
              </span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <Flame className="w-6 h-6 text-orange-500 mb-1" />
                            <span className="text-2xl font-bold">{longestStreak}</span>
                            <span className="text-xs uppercase text-muted-foreground">
                Best Streak
              </span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <Trophy className="w-6 h-6 text-purple-500 mb-1" />
                            <span className="text-2xl font-bold">{completedChallenges}</span>
                            <span className="text-xs uppercase text-muted-foreground">
                Completed
              </span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {shopLoading ? (
                            <p className="text-center">Loading shop...</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {shopItems?.map((item) => {
                                    const isOwned = userItems?.some((ui) => ui.item_id === item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-col items-center p-2 border rounded"
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-12 h-12 mb-2"
                                            />
                                            <span className="text-sm uppercase">{item.name}</span>
                                            <div className="flex items-center gap-1">
                                                <Coins className="w-4 h-4 text-yellow-500" />
                                                <span className="text-sm">{item.cost}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isOwned ? "secondary" : "default"}
                                                disabled={
                                                    isOwned ||
                                                    totalCoins < item.cost ||
                                                    purchaseMutation.isPending
                                                }
                                                onClick={() => handlePurchase(item.id, item.cost)}
                                                className="mt-2"
                                            >
                                                {isOwned ? "Owned" : "Buy"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CoinStore;