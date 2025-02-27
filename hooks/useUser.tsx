'use client'
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

const supabase = createClient();
const subscribers = new Set<
  (user: User | null, isAnonymous: boolean) => void
>();

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    subscribers.forEach((callback) =>
      callback(session.user, session.user.is_anonymous === true)
    );
  } else {
    subscribers.forEach((callback) => callback(null, true));
  }
});

export function useUser() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Refresh user session manually (e.g., after login)
  const refreshUser = async () => {
    const {
      data: { user: refreshedUser },
    } = await supabase.auth.getUser();

    if (refreshedUser) {
      setUser(refreshedUser);
      setIsAnonymous(refreshedUser.is_anonymous === true);
    } else {
      setUser(null);
      setIsAnonymous(true);
    }
    setIsReady(true);
  };

  useEffect(() => {
    const handleAuthChange = (user: User | null, isAnonymous: boolean) => {
      setIsReady(true);
      setUser(user);
      setIsAnonymous(isAnonymous);
    };

    subscribers.add(handleAuthChange);

    // Initial session check (when component mounts)
    refreshUser();

    return () => {
      subscribers.delete(handleAuthChange);
    };
  }, []);

  return { user, isAnonymous, isReady, refreshUser };
}
