
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Quiz, QuizAttempt, saveQuizAttempt, getQuiz, getUserQuizAttemptsForQuiz } from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Timestamp } from 'firebase/firestore';

export function TakeQuizPlayer({ quizId }: { quizId: string }) {
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempt, setAttempt] = useState<QuizAttempt | undefined>(undefined);
    const [attemptId, setAttemptId] = useState<string | undefined>(undefined);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<Timestamp | null>(null);

    useEffect(() => {
        if (!quizId || !user) return;

        async function fetchQuizAndAttempt() {
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
                const latestAttempt = attempts.find(a => !a.completed);

                if (latestAttempt) {
                    setAttempt(latestAttempt);
                    setAttemptId(latestAttempt.id);
                    setAnswers(latestAttempt.answers);
                    setStartTime(latestAttempt.startedAt || Timestamp.now());
                    const lastAnswered = Math.max(-1, ...Object.keys(latestAttempt.answers).map(Number));
                    const nextQuestion = Math.min(lastAnswered + 1, fetchedQuiz.questions.length - 1);
                    setCurrentQuestionIndex(nextQuestion);
                } else {
                    // Start a new attempt
                     const newStartTime = Timestamp.now();
                     setStartTime(newStartTime);
                    const newAttemptId = await saveQuizAttempt(user.uid, quizId, {
                        answers: {},
                        score: 0,
                        completed: false,
                        startedAt: newStartTime,
                    });
                    setAttemptId(newAttemptId);
                }

            } catch (e) {
                console.error(e);
                setError("Failed to load quiz data.");
            } finally {
                setLoading(false);
            }
        }

        fetchQuizAndAttempt();
    }, [quizId, user]);


    const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    };
    
    const calculateProgress = () => {
        if (!quiz) return 0;
        const answeredCount = Object.keys(answers).length;
        return (answeredCount / quiz.questions.length) * 100;
    };

    const handleSaveAndExit = async () => {
        if (!user || !quiz) {
            toast({ title: "Error", description: "You must be logged in and have a quiz loaded.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await saveQuizAttempt(user.uid, quiz.id, { answers }, attemptId);
            toast({ title: "Progress Saved", description: "Your progress has been saved. You can continue later." });
            router.push('/quizzes');
        } catch (error) {
            console.error("Failed to save progress", error);
            toast({ title: "Error", description: "Could not save your progress.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinishQuiz = async () => {
        if (!user || !quiz) {
            toast({ title: "Error", description: "You must be logged in and have a quiz loaded.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            let correctAnswers = 0;
            quiz.questions.forEach((q, qIndex) => {
                const correctOptionIndex = q.options.findIndex(opt => opt.isCorrect);
                if (answers[qIndex] === correctOptionIndex) {
                    correctAnswers++;
                }
            });

            const score = Math.round((correctAnswers / quiz.questions.length) * 100);

            await saveQuizAttempt(user.uid, quiz.id, {
                answers,
                score,
                completed: true,
                startedAt: startTime || Timestamp.now(), // Ensure startTime is passed
                completedAt: Timestamp.now(),
            }, attemptId);

            toast({ title: "Quiz Submitted!", description: "Well done! Redirecting to your results..." });
            router.push(`/quizzes/play?id=${quiz.id}&view=results`);
        } catch (error) {
            console.error("Failed to submit quiz", error);
            toast({ title: "Error", description: "Could not submit your quiz.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-center text-destructive py-10">{error}</div>;
    }

    if (!quiz) {
        return <div className="text-center py-10">Quiz not available.</div>;
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    return (
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
            <CardHeader>
                <Progress value={calculateProgress()} className="mb-4" />
                <CardTitle className="font-headline text-2xl">{quiz.title}</CardTitle>
                <p className="text-muted-foreground">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <p className="text-lg font-medium">{currentQuestion.text}</p>
                    <RadioGroup
                        value={answers[currentQuestionIndex]?.toString()}
                        onValueChange={(value) => handleAnswerChange(currentQuestionIndex, parseInt(value))}
                        className="space-y-2"
                    >
                        {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                <RadioGroupItem value={index.toString()} id={`q${currentQuestionIndex}-o${index}`} />
                                <Label htmlFor={`q${currentQuestionIndex}-o${index}`} className="flex-1 cursor-pointer">{option.text}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                <Button variant="outline" onClick={handleSaveAndExit} disabled={isSubmitting}>
                     {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save & Exit
                </Button>

                {!isLastQuestion ? (
                    <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))} >
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Finish Quiz
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Ready to submit?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You have answered {Object.keys(answers).length} out of {quiz.questions.length} questions. You cannot change your answers after submitting.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Review Answers</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinishQuiz} disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardFooter>
        </Card>
    );
}
