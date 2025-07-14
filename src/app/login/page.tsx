
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, UserCredential } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

function GradeSelectionDialog({ open, onOpenChange, onContinue, isLoading }: { open: boolean, onOpenChange: (open: boolean) => void, onContinue: (grade: string) => void, isLoading: boolean }) {
    const [grade, setGrade] = useState('');
    const { toast } = useToast();

    const handleContinue = () => {
        if (!grade) {
            toast({
                title: "Grade Required",
                description: "Please select your grade to continue.",
                variant: "destructive",
            });
            return;
        }
        onContinue(grade);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>One Last Step</DialogTitle>
                    <DialogDescription>
                        Please select your grade to personalize your learning experience. This can be changed later.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="grade-dialog">Grade</Label>
                        <Select onValueChange={setGrade} value={grade}>
                            <SelectTrigger id="grade-dialog">
                                <SelectValue placeholder="Select your grade" />
                            </SelectTrigger>
                            <SelectContent>
                                {grades.map(g => (
                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleContinue} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProfileCreationLoading, setIsProfileCreationLoading] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
        const result: UserCredential = await signInWithGoogle();
        const user = result.user;
        
        const profile = await getUserProfile(user.uid);

        if (profile) {
            router.push('/dashboard');
        } else {
            setGoogleUser(user);
            setShowGradeDialog(true);
        }

    } catch (error: any) {
       if (error.code === 'auth/popup-closed-by-user' || error.message.includes('cancelled') || error.message.includes('user closed the prompt') || error.message.includes('SIGN_IN_CANCELLED') || error.message.includes('No user chosen') || error.message.includes('aborted')) {
           setIsGoogleLoading(false);
           return;
       }
       console.error("Google sign-in error", error);
       toast({
           title: "Login Failed",
           description: error.message || "There was an error signing in with Google. Please try again.",
           variant: "destructive",
       })
    } finally {
        setIsGoogleLoading(false);
    }
  };

  const handleGradeSelectionContinue = async (grade: string) => {
    if (!googleUser) return;
    setIsProfileCreationLoading(true);
    try {
        await createUserProfile(googleUser.uid, {
            displayName: googleUser.displayName!,
            email: googleUser.email!,
            photoURL: googleUser.photoURL || '',
            grade: grade,
        });
        setShowGradeDialog(false);
        router.push('/dashboard');
    } catch (error) {
        console.error("Error creating user profile after Google sign-in", error);
        toast({
            title: "Setup Failed",
            description: "Could not save your grade. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsProfileCreationLoading(false);
    }
  }

  const isAnyLoading = isGoogleLoading || isProfileCreationLoading;

  return (
    <>
      <GradeSelectionDialog 
        open={showGradeDialog} 
        onOpenChange={setShowGradeDialog}
        onContinue={handleGradeSelectionContinue}
        isLoading={isProfileCreationLoading}
      />
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center justify-center gap-2 mb-4">
                <Logo className="w-8 h-8 text-primary" />
              </Link>
              <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="student@email.com" required disabled={isAnyLoading} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input id="password" type="password" required disabled={isAnyLoading} />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isAnyLoading}>
                Login
              </Button>
              <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isAnyLoading}>
                 {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <GoogleIcon className="mr-2 h-4 w-4" />
                Login with Google
              </Button>
            </CardContent>
            <CardFooter className="justify-center">
              <div className="text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="underline font-medium text-primary">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
