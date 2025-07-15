
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { grades } from '@/config/grades';
import { createUserProfile, getUserProfile } from '@/services/firestore';
import { Loader2 } from 'lucide-react';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-5.067 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [grade, setGrade] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);


    const validateForm = () => {
        if (!grade) {
            toast({
                title: "Grade Required",
                description: "Please select your grade before signing up.",
                variant: "destructive",
            });
            return false;
        }
        return true;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await createUserProfile(user.uid, {
                displayName: username,
                email: user.email!,
                photoURL: user.photoURL || '',
                grade: grade,
            });
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Error signing up", error);
            const message = error.code === 'auth/email-already-in-use'
                ? 'This email is already registered. Please log in.'
                : 'An unexpected error occurred. Please try again.';
            toast({
                title: "Sign-up Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!validateForm()) return;
        
        setIsGoogleLoading(true);
        try {
            const result: UserCredential | null = await signInWithGoogle();
            if (!result) return;
            const user = result.user;

            const profile = await getUserProfile(user.uid);
            if (profile) {
                // User already exists, so just log them in
                router.push('/dashboard');
                return;
            }

            // New user, create their profile
            await createUserProfile(user.uid, {
                displayName: user.displayName!,
                email: user.email!,
                photoURL: user.photoURL || '',
                grade: grade,
            });
            router.push('/dashboard');
        } catch (error: any) {
             console.error("Google sign-up error", error);
            toast({
                title: "Sign-up Failed",
                description: error.message || "There was an error signing up with Google. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const isAnyLoading = isLoading || isGoogleLoading;

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <Link href="/" className="flex items-center justify-center gap-2 mb-4">
                            <Logo className="w-8 h-8 text-primary" />
                        </Link>
                        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
                        <CardDescription>Join the Village and start your learning adventure.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignUp} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="grade">Grade</Label>
                                <Select onValueChange={setGrade} value={grade}>
                                    <SelectTrigger id="grade">
                                        <SelectValue placeholder="Select your grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {grades.map(g => (
                                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" placeholder="your_username" required value={username} onChange={e => setUsername(e.target.value)} disabled={isAnyLoading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="student@email.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isAnyLoading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isAnyLoading}/>
                            </div>
                            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isAnyLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                        </form>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              Or continue with
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isAnyLoading}>
                            {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <GoogleIcon className="mr-2 h-4 w-4" />
                            Sign up with Google
                        </Button>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <div className="text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="underline font-medium text-primary">
                                Login
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
