
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Activity, ArrowRight, Calendar, Lightbulb, PlayCircle, Loader2, FileText, Target } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { getStudyMaterials, getCareerTip, Material, CareerTip, getQuizzes, Quiz, getUserQuizAttemptsForQuiz, QuizAttempt } from "@/services/firestore"

export default function DashboardPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [dashboardData, setDashboardData] = useState<{
        continueStudying: Material | null;
        latestQuiz: Quiz | null;
        careerTip: CareerTip;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);

            const grade = userProfile?.grade;
            const careerTipPromise = getCareerTip();
           
            if (!grade) {
                const tip = await careerTipPromise;
                setDashboardData({
                    continueStudying: null,
                    latestQuiz: null,
                    careerTip: tip,
                });
                setLoading(false);
                return;
            }

            const materialsPromise = getStudyMaterials(grade, true, 1);
            const quizzesPromise = getQuizzes(grade, 5); // Fetch more quizzes to find an uncompleted one
            
            const [materials, quizzes, careerTip] = await Promise.all([materialsPromise, quizzesPromise, careerTipPromise]);
            
            const continueStudying = materials.length > 0 ? materials[0] : null;

            let latestQuiz: Quiz | null = null;
            if (quizzes.length > 0) {
                 // Find the first quiz that is not completed
                for (const quiz of quizzes) {
                    const attempts = await getUserQuizAttemptsForQuiz(user.uid, quiz.id);
                    const isCompleted = attempts.some(a => a.completed);
                    if (!isCompleted) {
                        latestQuiz = quiz;
                        break; // Found the first uncompleted quiz
                    }
                }
            }
            
            setDashboardData({
                continueStudying,
                latestQuiz,
                careerTip,
            });

            setLoading(false);
        }

        if(!authLoading) {
            fetchDashboardData();
        }
    }, [user, userProfile?.grade, authLoading]);

    const { todaysPlan, continueStudying, careerTip } = useMemo(() => {
        if (!dashboardData) return { todaysPlan: [], continueStudying: null, careerTip: undefined };

        const { continueStudying, latestQuiz, careerTip } = dashboardData;
        
        let plan: any[] = [];
        
        if (continueStudying) {
             plan.push({
                type: 'material' as const,
                icon: continueStudying.type === 'video' ? <PlayCircle className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />,
                title: continueStudying.title,
                description: `Subject: ${continueStudying.subject}`,
                link: continueStudying.fileUrl,
                linkText: 'View'
            });
        }
        
        if (latestQuiz) {
            plan.push({
                type: 'quiz' as const,
                icon: <Target className="h-6 w-6 text-primary" />,
                title: latestQuiz.title,
                description: `Subject: ${latestQuiz.subject}`,
                link: `/quizzes/play?id=${latestQuiz.id}`,
                linkText: 'Take Quiz'
            });
        }

        if (plan.length === 0) {
            plan.push({
                type: 'placeholder' as const,
                icon: <Lightbulb className="h-6 w-6 text-primary" />,
                title: "Explore the platform!",
                description: "Check out the study materials and quizzes sections.",
                link: '/quizzes',
                linkText: 'Explore'
            });
        }

        return {
            todaysPlan: plan,
            continueStudying,
            careerTip,
        };

    }, [dashboardData]);

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!userProfile?.grade) {
        return (
             <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="font-headline">Welcome to SmartStudy Village!</CardTitle>
                    <CardDescription>Your personalized learning journey awaits.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>To get started and see your personalized dashboard, please complete your profile.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <Link href="/profile">Go to Profile</Link>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Welcome Back, {userProfile?.displayName?.split(' ')[0] || 'Student'}!</h1>
        <p className="text-muted-foreground">Here's your personalized learning dashboard for today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Plan */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-xl">Today's Plan</CardTitle>
            </div>
            <CardDescription>Your tasks and lessons for today, a path to success.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysPlan && todaysPlan.length > 0 ? todaysPlan.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-secondary flex-wrap">
                  <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <div className="p-2 bg-primary/10 rounded-md">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild variant={"outline"} size="sm" className="ml-auto flex-shrink-0">
                    <Link href={item.link} target={item.type === 'material' ? '_blank' : '_self'}>{item.linkText}</Link>
                  </Button>
                </div>
            )) : (
                <p className="text-muted-foreground text-center">No new tasks today. Great time to review past materials!</p>
            )}
          </CardContent>
        </Card>

        {/* Continue Study */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary"/>
                <CardTitle className="font-headline text-xl">Continue Where You Left Off</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {continueStudying ? (
                <>
                    <div className="relative h-40 w-full rounded-lg overflow-hidden">
                        <Image src="https://placehold.co/600x400.png" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" style={{objectFit:"cover"}} alt={continueStudying.title} data-ai-hint={`${continueStudying.subject} ${continueStudying.type}`} />
                    </div>
                    <h3 className="font-semibold mt-4 text-lg">{continueStudying.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Review the latest study material for {continueStudying.subject}.</p>
                    <Progress value={10} className="mt-2" />
                </>
            ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                    <p>No recent materials to continue.</p>
                    <p>Explore the study materials section!</p>
                </div>
            )}
            
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/materials">
                Continue Studying <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-xl">Career Tip of the Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base md:text-lg font-medium leading-relaxed">"{careerTip?.text}"</p>
            <p className="text-sm text-muted-foreground mt-2">- {careerTip?.author}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
