
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TakeQuizPlayer } from './TakeQuizPlayer';
import { QuizResults } from './QuizResults';
import { Loader2 } from 'lucide-react';

function QuizPlayerPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const quizId = searchParams.get('id');
    const view = searchParams.get('view');

    if (!quizId) {
        // This should ideally not happen if links are correct
        if (typeof window !== 'undefined') {
            router.push('/quizzes');
        }
        return <div className="text-center text-destructive py-10">Quiz ID is missing.</div>;
    }

    if (view === 'results') {
        return <QuizResults quizId={quizId} />;
    }

    return <TakeQuizPlayer quizId={quizId} />;
}


export default function QuizPlayerPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <QuizPlayerPageContent />
        </Suspense>
    );
}
