
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Search, Target } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, memo } from "react";
import { Quiz, getQuizzes, getUserQuizAttemptsForQuiz, QuizAttempt } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const QuizCard = memo(function QuizCard({ quiz, attempt }: { quiz: Quiz, attempt?: QuizAttempt }) {
    const questionsCount = quiz.questions.length;
    let cardDescription = `${questionsCount} question${questionsCount > 1 ? 's' : ''} • ${quiz.subject}`;
    
    let actionText = "Start Quiz";
    let actionLink = `/quizzes/${quiz.id}`;
    let showProgress = false;
    let progressValue = 0;
    
    if (attempt) {
        if (attempt.completed) {
            actionText = "View Results";
            actionLink = `/quizzes/${quiz.id}/results`;
            cardDescription = `Completed | Score: ${attempt.score}%`;
        } else {
            const completedQuestions = Object.keys(attempt.answers).length;
            if (completedQuestions > 0) {
                cardDescription = `In Progress: ${completedQuestions}/${questionsCount} answered`;
                actionText = "Continue Quiz";
                showProgress = true;
                progressValue = (completedQuestions / questionsCount) * 100;
            }
        }
    }

    return (
        <Card className="shadow-sm flex flex-col group">
             <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg mb-2">{quiz.title}</CardTitle>
                    <Badge variant={attempt?.completed ? 'default' : 'secondary'}>{quiz.subject}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                    <Target className="h-4 w-4" /> 
                    {cardDescription}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 {showProgress && <Progress value={progressValue} className="mb-4" />}
                <p className="text-muted-foreground text-sm line-clamp-2">A short quiz to test your knowledge on {quiz.subject}. Are you ready?</p>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={actionLink}>
                       {actionText} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
});

export default function QuizzesList() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [attempts, setAttempts] = useState<Record<string, QuizAttempt>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const grade = userProfile?.grade;

    useEffect(() => {
        if (authLoading || !user) {
            setLoading(true);
            return;
        }

        async function fetchQuizzesAndAttempts() {
            if (!grade) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const fetchedQuizzes = await getQuizzes(grade);
                setQuizzes(fetchedQuizzes);
                
                if (fetchedQuizzes.length > 0) {
                    const attemptsPromises = fetchedQuizzes.map(q => getUserQuizAttemptsForQuiz(user.uid, q.id));
                    const attemptsResults = await Promise.all(attemptsPromises);
                    
                    const attemptsMap: Record<string, QuizAttempt> = {};
                    attemptsResults.forEach((userAttempts, index) => {
                        if (userAttempts.length > 0) {
                            // Get the most recent attempt overall
                            const mostRecentAttempt = userAttempts[0];
                            attemptsMap[fetchedQuizzes[index].id] = mostRecentAttempt;
                        }
                    });
                    setAttempts(attemptsMap);
                }
                
                setError(null);
            } catch (err) {
                console.error(`Failed to fetch quizzes for ${grade}:`, err);
                setError("Could not load quizzes. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        fetchQuizzesAndAttempts();
    }, [grade, authLoading, user?.uid]);

    const filteredQuizzes = useMemo(() => {
        if (!searchQuery) return quizzes;
        return quizzes.filter(quiz =>
            quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quiz.subject.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, quizzes]);
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-destructive py-10">{error}</div>;
    }

    if (!grade) {
        return <div className="text-center text-muted-foreground py-10">Please complete your profile to see available quizzes.</div>;
    }

    if (quizzes.length === 0) {
        return <div className="text-center text-muted-foreground py-10">No quizzes found for your grade yet. Check back soon!</div>;
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search quizzes by title or subject..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            {filteredQuizzes.length > 0 ? (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredQuizzes.map(quiz => (
                        <QuizCard key={quiz.id} quiz={quiz} attempt={attempts[quiz.id]} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10">No quizzes found matching your search.</div>
            )}
        </div>
    );
}
