
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ShieldAlert } from 'lucide-react';
import { getUserProfile, UserProfile } from '@/services/firestore';

const ADMIN_EMAIL = "techworldinfo98@gmail.com";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    refreshUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const refreshUserProfile = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // Refetch from both auth and firestore to ensure data is fresh
            await currentUser.reload();
            setUser(currentUser); // Update user state with latest from auth
            
            const profile = await getUserProfile(currentUser.uid);
            setUserProfile(profile);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            setIsAdmin(user?.email === ADMIN_EMAIL);

            if (user) {
                // Fetch user profile from Firestore
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        userProfile,
        loading,
        isAdmin,
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
