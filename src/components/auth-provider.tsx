"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { loadRemoteUserData, saveRemoteUserData, getCurrentUser, logoutUser } from "@/lib/user-store";
import type { UserData } from "@/lib/user-store";

type AuthUser = User & UserData;

interface AuthContextType {
  isAuthenticated: boolean;
  userData: AuthUser | null;
  loading: boolean;
  refresh: () => void;
  refreshAsync: () => Promise<void>;
  updateUserData: (data: AuthUser) => void;
  logout: () => void;
  isAdmin: boolean;
}
const AuthContext = createContext<AuthContextType>({ isAuthenticated: false, userData: null, loading: true, refresh: () => {}, refreshAsync: async () => {}, updateUserData: () => {}, logout: () => {}, isAdmin: false });

const supabase = typeof window !== "undefined" ? createClient() : null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const toAuthUser = useCallback((user: User | null): AuthUser | null => {
    if (!user) return null;
    const metadata = user.user_metadata ?? {};
    return {
      ...user,
      profile: {
        id: user.id,
        email: user.email ?? "",
        name: metadata.name ?? metadata.full_name ?? user.email?.split("@")[0] ?? "Пользователь",
        createdAt: user.created_at,
        onboarded: Boolean(metadata.onboarded),
        segment: metadata.segment,
        monthlyIncome: metadata.monthlyIncome,
      },
      transactions: [],
      accounts: [],
      debts: [],
      goals: [],
    } as AuthUser;
  }, []);
  const refreshAsync = useCallback(async () => {
    const localUser = getCurrentUser();
    if (localUser?.profile.email === "demo@monetrix.app") {
      setUserData({
        id: localUser.profile.id,
        email: localUser.profile.email,
        user_metadata: { display_name: localUser.profile.name },
        created_at: localUser.profile.createdAt,
        app_metadata: {},
        aud: "authenticated",
        confirmation_sent_at: undefined,
        confirmed_at: localUser.profile.createdAt,
        last_sign_in_at: localUser.profile.createdAt,
        role: "authenticated",
        updated_at: localUser.profile.createdAt,
        profile: localUser.profile,
        transactions: localUser.transactions,
        accounts: localUser.accounts,
        debts: localUser.debts,
        goals: localUser.goals,
      } as AuthUser);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (!supabase) { setUserData(null); setLoading(false); return; }
    const { data } = await supabase.auth.getUser();
    const baseUser = toAuthUser(data.user);
    if (data.user && baseUser) {
      let remoteData: UserData | null = null;
      try { remoteData = await loadRemoteUserData(data.user.id); } catch { /* Auth must remain usable when profile storage is unavailable. */ }
      const merged = remoteData ? { ...baseUser, ...remoteData, profile: { ...baseUser.profile, ...remoteData.profile, id: data.user.id, email: data.user.email ?? remoteData.profile.email } } as AuthUser : baseUser;
      setUserData(merged);
      if (!remoteData) void saveRemoteUserData(data.user.id, merged).catch(() => undefined);
      try {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        setIsAdmin(profile?.role === "admin");
      } catch { setIsAdmin(false); }
    } else {
      setUserData(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }, [supabase, toAuthUser]);
  useEffect(() => {
    if (!supabase) return;
    refreshAsync();
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) { setUserData(null); setIsAdmin(false); setLoading(false); return; }
      void refreshAsync();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshAsync, supabase, toAuthUser]);
  const updateUserData = useCallback((data: AuthUser) => {
    setUserData(data);
    if (supabase) void supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      if (result.data.user) void saveRemoteUserData(result.data.user.id, data);
    });
  }, [supabase]);
  const logout = useCallback(() => { logoutUser(); if (supabase) void supabase.auth.signOut(); setUserData(null); setIsAdmin(false); }, [supabase]);
  return <AuthContext.Provider value={{ isAuthenticated: !!userData, userData, loading, refresh: () => void refreshAsync(), refreshAsync, updateUserData, logout, isAdmin }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
