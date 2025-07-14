
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Book, Clock, Edit, Percent, Target, GraduationCap, Loader2 } from "lucide-react"
import { grades } from "@/config/grades";
import { useState, useEffect } from "react";
import { updateUserProfile, getAllUserQuizAttempts, QuizAttempt } from "@/services/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfileDetailsCard() {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: userProfile?.displayName || "",
        },
    });

    useEffect(() => {
        if (userProfile) {
            form.reset({ displayName: userProfile.displayName });
        }
    }, [userProfile, form]);

    async function onSubmit(data: ProfileFormValues) {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await updateUserProfile(user.uid, { displayName: data.displayName });
            await refreshUserProfile(); // Refresh context data
            toast({ title: "Success", description: "Your name has been updated." });
            setDialogOpen(false);
        } catch (error) {
            console.error("Failed to update profile", error);
            toast({ title: "Error", description: "Failed to update your name.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const userGradeLabel = grades.find(g => g.value === userProfile?.grade)?.label || userProfile?.grade;

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-headline">Your Details</CardTitle>
                 <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                                Make changes to your public profile here.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Display Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} data-ai-hint="person portrait" />
                    <AvatarFallback>{userProfile?.displayName?.[0] || 'S'}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold font-headline">{userProfile?.displayName || "Smart Student"}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>{userGradeLabel || 'Grade not set'}</span>
                </div>
                <p className="text-sm mt-2">Joined on {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </CardContent>
        </Card>
    );
}

function StudyStatisticsCard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        materialsCompleted: 0,
        quizzesTaken: 0,
        averageScore: 0,
        totalStudyTime: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        async function fetchStats() {
            setLoading(true);
            const attempts = await getAllUserQuizAttempts(user.uid);
            const completedAttempts = attempts.filter(a => a.completed);

            const quizzesTaken = completedAttempts.length;
            const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
            const averageScore = quizzesTaken > 0 ? Math.round(totalScore / quizzesTaken) : 0;

            setStats({
                quizzesTaken,
                averageScore,
                materialsCompleted: 0, // Placeholder
                totalStudyTime: 0, // Placeholder
            });
            setLoading(false);
        }

        fetchStats();
    }, [user]);

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="font-headline">Study Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Book className="h-4 w-4"/> Materials Completed</span>
                            <span className="font-bold">{stats.materialsCompleted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4"/> Quizzes Taken</span>
                            <span className="font-bold">{stats.quizzesTaken}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Percent className="h-4 w-4"/> Average Score</span>
                            <span className="font-bold">{stats.averageScore}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Total Study Time</span>
                            <span className="font-bold">{stats.totalStudyTime} hours</span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}


export default function ProfilePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-headline">User Profile</h1>
                <p className="text-muted-foreground">Manage your account and see your progress.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <ProfileDetailsCard />
                </div>
                <div className="lg:col-span-2">
                    <StudyStatisticsCard />
                </div>
            </div>
        </div>
    )
}
