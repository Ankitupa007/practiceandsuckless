// components/Profile.tsx
"use client";
import React from "react";
import { useUserItems } from "@/hooks/useShop";

const Profile = ({ userId }: { userId: string }) => {
    const { data: userItems } = useUserItems(userId);

    const avatars = userItems?.filter((item) => item.items.type === "avatar");
    const stickers = userItems?.filter((item) => item.items.type === "sticker");

    return (
        <div className="space-y-4">
            <h1 className="text-lg uppercase">Profile</h1>
            <div>
                <h2 className="text-sm uppercase">Avatar</h2>
                {avatars?.length ? (
                    <img
                        src={avatars[0].items.image_url} // Default to first avatar
                        alt="Avatar"
                        className="w-16 h-16 rounded-full"
                    />
                ) : (
                    <p>No avatar selected</p>
                )}
            </div>
            <div>
                <h2 className="text-sm uppercase">Stickers</h2>
                <div className="flex gap-2">
                    {stickers?.map((sticker) => (
                        <img
                            key={sticker.id}
                            src={sticker.items.image_url}
                            alt={sticker.items.name}
                            className="w-8 h-8"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Profile;