
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Quiz, QuizAttempt, getQuiz, getUserQuizAttemptsForQuiz, getQuizLeaderboard, LeaderboardEntry } from "@/services/firestore";
import { Check, X, ChevronsRight, Loader2, Trophy, Clock, Star } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function Leaderboard({ quizId }: { quizId: string }) {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getQuizLeaderboard(quizId).then(data => {
            setLeaderboard(data);
            setLoading(false);
        });
    }, [quizId]);

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }
    
    if (leaderboard.length === 0) {
        return <p className="text-center text-muted-foreground py-4">No one has completed this quiz yet. You could be the first!</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>See how you stack up against other students.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Rank</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((entry) => (
                            <TableRow key={entry.userId} className={cn(entry.userId === user?.uid && "bg-primary/10")}>
                                <TableCell className="font-bold text-lg">
                                    {entry.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500 inline-block" />}
                                    {entry.rank > 1 && entry.rank}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={entry.photoURL} alt={entry.displayName} data-ai-hint="person portrait" />
                                            <AvatarFallback>{entry.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{entry.displayName} {entry.userId === user?.uid && "(You)"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">{entry.score}%</TableCell>
                                <TableCell className="text-right">{entry.duration}s</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export function QuizResults({ quizId }: { quizId: string }) {
    const router = useRouter();
    const { user } = useAuth();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!quizId || !user) return;

        async function fetchResults() {
            setLoading(true);
            try {
                const fetchedQuiz = await getQuiz(quizId);
                if (!fetchedQuiz) {
                    setError("Quiz not found.");
                    setLoading(false);
                    return;
                }
                setQuiz(fetchedQuiz);

                const attempts = await getUserQuizAttemptsForQuiz(user.uid, quizId);
                const completedAttempt = attempts.find(a => a.completed);

                if (!completedAttempt) {
                    setError("No completed attempt found for this quiz.");
                } else {
                    setAttempt(completedAttempt);
                }

            } catch (e) {
                console.error(e);
                setError("Failed to load quiz results.");
            } finally {
                setLoading(false);
            }
        }
        
        fetchResults();

    }, [quizId, user, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
             <div className="text-center text-destructive py-10">
                <p>{error}</p>
                 <Button asChild variant="link">
                    <Link href={`/quizzes`}>Back to Quizzes</Link>
                </Button>
            </div>
        );
    }
    
    if (!quiz || !attempt) {
        return <div className="text-center py-10">Results not available.</div>;
    }

    const correctCount = quiz.questions.filter((q, i) => {
        const correctOptionIndex = q.options.findIndex(opt => opt.isCorrect);
        return attempt.answers[i] === correctOptionIndex;
    }).length;

    const incorrectCount = quiz.questions.length - correctCount;

    const chartData = [
        { name: 'Correct', value: correctCount, fill: 'hsl(var(--chart-1))' },
        { name: 'Incorrect', value: incorrectCount, fill: 'hsl(var(--destructive))' },
    ];
    
    const chartConfig = {
        correct: { label: "Correct", color: "hsl(var(--chart-1))" },
        incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl">Quiz Results: {quiz.title}</CardTitle>
                    <CardDescription>Subject: {quiz.subject}</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4 text-center">
                        <p className="text-muted-foreground">Your Score</p>
                        <p className={cn("text-7xl font-bold", attempt.score >= 50 ? "text-green-600" : "text-destructive")}>
                            {attempt.score}%
                        </p>
                        <p className="text-lg font-medium">{correctCount} out of {quiz.questions.length} correct</p>
                    </div>
                    <div className="h-64">
                         <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild>
                        <Link href="/quizzes">
                            Back to Quizzes <ChevronsRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

            <Tabs defaultValue="review" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="review"><Star className="mr-2 h-4 w-4" />Review Answers</TabsTrigger>
                    <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4" />Leaderboard</TabsTrigger>
                </TabsList>
                <TabsContent value="review" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Your Answers</CardTitle>
                            <CardDescription>See which questions you got right and wrong.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {quiz.questions.map((question, qIndex) => {
                                    const userAnswerIndex = attempt.answers[qIndex];
                                    const correctOptionIndex = question.options.findIndex(o => o.isCorrect);
                                    const isCorrect = userAnswerIndex === correctOptionIndex;

                                    return (
                                        <AccordionItem value={`item-${qIndex}`} key={qIndex}>
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-2">
                                                    {isCorrect ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                                                    <span className="flex-1 text-left">{question.text}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-2 pl-7">
                                                    {question.options.map((option, oIndex) => {
                                                        const isUserAnswer = oIndex === userAnswerIndex;
                                                        const isCorrectAnswer = oIndex === correctOptionIndex;
                                                        
                                                        let stateClass = "";
                                                        if(isCorrectAnswer) stateClass = "border-green-500 bg-green-500/10";
                                                        if(isUserAnswer && !isCorrectAnswer) stateClass = "border-destructive bg-destructive/10";

                                                        return (
                                                            <div key={oIndex} className={cn("p-3 rounded-md border text-sm", stateClass)}>
                                                                <p>{option.text}</p>
                                                                {isUserAnswer && !isCorrectAnswer && <p className="text-destructive text-xs mt-1">Your answer</p>}
                                                                {isCorrectAnswer && <p className="text-green-600 text-xs mt-1">Correct answer</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="leaderboard" className="pt-4">
                    <Leaderboard quizId={quizId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
