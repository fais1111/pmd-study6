
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ShieldAlert } from 'lucide-react';
import { getUserProfile, UserProfile, getAccessControlSettings, AccessControlSettings } from '@/services/firestore';
import { Timestamp } from 'firebase/firestore';

const ADMIN_EMAIL = "techworldinfo98@gmail.com";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    hasFullAccess: boolean;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    hasFullAccess: true,
    refreshUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasFullAccess, setHasFullAccess] = useState(true);
    const [accessSettings, setAccessSettings] = useState<AccessControlSettings>({ isRestricted: false });

    const checkAccess = useCallback((profile: UserProfile | null, settings: AccessControlSettings) => {
        if (!profile) return false;
        if (profile.email === ADMIN_EMAIL) return true; // Admin always has full access
        if (!settings.isRestricted) return true; // Not restricted globally, everyone has access

        // Check for individual access expiry
        if (profile.accessExpiresAt) {
            const now = Timestamp.now();
            return profile.accessExpiresAt > now;
        }

        return false; // Restricted and no valid individual access
    }, []);

    const refreshUserProfile = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await currentUser.reload();
            setUser(currentUser);
            const profile = await getUserProfile(currentUser.uid);
            setUserProfile(profile);
            
            const settings = await getAccessControlSettings();
            setAccessSettings(settings);
            
            setHasFullAccess(checkAccess(profile, settings));
        }
    }, [checkAccess]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            const adminStatus = user?.email === ADMIN_EMAIL;
            setIsAdmin(adminStatus);

            const settings = await getAccessControlSettings();
            setAccessSettings(settings);

            if (user) {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
                setHasFullAccess(checkAccess(profile, settings));
            } else {
                setUserProfile(null);
                setHasFullAccess(checkAccess(null, settings));
            }
            
            setLoading(false);
        });

        return () => unsubscribe();
    }, [checkAccess]);

    const value = {
        user,
        userProfile,
        loading,
        isAdmin,
        hasFullAccess,
        refreshUserProfile,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <ShieldAlert className="h-12 w-12 animate-pulse text-primary" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
