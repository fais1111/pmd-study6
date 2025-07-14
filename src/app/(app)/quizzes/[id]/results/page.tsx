
import { QuizResults } from './QuizResults';

export async function generateStaticParams() {
    // Return an empty array to indicate that all results pages are dynamically generated on the client.
    // This satisfies the requirement for static export with dynamic routes.
    return [];
}

export default function QuizResultsPage() {
    return <QuizResults />;
}
