
'use client';

import { QuizResults } from './QuizResults';

export async function generateStaticParams() {
    return [];
}

export default function QuizResultsPage() {
    return <QuizResults />;
}
